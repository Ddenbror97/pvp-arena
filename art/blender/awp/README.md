# AWP viewmodel (Blender)

Source and build scripts for the AWP bolt-action sniper rifle:
`public/fps/models/awp-terrorist.glb` and `awp-police.glb` (first person, on each team's arm rig)
and `awp-world.glb` (third person). The look follows the classic CS AWP: olive-drab polymer
stock, black steel action, barrel, bolt and rings, green scope tube with black bells.

| File | Purpose |
| --- | --- |
| `build_awp_viewmodel.py` | Blender (headless, `bpy` 4.2+/5.0): source cleanup, part classification, new fore-end / pistol grip / barrel section, animated parts, refinish, marker empties, viewmodel units → `build/awp-rifle.glb` + `awp_viewmodel.blend`. |
| `awp_viewmodel.blend` | Editable source (collections `AWP_Rifle`, `AWP_Scope`, `AWP_Animated`, `AWP_Markers`; textures packed). |
| `../merge_awp_viewmodel.mjs` | Puts the rifle on the shipped arm rigs (Terrorist from the AK GLB, Police from the M4A1 GLB), aligns the grip (`AWP_GRIP_ALIGN`), checks the rig is unchanged and the node contract, meshopt + WebP. |
| `../build_world_rifles.mjs awp-world.glb` | Third-person AWP from `awp-police.glb` (arms removed, simplified, 512 px textures, markers kept). |
| `review/capture.mjs`, `review/entry.ts` | three.js review renders (headless Chromium) → `build/review/`. |

## Source

"Sniper" by stevennvh (Sketchfab, CC BY 4.0; credit in `public/fps/models/ATTRIBUTION.md`):
a ~16k-triangle generic bolt-action rifle, 14 lambert parts with photo textures. Download the
glTF into `incoming/sniper/` (gitignored). In Blender it imports Z up, muzzle +Y, bolt handle on
+X, about 45 units per metre (53.3 units ≈ 1.185 m; the 30 mm scope tube is 1.34 units).

What the build changes:

- **Removed**: bipod, open flip-up lens caps, the piggy-back mini red-dot on the scope, the
  side-saddle cartridges and holder, the slab fore-end that boxed the barrel in, the hidden
  barrel stub.
- **Added**: a rounded fore-end (wider than the action, top just under the barrel so the barrel
  reads free-floated), the barrel section the slab hid, and a raked pistol grip lofted from the
  AK grip sections the shared right hand is posed on (the source hunting stock's wrist sits far
  above the rig's fingers). The magazine is made chunkier (×1.7 wide, ×1.45 long) and its top
  extended into the action so it is seated, not glued to the stock's underside.
- **Finish**: `AWPPolymer` (source scratch photo re-tinted olive, high-passed so it tiles),
  `AWPSteel`, `AWPScopeGreen`, `AWPScopeBlack`, `AWPLens` (dark coated glass), `AWPRubber`
  (buttpad). Base colour maps only (≤1K; steel 1024², the rest 512×256); `rifle-materials.ts`
  does not know these names, so the runtime leaves them as authored.
- **Budget**: 10,620 triangles (stock 1.3k, action/barrel 3.7k, scope 4.9k, bolt + handle 0.5k,
  magazine 140, trigger 34). Third person: 3,058 triangles, 10 primitives, ~100 KB.

## Rebuild

```bash
cd art/blender && npm install
mkdir -p awp/build
# 1. Decompressed shipped rigs (merge inputs; Blender cannot read meshopt)
npx gltf-transform copy ../../public/fps/models/ak47-authored.glb awp/build/ak-src.glb
npx gltf-transform copy ../../public/fps/models/m4a1-authored.glb awp/build/m4-src.glb
# 2. Blender build (~3 s)
cd awp/build && python ../build_awp_viewmodel.py -- ../incoming/sniper/scene.gltf awp-rifle.glb ../awp_viewmodel.blend && cd ../..
# 3. Merge onto both rigs (checks the rig and node contract, prints positions/triangles)
node merge_awp_viewmodel.mjs awp/build/awp-rifle.glb awp/build/ak-src.glb awp/build/m4-src.glb ../../public/fps/models
# 4. Third person (only the AWP output; the AK/M4 world rifles are left as shipped)
node build_world_rifles.mjs awp-world.glb
# 5. Review renders → awp/build/review/
cd ../.. && node art/blender/awp/review/capture.mjs
```

## Node contract (merged GLB)

Axes are the rig's (the M4/AK convention): +X right, +Y up, **−Z toward the muzzle** (+Z toward
the shooter); the bore line is Y = 0. Unlike the M4 (scale on its `M4A1` node), the viewmodel
scale is baked into the AWP's geometry: `Gun_awp` and `AWP` have unit scale and no rotation,
so every offset below is in rig units in the moving node's own parent space. The runtime's
viewmodel root scales the rig by 0.52 (`SHORT_FOREARMS.scale`).

Hierarchy: `FP_awp` → `FPRig` (arms, unchanged), `FPAccessories`, `GripL`, `GripR`,
`Gun_awp` (translation `AWP_GRIP_ALIGN = [0, 0, −0.44]`) → `AWP` → parts and markers.

| Node | Rig-space position (rest) | Meaning / motion |
| --- | --- | --- |
| `GripR` | (−0.0007, −0.0950, −0.1720), −16° about X | Right-hand frame (the rig's, unchanged). The AWP's own GripR lands on it within 0.012 mm (checked by the merge). |
| `GripL` | (0, 0, −0.7900) | Support-hand station on the fore-end, on the bore line (`poseRifleHands` puts the hand at handguard z −0.79). |
| `Bolt` | (0, 0.0007, −0.5320) | Bolt body; origin on the bolt axis at the bolt face. Slides **+Z by 0.198** (≈10 cm real: the face clears the ejection port's rear edge). |
| `BoltHandle` | (0, 0.0007, −0.2836) | Child of `Bolt`; origin on the bolt axis. Lift = **+65° about its local +Z** (`rotation.z = +1.134`): knob from 46° below to 19° above horizontal on the right, clear of the scope. |
| `BoltKnob` | (0.0612, −0.0588, −0.2798) | Knob ball centre (child of `BoltHandle`). Lifted: (0.0798, 0.0310, −0.2798); lifted and back: z −0.0818. |
| `Magazine` | (0, −0.0373, −0.4399) | Top centre; drops straight down (−Y). Seated depth 0.052 (clears the stock after that), height 0.128; ~0.16 takes it out of view. No lug rock. |
| `MagazineGrip` | (0, −0.1272, −0.4876) | Support-hand palm on the magazine (child of `Magazine`): 1 cm behind its front edge, halfway down the exposed part. |
| `Trigger` | (0, −0.0892, −0.3201) | Trigger blade, pivot at its top. The rig's index fingertip is at (0.002, −0.095, −0.337). |
| `MuzzleDeviceTip` | (0, −0.0011, −2.1413) | Muzzle brake front. |
| `EjectionPort` | (0.0276, 0.0169, −0.4369) | Right-side port centre (casing spawn). |
| `MagRelease` | (0, −0.0929, −0.3653) | Release lever between the trigger guard and the magazine. |
| `ScopeEye` | (0, 0.0726, −0.1320) | On the scope's optical axis 3 cm (real) behind the ocular lens; identity rotation, so its −Z looks forward through the scope (ADS camera). |
| `ScopeObjective` | (0, 0.0726, −0.7138) | Objective lens centre. Scope axis is 0.0726 above the bore. |

With the game's `VIEWMODEL_REST` (weapon group at (0.14, −0.12, −0.2)), `ScopeEye` sits at about
(0.14, −0.082, −0.269) in viewmodel-camera space (before the small rest rotations).

**Support hand.** The fore-end at the support station is lower and slightly wider than the AK
handguard the finger wrap was authored on: axis at rig Y −0.055 (AK −0.011), half-width 0.041
(AK 0.038), half-height 0.036. The review renders use
`{ ...scaledGuardGrip(0.82, new Vector3(0.004, −0.044, 0)), handTwist: SUPPORT_HAND_TWIST }`.
The magazine grip / reload clips are the runtime's to tune (no `ChargingHandle` or `BoltCatch`:
the bolt replaces both).

## Review renders (`build/review/`)

- `a-side-overlay-grip.png`, `a-side-overlay-full.png` — the AWP on the Police rig with the AK as a
  red ghost: pistol grips coincide, bore on the blue bore line; dots mark GripR/GripL (green),
  trigger (magenta) vs index fingertip (red), knob, scope eye, port, magazine grip, release.
- `b-fp-police-ak.png`, `b-fp-terrorist-ak.png` — 60° viewmodel camera, `VIEWMODEL_REST`, hands
  fitted as the runtime does; `b-fp-police-alt.png` — a closer framing nearer the reference
  (x 0.13, y −0.095, z −0.1, pitch 0.02, yaw 0.06, roll −0.06; a suggestion);
  `b-ads-scope-eye.png` — camera at `ScopeEye`.
- `c-bolt-rest/lifted/back-*.png`, `c-mag-dropped-*.png` — the parts moved about their origins.

## Limitations

- The stock is the source's hunting stock with a pistol grip added, not a thumbhole AWP stock:
  the source wrist is too low for a thumbhole, and the right hand needs the AK grip's position.
- Textures are the source's re-tinted photo maps (base colour only, no normal/roughness maps);
  the source has no unwrap worth baking wear into, so there is no wear UV set like the AK's.
- The bolt is a single moving body (handle rotates about it); there is no cartridge or extractor
  animation in the port.
