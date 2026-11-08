/**
 * 3D 탭 — MuJoCo 3D 가상 로봇 (1단계), 걸음 학습 (2단계), 강화학습 정책 (3단계).
 */
import {MAXE1_DEFAULT, MAXE1_JOINT_MAP, buildMJCF} from './maxe1-model';
import {GAIT_PARAMS, defaultGait, gaitTargets} from './gait';
import {GaitLearner, REWARDS, defaultRewards, score} from './learn';
import {checkPolicy} from './policy';

const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
};
const button = (cls, text, onClick, title) => {
    const b = el('button', cls, text);
    b.type = 'button';
    if (title) b.title = title;
    b.addEventListener('click', onClick);
    return b;
};
const numInput = (value, step, onChange, w = 62) => {
    const i = el('input', 'tp-secs');
    i.type = 'number';
    i.step = String(step);
    i.value = String(value);
    i.style.width = `${w}px`;
    i.addEventListener('change', () => onChange(Number(i.value)));
    return i;
};

const STORE_KEY = 'dm.maxe1';
const load = () => {
    try {
        return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    } catch (e) {
        return {};
    }
};
const save = v => {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify(v));
    } catch (e) { /* storage unavailable */ }
};

let simScript = null;
const loadSimBundle = () => {
    if (!simScript) {
        simScript = new Promise((resolve, reject) => {
            if (window.DMSIM) return resolve(window.DMSIM);
            const s = document.createElement('script');
            s.src = 'dm-sim.js';
            s.onload = () => (window.DMSIM ? resolve(window.DMSIM) : reject(new Error('3D 시뮬레이터를 불러오지 못했습니다.')));
            s.onerror = () => reject(new Error('3D 시뮬레이터(dm-sim.js)를 불러오지 못했습니다.'));
            document.head.append(s);
        }).catch(e => {
            simScript = null;
            throw e;
        });
    }
    return simScript;
};

const DIMS = [
    ['thigh', '허벅지 길이 (m)', 0.005], ['shin', '정강이 길이 (m)', 0.005], ['ankleHeight', '발목 높이 (m)', 0.005],
    ['legSpacing', '두 다리 간격 (m)', 0.005], ['footLength', '발 길이 (m)', 0.005], ['footWidth', '발 폭 (m)', 0.005],
    ['torsoMass', '몸통 무게 (kg)', 0.01], ['shinMass', '정강이 무게 (kg)', 0.01], ['kp', '모터 단단함 (kp)', 0.5]
];

export class SimPanel {
    /**
     * @param {object} o
     * @param {HTMLElement} o.host
     * @param {Function} o.log
     * @param {Function} o.connect (transport) -> Promise, connect the app to the 3D robot
     * @param {Function} o.disconnect
     * @param {Function} o.makeTransport (physics) -> SimTransport
     * @param {object} o.device CM550Device
     * @param {object} o.walker Walker
     * @param {object} o.store {gait, policy} saved with the project; o.onStoreChange()
     */
    constructor (o) {
        Object.assign(this, o);
        const saved = load();
        this.params = Object.assign({}, MAXE1_DEFAULT, saved.params || {});
        this.jointMap = (saved.joints && saved.joints.length === MAXE1_JOINT_MAP.length ? saved.joints : MAXE1_JOINT_MAP)
            .map(j => Object.assign({}, j));
        this.weights = Object.assign(defaultRewards(), saved.weights || {});
        this.ranges = Object.fromEntries(GAIT_PARAMS.map(p => [p.key,
            Object.assign({min: p.min, max: p.max, fixed: false}, (saved.ranges || {})[p.key] || {})]));
        this.search = Object.assign({population: 20, generations: 30, seconds: 5}, saved.search || {});
        this.visible = false;
        this._build();
        this.walker.onUpdate(() => this._status());
    }

    _persist () {
        save({params: this.params, joints: this.jointMap, weights: this.weights, ranges: this.ranges, search: this.search});
    }

    get gait () {
        return this.store.gait || defaultGait();
    }

