"""Buildings left incomplete (owner, 2026-11-27: "here is some issues cross the map with
buildings that is incompleted built. prison, some single buildings, see attached images. audit
and fix"): seven screenshots, each traced to a model and its cause, and every placement of that
model fixed with it.

Writes the two specs of world revision gaps-v1 (from hosp-v1):
  art/br/gaps-v1.parts.json             faces and cuts  (art/blender/br/patch_parts.mjs)
  art/br/collision-patch-gaps-v1.json   collision       (art/blender/br/patch_collision.mjs)

    python3 art/br/fitout/gaps.py

| Screenshot | Model | Cause |
|---|---|---|
| Stairs in a house, the outside seen beside the flight | townhouse (Island Superstore, Millhaven, …) | The west wall's window is where the stair runs: the flight crosses it on both storeys (from outside the treads show through it) and from a tread the sill is under your feet, so you could step out and fall |
| A building's end with its stair, open | strip-mall | The roof stair outside the east end had a 6 cm dark sheet for a rail (drawn 5.4 m tall, no collision) and nothing behind its landing: from the back and the side the stair's well stood open, and nothing stopped a fall off the flight |
| A small house's second room cannot be entered | shed | The partition's doorway is 0.88 m wide in the mesh, but its collision (voxels 0.6 m thick round a 15 cm wall) left 0.58 m, under the body's 0.70 m; and the east room's collision floor stood 23 cm over the drawn one, through the doorway, leaving 1.5 m under its head for a 1.8 m body |
| A house with a ground-floor problem | rural-wood-4 (the long wooden house) | Its floor (the access fit-out's slab) is a rectangle well inside the octagonal walls: a strip of bare ground 0.2–1.7 m wide inside every wall |
| A slit in the white apartments | apartment | The stairwell's door into the corridor runs 5 cm past the corridor wall: a slit from the lobby into the flat behind, every floor |
| The prison's wall top | bw-keep (Blackwater) | (a) A 35 cm slot under the roof's courtyard parapet all the way round (fix_keep_arcade.mjs set the parapet on arch heads 0.35 m taller than the published ones); (b) on the rounded ends the battlements had two merlons a 14 m segment (the straight sides one every 2 m) and their merlons, windows and the gallery's doorways were drawn without their ends: open, hollow edges |
| Ground gaps round the prison | bw-quay | The yard's ground dips into the moat up to 50.3 m out from the keep's axis; the quay's paved walk stopped at 48.1 m, so a ditch ran outside it, with the moat's water showing in it at the ends |
"""

import json
import math
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
r3 = lambda v: round(v, 3)


def box(b):
    return [r3(v) for v in b]


# ------------------------------------------------------------------------------- helpers
def vquad(a, b, y0, y1, normal):
    """A vertical quad over the ground line a→b (x, z), wound to face `normal` (x, z)."""
    pts = [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]]
    # Front side: cross(b − a, up) · n > 0 for counter-clockwise seen from n.
    d = (b[0] - a[0], b[1] - a[1])
    # cross((dx,0,dz),(0,1,0)) = (−dz, 0, dx)
    c = (-d[1], d[0])
    if c[0] * normal[0] + c[1] * normal[1] < 0:
        pts = [[b[0], y0, b[1]], [a[0], y0, a[1]], [a[0], y1, a[1]], [b[0], y1, b[1]]]
    return [[r3(v) for v in p] for p in pts]


def hquad(pts, y, up=True):
    """A horizontal polygon's points (x, z) for patch_parts (it winds them itself)."""
    return {"poly": [[r3(x), r3(z)] for x, z in pts], "y": r3(y), "down": not up}


parts = {}
collision = {}


def add_part(model, part, lods):
    m = parts.setdefault(model, {"lods": sorted({*lods, *parts.get(model, {}).get("lods", [])}), "parts": [], "cuts": []})
    m["lods"] = sorted({*m["lods"], *lods})
    m["parts"].append({**part, "lods": lods})


def add_cut(model, cut, lods):
    m = parts.setdefault(model, {"lods": sorted(lods), "parts": [], "cuts": []})
    m["lods"] = sorted({*m["lods"], *lods})
    m["cuts"].append({**cut, "lods": lods})


