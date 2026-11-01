#!/usr/bin/env bash
# FROSTLINE pipeline (same as the AIM ARENA's art/blender/map/build.sh): layout -> textures ->
# Blender (.blend + .glb) -> checks -> GPU instancing + meshopt -> public/fps/models/frostline.glb.
# Pass --blockout for the Phase 2 grey-box version.
#   BLENDER_PY=/path/to/python-with-bpy art/blender/frostline/build.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
PY="${BLENDER_PY:-/root/bpyenv/bin/python}"
GT="$ROOT/art/blender/node_modules/.bin/gltf-transform"
cd "$HERE"
python3 layout.py && (cd "$ROOT" && npx prettier --write src/lib/fps/frostline-layout.ts >/dev/null)
if [[ "${1:-}" == "--blockout" ]]; then
  "$PY" build_frostline.py -- build/frostline-blockout.glb --blockout
  "$GT" meshopt build/frostline-blockout.glb "$ROOT/public/fps/models/frostline.glb"
  exit 0
fi
python3 textures.py
"$PY" build_frostline.py -- build/frostline.glb --blend frostline.blend | grep -E "VALIDATE|KIT STATS|^    \("
python3 ../map/check_glb.py build/frostline.glb --json build/asset-stats.json
"$GT" instance build/frostline.glb build/frostline-instanced.glb --min 2
"$GT" meshopt build/frostline-instanced.glb "$ROOT/public/fps/models/frostline.glb" --level medium
ls -la "$ROOT/public/fps/models/frostline.glb"
