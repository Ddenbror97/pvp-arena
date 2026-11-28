# Battle Royale — building collision, movement jitter and wall sliding audit (2026-11-27)

Branch `claude/br-building-collision`, separate PR, **not merged, not deployed**.
Scope: movement and camera of a player on foot at and inside every building on the island, with a closer look at the Old Fortress and Blackwater Prison (owner: "a lot laggy running with the walls and corners … the building inside prison"), and swimming against what stands in the water.

## What was measured, before anything was changed

Nine tools were written (`scripts/br/map-audit/`, run with `node scripts/br/map-audit/run.mjs <name>`). They drive the game's real code headless: `stepBody`/`stepDrop` on the published island with doors open, and the client's camera (`BrFrameView`) over the 30 Hz steps at 60 and 144 frames a second.

| Tool | What it answers |
| --- | --- |
| `wall-slide` | The body itself: every doorway of every building model, 16 headings, sprint and walk, 5 s. Counts steps back, side-to-side bounces, stick-slip, stalls, jolts. |
| `view-smooth` | The camera: same doorways, 8 headings, 60 and 144 fps. Counts frames that go backward, shake, or lurch. |
| `collision-bench` | What one movement step costs in the open and in dense buildings. |
| `frame-cost` | What movement costs per drawn frame, and what one reconciliation (12 replayed inputs) costs. |
| `area-slide <place>` | A whole place, not only doorways: every walkable surface on a grid, on every level, that has a wall within reach; 16 headings each. Body, camera and cost together. Used for the fortress (no doors: open arches) and Blackwater. |
| `slants` | The slanted walls rebuilt from their staircases (below): per model how many, how far the staircase reached in front of the drawn face, how many joints are mitred. |
| `swim <water body>` | Swimmers on a grid over a water body, 16 headings, 6 s: ticks with head and shoulders inside a wall, drops onto the bed and back, one-tick height jumps, ticks under a floor, runs that end on land. |
| `wall-trace`, `view-trace`, `area-trace`, `swim … trace` | Tick-by-tick and frame-by-frame traces of one run, for reading a single case. |

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

**5. Slanted walls were not where they are drawn.** The textured kit (`art/blender/br/textured-kit.mjs`, `slab`) gives a wall drawn at an angle a staircase of axis-aligned boxes round its centre line, each reaching 0.375 × the wall's thickness out from the line in x and in z. At the keep that is **up to 0.60 m in front of the drawn stone (median 0.19 m)**, at the quay 0.42 m, with a notch every 0.4–1.1 m. A body ran into corners it could not see. Met square on, it crept for 0.3–1.3 s and jumped a box along, because the corners are wider than the corner assist may shift (0.3 m). Sight lines and bullets also stopped short of the stone. And even on a true slanted wall the stepper's per-axis moves are exact only for walls along x or z: at 45° they take a body along x one tick and along z the next. The same staircases stand in East Works' two round tanks and the fortress's round towers: 496 walls in all.

**6. Swimming took no notice of the world.** A swimmer went straight through the quay and the keep's foundations, under the keep's floor, and through pier legs, boulders and boats on every lake. The water areas are rectangles that run under walls. Where one ended inside a wall the swimmer was put on the bed inside it (3.6 m down), pushed out by the stuck-body rescue and floated up again, five times a second. On main, in Blackwater's moat: **175,022 of 1,782,720 swim ticks with the swimmer's head inside a wall, 4,528 drops to the bed and back, 10,686 one-tick height jumps over 1 m.** And the moat's four flights of steps were no way out: a swimmer floated over them.

## Fixes (map-wide, no per-building patches)

**`src/lib/fps/br/static-world.ts` — decoded cells.** The cells bodies are in are decoded once into plain floats, sorted by underside, and kept (a direct-mapped front, two generations behind it bounded at 4 MiB each, so a hundred bodies on a server never evict each other). `blocked` and `supportAt` read those and stop at the first box that starts above the hull. The floats are the stored float32 values bit for bit and boxes never change after construction, so **answers are identical** — verified against the old path at 30,000 scattered hulls and by identical walk results.

**`src/lib/fps/br/frame-view.ts` — the camera follows the real step.** On foot the view now takes the body's *next whole step* with the keys held (the same step the simulation is about to take) and draws the elapsed part of the way to it. Walls, jambs, steps and the corner assist are met once, by the whole step, exactly as the body meets them. The camera's private collision stepping and the special cases for door frames and corners are removed. This is not added smoothing: the view is never more than one step (0.25 m at a sprint) from the body, and that is asserted in the tests.

**`src/lib/fps/br/frame-view.ts` — the same in the air.** Jumps and falls on foot use the whole-step view too (the line between two steps is within 3 mm of the fall's curve).

**`src/lib/fps/br/movement.ts` — an edge is rounded within the tick.** The sideways shift now takes what the step still has, and once the body is clear the rest of the step goes on along the blocked axis. The step's length is spent on its way; none of it standing. It is never longer than before (asserted: no tick exceeds the sprint's step), every end point passes the same `blocked` test, and the reach of the shift (0.3 m) is unchanged, so nothing new can be walked through or round. This changes what client and server both predict, so **`BR_RULESET_VERSION` goes from 19 to 20** (old clients are told to reload); 20 also covers the slanted walls and swimming below. The towns branch also uses 20: whichever merges second takes 21.

