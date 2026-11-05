/**
 * Skeleton (몸 동작) tracking with the PC camera: MoveNet finds 17 body joints,
 * then joint angles and positions are worked out for the blocks, e.g.
 * "사람의 오른쪽 어깨 각도" → move a DYNAMIXEL so the robot copies the arm.
 *
 * Left/right are the PERSON's left/right (as when the robot faces them). The
 * preview is mirrored like a selfie camera, so it moves the way the student does.
 */
import {loadTF} from './sources';

export const KEYPOINTS = ['코', '왼쪽 눈', '오른쪽 눈', '왼쪽 귀', '오른쪽 귀', '왼쪽 어깨', '오른쪽 어깨',
    '왼쪽 팔꿈치', '오른쪽 팔꿈치', '왼쪽 손목', '오른쪽 손목', '왼쪽 엉덩이', '오른쪽 엉덩이',
    '왼쪽 무릎', '오른쪽 무릎', '왼쪽 발목', '오른쪽 발목'];
const K = {nose: 0, lEye: 1, rEye: 2, lSh: 5, rSh: 6, lEl: 7, rEl: 8, lWr: 9, rWr: 10, lHip: 11, rHip: 12,
    lKn: 13, rKn: 14, lAn: 15, rAn: 16};
export const BONES = [[5, 6], [5, 7], [7, 9], [6, 8], [8, 10], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15],
    [12, 14], [14, 16], [0, 1], [0, 2], [1, 3], [2, 4]];

/** joint menu value -> label (degrees) */
export const JOINTS = {
    leftShoulder: '왼쪽 어깨 (팔 올림)',
    rightShoulder: '오른쪽 어깨 (팔 올림)',
    leftElbow: '왼쪽 팔꿈치 (굽힘)',
    rightElbow: '오른쪽 팔꿈치 (굽힘)',
    leftKnee: '왼쪽 무릎 (굽힘)',
    rightKnee: '오른쪽 무릎 (굽힘)',
    body: '몸 기울기 (좌우)',
    head: '머리 기울기 (좌우)'
};
/** part menu value -> keypoint index (positions -100..100) */
export const PARTS = {nose: 0, leftHand: 9, rightHand: 10, leftFoot: 15, rightFoot: 16, leftShoulder: 5, rightShoulder: 6};
export const PART_NAMES = {nose: '코(얼굴)', leftHand: '왼손', rightHand: '오른손', leftFoot: '왼발', rightFoot: '오른발',
    leftShoulder: '왼쪽 어깨', rightShoulder: '오른쪽 어깨'};

const MIN_SCORE = 0.3;
const deg = r => (r * 180) / Math.PI;

/** angle at b between a-b-c, 0..180 */
const angleAt = (a, b, c) => {
    const v1 = [a.x - b.x, a.y - b.y];
    const v2 = [c.x - b.x, c.y - b.y];
    const n = Math.hypot(...v1) * Math.hypot(...v2);
    if (!n) return 0;
    return deg(Math.acos(Math.max(-1, Math.min(1, ((v1[0] * v2[0]) + (v1[1] * v2[1])) / n))));
};

