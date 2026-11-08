#!/usr/bin/env bash
# Karambit GLB: (optionally) the model from the Sketchfab download, then the animation clips,
# texture downscale, WebP and meshopt.
#   BLENDER_PY=/path/to/python-with-bpy art/blender/karambit/build.sh            # clips only
#   BLENDER_PY=/path/to/python-with-bpy art/blender/karambit/build.sh scene.gltf # model + clips
# The source is the Sketchfab download (CC BY 4.0, see README.md); it is not committed.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
PY="${BLENDER_PY:-/root/bpyenv/bin/python}"
GT="$ROOT/art/blender/node_modules/.bin/gltf-transform"
mkdir -p "$HERE/../build/karambit"
B="$HERE/../build/karambit"
if [ $# -ge 1 ]; then
  "$PY" "$HERE/build_karambit.py" -- "$1" "$B/karambit-model.glb" --blend "$HERE/karambit.blend" 2>&1 | grep -E "KNIFE|exported|Error|Traceback" || true
fi
"$PY" "$HERE/animate_karambit.py" -- "$HERE/karambit.blend" "$B/karambit-raw.glb" --save 2>&1 | grep -E "CLIPS|exported|Error|Traceback" || true
"$GT" resize "$B/karambit-raw.glb" "$B/k1.glb" --width 1024 --height 1024 >/dev/null
"$GT" webp "$B/k1.glb" "$B/k2.glb" --quality 88 >/dev/null
"$GT" meshopt "$B/k2.glb" "$ROOT/public/fps/models/karambit.glb" --level medium >/dev/null
ls -la "$ROOT/public/fps/models/karambit.glb"
