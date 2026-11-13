# PVP spinArena — 3D asset credits

The following models are adapted for use within this game. Modifications include
material/UV changes, PVP finish and decals, skin/forearm adaptation, fitted headgear,
geometry extraction, scale normalization and runtime skeletal posing.

## Authored AK and gloved hands (ak47-authored.glb, ak47-wear.webp)

The rifle meshes were re-shaded (welded, smooth-by-angle + weighted normals), given a wear UV
set and baked (ambient occlusion, edge and cavity masks → ak47-wear.webp) in Blender; see
art/blender/README.md. The arm textures are now embedded in the GLB.

The first-person gloves, forearm skin, sleeves and wristwatch are original work built in
Blender for this project (art/blender/arms/README.md); only the arm skeleton below is reused.

- **Fps arms** (arm skeleton / bind pose), DJMaesen (bumstrum):
  https://sketchfab.com/3d-models/fps-arms-9452ce4cddde4110a4fd73e555a8e412
  CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
- **FPS AK-74m animations**, Cransh (ccransh) — arm rig/grip template:
  https://sketchfab.com/3d-models/fps-ak-74m-animations-94be8385c402474cacd39bc096c6ca14
  CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
- AK mesh via **AetherRadar / Operation Steel Tide**, underlying CC0 mesh
  sources credited there (nisu, taradavies, Quaternius Ultimate Guns):
  https://github.com/AetherRadar/operation-steel-tide
- Prepared and modified asset by **cktang88 / 3d-fps**, first-person asset credits:
  https://github.com/cktang88/3d-fps#credits--licences
  Asset derivative released there under CC BY 4.0 unless otherwise specified.
  No application code from that project is included.

## Police M4A1 (m4a1-authored.glb)

Built in Blender (art/blender/m4): optic and flip-up sight removed, tan furniture recoloured to
black polymer, metal darkened, magazine and charging handle separated for animation, carry
handle and suppressor mounted, PVPSPINARENA violet accents, rescaled and placed on the shared
first-person arm rig above (gloves, forearm, olive sleeve and watch are project work).

