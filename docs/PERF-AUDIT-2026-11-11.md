# Performance audit against the optimisation checklist (2026-11-11)

Branch `perf/bottlenecks-2026-11-11`, from main at `04314aee`. The owner's checklist (chunking,
workers, spatial partitioning, LOD, game loop, network, memory, assets, monitoring) was checked
against the code and against profiles of Battle Royale, 5v5 and 1v1. Most of it was already done
in earlier audits. This one fixes the bottlenecks the profiles still showed.

**Machine.** This session's container: Node for the rooms, headless Chromium on SwiftShader for
the client. Room times are relative (a Cloudflare isolate is not this VM); before and after were
measured on the same machine. The occlusion bench and the 1v1/5v5 game bench ran on the owner's laptop (RTX 2050).

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

### Review: what the 300 ms hold discloses (2026-11-12)

A reviewer's concern, taken up explicitly: a pair in sight is traced every 300 ms, so a player
who steps behind cover stays in the other's network data longer, and a wall on screen is not an
anti-cheat boundary.

**Where the sight test applies.** Interest management has two rings (`BR_RULES`):

| Distance    | A player is sent                                  |
| ----------- | ------------------------------------------------- |
| 0–300 m     | always, whatever stands between (`alwaysSendM`)   |
| 300–1,000 m | only while the sight ray is clear (`sightSendM`)  |
| over 1 km   | never (parachutists and zip-line riders excepted) |

The hold only exists in the outer ring. Inside 300 m, where fights happen, every position is on
the wire at all times, before and after this audit: that ring is what a modified client reads,
and the hold does not touch it.

**What the hold adds.** In the outer ring, a player who breaks the line of sight used to be
dropped within 0.13 s (100 ms recheck plus a snapshot) and is now dropped within 0.33 s. At a
sprint that is about 1.2 m more of their path, at 300 m or more, behind cover that stops
bullets. An unmodified client already holds every remote player about 100 ms ahead of what it
draws.

**What reverting it costs** (`scripts/br/profile-room`, 100 recipients, one 8-minute match each):

| `sightHoldMs` | Snapshots, mean | Snapshots, p99 | Whole tick, p99 |
| ------------- | --------------- | -------------- | --------------- |
| 300           | 6.4 ms          | 15.2 ms        | 15.5 ms         |
| 100           | 7.1 ms          | 20.6 ms        | 19.0 ms         |

**Decision: keep 300 ms.** It adds 0.2 s of stale position for targets beyond 300 m, against a
ring of 300 m in which everything is sent anyway, and it takes a quarter off the worst
snapshots. Reverting is one constant and fits the 33 ms tick either way.

**The real boundary, if wall-hacks are to be made harder,** is the 300 m ring: sending near
players only when they could come into view within the next few hundred milliseconds (a sight
test with a margin for peeking and for latency). That is a design change with a risk of
players popping in late, not a constant, and it is not part of this audit.

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

## The game on a real GPU: main against this branch (2026-11-12)

