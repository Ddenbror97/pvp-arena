# Project Island: the mainland landmarks (2026-11-08)

## The request

The owner asked to "audit the rest of the map for missing objects/details to look like
h1z1/pubg/verdansk", then to build it.

The audit (project doc `map-audit-h1z1-pubg-verdansk-2026-11-08`) compared our map with:

- **Verdansk:** dam, port, train station, lumber yard, hospital, stadium, prison, junkyard,
  graveyard.
- **Erangel:** power plant, school, ruins, ferry pier, shooting range, rail lines.
- **H1Z1:** Morton Distribution, Coy's Car Salvage, Hillside Villas.

It found these gaps:

- no railway, port, power plant or hospital building;
- no school, sports ground, salvage yard or graveyard;
- military vehicles missing;
- town streets with only lamps.

This branch builds on `deadspace-2026-11-08`.

## New models (CC BY 4.0, staged with `stage.py`, nothing run from the zips)

| Use | Kit ids |
|---|---|
| Railway | `rail-track` (4 m section), `diesel-loco`, `boxcar`, `old-wagon`, `rail-depot`, `rail-crossing` |
| Port | `port-crane`, `cargo-ship`, `container-ship` |
| Power station | `brick-substation`, `transformer`, `transformer-kiosk`, `smoke-stacks` |
| Hospital and school | `hospital`, `school`, `basketball-hoop`, `bleacher`, `ac-units` |
| Salvage yard | `rust-sedan`, `crashed-truck`, `school-bus`, `scrap-pile`, `junk-pile` |
| Military | `tank`, `btr`, `ifv`, `range-target`, `range-booth`, `sat-dish` |
| Graveyards | `chapel`, `church-ruins`, `grave-row` |
| Streets | `traffic-signal`, `fire-hydrant`, `mailbox` |
| Quarry | `gravel-mound` |

Left out:

| Model | Why |
|---|---|
| Humvee | Untextured: a white body only. |
| Old Sawmill | A diorama: its yard, fences and ground are merged into the meshes. |
| Mansion 5 | A low-poly compound with no interior to enter. |
| Abandoned Gas Station | A 162-part scene. The towns' gas stations use the existing forecourt and its enterable shop instead. |
| Wooden Scaffolding | Not placed yet. |

### Pipeline

- **`process_assets.mjs` `zUp`:** for models exported with their height along z (the wagon,
  `zUp: -1`).
- **`repair_building_access.mjs`:** the material it creates for added floors and walls now has
  metallic 0. glTF's default of 1 rendered black with no environment map.
- **New revisions:** `landmarks-v1` and `building-access-v6` (`models.access-v6.json`,
  `collision.access-v6.json`), and the door look `doors.v4` (73 doors). The v5 and v3 files stay
  for clients on the previous build.

Rebuild order:

```sh
node art/blender/br/process_assets.mjs <ids>
python3 -I art/br/fitout/landmarks.py   # after resetting building-access-v6 from v5
node art/blender/br/build_collision.mjs
node art/blender/br/add_models.mjs models.walls-v3.json collision.access-v3.json landmarks-v1 <ids>
node art/blender/br/repair_building_access.mjs art/br/building-access-v6.json
node scripts/br/doors/bake.mjs
```

## Layout (`layout.ts`)

### `railways()`

The lines were chosen by scanning every 50 m row and column of the map for the longest stretch
clear of water, rivers, towns, POIs, bridges and buildings. Two lines came out:

- **Line A (z −1350):** from the west edge to a freight yard on Crossroads' western outskirts.
  It is 4 km long and rises only 17 m.
- **Line B (z 2350):** from beside the military base out past East Works.

Along them:

- **Track:** 2274 sections, with level-crossing signals where roads cross.
- **A stranded train on each line:** a locomotive, boxcars, a tank wagon and a wagon.
- **A freight yard at each line's end:** two sidings with wagons and a locomotive, the depot shed
  (enterable), containers, drums, pallets and a site office.

### `landmarks()`

- **Port at Fisher's Cove:**
  - two dockside cranes on the quay;
  - a container yard, stacked two high;
  - a coaster moored at the quay and a 150 m container ship at anchor in the bay.
