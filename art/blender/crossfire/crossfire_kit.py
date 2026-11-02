"""
CROSSFIRE urban environment kit (Phase 4). Imported by build_crossfire.py.

Built on the AIM ARENA's modular kit (art/blender/map/arena_kit.py), imported and reused
unchanged: geometry buckets (one mesh per culling section x material), face/box/cylinder
primitives with world-space box UVs, neighbour-aware trims (no coplanar overlaps), linked
duplicates for GPU instancing, baked vertex AO, the palm and background helpers and the
collision validation. This module adds the urban material set and the CROSSFIRE dressing:

  A side (west)  residential block, market alley and shopfronts: ochre/rose plaster, brick,
                 shop signs, awnings, balconies, AC units, laundry, cables and bunting.
  B side (east)  transport terminal and construction passage: concrete, glass, cladding,
                 terminal signage, portacabins, scaffolding, pipes, a generator, a crane.
  Centre         the crash square: asphalt with worn markings, scorch and debris around the
                 Mi-8 wreck (heli.py), the torn-off rotor head.

Rules (same as every map):
* Below 2.9 m inside the playable rectangle, every dressing vertex stays within 6 cm of its
  gameplay solid (no invisible walls, no visual-only cover). Exception: ground detail up to
  0.13 m (decals, rubble), which is never cover.
* No coplanar overlaps: flush details stand 6-45 mm proud of their face, ground decals sit
  12-16 mm above the floor in distinct layers.
* Everything above reach (awnings, balconies, cables, scaffolding, signs) starts at >= 2.95 m.
"""
import math, os, random, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "map"))
import arena_kit as K  # noqa: E402

K.TEX = os.path.join(HERE, "build", "tex")
R = random.Random(23)
K.R = R
box, face, cylinder, quad_on, faces_of, grow = K.box, K.face, K.cylinder, K.quad_on, K.faces_of, K.grow
T = lambda name: (name, name + "_n", name + "_r")  # noqa: E731

# ------------------------------------------------------------------------------- materials
K.MATS.update({
    "brick": (T("brick"), 2.0, (1, 1, 1), 0.85, 0.0, {}),
    "brick_soot": (T("brick"), 2.0, (0.62, 0.58, 0.55), 0.85, 0.0, {}),
    "asphalt": (T("asphalt"), 5.0, (1, 1, 1), 0.85, 0.0, {}),
    "tiles": (T("tiles"), 2.0, (1, 1, 1), 0.45, 0.0, {}),
    "rust": (T("rust"), 1.5, (1, 1, 1), 0.85, 0.25, {}),
    "plaster_ochre": (("plaster", "plaster_n", None), 3.0, (0.96, 0.80, 0.56), 0.9, 0.0, {}),
    "plaster_rose": (("plaster", "plaster_n", None), 3.0, (0.93, 0.72, 0.62), 0.9, 0.0, {}),
    "plaster_teal": (("plaster", "plaster_n", None), 3.0, (0.62, 0.78, 0.74), 0.9, 0.0, {}),
    "signs": (("signs", None, None), 1, (1, 1, 1), 0.45, 0.0, {}),
    "decals": (("decals", None, None), 1, (1, 1, 1), 0.9, 0.0, {"mask": True}),
    "facade": (("facade", None, None), 12.8, (1, 1, 1), 0.9, 0.0, {}),
    "facade_ind": (("facade_ind", None, None), 12.8, (1, 1, 1), 0.7, 0.2, {}),
    "shutter": (T("corrugated"), 1.2, (0.56, 0.58, 0.58), 0.6, 0.5, {}),
    "shutter_green": (T("corrugated"), 1.2, (0.30, 0.46, 0.40), 0.6, 0.4, {}),
    "paint_white": ((None, None, None), 1, (0.80, 0.80, 0.78), 0.5, 0.15, {}),
    "car_red": ((None, None, None), 1, (0.42, 0.08, 0.06), 0.45, 0.5, {}),
    "car_white": ((None, None, None), 1, (0.78, 0.78, 0.76), 0.4, 0.4, {}),
    "car_sand": ((None, None, None), 1, (0.60, 0.50, 0.35), 0.6, 0.3, {}),
    "rubber": ((None, None, None), 1, (0.045, 0.045, 0.05), 0.9, 0.0, {}),
    "wire": ((None, None, None), 1, (0.03, 0.03, 0.03), 0.6, 0.0, {"double": True}),
    "plastic_black": ((None, None, None), 1, (0.06, 0.06, 0.065), 0.55, 0.0, {}),
    "canvas_blue": (("canvas", "canvas_n", None), 1.5, (0.26, 0.44, 0.66), 0.95, 0.0, {"double": True}),
    "canvas_green": (("canvas", "canvas_n", None), 1.5, (0.32, 0.52, 0.32), 0.95, 0.0, {"double": True}),
    "fabric": (("canvas", "canvas_n", None), 0.8, (0.95, 0.94, 0.90), 0.95, 0.0, {"double": True}),
    "ceiling_light": ((None, None, None), 1, (1.0, 0.95, 0.85), 0.4, 0.0, {"emit": 2.2}),
    "interior_dark": ((None, None, None), 1, (0.05, 0.045, 0.04), 0.9, 0.0, {}),
})
# The Dustfront kit pieces reused here keep their names (sandstone, plaster, concrete_wall,
# steel, wood_blue, canvas_*, glass, lamp, banner...).
WIRE_COLOURS = ("canvas_terracotta", "canvas_sand", "canvas_blue", "canvas_green", "fabric")


# ------------------------------------------------------------------------------- helpers
def uvq(u0, u1, v0=0.0, v1=1.0, axis="z", sign=1):
    """UVs for quad_on so images read unmirrored from the facing side."""
    if (axis == "z" and sign < 0) or (axis == "x" and sign > 0):
        return [(u1, v0), (u0, v0), (u0, v1), (u1, v1)]
    return [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]


def cell(i, cols, rows):
    """(u0, u1, v0, v1) of atlas cell i (row-major from the image top; Blender v is bottom-up)."""
    c, r = i % cols, i // cols
    return c / cols, (c + 1) / cols, 1 - (r + 1) / rows, 1 - r / rows


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


def atlas_quad(sec, mat, axis, plane, sign, a0, a1, y0, y1, idx, cols, rows, off=0.006):
    u0, u1, v0, v1 = cell(idx, cols, rows)
    quad_on(sec, mat, axis, plane + sign * off, sign, a0, a1, y0, y1, uvs=uvq(u0, u1, v0, v1, axis, sign))


def sign_board(sec, axis, plane, sign, a, y, w, h, idx):
    """Shop / terminal sign: steel backing 4 cm proud and the printed face (signs atlas)."""
    proud(sec, "steel", axis, plane, sign, a - w / 2 - 0.04, a + w / 2 + 0.04, y - 0.04, y + h + 0.04, 0.04)
    atlas_quad(sec, "signs", axis, plane, sign, a - w / 2, a + w / 2, y, y + h, idx, 4, 2, off=0.046)


def wall_decal(sec, axis, plane, sign, a, y, w, h, idx, off=0.006):
    atlas_quad(sec, "decals", axis, plane, sign, a - w / 2, a + w / 2, y, y + h, idx, 4, 2, off=off)


DECALS = []  # (x, z, radius, layer) of ground decals placed so far


def ground_decal(sec, idx, x, z, w, d, rot=0.0, y=None):
    """Flat decal 12 mm above the floor; a decal overlapping earlier ones goes one 1.5 mm layer
    above the highest of them, so no two decals ever share a plane."""
    rad = math.hypot(w, d) / 2
    layer = 1 + max([l for (px, pz, pr, l) in DECALS if math.hypot(px - x, pz - z) < pr + rad] or [-1])
    DECALS.append((x, z, rad, layer))
    y = 0.012 + 0.003 * layer
    u0, u1, v0, v1 = cell(idx, 4, 2)
    c, s = math.cos(rot), math.sin(rot)
    pts, uvs = [], []
    for (du, dv), uv in (((-1, -1), (u0, v0)), ((1, -1), (u1, v0)), ((1, 1), (u1, v1)), ((-1, 1), (u0, v1))):
        px, pz = du * w / 2, dv * d / 2
        pts.append((x + px * c - pz * s, y, z + px * s + pz * c))
        uvs.append(uv)
    face(sec, "decals", pts, out=(0, 1, 0), uvs=uvs, shadow=False)


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
            pts = [P(a, 2 * math.pi * i / n) for i in range(n)]
            face(sec, mat, pts, out=(sg, 0, 0) if axis == "x" else (0, 0, sg))


def cone(sec, mat, base, axis, r0, r1, length, n=12, cap=True):
    """Truncated cone from `base` along unit vector `axis` (dishes, horns, rotor stubs)."""
    ax = axis
    ref = (0, 1, 0) if abs(ax[1]) < 0.9 else (1, 0, 0)
    u = K.cross(ax, ref)
    ul = math.sqrt(K.dot(u, u))
    u = (u[0] / ul, u[1] / ul, u[2] / ul)
    v = K.cross(ax, u)
    top = (base[0] + ax[0] * length, base[1] + ax[1] * length, base[2] + ax[2] * length)

    def ring(c, r, g):
        return (c[0] + r * (u[0] * math.cos(g) + v[0] * math.sin(g)),
                c[1] + r * (u[1] * math.cos(g) + v[1] * math.sin(g)),
                c[2] + r * (u[2] * math.cos(g) + v[2] * math.sin(g)))
    for i in range(n):
        g0, g1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        gm = (g0 + g1) / 2
        out = (u[0] * math.cos(gm) + v[0] * math.sin(gm), u[1] * math.cos(gm) + v[1] * math.sin(gm),
               u[2] * math.cos(gm) + v[2] * math.sin(gm))
        face(sec, mat, [ring(base, r0, g0), ring(base, r0, g1), ring(top, r1, g1), ring(top, r1, g0)], out=out)
    if cap and r1 > 0:
        face(sec, mat, [ring(top, r1, 2 * math.pi * i / n) for i in range(n)], out=ax)


def wire(sec, p0, p1, sag=0.3, n=8, t=0.018, mat="wire"):
    """Drooping cable (a thin cross-section ribbon pair, double-sided)."""
    pts = []
    for i in range(n + 1):
        f = i / n
        pts.append((p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f - sag * 4 * f * (1 - f),
                    p0[2] + (p1[2] - p0[2]) * f))
    for a, b in zip(pts, pts[1:]):
        face(sec, mat, [(a[0], a[1] - t, a[2]), (b[0], b[1] - t, b[2]), (b[0], b[1] + t, b[2]), (a[0], a[1] + t, a[2])],
             shadow=False)
    return pts


def bunting(sec, p0, p1, sag=0.35, every=0.45):
    pts = wire(sec, p0, p1, sag, n=max(4, int(math.dist(p0, p1) / every)))
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.28, (a[2] + b[2]) / 2)
        face(sec, WIRE_COLOURS[i % len(WIRE_COLOURS)], [a, b, m], shadow=False)


def laundry(sec, p0, p1, sag=0.2):
    pts = wire(sec, p0, p1, sag, n=10)
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        if i % 3 == 2:
            continue
        h = 0.45 + 0.25 * R.random()
        mat = R.choice(WIRE_COLOURS)
        face(sec, mat, [a, b, (b[0], b[1] - h, b[2]), (a[0], a[1] - h, a[2])], shadow=False)


def ac_unit(sec, axis, plane, sign, a, y):
    """Split AC unit on brackets (only above reach)."""
    assert y >= 2.95
    proud(sec, "paint_white", axis, plane, sign, a - 0.42, a + 0.42, y, y + 0.58, 0.32, chamfer=0.02)
    atlas_quad(sec, "interior_dark", axis, plane + sign * 0.32, sign, a - 0.3, a + 0.1, y + 0.1, y + 0.48, 0, 1, 1, off=0.004)
    for e in (a - 0.32, a + 0.32):
        proud(sec, "steel", axis, plane, sign, e - 0.025, e + 0.025, y - 0.06, y, 0.36)


def dish(sec, x, y, z, yaw):
    box(sec, "steel", x - 0.03, x + 0.03, y, y + 0.9, z - 0.03, z + 0.03, skip=("-y",))
    d = (math.cos(yaw) * 0.8, 0.55, math.sin(yaw) * 0.8)
    l = math.sqrt(K.dot(d, d))
    d = (d[0] / l, d[1] / l, d[2] / l)
    cone(sec, "paint_white", (x, y + 0.85, z), d, 0.05, 0.42, 0.16, n=12)


