# Project Island asset inventory

Generated 2026-11-08T18:53:48-03:00 by `art/br/assets/inventory.py` (tool v3). Rerun: `python3 -I art/br/assets/inventory.py --out art/br/assets` (incremental; cached by zip sha256).

## Summary

| | |
|---|--:|
| Zip files scanned (present now) | 278 |
| Unique assets | 261 |
| Licence OK / REVIEW / REJECT | 244 / 11 / 6 |
| Assets with duplicate zips | 14 (15 extra files) |
| Over budget (tris, per-piece, texture px or draws) | 129 |
| Needs conversion (no glTF) | 1 |
| Unparseable zips | 2 |
| On the asset list: arrived / not yet | 132 / 1 (list has 133 items) |
| Not on the asset list | 128 |
| Assets first seen in batch 2026-11-08 (today) | 26 |
| Assets first seen in batch 2026-11-04 | 58 |
| Assets first seen in batch 2026-11-03 | 142 |
| Assets first seen in batch 2026-11-02 | 30 |
| Assets first seen in batch 2026-11-01 | 5 |

### Worst budget offenders

| Asset | Area | Cat | Tris | Over by | Suggested action |
|---|---|---|--:|--:|---|
| Gravel Macro \| Tile Texture | not on list | prop | 1032.5k | 68.8x | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K |
| Loose Sand \| Tile Texture | not on list | prop | 1032.5k | 68.8x | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K |
| Rock \| Tile Texture | not on list | prop | 1032.5k | 68.8x | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K |
| Straw Soil \| Tile Texture | not on list | prop | 1032.5k | 68.8x | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K |
| Straw \| TIle Texture | not on list | prop | 1032.5k | 68.8x | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K |
| Forest Ground \| Tile Texture | not on list | tree | 258.4k | 25.8x | reject for mass instancing (26x) / hero tree only; instance (InstancedMesh); downscale textures to 1K |
| Mossy Ground \| Tile Texture | not on list | prop | 258.4k | 17.2x | decimate to 15k (heavy: 17x) or reject; downscale textures to 1K |
| Snow \| Tile Texture | not on list | prop | 258.4k | 17.2x | decimate to 15k (heavy: 17x) or reject; downscale textures to 1K |
| Wet Mud \| Tile Texture | not on list | prop | 258.4k | 17.2x | decimate to 15k (heavy: 17x) or reject; downscale textures to 1K |
| Sandbag Wall - 24MB | not on list | prop | 186.7k | 12.4x | decimate to 15k (heavy: 12x) or reject; atlas materials (21 draws to ≤12); downscale textures to 1K |
| Free AC Unit | not on list | prop | 176.2k | 11.8x | reject (licence: Standard/paid licence); decimate to 15k (heavy: 12x) or reject; downscale textures to 1K |
| Forest Hut | not on list | tree | 842.7k | 9.8x | reject (licence: Standard/paid licence); reject for mass instancing (10x) / hero tree only; instance (InstancedMesh); downscale textures to 1K |

Most draw calls (primitive uses; atlas/merge before use):

- Realtime Grass: 2013 draws, 4 materials
- Gas station: 991 draws, 63 materials
- Beauharnois Dam: 779 draws, 16 materials
- Abandoned House: 644 draws, 1 materials
- Brooklyn Street Row Buildings Low Poly: 415 draws, 1 materials
- Silos: 413 draws, 5 materials
- DINER: 408 draws, 94 materials
- Abandoned factory: 362 draws, 16 materials

Heaviest textures (uncompressed RGBA + mips):

- Free AC Unit: 1958 MB, 23 images, max 4096 px
- Construction Site Asset Pack: 1516 MB, 87 images, max 2048 px
- Old Awning: 1021 MB, 6 images, max 8192 px
- Abandoned Barn: 918 MB, 15 images, max 4096 px
- Barrier & Traffic Cone Pack: 915 MB, 43 images, max 2048 px
- Generic civil service vehicles pack: 898 MB, 50 images, max 2048 px
- Generic passenger car pack: 814 MB, 39 images, max 2048 px
- Propane Tanks: 702 MB, 33 images, max 2048 px

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
| Chemical tank | ixMkc1 | OK | prop | 8.7k | 1 | 2048 | 64 | 2.74×5.69×6.21 | TEXMB 64 | downscale textures to 1K | 11-03 |
| Classic Shipping Container (Free/Gameready) | Sebastian Webster | OK | prop | 17.1k | 1 | 2048 | 64 | 5.85×2.34×2.95 | TRIS>15k (1.1x), TEXMB 64 | decimate to 15k; downscale textures to 1K | 11-03 |
| Dump Truck | ElectroNick | OK | vehicle | 34.3k | 6 | 1024 | 20 | 2.17×2.3×5.82 | - | use as-is | 11-03 |
| Generic Water Tower \[Free Asset Pack\] | Lex713 | OK | building-kit | 38.6k (36 pcs, max 2.8k) | 36 | 1024 | 32 | 71.2×43.5×11.2 | - | use as-is | 11-03 |
| Industrial asset pack (Free) | ForevereQ | OK | kit | 64.2k (43 pcs, max 8.0k) | 54 | 2048 | 161 | 12×9.9×49.4 | MATS 15, TEXMB 161 | atlas materials across kit (15 materials); downscale textures to 1K | 11-03 |
| Industrial Buildings Set - Low poly models | Daniel Zhabotinsky | OK | building-kit | 30.6k (30 pcs, max 3.6k) | 49 | 2048 | 391 | 427×90.6×345 | MATS 13, TEXMB 391 | atlas materials across kit (13 materials); downscale textures to 2K | 11-03 |
| Ladder, Railing and Flood Light Set Up | DudleyLong | OK | prop | 10.7k | 86 | 2048 | 64 | 952×691×256 | DRAWS 86, SCALE? 952 m, TEXMB 64 | atlas materials (86 draws to ≤12); check scale (largest side 952 m; x0.01 would give 9.52 m); downscale textures to 1K | 11-03 |
| Large Industrial Storage Tanks | Duane's Mind | OK | building-kit | 9.8k (28 pcs, max 2.4k) | 43 | 1024 | 43 | 28.4×14.4×34.5 | - | use as-is | 11-03 |
| Low Poly Container Yard | Designed By Jonathan | OK | building-kit | 21.8k (7 pcs, max 4.6k) | 7 | 1024 | 27 | 331×173×390 | - | use as-is | 11-03 |
| Lowpoly Construction Vehicles Set | kyuandzo | OK | vehicle-kit | 137.8k (21 pcs, max 22.8k) | 60 | - | 0 | 40.5×4.07×37.2 | - | use as-is | 11-03 |
| Quarry Conveyor system Kit | DudleyLong | OK | prop | 37.8k | 72 | 2048 | 192 | 2.09e+03×493×680 | TRIS>15k (2.5x), DRAWS 72, SCALE? 2.09e+03 m, TEXMB 192 | decimate to 15k; atlas materials (72 draws to ≤12); check scale (largest side 2.09e+03 m; x0.01 would give 20.9 m); downscale textures to 1K | 11-03 |
| Railway tank | Dmitriev Nikita | OK | vehicle | 45.3k | 3 | 2048 | 192 | 2.7×3.78×12 | TEXMB 192 | downscale textures to 2K | 11-03 |
| Rusted Tank storage | ixMkc1 | OK | prop | 5.8k | 1 | 2048 | 64 | 2.12×3.32×2.36 | TEXMB 64 | downscale textures to 1K | 11-03 |
| Tower Crane | Chamod | OK | building | 32.3k | 91 | 2048 | 447 | 51.5×51.6×8.28 | DRAWS 91, TEXMB 447 | atlas materials (91 draws to ≤12); downscale textures to 2K | 11-03 |
| Transformer Booth \| LowPoly | S Λ N D R I K | OK | prop | 952 | 1 | 2048 | 64 | 116×38×65.1 | SCALE? 116 m, TEXMB 64 | check scale (largest side 116 m; x0.01 would give 1.16 m); downscale textures to 1K | 11-03 |
| Warehouse FBX Model Free | Nicholas-3D | OK | building | 11.1k | 3 | 2048 | 37 | 16×5.02×46.3 | - | use as-is | 11-03 |

