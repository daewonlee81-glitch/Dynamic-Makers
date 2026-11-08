/**
 * Dynamic Makers (다이나믹 메이커스) — RoboMakers word-block editor for
 * ROBOTIS CM-550 + DYNAMIXEL, with a live Python view.
 *
 * Blocks: scratch-blocks.  Runtime: scratch-vm (window.VirtualMachine, loaded
 * by a <script> tag: CDN in the web build, vendor/ in the local build).
 * No stage or sprites: one hidden program target.
 */
import * as ScratchBlocks from 'scratch-blocks';
import {blockColors, ROBOT_STYLES, BRAND} from './theme';
import {makeToolbox, OPCODE_STYLE} from './toolbox';
import {makePromptHandler, makeProcedureEditor, confirmDialog} from './dialogs';
import {emptyProject, loadAutosave, saveAutosave, download, safeFileName, pickFile} from './project';
import {mountPythonPanel} from '../../scratch-cm550/src/python-panel-dom';
import {createExtension} from '../../scratch-cm550/src/extension';
import {SimTransport} from './sim-robot';
import {installMediaRewriter, MEDIA_PREFIX} from './media';
import {Monitor} from './monitor';
import {TeachPanel} from './teach';
import {AIEngine} from './ai/engine';
import {AIPanel} from './ai/ai-panel';
import {createAIExtension, AI_EXTENSION_ID, SKELETON_OPCODES} from './ai/ai-extension';
import {PoseTracker} from './ai/pose';
import {Walker} from './sim3d/walker';
import {SimPanel} from './sim3d/sim-panel';
import {MAXE1_JOINT_MAP} from './sim3d/maxe1-model';
import {gaitProgramXML} from './sim3d/gait-blocks';

const $ = id => document.getElementById(id);

// ---------------------------------------------------------------------------
// output console
// ---------------------------------------------------------------------------
const log = (text, kind = 'out') => {
    const box = $('console-lines');
    const line = document.createElement('div');
    line.className = `line ${kind}`;
    const d = new Date();
    const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
    line.innerHTML = `<span class="t">${time}</span>`;
    line.append(document.createTextNode(String(text)));
    box.append(line);
    while (box.childElementCount > 500) box.firstChild.remove();
    box.scrollTop = box.scrollHeight;
};

// ---------------------------------------------------------------------------
// VM + blocks
// ---------------------------------------------------------------------------
const VMClass = window.VirtualMachine && (window.VirtualMachine.default || window.VirtualMachine);
const vm = new VMClass();
window.dynamicmakers = {vm, ScratchBlocks}; // handy for debugging in the console

const theme = new ScratchBlocks.Theme('dynamicmakers', blockColors);
installMediaRewriter();
const workspaceOptions = {
    media: MEDIA_PREFIX,
    theme,
    scratchTheme: 'classic',
    zoom: {controls: true, wheel: true, pinch: true, startScale: 0.75},
    move: {wheel: true},
    grid: {spacing: 40, length: 2, colour: '#e1e7f0'},
    comments: true,
    collapse: false,
    sounds: false,
    trashcan: false,
    modalInputs: false
};

ScratchBlocks.ScratchMsgs.setLocale('ko');
const promptHandler = makePromptHandler(vm);
ScratchBlocks.dialog.setPrompt(promptHandler);
ScratchBlocks.ScratchVariables.setPromptHandler(promptHandler);

// ---- robot blocks from the cm550 extension ----------------------------------
const robotXML = {};

const restyleMenuToParent = type => {
    const def = ScratchBlocks.Blocks[type];
    if (!def || def.__dbWrapped) return;
    const init = def.init;
    def.init = function () {
        init.call(this);
        const setParent = this.setParent;
        // dropdown shadows take the colour of the block they sit in
        this.setParent = function (parent) {
            setParent.call(this, parent);
            const styleName = parent && parent.getStyleName && parent.getStyleName();
            if (styleName && styleName.startsWith('db_') && this.getStyleName() !== styleName) {
                this.setStyle(styleName);
            }
        };
    };
    def.__dbWrapped = true;
};

const definedExtensions = new Set();
const defineRobotBlocks = categoryInfo => {
    if (!categoryInfo || (categoryInfo.id !== 'cm550' && categoryInfo.id !== 'dmai')) return;
    // EXTENSION_ADDED and BLOCKSINFO_UPDATE both deliver the same definitions;
    // define once. Later updates (AI kind names) only refresh the palette XML.
    if (definedExtensions.has(categoryInfo.id)) {
        for (const b of categoryInfo.blocks || []) if (b.info && b.info.opcode) robotXML[b.info.opcode] = b.xml;
        return;
    }
    definedExtensions.add(categoryInfo.id);
    const json = [];
    for (const menu of categoryInfo.menus || []) {
        if (menu.json) json.push(menu.json);
    }
    for (const b of categoryInfo.blocks || []) {
        if (!b.json || !b.info || !b.info.opcode) continue;
        b.json.style = OPCODE_STYLE[b.info.opcode] || 'db_advanced';
        json.push(b.json);
        robotXML[b.info.opcode] = b.xml;
    }
    ScratchBlocks.defineBlocksWithJsonArray(json);
    for (const menu of categoryInfo.menus || []) if (menu.json) restyleMenuToParent(menu.json.type);
    const styles = Object.assign({cm550: ROBOT_STYLES.db_dxl, dmai: ROBOT_STYLES.db_ai}, ROBOT_STYLES);
    for (const [name, s] of Object.entries(styles)) {
        theme.setBlockStyle(name, s);
        theme.setBlockStyle(`${name}_selected`, {
            colourPrimary: s.colourQuaternary, colourSecondary: s.colourQuaternary,
            colourTertiary: s.colourQuaternary, colourQuaternary: s.colourQuaternary
        });
    }
};

