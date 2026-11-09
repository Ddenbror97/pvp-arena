#!/usr/bin/env python3
"""Building audit fit-outs (owner, 2026-11-08: "audit every houses/buildings we have one by one,
make sure its possible to enter, they have a door that fits correctly … check so every kind of
stairs works to walk on, eg i found a silo with a side stair that could not be walked on … make
sure the inside looks good"). Writes art/br/building-access-v7.json; repair_building_access.mjs
applies it on top of building-access-v6.

    python3 -I art/br/fitout/audit.py

Towers whose stairs are drawn but were voxelised into an unwalkable jumble of treads, stringers
and rails get collision-only flights (`collisionOnly`: the meshes are untouched, each flight's
voxel envelope is cleared and an exact walkable ramp goes in, with solid landings). Coordinates
are model-local metres, measured from each model's up-facing triangles (treads and landings).
"""
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import (  # noqa: E402,F401
    T, box, cut_x, cut_z, door, liner, r, room_ceiling, room_liners, slab, wall_x, wall_z,
)

models = {}

ROOT = Path(__file__).resolve().parents[1]
REVISIONS = ["building-access.json"] + [f"building-access-v{n}.json" for n in range(2, 7)]


def carried(model):
    """A model's fit-out as the earlier revisions left it, re-stated for a fresh repair on top of
    its v6 meshes: floors and steps are already drawn (meshFloors/meshStairs: exact collision
    only); doors, cuts, clears and solids carried over."""
    last, clears = None, []
    for name in REVISIONS:
        entry = json.loads((ROOT / name).read_text())["models"].get(model)
        if not entry:
            continue
        if entry.get("collisionOnly"):
            clears += entry.get("clear", [])
        else:
            last, clears = entry, list(entry.get("clear", []))
    if last is None:
        return {"doors": [], "floors": [], "stairs": [], "meshFloors": True, "meshStairs": True,
                "clear": clears}
    return {
        "doors": last.get("doors", []),
        # The openings are already cut in the meshes (re-cutting is a no-op there), but the fresh
        # voxel collision needs the same cuts again, or voxels round a sill close the doorway.
        "cuts": last.get("cuts", []),
        "floors": last.get("floors", []),
        "stairs": last.get("stairs", []),
        "solid": last.get("solid", []),
        "clear": clears,
        "color": last.get("color", [0.5, 0.5, 0.5]),
        "meshFloors": True,
        "meshStairs": True,
    }


LINER = [0.80, 0.77, 0.70]  # interior plaster


def flight(x0, y0, z0, x1, y1, z1, axis, high):
    return {"bounds": [r(x0), r(y0), r(z0), r(x1), r(y1), r(z1)], "axis": axis, "high": high}


# ---------------------------------------------------------------------------------------------
# Storage tank (East Works tank farm): the stair that winds up the tank's south side (owner: "a
# silo with a side stair that could not be walked on"). Tank wall radius 7.9 m about the origin;
# the treads run between r 7.95 and 8.85 from about 10° (ground, east) to the landing at 7.57 m
# (128°–146°), then onto the roof (7.8 m at the rim). Angles from +x towards +z.
TANK_PROFILE = [
    (10, 0.0), (17.5, 0.68), (25, 0.90), (30, 1.11), (35, 1.32), (37.5, 1.48), (42.5, 1.64),
    (45, 1.81), (47.5, 1.97), (50, 2.13), (52.5, 2.29), (55, 2.50), (60, 2.70), (62.5, 2.91),
    (65, 3.12), (67.5, 3.32), (70, 3.53), (75, 3.75), (77.5, 3.98), (80, 4.21), (85, 4.44),
    (87.5, 4.67), (90, 4.89), (92.5, 5.12), (97.5, 5.35), (100, 5.58), (102.5, 5.81),
    (105, 6.03), (110, 6.26), (112.5, 6.48), (115, 6.70), (117.5, 6.91), (120, 7.13),
    (122.5, 7.35), (127.5, 7.57), (147, 7.57),
]


def tank_height(a):
    for (a0, y0), (a1, y1) in zip(TANK_PROFILE, TANK_PROFILE[1:]):
        if a0 <= a <= a1:
            return y0 + (y1 - y0) * (a - a0) / (a1 - a0)
    return None


