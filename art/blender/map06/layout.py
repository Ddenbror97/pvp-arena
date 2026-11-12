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
import json, math, os

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
    ("ct-to-b", 9, 26, -36, -30),  # 3 m south of the A corridor: no shared sight band
    ("ct-mid", 2, 8, -33, -11),
    ("a-house", -21, 3, -29, -26),
    ("b-house", 7, 21, -23, -20),
    # Bombsites
    ("site-a", -38, -20, -37, -14),
    ("site-b", 20, 36, -37, -16),
    # Mid: plaza, a connector to each site, Terrorist mid as an S-bend offset from Police mid.
    ("mid-plaza", -10, 10, -14, 2),  # 3 m opening onto the A catwalk stairs (z -14..-11)
    ("a-connector", -21, -9, -16, -11),
    ("b-connector", 9, 21, -18, -11),
    ("t-mid-upper", -6, 0, 1, 10),
    ("t-mid-jog", -6, 10, 10, 16),
    ("t-mid-lower", 4, 10, 15, 32),
    # Terrorist side
    ("t-spawn", -10, 16, 31, 40),
    ("t-west-road", -38, -9, 24, 31),
    ("t-west-exit", -12, -6, 28, 33),  # 5 m exit from spawn to the west road
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
    ("b-heaven-access", 22, 36, -40, -35),
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
    """Steps of 0.3 m from the floor up to `top` (exclusive: the platform is the last step), along
    axis "x" or "z", rising toward +1 or -1. The steps fill the whole run, so the highest one meets
    the platform edge with no gap."""
    k = int(round(top / STEP)) - 1
    span = (x1 - x0) if axis == "x" else (z1 - z0)
    d = span / k
    lo = x0 if axis == "x" else z0
    hi = x1 if axis == "x" else z1
    for i in range(1, k + 1):
        a0, a1 = (lo + (i - 1) * d, lo + i * d) if rising > 0 else (hi - i * d, hi - (i - 1) * d)
        if axis == "x":
            box(f"{id}-{i}", a0, a1, z0, z1, 0, STEP * i, "concrete", "stair")
        else:
            box(f"{id}-{i}", x0, x1, a0, a1, 0, STEP * i, "concrete", "stair")




# Vehicles and the forklift: several boxes that hug the dressed model (art/blender/map06/
# build_sandgate.py places the model in the placement rectangle below; the boxes are fractions of
# it, measured on the model as placed), so collision matches what is visible: a wheeled body from
# the ground (its underside is closed by a dark chassis fill), a narrower cabin / bonnet, and for the
# forklift the raised load, the axles, the counterweight and the overhead-guard roof (plated). The
# forklift's open cage and mast rails stay out of collision. Fractions: (x0, x1, y0, y1, z0, z1),
# the model's nose at z0.
VEHICLES = {}
MRAP = (("body", 0.0167, 0.9833, 0, 0.429, 0.0917, 0.995),  # wheels, chassis, side lockers
        ("upper", 0.0067, 0.9933, 0.429, 0.6, 0.0, 0.995),  # hull up to the fenders
        ("nose", 0.0667, 0.9333, 0.6, 0.781, 0.0, 0.3),  # bonnet and grille
        ("cab", 0.0667, 0.9333, 0.6, 1.0, 0.3, 0.9833))  # crew cab and rear body
CAR = (("wheel-fl", 0.07, 0.255, 0, 0.4133, 0.093, 0.282), ("wheel-fr", 0.795, 0.98, 0, 0.4133, 0.093, 0.282),
       ("wheel-rl", 0.095, 0.28, 0, 0.4133, 0.735, 0.932), ("wheel-rr", 0.8, 0.985, 0, 0.4133, 0.735, 0.958),
       ("body", 0.025, 0.975, 0.4133, 0.7467, 0.0075, 0.9875),  # open under the body between the axles
       ("cab", 0.02, 0.965, 0.7467, 0.99, 0.3, 0.7625), ("rear", 0.025, 0.975, 0.7467, 0.8467, 0.7625, 0.925))
