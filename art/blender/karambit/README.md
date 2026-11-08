# Karambit (secondary weapon)

Source: "Karambit" by Diamonddogkz, CC BY 4.0
(https://sketchfab.com/3d-models/karambit-dfd7606f189a413681305a39b8841ce8). The download is not
committed. Credit lives in `public/fps/models/ATTRIBUTION.md`.

## Build

    BLENDER_PY=/path/to/python-with-bpy art/blender/karambit/build.sh              # clips only
    BLENDER_PY=/path/to/python-with-bpy art/blender/karambit/build.sh scene.gltf   # model + clips

1. `build_karambit.py` (only with the download; Blender 4.x/5.x, bpy) imports the glTF, joins the
   parts and normalises the knife to 0.19 m. The origin goes to the finger-ring centre (knife
   space: ring axis x, handle toward -y, blade curving toward +z). It adds the markers
   `RingCenter`, `HandleMid`, `Guard` and `BladeTip` and saves `karambit.blend` with 1K textures.
2. `animate_karambit.py` opens `karambit.blend`, (re)builds the control rig the game reads and
   keys every clip from `karambit_clips.py`, stores the sound cue times in the scene extras
   (`cues`), saves the .blend and exports the GLB:
   - `KR_Hand` / `KR_HandL`: each wrist's offset (camera-space metres) and turn in the hand's own
     frame, from the two-hand stance (`KARAMBIT_STANCE` in `src/lib/fps/karambit-viewmodel.ts`).
   - `KR_Elbow` / `KR_ElbowL`: elbow offsets; each forearm aims at its elbow, so they set where
     the forearm enters the screen (the right elbow drops while the knife is up by the centre).
   - `KR_Knife`: knife turn about the ring.
   - `KR_Fingers` (middle, ring, little), `KR_Thumb`: right fingers closed on the handle (1) or
     lifted off it (0); one authored grip curve, rippled finger by finger (the little finger
     leads). The index finger never leaves the ring.
   - `KR_FingersL`: left hand curl (loose fist) and open spread.
   - `KR_View`: viewmodel framing (never the aim).
3. `build.sh` then resizes the textures to 1K, converts them to WebP (q88), applies meshopt and
   writes `public/fps/models/karambit.glb` (about 0.55 MB, including the animation).

In game the knife is drawn at `KARAMBIT_SCALE` (1.2, `src/lib/fps/karambit-viewmodel.ts`) about its
ring, in first and third person. The size is cosmetic; reach is set on the server.

## First person: both hands

- Right hand: the knife in a reverse-grip hammer fist, index finger through the ring. The fist
  stands upright at the lower right with the back of the hand to the camera, the forearm rising
  diagonally from the bottom right in line with it; the blade curves up from the fist's outer
  edge, about where the former one-hand carry showed it.
- Left hand: open and relaxed at the lower left, fingers toward the centre, thumb up, back of the
  hand to the camera, the forearm rising diagonally from the bottom left; a loose-fist and an
  open-spread morph.
- Fingers: the right fist's middle, ring and little fingers and thumb each have an "open" morph
  (the joints unbent about the knuckle axis), so they lift off the handle one after another for
  spins and close again on the catch.
- Each forearm aims at its elbow (the wrist bends at most 38°) and is stretched until it leaves
  the view: no elbow is ever on screen. Placement keeps its screen position at any aspect
  (narrow screens bring the hands in, ultrawide ones keep them in reach) and field of view.

## Clips

| Clip                                                                                                                  | Length     | Use                                                                       |
| --------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| `karambit_equip`                                                                                                      | 0.6 s      | draw: both hands rise, the knife flips once (server draw time 450 ms)     |
| `karambit_idle`                                                                                                       | 4.0 s loop | breathing, small wrist and finger adjustments, both hands                 |
| `karambit_inspect`                                                                                                    | 3.5 s      | F: raise, ring spin, both faces of the blade close up, flourish and catch |
| `karambit_inspect_spin`                                                                                               | 3.2 s      | F (alternate, random): double spin, reverse-grip flip, low catch          |
| `karambit_idle_spin`, `karambit_reverse_grip`, `karambit_double_flip`, `karambit_inspect_blade`, `karambit_freestyle` | 1.15–3.4 s | random idle tricks every 8–15 s while still, never the same twice running |
| `karambit_walk`, `karambit_sprint`                                                                                    | loops      | additive movement layers (the hands swing in opposite phase)              |
| `karambit_air`                                                                                                        | loop       | additive airborne lift, eased in on take-off                              |
| `karambit_land`                                                                                                       | 0.38 s     | additive landing                                                          |
| `karambit_slash`                                                                                                      | 0.4 s      | left mouse: backhand sweep; the left hand opens to balance it (420 ms)    |
| `karambit_stab`                                                                                                       | 0.72 s     | right mouse: cocked, driven thrust; the left hand braces (1000 ms)        |
| `karambit_unequip`                                                                                                    | 0.25 s     | additive reference pose                                                   |

Animation is cosmetic. Hits, damage, draw time and cooldowns are decided by the server
(`src/lib/fps/simulation.ts` `knifeAttack`, `src/lib/fps/combat.ts` `KNIFE`). Idle tricks and
inspect send nothing over the network. An attack or a weapon switch cuts an inspect at once.

## Preview

    node scripts/fps/viewmodel-capture/capture.mjs <ak|m4> <outDir> <shots.json> --chromium=<path> [--size=WxH] [--fov=60]

`shots.json` is a list of `{ "clip": "karambit_inspect", "t": 2.2, "name": "inspect" }`. A shot may
add `"view"` (`"front"`, `"right"`, `"left"`, `"top"`, `"three"` or `[yaw, pitch, distance]`) for a
development camera (the hands stay posed for the gameplay camera; a red dot marks the eye), with
`"target": "ring"` to orbit the knife; `"timeline"` plays the state machine (with `"inspect"`,
`"slash"`, `"stab"`, `"jump"`, `"land"` actions). The preview renders the real first-person module
with each team's arms.

In the real Bomb Defusal client:

    TEAM=police|terrorist W=1280 H=720 node scripts/fps/bomb-harness/knife.mjs <outDir> --chromium=<path>
