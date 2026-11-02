#!/usr/bin/env bash
# Builds Dynamic Makers (다이나믹 메이커스) into ./dist.
#
#   MODE=web   (default) scratch-blocks and scratch-vm load from cdn.jsdelivr.net;
#              dist/ holds only this app's own files. Used for the claude.ai web
#              preview and for any hosting with internet access.
#   MODE=local everything bundled / copied into dist/ (works offline on a LAN).
#
#   SCRATCH_EDITOR  scratch-editor checkout (node_modules provide scratch-blocks;
#                   MODE=local also copies packages/scratch-vm/dist/web)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
MODE="${MODE:-web}"
SCRATCH_EDITOR="${SCRATCH_EDITOR:-../scratch-editor}"
BLOCKS_VERSION="2.2.1"
VM_VERSION="15.3.0"
BLOCKS_CDN="https://cdn.jsdelivr.net/npm/scratch-blocks@${BLOCKS_VERSION}/dist/main.mjs"
VM_CDN="https://cdn.jsdelivr.net/npm/@scratch/scratch-vm@${VM_VERSION}/dist/web/scratch-vm.js"

node scripts/gen-media.js "$SCRATCH_EDITOR/node_modules/scratch-blocks/media"

#   MODE=file  one self-contained DynamicMakers.html (+ launchers) in dist-file/:
#              double-click / open in Chrome or Edge, works offline from file://
if [ "$MODE" = "file" ]; then
    VM_JS="$SCRATCH_EDITOR/packages/scratch-vm/dist/web/scratch-vm.js"
    [ -f "$VM_JS" ] || { echo "scratch-vm web build not found: $VM_JS"; exit 1; }
    rm -rf dist-file && mkdir -p dist-file
    NODE_PATH="$SCRATCH_EDITOR/node_modules" FORMAT=iife OUTFILE=dist-file/.app.js EXTERNAL="" node scripts/bundle.js
    python3 scripts/make-single-file.py "$VM_JS" dist-file/.app.js dist-file/DynamicMakers.html
    rm dist-file/.app.js
    cp launchers/* dist-file/
    chmod +x dist-file/*.command 2>/dev/null || true
    ls -la dist-file
    exit 0
fi
rm -rf dist && mkdir -p dist
cp public/dynamicmakers.css dist/

LOGO="data:image/png;base64,$(base64 -w0 public/logo.png)"
if [ "$MODE" = "local" ]; then
    mkdir -p dist/vendor
    cp -r "$SCRATCH_EDITOR/packages/scratch-vm/dist/web"/. dist/vendor/
    find dist/vendor -name '*.map' -delete
    VM_SRC="vendor/scratch-vm.js"
    EXTERNAL=""
else
    VM_SRC="$VM_CDN"
    EXTERNAL="$BLOCKS_CDN"
fi
python3 - "$LOGO" "$VM_SRC" <<'PY'
import sys
logo, vm = sys.argv[1], sys.argv[2]
s = open('public/index.html', encoding='utf-8').read().replace('{{LOGO}}', logo).replace('{{VM_SRC}}', vm)
open('dist/index.html', 'w', encoding='utf-8').write(s)
PY
NODE_PATH="$SCRATCH_EDITOR/node_modules" EXTERNAL="$EXTERNAL" node scripts/bundle.js
ls -la dist