def tank_stair():
    G = 0.2
    R_IN, R_OUT, R_CLEAR = 8.1, 8.9, 9.4
    solid, clear = [], []
    steps = int(10 / G)
    for k in range(-steps, steps):
        z0 = k * G
        z1 = z0 + G
        zc = z0 + G / 2
        # Clear: per 0.2 m row, the run of the annulus (r 8.08…9.4) within the stair's arc.
        run = []
        for i in range(-steps, steps):
            xc = i * G + G / 2
            rr = math.hypot(xc, zc)
            a = math.degrees(math.atan2(zc, xc))
            inside = R_IN - 0.02 <= rr <= R_CLEAR and 5 <= a <= 150
            if inside:
                run.append(i)
            if run and (not inside or i == steps - 1):
                clear.append(box(run[0] * G, 0.31, z0, (run[-1] + 1) * G, 9.6, z1))
                run = []
            # Ramp: a 0.2 m cell at the profile's height, 0.3 m deep (walkable underneath).
            if R_IN <= rr <= R_OUT and 8 <= a <= 147:
                y = tank_height(a)
                if y is not None and y > 0.02:
                    solid.append(box(xc - G / 2, max(0.0, y - 0.3), z0, xc + G / 2, y, z1))
    # The roof: flat at 8.22 m inside r 7.05 (voxelised into 8.1/8.4/8.7 steps that a player
    # could not climb). Its landing (7.57 m, x −7.11…−4.65, z 4.63…7.09) meets it 0.65 m lower:
    # a step between them, then an exact roof with its hatch and vent.
    def runs(test):
        out = []
        for k in range(-16, 16):
            z0, start = k * 0.5, None
            for i in range(-16, 17):
                inside = i < 16 and test(i * 0.5 + 0.25, z0 + 0.25)
                if inside and start is None:
                    start = i
                if not inside and start is not None:
                    out.append((start * 0.5, i * 0.5, z0, z0 + 0.5))
                    start = None
        return out

    for x0, x1, z0, z1 in runs(lambda x, z: math.hypot(x, z) < 7.95):
        clear.append(box(x0, 7.85, z0, x1, 9.6, z1))
    def on_landing(x, z):
        return -7.11 <= x <= -4.65 and 4.63 <= z <= 7.09

    for test, top in (
        (lambda x, z: math.hypot(x, z) < 7.75 and not on_landing(x, z), 8.22),
        (lambda x, z: on_landing(x, z) and math.hypot(x, z) < 6.8, 8.22),
        (lambda x, z: on_landing(x, z) and 6.8 <= math.hypot(x, z) < 7.3, 7.9),
        (lambda x, z: on_landing(x, z) and math.hypot(x, z) >= 7.3, 7.57),
    ):
        solid += [box(x0, top - 0.3, z0, x1, top, z1) for x0, x1, z0, z1 in runs(test)]
    clear.append(box(-7.11, 7.3, 4.63, -4.65, 9.6, 7.09))
    solid += [box(0.19, 8.22, -2.24, 1.20, 8.56, -1.23), box(-4.82, 8.22, -0.81, -3.52, 8.68, 0.49)]
    return {"collisionOnly": True, "doors": [], "clear": clear, "solid": solid}


models["ind-tank"] = tank_stair()

