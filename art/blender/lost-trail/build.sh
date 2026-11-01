#!/usr/bin/env bash
# LOST TRAIL pipeline: layout → textures → EZ-Tree skeletons → Blender (.blend + .glb) →
# GPU instancing + meshopt → public/fps/models/lost-trail.glb.
#   BLENDER_PY=/path/to/python-with-bpy art/blender/lost-trail/build.sh [--blockout]
# Node dependencies (EZ-Tree, gltf-transform): `npm ci` in this folder first.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
PY="${BLENDER_PY:-/root/bpyenv/bin/python}"
GT="$ROOT/art/blender/node_modules/.bin/gltf-transform"
cd "$HERE"
python3 layout.py && (cd "$ROOT" && npx prettier --write src/lib/fps/lost-trail-layout.ts >/dev/null)
if [[ "${1:-}" == "--blockout" ]]; then
  "$PY" build_blockout.py -- build/lost-trail.glb --blend build/lost-trail-blockout.blend | grep -E "PLACEHOLDER|exported|Error"
else
  python3 textures.py
  (cd trees && node generate_trees.mjs ../build/trees >/dev/null)
  "$PY" build_trail.py -- build/lost-trail.glb --blend build/lost-trail.blend 2>&1 | grep -E "PLACED|exported|Error|Traceback" || true
fi
if [[ "${1:-}" == "--blockout" ]]; then
  "$GT" instance build/lost-trail.glb build/lost-trail-instanced.glb --min 2 >/dev/null
else
  # Per-section GPU instancing keeps frustum culling effective (see instance_sections.mjs).
  node instance_sections.mjs build/lost-trail.glb build/lost-trail-instanced.glb
fi
"$GT" meshopt build/lost-trail-instanced.glb "$ROOT/public/fps/models/lost-trail.glb" --level medium >/dev/null
ls -la "$ROOT/public/fps/models/lost-trail.glb"