def add_boxes(model, boxes, why):
    collision.setdefault(model, []).append({"add": [box(b) for b in boxes], "why": why})


def replace_box(model, old, new, why):
    collision.setdefault(model, []).append({"replace": old, "with": [box(b) for b in new], "why": why})


# ------------------------------------------------------------------------------ townhouse
# build_townhouse.mjs: the west wall (x −5…−4.7) has a window z −1…1 at y + 1.2…2.3 on each
# storey (y 0 and 3.2), and the stair runs along that wall from z 3.4 (low) to −2.2 (high): the
# treads cross the window. The window is walled up; on the ground floor the room's lining
# (beige, the "Interior walls and ceiling" primitive) is carried across where the window was
# and the shell's own inner faces behind it go, as the access pass left the rest of that wall.
BRICK = [0.55, 0.3, 0.24]
why = "townhouse: the west window the stair crosses, walled up"
for y in (0.0, 3.2):
    fill = [-5.0, y + 1.2, -1.0, -4.7, y + 2.3, 1.0]
    add_part("townhouse", {"prim": "townhouse", "box": fill, "faces": ["x0"], "tint": BRICK, "why": why}, [0, 1])
    if y > 0:
        add_part("townhouse", {"prim": "townhouse", "box": fill, "faces": ["x1"], "tint": BRICK, "why": why}, [0, 1])
    else:
        add_part("townhouse", {"prim": "townhouse", "box": fill, "faces": ["x1"], "tint": BRICK, "why": why}, [1])
    add_boxes("townhouse", [fill], why)
# Its breakable panes (window-panes.json, x −4.89…−4.81) go with it: glass inside a wall.
WINDOW_PANES = os.path.join(ROOT, "..", "..", "src", "lib", "fps", "br", "window-panes.json")
with open(WINDOW_PANES) as f:
    raw = f.read()
panes = json.loads(raw)
panes["models"]["townhouse"] = [
    b for b in panes["models"]["townhouse"] if not (b[1] < -4.7 and -1.01 <= b[2] and b[3] <= 1.01)
]
with open(WINDOW_PANES, "w") as f:
    f.write(json.dumps(panes, indent=1) + ("\n" if raw.endswith("\n") else ""))
add_cut("townhouse", {"prim": "townhouse", "box": [-4.705, -0.01, -1.0, -4.695, 3.21, 1.0], "why": "the shell's inner faces where the lining now runs"}, [0])
add_part(
    "townhouse",
    {
        "prim": "Interior walls and ceiling",
        "quad": vquad((-4.7, 1.0), (-4.7, -1.0), 0.0, 3.2, (1, 0)),
        "why": "the ground floor's lining across the walled-up window",
    },
    [0],
)

# ------------------------------------------------------------------------------ strip mall
# build_stripmall.mjs: the stair runs outside the east wall (x 22…23.3) from the front
# (z 7.5, ground) to the landing (z −7.7…−4.8, roof 4.4). Its rail was a 6 cm sheet at
# x 23.24…23.3, 5.4 m tall, without collision. Now a wall in the building's render (x 23.23…23.5,
# to the parapet's 5.3 m, the sheet inside it, its top 10 cm cut off) and a wall across the back
# of the well; the front stays open as the stair's way in.
WALL = [0.78, 0.74, 0.66]
why = "strip-mall: the roof stair walled outside and at the back"
side = [23.23, 0.0, -8.0, 23.5, 5.3, 7.5]
back = [22.0, 0.0, -8.0, 23.23, 5.3, -7.7]
add_cut("strip-mall", {"prim": "strip-mall", "box": [23.22, 5.3, -7.8, 23.32, 5.45, 7.6], "why": "the old rail sheet's top over the new wall"}, [0, 1])
add_part("strip-mall", {"prim": "strip-mall", "box": side, "faces": ["x0", "x1", "y1", "z0", "z1"], "tint": WALL, "why": why}, [0, 1])
add_part("strip-mall", {"prim": "strip-mall", "box": back, "faces": ["z0", "z1", "y1"], "tint": WALL, "why": why}, [0, 1])
add_boxes("strip-mall", [side, back], why)

