"""
Modular environment kit for the PVPSPINARENA aim arena (Phase 4). Imported by build_arena.py.

Every gameplay solid from layout.json is dressed by its `kind` and `theme` (west: Mediterranean
sandstone, east: industrial containers/corrugated metal, centre: transition). Rules:

* The visible silhouette of a gameplay solid stays within ±6 cm of its collision box below 2.9 m
  (no invisible walls, no visual-only cover); `validate()` checks every vertex.
* Decoration that is not a gameplay solid lives outside the playable rectangle, above 2.9 m,
  or flush on a solid's face.
* Geometry is accumulated per (section, material, shadow) and emitted as one mesh each, so a
  section costs one draw call per material and stays frustum-cullable. Repeated background
  props (palms, roof units) are linked duplicates, exported as GPU instances.
* Hidden faces (box bottoms on the ground, faces against neighbours) are not emitted, and no
  two same-facing faces share a plane (see check_glb.py).

Geometry is authored in game coordinates (x, y up, z; metres) and converted on emit.
"""
import math, os, random
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "build", "tex")
R = random.Random(7)

# ------------------------------------------------------------------------------- materials
# name: (textures, tile metres, tint, roughness, metallic, extra)
MATS = {
    "sandstone": (("sandstone", "sandstone_n", "sandstone_r"), 2.0, (1, 1, 1), 0.85, 0.0, {}),
    "sandstone_dark": (("sandstone", "sandstone_n", "sandstone_r"), 1.4, (0.78, 0.72, 0.64), 0.85, 0.0, {}),
    "plaster": (("plaster", "plaster_n", None), 3.0, (1, 1, 1), 0.9, 0.0, {}),
    "plaster_white": (("plaster", "plaster_n", None), 3.0, (1.0, 1.0, 1.0), 0.9, 0.0, {"white": True}),
    "paving": (("paving", "paving_n", "paving_r"), 3.0, (1, 1, 1), 0.85, 0.0, {}),
    "concrete": (("concrete", "concrete_n", "concrete_r"), 3.0, (1, 1, 1), 0.88, 0.0, {}),
    "concrete_wall": (("concrete", "concrete_n", "concrete_r"), 4.0, (0.92, 0.92, 0.94), 0.9, 0.0, {}),
    "container_red": (("corrugated", "corrugated_n", "corrugated_r"), 2.4, (0.62, 0.17, 0.11), 0.6, 0.35, {}),
    "container_blue": (("corrugated", "corrugated_n", "corrugated_r"), 2.4, (0.14, 0.30, 0.50), 0.6, 0.35, {}),
    "container_green": (("corrugated", "corrugated_n", "corrugated_r"), 2.4, (0.24, 0.40, 0.27), 0.6, 0.35, {}),
    "cladding": (("corrugated", "corrugated_n", "corrugated_r"), 2.4, (0.66, 0.68, 0.66), 0.55, 0.4, {}),
    "roof_metal": (("corrugated", "corrugated_n", "corrugated_r"), 2.4, (0.50, 0.50, 0.49), 0.5, 0.5, {}),
    "steel": ((None, None, None), 1, (0.21, 0.215, 0.22), 0.5, 0.7, {}),
    "steel_yellow": ((None, None, None), 1, (0.80, 0.58, 0.10), 0.5, 0.3, {}),
    "wood": (("wood", "wood_n", None), 1.2, (1, 1, 1), 0.8, 0.0, {}),
    "wood_blue": (("wood", "wood_n", None), 1.2, (0.42, 0.66, 0.80), 0.7, 0.0, {}),
    "canvas_olive": (("canvas", "canvas_n", None), 1.5, (0.33, 0.37, 0.24), 0.95, 0.0, {}),
    "canvas_terracotta": (("canvas", "canvas_n", None), 1.5, (0.80, 0.40, 0.26), 0.95, 0.0, {"double": True}),
    "canvas_sand": (("canvas", "canvas_n", None), 1.5, (1.0, 0.94, 0.82), 0.95, 0.0, {"double": True}),
    "rooftiles": (("rooftiles", "rooftiles_n", None), 2.0, (1, 1, 1), 0.8, 0.0, {}),
    "glass": ((None, None, None), 1, (0.05, 0.065, 0.075), 0.12, 0.6, {}),
    "hazard": (("hazard", None, None), 1.0, (1, 1, 1), 0.6, 0.1, {}),
    "banner": (("banner", None, None), 1, (1, 1, 1), 0.9, 0.0, {"mask": True, "double": True}),
    "banner_wide": (("banner_wide", None, None), 1, (1, 1, 1), 0.9, 0.0, {}),
    "palm_leaf": (("palm_leaf", None, None), 1, (1, 1, 1), 0.8, 0.0, {"mask": True, "double": True}),
    "palm_bark": (("palm_bark", "palm_bark_n", None), 1, (1, 1, 1), 0.9, 0.0, {}),
    "lamp": ((None, None, None), 1, (1.0, 0.86, 0.62), 0.4, 0.0, {"emit": 2.5}),
}
_images = {}


def image(name, data=False):
    key = (name, data)
    if key not in _images:
        img = bpy.data.images.load(os.path.join(TEX, name + ".png"), check_existing=True)
        if data:
            img.colorspace_settings.name = "Non-Color"
        _images[key] = img
    return _images[key]