vm.on('EXTENSION_ADDED', defineRobotBlocks);
vm.on('BLOCKSINFO_UPDATE', defineRobotBlocks);

// Register the CM-550 extension with the stock engine at runtime (the engine
// comes from npm/CDN and does not ship it built in).
const CM550Extension = createExtension({
    ArgumentType: window.VirtualMachine.ArgumentType || VMClass.ArgumentType,
    BlockType: window.VirtualMachine.BlockType || VMClass.BlockType,
    formatMessage: msg => msg.default
});
const ext = new CM550Extension(vm.runtime);
// show block errors in the output window (same message at most every 3 s)
{
    let lastMsg = '';
    let lastAt = 0;
    ext.onError = message => {
        const now = Date.now();
        if (message === lastMsg && now - lastAt < 3000) return;
        lastMsg = message;
        lastAt = now;
        log(`⚠ ${message}`, 'err');
    };
}
{
    const em = vm.extensionManager;
    const serviceName = em._registerInternalExtension(ext);
    em._loadedExtensions.set('cm550', serviceName); // projects listing 'cm550' load without fetching
}

// ---- AI 학습 engine + blocks ------------------------------------------------------
const poseTracker = new PoseTracker();
// 3D 시뮬레이터 / 걸음: the learned gait and policy are saved with the project
const simStore = {gait: null, policy: null};
let simPanel = null;
const walker = new Walker({
    device: ext.device,
    getJointMap: () => (simPanel ? simPanel.jointMap : MAXE1_JOINT_MAP),
    log: (t, k) => log(t, k)
});
const aiEngine = new AIEngine({device: ext.device, log: (t, k) => log(t, k), tracker: poseTracker});
{
    const AIExt = createAIExtension({
        ArgumentType: window.VirtualMachine.ArgumentType || VMClass.ArgumentType,
        BlockType: window.VirtualMachine.BlockType || VMClass.BlockType
    }, aiEngine, {
        log: (t, k) => log(t, k),
        isRunning: () => document.body.classList.contains('running'),
        tracker: poseTracker,
        device: ext.device,
        walker,
        simStore
    });
    const em = vm.extensionManager;
    const serviceName = em._registerInternalExtension(new AIExt(vm.runtime));
    em._loadedExtensions.set(AI_EXTENSION_ID, serviceName);
}

// ---- workspace -----------------------------------------------------------------
const workspace = ScratchBlocks.inject($('blocks'), Object.assign({toolbox: makeToolbox(robotXML)}, workspaceOptions));
window.dynamicmakers.workspace = workspace;

// After a scan the ID / module dropdowns get new labels ("3 · 2XL430 A축");
// refresh the text of dropdowns already placed in the workspace.
const refreshMotorLabels = () => {
    for (const block of workspace.getAllBlocks(false)) {
        for (const input of block.inputList) {
            for (const field of input.fieldRow) {
                if (!(field instanceof ScratchBlocks.FieldDropdown) ||
                    !(block.type === 'cm550_menu_dxlId' || field.name === 'MODULE')) continue;
                const value = field.getValue();
                const option = field.getOptions(false).find(o => o[1] === value);
                if (option) {
                    field.selectedOption = option;
                    field.forceRerender();
                }
            }
        }
    }
};
workspace.registerToolboxCategoryCallback('VARIABLE', ScratchBlocks.ScratchVariables.getVariablesCategory);
workspace.registerToolboxCategoryCallback('PROCEDURE', ScratchBlocks.ScratchProcedures.getProceduresCategory);
// Blockly rendered the palette with its own built-in generators during
// inject(); re-render now that the Scratch ones are registered.
workspace.getToolbox().forceRerender();
setTimeout(() => fitFlyoutSoon(), 0);

