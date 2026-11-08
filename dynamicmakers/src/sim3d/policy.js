/**
 * A small neural network (MLP) trained by the Python kit (sim/train_es.py).
 * It adds corrections to the rhythmic gait from what the CM-550 IMU feels, so
 * the walk can catch itself when it tips. Same maths as sim/maxe1_env.py.
 *
 * File format (JSON):
 * {format: 'dm-policy-1', joints: [12 joint names], gait: {...7 numbers},
 *  scale: 0.25, obs_scale: [...], layers: [{W: [[...]], b: [...]}, ...]}
 */

export const OBS_NAMES = ['roll', 'pitch', 'gx', 'gy', 'sin', 'cos'];

/** obs = [roll, pitch, gyro x, gyro y (rad, rad/s), sin φ, cos φ, 12 commanded joint angles (rad)] */
export const policyObs = (policy, {imu, targets, phase}) => {
    const o = [imu.roll, imu.pitch, imu.gx, imu.gy, Math.sin(phase), Math.cos(phase)];
    for (const j of policy.joints) o.push(targets[j] || 0);
    const s = policy.obs_scale || [];
    return o.map((v, i) => v * (s[i] === undefined ? 1 : s[i]));
};

export const policyAct = (policy, obs) => {
    let x = obs;
    policy.layers.forEach((L, li) => {
        const y = L.b.slice();
        for (let r = 0; r < L.W.length; r++) {
            let sum = y[r];
            const row = L.W[r];
            for (let c = 0; c < row.length; c++) sum += row[c] * x[c];
            y[r] = li < policy.layers.length - 1 ? Math.tanh(sum) : sum;
        }
        x = y;
    });
    return x.map(v => Math.tanh(v) * (policy.scale || 0.25));
};

export const checkPolicy = p => {
    if (!p || p.format !== 'dm-policy-1' || !Array.isArray(p.layers) || !Array.isArray(p.joints)) {
        throw new Error('다이나믹 메이커스 정책 파일(dm-policy-1)이 아닙니다.');
    }
    const inDim = OBS_NAMES.length + p.joints.length;
    if (p.layers[0].W[0].length !== inDim) throw new Error(`정책 입력 크기가 맞지 않습니다 (${p.layers[0].W[0].length} ≠ ${inDim}).`);
    return p;
};