FORKLIFT = (("load", 0.0667, 0.9333, 0, 0.95, 0.0125, 0.3125),  # forks, pallet and a three-crate stack
            ("front", 0.0667, 0.9333, 0, 0.375, 0.2917, 0.5417), ("core", 0.2333, 0.7667, 0, 0.375, 0.5417, 0.7917),
            ("rear-axle", 0.0833, 0.9167, 0, 0.28, 0.7917, 0.9792),  # rear wheels
            ("counterweight", 0.2083, 0.7917, 0.28, 0.51, 0.7917, 0.9792),
            # enclosed cab (sheet metal and dark glass, it stays the sight-line breaker the
            # layout intends) and its roof plate
            ("cab", 0.2083, 0.7917, 0.375, 0.925, 0.3125, 0.8333), ("roof", 0.2083, 0.7917, 0.925, 1.0, 0.3125, 0.8333))


def vehicle(id, x0, x1, z0, z1, h, model, kind, parts):
    VEHICLES[id] = {"x0": x0, "x1": x1, "z0": z0, "z1": z1, "h": h, "model": model}
    for name, a0, a1, b0, b1, c0, c1 in parts:
        box(f"{id}-{name}", x0 + (x1 - x0) * a0, x0 + (x1 - x0) * a1, z0 + (z1 - z0) * c0, z0 + (z1 - z0) * c1,
            h * b0, h * b1, "metal", kind)


PLATFORM = 1.2
# Bombsite A (research: docs/fps-bomb/DESIGN.md, "favourite spots"): a raised stone platform at
# the back (stairs from the east and the south), a three-crate perch mid-site, stepped crates by the
# long exit that can be climbed, a single crate, a guard booth on the Police side, a truck and low
# sand barriers. A defender can watch one entrance while covered from the others.
box("a-platform", -38, -32, -37, -31, 0, PLATFORM, "concrete", "platform")
stairs("a-platform-e", -32, -30, -37, -33, PLATFORM, "x", -1)
stairs("a-platform-s", -38, -34, -31, -29, PLATFORM, "z", -1)
vehicle("a-truck", -37, -34, -24, -18, 2.6, "mrap", "vehicle", MRAP)
# Cache quad / Mirage triple: a crate stack at the back of the site covering both Terrorist entrances.
box("a-quad", -31, -29, -30, -28, 0, HEAD, "wood", "crate-stack")
# Cache forklift: breaks the sightline across the site.
vehicle("a-forklift", -28, -26.8, -22, -19.6, 2.0, "forklift", "forklift", FORKLIFT)
box("a-step-low", -34, -33, -18, -17, 0, 0.6, "wood", "crate")
box("a-step-high", -34, -33, -19.2, -18, 0, LOW, "wood", "crate")
# A short (Dust2 catwalk + Mirage palace / Inferno balcony): the A connector is a raised walkway from
# mid (stairs up at the mid end, a crate beside them as a boost) ending in a balcony over the site,
# with stairs down to the site as well as the drop, so it can be contested from both sides.
box("a-catwalk", -20, -13, -16, -11, 0, PLATFORM, "concrete", "catwalk")
stairs("a-catwalk-mid", -13, -10, -16, -11, PLATFORM, "x", -1)
stairs("a-catwalk-site", -23, -20, -16, -14, PLATFORM, "x", 1)
box("mid-boost", -8, -7, -14, -13, 0, 0.6, "wood", "crate")  # beside the catwalk stairs
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
vehicle("b-truck", 29, 31.6, -25, -20, 2.3, "mrap", "vehicle", MRAP)
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
vehicle("long-car", -36.5, -34.5, -10, -6, 1.5, "jeep", "vehicle", CAR)
# Long corner (Dust2): a building corner on the east side of the long exit, so long sees the near half
# of A, never the back of the site.
box("long-corner", -32.5, -30, -17, -13, 0, BLOCK_H, "concrete", "building")
box("long-wall", -34.6, -32.4, -3, -2, 0, 3.2, "concrete", "blast-wall")  # T-wall height
# Dust2 mid doors: a door frame where Terrorist mid meets the plaza (the round-start duel).
box("mid-door-w", -6, -4.2, 1, 1.6, 0, 3.2, "wood", "gate")
box("mid-door-e", -1.8, 0, 1, 1.6, 0, 3.2, "wood", "gate")
# Inferno banana: a burnt car at the top of B main (the first fight of the round), sandbags halfway.
vehicle("banana-car", 30.5, 32.5, 21, 25, 1.5, "jeep", "vehicle", CAR)
box("banana-sandbags", 25, 27, 5, 5.8, 0, LOW, "concrete", "sandbags")
box("hall-crates", 35, 37, -12, -10, 0, LOW, "wood", "crate")
# Spawn screens (no sight from spawn exits into the roads at round start).
box("t-screen", -3, 3, 31, 32, 0, HEAD, "concrete", "blast-wall")
# Terrorist spawn exit pillars (each exit keeps 4 m): no lane from the west road across spawn to
# the east road.
box("t-pillar-w", -7, -6, 31, 34, 0, 4.0, "concrete", "spawn-wall")
box("t-pillar-e", 14, 15, 31, 35, 0, 4.0, "concrete", "spawn-wall")
box("ct-screen", -3, 1, -33, -32, 0, HEAD, "concrete", "blast-wall")
# Corridor walls, staggered: the two north corridors and the spawn share one band, and without these
# a standing eye on the A platform sees the B dock across Police spawn (70 m). Each leaves a 3 m
# passage in its corridor (the spawn exits themselves stay full width).
box("ct-wall-w", -18, -17, -36, -33, 0, 4.0, "concrete", "spawn-wall")
box("ct-wall-e", 17, 18, -36, -33, 0, 4.0, "concrete", "spawn-wall")
box("ct-wall-b", 23, 24, -33, -30, 0, 4.0, "concrete", "spawn-wall")  # 3 m passage left at its south

