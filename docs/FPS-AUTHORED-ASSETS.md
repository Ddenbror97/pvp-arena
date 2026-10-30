# Authored AK, arms and opponent models

This replaces the primitive-based presentation in the previous character pass.
The main AK and gloved hands now use an authored, skinned GLB with texture,
normal and roughness detail. Opponents use an authored tactical clothing/body
mesh and a fitted anatomical human head. The supplied images guide the palette,
branding and pose; these adapted assets do not reproduce the portraits' exact
faces, wardrobe or photographic rendering.

## Real renderer captures

- [First-person AK and arm](screenshots/fps-authored-pov.png)
- [Police opponent](screenshots/fps-authored-officer.png)
- [Masked opponent](screenshots/fps-authored-fighter.png)

These are Chrome captures of the actual renderer and local simulation fixture.
No generated screenshot, portrait billboard or background image hides gameplay.
They do not establish authenticated production multiplayer readiness.

## Presentation

`authored-viewmodel.ts` retains the authored glove/finger skinning and AK geometry,
adds PVP paint/branding, and replaces the source sleeves with continuous anatomical
forearm surfaces. `anatomical-forearm.ts` sweeps elliptical wrist/flexor/elbow
sections with subtle vein relief, using the generated skin albedo. Closed wrist
cuffs cover the glove transition. Normal-mapped glove detail remains intact.

The existing input, recoil, magazine reload and shot events remain in control.
A separate 60-degree viewmodel camera shares the world camera transform while
preserving the 78-degree world FOV. The actual muzzle marker supplies flash
position. Pistol controls and the existing pistol viewmodel remain available.

`authored-character.ts` fits real skinned body geometry to the existing player's
feet/head coordinates. Navy police clothing, cap/badge/aviators and tan/dark
masked clothing distinguish the roles. Bone-space two-link solvers move arms
to weapon grips and legs to stride/ground targets; foot orientation stays stable.
Motion follows authoritative movement, jump, crouch, weapon, reload and shot
state. It remains procedural skeletal posing rather than motion-captured clips.

The previous procedural models remain as a loading/failure fallback so an asset
request cannot make an opponent temporarily invisible. Loaded assets replace the
fallback atomically. No new damage or movement protocol is introduced.

## Hitboxes and resources

`player-volumes.ts` remains the authoritative shared head/body envelope from the
previous commit. The fitted visible head follows its standing/crouched/jumping
center. Hit detection remains server-owned coarse head/body boxes; equipment,
fingers and weapon meshes do not add damage surfaces. Cover occlusion and
weapon statistics are unchanged.

`authored-assets.ts` shares decoded source geometry/textures by URL. Skeletons
and modified materials belong to each instance and are disposed independently.
Reference counting releases source geometry, materials and textures after the
last consumer. No geometry is generated per shot or animation frame.

The fitted head's embedded PNG textures were converted to WebP, reducing its
GLB from 6,098,240 to 1,745,644 bytes. Skin albedo fell from 3,318,386 to 658,938
bytes. `scripts/optimize-fps-textures.mjs INPUT OUTPUT` performs this native
browser compression while retaining geometry/UVs. Unused full-body source and
animation reference downloads are not shipped.

## Asset sources and generated skin

See [the shipped attribution file](../public/fps/models/ATTRIBUTION.md), also
linked from the lobby. Creator/license links and adaptation details accompany
the third-party files. Main runtime files:

- `public/fps/models/ak47-authored.glb`
- `public/fps/models/arms_basecolor.webp`, `arms_normal.webp`
- `public/fps/models/tactical-body.glb`
- `public/fps/models/reference-head-webp.glb`
- `public/fps/forearm-skin-v1.webp`

The head was extracted from the CC0 Innerscene/MakeHuman source: head/neck,
eyes, brows, lashes, teeth and hair were retained, transformed into a local
0.36-metre head frame and exported with 1024-pixel textures. Body and equipment
were removed. The original downloaded source is retained outside the project
in the local Codex asset-source cache.

The **built-in imagegen tool** produced only the skin albedo, then it was
optimized into the workspace path above. Original output remains at
`C:/Users/Wesc9/.codex/generated_images/01a172e6-be51-7082-8812-ad9c5cb878c2/exec-5246c374-4a44-4e0e-a5ce-f2f72ab5da1b.png`.

Final prompt:

> Use case: photorealistic-natural. Asset type: seamless skin albedo texture for a realistic male forearm mesh in a browser FPS. Square 1024x1024 texture, straight-on flat surface scan, warm medium tan human forearm skin with very fine pores, natural tiny hairs, subtle small freckles, restrained faint blue-green veins, fine skin lines and irregular pigmentation. Real photographic skin microdetail. Neutral even diffuse light, absolutely no baked directional highlights or shadows. No hand, fingers, silhouette, arm outline, clothing, tattoo, text, labels, objects or background. Edge-to-edge uniform skin surface; seamless material tile.

## Validation boundary

619 unit tests and 13 Chrome checks passed for this integration. App TypeScript,
targeted lint and production build pass. The final moving-camera 120-frame
sample recorded 20.8 ms median / 21.2 ms p95 at 1280 × 800 on the local machine;
earlier samples in the same pass ranged from 13.9–20.9 ms median and 21–28.1 ms p95.
This is not a 60 FPS guarantee. Download optimization preserves the geometry;
cached source assets avoid duplicate image/mesh decoding for both roles.

Browser checks require actual authored assets to load, verify surface branding
and texture delivery, compare rendered head centers with combat volumes, fire
actual inputs against the opponent, and exercise movement/crouch/jump/reload,
impacts, both role views and disposal. Frame intervals are local workstation
observations, not a guarantee across hardware. This pass is local and is not
deployed; existing production/financial release gates are unchanged.

The fixture waits for the arena canvas's authored-model readiness signal, so
captures and controller checks exercise loaded replacements rather than the
temporary loading fallback. The scarf mask/hood use fitted head geometry, and
the curved magazine uses a surface-clipped decal.