def water_tank(sec, x, y, z, r=0.55, h=1.1):
    for dx in (-0.4, 0.4):
        box(sec, "steel", x + dx - 0.03, x + dx + 0.03, y, y + 0.35, z - r, z + r, skip=("-y",))
    cylinder(sec, "plastic_black", x, z, y + 0.35, y + 0.35 + h, r, r, n=12, caps=(True, True))


def roof_clutter(sec, x0, x1, z0, z1, y, kinds=("tank", "dish", "ac")):
    """Rooftop: parapet-free clutter inside the footprint (tanks, dishes, AC, antenna)."""
    w, d = x1 - x0, z1 - z0
    n = max(1, int(w * d / 14))
    placed = []
    for i in range(n):
        k = kinds[i % len(kinds)]
        for _try in range(12):
            x = x0 + 0.9 + (w - 1.8) * R.random()
            z = z0 + 0.9 + (d - 1.8) * R.random()
            if all(math.hypot(x - px, z - pz) > 1.6 for px, pz in placed):
                break
        else:
            continue
        placed.append((x, z))
        if k == "tank":
            water_tank(sec, x, y, z)
        elif k == "dish":
            dish(sec, x, y, z, R.uniform(0, math.tau))
        elif k == "ac":
            box(sec, "paint_white", x - 0.45, x + 0.45, y, y + 0.7, z - 0.4, z + 0.4, skip=("-y",), chamfer=0.03)
        elif k == "antenna":
            box(sec, "steel", x - 0.02, x + 0.02, y, y + 2.6, z - 0.02, z + 0.02, skip=("-y",))
            for hy in (1.6, 2.1, 2.5):
                box(sec, "steel", x - 0.5, x + 0.5, y + hy, y + hy + 0.025, z - 0.012, z + 0.012)


def parapet_rim(sec, mat, x0, x1, z0, z1, y, h=0.55, t=0.22, sides=("-x", "+x", "-z", "+z")):
    """Roof parapet inside a footprint (rises above the solid's top)."""
    if "-z" in sides:
        box(sec, mat, x0, x1, y, y + h, z0, z0 + t, skip=("-y",))
    if "+z" in sides:
        box(sec, mat, x0, x1, y, y + h, z1 - t, z1, skip=("-y",))
    if "-x" in sides:
        box(sec, mat, x0, x0 + t, y, y + h, z0 + t, z1 - t, skip=("-y",))
    if "+x" in sides:
        box(sec, mat, x1 - t, x1, y, y + h, z0 + t, z1 - t, skip=("-y",))


def faces6(sec, x0, x1, y0, y1, z0, z1, mat_of, skip=()):
    """A box whose sides can carry different materials (mat_of(side) -> material or None)."""
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


def window_on(sec, axis, plane, sign, a, y, w, h, style):
    """Windows by style: 'west' (frame + open shutters), 'east' (steel frame), 'broken' (dark
    hole, shattered frame), 'curtain' (terminal glazing with mullions)."""
    if style in ("west", "east"):
        K.window(sec, axis, plane, sign, a, y, w, h, style)
        return
    if style == "broken":
        atlas_quad(sec, "interior_dark", axis, plane, sign, a - w / 2, a + w / 2, y, y + h, 0, 1, 1, off=0.008)
        for (a0, a1, y0, y1) in ((a - w / 2 - 0.07, a + w / 2 + 0.07, y - 0.07, y), (a - w / 2 - 0.07, a - w / 2, y, y + h)):
            proud(sec, "sandstone_dark", axis, plane, sign, a0, a1, y0, y1, 0.035)
        wall_decal(sec, axis, plane, sign, a, y + h + 0.25, w * 1.3, 0.8, 0, off=0.004)  # soot above
        return
    # curtain wall bay
    atlas_quad(sec, "glass", axis, plane, sign, a - w / 2, a + w / 2, y, y + h, 0, 1, 1, off=0.01)
    for e in (a - w / 2, a + w / 2 - 0.06):
        proud(sec, "steel", axis, plane, sign, e, e + 0.06, y, y + h, 0.04)
    for yy in (y, y + h - 0.06):
        proud(sec, "steel", axis, plane, sign, a - w / 2 + 0.06, a + w / 2 - 0.06, yy, yy + 0.06, 0.04)


def balcony(sec, axis, plane, sign, a, y, w=2.0, depth=0.85, broken=False):
    """Cantilevered balcony (slab + railing), y >= 3.0."""
    assert y >= 2.95
    q = plane + sign * depth
    lo, hi = min(plane, q), max(plane, q)
    if axis == "z":
        box(sec, "sandstone_dark", a - w / 2, a + w / 2, y, y + 0.15, lo, hi, chamfer=0.02)
        if broken:
            return
        zr = hi - 0.03 if sign > 0 else lo
        box(sec, "steel", a - w / 2 + 0.03, a + w / 2 - 0.03, y + 0.95, y + 1.0, zr, zr + 0.03)
        for k in range(1, int(w / 0.12)):
            xx = a - w / 2 + k * w / int(w / 0.12)
            box(sec, "steel", xx - 0.01, xx + 0.01, y + 0.15, y + 0.95, zr, zr + 0.02)
        for xx in (a - w / 2, a + w / 2 - 0.03):
            box(sec, "steel", xx, xx + 0.03, y + 0.15, y + 1.0, lo, hi)
    else:
        box(sec, "sandstone_dark", lo, hi, y, y + 0.15, a - w / 2, a + w / 2, chamfer=0.02)
        if broken:
            return
        xr = hi - 0.03 if sign > 0 else lo
        box(sec, "steel", xr, xr + 0.03, y + 0.95, y + 1.0, a - w / 2 + 0.03, a + w / 2 - 0.03)
        for k in range(1, int(w / 0.12)):
            zz = a - w / 2 + k * w / int(w / 0.12)
            box(sec, "steel", xr, xr + 0.02, y + 0.15, y + 0.95, zz - 0.01, zz + 0.01)
        for zz in (a - w / 2, a + w / 2 - 0.03):
            box(sec, "steel", lo, hi, y + 0.15, y + 1.0, zz, zz + 0.03)


def rubble(sec, x, z, r=0.8, n=10, mat="brick_soot"):
    """Low rubble scatter on the ground (<= 0.12 m, never cover)."""
    heights = [0.0413 + 0.07 * k / max(1, n - 1) for k in range(n)]  # distinct: no shared tops
    R.shuffle(heights)
    for h in heights:
        a, d = R.uniform(0, math.tau), R.uniform(0, r)
        cx, cz = x + math.cos(a) * d, z + math.sin(a) * d
        s = R.uniform(0.08, 0.22)
        yaw = R.uniform(0, math.pi / 2)  # rotated chunks: no two share a face plane
        c_, s_ = math.cos(yaw), math.sin(yaw)
        P = lambda u, v, y: (cx + u * c_ - v * s_, y, cz + u * s_ + v * c_)  # noqa: E731
        corners = [(-s / 2, -s / 2), (s / 2, -s / 2), (s / 2, s / 2), (-s / 2, s / 2)]
        face(sec, mat, [P(u, v, h) for u, v in corners], out=(0, 1, 0))
        for k in range(4):
            (u0, v0), (u1, v1) = corners[k], corners[(k + 1) % 4]
            mu, mv = (u0 + u1) / 2, (v0 + v1) / 2
            face(sec, mat, [P(u0, v0, 0), P(u1, v1, 0), P(u1, v1, h), P(u0, v0, h)],
                 out=(mu * c_ - mv * s_, 0, mu * s_ + mv * c_))


# ------------------------------------------------------------------------------- context
SOLIDS = []  # every solid + perimeter wall (set by build)
ARENA = {"width": 48.0, "depth": 40.0}


def inside_any(x, y, z, pad=0.0):
    return any(abs(x - o["x"]) < o["w"] / 2 + pad and abs(z - o["z"]) < o["d"] / 2 + pad
               and o["y"] - o["h"] / 2 - pad < y < o["y"] + o["h"] / 2 + pad for o in SOLIDS)


def free_at(axis, plane, sign, a, y, reach=0.25):
    """True if the space just in front of a facade point is open (worth dressing)."""
    q = plane + sign * reach
    x, z = (q, a) if axis == "x" else (a, q)
    return not inside_any(x, y, z)


def fits(axis, plane, sign, a0, a1, y0, y1, reach=0.25):
    """True if the facade area a0..a1 x y0..y1 is open in front (corners and centre sampled)."""
    pts = [(a0, y0), (a1, y0), (a0, y1), (a1, y1), ((a0 + a1) / 2, (y0 + y1) / 2)]
    return all(free_at(axis, plane, sign, a, y, reach) for a, y in pts)


def free_spans(axis, plane, sign, b0, b1, y, depth=0.08, step=0.2, reach=0.25):
    """Open stretches of a facade at height y, each shortened by `depth` where it meets a
    neighbour or the face end, so proud bands on adjacent faces never cross at corners."""
    n = max(1, int((b1 - b0) / step))
    ok = [free_at(axis, plane, sign, b0 + (b1 - b0) * (i + 0.5) / n, y, reach) for i in range(n)]
    spans, start = [], None
    for i, f in enumerate(ok + [False]):
        if f and start is None:
            start = i
        elif not f and start is not None:
            a0, a1 = b0 + (b1 - b0) * start / n + depth, b0 + (b1 - b0) * i / n - depth
            if a1 - a0 > 0.3:
                spans.append((a0, a1))
            start = None
    return spans


def side_of(s):
    return "b" if s.get("side") == "b" else "a" if s.get("side") == "a" else "c"


def facing(s):
    """Facades of an edge block face the arena centre along z (rows) or x (end blocks)."""
    return -1 if s["z"] > 0 else 1


# ------------------------------------------------------------------------------- A: market shop row
A_WALLS = ("plaster_ochre", "brick", "plaster_rose", "plaster_white", "plaster_teal", "brick", "plaster_ochre")
SHOP_SIGNS = (0, 1, 2, 3, 6, 1, 2)
AWNINGS = ("canvas_terracotta", "canvas_sand", "canvas_blue", "canvas_green")


def segments(a0, a1, target):
    n = max(1, round((a1 - a0) / target))
    return [(a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n) for i in range(n)]


def shopfront(sec, axis, plane, sign, a0, a1, i, closed=False, top=2.7):
    """Ground-floor shop between a0..a1 (flush: glass, mullions, shutter housing, kick plate)."""
    w = a1 - a0
    proud(sec, "sandstone_dark", axis, plane, sign, a0, a1, 0, 0.4, 0.04)
    if closed:
        atlas_quad(sec, "shutter", axis, plane, sign, a0, a1, 0.4, top, 0, 1, 1, off=0.012)
        if i % 2 == 0:
            wall_decal(sec, axis, plane, sign, (a0 + a1) / 2 + 0.2, 0.9, min(1.8, w * 0.7), 0.95, 4, off=0.016)
    else:
        atlas_quad(sec, "glass", axis, plane, sign, a0, a1, 0.4, top - 0.45, 0, 1, 1, off=0.01)
        atlas_quad(sec, "shutter", axis, plane, sign, a0, a1, top - 0.45, top, 0, 1, 1, off=0.012)
        for e in [a0 + w * k / 3 for k in range(1, 3)] + [a0, a1 - 0.05]:
            proud(sec, "steel", axis, plane, sign, e, e + 0.05, 0.4, top - 0.45, 0.03)
        proud(sec, "steel", axis, plane, sign, a0 + 0.05, a1 - 0.05, 1.15, 1.2, 0.025)
    proud(sec, "steel", axis, plane, sign, a0 - 0.05, a1 + 0.05, top, top + 0.22, 0.055)  # shutter drum


