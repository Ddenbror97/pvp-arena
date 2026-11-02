"""
SUBURBAN SHOWDOWN environment kit. Imported by build_suburbia.py.

Built on the shared modular kit (art/blender/map/arena_kit.py), reused unchanged: geometry buckets
(one mesh per culling section x material), the face/box/cylinder primitives with world-space box
UVs, neighbour-aware face culling, baked vertex AO, the jersey barrier and crate builders and the
emit/validation helpers. This module adds the suburban material set and dresses every gameplay
solid by its `kind`:

  Houses      lap siding (A white, B charcoal) on a concrete foundation, white trim, violet
              shutters and doors, open windows with casings, a shingled pitched roof with gables
              and a brick chimney; inside: oak floors, plaster walls and ceilings, stairs with a
              balustrade, kitchen island and counter, the front balcony on white posts.
  Garages     siding outside, painted block inside, an open door with its header, a workbench.
  Yards       lawn, hedges, mulch beds, privacy fences, the brick garden wall and BBQ, the
              woodpile, raised planter, tree trunks (the canopies are the oak model, props.py).
  Street      asphalt cul-de-sac with sidewalks and driveways, road paint and decals, the
              PVPSPINARENA cargo box on the delivery truck, the storage container, the enclosed
              trailer, jersey barriers, the monument sign.
  Perimeter   the neighbours' 2.4 m board fences (exactly the perimeter collision), a branded
              hoarding across the exit road; beyond them a ring of neighbouring houses.

Sketchfab models (bus, truck cab, cars, sheds, furniture, props, trees) are placed by props.py.

Rules (as every map): below 2.9 m inside the playable rectangle, every vertex lies within 6 cm of
a gameplay solid (no invisible walls, no visual-only cover), ground detail up to 0.13 m excepted;
flush details stand 6-45 mm proud of their face; decals 12+ mm above the floor in distinct layers.
"""
import math, os, random, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "map"))
import arena_kit as K  # noqa: E402

K.TEX = os.path.join(HERE, "build", "tex")
R = random.Random(41)
K.R = R
box, face, cylinder, quad_on, faces_of = K.box, K.face, K.cylinder, K.quad_on, K.faces_of
T = lambda n: (n, n + "_n", n + "_r")  # noqa: E731
N = lambda n: (n, n + "_n", None)  # noqa: E731

K.MATS.update({
    "siding": (T("siding"), 1.6, (1, 1, 1), 0.6, 0.0, {}),
    "siding_white": (T("siding"), 1.6, (0.97, 0.96, 0.94), 0.6, 0.0, {}),
    "siding_charcoal": (T("siding"), 1.6, (0.33, 0.33, 0.36), 0.6, 0.0, {}),
    "shingles": (N("shingles"), 2.0, (1, 1, 1), 0.85, 0.0, {}),
    "brick": (T("brick"), 2.0, (1, 1, 1), 0.85, 0.0, {}),
    "asphalt": (T("asphalt"), 5.0, (1, 1, 1), 0.85, 0.0, {}),
    "sidewalk": (T("sidewalk"), 2.0, (1, 1, 1), 0.85, 0.0, {}),
    "grass": (N("grass"), 3.0, (1, 1, 1), 0.95, 0.0, {}),
    "hedge": (N("hedge"), 1.4, (1, 1, 1), 0.9, 0.0, {}),
    "boards": (N("boards"), 1.2, (1, 1, 1), 0.85, 0.0, {}),
    "floor": (N("floor"), 1.6, (1, 1, 1), 0.55, 0.0, {}),
    "plaster": (("plaster", "plaster_n", None), 3.0, (1, 1, 1), 0.9, 0.0, {}),
    "interior": (("interior", "interior_n", None), 2.0, (1, 1, 1), 0.85, 0.0, {}),
    "plaster_warm": (("interior", "interior_n", None), 2.0, (1.0, 0.95, 0.86), 0.85, 0.0, {}),
    "plaster_cool": (("interior", "interior_n", None), 2.0, (0.84, 0.87, 0.92), 0.85, 0.0, {}),
    "ceiling": (("interior", "interior_n", None), 2.0, (1.0, 1.0, 1.0), 0.85, 0.0, {}),
    "block": (("plaster", "plaster_n", None), 1.6, (1.0, 1.0, 1.0), 0.9, 0.0, {}),
    "paint": ((None, None, None), 1, (1, 1, 1), 0.5, 0.1, {}),
    "trim_white": ((None, None, None), 1, (0.88, 0.88, 0.86), 0.45, 0.0, {}),
    "violet": ((None, None, None), 1, (0.30, 0.10, 0.62), 0.4, 0.1, {}),
    "cabinet": ((None, None, None), 1, (0.80, 0.80, 0.78), 0.4, 0.0, {}),
    "countertop": ((None, None, None), 1, (0.10, 0.10, 0.11), 0.25, 0.1, {}),
    "soil": ((None, None, None), 1, (0.16, 0.11, 0.07), 0.95, 0.0, {}),
    "rubber": ((None, None, None), 1, (0.04, 0.04, 0.045), 0.9, 0.0, {}),
    "steel_dark": ((None, None, None), 1, (0.12, 0.12, 0.13), 0.5, 0.6, {}),
    "truck_white": ((None, None, None), 1, (0.82, 0.82, 0.84), 0.45, 0.2, {}),
    "truck_wrap": (("truck_wrap", None, None), 1, (1, 1, 1), 0.45, 0.1, {}),
    "container_wrap": (("container_wrap", None, None), 1, (1, 1, 1), 0.5, 0.2, {}),
    "billboard": (("billboard", None, None), 1, (1, 1, 1), 0.6, 0.0, {}),
    "bus_wrap": (("bus_wrap", None, None), 1, (1, 1, 1), 0.4, 0.1, {}),
    "monument": (("monument", None, None), 1, (1, 1, 1), 0.6, 0.0, {}),
    "facade_sub": (("facade_sub", None, None), 12.0, (1, 1, 1), 0.85, 0.0, {}),
    "decals": (("decals", None, None), 1, (1, 1, 1), 0.9, 0.0, {"mask": True}),
    "road_paint": ((None, None, None), 1, (0.85, 0.82, 0.70), 0.7, 0.0, {}),
    "neon": ((None, None, None), 1, (0.55, 0.22, 1.0), 0.4, 0.0, {"emit": 3.0}),
})
# Tint families share one material (one draw call per section); the colour rides on the vertex
# colour with the baked AO (as FROSTLINE / CROSSFIRE).
TINT_FAMILY = {
    "siding_white": "siding", "siding_charcoal": "siding",
    "plaster_warm": "interior", "plaster_cool": "interior", "ceiling": "interior",
    **{m: "paint" for m in ("trim_white", "violet", "cabinet", "countertop", "soil", "rubber",
                            "steel_dark", "truck_white", "road_paint")},
}
FACE_TINT = {}
NO_AO = ("lamp", "neon", "banner", "glass", "decals", "truck_wrap", "container_wrap", "billboard", "bus_wrap", "monument")

SOLIDS = []      # every solid + perimeter fence (set by build)
ALL = []
ARENA = {"width": 64.0, "depth": 46.0}
HOUSE = {"a": (-25.0, -13.0, -6.0, 6.0), "b": (13.0, 25.0, -6.0, 6.0)}
GARAGE = {"a": (-24.0, -15.5, -12.0, -6.0), "b": (15.5, 24.0, -12.0, -6.0)}
EXT = {"a": "siding_white", "b": "siding_charcoal"}
INT = {"a": "plaster_warm", "b": "plaster_cool"}
SLAB0, FLOOR2, TOP, WALL = 2.75, 3.0, 5.7, 0.25
EAVE, PITCH = 0.4, 0.42
FOUND = 0.45  # concrete foundation band on the house walls


# ------------------------------------------------------------------------------- helpers
def side_of(s):
    return s.get("side") if s.get("side") in ("a", "b") else ("a" if s["x"] < 0 else "b")


def section_of(x, z):
    sx = "west" if x < -9.5 else "east" if x > 9.5 else "centre"
    sz = "north" if z < -7 else "south" if z > 7 else "mid"
    return f"{sx}-{sz}"


def inside_any(x, y, z, pad=0.0):
    return any(abs(x - o["x"]) < o["w"] / 2 + pad and abs(z - o["z"]) < o["d"] / 2 + pad
               and o["y"] - o["h"] / 2 - pad < y < o["y"] + o["h"] / 2 + pad for o in SOLIDS)


def backed(axis, plane, sign, a0, a1, y0, y1):
    """True if a flush detail on the facade (plane, facing sign) over a0..a1 x y0..y1 has wall
    behind it everywhere (corners, edge midpoints and centre sampled 1 cm inside the face)."""
    q = plane - sign * 0.01
    for a in (a0 + 0.005, (a0 + a1) / 2, a1 - 0.005):
        for y in (y0 + 0.005, (y0 + y1) / 2, y1 - 0.005):
            x, z = (q, a) if axis == "x" else (a, q)
            if not inside_any(x, y, z):
                return False
    return True