## Northstar Town, Millhaven, Riverwood, Crossroads

Grid B2 · C3 · H5–6 · E4. Arrived 18, not yet 0.

| Name | Author | Licence | Cat | Tris | Draws | Max tex | Tex MB | Size m (x×y×z) | Flags | Suggested action | Batch |
|---|---|---|---|--:|--:|--:|--:|---|---|---|---|
| \[FREE\] Simple Storefront Interior Pack | 99.Miles | OK | building-kit | 4.8k (3 pcs, max 4.4k) | 3 | 2048 | 21 | 58.6×58.6×30.5 | - | use as-is | 11-03 |
| Abandoned building | Federico Paredes | OK | building | 8.2k | 4 | 4096 | 96 | 3.49×8.46×4.8 | TEX 4096px | downscale textures to 2K | 11-03 |
| Abandoned House | Sengchor | OK | building | 12.2k | 644 | 2048 | 64 | 17.6×6.24×16.7 | DRAWS 644 | atlas materials (644 draws to ≤12) | 11-03 |
| Brooklyn Street Row Buildings Low Poly | B0rn2D13 | OK | building-kit | 6.2k (415 pcs, max 666) | 415 | 2048 | 43 | 20.3×15.4×66.1 | - | use as-is | 11-03 |
| DINER | Elbolillo | OK | building | 55.3k | 408 | 1024 | 43 | 83×32.6×83 | DRAWS 408 | atlas materials (408 draws to ≤12) | 11-03 |
| Duplex | SrMonteiro | OK | building | 7.9k | 3 | 4096 | 85 | 8.77×5.53×6.92 | TEX 4096px | downscale textures to 2K | 11-03 |
| Fire Station No. 1 | CommonSpence | OK | building | 3.8k | 1 | 1024 | 16 | 31.3×10.6×23.6 | - | use as-is | 11-03 |
| Gas station ⧉ | Elbolillo | OK | building | 51.9k | 991 | 1024 | 52 | 300×38.9×143 | DRAWS 991 | atlas materials (991 draws to ≤12) | 11-03 |
| Gas station Props | Elbolillo | OK | kit | 12.6k (51 pcs, max 4.1k) | 179 | 1024 | 29 | 60.3×13.5×26 | MATS 54 | atlas materials across kit (54 materials) | 11-03 |
| Low-poly Old American brick building with shop. | Orzechu | OK | building | 2.9k | 1 | 1024 | 16 | 24.2×9.61×7.25 | - | use as-is | 11-03 |
| Motel | YD92 | OK | building | 55.3k | 12 | 2048 | 114 | 2e+04×6.79e+03×2e+04 | SCALE? 2e+04 m, TEXMB 114 | check scale (largest side 2e+04 m; x0.01 would give 200 m); downscale textures to 2K | 11-03 |
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
| Log Cabin + Ruined Version | Nils Lindbäck | OK | building | 87.6k | 83 | 2048 | 320 | 430×293×1.13e+03 | TRIS>60k (1.5x), DRAWS 83, SCALE? 1.13e+03 m, TEXMB 320 | decimate to 60k; atlas materials (83 draws to ≤12); check scale (largest side 1.13e+03 m; x0.01 would give 11.3 m); downscale textures to 2K | 11-03 |
| Log Pile (Game Ready / 2K PBR) ⧉ | Meerschaum Digital | OK | prop | 3.9k | 1 | 2048 | 64 | 2.63×0.722×1.3 | TEXMB 64 | downscale textures to 1K | 11-03 |
| Old Machine | re1monsen | OK | prop | 37.8k | 40 | 4096 | 128 | 459×266×205 | TRIS>15k (2.5x), DRAWS 40, SCALE? 459 m, TEX 4096px, TEXMB 128 | decimate to 15k; atlas materials (40 draws to ≤12); check scale (largest side 459 m; x0.01 would give 4.59 m); downscale textures to 1K | 11-03 |
| Privacy Fence Pack (with damaged sections) | TampaJoey | OK | kit | 22.3k (11 pcs, max 15.5k) | 25 | 1024 | 202 | 19.6×2.24×31.2 | PIECE>15k (1.0x), MATS 14, TEXMB 202 | decimate heavy pieces to 15k; atlas materials across kit (14 materials); downscale textures to 1K | 11-03 |
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
| Prison cell door | Rivaldragon | OK | prop | 1.5k | 1 | 2048 | 64 | 3.87×3.01×0.182 | TEXMB 64 | downscale textures to 1K | 11-03 |

