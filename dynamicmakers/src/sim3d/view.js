/**
 * three.js view of the MuJoCo world: one mesh per geom, updated from
 * geom_xpos / geom_xmat each frame. Drag to turn the camera, wheel to zoom;
 * the camera follows the robot.
 */
import * as THREE from 'three';
import {PARTS_META, PARTS_GZ} from './parts-data.js';
import LAYOUT from './maxe1-visual.json';

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
                g.computeVertexNormals();
                out[name] = {geo: g, info};
            }
            return out;
        })();
    }
    return partsPromise;
};

const AXIS = {X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1]};
/** Matrix that places one layout entry in its body frame (mirrored for the left side). */
const partMatrix = (e, info, mirror) => {
    const cols = e.axes.map(a => AXIS[a.slice(-1)].map(v => (a[0] === '-' ? -v : v)));
    const r = new THREE.Matrix4().set(
        cols[0][0], cols[1][0], cols[2][0], 0,
        cols[0][1], cols[1][1], cols[2][1], 0,
        cols[0][2], cols[1][2], cols[2][2], 0,
        0, 0, 0, 1);
    const anchor = e.anchor ? e.anchor.map((v, k) => (v - info.c[k]) / 1000) : [0, 0, 0];
    const m = new THREE.Matrix4().makeTranslation(e.pos[0], e.pos[1], e.pos[2]);
    if (e.rot) {
        const d = e.rot.map(v => v * Math.PI / 180);
        m.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(d[0], d[1], d[2], 'XYZ')));
    }
    m.multiply(r).multiply(new THREE.Matrix4().makeTranslation(-anchor[0], -anchor[1], -anchor[2]));
    if (mirror) m.premultiply(new THREE.Matrix4().makeScale(1, -1, 1));
    return m;
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
        this.target = new THREE.Vector3(0, 0, 0.2);
        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.4));
        const sun = new THREE.DirectionalLight(0xffffff, 1.6);
        sun.position.set(0.8, -0.6, 1.6);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        const c = sun.shadow.camera;
        c.left = -0.6; c.right = 0.6; c.top = 0.6; c.bottom = -0.6; c.near = 0.1; c.far = 4;
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
                const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6),
                    new THREE.MeshStandardMaterial({color: 0xf4f6fa, roughness: 1}));
                floor.receiveShadow = true;
                this.group.add(floor);
                const grid = new THREE.GridHelper(6, 60, 0xc5cfdd, 0xdde3ec);
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
        for (const [k, c] of Object.entries(LAYOUT.colors)) {
            mats[k] = new THREE.MeshStandardMaterial({color: new THREE.Color(c), roughness: 0.6, metalness: 0.15,
                side: THREE.DoubleSide, flatShading: true});
        }
        for (const e of LAYOUT.parts) {
            const p = parts[e.part];
            if (!p) continue;
            for (const side of (e.side === 'R' ? ['R', 'L'] : [null])) {
                const body = side === 'L' ? `L${e.body.slice(1)}` : e.body;
                const id = mj.mj_name2id(model, mj.mjtObj.mjOBJ_BODY.value, body);
                if (id < 0) continue;
                const mesh = new THREE.Mesh(p.geo, mats[e.color] || mats.frame);
                mesh.castShadow = true;
                mesh.matrixAutoUpdate = false;
                this.partGroup.add(mesh);
                this.partItems.push({mesh, id, local: partMatrix(e, p.info, side === 'L')});
            }
        }
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
            const bx = d.xpos;
            const bm = d.xmat;
            for (const it of this.partItems) {
                const p = it.id * 3;
                const r = it.id * 9;
                mtx.set(bm[r], bm[r + 1], bm[r + 2], bx[p],
                    bm[r + 3], bm[r + 4], bm[r + 5], bx[p + 1],
                    bm[r + 6], bm[r + 7], bm[r + 8], bx[p + 2],
                    0, 0, 0, 1);
                it.mesh.matrix.multiplyMatrices(mtx, it.local);
            }
        }
        const t = this.sim.torso;
        this.target.lerp(new THREE.Vector3(t.x, t.y, 0.18), 0.1);
        const o = this.orbit;
        this.camera.position.set(
            this.target.x + (o.dist * Math.cos(o.pitch) * Math.cos(o.yaw)),
            this.target.y + (o.dist * Math.cos(o.pitch) * Math.sin(o.yaw)),
            this.target.z + (o.dist * Math.sin(o.pitch)));
        this.camera.lookAt(this.target);
        this.sun.position.set(this.target.x + 0.8, this.target.y - 0.6, 1.6);
        this.sun.target.position.copy(this.target);
        this.renderer.render(this.scene, this.camera);
    }
}
