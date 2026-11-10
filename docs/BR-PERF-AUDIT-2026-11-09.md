# Battle Royale render audit: FPS, stability and H1Z1-level quality (2026-11-09)

Branch `ground-blur-2026-11-09` (PR #115), after main `84ca73bd`. Goal set by the owner: more
FPS and steadier frames while keeping the environment's texture quality, toward the look of
H1Z1.

## What was measured, and how

- **Per-view draw cost** with the real island renderers (`scripts/br/explorer`, headless,
  SwiftShader): draw calls, triangles, the largest contributors, programs and textures, at
  six fixed views (plane altitude, parachute at 250 m and 80 m, on foot in a field, in town,
  low over the strait).
- **Look**, before and after each change, from the same views.
- **Leaks** with `scripts/br/leak-check` (three mount/dispose cycles of the full arena), on both
  depth paths.
- **Not measurable here: GPU time.** The software renderer says nothing about a real GPU's
  frame time, and the full arena with 100 operator rigs crashes it. The owner's PC is the
  reference (F3 shows GPU ms in game; `scripts/br/render-profile` runs on Windows Chrome).

| View | Draws | Triangles | Props | Trees | Terrain |
|---|---|---|---|---|---|
| Plane, 2.6 km up | 214 | 1.16 M | — | — | — |
| Parachute, 250 m | 170 | 0.72 M | 0.40 M | — | — |
| Parachute, 80 m over town | 222 | 1.37 M | 1.17 M | 22 k | 92 k |
| On foot, field | 198 | 0.77 M | 0.40 M | 64 k | 119 k |
| On foot, town | 249 | 1.60 M | 1.27 M | 35 k | 112 k |

34 shader programs. Largest single contributors: houses at their far LOD (320 × 461
triangles), and **power pylons, about 100 k triangles per town view** (4.4 k each even at the
far LOD). Draw counts and triangles are not the limit on a mid-range GPU; the fragment side
is (below).

## Findings

### 1. The blurry ground after the lobby (fixed)

The adaptive budget was fed loading stalls during the lobby, fell to 0.6 and switched the
ground textures off for the rest of the match. Fixed in the first commit of this branch: the
budget ignores isolated stalls, BR adapts only once the match leaves the lobby (as 1v1 and
Bomb do), and the ground textures shorten but never switch off.

### 2. The ground is a blur from the parachute even at full quality (fixed)

The zones' real tile textures exist only within 140 m of the camera, measured in 3D. Above
140 m nothing is in range, so from the parachute and the plane the whole ground was the baked
aerial albedo, 2.4 m per texel: grey and green smears.

**Mid-field layer** (`terrain.ts`, `MID`): from the near range out to 1.1 km, the aerial colour
is modulated by the dominant zone's real texture at 8× its tile size (two rotated samples, so
the repeat never shows as a lattice; the ratio to the layer's mean is compressed so dark
layers do not saturate) plus its normal map. Colours stay the aerial bake's; the ground gains
a surface grain from the air and in the middle distance. Two or three texture fetches for
pixels in that band; nothing changes on foot within 140 m.

### 3. Logarithmic depth defeats early-Z (opt-in fix, the owner decides)

`logarithmicDepthBuffer: true` makes every fragment shader write its own depth. That turns off
the GPU's early depth test, so every hidden fragment of terrain, buildings and leaves is shaded
in full before it is discarded. In a forest or a town that is most of the fragment work.

**Reversed-Z** (`scene-target.ts`) replaces it: a 32-bit float depth buffer, which three can
only give an offscreen target, so the scene renders into a 4× MSAA half-float target and one
fullscreen pass applies the same ACES tone mapping and exposure to the canvas. Depth precision
is better than log depth at every distance, and early-Z works again. Needs `EXT_clip_control`
(desktop Chrome, Edge, Firefox); elsewhere the arena keeps log depth.

