/**
 * Inputs for AI 학습. Each source turns what it sees/hears/feels into a short
 * list of numbers ("features"); the classifier compares those numbers with the
 * examples students collected.
 *
 *   camera — MobileNet (embedded) turns a picture into 256 numbers
 *   sound  — loudness in 32 pitch bands over the last second
 *   sensor — CM-550 tilt, gyro and acceleration over the last second
 */

const delay = ms => new Promise(r => setTimeout(r, ms));

// ---- TensorFlow.js + MobileNet (lazy, separate dm-ai.js bundle) -------------
let tfPromise = null;
export const loadTF = () => {
    if (!tfPromise) {
        tfPromise = new Promise((resolve, reject) => {
            if (window.DMAI_TF) return resolve(window.DMAI_TF);
            const s = document.createElement('script');
            s.src = 'dm-ai.js';
            s.onload = () => (window.DMAI_TF ? resolve(window.DMAI_TF) :
                reject(new Error('AI 모듈을 불러오지 못했습니다.')));
            s.onerror = () => reject(new Error('AI 모듈(dm-ai.js)을 불러오지 못했습니다.'));
            document.head.append(s);
        }).catch(e => {
            tfPromise = null;
            throw e;
        });
    }
    return tfPromise;
};

const mediaError = (e, what) => {
    const name = e && e.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
        return new Error(`${what} 사용이 허용되지 않았습니다. 주소창 옆의 권한 설정에서 ${what}를 허용해 주세요.`);
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return new Error(`${what}를 찾지 못했습니다.`);
    return new Error(`${what}를 켤 수 없습니다: ${(e && e.message) || e}`);
};

const l2normalize = v => {
    let n = 0;
    for (let i = 0; i < v.length; i++) n += v[i] * v[i];
    n = Math.sqrt(n) || 1;
    for (let i = 0; i < v.length; i++) v[i] /= n;
    return v;
};

export class CameraSource {
    constructor () {
        this.kind = 'camera';
        this.metric = 'cosine';
        this.interval = 120;
        this.video = document.createElement('video');
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.className = 'ai-video';
    }

    async start () {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('이 브라우저에서는 카메라를 쓸 수 없습니다. Chrome이나 Edge를 사용하세요.');
        }
        const [{tf, loadMobilenet}] = await Promise.all([loadTF()]);
        this.tf = tf;
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {width: {ideal: 320}, height: {ideal: 240}, facingMode: 'user'}, audio: false
            });
        } catch (e) {
            throw mediaError(e, '카메라');
        }
        this.video.srcObject = this.stream;
        await this.video.play().catch(() => {});
        if (!this.model) this.model = await loadMobilenet();
    }

    stop () {
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
        this.video.srcObject = null;
    }

    async features () {
        if (!this.model || this.video.readyState < 2 || !this.video.videoWidth) return null;
        const tf = this.tf;
        const out = tf.tidy(() => {
            let img = tf.browser.fromPixels(this.video);
            const [h, w] = img.shape;
            const side = Math.min(h, w);
            img = tf.slice(img, [Math.floor((h - side) / 2), Math.floor((w - side) / 2), 0], [side, side, 3]);
            img = tf.image.resizeBilinear(img, [224, 224]);
            const x = tf.expandDims(tf.sub(tf.div(tf.cast(img, 'float32'), 127.5), 1), 0);
            return this.model.predict(x);
        });
        const data = await out.data();
        out.dispose();
        return l2normalize(Float32Array.from(data));
    }
}

const BANDS = 32;
export class SoundSource {
    constructor () {
        this.kind = 'sound';
        this.metric = 'euclid';
        this.interval = 100;
        this.frames = [];
        this.level = new Float32Array(BANDS);
    }