def make_material(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    (albedo, normal, rough), _tile, tint, roughness, metal, extra = MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = roughness
    b.inputs["Metallic"].default_value = metal
    if albedo:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image(albedo)
        if tint != (1, 1, 1):
            # glTF baseColorFactor: texture multiplied by a constant colour.
            mix = nt.nodes.new("ShaderNodeMix")
            mix.data_type = "RGBA"
            mix.blend_type = "MULTIPLY"
            mix.inputs["Factor"].default_value = 1.0
            nt.links.new(tex.outputs["Color"], mix.inputs[6])
            mix.inputs[7].default_value = (*tint, 1)
            nt.links.new(mix.outputs[2], b.inputs["Base Color"])
        else:
            nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
        if extra.get("mask"):
            clip = nt.nodes.new("ShaderNodeMath")
            clip.operation = "ROUND"
            nt.links.new(tex.outputs["Alpha"], clip.inputs[0])
            nt.links.new(clip.outputs[0], b.inputs["Alpha"])
    else:
        b.inputs["Base Color"].default_value = (*tint, 1)
    if normal:
        nt_ = nt.nodes.new("ShaderNodeTexImage")
        nt_.image = image(normal, True)
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(nt_.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    if rough:
        rt = nt.nodes.new("ShaderNodeTexImage")
        rt.image = image(rough, True)
        nt.links.new(rt.outputs["Color"], b.inputs["Roughness"])
    if extra.get("emit"):
        b.inputs["Emission Color"].default_value = (*tint, 1)
        b.inputs["Emission Strength"].default_value = extra["emit"]
    m.use_backface_culling = not extra.get("double")
    return m


def tile_of(mat):
    return MATS[mat][1]


# ------------------------------------------------------------------------------- geometry buckets
class Bucket:
    __slots__ = ("verts", "faces", "uvs")

    def __init__(self):
        self.verts, self.faces, self.uvs = [], [], []


BUCKETS = {}
VALIDATE = []  # (bucket key, first face index, label) for solids-only checks


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def normal_of(pts):
    # Newell normal (robust for any planar polygon).
    n = [0.0, 0.0, 0.0]
    for i, p in enumerate(pts):
        q = pts[(i + 1) % len(pts)]
        n[0] += (p[1] - q[1]) * (p[2] + q[2])
        n[1] += (p[2] - q[2]) * (p[0] + q[0])
        n[2] += (p[0] - q[0]) * (p[1] + q[1])
    length = math.sqrt(dot(n, n)) or 1
    return (n[0] / length, n[1] / length, n[2] / length)


def box_uv(p, n, tile, offset=(0, 0)):
    ax = max(range(3), key=lambda i: abs(n[i]))
    if ax == 1:
        u, v = p[0], -p[2] * (1 if n[1] > 0 else -1)
    elif ax == 0:
        u, v = -p[2] * (1 if n[0] > 0 else -1), p[1]
    else:
        u, v = p[0] * (1 if n[2] > 0 else -1), p[1]
    return (u / tile + offset[0], v / tile + offset[1])


def face(section, mat, pts, out=None, uvs=None, shadow=True, offset=(0, 0), tile=None):
    """Add one planar polygon (game coords). `out` orients it (outward direction)."""
    if out is not None and dot(normal_of(pts), out) < 0:
        pts = pts[::-1]
        if uvs:
            uvs = uvs[::-1]
    # Flush details (glass, lamps, banners) cast into the static shadow map like their walls;
    # keeping one bucket per material saves a draw call per section.
    key = (section, mat, True)
    b = BUCKETS.setdefault(key, Bucket())
    n = normal_of(pts)
    t = tile or tile_of(mat)
    start = len(b.verts)
    b.verts.extend(pts)
    b.faces.append(tuple(range(start, start + len(pts))))
    b.uvs.append(uvs if uvs else [box_uv(p, n, t, offset) for p in pts])


def box(section, mat, x0, x1, y0, y1, z0, z1, skip=(), shadow=True, offset=None, chamfer=0.0):
    """Axis-aligned box. `skip` drops faces: any of '-x','+x','-y','+y','-z','+z'."""
    if offset is None:
        offset = (R.random(), R.random())
    c = min(chamfer, (x1 - x0) / 3, (y1 - y0) / 3, (z1 - z0) / 3)
    centre = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    lo, hi = (x0, y0, z0), (x1, y1, z1)
    if c <= 1e-6:
        for ax in range(3):
            for s, tag in ((0, "-"), (1, "+")):
                if tag + "xyz"[ax] in skip:
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
                face(section, mat, pts, out=tuple(o), shadow=shadow, offset=offset)
        return
    # Chamfered box: main faces inset by c, edge quads, corner triangles.
    def vert(corner, ax):
        p = []
        for i in range(3):
            side = corner[i]
            edge = hi[i] if side > 0 else lo[i]
            p.append(edge if i == ax else edge - side * c)
        return tuple(p)

    corners = [(sx, sy, sz) for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    for ax in range(3):
        for s in (-1, 1):
            if ("-" if s < 0 else "+") + "xyz"[ax] in skip:
                continue
            u, v = [i for i in range(3) if i != ax]
            pts = []
            for a, bb in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                corner = [0, 0, 0]
                corner[ax], corner[u], corner[v] = s, a, bb
                pts.append(vert(tuple(corner), ax))
            o = [0, 0, 0]
            o[ax] = s
            face(section, mat, pts, out=tuple(o), shadow=shadow, offset=offset)
    bottom_skipped = "-y" in skip
    for a in range(3):
        for b_ in range(a + 1, 3):
            k = 3 - a - b_
            for sa in (-1, 1):
                for sb in (-1, 1):
                    if bottom_skipped and ((a == 1 and sa < 0) or (b_ == 1 and sb < 0)):
                        continue
                    pts = []
                    for sk in (-1, 1):
                        corner = [0, 0, 0]
                        corner[a], corner[b_], corner[k] = sa, sb, sk
                        pts.append(vert(tuple(corner), a))
                    for sk in (1, -1):
                        corner = [0, 0, 0]
                        corner[a], corner[b_], corner[k] = sa, sb, sk
                        pts.append(vert(tuple(corner), b_))
                    mid = [sum(p[i] for p in pts) / 4 for i in range(3)]
                    face(section, mat, pts, out=sub(mid, centre), shadow=shadow, offset=offset)
    for corner in corners:
        if bottom_skipped and corner[1] < 0:
            continue
        pts = [vert(corner, ax) for ax in range(3)]
        mid = [sum(p[i] for p in pts) / 3 for i in range(3)]
        face(section, mat, pts, out=sub(mid, centre), shadow=shadow, offset=offset)


def cylinder(section, mat, x, z, y0, y1, r0, r1=None, n=10, caps=(False, True), shadow=True, tile=1.0):
    r1 = r0 if r1 is None else r1
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        p = [
            (x + r0 * math.cos(a0), y0, z + r0 * math.sin(a0)),
            (x + r0 * math.cos(a1), y0, z + r0 * math.sin(a1)),
            (x + r1 * math.cos(a1), y1, z + r1 * math.sin(a1)),
            (x + r1 * math.cos(a0), y1, z + r1 * math.sin(a0)),
        ]
        uv = [(i / n * 2, y0 / tile), ((i + 1) / n * 2, y0 / tile), ((i + 1) / n * 2, y1 / tile), (i / n * 2, y1 / tile)]
        am = (a0 + a1) / 2
        face(section, mat, p, out=(math.cos(am), 0, math.sin(am)), uvs=uv, shadow=shadow)
    for cap, y, r in ((caps[0], y0, r0), (caps[1], y1, r1)):
        if cap and r > 0:
            pts = [(x + r * math.cos(2 * math.pi * i / n), y, z + r * math.sin(2 * math.pi * i / n)) for i in range(n)]
            face(section, mat, pts, out=(0, 1 if y == y1 else -1, 0), shadow=shadow)


def quad_on(section, mat, axis, plane, sign, a0, a1, y0, y1, uvs=None, shadow=False):
    """A quad on a vertical plane (axis 'x' or 'z' = plane), facing `sign` along that axis."""
    if axis == "z":
        pts = [(a0, y0, plane), (a1, y0, plane), (a1, y1, plane), (a0, y1, plane)]
        out = (0, 0, sign)
        if uvs is None and sign < 0:
            uvs = [(1, 0), (0, 0), (0, 1), (1, 1)]
    else:
        pts = [(plane, y0, a0), (plane, y0, a1), (plane, y1, a1), (plane, y1, a0)]
        out = (sign, 0, 0)
        if uvs is None and sign > 0:
            uvs = [(1, 0), (0, 0), (0, 1), (1, 1)]
    face(section, mat, pts, out=out, uvs=uvs or [(0, 0), (1, 0), (1, 1), (0, 1)], shadow=shadow)


# ------------------------------------------------------------------------------- helpers
def faces_of(s):
    return s["x"] - s["w"] / 2, s["x"] + s["w"] / 2, s["y"] - s["h"] / 2, s["y"] + s["h"] / 2, s["z"] - s["d"] / 2, s["z"] + s["d"] / 2


TOUCH = set()  # sides of the solid being dressed that abut another solid (set per solid)


def grow(x0, x1, z0, z1, d, touch=None):
    """Extents grown by d on every side that does not abut a neighbour, so trims of adjacent
    pieces meet end to end instead of overlapping (overlaps would be coplanar → z-fighting)."""
    t = TOUCH if touch is None else touch

    def g(side):
        # Free side: grow. Fully covered: flush (its faces are dropped). Partly covered (the
        # body face stays visible there): tuck 1 cm inside so the trim never shares its plane.
        return d if side not in t else (0 if side in HIDE else -0.01)

    return (x0 - g("-x"), x1 + g("+x"), z0 - g("-z"), z1 + g("+z"))


HIDE = set()  # sides fully covered by a neighbour (their faces are never visible)


def hidden():
    return tuple(HIDE)


def capped(section, mat, cap_mat, x0, x1, y0, y1, z0, z1, cap=0.06, cap_h=0.14, skip=("-y",)):
    """Wall/low wall: body plus a slightly wider coping stone on top (body top hidden)."""
    box(section, mat, x0, x1, y0, y1, z0, z1, skip=tuple(skip) + ("+y",) + hidden())
    gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, cap)
    box(section, cap_mat, gx0, gx1, y1, y1 + cap_h, gz0, gz1, skip=hidden(), chamfer=0.025 if not TOUCH else 0)


def plinth(section, mat, x0, x1, z0, z1, h=0.32, out=0.04, sides="xz"):
    gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, out)
    box(section, mat, gx0, gx1, 0, h, gz0, gz1, skip=("-y",) + hidden(), chamfer=0.02 if not TOUCH else 0)


# ------------------------------------------------------------------------------- dressing kinds
def crate(section, x0, x1, y0, y1, z0, z1, inset=0.012):
    """One wooden crate: chamfered body plus edge battens, within the envelope."""
    x0, x1, z0, z1, y1 = x0 + inset, x1 - inset, z0 + inset, z1 - inset, y1 - inset
    box(section, "wood", x0 + 0.03, x1 - 0.03, y0, y1 - 0.03, z0 + 0.03, z1 - 0.03, skip=("-y",))
    t = 0.06
    off = (R.random(), R.random())
    # Vertical corner battens and top/bottom frames (dark wood), each a flat strip.
    for cx in (x0, x1 - t):
        for cz in (z0, z1 - t):
            box(section, "wood", cx, cx + t, y0, y1, cz, cz + t, skip=("-y",), offset=off)
    for y in (y0, y1 - t):
        box(section, "wood", x0 + t, x1 - t, y, y + t, z0, z0 + t, skip=("-y",) if y == y0 else (), offset=off)
        box(section, "wood", x0 + t, x1 - t, y, y + t, z1 - t, z1, skip=("-y",) if y == y0 else (), offset=off)
        box(section, "wood", x0, x0 + t, y, y + t, z0 + t, z1 - t, skip=("-y",) if y == y0 else (), offset=off)
        box(section, "wood", x1 - t, x1, y, y + t, z0 + t, z1 - t, skip=("-y",) if y == y0 else (), offset=off)


def crate_stack(section, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    # Opaque core so seams never show light through the stack.
    box(section, "wood", x0 + 0.06, x1 - 0.06, y0, y1 - 0.06, z0 + 0.06, z1 - 0.06, skip=("-y",))
    nx = max(1, round((x1 - x0) / 1.2))
    nz = max(1, round((z1 - z0) / 1.2))
    ny = max(1, round((y1 - y0) / 1.1))
    for i in range(nx):
        for k in range(nz):
            for j in range(ny):
                crate(section, x0 + (x1 - x0) * i / nx, x0 + (x1 - x0) * (i + 1) / nx,
                      y0 + (y1 - y0) * j / ny, y0 + (y1 - y0) * (j + 1) / ny,
                      z0 + (z1 - z0) * k / nz, z0 + (z1 - z0) * (k + 1) / nz)


def container(section, s, mat=None, doors_toward=None):
    """Shipping container filling the envelope: corrugated walls, steel frame, doors."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    mat = mat or R.choice(["container_red", "container_blue", "container_green"])
    long_x = (x1 - x0) >= (z1 - z0)
    f = 0.11  # frame thickness
    box(section, mat, x0 + 0.03, x1 - 0.03, y0 + f, y1 - f, z0 + 0.03, z1 - 0.03, skip=("-y", "+y"))
    box(section, "roof_metal", x0 + f, x1 - f, y1 - f, y1 - 0.02, z0 + f, z1 - f, skip=("-y",))
    for cx in (x0, x1 - f):
        for cz in (z0, z1 - f):
            box(section, "steel", cx, cx + f, y0, y1, cz, cz + f, skip=("-y",))
    for y in (y0, y1 - f):
        box(section, "steel", x0 + f, x1 - f, y, y + f, z0, z0 + f, skip=("-y",) if y == y0 else ())
        box(section, "steel", x0 + f, x1 - f, y, y + f, z1 - f, z1, skip=("-y",) if y == y0 else ())
        box(section, "steel", x0, x0 + f, y, y + f, z0 + f, z1 - f, skip=("-y",) if y == y0 else ())
        box(section, "steel", x1 - f, x1, y, y + f, z0 + f, z1 - f, skip=("-y",) if y == y0 else ())
    # Door end: lock bars on the short face that points toward `doors_toward` (or +x/+z).
    if long_x:
        end = x1 if (doors_toward or 1) > 0 else x0
        sign = 1 if end == x1 else -1
        for zz in (z0 + (z1 - z0) * 0.3, z0 + (z1 - z0) * 0.42, z0 + (z1 - z0) * 0.58, z0 + (z1 - z0) * 0.7):
            box(section, "steel", end - 0.03 if sign > 0 else end, end if sign > 0 else end + 0.03,
                y0 + f, y1 - f, zz - 0.02, zz + 0.02)
    else:
        end = z1 if (doors_toward or 1) > 0 else z0
        sign = 1 if end == z1 else -1
        for xx in (x0 + (x1 - x0) * 0.3, x0 + (x1 - x0) * 0.42, x0 + (x1 - x0) * 0.58, x0 + (x1 - x0) * 0.7):
            box(section, "steel", xx - 0.02, xx + 0.02, y0 + f, y1 - f,
                end - 0.03 if sign > 0 else end, end if sign > 0 else end + 0.03)


def tarp_stack(section, s):
    """Crates under a draped olive tarp (sags between the crate tops, hem at 0.55 m)."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    hem = 0.55
    crate_stack(section, {**s, "h": hem + 0.05, "y": (y0 + hem + 0.05) / 2})
    box(section, "wood", x0 + 0.05, x1 - 0.05, hem, y1 - 0.1, z0 + 0.05, z1 - 0.05, skip=("-y",))
    n = 8
    def top(i, k):
        u, v = i / n, k / n
        sag = 0.09 * math.sin(u * math.pi * 2) ** 2 * math.sin(v * math.pi) ** 2
        return (x0 + (x1 - x0) * u, y1 - sag, z0 + (z1 - z0) * v)
    for i in range(n):
        for k in range(n):
            face(section, "canvas_olive", [top(i, k), top(i + 1, k), top(i + 1, k + 1), top(i, k + 1)], out=(0, 1, 0))
    # Sides: hang from the top edge to a wavy hem, 1 cm proud of the envelope at most.
    for side in range(4):
        for i in range(n):
            def p(t, y, wave=0.0):
                if side == 0:
                    return (x0 + (x1 - x0) * t, y, z0 - wave)
                if side == 1:
                    return (x1 + wave, y, z0 + (z1 - z0) * t)
                if side == 2:
                    return (x1 - (x1 - x0) * t, y, z1 + wave)
                return (x0 - wave, y, z1 - (z1 - z0) * t)
            t0, t1 = i / n, (i + 1) / n
            h0 = hem + 0.06 * math.sin(t0 * 9 + side)
            h1 = hem + 0.06 * math.sin(t1 * 9 + side)
            outs = [(0, 0, -1), (1, 0, 0), (0, 0, 1), (-1, 0, 0)][side]
            face(section, "canvas_olive", [p(t0, h0, 0.01), p(t1, h1, 0.01), p(t1, y1 - 0.004), p(t0, y1 - 0.004)], out=outs)
    # Ratchet straps across the top.
    for t in (0.3, 0.7):
        xx = x0 + (x1 - x0) * t
        box(section, "steel_yellow", xx - 0.03, xx + 0.03, y1 - 0.004, y1 + 0.008, z0 - 0.02, z1 + 0.02)


def sandstone_wall(section, s, theme, cap=True):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    if theme == "east":
        box(section, "concrete_wall", x0, x1, y0, y1, z0, z1, skip=("-y", "+y") + hidden())
        gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.03)
        box(section, "steel", gx0, gx1, y1, y1 + 0.08, gz0, gz1, skip=hidden())
        gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.02)
        box(section, "hazard", gx0, gx1, 0, 0.3, gz0, gz1, skip=("-y", "+y") + hidden())
        return
    if cap:
        capped(section, "sandstone", "sandstone_dark", x0, x1, y0, y1, z0, z1)
    else:
        box(section, "sandstone", x0, x1, y0, y1, z0, z1, skip=("-y",) + hidden())
    plinth(section, "sandstone_dark", x0, x1, z0, z1)