def proud(sec, mat, axis, plane, sign, a0, a1, y0, y1, depth, chamfer=0.0):
    """A box standing proud of a facade by `depth` (its back face on the facade is dropped)."""
    q = plane + sign * depth
    lo, hi = min(plane, q), max(plane, q)
    back = ("-z" if sign > 0 else "+z") if axis == "z" else ("-x" if sign > 0 else "+x")
    skip = (back, "-y") if min(y0, y1) <= 0.001 else (back,)
    if axis == "z":
        box(sec, mat, a0, a1, y0, y1, lo, hi, skip=skip, chamfer=chamfer)
    else:
        box(sec, mat, lo, hi, y0, y1, a0, a1, skip=skip, chamfer=chamfer)


def uvq(u0, u1, v0=0.0, v1=1.0, axis="z", sign=1):
    if (axis == "z" and sign < 0) or (axis == "x" and sign > 0):
        return [(u1, v0), (u0, v0), (u0, v1), (u1, v1)]
    return [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]


def image_on(sec, mat, axis, plane, sign, a0, a1, y0, y1, off=0.008, uv=(0, 1, 0, 1)):
    """A full-image quad (wraps, signs) flush on a facade, readable from its facing side."""
    quad_on(sec, mat, axis, plane + sign * off, sign, a0, a1, y0, y1, uvs=uvq(*uv, axis=axis, sign=sign))


def faces6(sec, x0, x1, y0, y1, z0, z1, mat_of, skip=()):
    """A box whose sides carry different materials (mat_of(side) -> material or None)."""
    lo, hi = (x0, y0, z0), (x1, y1, z1)
    off = (R.random(), R.random())
    for ax in range(3):
        for s, tag in ((0, "-"), (1, "+")):
            side = tag + "xyz"[ax]
            mat = mat_of(side)
            if side in skip or mat is None:
                continue
            o = [0, 0, 0]
            o[ax] = 1 if s else -1
            u, v = [i for i in range(3) if i != ax]
            pts = []
            for a, bb in ((0, 0), (1, 0), (1, 1), (0, 1)):
                p = [0, 0, 0]
                p[ax] = hi[ax] if s else lo[ax]
                p[u] = hi[u] if a else lo[u]
                p[v] = hi[v] if bb else lo[v]
                pts.append(tuple(p))
            face(sec, mat, pts, out=tuple(o), offset=off)


def vface(sec, mat, axis, plane, sign, a0, a1, y0, y1):
    """One vertical face (facade plane) with world box UVs."""
    if a1 - a0 < 1e-4 or y1 - y0 < 1e-4:
        return
    if axis == "x":
        pts = [(plane, y0, a0), (plane, y0, a1), (plane, y1, a1), (plane, y1, a0)]
        out = (sign, 0, 0)
    else:
        pts = [(a0, y0, plane), (a1, y0, plane), (a1, y1, plane), (a0, y1, plane)]
        out = (0, 0, sign)
    face(sec, mat, pts, out=out, offset=(0, 0))


def hcyl(sec, mat, axis, a0, a1, y, c, r, n=10, caps=True):
    """Horizontal cylinder along `axis` ('x' or 'z') from a0 to a1, centre height y, offset c."""
    def P(a, ang):
        dy, dc = r * math.cos(ang), r * math.sin(ang)
        return (a, y + dy, c + dc) if axis == "x" else (c + dc, y + dy, a)
    for i in range(n):
        g0, g1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        gm = (g0 + g1) / 2
        out = (0, math.cos(gm), math.sin(gm)) if axis == "x" else (math.sin(gm), math.cos(gm), 0)
        face(sec, mat, [P(a0, g0), P(a1, g0), P(a1, g1), P(a0, g1)], out=out,
             uvs=[(a0, i / n * 2), (a1, i / n * 2), (a1, (i + 1) / n * 2), (a0, (i + 1) / n * 2)])
    if caps:
        for a, sg in ((a0, -1), (a1, 1)):
            face(sec, mat, [P(a, 2 * math.pi * i / n) for i in range(n)], out=(sg, 0, 0) if axis == "x" else (0, 0, sg))


DECALS = []


def ground_decal(sec, idx, x, z, w, d, rot=0.0):
    """Flat decal 12 mm above the floor; overlapping decals stack in 1.5 mm layers."""
    rad = math.hypot(w, d) / 2
    layer = 1 + max([l for (px, pz, pr, l) in DECALS if math.hypot(px - x, pz - z) < pr + rad] or [-1])
    DECALS.append((x, z, rad, layer))
    y = 0.016 + 0.005 * layer  # > one meshopt position step over the 64 m decal mesh
    c, s_ = idx % 4, idx // 4
    u0, u1, v0, v1 = c / 4, (c + 1) / 4, 1 - (s_ + 1) / 2, 1 - s_ / 2
    cs, sn = math.cos(rot), math.sin(rot)
    pts, uvs = [], []
    for (du, dv), uv in (((-1, -1), (u0, v0)), ((1, -1), (u1, v0)), ((1, 1), (u1, v1)), ((-1, 1), (u0, v1))):
        px, pz = du * w / 2, dv * d / 2
        pts.append((x + px * cs - pz * sn, y, z + px * sn + pz * cs))
        uvs.append(uv)
    face(sec, "decals", pts, out=(0, 1, 0), uvs=uvs, shadow=False)


def thin_axis(s):
    """The axis across a wall piece (its thickness), from the wall it belongs to (a slim column
    beside a window can be narrower than the wall is thick)."""
    k, i = s.get("kind"), s["id"]
    if k in ("house-front", "house-back") or i.startswith(("garage-wall-w", "garage-wall-e", "garage-header")):
        return "x"
    if k == "house-side" or i.startswith("garage-wall-n"):
        return "z"
    return "x" if s["w"] <= s["d"] else "z"


def house_of(s):
    side = side_of(s)
    x0, x1, z0, z1 = HOUSE[side]
    return side, (x0 + x1) / 2, (z0 + z1) / 2


def hidden_sides(s):
    return K.touching(s, ALL, full=True)


# ------------------------------------------------------------------------------- house shell
def house_wall(sec, s):
    """An exterior wall piece: siding over a concrete foundation outside, plaster inside, white
    trim on the faces that frame an opening (jambs, sills, heads), casings and shutters."""
    side, cx, cz = house_of(s)
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    ax = thin_axis(s)
    out_sign = (1 if s["x"] > cx else -1) if ax == "x" else (1 if s["z"] > cz else -1)
    hid = hidden_sides(s)
    ext_side = ("+" if out_sign > 0 else "-") + ax
    int_side = ("-" if out_sign > 0 else "+") + ax
    # Exterior face, split into foundation / siding / floor-line band / siding; where the house's
    # north wall faces into the garage it is painted block below the garage roof. The two
    # finishes meet inside the garage's side walls with a 5 cm gap (no shared edge to z-fight).
    if ext_side not in hid:
        plane = (x1 if out_sign > 0 else x0) if ax == "x" else (z1 if out_sign > 0 else z0)
        a0, a1 = (z0, z1) if ax == "x" else (x0, x1)
        bands = ((0, FOUND, "concrete"), (FOUND, SLAB0, EXT[side]), (SLAB0, FLOOR2, "violet"), (FLOOR2, 99, EXT[side]))
        segs = [(a0, a1, bands)]
        if ax == "z" and abs(z0 - HOUSE[side][2]) < 1e-6:
            gx0, gx1 = GARAGE[side][0], GARAGE[side][1]
            inner = ((0, 3.0, "block"), (3.0, 99, EXT[side]))
            cuts = [(-1e9, gx0 + 0.1, bands), (gx0 + 0.15, gx1 - 0.15, inner), (gx1 - 0.1, 1e9, bands)]
            segs = [(max(a0, c0), min(a1, c1), bb) for c0, c1, bb in cuts if min(a1, c1) > max(a0, c0) + 1e-4]
        for s0, s1, bb in segs:
            for b0, b1, mat in bb:
                lo, hi = max(y0, b0), min(y1, b1)
                if hi > lo + 1e-4:
                    vface(sec, mat, ax, plane, out_sign, s0, s1, lo, hi)
    if int_side not in hid:
        plane = (x0 if out_sign > 0 else x1) if ax == "x" else (z0 if out_sign > 0 else z1)
        a0, a1 = (z0, z1) if ax == "x" else (x0, x1)
        for b0, b1 in ((0, SLAB0), (FLOOR2, TOP)):
            lo, hi = max(y0, b0), min(y1, b1)
            if hi > lo + 1e-4:
                vface(sec, INT[side], ax, plane, -out_sign, a0, a1, lo, hi)
    # Edge faces: trim where they frame an opening, else (house corners) siding.
    def edge_mat(sd):
        if sd in hid or sd in (ext_side, int_side):
            return None
        if sd == "-y":
            return "trim_white" if y0 > 0.01 else None
        if sd == "+y" and y1 >= TOP - 1e-6:
            return None  # under the roof deck
        return "trim_white"
    faces6(sec, x0, x1, y0, y1, z0, z1, edge_mat, skip=(ext_side, int_side))


OPENINGS = {}


def openings_of(side):
    if side not in OPENINGS:
        OPENINGS[side] = _openings_of(side)
    return OPENINGS[side]


