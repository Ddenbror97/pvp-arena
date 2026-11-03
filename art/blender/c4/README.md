# C4 (Bomb Defusal: Terrorist plant, Police defuse, planted bomb)

One model for the first-person plant (Terrorist arms), the first-person defuse (Police arms) and
the dropped / planted bomb in the world.

Source: "C4" by photon (that one larry), CC BY 4.0
(https://sketchfab.com/3d-models/c4-f9637de2f42246e0927a84c722cebc78), supplied by the owner. The
download is not committed. Credit lives in `public/fps/models/ATTRIBUTION.md` (with a provenance
note: its internal names suggest a game extraction; the owner chose to use it).

## Build

    BLENDER_PY=/path/to/python-with-bpy art/blender/c4/build.sh <download>/scene.gltf

1. `build_c4.py` (Blender 5.x, bpy): imports the skinned download, poses and un-skins it, and splits
   it into static parts in device space (+X right, +Y top/LCD end, +Z out of the keypad, origin at
   the back-face centre, real size):
   - `C4_Body` (one mesh, one primitive per material, specular maps dropped);
   - `C4_Keys` (the 12 buttons, one morph target `press_<key>` each, 1.2 mm travel);
   - `C4_Screen` (a quad over the LCD window, UV 0–1; the game draws the display);
   - `C4_LedsOn` (lit LEDs; the unlit ones are in the body);
   - `C4_Key_<key>` markers at each cap top. Model facts go in the scene extras `c4.model`.
2. `animate_c4.py`: the control rig, clips, cues and preview cameras (see below).
3. `build.sh`: textures to 1024 px (metal/rough 512 px), WebP q88, meshopt →
   `public/fps/models/c4.glb` (about 1 MB with animation).

`c4.blend` is the editable result (rig, all clips on NLA tracks, cameras A–F).

## Control rig (glTF axes; clip root = the first-person camera, metres)

| Node | Meaning |
| --- | --- |
| `C4_Device` | the device in camera space (scale `C4_SCALE` 1.7); parent of the model and the targets below |
| `C4_Tip` | where the right index fingertip's pad must be (device space). The game places the right wrist so the pad lands exactly there, so every press touches the cued key |
| `C4_HandR` | right-hand orientation (local +x along the hand, +y out of the palm) |
| `C4_PalmL` | left palm centre and orientation (same axes) |
| `C4_Fingers` | x = right index flex (0 extended → 1 pressing), y = right hand relaxed, z = left grip |

## Clips (60 fps keys)

| Clip | Length | Use |
| --- | --- | --- |
| `c4_plant` | 3.2 s (= `BOMB_RULES.plantMs`) | the whole plant, sampled at the room's plant clock |
| `c4_equip`, `c4_plant_start`, `c4_keypad_entry`, `c4_plant_confirm`, `c4_place` | 0.42 / 0.32 / 1.62 / 0.36 / 0.48 s | the phases of `c4_plant`, for editing and previews |
| `c4_plant_complete` | 0.3 s | after the room confirms the plant |
| `c4_plant_cancel` | 0.3 s | interrupted; the game cross-fades into it from wherever the plant was |

Timeline of `c4_plant`: equip 0–0.42 s (rifle drops out, device rises from below and settles),
secure 0.42–0.74 (power-on, tilt toward the eye, index extends), code 0.74–2.36 (seven presses
2-7-4-9-1-6-0 at uneven intervals, wrist turned per column/row, the left hand absorbing each
press), confirm 2.36–2.72 (`#`, held longer; LCD "ARMED"), place 2.72–3.2 (right hand to the
device's edge, both hands lower it forward out of view, left hand releases).

Cues (scene extras `c4.cues`): `press:<key>`, `power`, `armed`, `grab`, `place`, `release`,
`cancel`, `safe`. The LCD, LEDs and sounds follow them.

## Defuse rig and clips

The defuse leaves `C4_Device` to the game (the planted bomb's pose; its device channels are
dropped from the defuse clips at load). Its own nodes:

| Node | Meaning |
| --- | --- |
| `C4_DWork` | work frame, child of the device, turned by the game about the face normal so its -y points at the viewer: the hands come from the viewer's side however the bomb lies |
| `C4_DTipKey` | fingertip pad on the keys (device space) |
| `C4_DTipFree` | fingertip off the keys (work frame: approach, withdraw) |
| `C4_DMix` | x = 0 free → 1 on the keys |
| `C4_DHandR`, `C4_DPalmL` | right-hand turn, left palm on top of the device (work frame) |
| `C4_DFingers` | as `C4_Fingers` |

| Clip | Length | Use |
| --- | --- | --- |
| `c4_defuse` | 10 s (= `BOMB_RULES.defuseMs`) | approach 0–0.6, stabilise 0.6–1.2, keypad 1.2–9.4 (12 presses, uneven, wrist turned per column), confirm `#` at 9.72 |
| `c4_defuse_start`, `c4_defuse_reach`, `c4_defuse_keypad`, `c4_defuse_confirm` | phases of `c4_defuse` | editing and previews |
| `c4_defuse_complete` | 0.6 s | after the room says defused (LCD "DISARMED") |
| `c4_defuse_cancel` | 0.35 s | interrupted |

A 5 s kit defuse plays the same clip with the keypad section squeezed (`defuseClipTime`): the
approach (1.2 s) and the confirmation (0.6 s) keep their timing.

## Preview

    node scripts/fps/c4-capture/capture.mjs ak <outDir> <shots.json> [--chromium=<path>]
    node scripts/fps/c4-capture/capture.mjs ak <outDir> --sequence=A,B,C,D,E,F
    node scripts/fps/c4-capture/capture.mjs m4 <outDir> <shots.json>    # shots with "defuse": {...}
    node scripts/fps/c4-capture/capture.mjs m4 <outDir> --defuse-sequence=10,0.55,25,AB

Cameras: A gameplay, B keypad close-up, C left three-quarter, D right three-quarter, E side,
F showcase orbit. In the game only A exists; the others are for inspection.
In-game checks (real client, in-page room, stepped clock): `node scripts/fps/bomb-harness/plant.mjs
<outDir>` and `defuse.mjs <outDir>`.
