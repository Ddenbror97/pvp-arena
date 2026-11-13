#!/usr/bin/env python3
"""Painted doors made real (owner, 2026-11-13: "found 2 more buildings that cant be entered, fix",
with screenshots of the wooden house at the first zip-line's foot in Pine Ridge and the grey
works shed beside the quarry's factory hall). Both buildings already had one fitted door, on
the side the owner did not walk up to; the side he came from shows a door that is only
painted on. Measured from the skyline-v1 collision (the painted door's voxels stand proud of
the wall) and elevation renders (scripts/br/interior-review VIEWS), model-local metres:

- rural-wood-4 (the long wooden house): its front door (z +5.8, access-v1) and now the back
  door in the middle of the back wall (x -0.67..0.54, the wall's outer face at z -6.65,
  painted 2.7 m tall); a tread down to the ground behind it, like the front's.
- ind-warehouse-1 (the works shed): its east end door (x 16.55, access-v2) and now the painted
  door in the front wall by the west end (x -7.02..-5.52, 2.4 m, the wall at z 5.32..5.62) and
  the west end's (z -3.98..-2.48, the wall at x -16.32..-16.02).

The repair re-voxelises a model's collision from its current drawn mesh, so the earlier
revisions' doors, floors and treads are restated here (drawn already: meshFloors/meshStairs,
exact collision only) beside the new ones.

After the repair, ind-warehouse-1's far LOD goes back to skyline-v1's (walls-v2.lod2: one
draw, fewer triangles than the cut LOD1; the doors are too small to see at its distance):
models.access-v22.json is edited by hand for that.

Writes art/br/building-access-v22.json (applied by repair_building_access.mjs on top of
skyline-v1) and its walks to art/br/building-access-routes.json.

    python3 -I art/br/fitout/painted-doors.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import box, door  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
FL = 0.12  # both buildings' floor (the slabs access-v1 and v2 laid)

# rural-wood-4: the back door, centred on the painted one.
RW_X, RW_W, RW_TOP = -0.07, 1.2, 2.75
rw_doors = [
    door(0, 5.8, FL, 2.8, "x", 1.2),  # access-v1's front door
    door(RW_X, -6.4, FL, RW_TOP, "x", RW_W),
]
rw = {
    "doors": rw_doors,
    "cuts": [
        [-0.68, FL, 5.35, 0.68, 2.8, 6.2],  # access-v1's
        box(RW_X - RW_W / 2 - 0.08, FL, -6.95, RW_X + RW_W / 2 + 0.08, RW_TOP, -5.85),
    ],
    "floors": [
        [-8.2, 0.02, -5.5, 8.4, FL, 5.7],
        [-0.8, 0.02, 5.6, 0.8, FL, 6.2],
        # The new threshold, through the wall and the painted door's depth (drawn).
        box(RW_X - 0.8, 0.02, -6.9, RW_X + 0.8, FL, -5.45),
    ],
    "stairs": [
        {"bounds": [-0.8, 0, 6.1, 0.8, FL, 6.8], "axis": "z", "high": "min"},
        {"bounds": box(RW_X - 0.8, 0, -7.6, RW_X + 0.8, FL, -6.9), "axis": "z", "high": "max"},
    ],
    "color": [0.22, 0.18, 0.13],
}

# ind-warehouse-1: the front and west painted doors.
WF_X, WW_Z, IW_W, IW_TOP = -6.27, -3.23, 1.2, 2.5
iw = {
    "doors": [
        door(16.55, -4.38, FL, 2.6, "z", 1.2),  # access-v2's east door
        door(WF_X, 5.6, FL, IW_TOP, "x", IW_W),
        door(-16.3, WW_Z, FL, IW_TOP, "z", IW_W),
    ],
    "cuts": [
        [15.85, FL, -5.06, 17.25, 2.6, -3.7],  # access-v2's
        box(WF_X - IW_W / 2 - 0.08, FL, 5.15, WF_X + IW_W / 2 + 0.08, IW_TOP, 6.05),
        box(-16.75, FL, WW_Z - IW_W / 2 - 0.08, -15.85, IW_TOP, WW_Z + IW_W / 2 + 0.08),
    ],
    "floors": [
        [-16.5, 0.02, -6.15, 16.8, FL, 6.15],
        # The thresholds out to the painted doors' faces (drawn).
        box(WF_X - 0.75, 0.02, 6.1, WF_X + 0.75, FL, 6.3),
        box(-16.95, 0.02, WW_Z - 0.75, -16.45, FL, WW_Z + 0.75),
    ],
    "stairs": [],
    "color": [0.3, 0.27, 0.23],
}

models = {}
for mid, access in (("rural-wood-4", rw), ("ind-warehouse-1", iw)):
    # The earlier floors and the front tread are drawn already: only the new ones are added to
    # the mesh, so those go in a group of their own and the restated ones as exact collision.
    old_floors = access["floors"][:-2] if mid == "ind-warehouse-1" else access["floors"][:-1]
    new_floors = [f for f in access["floors"] if f not in old_floors]
    old_stairs = access["stairs"][:1]
    new_stairs = access["stairs"][1:]
    models[mid] = {
        "doors": access["doors"],
        "cuts": access["cuts"],
        "floors": old_floors,
        "meshFloors": True,
        "stairs": old_stairs + new_stairs,
        "meshStairs": True,
        "groups": [{"name": "New thresholds", "color": access["color"], "boxes": new_floors}]
        + (
            [
                {
                    "name": "Back tread",
                    "color": access["color"],
                    "boxes": [s["bounds"] for s in new_stairs],
                }
            ]
            if new_stairs
            else []
        ),
        "color": access["color"],
    }

spec = {
    "version": "access-v22",
    "baseManifest": "models.skyline-v1.json",
    "baseCollision": "collision.skyline-v1.json",
    "notes": "The painted doors of the Pine Ridge wooden house (rural-wood-4, its back) and the "
    "works shed (ind-warehouse-1, its front and west end) made real. Generated by "
    "art/br/fitout/painted-doors.py.",
    "models": models,
}
out = ROOT / "building-access-v22.json"
out.write_text(json.dumps(spec, indent=1) + "\n")

# In through each new door from 1.7 m out to 3.5 m inside.
ROUTES = [
    # One Murder Cabins house stands dug 0.9 m into the hillside behind it: its back door is
    # buried to the knee there (its front door is its way in).
    ["rural-wood-4", [[RW_X, -8.4], [RW_X, -3.0]], {"skip": [[-3089.8, 2108.8]]}],
    ["ind-warehouse-1", [[WF_X, 8.0], [WF_X, 2.5]]],
    ["ind-warehouse-1", [[-18.6, WW_Z], [-12.5, WW_Z]]],
]
routes_file = ROOT / "building-access-routes.json"
routes = json.loads(routes_file.read_text())
for r in ROUTES:
    routes = [q for q in routes if q[:2] != r[:2]]
    routes.append(r)
routes_file.write_text(json.dumps(routes, indent=2) + "\n")
print(out, len(ROUTES), "routes")
