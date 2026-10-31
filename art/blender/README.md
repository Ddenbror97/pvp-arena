# AK-47 viewmodel asset pipeline (Blender)

Source and build scripts for `public/fps/models/ak47-authored.glb` and
`public/fps/models/ak47-wear.webp`. The runtime (`src/lib/fps/authored-viewmodel.ts`,
`rifle-materials.ts`) depends on the node names and the wear UV set produced here.

| File | Purpose |
| --- | --- |
| `ak47_viewmodel.blend` | Editable source: processed rifle (cleaned normals, wear UVs) referencing `build/wear.png`. |
| `build_ak_viewmodel.py` | Blender (headless) build: cleanup → wear UV atlas → Cycles bakes → rifle GLB + `.blend`. |
| `merge_ak_viewmodel.mjs` | Swaps the processed rifle meshes into the shipped GLB; arms and rig untouched. |
| `validate_ak_viewmodel.mjs` | Node contract, wear UVs, materials and triangle budget (fails CI-style). |
| `check_rig_unchanged.mjs` | Proves the merge left the arm rig bit-identical (joint + skinned positions). |
| `inspect_ak.py`, `render_inspect.py` | Inspection: part list / triangles, Cycles close-up renders. |

## Rebuild

```bash
cd art/blender && npm install
# 1. Blender cannot read meshopt; decompress the shipped GLB (keep a copy as the merge source)
mkdir -p build && npx gltf-transform copy ../../public/fps/models/ak47-authored.glb build/ak-source.glb
# 2. Blender build (Blender 4.2+ or the `bpy` module on Python 3.11: pip install bpy)
python build_ak_viewmodel.py -- build/ak-source.glb build/rifle.glb ak47_viewmodel.blend build/wear.png
#    (~10 min on CPU at --size 2048 --samples 32; use --size 512 --samples 8 to iterate)
# 3. Merge, validate, prove the rig is unchanged
node merge_ak_viewmodel.mjs build/ak-source.glb build/rifle.glb build/wear.png \
  ../../public/fps/models/ak47-authored.glb ../../public/fps/models/ak47-wear.webp
node validate_ak_viewmodel.mjs ../../public/fps/models/ak47-authored.glb
node check_rig_unchanged.mjs build/ak-source.glb ../../public/fps/models/ak47-authored.glb
```

## What the build does

1. **Cleanup** — drops the unused spare magazine; welds duplicate vertices; smooth-by-angle (38°)
   plus face-weighted normals, so stamped steel, magazine ribs and furniture shade as continuous
   surfaces instead of faceted triangles.
2. **Wear UVs** — every rifle part gets a second, non-overlapping UV set (`TEXCOORD_1`) packed
   into one atlas at a shared texel density. The authored UV0 is kept.
3. **Bakes** (Cycles) into the atlas: per-part ambient occlusion (R), bevel-normal edge
   convexity (G) and a cavity mask (B). AO is "only local": the AK's receiver shells overlap
   by fractions of a millimetre, which a scene-wide bake reads as total occlusion.
4. **Runtime** — `rifle-materials.ts` reads the atlas: edges chip through to bare steel or raw
   wood (broken up by the finish noise), cavities collect grime, AO darkens contacts. The authored
   occlusion maps (which also read `TEXCOORD_1`) are replaced by this bake.

The merge keeps the arm mesh, skin, bones and every marker empty (`GripL/R`, `MagazineGrip`,
`MuzzleDeviceTip`, …) exactly as shipped: the runtime fits the hands to the rifle procedurally
(`fitted-rifle-hands.ts`) against those frames. The arm textures that used to sit beside the GLB
are now embedded, so it is one self-contained file.

## Animation

The reloads are authored as key poses in `src/lib/fps/reload-animation.ts` (tactical and empty
clips), not as Blender actions. The hands are fitted to the rifle at load time (finger IK onto
the handguard, magazine and charging handle, then a continuous anatomical forearm is extruded
from the glove), so the per-frame motion is rigid transforms of those baked grips — which the
typed key-pose tracks express directly, unit-test without WebGL, and keep in lockstep with the
server's reload timer. A Blender action would need the same three grips re-authored by hand per
frame and could not reuse the runtime fitting.

## Limitations (what needs an artist)

- **Geometry** is the CC0/CC-BY source mesh (≈30k triangles), cleaned and re-shaded — not a new
  sculpt. A AAA-grade AKM (high-poly sculpt baked to normal maps, stampings, weld seams, rivet
  peening) is modelling work that procedural scripts cannot produce at that quality; the
  pipeline here (UV atlas, bake, merge, validate) is ready to take such a mesh in place of the
  current one.
- **Fingers do not animate between grips.** Each grip (handguard, magazine, charging handle) is
  baked once; the support hand swaps baked grips at contact. A skinned runtime arm with per-frame
  finger IK would remove the swap, at a cost of re-skinning every frame.
- **Trigger finger** stays on the trigger at idle: the player can fire on any frame, and a
  finger-off/finger-on swap would pop visibly at the moment of every first shot.
