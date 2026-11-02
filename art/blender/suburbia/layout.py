"""
SUBURBAN SHOWDOWN (1v1 aim arena, a Nuketown-style cul-de-sac): the single source of truth for
its gameplay solids.

  python3 art/blender/suburbia/layout.py   # writes src/lib/fps/suburbia-layout.ts + build/layout.json

Conventions as the other maps: metres, feet at y = 0; x runs along the 64 m axis (spawn A west,
spawn B east), z along the 46 m axis (north = -z). Every gameplay solid is an axis-aligned box.

Balance by mirror symmetry across the street (x = 0): every solid at x has an identical twin at
-x, so both spawns get the same cover, routes and timings while the two houses are dressed
differently (A: white clapboard with violet trim; B: charcoal with violet accents). Solids on the
centre line (bus, truck body, tower, barricade) are their own mirror; the truck's cab is the one
unmirrored piece (bounded by the layout test).

Layers:
  "box"     blocks movement and bullets (BOXES); tops are walkable (upper floors, balconies)
  "bullet"  bullets only (STRUCTURES): roofs and gables, garage roofs, out of reach

Areas (A side; B is the mirror twin)
  Backyard / spawn   x -32..-25: lawn, patio, garden wall shielding the back door.
  House              x -25..-13, z -6..6: two floors (upper floor at 3 m), front door and big
                     windows toward the street, back door, stairs along the north wall, an upper
                     floor with street and side-yard windows and a door onto the porch balcony.
  Garage             x -24..-15.5, z -12..-6: open door to the driveway, inner door to the house.
  Driveway / lawn    x -15.5..-9: parked car, hedge, mailbox.
  Side yard (south)  x -25..-9, z 6..23: picket fences, shed, trees, planter; gate to the backyard.
  Side passage (N)   z -16..-12 along the garage, between the backyard and the driveway.
  Back lane (shared) z -23..-16 along the north fence; the billboard tower base at its centre.
  Cul-de-sac         the curved street: school bus across the centre (open window band), the
                     delivery truck to the north (open side door, steps up into the cargo bay),
                     the exit road south with a barricade and the big PVPSPINARENA sign.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))

ARENA = {"width": 64.0, "depth": 46.0}
HX = ARENA["width"] / 2
HZ = ARENA["depth"] / 2
STEP = 0.3            # stair riser; simulation STEP_HEIGHT is 0.35
WALL = 0.25           # house wall thickness
SLAB0, FLOOR2 = 2.75, 3.0   # upper floor slab (top is the walkable upper floor)
TOP = 5.7             # top of the upper-floor walls
LOW = 1.15            # hides a crouched player (head top 1.05 m)
FENCE = 1.25          # garden fence: not jumpable (0.81 m clearance), a standing player sees over
HEDGE = 1.1
DOOR = 2.2            # door head above its floor
SILL, HEAD = 0.95, 2.2     # ground-floor windows
SILL2, HEAD2 = FLOOR2 + 0.9, FLOOR2 + 2.1   # upper-floor windows

solids = []


def box(id, x0, x1, z0, z1, y0, y1, surface, kind, layer="box", side=None):
    assert x0 < x1 and z0 < z1 and y0 < y1, id
    solids.append({
        "id": id, "x": round((x0 + x1) / 2, 4), "y": round((y0 + y1) / 2, 4), "z": round((z0 + z1) / 2, 4),
        "w": round(x1 - x0, 4), "h": round(y1 - y0, 4), "d": round(z1 - z0, 4),
        "surface": surface, "kind": kind, "layer": layer, "side": side,
    })


def twin(id, x0, x1, z0, z1, y0, y1, surface, kind, layer="box", kind_b=None):
    """A-side (west) solid and its mirror twin on the B side (east)."""
    box(f"{id}-a", x0, x1, z0, z1, y0, y1, surface, kind, layer, "a")
    box(f"{id}-b", -x1, -x0, z0, z1, y0, y1, surface, kind_b or kind, layer, "b")


def centred(id, x0, x1, z0, z1, y0, y1, surface, kind, layer="box"):
    """A solid that is its own mirror (symmetric about x = 0)."""
    assert abs(x0 + x1) < 1e-9, id
    box(id, x0, x1, z0, z1, y0, y1, surface, kind, layer, "centre")


def wall(id, axis, t0, t1, a0, a1, openings, y1=TOP, kind="house-wall", surface="concrete", y0=0.0):
    """
    A straight wall from a0 to a1 along `axis` ("x" or "z"), thickness t0..t1 across it, from y0
    to y1, with rectangular openings (a0, a1, y0, y1). Emits the minimal boxes around them: full
    columns between openings, and above / below each opening.
    """
    cuts = sorted({a0, a1, *[o[0] for o in openings], *[o[1] for o in openings]})
    n = 0
    for c0, c1 in zip(cuts, cuts[1:]):
        if c1 - c0 < 1e-6:
            continue
        mid = (c0 + c1) / 2
        holes = sorted((o[2], o[3]) for o in openings if o[0] <= mid <= o[1])
        y = y0
        spans = []
        for h0, h1 in holes:
            if h0 > y + 1e-6:
                spans.append((y, h0))
            y = max(y, h1)
        if y < y1 - 1e-6:
            spans.append((y, y1))
        for s0, s1 in spans:
            n += 1
            if axis == "x":
                twin(f"{id}-{n}", c0, c1, t0, t1, s0, s1, surface, kind)
            else:
                twin(f"{id}-{n}", t0, t1, c0, c1, s0, s1, surface, kind)


# ================================================================== house A (B is its mirror twin)
X0, X1, Z0, Z1 = -25.0, -13.0, -6.0, 6.0
# Front (street) wall: front door, two big windows; upstairs: balcony door and two windows.
wall("house-front", "z", X1 - WALL, X1, Z0, Z1, [
    (-0.7, 0.7, 0, DOOR), (-4.6, -1.8, SILL, HEAD), (1.8, 4.6, SILL, HEAD),
    (-0.7, 0.7, FLOOR2, FLOOR2 + DOOR), (-4.6, -2.0, SILL2, HEAD2), (2.0, 4.6, SILL2, HEAD2),
], kind="house-front")
# Back wall: back door to the backyard; no upstairs windows over the spawn.
wall("house-back", "z", X0, X0 + WALL, Z0, Z1, [(1.2, 2.4, 0, DOOR), (-4.2, -2.2, SILL, HEAD)], kind="house-back")
# North wall (shared with the garage): inner door to the garage; upstairs window over the garage roof.
wall("house-north", "x", Z0, Z0 + WALL, X0 + WALL, X1 - WALL, [
    (-17.4, -16.2, 0, DOOR), (-17.6, -15.4, SILL2, HEAD2),
], kind="house-side")
# South wall (side yard): two bedroom windows upstairs; the ground floor is solid (its windows are
# shuttered in the render), since any opening there lines up with the front windows across the map.
wall("house-south", "x", Z1 - WALL, Z1, X0 + WALL, X1 - WALL, [
    (-22.4, -19.8, SILL2, HEAD2), (-17.4, -14.8, SILL2, HEAD2),
], kind="house-side")
# Upper floor slab with the stairwell opening along the north wall (x -24.75..-18.25, z -5.75..-4.55);
# a 1 m landing at its west end, where the stairs are entered from the kitchen.
SW_X0, SW_X1, SW_Z0, SW_Z1 = X0 + WALL, -18.25, Z0 + WALL, -4.55
LANDING = 1.0
PART_X0, PART_X1 = SW_X1, SW_X1 + 0.25   # the wall between the kitchen (back) and the living room (front)
twin("house-floor2-s", X0 + WALL, X1 - WALL, SW_Z1, Z1 - WALL, SLAB0, FLOOR2, "wood", "house-floor2")
twin("house-floor2-n", SW_X1, X1 - WALL, Z0 + WALL, SW_Z1, SLAB0, FLOOR2, "wood", "house-floor2")
# Stairs: ten 0.3 m risers rising east along the north wall onto the upper floor.
for i in range(1, 11):
    x0 = SW_X0 + LANDING + 0.55 * (i - 1)
    twin(f"house-stair-{i:02d}", x0, x0 + 0.55, SW_Z0, SW_Z1, 0, STEP * i, "wood", "stair")
# Stairwell balustrade on the upper floor (a solid half-wall), open where the stairs arrive.
twin("house-balustrade", SW_X0, SW_X1 - 1.2, SW_Z1, SW_Z1 + 0.15, FLOOR2, FLOOR2 + 1.0, "wood", "balustrade")
# Roof: flat deck over the upper walls, then the gable as stepped bullet-only slabs (pitch along z).
twin("house-roof", X0 - 0.4, X1 + 0.4, Z0 - 0.4, Z1 + 0.4, TOP, TOP + 0.3, "concrete", "roof", layer="bullet")
for i, (inset, h0, h1) in enumerate(((1.6, 6.0, 6.7), (3.3, 6.7, 7.4), (4.9, 7.4, 8.0))):
    twin(f"house-gable-{i}", X0 - 0.4, X1 + 0.4, Z0 - 0.4 + inset, Z1 + 0.4 - inset, h0, h1, "concrete", "gable", layer="bullet")
# Ground floor: the kitchen (back, with the stairs) and the living room (front) are split by a
# full-height wall whose one doorway (z 3.9..5.1) is offset so that no straight line runs from a
# back opening through the house and out of a front opening (no spawn-to-street sightline).
twin("house-partition-n", PART_X0, PART_X1, Z0 + WALL, 3.9, 0, SLAB0, "concrete", "partition")
twin("house-partition-s", PART_X0, PART_X1, 5.1, Z1 - WALL, 0, SLAB0, "concrete", "partition")
twin("house-partition-head", PART_X0, PART_X1, 3.9, 5.1, DOOR, SLAB0, "concrete", "partition")
# Kitchen: island and the counter run along the (windowless) south wall.
twin("house-island", -22.2, -19.8, 1.4, 2.4, 0, 1.0, "wood", "kitchen-island")
twin("house-counter", X0 + WALL, -19.2, 5.1, Z1 - WALL, 0, 0.95, "wood", "kitchen-counter")
# Living room: sofa facing the fireplace on the kitchen wall (Taha Kaya furniture bundle, x1.15 / x1.2).
twin("house-sofa", -16.4, -15.43, -3.0, -0.69, 0, 0.81, "wood", "sofa")
twin("house-fireplace", PART_X1, PART_X1 + 0.53, -2.73, -0.96, 0, 1.3, "concrete", "fireplace")
# Upper floor: bedroom partition with a doorway (z 0.4..1.6), bed and dresser.
twin("house-partition2-s", PART_X0, PART_X1, 1.6, Z1 - WALL, FLOOR2, TOP, "concrete", "partition")
twin("house-partition2-n", PART_X0, PART_X1, -4.4, 0.4, FLOOR2, TOP, "concrete", "partition")
# Bedroom: double bed (x1.25, headboard against the back wall), wardrobe; front room: dresser.
twin("house-bed", X0 + WALL + 0.16, X0 + WALL + 2.11, 2.6, 4.48, FLOOR2, FLOOR2 + 0.83, "wood", "bed")
twin("house-headboard", X0 + WALL, X0 + WALL + 0.16, 2.6, 4.48, FLOOR2, FLOOR2 + 1.04, "wood", "headboard")
twin("house-wardrobe", X0 + WALL, X0 + WALL + 0.53, -2.2, -0.39, FLOOR2, FLOOR2 + 1.94, "wood", "wardrobe")
twin("house-dresser", -16.0, -15.0, Z1 - WALL - 0.5, Z1 - WALL, FLOOR2, FLOOR2 + 0.98, "wood", "dresser")

# Porch roof = front balcony (upstairs door), on two posts; solid railing (crouch cover).
PX1 = X1 + 2.4
twin("porch-deck", X1, PX1, -2.6, 2.6, SLAB0, FLOOR2, "wood", "balcony")
twin("porch-post-n", PX1 - 0.25, PX1, -2.6, -2.35, 0, SLAB0, "wood", "porch-post")
twin("porch-post-s", PX1 - 0.25, PX1, 2.35, 2.6, 0, SLAB0, "wood", "porch-post")
twin("balcony-rail-e", PX1 - 0.15, PX1, -2.6, 2.6, FLOOR2, FLOOR2 + 1.0, "wood", "balcony-rail")
twin("balcony-rail-n", X1, PX1 - 0.15, -2.6, -2.45, FLOOR2, FLOOR2 + 1.0, "wood", "balcony-rail")
twin("balcony-rail-s", X1, PX1 - 0.15, 2.45, 2.6, FLOOR2, FLOOR2 + 1.0, "wood", "balcony-rail")

# ================================================================== garage A (attached, north)
GX0, GX1, GZ0 = -24.0, -15.5, -12.0
twin("garage-wall-n", GX0, GX1, GZ0, GZ0 + WALL, 0, 3.0, "concrete", "garage-wall")
twin("garage-wall-w", GX0, GX0 + WALL, GZ0 + WALL, Z0, 0, 3.0, "concrete", "garage-wall")
# Street side: the open garage door (z -11.5..-6.5), header above it.
twin("garage-wall-e1", GX1 - WALL, GX1, GZ0 + WALL, -11.5, 0, 3.0, "concrete", "garage-wall")
twin("garage-header", GX1 - WALL, GX1, -11.5, -6.5, 2.4, 3.0, "concrete", "garage-header")
twin("garage-wall-e2", GX1 - WALL, GX1, -6.5, Z0, 0, 3.0, "concrete", "garage-wall")
twin("garage-roof", GX0 - 0.3, GX1 + 0.3, GZ0 - 0.3, Z0, 3.0, 3.3, "concrete", "garage-roof", layer="bullet")
twin("garage-bench", -23.6, -20.4, GZ0 + WALL, -11.15, 0, 0.95, "wood", "workbench")
twin("garage-boxes", -20.4, -19.2, -8.6, -7.4, 0, LOW, "wood", "cardboard-boxes")

# ================================================================== driveway, front lawn, street edge
# Driveway cars, nose to the street: Duke '69 (A, x0.97) and Negotiator '80 (B, x1.03) by Daniel
# Zhabotinsky share one collision: body to the bonnet line, cabin (glasshouse) on top.
CAR_X0, CAR_X1 = -15.2, -10.1
twin("drive-car", CAR_X0, CAR_X1, -10.08, -8.12, 0, 1.0, "metal", "car", kind_b="car-b")
twin("drive-car-cabin", -14.11, -11.67, -9.91, -8.29, 1.0, 1.44, "metal", "car-cabin")
twin("lawn-hedge", -10.2, -9.4, 3.2, 7.2, 0, 1.9, "wood", "hedge")   # tall boxwood: full cover
twin("mailbox", -9.6, -9.12, -5.35, -4.65, 0, 1.1, "metal", "mailbox")          # PXBR US mail box, x1.4
twin("hydrant", -9.3, -8.84, -1.62, -1.18, 0, 0.92, "metal", "hydrant")         # MadeByYeshe pack
twin("street-lamp", -9.55, -9.0, 10.5, 11.05, 0, 5.5, "metal", "street-lamp")    # MadeByYeshe pack, x1.35
# Shrub beds under the front windows (Rudransh_3d bush pack): crouch cover by the porch.
twin("shrubs-n", X1, X1 + 0.7, -5.6, -3.0, 0, 0.8, "wood", "shrub-bed")
twin("shrubs-s", X1, X1 + 0.7, 3.0, 5.6, 0, 0.8, "wood", "shrub-bed")

# ================================================================== side yard A (south)
twin("yard-fence-w", -25.1, -24.9, 9.5, HZ, 0, FENCE, "wood", "picket-fence")   # backyard gate z 6..9.5
twin("yard-fence-front", -9.2, -9.0, 9.5, 14.5, 0, 2.0, "wood", "privacy-fence")   # the side yards and the street don't see across
# Worn Shed by donnichols (x0.75): eaves at 2.0 m over the whole roof footprint, the ridge above.
twin("yard-shed", -23.4, -18.57, 15.2, 18.45, 0, 2.0, "wood", "shed")
twin("yard-shed-ridge", -22.25, -19.72, 15.2, 18.45, 2.0, 2.66, "wood", "shed-ridge")
twin("yard-planter", -17.2, -15.0, 10.4, 11.4, 0, 0.8, "wood", "planter")
twin("yard-tree-1", -15.4, -14.9, 17.0, 17.5, 0, 4.0, "wood", "tree")
twin("yard-tree-2", -11.9, -11.4, 20.2, 20.7, 0, 4.0, "wood", "tree")
twin("yard-trash", -13.0, -12.36, 6.9, 8.06, 0, 1.12, "metal", "wheelie-bins")   # two wheelie bins

# ================================================================== backyard A (spawn)
twin("spawn-wall", -27.2, -26.8, -1.0, 3.6, 0, 1.6, "concrete", "garden-wall")   # shields the back door
twin("patio-table", -30.4, -28.8, -6.6, -5.0, 0, 0.77, "wood", "picnic-table")   # Derek Flanagan
twin("bbq", -31.2, -30.4, 5.0, 5.8, 0, 1.1, "metal", "bbq")
twin("backyard-hedge-n", -31.4, -27.6, -12.4, -11.6, 0, HEDGE, "wood", "hedge")
twin("backyard-tree", -30.3, -29.8, 12.0, 12.5, 0, 4.0, "wood", "tree")

# ================================================================== side passage (north of the garage) and back lane
twin("passage-fence", -24.0, -13.0, -16.1, -15.9, 0, FENCE, "wood", "picket-fence")   # gap x -13..-8 to the lane
twin("passage-bins", -18.16, -17.0, -15.55, -14.91, 0, 1.12, "metal", "wheelie-bins")
# Two tall pieces at the passage's ends, on opposite sides, so the passage is walked in a dog-leg and
# never gives a straight look from the backyard to the street: a firewood stack against the garage
# at the west end, a privacy-fence gate panel at the east end.
twin("passage-woodpile", -23.6, -22.2, -14.2, GZ0, 0, 1.9, "wood", "woodpile")
twin("passage-gate", -13.4, -13.2, -15.9, -14.2, 0, 2.0, "wood", "privacy-fence")
twin("lane-dumpster", -22.0, -19.66, -21.73, -20.27, 0, 1.46, "metal", "dumpster")   # MadeByYeshe big bin, x1.1
twin("lane-shed", -31.0, -27.75, -22.9, -18.07, 0, 2.0, "wood", "shed")
twin("lane-shed-ridge", -31.0, -27.75, -21.75, -19.22, 2.0, 2.66, "wood", "shed-ridge")
twin("lane-pole", -12.25, -11.85, -16.95, -16.55, 0, 7.0, "wood", "utility-pole")   # SLASH / RENDAR, x1.54
# Billboard tower (Gunnar Correa's radio tower, x1.2, with the PVPSPINARENA board on top).
centred("tower-base", -0.9, 0.9, -21.3, -19.5, 0, 2.9, "metal", "tower-base")
# A PVPSPINARENA storage container dropped against the tower splits the 64 m back lane in two.
centred("lane-container", -1.2, 1.2, -19.5, -15.5, 0, 2.4, "metal", "storage-container")
twin("lane-crates", -6.2, -5.0, -20.8, -19.6, 0, LOW, "wood", "crate")

# ================================================================== cul-de-sac
# School bus lengthwise across the centre (x = 0, along z), nose north: Macaroni's School Bus
# (x1.12). Collision follows the model: bonnet, the front of the body (with its mirrors), the body.
BZ0 = -0.6
centred("bus-hood", -1.32, 1.32, BZ0, 0.304, 0, 1.67, "metal", "bus-hood")
centred("bus-front", -1.27, 1.27, 0.304, 0.797, 0, 3.09, "metal", "bus-body")
centred("bus-body", -1.18, 1.18, 0.797, 10.556, 0, 3.09, "metal", "bus-body")
# Delivery truck to the north: the cab and chassis of Jen S Abbott's Box Truck (x0.3) with a new
# PVPSPINARENA cargo box (x -3..3) that has an open side door toward the street (x -2..2) and steps
# up to its floor (0.9 m). The cab sticks out east (the one unmirrored part).
TZ0, TZ1 = -12.55, -9.75
centred("truck-floor", -3.0, 3.0, TZ0, TZ1, 0, 0.9, "metal", "truck-floor")
centred("truck-wall-n", -3.0, 3.0, TZ0, TZ0 + 0.12, 0.9, 3.2, "metal", "truck-wall")
twin("truck-end", -3.0, -2.88, TZ0 + 0.12, TZ1, 0.9, 3.2, "metal", "truck-wall")
twin("truck-door-jamb", -2.88, -2.0, TZ1 - 0.12, TZ1, 0.9, 3.2, "metal", "truck-wall")
centred("truck-door-head", -2.0, 2.0, TZ1 - 0.12, TZ1, 3.0, 3.2, "metal", "truck-wall")
centred("truck-roof", -3.0, 3.0, TZ0, TZ1, 3.2, 3.42, "metal", "truck-roof")
centred("truck-step-2", -1.6, 1.6, TZ1, TZ1 + 0.45, 0, 0.6, "metal", "truck-step")
centred("truck-step-1", -1.6, 1.6, TZ1 + 0.45, TZ1 + 0.9, 0, 0.3, "metal", "truck-step")
TC = (TZ0 + TZ1) / 2
box("truck-cab", 3.0, 4.35, TC - 1.46, TC + 1.46, 0, 2.29, "metal", "truck-cab", side="cab")
box("truck-cab-hood", 4.35, 5.73, TC - 1.38, TC + 1.38, 0, 1.13, "metal", "truck-hood", side="cab")
# Street-side cover: parked cars on the ring and the exit-road barricade.
# Fairheaven SW '84 station wagons (Zhabotinsky) parked on the ring, nose north.
twin("street-car", -8.59, -6.71, -7.62, -2.58, 0, 0.95, "metal", "car-ring", kind_b="car-ring-b")
twin("street-car-cabin", -8.43, -6.87, -5.95, -2.7, 0.95, 1.42, "metal", "car-cabin")
twin("street-barrier", -6.6, -4.4, 14.0, 14.6, 0, LOW, "concrete", "jersey-barrier")
# Tall privacy fences along the exit road: the road and the side yards don't see across each other.
twin("road-fence", -5.6, -5.4, 15.0, HZ, 0, 2.0, "wood", "privacy-fence")
# Back lane: privacy fence pieces and a parked trailer break the 64 m lane into shorter fights.
twin("lane-fence", -16.0, -15.8, -23.0, -19.2, 0, 2.0, "wood", "privacy-fence")
twin("lane-trailer", -10.4, -7.6, -22.4, -20.6, 0, 1.6, "metal", "utility-trailer")
centred("road-barricade", -2.6, 2.6, 19.4, 19.9, 0, 1.1, "wood", "barricade")
# PVPSPINARENA monument sign at the end of the exit road (brick base, logo panel).
centred("sign-base", -3.2, 3.2, 21.9, 22.5, 0, 2.4, "concrete", "monument-sign")

walls = [
    {"id": "wall-west", "x": -HX - 0.4, "y": 4.5, "z": 0, "w": 0.8, "h": 9.0, "d": ARENA["depth"] + 1.6, "surface": "concrete"},
    {"id": "wall-east", "x": HX + 0.4, "y": 4.5, "z": 0, "w": 0.8, "h": 9.0, "d": ARENA["depth"] + 1.6, "surface": "concrete"},
    {"id": "wall-north", "x": 0, "y": 4.5, "z": -HZ - 0.4, "w": ARENA["width"], "h": 9.0, "d": 0.8, "surface": "concrete"},
    {"id": "wall-south", "x": 0, "y": 4.5, "z": HZ + 0.4, "w": ARENA["width"], "h": 9.0, "d": 0.8, "surface": "concrete"},
]
spawns = {"A": {"x": -29.5, "z": -2.0, "yaw": -1.5707963267948966}, "B": {"x": 29.5, "z": -2.0, "yaw": 1.5707963267948966}}


def emit():
    ids = [s["id"] for s in solids]
    assert len(ids) == len(set(ids)), "duplicate ids"
    for s in solids:  # inside the arena
        assert abs(s["x"]) + s["w"] / 2 <= HX + 1e-6 and abs(s["z"]) + s["d"] / 2 <= HZ + 1e-6, s["id"]
    os.makedirs(os.path.join(HERE, "build"), exist_ok=True)
    with open(os.path.join(HERE, "build", "layout.json"), "w") as f:
        json.dump({"arena": ARENA, "solids": solids, "walls": walls, "spawns": spawns}, f, indent=1)

    def row(s):
        return (f'  {{ id: "{s["id"]}", x: {s["x"]}, y: {s["y"]}, z: {s["z"]}, w: {s["w"]}, h: {s["h"]}, '
                f'd: {s["d"]}, surface: "{s["surface"]}" }},')

    boxes = [s for s in solids if s["layer"] == "box"]
    bullets = [s for s in solids if s["layer"] == "bullet"]
    ts = [
        "// Generated by art/blender/suburbia/layout.py — edit the layout there, then re-run it.",
        "// SUBURBAN SHOWDOWN 1v1 aim arena: gameplay solids (metres, feet at y = 0, box centres + full sizes).",
        'import type { Solid } from "./map";',
        "",
        f"export const SUBURBIA_SIZE = {{ width: {ARENA['width']}, depth: {ARENA['depth']} }} as const;",
        "/** Block movement and bullets; tops are walkable. */",
        "export const SUBURBIA_BOXES: Solid[] = [",
        *[row(s) for s in boxes],
        "];",
        "/** Bullets only (roofs, gables and garage roofs, out of reach). */",
        "export const SUBURBIA_STRUCTURES: Solid[] = [",
        *[row(s) for s in bullets],
        "];",
        "/** Perimeter: bullets (movement is bounded by the arena rectangle). */",
        "export const SUBURBIA_WALLS: Solid[] = [",
        *[row(s) for s in walls],
        "];",
        "export const SUBURBIA_SPAWNS = {",
        f"  A: {{ x: {spawns['A']['x']}, z: {spawns['A']['z']}, yaw: -Math.PI / 2 }},",
        f"  B: {{ x: {spawns['B']['x']}, z: {spawns['B']['z']}, yaw: Math.PI / 2 }},",
        "} as const;",
        "",
    ]
    with open(os.path.join(ROOT, "src/lib/fps/suburbia-layout.ts"), "w") as f:
        f.write("\n".join(ts))
    print(f"{len(boxes)} boxes, {len(bullets)} bullet-only, {len(walls)} walls")


if __name__ == "__main__":
    emit()