# ------------------------------------------------------------------------------ shed
# The partition between the shed's two rooms (mesh: x −0.373…−0.219) has a doorway z −1.557…
# −0.678 under a head at 2.222, its threshold 0.39 over the floor of both rooms (0.37). Its
# collision is the voxel pass's: 0.6 m thick, the doorway 0.58 m wide (the body is 0.70) and its
# head at 2.1; and the east room's floor was a voxel layer to 0.6, 23 cm over the drawn floor,
# carried 0.23 m through the doorway: under that head 1.5 m of room, the standing body 1.8. The
# partition's boxes are the wall's own extent, the east room's floor the drawn one (its walls'
# feet, which the layer also was, kept to 0.6).
why = "shed: the doorway into the second room, its collision fitted to the wall"
replace_box("shed", [-0.6, 0.6, -1.721, 0, 2.7, -1.421], [[-0.373, 0.3, -1.721, -0.219, 2.7, -1.557]], why)
replace_box("shed", [-0.6, 0.6, -0.821, 0, 2.7, 0.379], [[-0.373, 0.3, -0.678, -0.219, 2.7, 0.379]], why)
replace_box("shed", [-0.6, 2.1, -1.421, 0, 2.7, -0.821], [[-0.373, 2.222, -1.557, -0.219, 2.7, -0.678]], why)
why = "shed: the east room's floor at the drawn floor (it was 23 cm over it)"
replace_box("shed", [-0.6, 0.3, -1.721, 3, 0.6, 0.079], [[-0.6, 0.3, -1.721, 2.7, 0.37, 0.079], [2.7, 0.3, -1.721, 3, 0.6, 0.079]], why)
replace_box(
    "shed",
    [-0.3, 0.3, 0.079, 3, 0.6, 1.579],
    [[-0.3, 0.3, 0.079, 2.7, 0.37, 1.279], [2.7, 0.3, 0.079, 3, 0.6, 1.579], [-0.3, 0.3, 1.279, 2.7, 0.6, 1.579]],
    why,
)

# ------------------------------------------------------------------------------ rural-wood-4
# The long wooden house: walls (single sheets) at x −9.92 / 9.92, z −6.35 (north) / 5.93
# (south), 45° corners from (±9.92, −4.87) to (±8.43, −6.35) and from (±9.92, 4.44) to
# (±8.43, 5.93). The access fit-out's floor is x −8.2…8.4, z −5.5…5.7, top 0.12. The rest of the
# floor, 2 cm inside the walls, at the same height, round the two doors' thresholds
# (x −0.9…0.75).
why = "rural-wood-4: the floor carried out to the walls"
XW, XE, ZN, ZS = -9.90, 9.90, -6.33, 5.91
DX0, DX1 = -0.9, 0.75
TOP = 0.12
cn = lambda z: -9.90 - (z + 4.85)  # the north-west corner's line at z (−x side)
cs = lambda z: -9.90 + (z - 4.44)  # the south-west corner's line
floor_polys = [
    # North strip, either side of the back door.
    [(cn(ZN), ZN), (DX0, ZN), (DX0, -5.5), (cn(-5.5), -5.5)],
    [(DX1, ZN), (-cn(ZN), ZN), (-cn(-5.5), -5.5), (DX1, -5.5)],
    # South strip, either side of the front door.
    [(cs(5.7), 5.7), (DX0, 5.7), (DX0, ZS), (cs(ZS), ZS)],
    [(DX1, 5.7), (-cs(5.7), 5.7), (-cs(ZS), ZS), (DX1, ZS)],
    # West and east strips with the corners.
    [(cn(-5.5), -5.5), (-8.2, -5.5), (-8.2, 5.7), (cs(5.7), 5.7), (XW, 4.44), (XW, -4.85)],
    [(8.4, -5.5), (-cn(-5.5), -5.5), (XE, -4.85), (XE, 4.44), (-cs(5.7), 5.7), (8.4, 5.7)],
]
for pts in floor_polys:
    add_part("rural-wood-4", {"prim": "Access floor and steps", **hquad(pts, TOP), "why": why}, [0, 1])
