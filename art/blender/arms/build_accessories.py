"""
Sleeve and wristwatch for the first-person arms (Blender, headless).

  python build_accessories.py -- <outdir> [--size 1024] [--preview]

Both are authored on the runtime forearm (forearm.py) in the canonical arm frame
(+X thumb, +Y toward the elbow, +Z back of the arm) and exported to accessories.glb:

  ArmSleeve  olive ripstop combat-shirt sleeve pushed up the forearm: rolled hem band, bunched
             compression folds, looser drape toward the elbow; hem lip turns inside so the
             fabric has thickness. Unique UVs with baked AO, ripstop, seams and dust.
  ArmWatch   40 mm black field watch for the left wrist: case, knurled 60-click bezel with a
             printed insert, domed crystal, Arabic field dial (1–12 + 13–24, minute track), hands
             at 10:09, crown, four lugs and spring bars, nylon NATO strap through the bars and
             under the case, buckle and keepers on the thumb side. Real geometry, PBR materials.

The left arm's posed frame is mirrored relative to the canonical frame, so the watch is built
in a left-arm frame (x toward the little finger) and mirrored on export; the runtime mirror then
restores it, keeping the dial readable and the crown toward the hand.
"""
import bpy, sys, os, math
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import forearm as F
from mesh_util import MeshData, lathe, catmull, sweep, arclength