def _openings_of(side):
    """Openings of a house's exterior walls, from the gaps between its wall pieces:
    (axis, plane, out_sign, a0, a1, y0, y1)."""
    x0, x1, z0, z1 = HOUSE[side]
    walls = [s for s in ALL if s.get("kind") in ("house-front", "house-back", "house-side") and side_of(s) == side]
    found = []
    for ax, plane, sg, b0, b1 in (("x", x1, 1, z0, z1), ("x", x0, -1, z0, z1), ("z", z0, -1, x0 + WALL, x1 - WALL),
                                  ("z", z1, 1, x0 + WALL, x1 - WALL)):
        if side == "b":
            plane, sg = (plane, sg) if ax == "z" else (plane, sg)
        pieces = [w for w in walls if thin_axis(w) == ax and abs((w["x"] if ax == "x" else w["z"]) -
                  (plane - sg * WALL / 2)) < 1e-3]
        # Scan a grid for holes: cells not covered by any piece.
        step = 0.05
        for yb in ((0.0, SLAB0), (FLOOR2, TOP)):
            n = int(round((b1 - b0) / step))
            cols = []
            for i in range(n):
                a = b0 + (i + 0.5) * step
                ys = []
                for j in range(int(round((yb[1] - yb[0]) / step))):
                    y = yb[0] + (j + 0.5) * step
                    covered = any(abs((a - (p["z"] if ax == "x" else p["x"]))) < (p["d"] if ax == "x" else p["w"]) / 2
                                  and abs(y - p["y"]) < p["h"] / 2 for p in pieces)
                    ys.append(covered)
                cols.append(ys)
            # Group contiguous open columns with the same open y-range.
            i = 0
            while i < n:
                ys = cols[i]
                if all(ys):
                    i += 1
                    continue
                open_idx = [j for j, c in enumerate(ys) if not c]
                ya, yb_ = yb[0] + open_idx[0] * step, yb[0] + (open_idx[-1] + 1) * step
                k = i
                while k < n and cols[k] == ys:
                    k += 1
                found.append((ax, plane, sg, b0 + i * step, b0 + k * step, ya, yb_))
                i = k
    return found


def casings(sec, side):
    """Exterior window/door casings, sill noses and shutters around each opening."""
    for ax, plane, sg, a0, a1, y0, y1 in openings_of(side):
        door = y0 < 0.05 or abs(y0 - FLOOR2) < 0.05
        t, d = 0.1, 0.03
        for b0, b1 in ((a0 - t, a0), (a1, a1 + t)):
            if backed(ax, plane, sg, b0, b1, max(y0, 0.02), y1 + t):
                proud(sec, "trim_white", ax, plane, sg, b0, b1, max(y0, 0.0), y1 + t, d)
        if backed(ax, plane, sg, a0, a1, y1, y1 + t):
            proud(sec, "trim_white", ax, plane, sg, a0, a1, y1, y1 + t, d)
        if not door and backed(ax, plane, sg, a0 - t, a1 + t, y0 - 0.06, y0):
            proud(sec, "trim_white", ax, plane, sg, a0 - t, a1 + t, y0 - 0.06, y0, 0.05)
        if not door:
            w = min(0.5, (a1 - a0) * 0.32)
            for b0, b1 in ((a0 - t - 0.04 - w, a0 - t - 0.04), (a1 + t + 0.04, a1 + t + 0.04 + w)):
                if backed(ax, plane, sg, b0, b1, y0, y1):
                    shutter(sec, ax, plane, sg, b0, b1, y0, y1)


def shutter(sec, ax, plane, sg, a0, a1, y0, y1):
    """Violet louvred shutter flush on a facade (frame + slats), 2-4 cm proud."""
    proud(sec, "violet", ax, plane, sg, a0, a1, y0, y1, 0.02)
    n = max(3, int((y1 - y0) / 0.12))
    for i in range(1, n):
        y = y0 + (y1 - y0) * i / n
        proud(sec, "violet", ax, plane + sg * 0.02, sg, a0 + 0.05, a1 - 0.05, y - 0.012, y + 0.012, 0.015)


def fake_window(sec, ax, plane, sg, a, y0, y1, w):
    """Closed window on a solid wall (casing, dark glass behind closed blinds, shutters)."""
    if not backed(ax, plane, sg, a - w / 2 - 0.65, a + w / 2 + 0.65, y0 - 0.1, y1 + 0.12):
        return
    proud(sec, "trim_white", ax, plane, sg, a - w / 2 - 0.1, a + w / 2 + 0.1, y0 - 0.06, y1 + 0.1, 0.02)
    proud(sec, "glass", ax, plane + sg * 0.02, sg, a - w / 2, a + w / 2, y0, y1, 0.004)
    for k in range(1, 9):
        y = y0 + (y1 - y0) * k / 9
        proud(sec, "cabinet", ax, plane + sg * 0.024, sg, a - w / 2, a + w / 2, y - 0.02, y + 0.02, 0.003)
    for b0, b1 in ((a - w / 2 - 0.14 - 0.45, a - w / 2 - 0.14), (a + w / 2 + 0.14, a + w / 2 + 0.14 + 0.45)):
        shutter(sec, ax, plane, sg, b0, b1, y0, y1)


def logo_panel(sec, ax, plane, sg, a, y0, y1, w):
    """PVPSPINARENA panel on a facade: dark frame, the logo face, a violet neon underline."""
    if not backed(ax, plane, sg, a - w / 2 - 0.08, a + w / 2 + 0.08, y0 - 0.12, y1 + 0.06):
        return
    proud(sec, "steel_dark", ax, plane, sg, a - w / 2 - 0.08, a + w / 2 + 0.08, y0 - 0.06, y1 + 0.06, 0.025)
    image_on(sec, "container_wrap", ax, plane + sg * 0.025, sg, a - w / 2, a + w / 2, y0, y1, off=0.004,
             uv=(0.04, 0.96, 0.22, 0.98))
    proud(sec, "neon", ax, plane, sg, a - w / 2, a + w / 2, y0 - 0.12, y0 - 0.08, 0.03)


def roof(side):
    """Pitched shingle roof over the roof deck (ridge along x), gables in siding, fascia and
    soffits in white, a brick chimney; all above reach."""
    sec = "roofs"
    x0, x1, z0, z1 = HOUSE[side]
    X0, X1, Z0, Z1 = x0 - EAVE, x1 + EAVE, z0 - EAVE, z1 + EAVE
    y_e, y_r = TOP + 0.3, TOP + 0.3 + (Z1 - Z0) / 2 * PITCH
    zc = (Z0 + Z1) / 2
    # Deck: soffit, fascia, a violet LED strip along the fascia's lower edge.
    box(sec, "trim_white", X0, X1, TOP, TOP + 0.3, Z0, Z1, skip=("+y", "-y"))
    # Soffit: only the overhang ring (inside the walls the ceiling is the interior's).
    for (a0, a1, b0, b1) in ((X0, X1, Z0, z0), (X0, X1, z1, Z1), (X0, x0, z0, z1), (x1, X1, z0, z1)):
        face(sec, "trim_white", [(a0, TOP, b0), (a1, TOP, b0), (a1, TOP, b1), (a0, TOP, b1)], out=(0, -1, 0))
    for zz, sz in ((Z0, -1), (Z1, 1)):
        box(sec, "neon", X0, X1, TOP - 0.03, TOP + 0.02, zz - (0.03 if sz < 0 else 0), zz + (0.03 if sz > 0 else 0))
    for xx, sx in ((X0, -1), (X1, 1)):
        box(sec, "neon", xx - (0.03 if sx < 0 else 0), xx + (0.03 if sx > 0 else 0), TOP - 0.03, TOP + 0.02, Z0, Z1)
    # Slopes (with a 6 cm shingle thickness at the eaves).
    for sgn in (-1, 1):
        ze = zc + sgn * (Z1 - Z0) / 2
        face(sec, "shingles", [(X0 - 0.05, y_e, ze + sgn * 0.08), (X1 + 0.05, y_e, ze + sgn * 0.08),
                               (X1 + 0.05, y_r + 0.02, zc), (X0 - 0.05, y_r + 0.02, zc)], out=(0, 1, sgn))
        face(sec, "trim_white", [(X0 - 0.05, y_e - 0.06, ze + sgn * 0.08), (X1 + 0.05, y_e - 0.06, ze + sgn * 0.08),
                                 (X1 + 0.05, y_e, ze + sgn * 0.08), (X0 - 0.05, y_e, ze + sgn * 0.08)], out=(0, 0, sgn))
    # Gable triangles (siding) on the house walls' planes, fascia boards along the rakes.
    for xg, sx in ((x0, -1), (x1, 1)):
        face(sec, EXT[side], [(xg, y_e, Z0 + 0.02), (xg, y_e, Z1 - 0.02), (xg, y_r, zc)], out=(sx, 0, 0))
        for sgn in (-1, 1):
            ze = zc + sgn * (Z1 - Z0) / 2
            xe = X0 - 0.05 if sx < 0 else X1 + 0.05
            face(sec, "trim_white", [(xe, y_e - 0.06, ze + sgn * 0.08), (xe, y_e, ze + sgn * 0.08),
                                     (xe, y_r + 0.02, zc), (xe, y_r - 0.12, zc)], out=(sx, 0, 0))
    # Ridge cap.
    box(sec, "shingles", X0 - 0.02, X1 + 0.02, y_r - 0.02, y_r + 0.1, zc - 0.14, zc + 0.14)
    # Brick chimney through the back slope.
    cx = x0 + 1.6 if side == "a" else x1 - 1.6
    cz = zc + 2.2
    box(sec, "brick", cx - 0.45, cx + 0.45, y_e + 0.5, y_r + 1.3, cz - 0.4, cz + 0.4, skip=("-y",))
    box(sec, "concrete", cx - 0.52, cx + 0.52, y_r + 1.3, y_r + 1.42, cz - 0.47, cz + 0.47)


