# Project Island asset inventory

Generated 2026-11-12T08:10:56-03:00 by `art/br/assets/inventory.py` (tool v3). Rerun: `python3 -I art/br/assets/inventory.py --out art/br/assets` (incremental; cached by zip sha256).

## Summary

| | |
|---|--:|
| Zip files scanned (present now) | 526 |
| Unique assets | 483 |
| Licence OK / REVIEW / REJECT | 463 / 11 / 9 |
| Assets with duplicate zips | 30 (36 extra files) |
| Over budget (tris, per-piece, texture px or draws) | 254 |
| Needs conversion (no glTF) | 1 |
| Unparseable zips | 7 |
| On the asset list: arrived / not yet | 132 / 1 (list has 133 items) |
| Not on the asset list | 345 |
| Assets first seen in batch 2026-11-12 (today) | 3 |
| Assets first seen in batch 2026-11-11 | 73 |
| Assets first seen in batch 2026-11-10 | 1 |
| Assets first seen in batch 2026-11-09 | 53 |
| Assets first seen in batch 2026-11-08 | 118 |
| Assets first seen in batch 2026-11-04 | 58 |
| Assets first seen in batch 2026-11-03 | 142 |
| Assets first seen in batch 2026-11-02 | 30 |
| Assets first seen in batch 2026-11-01 | 5 |

### Worst budget offenders

| Asset | Area | Cat | Tris | Over by | Suggested action |
|---|---|---|--:|--:|---|
| Massive Industrial Mining Scene | not on list | prop | 2999.8k | 200.0x | decimate to 15k (heavy: 200x) or reject; atlas materials (38 draws to ≤12); check scale (largest side 131 m; x0.01 would give 1.31 m); downscale textures to 1K |
| Steinbruch Aumühle, Nördlinger Ries, Germany | not on list | prop | 1471.3k | 98.1x | decimate to 15k (heavy: 98x) or reject; atlas materials (52 draws to ≤12); downscale textures to 1K |
| arroka, lurra, elurra | not on list | prop | 1353.0k | 90.2x | decimate to 15k (heavy: 90x) or reject; downscale textures to 1K |
| Gravel Macro \| Tile Texture | not on list | prop | 1032.5k | 68.8x | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K |
| Loose Sand \| Tile Texture | not on list | prop | 1032.5k | 68.8x | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K |
| Rock \| Tile Texture | not on list | prop | 1032.5k | 68.8x | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K |
| Straw Soil \| Tile Texture | not on list | prop | 1032.5k | 68.8x | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K |
| Straw \| TIle Texture | not on list | prop | 1032.5k | 68.8x | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K |
| Entry to the Theresia mine, Morshausen, Germany | not on list | prop | 556.9k | 37.1x | decimate to 15k (heavy: 37x) or reject; check scale (largest side 150 m; x0.01 would give 1.5 m); downscale textures to 1K |
| Quartzites rockface - Drone photogrammetry | not on list | prop | 417.7k | 27.9x | decimate to 15k (heavy: 28x) or reject; check scale (largest side 216 m; x0.01 would give 2.16 m); downscale textures to 1K |
| Forest Ground \| Tile Texture | not on list | tree | 258.4k | 25.8x | reject for mass instancing (26x) / hero tree only; instance (InstancedMesh); downscale textures to 1K |
| Abandoned Shack in the Swamp | not on list | prop | 357.2k | 23.8x | decimate to 15k (heavy: 24x) or reject; atlas materials (16 draws to ≤12); downscale textures to 1K |

Most draw calls (primitive uses; atlas/merge before use):

- Realtime Grass: 2013 draws, 4 materials
- Gas station: 991 draws, 63 materials
- Beauharnois Dam: 779 draws, 16 materials
- GORE BAY AIRPORT CYZE TERMINAL BUILDING: 771 draws, 37 materials
- Abandoned House: 644 draws, 1 materials
- Industrial\_Silo: 591 draws, 2 materials
- Brooklyn Street Row Buildings Low Poly: 415 draws, 1 materials
- Family House: 414 draws, 32 materials

Heaviest textures (uncompressed RGBA + mips):

- Free AC Unit: 1958 MB, 23 images, max 4096 px
- Massive Industrial Mining Scene: 1702 MB, 5 images, max 8192 px
- The Prison: 1609 MB, 75 images, max 4096 px
- Abandoned Cabin Environment: 1532 MB, 18 images, max 4096 px
- Construction Site Asset Pack: 1516 MB, 87 images, max 2048 px
- Breakwater coast: 1021 MB, 3 images, max 8192 px
- Cliff Rock Boulder Field: 1021 MB, 3 images, max 8192 px
- Coastal Ground Cliff Rocks: 1021 MB, 3 images, max 8192 px

### Budget heuristics

- **prop** (small props): > 15k triangles, or any texture > 2048 px (downscale to 1K), or > 12 draws.
- **building**: > 60k triangles. **vehicle** (vehicles/aircraft): > 80k triangles. Textures > 2048 px -> 2K.
- **tree**: any single tree (top-level piece under the Sketchfab root wrappers) > 10k triangles is a problem for instancing thousands.
- **kit / building-kit** (packs with several top-level pieces): budget applied per piece (15k / 60k); kit total > 250k noted; > 12 materials -> atlas.
- Any model with > 12 draw calls (primitive uses) -> atlas materials. Texture MB = w·h·4·1.33 (RGBA + mips), summed over the glTF's images; over 24 MB (prop/tree) or 96 MB (building/vehicle) is noted.
- Triangles are counted as rendered by the default scene (each node use of a mesh counts), mode 4 only. Sizes are metres after all node transforms (Sketchfab root rotation/scale included), glTF Y-up.
- SCALE? = largest side (per piece for kits/trees) outside a plausible range for the category (prop 0.05-40 m, building 1-400 m, vehicle 0.5-100 m, tree 0.5-60 m). Many Sketchfab FBX exports are in centimetres or arbitrary units; verify in Blender before fixing.
- SPEC-GLOSS = uses KHR_materials_pbrSpecularGlossiness, which three.js (repo uses 0.186) no longer loads; re-export as metal/rough.
- Category is guessed from the title and list area; override in `CATEGORY_OVERRIDES` in the script. Ratios > 6x on buildings/vehicles suggest hero-only or reject.
- Licence: OK only for CC BY (any version) and CC0/public domain. NC, ND, Editorial, Standard/paid -> REJECT; SA, missing or unrecognised -> REVIEW.

⧉ = asset arrived in more than one zip (see Duplicates). Batch = date (MM-DD) the first copy's file was saved.

## Deployment and airdrops

Grid Off-map · sky. Arrived 7, not yet 0.

| Name | Author | Licence | Cat | Tris | Draws | Max tex | Tex MB | Size m (x×y×z) | Flags | Suggested action | Batch |
|---|---|---|---|--:|--:|--:|--:|---|---|---|---|
| Army Parachute | amaraklov | OK | prop | 17.8k | 1 | 4096 | 340 | 1.35×2×1.35 | TRIS>15k (1.2x), TEX 4096px, TEXMB 340 | decimate to 15k; downscale textures to 1K | 11-03 |
| C17 Plane Game-Ready | HaVe | OK | vehicle | 39.1k | 2 | 2048 | 64 | 60.2×19.3×60.9 | - | use as-is | 11-03 |
| Cargo Crate | boysichterman | OK | prop | 1.7k | 1 | 2048 | 64 | 50×50×151 | SCALE? 151 m, TEXMB 64 | check scale (largest side 151 m; x0.01 would give 1.51 m); downscale textures to 1K | 11-03 |
| Lockheed Martin C130J"Super Hercules" (REUPLOAD) | KOG\_THORNS | OK | vehicle | 84.0k | 66 | 2048 | 101 | 801×238×598 | TRIS>80k (1.1x), DRAWS 66, SCALE? 801 m, TEXMB 101 | decimate to 80k; atlas materials (66 draws to ≤12); check scale (largest side 801 m; x0.01 would give 8.01 m); downscale textures to 2K | 11-03 |
| Military crate (game ready with open system) | Killian\_Delias | OK | prop | 4.3k | 2 | 2048 | 64 | 165×178×301 | SCALE? 301 m, TEXMB 64 | check scale (largest side 301 m; x0.01 would give 3.01 m); downscale textures to 1K | 11-03 |
| Parachute Simple | sxnneh | OK | prop | 580 | 1 | 512 | 1 | 7.14×6.36×3.54 | - | use as-is | 11-03 |
| YC-130(Prototype of C-130) | KOG\_THORNS | OK | vehicle | 12.9k | 25 | 2048 | 65 | 39.8×12×28.9 | DRAWS 25 | atlas materials (25 draws to ≤12) | 11-03 |

## Southern Military Base and island airfield

Grid F–G7 · H–I9. Arrived 22, not yet 0.

| Name | Author | Licence | Cat | Tris | Draws | Max tex | Tex MB | Size m (x×y×z) | Flags | Suggested action | Batch |
|---|---|---|---|--:|--:|--:|--:|---|---|---|---|
| Air Traffic Control Tower | abass20 | OK | building | 5.2k | 21 | 4096 | 340 | 23×90.2×23 | DRAWS 21, TEX 4096px, TEXMB 340 | atlas materials (21 draws to ≤12); downscale textures to 2K | 11-03 |
| Barrier \_ Wooden\_ Barbed\_ Wire Protection\_13\_MB | Mehdi Shahsavan | OK | prop | 1.1k | 1 | 2048 | 48 | 5.16×1.69×1.57 | TEXMB 48 | downscale textures to 1K | 11-03 |
| Boeing CH-47 Chinook Military Transport Aircraft | Muhamad Mirza Arrafi | OK | vehicle | 15.4k | 8 | 2048 | 45 | 213×77.2×313 | SCALE? 313 m | check scale (largest side 313 m; x0.01 would give 3.13 m) | 11-03 |
| Broadcast tower (Game ready) | PT34 | OK | building | 13.8k | 2 | 2048 | 128 | 324×1.66e+03×328 | SCALE? 1.66e+03 m, TEXMB 128 | check scale (largest side 1.66e+03 m; x0.01 would give 16.6 m); downscale textures to 2K | 11-03 |
| Checkpoint Building | tylerlherring | OK | building | 506 | 4 | 2048 | 64 | 2.62×1.2×2.38 | - | use as-is | 11-03 |
| Flood Light | HippoStance | OK | prop | 4.7k | 1 | 1024 | 21 | 0.167×0.154×0.254 | - | use as-is | 11-03 |
| Guard Tower \[Free Asset\] | Lex713 | OK | building | 2.3k | 12 | 1024 | 21 | 3.71×7.12×3.38 | - | use as-is | 11-03 |
| Hangar | thetrady | OK | building | 116.5k | 11 | - | 0 | 62.4×12.7×62.4 | TRIS>60k (1.9x) | decimate to 60k | 11-03 |
| Hangar ⧉ (name match only: different Sketchfab model) | Matvis | OK | building | 4.3k | 2 | - | 0 | 43.7×5.55×43.7 | - | use as-is | 11-08 |
| Heliport Helipad air base helicopter | ahmagh2e | OK | building | 30.9k | 1 | 2048 | 85 | 1.35e+03×300×1.24e+03 | SCALE? 1.35e+03 m | check scale (largest side 1.35e+03 m; x0.01 would give 13.5 m) | 11-03 |
| Hesco Barrier (name match only: different Sketchfab model) | endbored | OK | prop | 19.0k | 7 | 4096 | 426 | 2.08×2×2.08 | TRIS>15k (1.3x), TEX 4096px, TEXMB 426 | decimate to 15k; downscale textures to 1K | 11-02 |
| Hesco Barrier | Aidan Callaghan | OK | prop | 24.8k | 2 | 2048 | 106 | 1.15×1.22×1.13 | TRIS>15k (1.7x), TEXMB 106 | decimate to 15k; downscale textures to 1K | 11-03 |
| j type hanger | ElectricLeo | OK | building | 8.1k | 2 | 1024 | 5 | 61.9×19.3×89.9 | - | use as-is | 11-03 |
| Large militery tent | challe3d | OK | building | 7.0k | 5 | 2048 | 176 | 2×0.635×1.42 | TEXMB 176 | downscale textures to 2K | 11-03 |
| Military Buildings, Modular Kit Low poly | Free Models. | OK | building-kit | 13.5k (14 pcs, max 10.4k) | 32 | 1024 | 17 | 67×12×39.7 | - | use as-is | 11-03 |
| Military HQ Building with 3 Interiors | 3RDimens | OK | building | 9.2k | 74 | 1024 | 160 | 40.2×8.92×33.7 | DRAWS 74, TEXMB 160 | atlas materials (74 draws to ≤12); downscale textures to 2K | 11-03 |
| Military Style Building (with animations) | TampaJoey | OK | building | 16.8k | 29 | 1024 | 426 | 11.8×5.99×19.6 | DRAWS 29, SKINNED, ANIM 6, TEXMB 426 | atlas materials (29 draws to ≤12); downscale textures to 2K | 11-03 |
| Renault TRM Radar Truck | Muhamad Mirza Arrafi | OK | vehicle | 21.5k | 8 | 2048 | 107 | 595×855×1.03e+03 | SCALE? 1.03e+03 m, TEXMB 107 | check scale (largest side 1.03e+03 m; x0.01 would give 10.3 m); downscale textures to 2K | 11-03 |
| Runway and Hangar | Derek.Dziedzic | OK | building | 41.8k | 9 | 2048 | 218 | 31.9×9.51×57.1 | TEXMB 218 | downscale textures to 2K | 11-03 |
| Rusty airbase fuel tank | LuddePudde | OK | prop | 2.5k | 1 | 4096 | 255 | 1.72×1.09×2 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-03 |
| Sandbag Barrier (Ready for Unreal Engine) | G4AGamingLabs | OK | prop | 20.0k | 1 | 2048 | 64 | 4.59×1.03×0.739 | TRIS>15k (1.3x), TEXMB 64 | decimate to 15k; downscale textures to 1K | 11-03 |
| Sandbags | Evan | OK | prop | 5.8k | 1 | 2048 | 64 | 9.1×1.22×10.2 | TEXMB 64 | downscale textures to 1K | 11-03 |
| Tent\_Military | Mehdi Shahsavan | OK | building | 38.5k | 2 | 2048 | 53 | 11.2×4×10.5 | - | use as-is | 11-03 |
| Watchtower | adventurer | OK | building | 2.1k | 1 | 2048 | 64 | 148×300×148 | - | use as-is | 11-03 |

## Island Superstore

Grid E–F9. Arrived 12, not yet 0.

| Name | Author | Licence | Cat | Tris | Draws | Max tex | Tex MB | Size m (x×y×z) | Flags | Suggested action | Batch |
|---|---|---|---|--:|--:|--:|--:|---|---|---|---|
| Big Box Store | hnanw | OK | building | 132.1k | 22 | 1024 | 11 | 96.2×13.8×53.3 | TRIS>60k (2.2x), DRAWS 22 | decimate to 60k; atlas materials (22 draws to ≤12) | 11-03 |
| Billboard (.psd layered texture maps included) | TampaJoey | OK | prop | 11.2k | 3 | 1024 | 16 | 8.15×7.43×4.4 | - | use as-is | 11-03 |
| Cardboard Box Set- Low Poly | Pixel\_Monster | OK | prop | 110 | 1 | 1024 | 16 | 1.54×0.71×1.1 | SPEC-GLOSS | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension) | 11-03 |
| Forklift low poly | Ricardo Sanchez | OK | vehicle | 4.4k | 1 | 1024 | 16 | 118×212×371 | SCALE? 371 m | check scale (largest side 371 m; x0.01 would give 3.71 m) | 11-03 |
| Low Poly \| Dumpsters | Den1121 | OK | prop | 6.3k | 14 | 4096 | 511 | 4.98×2.28×2.1 | DRAWS 14, TEX 4096px, TEXMB 511 | atlas materials (14 draws to ≤12); downscale textures to 1K | 11-03 |
| Low Poly \| Pallets ⧉ | Den1121 | OK | kit | 1.8k (4 pcs, max 912) | 4 | 2048 | 64 | 2.43×0.962×3.72 | - | use as-is | 11-03 |
| Modular Shelves | billionlioe | OK | kit | 6.2k (31 pcs, max 252) | 62 | 1024 | 28 | 101×166×668 | - | use as-is | 11-03 |
| pallet truck | Kwon\_Hyuk | OK | prop | 4.5k | 1 | 2048 | 64 | 473×349×171 | SCALE? 473 m, TEXMB 64 | check scale (largest side 473 m; x0.01 would give 4.73 m); downscale textures to 1K | 11-03 |
| Parking Lot UF | hkang2 | OK | kit | 51.5k (7 pcs, max 25.0k) | 48 | 4096 | 70 | 10.3×1.83×7.23 | PIECE>15k (1.7x), MATS 21, TEX 4096px | decimate heavy pieces to 15k; atlas materials across kit (21 materials); downscale textures to 1K | 11-03 |
| Shopping Trolley | MehraN | OK | prop | 35.8k | 1 | 2048 | 64 | 0.433×1.05×0.896 | TRIS>15k (2.4x), TEXMB 64 | decimate to 15k; downscale textures to 1K | 11-03 |
| Store Shelves | Peter\_D | OK | prop | 81.1k | 24 | 1024 | 20 | 0.733×1.37×3.95 | TRIS>15k (5.4x), DRAWS 24 | decimate to 15k; atlas materials (24 draws to ≤12) | 11-03 |
| Warehouse Shelving Unit | jimbogies | OK | prop | 424 | 3 | 2048 | 35 | 36.9×133×91.8 | SCALE? 133 m, TEXMB 35 | check scale (largest side 133 m; x0.01 would give 1.33 m); downscale textures to 1K | 11-03 |

