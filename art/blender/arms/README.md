# First-person arms: gloves, sleeves, wristwatch (Blender)

Built from scratch for the AK-47 viewmodel; the AK, its reload and the arm skeleton are
untouched. Everything here is scripted so it rebuilds deterministically.

| File | Purpose |
| --- | --- |
| `glove_sdf.py` | The glove volume: anatomical signed-distance sculpt around the rig's hand bones (tapered phalanges, arched palm, thenar/hypothenar, thumb web), plus the glove build (short snug cuff, moulded knuckle guard). Also the skin weights. |
| `build_gloves.py` | Blender: marching cubes → decimated game mesh (7.5k tris/hand) → weights → shared UV atlas → (with `--textures`) bakes and PBR maps → `gloves.json/bin` in the skin's bind space. |
| `glove_textures.py` | High-poly normal/AO bakes, then per-texel panels and relief computed on the 3D glove: suede palm with a quilted padded patch, stretch-knit back, finger gussets, fingertip caps, TPR knuckle guard (knurl + flex channels), raised finger strips, perforated thumb crotch, bound cuff, lock-stitch seams, joint wrinkles, dust. Palm v2 (default; `GLOVE_PALM_V1=1` restores the original): for the turned support grip, a padded matte back-of-hand panel with chevron flex channels and a double-stitched border (the surface the camera sees), a leather palm overlay, a padded heel pad and silicone grip dots. `GLOVE_ZONE_DEBUG=1` paints each panel a flat colour to find what the camera sees. |
| `forearm.py` | Python port of the runtime forearm surface (`forearmRadius` in `fitted-rifle-hands.ts`). |
| `build_accessories.py` | Olive ripstop sleeve (rolled band, compression folds, drape, inner hem lip) and a 40 mm field watch (case, 60-click knurled bezel with printed insert, domed crystal, Arabic 1–12 / 13–24 dial, hands at 10:09, crown, lugs, spring bars, NATO strap, buckle, keepers). `--watch-only --watch-lift <m>` rebuilds the watch over a sleeve (`JacketWatch`, Police). |
| `build_jacket_sleeve.py` | Full-length duty sleeves, one per team, matched to the third-person characters. Terrorist (default, `JacketSleeve`): the snow-camo smock of `terrorist-fighter.glb` — three-tone print (coverage and tones measured from the character's texture and its render), cotton windproof weave, camo cuff tab with a dark button. Police (`--variant police`, `PoliceSleeve`): the steel-blue duty shirt of `police-swat.glb` — cotton twill, light topstitching, buttoned shirt cuff, cloth cinched flat under the watch strap and bunched either side. Both: turned hem, double cuff band, compression folds, drape, underarm sag; Cycles AO bake; textures in numpy. |
| `skin_texture.py` | Forearm skin with arm hair (`public/fps/forearm-skin-v2.webp`) from `forearm-skin-source.webp`. |
| `retexture_gloves.py` | Re-authors the glove textures on the shipped glove mesh (`gloves.blend`, same UVs as the GLBs), without rebuilding the mesh: `python arms/retexture_gloves.py -- build/rig.json build/gloves --size 2048 [--reuse-bakes]` (~15 min with bakes, ~1 min reusing them). |
| `../replace_textures.mjs` | Swaps named texture images in a GLB and nothing else, e.g. `glove_basecolor= glove_normal= glove_orm=` into both `ak47-authored.glb` and `m4a1-authored.glb` (one glove for both teams and the Karambit). |
| `../add_accessories.mjs` | Adds Blender-built accessories to a viewmodel GLB under `FPAccessories` (replacing same-named nodes), optionally re-encoding their new textures (`--max-size 1024 --webp-quality 90`). Used for both duty sleeves and the Police watch. |
| `merge_arms.mjs` | Swaps the FPArms mesh and its textures into the shipped GLB and adds the accessories under `FPAccessories`; rig and rifle untouched. |
| `dump_rig.mjs` | Exports the rig's joint matrices and bind space for the scripts. |
| `gloves.blend`, `accessories.blend` | Editable sources (game meshes with UVs, weights, materials). |
| `jacket_sleeve.blend` | Editable jacket sleeve (mesh, UVs, material); its baked textures are rebuilt by `build_jacket_sleeve.py` (not packed, to keep the repo small). |

## Rebuild

```bash
cd art/blender
node arms/dump_rig.mjs ../../public/fps/models/ak47-authored.glb build/rig.json
python arms/build_gloves.py -- build/rig.json build/gloves --lp-voxel 0.0011 --textures --size 2048   # ~15 min CPU
python arms/build_accessories.py -- build/acc --size 1024 [--preview]
python3.11 arms/build_jacket_sleeve.py -- build/jacket --size 2048 [--preview]        # ~4 min CPU
git show HEAD:public/fps/models/ak47-authored.glb > build/ak-shipped.glb   # the GLB before this merge
node arms/merge_arms.mjs build/ak-shipped.glb build/gloves ../../public/fps/models/ak47-authored.glb build/acc/accessories.glb
node validate_ak_viewmodel.mjs ../../public/fps/models/ak47-authored.glb
npx gltf-transform copy ../../public/fps/models/ak47-authored.glb build/ak-src.glb
node add_jacket_to_ak.mjs build/ak-src.glb build/jacket/jacket-sleeve.glb ../../public/fps/models/ak47-authored.glb
node check_rig_unchanged.mjs build/ak-src.glb ../../public/fps/models/ak47-authored.glb
```

Duty sleeves and the Police watch (current; Blender 5.2 via `bpy`, ~7 min per sleeve):

```bash
cd art/blender
python arms/build_jacket_sleeve.py -- build/terror --size 2048 [--preview]                  # Terrorist
python arms/build_accessories.py -- build/police --watch-only --watch-lift 0.0068          # watch over the sleeve
python arms/build_jacket_sleeve.py -- build/police --variant police --size 2048 \
  [--watch build/police/jacket-watch.glb --preview]                                         # Police
node add_accessories.mjs <ak-before.glb> ../../public/fps/models/ak47-authored.glb \
  build/terror/jacket-sleeve.glb:JacketSleeve --max-size 1024 --webp-quality 90
node add_accessories.mjs <m4-before.glb> ../../public/fps/models/m4a1-authored.glb \
  build/police/police-sleeve.glb:PoliceSleeve build/police/jacket-watch.glb:JacketWatch \
  --max-size 1024 --webp-quality 90
node check_rig_unchanged.mjs <before.glb> <after.glb>   # must print zero shifts
```

Preview in the game's viewmodel lighting: `node scripts/fps/viewmodel-capture/capture.mjs <ak|m4> <out> <shots.json> --weapon=rifle` (rifle) or without `--weapon` (Karambit).
`--reuse-bakes` re-runs only the texture authoring on cached bakes (seconds, not minutes).

## How it fits the rig

- **Sculpt pose vs bind pose.** The rig's bind pose has the fingers clawed, crossing each other
  and lying on the back of the hand, so a glove modelled there has fingers fused together and
  tears into sheets when the IK opens them. The glove is sculpted, weighted and textured on a
  relaxed, slightly spread hand with the same bone lengths, then skinned into the bind pose
  (`HandFrame.to_bind`). The bind-pose mesh may overlap itself; posed, every finger is its own
  surface (worst triangle stretch over the reloads ≈3x, at the index knuckle).
- **Cuff over skin.** The runtime forearm now starts at the wrist joint inside the glove cuff and
  follows a straight segment through it, so the cuff overlaps bare skin like a real glove.
- **Accessories** are authored in canonical arm space (x thumb, y back of the arm, z toward the
  hand) and `wrapOntoForearm` bends them onto every posed forearm (handguard, magazine and
  charging-handle grips), keeping each point's height above the skin. The watch sits on the
  back of the left wrist, crown toward the hand.
- **Palm side** is -(fingers × thumb side) on both hands, checked against the posed grips:
  the bind pose's left fingers are bent backwards, so it cannot be used to tell.

## Limitations

- The gloves are a procedural sculpt, not a ZBrush sculpt with hand-painted textures; fabric
  wrinkles are normal-map detail baked in the sculpt pose, not pose-driven.
- Fingers are posed by the existing IK and baked once per grip; the support hand swaps baked
  grips at contact (unchanged from before).
