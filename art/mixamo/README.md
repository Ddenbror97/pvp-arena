# Mixamo rifle locomotion (source clips, not in git)

The characters' walk, run, strafe, backward and crouch gaits come from Adobe Mixamo
(mixamo.com). Mixamo's licence allows the animations in games, commercial ones included, but
not redistributing the animation files themselves, and this repository is public, so the FBX
files are ignored (.gitignore). Only the baked foot paths ship:
`public/fps/locomotion/rifle-v1.json` (scripts/fps/locomotion/bake.mjs).

To re-bake, download these into this folder (FBX Binary, Without Skin, 30 fps; "In Place"
either way, the bake removes the travel):

| File | Mixamo search |
|---|---|
| Rifle_Idle.fbx | Rifle Idle |
| Rifle_Walk.fbx | Rifle Walk |
| Rifle_Run.fbx | Rifle Run |
| Backwards_Rifle_Walk.fbx | Walking Backwards (rifle) |
| Strafe_Left.fbx | Strafe Left (rifle) |
| Rifle_Crouch_Walk.fbx | Rifle Crouch Walk |
| Death_From_The_Front.fbx | Death From The Front |
| Swimming.fbx | Swimming |

The right strafe is the left one mirrored (Mixamo's "Strafe Right" is a single step, not a
cycle). Then: `node scripts/fps/locomotion/bake.mjs` (gaits, `rifle-v1.json`) and
`node scripts/fps/locomotion/bake-death.mjs` (death, `death-front-v1.json`) and
`node scripts/fps/locomotion/bake-swim.mjs` (the battle royale's swimming stroke, `swim-v1.json`).