## Redstone Quarry, Millhaven industry, container yards

Grid H–I2 · C3–4. Arrived 17, not yet 0.

| Name | Author | Licence | Cat | Tris | Draws | Max tex | Tex MB | Size m (x×y×z) | Flags | Suggested action | Batch |
|---|---|---|---|--:|--:|--:|--:|---|---|---|---|
| Abandoned factory | Rixael | OK | building | 100.2k | 362 | 1024 | 13 | 10.2×5.42×13.2 | TRIS>60k (1.7x), DRAWS 362 | decimate to 60k; atlas materials (362 draws to ≤12) | 11-03 |
| Chemical tank ⧉ | ixMkc1 | OK | prop | 8.7k | 1 | 2048 | 64 | 2.74×5.69×6.21 | TEXMB 64 | downscale textures to 1K | 11-03 |
| Classic Shipping Container (Free/Gameready) | Sebastian Webster | OK | prop | 17.1k | 1 | 2048 | 64 | 5.85×2.34×2.95 | TRIS>15k (1.1x), TEXMB 64 | decimate to 15k; downscale textures to 1K | 11-03 |
| Dump Truck | ElectroNick | OK | vehicle | 34.3k | 6 | 1024 | 20 | 2.17×2.3×5.82 | - | use as-is | 11-03 |
| Generic Water Tower \[Free Asset Pack\] | Lex713 | OK | building-kit | 38.6k (36 pcs, max 2.8k) | 36 | 1024 | 32 | 71.2×43.5×11.2 | - | use as-is | 11-03 |
| Industrial asset pack (Free) | ForevereQ | OK | kit | 64.2k (43 pcs, max 8.0k) | 54 | 2048 | 161 | 12×9.9×49.4 | MATS 15, TEXMB 161 | atlas materials across kit (15 materials); downscale textures to 1K | 11-03 |
| Industrial Buildings Set - Low poly models ⧉ | Daniel Zhabotinsky | OK | building-kit | 30.6k (30 pcs, max 3.6k) | 49 | 2048 | 391 | 427×90.6×345 | MATS 13, TEXMB 391 | atlas materials across kit (13 materials); downscale textures to 2K | 11-03 |
| Ladder, Railing and Flood Light Kit (name match only: different Sketchfab model) | DudleyLong | OK | prop | 2.6k | 17 | 2048 | 64 | 543×192×200 | DRAWS 17, SCALE? 543 m, TEXMB 64 | atlas materials (17 draws to ≤12); check scale (largest side 543 m; x0.01 would give 5.43 m); downscale textures to 1K | 11-11 |
| Ladder, Railing and Flood Light Set Up | DudleyLong | OK | prop | 10.7k | 86 | 2048 | 64 | 952×691×256 | DRAWS 86, SCALE? 952 m, TEXMB 64 | atlas materials (86 draws to ≤12); check scale (largest side 952 m; x0.01 would give 9.52 m); downscale textures to 1K | 11-03 |
| Large Industrial Storage Tanks | Duane's Mind | OK | building-kit | 9.8k (28 pcs, max 2.4k) | 43 | 1024 | 43 | 28.4×14.4×34.5 | - | use as-is | 11-03 |
| Low Poly Container Yard | Designed By Jonathan | OK | building-kit | 21.8k (7 pcs, max 4.6k) | 7 | 1024 | 27 | 331×173×390 | - | use as-is | 11-03 |
| Lowpoly Construction Vehicles Set | kyuandzo | OK | vehicle-kit | 137.8k (21 pcs, max 22.8k) | 60 | - | 0 | 40.5×4.07×37.2 | - | use as-is | 11-03 |
| Quarry Conveyor system Kit ⧉ | DudleyLong | OK | prop | 37.8k | 72 | 2048 | 192 | 2.09e+03×493×680 | TRIS>15k (2.5x), DRAWS 72, SCALE? 2.09e+03 m, TEXMB 192 | decimate to 15k; atlas materials (72 draws to ≤12); check scale (largest side 2.09e+03 m; x0.01 would give 20.9 m); downscale textures to 1K | 11-03 |
| Railway tank | Dmitriev Nikita | OK | vehicle | 45.3k | 3 | 2048 | 192 | 2.7×3.78×12 | TEXMB 192 | downscale textures to 2K | 11-03 |
| Rusted Tank storage | ixMkc1 | OK | prop | 5.8k | 1 | 2048 | 64 | 2.12×3.32×2.36 | TEXMB 64 | downscale textures to 1K | 11-03 |
| Tower Crane | Chamod | OK | building | 32.3k | 91 | 2048 | 447 | 51.5×51.6×8.28 | DRAWS 91, TEXMB 447 | atlas materials (91 draws to ≤12); downscale textures to 2K | 11-03 |
| Transformer booth (name match only: different Sketchfab model) | hurrrma | OK | prop | 764 | 2 | 2048 | 128 | 24.4×13.3×13.1 | TEXMB 128 | downscale textures to 1K | 11-11 |
| Transformer Booth \| LowPoly | S Λ N D R I K | OK | prop | 952 | 1 | 2048 | 64 | 116×38×65.1 | SCALE? 116 m, TEXMB 64 | check scale (largest side 116 m; x0.01 would give 1.16 m); downscale textures to 1K | 11-03 |
| Warehouse FBX Model Free | Nicholas-3D | OK | building | 11.1k | 3 | 2048 | 37 | 16×5.02×46.3 | - | use as-is | 11-03 |

## Northstar Town, Millhaven, Riverwood, Crossroads

Grid B2 · C3 · H5–6 · E4. Arrived 18, not yet 0.

| Name | Author | Licence | Cat | Tris | Draws | Max tex | Tex MB | Size m (x×y×z) | Flags | Suggested action | Batch |
|---|---|---|---|--:|--:|--:|--:|---|---|---|---|
| \[FREE\] Simple Storefront Interior Pack | 99.Miles | OK | building-kit | 4.8k (3 pcs, max 4.4k) | 3 | 2048 | 21 | 58.6×58.6×30.5 | - | use as-is | 11-03 |
| Abandoned building | Federico Paredes | OK | building | 8.2k | 4 | 4096 | 96 | 3.49×8.46×4.8 | TEX 4096px | downscale textures to 2K | 11-03 |
| Abandoned House | Sengchor | OK | building | 12.2k | 644 | 2048 | 64 | 17.6×6.24×16.7 | DRAWS 644 | atlas materials (644 draws to ≤12) | 11-03 |
| Abandoned Warehouse (name match only: different Sketchfab model) | Arsen Ismailov | OK | building | 198.0k | 41 | 4096 | 888 | 31×9.75×35.7 | TRIS>60k (3.3x), DRAWS 41, TEX 4096px, TEXMB 888 | decimate to 60k; atlas materials (41 draws to ≤12); downscale textures to 2K | 11-11 |
| Brooklyn Street Row Buildings Low Poly | B0rn2D13 | OK | building-kit | 6.2k (415 pcs, max 666) | 415 | 2048 | 43 | 20.3×15.4×66.1 | - | use as-is | 11-03 |
| DINER | Elbolillo | OK | building | 55.3k | 408 | 1024 | 43 | 83×32.6×83 | DRAWS 408 | atlas materials (408 draws to ≤12) | 11-03 |
| Duplex | SrMonteiro | OK | building | 7.9k | 3 | 4096 | 85 | 8.77×5.53×6.92 | TEX 4096px | downscale textures to 2K | 11-03 |
| Fire Station No. 1 | CommonSpence | OK | building | 3.8k | 1 | 1024 | 16 | 31.3×10.6×23.6 | - | use as-is | 11-03 |
| Gas station ⧉ | Elbolillo | OK | building | 51.9k | 991 | 1024 | 52 | 300×38.9×143 | DRAWS 991 | atlas materials (991 draws to ≤12) | 11-03 |
| Gas station Props | Elbolillo | OK | kit | 12.6k (51 pcs, max 4.1k) | 179 | 1024 | 29 | 60.3×13.5×26 | MATS 54 | atlas materials across kit (54 materials) | 11-03 |
| Low-poly Old American brick building with shop. | Orzechu | OK | building | 2.9k | 1 | 1024 | 16 | 24.2×9.61×7.25 | - | use as-is | 11-03 |
| Motel | YD92 | OK | building | 55.3k | 12 | 2048 | 114 | 2e+04×6.79e+03×2e+04 | SCALE? 2e+04 m, TEXMB 114 | check scale (largest side 2e+04 m; x0.01 would give 200 m); downscale textures to 2K | 11-03 |
| Motel (name match only: different Sketchfab model) | samfisher158 | OK | building | 1.8k | 1 | - | 0 | 2.64e+03×624×747 | SCALE? 2.64e+03 m | check scale (largest side 2.64e+03 m; x0.01 would give 26.4 m) | 11-09 |
| Old Building Pack \| Lowpoly | Fridqeir | OK | building-kit | 16.8k (12 pcs, max 1.9k) | 24 | 1024 | 16 | 7.25×6.62×21.4 | - | use as-is | 11-03 |
| Old garage | Yury Misiyuk | OK | building | 2.2k | 11 | 2048 | 60 | 7.15e+03×4.39e+03×1.13e+04 | SCALE? 1.13e+04 m | check scale (largest side 1.13e+04 m; x0.01 would give 113 m) | 11-03 |
| Police Station | Veterock | OK | building | 91.8k | 91 | 4096 | 261 | 67.4×25.8×61.8 | TRIS>60k (1.5x), DRAWS 91, TEX 4096px, TEXMB 261 | decimate to 60k; atlas materials (91 draws to ≤12); downscale textures to 2K | 11-03 |
| Rural Buildings Set - Low Poly models | Daniel Zhabotinsky | OK | building-kit | 10.3k (20 pcs, max 1.3k) | 39 | 2048 | 463 | 126×10.7×130 | TEXMB 463 | downscale textures to 2K | 11-03 |
| Soviet panel house built in the 1970s | Unka II | OK | building | 10.1k | 6 | 512 | 7 | 24.1×25.4×179 | SPEC-GLOSS | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension) | 11-03 |
| Suburban shabby house low poly | Simlion | OK | building | 10.0k | 3 | 2048 | 106 | 1.6e+03×1.65e+03×1.74e+03 | SCALE? 1.74e+03 m, TEXMB 106 | check scale (largest side 1.74e+03 m; x0.01 would give 17.4 m); downscale textures to 2K | 11-03 |
| Suburbian House | Vlad Dyuhaaa | OK | building | 3.9k | 1 | 2048 | 64 | 3.1×3×2.97 | - | use as-is | 11-03 |

## Countryside, farms and Murder Cabins

Grid C7 · open fields. Arrived 12, not yet 0.

| Name | Author | Licence | Cat | Tris | Draws | Max tex | Tex MB | Size m (x×y×z) | Flags | Suggested action | Batch |
|---|---|---|---|--:|--:|--:|--:|---|---|---|---|
| Abandoned Barn | Arsen Ismailov | OK | building | 113.0k | 22 | 4096 | 918 | 10.1×7.8×10.6 | TRIS>60k (1.9x), DRAWS 22, TEX 4096px, TEXMB 918 | decimate to 60k; atlas materials (22 draws to ≤12); downscale textures to 2K | 11-03 |
| Barn with mini-shop (old age) | Dorin.Stoica | OK | building | 10.5k | 8 | 2048 | 72 | 18.8×11.2×18.8 | - | use as-is | 11-03 |
| Fence pack - (low poly, game ready) ⧉ | TampaJoey | OK | kit | 13.4k (8 pcs, max 4.0k) | 112 | 1024 | 16 | 15.2×1.33×5.96 | - | use as-is | 11-03 |
| Hay Bales ⧉ | FrodoUndead | OK | prop | 3.3k | 2 | 2048 | 43 | 3.55×1.81×2.42 | TEXMB 43 | downscale textures to 1K | 11-03 |
| Log Cabin | chelC | OK | building | 56.8k | 20 | 2048 | 140 | 2.11e+03×1.23e+03×2.06e+03 | DRAWS 20, SCALE? 2.11e+03 m, TEXMB 140 | atlas materials (20 draws to ≤12); check scale (largest side 2.11e+03 m; x0.01 would give 21.1 m); downscale textures to 2K | 11-03 |
| Log Cabin + Ruined Version ⧉ | Nils Lindbäck | OK | building | 87.6k | 83 | 2048 | 320 | 430×293×1.13e+03 | TRIS>60k (1.5x), DRAWS 83, SCALE? 1.13e+03 m, TEXMB 320 | decimate to 60k; atlas materials (83 draws to ≤12); check scale (largest side 1.13e+03 m; x0.01 would give 11.3 m); downscale textures to 2K | 11-03 |
| Log Pile (Game Ready / 2K PBR) ⧉ | Meerschaum Digital | OK | prop | 3.9k | 1 | 2048 | 64 | 2.63×0.722×1.3 | TEXMB 64 | downscale textures to 1K | 11-03 |
| Old Machine | re1monsen | OK | prop | 37.8k | 40 | 4096 | 128 | 459×266×205 | TRIS>15k (2.5x), DRAWS 40, SCALE? 459 m, TEX 4096px, TEXMB 128 | decimate to 15k; atlas materials (40 draws to ≤12); check scale (largest side 459 m; x0.01 would give 4.59 m); downscale textures to 1K | 11-03 |
| Privacy Fence Pack (with damaged sections) ⧉ | TampaJoey | OK | kit | 22.3k (11 pcs, max 15.5k) | 25 | 1024 | 202 | 19.6×2.24×31.2 | PIECE>15k (1.0x), MATS 14, TEXMB 202 | decimate heavy pieces to 15k; atlas materials across kit (14 materials); downscale textures to 1K | 11-03 |
| Silos | nermin | OK | building | 9.0k | 413 | 2048 | 150 | 408×649×943 | DRAWS 413, SCALE? 943 m, TEXMB 150 | atlas materials (413 draws to ≤12); check scale (largest side 943 m; x0.01 would give 9.43 m); downscale textures to 2K | 11-03 |
| Wooden Cabin | donnichols | OK | building | 4.4k | 2 | 2048 | 64 | 299×320×353 | - | use as-is | 11-03 |
| Worn Shed PBR Game-Ready ⧉ | donnichols | OK | building | 2.1k | 8 | 2048 | 335 | 644×355×434 | SCALE? 644 m, TEXMB 335 | check scale (largest side 644 m; x0.01 would give 6.44 m); downscale textures to 2K | 11-03 |

## Central Hospital, Blackwater Prison, Old Dam

Grid G4 · E6 · B5. Arrived 9, not yet 0.

| Name | Author | Licence | Cat | Tris | Draws | Max tex | Tex MB | Size m (x×y×z) | Flags | Suggested action | Batch |
|---|---|---|---|--:|--:|--:|--:|---|---|---|---|
| Apocalyptic Hospital Hallway Interior | ETBENO | OK | building | 19.0k | 104 | 1024 | 17 | 31.2×3.51×6.29 | DRAWS 104 | atlas materials (104 draws to ≤12) | 11-03 |
| Beauharnois Dam | SIGlab\_poly | OK | building | 17.0k | 779 | 1024 | 35 | 2.08×1.28×5.21 | DRAWS 779, ANIM 1 | atlas materials (779 draws to ≤12) | 11-03 |
| Building of the polyclinic in russia | narcozisne1 | OK | building | 100.0k | 1 | 8192 | 340 | 32.6×20.1×32.3 | TRIS>60k (1.7x), TEX 8192px, TEXMB 340 | decimate to 60k; downscale textures to 2K | 11-03 |
| Chain link fence pack (low poly game ready) | TampaJoey | OK | kit | 17.5k (28 pcs, max 2.5k) | 80 | 1024 | 43 | 18.8×2.9×12.3 | SPEC-GLOSS | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension) | 11-03 |
| Hospital Bed | loxfear | OK | prop | 4.0k | 3 | 4096 | 298 | 188×142×124 | SCALE? 188 m, TEX 4096px, TEXMB 298 | check scale (largest side 188 m; x0.01 would give 1.88 m); downscale textures to 1K | 11-03 |
| Loudspeaker Tower | TampaJoey | OK | prop | 12.3k | 1 | 2048 | 85 | 3.52×12.5×3.53 | TEXMB 85 | downscale textures to 1K | 11-03 |
| Low Poly Prison | Doingyman1 | OK | building | 14.1k | 318 | 1024 | 13 | 0.3×0.049×0.3 | DRAWS 318, SCALE? 0.3 m | atlas materials (318 draws to ≤12); check scale (largest side 0.3 m; x100 would give 30 m) | 11-03 |
| Modular Chain Link Fence Set ⧉ | FrodoUndead | OK | kit | 3.1k (5 pcs, max 1.3k) | 5 | 2048 | 64 | 0.855×6.9×31.2 | - | use as-is | 11-03 |
| Prison cell door ⧉ | Rivaldragon | OK | prop | 1.5k | 1 | 2048 | 64 | 3.87×3.01×0.182 | TEXMB 64 | downscale textures to 1K | 11-03 |

## Roads, bridges, coast and street props

Grid Whole map · D8 / H8 bridges. Arrived 15, not yet 0.

