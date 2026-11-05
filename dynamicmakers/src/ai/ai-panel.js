/**
 * AI 학습 panel: pick an input (camera / sound / robot sensor), collect
 * examples for each kind by holding a button, watch the live result, and use
 * the AI blocks to make the robot react.
 */
import {SOURCE_NAMES} from './engine';
import {SENSOR_CHANNELS} from './sources';
import {JOINTS} from './pose';

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
    if (onClick) b.addEventListener('click', onClick);
    return b;
};
const COLORS = ['#2E6ABF', '#E07B39', '#1FB36B', '#C0392B', '#8E44AD', '#16A2B8', '#B7950B', '#5D6D7E'];

const NOTES = {
    body: 'PC 카메라로 사람의 관절 17곳(스켈레톤)을 찾습니다. 만세·팔 벌리기·앉기 같은 자세를 학습시키거나, ' +
        '[몸 동작] 블록으로 사람의 팔 각도를 그대로 로봇 모터에 보내 따라 하게 할 수 있습니다.',
    camera: '노트북 카메라로 손 모양, 표정, 물건, 색 카드 등을 알아봅니다. 사진은 저장되지 않고, 각 장면에서 뽑은 숫자 256개만 저장됩니다.',
    sound: '마이크로 박수, 휘파람, 목소리, 조용함 등을 알아봅니다. 높고 낮은 소리 32칸의 크기를 비교합니다.',
    sensor: 'CM-550의 기울기·회전·가속 센서로 로봇이 흔들림, 기울어짐, 밀림, 넘어짐 같은 상태를 알아봅니다.'
};

export class AIPanel {
    /**
     * @param {object} o
     * @param {HTMLElement} o.host
     * @param {import('./engine').AIEngine} o.engine
     * @param {Function} o.log
     * @param {Function} o.onKindsChange  called when kind names change (refresh block menus)
     * @param {Function} o.addScript      (kinds) -> void, example blocks into the workspace
     */
    constructor ({host, engine, log, onKindsChange, addScript, addFollowScript, tracker}) {
        this.host = host;
        this.addFollowScript = addFollowScript;
        this.tracker = tracker;
        this.engine = engine;
        this.log = log;
        this.onKindsChange = onKindsChange;
        this.addScript = addScript;
        this.visible = false;
        this._build();
        engine.onUpdate(() => this._onEngine());
        if (tracker) tracker.onUpdate(() => this._onPose());
        // releasing the mouse anywhere ends collecting
        window.addEventListener('pointerup', () => engine.stopCollecting());
        window.addEventListener('blur', () => engine.stopCollecting());
        this.render();
    }

