#!/usr/bin/env bash
# Installs the CM-550 extension into a scratch-editor monorepo checkout
# (https://github.com/scratchfoundation/scratch-editor).
#
# Usage:  scripts/install-into-scratch-editor.sh /path/to/scratch-editor
#
# What it does
#   1. copies the extension into packages/scratch-vm/src/extensions/scratch3_cm550/
#   2. registers 'cm550' in scratch-vm's builtinExtensions
#   3. adds the library card + icons to scratch-gui's extension library
#   4. registers the toolbox connect buttons in scratch-gui's blocks container
#   5. adds the read-only Python code panel next to the block workspace
# Re-running is safe (idempotent).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:?usage: $0 /path/to/scratch-editor}"
VM="$TARGET/packages/scratch-vm"
GUI="$TARGET/packages/scratch-gui"

[ -d "$VM/src/extensions" ] || { echo "scratch-vm not found under $TARGET"; exit 1; }
[ -d "$GUI/src/lib/libraries/extensions" ] || { echo "scratch-gui not found under $TARGET"; exit 1; }

# 1. extension source --------------------------------------------------------
EXT_DIR="$VM/src/extensions/scratch3_cm550"
mkdir -p "$EXT_DIR/lib"
cp "$HERE/scratch-vm/index.js" "$EXT_DIR/index.js"
cp "$HERE/src/protocol2.js" "$HERE/src/transport.js" "$HERE/src/cm550.js" \
   "$HERE/src/extension.js" "$HERE/src/icons.js" "$HERE/src/translations.js" \
   "$HERE/src/python-generator.js" "$HERE/src/models.js" "$HERE/src/poses.js" "$EXT_DIR/lib/"
echo "[1/5] extension copied to $EXT_DIR"

# 2. builtinExtensions -------------------------------------------------------
EM="$VM/src/extension-support/extension-manager.js"
if ! grep -q "scratch3_cm550" "$EM"; then
    sed -i "s#^\(\s*\)faceSensing: () => require('../extensions/scratch3_face_sensing')#\1faceSensing: () => require('../extensions/scratch3_face_sensing'),\n\1cm550: () => require('../extensions/scratch3_cm550')#" "$EM"
    grep -q "scratch3_cm550" "$EM" || { echo "failed to patch $EM"; exit 1; }
fi
# allow our toolbox button callback keys (silences a scratch-vm console error)
RT="$VM/src/engine/runtime.js"
if ! grep -q "connectUsbButton" "$RT"; then
    sed -i "s#const supportedCallbackKeys = \['MAKE_A_LIST', 'MAKE_A_PROCEDURE', 'MAKE_A_VARIABLE'\];#const supportedCallbackKeys = ['MAKE_A_LIST', 'MAKE_A_PROCEDURE', 'MAKE_A_VARIABLE',\n            'connectUsbButton', 'connectBleButton'];#" "$RT"
    grep -q "connectUsbButton" "$RT" || { echo "failed to patch $RT"; exit 1; }
fi
echo "[2/5] registered in extension-manager.js (+ runtime.js button keys)"

# 3. extension library card --------------------------------------------------
LIB_DIR="$GUI/src/lib/libraries/extensions"
mkdir -p "$LIB_DIR/cm550"
cp "$HERE/scratch-gui/cm550/"* "$LIB_DIR/cm550/"
IDX="$LIB_DIR/index.jsx"
if ! grep -q "cm550IconURL" "$IDX"; then
    # imports after the first import line
    sed -i "0,/^import /s##import cm550IconURL from './cm550/cm550.png';\nimport cm550InsetIconURL from './cm550/cm550-small.svg';\n&#" "$IDX"
    # entry as the first element of the exported array
    python3 - "$IDX" "$HERE/scratch-gui/cm550-library-entry.jsx" <<'PY'
import re, sys
idx, entry = sys.argv[1], sys.argv[2]
src = open(idx, encoding='utf-8').read()
body = ''.join(l for l in open(entry, encoding='utf-8') if not l.startswith('//'))
m = re.search(r'export default \[\n', src)
if not m:
    sys.exit('could not find "export default [" in ' + idx)
src = src[:m.end()] + body + src[m.end():]
open(idx, 'w', encoding='utf-8').write(src)
PY
fi
# translations merged into the GUI locale messages (VM reads them via setLocale)
cp "$HERE/src/translations.js" "$LIB_DIR/cm550/messages.js"
LOC="$GUI/src/reducers/locales.js"
if ! grep -q "cm550Messages" "$LOC"; then
    python3 - "$LOC" <<'PY'
