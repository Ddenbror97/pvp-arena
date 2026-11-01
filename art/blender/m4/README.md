# Police M4A1 viewmodel (Blender)

Source and build scripts for `public/fps/models/m4a1-authored.glb`: the Police (seat A)
suppressed M4A1 with carry handle on the shared first-person arm rig. The Terrorist AK and its
pipeline (`../README.md`) are separate.

| File | Purpose |
| --- | --- |
| `recolor_m4_textures.py` | Source textures → black polymer furniture, darker satin metal. |
| `build_m4_viewmodel.py` | Blender (headless, `bpy` 4.2 on Python 3.11): optic and flip-up sight removed; magazine (tan components under the magwell) and charging-handle latch separated; carry handle mounted on the rail (bevelled); suppressor decimated and fitted over the flash hider; violet accents (suppressor cap, latch pull); marker empties; viewmodel units (2.0 / m); `build/m4/m4-rifle.glb` + `m4_viewmodel.blend`. |
| `m4_viewmodel.blend` | Editable source (rifle parts, carry handle, suppressor, markers; textures referenced from the build folder). |
| `../merge_m4_viewmodel.mjs` | Combines the rifle with the arm rig, gloves, forearm, olive sleeve and watch from the AK source GLB; aligns the pistol grip with the right hand (`M4_GRIP_ALIGN`); meshopt + WebP. |

## Rebuild

Download the three Sketchfab sources (glTF) into a scratch folder (not committed):
M4A1 Assault Rifle Game Ready (polupan.andrew, CC BY 4.0), M4/AR-15 Carry Handle Sight
(SSMProductions, CC BY 4.0), HuxWrx HX-QD 556 Suppressor 4K (xylvnking, Sketchfab Standard).
Credits: `public/fps/models/ATTRIBUTION.md`.

```bash
cd art/blender
git show <rev before the jacket>:public/fps/models/ak47-authored.glb > build/ak-shipped.glb
npx gltf-transform copy build/ak-shipped.glb build/ak-src.glb      # decompress (Blender/merge input)
python3 m4/recolor_m4_textures.py SRC/rifle/textures/Grid_baseColor.png \
  SRC/rifle/textures/Grid_metallicRoughness.png build/m4/base.png build/m4/mr.png
python3.11 m4/build_m4_viewmodel.py -- SRC/rifle/scene.gltf SRC/handle/scene.gltf \
  SRC/supp/scene.gltf build/m4/base.png build/m4/mr.png build/m4/m4-rifle.glb build/m4/m4_viewmodel.blend
node merge_m4_viewmodel.mjs build/ak-src.glb build/m4/m4-rifle.glb ../../public/fps/models/m4a1-authored.glb
```

## Contract with the runtime

`authored-viewmodel.ts` (`M4_VIEWMODEL`) reads these nodes: `FPArms`/`FPRig` (shared rig),
`GripL`, `GripR`, `Magazine` (pivot at the top of the magazine; it drops straight, no lug
rock), `MagazineGrip`, `ChargingHandle`, `MuzzleDeviceTip` (suppressor front), `EjectionPort`
(shell casings), `BoltCatch` (empty-reload palm strike), `MagRelease`, `ArmSleeve`, `ArmWatch`.

Placement was checked with a side-view overlay against the AK: the pistol grips coincide
(the right hand is fitted once to that grip), the bore is on the AK's bore line, and the
support hand's handguard grip is widened slightly for the quad rail (`police-arms.ts`).

## Limitations

- The rifle is the sourced 28k-triangle game mesh, recoloured and re-finished, not a new
  high-poly sculpt. The suppressor's source normal and roughness maps did not survive the
  upload, so it uses its base colour with scalar metal/roughness on a decimated mesh.
- The bolt carrier is not a separate part: on an empty reload the bolt catch is struck and
  the rifle jolts, but no carrier is seen moving in the ejection port.
- Fingers do not animate between grips (same as the AK): the support hand swaps baked grips.
