# SUBURBAN SHOWDOWN third-party sources

All models were downloaded from Sketchfab by the project owner (2026-11-02) as glTF and prepared
by `../tools/prep_sources.py` into the `*.glb` files here: only the parts the map uses are kept,
transforms are applied, every item is put in one frame (metres, front along +X, origin at the
centre of its footprint, base at 0), the cars and bushes are decimated, the textures are scaled to
what they cover on screen (512 px; the bus and the oak 1024 px) and saved as WebP, and the specular
maps are dropped. Each file's original `license.txt` is kept next to it as `<key>.license.txt`.
Every model is CC BY 4.0 (credit required, commercial use and modification allowed). None is
CC BY-NC or CC BY-SA, and none carries Call of Duty / Nuketown asset names (checked on import).

| File | Used for | Source | Author | Licence | Changes |
| --- | --- | --- | --- | --- | --- |
| `bus.glb` | school bus | [School Bus](https://sketchfab.com/3d-models/school-bus-a959ee8ce17d434f9fdbc93cad199a21) | Macaroni | CC BY 4.0 | scaled x1.12, PVPSPINARENA wraps added |
| `truck_cab.glb` | delivery truck cab and chassis | [Box Truck [Game Asset]](https://sketchfab.com/3d-models/box-truck-game-asset-959e25ad21014bcf9066d3f6f7e7ecb2) | Jen S Abbott | CC BY 4.0 | cargo box and rear bumper removed (a new enterable PVPSPINARENA cargo box is modelled in `suburbia_kit.py`), scaled x0.3 |
| `car_duke.glb` | driveway car, house A | [Duke '69 - Low Poly Model](https://sketchfab.com/3d-models/duke-69-low-poly-model-46fed79f600c4fc69e060991f9e3e4f9) | Daniel Zhabotinsky | CC BY 4.0 | decimated 50 %, scaled x0.973 |
| `car_negotiator.glb` | driveway car, house B | [Negotiator '80 - Low poly model](https://sketchfab.com/3d-models/negotiator-80-low-poly-model-892b2684fb37442299bfad9222cf331c) | Daniel Zhabotinsky | CC BY 4.0 | decimated 50 %, scaled x1.032 |
| `car_wagon.glb` | cars parked on the ring | [Fairheaven SW '84 - Low poly model](https://sketchfab.com/3d-models/fairheaven-sw-84-low-poly-model-aa0becb6e854422596cac6b21bf79787) | Daniel Zhabotinsky | CC BY 4.0 | decimated 50 % |
| `picket.glb` | picket fences | [Green & white picket fence](https://sketchfab.com/3d-models/green-white-picket-fence-35858549c7e947e9859cd335f671f586) | Shuckwaffles | CC BY 4.0 | scaled x0.88, segments stretched to the fence runs |
| `shed.glb` | garden and lane sheds | [Worn Shed PBR Game-Ready](https://sketchfab.com/3d-models/worn-shed-pbr-game-ready-be6edd62e55a4f9a99da940fc164a5b9) | donnichols | CC BY 4.0 | scaled x0.75 |
| `pole.glb` | utility poles | [Utility Pole (PBR)](https://sketchfab.com/3d-models/utility-pole-pbr-92f4d3b0ef38472d8c1c62a28fe15135) | SLASH / RENDAR | CC BY 4.0 | scaled to 7 m |
| `mailbox.glb` | mail boxes | [Old US mailbox](https://sketchfab.com/3d-models/old-us-mailbox-6cf41ee1a60143efb983b74c0d69a9a4) | PXBR | CC BY 4.0 | scaled x1.4 |
| `picnic.glb` | backyard tables | [Picnic Table - Low Poly](https://sketchfab.com/3d-models/picnic-table-low-poly-fe35acda3a5245da8459d1a062e28190) | Derek Flanagan | CC BY 4.0 | none |
| `tower.glb` | billboard tower | [Radio tower](https://sketchfab.com/3d-models/radio-tower-4b3c733d8bfd4ee2b91dcbcd02670686) | Gunnar Correa | CC BY 4.0 | ground plane removed, scaled x1.2, PVPSPINARENA billboard added |
| `oak.glb` | trees (canopies over the trunks; whole trees beyond the fences) | [Oak Tree \| Game Ready](https://sketchfab.com/3d-models/oak-tree-game-ready-2f4ae6b907fd4741abda5d1b71c83b10) | Maple | CC BY 4.0 | decimated 40 %; in the playable area only the canopy above the first branches is used |
| `bushes.glb` | shrubs | [Bush pack - Game Ready 3d plants](https://sketchfab.com/3d-models/bush-pack-game-ready-3d-plants-fbxobjglb-673f15f2511345c8992d7b9517a9f224) | Rudransh_3d | CC BY 4.0 | backdrop removed, decimated 50 % |
| `props.glb` | wheelie bins, dumpsters, street lights, hydrants, cardboard boxes | [PBR Street Props Pack (Game Ready)](https://sketchfab.com/3d-models/pbr-street-props-pack-game-ready-8013d8e6af4645d1a7c3d5b24054bfc8) | MadeByYeshe | CC BY 4.0 | the items used, split apart |
| `signs.glb` | road signs beyond the hoarding | [Street Asset Pack](https://sketchfab.com/3d-models/street-asset-pack-f3eb47d02e2e4ab290e66752fa354b48) | vmatthew | CC BY 4.0 | the signs and a cone, split apart |
| `furniture.glb` | sofas, fireplaces, beds, wardrobes, dressers | [Low Poly Furnitures Full Bundle](https://sketchfab.com/3d-models/low-poly-furnitures-full-bundle-05d29572fef94794803365bdbfd7afa9) | Taha Kaya | CC BY 4.0 | the pieces used, split apart |

To re-prepare after replacing a download: unzip the Sketchfab glTF downloads into one folder (one
sub-folder each, named as in `MODELS` in `../tools/prep_sources.py`), then run
`/root/bpyenv/bin/python ../tools/prep_sources.py -- <folder>`.

The houses, garages, fences, cargo box, storage container, trailer, ground, perimeter and
neighbourhood are modelled procedurally (`../suburbia_kit.py`); all textures are generated by
`../textures.py` (plus the PVPSPINARENA logo, `public/brand/arena-logo-email.png`).
