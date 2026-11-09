#!/usr/bin/env python3
"""Southern Military Base and Murder Cabins (owner, 2026-11-09: "last 2 areas/locations to audit
and upgrade … make those last 2 areas complete"): the downloaded buildings made enterable.
Writes art/br/building-access-v11.json, applied by repair_building_access.mjs on top of the
military-v1 revision.

    python3 -I art/br/fitout/military.py

  - control-post (Low Poly Military Building, 19.9 x 12.9 m): one room, doors front and back;
  - command-post (Military Control Building, 28.5 x 18.5 m): two floors, a flight along the
    back wall up to the first floor (rails round its well), doors in the front (the model's own doorway) and the side;
  - camp-cabin (Abandoned Cabin, 10.5 x 9.2 m): one room on a raised floor, the porch steps
    made a walkable flight up to the front door.
Each is cleared inside (mesh and collision) and given floors, liners and a ceiling.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import box, cut_x, cut_z, door, room_ceiling, room_liners  # noqa: E402

models = {}
ROUTES = []
SLAB = 0.25


def hall(model, rect, floor, ceiling, doors_spec, extra=None):
    """One building: everything inside `rect` (x0, x1, z0, z1) cut to the ceiling, a floor,
    liners with the doorways, a ceiling. doors_spec: (side, centre, outer face, width) with
    side 'n' (z0), 's' (z1), 'w' (x0), 'e' (x1); the outer face is the wall's outside."""
    x0, x1, z0, z1 = rect
    doors_, cuts_, gaps = [], [], []
    for side, c, outer, w in doors_spec:
        top = floor + 2.3
        if side in "ns":
            inner = z0 if side == "n" else z1
            doors_.append(door(c, (inner + outer) / 2, floor, top, "x", w))
            cuts_.append(cut_x(c, min(inner, outer) - 0.15, max(inner, outer) + 0.15, floor, top, w))
            gaps.append((c, inner, w + 0.2, top - floor + 0.1))
        else:
            inner = x0 if side == "w" else x1
            doors_.append(door((inner + outer) / 2, c, floor, top, "z", w))
            cuts_.append(cut_z(c, min(inner, outer) - 0.15, max(inner, outer) + 0.15, floor, top, w))
            gaps.append((inner, c, w + 0.2, top - floor + 0.1))
    spec = {
        "doors": doors_,
        "cuts": cuts_ + [box(x0 + 0.02, floor + 0.01, z0 + 0.02, x1 - 0.02, ceiling + 0.2, z1 - 0.02)],
        "floors": [box(x0, 0.0, z0, x1, floor, z1)],
        "groups": [
            {
                "name": "Interior",
                "color": [0.6, 0.6, 0.57],
                "boxes": room_liners([rect], floor, ceiling, gaps) + room_ceiling([rect], ceiling + 0.15),
            }
        ],
        "stairs": [],
        "color": [0.45, 0.44, 0.42],
    }
    if extra:
        extra(spec)
    models[model] = spec


# The control post: inner x -8.5...7.5, z -5.25...4.45 (its walls 0.5 m thick), floor 0.26 m,
# roof slab from 3.03 m; doors in the long sides.
hall("control-post", (-8.5, 7.5, -5.25, 4.45), 0.26, 2.85, [("s", 0.8, 5.05, 1.6), ("n", 0.8, -5.8, 1.6)])
ROUTES += [
    ["control-post", [[0.8, 8.5], [0.8, 3.0], [-4.0, 0.0]]],
    ["control-post", [[0.8, -9.0], [0.8, -3.5], [4.0, -1.0]]],
]

# The command post: inner x -12.6...11.4, z -7.0...6.4; floors 0.38 and 4.84 m, roof slab from
# 8.55 m. A flight along the back wall (x -9 -> -1, rising east) up to the first floor.
F0, F1, TOP = 0.38, 4.84, 8.4
CP = (-12.6, 11.4, -7.0, 6.4)
FLIGHT = (-9.0, -1.0, -6.95, -5.15)


def command_extra(spec):
    x0, x1, z0, z1 = CP
    fx0, fx1, fz0, fz1 = FLIGHT
    spec["stairs"].append({"bounds": [fx0, F0, fz0, fx1, F1, fz1], "axis": "x", "high": "max"})
    # The plinth is 0.38 m high all round: a ramp up to each door.
    spec["stairs"].append({"bounds": [-11.2, 0.0, 7.55, -8.8, F0, 9.3], "axis": "z", "high": "min"})
    spec["stairs"].append({"bounds": [12.55, 0.0, -1.2, 14.3, F0, 1.2], "axis": "x", "high": "min"})
    # The first floor round the flight's well.
    slab = [
        box(x0, F1 - SLAB, z0, fx0, F1, z1),
        box(fx1, F1 - SLAB, z0, x1, F1, z1),
        box(fx0, F1 - SLAB, fz1, fx1, F1, z1),
    ]
    rails = [
        box(fx0, F1, fz1, fx1, F1 + 1.05, fz1 + 0.12),
        box(fx0 - 0.12, F1, fz0, fx0, F1 + 1.05, fz1),
    ]
    spec["groups"].append({"name": "First floor", "color": [0.48, 0.48, 0.47], "boxes": slab + rails})


hall("command-post", CP, F0, TOP, [("s", -10.0, 7.55, 1.4), ("e", 0.0, 12.55, 1.6)], command_extra)
ROUTES += [
    ["command-post", [[-10.0, 10.5], [-10.0, 4.0], [-4.0, 2.0]]],
    ["command-post", [[15.5, 0.0], [8.0, 0.0]]],
    ["command-post", [[-10.0, 10.5], [-10.0, 0.0], [-10.0, -4.2], [-10.0, -6.05], [-1.6, -6.05], [0.5, -4.0], [6.0, 0.0]]],
]

# The camp cabin: inner x -5.0...3.5, z -4.3...2.0, floor 0.9 m; the front door over the porch
# steps (x -2.5...1.0, z 2.5...4.5), whose 0.44 m risers become one walkable flight.


def cabin_extra(spec):
    spec["stairs"].append({"bounds": [-2.5, 0.0, 2.5, 1.0, 0.9, 4.5], "axis": "z", "high": "min"})
    spec["floors"].append(box(-2.5, 0.0, 2.0, 1.0, 0.9, 2.5))


hall("camp-cabin", (-5.0, 3.5, -4.3, 2.0), 0.9, 3.75, [("s", -0.75, 2.5, 1.2)], cabin_extra)
ROUTES += [["camp-cabin", [[-0.75, 7.5], [-0.75, 3.2], [-0.75, 0.6], [-3.0, -2.0]]]]

spec = {
    "version": "access-v11",
    "baseManifest": "models.military-v1.json",
    "baseCollision": "collision.military-v1.json",
    "notes": "Southern Military Base's control and command posts and Murder Cabins' camp cabin "
    "made enterable (2026-11-09). Generated by art/br/fitout/military.py.",
    "models": models,
}
out = Path(__file__).resolve().parents[1] / "building-access-v11.json"
out.write_text(json.dumps(spec, indent=1) + "\n")
routes_file = Path(__file__).resolve().parents[1] / "building-access-routes.json"
routes = [r for r in json.loads(routes_file.read_text()) if r[0] not in {m for m, _ in ROUTES}]
routes_file.write_text(json.dumps(routes + ROUTES, indent=2) + "\n")
print(out, len(ROUTES), "routes")
