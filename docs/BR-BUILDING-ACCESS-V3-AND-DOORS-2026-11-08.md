# Project Island: building access v3 and fitted doors (2026-11-08)

Owner: "audit more of the houses/buildings that can't be entered, e.g. a small house on a farm
and some big houses. Also fix the doors to fit correctly: we need specific doors for houses; the
doors open, but there is a gap and they don't fit."

## Audit

Three new audit tools (`node scripts/br/map-audit/run.mjs <name> …`):

- `enterable-all`: every building model on the island, its placements, its rooms and its doors.
- `enter-placements <out.json> [models]`: at every real placement, with all doors open, a
  breadth-first walk (`CELL=0.25`) from outside to the rooms. The 0.5 m grid of the older
  `access` tool is too coarse for the 1 m porch gates.
- `door-views <out.json> [models]`: explorer camera views square-on to every door
  (`DIST`, `MAXD`).

Findings:

| Building | Placements | Before | Cause |
|---|---|---|---|
| house (big two-storey town house) | 445 | 236 at the 0.25 m walk; 0 at 0.5 m | Voxel-inflated newel posts left a 0.9 m porch gate for the 0.7 m player hull. |
| shed (the farm and yard "small house") | 336 | not enterable | The door was painted on. |
| garage | 353 | not enterable | The door was painted on, and the voxel shell left holes at the vehicle doors. |
| rural-trailer | 23 | not enterable | The door was painted on, and there was no floor inside. |
| military-hq, warehouse | 1, 5 | not enterable | The HQ's modelled door slab sealed the doorway; the warehouse had no doors at all. |
| rural-wood-1 (stilt house) | 143 | passable | The doorway was cut 0.5 m beside the painted door, so the visible door led nowhere. |
| rural-diner | 35 | passable | The doorway was cut 2.2 m from the real door, through a window band. |

## Access v3 (`art/br/building-access-v3.json`)

Rebuild:

```sh
node art/blender/br/repair_building_access.mjs art/br/building-access-v3.json
node art/blender/br/repair_wall_surfaces.mjs models.access-v3.json walls-v3 rural-wood-1,rural-diner,shed,garage,military-hq,warehouse
```

New options in `repair_building_access.mjs`:

- `collisionOnly` and `clear`: collision-only openings (the house porch gate).
- `solid`: collision fill where the voxel shell leaves a hole that a drawn surface closes.
- `source: "original"`: redo a model from its pristine import (the two re-cut doors).
- `meshFloors` and `meshStairs`: use exact collision for floors and steps but keep the textured
  ones the model already draws.

The world revision is now `building-access-v3`. Deploy the site and the match Worker together,
as for v2.

A shed stands at the lowest ground under it, so on a slope its uphill side is dug in. When a
shed's porch steps face uphill, the layout now turns it half round (same footprint) so they
face downhill (`PORCH_STEPS` in `layout.ts`).

Results at the island placements (0.25 m walk):

| Building | Enterable placements |
|---|---|
| house | 445/445 |
| shed | 315/336 |
| garage | 348/353 |
| rural-trailer | 23/23 |
| warehouse | 5/5 |
| military-hq | 1/1 |
| rural-wood-1 | 143/143 |
| rural-diner | 35/35 |

The sheds left are in forest compounds (Murder Cabins, Pine Ridge) on slopes steep enough to
bury the porch whichever way it faces.

## Fitted doors (`scripts/br/doors/bake.mjs`, `doors.v1.webp` and `doors.v1.json`)

The old panel was a brown box 0.04 m narrower than the doorway and capped at 2.2 m tall. Every
authored cut is 0.16 m wider than its door, and most openings are 2.3 to 3.5 m tall. The result
was a 10 cm gap on each side and a black slot (or dark glass) above the door.

The bake photographs each building's own painted door off its untouched import:

- orthographic and unlit;
- only the wall's own slab, so porch rails and posts in front stay out;
- the other side of the wall if the first is blank.

Procedural buildings get a drawn door instead: a panelled house door, a glazed shop door, a
steel door or a plank door. The bake also measures the wall either side of each opening by ray
casting. Everything goes into one 2048² atlas (113 kB).

The renderer (`door-renderer.ts`):

- fills the whole opening, sill to head, with the door's picture;
- lines the cut's sides and head through the wall's thickness, in the door's rim colour;
- hinges the door on the left as seen from outside, and it swings inward.

Two instanced draws, the same count as before: panels, and the linings that replace the
transoms. Collision is unchanged: the closed door is still the `doors.ts` box.

Rebuild after any access change:

```sh
node scripts/br/doors/bake.mjs [--chromium=…]
```

## Checks

`tests/br-building-access-v3.test.ts`:

- the new entrances in and out at four rotations, closed doors blocking;
- rooms to loot in each newly opened building;
- the share of island placements that can be walked into: sheds above 88%, everything else
  above 97%;
- a fitted look for every doorway.

`building-access-routes.json` follows the two moved doors. The BR suite (38 files, 381 tests)
passes.