The real 1v1 and 5v5 game with bots (`scripts/fps/gpu-bench`, published as the "Arena Frame
Bench" artifact with both builds in it) ran in the Claude desktop app's browser on the owner's
laptop: NVIDIA GeForce RTX 2050 (D3D11), a 640 × 651 window at device pixel ratio 1.25, 144 Hz.
Per map: 4 s warm-up, 15 s sampled, about 2,100 frames. Four runs (main, branch, main, branch);
samples in which the window left the screen for seconds are left out.

| Map (clean samples main / branch) | Frame p50 | Frame p99        | Average fps               | CPU p95 per frame (ms) |
| --------------------------------- | --------- | ---------------- | ------------------------- | ---------------------- |
| Dustfront, 1v1 (2 / 4)            | 6.9 ms    | 7.1 / 7.1–7.2 ms | 139.7–139.9 / 135.7–139.9 | 2.2–3.0 / 1.9–2.2      |
| Sandgate, 5v5 (3 / 2)             | 6.9 ms    | 7.1 / 7.2 ms     | 139.8–139.9 / 139.7–140.2 | 3.0–3.5 / 3.4          |
| Iron District, 5v5 (3 / 1)        | 6.9 ms    | 7.1 / 7.2 ms     | 136.1–139.9 / 140.1       | 2.3–2.5 / 2.5          |

**Result: no difference, and nothing to fix.** Both builds hold the display's 144 Hz with a 99th
percentile of 7.1–7.2 ms and about 3 ms of CPU a frame at the 95th percentile, so more than half
of every frame is idle on this machine. That is what the changes predict: in 1v1 and 5v5 this
branch speeds up the server and the client's movement prediction, not rendering.

Three things in the data that are not the game:

- **One frame of 0.40–0.44 s in every sample, in both builds and on every map.** The page's own
  thread kept running through it (the room's messages kept arriving 13–39 ms before the frame
  that followed), the renderer's CPU time in that frame was 2–4 ms and in all but two samples
  the heap barely moved:
  the app's browser pane stopped delivering frames, the page did not stall. It makes the "1 % low"
  read about 36 fps in every sample; without that frame it is the vsync rate. To be confirmed in
  ordinary Chrome after a deploy (F3 shows the frames over 33 ms).
- **GPU time p95 read 1.2–1.5 ms in some samples and 3.2–7.1 ms in others**, on both builds (main
  read 7.1 ms on Sandgate in the first, discarded run). No rendering code differs between the
  builds; the earlier audits saw the same on this laptop when the GPU clocks down at low load.
  The frame times above are the measurement to trust.
- **The first Dustfront sample of a page load recorded no frames** once. One sample lost.

Not measured: Battle Royale on a real GPU (its assets do not fit in a benchmark page; after a
deploy, F3 in a match), a 1080p window, and integrated graphics.

## The three open items (2026-11-12)

### 1. Battle Royale on a real GPU

The assets do not fit in a benchmark page, so this is read from F3 in a real match after the
deploy of `ad1e5802`. One reading so far, from the owner's laptop (RTX 2050, graphics high,
render scale 1.25), **with World of Warcraft running on the same GPU**:

| fps | Frame   | p95     | p99     | 1 % low | Worst  | Over 33 ms | GPU     | Sim     | Draws | Triangles |
| --- | ------- | ------- | ------- | ------- | ------ | ---------- | ------- | ------- | ----- | --------- |
| 73  | 13.7 ms | 20.9 ms | 27.8 ms | 23 fps  | 100 ms | 3          | 8.89 ms | 0.10 ms | 414   | 1.49 M    |

The frame is GPU-bound there (8.9 of 13.7 ms), the simulation is not in it (0.10 ms). With
another game sharing the card this says nothing about Battle Royale itself.

A second reading the same day, from the top of Iron Hills (the widest view on the island), and
the owner's own figure for the rest of the zone:

| Where             | fps     | Frame  | p95     | p99     | 1 % low | Worst  | Over 33 ms | GPU     | Draws | Triangles |
| ----------------- | ------- | ------ | ------- | ------- | ------- | ------ | ---------- | ------- | ----- | --------- |
| Top of Iron Hills | 104     | 9.6 ms | 14.0 ms | 20.8 ms | 29 fps  | 100 ms | 1          | 3.08 ms | 129   | 1.53 M    |
| Elsewhere, by eye | 110–140 |        |         |         |         |        |            |         |       |           |

**Reading.** The GPU has room: 3.1 ms of a 9.6 ms frame at render scale 1.25 with 1.53 million
triangles. What holds this view under the display's 144 Hz is the rest of the frame, about
6 ms that is not GPU time, in 129 draw calls. A p95 of 14.0 ms is two refresh intervals: some
frames miss one. One frame in the last 600 took over 33 ms and the worst was 100 ms, a single
hitch. Nothing here needs a fix to be playable. What is left to gain is CPU time in wide
views, which F3 does not break down (it shows GPU and simulation time, not the renderer's
own).

### 2. Client allocation per frame

Measured now. The earlier attempt ran at a frame or two a second, where V8 keeps the frame
loop in the interpreter and boxes every number. `scripts/fps/bomb-harness/alloc.mjs` (5v5) and
`scripts/br/client-sim/profile.mjs --no-draw` (BR) turn the GL draw calls into no-ops once the
match is live: the same frame loop then runs at 60 a second and is compiled as on a real
machine. Sampling heap profiler, only what is allocated under the renderer's frame callback.

**5v5, Iron District, ten bots playing: 92–110 kB a frame** in four runs (it moves with what
is in view), and 74–83 kB in two runs after the fix below. Where it goes, in one run of 94 kB:

