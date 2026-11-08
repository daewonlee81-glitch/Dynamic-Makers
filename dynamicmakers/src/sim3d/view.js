/**
 * three.js view of the MuJoCo world: one mesh per geom, updated from
 * geom_xpos / geom_xmat each frame. Drag to turn the camera, wheel to zoom;
 * the camera follows the robot.
 */
import * as THREE from 'three';
import {PARTS_META, PARTS_GZ} from './parts-data.js';
import CAD from './maxe1-cad.json';

const COLORS = {frame: '#646b78', servo: '#2d3036', cover: '#8a92a0', sole: '#525a68'};

/** Decode the low-poly STEP part meshes (int16 positions in 0.01 mm, uint16 indices, gzip + base64). */
let partsPromise = null;
const loadParts = () => {
    if (!partsPromise) {
        partsPromise = (async () => {
            const bin = Uint8Array.from(atob(PARTS_GZ), c => c.charCodeAt(0));
            const buf = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip')))
                .arrayBuffer();
            const out = {};
            for (const [name, info] of Object.entries(PARTS_META)) {
                const q = new Int16Array(buf, info.off, info.nv * 3);
                const idx = new Uint16Array(buf, info.off + (info.nv * 6), info.nt * 3);
                const pos = new Float32Array(q.length);
                for (let i = 0; i < q.length; i++) pos[i] = q[i] / 100000; // → metres
                const g = new THREE.BufferGeometry();
                g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
                g.setIndex(new THREE.BufferAttribute(idx, 1));
                g.userData.shared = true; // cached for every view
                g.computeVertexNormals();
                out[name] = {geo: g, info};
            }
            return out;
        })();
    }
    return partsPromise;
};