// scratch-blocks fixes the palette at 250 px, so long blocks such as
// "다이나믹셀 [1 · 2XL430 A축] 을(를) …" were cut off. Widen it to the widest
// block (capped so the work area keeps most of the screen).
const FLYOUT_MIN = 250;
let flyoutWidth = FLYOUT_MIN;
const fitFlyout = () => {
    const flyout = workspace.getFlyout();
    const fws = flyout && flyout.getWorkspace();
    if (!fws) return;
    let right = 0;
    for (const b of fws.getTopBlocks(false)) right = Math.max(right, b.getBoundingRectangle().right);
    const cap = Math.max(FLYOUT_MIN, Math.round(($('blocks').clientWidth - 60) * 0.55));
    const want = Math.max(FLYOUT_MIN, Math.min(cap, Math.ceil(right * fws.scale + 20)));
    if (want === flyoutWidth && flyout.getWidth() === want) return;
    flyoutWidth = want;
    flyout.getWidth = () => flyoutWidth;
    if (flyout.width_ !== undefined) flyout.width_ = flyoutWidth;
    if (flyout.position) flyout.position();
    resizeBlocks();
};
let fitTimer = null;
const fitFlyoutSoon = () => {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(() => {
        try { fitFlyout(); } catch (e) { console.warn('[flyout] fit failed:', e); } // eslint-disable-line no-console
    }, 150);
};
window.addEventListener('resize', fitFlyoutSoon);

const refreshToolbox = () => {
    try {
        workspace.updateToolbox(makeToolbox(robotXML, {motors: ext.device.motors, desc: ext.device.motorDesc}));
        // re-run the dynamic category generators (variables / my blocks)
        workspace.getToolbox().forceRerender();
        fitFlyoutSoon();
    } catch (e) {
        // toolbox refresh is cosmetic; keep editing usable
        console.warn('[toolbox] refresh failed:', e); // eslint-disable-line no-console
    }
};
let toolboxTimer = null;
const scheduleToolboxRefresh = () => {
    clearTimeout(toolboxTimer);
    toolboxTimer = setTimeout(() => {
        // rebuilding the palette mid-drag would cancel the student's drag: wait
        if (workspace.isDragging && workspace.isDragging()) scheduleToolboxRefresh();
        else refreshToolbox();
    }, workspace.isDragging && workspace.isDragging() ? 300 : 0);
};

ScratchBlocks.ScratchProcedures.externalProcedureDefCallback = makeProcedureEditor(workspaceOptions, () => {
    scheduleToolboxRefresh();
});

const E = ScratchBlocks.Events;
workspace.addChangeListener(event => {
    if (event.type === E.VAR_CREATE || event.type === E.VAR_RENAME || event.type === E.VAR_DELETE ||
        (event.type === E.BLOCK_DELETE && event.oldJson && event.oldJson.type === 'procedures_definition') ||
        (event.type === E.BLOCK_CREATE && event.json && event.json.type === 'procedures_definition' &&
            !event.recordUndo)) {
        scheduleToolboxRefresh();
    }
});
workspace.addChangeListener(vm.blockListener);
workspace.getFlyout().getWorkspace()
    .addChangeListener(vm.flyoutBlockListener);

vm.on('workspaceUpdate', data => {
    try {
        E.disable();
        const dom = ScratchBlocks.utils.xml.textToDom(data.xml);
        ScratchBlocks.clearWorkspaceAndLoadFromXml(dom, workspace);
    } catch (e) {
        log(`블록을 불러오는 중 문제가 있었습니다: ${e.message}`, 'err');
    } finally {
        E.enable();
    }
    workspace.clearUndo();
    scheduleToolboxRefresh();
    if (typeof teach !== 'undefined') setTimeout(() => teach.render()); // eslint-disable-line no-use-before-define
});

vm.on('SCRIPT_GLOW_ON', d => ScratchBlocks.glowStack(d.id, true));
vm.on('SCRIPT_GLOW_OFF', d => ScratchBlocks.glowStack(d.id, false));
vm.on('VISUAL_REPORT', d => ScratchBlocks.reportValue(d.id, d.value));

const resizeBlocks = () => {
    if (ScratchBlocks.svgResize) ScratchBlocks.svgResize(workspace);
    else window.dispatchEvent(new Event('resize'));
};

// ---- Python panel -----------------------------------------------------------
const python = mountPythonPanel(vm, {host: $('python'), accent: BRAND, onToggle: () => setTimeout(resizeBlocks)});

// ---- automatic per-model handling after every motor scan ---------------------
ext.device.onMotorsChange = (motors, desc) => {
    refreshMotorLabels();
    scheduleToolboxRefresh();
    if (typeof monitor !== 'undefined') monitor.renderMotors(); // eslint-disable-line no-use-before-define
    if (typeof teach !== 'undefined') teach.render(); // eslint-disable-line no-use-before-define
    if (!motors.length) return;
    const counts = {};
    for (const m of motors) {
        const kind = desc.labels[m.id].replace(/ [AB]축$/, ''); // "2XL430 A축" → "2XL430"
        counts[kind] = (counts[kind] || 0) + 1;
    }
    log(`다이나믹셀 ${motors.length}개 인식: ${Object.entries(counts).map(([k, v]) => `${k} ${v}개`).join(', ')}` +
        (desc.pairs.length ? ` · 2축 모듈 ${desc.pairs.length}개 (A/B축 자동 짝)` : ''), 'ok');
    for (const w of desc.warnings) log(`⚠ ${w}`, 'err');
};

// ---- monitor (alternative right-hand view) ----------------------------------
const monitor = new Monitor({
    host: $('monitor'),
    device: ext.device,
    isRunning: () => document.body.classList.contains('running'),
    log: (text, kind) => log(text, kind)
});

