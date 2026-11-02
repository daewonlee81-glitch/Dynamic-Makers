/**
 * Modal dialogs that scratch-blocks delegates to the host app:
 *  - text prompt (new variable / list / message, rename)
 *  - custom block ("내 블록") editor
 */
import * as ScratchBlocks from 'scratch-blocks';

const el = (tag, attrs = {}, children = []) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v);
    }
    for (const c of [].concat(children)) if (c) e.append(c);
    return e;
};

const openModal = (title, body, buttons, onClose) => {
    const box = el('div', {class: 'db-modal'}, [
        el('div', {class: 'db-modal-title', text: title}),
        body,
        el('div', {class: 'db-modal-buttons'}, buttons)
    ]);
    const overlay = el('div', {class: 'db-overlay'}, box);
    overlay.addEventListener('mousedown', e => {
        if (e.target === overlay) close(); // eslint-disable-line no-use-before-define
    });
    const keyHandler = e => {
        if (e.key === 'Escape') close(); // eslint-disable-line no-use-before-define
    };
    function close () {
        document.removeEventListener('keydown', keyHandler, true);
        overlay.remove();
        if (onClose) onClose();
    }
    document.addEventListener('keydown', keyHandler, true);
    document.body.append(overlay);
    return {overlay, close};
};

const TITLES = {
    '': '새로운 변수',
    'list': '새로운 리스트',
    'broadcast_msg': '새로운 메시지'
};

/**
 * Implements scratch-blocks' prompt contract:
 * (message, defaultValue, callback, optTitle, optVarType)
 * callback(text, existingNamesOfType, {scope, isCloud})
 * @param {object} vm scratch-vm instance
 * @returns {Function} prompt handler
 */
export const makePromptHandler = vm => (message, defaultValue, callback, optTitle, optVarType) => {
    const varType = typeof optVarType === 'string' ? optVarType : '';
    const title = optTitle || TITLES[varType] || '이름 입력';
    const input = el('input', {class: 'db-input', type: 'text', value: defaultValue || ''});
    let done = false;
    const finish = value => {
        if (done) return;
        done = true;
        modal.close(); // eslint-disable-line no-use-before-define
        // A single program target: variables are created globally so they
        // survive project reloads and appear in the Python panel header.
        callback(value, vm.runtime.getAllVarNamesOfType(varType), {scope: 'global', isCloud: false});
    };
    const ok = el('button', {class: 'db-btn db-btn-primary', text: '확인', onclick: () => finish(input.value)});
    const cancel = el('button', {class: 'db-btn', text: '취소', onclick: () => finish(null)});
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') finish(input.value);
    });
    const modal = openModal(title, el('div', {class: 'db-modal-body'}, [
        el('label', {class: 'db-label', text: message}), input
    ]), [cancel, ok], () => {
        if (!done) {
            done = true;
            callback(null);
        }
    });
    setTimeout(() => {
        input.focus();
        input.select();
    });
};

/**
 * Custom block editor (scratch-blocks ScratchProcedures.externalProcedureDefCallback).
 * @param {object} workspaceOptions media/theme options shared with the main workspace
 * @param {Function} onDone called after the dialog closes (refresh toolbox)
 * @returns {Function} (mutator, callback) => void
 */
export const makeProcedureEditor = (workspaceOptions, onDone) => (mutator, callback) => {
    const host = el('div', {class: 'db-proc-workspace'});
    let workspace = null;
    let root = null;
    let result = null;

    // scratch-blocks hard-codes English defaults ("number or text", "boolean",
    // "label text"); give Korean names that also read well as Python parameters.
    const nextName = prefix => {
        const used = new Set(root.displayNames_ || []);
        let i = 1;
        while (used.has(`${prefix}${i}`)) i++;
        return `${prefix}${i}`;
    };
    const addArgument = kind => {
        if (kind === 'label') {
            root.addLabelExternal();
            root.procCode_ = root.procCode_.replace(/ label text$/, ' 설명');
        } else {
            const name = nextName(kind === 'boolean' ? '조건' : '값');
            if (kind === 'boolean') root.addBooleanExternal();
            else root.addStringNumberExternal();
            root.displayNames_[root.displayNames_.length - 1] = name;
        }
        root.updateDisplay_();
        root.focusLastEditor_();
    };

    const addBtn = (label, fn) => el('button', {class: 'db-btn', text: label, onclick: () => root && fn()});
    const warp = el('input', {type: 'checkbox', id: 'db-warp'});
    warp.addEventListener('change', () => root && root.setWarp(warp.checked));

    const ok = el('button', {class: 'db-btn db-btn-primary', text: '확인', onclick: () => {
        result = root ? root.mutationToDom(true) : null;
        modal.close(); // eslint-disable-line no-use-before-define
    }});
    const cancel = el('button', {class: 'db-btn', text: '취소', onclick: () => modal.close()}); // eslint-disable-line no-use-before-define

    const body = el('div', {class: 'db-modal-body'}, [
        host,
        el('div', {class: 'db-proc-tools'}, [
            addBtn('+ 입력값 (숫자/문자)', () => addArgument('string')),
            addBtn('+ 입력값 (참/거짓)', () => addArgument('boolean')),
            addBtn('+ 라벨 글자', () => addArgument('label'))
        ]),
        el('label', {class: 'db-check', for: 'db-warp'}, [warp, document.createTextNode(' 화면 새로 고침 없이 실행하기')])
    ]);

    const modal = openModal('블록 만들기', body, [cancel, ok], () => {
        if (workspace) {
            ScratchBlocks.WidgetDiv.hide();
            const main = ScratchBlocks.getMainWorkspace();
            if (main) ScratchBlocks.getFocusManager().focusTree(main);
            workspace.dispose();
        }
        if (result) callback(result);
        if (onDone) onDone();
    });
    modal.overlay.querySelector('.db-modal').classList.add('db-modal-wide');

    // inject after the host is in the DOM so Blockly can measure it
    workspace = ScratchBlocks.inject(host, Object.assign({}, workspaceOptions, {
        zoom: {controls: false, wheel: false, startScale: 0.9},
        comments: false,
        collapse: false,
        scrollbars: true,
        sounds: false,
        toolbox: null
    }));
    root = workspace.newBlock('procedures_declaration');
    root.setMovable(false);
    root.setDeletable(false);
    root.contextMenu = false;
    workspace.addChangeListener(() => {
        root.onChangeFn();
        const m = workspace.getMetrics();
        const {x, y} = root.getRelativeToSurfaceXY();
        const dy = (m.viewHeight / 2) - (root.height / 2) - y;
        let dx = (m.viewWidth / 2) - (root.width / 2) - x;
        if (root.width > m.viewWidth) dx = m.viewWidth - root.width - x;
        root.moveBy(dx, dy);
    });
    root.domToMutation(mutator);
    root.initSvg();
    root.render();
    warp.checked = root.getWarp();
    setTimeout(() => root.focusLastEditor_());
};

/** Simple confirm dialog returning a promise. */
export const confirmDialog = (title, message, okText = '확인') => new Promise(resolve => {
    let answer = false;
    const ok = el('button', {class: 'db-btn db-btn-primary', text: okText, onclick: () => {
        answer = true;
        modal.close(); // eslint-disable-line no-use-before-define
    }});
    const cancel = el('button', {class: 'db-btn', text: '취소', onclick: () => modal.close()}); // eslint-disable-line no-use-before-define
    const modal = openModal(title, el('div', {class: 'db-modal-body'}, el('p', {text: message})), [cancel, ok],
        () => resolve(answer));
});
