# First-person arms: gloves, sleeves, wristwatch (Blender)

Built from scratch for the AK-47 viewmodel; the AK, its reload and the arm skeleton are
untouched. Everything here is scripted so it rebuilds deterministically.

| File | Purpose |
| --- | --- |
| `glove_sdf.py` | The glove volume: anatomical signed-distance sculpt around the rig's hand bones (tapered phalanges, arched palm, thenar/hypothenar, thumb web), plus the glove build (neoprene cuff, moulded knuckle guard, closure strap and pull tab). Also the skin weights. |
| `build_gloves.py` | Blender: marching cubes → decimated game mesh (7.5k tris/hand) → weights → shared UV atlas → (with `--textures`) bakes and PBR maps → `gloves.json/bin` in the skin's bind space. |
| `glove_textures.py` | High-poly normal/AO bakes, then per-texel panels and relief computed on the 3D glove: suede palm with a quilted padded patch, stretch-knit back, finger gussets, fingertip caps, TPR knuckle guard (knurl + flex channels), raised finger strips, perforated thumb crotch, bound cuff, elastic strap, moulded tab, lock-stitch seams, joint wrinkles, dust. |
| `forearm.py` | Python port of the runtime forearm surface (`forearmRadius` in `fitted-rifle-hands.ts`). |
| `build_accessories.py` | Olive ripstop sleeve (rolled band, compression folds, drape, inner hem lip) and a 40 mm field watch (case, 60-click knurled bezel with printed insert, domed crystal, Arabic 1–12 / 13–24 dial, hands at 10:09, crown, lugs, spring bars, NATO strap, buckle, keepers). |
| `skin_texture.py` | Forearm skin with arm hair (`public/fps/forearm-skin-v2.webp`) from `forearm-skin-source.webp`. |
| `merge_arms.mjs` | Swaps the FPArms mesh and its textures into the shipped GLB and adds the accessories under `FPAccessories`; rig and rifle untouched. |
| `dump_rig.mjs` | Exports the rig's joint matrices and bind space for the scripts. |
| `gloves.blend`, `accessories.blend` | Editable sources (game meshes with UVs, weights, materials). |

## Rebuild

```bash
cd art/blender
node arms/dump_rig.mjs ../../public/fps/models/ak47-authored.glb build/rig.json
python arms/build_gloves.py -- build/rig.json build/gloves --lp-voxel 0.0011 --textures --size 2048   # ~15 min CPU
python arms/build_accessories.py -- build/acc --size 1024 [--preview]
git show HEAD:public/fps/models/ak47-authored.glb > build/ak-shipped.glb   # the GLB before this merge
node arms/merge_arms.mjs build/ak-shipped.glb build/gloves ../../public/fps/models/ak47-authored.glb build/acc/accessories.glb
node validate_ak_viewmodel.mjs ../../public/fps/models/ak47-authored.glb
```
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
  charging-handle grips), keeping each point's height above the skin. The watch is worn
  tactical-style, face on the inside of the wrist: readable with the support hand palm-up under
  the handguard. The left arm's frame is mirrored, so the watch is authored mirrored.

## Limitations

- The gloves are a procedural sculpt, not a ZBrush sculpt with hand-painted textures; fabric
  wrinkles are normal-map detail baked in the sculpt pose, not pose-driven.
- Fingers are posed by the existing IK and baked once per grip; the support hand swaps baked
  grips at contact (unchanged from before).