| Name | Author | Licence | Cat | Tris | Draws | Max tex | Tex MB | Size m (x×y×z) | Flags | Suggested action | Batch |
|---|---|---|---|--:|--:|--:|--:|---|---|---|---|
| Abandoned street lights pack ⧉ | sergeilihandristov | OK | kit | 22.3k (39 pcs, max 5.6k) | 39 | 2048 | 64 | 89.6×10.3×89.6 | - | use as-is | 11-03 |
| City Props Collection (volume 2) | TampaJoey | OK | kit | 52.2k (39 pcs, max 7.0k) | 48 | 2048 | 660 | 43.8×8.56×22.5 | MATS 45, TEXMB 660 | atlas materials across kit (45 materials); downscale textures to 1K | 11-03 |
| Concrete Barrier / Drum Barrel / Fences ⧉ | Myjato | OK | kit | 13.2k (66 pcs, max 1.2k) | 88 | 4096 | 310 | 0.075×0.02×0.026 | MATS 70, SCALE? 0.007 m, TEX 4096px, TEXMB 310 | atlas materials across kit (70 materials); check scale (largest side 0.007 m; x100 would give 0.7 m); downscale textures to 1K | 11-03 |
| Concrete Girder Beam Bridges/Tunnels \[Free\] | Jotrain | OK | building-kit | 890 (14 pcs, max 164) | 14 | 2048 | 165 | 76.9×38×283 | SPEC-GLOSS, TEXMB 165 | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 2K | 11-03 |
| Electrical Powerline Pole (Free Asset) | tiedtke | OK | prop | 40.0k | 1 | 2048 | 64 | 3.36×11.5×27.3 | TRIS>15k (2.7x), TEXMB 64 | decimate to 15k; downscale textures to 1K | 11-03 |
| Jersey Barrier | emran.bayati | OK | prop | 1.7k | 3 | 4096 | 255 | 0.768×1.08×2 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-03 |
| Metal road billboard single sided | Frice | OK | prop | 860 | 4 | 2048 | 68 | 1.26×7×11 | TEXMB 68 | downscale textures to 1K | 11-03 |
| Modular Bridge ( low Poly ) Game Ready. | Salah3D | OK | building-kit | 36.6k (5 pcs, max 14.7k) | 10 | 512 | 5 | 46.4×2.86×37 | - | use as-is | 11-03 |
| Modular Road Bridge | VectorMan | OK | building-kit | 666 (7 pcs, max 326) | 7 | 2048 | 64 | 5.8e+03×3.96e+03×5.1e+03 | SCALE? 5.1e+03 m | check scale (largest side 5.1e+03 m; x0.01 would give 51 m) | 11-03 |
| Modular Urban Fence Pack (w/ graffiti textures) | TampaJoey | OK | kit | 39.0k (7 pcs, max 32.5k) | 32 | 1024 | 80 | 42.5×2.7×25.3 | PIECE>15k (2.2x), MATS 15 | decimate heavy pieces to 15k; atlas materials across kit (15 materials) | 11-03 |
| Old pier (Game ready) ⧉ | PT34 | OK | building | 9.1k | 1 | 2048 | 64 | 283×198×622 | SCALE? 622 m | check scale (largest side 622 m; x0.01 would give 6.22 m) | 11-03 |
| Road Signs ⧉ | FrodoUndead | OK | kit | 14.2k (191 pcs, max 192) | 191 | 2048 | 85 | 140×23.4×18.8 | - | use as-is | 11-03 |
| Rural Area Old Concrete Electric Utility Pole | Kuutti Siitonen | OK | prop | 3.4k | 9 | 2048 | 64 | 1.05×4.91×0.245 | TEXMB 64 | downscale textures to 1K | 11-03 |
| The Lighthouse | cotman sam | OK | building | 13.3k | 119 | 1024 | 93 | 800×521×800 | DRAWS 119, SCALE? 800 m | atlas materials (119 draws to ≤12); check scale (largest side 800 m; x0.01 would give 8 m) | 11-03 |
| Traffic Cones | NotAnotherApocalypticCo. | OK | kit | 19.0k (32 pcs, max 752) | 32 | 4096 | 511 | 2.4×1.8×3.36 | TEX 4096px, TEXMB 511 | downscale textures to 1K | 11-03 |

## Forests, rocks and grass

Grid Iron Peaks E–F1 · Pine Ridge E2–3. Arrived 11, not yet 1.

| Name | Author | Licence | Cat | Tris | Draws | Max tex | Tex MB | Size m (x×y×z) | Flags | Suggested action | Batch |
|---|---|---|---|--:|--:|--:|--:|---|---|---|---|
| 3 English Oak Set (Quercus Robur) \*Updated | yag1z | OK | tree | 28.4k (5 pcs, max 7.8k) | 5 | 2048 | 106 | 60.9×27.8×31.6 | TEXMB 106 | instance (InstancedMesh); downscale textures to 1K | 11-03 |
| Birch tree | evolveduk | OK | tree | 7.4k (2 pcs, max 4.3k) | 2 | 1024 | 32 | 5.46×8.16×4.35 | TEXMB 32 | instance (InstancedMesh); downscale textures to 1K | 11-03 |
| Coniferous Forest Assets Pack | Dari | OK | tree | 58.4k (14 pcs, max 8.7k) | 19 | 2048 | 118 | 80.1×19×23.4 | DRAWS 19, SPEC-GLOSS, TEXMB 118 | atlas materials (19 draws to ≤12); convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); instance (InstancedMesh); downscale textures to 1K | 11-03 |
| oak trees | DJMaesen | OK | tree | 14.5k (3 pcs, max 7.7k) | 198 | 1024 | 32 | 2.06×2.1×2.2 | DRAWS 198, TEXMB 32 | atlas materials (198 draws to ≤12); instance (InstancedMesh); downscale textures to 1K | 11-03 |
| Pine Forest | fangzhangmnm | OK | tree | 45.3k (3 pcs, max 44.4k) | 3 | 1024 | 19 | 141×141×141 | PIECE>10k (4.4x), SCALE? 141 m | decimate each tree to ≤10k + impostor/billboard LOD; check scale (largest side 141 m; x0.01 would give 1.41 m); instance (InstancedMesh) | 11-03 |
| Pine tree | Andriy Shekh | OK | tree | 2.2k (2 pcs, max 1.9k) | 2 | 512 | 4 | 217×308×217 | SCALE? 299 m | check scale (largest side 299 m; x0.01 would give 2.99 m); instance (InstancedMesh) | 11-03 |
| Real Bush | Salman Ramezani | OK | tree | 472 (9 pcs, max 107) | 9 | 4096 | 255 | 239×145×267 | SCALE? 151 m, TEX 4096px, TEXMB 255 | check scale (largest side 151 m; x0.01 would give 1.51 m); instance (InstancedMesh); downscale textures to 1K | 11-03 |
| Realtime Grass | mfhscoobydoo | OK | prop | 14.1k | 2013 | 1024 | 7 | 16.1×4.96×23.5 | DRAWS 2013 | atlas materials (2013 draws to ≤12) | 11-03 |
| Rockcliff | DJMaesen | OK | prop | 7.2k | 3 | 2048 | 64 | 252×509×398 | SCALE? 509 m, TEXMB 64 | check scale (largest side 509 m; x0.01 would give 5.09 m); downscale textures to 1K | 11-03 |
| Stone Pack | ashkan.fancy | OK | kit | 46.7k (28 pcs, max 6.1k) | 28 | 2048 | 298 | 29.6×6.14×19.1 | TEXMB 298 | downscale textures to 1K | 11-03 |
| Trees | DJMaesen | OK | tree | 9.9k (3 pcs, max 3.4k) | 6 | 2048 | 208 | 1.56e+03×1.02e+03×945 | SCALE? 929 m, SPEC-GLOSS, TEXMB 208 | check scale (largest side 929 m; x0.01 would give 9.29 m); convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); instance (InstancedMesh); downscale textures to 1K | 11-03 |

## Vehicles (phase 5)

Grid Roads. Arrived 9, not yet 0.

| Name | Author | Licence | Cat | Tris | Draws | Max tex | Tex MB | Size m (x×y×z) | Flags | Suggested action | Batch |
|---|---|---|---|--:|--:|--:|--:|---|---|---|---|
| Doutrive '78 - Low poly model | Daniel Zhabotinsky | OK | vehicle | 24.6k | 29 | 2048 | 141 | 4.7×1.41×1.75 | DRAWS 29, TEXMB 141 | atlas materials (29 draws to ≤12); downscale textures to 2K | 11-03 |
| Fairheaven LT '80 Cop Cruiser - Low poly model | Daniel Zhabotinsky | OK | vehicle | 19.5k | 36 | 2048 | 205 | 5.08×1.57×1.83 | DRAWS 36, TEXMB 205 | atlas materials (36 draws to ≤12); downscale textures to 2K | 11-03 |
| Free Burned Police Cars | Renafox | OK | building | 21.6k | 2 | 2048 | 58 | 630×298×731 | SCALE? 731 m | check scale (largest side 731 m; x0.01 would give 7.31 m) | 11-03 |
| Generic civil service vehicles pack | Comrade1280 | OK | vehicle-kit | 92.7k (10 pcs, max 12.7k) | 43 | 2048 | 898 | 27.3×2.94×27.8 | MATS 43, TEXMB 898 | atlas materials across kit (43 materials); downscale textures to 2K | 11-03 |
| Generic passenger car pack | Comrade1280 | OK | vehicle-kit | 69.3k (51 pcs, max 5.6k) | 75 | 2048 | 814 | 19.3×1.76×19.3 | MATS 41, TEXMB 814 | atlas materials across kit (41 materials); downscale textures to 2K | 11-03 |
| Lightbody Lifted '85 - Low poly model | Daniel Zhabotinsky | OK | prop | 37.4k | 33 | 2048 | 130 | 4.93×1.94×2.14 | TRIS>15k (2.5x), DRAWS 33, TEXMB 130 | decimate to 15k; atlas materials (33 draws to ≤12); downscale textures to 1K | 11-03 |
| Military Truck 1/2 Ton | Arion Digital | OK | vehicle | 16.7k | 5 | 1024 | 19 | 276×327×678 | SCALE? 678 m | check scale (largest side 678 m; x0.01 would give 6.78 m) | 11-03 |
| Old Rowboat | TooManyDemons | OK | vehicle | 5.5k | 18 | 2048 | 64 | 659×196×672 | DRAWS 18, SCALE? 672 m | atlas materials (18 draws to ≤12); check scale (largest side 672 m; x0.01 would give 6.72 m) | 11-03 |
| Ural 4320 | Brout | OK | vehicle | 8.5k | 1 | 2048 | 21 | 3.06×3.27×7.57 | - | use as-is | 11-03 |

## Not on the asset list

Includes the earlier 5v5 / FPS downloads and the Poly Haven texture sets (the list footer says terrain and building textures come from Poly Haven / ambientCG, CC0).

