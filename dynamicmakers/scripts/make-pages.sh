#!/usr/bin/env bash
# GitHub Pages용 docs/ 폴더 만들기: 웹 빌드(MODE=web) + 블록 아이콘(dm-media/)
# 사용: dynamicmakers 폴더에서  ./build.sh && ./scripts/make-pages.sh <scratch-blocks/media 경로>
set -e
cd "$(dirname "$0")/.."
MEDIA="${1:-node_modules/scratch-blocks/media}"
OUT=../docs
rm -rf "$OUT" && mkdir -p "$OUT/dm-media/icons"
cp dist/index.html dist/dynamicmakers.js dist/dynamicmakers.css dist/dm-ai.js dist/dm-pose.js "$OUT/"
cp "$MEDIA"/*.svg "$MEDIA"/*.png "$MEDIA"/*.gif "$OUT/dm-media/"
cp "$MEDIA"/icons/*.svg "$OUT/dm-media/icons/"
touch "$OUT/.nojekyll"
echo "docs/ 준비 완료 → GitHub Settings > Pages > main /docs"
