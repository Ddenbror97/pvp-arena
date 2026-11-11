# Iron District: asset manifest

The owner downloaded every source below on 2026-11-10. They live in `art/blender/iron-district/incoming/`,
which is gitignored. `art/blender/iron-district/assets.py` and `textures.py` turn them into the shipped
library and textures. Before anything was downloaded, each page was checked for three things: the
licence, that the model is free to download, and that there is no "NoAI" clause. Only CC BY 4.0 and
CC0 sources are used. The public credit lines ship as `public/fps/models/iron-district-credits.txt`.

## Sketchfab models (CC BY 4.0, attribution required)

| Asset                                                                     | Source                                                                                              | Creator                     | Source tris → shipped             | Textures shipped    | Placement                                                                                                                      | Optimisation                                                                               |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Forklift                                                                  | https://sketchfab.com/3d-models/forklift-d40cae50e04145dd997cdca415cd72ad                           | Mantas Stankaitis (mansta9) | 58k → 18.6k                       | one 1K colour atlas | A site, between the ladle and the container                                                                                    | 40 materials baked into one atlas on a fresh unwrap (Cycles), decimated to 32 %, recentred |
| Industrial Asset Pack (drums, gas cylinders, oil can, pallet, wooden box) | https://sketchfab.com/3d-models/industrial-asset-pack-0edba07309ef4ff98e5bb4d0b858952c              | vmatthew                    | 22.7k (pack) → 0.25–1.9k per prop | 512 atlas per prop  | Crate stacks (wooden box), drums and cylinders against foundry and yard walls, bins in the lower alley, the pallet in the yard | Split into separate props; multi-material props baked to one atlas                         |
| Low Poly Truck                                                            | https://sketchfab.com/3d-models/low-poly-truck-98826ebd44e2492298ac925461509216                     | Arifido._                   | 11.3k → 3.4k                      | one 512 atlas       | Lower yard (A main), lower mid                                                                                                 | Baked to one atlas                                                                         |
| French delivery van – Low poly model                                      | https://sketchfab.com/3d-models/french-delivery-van-low-poly-model-a350a422d200485ea57778dc42139edc | Daniel Zhabotinsky          | 7k → 7k                           | one 512 atlas       | B loading bay; the car on the high street                                                                                      | Baked to one atlas, rescaled to its collision boxes                                        |
| Mini Power Generator                                                      | https://sketchfab.com/3d-models/mini-power-generator-ee87e7cb81cb492d8caaf80d166ae7eb               | Jojomaster                  | 383k → 13.4k                      | one 512 atlas       | A site generator; the tunnel pump                                                                                              | Baked to one atlas, decimated to 3.5 %                                                     |
| Potted Plant                                                              | https://sketchfab.com/3d-models/potted-plant-7cd1246fe3a2423584b3463f102ff3cc                       | caridorka                   | 34.4k → 10.3k                     | one 512 atlas       | Balcony, apartment street, T spawn                                                                                             | Baked to one atlas, decimated to 30 %                                                      |
| Alcazar Garden Fountain                                                   | https://sketchfab.com/3d-models/alcazar-garden-fountain-f3b542ab6ae74abd996759ad4bab1bda            | Scaniverse                  | 386k → 10.8k                      | 1K colour           | B site fountain basin. The column and upper bowl are custom.                                                                   | Decimated to 2.8 %, fitted to the basin's collision box                                    |

**Not used: Sketchfab "Trash bin" (listed as CC BY by GooseCret).** The file was downloaded, but its
mesh is named `trashcan_indoor001a … lobby_fixtures002a`, which is a Source-engine asset name. The
upload's licence therefore cannot be trusted, so the model is never imported.

## Poly Haven models (CC0, no attribution required)

| Asset                       | Source                                              | Creator                       | Tris shipped              | Placement                            |
| --------------------------- | --------------------------------------------------- | ----------------------------- | ------------------------- | ------------------------------------ |
| Power Box 01                | https://polyhaven.com/a/power_box_01                | Rico Cilliers, Yann Kervran   | 7.4k (decimated from 21k) | Shipping hall wall                   |
| Utility Box 01              | https://polyhaven.com/a/utility_box_01              | James Ray Cock                | 4.4k                      | Annex wall, rail yard                |
| Utility Box 02              | https://polyhaven.com/a/utility_box_02              | James Ray Cock                | 6.3k                      | Police side                          |
| Modular Airduct Circular 01 | https://polyhaven.com/a/modular_airduct_circular_01 | Riley Queen                   | 14.3k                     | Ducts high on the shipping hall wall |
| Wooden Crate 02             | https://polyhaven.com/a/wooden_crate_02             | James Ray Cock, Jurita Burger | 5.2k                      | B loading bay                        |
| Barrel 03                   | https://polyhaven.com/a/barrel_03                   | Serhii Khromov                | 1.5k                      | Lower alley, market street           |
| Small Oil Can 01            | https://polyhaven.com/a/small_oil_can_01            | Raven van de Werken           | 3.3k (decimated from 17k) | Shipping hall                        |

