#!/usr/bin/env python3
"""The 2026-11-11 estates and the super yacht made enterable (owner: "make sure the new houses is
possible to enter/door"). Three downloads, measured from their processed meshes (up-facing
surface heights, wall slices and sections of the LOD0, 2026-11-11):

- modern-house: a two-storey house, 36 x 15 m (floors 0.21 and 3.18 m, roof slab from 6.2 m).
- pool-villa: a two-storey villa on a 1.41 m podium (floors 1.58 and 5.07 m, roof from 8.0 m),
  a west wing, a long living room, a north-east block and a pool on the podium.
- lux-yacht: a 40 m motor yacht (swim platform 2.78 m, aft deck 4.3 m, salon 4.68 m,
  flybridge 8.0 m, the hull's floor 0.6-0.8 m).

Each house is cleared inside (mesh and collision) and given floors, liners just inside its real
walls, ceilings, a stair to the upper floor with rails round its well, and fitted doors; the
podium gets steps. The yacht keeps its decks, salon and flybridge as modelled (exact walkable
floors under them), and gets a boarding stair from the water to the swim platform, a stair
through the transom to the aft deck, and a lower deck fitted out
below the salon: a master cabin aft, a lounge and a forward cabin, with doors. Writes
art/br/building-access-v14.json, applied by repair_building_access.mjs on top of the
estates-v1 revision.

    python3 -I art/br/fitout/estates.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import T, box, door, room_ceiling, room_liners, slab  # noqa: E402

PLASTER = [0.86, 0.84, 0.79]
WOOD = [0.5, 0.36, 0.24]
DOOR_W, DOOR_H = 1.2, 2.3
models = {}
ROUTES = []


def rails_round(x0, x1, z0, z1, y, open_side, h=1.0, t=0.12):
    """Rails round a stair well (x0..x1, z0..z1) at floor height y; the side the stair arrives
    at ('n' z0, 's' z1, 'w' x0, 'e' x1) stays open."""
    out = []
    if open_side != "n":
        out.append(box(x0 - t, y, z0 - t, x1 + t, y + h, z0))
    if open_side != "s":
        out.append(box(x0 - t, y, z1, x1 + t, y + h, z1 + t))
    if open_side != "w":
        out.append(box(x0 - t, y, z0, x0, y + h, z1))
    if open_side != "e":
        out.append(box(x1, y, z0, x1 + t, y + h, z1))
    return out


def slabs(rects, y, thick, hole):
    out = []
    for x0, x1, z0, z1 in rects:
        hx0, hx1, hz0, hz1 = hole
        if hx1 <= x0 or hx0 >= x1 or hz1 <= z0 or hz0 >= z1:
            out += slab(x0, x1, z0, z1, y, thick)
        else:
            out += slab(x0, x1, z0, z1, y, thick, (max(hx0, x0), min(hx1, x1), max(hz0, z0), min(hz1, z1)))
    return out


def outer_door(side, c, inner, outer, y0, ceiling, gaps, doors_, cuts_, frames):
    """A door through a real wall: `side` 'x' for a wall along x (door at x = c), else along z."""
    a, b = min(inner, outer), max(inner, outer)
    # The cut reaches 0.6 m past the outer face: glazing and cladding stand proud of the wall.
    ca, cb = (a - 0.6, b + 0.2) if outer < inner else (a - 0.2, b + 0.6)
    if side == "x":
        gaps.append((c, inner, DOOR_W + 0.2, DOOR_H + 0.15))
        doors_.append(door(c, (a + b) / 2, y0, y0 + DOOR_H, "x", DOOR_W))
        cuts_.append(box(c - DOOR_W / 2, y0 - 0.02, ca, c + DOOR_W / 2, y0 + DOOR_H, cb))
        frames += [
            box(c - DOOR_W / 2 - 0.25, y0, a, c - DOOR_W / 2, ceiling, b),
            box(c + DOOR_W / 2, y0, a, c + DOOR_W / 2 + 0.25, ceiling, b),
            box(c - DOOR_W / 2, y0 + DOOR_H, a, c + DOOR_W / 2, min(ceiling, y0 + DOOR_H + 0.5), b),
        ]
    else:
        gaps.append((inner, c, DOOR_W + 0.2, DOOR_H + 0.15))
        doors_.append(door((a + b) / 2, c, y0, y0 + DOOR_H, "z", DOOR_W))
        cuts_.append(box(ca, y0 - 0.02, c - DOOR_W / 2, cb, y0 + DOOR_H, c + DOOR_W / 2))
        frames += [
            box(a, y0, c - DOOR_W / 2 - 0.25, b, ceiling, c - DOOR_W / 2),
            box(a, y0, c + DOOR_W / 2, b, ceiling, c + DOOR_W / 2 + 0.25),
            box(a, y0 + DOOR_H, c - DOOR_W / 2, b, min(ceiling, y0 + DOOR_H + 0.5), c + DOOR_W / 2),
        ]


def house(name, ground, upper, f0, f1, c0, c1, stair, hole, rails, doors_spec, extra_stairs=(), floor_color=(0.5, 0.42, 0.34), clear=(), solid=()):
    """ground/upper: room rectangles (inner faces); f0/f1 floor tops; c0/c1 ceilings (undersides
    of the slab above); stair: {bounds, axis, high}; hole: the well in the upper floor and the
    ground ceiling; rails: boxes; doors_spec: (side, centre, inner face, outer face)."""
    gaps, doors_, cuts_, frames = [], [], [], []
    for side, c, inner, outer in doors_spec:
        outer_door(side, c, inner, outer, f0, c0, gaps, doors_, cuts_, frames)
    cuts_ += [box(x0 + 0.01, f0 + 0.04, z0 + 0.01, x1 - 0.01, c0 + 0.02, z1 - 0.01) for x0, x1, z0, z1 in ground]
    cuts_ += [box(x0 + 0.01, f1 + 0.04, z0 + 0.01, x1 - 0.01, c1 + 0.02, z1 - 0.01) for x0, x1, z0, z1 in upper]
    # The well through the slab between the floors.
    hx0, hx1, hz0, hz1 = hole
    cuts_.append(box(hx0, c0 - 0.2, hz0, hx1, f1 + 0.05, hz1))
    floors = [box(x0, f0 - 0.2, z0, x1, f0, z1) for x0, x1, z0, z1 in ground]
    floors += slabs(upper, f1, 0.2, hole)
    walls = room_liners(ground, f0, c0, gaps) + room_liners(upper, f1, c1)
    ceil = slabs(ground, c0 + 0.15, 0.15, hole) + room_ceiling(upper, c1 + 0.15)
    models[name] = {
        "source": "original",
        "doors": doors_,
        "cuts": cuts_,
        "floors": floors,
        "stairs": [stair, *extra_stairs],
        "groups": [
            {"name": "Interior walls and ceilings", "color": PLASTER, "boxes": walls + ceil + frames},
            {"name": "Stair rails", "color": WOOD, "boxes": rails},
        ],
        "color": list(floor_color),
        "clear": list(clear),
        "solid": list(solid),
    }


# ---------------------------------------------------------------- modern-house
# Walls (slices 0.9-2.0 and 3.6-5.2 m, 0.25 m cells): north wall z -4.75..-4.25 (upstairs
# -5.0..-4.6), west wall x -10.25..-10.0, the west wing's x -16.5..-16.25 and its north wall
# z 0.5..1.0, the glazed south front z 7.0..7.25, the east wall x 14.25..14.5, the east annex
# x 14.5..18.25 from z 3.5. Floors 0.21 / 3.18, slab undersides 2.95 / 6.2.
MH_G = [(-9.95, 14.2, -4.2, 6.95), (-15.95, -9.95, 1.05, 6.95), (14.2, 17.95, 3.8, 6.95)]
MH_U = [(-9.95, 14.0, -4.45, 6.95), (-15.95, -9.95, 1.05, 6.95)]
MH_STAIR = {"bounds": [-4.6, 0.21, -4.05, 0.6, 3.18, -2.85], "axis": "x", "high": "max"}
MH_HOLE = (-4.4, 0.6, -4.45, -2.85)
house(
    "modern-house",
    MH_G,
    MH_U,
    0.21,
    3.18,
    2.8,
    6.05,
    MH_STAIR,
    MH_HOLE,
    rails_round(*MH_HOLE, 3.18, "e"),
    [("x", -4.0, 6.95, 7.25), ("x", 6.0, -4.2, -4.75), ("x", 16.0, 6.95, 7.25)],
)
ROUTES += [
    ["modern-house", [[-4.0, 10.5], [-4.0, 7.1], [-4.0, 4.0], [-5.4, -3.45], [1.4, -3.45], [3.0, 0.5], [-12.5, 4.0]]],
    ["modern-house", [[6.0, -8.0], [6.0, -4.5], [6.0, -1.0], [12.0, 2.0]]],
    ["modern-house", [[16.0, 10.5], [16.0, 7.1], [16.0, 5.4], [12.0, 5.4], [10.0, 3.0]]],
]

# ---------------------------------------------------------------- pool-villa
# The podium (top 1.41) covers the 35 x 35 m site; the house floors are 1.58 (ground) and 5.07
# (upper), the roof from 8.0. Ground rooms: the west wing (x -11.35..-10.85 its west wall), the
# living room along z -0.5..6.0 and the north-east block. Upstairs: the west wing, the bridge
# and the room over the living room (the double-height void floored over), the east wing.
PV_G = [(-10.8, -6.6, -7.2, 6.95), (-6.6, 8.1, 0.05, 5.9), (3.7, 8.1, -7.7, 0.05)]
PV_U = [(-10.9, -6.7, -6.4, 7.3), (-6.7, 2.0, -0.4, 4.4), (2.0, 6.4, -7.5, 7.3)]
PV_STAIR = {"bounds": [-8.4, 1.58, -5.5, -7.2, 5.07, 1.0], "axis": "z", "high": "max"}
PV_HOLE = (-8.4, -7.2, -4.6, 1.0)
# Steps up the podium: on the west side at the wing's door, on the north side at the block's.
PV_STEPS = [
    {"bounds": [-20.4, 0.0, 2.4, -17.35, 1.41, 3.6], "axis": "x", "high": "max"},
    {"bounds": [4.9, 0.0, -20.55, 6.1, 1.41, -17.5], "axis": "z", "high": "max"},
]
house(
    "pool-villa",
    PV_G,
    PV_U,
    1.58,
    5.07,
    4.55,
    7.9,
    PV_STAIR,
    PV_HOLE,
    rails_round(*PV_HOLE, 5.07, "s"),
    [("z", 3.0, -10.8, -11.35), ("x", 5.5, -7.7, -8.2)],
    PV_STEPS,
    (0.55, 0.5, 0.44),
    # The podium's voxels stand to 1.8 where lawn strips (1.57) meet its edge: an exact walk
    # (1.45) from each flight of steps to its door.
    clear=[box(-17.45, 1.42, 2.4, -11.3, 2.2, 3.6), box(4.9, 1.42, -17.6, 6.1, 2.2, -8.15)],
    solid=[box(-17.45, 1.21, 2.4, -11.3, 1.45, 3.6), box(4.9, 1.21, -17.6, 6.1, 1.45, -8.15)],
)
ROUTES += [
    ["pool-villa", [[-22.0, 3.0], [-20.6, 3.0], [-17.0, 3.0], [-11.2, 3.0], [-9.6, 3.0], [-9.6, -6.3], [-7.8, -6.3], [-7.8, 1.6], [-7.8, 4.0], [-3.0, 2.0], [2.7, 0.4], [4.0, -5.0]]],
    ["pool-villa", [[5.5, -22.0], [5.5, -20.7], [5.5, -17.2], [5.5, -9.0], [5.5, -7.9], [5.5, -3.0], [0.0, 3.0]]],
]

# ---------------------------------------------------------------- lux-yacht
# Bow towards +z. Swim platform 2.58-2.78 (z -16.6..-13.95), the transom and its bench to
# z -11.6, the aft deck 4.17-4.34 to z -2.6, the salon 4.68 to z 5, the flybridge 7.78-8.03
# (z -12.6..-1), the hull's floor 0.6-0.8 (x within +-1.9 from z -13.4 to 4.4).
Y_PLAT, Y_DECK, Y_SALON, Y_FLY, Y_LOW, Y_LOWC = 2.78, 4.3, 4.68, 8.0, 0.8, 3.95
LOW = (-1.9, 1.9, -11.0, 4.4)
LOW_HOLE = (-0.6, 0.6, -5.4, -1.4)
yacht_floors = [box(-4.0, Y_PLAT - 0.2, -16.6, 4.0, Y_PLAT, -13.95)]
yacht_floors += slabs([(-2.8, 2.8, -11.6, -3.0)], Y_DECK, 0.2, LOW_HOLE)
yacht_floors += slabs([(-2.8, 2.8, -2.4, 5.0)], Y_SALON, 0.2, LOW_HOLE)
yacht_floors += [box(-2.6, Y_FLY - 0.2, -12.6, 2.6, Y_FLY, -1.0)]
yacht_stairs = [
    # From the water up the stern to the swim platform (a boarding ladder in the sea).
    {"bounds": [-0.8, 0.0, -19.4, 0.8, Y_PLAT, -16.6], "axis": "z", "high": "max"},
    # Through the transom and its bench to the aft deck.
    {"bounds": [-0.8, Y_PLAT, -14.6, 0.8, Y_DECK, -11.6], "axis": "z", "high": "max"},
    # The aft deck up to the salon (0.38 m), either side of the well.
    {"bounds": [-2.8, Y_DECK, -3.0, -0.75, Y_SALON, -2.4], "axis": "z", "high": "max"},
    {"bounds": [0.75, Y_DECK, -3.0, 2.8, Y_SALON, -2.4], "axis": "z", "high": "max"},
    # Down from the salon to the lower deck.
    {"bounds": [-0.6, Y_LOW, -6.0, 0.6, Y_SALON, -1.4], "axis": "z", "high": "max"},
]
yacht_cuts = [
    # The cabins' doorways first: the door bake sizes each door by the first cut round it.
    box(-0.45, 0.78, -7.7, 0.45, 2.9, -7.35),
    box(-1.55, 0.78, 0.5, -0.65, 2.9, 0.85),
    # The stair's way through the transom, its bench and the cockpit table beyond.
    box(-0.8, Y_PLAT + 0.02, -14.6, 0.8, 6.9, -11.6),
    box(-1.2, Y_DECK + 0.02, -11.6, 1.2, 6.9, -10.3),
    box(LOW[0], Y_LOW + 0.02, LOW[2], LOW[1], Y_LOWC + 0.01, LOW[3]),
    box(LOW_HOLE[0], Y_LOWC - 0.2, LOW_HOLE[2], LOW_HOLE[1], Y_SALON + 0.05, LOW_HOLE[3]),
    # The salon's aft end either side of the well: a lobby clear of its sofa ends and chairs.
    box(-2.0, Y_DECK + 0.02, -6.6, -0.72, 6.9, -2.4),
    box(0.72, Y_DECK + 0.02, -6.5, 2.2, 6.9, -2.4),
    box(0.72, Y_SALON + 0.02, -2.4, 2.2, 6.9, -0.6),
    # Head room over the top of the well (the model's own companionway casing).
    box(-0.75, Y_SALON + 0.02, -3.4, 0.72, 6.6, -0.3),
]
# The lower deck (from z -11, clear of the transom stair above it): a master cabin aft (to
# z -7.6), a lounge with the stair, a cabin forward from
# z 0.6, doorways 0.9 x 2.1 with doors.
LOW_DOOR_W, LOW_DOOR_H = 0.9, 2.1
low_rect = [LOW]
low_walls = room_liners(low_rect, Y_LOW, Y_LOWC)
from kit import wall_x  # noqa: E402

low_walls += wall_x(-7.6, LOW[0] + T, LOW[1] - T, Y_LOW, Y_LOWC, [(0.0, LOW_DOOR_W, LOW_DOOR_H)])
low_walls += wall_x(0.6, LOW[0] + T, LOW[1] - T, Y_LOW, Y_LOWC, [(-1.1, LOW_DOOR_W, LOW_DOOR_H)])
low_floor = [box(LOW[0], Y_LOW - 0.2, LOW[2], LOW[1], Y_LOW, LOW[3])]
low_ceiling = slabs([LOW], Y_LOWC + 0.15, 0.15, LOW_HOLE)
yacht_rails = rails_round(*LOW_HOLE, Y_DECK, "s", h=1.4)
models["lux-yacht"] = {
    "source": "original",
    "meshFloors": True,
    "doors": [
        door(0.0, -7.6 + T / 2, Y_LOW, Y_LOW + LOW_DOOR_H, "x", LOW_DOOR_W),
        door(-1.1, 0.6 + T / 2, Y_LOW, Y_LOW + LOW_DOOR_H, "x", LOW_DOOR_W),
    ],
    "cuts": yacht_cuts,
    "floors": yacht_floors,
    "stairs": yacht_stairs,
    "groups": [
        {"name": "Lower deck floor", "color": [0.46, 0.33, 0.22], "boxes": low_floor},
        {"name": "Cabin walls and ceilings", "color": [0.9, 0.88, 0.83], "boxes": low_walls + low_ceiling},
        {"name": "Rails", "color": WOOD, "boxes": yacht_rails},
    ],
    "color": [0.62, 0.48, 0.32],
}
ROUTES += [
    ["lux-yacht", [[0.0, -21.0], [0.0, -19.6], [0.0, -16.0], [0.0, -14.8], [0.0, -11.0], [0.0, -9.0], [0.0, -6.2], [1.3, -5.9], [1.3, -1.2], [0.0, -0.7], [0.0, -1.5], [0.0, -5.9], [0.0, -6.8], [0.0, -9.5]]],
    ["lux-yacht", [[0.0, -21.0], [0.0, -19.6], [0.0, -16.0], [0.0, -14.8], [0.0, -11.0], [0.0, -9.0], [0.0, -6.2], [1.3, -5.9], [1.3, -1.2], [0.0, -0.7], [0.0, -1.5], [0.0, -5.9], [-1.2, -6.6], [-1.1, 1.5], [0.0, 2.8]]],
]

spec = {
    "version": "access-v14",
    "baseManifest": "models.estates-v1.json",
    "baseCollision": "collision.estates-v1.json",
    "notes": "The 2026-11-11 estates (modern-house, pool-villa) and the super yacht enterable. "
    "Generated by art/br/fitout/estates.py.",
    "models": models,
}
out = Path(__file__).resolve().parents[1] / "building-access-v14.json"
out.write_text(json.dumps(spec, indent=1) + "\n")
routes_file = Path(__file__).resolve().parents[1] / "building-access-routes.json"
routes = [r for r in json.loads(routes_file.read_text()) if r[0] not in {m for m, _ in ROUTES}]
routes_file.write_text(json.dumps(routes + ROUTES, indent=2) + "\n")
print(out, len(ROUTES), "routes")
