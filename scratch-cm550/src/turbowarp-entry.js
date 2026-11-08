/**
 * TurboWarp / unsandboxed custom-extension entry.
 * Load via: https://turbowarp.org/editor?extension=<URL of dist/cm550-turbowarp.js>
 * or "확장 기능 추가 > 사용자 정의 확장 기능 > URL / 파일".
 */
const {createExtension} = require('./extension');
const translations = require('./translations');
const {mountPythonPanel} = require('./python-panel-dom');

(function (Scratch) {
    if (!Scratch || !Scratch.extensions) {
        throw new Error('이 파일은 TurboWarp 사용자 정의 확장으로 불러와야 합니다.');
    }
    if (!Scratch.extensions.unsandboxed) {
        throw new Error('CM-550 확장은 USB/블루투스 접근을 위해 샌드박스 해제(unsandboxed) 모드로 불러와야 합니다.');
    }
    if (Scratch.translate && Scratch.translate.setup) Scratch.translate.setup(translations);
    const formatMessage = msg => Scratch.translate(msg);
    const cast = Scratch.Cast;
    const Cls = createExtension({
        ArgumentType: Scratch.ArgumentType,
        BlockType: Scratch.BlockType,
        formatMessage,
        cast
    });
    Scratch.extensions.register(new Cls(Scratch.vm.runtime));
    // Pybricks-style read-only Python view next to the blocks
    try {
        mountPythonPanel(Scratch.vm);
    } catch (e) {
        // the panel is optional; never let it break the blocks
        console.warn('[CM-550] Python panel unavailable:', e); // eslint-disable-line no-console
    }
})(typeof Scratch !== 'undefined' ? Scratch : null);