| Name | Author | Licence | Cat | Tris | Draws | Max tex | Tex MB | Size m (x×y×z) | Flags | Suggested action | Batch |
|---|---|---|---|--:|--:|--:|--:|---|---|---|---|
| 1793786950686 69-bauhaus.blend |  | REVIEW: no licence information in archive | prop | - | - | - | 0 |  | LIC-REVIEW, needs-conversion | needs-conversion (blend to glTF in Blender) | 11-04 |
| 2003 Chevrolet Express GMC Savana 2500 Cargo Van | Ddiaz Design | OK | prop | 31.2k | 32 | 1024 | 31 | 0.024×0.02×0.057 | TRIS>15k (2.1x), DRAWS 32, TEXMB 31 | decimate to 15k; atlas materials (32 draws to ≤12); downscale textures to 1K | 11-08 |
| 40ft ISO General Container \[Free Asset Pack\] | Lex713 | OK | kit | 76.1k (16 pcs, max 5.0k) | 16 | 1024 | 90 | 37.5×2.62×27.3 | MATS 15 | atlas materials across kit (15 materials) | 11-02 |
| 9mm ammo box 2k game ready | hexy | REJECT: Standard/paid licence | prop | 48 | 4 | 2048 | 21 | 0.786×0.493×0.993 | LIC-REJECT | reject (licence: Standard/paid licence) | 11-03 |
| \[FREE\] Store Props \[Asset pack\] | SimplePolygon | OK | kit | 6.5k (27 pcs, max 850) | 27 | 2048 | 21 | 3.96×3.61×12.4 | - | use as-is | 11-11 |
| \[FREE\] Wooden Docks V2 \[Asset pack\] | SimplePolygon | REJECT: NoDerivatives licence (we must decimate/modify) | kit | 5.7k (12 pcs, max 3.2k) | 13 | - | 0 | 32.5×2.32×15.2 | LIC-REJECT, SPEC-GLOSS | reject (licence: NoDerivatives licence (we must decimate/modify)); convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension) | 11-09 |
| A Speed Luxury Yacht \[FULL interior\] | Mixmamo.studio: An effortless 3D collections. | OK | prop | 300.8k | 136 | 2048 | 72 | 5.38×13.4×25.3 | TRIS>15k (20.1x), DRAWS 136, TEXMB 72 | decimate to 15k (heavy: 20x) or reject; atlas materials (136 draws to ≤12); downscale textures to 1K | 11-11 |
| Abandoned Cabin Environment | mapleaber | OK | building | 718 | 6 | 4096 | 1532 | 24.1×17.9×21.1 | TEX 4096px, TEXMB 1532 | downscale textures to 2K | 11-09 |
| Abandoned Carousel | sergeilihandristov | OK | prop | 1.5k | 2 | 2048 | 64 | 2.05×0.772×2.1 | ANIM 1, TEXMB 64 | downscale textures to 1K | 11-08 |
| Abandoned Gas Station | kand8998 | OK | building | 25.9k | 162 | 1024 | 330 | 28.9×20.1×29.6 | DRAWS 162, TEXMB 330 | atlas materials (162 draws to ≤12); downscale textures to 2K | 11-08 |
| Abandoned Generic Sedan 1 - Game Ready | Rashad Ibrahimli | OK | prop | 9.6k | 16 | 2048 | 64 | 13.5×9.11×21.6 | DRAWS 16, TEXMB 64 | atlas materials (16 draws to ≤12); downscale textures to 1K | 11-08 |
| Abandoned Playground | sergeilihandristov | OK | prop | 2.3k | 6 | 2048 | 64 | 5.01×2.25×4.56 | ANIM 1, TEXMB 64 | downscale textures to 1K | 11-08 |
| Abandoned School Bus - Rusty Low Poly bus | nyronix | OK | prop | 21.3k | 42 | 2048 | 128 | 3.61×4.56×9.02 | TRIS>15k (1.4x), DRAWS 42, TEXMB 128 | decimate to 15k; atlas materials (42 draws to ≤12); downscale textures to 1K | 11-08 |
| Abandoned Shack in the Swamp | Nicholas-3D | OK | prop | 357.2k | 16 | 2048 | 117 | 19.9×9.01×21.6 | TRIS>15k (23.8x), DRAWS 16, TEXMB 117 | decimate to 15k (heavy: 24x) or reject; atlas materials (16 draws to ≤12); downscale textures to 1K | 11-09 |
| Abandoned Wrecked Bus | BytesCrafter | OK | prop | 12.3k | 16 | 512 | 12 | 996×309×269 | DRAWS 16, SKINNED, SCALE? 996 m | atlas materials (16 draws to ≤12); check scale (largest side 996 m; x0.01 would give 9.96 m) | 11-08 |
| Abbey Wall Ruins | tonyflanagan | OK | prop | 58.6k | 2 | 2048 | 85 | 77.2×15.6×28.8 | TRIS>15k (3.9x), SCALE? 77.2 m, TEXMB 85 | decimate to 15k; check scale (largest side 77.2 m; x0.01 would give 0.772 m); downscale textures to 1K | 11-08 |
| Airport baggage equipment (cart) lowpoly | propmaker1 | OK | prop | 2.0k | 1 | 512 | 1 | 20.6×27.9×41.2 | SCALE? 41.2 m | check scale (largest side 41.2 m; x0.01 would give 0.412 m) | 11-08 |
| Airport Fire Truck 2 | Firechu\_2011 | OK | vehicle | 102.9k | 2 | - | 0 | 3.62×4.37×15 | TRIS>80k (1.3x) | decimate to 80k | 11-08 |
| Airport Fuel Truck | Nguyễn Tuấn Nghĩa | OK | vehicle | 8.1k | 2 | 1024 | 3 | 123×131×430 | SCALE? 430 m | check scale (largest side 430 m; x0.01 would give 4.3 m) | 11-08 |
| American Diner | munchyii | OK | building | 2.2k | 106 | 512 | 3 | 10.3×4.56×8.75 | DRAWS 106 | atlas materials (106 draws to ≤12) | 11-09 |
| American Old Barn | andrewriddle | OK | building | 9.4k | 1 | 2048 | 21 | 244×135×184 | - | use as-is | 11-04 |
| American Road Signs Pack | CGMeller | OK | kit | 36.3k (19 pcs, max 3.3k) | 19 | 2048 | 80 | 1.69e+03×266×1.69e+03 | - | use as-is | 11-09 |
| Ammo boxes - free game asset | Andy Woodhead | OK | prop | 7.7k | 2 | 2048 | 96 | 4.89×1.6×4.89 | TEXMB 96 | downscale textures to 1K | 11-09 |
| Apple Tree | Yassin12 | OK | tree | 1.8k (20 pcs, max 108) | 20 | - | 0 | 2.42e+03×3.19e+03×3.09e+03 | DRAWS 20, SCALE? 2.4e+03 m | atlas materials (20 draws to ≤12); check scale (largest side 2.4e+03 m; x0.01 would give 24 m); instance (InstancedMesh) | 11-04 |
| Approach lighting system / Runway lights | TRYFIELD | OK | kit | 15.6k (15 pcs, max 8.7k) | 20 | 2048 | 21 | 806×605×206 | - | use as-is | 11-08 |
| Armor Plate :: Luna has gone prop | Shorty\_Digitan | OK | prop | 904 | 2 | 4096 | 255 | 0.283×0.446×0.527 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-03 |
| arroka, lurra, elurra | yelizegi | OK | prop | 1353.0k | 12 | 8192 | 340 | 3.39×0.325×5.72 | TRIS>15k (90.2x), TEX 8192px, TEXMB 340 | decimate to 15k (heavy: 90x) or reject; downscale textures to 1K | 11-11 |
| asphalt 02 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 3.01×3.04×3.02 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| Asphalt Texture 3D scan | grafi | OK | prop | 20.0k | 1 | 2048 | 43 | 1.8×0.021×1.14 | TRIS>15k (1.3x), TEXMB 43 | decimate to 15k; downscale textures to 1K | 11-04 |
| ATM Machine | local.yany | OK | prop | 2.5k | 2 | 2048 | 43 | 0.731×1.57×0.608 | TEXMB 43 | downscale textures to 1K | 11-08 |
| Barrier & Traffic Cone Pack | Sabri Ayeş | OK | kit | 9.6k (17 pcs, max 1.0k) | 17 | 2048 | 915 | 6.84×2.59×4.03 | MATS 17, TEXMB 915 | atlas materials across kit (17 materials); downscale textures to 1K | 11-08 |
| Basic Plains Shelter | Michael.Lohr | OK | prop | 12.1k | 12 | 256 | 1 | 10.3×4.77×8.53 | - | use as-is | 11-11 |
| Basketball Hoop | paethon | OK | prop | 2.6k | 1 | 2048 | 64 | 2.48×3.58×1.64 | TEXMB 64 | downscale textures to 1K | 11-08 |
| Beach rock formation 01 | lascoyt | OK | prop | 142.7k | 5 | 4096 | 340 | 5.07×1.06×5.06 | TRIS>15k (9.5x), TEX 4096px, TEXMB 340 | decimate to 15k (heavy: 10x) or reject; downscale textures to 1K | 11-08 |
| Big Boulder | 3dhdscan | OK | prop | 65.0k | 1 | 4096 | 255 | 1.78×0.856×1.86 | TRIS>15k (4.3x), TEX 4096px, TEXMB 255 | decimate to 15k; downscale textures to 1K | 11-11 |
| Big Rock 1B | Andrei.D | OK | prop | 24.6k | 1 | 4096 | 255 | 0.023×0.027×0.024 | TRIS>15k (1.6x), SCALE? 0.027 m, TEX 4096px, TEXMB 255 | decimate to 15k; check scale (largest side 0.027 m; x100 would give 2.7 m); downscale textures to 1K | 11-08 |
| Boubín Stump | 3dhdscan | OK | prop | 23.6k | 1 | 4096 | 255 | 57×19.8×54.7 | TRIS>15k (1.6x), SCALE? 57 m, TEX 4096px, TEXMB 255 | decimate to 15k; check scale (largest side 57 m; x0.01 would give 0.57 m); downscale textures to 1K | 11-08 |
| Breakwater coast | SKMT | OK | prop | 25.0k | 1 | 8192 | 1021 | 92.1×2.61×17.1 | TRIS>15k (1.7x), SCALE? 92.1 m, TEX 8192px, TEXMB 1021 | decimate to 15k; check scale (largest side 92.1 m; x0.01 would give 0.921 m); downscale textures to 1K | 11-11 |
| Brick Substation | CommonSpence | OK | building | 2.5k | 1 | 4096 | 255 | 7.11×6.16×10.5 | TEX 4096px, TEXMB 255 | downscale textures to 2K | 11-08 |
| BTR-80 | 42manako | OK | prop | 42.7k | 4 | 1024 | 16 | 43.5×22.7×16.3 | TRIS>15k (2.8x), SCALE? 43.5 m | decimate to 15k; check scale (largest side 43.5 m; x0.01 would give 0.435 m) | 11-08 |
| Bunker Nr 20 | FHQ-Wehrwolf | OK | prop | 910 | 6 | 1024 | 7 | 25×3.65×30 | - | use as-is | 11-09 |
| Burned-out Cars | Renafox | OK | prop | 3.5k | 2 | 2048 | 96 | 282×86.6×295 | SCALE? 295 m, TEXMB 96 | check scale (largest side 295 m; x0.01 would give 2.95 m); downscale textures to 1K | 11-08 |
| Bus Stop - low | Milionna | OK | prop | 520 | 2 | 4096 | 340 | 14.6×22.9×30.5 | TEX 4096px, TEXMB 340 | downscale textures to 1K | 11-04 |
| bush | Uder Gidro | OK | tree | 8.6k (3 pcs, max 4.3k) | 3 | 512 | 1 | 0.383×0.181×0.387 | SCALE? 0.385 m | check scale (largest side 0.385 m; x100 would give 38.5 m); instance (InstancedMesh) | 11-09 |
| Camp 3d model free | iGauravRajput | OK | prop | 18.8k | 1 | 2048 | 21 | 0.998×0.596×0.998 | TRIS>15k (1.3x) | decimate to 15k | 11-09 |
| Campfire | Mandrake | OK | prop | 20.0k | 8 | 4096 | 271 | 411×263×315 | TRIS>15k (1.3x), SCALE? 411 m, TEX 4096px, TEXMB 271 | decimate to 15k; check scale (largest side 411 m; x0.01 would give 4.11 m); downscale textures to 1K | 11-08 |
| Car Crashed | Bryan | OK | building | 46.4k | 30 | 2048 | 43 | 12.6×8.3×26.7 | DRAWS 30 | atlas materials (30 draws to ≤12) | 11-09 |
| Cessna 172Kr (with cockpit) (ver III) | TonyWony | OK | prop | 20.2k | 241 | 4096 | 656 | 13.5×3.14×10.1 | TRIS>15k (1.3x), DRAWS 241, TEX 4096px, TEXMB 656 | decimate to 15k; atlas materials (241 draws to ≤12); downscale textures to 1K | 11-08 |
| Cessna 402C | SnowCrow | OK | prop | 36.4k | 24 | - | 0 | 12.8×3.35×10.5 | TRIS>15k (2.4x), DRAWS 24 | decimate to 15k; atlas materials (24 draws to ≤12) | 11-08 |
| Cessna Citation X | SnowCrow | OK | prop | 43.8k | 45 | - | 0 | 6.41×2.04×7.28 | TRIS>15k (2.9x), DRAWS 45, SPEC-GLOSS | decimate to 15k; atlas materials (45 draws to ≤12); convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension) | 11-08 |
| Checkpoint Gate | AnshiNoWara NG+ | OK | building | 5.0k | 3 | 2048 | 192 | 12.2×5.03×5.8 | ANIM 1, TEXMB 192 | downscale textures to 2K | 11-11 |
| Chicken Coop | jakerc10 | OK | prop | 2.3k | 2 | 2048 | 21 | 3.48×3.61×3.04 | - | use as-is | 11-04 |
| Church ruins | A9908244 | OK | prop | 27.0k | 5 | 2048 | 362 | 18.3×14×8.66 | TRIS>15k (1.8x), TEXMB 362 | decimate to 15k; downscale textures to 1K | 11-08 |
| Classic Detective hat ⧉ | 5XCISSORS | REJECT: Standard/paid licence | prop | 8.0k | 2 | 2048 | 128 | 0.168×0.152×0.24 | LIC-REJECT, TEXMB 128 | reject (licence: Standard/paid licence); downscale textures to 1K | 11-10 |
| Cliff Rock Boulder Field | Per's Scan Collection | OK | prop | 122.3k | 4 | 8192 | 1021 | 294×71.4×249 | TRIS>15k (8.2x), SCALE? 294 m, TEX 8192px, TEXMB 1021 | decimate to 15k (heavy: 8x) or reject; check scale (largest side 294 m; x0.01 would give 2.94 m); downscale textures to 1K | 11-08 |
| Cliffs Set \| Low-Poly \| Game-ready | kEam | OK | kit | 44.5k (10 pcs, max 7.1k) | 10 | 2048 | 213 | 19.2×15.3×60.1 | TEXMB 213 | downscale textures to 1K | 11-11 |
| Coastal Ground Cliff Rocks | Per's Scan Collection | OK | prop | 24.9k | 1 | 8192 | 1021 | 11.8×2.14×8.64 | TRIS>15k (1.7x), TEX 8192px, TEXMB 1021 | decimate to 15k; downscale textures to 1K | 11-11 |
| Concrete Barriers | Arsen Ismailov | OK | kit | 5.5k (21 pcs, max 1.8k) | 21 | 2048 | 447 | 0.5×1.75×10.2 | TEXMB 447 | downscale textures to 1K | 11-02 |
| Concrete Fountain | Kless Gyzen | OK | prop | 15.2k | 2 | 1024 | 21 | 1.07×1.33×1.07 | TRIS>15k (1.0x) | decimate to 15k | 11-11 |
| Concrete Ground \| Tile Texture | CATholic | OK | prop | 16.4k | 3 | 2048 | 64 | 2×2×14 | TRIS>15k (1.1x), TEXMB 64 | decimate to 15k; downscale textures to 1K | 11-04 |
| concrete pavement 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 1.8×1.8×1.8 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| Construction Site Asset Pack | vmatthew | OK | kit | 27.3k (14 pcs, max 12.4k) | 31 | 2048 | 1516 | 15.3×4.5×11.6 | MATS 29, TEXMB 1516 | atlas materials across kit (29 materials); downscale textures to 1K | 11-08 |
| Container Ship | LavaWave | OK | prop | 20.4k | 1 | 1024 | 5 | 36.4×46.2×247 | TRIS>15k (1.4x), SCALE? 247 m | decimate to 15k; check scale (largest side 247 m; x0.01 would give 2.47 m) | 11-08 |
| Corn! Corn! Corn! | Tiia Tuulia | OK | prop | 2.6k | 2 | 512 | 1 | 1.58×2.44×1.59 | ANIM 1 | use as-is | 11-04 |
| Couvent des Récollets, Nivelles \[Belgium\] | Lost Gecko | OK | prop | 12.6k | 3 | 2048 | 136 | 55.9×45.6×71.2 | SCALE? 71.2 m, SPEC-GLOSS, TEXMB 136 | check scale (largest side 71.2 m; x0.01 would give 0.712 m); convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 1K | 11-08 |
| cracked concrete wall 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 1.01×1.02×1.01 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| Crashed Abandoned Car - Game Ready | Rashad Ibrahimli | OK | building | 8.3k | 10 | 4096 | 255 | 5.59×3.48×8.12 | TEX 4096px, TEXMB 255 | downscale textures to 2K | 11-08 |
| Crashed Abandoned Truck - Game Ready | Rashad Ibrahimli | OK | vehicle | 9.4k | 15 | 4096 | 255 | 23.5×14.6×35.7 | DRAWS 15, TEX 4096px, TEXMB 255 | atlas materials (15 draws to ≤12); downscale textures to 2K | 11-08 |
| Crate And Barrels Asset Pack | ElliottA | OK | kit | 1.6k (4 pcs, max 432) | 9 | 2048 | 170 | 47.7×49.6×196 | TEXMB 170 | downscale textures to 1K | 11-02 |
| Deep Freezer V1 | doorbin | OK | prop | 300 | 2 | 4096 | 130 | 1.2×0.905×0.804 | TEX 4096px, TEXMB 130 | downscale textures to 1K | 11-11 |
| Desert House | Avgust9 | OK | building | 2.2k | 9 | 512 | 5 | 13.9×14.1×21.1 | - | use as-is | 11-02 |
| Desert Stopover | anreiterlorenz | OK | prop | 18.5k | 312 | - | 0 | 10.6×8.79×10.6 | TRIS>15k (1.2x), DRAWS 312 | decimate to 15k; atlas materials (312 draws to ≤12) | 11-11 |
| Destroyed Car 03 / Backrooms Car (Gameready ver) | Renafox | OK | prop | 10.0k | 1 | 4096 | 192 | 3.15×0.958×1.64 | TEX 4096px, TEXMB 192 | downscale textures to 1K | 11-08 |
| Devil's Slide Bunker - Pacifica, CA | Azad Balabanian | OK | prop | 90.8k | 2 | 4096 | 85 | 16.7×11.5×24 | TRIS>15k (6.1x), TEX 4096px, TEXMB 85 | decimate to 15k (heavy: 6x) or reject; downscale textures to 1K | 11-11 |
| Diesel Generator | Lifmon | OK | prop | 1.2k | 15 | 2048 | 85 | 0.454×0.642×0.805 | DRAWS 15, TEXMB 85 | atlas materials (15 draws to ≤12); downscale textures to 1K | 11-02 |
| Diesel train engine | Leafia dev. | OK | prop | 11.5k | 13 | 512 | 6 | 3.6×5.03×16.1 | DRAWS 13 | atlas materials (13 draws to ≤12) | 11-08 |
| Dirty Car - Cadillac 75 Sedan 1953 | ROH3D | OK | prop | 14.7k | 2 | 2048 | 64 | 1.85×1.6×5.67 | TEXMB 64 | downscale textures to 1K | 11-08 |
| Dock | anadaren | OK | prop | 1.9k | 1 | - | 0 | 844×556×1.42e+03 | SCALE? 1.42e+03 m | check scale (largest side 1.42e+03 m; x0.01 would give 14.2 m) | 11-09 |
| Dog House Free | donnichols | OK | building | 1.3k | 1 | 2048 | 64 | 73.1×86.2×83.8 | - | use as-is | 11-04 |
| Door Metal door window | ahmagh2e | OK | prop | 1.9k | 3 | 2048 | 85 | 376×357×36.5 | SCALE? 376 m, TEXMB 85 | check scale (largest side 376 m; x0.01 would give 3.76 m); downscale textures to 1K | 11-02 |
| Double Street Light – Low Poly/Game Ready - Free | marcosnegrao | OK | tree | 16.5k | 1 | - | 0 | 0.847×9.89×10.3 | PIECE>10k (1.7x) | decimate each tree to ≤10k + impostor/billboard LOD; instance (InstancedMesh) | 11-09 |
| Driftwood\_002\_(object\_on\_the\_beach) | SKMT | OK | prop | 17.0k | 1 | 8192 | 681 | 6.45×0.683×6.96 | TRIS>15k (1.1x), TEX 8192px, TEXMB 681 | decimate to 15k; downscale textures to 1K | 11-11 |
| Electrical box - FREE | Mathieu Godard | OK | prop | 1.5k | 1 | 4096 | 255 | 2×1.62×0.507 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-02 |
| Electrical Transformer Substation (FREE) | Andrey.Chegodaev | OK | prop | 327 | 4 | 2048 | 202 | 6.4×3.7×8.4 | TEXMB 202 | downscale textures to 1K | 11-08 |
| Entry to the Theresia mine, Morshausen, Germany | outcropwizard | OK | prop | 556.9k | 6 | 8192 | 340 | 150×58.7×58.1 | TRIS>15k (37.1x), SCALE? 150 m, TEX 8192px, TEXMB 340 | decimate to 15k (heavy: 37x) or reject; check scale (largest side 150 m; x0.01 would give 1.5 m); downscale textures to 1K | 11-09 |
| Excavator digger 3d model | Dioramass design | OK | vehicle | 122.8k | 6 | 2048 | 128 | 3.88×5.95×9.92 | TRIS>80k (1.5x), TEXMB 128 | decimate to 80k; downscale textures to 2K | 11-08 |
| Factory catwalk | Just8 | OK | building | 34.7k | 1 | 2048 | 64 | 0.997×0.287×1 | - | use as-is | 11-11 |
| Fallen Tree | SmallpolyArt | OK | tree | 20.0k | 1 | 8192 | 340 | 34.6×17×37.4 | PIECE>10k (2.0x), TEX 8192px, TEXMB 340 | decimate each tree to ≤10k + impostor/billboard LOD; instance (InstancedMesh); downscale textures to 1K | 11-08 |
| Family House | tomislav.bacic | OK | building | 111.8k | 414 | - | 0 | 88×24.5×74.8 | TRIS>60k (1.9x), DRAWS 414 | decimate to 60k; atlas materials (414 draws to ≤12) | 11-11 |
| Farmland v3 (LowPoly) | MrRiskris | OK | prop | 3.5k | 10 | - | 0 | 12.1×6.18×12.7 | - | use as-is | 11-04 |
| Fire lookout tower | k1llreal | OK | building | 7.1k | 148 | - | 0 | 283×240×283 | DRAWS 148 | atlas materials (148 draws to ≤12) | 11-08 |
| Fishing Boat | Rafael Rodrigues | OK | prop | 26.4k | 33 | 1024 | 32 | 8×2.12×8 | TRIS>15k (1.8x), DRAWS 33, TEXMB 32 | decimate to 15k; atlas materials (33 draws to ≤12); downscale textures to 1K | 11-11 |
| Fishing hut | Aedrian1 | OK | prop | 20.6k | 97 | 4096 | 255 | 6.69×8.24×10.5 | TRIS>15k (1.4x), DRAWS 97, TEX 4096px, TEXMB 255 | decimate to 15k; atlas materials (97 draws to ≤12); downscale textures to 1K | 11-11 |
| Fishing Supplies Set | FrodoUndead | OK | kit | 4.2k (7 pcs, max 896) | 7 | 1024 | 8 | 125×78.1×62.6 | - | use as-is | 11-11 |
| Floating Parasol Sunshade Patio Umbrella | k3v1nc0 | OK | prop | 20.0k | 5 | 4096 | 489 | 3.31×2.65×3.89 | TRIS>15k (1.3x), TEX 4096px, TEXMB 489 | decimate to 15k; downscale textures to 1K | 11-11 |
| Forest Ground \| Tile Texture | CATholic | OK | tree | 258.4k (3 pcs, max 258.0k) | 5 | 2048 | 64 | 2×2×14 | PIECE>10k (25.8x), TEXMB 64 | reject for mass instancing (26x) / hero tree only; instance (InstancedMesh); downscale textures to 1K | 11-04 |
| Forest Hut | ScanMe | REJECT: Standard/paid licence | tree | 842.7k (11 pcs, max 97.6k) | 11 | 8192 | 681 | 5.13×3.52×5.38 | LIC-REJECT, PIECE>10k (9.8x), TEX 8192px, TEXMB 681 | reject (licence: Standard/paid licence); reject for mass instancing (10x) / hero tree only; instance (InstancedMesh); downscale textures to 1K | 11-04 |
| Forklift - Free Low poly | LagzDesign | OK | vehicle | 36.4k | 11 | 1024 | 5 | 1.34×1.71×3.19 | - | use as-is | 11-02 |
| ForkLift GameReady | Mathieu Godard | OK | vehicle | 17.7k | 42 | 4096 | 255 | 0.889×1.25×2 | DRAWS 42, TEX 4096px, TEXMB 255 | atlas materials (42 draws to ≤12); downscale textures to 2K | 11-02 |
| Free - Armor Plate Carrier - Gameready Metahuman | Karnaval | REJECT: Standard/paid licence | prop | 24.4k | 3 | 4096 | 314 | 0.004×0.005×0.003 | LIC-REJECT, TRIS>15k (1.6x), SKINNED, SCALE? 0.005 m, TEX 4096px, TEXMB 314 | reject (licence: Standard/paid licence); decimate to 15k; check scale (largest side 0.005 m; x100 would give 0.5 m); downscale textures to 1K | 11-03 |
| Free AC Unit | vertexmonster | REJECT: Standard/paid licence | prop | 176.2k | 8 | 4096 | 1958 | 3.83×3.7×2.28 | LIC-REJECT, TRIS>15k (11.7x), TEX 4096px, TEXMB 1958 | reject (licence: Standard/paid licence); decimate to 15k (heavy: 12x) or reject; downscale textures to 1K | 11-02 |
| Free low poly Hangar model | Herrsher | REJECT: Standard/paid licence | building | 524 | 5 | - | 0 | 7.84×4.38×7.99 | LIC-REJECT | reject (licence: Standard/paid licence) | 11-09 |
| Free Low-poly Vintage Hippy Camper Van | Libau Media | OK | prop | 5.3k | 7 | - | 0 | 93.7×165×223 | SCALE? 223 m | check scale (largest side 223 m; x0.01 would give 2.23 m) | 11-09 |
| Free weapon accessories | LQC | OK | prop | 34.3k | 28 | 2048 | 427 | 0.697×5.36×20.2 | TRIS>15k (2.3x), DRAWS 28, TEXMB 427 | decimate to 15k; atlas materials (28 draws to ≤12); downscale textures to 1K | 11-03 |
| Free Wooden Scaffolding Set | Just8 | OK | kit | 47.8k (5 pcs, max 14.9k) | 11 | 4096 | 255 | 1.02×2.46×7.57 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-08 |
| Freight shipping container - Rusted ⧉ | Sousinho | OK | prop | 11.1k | 9 | 4096 | 575 | 12.8×5.93×6.7 | TEX 4096px, TEXMB 575 | downscale textures to 1K | 11-08 |
| Freight train car | Вячеслав | OK | prop | 26.3k | 8 | 2048 | 319 | 3.11×4.34×8.55 | TRIS>15k (1.8x), TEXMB 319 | decimate to 15k; downscale textures to 1K | 11-08 |
| Frieghtliner Oil Tanker | ROGUE | OK | prop | 7.9k | 16 | 4096 | 53 | 21.5×3.87×3.25 | DRAWS 16, TEX 4096px, TEXMB 53 | atlas materials (16 draws to ≤12); downscale textures to 1K | 11-08 |
| Game Ready Ammo Box | Godly\_Skibidi0 | REJECT: Standard/paid licence | prop | 3.2k | 2 | 4096 | 255 | 0.452×0.303×0.16 | LIC-REJECT, TEX 4096px, TEXMB 255 | reject (licence: Standard/paid licence); downscale textures to 1K | 11-03 |
| Game Ready Swat Character | dolon56 | OK | fps | 19.4k | 3 | 2048 | 96 | 192×178×38.5 | SKINNED, ANIM 1, SCALE? 192 m, SPEC-GLOSS | check scale (largest side 192 m; x0.01 would give 1.92 m); convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension) | 11-01 |
| Game Ready \| Free Surfboards | Saritasa | OK | prop | 13.3k | 5 | 4096 | 575 | 4.31×2.09×4.31 | TEX 4096px, TEXMB 575 | downscale textures to 1K | 11-11 |
| Gantry crane | Randonavt | OK | vehicle | 22.4k | 10 | 1024 | 16 | 25.6×11.8×15.1 | - | use as-is | 11-09 |
| Garbage bags | DJMaesen | OK | prop | 606 | 2 | 2048 | 64 | 1.16×1.19×1.93 | TEXMB 64 | downscale textures to 1K | 11-08 |
| Gas Station Stand – High-Quality 3D Model | Parham Mazloumin | OK | building | 5.9k | 3 | 2048 | 213 | 0×0.002×0.001 | SCALE? 0.002 m, TEXMB 213 | check scale (largest side 0.002 m); downscale textures to 2K | 11-12 |
| Gazebo 1 | Elasta Kristya | OK | prop | 3.2k | 1 | 4096 | 255 | 2.65×3.99×4.16 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-04 |
| General Supermarket - Furniture | Léonard\_Doye / Leoskateman | OK | prop | 19.4k | 98 | 2048 | 64 | 39.6×4.02×16 | TRIS>15k (1.3x), DRAWS 98, TEXMB 64 | decimate to 15k; atlas materials (98 draws to ≤12); downscale textures to 1K | 11-11 |
| Generator LP | YoeriBervoets | OK | prop | 10.9k | 67 | 4096 | 255 | 110×71.6×74.9 | DRAWS 67, SCALE? 110 m, TEX 4096px, TEXMB 255 | atlas materials (67 draws to ≤12); check scale (largest side 110 m; x0.01 would give 1.1 m); downscale textures to 1K | 11-08 |
| GORE BAY AIRPORT CYZE TERMINAL BUILDING | thomas.wiwchar | OK | building | 118.3k | 771 | - | 0 | 17.4×3.86×8.42 | TRIS>60k (2.0x), DRAWS 771 | decimate to 60k; atlas materials (771 draws to ≤12) | 11-08 |
| Graffiti Railway Tank | Yaroslav Dubovikov | OK | vehicle | 45.3k | 3 | 4096 | 766 | 2.7×3.78×12 | TEX 4096px, TEXMB 766 | downscale textures to 2K | 11-08 |
| Grain Silo - Low Poly Game Ready | Gobby | OK | building | 230 | 1 | 4096 | 255 | 7.79×16.4×7.79 | TEX 4096px, TEXMB 255 | downscale textures to 2K | 11-04 |
| Grass \| Tile Texture | CATholic | OK | prop | 4.3k | 3 | 2048 | 64 | 2×2×14 | TEXMB 64 | downscale textures to 1K | 11-04 |
| Grave Stone Collection | Kigha | OK | kit | 1.1k (4 pcs, max 640) | 4 | 2048 | 64 | 319×114×244 | - | use as-is | 11-08 |
| gravel 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 2.01×2.02×2.02 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| Gravel Asphalt Dirt Mound Pile | Mike92 | OK | prop | 63.5k | 1 | 4096 | 85 | 10.8×1.4×11.2 | TRIS>15k (4.2x), TEX 4096px, TEXMB 85 | decimate to 15k; downscale textures to 1K | 11-08 |
| gravel concrete 03 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 2.1×2.1×2.1 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| gravel embedded concrete 02 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 2×2×2 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| gravel embedded concrete 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 2×2×2 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| Gravel Macro \| Tile Texture | CATholic | OK | prop | 1032.5k | 11 | 2048 | 64 | 2×2×14 | TRIS>15k (68.8x), TEXMB 64 | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K | 11-04 |
| Gravity Dam | USACE Sacramento District | OK | building | 11.8k | 11 | 2048 | 192 | 29.3×13.2×11.9 | TEXMB 192 | downscale textures to 2K | 11-11 |
| Gray Big Rock | 3dhdscan | OK | prop | 35.0k | 1 | 4096 | 255 | 1.8×0.766×1.46 | TRIS>15k (2.3x), TEX 4096px, TEXMB 255 | decimate to 15k; downscale textures to 1K | 11-08 |
| Green & white picket fence | Shuckwaffles | OK | prop | 1.1k | 1 | 2048 | 64 | 2.26×1.42×0.217 | TEXMB 64 | downscale textures to 1K | 11-09 |
| Groceries Pack! Low poly assets for your games! | tulex\_art | OK | kit | 36.6k (29 pcs, max 9.7k) | 29 | 1024 | 463 | 2×0.354×0.436 | MATS 29, TEXMB 463 | atlas materials across kit (29 materials); downscale textures to 1K | 11-11 |
| Guard-rail | giovax1 | OK | prop | 9.4k | 2 | - | 0 | 1.57×4.9×58.9 | SCALE? 58.9 m | check scale (largest side 58.9 m; x0.01 would give 0.589 m) | 11-09 |
| Gun Targets | FrodoUndead | OK | prop | 2.3k | 10 | 2048 | 43 | 131×44.6×326 | SCALE? 326 m, TEXMB 43 | check scale (largest side 326 m; x0.01 would give 3.26 m); downscale textures to 1K | 11-08 |
| helicopter mi-8 | mamont nikita | OK | vehicle | 8.5k | 4 | 1024 | 3 | 9.16×2.4×8.23 | - | use as-is | 11-01 |
| Hesco Barrier PBR | polbrainstorm | OK | prop | 7.0k | 1 | 4096 | 255 | 72.6×65.7×72.3 | SCALE? 72.6 m, TEX 4096px, TEXMB 255 | check scale (largest side 72.6 m; x0.01 would give 0.726 m); downscale textures to 1K | 11-02 |
| Home US Mailbox 📫 | Glowbox 3D | OK | prop | 2.1k | 1 | 2048 | 64 | 0.731×3.56×1.49 | TEXMB 64 | downscale textures to 1K | 11-08 |
| Hospital Building | silentsheri | OK | building | 3.0k | 2 | 4096 | 106 | 13.5×8.29×8.36 | TEX 4096px, TEXMB 106 | downscale textures to 2K | 11-08 |
| Hospital Stretcher Trolley | mAmmar2256 | OK | prop | 2.2k | 1 | 2048 | 21 | 4.61×2.85×5.85 | - | use as-is | 11-09 |
| Hunting Stand | derlachs | OK | prop | 1.9k | 1 | 1024 | 16 | 2.56×7.87×3.98 | SPEC-GLOSS | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension) | 11-08 |
| Ice machine (low poly) | theWerskyScenario | OK | prop | 354 | 1 | 2048 | 64 | 2.77×1.66×1.22 | TEXMB 64 | downscale textures to 1K | 11-08 |
| Industrial Smoke Stacks | FrodoUndead | OK | prop | 2.9k | 3 | 4096 | 255 | 11.5×34.6×2.53 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-08 |
| Industrial\_Silo | Dhruv | OK | building | 91.3k | 591 | 4096 | 511 | 0.081×0.251×0.099 | TRIS>60k (1.5x), DRAWS 591, SCALE? 0.251 m, TEX 4096px, TEXMB 511 | decimate to 60k; atlas materials (591 draws to ≤12); check scale (largest side 0.251 m; x100 would give 25.1 m); downscale textures to 2K | 11-11 |
| Infantry Fighting Vehicle - IFV | Tom Zimmermann | OK | vehicle | 17.1k | 1 | 4096 | 255 | 415×519×874 | SCALE? 874 m, TEX 4096px, TEXMB 255 | check scale (largest side 874 m; x0.01 would give 8.74 m); downscale textures to 2K | 11-08 |
| iPad Mini | Graham Rust | REJECT: Standard/paid licence | prop | 438 | 1 | 1024 | 12 | 20×13.5×0.7 | LIC-REJECT | reject (licence: Standard/paid licence) | 11-03 |
| Junk And Scraps Package | EldersCrawler | OK | prop | 4.2k | 15 | 2048 | 331 | 8.05×1.62×8.05 | DRAWS 15, SPEC-GLOSS, TEXMB 331 | atlas materials (15 draws to ≤12); convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 1K | 11-08 |
| large sandstone blocks 01 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 3.02×3.02×3.02 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| LCT 3000 '95 - Low poly model | Daniel Zhabotinsky | OK | prop | 18.9k | 27 | 2048 | 141 | 6.02×2.86×2.63 | TRIS>15k (1.3x), DRAWS 27, TEXMB 141 | decimate to 15k; atlas materials (27 draws to ≤12); downscale textures to 1K | 11-08 |
| Lifeguard Tower | Sololopenko | OK | building | 6.0k | 2 | 2048 | 128 | 0.525×0.555×0.759 | SCALE? 0.759 m, TEXMB 128 | check scale (largest side 0.759 m; x100 would give 75.9 m); downscale textures to 2K | 11-11 |
| Lightbody '90 MD Tow Truck - Low poly model | Daniel Zhabotinsky | OK | vehicle | 26.1k | 29 | 2048 | 162 | 5.66×1.97×2 | DRAWS 29, TEXMB 162 | atlas materials (29 draws to ≤12); downscale textures to 2K | 11-08 |
| Locomotive Storage Building | CommonSpence | OK | building | 255 | 1 | 4096 | 128 | 16.3×9.89×27.2 | TEX 4096px, TEXMB 128 | downscale textures to 2K | 11-08 |
| Log - Low Poly | Tudypie | OK | prop | 148 | 2 | - | 0 | 4.66×1.05×1.83 | - | use as-is | 11-04 |
| Log pile (game ready asset) | Pixel Life | OK | prop | 2.0k | 1 | 2048 | 64 | 3.11×0.585×1.11 | TEXMB 64 | downscale textures to 1K | 11-08 |
| Logging Truck | peter54 | OK | vehicle | 499.1k | 10 | 8192 | 340 | 48.8×14.3×15.5 | TRIS>80k (6.2x), TEX 8192px, TEXMB 340 | use only as far hero piece, or reject (6x budget); downscale textures to 2K | 11-09 |
| Lookout Post/Tower | Eliplays | OK | building | 15.6k | 59 | - | 0 | 6.7×7.78×8.15 | DRAWS 59 | atlas materials (59 draws to ≤12) | 11-04 |
| Loose Sand \| Tile Texture | CATholic | OK | prop | 1032.5k | 11 | 2048 | 64 | 2×2×14 | TRIS>15k (68.8x), TEXMB 64 | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K | 11-04 |
| Low Poly - Power Pole | tadeus | OK | prop | 2.9k | 1 | - | 0 | 1.89e+03×2.61e+03×293 | SCALE? 2.61e+03 m | check scale (largest side 2.61e+03 m; x0.01 would give 26.1 m) | 11-09 |
| Low Poly Airliner | Mauro3D | OK | prop | 3.5k | 8 | - | 0 | 19.8×6.54×20.8 | - | use as-is | 11-08 |
| Low Poly Archery Target | Misfit\_Games | OK | prop | 132 | 4 | - | 0 | 0.729×3.95×2 | - | use as-is | 11-09 |
| Low Poly Billboard Sign - Standard | JeffK | OK | prop | 340 | 2 | 2048 | 16 | 18.7×17.7×4.51 | - | use as-is | 11-04 |
| Low Poly Boat | YeeDev | OK | prop | 646 | 2 | - | 0 | 2.17×0.774×4.14 | - | use as-is | 11-09 |
| Low Poly Camping | tolotedesign | OK | prop | 8.5k | 54 | 2048 | 426 | 152×120×151 | DRAWS 54, SCALE? 152 m, TEXMB 426 | atlas materials (54 draws to ≤12); check scale (largest side 152 m; x0.01 would give 1.52 m); downscale textures to 1K | 11-04 |
| Low Poly Cargo Ship | Javier\_Fernandez | OK | prop | 2.4k | 1 | 8192 | 1021 | 790×1.31e+03×4.2e+03 | SCALE? 4.2e+03 m, TEX 8192px, TEXMB 1021 | check scale (largest side 4.2e+03 m); downscale textures to 1K | 11-08 |
| Low Poly Factory | Fishboe | OK | building | 8.8k | 1 | 128 | 0 | 10.2×13.4×12.4 | - | use as-is | 11-09 |
| Low poly factory building | zubenko78 | OK | building | 552 | 1 | 1024 | 5 | 10.7×11×19.2 | - | use as-is | 11-09 |
| Low Poly Game Ready Armor Vest | DanlyVostok | OK | prop | 5.4k | 2 | 4096 | 681 | 0.7×0.604×0.57 | SPEC-GLOSS, TEX 4096px, TEXMB 681 | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 1K | 11-04 |
| Low Poly Game Ready Military Tactical Backpack | DanlyVostok | OK | prop | 2.7k | 2 | 4096 | 681 | 0.531×0.697×0.667 | SPEC-GLOSS, TEX 4096px, TEXMB 681 | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 1K | 11-04 |
| Low Poly Humvee FREE ⧉ | MadTrollStudio | OK | prop | 8.1k | 1 | 64 | 0 | 4.68×2×2.7 | - | use as-is | 11-08 |
| Low Poly Log Pile Game Ready | -Arthur- | OK | prop | 8.4k | 1 | 4096 | 255 | 14.9×7.35×24.6 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-08 |
| Low Poly Mannequin Free | W3DGE | OK | prop | 1.9k | 1 | - | 0 | 0.968×2.57×0.486 | - | use as-is | 11-11 |
| Low Poly Military Building - Game Ready | 3RDimens | OK | building | 2.3k | 24 | 1024 | 128 | 19.9×4.09×12.9 | DRAWS 24, TEXMB 128 | atlas materials (24 draws to ≤12); downscale textures to 2K | 11-09 |
| Low Poly Oxygen Tank | Chidambhar Swaroop | OK | prop | 4.6k | 1 | 2048 | 43 | 0.379×1.29×0.392 | TEXMB 43 | downscale textures to 1K | 11-09 |
| low poly phone booth | creosine | OK | prop | 637 | 2 | 2048 | 128 | 1.06e+03×2.04e+03×1.06e+03 | SCALE? 2.04e+03 m, TEXMB 128 | check scale (largest side 2.04e+03 m; x0.01 would give 20.4 m); downscale textures to 1K | 11-11 |
| Low Poly Portuguese Chapel | lexferreira89 | OK | prop | 3.1k | 4 | 1024 | 16 | 7.78×6.32×4.4 | - | use as-is | 11-08 |
| Low Poly Sawmill | REDIZIT | OK | prop | 6.6k | 51 | 4 | 0 | 10.5×6.13×11.4 | DRAWS 51 | atlas materials (51 draws to ≤12) | 11-09 |
| Low Poly Store Shelves and Supermarket Rack Pack | Ankitimation | OK | kit | 35.4k (12 pcs, max 10.5k) | 69 | - | 0 | 31.3×2.81×1.49 | MATS 17 | atlas materials across kit (17 materials) | 11-11 |
| Low-Poly Buoy | TepidGames | OK | prop | 384 | 3 | - | 0 | 1.9×4.8×2 | - | use as-is | 11-09 |
| Low-Poly Canoe | Osaze Shears | OK | prop | 1.1k | 3 | - | 0 | 12.7×1.6×2.34 | - | use as-is | 11-09 |
| Low-poly Military Vehicles pack | MedSamer | OK | vehicle-kit | 3.7k (5 pcs, max 1.0k) | 5 | 512 | 3 | 22.7×3.04×9.63 | - | use as-is | 11-09 |
| Lowpoly Office Kit ⧉ | EVO\_MK031 | OK | kit | 3.6k (46 pcs, max 304) | 78 | - | 0 | 14.4×3.66×10.8 | - | use as-is | 11-11 |
| Lowpoly playground | sieminskaola | OK | prop | 1.4k | 1 | 2048 | 21 | 150×120×113 | SCALE? 150 m | check scale (largest side 150 m; x0.01 would give 1.5 m) | 11-04 |
| Lowpoly Store/Supermarket Props | AspectStudios | OK | kit | 5.8k (12 pcs, max 1.6k) | 35 | 512 | 1 | 1.67×2.31×15.5 | - | use as-is | 11-11 |
| LPC Plate Carrier | WooTech | OK | prop | 972 | 1 | 2 | 0 | 2.33×3.33×2.06 | SPEC-GLOSS | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension) | 11-04 |
| M1 Vietnamese Rangers | nghiakua06 | OK | prop | 21.3k | 56 | 4096 | 255 | 0.228×0.287×0.269 | TRIS>15k (1.4x), DRAWS 56, TEX 4096px, TEXMB 255 | decimate to 15k; atlas materials (56 draws to ≤12); downscale textures to 1K | 11-03 |
| M4/AR-15 Carry Handle Sight attachment | SSMProductions | OK | fps | 536 | 1 | - | 0 | 5.27×1.28×0.708 | - | use as-is | 11-01 |
| M4A1 Assault Rifle Game Ready | polupan.andrew | OK | fps | 28.2k | 1 | 2048 | 64 | 0.325×1.72×4.84 | - | use as-is | 11-01 |
| Mansion 5 | aitortilla01 | OK | prop | 5.2k | 1 | 1024 | 8 | 6.21e+03×1.09e+03×8.82e+03 | SCALE? 8.82e+03 m, SPEC-GLOSS | check scale (largest side 8.82e+03 m); convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension) | 11-08 |
| Massive Industrial Mining Scene | dok11 | OK | prop | 2999.8k | 38 | 8192 | 1702 | 131×10.6×115 | TRIS>15k (200.0x), DRAWS 38, SCALE? 131 m, TEX 8192px, TEXMB 1702 | decimate to 15k (heavy: 200x) or reject; atlas materials (38 draws to ≤12); check scale (largest side 131 m; x0.01 would give 1.31 m); downscale textures to 1K | 11-09 |
| Mediterranean Home | shirlanne | OK | prop | 90.9k | 17 | 1024 | 13 | 1.17e+03×406×689 | TRIS>15k (6.1x), DRAWS 17, SCALE? 1.17e+03 m | decimate to 15k (heavy: 6x) or reject; atlas materials (17 draws to ≤12); check scale (largest side 1.17e+03 m; x0.01 would give 11.7 m) | 11-11 |
| Mediterranean House 28 | web.partner.create | OK | building | 31.8k | 9 | 8192 | 362 | 8.27e+03×4.91e+03×5.85e+03 | SCALE? 8.27e+03 m, TEX 8192px, TEXMB 362 | check scale (largest side 8.27e+03 m; x0.01 would give 82.7 m); downscale textures to 2K | 11-11 |
| Metal Gates | Gunnar Correa | OK | prop | 2.1k | 4 | 1024 | 32 | 516×200×10 | SCALE? 516 m, TEXMB 32 | check scale (largest side 516 m; x0.01 would give 5.16 m); downscale textures to 1K | 11-11 |
| Metaretail: Gondola Rack Clothing | vmmaniac | OK | prop | 5.9k | 49 | 2048 | 23 | 0.63×0.579×0.199 | DRAWS 49 | atlas materials (49 draws to ≤12) | 11-11 |
| MICH 2001 military helmet ⧉ | HaizorWill | OK | prop | 2.1k | 1 | 2048 | 64 | 0.2×0.323×0.31 | SPEC-GLOSS, TEXMB 64 | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 1K | 11-04 |
| Military Armor 3D Model | Exactly | OK | prop | 21.0k | 1 | 4096 | 85 | 0.889×1×0.728 | TRIS>15k (1.4x), TEX 4096px, TEXMB 85 | decimate to 15k; downscale textures to 1K | 11-04 |
| MILITARY CAMP TENTS ⭐ | Maxime GUINARD | OK | building | 4.5k | 1 | - | 0 | 7.54×3.15×7.54 | - | use as-is | 11-09 |
| Military concrete barrier | pierre\_roger | OK | prop | 485 | 5 | 4096 | 255 | 148×499×200 | SCALE? 499 m, TEX 4096px, TEXMB 255 | check scale (largest side 499 m; x0.01 would give 4.99 m); downscale textures to 1K | 11-02 |
| Military Container | fedorzabelin | OK | prop | 16.1k | 4 | 2048 | 64 | 12×4.25×3.69 | TRIS>15k (1.1x), TEXMB 64 | decimate to 15k; downscale textures to 1K | 11-02 |
| Military Control Building - Game Ready | 3RDimens | OK | building | 3.1k | 36 | 1024 | 165 | 28.5×9.97×18.5 | DRAWS 36, TEXMB 165 | atlas materials (36 draws to ≤12); downscale textures to 2K | 11-09 |
| Military Crate - 4096px² | Mark Peters | OK | prop | 43.5k | 1 | 4096 | 255 | 2.86×0.98×1.54 | TRIS>15k (2.9x), TEX 4096px, TEXMB 255 | decimate to 15k; downscale textures to 1K | 11-02 |
| Military Helmet ⧉ | ED BOX | OK | prop | 10.0k | 1 | 4096 | 255 | 8.11×8.27×7.95 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-04 |
| Military Tactical Backpack ⧉ | Liam3D | OK | prop | 1.5k | 1 | 4096 | 255 | 0.75×0.85×0.524 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-04 |
| Military Trucks | Nuclearwinter94 | OK | vehicle | 58.6k | 15 | 2048 | 21 | 6.14×2.98×6.07 | DRAWS 15 | atlas materials (15 draws to ≤12) | 11-02 |
| Military watchtower #1 | zachari-blinn | OK | building | 4.0k | 1 | 2048 | 64 | 619×930×606 | SCALE? 930 m | check scale (largest side 930 m; x0.01 would give 9.3 m) | 11-11 |
| Mine cart Rusted | Gustavo Simas | OK | prop | 7.5k | 3 | 2048 | 144 | 0.949×0.844×2 | TEXMB 144 | downscale textures to 1K | 11-11 |
| Modern House Interior + Exterior \[FREE\] | Fazeel.Saeed | OK | building | 107.3k | 21 | 4096 | 149 | 5.16e+03×927×2.18e+03 | TRIS>60k (1.8x), DRAWS 21, SCALE? 5.16e+03 m, TEX 4096px, TEXMB 149 | decimate to 60k; atlas materials (21 draws to ≤12); check scale (largest side 5.16e+03 m; x0.01 would give 51.6 m); downscale textures to 2K | 11-11 |
| Modern luxury villa house building with pool | saeedakbari | OK | building | 44.5k | 334 | 2048 | 208 | 35.1×9.73×35.4 | DRAWS 334, SPEC-GLOSS, TEXMB 208 | atlas materials (334 draws to ≤12); convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 2K | 11-11 |
| Modern Outdoor Swimming Pool | Virtualverse | OK | prop | 3.7k | 14 | 512 | 3 | 16.4×4.5×11.9 | DRAWS 14 | atlas materials (14 draws to ≤12) | 11-11 |
| Modern Tactical Vest / Plate Carrier | Exactly | OK | prop | 29.4k | 1 | 4096 | 85 | 0.83×1×0.917 | TRIS>15k (2.0x), TEX 4096px, TEXMB 85 | decimate to 15k; downscale textures to 1K | 11-03 |
| Modular Motel | Wardster | OK | building-kit | 28.6k (48 pcs, max 6.3k) | 48 | 2048 | 722 | 24.5×4.03×10.9 | MATS 15, TEXMB 722 | atlas materials across kit (15 materials); downscale textures to 2K | 11-12 |
| Modular Pipes | DJMaesen | OK | kit | 8.5k (30 pcs, max 1.5k) | 34 | 2048 | 64 | 1.7e+03×570×703 | - | use as-is | 11-11 |
| Mossy Ground \| Tile Texture | CATholic | OK | prop | 258.4k | 5 | 2048 | 64 | 2×2×14 | TRIS>15k (17.2x), TEXMB 64 | decimate to 15k (heavy: 17x) or reject; downscale textures to 1K | 11-04 |
| Mossy old tree log | Julian Malik | OK | tree | 20.4k | 1 | 4096 | 255 | 1.53×0.575×1.22 | PIECE>10k (2.0x), TEX 4096px, TEXMB 255 | decimate each tree to ≤10k + impostor/billboard LOD; instance (InstancedMesh); downscale textures to 1K | 11-08 |
| North bridge (Kyiv) | S\_F\_Musashi | OK | building | 2.7k | 1 | 2048 | 21 | 55×119×298 | - | use as-is | 11-11 |
| Oil Drums | Oliver Triplett | OK | prop | 7.3k | 21 | 2048 | 192 | 1.96×1.08×1.79 | DRAWS 21, TEXMB 192 | atlas materials (21 draws to ≤12); downscale textures to 1K | 11-08 |
| Old Awning | exiS7-Gs | OK | prop | 33.2k | 3 | 8192 | 1021 | 10.3×4.64×4.77 | TRIS>15k (2.2x), TEX 8192px, TEXMB 1021 | decimate to 15k; downscale textures to 1K | 11-08 |
| Old bridge | NoodlePoodle | OK | building | 5.5k | 2 | 4096 | 255 | 263×459×1.9e+03 | SCALE? 1.9e+03 m, TEX 4096px, TEXMB 255 | check scale (largest side 1.9e+03 m; x0.01 would give 19 m); downscale textures to 2K | 11-08 |
| Old car toy | Léonard\_Doye Alias Leoskateman | OK | prop | 3.7k | 1 | 2048 | 64 | 5.93×4.4×12.9 | TEXMB 64 | downscale textures to 1K | 11-04 |
| Old hut | visserlevinap | OK | prop | 2.4k | 1 | 4096 | 170 | 5.43×4.07×6.78 | SPEC-GLOSS, TEX 4096px, TEXMB 170 | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 1K | 11-09 |
| Old Industrial Building | Hrvoje Wächter | OK | building | 67.1k | 5 | 8192 | 346 | 1.16e+03×1.52e+03×3.45e+03 | TRIS>60k (1.1x), SCALE? 3.45e+03 m, TEX 8192px, TEXMB 346 | decimate to 60k; check scale (largest side 3.45e+03 m; x0.01 would give 34.5 m); downscale textures to 2K | 11-11 |
| Old Sawmill (industrial building) ⧉ | simple and extensive design | OK | building | 41.5k | 6 | 1024 | 32 | 246×66.8×369 | - | use as-is | 11-08 |
| Old Shack | Myjato | OK | prop | 1.5k | 48 | 4096 | 140 | 0.027×0.018×0.029 | DRAWS 48, SCALE? 0.029 m, TEX 4096px, TEXMB 140 | atlas materials (48 draws to ≤12); check scale (largest side 0.029 m; x100 would give 2.9 m); downscale textures to 1K | 11-09 |
| Old Soviet Transformer Low-Poly | MrUnity | OK | prop | 2.6k | 4 | 2048 | 255 | 0.99×1.97×0.435 | TEXMB 255 | downscale textures to 1K | 11-08 |
| Old Suspension Bridge | hakankucukal | OK | building | 33.5k | 1 | 4096 | 255 | 1.64×2.3×15 | TEX 4096px, TEXMB 255 | downscale textures to 2K | 11-11 |
| Old Well with Hanging Bucket | Glowbox 3D | OK | prop | 7.3k | 1 | 2048 | 64 | 717×1.2e+03×748 | SCALE? 1.2e+03 m, TEXMB 64 | check scale (largest side 1.2e+03 m; x0.01 would give 12 m); downscale textures to 1K | 11-08 |
| Old West Water Tower | Suryxin | OK | building | 1.9k | 16 | 2048 | 128 | 3.2×4.4×3.01 | DRAWS 16, TEXMB 128 | atlas materials (16 draws to ≤12); downscale textures to 2K | 11-04 |
| Old Wooden House | Rescue3D Assets | OK | building | 453 | 1 | 2048 | 43 | 10.3×6.13×7.82 | - | use as-is | 11-11 |
| Old Wooden Watchtower (House 3) | Blenderust | OK | building | 660 | 15 | 2048 | 149 | 2.19×6.92×2.19 | DRAWS 15, TEXMB 149 | atlas materials (15 draws to ≤12); downscale textures to 2K | 11-11 |
| Old, dirty, stacked tires, PBR textures \[free\] | ZiemniaQ | OK | prop | 2.5k | 1 | 2048 | 64 | 1.42×1.47×1.42 | TEXMB 64 | downscale textures to 1K | 11-08 |
| Oselvar wooden boat. | Arkikon | OK | prop | 19.0k | 5 | 1024 | 49 | 2.1×1.55×8.11 | TRIS>15k (1.3x), TEXMB 49 | decimate to 15k; downscale textures to 1K | 11-11 |
| Outdoor Vending Machines | Caboose3d | OK | prop | 1.3k | 20 | 2048 | 255 | 41.8×72×89.3 | DRAWS 20, SCALE? 89.3 m, TEXMB 255 | atlas materials (20 draws to ≤12); check scale (largest side 89.3 m; x0.01 would give 0.893 m); downscale textures to 1K | 11-08 |
| Outhouse | Strifey7 | OK | building | 1.1k | 6 | 2048 | 43 | 122×218×146 | - | use as-is | 11-08 |
| Pallet Racking | Erroratten | OK | prop | 1.3k | 4 | 2048 | 255 | 6.2×4×7.24 | TEXMB 255 | downscale textures to 1K | 11-11 |
| Pallet Racking Staircase | Erroratten | OK | prop | 4.2k | 6 | 2048 | 383 | 8.6×4.2×17.2 | SPEC-GLOSS, TEXMB 383 | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 1K | 11-11 |
| Paradise mansion | Yannoob | OK | prop | 67.9k | 50 | 1024 | 371 | 2.96×4.24×3 | TRIS>15k (4.5x), DRAWS 50, SPEC-GLOSS, TEXMB 371 | decimate to 15k; atlas materials (50 draws to ≤12); convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 1K | 11-11 |
| Park Bench | RBG\_illustrations | OK | prop | 2.9k | 2 | 2048 | 128 | 205×60.1×47 | SCALE? 205 m, TEXMB 128 | check scale (largest side 205 m; x0.01 would give 2.05 m); downscale textures to 1K | 11-08 |
| patterned plaster wall 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 1.81×1.82×1.82 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| Phone Booth | Mountrise | OK | prop | 1.7k | 3 | 1024 | 36 | 3.65×8.78×3.79 | TEXMB 36 | downscale textures to 1K | 11-04 |
| Phone booth | YJ\_ | OK | prop | 9.0k | 4 | 4096 | 596 | 28.4×73.3×28.4 | SCALE? 73.3 m, TEX 4096px, TEXMB 596 | check scale (largest side 73.3 m; x0.01 would give 0.733 m); downscale textures to 1K | 11-08 |
| Piaggio P-166 Portofino wrecked Airplane | robertmasiboda | OK | vehicle | 80.4k | 1 | 4096 | 170 | 4×3.48×13.4 | TRIS>80k (1.0x), TEX 4096px, TEXMB 170 | decimate to 80k; downscale textures to 2K | 11-08 |
| Picnic Table - Low Poly | Derek Flanagan | OK | prop | 224 | 1 | 2048 | 64 | 1.57×0.773×1.6 | TEXMB 64 | downscale textures to 1K | 11-04 |
| Port crane "Sokol" | Vitaliy Kovalchuk | OK | vehicle | 14.4k | 36 | 4096 | 383 | 43×42.3×19.7 | DRAWS 36, ANIM 1, TEX 4096px, TEXMB 383 | atlas materials (36 draws to ≤12); downscale textures to 2K | 11-08 |
| Porta Potty \| Porta Loo | Sean Thomas | OK | prop | 2.1k | 26 | 4096 | 255 | 0.968×2×0.978 | DRAWS 26, TEX 4096px, TEXMB 255 | atlas materials (26 draws to ≤12); downscale textures to 1K | 11-08 |
| Powe Poles | Gunnar Correa | OK | prop | 3.8k | 13 | 1024 | 181 | 2.36e+03×728×2.36e+03 | DRAWS 13, SCALE? 2.36e+03 m, TEXMB 181 | atlas materials (13 draws to ≤12); check scale (largest side 2.36e+03 m; x0.01 would give 23.6 m); downscale textures to 1K | 11-04 |
| Prison low poly | Violetta.Nanadze | OK | building | 73.1k | 268 | 1024 | 5 | 221×258×228 | TRIS>60k (1.2x), DRAWS 268, SKINNED, ANIM 1, SPEC-GLOSS | decimate to 60k; atlas materials (268 draws to ≤12); convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension) | 11-09 |
| Prison Wall Bed | chuZz | OK | prop | 3.0k | 1 | 512 | 5 | 125×79.6×312 | SCALE? 312 m | check scale (largest side 312 m; x0.01 would give 3.12 m) | 11-09 |
| Propane Tanks | Caboose3d | OK | kit | 12.9k (5 pcs, max 3.2k) | 48 | 2048 | 702 | 180×58.4×79 | TEXMB 702 | downscale textures to 1K | 11-08 |
| Pylon | rhcreations | OK | prop | 5.8k | 6 | 1024 | 20 | 10.4×20.2×5.14 | SPEC-GLOSS | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension) | 11-08 |
| Quartzites rockface - Drone photogrammetry | sr-prod | OK | prop | 417.7k | 7 | 8192 | 340 | 165×156×216 | TRIS>15k (27.8x), SCALE? 216 m, TEX 8192px, TEXMB 340 | decimate to 15k (heavy: 28x) or reject; check scale (largest side 216 m; x0.01 would give 2.16 m); downscale textures to 1K | 11-09 |
| Radio tower | Gunnar Correa | OK | building | 2.2k | 13 | 1024 | 43 | 157×1.25e+03×157 | DRAWS 13, SCALE? 1.25e+03 m | atlas materials (13 draws to ≤12); check scale (largest side 1.25e+03 m; x0.01 would give 12.5 m) | 11-04 |
| Railway Crossing Signal | YaroDan | OK | prop | 13.6k | 6 | 1024 | 64 | 2.77×4.62×0.673 | TEXMB 64 | downscale textures to 1K | 11-08 |
| Railway track train route Railway parts rail | ahmagh2e | OK | prop | 5.4k | 1 | 2048 | 64 | 4×0.372×2.81 | TEXMB 64 | downscale textures to 1K | 11-08 |
| Refrigerated Trailer (Custom Model) | matthew13482 | OK | prop | 408 | 34 | 512 | 1 | 1.69×2.81×8.69 | DRAWS 34 | atlas materials (34 draws to ≤12) | 11-08 |
| River Rocks Water Scan | Per's Scan Collection | OK | prop | 13.8k | 2 | 4096 | 511 | 3.83×3.34×5.71 | TEX 4096px, TEXMB 511 | downscale textures to 1K | 11-08 |
| Road Safety Pole – Low Poly Traffic Delineator | KenVeel | OK | prop | 1.9k | 1 | 4096 | 255 | 0.466×1.11×0.403 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-12 |
| Roadside Motel ⧉ | novusod | OK | building | 14.6k | 19 | 512 | 7 | 50.3×12.8×42.6 | DRAWS 19 | atlas materials (19 draws to ≤12) | 11-11 |
| Rock Cliff ( Tirán - Moaña) | Alexandre González Rivas | OK | prop | 47.8k | 2 | 4096 | 255 | 5.82×2.84×13.9 | TRIS>15k (3.2x), TEX 4096px, TEXMB 255 | decimate to 15k; downscale textures to 1K | 11-11 |
| Rock Scan - 15 | Loïc Norgeot | OK | prop | 5.0k | 1 | 4096 | 255 | 4.74×4.74×2.82 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-11 |
| Rock \| Tile Texture | CATholic | OK | prop | 1032.5k | 11 | 2048 | 64 | 2×2×14 | TRIS>15k (68.8x), TEXMB 64 | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K | 11-04 |
| Rock\_Salines\_2 | Maxim.O | OK | prop | 105.3k | 2 | 4096 | 170 | 4.74×1.16×4.28 | TRIS>15k (7.0x), TEX 4096px, TEXMB 170 | decimate to 15k (heavy: 7x) or reject; downscale textures to 1K | 11-08 |
| Rocks set2 | DJMaesen | OK | prop | 40.0k | 12 | 4096 | 319 | 5.12e+03×1.16e+03×5.12e+03 | TRIS>15k (2.7x), SCALE? 5.12e+03 m, SPEC-GLOSS, TEX 4096px, TEXMB 319 | decimate to 15k; check scale (largest side 5.12e+03 m); convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 1K | 11-08 |
| Roll Door | HippoStance | OK | prop | 25.5k | 6 | 2048 | 80 | 7.27×2.42×0.75 | TRIS>15k (1.7x), TEXMB 80 | decimate to 15k; downscale textures to 1K | 11-02 |
| Rooftop Ventilations, Air Conditioning Units | Oskar3D\_ | OK | prop | 3.5k | 3 | 4096 | 766 | 32.9×11.9×26.3 | TEX 4096px, TEXMB 766 | downscale textures to 1K | 11-08 |
| Runway Concrete \| Tile Texture | CATholic | OK | building | 64.8k | 3 | 2048 | 64 | 2×2×14 | TRIS>60k (1.1x) | decimate to 60k | 11-04 |
| Rusted Farm Tools | FrodoUndead | OK | prop | 1.7k | 5 | 1024 | 16 | 15×10.3×1.65 | - | use as-is | 11-04 |
| Rusty Abandoned Truck with Interior - Game Ready | Rashad Ibrahimli | OK | vehicle | 9.7k | 16 | 4096 | 255 | 14.6×12×31.1 | DRAWS 16, TEX 4096px, TEXMB 255 | atlas materials (16 draws to ≤12); downscale textures to 2K | 11-08 |
| Rusty Fire Hydrant | tedpermana | OK | prop | 15.0k | 2 | 4096 | 255 | 16.9×34.6×15.5 | TRIS>15k (1.0x), TEX 4096px, TEXMB 255 | decimate to 15k; downscale textures to 1K | 11-08 |
| Rusty Old Newspaper Vending Machine | chrisg4919 | OK | prop | 872 | 1 | 4096 | 255 | 65.3×169×75.1 | SCALE? 169 m, TEX 4096px, TEXMB 255 | check scale (largest side 169 m; x0.01 would give 1.69 m); downscale textures to 1K | 11-08 |
| Sandbag Wall - 24MB | adventurer | OK | prop | 186.7k | 21 | 2048 | 64 | 8.01×1.33×0.867 | TRIS>15k (12.4x), DRAWS 21, TEXMB 64 | decimate to 15k (heavy: 12x) or reject; atlas materials (21 draws to ≤12); downscale textures to 1K | 11-02 |
| Sandbags or Ricebags | BytesCrafter | OK | prop | 2.8k | 4 | 512 | 1 | 89.8×86.5×74 | SKINNED, SCALE? 89.8 m | check scale (largest side 89.8 m; x0.01 would give 0.898 m) | 11-02 |
| sandstone cracks 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 2.01×2.03×2.02 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| Satellite Comms | Duane's Mind | OK | prop | 8.7k | 3 | 1024 | 11 | 11.6×19.4×15.7 | - | use as-is | 11-08 |
| Scaffold Stairs Steel construction | dchant design | OK | prop | 79.4k | 151 | 2048 | 21 | 30.9×35.1×10.9 | TRIS>15k (5.3x), DRAWS 151 | decimate to 15k; atlas materials (151 draws to ≤12) | 11-11 |
| Scarecrow | Baardus | OK | prop | 1.7k | 1 | 2048 | 21 | 78.9×105×18.2 | SCALE? 105 m | check scale (largest side 105 m; x0.01 would give 1.05 m) | 11-04 |
| school building | swjeta | OK | building | 20.4k | 9 | 1024 | 20 | 2.6×0.461×2.21 | - | use as-is | 11-08 |
| Scrap metal (lowpoly) | Zuckergelee | OK | prop | 2.7k | 1 | 1024 | 16 | 2×0.774×1.31 | - | use as-is | 11-08 |
| Seating \| Bleacher | Baskot | OK | prop | 632 | 1 | 1024 | 16 | 0.173×0.151×0.202 | - | use as-is | 11-08 |
| Security/Parking Booth - Game Asset | AspectStudios | OK | prop | 2.0k | 8 | 2048 | 255 | 2.85×2.62×2.97 | TEXMB 255 | downscale textures to 1K | 11-11 |
| Sedimentary Rock Formation | Hristo | OK | prop | 200.9k | 2 | 4096 | 170 | 9.54×5.04×6.22 | TRIS>15k (13.4x), TEX 4096px, TEXMB 170 | decimate to 15k (heavy: 13x) or reject; downscale textures to 1K | 11-11 |
| Semi Truck Baked | 3DE\_Study | OK | vehicle | 40.0k | 8 | 4096 | 575 | 4.75×5.27×10 | TEX 4096px, TEXMB 575 | downscale textures to 2K | 11-08 |
| shipwreck low poly | compost the second | OK | prop | 4.7k | 4 | 2048 | 21 | 13.6×11.4×17.8 | SKINNED, ANIM 1 | use as-is | 11-11 |
| Shopping Cart | AdrianXY | OK | building | 2.2k | 3 | - | 0 | 0.56×0.876×0.906 | SCALE? 0.906 m | check scale (largest side 0.906 m; x100 would give 90.6 m) | 11-08 |
| Shvan '92 Ambulance - Low Poly model | Daniel Zhabotinsky | OK | prop | 25.9k | 28 | 4096 | 226 | 5.02×2.26×2.35 | TRIS>15k (1.7x), DRAWS 28, TEX 4096px, TEXMB 226 | decimate to 15k; atlas materials (28 draws to ≤12); downscale textures to 1K | 11-08 |
| Simon and Mouchel Grain Silos | cathal35sf | OK | building | 1.2k | 21 | 1024 | 11 | 36.6×44.5×51.5 | DRAWS 21 | atlas materials (21 draws to ≤12) | 11-04 |
| SIMPLE GUARD HOUSE | proleed | OK | building | 4.6k | 6 | - | 0 | 3.5e+03×3.62e+03×4e+03 | SCALE? 4e+03 m | check scale (largest side 4e+03 m; x0.01 would give 40 m) | 11-11 |
| Simple Wooden Pier or Dock | Jungle Jim | OK | building | 6.3k | 5 | 1024 | 43 | 8.25×10.9×24.3 | - | use as-is | 11-04 |
| Slab Culvert | gokuartz | OK | prop | 956 | 41 | 256 | 2 | 389×106×406 | DRAWS 41, SCALE? 406 m | atlas materials (41 draws to ≤12); check scale (largest side 406 m; x0.01 would give 4.06 m) | 11-09 |
| Small Dump Truck | Firechu\_2011 | OK | vehicle | 5.0k | 1 | - | 0 | 17.4×15×27.1 | - | use as-is | 11-09 |
| Small Motorboat | Timon Matthews | OK | prop | 1.2k | 1 | 2048 | 21 | 6.04×1.32×2.01 | SPEC-GLOSS | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension) | 11-11 |
| Small Villa | RenderRite | OK | prop | 113.9k | 58 | 2048 | 55 | 35.5×11.3×28.8 | TRIS>15k (7.6x), DRAWS 58, TEXMB 55 | decimate to 15k (heavy: 8x) or reject; atlas materials (58 draws to ≤12); downscale textures to 1K | 11-11 |
| Sniper | stevennvh | OK | fps | 16.1k | 14 | 2048 | 47 | 6.57×10.7×53.3 | DRAWS 14, SCALE? 53.3 m | atlas materials (14 draws to ≤12); check scale (largest side 53.3 m; x0.01 would give 0.533 m) | 11-03 |
| Snow \| Tile Texture | CATholic | OK | prop | 258.4k | 5 | 2048 | 64 | 2×2×14 | TRIS>15k (17.2x), TEXMB 64 | decimate to 15k (heavy: 17x) or reject; downscale textures to 1K | 11-04 |
| Steel stair | bighlerm8888 | OK | prop | 16.7k | 301 | - | 0 | 2.38×8.71×4.95 | TRIS>15k (1.1x), DRAWS 301 | decimate to 15k; atlas materials (301 draws to ≤12) | 11-11 |
| Steinbruch Aumühle, Nördlinger Ries, Germany | outcropwizard | OK | prop | 1471.3k | 52 | 4096 | 851 | 0.101×0.043×0.171 | TRIS>15k (98.1x), DRAWS 52, TEX 4096px, TEXMB 851 | decimate to 15k (heavy: 98x) or reject; atlas materials (52 draws to ≤12); downscale textures to 1K | 11-09 |
| Stone Arch Pillars - Ruins | Unreal Designer | OK | prop | 131.0k | 6 | 4096 | 426 | 17.6×4.95×4.1 | TRIS>15k (8.7x), TEX 4096px, TEXMB 426 | decimate to 15k (heavy: 9x) or reject; downscale textures to 1K | 11-08 |
| Stone Crusher AO ⧉ | Vladislav Laryushin | OK | prop | 1.4k | 1 | 512 | 1 | 5.18×3.77×4.8 | - | use as-is | 11-09 |
| Stone wall | Stefan William Rudebjer | OK | prop | 2.0k | 7 | 2048 | 85 | 408×201×159 | SCALE? 408 m, SPEC-GLOSS, TEXMB 85 | check scale (largest side 408 m; x0.01 would give 4.08 m); convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 1K | 11-04 |
| Straw Soil \| Tile Texture | CATholic | OK | prop | 1032.5k | 11 | 2048 | 64 | 2×2×14 | TRIS>15k (68.8x), TEXMB 64 | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K | 11-04 |
| Straw \| TIle Texture | CATholic | OK | prop | 1032.5k | 11 | 2048 | 64 | 2×2×14 | TRIS>15k (68.8x), TEXMB 64 | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K | 11-04 |
| street lamp low poly | ASAD MEHMOOD | OK | tree | 1.4k (3 pcs, max 596) | 3 | 2048 | 85 | 2.12×3.03×0.598 | TEXMB 85 | instance (InstancedMesh); downscale textures to 1K | 11-04 |
| Stránská rock 1 | 3dhdscan | OK | prop | 84.3k | 2 | 8192 | 766 | 43.4×18.9×68.3 | TRIS>15k (5.6x), SCALE? 68.3 m, TEX 8192px, TEXMB 766 | decimate to 15k; check scale (largest side 68.3 m; x0.01 would give 0.683 m); downscale textures to 1K | 11-08 |
| Supermarket Basket | cicinha | OK | prop | 4.9k | 5 | - | 0 | 2.56×2.17×2.05 | SPEC-GLOSS | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension) | 11-11 |
| Supermarket Checkout Counter | doomgirlface | OK | prop | 10.5k | 23 | - | 0 | 3.01×1.08×2.01 | DRAWS 23 | atlas materials (23 draws to ≤12) | 11-11 |
| Suspension Bridge | dannyd16 | OK | building | 7.2k | 43 | 4096 | 128 | 7.91×6.08×16.2 | DRAWS 43, TEX 4096px, TEXMB 128 | atlas materials (43 draws to ≤12); downscale textures to 2K | 11-11 |
| Swimming pool Swim Water Sport | adventurer | OK | prop | 904 | 1 | 2048 | 64 | 55×17.6×115 | SCALE? 115 m, TEXMB 64 | check scale (largest side 115 m; x0.01 would give 1.15 m); downscale textures to 1K | 11-08 |
| T wall barrier | NonoG5 | OK | prop | 490 | 1 | 1024 | 7 | 77.9×203×41.8 | SCALE? 203 m | check scale (largest side 203 m; x0.01 would give 2.03 m) | 11-02 |
| Tactical Explorer Backpack ⧉ | yronthal | OK | prop | 10.0k | 1 | 2048 | 64 | 1.55×1.99×1.39 | TEXMB 64 | downscale textures to 1K | 11-04 |
| Tactical Helmet with Headset (Game-Ready) ⧉ | Exactly | OK | prop | 19.1k | 1 | 4096 | 85 | 0.998×1.06×0.917 | TRIS>15k (1.3x), TEX 4096px, TEXMB 85 | decimate to 15k; downscale textures to 1K | 11-03 |
| Tank Low-Poly # 2 | Sidra | OK | prop | 15.1k | 23 | 4096 | 85 | 1.66×1.39×4.49 | TRIS>15k (1.0x), DRAWS 23, TEX 4096px, TEXMB 85 | decimate to 15k; atlas materials (23 draws to ≤12); downscale textures to 1K | 11-08 |
| Telephone Poles | Caboose3d | OK | prop | 5.3k | 35 | 2048 | 192 | 29.1×31.4×5.4 | DRAWS 35, TEXMB 192 | atlas materials (35 draws to ≤12); downscale textures to 1K | 11-09 |
| Tent | Gajk.Mv | OK | building | 9.2k | 3 | 2048 | 149 | 418×227×284 | SCALE? 418 m, TEXMB 149 | check scale (largest side 418 m; x0.01 would give 4.18 m); downscale textures to 2K | 11-08 |
| Tent | Tactical\_Gamer | OK | building | 553 | 1 | 2048 | 64 | 2.02×1.29×2 | - | use as-is | 11-08 |
| Terrorist 1 Rig | fake gman | OK | fps | 4.5k | 1 | 1024 | 5 | 1.92×2.69×0.665 | SKINNED, ANIM 1 | use as-is | 11-01 |
| Tetrapod | Akihiko Tarutani | OK | prop | 1.4k | 2 | 512 | 1 | 654×636×727 | SCALE? 727 m | check scale (largest side 727 m; x0.01 would give 7.27 m) | 11-11 |
| Texture of old black asphalt highly degraded | Tijerín Art Studio | OK | prop | 1.5k | 1 | 4096 | 170 | 1.32e+03×67×1.32e+03 | SCALE? 1.32e+03 m, TEX 4096px, TEXMB 170 | check scale (largest side 1.32e+03 m; x0.01 would give 13.2 m); downscale textures to 1K | 11-04 |
| The Prison | Veterock | OK | building | 1095.3k | 197 | 4096 | 1609 | 81.3×17.2×60.6 | TRIS>60k (18.3x), DRAWS 197, TEX 4096px, TEXMB 1609 | use only as far hero piece, or reject (18x budget); atlas materials (197 draws to ≤12); downscale textures to 2K | 11-09 |
| the wharf Fishing Harbor Wood\_39\_MB | Mehdi Shahsavan | OK | prop | 35.0k | 4 | 2048 | 213 | 2.4e+03×305×2.39e+03 | TRIS>15k (2.3x), SCALE? 2.4e+03 m, TEXMB 213 | decimate to 15k; check scale (largest side 2.4e+03 m; x0.01 would give 24 m); downscale textures to 1K | 11-11 |
| Tractor - game asset | Igor Bistritski | OK | prop | 2.2k | 6 | - | 0 | 737×528×396 | SCALE? 737 m | check scale (largest side 737 m; x0.01 would give 7.37 m) | 11-04 |
| Traffic Pylon, Delineator Post | goslinjoe | OK | prop | 3.2k | 4 | - | 0 | 0.435×1.07×0.435 | - | use as-is | 11-09 |
| Traffic Signal | youoyouyou | OK | prop | 28.7k | 18 | 1024 | 11 | 7.32×7.03×0.613 | TRIS>15k (1.9x), DRAWS 18 | decimate to 15k; atlas materials (18 draws to ≤12) | 11-08 |
| Train\_vagon | Leafia dev. | OK | prop | 2.1k | 2 | 1024 | 11 | 2.49×13.5×4.19 | SKINNED | use as-is | 11-08 |
| Trampoline | Spark | OK | prop | 1.9k | 2 | 256 | 0 | 2.76×2.03×2.76 | ANIM 1, MORPH | use as-is | 11-04 |
| Trash Can 02 | katykate | OK | prop | 696 | 1 | 2048 | 64 | 0.971×0.896×0.804 | TEXMB 64 | downscale textures to 1K | 11-04 |
| Tree Planter with Grate FREE Low Poly | LordSamueliSolo | OK | tree | 2.2k (5 pcs, max 1.1k) | 5 | 2048 | 64 | 1.56e+03×1.94e+03×1.88e+03 | SCALE? 1.94e+03 m, TEXMB 64 | check scale (largest side 1.94e+03 m; x0.01 would give 19.4 m); instance (InstancedMesh); downscale textures to 1K | 11-08 |
| Union Pacific Railroad Car, Rhyolite | Azad Balabanian | OK | prop | 100.0k | 2 | 8192 | 340 | 9.99×4.19×9.31 | TRIS>15k (6.7x), TEX 8192px, TEXMB 340 | decimate to 15k (heavy: 7x) or reject; downscale textures to 1K | 11-08 |
| Valley Gray Cliff | Maksim Batyrev | OK | prop | 14.9k | 1 | 4096 | 255 | 5.3×7.74×4.25 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-09 |
| Various Low-Poly Street Lights | KMB3D | OK | tree | 10.9k (8 pcs, max 2.4k) | 16 | - | 0 | 19×5.28×3.81 | DRAWS 16 | atlas materials (16 draws to ≤12); instance (InstancedMesh) | 11-09 |
| Vest | Santeri Riikonen | OK | prop | 1.8k | 1 | 4096 | 255 | 1.3×2×1.76 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-04 |
| Villa by the sea | Melina S. | OK | prop | 80.9k | 22 | 4096 | 86 | 13.3×5.8×14 | TRIS>15k (5.4x), DRAWS 22, TEX 4096px, TEXMB 86 | decimate to 15k; atlas materials (22 draws to ≤12); downscale textures to 1K | 11-11 |
| Vintage Gas Pump | Rescue3D Assets | OK | prop | 7.6k | 3 | 4096 | 346 | 0.672×1.83×0.38 | TEX 4096px, TEXMB 346 | downscale textures to 1K | 11-04 |
| Vintage Wind Turbine - GameAsset - Free Download | DavidFalke | OK | prop | 10.6k | 29 | 4096 | 511 | 360×1.04e+03×440 | DRAWS 29, SCALE? 1.04e+03 m, TEX 4096px, TEXMB 511 | atlas materials (29 draws to ≤12); check scale (largest side 1.04e+03 m; x0.01 would give 10.4 m); downscale textures to 1K | 11-08 |
| Vintage Windmill Animated .glb FREE Low Poly | LordSamueliSolo | OK | prop | 5.5k | 17 | 2048 | 90 | 480×480×480 | DRAWS 17, ANIM 1, SCALE? 480 m, TEXMB 90 | atlas materials (17 draws to ≤12); check scale (largest side 480 m; x0.01 would give 4.8 m); downscale textures to 1K | 11-04 |
| Warehouse Storage Racking FBX Low Poly FREE | LordSamueliSolo | OK | building | 27.4k | 17 | 1024 | 96 | 5.04e+03×5.04e+03×5.04e+03 | DRAWS 17, SCALE? 5.04e+03 m | atlas materials (17 draws to ≤12); check scale (largest side 5.04e+03 m; x0.01 would give 50.4 m) | 11-08 |
| Watchtower 01 | Indika Thushara | OK | building | 7.5k | 1 | 1024 | 3 | 59.6×122×53.2 | - | use as-is | 11-11 |
| Water Tank Tower with Stairs | Deepak Singh | OK | prop | 116.6k | 20 | 1024 | 9 | 1.28×1.89×1.28 | TRIS>15k (7.8x), DRAWS 20 | decimate to 15k (heavy: 8x) or reject; atlas materials (20 draws to ≤12) | 11-08 |
| Water Treament Plant | novusod | OK | prop | 19.1k | 5 | 2048 | 11 | 44.8×18.1×107 | TRIS>15k (1.3x), SCALE? 107 m | decimate to 15k; check scale (largest side 107 m; x0.01 would give 1.07 m) | 11-11 |
| Western church - Mobile GameReady | Ali haghshenas | OK | prop | 708 | 65 | 1024 | 11 | 6.93×13×8.44 | DRAWS 65 | atlas materials (65 draws to ≤12) | 11-04 |
| Wet Mud \| Tile Texture | CATholic | OK | prop | 258.4k | 5 | 2048 | 64 | 2×2×14 | TRIS>15k (17.2x), TEXMB 64 | decimate to 15k (heavy: 17x) or reject; downscale textures to 1K | 11-04 |
| WheelChair | Loïc | OK | prop | 8.4k | 1 | 2048 | 64 | 1.39×2×1.9 | TEXMB 64 | downscale textures to 1K | 11-09 |
| Wind sleeve | mira9 | OK | prop | 548 | 1 | 2048 | 43 | 0.597×3.99×1.69 | TEXMB 43 | downscale textures to 1K | 11-08 |
| Wooden barricade | BlackMike | OK | prop | 96 | 4 | 2048 | 64 | 66.3×107×58.9 | SCALE? 107 m, TEXMB 64 | check scale (largest side 107 m; x0.01 would give 1.07 m); downscale textures to 1K | 11-09 |
| Wooden Boat | o0ozexo0o | OK | prop | 1.9k | 1 | 2048 | 44 | 106×46×339 | SCALE? 339 m, TEXMB 44 | check scale (largest side 339 m; x0.01 would give 3.39 m); downscale textures to 1K | 11-04 |
| Wooden House Building | Rescue3D Assets | OK | building | 790 | 1 | 2048 | 43 | 13.3×6.92×9.76 | - | use as-is | 11-11 |
| Wooden Log Cabin | donnichols | OK | building | 8.8k | 8 | 2048 | 340 | 514×368×361 | SCALE? 514 m, TEXMB 340 | check scale (largest side 514 m; x0.01 would give 5.14 m); downscale textures to 2K | 11-09 |
| Wreck of a white motorboat | Оrрндп ЯТG | OK | prop | 49.9k | 2 | 8192 | 681 | 5.33×1.08×1.97 | TRIS>15k (3.3x), TEX 8192px, TEXMB 681 | decimate to 15k; downscale textures to 1K | 11-08 |
| WWII Medical Tent | creationwasteland | OK | building | 7.0k | 1 | 2048 | 64 | 2.37×2.04×3.14 | - | use as-is | 11-09 |

