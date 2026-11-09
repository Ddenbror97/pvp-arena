#!/usr/bin/env python3
"""Blackwater Prison's cell blocks (owner, 2026-11-09: the prison "should be on a slightly
rock/hill", the area audited so it is not flat and boring): the downloaded brick cell block
(`prison-block`, The Prison by Veterock, CC BY) made enterable as a three-tier cell house.
Writes art/br/building-access-v10.json, applied by repair_building_access.mjs on top of the
prison-v1 revision.

    python3 -I art/br/fitout/prison.py

The block (52 x 12.7 m, the entrance front facing +z) is two four-storey wings (inner x 10.5 to
25 m either side, roof slab 11.97-12.5 m) either side of a lower centre (inner z -5.5 to 1.5 m,
roof 9.31-9.82 m) whose front is set back. Inside:

  - each wing a cell house: two rows of four cells (back and front) on three tiers (floors 0.06,
    4.9 and 9.82 m), galleries along the cell fronts and an open well down the middle;
  - a switchback stair in each well: ground -> first tier (rising to the wing's end, onto a
    landing across the well), then first -> top tier (back towards the centre);
  - the top tiers level with the centre's roof: a door from each wing out onto it (a roof
    terrace between the wings, overlooking the yard);
  - the centre: the guard hall on the ground floor (main and back doors, the desk), the control
    floor above, joining the wings' first tiers;
  - four ways in on the ground: main, back and a door in each wing's end.
Bars, bunks and loot in the cells are placements (layout.ts `prisonInterior`); half the cells
are barred shut, half stand open (the riot's aftermath).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import T, box, cut_x, door, room_ceiling, room_liners, wall_x  # noqa: E402

F0, F1, F2 = 0.06, 4.9, 9.82  # F2 is the centre's roof level
SLAB = 0.25
WX0, WX1 = 10.5, 25.0  # a wing's inner x range (mirrored either side)
ZB, ZF = -5.5, 5.5  # back and front inner faces of the wings
ZC = 1.5  # the centre's front (set back)
WING_TOP = 11.9  # just under the wings' roof slab (11.97)
CENTRE_TOP = 9.25  # just under the centre's roof slab (9.31)
# Across a wing (z): back cells, back gallery, the well, front gallery, front cells.
CELL_B = (ZB, -2.9)
GAL_B = (-2.9, -1.5)
WELL = (-1.5, 1.5)
GAL_F = (1.5, 2.9)
CELL_F = (2.9, ZF)
CELLS = 4
CELL_W = (WX1 - WX0) / CELLS
LAND = 2.0  # landing depth (x) across the well
DOOR_H = 2.6
RAIL_H = 1.05

models = {}
ROUTES = []


def mx(s, x0, x1):
    """A wing's x interval on side s (-1 west, +1 east), as (low, high)."""
    a, b = s * x0, s * x1
    return (min(a, b), max(a, b))


def rail_x(x0, x1, z, y):
    return box(x0, y, z - 0.06, x1, y + RAIL_H, z + 0.06)


def rail_z(z0, z1, x, y):
    return box(x - 0.06, y, z0, x + 0.06, y + RAIL_H, z1)


