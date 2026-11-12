#!/usr/bin/env python3
"""The strait bridgeheads' towers made walkable (owner, 2026-11-11: "ensure new buildings/houses/
stairs is optimized like the rest, enterable/door/etc"). Measured from the processed LOD0 meshes
(up-facing surfaces and wall slices, 2026-11-11):

- bridge-guardtower (Military watchtower #1, 6.2 x 9.3 x 6.1 m): three flights round the steel
  frame. East (x 1.52..2.88) north from the base pad (0.20 m) to a landing at 2.46 m; west along
  the south side (z -2.94..-1.59) to a landing at 4.64 m; north up the west side (x -3.01..-1.65)
  to the walkway at 6.82 m, which runs along the north side to the cabin. The cabin (x -1.56..1.44,
  z -1.50..1.50, floor 6.82 m) has an open doorway in its north wall (x 0.11..1.26, 2.1 m high):
  it gets a fitted door. Voxelised, the treads, stringers and rails were a jumble and the decks
  0.2-0.3 m proud: the flights get exact walkable profiles and the landings, walkway and cabin
  floor exact slabs.
- bridge-watchtower (Watchtower 01, 5.9 x 12 x 5.2 m): a hunting-stand cabin on four poles, its
  deck at 7.71 m, reached by the drawn ladder up its west side (src/lib/fps/br/ladders.ts climbs
  it with the Iron Peaks ladder's mechanics) through the gap at the south end of the west wall.
  The deck's voxels and the cabin's (they stood 0.3 m in from the walls) are replaced by an
  exact slab and exact plank walls.

Writes art/br/building-access-v15.json (applied by repair_building_access.mjs on top of the
strait-v2 revision) and the guard tower's walk to art/br/tower-routes.json.

    python3 -I art/br/fitout/strait.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import box, door  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]


def flight(x0, y0, z0, x1, y1, z1, axis, high, clear_up):
    return {"bounds": [x0, y0, z0, x1, y1, z1], "axis": axis, "high": high, "clearUp": clear_up}


models = {}

# The doorway in the cabin's north wall (wall faces z 1.41 and 1.50).
GT_DOOR = door(0.685, 1.455, 6.82, 8.86, "x", 1.15)
models["bridge-guardtower"] = {
    "collisionOnly": True,
    "doors": [GT_DOOR],
    "stairs": [
        flight(1.52, 0.20, -1.50, 2.88, 2.46, 1.50, "z", "min", 1.0),
        flight(-1.56, 2.46, -2.94, 1.19, 4.64, -1.59, "x", "min", 1.0),
        # The last flight runs beside the cabin's west wall: its envelope stops at the walkway
        # (a higher clear would take the wall's lower metre with it).
        flight(-3.01, 4.64, -1.25, -1.65, 6.82, 1.50, "z", "max", 0.05),
    ],
    "clear": [
        # The voxel decks stand 0.2-0.3 m proud: exact slabs instead (and the rails' voxels
        # over the landings' edges, which would lift a player into the frame).
        box(1.19, 2.30, -2.94, 2.88, 2.95, -1.50),
        box(-3.01, 4.48, -2.94, -1.56, 5.05, -1.25),
        box(-3.01, 6.66, 1.50, 1.44, 7.10, 2.94),
        box(-1.47, 6.66, -1.41, 1.34, 7.10, 1.41),
        # Head room over the last flight: the walkway's edge, its rail and the cabin wall's
        # voxels reach out over it (the cabin's wall goes back in as an exact box).
        box(-3.0, 6.0, -1.25, -1.62, 8.9, 1.5),
        # The doorway through the cabin's wall (the door's own box closes it).
        box(0.11, 6.83, 1.25, 1.26, 8.86, 1.70),
    ],
    "solid": [
        box(1.19, 2.30, -2.94, 2.88, 2.46, -1.50),
        box(-3.01, 4.48, -2.94, -1.56, 4.64, -1.25),
        box(-3.01, 6.66, 1.50, 1.44, 6.82, 2.94),
        box(-1.56, 6.66, -1.50, 1.44, 6.82, 1.50),
        # The walkway's rails (north and east ends), 1 m high, where the clear above took their
        # bottom voxels.
        box(-3.04, 6.82, 2.94, 1.44, 7.80, 3.03),
        box(1.38, 6.82, 1.50, 1.47, 7.80, 3.03),
        # The cabin's walls under the windows, where the clear took their bottom voxels.
        box(-1.56, 6.82, -1.50, 1.44, 7.10, -1.41),
        box(-1.56, 6.82, -1.50, -1.47, 7.80, 1.50),
        box(1.34, 6.82, -1.50, 1.44, 7.10, 1.50),
        box(-1.56, 6.82, 1.41, 0.11, 7.10, 1.50),
        box(1.26, 6.82, 1.41, 1.44, 7.10, 1.50),
    ],
}

models["bridge-watchtower"] = {
    "collisionOnly": True,
    # A deck, not a room: no door inferred from the new slab.
    "doors": [],
    "stairs": [],
    "clear": [
        box(-2.20, 7.30, -2.20, 2.20, 9.70, 2.30),
        # The ladder itself (rungs and stiles, voxelised 0.3 m out round them) carries no
        # collision, like the Iron Peaks one: the climber stands at its foot and goes up its
        # face. The corner pole beside it (z <= -1.96) keeps its own.
        box(-2.60, -0.5, -1.93, -1.90, 7.30, -0.95),
    ],
    "solid": [
        box(-2.13, 7.51, -2.17, 2.16, 7.71, 2.27),
        # Plank walls 7.71..9.37 m; the west one leaves the ladder's gap (z -2.0..-1.14).
        box(-2.06, 7.71, -1.14, -1.98, 9.37, 2.02),
        box(1.99, 7.71, -2.06, 2.07, 9.37, 2.02),
        box(-2.03, 7.71, 1.98, 2.03, 9.37, 2.06),
        box(-2.03, 7.71, -2.06, 2.03, 9.37, -1.98),
    ],
}

spec = {
    "version": "access-v15",
    "baseManifest": "models.strait-v2.json",
    "baseCollision": "collision.strait-v2.json",
    "notes": "The strait bridgeheads' guard tower (stairs, cabin door) and watchtower (deck, "
    "climbed by its ladder) walkable. Generated by art/br/fitout/strait.py.",
    "models": models,
}
out = ROOT / "building-access-v15.json"
out.write_text(json.dumps(spec, indent=1) + "\n")

# Up the three flights, along the walkway and in through the cabin's door.
ROUTE = {
    "model": "bridge-guardtower",
    "top": 6.82,
    "route": [
        [2.2, 2.9], [2.2, 1.4], [2.2, -1.4], [2.2, -2.25], [1.0, -2.25], [-1.5, -2.25],
        [-2.3, -2.2], [-2.33, -1.1], [-2.33, 1.45], [-2.3, 2.25], [0.685, 2.25], [0.685, 0.4],
    ],
}
routes_file = ROOT / "tower-routes.json"
routes = [t for t in json.loads(routes_file.read_text()) if t["model"] != ROUTE["model"]]
routes_file.write_text(json.dumps(routes + [ROUTE], indent=1) + "\n")
print(out)
