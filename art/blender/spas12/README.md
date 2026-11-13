# SPAS-12 viewmodel (Blender, battle royale)

Source and build scripts for the battle royale's automatic shotgun:
`public/fps/models/spas12-police.glb` (first person, on the Police arm rig the battle royale
uses for every gun; there is no Terrorist build) and `spas12-world.glb` (third person, ground
loot and icons).

| File                                         | Purpose                                                                                                                                                                                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build_spas12_viewmodel.py`                  | Blender (headless, `bpy` 5.x): import, pose, split into the parts that move, simplify, PBR factors, optic rail, marker empties, placement on the rig's right hand → `build/spas12-gun.glb` + `spas12_viewmodel.blend` (gitignored; rebuilt from the download). |
| `../merge_gun_viewmodel.mjs spas12`          | Puts the gun on the shipped arm rigs, checks GripR and that the rig is unchanged, the node contract, meshopt + WebP (1K base colour). The Police and the Terrorist file ship (1v1 and 5v5 Terrorists hold it on the AK arms).                                  |
| `../dedupe_viewmodel_textures.mjs`           | Replaces the arm, sleeve and watch textures with the ones already in `viewmodel-shared.glb` (5.1 MB → 1.7 MB).                                                                                                                                                 |
| `../build_world_rifles.mjs spas12-world.glb` | Third-person SPAS-12 from `spas12-police.glb` (arms removed, simplified, 512 px textures, markers kept).                                                                                                                                                       |
| `scripts/fps/gun-review/`                    | Renders the runtime viewmodel: rest, shot, bolt locked open, equip, inspection and the reload's frames, from the eye and from outside.                                                                                                                         |

## Source

"Franchi SPAS-12" by FamousUnityHubSoldier (Sketchfab, **Sketchfab Standard licence**; see
`public/fps/models/ATTRIBUTION.md` for the open point about its origin). A skinned kit in
decimetres, 73.7k triangles, nine base-colour maps and nothing else, its variants side by side
and its moving parts parked far away in the rest pose; the glTF's own pose assembles the gun.
The download is not in the repository. Unzip it outside the repo, then:

    cd art/blender/spas12 && mkdir -p build && cd build
    python3 ../build_spas12_viewmodel.py -- <franchi_spas-12/scene.gltf> spas12-gun.glb ../spas12_viewmodel.blend
    cd ../.. && node merge_gun_viewmodel.mjs spas12 spas12/build/spas12-gun.glb build/ak-src.glb build/m4-src.glb <out-dir>
    cp <out-dir>/spas12-police.glb <out-dir>/spas12-terrorist.glb ../../public/fps/models/
    cd ../.. && node art/blender/dedupe_viewmodel_textures.mjs
    node art/blender/build_world_rifles.mjs spas12-world.glb
    node scripts/br/icons/render.mjs public/fps/br/icons spas12,ammo-12g

`art/blender/build/ak-src.glb` and `m4-src.glb` are the shipped `ak47-authored.glb` and
`m4a1-authored.glb` decompressed with `npx gltf-transform copy`.

### Replacing the model

Anything that provides the node contract below works with the runtime as it is. The build
script's landmarks (`BORE_Z`, `TUBE_Z`, `TUBE_REAR_Y`, `MUZZLE_Y`, the grip, `BONE_PART`,
`DROP`) are measured from this kit and have to be measured again from a new one; the clips'
shell path (`spas12-animation.ts` NEAR / ENTER) follows the loading port's place.

## Node contract (read by the runtime)

| Node                                                                      | Use                                                                                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Magazine`, `MagazineGrip`                                                | the 12-gauge shell the hand loads (at rest pushed home inside the tube, drawn only in the hand) and the hand's hold on it |
| `ChargingHandle`, `ChargingKnob`                                          | the bolt: back 0.17 rig units on every shot, held open on an empty tube; its handle on the right                          |
| `Carrier`                                                                 | the flap over the loading port, hinged at its rear; each shell pushes it up                                               |
| `Pump`                                                                    | the fore-end (its own node; it does not move in automatic fire)                                                           |
| `Trigger`, `MagRelease`, `EjectionPort`, `LoadingPort`, `MuzzleDeviceTip` | trigger finger, the carrier latch, the fired hull, the review close-up, muzzle flash and muzzle devices                   |
| `RearSightAperture`, `FrontSightPost`                                     | iron sight aim (ADS without an optic)                                                                                     |
| `OpticMountGeometry`                                                      | the receiver rail: hidden until an optic is fitted; optics stand on its top                                               |
| `GripR`, `GripL`                                                          | the right hand on the pistol grip (must equal the rig's); the support hand under the fore-end                             |

Budget: 31.7k triangles for the gun; 12.0k and 14 draws in the world model.

## Animation

`src/lib/fps/spas12-animation.ts`. The reload is shell by shell and counted by the server
(`br/combat.ts`: a start, one stage a shell, an end; `items.ts` `shells`), so one clip holds
three parts and the server's stage picks the part (`spas12ClipTime`):

| Part of the clip | Server stage                | What plays                                                                                                                                                            |
| ---------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 – 0.30         | start, 0.45 s               | the hand leaves the fore-end, the gun rolls over until the loading port faces the hand                                                                                |
| 0.30 – 0.65      | one shell, 0.52 s, repeated | the hand brings a shell up, its nose lifts the carrier, the thumb runs it past the shell stop (the click), the hand goes down for the next; the pass ends as it began |
| 0.65 – 1         | end, 0.50 s                 | the gun comes back up, the hand returns to the fore-end; from empty the bolt, open until now, runs home                                                               |

Firing with shells in the gun breaks the reload off (the same end part, played over the
server's 0.28 s). Also in the file: the equip (the gun raised into the ready position) and the
inspection (F: the left side, then the receiver's top and the action), both client-only.
`tests/spas12-viewmodel.test.ts` checks that the pass loops, the parts meet and nothing jumps.

Sounds: the owner's recordings in `art/audio/owner-2026-11-13/`, built by
`scripts/fps/build-br-spas12-audio.mjs`; the reload's cues are played one at a time where the
clip makes them (`br-arena.ts`).
