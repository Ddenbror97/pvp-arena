# FPS map performance: audit and optimisation report (2026-11-02)

Brief: bring FROSTLINE, CROSSFIRE and LOST TRAIL to Dustfront's smoothness without changing
gameplay, layouts, visibility or visual identity; remove the lower-resolution option and ship
one render configuration. Everything here was measured on this session's machine (headless
Chromium on SwiftShader, software rendering), so absolute times are tens of times slower than
a real GPU; the ratios between maps are what carry over. Real-GPU timing is still to do.

## How the game renders (what was inspected)

- One three.js `WebGLRenderer` per match (`src/lib/fps/renderer.ts`), two passes per frame:
  the world (camera layer 0) and the viewmodel (layer 1), both 4× MSAA. Fixed-rate input and
  prediction run every frame; drawing drops to 15 fps when the tab is unfocused.
- Maps are data (`src/lib/fps/maps/*.ts`): gameplay solids (also the collision and
  line-of-sight model), a GLB, lighting and shadow framing. One shared loader
  (`arena-environment.ts`): sky dome, a blockout from the solids until the GLB arrives, static
  shadow map rendered once, reflections captured once, frozen world matrices, per-section
  frustum culling. FROSTLINE adds GPU snowfall; LOST TRAIL adds foliage wind, alpha-to-coverage,
  flowing water and now a baked backdrop.
- Shaders for both teams, both rifles and the Karambit compile before "Ready"
  (`compileAsync`), so nothing compiles mid-match.
- React (TanStack Router/Query) owns the HUD only. Snapshots go to the renderer directly;
  the HUD re-renders at most every 250 ms unless something important changed (hp, ammo,
  weapon, phase, round). Nothing in the frame loop touches React state.

## Audit results

| Map (player-height views, map only) | Draw calls | Triangles | Overdraw (layers/px) | Software frame | vs Dustfront |
| ----------------------------------- | ---------- | --------- | -------------------- | -------------- | ------------ |
| Dustfront                           | 43–55      | 21–26 k   | 5.6–7.2              | 0.72–1.02 s    | 1×           |
| FROSTLINE                           | 54–67      | 49–58 k   | –                    | 1.09–1.82 s    | 1.3–1.5×     |
| CROSSFIRE                           | 61–63      | 52 k      | –                    | 1.21–1.33 s    | 1.3×         |
| LOST TRAIL, as found                | 143–209    | 694–863 k | 30–34                | 14.4–18.6 s    | 15–18×       |
| LOST TRAIL, now                     | 109–161    | 200–258 k | 10.5–11.9            | 2.7–3.8 s      | 3.5×         |

Full game (`tests/e2e/fps-frostline-perf.spec.ts`: real renderer, both operators, viewmodel):
Dustfront 84 draws / 159 k triangles, median frame 5.0–6.5 s; FROSTLINE 103 / 240 k; CROSSFIRE
91 / 185 k; LOST TRAIL now 185–189 / 384 k, median 12.6–12.9 s (as found: did not finish within
the 15-minute limit). The operators and viewmodel are most of the triangles and are the same on
every map.

CPU per simulation tick (movement, shots, bot, visibility, prediction replay): Dustfront
0.19 ms, FROSTLINE 0.21 ms, LOST TRAIL 0.19 ms, CROSSFIRE 0.42 ms (199 solids vs 71; linear
scans). About 1% of one core at 30 ticks/s: not a bottleneck.

### FROSTLINE and CROSSFIRE: no bottleneck found

Both use the same material set and texture sizes as Dustfront (512–1024 px WebP, no 2048s),
~60 merged static draws, sun + hemisphere light only (lamps and windows are emissive), a 2048
static shadow map, no post-processing. Snowfall: no measurable frame cost (1,800 1–3.5 px
sprites, no depth writes, self-halving). The Mi-8 wreck: 11.5 k double-sided triangles,
visible only from inside it. Their 1.3× is the extra geometry of busier scenes, not a defect.
No change was made to either map's art.

### LOST TRAIL: leaf-card overdraw (verified)

Leaf cards were 80–90% of the frame. Each card's texture is mostly transparent (the canopy
cluster covers 23% of its square), and the transparent part is rasterised, alpha-tested and
discarded for every overlapping layer. Measured by drawing every mesh additively without depth
test: 30–34 layers per pixel against Dustfront's 5.6–7.2. Also: the far forest was 212
instanced background trees with full crowns; several plant variants each cost a draw per
culling section; two visual defects (gorge holes, floating river-tree) came with it.

## Optimisations implemented

### LOST TRAIL (`art/blender/lost-trail/`, `src/lib/fps/maps/lost-trail-environment.ts`)

1. **Cards trimmed to their image** (`alpha_bbox`, `crop_cards`, `card_quad`): every leaf,
   frond and reed card is cut to the rectangle holding its texture's opaque texels. Same leaves
   on screen, 34–68% of the area. Overdraw 30–34 → 17–19.