Found and fixed on the way: the sky and the mountain ranges pin themselves to the far plane
(`xyww`), which is the *near* plane under reversed-Z (they covered the island); the ranges'
"just in front of the far plane" was only 12 km away in reversed depth; and a resize left the
target unbound for one frame (black).

**Why it is opt-in:** it changes the far haze. When drawing to the canvas, three mixes fog
*after* tone mapping and sRGB encoding, with a linear fog colour. Far geometry therefore never
reaches the background haze: there is a visible band at the horizon from the air, and the
distant sea stays deep blue. In the reversed-Z path fog is mixed in linear light, as intended:
no band, but the far field fades fully into the haze and reads hazier. The fog distances were
tuned against the current look.

**A/B on the owner's PC:** in the browser console on the site,
`localStorage.setItem("br-depth", "reversed")`, reload, play, F3 for GPU ms; remove the key to go
back. In the explorer: `?depth=reversed`. If the GPU time drops and the look is wanted (or the
fog is retuned), flipping the default is a one-line change in `br-arena.ts`.

### 4. Smaller fixes

- The dev overlay (F3) showed the draw calls and triangles of the *last* render pass (the
  weapon viewmodel or the inventory portrait), not the scene. It now shows the scene pass.
- `scripts/br/render-profile` disabled the budget by patching a line that no longer exists; it
  matches the new line again.
- `scripts/br/leak-check --reversed` checks the opt-in path.

### Checked, nothing to change

- No material uses glass transmission (which would render the whole scene twice per frame).
  Physical materials are confined to the first-person weapons and car clear-coat.
- The frame loop allocates nothing per frame beyond a ≤ 100-element sort; input is sent at
  30 Hz.
- LOD tables and switch distances are sensible per class; houses are 4.3 k / 1.2 k / 461
  triangles by LOD.

## H1Z1: what makes its look, and where Project Island stands

H1Z1 (King of the Kill, later Z1 Battle Royale) runs on Daybreak's ForgeLight engine (also
PlanetSide 2): DirectX 11, volumetric lighting and fog, cloud shadows, dynamic reflections,
real-time radiosity, a seamless world, and PhysX for vehicles and particles. Its user settings
are render distance, texture, model, shadow, lighting, flora, effects and particle quality, and
ambient occlusion; competitive players lower flora and shadows first, which says those are both
the expensive features and the look-defining ones.

| | H1Z1 | Project Island now |
|---|---|---|
| Ground texture | Splatted detail textures with normal maps across the visible terrain | Real tiles within 140 m; **mid-field grain to 1.1 km (new)**; aerial bake beyond |
| Ground flora (grass clumps) | Dense near the player; a signature of the look | None; bushes per 60 m cell |
| Sun shadows | Yes, near the player | **None** (`shadowMap` never enabled) |
| Ambient occlusion | Optional SSAO | Baked into some models only |
| Fog / atmosphere | Volumetric fog and lighting | Linear fog, sky, mountain ranges |
| Trees | LODs and impostors | Real models to 60 m, impostors to 1.5 km |
| Draw distance | Long, hazed | 1.3–3 km slider, 14 km far plane |

## Roadmap, ranked by value for the goal

1. **Decide reversed-Z** (above). Expected the largest GPU win available without touching
   content; it also removes the horizon band. Needs only the owner's A/B.
2. **Sun shadows near the player.** The biggest missing piece of the H1Z1 look. One shadow map
   about 120 m around the player for characters, trees and props, the static part refreshed at
   a low rate, the terrain's far field unshadowed. Shadows also reveal players behind cover, so
   the same for everyone (no setting that turns them off).
3. **Ground flora.** Instanced grass cards within 40–60 m, faded by distance, on the grass and
   field zones. Concealment is gameplay: it must draw the same for everyone at every view
   distance (like rocks and bushes today), and prone players must not be fully hidden by it.
