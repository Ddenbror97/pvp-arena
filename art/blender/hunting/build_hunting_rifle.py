"""
Hunting Rifle viewmodel (Blender, headless): an original bolt-action sporter built from scratch.

    python build_hunting_rifle.py -- <out.glb> <out.blend> [textures-dir]

A classic walnut-stocked bolt-action hunting rifle: round blued receiver with an
ejection port and a polished bolt, sporter-contour barrel (22", no brake), Monte Carlo walnut
stock with checkered pistol grip and fore-end, black recoil pad with a white spacer, sling
studs, a flush-fit detachable 5-round box magazine, and a 3-9×36 hunting scope in two rings.

The moving parts and markers sit exactly where the AWP's do (art/blender/awp/README.md, node
contract), so the AWP's viewmodel setup, bolt cycle and both reload clips drive this rifle
unchanged: the bolt, its handle and knob, the magazine and its grip, the trigger, the pistol
grip (lofted from the same AK grip sections the shared right hand is posed on), the fore-end
station of the support hand, and the scope's eye point.

Everything is authored in the exported GLB's own frame (+X right, +Y up, −Z toward the muzzle,
2 units per metre, bore on Y = 0; "local" = rig − AWP_GRIP_ALIGN) and turned into Blender's
Z-up frame once at the end.
"""

import math
import os
import sys

import bpy  # noqa: I001  (bpy must load before bmesh/mathutils)
import bmesh
import mathutils
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1 :]
OUT_GLB, OUT_BLEND = argv[:2]
TEX_DIR = argv[2] if len(argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(OUT_GLB)), "textures")
os.makedirs(TEX_DIR, exist_ok=True)
V = mathutils.Vector
U = 2.0  # units per metre (the shared viewmodel rig)
mm = lambda x: x * U / 1000.0  # noqa: E731

# ---------------------------------------------------------------- the AWP's contract (local)
# Rig positions from art/blender/awp/README.md, local = rig − (0, 0, −0.44).
ALIGN_Z = -0.44
rig = lambda x, y, z: V((x, y, z - ALIGN_Z))  # noqa: E731
BOLT = rig(0, 0.0007, -0.5320)
HANDLE = rig(0, 0.0007, -0.2836)
KNOB = rig(0.0612, -0.0588, -0.2798)
MAG_TOP = rig(0, -0.0373, -0.4399)
MAG_GRIP = rig(0, -0.1272, -0.4876)
TRIGGER = rig(0, -0.0892, -0.3201)
GRIP_R = rig(-0.0007, -0.0950, -0.1720)
GRIP_L = rig(0, 0, -0.7900)
PORT_MARK = rig(0.0276, 0.0169, -0.4369)
MAG_RELEASE = rig(0, -0.0929, -0.3653)
SCOPE_EYE = rig(0, 0.0726, -0.1320)
SCOPE_OBJ = rig(0, 0.0726, -0.7138)
SCOPE_Y = SCOPE_EYE.y
BOLT_TRAVEL = 0.198  # the AWP clip's stroke; the port and receiver are laid out round it

# ---------------------------------------------------------------- dimensions (local units)
REC_R = mm(17.3)  # round receiver, 1.36"
REC_FRONT, REC_REAR = BOLT.z - mm(19), HANDLE.z + mm(30)
BOLT_R = mm(8.9)  # 0.7" bolt body
BARREL_SHANK_R, MUZZLE_R = mm(14.6), mm(7.9)  # sporter contour, 1.15" → 0.62"
MUZZLE_Z = REC_FRONT - mm(22 * 25.4)  # 22" barrel
BUTT_Z = TRIGGER.z + mm(13.5 * 25.4)  # 13.5" length of pull to the pad's face
PAD = mm(24)
SPACER = mm(2.2)
WOOD_END = BUTT_Z - PAD - SPACER
TIP_Z = REC_FRONT - mm(270)  # fore-end tip
STOCK_BOTTOM = -0.0893  # underside round the magazine (the AWP's, where the support hand reaches)

# ---------------------------------------------------------------- scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)
for m in list(bpy.data.meshes):
    bpy.data.meshes.remove(m)

# ---------------------------------------------------------------- textures
def save_image(rgb, name, alpha=None):
    h, w = rgb.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=alpha is not None)
    a = alpha if alpha is not None else np.ones((h, w))
    px = np.concatenate([rgb, a[..., None]], axis=2)[::-1].astype(np.float32)
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = os.path.join(TEX_DIR, name + ".png")
    img.file_format = "PNG"
    img.save()
    return img


def fbm(shape, octaves, seed, scale=1.0):
    """Tileable-enough value-noise fBm (bilinear upsampled random grids), 0..1."""
    rng = np.random.default_rng(seed)
    h, w = shape
    out = np.zeros(shape)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        gh, gw = max(2, int(4 * scale * 2**o)), max(2, int(16 * scale * 2**o))
        grid = rng.random((gh + 1, gw + 1))
        ys = np.linspace(0, gh, h, endpoint=False)
        xs = np.linspace(0, gw, w, endpoint=False)
        y0, x0 = ys.astype(int), xs.astype(int)
        fy, fx = (ys - y0)[:, None], (xs - x0)[None, :]
        fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
        a = grid[y0][:, x0]
        b = grid[y0][:, x0 + 1]
        c = grid[y0 + 1][:, x0]
        d = grid[y0 + 1][:, x0 + 1]
        out += amp * (a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy)
        total += amp
        amp *= 0.5
    return out / total


