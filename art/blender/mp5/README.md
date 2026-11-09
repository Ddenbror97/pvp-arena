# MP5 viewmodel (Blender, battle royale)

Source and build scripts for the MP5 submachine gun: `public/fps/models/mp5-terrorist.glb` and
`mp5-police.glb` (first person, on each team's arm rig; the battle royale uses the Police one,
like its AWP, knife and grenades) and `mp5-world.glb` (third person, ground loot and icons).

| File | Purpose |
| --- | --- |
| `build_mp5_viewmodel.py` | Blender (headless, `bpy` 5.x): import, part classification, claw optic mount, marker empties, placement on the rig's right hand → `build/mp5-gun.glb` + `mp5_viewmodel.blend` (gitignored: >100 MB with packed textures; rebuilt from the download). |
| `../merge_gun_viewmodel.mjs mp5` | Puts the gun on the shipped arm rigs (Terrorist from the AK GLB, Police from the M4A1 GLB), checks GripR and that the rig is unchanged, the node contract, meshopt + WebP (2K base colour, 1K others). |
| `../build_world_rifles.mjs mp5-world.glb` | Third-person MP5 from `mp5-police.glb` (arms removed, simplified, 512 px textures, markers kept). |
| `../gun-review/` | Blender-output review renders; `scripts/fps/gun-review/` renders the runtime viewmodel (rest, shot, reload frames, eye and outside views, both teams). |

## Source

"HK MP5 SMG" by dani-zzz (Sketchfab, CC BY 4.0; credit in `public/fps/models/ATTRIBUTION.md`):
an MP5A2 at 1.332× real size, five PBR materials with 2K maps. Download the glTF and unzip it
somewhere outside the repo, then:

    cd art/blender/mp5 && mkdir -p build && cd build
    python3 ../build_mp5_viewmodel.py -- <hk_mp5_smg/scene.gltf> mp5-gun.glb ../mp5_viewmodel.blend
    cd ../.. && node merge_gun_viewmodel.mjs mp5 mp5/build/mp5-gun.glb build/ak-src.glb build/m4-src.glb ../../public/fps/models
    cd ../.. && node art/blender/build_world_rifles.mjs mp5-world.glb

`art/blender/build/ak-src.glb` and `m4-src.glb` are the shipped `ak47-authored.glb` and
`m4a1-authored.glb` decompressed with `npx gltf-transform copy`.

## Node contract (read by the runtime)

| Node | Use |
| --- | --- |
| `Magazine`, `MagazineGrip` | magazine change; the support hand's baked grip on the fresh magazine |
| `ChargingHandle`, `ChargingKnob` | the cocking lever (pulled back 0.15 rig units, turned up into its notch, slapped home) and the hand's grip on it |
| `Trigger`, `MagRelease`, `EjectionPort`, `MuzzleDeviceTip` | trigger finger, the paddle release, brass, muzzle flash and muzzle devices |
| `RearSightAperture`, `FrontSightPost` | iron sight aim (battle royale ADS without an optic) |
| `OpticMountGeometry` | the claw mount: hidden until an optic is fitted; optics stand on its rail top |
| `GripR`, `GripL` | the right hand on the pistol grip (must equal the rig's); the support hand under the handguard |

Budget: 32.4k triangles for the gun; 14.9k in the world model.

## Animation

`src/lib/fps/mp5-animation.ts`: the researched idle (CS2 MP5-SD / Modern Warfare MP5 framing:
low right, a little canted, the support hand under the handguard) and the reloads: tactical
(magazine swap, palm smack) and empty (cocking lever locked back, magazine change, HK slap),
2.3 s in the battle royale (`items.ts`). Sounds: the owner's recordings in `art/audio/owner-2026-11-09/`, built by `scripts/fps/build-br-smg-pistol-audio.mjs`.
