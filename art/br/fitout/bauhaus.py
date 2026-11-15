#!/usr/bin/env python3
"""The Bauhaus apartment block (bauhaus-block, 94 placements: Downtown, the stadium, Northstar,
Millhaven) given its storeys (owner, 2026-11-14: "the building on the screenshot can be entered
but missing correct floors/levels"). The download is a single-sheet shell 18 x 15.66 x 10.6 m
with nothing inside it; access-v7 fitted its front door and a lined entrance room on the ground
floor. Measured from its LOD0 (plan sections at 4.2, 7.2 and 10.2 m, model-local metres), the
upper storeys share this outline: the west wing x -7.75..-1.25, z -3.75..0.25; the body
x -3.75..7.75, z -1.25..3.75, its east end narrowing north of z 0.5; the roof at 11.8 m.

Added (on top of the current files, so access-v7's door and room stay):
- three floors at 2.85, 5.95 and 9.05 m (3.1 m storeys; the first sits on the entrance room's
  ceiling), each covering that outline less the stair well;
- a switchback stair in the middle of the body (x 2.2..4.5, z -1.2..1.9): flight A up the west
  half to a landing on the north wall, flight B back south to the next floor, one pair per
  storey, a divider between the flights and a partition on the well's west side; rails where a
  floor meets the well; the entrance room's east wall and ceiling opened over the stair's foot;
- the space under the first landing and flight filled.

Writes art/br/building-access-v25.json (repair_building_access.mjs, on the blackwater-v2
revision) and its walk to art/br/building-access-routes.json.

    python3 -I art/br/fitout/bauhaus.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import box, door  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CONCRETE = [0.74, 0.72, 0.68]
PLASTER = [0.84, 0.82, 0.77]
STEEL = [0.32, 0.33, 0.35]

LEVELS = [0.12, 2.85, 5.95, 9.05]
SLAB = 0.25
# The stair well and its flights.
WX0, WX1, WZ0, WZ1 = 2.2, 4.5, -1.2, 1.9
A = (2.2, 3.3)
DIV = (3.3, 3.4)
B = (3.4, 4.5)
LAND = -0.25  # the landing's south edge (the flights run from here to WZ1)
RAIL = 1.05

# The upper storeys' flat: the body of the block round the stair (the west wing and the south
# front are left as the shell has them: its balcony walls and the facade's diagonal band cross
# them, so they are walled off, not floored).
FLOORS = [
    (-1.3, WX0, -1.2, 2.9),  # west of the well
    (WX0, 7.6, WZ1, 2.9),  # south of the well (the flights' foot and head)
    (WX1, 5.6, -1.2, -0.3),  # east of the well, stepping out with the east facade
    (WX1, 6.1, -0.3, 0.5),
    (WX1, 7.2, 0.5, WZ1),
]
W = 0.1
# The flat's walls (the north one is the shell's).
WALLS = [
    (-1.3 - W, -1.3, -1.2, 2.9 + W),  # west: the wing behind it
    (-1.3 - W, 7.6 + W, 2.9, 2.9 + W),  # south: the front behind it
    (7.6, 7.6 + W, WZ1, 2.9),
    (7.2, 7.6, WZ1 - W, WZ1),
    (7.2, 7.2 + W, 0.5, WZ1 - W),
    (6.1, 7.2, 0.5 - W, 0.5),
    (6.1, 6.1 + W, -0.3, 0.5 - W),
    (5.6, 6.1, -0.3 - W, -0.3),
    (5.6, 5.6 + W, -1.2, -0.3 - W),
]
ROOF = 11.0  # under the roof's voxel plates

floors, stairs, partitions, rails = [], [], [], []
clears = []
for k in (1, 2, 3):
    y = LEVELS[k]
    top = LEVELS[k + 1] - SLAB if k < 3 else ROOF
    floors += [box(x0, y - SLAB, z0, x1, y, z1) for x0, x1, z0, z1 in FLOORS]
    partitions += [box(x0, y, z0, x1, top, z1) for x0, x1, z0, z1 in WALLS]
    # The shell's voxel collision inside the flat (its balcony walls and the diagonal band,
    # voxelised a cell thick into the rooms) cleared; the walls above close it again.
    clears += [box(x0 + 0.02, y - 0.01, z0 + 0.02, x1 - 0.02, top, z1 - 0.02) for x0, x1, z0, z1 in FLOORS]
STEPS = 8


def flight(x0, x1, y_south, y_north):
    """A flight between z LAND (north) and WZ1 (south), one entry a step: each tread a box one
    riser deep (an open stair), so the flights above and below in the switchback keep their
    headroom (one entry for the flight would be solid down to its foot)."""
    out = []
    for i in range(STEPS):
        za = LAND + (WZ1 - LAND) * i / STEPS
        zb = LAND + (WZ1 - LAND) * (i + 1) / STEPS
        ya = y_north + (y_south - y_north) * i / STEPS
        yb = y_north + (y_south - y_north) * (i + 1) / STEPS
        # The tread at the step's higher end, its underside at the lower one.
        out.append(
            {
                "bounds": box(x0, min(ya, yb), za, x1, max(ya, yb), zb),
                "axis": "z",
                "high": "min" if ya > yb else "max",
            }
        )
    return out


for k in (0, 1, 2):
    lo, hi = LEVELS[k], LEVELS[k + 1]
    mid = round((lo + hi) / 2, 3)
    stairs += flight(A[0], A[1], lo, mid)  # up north to the landing
    stairs += flight(B[0], B[1], hi, mid)  # back south to the next floor
    floors.append(box(WX0, mid - 0.2, WZ0, WX1, mid, LAND))
    # The well's west side: a partition the height of the storey, open at the flight's foot.
    partitions.append(box(WX0 - 0.05, lo, WZ0, WX0, hi - SLAB, 0.6))
# The divider between the flights, the whole height of the stair.
partitions.append(box(*(DIV[0], LEVELS[0], LAND), *(DIV[1], LEVELS[3] + RAIL, WZ1)))
for k in (1, 2, 3):
    y = LEVELS[k]
    # East of the well: B below comes up here; a rail along it.
    rails.append(box(WX1, y, WZ0, WX1 + 0.05, y + RAIL, WZ1))
# The top floor: no flight up, the well's west half railed off.
rails.append(box(WX0 - 0.05, LEVELS[3], 0.6, WX0, LEVELS[3] + RAIL, WZ1 + 0.05))
rails.append(box(A[0], LEVELS[3], WZ1, A[1], LEVELS[3] + RAIL, WZ1 + 0.05))
# Under the first landing and flight B: solid (nobody stands under a 1.3 m soffit).
m0 = (LEVELS[0] + LEVELS[1]) / 2
fill = [box(WX0, LEVELS[0], WZ0, WX1, m0 - 0.2, LAND), box(B[0], LEVELS[0], LAND, B[1], m0, WZ1)]
# At the stair's foot, the ground floor closed east of the divider (the entrance room's wall
# there is opened for the flight).
fill.append(box(3.25, LEVELS[0], WZ1, DIV[1], 2.6, 2.3))

spec = {
    "version": "access-v25",
    "baseManifest": "models.blackwater-v2.json",
    "baseCollision": "collision.blackwater-v2.json",
    "notes": "The Bauhaus block's three upper storeys and their stair. Generated by "
    "art/br/fitout/bauhaus.py.",
    "models": {
        "bauhaus-block": {
            "doors": [door(0, 3.23, 0.12, 2.5, "x", 1.2)],
            "cuts": [
                [-0.68, 0.12, 2.6, 0.68, 2.5, 5.85],  # the front door (access-v7)
                [3.05, 0.12, -1.05, 3.3, 2.65, 1.9],  # the entrance room's east wall at the stair
                [WX0, 2.3, -1.05, 3.3, 2.75, 2.05],  # and its ceiling over the stair's foot
                # and west of the foot, where you step off the flight's lower treads (the first
                # floor's slab, 0.15 m higher, closes it)
                [1.3, 2.3, 0.7, WX0, 2.75, 2.05],
            ],
            "floors": floors,
            "stairs": stairs,
            # The doorway's step (access-v7: drawn by the model).
            "solid": [[-0.68, 0.02, 2.65, 0.68, 0.12, 3.82]],
            # The well's voxel collision (the drawn steps and floors, voxelised a cell coarse)
            # cleared before the exact flights, landings, floors, rails and partitions go in.
            "clear": [box(WX0 - 0.2, 0.11, -1.15, WX1 + 0.25, LEVELS[3] + 1.3, WZ1 + 0.05)] + clears,
            "groups": [
                {"name": "Stair partitions", "color": PLASTER, "boxes": partitions + fill},
                {"name": "Stair rails", "color": STEEL, "boxes": rails},
            ],
            "color": CONCRETE,
        }
    },
}
out = ROOT / "building-access-v25.json"
out.write_text(json.dumps(spec, indent=1) + "\n")

# In through the front door, up all three storeys, out to the top floor's west wing.
up = []
for k in range(3):
    # (From the floor round the divider's end to the next flight's foot, as a player turns.)
    up += ([[2.75, 2.4]] if k else []) + [[2.75, 1.75], [2.75, -0.7], [3.95, -0.7], [3.95, 2.4]]
ROUTES = [["bauhaus-block", [[0, 6.5], [0, 3], [0, 1.0], [1.8, 1.4], *up, [1.0, 2.4], [-0.6, 1.0], [-0.6, -0.6]]]]
routes_file = ROOT / "building-access-routes.json"
routes = [r for r in json.loads(routes_file.read_text()) if r[0] != "bauhaus-block"]
routes_file.write_text(json.dumps(routes + ROUTES, indent=2) + "\n")
print(out, len(floors), "floors", len(stairs), "flights")