add_boxes(
    "rural-wood-4",
    [
        [cn(-6.0), 0.02, ZN, DX0, TOP, -5.5],
        [DX1, 0.02, ZN, -cn(-6.0), TOP, -5.5],
        [cs(5.8), 0.02, 5.7, DX0, TOP, ZS],
        [DX1, 0.02, 5.7, -cs(5.8), TOP, ZS],
        [XW, 0.02, -4.85, -8.2, TOP, 4.44],
        [cn(-5.2), 0.02, -5.5, -8.2, TOP, -4.85],
        [cs(5.1), 0.02, 4.44, -8.2, TOP, 5.7],
        [8.4, 0.02, -4.85, XE, TOP, 4.44],
        [8.4, 0.02, -5.5, -cn(-5.2), TOP, -4.85],
        [8.4, 0.02, 4.44, -cs(5.1), TOP, 5.7],
    ],
    why,
)

# ------------------------------------------------------------------------------ apartment
# build_apartment.mjs: the core wall (x −6.7…−6.55) has its door z −5.2…−4.0 to y + 2.2; the
# corridor wall it opens onto is z −4.2…−4.05. The 5 cm past it, walled.
INNER = [0.84, 0.81, 0.75]
why = "apartment: the stairwell door's slit past the corridor wall"
for y in (0.0, 3.2, 6.4, 9.6):
    b = [-6.7, y, -4.05, -6.55, y + 2.2, -4.0]
    add_part("apartment", {"prim": "apartment", "box": b, "faces": ["x0", "x1", "z0"], "tint": INNER, "why": why}, [0])
    add_boxes("apartment", [b], why)

# ------------------------------------------------------------------------------ Blackwater keep
# build_blackwater.mjs's numbers (keep(): a stadium, straight half-length HL, the ends half
# circles of SEG straight walls round x = ±HL).
HL, RO, RW, RP, RG, RA, RC = 27.5, 27.5, 26.1, 19.1, 18.7, 16.3, 15.5
Y = [0, 4.6, 9.2, 13.8]
ROOF, SLAB, SEG = 18.4, 0.35, 6
STONE = [1, 1, 1]
STONE_TILE, PLASTER_TILE = 3.2, 2.4


def seg_angle(k):
    return math.radians(-90 + 180 * k / SEG)


def end_pt(e, r, a):
    return (e * (HL + r * math.cos(a)), r * math.sin(a))


def chord(e, r, s, order):
    """The chord of segment s at radius r, as build_blackwater orders it (`order(p, q)`)."""
    p, q = end_pt(e, r, seg_angle(s)), end_pt(e, r, seg_angle(s + 1))
    return order(e, p, q)


def along(P, Q, t):
    L = math.dist(P, Q)
    return (P[0] + (Q[0] - P[0]) * t / L, P[1] + (Q[1] - P[1]) * t / L)


def slab_frame(P, Q):
    """Unit direction and the kit slab's +n (textured-kit.mjs slab: n = (−dz, dx) / L)."""
    L = math.dist(P, Q)
    d = ((Q[0] - P[0]) / L, (Q[1] - P[1]) / L)
    return d, (-d[1], d[0]), L


def off(pt, n, h):
    return (pt[0] + n[0] * h, pt[1] + n[1] * h)


def slab_piece(P, Q, t0, t1, thick, y0, y1, faces):
    """Faces of a kit slab piece from t0 to t1 along P→Q: "+n", "-n", "top", "bottom", "start"
    (at t0, facing −d), "end" (at t1, facing +d)."""
    d, n, _ = slab_frame(P, Q)
    h = thick / 2
    a, b = along(P, Q, t0), along(P, Q, t1)
    out = []
    if "+n" in faces:
        out.append(vquad(off(a, n, h), off(b, n, h), y0, y1, n))
    if "-n" in faces:
        out.append(vquad(off(a, n, -h), off(b, n, -h), y0, y1, (-n[0], -n[1])))
    if "start" in faces:
        out.append(vquad(off(a, n, -h), off(a, n, h), y0, y1, (-d[0], -d[1])))
    if "end" in faces:
        out.append(vquad(off(b, n, -h), off(b, n, h), y0, y1, d))
    corners = [off(a, n, h), off(b, n, h), off(b, n, -h), off(a, n, -h)]
    polys = []
    if "top" in faces:
        polys.append(hquad(corners, y1, True))
    if "bottom" in faces:
        polys.append(hquad(corners, y0, False))
    return out, polys