4. **Compressed textures (KTX2 / Basis).** The terrain alone holds about 180 MB of RGBA8 in
   VRAM (albedo array 72 MB, normals 18 MB, aerial surface 89 MB with mipmaps); BC7/ASTC cut
   that 4–8× and remove the main-thread image decode, a source of the loading hitches the
   budget used to misread. Needs the Basis transcoder hosted with the site.
5. **Pylon far LOD.** 4.4 k triangles each at every distance, about 100 k per town view; a
   600 m+ billboard or a 300-triangle lattice silhouette.
6. **Fog retune** if reversed-Z becomes the default: fog *start* further out, or the
   "air clear" opened further, so the parachute view keeps its contrast.

## Real-GPU benchmark (owner's MSI laptop, same evening)

The island renderer (terrain, water, trees, buildings, props, power lines, sky; no players or
weapon) ran in the Claude desktop app's browser on the owner's laptop, assets from the live
site, 1920 × 1080 window, 1632 × 918 render (the game's 1.5 MP cap), 150 frames per sample,
GPU time from timer queries, CPU time = the JavaScript and WebGL submission of one frame.
Then each group hidden in turn.

**NVIDIA GeForce RTX 2050 (D3D11), logarithmic depth (the default):**

| View | Draws | GPU ms (median / p90) | CPU ms (median / p90) | Frame |
|---|---|---|---|---|
| Town, on foot | 249 | 1.63 / 5.19 | 2.6 / 3.4 | 6.9 ms (144 Hz) |
| Field, on foot | 198 | 1.28 / 2.60 | 2.2 / 2.7 | 6.9 ms |
| Forest, on foot | 171 | 1.92 / 3.21 | 2.0 / 2.3 | 6.9 ms |
| Parachute, 80 m over town | 222 | 1.59 / 2.90 | 2.2 / 2.6 | 6.9 ms |
| Parachute, 250 m | 170 | 1.50 / 2.81 | 1.9 / 2.3 | 6.9 ms |
| Plane, 2.6 km | 51 | 0.92 / 1.83 | 1.2 / 1.4 | 6.9 ms |

Where the time goes (hiding one group):

- **CPU: props are 55–60 %** of the world's submission time (town 2.6 → 1.0 ms, parachute
  80 m 2.2 → 1.1 ms): about 200 separate prop draws a frame. Everything else costs ≤ 0.5 ms.
- **GPU: the terrain is 35–50 %** (town 1.63 → 1.10 ms, field 1.28 → 0.73 ms, 250 m
  1.50 → 0.72 ms); trees 0.2–0.7 ms in forest and field; props 0.3–0.5 ms in town.
- **GPU p90 spikes in town** (5.2 ms against a 1.6 ms median): occasional heavy frames, most
  likely LOD uploads as the view settles.

**Reversed-Z on the same GPU: no gain.** GPU 1.5–1.9 ms against 1.3–1.8 ms: the half-float MSAA
target and the present pass cost more bandwidth than early-Z saves at this load. It stays
opt-in; on this hardware it is not worth the look change.

**Intel UHD Graphics (the laptop's integrated GPU, which the desktop app first ran on):** a
synchronous frame (render and wait for the GPU) took 18.6–22 ms on foot and 11.6 ms from the
plane, about 45–54 fps for the world alone. Integrated GPUs are GPU-bound where the RTX is
idle; that is where the terrain shader and resolution matter. Players on hybrid laptops get
the integrated GPU unless Windows' Graphics settings put the browser on the dedicated one.

**Bug found:** the F3 overlay's GPU reading froze for good after a few slow frames (`GpuTimer`
collected finished queries only after a query it had started, and refused to start one with
more than four pending). Fixed: it collects results when starting a query too.

### What this changes in the roadmap

The world renders at 144 Hz with headroom on the RTX 2050 (world CPU ≤ 2.6 ms, GPU ≤ 1.9 ms
median of a 6.9 ms frame). The last world-side gains, in order:

