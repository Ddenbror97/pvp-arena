"""
Duty-jacket sleeves for the first-person arms (Blender, headless).

  python build_jacket_sleeve.py -- <outdir> [--size 2048] [--preview]                    # Terrorist
  python build_jacket_sleeve.py -- <outdir> --variant police [--watch <jacket-watch.glb>] [--preview]

Terrorist (default, `JacketSleeve`): the character's snow-camouflage smock (terrorist-fighter.glb):
three-tone print (off-white base, light-grey and dark-grey blotches at the character's scale,
seamless round the arm), cotton windproof weave, a camo cuff tab closed with a dark button like
the smock's front buttons. (Earlier: plain white ripstop with hook-and-loop and a reflective band.)

Police variant (`PoliceSleeve`, police-sleeve.glb): the Police character's steel-blue duty shirt
(sampled from police-swat.glb: sRGB ~84,112,128) in cotton twill with light topstitching, a
buttoned shirt cuff (placket and a real four-hole button) instead of the hook-and-loop strap, no
reflective band. The field watch (build_accessories.py --watch-only) is worn over the sleeve
just above the cuff: the fabric is cinched flat under the strap (WATCH_LIFT) and bunches on
either side of it. `--watch` adds the watch to the preview renders only.

A white technical (ripstop softshell) duty-jacket sleeve authored on the runtime forearm
(forearm.py) in the canonical arm frame (+X thumb, +Y toward the elbow, +Z back of the arm),
like the olive sleeve (now on the Police arms), and exported to jacket-sleeve.glb as
`JacketSleeve`:

  Geometry  full-length sleeve from just over the glove gauntlet to past the elbow:
            - turned hem with a lip that rolls inside (the fabric has thickness at the edge),
            - double-layer cuff band with an adjustable hook-and-loop strap and tab on the
              back of the wrist (raised strap, stitched border, pull tab),
            - compression folds bunching above the cuff (uneven, tilted, broken rings),
            - looser drape toward the elbow with long diagonal folds and underarm sag,
            - a curved articulation panel seam on the back of the forearm.
  Textures  unique UVs; Cycles AO bake against the arm, then in numpy: fine ripstop grid and
            twill, flat-felled underarm seam and panel seam with lock-stitch rows, cuff and hem
            topstitching, hook-and-loop texture on the strap, fold grime and wear, slight
            warm/cool fabric variation. Base colour / normal / ORM (AO, roughness).

The sleeve covers the forearm entirely, so the runtime hides the bare forearm under it.
"""
import bpy, sys, os, math
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import forearm as F
from mesh_util import MeshData

argv = sys.argv[sys.argv.index("--") + 1 :]
outdir = argv[0]
SIZE = int(argv[argv.index("--size") + 1]) if "--size" in argv else 2048
PREVIEW = "--preview" in argv
POLICE = "--variant" in argv and argv[argv.index("--variant") + 1] == "police"
WATCH_GLB = argv[argv.index("--watch") + 1] if "--watch" in argv else None
CAMO = not POLICE  # Terrorist snow-camo smock
NAME = "PoliceSleeve" if POLICE else "JacketSleeve"
STEM = "police_sleeve" if POLICE else "jacket_sleeve"
os.makedirs(outdir, exist_ok=True)
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
sc = bpy.context.scene

# --------------------------------------------------------------------------------- layout
HEM = 0.004  # hem edge: metres from the wrist joint (over the glove's 24 mm gauntlet)
CUFF = 0.040  # cuff band ends here
END = 0.44  # past the elbow (off-screen)
COLS = 72
SEAM_THETA = -math.pi / 2 - 0.45  # underarm seam: palm / little-finger side
STRAP_THETA = 0.95  # hook-and-loop cuff strap: thumb/back side, where the camera sees it
STRAP_HALF = 0.20  # radians either side
BAND_ALONG = (0.152, 0.177)  # retro-reflective band round the forearm (duty jacket marking)
CUFF_OFF = 0.0088  # cuff band height above the skin (two layers over the glove gauntlet)
# Police: the watch over the sleeve (build_accessories.py WATCH_ALONG, strap 20 mm wide).
WATCH_ALONG = 0.058
WATCH_HALF = 0.0112  # half the cinched width along the arm (strap + a little give)
WATCH_LIFT = 0.0068  # fabric height under the strap; the watch is built on exactly this
# Cuff button. Police: on the shirt-cuff placket, back of the wrist toward the little finger.
# Terrorist: on the cuff tab (the raised strap, STRAP_THETA), like the smock's front buttons.
BUTTON_THETA = 2.25 if POLICE else 0.95
BUTTON_ALONG = 0.022 if POLICE else 0.0275


