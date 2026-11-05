/**
 * 자세 가르치기 — teach the robot by hand.
 *
 * Students relax the joints (torque off), shape the robot with their hands,
 * press Space (or the big button) to record the pose, and play the poses back.
 * Poses live in the project list "로봇 자세", so they are saved with the
 * program and the pose blocks (자세 n번으로 움직이기 …) can use them.
 */
const {poseSize} = require('../../scratch-cm550/src/poses');

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
const isTyping = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' ||
    t.isContentEditable || (t.closest && t.closest('.blocklyWidgetDiv, .blocklyDropDownDiv, .db-overlay')));

export class TeachPanel {
    /**
     * @param {object} o
     * @param {HTMLElement} o.host
     * @param {object} o.ext       cm550 extension instance
     * @param {Function} o.log     (text, kind) -> void
     * @param {Function} o.isRunning
     * @param {Function} o.addScript (poseNumbers, seconds) -> void, puts blocks in the workspace
     */
    constructor ({host, ext, log, isRunning, addScript}) {
        this.host = host;
        this.ext = ext;
        this.device = ext.device;
        this.log = log;
        this.isRunning = isRunning;
        this.addScript = addScript;
        this.visible = false;
        this.busy = false;
        this.playing = false;
        this.selected = new Set(); // joints to relax; empty set = all
        this.relaxed = new Set();
        this._build();
        document.addEventListener('keydown', e => {
            if (!this.visible || e.key !== ' ' || e.repeat || isTyping(e.target)) return;
            e.preventDefault();
            e.stopImmediatePropagation(); // Space records here, not "when space key pressed"
            this.record();
        }, true);
        this.render();
    }

    _build () {
        this.host.classList.add('mon', 'tp');
        const header = el('header', 'mon-header');
        header.append(el('span', 'mon-title', '자세 가르치기'));
        this.stateEl = el('span', 'mon-state', '');
        header.append(this.stateEl);
        this.host.append(header);

        const body = el('div', 'mon-body');
        this.host.append(body);

        // 1. relax
        const c1 = el('section', 'mon-card');
        c1.append(el('h3', '', '1. 관절 힘 빼기'));
        c1.append(el('p', 'mon-note',
            '로봇이 넘어지지 않게 한 손으로 받친 다음 힘을 빼세요. 팔만 가르칠 때는 팔 관절만 골라서 풀 수 있습니다.'));
        this.jointsEl = el('div', 'tp-joints');
        c1.append(this.jointsEl);
        const row1 = el('div', 'tp-row');
        this.relaxBtn = button('tp-btn', '고른 관절 힘 빼기', () => this.relax(false));
        this.stiffBtn = button('tp-btn tp-primary', '모두 힘 주기 (자세 유지)', () => this.relax(true));
        row1.append(this.relaxBtn, this.stiffBtn);
        c1.append(row1);
        body.append(c1);

        // 2. record
        const c2 = el('section', 'mon-card');
        c2.append(el('h3', '', '2. 자세 기록하기'));
        c2.append(el('p', 'mon-note',
            '손으로 자세를 만든 뒤 스페이스 키나 아래 버튼을 누르면 모든 관절의 각도가 저장됩니다.'));
        this.recordBtn = button('tp-record', '● 지금 자세 기록  (스페이스)', () => this.record());
        c2.append(this.recordBtn);
        body.append(c2);

        // 3. poses
        const c3 = el('section', 'mon-card');
        c3.append(el('h3', '', '3. 기록한 자세'));
        this.posesEl = el('ol', 'tp-poses');
        c3.append(this.posesEl);
        const row3 = el('div', 'tp-row');
        row3.append(el('span', 'tp-label', '자세마다'));
        this.secsInput = el('input', 'tp-secs');
        this.secsInput.type = 'number';
        this.secsInput.min = '0.2';
        this.secsInput.max = '10';
        this.secsInput.step = '0.1';
        this.secsInput.value = '1';
        this.secsInput.setAttribute('aria-label', '자세마다 걸리는 시간(초)');
        row3.append(this.secsInput, el('span', 'tp-label', '초'));
        this.playBtn = button('tp-btn tp-primary', '▶ 처음부터 재생', () => this.playAll());
        this.stopBtn = button('tp-btn', '■ 멈춤', () => { this.playing = false; });
        row3.append(this.playBtn, this.stopBtn);
        c3.append(row3);
        const row4 = el('div', 'tp-row');
        this.scriptBtn = button('tp-btn', '블록으로 만들기', () => this.makeScript(),
            '기록한 자세를 차례로 움직이는 블록을 작업 영역에 넣습니다');
        this.clearBtn = button('tp-btn tp-danger', '모두 지우기', () => this.clearAll());
        row4.append(this.scriptBtn, this.clearBtn);
        c3.append(row4);
        body.append(c3);
    }