## Duplicates

- **Hangar** (identical files): `0d5ec5fb-hangar.zip`, `540b05da-hangar.zip`
- **Low Poly \| Pallets** (identical files): `fa08f799-low_poly__pallets.zip`, `f002c546-low_poly__pallets.zip`
- **Chemical tank** (identical files): `6a11b06e-chemical_tank.zip`, `7fe5ae57-chemical_tank.zip`
- **Industrial Buildings Set - Low poly models** (identical files): `b3ecb6de-industrial_buildings_set_-_low_poly_models.zip`, `7bf52c92-industrial_buildings_set_-_low_poly_models.zip`, `2e32c16f-industrial_buildings_set_-_low_poly_models.zip`
- **Quarry Conveyor system Kit** (identical files): `4e096432-quarry_conveyor_system_kit.zip`, `fa100261-quarry_conveyor_system_kit.zip`, `88301d1a-quarry_conveyor_system_kit.zip`
- **Gas station** (identical files): `f08c2f36-gas_station.zip`, `a1d89a38-gas_station.zip`
- **Fence pack - (low poly, game ready)** (identical files): `d0f2652b-fence_pack_-_low_poly_game_ready.zip`, `799e7cff-fence_pack_-_low_poly_game_ready.zip`
- **Hay Bales** (identical files): `59b44f0b-hay_bales.zip`, `af09f2c1-hay_bales.zip`
- **Log Cabin + Ruined Version** (identical files): `log_cabin__ruined_version.zip`, `log_cabin__ruined_version_1.zip`
- **Log Pile (Game Ready / 2K PBR)** (identical files): `0e03a918-log_pile_game_ready__2k_pbr.zip`, `c956d28f-log_pile_game_ready__2k_pbr.zip`
- **Privacy Fence Pack (with damaged sections)** (identical files): `fdb088f9-privacy_fence_pack_with_damaged_sections.zip`, `3eabaa3d-privacy_fence_pack_with_damaged_sections.zip`
- **Worn Shed PBR Game-Ready** (identical files): `worn_shed_pbr_game-ready.zip`, `worn_shed_pbr_game-ready_1.zip`, `worn_shed_pbr_game-ready_2.zip`
- **Modular Chain Link Fence Set** (identical files): `2714fc2b-modular_chain_link_fence_set.zip`, `5a994156-modular_chain_link_fence_set.zip`
- **Prison cell door** (identical files): `f5dd5c34-prison_cell_door.zip`, `d19e1678-prison_cell_door.zip`
- **Abandoned street lights pack** (identical files): `77133a78-abandoned_street_lights_pack.zip`, `4a37c750-abandoned_street_lights_pack.zip`
- **Concrete Barrier / Drum Barrel / Fences** (identical files): `concrete_barrier__drum_barrel__fences.zip`, `concrete_barrier__drum_barrel__fences_1.zip`
- **Old pier (Game ready)** (identical files): `51b95252-old_pier_game_ready.zip`, `2f3f646b-old_pier_game_ready.zip`
- **Road Signs** (identical files): `5b3e1c20-road_signs.zip`, `d2ec8c20-road_signs.zip`
- **Classic Detective hat** (identical files): `589688df-1794329022758_classic_detective_hat.zip`, `8eae137f-1794329181809_classic_detective_hat.zip`, `49de0641-1794329435094_classic_detective_hat.zip`
- **Freight shipping container - Rusted** (identical files): `freight_shipping_container_-_rusted.zip`, `freight_shipping_container_-_rusted_1.zip`
- **Low Poly Humvee FREE** (identical files): `4885731c-low_poly_humvee_free.zip`, `f42bf795-low_poly_humvee_free.zip`
- **Lowpoly Office Kit** (identical files): `7bbe02dc-lowpoly_office_kit.zip`, `1041f19e-lowpoly_office_kit.zip`
- **MICH 2001 military helmet** (identical files): `4a92b24d-mich_2001_military_helmet.zip`, `8e51b80a-mich_2001_military_helmet.zip`
- **Military Helmet** (identical files): `a71bd63c-military_helmet.zip`, `5496690a-military_helmet.zip`
- **Military Tactical Backpack** (identical files): `military_tactical_backpack.zip`, `military_tactical_backpack_1.zip`
- **Old Sawmill (industrial building)** (identical files): `d3a8006b-old_sawmill_industrial_building.zip`, `568c1ef6-old_sawmill_industrial_building.zip`, `7cc1d068-old_sawmill_industrial_building.zip`
- **Roadside Motel** (identical files): `4411dd5a-roadside_motel.zip`, `a32ff7a5-roadside_motel.zip`
- **Stone Crusher AO** (identical files): `80bfbabe-stone_crusher_ao.zip`, `2b91a1bd-stone_crusher_ao.zip`
- **Tactical Explorer Backpack** (identical files): `402d8449-tactical_explorer_backpack.zip`, `659e1b40-tactical_explorer_backpack.zip`
- **Tactical Helmet with Headset (Game-Ready)** (identical files): `e585d214-1793734089268_tactical_helmet_with_headset_game-ready.zip`, `848c8092-tactical_helmet_with_headset_game-ready.zip`, `49ccf60b-tactical_helmet_with_headset_game-ready.zip`