# ------------------------------------------------------------------ street life (props)
# Owner, 2026-11-12: "the maps feel empty ... objects to fill up the maps ... players can hide
# behind a tree, an exploded car". The second batch of Sketchfab models (props_assets.py, placed by
# props.py) stands along the walls and in the wide spaces: palms, a burnt-out car and two parked
# wrecks, two market stalls, a handcart, potted plants, tyres, rubble and rubbish bags. Each one
# is enclosed by its collision boxes (the collision-dressing check allows no visual surface in
# walkable space), measured on the processed model: (x0, x1, z0, z1, y0, y1) in the model's frame,
# metres, its length along x and its front to +z. Palms: the trunk to 2.3 m (the fronds above are
# trimmed to start at 2.35 m). The market stall: its counter to 1.32 m over the whole footprint (too
# high to jump onto, so the open window and awning above need none). Cars: the body, then the cabin
# (the hull of every surface above the body, its sloped windows included). The handcart: its bed,
# then its shafts.
PROP_SHAPES = {
    "wreck": (("body", -2.31, 2.29, -1.2, 1.21, 0, 1.0), ("cabin", -2.21, 1.32, -1.02, 1.06, 1.0, 1.57)),
    "car": (("body", -2.06, 2.06, -0.85, 0.85, 0, 1.0), ("cabin", -0.75, 1.68, -0.73, 0.73, 1.0, 1.44)),
    "stall": (("counter", -1.49, 1.49, -1.06, 1.52, 0, 1.32),),
    "cart": (("bed", -1.31, 0.32, -0.98, 0.98, 0, 1.08), ("shafts", 0.32, 1.31, -0.6, 0.57, 0, 0.66)),
    "palm-1": (("trunk", -0.36, 0.35, -0.32, 0.44, 0, 2.3),),
    "palm-3": (("trunk", -0.39, 0.52, -0.42, 0.79, 0, 2.3),),
    "tall-palm": (("trunk", -0.32, 0.32, -0.34, 0.3, 0, 2.3),),
    "pot": (("pot", -0.42, 0.42, -0.42, 0.42, 0, 0.63),),
    "tires": (("stack", -0.41, 0.41, -0.41, 0.41, 0, 1.01),),
    "rubble": (("pile", -0.81, 0.81, -0.61, 0.61, 0, 0.33),),
    "bag": (("bag", -0.31, 0.31, -0.4, 0.4, 0, 0.33),),
    "shrub": (("bush", -1.02, 1.02, -1.1, 1.1, 0, 0.76),),
}
PROP_KIND = {"wreck": "prop-car", "car": "prop-car", "stall": "prop-stall", "cart": "prop-cart",
             "palm-1": "prop-palm", "palm-3": "prop-palm", "tall-palm": "prop-palm", "pot": "prop-pot",
             "tires": "prop-tires", "rubble": "prop-rubble", "bag": "prop-bag", "shrub": "prop-bush"}
PROP_SURFACE = {"wreck": "metal", "car": "metal", "tires": "metal", "stall": "wood", "cart": "wood",
                "palm-1": "wood", "palm-3": "wood", "tall-palm": "wood"}
