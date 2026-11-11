# Iron District: the second 5v5 bomb-defusal map

Branch `feat/iron-district`. **Not merged, not deployed.**

Iron District is an industrial Mediterranean hillside district. Bombsite A is a foundry courtyard.
Bombsite B is an old market below a block of flats. A service tunnel runs under the upper town.

The map is registered in the Bomb Defusal map registry (`src/lib/fps/bomb/maps.ts`). Every new 5v5
match now draws its map at random from that registry, the same way the 1v1 rotation works.

## 1. Research summary: principles taken from the reference maps

These are drawn from knowledge of the maps and their callout guides ([Dust 2](https://csdb.gg/maps/dust2/),
[Mirage](https://csdb.gg/callouts/mirage/), [Counter-Strike Wiki: Mirage](https://counterstrikewiki.com/Mirage),
[Counter-Strike Wiki: Dust II](https://counterstrikewiki.com/Dust_II)). They are design principles,
not copied geometry.

| Reference                                | What works                                                                                                                                                                                 | Principle used here                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dust2: Long A, B tunnels, mid doors      | Each lane has its own range: long for rifles and AWPs, tunnels for close fights, mid for the opening duel. A door frame at mid turns the round-start crossing into a known, readable duel. | **One identity per lane.** A main is medium to long range: the yard, the hall and the doors. B is close and vertical. Mid is a gated duel. **The mid gate is offset** from the T steps, so neither spawn sees down mid.                                                                                                              |
| Mirage: apartments, balcony, connector   | The upper route into B ends on a balcony, so a site defender must check a high angle as well as the ground. The connector rewards mid control with a split onto a site.                    | **The apartments.** Ts enter at street level from the upper town, cross a two-storey flat and come out on a balcony 3 m above the market. Stairs lead down from the balcony, and inner stairs lead to a ground-floor door under it. **The arcade (mid → B) and the boiler house (mid → A)** are the splits that pay off mid control. |
| Cache: A main, forklift, highway         | A wide warehouse entrance with a machine to clear behind. Forklift and container cover splits the site into smaller fights.                                                                | **The shipping hall.** Big sliding doors plus a personnel door give two angles to clear, and pallet racking splits the hall into two lanes. The forklift, the press, the container and the ladle each block a specific line.                                                                                                         |
| Inferno: banana, apartments, pit         | Tight streets, short sightlines, elevation at the site.                                                                                                                                    | **The market lane.** A stepped cobbled lane with a dog-leg, so no line runs its full length, and a low stone wall at the arch.                                                                                                                                                                                                       |
| Ancient, Anubis: cave, water, connectors | An underground or low route that is risky, slow and readable, never a free flank.                                                                                                          | **The service tunnel.** Stairs down, two bends with a pump room at the jog, then four risers up into a pocket off lower mid. It is slower than the open routes (9.4 s to the exit against 10.9 s to the mid gate), it exits into contested mid and not behind a site, and its exit is one doorway.                                   |
| Nuke: heaven, ramp, secret               | Elevation for retakes and post-plants; verticality used sparingly.                                                                                                                         | **The foundry catwalk** at 4.2 m. Police reach it through the control room's stairs, and Ts reach it up the dock stairs. It watches the north half of A and never the hall doors: the ladle (3.6 m tall) and the partial roof cut its view.                                                                                          |

**What to avoid, and how the layout handles it:**

- **Spawn-to-spawn lines.** The test measures 0 visible spawn pairs.
- **Lanes longer than ~55 m.** The longest sightline is 56 m, from the A dock down A main to the
  ramp. It is the map's one deliberate AWP lane.
- **Positions that see a whole site.** The catwalk is cut by the ladle and the roof, and the market
  hall window is cut by the stalls and the fountain.
- **Unavoidable death corridors.** A main has two doors into the courtyard plus the boiler-house split.
- **Unclearable corners in the tunnel.** Each leg is 3 m wide and lit, and the pump-room alcove
  opens into the jog.

## 2. Concept and size

**Levels.** The engine floor is y = 0 and nothing walks below it, so the district sits on terraces of
solid fill:

| Level      | Height | What is on it                                                     |
| ---------- | ------ | ----------------------------------------------------------------- |
| Tunnel     | 0.0 m  | The service tunnel                                                |
| Lowland    | 1.2 m  | Police spawn, the foundry (A), the shipping hall, mid             |
| Market     | 2.4 m  | The market (B) and the lower alley                                |
| Catwalk    | 4.2 m  | The foundry catwalk                                               |
| Upper town | 5.4 m  | T spawn, the high street, the apartments' upper floor and balcony |

**Size.** The arena is 92 × 92 m; Sandgate is 80 × 80 m, so the footprint is 32 % larger.

|                                                      | Sandgate  | Iron District                                                       |
| ---------------------------------------------------- | --------- | ------------------------------------------------------------------- |
| Reachable walkable area (walk-graph cells × 0.25 m²) | 2,222 m²  | 3,393 m² (+53 %)                                                    |
| Area per level                                       | one level | lowland 1,406, market 933, upper town 903, catwalk 84, tunnel 68 m² |

The extra area is mostly second storeys, interiors, the tunnel and the upper town, as the brief
asks. Traversal times stay within about 0–15 % of Sandgate (§4). The brief asked for +15–25 %, so
this is the main open sizing question, and §9 lists where it could be trimmed if playtests feel big.

## 3. Layout (top-down plan with callouts)

The plan is generated from the layout source: `art/blender/iron-district/plan.py` writes `build/plan.png`.

```
                N (Police)
  ┌ Rail Yard ───────── CT Spawn ──── Market Street ──┐ Market Hall (window + door → B)
  │ A Gate   Control Room(stairs↑4.2)  │ CT Mid        │ B Gate
  │ ┌ Catwalk 4.2 ───────┐             │               │ ┌──── B: OLD MARKET (2.4) ────┐
  │ │Dock  Ladle  Cont.  │ Boiler      │               │ │Stalls  Fountain  Loading Bay│
  │ │ A: FOUNDRY (1.2)   │ House ← Annex ── LOWER MID ── Arcade ─┘   Balcony 5.4 ▲ Arch │
  │ │Press Forklift Pad  │            Mid Gate (offset)  │      Apartments (2 floors) │  │
  │ └─ A Doors ──────────┘   Gantry crane, truck         │      Upper door ▲          Lower
  │   SHIPPING HALL (racks)       T Mid Steps ↑     Tunnel Exit (pocket)          Alley
  │   Lower Yard (truck)          T PLAZA 5.4    ┌─ TUNNEL 0 m (pump room) ─┘   (dog-leg)
  │   LOADING RAMP ↑              Tunnel stairs ↓                                Market Lane ↑
  └── HIGH STREET 5.4 ───────── T SPAWN 5.4 ────────── UPPER LANE 5.4 ──────────────┘
                S (Terrorists)
```

**Routes.**

- **T to A:**
  - The high street, then down the loading ramp and through the lower yard and the shipping hall to
    the A doors.
  - Mid, then the annex and the boiler house to A's east door.
- **T to B:**
  - The apartments, coming out on the balcony.
  - The market lane, then the lower alley and the arch.
  - Mid, then the arcade.
- **Tunnel:** from the upper town to lower mid's east pocket. It is a risky flank toward the mid gate
  and the arcade.
- **Police rotations:**
  - Through spawn: the rail yard and Market Street.
  - Through mid: the boiler house, lower mid and the arcade.
- **Elevated Police retake on A:** control room, then the catwalk, then the dock stairs or the drop.

**What connects, and what deliberately does not.**

- The tunnel only links the upper town and lower mid.
- The apartments only link the upper town and B.
- Mid touches each site through exactly one interior: the boiler house for A and the arcade for B.

## 4. Timings: measured, not assumed

`tests/fps-iron-district.test.ts` measures walking distance on the multi-level walk graph at the
running speed of 5 m/s (`MOVE_SPEED`). It writes its numbers to
`art/blender/iron-district/build/validation.json`.

| Route                              |                                 Iron District |    Sandgate |
| ---------------------------------- | --------------------------------------------: | ----------: |
| T → A (fastest)                    |                                        14.9 s |      14.6 s |
| T → A via A main (hall doors)      |                                        16.4 s |           — |
| T → A via mid and the boiler house |                                        16.2 s |           — |
| T → B (fastest)                    |                                        15.5 s |      15.0 s |
| T → B via the apartments (balcony) |                                        15.1 s |           — |
| T → B via mid and the arcade       |                                        15.9 s |           — |
| T → B via the market lane (arch)   |                                        18.1 s |           — |
| Police → A                         |                                         7.4 s |       5.0 s |
| Police → B                         |                                         5.5 s |       5.6 s |
| T → tunnel exit                    |                                         9.4 s |           — |
| T → mid gate / Police → mid gate   |                                  10.9 / 7.4 s | 8.0 / 8.4 s |
| Police → catwalk                   |                                        13.3 s |           — |
| Rotation A → B / B → A             |                                 13.0 / 14.9 s |      11.1 s |
| First contact (simultaneous start) | 6.0 s (T plaza ↔ CT mid, across the mid gate) |       5.7 s |
| Spawn pairs in sight               |                                             0 |           0 |
| Longest sightline                  |                      56 m (A dock ↔ the ramp) |        51 m |

**How these compare with the brief's targets.**

- **Police reach both sites before a direct rush.** Their lead is 7.5 s at A and 10 s at B.
- **Rotations allow retakes but not instant cover.** They take 13–15 s, which is longer than a rush
  and shorter than a default round.
- **Both teams can contest mid.** First contact happens at mid at 6 s.
- **Flanks cost time.** The tunnel exit is 9.4 s from T spawn, and from the exit to the arcade is
  another 2–3 s.

Every staircase, ramp and slab was walked with the shipped `predictMovement` and arrives at the
expected height. The 20 walks are listed in validation.json under "climbs".

## 5. Verticality and the physics audit

**What the engine supports.** Movement is axis-aligned boxes:

- Step-up is at most 0.35 m (`STEP_HEIGHT`).
- Jump speed is 5 m/s and gravity 14 m/s², so the apex is 0.89 m.
- The body is 1.8 m tall with a 0.35 m radius.
- There is no fall damage and no slope or ramp collision.

**The ramp solution: no engine change.** The loading ramp and the market lane are 0.15 m risers on a
0.43–0.6 m run.

- The visible ramp is one smooth slope through the back edges of those risers, so feet stand at
  most 0.15 m above it and nothing visible is above the collision.
- Descending is ordinary step-down by gravity.
- This uses the shipped step code that every map already relies on, so it cannot change another
  map, needs no per-frame physics and keeps client and server identical.

**Ceilings and headroom.**

| Place                                          | Headroom |
| ---------------------------------------------- | -------- |
| Under the catwalk and the control-room landing | 2.8 m    |
| Under the apartment floor and the balcony      | 2.6 m    |
| Tunnel ceiling                                 | 3.2 m    |

Descending stairs are open to the sky above their upper part. A walker drops between risers, so a
ceiling over an upper riser would catch the head. The tunnel mouth therefore starts at the foot of
its stairs.

**Railings** are movement-only barriers: bullets and sight pass between the rails, as the model shows.

**Engine changes for multi-level maps (shared, tested).**

- `nav.ts` is a multi-level walk graph: one node per standable level per 0.5 m cell.
  - Its edges follow fine risers in sub-steps and stop where the movement sweep stops; stairs are
    climbed from their foot, not from the side.
  - Bots and the layout tests use it, and the Sandgate bot tests pass unchanged.
- Spawns carry a feet height.
- Plant zones carry a height band, so there is no planting on the catwalk or the balcony.

## 6. Sites

**A: the Foundry** (courtyard at 1.2 m, plant zone x −39.5…−22.5, z −33.4…−13, y 1.0…2.6)

- **Plant spots:**
  - **Default:** between the ladle and the container (`IRON_DISTRICT_BOT_POINTS.plant.A`). It is
    covered from the doors and the boiler house.
  - **Exposed:** on the casting pad, which is one riser up and seen from the doors and the boiler
    door.
  - **Situational:** behind the ladle and the dock.
- **Cover, each with a job:**
  - The ladle (3.6 m) blocks the catwalk from the south half.
  - The press (2.6 m) breaks the doors-to-container line.
  - The forklift, with its load, cuts the boiler door's view of the default plant.
  - The container shields the north edge.
  - A crate stack and a single crate by the doors are for clearing.
  - The generator is low cover by the boiler door.
- **Police retakes:**
  - The A gate (ground).
  - The control room to the catwalk (elevated).
  - The boiler house from mid.
  - The catwalk stairs down to the dock.

**B: the Old Market** (market at 2.4 m, plant zone x 22.5…40, z −36…−15.5, y 2.2…3.0)

- **Landmark:** the fountain on a one-riser terrace, a low basin plus a tall column.
- **Cover and features:**
  - Three stalls with awnings.
  - An old stone wall at the arch.
  - The covered loading bay with the van and a crate stack.
  - The Police market hall: a window, a door, and the B gate steps.
- **The balcony** sees the south half of the market. The stalls and the fountain column cut it from
  the hall door.
- **Ground floor:** the apartments' ground door opens under the balcony, so a retake can push up into
  the flat.

## 7. Performance (measured on this branch)

**GLB.** Measured with `art/blender/map06/measure_glb.mjs`; draw calls count mesh primitives, with an
instanced node counted as one call.

| Map           |    File | Draw calls | Shadow casters | Triangles rendered | Materials | Texture GPU |
| ------------- | ------: | ---------: | -------------: | -----------------: | --------: | ----------: |
| Iron District | 9.04 MB |        161 |            136 |               129k |        47 |      264 MB |
| Sandgate      | 10.0 MB |        198 |            191 |               241k |        50 |      244 MB |

**In the game's renderer** (map-capture harness, SwiftShader, 960 × 540):

- Load takes 1.1–1.4 s.
- Per view: 53–172 draw calls and 92k–268k triangles.
- The full aerial view draws 161 calls.

**In the real Bomb Defusal client** (`scripts/fps/bomb-harness/iron.mjs`, SwiftShader, 960 × 540).
The shipped renderer and the client's own prediction run against an in-page room:

- **Load.** About 95 s under SwiftShader, which is CPU-bound; this is not a GPU number.
- **Views.** 14 first-person views, as Police and as a Terrorist, draw 130–252 calls and 220k–410k
  triangles. Each heading is checked against the yaw the client sends (error ≤ 0.002 rad).
- **Plant and defuse.**
  - A Terrorist holding use plants on A and on B; the room decides the site.
  - A Police player defuses in 10.1 s.
- **Stairs.** The client walks the tunnel stairs down (y 5.4 → 0) and the apartment stairs up
  (y 2.4 → 5.4), holding W until it arrives.
- No page errors.

That run found one visual bug, now fixed. Explicit building walls drew a full-height facade on every
wall piece. The sill under the Police market-hall window and the header over its door were painted
over the openings, so the window and the door showed as dark cards that a player could be shot
through. Wall pieces are now dressed over their own height only, with no painted bays, and sills
and headers get a stone cap. A ray check through every opening of every explicit wall (the halls,
the boiler house, the annex, the apartments, the control room) finds them all clear.

**Worker and walk graph.**

- The FPS Worker bundle is 911.87 KiB (233.11 KiB gzip) in a `wrangler deploy --dry-run`. The new map
  modules add about 63 KB of source: the layout is 47.9 KB, `nav.ts` 10.4 KB and `maps.ts` 4.8 KB.
- The bot walk graph is built lazily, once per isolate, on the first bot tick of a map. It takes 510 ms
  for Iron District and 242 ms for Sandgate.
- Props that a player can bump into (drums, gas cylinders, the pallet, utility boxes, barrels,
  plants, crates and the power box) carry their own collision boxes (`prop-<model>-n` in
  `layout.py`). The Blender build fits each model to its box.

SwiftShader frame times are not representative of a GPU. Real-GPU FPS and 1% lows have **not** been
measured; that needs `scripts/fps/gpu-bench` on real hardware.

**Room tick** (`scripts/fps/bomb-bench`, Node, 10 humans' snapshots, 14,000 ticks):

| Map           | Step p99 | Views p99 | Tick p99 | Budget used p99 | Snapshot avg |
| ------------- | -------: | --------: | -------: | --------------: | -----------: |
| Iron District |  2.15 ms |   6.33 ms |  7.90 ms |          23.7 % |       3.7 KB |
| Sandgate      |  1.16 ms |   4.95 ms |  5.77 ms |          17.3 % |       3.7 KB |

This is a real regression of about 2 ms p99, because the map has 372 collision boxes (props included)
against Sandgate's 124.
It stays well inside the 33 ms tick. A uniform-grid broad phase for sight segments was tried,
proved exact, and measured slower (closure and cell overhead beat the flat, tightly filtered loop),
so it was **not** kept. Static geometry adds no network traffic: snapshot size is unchanged.

## 8. Balance (bots only)

These are bot-only matches with the shipped bots and rules (`MAP=… MATCHES=6 node scripts/fps/bomb-bench/run.mjs balance`).
They show structural bias under identical bot play, **not** human balance. Real balance needs
telemetry from played rounds.

| Map           | Rounds | Police wins | Terrorist wins | Plants A / B | Median plant | Median first kill |
| ------------- | -----: | ----------: | -------------: | -----------: | -----------: | ----------------: |
| Iron District |     59 |      37.3 % |         62.7 % |      29 / 22 |       29.3 s |            17.4 s |
| Sandgate      |     67 |      35.8 % |         64.2 % |      34 / 29 |       46.0 s |            16.8 s |

The bots lean Terrorist by the same amount on both maps, so the layout adds no measurable skew of
its own.

**First kills spread across:**

- The A pad and press.
- The A gate.
- The arcade exit.
- The loading bay.
- The lower alley.
- Mid.

## 9. Remaining issues

**Done and tested:**

- The layout, its collision and every climb (walked).
- The registry, the random map draw, spawns, plant zones, the walk graph and bot points.
- In the real client harness (`scripts/fps/bomb-harness/iron.mjs`):
  - The bomb plant and the defuse on both sites.
  - The tunnel and apartment stairs walked with the client's prediction.
- The Blender build, the asset manifest and credits.
- The room tick and GLB measurements, and the bot balance runs.

**Not done or not measured:**

- Real-GPU FPS and 1% lows.
- A two-human session against a deployed Worker.
- Human balance and telemetry.
- Grenade line-ups per site.

**Size.** Walkable area is +53 % rather than the asked +15–25 %, though timings are within ~15 % of
Sandgate. If play feels big, trim three places:

- The T plaza and upper lane widths.
- The B market's east strip.
- Lower mid's depth.

**Art still below the reference image:**

- Facade relief is mostly recessed openings.
- The props are still sparse.
- Vegetation is limited to wall cards.
- The forklift atlas has low texel density.

**Bot behaviour on the new map** uses the shared planner with new points. The bots use the
apartments, the tunnel and the catwalk only when the walk graph's shortest route goes there. There
are no per-route personalities yet.

**Room tick:** about 2 ms p99 more than Sandgate (§7).
