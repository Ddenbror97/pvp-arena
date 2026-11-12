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

## Street life (2026-11-12, CC BY 4.0)

Owner, 2026-11-12: "the maps feel empty ... objects to fill up the maps ... players can hide behind". The owner downloaded the models below on 2026-11-12 (Iron District's in `incoming/`, the shared ones in `art/blender/map06/incoming/`); every download's own `license.txt` was read before import. `props_assets.py` processes them, `props.py` places them (each enclosed by its collision boxes from `layout.py` STREET) and `../map06/merge_props.mjs` adds them to the map (`build_props.sh`).

| Asset                                | Source                                                                                                | Creator            | Licence   | Placement                                           | Optimisation                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------ | --------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Bistrot table and chair              | https://sketchfab.com/3d-models/bistrot-table-and-chair-11d695030f31413db0678c949832e0be              | IrisProcess        | CC-BY-4.0 | Café tables in the Old Market                       | Decimated 119k → 4.2k, its eight materials merged into four, 512 px                              |
| Outdoor Chair & Table                | https://sketchfab.com/3d-models/outdoor-chair-table-2ead6426d18f4f94ae53bfcb46bbb05b                  | Momo               | CC-BY-4.0 | A picnic table on the high street                   | Its colours moved into vertex colours (one material)                                             |
| Dumpster (Old and weathered)         | https://sketchfab.com/3d-models/dumpster-old-and-weathered-15e01b41d44f412a842cf393d4eb73ca           | thethieme          | CC-BY-4.0 | Dumpsters (lower yard, market street, upper lane)   | Scaled to 2 m, 512 px                                                                            |
| Low Poly Vespa                       | https://sketchfab.com/3d-models/low-poly-vespa-800e6eeece5848028b6a3fa6f2dfa8be                       | SergioCampos99     | CC-BY-4.0 | Scooters (high street, upper lane, lower mid)       | One of the two scooters, decimated to 35 %, its colours moved into vertex colours                |
| Old rubbish Skip                     | https://sketchfab.com/3d-models/old-rubbish-skip-2f9aa03ede3a46a0888e76fed382667f                     | Sousinho           | CC-BY-4.0 | A skip in the lower yard                            | Scaled to 3.6 m, 512 px                                                                          |
| Realistic Wooden Pallet (Low-Poly)   | https://sketchfab.com/3d-models/realistic-wooden-pallet-low-poly-83723a87b7d44bd296a3d7a750b2e781     | plank_de           | CC-BY-4.0 | Pallet stacks (Foundry court, rail yard)            | Four materials merged into one, 256 px                                                           |
| Wooden Cable Drum                    | https://sketchfab.com/3d-models/wooden-cable-drum-90120b2f0348407b8071577e85766827                    | Pixel Life         | CC-BY-4.0 | Cable drums (lower yard, rail yard, Police mid)     | Decimated 11.6k → 1.7k, 512 px                                                                   |
| Abandoned Car - BMW E30 Sedan        | https://sketchfab.com/3d-models/abandoned-car-bmw-e30-sedan-32498418a32d43a78d0847ce4c55fcb0          | ROH3D              | CC-BY-4.0 | A wrecked saloon on the upper lane                  | Decimated 13k → 5.9k, the number plate (the modeller's web address) painted blank, 1K; no badges |
| Modular Scaffolding Pack             | https://sketchfab.com/3d-models/modular-scaffolding-pack-8a072763269f4fdc95eb283a9bc7a88f             | Arsen Ismailov     | CC-BY-4.0 | A scaffold with tarps over lower mid's south facade | Assembled from its single-bay modules (low-detail LODs) and tarps, 512 px                        |
| Date palm and vegetation             | https://sketchfab.com/3d-models/date-palm-and-vegetation-734c4537ca8547209a54df49f134824a             | borsh_and          | CC-BY-4.0 | A date palm in the Old Market                       | Decimated, fronds below 2.35 m trimmed, 1K                                                       |
| Low Poly Palms Pack                  | https://sketchfab.com/3d-models/low-poly-palms-pack-bf1cadd21a704739bc19d535ae741728                  | Rusoski            | CC-BY-4.0 | Tall palms in Terrorist spawn                       | One palm, untextured fronds and bark tinted                                                      |
| Rubble Pile (Game Ready / 2K PBR)    | https://sketchfab.com/3d-models/rubble-pile-game-ready-2k-pbr-0e6f85da3433468db226866bd43a43e7        | Meerschaum Digital | CC-BY-4.0 | Rubble (lower mid, upper alley)                     | Decimated to 50 %, re-graded, 0.33 m                                                             |
| Lowpoly Air Conditioner Outdoor Unit | https://sketchfab.com/3d-models/lowpoly-air-conditioner-outdoor-unit-cbb20b6c0e0f4312bce9ceb0a6bedcd8 | l0wpoly            | CC-BY-4.0 | Air-conditioning units on facades                   | Label painted out, 256 px                                                                        |

Downloaded, reviewed, not used:

- Cast iron table and chair set (https://sketchfab.com/3d-models/cast-iron-table-and-chair-set-a42ba51cde634a05b5e5cc80ef2a5d4b, Truong Arch, CC-BY-4.0): 208k triangles, untextured black.
- Dumpster (low-poly, game-ready) (https://sketchfab.com/3d-models/dumpster-low-poly-game-ready-6caa33dd3ae6463ab4b60fb15e53e2e1, TampaJoey, CC-BY-4.0): two of its four bins carry real waste-company names.
- Scaffolding construction steel (https://sketchfab.com/3d-models/scaffolding-construction-steel-22a33921871448b09b3928a552340920, dchant design, CC-BY-4.0): one 35 m tower; the modular pack fits a facade.
- Brick Rubble Kit PBR Game Ready (https://sketchfab.com/3d-models/brick-rubble-kit-pbr-game-ready-5197c29d5f9542db8a766d8df70ed965, D3D, CC-BY-4.0): single bricks and wall fragments, no pile.
- Olive tree from Poly by Google (https://sketchfab.com/3d-models/olive-tree-from-poly-by-google-39777c8346aa4316b4addb9bb1a972c1, IronEqual, CC-BY-4.0): untextured, one flat grey material.

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