// ---- 자세 가르치기 (teach poses by hand) -------------------------------------
// the pose list is created through the editor so it appears in the 변수 palette
ext.onCreateList = (name, id) => {
    const map = workspace.getVariableMap ? workspace.getVariableMap() : null;
    if (map && map.createVariable) map.createVariable(name, 'list', id);
    else workspace.createVariable(name, 'list', id);
};
/** Put "when flag clicked → pose 1 → pose 2 …" into the workspace. */
const addPoseScript = (numbers, seconds) => {
    const n = v => `<shadow type="math_number"><field name="NUM">${v}</field></shadow>`;
    let inner = '';
    for (let i = numbers.length - 1; i >= 0; i--) {
        inner = `<block type="cm550_posePlay"><value name="N">${n(numbers[i])}</value>` +
            `<value name="SECS">${n(seconds)}</value>${inner ? `<next>${inner}</next>` : ''}</block>`;
    }
    let x = 40;
    let y = 40;
    try {
        const view = workspace.getMetricsManager().getViewMetrics(true);
        x = view.left + 40;
        y = view.top + 40;
        // below everything already in the workspace, so nothing overlaps
        if (workspace.getTopBlocks(false).length) {
            const box = workspace.getBlocksBoundingBox();
            x = box.left;
            y = box.bottom + 48;
        }
    } catch (e) { /* default position */ }
    const xml = `<xml><block type="event_whenflagclicked" x="${Math.round(x)}" y="${Math.round(y)}">` +
        `<next>${inner}</next></block></xml>`;
    const dom = ScratchBlocks.utils.xml.textToDom(xml);
    const ids = ScratchBlocks.Xml.domToWorkspace(dom, workspace);
    if (ids && ids[0]) {
        const top = workspace.getBlockById(ids[0]);
        if (top && top.select) top.select();
        if (top && workspace.centerOnBlock) workspace.centerOnBlock(top.id);
    }
};
const teach = new TeachPanel({
    host: $('teach'),
    ext,
    log: (text, kind) => log(text, kind),
    isRunning: () => document.body.classList.contains('running'),
    addScript: addPoseScript
});
ext.onPosesChange = () => teach.render();

