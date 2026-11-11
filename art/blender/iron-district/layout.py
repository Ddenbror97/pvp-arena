"""
IRON DISTRICT — the second 5v5 bomb-defusal map: the single source of truth for gameplay solids,
team spawns, bombsite zones and callouts.

  python3 art/blender/iron-district/layout.py   # writes src/lib/fps/iron-district-layout.ts
                                                #      + build/layout.json (Blender, docs, tests)

Metres. x runs west (-) to east (+), z north (-) to south (+). Police (CT) spawn north, Terrorists
south. Bombsite A (the Foundry) north-west, B (the Old Market) north-east. Design and research:
docs/fps-bomb/IRON-DISTRICT.md.

A hillside district. The engine's floor is y = 0 and nothing walks below it, so the map is built on
terraces of solid fill instead of a flat plane:

  0.0  the service tunnel (the only place at the engine floor)
  1.2  the industrial lowland: Police spawn, the Foundry (A), mid, the shipping hall
  2.4  the Old Market (B) and its lower alley
  4.2  the Foundry catwalk (A's elevated walkway)
  5.4  the upper town: Terrorist spawn, the high street, the apartments' upper floor and balcony

Every level change is real collision the shipped movement code walks: stairs are 0.3 m risers,
"ramps" (the loading ramp, the stepped market lane) are 0.15 m risers (STEP_HEIGHT is 0.35 m), the
same box steps every map already uses, with the visual slope inside them (≤ 0.15 m off). Upper floors,
the catwalk and the balcony are slabs with the real headroom under them (≥ 2.6 m); railings are
movement-only barriers so bullets and sight pass through the rails as they look.

The layout is a 0.5 m grid: every cell inside a REGION is open at that region's floor height (solid
fill below it), every other cell is a building block (BLOCK_TOP, blocks movement, bullets and sight).
TUNNELS are carved under the regions above them (floor 0, ceiling 3.2 m, the region's fill above).
Rooms with interiors (the shipping hall, the boiler house, the apartments, the market hall, the
control room) are regions with explicit walls, doors and windows.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
W, D = 92, 92
HX, HZ = W / 2, D / 2
CELL = 0.5
BLOCK_TOP = 9.6  # above any eye (upper town 5.4 + jump 0.9 + eye 1.6 = 7.9)
TUN, LOW, MKT, WALK, UP = 0.0, 1.2, 2.4, 4.2, 5.4
TUN_CEIL = 3.2
LOW_COVER = 1.15  # hides a crouched player, cannot be jumped onto (jump apex 0.89 m)
HEAD = 2.2  # standing cover
RISER = 0.3
RAMP_RISER = 0.15

# ------------------------------------------------------------------ regions (x0, x1, z0, z1, floor)
# Later entries win where they overlap.
REGIONS = [
    # --- Police side (lowland 1.2)
    ("ct-spawn", -8, 10, -45, -35, LOW),
    ("rail-yard", -33, -8, -45, -40, LOW),  # Police → A (ground) and the control room
    ("a-gate", -33, -28, -40, -36, LOW),  # Police ground entrance onto A
    ("control-room", -22, -16, -40, -33, LOW),  # stairs up to the catwalk (Police elevation retake)
    ("market-street", 10, 22, -43, -38, LOW),  # Police → B
    ("market-hall", 22, 40, -46, -38.4, MKT),  # Police building on B: window + door onto the site
    ("b-gate-steps", 18.5, 21.5, -40, -38.4, LOW),  # second Police entrance onto B (steps up)
    ("ct-mid", -2, 8, -35, -7, LOW),
    # --- A: the Foundry courtyard, the shipping hall (A main) and its yards
    ("a-court", -40, -22, -36, -11, LOW),
    ("shipping-hall", -40, -27, -11, 6, LOW),
    ("lower-yard", -38, -26, 6, 18, LOW),
    ("loading-ramp", -36, -30, 18, 30, LOW),  # 0.15 m risers 1.2 → 5.4 (the visual ramp sits on them)
    # --- mid
    ("lower-mid", -10, 10, -7, 10, LOW),
    ("t-mid-steps", -9, -4, 10, 14.2, LOW),  # 14 risers 1.2 → 5.4
    ("boiler-house", -22, -12, -24, -6, LOW),  # mid → A connector (interior)
    ("annex", -21, -10, -6, 2, LOW),
    ("tunnel-pocket", 10, 16, 2, 9.8, LOW),  # where the tunnel comes up
    ("arcade", 10, 22, -6, -2, LOW),  # mid → B connector (covered colonnade)
    ("arcade-north", 18, 22, -12.4, -2, LOW),
    # --- B: the Old Market
    ("b-court", 18, 44, -38.4, -10, MKT),
    ("b-arch", 34, 40, -12, -6, MKT),
    ("lower-alley", 34, 39, -6, 7, MKT),
    ("alley-bend", 34, 44, 7, 11, MKT),
    ("upper-alley", 40, 44, 11, 18, MKT),
    ("market-lane", 40, 44, 18, 30, MKT),  # stepped lane 2.4 → 5.4 (0.15 m risers)
    ("apt-ground", 22, 32, -10, 6, MKT),  # apartments, ground floor (B side)
    ("apt-upper-south", 22, 32, 6, 14, UP),  # apartments, upper floor entry (upper-town grade)
    # --- upper town (5.4)
    ("high-street", -36, -8, 30, 36, UP),
    ("tunnel-stairs", -16, -13, 24.6, 30, TUN),  # 18 risers 5.4 → 0 (open stairwell, then the mouth)
    ("t-mid-plaza", -10, 1, 14.2, 36.5, UP),
    ("t-spawn", -8, 14, 36.5, 45, UP),
    ("upper-lane", 14, 44, 30, 39.5, UP),
    ("apt-street", 22, 26, 14, 30, UP),
]
# Service tunnel (floor 0, ceiling TUN_CEIL): stairs bottom → corridor north → long east run with a
# jog (pump room alcove at the jog) → north leg → four risers up into the tunnel pocket.
TUNNELS = [
    ("tun-mouth", -16, -13, 18, 24.5),  # under the stairwell's lower half
    ("tun-west", -16, 3, 18, 21),
    ("tun-pump-room", -3, 2, 21, 24),  # maintenance alcove (south side, at the jog)
    ("tun-jog", 1, 3, 15, 21),
    ("tun-east", 1, 15, 15, 18),
    ("tun-north", 12, 15, 9.8, 18),
]


def region_at(x, z):
    hit = None
    for r in REGIONS:
        _, x0, x1, z0, z1, y = r
        if x0 <= x < x1 and z0 <= z < z1:
            hit = r
    return hit


def tunnel_at(x, z):
    return any(x0 <= x < x1 and z0 <= z < z1 for _, x0, x1, z0, z1 in TUNNELS)


solids = []  # boxes: movement + bullets
structures = []  # bullets / sight / grenades only (roofs, lintels above reach)
barriers = []  # movement only (railings: bullets and sight pass)


def box(id, x0, x1, z0, z1, y0, y1, surface, kind, layer=None):
    s = {
        "id": id, "x": round((x0 + x1) / 2, 4), "y": round((y0 + y1) / 2, 4), "z": round((z0 + z1) / 2, 4),
        "w": round(x1 - x0, 4), "h": round(y1 - y0, 4), "d": round(z1 - z0, 4),
        "surface": surface, "kind": kind,
    }
    assert s["w"] > 0 and s["h"] > 0 and s["d"] > 0, id
    (layer if layer is not None else solids).append(s)
    return s


# ------------------------------------------------------------------ grid → fill, tunnels, blocks
nx, nz = int(W / CELL), int(D / CELL)
cells = {}
for i in range(nx):
    for j in range(nz):
        x, z = -HX + (i + 0.5) * CELL, -HZ + (j + 0.5) * CELL
        r = region_at(x, z)
        t = tunnel_at(x, z)
        if r is None:
            key = ("tunnel-ceiling", TUN_CEIL, BLOCK_TOP) if t else ("block", 0, BLOCK_TOP)
        elif t:
            key = ("tunnel-ceiling", TUN_CEIL, r[5] if r[5] > TUN_CEIL else UP)
        elif r[5] > 0:
            key = ("fill", 0, r[5])
        else:
            key = None
        if key:
            cells[(i, j)] = key


def merge(cells):
    """Greedy rectangles over equal keys: lowest row first, grow along x, then along z."""
    out = []
    left = dict(cells)
    for j in range(nz):
        for i in range(nx):
            k = left.get((i, j))
            if k is None:
                continue
            i1 = i
            while left.get((i1 + 1, j)) == k:
                i1 += 1
            j1 = j
            while all(left.get((a, j1 + 1)) == k for a in range(i, i1 + 1)):
                j1 += 1
            for a in range(i, i1 + 1):
                for b in range(j, j1 + 1):
                    del left[(a, b)]
            out.append((k, -HX + i * CELL, -HX + (i1 + 1) * CELL, -HZ + j * CELL, -HZ + (j1 + 1) * CELL))
    return out


counts = {}
for (kind, y0, y1), x0, x1, z0, z1 in merge(cells):
    counts[kind] = counts.get(kind, 0) + 1
    surface = "concrete"
    box(f"{kind}-{counts[kind]}", x0, x1, z0, z1, y0, y1, surface,
        {"block": "building", "fill": "ground", "tunnel-ceiling": "tunnel-ceiling"}[kind])


# ------------------------------------------------------------------ helpers
def stairs(id, x0, x1, z0, z1, base, top, axis, rising, riser=RISER, surface="concrete", kind="stair"):
    """Risers from `base` up to `top` filling the whole run along axis "x"/"z", rising toward
    +1/-1. The last riser is one below `top`: the landing (the region or slab at `top`) is the top
    step, so the run ends flush against it."""
    k = int(round((top - base) / riser)) - 1
    span = (x1 - x0) if axis == "x" else (z1 - z0)
    d = span / k
    lo, hi = (x0, x1) if axis == "x" else (z0, z1)
    for n in range(1, k + 1):
        a0, a1 = (lo + (n - 1) * d, lo + n * d) if rising > 0 else (hi - n * d, hi - (n - 1) * d)
        y1 = round(base + riser * n, 4)
        if axis == "x":
            box(f"{id}-{n}", a0, a1, z0, z1, base, y1, surface, kind)
        else:
            box(f"{id}-{n}", x0, x1, a0, a1, base, y1, surface, kind)
    return k


def wall(id, x0, x1, z0, z1, base, openings=(), top=BLOCK_TOP, surface="concrete", kind="wall"):
    """A wall along x (thin in z) or along z (thin in x) from `base` to `top`, with openings
    (a0, a1, y0, y1) along its length: doors (y0 = base) and windows (sill above base); openings may
    stack (a door above a door). Pieces: the wall between the openings' edges, cut into the solid
    height bands each stretch leaves (piers, sills, lintels, the wall between storeys)."""
    along_x = (x1 - x0) >= (z1 - z0)
    lo, hi = (x0, x1) if along_x else (z0, z1)
    cuts = sorted({lo, hi, *[a for o in openings for a in o[:2] if lo < a < hi]})
    n = 0
    for a0, a1 in zip(cuts, cuts[1:]):
        mid = (a0 + a1) / 2
        gaps = sorted((y0, y1) for o0, o1, y0, y1 in openings if o0 <= mid <= o1)
        y = base
        bands = []
        for y0, y1 in gaps:
            if y0 > y + 1e-6:
                bands.append((y, y0))
            y = max(y, y1)
        if top > y + 1e-6:
            bands.append((y, top))
        for b0, b1 in bands:
            n += 1
            box(f"{id}-{n}", *((a0, a1, z0, z1) if along_x else (x0, x1, a0, a1)), b0, b1, surface, kind)


def slab(id, x0, x1, z0, z1, top, thick=0.4, holes=(), surface="concrete", kind="slab"):
    """A floor slab ending at `top`, minus rectangular holes (split into rectangles)."""
    rects = [(x0, x1, z0, z1)]
    for hx0, hx1, hz0, hz1 in holes:
        nxt = []
        for a0, a1, b0, b1 in rects:
            if hx1 <= a0 or hx0 >= a1 or hz1 <= b0 or hz0 >= b1:
                nxt.append((a0, a1, b0, b1))
                continue
            if b0 < hz0: nxt.append((a0, a1, b0, hz0))
            if hz1 < b1: nxt.append((a0, a1, hz1, b1))
            c0, c1 = max(b0, hz0), min(b1, hz1)
            if a0 < hx0: nxt.append((a0, hx0, c0, c1))
            if hx1 < a1: nxt.append((hx1, a1, c0, c1))
        rects = nxt
    for n, (a0, a1, b0, b1) in enumerate(rects, 1):
        box(f"{id}-{n}", a0, a1, b0, b1, top - thick, top, surface, kind)


def railing(id, x0, x1, z0, z1, base, h=1.05):
    box(id, x0, x1, z0, z1, base, base + h, "metal", "railing", barriers)


VEHICLES = {}


def vehicle(id, x0, x1, z0, z1, base, h, model, parts, kind="vehicle", yaw=0.0):
    """Several boxes measured on the placed model (fractions x, y, z of the placement rectangle,
    model nose at z0), so no invisible wall stands around a rounded vehicle."""
    VEHICLES[id] = {"x0": x0, "x1": x1, "z0": z0, "z1": z1, "base": base, "h": h, "model": model, "yaw": yaw}
    for name, a0, a1, b0, b1, c0, c1 in parts:
        box(f"{id}-{name}", x0 + (x1 - x0) * a0, x0 + (x1 - x0) * a1, z0 + (z1 - z0) * c0, z0 + (z1 - z0) * c1,
            base + h * b0, base + h * b1, "metal", kind)


# Box fractions (x0, x1, y0, y1, z0, z1) with the vehicle's nose at z0; refined on the models in
# build_iron_district.py's measurement pass.
FORKLIFT = (("load", 0.06, 0.94, 0, 0.62, 0.0, 0.3),  # forks, pallet and a crate load
            ("front", 0.06, 0.94, 0, 0.36, 0.3, 0.52), ("core", 0.22, 0.78, 0, 0.36, 0.52, 0.8),
            ("rear", 0.08, 0.92, 0, 0.42, 0.8, 1.0), ("cab", 0.2, 0.8, 0.36, 0.92, 0.32, 0.86),
            ("roof", 0.16, 0.84, 0.92, 1.0, 0.3, 0.86))
TRUCK = (("chassis", 0.04, 0.96, 0.0, 0.42, 0.02, 0.98), ("cab", 0.06, 0.94, 0.42, 1.0, 0.02, 0.3),
         ("bed", 0.04, 0.96, 0.42, 0.62, 0.3, 0.98))
VAN = (("body", 0.03, 0.97, 0.0, 0.92, 0.12, 1.0), ("bonnet", 0.05, 0.95, 0.0, 0.6, 0.0, 0.12))

# ------------------------------------------------------------------ Police side
# Rail-yard screen walls: the spawn's west exit is staggered so the A gate never sees spawn.
box("ct-spawn-screen", -2, 2, -38.5, -37.5, LOW, LOW + HEAD, "concrete", "blast-wall")
box("ct-guard-booth", 6, 8, -42.8, -38.2, LOW, LOW + 2.6, "wood", "booth")
box("ct-west-pier", -9, -8, -40, -37, LOW, BLOCK_TOP, "concrete", "building")
box("rail-buffer", -27, -25.5, -44.6, -43.4, LOW, LOW + LOW_COVER, "metal", "buffer")
box("rail-wagon", -20, -12, -44.8, -42.2, LOW, LOW + 2.6, "metal", "wagon")  # derelict ore wagon

# Control room: Police stairs to the catwalk (10 risers, 3 m), landing slab at 4.2 joining the
# catwalk through the room's west door, ground door onto the rail yard.
CR = (-22, -16, -40, -33)
wall("cr-north", -22, -16, -40.4, -40, LOW, openings=[(-21.6, -20.0, LOW, LOW + 2.4)], kind="building")
wall("cr-east", -16.4, -16, -40, -33, LOW, kind="building")
wall("cr-south", -22, -16, -33.4, -33, LOW, kind="building")
wall("cr-west", -22.4, -22, -40, -33.4, LOW, openings=[(-36.0, -33.6, WALK, WALK + 2.3)], kind="building")
stairs("cr-stairs", -19.4, -16.4, -39.2, -36.6, LOW, WALK, "z", 1)
slab("cr-landing", -22, -16.4, -36.6, -33.4, WALK, thick=0.2)

# ------------------------------------------------------------------ A: THE FOUNDRY
# Courtyard x -40..-22, z -36..-11 at 1.2. West: the foundry's main building with a loading dock at
# 2.4 along its face. North: the catwalk at 4.2 from the control room to stairs down onto the dock.
# Centre: the ladle furnace (full height) splitting the site, the press, a container, the forklift
# with its load, a crate stack; south: a raised casting pad (one riser) where the exposed plant is.
box("a-dock", -40, -36.5, -33.6, -20, LOW, MKT, "concrete", "dock")
stairs("a-dock-s", -40, -36.5, -20, -18.8, LOW, MKT, "z", -1)  # down toward the hall doors
stairs("a-dock-e", -36.5, -35.3, -26, -23, LOW, MKT, "x", -1)  # side steps from the courtyard
slab("a-catwalk", -40, -22, -36, -33.6, WALK, thick=0.2, kind="catwalk")
stairs("a-catwalk-stairs", -40, -38.2, -33.6, -31.8, MKT, WALK, "z", -1, surface="metal")
railing("a-catwalk-rail-s", -38.2, -22, -33.8, -33.6, WALK)  # open rails: bullets pass
railing("a-catwalk-rail-w", -40, -39.8, -33.6, -31.8, MKT + 0.6)
for n, x in enumerate((-36.5, -31.0, -25.5), 1):  # catwalk posts (full-height steel, thin)
    box(f"a-catwalk-post-{n}", x - 0.15, x + 0.15, -33.75, -33.45, LOW, WALK - 0.2, "metal", "post")
box("a-ladle", -33.5, -29.5, -30, -26, LOW, LOW + 3.6, "metal", "furnace")  # the landmark
box("a-ladle-skirt", -34.3, -33.5, -29.2, -26.8, LOW, LOW + LOW_COVER, "metal", "furnace")
box("a-press", -27.5, -24.5, -22.5, -19.5, LOW, LOW + 2.6, "metal", "machine")
box("a-container", -26, -23.5, -35.4, -30, LOW, LOW + 2.6, "metal", "container")
box("a-crates", -36, -34, -16.5, -14.5, LOW, LOW + HEAD, "wood", "crate-stack")
box("a-crate", -34, -33, -15.6, -14.6, LOW, LOW + LOW_COVER, "wood", "crate")
stairs("a-pad-n", -31, -25, -17.6, -17.3, LOW, LOW + 0.6, "z", 1)  # one riser onto the pad
box("a-pad", -31, -25, -17.3, -12.8, LOW, LOW + 0.3, "concrete", "pad")
vehicle("a-forklift", -27.8, -26.4, -28, -25.4, LOW, 2.1, "forklift", FORKLIFT, kind="forklift")
box("a-generator", -24.4, -22.6, -15.6, -13.6, LOW, LOW + 1.25, "metal", "generator")
# Partial roof over the dock and the west strip (bullets, sight and grenades stop on it).
box("a-roof-west", -40, -34, -36, -18, 9.0, 9.4, "metal", "roof", structures)
box("a-roof-beam-1", -40, -22, -28.2, -27.8, 8.6, 9.0, "metal", "beam", structures)
box("a-roof-beam-2", -40, -22, -20.2, -19.8, 8.6, 9.0, "metal", "beam", structures)

# Shipping hall (A main): north wall with the big sliding door (5 m) and a personnel door (1.4 m),
# south door from the lower yard, machinery inside, roof.
wall("hall-north", -40, -27, -11, -10.6, LOW,
     openings=[(-38, -33, LOW, LOW + 4.2), (-30, -28.6, LOW, LOW + 2.4)], kind="building")
box("hall-door-leaf", -33, -31, -10.5, -10.2, LOW, LOW + 4.2, "metal", "door")  # half-open slider
wall("hall-south", -40, -27, 5.6, 6, LOW, openings=[(-38.6, -34.6, LOW, LOW + 3.6)], kind="building")
wall("hall-east", -27.4, -27, -10.6, 5.6, LOW, kind="building")
box("hall-lathe", -39.4, -37.2, -6, -3, LOW, LOW + 1.8, "metal", "machine")
# Pallet racking down the middle of the hall: two lanes to the doors, never one lane from the ramp.
box("hall-rack", -35.4, -31.4, -1.2, 0.0, LOW, LOW + 3.2, "metal", "racking")
box("hall-crates", -30.5, -28.5, 0, 2, LOW, LOW + LOW_COVER, "wood", "crate")
box("hall-shelf", -39.6, -38.4, -8, 3, LOW, LOW + 2.6, "metal", "shelving")
box("hall-roof", -40, -27, -10.6, 5.6, 8.0, 8.4, "metal", "roof", structures)
# Lower yard and the loading ramp (28 risers of 0.15 m over 12 m: the visual ramp is one slope).
vehicle("yard-truck", -37.2, -34.8, 8.5, 14.5, LOW, 2.5, "truck", TRUCK)
box("yard-barrier", -30, -28, 11.5, 12.3, LOW, LOW + LOW_COVER, "concrete", "jersey")
stairs("loading-ramp", -36, -30, 18, 30, LOW, UP, "z", 1, riser=RAMP_RISER, kind="ramp")

# ------------------------------------------------------------------ mid
# Lower mid: the gantry crane's four legs (full height), the abandoned truck, a jersey barrier.
# The mid gate (z -7..-6): a 4 m doorway offset east so Police spawn never sees the T mid steps.
wall("mid-gate", -10, 10, -7, -6, LOW, openings=[(3, 7, LOW, LOW + 3.4)], kind="gate")
box("mid-gate-leaf", 7, 7.3, -6, -4.4, LOW, LOW + 3.4, "wood", "door")  # door swung open
for n, (x, z) in enumerate(((-8.6, -1.6), (8.6, -1.6), (-8.6, 7.4), (8.6, 7.4)), 1):
    box(f"mid-crane-leg-{n}", x - 0.5, x + 0.5, z - 0.5, z + 0.5, LOW, BLOCK_TOP, "metal", "crane")
box("mid-crane-beam", -9.6, 9.6, 2.4, 3.4, 8.6, 9.6, "metal", "crane", structures)
vehicle("mid-truck", -6.5, -4.1, -1.0, 5.0, LOW, 2.5, "truck", TRUCK)
box("mid-barrier", 1.5, 4.5, 2.8, 3.6, LOW, LOW + LOW_COVER, "concrete", "jersey")
box("mid-kiosk", -0.2, 2.0, -4.6, -2.8, LOW, LOW + HEAD, "wood", "kiosk")
stairs("t-mid-steps", -9, -4, 10, 14.2, LOW, UP, "z", 1)
railing("t-mid-steps-rail-e", -4.0, -3.8, 10, 14.2, LOW + 0.6, h=1.0)
# Boiler house + annex (mid → A): door from lower mid (west wall of lower mid at x -10), door onto A
# at the boiler house's west wall; boilers inside.
wall("annex-mid-wall", -10.4, -10, -6, 2, LOW, openings=[(-4.6, -1.4, LOW, LOW + 2.8)], kind="building")
wall("boiler-west", -22, -21, -24, -6, LOW, openings=[(-21.2, -18.6, LOW, LOW + 2.8)], kind="building")
box("boiler-1", -20.2, -17.8, -15, -11.4, LOW, LOW + 3.0, "metal", "boiler")
box("boiler-2", -15.4, -13, -21, -17.4, LOW, LOW + 3.0, "metal", "boiler")
box("annex-bench", -16, -13, -1, 0.2, LOW, LOW + 1.0, "metal", "bench")
box("annex-roof", -21, -10, -6, 2, 5.6, 6.0, "concrete", "roof", structures)
box("boiler-roof", -21, -12, -24, -6, 6.6, 7.0, "concrete", "roof", structures)
# Arcade (mid → B): a colonnade with a roof; four risers up into the market at its north end.
for n, x in enumerate((12.5, 15.5), 1):
    box(f"arcade-column-{n}", x - 0.3, x + 0.3, -6, -5.4, LOW, BLOCK_TOP, "concrete", "column")
box("arcade-roof", 10, 22, -6, -2, 4.8, 5.2, "concrete", "roof", structures)
box("arcade-crates", 13.6, 15.2, -3.4, -2.2, LOW, LOW + LOW_COVER, "wood", "crate")
stairs("arcade-steps", 18, 22, -10, -8.8, LOW, MKT, "z", -1)
# Tunnel pocket: four risers up out of the tunnel, a railing round the pit.
stairs("tun-exit", 12, 15, 9.8, 11.0, TUN, LOW, "z", -1)

# ------------------------------------------------------------------ B: THE OLD MARKET
# Courtyard x 20..44, z -38.4..-12 at 2.4. The fountain is the landmark (low basin, tall column),
# three market stalls, an old stone wall, the covered loading bay on the east with the van and a
# crate stack, a one-riser fountain terrace. North: the Police market hall (window + door onto the
# site). South: the apartments (ground door under the balcony, balcony with stairs down).
box("b-fountain-terrace", 27, 35, -29, -21, MKT, MKT + RISER, "concrete", "terrace")
box("b-fountain", 29.4, 32.6, -26.6, -23.4, MKT + RISER, MKT + RISER + 0.95, "concrete", "fountain")
box("b-fountain-column", 30.6, 31.4, -25.4, -24.6, MKT + RISER, MKT + 4.2, "concrete", "fountain")
box("b-stall-1", 23.5, 26.5, -22.2, -21.0, MKT, MKT + 1.1, "wood", "stall")
box("b-stall-2", 36.5, 39.5, -31.2, -30.0, MKT, MKT + 1.1, "wood", "stall")
box("b-stall-3", 23.5, 26.0, -33.6, -32.4, MKT, MKT + 1.1, "wood", "stall")
box("b-stone-wall", 34.5, 38.5, -16.8, -16.0, MKT, MKT + LOW_COVER, "concrete", "stone-wall")
box("b-crates", 41.4, 43.4, -33.4, -31.0, MKT, MKT + HEAD, "wood", "crate-stack")
vehicle("b-van", 41.2, 43.6, -27.6, -22.4, MKT, 2.3, "van", VAN)
box("b-bay-roof", 40, 44, -38.4, -18, 6.6, 7.0, "metal", "roof", structures)
for n, z in enumerate((-30.0, -21.0), 1):
    box(f"b-bay-column-{n}", 39.8, 40.2, z - 0.2, z + 0.2, MKT, 6.6, "metal", "post")
box("b-arch-lintel", 34, 40, -12, -6, 6.2, BLOCK_TOP, "concrete", "arch", structures)
# Market hall (Police): floor 2.4 (steps up from the street at its west door), counters inside, a
# window and a door in the south wall onto the site, a second Police entrance at the B gate.
stairs("mh-steps", 20.5, 22, -42.6, -40.6, LOW, MKT, "x", 1)
wall("mh-west", 22, 22.4, -46, -38.4, MKT, openings=[(-42.6, -40.6, MKT, MKT + 2.6)], kind="building")
wall("mh-south", 22, 40, -38.8, -38.4, MKT,
     openings=[(25, 28, MKT + 1.0, MKT + 2.3), (31, 33, MKT, MKT + 2.6)], kind="building")
box("mh-counter", 26, 30, -43.4, -42.4, MKT, MKT + 1.05, "wood", "counter")
box("mh-crates", 35, 37, -45.6, -43.6, MKT, MKT + LOW_COVER, "wood", "crate")
box("mh-roof", 22, 40, -46, -38.4, 6.6, 7.0, "concrete", "roof", structures)
stairs("b-gate-steps", 18.5, 21.5, -40, -38.4, LOW, MKT, "z", 1)

# Apartments: ground floor (2.4) x 22..32, z -10..6; upper floor (5.4) over all of it plus the south
# part at grade with the apartment street; internal stair (10 risers) under a hole in the slab;
# balcony at 5.4 over the courtyard with stairs down its east end.
AX0, AX1 = 22, 32
wall("apt-north", AX0, AX1, -10, -9.6, MKT,
     openings=[(23.2, 25.0, MKT, MKT + 2.3), (23.2, 25.0, UP, UP + 2.3), (28.0, 30.0, UP + 0.95, UP + 2.2)],
     kind="building")
wall("apt-west", AX0, AX0 + 0.4, -9.6, 13.6, MKT, kind="building")
wall("apt-east", AX1 - 0.4, AX1, -9.6, 13.6, MKT, kind="building")
wall("apt-south", AX0, AX1, 13.6, 14, UP, openings=[(23.0, 25.4, UP, UP + 2.4)], kind="building")
slab("apt-floor", AX0 + 0.4, AX1 - 0.4, -9.6, 6, UP, holes=[(28.4, 31.6, -0.2, 3.0)])
stairs("apt-stairs", 28.6, 31.6, 0, 3.0, MKT, UP, "z", 1, surface="wood")
# Ground floor: a partition with a doorway, so the door to the courtyard is not a straight lane
# from the stairs.
wall("apt-ground-partition", AX0 + 0.4, AX1 - 0.4, -3.2, -2.9, MKT, top=UP - 0.4,
     openings=[(26.2, 27.8, MKT, MKT + 2.3)], kind="interior")
box("apt-ground-table", 23.4, 25.4, 1.0, 2.2, MKT, MKT + 0.8, "wood", "furniture")
# Upper floor: corridor partition (rooms east), the stair hole railing, wardrobe cover.
wall("apt-upper-partition", 26.0, 26.3, -6.0, 6.0, UP, top=UP + 3.0,
     openings=[(-4.6, -3.2, UP, UP + 2.2)], kind="interior")
# Cross wall between the entry hall and the rooms: its door is offset east, so the street never
# looks down the corridor to the balcony door (a zig-zag through the flat).
wall("apt-upper-cross", AX0 + 0.4, AX1 - 0.4, 6.0, 6.3, UP, top=UP + 3.0,
     openings=[(27.0, 28.6, UP, UP + 2.2)], kind="interior")
railing("apt-hole-rail", 28.2, 28.4, -0.2, 3.0, UP)
box("apt-wardrobe", 22.4, 23.2, 7.0, 9.0, UP, UP + 2.0, "wood", "furniture")
box("apt-roof", AX0, AX1, -10, 14, 8.6, 9.0, "concrete", "roof")
# Balcony: slab, rails (open), stairs down at the east end (10 risers heading north).
slab("apt-balcony", AX0, 33.6, -13.6, -10, UP, thick=0.35, kind="balcony")
railing("apt-balcony-rail-n", AX0, 32.2, -13.6, -13.4, UP)
railing("apt-balcony-rail-w", AX0, AX0 + 0.2, -13.4, -10, UP)
stairs("apt-balcony-stairs", 32.2, 33.6, -16.6, -13.6, MKT, UP, "z", 1, surface="metal")
box("apt-balcony-planter", 27.0, 28.4, -13.4, -12.8, UP, UP + 0.7, "concrete", "planter")
# Stepped market lane: 20 risers of 0.15 m from the lower alley (2.4) up to the upper lane (5.4).
stairs("market-lane", 40, 44, 18, 30, MKT, UP, "z", 1, riser=RAMP_RISER, kind="ramp")
box("lower-alley-cart", 41.6, 43.4, 13, 15.6, MKT, MKT + LOW_COVER, "wood", "cart")
box("lower-alley-bins", 34.4, 35.6, -2, 0.4, MKT, MKT + 1.2, "metal", "bins")

# ------------------------------------------------------------------ upper town (Terrorist side)
box("t-spawn-fountain", 2, 4, 39.5, 41.5, UP, UP + 0.8, "concrete", "trough")
box("t-spawn-pier", 0.4, 1.6, 35.0, 37.6, UP, UP + 3.4, "concrete", "pier")
box("t-spawn-screen", -7, -3, 33.2, 34.0, UP, UP + HEAD, "concrete", "wall")
box("high-street-car", -26, -22, 30.4, 32.2, UP, UP + 1.5, "metal", "car")
box("upper-lane-crates", 30, 32, 30.4, 32, UP, UP + LOW_COVER, "wood", "crate")
# Tunnel stairwell: 18 risers 5.4 → 0 heading north (z 30 → 24.6); the stairwell is open above to
# z 26 and the tunnel mouth (ceiling 3.2) begins there. A rail round the open top.
stairs("tun-stairs", -16, -13, 24.6, 30, TUN, UP, "z", 1)

# The tunnel mouth needs headroom over the steps that rise above 1.4 m: the ceiling over the stairs
# starts at z 26 (feet 1.4, head 3.2).
# Tunnel dressing that collides: the pump in the alcove, pipe runs low on the east leg.
box("tun-pump", 0.2, 1.8, 22.4, 23.6, TUN, 1.1, "metal", "pump")
box("tun-pipe-1", 4, 14, 17.4, 18, TUN, 0.6, "metal", "pipe")

# ------------------------------------------------------------------ perimeter, sites, spawns, callouts
walls = [
    {"id": "wall-west", "x": -HX - 0.4, "y": 8, "z": 0, "w": 0.8, "h": 16, "d": D + 1.6, "surface": "concrete"},
    {"id": "wall-east", "x": HX + 0.4, "y": 8, "z": 0, "w": 0.8, "h": 16, "d": D + 1.6, "surface": "concrete"},
    {"id": "wall-north", "x": 0, "y": 8, "z": -HZ - 0.4, "w": W, "h": 16, "d": 0.8, "surface": "concrete"},
    {"id": "wall-south", "x": 0, "y": 8, "z": HZ + 0.4, "w": W, "h": 16, "d": 0.8, "surface": "concrete"},
]
# Plant zones: feet inside the rectangle and between y0 and y1 (A: courtyard, pad and dock, never
# the catwalk; B: courtyard and terrace, never the balcony).
BOMBSITES = {
    "A": {"x0": -39.5, "x1": -22.5, "z0": -33.4, "z1": -13.0, "y0": 1.0, "y1": 2.6},
    "B": {"x0": 22.5, "x1": 40.0, "z0": -36.0, "z1": -15.5, "y0": 2.2, "y1": 3.0},
}
POLICE_SPAWNS = [{"x": x, "y": LOW, "z": -41.5, "yaw": 3.1416} for x in (-5.2, -2.6, 0.0, 2.6, 5.2)]
TERRORIST_SPAWNS = [{"x": x, "y": UP, "z": 42.0, "yaw": 0.0} for x in (-5.2, -2.6, 0.0, 2.6, 5.2)]
CALLOUTS = [
    ("CT Spawn", 1, -41, LOW), ("Rail Yard", -20, -42.5, LOW), ("A Gate", -30.5, -38, LOW),
    ("Control Room", -19, -36.5, LOW), ("Catwalk", -31, -34.8, WALK), ("Dock", -38.2, -26, MKT),
    ("Ladle", -31.5, -28, LOW), ("Press", -26, -21, LOW), ("Pad", -28, -15, LOW + 0.3),
    ("A Doors", -35.5, -11, LOW), ("Shipping Hall", -33.5, -3, LOW), ("Lower Yard", -32, 12, LOW),
    ("Loading Ramp", -33, 24, 3.3), ("High Street", -22, 33, UP), ("Boiler House", -16.5, -15, LOW),
    ("Annex", -15.5, -2, LOW), ("Lower Mid", 0, 2, LOW), ("Mid Gate", 4, -6.5, LOW), ("CT Mid", 3, -20, LOW),
    ("T Mid Steps", -6.5, 12, 3.3), ("T Plaza", -4.5, 24, UP), ("Tunnel", -8, 19.5, TUN), ("Pump Room", -0.5, 22.5, TUN),
    ("Tunnel Exit", 13, 7, LOW), ("Arcade", 15, -4, LOW), ("T Spawn", 0, 41, UP), ("Upper Lane", 26, 34, UP),
    ("Apartments", 27, 2, UP), ("Balcony", 27, -11.8, UP), ("Fountain", 31, -25, MKT), ("Stalls", 25, -27, MKT),
    ("Loading Bay", 42, -28, MKT), ("Market Hall", 31, -42, MKT), ("B Gate", 20, -39.2, LOW),
    ("Arch", 37, -9, MKT), ("Lower Alley", 37, 2, MKT), ("Market Lane", 42, 24, 3.9),
]

if __name__ == "__main__":
    ids = [s["id"] for s in solids + structures + barriers]
    dup = {i for i in ids if ids.count(i) > 1}
    assert not dup, f"duplicate ids {dup}"
    os.makedirs(os.path.join(HERE, "build"), exist_ok=True)
    with open(os.path.join(HERE, "build", "layout.json"), "w") as f:
        json.dump({"arena": {"width": W, "depth": D}, "levels": {"tunnel": TUN, "low": LOW, "market": MKT,
                   "walk": WALK, "up": UP}, "solids": solids, "structures": structures, "barriers": barriers,
                   "walls": walls, "regions": REGIONS, "tunnels": TUNNELS, "bombsites": BOMBSITES,
                   "vehicles": VEHICLES, "callouts": CALLOUTS,
                   "spawns": {"police": POLICE_SPAWNS, "terrorist": TERRORIST_SPAWNS}}, f, indent=1)
    row = lambda s: (f'  {{ id: "{s["id"]}", x: {s["x"]}, y: {s["y"]}, z: {s["z"]}, w: {s["w"]}, h: {s["h"]}, '
                     f'd: {s["d"]}, surface: "{s["surface"]}" }},')
    spawn = lambda p: f'    {{ x: {p["x"]}, y: {p["y"]}, z: {p["z"]}, yaw: {p["yaw"]} }},'
    site = lambda k, v: (f'  {k}: {{ x0: {v["x0"]}, x1: {v["x1"]}, z0: {v["z0"]}, z1: {v["z1"]}, '
                         f'y0: {v["y0"]}, y1: {v["y1"]} }},')
    ts = [
        "// Generated by art/blender/iron-district/layout.py — edit the layout there, then re-run it.",
        "// IRON DISTRICT 5v5 bomb-defusal map: gameplay solids (metres, box centres + full sizes).",
        'import type { Solid } from "./map";',
        "",
        f"export const IRON_DISTRICT_SIZE = {{ width: {W}, depth: {D} }} as const;",
        "/** Block movement and bullets (terrain fill, buildings, walls, slabs, stairs, cover). */",
        "export const IRON_DISTRICT_BOXES: Solid[] = [", *[row(s) for s in solids], "];",
        "/** Bullets, sight and grenades only: roofs, lintels and beams above every reach. */",
        "export const IRON_DISTRICT_STRUCTURES: Solid[] = [", *[row(s) for s in structures], "];",
        "/** Movement only: open railings (bullets and sight pass between the rails). */",
        "export const IRON_DISTRICT_BARRIERS: Solid[] = [", *[row(s) for s in barriers], "];",
        "/** Perimeter: bullets only. */",
        "export const IRON_DISTRICT_WALLS: Solid[] = [", *[row(s) for s in walls], "];",
        "/** Plant zones: feet inside the rectangle, with the feet height between y0 and y1. */",
        "export const IRON_DISTRICT_BOMBSITES = {", *[site(k, v) for k, v in BOMBSITES.items()], "} as const;",
        "/** Five spawns per team (feet height y); Police north, Terrorists south (swap at halftime). */",
        "export const IRON_DISTRICT_TEAM_SPAWNS = {",
        "  police: [", *[spawn(p) for p in POLICE_SPAWNS], "  ],",
        "  terrorist: [", *[spawn(p) for p in TERRORIST_SPAWNS], "  ],",
        "} as const;",
        "/** Walkable floors for the minimap: x0, x1, z0, z1, floor height (the tunnel at 0). */",
        "export const IRON_DISTRICT_FLOORS: ReadonlyArray<readonly [number, number, number, number, number]> = [",
        *[f"  [{x0}, {x1}, {z0}, {z1}, {y}]," for _, x0, x1, z0, z1, y in REGIONS],
        *[f"  [{x0}, {x1}, {z0}, {z1}, 0]," for _, x0, x1, z0, z1 in TUNNELS],
        "];",
        "/** Named places (minimap labels, docs): name, x, z, feet height. */",
        "export const IRON_DISTRICT_CALLOUTS: ReadonlyArray<readonly [string, number, number, number]> = [",
        *[f'  ["{n}", {x}, {z}, {y}],' for n, x, z, y in CALLOUTS],
        "];",
        "",
    ]
    with open(os.path.join(ROOT, "src/lib/fps/iron-district-layout.ts"), "w") as f:
        f.write("\n".join(ts))
    print(f"{len(solids)} boxes {counts}, {len(structures)} structures, {len(barriers)} barriers")
