#!/usr/bin/env python3
"""Location audit fit-outs (owner, 2026-11-09): the Central Hospital rebuilt inside as a place to
fight through ("enterable and fun to play inside, like H1Z1/PUBG/Warzone's hospital, with our own
touch"), and the new Millhaven works halls made enterable. Writes art/br/building-access-v9.json,
applied by repair_building_access.mjs on top of the locations-v1 revision.

    python3 -I art/br/fitout/locations.py

Hospital (40 x 24.7 m shell, 20.4 m to the roof; inner x -19.7...19.9, z -12.06...11.94, the
front, with its windows and main door, facing +z). Rebuilt from the original model:

  - three storeys (floors at 0.06, 7.2 and 13.8 m) and the roof (20.39 m);
  - four ways in on the ground: the main door, a back door and a door in each side;
  - two switchback stair cores, one at each end, from the ground to the second floor (never a
    single choke), and a third flight from the second floor up into the roof's stair house;
  - the front's upper windows opened (8 per floor): sightlines over the campus;
  - ground floor: the lobby under a two-storey atrium, the reception desk and waiting benches
    as cover, and the emergency bays behind half-height partitions;
  - first floor: eight wards off a corridor round the atrium (rails along it);
  - second floor: five front rooms over the forecourt, back rooms, the stair hall;
  - the roof: its stair house with a door, the plant, the parapet.
Beds, wheelchairs and oxygen in the rooms are placements (layout.ts `hospitalInterior`).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import T, box, cut_x, cut_z, door, room_ceiling, room_liners, slab, wall_x, wall_z  # noqa: E402

models = {}
ROUTES = []

# ------------------------------------------------------------------------------------ hospital
X0, X1, Z0, Z1 = -19.7, 19.9, -12.06, 11.94
F0, F1, F2, ROOF = 0.06, 7.2, 13.8, 20.36  # roof slab just under the mesh roof (20.39)
SLAB = 0.25
WIN_X = [(-18.2, -12.4), (-10.6, -4.7), (4.8, 10.6), (12.4, 18.3)]
WIN_Y = {F1: (8.55, 10.85), F2: (14.72, 16.95)}
DOOR_H = 2.6
# Stair cores: strips 1.8 m wide, flights between z -10 and -0.5, landings against the back wall.
ZL, ZH = -10.0, -0.5
W_A, W_B = (-19.55, -17.75), (-17.55, -15.75)  # west core: A ground->first, B first->second
E_A, E_B = (17.75, 19.55), (15.75, 17.55)  # east core, mirrored
# Second floor -> roof: in the middle front room, rising to +z into the raised front tower (the
# roof's stair house, x -4...4, z 5.2...12.3, 4 m high), whose door faces the roof (-z side).
C_X, C_Z = (-2.6, -0.8), (4.2, 11.7)
HOUSE = (-3.8, 3.8, 5.45, 12.05, 24.25)  # inner x0, x1, z0, z1, ceiling
HOUSE_DOOR_X = 1.8


def front_with_windows(y0, y1, windows, doors=()):
    """The front liner (z just inside Z1) from y0 to y1, with window holes (x0, x1, sill, top)
    and door gaps (centre, width, height)."""
    z = Z1 - T
    walls = wall_x(z, X0 + T, X1 - T, y0, y1, [(c, w, h) for c, w, h in doors])
    out = []
    for b in walls:
        pieces = [b]
        for wx0, wx1, sill, top in windows:
            nxt = []
            for p in pieces:
                if p[3] <= wx0 or p[0] >= wx1 or p[4] <= sill or p[1] >= top:
                    nxt.append(p)
                    continue
                if p[0] < wx0:
                    nxt.append(box(p[0], p[1], p[2], wx0, p[4], p[5]))
                if p[3] > wx1:
                    nxt.append(box(wx1, p[1], p[2], p[3], p[4], p[5]))
                a, c = max(p[0], wx0), min(p[3], wx1)
                if p[1] < sill:
                    nxt.append(box(a, p[1], p[2], c, sill, p[5]))
                if p[4] > top:
                    nxt.append(box(a, top, p[2], c, p[4], p[5]))
            pieces = nxt
        out += pieces
    return out


def side_liners(y0, y1, gaps):
    """North, west and east liners (the front is front_with_windows)."""
    return (
        wall_x(Z0, X0 + T, X1 - T, y0, y1, gaps.get("n", ()))
        + wall_z(X0, Z0 + T, Z1 - T, y0, y1, gaps.get("w", ()))
        + wall_z(X1 - T, Z0 + T, Z1 - T, y0, y1, gaps.get("e", ()))
    )


def stair(xs, y0, y1, high):
    return {"bounds": [xs[0], y0, ZL, xs[1], y1, ZH], "axis": "z", "high": high}


def head_hole(xs, y_low, y_high, slab_top, high, z_lo=ZL, z_hi=ZH, clear=3.1):
    """The part of a flight's footprint where a 1.9 m head would hit the slab above it."""
    run = z_hi - z_lo
    need = (slab_top - SLAB - clear - y_low) / (y_high - y_low)  # progress where it starts
    if high == "min":
        return (xs[0], xs[1], z_lo, z_hi - run * need)
    return (xs[0], xs[1], z_lo + run * need, z_hi)


