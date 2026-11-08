/**
 * MuJoCo physics for the 3D 가상 로봇. Emulates what the CM-550 + DYNAMIXEL
 * bus shows the app: goal / present position (ticks), torque on/off, profile
 * velocity, and the CM-550 IMU registers. The real-time loop steps the world;
 * `evaluate()` runs extra worlds headless for 걸음 학습.
 */
import {buildMJCF, MAXE1_JOINT_MAP, ACTUATED} from './maxe1-model';
import {gaitTargets} from './gait';

const DEG = 180 / Math.PI;
export const CONTROL_DT = 0.04; // the walker sends new goals 25 times a second
export const SERVO_SPEED = 6; // rad/s, 2XL430-W250 at 12 V (about 57 rpm)

let mjPromise = null;
/** Load the MuJoCo WebAssembly engine once (dm-sim.js + mujoco.wasm / embedded). */
export const loadMujoco = () => {
    if (!mjPromise) {
        mjPromise = (async () => {
            const {default: factory} = await import('@mujoco/mujoco');
            let wasmBinary;
            if (window.DM_MUJOCO_WASM_GZ) { // single-file build: gzip + base64 inside the page
                const raw = atob(window.DM_MUJOCO_WASM_GZ);
                const gz = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++) gz[i] = raw.charCodeAt(i);
                window.DM_MUJOCO_WASM_GZ = null;
                const stream = new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'));
                wasmBinary = new Uint8Array(await new Response(stream).arrayBuffer());
            } else {
                const res = await fetch('mujoco.wasm');
                if (!res.ok) throw new Error('물리 엔진(mujoco.wasm)을 불러오지 못했습니다.');
                wasmBinary = new Uint8Array(await res.arrayBuffer());
            }
            return factory({wasmBinary});
        })().catch(e => {
            mjPromise = null;
            throw e;
        });
    }
    return mjPromise;
};

export class PhysicsSim {
    constructor (mj, {params = {}, jointMap = MAXE1_JOINT_MAP} = {}) {
        this.mj = mj;
        this.params = params;
        this.jointMap = jointMap.map(j => Object.assign({}, j));
        this.listeners = new Set();
        this._build();
    }

    _build () {
        const mj = this.mj;
        if (this.data) this.data.delete();
        if (this.model) this.model.delete();
        this.model = mj.MjModel.from_xml_string(buildMJCF(this.params));
        this.data = new mj.MjData(this.model);
        const m = this.model;
        this.act = {};
        for (let i = 0; i < m.nu; i++) this.act[m.actuator(i).name] = i;
        this.qadr = {};
        for (const j of ACTUATED) this.qadr[j] = m.jnt_qposadr[mj.mj_name2id(m, mj.mjtObj.mjOBJ_JOINT.value, j)];
        this.kp = Array.from({length: m.nu}, (_, i) => m.actuator_gainprm[i * 10]);
        this.byId = new Map(this.jointMap.map(j => [j.id, j]));
        this.servo = new Map(); // id -> {goal (rad), cmd (rad, rate-limited), pv (0.229 rpm), torque}
        // The 3D robot powers up holding its standing pose (torque on). A real robot starts limp
        // (torque off), but a limp 3D robot just collapses before anything else can happen.
        for (const j of this.jointMap) this.servo.set(j.id, {goal: 0, cmd: 0, pv: 0, torque: true});
        this.fallCount = 0;
        this._applyTorque();
        this.mj.mj_forward(m, this.data);
    }

    get ids () {
        return this.jointMap.map(j => j.id);
    }

    setJointMap (map) {
        this.jointMap = map.map(j => Object.assign({}, j));
        this._build();
    }

    setParams (params) {
        this.params = params;
        this._build();
    }

    reset () {
        this.mj.mj_resetData(this.model, this.data);
        for (const s of this.servo.values()) {
            s.goal = 0;
            s.cmd = 0;
            s.torque = true; // stand up holding the pose
        }
        this._applyTorque();
        this.mj.mj_forward(this.model, this.data);
        this._emit();
    }