- **Power station by the Old Dam**, where the pylon lines start:
  - the brick switch house (enterable), on ground level enough for its door;
  - transformers and kiosks;
  - smoke stacks, a site office and a fuel tank.
- **Central Hospital:**
  - the main block, enterable, with ambulances at its door;
  - roof plant.
- **Military base:**
  - motor pool: 4 tanks, 5 APCs and 9 IFVs;
  - a firing range east of the compound (six booths, targets);
  - three satellite dishes.
- **Car salvage yard** between Millhaven and Crossroads (H1Z1's Coy's Car Salvage):
  - four rows of wrecks stacked two or three high;
  - scrap and tyre piles, junk, a school bus and the office trailer.
- **Graveyards:**
  - a chapel's near Riverwood, the chapel enterable;
  - a ruined church's on a rise near Pine Ridge (Erangel's Ruins).

  Each has rows of graves.
- **Quarry:** gravel and spoil mounds by the quarry plant.

### Towns (`gridTown` features)

- **`schoolBlock`:** in Northstar and Millhaven. Each has the school, a basketball court with
  bleachers, school buses and staff cars.
- **`gasStation`:** forecourt, its shop, cars and a transformer kiosk, in Northstar, Millhaven and
  Riverwood.
- **Every town grid:**
  - traffic signals at about half the inner junctions (69);
  - fire hydrants at about two in three junctions (110);
  - a mailbox at the kerb of every house (1408).

### Footprints

The placers did not know the size of some big models: a 43 × 83 m clinic block, the military HQ,
barracks, tents, the portal crane, the radio mast, piers, awnings and the YC-130. The hospital
first landed against the clinic. Their real footprints are now in `FOOT`.

## Enterable, with doors (`art/br/fitout/landmarks.py` → `building-access-v6.json`)

The downloaded shells are exterior-only. Their walls are invisible from inside and trees could
grow in them. Each building gets:

- a ground slab (also the trees' clearing);
- liner walls just inside the shell, and a ceiling;
- slabs, stairs and an opening over the stairs for upper floors;
- doorways cut through the shell, each with a door panel that opens.

| Building | Inside |
|---|---|
| Hospital | Two storeys. The main door is in the south entrance bay. A corridor wall with five doorways on each floor, rooms upstairs, and stairs along the west wall with a rail at the top. |
| School | The classroom block's ground and first floors: a corridor and classrooms, the main door in the south facade, stairs at the east end. The 8 m gym annex is entered through its own east door, up steps. The covered walkway between them stays shut: its 2.4 m ceiling leaves no head room over the annex's raised floor. |
| Rail depot | One hall, with an open engine portal and a personnel door. |
| Brick switch house | One room, with a door in its south wall. |
| Chapel | The nave. Its narrow door is widened to 1.4 m. |

`building-access-routes.json` walks every way in, and both staircases to the upper floor, at
every placement on the map and at all four turns on flat ground.

**Loot:**

| Building | Items |
|---|---|
| Hospital | 16 |
| School | 16 |
| Rail depot | 6 |
| Switch house | 3 |
| Chapel | 3 |

## Cost (explorer, SwiftShader, 1280×720)

| View | Draw calls |
|---|---|
| 19: Crossroads | 209 → 224 |
| 9: Superstore car park | 239 → 262 |
| New landmark views | 149–226 |

- **Downloads:** all models together grew by about 3.9 MB, to 25.9 MB (the limit in
  `br-models` is now 26.5).
- **Map:** 33,000 placements.
- **The three-room load test:** its p99 tick is 14.1 ms on this branch and 13.8 ms on
  `deadspace` in back-to-back runs on this machine. The machine is loaded, and both are over the
  12 ms threshold. The mean is 3.5 ms.

## Checks

- Full BR suite: 41 files and 442 tests. All pass except the three-room load test (above).
- `br-static-world`:
  - Placements stacked on another (containers on the quay, wrecks at the salvage yard) are not
    held to the terrain.
  - Rail placements may bridge a dip of up to 1.3 m.