1. **Batch the props' far LODs.** Their LOD1/LOD2 share one untextured material; one
   `BatchedMesh` (WebGL multi-draw) for all of them turns ~200 draws into a handful: about
   −1.0 to −1.6 ms CPU per frame, the biggest single saving measured.
2. **Integrated GPUs:** the terrain shader is the largest GPU cost; a cheaper near-field
   variant (one detail layer instead of two, no rotated breaker) when the budget scale drops,
   before resolution drops.
3. **Town GPU spikes:** spread LOD uploads over frames (one model per frame) so the p90
   matches the median.
4. Sun shadows and ground flora (above) now have a measured budget: on the RTX 2050 there are
   ~4 ms of GPU free at 144 Hz.

Not covered by this benchmark: 100 players, the weapon viewmodel, network and simulation —
measure those in a live match with F3 now that its GPU reading works.

## Fixes from the benchmark, measured (same evening, `br-perf-2026-11-09`)

1. **Far-LOD props batched** (`props-batch.ts`): the far LODs that share one untextured material
   draw as a few BatchedMeshes (WebGL multi-draw). Captures pixel-identical.
2. **Prop reselect spread over frames** (`props-renderer.ts`): matrices precomputed once,
   squared-distance rings, a pass at most ~1 ms a frame, a model at a time (a jump or a still
   capture finishes at once; the precompile selects everything so no shader compiles later).
3. **Lite terrain before resolution drops** (`terrain.ts` `setGroundLite`, `brResolutionScale`):
   the budget's first step keeps full resolution and drops the tiling-breaker sample, the second
   zone except at real borders, and the second mid-field sample.

RTX 2050, same benchmark, `main` before against this branch:

| | Before | After |
|---|---|---|
| CPU per frame, town / field / forest | 2.4 / 2.0 / 1.9 ms | 1.6 / 1.4 / 1.2 ms |
| CPU per frame, parachute 80 m / 250 m / plane | 2.1 / 1.8 / 1.1 ms | 1.3 / 1.1 / 0.8 ms |
| Draw calls, town / field / 250 m / plane | 249 / 198 / 170 / 51 | 112 / 76 / 49 / 9 |
| Driving through town (600 frames): p50 / p90 / p99 | 2.5 / 3.0 / 6.9 ms | 1.9 / 2.5 / 4.1 ms |
| Frames over 6.9 ms (144 Hz) while driving | 5 | 1 |
| GPU, town median / p90 | 1.6 / 5.2 ms | 1.7 / 2.8 ms |

The GPU median is 0.1–0.3 ms higher in most views (batched instances read their matrix from a
texture); the town's GPU spikes are gone. The single worst driving frame was 15 ms (one of 600)
against 11.6 ms before. The lite terrain was not measured on the integrated GPU (the app ran on
the RTX); it removes two to three texture fetches per near-ground pixel.

In this container, the props' reselect per frame while moving: 4 / 14 / 46 ms (median / p90 /
worst) before, 1.1 / 4.5 / 11 ms after.

## Files

`src/lib/fps/presentation.ts` (budget stalls), `src/lib/fps/br/br-arena.ts` (budget gating,
ground range floor, scene target, overlay counts), `src/lib/fps/br/terrain.ts` (mid field),
`src/lib/fps/br/scene-target.ts` (new), `src/lib/fps/br/atmosphere.ts` (far plane under
reversed-Z), `scripts/br/explorer/entry.ts`, `scripts/br/leak-check/capture.mjs`,
`scripts/br/render-profile/capture.mjs`, `tests/fps-presentation.test.ts`; then
`src/lib/fps/br/props-batch.ts` (new), `props-renderer.ts`, `island-scene.ts`, `br-settings.ts`,
`tests/br-render-perf.test.ts`.

## Building quality and old hardware (same night, `br-quality-lowend-2026-11-09`)

Owner: "increase texture quality on houses/buildings … meanwhile FPS optimize even more … an
old one from 2015 should handle the game".

