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

## Project-owned visuals

PVP spinArena branding and reference artwork were supplied by the project/user.
The forearm skin surface texture was generated for this project with imagegen.
The new anatomical forearm geometry, fitting, material work and runtime integration
are project work. Third-party attribution does not imply creator endorsement.
