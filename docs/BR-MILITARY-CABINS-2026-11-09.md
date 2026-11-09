# Southern Military Base, Murder Cabins and the lakes (2026-11-09)

This work is on branch `military-cabins-2026-11-09`. It stacks on `prison-riverwood-2026-11-09` (PR #107), which stacks on #106. It is not merged.

## The request

> "last 2 areas/locations to audit and upgrade: murder cabins and Southern Military base. give
> urls to download sketch objects to make those last 2 areas complete"

## What the audit found

| Area | Found |
|---|---|
| Southern Military Base | A 330 m hesco compound on a concrete plain: the HQ, eight barracks, tents, rows of parked armour, two hangars. It had no motor pool, no ammunition store, no command building, and nothing between the gate and the runway. |
| Murder Cabins | About 60 cabins, houses and trailers scattered over 1 km of open ground and forest edge, with no centre. The lake north of them was invisible (see the next section). |

### All 15 inland lakes were dry: fixed

Since the 11-08 rivers and lakes rebuild, `build_world.py` turned every inland lake's land cover to grass. The water is only drawn where the cover says water, so:

- **The Old Dam reservoir:** the dam held back a dry, wooded basin.
- **Every other inland lake:** the same; 15 lakes in all were empty basins with trees growing in them.

**Fix:**

- **Cover:** cells below a lake's own level are water again.
- **Banks:** some lake outlines cross a valley, as on the lake by Murder Cabins. There the ground outside the lake was lower than the water, which would leave the surface ending in mid-air. A new bank rises to just above the water (3 % further out) and eases back into the country over 20-90 m. Ground already higher is left alone. The Old Dam's valley is excluded, so the dam still holds the reservoir back.
- **Raised by:** 0.8-5 m at most lakes. Up to 14 m at lakes 3 and 5, near the Old Dam, where the outlines cross valleys.

## Downloads

**Used (all CC BY 4.0):**

| Kit id | Source |
|---|---|
| `humvee` | Low Poly Humvee FREE (MadTrollStudio) |
| `mil-truck`, `mil-jeep`, `mil-armoured-car` | Low-poly Military Vehicles pack (MedSamer): pieces `Ural`, `UAZ`, `Tiger` |
| `air-raid-bunker` | Bunker Nr 20 (FHQ-Wehrwolf), without its ground plate |
| `ammo-stack` | Ammo boxes (Andy Woodhead) |
| `control-post` | Low Poly Military Building (3RDimens) |
| `command-post` | Military Control Building (3RDimens) |
| `field-hangar` | Hangar (Matvis): open-sided vehicle shed |
| `camp-cabin` | Abandoned Cabin Environment (mapleaber) |
| `swamp-shack` | Abandoned Shack in the Swamp (Nicholas-3D), piece `WoodenShack_6` |
| `camp-gear` | Camp 3d model (iGauravRajput) |
| `canoe` | Low-Poly Canoe (Osaze Shears) |
| `archery-target` | Low Poly Archery Target (Misfit_Games) |
| `camper-van` | Vintage Hippy Camper Van (Libau Media). No badge shows. |
| `camp-dock` | Dock (anadaren) |

**Not used:**

| Download | Why |
|---|---|
| [FREE] Wooden Docks V2 | CC BY-ND: no derivatives, and every model is simplified for the game. The Dock above replaces it. |
| Free low poly Hangar model | Sketchfab Standard licence, not CC. The Hangar above replaces it. |

## Enterable buildings

The fit-out is `art/br/fitout/military.py`, written to `building-access-v11`. Each building is cleared inside and given a floor, liners, a ceiling and steel or wooden doors.

| Building | What's inside |
|---|---|
| `control-post` | One room, with doors in both long sides. |
| `command-post` | Two floors and a flight along the back wall, with rails round its well. The front door is the model's own doorway. A ramp climbs the 0.38 m plinth to each door. |
| `camp-cabin` | One room on a raised floor. The porch's 0.44 m steps become one walkable flight. |

The walked routes cover every door, and the command post's climb to its first floor.

**Loot:**

| Building | Class | Items |
|---|---|---|
| command post | military | 10 |
| control post | military | 5 |
| camp cabin | residential | 3 |

## Southern Military Base

All of this is in `layout.ts militaryBase` and `baseFlightLine`. The compound went from 113 non-hesco placements to 146, plus the flight line outside the wall.

- **Command post:** beside the HQ.
- **Control posts:** at the north and east gates.
- **Motor pool (south-east):** two open vehicle sheds with trucks and an armoured car under them, a line of nine Humvees, jeeps and armoured cars, and a fuel truck.
- **Ammunition dump (north-east):** three concrete air-raid bunkers, ammo stacks and sandbags.
- **Gates:** Humvees and a jeep at the gates.
- **Flight line:** between the south gate and the runway, five field hangars, each with a truck and a Humvee parked under it, a fuel truck and crates.

## Murder Cabins: the summer camp

This is in `layout.ts summerCamp`, with a level clearing from `build_world.py CAMP_CLEARING`. On the lake's south shore, an abandoned camp:

- **Cabins:** six enterable cabins round the campfire ring, with log benches, and a seventh for the counsellors.
- **Camp life:** tents and gear, latrines and picnic tables.
- **Archery range:** five targets with hay bales behind them.
- **Camp track (the night it all went wrong):** the camper van, a burned-out police car and a wreck.
- **The lake:** a dock out into it, canoes at the dock, and the boathouse shack on the shore.

The old scattered cabins remain round it.

## Revisions

| Revision | What |
|---|---|
| `military-v1` | The new models, added on top of `access-v10`. |
| `building-access-v11` | The three fit-outs. |
| `doors.v9` | 112 doors (107 before). |

**Pipeline:** `process_assets.mjs` takes a per-asset `draws` setting. The camp cabin keeps five textured draws, so it stays in budget with its fit-out's coloured group.

Rebuild:

```sh
node art/blender/br/process_assets.mjs humvee mil-truck mil-jeep mil-armoured-car air-raid-bunker ammo-stack control-post command-post camp-cabin swamp-shack camp-gear canoe archery-target camper-van camp-dock field-hangar
node art/blender/br/build_collision.mjs
node art/blender/br/add_models.mjs models.access-v10.json collision.access-v10.json military-v1 \
  humvee,mil-truck,mil-jeep,mil-armoured-car,air-raid-bunker,ammo-stack,control-post,command-post,camp-cabin,swamp-shack,camp-gear,canoe,archery-target,camper-van,camp-dock,field-hangar
python3 -I art/br/fitout/military.py && node art/blender/br/repair_building_access.mjs art/br/building-access-v11.json
node scripts/br/doors/bake.mjs
python3 art/br/build_world.py && node scripts/br/bake-surface.mjs
```

## Checks

- **BR suite:** 49 files, 648 tests. All pass except the three-room load test, which fails on this loaded machine, as on main.
- **Overlap test:** `field-hangar` is excluded, because it is an open vehicle shed meant to have vehicles parked under it.
- **Download size:** 32.1 MB for all models. The limit in `br-models` is raised to 34 MB.
- **Reviewed captures:**
  - the base from the air, the motor pool, the ammo dump and the command post;
  - the camp from the air, the campfire ring, the archery range, and the dock from the lake;
  - the restored lakes, including the Old Dam reservoir.
