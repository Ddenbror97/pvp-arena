"""
MAP 06 (working name SANDGATE) — 5v5 Practice Bomb Defusal: the single source of truth for
gameplay solids, team spawns and bombsite zones.

  python3 art/blender/map06/layout.py   # writes src/lib/fps/sandgate-layout.ts + build/layout.json

Metres, feet at y = 0. x runs west (-) to east (+), z north (-) to south (+).
Police (CT) spawn north, Terrorist spawn south. Bombsite A north-west, B north-east.

Three lanes from the Terrorist side:
  A long  (exterior, long range)  T spawn → west road → A long (staggered containers) → A
  Mid     (control)                T spawn → T mid (S-bend) → mid plaza → A connector / B connector
  B main  (interior, close range)  T spawn → east road → warehouse hall (S-walls) → B
Police rotate through their spawn: CT→A and CT→B corridors, and CT mid down to the plaza.

The walkable area is the union of OPEN rectangles; everything else inside the arena is a building
block (8 m, blocks movement, bullets and sight), merged into as few boxes as possible. Cover is
added as explicit boxes on top of the open floor.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
W, D = 80, 80
HALF_W, HALF_D = W // 2, D // 2
BLOCK_H = 8.0
LOW = 1.15  # crouch cover: hides a crouched head, cannot be jumped onto (jump apex 0.89 m)
HEAD = 2.2  # standing cover

# (id, x0, x1, z0, z1) walkable rectangles; overlaps join them.
OPEN = [
    # Police side: spawn, a corridor to each site along the north edge, Police mid down to the plaza,
    # and one building passage from Police mid into each site (3 Police paths per site with the
    # mid connector; 2 Terrorist entrances per site: research, docs/fps-bomb/DESIGN.md).
    ("ct-spawn", -10, 10, -40, -32),
    ("ct-to-a", -26, -9, -39, -33),
    ("ct-to-b", 9, 26, -39, -33),
    ("ct-mid", 2, 8, -33, -11),
    ("a-house", -21, 3, -29, -26),
    ("b-house", 7, 21, -23, -20),
    # Bombsites
    ("site-a", -38, -20, -37, -14),
    ("site-b", 20, 36, -37, -16),
    # Mid: plaza, a connector to each site, Terrorist mid as an S-bend offset from Police mid.
    ("mid-plaza", -10, 10, -12, 2),
    ("a-connector", -21, -9, -16, -11),
    ("b-connector", 9, 21, -18, -11),
    ("t-mid-upper", -6, 0, 1, 10),
    ("t-mid-jog", -6, 10, 10, 16),
    ("t-mid-lower", 4, 10, 15, 32),
    # Terrorist side
    ("t-spawn", -10, 16, 31, 40),
    ("t-west-road", -38, -9, 24, 31),
    ("a-long", -38, -30, -15, 31),
    ("t-east-road", 15, 38, 33, 39),
    # B main, Inferno-banana style: a winding contested lane (burnt car at the top, sandbags halfway),
    # ending in a short covered hall whose exit faces two angles on B (Mirage apartments). Not the only
    # way into B (B connector from mid, and the lower passage), unlike banana (research).
    ("b-main-top", 28, 34, 18, 34),
    ("b-main-bend1", 22, 34, 12, 18),
    ("b-main-mid", 22, 28, 0, 12),
    ("b-main-bend2", 22, 37, -6, 0),
    ("b-hall", 31, 37, -18, -6),
    # Lower passage (Dust2 lower tunnels / Cache vents): Terrorist mid to the B lane, for splits.
    ("lower-passage", 10, 24, 11, 13.5),
    # Police access to the B dock (Cache heaven: a raised Police platform reached from their side).
    ("b-heaven-access", 24, 36, -40, -37),
]

# Bombsite plant zones (gameplay logic): a bomb can be planted only with the planter's feet inside.
BOMBSITES = {
    "A": {"x0": -36.0, "x1": -24.0, "z0": -34.0, "z1": -18.0},
    # Lower level of B only: the dock is the defenders' upper tier, the guard office is not on site.
    "B": {"x0": 25.5, "x1": 31.0, "z0": -35.0, "z1": -19.0},
}

solids = []


def box(id, x0, x1, z0, z1, y0, y1, surface, kind, layer="box"):
    solids.append({
        "id": id, "x": round((x0 + x1) / 2, 4), "y": round((y0 + y1) / 2, 4), "z": round((z0 + z1) / 2, 4),
        "w": round(x1 - x0, 4), "h": round(y1 - y0, 4), "d": round(z1 - z0, 4),
        "surface": surface, "kind": kind, "layer": layer,
    })


def is_open(x, z):
    """Centre of the 1 m cell [x, x+1) × [z, z+1) inside some open rectangle."""
    cx, cz = x + 0.5, z + 0.5
    return any(x0 <= cx <= x1 and z0 <= cz <= z1 for (_, x0, x1, z0, z1) in OPEN)


# ------------------------------------------------------------------ building blocks (complement)
solid = {(x, z) for x in range(-HALF_W, HALF_W) for z in range(-HALF_D, HALF_D) if not is_open(x, z)}
n = 0
while solid:
    # Greedy: lowest z, then lowest x; grow east, then grow south while the whole row is solid.
    z0 = min(z for _, z in solid)
    x0 = min(x for x, z in solid if z == z0)
    x1 = x0
    while (x1 + 1, z0) in solid:
        x1 += 1
    z1 = z0
    while all((x, z1 + 1) in solid for x in range(x0, x1 + 1)):
        z1 += 1
    for x in range(x0, x1 + 1):
        for z in range(z0, z1 + 1):
            solid.discard((x, z))
    n += 1
    box(f"block-{n}", x0, x1 + 1, z0, z1 + 1, 0, BLOCK_H, "concrete", "building")

# ------------------------------------------------------------------ cover (on the open floor)
STEP = 0.3


def stairs(id, x0, x1, z0, z1, top, axis, rising):
    """Steps of 0.3 m from the floor up to `top`, along axis "x" or "z", rising toward +1 or -1."""
    n_ = int(round(top / STEP))
    span = (x1 - x0) if axis == "x" else (z1 - z0)
    for i in range(1, n_):
        a = i / n_ * span
        if axis == "x":
            sx0, sx1 = (x0 + a - span / n_, x0 + a) if rising > 0 else (x1 - a, x1 - a + span / n_)
            box(f"{id}-{i}", sx0, sx1, z0, z1, 0, STEP * i, "concrete", "stair")
        else:
            sz0, sz1 = (z0 + a - span / n_, z0 + a) if rising > 0 else (z1 - a, z1 - a + span / n_)
            box(f"{id}-{i}", x0, x1, sz0, sz1, 0, STEP * i, "concrete", "stair")


PLATFORM = 1.2
# Bombsite A (research: docs/fps-bomb/DESIGN.md, "favourite spots"): a raised stone platform at
# the back (stairs from the east and the south), a three-crate perch mid-site, stepped crates by the
# long exit that can be climbed, a single crate, a guard booth on the Police side, a truck and low
# sand barriers. A defender can watch one entrance while covered from the others.
box("a-platform", -38, -32, -37, -31, 0, PLATFORM, "concrete", "platform")
stairs("a-platform-e", -32, -30, -37, -33, PLATFORM, "x", -1)
stairs("a-platform-s", -38, -34, -31, -29, PLATFORM, "z", -1)
box("a-truck", -37, -34, -24, -18, 0, 2.6, "metal", "vehicle")
# Cache quad / Mirage triple: a crate stack at the back of the site covering both Terrorist entrances.
box("a-quad", -31, -29, -30, -28, 0, HEAD, "wood", "crate-stack")
# Cache forklift: breaks the sightline across the site.
box("a-forklift", -28, -26.8, -22, -19.6, 0, 2.0, "metal", "forklift")
box("a-step-low", -34, -33, -18, -17, 0, 0.6, "wood", "crate")
box("a-step-high", -34, -33, -19.2, -18, 0, LOW, "wood", "crate")
# A short (Dust2 catwalk + Mirage palace / Inferno balcony): the A connector is a raised walkway from
# mid (stairs up at the mid end, a crate beside them as a boost) ending in a balcony over the site,
# with stairs down to the site as well as the drop, so it can be contested from both sides.
box("a-catwalk", -20, -13, -16, -11, 0, PLATFORM, "concrete", "catwalk")
stairs("a-catwalk-mid", -13, -10, -16, -11, PLATFORM, "x", -1)
stairs("a-catwalk-site", -23, -20, -16, -14, PLATFORM, "x", 1)
box("mid-boost", -9, -8, -12, -11, 0, 0.6, "wood", "crate")
box("a-booth", -24, -22.5, -36.5, -34.8, 0, 2.4, "wood", "booth")
box("a-low-1", -25, -23, -21, -20, 0, LOW, "concrete", "sand-barrier")
box("a-low-2", -31, -29, -34, -33, 0, LOW, "concrete", "sand-barrier")
box("a-wall", -24, -23, -32, -29, 0, HEAD, "concrete", "blast-wall")
# Bombsite B: the warehouse hall exits onto the site facing two angles; a supply truck faces that
# exit; low planters line the back wall; a Police guard office (door onto the site, a window on the
# hall exit, linked to the Police building passage) and the raised loading dock as the upper tier.
OFFICE = (20, 25, -26, -18)  # x0, x1, z0, z1 (inside the site's west edge; b-house enters it)
ox0, ox1, oz0, oz1 = OFFICE
box("b-office-n", ox0, ox1, oz0, oz0 + 0.4, 0, 4.0, "concrete", "office-wall")
box("b-office-e1", ox1 - 0.4, ox1, oz0, -24.0, 0, 4.0, "concrete", "office-wall")
box("b-office-e2", ox1 - 0.4, ox1, -22.6, oz1, 0, 4.0, "concrete", "office-wall")  # door z -24..-22.6
box("b-office-s-sill", ox0 + 1, ox1, oz1 - 0.4, oz1, 0, LOW, "concrete", "office-wall")  # window sill
box("b-office-s-head", ox0 + 1, ox1, oz1 - 0.4, oz1, 2.1, 4.0, "concrete", "office-wall")
box("b-office-s-jamb", ox0, ox0 + 1, oz1 - 0.4, oz1, 0, 4.0, "concrete", "office-wall")
box("b-dock", 31, 36, -37, -29, 0, PLATFORM, "concrete", "platform")
stairs("b-dock-w", 29, 31, -35, -31, PLATFORM, "x", 1)
stairs("b-dock-s", 31, 35, -29, -27, PLATFORM, "z", -1)
box("b-truck", 29, 31.6, -25, -20, 0, 2.3, "metal", "vehicle")
box("b-container", 26, 28.5, -33, -28, 0, 2.6, "metal", "container")
# Inferno fountain: low stone cover in the middle of the site that splits it in two halves.
box("b-well", 27.5, 29, -27, -25.5, 0, LOW, "concrete", "well")
# Cache heaven: stairs up to the dock from the Police access along the north edge.
stairs("b-dock-n", 32, 35, -40, -37, PLATFORM, "z", 1)
box("b-planters", 22, 27, -37, -36.2, 0, LOW, "concrete", "planter")
box("b-pillar", 26.5, 27.3, -24, -23.2, 0, 4.0, "concrete", "pillar")
# Mid plaza: crates and a column break the plaza.
box("mid-crates", -5, -2, -6, -4, 0, LOW, "wood", "crate")
box("mid-column", 4, 5, -3, -2, 0, 4.0, "concrete", "pillar")
box("mid-wall", -9, -8, -10, -6, 0, HEAD, "concrete", "blast-wall")
# A long: staggered containers so no single lane runs the length of long.
# Dust2 long doors: a double-door gate near the Terrorist end of A long, where the long fight starts.
box("long-door-w", -38, -35.5, 22, 22.6, 0, 3.2, "wood", "gate")
box("long-door-e", -32.5, -30, 22, 22.6, 0, 3.2, "wood", "gate")
box("long-container-1", -38, -35.5, 10, 15, 0, 2.6, "metal", "container")
box("long-container-2", -32.5, -30, 1, 6, 0, 2.6, "metal", "container")
# Dust2 car on long: a parked car near the site end of long.
box("long-car", -36.5, -34.5, -10, -6, 0, 1.5, "metal", "vehicle")
# Long corner (Dust2): a building corner on the east side of the long exit, so long sees the near half
# of A, never the back of the site.
box("long-corner", -32.5, -30, -17, -13, 0, BLOCK_H, "concrete", "building")
box("long-wall", -34.6, -32.4, -3, -2, 0, 3.2, "concrete", "blast-wall")  # T-wall height
# Dust2 mid doors: a door frame where Terrorist mid meets the plaza (the round-start duel).
box("mid-door-w", -6, -4.2, 1, 1.6, 0, 3.2, "wood", "gate")
box("mid-door-e", -1.8, 0, 1, 1.6, 0, 3.2, "wood", "gate")
# Inferno banana: a burnt car at the top of B main (the first fight of the round), sandbags halfway.
box("banana-car", 30.5, 32.5, 21, 25, 0, 1.5, "metal", "vehicle")
box("banana-sandbags", 25, 27, 5, 5.8, 0, LOW, "concrete", "sandbags")
box("hall-crates", 35, 37, -12, -10, 0, LOW, "wood", "crate")
# Spawn screens (no sight from spawn exits into the roads at round start).
box("t-screen", -3, 3, 31, 32, 0, HEAD, "concrete", "blast-wall")
# Terrorist spawn exit pillars (each exit keeps 4 m): no lane from the west road across spawn to
# the east road.
box("t-pillar-w", -9, -8, 28, 33, 0, 4.0, "concrete", "spawn-wall")
box("t-pillar-e", 14, 15, 31, 35, 0, 4.0, "concrete", "spawn-wall")
box("ct-screen", -3, 1, -33, -32, 0, HEAD, "concrete", "blast-wall")
# Police spawn walls, staggered: the two north corridors and the spawn share one band, and without
# these a standing eye on the A platform sees the B dock across Police spawn (70 m).
box("ct-wall-w", -9, -8, -40, -35, 0, 4.0, "concrete", "spawn-wall")
box("ct-wall-e", 8, 9, -37, -32, 0, 4.0, "concrete", "spawn-wall")

# ------------------------------------------------------------------ perimeter, spawns
walls = [
    {"id": "wall-west", "x": -HALF_W - 0.4, "y": 6, "z": 0, "w": 0.8, "h": 12, "d": D + 1.6, "surface": "concrete"},
    {"id": "wall-east", "x": HALF_W + 0.4, "y": 6, "z": 0, "w": 0.8, "h": 12, "d": D + 1.6, "surface": "concrete"},
    {"id": "wall-north", "x": 0, "y": 6, "z": -HALF_D - 0.4, "w": W, "h": 12, "d": 0.8, "surface": "concrete"},
    {"id": "wall-south", "x": 0, "y": 6, "z": HALF_D + 0.4, "w": W, "h": 12, "d": 0.8, "surface": "concrete"},
]
# Five spawns per team, 1.6 m apart (the sides swap at halftime: Police always spawn north).
POLICE_SPAWNS = [{"x": x, "z": -37.0, "yaw": 3.1416} for x in (-6.4, -3.2, 0.0, 3.2, 6.4)]
TERRORIST_SPAWNS = [{"x": x, "z": 36.5, "yaw": 0.0} for x in (-6.4, -3.2, 0.0, 3.2, 6.4)]

if __name__ == "__main__":
    ids = [s["id"] for s in solids]
    assert len(ids) == len(set(ids)), "duplicate ids"
    os.makedirs(os.path.join(HERE, "build"), exist_ok=True)
    with open(os.path.join(HERE, "build", "layout.json"), "w") as f:
        json.dump({"arena": {"width": W, "depth": D}, "solids": solids, "walls": walls, "open": OPEN,
                   "bombsites": BOMBSITES, "spawns": {"police": POLICE_SPAWNS, "terrorist": TERRORIST_SPAWNS}}, f, indent=1)
    row = lambda s: (f'  {{ id: "{s["id"]}", x: {s["x"]}, y: {s["y"]}, z: {s["z"]}, w: {s["w"]}, h: {s["h"]}, '
                     f'd: {s["d"]}, surface: "{s["surface"]}" }},')
    spawn = lambda p: f'  {{ x: {p["x"]}, z: {p["z"]}, yaw: {p["yaw"]} }},'
    ts = [
        "// Generated by art/blender/map06/layout.py — edit the layout there, then re-run it.",
        "// MAP 06 (SANDGATE) 5v5 bomb-defusal map: gameplay solids (metres, feet at y = 0, box centres + full sizes).",
        'import type { Solid } from "./map";',
        "",
        f"export const SANDGATE_SIZE = {{ width: {W}, depth: {D} }} as const;",
        "/** Block movement and bullets. */",
        "export const SANDGATE_BOXES: Solid[] = [",
        *[row(s) for s in solids],
        "];",
        "/** Perimeter: bullets only. */",
        "export const SANDGATE_WALLS: Solid[] = [",
        *[row(s) for s in walls],
        "];",
        "/** Plant zones (feet inside the rectangle). */",
        "export const SANDGATE_BOMBSITES = {",
        *[f'  {k}: {{ x0: {v["x0"]}, x1: {v["x1"]}, z0: {v["z0"]}, z1: {v["z1"]} }},' for k, v in BOMBSITES.items()],
        "} as const;",
        "/** Five spawns per team; Police always spawn north, Terrorists south (teams swap at halftime). */",
        "export const SANDGATE_TEAM_SPAWNS = {",
        "  police: [", *["  " + spawn(p) for p in POLICE_SPAWNS], "  ],",
        "  terrorist: [", *["  " + spawn(p) for p in TERRORIST_SPAWNS], "  ],",
        "} as const;",
        "",
    ]
    with open(os.path.join(ROOT, "src/lib/fps/sandgate-layout.ts"), "w") as f:
        f.write("\n".join(ts))
    print(f"{len(solids)} boxes ({n} building blocks), {len(walls)} walls")
