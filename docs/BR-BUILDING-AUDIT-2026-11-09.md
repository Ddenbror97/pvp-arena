# Project Island: building audit, location polish, relief and terrain (2026-11-08/09)

Branch `building-audit-2026-11-08`, built on `landmarks-2026-11-08`. Not merged.

## The requests

The owner asked for these things:

1. **Building audit:** "audit every houses/buildings we have one by one, make sure its possible to
   enter, they have a door that fits correctly, no gap, check so every kind of stairs works to
   walk on, eg i found a silo with a side stair that could not be walked on. Make sure the inside
   of all buildings look correct, i saw one house with a garage connected but inside the house it
   looked weird the wall to the garage".
2. **Location polish:** "a final polish audit for … Redstone Quarry, Iron Peaks, Northstar town"
   and Pine Ridge, with download links. "Quarry needs a big upgrade, it should be like a
   mountain/sand hole."
3. **Relief:** "audit the game ground, it should not just be flat, more realistic ground and
   heights, example some areas have hills", following the concept map.
4. **Terrain audit:** "audit the ground, the heights and hills and mountains, so it fits
   correctly with the world, no poor ux looks, depths correctly".
5. **Flicker:** "when running in the world sometimes objects flicker in specific camera angles,
   like the trees".

## How every building was checked

**Real-movement reach audit (scratch tooling, `tests/_reach`).** For every model, this floods out
from the open ground with the game's own `stepBody` hull and step rules. It reports:

- the highest level a player reaches;
- standable levels that nobody can reach;
- how much of the covered floor is reachable from outside.

The voxel-based audit used before was too strict: it called the sniper mast's stair unwalkable,
yet a walk shows it climbs to 31.2 m.

**Interior and door review (`scripts/br/interior-review`, new).** This renders one model with
its fitted door panels. For every doorway it takes three shots:

- from outside, with the door shut (does it fill the opening?);
- just inside, looking in;
- from the room, back to the doorway.

It adds two more from the middle of the ground floor, and composes one sheet per model.
`--boxes` overlays the collision, and `REV=<revision>` reviews a revision before `world.ts` uses it.

Findings, in order:

| Problem | Buildings |
|---|---|
| Stairs drawn but not walkable | The storage tank's spiral side stair (the "silo"), the fire-watch lookout, the steel watchtower, the 16 m fire lookout, the guard tower |
| No way in at all | `hangar-j`, `ind-terminal`, `ind-building-1`, `ind-building-10`, `ind-factory` (painted-on doors) |
| Interior showing the facade's back | The town house (its garage siding and roof slope cut through the living room), the brick shop (looked like a street), the Bauhaus block, the farmhouse (porch posts inside), the mobile home (the other wing's gable) |
| Wrong door | The ruined church had a modern door hung in its broken arch |
| Door fit | All 72 doors fill their openings, sill to head, inside their linings (the doors.v3 fitting work holds) |

## Stairs (`art/br/fitout/audit.py` → `building-access-v7`)

These are collision-only fixes: the meshes are untouched. For each flight, the jumble of treads,
stringers and rails that voxelisation produced is cleared up to handrail height (`clearUp`). An
exact walkable ramp goes in, with exact landings, decks and rails where the voxels had narrowed
the way.

| Model | Placed | Top reached | Notes |
|---|---|---|---|
| Storage tank (`ind-tank`) | 12 | roof, 8.22 m | The spiral is built from 0.2 m cells following the treads' measured profile (10°–147°). Then a landing, a step, and an exact flat roof with its hatch and vent. |
| Fire-watch lookout (`lookout`) | 59 | deck, 3.32 m | Two flights. The deck and its rails are exact; the rails had been voxelised 0.25 m into the deck. |
| Steel watchtower | 9 | platform, 6.74 m | Three flights round the lattice core, corner landings, and an exact platform with rails and cage posts. |
| Fire lookout | 31 | deck, 10.70 m | Three flights. On the last, the deck's edge left 1.5 m of head room, so its collision is opened over the flight. |
| Guard tower | 6 | platform, 7.05 m | The model grows 1.35× (new `scale` option): its platform had 1.5 m under the roof's overhang and its treads were 0.56 m wide. The first drawn tread is 1 m up, so the ramp starts at the ground. |

