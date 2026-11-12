#!/usr/bin/env bash
# SANDGATE street-life props on their own (the rest of the map unchanged): prop library → placement
# → per-section GPU instancing → merged into the shipped public/fps/models/sandgate.glb (an earlier
# build of the props in it is replaced) → meshopt, then the depth-layer table and the render cost.
# build.sh runs the same steps inside the full build. Needs the downloads in incoming/ (gitignored;
# docs/fps-bomb/ASSETS.md) and `npm ci` in art/blender.
#   BLENDER_PY=/path/to/python-with-bpy art/blender/map06/build_props.sh [--review]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
PY="${BLENDER_PY:-/root/bpyenv/bin/python}"
GT="$ROOT/art/blender/node_modules/.bin/gltf-transform"
export NODE_PATH="$ROOT/art/blender/node_modules"
cd "$HERE"
python3 layout.py && (cd "$ROOT" && npx prettier --write src/lib/fps/sandgate-layout.ts >/dev/null)
"$PY" props_assets.py > build/props-assets.log 2>&1 || { tail -20 build/props-assets.log; exit 1; }
grep -E "^PROP" build/props-assets.log | cut -c1-110
"$PY" props.py > build/props.log 2>&1 || { tail -20 build/props.log; exit 1; }
grep -E "^PROPS|exported" build/props.log
node instance_sections.mjs build/sandgate-props-raw.glb build/sandgate-props.glb
node merge_props.mjs "$ROOT/public/fps/models/sandgate.glb" build/sandgate-props.glb build/sandgate-merged.glb
"$GT" meshopt build/sandgate-merged.glb "$ROOT/public/fps/models/sandgate.glb" --level medium 2>&1 | grep -v "quantize: Skipping" || true
node measure_glb.mjs "$ROOT/public/fps/models/sandgate.glb" --json build/perf.json
node find_coplanar.mjs "$ROOT/public/fps/models/sandgate.glb" --top=0 --layers="sandgate:$ROOT/src/lib/fps/maps/depth-layers.json"
ls -la "$ROOT/public/fps/models/sandgate.glb"
if [[ "${1:-}" == "--review" ]]; then
  node review/capture.mjs --check
fi