2. **Baked forest backdrop** (`bake/`, two-pass `build.sh`): the forest beyond a square of walls
   at ±29 m is one picture, rendered by the game's own loader, lighting, fog and tone mapping
   from the arena centre (cube faces, clipped at each wall). Trees whose base is inside ±33 m
   stay real. Drawn unlit and as baked in one draw (`prepareBackdrop`). Overdraw → 10.5–11.9.
3. **Leaf thinning by whole card** (`thin_leaves`): near and giant crowns keep 30% of cards
   (grown 1.15×), far crowns 50%. Far crown twigs decimated (32%); trunks keep every ring.
4. **One variant** of palm, fern, bush and rock (yaw and scale vary them), slender trees one
   level, no broad or twisted tree in the near band; far/background spacing 6.6/9.5 m;
   boulders at subdivision 2; 4-sided lianas and roots.
5. **Draw order**: foliage after every solid, near forest before background (`renderOrder`),
   so leaf fragments behind walls and trunks fail the depth test on GPUs with early-Z.
6. **Gorge fixes**: ground grid aligned to the gorge rims, rock end walls, rock outcrop under
   the river-tree. Collision unchanged.

Gameplay check: `tests/fps-lost-trail-layout.test.ts` (layout, spawn safety, reachability,
first contact, post view, bot patrols) is unchanged and passes; the layout file was not touched.

### All maps

7. **One render configuration.** The Graphics setting (High / Low) is removed from Settings
   (`GameSettings.tsx`), `StrikeSettings` (`settings.ts`: a stored value is ignored),
   `ArenaControls.setGraphicsQuality`, `MapEnvironment.setQuality` and LOST TRAIL's batch
   thinning. The single configuration (`RENDER_CAP`, `presentation.ts`): framebuffer at most
   1.25 px per CSS px and 1.5 MP per frame, 4× MSAA (1080p window → 0.85×, 1440p Retina →
   0.64×), with the existing adaptive scale on top (after 1.5 s with >5% of frames over
   18.5 ms the scale drops 0.1, floor 0.6×; eight fast windows raise it). That is automatic
   per machine and changes only the framebuffer size: no presets, no menu. Full scenery on
   every map.
8. **Measurement**: `capture.mjs` now times frames correctly (`gl.finish()` returns at once
   under ANGLE/SwiftShader; frames end in a 1-px readback; median of three after a warm-up)
   and reports frame time; generic comparison views for 40×32, 44×36 and 48×40 arenas.

Dustfront's art, loader and lighting are untouched; its numbers above are identical before
and after.

## Files and systems modified

- `art/blender/lost-trail/build_trail.py`, `build.sh`, `instance_sections.mjs` (comment),
  `bake/{entry.ts,bake.mjs,compose.py}` (new); `public/fps/models/lost-trail.glb`.
- `src/lib/fps/maps/lost-trail-environment.ts`, `arena-environment.ts`, `renderer.ts`,
  `presentation.ts`, `settings.ts`; `src/components/fps/{GameSettings,DuelMatch}.tsx`.
- `scripts/fps/map-capture/{entry.ts,capture.mjs,compare-*.views.json}`.
- Tests: `fps-lost-trail-quality`, `fps-settings`, `fps-presentation`.
- Docs: `FPS-LOST-TRAIL.md`, `fps-map/RENDER-AUDIT-2026-11-02.md`, this report; before/after
  images in `fps-map/img/lost-trail-*`; perf JSON `fps-map/lost-trail-perf-chromium-lost-trail.json`.

## Regression checks run

- Unit suite: 1180 passed, 1 skipped (includes layout/reachability/first-contact tests for all
  four maps, collision, combat, hit detection, remote sync). TypeScript and ESLint clean.
- e2e `fps-settings.spec.ts` (settings UI, persistence) and `fps-lifecycle.spec.ts` (repeated
  arena mounts release resources and listeners): pass.
- Map-switching leak check (`capture.mjs --lifecycle=dustfront,frostline,crossfire,lost-trail
--cycles=2`): 0 leaks; GPU geometries/textures return to baseline after every dispose; heap
  flat per map (9.0 / 11.0 / 11.6 / 15.5 MB).
- All four maps captured from the generic views: load 218–406 ms from cache, 22–30 shader
  programs, no console errors; images checked by eye.
- LOST TRAIL full-game perf spec: finishes (10 min); before it did not.

## Remaining bottlenecks and unverified items

- LOST TRAIL is still ~3.5× Dustfront's static-scene cost (2.5× in the full game): the real
  leaf cards in the forest-edge band (2.2–3.0 layers) and the trees between the edge and the
  backdrop (1.7–2.0). Going further means a visibly thinner edge band or a closer, flatter
  backdrop. Play it first.
- Not verified here: frame times on a real GPU (Chrome, Safari, Firefox), on a weak laptop
  and a Retina Mac. The perf spec at `MAP_PERF_SCALE=30` is the tool for that.
- CROSSFIRE's collision scan is linear over 199 solids (0.42 ms/tick). Fine today; a grid
  would be the fix if solid counts grow much further.