`tests/br-building-audit.test.ts` walks every tower up and back down:

- at all four turns on flat ground;
- at every island placement (at least 80 % must pass; all do today).

The routes are in `art/br/tower-routes.json`.

**Not stairs, and still not climbable:** the hunting stand's and water towers' ladders, and the
pylons. The game has no ladder movement, so they would need a climbing mechanic in
`movement.ts`, shared by the server and the client.

## Interiors

Each of the following gets plaster liner walls just inside its shell, a ceiling, and doorways
left open. They are drawn in their own colour (a new `groups` option in the repair tool), apart
from the floor.

| Building | Room |
|---|---|
| Town house (445 placements) | The living room and a kitchen behind a partition with a doorway. The garage wall is now a plain wall. |
| Farmhouse | One room, inside the porch posts' stubs. |
| Brick shop | The shop floor, 3.6 m ceiling. |
| Bauhaus block | An L-shaped ground floor; its diagonal east wall is closed off behind the liner. |
| Mobile home | One room. |

Liner doorways stand 0.25–0.35 m taller than their doors: on a slope the ground can rise a few
centimetres through a floor (one mobile home at Murder Cabins).

The earlier fit-outs of these models (v1–v3) are carried into v7 by `carried()`: their doors,
cuts, floors and steps, as exact collision.

## Buildings that could not be entered (`art/br/fitout/cabins.py` → `building-access-v8`)

**Five industrial shells:**

| Model | Size |
|---|---|
| `ind-terminal` | 53 × 16 m |
| `ind-building-1` | 27 × 48 m |
| `ind-building-10` | 44 × 83 m |
| `ind-factory` | 47 × 95 m |
| `hangar-j` | 62 × 90 m |

Each gets:

- everything inside cut away up to its ceiling (mesh and collision);
- a slab, liners and a ceiling;
- two steel doors, one in the middle of each long side.

**Two new downloads:**

- **Log cabin:** its own door was a separate part and is left out. Our door goes in its frame.
  The partition's doorway voxels are cleared.
- **Old mountain hut:** its doorway head was 1.69 m, so the hut grows 15 % (kit fit 7.8 m).

