// tutor.js — AI 튜터 (Robomakers WordBlock 의 튜터를 다이나믹 메이커스에 맞춘 것)
//
//  블록 → 번호 붙은 글 [L1]… (+ 파이썬) → AI → 「[L4]」 처럼 줄 번호로 답 → 그 블록을 노랗게 표시
//
//  엔진 (한 번 설치하면 인터넷 없이, 이 컴퓨터 안에서만):
//    · 오픈 모델 (WebLLM + Qwen2.5 Coder) — vendor/web-llm, 모델은 처음 한 번 huggingface 에서 받아 브라우저에 저장
//    · Chrome 내장 AI (Prompt API · Gemini Nano) — 이 언어를 지원할 때만
//  규칙 점검은 AI 없이도 항상 동작합니다 (떨어진 블록, 기다리기 없는 반복, 겹치는 모션, 없는 모터 ID …).

import {currentMotions, isBuiltIn} from './sim3d/motion-library';
import {motionNote} from './sim3d/maxe1-motion-notes';

const STORE = 'dm-tutor';
const LANG = 'ko';
const MODELS = {
    small: {f16: 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC', f32: 'Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC'},
    large: {f16: 'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC', f32: 'Qwen2.5-Coder-3B-Instruct-q4f32_1-MLC'}
};
const WEBLLM_VERSION = '0.2.87';
// the one-file build opens from file://, where a module file next to it cannot load
const webllmUrl = () => (location.protocol === 'file:' ?
    `https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@${WEBLLM_VERSION}/+esm` :
    new URL(`vendor/web-llm-${WEBLLM_VERSION}.js`, location.href).href);

const T = {
    title: 'AI 튜터',
    close: '닫기',
    check: '🔍 코드 점검',
    error: '❓ 오류 설명',
    hint: '💡 힌트',
    ask: '궁금한 것을 물어보세요 (예: 왜 로봇이 안 움직여요?)',
    send: '묻기',
    privacy: '🔒 블록과 질문은 이 컴퓨터 밖으로 나가지 않습니다. AI 답이 틀릴 수도 있으니 꼭 실행해서 확인하세요.',
    ready: n => `준비됨 · ${n}`,
    loading: 'AI 불러오는 중…',
    none: 'AI 엔진을 아직 설치하지 않았어요. 🔍 코드 점검의 규칙 검사는 AI 없이도 됩니다. 아래에서 엔진을 한 번 설치하면 인터넷 없이 질문할 수 있어요.',
    setup: '⚙ AI 엔진 설치 · 선택',
    webllm: '오픈 AI 모델 (Qwen 코더) — 추천',
    webllmDesc: '모든 언어(한국어 포함). 처음 한 번 받으면 브라우저에 저장되어 인터넷 없이 씁니다. 그래픽(WebGPU)이 되는 Chrome·Edge 필요.',
    small: '가벼운 모델 1.5B (약 1 GB)',
    large: '똑똑한 모델 3B (약 2 GB)',
    installed: '설치됨',
    use: '사용',
    remove: '지우기',
    install: '설치',
    noGpu: '이 브라우저는 WebGPU 를 지원하지 않아 쓸 수 없어요. 최신 Chrome 또는 Edge 를 써 주세요.',
    chrome: 'Chrome 내장 AI (Gemini Nano)',
    chromeDesc: 'Chrome 이 모델을 관리합니다 (약 4 GB, PC 전용).',
    chromeNo: '이 브라우저에는 내장 AI가 없어요 (최신 Chrome PC 필요).',
    chromeNoLang: 'Chrome 내장 AI는 아직 한국어로 답하지 못해요. 오픈 AI 모델을 써 주세요.',
    needNet: '설치할 때만 인터넷이 필요합니다. 학교 와이파이가 느리면 한 대에서 먼저 받아 보세요.',
    installing: p => `받는 중 ${p}%`,
    failed: m => `AI를 쓸 수 없어요: ${m}`,
    thinking: '생각하는 중…',
    rules: '자동 점검',
    noIssue: '✅ 규칙 검사에서 문제를 찾지 못했어요.',
    noError: '아직 오류가 없어요. 프로그램을 ▶ 실행해서 오류가 나면 다시 눌러 보세요.'
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

// ───────────── 블록 → 번호 붙은 글 ─────────────
const STATEMENT = 3; // ScratchBlocks.NEXT_STATEMENT
const fieldText = f => {
    if ('altText' in f || 'flipRtl' in f) { // icons: only the green flag means something
        return /flag/i.test(f.altText || '') ? '깃발' : '';
    }
    try {
        const s = f.getText();
        return s && String(s).trim() ? String(s).trim() : '';
    } catch (e) {
        return '';
    }
};
/** a reporter / shadow (number box, menu) as text: its fields and inputs in order */
const valueText = b => {
    const parts = [];
    for (const input of b.inputList) {
        for (const f of input.fieldRow) parts.push(fieldText(f));
        const c = input.connection && input.connection.targetBlock();
        if (c) parts.push(c.isShadow() ? valueText(c) : `(${valueText(c)})`);
    }
    return parts.filter(Boolean).join(' ');
};
const isHat = b => !b.previousConnection && Boolean(b.nextConnection) || b.type === 'procedures_definition';

/** The workspace as numbered lines. lines[i] = {n, id, depth, text} */
export const blocksToText = ws => {
    const lines = [];
    const emit = (b, depth, tokens) => {
        const text = tokens.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        if (text) lines.push({n: lines.length + 1, id: b.id, depth, text});
    };
    const walk = (b, depth) => {
        for (; b; b = b.getNextBlock()) {
            let tokens = [];
            let first = true;
            for (const input of b.inputList) {
                for (const f of input.fieldRow) tokens.push(fieldText(f));
                const c = input.connection && input.connection.targetBlock();
                if (input.type === STATEMENT) {
                    emit(b, depth, tokens);
                    tokens = [];
                    first = false;
                    walk(c, depth + 1);
                } else if (c) {
                    tokens.push(c.isShadow() ? `[${valueText(c)}]` : `(${valueText(c)})`);
                }
            }
            if (first || tokens.some(Boolean)) emit(b, depth, tokens);
        }
    };
    for (const b of ws.getTopBlocks(true).filter(isHat)) walk(b, 0);
    const text = lines.map(l => `[L${l.n}] ${'  '.repeat(l.depth)}${l.text}`).join('\n');
    return {lines, text};
};

// ───────────── 규칙 점검 (AI 없이) ─────────────
const WAITS = /^(control_wait|control_wait_until|cm550_(dxlMoveToWait|dxlPrepare|dxlTogether|motionPlayWait|motionChain|posePlay|posePlayAll|cmBuzzerMelody|dxlScan)|dmai_walk(Gait|Policy))$/;
const LOOPS = /^control_(forever|repeat_until|while)$/;
/** literal number typed into an input (null when it is a reporter or not a number) */
const numIn = (b, name) => {
    const c = b.getInputTargetBlock && b.getInputTargetBlock(name);
    if (!c || !c.isShadow()) return null;
    const f = c.inputList.flatMap(i => i.fieldRow).find(x => x.name);
    const v = f ? Number(f.getValue()) : NaN;
    return Number.isFinite(v) ? v : null;
};

export const ruleCheck = (ws, ctx) => {
    const out = [];
    const all = ws.getAllBlocks().filter(b => !b.isShadow());
    const tops = ws.getTopBlocks(false).filter(b => !b.isShadow());
    const hats = tops.filter(isHat);
    const floating = tops.filter(b => !isHat(b) && b.previousConnection);
    if (!hats.length && tops.length) {
        out.push({level: 'warn', msg: '「깃발을 클릭했을 때」 같은 시작 블록이 없어요. ▶ 실행을 눌러도 아무 블록도 실행되지 않습니다.', ids: tops.map(b => b.id)});
    }
    if (floating.length) {
        out.push({level: 'warn', msg: `시작 블록에 붙지 않은 블록 묶음이 ${floating.length}개 있어요 — 실행되지 않습니다.`, ids: floating.map(b => b.id)});
    }
    const emptyHats = hats.filter(h => h.type === 'event_whenflagclicked' && !h.getNextBlock());
    if (emptyHats.length) out.push({level: 'warn', msg: '「깃발을 클릭했을 때」 아래에 아무 블록도 없어요.', ids: emptyHats.map(b => b.id)});

    // 반복 안에 로봇 명령만 있고 기다리기가 없음 → 통신이 넘쳐 로봇 반응이 늦어집니다
    for (const b of all) {
        if (!LOOPS.test(b.type)) continue;
        const body = b.getInputTargetBlock('SUBSTACK');
        const inner = body ? body.getDescendants(false).filter(x => !x.isShadow()) : [];
        const robot = inner.some(x => /^cm550_(dxl|motion|cm(Led|Buzzer)|port(Led|Servo|Motor))/.test(x.type));
        if (robot && !inner.some(x => WAITS.test(x.type))) {
            out.push({level: 'info', msg: '반복 안에 로봇 명령이 있는데 기다리기가 없어요. 「0.05초 기다리기」를 넣으면 로봇이 명령을 제때 받습니다.', ids: [b.id]});
        }
    }

    // 「모션 N번 재생」 바로 다음에 또 모션 → 앞의 모션이 시작하자마자 뒤의 모션으로 바뀝니다
    for (const b of all) {
        if (b.type !== 'cm550_motionPlay') continue;
        const n = b.getNextBlock();
        if (n && /^cm550_motion(Play|PlayWait|Chain)$/.test(n.type)) {
            out.push({level: 'warn', msg: `「모션 ${numIn(b, 'PAGE') ?? '?'}번 재생」은 끝날 때까지 기다리지 않아서, 바로 다음 모션이 앞 모션을 덮어써요. 「재생하고 끝날 때까지 기다리기」 블록으로 바꾸세요.`, ids: [b.id, n.id]});
        }
    }

    // 모션 번호: MAX-E1 공식 모션에 없는 번호 (가상 로봇은 실행하지 않음)
    const m = currentMotions();
    const known = new Set(m.calls.map(c => c.index));
    const unknown = [];
    for (const b of all) {
        if (!/^cm550_motion(Play|PlayWait)$/.test(b.type)) continue;
        const v = numIn(b, 'PAGE');
        if (v !== null && !known.has(v)) unknown.push([v, b.id]);
    }
    if (unknown.length) {
        out.push({level: 'info', msg: `모션 ${[...new Set(unknown.map(u => u[0]))].join(', ')}번은 ${isBuiltIn() ? 'MAX-E1 공식 예제 모션' : '열어 둔 모션 파일'}에 없어요. 실제 로봇은 CM-550에 그 번호의 모션이 있어야 움직이고, 가상 로봇은 움직이지 않습니다 (3D 탭의 모션 목록 참고).`, ids: unknown.map(u => u[1])});
    }

    // 연결된 로봇에 없는 다이나믹셀 ID
    const dev = ctx.device();
    const ids = dev.connected ? new Set(dev.motors.map(x => x.id)) : null;
    if (ids && ids.size) {
        const missing = new Map();
        for (const b of all) {
            if (!b.type.startsWith('cm550_dxl')) continue;
            for (const name of ['ID', 'ID1', 'ID2']) {
                const v = numIn(b, name);
                if (v !== null && v !== 254 && !ids.has(v)) missing.set(v, [...(missing.get(v) || []), b.id]);
            }
        }
        if (missing.size) {
            out.push({level: 'warn', msg: `다이나믹셀 ID ${[...missing.keys()].join(', ')}번은 연결된 로봇에 없어요 (찾은 ID: ${[...ids].sort((a, b) => a - b).join(', ')}). 모니터 탭에서 ID를 확인하세요.`, ids: [...missing.values()].flat()});
        }
    }
    const robotBlocks = all.filter(b => b.type.startsWith('cm550_') || b.type.startsWith('dmai_walk'));
    if (robotBlocks.length && !dev.connected) {
        out.push({level: 'info', msg: '로봇이 연결되어 있지 않아요. 위의 「USB 연결」·「블루투스 연결」 또는 「가상 로봇」을 먼저 누르세요.', ids: []});
    }

    // 마지막 오류
    const err = ctx.lastError();
    if (err) out.push({level: 'error', msg: `마지막 오류 — ${err}`, ids: []});
    return out;
};

// ───────────── AI 에 줄 글 ─────────────
const FACTS = `Facts about this platform (trust these):
- "Dynamic Makers" is a Scratch-style block editor for the ROBOTIS CM-550 controller and DYNAMIXEL motors (XL430, 2XL430). The listing shows each block as one line [Ln]; numbers in [ ] are values typed into the block.
- Motor positions are degrees 0-360; 180 is the centre (MAX-E1 straight standing pose). Which way + turns depends on how the motor is mounted.
- MAX-E1 humanoid: 12 joints, IDs 1-4 arms, 5-12 legs. Motion numbers are motion pages stored in the CM-550 (101 = stand straight, 107 = sit, 108 = wave hello, 150 → 152 → 154 = walk forward start / repeat / end).
- "모션 N번 재생" starts the motion and does NOT wait: the next block runs at once, and another motion block right after replaces it. "재생하고 끝날 때까지 기다리기" waits. A motion starts from the robot's current pose, so playing the pose it is already in shows no movement.
- Walking chains start → repeat → end pages without a pause ("모션 [150] 시작 → [152] 반복 → [154] 끝" block).
- "모든 다이나믹셀 준비하기" clears motor errors (e.g. overload) by rebooting and moves every joint to 180°.
- Loops that send motor commands should contain a short wait (0.05 s), otherwise the bus floods.
- Wheel mode (velocity) and joint mode (position) are different; position blocks do nothing on a motor in wheel mode.
- The 3D tab has a MuJoCo virtual MAX-E1; the "가상 로봇" button tests programs without a robot.`;

const systemPrompt = () => `You are a friendly, patient coding tutor for children (age 9-15) using the "Dynamic Makers" robot block editor.
Always answer in Korean.
Rules:
- Be short: at most 5 short sentences or a short bullet list.
- When you talk about a block, cite its line like [L4] (exactly this format).
- Explain WHY, then say which block to change and how, using the block words from the listing.
- Do not write a whole program. Do not invent blocks or functions. If you are not sure, say so.
${FACTS}`;

const contextText = (ws, rules, ctx) => {
    const {text} = blocksToText(ws);
    const dev = ctx.device();
    const parts = [
        `Robot: ${dev.connected ? `${ctx.robotLabel()} — DYNAMIXEL IDs ${dev.motors.map(x => x.id).join(', ') || '(not scanned)'}` : 'not connected'}`,
        `Block program:\n${text || '(empty)'}`
    ];
    // what the motion numbers in the program do
    const nums = new Set();
    for (const b of ws.getAllBlocks()) {
        if (!b.isShadow() && /^cm550_motion(Play|PlayWait|Chain)$/.test(b.type)) {
            for (const name of ['PAGE', 'START', 'LOOP', 'END']) {
                const v = numIn(b, name);
                if (v !== null) nums.add(v);
            }
        }
    }
    const notes = [...nums].map(n => [n, motionNote(n)]).filter(([, x]) => x.title);
    if (notes.length && isBuiltIn()) parts.push(`Motions used (MAX-E1 official examples):\n${notes.map(([n, x]) => `- ${n} ${x.title}: ${x.desc}`).join('\n')}`);
    const code = ctx.code();
    parts.push(`Generated Python (for reference):\n${code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).slice(0, 45).join('\n')}`);
    if (rules.length) parts.push(`Automatic checks found:\n${rules.map(r => `- ${r.msg}`).join('\n')}`);
    const err = ctx.lastError();
    if (err) parts.push(`Last error: ${err}`);
    return parts.join('\n\n');
};

// ───────────── 엔진 ─────────────
const Chrome = {
    key: 'chrome',
    opts () {
        return {expectedInputs: [{type: 'text', languages: ['en', LANG]}], expectedOutputs: [{type: 'text', languages: [LANG]}]};
    },
    async state () {
        if (!('LanguageModel' in self)) return {ok: false, why: 'chromeNo'};
        try {
            const a = await self.LanguageModel.availability(this.opts());
            if (a === 'unavailable') return {ok: false, why: 'chromeNoLang'};
            return {ok: true, installed: a === 'available', a};
        } catch (e) {
            return {ok: false, why: 'chromeNoLang'};
        }
    },
    async load (progress) {
        this.base = await self.LanguageModel.create({
            ...this.opts(),
            initialPrompts: [{role: 'system', content: systemPrompt()}],
            monitor (m) {
                m.addEventListener('downloadprogress', e => progress(Math.round((e.loaded || 0) * 100)));
            }
        });
    },
    async *ask (user) {
        const s = await this.base.clone();
        let prev = '';
        for await (const chunk of s.promptStreaming(user)) {
            // older builds stream the whole text so far, newer ones only the new piece
            const piece = chunk.startsWith(prev) && prev ? chunk.slice(prev.length) : chunk;
            prev = chunk.startsWith(prev) ? chunk : prev + chunk;
            yield piece;
        }
        if (s.destroy) s.destroy();
    }
};

const Open = {
    key: 'webllm',
    async gpu () {
        if (!navigator.gpu) return null;
        try {
            const a = await navigator.gpu.requestAdapter();
            return a ? {f16: a.features.has('shader-f16')} : null;
        } catch (e) {
            return null;
        }
    },
    async lib () {
        this._lib = this._lib || (await import(/* webpackIgnore: true */ webllmUrl()));
        return this._lib;
    },
    async modelId (size) {
        const g = await this.gpu();
        return g ? MODELS[size][g.f16 ? 'f16' : 'f32'] : null;
    },
    async installed (size) {
        const id = await this.modelId(size);
        if (!id) return false;
        try {
            return await (await this.lib()).hasModelInCache(id);
        } catch (e) {
            return false;
        }
    },
    async load (size, progress) {
        const id = await this.modelId(size);
        const lib = await this.lib();
        if (this.engine && this.id === id) return;
        if (this.engine && this.engine.unload) this.engine.unload();
        this.engine = await lib.CreateMLCEngine(id, {
            initProgressCallback: r => progress(Math.round((r.progress || 0) * 100), r.text)
        });
        this.id = id;
    },
    async remove (size) {
        const id = await this.modelId(size);
        if (id) await (await this.lib()).deleteModelAllInfoInCache(id);
        if (this.id === id) {
            if (this.engine && this.engine.unload) this.engine.unload();
            this.engine = null;
            this.id = null;
        }
    },
    async *ask (user) {
        const stream = await this.engine.chat.completions.create({
            messages: [{role: 'system', content: systemPrompt()}, {role: 'user', content: user}],
            stream: true, temperature: 0.3, max_tokens: 450
        });
        for await (const c of stream) yield (c.choices && c.choices[0] && c.choices[0].delta && c.choices[0].delta.content) || '';
    }
};

// ───────────── 화면 ─────────────
/**
 * @param {object} ctx
 * @param {object} ctx.workspace scratch-blocks workspace
 * @param {HTMLElement} ctx.button top-bar button that opens / closes the drawer
 * @param {HTMLElement} ctx.drawer the <aside>
 * @param {() => string} ctx.code generated Python
 * @param {() => object} ctx.device CM550Device ({connected, motors})
 * @param {() => string} ctx.robotLabel e.g. "3D 가상 로봇 (MAX-E1)"
 * @param {() => string} ctx.lastError last error message ('' if none)
 * @param {(text: string, kind?: string) => void} ctx.log output window
 */
export const initTutor = ctx => {
    const {workspace, drawer, button: btn} = ctx;
    let st = {open: false, engine: '', size: 'small'};
    try {
        st = {...st, ...JSON.parse(localStorage.getItem(STORE) || '{}')};
    } catch (e) { /* defaults */ }
    const keep = () => {
        try {
            localStorage.setItem(STORE, JSON.stringify(st));
        } catch (e) { /* ignore */ }
    };
    let active = null; // the loaded engine
    let busy = false;

    drawer.innerHTML = `
        <div class="tt-head"><b>🤖 ${T.title}</b><span class="tt-status"></span><button type="button" class="tt-x" aria-label="${T.close}">✕</button></div>
        <div class="tt-setup"></div>
        <div class="tt-actions">
            <button type="button" data-q="check">${T.check}</button>
            <button type="button" data-q="error">${T.error}</button>
            <button type="button" data-q="hint">${T.hint}</button>
        </div>
        <div class="tt-log" aria-live="polite"></div>
        <form class="tt-ask"><input type="text" maxlength="300" placeholder="${esc(T.ask)}"><button type="submit" class="primary">${T.send}</button></form>
        <p class="tt-note">${T.privacy}</p>`;
    const $ = s => drawer.querySelector(s);
    const log = $('.tt-log');

    const setOpen = on => {
        st.open = on;
        keep();
        drawer.hidden = !on;
        document.body.classList.toggle('tutor-open', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) renderSetup();
        if (ctx.onToggle) ctx.onToggle(on);
    };
    btn.addEventListener('click', () => setOpen(drawer.hidden));
    $('.tt-x').addEventListener('click', () => setOpen(false));

    // highlight blocks
    let glowT = 0;
    let glowing = [];
    const unglow = () => {
        for (const b of glowing) {
            const root = b.getSvgRoot && b.getSvgRoot();
            if (root) root.classList.remove('dm-glow');
        }
        glowing = [];
    };
    const glow = ids => {
        clearTimeout(glowT);
        unglow();
        glowing = ids.map(id => workspace.getBlockById(id)).filter(Boolean);
        for (const b of glowing) b.getSvgRoot().classList.add('dm-glow');
        if (glowing[0] && workspace.centerOnBlock) workspace.centerOnBlock(glowing[0].id);
        glowT = setTimeout(unglow, 8000);
    };
    let lineMap = [];
    log.addEventListener('click', e => {
        const a = e.target.closest('[data-ids]');
        if (!a) return;
        e.preventDefault();
        glow(a.dataset.ids.split(',').filter(Boolean));
    });
    const linkify = s => esc(s).replace(/\[L(\d+)(?:\s*[-–~]\s*L?(\d+))?\]/g, (m, a, b) => {
        const from = Number(a);
        const to = Number(b || a);
        const ids = lineMap.filter(l => l.n >= from && l.n <= to).map(l => l.id);
        return ids.length ? `<a href="#" class="tt-ln" data-ids="${ids.join(',')}">${b ? `${a}–${b}` : a}</a>` : m;
    })
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/\n/g, '<br>');

    const addMsg = (kind, html) => {
        const d = document.createElement('div');
        d.className = `tt-msg ${kind}`;
        d.innerHTML = html;
        log.appendChild(d);
        log.scrollTop = log.scrollHeight;
        return d;
    };

    // engine set-up
    const renderSetup = async () => {
        const box = $('.tt-setup');
        const chrome = await Chrome.state();
        const gpu = await Open.gpu();
        const sizes = gpu ? await Promise.all(['small', 'large'].map(async k => [k, await Open.installed(k)])) : [];
        const name = active ? (active === Chrome ? T.chrome : T[st.size]) : '';
        $('.tt-status').textContent = active ? T.ready(name) : '';
        box.innerHTML = `
            ${active ? '' : `<p class="tt-none">${T.none}</p>`}
            <details class="tt-eng" ${active ? '' : 'open'}>
                <summary>${T.setup}</summary>
                <div class="tt-opt">
                    <b>${T.webllm}</b><small>${T.webllmDesc}</small>
                    ${gpu ? sizes.map(([k, ok]) => `<div class="tt-row"><span>${T[k]}</span>
                        ${ok ? `<em>${T.installed}</em><button type="button" data-use="webllm:${k}">${T.use}</button><button type="button" data-rm="${k}" title="${T.remove}">🗑</button>` :
        `<button type="button" class="primary" data-use="webllm:${k}">${T.install}</button>`}</div>`).join('') :
        `<small class="tt-bad">${T.noGpu}</small>`}
                </div>
                <div class="tt-opt">
                    <b>${T.chrome}</b><small>${T.chromeDesc}</small>
                    ${chrome.ok ? `<div class="tt-row"><span>Gemini Nano</span>${chrome.installed ? `<em>${T.installed}</em>` : ''}
                        <button type="button" class="${chrome.installed ? '' : 'primary'}" data-use="chrome">${chrome.installed ? T.use : T.install}</button></div>` :
        `<small class="tt-bad">${T[chrome.why]}</small>`}
                </div>
                <div class="tt-prog" hidden><i></i><span></span></div>
                <small>${T.needNet}</small>
            </details>`;
    };
    $('.tt-setup').addEventListener('click', async e => {
        const u = e.target.closest('[data-use]');
        const r = e.target.closest('[data-rm]');
        if (r) {
            await Open.remove(r.dataset.rm);
            if (active === Open && st.size === r.dataset.rm) active = null;
            return renderSetup();
        }
        if (!u || busy) return;
        const use = u.dataset.use;
        const prog = $('.tt-prog');
        const bar = (p, txt) => {
            prog.hidden = false;
            prog.querySelector('i').style.width = `${p}%`;
            prog.querySelector('span').textContent = T.installing(p) + (txt ? ` · ${txt.slice(0, 60)}` : '');
        };
        busy = true;
        // ask the browser to keep the big model files
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
        try {
            if (use === 'chrome') {
                await Chrome.load(bar);
                active = Chrome;
                st.engine = 'chrome';
            } else {
                st.size = use.split(':')[1];
                await Open.load(st.size, bar);
                active = Open;
                st.engine = 'webllm';
            }
            keep();
            ctx.log(`🤖 AI 튜터 ${T.ready(use === 'chrome' ? T.chrome : T[st.size])}`, 'ok');
        } catch (err) {
            addMsg('err', esc(T.failed(err.message || err)));
        } finally {
            busy = false;
            renderSetup();
        }
    });

    // load the engine used last time (only when installed → no internet needed)
    const restore = async () => {
        try {
            if (st.engine === 'webllm' && (await Open.installed(st.size))) {
                $('.tt-status').textContent = T.loading;
                await Open.load(st.size, () => {});
                active = Open;
            } else if (st.engine === 'chrome' && (await Chrome.state()).installed) {
                await Chrome.load(() => {});
                active = Chrome;
            }
        } catch (e) {
            active = null;
        }
        renderSetup();
    };

    // questions
    const QUESTION = {
        check: 'Check my block program for mistakes. Explain the most important problem first and which block to change.',
        error: 'My program stopped with the error shown below. Explain in simple words what it means and how to fix it.',
        hint: 'Do not solve it for me. Give me one hint about what to try or improve next in my block program.'
    };
    const ask = async (kind, free) => {
        if (busy) return;
        const rules = ruleCheck(workspace, ctx);
        lineMap = blocksToText(workspace).lines;
        addMsg('me', esc(kind ? T[kind] : free));

        if (kind === 'check' || kind === 'error') {
            const shown = kind === 'error' ? rules.filter(r => r.level === 'error') : rules;
            if (kind === 'error' && !shown.length) {
                addMsg('rule', esc(T.noError));
                return;
            }
            addMsg('rule', `<b>${T.rules}</b><br>${shown.length ?
                shown.map(r => `<a href="#" class="tt-rule lv-${r.level}" data-ids="${r.ids.join(',')}">${r.level === 'error' ? '⛔' : r.level === 'warn' ? '⚠' : 'ℹ️'} ${esc(r.msg)}</a>`).join('<br>') :
                esc(T.noIssue)}`);
        }
        if (!active) {
            if (!kind || kind === 'hint') addMsg('sys', esc(T.none));
            return;
        }
        busy = true;
        const out = addMsg('ai', `<span class="tt-dots">${T.thinking}</span>`);
        let txt = '';
        try {
            const user = `${kind ? QUESTION[kind] : `Question: ${free}`}\n\n${contextText(workspace, rules, ctx)}`;
            for await (const piece of active.ask(user)) {
                txt += piece;
                // hide Qwen's thinking (<think>…</think>)
                out.innerHTML = linkify(txt.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim()) || `<span class="tt-dots">${T.thinking}</span>`;
                log.scrollTop = log.scrollHeight;
            }
        } catch (err) {
            out.innerHTML = esc(T.failed(err.message || err));
            out.classList.add('err');
        } finally {
            busy = false;
        }
    };
    $('.tt-actions').addEventListener('click', e => {
        const q = e.target.closest('[data-q]');
        if (q) ask(q.dataset.q);
    });
    $('.tt-ask').addEventListener('submit', e => {
        e.preventDefault();
        const inp = $('.tt-ask input');
        const q = inp.value.trim();
        if (!q) return;
        inp.value = '';
        ask(null, q);
    });

    drawer.hidden = !st.open;
    document.body.classList.toggle('tutor-open', st.open);
    btn.setAttribute('aria-pressed', st.open ? 'true' : 'false');
    if (st.engine) restore();
    else if (st.open) renderSetup();
    return {open: () => setOpen(true), ask, ruleCheck: () => ruleCheck(workspace, ctx), blocksToText: () => blocksToText(workspace)};
};
