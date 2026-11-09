# Project Island: the island polish (2026-11-08)

Owner's requests:

- "now audit the rest of the island, the airstrip, forest, polish the entire island";
- "ensure if any new buildings they can be entered and with openable door".

This follows the Superstore upgrade (`BR-SUPERSTORE-UPGRADE-2026-11-08.md`) on the same island
(z > 3350).

## Audit (before)

`node scripts/br/map-audit/run.mjs island-map <out.png> <x0> <z0> <x1> <z1> [m/px]` draws a plan
of the land cover, roads, POI pads and every placement's footprint. It is new in this branch.
On the island it showed:

- **Airfield:**
  - a bare apron: hangars, the tower and one cargo plane;
  - empty concrete west of the field.
- **Village:** 8 houses on a concrete plaza, with nothing along the roads around it.
- **West Point:** one fire station.
- **Forests:** trees only.

## New models (all CC BY 4.0, staged with `stage.py`, nothing run from the zips)

| Use | Kit ids |
|---|---|
| Airfield | `terminal`, `airliner`, `bizjet`, `cessna-172`, `cessna-402`, `cargo-plane`, `plane-shelter`, `plane-wreck`, `fuel-truck`, `oil-tanker`, `bag-cart`, `windsock` |
| Village square | `carousel`, `swings`, `bench`, `payphone` |
| Woods and verges | `hunting-stand`, `mossy-log`, `stump`, `campfire`, `tent-canvas`, `tent-dome`, `rusty-truck`, `boat-wreck` |
| Lakes | `old-bridge` |

These were left out:

| Model | Why |
|---|---|
| Approach lights | The model has a backdrop plane, and its LODs broke. |
| Well | A spike below the ground. |
| Airport fire truck | Untextured blob. |
| Fallen tree | It carries a ground patch. |
| Convent | It cannot be entered. |
| Worn shed | The same model as the existing `shed`. |

**`process_assets.mjs` changes:**

- Per-asset `lodTris` overrides the class triangle budgets. The terminal keeps 10k triangles so
  that its doorways survive simplification.
- A LOD whose reduction comes out larger than the nearer LOD reuses the nearer LOD.

## Layout (`layout.ts`)

- **`groundPlacer`** places a building only where all of these hold:
  - it overlaps nothing;
  - the outline, sampled every 4 m, is level and clear of roads, runways and bridges;
  - the ground just outside each of its doors (`ENTRANCE_APRONS`) is clear and level with the
    floor: at most a 0.2 m step up, never buried.

  On the POI's pad it stands at the pad height. Off the pad it stands on the terrain and is tagged
  `countryside`.
- **`roadFrontage`** builds along every road within a radius of a centre:
  - buildings set back from the kerb, both sides, facing the road (quarter turns);
  - a car at the kerb now and then.
- **Village (`islandVillage`):**
  - the original 8-house grid;
  - a square with a church, gazebo, playground, carousel, swings, phone booth, payphone, benches,
    picnic tables and a bus stop;
  - road frontage out to 230 m, about 90 more homes and shops (townhouses, rural stores, a diner;
    no garages, whose doorway is too low for the walk test).
- **West Point (`westPoint`):** yard props around the fire station, and a frontage of homes, barns
  and cabins.
- **Airfield (`airfieldPolish`):**
  - The passenger terminal with its car park, the airliner, the business jet, two Cessnas and a
    plane shelter.
  - Fuel trucks, an oil tanker, baggage carts, a windsock and a plane wreck.
  - The cargo plane, a helipad with the Chinook, apron vehicles, pallets and boxes.
  - The industrial terminal with its lot, two tanks, a cargo district frontage (warehouses,
    quonsets, stores) and semi rigs.
- **Woods (`islandWilds`, after `fieldDressing`):** one story spot per 110 m forest cell where it
  fits. It is one of:
  - a lookout or a hunting stand;
  - a mossy log or log with a stump;
  - a campsite, or a hunters' camp (fire, tent, log);
  - a shed, or a cabin with its shed;
  - a rusty truck or a wreck.

  Boat wrecks lie on the beaches, and wrecks stand on the island road verges.
- **Lakes:** an old footbridge over half the island lakes.
- **`countryside`** no longer builds a site within 70 m of anyone else's building. The airfield's
  cargo district runs past its pad, and a cabin had landed inside a warehouse.
- **Countryside doors:** a countryside building whose doorway would be buried by its low-point pad
  (on a slope) is now left out. This happened to a farm barn once the sites shifted.

Island placement counts (z > 3350):

| Area | Placements |
|---|---|
| Village | 153 |
| Airfield | 276 |
| West Point | 14 |
| Countryside (woods, farms, verges) | 1068 |

## The terminal can be entered (`building-access-v4.json`)

- **Doors (3), each with a fitted door panel (`doors.v2`, 65 doors in all):**
  - the north entrance, up its porch steps;
  - the south entrance, up its porch steps;
  - a new east-wing door in the wing's south wall, with its own steps.
- **Cuts:**
  - each doorway;
  - the closet wall behind the north doorway, opened into the hall.

  Door heads are at least 1.95 m above the 0.9 m floor. The hull is 1.8 m tall, so a 1.8 m
  opening snagged on the lintel.
- **Loot:** 14 indoor spots in the terminal and 60 in the Superstore. The island's loot density is
  lower in the village (0.45) and the airfield (0.4). The extra buildings had pushed the match
  checkpoint past its size limit.

## Match checkpoint

The checkpoint stores ground loot as compact rows (`lootRows`: `[id, x, y, z, rest]`). The
island's extra loot had pushed it to 1.64 MB, over the test's 1.5 MB threshold (the Durable Object
limit is 2 MB). Restore still reads the old `loot` objects, so checkpoints written before the
change still restore.

## Cost (explorer, SwiftShader, 1280×720)

| View | Draw calls before → after | Triangles before → after |
|---|---|---|
| 12: Airfield apron | 116 → 186 | 665k → 809k |
| 14: Island village | 154 → 193 | 670k → 780k |
| 15: Airfield from the air | 118 → 180 | 600k → 749k |

The busiest view is still 9 (the Superstore car park), at 239 calls: about 24 new model types,
each drawn instanced.

## Checks

- `tests/br-island-polish.test.ts`:
  - village, West Point and airfield counts;
  - forest and verge dressing;
  - walks into the terminal through all three doors with the real movement code, to the 0.9 m
    floor.
- `tests/br-building-access.test.ts` walks every authored entrance at every island placement,
  both ways, including all the new frontage buildings.
- `br-models`: the total download limit is now 19 MB.
- Full BR suite: 40 files and 398 tests pass. The three-room load test's p99 is at its 12 ms limit
  on this machine (12.4 ms in one run, passing in the next).