- This work is based on "M4A1 Assault Rifle Game Ready"
  (https://sketchfab.com/3d-models/m4a1-assault-rifle-game-ready-c2a3c7b3ed4844b895a504f1bbe4f931)
  by polupan.andrew (https://sketchfab.com/polupan.andrew), licensed under CC BY 4.0
  (http://creativecommons.org/licenses/by/4.0/).
- This work is based on "M4/AR-15 Carry Handle Sight attachment"
  (https://sketchfab.com/3d-models/m4ar-15-carry-handle-sight-attachment-912b75802e6648cc904b4b8f57b6cb03)
  by SSMProductions (https://sketchfab.com/SSMProductions), licensed under CC BY 4.0
  (http://creativecommons.org/licenses/by/4.0/). Modified: bevelled, rescaled, refinished.
- "HuxWrx HX-QD 556 Suppressor (4K)"
  (https://sketchfab.com/3d-models/huxwrx-hx-qd-556-suppressor-4k-556bc7d8294d493386a9f637480de39c)
  by xylvnking (https://sketchfab.com/xylvnking), Sketchfab Standard license
  (https://sketchfab.com/licenses): used inside this game, not redistributed as a standalone
  asset. Modified: decimated, rescaled, refinished, violet front cap.

## Terrorist first-person jacket (in ak47-authored.glb)

The white duty-jacket sleeve on the Terrorist (AK) arms is original work built in Blender
(art/blender/arms/build_jacket_sleeve.py).

## Police character (police-swat.glb)

This work is based on "Game Ready Swat Character"
(https://sketchfab.com/3d-models/game-ready-swat-character-15e16f4b988f4dd1b0e71eeff4362e5c)
by dolon56 (https://sketchfab.com/dolon56), licensed under CC BY 4.0
(http://creativecommons.org/licenses/by/4.0/). Modified: skeleton renamed and refitted,
materials converted to metal/rough PBR, textures resized, animation removed
(art/blender/chars/fit_sourced.py).

## Terrorist character (terrorist-fighter.glb)

This work is based on "Terrorist 1 Rig"
(https://sketchfab.com/3d-models/terrorist-1-rig-dac4e93003804d23b8fc8927435b34e8)
by fake gman (https://sketchfab.com/tricky_modeler), listed under CC BY 4.0. Modified as above.
Note: the uploader states the mesh is not their own work ("all credits goes to the people who
made counter strike"); the listed license may therefore not be valid. Review before public
release.

## CROSSFIRE helicopter wreck (in crossfire.glb)

This work is based on "helicopter mi-8"
(https://sketchfab.com/3d-models/helicopter-mi-8-aaa58674609e40feafe816909de65ff9)
by mamont nikita (https://sketchfab.com/mamontnikita62), licensed under CC BY 4.0
(http://creativecommons.org/licenses/by/4.0/). Modified: landing gear, weapon pylons and rotor
blades removed, rescaled, cabin doors and window slits cut open, inner skin added, rear closed,
tail boom broken into pieces, paint weathered (art/blender/crossfire/heli.py).
Note: the file's internal names match Call of Duty asset naming, so the uploader's right to
license it is uncertain. Review before public release.

All other CROSSFIRE geometry and textures are project work (art/blender/crossfire).

## Project-owned visuals

PVP spinArena branding and reference artwork were supplied by the project/user.
The forearm skin surface texture was generated for this project with imagegen.
The new anatomical forearm geometry, fitting, material work and runtime integration
are project work. Third-party attribution does not imply creator endorsement.

## Karambit (karambit.glb)

Rebuilt in Blender (art/blender/karambit): meshes joined, scaled to 19 cm, origin moved to the
finger-ring centre, textures reduced to 1K WebP, ring/handle/guard/tip markers and the
first-person animation clips (control rig, project work) added. It replaces the pistol and is
held by each team's existing first-person and third-person arms.

- This work is based on "Karambit"
  (https://sketchfab.com/3d-models/karambit-dfd7606f189a413681305a39b8841ce8)
  by Diamonddogkz (https://sketchfab.com/Diamonddogkz), licensed under CC BY 4.0
  (http://creativecommons.org/licenses/by/4.0/).

## SUBURBAN SHOWDOWN (suburbia.glb)

The houses, garages, fences, the delivery truck's cargo box, the storage container, the trailer,
the street, the perimeter and the neighbourhood are project work (art/blender/suburbia). The
following Sketchfab models are used, modified as listed in art/blender/suburbia/source/README.md
(parts removed, decimated, rescaled, textures reduced, PVPSPINARENA wraps added). All are licensed
under CC BY 4.0 (http://creativecommons.org/licenses/by/4.0/).

- "School Bus" (https://sketchfab.com/3d-models/school-bus-a959ee8ce17d434f9fdbc93cad199a21) by Macaroni (https://sketchfab.com/Macaroniii)
- "Box Truck [Game Asset]" (https://sketchfab.com/3d-models/box-truck-game-asset-959e25ad21014bcf9066d3f6f7e7ecb2) by Jen S Abbott (https://sketchfab.com/jsabbott)
- "Duke '69 - Low Poly Model" (https://sketchfab.com/3d-models/duke-69-low-poly-model-46fed79f600c4fc69e060991f9e3e4f9) by Daniel Zhabotinsky (https://sketchfab.com/DanielZhabotinsky)
- "Negotiator '80 - Low poly model" (https://sketchfab.com/3d-models/negotiator-80-low-poly-model-892b2684fb37442299bfad9222cf331c) by Daniel Zhabotinsky (https://sketchfab.com/DanielZhabotinsky)
- "Fairheaven SW '84 - Low poly model" (https://sketchfab.com/3d-models/fairheaven-sw-84-low-poly-model-aa0becb6e854422596cac6b21bf79787) by Daniel Zhabotinsky (https://sketchfab.com/DanielZhabotinsky)
- "Green & white picket fence" (https://sketchfab.com/3d-models/green-white-picket-fence-35858549c7e947e9859cd335f671f586) by Shuckwaffles (https://sketchfab.com/shuckwaffles14)
- "Worn Shed PBR Game-Ready" (https://sketchfab.com/3d-models/worn-shed-pbr-game-ready-be6edd62e55a4f9a99da940fc164a5b9) by donnichols (https://sketchfab.com/donnichols)
- "Utility Pole (PBR)" (https://sketchfab.com/3d-models/utility-pole-pbr-92f4d3b0ef38472d8c1c62a28fe15135) by SLASH / RENDAR (https://sketchfab.com/SLASH-RENDAR)
- "Old US mailbox" (https://sketchfab.com/3d-models/old-us-mailbox-6cf41ee1a60143efb983b74c0d69a9a4) by PXBR (https://sketchfab.com/pixabar)
- "Picnic Table - Low Poly" (https://sketchfab.com/3d-models/picnic-table-low-poly-fe35acda3a5245da8459d1a062e28190) by Derek Flanagan (https://sketchfab.com/derek_flanagan)
- "Radio tower" (https://sketchfab.com/3d-models/radio-tower-4b3c733d8bfd4ee2b91dcbcd02670686) by Gunnar Correa (https://sketchfab.com/gunnarcorrea)
- "Oak Tree | Game Ready" (https://sketchfab.com/3d-models/oak-tree-game-ready-2f4ae6b907fd4741abda5d1b71c83b10) by Maple (https://sketchfab.com/aaloktrolllol)
- "Bush pack - Game Ready 3d plants (FBX,OBJ,GLB)" (https://sketchfab.com/3d-models/bush-pack-game-ready-3d-plants-fbxobjglb-673f15f2511345c8992d7b9517a9f224) by Rudransh_3d (https://sketchfab.com/Rudransh_3d)
- "PBR Street Props Pack (Game Ready)" (https://sketchfab.com/3d-models/pbr-street-props-pack-game-ready-8013d8e6af4645d1a7c3d5b24054bfc8) by MadeByYeshe (https://sketchfab.com/MadeByYeshe)
- "Street Asset Pack" (https://sketchfab.com/3d-models/street-asset-pack-f3eb47d02e2e4ab290e66752fa354b48) by vmatthew (https://sketchfab.com/vmatthew)
- "Low Poly Furnitures Full Bundle" (https://sketchfab.com/3d-models/low-poly-furnitures-full-bundle-05d29572fef94794803365bdbfd7afa9) by Taha Kaya (https://sketchfab.com/tkaya.ist)

The SUBURBAN SHOWDOWN loading art (src/assets/fps/suburbia-loading.webp) was supplied by the
project owner. Third-party attribution does not imply creator endorsement.

## C4 (c4.glb) — Bomb Defusal plant / defuse device and the planted bomb

- **C4**, photon (that one larry) (Professor_E12):
  https://sketchfab.com/3d-models/c4-f9637de2f42246e0927a84c722cebc78
  CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
  This work is based on "C4" by photon (that one larry), licensed under CC BY 4.0.
  Changes: un-skinned into static parts, keypad keys given press morph targets, the LCD replaced
  by a runtime-drawn display, the specular maps dropped, textures downscaled and re-encoded, a
  control rig and plant clips added (art/blender/c4).
  Provenance note: the download's internal names (`v_ied_source2`, `v_weapon.c4`, Bip01 bones)
  suggest it was extracted from a commercial game; the project owner chose to use it as
  licensed on Sketchfab.

## AWP sniper rifle (awp-terrorist.glb, awp-police.glb, awp-world.glb)

- **Sniper**, stevennvh: https://sketchfab.com/3d-models/sniper-f56c13d3653c43eabc44ecd59e5e9d3a
  (author: https://sketchfab.com/stevennvh)
  CC BY 4.0: http://creativecommons.org/licenses/by/4.0/
  This work is based on "Sniper" by stevennvh, licensed under CC BY 4.0.
  Changes (art/blender/awp): bipod, open lens caps, piggy-back red-dot sight and side-saddle
  cartridges removed; slab fore-end replaced by a new rounded fore-end with the barrel
  free-floated above it; pistol grip and barrel section added; magazine enlarged; bolt, bolt
  handle, magazine and trigger separated for animation; recoloured to an olive-polymer /
  black-steel / green-scope finish (source textures re-tinted); rescaled and placed on the
  project's first-person arm rig (credited above); simplified for the third-person model.

## Hunting Rifle (hunting-police.glb, hunting-world.glb)

Original work, built from scratch in Blender for this project (`art/blender/hunting`): walnut
sporter stock with cut checkering, blued round receiver and barrel, polished bolt, polymer
5-round magazine and a 3–9×36 scope. No third-party model data: the owner's "low poly stylized
sniper gun" (Sketchfab Standard licence) was looked at for proportions only and is not shipped
or used as geometry. Placed on the project's first-person arm rig (credited above).

## Grenades (grenades.glb) — HE (RGD-5), smoke (M18), incendiary (AN-M14)

- **Game ready grenades set**, Riskyerick: https://sketchfab.com/3d-models/game-ready-grenades-set-28730661f0b14cd39aed24c830120db5
  (author: https://sketchfab.com/Riskyerick)
  Licence: Sketchfab Standard (from the download's license.txt): use worldwide, in all media,
  commercially or not, and in derivative works; no attribution required (credited anyway); the
  model files may not be redistributed on their own (they ship only inside the game).
  Used: the RGD-5, M18 and M14 ("AN-M14") only; the pack's F1 and M84 are deleted on import and
  never exported.
  Changes (art/blender/grenades): each grenade split into its body, the safety pin with its pull
  ring, and the safety lever, for animation; turned to a common model space; textures
  downscaled and re-encoded; a first-person control rig and clips added for the project's own
  Police and Terrorist arms (credited above).

## MP5 submachine gun (mp5-terrorist.glb, mp5-police.glb, mp5-world.glb)

- **HK MP5 SMG**, dani-zzz: https://sketchfab.com/3d-models/hk-mp5-smg-fad0226e1dcf4af180f707a5509d3a4e
  (author: https://sketchfab.com/dani-zzz)
  CC BY 4.0: http://creativecommons.org/licenses/by/4.0/
  This work is based on "HK MP5 SMG" by dani-zzz, licensed under CC BY 4.0.
  Changes (art/blender/mp5): magazine, cocking lever, trigger and sights separated for
  animation; a claw optic mount added (shown only with a battle royale optic); rescaled and
  placed on the project's first-person arm rigs (credited above); simplified for the
  third-person model; textures re-encoded.

## Desert Eagle pistol (deagle-terrorist.glb, deagle-police.glb, deagle-world.glb)

- **Desert Eagle**, ELIZION: https://sketchfab.com/3d-models/desert-eagle-cabde59f5cf24effaf80536e35d04e95
  (author: https://sketchfab.com/ELIZION)
  CC BY 4.0: http://creativecommons.org/licenses/by/4.0/
  This work is based on "Desert Eagle" by ELIZION, licensed under CC BY 4.0.
  Changes (art/blender/deagle): slide, hammer, trigger and magazine separated for animation;
  the loose display cartridge removed; rescaled and placed on the project's first-person arm
  rigs (credited above); simplified for the third-person model; textures re-encoded.