Both stand on a stone footing (0.9 m deep) with steps up to the door. They are set on the
highest ground under them and their doorstep (`top` and `apron` in `locationPolish`'s placer),
so the terrain never comes up through the floorboards; the footing fills the gap on the low side
(up to 0.5 m at Pine Ridge, 0.6 m at Iron Peaks).

The shells' doors have jambs and a lintel between the liner and the shell, so the gap between
them is closed and the door frame blocks as a frame should.

Loot: the cabin and the hut are residential (up to 4 items each). The shells already had
indoor loot classes. The door look is `doors.v6`: 84 doors.

## Location polish (`locationPolish()` in `layout.ts`)

### Redstone Quarry: a mountain with a sand hole

**Before:** the pit was 850 m across but only 46 m deep, so it read as a shallow bare bowl. The
floor was empty (a killing field), and one spiral haul road was the only easy way down.

**Now** (`build_world.py`):

- **The massif:** the quarry stands on its own flat-topped massif, about 75 m over the country,
  faded out at the coast. Its flank is about 1 km long (8 % on average), so the roads can climb
  it. The rim is about 110 m up. (The first version rose 115 m over 570 m, with crags on top:
  the roads ran up 30–110 % slopes. See the terrain audit below.)
- **The pit:** sunk about 100 m to a floor at 12 m:
  - six benches with roughly 60° rock-faced walls fill the outer 55 % of the radius;
  - the inner 45 % (about 380 m across) is the floor.
- **Two haul roads:** they spiral 1.25 turns at about 3 %, interleaved half a turn apart so they
  never cross. One comes from the plant (north-east), the other from the works yard
  (south-west), so there are two ways down instead of one choke.
- **Rock faces** (`quarry-face`, the Valley Gray Cliff scan): 90 stand at the toe of the bench
  walls as cover along every bench. None stand where a haul road replaces a wall.
- **The floor:**
  - 3 conveyor lines fanning out from the processing hall;
  - 11 excavators and 12 dump trucks, on the floor and the benches;
  - 10 gravel mounds;
  - rock piles, containers, pipes, cable reels and drums.

### Iron Peaks

- 28 rock faces on the bare upper slopes, 170–330 m, as cover on the climb.
- Two old mine entrances (scanned outcrops) at the tree line.
- Two mountain huts (enterable) below the summit ridge.

### Pine Ridge: a timber village

- A lumber yard: log stacks and piles and an excavator inside a board fence, with a gate and
  broken boards as ways in.
- Six log cabins and three old huts (all enterable, with doors), each with a log pile, some with
  an outhouse.
- A camp at the edge of the trees.

### Northstar's yards

The housing blocks were open lawns between every house. Now each house in a housing block has:

- a white picket fence along its front garden, with a gap at the path;
- in most cases, a board fence behind it, some boards broken as a way through.

That makes 761 picket sections and 907 board sections. Only Northstar gets them
(`TownPalettes.fences`).

### Downloads

**Used** (CC BY 4.0, credited in `ATTRIBUTION.md`):

- Quarry Conveyor system Kit (assembled line);
- Valley Gray Cliff;
- Entry to the Theresia mine;
- Old hut;
- Wooden Log Cabin;
- Green & white picket fence;
- Privacy Fence Pack: the full section and the broken one.

**Not used** (reasons in `kit.json` `skipped`):

| Download | Why |
|---|---|
| Stone Crusher AO | A medieval water-wheel mill, not a quarry crusher. |
| Small Dump Truck | Untextured. |
| Quartzite rock face | A tilted sheet, not a standing cliff. |
| Logging Truck | The scan includes its ground and debris. |
| Old Sawmill | A diorama on a red base. |
| The bush | A fern clump, not a hedge. |
| Steinbruch Aumühle | A flat scan of a quarry floor. |
| Massive Industrial Mining Scene | 3M triangles, terrain merged in. |

The rock face is held to the rock class budget (1800 / 700 / 250 triangles). All models
together are now 27.5 MB to download, up about 1.6 MB; the limit in `br-models` is 28 MB. The
rock faces and mine entrances are placed as `relief`: they are sunk into the slope behind them,
so `br-static-world` allows them up to 14 m into the ground.

## Relief (`MOUNTAINS` in `build_world.py`)

Hills now stand where the concept map draws dark, shadowed forest, clear of the towns' pads:

| Where | What |
|---|---|
| B–C3 | A wooded ridge between Northstar and Pine Creek (ridged, 115 m). Pine Creek now runs in a steep valley under its south face, as the concept draws. |
| A3 | Coastal hills between Northstar and Bayview. |
| D6 | The forest west of Blackwater Prison (ridged). |
| E6–7 | Hills south-east of the prison. |
| C7 | The forest east of Murder Cabins (ridged). |
| F2 | North of the lake, under Iron Peaks (ridged). |
| I4–5 | Between the hospital and Riverwood. |
| I–J6–7 | The south-east headland. |
| G–H10 | The island's south shore. |

About 46 % of the height samples changed by more than 1 m.

Two things were tried and dropped:

- **Stronger 520 m and 180 m undulation:** it put ridges on the river bridges' banks, and
  `river-bridge-2` could not be crossed.
- **A ridge nearer Murder Cabins and hills by the main river:** the river valley flattened the
  hills, and a mobile home's door ended up on a slope.

The heightfield, land cover, `world.v1.json` and the aerial ground bake
(`surface-v1.webp`, re-run with `bake-surface.mjs`) are regenerated in place, as in earlier
terrain changes. Deploy the site and the match Worker together.

## Terrain audit (`build_world.py`)

Measured on the heightfield (scratch scripts: road grades every 8 m, slope maps, cliff clusters)
and checked in the explorer.

| Problem | Where | Fix |
|---|---|---|
| Roads climbed 30–110 % slopes | The quarry's massif, the new hills, Iron Peaks' coast | Road grading (below) and a gentler massif |
| Traced roads ran straight down the pit's bench faces | Redstone Quarry | They stop at the rim (`trim_roads`); only the two haul roads go down |
| A field of 10–20 m pimples on the massif | The crag noise applies above 90 m | No crags within 2 km of the quarry |
| Sheer walls up to 50 m where hills met water | Pine Creek under the new ridge, the main river, Riverwood's channel, lake shores | Banks rise at most 0.55 (29°) from the water |

**Road grading (`grade_roads`).** Each road gets its own profile:

1. the ground along it, smoothed over about 60 m;
2. its grade held to 13 %, cutting crests and filling dips, but never more than 6 m from the
   ground;
3. cut into or built up from the ground, level across the carriageway and 2 m shoulders, with
   banks at 0.5 (27°) beyond.

It runs after the pads and the beaches, in three passes, so roads that meet converge on one
level. Before, about 2,900 of the 26,000 road samples (8 m each) were steeper than 16 %. Now
about 100 are: road ends at a junction with a road graded to another level, and mountain or coast
roads at the 6 m limit.

**River banks and lake shores.** The river valley kept 45 % of the ground's height at the bank,
so the channel was cut as a wall where a hill met the water (the "gorge" under the ridge north of
Pine Creek was a 40 m sheer sheet). Banks are now capped at 3 m + 0.55 × the distance from the
channel, and lake shores the same from the water's edge (except next to the dam, whose abutments
stand on the ground as it was). Cliff cells (over 45°) outside Iron Peaks and the pit went from
22,000 to about 11,000; the rest are Iron Peaks' sea cliffs and the coast.