// ---- AI 학습 panel ---------------------------------------------------------------
/** "AI가 [종류] 을(를) 알아봤을 때 → [종류] 말하기" for every kind. */
const addAIScript = kinds => {
    const hat = robotXML.aiWhen || '';
    const shadow = /<shadow type="([^"]+)"><field name="([^"]+)">/.exec(hat);
    if (!shadow) return;
    const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let x = 40;
    let y = 40;
    try {
        if (workspace.getTopBlocks(false).length) {
            const box = workspace.getBlocksBoundingBox();
            x = box.left;
            y = box.bottom + 48;
        }
    } catch (e) { /* default position */ }
    const stacks = kinds.map((k, i) => `<block type="dmai_aiWhen" x="${Math.round(x + (i * 330))}" y="${Math.round(y)}">` +
        `<value name="CLASS"><shadow type="${shadow[1]}"><field name="${shadow[2]}">${esc(k)}</field></shadow></value>` +
        `<next><block type="looks_say"><value name="MESSAGE"><shadow type="text"><field name="TEXT">${esc(k)}</field>` +
        '</shadow></value></block></next></block>').join('');
    ScratchBlocks.Xml.domToWorkspace(ScratchBlocks.utils.xml.textToDom(`<xml>${stacks}</xml>`), workspace);
    log('종류마다 "알아봤을 때 → 말하기" 블록을 넣었습니다. ▶ 실행을 누르고 AI에게 보여 주세요.', 'ok');
};
let kindsTimer = null;
const refreshAIKinds = () => {
    clearTimeout(kindsTimer);
    kindsTimer = setTimeout(() => {
        try {
            vm.extensionManager.refreshBlocks();
        } catch (e) { /* palette defaults only */ }
        scheduleToolboxRefresh();
        scheduleAutosave(); // eslint-disable-line no-use-before-define
    }, 200);
};
const aiPanel = new AIPanel({
    host: $('ai'),
    engine: aiEngine,
    log: (text, kind) => log(text, kind),
    onKindsChange: refreshAIKinds,
    addScript: addAIScript,
    addFollowScript: () => addFollowScript(), // eslint-disable-line no-use-before-define
    tracker: poseTracker
});
{
    // save examples with the program when collecting stops
    let wasCollecting = -1;
    aiEngine.onUpdate(e => {
        if (wasCollecting >= 0 && e.collecting < 0) {
            dirty = true; // eslint-disable-line no-use-before-define
            scheduleAutosave(); // eslint-disable-line no-use-before-define
        }
        wasCollecting = e.collecting;
    });
}
// ▶ 실행 with AI / skeleton blocks in the program: start them automatically
const SKELETON = new Set(SKELETON_OPCODES.map(op => `dmai_${op}`));
vm.on('PROJECT_RUN_START', () => {
    const t = vm.editingTarget;
    const ops = t ? Object.values(t.blocks._blocks).map(b => b.opcode) : [];
    const usesAI = ops.some(op => op.startsWith('dmai_ai'));
    if (usesAI && aiEngine.ready && !aiEngine.running) {
        aiEngine.start().catch(e => log(`⚠ AI 인식을 시작할 수 없습니다: ${e.message}`, 'err'));
    }
    if (ops.some(op => SKELETON.has(op)) && !ops.includes('dmai_skelSwitch')) {
        log('몸 동작 추적을 시작합니다. 카메라 앞에 서 주세요. (처음에는 모델 준비에 몇 초 걸립니다)');
        poseTracker.acquire('blocks').catch(e => log(`⚠ 몸 동작을 추적할 수 없습니다: ${e.message}`, 'err'));
    }
});
vm.on('PROJECT_RUN_STOP', () => {
    poseTracker.release('blocks');
    if (vm.runtime.ext_dmai) vm.runtime.ext_dmai._last = {};
});
/** "깃발 → 무한 반복 { 모터 a 가 오른쪽 어깨 따라 하기, 모터 b 가 왼쪽 어깨 따라 하기 }" */
const addFollowScript = () => {
    const ids = ext.device.motors.map(m => m.id);
    const a = ids[0] || 1;
    const b = ids[1] || 2;
    // JOINT / DIR menus are plain fields (no reporter slot)
    const n = v => `<shadow type="math_number"><field name="NUM">${v}</field></shadow>`;
    const follow = (id, joint, dir, next) => `<block type="dmai_skelFollow"><value name="ID">${n(id)}</value>` +
        `<field name="JOINT">${joint}</field><value name="CENTER">${n(180)}</value><field name="DIR">${dir}</field>` +
        `${next ? `<next>${next}</next>` : ''}</block>`;
    let x = 40;
    let y = 40;
    try {
        if (workspace.getTopBlocks(false).length) {
            const box = workspace.getBlocksBoundingBox();
            x = box.left;
            y = box.bottom + 48;
        }
    } catch (e) { /* default position */ }
    const xml = `<xml><block type="event_whenflagclicked" x="${Math.round(x)}" y="${Math.round(y)}"><next>` +
        '<block type="control_forever"><statement name="SUBSTACK">' +
        follow(a, 'rightShoulder', '1', follow(b, 'leftShoulder', '-1')) +
        '</statement></block></next></block></xml>';
    ScratchBlocks.Xml.domToWorkspace(ScratchBlocks.utils.xml.textToDom(xml), workspace);
    log(`따라 하기 예시를 넣었습니다: 다이나믹셀 ${a} ← 오른쪽 어깨, ${b} ← 왼쪽 어깨. ` +
        '로봇 어깨 모터의 ID·가운데 각도·방향을 맞게 바꾼 뒤 ▶ 실행하세요.', 'ok');
};

const VIEWS = ['python', 'monitor', 'teach', 'ai', 'sim'];
const showView = view => {
    for (const v of VIEWS) {
        const panel = $(v);
        if (panel) panel.hidden = v !== view;
        const btn = $(`view-${v}`);
        if (btn) btn.classList.toggle('active', v === view);
    }
    monitor.setVisible(view === 'monitor');
    teach.setVisible(view === 'teach');
    if (typeof aiPanel !== 'undefined') aiPanel.setVisible(view === 'ai'); // eslint-disable-line no-use-before-define
    if (simPanel) simPanel.setVisible(view === 'sim');
    setTimeout(resizeBlocks);
};
for (const v of VIEWS) {
    const btn = $(`view-${v}`);
    if (btn) btn.addEventListener('click', () => showView(v));
}

// ---------------------------------------------------------------------------
// run / stop
// ---------------------------------------------------------------------------
const runBtn = $('run');
const stopBtn = $('stop');
runBtn.addEventListener('click', () => {
    if (!ext.device.connected) log('CM-550이 연결되지 않았습니다. 로봇 블록은 동작하지 않습니다.', 'warn');
    vm.greenFlag();
});
stopBtn.addEventListener('click', () => vm.stopAll());
vm.on('PROJECT_RUN_START', () => document.body.classList.add('running'));
vm.on('PROJECT_RUN_STOP', () => document.body.classList.remove('running'));

// "말하기" blocks print to the output console (and map to print() in Python)
vm.runtime.on('SAY', (target, type, text) => {
    if (text !== '' && text !== null && typeof text !== 'undefined') log(text);
});

// keyboard -> "when key pressed" / "key pressed?"
const isTyping = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable ||
    (t.closest && t.closest('.blocklyWidgetDiv, .blocklyDropDownDiv, .db-overlay')));
for (const type of ['keydown', 'keyup']) {
    document.addEventListener(type, e => {
        if (isTyping(e.target)) return;
        vm.postIOData('keyboard', {key: e.key, isDown: type === 'keydown'});
        if (e.key === ' ' && e.target === document.body) e.preventDefault();
    });
}

