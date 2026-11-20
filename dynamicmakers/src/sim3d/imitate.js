/**
 * 영상으로 따라 하기 — a person's movement (video file or webcam) → MAX-E1.
 *
 *   MoveNet: 17 body points per frame  →  arm directions, knee bend, body lean
 *   → MAX-E1 motor angles (same numbers as the official motion file: degrees from
 *     the centre, ID 1-12)  →  smoothing + joint limits  →  3D check / blocks / robot
 *
 * The robot has no elbows (2 shoulder motors per arm) and no ankle pitch, so:
 *  - arms follow the shoulder → wrist direction (elbow bends are dropped);
 *  - legs only copy what keeps the robot standing: bending the knees (squat, like
 *    motion 107) and leaning the body sideways (both legs sway, like the walk).
 *
 * Conventions taken from the official motions: ID1 + = right arm forward/up
 * (90 forward, 170 up), ID3 the same with −; ID2/ID4 + = arm out to the side;
 * squat = ID6, ID8, ID9, ID11 all −a (motion 107 sits at −70): the thigh tilts forward by a and the
 * shin stays upright, so the robot's knee bends by a — the same angle as the person's knee.
 * Arms: the shoulder pitch axis is turned 15° and the arm hangs 15° out, so the angles are solved
 * from that geometry (armIK) — copying the person's angles straight across misses by 11-15°.
 */
import {BONES} from '../ai/pose';
import {MAXE1_JOINT_MAP} from './maxe1-model';
import CAD from './maxe1-cad.json';

export const IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// ---- the MAX-E1 shoulder, as built (sim/maxe1.xml): the pitch axis is turned 15° by the angled
// shoulder bracket, and the arm hangs 15° out from the body at 0°. So "arm straight up" is NOT
// pitch 180°, and "arm out to the side" is NOT roll 90° — solve it from the real geometry.
const TILT = (CAD.dims.shoulderTilt * Math.PI) / 180; // 15°
const SIGN = Object.fromEntries(MAXE1_JOINT_MAP.map(j => [j.id, j.sign]));
const rot = (a, th, v) => { // Rodrigues: v rotated by th about unit axis a
    const c = Math.cos(th);
    const s = Math.sin(th);
    const d = (a[0] * v[0]) + (a[1] * v[1]) + (a[2] * v[2]);
    const x = [(a[1] * v[2]) - (a[2] * v[1]), (a[2] * v[0]) - (a[0] * v[2]), (a[0] * v[1]) - (a[1] * v[0])];
    return [0, 1, 2].map(i => (v[i] * c) + (x[i] * s) + (a[i] * d * (1 - c)));
};
const ARM = {
    R: {axis: [0, Math.cos(TILT), -Math.sin(TILT)], rest: [0, -Math.sin(TILT), -Math.cos(TILT)], ids: [1, 2]},
    L: {axis: [0, Math.cos(TILT), Math.sin(TILT)], rest: [0, Math.sin(TILT), -Math.cos(TILT)], ids: [3, 4]}
};
/** Arm direction of the model for joint angles (rad): pitch about the tilted axis, then roll about x. */
export const armForward = (side, pitch, roll) => rot(ARM[side].axis, pitch, rot([1, 0, 0], roll, ARM[side].rest));

/**
 * Joint angles that point the robot's arm along u (torso frame: x forward, y left, z up).
 * Two answers usually exist; the one with the smaller roll (closest to the last pitch when equal) wins.
 * @returns {{pitch: number, roll: number}} model joint angles (rad)
 */