**Knock-on fixes in `layout.ts`:**

- Road signs are placed only on buildable verges (one had landed on a cutting's bank, 2.4 m in
  the air), and never within 7 m of a runway.
- Roadside wrecks sit on the 2 m shoulder, on their lowest corner.
- Countryside sites (farms, houses, cabins along the roads) take their random sequence from
  where each road starts, not from its place in the road list. Trimming the quarry's roads had
  reshuffled every site after them. With the new sequence, the old terrain and the new one give
  the same sites (38 farmhouses; the old shuffle happened to give 44).

`tests/br-terrain-audit.test.ts` checks both: under 0.5 % of road samples steeper than 16 %,
and no dry river bank steeper than a player can climb (`MAX_SLOPE`), bar one road embankment at
Riverwood's channel, where the traced roads meet the water and no bridge was built.

**Not changed:** the towns' pads stay level (their streets and buildings need it). Riverwood's
channel still has one traced crossing with no bridge (its far end lands in the inlet).

## Flicker (trees and objects at some camera angles)

- **The near/far tree seam.** Within 60 m, trees are the real models; beyond, crossed-quad
  impostors. The impostors were culled round the moving camera every frame, but the real models
  were rebuilt only every 3 m round where the camera had been. While running, a tree near 60 m
  ahead was drawn by neither ring for a moment and blinked out (or by both, the impostor through
  the model). Both rings now use the same centre and radius (`vegetation-renderer.ts`), and
  `tests/br-vegetation-rings.test.ts` runs 40 m through the densest forest checking that every
  tree ahead is drawn by exactly one ring.
- **Surfaces stored twice.** Many downloads store each double-sided surface twice, front and
  back: the pine's needles, the birch's bark, about 40 vehicles, aircraft and some buildings.
  With a double-sided material both copies draw at the same depth and can z-fight as the camera
  turns. `duplicate-faces.ts` drops the second copy at load, for double-sided materials only.

The headless renderer (SwiftShader) is deterministic and shows no z-fighting either way; the seam
gap is proven by the test.

## Revisions (cache safety)

| Revision | What it adds |
|---|---|
| `building-access-v7` | The stairs and interiors, on v6. |
| `audit-v1` | The eight new models, via `add_models.mjs` from v7. |
| `building-access-v8` | The cabins and the shells, on `audit-v1`. |

The runtime revision is `building-access-v8`, with the door look `doors.v6`. Older files stay for
clients on the previous build.

Rebuild order after a spec change:

