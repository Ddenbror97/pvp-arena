#!/usr/bin/env bash
# Full arena pipeline: layout → textures → Blender (.blend + .glb) → checks → GPU instancing +
# meshopt → public/fps/models/aim-arena.glb. Pass --blockout for the Phase 2 grey-box version.
#   BLENDER_PY=/path/to/python-with-bpy art/blender/map/build.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
PY="${BLENDER_PY:-/root/bpyenv/bin/python}"
GT="$ROOT/art/blender/node_modules/.bin/gltf-transform"
cd "$HERE"
python3 layout.py && (cd "$ROOT" && npx prettier --write src/lib/fps/arena-layout.ts >/dev/null)
if [[ "${1:-}" == "--blockout" ]]; then
  "$PY" build_arena.py -- build/aim-arena-blockout.glb --blockout
  "$GT" meshopt build/aim-arena-blockout.glb "$ROOT/public/fps/models/aim-arena.glb"
  exit 0
fi
python3 textures.py
"$PY" build_arena.py -- build/aim-arena.glb --blend aim-arena.blend | grep -E "VALIDATE|KIT STATS|^    \("
python3 check_glb.py build/aim-arena.glb --json build/asset-stats.json
"$GT" instance build/aim-arena.glb build/aim-arena-instanced.glb --min 2
"$GT" meshopt build/aim-arena-instanced.glb "$ROOT/public/fps/models/aim-arena.glb" --level medium
ls -la "$ROOT/public/fps/models/aim-arena.glb"