# Stock UV atlas: u along the rifle (z), the upper half of v is the side projection (y), the
# lower half the top/bottom projection (x). Grain runs along u everywhere.
WOOD_Z0, WOOD_Z1 = TIP_Z - 0.01, WOOD_END + 0.01
WOOD_Y0, WOOD_Y1 = -0.33, 0.06
WOOD_X0, WOOD_X1 = -0.06, 0.06
TEX_W, TEX_H = 2048, 1024


def wood_uv_side(z, y):
    return ((z - WOOD_Z0) / (WOOD_Z1 - WOOD_Z0), 0.5 + 0.5 * (y - WOOD_Y0) / (WOOD_Y1 - WOOD_Y0))


def wood_uv_flat(z, x):
    return ((z - WOOD_Z0) / (WOOD_Z1 - WOOD_Z0), 0.5 * (x - WOOD_X0) / (WOOD_X1 - WOOD_X0))


def walnut_texture():
    h, w = TEX_H, TEX_W
    v = np.linspace(0, 1, h)[:, None] * np.ones((1, w))
    u = np.ones((h, 1)) * np.linspace(0, 1, w)[None, :]
    rng = np.random.default_rng(11)

    def streaks(rows, cols, seed):
        """Value noise stretched along u: many cells across the grain, few along it."""
        g = np.random.default_rng(seed).random((rows + 1, cols + 1))
        ys = np.linspace(0, rows, h, endpoint=False)
        xs = np.linspace(0, cols, w, endpoint=False)
        y0, x0 = ys.astype(int), xs.astype(int)
        fy, fx = (ys - y0)[:, None], (xs - x0)[None, :]
        fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
        return (
            g[y0][:, x0] * (1 - fx) * (1 - fy) + g[y0][:, x0 + 1] * fx * (1 - fy)
            + g[y0 + 1][:, x0] * (1 - fx) * fy + g[y0 + 1][:, x0 + 1] * fx * fy
        )

    # The grain wanders slowly across the board (a warp in v that changes along u).
    warp = (fbm((h, w), 3, 15, 0.5) - 0.5) * 0.08
    vv = np.clip(v + warp, 0, 0.9999)
    idx = (vv * (h - 1)).astype(int)
    fine = streaks(420, 10, 16)[idx, np.arange(w)[None, :]]
    mid = streaks(90, 5, 17)[idx, np.arange(w)[None, :]]
    lines = (streaks(260, 14, 18)[idx, np.arange(w)[None, :]] > 0.82).astype(float)
    figure = fbm((h, w), 4, 13, 0.9)
    pores = (rng.random((h, w // 5 + 1)) > 0.94).astype(float)
    pores = np.repeat(pores, 5, axis=1)[:, :w]
    t = np.clip(0.35 * fine + 0.35 * mid + 0.3 * figure - 0.22 * lines - 0.08 * pores, 0, 1)
    dark = np.array([0.16, 0.085, 0.045])
    light = np.array([0.37, 0.215, 0.115])
    rgb = dark + (light - dark) * t[..., None] ** 1.1
    # Hand-cut checkering (diamonds, ~20 lines per inch) on the pistol grip and the fore-end.
    zz = WOOD_Z0 + u * (WOOD_Z1 - WOOD_Z0)
    side = v >= 0.5
    yy = WOOD_Y0 + (v - 0.5) * 2 * (WOOD_Y1 - WOOD_Y0)
    pitch = mm(1.27)
    a = (zz * math.cos(0.5) + yy * math.sin(0.5)) / pitch
    b = (zz * math.cos(0.5) - yy * math.sin(0.5)) / pitch
    lines = np.minimum(np.abs(a - np.round(a)), np.abs(b - np.round(b)))
    diamonds = np.clip(lines / 0.32, 0, 1) ** 0.7  # 0 on the cut line, 1 on a diamond top
    def panel(z0, z1, y0, y1, slant=0.0):
        inside = (zz > z0) & (zz < z1) & (yy - slant * (zz - z0) > y0) & (yy - slant * (zz - z0) < y1)
        border = (
            (np.abs(zz - z0) < mm(1.1)) | (np.abs(zz - z1) < mm(1.1))
            | (np.abs(yy - slant * (zz - z0) - y0) < mm(1.1)) | (np.abs(yy - slant * (zz - z0) - y1) < mm(1.1))
        )
        return inside & side, border & side & (zz > z0 - mm(1.2)) & (zz < z1 + mm(1.2))
    shade = np.ones((h, w))
    for p in (
        panel(GRIP_R.z - 0.045, GRIP_R.z + 0.062, -0.205, -0.04, slant=0.55),
        panel(TIP_Z + 0.07, REC_FRONT - 0.02, -0.078, -0.022),
    ):
        inside, border = p
        shade = np.where(inside, 0.55 + 0.45 * diamonds, shade)
        shade = np.where(border, 0.45, shade)
    rgb = rgb * shade[..., None]
    return save_image(np.clip(rgb, 0, 1), "hunting_walnut")


def steel_texture():
    """Blued steel: a faint brushed streak along the parts (u), base colour only."""
    h, w = 256, 1024
    streak = fbm((h, w), 4, 21, 3.0)
    base = np.array([0.2, 0.215, 0.245])
    rgb = base * (0.88 + 0.24 * streak[..., None])
    return save_image(np.clip(rgb, 0, 1), "hunting_blued")


# ---------------------------------------------------------------- materials
def material(name, color=(1, 1, 1), metal=0.0, rough=0.5, image=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Roughness"].default_value = rough
    if image:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return m


def srgb(*c):
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


MAT = {
    "walnut": material("HuntingWalnut", rough=0.42, image=walnut_texture()),
    "blued": material("HuntingBlued", metal=1.0, rough=0.38, image=steel_texture()),
    "bolt": material("HuntingBoltSteel", srgb(0.72, 0.72, 0.7), metal=1.0, rough=0.2),
    "black": material("HuntingMatteBlack", srgb(0.045, 0.045, 0.048), metal=0.35, rough=0.55),
    "rubber": material("HuntingRubber", srgb(0.035, 0.035, 0.035), rough=0.92),
    "spacer": material("HuntingSpacer", srgb(0.86, 0.85, 0.8), rough=0.6),
    "polymer": material("HuntingPolymer", srgb(0.05, 0.05, 0.052), rough=0.7),
    "lens": material("HuntingLens", (0.010, 0.024, 0.042), metal=0.0, rough=0.05),
    "bore": material("HuntingBore", srgb(0.01, 0.01, 0.01), rough=0.8),
}

# ---------------------------------------------------------------- geometry helpers (GLB frame)
def mesh_object(name, bm, mat_key):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(MAT[mat_key])
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def lathe(name, profile, mat_key, n=32, center=(0.0, 0.0), cap0=True, cap1=True):
    """Solid of revolution about the z axis through (x, y) = center. profile: [(z, r)]."""
    bm = bmesh.new()
    rings = []
    for z, r in profile:
        ring = []
        for i in range(n):
            t = 2 * math.pi * i / n
            ring.append(bm.verts.new((center[0] + r * math.cos(t), center[1] + r * math.sin(t), z)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap0:
        bm.faces.new(rings[0][::-1])
    if cap1:
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_object(name, bm, mat_key)


def superellipse(cx, cy, hw, hh, n, power):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        c, s = math.cos(t), math.sin(t)
        pts.append((cx + hw * math.copysign(abs(c) ** (2 / power), c), cy + hh * math.copysign(abs(s) ** (2 / power), s)))
    return pts


def loft(name, rings, mat_key, cap0=True, cap1=True):
    """rings: lists of 3D points (same count) → closed quad loft."""
    bm = bmesh.new()
    vr = [[bm.verts.new(p) for p in r] for r in rings]
    n = len(rings[0])
    for a, b in zip(vr, vr[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap0:
        bm.faces.new(vr[0][::-1])
    if cap1:
        bm.faces.new(vr[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_object(name, bm, mat_key)


def z_section(z, cx, cy, hw, hh, n=32, power=2.6):
    return [(x, y, z) for x, y in superellipse(cx, cy, hw, hh, n, power)]


def rounded_box(name, lo, hi, mat_key, bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = V([lo[i] + (v.co[i] + 0.5) * (hi[i] - lo[i]) for i in range(3)])
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=2, affect="EDGES", profile=0.5)
    return mesh_object(name, bm, mat_key)


def tube_along(name, path, radius, mat_key, n=12, rect=None):
    """Sweep a circle (or rect=(w, h)) along a polyline path of 3D points."""
    rings = []
    for k, p in enumerate(path):
        p = V(p)
        tangent = (V(path[min(k + 1, len(path) - 1)]) - V(path[max(k - 1, 0)])).normalized()
        side = V((1, 0, 0)) if abs(tangent.x) < 0.9 else V((0, 1, 0))
        nrm = tangent.cross(side).normalized()
        bin_ = tangent.cross(nrm).normalized()
        ring = []
        if rect:
            for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                ring.append(p + nrm * (a * rect[0] / 2) + bin_ * (b * rect[1] / 2))
        else:
            for i in range(n):
                t = 2 * math.pi * i / n
                ring.append(p + nrm * (radius * math.cos(t)) + bin_ * (radius * math.sin(t)))
        rings.append(ring)
    return loft(name, rings, mat_key)


def join(name, objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].name = name
    objs[0].data.name = name
    return objs[0]


def boolean(target, cutter, op="DIFFERENCE"):
    mod = target.modifiers.new("bool", "BOOLEAN")
    mod.operation = op
    mod.solver = "EXACT"
    mod.object = cutter
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter)


# ================================================================= STOCK (walnut, one surface)
# Side profile (z, top y, bottom y, half-width): butt → comb → wrist → action → fore-end tip.
W = WOOD_END
STOCK = [
    (W, -0.020, -0.272, 0.0205),
    (W - 0.03, -0.012, -0.265, 0.0213),
    (W - 0.12, 0.000, -0.244, 0.0213),  # Monte Carlo comb
    (W - 0.22, 0.006, -0.226, 0.0208),
    (W - 0.30, 0.006, -0.212, 0.0200),
    (GRIP_R.z + 0.105, 0.0, -0.196, 0.0190),  # comb nose; a shallow sweep down into the grip
    (GRIP_R.z + 0.055, -0.016, -0.212, 0.0184),
    (GRIP_R.z + 0.010, -0.022, -0.130, 0.0182),  # wrist, the hand's web over it
    (REC_REAR + 0.01, -0.016, STOCK_BOTTOM - 0.002, 0.0222),
    (REC_REAR - 0.03, -0.008, STOCK_BOTTOM, 0.0262),
    (MAG_TOP.z + 0.07, -0.006, STOCK_BOTTOM, 0.0268),  # action: walls up to the bore line
    (REC_FRONT - 0.02, -0.006, STOCK_BOTTOM + 0.004, 0.0262),
    (REC_FRONT - 0.09, -0.010, -0.088, 0.0218),
    (GRIP_L.z, -0.014, -0.090, 0.0205),  # support-hand station: the AWP's fore-end size
    (TIP_Z + 0.09, -0.012, -0.078, 0.0180),
    (TIP_Z + 0.03, -0.012, -0.070, 0.0165),
    (TIP_Z + 0.008, -0.015, -0.064, 0.0158),
    (TIP_Z, -0.018, -0.058, 0.0150),
]
stock_rings = [z_section(z, 0.0, (t + b) / 2, hw, (t - b) / 2, n=40, power=2.8) for z, t, b, hw in STOCK]
stock_body = loft("StockBody", stock_rings[::-1], "walnut")

# Pistol grip: horizontal sections of the AK grip the rig's right hand is posed on (rig Y,
# front Z, back Z), as the AWP's, carried up into the wrist and slightly fuller at the palm swell.
AK_GRIP = [
    (-0.030, -0.292, -0.148),
    (-0.050, -0.287, -0.152),
    (-0.120, -0.275, -0.171),
    (-0.140, -0.257, -0.165),
    (-0.180, -0.241, -0.150),
    (-0.200, -0.227, -0.138),
    (-0.220, -0.219, -0.131),
    (-0.240, -0.217, -0.131),
    (-0.260, -0.216, -0.138),
    (-0.275, -0.214, -0.150),
    (-0.285, -0.206, -0.166),
]
GRIP_HALF_W = 0.0215
grip_rings = []
for k, (Y, zf, zb) in enumerate(AK_GRIP):
    zf, zb = zf - ALIGN_Z, zb - ALIGN_Z
    taper = 1.0 if k < len(AK_GRIP) - 2 else (0.93 if k == len(AK_GRIP) - 2 else 0.82)
    swell = 1.0 + 0.06 * math.sin(math.pi * k / (len(AK_GRIP) - 1))
    ring = superellipse((zf + zb) / 2, 0.0, (zb - zf) / 2, GRIP_HALF_W * taper * swell, 32, 2.5)
    grip_rings.append([(x, Y, z) for z, x in ring])
grip_body = loft("PistolGrip", grip_rings, "walnut")

# One organic surface: voxel union of body and grip, smoothed, decimated, then UV'd for the grain.
stock = join("Stock", [stock_body, grip_body])
mod = stock.modifiers.new("remesh", "REMESH")
mod.mode = "VOXEL"
mod.voxel_size = mm(1.0)
mod.use_smooth_shade = True
bpy.context.view_layer.objects.active = stock
bpy.ops.object.modifier_apply(modifier=mod.name)
mod = stock.modifiers.new("smooth", "CORRECTIVE_SMOOTH")
mod.iterations = 6
mod.use_only_smooth = True
bpy.ops.object.modifier_apply(modifier=mod.name)
mod = stock.modifiers.new("decimate", "DECIMATE")
mod.ratio = 3600 / max(1, len(stock.data.polygons))
bpy.ops.object.modifier_apply(modifier=mod.name)


def uv_wood(obj):
    me = obj.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    uv = me.uv_layers.active.data
    for poly in me.polygons:
        n = poly.normal
        side = abs(n.x) > 0.55 * max(abs(n.y), abs(n.z), 1e-6) or abs(n.x) > 0.5
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv[li].uv = wood_uv_side(co.z, co.y) if side else wood_uv_flat(co.z, co.x)


uv_wood(stock)

# Recoil pad and its white spacer, following the butt's end section.
def butt_section(z, grow=0.0):
    top, bot, hw = STOCK[0][1], STOCK[0][2], STOCK[0][3]
    return z_section(z, 0.0, (top + bot) / 2, hw + grow, (top - bot) / 2 + grow, n=40, power=2.8)


spacer = loft("Spacer", [butt_section(W + 0.0005), butt_section(W + SPACER)], "spacer")
pad = loft(
    "RecoilPad",
    [butt_section(W + SPACER), butt_section(W + SPACER + PAD * 0.8, 0.001), butt_section(BUTT_Z - 0.003, -0.001), butt_section(BUTT_Z, -0.004)],
    "rubber",
)
grip_cap = loft(
    "GripCap",
    [
        [(x, AK_GRIP[-1][0] + 0.001, z) for x, _, z in grip_rings[-1]],
        [(x * 0.97, AK_GRIP[-1][0] - mm(3), z) for x, _, z in grip_rings[-1]],
    ],
    "black",
)

# ================================================================= RECEIVER + BARREL (blued)
receiver = lathe(
    "Receiver",
    [
        (REC_FRONT - mm(3), REC_R - mm(1.5)),
        (REC_FRONT, REC_R),
        (REC_REAR - mm(6), REC_R),
        (REC_REAR - mm(2), REC_R - mm(1.2)),
        (REC_REAR, REC_R - mm(4)),
    ],
    "blued",
    n=40,
)
# Recoil lug and the tang running back into the wrist.
lug = rounded_box("RecoilLug", (-mm(12), -REC_R - mm(5), REC_FRONT + mm(2)), (mm(12), -REC_R + mm(4), REC_FRONT + mm(10)), "blued")
tang = rounded_box("Tang", (-mm(6.5), -mm(12), REC_REAR - mm(4)), (mm(6.5), -mm(6.8), REC_REAR + mm(24)), "blued", bevel=mm(1.5))
# Ejection port (right side, the AWP's), the bolt-handle slot and the bolt bore.
port_lo = PORT_MARK.z - mm(37)
port_hi = PORT_MARK.z + mm(37)
cut_port = rounded_box("PortCut", (mm(7), -mm(5), port_lo), (REC_R + mm(5), mm(12.5), port_hi), "blued", bevel=mm(2.5))
boolean(receiver, cut_port)
cut_slot = rounded_box("SlotCut", (mm(4), -REC_R - mm(5), HANDLE.z - mm(9)), (REC_R + mm(5), mm(2), HANDLE.z + mm(9)), "blued", bevel=mm(2))
boolean(receiver, cut_slot)
bore_cut = lathe("BoreCut", [(REC_FRONT - mm(10), BOLT_R + mm(0.6)), (REC_REAR + mm(10), BOLT_R + mm(0.6))], "blued", n=32)
boolean(receiver, bore_cut)
# One-piece scope base along the receiver's top (the AWP's eye point puts the scope's rear ring
# ahead of the bridge, over the port's top: a one-piece base, as on many sporters).
bases = [
    rounded_box("ScopeBase", (-mm(8.5), REC_R - mm(3), REC_FRONT + mm(6)), (mm(8.5), REC_R + mm(4.5), REC_REAR - mm(46)), "blued", bevel=mm(1.5))
]
action = join("Action", [receiver, lug, tang, *bases])

barrel_profile = [(REC_FRONT + mm(1), BARREL_SHANK_R + mm(1.5)), (REC_FRONT - mm(18), BARREL_SHANK_R + mm(1.5)), (REC_FRONT - mm(19), BARREL_SHANK_R)]
for k in range(1, 13):
    t = k / 12
    z = REC_FRONT - mm(19) + (MUZZLE_Z + mm(19) - REC_FRONT) * t
    # Sporter contour: a fast taper over the first 5", then a long straight one.
    fast = min(1.0, t / 0.22)
    r = BARREL_SHANK_R - (BARREL_SHANK_R - mm(11.2)) * (1 - (1 - fast) ** 2) - (mm(11.2) - MUZZLE_R) * max(0.0, (t - 0.22) / 0.78)
    barrel_profile.append((z, r))
barrel_profile += [(MUZZLE_Z + mm(1.2), MUZZLE_R - mm(0.6)), (MUZZLE_Z + mm(0.6), mm(4.8)), (MUZZLE_Z + mm(4), mm(3.9))]
barrel = lathe("Barrel", barrel_profile, "blued", n=28, cap0=False, cap1=True)
bore = lathe("BoreHole", [(MUZZLE_Z + mm(0.5), mm(3.95)), (MUZZLE_Z + mm(4.1), mm(3.95))], "bore", n=16)

# Trigger guard (a bent steel strip) and the floorplate round the magazine well.
guard_path = []
g0, g1 = TRIGGER.z - mm(30), TRIGGER.z + mm(42)
for k in range(15):
    a = math.pi * k / 14
    guard_path.append((0.0, STOCK_BOTTOM - mm(1) - mm(24) * math.sin(a) ** 0.8, g0 + (g1 - g0) * (1 - math.cos(a)) / 2))
guard = tube_along("TriggerGuard", guard_path, 0, "blued", rect=(mm(9.5), mm(3.2)))
bow = rounded_box("GuardBow", (-mm(9), STOCK_BOTTOM - mm(2), g0 - mm(3)), (mm(9), STOCK_BOTTOM + mm(0.5), g1 + mm(3)), "blued", bevel=mm(1.2))
well = rounded_box(
    "MagWellPlate",
    (-mm(15), STOCK_BOTTOM - mm(1.5), MAG_TOP.z - mm(42)),
    (mm(15), STOCK_BOTTOM + mm(0.6), MAG_TOP.z + mm(42)),
    "blued",
    bevel=mm(1.5),
)
release = rounded_box(
    "MagReleaseLever",
    (-mm(5), MAG_RELEASE.y - mm(3), MAG_RELEASE.z - mm(4)),
    (mm(5), STOCK_BOTTOM, MAG_RELEASE.z + mm(4)),
    "blued",
    bevel=mm(1),
)
# Sling studs: a short post under the stock with a swivel ring on it.
studs = []
for z, y in ((W - 0.10, -0.272), (TIP_Z + 0.06, -0.074)):
    studs.append(rounded_box(f"Stud{len(studs)}", (-mm(3), y - mm(7), z - mm(3)), (mm(3), y + mm(2), z + mm(3)), "blued", bevel=mm(1)))
    ring_pts = [(0.0, y - mm(11) + mm(5.5) * math.sin(2 * math.pi * k / 16), z + mm(5.5) * math.cos(2 * math.pi * k / 16)) for k in range(17)]
    studs.append(tube_along(f"Swivel{len(studs)}", ring_pts, mm(1.1), "blued", n=8))
metal = join("Metal", [action, barrel, guard, bow, well, release, *studs])

# ================================================================= TRIGGER
trig_path = [(0.0, TRIGGER.y - mm(1) - mm(20) * (k / 8), TRIGGER.z + mm(5) * math.sin(math.pi * 0.9 * k / 8) - mm(2) * k / 8) for k in range(9)]
trigger_mesh = tube_along("TriggerBlade", trig_path, 0, "blued", rect=(mm(6.5), mm(4.2)))

# ================================================================= BOLT (polished) + HANDLE
bolt_face = BOLT.z
bolt_body = lathe(
    "BoltBody",
    [
        (bolt_face, BOLT_R - mm(1.2)),
        (bolt_face + mm(1.5), BOLT_R),
        (REC_REAR - mm(2), BOLT_R),
        (REC_REAR - mm(1), BOLT_R - mm(1)),
    ],
    "bolt",
    n=32,
    cap1=False,
)
shroud = lathe(
    "BoltShroud",
    [
        (REC_REAR - mm(1.5), BOLT_R - mm(0.5)),
        (REC_REAR + mm(1), mm(11)),
        (REC_REAR + mm(16), mm(10.6)),
        (REC_REAR + mm(22), mm(8.5)),
        (REC_REAR + mm(24), mm(5.2)),  # cocking piece
        (REC_REAR + mm(30), mm(4.6)),
        (REC_REAR + mm(31), mm(3.5)),
    ],
    "blued",
    n=32,
)
# Lugs at the bolt head (two, at 3 and 9 o'clock).
lugs = [
    rounded_box(f"BoltLug{i}", (sx * BOLT_R - mm(3), -mm(3.5), bolt_face + mm(1)), (sx * BOLT_R + mm(3), mm(3.5), bolt_face + mm(8)), "bolt", bevel=mm(0.8))
    for i, sx in enumerate((-1, 1))
]
bolt_mesh = join("BoltGeometry", [bolt_body, shroud, *lugs])

# Handle: a root on the bolt, a swept-back arm and a pear-shaped knob at the AWP's knob point.
k_rel = KNOB - HANDLE
arm_path = []
for k in range(9):
    t = k / 8
    ang = math.atan2(k_rel.y, k_rel.x)
    dist = BOLT_R * 0.6 + (k_rel.xy.length - BOLT_R * 0.6 - mm(9)) * t
    arm_path.append((HANDLE.x + dist * math.cos(ang), HANDLE.y + dist * math.sin(ang), HANDLE.z + k_rel.z * t + mm(3) * math.sin(math.pi * t)))
arm = tube_along("HandleArm", arm_path, mm(4.2), "bolt", n=14)
root_block = rounded_box("HandleRoot", (BOLT_R - mm(4), -mm(6), HANDLE.z - mm(7)), (BOLT_R + mm(5), mm(5), HANDLE.z + mm(7)), "bolt", bevel=mm(2))
knob = lathe(
    "Knob",
    [(KNOB.z - mm(10) * math.cos(a), mm(10.5) * math.sin(a) * (1.0 - 0.18 * (1 - math.cos(a)))) for a in np.linspace(0.05, math.pi - 0.05, 12)],
    "bolt",
    n=24,
    center=(KNOB.x, KNOB.y),
)
handle_mesh = join("HandleGeometry", [arm, root_block, knob])

# ================================================================= MAGAZINE (5-round box, polymer)
MAG_LEN, MAG_W = mm(70), mm(23)
mag_bottom = MAG_TOP.y - 0.128
mag_rings = []
for y, grow in ((MAG_TOP.y + mm(8), 0.0), (STOCK_BOTTOM + mm(1), 0.0), (mag_bottom + mm(5), mm(0.5)), (mag_bottom + mm(4), mm(2)), (mag_bottom, mm(2))):
    pts = superellipse(MAG_TOP.z, 0.0, MAG_LEN / 2 + grow, MAG_W / 2 + grow * 0.6, 24, 6.0)
    mag_rings.append([(x, y, z) for z, x in pts])
mag_mesh = loft("MagazineGeometry", mag_rings, "polymer")

# ================================================================= SCOPE (3-9×36, matte black)
EYE_LENS = SCOPE_EYE.z - 0.06  # the AWP's: 3 cm (real) behind the ocular lens
OBJ_LENS = SCOPE_OBJ.z
TUBE_R = mm(12.7)  # 1" tube
# Written along the line of sight: eyepiece offsets back from the eye lens toward the muzzle
# (−z), objective offsets back from the objective lens toward the eye (+z).
EYE_TUBE = EYE_LENS - mm(58)  # where the eyepiece meets the 1" tube
scope_profile = [
    (EYE_LENS - mm(1.5), mm(15.6)),  # lip round the ocular lens (open: the lens shows)
    (EYE_LENS + mm(1), mm(16.2)),
    (EYE_LENS + mm(1), mm(17.5)),
    (EYE_LENS - mm(1.5), mm(18.6)),  # rubber eyepiece edge
    (EYE_LENS - mm(5), mm(19)),
    (EYE_LENS - mm(24), mm(18.2)),
    (EYE_LENS - mm(28), mm(16)),
    (EYE_LENS - mm(31), mm(16)),  # power ring with its grip ribs
    (EYE_LENS - mm(32.5), mm(16.9)),
    (EYE_LENS - mm(37), mm(16.9)),
    (EYE_LENS - mm(38.5), mm(16)),
    (EYE_LENS - mm(40), mm(16.9)),
    (EYE_LENS - mm(44.5), mm(16.9)),
    (EYE_LENS - mm(46), mm(16)),
    (EYE_LENS - mm(50), mm(15.4)),
    (EYE_TUBE, TUBE_R),
    (OBJ_LENS + mm(72), TUBE_R),
    (OBJ_LENS + mm(46), mm(20.6)),  # objective bell
    (OBJ_LENS + mm(6), mm(20.8)),
    (OBJ_LENS + mm(3), mm(21.4)),
    (OBJ_LENS - mm(1), mm(21.4)),
    (OBJ_LENS - mm(1.5), mm(19.6)),
    (OBJ_LENS + mm(0.5), mm(18.8)),  # lip round the objective lens (open)
]
scope_body = lathe("ScopeBody", scope_profile, "black", n=36, center=(0, SCOPE_Y), cap0=False, cap1=False)
RING_Z = (REC_FRONT + mm(26), EYE_TUBE - mm(14))
SADDLE_Z = (RING_Z[0] + RING_Z[1]) / 2  # mid-tube, between the rings
turret_saddle = lathe("Saddle", [(SADDLE_Z + mm(23), mm(14.6)), (SADDLE_Z - mm(23), mm(14.6))], "black", n=36, center=(0, SCOPE_Y))
turrets = []
sad_z = SADDLE_Z
for name, axis in (("Elevation", "y"), ("Windage", "x")):
    t = lathe(f"{name}Turret", [(0, mm(9.8)), (mm(20), mm(9.8)), (mm(21.5), mm(8.6)), (mm(23), mm(5))], "black", n=24)
    rot = mathutils.Matrix.Rotation(-math.pi / 2, 4, "X") if axis == "y" else mathutils.Matrix.Rotation(math.pi / 2, 4, "Y")
    t.data.transform(rot)
    t.data.transform(mathutils.Matrix.Translation((0, SCOPE_Y, sad_z)))
    turrets.append(t)
lenses = [
    lathe("EyeLens", [(EYE_LENS - mm(4), mm(15.7)), (EYE_LENS - mm(2.5), mm(15.7))], "lens", n=32, center=(0, SCOPE_Y)),
    lathe("ObjectiveLens", [(OBJ_LENS + mm(3), mm(18.9)), (OBJ_LENS + mm(1.5), mm(18.9))], "lens", n=36, center=(0, SCOPE_Y)),
]
rings = []
for z in RING_Z:
    rings.append(
        lathe(
            f"Ring{len(rings)}",
            [(z - mm(9), TUBE_R + mm(2.5)), (z - mm(8), TUBE_R + mm(4.5)), (z + mm(8), TUBE_R + mm(4.5)), (z + mm(9), TUBE_R + mm(2.5))],
            "black",
            n=36,
            center=(0, SCOPE_Y),
        )
    )
    rings.append(rounded_box(f"RingFoot{len(rings)}", (-mm(10), REC_R + mm(3.5), z - mm(8)), (mm(10), SCOPE_Y - TUBE_R, z + mm(8)), "black", bevel=mm(2)))
    # Cap screws on both sides of the ring's top half, heads facing out.
    for sx in (-1, 1):
        for dz in (-mm(4.5), mm(4.5)):
            sc = lathe(f"RingScrew{len(rings)}", [(0, mm(2.1)), (mm(2.2), mm(2.1)), (mm(2.8), mm(1.4))], "black", n=10)
            sc.data.transform(mathutils.Matrix.Rotation(sx * math.pi / 2, 4, "Y"))
            sc.data.transform(mathutils.Matrix.Translation((sx * (TUBE_R + mm(4)), SCOPE_Y + mm(5), z + dz)))
            rings.append(sc)
scope = join("ScopeGeometry", [scope_body, turret_saddle, *turrets, *rings])
lens_obj = join("ScopeLenses", lenses)


# ================================================================= finish: shading, frame, nodes
def smooth(obj, angle=40):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle), keep_sharp_edges=True)
    obj.data.validate()


rifle_parts = {
    "Stock": join("Stock", [stock, spacer, pad, grip_cap]),
    "Metal": join("Metal", [metal, bore]),
    "ScopeGeometry": join("ScopeGeometry", [scope, lens_obj]),
}
moving = {"Bolt": bolt_mesh, "BoltHandle": handle_mesh, "Magazine": mag_mesh, "Trigger": trigger_mesh}
for o in list(rifle_parts.values()) + list(moving.values()):
    smooth(o, 35 if o.name != "Stock" else 70)

# GLB frame → Blender (Z up): (x, y, z) → (x, −z, y); the glTF exporter turns it back.
TO_BLENDER = mathutils.Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
def b(v):
    return TO_BLENDER @ V(v)


cols = {}
for name in ("Hunting_Rifle", "Hunting_Animated", "Hunting_Markers"):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    cols[name] = c


def move_to(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    cols[col].objects.link(obj)


root = bpy.data.objects.new("HuntingRifle", None)
cols["Hunting_Rifle"].objects.link(root)


def empty(name, loc, parent=root, col="Hunting_Markers", rot=None):
    e = bpy.data.objects.new(name, None)
    cols[col].objects.link(e)
    e.empty_display_size = 0.02
    e.parent = parent
    e.location = loc
    if rot:
        e.rotation_euler = rot
    return e


def attach(obj, parent, pivot_glb, parent_glb):
    """Mesh authored in the GLB frame → child of parent, origin at pivot."""
    obj.data.transform(TO_BLENDER @ mathutils.Matrix.Translation(-V(pivot_glb)))
    obj.parent = parent
    obj.location = (0, 0, 0)


for name, obj in rifle_parts.items():
    attach(obj, root, (0, 0, 0), (0, 0, 0))
    move_to(obj, "Hunting_Rifle")

bolt = empty("Bolt", b(BOLT), col="Hunting_Animated")
attach(moving["Bolt"], bolt, BOLT, BOLT)
move_to(moving["Bolt"], "Hunting_Animated")
handle = empty("BoltHandle", b(HANDLE - BOLT), parent=bolt, col="Hunting_Animated")
attach(moving["BoltHandle"], handle, HANDLE, HANDLE)
move_to(moving["BoltHandle"], "Hunting_Animated")
empty("BoltKnob", b(KNOB - HANDLE), parent=handle)
magazine = empty("Magazine", b(MAG_TOP), col="Hunting_Animated")
attach(moving["Magazine"], magazine, MAG_TOP, MAG_TOP)
move_to(moving["Magazine"], "Hunting_Animated")
empty("MagazineGrip", b(MAG_GRIP - MAG_TOP), parent=magazine)
trigger = empty("Trigger", b(TRIGGER), col="Hunting_Animated")
attach(moving["Trigger"], trigger, TRIGGER, TRIGGER)
move_to(moving["Trigger"], "Hunting_Animated")
empty("GripR", b(GRIP_R), rot=(math.radians(-16.0), 0, 0))
empty("GripL", b(GRIP_L))
empty("MuzzleDeviceTip", b((0, 0, MUZZLE_Z)))
empty("EjectionPort", b(PORT_MARK))
empty("MagRelease", b(MAG_RELEASE))
empty("ScopeEye", b(SCOPE_EYE))
empty("ScopeObjective", b(SCOPE_OBJ))

# ---------------------------------------------------------------- report + export
bpy.context.view_layer.update()
total = 0
for o in bpy.data.objects:
    if o.type == "MESH":
        t = sum(len(p.vertices) - 2 for p in o.data.polygons)
        total += t
        print("REPORT", o.name, "tris", t)
print("REPORT total tris", total)
print("REPORT length", round(BUTT_Z - MUZZLE_Z, 4), "units =", round((BUTT_Z - MUZZLE_Z) / U, 3), "m")
for name in ("Bolt", "BoltHandle", "BoltKnob", "Magazine", "MagazineGrip", "Trigger", "GripR", "GripL",
             "MuzzleDeviceTip", "EjectionPort", "MagRelease", "ScopeEye", "ScopeObjective"):
    w = TO_BLENDER.inverted() @ bpy.data.objects[name].matrix_world.translation
    print("REPORT marker", name, "glb", tuple(round(x, 4) for x in w), "rig", tuple(round(x, 4) for x in (w.x, w.y, w.z + ALIGN_Z)))

bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(OUT_BLEND), compress=True)
bpy.ops.export_scene.gltf(
    filepath=os.path.abspath(OUT_GLB),
    export_format="GLB",
    export_yup=True,
    export_apply=False,
    export_image_format="AUTO",
    export_texcoords=True,
    export_normals=True,
    export_tangents=False,
    export_materials="EXPORT",
)