def smooth(x, a, b):
    return F.smoothstep(x, a, b)


def wrap(a):
    return np.angle(np.exp(1j * a))


def offset(along, theta):
    """Fabric height above the skin (m)."""
    z = np.asarray(along, float)
    theta = np.asarray(theta, float)
    rng = np.random.default_rng(11)
    # Cuff band: firm, slightly lumpy where the strap gathers it.
    gather = 0.0009 * np.exp(-((wrap(theta - STRAP_THETA - 0.5) / 0.35) ** 2))
    cuff = CUFF_OFF + 0.0005 * np.sin(3 * theta + 0.7) + gather
    # Strap: raised layer on top of the band.
    strap_m = np.exp(-((wrap(theta - STRAP_THETA) / STRAP_HALF) ** 12)) * (
        smooth(z, HEM + 0.007, HEM + 0.0085) * (1 - smooth(z, CUFF - 0.0075, CUFF - 0.006))
    )
    cuff = cuff + 0.0026 * strap_m * (not POLICE)
    if POLICE:
        # Shirt cuff: placket overlap under the button (a second layer of cloth).
        cuff = cuff + 0.0007 * np.exp(-((wrap(theta - BUTTON_THETA - 0.1) / 0.32) ** 6))
    # Sleeve body: compression folds bunching above the cuff...
    body = 0.0095 + 0.0045 * smooth(z, 0.08, 0.36)
    fold = np.zeros(np.broadcast(z, theta).shape)
    rings = [(0.050, 0.0038, 0.0075), (0.064, 0.0046, 0.0070), (0.079, 0.0034, 0.0080),
             (0.095, 0.0040, 0.0085), (0.113, 0.0028, 0.0095), (0.134, 0.0022, 0.0110),
             (0.158, 0.0016, 0.0125)]
    if POLICE:
        # The strap holds the cloth flat round the wrist: one soft fold between cuff and watch,
        # the rest pushed up the arm where they stack tighter just above the strap.
        rings = [(0.0435, 0.0016, 0.0045), (0.080, 0.0050, 0.0068), (0.093, 0.0044, 0.0075),
                 (0.108, 0.0034, 0.0085), (0.126, 0.0026, 0.0100), (0.148, 0.0018, 0.0115)]
    for c, amp, w in rings:
        p1, p2, p3 = rng.random(3) * 2 * np.pi
        k = rng.integers(1, 3)
        centre = c + 0.005 * np.sin(theta + p1) + 0.002 * np.sin(2 * theta + p2)
        x = (z - centre) / w
        bump = np.clip(1 - x * x, 0, None) ** 1.7
        modulate = np.clip(0.5 + 0.6 * np.sin(k * theta + p3) + 0.25 * np.sin(5 * theta + p1), 0.05, 1.2)
        fold = np.maximum(fold, amp * bump * modulate)
    # ...and long diagonal drape folds toward the elbow.
    drape = np.zeros_like(fold)
    for t0, amp, twist in ((0.5, 0.0026, 7.0), (2.2, 0.0021, 8.5), (3.9, 0.0018, 6.0), (5.2, 0.0014, 9.5)):
        d = wrap(theta - t0 - twist * (z - 0.15))
        drape = drape + amp * np.exp(-((d / 0.3) ** 2)) * smooth(z, 0.12, 0.2)
    sag = 0.0032 * np.maximum(0, -np.sin(theta)) ** 2 * smooth(z, 0.1, 0.3)
    # Reflective band: heat-sealed tape, slightly stiffer (flattens the folds under it).
    tape = smooth(z, BAND_ALONG[0], BAND_ALONG[0] + 0.0015) * (1 - smooth(z, BAND_ALONG[1] - 0.0015, BAND_ALONG[1]))
    tape = tape * 0  # neither character wears a reflective band
    sleeve = body + (fold + drape) * (1 - 0.6 * tape) + sag + 0.0004 * tape
    # Blend cuff → sleeve with a small crease where the sleeve overhangs the band.
    k = smooth(z, CUFF - 0.002, CUFF + 0.006)
    off = cuff * (1 - k) + sleeve * k
    off -= 0.0012 * np.exp(-(((z - CUFF - 0.002) / 0.0018) ** 2))
    if POLICE:
        # Cinched flat under the watch strap, with the cloth bulging out at both strap edges.
        c = np.exp(-(((z - WATCH_ALONG) / WATCH_HALF) ** 8))
        off = off * (1 - c) + WATCH_LIFT * c
        off += 0.0013 * np.exp(-(((z - WATCH_ALONG - WATCH_HALF - 0.0035) / 0.0032) ** 2))
        off += 0.0009 * np.exp(-(((z - WATCH_ALONG + WATCH_HALF + 0.0028) / 0.0026) ** 2))
    return off


