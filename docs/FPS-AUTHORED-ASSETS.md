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

`authored-viewmodel.ts` retains the authored AK and normal-mapped glove detail.
`fitted-rifle-hands.ts` poses the original finger bones for the horizontal
handguard and pistol grip; the asset's optional `grip_vgrip` pose is not used.
The support palm sits beside the handguard, with a pole-constrained finger bend
underneath it. The right index retains the source trigger placement.

The wrist's forearm-weighted vertices follow the hand's pose correction before
baking, avoiding the previous stretch between independent hand/forearm controls.
Glove triangles are clipped at the natural wrist and the forearm starts at the
same boundary vertices, preserving UVs and normals. There is no added wrist band,
cover cylinder or fragment-discard mask. Forearms use the existing skin albedo
and smooth normals across UV splits. Pose fitting and geometry baking happen
once at load; recoil and movement carry the hands and rifle together.

Current captures: [gameplay](screenshots/fps-grip-pov.png),
[wrist close-up](screenshots/fps-wrist-fixed.png), and
[reverse view showing the fingers](screenshots/fps-grip-reverse.png).
These show the actual rendered meshes, not a generated reference.

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

## Wrist and grip correction checks

Five focused Chrome checks passed: authored asset delivery, both spawn views,
movement frame sample, actual mesh wrist boundaries and grip stability, and
pointer lock/strafe/full-auto release/jump/reload. The boundary test compares the
visible glove and skin mesh edges independently and checks that fingers cross
from the support palm to the other side of the handguard. No cover-band meshes
are allowed. The local 1280 × 800 movement sample measured 20.8 ms median and
21.1 ms p95. This is a local fixture measurement, not a production FPS guarantee.
TypeScript, targeted ESLint and production build pass. No deployment is part of
this correction.

## Viewmodel rig and key-posed reload (2026-10-31)

[Idle](screenshots/fps-viewmodel-idle.png) · [reload: strip, insert, rack](screenshots/fps-viewmodel-reload.png)

- Forearms are ~0.3 m (previously ~0.67 m), thicker, and enter from the lower-left
  screen edge. The support hand sits mid-handguard and leans 0.5 rad so wrist and
  forearm share one diagonal; gloves are black for both roles.
- `authored-viewmodel.ts` now builds two rigs: `Weapon_Master` (pivot at the right-hand
  grip, carrying rifle, magazine, bolt and trigger arm) and `support-arm` (pivot at the
  left wrist). Baked hand geometry is split per side and never changes per frame.
- `reload-animation.ts` holds the timeline as pure key data over the server's
  `reloadMs`: Break 0–0.30 (cant, strip and drop the mag), Insert 0.30–0.60 (rock-in,
  slam jolt, settle), Chamber 0.60–1.00 (rack, sharp release, overshoot settle). The
  support hand resolves its anchor (handguard, magazine grip or charging handle) on the
  live rig every frame, so the magazine never drifts from the hand.
- The renderer passes reload progress to the authored rifle and no longer tilts the
  whole weapon group for it; pistol/fallback keep the previous tilt cue. World 78° and
  viewmodel 60° cameras are unchanged.

## Viewmodel polish: anatomy, realistic AKM, magazine grip (2026-10-31)

- Forearms use superellipse cross-sections from adult-male girths (≈17.5 cm wrist,
  ≈27 cm belly), a flat tendinous wrist, radial muscle mass and a supination twist;
  `forearm-detail.ts` adds veins, tendons and a muscle groove as bump + vein tint.
  `tests/fps-forearm-anatomy.test.ts` keeps the proportions in range.
- The glove now ends ~3 cm past the wrist joint as a cuff (`GLOVE_CUFF`); gloves are matte.
- `rifle-materials.ts` replaces the PVP paint: varnished laminated wood, blued receiver,
  parkerized parts and a stamped-steel magazine, projected in each part's own space.
- Reload: the support hand is fitted and baked a second time gripping the magazine
  (`magazineGrip` frame in `fitted-rifle-hands.ts`) and parented to the magazine, so hand
  and magazine cannot separate; the handguard hand lands exactly on that pose at contact.
- A cool rim light on the viewmodel layer separates arm and steel edges from the map.

## AK-47 viewmodel upgrade: Blender pipeline, tactical/empty reloads, POV motion (2026-10-31)