    _build () {
        this.host.classList.add('mon', 'aip');
        const header = el('header', 'mon-header');
        header.append(el('span', 'mon-title', 'AI 학습'));
        this.stateEl = el('span', 'mon-state', '');
        header.append(this.stateEl);
        this.runBtn = button('mon-btn', '인식 시작', () => this.toggleRun());
        header.append(this.runBtn);
        this.host.append(header);

        const body = el('div', 'mon-body');
        this.host.append(body);

        // 1. source
        const c1 = el('section', 'mon-card');
        c1.append(el('h3', '', '1. 무엇으로 알아볼까요?'));
        this.srcRow = el('div', 'ai-sources');
        for (const kind of ['body', 'camera', 'sound', 'sensor']) {
            const b = button('ai-src', {body: '🧍 몸 동작', camera: '📷 카메라', sound: '🎤 소리', sensor: '🤖 로봇 센서'}[kind],
                () => this.chooseSource(kind));
            b.dataset.kind = kind;
            this.srcRow.append(b);
        }
        c1.append(this.srcRow);
        this.noteEl = el('p', 'mon-note ai-note');
        c1.append(this.noteEl);
        this.preview = el('div', 'ai-preview');
        this.canvas = el('canvas', 'ai-canvas');
        this.canvas.width = 320;
        this.canvas.height = 120;
        this.previewMsg = el('div', 'ai-preview-msg', '');
        this.overlay = el('canvas', 'ai-overlay');
        this.stage = el('div', 'ai-stage'); // video + skeleton overlay
        this.anglesEl = el('div', 'ai-angles');
        this.followRow = el('div', 'tp-row');
        this.followBtn = button('tp-btn tp-primary', '따라 하기 예시 블록', () => this.addFollowScript(),
            '사람의 양팔 어깨 각도를 로봇 모터 두 개가 따라 하는 블록을 넣습니다');
        this.followRow.append(this.followBtn, el('span', 'tp-label', '사람 팔 각도 → 로봇 모터'));
        c1.append(this.preview, this.anglesEl, this.followRow);
        body.append(c1);

        // 2. kinds
        const c2 = el('section', 'mon-card');
        c2.append(el('h3', '', '2. 종류별로 예시 모으기'));
        c2.append(el('p', 'mon-note', '종류 이름을 정하고 [누르고 있는 동안 모으기]를 꾹 누르세요. ' +
            '종류마다 20개 이상 모으면 잘 알아봅니다. "아무것도 아님" 종류를 하나 두면 더 정확해집니다.'));
        this.kindsEl = el('div', 'ai-kinds');
        c2.append(this.kindsEl);
        const row = el('div', 'tp-row');
        row.append(button('tp-btn', '+ 종류 추가', () => {
            this.engine.addClass();
            this._kindsChanged();
        }));
        c2.append(row);
        body.append(c2);

        // 3. result
        const c3 = el('section', 'mon-card');
        c3.append(el('h3', '', '3. AI가 알아본 결과'));
        this.resultEl = el('div', 'ai-result', '–');
        this.barsEl = el('div', 'ai-bars');
        c3.append(this.resultEl, this.barsEl);
        c3.append(el('p', 'mon-note', '블록 분류의 [AI 학습]에서 "AI가 [종류] 을(를) 알아봤을 때" 블록으로 로봇이 반응하게 만들어 보세요.'));
        const row3 = el('div', 'tp-row');
        this.scriptBtn = button('tp-btn', '예시 블록 만들기', () => this.addScript(this.engine.names),
            '종류마다 "알아봤을 때 → 말하기" 블록을 작업 영역에 넣습니다');
        row3.append(this.scriptBtn);
        c3.append(row3);
        body.append(c3);
    }

    setVisible (v) {
        this.visible = v;
        if (v) {
            this.render();
            this._draw();
        }
    }

    _kindsChanged () {
        if (this.onKindsChange) this.onKindsChange();
        this.render();
    }

    async chooseSource (kind) {
        const e = this.engine;
        if (kind === e.sourceKind) return;
        if (e.exampleCount && !window.confirm( // eslint-disable-line no-alert
            `${SOURCE_NAMES[kind]}(으)로 바꾸면 지금까지 모은 예시가 지워집니다. 바꿀까요?`)) return;
        try {
            await e.setSource(kind);
        } catch (err) {
            this.log(`⚠ ${err.message}`, 'err');
        }
        this.render();
    }

    async toggleRun () {
        const e = this.engine;
        if (e.running) {
            e.stop();
            e._emit();
            return;
        }
        try {
            this.runBtn.disabled = true;
            this.stateEl.textContent = e.sourceKind === 'camera' ? 'AI 모델을 준비하는 중…' : '시작하는 중…';
            await e.start();
        } catch (err) {
            this.log(`⚠ ${err.message}`, 'err');
        } finally {
            this.runBtn.disabled = false;
            this.render();
        }
    }

    _onEngine () {
        // cheap updates every frame; full rebuild only when structure changes
        const sig = [this.engine.sourceKind, this.engine.running, this.engine.names.join('|'),
            this.engine.error].join('/');
        if (sig !== this._sig) this.render();
        else this._update();
    }