    _build () {
        this.host.classList.add('mon', 'simp');
        const header = el('header', 'mon-header');
        header.append(el('span', 'mon-title', '3D 시뮬레이터'), (this.stateEl = el('span', 'mon-state', 'MuJoCo')));
        this.host.append(header);
        const body = el('div', 'mon-body');
        this.host.append(body);

        // ---- 1. 3D robot -------------------------------------------------------------
        const c1 = el('section', 'mon-card');
        c1.append(el('h3', '', '1. 3D 가상 로봇 (MAX-E1)'));
        c1.append(el('p', 'mon-note', '진짜 물리(무게·중력·마찰)가 적용되는 가상 로봇입니다. 연결하면 모든 블록·가르치기·AI가 ' +
            '이 로봇으로 동작합니다. 실제 로봇에 보내기 전에 넘어지는지 먼저 확인해 보세요. 끌어서 돌려 보기, 휠로 확대.'));
        this.viewHost = el('div', 'sim-view');
        this.viewMsg = el('div', 'ai-preview-msg', '[3D 가상 로봇 연결]을 누르면 여기에 나타납니다');
        this.viewHost.append(this.viewMsg);
        c1.append(this.viewHost);
        this.infoEl = el('div', 'sim-info', '');
        c1.append(this.infoEl);
        const r1 = el('div', 'tp-row');
        this.connBtn = button('tp-btn tp-primary', '3D 가상 로봇 연결', () => this.toggleConnect());
        this.resetBtn = button('tp-btn', '처음 자세로', () => this.resetWorld(), '로봇을 다시 세웁니다');
        this.pushBtn = button('tp-btn', '옆에서 밀기', () => this.physics && this.physics.push(3), '균형을 시험합니다');
        this.pauseBtn = button('tp-btn', '일시정지', () => this.togglePause());
        this.partsBtn = button('tp-btn', '단순 도형으로 보기', () => this.toggleParts(),
            '실제 부품 모양(ROBOTIS STEP 도면)과 물리 계산용 단순 도형을 바꿔 봅니다');
        r1.append(this.connBtn, this.resetBtn, this.pushBtn, this.pauseBtn, this.partsBtn);
        c1.append(r1);
        body.append(c1);

        // ---- 2. 걸음 학습 ------------------------------------------------------------
        const c2 = el('section', 'mon-card');
        c2.append(el('h3', '', '2. 걸음 학습 (시뮬레이터 속에서 스스로 찾기)'));
        c2.append(el('p', 'mon-note', '걸음은 숫자 7개로 정해집니다. [학습 시작]을 누르면 시뮬레이터가 수백 가지 걸음을 시험하고, ' +
            '점수가 높은 걸음 근처를 다시 시험하며 점점 좋아집니다. 점수를 어떻게 줄지(보상)는 여러분이 정합니다.'));
        const tbl = el('table', 'sim-table');
        tbl.innerHTML = '<thead><tr><th>걸음 숫자</th><th>최소</th><th>최대</th><th>지금</th><th>고정</th></tr></thead>';
        const tb = el('tbody');
        this.gaitCells = {};
        for (const p of GAIT_PARAMS) {
            const r = this.ranges[p.key];
            const tr = el('tr');
            tr.append(el('td', '', p.name));
            const mk = (field, step) => {
                const td = el('td');
                td.append(numInput(r[field], step, v => { r[field] = v; this._persist(); }, 58));
                return td;
            };
            tr.append(mk('min', p.step), mk('max', p.step));
            const cur = el('td', 'sim-num', '');
            this.gaitCells[p.key] = cur;
            tr.append(cur);
            const fx = el('td');
            const box = el('input');
            box.type = 'checkbox';
            box.checked = Boolean(r.fixed);
            box.title = '체크하면 이 숫자는 지금 값 그대로 두고 나머지만 학습합니다';
            box.addEventListener('change', () => { r.fixed = box.checked; this._persist(); });
            fx.append(box);
            tr.append(fx);
            tb.append(tr);
        }
        tbl.append(tb);
        c2.append(tbl);

        c2.append(el('h4', 'sim-sub', '점수 주는 방법 (보상)'));
        const rw = el('div', 'sim-rewards');
        for (const r of REWARDS) {
            const row = el('label', 'sim-rw');
            row.append(el('span', '', r.name), numInput(this.weights[r.key], 1, v => { this.weights[r.key] = v; this._persist(); }, 56));
            rw.append(row);
        }
        c2.append(rw);
        const sr = el('div', 'tp-row');
        sr.append(el('span', 'tp-label', '한 번에'),
            numInput(this.search.population, 1, v => { this.search.population = Math.max(4, Math.round(v)); this._persist(); }, 50),
            el('span', 'tp-label', '가지 ×'),
            numInput(this.search.generations, 1, v => { this.search.generations = Math.max(1, Math.round(v)); this._persist(); }, 50),
            el('span', 'tp-label', '세대, 각'),
            numInput(this.search.seconds, 0.5, v => { this.search.seconds = Math.max(1, v); this._persist(); }, 50),
            el('span', 'tp-label', '초'));
        c2.append(sr);
        const r2 = el('div', 'tp-row');
        this.learnBtn = button('tp-btn tp-primary', '▶ 학습 시작', () => this.toggleLearn());
        this.previewBtn = button('tp-btn', '이 걸음으로 걷기 (3D)', () => this.walkHere(false), '지금 걸음을 3D 로봇으로 걸어 봅니다');
        this.blockBtn = button('tp-btn', '블록 만들기 (모터별)', () => this.makeBlocks(true),
            '학습한 걸음을 모터마다 목표 각도가 보이는 블록 프로그램으로 넣습니다 (Python 탭에도 같은 코드)');
        this.blockOneBtn = button('tp-btn', '한 줄 블록', () => this.makeBlocks(false), '"학습한 걸음으로 걷기" 블록 하나를 넣습니다');
        r2.append(this.learnBtn, this.previewBtn, this.blockBtn, this.blockOneBtn);
        c2.append(r2);
        const wr = el('label', 'tp-row sim-watch');
        this.watchBox = el('input');
        this.watchBox.type = 'checkbox';
        this.watchBox.checked = this.search.watch !== false;
        this.watchBox.addEventListener('change', () => { this.search.watch = this.watchBox.checked; this._persist(); });
        wr.append(this.watchBox, el('span', 'tp-label',
            '학습하는 모습 보기 — 세대마다 가장 잘한 걸음을 3D 로봇이 걸어 보입니다 (학습이 조금 느려집니다)'));
        c2.append(wr);
        this.learnView = el('div', 'sim-view sim-learn-view');
        this.learnTag = el('div', 'sim-tag', '');
        this.learnView.append(this.learnTag);
        this.learnView.hidden = true;
        c2.append(this.learnView);
        this.chart = el('canvas', 'sim-chart');
        this.chart.width = 460;
        this.chart.height = 120;
        this.learnInfo = el('div', 'sim-info', '아직 학습하지 않았습니다. 지금 걸음은 기본 걸음입니다.');
        c2.append(this.chart, this.learnInfo);
        body.append(c2);

        // ---- 3. 강화학습 정책 ---------------------------------------------------------
        const c3 = el('section', 'mon-card');
        c3.append(el('h3', '', '3. 강화학습 정책 (고급)'));
        c3.append(el('p', 'mon-note', 'PC의 Python에서 같은 MAX-E1 모델로 신경망을 학습시킨 뒤(저장소의 sim 폴더, ' +
            'python train_es.py), 만들어진 정책 파일(.json)을 여기서 불러옵니다. 신경망은 CM-550의 기울기 센서를 보고 ' +
            '걸음을 고쳐 가며 넘어지지 않게 합니다.'));
        this.policyInfo = el('div', 'sim-info', '');
        c3.append(this.policyInfo);
        const r3 = el('div', 'tp-row');
        const file = el('input');
        file.type = 'file';
        file.accept = '.json,application/json';
        file.hidden = true;
        file.addEventListener('change', () => this.loadPolicy(file.files[0]).finally(() => { file.value = ''; }));
        this.policyOpen = button('tp-btn', '정책 파일 열기', () => file.click());
        this.policyWalk = button('tp-btn tp-primary', '정책으로 걷기 (3D)', () => this.walkHere(true));
        this.policyClear = button('tp-btn', '정책 지우기', () => { this.store.policy = null; this.onStoreChange(); this._status(); });
        this.modelBtn = button('tp-btn', '모델 파일 받기 (maxe1.xml)', () => this.downloadModel(),
            '지금 설정(치수·ID)으로 만든 MuJoCo 모델 — Python 키트의 sim/maxe1.xml을 이것으로 바꾸세요');
        r3.append(file, this.policyOpen, this.policyWalk, this.policyClear, this.modelBtn);
        c3.append(r3);
        body.append(c3);

        // ---- 4. 로봇 설정 --------------------------------------------------------------
        const c4 = el('details', 'mon-card sim-settings');
        c4.append(el('summary', '', '로봇 설정 — 관절 ID·방향·치수 (실제 로봇에 맞추기)'));
        c4.append(el('p', 'mon-note', '⚠ 아래 값은 추정값입니다. 조립서의 ID 배치 그림과 실제 로봇을 보고 맞춰 주세요. ' +
            '"방향"은 모터 각도가 커질 때 관절이 움직이는 쪽, "가운데"는 관절이 똑바를 때의 모터 각도입니다.'));
        const jt = el('table', 'sim-table');
        jt.innerHTML = '<thead><tr><th>ID</th><th>관절</th><th>방향</th><th>가운데 (°)</th></tr></thead>';
        const jb = el('tbody');
        for (const j of this.jointMap) {
            const tr = el('tr');
            const idTd = el('td');
            idTd.append(numInput(j.id, 1, v => { j.id = Math.round(v); this._persist(); }, 46));
            tr.append(idTd, el('td', '', j.name));
            const sTd = el('td');
            const sel = el('select', 'tp-secs');
            sel.innerHTML = '<option value="1">+</option><option value="-1">−</option>';
            sel.value = String(j.sign);
            sel.addEventListener('change', () => { j.sign = Number(sel.value); this._persist(); });
            sTd.append(sel);
            const cTd = el('td');
            cTd.append(numInput(j.center, 0.5, v => { j.center = v; this._persist(); }, 58));
            tr.append(sTd, cTd);
            jb.append(tr);
        }
        jt.append(jb);
        c4.append(jt);
        const dims = el('div', 'sim-rewards');
        for (const [k, name, step] of DIMS) {
            const row = el('label', 'sim-rw');
            row.append(el('span', '', name), numInput(this.params[k], step, v => { this.params[k] = v; this._persist(); }, 64));
            dims.append(row);
        }
        c4.append(dims);
        const r4 = el('div', 'tp-row');
        r4.append(button('tp-btn tp-primary', '설정 적용 (로봇 다시 만들기)', () => this.applySettings()),
            button('tp-btn', '기본값으로', () => {
                save({});
                this.log('로봇 설정을 기본값으로 되돌렸습니다. 탭을 다시 열면 적용됩니다(새로고침).');
            }));
        c4.append(r4);
        body.append(c4);
        this._status();
    }