def arch_lintel(section, s, theme, rise=0.35, n=12):
    """Lintel over a 3 m opening. West/centre: segmental sandstone arch (intrados rises from the
    3.2 m springing line, so the visible opening is never smaller than the collision opening).
    East: steel I-beam lintel."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    if theme == "east":
        box(section, "steel", x0, x1, y0, y0 + 0.12, z0 - 0.04, z1 + 0.04, skip=hidden())
        box(section, "concrete_wall", x0, x1, y0 + 0.12, y1, z0 + 0.02, z1 - 0.02, skip=("-y", "+y") + hidden())
        gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.03)
        box(section, "steel", gx0, gx1, y1, y1 + 0.08, gz0, gz1, skip=hidden())
        return
    span = x1 - x0
    curve = []
    for i in range(n + 1):
        t = i / n
        x = x0 + span * t
        curve.append((x, y0 + rise * math.sin(math.pi * t)))
    for zf, sign in ((z0, -1), (z1, 1)):
        for i in range(n):
            (xa, ya), (xb, yb) = curve[i], curve[i + 1]
            face(section, "sandstone", [(xa, ya, zf), (xb, yb, zf), (xb, y1, zf), (xa, y1, zf)], out=(0, 0, sign))
    for i in range(n):
        (xa, ya), (xb, yb) = curve[i], curve[i + 1]
        face(section, "sandstone_dark", [(xa, ya, z0), (xb, yb, z0), (xb, yb, z1), (xa, ya, z1)], out=(0, -1, 0), tile=1.0)
    gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.06)
    box(section, "sandstone_dark", gx0, gx1, y1, y1 + 0.14, gz0, gz1, skip=hidden())
    # Voussoir archivolt ring, 4 cm proud, on both faces.
    for zf, sign in ((z0, -1), (z1, 1)):
        for i in range(n):
            (xa, ya), (xb, yb) = curve[i], curve[i + 1]
            za, zb = zf, zf + 0.04 * sign
            face(section, "sandstone_dark", [(xa, ya, zb), (xb, yb, zb), (xb, yb + 0.22, zb), (xa, ya + 0.22, zb)], out=(0, 0, sign), tile=1.0)
            face(section, "sandstone_dark", [(xa, ya, za), (xb, yb, za), (xb, yb, zb), (xa, ya, zb)], out=(0, -1, 0), tile=1.0)
            face(section, "sandstone_dark", [(xa, ya + 0.22, za), (xa, ya + 0.22, zb), (xb, yb + 0.22, zb), (xb, yb + 0.22, za)], out=(0, 1, 0), tile=1.0)


def platform(section, s, theme):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    body = "sandstone" if theme != "east" else "concrete_wall"
    top = "paving" if theme != "east" else "steel"
    box(section, body, x0, x1, y0, y1 - 0.08, z0, z1, skip=("-y", "+y") + hidden())
    if theme == "east":
        # Steel deck plate with a hazard nosing.
        box(section, "roof_metal", x0, x1, y1 - 0.08, y1, z0, z1, skip=("-y",) + hidden())
    else:
        box(section, "paving", x0, x1, y1 - 0.08, y1, z0, z1, skip=("-y",) + hidden())


def stair(section, s, theme):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    if theme == "east":
        box(section, "steel", x0, x1, y0, y1 - 0.04, z0, z1, skip=("-y", "+y"))
        box(section, "roof_metal", x0, x1, y1 - 0.04, y1, z0, z1, skip=("-y",))
        box(section, "steel_yellow", x0 + 0.006, x1 - 0.006, y1 - 0.04, y1 + 0.008, z1 - 0.06, z1 + 0.008, skip=("-y",))
    else:
        box(section, "sandstone", x0, x1, y0, y1 - 0.05, z0, z1, skip=("-y", "+y"))
        box(section, "sandstone_dark", x0, x1, y1 - 0.05, y1, z0, z1 + 0.02, skip=("-y",), chamfer=0.015)


def parapet(section, s, theme):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    if theme == "east":
        # Steel railing with kick plate; the collision box is solid, so are the plates.
        box(section, "steel", x0, x1, y0, y1 - 0.06, z0, z1, skip=("-y", "+y"))
        box(section, "steel_yellow", x0 - 0.02, x1 + 0.02, y1 - 0.06, y1, z0 - 0.02, z1 + 0.02)
    else:
        capped(section, "sandstone", "sandstone_dark", x0, x1, y0, y1 - 0.12, z0, z1, cap=0.03, cap_h=0.12)


def window(section, axis, plane, sign, a, y, w, h, theme):
    """Window on a facade plane: glass recess look (flush), frame and shutters (≤ 4 cm proud)."""
    p = plane + sign * 0.012
    quad_on(section, "glass", axis, p, sign, a - w / 2, a + w / 2, y, y + h, shadow=False)
    fr = 0.07
    q = plane + sign * 0.035
    for (a0, a1, y0, y1) in ((a - w / 2 - fr, a + w / 2 + fr, y - fr, y), (a - w / 2 - fr, a + w / 2 + fr, y + h, y + h + fr),
                             (a - w / 2 - fr, a - w / 2, y, y + h), (a + w / 2, a + w / 2 + fr, y, y + h)):
        if axis == "z":
            box(section, "sandstone_dark" if theme != "east" else "steel", a0, a1, y0, y1, min(plane, q), max(plane, q), skip=("-z" if sign > 0 else "+z",))
        else:
            box(section, "sandstone_dark" if theme != "east" else "steel", min(plane, q), max(plane, q), y0, y1, a0, a1, skip=("-x" if sign > 0 else "+x",))
    if theme != "east":
        # Open shutters either side, flat against the wall.
        q2 = plane + sign * 0.03
        for a0, a1 in ((a - w / 2 - fr - w / 2, a - w / 2 - fr), (a + w / 2 + fr, a + w / 2 + fr + w / 2)):
            if axis == "z":
                box(section, "wood_blue", a0, a1, y, y + h, min(plane, q2), max(plane, q2), skip=("-z" if sign > 0 else "+z",))
            else:
                box(section, "wood_blue", min(plane, q2), max(plane, q2), y, y + h, a0, a1, skip=("-x" if sign > 0 else "+x",))


BLOCKERS = []  # solids standing against a facade (set per facade)


def blocked_at(a0, a1, y):
    """True if a solid standing against the current facade across [a0, a1] reaches above y."""
    return any(b[0] < a1 and b[1] > a0 and b[2] > y for b in BLOCKERS)


def facade_band(section, s, theme, sign):
    """Edge buildings (inside the bounds) facing the corridors: z = face, `sign` = facing."""
    global BLOCKERS
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    zf = z1 if sign > 0 else z0
    BLOCKERS = []
    for o in ALL_SOLIDS:
        a0, a1, b0, b1, c0, c1 = faces_of(o)
        if o is not s and (abs(c0 - zf) < 0.05 or abs(c1 - zf) < 0.05) and a0 < x1 and a1 > x0:
            BLOCKERS.append((a0 - 1.0, a1 + 1.0, b1 + 0.6))
    if theme == "west" or (theme == "centre" and sign > 0):
        box(section, "plaster", x0, x1, y0, y1, z0, z1, skip=("-y", "+y") + hidden())
        plinth(section, "sandstone_dark", x0, x1, z0, z1, h=0.5)
        gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.25)
        box(section, "sandstone_dark", gx0, gx1, y1 - 0.3, y1, gz0, gz1, skip=hidden())
        box(section, "plaster", x0, x1, y1, y1 + 0.5, z0, z1, skip=("-y",) + hidden())
        bays = max(1, int((x1 - x0) / 3))
        for i in range(bays):
            a = x0 + (x1 - x0) * (i + 0.5) / bays
            if not blocked_at(a - 1.2, a + 1.2, 3.4):
                window(section, "z", zf, sign, a, 3.5, 1.0, 1.4, "west")
            if blocked_at(a - 1.2, a + 1.2, 0.5):
                pass
            elif i % 2 == 0:
                window(section, "z", zf, sign, a, 1.1, 1.0, 1.3, "west")
            else:
                # Doorway (flush painted door) with a step.
                quad_on(section, "wood_blue", "z", zf + sign * 0.012, sign, a - 0.6, a + 0.6, 0.0, 2.3, shadow=False)
            # Balcony on alternate bays, above reach (3.25 m).
            if i % 2 == 1:
                zb0, zb1 = (zf, zf + 0.75) if sign > 0 else (zf - 0.75, zf)
                box(section, "sandstone_dark", a - 1.1, a + 1.1, 3.1, 3.25, zb0, zb1, chamfer=0.02)
                zr = zb1 - 0.03 if sign > 0 else zb0
                box(section, "steel", a - 1.1, a + 1.1, 3.25, 4.15, zr, zr + 0.03, shadow=True)
        for a in (x0 + 0.6, x1 - 0.6):
            lamp(section, "z", zf, sign, a, 2.9)
    else:
        mat = "cladding" if theme == "east" else "concrete_wall"
        box(section, mat, x0, x1, y0, y1, z0, z1, skip=("-y", "+y") + hidden())
        gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.04)
        box(section, "steel", gx0, gx1, y1, y1 + 0.12, gz0, gz1, skip=hidden())
        gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.02)
        box(section, "hazard", gx0, gx1, 0, 0.35, gz0, gz1, skip=("-y", "+y") + hidden())
        bays = max(1, int((x1 - x0) / 4))
        for i in range(bays):
            a = x0 + (x1 - x0) * (i + 0.5) / bays
            if blocked_at(a - 1.5, a + 1.5, 0.5):
                quad_on(section, "glass", "z", zf + sign * 0.012, sign, a - 1.4, a + 1.4, 4.2, 4.9, shadow=False)
                continue
            # Roll-up door: ribbed steel quad, flush.
            quad_on(section, "roof_metal", "z", zf + sign * 0.015, sign, a - 1.3, a + 1.3, 0.35, 3.0,
                    uvs=[(0, 0), (1.08, 0), (1.08, 1.1), (0, 1.1)], shadow=False)
            box(section, "steel", a - 1.45, a + 1.45, 3.0, 3.25, *(sorted((zf, zf + sign * 0.05))))
            # High strip window.
            quad_on(section, "glass", "z", zf + sign * 0.012, sign, a - 1.4, a + 1.4, 4.2, 4.9, shadow=False)
            lamp(section, "z", zf, sign, a, 3.45)


def lamp(section, axis, plane, sign, a, y):
    """Wall lamp: steel bracket and warm emissive lens, ≤ 5 cm proud (flush rule)."""
    q = plane + sign * 0.05
    if axis == "z":
        box(section, "steel", a - 0.12, a + 0.12, y, y + 0.3, min(plane, q), max(plane, q), skip=("-z" if sign > 0 else "+z",))
        quad_on(section, "lamp", "z", q + sign * 0.01, sign, a - 0.08, a + 0.08, y + 0.04, y + 0.2, shadow=False)
    else:
        box(section, "steel", min(plane, q), max(plane, q), y, y + 0.3, a - 0.12, a + 0.12, skip=("-x" if sign > 0 else "+x",))
        quad_on(section, "lamp", "x", q + sign * 0.01, sign, a - 0.08, a + 0.08, y + 0.04, y + 0.2, shadow=False)


def banner(section, axis, plane, sign, a, y0, w, h):
    """Vertical PVPSPINARENA banner hung flat 2 cm off a wall, with a steel hanging rod."""
    p = plane + sign * 0.02
    quad_on(section, "banner", axis, p, sign, a - w / 2, a + w / 2, y0, y0 + h, shadow=False)
    q = plane + sign * 0.045
    if axis == "z":
        box(section, "steel", a - w / 2 - 0.08, a + w / 2 + 0.08, y0 + h - 0.02, y0 + h + 0.03, min(plane, q), max(plane, q))
    else:
        box(section, "steel", min(plane, q), max(plane, q), y0 + h - 0.02, y0 + h + 0.03, a - w / 2 - 0.08, a + w / 2 + 0.08)


def house(section, s, theme):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    if theme == "east":
        box(section, "cladding", x0, x1, y0, y1, z0, z1, skip=("-y", "+y") + hidden())
        gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.05)
        box(section, "steel", gx0, gx1, y1, y1 + 0.15, gz0, gz1, skip=hidden())
        gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.02)
        box(section, "hazard", gx0, gx1, 0, 0.3, gz0, gz1, skip=("-y", "+y") + hidden())
        # Courtyard-facing roll-up door (west face) and a strip window over the spawn exit.
        quad_on(section, "roof_metal", "x", x0 - 0.015, -1, z0 + 2.0, z0 + 4.6, 0.3, 3.1,
                uvs=[(0, 0), (1.08, 0), (1.08, 1.3), (0, 1.3)], shadow=False)
        quad_on(section, "glass", "z", z0 - 0.012, -1, x0 + 0.6, x1 - 0.6, 3.6, 4.3, shadow=False)
        lamp(section, "x", x0, -1, z0 + 1.4, 3.3)
        banner(section, "x", x1, 1, (z0 + z1) / 2, 1.4, 1.1, 2.2)
        return
    box(section, "plaster_white", x0, x1, y0, y1, z0, z1, skip=("-y", "+y") + hidden())
    plinth(section, "sandstone_dark", x0, x1, z0, z1, h=0.45)
    gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.2)
    box(section, "sandstone_dark", gx0, gx1, y1 - 0.18, y1, gz0, gz1, skip=hidden())
    box(section, "plaster_white", x0, x1, y1, y1 + 0.45, z0, z1, skip=("-y",) + hidden())
    window(section, "x", x1, 1, z0 + 1.6, 1.2, 1.0, 1.3, "west")
    window(section, "x", x1, 1, z0 + 1.6, 3.2, 1.0, 1.2, "west")
    window(section, "x", x1, 1, z1 - 1.6, 3.2, 1.0, 1.2, "west")
    quad_on(section, "wood_blue", "x", x1 + 0.012, 1, z1 - 2.2, z1 - 1.0, 0, 2.3, shadow=False)
    window(section, "z", z0, -1, (x0 + x1) / 2, 3.0, 1.0, 1.2, "west")
    window(section, "x", x0, -1, (z0 + z1) / 2, 3.0, 1.0, 1.2, "west")
    lamp(section, "x", x1, 1, z0 + 3.2, 2.7)
    banner(section, "x", x0, -1, z0 + 1.5, 1.4, 1.1, 2.2)
    # Terracotta awning over the courtyard door, above reach (3.0–3.35 m).
    awning(section, "x", x1, 1, z1 - 2.6, z1 - 0.6, 2.95, 0.9, "canvas_terracotta")


def awning(section, axis, plane, sign, a0, a1, y, depth, mat):
    """Sloped fabric awning projecting `depth` from a wall, top edge at y + 0.4."""
    if axis == "x":
        pts = [(plane, y + 0.4, a0), (plane, y + 0.4, a1), (plane + sign * depth, y, a1), (plane + sign * depth, y, a0)]
    else:
        pts = [(a0, y + 0.4, plane), (a1, y + 0.4, plane), (a1, y, plane + sign * depth), (a0, y, plane + sign * depth)]
    face(section, mat, pts, out=(0, 1, 0), shadow=True)


def spawn_shield(section, s, theme):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    if theme == "east":
        # Precast concrete blast block with a steel cap and hazard band.
        box(section, "concrete_wall", x0, x1, y0, y1 - 0.08, z0, z1, skip=("-y", "+y"))
        box(section, "steel", x0 - 0.03, x1 + 0.03, y1 - 0.08, y1, z0 - 0.03, z1 + 0.03, chamfer=0.015)
        box(section, "hazard", x0 - 0.015, x1 + 0.015, 0.0, 0.35, z0 - 0.015, z1 + 0.015, skip=("-y", "+y"))
        banner(section, "x", x1, 1, (z0 + z1) / 2, 0.55, 1.0, 1.75)
        return
    capped(section, "sandstone", "sandstone_dark", x0, x1, y0, y1 - 0.14, z0, z1)
    plinth(section, "sandstone_dark", x0, x1, z0, z1)
    banner(section, "x", x0, -1, (z0 + z1) / 2, 0.55, 1.0, 1.75)


def well_house(section, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    capped(section, "sandstone", "sandstone_dark", x0, x1, y0, y1 - 0.14, z0, z1)
    plinth(section, "sandstone_dark", x0, x1, z0, z1)
    # Small dome on top (above the collision; it hides nothing a player could shoot at).
    cx, cz, r = (x0 + x1) / 2, (z0 + z1) / 2, min(x1 - x0, z1 - z0) * 0.42
    rings = 5
    for j in range(rings):
        a0, a1 = math.pi / 2 * j / rings, math.pi / 2 * (j + 1) / rings
        cylinder(section, "plaster_white", cx, cz, y1 + r * math.sin(a0), y1 + r * math.sin(a1),
                 r * math.cos(a0), r * math.cos(a1), n=14, caps=(False, False), tile=1.5)
    # Fountain spout niche on the corridor faces (flush recess look).
    for zf, sign in ((z1, 1),):
        quad_on(section, "sandstone_dark", "z", zf + sign * 0.012, sign, cx - 0.4, cx + 0.4, 0.5, 1.6, shadow=False)


def market_stall(section, s, theme):
    if theme == "east":
        container(section, s, "container_green")
        return
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    # Crates and a counter fill the envelope; a sand canopy closes the top.
    crate_stack(section, {**s, "h": 1.7, "y": 0.85})
    box(section, "wood", x0 + 0.08, x1 - 0.08, 1.7, y1 - 0.12, z0 + 0.08, z1 - 0.08, skip=("-y",))
    for cx in (x0, x1 - 0.08):
        for cz in (z0, z1 - 0.08):
            box(section, "wood", cx, cx + 0.08, 1.7, y1 - 0.12, cz, cz + 0.08, skip=("-y",))
    box(section, "canvas_sand", x0 - 0.03, x1 + 0.03, y1 - 0.12, y1, z0 - 0.03, z1 + 0.03)


def jersey(section, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    along_x = (x1 - x0) > (z1 - z0)
    d = (z1 - z0) if along_x else (x1 - x0)
    h = y1 - y0
    # Profile (half-widths from the centreline by height).
    # A near-vertical precast barrier (chamfered top) so its face stays on the collision box.
    prof = [(0.0, d / 2), (0.15, d / 2), (0.45, d * 0.42), (h, d * 0.40)]
    c = (z0 + z1) / 2 if along_x else (x0 + x1) / 2
    a0, a1 = (x0, x1) if along_x else (z0, z1)
    left = [(-hw, y) for y, hw in prof]
    right = [(hw, y) for y, hw in reversed(prof)]
    loop = left + right
    def P(a, off, y):
        return (a, y, c + off) if along_x else (c + off, y, a)
    for i in range(len(loop) - 1):
        (o0, y0_), (o1, y1_) = loop[i], loop[i + 1]
        mid_off = (o0 + o1) / 2
        out = (0, 1 if abs(mid_off) < 0.01 else 0.3, 1 if mid_off > 0 else -1) if along_x else (1 if mid_off > 0 else -1, 0.3, 0)
        face(section, "concrete_wall", [P(a0, o0, y0_), P(a1, o0, y0_), P(a1, o1, y1_), P(a0, o1, y1_)], out=out)
    for a, sgn in ((a0, -1), (a1, 1)):
        pts = [P(a, o, y) for o, y in loop]
        face(section, "concrete_wall", pts, out=(sgn, 0, 0) if along_x else (0, 0, sgn))
    # Hazard band near the top.
    hb = [(y, hw) for y, hw in prof if y >= 0.3]


def low_wall(section, s, theme):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    capped(section, "sandstone", "sandstone_dark", x0, x1, y0, y1 - 0.12, z0, z1, cap=0.04, cap_h=0.12)


def touching(s, others, full=False):
    """Sides of `s` that abut another solid face to face (overlapping in the other axes). With
    `full`, only sides the neighbour covers completely (so the face can be dropped)."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    out = set()
    for o in others:
        if o is s:
            continue
        a0, a1, b0, b1, c0, c1 = faces_of(o)
        if b1 <= y0 + 1e-6 or b0 >= y1 - 1e-6:
            continue
        if full and (b0 > y0 + 1e-6 or b1 < y1 - 1e-6):
            continue
        if full:
            zo = c0 <= z0 + 1e-6 and c1 >= z1 - 1e-6
            xo = a0 <= x0 + 1e-6 and a1 >= x1 - 1e-6
        else:
            zo = c0 < z1 - 1e-6 and c1 > z0 + 1e-6
            xo = a0 < x1 - 1e-6 and a1 > x0 + 1e-6
        if zo and abs(a1 - x0) < 1e-6:
            out.add("-x")
        if zo and abs(a0 - x1) < 1e-6:
            out.add("+x")
        if xo and abs(c1 - z0) < 1e-6:
            out.add("-z")
        if xo and abs(c0 - z1) < 1e-6:
            out.add("+z")
    return out


