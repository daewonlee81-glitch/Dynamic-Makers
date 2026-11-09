/**
 * The motions the virtual robots play for "모션 N번": the built-in official MAX-E1
 * example motions, or the .mtn3 file opened in the 3D tab.
 */
import MAXE1_MOTIONS from './maxe1-motions.json';
import {fromCompact, callSeconds, FRAME_SECONDS} from './mtn3';
import {motionNote} from './maxe1-motion-notes';

let builtIn = null;
let current = null;

export const builtInMotions = () => builtIn || (builtIn = fromCompact(MAXE1_MOTIONS));
export const currentMotions = () => current || builtInMotions();
export const isBuiltIn = () => currentMotions() === builtInMotions();
/** @param {object|null} m parsed .mtn3 (null: back to the built-in motions) */
export const setMotions = m => { current = m; };

/** Name for the log: "인사 (손 흔들기)" for the built-in motions, else the flow name from the file. */
export const motionName = index => {
    const m = currentMotions();
    const c = m.calls.find(x => x.index === index);
    if (!c) return '';
    return (isBuiltIn() && motionNote(index).title) || c.flow.replace(/^\d+_?H?_?/, '');
};

export const motionSeconds = index => callSeconds(currentMotions(), index);
export const hasMotion = index => currentMotions().calls.some(x => x.index === index);

/**
 * Key frames of one call (every unit, every loop), starting from `startPose`.
 * @param {number} index call number
 * @param {number[]} startPose degrees from the centre, one per m.ids
 * @param {number} playSpeed 1 = 100 % (CM-550 register 64)
 * @returns {{ids: number[], frames: Array<{t: number, pose: number[]}>, seconds: number}|null}
 */
export const motionTimeline = (index, startPose, playSpeed = 1) => {
    const m = currentMotions();
    const c = m.calls.find(x => x.index === index);
    if (!c) return null;
    const frames = [{t: 0, pose: startPose.slice()}];
    let t0 = 0;
    for (const u of m.flows[c.flow]) {
        const p = m.pages[u.page];
        if (!p) continue;
        const sp = Math.max(0.05, u.speed * playSpeed);
        for (let k = 0; k < u.loop; k++) {
            for (const s of p.steps) frames.push({t: t0 + (s.frame * FRAME_SECONDS / sp), pose: s.pose});
            t0 += p.seconds / sp;
        }
    }
    return {ids: m.ids.slice(), frames, seconds: t0};
};

export const poseAtTime = (tl, t) => {
    const f = tl.frames;
    if (t <= 0) return f[0].pose;
    for (let i = 1; i < f.length; i++) {
        if (f[i].t >= t) {
            const a = f[i - 1];
            const b = f[i];
            const k = (t - a.t) / Math.max(1e-6, b.t - a.t);
            return b.pose.map((v, n) => a.pose[n] + ((v - a.pose[n]) * k));
        }
    }
    return f[f.length - 1].pose;
};