    toggleParts () {
        if (!this.view) return;
        this.view.setShowParts(!this.view.showParts);
        this._status();
    }

    setVisible (v) {
        this.visible = v;
        if (v) this._status();
    }

    async _ensureSim () {
        if (this.physics) return this.physics;
        this.stateEl.textContent = '물리 엔진(MuJoCo)을 준비하는 중…';
        const {loadMujoco, PhysicsSim, SimView} = await loadSimBundle();
        const mj = await loadMujoco();
        this.physics = new PhysicsSim(mj, {params: this.params, jointMap: this.jointMap});
        this.viewMsg.remove();
        this.view = new SimView(this.viewHost, this.physics);
        this.physics.onUpdate(() => {
            if (this.visible) this.view.render();
            this._tickInfo();
        });
        this.physics.start();
        return this.physics;
    }

    get connected () {
        return Boolean(this.device.connected && this.device.transport && this.device.transport.physics === this.physics &&
            this.physics);
    }

    async toggleConnect () {
        try {
            if (this.connected) {
                this.walker.stop();
                await this.disconnect();
            } else {
                const sim = await this._ensureSim();
                if (this.device.connected) await this.disconnect();
                await this.connect(this.makeTransport(sim));
            }
        } catch (e) {
            this.log(`⚠ 3D 시뮬레이터: ${e.message || e}`, 'err');
        }
        this._status();
    }