    setVisible (v) {
        this.visible = v;
        if (v) this.render();
    }

    get seconds () {
        const s = Number(this.secsInput.value);
        return Number.isFinite(s) && s > 0 ? Math.min(10, Math.max(0.2, s)) : 1;
    }

    /** Run one device action at a time; report errors in the output window. */
    async _run (label, fn) {
        if (this.busy) return;
        if (!this.device.connected) {
            this.log('먼저 로봇을 연결하세요 (USB·블루투스·가상 로봇).', 'warn');
            return;
        }
        if (this.isRunning()) {
            this.log('프로그램이 실행 중입니다. ■ 정지를 누른 뒤 다시 해 보세요.', 'warn');
            return;
        }
        this.busy = true;
        this.render();
        try {
            await fn();
        } catch (e) {
            this.log(`⚠ ${label}: ${e.message || e}`, 'err');
        } finally {
            this.busy = false;
            this.render();
        }
    }

    _jointIds () {
        return this.selected.size ? [...this.selected] : this.device.motors.map(m => m.id);
    }

    relax (on) {
        return this._run(on ? '힘 주기' : '힘 빼기', async () => {
            await this.ext._ensureMotors();
            const ids = on ? this.device.motors.map(m => m.id) : this._jointIds();
            await this.ext.relaxJoints(ids, on);
            if (on) this.relaxed.clear();
            else ids.forEach(id => this.relaxed.add(id));
            this.log(on ? '모든 관절에 힘을 주었습니다. 지금 자세를 유지합니다.' :
                `관절 ${ids.length}개의 힘을 뺐습니다. 손으로 자세를 만들어 보세요.`);
        });
    }

    record () {
        return this._run('자세 기록', async () => {
            const n = await this.ext.recordPose(0);
            this.log(`${n}번 자세를 기록했습니다.`, 'ok');
            this._flash = n;
        });
    }

    overwrite (n) {
        return this._run('자세 덮어쓰기', async () => {
            await this.ext.recordPose(n);
            this.log(`${n}번 자세를 지금 자세로 바꿨습니다.`, 'ok');
            this._flash = n;
        });
    }

    goTo (n) {
        return this._run('자세로 이동', async () => {
            this.relaxed.clear();
            await this.ext.playPose(n, this.seconds);
        });
    }

    playAll () {
        return this._run('재생', async () => {
            const poses = this.ext.getPoses();
            if (!poses.some(poseSize)) throw new Error('기록한 자세가 없습니다.');
            this.relaxed.clear();
            this.playing = true;
            this.render();
            for (let i = 0; i < poses.length && this.playing; i++) {
                if (!poseSize(poses[i])) continue;
                this._current = i + 1;
                this.render();
                await this.ext.playPose(i + 1, this.seconds);
            }
            this.playing = false;
            this._current = 0;
        });
    }

    remove (n) {
        this.ext.deletePose(n);
        this.log(`${n}번 자세를 지웠습니다. 뒤의 자세 번호가 하나씩 당겨집니다.`);
    }

    clearAll () {
        if (!this.ext.getPoses().length) return;
        if (!window.confirm('기록한 자세를 모두 지울까요?')) return; // eslint-disable-line no-alert
        this.ext.poseClear();
        this.log('기록한 자세를 모두 지웠습니다.');
    }