[Before/after](screenshots/fps-viewmodel-before-after.png) ·
[Empty reload](screenshots/fps-viewmodel-reload-empty.png) ·
[Tactical reload](screenshots/fps-viewmodel-reload-tactical.png) ·
[Grip close-ups](screenshots/fps-viewmodel-grips.png)

- **Asset pipeline** (`art/blender/`, see its README): the shipped AK mesh is kept (a
  procedural remodel would be lower quality) and processed in Blender — welded, re-shaded with
  smooth-by-angle + weighted normals, given a wear UV atlas and Cycles-baked (per-part AO, edge
  convexity, cavity → `ak47-wear.webp`). The merge step swaps only the rifle meshes back into
  the GLB; `check_rig_unchanged.mjs` proves the arm rig is bit-identical. The editable source is
  `art/blender/ak47_viewmodel.blend`.
- **Materials**: `rifle-materials.ts` reads the bake — edges chip to bare steel / raw wood, AO
  and cavity grime ground every part. The authored occlusion maps (which read `TEXCOORD_1`) are
  replaced by the bake.
- **Reloads** (`reload-animation.ts`): two clips on the unchanged server window
  (`WEAPONS.rifle.reloadMs`). *Tactical* (rounds left): thumb the paddle, rock the magazine
  forward about its front lug, strip it, hook the new one's lug, rock it back to seat, tug-check,
  return. *Empty* (`ammo === 0` — the AK has no bolt hold-open): the same change, then an
  overhand rack: the support hand comes over the dust cover, closes on the right-side knob
  (a third baked grip, `charging-handle-hand`, riding the bolt), racks, lets the carrier fly home
  and returns to the handguard. Magazine rotations pivot on the front lug computed from the
  magazine mesh. All poses are rest-relative and reset at p = 0, so cancellation (death, round
  end) cannot leave a detached magazine or a held pose; weapon switching is already blocked by the
  sim while reloading.
- **POV motion** (`viewmodel-motion.ts`): frame-rate-independent critically damped look sway
  (both axes), stride-locked figure-eight bob, sprint tuck (the sim blocks firing while
  sprinting; it blends out in ~0.15 s), two-frequency breathing, alternating per-shot recoil
  roll, all damped during reloads. Replaces the previous time-based bob and X-only turn sway.
- **Tests**: `tests/fps-reload-animation.test.ts` (both clips: rest at both ends, monotonic
  keys, rock-out before strip, lug hooked before seating, magazine always in hand, handle only
  on empty), `tests/fps-viewmodel-motion.test.ts` (rest anchoring, 30 vs 240 Hz equivalence,
  no sway overshoot, sprint timing), `tests/e2e/fps-grip.spec.ts` (baked grips visible only while
  held, geometry stable through both clips). Manual capture: `fps-viewmodel-capture.spec.ts`
  (in-game) and `fps-viewmodel-closeup.spec.ts` (studio close-ups), both gated on `CAPTURE_DIR`.
- **Known limits**: fingers swap between baked grips at contact rather than animating
  continuously; the trigger finger stays on the trigger at idle (the player can fire on any
  frame). See `art/blender/README.md`.

## First-person arms: gloves, sleeves, wristwatch (2026-10-31)

The arms holding the AK were rebuilt in Blender (`art/blender/arms/`); the rifle, reload
timing, grips and rig are unchanged.

- **Gloves**: new skinned mesh (2 × 7.5k tris) sculpted around the existing hand bones, 2048 PBR
  set (base colour, tangent-space normals, AO/roughness): suede palm with quilted padding,
  stretch-knit back, finger gussets and fingertip caps, moulded knuckle guard, raised finger
  strips, perforated thumb crotch, short snug cuff ending just past the wrist, stitched seams.
- **Forearms**: parametric anatomical surface from the wrist joint (inside the cuff) to the
  elbow, 6% fuller than before, with an arm-hair skin texture.
- **Sleeves**: olive ripstop combat-shirt sleeves pushed up the forearm with a rolled band and
  compression folds, wrapped onto every posed arm.
- **Watch**: real 3D field watch on the back of the left wrist, visible at idle and through the
  reloads.

Captures: [before/after, same cameras](screenshots/fps-arms-before-after.png),
[details](screenshots/fps-arms-details.png), [in game](screenshots/fps-viewmodel-idle.png).
Render cost: 154 draw calls / 315k triangles (from 142 / 244k), CPU frame time unchanged
(~8–9 ms in the capture harness). Tests: `tests/e2e/fps-grip.spec.ts` checks closed gloves,
cuff overlap, sleeves on both arms and the watch on the left in every grip.