    resetWorld () {
        if (!this.physics) return;
        this.walker.stop();
        this.physics.reset();
        this.log('3D 로봇을 처음 자세로 세웠습니다.');
    }

    togglePause () {
        if (!this.physics) return;
        this.physics.paused = !this.physics.paused;
        this._status();
    }

    async applySettings () {
        this._persist();
        if (!this.physics) {
            this.log('설정을 저장했습니다. 3D 가상 로봇을 연결하면 적용됩니다.');
            return;
        }
        const was = this.connected;
        if (was) await this.disconnect();
        this.physics.params = this.params;
        this.physics.setJointMap(this.jointMap);
        if (was) await this.connect(this.makeTransport(this.physics));
        this.log('새 설정으로 3D 로봇을 다시 만들었습니다.', 'ok');
    }

    // ---- 2단계 ------------------------------------------------------------------------
    async toggleLearn () {
        if (this.learner && this.learner.running) {
            this.learner.stop();
            return;
        }
        try {
            const sim = await this._ensureSim();
            for (const p of GAIT_PARAMS) {
                const r = this.ranges[p.key];
                r.value = this.gait[p.key];
                if (r.min > r.max) [r.min, r.max] = [r.max, r.min];
            }
            this.learner = new GaitLearner({sim, ranges: this.ranges, weights: this.weights,
                population: this.search.population, generations: this.search.generations, seconds: this.search.seconds,
                seed: Date.now() % 100000});
            this.log(`걸음 학습을 시작합니다: ${this.search.population}가지 × ${this.search.generations}세대.`);
            this._status();
            const before = score(sim.evaluate(this.gait, this.search.seconds), this.weights); // the gait we have now
            const watch = this.watchBox.checked && !this.walker.running;
            if (watch) this._watchStart(this.gait, `시작 걸음 · 점수 ${before.toFixed(1)}`);
            let shown = 0;
            let best;
            try {
                best = await this.learner.run(L => {
                    this._learnProgress();
                    if (watch && L.history.length > shown && L.genBest) {
                        shown = L.history.length;
                        this._watchShow(L.genBest.gait, `${shown}세대에서 가장 잘한 걸음 · 점수 ${L.genBest.score.toFixed(1)}`);
                    }
                });
            } finally {
                if (watch) this._watchStop();
            }
            if (best) {
                const r = best.result;
                const msg = `걸음 학습 끝: ${this.learner.tries}번 시험, 최고 점수 ${best.score.toFixed(1)} — ` +
                    `${r.secs}초에 ${(r.dx * 100).toFixed(0)} cm ${r.fell ? '(넘어짐)' : '(넘어지지 않음)'}.`;
                if (best.score > before) {
                    this.store.gait = best.gait;
                    this.onStoreChange();
                    this.log(`${msg} 새 걸음으로 바꿨습니다. [이 걸음으로 걷기]로 확인하세요.`, 'ok');
                } else {
                    this.log(`${msg} 지금 걸음(점수 ${before.toFixed(1)})이 더 좋아서 그대로 둡니다. ` +
                        '세대 수를 늘리거나 범위를 바꿔 다시 해 보세요.', 'warn');
                }
            }
        } catch (e) {
            this.log(`⚠ 걸음 학습: ${e.message || e}`, 'err');
        }
        this._status();
    }

