/**
 * 동시 경주 (race) — one MuJoCo world with a whole generation of robots side by
 * side, each walking its own candidate gait at the same time, so the class can
 * watch every try of a generation. The robots never touch each other (robot
 * geoms only collide with the floor), so each one scores what it would alone.
 */
import {buildMJCF, ACTUATED} from './maxe1-model';
import {gaitTargets} from './gait';
import {CONTROL_DT, SERVO_SPEED} from './physics';

export const LANE_GAP = 0.3; // m between robots

const prefixNames = (xml, pre) => xml.replace(/\b(name|joint|joint1|joint2|objname)="([^"]+)"/g, `$1="${pre}$2"`);

/** MJCF with `n` MAX-E1 robots in lanes along y, all facing +x. */
export const buildRaceMJCF = (params, n, gap = LANE_GAP) => {
    const xml = buildMJCF(params);
    const head = xml.slice(0, xml.indexOf('<body name="torso"'));
    const robot = xml.slice(xml.indexOf('<body name="torso"'), xml.indexOf('</worldbody>'));
    const between = tag => {
        const a = xml.indexOf(`<${tag}>`) + tag.length + 2;
        return xml.slice(a, xml.indexOf(`</${tag}>`));
    };
    const eq = between('equality');
    const act = between('actuator');
    const half = ((n - 1) * gap / 2) + 1;
    let bodies = '';
    let eqs = '';
    let acts = '';
    for (let i = 0; i < n; i++) {
        const pre = `r${i}_`;
        const y = (i - ((n - 1) / 2)) * gap;
        bodies += prefixNames(robot, pre).replace(/(<body name="r\d+_torso" pos=")0 0 /, (_, a) => `${a}0 ${y.toFixed(4)} `);
        eqs += prefixNames(eq, pre);
        acts += prefixNames(act, pre);
    }
    return `${head.replace(/size="3 3 0.05"/, `size="4 ${half.toFixed(2)} 0.05"`)}${bodies}  </worldbody>
  <equality>${eqs}  </equality>
  <actuator>${acts}  </actuator>
</mujoco>`;
};

export class RaceSim {
    /**
     * @param {object} mj MuJoCo module
     * @param {object} o
     * @param {object} o.params robot settings (same as PhysicsSim)
     * @param {number} o.n robots
     */
    constructor (mj, {params = {}, n = 8}) {
        this.mj = mj;
        this.params = params;
        this.n = n;
        this.gap = LANE_GAP;
        this.model = mj.MjModel.from_xml_string(buildRaceMJCF(params, n, this.gap));
        this.data = new mj.MjData(this.model);
        const m = this.model;
        const id = (type, name) => mj.mj_name2id(m, mj.mjtObj[type].value, name);
        this.prefixes = Array.from({length: n}, (_, i) => `r${i}_`);
        this.robots = this.prefixes.map((pre, i) => ({
            lane: i,
            y0: (i - ((n - 1) / 2)) * this.gap,
            q: m.jnt_qposadr[id('mjOBJ_JOINT', `${pre}root`)],
            body: id('mjOBJ_BODY', `${pre}torso`),
            act: ACTUATED.map(j => id('mjOBJ_ACTUATOR', `${pre}${j}`))
        }));
        this.cmd = new Float64Array(m.nu);
        this.goal = new Float64Array(m.nu);
        this.speed = 1;
        this.gaits = null;
        this.t = 0;
        this.secs = 0;
        mj.mj_forward(m, this.data);
    }

    delete () {
        this.abort();
        this.data.delete();
        this.model.delete();
    }

    /** Where the camera looks: the middle of the pack (robots still walking count most). */
    get torso () {
        const q = this.data.qpos;
        let x = 0;
        let k = 0;
        for (const r of this.robots) {
            if (r.state && r.state.fell) continue;
            x += q[r.q];
            k++;
        }
        if (!k) for (const r of this.robots) x += q[r.q];
        return {x: x / (k || this.robots.length), y: 0, z: 0.3, up: 1};
    }

    /** Per-robot status for labels and the scoreboard. */
    info () {
        const q = this.data.qpos;
        return this.robots.map(r => ({
            lane: r.lane, x: q[r.q], y: q[r.q + 1], z: q[r.q + 2],
            dx: r.state ? (r.state.fell ? r.state.dx : q[r.q]) : 0,
            fell: Boolean(r.state && r.state.fell)
        }));
    }

    /**
     * Walk `gaits` (one per robot, at most n) together for `secs` seconds of sim time.
     * Resolves with one result per gait ({dx, dy, alive, fell, energy, secs}, like
     * PhysicsSim.evaluate), or null if aborted.
     */
    run (gaits, secs, {onFrame} = {}) {
        this.abort();
        const mj = this.mj;
        const m = this.model;
        const d = this.data;
        mj.mj_resetData(m, d);
        this.cmd.fill(0);
        this.goal.fill(0);
        this.gaits = gaits;
        this.secs = secs;
        this.t = 0;
        this.robots.forEach((r, i) => {
            r.gait = gaits[i] || null;
            r.state = {fell: false, done: !r.gait, alive: 0, energy: 0, dx: 0, dy: 0};
        });
        mj.mj_forward(m, d);
        return new Promise(resolve => {
            this._resolve = resolve;
            let last = performance.now();
            const frame = () => {
                const now = performance.now();
                // follow the clock (slow screens show fewer frames, not a slower race); the physics
                // work per frame grows with the frame time but leaves room for drawing
                const gap = now - last;
                const want = Math.min(0.25, gap / 1000) * this.speed;
                last = now;
                const done = this._advance(want, now + Math.max(30, Math.min(200, gap * 0.6)));
                if (onFrame) {
                    try {
                        onFrame(this);
                    } catch (e) { /* keep racing */ }
                }
                if (done) {
                    this._raf = null;
                    this._resolve = null;
                    resolve(this.robots.filter(r => r.gait).map(r => this._result(r)));
                } else {
                    this._raf = requestAnimationFrame(frame);
                }
            };
            this._raf = requestAnimationFrame(frame);
        });
    }

    abort () {
        if (this._raf) cancelAnimationFrame(this._raf);
        this._raf = null;
        if (this._resolve) {
            const r = this._resolve;
            this._resolve = null;
            r(null);
        }
    }

    _result (r) {
        const s = r.state;
        if (!s.fell) {
            s.alive = this.secs;
            s.dx = this.data.qpos[r.q];
            s.dy = this.data.qpos[r.q + 1] - r.y0;
        }
        return {dx: s.dx, dy: s.dy, alive: s.alive, fell: s.fell, energy: s.energy, secs: this.secs};
    }

    /** Step up to `seconds` of sim time (stopping at the deadline); true when the race is over. */
    _advance (seconds, deadline) {
        const mj = this.mj;
        const m = this.model;
        const d = this.data;
        const dt = m.opt.timestep;
        const hold = Math.round(CONTROL_DT / dt);
        const lim = SERVO_SPEED * dt;
        const n = Math.max(1, Math.round(seconds / dt));
        for (let k = 0; k < n; k++) {
            const i = Math.round(this.t / dt);
            if (i % hold === 0) {
                for (const r of this.robots) {
                    if (!r.gait) continue;
                    const s = r.state;
                    // a robot that fell stops walking and just holds still
                    const tg = s.fell ? gaitTargets(r.gait, 0, 0) : gaitTargets(r.gait, this.t, Math.min(1, this.t / 0.6));
                    ACTUATED.forEach((j, a) => { this.goal[r.act[a]] = tg[j]; });
                }
            }
            for (let a = 0; a < m.nu; a++) {
                this.cmd[a] += Math.max(-lim, Math.min(lim, this.goal[a] - this.cmd[a]));
                d.ctrl[a] = this.cmd[a];
            }
            mj.mj_step(m, d);
            this.t = (i + 1) * dt;
            if (((i + 1) & 15) === 0) this._check(dt * 16);
            if (this.t >= this.secs - 1e-9 || this.robots.every(r => r.state.done)) return true;
            if ((k & 7) === 7 && performance.now() > deadline) break;
        }
        return false;
    }

    _check (span) {
        const d = this.data;
        for (const r of this.robots) {
            const s = r.state;
            if (s.done) continue;
            for (const a of r.act) s.energy += Math.abs(d.actuator_force[a]) * span;
            const z = d.qpos[r.q + 2];
            const up = d.xmat[(r.body * 9) + 8];
            if (z < 0.2 || up < 0.6) {
                s.fell = true;
                s.done = true;
                s.alive = this.t;
                s.dx = d.qpos[r.q];
                s.dy = d.qpos[r.q + 1] - r.y0;
            }
        }
    }
}
