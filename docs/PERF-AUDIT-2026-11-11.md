# Performance audit against the optimisation checklist (2026-11-11)

Branch `perf/bottlenecks-2026-11-11`, from main at `04314aee`. The owner's checklist (chunking,
workers, spatial partitioning, LOD, game loop, network, memory, assets, monitoring) was checked
against the code and against profiles of Battle Royale, 5v5 and 1v1. Most of it was already done
in earlier audits. This one fixes the bottlenecks the profiles still showed.

**Machine.** This session's container: Node for the rooms, headless Chromium on SwiftShader for
the client. Room times are relative (a Cloudflare isolate is not this VM); before and after were
measured on the same machine. **No real-GPU frame times were measured.**

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

## Still open, largest first

1. **BR sight rays** are now the largest part of a full room's snapshot time (about a third).
   Rechecking far pairs every 200 ms instead of 100 ms would halve it; that is a rule change
   (a far player could appear 100 ms later), so it is left to the owner.
2. **BR snapshot p99 with 100 humans** is 16.6 ms here, against a 33 ms tick. Real rooms are
   mostly bots, which get no snapshot; the cost scales with humans.
3. **Occlusion culling in 5v5** (render audit 2026-11-11, item 1): about four of five map draw
   calls go to meshes behind walls. Unchanged.
4. **Client frame times on a real GPU** after these changes: not measured. F3 now shows the
   1 % low and the long frames to read it from.

## Commands

```
node scripts/br/profile-room/run.mjs --minutes=10          # BR room, 100 recipients
node --cpu-prof scripts/br/profile-room/run.mjs            # with a CPU profile
MAP=iron-district node scripts/fps/bomb-bench/run.mjs      # 5v5 room
node scripts/br/client-sim/profile.mjs <out>               # BR client, CPU + allocations
node scripts/br/tactical-map/capture.mjs <out> [--main]    # the map, by worker or main thread
```
