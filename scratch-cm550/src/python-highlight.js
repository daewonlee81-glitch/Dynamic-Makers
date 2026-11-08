/**
 * Tiny Python syntax highlighter -> HTML string (spans with class names).
 * Only covers what the generator emits; no external dependency.
 */
const KEYWORDS = new Set([
    'def', 'if', 'else', 'elif', 'while', 'for', 'in', 'not', 'and', 'or', 'return', 'global',
    'import', 'from', 'pass', 'del', 'True', 'False', 'None', 'break', 'continue'
]);
const API = new Set(['cm', 'dxl', 'port', 'motion']);
const BUILTINS = new Set([
    'print', 'input', 'range', 'len', 'str', 'int', 'round', 'abs', 'wait', 'timer', 'reset_timer',
    'key_pressed', 'broadcast', 'stop_all', 'start', 'math', 'random'
]);

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const TOKEN = new RegExp([
    '(#[^\\n]*)', // comment
    '("(?:[^"\\\\\\n]|\\\\.)*")', // string
    '(@[\\p{L}\\p{N}_]+)', // decorator
    '((?<![\\p{L}\\p{N}_])-?\\d+(?:\\.\\d+)?)', // number
    '([\\p{L}_][\\p{L}\\p{N}_]*)' // identifier / keyword
].join('|'), 'gu');

/**
 * @param {string} src python source
 * @param {object} cls map of token kind -> css class name
 * @returns {string} html
 */
const highlightPython = (src, cls = {}) => {
    const c = Object.assign({
        comment: 'py-comment',
        string: 'py-string',
        decorator: 'py-decorator',
        number: 'py-number',
        keyword: 'py-keyword',
        api: 'py-api',
        builtin: 'py-builtin'
    }, cls);
    let out = '';
    let last = 0;
    const span = (kind, text) => `<span class="${c[kind]}">${escapeHtml(text)}</span>`;
    src.replace(TOKEN, (m, comment, string, deco, number, word, offset) => {
        out += escapeHtml(src.slice(last, offset));
        last = offset + m.length;
        if (comment) out += span('comment', m);
        else if (string) out += span('string', m);
        else if (deco) out += span('decorator', m);
        else if (number) out += span('number', m);
        else if (KEYWORDS.has(word)) out += span('keyword', m);
        else if (API.has(word)) out += span('api', m);
        else if (BUILTINS.has(word)) out += span('builtin', m);
        else out += escapeHtml(m);
        return m;
    });
    out += escapeHtml(src.slice(last));
    return out;
};

module.exports = {highlightPython, escapeHtml};
