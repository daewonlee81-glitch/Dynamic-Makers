/**
 * Framework-free Python panel for hosts where we cannot change the GUI
 * source (TurboWarp). It overlays the right edge of the block workspace and
 * re-attaches itself if the editor re-renders the workspace.
 */
const {generatePython, fromVM} = require('./python-generator');
const {highlightPython} = require('./python-highlight');

const P = 'cm550py';
const CSS = `
.${P}-panel{position:absolute;top:0;right:0;bottom:0;z-index:30;display:flex;flex-direction:column;
  background:#fbfcfe;border-left:1px solid rgba(0,0,0,.15);box-shadow:-4px 0 12px rgba(0,0,0,.08);
  font-family:"Helvetica Neue",Helvetica,Arial,sans-serif}
.${P}-resizer{position:absolute;top:0;bottom:0;left:-3px;width:6px;cursor:col-resize}
.${P}-resizer:hover{background:rgba(46,124,246,.35)}
.${P}-header{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;background:#2e7cf6;color:#fff}
.${P}-title{font-weight:bold;font-size:.95rem;flex-shrink:0}
.${P}-sub{flex:1;min-width:0;font-size:.7rem;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.${P}-btn{flex-shrink:0;white-space:nowrap;padding:.2rem .6rem;border:1px solid rgba(255,255,255,.6);border-radius:.25rem;
  background:transparent;color:#fff;font-size:.75rem;cursor:pointer}
.${P}-btn:hover{background:rgba(255,255,255,.2)}
.${P}-scroll{display:flex;flex:1;overflow:auto;font:.8rem/1.5 "SFMono-Regular",Consolas,"D2Coding",Menlo,monospace}
.${P}-gutter,.${P}-code{margin:0;padding:.6rem 0;white-space:pre}
.${P}-gutter{flex-shrink:0;padding:.6rem;text-align:right;color:#9aa5b8;background:#f1f4f9;border-right:1px solid #e3e8f0;user-select:none}
.${P}-code{flex:1;padding:.6rem .75rem;color:#1f2a3c}
.${P}-tab{position:absolute;top:.75rem;right:0;z-index:30;padding:.6rem .3rem;border:0;border-radius:.5rem 0 0 .5rem;
  background:#2e7cf6;color:#fff;font-weight:bold;font-size:.8rem;writing-mode:vertical-rl;cursor:pointer}
.${P}-tab:hover{background:#1f5fc4}
.${P}-docked .${P}-panel{position:relative;top:auto;right:auto;bottom:auto;height:100%;box-shadow:none;border-left:1px solid #dde3ec}
.${P}-docked .${P}-tab{position:relative;top:auto;height:100%;border-radius:0;padding:.75rem .35rem}
.${P}-docked{display:flex;height:100%}
.py-comment{color:#6a7a8f;font-style:italic}.py-string{color:#b3541e}.py-decorator{color:#8a3ffc}
.py-number{color:#0f7b6c}.py-keyword{color:#c2185b;font-weight:bold}.py-api{color:#1f5fc4;font-weight:bold}
.py-builtin{color:#5c6bc0}
`;

const store = {
    get (k, d) {
        try {
            const v = localStorage.getItem(k);
            return v === null ? d : JSON.parse(v);
        } catch (e) {
            return d;
        }
    },
    set (k, v) {
        try {
            localStorage.setItem(k, JSON.stringify(v));
        } catch (e) { /* ignore */ }
    }
};

const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
};

/**
 * @param {object} vm scratch-vm
 * @param {object} [options]
 * @param {HTMLElement} [options.host] dock into this element instead of overlaying the workspace
 * @param {Function} [options.onToggle] called after the panel opens/closes or is resized
 * @param {string} [options.accent] header colour
 */
const mountPythonPanel = (vm, options = {}) => {
    if (typeof document === 'undefined' || !vm || typeof vm.on !== 'function') return;
    if (document.getElementById(`${P}-style`)) return;
    const style = el('style');
    style.id = `${P}-style`;
    style.textContent = CSS;
    document.head.appendChild(style);

    let open = store.get(`${P}.open`, true);
    let width = store.get(`${P}.width`, Math.round(Math.max(280, Math.min(380, window.innerWidth * 0.24))));
    let code = '';

    const panel = el('section', `${P}-panel`);
    panel.setAttribute('aria-label', 'Python 코드');
    const resizer = el('div', `${P}-resizer`);
    const header = el('header', `${P}-header`);
    const copyBtn = el('button', `${P}-btn`, '복사');
    const closeBtn = el('button', `${P}-btn`, '닫기');
    header.append(el('span', `${P}-title`, 'Python'), el('span', `${P}-sub`, '블록에서 자동 생성 · 읽기 전용'),
        copyBtn, closeBtn);
    const scroll = el('div', `${P}-scroll`);
    const gutter = el('pre', `${P}-gutter`);
    const pre = el('pre', `${P}-code`);
    scroll.append(gutter, pre);
    panel.append(resizer, header, scroll);
    const tab = el('button', `${P}-tab`, 'Python');
    tab.title = 'Python 코드 보기';

    if (options.accent) {
        header.style.background = options.accent;
        tab.style.background = options.accent;
    }
    const render = () => {
        panel.style.width = `${width}px`;
        panel.style.display = open ? 'flex' : 'none';
        tab.style.display = open ? 'none' : 'block';
        if (options.onToggle) options.onToggle(open);
    };
    const regenerate = () => {
        let next;
        try {
            next = generatePython(fromVM(vm));
        } catch (e) {
            next = `# Python 변환 중 오류가 발생했습니다\n# ${e && e.message}\n`;
        }
        if (next === code) return;
        code = next;
        const n = code.replace(/\n$/, '').split('\n').length;
        gutter.textContent = Array.from({length: n}, (_, i) => i + 1).join('\n');
        pre.innerHTML = highlightPython(code); // escapes all text
    };
    let timer = null;
    const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(regenerate, 150);
    };

    closeBtn.onclick = () => {
        open = false;
        store.set(`${P}.open`, open);
        render();
    };
    tab.onclick = () => {
        open = true;
        store.set(`${P}.open`, open);
        render();
    };
    copyBtn.onclick = () => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(code).then(() => {
            copyBtn.textContent = '복사됨';
            setTimeout(() => {
                copyBtn.textContent = '복사';
            }, 1500);
        }, () => {});
    };
    resizer.onmousedown = e => {
        e.preventDefault();
        const startX = e.clientX;
        const startW = width;
        const move = ev => {
            width = Math.max(240, Math.min(900, startW + (startX - ev.clientX)));
            render();
        };
        const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            store.set(`${P}.width`, width);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    if (options.host) {
        options.host.classList.add(`${P}-docked`);
        options.host.append(tab, panel);
    } else {
        // Attach to the main workspace; the editor may rebuild it (theme change,
        // tab switch), so keep checking and re-attach when needed.
        const attach = () => {
            const bg = document.querySelector('.blocklyMainBackground');
            const host = bg && bg.closest('.injectionDiv');
            if (host && panel.parentElement !== host) {
                host.append(panel, tab);
                schedule();
            }
        };
        setInterval(attach, 1000);
        attach();
    }

    vm.on('PROJECT_CHANGED', schedule);
    vm.on('workspaceUpdate', schedule);
    vm.on('targetsUpdate', schedule);
    render();
    regenerate();
    return {regenerate: schedule, getCode: () => code};
};

module.exports = {mountPythonPanel};
