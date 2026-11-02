# Karambit (secondary weapon)

Source: "Karambit" by Diamonddogkz, CC BY 4.0
(https://sketchfab.com/3d-models/karambit-dfd7606f189a413681305a39b8841ce8). The download is not
committed. Credit lives in `public/fps/models/ATTRIBUTION.md`.

## Build

    BLENDER_PY=/path/to/python-with-bpy art/blender/karambit/build.sh <download>/scene.gltf

`build_karambit.py` (Blender 4.x/5.x, bpy):

1. Imports the glTF, joins the parts and normalises the knife to 0.19 m. The origin goes to the
   finger-ring centre (knife space: ring axis x, handle toward -y, blade curving toward +z).
2. Adds markers `RingCenter`, `HandleMid`, `Guard` and `BladeTip`.
3. Builds the control rig (empties) the game reads:
   - `KR_Hand`: wrist offset and rotation in viewmodel space.
   - `KR_Knife`: knife rotation about the ring.
   - `KR_Fingers`: x = grip (1 closed, 0 open), driving the open-hand morph on the gloves.
   - `KR_View`: viewmodel-camera framing (never the aim).
4. Keys the clips below as actions and exports them as glTF animations.
5. Stores sound cue times in the scene extras (`cues`) and saves `karambit.blend` with 1K textures.

`build.sh` then resizes the textures to 1K, converts them to WebP (q88), applies meshopt and writes
`public/fps/models/karambit.glb` (about 0.5 MB, including about 0.1 MB of animation).

In game the knife is drawn at `KARAMBIT_SCALE` (1.2, `src/lib/fps/karambit-viewmodel.ts`) about its
ring, in first and third person. The size is cosmetic; reach is set on the server.

## Clips

| Clip                                                                                                                  | Length     | Use                                                                       |
| --------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| `karambit_equip`                                                                                                      | 0.6 s      | draw (server draw time 450 ms)                                            |
| `karambit_idle`                                                                                                       | 4.0 s loop | breathing idle                                                            |
| `karambit_idle_spin`, `karambit_reverse_grip`, `karambit_double_flip`, `karambit_inspect_blade`, `karambit_freestyle` | 1.15–3.4 s | random idle tricks every 8–15 s while still, never the same twice running |
| `karambit_inspect`                                                                                                    | 5.6 s      | F                                                                         |
| `karambit_walk`, `karambit_strafe`, `karambit_sprint`                                                                 | loops      | additive movement layers                                                  |
| `karambit_land`                                                                                                       | 0.38 s     | additive landing                                                          |
| `karambit_slash`                                                                                                      | 0.4 s      | left mouse (server cooldown 420 ms)                                       |
| `karambit_stab`                                                                                                       | 0.72 s     | right mouse (server cooldown 1000 ms)                                     |
| `karambit_unequip`                                                                                                    | 0.25 s     | additive reference pose                                                   |

Animation is cosmetic. Hits, damage, draw time and cooldowns are decided by the server
(`src/lib/fps/simulation.ts` `knifeAttack`, `src/lib/fps/combat.ts` `KNIFE`). Idle tricks and
inspect send nothing over the network.

## Preview

    node scripts/fps/viewmodel-capture/capture.mjs <ak|m4> <outDir> <shots.json> --chromium=<path> [--size=WxH] [--fov=60]

`shots.json` is a list of `{ "clip": "karambit_inspect", "t": 2.2, "name": "inspect" }`. The
preview renders the real first-person module with each team's arms.