**`src/lib/fps/br/slants.ts` (new) + `static-world.ts` — the slanted walls as they are drawn.** At load, every staircase is recognised and the wall it was made for is rebuilt (its centre line, thickness and height), and **taken only if making the staircase again from it gives the same boxes to the millimetre**. All 496 rebuild exactly; anything else stays boxes. Each wall is a prism, a convex quadrilateral in plan. Where two walls of a run meet, their centre lines' crossing gives a mitred joint: the kit runs a wall 0.25–0.3 m past the joint into the next, and with square ends that left an 8 cm bump on the outside of every bend. `blocked`, `supportAt`, `topBetween` and `raycast` (bodies, sight, shots, loot reach), `blockerDistance` (sight witnesses) and `hitNormal` (impact marks) read the prisms and pass over those boxes. A hit on one is a "box" numbered after the boxes, so the witness and impact paths keep their shape. The boxes stay in the world for anything that reads boxes alone. **No asset, collision file or world revision changes.** Nowhere is the rebuilt wall more solid than the old boxes by more than 4 cm, except the keep's outer tip, where it now reaches the drawn corner (13.5 cm past the old staircase).

**`src/lib/fps/br/movement.ts` — a slide along slanted faces.** When a step runs into a slanted wall's face, it closes the gap to the face and keeps the whole of the step's part along it: exact, and the same every tick. Pushed square into such a face (within 5 % of square), it falls back to the per-axis moves and the corner assist, so doorways in the keep's curved walls are still met as before. Bots (`plain`) are unchanged.

**`grenades.ts` and `canary.ts`.** Grenades sweep the true walls and bounce off them, mirrored in the face's normal, instead of off the invisible staircase corners. The anti-cheat canary's cover test handles a slanted-wall hit the way it handles a box: thick and tall enough, and entered well inside its face.

**`src/lib/fps/br/drop.ts` — swimming meets what stands in the water.** A swimmer's head and shoulders (0.6 m under the surface to 0.3 m over it) are tested against the world. It slides along a wall per axis, as far as each axis goes. Something met at the surface whose top is no more than 0.35 m above the water, with room to stand on it, is climbed onto: a step, a low ledge, a slipway. And someone stood on a submerged step within wading depth stays on foot instead of being sent back to swim. Legs and anything deeper are not tested, so a swimmer still floats over a sunk step or rock. From inside something (dropped into it), the move is free, to get out.

**Unchanged on purpose:** the player collider, server validation, anti-cheat enforcement, the wire format. No new dependency.

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

The two places asked about, **main against this branch** (`area-slide`, every wall-side standing point on a 3 m grid on every level, 16 headings, sprint, 3 s; runs that reach water left out; about 2 million ticks and 9 million camera frames each):

| | Blackwater main | branch | Old Fortress main | branch |
| --- | ---: | ---: | ---: | ---: |
| body: steps back | 988 | 118 | 282 | 60 |
| body: side-to-side bounces | 135 | 31 | 4 | 2 |
| body: snags (a tick caught between ticks at pace) | one in 599 ticks | one in 2,658 | one in 1,313 | one in 2,937 |
| camera: frames backward | 33,116 | 496 | 25,323 | 269 |
| camera: shakes | 20,912 | 0 | 10,662 | 0 |
| camera: lurches | 10,449 | 829 | 6,848 | 1,223 |
| cost: mean µs a step | 39.1 | 10.4 | 34.7 | 16.1 |
| cost: p95 µs a step | 82.4 | 18.6 | 70.5 | 27.7 |

Sprinting at the keep's 45° walls (its rounded ends), square to the grid: on main the body crept for up to a second and lurched a box (0.43 m) along; now it slides along at 0.185 m every tick, the step's share along the face, the same to the millimetre each tick. Along the quay parapet: on main 3 ticks going and 2 standing in every 5; now 0.237 m every tick.

Swimming in Blackwater's moat (`swim`, 4 m grid, 16 headings, 6 s):

| | main | branch |
| --- | ---: | ---: |
| swim ticks with the head inside a wall | 175,022 | 0 |
| drops onto the bed and back | 4,528 | 23 |
| one-tick height jumps over 1 m | 10,686 | 225 |
| ticks under something overhead | 9,849 | 6,724 |
| runs that end on land | 1,401 | 206 |

What is left is legitimate. Most remaining jumps are the ordinary way out of water anywhere on the map: a swimmer reaching wading depth is set on the bottom, up to 1.2 m under the surface. The few drops back into the water are swimmers that climb the steps and walk off their top again, because the test heading never turns into the parapet gap. Being overhead now means swimming under the bridges' arches and under the cantilevered stair treads. Fewer runs end on land because on main most "exits" went through the quay. Each of the four flights of steps now lets a swimmer out: on main none did. On every other water body the swim collision also stops swimmers inside piers, boulders and boats (lake-1 17,535 ticks → 2, lake-4 128,406 → 12,022, the rest of lake-3 and lake-4 being the issue under "Found and not fixed"), with exits unchanged to within 5 %.

