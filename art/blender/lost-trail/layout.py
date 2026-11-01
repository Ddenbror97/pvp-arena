"""
LOST TRAIL — jungle 1v1 aim arena: the single source of truth for gameplay solids.

  python3 art/blender/lost-trail/layout.py   # writes src/lib/fps/lost-trail-layout.ts + build/layout.json

Coordinates are metres with feet at y = 0 (the engine floor). x runs along the 44 m axis (spawn A
west / -x, spawn B east / +x), z along the 36 m axis (north / -z, south / +z). A river runs
north–south through x = 0 and is crossed three times:

  Route B (north)  spawn → stone steps → ridge terrace (+1.5 m) with an observation post →
                   steps down → north log crossing
  Route A (centre) spawn gate → jungle plaza → central wooden bridge over the gorge
  Route C (south)  spawn → lower river trail past the supply hut → shallow ford

Gameplay solids are mirrored across x = 0 so both spawns get identical cover, routes, elevation
and timings. The visual jungle (river bends, terrain, foliage, tree placement) is deliberately
NOT mirrored; Blender dresses these boxes, and everything that isn't a box here is visual only.

Layers:
  "box"      blocks movement and bullets            (map BOXES)
  "bullet"   blocks bullets only                    (map STRUCTURES)
  "barrier"  blocks movement only: the gorge, dense jungle between routes and the playable edge.
             Bullets and sight pass (foliage is not cover); trunks inside barriers are "box".
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))

ARENA = {"width": 44.0, "depth": 36.0}
STEP = 0.3  # stair riser; simulation STEP_HEIGHT is 0.35
RIDGE = 1.5  # ridge terrace height (route B)
LOW_COVER = 1.15  # hides a crouched head (top 1.05 m); jump apex 0.89 m cannot mount it
BARRIER_H = 6.0
TRUNK_H = 9.0  # trunks stop bullets up to here; crowns above are visual only
GORGE = 2.6  # river channel half width
BRIDGE = 1.7  # bridge deck half width (z)
NORTH_CROSSING = (-15.4, -12.6)
FORD = (9.4, 15.2)

solids = []


def box(id, x0, x1, z0, z1, y0, y1, surface, kind, layer="box", side=None, **extra):
    s = {
        "id": id, "x": round((x0 + x1) / 2, 4), "y": round((y0 + y1) / 2, 4), "z": round((z0 + z1) / 2, 4),
        "w": round(x1 - x0, 4), "h": round(y1 - y0, 4), "d": round(z1 - z0, 4),
        "surface": surface, "kind": kind, "layer": layer, "side": side,
    }
    s.update(extra)
    solids.append(s)


def pair(id, x0, x1, z0, z1, y0, y1, surface, kind, layer="box", **extra):
    """Mirrored pair: west (spawn A side) and east (spawn B side)."""
    box(f"{id}-w", x0, x1, z0, z1, y0, y1, surface, kind, layer, "west", **extra)
    box(f"{id}-e", -x1, -x0, z0, z1, y0, y1, surface, kind, layer, "east", **extra)


def centred(id, x0, x1, z0, z1, y0, y1, surface, kind, layer="box", **extra):
    box(id, x0, x1, z0, z1, y0, y1, surface, kind, layer, "centre", **extra)


def barrier(id, x0, x1, z0, z1, mirrored=True, kind="jungle"):
    (pair if mirrored else centred)(id, x0, x1, z0, z1, 0, BARRIER_H, "wood", kind, layer="barrier")


def trunk(id, x, z, d, h=TRUNK_H, mirrored=True, kind="trunk"):
    """A round trunk of diameter d as two crossed boxes (≈ 6% of d off the circle at 45°)."""
    a, b = 0.46 * d, 0.31 * d
    f = pair if mirrored else centred
    f(f"{id}-a", x - a, x + a, z - b, z + b, 0, h, "wood", kind, diameter=d, tree=id)
    f(f"{id}-b", x - b, x + b, z - a, z + a, 0, h, "wood", kind, diameter=d, tree=id)


# ================================================================== playable boundary (movement only)
barrier("edge-north", -22, 22, -18, NORTH_CROSSING[0], mirrored=False, kind="edge")
barrier("edge-south", -22, 22, FORD[1], 18, mirrored=False, kind="edge")
barrier("edge-spawn-n", -22, -17.6, NORTH_CROSSING[0], -5.2, kind="edge")
barrier("edge-spawn-s", -22, -17.6, 5.2, FORD[1], kind="edge")
# River gorge between the three crossings.
barrier("gorge-north", -GORGE, GORGE, NORTH_CROSSING[1], -BRIDGE, mirrored=False, kind="gorge")
barrier("gorge-south", -GORGE, GORGE, BRIDGE, FORD[0], mirrored=False, kind="gorge")
# Dense jungle separating the routes (trunks inside are real cover).
barrier("jungle-ridge-plaza", -15.6, -8.6, -9.6, -5.2)
barrier("jungle-plaza-trail", -15.6, -12.6, 5.2, FORD[0])

# ================================================================== spawn (west; mirrored east)
# A ruined stone gateway screens the spawn pad: exits go round its north and south ends.
pair("spawn-gate", -16.4, -15.8, -3.2, 3.2, 0, 2.6, "concrete", "ruin-wall")
pair("spawn-crates", -21.6, -20.4, -4.9, -3.5, 0, 1.45, "wood", "crate")

# ================================================================== route B: ridge terrace + observation post
pair("ridge", -17.6, -8.6, NORTH_CROSSING[0], -9.6, 0, RIDGE, "concrete", "ridge")
for i in range(1, 6):  # natural stone steps up from the spawn's north exit
    z1 = -5.6 - 0.8 * (i - 1)
    pair(f"ridge-step-up-{i}", -17.6, -15.6, z1 - 0.8, z1, 0, STEP * i, "concrete", "stone-step")
for i in range(1, 5):  # steps down from the post towards the north crossing
    x0 = -8.6 + 0.75 * (i - 1)
    pair(f"ridge-step-down-{i}", x0, x0 + 0.75, NORTH_CROSSING[0], -13.2, 0, RIDGE - STEP * i, "concrete", "stone-step")
# The steps climb a cut in the hillside: a rock face on the plaza side.
pair("ridge-cut", -15.6, -14.8, -9.6, -5.6, 0, 3.8, "concrete", "rock-wall")
# Rock outcrop along the terrace's south edge: the ridge does not overlook the plaza...
pair("ridge-outcrop", -15.6, -10.6, -10.0, -9.6, RIDGE, RIDGE + 2.2, "concrete", "rock-wall")
# ...except from the observation post, behind crouch-height sandbags.
pair("post-sandbags-s", -10.6, -8.6, -9.95, -9.6, RIDGE, RIDGE + LOW_COVER, "concrete", "sandbags")
pair("post-sandbags-e", -8.95, -8.6, -12.0, -9.95, RIDGE, RIDGE + LOW_COVER, "concrete", "sandbags")
trunk("ridge-tree", -13.2, -12.6, 1.8)

# ================================================================== route A: plaza and central bridge
trunk("plaza-tree", -11.4, -2.6, 2.0)
pair("plaza-ruin", -12.8, -12.2, 1.0, 3.6, 0, LOW_COVER, "concrete", "ruin-wall")
pair("plaza-crates", -10.4, -9.0, 1.8, 3.4, 0, 2.2, "wood", "crate-stack")
pair("plaza-log", -8.6, -5.8, -4.4, -3.8, 0, LOW_COVER, "wood", "log")
pair("bridgehead-rock-s", -5.2, -4.0, 3.0, 4.2, 0, 1.6, "concrete", "boulder")
pair("bridgehead-rock-n", -5.2, -4.2, -4.4, -3.0, 0, 1.3, "concrete", "boulder")
# Bridge: deck at ground level over the gorge, rope rails (visual), log posts at each corner.
for zs, tag in ((-1, "n"), (1, "s")):
    pair(f"bridge-post-{tag}", -2.95, -2.6, zs * BRIDGE - 0.175 + zs * 0.175, zs * BRIDGE + 0.175 + zs * 0.175, 0, 1.6, "wood", "bridge-post")
# Supply stack in the middle of the bridge, above head height: the deck becomes two lanes and
# no long diagonal crosses the river through the bridge.
centred("bridge-crates", -0.6, 0.6, -0.6, 0.6, 0, 2.2, "wood", "crate-stack")
# An overgrown stone ruin on each bridgehead blocks the bridge axis: the bridge is approached
# round it (S-bend), so no lane runs from spawn exit to spawn exit through the bridge.
pair("bridgehead-ruin", -7.4, -6.2, -2.0, 2.0, 0, 2.6, "concrete", "ruin-wall")
# Rock walls rising along the gorge rim (3.4 m, above a player standing on the ridge steps):
# sight across the river only at the crossings.
pair("gorge-rim-n", -3.6, -2.6, -9.6, -2.2, 0, 3.4, "concrete", "rock-wall")
pair("gorge-rim-s", -3.6, -2.6, 2.2, 8.4, 0, 3.4, "concrete", "rock-wall")
trunk("river-tree", 0, -10.6, 2.2, mirrored=False, kind="hero-trunk")

# ================================================================== north riverbank (B ↔ A connector)
pair("bank-boulder-n", -6.4, -5.0, -8.4, -7.0, 0, 1.4, "concrete", "boulder")
trunk("bank-tree-n", -5.4, -11.8, 1.6)

# ================================================================== route C: lower river trail and ford
pair("hut", -12.6, -8.8, 5.4, 9.0, 0, 3.0, "wood", "hut")
# The lower trail leaves the spawn through a rock cut as well.
pair("trail-cut", -15.6, -14.8, 5.6, 9.4, 0, 3.0, "concrete", "rock-wall")
pair("bank-boulder-s", -5.2, -3.8, 6.2, 7.4, 0, 1.3, "concrete", "boulder")
# Staggered head-height blockers turn the lower trail into an S-bend (no trail-long lane).
pair("trail-rock", -14.6, -13.0, FORD[0], 11.2, 0, 2.6, "concrete", "boulder")
pair("trail-crates", -10.2, -8.8, 13.0, 14.4, 0, 1.45, "wood", "crate")
pair("trail-boulder", -7.4, -5.8, 10.6, 12.0, 0, 2.4, "concrete", "boulder")
trunk("trail-tree", -4.4, 14.0, 2.0)
centred("ford-rock", -0.9, 0.9, 11.6, 13.2, 0, 2.4, "concrete", "boulder")

# ================================================================== perimeter (bullets only, beyond the forest edge)
walls = [
    {"id": "wall-west", "x": -22.6, "y": 6, "z": 0, "w": 0.8, "h": 12, "d": 37.6, "surface": "wood"},
    {"id": "wall-east", "x": 22.6, "y": 6, "z": 0, "w": 0.8, "h": 12, "d": 37.6, "surface": "wood"},
    {"id": "wall-north", "x": 0, "y": 6, "z": -18.4, "w": 44, "h": 12, "d": 0.8, "surface": "wood"},
    {"id": "wall-south", "x": 0, "y": 6, "z": 18.4, "w": 44, "h": 12, "d": 0.8, "surface": "wood"},
]
spawns = {"A": {"x": -20.0, "z": 0.0, "yaw": -math.pi / 2}, "B": {"x": 20.0, "z": 0.0, "yaw": math.pi / 2}}
regions = {  # named areas for validation and the report (x0, x1, z0, z1, floor y)
    "spawn": (-22, -16.4, -3.2, 3.2, 0), "plaza": (-15.6, -2.6, -5.2, 5.2, 0),
    "bridge": (-2.6, 2.6, -BRIDGE, BRIDGE, 0), "ridge": (-17.6, -8.6, -15.4, -9.6, RIDGE),
    "post": (-10.6, -8.6, -12.0, -9.6, RIDGE), "north-bank": (-8.6, -2.6, -13.2, -5.2, 0),
    "north-crossing": (-2.6, 2.6, NORTH_CROSSING[0], NORTH_CROSSING[1], 0),
    "south-trail": (-17.6, -2.6, FORD[0], FORD[1], 0), "ford": (-2.6, 2.6, FORD[0], FORD[1], 0),
}


def ts_row(s):
    return (f'  {{ id: "{s["id"]}", x: {s["x"]}, y: {s["y"]}, z: {s["z"]}, w: {s["w"]}, h: {s["h"]}, '
            f'd: {s["d"]}, surface: "{s["surface"]}" }},')


if __name__ == "__main__":
    ids = [s["id"] for s in solids]
    assert len(ids) == len(set(ids)), "duplicate ids"
    os.makedirs(os.path.join(HERE, "build"), exist_ok=True)
    with open(os.path.join(HERE, "build", "layout.json"), "w") as f:
        json.dump({"arena": ARENA, "solids": solids, "walls": walls, "spawns": spawns, "regions": regions}, f, indent=1)
    boxes = [s for s in solids if s["layer"] == "box"]
    bullets = [s for s in solids if s["layer"] == "bullet"]
    barriers = [s for s in solids if s["layer"] == "barrier"]
    ts = [
        "// Generated by art/blender/lost-trail/layout.py — edit the layout there, then re-run it.",
        "// LOST TRAIL jungle aim arena: gameplay solids (metres, feet at y = 0, box centres + full sizes).",
        'import type { Solid } from "./map";',
        "",
        f"export const LOST_TRAIL_SIZE = {{ width: {ARENA['width']}, depth: {ARENA['depth']} }} as const;",
        "/** Block movement and bullets. */",
        "export const LOST_TRAIL_BOXES: Solid[] = [",
        *[ts_row(s) for s in boxes],
        "];",
        "/** Bullets only. */",
        "export const LOST_TRAIL_STRUCTURES: Solid[] = [",
        *[ts_row(s) for s in bullets],
        "];",
        "/** Movement only: gorge, dense jungle and the organic playable edge (sight and bullets pass). */",
        "export const LOST_TRAIL_BARRIERS: Solid[] = [",
        *[ts_row(s) for s in barriers],
        "];",
        "/** Perimeter beyond the forest edge: bullets only. */",
        "export const LOST_TRAIL_WALLS: Solid[] = [",
        *[ts_row(s) for s in walls],
        "];",
        "export const LOST_TRAIL_SPAWNS = {",
        f"  A: {{ x: {spawns['A']['x']}, z: {spawns['A']['z']}, yaw: -Math.PI / 2 }},",
        f"  B: {{ x: {spawns['B']['x']}, z: {spawns['B']['z']}, yaw: Math.PI / 2 }},",
        "} as const;",
        "",
    ]
    with open(os.path.join(ROOT, "src/lib/fps/lost-trail-layout.ts"), "w") as f:
        f.write("\n".join(ts))
    print(f"{len(boxes)} boxes, {len(bullets)} bullet-only, {len(barriers)} barriers, {len(walls)} walls")
