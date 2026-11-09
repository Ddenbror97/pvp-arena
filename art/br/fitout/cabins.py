#!/usr/bin/env python3
"""Doors and halls for buildings that could not be entered: the 2026-11-09 downloads that are dwellings (owner: "ensure any new buildings can be
entered, with openable doors"): the Pine Ridge log cabin (its own door was a separate part, left
out) and the old mountain hut (an open doorway). Writes art/br/building-access-v8.json, applied
by repair_building_access.mjs on top of the audit-v1 revision.

    python3 -I art/br/fitout/cabins.py

Floors are drawn in both models (meshFloors: exact collision only). Coordinates are model-local
metres, measured from the processed meshes (door frames, sills and floors).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import box, cut_x, door, room_ceiling, room_liners  # noqa: E402

STONE = [0.36, 0.34, 0.31]

models = {
    # Log cabin (6.3 × 4.4 m): the door frame's posts at x 1.19…1.31 and 2.24…2.36 in the south
    # wall (z 1.47…1.67), the floor and porch at 0.20 m. Voxels of the porch rail and the frame
    # narrowed the way in: cleared, the porch floor exact.
    "log-cabin": {
        "doors": [door(1.775, 1.57, 0.2, 2.2, "x", 0.93)],
        "cuts": [box(1.31, 0.2, 1.4, 2.24, 2.2, 1.74)],
        "floors": [box(-2.89, 0.1, -1.9, 2.89, 0.2, 2.21)],
        # The porch rail's and frame's voxels at the door, and the partition's doorway (its
        # voxels left 0.6 m of a 0.8 m opening).
        "clear": [box(1.31, 0.21, 1.4, 2.24, 2.2, 2.6), box(0.4, 0.21, -1.2, 1.15, 2.1, -0.22)],
        "meshFloors": True,
        "groups": [
            # Set on the highest ground under it (layout.ts), the cabin stands up to 0.5 m
            # clear of the lower ground: a stone footing fills that, and steps climb to the porch.
            {
                "name": "Footing and steps",
                "color": STONE,
                "boxes": [
                    box(-2.85, -0.9, -1.88, 2.85, 0.05, 2.18),
                    box(1.2, -0.9, 2.18, 2.35, 0.03, 2.5),
                    box(1.2, -0.9, 2.5, 2.35, -0.22, 2.82),
                ],
            },
        ],
        "stairs": [],
        "color": [0.4, 0.3, 0.2],
    },
    # Old hut (6.2 × 7.8 m at the kit's 1.15 fit): a doorway in the south wall (x −0.54…0.64,
    # sill 0.28 m, head 2.22 m), the floor at 0.12 m.
    "old-hut": {
        "doors": [door(0.05, 3.28, 0.28, 2.22, "x", 1.08)],
        "cuts": [box(-0.48, 0.28, 2.93, 0.6, 2.22, 3.7)],
        "floors": [box(-2.5, 0.0, -3.33, 2.47, 0.12, 3.0), box(-0.67, 0.0, 3.0, 0.64, 0.28, 3.39)],
        "meshFloors": True,
        "groups": [
            {
                "name": "Footing and steps",
                "color": STONE,
                "boxes": [
                    box(-2.48, -0.9, -3.3, 2.45, -0.01, 2.98),
                    box(-0.67, -0.9, 3.39, 0.64, 0.05, 3.7),
                    box(-0.67, -0.9, 3.7, 0.64, -0.2, 4.0),
                    box(-0.67, -0.9, 4.0, 0.64, -0.45, 4.3),
                ],
            },
        ],
        "stairs": [],
        "color": [0.4, 0.3, 0.2],
    },
}
# ---------------------------------------------------------------------------------------------
# Closed industrial shells (building audit 2026-11-09): five downloaded halls had no way in at
# all (their doors are painted on). Each gets one hall on its ground floor: everything inside cut
# away to the ceiling (mesh and collision), a slab, plaster liners and a ceiling, and steel doors
# cut through the facades, in the middle of each long side. Inside = the bounds inset by 0.8 m.
SHELL = [0.62, 0.62, 0.6]
ROUTES = []


def shell(model, half_x, half_z, ceiling, door_sides=("s", "n"), along_z=False):
    x0, x1, z0, z1 = -half_x + 0.8, half_x - 0.8, -half_z + 0.8, half_z - 0.8
    gaps, doors, cuts, frames = [], [], [], []
    for side in door_sides:
        # Doors in the long walls: the z walls (s/n) for halls long in x, the x walls (e/w) else.
        if not along_z:
            z = z1 if side == "s" else z0
            outer = half_z if side == "s" else -half_z
            gaps.append((0.0, z, 1.8, 2.75))
            doors.append(door(0.0, (z + outer) / 2, 0.06, 2.6, "x", 1.6))
            cuts.append(cut_x(0.0, min(z, outer) - 0.2, max(z, outer) + 0.2, 0.0, 2.6, 1.6))
            # Jambs and a lintel close the cavity between the liner and the shell at the door.
            a, b = min(z, outer), max(z, outer)
            frames += [box(-1.05, 0.0, a, -0.8, ceiling, b), box(0.8, 0.0, a, 1.05, ceiling, b),
                       box(-0.8, 2.6, a, 0.8, ceiling, b)]
            sgn = 1 if side == "s" else -1
            ROUTES.append([model, [[0.0, outer + sgn * 4], [0.0, z - sgn * 3], [0.0, round(z / 2, 2)]]])
        else:
            x = x1 if side == "e" else x0
            outer = half_x if side == "e" else -half_x
            gaps.append((x, 0.0, 1.8, 2.75))
            doors.append(door((x + outer) / 2, 0.0, 0.06, 2.6, "z", 1.6))
            cuts.append(box(min(x, outer) - 0.2, 0.0, -0.8, max(x, outer) + 0.2, 2.6, 0.8))
            a, b = min(x, outer), max(x, outer)
            frames += [box(a, 0.0, -1.05, b, ceiling, -0.8), box(a, 0.0, 0.8, b, ceiling, 1.05),
                       box(a, 2.6, -0.8, b, ceiling, 0.8)]
            sgn = 1 if side == "e" else -1
            ROUTES.append([model, [[outer + sgn * 4, 0.0], [x - sgn * 3, 0.0], [round(x / 2, 2), 0.0]]])
    rect = [(x0, x1, z0, z1)]
    models[model] = {
        "doors": doors,
        # The room's volume is cut out of the mesh too: the imports' inner walls and floors
        # would otherwise stand in the hall drawn but without collision.
        "cuts": cuts + [box(x0 + 0.01, 0.07, z0 + 0.01, x1 - 0.01, ceiling + 0.3, z1 - 0.01)],
        "floors": [box(x0, 0.0, z0, x1, 0.06, z1)],
        "groups": [
            {
                "name": "Interior walls and ceiling",
                "color": SHELL,
                "boxes": room_liners(rect, 0.06, ceiling, gaps)
                + room_ceiling(rect, ceiling + 0.15)
                + frames,
            }
        ],
        "stairs": [],
        "color": [0.42, 0.42, 0.4],
    }


shell("ind-terminal", 26.72, 7.92, 5.0)
shell("ind-building-1", 13.51, 23.77, 4.2, ("e", "w"), along_z=True)
shell("ind-building-10", 21.75, 41.63, 5.0, ("e", "w"), along_z=True)
shell("ind-factory", 23.26, 47.65, 6.0, ("e", "w"), along_z=True)
shell("hangar-j", 30.94, 44.94, 7.0, ("e", "w"), along_z=True)

spec = {
    "version": "access-v8",
    "baseManifest": "models.audit-v1.json",
    "baseCollision": "collision.audit-v1.json",
    "notes": "Doors for the Pine Ridge log cabin and the old mountain hut (2026-11-09). "
    "Generated by art/br/fitout/cabins.py.",
    "models": models,
}
out = Path(__file__).resolve().parents[1] / "building-access-v8.json"
out.write_text(json.dumps(spec, indent=1) + "\n")
routes_file = Path(__file__).resolve().parents[1] / "building-access-routes.json"
routes = [r for r in json.loads(routes_file.read_text()) if r[0] not in {m for m, _ in ROUTES}]
routes_file.write_text(json.dumps(routes + ROUTES, indent=2) + "\n")
print(out, len(ROUTES), "shell routes")
