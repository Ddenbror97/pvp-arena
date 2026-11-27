# Battle Royale — building collision, movement jitter and wall sliding audit (2026-11-27)

Branch `claude/br-building-collision`, separate PR, **not merged, not deployed**.
Scope: movement and camera of a player on foot at and inside every building on the island, with a closer look at the Old Fortress and Blackwater Prison (owner: "a lot laggy running with the walls and corners … the building inside prison").

## What was measured, before anything was changed

Seven tools were written (`scripts/br/map-audit/`, run with `node scripts/br/map-audit/run.mjs <name>`). They drive the game's real code headless: `stepBody`/`stepDrop` on the published island with doors open, and the client's camera (`BrFrameView`) over the 30 Hz steps at 60 and 144 frames a second.

| Tool | What it answers |
| --- | --- |
| `wall-slide` | The body itself: every doorway of every building model, 16 headings, sprint and walk, 5 s. Counts steps back, side-to-side bounces, stick-slip, stalls, jolts. |
| `view-smooth` | The camera: same doorways, 8 headings, 60 and 144 fps. Counts frames that go backward, shake, or lurch. |
| `collision-bench` | What one movement step costs in the open and in dense buildings. |
| `frame-cost` | What movement costs per drawn frame, and what one reconciliation (12 replayed inputs) costs. |
| `area-slide <place>` | A whole place, not only doorways: every walkable surface on a grid, on every level, that has a wall within reach; 16 headings each. Body, camera and cost together. Used for the fortress (no doors: open arches) and Blackwater. |
| `wall-trace`, `view-trace`, `area-trace` | Tick-by-tick and frame-by-frame traces of one run, for reading a single case. |

The four suspects in the brief, and what the numbers said:

| Suspect | Finding |
| --- | --- |
| Collision response of the body (sliding, corners, doorways) | **Clean.** 1,425,600 ticks along the walls of 125 building models: 0 stick-slip, 3 bounces, 82 ticks that give ~1 cm back (the corner assist taking the body round a jamb). Not the cause. |
| Reconciliation | **Clean.** Replaying pending inputs from the room's body gives the predicted body to the bit: 0 mm of correction at 50, 150 and 400 ms with ±33 % jitter and 5 % lost snapshots. Not the cause of jitter — but each replay was expensive (below). |
| Camera | **Cause 1.** 5,823 backward frames, 2,875 shakes and 1,510 lurches in 1,896,048 frames. |
| CPU cost | **Cause 2.** A step cost 8 µs in the open and 75–207 µs inside dense buildings; per frame at 144 fps up to 380 µs, and a reconciliation up to 2.75 ms. |

## Root causes

**1. The camera ran its own second simulation.** Between two fixed steps the view stepped a private copy of the body by the frame's few milliseconds and eased toward it. A part-step meets a wall differently from a whole step (the bisection and the corner assist work on the length of the move), so beside a wall, in a door frame or at a corner the camera's body and the real body disagreed by millimetres, and the easing pulled the view back and forth. At a wall 35 cm from the eye that is pixels of shake. Earlier fixes had patched individual cases (standing in a door frame, held in a corner); the mechanism remained for every wall.

**2. Collision queries were slow exactly where boxes are dense.** Every query read every box of the hull's 4 m cell through the packed coordinate store (a page and palette look-up per coordinate, a callback per box) — all storeys of a block for a body on the ground floor, including each stair's 5 cm ramp slices. A body pressed to a wall asks about forty times a tick; the camera asked again every frame; prediction asked again for every pending input on each snapshot. On a 2015 PC (several times slower than the machine measured here) this is milliseconds per frame and a visible hitch on every snapshot, only near buildings.

**3. A blocked step ended the tick.** When an edge is in the way (a door jamb, a post, the next box of a wall), the stepper shifted the body sideways at 70 % of its pace and stopped there for that tick; a 20 cm edge cost two ticks without going. Ordinary buildings have a few such edges. A wall drawn at an angle is stored as a staircase of axis-aligned boxes, an edge every 40–75 cm, so a sprint along it went, caught, went, about six times a second. **Blackwater's keep and quay are built at 15° and 45° to the grid and are almost the only such models on the map (4,743 of the 5,052 staircase steps found across all collision models are theirs)** — which is why the prison building felt worse than anywhere else.

