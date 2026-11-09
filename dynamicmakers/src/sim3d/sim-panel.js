/**
 * 3D 탭 — MuJoCo 3D 가상 로봇 (1단계), 걸음 학습 (2단계), 강화학습 정책 (3단계).
 */
import {MAXE1_DEFAULT, MAXE1_JOINT_MAP, MODEL_VERSION, buildMJCF} from './maxe1-model';
import {GAIT_PARAMS, defaultGait, gaitTargets} from './gait';
import {GaitLearner, REWARDS, defaultRewards, score} from './learn';
import {checkPolicy} from './policy';
import {MotionRecorder, summarize, poseAt, toJointRad, keyPoses} from './motion-check';
import {posesProgramXML} from './gait-blocks';
import {parseMtn3, findChains, toRecording, callSeconds, fromCompact} from './mtn3';
import MAXE1_MOTIONS from './maxe1-motions.json';
import {motionNote} from './maxe1-motion-notes';
import {assetUrl} from '../asset-url';

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
            s.src = assetUrl('dm-sim.js');
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

// lengths and masses come from the STEP part assembly (maxe1-cad.json); these can still be tuned
const DIMS = [
    ['kp', '모터 단단함 (kp)', 0.5], ['maxTorque', '모터 최대 힘 (N·m)', 0.1], ['friction', '발바닥 마찰', 0.1],
    ['extraMass', '몸통에 더한 무게 (kg)', 0.01]
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
        // settings saved for an older robot model (other lengths) are not reused
        const sameModel = saved.modelVersion === MODEL_VERSION;
        this.params = Object.assign({}, MAXE1_DEFAULT, sameModel ? saved.params || {} : {});
        // (v3/v4 fixed the joint directions, so an older saved ID map is not reused either)
        this.jointMap = (sameModel && saved.joints && saved.joints.length === MAXE1_JOINT_MAP.length ? saved.joints : MAXE1_JOINT_MAP)
            .map(j => Object.assign({}, j));
        this.weights = Object.assign(defaultRewards(), saved.weights || {});
        this.ranges = Object.fromEntries(GAIT_PARAMS.map(p => [p.key,
            Object.assign({min: p.min, max: p.max, fixed: false}, (saved.ranges || {})[p.key] || {})]));
        this.search = Object.assign({population: 20, generations: 30, seconds: 5}, saved.search || {});
        if (!['race', 'watch', 'fast'].includes(this.search.mode)) this.search.mode = this.search.watch === false ? 'fast' : 'race';
        if (!this.search.speed) this.search.speed = 1;
        this.visible = false;
        this._build();
        this.walker.onUpdate(() => this._status());
    }

    _persist () {
        save({modelVersion: MODEL_VERSION, params: this.params, joints: this.jointMap, weights: this.weights,
            ranges: this.ranges, search: this.search});
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

        // ---- 예제 모션 확인 (실제 로봇) --------------------------------------------------
        const cm = el('section', 'mon-card');
        cm.append(el('h3', '', '예제 모션 확인 (실제 로봇의 공식 모션)'));
        cm.append(el('p', 'mon-note', 'CM-550에 들어 있는 모션(R+ Task의 MAX-E1 예제)을 실행하면서 관절 12개의 각도를 기록합니다. ' +
            '기록을 3D 로봇에 재생해서 앞으로 잘 걸으면 ID·방향 설정이 맞는 것입니다. 블록으로 바꿔 보거나 파일로 저장할 수도 있습니다. ' +
            '로봇을 바닥에 내려놓고 주위를 비운 뒤 실행하고, 넘어질 것 같으면 [멈추기]를 누르세요.'));
        const rm = el('div', 'tp-row');
        this.motionPage = 1;
        rm.append(el('span', 'tp-label', '모션 페이지'), numInput(this.motionPage, 1, v => { this.motionPage = Math.max(1, Math.round(v)); }, 56));
        this.recBtn = button('tp-btn tp-primary', '▶ 실행하며 기록', () => this.recordMotion());
        this.recStopBtn = button('tp-btn', '■ 멈추기', () => this.recorder && this.recorder.stop());
        this.replayBtn = button('tp-btn', '3D로 재생', () => this.replayMotion(), '기록한 각도를 지금의 ID·방향 설정으로 3D 로봇에 그대로 줍니다');
        this.recBlockBtn = button('tp-btn', '블록으로 만들기', () => this.motionBlocks());
        this.recSaveBtn = button('tp-btn', '기록 저장', () => this.saveMotion());
        const recFile = el('input', 'sim-rec-file');
        recFile.type = 'file';
        recFile.accept = '.json,application/json';
        recFile.hidden = true;
        recFile.addEventListener('change', () => {
            this.loadMotion(recFile.files[0]);
            recFile.value = '';
        });
        this.recLoadBtn = button('tp-btn', '기록 불러오기', () => recFile.click());
        rm.append(this.recBtn, this.recStopBtn, this.replayBtn, this.recBlockBtn, this.recSaveBtn, this.recLoadBtn, recFile);
        cm.append(rm);
        // R+ motion file: every official motion without the robot (3D, blocks) or on it
        const rf = el('div', 'tp-row');
        const mtnFile = el('input', 'sim-rec-file');
        mtnFile.type = 'file';
        mtnFile.accept = '.mtn3';
        mtnFile.hidden = true;
        mtnFile.addEventListener('change', () => {
            this.loadMtn3(mtnFile.files[0]);
            mtnFile.value = '';
        });
        this.mtnBtn = button('tp-btn', '다른 모션 파일(.mtn3) 열기', () => mtnFile.click(),
            'MAX-E1 공식 예제 모션은 이미 들어 있습니다. 직접 만든 R+ Motion 파일(.mtn3)을 열면 그 모션으로 바뀝니다');
        this.mtnSel = el('select', 'sim-mtn');
        this.mtnSel.title = 'MAX-E1 공식 예제 모션 (ROBOTIS 03_ENG1_MAX_E1.mtn3) — 번호는 CM-550에 저장된 모션 번호와 같습니다';
        this.mtnSel.addEventListener('change', () => this._pickMtn());
        this.mtnRepeat = 4;
        this.mtnRepeatInput = numInput(this.mtnRepeat, 1, v => { this.mtnRepeat = Math.max(1, Math.min(30, Math.round(v))); this._pickMtn(); }, 46);
        this.mtnRunBtn = button('tp-btn', '실제 로봇에서 실행', () => this.runMtnOnRobot(),
            'CM-550에 저장된 같은 번호의 모션을 실행합니다 (걷기는 페이지를 멈춤 없이 이어서)');
        rf.append(this.mtnBtn, this.mtnSel, el('span', 'tp-label', '반복'), this.mtnRepeatInput, this.mtnRunBtn, mtnFile);
        cm.append(rf);
        this.mtnNote = el('div', 'sim-mtn-note', '');
        cm.append(this.mtnNote);
        this.recInfo = el('div', 'sim-info', '아직 기록이 없습니다.');
        this.recTable = el('table', 'sim-table');
        cm.append(this.recInfo, this.recTable);
        body.append(cm);

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
        const wr = el('div', 'tp-row sim-watch');
        this.modeSel = el('select', 'sim-mode');
        for (const [v, t] of [['race', '동시 경주 — 한 세대의 로봇이 모두 함께 걷기'],
            ['watch', '세대마다 1등 걸음만 보기'], ['fast', '보지 않고 빠르게 학습']]) {
            const o = el('option', '', t);
            o.value = v;
            this.modeSel.append(o);
        }
        this.modeSel.value = this.search.mode;
        this.speedSel = el('select', 'sim-speed');
        for (const v of [1, 2, 4]) {
            const o = el('option', '', `${v}배속`);
            o.value = String(v);
            this.speedSel.append(o);
        }
        this.speedSel.value = String(this.search.speed);
        this.speedSel.title = '동시 경주를 빨리 돌립니다 (로봇이 많으면 컴퓨터 성능만큼만 빨라집니다)';
        const showSpeed = () => { this.speedSel.hidden = this.modeSel.value !== 'race'; };
        this.modeSel.addEventListener('change', () => {
            this.search.mode = this.modeSel.value;
            showSpeed();
            this._persist();
        });
        this.speedSel.addEventListener('change', () => {
            this.search.speed = Number(this.speedSel.value);
            if (this.race) this.race.speed = this.search.speed;
            this._persist();
        });
        showSpeed();
        wr.append(el('span', 'tp-label', '학습 보기'), this.modeSel, this.speedSel);
        c2.append(wr);
        c2.append(el('p', 'mon-note sim-mode-note', '동시 경주: 한 세대의 로봇들(한 번에 시험하는 가지 수만큼)이 나란히 서서 ' +
            '각자 다른 걸음으로 동시에 걷고, 그 결과로 점수를 매깁니다. 다음 세대는 잘한 로봇들의 걸음을 섞어 다시 출발합니다.'));
        this.learnView = el('div', 'sim-view sim-learn-view');
        this.learnTag = el('div', 'sim-tag', '');
        this.bigBtn = button('sim-big', '⛶ 크게', () => {
            const v = this.learnView;
            if (document.fullscreenElement) document.exitFullscreen();
            else if (v.requestFullscreen) v.requestFullscreen().catch(() => {});
        }, '학습 화면을 전체 화면으로 봅니다 (Esc로 돌아오기)');
        this.learnView.append(this.learnTag, this.bigBtn);
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
        this.loadBuiltInMotions();
        this._pickMtn();
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
        const {loadMujoco, PhysicsSim, SimView, RaceSim} = await loadSimBundle();
        this._RaceSim = RaceSim;
        this._SimView = SimView;
        const mj = await loadMujoco();
        this.physics = new PhysicsSim(mj, {params: this.params, jointMap: this.jointMap});
        this.viewMsg.remove();
        this.view = new SimView(this.viewHost, this.physics);
        this.physics.onUpdate(() => {
            if (this.visible && !this.raceView) this.view.render(); // during a race only the race is drawn
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
            if (this.race) this.race.abort();
            return;
        }
        try {
            const sim = await this._ensureSim();
            for (const p of GAIT_PARAMS) {
                const r = this.ranges[p.key];
                r.value = this.gait[p.key];
                if (r.min > r.max) [r.min, r.max] = [r.max, r.min];
            }
            const mode = this.modeSel.value;
            const racing = mode === 'race' && Boolean(this._RaceSim);
            this.learner = new GaitLearner({sim, ranges: this.ranges, weights: this.weights,
                population: this.search.population, generations: this.search.generations, seconds: this.search.seconds,
                seed: Date.now() % 100000, evalBatch: racing ? (gaits, secs, L) => this._raceGen(gaits, secs, L) : null});
            this.log(`걸음 학습을 시작합니다: ${this.search.population}가지 × ${this.search.generations}세대` +
                `${racing ? ` — 동시 경주 (로봇 ${this.search.population}대가 함께 걷습니다)` : ''}.`);
            this._status();
            const before = score(sim.evaluate(this.gait, this.search.seconds), this.weights); // the gait we have now
            const watch = mode === 'watch' && !this.walker.running;
            if (watch) this._watchStart(this.gait, `시작 걸음 · 점수 ${before.toFixed(1)}`);
            if (racing) this._raceStart(this.search.population);
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
                if (racing) this._raceStop();
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

    // ---- 동시 경주: a whole generation walks side by side in one world ---------------------
    _raceStart (n) {
        this.race = new this._RaceSim(this.physics.mj, {params: this.params, n});
        this.race.speed = this.search.speed || 1;
        this.learnView.hidden = false;
        this.learnView.classList.add('sim-race');
        this.raceView = new this._SimView(this.learnView, this.race);
        this.raceView.setShowParts(this.view ? this.view.showParts : true);
        this.learnTag.textContent = `로봇 ${n}대가 출발선에 섰습니다`;
        this.raceView.render();
    }

    async _raceGen (gaits, secs, L) {
        const race = this.race;
        if (!race) return null;
        const gen = L.gen + 1;
        let last = 0;
        const results = await race.run(gaits, secs, {onFrame: r => {
            const info = r.info();
            let lead = null;
            for (const x of info) if (!x.fell && (!lead || x.dx > lead.dx)) lead = x;
            r.ranks = info.map(x => (lead && x.lane === lead.lane ? 1 : null));
            this.raceView.render();
            const now = performance.now();
            if (now - last < 150) return;
            last = now;
            const fell = info.filter(x => x.fell).length;
            this.learnTag.textContent = `${gen}/${L.generations}세대 경주 · ${r.t.toFixed(1)}/${secs}초 · ` +
                `넘어짐 ${fell}/${info.length}${lead ? ` · 선두 ${lead.lane + 1}번 ${Math.round(lead.dx * 100)} cm` : ''}`;
        }});
        if (!results) return null;
        // the finish: who scored best (by the reward rules, not only distance)
        const scored = results.map((r, i) => ({i, s: score(r, this.weights)})).sort((a, b) => b.s - a.s);
        race.ranks = results.map((_, i) => (i === scored[0].i ? 1 : null));
        this.raceView.render();
        const fell = results.filter(r => r.fell).length;
        const w = results[scored[0].i];
        this.learnTag.textContent = `${gen}세대 결과 · 1등 ${scored[0].i + 1}번 (점수 ${scored[0].s.toFixed(1)}, ` +
            `${Math.round(w.dx * 100)} cm) · 넘어짐 ${fell}/${results.length}`;
        await new Promise(r => setTimeout(r, 900)); // a moment to see the finish
        return results;
    }

    _raceStop () {
        if (this.raceView) this.raceView.dispose();
        if (this.race) this.race.delete();
        this.raceView = null;
        this.race = null;
        this.learnView.hidden = true;
        this.learnView.classList.remove('sim-race');
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
            await this.walker.walk(withPolicy ? this.store.policy.gait : this.gait, 8,
                {policy: withPolicy ? this.store.policy : null, prepare: true});
            const t = this.physics.torso;
            this.log(`3D 로봇: ${((t.x - start.x) * 100).toFixed(0)} cm 앞으로, ${this.physics.fallen ? '넘어졌습니다' : '서 있습니다'}.`,
                this.physics.fallen ? 'warn' : 'ok');
        } catch (e) {
            this.log(`⚠ ${e.message || e}`, 'err');
        }
    }

    // ---- 예제 모션 확인 ------------------------------------------------------------------
    async recordMotion () {
        if (this.recorder && this.recorder.running) return;
        if (!this.device.connected) {
            this.log('먼저 실제 로봇(USB/블루투스)을 연결하세요. 3D 가상 로봇에는 공식 모션이 들어 있지 않습니다.', 'warn');
            return;
        }
        this.recorder = new MotionRecorder({device: this.device, getJointMap: () => this.jointMap});
        this._status();
        const page = this.motionPage;
        this.log(`모션 ${page}번을 실행하며 기록합니다…`);
        try {
            const rec = await this.recorder.record(page, {onFrame: (f, r) => {
                this.recInfo.textContent = `모션 ${page}번 기록 중 · ${f.t.toFixed(1)}초 · ${r.frames.length}개`;
            }});
            this.motionRec = rec;
            this._showMotion();
            this.log(`모션 ${page}번 기록 끝: ${rec.seconds.toFixed(1)}초, ${rec.frames.length}개 ` +
                `(초당 ${(rec.frames.length / Math.max(0.1, rec.seconds)).toFixed(0)}번${rec.syncRead ? ', 한꺼번에 읽기' : ', 하나씩 읽기'}).`, 'ok');
        } catch (e) {
            this.log(`⚠ 모션 기록: ${e.message || e}`, 'err');
        }
        this._status();
    }

    _showMotion () {
        const rec = this.motionRec;
        if (!rec) return;
        const sum = summarize(rec, this.jointMap);
        const moved = sum.filter(r => r.range > 3);
        this.recInfo.textContent = `${rec.fromFile ? `모션 파일: ${rec.page}` : `모션 ${rec.page}번`} · ${rec.seconds.toFixed(1)}초 · ` +
            `${rec.fromFile ? '키프레임' : '기록'} ${rec.frames.length}개 · ` +
            `움직인 관절 ${moved.length}개${moved.length ? ` (${moved.map(r => r.id).join(', ')})` : ' — 모션이 실행되지 않았거나 빈 페이지입니다'}`;
        const f = v => (Number.isFinite(v) ? v.toFixed(1) : '-');
        this.recTable.innerHTML = '<thead><tr><th>ID</th><th>관절</th><th>시작</th><th>최소</th><th>최대</th><th>움직임</th></tr></thead>';
        const tb = el('tbody');
        for (const r of sum) {
            const tr = el('tr');
            for (const v of [r.id, r.name, f(r.start), f(r.min), f(r.max), f(r.range)]) tr.append(el('td', 'sim-num', String(v)));
            tb.append(tr);
        }
        this.recTable.append(tb);
    }

    async replayMotion () {
        const rec = this.motionRec;
        if (!rec) {
            this.log('먼저 모션을 기록하거나 기록 파일을 불러오세요.', 'warn');
            return;
        }
        try {
            const ph = await this._ensureSim();
            this.walker.stop();
            ph.reset();
            for (const j of this.jointMap) {
                ph.setTorque(j.id, 1);
                ph.setProfile(j.id, 0);
            }
            const map = this.jointMap;
            const t0 = ph.data.time;
            const lead = 0.6; // from standing straight into the motion's first pose
            const first = toJointRad(rec.frames[0].deg, map);
            this.log(`3D 로봇에 ${rec.fromFile ? rec.page : `모션 ${rec.page}번 기록`}을 재생합니다 (${rec.seconds.toFixed(1)}초).`);
            await new Promise(resolve => {
                ph.setController(time => {
                    const t = time - t0;
                    if (t < lead) {
                        for (const j in first) ph.setGoalRad(j, first[j] * (t / lead));
                        return;
                    }
                    const tt = t - lead;
                    if (tt > rec.seconds + 1) {
                        ph.setController(null);
                        resolve();
                        return;
                    }
                    const q = toJointRad(poseAt(rec, Math.min(tt, rec.seconds)), map);
                    for (const j in q) ph.setGoalRad(j, q[j]);
                });
            });
            const t = ph.torso;
            this.log(`3D 재생 끝: 앞으로 ${(t.x * 100).toFixed(0)} cm, 옆으로 ${(t.y * 100).toFixed(0)} cm, ` +
                `${ph.fallen ? '넘어졌습니다' : '서 있습니다'}. (공식 걷기 모션이 3D에서도 앞으로 걸으면 ID·방향 설정이 맞습니다)`,
            ph.fallen ? 'warn' : 'ok');
        } catch (e) {
            this.log(`⚠ 3D 재생: ${e.message || e}`, 'err');
        }
    }

    motionBlocks () {
        const rec = this.motionRec;
        if (!rec || !this.insertXML) return;
        const poses = keyPoses(rec, 0.12);
        const n = this.insertXML((x, y) => posesProgramXML(poses, {x, y,
            title: `${rec.fromFile ? `모션 파일의 ${rec.page}` : `CM-550 모션 ${rec.page}번을 기록한`} 자세 ${poses.length}개 (약 0.12초마다)`}).xml);
        if (n !== false) this.log(`${rec.fromFile ? rec.page : `모션 ${rec.page}번`}을 블록으로 넣었습니다: 자세 ${poses.length}개, 자세마다 모터 ${rec.ids.length}개.`, 'ok');
    }

    saveMotion () {
        const rec = this.motionRec;
        if (!rec || !this.saveText) return;
        this.saveText(`MAX-E1-motion-${String(rec.page).replace(/[^\w가-힣-]+/g, '_').slice(0, 40)}.json`, JSON.stringify(Object.assign({format: 'dm-motion-1'}, rec)));
    }

    async loadMtn3 (file) {
        if (!file) return;
        try {
            const m = parseMtn3(await file.text());
            this._useMtn(m, false);
            this.log(`모션 파일을 열었습니다: ${file.name} — 모션 ${m.calls.length}개, 걷기 묶음 ${this.mtnChains.length}개, 관절 ${m.ids.length}개.`, 'ok');
            this._pickMtn();
        } catch (e) {
            this.log(`⚠ 모션 파일: ${e.message || e}`, 'err');
        }
        this._status();
    }

    /** The official MAX-E1 example motions, built in (no file needed). */
    loadBuiltInMotions () {
        try {
            this._useMtn(fromCompact(MAXE1_MOTIONS), true);
        } catch (e) {
            this.log(`⚠ 공식 모션: ${e.message || e}`, 'err');
        }
    }

    _useMtn (m, builtIn) {
        this.mtn = m;
        this.mtnBuiltIn = builtIn;
        this.mtnChains = findChains(m);
        const note = index => (builtIn ? motionNote(index) : {title: '', desc: ''});
        const sel = this.mtnSel;
        sel.innerHTML = '';
        const group = label => {
            const g = el('optgroup');
            g.label = label;
            sel.append(g);
            return g;
        };
        const gc = group(builtIn ? 'MAX-E1 공식 모션 — 걷기 묶음 (시작 → 반복 → 끝)' : '걷기 묶음 (시작 → 반복 → 끝)');
        for (const [i, c] of this.mtnChains.entries()) {
            const t = note(c.start).title.replace(/ 시작$/, '');
            const o = el('option', '', `걷기: ${t || c.name} (${c.start} → ${c.loop} ×반복 → ${c.end})`);
            o.value = `c:${i}`;
            gc.append(o);
        }
        const ranges = builtIn ? [[100, 199, '서기 · 동작 (100번대)'], [300, 499, '스마트폰 앱 버튼용 (300·400번대)'],
            [700, 799, '한 걸음씩 걷기 (700번대)'], [0, 1e9, '그 밖의 모션']] : [[0, 1e9, '모션']];
        const done = new Set();
        for (const [lo, hi, label] of ranges) {
            const list = m.calls.filter(c => c.index >= lo && c.index <= hi && !done.has(c.index));
            if (!list.length) continue;
            const g = group(builtIn ? `MAX-E1 공식 모션 — ${label}` : label);
            for (const c of list) {
                done.add(c.index);
                const t = note(c.index).title || c.flow.replace(/^\d+_?H?_?/, '');
                const o = el('option', '', `${c.index} ${t} · ${callSeconds(m, c.index).toFixed(1)}초`);
                o.value = `p:${c.index}`;
                g.append(o);
            }
        }
        sel.disabled = false;
        // default: the forward walk group, if there is one
        const fw = this.mtnChains.findIndex(c => c.start === 150);
        if (fw >= 0) sel.value = `c:${fw}`;
    }

    /** The chosen motion (or walk group) as a recording: shown, replayable in 3D, blocks. */
    _pickMtn () {
        if (!this.mtn || !this.mtnSel.value) return;
        const [kind, v] = this.mtnSel.value.split(':');
        let seq;
        let label;
        if (kind === 'c') {
            const c = this.mtnChains[Number(v)];
            seq = [c.start, ...Array(this.mtnRepeat).fill(c.loop), c.end];
            label = `${c.name} (${c.start} → ${c.loop} ×${this.mtnRepeat} → ${c.end})`;
        } else {
            seq = [Number(v)];
            label = this.mtnSel.selectedOptions[0].textContent.replace(/ · [\d.]+초$/, '');
        }
        this.motionRec = toRecording(this.mtn, seq, label);
        this._showMtnNote(kind, Number(v));
        this._showMotion();
        this._status();
    }

    _showMtnNote (kind, v) {
        if (!this.mtnNote) return;
        const src = this.mtnBuiltIn ? '출처: ROBOTIS ENGINEER Kit 1 MAX-E1 예제 모션 (03_ENG1_MAX_E1.mtn3). ' : '';
        if (!this.mtnBuiltIn) {
            this.mtnNote.textContent = '';
            return;
        }
        if (kind === 'c') {
            const c = this.mtnChains[v];
            const a = motionNote(c.start);
            const b = motionNote(c.loop);
            const e = motionNote(c.end);
            this.mtnNote.textContent = `${c.start} ${a.title}: ${a.desc} → ${c.loop} ${b.title} ×${this.mtnRepeat}: ${b.desc} → ${c.end} ${e.title}: ${e.desc} ${src}`;
        } else {
            const n = motionNote(v);
            this.mtnNote.textContent = n.title ? `${v} ${n.title}: ${n.desc} ${src}` : src;
        }
    }

    async runMtnOnRobot () {
        if (!this.mtn || !this.mtnSel.value) return;
        if (!this.device.connected || (this.device.transport && this.device.transport.physics)) {
            this.log('실제 로봇(USB/블루투스)을 연결하세요. 3D 로봇에는 [3D로 재생]을 쓰세요.', 'warn');
            return;
        }
        const [kind, v] = this.mtnSel.value.split(':');
        try {
            this._mtnRunning = true;
            this._status();
            const r = await this.device.prepareJoints(this.jointMap.map(j => j.id), {}, 2);
            if (r.rebooted.length) this.log(`다이나믹셀 ${r.rebooted.join(', ')}: 오류가 있어 다시 시작했습니다.`, 'warn');
            if (kind === 'c') {
                const c = this.mtnChains[Number(v)];
                this.log(`실제 로봇: ${c.name} — 모션 ${c.start} → ${c.loop} ×${this.mtnRepeat} → ${c.end} (CM-550에 저장된 모션)`);
                await this.device.playMotionChain(c.start, c.loop, this.mtnRepeat, c.end,
                    {startSecs: callSeconds(this.mtn, c.start), loopSecs: callSeconds(this.mtn, c.loop)});
            } else {
                this.log(`실제 로봇: 모션 ${v}번 (CM-550에 저장된 모션)`);
                await this.device.playMotion(Number(v));
                await this.device.waitMotionDone(30000);
            }
            this.log('실제 로봇: 모션 끝.', 'ok');
        } catch (e) {
            this.log(`⚠ 실제 로봇 모션: ${e.message || e}`, 'err');
        } finally {
            this._mtnRunning = false;
            this._status();
        }
    }

    async loadMotion (file) {
        if (!file) return;
        try {
            const rec = JSON.parse(await file.text());
            if (!rec || !Array.isArray(rec.frames) || !rec.frames.length || !Array.isArray(rec.ids)) throw new Error('모션 기록 파일이 아닙니다.');
            this.motionRec = rec;
            this._showMotion();
            this.log(`모션 기록을 불러왔습니다: 페이지 ${rec.page}, ${rec.frames.length}개.`, 'ok');
        } catch (e) {
            this.log(`⚠ 모션 기록 파일: ${e.message || e}`, 'err');
        }
        this._status();
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
        this.modeSel.disabled = learning;
        const recording = Boolean(this.recorder && this.recorder.running);
        this.recBtn.disabled = recording;
        this.recStopBtn.disabled = !recording;
        for (const b of [this.replayBtn, this.recBlockBtn, this.recSaveBtn]) b.disabled = !this.motionRec || recording;
        this.mtnRunBtn.disabled = !this.mtn || Boolean(this._mtnRunning);
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