def dress(L, section_name, s):
    global TOUCH, HIDE
    kind, theme = s["kind"], s.get("theme") or "centre"
    sec = section_name
    TOUCH = touching(s, L["solids"] + L["walls"])
    HIDE = touching(s, L["solids"] + L["walls"], full=True)
    if kind == "edge-building":
        facade_band(sec, s, theme, 1 if s["z"] < 0 else -1)
    elif kind == "arcade-wall":
        sandstone_wall(sec, s, "east" if s["x"] > 1.3 and theme != "centre" else theme)
        if s["id"] == "south-wall-centre":
            # Courtyard hero banner (faces -z, toward the courtyard), flush.
            x0, x1, y0, y1, z0, z1 = faces_of(s)
            quad_on(sec, "banner_wide", "z", z0 - 0.02, -1, -3.2, 3.2, 1.9, 3.5, shadow=False)
            box(sec, "steel", -3.3, 3.3, 3.48, 3.53, z0 - 0.045, z0)
            lamp(sec, "z", z0, -1, -4.2, 3.5)
            lamp(sec, "z", z0, -1, 4.2, 3.5)
        elif s["id"] == "north-wall-inner-w":
            x0, x1, y0, y1, z0, z1 = faces_of(s)
            banner(sec, "z", z1, 1, (x0 + x1) / 2, 1.3, 1.2, 2.4)
        elif s["id"] == "north-wall-inner-e":
            x0, x1, y0, y1, z0, z1 = faces_of(s)
            banner(sec, "z", z1, 1, (x0 + x1) / 2, 1.3, 1.2, 2.4)
    elif kind == "arch-lintel":
        arch_lintel(sec, s, theme)
    elif kind == "platform":
        platform(sec, s, theme)
    elif kind == "stair":
        stair(sec, s, theme)
    elif kind == "parapet":
        parapet(sec, s, theme)
    elif kind == "house":
        house(sec, s, theme)
    elif kind == "spawn-shield":
        spawn_shield(sec, s, theme)
    elif kind in ("crate-stack",):
        crate_stack(sec, s)
    elif kind == "crate":
        x0, x1, y0, y1, z0, z1 = faces_of(s)
        nx = max(1, round((x1 - x0) / 1.3))
        if nx > 1:
            # Opaque core behind the seam between crates.
            box(sec, "wood", x0 + 0.06, x1 - 0.06, y0, y1 - 0.06, z0 + 0.06, z1 - 0.06, skip=("-y",))
        for i in range(nx):
            crate(sec, x0 + (x1 - x0) * i / nx, x0 + (x1 - x0) * (i + 1) / nx, y0, y1, z0, z1)
    elif kind in ("container", "container-short"):
        container(sec, s, doors_toward=-1 if s["x"] > 0 else 1)
    elif kind == "tarp-stack":
        tarp_stack(sec, s)
    elif kind == "low-wall":
        low_wall(sec, s, theme)
    elif kind == "jersey-barrier":
        jersey(sec, s)
    elif kind == "well-house":
        well_house(sec, s)
    elif kind == "market-stall":
        market_stall(sec, s, theme)
    else:
        box(sec, "sandstone", *faces_of(s), skip=("-y",))
    TOUCH = set()
    HIDE = set()


