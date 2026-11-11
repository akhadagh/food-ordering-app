#!/usr/bin/env bash
# Rasterise the Afia Food Hub SVG icons to PNG using headless Chrome/Brave.
# The SVG is inlined into the page so no cross-file access is required.
set -euo pipefail

BRAND_DIR="$(cd "$(dirname "$0")/.." && pwd)/frontend/public/brand"
WORK="$HOME/brand-raster"
BROWSER="${BROWSER:-/snap/bin/brave}"
mkdir -p "$WORK"

render() {
  local src="$1" size="$2" out="$3"
  python3 - "$src" "$size" "$WORK/page.html" <<'PY'
import sys
src, size, dest = sys.argv[1], sys.argv[2], sys.argv[3]
svg = open(src).read()
svg = svg.split("?>", 1)[1]  # drop the XML declaration
html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;padding:0;width:{size}px;height:{size}px;overflow:hidden;background:transparent;}}
svg{{display:block;width:{size}px;height:{size}px;}}
</style></head><body>{svg}</body></html>"""
open(dest, "w").write(html)
PY
  "$BROWSER" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --default-background-color=00000000 \
    --screenshot="$WORK/$out" --window-size="${size},${size}" \
    "file://$WORK/page.html" >/dev/null 2>&1
  cp "$WORK/$out" "$BRAND_DIR/icons/$out"
  echo "  icons/$out  ${size}x${size}"
}

echo "Rasterising brand icons..."
render "$BRAND_DIR/icons/favicon.svg"   16  favicon-16x16.png
render "$BRAND_DIR/icons/favicon.svg"   32  favicon-32x32.png
render "$BRAND_DIR/icons/favicon.svg"   64  favicon-64x64.png
render "$BRAND_DIR/icons/apple-touch-icon.svg" 180  apple-touch-icon.png
render "$BRAND_DIR/icons/icon-app.svg" 192  icon-192.png
render "$BRAND_DIR/icons/icon-app.svg" 512  icon-512.png
render "$BRAND_DIR/icons/icon-maskable.svg" 512  icon-maskable-512.png
echo "done"
