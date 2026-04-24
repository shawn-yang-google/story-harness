#!/usr/bin/env bash
# Re-record the live demo GIF from slide 7 of the presentation.
# Requires: node (>=18), ffmpeg, puppeteer (bun add -d puppeteer)
set -euo pipefail
cd "$(dirname "$0")/.."

NODE_PATH=$(pwd)/node_modules node ~/.gemini/skills/html-demo-to-gif/scripts/record-html-animation.cjs 
  --url docs/presentation-slides.html 
  --keys ArrowRight,ArrowRight,ArrowRight,ArrowRight,ArrowRight,ArrowRight 
  --duration 25 --fps 10 --width 1280 --height 800

bash ~/.gemini/skills/html-demo-to-gif/scripts/frames-to-gif-and-mp4.sh 
  -o docs/demo.gif -m docs/demo.mp4 -w 1024 -f 10

echo "Done: docs/demo.gif ($(du -h docs/demo.gif | cut -f1)), docs/demo.mp4 ($(du -h docs/demo.mp4 | cut -f1))"