import sys
path = sys.argv[1]
src = open(path, encoding='utf-8').read()
old = "import editorMessages from 'scratch-l10n/locales/editor-msgs';\n"
new = old + (
    "import cm550Messages from '../lib/libraries/extensions/cm550/messages';\n\n"
    "// CM-550 extension strings are merged into the editor messages so that both\n"
    "// the GUI library card and the VM block texts are localised.\n"
    "Object.keys(cm550Messages).forEach(loc => {\n"
    "    editorMessages[loc] = Object.assign({}, editorMessages[loc], cm550Messages[loc]);\n"
    "});\n"
)
if old not in src:
    sys.exit('anchor not found in ' + path)
open(path, 'w', encoding='utf-8').write(src.replace(old, new, 1))
PY
fi
echo "[3/5] library card + translations added"

# 5 (runs below). Python code panel -------------------------------------------
install_python_panel () {
    local PANEL="$GUI/src/components/python-panel"
    mkdir -p "$PANEL"
    cp "$HERE/scratch-gui/python-panel/python-panel.jsx" "$HERE/scratch-gui/python-panel/python-panel.css" "$PANEL/"
    cp "$HERE/src/python-generator.js" "$HERE/src/python-highlight.js" "$PANEL/"
    local GJ="$GUI/src/components/gui/gui.jsx"
    if ! grep -q "PythonPanel" "$GJ"; then
        python3 - "$GJ" <<'PY'
import sys
path = sys.argv[1]
src = open(path, encoding='utf-8').read()
imp_anchor = "import Watermark from '../../containers/watermark.jsx';\n"
imp_new = imp_anchor + "import PythonPanel from '../python-panel/python-panel.jsx';\n"
# Panel becomes a flex sibling to the right of the blocks area; the sprite
# watermark moves inside the (position:relative) blocks wrapper so it stays
# on the workspace instead of floating over the panel.
old = (
    "                                            colorMode={colorMode}\n"
    "                                        />\n"
    "                                    </Box>\n"
    "                                    <ExtensionsButton\n"
    "                                        intl={intl}\n"
    "                                        onExtensionButtonClick={onExtensionButtonClick}\n"
    "                                    />\n"
    "                                    <Box className={styles.watermark}>\n"
    "                                        <Watermark />\n"
    "                                    </Box>\n"
)
new = (
    "                                            colorMode={colorMode}\n"
    "                                        />\n"
    "                                        <Box className={styles.watermark}>\n"
    "                                            <Watermark />\n"
    "                                        </Box>\n"
    "                                    </Box>\n"
    "                                    <PythonPanel vm={vm} />\n"
    "                                    <ExtensionsButton\n"
    "                                        intl={intl}\n"
    "                                        onExtensionButtonClick={onExtensionButtonClick}\n"
    "                                    />\n"
)
for a in (imp_anchor, old):
    if a not in src:
        sys.exit('anchor not found in ' + path + ':\n' + a)
src = src.replace(imp_anchor, imp_new, 1).replace(old, new, 1)
open(path, 'w', encoding='utf-8').write(src)
PY
    fi
    echo "[5/5] Python code panel added to the Code tab"
}

# 4. toolbox button callbacks ------------------------------------------------
BLOCKS="$GUI/src/containers/blocks.jsx"
if ! grep -q "CM550_CONNECT" "$BLOCKS"; then
    python3 - "$BLOCKS" <<'PY'
import sys
path = sys.argv[1]
src = open(path, encoding='utf-8').read()
anchor = "toolboxWorkspace.registerButtonCallback('MAKE_A_PROCEDURE', procButtonCallback);\n"
if anchor not in src:
    sys.exit('anchor not found in ' + path)
add = anchor + (
    "        // CM-550 extension: connect buttons in the toolbox. Flyout buttons look\n"
    "        // their callback up on the *target* (main) workspace.\n"
    "        this.workspace.registerButtonCallback('connectUsbButton',\n"
    "            () => this.props.vm.runtime.emit('CM550_CONNECT', 'usb'));\n"
    "        this.workspace.registerButtonCallback('connectBleButton',\n"
    "            () => this.props.vm.runtime.emit('CM550_CONNECT', 'ble'));\n"
)
open(path, 'w', encoding='utf-8').write(src.replace(anchor, add, 1))
PY
fi
echo "[4/5] toolbox buttons registered in blocks.jsx"

install_python_panel

echo
echo "Done. Next:"
echo "  cd $TARGET && npm ci"
echo "  npm --workspace @scratch/scratch-gui start      # dev server (http://localhost:8601)"
echo "  npm --workspace @scratch/scratch-gui run build  # static build in packages/scratch-gui/build"
