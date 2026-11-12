#!/usr/bin/env python3
"""The broadcast tower on the Iron Peaks summit made climbable for the second zip-line (owner,
2026-11-12: "add ONE additional zip-line connecting the other tower located behind the first
Iron Peaks zip-line mountain to the existing Iron Peaks zip-line tower"). Broadcast tower (Game
ready), `radio-mast`, 11.6 x 60 x 11.8 m, measured from its processed LOD0 (up-facing surfaces,
plan sections, 2026-11-12):

- a concrete base 1.44 m high under the lattice (x -4.90..5.20, z -5.01..5.08);
- a ladder up the middle (stiles at x -0.5 and 0.8, rungs in the plane z -1.0) from the base to
  the top, through a hatch (x -1.15..1.5, z -1.2..1.2) in the platform at 25.43 m, a walk-round
  deck (x -4.45..4.65, z -4.5..4.57) with a rail at its edge;
- the lower legs at (+-4.4/4.7, +-4.5/4.6) up to the platform, the upper ones at
  (-3.6/3.95, -3.7/3.8) above it.

The ladder is climbed through ladders.ts (MODEL_LADDERS). Here, collision only: steps up onto
the base on its south side (drawn by zipline-renderer.ts), the base's top and the platform exact
(voxelised they stood 0.1-0.3 m proud), the ladder's column cleared from the base to the
platform, a guard rail round the hatch on its open sides (drawn too) and the deck's edge rail.
The second zip-line's arm and post stand on the platform's south side (zipline.ts).

Writes art/br/building-access-v17.json (applied by repair_building_access.mjs on top of
building-access-v16) and the walk up the steps to the ladder's foot to art/br/tower-routes.json.

    python3 -I art/br/fitout/zipline2.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import box  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
BASE = 1.44
DECK = 25.43
HATCH = (-1.15, 1.5, -1.2, 1.2)
PLAT = (-4.45, 4.65, -4.5, 4.57)
LOWER_LEGS = [(-4.35, -4.5), (4.7, -4.5), (-4.35, 4.6), (4.7, 4.6)]
UPPER_LEGS = [(-3.6, -3.7), (3.95, -3.7), (-3.6, 3.8), (3.95, 3.8)]


def leg(x, z, y0, y1, h=0.17):
    return box(x - h, y0, z - h, x + h, y1, z + h)


hx0, hx1, hz0, hz1 = HATCH
px0, px1, pz0, pz1 = PLAT
deck = [
    box(px0, DECK - 0.2, pz0, px1, DECK, hz0),
    box(px0, DECK - 0.2, hz1, px1, DECK, pz1),
    box(px0, DECK - 0.2, hz0, hx0, DECK, hz1),
    box(hx1, DECK - 0.2, hz0, px1, DECK, hz1),
]
RAIL = 1.05
rails = [
    # The deck's edge.
    box(px0, DECK, pz0 - 0.05, px1, DECK + RAIL, pz0),
    box(px0, DECK, pz1, px1, DECK + RAIL, pz1 + 0.05),
    box(px0 - 0.05, DECK, pz0, px0, DECK + RAIL, pz1),
    box(px1, DECK, pz0, px1 + 0.05, DECK + RAIL, pz1),
]
# Round the hatch, but on the ladder's side (north): west, south and east (drawn: a yellow
# safety rail, top bar, mid bar and posts).
hatch_rails = [
    box(hx0 - 0.05, DECK, hz0, hx0, DECK + 1.0, hz1),
    box(hx0 - 0.05, DECK, hz1, hx1 + 0.05, DECK + 1.0, hz1 + 0.05),
    box(hx1, DECK, hz0, hx1 + 0.05, DECK + 1.0, hz1),
]
drawn_rails = []
for x0, z0, x1, z1 in [
    (hx0 - 0.05, hz0, hx0, hz1),
    (hx0 - 0.05, hz1, hx1 + 0.05, hz1 + 0.05),
    (hx1, hz0, hx1 + 0.05, hz1),
]:
    for y0, y1 in [(DECK + 0.95, DECK + 1.0), (DECK + 0.5, DECK + 0.54)]:
        drawn_rails.append(box(x0, y0, z0, x1, y1, z1))
for x, z in [(hx0, hz0), (hx0, hz1), (hx1, hz1), (hx1, hz0)]:
    drawn_rails.append(box(x - 0.03, DECK, z - 0.03, x + 0.03, DECK + 1.0, z + 0.03))
models = {
    "radio-mast": {
        # Drawn: the steps onto the base and the hatch's rail (repair_building_access.mjs draws
        # stairs and groups); the rest is collision only.
        "doors": [],
        "meshFloors": True,
        "keepFacade": True,
        "stairs": [
            # Steps up onto the base on its south side, square to it, up to its edge.
            {"bounds": [-0.6, 0.0, 5.08, 0.9, BASE, 7.4], "axis": "z", "high": "min", "clearUp": 1.3},
        ],
        "clear": [
            # The base's top (voxels 0.1-0.3 m proud) with the legs' feet.
            box(-4.95, BASE - 0.25, -5.05, 5.25, BASE + 0.35, 5.12),
            # The ladder's column, from the base up through the hatch.
            box(hx0, BASE + 0.01, hz0, hx1, DECK + 0.4, hz1),
            # The deck (voxels proud) and its rail's and the legs' voxels at its height.
            box(px0 - 0.3, DECK - 0.45, pz0 - 0.3, px1 + 0.3, DECK + 0.4, pz1 + 0.3),
        ],
        "solid": [
            box(-4.9, 0.0, -5.01, 5.2, BASE, 5.08),
            # The base's edge under the steps (their envelope cleared it).
            box(-0.6, 0.0, 4.7, 0.9, BASE, 5.1),
            *[leg(x, z, BASE, BASE + 0.4) for x, z in LOWER_LEGS],
            *[leg(x, z, DECK - 0.45, DECK + 0.4) for x, z in UPPER_LEGS],
            *deck,
            *rails,
            *hatch_rails,
        ],
        "groups": [{"name": "Hatch rail", "color": [0.8, 0.62, 0.12], "boxes": drawn_rails}],
        "color": [0.42, 0.43, 0.44],
    }
}
spec = {
    "version": "access-v17",
    "baseManifest": "models.access-v16.json",
    "baseCollision": "collision.access-v16.json",
    "notes": "The Iron Peaks broadcast tower climbable for the second zip-line: steps onto its "
    "base, its ladder's column, its platform exact, rails. Generated by art/br/fitout/zipline2.py.",
    "models": models,
}
out = ROOT / "building-access-v17.json"
out.write_text(json.dumps(spec, indent=1) + "\n")
ROUTE = {
    "model": "radio-mast",
    "top": BASE,
    "route": [[0.15, 9.5], [0.15, 7.6], [0.15, 6.2], [0.15, 4.6], [0.15, 2.0], [0.15, -0.5]],
}
routes_file = ROOT / "tower-routes.json"
routes = [t for t in json.loads(routes_file.read_text()) if t["model"] != ROUTE["model"]]
routes_file.write_text(json.dumps(routes + [ROUTE], indent=1) + "\n")
print(out)
