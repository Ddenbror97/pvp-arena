#!/usr/bin/env python3
"""Fit-outs that make the 2026-11-08 landmark buildings enterable (owner: "ensure any new
buildings can be entered, with openable doors"): hospital, school, rail depot, brick switch house
and chapel. Writes their entries into art/br/building-access-v6.json (doors, cuts, floors,
stairs); repair_building_access.mjs then cuts the shells and adds the boxes, drawn and solid.

    python3 -I art/br/fitout/landmarks.py

The downloaded shells are exterior-only (their faces are invisible from inside), so every room
gets liner walls just inside the shell and a ceiling; upper storeys get a slab, stairs and an
opening over the stairs. Coordinates are model-local metres (models.access-v6 sizes), measured
from each shell's collision boxes.
"""
import json
from pathlib import Path

T = 0.15  # liner and partition thickness


def r(v):
    return round(v, 3)


def box(x0, y0, z0, x1, y1, z1):
    return [r(x0), r(y0), r(z0), r(x1), r(y1), r(z1)]


def wall_x(z, x0, x1, y0, y1, gaps=(), t=T):
    """A wall along x at z (thickness t towards +z), with door gaps (centre x, width, height)."""
    out, cur = [], x0
    for c, w, h in sorted(gaps):
        a, b = c - w / 2, c + w / 2
        if a > cur:
            out.append(box(cur, y0, z, a, y1, z + t))
        if h < y1 - y0:
            out.append(box(a, y0 + h, z, b, y1, z + t))
        cur = b
    if cur < x1:
        out.append(box(cur, y0, z, x1, y1, z + t))
    return out


def wall_z(x, z0, z1, y0, y1, gaps=(), t=T):
    """A wall along z at x (thickness t towards +x), with door gaps (centre z, width, height)."""
    return [[b[2], b[1], b[0], b[5], b[4], b[3]] for b in wall_x(x, z0, z1, y0, y1, gaps, t)]


def liner(x0, x1, z0, z1, y0, y1, gaps=None):
    """Liner walls just inside a shell's inner faces; gaps per side 'n' (z0), 's', 'w' (x0), 'e'."""
    g = gaps or {}
    return (
        wall_x(z0, x0, x1, y0, y1, g.get("n", ()))
        + wall_x(z1 - T, x0, x1, y0, y1, g.get("s", ()))
        + wall_z(x0, z0 + T, z1 - T, y0, y1, g.get("w", ()))
        + wall_z(x1 - T, z0 + T, z1 - T, y0, y1, g.get("e", ()))
    )


def slab(x0, x1, z0, z1, y, thick=0.2, hole=None):
    """A floor or ceiling slab (top at y) with an optional rectangular hole (x0, x1, z0, z1)."""
    if not hole:
        return [box(x0, y - thick, z0, x1, y, z1)]
    hx0, hx1, hz0, hz1 = hole
    parts = [
        (x0, x1, z0, hz0),
        (x0, x1, hz1, z1),
        (x0, hx0, hz0, hz1),
        (hx1, x1, hz0, hz1),
    ]
    return [box(a, y - thick, c, b, y, d) for a, b, c, d in parts if b - a > 0.05 and d - c > 0.05]


def door(x, z, y0, y1, along, width):
    return {"x": r(x), "z": r(z), "y0": r(y0), "y1": r(y1), "along": along, "width": r(width)}


def cut_x(x, z0, z1, y0, y1, width):
    """Cut a doorway through a wall running along x (centre x, the wall between z0 and z1)."""
    return box(x - width / 2, y0, z0, x + width / 2, y1, z1)


def cut_z(z, x0, x1, y0, y1, width):
    return box(x0, y0, z - width / 2, x1, y1, z + width / 2)


models = {}