# ------------------------------------------------------------------------------- floor, perimeter
AO = {}  # vertex position (rounded) -> ambient occlusion factor for the ground


def floor(A, solids, walls):
    """Ground inside the walls on a 0.5 m grid: paving on the Mediterranean half and courtyard,
    concrete on the industrial side; vertex AO darkens contact areas around every solid."""
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
    for i in range(len(xs)):
        for k in range(len(zs)):
            AO[(round(float(xs[i]), 3), round(float(zs[k]), 3))] = float(ao[i, k])
    for i in range(len(xs) - 1):
        for k in range(len(zs) - 1):
            x0, x1, z0, z1 = float(xs[i]), float(xs[i + 1]), float(zs[k]), float(zs[k + 1])
            # Skip cells fully inside a solid (never visible).
            cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
            if any(abs(cx - o["x"]) + step / 2 <= o["w"] / 2 and abs(cz - o["z"]) + step / 2 <= o["d"] / 2
                   and o["y"] - o["h"] / 2 < 0.05 for o in solids):
                continue
            mat = "concrete" if cx > 4 else "paving"
            face("ground", mat, [(x0, 0, z0), (x0, 0, z1), (x1, 0, z1), (x1, 0, z0)], out=(0, 1, 0), offset=(0, 0))


def perimeter(L):
    for w in L["walls"]:
        x0, x1, y0, y1, z0, z1 = faces_of(w)
        if w["id"] in ("wall-west", "wall-east"):
            east = w["id"] == "wall-east"
            inner = x0 if east else x1
            sign = -1 if east else 1
            if east:
                box("perimeter", "concrete_wall", x0, x1, 0, y1, z0, z1, skip=("-y", "+y"))
                box("perimeter", "steel", x0 - 0.05, x1 + 0.05, y1, y1 + 0.12, z0, z1)
                box("perimeter", "hazard", inner - 0.02, inner, 0, 0.35, z0, z1, skip=("-y", "+y", "-z", "+z", "+x"))
            else:
                capped("perimeter", "sandstone", "sandstone_dark", x0, x1, 0, y1, z0, z1)
                plinth("perimeter", "sandstone_dark", x0, x1, z0, z1, h=0.4)
            # Spawn wall: big banner behind each spawn.
            banner("perimeter", "x", inner, sign, 0.0, 1.6, 1.6, 3.2)
            for zz in (-8, 8):
                lamp("perimeter", "x", inner, sign, zz, 3.4)
        else:
            # North/south perimeter sits behind the 6 m edge buildings: only its top shows.
            box("perimeter", "concrete_wall" if False else "sandstone", x0, x1, 0, y1, z0, z1, skip=("-y",))