def slab_boxes(P, Q, t0, t1, thick, y0, y1):
    """The kit's own collision for a slab piece (textured-kit.mjs slab: steps of ≤ 0.8 t)."""
    a, b = along(P, Q, t0), along(P, Q, t1)
    L = t1 - t0
    h = thick / 2
    n = max(1, math.ceil(L / max(thick * 0.8, 0.4)))
    out = []
    for k in range(n):
        xa = a[0] + (b[0] - a[0]) * k / n
        za = a[1] + (b[1] - a[1]) * k / n
        xb = a[0] + (b[0] - a[0]) * (k + 1) / n
        zb = a[1] + (b[1] - a[1]) * (k + 1) / n
        out.append([min(xa, xb) - h * 0.75, y0, min(za, zb) - h * 0.75, max(xa, xb) + h * 0.75, y1, max(za, zb) + h * 0.75])
    return out


def keep_part(spec, lods, tile=STONE_TILE, tint=STONE, prim="bw-keep-stone"):
    quads, polys = spec
    for q in quads:
        add_part("bw-keep", {"prim": prim, "quad": q, "uvTile": tile, "tint": tint, "why": WHY}, lods)
    for p in polys:
        add_part("bw-keep", {"prim": prim, **p, "uvTile": tile, "tint": tint, "why": WHY}, lods)


outer_order = lambda e, p, q: (p, q) if e > 0 else (q, p)
inner_order = lambda e, p, q: (q, p) if e > 0 else (p, q)

# (a) The slot under the courtyard parapet on the roof: arch heads to ROOF, parapet from
# ROOF + SLAB. Its two faces, the courtyard's and the walkway's.
WHY = "bw-keep: the slot under the roof's courtyard parapet closed"
for s in (1, -1):
    za, zb = (RC, RA) if s > 0 else (-RA, -RC)
    for z, nz in ((za, -1), (zb, 1)):
        keep_part(([vquad((-HL, z), (HL, z), ROOF, ROOF + SLAB, (0, nz))], []), [0, 1])
for e in (1, -1):
    for s in range(SEG):
        P, Q = chord(e, (RC + RA) / 2, s, inner_order)
        L = math.dist(P, Q)
        keep_part(slab_piece(P, Q, -0.1, L + 0.1, RA - RC, ROOF, ROOF + SLAB, {"+n", "-n"}), [0, 1])

