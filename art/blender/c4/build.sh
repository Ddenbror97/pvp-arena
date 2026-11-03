#!/usr/bin/env bash
# C4 (Bomb Defusal plant / defuse prop): Blender build (model, keypad morphs, control rig, clips,
# preview cameras) → texture downscale, WebP, meshopt → public/fps/models/c4.glb.
#   BLENDER_PY=/path/to/python-with-bpy art/blender/c4/build.sh <path/to/scene.gltf>
# The source is the supplied download (see README.md); it is not committed.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
PY="${BLENDER_PY:-/root/bpyenv/bin/python}"
GT="$ROOT/art/blender/node_modules/.bin/gltf-transform"
SRC="${1:?usage: build.sh <c4 scene.gltf>}"
B="$HERE/../build/c4"
mkdir -p "$B"
"$PY" "$HERE/build_c4.py" -- "$SRC" "$B/c4-raw.glb" --blend "$HERE/c4.blend" 2>&1 | grep -E "C4 |exported|Error|Traceback" || true
# First-person close-ups: 1024 px colour and normal maps, 512 px metal/rough.
"$GT" resize "$B/c4-raw.glb" "$B/c1.glb" --width 1024 --height 1024 >/dev/null
"$GT" resize "$B/c1.glb" "$B/c2.glb" --width 512 --height 512 --pattern "*metallicRoughness*" >/dev/null
"$GT" webp "$B/c2.glb" "$B/c3.glb" --quality 88 >/dev/null
"$GT" prune "$B/c3.glb" "$B/c4.glb" --keep-attributes false --keep-leaves true >/dev/null
"$GT" meshopt "$B/c4.glb" "$ROOT/public/fps/models/c4.glb" --level medium >/dev/null
ls -la "$ROOT/public/fps/models/c4.glb"
