/**
 * Plays a learned walk on whatever is connected — the 3D 가상 로봇 or the real
 * MAX-E1 — by streaming goal positions about 25 times a second (one SYNC
 * WRITE for all 12 joints). Two modes:
 *   gait   — the 7-number rhythmic pattern from 걸음 학습
 *   policy — that pattern plus corrections from a neural network trained in
 *            the Python kit (sim/train_es.py), which reads the CM-550 IMU.
 */
import {gaitTargets} from './gait';
import {policyAct, policyObs} from './policy';

const {DXL} = require('../../../scratch-cm550/src/cm550');

const DEG = 180 / Math.PI;
const delay = ms => new Promise(r => setTimeout(r, ms));

export class Walker {
    /**
     * @param {object} o
     * @param {object} o.device CM550Device
     * @param {Function} o.getJointMap () -> [{id, joint, sign, center}]
     * @param {Function} o.log
     */
    constructor ({device, getJointMap, log}) {
        this.device = device;
        this.getJointMap = getJointMap;
        this.log = log || (() => {});
        this.running = false;
        this.listeners = new Set();
    }

    onUpdate (fn) {
        this.listeners.add(fn);
    }

    _emit () {
        for (const fn of this.listeners) {
            try {
                fn(this);
            } catch (e) { /* ignore */ }
        }
    }

    _items (targets, map) {
        return map.filter(j => targets[j.joint] !== undefined).map(j => ({
            id: j.id,
            value: Math.max(0, Math.min(4095, Math.round((((targets[j.joint] * DEG * j.sign) + j.center) / 360) * 4096)))
        }));
    }

    /**
     * @param {object} gait 7 numbers
     * @param {number} seconds 0 = until stop()
     * @param {object} [opts]
     * @param {object} [opts.policy] trained network (JSON from the Python kit)
     * @param {number} [opts.slow] 1 = as learned; 1.5 = 1.5× slower (safer on the real robot)
     */
    async walk (gait, seconds, {policy = null, slow = 1} = {}) {
        if (this.running) this.stop();
        await delay(0);
        const dev = this.device;
        if (!dev.connected) throw new Error('먼저 로봇을 연결하세요.');
        const map = this.getJointMap();
        const ids = map.map(j => j.id);
        const g = Object.assign({}, gait, {period: gait.period * slow});
        const tr = dev.transport;
        this.running = true;
        this.mode = policy ? 'policy' : 'gait';
        this._emit();
        if (tr && tr.physics) {
            try {
                await this._walkSim(tr, g, seconds, policy, map);
            } finally {
                this.running = false;
                this._emit();
            }
            return;
        }
        if (tr && 'quiet' in tr) tr.quiet = true;
        try {
            // Stiffen ALL joints in one command: turning them on one by one lets the
            // robot sag and fall while half of it is still limp.
            const OP_POSITION = 3;
            const OP_EXTENDED = 4;
            const present = [];
            for (const id of ids) {
                await dev.ensureMode(id, [OP_POSITION, OP_EXTENDED]); // reads; writes only if needed
                present.push({id, value: await dev.readDXL(id, DXL.PRESENT_POSITION)});
            }
            await dev.syncWriteDXL(DXL.GOAL_POSITION, present);
            await dev.syncWriteDXL(DXL.TORQUE_ENABLE, ids.map(id => ({id, value: 1})));
            await dev.syncWriteDXL(DXL.PROFILE_VELOCITY, ids.map(id => ({id, value: 0})));
            // the 3D robot runs on simulation time (slower than real time on a slow PC)
            const clock = tr && tr.physics ? () => tr.physics.data.time : () => performance.now() / 1000;
            const t0 = clock();
            const ramp = 0.6;
            let tick = 0;
            let last = this._items(gaitTargets(g, 0, 0), map);
            let prev = null;
            const cmd = {};
            while (this.running) {
                const t = clock() - t0;
                if (seconds > 0 && t > seconds) break;
                let k = Math.min(1, t / ramp);
                if (seconds > 0) k = Math.min(k, Math.max(0, (seconds - t) / ramp));
                const targets = gaitTargets(g, t, k);
                if (policy) {
                    const imu = await this._readImu();
                    const obs = policyObs(policy, {imu, targets: prev || targets, phase: (2 * Math.PI * t) / g.period});
                    const res = policyAct(policy, obs);
                    policy.joints.forEach((j, i) => { targets[j] += res[i] * k; });
                }
                prev = Object.assign(cmd, targets);
                last = this._items(targets, map);
                await dev.syncWriteDXL(DXL.GOAL_POSITION, last);
                this.t = t;
                this._emit();
                tick++;
                const next = tick * 0.04;
                while (this.running && clock() - t0 < next) await delay(4);
                if (clock() - t0 > next + 0.2) tick = Math.floor((clock() - t0) / 0.04); // fell behind: skip
            }
            // back to standing straight, gently
            await dev.syncWriteDXL(DXL.PROFILE_VELOCITY, ids.map(id => ({id, value: 40})));
            await dev.syncWriteDXL(DXL.GOAL_POSITION, this._items(gaitTargets(g, 0, 0), map));
        } finally {
            if (tr && 'quiet' in tr) tr.quiet = false;
            this.running = false;
            this._emit();
        }
    }

    /**
     * 3D 가상 로봇: run the controller inside the physics loop, exactly every
     * 0.04 s of simulated time — the same timing as the Python training kit.
     */
    _walkSim (tr, g, seconds, policy, map) {
        const ph = tr.physics;
        for (const j of map) {
            ph.setTorque(j.id, 1);
            ph.setProfile(j.id, 0);
            tr.regs.set(`${j.id}:64`, 1);
        }
        const t0 = ph.data.time;
        const ramp = 0.6;
        let prev = null;
        return new Promise(resolve => {
            ph.setController(time => {
                const t = time - t0;
                if (!this.running || (seconds > 0 && t > seconds)) {
                    ph.setController(null);
                    const stand = gaitTargets(g, 0, 0);
                    for (const j in stand) ph.setGoalRad(j, stand[j]);
                    resolve();
                    return;
                }
                let k = Math.min(1, t / ramp);
                if (seconds > 0) k = Math.min(k, Math.max(0, (seconds - t) / ramp));
                const targets = gaitTargets(g, t, k);
                if (policy) {
                    const obs = policyObs(policy, {imu: ph.imuRad(), targets: prev || targets, phase: (2 * Math.PI * t) / g.period});
                    const res = policyAct(policy, obs);
                    policy.joints.forEach((j, i) => { targets[j] += res[i] * k; });
                }
                prev = targets;
                for (const j in targets) ph.setGoalRad(j, targets[j]);
                this.t = t;
                if (Math.round(t / 0.04) % 5 === 0) this._emit();
            });
        });
    }

    async _readImu () {
        try {
            const b = await this.device.readBytes(200, 102, 18);
            const v = [];
            for (let i = 0; i < 18; i += 2) {
                let x = b[i] | (b[i + 1] << 8);
                if (x >= 0x8000) x -= 0x10000;
                v.push(x / 100);
            }
            return {roll: v[0] / DEG, pitch: v[1] / DEG, gx: v[3] / DEG, gy: v[4] / DEG};
        } catch (e) {
            return {roll: 0, pitch: 0, gx: 0, gy: 0};
        }
    }

    stop () {
        this.running = false;
    }
}