| Bytes a frame | Where                                                                           |
| ------------- | ------------------------------------------------------------------------------- |
| 36,000        | three's uniform uploads (`setValueM4`, `setValueM3`, `setValueV3f`): per draw   |
| 11,900        | the grenade view while smoke is out (ten numbers a sprite through one function) |
| 8,300         | a shader program worked out again twice a frame (**fixed**, below)              |
| 2,000–2,600   | each of: movement prediction, the frame callback, the viewmodel pose, a sort    |

At 144 frames a second that is now about 11–12 MB a second, a young-generation collection every
second or two. The real-GPU run above (p99 7.2 ms at 144 Hz) shows none of them as a missed frame.

**Found and fixed: a shader program looked up again twice a frame.** three draws a blended
double-sided material in two passes, back faces then front, and marks the material changed for
each, so its program is worked out again for every mesh that uses it, every frame it is in
view. In 5v5 that was the first-person watch glass: 2.0 lookups a frame, now 0.0. On the Battle
Royale island it was 17.7 a frame, now 13.8 (tower glass and the fire's flames; the gas wall and
the waypoint beam take the same setting). Glass, additive flashes and camera-facing
sprites are drawn in one pass now (`src/lib/fps/blended-once.ts`): the picture is the same
(prison tower: no pixel differs).

**Not fixed, and why:**

- **The Battle Royale bushes** (six batches, 12 of the remaining 13.8 lookups a frame) are blended
  leaf cards. In one pass they come out visibly darker (`scripts/br/model-review`, `ONCE=1`), so
  they are left as they are. Making them cutouts like the trees would remove the lookups; it
  changes how they look and needs the owner's eye.
- **three's uniform uploads** are inside three and scale with draw calls. Fewer draws is the way
  down: item 3 takes out about 60 of them when nine operators are in view.
- **The grenade view** allocates only while smoke or fire is out.
- **Battle Royale's frame callback** could not be measured the same way: with the drawing off
  the page still runs at 8 frames a second here (the 100-bot match runs in the page), so its
  per-frame figure (560 kB) is the interpreter's. The program lookups above are counted, not
  sampled, and are exact.

### 3. Operators in 5v5

A Police operator was 10 draw calls (3 for the body, 7 for the M4), a Terrorist 12 (1 and 11
for the AK): nine in view were 101 draw calls, against 81 for the Iron District map in its
median view. The guns were 83 of them.

Every operator of a side carries the same world rifle, each part of it with the same geometry
and an equal material, so each part is now one instanced draw for all operators
(`src/lib/fps/operator-gun-batch.ts`). The operators' own gun meshes stay in the scene on a
layer no camera draws: the character code still poses them (shouldering, reloads, the magazine
dropping), and their world matrices place the instances. Nothing changes on screen.

| Sandgate, the audit's nine-operator view | Draw calls | Of them operators |
| ---------------------------------------- | ---------- | ----------------- |
| No operators, before / after             | 172 / 171  | 0                 |
| Nine operators, before                   | 273        | 101               |
| Nine operators, after                    | 210        | 39                |

(After: one operator had a grenade out instead of his rifle, so with rifles in all hands it is
one or two fewer. The empty view is one call lower because the watch glass is one pass now.) The shader programs for the instanced parts are compiled before
"Ready" with the rest (105 → 118 programs).

Triangles are unchanged (a Police operator is still 32k with his rifle). The bodies stay as
they are: joining the officer's three meshes would break the Battle Royale code that removes
his helmet and vest by mesh.

Not measured: frame times on a GPU. This removes about 60 draw calls a frame in a full fight.
The occlusion bench above puts a static draw call at 3–5 µs of CPU on the RTX 2050 laptop
(0.19–0.27 ms for 55–84 calls), so expect 0.2–0.3 ms a frame there, and less of the per-draw garbage of item 2.

## Commands

```
node scripts/br/profile-room/run.mjs --minutes=10          # BR room, 100 recipients
node --cpu-prof scripts/br/profile-room/run.mjs            # with a CPU profile
MAP=iron-district node scripts/fps/bomb-bench/run.mjs      # 5v5 room
node scripts/br/client-sim/profile.mjs <out> --no-draw --programs  # BR client, CPU + allocations
node scripts/fps/bomb-harness/alloc.mjs --programs         # 5v5 client, allocations per frame
MAP=sandgate node scripts/fps/bomb-harness/audit.mjs <out> # 5v5 client, draw calls with 0/4/9 operators
node scripts/br/tactical-map/capture.mjs <out> [--main]    # the map, by worker or main thread
node scripts/fps/gpu-bench/build-occlusion.mjs <out>       # the occlusion bench (page + files)
```
