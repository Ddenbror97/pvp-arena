#!/usr/bin/env python3
"""The strait coast road's motel made enterable (owner, 2026-11-11: "ensure new buildings/houses/
stairs is optimized like the rest, enterable/door/etc"). Roadside Motel (novusod, CC BY), measured
from its processed LOD0 (up-facing surfaces and plan sections, 2026-11-12), model-local metres,
the rooms' doors in the front (+z) wall:

- the sidewalk pad and ground floor at 1.38 m, the upper floor and the balcony at 4.28 m, the
  roof's underside at 7.41 m (as imported: the model is sunk 1.1 m, its pad a kerb above the
  ground);
- block A, ground floor x -16.0..-1.2, z -3.33..4.0 (painted doors at x -15.28, -9.38, -8.05,
  -2.05); block B (x 3.8..10.8) has none and stays shut; a breezeway between them;
- upper floor x -16.0..10.8 over both, painted doors at x -13.05, -11.6, -5.65, -4.4, 1.65,
  3.0, 9.0 off the balcony walkway (z 4.0..5.28, rail at its edge);
- the office's glass front (z 6.2, x 10.8..14.6) on the east wing;
- two drawn stairs to the balcony: the east one (x 5.55..9.11, z 5.28..6.42, rising west) and
  the west one along the gable (x -17.18..-16.03, z 0.43..3.99, rising south).

Each room (four below, seven above, the office) is cut clear inside (mesh and collision) and
gets a floor, plaster liners just inside the shell, partitions between neighbours, a ceiling and
its own fitted door in the painted door's place. The stairs get exact walkable flights, the
balcony an exact walkway and rail (the voxelised wall, rail and posts left 0.6 m of a 1.3 m
walkway).

Writes art/br/building-access-v16.json (applied by repair_building_access.mjs on top of the
roadside-v1 revision) and its walks to art/br/building-access-routes.json.

    python3 -I art/br/fitout/roadside.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import box, cut_x, door, room_ceiling, room_liners  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PLASTER = [0.83, 0.8, 0.72]
CARPET = [0.42, 0.36, 0.3]

# The model is sunk 1.1 m (kit `sink`: its foundation pad stood 1.38 m tall), so every height
# measured above comes down by SINK.
SINK = 1.1
GF, GC = 1.38 - SINK, 3.80 - SINK  # ground floor, its ceiling (the upper slab's underside 3.97)
UF, UC = 4.28 - SINK, 7.25 - SINK  # upper floor, its ceiling (the roof's underside is 7.41)
SLAB = 3.97 - SINK
FRONT = 4.0  # the front wall's outer face
DOOR_W, DOOR_H = 0.9, 2.1
Z0, Z1 = -3.2, 3.85  # rooms' inner depth (back wall at -3.33, front at 4.0)

# Ground floor, block A: rooms between partitions, each with its door.
GROUND = [(-15.88, -12.2, -15.28), (-12.2, -8.72, -9.38), (-8.72, -5.0, -8.05), (-5.0, -1.35, -2.05)]
UPPER = [
    (-15.88, -12.4, -13.05),
    (-12.4, -8.5, -11.6),
    (-8.5, -5.1, -5.65),
    (-5.1, -1.0, -4.4),
    (-1.0, 2.25, 1.65),
    (2.25, 6.0, 3.0),
    (6.0, 10.6, 9.0),
]
# The office: the east wing's ground floor behind the glass front (its slanted east wall runs
# from x 17.6 at z -7.3 to 14.65 at z 5.95).
OFFICE = (11.0, 14.1, -7.25, 5.95)
OFFICE_DOOR_X, OFFICE_FRONT = 12.7, 6.2


def storey(rooms, floor, ceiling, slab_under):
    doors, cuts, floors, walls = [], [], [], []
    rects = [(x0, x1, Z0, Z1) for x0, x1, _ in rooms]
    gaps = []
    for x0, x1, dx in rooms:
        doors.append(door(dx, (Z1 + FRONT) / 2, floor, floor + DOOR_H, "x", DOOR_W))
        cuts.append(cut_x(dx, Z1 - 0.15, FRONT + 0.15, floor, floor + DOOR_H, DOOR_W))
        gaps.append((dx, Z1, DOOR_W + 0.2, DOOR_H + 0.1))
        # Everything inside the room cut away up to the ceiling.
        cuts.append(box(x0 + 0.02, floor + 0.01, Z0 + 0.02, x1 - 0.02, ceiling + 0.12, Z1 - 0.02))
        floors.append(box(x0, slab_under, Z0, x1, floor, Z1))
    # Liners round each room on its own: two back to back make the partition between
    # neighbours (rooms are shut off from each other).
    for r in rects:
        walls += room_liners([r], floor, ceiling, [g for g in gaps if r[0] <= g[0] <= r[1]])
    return doors, cuts, floors, walls + room_ceiling(rects, ceiling + 0.15)


gd, gc, gf, gw = storey(GROUND, GF, GC, GF - 0.3)
ud, uc, uf, uw = storey(UPPER, UF, UC, SLAB)

ox0, ox1, oz0, oz1 = OFFICE
office_door = door(OFFICE_DOOR_X, (oz1 + OFFICE_FRONT) / 2, GF, GF + DOOR_H, "x", 1.0)
office_cuts = [
    cut_x(OFFICE_DOOR_X, oz1 - 0.15, OFFICE_FRONT + 0.2, GF, GF + DOOR_H, 1.0),
    box(ox0 + 0.02, GF + 0.01, oz0 + 0.02, ox1 - 0.02, GC + 0.12, oz1 - 0.02),
]
office_walls = room_liners(
    [OFFICE], GF, GC, [(OFFICE_DOOR_X, oz1, 1.2, DOOR_H + 0.1)]
) + room_ceiling([OFFICE], GC + 0.15)

# The balcony walkway (z 4.0..5.28) and the east stair's landing, exact; its rail along the
# edge, open where the east stair arrives (x 4.33..5.8).
BAL = 5.10
balcony = [
    box(-17.33, UF - 0.2, FRONT, 12.92, UF, 5.28),
    box(4.33, UF - 0.2, 5.28, 5.55, UF, 6.42),
]
rail = [
    box(-16.0, UF, BAL, 4.33, UF + 1.0, 5.28),
    box(5.8, UF, BAL, 12.92, UF + 1.0, 5.28),
    # The landing's far side and the west end beside the west stair's head.
    box(4.2, UF, 6.42, 5.8, UF + 1.0, 6.55),
    box(-17.33, UF, 5.28, -16.0, UF + 1.0, 5.4),
]


def pad_boxes(cell=0.25):
    """The sidewalk pad (its top at GF), exact: the up-facing triangles at that height
    rasterised in `cell` squares and merged into strips (voxelised, it stood 0.12 m proud, a
    0.4 m step from the ground)."""
    tris = json.loads((ROOT / "fitout" / "roadside-pad.json").read_text())

    def inside(px, pz, t):
        (ax, az), (bx, bz), (cx, cz) = t
        d1 = (px - bx) * (az - bz) - (ax - bx) * (pz - bz)
        d2 = (px - cx) * (bz - cz) - (bx - cx) * (pz - cz)
        d3 = (px - ax) * (cz - az) - (cx - ax) * (pz - az)
        neg = d1 < 0 or d2 < 0 or d3 < 0
        pos = d1 > 0 or d2 > 0 or d3 > 0
        return not (neg and pos)

    xs = [p[0] for t in tris for p in t]
    zs = [p[1] for t in tris for p in t]
    x0, z0 = min(xs), min(zs)
    nx, nz = int((max(xs) - x0) / cell) + 1, int((max(zs) - z0) / cell) + 1
    rows = []
    for j in range(nz):
        pz = z0 + (j + 0.5) * cell
        run, out = None, []
        for i in range(nx + 1):
            px = x0 + (i + 0.5) * cell
            hit = i < nx and any(inside(px, pz, t) for t in tris)
            if hit and run is None:
                run = i
            if not hit and run is not None:
                out.append((run, i))
                run = None
        rows.append(out)
    boxes = []
    for j, out in enumerate(rows):
        for a, b in out:
            boxes.append(box(x0 + a * cell, GF - 0.3, z0 + j * cell, x0 + b * cell, GF, z0 + (j + 1) * cell))
    return boxes


models = {
    "roadside-motel": {
        "doors": gd + ud + [office_door],
        "cuts": gc + uc + office_cuts,
        "floors": gf + uf + [box(ox0, GF - 0.3, oz0, ox1, GF, oz1)],
        "stairs": [
            {"bounds": [5.55, GF, 5.28, 9.11, UF, 6.42], "axis": "x", "high": "min", "clearUp": 1.3},
            {"bounds": [-17.18, GF, 0.43, -16.03, UF, 3.99], "axis": "z", "high": "max", "clearUp": 1.3},
        ],
        "meshStairs": True,
        # The walkway's voxels (the front wall's, the rail's and the posts') cleared off it.
        "clear": [
            box(-17.33, UF - 0.25, FRONT, 12.92, 7.2 - SINK, 5.4),
            # The east stair's landing (its voxels 0.2 m proud, its rail's 0.3 m in).
            box(4.2, UF - 0.25, 5.28, 5.56, UF + 2.2, 6.41),
            # The pad's voxels (0.12 m proud) and the walls' and posts' bottoms with them.
            box(-18.6, GF - 0.2, -7.4, 17.8, GF + 0.14, 8.6),
        ],
        "solid": balcony + rail + pad_boxes(),
        "groups": [
            {"name": "Rooms' walls and ceilings", "color": PLASTER, "boxes": gw + uw + office_walls},
        ],
        "color": CARPET,
    }
}

spec = {
    "version": "access-v16",
    "baseManifest": "models.roadside-v1.json",
    "baseCollision": "collision.roadside-v1.json",
    "notes": "The strait coast road's motel enterable: four ground-floor rooms, seven upstairs off "
    "the balcony, the office; both stairs and the balcony walkable. Generated by "
    "art/br/fitout/roadside.py.",
    "models": models,
}
out = ROOT / "building-access-v16.json"
out.write_text(json.dumps(spec, indent=1) + "\n")

ROUTES = [
    ["roadside-motel", [[-2.05, 7.5], [-2.05, 3.0], [-3.2, 0.0]]],
    ["roadside-motel", [[-15.28, 7.5], [-15.28, 3.0], [-14.0, -2.0]]],
    ["roadside-motel", [[OFFICE_DOOR_X, 9.3], [OFFICE_DOOR_X, 4.5], [12.6, -4.0]]],
    # (Walks start on the ground off the pad.) Up the east stair, along the balcony and into
    # an upstairs room.
    ["roadside-motel", [[9.9, 9.3], [9.7, 5.85], [9.0, 5.85], [5.4, 5.85], [4.9, 4.65], [1.65, 4.65], [1.65, 3.0], [0.6, 0.0]]],
    # Up the west stair onto the balcony's west end and into the end room.
    ["roadside-motel", [[-19.2, -1.0], [-16.6, -0.6], [-16.6, 0.6], [-16.6, 3.9], [-16.4, 4.65], [-13.05, 4.65], [-13.05, 3.0], [-14.0, 0.0]]],
]
routes_file = ROOT / "building-access-routes.json"
routes = [r for r in json.loads(routes_file.read_text()) if r[0] not in {m for m, _ in ROUTES}]
routes_file.write_text(json.dumps(routes + ROUTES, indent=2) + "\n")
print(out, len(ROUTES), "routes")
