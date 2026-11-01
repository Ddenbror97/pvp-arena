#!/bin/bash
# Rebuild both characters (.blend + GLB) and install the optimized GLBs into public/fps/models.
set -e
cd "$(dirname "$0")"
PY=${BLENDER_PY:-/root/bpyenv/bin/python}
GT=../node_modules/.bin/gltf-transform
mkdir -p build/out
for pair in police:police-operator terrorist:terrorist-insurgent; do
  r=${pair%%:*}; o=${pair##*:}
  $PY build_character.py -- $r build/out/$r.glb --blend $r.blend --voxel 0.006 | grep STATS
  $GT dedup build/out/$r.glb build/out/$r-d.glb >/dev/null
  $GT prune build/out/$r-d.glb ../../../public/fps/models/$o.glb >/dev/null
done
ls -la ../../../public/fps/models/police-operator.glb ../../../public/fps/models/terrorist-insurgent.glb