walls, fittings, slabs, cuts, doors, stairs, solid = [], [], [], [], [], [], []
tops = {F0: F1 - SLAB, F1: F2 - SLAB, F2: WING_TOP}
for s in (-1, 1):
    wx = mx(s, WX0, WX1)
    inner = s * WX0  # the wing's side towards the centre
    end = s * WX1  # the wing's end wall
    # Clear the wing's inside (mesh and collision) up to its ceiling.
    cuts.append(box(wx[0] + 0.05, F0 + 0.01, ZB + 0.05, wx[1] - 0.05, WING_TOP + 0.05, ZF - 0.05))
    # Tiers: the cell rows and galleries (front and back strips), and a landing across the well
    # (first tier at the wing's end, top tier at the centre's side).
    for y, land_at in ((F1, end - s * LAND), (F2, inner + s * LAND)):
        slabs.append(box(wx[0], y - SLAB, ZB, wx[1], y, WELL[0]))
        slabs.append(box(wx[0], y - SLAB, WELL[1], wx[1], y, ZF))
        lx = (min(land_at, end if y == F1 else inner), max(land_at, end if y == F1 else inner))
        slabs.append(box(lx[0], y - SLAB, WELL[0], lx[1], y, WELL[1]))
    # Stairs in the well: A (back half) ground -> first tier, rising to the end; B (front half)
    # first -> top tier, rising back to the centre.
    sx = mx(s, WX0 + LAND, WX1 - LAND)
    stairs.append({"bounds": [sx[0], F0, WELL[0], sx[1], F1, 0.0], "axis": "x", "high": "max" if s > 0 else "min"})
    stairs.append({"bounds": [sx[0], F1, 0.0, sx[1], F2, WELL[1]], "axis": "x", "high": "min" if s > 0 else "max"})
    # Rails: the galleries along the well (where no flight leaves them), the landings' open
    # edges, and the centre's first floor where it meets the well.
    for y in (F1, F2):
        ga = mx(s, WX0, WX1 - LAND) if y == F1 else mx(s, WX0 + LAND, WX1)
        walls.append(rail_x(ga[0], ga[1], WELL[0], y))
        walls.append(rail_x(ga[0], ga[1], WELL[1], y))
    walls.append(rail_z(WELL[0], WELL[1], inner, F1))
    # Cells: partitions between them on every tier, the back row's end wall at the centre,
    # and the fronts (a doorway in each; the barred cells' fronts are open to the bars' height
    # and the bars themselves are placements).
    for y0 in (F0, F1, F2):
        y1 = tops[y0]
        for k in range(1, CELLS):
            px = s * (WX0 + k * CELL_W)
            for z0, z1 in (CELL_B, CELL_F):
                walls.append(box(px - T / 2, y0, z0, px + T / 2, y1, z1))
        walls.append(box(min(inner, inner + s * T), y0, CELL_B[0], max(inner, inner + s * T), y1, CELL_B[1]))
        for k in range(CELLS):
            cx = s * (WX0 + (k + 0.5) * CELL_W)
            barred = (k + (y0 > F0)) % 2 == 0
            gap = (cx, 3.5, 2.72) if barred else (cx, 1.2, 2.3)
            for zf in (CELL_B[1], CELL_F[0] - T):
                lo, hi = mx(s, WX0 + k * CELL_W, WX0 + (k + 1) * CELL_W)
                walls += wall_x(zf, lo + T / 2, hi - T / 2, y0, y1, [gap])
                if barred:
                    # The bars (a placement) shut the cell: solid in the block's own collision
                    # too, so no loot is found in a cell nobody can enter.
                    solid.append(box(lo + T / 2, y0, zf, hi - T / 2, y0 + 2.72, zf + T))
    # Doors: one in the wing's end (ground), one out onto the centre's roof (top tier).
    doors.append(door(end + s * 0.45, 0.0, F0, DOOR_H, "z", 1.6))
    cuts.append(box(min(end, end + s * 1.4) - 0.05, F0, -0.8, max(end, end + s * 1.4) + 0.05, DOOR_H, 0.8))
    doors.append(door(inner - s * 0.25, 0.0, F2, F2 + 2.05, "z", 1.2))
    cuts.append(box(min(inner, inner - s * 1.1), F2, -0.6, max(inner, inner - s * 1.1), F2 + 2.05, 0.6))