def rails(hole, y, sides, h=1.05, t=0.12):
    """Waist-high rails along the named sides ('n' z0, 's' z1, 'w' x0, 'e' x1) of a hole."""
    x0, x1, z0, z1 = hole
    out = []
    if "n" in sides:
        out.append(box(x0, y, z0 - t, x1, y + h, z0))
    if "s" in sides:
        out.append(box(x0, y, z1, x1, y + h, z1 + t))
    if "w" in sides:
        out.append(box(x0 - t, y, z0, x0, y + h, z1))
    if "e" in sides:
        out.append(box(x1, y, z0, x1 + t, y + h, z1))
    return out


def slab_holes(y, holes):
    """A slab over the whole plan (top at y) with several rectangular holes (x0, x1, z0, z1)."""
    rects = [(X0, X1, Z0, Z1)]
    for hx0, hx1, hz0, hz1 in holes:
        nxt = []
        for x0, x1, z0, z1 in rects:
            if hx1 <= x0 or hx0 >= x1 or hz1 <= z0 or hz0 >= z1:
                nxt.append((x0, x1, z0, z1))
                continue
            if z0 < hz0:
                nxt.append((x0, x1, z0, hz0))
            if z1 > hz1:
                nxt.append((x0, x1, hz1, z1))
            a, b = max(z0, hz0), min(z1, hz1)
            if x0 < hx0:
                nxt.append((x0, hx0, a, b))
            if x1 > hx1:
                nxt.append((hx1, x1, a, b))
        rects = nxt
    return [box(x0, y - SLAB, z0, x1, y, z1) for x0, x1, z0, z1 in rects if x1 - x0 > 0.05 and z1 - z0 > 0.05]


stairs = [
    stair(W_A, F0, F1, "min"),
    stair(W_B, F1, F2, "max"),
    stair(E_A, F0, F1, "min"),
    stair(E_B, F1, F2, "max"),
    {"bounds": [C_X[0], F2, C_Z[0], C_X[1], ROOF, C_Z[1]], "axis": "z", "high": "max"},
]
hole_wa = head_hole(W_A, F0, F1, F1, "min")
hole_ea = head_hole(E_A, F0, F1, F1, "min")
hole_wb = head_hole(W_B, F1, F2, F2, "max")
hole_eb = head_hole(E_B, F1, F2, F2, "max")
# (The roof's own voxels sit a little lower than its slab: more room over the last flight.)
hole_c = head_hole(C_X, F2, ROOF, ROOF + SLAB, "max", *C_Z, clear=3.4)
hole_c = (hole_c[0], hole_c[1], hole_c[2], C_Z[1] + 0.2)
ATRIUM = (-6.0, 6.0, 4.0, 10.0)

# Doors on the ground floor: main (front), back, west and east.
gaps0 = {
    "n": [(8.0, 1.8, DOOR_H)],
    "w": [(6.0, 1.8, DOOR_H)],
    "e": [(6.0, 1.8, DOOR_H)],
}
front_door = [(1.0, 2.0, DOOR_H)]