## Unparseable zips

- `4a187504-huxwrx_hx-qd_556_suppressor_4k.zip` (12.4 MB, 2026-11-01): cannot open archive: BadZipFile (File is not a zip file); starts with a zip local header but has no readable central directory: truncated/incomplete download, re-download
- `857e534d-construction_site_asset_pack.zip` (7.3 MB, 2026-11-08): cannot open archive: BadZipFile (File is not a zip file); starts with a zip local header but has no readable central directory: truncated/incomplete download, re-download
- `5309012b-wooden_log_cabin.zip` (25.8 MB, 2026-11-09): cannot open archive: BadZipFile (File is not a zip file); starts with a zip local header but has no readable central directory: truncated/incomplete download, re-download
- `0fecb964-watch_tower.zip` (15.6 MB, 2026-11-11): cannot open archive: BadZipFile (File is not a zip file); starts with a zip local header but has no readable central directory: truncated/incomplete download, re-download
- `bd56bbca-road_safety_pole__low_poly_traffic_delineator.zip` (15.3 MB, 2026-11-11): cannot open archive: BadZipFile (File is not a zip file); starts with a zip local header but has no readable central directory: truncated/incomplete download, re-download
- `cb648f90-gas_station_stand__high-quality_3d_model.zip` (12.0 MB, 2026-11-11): cannot open archive: BadZipFile (File is not a zip file); starts with a zip local header but has no readable central directory: truncated/incomplete download, re-download
- `c678d63e-rust_classic_american_motel_signboard.zip` (22.3 MB, 2026-11-11): cannot open archive: BadZipFile (File is not a zip file); starts with a zip local header but has no readable central directory: truncated/incomplete download, re-download

## Not arrived yet (on the list, no matching zip)

| Area | Name | Author | Priority | Sketchfab tris |
|---|---|---|---|--:|
| nature | [Grass patches](https://sketchfab.com/3d-models/6952780b80594a31aab2dedf7249a47a) | bumstrum | p1 | 2k |