# ---------------------------------------------------------------------------------------------
# Fire-watch lookout (6 × 7.3 m): a 45° flight along the south side (z 2.8…3.56) from the ground
# to the landing at 2.32 m (x 1.16…2.93, z 1.74…3.58), then a short steep flight north (x
# 1.68…2.45) up to the observation deck at 3.32 m.
models["lookout"] = {
    "collisionOnly": True,
    "doors": [],
    "stairs": [
        flight(-1.32, 0, 2.80, 1.16, 2.32, 3.56, "x", "max"),
        flight(1.68, 2.32, 0.97, 2.45, 3.32, 2.12, "z", "min"),
    ],
    # The landing's entry rail and corner post, voxelised, leave 0.6 m: walk past them.
    "clear": [
        box(1.16, 2.33, 2.4, 1.85, 3.4, 3.7),
        # The upper flight's newels and the deck's corner post (voxelised) leave 0.61 m at the
        # top; the post goes back in exact (the opening between it and the rail is 0.73 m).
        box(1.7, 3.33, 0.3, 2.95, 7.0, 1.35),
        # The deck, voxelised 0.28 m proud (lifting heads into the roof beams): exact instead.
        box(-2.05, 3.0, -3.7, 2.62, 3.65, 0.97),
        # The deck's rails, voxelised 0.25 m into the deck: exact instead.
        box(1.4, 3.33, 0.3, 1.7, 4.6, 1.0),
        box(2.0, 3.33, -3.7, 2.7, 4.6, 0.77),
        box(-2.1, 3.33, 0.3, 1.7, 4.6, 1.0),
        box(-2.1, 3.33, -3.7, -1.55, 4.6, 1.0),
        box(-2.1, 3.33, -3.7, 2.7, 4.6, -3.2),
    ],
    "solid": [
        box(1.16, 2.12, 1.74, 2.93, 2.32, 3.58),
        box(-2.02, 3.12, -3.62, 2.58, 3.32, 0.97),
        box(2.38, 3.32, 0.77, 2.60, 6.6, 0.94),
        box(-1.47, 3.32, 0.77, 1.65, 4.33, 0.94),
        box(-2.02, 3.32, -3.62, -1.92, 4.33, 0.94),
        box(-2.02, 3.32, -3.65, 2.50, 4.33, -3.55),
        box(2.40, 3.32, -3.62, 2.50, 4.33, 0.77),
    ],
}

# ---------------------------------------------------------------------------------------------
# Steel watchtower (4.4 m square, platform at 6.74 m): three flights round the lattice core
# (x, z ±1.16) in the 1.05 m band outside it, with corner landings at 2.30 and 4.52 m; the last
# flight climbs through the platform's stairwell (x 1.11…2.22, z −2.22…1.14).
models["watchtower"] = {
    "collisionOnly": True,
    "doors": [],
    "stairs": [
        flight(-2.19, 0, -1.14, -1.14, 2.30, 1.18, "z", "min"),
        flight(-1.11, 2.30, -2.19, 1.11, 4.52, -1.14, "x", "max"),
        flight(1.14, 4.52, -1.11, 2.19, 6.74, 1.14, "z", "max"),
    ],
    # The corner landings' rails (voxelised, they close the 1.05 m band): open them.
    "clear": [
        box(-2.25, 2.31, -2.25, -1.0, 4.0, -0.9),
        box(1.0, 4.53, -2.25, 2.25, 6.2, -0.9),
        # The platform and its rails, voxelised 0.16 m proud and 0.25 m thick: exact instead
        # (deck, waist-high rails, the cage's corner posts).
        box(-2.3, 6.4, -2.3, 2.3, 8.0, 2.3),
    ],
    "solid": [
        box(2.17, 4.52, -1.11, 2.22, 7.5, 2.22),
        box(-2.21, 6.74, 2.17, 2.22, 7.5, 2.22),
        box(-2.21, 6.74, -2.22, 1.11, 7.5, -2.17),
        box(-2.21, 6.74, -2.22, -2.16, 7.5, 2.22),
        box(2.17, 6.74, -2.22, 2.22, 7.5, -1.11),
        *[box(x - 0.05, 6.74, z - 0.05, x + 0.05, 8.0, z + 0.05) for x in (-1.11, 1.11) for z in (-1.11, 1.11)],
        box(-2.21, 2.10, -2.22, -1.11, 2.30, -1.11),
        box(1.11, 4.32, -2.22, 2.22, 4.52, -1.11),
        box(-2.21, 6.54, -2.22, 1.11, 6.74, 2.22),
        box(1.11, 6.54, 1.14, 2.22, 6.74, 2.22),
    ],
}

# ---------------------------------------------------------------------------------------------
# Guard tower (military base): the platform round its hut, 5.22 m up, had 1.5 m of head room
# under the roof's overhang and its treads were 0.56 m wide, a crouch-only perch. The model grows by 1.35 about its foot
# (9.6 m high, 2.08 m under the overhang, 0.75 m treads); its stairs then get exact collision. Measured at the download's scale (below),
# written scaled. A flight along the south face (z 1.11…1.67) rises east to the landing at 3.0
# m (x 1.26…1.85, z 0.78…1.68), then north through the cabin floor's hatch (x 1.28…1.83) into
# the platform round the hut (the hut itself is closed). The drawn flight's lowest tread is 1 m
# up; the ramp starts at the ground under it.
GS = 1.35


