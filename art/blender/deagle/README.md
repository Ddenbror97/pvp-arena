# Desert Eagle viewmodel (Blender, battle royale)

Source and build scripts for the Desert Eagle (Mark XIX, 6" barrel):
`public/fps/models/deagle-terrorist.glb` and `deagle-police.glb` (first person, on each team's
arm rig; the battle royale uses the Police one) and `deagle-world.glb` (third person, ground loot
and icons).

| File | Purpose |
| --- | --- |
| `build_deagle_viewmodel.py` | Blender (headless, `bpy` 5.x): import, part split (slide group, hammer, trigger, magazine), marker empties, placement on the rig's right hand → `build/deagle-gun.glb` + `deagle_viewmodel.blend` (gitignored). |
| `../merge_gun_viewmodel.mjs deagle` | As for the MP5. |
| `../build_world_rifles.mjs deagle-world.glb` | Third-person pistol from `deagle-police.glb`. |

## Source

"Desert Eagle" by ELIZION (Sketchfab, CC BY 4.0; credit in `public/fps/models/ATTRIBUTION.md`),
27.7 cm long (a Mark XIX with the 6" barrel is 27.3 cm), centimetres, muzzle −Y.

    cd art/blender/deagle && mkdir -p build && cd build
    python3 ../build_deagle_viewmodel.py -- <desert_eagle/scene.gltf> deagle-gun.glb ../deagle_viewmodel.blend
    cd ../.. && node merge_gun_viewmodel.mjs deagle deagle/build/deagle-gun.glb build/ak-src.glb build/m4-src.glb ../../public/fps/models
    cd ../.. && node art/blender/build_world_rifles.mjs deagle-world.glb

## Node contract (read by the runtime)

| Node | Use |
| --- | --- |
| `ChargingHandle` | the slide: blows back 0.11 rig units (5.5 cm) on every shot, locks open on the last round, racked overhand on an empty reload |
| `ChargingKnob` | the rear slide serrations (right side) the overhand rack grips |
| `Hammer`, `Trigger` | cocked by the slide; the trigger finger |
| `Magazine`, `MagazineGrip` | drops free on the button; the support hand's baked grip on the fresh one |
| `MagRelease`, `SlideRelease`, `EjectionPort`, `MuzzleDeviceTip` | the button behind the trigger guard, the slide stop, brass, flash |
| `RearSightAperture`, `FrontSightPost` | iron sight aim |
| `OpticRail` | the barrel's Picatinny rail top (z 25.36 cm): the red dot's mount, the only optic the Deagle takes |
| `GripR`, `GripL` | the shooting hand; the support hand cupped round it |

Budget: 12.8k triangles for the gun; 4.5k in the world model.

## Animation

`src/lib/fps/deagle-animation.ts`: the researched idle (CS2 / Modern Warfare: two hands, pushed
out lower right, the slide angled in toward the crosshair), slide blowback, lock-open, and the
reloads: tactical (drop, fetch, palm the magazine home) and empty (the same, then an overhand
rack and the slide slamming home), 1.9 s in the battle royale. Between the magazine grip and the
overhand grip the support hand is routed below the frame and its baked grips slide rather than
turn (`bakedTravel: "slide"` in authored-viewmodel.ts), so the forearm never sweeps the camera.

## Gloves (thumb v2, 2026-11-09)

The Deagle's gloves are their own build: the shared glove sculpt with `GLOVE_THUMB_V2=1` (a thick
thumb fused into a fuller thenar pad and web, `arms/glove_sdf.py`), so the shooting thumb no
longer reads as a thin tube glued onto the hand. Both teams share one rig, so one build serves
both GLBs; the other weapons keep the original gloves.

    cd art/blender && mkdir -p build/thumb
    node arms/dump_rig.mjs ../../public/fps/models/deagle-police.glb build/thumb/rig.json
    GLOVE_THUMB_V2=1 python3 arms/build_gloves.py -- build/thumb/rig.json build/thumb/gloves --lp-voxel 0.0011 --textures --size 2048
    for t in police terrorist; do
      cp ../../public/fps/models/deagle-$t.glb build/thumb/deagle-$t-before.glb
      NO_DEDUP=1 node arms/merge_arms.mjs build/thumb/deagle-$t-before.glb build/thumb/gloves ../../public/fps/models/deagle-$t.glb
    done
    # drop the two deagle "arms" entries from public/fps/models/viewmodel-shared.json, then:
    cd ../.. && node art/blender/dedupe_viewmodel_textures.mjs