def build():
    theta = SEAM_THETA + np.linspace(0, 2 * np.pi, COLS + 1)
    # Hem: inside lip → round the edge → outside.
    lip = [(HEM + 0.012, 0.0052), (HEM + 0.006, 0.0054), (HEM + 0.0016, 0.0060),
           (HEM + 0.0002, 0.0072), (HEM + 0.0008, 0.0084), (HEM + 0.0022, CUFF_OFF)]
    step = 0.0015 if POLICE else 0.0022  # finer through the watch cinch
    rows = np.concatenate([np.arange(HEM + 0.003, 0.18, step), np.arange(0.18, END, 0.0065), [END]])
    P = [F.surface_point(np.full_like(theta, a), theta, o) for a, o in lip]
    P += [F.surface_point(np.full_like(theta, a), theta, offset(np.full_like(theta, a), theta)) for a in rows]
    P = np.stack(P)
    ring = np.linalg.norm(np.diff(P, axis=0), axis=-1).mean(1)
    v = np.concatenate([[0], np.cumsum(ring)])
    U = np.stack(np.broadcast_arrays(np.linspace(0, 1, COLS + 1)[None, :], (v / v[-1])[:, None]), -1)
    mesh = MeshData().grid(P, U, flip=True)
    return mesh, float(v[-1]), len(lip)


def canonical_arm(name, a0=-0.01, a1=0.46):
    th = np.linspace(-np.pi, np.pi, 97)
    rows = np.linspace(a0, a1, 100)
    P = np.stack([F.surface_point(np.full_like(th, max(a, 0.0)), th) for a in rows])
    P[..., 1] = rows[:, None]
    U = np.stack(np.broadcast_arrays(np.linspace(0, 1, 97)[None], np.linspace(0, 1, 100)[:, None]), -1)
    return MeshData().grid(P, U, flip=True).to_object(name)


def hash_noise(shape, scale, seed):
    r = np.random.default_rng(seed)
    gh, gw = max(1, int(round(shape[0] / scale))), max(1, int(round(shape[1] / scale)))
    g = r.random((gh, gw))
    y = np.linspace(0, gh, shape[0], endpoint=False)
    x = np.linspace(0, gw, shape[1], endpoint=False)
    y0, x0 = np.floor(y).astype(int), np.floor(x).astype(int)
    fy, fx = y - y0, x - x0
    fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
    a = g[y0 % gh][:, x0 % gw]
    b = g[y0 % gh][:, (x0 + 1) % gw]
    c = g[(y0 + 1) % gh][:, x0 % gw]
    d = g[(y0 + 1) % gh][:, (x0 + 1) % gw]
    return (a * (1 - fx) + b * fx) * (1 - fy)[:, None] + (c * (1 - fx) + d * fx) * fy[:, None]


def fbm(shape, scale, seed, octaves=4):
    t, amp, norm = 0, 1, 0
    for o in range(octaves):
        t = t + amp * hash_noise(shape, scale / 2 ** o, seed + o)
        norm += amp
        amp *= 0.5
    return t / norm


