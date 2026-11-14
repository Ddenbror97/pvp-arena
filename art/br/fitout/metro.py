#!/usr/bin/env python3
"""The Downtown metro's new buildings made enterable (owner, 2026-11-14: "Ensure new buildings can
be enterble/doors and have same optimizations rest of the map"). Each measured from its processed
LOD0 (plan sections and up-facing surfaces, 2026-11-14), model-local metres:

- burger-joint (Tiger's Burgers V2): a hollow shell, walls x -7.95..7.95, z -12.85..13.1, the
  roof's top at 6.4; its two entrance vestibules on the north (-z) front, x 0.25..1.75 and
  5.5..7.0, z -13.6..-12.2, each with a painted door on its front face. The doorways are cut
  through the vestibules and the wall; the dining room is floored, lined, ceiled at 3.6 m and
  given a service counter.
- car-showroom (showroom building): a glass box, walls x -8.75..8.75, z -5.35..5.25, the roof's
  underside at 12.0; glazed on its south (+z) front and west end. The doorway is cut in the
  glass front; the showroom is floored, lined on its two solid walls and ceiled, with an office
  mezzanine across the back (4.2 m) reached by a stair along the east wall.
- conservatory (Greenhouse Victorian): the glass barrel vault x -10.5..9.6, z -5.2..4.8, its
  porch on the east end (x 9.5..10.7, z -1.7..1.3), open outwards; the painted door between the
  porch and the house (x 9.0..9.5) is cut and fitted. Floored only: glass all round.
- car-wash (Modern Car Wash & Cafe, sunk 0.78 m so its lot is at the ground): a walled lot with
  four wash bays along the north side, entered from the south (x -3..4); the cafe along the
  east side (x 21.5..27.5, z -5.05..19.0), its shopfront a knee wall with open glazing above
  and a doorway at z 3.25..4.25. The cafe's doorway gets a fitted door, a floor and a counter.

Writes art/br/building-access-v24.json (applied by repair_building_access.mjs on top of the
metro-v1 revision) and its walks to art/br/building-access-routes.json.

    python3 -I art/br/fitout/metro.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import T, box, cut_x, cut_z, door, room_ceiling, room_liners, wall_x, wall_z  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PLASTER = [0.86, 0.83, 0.76]
TILE = [0.62, 0.6, 0.56]
WOOD = [0.45, 0.31, 0.2]
STEEL = [0.32, 0.33, 0.35]
STONE = [0.58, 0.56, 0.52]
DOOR_H = 2.25

models = {}
ROUTES = []

# Burger joint.
FL = 0.12
ROOM = (-7.8, 7.8, -12.7, 12.95)
CEIL = 3.6
VEST = [1.0, 6.25]  # the vestibules' centres (x)
VEST_FACE = -13.6
x0, x1, z0, z1 = ROOM
models["burger-joint"] = {
    "doors": [door(x, VEST_FACE, FL, FL + DOOR_H, "x", 1.1) for x in VEST],
    "cuts": [cut_x(x, VEST_FACE - 0.2, -12.0, FL, FL + DOOR_H, 1.1) for x in VEST]
    + [box(x0 + 0.02, FL + 0.01, z0 + 0.02, x1 - 0.02, 6.2, z1 - 0.02)],
    "floors": [box(x0, FL - 0.3, z0, x1, FL, z1), *[box(x - 0.7, FL - 0.3, -13.6, x + 0.7, FL, z0) for x in VEST]],
    "groups": [
        {
            "name": "Dining room's walls and ceiling",
            "color": PLASTER,
            "boxes": room_liners([ROOM], FL, CEIL, [(x, z0, 1.5, DOOR_H + 0.05) for x in VEST])
            + room_ceiling([ROOM], CEIL + 0.15),
        },
        # The service counter across the back, open at its east end; booths along the west wall.
        {
            "name": "Counter and booths",
            "color": WOOD,
            "boxes": [box(x0 + T, FL, 6.0, 4.6, FL + 1.05, 6.7)]
            + [box(x0 + T, FL, z, -5.6, FL + 0.75, z + 1.6) for z in (-10.5, -7.0, -3.5, 0.0)],
        },
    ],
    "color": TILE,
}
ROUTES += [
    ["burger-joint", [[1.0, -16.0], [1.0, -14.2], [1.0, -11.5], [-2.0, -4.0], [2.0, 3.0]]],
    ["burger-joint", [[6.25, -16.0], [6.25, -14.2], [6.25, -11.5], [6.0, 4.0], [6.6, 9.0]]],
]

# Car showroom.
FL = 0.15
ROOM = (-8.55, 8.5, -4.95, 4.95)
CEIL = 11.85
MEZ = 4.2
MEZ_EDGE = -1.8
STAIR = (7.1, 8.35, MEZ_EDGE, 3.6)  # along the east wall, rising north (-z)
DOOR_X, FRONT = 0.0, 5.25
x0, x1, z0, z1 = ROOM
sx0, sx1, sz0, sz1 = STAIR
walls = (
    # The solid north wall and east end lined; the glass front and west end left as they are.
    wall_x(z0, x0, x1, FL, CEIL)
    + wall_z(x1 - T, z0 + T, z1, FL, CEIL)
)
models["car-showroom"] = {
    "doors": [door(DOOR_X, FRONT, FL, FL + DOOR_H, "x", 2.0)],
    "cuts": [
        cut_x(DOOR_X, z1 - 0.15, FRONT + 0.35, FL, FL + DOOR_H, 2.0),
        box(x0 + 0.02, FL + 0.01, z0 + 0.02, x1 - 0.02, CEIL + 0.1, z1 - 0.02),
    ],
    "floors": [box(x0, FL - 0.3, z0, x1, FL, z1), box(x0, MEZ - 0.25, z0, x1 - T, MEZ, MEZ_EDGE)],
    "stairs": [
        {"bounds": [sx0, FL, sz0, sx1, MEZ, sz1], "axis": "z", "high": "min", "clearUp": 1.3},
    ],
    "groups": [
        {"name": "Showroom's walls and ceiling", "color": PLASTER, "boxes": walls + room_ceiling([ROOM], CEIL + 0.15)},
        # The mezzanine's rail along its open edge, clear of the stair's head.
        {
            "name": "Mezzanine rail and sales desk",
            "color": STEEL,
            "boxes": [
                box(x0, MEZ, MEZ_EDGE, sx0 - 0.05, MEZ + 1.0, MEZ_EDGE + 0.1),
                # The stair's open side, a rail from the floor's edge to its head.
                box(sx0 - 0.1, MEZ, MEZ_EDGE - 0.1, sx0, MEZ + 1.0, MEZ_EDGE + 0.1),
                box(-7.6, FL, 1.0, -5.0, FL + 1.0, 1.8),
            ],
        },
    ],
    "color": STONE,
}
ROUTES += [
    ["car-showroom", [[DOOR_X, 7.6], [DOOR_X, 3.8], [-3.0, 0.0], [-6.0, -3.2]]],
    # In, along the front to the stair's foot, up onto the mezzanine and into its middle.
    ["car-showroom", [[DOOR_X, 7.6], [DOOR_X, 4.2], [7.7, 4.4], [7.7, 3.2], [7.7, -1.2], [7.7, -3.0], [0.0, -3.4]]],
]

# Conservatory.
FL = 0.12
HALL = (-10.3, 9.0, -5.0, 4.6)
PORCH = (9.0, 10.7, -1.6, 1.2)
DOOR_Z, DOOR_W = -0.1, 1.4
models["conservatory"] = {
    "doors": [door(9.25, DOOR_Z, FL, FL + DOOR_H, "z", DOOR_W)],
    "cuts": [cut_z(DOOR_Z, 8.75, 9.75, FL, FL + DOOR_H, DOOR_W)],
    "floors": [box(a, FL - 0.3, c, b, FL, d) for a, b, c, d in (HALL, PORCH)],
    "color": STONE,
}
ROUTES += [["conservatory", [[13.0, DOOR_Z], [10.3, DOOR_Z], [8.2, DOOR_Z], [0.0, -1.0], [-7.0, 1.5]]]]

# Car wash: the cafe.
FL = 0.1
CAFE = (21.55, 27.45, -5.0, 18.95)
CAFE_DOOR_Z = 3.75
x0, x1, z0, z1 = CAFE
models["car-wash"] = {
    "doors": [door(21.25, CAFE_DOOR_Z, FL, FL + DOOR_H, "z", 1.2)],
    "cuts": [cut_z(CAFE_DOOR_Z, 20.8, 21.75, FL, FL + DOOR_H, 1.2)],
    "floors": [box(x0, FL - 0.3, z0, x1, FL, z1)],
    "groups": [
        {
            "name": "Cafe counter and tables",
            "color": WOOD,
            "boxes": [box(25.9, FL, 8.0, 27.3, FL + 1.05, 15.0)]
            + [box(23.0, FL, z, 24.2, FL + 0.75, z + 1.2) for z in (-2.5, 0.5, 6.5, 10.0, 13.5)],
        },
    ],
    "color": TILE,
}
ROUTES += [
    # In through the lot's south gate, across the lot and into the cafe.
    ["car-wash", [[0.5, 23.0], [0.5, 17.0], [18.5, 6.0], [18.5, CAFE_DOOR_Z], [22.6, CAFE_DOOR_Z], [24.8, 3.0], [24.8, -3.5]]],
]

spec = {
    "version": "access-v24",
    "baseManifest": "models.metro-v1.json",
    "baseCollision": "collision.metro-v1.json",
    "notes": "The Downtown metro's burger joint, car showroom (with its mezzanine), conservatory "
    "and car wash cafe enterable, each through a fitted door. Generated by art/br/fitout/metro.py.",
    "models": models,
}
out = ROOT / "building-access-v24.json"
out.write_text(json.dumps(spec, indent=1) + "\n")
routes_file = ROOT / "building-access-routes.json"
routes = [r for r in json.loads(routes_file.read_text()) if r[0] not in {m for m, _ in ROUTES}]
routes_file.write_text(json.dumps(routes + ROUTES, indent=2) + "\n")
print(out, len(ROUTES), "routes")
