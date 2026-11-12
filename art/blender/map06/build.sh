#!/usr/bin/env bash
# SANDGATE (map 06) environment pipeline: layout → textures → asset library → Blender (.blend +
# .glb) → per-area GPU instancing → meshopt → public/fps/models/sandgate.glb, then the render-cost
# numbers (build/perf.json) and, with --review, the review renders + collision-dressing check.
#   BLENDER_PY=/path/to/python-with-bpy art/blender/map06/build.sh [--review]
# Needs the downloaded sources in art/blender/map06/incoming/ (gitignored; see
# docs/fps-bomb/ASSETS.md) and `npm ci` in art/blender (gltf-transform, meshoptimizer).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
PY="${BLENDER_PY:-/root/bpyenv/bin/python}"
GT="$ROOT/art/blender/node_modules/.bin/gltf-transform"
export NODE_PATH="$ROOT/art/blender/node_modules"
cd "$HERE"
python3 layout.py && (cd "$ROOT" && npx prettier --write src/lib/fps/sandgate-layout.ts >/dev/null)
python3 textures.py
python3 credits.py   # assets.json → docs/fps-bomb/ASSETS.md + public/fps/models/sandgate-credits.txt
(cd "$ROOT" && npx prettier --write docs/fps-bomb/ASSETS.md >/dev/null)
# (Blender's own log is noisy: keep it in build/*.log, show the summary lines, fail on errors.)
"$PY" assets.py > build/assets.log 2>&1 || { tail -20 build/assets.log; exit 1; }
grep -E "^ASSET|saved" build/assets.log
"$PY" build_sandgate.py -- build/sandgate-raw.glb --blend sandgate.blend > build/build.log 2>&1 || { tail -20 build/build.log; exit 1; }
grep -E "FACADES|UNDRESSED|SIGN|exported" build/build.log
# Instancing per area section first, then meshopt (quantization moves each node's dequantization
# into its transform; with per-section batches the instance TRS keeps it correct — verified by the
# review renders and check.json, which load the shipped file).
node instance_sections.mjs build/sandgate-raw.glb build/sandgate-instanced.glb
# Street-life props (props_assets.py → props.py, their collision in layout.py PROPS): instanced on
# their own and merged into the map (build_props.sh rebuilds only these, on the shipped file).
"$PY" props_assets.py > build/props-assets.log 2>&1 || { tail -20 build/props-assets.log; exit 1; }
"$PY" props.py > build/props.log 2>&1 || { tail -20 build/props.log; exit 1; }
grep -E "^PROPS" build/props.log
node instance_sections.mjs build/sandgate-props-raw.glb build/sandgate-props.glb
node merge_props.mjs build/sandgate-instanced.glb build/sandgate-props.glb build/sandgate-instanced.glb
"$GT" meshopt build/sandgate-instanced.glb "$ROOT/public/fps/models/sandgate.glb" --level medium 2>&1 | grep -v "quantize: Skipping" || true
node measure_glb.mjs "$ROOT/public/fps/models/sandgate.glb" "$ROOT"/public/fps/models/{aim-arena,crossfire,frostline,lost-trail}.glb --json build/perf.json
# Depth layers for the faces that share a plane (src/lib/fps/maps/depth-layers.ts): the table names
# triangles of this build of the file, so it is rebuilt with it.
node find_coplanar.mjs "$ROOT/public/fps/models/sandgate.glb" --top=0 --layers="sandgate:$ROOT/src/lib/fps/maps/depth-layers.json"
ls -la "$ROOT/public/fps/models/sandgate.glb"
if [[ "${1:-}" == "--review" ]]; then
  # Review renders (build/review/*.png), per-view draw calls / triangles merged into build/perf.json,
  # and the collision-dressing check (build/check.json; non-zero exit on failure).
  node review/capture.mjs --check
fi
