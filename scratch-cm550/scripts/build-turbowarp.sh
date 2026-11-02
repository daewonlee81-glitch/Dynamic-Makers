#!/usr/bin/env bash
# Bundles src/ into a single unsandboxed TurboWarp extension file.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
npx esbuild src/turbowarp-entry.js --bundle --format=iife --platform=browser --target=es2019 \
  --charset=utf8 --outfile=dist/cm550-turbowarp.js --banner:js="// CM-550 + DYNAMIXEL Scratch extension (TurboWarp unsandboxed). Built $(date -u +%Y-%m-%dT%H:%MZ)"
ls -la dist/cm550-turbowarp.js