def corners(sec, side):
    x0, x1, z0, z1 = HOUSE[side]
    for cx, sx in ((x0, -1), (x1, 1)):
        for cz, sz in ((z0, -1), (z1, 1)):
            lo_x, hi_x = sorted((cx - sx * 0.1, cx + sx * 0.025))
            lo_z, hi_z = sorted((cz - sz * 0.1, cz + sz * 0.025))
            box(sec, "trim_white", lo_x, hi_x, FOUND, TOP, lo_z, hi_z)


def door_leaf(sec, side, ax, plane, sg, a0, a1, y0, mat="violet"):
    """An open door leaf swung flat against the inner face beside its opening (flush, 4 cm)."""
    w, h = a1 - a0, 2.1
    inner = plane - sg * WALL
    for b0, b1 in ((a1 + 0.02, a1 + 0.02 + w), (a0 - 0.02 - w, a0 - 0.02)):
        q = inner - sg * 0.1   # the room in front of the leaf must be open (no partition)
        clear = all(not inside_any(*((q, y0 + 1.0, a) if ax == "x" else (a, y0 + 1.0, q)))
                    for a in (b0 - 0.05, (b0 + b1) / 2, b1 + 0.05))
        if clear and backed(ax, inner, -sg, b0, b1, y0 + 0.02, y0 + h):
            proud(sec, mat, ax, inner, -sg, b0, b1, y0 + 0.01, y0 + h, 0.04)
            proud(sec, "steel", ax, inner - sg * 0.04, -sg, (b0 + b1) / 2 - 0.02, (b0 + b1) / 2 + 0.02, y0 + 1.0, y0 + 1.06, 0.02)
            return


def interior(side):
    """Ceilings, lights, baseboard-free plaster interior; the door leaves."""
    sec = section_of(-19 if side == "a" else 19, 0)
    x0, x1, z0, z1 = HOUSE[side]
    # Upstairs ceiling: underside of the roof deck between the walls.
    face(sec, "ceiling", [(x0 + WALL, TOP, z0 + WALL), (x1 - WALL, TOP, z0 + WALL), (x1 - WALL, TOP, z1 - WALL),
                          (x0 + WALL, TOP, z1 - WALL)], out=(0, -1, 0))
    for (lx, lz) in ((x0 + 3.2, 2.6), (x1 - 3.0, 0.0), (x0 + 3.2, -2.0)):
        cylinder(sec, "lamp", lx, lz, TOP - 0.04, TOP, 0.22, n=12, caps=(True, False))
    for ax, plane, sg, a0, a1, y0, y1 in openings_of(side):
        if y0 < 0.05 or abs(y0 - FLOOR2) < 0.05:
            door_leaf(sec, side, ax, plane, sg, a0, a1, y0, "violet" if y0 < 0.05 else "trim_white")


# ------------------------------------------------------------------------------- house parts
def slab(sec, s):
    """Upper floor slab: oak boards on top, plaster ceiling below, trim on exposed edges."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    hid = hidden_sides(s)
    faces6(sec, x0, x1, y0, y1, z0, z1, lambda sd: None if sd in hid else
           ("floor" if sd == "+y" else "ceiling" if sd == "-y" else "trim_white"))


def stair(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    hid = hidden_sides(s)
    faces6(sec, x0, x1, y0, y1, z0, z1, lambda sd: None if sd in hid or sd == "-y" else
           ("floor" if sd == "+y" else "trim_white"))


def partition(sec, s):
    side = side_of(s)
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    hid = hidden_sides(s)
    faces6(sec, x0, x1, y0, y1, z0, z1, lambda sd: None if sd in hid or sd == "-y" and y0 < 0.01 else
           (INT[side] if sd in ("-x", "+x") else "trim_white"))


def balustrade(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    hid = hidden_sides(s)
    faces6(sec, x0, x1, y0, y1 - 0.06, z0, z1, lambda sd: None if sd in hid or sd in ("-y", "+y") else "trim_white")
    box(sec, "wood", x0 - 0.02, x1 + 0.02, y1 - 0.06, y1, z0 - 0.02, z1 + 0.02, skip=tuple(hid))


def cabinet(sec, s):
    """Kitchen island / counter: white base cabinets with doors, dark stone top."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    hid = hidden_sides(s)
    box(sec, "cabinet", x0 + 0.02, x1 - 0.02, y0, y1 - 0.04, z0 + 0.02, z1 - 0.02, skip=("-y", "+y") + tuple(hid))
    box(sec, "countertop", x0, x1, y1 - 0.04, y1, z0, z1, skip=tuple(hid))
    # Door seams and handles on the open long faces.
    along_x = (x1 - x0) >= (z1 - z0)
    for sg in (-1, 1):
        sd = ("+" if sg > 0 else "-") + ("z" if along_x else "x")
        if sd in hid:
            continue
        a0, a1 = (x0, x1) if along_x else (z0, z1)
        plane = ((z1 if sg > 0 else z0) if along_x else (x1 if sg > 0 else x0)) + sg * (-0.02)
        n = max(1, int((a1 - a0) / 0.6))
        for i in range(n):
            b0, b1 = a0 + (a1 - a0) * i / n + 0.03, a0 + (a1 - a0) * (i + 1) / n - 0.03
            proud(sec, "cabinet", "z" if along_x else "x", plane, sg, b0, b1, y0 + 0.1, y1 - 0.08, 0.015)
            proud(sec, "steel", "z" if along_x else "x", plane + sg * 0.015, sg, (b0 + b1) / 2 - 0.1, (b0 + b1) / 2 + 0.1,
                  y1 - 0.2, y1 - 0.17, 0.02)


def porch(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    kind = s["kind"]
    hid = hidden_sides(s)
    if kind == "balcony":
        faces6(sec, x0, x1, y0, y1, z0, z1, lambda sd: None if sd in hid else
               ("floor" if sd == "+y" else "trim_white"))
    elif kind == "porch-post":
        box(sec, "trim_white", x0 + 0.02, x1 - 0.02, 0.3, y1 - 0.2, z0 + 0.02, z1 - 0.02, skip=tuple(hid), chamfer=0.02)
        box(sec, "trim_white", x0, x1, 0, 0.3, z0, z1, skip=("-y",) + tuple(hid))
        box(sec, "trim_white", x0, x1, y1 - 0.2, y1, z0, z1, skip=tuple(hid))
    else:  # balcony rail: white panel railing with a cap and balusters in relief
        faces6(sec, x0, x1, y0, y1 - 0.06, z0, z1, lambda sd: None if sd in hid or sd in ("-y", "+y") else "trim_white")
        touch = K.touching(s, ALL)
        g = lambda sd: 0.0 if sd in touch else 0.02  # noqa: E731
        box(sec, "trim_white", x0 - g("-x"), x1 + g("+x"), y1 - 0.06, y1, z0 - g("-z"), z1 + g("+z"), skip=tuple(hid))
        ax = "z" if (x1 - x0) > (z1 - z0) else "x"
        for sg in (-1, 1):
            sd = ("+" if sg > 0 else "-") + ("z" if ax == "z" else "x")
            if sd in hid:
                continue
            plane = (z1 if sg > 0 else z0) if ax == "z" else (x1 if sg > 0 else x0)
            a0, a1 = (x0, x1) if ax == "z" else (z0, z1)
            n = int((a1 - a0) / 0.14)
            for i in range(1, n):
                a = a0 + (a1 - a0) * i / n
                proud(sec, "trim_white", ax, plane, sg, a - 0.025, a + 0.025, y0 + 0.08, y1 - 0.12, 0.015)


def garage_wall(sec, s):
    side = side_of(s)
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    gx0, gx1, gz0, gz1 = GARAGE[side]
    gcx, gcz = (gx0 + gx1) / 2, (gz0 + gz1) / 2
    hid = hidden_sides(s)
    ax = thin_axis(s)
    out_sign = (1 if s["x"] > gcx else -1) if ax == "x" else (1 if s["z"] > gcz else -1)

    def mat(sd):
        if sd in hid:
            return None
        if sd == "-y":
            return "trim_white" if y0 > 0.01 else None
        if sd == "+y":
            return "trim_white"
        if sd[1] == ax:
            outward = (sd[0] == "+") == (out_sign > 0)
            return EXT[side] if outward else "block"
        return "trim_white"
    faces6(sec, x0, x1, y0, y1, z0, z1, mat)
    if s["kind"] == "garage-wall" and y0 < 0.01:
        plane = (x1 if out_sign > 0 else x0) if ax == "x" else (z1 if out_sign > 0 else z0)
        a0, a1 = (z0, z1) if ax == "x" else (x0, x1)
        if ("+" if out_sign > 0 else "-") + ax not in hid:
            proud(sec, "concrete", ax, plane, out_sign, a0, a1, 0, FOUND, 0.012)


def garage_roof(side):
    """Low-slope garage roof (bullet-only deck at 3.0..3.3): shingles, fascia, painted ceiling."""
    sec = "roofs"
    s = next(o for o in ALL if o["id"] == f"garage-roof-{side}")
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "trim_white", x0, x1, y0, y1, z0, z1, skip=("+y", "-y"))
    face(sec, "ceiling", [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], out=(0, -1, 0))
    face(sec, "shingles", [(x0 - 0.04, y1, z0 - 0.04), (x1 + 0.04, y1, z0 - 0.04), (x1 + 0.04, y1 + 0.35, z1),
                           (x0 - 0.04, y1 + 0.35, z1)], out=(0, 1, 0))
    for xe, sx in ((x0 - 0.04, -1), (x1 + 0.04, 1)):
        face(sec, "trim_white", [(xe, y1, z0 - 0.04), (xe, y1, z1), (xe, y1 + 0.35, z1)], out=(sx, 0, 0))