### What was wrong

- **54 models went flat-coloured at their first LOD switch**, the common houses at 100 m (cars at
  35 m): `house`, `rural-house`, `cabin`, `barn`, `garage`, `shed`, `superstore`,
  `prison-block`… The pipeline's seam-respecting reduction missed its triangle budget on them
  and fell back to an untextured silhouette. In a town most of what is in view is past 100 m.
- **Up close a wall is 2–4 cm a texel** (one 1024 px texture for a whole house).
- **Texture memory: 542 MB** for the island's models and atlases at full size, measured, plus the
  terrain's arrays: more than a 2015 laptop's shared graphics memory holds comfortably.
- **4× MSAA and a 1.5 MP render** from the first frame on every machine; the budget stepped down
  only after seconds of slow frames, and MSAA could never be turned off.

### Changes

1. **Facade atlas** (`art/blender/br/build_facades.mjs`, `scripts/br/facades/bake.mjs`): each
   of the 54 models' near LOD is rendered from five sides (unlit base colour, 2× supersampled,
   edges dilated) into one 4096 × 1264 atlas (598 kB to download, 27 MB in memory), and the
   existing mid-distance silhouettes get UVs by the same projection. One texture, one material.
   The world revision is unchanged (placements and collision are the same); only the manifest
   file is new (`models.facades-v1.json`). LOD1 files: 407 kB → 870 kB in total.
2. **Close-up grain** (`building-detail.ts`): within 26 m the near LOD of the building classes
   multiplies its colour by a world-space grain at two scales (1.1 m and 4.7 m repeats) from one
   procedural 256 px texture. Two fetches; mean colour unchanged; six more shader variants.