def scaled(v):
    if isinstance(v, dict):
        return {k: (scaled(x) if k in ("bounds", "clearUp") else x) for k, x in v.items()}
    if isinstance(v, list):
        return [scaled(x) for x in v]
    return r(v * GS)


models["guard-tower"] = {
    "scale": GS,
    "meshStairs": True,
    "doors": [],
    "stairs": scaled([
        dict(flight(-1.45, 0, 1.11, 1.26, 3.0, 1.67, "x", "max"), clearUp=1.0),
        dict(flight(1.28, 3.0, -1.04, 1.83, 5.22, 0.78, "z", "min"), clearUp=1.0),
    ]),
    "clear": scaled([
        # The landing's rails, voxelised, would lift a player into the cabin's south wall.
        box(1.2, 3.01, 0.75, 1.9, 4.9, 1.75),
        # The cabin floor, voxelised 0.2 m proud, and its ceiling, 0.15 m low: exact instead.
        box(-1.55, 4.9, -1.75, 1.9, 5.45, 1.15),
        box(-1.55, 6.3, -1.75, 1.9, 7.1, 1.15),
        # A sliver of the hut's sill left by the flight's envelope, 0.02 m into the walkway.
        box(0.96, 5.4, -1.25, 1.12, 5.86, 1.25),
    ]),
    "solid": scaled([
        box(1.26, 2.80, 0.78, 1.85, 3.0, 1.68),
        box(-1.50, 5.02, -1.68, 1.28, 5.22, 1.11),
        box(1.28, 5.02, -1.68, 1.85, 5.22, -1.04),
        box(-1.49, 6.76, -1.65, 1.26, 6.97, 1.10),
        # The platform's east rail beside the hatch (its voxels went with the flight's).
        box(1.83, 5.22, -1.68, 1.86, 6.0, 1.68),
    ]),
}

# ---------------------------------------------------------------------------------------------
# Fire lookout (16 m): three flights in the tower's frame. East flight (x 3.11…4.50) north to
# the landing at 4.56 m; west along the north side (z 2.99…4.45) to the landing at 8.68 m (x
# −4.33…−2.76); south (x −4.30…−3.30) up through the deck's hatch to the deck at 10.70 m.
models["fire-lookout"] = {
    "collisionOnly": True,
    "doors": [],
    "stairs": [
        flight(3.11, 0, -3.46, 4.50, 4.56, 2.85, "z", "max"),
        flight(-2.76, 4.56, 2.99, 3.05, 8.68, 4.45, "x", "min"),
        flight(-4.30, 8.68, -0.45, -3.30, 10.70, 2.60, "z", "min"),
    ],
    # The landing under the deck has 1.82 m of head room: clear its voxel remnants. The last
    # flight's first metre runs under the deck's edge (1.5 m of head room, the hatch opens at
    # z 2.0): the deck's collision over it goes, so a player walks up without crouching.
    # The deck's west strip, voxelised with the hatch's frame, the last treads and the rail,
    # stands 0.4 m proud of the deck: exact deck and rail instead.
    "clear": [
        box(-4.4, 8.0, 2.55, -2.7, 10.45, 4.5),
        box(-4.4, 10.2, 1.9, -3.2, 11.3, 3.5),
        box(-4.67, 10.4, -4.47, -3.2, 12.0, 1.9),
    ],
    "solid": [
        box(3.05, 4.36, 2.85, 4.66, 4.56, 4.46),
        box(-4.33, 8.48, 2.60, -2.76, 8.68, 4.46),
        box(-4.66, 10.5, -4.46, -3.2, 10.70, -0.45),
        box(-4.30, 10.70, -4.06, -4.25, 11.94, 3.72),
    ],
}

# ---------------------------------------------------------------------------------------------
# Interiors. The downloaded houses and shops are exterior shells: from inside, a player saw the
# backs of their facades (boarded windows, posters and lettering mirrored), porch posts and, in
# the town house, the attached garage's siding and roof slope cutting through the living room
# (owner: "inside the house it looked weird the wall to the garage"). Each gets plaster liners
# just inside its walls and a ceiling, with gaps at its doorways, painted apart from its floor.


