# Project Island: the open country (2026-11-08)

Owner's request: "we need to upgrade the game dead space areas, like fields, to be more realistic
like mountains, rocks, you name it… research h1z1 the first map, that's the goal for our map".

This branch builds on `island-polish-2026-11-08`.

## Reference: H1Z1's first map

H1Z1 King of the Kill's map was reworked to fill its "barren regions" with places worth a detour:

- Hillside Villas;
- Morton Distribution (a crane and containers);
- Henninger Plaza;
- Coy's Car Salvage;
- Ponyvale Equestrian Estates;
- Emerald Hydra Site 7;
- a dam.

Between the towns it has relief and small story spots, so that crossing open ground is a series
of hops between cover. (Sources: PC Gamer's and TheSixthAxis's coverage of the King of the Kill
map updates.)

Our heightfield is gentle away from Iron Peaks, so relief comes from large rock models standing on
it. A new heightfield would move every building on the map.

## New models (CC BY 4.0, staged with `stage.py`, nothing run from the zips)

| Use | Kit ids |
|---|---|
| Relief | `crag` (Stránská skála, 68 m), `boulder-field` (a 110 m cliff and boulder field) |
| Boulders | `rock-tall`, `rock-grey`, `rock-cluster`, `river-rock-a` |
| Ruins | `abbey-ruins`, `arch-ruins` |
| Landmarks | `fire-lookout` (16 m), `pylon` (28 m high-voltage), `wind-pump` |
| Story spots | `ruined-cabin` (enterable, door fitted), `log-stack`, `log-pile-s`, `outhouse`, `excavator`, `rust-container`, `rail-tank`, `wreck-sedan` |

Left out:

| Model | Why |
|---|---|
| Union Pacific railroad car | A real railroad's name and logo on the car. |
| Beach rock formation | Its 8k atlas is lost in processing, leaving an untextured slab. |
| Rock Salines 2 | The scan is a thin crumpled shell, not a solid rock. |
| River rock B | The scan is a thin crumpled shell, not a solid rock. |
| Water tank tower | The tank itself is lost in processing; only the stairs remain. |

Also in the batch but unused: the second log pile pack, the duplicate container upload, and the
pieces of "Rocks set2" other than its cluster.

### Pipeline

- **`process_assets.mjs` `permissive`:** scanned rocks and ruins are cut into thousands of UV
  islands, and their seams stall the pipeline's meshoptimizer 0.22 at about 4× the budget. The
  oversized LOD0 then became an untextured grey silhouette.
  - `permissive` assets are reduced with meshoptimizer 1.1's `Permissive` flag, which collapses
    across seams and keeps the texture.
  - The 1.1 build is the one already in the game's lockfile (`node_modules/meshoptimizer`).
- **`build_collision.mjs` per-asset `voxel`:** a 110 m cliff voxelised at 0.3 m was 43k boxes.
  At 1.2 m it is 2.8k, and the crag at 0.8 m is 0.8k.

## Layout (`wildlands()` in `layout.ts`)

`wildlands()` runs after the countryside, before the `nature` scatter. The map is a grid of 300 m
cells, and each cell gets at most one story spot, picked by a hash and the ground at the cell:

| Ground | Story spots |
|---|---|
| Grass and fields (and rock) | crag (15 %) or cliff and boulder field (6 %), each ringed with boulders; up to four tries per cell |
| Any | boulder outcrop: a tall rock and 4–8 boulders (13 %) |
| Open ground, on the cell's highest point | the abbey walls and an arcade 30 m off, with boulders |
| Any, on the highest point | a fire lookout with its outhouse and log pile |
| Woods | a hunters' ruined cabin with an outhouse, log pile and campfire, kept clear of its two ways in |
| Woods and grass | a logging camp: log stacks, an excavator, a container, a stump |
| Fields and grass | a container cache with a wreck and drums, two stranded tank wagons, or a wind pump with hay |

Placement rules:

- **Nothing within reach of a POI, a town, a road, a bridge or a runway, nothing on water, and
  nothing over anything placed.** A 64 m footprint grid backs the overlap check, and `nature`
  now also keeps its boulders off the large footprints.
- **High-voltage lines:** three lines of pylons every 300 m from the Old Dam: towards Crossroads,
  Crossroads to Central Hospital, and across the south to the military base. A pylon that cannot
  stand moves up to 40 m along its line. `structures-renderer` wires them (four insulators, 5 m
  sag), as it does the road poles.
- **Wrecked sedans** stand on the mainland verges, about one per kilometre.

Map counts:

| Model | Count |
|---|---|
| Crags | 40 |
| Cliff fields | 12 |
| Tall rocks | 288 |
| Other new boulders | about 590 |
| Abbey ruins | 11 |
| Arcades | 8 |
| Fire lookouts | 31 |
| Ruined cabins | 8 |
| Log stacks | 73 |
| Excavators | 34 |
| Containers | 65 |
| Tank wagons | 9 |
| Wind pumps | 20 |
| Pylons | 23 |
| Verge wrecks | 43 |

## The ruined cabin can be entered (`building-access-v5.json`)

- **Ways in:**
  - its fallen south end is open;
  - its side doorway, 0.6 m between the logs, is widened to 0.95 m and gets a plank door
    (`doors.v3`, 66 doors).
- **Porch:** the porch's low roof beams lose their collision, so the porch can be walked.
- **Placement:** the cabin stands with its floor (0.31 m up its foundation logs) at the highest
  ground under it, so the terrain never shows through. It needs ground level within 0.3 m.
- **Loot:** residential, up to 4 items.
- **Walk tests:** `building-access-routes.json` walks both ways in at every placement, and at all
  four turns on flat ground.

The fire lookout is a landmark whose top cannot be reached yet: its stairs are thin switchbacks
that voxel collision does not make walkable. The rusted containers' open doors lead into a box too
narrow for the loot-spot grid, so they hold no loot for now.

## Revisions (cache safety)

The new models make a new runtime revision: `deadspace-v1`, then `building-access-v5`
(`models.access-v5.json`, `collision.access-v5.json`, `WORLD_ASSETS.revision
"building-access-v5"`). The door look is `doors.v3`. The v4 and `doors.v2` files stay for clients
still on the previous build. As before, deploy the site and the match Worker together.

Rebuild order:

```sh
node art/blender/br/process_assets.mjs <new ids>
node art/blender/br/build_collision.mjs
node art/blender/br/add_models.mjs models.walls-v3.json collision.access-v3.json deadspace-v1 <kit ids not in walls-v3>
node art/blender/br/repair_building_access.mjs art/br/building-access-v5.json
node scripts/br/doors/bake.mjs
```

## Cost (explorer, SwiftShader, 1280×720)

| View | Draw calls | Triangles |
|---|---|---|
| 8: Main river valley | 160 → 178 | 1.04M → 1.22M |
| 19: Crossroads junction | 185 → 209 | 1.16M → 1.39M |
| 31: Countryside from the air | 119 → 135 | 1.01M → 1.15M |
| 50–56: new open-country views | 108–160 | 0.5M–1.5M |

Collision boxes on the whole map: 0.94M. The match's static world builds in about 4.1 s for the
whole map.

The three-room load test's p99 tick is 12.5 ms on this machine both with and without this
branch: 12.53 ms here against 12.54 ms on `island-polish`, so the machine is loaded. The mean is
3.1 ms.

## Checks

- `tests/br-wildlands.test.ts`:
  - counts of each kind;
  - at least 20 % of the open grass and field cells hold a story spot;
  - nothing on the POI pads or on water;
  - pylons in wireable spans.
- `br-static-world`:
  - crags and cliff fields (`relief`) may sit up to 14 m into their slope, never floating;
  - nothing overlaps.
- `br-building-access` walks the ruined cabins.
- `br-models`: the download limit is now 22 MB, with 2.3 MB more of models.