def noise3(P, scale, seed, octaves=3, stretch=(1.0, 1.0, 1.0)):
    """Smooth 3D value-noise fBm at points P (..., 3) metres; seamless round the arm when P
    is the fabric's position on a cylinder."""
    r = np.random.default_rng(seed)
    n = 48
    lattice = r.random((n, n, n))
    total, amp, norm = 0.0, 1.0, 0.0
    for o in range(octaves):
        q = P / (scale / 2 ** o) / np.asarray(stretch)
        q = q + 17.3 * (o + 1)
        i = np.floor(q).astype(int)
        f = q - i
        f = f * f * (3 - 2 * f)
        acc = 0.0
        for dx in (0, 1):
            for dy in (0, 1):
                for dz in (0, 1):
                    w = (f[..., 0] if dx else 1 - f[..., 0]) * (f[..., 1] if dy else 1 - f[..., 1]) * (f[..., 2] if dz else 1 - f[..., 2])
                    acc = acc + w * lattice[(i[..., 0] + dx) % n, (i[..., 1] + dy) % n, (i[..., 2] + dz) % n]
        total = total + amp * acc
        norm += amp
        amp *= 0.5
    return total / norm


def image(rgb, name, srgb):
    h, w = rgb.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=False)
    img.colorspace_settings.name = "sRGB" if srgb else "Non-Color"
    if srgb:
        rgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.power(np.clip(rgb, 0.0031308, None), 1 / 2.4) - 0.055)
    img.pixels.foreach_set(np.concatenate([np.clip(rgb, 0, 1), np.ones((h, w, 1))], -1).astype(np.float32).ravel())
    img.filepath_raw = os.path.join(outdir, name + ".png")
    img.file_format = "PNG"
    img.save()
    img.pack()
    return img


def bake(obj, size):
    """Position and AO bakes (Cycles), the arm as occluder."""
    arm = canonical_arm("bake-arm")
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    world = bpy.data.worlds.new("bake")
    sc.world = world
    world.light_settings.distance = 0.035
    out = {}
    for kind in ("position", "ao"):
        img = bpy.data.images.new(f"bake-{kind}", size, size, alpha=True, float_buffer=True)
        img.colorspace_settings.name = "Non-Color"
        img.pixels.foreach_set(np.tile(np.array([-1e4, -1e4, -1e4, 0], np.float32), size * size))
        m = bpy.data.materials.new(f"bake-{kind}")
        m.use_nodes = True
        nt = m.node_tree
        nt.nodes.clear()
        o = nt.nodes.new("ShaderNodeOutputMaterial")
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = img
        nt.nodes.active = tex
        if kind == "position":
            geo = nt.nodes.new("ShaderNodeNewGeometry")
            em = nt.nodes.new("ShaderNodeEmission")
            nt.links.new(geo.outputs["Position"], em.inputs[0])
            nt.links.new(em.outputs[0], o.inputs["Surface"])
        else:
            d = nt.nodes.new("ShaderNodeBsdfDiffuse")
            nt.links.new(d.outputs[0], o.inputs["Surface"])
        obj.data.materials.clear()
        obj.data.materials.append(m)
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        sc.cycles.samples = 1 if kind == "position" else 96
        bpy.ops.object.bake(type="EMIT" if kind == "position" else "AO", margin=6, use_clear=False)
        out[kind] = np.array(img.pixels[:], np.float32).reshape(size, size, 4)
    bpy.data.objects.remove(arm)
    return out