/** Derived values from 17 keypoints {x, y (0..1 of the un-mirrored image), score}. */
export const measure = kps => {
    const ok = (...ids) => ids.every(i => kps[i] && kps[i].score >= MIN_SCORE);
    const a = {};
    const shoulder = (sh, el, hip) => (ok(sh, el, hip) ? angleAt(kps[el], kps[sh], kps[hip]) : null);
    const bend = (p, m, q) => (ok(p, m, q) ? 180 - angleAt(kps[p], kps[m], kps[q]) : null);
    a.leftShoulder = shoulder(K.lSh, K.lEl, K.lHip);
    a.rightShoulder = shoulder(K.rSh, K.rEl, K.rHip);
    a.leftElbow = bend(K.lSh, K.lEl, K.lWr);
    a.rightElbow = bend(K.rSh, K.rEl, K.rWr);
    a.leftKnee = bend(K.lHip, K.lKn, K.lAn);
    a.rightKnee = bend(K.rHip, K.rKn, K.rAn);
    // + = leaning to the person's left (the viewer's right in the mirrored preview)
    if (ok(K.lSh, K.rSh, K.lHip, K.rHip)) {
        const top = {x: (kps[K.lSh].x + kps[K.rSh].x) / 2, y: (kps[K.lSh].y + kps[K.rSh].y) / 2};
        const bot = {x: (kps[K.lHip].x + kps[K.rHip].x) / 2, y: (kps[K.lHip].y + kps[K.rHip].y) / 2};
        a.body = deg(Math.atan2(top.x - bot.x, bot.y - top.y));
    } else a.body = null;
    a.head = ok(K.lEye, K.rEye) ? deg(Math.atan2(kps[K.lEye].y - kps[K.rEye].y, kps[K.lEye].x - kps[K.rEye].x)) : null;
    const visible = ok(K.lSh, K.rSh) && (ok(K.lHip) || ok(K.rHip) || ok(K.nose));
    const pos = {};
    for (const [name, i] of Object.entries(PARTS)) {
        // mirrored like the preview: x -100 (left of screen) .. 100, y -100 (bottom) .. 100 (top)
        pos[name] = ok(i) ? {x: (0.5 - kps[i].x) * 200, y: (0.5 - kps[i].y) * 200} : null;
    }
    return {angles: a, pos, visible};
};

export class PoseTracker {
    constructor () {
        this.video = document.createElement('video');
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.className = 'ai-video';
        this.users = new Set();
        this.listeners = new Set();
        this.keypoints = null;
        this.data = measure([]);
        this.fps = 0;
    }

    get running () {
        return Boolean(this._loopOn);
    }