    async start () {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('이 브라우저에서는 마이크를 쓸 수 없습니다. Chrome이나 Edge를 사용하세요.');
        }
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false}, video: false
            });
        } catch (e) {
            throw mediaError(e, '마이크');
        }
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctx();
        if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0;
        this.ctx.createMediaStreamSource(this.stream).connect(this.analyser);
        const bins = new Float32Array(this.analyser.frequencyBinCount);
        const hzPerBin = this.ctx.sampleRate / this.analyser.fftSize;
        // log-spaced bands 80 Hz .. 8 kHz
        const edges = Array.from({length: BANDS + 1}, (_, i) => 80 * Math.pow(100, i / BANDS));
        this.timer = setInterval(() => {
            this.analyser.getFloatFrequencyData(bins);
            const frame = new Float32Array(BANDS);
            for (let b = 0; b < BANDS; b++) {
                const lo = Math.max(1, Math.floor(edges[b] / hzPerBin));
                const hi = Math.max(lo + 1, Math.ceil(edges[b + 1] / hzPerBin));
                let sum = 0;
                let n = 0;
                for (let k = lo; k < hi && k < bins.length; k++) {
                    sum += Number.isFinite(bins[k]) ? Math.max(-110, bins[k]) : -110;
                    n++;
                }
                frame[b] = n ? (sum / n) : -110;
            }
            this.level = frame;
            this.frames.push(frame);
            if (this.frames.length > 20) this.frames.shift(); // last second
        }, 50);
    }

    stop () {
        clearInterval(this.timer);
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
        if (this.ctx) this.ctx.close().catch(() => {});
        this.stream = null;
        this.ctx = null;
        this.frames = [];
    }

    async features () {
        if (this.frames.length < 6) return null;
        const f = new Float32Array(BANDS * 2);
        for (let b = 0; b < BANDS; b++) {
            let sum = 0;
            let max = -Infinity;
            for (const fr of this.frames) {
                sum += fr[b];
                if (fr[b] > max) max = fr[b];
            }
            f[b] = sum / this.frames.length;
            f[BANDS + b] = max;
        }
        return f;
    }
}

// CM-550 IMU block: roll, pitch, yaw (0.01°), gyro x/y/z (0.01°/s), acc x/y/z (0.01 G)
const IMU_ADDR = 102;
const IMU_LEN = 18;
export const SENSOR_CHANNELS = ['기울기 좌우', '기울기 앞뒤', '회전 X', '회전 Y', '회전 Z', '가속 X', '가속 Y', '가속 Z'];

export class SensorSource {
    constructor (device) {
        this.kind = 'sensor';
        this.metric = 'euclid';
        this.interval = 150;
        this.device = device;
        this.samples = [];
        this.latest = null;
    }

    async start () {
        if (!this.device.connected) throw new Error('로봇 센서를 쓰려면 먼저 로봇을 연결하세요.');
        this.running = true;
        const slow = /블루투스|BLE|Bluetooth/i.test(this.device.transportName || '');
        (async () => {
            while (this.running) {
                try {
                    const b = await this.device.readBytes(200, IMU_ADDR, IMU_LEN);
                    const v = [];
                    for (let i = 0; i < IMU_LEN; i += 2) {
                        let x = b[i] | (b[i + 1] << 8);
                        if (x >= 0x8000) x -= 0x10000;
                        v.push(x / 100);
                    }
                    // drop yaw (it drifts and depends on where the robot faces)
                    const sample = [v[0], v[1], v[3], v[4], v[5], v[6], v[7], v[8]];
                    this.latest = sample;
                    this.samples.push(sample);
                    if (this.samples.length > (slow ? 5 : 10)) this.samples.shift();
                } catch (e) {
                    if (!this.device.connected) this.running = false;
                }
                await delay(slow ? 200 : 90);
            }
        })();
    }

    stop () {
        this.running = false;
        this.samples = [];
    }

    async features () {
        if (this.samples.length < 3) return null;
        const C = this.samples[0].length;
        const f = new Float32Array(C * 4);
        for (let c = 0; c < C; c++) {
            const xs = this.samples.map(s => s[c]);
            const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
            const sd = Math.sqrt(xs.reduce((a, b) => a + ((b - mean) ** 2), 0) / xs.length);
            f[c * 4] = mean;
            f[(c * 4) + 1] = sd;
            f[(c * 4) + 2] = Math.min(...xs);
            f[(c * 4) + 3] = Math.max(...xs);
        }
        return f;
    }
}

export const makeSource = (kind, device, tracker, BodySource) => {
    if (kind === 'body') return new BodySource(tracker);
    if (kind === 'sound') return new SoundSource();
    if (kind === 'sensor') return new SensorSource(device);
    return new CameraSource();
};
