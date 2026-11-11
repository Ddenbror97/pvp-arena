# FPS / render audit: the 5v5 maps (2026-11-11)

Scope: Iron District against Sandgate, on branch `feat/iron-district`. Follows the audit of
2026-11-03 (`RENDER-AUDIT-2026-11-03.md`).

**Machines.** The owner's laptop (RTX 2050, 144 Hz, Claude desktop browser pane 640 × 651 at pixel
ratio 1.25) for frame times. This session's container (headless Chromium on SwiftShader, Node for
the room) for draw calls, triangles, shader programs and visibility, which are exact there.

## Found and fixed

| #   | Bottleneck                                                                                                                                                                      | Before                                                            | After                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | **Prop triangles on Iron District.** Ten props held 190k of the map's 253k triangles (four airducts 57k, five potted plants 52k, two generators 27k, a 0.5 m power box 7.4k).   | 253k triangles, 9.66 MB                                           | 129k triangles, 9.04 MB; no visible difference in captures |
| 2   | **Shader programs finished on first draw.** `compileAsync` builds the programs, but three reads each program's link log and uniform tables on the frame a material first draws. | 7 of 90 programs first used after Ready in the scripted audit run | 0: `warmPrograms()` does it before Ready, in 5v5 and 1v1   |

Fix 1 is `dec_all` in `art/blender/iron-district/assets.py`. Fix 2 is
`src/lib/fps/program-warmup.ts`, called by `bomb-renderer.ts` and `renderer.ts`. The Battle Royale
renderer (`br/br-arena.ts`) was not touched.

## Measured

**Map files.**

| Map           | File    | Draw calls | Triangles | Materials | Textures | Texture memory |
| ------------- | ------- | ---------- | --------- | --------- | -------- | -------------- |
| Iron District | 9.04 MB | 161        | 129k      | 47        | 97       | 264 MB         |
| Sandgate      | 10.0 MB | 198        | 241k      | 50        | 89       | 244 MB         |

**Visibility sweep** (`scripts/fps/map-capture/sweep.mjs`): eye-height views from every standable
spot on a 6 m grid, in eight headings (2,408 views on Iron District, 1,600 on Sandgate). "Submitted"
is what the renderer draws (frustum culling only). "Visible" is the meshes with at least one pixel
left after the depth test. Map only, no operators or weapon.

| Map           | Calls submitted (p50 / p95 / max) | Calls visible (p50 / p95 / max) | Triangles submitted (p50 / p95) | Triangles visible (p50 / p95) |
| ------------- | --------------------------------- | ------------------------------- | ------------------------------- | ----------------------------- |
| Iron District | 81 / 149 / 162                    | 16 / 36 / 57                    | 50k / 110k                      | 6k / 24k                      |
| Sandgate      | 103 / 176 / 200                   | 20 / 39 / 68                    | 106k / 211k                     | 19k / 45k                     |

**Client** (`scripts/fps/bomb-harness/audit.mjs`, `MAP=iron-district`): 90 shader programs on Iron
District and 105 on Sandgate. None compile after Ready on either map. The JS profile has no
frame-loop hot spot.

**Room** (Node, 10 humans): tick p99 7.9 ms on Iron District and 5.8 ms on Sandgate, of a 33 ms tick.

## Remaining, largest first

1. **No occlusion culling, on both maps.** About four of five draw calls go to meshes that are fully
   behind walls: the median view submits 81 calls and shows 16 (Iron District), 103 and 20
   (Sandgate). The worst views submit the whole map (the T loading ramp on Iron District: 162 calls
   for 30 visible). A precomputed visibility set per floor cell, baked with the sweep tool, would
   cut map draw calls by about 75 %. This is renderer CPU time, which was the tighter side on the
   RTX 2050 (CPU p95 3.3–5.5 ms against GPU p95 1.5 ms at 144 Hz, audit of 2026-11-03).
2. **Real-GPU numbers with a full fight in view on Iron District**, and a complete callout tour:
   not measured (see "Real GPU").
3. **Operators.** Unchanged since 2026-11-03: a Police operator is about 11 draws and 32k triangles, a
   Terrorist 13 draws and 11k. Nine in view cost more than the Iron District map itself now.
4. **Texture memory.** 264 MB on Iron District and 244 MB on Sandgate. Four 2K colour maps are 84 MB
   of it on each map. Fine on a 4 GB GPU; a risk on integrated graphics.
5. **Room tick.** Iron District costs about 2 ms p99 more than Sandgate (372 collision boxes against
   124). It is at 24 % of the tick.
6. **Battle Royale renderer** does not warm its shader programs before Ready (fix 2 is not applied
   there).

## Real GPU (RTX 2050, 144 Hz)

The real 5v5 renderer with ten bots, the room in a worker, 20 s per sample after a 4 s warm-up
("Iron District GPU Benchmark" artifact; build: `node scripts/fps/gpu-bench/build.mjs <out>`).

| Map           | Cycle | Avg FPS | 1 % low   | 0.1 % low   | Frame p99 | Frames > 25 ms | CPU p95    | GPU p95 | Draws | Triangles |
| ------------- | ----- | ------- | --------- | ----------- | --------- | -------------- | ---------- | ------- | ----- | --------- |
| Iron District | 1–3   | 144     | 139.7–140 | 135.1–138.9 | 7.1 ms    | 0              | 2.4–2.6 ms | 0.7 ms  | 146   | 188k      |
| Sandgate      | 1–3   | 144     | 138.5–139 | 130.4–132.7 | 7.1 ms    | 0              | 3.2–3.4 ms | 2.5 ms  | 211   | 368k      |

Both maps sit on the 144 Hz refresh cap with no long frame. Two limits of this run:

- The camera follows Police slot 0 from its spawn. In these samples it had no operator in view on
  Iron District and up to three on Sandgate, so Sandgate's rows carry more work.
- The GPU p95 for Iron District is read from cycle 3 and Sandgate's from cycles 2 and 3.

A tour of Iron District's 37 callouts (the camera parked at each, turning a full circle) ran in the
same session, but the pane was paused by the desktop app for most of it. The nine spots that
rendered throughout, T Spawn (the heaviest view) among them, averaged 144 FPS with 1 % lows of
135–141. The other spots are not measurements. An earlier 5v5 pass in that paused state showed GPU
p95 of 17 ms on Iron District; the clean run above does not reproduce it.

## Visual fixes made alongside (owner's report, 2026-11-11)

- **Wall bases and inner corners.** The wall plane sat 4 cm inside the collision face, which left a
  see-through slit along every wall base and inner corner. Walls are now on the collision face.
- **Roofs.** A roof was one sloping sheet over a soffit, open at both ends. Roofs are now closed
  wedges, attic storeys closed boxes, and thin building walls end in a stone coping.
- **Windows.** The reveals of glazed windows stopped 5 cm short of the dark pane behind the glass.