# ------------------------------------------------------------------------------- background
def background_house(x0, x1, z0, z1, h, roof="tiles"):
    sec = "background"
    box(sec, R.choice(["plaster", "plaster_white"]), x0, x1, 0, h, z0, z1, skip=("-y", "+y"))
    box(sec, "sandstone_dark", x0 - 0.15, x1 + 0.15, h - 0.2, h, z0 - 0.15, z1 + 0.15, skip=("-y",))
    if roof == "tiles":
        # Hipped terracotta roof.
        cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
        rh = min(x1 - x0, z1 - z0) * 0.3
        e = 0.3
        a, b, c, d = (x0 - e, h, z0 - e), (x1 + e, h, z0 - e), (x1 + e, h, z1 + e), (x0 - e, h, z1 + e)
        if (x1 - x0) >= (z1 - z0):
            r0, r1 = (x0 + (z1 - z0) / 2, h + rh, cz), (x1 - (z1 - z0) / 2, h + rh, cz)
            face(sec, "rooftiles", [a, b, r1, r0], out=(0, 1, -1))
            face(sec, "rooftiles", [c, d, r0, r1], out=(0, 1, 1))
            face(sec, "rooftiles", [d, a, r0], out=(-1, 1, 0))
            face(sec, "rooftiles", [b, c, r1], out=(1, 1, 0))
        else:
            r0, r1 = (cx, h + rh, z0 + (x1 - x0) / 2), (cx, h + rh, z1 - (x1 - x0) / 2)
            face(sec, "rooftiles", [d, a, r0, r1], out=(-1, 1, 0))
            face(sec, "rooftiles", [b, c, r1, r0], out=(1, 1, 0))
            face(sec, "rooftiles", [a, b, r0], out=(0, 1, -1))
            face(sec, "rooftiles", [c, d, r1], out=(0, 1, 1))
    else:
        box(sec, "plaster_white", x0, x1, h, h + 0.6, z0, z1, skip=("-y",))
    # Rows of dark windows on the faces that look at the arena.
    for zf, sign in ((z0, -1), (z1, 1)):
        n = max(1, int((x1 - x0) / 2.5))
        for i in range(n):
            a = x0 + (x1 - x0) * (i + 0.5) / n
            for y in range(3, int(h) - 1, 3):
                quad_on(sec, "glass", "z", zf + sign * 0.01, sign, a - 0.45, a + 0.45, y, y + 1.2, shadow=False)
    for xf, sign in ((x0, -1), (x1, 1)):
        n = max(1, int((z1 - z0) / 2.5))
        for i in range(n):
            a = z0 + (z1 - z0) * (i + 0.5) / n
            for y in range(3, int(h) - 1, 3):
                quad_on(sec, "glass", "x", xf + sign * 0.01, sign, a - 0.45, a + 0.45, y, y + 1.2, shadow=False)


