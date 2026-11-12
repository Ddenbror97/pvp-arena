#!/usr/bin/env bash
# IRON DISTRICT street-life props on their own (the rest of the map unchanged): prop library →
# placement → per-section GPU instancing → merged into the shipped public/fps/models/iron-district.glb
# (an earlier build of the props in it is replaced) → meshopt, then the depth-layer table and the
# render cost. build.sh runs the same steps inside the full build. Needs the downloads in incoming/
# and ../map06/incoming/ (gitignored; docs/fps-bomb/IRON-DISTRICT-ASSETS.md) and `npm ci` in
# art/blender.
#   BLENDER_PY=/path/to/python-with-bpy art/blender/iron-district/build_props.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
PY="${BLENDER_PY:-/root/bpyenv/bin/python}"
GT="$ROOT/art/blender/node_modules/.bin/gltf-transform"
export NODE_PATH="$ROOT/art/blender/node_modules"
cd "$HERE"
python3 layout.py && (cd "$ROOT" && npx prettier --write src/lib/fps/iron-district-layout.ts >/dev/null)
"$PY" props_assets.py > build/props-assets.log 2>&1 || { tail -20 build/props-assets.log; exit 1; }
grep -E "^PROP" build/props-assets.log | cut -c1-110
"$PY" props.py > build/props.log 2>&1 || { tail -20 build/props.log; exit 1; }
grep -E "^PROPS|exported" build/props.log
node ../map06/instance_sections.mjs build/iron-district-props-raw.glb build/iron-district-props.glb
node ../map06/merge_props.mjs "$ROOT/public/fps/models/iron-district.glb" build/iron-district-props.glb build/iron-district-merged.glb
"$GT" meshopt build/iron-district-merged.glb "$ROOT/public/fps/models/iron-district.glb" --level medium 2>&1 | grep -v "quantize: Skipping" || true
node ../map06/measure_glb.mjs "$ROOT/public/fps/models/iron-district.glb" --json build/perf.json
node ../map06/find_coplanar.mjs "$ROOT/public/fps/models/iron-district.glb" --top=0 --layers="iron-district:$ROOT/src/lib/fps/maps/depth-layers.json"
ls -la "$ROOT/public/fps/models/iron-district.glb"