# Interior walls.
ground = (
    # Emergency bays behind the lobby: a wall along z -1 with five doorways, half-height bay
    # partitions (3.2 m) behind it.
    wall_x(-1.0, W_B[1] + 0.2, E_B[0] - 0.2, F0, F0 + 3.2, [(c, 1.6, 2.4) for c in (-12.0, -7.0, -1.3, 4.0, 11.0)])
    + sum((wall_z(x, Z0 + T, -1.0, F0, F0 + 3.2) for x in (-9.5, -4.0, 2.0, 7.0)), [])
    # Reception desk and waiting benches (cover).
    + [box(-3.0, F0, 1.2, 3.0, F0 + 1.1, 2.0), box(-3.0, F0, 1.2, -2.2, F0 + 1.1, 3.6)]
    + [box(x0, F0, z, x0 + 5.0, F0 + 0.5, z + 0.6) for x0 in (-15.0, 9.5) for z in (4.0, 6.5, 9.0)]
)
first = (
    # Corridor round the atrium: front wards (windows) and back wards.
    wall_x(3.2, W_B[0], E_B[1], F1, F2 - SLAB, [(c, 1.4, 2.4) for c in (-15.0, -9.0, 9.0, 15.0)])
    + sum((wall_z(x, 3.2 + T, Z1 - T, F1, F2 - SLAB) for x in (-12.0, 12.0)), [])
    + wall_x(-1.6, W_B[1] + 0.2, E_B[0] - 0.2, F1, F2 - SLAB, [(c, 1.4, 2.4) for c in (-11.5, -4.5, 4.5, 11.5)])
    + sum((wall_z(x, Z0 + T, -1.6, F1, F2 - SLAB) for x in (-8.0, 0.0, 8.0)), [])
    # The atrium's rails (the lobby below), open at the stair-free middle of the south side.
    + rails(ATRIUM, F1, "nwe")
    + rails((ATRIUM[0], -1.0, ATRIUM[3], ATRIUM[3]), F1, "s")
    + rails((1.0, ATRIUM[1], ATRIUM[3], ATRIUM[3]), F1, "s")
)
second = (
    # Five front rooms over the forecourt.
    wall_x(3.0, W_B[0], E_B[1], F2, ROOF - SLAB, [(c, 1.4, 2.4) for c in (-14.0, -6.5, 0.0, 6.5, 14.0)])
    + sum((wall_z(x, 3.0 + T, Z1 - T, F2, ROOF - SLAB) for x in (-10.0, -3.0, 3.0, 10.0)), [])
    # Back rooms either side of the stair hall (the flight to the roof).
    + wall_x(-6.0, W_B[1] + 0.2, -3.0, F2, ROOF - SLAB, [(-9.0, 1.4, 2.4)])
    + wall_x(-6.0, 1.0, E_B[0] - 0.2, F2, ROOF - SLAB, [(8.0, 1.4, 2.4)])
    + wall_z(-3.0 - T, Z0 + T, -6.0, F2, ROOF - SLAB)
    + wall_z(1.0, Z0 + T, -6.0, F2, ROOF - SLAB)
)
stair_rails = (
    # First floor round the ground->first holes (the arrival end open) and the second floor
    # round the first->second holes.
    rails(hole_wa, F1, "se")
    + rails(hole_ea, F1, "sw")
    + rails(hole_wb, F2, "nwe")
    + rails(hole_eb, F2, "nwe")
    # Round the roof hatch in the stair house (its arrival end open).
    + rails(hole_c, ROOF, "nw")
)
hx0, hx1, hz0, hz1, hceil = HOUSE
house = (
    # The stair house's ceiling, exact (its voxels would leave no head room).
    [box(hx0, hceil, hz0, hx1, hceil + 0.05, hz1)]
)
liners = (
    side_liners(F0, F1 - SLAB, gaps0)
    + front_with_windows(F0, F1 - SLAB, [], front_door)
    + side_liners(F1, F2 - SLAB, {})
    + front_with_windows(F1, F2 - SLAB, [(a, b, *WIN_Y[F1]) for a, b in WIN_X])
    + side_liners(F2, ROOF - SLAB, {})
    + front_with_windows(F2, ROOF - SLAB, [(a, b, *WIN_Y[F2]) for a, b in WIN_X])
)
slabs = (
    slab_holes(F0, [])
    + slab_holes(F1, [hole_wa, hole_ea, ATRIUM])
    + slab_holes(F2, [hole_wb, hole_eb])
    + slab_holes(ROOF, [hole_c])
)
cuts = (
    # Everything inside the shell (any inner faces), up to the roof slab.
    [box(X0 + 0.01, F0 + 0.01, Z0 + 0.01, X1 - 0.01, ROOF - SLAB - 0.01, Z1 - 0.01)]
    # The doorways.
    + [cut_x(1.0, 11.6, 12.6, 0, DOOR_H, 2.0), cut_x(8.0, -12.6, -11.6, 0, DOOR_H, 1.8)]
    + [cut_z(6.0, -20.3, -19.4, 0, DOOR_H, 1.8), cut_z(6.0, 19.6, 20.3, 0, DOOR_H, 1.8)]
    # The front's upper windows.
    + [box(a, *WIN_Y[F][:1], 11.7, b, WIN_Y[F][1], 12.6) for F in (F1, F2) for a, b in WIN_X]
    # The roof over the hatch, and the stair house's inside and its door (-z face, x 2.5).
    + [box(hole_c[0], ROOF - SLAB - 0.05, hole_c[2], hole_c[1], 20.6, hole_c[3])]
    + [box(hx0, 20.38, hz0, hx1, hceil - 0.01, hz1), cut_x(HOUSE_DOOR_X, 4.9, 5.7, 20.38, 22.6, 1.1)]
)
doors = [
    door(1.0, 12.08, F0, DOOR_H, "x", 1.8),
    door(8.0, -12.21, F0, DOOR_H, "x", 1.6),
    door(-19.85, 6.0, F0, DOOR_H, "z", 1.6),
    door(19.95, 6.0, F0, DOOR_H, "z", 1.6),
    door(HOUSE_DOOR_X, 5.3, 20.39, 22.6, "x", 1.0),
]
models["hospital"] = {
    "source": "original",
    "doors": doors,
    "cuts": cuts,
    "floors": slabs,
    "stairs": stairs,
    "clear": [box(hx0 + 0.05, 20.4, hz0 + 0.05, hx1 - 0.05, hceil, hz1 - 0.05)],
    "groups": [
        {"name": "Walls", "color": [0.86, 0.87, 0.84], "boxes": liners + first + second + [b for b in ground if b[4] - b[1] > 2]},
        {"name": "Fittings", "color": [0.42, 0.5, 0.56], "boxes": [b for b in ground if b[4] - b[1] <= 2] + stair_rails},
        {"name": "Stair house", "color": [0.6, 0.6, 0.58], "boxes": house},
    ],
    "color": [0.7, 0.71, 0.68],
}
# Walk-in routes (test): every door in and to the middle; up both cores; to the roof.
ROUTES += [
    ["hospital", [[1.0, 16.0], [1.0, 9.0], [1.0, 3.0]]],
    ["hospital", [[8.0, -16.0], [8.0, -9.0], [8.0, -3.0]]],
    ["hospital", [[-24.0, 6.0], [-16.8, 6.0], [-16.8, 2.5], [-10.0, 2.5]]],
    ["hospital", [[24.0, 6.0], [16.8, 6.0], [16.8, 2.5], [10.0, 2.5]]],
    # Each core: up A (from its foot at z -0.5) to the landing, across, up B to the second floor.
    ["hospital", [[-24.0, 6.0], [-16.8, 6.0], [-16.8, 2.5], [-18.65, 0.4], [-18.65, -10.9], [-16.65, -10.9], [-16.65, 0.4], [-16.65, 1.5]]],
    ["hospital", [[24.0, 6.0], [16.8, 6.0], [16.8, 2.5], [18.65, 0.4], [18.65, -10.9], [16.65, -10.9], [16.65, 0.4], [16.65, 1.5]]],
    # Up the west core, across the second floor to the stair hall, up into the roof's stair
    # house and out of its door onto the roof.
    [
        "hospital",
        [[-24.0, 6.0], [-16.8, 6.0], [-16.8, 2.5], [-18.65, 0.4], [-18.65, -10.9], [-16.65, -10.9],
         [-16.65, 0.4], [-16.65, 1.5], [0.0, 1.0], [0.0, 3.6], [-1.7, 3.7], [-1.7, 11.4], [1.0, 10.0], [1.8, 6.2], [1.8, 3.5], [1.8, -2.0]],
    ],
]