def background_warehouse(x0, x1, z0, z1, h):
    sec = "background"
    box(sec, "cladding", x0, x1, 0, h, z0, z1, skip=("-y", "+y"))
    # Pitched corrugated roof along x.
    cz = (z0 + z1) / 2
    rh = (z1 - z0) * 0.18
    e = 0.3
    face(sec, "roof_metal", [(x0 - e, h, z0 - e), (x1 + e, h, z0 - e), (x1 + e, h + rh, cz), (x0 - e, h + rh, cz)], out=(0, 1, -1))
    face(sec, "roof_metal", [(x0 - e, h, z1 + e), (x0 - e, h + rh, cz), (x1 + e, h + rh, cz), (x1 + e, h, z1 + e)], out=(0, 1, 1))
    for xf, sign in ((x0, -1), (x1, 1)):
        face(sec, "cladding", [(xf, h, z0), (xf, h, z1), (xf, h + rh, cz)], out=(sign, 0, 0))
        quad_on(sec, "glass", "x", xf + sign * 0.01, sign, z0 + 1, z1 - 1, h - 2.2, h - 1.2, shadow=False)


def water_tower(x, z):
    sec = "background"
    for dx, dz in ((-1.2, -1.2), (1.2, -1.2), (1.2, 1.2), (-1.2, 1.2)):
        box(sec, "steel", x + dx - 0.1, x + dx + 0.1, 0, 11, z + dz - 0.1, z + dz + 0.1, skip=("-y",))
    cylinder(sec, "cladding", x, z, 11, 14.5, 2.0, n=16, caps=(True, False))
    cylinder(sec, "roof_metal", x, z, 14.5, 15.6, 2.0, 0.2, n=16, caps=(False, False))


def crane(x, z, yaw_x=True):
    sec = "background"
    box(sec, "steel_yellow", x - 0.6, x + 0.6, 0, 22, z - 0.6, z + 0.6, skip=("-y",))
    box(sec, "steel_yellow", x - 14, x + 5, 21, 22.2, z - 0.5, z + 0.5)
    box(sec, "steel", x + 3, x + 5, 19.5, 21, z - 0.9, z + 0.9)
    box(sec, "steel", x - 10.03, x - 9.97, 12, 21, z - 0.03, z + 0.03)


def dome(x, z, r, base_h):
    sec = "background"
    box(sec, "plaster_white", x - r, x + r, 0, base_h, z - r, z + r, skip=("-y", "+y"))
    box(sec, "plaster_white", x - r, x + r, base_h, base_h + 0.01, z - r, z + r, skip=("-y",))
    rings = 6
    for j in range(rings):
        a0, a1 = math.pi / 2 * j / rings, math.pi / 2 * (j + 1) / rings
        cylinder(sec, "sandstone_dark", x, z, base_h + r * math.sin(a0) * 0.9, base_h + r * math.sin(a1) * 0.9,
                 r * 0.95 * math.cos(a0), r * 0.95 * math.cos(a1), n=18, caps=(False, False), tile=2)


def tower(x, z, w, h):
    sec = "background"
    box(sec, "sandstone", x - w / 2, x + w / 2, 0, h, z - w / 2, z + w / 2, skip=("-y",))
    box(sec, "sandstone_dark", x - w / 2 - 0.25, x + w / 2 + 0.25, h, h + 0.4, z - w / 2 - 0.25, z + w / 2 + 0.25)
    cylinder(sec, "plaster_white", x, z, h + 0.4, h + 3.0, w * 0.32, n=10)
    cylinder(sec, "sandstone_dark", x, z, h + 3.0, h + 4.6, w * 0.34, 0.05, n=10, caps=(False, False))


def background(L):
    hw, hd = L["arena"]["width"] / 2, L["arena"]["depth"] / 2
    # West (Mediterranean): houses stepping up behind the spawn wall, a dome and a tower.
    z = -hd - 6
    while z < hd + 6:
        d = R.uniform(4, 7)
        w = R.uniform(5, 8)
        background_house(-hw - 1.4 - w, -hw - 1.4, z, z + d, R.choice([7.5, 9, 10.5]))
        z += d + R.uniform(0.4, 1.5)
    dome(-hw - 14, -4, 3.2, 9)
    tower(-hw - 9, 9, 3.0, 15)
    # East (industrial): warehouses, a water tower and a gantry crane.
    background_warehouse(hw + 1.4, hw + 14, -hd - 4, -2, 9)
    background_warehouse(hw + 1.4, hw + 12, 1, hd + 4, 8)
    water_tower(hw + 17, 5)
    crane(hw + 18, -10)
    # North/south behind the edge buildings: rooftops of the town (west) and port sheds (east).
    for zs in (-1, 1):
        x = -hw - 2
        while x < hw:
            w = R.uniform(5, 8)
            zz0 = zs * (hd + 0.6)
            zz1 = zs * (hd + 0.6 + R.uniform(4, 7))
            z0, z1 = min(zz0, zz1), max(zz0, zz1)
            if x + w / 2 < 3:
                background_house(x, x + w, z0, z1, R.choice([8, 9.5, 11]))
            else:
                background_warehouse(x, x + w, z0, z1, R.choice([8, 9]))
            x += w + R.uniform(0.3, 1.0)