```sh
python3 -I art/br/fitout/audit.py && node art/blender/br/repair_building_access.mjs art/br/building-access-v7.json
node art/blender/br/build_collision.mjs
node art/blender/br/add_models.mjs models.access-v7.json collision.access-v7.json audit-v1 \
  conveyor,quarry-face,mine-entrance,old-hut,log-cabin,picket-fence,privacy-fence,privacy-fence-broken
python3 -I art/br/fitout/cabins.py && node art/blender/br/repair_building_access.mjs art/br/building-access-v8.json
node scripts/br/doors/bake.mjs
```

Terrain: `python3 art/br/build_world.py`, then `node scripts/br/bake-surface.mjs`.

### Repair tool (`repair_building_access.mjs`) additions

| Option | What it does |
|---|---|
| `collisionOnly` with `stairs`, `solid` and `doors` | Collision-only flights and landings; an empty door list stops `doors.ts` inferring a door from a new deck. |
| `groups` | Extra drawn boxes, each group in its own colour. |
| `scale` | Grows the whole model about its foot. |
| `clearUp` | A flight's own rails go with its voxel envelope. |

## Checks

New tests:

- `br-building-audit`: the towers' climbs.
- `br-terrain-audit`: road grades and river banks.
- `br-vegetation-rings`: the near/far tree seam.
- `br-duplicate-faces`: doubled surfaces.

`br-building-access` gains routes for the cabin, the hut and the five shells.

Full BR suite: 47 files, 529 tests. All pass except the three-room load test (p99 tick about
13.5 ms against 12 ms, as on earlier branches on this loaded machine).

- **Map:** 33,694 placements, 981,876 collision boxes.
- **Downloads:** 27.5 MB for all models; the limit in `br-models` is now 28 MB.
- **Explorer (SwiftShader):** loads in about 10 s, as before.

## Left for later

| Item | Why |
|---|---|
| Fire station | Its apparatus hall still shows the facade's back. Its open bays would need a liner with large openings. |
| Ladders | The hunting stand and the water towers have ladders, and the game has no ladder movement. |
| Bleachers | Rows rise about 0.6 m: jumpable, not walkable. |
| Pylons | They keep about 4.4k triangles even at their far LOD (deliberately, from the wildlands work). In wide views they are a top triangle cost. |

## Release merge (2026-11-09)

Branch `release-2026-11-09` merges into `main` (which already had the vehicles, inventory, C4
and canopy work):

1. `building-audit-2026-11-08`: the whole 8–9 Nov chain (doors, Superstore, island polish, open
   country, landmarks, this audit, the flicker fix and the terrain audit).
2. `world-quality-2026-11-05`, never merged before: H1Z1-style forests and sky, ground and water
   realism, fenced town yards, clarity from the air (4096 aerial bake), rivers and lakes
   rebuilt, and the joined-up road network.

How the conflicts were settled:

| Area | Kept |
|---|---|
| River banks and lake shores | World-quality's eased valleys and signed-distance shores (they replace this audit's bank cap, which solved the same walls more crudely). |
| Roads | Both: the quarry trim, then world-quality's `connect_roads`, then this audit's grading. |
| Water shader | World-quality's depth-shaded water, with main's shoreline discard reading the same ground lookup. |
| Town fences | World-quality's yards in every town, Northstar included. Northstar's downloaded picket and board fences from this audit are no longer placed (one fence system, not two). World-quality's procedural picket is renamed `yard-picket`, so it no longer clashes with the downloaded `picket-fence`. |
| Footprints | This branch's car and wreck sizes. |
| Explorer renderer | Logarithmic depth and world-quality's texture quality. |

The yard fences join the models through `audit-v1` (10 ids now), and the world, land cover and
the 4096 aerial surface are rebuilt from the merged `build_world.py`.

Knock-on fixes:

- **Island airfield:** the joined-up road runs across the apron, so the bizjet takes a spot
  clear of it.
- **Wildlands:** pylons may step 24 m off their line, and ruined cabins look up to 40 m away for
  level ground. Both had too few places on the new ground.
- **Campsites:** sit on their real 12 m footprint.
- **Layout speed:** the yards add about 20,000 fence sections (58,000 placements in all).
  Countryside and field dressing scanned the whole list for every candidate, which took the
  layout from 4 s to 9.6 s. A grid index (`placementGrid`) brings it to 3.3 s with the same
  result.