# The centre: its inside cleared, the control floor over the guard hall, the desk, the doors.
cuts.append(box(-WX0 + 0.05, F0 + 0.01, ZB + 0.05, WX0 - 0.05, CENTRE_TOP + 0.05, ZC - 0.05))
slabs.append(box(-WX0, F1 - SLAB, ZB, WX0, F1, ZC))
fittings.append(box(-3.2, F0, -2.4, 3.2, F0 + 1.1, -1.6))  # the guard desk across the hall
fittings.append(box(-3.2, F0, -2.4, -2.4, F0 + 1.1, -1.4))
fittings.append(box(2.4, F0, -2.4, 3.2, F0 + 1.1, -1.4))
fittings.append(box(-1.4, F1, -5.35, 1.4, F1 + 0.9, -4.6))  # the control desk upstairs
doors.append(door(0.0, ZC + 0.25, F0, DOOR_H, "x", 1.6))
cuts.append(cut_x(0.0, ZC - 0.1, ZC + 0.8, F0, DOOR_H, 1.6))
doors.append(door(0.0, ZB - 0.45, F0, DOOR_H, "x", 1.6))
cuts.append(cut_x(0.0, ZB - 1.0, ZB + 0.1, F0, DOOR_H, 1.6))

# Liners and ceilings: round the whole plan to the centre's ceiling, the wings above it.
plan = [(-WX1, -WX0, ZB, ZF), (-WX0, WX0, ZB, ZC), (WX0, WX1, ZB, ZF)]
gaps = [(0.0, ZC, 1.8, 2.75), (0.0, ZB, 1.8, 2.75), (-WX1, 0.0, 1.8, 2.75), (WX1, 0.0, 1.8, 2.75)]
walls += room_liners(plan, F0, CENTRE_TOP, gaps)
for s in (-1, 1):
    wing = [(min(s * WX0, s * WX1), max(s * WX0, s * WX1), ZB, ZF)]
    walls += room_liners(wing, CENTRE_TOP, WING_TOP, [(s * WX0, 0.0, 1.3, F2 + 2.05 - CENTRE_TOP)])
walls += room_ceiling(plan[:1] + plan[2:], WING_TOP)
walls += room_ceiling(plan[1:2], CENTRE_TOP)

floors = [box(-WX1, 0.0, ZB, -WX0, F0, ZF), box(-WX0, 0.0, ZB, WX0, F0, ZC), box(WX0, 0.0, ZB, WX1, F0, ZF)]
models["prison-block"] = {
    "doors": doors,
    "cuts": cuts,
    "floors": floors,
    "groups": [
        {"name": "Walls", "color": [0.62, 0.6, 0.56], "boxes": walls},
        {"name": "Tiers", "color": [0.45, 0.46, 0.47], "boxes": slabs},
        {"name": "Fittings", "color": [0.36, 0.38, 0.42], "boxes": fittings},
    ],
    "stairs": stairs,
    "solid": solid,
    "color": [0.5, 0.48, 0.45],
}

# Walked routes (model-local x, z): every door in, and the full climb in each wing from its end
# door: along the well, up to the first tier's landing, back up to the top tier and out onto
# the centre's roof.
ROUTES += [
    ["prison-block", [[0.0, 6.0], [0.0, 0.4], [-6.0, 0.4]]],
    ["prison-block", [[0.0, -9.5], [0.0, -4.0], [5.0, -3.6]]],
]
for s in (-1, 1):
    ROUTES.append(
        [
            "prison-block",
            [
                [s * 29.0, 0.0], [s * 23.6, 0.0], [s * 18.0, 0.75], [s * 11.6, 0.75], [s * 11.6, -0.75],
                [s * 22.6, -0.75], [s * 23.9, 0.0], [s * 22.6, 0.75], [s * 11.9, 0.75], [s * 11.3, 0.0],
                [s * 8.0, 0.0], [s * 8.0, -3.0],
            ],
        ]
    )

spec = {
    "version": "access-v10",
    "baseManifest": "models.prison-v1.json",
    "baseCollision": "collision.prison-v1.json",
    "notes": "Blackwater Prison's cell block made enterable (2026-11-09). Generated by art/br/fitout/prison.py.",
    "models": models,
}
out = Path(__file__).resolve().parents[1] / "building-access-v10.json"
out.write_text(json.dumps(spec, indent=1) + "\n")
routes_file = Path(__file__).resolve().parents[1] / "building-access-routes.json"
routes = [r for r in json.loads(routes_file.read_text()) if r[0] not in {m for m, _ in ROUTES}]
routes_file.write_text(json.dumps(routes + ROUTES, indent=2) + "\n")
print(out, len(ROUTES), "routes")
