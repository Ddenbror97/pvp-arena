# Project Island: location audit and the new hospital (2026-11-09)

Branch `locations-2026-11-09`, from `main` after the release merge (#104, #105). Not merged.

## The requests

1. "Audit the following locations/city/neighborhoods, ensure nothing is missing, improve the
   location so it feels like a complete map. Find objects to download from Sketchfab: Millhaven,
   Crossroads, Central Hospital, Old Dam."
2. "Riverwood channel: one road still dead-ends at the water there with no bridge."
3. "Ensure the hospital is enterable and fun to play inside, should be like H1Z1/PUBG/Warzone's
   hospital but our own touch."

## The audit (before)

| Location | Found |
|---|---|
| Central Hospital | 126 placements on a 420 m pad: the main block (two floors open, one door), the campus wings, and big empty paved areas. |
| Millhaven | Labelled an industrial town, but its industry was two warehouse models repeated. |
| Crossroads | The junction town: houses, the truck stop and the farm market; no school. |
| Old Dam | The wall, the power station and bushes; nothing on the reservoir. |

## The Riverwood channel

This was already the case before the 11-05 merge. The build printed "no bridge (ends wet or no
channel)" for three spans. They were roads the tracer had followed along the bank into the
channel: no crossing at all. A bridge was refused because its end landed in the sea inlet beside
the channel.

**Fix (`build_world.py`):**

- `crosses_river`: a "crossing" running within 45° of the river is a bank road, not a bridge.
  Its road is cut out of the channel and the ends are joined or pruned by `connect_roads`.
- `extend_span`: a real crossing whose end lands in other water carries on to dry land.
- `WORLD_CROSSINGS`: Riverwood's road south over the channel, the sliver of land and the inlet
  to the East Works road. The new `river-bridge-6` is 205 m long with its deck at 6.6 m.

No "no bridge" warnings are left, and no country dead end is left by that channel.

## Downloads (CC BY 4.0, staged with `stage.py`)

| Use | Kit ids |
|---|---|
| Hospital rooms and field hospital | `stretcher`, `wheelchair`, `oxygen-tank`, `army-tent` (white ward tent), `medical-tent` (green, red cross) |
| Millhaven works | `factory-hall`, plus pieces of the industrial set we already had: `ind-warehouse-4`, `ind-warehouse-5`, `ind-smith`, `ind-loadbay`, `ind-tank-2`, `ind-substation` |
| Old Dam | `gantry-crane`, `buoy` |

**Not used:**

| Download | Why |
|---|---|
| American Diner | An interior diorama: booths and counter with only two walls, no outside. |
| Motel | Untextured: one flat grey material. |
| Low Poly Factory | An L-shaped block with a sawtooth hall and stacks: no single hall to fit out, and new buildings must be enterable. |

## The hospital (`art/br/fitout/locations.py` → `building-access-v9`)

The hospital is rebuilt from the original model (`source: original`), in the spirit of H1Z1's,
PUBG's and Warzone's hospitals: a block to fight through floor by floor, with many ways in and up.

- **Three storeys and the roof:** floors at 0.06, 7.2 and 13.8 m, roof at 20.4 m.
- **Four doors on the ground:** the main door, a back door and a door in each side.
- **Two switchback stair cores, one at each end,** from the ground to the second floor: never a
  single choke. Holes in the slabs give head room, with rails round them.
- **A third flight to the roof,** in the middle front room of the second floor, up into the
  raised front tower (the roof's stair house). Its door opens onto the roof, with the plant and
  the parapet.
- **The front's upper windows opened:** eight per floor, sightlines over the forecourt.
- **Ground floor:**
  - the lobby under a two-storey atrium;
  - the reception desk and waiting benches as cover;
  - five emergency bays behind half-height partitions.
- **First floor:** eight wards off a corridor round the atrium gallery, with rails along it.
- **Second floor:** four front rooms over the forecourt, back rooms, and the stair hall.
- **Our touch, a quarantine outbreak** (`locationsAudit` in `layout.ts`):
  - beds (stretchers), wheelchairs and oxygen in the bays and wards;
  - the forecourt a field hospital: ward and first-aid tents in rows, stretchers and oxygen
    between them, inside sandbag, barrier and wire lines, with a checkpoint at the gate;
  - a decontamination line in the courtyard between the wings, with ambulances backed up to it;
  - car parks with lot lines, cars and lamps.
- **Loot:** 30 items (16 before).

`building-access-routes.json` walks:

- every door in;
- both cores to the second floor;
- the full climb to the roof and out of the stair house's door;
- each at all four turns and at the real placement.

## The other locations

- **Millhaven:**
  - its industry palette now mixes the factory hall, foundry block and long warehouse with the
    old warehouses;
  - a works yard: the factory hall, the foundry, a loading shed, the gas holder, a substation,
    containers, forklifts and pallets.
  - The new halls are enterable: `shell()` gives each a hall, liners and a ceiling, and steel
    doors in its long sides. Loot: 5 each, warehouse class.
- **Crossroads:**
  - a school block (the junction town had none);
  - three rigs with reefer trailers parked behind the truck stop.
- **Old Dam:**
  - the power station's gantry crane over its yard, and a second transformer station;
  - a line of 31 buoys on the reservoir, 30 m upstream of the wall.

## Revisions

| Revision | What |
|---|---|
| `locations-v1` | The new models, via `add_models.mjs` from `access-v8`. |
| `building-access-v9` | The hospital and the works halls, on `locations-v1`. |
| `doors.v7` | 100 doors (84 before). |

Rebuild order:

```sh
node art/blender/br/process_assets.mjs <ids>
node art/blender/br/build_collision.mjs
node art/blender/br/add_models.mjs models.access-v8.json collision.access-v8.json locations-v1 \
  gantry-crane,stretcher,wheelchair,oxygen-tank,buoy,army-tent,medical-tent,factory-hall,ind-warehouse-4,ind-warehouse-5,ind-smith,ind-loadbay,ind-tank-2,ind-substation
python3 -I art/br/fitout/locations.py && node art/blender/br/repair_building_access.mjs art/br/building-access-v9.json
node scripts/br/doors/bake.mjs
python3 art/br/build_world.py && node scripts/br/bake-surface.mjs
```

## Checks

- **BR suite:** 49 files, 608 tests. All pass except the three-room load test (p99 tick over
  12 ms on this loaded machine, as on main).
- **`tsc`:** clean.
- **Downloads:** 29.4 MB for all models; the limit in `br-models` is now 30 MB. The crane's
  textures are capped at 512 px.
- **Interior review sheets:** the lobby, atrium, wards, windows, both cores, the stair room, the
  stair house and the roof.
