#!/usr/bin/env bash
# CROSSFIRE pipeline (same as the AIM ARENA's art/blender/map/build.sh): layout -> textures ->
# Blender (.blend + .glb) -> checks -> GPU instancing + meshopt -> public/fps/models/crossfire.glb.
# Pass --blockout for the Phase 2 grey-box version.
#   BLENDER_PY=/path/to/python-with-bpy art/blender/crossfire/build.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
PY="${BLENDER_PY:-/root/bpyenv/bin/python}"
GT="$ROOT/art/blender/node_modules/.bin/gltf-transform"
cd "$HERE"
python3 layout.py && (cd "$ROOT" && npx prettier --write src/lib/fps/crossfire-layout.ts >/dev/null)
if [[ "${1:-}" == "--blockout" ]]; then
  "$PY" build_crossfire.py -- build/crossfire-blockout.glb --blockout
  "$GT" meshopt build/crossfire-blockout.glb "$ROOT/public/fps/models/crossfire.glb"
  exit 0
fi
python3 textures.py
"$PY" build_crossfire.py -- build/crossfire.glb --blend crossfire.blend | grep -E "VALIDATE|KIT STATS|HELI|^    \("
python3 ../map/check_glb.py build/crossfire.glb --json build/asset-stats.json
"$GT" instance build/crossfire.glb build/crossfire-instanced.glb --min 2
"$GT" meshopt build/crossfire-instanced.glb "$ROOT/public/fps/models/crossfire.glb" --level medium
ls -la "$ROOT/public/fps/models/crossfire.glb"