def textures(obj, size, v_scale):
    b = bake(obj, size)
    pos = b["position"][..., :3]
    valid = pos[..., 0] > -1e3
    ao = np.where(valid, np.clip(b["ao"][..., 0], 0, 1), 1)
    th = np.arctan2(pos[..., 2], pos[..., 0])
    along = pos[..., 1]
    r_mean = 0.05
    # Fabric coordinates: metres round the arm from the underarm seam, and along the arm.
    x = wrap(th - SEAM_THETA) * r_mean
    x = np.where(x < 0, x + 2 * np.pi * r_mean, x)
    y = along
    circ = 2 * np.pi * r_mean
    # Ripstop: plain weave with heavier reinforcement threads every 4 mm, and a fine twill.
    grid = 0.004
    gx = np.abs(((x / grid) % 1) - 0.5) * grid
    gy = np.abs(((y / grid) % 1) - 0.5) * grid
    rip = np.maximum(np.exp(-((gx - grid / 2) / 0.0002) ** 2), np.exp(-((gy - grid / 2) / 0.0002) ** 2))
    weave = 0.5 * np.sin(2 * np.pi * x / 0.00055) * np.sin(2 * np.pi * y / 0.00055)
    height = 0.00009 * rip + 0.00004 * weave
    if CAMO:
        # Cotton windproof smock fabric: dense plain weave with slubs, no ripstop grid.
        rip = rip * 0
        slub = fbm((size, size), size / 160, 41, 2)
        weave = 0.5 * np.sin(2 * np.pi * x / 0.00045) * np.sin(2 * np.pi * y / 0.00045)
        height = 0.000035 * weave + 0.00004 * (slub - 0.5)
    if POLICE:
        # Cotton twill (BDU shirt): diagonal ribs, no ripstop grid.
        rip = rip * 0
        weave = np.sin(2 * np.pi * (x + y) / 0.0009)
        height = 0.00006 * weave + 0.00002 * np.sin(2 * np.pi * (x - y) / 0.0004)
    # Secondary wrinkles: short pinch creases running round the arm, densest near the cuff.
    w1 = fbm((size, size), size / 64, 31, 3)
    w2 = fbm((size, size), size / 24, 37, 2)
    crease = np.abs(np.sin((y * 520 + 9 * w2 + 2.5 * np.sin(x * 60)) )) ** 6
    wrinkle_amt = np.clip(1.15 - along * 5, 0.15, 1) * (w1 > 0.45)
    height -= 0.00022 * crease * wrinkle_amt
    # Underarm seam: flat-felled, raised, two stitch rows.
    sx = np.minimum(x, circ - x)
    height += 0.00032 * np.exp(-((sx - 0.004) / 0.0013) ** 2)
    stitch = []
    stitch.append((np.abs(sx - 0.0018), y))
    stitch.append((np.abs(sx - 0.0068), y))
    # Articulation panel seam: a curve across the back of the forearm.
    dorsal = wrap(th - np.pi / 2)
    panel_y = 0.21 + 0.035 * np.cos(dorsal * 1.4)
    panel = np.abs(y - panel_y) * (np.abs(dorsal) < 1.3)
    if not POLICE:
        height -= 0.00022 * np.exp(-(panel / 0.0006) ** 2) * (np.abs(dorsal) < 1.3)
        stitch.append((np.where(np.abs(dorsal) < 1.3, np.abs(panel - 0.0016), 1), x))
    # Cuff: topstitching along the band; hem edge binding.
    z = along - HEM
    stitch.append((np.abs(z - 0.0035), x))
    stitch.append((np.abs(z - (CUFF - HEM - 0.004)), x))
    # Strap: border stitching and hook-and-loop field.
    s_ang = wrap(th - STRAP_THETA)
    in_strap = (np.abs(s_ang) < STRAP_HALF * 0.92) & (along > HEM + 0.009) & (along < CUFF - 0.006)
    in_strap = in_strap & (not POLICE)
    hook = in_strap & (not CAMO)  # hook-and-loop field (the old white jacket only)
    s_edge = np.minimum(np.abs(np.abs(s_ang) - STRAP_HALF * 0.78) * r_mean,
                        np.minimum(np.abs(along - HEM - 0.011), np.abs(along - CUFF + 0.008)))
    stitch.append((np.where(in_strap, s_edge, 1), x + y))
    if POLICE:
        # Cuff placket: the overlap edge runs from the hem to the cuff top, stitched, beside the
        # button; strap pinch creases fan out from both watch-strap edges.
        b_ang = wrap(th - BUTTON_THETA - 0.21)
        placket = np.abs(b_ang) * r_mean
        in_cuff = (along > HEM) & (along < CUFF - 0.002)
        height -= np.where(in_cuff, 0.00035 * np.exp(-(placket / 0.0005) ** 2), 0)
        stitch.append((np.where(in_cuff, np.abs(placket - 0.0022), 1), y))
        for edge, sign in ((WATCH_ALONG + WATCH_HALF, 1), (WATCH_ALONG - WATCH_HALF, -1)):
            d = (along - edge) * sign
            near = (d > 0) & (d < 0.012)
            fan = np.abs(np.sin(th * 9 + 3 * w2)) ** 8 * np.exp(-d / 0.004)
            height -= np.where(near, 0.00025 * fan, 0)
    # Retro-reflective band: glass-bead tape (micro-prism dots), silver-grey, edge-sealed.
    # Retired with the plain white jacket: neither character wears a reflective band.
    in_band = (along > BAND_ALONG[0] + 0.001) & (along < BAND_ALONG[1] - 0.001) & False
    bead = (np.sin(2 * np.pi * x / 0.0008) * np.sin(2 * np.pi * y / 0.0008) > 0.2).astype(float)
    height += np.where(in_band, 0.00003 * bead + 0.00012, 0)
    band_edge = np.minimum(np.abs(along - BAND_ALONG[0] - 0.0015), np.abs(along - BAND_ALONG[1] + 0.0015))
    if in_band.any():
        stitch.append((np.where(np.abs(along - (BAND_ALONG[0] + BAND_ALONG[1]) / 2) < 0.02, band_edge, 1), x))
    thread = np.zeros_like(x)
    for dist, phase in stitch:
        lane = np.exp(-(dist / 0.00026) ** 2)
        dash_pos = (phase % 0.0028) / 0.0019
        dash = np.clip(np.sin(np.pi * np.clip(dash_pos, 0, 1)), 0, 1) ** 0.5 * (dash_pos < 1)
        thread = np.maximum(thread, lane * dash)
    height += 0.0002 * thread
    loop = fbm((size, size), 3, 21, 2)
    height += np.where(hook, 0.00006 * (loop - 0.5), 0)

    # Colour: white duty fabric, slightly cool; folds collect grey grime, raised areas stay clean.
    var = fbm((size, size), size / 8, 5)
    col = np.array([0.70, 0.71, 0.73])[None, None] * (0.95 + 0.08 * var)[..., None]
    col *= (1 - 0.035 * rip)[..., None]
    grime = np.clip((fbm((size, size), size / 12, 9) - 0.42) * 2.2, 0, 1) * (1 - ao) ** 0.8
    col = col * (1 - 0.45 * grime[..., None]) + np.array([0.42, 0.40, 0.37]) * 0.45 * grime[..., None]
    wear = np.clip((fbm((size, size), size / 40, 13) - 0.62) * 3, 0, 1) * (along < 0.1)
    col = col * (1 - 0.18 * wear[..., None]) + np.array([0.55, 0.54, 0.52]) * 0.18 * wear[..., None]
    col = np.where(in_strap[..., None], col * (0.86 + 0.1 * loop[..., None]), col)
    band_col = np.array([0.50, 0.51, 0.53]) * (0.9 + 0.12 * bead)[..., None]
    col = np.where(in_band[..., None], band_col, col)
    col = col * (1 - thread[..., None]) + np.array([0.70, 0.71, 0.72]) * thread[..., None]
    col *= (1 - 0.06 * crease * wrinkle_amt)[..., None]
    col *= (0.5 + 0.5 * ao)[..., None]
    if POLICE:
        # Steel-blue duty shirt (the character's sleeve, sRGB ~84,112,128), slightly washed:
        # fold peaks and the cuff edge fade lighter, creases and grime go navy-grey, light
        # blue-grey topstitching like the character's seams.
        blue = np.array([0.090, 0.165, 0.218])
        col = blue[None, None] * (0.93 + 0.12 * var)[..., None]
        col *= (1 + 0.05 * weave)[..., None]
        fade = np.clip((fbm((size, size), size / 30, 17) - 0.5) * 2.5, 0, 1) * (ao > 0.9)
        col = col * (1 - 0.25 * fade[..., None]) + np.array([0.16, 0.25, 0.31]) * 0.25 * fade[..., None]
        edge_wear = np.exp(-((along - HEM) / 0.004) ** 2) * (along > HEM - 0.002)
        col = col * (1 - 0.35 * edge_wear[..., None]) + np.array([0.20, 0.29, 0.34]) * 0.35 * edge_wear[..., None]
        col = np.where(((along > HEM) & (along < CUFF))[..., None], col * 0.94, col)
        col = col * (1 - 0.5 * grime[..., None]) + np.array([0.035, 0.055, 0.07]) * 0.5 * grime[..., None]
        col = col * (1 - 0.8 * thread[..., None]) + np.array([0.33, 0.42, 0.47]) * 0.8 * thread[..., None]
        col *= (1 - 0.08 * crease * wrinkle_amt)[..., None]
        col *= (0.45 + 0.55 * ao)[..., None]
    if CAMO:
        # Snow-camo print matched to the character: blotch coverage from its texture (k-means:
        # ~38% off-white ground, ~35% light-grey, ~27% dark-grey; blotches 2-6 cm), tones set so
        # the sleeve renders at the character's brightness under the same lights (sRGB ~188
        # ground, ~149 light-grey, ~93 dark-grey). Soft printed edges, slight misregistration,
        # cool off-white cotton; grime in the folds, fading on the cuff edge.
        P3 = np.stack([np.cos(th) * r_mean, along, np.sin(th) * r_mean], -1)
        P3 = np.where(valid[..., None], P3, 0)
        light_n = noise3(P3, 0.034, 51, 3, (1.0, 1.6, 1.0))
        dark_n = noise3(P3 + 0.004, 0.026, 77, 3, (1.0, 1.5, 1.0))
        mottle = fbm((size, size), size / 300, 61, 2)
        edge = 0.012 + 0.01 * mottle
        t_light = np.quantile(light_n[valid], 1 - 0.62)  # light-grey layer covers ~62%
        light_m = smooth(light_n, t_light - edge, t_light + edge)
        gate = smooth(light_n, t_light - 0.08, t_light + 0.02)  # dark blotches sit in the grey
        t_dark = np.quantile(dark_n[valid & (gate > 0.5)], 1 - 0.27 / 0.62)
        dark_m = smooth(dark_n, t_dark - edge, t_dark + edge) * gate
        print("REPORT camo coverage light", round(float(light_m[valid].mean()), 3),
              "dark", round(float(dark_m[valid].mean()), 3))
        base_c = np.array([0.50, 0.505, 0.52])
        light_c = np.array([0.295, 0.298, 0.31])
        dark_c = np.array([0.108, 0.108, 0.112])
        col = base_c[None, None] * (1 - light_m[..., None]) + light_c[None, None] * light_m[..., None]
        col = col * (1 - dark_m[..., None]) + dark_c[None, None] * dark_m[..., None]
        col *= (0.95 + 0.07 * var + 0.05 * (mottle - 0.5))[..., None]
        col *= (1 + 0.03 * weave)[..., None]
        col = col * (1 - 0.45 * grime[..., None]) + np.array([0.20, 0.19, 0.17]) * 0.45 * grime[..., None]
        edge_wear = np.exp(-((along - HEM) / 0.004) ** 2) * (along > HEM - 0.002)
        col = col * (1 - 0.3 * edge_wear[..., None]) + np.array([0.42, 0.41, 0.39]) * 0.3 * edge_wear[..., None]
        col = col * (1 - 0.75 * thread[..., None]) + np.array([0.50, 0.50, 0.50]) * 0.75 * thread[..., None]
        col *= (1 - 0.07 * crease * wrinkle_amt)[..., None]
        col *= (0.5 + 0.5 * ao)[..., None]
    rough = np.clip(0.82 + 0.06 * (var - 0.5) + 0.06 * hook - 0.08 * thread, 0, 1)
    if CAMO:
        rough = np.clip(0.84 + 0.05 * (var - 0.5) - 0.08 * thread - 0.04 * dark_m, 0, 1)
    if POLICE:
        rough = np.clip(0.86 + 0.05 * (var - 0.5) - 0.1 * thread, 0, 1)
    rough = np.where(in_band, 0.38 + 0.08 * bead, rough)
    metal = np.where(in_band, 0.35, 0.0)

    tu = circ / size
    tv = v_scale / size
    height = height * 1.6  # read at viewmodel distance under the arena's bright key light
    du = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) / (2 * tu)
    dv = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) / (2 * tv)
    n = np.stack([-du, -dv, np.ones_like(du)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    normal = n * 0.5 + 0.5
    orm = np.stack([ao ** 0.75, rough, metal], -1)
    return (image(col, f"{STEM}_basecolor", True), image(normal, f"{STEM}_normal", False),
            image(orm, f"{STEM}_orm", False))


def material(base, normal, orm):
    m = bpy.data.materials.new(STEM)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = base
    nt.links.new(t.outputs[0], b.inputs["Base Color"])
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = normal
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(t.outputs[0], nm.inputs["Color"])
    nt.links.new(nm.outputs[0], b.inputs["Normal"])
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = orm
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(t.outputs[0], sep.inputs[0])
    nt.links.new(sep.outputs[1], b.inputs["Roughness"])
    nt.links.new(sep.outputs[2], b.inputs["Metallic"])
    return m


def button():
    """Shirt button on the cuff placket (dark blue-grey resin, dished face), its own small mesh."""
    from mesh_util import lathe

    MM = 0.001
    # Profile (radius, height) in mm: rim, dished centre.
    prof = [(0.0, 1.0), (1.6, 1.05), (3.2, 1.35), (4.6, 1.75), (5.4, 1.55), (5.6, 0.9), (5.3, 0.0), (0.0, 0.0)]
    P, th = lathe(prof, 32)
    n = np.array([math.cos(BUTTON_THETA), 0.0, math.sin(BUTTON_THETA)])
    up = np.array([0.0, 1.0, 0.0])
    side = np.cross(up, n)
    base = F.surface_point(np.array([BUTTON_ALONG]), np.array([BUTTON_THETA]),
                           offset(np.array([BUTTON_ALONG]), np.array([BUTTON_THETA])))[0]
    local = P * MM
    # Seated into the cloth (the shank and thread hold it down; no gap under the rim).
    world = base + local[..., 0:1] * side + local[..., 1:2] * up + local[..., 2:3] * n - 0.0011 * n
    m = MeshData().grid(world, np.full(world.shape[:2] + (2,), 0.5))
    obj = m.to_object(NAME + "Button")
    mat = bpy.data.materials.new(f"{STEM}_button")
    mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]
    # Police: blue-grey resin. Terrorist: the smock's dark brown-grey buttons.
    b.inputs["Base Color"].default_value = (0.055, 0.07, 0.08, 1) if POLICE else (0.035, 0.032, 0.03, 1)
    b.inputs["Roughness"].default_value = 0.38
    obj.data.materials.append(mat)
    obj.data.shade_smooth()
    return obj


mesh, v_scale, lip_rows = build()
sleeve = mesh.to_object(NAME)
sleeve.data.shade_smooth()
base, normal, orm = textures(sleeve, SIZE, v_scale)
sleeve.data.materials.clear()
sleeve.data.materials.append(material(base, normal, orm))
btn = button()
btn.parent = sleeve
print("REPORT", NAME, len(sleeve.data.polygons), "faces")

bpy.ops.object.select_all(action="DESELECT")
sleeve.select_set(True)
for child in sleeve.children:
    child.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(outdir, f"{STEM.replace('_', '-')}.glb"), export_format="GLB",
                          use_selection=True, export_apply=True, export_texcoords=True,
                          export_normals=True, export_tangents=True, export_materials="EXPORT",
                          export_image_format="WEBP", export_yup=True, export_animations=False,
                          export_skins=False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(outdir, f"{STEM}.blend"))