    render () {
        const e = this.engine;
        this._sig = [e.sourceKind, e.running, e.names.join('|'), e.error].join('/');
        for (const b of this.srcRow.children) b.classList.toggle('active', b.dataset.kind === e.sourceKind);
        this.noteEl.textContent = NOTES[e.sourceKind];
        this.runBtn.textContent = e.running ? '인식 멈추기' : '인식 시작';

        // preview
        this.preview.textContent = '';
        const body = e.sourceKind === 'body';
        if (body && this.tracker) {
            this.stage.textContent = '';
            this.stage.append(this.tracker.video, this.overlay);
            this.preview.append(this.stage);
        } else if (e.sourceKind === 'camera' && e.source && e.source.video) this.preview.append(e.source.video);
        else this.preview.append(this.canvas);
        this.preview.append(this.previewMsg);
        this.anglesEl.hidden = !body;
        this.followRow.hidden = !body;

        // kinds
        this.kindsEl.textContent = '';
        e.classes.forEach((c, i) => {
            const row = el('div', 'ai-kind');
            row.style.setProperty('--kind', COLORS[i % COLORS.length]);
            const name = el('input', 'ai-kind-name');
            name.value = c.name;
            name.maxLength = 20;
            name.setAttribute('aria-label', `${i + 1}번 종류 이름`);
            name.addEventListener('change', () => {
                if (!e.renameClass(i, name.value)) {
                    name.value = c.name;
                    this.log('종류 이름이 비어 있거나 다른 종류와 같습니다.', 'warn');
                }
                this._kindsChanged();
            });
            const count = el('span', 'ai-count', `${c.examples.length}개`);
            count.dataset.i = i;
            const hold = button('ai-hold', '누르고 있는 동안 모으기');
            hold.dataset.i = i;
            hold.addEventListener('pointerdown', ev => {
                ev.preventDefault();
                e.startCollecting(i);
            });
            for (const t of ['pointerup', 'pointerleave', 'pointercancel']) {
                hold.addEventListener(t, () => e.stopCollecting());
            }
            const clear = button('mon-btn-small', '지우기', () => e.clearClass(i), '이 종류의 예시를 지웁니다');
            const rm = button('mon-btn-small tp-x', '✕', () => {
                e.removeClass(i);
                this._kindsChanged();
            }, '이 종류 지우기');
            rm.disabled = e.classes.length <= 2;
            row.append(name, count, hold, clear, rm);
            this.kindsEl.append(row);
        });
        this._update();
    }

    _update () {
        const e = this.engine;
        this.stateEl.textContent = e.error ? `⚠ ${e.error}` :
            e._starting ? (e.sourceKind === 'camera' ? 'AI 모델을 준비하는 중…' : '시작하는 중…') :
                e.running ? (e.collecting >= 0 ? `'${e.names[e.collecting]}' 예시 모으는 중` :
                    e.ready ? '인식하는 중' : '예시를 모아 주세요') :
                    `${SOURCE_NAMES[e.sourceKind]} · 예시 ${e.exampleCount}개`;
        for (const h of this.kindsEl.querySelectorAll('.ai-hold')) {
            h.classList.toggle('on', Number(h.dataset.i) === e.collecting);
        }
        for (const c of this.kindsEl.querySelectorAll('.ai-count')) {
            const k = e.classes[Number(c.dataset.i)];
            if (k) c.textContent = `${k.examples.length}개`;
        }
        const poseOn = e.sourceKind === 'body' && this.tracker && this.tracker.running;
        this.previewMsg.textContent = e.running || poseOn ? '' :
            (e.sourceKind === 'sensor' && !e.device.connected ? '로봇을 연결한 뒤 [인식 시작]을 누르세요' : '[인식 시작]을 누르면 여기에 보입니다');

        // result
        if (!e.running) this.resultEl.textContent = '인식이 꺼져 있습니다';
        else if (!e.ready) this.resultEl.textContent = '두 가지 이상의 종류에 예시를 모아 주세요';
        else this.resultEl.textContent = e.active ? `지금: ${e.active}` : '잘 모르겠어요 (확신 60% 미만)';
        this.resultEl.classList.toggle('sure', Boolean(e.active));
        this.barsEl.textContent = '';
        e.classes.forEach((c, i) => {
            const p = e.confidence(c.name);
            const row = el('div', 'ai-bar');
            row.append(el('span', 'ai-bar-name', c.name));
            const track = el('span', 'ai-bar-track');
            const fill = el('span', 'ai-bar-fill');
            fill.style.width = `${p}%`;
            fill.style.background = COLORS[i % COLORS.length];
            track.append(fill);
            row.append(track, el('span', 'ai-bar-pct', `${p}%`));
            this.barsEl.append(row);
        });
        this.scriptBtn.disabled = !e.ready;
        if (this.visible) this._draw();
    }