**4. The camera's second simulation also ran in the air.** A jump or a drop along a wall (the fortress's wall-walks, towers and stairs) used the same per-frame part-step as cause 1 and shook the same way.

## Fixes (map-wide, no per-building patches)

**`src/lib/fps/br/static-world.ts` — decoded cells.** The cells bodies are in are decoded once into plain floats, sorted by underside, and kept (a direct-mapped front, two generations behind it bounded at 4 MiB each, so a hundred bodies on a server never evict each other). `blocked` and `supportAt` read those and stop at the first box that starts above the hull. The floats are the stored float32 values bit for bit and boxes never change after construction, so **answers are identical** — verified against the old path at 30,000 scattered hulls and by identical walk results.

**`src/lib/fps/br/frame-view.ts` — the camera follows the real step.** On foot the view now takes the body's *next whole step* with the keys held (the same step the simulation is about to take) and draws the elapsed part of the way to it. Walls, jambs, steps and the corner assist are met once, by the whole step, exactly as the body meets them. The camera's private collision stepping and the special cases for door frames and corners are removed. This is not added smoothing: the view is never more than one step (0.25 m at a sprint) from the body, and that is asserted in the tests.

**`src/lib/fps/br/frame-view.ts` — the same in the air.** Jumps and falls on foot use the whole-step view too (the line between two steps is within 3 mm of the fall's curve).

**`src/lib/fps/br/movement.ts` — an edge is rounded within the tick.** The sideways shift now takes what the step still has, and once the body is clear the rest of the step goes on along the blocked axis. The step's length is spent on its way; none of it standing. It is never longer than before (asserted: no tick exceeds the sprint's step), every end point passes the same `blocked` test, and the reach of the shift (0.3 m) is unchanged, so nothing new can be walked through or round. This changes what client and server both predict, so **`BR_RULESET_VERSION` goes from 19 to 20** (old clients are told to reload). The towns branch also uses 20: whichever merges second takes 21.

**Unchanged on purpose:** the player collider, server validation, anti-cheat, the wire format. No new dependency.

## Before / after

Movement step (µs per tick, pressed to walls after walking in):

| Building | Before | After |
| --- | ---: | ---: |
| condo-floor | 207.4 | 32.2 |
| prison-block | 121.7 | 21.8 |
| bauhaus-block | 76.9 | 15.5 |
| bay-apartments | 52.2 | 19.5 |
| superstore | 27.7 | 14.7 |
| hosp-main | 11.2 | 4.7 |

Per drawn frame at 144 fps (steps + camera), and one reconciliation of 12 inputs (µs):

| Where | Frame before | Frame after | Reconcile before | Reconcile after |
| --- | ---: | ---: | ---: | ---: |
| open country | 11.5 | 7.2 | 45 | 56 |
| condo-floor | 379.7 | 38.3 | 2,754 | 477 |
| prison-block | 279.7 | 33.1 | 1,424 | 325 |
| bauhaus-block | 136.2 | 20.3 | 748 | 192 |
| house | 102.5 | 25.6 | 544 | 250 |
| apartment | 54.1 | 9.7 | 257 | 97 |

Camera, 125 building models, 1,896,048 frames at 60 and 144 fps:

| | Before | After |
| --- | ---: | ---: |
| frames moving backward (> 1 mm) | 5,823 | 201 |
| shakes (left-right-left within 5 frames) | 2,875 | 0 |
| lurches (a frame twice the usual move) | 1,510 | 743 |

(After the in-air and stepper fixes the same sweep gives: backward 71, shakes 0, lurches 739.)

Body along the walls of the 125 models, 1,425,600 ticks: steps back 82 → 38, bounces 3 → 6, stick-slip 0 → 0.

The two places asked about (`area-slide`, grid 3 m, ~2 million ticks and ~9 million frames each):

| | Old Fortress before | after | Blackwater before | after |
| --- | ---: | ---: | ---: | ---: |
| body: steps back | 282 | 60 | 988 | 282 |
| body: side-to-side bounces | 4 | 2 | 135 | 28 |
| camera: frames backward | 6,803 | 269 | 4,008 | 1,141 |
| camera: shakes | 1,584 | 0 | 84 | 0 |
| camera: lurches | 1,952 | 1,229 | 1,895 | 1,831 |

Snags (a tick at under half pace between ticks at pace; grid 5 m): Blackwater one in 622 ticks → one in 2,278; fortress one in 1,295 → 2,734; downtown one in 1,355 → 5,829.