3. **Hardware tier** (`quality-tier.ts`), decided before the renderer exists: override
   (`localStorage "br-tier"` = `low` | `standard`), then a previous slow session (a standard
   session that sat at the budget's floor marks the machine low for 14 days), then the GPU's
   name (integrated Intel before Xe, old AMD integrated, entry and old mobile GeForce, phone
   GPUs, software), then a fill-rate probe for unknown names (RTX 2050: 2.8–3.0 ms; low above
   12 ms). **Low:** no MSAA, a 720p pixel budget, the lite ground shader from the start,
   half-size world textures (models, ground arrays, aerial surface, atlases), 4× anisotropy,
   no close-up grain, the shortest view distance unless one is saved. Trees, bushes, rocks,
   buildings and their draw distances are identical on both tiers.

### A regression found and fixed: batching everything

The benchmark first compared tiers with the GPU nearly idle and got nonsense (a laptop GPU at
10–20 % load clocks down, and its timer queries read high). Measuring end to end with each view
drawn eight times a frame showed the real picture, and a regression from PR #119:

| End to end per frame, RTX 2050, 1632 × 918 | Before any batching | All far LODs batched (#119) | Now |
|---|---|---|---|
| Town, on foot | 2.42 ms | **5.19 ms** | 2.40 ms |
| Parachute 80 m over town | 2.29 ms | **4.10 ms** | 2.36 ms |
| Field | 2.04 ms | 1.74 ms | 1.94 ms |
| Parachute 250 m | 2.15 ms | 2.00 ms | 2.13 ms |

A BatchedMesh draws with WebGL multi-draw, which Chrome on Windows (ANGLE/D3D11) runs as one
real draw call per visible instance inside its GPU process. JavaScript time fell (which is what
#119 measured), but a town, with thousands of batched instances, cost twice as much overall. It
fit inside a 144 Hz frame on the RTX, so nothing showed; on an old CPU it would have.

**Now:** only models placed at most 32 times are batched (`BATCH_MAX_PLACEMENTS`: 201 of 292
models, 1,549 placements in all); houses, fences, bushes and lamps stay one instanced draw each.
Draw calls: town 249 → 195, field 198 → 131, parachute 250 m 170 → 102, with the end-to-end cost
back to what it was, facades and grain included. JavaScript per frame: town 2.2 ms, field
1.7 ms (2.4 and 2.0 before any batching).

### Measured, RTX 2050

| | Standard | Low |
|---|---|---|
| Render size (1920 × 1080 window) | 1632 × 918, 4× MSAA | 1280 × 720, no MSAA |
| Textures in memory (models, atlases) | 542 MB | 200 MB |
| Load (assets cached) | — | 6.7 s (38 s with a high-quality resample; fixed) |
| End to end: town / field / 80 m / 250 m | 2.40 / 1.94 / 2.36 / 2.13 ms | 1.96 / 1.74 / 1.94 / 1.48 ms |
| GPU under load: field / 250 m / plane | 1.32 / 1.58 / 0.95 ms | 0.85 / 0.93 / 0.56 ms |

Outside towns the low tier's GPU cost is about 40 % lower (39 % fewer pixels, no MSAA). **Not
measured: integrated graphics.** The desktop app ran on the RTX all evening; on a fill-rate-bound
integrated GPU the pixel count and MSAA matter more than here, where the frame is mostly
CPU-bound. The honest next step is one run on the laptop's Intel GPU or a real 2015 machine.

### Not done, and why

- **Compressed textures (KTX2):** needs an encoder the pipeline does not have, and trades
  download size (UASTC is several times larger than WebP) against quality (ETC1S is visibly
  blockier). The memory problem on old machines is handled by the half-size tier instead.
- **Normal maps on buildings:** the pipeline stripped them and the source downloads are not on
  this machine; they would also double the models' texture memory.
- **A 30 fps target for the budget:** at the floor the budget does nothing more either way, and
  trading frame rate for resolution is the wrong direction in a shooter.

## Movement and look feel (same night, `br-feel-2026-11-09`)

Owner: "running around in the world, looking around feels hacky/slow/laggy, not smooth like
1v1 or 5v5".

**Cause 1: the camera moved 30 times a second.** The local body is predicted in fixed 30 Hz
steps (as the server applies them) and the camera sat exactly on it. At 144 Hz it stood still
for four or five frames, then jumped: about 25 cm a jump at a sprint, about 2 m in a dive.
Mouse look was applied per event, so the world juddered under a smooth turn. The 1v1 and Bomb
renderers have always drawn the elapsed part of the next step every frame (`FrameMotion`); the
BR arena never did.

**Cause 2: no raw mouse input.** 1v1 captures the pointer with `unadjustedMovement: true`
(`pointer-capture.ts`); BR called a plain `requestPointerLock()`, so Windows' pointer
acceleration was applied to the aim.

**Fix** (`frame-view.ts`, camera only; what is sent, predicted and reconciled is unchanged):

- `BrFrameView`: each frame, the predicted body plus the elapsed part of the next step with the
  keys held now (every phase: plane, canopy, swim, on foot). On foot the view also integrates
  its own position by the frame's time and eases toward that preview (65 ms, at most 2 m/s), so
  a key pressed between two steps moves the camera on that frame without a pop.
- `BrVehicleView`: the same preview for the vehicle you drive (its mesh and the chase camera).
- Eye height eases at 10 m/s on crouch and swim (it snapped 65 cm in one frame).
- Pointer capture through the shared helper: raw deltas where the browser has them.

Measured on the real island (sprinting and turning through Northstar Town, 144 Hz, 20 s):
every frame moves the camera 5.2 cm (p10 = p50 = p90), no still frames; before, most frames
were still. The view costs 0.008 ms a frame (p99 0.05 ms). `tests/br-frame-view.test.ts` holds
the per-frame steadiness at 60/144/240 Hz, the response on the frame a key goes down, no added
speed or drift, continuity under the canopy, and the snap on a teleport.

Movement itself was already the 1v1 model (instant velocity, the same speed, no inertia).
Not changed: the HUD updates through React at 15 Hz in both modes.