## Roads, bridges, coast and street props

Grid Whole map · D8 / H8 bridges. Arrived 15, not yet 0.

| Name | Author | Licence | Cat | Tris | Draws | Max tex | Tex MB | Size m (x×y×z) | Flags | Suggested action | Batch |
|---|---|---|---|--:|--:|--:|--:|---|---|---|---|
| Abandoned street lights pack | sergeilihandristov | OK | kit | 22.3k (39 pcs, max 5.6k) | 39 | 2048 | 64 | 89.6×10.3×89.6 | - | use as-is | 11-03 |
| City Props Collection (volume 2) | TampaJoey | OK | kit | 52.2k (39 pcs, max 7.0k) | 48 | 2048 | 660 | 43.8×8.56×22.5 | MATS 45, TEXMB 660 | atlas materials across kit (45 materials); downscale textures to 1K | 11-03 |
| Concrete Barrier / Drum Barrel / Fences ⧉ | Myjato | OK | kit | 13.2k (66 pcs, max 1.2k) | 88 | 4096 | 310 | 0.075×0.02×0.026 | MATS 70, SCALE? 0.007 m, TEX 4096px, TEXMB 310 | atlas materials across kit (70 materials); check scale (largest side 0.007 m; x100 would give 0.7 m); downscale textures to 1K | 11-03 |
| Concrete Girder Beam Bridges/Tunnels \[Free\] | Jotrain | OK | building-kit | 890 (14 pcs, max 164) | 14 | 2048 | 165 | 76.9×38×283 | SPEC-GLOSS, TEXMB 165 | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 2K | 11-03 |
| Electrical Powerline Pole (Free Asset) | tiedtke | OK | prop | 40.0k | 1 | 2048 | 64 | 3.36×11.5×27.3 | TRIS>15k (2.7x), TEXMB 64 | decimate to 15k; downscale textures to 1K | 11-03 |
| Jersey Barrier | emran.bayati | OK | prop | 1.7k | 3 | 4096 | 255 | 0.768×1.08×2 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-03 |
| Metal road billboard single sided | Frice | OK | prop | 860 | 4 | 2048 | 68 | 1.26×7×11 | TEXMB 68 | downscale textures to 1K | 11-03 |
| Modular Bridge ( low Poly ) Game Ready. | Salah3D | OK | building-kit | 36.6k (5 pcs, max 14.7k) | 10 | 512 | 5 | 46.4×2.86×37 | - | use as-is | 11-03 |
| Modular Road Bridge | VectorMan | OK | building-kit | 666 (7 pcs, max 326) | 7 | 2048 | 64 | 5.8e+03×3.96e+03×5.1e+03 | SCALE? 5.1e+03 m | check scale (largest side 5.1e+03 m; x0.01 would give 51 m) | 11-03 |
| Modular Urban Fence Pack (w/ graffiti textures) | TampaJoey | OK | kit | 39.0k (7 pcs, max 32.5k) | 32 | 1024 | 80 | 42.5×2.7×25.3 | PIECE>15k (2.2x), MATS 15 | decimate heavy pieces to 15k; atlas materials across kit (15 materials) | 11-03 |
| Old pier (Game ready) | PT34 | OK | building | 9.1k | 1 | 2048 | 64 | 283×198×622 | SCALE? 622 m | check scale (largest side 622 m; x0.01 would give 6.22 m) | 11-03 |
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
| Abandoned Wrecked Bus | BytesCrafter | OK | prop | 12.3k | 16 | 512 | 12 | 996×309×269 | DRAWS 16, SKINNED, SCALE? 996 m | atlas materials (16 draws to ≤12); check scale (largest side 996 m; x0.01 would give 9.96 m) | 11-08 |
| American Old Barn | andrewriddle | OK | building | 9.4k | 1 | 2048 | 21 | 244×135×184 | - | use as-is | 11-04 |
| Apple Tree | Yassin12 | OK | tree | 1.8k (20 pcs, max 108) | 20 | - | 0 | 2.42e+03×3.19e+03×3.09e+03 | DRAWS 20, SCALE? 2.4e+03 m | atlas materials (20 draws to ≤12); check scale (largest side 2.4e+03 m; x0.01 would give 24 m); instance (InstancedMesh) | 11-04 |
| Armor Plate :: Luna has gone prop | Shorty\_Digitan | OK | prop | 904 | 2 | 4096 | 255 | 0.283×0.446×0.527 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-03 |
| asphalt 02 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 3.01×3.04×3.02 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| Asphalt Texture 3D scan | grafi | OK | prop | 20.0k | 1 | 2048 | 43 | 1.8×0.021×1.14 | TRIS>15k (1.3x), TEXMB 43 | decimate to 15k; downscale textures to 1K | 11-04 |
| ATM Machine | local.yany | OK | prop | 2.5k | 2 | 2048 | 43 | 0.731×1.57×0.608 | TEXMB 43 | downscale textures to 1K | 11-08 |
| Barrier & Traffic Cone Pack | Sabri Ayeş | OK | kit | 9.6k (17 pcs, max 1.0k) | 17 | 2048 | 915 | 6.84×2.59×4.03 | MATS 17, TEXMB 915 | atlas materials across kit (17 materials); downscale textures to 1K | 11-08 |
| Burned-out Cars | Renafox | OK | prop | 3.5k | 2 | 2048 | 96 | 282×86.6×295 | SCALE? 295 m, TEXMB 96 | check scale (largest side 295 m; x0.01 would give 2.95 m); downscale textures to 1K | 11-08 |
| Bus Stop - low | Milionna | OK | prop | 520 | 2 | 4096 | 340 | 14.6×22.9×30.5 | TEX 4096px, TEXMB 340 | downscale textures to 1K | 11-04 |
| Chicken Coop | jakerc10 | OK | prop | 2.3k | 2 | 2048 | 21 | 3.48×3.61×3.04 | - | use as-is | 11-04 |
| Concrete Barriers | Arsen Ismailov | OK | kit | 5.5k (21 pcs, max 1.8k) | 21 | 2048 | 447 | 0.5×1.75×10.2 | TEXMB 447 | downscale textures to 1K | 11-02 |
| Concrete Ground \| Tile Texture | CATholic | OK | prop | 16.4k | 3 | 2048 | 64 | 2×2×14 | TRIS>15k (1.1x), TEXMB 64 | decimate to 15k; downscale textures to 1K | 11-04 |
| concrete pavement 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 1.8×1.8×1.8 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| Construction Site Asset Pack | vmatthew | OK | kit | 27.3k (14 pcs, max 12.4k) | 31 | 2048 | 1516 | 15.3×4.5×11.6 | MATS 29, TEXMB 1516 | atlas materials across kit (29 materials); downscale textures to 1K | 11-08 |
| Corn! Corn! Corn! | Tiia Tuulia | OK | prop | 2.6k | 2 | 512 | 1 | 1.58×2.44×1.59 | ANIM 1 | use as-is | 11-04 |
| cracked concrete wall 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 1.01×1.02×1.01 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| Crashed Abandoned Car - Game Ready | Rashad Ibrahimli | OK | building | 8.3k | 10 | 4096 | 255 | 5.59×3.48×8.12 | TEX 4096px, TEXMB 255 | downscale textures to 2K | 11-08 |
| Crate And Barrels Asset Pack | ElliottA | OK | kit | 1.6k (4 pcs, max 432) | 9 | 2048 | 170 | 47.7×49.6×196 | TEXMB 170 | downscale textures to 1K | 11-02 |
| Desert House | Avgust9 | OK | building | 2.2k | 9 | 512 | 5 | 13.9×14.1×21.1 | - | use as-is | 11-02 |
| Diesel Generator | Lifmon | OK | prop | 1.2k | 15 | 2048 | 85 | 0.454×0.642×0.805 | DRAWS 15, TEXMB 85 | atlas materials (15 draws to ≤12); downscale textures to 1K | 11-02 |
| Dirty Car - Cadillac 75 Sedan 1953 | ROH3D | OK | prop | 14.7k | 2 | 2048 | 64 | 1.85×1.6×5.67 | TEXMB 64 | downscale textures to 1K | 11-08 |
| Dog House Free | donnichols | OK | building | 1.3k | 1 | 2048 | 64 | 73.1×86.2×83.8 | - | use as-is | 11-04 |
| Door Metal door window | ahmagh2e | OK | prop | 1.9k | 3 | 2048 | 85 | 376×357×36.5 | SCALE? 376 m, TEXMB 85 | check scale (largest side 376 m; x0.01 would give 3.76 m); downscale textures to 1K | 11-02 |
| Electrical box - FREE | Mathieu Godard | OK | prop | 1.5k | 1 | 4096 | 255 | 2×1.62×0.507 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-02 |
| Farmland v3 (LowPoly) | MrRiskris | OK | prop | 3.5k | 10 | - | 0 | 12.1×6.18×12.7 | - | use as-is | 11-04 |
| Forest Ground \| Tile Texture | CATholic | OK | tree | 258.4k (3 pcs, max 258.0k) | 5 | 2048 | 64 | 2×2×14 | PIECE>10k (25.8x), TEXMB 64 | reject for mass instancing (26x) / hero tree only; instance (InstancedMesh); downscale textures to 1K | 11-04 |
| Forest Hut | ScanMe | REJECT: Standard/paid licence | tree | 842.7k (11 pcs, max 97.6k) | 11 | 8192 | 681 | 5.13×3.52×5.38 | LIC-REJECT, PIECE>10k (9.8x), TEX 8192px, TEXMB 681 | reject (licence: Standard/paid licence); reject for mass instancing (10x) / hero tree only; instance (InstancedMesh); downscale textures to 1K | 11-04 |
| Forklift - Free Low poly | LagzDesign | OK | vehicle | 36.4k | 11 | 1024 | 5 | 1.34×1.71×3.19 | - | use as-is | 11-02 |
| ForkLift GameReady | Mathieu Godard | OK | vehicle | 17.7k | 42 | 4096 | 255 | 0.889×1.25×2 | DRAWS 42, TEX 4096px, TEXMB 255 | atlas materials (42 draws to ≤12); downscale textures to 2K | 11-02 |
| Free - Armor Plate Carrier - Gameready Metahuman | Karnaval | REJECT: Standard/paid licence | prop | 24.4k | 3 | 4096 | 314 | 0.004×0.005×0.003 | LIC-REJECT, TRIS>15k (1.6x), SKINNED, SCALE? 0.005 m, TEX 4096px, TEXMB 314 | reject (licence: Standard/paid licence); decimate to 15k; check scale (largest side 0.005 m; x100 would give 0.5 m); downscale textures to 1K | 11-03 |
| Free AC Unit | vertexmonster | REJECT: Standard/paid licence | prop | 176.2k | 8 | 4096 | 1958 | 3.83×3.7×2.28 | LIC-REJECT, TRIS>15k (11.7x), TEX 4096px, TEXMB 1958 | reject (licence: Standard/paid licence); decimate to 15k (heavy: 12x) or reject; downscale textures to 1K | 11-02 |
| Free weapon accessories | LQC | OK | prop | 34.3k | 28 | 2048 | 427 | 0.697×5.36×20.2 | TRIS>15k (2.3x), DRAWS 28, TEXMB 427 | decimate to 15k; atlas materials (28 draws to ≤12); downscale textures to 1K | 11-03 |
| Game Ready Ammo Box | Godly\_Skibidi0 | REJECT: Standard/paid licence | prop | 3.2k | 2 | 4096 | 255 | 0.452×0.303×0.16 | LIC-REJECT, TEX 4096px, TEXMB 255 | reject (licence: Standard/paid licence); downscale textures to 1K | 11-03 |
| Game Ready Swat Character | dolon56 | OK | fps | 19.4k | 3 | 2048 | 96 | 192×178×38.5 | SKINNED, ANIM 1, SCALE? 192 m, SPEC-GLOSS | check scale (largest side 192 m; x0.01 would give 1.92 m); convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension) | 11-01 |
| Garbage bags | DJMaesen | OK | prop | 606 | 2 | 2048 | 64 | 1.16×1.19×1.93 | TEXMB 64 | downscale textures to 1K | 11-08 |
| Gazebo 1 | Elasta Kristya | OK | prop | 3.2k | 1 | 4096 | 255 | 2.65×3.99×4.16 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-04 |
| Generator LP | YoeriBervoets | OK | prop | 10.9k | 67 | 4096 | 255 | 110×71.6×74.9 | DRAWS 67, SCALE? 110 m, TEX 4096px, TEXMB 255 | atlas materials (67 draws to ≤12); check scale (largest side 110 m; x0.01 would give 1.1 m); downscale textures to 1K | 11-08 |
| Grain Silo - Low Poly Game Ready | Gobby | OK | building | 230 | 1 | 4096 | 255 | 7.79×16.4×7.79 | TEX 4096px, TEXMB 255 | downscale textures to 2K | 11-04 |
| Grass \| Tile Texture | CATholic | OK | prop | 4.3k | 3 | 2048 | 64 | 2×2×14 | TEXMB 64 | downscale textures to 1K | 11-04 |
| gravel 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 2.01×2.02×2.02 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| gravel concrete 03 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 2.1×2.1×2.1 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| gravel embedded concrete 02 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 2×2×2 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| gravel embedded concrete 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 2×2×2 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| Gravel Macro \| Tile Texture | CATholic | OK | prop | 1032.5k | 11 | 2048 | 64 | 2×2×14 | TRIS>15k (68.8x), TEXMB 64 | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K | 11-04 |
| helicopter mi-8 | mamont nikita | OK | vehicle | 8.5k | 4 | 1024 | 3 | 9.16×2.4×8.23 | - | use as-is | 11-01 |
| Hesco Barrier PBR | polbrainstorm | OK | prop | 7.0k | 1 | 4096 | 255 | 72.6×65.7×72.3 | SCALE? 72.6 m, TEX 4096px, TEXMB 255 | check scale (largest side 72.6 m; x0.01 would give 0.726 m); downscale textures to 1K | 11-02 |
| Ice machine (low poly) | theWerskyScenario | OK | prop | 354 | 1 | 2048 | 64 | 2.77×1.66×1.22 | TEXMB 64 | downscale textures to 1K | 11-08 |
| iPad Mini | Graham Rust | REJECT: Standard/paid licence | prop | 438 | 1 | 1024 | 12 | 20×13.5×0.7 | LIC-REJECT | reject (licence: Standard/paid licence) | 11-03 |
| large sandstone blocks 01 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 3.02×3.02×3.02 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| LCT 3000 '95 - Low poly model | Daniel Zhabotinsky | OK | prop | 18.9k | 27 | 2048 | 141 | 6.02×2.86×2.63 | TRIS>15k (1.3x), DRAWS 27, TEXMB 141 | decimate to 15k; atlas materials (27 draws to ≤12); downscale textures to 1K | 11-08 |
| Lightbody '90 MD Tow Truck - Low poly model | Daniel Zhabotinsky | OK | vehicle | 26.1k | 29 | 2048 | 162 | 5.66×1.97×2 | DRAWS 29, TEXMB 162 | atlas materials (29 draws to ≤12); downscale textures to 2K | 11-08 |
| Log - Low Poly | Tudypie | OK | prop | 148 | 2 | - | 0 | 4.66×1.05×1.83 | - | use as-is | 11-04 |
| Lookout Post/Tower | Eliplays | OK | building | 15.6k | 59 | - | 0 | 6.7×7.78×8.15 | DRAWS 59 | atlas materials (59 draws to ≤12) | 11-04 |
| Loose Sand \| Tile Texture | CATholic | OK | prop | 1032.5k | 11 | 2048 | 64 | 2×2×14 | TRIS>15k (68.8x), TEXMB 64 | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K | 11-04 |
| Low Poly Billboard Sign - Standard | JeffK | OK | prop | 340 | 2 | 2048 | 16 | 18.7×17.7×4.51 | - | use as-is | 11-04 |
| Low Poly Camping | tolotedesign | OK | prop | 8.5k | 54 | 2048 | 426 | 152×120×151 | DRAWS 54, SCALE? 152 m, TEXMB 426 | atlas materials (54 draws to ≤12); check scale (largest side 152 m; x0.01 would give 1.52 m); downscale textures to 1K | 11-04 |
| Low Poly Game Ready Armor Vest | DanlyVostok | OK | prop | 5.4k | 2 | 4096 | 681 | 0.7×0.604×0.57 | SPEC-GLOSS, TEX 4096px, TEXMB 681 | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 1K | 11-04 |
| Low Poly Game Ready Military Tactical Backpack | DanlyVostok | OK | prop | 2.7k | 2 | 4096 | 681 | 0.531×0.697×0.667 | SPEC-GLOSS, TEX 4096px, TEXMB 681 | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 1K | 11-04 |
| Lowpoly playground | sieminskaola | OK | prop | 1.4k | 1 | 2048 | 21 | 150×120×113 | SCALE? 150 m | check scale (largest side 150 m; x0.01 would give 1.5 m) | 11-04 |
| LPC Plate Carrier | WooTech | OK | prop | 972 | 1 | 2 | 0 | 2.33×3.33×2.06 | SPEC-GLOSS | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension) | 11-04 |
| M1 Vietnamese Rangers | nghiakua06 | OK | prop | 21.3k | 56 | 4096 | 255 | 0.228×0.287×0.269 | TRIS>15k (1.4x), DRAWS 56, TEX 4096px, TEXMB 255 | decimate to 15k; atlas materials (56 draws to ≤12); downscale textures to 1K | 11-03 |
| M4/AR-15 Carry Handle Sight attachment | SSMProductions | OK | fps | 536 | 1 | - | 0 | 5.27×1.28×0.708 | - | use as-is | 11-01 |
| M4A1 Assault Rifle Game Ready | polupan.andrew | OK | fps | 28.2k | 1 | 2048 | 64 | 0.325×1.72×4.84 | - | use as-is | 11-01 |
| MICH 2001 military helmet ⧉ | HaizorWill | OK | prop | 2.1k | 1 | 2048 | 64 | 0.2×0.323×0.31 | SPEC-GLOSS, TEXMB 64 | convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 1K | 11-04 |
| Military Armor 3D Model | Exactly | OK | prop | 21.0k | 1 | 4096 | 85 | 0.889×1×0.728 | TRIS>15k (1.4x), TEX 4096px, TEXMB 85 | decimate to 15k; downscale textures to 1K | 11-04 |
| Military concrete barrier | pierre\_roger | OK | prop | 485 | 5 | 4096 | 255 | 148×499×200 | SCALE? 499 m, TEX 4096px, TEXMB 255 | check scale (largest side 499 m; x0.01 would give 4.99 m); downscale textures to 1K | 11-02 |
| Military Container | fedorzabelin | OK | prop | 16.1k | 4 | 2048 | 64 | 12×4.25×3.69 | TRIS>15k (1.1x), TEXMB 64 | decimate to 15k; downscale textures to 1K | 11-02 |
| Military Crate - 4096px² | Mark Peters | OK | prop | 43.5k | 1 | 4096 | 255 | 2.86×0.98×1.54 | TRIS>15k (2.9x), TEX 4096px, TEXMB 255 | decimate to 15k; downscale textures to 1K | 11-02 |
| Military Helmet ⧉ | ED BOX | OK | prop | 10.0k | 1 | 4096 | 255 | 8.11×8.27×7.95 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-04 |
| Military Tactical Backpack ⧉ | Liam3D | OK | prop | 1.5k | 1 | 4096 | 255 | 0.75×0.85×0.524 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-04 |
| Military Trucks | Nuclearwinter94 | OK | vehicle | 58.6k | 15 | 2048 | 21 | 6.14×2.98×6.07 | DRAWS 15 | atlas materials (15 draws to ≤12) | 11-02 |
| Modern Tactical Vest / Plate Carrier | Exactly | OK | prop | 29.4k | 1 | 4096 | 85 | 0.83×1×0.917 | TRIS>15k (2.0x), TEX 4096px, TEXMB 85 | decimate to 15k; downscale textures to 1K | 11-03 |
| Mossy Ground \| Tile Texture | CATholic | OK | prop | 258.4k | 5 | 2048 | 64 | 2×2×14 | TRIS>15k (17.2x), TEXMB 64 | decimate to 15k (heavy: 17x) or reject; downscale textures to 1K | 11-04 |
| Oil Drums | Oliver Triplett | OK | prop | 7.3k | 21 | 2048 | 192 | 1.96×1.08×1.79 | DRAWS 21, TEXMB 192 | atlas materials (21 draws to ≤12); downscale textures to 1K | 11-08 |
| Old Awning | exiS7-Gs | OK | prop | 33.2k | 3 | 8192 | 1021 | 10.3×4.64×4.77 | TRIS>15k (2.2x), TEX 8192px, TEXMB 1021 | decimate to 15k; downscale textures to 1K | 11-08 |
| Old car toy | Léonard\_Doye Alias Leoskateman | OK | prop | 3.7k | 1 | 2048 | 64 | 5.93×4.4×12.9 | TEXMB 64 | downscale textures to 1K | 11-04 |
| Old West Water Tower | Suryxin | OK | building | 1.9k | 16 | 2048 | 128 | 3.2×4.4×3.01 | DRAWS 16, TEXMB 128 | atlas materials (16 draws to ≤12); downscale textures to 2K | 11-04 |
| Old, dirty, stacked tires, PBR textures \[free\] | ZiemniaQ | OK | prop | 2.5k | 1 | 2048 | 64 | 1.42×1.47×1.42 | TEXMB 64 | downscale textures to 1K | 11-08 |
| Outdoor Vending Machines | Caboose3d | OK | prop | 1.3k | 20 | 2048 | 255 | 41.8×72×89.3 | DRAWS 20, SCALE? 89.3 m, TEXMB 255 | atlas materials (20 draws to ≤12); check scale (largest side 89.3 m; x0.01 would give 0.893 m); downscale textures to 1K | 11-08 |
| patterned plaster wall 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 1.81×1.82×1.82 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| Phone Booth | Mountrise | OK | prop | 1.7k | 3 | 1024 | 36 | 3.65×8.78×3.79 | TEXMB 36 | downscale textures to 1K | 11-04 |
| Picnic Table - Low Poly | Derek Flanagan | OK | prop | 224 | 1 | 2048 | 64 | 1.57×0.773×1.6 | TEXMB 64 | downscale textures to 1K | 11-04 |
| Porta Potty \| Porta Loo | Sean Thomas | OK | prop | 2.1k | 26 | 4096 | 255 | 0.968×2×0.978 | DRAWS 26, TEX 4096px, TEXMB 255 | atlas materials (26 draws to ≤12); downscale textures to 1K | 11-08 |
| Powe Poles | Gunnar Correa | OK | prop | 3.8k | 13 | 1024 | 181 | 2.36e+03×728×2.36e+03 | DRAWS 13, SCALE? 2.36e+03 m, TEXMB 181 | atlas materials (13 draws to ≤12); check scale (largest side 2.36e+03 m; x0.01 would give 23.6 m); downscale textures to 1K | 11-04 |
| Propane Tanks | Caboose3d | OK | kit | 12.9k (5 pcs, max 3.2k) | 48 | 2048 | 702 | 180×58.4×79 | TEXMB 702 | downscale textures to 1K | 11-08 |
| Radio tower | Gunnar Correa | OK | building | 2.2k | 13 | 1024 | 43 | 157×1.25e+03×157 | DRAWS 13, SCALE? 1.25e+03 m | atlas materials (13 draws to ≤12); check scale (largest side 1.25e+03 m; x0.01 would give 12.5 m) | 11-04 |
| Refrigerated Trailer (Custom Model) | matthew13482 | OK | prop | 408 | 34 | 512 | 1 | 1.69×2.81×8.69 | DRAWS 34 | atlas materials (34 draws to ≤12) | 11-08 |
| Rock \| Tile Texture | CATholic | OK | prop | 1032.5k | 11 | 2048 | 64 | 2×2×14 | TRIS>15k (68.8x), TEXMB 64 | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K | 11-04 |
| Roll Door | HippoStance | OK | prop | 25.5k | 6 | 2048 | 80 | 7.27×2.42×0.75 | TRIS>15k (1.7x), TEXMB 80 | decimate to 15k; downscale textures to 1K | 11-02 |
| Runway Concrete \| Tile Texture | CATholic | OK | building | 64.8k | 3 | 2048 | 64 | 2×2×14 | TRIS>60k (1.1x) | decimate to 60k | 11-04 |
| Rusted Farm Tools | FrodoUndead | OK | prop | 1.7k | 5 | 1024 | 16 | 15×10.3×1.65 | - | use as-is | 11-04 |
| Rusty Old Newspaper Vending Machine | chrisg4919 | OK | prop | 872 | 1 | 4096 | 255 | 65.3×169×75.1 | SCALE? 169 m, TEX 4096px, TEXMB 255 | check scale (largest side 169 m; x0.01 would give 1.69 m); downscale textures to 1K | 11-08 |
| Sandbag Wall - 24MB | adventurer | OK | prop | 186.7k | 21 | 2048 | 64 | 8.01×1.33×0.867 | TRIS>15k (12.4x), DRAWS 21, TEXMB 64 | decimate to 15k (heavy: 12x) or reject; atlas materials (21 draws to ≤12); downscale textures to 1K | 11-02 |
| Sandbags or Ricebags | BytesCrafter | OK | prop | 2.8k | 4 | 512 | 1 | 89.8×86.5×74 | SKINNED, SCALE? 89.8 m | check scale (largest side 89.8 m; x0.01 would give 0.898 m) | 11-02 |
| sandstone cracks 2k |  | REVIEW: no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source | texture-set | - | 1 | 2048 | 64 | 2.01×2.03×2.02 | LIC-REVIEW | material/texture set: use the maps only (ignore the preview mesh) | 11-02 |
| Scarecrow | Baardus | OK | prop | 1.7k | 1 | 2048 | 21 | 78.9×105×18.2 | SCALE? 105 m | check scale (largest side 105 m; x0.01 would give 1.05 m) | 11-04 |
| Semi Truck Baked | 3DE\_Study | OK | vehicle | 40.0k | 8 | 4096 | 575 | 4.75×5.27×10 | TEX 4096px, TEXMB 575 | downscale textures to 2K | 11-08 |
| Shopping Cart | AdrianXY | OK | building | 2.2k | 3 | - | 0 | 0.56×0.876×0.906 | SCALE? 0.906 m | check scale (largest side 0.906 m; x100 would give 90.6 m) | 11-08 |
| Shvan '92 Ambulance - Low Poly model | Daniel Zhabotinsky | OK | prop | 25.9k | 28 | 4096 | 226 | 5.02×2.26×2.35 | TRIS>15k (1.7x), DRAWS 28, TEX 4096px, TEXMB 226 | decimate to 15k; atlas materials (28 draws to ≤12); downscale textures to 1K | 11-08 |
| Simon and Mouchel Grain Silos | cathal35sf | OK | building | 1.2k | 21 | 1024 | 11 | 36.6×44.5×51.5 | DRAWS 21 | atlas materials (21 draws to ≤12) | 11-04 |
| Simple Wooden Pier or Dock | Jungle Jim | OK | building | 6.3k | 5 | 1024 | 43 | 8.25×10.9×24.3 | - | use as-is | 11-04 |
| Sniper | stevennvh | OK | fps | 16.1k | 14 | 2048 | 47 | 6.57×10.7×53.3 | DRAWS 14, SCALE? 53.3 m | atlas materials (14 draws to ≤12); check scale (largest side 53.3 m; x0.01 would give 0.533 m) | 11-03 |
| Snow \| Tile Texture | CATholic | OK | prop | 258.4k | 5 | 2048 | 64 | 2×2×14 | TRIS>15k (17.2x), TEXMB 64 | decimate to 15k (heavy: 17x) or reject; downscale textures to 1K | 11-04 |
| Stone wall | Stefan William Rudebjer | OK | prop | 2.0k | 7 | 2048 | 85 | 408×201×159 | SCALE? 408 m, SPEC-GLOSS, TEXMB 85 | check scale (largest side 408 m; x0.01 would give 4.08 m); convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension); downscale textures to 1K | 11-04 |
| Straw Soil \| Tile Texture | CATholic | OK | prop | 1032.5k | 11 | 2048 | 64 | 2×2×14 | TRIS>15k (68.8x), TEXMB 64 | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K | 11-04 |
| Straw \| TIle Texture | CATholic | OK | prop | 1032.5k | 11 | 2048 | 64 | 2×2×14 | TRIS>15k (68.8x), TEXMB 64 | decimate to 15k (heavy: 69x) or reject; downscale textures to 1K | 11-04 |
| street lamp low poly | ASAD MEHMOOD | OK | tree | 1.4k (3 pcs, max 596) | 3 | 2048 | 85 | 2.12×3.03×0.598 | TEXMB 85 | instance (InstancedMesh); downscale textures to 1K | 11-04 |
| T wall barrier | NonoG5 | OK | prop | 490 | 1 | 1024 | 7 | 77.9×203×41.8 | SCALE? 203 m | check scale (largest side 203 m; x0.01 would give 2.03 m) | 11-02 |
| Tactical Explorer Backpack ⧉ | yronthal | OK | prop | 10.0k | 1 | 2048 | 64 | 1.55×1.99×1.39 | TEXMB 64 | downscale textures to 1K | 11-04 |
| Tactical Helmet with Headset (Game-Ready) ⧉ | Exactly | OK | prop | 19.1k | 1 | 4096 | 85 | 0.998×1.06×0.917 | TRIS>15k (1.3x), TEX 4096px, TEXMB 85 | decimate to 15k; downscale textures to 1K | 11-03 |
| Terrorist 1 Rig | fake gman | OK | fps | 4.5k | 1 | 1024 | 5 | 1.92×2.69×0.665 | SKINNED, ANIM 1 | use as-is | 11-01 |
| Texture of old black asphalt highly degraded | Tijerín Art Studio | OK | prop | 1.5k | 1 | 4096 | 170 | 1.32e+03×67×1.32e+03 | SCALE? 1.32e+03 m, TEX 4096px, TEXMB 170 | check scale (largest side 1.32e+03 m; x0.01 would give 13.2 m); downscale textures to 1K | 11-04 |
| Tractor - game asset | Igor Bistritski | OK | prop | 2.2k | 6 | - | 0 | 737×528×396 | SCALE? 737 m | check scale (largest side 737 m; x0.01 would give 7.37 m) | 11-04 |
| Trampoline | Spark | OK | prop | 1.9k | 2 | 256 | 0 | 2.76×2.03×2.76 | ANIM 1, MORPH | use as-is | 11-04 |
| Trash Can 02 | katykate | OK | prop | 696 | 1 | 2048 | 64 | 0.971×0.896×0.804 | TEXMB 64 | downscale textures to 1K | 11-04 |
| Tree Planter with Grate FREE Low Poly | LordSamueliSolo | OK | tree | 2.2k (5 pcs, max 1.1k) | 5 | 2048 | 64 | 1.56e+03×1.94e+03×1.88e+03 | SCALE? 1.94e+03 m, TEXMB 64 | check scale (largest side 1.94e+03 m; x0.01 would give 19.4 m); instance (InstancedMesh); downscale textures to 1K | 11-08 |
| Vest | Santeri Riikonen | OK | prop | 1.8k | 1 | 4096 | 255 | 1.3×2×1.76 | TEX 4096px, TEXMB 255 | downscale textures to 1K | 11-04 |
| Vintage Gas Pump | Rescue3D Assets | OK | prop | 7.6k | 3 | 4096 | 346 | 0.672×1.83×0.38 | TEX 4096px, TEXMB 346 | downscale textures to 1K | 11-04 |
| Vintage Windmill Animated .glb FREE Low Poly | LordSamueliSolo | OK | prop | 5.5k | 17 | 2048 | 90 | 480×480×480 | DRAWS 17, ANIM 1, SCALE? 480 m, TEXMB 90 | atlas materials (17 draws to ≤12); check scale (largest side 480 m; x0.01 would give 4.8 m); downscale textures to 1K | 11-04 |
| Warehouse Storage Racking FBX Low Poly FREE | LordSamueliSolo | OK | building | 27.4k | 17 | 1024 | 96 | 5.04e+03×5.04e+03×5.04e+03 | DRAWS 17, SCALE? 5.04e+03 m | atlas materials (17 draws to ≤12); check scale (largest side 5.04e+03 m; x0.01 would give 50.4 m) | 11-08 |
| Western church - Mobile GameReady | Ali haghshenas | OK | prop | 708 | 65 | 1024 | 11 | 6.93×13×8.44 | DRAWS 65 | atlas materials (65 draws to ≤12) | 11-04 |
| Wet Mud \| Tile Texture | CATholic | OK | prop | 258.4k | 5 | 2048 | 64 | 2×2×14 | TRIS>15k (17.2x), TEXMB 64 | decimate to 15k (heavy: 17x) or reject; downscale textures to 1K | 11-04 |
| Wooden Boat | o0ozexo0o | OK | prop | 1.9k | 1 | 2048 | 44 | 106×46×339 | SCALE? 339 m, TEXMB 44 | check scale (largest side 339 m; x0.01 would give 3.39 m); downscale textures to 1K | 11-04 |