Blackwater's quay parapet, sprinting along it: before, 3 ticks going and 2 standing in every 5; after, no tick standing (the slowest still goes 8 cm forward and 14 cm round the edge).

Server, three 100-player rooms side by side (same machine, alternating runs): tick mean 3.31 / 3.25 ms → 3.03 / 3.18 ms; p99 13.05 / 14.32 ms → 11.01 / 12.34 ms.

## Building types audited

All 125 building models that have a doorway, every doorway of each: houses, cottages, cabins, bungalows, townhouses and villas; apartment, condo, office and brick tower floors, lobbies and roofs; shops, diners, motels, gas station, superstore, strip mall, car showroom; hospital wings, school, church and chapels, police and fire stations; warehouses, factory halls, industrial buildings, East Works; hangars, terminal, control tower; barracks, bunkers, pillbox, armoury, military HQ; prison block; Blackwater and fortress keeps, towers and posts; lighthouse, coastguard, harbour buildings.

## Tests

- New `tests/br-building-movement.test.ts` (6 tests, ~30 s, runs with the unit suite):
  - queries answer exactly as the stored boxes do (30,000 hulls in walls, on stairs, under slabs);
  - the cell cache serves a hundred bodies at once without re-decoding, stays bounded, and walks end at the same place to the bit before and after it turns over;
  - a body along every building's walls: never inside a wall, never faster than its pace, no stick-slip;
  - the camera along every building's walls: no shake, never more than a step from the body;
  - prediction reconciled at 50 / 150 / 400 ms with jitter and loss: 0 correction.
  - a sprint along Blackwater's angled quay parapet never stands a tick.
  The camera, cache and parapet tests fail on `main`; the others hold there too.
- BR suite: 1,693 of 1,695 pass. The fortress gatehouse walk, which fails on `main` (0.314 m vs 0.3), **now passes**. The two that fail also fail on `main`: the prison-block facade atlas (an asset check), and the three-room tick budget (under 12 ms p99), which this sandbox misses on `main` (13–14 ms) and the branch reaches 11.0–12.3 ms.
- 1v1 and 5v5: the changed files are imported only inside `src/lib/fps/br/`; the arena modes' own movement and collision are untouched. Their suite: 1,006 of 1,007 pass; the one failure (FROSTLINE practice bot, seed 123) fails on `main` too.

## Found and not fixed here (need a decision)

1. **Blackwater's angled walls, met square on.** Walking straight (along the grid) into one of the keep's 45° walls, the body creeps for 0.3–1.3 s, jumps one box along (0.43 m), and creeps again. A real angled wall would be slid along at 50–70 % of the pace. Running *along* these walls is what this PR improves; this case it cannot, because the boxes' edges (0.43–0.78 m) are wider than the stepper may shift (0.3 m), and widening that for everyone would push players out from behind every crate they lean on. The proper fix is angled walls as their own collision shape with a true slide along them (StaticWorld + stepper), or re-baking the keep and quay with their collision squared to the grid. Either is a PR of its own.
2. **Swimming into the moat's walls at Blackwater.** Swimming ignores collision boxes; at the moat's quay the water body's edge lies 0.4 m inside the wall, so a swimmer pressed against it is put on the moat's bed inside the wall for one tick (3.6 m down), pushed out, and floats up again, five times a second. Seen on at least 34 m of the north wall; 431 audit runs reached water there. A small, safe fix is to refuse a swim move that would ground the body inside a box, but shores under piers elsewhere need checking with it first.

## Limitations

- Measured headless with the real movement, camera and room code; not in a browser on a real connection. Render frame time near buildings (GPU, draw calls) was not part of this audit.
- 739 lurch frames remain: they are frames where the body's own step changes length at a corner (the body really slows), which the camera now shows honestly rather than smoothing over.
- Walking head-on into the end of a wall still creeps round it over a few ticks (the corner assist). That is the existing behaviour and reads as fair; it is counted as "stall" by `wall-slide` (20,775 ticks) for anyone who wants to tune it later.
- Step-ups (kerbs, stoops, up to 0.35 m) still move the feet in one tick (5,411 ticks); the camera's existing step easing covers them and was not changed.
- Decoded cells use up to about 8 MiB of memory.
- The 48 rebuilt town houses are on another, unmerged work tree and are not in these numbers; the same tools and test cover them automatically once they are on the map.
