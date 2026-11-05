/**
 * AI 학습 engine: examples per kind (class), a k-nearest-neighbours classifier
 * and the live recognition loop shared by the panel and the AI blocks.
 *
 * k-NN keeps the idea visible for students: "the robot compares what it sees
 * now with the examples you showed it and picks the most similar kind".
 */
import {makeSource} from './sources';

const MAX_EXAMPLES = 300;
const THRESHOLD = 0.6; // below this the robot is "not sure" → no kind recognised

// ---- classifier ---------------------------------------------------------------
export const knnPredict = (examples, vec, metric) => {
    // examples: [{label, vec}]  → {label: probability}
    if (!examples.length) return {};
    let mean = null;
    let sd = null;
    if (metric === 'euclid') {
        // z-score every feature with the training statistics
        const d = vec.length;
        mean = new Float32Array(d);
        sd = new Float32Array(d);
        for (const e of examples) for (let i = 0; i < d; i++) mean[i] += e.vec[i];
        for (let i = 0; i < d; i++) mean[i] /= examples.length;
        for (const e of examples) for (let i = 0; i < d; i++) sd[i] += (e.vec[i] - mean[i]) ** 2;
        for (let i = 0; i < d; i++) sd[i] = Math.sqrt(sd[i] / examples.length) || 1;
    }
    const dist = e => {
        if (metric === 'cosine') {
            let dot = 0;
            for (let i = 0; i < vec.length; i++) dot += vec[i] * e.vec[i];
            return 1 - dot;
        }
        let s = 0;
        for (let i = 0; i < vec.length; i++) s += (((vec[i] - mean[i]) - (e.vec[i] - mean[i])) / sd[i]) ** 2;
        return Math.sqrt(s / vec.length);
    };
    const scored = examples.map(e => ({label: e.label, d: dist(e)})).sort((a, b) => a.d - b.d);
    const k = Math.min(scored.length, Math.max(3, Math.min(9, Math.round(Math.sqrt(scored.length)))));
    const votes = {};
    let total = 0;
    for (const s of scored.slice(0, k)) {
        const w = 1 / (s.d + 1e-3);
        votes[s.label] = (votes[s.label] || 0) + w;
        total += w;
    }
    for (const key of Object.keys(votes)) votes[key] /= total;
    return votes;
};

// ---- (de)serialisation of example vectors ----------------------------------------
const f32ToB64 = vecs => {
    if (!vecs.length) return '';
    const all = new Float32Array(vecs.length * vecs[0].length);
    vecs.forEach((v, i) => all.set(v, i * v.length));
    const bytes = new Uint8Array(all.buffer);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
};
const b64ToF32 = (b64, dim) => {
    if (!b64 || !dim) return [];
    const raw = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const all = new Float32Array(bytes.buffer);
    const out = [];
    for (let i = 0; i + dim <= all.length; i += dim) out.push(all.slice(i, i + dim));
    return out;
};

export const SOURCE_NAMES = {camera: '카메라', sound: '소리', sensor: '로봇 센서'};

export class AIEngine {
    constructor ({device, log}) {
        this.device = device;
        this.log = log || (() => {});
        this.listeners = new Set();
        this.reset();
    }

    reset (sourceKind = 'camera') {
        this.stop();
        this.sourceKind = sourceKind;
        this.classes = [{name: '종류 1', examples: []}, {name: '종류 2', examples: []}];
        this.collecting = -1;
        this._clearResult();
        this._emit();
    }

    _clearResult () {
        this.probs = {};
        this.active = '';
        this.best = '';
        this._history = [];
    }