if PREVIEW:
    import mathutils

    arm = canonical_arm("preview-arm", -0.01, 0.42)
    if WATCH_GLB:
        bpy.ops.import_scene.gltf(filepath=WATCH_GLB)
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 48
    sc.render.resolution_x, sc.render.resolution_y = 1200, 800
    w = bpy.data.worlds.new("w")
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.42, 0.44, 0.47, 1)
    for rot, e in (((0.7, 0.2, 0.6), 3.2), ((-1.0, 0.3, 2.8), 1.0)):
        s = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
        s.data.energy = e
        s.rotation_euler = rot
        sc.collection.objects.link(s)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    sc.camera = cam

    def shot(name, loc, target, lens=50):
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (mathutils.Vector(target) - mathutils.Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(outdir, f"preview_{name}.png")
        bpy.ops.render.render(write_still=True)

    shot("sleeve", (0.16, 0.12, 0.16), (0.0, 0.14, 0.0), 40)
    shot("cuff", (0.07, -0.05, 0.1), (0.0, 0.03, 0.01), 55)
    if POLICE:
        shot("watch", (0.0, 0.06, 0.17), (0.0, 0.06, 0.03), 55)
        shot("button", (-0.09, 0.0, 0.1), (-0.02, 0.025, 0.03), 60)
    else:
        shot("tab", (0.1, 0.0, 0.1), (0.03, 0.03, 0.04), 60)