PALM_SPOTS = [(-21.8, -12), (-21.6, -3.5), (-22.2, 5.5), (-21.7, 13.5), (-12, -17.4), (-4, -17.6),
              (-14, 17.3), (-6, 17.5), (21.8, 12.5), (21.6, -14), (2, -17.5), (9, 17.4)]


def palm_mesh():
    """One palm (trunk + crown of frond cards) as a shared mesh for instancing."""
    global BUCKETS
    saved, BUCKETS = BUCKETS, {}
    h = 10.5
    segs = 7
    for i in range(segs):
        t0, t1 = i / segs, (i + 1) / segs
        bend0, bend1 = 0.9 * t0 * t0, 0.9 * t1 * t1
        cylinder("palm", "palm_bark", bend0, 0, h * t0, h * t1, 0.22 - 0.07 * t0, 0.22 - 0.07 * t1, n=8,
                 caps=(False, i == segs - 1), tile=2.0)
    top = (0.9, h, 0)
    fronds = 11
    for i in range(fronds):
        a = 2 * math.pi * i / fronds + 0.3
        droop = 0.55 + 0.25 * (i % 3) / 2
        L_ = 4.4
        dirx, dirz = math.cos(a), math.sin(a)
        sx, sz = -dirz * 0.7, dirx * 0.7
        p0 = top
        mid = (top[0] + dirx * L_ * 0.5, top[1] + 0.35, top[2] + dirz * L_ * 0.5)
        end = (top[0] + dirx * L_, top[1] - droop * 1.6, top[2] + dirz * L_)
        for (a_, b_, v0, v1) in ((p0, mid, 0.0, 0.5), (mid, end, 0.5, 1.0)):
            face("palm", "palm_leaf", [
                (a_[0] - sx * (0.3 if v0 == 0 else 1), a_[1], a_[2] - sz * (0.3 if v0 == 0 else 1)),
                (a_[0] + sx * (0.3 if v0 == 0 else 1), a_[1], a_[2] + sz * (0.3 if v0 == 0 else 1)),
                (b_[0] + sx * (1 if v1 < 1 else 0.2), b_[1], b_[2] + sz * (1 if v1 < 1 else 0.2)),
                (b_[0] - sx * (1 if v1 < 1 else 0.2), b_[1], b_[2] - sz * (1 if v1 < 1 else 0.2)),
            ], uvs=[(0, 1 - v0), (1, 1 - v0), (1, 1 - v1), (0, 1 - v1)], shadow=True)
    built, BUCKETS = BUCKETS, saved
    return built


# ------------------------------------------------------------------------------- emit + validate
def emit_bucket(name, b, mat, to_blender):
    me = bpy.data.meshes.new(name)
    me.from_pydata([to_blender(*v) for v in b.verts], [], b.faces)
    uv = me.uv_layers.new(name="UVMap")
    i = 0
    for poly, uvs in zip(me.polygons, b.uvs):
        for li, (u, v) in zip(poly.loop_indices, uvs):
            uv.data[li].uv = (u, v)
        i += 1
    # Baked ambient occlusion as vertex colour (glTF COLOR_0): ground contact shadows from the
    # floor grid, and a soft darkening toward the base of every wall and prop.
    col = me.color_attributes.new("Color", "BYTE_COLOR", "CORNER")
    for poly in me.polygons:
        for li in poly.loop_indices:
            x, y, z = b.verts[me.loops[li].vertex_index]
            if name.startswith("ground"):
                a = AO.get((round(x, 3), round(z, 3)), 1.0)
            elif name.startswith("palm") or mat in ("lamp", "banner", "banner_wide", "glass"):
                a = 1.0
            else:
                t = min(1.0, max(0.0, y / 1.4))
                a = 0.74 + 0.26 * t * t * (3 - 2 * t)
            col.data[li].color = (a, a, a, 1.0)
    me.materials.append(make_material(mat))
    for p in me.polygons:
        p.use_smooth = False
    me.validate(clean_customdata=False)
    return me


def validate(L):
    """Below 2.9 m inside the playable rectangle, every vertex of the dressing must lie within
    6 cm of a gameplay solid (or on the ground). Returns the list of violations."""
    tol = 0.061
    solids = [s for s in L["solids"]]
    hw, hd = L["arena"]["width"] / 2, L["arena"]["depth"] / 2
    bad = []
    for (section, mat, shadow), b in BUCKETS.items():
        if section in ("background", "perimeter"):
            continue
        for v in b.verts:
            x, y, z = v
            if y > 2.9 or y < 0.002 or abs(x) > hw - 0.01 or abs(z) > hd - 0.01:
                continue
            # Within a solid's envelope, or sitting on its top inside its footprint (rooftop
            # dressing can only hide what the solid already hides).
            ok = any(
                abs(x - s["x"]) <= s["w"] / 2 + tol and abs(z - s["z"]) <= s["d"] / 2 + tol
                and s["y"] - s["h"] / 2 - tol <= y
                and (y <= s["y"] + s["h"] / 2 + tol or s["layer"] == "box")
                for s in solids
            )
            if not ok:
                bad.append((section, mat, tuple(round(c, 3) for c in v)))
    return bad


def section_of(x, z):
    sx = "west" if x < -6.5 else "east" if x > 6.5 else "centre"
    sz = "north" if z < -6 else "south" if z > 6 else "mid"
    return f"{sx}-{sz}"


ALL_SOLIDS = []


def build(L, section, to_blender):
    BUCKETS.clear()
    ALL_SOLIDS[:] = L["solids"]
    for s in L["solids"]:
        dress(L, section_of(s["x"], s["z"]), s)
    floor(L["arena"], L["solids"], L["walls"])
    perimeter(L)
    background(L)
    bad = validate(L)
    if bad:
        print(f"VALIDATE: {len(bad)} dressing vertices outside collision (first 12):")
        seen = {}
        for b in bad:
            seen.setdefault((b[0], b[1]), []).append(b[2])
        for k, v in seen.items():
            print("   ", k, len(v), v[:3])
    else:
        print("VALIDATE: dressing matches collision within 6 cm below 2.9 m")
    # Small per-section buckets cost a draw call each for a few triangles: fold them into one
    # map-wide "details" mesh per material (never culled, but one call instead of many).
    for key in [k for k in BUCKETS if k[0] not in ("ground", "background", "perimeter")]:
        b = BUCKETS[key]
        if sum(len(f) - 2 for f in b.faces) < 400:
            d = BUCKETS.setdefault(("details", key[1], key[2]), Bucket())
            base = len(d.verts)
            d.verts.extend(b.verts)
            d.faces.extend(tuple(i + base for i in f) for f in b.faces)
            d.uvs.extend(b.uvs)
            del BUCKETS[key]
    stats = {"triangles": 0}
    for (sec, mat, shadow), b in list(BUCKETS.items()):
        me = emit_bucket(f"{sec}-{mat}{'' if shadow else '-ns'}", b, mat, to_blender)
        o = bpy.data.objects.new(me.name, me)
        if not shadow:
            o["noShadow"] = True
        section(sec).objects.link(o)
        stats["triangles"] += sum(len(f) - 2 for f in b.faces)
    # Palms: one shared mesh per material, linked duplicates (exported as GPU instances).
    palm = palm_mesh()
    meshes = {mat: emit_bucket(f"palm-{mat}", b, mat, to_blender) for (_, mat, _), b in palm.items()}
    palm_tris = sum(sum(len(f) - 2 for f in b.faces) for b in palm.values())
    for i, (x, z) in enumerate(PALM_SPOTS):
        yaw = R.uniform(0, math.tau)
        scale = R.uniform(0.85, 1.25)
        for mat, me in meshes.items():
            o = bpy.data.objects.new(f"palm-{i}-{mat}", me)
            o.location = to_blender(x, 0, z)
            o.rotation_euler = (0, 0, yaw)
            o.scale = (scale, scale, scale)
            o["instance"] = True
            section("background").objects.link(o)
    stats["triangles"] += palm_tris * len(PALM_SPOTS)
    stats["violations"] = len(bad)
    print("KIT STATS", stats)
    return stats