argv = sys.argv[sys.argv.index("--") + 1:]
outdir = argv[0]
SIZE = int(argv[argv.index("--size") + 1]) if "--size" in argv else 1024
PREVIEW = "--preview" in argv
os.makedirs(outdir, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf"
rng = np.random.default_rng(7)


def material(name, color=(0.05, 0.05, 0.05), metallic=0.0, rough=0.5, alpha=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if alpha is not None:
        b.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
        try:
            m.surface_render_method = "BLENDED"
        except AttributeError:
            pass
    return m


def textured(m, base=None, normal=None, orm=None):
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    if base is not None:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = base
        nt.links.new(t.outputs[0], b.inputs["Base Color"])
    if normal is not None:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = normal
        t.image.colorspace_settings.name = "Non-Color"
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(t.outputs[0], nm.inputs["Color"])
        nt.links.new(nm.outputs[0], b.inputs["Normal"])
    if orm is not None:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = orm
        t.image.colorspace_settings.name = "Non-Color"
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(t.outputs[0], sep.inputs[0])
        nt.links.new(sep.outputs[1], b.inputs["Roughness"])
        nt.links.new(sep.outputs[2], b.inputs["Metallic"])
        # glTF exporter picks occlusion up from a glTF Material Output / Settings group if present;
        # occlusion is also baked into the base colour, so the exporter is not relied on for it.
    return m


def image_from(rgb, name, srgb):
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


def height_to_normal(height, texel_u, texel_v, strength=1.0):
    du = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) / (2 * texel_u)
    dv = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) / (2 * texel_v)
    n = np.stack([-du * strength, -dv * strength, np.ones_like(du)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5


def hash_noise(shape, scale, seed):
    """Tileable smooth value noise on a pixel grid (scale in pixels)."""
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


def fbm2(shape, scale, seed, octaves=4):
    t, amp, norm = 0, 1, 0
    for o in range(octaves):
        t = t + amp * hash_noise(shape, scale / 2 ** o, seed + o)
        norm += amp
        amp *= 0.5
    return t / norm


# =========================================================================================
# Sleeve
# =========================================================================================
SLEEVE_START = 0.150  # hem edge, metres from the wrist joint
SLEEVE_END = 0.43
BAND = 0.030  # rolled hem band width
COLS = 64
SEAM_THETA = -math.pi / 2 - 0.45  # underarm seam, palm / little-finger side


def sleeve_offset(along, theta):
    """Fabric height above the skin (m) at `along` (>= SLEEVE_START) and arm angle theta."""
    z = along - SLEEVE_START
    off = np.full(np.broadcast(along, theta).shape, 0.0, float)
    # Rolled band: three layers of fabric, slightly lumpy.
    band = 0.0086 + 0.0010 * np.sin(3 * theta + 1.0) + 0.0006 * np.sin(7 * theta + 2.0)
    band_top = BAND + 0.002 * np.sin(theta + 0.6)
    in_band = F.smoothstep(z, -0.001, 0.003) * (1 - F.smoothstep(z, band_top - 0.002, band_top + 0.002))
    # Bunched sleeve above the band: compression rings, tilted, broken and of uneven height.
    bunched = np.full_like(off, 0.0062)
    rings = [(0.041, 0.0050, 0.0068), (0.055, 0.0042, 0.0062), (0.068, 0.0055, 0.0072), (0.083, 0.0040, 0.0064),
             (0.097, 0.0046, 0.0070), (0.112, 0.0030, 0.0075), (0.128, 0.0024, 0.0085)]
    r = np.random.default_rng(3)
    fold = np.zeros_like(off)
    for c, amp, w in rings:
        p1, p2, p3 = r.random(3) * 2 * np.pi
        k = r.integers(1, 3)
        centre = c + 0.0045 * np.sin(theta + p1) + 0.0018 * np.sin(2 * theta + p2)
        x = (z - centre) / w
        bump = np.clip(1 - x * x, 0, None) ** 1.6
        modulate = np.clip(0.55 + 0.6 * np.sin(k * theta + p3) + 0.25 * np.sin(5 * theta + p1), 0.05, 1.2)
        fold = np.maximum(fold, amp * bump * modulate)
    bunched = bunched + fold
    # Drape toward the elbow: looser, with long diagonal folds; the underside sags.
    drape = 0.0072 + 0.0048 * F.smoothstep(z, 0.12, 0.27)
    for k, (t0, amp) in enumerate(((0.4, 0.0022), (2.3, 0.0018), (4.0, 0.0015))):
        drape = drape + amp * np.exp(-(((np.angle(np.exp(1j * (theta - t0 - 9 * (z - 0.14))))) / 0.28) ** 2)) * F.smoothstep(z, 0.13, 0.17)
    sag = 0.0028 * np.maximum(0, -np.sin(theta)) ** 2
    upper = np.where(z < 0.135, bunched, bunched * (1 - F.smoothstep(z, 0.135, 0.16)) + drape * F.smoothstep(z, 0.135, 0.16))
    off = in_band * band + (1 - in_band) * np.where(z < BAND + 0.006, np.minimum(upper, 0.0066), upper)
    # Crease under the band's top edge.
    off -= 0.0014 * np.exp(-(((z - band_top - 0.0028) / 0.0018) ** 2))
    return off + sag


def build_sleeve():
    theta = SEAM_THETA + np.linspace(0, 2 * np.pi, COLS + 1)
    # Hem lip profile (inside the sleeve → over the edge → outside), then the sleeve rows.
    lip = [(SLEEVE_START + 0.010, 0.0038), (SLEEVE_START + 0.004, 0.0040), (SLEEVE_START + 0.0012, 0.0046),
           (SLEEVE_START + 0.0001, 0.0058), (SLEEVE_START + 0.0006, 0.0072), (SLEEVE_START + 0.0018, 0.0081)]
    rows_along = np.concatenate([np.arange(SLEEVE_START + 0.003, SLEEVE_START + 0.165, 0.0017),
                                 np.arange(SLEEVE_START + 0.165, SLEEVE_END, 0.008), [SLEEVE_END]])
    P_rows = []
    for along, off in lip:
        P_rows.append(F.surface_point(np.full_like(theta, along), theta, off))
    for along in rows_along:
        off = sleeve_offset(np.full_like(theta, along), theta)
        P_rows.append(F.surface_point(np.full_like(theta, along), theta, off))
    P = np.stack(P_rows)
    # Unique UVs: u round the arm from the underarm seam, v by profile arc length.
    centre_line = P.mean(1)
    ring_len = np.linalg.norm(np.diff(P, axis=0), axis=-1).mean(1)
    v = np.concatenate([[0], np.cumsum(ring_len)])
    v_scale = v[-1]
    U = np.stack(np.broadcast_arrays(np.linspace(0, 1, COLS + 1)[None, :], (v / v_scale)[:, None]), -1)
    mesh = MeshData().grid(P, U, flip=True)
    return mesh, P, theta, v_scale


def sleeve_textures(obj, size):
    """Bake AO / position, then ripstop, seams, stitching, dust in numpy."""
    arm = canonical_arm("bake-arm")
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    world = bpy.data.worlds.new("bake")
    sc.world = world
    world.light_settings.distance = 0.03
    imgs = {}
    for kind in ("position", "ao"):
        img = bpy.data.images.new(f"sleeve-{kind}", size, size, alpha=True, float_buffer=True)
        img.colorspace_settings.name = "Non-Color"
        img.pixels.foreach_set(np.tile(np.array([-1e4, -1e4, -1e4, 0], np.float32), size * size))
        m = bpy.data.materials.new(f"bake-{kind}")
        m.use_nodes = True
        nt = m.node_tree
        nt.nodes.clear()
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = img
        nt.nodes.active = tex
        if kind == "position":
            geo = nt.nodes.new("ShaderNodeNewGeometry")
            em = nt.nodes.new("ShaderNodeEmission")
            nt.links.new(geo.outputs["Position"], em.inputs[0])
            nt.links.new(em.outputs[0], out.inputs["Surface"])
        else:
            d = nt.nodes.new("ShaderNodeBsdfDiffuse")
            nt.links.new(d.outputs[0], out.inputs["Surface"])
        obj.data.materials.clear()
        obj.data.materials.append(m)
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        sc.cycles.samples = 1 if kind == "position" else 64
        bpy.ops.object.bake(type="EMIT" if kind == "position" else "AO", margin=4, use_clear=False)
        imgs[kind] = np.array(img.pixels[:], np.float32).reshape(size, size, 4)
    bpy.data.objects.remove(arm)
    pos = imgs["position"][..., :3]
    valid = pos[..., 0] > -1e3
    ao = np.clip(imgs["ao"][..., 0], 0, 1)
    ao = np.where(valid, ao, 1)
    th = np.arctan2(pos[..., 2], pos[..., 0])
    along = pos[..., 1]
    r_mean = 0.045
    x = np.angle(np.exp(1j * (th - SEAM_THETA))) * r_mean  # metres round the arm from the seam
    x = np.where(x < 0, x + 2 * np.pi * r_mean, x)
    y = along
    # Ripstop: plain weave with heavier reinforcement threads every 5 mm both ways.
    grid = 0.005
    gx = np.abs(((x / grid) % 1) - 0.5) * grid
    gy = np.abs(((y / grid) % 1) - 0.5) * grid
    rip = np.maximum(np.exp(-((gx - grid / 2) / 0.00025) ** 2), np.exp(-((gy - grid / 2) / 0.00025) ** 2))
    weave = 0.5 * np.sin(2 * np.pi * x / 0.0006) * np.sin(2 * np.pi * y / 0.0006)
    height = 0.00005 * rip + 0.000025 * weave
    # Underarm seam (flat-felled: two stitch lines) and hem band stitching.
    sx = np.minimum(x, 2 * np.pi * r_mean - x)
    seam = np.exp(-((sx - 0.0045) / 0.0012) ** 2)
    height += 0.0003 * seam
    stitch_lines = [(sx, 0.0018), (sx, 0.0072)]
    z = along - SLEEVE_START
    stitch_lines += [(np.abs(z - 0.006), 0.0), (np.abs(z - BAND + 0.006), 0.0)]
    thread = np.zeros_like(x)
    for dist, off in stitch_lines:
        lane = np.exp(-((dist - off) / 0.00028) ** 2)
        phase = y if dist is sx else x
        dash = ((phase % 0.0028) < 0.0019).astype(float)
        thread = np.maximum(thread, lane * dash)
    height += 0.00012 * thread
    # Colour: ranger green / olive drab, faded on raised folds, darker in the folds, with dust.
    base = np.array([0.098, 0.106, 0.064])
    var = fbm2((size, size), size / 6, 5)
    fade = np.clip(1.0 - ao, 0, 1)
    col = base[None, None] * (0.9 + 0.22 * var)[..., None]
    col *= (1 + 0.07 * rip)[..., None]
    col = col * (1 - thread[..., None]) + np.array([0.13, 0.13, 0.09]) * thread[..., None]
    dust = np.clip((fbm2((size, size), size / 10, 9) - 0.5) * 2.5, 0, 1) * ao
    col = col * (1 - 0.25 * dust[..., None]) + np.array([0.16, 0.15, 0.12]) * 0.25 * dust[..., None]
    col *= (0.5 + 0.5 * ao)[..., None]
    rough = np.clip(0.86 + 0.06 * (var - 0.5) - 0.05 * thread, 0, 1)
    texel = 1.0 / size
    tu = 2 * np.pi * r_mean * texel
    tv = (obj["v_scale"]) * texel
    normal = height_to_normal(height, tu, tv)
    orm = np.stack([ao ** 0.7, rough, np.zeros_like(rough)], -1)
    return image_from(col, "sleeve_basecolor", True), image_from(normal, "sleeve_normal", False), image_from(orm, "sleeve_orm", False)


def canonical_arm(name, along0=0.0, along1=0.45):
    """The runtime forearm as a mesh (occluder for bakes, preview)."""
    th = np.linspace(-np.pi, np.pi, 97)
    rows = np.linspace(along0, along1, 90)
    P = np.stack([F.surface_point(np.full_like(th, a), th) for a in rows])
    U = np.stack(np.broadcast_arrays(np.linspace(0, 1, 97)[None], np.linspace(0, 1, 90)[:, None]), -1)
    return MeshData().grid(P, U, flip=True).to_object(name)


# =========================================================================================
# Watch (built in the left-arm frame: +X toward the little finger = 12 o'clock, +Y toward the
# elbow, +Z up off the back of the wrist; 3 o'clock / the crown point at the hand, -Y)
# =========================================================================================
MM = 0.001
WATCH_ALONG = 0.058
CASE_R = 20.0


def face_texture(size=1536):
    from PIL import Image, ImageDraw, ImageFont

    R = 20.9  # mm mapped to half the texture
    img = Image.new("RGB", (size, size), (10, 10, 11))
    d = ImageDraw.Draw(img)
    s = size / (2 * R)
    c = size / 2

    def at(r, clock_deg):
        a = math.radians(clock_deg)
        return c + r * s * math.sin(a), c - r * s * math.cos(a)

    def text(r, clock_deg, string, font, fill, rotate=False):
        x, y = at(r, clock_deg)
        bbox = d.textbbox((0, 0), string, font=font)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        if rotate:
            tile = Image.new("RGBA", (w + 8, h + 8), (0, 0, 0, 0))
            ImageDraw.Draw(tile).text((4 - bbox[0], 4 - bbox[1]), string, font=font, fill=fill)
            tile = tile.rotate(-clock_deg, resample=Image.BICUBIC, expand=True)
            img.paste(tile, (int(x - tile.width / 2), int(y - tile.height / 2)), tile)
        else:
            d.text((x - w / 2 - bbox[0], y - h / 2 - bbox[1]), string, font=font, fill=fill)

    lume = (226, 222, 205)
    print_white = (232, 232, 228)
    # Bezel insert (17–20 mm): matte black aluminium, 60-minute scale, lume pip at 12.
    d.ellipse([c - 20.1 * s, c - 20.1 * s, c + 20.1 * s, c + 20.1 * s], fill=(16, 16, 17))
    d.ellipse([c - 16.9 * s, c - 16.9 * s, c + 16.9 * s, c + 16.9 * s], fill=(9, 9, 10))
    bezel_font = ImageFont.truetype(FONT, int(1.9 * s))
    for m in range(0, 60):
        deg = m * 6
        if m == 0:
            x0, y0 = at(19.6, -1.6)
            x1, y1 = at(19.6, 1.6)
            x2, y2 = at(17.4, 0)
            d.polygon([(x0, y0), (x1, y1), (x2, y2)], fill=print_white)
            px, py = at(18.65, 0)
            d.ellipse([px - 0.42 * s, py - 0.42 * s, px + 0.42 * s, py + 0.42 * s], fill=lume)
        elif m % 10 == 0:
            text(18.5, deg, str(m), bezel_font, print_white, rotate=True)
        elif m % 5 == 0:
            x0, y0 = at(19.7, deg)
            x1, y1 = at(17.6, deg)
            d.line([(x0, y0), (x1, y1)], fill=print_white, width=max(2, int(0.45 * s)))
        elif m < 15:
            x0, y0 = at(19.7, deg)
            x1, y1 = at(18.9, deg)
            d.line([(x0, y0), (x1, y1)], fill=print_white, width=max(1, int(0.22 * s)))
    # Dial (0–16.6 mm): matte black, minute track, Arabic hours, inner 24 h ring.
    d.ellipse([c - 16.6 * s, c - 16.6 * s, c + 16.6 * s, c + 16.6 * s], fill=(14, 14, 15))
    for m in range(60):
        deg = m * 6
        outer, inner = 16.2, (15.0 if m % 5 == 0 else 15.5)
        x0, y0 = at(outer, deg)
        x1, y1 = at(inner, deg)
        d.line([(x0, y0), (x1, y1)], fill=print_white, width=max(1, int((0.32 if m % 5 == 0 else 0.16) * s)))
    hour_font = ImageFont.truetype(FONT, int(3.6 * s))
    small = ImageFont.truetype(FONT_REG, int(1.45 * s))
    for hnum in range(1, 13):
        deg = hnum * 30
        if hnum == 12:
            # Lume triangle at 12 instead of the numeral, field-watch style.
            x0, y0 = at(14.3, -3.2)
            x1, y1 = at(14.3, 3.2)
            x2, y2 = at(11.4, 0)
            d.polygon([(x0, y0), (x1, y1), (x2, y2)], fill=lume)
        else:
            text(12.4, deg, str(hnum), hour_font, lume)
        text(8.6, deg, str(hnum + 12), small, print_white)
        # Lume plots on the minute track at the hours.
        px, py = at(15.6, deg)
        if hnum % 3:
            d.ellipse([px - 0.38 * s, py - 0.38 * s, px + 0.38 * s, py + 0.38 * s], fill=lume)
    tiny = ImageFont.truetype(FONT_REG, int(1.05 * s))
    text(5.6, 0, "AUTOMATIC", tiny, print_white)
    text(5.6, 180, "100 M", tiny, print_white)
    # Solid swatches in the corners (outside the 20.9 mm disc) for the hands' lume and frames.
    d.rectangle([0, 0, int(0.06 * size), int(0.06 * size)], fill=lume)
    d.rectangle([size - int(0.06 * size), 0, size, int(0.06 * size)], fill=(12, 12, 13))
    d.rectangle([0, size - int(0.06 * size), int(0.06 * size), size], fill=(200, 70, 40))
    a = np.asarray(img, np.float32) / 255.0
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    return np.flipud(lin)  # Blender images are bottom-up


def face_uv(x, y):
    """Planar top-view UV for dial/bezel/hands: 12 (+X) up, 3 (-Y) right."""
    R = 20.9
    return 0.5 + (-y) / (2 * R), 0.5 + x / (2 * R)


SWATCH_LUME = (0.03, 0.97)
SWATCH_BLACK = (0.97, 0.97)
SWATCH_RED = (0.03, 0.03)


def disc(mesh, r0, r1, z, mat, segments=144, uv="face"):
    th = np.linspace(0, 2 * np.pi, segments + 1)
    rr = np.array([r0, r1])
    P = np.stack([rr[:, None] * np.cos(th)[None], rr[:, None] * np.sin(th)[None], np.full((2, segments + 1), z)], -1)
    U = np.stack(face_uv(P[..., 0], P[..., 1]), -1)
    mesh.grid(P * MM, U, mat=mat)


def lathe_part(mesh, profile, mat, segments=96, uv_fn=None, displace=None):
    P, th = lathe(profile, segments)
    if displace is not None:
        P = displace(P, th)
    if uv_fn is None:
        U = np.stack(np.broadcast_arrays(np.linspace(0, 1, segments + 1)[None], np.linspace(0, 1, len(profile))[:, None]), -1)
    else:
        U = uv_fn(P)
    mesh.grid(P * MM, U, mat=mat, flip=True)


def hand_shape(mesh, length, width, tail, z, clock_deg, kind, mat):
    """Flat extruded watch hand (mm), lume-filled with a dark frame."""
    if kind == "sword":
        outline = [(-tail, 0.35), (0, width * 0.5), (length * 0.78, width * 0.5), (length, 0.0), (length * 0.78, -width * 0.5), (0, -width * 0.5), (-tail, -0.35)]
    elif kind == "pencil":
        outline = [(-tail, 0.3), (0, width * 0.5), (length * 0.86, width * 0.5), (length, 0), (length * 0.86, -width * 0.5), (0, -width * 0.5), (-tail, -0.3)]
    else:  # seconds: needle with a counterweight disc
        outline = [(-tail, 0.9), (-tail + 1.6, 0.25), (length, 0.08), (length, -0.08), (-tail + 1.6, -0.25), (-tail, -0.9)]
    a = math.radians(clock_deg)
    dirv = np.array([math.cos(a), -math.sin(a)])  # 12 = +X, clockwise toward 3 = -Y
    perp = np.array([dirv[1], -dirv[0]])
    pts = np.array([dirv * u + perp * w for u, w in outline])
    n = len(pts)
    thick = 0.18
    top = np.concatenate([pts, np.full((n, 1), z + thick)], 1)
    bot = np.concatenate([pts, np.full((n, 1), z)], 1)
    verts = np.concatenate([top, bot]) * MM
    faces = [list(range(n)), list(range(2 * n - 1, n - 1, -1))]
    uvs = [[SWATCH_LUME if kind != "seconds" else SWATCH_RED] * n, [SWATCH_BLACK] * n]
    for i in range(n):
        j = (i + 1) % n
        faces.append([i, n + i, n + j, j])
        uvs.append([SWATCH_BLACK] * 4)
    mesh.add(verts, faces, uvs, mat=mat, smooth=False)


def box_loft(mesh, sections, mat, uv=(0.5, 0.5)):
    """Loft rounded-rectangle sections [(centre(3), half_w(y), half_h(z), r)] along X."""
    ring = []
    k = 6
    for c, hw, hh, r in sections:
        pts = []
        for corner, (sy, sz) in enumerate(((1, 1), (-1, 1), (-1, -1), (1, -1))):
            a0 = [0, 0.5, 1, 1.5][corner] * np.pi
            for i in range(k):
                a = a0 + (i / (k - 1)) * np.pi / 2
                pts.append((c[0], c[1] + sy * (hw - r) + r * np.cos(a), c[2] + sz * (hh - r) + r * np.sin(a)))
        ring.append(pts)
    P = np.array(ring)
    U = np.full(P.shape[:2] + (2,), uv)
    mesh.grid(P * MM, U, mat=mat, closed_u=True, flip=False)
    # Caps.
    for idx, cap in ((0, True), (len(P) - 1, False)):
        verts = P[idx] * MM
        face = list(range(len(verts)))
        mesh.add(verts, [face if cap else face[::-1]], [[uv] * len(face)], mat=mat)


def build_watch(arm_top_z):
    METAL, FACE, STRAP, GLASS = range(4)
    mesh = MeshData()
    # Case: caseback, mid case with a softly domed flank, top rim.
    case = [(0.0, 0.25), (10.0, 0.18), (15.6, 0.0), (17.4, 0.45), (18.4, 1.4), (19.6, 2.2), (20.0, 3.2), (20.05, 5.5), (19.85, 7.2), (19.5, 7.6), (18.0, 7.62)]
    lathe_part(mesh, case, METAL, 72)
    # Bezel: knurled 60-click edge, printed insert on top, inner wall.
    def knurl(P, th):
        r = np.hypot(P[..., 0], P[..., 1])
        side = (r > 20.3)[..., None]
        bump = (0.5 + 0.5 * np.sign(np.sin(th * 120)))[None, :, None] * 0.22
        scale = 1 - side * bump / r[..., None]
        P = P.copy()
        P[..., :2] *= scale
        return P

    bezel = [(19.7, 7.62), (20.65, 7.7), (20.9, 8.05), (20.95, 9.1), (20.6, 9.8), (20.1, 10.05)]
    lathe_part(mesh, bezel, METAL, 240, displace=knurl)
    disc(mesh, 16.85, 20.1, 10.05, FACE, 96)
    lathe_part(mesh, [(16.85, 10.05), (16.6, 9.85), (16.6, 8.35)], METAL, 72)
    # Dial and chapter.
    disc(mesh, 0.0, 16.62, 8.35, FACE, 96)
    # Hands at 10:09:36 and a centre cap.
    hand_shape(mesh, 9.6, 1.9, 2.2, 8.62, (10 + 9.6 / 60) * 30, "sword", FACE)
    hand_shape(mesh, 14.2, 1.5, 2.6, 8.86, 9.6 * 6, "pencil", FACE)
    hand_shape(mesh, 15.2, 0.4, 4.0, 9.1, 36 * 6, "seconds", FACE)
    lathe_part(mesh, [(0.0, 9.42), (0.95, 9.4), (1.0, 9.2), (1.0, 8.6)], METAL, 32)
    # Crystal: domed sapphire.
    lathe_part(mesh, [(16.65, 9.85), (16.6, 10.3), (14.0, 10.62), (8.0, 10.8), (0.0, 10.84)], GLASS, 64)
    # Lugs: four, curving down to hug the wrist, chamfered.
    for sx in (1, -1):
        for sy in (1, -1):
            secs = []
            for k, xx in enumerate(np.linspace(16.5, 24.6, 7)):
                f = k / 6
                top = 7.0 - 3.2 * f ** 1.3
                bottom = 2.4 - 3.4 * f ** 1.5
                secs.append(((sx * xx, sy * 11.35, (top + bottom) / 2), 1.25, (top - bottom) / 2, 0.55))
            if sx < 0:
                secs = secs[::-1]
            box_loft(mesh, secs, METAL)
        # Spring bar between the lugs.
        P, th = lathe([(0.85, -10.2), (0.85, 10.2)], 16)
        # Lathe axis is Z; the bar runs across the strap (Y), between the lug pair at sx.
        bar = np.stack([P[..., 0] + sx * 21.7, P[..., 2], P[..., 1] + 0.9], -1)
        mesh.grid(bar * MM, np.full(bar.shape[:2] + (2,), 0.5), mat=METAL, closed_u=False, flip=sx < 0)
    # Crown at 3 o'clock (-Y): tube, then a knurled crown.
    def crown_knurl(P, th):
        P = P.copy()
        r = np.hypot(P[..., 0], P[..., 1])
        grip = (r > 3.0)[..., None]
        s = 1 - grip * (0.22 * (np.sin(th * 24) > 0))[None, :, None] / np.maximum(r, 1e-6)[..., None]
        P[..., :2] *= s
        return P

    crown = [(0.0, 23.9), (2.6, 23.85), (3.25, 23.4), (3.3, 21.2), (2.9, 20.8), (1.5, 20.7), (1.5, 19.5)]
    Pc, thc = lathe(crown, 48)
    Pc = crown_knurl(Pc, thc)
    Pc = np.stack([Pc[..., 0], -Pc[..., 2], Pc[..., 1] + 5.0], -1)
    mesh.grid(Pc * MM, np.full(Pc.shape[:2] + (2,), 0.5), mat=METAL, flip=False)

    # NATO strap: round the arm at the watch, lifted over the spring bars and under the case.
    t = WATCH_ALONG / F.LENGTH

    def arm_pt(theta, off):
        r = F.radius(t, theta) + off
        # Arm frame (x thumb, z dorsal) → watch frame (x toward the little finger, z from case base).
        return -math.cos(theta) * r / MM, math.sin(theta) * r / MM - arm_top_z / MM

    upper = np.linspace(0, math.pi, 2001)
    xs = np.array([arm_pt(a, 0)[0] for a in upper])
    theta_12 = upper[np.argmin(np.abs(xs - 25.5))]  # little-finger side, where the strap meets the arm
    theta_6 = upper[np.argmin(np.abs(xs + 25.5))]  # thumb side
    around = np.linspace(theta_12, theta_6 + 2 * math.pi, 64)
    bottom = [arm_pt(a, 0.65 * MM) for a in around]
    over = {}
    for sx in (-1, 1):
        cx, cz = sx * 21.7, 0.9
        over[sx] = [(cx + sx * 1.5 * math.cos(a), cz + 1.5 * math.sin(a)) for a in np.linspace(math.pi, 0, 7)]
    top = [(16.0, -0.62), (8.0, -0.58), (0.0, -0.56), (-8.0, -0.58), (-16.0, -0.62)]
    path2d = [(18.8, -0.35)] + over[1] + [(23.6, -1.4)] + bottom + [(-23.6, -1.4)] + over[-1][::-1] + [(-18.8, -0.35)] + top
    pts = np.array([(x, 0.0, z) for x, z in path2d])
    path = catmull(pts, 3, closed=True)
    section = []
    hw, ht, rr = 10.0, 0.55, 0.4
    for corner, (sy, sz) in enumerate(((1, 1), (-1, 1), (-1, -1), (1, -1))):
        a0 = [0, 0.5, 1, 1.5][corner] * np.pi
        for i in range(4):
            a = a0 + (i / 3) * np.pi / 2
            section.append((sy * (hw - rr) + rr * np.cos(a), sz * (ht - rr) + rr * np.sin(a)))
    section = np.array(section)
    Ps, T, S, N = sweep(path, (0, 1, 0), section, closed_path=True)
    s = arclength(np.concatenate([path, path[:1]]))[:-1]
    U = np.stack(np.broadcast_arrays((s / 20.0)[:, None], (section[:, 0] / 20.0 + 0.5)[None, :]), -1)
    # Across-strap mapping: v = across the width (wrap round the thin edges continuous).
    mesh.grid(Ps * MM, U, mat=STRAP, closed_u=True, closed_v=True, flip=False)
    strap_path = path
    return mesh, strap_path


def strap_textures(size=512):
    """Tileable woven nylon: twill ribs along the strap, edge selvedge."""
    v, u = np.mgrid[0:size, 0:size] / size  # u along the strap (one tile = 20 mm), v across
    rib = 0.5 + 0.5 * np.sin(2 * np.pi * (u * 28 + v * 4))
    pick = 0.5 + 0.5 * np.sin(2 * np.pi * v * 56)
    height = 0.00008 * rib * (0.7 + 0.3 * pick)
    edge = np.minimum(v, 1 - v)
    height += 0.0002 * np.exp(-((edge - 0.03) / 0.012) ** 2)
    var = fbm2((size, size), size / 4, 21)
    col = np.array([0.016, 0.016, 0.017])[None, None] * (0.85 + 0.3 * var + 0.25 * rib)[..., None]
    normal = height_to_normal(height, 0.02 / size, 0.02 / size)
    orm = np.stack([np.ones_like(var), 0.72 + 0.08 * (var - 0.5), np.zeros_like(var)], -1)
    return image_from(col, "strap_basecolor", True), image_from(normal, "strap_normal", False), image_from(orm, "strap_orm", False)


def build_buckle(mesh, mat, strap_path, arm_top_z):
    """Blackened steel buckle and two keepers on the thumb side of the strap."""
    t = WATCH_ALONG / F.LENGTH
    theta = 2 * math.pi - 0.25  # thumb side, a little toward the palm
    r = F.radius(t, theta)
    target = np.array([-math.cos(theta) * r / MM, 0.0, math.sin(theta) * r / MM - arm_top_z / MM])
    i = int(np.argmin(np.linalg.norm(strap_path - target, axis=-1)))
    p = strap_path[i]
    tangent = strap_path[(i + 1) % len(strap_path)] - strap_path[i - 1]
    tangent /= np.linalg.norm(tangent)
    centre = np.array([0.0, 0.0, -arm_top_z / MM])
    outward = (p - centre) - ((p - centre) @ tangent) * tangent
    outward[1] = 0
    outward /= np.linalg.norm(outward)

    def frame_ring(center, half_len, half_w, wire, offset):
        # Rectangular wire frame lying on the strap: length along the strap tangent, width along Y.
        corners = []
        for a in np.linspace(0, 2 * np.pi, 33)[:-1]:
            cx, cy = np.cos(a), np.sin(a)
            # Superellipse corners.
            ex = np.sign(cx) * np.abs(cx) ** 0.25 * half_len
            ey = np.sign(cy) * np.abs(cy) ** 0.25 * half_w
            corners.append(center + tangent * ex + np.array([0, 1, 0]) * ey + outward * offset)
        path = np.array(corners)
        sec = np.array([(wire * np.cos(a), wire * np.sin(a)) for a in np.linspace(0, 2 * np.pi, 9)[:-1]])
        P, *_ = sweep(path, outward, sec, closed_path=True)
        mesh.grid(P * MM, np.full(P.shape[:2] + (2,), 0.5), mat=mat, closed_u=True, closed_v=True)
    frame_ring(p, 7.5, 11.4, 0.85, 1.6)
    frame_ring(p + tangent * 13.0, 2.0, 11.2, 0.55, 1.4)
    frame_ring(p - tangent * 14.0, 2.0, 11.2, 0.55, 1.4)
    # Prong.
    a = p - tangent * 6.5 + outward * 1.7
    b = p + tangent * 7.0 + outward * 2.3
    path = np.linspace(a, b, 8)
    sec = np.array([(0.55 * np.cos(t), 0.55 * np.sin(t)) for t in np.linspace(0, 2 * np.pi, 9)[:-1]])
    P, *_ = sweep(path, (0, 1, 0), sec)
    mesh.grid(P * MM, np.full(P.shape[:2] + (2,), 0.5), mat=mat, closed_u=True)


def place_watch(obj, arm_top_z):
    """Watch frame → canonical arm frame: onto the back of the wrist, just past the glove cuff."""
    me = obj.data
    co = np.zeros(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    co[:, 1] += WATCH_ALONG
    co[:, 2] += arm_top_z
    # The left arm's posed frame has the canonical handedness, so the watch goes in as built:
    # face on the back of the wrist, 12 toward the little finger, crown toward the hand.
    me.vertices.foreach_set("co", co.ravel())
    me.update()


def export(objects, path):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True,
                              export_texcoords=True, export_normals=True, export_tangents=True,
                              export_materials="EXPORT", export_image_format="WEBP", export_yup=True,
                              export_animations=False, export_skins=False)


# ----------------------------------------------------------------------------------------- run
sleeve_mesh, sleeve_P, sleeve_theta, v_scale = build_sleeve()
sleeve = sleeve_mesh.to_object("ArmSleeve")
sleeve["v_scale"] = v_scale
sleeve.data.shade_smooth()
base, normal, orm = sleeve_textures(sleeve, SIZE)
sleeve_mat = textured(material("arm_sleeve", rough=0.88), base, normal, orm)
sleeve.data.materials.clear()
sleeve.data.materials.append(sleeve_mat)
print("sleeve", len(sleeve.data.polygons), "faces")

arm_top = float(F.radius(WATCH_ALONG / F.LENGTH, np.pi / 2)) + 1.15 * MM
watch_mesh, strap_path = build_watch(arm_top)
from PIL import Image  # noqa: E402

face = image_from(face_texture(), "watch_face", True)
sb, sn, so = strap_textures()
mats = [material("watch_metal", (0.028, 0.028, 0.03), 1.0, 0.34),
        textured(material("watch_face", rough=0.42), face),
        textured(material("watch_strap", rough=0.72), sb, sn, so),
        material("watch_glass", (0.0, 0.0, 0.0), 0.0, 0.04, alpha=0.12)]
build_buckle(watch_mesh, 0, strap_path, arm_top)
watch = watch_mesh.to_object("ArmWatch", mats)
place_watch(watch, arm_top)
print("watch", len(watch.data.polygons), "faces")

export([sleeve, watch], os.path.join(outdir, "accessories.glb"))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(outdir, "accessories.blend"))

if PREVIEW:
    arm = canonical_arm("preview-arm", 0.0, 0.42)
    skin = material("skin", (0.55, 0.36, 0.27), 0, 0.5)
    arm.data.materials.append(skin)
    arm.data.shade_smooth()
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 48
    sc.render.resolution_x, sc.render.resolution_y = 960, 640
    w = bpy.data.worlds.new("w")
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.45, 0.47, 0.5, 1)
    for rot, e in (((0.7, 0.2, 0.6), 3.5), ((-1.0, 0.3, 2.8), 1.2)):
        s = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
        s.data.energy = e
        s.rotation_euler = rot
        sc.collection.objects.link(s)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    import mathutils

    def shot(name, loc, target, lens=50):
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (mathutils.Vector(target) - mathutils.Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(outdir, f"preview_{name}.png")
        bpy.ops.render.render(write_still=True)

    # The preview arm is the canonical (right-handed) arm, so the watch reads mirrored here.
    shot("arm", (0.05, 0.12, 0.42), (0.0, 0.17, 0.0), 40)
    shot("watch", (0.0, 0.085, 0.16), (0.0, 0.088, 0.02), 60)
    shot("sleeve", (0.18, 0.2, 0.12), (0.0, 0.22, 0.0), 45)