def workbench(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    hid = hidden_sides(s)
    box(sec, "violet", x0 + 0.02, x1 - 0.02, 0, y1 - 0.05, z0, z1 - 0.02, skip=("-y",) + tuple(hid))
    box(sec, "wood", x0, x1, y1 - 0.05, y1, z0, z1, skip=tuple(hid))
    for i in range(4):
        a0 = x0 + 0.06 + (x1 - x0 - 0.12) * i / 4
        proud(sec, "steel_dark", "z", z1 - 0.02, 1, a0 + 0.02, a0 + (x1 - x0 - 0.12) / 4 - 0.02, 0.5, 0.82, 0.012)


# ------------------------------------------------------------------------------- yard and street
def hedge(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    hid = hidden_sides(s)
    box(sec, "hedge", x0, x1, 0, y1, z0, z1, skip=("-y",) + tuple(hid), chamfer=0.12)


def shrub_bed(sec, s):
    """Mulched bed with a timber edge (the shrubs are bush-pack models, props.py)."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    hid = hidden_sides(s)
    box(sec, "wood", x0, x1, 0, 0.18, z0, z1, skip=("-y",) + tuple(hid))
    face(sec, "soil", [(x0 + 0.04, 0.181, z0 + 0.04), (x1 - 0.04, 0.181, z0 + 0.04), (x1 - 0.04, 0.181, z1 - 0.04),
                       (x0 + 0.04, 0.181, z1 - 0.04)], out=(0, 1, 0))


def privacy_fence(sec, s):
    """2 m board-on-board privacy fence: posts every ~2.4 m, boards both faces, a top cap."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    along_x = (x1 - x0) > (z1 - z0)
    hid = hidden_sides(s)
    # Boards between the end posts (the posts close the ends: no coplanar end faces).
    box(sec, "boards", x0 + (0.05 if along_x else 0.02), x1 - (0.05 if along_x else 0.02), 0, y1 - 0.06,
        z0 + (0.02 if along_x else 0.05), z1 - (0.02 if along_x else 0.05), skip=("-y", "+y") + tuple(hid))
    box(sec, "wood", x0, x1, y1 - 0.06, y1, z0, z1, skip=tuple(hid))
    a0, a1 = (x0, x1) if along_x else (z0, z1)
    n = max(1, round((a1 - a0) / 2.4))
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        b0, b1 = max(a0, a - 0.05), min(a1, a + 0.05)
        if along_x:
            box(sec, "wood", b0, b1, 0, y1 - 0.06, z0, z1, skip=("-y", "+y"))
        else:
            box(sec, "wood", x0, x1, 0, y1 - 0.06, b0, b1, skip=("-y", "+y"))


def garden_wall(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    K.capped(sec, "brick", "concrete", x0, x1, y0, y1 - 0.08, z0, z1, cap=0.03, cap_h=0.08)


def bbq(sec, s):
    """Built-in brick BBQ: brick body, steel grill hood, a violet utensil rail."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "brick", x0, x1, 0, 0.82, z0, z1, skip=("-y",))
    box(sec, "concrete", x0, x1, 0.82, 0.88, z0, z1)
    box(sec, "steel_dark", x0 + 0.04, x1 - 0.04, 0.88, y1 - 0.05, z0 + 0.04, z1 - 0.04, chamfer=0.03)
    box(sec, "steel", (x0 + x1) / 2 - 0.15, (x0 + x1) / 2 + 0.15, y1 - 0.05, y1, (z0 + z1) / 2 - 0.03, (z0 + z1) / 2 + 0.03)


def woodpile(sec, s):
    """Stacked firewood: rows of logs filling the stack, end grain on the open faces."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    along_z = (z1 - z0) >= (x1 - x0)
    box(sec, "wood", x0 + 0.04, x1 - 0.04, 0, y1 - 0.08, z0 + 0.04, z1 - 0.04, skip=("-y",))
    r = 0.09
    depth0, depth1 = (x0, x1) if along_z else (z0, z1)
    a0, a1 = (z0, z1) if along_z else (x0, x1)
    rows = int((y1 - 0.02) / (2 * r))
    for j in range(rows):
        y = r + j * 2 * r * 0.98
        a = a0 + r + (r if j % 2 else 0)
        while a + r <= a1 + 1e-6:
            hcyl(sec, "wood", "x" if along_z else "z", depth0, depth1, y, a, r * 0.98, n=7)
            a += 2 * r


def planter(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "boards", x0, x1, 0, y1 - 0.04, z0, z1, skip=("-y", "+y"))
    box(sec, "wood", x0 - 0.02, x1 + 0.02, y1 - 0.04, y1, z0 - 0.02, z1 + 0.02, skip=("+y",))
    face(sec, "soil", [(x0 + 0.05, y1 - 0.05, z0 + 0.05), (x1 - 0.05, y1 - 0.05, z0 + 0.05), (x1 - 0.05, y1 - 0.05, z1 - 0.05),
                       (x0 + 0.05, y1 - 0.05, z1 - 0.05)], out=(0, 1, 0))
    face(sec, "wood", [(x0, y1, z0), (x1, y1, z0), (x1, y1, z0 + 0.05), (x0, y1, z0 + 0.05)], out=(0, 1, 0))
    face(sec, "wood", [(x0, y1, z1 - 0.05), (x1, y1, z1 - 0.05), (x1, y1, z1), (x0, y1, z1)], out=(0, 1, 0))
    face(sec, "wood", [(x0, y1, z0 + 0.05), (x0 + 0.05, y1, z0 + 0.05), (x0 + 0.05, y1, z1 - 0.05), (x0, y1, z1 - 0.05)], out=(0, 1, 0))
    face(sec, "wood", [(x1 - 0.05, y1, z0 + 0.05), (x1, y1, z0 + 0.05), (x1, y1, z1 - 0.05), (x1 - 0.05, y1, z1 - 0.05)], out=(0, 1, 0))


def trunk(sec, s):
    """Tree trunk inside its collision post (the canopy is the oak model above reach)."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    r = min(x1 - x0, z1 - z0) / 2
    cylinder(sec, "wood", cx, cz, 0, 0.5, r + 0.04, r * 0.92, n=10, caps=(False, False))
    cylinder(sec, "wood", cx, cz, 0.5, y1, r * 0.92, r * 0.62, n=10, caps=(False, True))


def cargo_box(sec):
    """The delivery truck's PVPSPINARENA cargo box over the truck-* solids: white box with the
    violet wrap on its long faces, the open side door with a roll-up shutter, the steps, an
    underride skirt down to the chassis."""
    get = lambda i: next(o for o in ALL if o["id"] == i)  # noqa: E731
    fl = get("truck-floor")
    x0, x1, _, _, z0, z1 = faces_of(fl)
    roof_ = get("truck-roof")
    yt = roof_["y"] + roof_["h"] / 2
    # Floor slab: skirt (sides) and the cargo floor.
    faces6(sec, x0, x1, 0.2, 0.9, z0, z1, lambda sd: None if sd == "-y" else ("floor" if sd == "+y" else "steel_dark"))
    # Walls: outer faces in white / wrap, inner faces painted, edges trimmed.
    for o in ALL:
        if not o["id"].startswith(("truck-wall", "truck-end", "truck-door", "truck-roof")):
            continue
        a, b, c, d, e, f = faces_of(o)
        faces6(sec, a, b, c, d, e, f, lambda sd, o=o: "truck_white")
    # Wrap on the closed long face (north) and both halves of the door side.
    image_on(sec, "truck_wrap", "z", z0, -1, x0 + 0.1, x1 - 0.1, 1.0, yt - 0.12)
    image_on(sec, "truck_wrap", "x", x0, -1, z0 + 0.1, z1 - 0.1, 1.2, yt - 0.3, uv=(0.3, 0.7, 0.05, 0.95))
    image_on(sec, "truck_wrap", "x", x1, 1, z0 + 0.1, z1 - 0.1, 1.2, yt - 0.3, uv=(0.3, 0.7, 0.05, 0.95))
    for (a0, a1) in ((x0 + 0.1, -2.0 - 0.05), (2.0 + 0.05, x1 - 0.1)):
        proud(sec, "violet", "z", z1, 1, a0, a1, 2.55, 2.75, 0.008)
        proud(sec, "violet", "z", z1, 1, a0, a1, 1.15, 1.25, 0.008)
    # Roll-up shutter tucked under the door head; violet door frame.
    proud(sec, "violet", "z", z1, 1, -2.05, -2.0, 0.9, 3.0, 0.03)
    proud(sec, "violet", "z", z1, 1, 2.0, 2.05, 0.9, 3.0, 0.03)
    # Steps (diamond plate).
    for o in ALL:
        if o["id"].startswith("truck-step"):
            a, b, c, d, e, f = faces_of(o)
            faces6(sec, a, b, c, d, e, f, lambda sd: None if sd == "-y" else ("steel" if sd == "+y" else "steel_dark"))
    # Inside: tie-down rails and a few boxes are props (props.py).
    for y in (1.4, 2.2):
        proud(sec, "steel", "z", z0 + 0.12, 1, x0 + 0.2, x1 - 0.2, y, y + 0.05, 0.03)


def container(sec, s):
    """Portable storage container: branded panels, steel frame and corner posts."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "steel_dark", x0, x1, 0, 0.12, z0, z1, skip=("-y",))
    box(sec, "truck_white", x0 + 0.02, x1 - 0.02, 0.12, y1 - 0.08, z0 + 0.02, z1 - 0.02, skip=("-y", "+y"))
    box(sec, "steel_dark", x0, x1, y1 - 0.08, y1, z0, z1)
    for cx in (x0, x1 - 0.08):
        for cz in (z0, z1 - 0.08):
            box(sec, "steel_dark", cx, cx + 0.08, 0.12, y1 - 0.08, cz, cz + 0.08)
    for sg in (-1, 1):
        plane = x1 if sg > 0 else x0
        image_on(sec, "container_wrap", "x", plane - sg * 0.02, sg, z0 + 0.15, z1 - 0.15, 0.25, y1 - 0.2, off=0.022)
    for sg in (-1, 1):
        plane = z1 if sg > 0 else z0
        image_on(sec, "bus_wrap", "z", plane - sg * 0.02, sg, x0 + 0.12, x1 - 0.12, 0.6, 1.8, off=0.022, uv=(0.15, 0.85, 0, 1))


def trailer(sec, s):
    """Enclosed utility trailer: white box on a dark chassis, violet stripe, tyres in the skirt."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "steel_dark", x0, x1, 0.15, 0.45, z0, z1)
    box(sec, "truck_white", x0, x1, 0.45, y1 - 0.06, z0, z1, skip=("-y",), chamfer=0.04)
    box(sec, "truck_white", x0 + 0.03, x1 - 0.03, y1 - 0.06, y1, z0 + 0.03, z1 - 0.03, chamfer=0.03)
    for sg in (-1, 1):
        plane = z1 if sg > 0 else z0
        proud(sec, "violet", "z", plane, sg, x0 + 0.1, x1 - 0.1, 0.75, 0.9, 0.012)
    cx = (x0 + x1) / 2
    for sg in (-1, 1):
        zc = (z1 - 0.18) if sg > 0 else (z0 + 0.18)
        hcyl(sec, "rubber", "z", zc - 0.13, zc + 0.13, 0.3, cx, 0.3, n=12)


def jersey(sec, s):
    K.jersey(sec, s)


def monument(sec, s):
    """PVPSPINARENA monument sign: brick plinth and piers, the stone face both ways, a cap."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "brick", x0, x1, 0, 0.6, z0, z1, skip=("-y",))
    for a0, a1 in ((x0, x0 + 0.5), (x1 - 0.5, x1)):
        box(sec, "brick", a0, a1, 0.6, y1 - 0.1, z0, z1, skip=("-y",))
    box(sec, "steel_dark", x0 + 0.5, x1 - 0.5, 0.6, y1 - 0.1, z0 + 0.05, z1 - 0.05, skip=("-y",))
    box(sec, "concrete", x0 - 0.05, x1 + 0.05, y1 - 0.1, y1, z0 - 0.05, z1 + 0.05)
    for sg in (-1, 1):
        plane = (z1 - 0.05) if sg > 0 else (z0 + 0.05)
        image_on(sec, "monument", "z", plane, sg, x0 + 0.55, x1 - 0.55, 0.7, y1 - 0.2, off=0.012)
        proud(sec, "lamp", "z", plane, sg, x0 + 0.55, x1 - 0.55, 0.62, 0.66, 0.015)


def billboard():
    """The PVPSPINARENA billboard on the radio tower, both faces, steel frame (above reach)."""
    sec = "roofs"
    t = next(o for o in ALL if o["id"] == "tower-base")
    x, z = t["x"], t["z"]
    zf, zb = z + 1.0, z + 0.85
    box(sec, "steel_dark", x - 3.75, x + 3.75, 9.25, 12.25, zb, zf)
    image_on(sec, "billboard", "z", zf, 1, x - 3.6, x + 3.6, 9.4, 12.1, off=0.01)
    image_on(sec, "billboard", "z", zb, -1, x - 3.6, x + 3.6, 9.4, 12.1, off=0.01)
    for lx in (-2.4, 0.0, 2.4):
        box(sec, "steel_dark", x + lx - 0.03, x + lx + 0.03, 12.25, 12.32, zf, zf + 0.6)
        box(sec, "lamp", x + lx - 0.2, x + lx + 0.2, 12.18, 12.25, zf + 0.45, zf + 0.62)


def bus_wraps():
    """PVPSPINARENA wraps on the school bus's lower side panels (1.6 cm off the paint)."""
    b = next(o for o in ALL if o["id"] == "bus-body")
    for sg in (-1, 1):
        plane = sg * 1.176
        for z0, z1 in ((1.6, 5.6), (5.9, 9.9)):
            quad_on("centre-mid", "bus_wrap", "x", plane, sg, z0, z1, 0.82, 1.82, uvs=uvq(0, 1, 0, 1, "x", sg))


def tower_base(sec, s):
    """The transmitter hut round the radio tower's foot (the lattice above is the Sketchfab
    model): rendered block walls exactly on the collision box, a steel door, a warning sign,
    a violet band; the lattice rises out of its roof."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "concrete", x0, x1, 0, y1 - 0.12, z0, z1, skip=("-y",))
    box(sec, "steel_dark", x0 - 0.03, x1 + 0.03, y1 - 0.12, y1, z0 - 0.03, z1 + 0.03)
    for sg in (-1, 1):
        plane = z1 if sg > 0 else z0
        proud(sec, "steel_dark", "z", plane, sg, -0.45, 0.45, 0.0, 2.1, 0.02)
        proud(sec, "violet", "z", plane, sg, x0, x1, 2.3, 2.45, 0.012)
        proud(sec, "road_paint", "z", plane + sg * 0.02, sg, -0.18, 0.18, 1.45, 1.75, 0.006)


# ------------------------------------------------------------------------------- dispatch
SKIP_KINDS = {
    # dressed by props.py (Sketchfab models)
    "car", "car-b", "car-cabin", "car-ring", "car-ring-b", "bus-hood", "bus-body", "truck-cab", "truck-hood",
    "shed", "shed-ridge", "utility-pole", "mailbox", "hydrant", "street-lamp", "picnic-table", "wheelie-bins",
    "dumpster", "sofa", "fireplace", "bed", "headboard", "wardrobe", "dresser", "cardboard-boxes",
    # dressed as a whole elsewhere
    "roof", "gable", "garage-roof", "truck-floor", "truck-wall", "truck-roof", "truck-step",
}


def dress(sec, s):
    k = s["kind"]
    if k in SKIP_KINDS:
        return
    if k in ("house-front", "house-back", "house-side"):
        house_wall(sec, s)
    elif k == "house-floor2":
        slab(sec, s)
    elif k == "stair":
        stair(sec, s)
    elif k == "partition":
        partition(sec, s)
    elif k == "balustrade":
        balustrade(sec, s)
    elif k in ("kitchen-island", "kitchen-counter"):
        cabinet(sec, s)
    elif k in ("balcony", "porch-post", "balcony-rail"):
        porch(sec, s)
    elif k in ("garage-wall", "garage-header"):
        garage_wall(sec, s)
    elif k == "workbench":
        workbench(sec, s)
    elif k == "hedge":
        hedge(sec, s)
    elif k == "shrub-bed":
        shrub_bed(sec, s)
    elif k in ("privacy-fence",):
        privacy_fence(sec, s)
    elif k == "picket-fence":
        pass  # props.py (picket fence model)
    elif k == "garden-wall":
        garden_wall(sec, s)
    elif k == "bbq":
        bbq(sec, s)
    elif k == "woodpile":
        woodpile(sec, s)
    elif k == "planter":
        planter(sec, s)
    elif k == "tree":
        trunk(sec, s)
    elif k == "storage-container":
        container(sec, s)
    elif k == "utility-trailer":
        trailer(sec, s)
    elif k == "crate":
        K.crate_stack(sec, s)
    elif k in ("jersey-barrier", "barricade"):
        jersey(sec, s)
    elif k == "monument-sign":
        monument(sec, s)
    elif k == "tower-base":
        tower_base(sec, s)
    else:
        raise ValueError(f"no dressing for kind {k!r} ({s['id']})")


# ------------------------------------------------------------------------------- ground
# Kinds whose dressing closes the ground under their footprint (its floor cells are dropped).
COVERS = {"house-front", "house-back", "house-side", "partition", "stair", "garage-wall", "hedge",
          "storage-container", "kitchen-island", "kitchen-counter", "monument-sign", "garden-wall",
          "privacy-fence", "bbq", "woodpile", "planter", "workbench", "jersey-barrier", "barricade",
          "shrub-bed"}
STREET_C, STREET_R = (0.0, 3.5), 12.2


def ground_mat(cx, cz):
    ax = abs(cx)
    if 13 < ax < 25 and -6 < cz < 6:
        return "floor"
    if 15.5 < ax < 24 and -12 < cz < -6:
        return "concrete"
    d = math.hypot(cx - STREET_C[0], cz - STREET_C[1])
    if d < STREET_R or (ax < 5.4 and cz > STREET_C[1]) or (ax < 9.0 and -16.0 < cz < STREET_C[1]) or cz < -16.0:
        return "asphalt"
    if d < STREET_R + 1.6 or (ax < 7.0 and cz > STREET_C[1]) or (ax < 10.6 and -16.0 < cz < STREET_C[1]):
        return "sidewalk"
    if 9.5 < ax < 15.5 and -11.5 < cz < -6.5:           # driveway
        return "concrete"
    if 9.5 < ax < 13.0 and -0.8 < cz < 0.8:              # front walk
        return "sidewalk"
    if 25.0 < ax < 27.4 and -2.0 < cz < 4.6:             # back patio
        return "sidewalk"
    if 25.0 < ax < 31.6 and -7.4 < cz < -4.2:            # picnic patio
        return "sidewalk"
    if 13.0 < ax < 24.0 and -16.0 < cz < -12.0:          # side passage
        return "sidewalk"
    return "grass"


def ground(A, solids, walls):
    """Floor on a 0.5 m grid with per-zone materials and baked contact AO."""
    import numpy as np
    hw, hd = A["width"] / 2, A["depth"] / 2
    step = 0.5
    xs = np.arange(-hw, hw + 1e-6, step)
    zs = np.arange(-hd, hd + 1e-6, step)
    gx, gz = np.meshgrid(xs, zs, indexing="ij")
    dist = np.full(gx.shape, 9.0)
    for o in list(solids) + list(walls):
        if o["y"] - o["h"] / 2 > 0.05 or o["h"] < 0.4:
            continue
        dx = np.maximum(np.abs(gx - o["x"]) - o["w"] / 2, 0)
        dz = np.maximum(np.abs(gz - o["z"]) - o["d"] / 2, 0)
        dist = np.minimum(dist, np.hypot(dx, dz))
    ao = 1 - 0.4 * np.exp(-dist / 0.5)
    for (bx0, bx1, bz0, bz1) in list(HOUSE.values()) + list(GARAGE.values()):
        inside = (gx > bx0) & (gx < bx1) & (gz > bz0) & (gz < bz1)
        ao = np.where(inside, ao * 0.8, ao)
    for i in range(len(xs)):
        for k in range(len(zs)):
            K.AO[(round(float(xs[i]), 3), round(float(zs[k]), 3))] = float(ao[i, k])
    for i in range(len(xs) - 1):
        for k in range(len(zs) - 1):
            x0, x1, z0, z1 = float(xs[i]), float(xs[i + 1]), float(zs[k]), float(zs[k + 1])
            cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
            if any(abs(cx - o["x"]) + step / 2 <= o["w"] / 2 and abs(cz - o["z"]) + step / 2 <= o["d"] / 2
                   and o["y"] - o["h"] / 2 < 0.05 and o["layer"] == "box" and o["kind"] in COVERS for o in solids):
                continue
            face("ground", ground_mat(cx, cz), [(x0, 0, z0), (x0, 0, z1), (x1, 0, z1), (x1, 0, z0)], out=(0, 1, 0), offset=(0, 0))


def street_details():
    """Road paint, curbs' drain grates, manholes, oil stains, tyre marks, leaves, stencils."""
    g = "ground"
    ground_decal(g, 1, 0.0, 12.6, 0.9, 0.9)
    ground_decal(g, 1, 0.0, -14.0, 0.9, 0.9)
    for x, z, rot in ((-7.6, -5.2, 0.0), (7.6, -5.2, 0.0), (-12.6, -9.1, 1.57), (12.6, -9.1, 1.57), (0.0, -11.2, 1.57)):
        ground_decal(g, 0, x, z, 2.2, 3.4, rot)
    for x, z in ((-9.6, 6.6), (9.6, 6.6), (-9.6, -12.2), (9.6, -12.2)):
        ground_decal(g, 4, x, z, 0.9, 0.5, 0.0)
        ground_decal(g, 7, x + (0.7 if x < 0 else -0.7), z, 0.8, 0.8, 1.57 if x < 0 else -1.57)
    for x, z, rot in ((-3.2, 17.0, 0.0), (3.2, 18.0, 3.14)):
        ground_decal(g, 5, x, z, 1.2, 2.4, rot)
    for x, z, rot in ((-4.0, -4.0, 0.4), (5.0, 9.0, -0.6), (-11.5, -13.6, 1.2), (12.0, 13.5, 0.3)):
        ground_decal(g, 3, x, z, 1.4, 4.0, rot)
    for x, z in ((-16.0, 18.5), (15.5, 19.0), (-11.0, 21.0), (12.0, 20.4), (-29.0, 13.0), (29.5, 12.0)):
        ground_decal(g, 6, x, z, 2.6, 2.6, R.uniform(0, 3))
    for x, z in ((-6.0, 1.0), (6.5, -2.0), (0.5, 16.0), (-2.0, -18.0), (20.0, -19.0), (-21.0, -18.5)):
        ground_decal(g, 2, x, z, 3.0, 3.0, R.uniform(0, 3))
    # Centre line of the exit road (dashes) and the stop bar.
    for z in range(16, 23, 2):
        face(g, "road_paint", [(-0.06, 0.006, z), (0.06, 0.006, z), (0.06, 0.006, z + 1.0), (-0.06, 0.006, z + 1.0)], out=(0, 1, 0))
    face(g, "road_paint", [(-5.2, 0.006, 15.6), (5.2, 0.006, 15.6), (5.2, 0.006, 15.9), (-5.2, 0.006, 15.9)], out=(0, 1, 0))


# ------------------------------------------------------------------------------- perimeter and background
def perimeter(L):
    """The neighbours' board fences on all four sides (exactly the perimeter collision): boards
    both faces, posts, a cap; a PVPSPINARENA banner on the fence behind each spawn; the branded
    plywood hoarding where the exit road leaves the block."""
    sec = "perimeter"
    for w in L["walls"]:
        x0, x1, y0, y1, z0, z1 = faces_of(w)
        along_x = (x1 - x0) > (z1 - z0)
        if w["id"] == "wall-south":
            for a0, a1 in ((x0, -5.6), (5.6, x1)):
                privacy_fence(sec, {**w, "x": (a0 + a1) / 2, "w": a1 - a0})
            # Hoarding across the exit road.
            box(sec, "steel_dark", -5.6, 5.6, 0, y1, z0, z1, skip=("-y",))
            image_on(sec, "billboard", "z", z0, -1, -5.5, 5.5, 0.15, y1 - 0.1, uv=(0.04, 0.96, 0.0, 1.0))
            image_on(sec, "billboard", "z", z1, 1, -5.5, 5.5, 0.15, y1 - 0.1, uv=(0.04, 0.96, 0.0, 1.0))
            continue
        privacy_fence(sec, w)
        if not along_x:
            sg = 1 if x0 < 0 else -1
            plane = x1 if x0 < 0 else x0
            K.banner(sec, "x", plane, sg, -2.0, 0.35, 0.9, 1.8)


def background_house(x0, x1, z0, z1, h, facing):
    """A neighbour's house beyond the fences: siding facade with windows, a gable roof."""
    sec = "background"
    box(sec, "facade_sub", x0, x1, 0, h, z0, z1, skip=("-y", "+y"), offset=(0.0, 0.0))
    along_x = (x1 - x0) >= (z1 - z0)
    e = 0.35
    if along_x:
        zc = (z0 + z1) / 2
        yr = h + (z1 - z0) / 2 * 0.5
        for sg in (-1, 1):
            ze = z1 + e if sg > 0 else z0 - e
            face(sec, "shingles", [(x0 - e, h - 0.15, ze), (x1 + e, h - 0.15, ze), (x1 + e, yr, zc), (x0 - e, yr, zc)], out=(0, 1, sg))
        for xg, sx in ((x0, -1), (x1, 1)):
            face(sec, "siding_white", [(xg + sx * 0.01, h, z0), (xg + sx * 0.01, h, z1), (xg + sx * 0.01, yr - 0.1, zc)], out=(sx, 0, 0))
    else:
        xc = (x0 + x1) / 2
        yr = h + (x1 - x0) / 2 * 0.5
        for sg in (-1, 1):
            xe = x1 + e if sg > 0 else x0 - e
            face(sec, "shingles", [(xe, h - 0.15, z0 - e), (xe, h - 0.15, z1 + e), (xc, yr, z1 + e), (xc, yr, z0 - e)], out=(sg, 1, 0))
        for zg, sz in ((z0, -1), (z1, 1)):
            face(sec, "siding_white", [(x0, h, zg + sz * 0.01), (x1, h, zg + sz * 0.01), (xc, yr - 0.1, zg + sz * 0.01)], out=(0, 0, sz))


TREE_SPOTS = []  # background oak positions (x, z, scale) for props.py


def background(L):
    sec = "background"
    rnd = random.Random(5)
    # Grass beyond the fences, the exit road continuing south.
    face(sec, "grass", [(-140, -0.02, -140), (140, -0.02, -140), (140, -0.02, 140), (-140, -0.02, 140)], out=(0, 1, 0), tile=6.0)
    face(sec, "asphalt", [(-5.4, -0.01, 23.2), (5.4, -0.01, 23.2), (5.4, -0.01, 120), (-5.4, -0.01, 120)], out=(0, 1, 0))
    for sx in (-1, 1):
        face(sec, "sidewalk", [(sx * 5.4, -0.008, 23.2), (sx * 7.0, -0.008, 23.2), (sx * 7.0, -0.008, 120), (sx * 5.4, -0.008, 120)],
             out=(0, 1, 0))
    # Neighbouring houses: rows behind the north and south fences, columns behind east and west.
    for x in range(-60, 61, 16):
        if abs(x) < 8:
            continue
        w = rnd.uniform(9, 12)
        background_house(x - w / 2, x + w / 2, -38 - rnd.uniform(0, 3), -30 - rnd.uniform(0, 2), rnd.uniform(5.5, 6.5), 1)
        if abs(x) > 10:
            background_house(x - w / 2, x + w / 2, 30 + rnd.uniform(0, 2), 38 + rnd.uniform(0, 3), rnd.uniform(5.5, 6.5), -1)
    for z in range(-26, 27, 15):
        for sx in (-1, 1):
            d = rnd.uniform(9, 12)
            x0 = sx * (40 + rnd.uniform(0, 3))
            x1 = x0 + sx * 8
            background_house(min(x0, x1), max(x0, x1), z - d / 2, z + d / 2, rnd.uniform(5.5, 6.5), -sx)
    for i in range(10):
        a = rnd.uniform(0, math.tau)
        rr = rnd.uniform(44, 75)
        x, z = rr * math.cos(a), rr * math.sin(a) * 0.8
        if abs(x) < 9 and z > 20:
            continue
        TREE_SPOTS.append((x, z, rnd.uniform(0.17, 0.24)))
    for x, z in ((-34.5, -10), (34.5, 10), (-12, -25.5), (12, 25.5), (-34.5, 16), (34.5, -16), (-20, 26), (22, -26)):
        TREE_SPOTS.append((x, z, rnd.uniform(0.18, 0.22)))


# ------------------------------------------------------------------------------- validation, emit
UPPER = [  # walkable upper floors (x0, x1, z0, z1, floor height): both houses and their balconies
    (-25.0, -13.0, -6.0, 6.0, FLOOR2), (13.0, 25.0, -6.0, 6.0, FLOOR2),
    (-13.0, -10.6, -2.6, 2.6, FLOOR2), (10.6, 13.0, -2.6, 2.6, FLOOR2),
]


def in_reach(x, y, z, hw, hd):
    """True for points a player can reach (2.9 m above a walkable floor, minus 13 cm of ground
    detail) inside the playable rectangle: these must lie on a gameplay solid."""
    if abs(x) > hw - 0.01 or abs(z) > hd - 0.01:
        return False
    if 0.13 < y <= 2.9:
        return True
    return any(x0 <= x <= x1 and z0 <= z <= z1 and fy + 0.13 < y <= fy + 2.9 for x0, x1, z0, z1, fy in UPPER)


def validate(L):
    """Below 2.9 m inside the playable rectangle, every dressing vertex lies within 6 cm of a
    gameplay solid, on its top inside its footprint, or is ground detail (<= 0.13 m)."""
    tol = 0.061
    hw, hd = L["arena"]["width"] / 2, L["arena"]["depth"] / 2
    bad = []
    for (sec, mat, _shadow), b in K.BUCKETS.items():
        if sec in ("background", "perimeter", "roofs"):
            continue
        for v in b.verts:
            x, y, z = v
            if not in_reach(x, y, z, hw, hd):
                continue
            ok = any(
                abs(x - s["x"]) <= s["w"] / 2 + tol and abs(z - s["z"]) <= s["d"] / 2 + tol
                and s["y"] - s["h"] / 2 - tol <= y
                and (y <= s["y"] + s["h"] / 2 + tol or s["layer"] == "box")
                for s in L["solids"]
            )
            if not ok:
                bad.append((sec, mat, tuple(round(c, 3) for c in v)))
    return bad


def merge_tint_families():
    merged = {}
    for (sec, mat, sh), b in list(K.BUCKETS.items()):
        base = TINT_FAMILY.get(mat, mat)
        tint = K.MATS[mat][2] if mat in TINT_FAMILY else (1, 1, 1)
        key = (sec, base, sh)
        d = merged.setdefault(key, K.Bucket())
        start = len(d.verts)
        d.verts.extend(b.verts)
        d.faces.extend(tuple(i + start for i in f) for f in b.faces)
        d.uvs.extend(b.uvs)
        FACE_TINT.setdefault(key, []).extend([tint] * len(b.faces))
    K.BUCKETS.clear()
    K.BUCKETS.update(merged)


def emit(name, b, mat, to_blender, tints=None):
    me = K.emit_bucket(name, b, mat, to_blender)
    col = me.color_attributes["Color"]
    flat = mat in NO_AO
    for pi, poly in enumerate(me.polygons):
        tr, tg, tb = tints[pi] if tints else (1, 1, 1)
        for li in poly.loop_indices:
            a = 1.0 if flat else col.data[li].color[0]
            col.data[li].color = (min(1.0, a * tr), min(1.0, a * tg), min(1.0, a * tb), 1.0)
    return me


def build(L, section, to_blender):
    import bpy
    K.BUCKETS.clear()
    K.AO.clear()
    DECALS.clear()
    TREE_SPOTS.clear()
    OPENINGS.clear()
    ARENA.update(L["arena"])
    SOLIDS[:] = L["solids"] + L["walls"]
    ALL[:] = L["solids"]
    K.ALL_SOLIDS[:] = L["solids"]
    for s in L["solids"]:
        dress(section_of(s["x"], s["z"]), s)
    for side in ("a", "b"):
        sec = section_of(-19 if side == "a" else 19, 0)
        casings(sec, side)
        corners(sec, side)
        interior(side)
        roof(side)
        garage_roof(side)
        x0, x1, z0, z1 = HOUSE[side]
        # Shuttered windows on the solid ground floor of the side-yard wall and the garage's
        # street-side wall above its door line.
        fake_window(sec, "z", z1, 1, x0 + 3.2 if side == "a" else x1 - 3.2, 0.95, 2.2, 1.6)
        logo_panel(sec, "z", z1, 1, x0 + 8.4 if side == "a" else x1 - 8.4, 0.75, 2.45, 2.3)
    cargo_box("centre-north")
    billboard()
    bus_wraps()
    ground(L["arena"], L["solids"], L["walls"])
    street_details()
    perimeter(L)
    background(L)
    bad = validate(L)
    if bad:
        print(f"VALIDATE: {len(bad)} dressing vertices outside collision (first 20 groups):")
        seen = {}
        for b in bad:
            seen.setdefault((b[0], b[1]), []).append(b[2])
        for k, v in list(seen.items())[:20]:
            print("   ", k, len(v), v[:4])
    else:
        print("VALIDATE: dressing matches collision within 6 cm below 2.9 m (ground detail excepted)")
    FACE_TINT.clear()
    merge_tint_families()
    for key in [k for k in K.BUCKETS if k[0] not in ("ground", "background", "perimeter")]:
        b = K.BUCKETS[key]
        if sum(len(f) - 2 for f in b.faces) < 600:
            dkey = ("details", key[1], key[2])
            d = K.BUCKETS.setdefault(dkey, K.Bucket())
            base = len(d.verts)
            d.verts.extend(b.verts)
            d.faces.extend(tuple(i + base for i in f) for f in b.faces)
            d.uvs.extend(b.uvs)
            FACE_TINT.setdefault(dkey, []).extend(FACE_TINT.pop(key, [(1, 1, 1)] * len(b.faces)))
            del K.BUCKETS[key]
    stats = {"triangles": 0, "meshes": 0}
    for (sec, mat, _shadow), b in list(K.BUCKETS.items()):
        me = emit(f"{sec}-{mat}", b, mat, to_blender, FACE_TINT.get((sec, mat, _shadow)))
        o = bpy.data.objects.new(me.name, me)
        if sec == "background" or mat in ("decals", "lamp", "glass", "road_paint"):
            o["noShadow"] = True
        section(sec).objects.link(o)
        stats["triangles"] += sum(len(f) - 2 for f in b.faces)
        stats["meshes"] += 1
    stats["violations"] = len(bad)
    print("KIT STATS", stats)
    return stats