# --------------------------------------------------------------------- Millhaven works halls
SHELL = [0.62, 0.62, 0.6]


def shell(model, half_x, half_z, ceiling, door_sides=("s", "n"), along_z=False, inset=0.8):
    """One hall on the ground floor: everything inside cut to the ceiling (mesh and collision), a
    slab, liners and a ceiling, steel doors in the middle of the long sides (cabins.py)."""
    x0, x1, z0, z1 = -half_x + inset, half_x - inset, -half_z + inset, half_z - inset
    gaps, doors_, cuts_, frames = [], [], [], []
    for side in door_sides:
        if not along_z:
            z = z1 if side == "s" else z0
            outer = half_z if side == "s" else -half_z
            gaps.append((0.0, z, 1.8, 2.75))
            doors_.append(door(0.0, (z + outer) / 2, 0.06, 2.6, "x", 1.6))
            cuts_.append(cut_x(0.0, min(z, outer) - 0.2, max(z, outer) + 0.2, 0.0, 2.6, 1.6))
            a, b = min(z, outer), max(z, outer)
            frames += [box(-1.05, 0.0, a, -0.8, ceiling, b), box(0.8, 0.0, a, 1.05, ceiling, b), box(-0.8, 2.6, a, 0.8, ceiling, b)]
            sgn = 1 if side == "s" else -1
            ROUTES.append([model, [[0.0, outer + sgn * 4], [0.0, z - sgn * 3], [0.0, round(z / 2, 2)]]])
        else:
            x = x1 if side == "e" else x0
            outer = half_x if side == "e" else -half_x
            gaps.append((x, 0.0, 1.8, 2.75))
            doors_.append(door((x + outer) / 2, 0.0, 0.06, 2.6, "z", 1.6))
            cuts_.append(box(min(x, outer) - 0.2, 0.0, -0.8, max(x, outer) + 0.2, 2.6, 0.8))
            a, b = min(x, outer), max(x, outer)
            frames += [box(a, 0.0, -1.05, b, ceiling, -0.8), box(a, 0.0, 0.8, b, ceiling, 1.05), box(a, 2.6, -0.8, b, ceiling, 0.8)]
            sgn = 1 if side == "e" else -1
            ROUTES.append([model, [[outer + sgn * 4, 0.0], [x - sgn * 3, 0.0], [round(x / 2, 2), 0.0]]])
    rect = [(x0, x1, z0, z1)]
    models[model] = {
        "doors": doors_,
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


shell("factory-hall", 7.3, 13.0, 8.0, ("e", "w"), along_z=True)
shell("ind-warehouse-4", 21.04, 6.8, 6.5)
shell("ind-warehouse-5", 16.5, 27.47, 8.0, ("e", "w"), along_z=True)
shell("ind-smith", 9.17, 5.9, 6.0)

spec = {
    "version": "access-v9",
    "baseManifest": "models.locations-v1.json",
    "baseCollision": "collision.locations-v1.json",
    "notes": "The Central Hospital rebuilt inside and the Millhaven works halls (2026-11-09). "
    "Generated by art/br/fitout/locations.py.",
    "models": models,
}
out = Path(__file__).resolve().parents[1] / "building-access-v9.json"
out.write_text(json.dumps(spec, indent=1) + "\n")
routes_file = Path(__file__).resolve().parents[1] / "building-access-routes.json"
routes = [r for r in json.loads(routes_file.read_text()) if r[0] not in {m for m, _ in ROUTES}]
routes_file.write_text(json.dumps(routes + ROUTES, indent=2) + "\n")
print(out, len(ROUTES), "routes")