    makeScript () {
        const numbers = this.ext.getPoses().map((p, i) => (poseSize(p) ? i + 1 : 0)).filter(Boolean);
        if (!numbers.length) {
            this.log('먼저 자세를 기록하세요.', 'warn');
            return;
        }
        this.addScript(numbers, this.seconds);
        this.log(`자세 ${numbers.length}개를 차례로 움직이는 블록을 작업 영역에 넣었습니다.`, 'ok');
    }

    render () {
        const motors = this.device.motors;
        const connected = this.device.connected;
        this.stateEl.textContent = !connected ? '로봇이 연결되지 않았습니다' :
            this.playing ? `재생 중 · ${this._current || ''}번 자세` :
                this.busy ? '로봇과 통신 중…' :
                    this.relaxed.size ? `힘 뺀 관절 ${this.relaxed.size}개` : `관절 ${motors.length}개`;

        // joints
        this.jointsEl.textContent = '';
        if (!motors.length) {
            this.jointsEl.append(el('p', 'mon-empty', connected ?
                '다이나믹셀을 찾는 중이거나 찾지 못했습니다. 모니터에서 [검색]을 눌러 보세요.' :
                '로봇을 연결하면 관절 목록이 나타납니다.'));
        }
        const labels = this.device.motorDesc.labels || {};
        for (const m of motors) {
            const chip = el('label', 'tp-joint');
            const box = el('input');
            box.type = 'checkbox';
            box.checked = !this.selected.size || this.selected.has(m.id);
            box.addEventListener('change', () => {
                if (!this.selected.size) motors.forEach(x => this.selected.add(x.id));
                if (box.checked) this.selected.add(m.id);
                else this.selected.delete(m.id);
                if (this.selected.size === motors.length) this.selected.clear();
                this.render();
            });
            chip.append(box, el('b', '', String(m.id)), el('span', '', labels[m.id] ? ` ${labels[m.id]}` : ''));
            if (this.relaxed.has(m.id)) chip.classList.add('tp-limp');
            this.jointsEl.append(chip);
        }
        const nSel = this.selected.size || motors.length;
        this.relaxBtn.textContent = nSel === motors.length ? '모든 관절 힘 빼기' : `고른 관절 ${nSel}개 힘 빼기`;

        // poses
        const poses = this.ext.getPoses();
        this.posesEl.textContent = '';
        if (!poses.length) this.posesEl.append(el('li', 'tp-empty', '아직 기록한 자세가 없습니다.'));
        poses.forEach((p, i) => {
            const n = i + 1;
            const li = el('li', 'tp-pose');
            if (this._current === n) li.classList.add('tp-now');
            if (this._flash === n) li.classList.add('tp-flash');
            li.append(el('span', 'tp-no', `${n}`));
            li.append(el('span', 'tp-desc', poseSize(p) ? `관절 ${poseSize(p)}개` : '(비어 있음)'));
            li.title = Object.keys(p).map(id => `${id}: ${p[id]}°`).join('  ');
            const disabled = this.busy || !connected;
            const go = button('mon-btn-small', '▶ 이동', () => this.goTo(n));
            const ow = button('mon-btn-small', '덮어쓰기', () => this.overwrite(n), '지금 자세로 바꾸기');
            const rm = button('mon-btn-small tp-x', '✕', () => this.remove(n), '이 자세 지우기');
            go.disabled = disabled || !poseSize(p);
            ow.disabled = disabled;
            rm.disabled = this.busy;
            li.append(go, ow, rm);
            this.posesEl.append(li);
        });
        this._flash = 0;

        const any = poses.some(poseSize);
        this.recordBtn.disabled = this.busy || !connected;
        this.relaxBtn.disabled = this.busy || !connected || !motors.length;
        this.stiffBtn.disabled = this.busy || !connected || !motors.length;
        this.playBtn.disabled = this.busy || !connected || !any;
        this.stopBtn.disabled = !this.playing;
        this.scriptBtn.disabled = !any;
        this.clearBtn.disabled = this.busy || !poses.length;
    }
}