# (b) The rounded ends' battlements, windows, merlons and gallery doorways.
WHY = "bw-keep: the rounded ends' merlons every 2 m and the open ends of their openings closed"
merlon_y0, merlon_y1 = ROOF + 1.0, ROOF + 1.9
merlon_boxes = []
for e in (1, -1):
    for s in range(SEG):
        P, Q = chord(e, (RO + RW) / 2, s, outer_order)
        L = math.dist(P, Q)
        # The two there were (0.25 L and 0.7 L, 1 m each): their ends.
        for f in (0.25, 0.7):
            keep_part(slab_piece(P, Q, f * L, f * L + 1.0, RO - RW, merlon_y0, merlon_y1, {"start", "end"}), [0, 1])
        # New ones: the straight sides' rhythm (1 m merlon, about 1 m crenel), and a short one
        # where each segment starts.
        for t0, t1 in ((-0.12, 0.6), (1.468, 2.468), (5.468, 6.468), (7.468, 8.468), (L - 2.162, L - 1.162)):
            keep_part(slab_piece(P, Q, t0, t1, RO - RW, merlon_y0, merlon_y1, {"+n", "-n", "top", "start", "end"}), [0, 1])
            merlon_boxes += slab_boxes(P, Q, t0, t1, RO - RW, merlon_y0, merlon_y1)
        # Windows (and the ground floor's arrow slits): jambs and the head's underside.
        for lv, y0 in enumerate(Y):
            w = 0.5 if lv == 0 else 1.2
            h0, h1 = L / 2 - w / 2, L / 2 + w / 2
            hy0, hy1 = y0 + (1.1 if lv == 0 else 1.3), y0 + (2.7 if lv == 0 else 3.0)
            # The jamb at h0 is the end of the piece before the hole (facing +d), at h1 the start
            # of the piece after it (facing −d).
            keep_part(slab_piece(P, Q, h0 - 0.5, h0, RO - RW, hy0, hy1, {"end"}), [0, 1])
            keep_part(slab_piece(P, Q, h1, h1 + 0.5, RO - RW, hy0, hy1, {"start"}), [0, 1])
            keep_part(slab_piece(P, Q, h0, h1, RO - RW, hy1, hy1 + 0.1, {"bottom"}), [0, 1])
        # The gallery wall's doorway on each floor (plaster, near LOD only).
        Pg, Qg = chord(e, (RP + RG) / 2, s, inner_order)
        Lg = math.dist(Pg, Qg)
        for lv, y0 in enumerate(Y):
            d0, d1 = Lg / 2 - 0.8, Lg / 2 + 0.8
            spec_prim = dict(tile=PLASTER_TILE, tint=[0.9, 0.88, 0.84], prim="bw-keep-plaster")
            keep_part(slab_piece(Pg, Qg, d0 - 0.5, d0, RP - RG, y0, y0 + 2.4, {"end"}), [0], **spec_prim)
            keep_part(slab_piece(Pg, Qg, d1, d1 + 0.5, RP - RG, y0, y0 + 2.4, {"start"}), [0], **spec_prim)
            keep_part(slab_piece(Pg, Qg, d0, d1, RP - RG, y0 + 2.4, y0 + 2.5, {"bottom"}), [0], **spec_prim)
        # The upper floors' courtyard parapets between the arcade's piers: their ends.
        Pa, Qa = chord(e, (RC + RA) / 2, s, inner_order)
        La = math.dist(Pa, Qa)
        for y0 in Y[1:]:
            keep_part(slab_piece(Pa, Qa, 0.45, La - 0.45, RA - RC, y0 + SLAB, y0 + 1.05, {"start", "end"}), [0, 1])
add_boxes("bw-keep", merlon_boxes, "bw-keep: the new merlons on the rounded ends")

# ------------------------------------------------------------------------------ Blackwater quay
# quay(): the moat's outer wall faces RQ = RO + 16 out from the keep's axis (x = ±HL round the
# ends); behind it (T2 = 1 m) a paved walk AP = 3.6 m wide (to 48.1 m), top 0.06, 0.41 deep.
# The yard's ground (height.v6) dips into the moat as far as 50.2 m out (48.0 on the straight
# sides, up to 50.2 round the ends): a ditch outside the walk, the moat's water showing in it.
# The walk now goes to 51 m all round, the ends' outer edge in four chords a segment (one chord
# would come 1.7 m in at its middle, inside the dip), and then slopes 18 cm down over a metre into
# the yard, so it meets the ground without a kerb (a 6 cm face at the ground reads as a black
# line in its own shade).
WHY = "bw-quay: the paved walk carried over the ground's dip into the moat"
RQ, T2, AP = RO + 16.0, 1.0, 3.6
R_IN, R_OUT, R_BEVEL = RQ + T2 + AP, 51.0, 52.0
WALK_TOP, WALK_BOTTOM, BEVEL_Y = 0.06, -0.35, -0.12
SUB = 4
COBBLE = [0.95, 0.95, 0.95]
COBBLE_TILE = 2.2
cobble = {"prim": "bw-quay-cobble", "uvTile": COBBLE_TILE, "tint": COBBLE, "why": WHY}


def sloped(a, b, ya, bo, ao, yo):
    """The quad a→b (at ya) to bo→ao (at yo), wound to face up."""
    pts = [[a[0], ya, a[1]], [b[0], ya, b[1]], [bo[0], yo, bo[1]], [ao[0], yo, ao[1]]]
    u = [pts[1][k] - pts[0][k] for k in range(3)]
    v = [pts[2][k] - pts[0][k] for k in range(3)]
    if u[2] * v[0] - u[0] * v[2] < 0:  # the normal's y
        pts = pts[::-1]
    return [[r3(c) for c in q] for q in pts]


