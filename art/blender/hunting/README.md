# Hunting Rifle viewmodel (Blender)

Source and build script for the battle royale's Hunting Rifle, the common bolt-action sniper:
`public/fps/models/hunting-police.glb` (first person, on the Police arm rig the battle royale
uses) and `hunting-world.glb` (third person, loot and other players).

An original model built from scratch, no third-party mesh or texture: a classic walnut-stocked
sporter with a Monte Carlo cheek line, cut checkering on the grip and fore-end, black recoil pad
with a white spacer, sling studs, a round blued receiver with an ejection port and a polished
bolt, a 22" sporter barrel with a recessed crown, a flush-fit polymer 5-round magazine, and a
3–9×36 hunting scope (power ring, capped turrets, coated lenses) in a one-piece base with two
rings. The owner's "low poly stylized sniper gun" was used only as a proportion reference.

| File | Purpose |
| --- | --- |
| `build_hunting_rifle.py` | Blender (headless, `bpy` 4.2+/5.x): every part, the procedural walnut and blued textures, materials, animated parts and marker empties → `build/hunting-rifle.glb` + `hunting_rifle.blend`. |
| `hunting_rifle.blend` | Editable result of the build (textures packed). |
| `../merge_awp_viewmodel.mjs --name=hunting --root=HuntingRifle` | Puts the rifle on the shipped arm rigs exactly as the AWP (grip alignment, rig unchanged, node contract, meshopt + WebP). Only `hunting-police.glb` ships. |
| `../build_world_rifles.mjs hunting-world.glb` | Third person from `hunting-police.glb` (arms removed, simplified, 512 px textures, markers and bolt kept). |
| `../dedupe_viewmodel_textures.mjs` | The arm textures are 1×1 placeholders filled from `viewmodel-shared.glb` at runtime; `viewmodel-shared.json` has the `hunting-police` entry (the AWP Police one: same materials). |

## Node contract

The rifle is built on the AWP's contract (`art/blender/awp/README.md`, node table): `Bolt`,
`BoltHandle`, `BoltKnob`, `Magazine`, `MagazineGrip`, `Trigger`, `GripR`, `GripL`,
`MuzzleDeviceTip`, `EjectionPort`, `MagRelease`, `ScopeEye`, `ScopeObjective` sit at the AWP's
rig positions (the merge prints them; they match to 0.1 mm). So the AWP viewmodel setup
(`HUNTING_POLICE_VIEWMODEL` = `AWP_BASE` with this asset), its rest pose, the bolt cycle after a
shot and both reload clips (`awp-animation.ts`) drive this rifle unchanged, and the battle
royale attachments fit the same way: an optic hides `ScopeGeometry` and sits on the scope base,
a muzzle device goes on `MuzzleDeviceTip`.

Hierarchy after the merge: `FP_hunting` → `FPRig` (arms), `FPAccessories`, `GripL`, `GripR`,
`Gun_hunting` (`AWP_GRIP_ALIGN`) → `HuntingRifle` → parts and markers.

## Budget and finish

- 16,750 triangles: stock 7.8k (lofted, voxel-united with the pistol grip, smoothed and
  decimated), receiver/barrel/base/rings/guard 3.2k, scope 3.6k, bolt 0.9k, handle 0.9k,
  magazine 236, trigger 68. Length 1.03 m. Third person: 4.7k triangles, ~80 KB.
- Materials: `HuntingWalnut` (2048×1024 grain with checkering panels on planar UVs),
  `HuntingBlued` (1024×256 brushed blue-black), `HuntingBoltSteel`, `HuntingMatteBlack`,
  `HuntingRubber`, `HuntingSpacer`, `HuntingPolymer`, `HuntingLens`, `HuntingBore`.
- `hunting-police.glb` ≈ 1.2 MB (meshopt + WebP).

## Rebuild

```bash
cd art/blender && npm install
mkdir -p hunting/build
# 1. Decompressed shipped rigs (merge inputs)
npx gltf-transform copy ../../public/fps/models/ak47-authored.glb hunting/build/ak-src.glb
npx gltf-transform copy ../../public/fps/models/m4a1-authored.glb hunting/build/m4-src.glb
# 2. Blender build (~1 min: the stock's voxel remesh)
python hunting/build_hunting_rifle.py -- hunting/build/hunting-rifle.glb hunting/hunting_rifle.blend
# 3. Merge (writes hunting-terrorist.glb too; only the Police file is shipped)
node merge_awp_viewmodel.mjs --name=hunting --root=HuntingRifle hunting/build/hunting-rifle.glb \
  hunting/build/ak-src.glb hunting/build/m4-src.glb hunting/build
cp hunting/build/hunting-police.glb ../../public/fps/models/
# 4. Third person and the inventory icon
node build_world_rifles.mjs hunting-world.glb
cd ../.. && node scripts/br/icons/render.mjs
# 5. Review renders (first person through the shot, bolt cycle and reloads; outside angles)
node scripts/fps/gun-review/capture.mjs --gun=hunting --views=eye,side,top
node scripts/br/attach-check/capture.mjs   # optics and muzzle devices
```

Sounds: `node scripts/fps/build-br-hunting-audio.mjs`, then
`node scripts/fps/build-br-silenced-audio.mjs` (see `public/fps/audio/ATTRIBUTION.md`).