def shop_row(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    sign = facing(s)
    zf = z0 if sign < 0 else z1
    front = "-z" if sign < 0 else "+z"
    faces6(sec, x0, x1, y0, y1, z0, z1, lambda sd: None if sd in (front, "-y") else ("concrete" if sd == "+y" else "plaster"),
           skip=K.hidden())
    segs = segments(x0, x1, 4.7)
    gi = int((x0 + 24) / 4.7)
    for k, (a0, a1) in enumerate(segs):
        j = (gi + k) % len(A_WALLS)
        mat = A_WALLS[j]
        face(sec, mat, [(a0, 0, zf), (a1, 0, zf), (a1, y1, zf), (a0, y1, zf)], out=(0, 0, sign))
        closed = (j % 3 == 2)
        if free_at("z", zf, sign, (a0 + a1) / 2, 1.0):
            shopfront(sec, "z", zf, sign, a0 + 0.35, a1 - 0.35, k, closed=closed)
        sign_board(sec, "z", zf, sign, (a0 + a1) / 2, 3.0, min(2.6, a1 - a0 - 1.2), 0.62, SHOP_SIGNS[j])
        if j % 4 != 3:
            K.awning(sec, "z", zf, sign, a0 + 0.3, a1 - 0.3, 3.72, 1.25, AWNINGS[j % len(AWNINGS)])
        else:  # torn awning: bare frame
            for e in (a0 + 0.3, a1 - 0.33):
                proud(sec, "steel", "z", zf, sign, e, e + 0.03, 3.72, 3.76, 1.2)
        K.lamp(sec, "z", zf, sign, a0 + 0.55, 3.75)
        # Upper floors.
        floors = [y for y in (4.4, 7.0) if y + 1.3 <= y1 - 0.5]
        nw = max(1, int((a1 - a0) / 2.2))
        damaged = (j == 3)
        for fy, wy in enumerate(floors):
            for i in range(nw):
                a = a0 + (a1 - a0) * (i + 0.5) / nw
                style = "broken" if damaged and fy == 0 and i == 0 else "west"
                window_on(sec, "z", zf, sign, a, wy, 0.95, 1.3 if fy == 0 else 1.1, style)
                if fy == 0 and (i + j) % 2 == 0 and not damaged and fits("z", zf, sign, a - 0.95, a + 0.95, wy - 0.3, wy + 0.9, 0.9):
                    balcony(sec, "z", zf, sign, a, wy - 0.25, w=1.8)
                elif (i + j + fy) % 3 == 1 and fits("z", zf, sign, a + 0.4, a + 1.3, wy - 0.8, wy - 0.1, 0.4):
                    ac_unit(sec, "z", zf, sign, a + 0.85, wy - 0.75)
        if damaged and floors:
            a = a0 + (a1 - a0) * 0.5 / nw
            wall_decal(sec, "z", zf, sign, a + 0.6, floors[0] - 0.2, 1.4, 1.4, 6)
            rubble(sec, a, zf + sign * 0.6, r=0.7, n=14)
        # Cornice band (above reach) and drain pipe at the segment edge.
        g0 = a0 - (0.18 if (k == 0 and "-x" not in K.TOUCH) else 0)
        g1 = a1 + (0.18 if (k == len(segs) - 1 and "+x" not in K.TOUCH) else 0)
        proud(sec, "sandstone_dark", "z", zf, sign, g0, g1, y1 - 0.38, y1, 0.18)
        if k > 0:
            proud(sec, "rust", "z", zf, sign, a0 + 0.21, a0 + 0.26, 3.0, y1 - 0.38, 0.055)
            proud(sec, "sandstone_dark", "z", zf, sign, a0 - 0.18, a0 + 0.18, 0, 2.95, 0.05)  # pilaster
    parapet_rim(sec, "plaster", x0, x1, z0, z1, y1, h=0.5, sides=tuple(sd for sd in ("-x", "+x", "-z", "+z") if sd not in K.HIDE))
    roof_clutter(sec, x0, x1, z0, z1, y1, kinds=("tank", "dish", "ac", "tank", "antenna"))


# ------------------------------------------------------------------------------- B: industrial sheds
def industrial_row(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    sign = facing(s)
    zf = z0 if sign < 0 else z1
    front = "-z" if sign < 0 else "+z"
    faces6(sec, x0, x1, y0, y1, z0, z1, lambda sd: None if sd == "-y" else ("roof_metal" if sd == "+y" else "cladding"),
           skip=K.hidden())
    gx0, gx1 = x0 - (0 if "-x" in K.TOUCH else 0.02), x1 + (0 if "+x" in K.TOUCH else 0.02)
    proud(sec, "hazard", "z", zf, sign, gx0, gx1, 0, 0.35, 0.02)
    proud(sec, "steel", "z", zf, sign, gx0, gx1, y1 - 0.25, y1, 0.12)
    segs = segments(x0, x1, 6.5)
    for k, (a0, a1) in enumerate(segs):
        mid = (a0 + a1) / 2
        if k > 0:
            proud(sec, "steel", "z", zf, sign, a0 - 0.12, a0 + 0.12, 0.35, y1 - 0.25, 0.05)  # portal column
        if free_at("z", zf, sign, mid, 1.0):
            atlas_quad(sec, "shutter", "z", zf, sign, mid - 1.7, mid + 1.7, 0.35, 3.3, 0, 1, 1, off=0.015)
            proud(sec, "steel_yellow", "z", zf, sign, mid - 1.85, mid - 1.7, 0.35, 3.3, 0.05)
            proud(sec, "steel_yellow", "z", zf, sign, mid + 1.7, mid + 1.85, 0.35, 3.3, 0.05)
            proud(sec, "steel", "z", zf, sign, mid - 1.85, mid + 1.85, 3.3, 3.55, 0.05)
            if k % 2 == 1:
                wall_decal(sec, "z", zf, sign, mid + 0.4, 1.1, 1.6, 0.9, 4, off=0.02)
        door_a = a1 - 0.9
        if free_at("z", zf, sign, door_a, 1.0) and a1 - a0 > 5:
            atlas_quad(sec, "paint_white", "z", zf, sign, door_a - 0.45, door_a + 0.45, 0.35, 2.2, 0, 1, 1, off=0.012)
            sign_board(sec, "z", zf, sign, door_a, 2.35, 0.8, 0.4, 5 if k % 2 else 7)
        atlas_quad(sec, "glass", "z", zf, sign, a0 + 0.4, a1 - 0.4, y1 - 2.0, y1 - 1.25, 0, 1, 1, off=0.012)
        K.lamp(sec, "z", zf, sign, mid, 3.75)
    # Sawtooth roof lights above the top (inside the footprint).
    n = max(1, int((x1 - x0) / 3.5))
    zb, zt = (z0 + 0.4, z1 - 0.4)
    for i in range(n):
        a = x0 + (x1 - x0) * i / n + 0.3
        b = x0 + (x1 - x0) * (i + 1) / n - 0.3
        face(sec, "roof_metal", [(a, y1, zb), (a, y1, zt), (b, y1 + 1.1, zt), (b, y1 + 1.1, zb)], out=(-1, 1, 0))
        face(sec, "glass", [(b, y1, zb), (b, y1 + 1.1, zb), (b, y1 + 1.1, zt), (b, y1, zt)], out=(1, 0, 0))
        face(sec, "cladding", [(a, y1, zb), (b, y1 + 1.1, zb), (b, y1, zb)], out=(0, 0, -1))
        face(sec, "cladding", [(a, y1, zt), (b, y1, zt), (b, y1 + 1.1, zt)], out=(0, 0, 1))


def scaffold(sec, axis, plane, sign, a0, a1, y0, y1, depth=1.1, tarp="canvas_blue"):
    """Cantilevered scaffold on a facade (all above y0 >= 2.95): decks, rails, braces, sheeting."""
    assert y0 >= 2.95
    q = plane + sign * depth
    decks = [y0]
    while decks[-1] + 2.1 < y1 - 0.5:
        decks.append(decks[-1] + 2.1)
    lo, hi = min(plane, q), max(plane, q)

    def B(a_0, a_1, y_0, y_1, c0, c1, mat="steel"):
        if axis == "z":
            box(sec, mat, a_0, a_1, y_0, y_1, c0, c1)
        else:
            box(sec, mat, c0, c1, y_0, y_1, a_0, a_1)
    posts = [a0 + (a1 - a0) * k / max(1, round((a1 - a0) / 2.0)) for k in range(max(1, round((a1 - a0) / 2.0)) + 1)]
    out_c = (q - 0.05, q) if sign > 0 else (q, q + 0.05)
    rail_c = (q, q + 0.04) if sign > 0 else (q - 0.04, q)  # rails clamp onto the posts' outer face
    for p in posts:
        B(p - 0.025, p + 0.025, y0, y1, *out_c)
    for d in decks:
        B(a0, a1, d, d + 0.05, lo + 0.05, hi - 0.05, "wood")
        B(a0, a1, d + 1.0, d + 1.05, *rail_c)
        B(a0, a1, d + 0.5, d + 0.54, *rail_c)
        for p in posts:  # bracket into the wall, ending inside the post
            B(p - 0.02, p + 0.02, d - 0.06, d, lo + (0 if sign > 0 else 0.02), hi - (0.02 if sign > 0 else 0))
    # Diagonal braces between posts (thin quads).
    for p0, p1 in zip(posts, posts[1:]):
        for d in decks:
            c = q + sign * 0.045
            P = (lambda a, y: (a, y, c)) if axis == "z" else (lambda a, y: (c, y, a))
            face(sec, "steel", [P(p0, d + 0.06), P(p0 + 0.05, d + 0.06), P(p1, d + 1.95), P(p1 - 0.05, d + 1.95)],
                 out=(0, 0, sign) if axis == "z" else (sign, 0, 0))
    # Torn sheeting on part of the face.
    c = q + sign * 0.07
    mid = (a0 + a1) / 2
    pts = [(mid, y1 - 0.2), (a1, y1 - 0.2), (a1, decks[0] + 0.7), (mid + 0.6, decks[0] + 1.3)]
    P = (lambda a, y: (a, y, c)) if axis == "z" else (lambda a, y: (c, y, a))
    face(sec, tarp, [P(*p) for p in pts], out=(0, 0, sign) if axis == "z" else (sign, 0, 0), shadow=True)


# ------------------------------------------------------------------------------- tall blocks
def tall_block(sec, s, style, balconies=True):
    """Apartment tower / rear block (A) or terminal tower / rear (B): windows on free faces above
    the neighbours, balconies, AC and laundry (A) or curtain glazing and signage (B)."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    body = "plaster_white" if style == "a" else "concrete_wall"
    faces6(sec, x0, x1, y0, y1, z0, z1, lambda sd: None if sd == "-y" else ("concrete" if sd == "+y" else body),
           skip=K.hidden())
    for axis, plane, sgn, b0, b1 in (("x", x0, -1, z0, z1), ("x", x1, 1, z0, z1), ("z", z0, -1, x0, x1), ("z", z1, 1, x0, x1)):
        n = max(1, int((b1 - b0) / 2.4))
        for wy in (3.6, 6.4):
            if wy + 1.6 > y1 - 0.4:
                continue
            for i in range(n):
                a = b0 + (b1 - b0) * (i + 0.5) / n
                if not fits(axis, plane, sgn, a - 1.05, a + 1.05, wy - 0.15, wy + 1.5):
                    continue
                if style == "a":
                    window_on(sec, axis, plane, sgn, a, wy, 1.0, 1.35, "west" if (i + int(wy)) % 5 else "broken")
                    if balconies and i % 2 == 0 and wy == 6.4 and fits(axis, plane, sgn, a - 1.0, a + 1.0, wy - 0.3, wy + 0.9, 0.9):
                        balcony(sec, axis, plane, sgn, a, wy - 0.25, w=1.9)
                    elif i % 3 == 1 and fits(axis, plane, sgn, a + 0.4, a + 1.4, wy - 0.7, wy, 0.4):
                        ac_unit(sec, axis, plane, sgn, a + 0.9, wy - 0.6)
                else:
                    window_on(sec, axis, plane, sgn, a, wy, (b1 - b0) / n - 0.25, 1.7, "curtain")
            # Floor slab band.
            for g0, g1 in free_spans(axis, plane, sgn, b0, b1, wy - 0.33):
                proud(sec, "sandstone_dark" if style == "a" else "steel", axis, plane, sgn, g0, g1, wy - 0.42, wy - 0.25, 0.08)
    parapet_rim(sec, body, x0, x1, z0, z1, y1, h=0.7, sides=tuple(sd for sd in ("-x", "+x", "-z", "+z") if sd not in K.HIDE))
    roof_clutter(sec, x0, x1, z0, z1, y1, kinds=("tank", "dish", "antenna") if style == "a" else ("ac", "antenna", "ac"))


def billboard(sec, x, z, y, w, h, axis, sign):
    """Rooftop PVPSPINARENA billboard on a steel frame (faces `sign` along `axis`)."""
    for k in (-0.42, 0.42):
        a = (x if axis == "z" else z) + k * w
        if axis == "x":
            box(sec, "steel", x - 0.1, x + 0.1, y, y + 1.4 + h, a - 0.1, a + 0.1, skip=("-y",))
        else:
            box(sec, "steel", a - 0.1, a + 0.1, y, y + 1.4 + h, z - 0.1, z + 0.1, skip=("-y",))
    plane = (x if axis == "x" else z) + sign * 0.12
    c = z if axis == "x" else x
    proud(sec, "steel", axis, plane - sign * 0.06, sign, c - w / 2 - 0.1, c + w / 2 + 0.1, y + 1.3, y + 1.4 + h + 0.1, 0.06)
    quad_on(sec, "banner_wide", axis, plane + sign * 0.01, sign, c - w / 2, c + w / 2, y + 1.4, y + 1.4 + h,
            uvs=uvq(0, 1, 0, 1, axis, sign), shadow=False)
    # Spot lamps along the top edge.
    for i in range(4):
        a = c - w / 2 + w * (i + 0.5) / 4
        if axis == "x":
            box(sec, "lamp", plane + sign * 0.02, plane + sign * 0.35, y + 1.4 + h + 0.12, y + 1.4 + h + 0.25, a - 0.1, a + 0.1)
        else:
            box(sec, "lamp", a - 0.1, a + 0.1, y + 1.4 + h + 0.12, y + 1.4 + h + 0.25, plane, plane + sign * 0.35)


# ------------------------------------------------------------------------------- residential block (A) / terminal (B)
BLOCK = {"a": (-24.0, -14.0, -9.0, 1.0), "b": (14.0, 24.0, -1.0, 9.0)}
STYLE = {
    "a": {"ext": "plaster_ochre", "int": "plaster_white", "trim": "sandstone_dark", "ceil": "plaster_white",
          "upper": "plaster_rose", "wains": "tiles"},
    "b": {"ext": "concrete_wall", "int": "paint_white", "trim": "steel", "ceil": "paint_white",
          "upper": "concrete_wall", "wains": "tiles"},
}
OUTWARD = {"-x": ("x", -1), "+x": ("x", 1), "-z": ("z", -1), "+z": ("z", 1)}


def coincident(s, side):
    """True if another solid's same-facing face lies in this face's plane and covers it (the
    residential walls overlap at their corners; the covered face would z-fight)."""
    ax, sg = OUTWARD[side]
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    plane = (x0 if sg < 0 else x1) if ax == "x" else (z0 if sg < 0 else z1)
    a0, a1 = (z0, z1) if ax == "x" else (x0, x1)
    for o in SOLIDS:
        if o is s:
            continue
        p0, p1, q0, q1, r0, r1 = faces_of(o)
        op = (p0 if sg < 0 else p1) if ax == "x" else (r0 if sg < 0 else r1)
        b0, b1 = (r0, r1) if ax == "x" else (p0, p1)
        if abs(op - plane) < 1e-6 and b0 <= a0 + 1e-6 and b1 >= a1 - 1e-6 and q0 <= y0 + 1e-6 and q1 >= y1 - 1e-6:
            return True
    return False


def res_wall(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    sd = side_of(s)
    st = STYLE[sd]
    bx0, bx1, bz0, bz1 = BLOCK[sd]
    thin = "x" if (x1 - x0) < (z1 - z0) else "z"
    kind = s["kind"]

    def role(side):
        ax, sg = OUTWARD[side]
        if ax != thin:
            return "jamb"
        plane = (x0 if sg < 0 else x1) if ax == "x" else (z0 if sg < 0 else z1)
        on_edge = abs(plane - (bx0 if sg < 0 else bx1)) < 1e-6 if ax == "x" else abs(plane - (bz0 if sg < 0 else bz1)) < 1e-6
        return "ext" if on_edge else "int"

    def mat_of(side):
        if side in covered:
            return None
        if side == "-y":
            return st["trim"] if kind == "res-header" else None
        if side == "+y":
            return st["trim"] if kind == "res-sill" else None
        r = role(side)
        return st["trim"] if r == "jamb" else st[r]

    covered = {side for side in ("-x", "+x", "-z", "+z") if coincident(s, side)}
    faces6(sec, x0, x1, y0, y1, z0, z1, mat_of, skip=K.hidden())
    for side in ("-x", "+x", "-z", "+z"):
        if side in K.TOUCH or side in covered or role(side) == "jamb":
            continue
        ax, sg = OUTWARD[side]
        plane = (x0 if sg < 0 else x1) if ax == "x" else (z0 if sg < 0 else z1)
        a0, a1 = (z0, z1) if ax == "x" else (x0, x1)
        if role(side) == "ext" and kind != "res-header":
            for g0, g1 in free_spans(ax, plane, sg, a0, a1, 0.2, depth=0.0, step=0.1, reach=0.06):
                proud(sec, st["trim"], ax, plane, sg, g0, g1, 0, min(0.45, y1), 0.04)
            if a1 - a0 > 1.5 and R.random() < 0.7:
                idx = R.choice((4, 5, 6, 6)) if sd == "a" else R.choice((5, 6))
                wall_decal(sec, ax, plane, sg, (a0 + a1) / 2 + R.uniform(-0.3, 0.3), 1.0 if idx != 6 else 1.3,
                           min(1.6, a1 - a0 - 0.4), 1.0 if idx != 4 else 0.8, idx, off=0.045 if y1 > 0.45 else 0.006)
        elif role(side) == "int" and kind != "res-header":
            for g0, g1 in free_spans(ax, plane, sg, a0, a1, 0.5, depth=0.015, step=0.1, reach=0.04):
                atlas_quad(sec, st["wains"], ax, plane, sg, g0, g1, 0, min(1.1, y1), 0, 1, 1, off=0.006)
                if y1 > 1.2:
                    proud(sec, st["trim"], ax, plane, sg, g0, g1, 1.07, 1.1, 0.012)


def res_ceiling(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    sd = side_of(s)
    st = STYLE[sd]
    faces6(sec, x0, x1, y0, y1, z0, z1, lambda side: None if side == "+y" else (st["ceil"] if side == "-y" else st["trim"]),
           skip=K.hidden())
    # Setback ledge (the street-side strip in front of the upper floors) and its railing.
    sx0, sx1 = (x1 - 0.6, x1) if sd == "a" else (x0, x0 + 0.6)
    face(sec, "concrete", [(sx0, y1, z0), (sx0, y1, z1), (sx1, y1, z1), (sx1, y1, z0)], out=(0, 1, 0))
    xr = x1 - 0.06 if sd == "a" else x0 + 0.03
    box(sec, "steel", xr, xr + 0.03, y1 + 0.95, y1 + 1.0, z0, z1)
    for k in range(int((z1 - z0) / 1.5) + 1):
        zz = z0 + 0.05 + (z1 - z0 - 0.1) * k / int((z1 - z0) / 1.5)
        box(sec, "steel", xr, xr + 0.03, y1, y1 + 0.95, zz - 0.02, zz + 0.02)
    # Ceiling lights and a fan (under the 3.4 m ceiling, above reach).
    for i in range(3):
        for k in range(3):
            cx, cz = x0 + (x1 - x0) * (i + 0.5) / 3, z0 + (z1 - z0) * (k + 0.5) / 3
            face(sec, "ceiling_light", [(cx - 0.5, y0 - 0.012, cz - 0.15), (cx + 0.5, y0 - 0.012, cz - 0.15),
                                        (cx + 0.5, y0 - 0.012, cz + 0.15), (cx - 0.5, y0 - 0.012, cz + 0.15)],
                 out=(0, -1, 0), shadow=False)
    if sd == "a":
        cx, cz = (x0 + x1) / 2 - 1.5, (z0 + z1) / 2 - 1.0
        box(sec, "steel", cx - 0.02, cx + 0.02, y0 - 0.35, y0, cz - 0.02, cz + 0.02)
        cylinder(sec, "steel", cx, cz, y0 - 0.42, y0 - 0.33, 0.12, n=10, caps=(True, True))
        for g in range(4):
            a = g * math.pi / 2 + 0.4
            dx, dz = math.cos(a), math.sin(a)
            px, pz = -dz * 0.07, dx * 0.07
            face(sec, "wood", [(cx + px, y0 - 0.39, cz + pz), (cx + dx * 0.75 + px, y0 - 0.4, cz + dz * 0.75 + pz),
                               (cx + dx * 0.75 - px, y0 - 0.4, cz + dz * 0.75 - pz), (cx - px, y0 - 0.39, cz - pz)], out=(0, -1, 0))
    # Door openings: rolled-up shutter drums at the top of each doorway (above reach).
    doors = [("x", x1 if sd == "a" else x0, -1.6, 0.0), ("z", z1 if sd == "a" else z0, -20.0, -18.4)]
    for ax, plane, a0, a1 in doors:
        if sd == "b":
            a0, a1 = -a1, -a0
        if ax == "x":
            box(sec, "steel", plane - 0.3 if sd == "a" else plane, plane if sd == "a" else plane + 0.3, 2.95, 3.38, a0, a1)
        else:
            box(sec, "steel", a0, a1, 2.95, 3.38, plane - 0.3 if sd == "a" else plane, plane if sd == "a" else plane + 0.3)


def res_upper(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    sd = side_of(s)
    st = STYLE[sd]
    faces6(sec, x0, x1, y0, y1, z0, z1, lambda side: None if side == "-y" else ("concrete" if side == "+y" else st["upper"]),
           skip=K.hidden())
    street = ("x", x1, 1) if sd == "a" else ("x", x0, -1)
    for axis, plane, sgn, b0, b1 in (("x", x0, -1, z0, z1), ("x", x1, 1, z0, z1), ("z", z0, -1, x0, x1), ("z", z1, 1, x0, x1)):
        n = max(1, int((b1 - b0) / 2.5))
        is_street = (axis, plane, sgn) == street
        for wy in (4.3, 6.9):
            for i in range(n):
                a = b0 + (b1 - b0) * (i + 0.5) / n
                if not fits(axis, plane, sgn, a - 1.05, a + 1.05, wy - 0.15, wy + 1.5):
                    continue
                if sd == "b":
                    window_on(sec, axis, plane, sgn, a, wy - 0.3, (b1 - b0) / n - 0.2, 1.9, "curtain")
                    continue
                if is_street and i == 1:
                    continue  # hero banner bay
                style = "broken" if (i == n - 1 and wy == 4.3 and is_street) else "west"
                window_on(sec, axis, plane, sgn, a, wy, 1.0, 1.35, style)
                if wy == 6.9 and i % 2 == 0 and fits(axis, plane, sgn, a - 1.0, a + 1.0, wy - 0.3, wy + 0.9, 0.9):
                    balcony(sec, axis, plane, sgn, a, wy - 0.25, w=1.9)
                elif (i + n) % 3 == 0 and fits(axis, plane, sgn, a + 0.4, a + 1.4, wy - 0.8, wy - 0.1, 0.4):
                    ac_unit(sec, axis, plane, sgn, a + 0.9, wy - 0.7)
            for g0, g1 in free_spans(axis, plane, sgn, b0, b1, wy - 0.47, depth=0.06):
                proud(sec, st["trim"], axis, plane, sgn, g0, g1, wy - 0.55, wy - 0.4, 0.06)
    ax, plane, sgn = street
    a = z0 + (z1 - z0) * 1.5 / max(1, int((z1 - z0) / 2.5))
    hx = -14.0 if sd == "a" else 14.0  # ground-floor street face (header over the window band)
    sign_board(sec, "x", hx, sgn, -4.1 if sd == "a" else 4.1, 2.98, 2.6 if sd == "a" else 3.0, 0.62, 1 if sd == "a" else 4)
    if sd == "a":
        K.banner(sec, ax, plane, sgn, a, 4.0, 1.5, 3.9)
        laundry(sec, (plane + 0.9, 7.6, z0 + 0.3), (plane + 0.9, 7.5, a - 1.0))
    parapet_rim(sec, st["upper"], x0, x1, z0, z1, y1, h=0.6, sides=tuple(sd_ for sd_ in ("-x", "+x", "-z", "+z") if sd_ not in K.HIDE))
    roof_clutter(sec, x0, x1, z0, z1, y1, kinds=("tank", "dish", "tank", "ac") if sd == "a" else ("ac", "ac", "antenna"))


def counter(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    if s["kind"] == "counter":
        box(sec, "wood", x0 + 0.02, x1 - 0.02, y0, y1 - 0.05, z0 + 0.02, z1 - 0.02, skip=("-y",))
        box(sec, "tiles", x0, x1, y1 - 0.05, y1, z0, z1, chamfer=0.01)
        for k in range(1, 4):
            xx = x0 + (x1 - x0) * k / 4
            box(sec, "wood", xx - 0.02, xx + 0.02, 0.1, y1 - 0.12, z0, z0 + 0.02)
    else:
        box(sec, "paint_white", x0 + 0.02, x1 - 0.02, y0, y1 - 0.04, z0 + 0.02, z1 - 0.02, skip=("-y",))
        box(sec, "steel", x0, x1, y1 - 0.04, y1, z0, z1)
        box(sec, "steel_yellow", x0 + 0.01, x1 - 0.01, 0, 0.12, z0 + 0.01, z1 - 0.01, skip=("-y",))


def column(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    if side_of(s) == "a":
        box(sec, "plaster_white", x0, x1, y0, y1, z0, z1, skip=("-y", "+y"))
        box(sec, "sandstone_dark", x0 - 0.03, x1 + 0.03, 0, 0.3, z0 - 0.03, z1 + 0.03, skip=("-y",))
        box(sec, "sandstone_dark", x0 - 0.05, x1 + 0.05, y1 - 0.25, y1, z0 - 0.05, z1 + 0.05, skip=("+y",))
    else:
        box(sec, "concrete_wall", x0, x1, y0, y1, z0, z1, skip=("-y", "+y"))
        box(sec, "hazard", x0 - 0.015, x1 + 0.015, 0, 1.2, z0 - 0.015, z1 + 0.015, skip=("-y", "+y"))


# ------------------------------------------------------------------------------- terraces, stairs, yards
def terrace(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    sd = side_of(s)
    body, top, trim = ("plaster_ochre", "tiles", "sandstone_dark") if sd == "a" else ("concrete_wall", "concrete", "steel")
    faces6(sec, x0, x1, y0, y1, z0, z1, lambda side: None if side == "-y" else (top if side == "+y" else body), skip=K.hidden())
    for side in ("-x", "+x", "-z", "+z"):
        if side in K.HIDE:
            continue
        ax, sg = OUTWARD[side]
        plane = (x0 if sg < 0 else x1) if ax == "x" else (z0 if sg < 0 else z1)
        a0, a1 = (z0, z1) if ax == "x" else (x0, x1)
        if side in K.TOUCH:
            continue
        proud(sec, trim, ax, plane, sg, a0, a1, y1 - 0.22, y1, 0.05)
        proud(sec, trim, ax, plane, sg, a0, a1, 0, 0.4, 0.04)
        mid = (a0 + a1) / 2
        if a1 - a0 > 4 and free_at(ax, plane, sg, mid, 1.0):
            atlas_quad(sec, "shutter" if sd == "a" else "shutter_green", ax, plane, sg, mid - 1.4, mid + 1.4, 0.4, 2.5, 0, 1, 1, off=0.012)
            proud(sec, "steel", ax, plane, sg, mid - 1.5, mid + 1.5, 2.5, 2.7, 0.05)
            wall_decal(sec, ax, plane, sg, mid - 0.3, 0.8, 1.7, 0.9, 4 if sd == "a" else 5, off=0.016)
    # Deck: drain grates and a painted hazard edge along the stair gap (flat).
    for i in range(2):
        cx, cz = x0 + 1.2 + i * (x1 - x0 - 2.4), z0 + 1.2
        face(sec, "steel", [(cx - 0.2, y1 + 0.006, cz - 0.2), (cx - 0.2, y1 + 0.006, cz + 0.2),
                            (cx + 0.2, y1 + 0.006, cz + 0.2), (cx + 0.2, y1 + 0.006, cz - 0.2)], out=(0, 1, 0))


def parapet(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    if side_of(s) == "a":
        K.capped(sec, "plaster_ochre", "sandstone_dark", x0, x1, y0, y1 - 0.1, z0, z1, cap=0.03, cap_h=0.1, skip=("-y",))
    else:
        box(sec, "concrete_wall", x0, x1, y0, y1 - 0.06, z0, z1, skip=("-y", "+y") + K.hidden())
        gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.02)
        box(sec, "steel_yellow", gx0, gx1, y1 - 0.06, y1, gz0, gz1, skip=K.hidden())


def stair(sec, s):
    K.stair(sec, s, "west" if side_of(s) == "a" else "east")


def spawn_shield(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    if side_of(s) == "a":
        K.capped(sec, "brick", "sandstone_dark", x0, x1, y0, y1 - 0.14, z0, z1)
        K.plinth(sec, "sandstone_dark", x0, x1, z0, z1)
        K.banner(sec, "x", x0, -1, (z0 + z1) / 2, 0.55, 1.0, 1.75)
        wall_decal(sec, "x", x1, 1, (z0 + z1) / 2, 1.0, 1.8, 0.9, 4, off=0.006)
    else:
        K.spawn_shield(sec, s, "east")


def yard_wall(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    if s["kind"] == "yard-wall":
        K.capped(sec, "brick", "sandstone_dark", x0, x1, y0, y1 - 0.12, z0, z1, cap=0.04, cap_h=0.12)
        K.plinth(sec, "sandstone_dark", x0, x1, z0, z1, h=0.3)
        wall_decal(sec, "x", x1, 1, (z0 + z1) / 2, 0.9, 1.6, 0.9, R.choice((4, 5, 6)), off=0.006)
        return
    # Construction hoarding: corrugated panels between steel posts, printed brand strip.
    box(sec, "cladding", x0 + 0.03, x1 - 0.03, y0, y1 - 0.06, z0 + 0.05, z1 - 0.05, skip=("-y", "+y"))
    box(sec, "steel", x0, x1, y1 - 0.06, y1, z0, z1, skip=K.hidden())
    for zz in [z0 + (z1 - z0) * k / 2 for k in range(3)]:
        za, zb = max(z0, zz - 0.05), min(z1, zz + 0.05)
        box(sec, "steel", x0, x1, 0, y1 - 0.06, za, zb, skip=("-y",))
    box(sec, "hazard", x0 + 0.01, x1 - 0.01, 0, 0.35, z0 + 0.01, z1 - 0.01, skip=("-y", "+y"))
    for plane, sg in ((x0, -1), (x1, 1)):
        quad_on(sec, "banner_wide", "x", plane + sg * 0.035, sg, z0 + 0.15, z1 - 0.15, 1.0, 1.0 + (z1 - z0 - 0.3) / 4,
                uvs=uvq(0, 1, 0, 1, "x", sg), shadow=False)


# ------------------------------------------------------------------------------- shop backs (A) / site offices (B)
def shop_back(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    if side_of(s) == "b":
        return site_office(sec, s)
    faces6(sec, x0, x1, y0, y1, z0, z1,
           lambda side: None if side in ("-y", "-z", "+z") else ("concrete" if side == "+y" else "plaster"), skip=K.hidden())
    segs = segments(x0, x1, 3.2)
    for k, (a0, a1) in enumerate(segs):
        mat = A_WALLS[(k + int(x0)) % len(A_WALLS)]
        mid = (a0 + a1) / 2
        for zf, sg in ((z0, -1), (z1, 1)):
            face(sec, mat, [(a0, 0, zf), (a1, 0, zf), (a1, y1, zf), (a0, y1, zf)], out=(0, 0, sg))
            for g0, g1 in free_spans("z", zf, sg, a0, a1, 0.2, depth=0.0, step=0.1, reach=0.06):
                proud(sec, "sandstone_dark", "z", zf, sg, g0, g1, 0, 0.35, 0.03)
            if not free_at("z", zf, sg, mid, 0.8):
                continue
            if sg < 0:  # square side: back door, barred window, meters, pipes, posters
                atlas_quad(sec, "steel", "z", zf, sg, a0 + 0.4, a0 + 1.4, 0.35, 2.4, 0, 1, 1, off=0.01)
                proud(sec, "sandstone_dark", "z", zf, sg, a0 + 0.3, a0 + 1.5, 2.4, 2.55, 0.04)
                atlas_quad(sec, "glass", "z", zf, sg, a1 - 1.3, a1 - 0.5, 1.6, 2.4, 0, 1, 1, off=0.01)
                for b in range(5):
                    bx = a1 - 1.3 + 0.8 * (b + 0.5) / 5
                    proud(sec, "steel", "z", zf, sg, bx - 0.012, bx + 0.012, 1.6, 2.4, 0.03)
                proud(sec, "paint_white", "z", zf, sg, mid - 0.25, mid + 0.25, 1.3, 1.9, 0.05, chamfer=0.01)
                proud(sec, "rust", "z", zf, sg, a1 - 0.08, a1 - 0.02, 0.35, y1, 0.055)
                if k % 2 == 0:
                    wall_decal(sec, "z", zf, sg, mid + 0.1, 0.7, 0.75, 1.0, 5, off=0.012)
                else:
                    wall_decal(sec, "z", zf, sg, a0 + 0.9, 1.0, 1.4, 1.2, 6, off=0.012)
            else:  # alley side: small shops
                shopfront(sec, "z", zf, sg, a0 + 0.3, a1 - 0.3, k, closed=(k % 3 == 1), top=2.5)
                sign_board(sec, "z", zf, sg, mid, 2.95, min(2.0, a1 - a0 - 0.8), 0.5, SHOP_SIGNS[(k + 3) % len(SHOP_SIGNS)])
                if k % 2 == 0:
                    K.awning(sec, "z", zf, sg, a0 + 0.2, a1 - 0.2, 3.05, 0.95, AWNINGS[(k + 1) % len(AWNINGS)])
        if k % 2 == 1:
            ac_unit(sec, "z", z0, -1, mid, 3.0)
    for side, plane in (("-x", x0), ("+x", x1)):
        if side in K.TOUCH:
            continue
        sg = -1 if side == "-x" else 1
        proud(sec, "sandstone_dark", "x", plane, sg, z0, z1, 0, 0.35, 0.03)
        wall_decal(sec, "x", plane, sg, (z0 + z1) / 2, 0.9, 1.3, 1.3, 5 if sg < 0 else 4, off=0.012)
    parapet_rim(sec, "plaster", x0, x1, z0, z1, y1, h=0.45, sides=tuple(sd for sd in ("-x", "+x", "-z", "+z") if sd not in K.HIDE))
    roof_clutter(sec, x0, x1, z0, z1, y1, kinds=("ac", "tank", "dish"))


def site_office(sec, s):
    """Stacked portacabins: white panels, steel corner posts, windows and doors on both sides."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    faces6(sec, x0, x1, y0, y1, z0, z1, lambda side: None if side == "-y" else ("roof_metal" if side == "+y" else "paint_white"),
           skip=K.hidden())
    segs = segments(x0, x1, 3.0)
    for k, (a0, a1) in enumerate(segs):
        mid = (a0 + a1) / 2
        for zf, sg in ((z0, -1), (z1, 1)):
            for g0, g1 in free_spans("z", zf, sg, a0, a1, 0.2, depth=0.0, step=0.1, reach=0.06):
                if abs(g0 - a0) < 1e-6:
                    proud(sec, "steel", "z", zf, sg, a0, a0 + 0.12, 0, y1, 0.045)
                    g0 += 0.12
                proud(sec, "steel", "z", zf, sg, g0, g1, 1.75, 1.85, 0.03)  # module joint (two storeys)
                proud(sec, "hazard", "z", zf, sg, g0, g1, 0, 0.3, 0.02)
            if not free_at("z", zf, sg, mid, 0.8):
                continue
            if (k + (sg > 0)) % 3 == 0:
                atlas_quad(sec, "steel", "z", zf, sg, mid - 0.45, mid + 0.45, 0.3, 1.72, 0, 1, 1, off=0.012)
                sign_board(sec, "z", zf, sg, mid, 2.95, 1.0, 0.45, 5 if sg > 0 else 7)
            else:
                atlas_quad(sec, "glass", "z", zf, sg, mid - 0.6, mid + 0.6, 0.85, 1.55, 0, 1, 1, off=0.012)
                proud(sec, "steel", "z", zf, sg, mid - 0.66, mid + 0.66, 0.79, 0.85, 0.04)
            atlas_quad(sec, "glass", "z", zf, sg, mid - 0.6, mid + 0.6, 2.3, 3.0, 0, 1, 1, off=0.012)
            if k % 2 == 0:
                wall_decal(sec, "z", zf, sg, a1 - 0.6, 1.0, 0.7, 0.95, 5, off=0.018)
    for side, plane in (("-x", x0), ("+x", x1)):
        if side in K.TOUCH:
            continue
        sg = -1 if side == "-x" else 1
        proud(sec, "hazard", "x", plane, sg, z0, z1, 0, 0.3, 0.02)
        sign_board(sec, "x", plane, sg, (z0 + z1) / 2, 1.5, 1.1, 0.5, 7)
    gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.05)
    box(sec, "steel", gx0, gx1, y1, y1 + 0.1, gz0, gz1, skip=K.hidden())
    # Floodlight masts on the roof.
    for xx in (x0 + 0.5, x1 - 0.5):
        zz = z0 + 0.5
        box(sec, "steel", xx - 0.04, xx + 0.04, y1, y1 + 2.4, zz - 0.04, zz + 0.04, skip=("-y",))
        box(sec, "lamp", xx - 0.25, xx + 0.25, y1 + 2.4, y1 + 2.6, zz - 0.1, zz + 0.1)
    roof_clutter(sec, x0, x1, z0, z1, y1 + 0.1, kinds=("ac", "ac"))