    // ---- 학습하는 모습 보기: the visible robot walks each generation's best gait -------------
    _watchStart (gait, label) {
        this.learnView.hidden = false;
        if (this.view) this.view.attach(this.learnView);
        this._watching = true;
        this._watchShow(gait, label);
        this._watchLoop();
    }

    /** Queue the next gait to show; it starts when the current walk ends. */
    _watchShow (gait, label) {
        this._watchNext = {gait, label};
    }

    _watchLoop () {
        const ph = this.physics;
        if (!this._watching || !ph) return;
        if (this._watchNext) {
            this._watchCur = this._watchNext;
            this._watchNext = null;
        }
        const {gait, label} = this._watchCur;
        ph.reset();
        this.learnTag.textContent = label;
        const secs = this.search.seconds;
        const t0 = ph.data.time;
        let end = null;
        ph.setController(time => {
            const t = time - t0;
            if (!this._watching) {
                ph.setController(null);
                return;
            }
            if (end === null && (t > secs || ph.fallen)) {
                end = t;
                const x = ph.torso.x;
                this.learnTag.textContent = `${label} → ${(x * 100).toFixed(0)} cm${ph.fallen ? ', 넘어짐' : ''}`;
                const stand = gaitTargets(gait, 0, 0);
                for (const j in stand) ph.setGoalRad(j, stand[j]);
            }
            if (end !== null) {
                if (t > end + 1) { // a short pause, then the next (or the same) gait
                    ph.setController(null);
                    setTimeout(() => this._watchLoop(), 0);
                }
                return;
            }
            const k = Math.min(1, t / 0.6, Math.max(0, (secs - t) / 0.6));
            const tg = gaitTargets(gait, t, k);
            for (const j in tg) ph.setGoalRad(j, tg[j]);
        });
    }