**Processing.** The rig widgets and the armature were dropped, and the meshes are kept in rest pose.
The EXR normal, roughness and metal maps were converted to 8-bit PNG at 128–256 px, and the colour
maps resized to 512 px.

## Poly Haven textures (CC0)

| Texture                   | Source                                            | Used as                                          | Shipped                   |
| ------------------------- | ------------------------------------------------- | ------------------------------------------------ | ------------------------- |
| Cracked Concrete Wall     | https://polyhaven.com/a/cracked_concrete_wall     | Plaster, old town                                | 2K albedo, 512 normal/ORM |
| Large Sandstone Blocks 01 | https://polyhaven.com/a/large_sandstone_blocks_01 | Sandstone surrounds, plinths, steps              | 2K albedo                 |
| Rustic Stone Wall         | https://polyhaven.com/a/rustic_stone_wall         | Rubble stone walls, retaining walls, market hall | 1K                        |
| Patterned Plaster Wall    | https://polyhaven.com/a/patterned_plaster_wall    | Accent plaster                                   | 1K                        |
| Stone Tiles 02            | https://polyhaven.com/a/stone_tiles_02            | Slate flags (B site, T plaza, arcade)            | 1K                        |
| Cobblestone Floor 001     | https://polyhaven.com/a/cobblestone_floor_001     | Streets, alleys, the market lane                 | 1K                        |
| Red Bricks 04             | https://polyhaven.com/a/red_bricks_04             | Factory brick, the tunnel                        | 1K                        |
| Gravel Concrete 03        | https://polyhaven.com/a/gravel_concrete_03        | Concrete walls, plinths, the dock                | 1K                        |
| Concrete Pavement         | https://polyhaven.com/a/concrete_pavement         | Police spawn, lower mid                          | 1K                        |
| Damaged Concrete Floor    | https://polyhaven.com/a/damaged_concrete_floor    | A courtyard, boiler house, tunnel floor          | 1K                        |
| Garage Floor              | https://polyhaven.com/a/garage_floor              | Shipping hall, dock top                          | 1K                        |
| Asphalt 02                | https://polyhaven.com/a/asphalt_02                | Rail yard, lower yard, CT mid                    | 1K                        |
| Wood Planks               | https://polyhaven.com/a/wood_planks               | Apartment and market hall floors                 | 1K                        |
| Rusty Metal 03            | https://polyhaven.com/a/rusty_metal_03            | Yellow-painted steel (crane, press, catwalk)     | 1K                        |
| Rust Coarse 01            | https://polyhaven.com/a/rust_coarse_01            | Crucible, rail, wagon                            | 1K                        |

## Custom (made in this repository)

- **Procedural textures (`textures.py`).**
  - Terracotta roof tiles, painted wood and corrugated metal.
  - The facade trim atlas, shared with Sandgate.
  - `trim2`: steel factory windows and an arched window, wrought iron, catwalk grating, a lamp,
    the market awning, ivy and bougainvillea cards, a rusted warning sign, a faded poster with no
    text or brand, the tunnel lamp cage, a skylight, the mountain silhouette and a leaf clump.
  - The decal atlas: site letters, hazard lines, cracks, drains and stains.
- **Custom geometry (`build_iron_district.py`).**
  - Industrial pieces: the ladle crucible, the boilers, containers, jersey barriers, pallet racking
    and the ore wagon.
  - Market and street pieces: the market stalls with awnings, the fountain column and upper bowl,
    and lanterns.
  - Landmarks: the brick chimney, the lattice tower crane and the gantry crane over mid.
  - The tunnel's pipes, cable trays and lamps.
  - Every facade, roof and retaining wall.
- **Loading art.** The loading image (`src/assets/fps/iron-district-loading.webp`) was supplied by the
  owner.
