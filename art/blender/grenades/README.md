# Grenades (HE · smoke · incendiary)

`public/fps/models/grenades.glb` is built from the owner-supplied download of
**"Game ready grenades set" by Riskyerick** (Sketchfab Standard licence; see
`public/fps/models/ATTRIBUTION.md`). The download is not committed.

    BLENDER_PY=/path/to/python-with-bpy art/blender/grenades/build.sh <download>/scene.gltf

`build.sh` runs `build_grenades.py` (models) and `animate_grenades.py` (rig, clips, cameras),
saves `grenades.blend`, then downscales the textures (512 px colour / normal, 256 px
metal-rough), re-encodes them as WebP, deduplicates (the M18 and AN-M14 share one mesh) and
compresses with meshopt (~0.55 MB).

## Models (`build_grenades.py`)

Only three of the pack's five grenades are kept; the F1 and the M84 are deleted on import.

| Game type | Pack model   | Triangles (body / pin + ring / lever) |
| --------- | ------------ | ------------------------------------- |
| `he`      | RGD-5        | 3622 / 1388 / 1156                    |
| `smoke`   | M18          | 3181 / 1322 / 397                     |
| `fire`    | M14 (AN-M14) | 3181 / 1322 / 397                     |

Each grenade is split into loose parts and regrouped into the parts that move. The ring, the
split pin and the lever were picked by eye from colour-coded renders and are recorded by
signature (vertex count + bounds centre) in `parts.json`; tiny parts lying on a picked part
follow it. The AN-M14 reuses the M18's picks (same geometry, turned slightly).

Model space (glTF axes, metres, real size): origin on the body axis at the bottom, +Y up the
fuse, the lever on +X (the right palm closes over it).

| Node                                | What                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `GR_<t>`                            | model root                                                                        |
| `GR_<t>_Body`                       | everything that never moves                                                       |
| `GR_<t>_Pin` → `GR_<t>_PinMesh`     | the split pin and pull ring (they come out together); local +X along the pull     |
| `GR_<t>_Lever` → `GR_<t>_LeverMesh` | the spoon, pivot at its hinge (flies off the thrown grenade)                      |
| `GR_<t>_Grip`                       | the right palm's centre and the hand's turn (x along the hand, y out of the palm) |
| `GR_<t>_Ring`                       | the point on the ring the left thumb and index finger pinch                       |

Scene extras `grenades` (JSON): the held scale, the clip timings and cues, and per type the
model measurements (`grip`, `pinch`, `pull`, `pinLength`, …).

## Rig and clips (`animate_grenades.py`)

The clip root is the first-person camera (glTF axes, metres). The game places the team's own
arms (`src/lib/fps/grenades/grenade-viewmodel.ts`) from these nodes; nothing about the arms is
replaced:

| Node                   | Drives                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `G_Hand`               | the right palm (contact solve: the glove's palm centre lands exactly here) and the grenade in it (its `Grip` node on `G_Hand`, scaled ×1.35) |
| `G_HandL`              | the left thumb–index pinch point and turn while the left hand is free                                                                        |
| `G_Mix`                | x: the left pinch on the ring's pinch point instead (the fingers stay on the ring as the pin comes out)                                      |
| `G_Pull`               | x: the pin's travel (0 home, 1 out); y: the ring carried away by the left hand                                                               |
| `G_Fingers`            | x: right grip (open ↔ closed round the body: one baked grip per shape, round RGD-5 or cylinder); y: left pinch                               |
| `G_ElbowR`, `G_ElbowL` | elbow directions: the forearms turn toward them (wind-ups lift the elbow)                                                                    |

Poses are authored around the grenade's centre (the palm position is solved from it), so every
type sits at the same place on screen whatever its size; each type has its own ready pose (the
round HE lower and turned to show its ring, the cylinders upright) and its own clips:

| Clip `<t>_…`                                                      | Length                 | Server rule (`src/lib/fps/grenades/rules.ts`)                 |
| ----------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------- |
| `equip`                                                           | 0.45 s                 | `equipMs` 450                                                 |
| `idle`, `walk`, `sprint`                                          | 3 / 0.8 / 0.66 s loops | —                                                             |
| `pin_pull`                                                        | 0.45 s                 | cues `pin-grab` 0.12, `pin-out` 0.30                          |
| `cock_over`, `cock_medium`, `cock_under`                          | 0.17 s                 | `primeMs` 620 from the press                                  |
| `throw_overhand`, `throw_medium`, `throw_underhand`, `jump_throw` | 0.52 s                 | release at `releaseMs` 120 / 110 / 140 / 120; `recoverMs` 520 |
| `inspect`                                                         | 3.2 s                  | cosmetic; interrupted by anything                             |

The throw clips include the follow-through and the recovery (from 0.3 s): the previous weapon
comes back at `recoverMs`.

## Preview cameras

`grenades.blend` has the eight inspection cameras (`A_first_person`, `B_right_close`,
`C_left_close`, `D_front_three_quarter`, `E_top_down`, `F_over_shoulder`, `G_slow_close`,
`H_projectile`). The same set renders the real runtime module (team arms included) in headless
Chromium:

    node scripts/fps/grenade-capture/capture.mjs <ak|m4> <outDir> <shots.json> [--chromium=…]
    node scripts/fps/grenade-capture/capture.mjs ak <outDir> --sequence=he,over,ABCG