    _watchStop () {
        this._watching = false;
        this._watchNext = null;
        if (this.physics) {
            this.physics.setController(null);
            this.physics.reset();
        }
        if (this.view) this.view.attach(this.viewHost);
        this.learnView.hidden = true;
    }

    _learnProgress () {
        const L = this.learner;
        const now = Date.now();
        if (this._lastDraw && now - this._lastDraw < 120 && L.running) return;
        this._lastDraw = now;
        const b = L.best;
        if (b) {
            this.learnInfo.textContent = `${L.gen + (L.running ? 1 : 0)}/${L.generations}세대 · ${L.tries}번 시험 · 최고 점수 ` +
                `${b.score.toFixed(1)} (${b.result.secs}초에 ${(b.result.dx * 100).toFixed(0)} cm, ` +
                `${b.result.fell ? `${b.result.alive.toFixed(1)}초에 넘어짐` : '넘어지지 않음'})`;
            for (const p of GAIT_PARAMS) this.gaitCells[p.key].textContent = b.gait[p.key].toFixed(2);
        }
        this._drawChart();
    }

    _drawChart () {
        const h = (this.learner && this.learner.history) || [];
        const c = this.chart.getContext('2d');
        const W = this.chart.width;
        const H = this.chart.height;
        c.clearRect(0, 0, W, H);
        c.fillStyle = '#f7f9fc';
        c.fillRect(0, 0, W, H);
        c.fillStyle = '#6b7689';
        c.font = '11px sans-serif';
        if (!h.length) {
            c.fillText('세대마다 점수가 여기에 그려집니다', 10, H / 2);
            return;
        }
        const vals = h.flatMap(x => [x.bestEver, x.mean]);
        const lo = Math.min(...vals);
        const hi = Math.max(...vals);
        const X = i => 30 + ((W - 40) * i / Math.max(1, h.length - 1));
        const Y = v => H - 16 - ((H - 28) * (v - lo) / Math.max(1e-6, hi - lo));
        const line = (key, color) => {
            c.strokeStyle = color;
            c.lineWidth = 2;
            c.beginPath();
            h.forEach((x, i) => (i ? c.lineTo(X(i), Y(x[key])) : c.moveTo(X(i), Y(x[key]))));
            c.stroke();
        };
        line('mean', '#b9c3d3');
        line('bestEver', '#2E6ABF');
        c.fillStyle = '#2E6ABF';
        c.fillText(`최고 ${hi.toFixed(0)}`, 4, 12);
        c.fillStyle = '#8a94a6';
        c.fillText('— 최고 점수   — 평균', W - 130, 12);
        c.fillText(`${h.length}세대`, W - 40, H - 3);
    }

