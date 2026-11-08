#!/bin/bash
# Dynamic Makers launcher (macOS): opens DynamicMakers.html in a Chrome app window.
DIR="$(cd "$(dirname "$0")" && pwd)"
URL="file://${DIR// /%20}/DynamicMakers.html"
if open -Ra "Google Chrome" 2>/dev/null; then
  open -na "Google Chrome" --args --app="$URL" --window-size=1366,820
elif open -Ra "Microsoft Edge" 2>/dev/null; then
  open -na "Microsoft Edge" --args --app="$URL" --window-size=1366,820
else
  echo "Chrome 또는 Edge가 필요합니다 (USB/블루투스). 기본 브라우저로 엽니다."
  open "$DIR/DynamicMakers.html"
fi