    /** Skeleton overlay + joint angles (also while only the program uses the camera). */
    _onPose () {
        const t = this.tracker;
        if (!this.visible || this.engine.sourceKind !== 'body') return;
        if (this.preview.querySelector('.ai-preview-msg').textContent && t.running) this._update();
        const v = t.video;
        if (v.videoWidth && (this.overlay.width !== v.videoWidth || this.overlay.height !== v.videoHeight)) {
            this.overlay.width = v.videoWidth;
            this.overlay.height = v.videoHeight;
        }
        t.draw(this.overlay);
        const a = t.data.angles;
        this.anglesEl.textContent = '';
        const head = el('div', 'ai-angle-head', t.running ?
            (t.data.visible ? `사람 보임 · ${t.fps} fps` : '사람이 보이지 않아요 — 상반신이 화면에 들어오게 서 주세요') :
            '몸 동작 추적이 꺼져 있습니다');
        this.anglesEl.append(head);
        for (const [key, label] of Object.entries(JOINTS)) {
            const cell = el('div', 'ai-angle');
            cell.append(el('span', '', label.replace(/ \(.*\)$/, '')),
                el('b', '', a[key] === null || a[key] === undefined ? '–' : `${Math.round(a[key])}°`));
            this.anglesEl.append(cell);
        }
    }

    /** Sound: 32 band levels. Sensor: 8 channels. */
    _draw () {
        const e = this.engine;
        const src = e.source;
        if (!src || e.sourceKind === 'camera') return;
        const ctx = this.canvas.getContext('2d');
        const W = this.canvas.width;
        const H = this.canvas.height;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#f2f5fa';
        ctx.fillRect(0, 0, W, H);
        if (e.sourceKind === 'sound' && src.level) {
            const n = src.level.length;
            const bw = W / n;
            for (let b = 0; b < n; b++) {
                const v = Math.max(0, Math.min(1, (src.level[b] + 100) / 70));
                ctx.fillStyle = '#2E6ABF';
                ctx.fillRect((b * bw) + 1, H - (v * (H - 14)), bw - 2, v * (H - 14));
            }
            ctx.fillStyle = '#6b7689';
            ctx.font = '10px sans-serif';
            ctx.fillText('낮은 소리', 4, 11);
            ctx.fillText('높은 소리', W - 48, 11);
        } else if (e.sourceKind === 'sensor' && src.latest) {
            const n = SENSOR_CHANNELS.length;
            const bh = (H - 4) / n;
            const scale = [45, 45, 200, 200, 200, 2, 2, 2]; // full bar: 45°, 200°/s, 2 G
            ctx.font = '10px sans-serif';
            for (let c = 0; c < n; c++) {
                const v = Math.max(-1, Math.min(1, src.latest[c] / scale[c]));
                const y = 2 + (c * bh);
                ctx.fillStyle = '#6b7689';
                ctx.fillText(SENSOR_CHANNELS[c], 4, y + bh - 4);
                const mid = 70 + ((W - 80) / 2);
                ctx.fillStyle = '#dde3ec';
                ctx.fillRect(70, y + 2, W - 80, bh - 4);
                ctx.fillStyle = v >= 0 ? '#1FB36B' : '#E07B39';
                ctx.fillRect(v >= 0 ? mid : mid + (v * (W - 80) / 2), y + 2, Math.abs(v) * (W - 80) / 2, bh - 4);
            }
        }
    }
}