## Duplicates

- **Low Poly \| Pallets** (identical files): `fa08f799-low_poly__pallets.zip`, `f002c546-low_poly__pallets.zip`
- **Gas station** (identical files): `f08c2f36-gas_station.zip`, `a1d89a38-gas_station.zip`
- **Fence pack - (low poly, game ready)** (identical files): `d0f2652b-fence_pack_-_low_poly_game_ready.zip`, `799e7cff-fence_pack_-_low_poly_game_ready.zip`
- **Hay Bales** (identical files): `59b44f0b-hay_bales.zip`, `af09f2c1-hay_bales.zip`
- **Log Pile (Game Ready / 2K PBR)** (identical files): `0e03a918-log_pile_game_ready__2k_pbr.zip`, `c956d28f-log_pile_game_ready__2k_pbr.zip`
- **Worn Shed PBR Game-Ready** (identical files): `worn_shed_pbr_game-ready.zip`, `worn_shed_pbr_game-ready_1.zip`
- **Modular Chain Link Fence Set** (identical files): `2714fc2b-modular_chain_link_fence_set.zip`, `5a994156-modular_chain_link_fence_set.zip`
- **Concrete Barrier / Drum Barrel / Fences** (identical files): `concrete_barrier__drum_barrel__fences.zip`, `concrete_barrier__drum_barrel__fences_1.zip`
- **Road Signs** (identical files): `5b3e1c20-road_signs.zip`, `d2ec8c20-road_signs.zip`
- **MICH 2001 military helmet** (identical files): `4a92b24d-mich_2001_military_helmet.zip`, `8e51b80a-mich_2001_military_helmet.zip`
- **Military Helmet** (identical files): `a71bd63c-military_helmet.zip`, `5496690a-military_helmet.zip`
- **Military Tactical Backpack** (identical files): `military_tactical_backpack.zip`, `military_tactical_backpack_1.zip`
- **Tactical Explorer Backpack** (identical files): `402d8449-tactical_explorer_backpack.zip`, `659e1b40-tactical_explorer_backpack.zip`
- **Tactical Helmet with Headset (Game-Ready)** (identical files): `e585d214-1793734089268_tactical_helmet_with_headset_game-ready.zip`, `848c8092-tactical_helmet_with_headset_game-ready.zip`, `49ccf60b-tactical_helmet_with_headset_game-ready.zip`

## Unparseable zips

- `4a187504-huxwrx_hx-qd_556_suppressor_4k.zip` (12.4 MB, 2026-11-01): cannot open archive: BadZipFile (File is not a zip file); starts with a zip local header but has no readable central directory: truncated/incomplete download, re-download
- `857e534d-construction_site_asset_pack.zip` (7.3 MB, 2026-11-08): cannot open archive: BadZipFile (File is not a zip file); starts with a zip local header but has no readable central directory: truncated/incomplete download, re-download

## Not arrived yet (on the list, no matching zip)

| Area | Name | Author | Priority | Sketchfab tris |
|---|---|---|---|--:|
| nature | [Grass patches](https://sketchfab.com/3d-models/6952780b80594a31aab2dedf7249a47a) | bumstrum | p1 | 2k |