# Liner doorways stand 0.25–0.35 m taller than their doors: on a slope the ground can rise a
# few centimetres through a floor, and the head must still clear the liner's lintel there (the
# shell's own door head is the visible one).


def interior(model, liners, ceilings, extra=()):
    entry = carried(model)
    entry["groups"] = [{"name": "Interior walls and ceiling", "color": LINER,
                        "boxes": liners + ceilings + list(extra)}]
    models[model] = entry


# Town house (12 × 7.9 m, 445 placements): living room x −5.5…2.5, z −3.22…1.78 (inside the
# voxelised walls), floor 0.16. The west wall's chimney breast reaches x −5.0: the liner stands
# there. The east wall is the one shared with the garage. A partition with a doorway makes a
# kitchen of the east end. Front door at x −1.4 (1.12 m, head 2.38).
F, C = 0.16, 2.9
interior(
    "house",
    liner(-5.0, 2.5, -3.22, 1.78, F, C, {"s": [(-1.4, 1.26, 2.5)]})
    + wall_z(0.4, -3.07, 1.63, F, C, [(-1.0, 1.0, 2.1)]),
    slab(-5.0, 2.5, -3.22, 1.78, C + 0.15, 0.15),
)

# Farmhouse (rural-house): x −2.45…2.3 inside its brick porch-post stubs, z −2.91…2.59, floor
# 0.81, the door in the south wall at x 0.05.
interior(
    "rural-house",
    room_liners([(-2.45, 2.3, -2.91, 2.59)], 0.81, 3.25, [(0.05, 2.59, 1.2, 2.45)]),
    room_ceiling([(-2.45, 2.3, -2.91, 2.59)], 3.4),
)

# Brick shop (24 × 7 m, a two-storey facade over one tall hall): from inside, a player saw the
# street (its own shopfront, mirrored lettering and all). The shop: x −11.8…8.6 (the door at x
# 8.75 stands at the inner end of its entrance lobby), z −3.32…3.13, floor 0.12, ceiling 3.6.
interior(
    "brick-shop",
    room_liners([(-11.8, 8.6, -3.32, 3.13)], 0.12, 3.45, [(8.6, 0.0, 1.35, 2.6)]),
    room_ceiling([(-11.8, 8.6, -3.32, 3.13)], 3.6),
)

# Bauhaus block (ground floor of the 4-storey shell): an irregular plan under the floors above
# (2.7 m), its east wall on the diagonal. The hall (x −3.5…3.25, z −1.0…2.2) and the west room
# (x −7.4…−1.9, z −2.85…−0.1) become one L-shaped room; the door's lobby stays as it is.
BH = [(-3.5, 3.25, -1.0, 2.2), (-7.4, -1.9, -2.85, -0.1)]
interior("bauhaus-block", room_liners(BH, 0.12, 2.45, [(0.0, 2.2, 1.3, 2.6)]), room_ceiling(BH, 2.6))

# Mobile home: x −3.07…1.18 (inside the window sills), z −5.44…5.31, floor 0.74; the door in
# the east wall at z −3.55, off the deck.
interior(
    "rural-mobile-home",
    room_liners([(-3.07, 1.18, -5.44, 5.31)], 0.74, 3.15, [(1.18, -3.55, 1.25, 2.2)]),
    room_ceiling([(-3.07, 1.18, -5.44, 5.31)], 3.3),
)

# The ruined church (graveyard on the rise near Pine Ridge): doors.ts found a "doorway" in its
# broken arch and hung a modern door there. A ruin has open arches: no door.
models["church-ruins"] = {"collisionOnly": True, "doors": []}

spec = {
    "version": "access-v7",
    "baseManifest": "models.access-v6.json",
    "baseCollision": "collision.access-v6.json",
    "notes": "Building audit 2026-11-08: walkable tower and tank stairs (collision only), "
    "interior liners, enterable industrial shells. Generated by art/br/fitout/audit.py.",
    "models": models,
}
out = Path(__file__).resolve().parents[1] / "building-access-v7.json"
out.write_text(json.dumps(spec, indent=1) + "\n")
print(out, {k: len(v.get("solid", [])) + len(v.get("stairs", [])) for k, v in models.items()})