    onUpdate (fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    /** Start (shared): each user (AI panel, program blocks) holds a token. */
    async acquire (who) {
        this.users.add(who);
        if (this._starting) return this._starting;
        if (this._loopOn) return undefined;
        this._starting = this._start().finally(() => { this._starting = null; });
        return this._starting;
    }

    release (who) {
        this.users.delete(who);
        if (!this.users.size) this._stop();
    }

    async _start () {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('이 브라우저에서는 카메라를 쓸 수 없습니다. Chrome이나 Edge를 사용하세요.');
        }
        const {tf, loadMoveNet} = await loadTF();
        this.tf = tf;
        if (!this.model) this.model = await loadMoveNet();
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {width: {ideal: 640}, height: {ideal: 480}, facingMode: 'user'}, audio: false
            });
        } catch (e) {
            const n = e && e.name;
            throw new Error(n === 'NotAllowedError' || n === 'SecurityError' ?
                '카메라 사용이 허용되지 않았습니다. 주소창 옆의 권한 설정에서 카메라를 허용해 주세요.' :
                `카메라를 켤 수 없습니다: ${(e && e.message) || e}`);
        }
        this.video.srcObject = this.stream;
        await this.video.play().catch(() => {});
        if (!this.users.size) { // released while loading
            this._stop();
            return;
        }
        this._loopOn = true;
        this._emit();
        this._loop();
    }

    _stop () {
        this._loopOn = false;
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
        this.video.srcObject = null;
        this.keypoints = null;
        this.data = measure([]);
        this._emit();
    }

    _emit () {
        for (const fn of this.listeners) {
            try {
                fn(this);
            } catch (e) { /* keep tracking */ }
        }
    }

    async _loop () {
        let frames = 0;
        let since = Date.now();
        while (this._loopOn) {
            const t0 = Date.now();
            try {
                const kps = await this._estimate();
                if (kps) {
                    this._smooth(kps);
                    this.data = measure(this.keypoints);
                    frames++;
                    if (Date.now() - since > 1000) {
                        this.fps = frames;
                        frames = 0;
                        since = Date.now();
                    }
                    this._emit();
                }
            } catch (e) {
                this.error = e.message || String(e);
            }
            await new Promise(r => setTimeout(r, Math.max(5, 40 - (Date.now() - t0))));
        }
    }

    /** MoveNet on a letterboxed (square) frame; returns 17 {x, y, score} in image fractions. */
    async _estimate () {
        const v = this.video;
        if (!this.model || v.readyState < 2 || !v.videoWidth) return null;
        const tf = this.tf;
        const W = v.videoWidth;
        const H = v.videoHeight;
        const side = Math.max(W, H);
        const out = tf.tidy(() => {
            const img = tf.browser.fromPixels(v);
            const padded = tf.pad(img, [[Math.floor((side - H) / 2), Math.ceil((side - H) / 2)],
                [Math.floor((side - W) / 2), Math.ceil((side - W) / 2)], [0, 0]]);
            const x = tf.cast(tf.image.resizeBilinear(padded, [192, 192]), 'int32');
            return this.model.execute(tf.expandDims(x, 0));
        });
        const raw = await out.data(); // [1,1,17,3] = y, x, score in the padded square
        out.dispose();
        const kps = [];
        for (let i = 0; i < 17; i++) {
            const yy = raw[i * 3] * side - ((side - H) / 2);
            const xx = raw[(i * 3) + 1] * side - ((side - W) / 2);
            kps.push({x: xx / W, y: yy / H, score: raw[(i * 3) + 2]});
        }
        return kps;
    }

    _smooth (kps) {
        if (!this.keypoints) {
            this.keypoints = kps;
            return;
        }
        this.keypoints = kps.map((k, i) => {
            const p = this.keypoints[i];
            const a = k.score >= MIN_SCORE && p.score >= MIN_SCORE ? 0.55 : 1; // follow quickly, little jitter
            return {x: p.x + ((k.x - p.x) * a), y: p.y + ((k.y - p.y) * a), score: k.score};
        });
    }

    /** Joint angle in whole degrees, 0 when not visible. */
    angle (joint) {
        const v = this.data.angles[joint];
        return v === null || v === undefined ? 0 : Math.round(v);
    }

    position (part, axis) {
        const p = this.data.pos[part];
        return p ? Math.round(axis === 'y' ? p.y : p.x) : 0;
    }

    /** Draw the mirrored skeleton over a canvas the size of the preview. */
    draw (canvas) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        const k = this.keypoints;
        if (!k) return;
        const P = i => ({x: (1 - k[i].x) * W, y: k[i].y * H, ok: k[i].score >= MIN_SCORE});
        ctx.lineWidth = Math.max(3, W / 120);
        ctx.lineCap = 'round';
        for (const [a, b] of BONES) {
            const p = P(a);
            const q = P(b);
            if (!p.ok || !q.ok) continue;
            ctx.strokeStyle = a % 2 === 1 || b % 2 === 1 ? '#ffb347' : '#5ec8ff'; // person's left = orange
            if (a <= 4 && b <= 4) ctx.strokeStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
        }
        for (let i = 0; i < 17; i++) {
            const p = P(i);
            if (!p.ok) continue;
            ctx.fillStyle = '#8E44AD';
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(4, W / 90), 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

/**
 * AI 학습 input "몸 동작": the pose itself (joints relative to the body, so it
 * does not matter where the student stands or how far away) plus joint angles.
 */
export class BodySource {
    constructor (tracker) {
        this.kind = 'body';
        this.metric = 'euclid';
        this.interval = 120;
        this.tracker = tracker;
    }

    async start () {
        await this.tracker.acquire('ai-engine');
    }

    stop () {
        this.tracker.release('ai-engine');
    }

    get video () {
        return this.tracker.video;
    }

    async features () {
        const k = this.tracker.keypoints;
        const d = this.tracker.data;
        if (!k || !d.visible) return null;
        const cx = (k[5].x + k[6].x) / 2;
        const cy = (k[5].y + k[6].y) / 2;
        const scale = Math.hypot(k[5].x - k[6].x, k[5].y - k[6].y) || 0.1; // shoulder width
        const f = [];
        for (let i = 0; i < 17; i++) {
            if (i >= 1 && i <= 4) continue; // eyes / ears add little
            const okp = k[i].score >= MIN_SCORE;
            f.push(okp ? (k[i].x - cx) / scale : 0, okp ? (k[i].y - cy) / scale : 0);
        }
        for (const j of Object.keys(JOINTS)) {
            const v = d.angles[j];
            f.push(v === null ? 0 : v / 45);
        }
        return Float32Array.from(f);
    }
}
