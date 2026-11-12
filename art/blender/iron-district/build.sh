#!/usr/bin/env bash
# IRON DISTRICT environment pipeline: layout → textures → asset library → Blender (.blend + .glb)
# → per-area GPU instancing → meshopt → public/fps/models/iron-district.glb, then the render-cost
# numbers (build/perf.json).
#   art/blender/iron-district/build.sh [--skip-assets]
# Needs the downloaded sources in art/blender/iron-district/incoming/ (gitignored; see
# docs/fps-bomb/IRON-DISTRICT-ASSETS.md), bpy importable by python3, and `npm ci` in art/blender.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
PY="${BLENDER_PY:-python3}"
GT="$ROOT/art/blender/node_modules/.bin/gltf-transform"
export NODE_PATH="$ROOT/art/blender/node_modules"
cd "$HERE"
python3 layout.py && (cd "$ROOT" && npx prettier --write src/lib/fps/iron-district-layout.ts >/dev/null)
python3 textures.py
if [[ "${1:-}" != "--skip-assets" ]]; then
  "$PY" assets.py > build/assets.log 2>&1 || { tail -20 build/assets.log; exit 1; }
  grep -E "^ASSET|saved" build/assets.log | cut -c1-120
fi
"$PY" build_iron_district.py -- build/iron-district-raw.glb --blend iron-district.blend > build/build.log 2>&1 || { tail -20 build/build.log; exit 1; }
grep -E "exported" build/build.log
node ../map06/instance_sections.mjs build/iron-district-raw.glb build/iron-district-instanced.glb
# Street-life props (props_assets.py → props.py, their collision in layout.py STREET): instanced on
# their own and merged into the map (build_props.sh rebuilds only these, on the shipped file).
"${BLENDER_PY:-/root/bpyenv/bin/python}" props_assets.py > build/props-assets.log 2>&1 || { tail -20 build/props-assets.log; exit 1; }
"${BLENDER_PY:-/root/bpyenv/bin/python}" props.py > build/props.log 2>&1 || { tail -20 build/props.log; exit 1; }
node ../map06/instance_sections.mjs build/iron-district-props-raw.glb build/iron-district-props.glb
node ../map06/merge_props.mjs build/iron-district-instanced.glb build/iron-district-props.glb build/iron-district-instanced.glb
"$GT" meshopt build/iron-district-instanced.glb "$ROOT/public/fps/models/iron-district.glb" --level medium 2>&1 | grep -v "quantize: Skipping" || true
node ../map06/measure_glb.mjs "$ROOT/public/fps/models/iron-district.glb" "$ROOT"/public/fps/models/sandgate.glb --json build/perf.json
# Depth layers for the faces that share a plane (src/lib/fps/maps/depth-layers.ts): the table names
# triangles of this build of the file, so it is rebuilt with it.
node ../map06/find_coplanar.mjs "$ROOT/public/fps/models/iron-district.glb" --top=0 --layers="iron-district:$ROOT/src/lib/fps/maps/depth-layers.json"
ls -la "$ROOT/public/fps/models/iron-district.glb"