# Hospital (40 × 24.5 m shell, walls 0.3 m: inner x −19.7…19.9, z −12.06…11.94). Two storeys
# open (ground and first, 4.15 m), sealed above; the main door in the south facade's entrance
# bay (x −0.5…2.5); stairs along the west wall; a corridor wall with doorways on each floor.
H1, H2 = 4.15, 8.3
hx0, hx1, hz0, hz1 = -19.7, 19.9, -12.06, 11.94
stairs_h = {"bounds": [-19.5, 0, -7.0, -17.7, H1 + 0.2, 0.0], "axis": "z", "high": "max"}
hole_h = (-19.6, -17.5, -7.4, 0.0)
doors_h = [(1.0, 1.8, 2.6)]
floors_h = (
    # A ground floor over the terrain (also the trees' clearing: none grows indoors).
    slab(hx0, hx1, hz0, hz1, 0.06, 0.06)
    + liner(hx0, hx1, hz0, hz1, 0, H2, {"s": [(1.0, 1.8, 2.6)]})
    + slab(hx0, hx1, hz0, hz1, H1 + 0.2, 0.2, hole_h)
    + slab(hx0, hx1, hz0, hz1, H2, 0.25)
    # Ground floor: the corridor wall (wards north, lobby south), doorways every 8 m.
    + wall_x(-2.0, -17.4, hx1 - T, 0, H1, [(c, 1.4, 2.3) for c in (-13, -5, 3, 11, 17)])
    # First floor: the same, rooms off the corridor.
    + wall_x(-2.0, -17.4, hx1 - T, H1 + 0.2, H2 - 0.25, [(c, 1.4, 2.3) for c in (-13, -5, 3, 11, 17)])
    + wall_z(-4.0, -2.0 + T, hz1 - T, H1 + 0.2, H2 - 0.25, [(5.0, 1.4, 2.3)])
    + wall_z(8.0, -2.0 + T, hz1 - T, H1 + 0.2, H2 - 0.25, [(5.0, 1.4, 2.3)])
    # The stairwell's rail on the first floor (waist high, the open side).
    + [box(-17.5, H1 + 0.2, -7.4, -17.35, H1 + 1.2, 0.0)]
)
models["hospital"] = {
    "doors": [door(1.0, 12.08, 0.06, 2.6, "x", 1.8)],
    "cuts": [cut_x(1.0, 11.6, 12.6, 0, 2.6, 2.0)],
    "floors": floors_h,
    "stairs": [stairs_h],
    "color": [0.78, 0.8, 0.76],
}

# Rail depot (16.3 × 27.2 m hall, inner x −7.56…7.44, z −12.7…12.8, eaves 6.6 m). The east
# engine door's bay is opened full height (an engine-shed portal); a personnel door with a
# door panel in the west bay.
dx0, dx1, dz0, dz1 = -7.56, 7.44, -12.7, 12.8
models["rail-depot"] = {
    "doors": [door(-4.0, -12.85, 0.06, 2.3, "x", 1.2)],
    "cuts": [cut_x(3.85, -13.4, -12.5, 0, 4.8, 5.4), cut_x(-4.0, -13.4, -12.5, 0, 2.3, 1.4)],
    "floors": slab(dx0, dx1, dz0, dz1, 0.06, 0.06)
    + liner(dx0, dx1, dz0, dz1, 0, 6.4, {"n": [(-4.0, 1.4, 2.3), (3.85, 5.4, 4.8)]})
    + slab(dx0, dx1, dz0, dz1, 6.6, 0.2),
    "color": [0.55, 0.56, 0.58],
}

# Brick switch house (7.1 × 10.5 m, inner x −2.95…3.05, z −4.65…4.95, 5.7 m): a door in the
# south wall between its windows.
sx0, sx1, sz0, sz1 = -2.95, 3.05, -4.65, 4.95
models["brick-substation"] = {
    "doors": [door(0.1, 5.1, 0.06, 2.3, "x", 1.1)],
    "cuts": [cut_x(0.1, 4.5, 5.6, 0, 2.3, 1.3)],
    "floors": slab(sx0, sx1, sz0, sz1, 0.06, 0.06)
    + liner(sx0, sx1, sz0, sz1, 0, 5.5, {"s": [(0.1, 1.3, 2.3)]}) + slab(sx0, sx1, sz0, sz1, 5.7, 0.2),
    "color": [0.52, 0.36, 0.3],
}

