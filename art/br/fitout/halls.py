#!/usr/bin/env python3
"""The works halls' fit-outs measured again (owner, 2026-11-11: "there is a building that is
totaly white"). The 2026-11-09 fit-outs (locations.py, access-v9) assumed each hall's shell was
centred and as wide as its model, but the models' bounds include eaves and annexes: the liners
and ceilings stood up to 4 m outside the real walls and covered the facades with flat grey and
white slabs (the factory hall's west side, the long sides of both warehouses, the smithy's front).

Measured from each original model's collision (collision.json, voxel 0.3 m, 2026-11-11): the
inner and outer faces of the walls, the lowest roof underside. The liners now stand just inside
the walls, the doors go through the real walls, and the ceilings stay under the roofs. Writes
art/br/building-access-v12.json, applied by repair_building_access.mjs to the original models on
top of the sites-v1 revision.

    python3 -I art/br/fitout/halls.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import box, door, room_ceiling, room_liners  # noqa: E402

SHELL = [0.62, 0.62, 0.6]
models = {}
ROUTES = []

# model: inner faces (x0, x1, z0, z1) of the room the liners line (inside every stretch of wall:
# where a wall steps in, the room's edge follows the innermost face), the outer faces where the
# doors go through, the ceiling, the door sides, the doors' position along those sides.
HALLS = {
    # 14.6 x 26 m; the west wall's outer face at -5.49, the east's at 7.11; the roof 14.7 m up.
    "factory-hall": ((-4.59, 6.21, -11.5, 12.2), (-5.49, 7.11, -12.1, 12.65), 8.0, ("e", "w"), 0.2),
    # Two storeys (a slab at 3.3 m, opened into one hall as before); the south front's middle
    # is recessed to 4.61 (outer 4.91); the roof 9.4 m up.
    "ind-warehouse-4": ((-20.44, 20.36, -4.99, 4.61), (-21.04, 20.96, -5.29, 4.91), 6.5, ("s", "n"), 0.0),
    # Walls 0.3 m, the gable ends' middles recessed to +-25.95; a gable roof from 7.5 m at the
    # walls. The long sides have loading docks 0.9 m up behind a rail: the doors are in the ends.
    "ind-warehouse-5": ((-11.7, 11.7, -25.97, 25.93), (-12.0, 12.0, -26.27, 26.23), 7.2, ("s", "n"), 0.0),
    # The main block, east of its notched front corner (x < -1.7) and its low annex, which stay
    # closed; a slab at 3.3 m opened as before.
    "ind-smith": ((-1.67, 8.83, -5.6, 5.5), (-8.87, 9.13, -5.9, 5.8), 6.0, ("s", "n"), 3.5),
}
DOOR_W, DOOR_H = 1.6, 2.6


def hall(model, inner, outer, ceiling, sides, at):
    x0, x1, z0, z1 = inner
    ox0, ox1, oz0, oz1 = outer
    # The doors' position along their sides (a door on an east or west side sits at z = at).
    cx, cz = at, at
    mx, mz = round((x0 + x1) / 2, 2), round((z0 + z1) / 2, 2)
    gaps, doors_, cuts_, frames = [], [], [], []
    for side in sides:
        if side in ("s", "n"):
            z, o = (z1, oz1) if side == "s" else (z0, oz0)
            a, b = min(z, o), max(z, o)
            gaps.append((cx, z, DOOR_W + 0.2, DOOR_H + 0.15))
            doors_.append(door(cx, (a + b) / 2, 0.06, DOOR_H, "x", DOOR_W))
            # Through the wall and the liner, nothing else.
            cuts_.append(box(cx - DOOR_W / 2, 0.0, a - 0.2, cx + DOOR_W / 2, DOOR_H, b + 0.2))
            frames += [
                box(cx - DOOR_W / 2 - 0.25, 0.0, a, cx - DOOR_W / 2, ceiling, b),
                box(cx + DOOR_W / 2, 0.0, a, cx + DOOR_W / 2 + 0.25, ceiling, b),
                box(cx - DOOR_W / 2, DOOR_H, a, cx + DOOR_W / 2, min(ceiling, DOOR_H + 0.6), b),
            ]
            sgn = 1 if side == "s" else -1
            ROUTES.append([model, [[cx, o + sgn * 4], [cx, z - sgn * 3], [cx, round((z + mz) / 2, 2)]]])
        else:
            x, o = (x1, ox1) if side == "e" else (x0, ox0)
            a, b = min(x, o), max(x, o)
            gaps.append((x, cz, DOOR_W + 0.2, DOOR_H + 0.15))
            doors_.append(door((a + b) / 2, cz, 0.06, DOOR_H, "z", DOOR_W))
            cuts_.append(box(a - 0.2, 0.0, cz - DOOR_W / 2, b + 0.2, DOOR_H, cz + DOOR_W / 2))
            frames += [
                box(a, 0.0, cz - DOOR_W / 2 - 0.25, b, ceiling, cz - DOOR_W / 2),
                box(a, 0.0, cz + DOOR_W / 2, b, ceiling, cz + DOOR_W / 2 + 0.25),
                box(a, DOOR_H, cz - DOOR_W / 2, b, min(ceiling, DOOR_H + 0.6), cz + DOOR_W / 2),
            ]
            sgn = 1 if side == "e" else -1
            ROUTES.append([model, [[o + sgn * 4.5, cz], [x - sgn * 3, cz], [round((x + mx) / 2, 2), cz]]])
    rect = [(x0, x1, z0, z1)]
    models[model] = {
        "source": "original",
        "doors": doors_,
        # Everything inside the walls, to just over the ceiling (mesh and collision).
        "cuts": cuts_ + [box(x0 + 0.01, 0.07, z0 + 0.01, x1 - 0.01, ceiling + 0.3, z1 - 0.01)],
        "floors": [box(x0, 0.0, z0, x1, 0.06, z1)],
        "groups": [
            {
                "name": "Interior walls and ceiling",
                "color": SHELL,
                "boxes": room_liners(rect, 0.06, ceiling, gaps) + room_ceiling(rect, ceiling + 0.15) + frames,
            }
        ],
        "stairs": [],
        "color": [0.42, 0.42, 0.4],
    }


for name, (inner, outer, ceiling, sides, at) in HALLS.items():
    hall(name, inner, outer, ceiling, sides, at)

# The lighthouse at Fisher's Cove (2026-11-10 audit: no way in). The model is a diorama: the
# tower on a rock whose stone steps are sculpted, not walkable, and the keeper's house on a deck
# 3.75 m up (its floor x 1.5-7.5, z -0.8-1.2 inside the walls; its door painted on the east gable,
# x 7.6-8.2; the porch beyond it at 4.3-4.5 m, x 8-9.8, behind a rail). Measured from the
# model's upward faces and its collision (2026-11-11). Made enterable: a timber stair from the
# ground up to the porch (east, along x), a gap in the porch rail, the door through the gable.
LH_DOOR_Z, LH_DOOR_W = 0.3, 1.1
models["lighthouse"] = {
    "source": "original",
    "doors": [door(7.9, LH_DOOR_Z, 4.12, 6.3, "z", LH_DOOR_W)],
    "cuts": [
        # The doorway through the gable and its painted door.
        # (Head height from the porch, 4.45 m: to 6.35.)
        box(7.3, 3.8, LH_DOOR_Z - LH_DOOR_W / 2, 8.6, 6.35, LH_DOOR_Z + LH_DOOR_W / 2),
        # The porch rail where the stair comes up.
        box(9.2, 4.47, -0.45, 10.6, 5.9, 1.05),
    ],
    # The porch landing (the deck's planks and rail posts are uneven in collision).
    # And a step in the doorway (the house floor is 0.67 m below the porch).
    "floors": [
        box(8.25, 4.3, -0.4, 9.9, 4.45, 1.0),
        box(7.2, 3.78, LH_DOOR_Z - LH_DOOR_W / 2, 8.25, 4.12, LH_DOOR_Z + LH_DOOR_W / 2),
    ],
    "stairs": [{"bounds": [9.9, 0.0, -0.4, 15.4, 4.45, 1.0], "axis": "x", "high": "min"}],
    "groups": [],
    "color": [0.36, 0.26, 0.18],
}
ROUTES.append(["lighthouse", [[17.0, LH_DOOR_Z], [12.6, LH_DOOR_Z], [9.0, LH_DOOR_Z], [5.0, LH_DOOR_Z]]])

spec = {
    "version": "access-v12",
    "baseManifest": "models.sites-v1.json",
    "baseCollision": "collision.sites-v1.json",
    "notes": "The works halls' liners inside their real walls, the lighthouse's keeper's house "
    "enterable (2026-11-11). "
    "Generated by art/br/fitout/halls.py.",
    "models": models,
}
out = Path(__file__).resolve().parents[1] / "building-access-v12.json"
out.write_text(json.dumps(spec, indent=1) + "\n")
routes_file = Path(__file__).resolve().parents[1] / "building-access-routes.json"
routes = [r for r in json.loads(routes_file.read_text()) if r[0] not in {m for m, _ in ROUTES}]
routes_file.write_text(json.dumps(routes + ROUTES, indent=2) + "\n")
print(out, len(ROUTES), "routes")