export const armIK = (side, u, prevPitch = 0) => {
    const A = ARM[side];
    const wx = th => rot(A.axis, -th, u)[0]; // the roll motor cannot move the arm along x: must be 0
    const cands = [];
    const N = 180;
    const S = -Math.PI - 0.0123; // start a little before −180° so a root at ±180° is not missed
    let t0 = S;
    let f0 = wx(t0);
    for (let i = 1; i <= N + 1; i++) {
        const t1 = S + ((2 * Math.PI * i) / N);
        const f1 = wx(t1);
        if (f0 === 0 || f0 * f1 < 0) {
            let lo = t0;
            let hi = t1;
            for (let k = 0; k < 30; k++) {
                const mid = (lo + hi) / 2;
                if (wx(lo) * wx(mid) <= 0) hi = mid;
                else lo = mid;
            }
            const r = (lo + hi) / 2;
            cands.push(Math.atan2(Math.sin(r), Math.cos(r)));
        }
        t0 = t1;
        f0 = f1;
    }
    if (!cands.length) cands.push(prevPitch);
    const angYZ = v => Math.atan2(v[2], v[1]);
    let best = null;
    for (const th of cands) {
        const w = rot(A.axis, -th, u);
        let roll = angYZ(w) - angYZ(A.rest);
        roll = Math.atan2(Math.sin(roll), Math.cos(roll));
        const cost = Math.abs(roll) + (0.3 * Math.abs(th - prevPitch)) + (Math.abs(roll) > 1.7 ? 10 : 0);
        if (!best || cost < best.cost) best = {pitch: th, roll, cost};
    }
    return {pitch: best.pitch, roll: best.roll};
};
/** model joint angles (rad) → motor degrees from the centre for that arm's two IDs */
const armToMotor = (side, a) => {
    const [ip, ir] = ARM[side].ids;
    return {[ip]: (a.pitch * 180 / Math.PI) * SIGN[ip], [ir]: (a.roll * 180 / Math.PI) * SIGN[ir]};
};

const MIN_SCORE = 0.3;
const DEG = 180 / Math.PI;
const K = {lSh: 5, rSh: 6, lEl: 7, rEl: 8, lWr: 9, rWr: 10, lHip: 11, rHip: 12, lKn: 13, rKn: 14, lAn: 15, rAn: 16};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const LEG_MODES = {
    stand: '다리는 그대로 (팔만 따라 하기)',
    squat: '팔 + 앉기 · 옆으로 기울기'
};
// Sign of the hip/ankle roll motors (motor degrees) that moves the body to the robot's own left.
// (measured on the 3D robot: test/imitate-check.js)
export const SWAY_LEFT = 1;

/**
 * New tracking state (arm length estimates, last good values) for one clip / session.
 * @param {{legs?: string, mirror?: boolean}} opts
 */
export const newImitation = (opts = {}) => ({
    legs: opts.legs || 'squat',
    mirror: opts.mirror !== false,
    pitch: {}, // last arm pitch per side
    arm: {R: 0, L: 0}, // longest arm seen, in torso lengths (straight arm in the image plane)
    torso: 0,
    last: null,
    out: null
});

/**
 * One frame → motor degrees from the centre for ID 1-12 (null where nothing new was seen).
 * @param {Array<{x: number, y: number, score: number}>} kps 17 points, fractions of the image
 * @param {number} aspect image width / height
 * @param {object} st newImitation() state
 * @returns {{deg: object, seen: number}} deg[id] (motion-file degrees, 0 = straight)
 */
