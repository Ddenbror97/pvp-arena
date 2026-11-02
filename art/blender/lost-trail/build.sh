#!/usr/bin/env bash
# LOST TRAIL pipeline: layout → textures → EZ-Tree skeletons → Blender (.blend + .glb) →
# GPU instancing + meshopt → public/fps/models/lost-trail.glb.
#   BLENDER_PY=/path/to/python-with-bpy [CHROMIUM=/path/to/chrome] art/blender/lost-trail/build.sh [--blockout]
# The backdrop bake renders in headless Chromium (SwiftShader); CHROMIUM picks the binary.
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
  # Pass 1: the full forest, only to bake the backdrop from (see bake/).
  "$PY" build_trail.py -- build/lost-trail-full.glb 2>&1 | grep -E "Error|Traceback" || true
  node instance_sections.mjs build/lost-trail-full.glb build/lost-trail-full-instanced.glb >/dev/null
  node bake/bake.mjs build/lost-trail-full-instanced.glb build/backdrop ${CHROMIUM:+--chromium=$CHROMIUM}
  python3 bake/compose.py build/backdrop build/tex/forest_backdrop.png
  # Pass 2: the shipped scene, the forest beyond the walls replaced by the baked backdrop.
  LOST_TRAIL_BACKDROP=build/backdrop/backdrop.json "$PY" build_trail.py -- build/lost-trail.glb --blend build/lost-trail.blend 2>&1 | grep -E "PLACED|RIVERBANKS|DETAIL|CROP|exported|Error|Traceback" || true
fi
if [[ "${1:-}" == "--blockout" ]]; then
  "$GT" instance build/lost-trail.glb build/lost-trail-instanced.glb --min 2 >/dev/null
else
  # Per-section GPU instancing keeps frustum culling effective (see instance_sections.mjs).
  node instance_sections.mjs build/lost-trail.glb build/lost-trail-instanced.glb
fi
"$GT" meshopt build/lost-trail-instanced.glb "$ROOT/public/fps/models/lost-trail.glb" --level medium >/dev/null
ls -la "$ROOT/public/fps/models/lost-trail.glb"