    onUpdate (fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    _emit () {
        for (const fn of this.listeners) {
            try {
                fn(this);
            } catch (e) { /* keep simulating */ }
        }
    }

    // ---- what the DYNAMIXEL bus sees -------------------------------------------
    _rad (j, tick) {
        return j.sign * (((tick / 4096) * 360) - j.center) / DEG;
    }

    _tick (j, rad) {
        return Math.round((((rad * DEG * j.sign) + j.center) / 360) * 4096);
    }

    setGoalTick (id, tick) {
        const j = this.byId.get(id);
        if (!j) return;
        this.servo.get(id).goal = this._rad(j, tick);
    }

    /** joint -> radians, straight from the gait (no ID map) — used by the walker in sim-only mode */
    setGoalRad (joint, rad) {
        const j = this.jointMap.find(x => x.joint === joint);
        if (j) this.servo.get(j.id).goal = rad;
    }

    presentTick (id) {
        const j = this.byId.get(id);
        return j ? this._tick(j, this.data.qpos[this.qadr[j.joint]]) : 2048;
    }

    moving (id) {
        const j = this.byId.get(id);
        if (!j) return 0;
        const s = this.servo.get(id);
        return Math.abs(s.goal - this.data.qpos[this.qadr[j.joint]]) > 0.03 ? 1 : 0;
    }

    setProfile (id, pv) {
        const s = this.servo.get(id);
        if (s) s.pv = pv;
    }

    torqueOn (id) {
        const s = this.servo.get(id);
        return Boolean(s && s.torque);
    }

    setTorque (id, on) {
        const s = this.servo.get(id);
        if (!s) return;
        const j = this.byId.get(id);
        if (on && !s.torque) { // hold where the joint is now
            const q = this.data.qpos[this.qadr[j.joint]];
            s.cmd = q;
            if (Math.abs(s.goal - q) > 1) s.goal = q;
        }
        s.torque = Boolean(on);
        this._applyTorque();
    }

    _applyTorque () {
        const m = this.model;
        for (const j of this.jointMap) {
            const i = this.act[j.joint];
            const on = this.servo.get(j.id).torque;
            m.actuator_gainprm[i * 10] = on ? this.kp[i] : 0;
            m.actuator_biasprm[(i * 10) + 1] = on ? -this.kp[i] : 0;
        }
    }

    /** CM-550 IMU registers 102..118 (raw values as the controller reports them). */
    imu (addr) {
        const s = this.data.sensordata; // quat(4) gyro(3) acc(3)
        const [w, x, y, z] = [s[0], s[1], s[2], s[3]];
        const roll = Math.atan2(2 * ((w * x) + (y * z)), 1 - (2 * ((x * x) + (y * y))));
        const pitch = Math.asin(Math.max(-1, Math.min(1, 2 * ((w * y) - (z * x)))));
        const yaw = Math.atan2(2 * ((w * z) + (x * y)), 1 - (2 * ((y * y) + (z * z))));
        const v = {
            102: roll * DEG, 104: pitch * DEG, 106: yaw * DEG,
            108: s[4] * DEG, 110: s[5] * DEG, 112: s[6] * DEG,
            114: s[7] / 9.81, 116: s[8] / 9.81, 118: s[9] / 9.81
        }[addr];
        return v === undefined ? 0 : Math.round(v * 100);
    }

    get torso () {
        const q = this.data.qpos;
        return {x: q[0], y: q[1], z: q[2], up: this.data.xmat[9 + 8]}; // body 1 = torso
    }

    get fallen () {
        const t = this.torso;
        return t.z < 0.15 || t.up < 0.6;
    }

    // ---- stepping -----------------------------------------------------------------
    /** Rate-limit the commanded angle like Profile Velocity does, then step. */
    step (seconds) {
        const m = this.model;
        const d = this.data;
        const dt = m.opt.timestep;
        const n = Math.max(1, Math.round(seconds / dt));
        for (let k = 0; k < n; k++) {
            if (this.controller && d.time + 1e-9 >= this._nextCtl) { // walker / policy: exactly every 0.04 s
                this._nextCtl += CONTROL_DT;
                try {
                    this.controller(d.time);
                } catch (e) {
                    this.controller = null;
                }
            }
            for (const j of this.jointMap) {
                const s = this.servo.get(j.id);
                const lim = (s.pv > 0 ? Math.min(SERVO_SPEED, s.pv * 0.229 * 2 * Math.PI / 60) : SERVO_SPEED) * dt;
                s.cmd += Math.max(-lim, Math.min(lim, s.goal - s.cmd));
                d.ctrl[this.act[j.joint]] = s.cmd;
            }
            this.mj.mj_step(m, d);
        }
    }

    /** Run `fn(simTime)` every CONTROL_DT of simulated time (null to stop). */
    setController (fn) {
        this.controller = fn;
        this._nextCtl = this.data.time;
    }

    /** IMU in radians (same formula as the Python kit). */
    imuRad () {
        return {roll: this.imu(102) / 100 / DEG, pitch: this.imu(104) / 100 / DEG,
            gx: this.data.sensordata[4], gy: this.data.sensordata[5]};
    }

    start () {
        if (this._timer) return;
        let last = performance.now();
        const tick = () => {
            const now = performance.now();
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (!this.paused) this.step(dt);
            this._emit();
            this._timer = requestAnimationFrame(tick);
        };
        this._timer = requestAnimationFrame(tick);
    }

    stop () {
        if (this._timer) cancelAnimationFrame(this._timer);
        this._timer = null;
    }

    /** A sideways shove (N for 0.1 s) to test balance. */
    push (fy = 4) {
        const d = this.data;
        d.xfrc_applied[(1 * 6) + 1] = fy;
        setTimeout(() => { d.xfrc_applied[(1 * 6) + 1] = 0; }, 100);
    }

    // ---- 걸음 학습: headless rollouts -------------------------------------------------
    /**
     * Run the gait in a fresh world for `secs` seconds.
     * @returns {{dx, dy, alive, fell, energy}}
     */
    evaluate (gait, secs = 5) {
        const mj = this.mj;
        const m = this.model;
        if (!this._evalData) this._evalData = new mj.MjData(m);
        const d = this._evalData;
        mj.mj_resetData(m, d);
        const saved = this._saveGains();
        this._allOn();
        const dt = m.opt.timestep;
        const n = Math.round(secs / dt);
        const hold = Math.round(CONTROL_DT / dt); // like the walker: new targets 25×/s
        const lim = SERVO_SPEED * dt;
        const cmd = new Float64Array(m.nu);
        const goal = new Float64Array(m.nu);
        let fell = false;
        let energy = 0;
        let i = 0;
        for (; i < n; i++) {
            if (i % hold === 0) {
                const t = i * dt;
                const tg = gaitTargets(gait, t, Math.min(1, t / 0.6));
                for (const j in tg) goal[this.act[j]] = tg[j];
            }
            for (let a = 0; a < m.nu; a++) {
                cmd[a] += Math.max(-lim, Math.min(lim, goal[a] - cmd[a]));
                d.ctrl[a] = cmd[a];
            }
            mj.mj_step(m, d);
            if ((i & 15) === 0) {
                for (let a = 0; a < m.nu; a++) energy += Math.abs(d.actuator_force[a]) * dt * 16;
                if (d.qpos[2] < 0.15 || d.xmat[9 + 8] < 0.6) {
                    fell = true;
                    break;
                }
            }
        }
        this._restoreGains(saved);
        return {dx: d.qpos[0], dy: d.qpos[1], alive: (i * dt), fell, energy, secs};
    }

    _saveGains () {
        const m = this.model;
        return {g: Float64Array.from(m.actuator_gainprm), b: Float64Array.from(m.actuator_biasprm)};
    }

    _allOn () {
        const m = this.model;
        for (let i = 0; i < m.nu; i++) {
            m.actuator_gainprm[i * 10] = this.kp[i];
            m.actuator_biasprm[(i * 10) + 1] = -this.kp[i];
        }
    }

    _restoreGains (s) {
        const m = this.model;
        m.actuator_gainprm.set(s.g);
        m.actuator_biasprm.set(s.b);
    }
}