# Model heights scaled at placement (the rubble pile to a 0.33 m step).
PROP_YSCALE = {"rubble": 0.33 / 0.373}
QUARTER = math.pi / 2
# (model, x, z, quarter turns): the model's origin (bottom centre). One turn faces the front
# (+z) toward +x, two toward -z, three toward -x.
PROPS = [
    # Terrorist spawn: a palm east of the spawn line, a tall palm in the west corner, tyres by
    # the east exit.
    ("palm-1", 11.0, 36.4, 0), ("tall-palm", -8.0, 38.6, 0),
    ("tires", 17.2, 38.5, 0), ("tires", 18.05, 38.55, 0),
    # West road: the burnt-out car along its north wall, tyres and rubbish at the exit corner.
    ("wreck", -22.0, 25.3, 0), ("tires", -12.5, 24.55, 0), ("bag", -11.5, 24.5, 1),
    ("bag", -37.5, 30.45, 0), ("rubble", -36.9, 29.0, 1),
    # A long: rubble and rubbish bags along the walls, tyres by the doors.
    ("rubble", -30.65, 18.0, 1), ("bag", -37.55, 8.85, 0), ("bag", -36.9, 9.05, 1),
    ("tires", -30.45, 7.0, 0), ("pot", -30.5, -12.0, 0), ("pot", -30.5, -11.1, 0),
    # Bombsite A: a palm mid-site (new cover between the long exit and the platform), potted
    # plants against the east wall.
    ("palm-3", -25.6, -25.6, 0), ("pot", -20.5, -24.6, 0), ("pot", -20.5, -23.6, 0),
    # Mid plaza: a market stall on the east side facing the plaza, a handcart on the west side, a
    # palm in the north half, rubbish by the Terrorist-mid door.
    ("stall", 8.9, -8.0, 3), ("cart", -8.6, -1.5, 1), ("palm-1", -3.5, -10.5, 0),
    ("bag", 9.6, 1.45, 0), ("pot", 0.6, -13.55, 0),
    # Terrorist mid: a parked wreck on the jog's south wall, rubble and rubbish down the lower lane.
    ("car", -3.5, 15.1, 0), ("rubble", 9.35, 24.0, 1), ("bag", 4.45, 20.5, 1), ("tires", 4.45, 29.0, 0),
    # East road: a second parked wreck on its south wall.
    ("car", 23.0, 38.12, 2), ("bag", 37.55, 33.6, 0),
    # B main: the second market stall in the first bend's corner, potted plants and rubble.
    ("stall", 32.93, 13.5, 3), ("pot", 22.45, 11.0, 0), ("pot", 22.45, 10.0, 0),
    ("rubble", 36.25, -2.6, 1), ("bag", 36.55, -16.6, 0), ("shrub", 23.15, -4.85, 0),
    # Police side: tall palms at the spawn's west and east ends, bags in the corridors.
    ("tall-palm", -8.5, -36.0, 0), ("tall-palm", 7.6, -36.2, 0), ("bag", 22.45, -39.5, 0),
    ("bag", -25.5, -38.5, 1), ("pot", -9.5, -32.5, 0),
]


def prop_box(model, x, z, turns, part):
    """A model-frame box turned `turns` quarter turns and moved to (x, z): its world AABB."""
    _, x0, x1, z0, z1, y0, y1 = part
    corners = []
    c, s = round(math.cos(turns * QUARTER)), round(math.sin(turns * QUARTER))
    for lx in (x0, x1):
        for lz in (z0, z1):
            # Blender yaw (about up) in game axes: x' = x c + z s, z' = -x s + z c
            corners.append((x + lx * c + lz * s, z - lx * s + lz * c))
    xs, zs = [p[0] for p in corners], [p[1] for p in corners]
    k = PROP_YSCALE.get(model, 1.0)
    return min(xs), max(xs), min(zs), max(zs), y0 * k if part[0] != "pile" else y0, y1


props_out = []
for n, (model, px, pz, turns) in enumerate(PROPS):
    props_out.append({"id": f"prop-{n + 1}", "model": model, "x": px, "z": pz, "yaw": turns * QUARTER,
                      "yscale": PROP_YSCALE.get(model, 1.0)})
    for part in PROP_SHAPES[model]:
        bx0, bx1, bz0, bz1, by0, by1 = prop_box(model, px, pz, turns, part)
        box(f"prop-{n + 1}-{model}-{part[0]}", bx0, bx1, bz0, bz1, by0, by1, PROP_SURFACE.get(model, "concrete"),
            PROP_KIND[model])

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
                   "bombsites": BOMBSITES, "vehicles": VEHICLES, "props": props_out, "spawns": {"police": POLICE_SPAWNS, "terrorist": TERRORIST_SPAWNS}}, f, indent=1)
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
