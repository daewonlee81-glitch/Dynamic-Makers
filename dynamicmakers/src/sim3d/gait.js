/**
 * A rhythmic walking pattern for MAX-E1 described by 7 numbers. Students (or
 * the search in 걸음 학습) choose the numbers; the same formula runs in the 3D
 * simulator, on the real robot and in the Python kit (sim/maxe1_env.py).
 *
 * Output: target angle (radians, 0 = straight) for each model joint.
 */

export const GAIT_PARAMS = [
    {key: 'period', name: '한 걸음 주기 (초)', min: 0.35, max: 1.2, step: 0.01, def: 0.381},
    {key: 'height', name: '무릎 굽힘 (낮게 서기)', min: 0.05, max: 0.6, step: 0.01, def: 0.154},
    {key: 'sway', name: '옆으로 흔들기', min: 0.06, max: 0.35, step: 0.01, def: 0.084},
    {key: 'lift', name: '발 들기', min: 0.12, max: 0.5, step: 0.01, def: 0.12},
    {key: 'stride', name: '보폭', min: 0, max: 0.4, step: 0.01, def: 0.248},
    {key: 'liftPhase', name: '발 드는 때 (위상)', min: -3.14, max: 3.14, step: 0.01, def: -2.664},
    {key: 'arm', name: '팔 흔들기', min: 0, max: 0.6, step: 0.01, def: 0.328}
];

export const defaultGait = () => Object.fromEntries(GAIT_PARAMS.map(p => [p.key, p.def]));

/**
 * @param {object} g gait numbers
 * @param {number} t seconds since the walk started
 * @param {number} k 0..1 fade-in (start gently from standing)
 * @returns {Object<string, number>} joint -> radians
 */
export const gaitTargets = (g, t, k = 1) => {
    const ph = (2 * Math.PI * t) / g.period;
    const roll = g.sway * Math.sin(ph) * k;
    const out = {};
    for (const [s, sg] of [['R', 1], ['L', -1]]) {
        const lift = g.lift * Math.max(0, Math.sin(ph + g.liftPhase + (s === 'L' ? Math.PI : 0))) * k;
        const step = g.stride * Math.cos(ph) * sg * k;
        out[`${s}_hip_roll`] = roll;
        out[`${s}_ankle_roll`] = -roll;
        out[`${s}_hip_pitch`] = (-g.height * k) - lift + step;
        out[`${s}_knee`] = (g.height * k) + lift;
        out[`${s}_shoulder_pitch`] = -g.arm * Math.cos(ph) * sg * k;
        out[`${s}_shoulder_roll`] = 0;
    }
    return out;
};

/** Standing pose (all straight) as joint -> radians. */
export const standTargets = () => {
    const out = {};
    for (const s of ['R', 'L']) {
        for (const j of ['hip_roll', 'ankle_roll', 'hip_pitch', 'knee', 'shoulder_pitch', 'shoulder_roll']) out[`${s}_${j}`] = 0;
    }
    return out;
};