# ------------------------------------------------------------------------------- props
def crates(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    nx = max(1, round((x1 - x0) / 1.3))
    if nx > 1:
        box(sec, "wood", x0 + 0.06, x1 - 0.06, y0, y1 - 0.06, z0 + 0.06, z1 - 0.06, skip=("-y",))
    for i in range(nx):
        K.crate(sec, x0 + (x1 - x0) * i / nx, x0 + (x1 - x0) * (i + 1) / nx, y0, y1, z0, z1)


def market_stall(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    if s["kind"] == "pipe-stack":
        return pipe_stack(sec, s)
    top = y1 - 0.25
    box(sec, "wood", x0 + 0.02, x1 - 0.02, y0, top - 0.02, z0 + 0.02, z1 - 0.02, skip=("-y",))
    for cx in (x0, x1 - 0.07):
        for cz in (z0, z1 - 0.07):
            box(sec, "wood", cx, cx + 0.07, 0, top, cz, cz + 0.07, skip=("-y",))
    # A tray on the counter (closes the top to the collision face) carrying produce crates.
    box(sec, "wood", x0 + 0.012, x1 - 0.012, top - 0.02, top + 0.12, z0 + 0.012, z1 - 0.012)
    top += 0.12
    nx, nz = max(1, int((x1 - x0) / 0.6)), max(1, int((z1 - z0) / 0.5))
    fills = ("canvas_terracotta", "canvas_green", "canvas_sand", "steel_yellow")
    for i in range(nx):
        for k in range(nz):
            a0, a1 = x0 + (x1 - x0) * i / nx + 0.03, x0 + (x1 - x0) * (i + 1) / nx - 0.03
            b0, b1 = z0 + (z1 - z0) * k / nz + 0.03, z0 + (z1 - z0) * (k + 1) / nz - 0.03
            box(sec, "wood", a0, a1, top, y1 - 0.04, b0, b1, skip=("-y", "+y"))
            box(sec, fills[(i + 2 * k) % len(fills)], a0 + 0.02, a1 - 0.02, top + 0.01, y1 - 0.01, b0 + 0.02, b1 - 0.02,
                skip=("-y",), chamfer=0.03)
    # Cloth skirt on the long sides.
    for zf, sg in ((z0, -1), (z1, 1)):
        quad_on(sec, "canvas_sand", "z", zf + sg * 0.012, sg, x0 + 0.05, x1 - 0.05, 0.1, top, shadow=False)


def pipe_stack(sec, s):
    """Steel pipes stacked in layers on timber battens, filling the collision box."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    along_x = (x1 - x0) >= (z1 - z0)
    a0, a1 = (x0, x1) if along_x else (z0, z1)
    c0, c1 = (z0, z1) if along_x else (x0, x1)
    n = max(3, int((c1 - c0) / 0.34))
    n += 1 - n % 2  # odd: a pipe sits on the centre line (the face probe)
    rr = (c1 - c0 - 0.02) / (2 * n)
    bat = 0.06
    layers = max(1, int((y1 - 0.01) / (2 * rr + bat)))
    bat = (y1 - 0.01 - layers * 2 * rr) / layers
    y = 0.0
    for layer in range(layers):
        for t in (a0 + 0.3, a1 - 0.4):  # battens under each layer
            if along_x:
                box(sec, "wood", t, t + 0.1, y, y + bat, c0 + 0.01, c1 - 0.01, skip=("-y",) if y == 0 else ())
            else:
                box(sec, "wood", c0 + 0.01, c1 - 0.01, y, y + bat, t, t + 0.1, skip=("-y",) if y == 0 else ())
        yc = y + bat + rr
        for i in range(n):
            c = c0 + 0.01 + rr * (1 + 2 * i)
            hcyl(sec, "rust" if (i + layer) % 3 else "steel", "x" if along_x else "z", a0 + 0.01, a1 - 0.01, yc, c, rr * 0.985, n=10)
        y += bat + 2 * rr
    for t in (a0 + 0.7, a1 - 0.75):  # straps over the stack
        if along_x:
            box(sec, "steel_yellow", t, t + 0.05, 0.0, y1, c0 - 0.004, c1 + 0.004, skip=("-y",))
        else:
            box(sec, "steel_yellow", c0 - 0.004, c1 + 0.004, 0.0, y1, t, t + 0.05, skip=("-y",))


def kiosk(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    if s["kind"] == "generator":
        return generator(sec, s)
    box(sec, "shutter_green", x0, x1, y0, y1 - 0.1, z0, z1, skip=("-y", "+y") + K.hidden())
    gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.04)
    box(sec, "steel", gx0, gx1, y1 - 0.1, y1, gz0, gz1, skip=K.hidden())
    for side in ("+x", "-x", "+z", "-z"):
        if side in K.TOUCH:
            continue
        ax, sg = OUTWARD[side]
        plane = (x0 if sg < 0 else x1) if ax == "x" else (z0 if sg < 0 else z1)
        a0, a1 = (z0, z1) if ax == "x" else (x0, x1)
        if side == "+x":
            atlas_quad(sec, "shutter", ax, plane, sg, a0 + 0.1, a1 - 0.1, 0.3, 1.6, 0, 1, 1, off=0.012)
            sign_board(sec, ax, plane, sg, (a0 + a1) / 2, 1.6, a1 - a0 - 0.3, 0.4, 2)
        else:
            wall_decal(sec, ax, plane, sg, (a0 + a1) / 2, 0.8, min(1.1, a1 - a0 - 0.2), 1.1, 5, off=0.006)


def generator(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "steel", x0, x1, 0, 0.28, z0, z1, skip=("-y",))
    box(sec, "steel_yellow", x0 + 0.03, x1 - 0.03, 0.28, y1 - 0.5, z0 + 0.03, z1 - 0.03, skip=("-y",), chamfer=0.04)
    for zf, sg in ((z0 + 0.03, -1), (z1 - 0.03, 1)):
        for k in range(3):
            xa = x0 + 0.2 + (x1 - x0 - 0.4) * k / 3
            quad_on(sec, "interior_dark", "z", zf + sg * 0.005, sg, xa + 0.05, xa + (x1 - x0 - 0.4) / 3 - 0.05, 0.6, 1.3, shadow=False)
        wall_decal(sec, "z", zf, sg, (x0 + x1) / 2, 1.45, 0.5, 0.18, 2, off=0.008)
    # Exhaust stack and a fuel drum on top (inside the footprint).
    cylinder(sec, "rust", x1 - 0.35, z0 + 0.35, y1 - 0.5, y1, 0.07, 0.07, n=8, caps=(False, True))
    cylinder(sec, "car_red", x0 + 0.45, (z0 + z1) / 2, y1 - 0.5, y1 - 0.02, 0.29, 0.29, n=12)


def jersey(sec, s):
    K.jersey(sec, s)
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    along_x = (x1 - x0) > (z1 - z0)
    ground_decal("ground", 7, (x0 + x1) / 2, (z0 + z1) / 2 + (0.9 if along_x else 0), 1.6, 1.0, R.uniform(0, 3), y=0.014)


# ------------------------------------------------------------------------------- vehicles
def wheel(sec, axis_c, x, y, z0, z1, r, burnt=False):
    if burnt:
        hcyl(sec, "steel", "z", z0 + 0.04, z1 - 0.04, y, x, r * 0.72, n=12)
        hcyl(sec, "rust", "z", z0 + 0.06, z1 - 0.06, y, x, r * 0.5, n=8)
        return
    hcyl(sec, "rubber", "z", z0, z1, y, x, r, n=14)
    for zf, sg in ((z0, -1), (z1, 1)):
        pts = [(x + r * 0.55 * math.sin(2 * math.pi * i / 10), y + r * 0.55 * math.cos(2 * math.pi * i / 10), zf + sg * 0.004)
               for i in range(10)]
        face(sec, "steel", pts, out=(0, 0, sg))


def vehicle(sec, s, style):
    """Box-filling vehicles (the collision is one box): a burnt-out minibus (A yard), a white
    panel van (B yard) and a cab-over pickup loaded to the cab roof (the square)."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    burnt = style == "minibus"
    paint = {"minibus": "rust", "van": "car_white", "pickup": "car_sand"}[style]
    r = 0.34
    front = x0 if s["x"] < 0 else x1   # faces away from its side's spawn wall
    fs = -1 if front == x0 else 1
    L_ = x1 - x0
    wx = (x0 + 0.85, x1 - 0.85)
    for wxx in wx:
        for za, zb in ((z0 + 0.01, z0 + 0.24), (z1 - 0.24, z1 - 0.01)):
            wheel(sec, None, wxx, r if not burnt else r * 0.8, za, zb, r, burnt)
    box(sec, "interior_dark", x0 + 0.3, x1 - 0.3, 0.12, 0.34, z0 + 0.28, z1 - 0.28, skip=("-y",))
    by0 = 0.34 if not burnt else 0.24
    if style == "pickup":
        cab0, cab1 = (x0, x0 + 1.75) if fs < 0 else (x1 - 1.75, x1)
        bed0, bed1 = (x0 + 1.8, x1) if fs < 0 else (x0, x1 - 1.8)
        box(sec, paint, cab0 + 0.03, cab1 - 0.03, by0, y1 - 0.02, z0 + 0.03, z1 - 0.03, skip=("-y",), chamfer=0.1)
        box(sec, paint, bed0 + (0.03 if fs > 0 else 0), bed1 - (0.03 if fs < 0 else 0), by0, 0.95, z0 + 0.03, z1 - 0.03,
            skip=("-y",))
        # Load under a lashed tarp, up to the cab roof.
        box(sec, "wood", bed0 + 0.03, bed1 - 0.03, 0.95, 1.2, z0 + 0.03, z1 - 0.03, skip=("-y",))
        box(sec, "canvas_olive", bed0 + 0.035, bed1 - 0.035, 1.2, y1 - 0.01, z0 + 0.035, z1 - 0.035, chamfer=0.06)
        for t in (0.25, 0.5, 0.75):
            xx = bed0 + (bed1 - bed0) * t
            box(sec, "steel_yellow", xx - 0.025, xx + 0.025, 0.95, y1, z0 + 0.018, z1 - 0.018)
        glass_x = cab0 + 0.03 if fs < 0 else cab1 - 0.03
        quad_on(sec, "glass", "x", glass_x + fs * 0.008, fs, z0 + 0.15, z1 - 0.15, 0.95, y1 - 0.15, shadow=False)
        for zf, sg in ((z0 + 0.03, -1), (z1 - 0.03, 1)):
            quad_on(sec, "glass", "z", zf + sg * 0.008, sg, cab0 + 0.2, cab1 - 0.25, 0.95, y1 - 0.15, shadow=False)
    else:
        box(sec, paint, x0 + 0.03, x1 - 0.03, by0, y1 - 0.02, z0 + 0.03, z1 - 0.03, skip=("-y",), chamfer=0.14)
        win = "interior_dark" if burnt else "glass"
        quad_on(sec, win, "x", front - fs * 0.022, fs, z0 + 0.18, z1 - 0.18, 0.95, y1 - 0.18, shadow=False)
        for zf, sg in ((z0 + 0.03, -1), (z1 - 0.03, 1)):
            if style == "minibus":
                for k in range(4):
                    a = x0 + 0.35 + (L_ - 0.7) * k / 4
                    quad_on(sec, win, "z", zf + sg * 0.008, sg, a + 0.06, a + (L_ - 0.7) / 4 - 0.06, 0.95, y1 - 0.2, shadow=False)
            else:
                a = front - fs * 0.25
                quad_on(sec, win, "z", zf + sg * 0.008, sg, min(a, a - fs * 0.9), max(a, a - fs * 0.9), 0.95, y1 - 0.2, shadow=False)
                quad_on(sec, "decals", "z", zf + sg * 0.009, sg, (x0 + x1) / 2 - 0.7, (x0 + x1) / 2 + 0.7, 0.55, 1.2,
                        uvs=uvq(*cell(4, 4, 2), "z", sg), shadow=False)
    # Bumpers and lights.
    for xe, sg in ((x0, -1), (x1, 1)):
        box(sec, "steel" if not burnt else "rust", min(xe, xe - sg * 0.1), max(xe, xe - sg * 0.1), by0, by0 + 0.2, z0 + 0.05, z1 - 0.05)
        if not burnt:
            for zl in (z0 + 0.3, z1 - 0.3):
                quad_on(sec, "lamp" if sg == fs else "car_red", "x", xe - sg * 0.025, sg, zl - 0.13, zl + 0.13,
                        by0 + 0.35, by0 + 0.5, shadow=False)
    if burnt:
        ground_decal("ground", 0, (x0 + x1) / 2, (z0 + z1) / 2, L_ + 1.6, z1 - z0 + 1.8, 0.1, y=0.013)
        rubble(sec, (x0 + x1) / 2, z0 - 0.5, r=0.6, n=8, mat="rust")


def rotor_hub(sec, s):
    """The Mi-8's main gearbox torn off with the rotor head: a rust-streaked housing filling the
    collision box, the hub plate flush on its end and the blade roots lying on top."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    cz = (z0 + z1) / 2
    box(sec, "rust", x0 + 0.02, x1 - 0.02, 0, y1 - 0.02, z0 + 0.02, z1 - 0.02, skip=("-y",), chamfer=0.1)
    for xx in (x0 + 0.45, x0 + 0.9):  # housing ribs, flush
        for zf, sg in ((z0 + 0.02, -1), (z1 - 0.02, 1)):
            proud(sec, "steel", "z", zf, sg, xx - 0.04, xx + 0.04, 0.1, y1 - 0.15, 0.03)
    cone(sec, "steel", (x1 - 0.02, 0.6, cz), (1, 0, 0), 0.4, 0.36, 0.04, n=16)        # hub plate
    cone(sec, "steel", (x1 - 0.5, y1 - 0.02, cz), (0, 1, 0), 0.24, 0.2, 0.09, n=12)   # mast stump
    for ang in (0.3, 1.55, 2.8, 4.05, 5.3):
        d = (math.cos(ang), 0, math.sin(ang))
        reach = min((x1 - 0.05 - (x1 - 0.5)) / max(0.05, d[0]) if d[0] > 0 else (x1 - 0.5 - x0 - 0.05) / max(0.05, -d[0]),
                    (z1 - cz - 0.05) / max(0.05, abs(d[2])), 0.8)
        cone(sec, "steel", (x1 - 0.5, y1 + 0.04, cz), d, 0.06, 0.05, max(0.12, reach - 0.06), n=6)
    ground_decal("ground", 0, (x0 + x1) / 2, cz, 3.2, 2.0, 0.4)
    rubble(sec, x1 + 0.4, cz + (0.7 if cz > 0 else -0.7), r=0.5, n=8, mat="rust")  # away from the hull


# ------------------------------------------------------------------------------- dispatch
SKIP_KINDS = ("heli-",)  # the wreck is built by heli.py from the Mi-8 model


def dress(L, sec, s):
    kind = s["kind"]
    K.TOUCH = K.touching(s, SOLIDS)
    K.HIDE = K.touching(s, SOLIDS, full=True)
    try:
        if kind.startswith(SKIP_KINDS):
            return
        if kind == "shop-row":
            shop_row(sec, s)
        elif kind == "industrial-row":
            industrial_row(sec, s)
            if s["id"] == "south-shops-c-b":
                x0, x1, y0, y1, z0, z1 = faces_of(s)
                scaffold(sec, "z", z1, 1, x0 + 1.0, x1 - 1.0, 3.05, y1 - 0.2)
        elif kind in ("apartment-tower", "apartment-rear"):
            tall_block(sec, s, "a", balconies=kind == "apartment-tower")
            if kind == "apartment-tower":
                x0, x1, y0, y1, z0, z1 = faces_of(s)
                K.banner(sec, "x", x1, 1, (z0 + z1) / 2 + 1.6, 4.2, 1.5, 4.0)
            else:
                x0, x1, y0, y1, z0, z1 = faces_of(s)
                quad_on(sec, "banner_wide", "z", z1 + 0.03, 1, -17.4, -12.6, 5.05, 6.25, uvs=uvq(0, 1, 0, 1, "z", 1), shadow=False)
                box(sec, "steel", -17.5, -12.5, 6.23, 6.29, z1, z1 + 0.05)
        elif kind in ("terminal-tower", "terminal-rear"):
            tall_block(sec, s, "b")
            if kind == "terminal-tower":
                x0, x1, y0, y1, z0, z1 = faces_of(s)
                billboard(sec, x0 + 1.4, (z0 + z1) / 2, y1, 5.6, 1.4, "x", -1)
        elif kind == "terrace":
            terrace(sec, s)
        elif kind == "parapet":
            parapet(sec, s)
        elif kind == "stair":
            stair(sec, s)
        elif kind in ("res-wall", "res-sill", "res-header"):
            res_wall(sec, s)
        elif kind == "res-ceiling":
            res_ceiling(sec, s)
        elif kind == "res-upper":
            res_upper(sec, s)
        elif kind in ("counter", "ticket-counter"):
            counter(sec, s)
        elif kind == "column":
            column(sec, s)
        elif kind in ("spawn-shield", "transport-barrier"):
            spawn_shield(sec, s)
        elif kind in ("yard-wall", "yard-fence"):
            yard_wall(sec, s)
        elif kind in ("shop-back", "site-office"):
            shop_back(sec, s)
        elif kind in ("market-stall", "pipe-stack"):
            market_stall(sec, s)
        elif kind in ("kiosk", "generator"):
            kiosk(sec, s)
        elif kind == "crate":
            crates(sec, s)
        elif kind == "crate-stack":
            K.crate_stack(sec, s)
        elif kind in ("supply-crate", "cargo-stack"):
            K.tarp_stack(sec, s)
        elif kind == "jersey-barrier":
            jersey(sec, s)
        elif kind == "car":
            vehicle(sec, s, "minibus")
        elif kind == "van":
            vehicle(sec, s, "van")
        elif kind == "pickup":
            vehicle(sec, s, "pickup")
        elif kind == "rotor-hub":
            rotor_hub(sec, s)
        else:
            raise KeyError(f"no dressing for kind {kind!r} ({s['id']})")
    finally:
        K.TOUCH, K.HIDE = set(), set()


# ------------------------------------------------------------------------------- ground
def ground_mat(cx, cz):
    if -24 < cx < -14 and -9 < cz < 1 or 14 < cx < 24 and -1 < cz < 9:
        return "tiles"
    if cx < -14 and cz > 1:
        return "paving"
    if cx > 14 and cz < -1:
        return "concrete"
    if cz > 11.5:
        return "paving"
    if cz < -11.5:
        return "concrete"
    return "asphalt"


def ground(A, solids, walls):
    """Floor on a 0.5 m grid with per-zone materials and baked contact AO (as the Dustfront kit)."""
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
    ao = 1 - 0.42 * np.exp(-dist / 0.5)
    # Indoors: darker overall (the ceiling shades the floor).
    for (bx0, bx1, bz0, bz1) in BLOCK.values():
        inside = (gx > bx0) & (gx < bx1) & (gz > bz0) & (gz < bz1)
        ao = np.where(inside, ao * 0.82, ao)
    for i in range(len(xs)):
        for k in range(len(zs)):
            K.AO[(round(float(xs[i]), 3), round(float(zs[k]), 3))] = float(ao[i, k])
    for i in range(len(xs) - 1):
        for k in range(len(zs) - 1):
            x0, x1, z0, z1 = float(xs[i]), float(xs[i + 1]), float(zs[k]), float(zs[k + 1])
            cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
            if any(abs(cx - o["x"]) + step / 2 <= o["w"] / 2 and abs(cz - o["z"]) + step / 2 <= o["d"] / 2
                   and o["y"] - o["h"] / 2 < 0.05 and o["layer"] == "box" for o in solids):
                continue
            face("ground", ground_mat(cx, cz), [(x0, 0, z0), (x0, 0, z1), (x1, 0, z1), (x1, 0, z0)], out=(0, 1, 0), offset=(0, 0))


def ground_details():
    """Road paint, the crash scar around the wreck, stains, cracks and debris (all flat)."""
    g = "ground"
    # Crash scar: gouge along the slide path from the east, scorch under and around the hull.
    ground_decal(g, 0, 0.0, 0.0, 15.0, 6.5, 0.0, y=0.012)
    ground_decal(g, 0, 7.2, -0.6, 5.0, 3.2, 0.25, y=0.013)
    ground_decal(g, 0, -6.8, 0.8, 4.0, 3.0, -0.3, y=0.013)
    for k in range(6):
        ground_decal(g, 7, 6.5 + k * 1.6, -0.2 + 0.12 * k, 2.2, 1.6, R.uniform(0, 3), y=0.014)
    for x, z, rot in ((9.6, 4.9, 0.2), (-9.6, -4.9, 0.2)):
        ground_decal(g, 0, x, z, 4.2, 2.4, rot, y=0.013)
    # Worn lane markings on the streets and the square (dashes), parking bays, arrows.
    for x in (-13.0, 13.0):
        for z in range(-8, 9, 3):
            ground_decal(g, 2, x, z + 0.5, 0.16, 1.4, 0.0, y=0.012)
    for z in (-7.6, 7.6):
        for x in range(-10, 11, 3):
            if abs(x) > 6:
                ground_decal(g, 2, x + 0.5, z, 1.4, 0.16, 0.0, y=0.012)
    for x, z, rot in ((-13.0, 6.5, 0.0), (13.0, -6.5, math.pi), (-10.5, -7.6, -math.pi / 2), (10.5, 7.6, math.pi / 2)):
        ground_decal(g, 3, x, z, 0.9, 1.8, rot, y=0.013)
    # Bus bays in front of the terminal (B) and the shops (A): long stripes.
    for x in (12.4, -12.4):
        for k in range(4):
            ground_decal(g, 2, x, (-1.0 if x > 0 else 1.0) + (k - 1.5) * 2.0, 0.12, 1.6, 0.0, y=0.012)
    # Stains, cracks, small debris across the open ground.
    for _ in range(46):
        x, z = R.uniform(-23, 23), R.uniform(-19, 19)
        if inside_any(x, 0.05, z, pad=0.6):
            continue
        idx = R.choice((1, 1, 7, 7, 7, 0))
        sz = R.uniform(0.8, 2.2) if idx != 0 else R.uniform(1.0, 1.8)
        ground_decal(g, idx, x, z, sz, sz * R.uniform(0.6, 1.0), R.uniform(0, math.tau), y=0.015 + 0.0005 * (idx % 3))
    for x, z in ((3.5, -3.6), (-3.5, 3.6), (8.0, 2.6), (-8.0, -2.6), (5.5, 4.0), (-5.5, -4.0)):
        rubble("centre-mid", x, z, r=0.9, n=10, mat=R.choice(("rust", "steel", "brick_soot")))


# ------------------------------------------------------------------------------- overhead
def overhead():
    """Cables, bunting, laundry and the market arches over the alley and passage (>= 3.0 m)."""
    # A market alley: bunting from the shop row (z 16) to the shop backs (z 11.5, roof 3.6).
    for x in (-12.0, -7.0, -2.0, 2.5, 7.5, 10.5):
        bunting("centre-south" if abs(x) < 6.5 else ("west-south" if x < 0 else "east-south"),
                (x, 5.6, 15.9), (x + R.uniform(-0.8, 0.8), 3.9, 11.6), sag=0.45)
    for x0, x1 in ((-13.5, -4.0), (-3.0, 6.0), (4.0, 11.5)):
        wire("centre-south", (x0, 6.2, 15.9), (x1, 6.0, 15.9 - R.uniform(0.2, 1.0)), sag=0.8)
    laundry("west-south", (-11.2, 6.4, 15.6), (-9.6, 4.5, 11.7), sag=0.3)
    # Market arches over the two connectors (signs above reach).
    for xa, xb in ((-8.0, -6.0), (3.0, 5.0)):
        box("centre-south", "steel", xa, xb, 3.3, 3.42, 10.15, 10.35)
        sign_board("centre-south", "z", 10.15, -1, (xa + xb) / 2, 3.48, 1.7, 0.55, 6)
        sign_board("centre-south", "z", 10.35, 1, (xa + xb) / 2, 3.48, 1.7, 0.55, 6)
    # B passage: power cables between the site offices and the sheds, a hazard gantry.
    for x in (-8.0, -1.5, 6.0, 11.0):
        wire("centre-north", (x, 6.0, -16.1), (x + R.uniform(-1, 1), 3.75, -11.6), sag=0.5)
    for xa, xb in ((-5.0, -3.0), (6.0, 8.0)):
        box("centre-north", "steel_yellow", xa, xb, 3.3, 3.42, -10.35, -10.15)
        sign_board("centre-north", "z", -10.15, 1, (xa + xb) / 2, 3.48, 1.4, 0.5, 5)
        sign_board("centre-north", "z", -10.35, -1, (xa + xb) / 2, 3.48, 1.4, 0.5, 7)
    # Cables over the square between the residential block and the terminal rooftops (high).
    wire("centre-mid", (-14.6, 8.2, -6.0), (14.6, 8.2, 6.0), sag=2.2, n=24, t=0.022)
    wire("centre-mid", (-14.6, 7.6, -2.0), (-8.0, 6.5, 11.4), sag=0.9, n=12)
    wire("centre-mid", (14.6, 7.6, 2.0), (8.0, 6.5, -11.4), sag=0.9, n=12)


# ------------------------------------------------------------------------------- perimeter
def perimeter(L):
    """Boundary walls dressed as the backs of the surrounding buildings (inner faces + tops)."""
    sec = "perimeter"
    for w in L["walls"]:
        x0, x1, y0, y1, z0, z1 = faces_of(w)
        if w["id"] in ("wall-west", "wall-east"):
            east = w["id"] == "wall-east"
            plane, sg = (x0, -1) if east else (x1, 1)
            mat = "concrete_wall" if east else "plaster_ochre"
            face(sec, mat, [(plane, 0, z0), (plane, 0, z1), (plane, y1, z1), (plane, y1, z0)], out=(sg, 0, 0))
            box(sec, "sandstone_dark" if not east else "steel", x0 - 0.1, x1 + 0.1, y1 - 0.3, y1 + 0.05, -19.9, 19.9, skip=("-y",))
            spawn_z = -6.5 if east else 6.5
            for zz0, zz1 in ((-19.5, -16.5), (-15.5, -9.5), (1.5, 15.5), (-8.5, 0.5)):
                if east:
                    zz0, zz1 = -zz1, -zz0
                n = max(1, int((zz1 - zz0) / 2.6))
                for i in range(n):
                    a = zz0 + (zz1 - zz0) * (i + 0.5) / n
                    for wy in (3.5, 6.3):
                        if free_at("x", plane, sg, a, wy + 0.6):
                            window_on(sec, "x", plane, sg, a, wy, 1.0 if not east else 2.2, 1.3, "west" if not east else "curtain")
                    if free_at("x", plane, sg, a, 1.0) and abs(a - spawn_z) > 2.5:
                        if not east and i % 2 == 0:
                            quad_on(sec, "wood_blue", "x", plane + sg * 0.012, sg, a - 0.55, a + 0.55, 0, 2.3,
                                    uvs=uvq(0, 0.9, 0, 1.9, "x", sg))
                        elif east:
                            atlas_quad(sec, "shutter", "x", plane, sg, a - 1.1, a + 1.1, 0, 2.9, 0, 1, 1, off=0.012)
                        else:
                            K.window(sec, "x", plane, sg, a, 1.1, 1.0, 1.2, "west")
            K.banner(sec, "x", plane, sg, spawn_z, 1.4, 1.7, 3.4)
            for zz in (spawn_z - 3.0, spawn_z + 3.0):
                K.lamp(sec, "x", plane, sg, zz, 3.1)
            if east:
                proud(sec, "hazard", "x", plane, sg, -11.5, -1.0, 0, 0.35, 0.02)
            else:
                proud(sec, "sandstone_dark", "x", plane, sg, 1.05, 16.0, 0, 0.45, 0.04)
        else:
            north = w["id"] == "wall-north"
            plane, sg = (z1, 1) if north else (z0, -1)
            for a0, a1, mat, off in (((-24, 0, "plaster_rose", 0.0), (0, 24, "cladding", 0.006)) if north
                                     else ((-24, 0, "plaster_ochre", 0.0), (0, 24, "concrete_wall", 0.006))):
                p_ = plane + sg * off
                face(sec, mat, [(a0, 0, p_), (a1, 0, p_), (a1, y1, p_), (a0, y1, p_)], out=(0, 0, sg))
            proud(sec, "sandstone_dark", "z", plane, sg, -0.25, 0.25, 0, y1, 0.12)  # building corner over the seam
            for i in range(16):
                a = -23 + 46 * (i + 0.5) / 16
                if free_at("z", plane, sg, a, 7.8):
                    window_on(sec, "z", plane, sg, a, 7.4, 1.0, 1.1, "west" if a < 0 else "east")
            box(sec, "sandstone_dark", x0, x1, y1 - 0.25, y1 + 0.05, z0 - 0.1, z1 + 0.1, skip=("-y",))


# ------------------------------------------------------------------------------- background
def city_block(x0, x1, z0, z1, h, mat, roof=True):
    sec = "background"
    box(sec, mat, x0, x1, 0, h, z0, z1, skip=("-y", "+y"), offset=(0.0, 0.0))
    face(sec, "concrete" if mat == "facade" else "roof_metal", [(x0, h, z0), (x0, h, z1), (x1, h, z1), (x1, h, z0)], out=(0, 1, 0))
    box(sec, "sandstone_dark" if mat == "facade" else "steel", x0 - 0.15, x1 + 0.15, h, h + 0.5, z0 - 0.15, z0 + 0.1, skip=("-y",))
    if roof and (x1 - x0) * (z1 - z0) > 30 and R.random() < 0.6:
        water_tank(sec, x0 + 1.2, h + 0.05, z0 + 1.4, r=0.6, h=1.2)


def ring(side, inner, depth_rng, hrng, mat, step=(6, 11)):
    """A row of blocks along one side of the arena, `inner` metres beyond the boundary wall."""
    hw, hd = ARENA["width"] / 2 + 0.8, ARENA["depth"] / 2 + 0.8
    if side in ("west", "east"):
        a, end = -hd - 14, hd + 14
        while a < end:
            w = R.uniform(*step)
            d = R.uniform(*depth_rng)
            x0 = -hw - inner - d if side == "west" else hw + inner
            city_block(x0, x0 + d, a, a + w, R.uniform(*hrng), mat)
            a += w + R.uniform(0.5, 2.5)
    else:
        a, end = -hw - 6, hw + 6
        while a < end:
            w = R.uniform(*step)
            d = R.uniform(*depth_rng)
            z0 = -hd - inner - d if side == "north" else hd + inner
            m = mat if not callable(mat) else mat(a)
            city_block(a, a + w, z0, z0 + d, R.uniform(*hrng), m)
            a += w + R.uniform(0.5, 2.5)


def background(L):
    # Near ring: blocks hugging the boundary (their fronts are the perimeter walls).
    ring("west", 0.0, (6, 9), (9.5, 14), "facade")
    ring("east", 0.0, (6, 9), (9.5, 13), "facade_ind")
    ring("south", 0.0, (6, 9), (9.5, 15), lambda a: "facade" if a < 6 else "facade_ind")
    ring("north", 0.0, (6, 9), (9.5, 14), lambda a: "facade" if a < -8 else "facade_ind")
    # Far ring: taller skyline beyond a street.
    ring("west", 16.0, (8, 12), (16, 30), "facade", step=(8, 14))
    ring("east", 16.0, (8, 12), (14, 24), "facade_ind", step=(9, 15))
    ring("south", 16.0, (8, 12), (16, 32), "facade", step=(8, 14))
    ring("north", 16.0, (8, 12), (14, 26), lambda a: "facade" if a < -10 else "facade_ind", step=(8, 14))
    # Landmarks: dome and minaret behind the A side, a crane and water tower behind the B side.
    K.dome(-40.0, 13.0, 4.2, 12.0)
    K.tower(-36.0, -8.0, 3.2, 22.0)
    K.crane(38.0, -14.0)
    K.crane(-6.0, -40.0)
    K.water_tower(37.0, 15.0)


PALM_SPOTS = [(-27.0, 21.5), (-31.0, 3.0), (-28.5, -21.5), (-12.0, 24.0), (2.0, 24.5), (-36.0, 24.0),
              (27.5, -21.5), (12.0, -24.0)]


# ------------------------------------------------------------------------------- validate + build
NO_AO = ("lamp", "banner", "banner_wide", "glass", "decals", "signs", "ceiling_light", "wire", "interior_dark")


def section_of(x, z):
    sx = "west" if x < -8 else "east" if x > 8 else "centre"
    sz = "north" if z < -7 else "south" if z > 7 else "mid"
    return f"{sx}-{sz}"


def validate(L):
    """Below 2.9 m inside the playable rectangle, every dressing vertex lies within 6 cm of a
    gameplay solid, on its top inside its footprint, or is ground detail (<= 0.13 m)."""
    tol = 0.061
    hw, hd = L["arena"]["width"] / 2, L["arena"]["depth"] / 2
    bad = []
    for (sec, mat, _shadow), b in K.BUCKETS.items():
        if sec in ("background", "perimeter"):
            continue
        for v in b.verts:
            x, y, z = v
            if y > 2.9 or y <= 0.13 or abs(x) > hw - 0.01 or abs(z) > hd - 0.01:
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


def emit(name, b, mat, to_blender):
    me = K.emit_bucket(name, b, mat, to_blender)
    if mat in NO_AO:
        for c in me.color_attributes["Color"].data:
            c.color = (1.0, 1.0, 1.0, 1.0)
    return me


def build(L, section, to_blender):
    import bpy
    K.BUCKETS.clear()
    K.AO.clear()
    DECALS.clear()
    ARENA.update(L["arena"])
    SOLIDS[:] = L["solids"] + L["walls"]
    K.ALL_SOLIDS[:] = L["solids"]
    for s in L["solids"]:
        dress(L, section_of(s["x"], s["z"]), s)
    ground(L["arena"], L["solids"], L["walls"])
    ground_details()
    overhead()
    perimeter(L)
    background(L)
    bad = validate(L)
    if bad:
        print(f"VALIDATE: {len(bad)} dressing vertices outside collision (first 16 groups):")
        seen = {}
        for b in bad:
            seen.setdefault((b[0], b[1]), []).append(b[2])
        for k, v in list(seen.items())[:16]:
            print("   ", k, len(v), v[:4])
    else:
        print("VALIDATE: dressing matches collision within 6 cm below 2.9 m (ground detail excepted)")
    # Small per-section buckets: fold into one map-wide "details" mesh per material.
    for key in [k for k in K.BUCKETS if k[0] not in ("ground", "background", "perimeter")]:
        b = K.BUCKETS[key]
        if sum(len(f) - 2 for f in b.faces) < 400:
            d = K.BUCKETS.setdefault(("details", key[1], key[2]), K.Bucket())
            base = len(d.verts)
            d.verts.extend(b.verts)
            d.faces.extend(tuple(i + base for i in f) for f in b.faces)
            d.uvs.extend(b.uvs)
            del K.BUCKETS[key]
    stats = {"triangles": 0, "meshes": 0}
    for (sec, mat, _shadow), b in list(K.BUCKETS.items()):
        me = emit(f"{sec}-{mat}", b, mat, to_blender)
        o = bpy.data.objects.new(me.name, me)
        if sec == "background" or mat in ("decals", "wire", "ceiling_light", "lamp", "glass", "interior_dark"):
            o["noShadow"] = True
        section(sec).objects.link(o)
        stats["triangles"] += sum(len(f) - 2 for f in b.faces)
        stats["meshes"] += 1
    palm = K.palm_mesh()
    meshes = {mat: emit(f"palm-{mat}", b, mat, to_blender) for (_, mat, _), b in palm.items()}
    palm_tris = sum(sum(len(f) - 2 for f in b.faces) for b in palm.values())
    for i, (x, z) in enumerate(PALM_SPOTS):
        yaw, scale = R.uniform(0, math.tau), R.uniform(0.85, 1.2)
        for mat, me in meshes.items():
            o = bpy.data.objects.new(f"palm-{i}-{mat}", me)
            o.location = to_blender(x, 0, z)
            o.rotation_euler = (0, 0, yaw)
            o.scale = (scale, scale, scale)
            o["instance"] = True
            o["noShadow"] = True
            section("background").objects.link(o)
    stats["triangles"] += palm_tris * len(PALM_SPOTS)
    stats["violations"] = len(bad)
    print("KIT STATS", stats)
    return stats