    // ---- listeners -------------------------------------------------------
    onUpdate (fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    _emit () {
        for (const fn of this.listeners) {
            try {
                fn(this);
            } catch (e) { /* a listener must not stop recognition */ }
        }
    }

    // ---- classes ----------------------------------------------------------
    get names () {
        return this.classes.map(c => c.name);
    }

    get trainedCount () {
        return this.classes.filter(c => c.examples.length).length;
    }

    get ready () {
        return this.trainedCount >= 2;
    }

    get exampleCount () {
        return this.classes.reduce((n, c) => n + c.examples.length, 0);
    }

    addClass () {
        let n = this.classes.length + 1;
        while (this.names.includes(`종류 ${n}`)) n++;
        this.classes.push({name: `종류 ${n}`, examples: []});
        this._emit();
    }

    renameClass (i, name) {
        const clean = String(name).trim().slice(0, 20);
        if (!clean || this.classes.some((c, j) => j !== i && c.name === clean)) return false;
        this.classes[i].name = clean;
        this._clearResult();
        this._emit();
        return true;
    }

    removeClass (i) {
        if (this.classes.length <= 2) return;
        this.classes.splice(i, 1);
        this._clearResult();
        this._emit();
    }

    clearClass (i) {
        this.classes[i].examples = [];
        this._clearResult();
        this._emit();
    }

    async setSource (kind) {
        if (kind === this.sourceKind) return;
        const was = this.running;
        this.stop();
        this.sourceKind = kind;
        for (const c of this.classes) c.examples = [];
        this._clearResult();
        this._emit();
        if (was) await this.start();
    }

    // ---- collecting ---------------------------------------------------------
    startCollecting (i) {
        this.collecting = i;
        this._lastAdd = 0;
        this._emit();
        if (!this.running) this.start().catch(e => this.log(`⚠ ${e.message}`, 'err'));
    }

    stopCollecting () {
        if (this.collecting < 0) return;
        this.collecting = -1;
        this._emit();
    }

    // ---- running ------------------------------------------------------------
    async start () {
        if (this.running || this._starting) return this._starting;
        this._starting = (async () => {
            const src = makeSource(this.sourceKind, this.device);
            this.source = src;
            this.error = '';
            this._emit();
            try {
                await src.start();
            } catch (e) {
                this.source = null;
                this.error = e.message || String(e);
                this._emit();
                throw e;
            }
            this.running = true;
            this._emit();
            this._loop(src);
        })();
        try {
            await this._starting;
        } finally {
            this._starting = null;
        }
        return undefined;
    }

    stop () {
        this.running = false;
        this.collecting = -1;
        if (this.source) this.source.stop();
        this.source = null;
        this._clearResult();
    }

    async _loop (src) {
        while (this.running && this.source === src) {
            const t0 = Date.now();
            let vec = null;
            try {
                vec = await src.features();
            } catch (e) {
                this.error = e.message || String(e);
            }
            if (vec && this.running) this._step(vec);
            const wait = src.interval - (Date.now() - t0);
            await new Promise(r => setTimeout(r, Math.max(10, wait)));
        }
    }

    _step (vec) {
        this.lastVec = vec;
        const c = this.classes[this.collecting];
        if (c && Date.now() - this._lastAdd >= 150) {
            if (c.examples.length < MAX_EXAMPLES) c.examples.push(vec);
            this._lastAdd = Date.now();
        }
        if (this.ready) {
            const examples = [];
            for (const k of this.classes) for (const v of k.examples) examples.push({label: k.name, vec: v});
            const probs = knnPredict(examples, vec, this.source.metric);
            for (const name of this.names) probs[name] = probs[name] || 0;
            this.probs = probs;
            const best = Object.keys(probs).reduce((a, b) => (probs[b] > probs[a] ? b : a), this.names[0]);
            // need the same answer twice in a row (no flicker) and enough certainty
            this._history.push(probs[best] >= THRESHOLD ? best : '');
            if (this._history.length > 2) this._history.shift();
            this.best = best;
            this.active = this._history.every(h => h === this._history[0]) ? this._history[0] : this.active;
        } else {
            this._clearResult();
        }
        this._emit();
    }

    confidence (name) {
        return Math.round((this.probs[name] || 0) * 100);
    }

    // ---- saving with the project ----------------------------------------------
    serialize () {
        if (!this.exampleCount) return null;
        const dim = (this.classes.find(c => c.examples.length) || {examples: [[]]}).examples[0].length;
        return {
            version: 1,
            source: this.sourceKind,
            dim,
            classes: this.classes.map(c => ({name: c.name, examples: f32ToB64(c.examples)}))
        };
    }

    load (data) {
        this.stop();
        if (!data || !Array.isArray(data.classes)) {
            this.reset(this.sourceKind);
            return;
        }
        this.sourceKind = data.source || 'camera';
        this.classes = data.classes.map(c => ({name: String(c.name), examples: b64ToF32(c.examples, data.dim)}));
        while (this.classes.length < 2) this.classes.push({name: `종류 ${this.classes.length + 1}`, examples: []});
        this.collecting = -1;
        this._clearResult();
        this._emit();
    }
}
