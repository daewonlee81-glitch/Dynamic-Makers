/**
 * 걸음 학습 — the simulator tries many versions of the 7 gait numbers and keeps
 * improving them (cross-entropy method: try a crowd, keep the best few, try
 * again around them). Students decide what "good" means with the reward
 * weights, which is the heart of reinforcement learning.
 */
import {GAIT_PARAMS} from './gait';

export const REWARDS = [
    {key: 'forward', name: '앞으로 간 거리 (m당)', def: 100},
    {key: 'side', name: '옆으로 벗어남 (m당 감점)', def: 30},
    {key: 'alive', name: '넘어지지 않고 버틴 시간 (초당)', def: 10},
    {key: 'fall', name: '넘어짐 (감점)', def: 30},
    {key: 'energy', name: '힘을 많이 씀 (감점)', def: 0}
];

export const defaultRewards = () => Object.fromEntries(REWARDS.map(r => [r.key, r.def]));

export const score = (r, w) => (w.forward * r.dx * (r.alive / r.secs)) - (w.side * Math.abs(r.dy)) +
    (w.alive * r.alive) - (r.fell ? w.fall : 0) - (w.energy * r.energy * 0.01);

// standard normal (Box-Muller) with a seedable generator so classes can compare runs
const rng = seed => {
    let s = seed >>> 0;
    const u = () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());
};

export class GaitLearner {
    /**
     * @param {object} o
     * @param {object} o.sim PhysicsSim
     * @param {object} o.ranges {key: {min, max, fixed, value}}
     * @param {object} o.weights reward weights
     * @param {number} [o.population]
     * @param {number} [o.generations]
     * @param {number} [o.seconds] length of each try
     * @param {number} [o.seed]
     * @param {function} [o.evalBatch] async (gaits, seconds) → results (or null to stop): 동시 경주 —
     *     a whole generation walks together instead of one try after another
     */
    constructor ({sim, ranges, weights, population = 20, generations = 30, seconds = 5, seed = 1, evalBatch = null}) {
        Object.assign(this, {sim, ranges, weights, population, generations, seconds, evalBatch});
        this.normal = rng(seed);
        this.keys = GAIT_PARAMS.map(p => p.key);
        this.free = this.keys.filter(k => !ranges[k].fixed);
        this.mu = {};
        this.sd = {};
        for (const k of this.keys) {
            const r = ranges[k];
            this.mu[k] = r.fixed ? r.value : (r.value !== undefined ? r.value : (r.min + r.max) / 2);
            this.sd[k] = (r.max - r.min) / 3;
        }
        this.history = []; // {gen, best, mean}
        this.best = null; // {gait, score, result}
        this.gen = 0;
        this.tries = 0;
        this.running = false;
    }

    _sample () {
        const g = {};
        for (const k of this.keys) {
            const r = this.ranges[k];
            g[k] = r.fixed ? r.value : Math.min(r.max, Math.max(r.min, this.mu[k] + (this.sd[k] * this.normal())));
        }
        return g;
    }

    /** Run until done or stop(); `onProgress` after every try. */
    async run (onProgress) {
        this.running = true;
        const elite = Math.max(2, Math.round(this.population / 4));
        while (this.running && this.gen < this.generations) {
            const crowd = [];
            if (this.evalBatch) {
                const gaits = Array.from({length: this.population}, () => this._sample());
                this.genGaits = gaits;
                const results = await this.evalBatch(gaits, this.seconds, this);
                if (!results) break;
                gaits.forEach((gait, i) => {
                    const result = results[i];
                    const s = score(result, this.weights);
                    crowd.push({gait, score: s, result, lane: i});
                    this.tries++;
                    if (!this.best || s > this.best.score) this.best = {gait, score: s, result};
                });
                if (onProgress) onProgress(this);
            }
            for (let i = 0; !this.evalBatch && i < this.population && this.running; i++) {
                const gait = this._sample();
                const result = this.sim.evaluate(gait, this.seconds);
                const s = score(result, this.weights);
                crowd.push({gait, score: s, result});
                this.tries++;
                if (!this.best || s > this.best.score) this.best = {gait, score: s, result};
                if (onProgress) onProgress(this);
                await new Promise(r => setTimeout(r, 0)); // keep the page responsive
            }
            if (!this.running || crowd.length < elite) break;
            crowd.sort((a, b) => b.score - a.score);
            const top = crowd.slice(0, elite);
            for (const k of this.free) {
                const r = this.ranges[k];
                const vals = top.map(c => c.gait[k]);
                const m = vals.reduce((a, b) => a + b, 0) / vals.length;
                const sd = Math.sqrt(vals.reduce((a, b) => a + ((b - m) ** 2), 0) / vals.length);
                this.mu[k] = m;
                this.sd[k] = Math.max(sd, 0.04 * (r.max - r.min)); // never stop exploring entirely
            }
            this.genBest = top[0]; // shown on the 3D robot while learning
            this.genCrowd = crowd;
            this.history.push({gen: this.gen, best: top[0].score,
                mean: crowd.reduce((a, c) => a + c.score, 0) / crowd.length, bestEver: this.best.score});
            this.gen++;
            if (onProgress) onProgress(this);
        }
        this.running = false;
        if (onProgress) onProgress(this);
        return this.best;
    }

    stop () {
        this.running = false;
    }
}