# Chapel (12 × 6.8 m, nave inner x −5.4…5.4, z −1.29…2.91, floor 0.3 m, walls to 4.8 m): its
# narrow south door widened to 1.4 m.
cx0, cx1, cz0, cz1 = -5.4, 5.4, -1.29, 2.91
models["chapel"] = {
    "doors": [door(-1.8, 3.1, 0.3, 2.6, "x", 1.4)],
    "cuts": [cut_x(-1.8, 2.7, 3.6, 0.3, 2.6, 1.6)],
    "floors": slab(cx0, cx1, cz0, cz1, 0.3, 0.3)
    + liner(cx0, cx1, cz0, cz1, 0.3, 4.8, {"s": [(-1.8, 1.6, 2.3)]})
    + slab(cx0, cx1, cz0, cz1, 5.0, 0.2),
    "color": [0.85, 0.82, 0.74],
}

# School: the three-storey classroom block (inner x −29.45…29.35, z 15.69…26.19, floor 0.3 m)
# with ground and first floors open (3.6 m storeys) and a stair at its east end; the gym annex
# (inner x −0.35…23.05, z −24.81…5.19, an 8 m hall, floor 0.6 m) through its own east door, up
# steps. (The covered walkway between them stays shut: its 2.4 m ceiling leaves no head room
# over the annex's raised floor.) The main door in the south facade.
F0, F1, F2 = 0.3, 3.9, 7.5
bx0, bx1, bz0, bz1 = -29.45, 29.35, 15.69, 26.19
ax0, ax1, az0, az1 = -0.35, 23.05, -24.81, 5.19
stairs_s = {"bounds": [24.0, F0, 16.0, 28.8, F1 + 0.2, 17.8], "axis": "x", "high": "max"}
hole_s = (24.0, 29.3, 15.8, 18.0)
rooms = [(c, 1.4, 2.3) for c in (-24, -16, -8, 0, 13, 21)]
models["school"] = {
    "doors": [door(-2.3, 26.25, F0, 2.6, "x", 1.4), door(23.2, -10.0, 0.6, 2.9, "z", 1.4)],
    "cuts": [
        cut_x(-2.3, 25.7, 26.8, F0, 2.6, 1.6),
        cut_z(-10.0, 22.6, 23.9, 0.0, 2.9, 1.6),
    ],
    "floors": slab(bx0, bx1, bz0, bz1, F0, F0)
    + slab(ax0, ax1, az0, az1, 0.6, 0.6)
    + liner(bx0, bx1, bz0, bz1, F0, F2, {"s": [(-2.3, 1.6, 2.3)]})
    + slab(bx0, bx1, bz0, bz1, F1 + 0.2, 0.2, hole_s)
    + slab(bx0, bx1, bz0, bz1, F2, 0.25)
    # Classrooms off a corridor (the corridor along the north wall), both floors.
    + wall_x(19.5, bx0 + T, 23.4, F0, F1, rooms)
    + wall_x(19.5, bx0 + T, 23.4, F1 + 0.2, F2 - 0.25, rooms)
    + [b for x in (-20, -12, -4, 9, 17) for b in wall_z(x, 19.5 + T, bz1 - T, F0, F1)]
    + [b for x in (-20, -12, -4, 9, 17) for b in wall_z(x, 19.5 + T, bz1 - T, F1 + 0.2, F2 - 0.25)]
    + [box(24.0, F1 + 0.2, 18.0, 27.6, F1 + 1.2, 18.15)]
    # The gym hall.
    # (Its ceiling under the shell's roof trusses, which hang to about 7.3 m.)
    + liner(ax0, ax1, az0, az1, 0.6, 7.0, {"e": [(-10.0, 1.6, 2.3)]})
    + slab(ax0, ax1, az0, az1, 7.2, 0.2),
    "stairs": [
        stairs_s,
        # Steps up to the annex's floor (0.6 m) outside its east door.
        {"bounds": [23.05, 0, -10.8, 25.0, 0.6, -9.2], "axis": "x", "high": "min"},
    ],
    "color": [0.86, 0.84, 0.78],
}

path = Path("art/br/building-access-v6.json")
spec = json.loads(path.read_text())
spec["notes"]["landmarks"] = (
    "Owner 2026-11-08 (new buildings enterable, with opening doors): hospital, school, rail depot, "
    "brick switch house and chapel are fitted out by art/br/fitout/landmarks.py (liner walls, "
    "ceilings, slabs, stairs, doors)."
)
spec["models"].update(models)
path.write_text(json.dumps(spec, indent=2) + "\n")
print({k: (len(v["floors"]), len(v["doors"]), len(v.get("stairs", []))) for k, v in models.items()})