// ---------------------------------------------------------------------------
// CM-550 connection
// ---------------------------------------------------------------------------
const status = $('status');
const setStatus = (state, text) => {
    status.dataset.state = state;
    status.textContent = text;
    $('disconnect').hidden = state !== 'connected';
    $('connect-usb').hidden = state === 'connected';
    $('connect-ble').hidden = state === 'connected';
    $('connect-sim').hidden = state === 'connected';
};
const KIND_NAME = {usb: 'USB', ble: '블루투스', sim: '가상 로봇', sim3d: '3D 가상 로봇'};
const connect = async (kind, transport) => {
    setStatus('connecting', '연결 중…');
    await ext._connect(transport || (kind === 'sim' ? new SimTransport(text => log(`🤖 ${text}`, 'sim')) : kind));
    if (ext.device.connected) {
        setStatus('connected', `${KIND_NAME[kind]} 연결됨`);
        log(kind === 'sim3d' ? '3D 가상 로봇(MuJoCo)에 연결되었습니다. 블록·가르치기·AI가 모두 이 로봇으로 동작합니다.' : kind === 'sim' ?
            '가상 로봇에 연결되었습니다. 로봇이 할 동작이 이 창에 표시됩니다.' :
            `CM-550이 ${KIND_NAME[kind]}로 연결되었습니다.`, 'ok');
        if (ext.device.lastError) log(ext.device.lastError, 'warn');
        monitor.onConnectionChange(true, KIND_NAME[kind]);
        teach.render();
        if (simPanel) simPanel._status();
    } else {
        setStatus('idle', '연결 안 됨');
        const msg = ext.lastError();
        if (msg && !/No port selected|User cancelled|cancel/i.test(msg)) log(`연결 실패: ${msg}`, 'err');
    }
};
$('connect-usb').addEventListener('click', () => connect('usb'));
$('connect-ble').addEventListener('click', () => connect('ble'));
$('connect-sim').addEventListener('click', () => connect('sim'));
$('disconnect').addEventListener('click', () => ext.disconnect());
vm.runtime.on('PERIPHERAL_DISCONNECTED', () => {
    walker.stop();
    if (simPanel) setTimeout(() => simPanel._status());
    setStatus('idle', '연결 안 됨');
    ext.device.setMotors([]);
    monitor.onConnectionChange(false);
    teach.relaxed.clear();
    teach.render();
    log('CM-550 연결이 끊어졌습니다.', 'warn');
});
// USB/BLE need browser support AND permission for this frame (a sandboxed
// preview frame usually blocks them).
const policyAllows = feature => {
    const policy = document.permissionsPolicy || document.featurePolicy;
    try {
        return policy ? policy.allowsFeature(feature) : true;
    } catch (e) {
        return true;
    }
};
const hwBlocked = [];
for (const [id, api, feature] of [['connect-usb', 'serial', 'serial'], ['connect-ble', 'bluetooth', 'bluetooth']]) {
    if (!(api in navigator)) {
        $(id).disabled = true;
        $(id).title = '이 브라우저에서는 지원되지 않습니다. Chrome 또는 Edge를 사용하세요.';
        hwBlocked.push(id);
    } else if (!policyAllows(feature)) {
        $(id).disabled = true;
        $(id).title = '이 미리보기 화면에서는 USB/블루투스가 차단되어 있습니다. 앱 주소로 직접 열어 주세요.';
        hwBlocked.push(id);
    }
}

// ---------------------------------------------------------------------------
// project files
// ---------------------------------------------------------------------------
const nameInput = $('project-name');
let dirty = false;

// vm.loadProject validates with a JSON-schema library that compiles code at
// runtime; under a strict content-security policy (no eval) that fails, so
// fall back to the engine's own deserializer for JSON projects.
/** Project JSON with the AI examples (the engine ignores the extra key). */
const projectJSON = () => {
    const json = vm.toJSON();
    const ai = aiEngine.serialize();
    if (!ai && !simStore.gait && !simStore.policy) return json;
    const obj = JSON.parse(json);
    obj.dynamicmakers = {};
    if (ai) obj.dynamicmakers.ai = ai;
    if (simStore.gait) obj.dynamicmakers.gait = simStore.gait;
    if (simStore.policy) obj.dynamicmakers.policy = simStore.policy;
    return JSON.stringify(obj);
};
/** Take the AI part out of a project before the engine sees it. */
const takeAIData = data => {
    if (data instanceof ArrayBuffer) return {data, ai: null};
    let obj = data;
    if (typeof data === 'string') {
        try {
            obj = JSON.parse(data);
        } catch (e) {
            return {data, ai: null};
        }
    }
    if (!obj || typeof obj !== 'object') return {data, ai: null};
    const ai = obj.dynamicmakers && obj.dynamicmakers.ai;
    simStore.gait = (obj.dynamicmakers && obj.dynamicmakers.gait) || null;
    simStore.policy = (obj.dynamicmakers && obj.dynamicmakers.policy) || null;
    if (simPanel) setTimeout(() => simPanel._status());
    if (obj.dynamicmakers) {
        obj = Object.assign({}, obj);
        delete obj.dynamicmakers;
    }
    return {data: obj, ai: ai || null};
};

