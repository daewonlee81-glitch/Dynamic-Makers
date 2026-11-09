/**
 * 예제 모션 확인 — play a motion page that is stored in the CM-550 (e.g. the
 * official MAX-E1 example motions from R+ Task) and record what every joint
 * does, about 10–20 times a second. The recording can be
 *   - checked: which IDs move, how far (min / max degrees),
 *   - replayed on the 3D robot with the app's ID map: if the official walk also
 *     walks forward in 3D, the IDs, directions and centres are right,
 *   - turned into blocks ("모두 함께 … 초 동안 움직이기" per key pose).
 */
const {DXL, CM} = require('../../../scratch-cm550/src/cm550');

const DEG = 180 / Math.PI;
const delay = ms => new Promise(r => setTimeout(r, ms));
const tickToDeg = t => (t / 4096) * 360;

export class MotionRecorder {
    constructor ({device, getJointMap}) {
        this.device = device;
        this.getJointMap = getJointMap;
        this.running = false;
    }

    /**
     * @param {number} page motion page stored in the CM-550
     * @param {object} [o]
     * @param {number} [o.maxSeconds] stop recording after this long
     * @param {Function} [o.onFrame] (frame, rec) after each sample
     * @returns {Promise<{page, ids, frames: Array<{t, deg: Object<number, number>}>, seconds, syncRead}>}
     */
    async record (page, {maxSeconds = 20, onFrame} = {}) {
        const dev = this.device;
        if (!dev.connected) throw new Error('먼저 로봇을 연결하세요.');
        const ids = this.getJointMap().map(j => j.id);
        const rec = {page, ids, frames: [], seconds: 0, syncRead: false};
        const sample = async t0 => {
            const pos = await dev.syncReadDXL(DXL.PRESENT_POSITION, ids);
            const deg = {};
            for (const id of ids) deg[id] = Math.round(tickToDeg(pos.get(id)) * 10) / 10;
            const frame = {t: Math.round((performance.now() - t0)) / 1000, deg};
            rec.frames.push(frame);
            if (onFrame) onFrame(frame, rec);
        };
        this.running = true;
        const t0 = performance.now();
        await sample(t0); // where it starts
        await dev.playMotion(page);
        let idle = 0;
        try {
            while (this.running) {
                await sample(t0);
                const playing = await dev.readCM(CM.MOTION_STATUS);
                const t = (performance.now() - t0) / 1000;
                if (!playing && t > 0.4) idle++;
                if (idle >= 3 || t > maxSeconds) break;
            }
            if (!this.running) await dev.stopMotion();
        } finally {
            this.running = false;
        }
        rec.seconds = rec.frames.length ? rec.frames[rec.frames.length - 1].t : 0;
        rec.syncRead = Boolean(dev.syncReadWorks);
        return rec;
    }

    stop () {
        this.running = false;
    }
}

/** Per ID: lowest, highest and how far it moved (degrees). */
export const summarize = (rec, jointMap) => jointMap.map(j => {
    const v = rec.frames.map(f => f.deg[j.id]).filter(x => typeof x === 'number');
    const min = Math.min(...v);
    const max = Math.max(...v);
    return {id: j.id, name: j.name, joint: j.joint, start: v[0], min, max, range: max - min};
});

/** Joint angles (degrees) at time t, straight-line between samples. */
export const poseAt = (rec, t) => {
    const f = rec.frames;
    if (!f.length) return {};
    if (t <= f[0].t) return f[0].deg;
    for (let i = 1; i < f.length; i++) {
        if (f[i].t >= t) {
            const a = f[i - 1];
            const b = f[i];
            const k = (t - a.t) / Math.max(1e-6, b.t - a.t);
            const out = {};
            for (const id of Object.keys(b.deg)) out[id] = a.deg[id] + ((b.deg[id] - a.deg[id]) * k);
            return out;
        }
    }
    return f[f.length - 1].deg;
};

/** DYNAMIXEL degrees → model joint radians with the app's ID map (sign, centre). */
export const toJointRad = (deg, jointMap) => {
    const out = {};
    for (const j of jointMap) {
        if (typeof deg[j.id] === 'number') out[j.joint] = j.sign * (deg[j.id] - j.center) / DEG;
    }
    return out;
};

/**
 * Key poses for blocks: one every `step` seconds (and the last one), each with
 * the time it takes to get there.
 */
export const keyPoses = (rec, step = 0.12) => {
    const end = rec.seconds;
    const out = [];
    let prev = 0;
    for (let t = step; t < end + (step / 2); t += step) {
        const tt = Math.min(t, end);
        const deg = poseAt(rec, tt);
        out.push({secs: Math.round((tt - prev) * 1000) / 1000,
            joints: rec.ids.map(id => ({id, deg: Math.round(deg[id] * 10) / 10}))});
        prev = tt;
    }
    return out;
};
