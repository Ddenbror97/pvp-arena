# Project Island: building audit, location polish and relief (2026-11-08/09)

Branch `building-audit-2026-11-08`, built on `landmarks-2026-11-08`. Not merged.

## The requests

The owner asked for five things:

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

Loot: the cabin and the hut are residential (up to 4 items each). The shells already had
indoor loot classes. The door look is `doors.v6`: 84 doors.

## Location polish (`locationPolish()` in `layout.ts`)

### Redstone Quarry: a mountain with a sand hole

**Before:** the pit was 850 m across but only 46 m deep, so it read as a shallow bare bowl. The
floor was empty (a killing field), and one spiral haul road was the only easy way down.

**Now** (`build_world.py`):

- **The massif:** the quarry stands on its own flat-topped massif, 115 m over the country, faded
  out at the coast. Crags break up its slopes above 90 m. The rim is about 150 m up.
- **The pit:** sunk 140 m, floor at about 25 m:
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
| B–C3 | A wooded ridge between Northstar and Pine Creek (ridged, 115 m). Pine Creek now runs in a gorge under its south face, as the concept draws. |
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

`br-building-audit` is new; `br-building-access` gains routes for the cabin, the hut and the
five shells. The full BR suite results are in the commit message.

## Left for later

| Item | Why |
|---|---|
| Fire station | Its apparatus hall still shows the facade's back. Its open bays would need a liner with large openings. |
| Ladders | The hunting stand and the water towers have ladders, and the game has no ladder movement. |
| Bleachers | Rows rise about 0.6 m: jumpable, not walkable. |
| Pylons | They keep about 4.4k triangles even at their far LOD (deliberately, from the wildlands work). In wide views they are a top triangle cost. |
