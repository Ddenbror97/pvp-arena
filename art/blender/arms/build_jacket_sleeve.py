"""
White duty-jacket sleeve for the Terrorist first-person arms (AK-47) (Blender, headless).

  python build_jacket_sleeve.py -- <outdir> [--size 2048] [--preview]

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
    cuff = cuff + 0.0026 * strap_m
    # Sleeve body: compression folds bunching above the cuff...
    body = 0.0095 + 0.0045 * smooth(z, 0.08, 0.36)
    fold = np.zeros(np.broadcast(z, theta).shape)
    rings = [(0.050, 0.0038, 0.0075), (0.064, 0.0046, 0.0070), (0.079, 0.0034, 0.0080),
             (0.095, 0.0040, 0.0085), (0.113, 0.0028, 0.0095), (0.134, 0.0022, 0.0110),
             (0.158, 0.0016, 0.0125)]
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
    sleeve = body + (fold + drape) * (1 - 0.6 * tape) + sag + 0.0004 * tape
    # Blend cuff → sleeve with a small crease where the sleeve overhangs the band.
    k = smooth(z, CUFF - 0.002, CUFF + 0.006)
    off = cuff * (1 - k) + sleeve * k
    off -= 0.0012 * np.exp(-(((z - CUFF - 0.002) / 0.0018) ** 2))
    return off


def build():
    theta = SEAM_THETA + np.linspace(0, 2 * np.pi, COLS + 1)
    # Hem: inside lip → round the edge → outside.
    lip = [(HEM + 0.012, 0.0052), (HEM + 0.006, 0.0054), (HEM + 0.0016, 0.0060),
           (HEM + 0.0002, 0.0072), (HEM + 0.0008, 0.0084), (HEM + 0.0022, CUFF_OFF)]
    rows = np.concatenate([np.arange(HEM + 0.003, 0.18, 0.0022), np.arange(0.18, END, 0.0065), [END]])
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
    height -= 0.00022 * np.exp(-(panel / 0.0006) ** 2) * (np.abs(dorsal) < 1.3)
    stitch.append((np.where(np.abs(dorsal) < 1.3, np.abs(panel - 0.0016), 1), x))
    # Cuff: topstitching along the band; hem edge binding.
    z = along - HEM
    stitch.append((np.abs(z - 0.0035), x))
    stitch.append((np.abs(z - (CUFF - HEM - 0.004)), x))
    # Strap: border stitching and hook-and-loop field.
    s_ang = wrap(th - STRAP_THETA)
    in_strap = (np.abs(s_ang) < STRAP_HALF * 0.92) & (along > HEM + 0.009) & (along < CUFF - 0.006)
    s_edge = np.minimum(np.abs(np.abs(s_ang) - STRAP_HALF * 0.78) * r_mean,
                        np.minimum(np.abs(along - HEM - 0.011), np.abs(along - CUFF + 0.008)))
    stitch.append((np.where(in_strap, s_edge, 1), x + y))
    # Retro-reflective band: glass-bead tape (micro-prism dots), silver-grey, edge-sealed.
    in_band = (along > BAND_ALONG[0] + 0.001) & (along < BAND_ALONG[1] - 0.001)
    bead = (np.sin(2 * np.pi * x / 0.0008) * np.sin(2 * np.pi * y / 0.0008) > 0.2).astype(float)
    height += np.where(in_band, 0.00003 * bead + 0.00012, 0)
    band_edge = np.minimum(np.abs(along - BAND_ALONG[0] - 0.0015), np.abs(along - BAND_ALONG[1] + 0.0015))
    stitch.append((np.where(np.abs(along - (BAND_ALONG[0] + BAND_ALONG[1]) / 2) < 0.02, band_edge, 1), x))
    thread = np.zeros_like(x)
    for dist, phase in stitch:
        lane = np.exp(-(dist / 0.00026) ** 2)
        dash_pos = (phase % 0.0028) / 0.0019
        dash = np.clip(np.sin(np.pi * np.clip(dash_pos, 0, 1)), 0, 1) ** 0.5 * (dash_pos < 1)
        thread = np.maximum(thread, lane * dash)
    height += 0.0002 * thread
    loop = fbm((size, size), 3, 21, 2)
    height += np.where(in_strap, 0.00006 * (loop - 0.5), 0)

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
    rough = np.clip(0.82 + 0.06 * (var - 0.5) + 0.06 * in_strap - 0.08 * thread, 0, 1)
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
    return (image(col, "jacket_sleeve_basecolor", True), image(normal, "jacket_sleeve_normal", False),
            image(orm, "jacket_sleeve_orm", False))


def material(base, normal, orm):
    m = bpy.data.materials.new("jacket_sleeve")
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


mesh, v_scale, lip_rows = build()
sleeve = mesh.to_object("JacketSleeve")
sleeve.data.shade_smooth()
base, normal, orm = textures(sleeve, SIZE, v_scale)
sleeve.data.materials.clear()
sleeve.data.materials.append(material(base, normal, orm))
print("REPORT jacket sleeve", len(sleeve.data.polygons), "faces")

bpy.ops.object.select_all(action="DESELECT")
sleeve.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(outdir, "jacket-sleeve.glb"), export_format="GLB",
                          use_selection=True, export_apply=True, export_texcoords=True,
                          export_normals=True, export_tangents=True, export_materials="EXPORT",
                          export_image_format="WEBP", export_yup=True, export_animations=False,
                          export_skins=False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(outdir, "jacket_sleeve.blend"))

if PREVIEW:
    import mathutils

    arm = canonical_arm("preview-arm", -0.01, 0.42)
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