    async walkHere (withPolicy) {
        try {
            if (withPolicy && !this.store.policy) throw new Error('먼저 정책 파일을 여세요.');
            if (!this.connected) {
                const sim = await this._ensureSim();
                if (this.device.connected) await this.disconnect();
                await this.connect(this.makeTransport(sim));
            }
            this.physics.reset();
            this.log(withPolicy ? '정책으로 8초 동안 걷습니다.' : '지금 걸음으로 8초 동안 걷습니다.');
            const start = this.physics.torso;
            await this.walker.walk(withPolicy ? this.store.policy.gait : this.gait, 8, {policy: withPolicy ? this.store.policy : null});
            const t = this.physics.torso;
            this.log(`3D 로봇: ${((t.x - start.x) * 100).toFixed(0)} cm 앞으로, ${this.physics.fallen ? '넘어졌습니다' : '서 있습니다'}.`,
                this.physics.fallen ? 'warn' : 'ok');
        } catch (e) {
            this.log(`⚠ ${e.message || e}`, 'err');
        }
    }

    makeBlocks (detailed) {
        if (this.addWalkScript) this.addWalkScript(detailed);
    }

    // ---- 3단계 ------------------------------------------------------------------------
    async loadPolicy (file) {
        if (!file) return;
        try {
            const p = checkPolicy(JSON.parse(await file.text()));
            this.store.policy = p;
            this.onStoreChange();
            this.log(`정책을 불러왔습니다: ${p.name || file.name} (학습 점수 ${p.score !== undefined ? Number(p.score).toFixed(1) : '?'}).`, 'ok');
        } catch (e) {
            this.log(`⚠ 정책 파일: ${e.message || e}`, 'err');
        }
        this._status();
    }

    downloadModel () {
        if (this.saveText) this.saveText('maxe1.xml', buildMJCF(this.params));
    }

    // ---- status ---------------------------------------------------------------------------
    _tickInfo () {
        const now = Date.now();
        if (!this.visible || (this._lastInfo && now - this._lastInfo < 250)) return;
        this._lastInfo = now;
        const t = this.physics.torso;
        this.infoEl.textContent = `몸통 높이 ${(t.z * 100).toFixed(1)} cm · 위치 x ${(t.x * 100).toFixed(0)} cm, ` +
            `y ${(t.y * 100).toFixed(0)} cm · ${this.physics.fallen ? '⚠ 넘어졌습니다 — [처음 자세로]' : '서 있음'}` +
            `${this.physics.paused ? ' · 일시정지' : ''}`;
    }

    _status () {
        const conn = this.connected;
        this.connBtn.textContent = conn ? '연결 끊기' : '3D 가상 로봇 연결';
        this.stateEl.textContent = conn ? (this.walker.running ? '걷는 중' : '3D 가상 로봇 연결됨') :
            (this.physics ? 'MuJoCo 준비됨' : 'MuJoCo');
        const learning = this.learner && this.learner.running;
        this.learnBtn.textContent = learning ? '■ 학습 멈추기' : '▶ 학습 시작';
        this.pauseBtn.textContent = this.physics && this.physics.paused ? '계속' : '일시정지';
        for (const b of [this.resetBtn, this.pushBtn, this.pauseBtn, this.partsBtn]) b.disabled = !this.physics;
        if (this.view) this.partsBtn.textContent = this.view.showParts ? '단순 도형으로 보기' : '부품 모양으로 보기';
        this.previewBtn.disabled = learning;
        if (!learning) for (const p of GAIT_PARAMS) this.gaitCells[p.key].textContent = this.gait[p.key].toFixed(2);
        const pol = this.store.policy;
        this.policyInfo.textContent = pol ? `불러온 정책: ${pol.name || '정책'} · 신경망 ` +
            `${pol.layers.map(l => l.W.length).join('-')} · 학습 점수 ${pol.score !== undefined ? Number(pol.score).toFixed(1) : '?'}` :
            '정책이 없습니다.';
        this.policyWalk.disabled = !pol || learning;
        this.policyClear.disabled = !pol;
        this._drawChart();
    }
}