def strip_boxes(pts):
    """Collision as textured-kit.mjs poly makes it: strips 1 m wide along x, the convex
    polygon's z extent over each."""
    out = []
    xs = [p[0] for p in pts]
    lo, hi = min(xs), max(xs)
    x = lo
    while x < hi - 1e-3:
        xa, xb = x, min(hi, x + 1.0)
        zmin, zmax = math.inf, -math.inf
        samples = [xa + 1e-3, xb - 1e-3] + [p[0] for p in pts if xa < p[0] < xb]
        for xs_ in samples:
            for i in range(len(pts)):
                p, q = pts[i], pts[(i + 1) % len(pts)]
                if (p[0] - xs_) * (q[0] - xs_) > 0 or p[0] == q[0]:
                    continue
                z = p[1] + (q[1] - p[1]) * (xs_ - p[0]) / (q[0] - p[0])
                zmin, zmax = min(zmin, z), max(zmax, z)
        if zmax > zmin:
            out.append([xa, WALK_BOTTOM, zmin, xb, WALK_TOP, zmax])
        x += 1.0
    return out


quay_boxes = []
for s in (1, -1):
    zi, zo, zb = s * R_IN, s * R_OUT, s * R_BEVEL
    add_part("bw-quay", {**cobble, **hquad([(-HL, zi), (HL, zi), (HL, zo), (-HL, zo)], WALK_TOP)}, [0, 1])
    add_part("bw-quay", {**cobble, "quad": sloped((-HL, zo), (HL, zo), WALK_TOP, (HL, zb), (-HL, zb), BEVEL_Y)}, [0, 1])
    quay_boxes.append([-HL, WALK_BOTTOM, min(zi, zo), HL, WALK_TOP, max(zi, zo)])
for e in (1, -1):
    for s in range(SEG):
        a0, a1 = seg_angle(s), seg_angle(s + 1)
        sub = [a0 + (a1 - a0) * k / SUB for k in range(SUB + 1)]
        # The original walk's outer edge (one chord at R_IN), then the new edge (SUB chords).
        pts = [end_pt(e, R_IN, a0)] + [end_pt(e, R_OUT, a) for a in sub] + [end_pt(e, R_IN, a1)]
        add_part("bw-quay", {**cobble, **hquad(pts, WALK_TOP)}, [0, 1])
        for k in range(SUB):
            add_part(
                "bw-quay",
                {**cobble, "quad": sloped(end_pt(e, R_OUT, sub[k]), end_pt(e, R_OUT, sub[k + 1]), WALK_TOP, end_pt(e, R_BEVEL, sub[k + 1]), end_pt(e, R_BEVEL, sub[k]), BEVEL_Y)},
                [0, 1],
            )
        quay_boxes += strip_boxes(pts)
# The far LOD (vertex-coloured, one material): the same walk, its colour the walk's own.
for part in [q for q in parts["bw-quay"]["parts"] if q["prim"] == "bw-quay-cobble"]:
    far = {k: v for k, v in part.items() if k not in ("uvTile", "tint", "lods")}
    add_part("bw-quay", {**far, "prim": "bw-quay-paint"}, [2])
add_boxes("bw-quay", quay_boxes, WHY)

# ------------------------------------------------------------------------------ write
with open(os.path.join(ROOT, "gaps-v1.parts.json"), "w") as f:
    json.dump({"tag": "gaps-v1", "models": parts}, f, indent=1)
with open(os.path.join(ROOT, "collision-patch-gaps-v1.json"), "w") as f:
    json.dump({"base": "hosp-v1", "version": "gaps-v1", "revision": "gaps-v1", "models": collision}, f, indent=1)
n_parts = sum(len(m["parts"]) for m in parts.values())
n_boxes = sum(len(e.get("add", e.get("with", []))) for v in collision.values() for e in v)
print(f"gaps-v1: {n_parts} parts in {len(parts)} models; {n_boxes} collision boxes in {len(collision)} models")