export class SimView {
    constructor (host, sim) {
        this.host = host;
        this.sim = sim;
        this.renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        this.renderer.shadowMap.enabled = true;
        this.renderer.domElement.className = 'sim-canvas';
        host.append(this.renderer.domElement);
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xeef2f8);
        this.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 20);
        this.camera.up.set(0, 0, 1);
        this.orbit = {yaw: -0.9, pitch: 0.35, dist: 0.9};
        this.race = Boolean(sim.prefixes); // 동시 경주: many robots in lanes
        if (this.race) this.orbit = {yaw: -0.3, pitch: 0.52, dist: Math.max(1.1, sim.n * sim.gap * 1.2)};
        this.target = new THREE.Vector3(0, 0, 0.2);
        this.targetZ = 0.2; // camera looks at this height above the robot
        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.4));
        const sun = new THREE.DirectionalLight(0xffffff, 1.6);
        sun.position.set(0.8, -0.6, 1.6);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        const c = sun.shadow.camera;
        const span = this.race ? (sim.n * sim.gap / 2) + 0.6 : 0.6;
        c.left = -span; c.right = span; c.top = span; c.bottom = -span; c.near = 0.1; c.far = 4 + span;
        if (this.race) sun.shadow.mapSize.set(2048, 2048);
        this.sun = sun;
        this.scene.add(sun, sun.target);
        this.showParts = true;
        try { this.showParts = localStorage.getItem('dm.parts') !== '0'; } catch (e) { /* storage blocked */ }
        this._buildMeshes();
        this._controls();
        this._resize();
        this._ro = new ResizeObserver(() => this._resize());
        this._ro.observe(host);
    }

    /** Move the 3D view into another box (e.g. next to the learning chart). */
    attach (host) {
        if (host === this.host) return;
        this._ro.unobserve(this.host);
        this.host = host;
        host.append(this.renderer.domElement);
        this._ro.observe(host);
        this._resize();
    }

    _buildMeshes () {
        if (this.group) this.scene.remove(this.group);
        this.group = new THREE.Group();
        this.meshes = [];
        const m = this.sim.model;
        for (let i = 0; i < m.ngeom; i++) {
            const type = m.geom_type[i];
            const sz = [m.geom_size[i * 3], m.geom_size[(i * 3) + 1], m.geom_size[(i * 3) + 2]];
            const rgba = [0, 1, 2, 3].map(k => m.geom_rgba[(i * 4) + k]);
            let geo = null;
            if (type === 0) { // plane: floor with a grid
                const fw = Math.max(6, sz[0] * 2);
                const fh = Math.max(6, sz[1] * 2);
                const floor = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh),
                    new THREE.MeshStandardMaterial({color: 0xf4f6fa, roughness: 1}));
                floor.receiveShadow = true;
                this.group.add(floor);
                const gs = Math.max(fw, fh);
                const grid = new THREE.GridHelper(gs, Math.round(gs * 10), 0xc5cfdd, 0xdde3ec);
                grid.rotation.x = Math.PI / 2;
                grid.position.z = 0.0005;
                this.group.add(grid);
                this.meshes.push(null);
                continue;
            }
            if (type === 2) geo = new THREE.SphereGeometry(sz[0], 24, 16);
            else if (type === 3) {
                geo = new THREE.CapsuleGeometry(sz[0], sz[1] * 2, 6, 16);
                geo.rotateX(Math.PI / 2); // three: along y → MuJoCo: along z
            } else if (type === 5) {
                geo = new THREE.CylinderGeometry(sz[0], sz[0], sz[1] * 2, 20);
                geo.rotateX(Math.PI / 2);
            } else if (type === 6) geo = new THREE.BoxGeometry(sz[0] * 2, sz[1] * 2, sz[2] * 2);
            if (!geo) {
                this.meshes.push(null);
                continue;
            }
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(rgba[0], rgba[1], rgba[2]), roughness: 0.55, metalness: 0.1
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            mesh.matrixAutoUpdate = false;
            this.group.add(mesh);
            this.meshes.push(mesh);
        }
        this.scene.add(this.group);
        this._model = m;
        this._buildParts();
    }

    /** STEP part meshes drawn on the robot's bodies (display only; physics keeps the simple shapes). */
    async _buildParts () {
        const model = this.sim.model;
        let parts;
        try {
            parts = await loadParts();
        } catch (e) {
            this.partsError = e;
            return;
        }
        if (model !== this.sim.model) return; // rebuilt meanwhile
        if (this.partGroup) this.scene.remove(this.partGroup);
        this.partGroup = new THREE.Group();
        this.partItems = [];
        const mj = this.sim.mj;
        const mats = {};
        for (const [k, c] of Object.entries(COLORS)) {
            mats[k] = new THREE.MeshStandardMaterial({color: new THREE.Color(c), roughness: 0.6, metalness: 0.15,
                side: THREE.DoubleSide, flatShading: true});
        }
        const bodyId = name => mj.mj_name2id(model, mj.mjtObj.mjOBJ_BODY.value, name);
        // a race draws each part once for all robots (instancing): ~40 draw calls instead of hundreds
        const prefixes = this.sim.prefixes || [''];
        const inst = {};
        if (this.race) {
            CAD.visual.forEach((e, k) => {
                if (!parts[e.part]) return;
                const im = new THREE.InstancedMesh(parts[e.part].geo, mats[e.color] || mats.frame, prefixes.length);
                im.castShadow = prefixes.length <= 8; // big races: skip part shadows (lighter on school laptops)
                im.frustumCulled = false;
                this.partGroup.add(im);
                inst[k] = im;
            });
        }
        prefixes.forEach((pre, r) => {
            CAD.visual.forEach((e, k) => { // matrices from the part assembly (scripts/gen-maxe1-cad.py)
                const p = parts[e.part];
                const id = bodyId(pre + e.body);
                if (!p || id < 0) return;
                let mesh = null;
                if (!this.race) {
                    mesh = new THREE.Mesh(p.geo, mats[e.color] || mats.frame);
                    mesh.castShadow = true;
                    mesh.matrixAutoUpdate = false;
                    this.partGroup.add(mesh);
                }
                // parallel bars turn with the drive link (body) about a pin fixed in pivotBody
                this.partItems.push({mesh, im: inst[k] || null, k: r, id, local: new THREE.Matrix4().fromArray(e.m).transpose(),
                    pivotId: e.pivotBody ? bodyId(pre + e.pivotBody) : -1, pivot: e.pivot || null});
            });
        });
        this.instMeshes = Object.values(inst);
        this.scene.add(this.partGroup);
        this._applyPartsVisible();
    }

    /** Switch between the STEP part shapes and the simple physics shapes. */
    setShowParts (on) {
        this.showParts = Boolean(on);
        try { localStorage.setItem('dm.parts', on ? '1' : '0'); } catch (e) { /* storage blocked */ }
        this._applyPartsVisible();
    }

    get partsReady () {
        return Boolean(this.partItems && this.partItems.length);
    }

    _applyPartsVisible () {
        const parts = this.showParts && this.partsReady;
        if (this.partGroup) this.partGroup.visible = parts;
        const m = this.sim.model;
        for (let i = 0; i < this.meshes.length; i++) {
            const mesh = this.meshes[i];
            if (mesh && m.geom_bodyid[i] > 0) mesh.visible = !parts; // robot geoms (not the floor)
        }
    }

    /** Lane labels over the race robots: number, distance, and red when fallen. */
    _labels () {
        if (!this.race) return;
        const info = this.sim.info();
        if (!this.labelSprites) {
            this.labelSprites = info.map(() => {
                const cv = document.createElement('canvas');
                cv.width = 128;
                cv.height = 64;
                const tex = new THREE.CanvasTexture(cv);
                // same size on screen near or far
                const sp = new THREE.Sprite(new THREE.SpriteMaterial({map: tex, depthTest: false, sizeAttenuation: false}));
                sp.renderOrder = 10;
                this.scene.add(sp);
                return {sp, cv, tex, text: ''};
            });
        }
        const now = performance.now();
        const redraw = !this._lastLabel || now - this._lastLabel > 200;
        if (redraw) this._lastLabel = now;
        info.forEach((r, i) => {
            const L = this.labelSprites[i];
            const h = info.length > 10 ? 0.045 : 0.065; // view units at distance 1 (fov 40° → ~1.4 × screen share)
            L.sp.scale.set(h * 2, h, 1);
            L.sp.position.set(r.x, r.y, Math.max(r.z, 0.05) + 0.16);
            const rank = this.sim.ranks ? this.sim.ranks[i] : null;
            const text = `${r.lane + 1}|${Math.round(r.dx * 100)}|${r.fell ? 1 : 0}|${rank}`;
            if (!redraw || text === L.text) return;
            L.text = text;
            const c = L.cv.getContext('2d');
            c.clearRect(0, 0, 128, 64);
            c.fillStyle = r.fell ? 'rgba(200,60,60,0.9)' : (rank === 1 ? 'rgba(230,160,20,0.95)' : 'rgba(40,90,170,0.88)');
            c.beginPath();
            c.roundRect(4, 4, 120, 56, 12);
            c.fill();
            c.fillStyle = '#fff';
            c.font = 'bold 26px sans-serif';
            c.textAlign = 'center';
            c.fillText(`${r.lane + 1}번`, 64, 30);
            c.font = '20px sans-serif';
            c.fillText(r.fell ? '넘어짐' : `${Math.round(r.dx * 100)} cm`, 64, 54);
            L.tex.needsUpdate = true;
        });
    }

    /** Remove the canvas and free the GPU memory (race views are made per learning run). */
    dispose () {
        this._ro.disconnect();
        this.renderer.domElement.remove();
        this.scene.traverse(o => {
            if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
            if (o.material) {
                if (o.material.map) o.material.map.dispose();
                o.material.dispose();
            }
        });
        this.renderer.dispose();
    }

    _controls () {
        const el = this.renderer.domElement;
        let drag = null;
        el.addEventListener('pointerdown', e => {
            drag = {x: e.clientX, y: e.clientY, yaw: this.orbit.yaw, pitch: this.orbit.pitch};
            el.setPointerCapture(e.pointerId);
        });
        el.addEventListener('pointermove', e => {
            if (!drag) return;
            this.orbit.yaw = drag.yaw - ((e.clientX - drag.x) * 0.008);
            this.orbit.pitch = Math.max(-0.1, Math.min(1.45, drag.pitch + ((e.clientY - drag.y) * 0.006)));
        });
        el.addEventListener('pointerup', () => { drag = null; });
        el.addEventListener('wheel', e => {
            e.preventDefault();
            this.orbit.dist = Math.max(0.3, Math.min(3, this.orbit.dist * (e.deltaY > 0 ? 1.1 : 0.9)));
        }, {passive: false});
    }

    _resize () {
        const w = Math.max(10, this.host.clientWidth);
        const h = Math.max(10, this.host.clientHeight);
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }

    render () {
        if (this._model !== this.sim.model) this._buildMeshes(); // model rebuilt (new settings)
        const d = this.sim.data;
        const mtx = new THREE.Matrix4();
        for (let i = 0; i < this.meshes.length; i++) {
            const mesh = this.meshes[i];
            if (!mesh) continue;
            const p = i * 3;
            const r = i * 9;
            const x = d.geom_xmat;
            mtx.set(x[r], x[r + 1], x[r + 2], d.geom_xpos[p],
                x[r + 3], x[r + 4], x[r + 5], d.geom_xpos[p + 1],
                x[r + 6], x[r + 7], x[r + 8], d.geom_xpos[p + 2],
                0, 0, 0, 1);
            mesh.matrix.copy(mtx);
        }
        if (this.partGroup && this.partGroup.visible) {
            const tmp = new THREE.Matrix4();
            const bx = d.xpos;
            const bm = d.xmat;
            for (const it of this.partItems) {
                const p = it.id * 3;
                const r = it.id * 9;
                let px = bx[p];
                let py = bx[p + 1];
                let pz = bx[p + 2];
                if (it.pivotId >= 0) { // pin position = pivot body position + its rotation × pivot
                    const q = it.pivotId * 3;
                    const k = it.pivotId * 9;
                    const [a, b2, c] = it.pivot;
                    px = bx[q] + (bm[k] * a) + (bm[k + 1] * b2) + (bm[k + 2] * c);
                    py = bx[q + 1] + (bm[k + 3] * a) + (bm[k + 4] * b2) + (bm[k + 5] * c);
                    pz = bx[q + 2] + (bm[k + 6] * a) + (bm[k + 7] * b2) + (bm[k + 8] * c);
                }
                mtx.set(bm[r], bm[r + 1], bm[r + 2], px,
                    bm[r + 3], bm[r + 4], bm[r + 5], py,
                    bm[r + 6], bm[r + 7], bm[r + 8], pz,
                    0, 0, 0, 1);
                if (it.im) {
                    tmp.multiplyMatrices(mtx, it.local);
                    it.im.setMatrixAt(it.k, tmp);
                } else it.mesh.matrix.multiplyMatrices(mtx, it.local);
            }
            for (const im of this.instMeshes) im.instanceMatrix.needsUpdate = true;
        }
        this._labels();
        const t = this.sim.torso;
        this.target.lerp(new THREE.Vector3(t.x, t.y, this.targetZ), 0.1);
        const o = this.orbit;
        this.camera.position.set(
            this.target.x + (o.dist * Math.cos(o.pitch) * Math.cos(o.yaw)),
            this.target.y + (o.dist * Math.cos(o.pitch) * Math.sin(o.yaw)),
            this.target.z + (o.dist * Math.sin(o.pitch)));
        this.camera.lookAt(this.target);
        this.sun.position.set(this.target.x + 0.8, this.target.y - 0.6, this.race ? 2.4 : 1.6);
        this.sun.target.position.copy(this.target);
        this.renderer.render(this.scene, this.camera);
    }
}
