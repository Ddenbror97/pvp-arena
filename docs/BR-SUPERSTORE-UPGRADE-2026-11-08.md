# Project Island: Superstore grounds upgrade (2026-11-08)

Owner's request: "Upgrade the superstore island. It looks too flat and has dead space. Find 20-30
more 3D models… Around the superstore and the parking lot need to be improved."

## New models (30 Sketchfab downloads, all CC BY 4.0)

- **Staging and licences:** each download was staged with `art/br/assets/stage.py`. Nothing from
  the zips was run. Licences were checked by `inventory.py`, which writes `inventory.json`,
  `INVENTORY.md` and `ATTRIBUTION.md`.
- **Kit entries:** in `art/br/assets/kit.json`.
- **Processing:** `process_assets.mjs` built three LODs and `build_collision.mjs` built the
  collision.
- **Credits:** one line per model in `public/fps/br/models/ATTRIBUTION.md`.

| Use | Models (kit ids) |
|---|---|
| Car park | `shop-cart`, `cadillac`, `cargo-van`, `burned-car-b`, `crashed-car`, `burned-police-a`, `burned-police-b`, `wreck-bus`, `ambulance`, `tow-truck` |
| Store front | `propane-cage`, `ice-machine`, `atm`, `news-box`, `wall-barrier`, `road-barrier`, `cone`, `traffic-drum` |
| Filling station | `gas-forecourt` (canopy, two pillars, four pumps and two islands, cut out of the "Gas station" scene), `fuel-pump`, `propane-tank`, `tires`, `oil-drums` |
| Works yard | `chainlink`, `con-pipe`, `con-pipe-long`, `cable-reel`, `pipe-stack`, `cement-pallet`, `plank-stack`, `porta-potty`, `awning`, `box-truck` |
| Truck stop and service yard | `semi-cab`, `reefer-trailer`, `box-truck`, `trash-bags` |

These are processed but not placed, so they cost nothing at run time:

- `burned-car-a`, `delineator`, `warning-sign`, `con-pyramid`, `barricade`, `fence-barrier`;
- `barrier-set`: jersey barriers do the job and add no new draw call.

These were left out:

- **Outdoor Vending Machines:** real Coca-Cola logos on the textures.
- **Generator LP:** a real brand on the casing, and the reduced LODs fell apart.
- **Warehouse Storage Racking:** the LOD1 and LOD2 reductions lost the shelves. The existing
  `warehouse-rack` stays.
- **Tree Planter with Grate:** an empty tree pit. The island's trees come from the vegetation
  system, so it would have stayed empty.
- **"Concrete Barrier / Drum Barrel / Fences":** kept only as the unused `barrier-set`. Its parts
  are scattered over about sixty nodes at 1/100 scale.

## Pipeline changes

- **`process_assets.mjs`:**
  - `piece` takes a list of node names. This is how the forecourt is cut out of a whole scene.
  - Per-asset `keepTextures`: the chain-link fence keeps its alpha texture at every LOD. The
    untextured far LOD would otherwise be a solid black panel.
- **`art/blender/br/add_models.mjs`:** copies newly processed models into a new runtime
  revision, without re-deriving the building-access and wall repairs:
  ```sh
  node art/blender/br/add_models.mjs models.walls-v3.json collision.access-v3.json superstore-v1 <ids>
  ```
- **World revision:** now `superstore-v1` (`models.superstore-v1.json` and
  `collision.superstore-v1.json`). As before, deploy the site and the match Worker together.
- **New draw rings in `props-renderer.ts`.** Both are fixed, the same for every player.

  | Ring | Covers | Draws |
  |---|---|---|
  | `detail` | Cones, bin bags, trolleys, pallets of cement, plank stacks | LOD0 to 25 m, LOD1 to 150 m, nothing beyond |
  | `clutter` | Knee- to head-high yard props | LOD0 to 25 m, LOD1 to 400 m |

  Neither ring ever uses the untextured LOD2. Each LOD level drawn costs one draw call per model.

## Layout (`superstore()` and `superstoreDressing()` in `layout.ts`)

Coordinates are relative to the store, which is 150 × 83 m. The loop road runs at x ±96 and at
z −96 and +64.

- **Car parks:**
  - The bays now hold old sedans, burned-out cars and the three car types.
  - A corral of five nested trolleys stands in about a quarter of the modules.
  - Trolleys are left in the aisles.
  - Crash scenes sit across the aisles: burned police cars, a crashed car, an ambulance and a tow
    truck, with cones and barriers.
  - A wrecked bus blocks a north aisle.
  - Jersey roadblocks stand on the axis road.
- **Store front:**
  - Propane cages, ice chests, cash machines and newspaper boxes along the facade.
  - A T-wall checkpoint across the fire lane, either side of the doors.
  - A burned police car.
- **West pad** (was empty):
  - A filling station with its shop (`rural-store-1`, enterable, door facing the pumps), a van
    and a wreck at the pumps, propane, the tow truck and a tyre pile.
  - A chain-link works yard, 86 × 42 m with three gates: concrete pipes to hide in, cable reels,
    pipe stacks, cement, timber, toilets, a tarp shelter and a box truck.
  - A wrecked bus with burned cars.
  - A column of overflow parking.
- **East pad** (was empty):
  - A truck stop: six reefer trailers (three with their tractors) and five dropped trailers.
  - Box trucks.
  - An ambulance crash scene.
  - Six more car park modules.
  - A row of tarp market awnings.
- **Service yard:**
  - Reefer trailers backed onto the docks, one with its tractor.
  - A box truck, bin bags at the dumpsters, drums, tyres and propane.
  - Toilets and a shelter.
  - A chain-link fence along the loop road, with gates at the axis road and either side.

`node scripts/br/map-audit/run.mjs superstore-overlaps` lists props whose footprints intersect.
The only overlaps are deliberate: things under the awnings and the forecourt canopy. The others
predate this work: the store's own shelving and two trash cans at the shop rows.

## Cost (explorer, SwiftShader, 1280×720)

| View | Draw calls before → after | Triangles before → after |
|---|---|---|
| 7: Superstore pad | 151 → 194 | 772k → 845k |
| 9: Superstore car park | 166 → 219 | 915k → 1.06M |
| 13: Superstore from the air | 134 → 163 | 727k → 762k |

The busiest other view on the island is 19 (Crossroads junction): 185 calls and 1.17M triangles.
The extra calls come from about 35 new model types, each drawn instanced: one call per model per
LOD level in view. Instance counts do not add calls. Trolleys and cones are near-only, and the
yard clutter never draws its far LOD.

To cut calls further, the next step is fewer distinct model types or a batched-mesh prop
renderer.