const loadIntoVM = async data => {
    try {
        await vm.loadProject(data);
    } catch (e) {
        if (data instanceof ArrayBuffer) {
            throw new Error('이 화면에서는 .sb3 파일을 열 수 없습니다. .dmk 또는 .json 파일을 사용하세요.');
        }
        const json = typeof data === 'string' ? JSON.parse(data) : data;
        if (!json || !Array.isArray(json.targets)) throw e;
        await vm.deserializeProject(Object.assign({}, json, {projectVersion: 3}), null);
        vm.runtime.handleProjectLoaded();
    }
};

const loadProject = async (data, name) => {
    vm.stopAll();
    const parts = takeAIData(data);
    await loadIntoVM(parts.data);
    aiEngine.load(parts.ai);
    refreshAIKinds();
    const robot = vm.runtime.targets.find(t => !t.isStage) || vm.runtime.getTargetForStage();
    vm.setEditingTarget(robot.id);
    if (name !== undefined) nameInput.value = name;
    dirty = false;
    python.regenerate();
};

$('new').addEventListener('click', async () => {
    if (dirty && !(await confirmDialog('새로 만들기', '지금 작업을 지우고 새로 시작할까요? 저장하지 않은 내용은 사라집니다.', '새로 만들기'))) return;
    await loadProject(emptyProject(), '새 프로그램');
    log('새 프로그램을 시작했습니다.', 'ok');
});
$('open').addEventListener('click', async () => {
    const file = await pickFile();
    if (!file) return;
    try {
        await loadProject(file.data, file.name);
        log(`'${file.name}' 을(를) 열었습니다.`, 'ok');
    } catch (e) {
        log(`파일을 열 수 없습니다: ${e.message || e}`, 'err');
    }
});
// Inside a claude.ai artifact frame, files go through the `downloads`
// capability, which only accepts some extensions: .json for programs and
// .txt for Python there; .dmk / .py everywhere else.
const hostDownloads = () => (window.claude && typeof window.claude.use === 'function' ?
    window.claude.use('downloads') : Promise.resolve(undefined));
const saveFile = async (base, ext, sandboxExt, content, type) => {
    const host = await hostDownloads();
    if (host === undefined) {
        download(`${base}.${ext}`, content, type);
        return `.${ext}`;
    }
    if (!host) throw new Error('이 화면에서는 파일 저장을 사용할 수 없습니다. Python은 복사 버튼을 이용하세요.');
    try {
        await host.save({filename: `${base}.${sandboxExt}`, data: content});
    } catch (e) {
        if (e && e.code === 'declined') return null;
        throw new Error(e && e.message ? e.message : String(e));
    }
    return `.${sandboxExt}`;
};
// ---- 3D 시뮬레이터 (MuJoCo) ---------------------------------------------------------
const addWalkScript = (detailed = true) => {
    const n = v => `<shadow type="math_number"><field name="NUM">${v}</field></shadow>`;
    let x = 40;
    let y = 40;
    try {
        if (workspace.getTopBlocks(false).length) {
            const box = workspace.getBlocksBoundingBox();
            x = box.left;
            y = box.bottom + 48;
        }
    } catch (e) { /* default position */ }
    if (detailed) {
        const prog = gaitProgramXML(simPanel.gait, simPanel.jointMap, {x, y});
        ScratchBlocks.Xml.domToWorkspace(ScratchBlocks.utils.xml.textToDom(prog.xml), workspace);
        log(`학습한 걸음을 모터별 블록으로 넣었습니다: 한 걸음 = 자세 ${prog.frames}개(각 ${prog.dt}초), ` +
            `자세마다 모터 ${simPanel.jointMap.length}개의 목표 각도. Python 탭에서 같은 코드를 볼 수 있습니다. ` +
            '실제 로봇에서는 "느리게" 값을 1.5~2로 키워 시작하세요.', 'ok');
        return;
    }
    const xml = `<xml><block type="event_whenflagclicked" x="${Math.round(x)}" y="${Math.round(y)}"><next>` +
        `<block type="dmai_walkGait"><value name="SECS">${n(10)}</value><value name="SLOW">${n(1)}</value></block>` +
        '</next></block></xml>';
    ScratchBlocks.Xml.domToWorkspace(ScratchBlocks.utils.xml.textToDom(xml), workspace);
    log('"학습한 걸음으로 10 초 걷기" 블록을 넣었습니다. 실제 로봇에서는 "느리게" 값을 1.5~2로 키워 시작하세요.', 'ok');
};
simPanel = window.dynamicmakers.simPanel = new SimPanel({
    host: $('sim'),
    log: (t, k) => log(t, k),
    device: ext.device,
    walker,
    store: simStore,
    onStoreChange: () => scheduleAutosave(),
    makeTransport: physics => new SimTransport(text => log(`🤖 ${text}`, 'sim'), {physics}),
    connect: transport => connect('sim3d', transport),
    disconnect: () => ext.disconnect(),
    addWalkScript,
    saveText: async (name, text) => {
        try {
            const [base, ext2] = name.split('.');
            const done = await saveFile(base, ext2, 'txt', text, 'application/xml');
            if (done) log(`${base}${done} 파일을 저장했습니다.`, 'ok');
        } catch (e) {
            log(e.message, 'err');
        }
    }
});