export const retarget = (kps, aspect, st) => {
    const ok = (...ids) => ids.every(i => kps[i] && kps[i].score >= MIN_SCORE);
    const P = i => ({x: kps[i].x * aspect, y: kps[i].y});
    const mid = (a, b) => ({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const prev = st.last || {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: -10, 7: 0, 8: -10, 9: -10, 10: 0, 11: -10, 12: 0};
    const d = {...prev};
    let seen = 0;

    // torso length: shoulders → hips (shoulder width × 1.5 when the hips are out of the picture)
    if (ok(K.lSh, K.rSh, K.lHip, K.rHip)) {
        const t = dist(mid(P(K.lSh), P(K.rSh)), mid(P(K.lHip), P(K.rHip)));
        st.torso = st.torso ? (st.torso * 0.9) + (t * 0.1) : t;
    } else if (ok(K.lSh, K.rSh) && !st.torso) {
        st.torso = dist(P(K.lSh), P(K.rSh)) * 1.5;
    }
    const T = st.torso;
    if (!T) return {deg: d, seen: 0};

    // arms: direction shoulder → wrist (or → elbow, doubled)
    const arm = (side, sh, el, wr) => {
        if (!ok(sh) || !(ok(wr) || ok(el))) return null;
        const s = P(sh);
        const e = ok(wr) ? P(wr) : P(el);
        const k = ok(wr) ? 1 : 2;
        const v = {x: (e.x - s.x) * k, y: (e.y - s.y) * k};
        const len = Math.hypot(v.x, v.y) / T;
        st.arm[side] = Math.max(st.arm[side] * 0.9995, len);
        const L = Math.max(st.arm[side], 0.9) * T; // the longest arm seen (a straight arm is ≈ 1.1 torso lengths)
        // the person faces the camera: their right arm is on the image's left
        const out = (side === 'R' ? -v.x : v.x) / L;
        const down = v.y / L;
        let fwd = Math.sqrt(Math.max(0, 1 - (out * out) - (down * down)));
        fwd = Math.max(0, fwd - 0.15) / 0.85; // foreshortening noise
        // direction in "outward / forward / up" terms; turned into the robot's frame per robot side below
        return {fwd, out: clamp(out, -1, 1), up: -down};
    };
    const pr = arm('R', K.rSh, K.rEl, K.rWr);
    const pl = arm('L', K.lSh, K.lEl, K.lWr);
    // mirror: the person's right arm moves the robot's left arm (like facing a mirror)
    const toRight = st.mirror ? pl : pr;
    const toLeft = st.mirror ? pr : pl;
    const solve = (side, a) => {
        const n = Math.hypot(a.fwd, a.out, a.up) || 1;
        const u = [a.fwd / n, (side === 'R' ? -a.out : a.out) / n, a.up / n];
        const q = armIK(side, u, st.pitch[side] || 0);
        // keep the arm off the body: while the arm is down it may roll in only until it hangs straight
        const inward = side === 'R' ? q.roll > 0 : q.roll < 0; // + roll on the right arm (model) = toward the body
        if (inward && Math.abs(q.pitch) < 0.7) q.roll = Math.sign(q.roll) * Math.min(Math.abs(q.roll), TILT);
        st.pitch[side] = q.pitch;
        return armToMotor(side, q);
    };
    if (toRight) {
        Object.assign(d, solve('R', toRight));
        seen++;
    }
    if (toLeft) {
        Object.assign(d, solve('L', toLeft));
        seen++;
    }

    if (st.legs === 'squat') {
        // knees: 180° − angle hip-knee-ankle; the robot squats like motion 107 (both legs together)
        const bend = (h, kn, an) => {
            if (!ok(h, kn, an)) return null;
            const a = P(h);
            const b = P(kn);
            const c = P(an);
            const v1 = [a.x - b.x, a.y - b.y];
            const v2 = [c.x - b.x, c.y - b.y];
            const n = Math.hypot(...v1) * Math.hypot(...v2);
            return n ? 180 - (Math.acos(clamp(((v1[0] * v2[0]) + (v1[1] * v2[1])) / n, -1, 1)) * DEG) : null;
        };
        const bs = [bend(K.lHip, K.lKn, K.lAn), bend(K.rHip, K.rKn, K.rAn)].filter(v => v !== null);
        // seen from the front, bent knees point at the camera and look straighter than they are:
        // also judge the bend by how much shorter the legs look than when standing
        let byHeight = null;
        if (ok(K.lHip, K.rHip, K.lAn, K.rAn)) {
            // hip → ankle length of the straighter leg: bent knees pointing at the camera make it
            // shorter; feet apart (a wide stance) or one lifted foot do not
            const h = Math.max(dist(P(K.lHip), P(K.lAn)), dist(P(K.rHip), P(K.rAn))) / T;
            st.leg = Math.max((st.leg || 0) * 0.9995, h);
            const ratio = h / Math.max(st.leg, 1.3); // (legs are ≈ 1.3-1.8 torso lengths, children shorter)
            byHeight = 2 * Math.acos(clamp(ratio / 0.96, 0, 1)) * DEG;
        }
        if (bs.length || byHeight !== null) {
            // the robot's knee bends by the same angle (its shin stays upright, like motion 107: hip
            // pitch and knee both −a); the 2D angle and the hip-height guess: whichever sees more bend
            // the robot bends both knees together: copy the straighter leg (standing on one bent leg —
            // a lifted knee — is not a squat, and the robot cannot stand on one leg)
            const flat = bs.length ? Math.min(...bs) : 0;
            const a = clamp(Math.max(flat, byHeight || 0), 10, 65);
            d[6] = d[8] = d[9] = d[11] = -a;
            seen++;
        }
        // body lean (shoulders over hips): + = the person leans to their left
        if (ok(K.lSh, K.rSh, K.lHip, K.rHip)) {
            const top = mid(P(K.lSh), P(K.rSh));
            const bot = mid(P(K.lHip), P(K.rHip));
            const lean = Math.atan2(top.x - bot.x, bot.y - top.y) * DEG; // image right = person's left
            const toRobotLeft = st.mirror ? -lean : lean;
            const r = clamp(toRobotLeft * 0.5, -10, 10);
            const v = Math.abs(r) < 1.5 ? 0 : r * SWAY_LEFT;
            d[5] = d[7] = d[10] = d[12] = v;
            seen++;
        }
    } else {
        d[5] = d[7] = d[10] = d[12] = 0;
        d[6] = d[8] = d[9] = d[11] = -10;
    }
    st.last = d;
    return {deg: d, seen};
};

/**
 * Smooth and limit the speed of the joint angles between frames.
 * @param {object} st state (keeps the previous output)
 * @param {object} deg retarget() result
 * @param {number} dt seconds since the previous frame
 */
export const smooth = (st, deg, dt) => {
    const prev = st.out;
    if (!prev) {
        st.out = {...deg};
        return st.out;
    }
    const out = {};
    for (const id of IDS) {
        const legs = id >= 5;
        const maxStep = (legs ? 90 : 300) * dt; // degrees per second
        const a = legs ? 0.35 : 0.6;
        const target = prev[id] + ((deg[id] - prev[id]) * a);
        out[id] = prev[id] + clamp(target - prev[id], -maxStep, maxStep);
    }
    st.out = out;
    return out;
};

/** motion-file degrees → a recording frame (motor degrees, 180 = straight) */
export const toFrame = (t, deg) => {
    const f = {t, deg: {}};
    for (const id of IDS) f.deg[id] = Math.round((180 + deg[id]) * 10) / 10;
    return f;
};

/** Body points at time t from a recording's skeleton log ([[x, y, score]] per point). */
export const kpsAt = (log, t) => {
    if (!log || !log.length) return null;
    let best = log[0];
    for (const e of log) {
        if (e.t > t + 1e-6) break;
        best = e;
    }
    return best.k ? best.k.map(q => ({x: q[0], y: q[1], score: q[2]})) : null;
};

/** Draw the frame and the skeleton (not mirrored: as the video shows it). */
export const drawSkeleton = (canvas, video, kps, {mirror = false} = {}) => {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.save();
    if (mirror) {
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
    }
    if (video && video.readyState >= 2) ctx.drawImage(video, 0, 0, W, H);
    else ctx.clearRect(0, 0, W, H);
    if (kps) {
        const Q = i => ({x: kps[i].x * W, y: kps[i].y * H, ok: kps[i].score >= MIN_SCORE});
        ctx.lineWidth = Math.max(3, W / 110);
        ctx.lineCap = 'round';
        for (const [a, b] of BONES) {
            const p = Q(a);
            const q = Q(b);
            if (!p.ok || !q.ok) continue;
            ctx.strokeStyle = a % 2 === 1 || b % 2 === 1 ? '#ffb347' : '#5ec8ff'; // person's left = orange
            if (a <= 4 && b <= 4) ctx.strokeStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
        }
    }
    ctx.restore();
};

/**
 * Analyse a video file frame by frame.
 * @param {File|Blob} file video
 * @param {object} tracker PoseTracker (its MoveNet model is loaded here)
 * @param {object} o
 * @param {object} o.opts {legs, mirror}
 * @param {number} [o.fps] frames analysed per second of video
 * @param {number} [o.maxSeconds] longest part of the video used
 * @param {HTMLCanvasElement} [o.canvas] preview
 * @param {(p: number, text: string) => void} [o.onProgress]
 * @param {() => boolean} [o.cancelled]
 * @returns {Promise<object>} recording {page, label, ids, frames, seconds, fromVideo, seen}
 */
export const analyzeVideo = async (file, tracker, o) => {
    const fps = o.fps || 10;
    await tracker.loadModel();
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    const url = URL.createObjectURL(file);
    let kept = false;
    try {
        video.src = url;
        await new Promise((resolve, reject) => {
            video.onloadeddata = resolve;
            video.onerror = () => reject(new Error('이 영상 형식은 브라우저에서 열 수 없습니다 (mp4·webm 권장).'));
        });
        const dur = Math.min(video.duration || 0, o.maxSeconds || 60);
        if (!(dur > 0.3)) throw new Error('영상이 너무 짧습니다.');
        const aspect = video.videoWidth / video.videoHeight;
        if (o.canvas) {
            o.canvas.width = 320;
            o.canvas.height = Math.round(320 / aspect);
        }
        const st = newImitation(o.opts);
        const frames = [];
        const kpsLog = []; // body points per frame, to draw the skeleton when playing back
        let found = 0;
        const n = Math.floor(dur * fps) + 1;
        for (let i = 0; i < n; i++) {
            if (o.cancelled && o.cancelled()) throw new Error('취소했습니다.');
            const t = i / fps;
            await new Promise(resolve => {
                const done = () => {
                    video.removeEventListener('seeked', done);
                    resolve();
                };
                video.addEventListener('seeked', done);
                video.currentTime = Math.min(t, video.duration - 0.001);
                setTimeout(done, 1500); // some files never fire 'seeked' for the last frame
            });
            const kps = await tracker.estimateOn(video);
            kpsLog.push({t, k: kps ? kps.map(q => [Math.round(q.x * 1000) / 1000, Math.round(q.y * 1000) / 1000, Math.round(q.score * 100) / 100]) : null});
            let deg = st.last;
            if (kps) {
                const r = retarget(kps, aspect, st);
                deg = r.deg;
                if (r.seen) found++;
            }
            if (deg) frames.push(toFrame(t, smooth(st, deg, 1 / fps)));
            if (o.canvas) drawSkeleton(o.canvas, video, kps);
            if (o.onProgress) o.onProgress(Math.round(((i + 1) / n) * 100), `${t.toFixed(1)} / ${dur.toFixed(1)}초`);
        }
        if (!found) throw new Error('영상에서 사람을 찾지 못했습니다. 온몸(적어도 어깨·팔)이 보이는 영상을 쓰세요.');
        const name = (file.name || '영상').replace(/\.[^.]+$/, '');
        const rec = {page: name, label: `영상 「${name}」`, ids: IDS.slice(), frames, seconds: frames[frames.length - 1].t,
            fromVideo: true, seen: found / n, truncated: (video.duration || 0) > dur + 0.05};
        // kept out of saved files: the video itself and the skeletons, for playing back side by side
        Object.defineProperty(rec, 'video', {value: {url, kps: kpsLog, aspect}, enumerable: false});
        kept = true;
        return rec;
    } finally {
        if (!kept) URL.revokeObjectURL(url);
        video.removeAttribute('src');
    }
};
