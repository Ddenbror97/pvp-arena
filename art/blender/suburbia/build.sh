#!/usr/bin/env bash
# SUBURBAN SHOWDOWN pipeline (as CROSSFIRE's): layout -> textures -> Blender (.blend + .glb) ->
# checks -> draw-call clean-up -> quantize + GPU instancing + meshopt -> public/fps/models/suburbia.glb.
# The Sketchfab sources are prepared once (tools/prep_sources.py) into source/*.glb.
# Pass --blockout for the grey-box version.
#   BLENDER_PY=/path/to/python-with-bpy art/blender/suburbia/build.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
PY="${BLENDER_PY:-/root/bpyenv/bin/python}"
GT="$ROOT/art/blender/node_modules/.bin/gltf-transform"
cd "$HERE"
python3 layout.py && (cd "$ROOT" && npx prettier --write src/lib/fps/suburbia-layout.ts >/dev/null)
if [[ "${1:-}" == "--blockout" ]]; then
  "$PY" build_suburbia.py -- build/suburbia-blockout.glb --blockout
  "$GT" meshopt build/suburbia-blockout.glb "$ROOT/public/fps/models/suburbia.glb"
  exit 0
fi
python3 textures.py >/dev/null
"$PY" build_suburbia.py -- build/suburbia.glb --blend suburbia.blend | grep -E "VALIDATE|KIT STATS|^    \(|^    [a-z_]+\.[0-9]|exported"
# Coplanar overlaps: none allowed in the project's own meshes; the third-party models' internal
# overlaps (the bus's doubled wheel caps) are reported but not fatal.
python3 ../map/check_glb.py build/suburbia.glb --json build/asset-stats.json > build/check.log || true
grep -v COPLANAR build/check.log
if grep COPLANAR build/check.log | grep -vE "\('(bus|truck_cab|car_[a-z]+|picket|shed|pole|mailbox|picnic|tower[a-z_]*|oak[a-z_]*|bush_[a-z]+|bin_[a-z]+|dumpster|streetlight|hydrant|box_[a-z]+|sign_[a-z]+|bed_[a-z]+|sofa_[a-z]+|dresser|wardrobe|fireplace_[a-z]+)', '(bus|truck_cab|car_[a-z]+|picket|shed|pole|mailbox|picnic|tower[a-z_]*|oak[a-z_]*|bush_[a-z]+|bin_[a-z]+|dumpster|streetlight|hydrant|box_[a-z]+|sign_[a-z]+|bed_[a-z]+|sofa_[a-z]+|dresser|wardrobe|fireplace_[a-z]+)'\)"; then
  echo "coplanar overlaps in project meshes"; exit 1
fi
# Draw-call and texture clean-up (flat swatch textures -> colour factors, no-op specular on
# metals, plain-colour primitives of one model joined through a palette texture): same look,
# fewer draw calls and textures. Needs the unquantized export.
node tools/optimize_glb.mjs build/suburbia.glb build/suburbia-optimized.glb
# Quantize BEFORE instancing: quantizing an EXT_mesh_gpu_instancing mesh afterwards (instance ->
# meshopt, as the other maps' pipelines do) misplaces and rescales its instances in three.js.
"$GT" quantize build/suburbia-optimized.glb build/suburbia-quantized.glb
"$GT" instance build/suburbia-quantized.glb build/suburbia-instanced.glb --min 2
"$GT" meshopt build/suburbia-instanced.glb "$ROOT/public/fps/models/suburbia.glb" --level medium
ls -la "$ROOT/public/fps/models/suburbia.glb"