Server, three 100-player rooms side by side (same machine, alternating runs): tick mean 3.31 / 3.25 ms → 3.03 / 3.18 ms; p99 13.05 / 14.32 ms → 11.01 / 12.34 ms.

## Building types audited

All 125 building models that have a doorway, every doorway of each: houses, cottages, cabins, bungalows, townhouses and villas; apartment, condo, office and brick tower floors, lobbies and roofs; shops, diners, motels, gas station, superstore, strip mall, car showroom; hospital wings, school, church and chapels, police and fire stations; warehouses, factory halls, industrial buildings, East Works; hangars, terminal, control tower; barracks, bunkers, pillbox, armoury, military HQ; prison block; Blackwater and fortress keeps, towers and posts; lighthouse, coastguard, harbour buildings.

## Tests

- New `tests/br-building-movement.test.ts` (11 tests, ~40 s, runs with the unit suite):
  - queries answer exactly as the stored boxes do (30,000 hulls in walls, on stairs, under slabs);
  - the cell cache serves a hundred bodies at once without re-decoding, stays bounded, and walks end at the same place to the bit before and after it turns over;
  - a body along every building's walls: never inside a wall, never faster than its pace, no stick-slip;
  - the camera along every building's walls: no shake, never more than a step from the body;
  - prediction reconciled at 50 / 150 / 400 ms with jitter and loss: 0 correction.
  - a sprint along Blackwater's angled quay parapet never stands a tick;
  - every slanted wall stands at its drawn faces: a hull touching a face from outside is clear, a centimetre in is blocked, a look from 1.5 m stops at 1.5 m with the face's normal, and the sight witness agrees;
  - the keep's 45° walls are slid along at a steady speed, no tick caught;
  - grenades thrown at the keep's walls come back off the face, never inside it;
  - swimmers on a grid over the moat are never inside a wall and never put on the bed;
  - a swimmer gets out on each of the quay's four flights of steps.
  The camera, cache, parapet, slanted-wall and swim tests fail on `main`; the others hold there too.
- `tests/br-drop.test.ts` "lands in the sea, swims to shore and walks out" now steers round what stands in the water, as a player would. Its straight line south ran through a boulder off the shore; it still has to reach the shore and wade out.
- BR suite: 1,700 of 1,701 pass. The one failure also fails on `main`: the prison-block facade atlas (an asset check). The fortress gatehouse walk, which fails on `main` (0.314 m vs 0.3), **now passes**. The three-room tick budget (under 12 ms p99), which this sandbox misses on `main` (13–14 ms), passed in the last full run and gives 11.0–12.3 ms alone.
- Anti-cheat and canary tests: 15 of 15.
- 1v1 and 5v5: the changed files are imported only inside `src/lib/fps/br/`; the arena modes' own movement and collision are untouched. Their suite: 1,006 of 1,007 pass; the one failure (FROSTLINE practice bot, seed 123) fails on `main` too.

## Found and not fixed here (need a decision)

1. **Phantom water by lakes 3 and 4.** The game finds water by rectangle and level (`waterSurface`), and lake-4's rectangle (level 61.5 m) overlaps the low ground on lake-3's shore (about 31 m). There, about 4 ha of shore counts as 30 m deep "water". Someone walking there is lifted 30 m to swim in the air; a parachute landing there lands on it. This is in the world data, not the swim step: a fix needs each water body's real outline (or the two lakes' rectangles split), a world revision of its own. Measured by `swim lake-3` / `swim lake-4`: what remains "inside" there after this branch is this.
2. **The keep's straight sides meet its curved ends without a mitre.** Where the first slanted wall of each end meets the boxed straight wall, its square end still stands about 4 cm proud on the outside of the bend. It is small, and a mitre against a box wall needs the box wall's line, which this pass does not read.

## Limitations

- Measured headless with the real movement, camera and room code; not in a browser on a real connection. Render frame time near buildings (GPU, draw calls) was not part of this audit.
- 739 lurch frames remain: they are frames where the body's own step changes length at a corner (the body really slows), which the camera now shows honestly rather than smoothing over.
- Walking head-on into the end of a wall still creeps round it over a few ticks (the corner assist). That is the existing behaviour and reads as fair; it is counted as "stall" by `wall-slide` (20,775 ticks) for anyone who wants to tune it later.
- Step-ups (kerbs, stoops, up to 0.35 m) still move the feet in one tick (5,411 ticks); the camera's existing step easing covers them and was not changed.
- Decoded cells use up to about 8 MiB of memory; the 496 slanted walls 124 KB.
- Pushed within 5 % of square into a slanted face, a body gets the per-axis moves (the doorway nudge) rather than the exact slide: a push that near square barely slides on a real wall either.
- The 48 rebuilt town houses are on another, unmerged work tree and are not in these numbers; the same tools and test cover them automatically once they are on the map.
