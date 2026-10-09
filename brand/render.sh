#!/usr/bin/env bash
# Export PNGs from the SVGs with headless Chromium (set CHROME to your Chrome/Chromium binary).
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell}"
shot() { "$CHROME" --no-sandbox --hide-scrollbars --default-background-color=00000000 --window-size="$2" --screenshot="$3" "file://$PWD/$1" >/dev/null 2>&1; }
for d in */; do
  d="${d%/}"
  shot "$d/avatar.svg" 1024,1024 "$d/avatar.png"
  shot "$d/lockup.svg" 1800,600 "$d/lockup.png"
  # 256 px watermark for the video overlay
  ffmpeg -v error -y -i "$d/avatar.png" -vf scale=256:256 "$d/watermark.png"
done
echo "rendered: $(ls */*.png | tr '\n' ' ')"
