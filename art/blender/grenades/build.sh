#!/usr/bin/env bash
# Grenades (HE · smoke · incendiary): Blender build (three models split into body / pin + ring /
# lever, first-person control rig, clips, preview cameras) → texture downscale, WebP, meshopt →
# public/fps/models/grenades.glb.
#   BLENDER_PY=/path/to/python-with-bpy art/blender/grenades/build.sh <path/to/scene.gltf>
# The source is the supplied download (see README.md); it is not committed.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
PY="${BLENDER_PY:-/root/bpyenv/bin/python}"
GT="$ROOT/art/blender/node_modules/.bin/gltf-transform"
SRC="${1:?usage: build.sh <grenades scene.gltf>}"
B="$HERE/../build/grenades"
mkdir -p "$B"
"$PY" "$HERE/build_grenades.py" -- "$SRC" "$B/raw.glb" --blend "$HERE/grenades.blend" 2>&1 | grep -E "GRENADE|exported|Error|Traceback" || true
# Hand-held close-ups: 512 px colour and normal maps, 256 px metal/rough.
"$GT" resize "$B/raw.glb" "$B/g1.glb" --width 512 --height 512 >/dev/null
"$GT" resize "$B/g1.glb" "$B/g2.glb" --width 256 --height 256 --pattern "*metallicRoughness*" >/dev/null
"$GT" webp "$B/g2.glb" "$B/g3.glb" --quality 86 >/dev/null
"$GT" dedup "$B/g3.glb" "$B/g4.glb" >/dev/null
"$GT" prune "$B/g4.glb" "$B/g5.glb" --keep-attributes false --keep-leaves true >/dev/null
"$GT" meshopt "$B/g5.glb" "$ROOT/public/fps/models/grenades.glb" --level medium >/dev/null
ls -la "$ROOT/public/fps/models/grenades.glb"