$('save').addEventListener('click', async () => {
    try {
        const ext = await saveFile(safeFileName(nameInput.value), 'dmk', 'json', projectJSON(), 'application/json');
        if (!ext) return;
        dirty = false;
        log(`프로그램을 저장했습니다 (${ext}).`, 'ok');
    } catch (e) {
        log(e.message, 'err');
    }
});
$('save-py').addEventListener('click', async () => {
    try {
        const ext = await saveFile(safeFileName(nameInput.value), 'py', 'txt', python.getCode(), 'text/x-python');
        if (ext) log(`Python 코드를 저장했습니다 (${ext}).`, 'ok');
    } catch (e) {
        log(e.message, 'err');
    }
});

let autosaveTimer = null;
const scheduleAutosave = () => {
    dirty = true;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => saveAutosave(nameInput.value, projectJSON()), 800);
};
vm.on('PROJECT_CHANGED', scheduleAutosave);
nameInput.addEventListener('input', scheduleAutosave);
window.addEventListener('beforeunload', () => saveAutosave(nameInput.value, projectJSON()));

$('console-clear').addEventListener('click', () => {
    $('console-lines').textContent = '';
});
// ---- resizable output window (drag its top edge) and monitor panel ---------
const STORE = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : Number(v); } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) { /* storage unavailable */ } }
};
const dragResize = (handle, {onMove, onEnd}) => {
    handle.addEventListener('pointerdown', down => {
        down.preventDefault();
        handle.setPointerCapture(down.pointerId);
        document.body.classList.add('dm-resizing');
        const move = ev => { onMove(ev, down); resizeBlocks(); };
        const up = () => {
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', up);
            handle.removeEventListener('pointercancel', up);
            document.body.classList.remove('dm-resizing');
            onEnd();
            resizeBlocks();
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
        handle.addEventListener('pointercancel', up);
    });
};
{
    const MIN_H = 70;
    const maxH = () => Math.round(window.innerHeight * 0.7);
    let consoleH = Math.min(maxH(), Math.max(MIN_H, STORE.get('dm.consoleH', 150)));
    const applyH = () => document.documentElement.style.setProperty('--console-h', `${consoleH}px`);
    applyH();
    const handle = document.createElement('div');
    handle.className = 'dm-hresizer';
    handle.title = '끌어서 출력 창 높이 조절 (두 번 클릭하면 원래대로)';
    $('console').prepend(handle);
    let startH = consoleH;
    handle.addEventListener('pointerdown', () => {
        startH = consoleH;
        document.body.classList.remove('console-collapsed');
    });
    dragResize(handle, {
        onMove: (ev, down) => {
            consoleH = Math.min(maxH(), Math.max(MIN_H, startH + (down.clientY - ev.clientY)));
            applyH();
        },
        onEnd: () => STORE.set('dm.consoleH', consoleH)
    });
    handle.addEventListener('dblclick', () => {
        consoleH = 150; applyH(); STORE.set('dm.consoleH', consoleH); resizeBlocks();
    });
    window.addEventListener('resize', () => {
        if (consoleH > maxH()) { consoleH = maxH(); applyH(); }
    });
}
for (const panelId of ['monitor', 'teach', 'ai']) {
    const mon = $(panelId);
    let monW = STORE.get('dm.monitorW', 0);
    const applyW = () => { if (monW) mon.style.width = `${monW}px`; };
    applyW();
    const handle = document.createElement('div');
    handle.className = 'dm-vresizer';
    handle.title = '끌어서 패널 폭 조절';
    mon.prepend(handle);
    let startW = 0;
    handle.addEventListener('pointerdown', () => { startW = mon.getBoundingClientRect().width; });
    dragResize(handle, {
        onMove: (ev, down) => {
            monW = Math.round(Math.max(300, Math.min(window.innerWidth * 0.7, startW + (down.clientX - ev.clientX))));
            applyW();
        },
        onEnd: () => STORE.set('dm.monitorW', monW)
    });
}

$('console-toggle').addEventListener('click', () => {
    document.body.classList.toggle('console-collapsed');
    setTimeout(resizeBlocks);
});

// ---------------------------------------------------------------------------
// start
// ---------------------------------------------------------------------------
(async () => {
    vm.start();
    const saved = loadAutosave();
    try {
        if (saved && saved.project) {
            await loadProject(saved.project, saved.name || '새 프로그램');
            log('이전에 작업하던 프로그램을 불러왔습니다.', 'ok');
        } else {
            await loadProject(emptyProject(), '새 프로그램');
        }
    } catch (e) {
        await loadProject(emptyProject(), '새 프로그램');
    }
    setStatus('idle', '연결 안 됨');
    if (hwBlocked.length === 2) {
        log('이 화면에서는 USB·블루투스를 쓸 수 없습니다. [가상 로봇]으로 프로그램을 시험해 보세요.', 'warn');
    }
    resizeBlocks();
    document.body.classList.add('ready');
})();
