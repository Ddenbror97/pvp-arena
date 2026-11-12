# Performance audit against the optimisation checklist (2026-11-11)

Branch `perf/bottlenecks-2026-11-11`, from main at `04314aee`. The owner's checklist (chunking,
workers, spatial partitioning, LOD, game loop, network, memory, assets, monitoring) was checked
against the code and against profiles of Battle Royale, 5v5 and 1v1. Most of it was already done
in earlier audits. This one fixes the bottlenecks the profiles still showed.

**Machine.** This session's container: Node for the rooms, headless Chromium on SwiftShader for
the client. Room times are relative (a Cloudflare isolate is not this VM); before and after were
measured on the same machine. The occlusion bench ran on the owner's laptop (RTX 2050); the game's
own frame times on a real GPU were not measured.

## Fixed

| #   | Bottleneck                                                                                                                                                                                                                                                                           | Before                                                  | After                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | **5v5 and 1v1: every solid tested for every sight ray and movement step.** On Iron District that is 372 boxes. The sight test was 39 % of a full room's CPU time and movement 20 %. The client predicts with the same movement code. 1v1 shares the code; its room was not measured. | Room tick p99 8.3 ms (Iron District), 5.4 ms (Sandgate) | 3.4 ms and 3.3 ms; the simulation step itself 0.57 → 0.10 ms          |
| 2   | **BR room: each recipient's snapshot rebuilt what all recipients share.** Player rows, vehicle rows and head counts were built per recipient (100 × 100 rows a snapshot); the loot near every recipient was walked every snapshot; distances used `Math.hypot`.                      | Snapshots for 100 recipients: 10.5 ms mean, 26 ms p99   | 5.6 ms mean, 16.6 ms p99                                              |
| 3   | **BR room: sight rays.** A ray crossing the island looked up hundreds of empty grid cells in a Map (40 % of a ray's time), and pairs standing still were traced again every 100 ms.                                                                                                  | (in row 2)                                              | (in row 2)                                                            |
| 4   | **BR client: the tactical map was drawn on the main thread.** Since the map upgrade (4096 px) the terrain picture is 16.7 million pixels. Built in slices, it took several milliseconds of every frame for the first minute of a match, and allocated about 4 MB a slice.            | About 5 s of main-thread time, spread over frames       | Drawn in a Web Worker; the main thread draws the result once          |
| 5   | **BR client: shader programs finished on first draw.** The fix the 5v5 audit made for 5v5 and 1v1 (`warmPrograms`) was never applied to BR: the first enemy, vehicle or explosion in view stalled a frame.                                                                           | Stall on first use                                      | Done before "Ready"                                                   |
| 6   | **Monitoring showed averages only.** F3 had mean and p95 over 120 frames.                                                                                                                                                                                                            | —                                                       | Also 1 % low, p99, worst frame and frames over 33 ms, over 600 frames |

### How each is done

1. `src/lib/fps/solid-index.ts`: a grid over each map's solids, built once per map. Movement asks
   for the solids within 1 m of the player; a sight ray visits the 4 m cells it passes. The tests on
   each solid are unchanged, and every caller wants "any" or a min/max, so the answers are
   identical. `tests/fps-solid-index.test.ts` checks 30,000 rays per map against the full scan on
   all seven maps, and that the movement lists hold every solid a step can reach. The bench plays
   the same rounds with the same snapshot bytes before and after.
2. `brViewFrame` (`br/match.ts`): the room makes one per publication and passes it to each
   `brViewFor`. `LootSync.diff` returns at once when no loot changed anywhere and the recipient is
   within 2 m of the last full diff (the range is 70 m).
3. `StaticWorld` keeps one bit per grid cell (780 kB) and skips empty cells without the Map.
   `BrSight` keeps a pair's answer for up to 0.5 s while neither end has moved 10 cm.
4. `tactical-map-terrain.ts` (the pixels, no DOM) runs in `tactical-map.worker.ts` and returns an
   ImageBitmap. Where a worker cannot start, or the map is opened before it is ready, the same
   code runs on the main thread two rows at a time. The pictures are byte-identical
   (`scripts/br/tactical-map/capture.mjs`, with and without `--main`).
5. `warmPrograms(renderer)` in `br-arena.ts` before "Ready".
6. `dev-overlay.ts`.

**Player rows on the wire** round with `Math.round` instead of `toFixed` (the same centimetre
precision; a value exactly on a half may differ by 1 cm). Nothing else in a snapshot changed: the
profile's match plays the same 17,971 ticks with the same 2,047 bytes per view.

## The checklist, item by item

| Item                             | State                                                                                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Chunking and bundles          | Already in place. 225 route-split chunks; the game renderers load through `renderer-loader` before the match, and nothing is imported dynamically during play. Nothing to change.                                               |
| 2. Work off the main thread      | The simulation runs on the server, so the client's main thread carries prediction, rendering and the HUD. The one heavy main-thread job was the tactical map: now a worker (fix 4).                                             |
| 3. Spatial partitioning          | BR already had grids for boxes, trees and loot. 5v5 and 1v1 had none: fix 1. The BR grid's empty-cell lookup: fix 3.                                                                                                            |
| 4. LOD and adaptive quality      | Already in place (LOD tables, impostors, batching, the hardware tier, the render budget). See the render audits of 2026-11-09 and 2026-11-11.                                                                                   |
| 5. Game loop                     | Already right: fixed 30 Hz steps, per-frame interpolation (`FrameMotion`, `BrFrameView`), the HUD through React at 15 Hz, never per frame.                                                                                      |
| 6. Network                       | Already in place (prediction, reconciliation, interpolation, interest management, lag compensation; netcode audit 2026-11-11). Fix 2 cuts the room's cost per snapshot.                                                         |
| 7. Memory and garbage collection | The server-side garbage of fix 2 is gone (rows, sets and loot walks per recipient). **Client allocation per frame could not be measured here**: at 1 fps the frame code never leaves the interpreter, which boxes every number. |
| 8. Assets                        | Already in place (meshopt, WebP, tiered textures, preloading before Ready). KTX2 was considered and declined in the 2026-11-09 audit.                                                                                           |
| 9. Monitoring                    | Fix 6. `scripts/br/profile-room` and `scripts/br/client-sim/profile.mjs` are new: the first profiles a 100-seat room on the real engine, the second the real client under the CPU and heap profilers.                           |

## BR sight rays, second pass (no change to when a player comes into view)

The owner's reviewer and this audit agree: the 100 ms recheck of hidden pairs stays. A 200 ms
recheck was measured (snapshots 5.5 → 4.6 ms mean) and rejected, because a player stepping out
of cover at range would be sent up to 67 ms later. Two changes that do not have that cost:

- **Hidden pairs are confirmed with a short ray.** A pair that was hidden is usually still
  hidden by the same hill or building. The 30 m of the new ray beside the last blocker is traced
  first; a hit there is a hit on the whole ray, so the answer is exactly "hidden". No hit says
  nothing and the whole ray is traced as before.
- **Pairs in sight are traced every 300 ms** (`sightHoldMs`) instead of every 100. A clear ray
  runs its whole length, up to 1 km, so these were the dear ones. The cost: a player who steps
  behind cover is sent for up to 0.3 s instead of 0.13 s. They are drawn behind that cover either
  way; only a cheat reading the network gets the extra 0.17 s.

`tests/br-sight.test.ts` holds that a player coming out of cover is seen at the next 100 ms
recheck, and that "hidden" is never answered without a blocker on the line.

| Snapshots for 100 recipients | Mean    | p99     |
| ---------------------------- | ------- | ------- |
| main                         | 10.5 ms | 26.0 ms |
| first pass (fixes 2 and 3)   | 5.6 ms  | 16.6 ms |
| with the two changes above   | 3.9 ms  | 9.3 ms  |

A full room's tick is now 9.3 ms p99 in this container, against a 33 ms tick.

## Occlusion culling in 5v5: measured on a real GPU, no-go

The render audit found that about four of five map draw calls go to meshes behind walls. Before
building a precomputed visibility set, the most it could save was measured on the owner's
laptop (`scripts/fps/gpu-bench/occlusion.ts`, published as the "5v5 Occlusion Bench" artifact).

**Method.** From 344 viewpoints on Iron District and 229 on Sandgate (the walk graph on a 6 m
grid, eight headings, every seventh view), the page finds the map meshes that really show, then
times the game's map scene, with its real materials, lighting and static shadow map, at
1632 × 918 with 4× MSAA: as drawn now, and with every hidden mesh switched off. That is a
perfect visibility set, which a real one can only approach. Twelve renders in a row, then a
wait for the GPU; the modes alternate. See-through meshes are never culled.

**NVIDIA GeForce RTX 2050 (D3D11), two runs, median per frame:**

| Map           | Draw calls | CPU (submission)         | CPU + GPU                | Saved         |
| ------------- | ---------- | ------------------------ | ------------------------ | ------------- |
| Iron District | 83 → 28    | 0.28 → 0.09, 0.40 → 0.14 | 0.86 → 0.72, 1.03 → 0.78 | 0.16, 0.22 ms |
| Sandgate      | 109 → 25   | 0.38 → 0.11, 0.39 → 0.12 | 1.08 → 0.77, 1.17 → 0.82 | 0.31, 0.38 ms |

Two identical timings of one view differ by 0.07–0.23 ms on average, so the Iron District saving
is close to the noise.

**Verdict: no-go.** The whole map scene costs about 1 ms a frame on this machine, and a perfect
visibility set would save 0.2–0.4 ms of it: 3–5 % of a 144 Hz frame, 1–2 % of a 60 Hz frame. A
real one saves less (it must be conservative), costs a bake per map and per map change, and
can hide a mesh that should show. Two thirds of the draw calls go, but a draw call for a static
mesh is cheap here: the time is in the pixels that do show, in the operators and in the
viewmodel (render audit 2026-11-11).

**Not measured: integrated graphics.** The desktop app's browser runs on the RTX whatever
adapter a page asks for. A slower CPU scales the saving up with everything else, so the share of
the frame stays about the same; an integrated GPU is fill-rate bound, where hidden meshes cost
little (the depth test rejects their pixels). Neither points to a different verdict, but
neither is a measurement. The bench runs on any machine that opens the artifact.

## Still open

1. **Client frame times of the whole game on a real GPU** after these changes: not measured (the
   branch is not deployed). F3 now shows the 1 % low and the frames over 33 ms to read it from.
2. **Client allocation per frame**: could not be measured in the software renderer.
3. **Operators** (render audit 2026-11-11): nine in view cost more than the Iron District map.
   The occlusion result says the same: the next render win is there, not in the map.

## Commands

```
node scripts/br/profile-room/run.mjs --minutes=10          # BR room, 100 recipients
node --cpu-prof scripts/br/profile-room/run.mjs            # with a CPU profile
MAP=iron-district node scripts/fps/bomb-bench/run.mjs      # 5v5 room
node scripts/br/client-sim/profile.mjs <out>               # BR client, CPU + allocations
node scripts/br/tactical-map/capture.mjs <out> [--main]    # the map, by worker or main thread
node scripts/fps/gpu-bench/build-occlusion.mjs <out>       # the occlusion bench (page + files)
```
