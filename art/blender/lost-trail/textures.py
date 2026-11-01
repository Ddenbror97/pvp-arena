"""
LOST TRAIL PBR textures (deterministic). Writes art/blender/lost-trail/build/tex/*.png.

  python3 art/blender/lost-trail/textures.py

Albedo is sRGB, *_n are OpenGL tangent-space normals (+Y up, as glTF expects), *_r linear
roughness. Foliage atlases are RGBA with an alpha-test mask. Surfaces tile seamlessly. Bark is
built from CC0 Poly Haven scans (source/bark), shifted to wet tropical bark with moss.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "map"))
import textures as base  # noqa: E402  (Dustfront helpers: tileable noise, normals, masonry)

OUT = os.path.join(HERE, "build", "tex")
os.makedirs(OUT, exist_ok=True)
noise, normal_from_height, tint, blocks = base.noise, base.normal_from_height, base.tint, base.blocks


def save(name, arr, size=None):
    arr = np.clip(arr, 0, 1)
    img = Image.fromarray((arr * 255 + 0.5).astype(np.uint8), "RGB" if arr.ndim == 3 and arr.shape[2] == 3 else ("RGBA" if arr.ndim == 3 else "L"))
    if size and img.width != size:
        img = img.resize((size, size), Image.LANCZOS)
    img.save(os.path.join(OUT, name + ".png"))


def load(path):
    return np.asarray(Image.open(path).convert("RGB")).astype(float) / 255


# ------------------------------------------------------------------ bark (CC0 scans → tropical)
def bark():
    for scan, out, hue in (("bark_brown_02", "bark_jungle", (0.86, 0.9, 0.82)), ("bark_willow_02", "bark_pale", (0.9, 0.92, 0.86))):
        col = load(os.path.join(HERE, "source", "bark", f"{scan}_color.jpg"))
        nrm = load(os.path.join(HERE, "source", "bark", f"{scan}_normal.jpg"))
        rgh = load(os.path.join(HERE, "source", "bark", f"{scan}_roughness.jpg"))
        n = col.shape[0]
        lum = col.mean(axis=2)
        # Damp, darker, slightly cooler bark with moss in the crevices and lichen flecks.
        wet = col * np.array(hue)[None, None] * 0.82
        moss_mask = np.clip((noise(n, 5, 4, seed=201) - 0.48) * 4.0, 0, 1) * np.clip((0.55 - lum) * 3.0, 0, 1)
        moss = tint(noise(n, 4, 16, seed=202), (0.16, 0.24, 0.08), (0.30, 0.38, 0.12))
        lichen = (noise(n, 3, 32, seed=203) > 0.82)[..., None] * 0.18
        out_col = wet * (1 - moss_mask[..., None]) + moss * moss_mask[..., None] + lichen * np.array([0.7, 0.72, 0.6])[None, None]
        save(out, out_col)
        save(out + "_n", nrm, 512)
        save(out + "_r", np.clip(rgh[..., 0] * 0.85 + moss_mask * 0.1, 0, 1), 512)


# ------------------------------------------------------------------ foliage atlases
def leaf_shape(length, width, tip=0.25, n=28):
    """Elliptic-acuminate leaf outline along +x from (0, 0), as (x, y) points."""
    pts_top, pts_bot = [], []
    for i in range(n + 1):
        t = i / n
        w = width * np.sin(np.pi * t ** 0.85) * (1 - tip * t ** 3)
        pts_top.append((t * length, w))
        pts_bot.append((t * length, -w))
    return pts_top + pts_bot[::-1]


def draw_leaf(img, hmap, cx, cy, angle, length, width, color, rng, hole=False):
    """Draw one leaf (veins clipped to its outline) into the RGBA image and its height map."""
    S = img.width
    ca, sa = np.cos(angle), np.sin(angle)
    tr = lambda p: (cx + p[0] * ca - p[1] * sa, cy + p[0] * sa + p[1] * ca)
    shape = leaf_shape(length, width)
    outline = [tr(p) for p in shape]
    xs, ys = [p[0] for p in outline], [p[1] for p in outline]
    box = (max(0, int(min(xs)) - 2), max(0, int(min(ys)) - 2), min(S, int(max(xs)) + 3), min(S, int(max(ys)) + 3))
    if box[2] <= box[0] or box[3] <= box[1]:
        return
    off = lambda p: (p[0] - box[0], p[1] - box[1])
    w, h = box[2] - box[0], box[3] - box[1]
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).polygon([off(p) for p in outline], fill=255)
    if hole:
        p = off(tr((length * rng.uniform(0.3, 0.7), width * rng.uniform(-0.4, 0.4))))
        r = width * 0.1
        ImageDraw.Draw(mask).ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=0)
    layer = Image.new("RGB", (w, h), color)
    hl = Image.new("L", (w, h), 150)
    d, hd = ImageDraw.Draw(layer), ImageDraw.Draw(hl)
    # Lighter half on one side of the midrib (leaf fold catching light).
    half = [off(tr(p)) for p in shape[: len(shape) // 2]] + [off(tr((length, 0))), off(tr((0, 0)))]
    d.polygon(half, fill=tuple(min(255, int(c * 1.12)) for c in color))
    vein = tuple(int(c * 0.84) for c in color)
    vw = max(1, int(length / 160))
    for k in range(1, 12):
        t = k / 12
        wv = width * np.sin(np.pi * t ** 0.85)
        for sgn in (1, -1):
            a, b = off(tr((t * length, 0))), off(tr((min(length, t * length + wv * 0.9), sgn * wv * 1.1)))
            d.line([a, b], fill=vein, width=vw)
            hd.line([a, b], fill=118, width=vw)
    rib = tuple(min(255, int(c * 1.3 + 16)) for c in color)
    d.line([off(tr((0, 0))), off(tr((length * 0.97, 0)))], fill=rib, width=max(2, int(length / 80)))
    hd.line([off(tr((0, 0))), off(tr((length * 0.97, 0)))], fill=225, width=max(2, int(length / 70)))
    # Darker toward the base, a little sun-bleached toward the tip.
    yy, xx = np.mgrid[box[1]:box[3], box[0]:box[2]]
    along = np.clip(((xx - cx) * ca + (yy - cy) * sa) / max(length, 1), 0, 1)
    shade = (0.8 + 0.25 * along)[..., None]
    layer = Image.fromarray(np.clip(np.asarray(layer).astype(float) * shade, 0, 255).astype(np.uint8), "RGB")
    img.paste(layer, box[:2], mask)
    alpha = img.getchannel("A")
    alpha.paste(255, box, mask)
    img.putalpha(alpha)
    hmap.paste(hl, box[:2], mask)


GREENS = [(46, 78, 28), (58, 92, 34), (38, 66, 26), (70, 98, 36), (52, 84, 40), (84, 104, 40)]


def leaf_cluster(name, leaves, length, width, seed, stem=(70, 62, 34)):
    """A cluster of broad tropical leaves radiating from a stem, filling a square card."""
    S = 2048
    rng = np.random.default_rng(seed)
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    hmap = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(img)
    base = (S * 0.5, S * 0.97)
    for i in range(leaves):
        a = -np.pi / 2 + rng.uniform(-1.15, 1.15)
        L = length * S * rng.uniform(0.75, 1.1)
        r0 = rng.uniform(0.05, 0.42) * S
        sx, sy = base[0] + np.cos(a) * r0 * 0.4, base[1] + np.sin(a) * r0
        d.line([base, (sx, sy)], fill=(*stem, 255), width=10)
        col = GREENS[rng.integers(len(GREENS))]
        col = tuple(int(c * rng.uniform(0.85, 1.12)) for c in col)
        draw_leaf(img, hmap, sx, sy, a + rng.uniform(-0.35, 0.35), L, L * width * rng.uniform(0.85, 1.15), col, rng, hole=rng.random() < 0.15)
    img = img.resize((1024, 1024), Image.LANCZOS)
    hmap = hmap.filter(ImageFilter.GaussianBlur(3)).resize((1024, 1024), Image.LANCZOS)
    arr = np.asarray(img).astype(float) / 255
    arr[..., :3] *= (0.86 + 0.28 * noise(1024, 4, 8, seed=seed + 1))[..., None]
    # Alpha-test friendly: hard edge after downsampling.
    arr[..., 3] = (arr[..., 3] > 0.45).astype(float)
    # Dilate colour into transparent texels so mipmaps don't fringe dark.
    rgb = arr[..., :3].copy()
    mask = arr[..., 3] > 0
    for _ in range(8):
        grow = ~mask
        acc = np.zeros_like(rgb); cnt = np.zeros(mask.shape)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            m = np.roll(mask, (dy, dx), (0, 1)); c = np.roll(rgb, (dy, dx), (0, 1))
            acc += c * m[..., None]; cnt += m
        fill = grow & (cnt > 0)
        rgb[fill] = acc[fill] / cnt[fill][..., None]
        mask = mask | fill
    arr[..., :3] = rgb
    save(name, arr)
    h = np.asarray(hmap).astype(float) / 255
    save(name + "_n", normal_from_height(h, 3.0), 512)


def frond(name, seed, pinnae=48, length=0.95, leaflet=0.36, droop=0.18, colors=((38, 70, 24), (64, 96, 34)), lobed=False):
    """Pinnate frond (palm or fern) along the card's vertical axis."""
    S = 2048
    rng = np.random.default_rng(seed)
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    hmap = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(img)
    hd = ImageDraw.Draw(hmap)
    x0, y0, y1 = S * 0.5, S * 0.99, S * (1 - length)
    for i in range(pinnae):
        t = (i + 0.5) / pinnae
        y = y0 + (y1 - y0) * t
        L = leaflet * S * np.sin(np.pi * min(1.0, 0.15 + t * 0.95)) * rng.uniform(0.9, 1.08)
        for s in (-1, 1):
            ang = -np.pi / 2 + s * (np.pi / 2 - 0.5 - droop * t)
            col = tuple(int(c * rng.uniform(0.88, 1.1)) for c in colors[rng.integers(2)])
            width_f = 0.1 if lobed else 0.045
            draw_leaf(img, hmap, x0, y, ang, L, L * width_f, col, rng)
    d.line([(x0, y0), (x0, y1)], fill=(92, 84, 44, 255), width=14)
    hd.line([(x0, y0), (x0, y1)], fill=230, width=14)
    img = img.resize((1024, 1024), Image.LANCZOS)
    arr = np.asarray(img).astype(float) / 255
    arr[..., 3] = (arr[..., 3] > 0.45).astype(float)
    save(name, arr)
    save(name + "_n", normal_from_height(np.asarray(hmap.filter(ImageFilter.GaussianBlur(3)).resize((1024, 1024))).astype(float) / 255, 3.0), 512)


# ------------------------------------------------------------------ ground, rock, stone, wood, water
def forest_floor():
    n = 1024
    rng = np.random.default_rng(301)
    soil = tint(noise(n, 6, 4, seed=302), (0.12, 0.09, 0.06), (0.24, 0.18, 0.11))
    img = Image.fromarray((soil * 255).astype(np.uint8), "RGB")
    h = Image.new("L", (n, n), 90)
    d, hd = ImageDraw.Draw(img), ImageDraw.Draw(h)
    litter = [(92, 62, 30), (120, 84, 40), (70, 50, 28), (104, 96, 48), (60, 70, 30), (140, 104, 52)]
    for _ in range(2600):
        x, y = rng.uniform(0, n), rng.uniform(0, n)
        L, W, a = rng.uniform(10, 34), rng.uniform(4, 11), rng.uniform(0, np.pi)
        col = tuple(int(c * rng.uniform(0.75, 1.15)) for c in litter[rng.integers(len(litter))])
        for ox in (-n, 0, n):
            for oy in (-n, 0, n):
                pts = [(x + ox + np.cos(a) * L * t - np.sin(a) * W * np.sin(np.pi * (t + 0.5) / 1) * s * 0.5, y + oy + np.sin(a) * L * t + np.cos(a) * W * np.sin(np.pi * (t + 0.5)) * s * 0.5)
                       for s in (1, -1) for t in (np.linspace(-0.5, 0.5, 6) if s == 1 else np.linspace(0.5, -0.5, 6))]
                d.polygon(pts, fill=col)
                hd.polygon(pts, fill=int(rng.uniform(120, 170)))
    for _ in range(90):  # twigs
        x, y, a, L = rng.uniform(0, n), rng.uniform(0, n), rng.uniform(0, np.pi), rng.uniform(30, 90)
        for ox in (-n, 0, n):
            for oy in (-n, 0, n):
                p = [(x + ox, y + oy), (x + ox + np.cos(a) * L, y + oy + np.sin(a) * L)]
                d.line(p, fill=(58, 42, 26), width=3)
                hd.line(p, fill=190, width=3)
    col = np.asarray(img).astype(float) / 255
    moss = np.clip((noise(n, 5, 4, seed=303) - 0.6) * 5, 0, 1)
    col = col * (1 - moss[..., None] * 0.75) + tint(noise(n, 4, 32, seed=304), (0.14, 0.22, 0.07), (0.25, 0.33, 0.1)) * moss[..., None] * 0.75
    hh = np.asarray(h.filter(ImageFilter.GaussianBlur(1.2))).astype(float) / 255
    save("forest_floor", col)
    save("forest_floor_n", normal_from_height(hh, 3.0), 512)
    save("forest_floor_r", 0.82 - moss * 0.05 + noise(n, 3, 8, seed=305) * 0.1, 512)


def trail_mud():
    n = 1024
    h = noise(n, 6, 4, seed=311)
    ruts = np.clip(1 - np.abs(noise(n, 4, 2, seed=312) - 0.5) * 6, 0, 1)
    wet = np.clip((0.42 - h) * 6, 0, 1)
    col = tint(h * 0.7 + noise(n, 3, 32, seed=313) * 0.3, (0.17, 0.12, 0.07), (0.36, 0.27, 0.16))
    col *= (1 - wet * 0.35)[..., None]
    pebbles = (noise(n, 2, 64, seed=314) > 0.8)[..., None]
    col = col * (1 - pebbles * 0.3) + pebbles * 0.3 * np.array([0.42, 0.38, 0.32])[None, None]
    save("trail_mud", col)
    save("trail_mud_n", normal_from_height(h * 0.6 - ruts * 0.2 + pebbles[..., 0] * 0.3, 4.0), 512)
    save("trail_mud_r", np.clip(0.9 - wet * 0.65, 0.15, 1), 512)


def mossy_rock():
    n = 1024
    h = noise(n, 7, 3, seed=321)
    cracks = np.clip(1 - np.abs(noise(n, 5, 6, seed=322) - 0.5) * 30, 0, 1)
    rock = tint(h * 0.7 + noise(n, 4, 32, seed=323) * 0.3, (0.21, 0.21, 0.19), (0.36, 0.35, 0.31))
    rock *= (1 - cracks * 0.18)[..., None]
    moss = np.clip((noise(n, 5, 4, seed=324) - 0.45) * 4.5, 0, 1)
    mcol = tint(noise(n, 4, 48, seed=325), (0.15, 0.24, 0.07), (0.31, 0.40, 0.12))
    col = rock * (1 - moss[..., None]) + mcol * moss[..., None]
    save("rock_moss", col)
    save("rock_moss_n", normal_from_height(h - cracks * 0.3 + moss * 0.15 * noise(n, 3, 64, seed=326), 5.0), 512)
    save("rock_moss_r", np.clip(0.78 + moss * 0.15 - cracks * 0.2, 0, 1), 512)


def ruin_stone():
    n = 1024
    bevel, ids, mortar = blocks(n, 6, 4, 0.03, seed=331)
    h = bevel * 0.8 + noise(n, 6, 8, seed=332) * 0.2
    # Weathered, darker stone: white and dark operator uniforms both stand out against it.
    stone = tint(ids * 0.5 + noise(n, 5, 16, seed=333) * 0.5, (0.24, 0.235, 0.20), (0.40, 0.385, 0.33))
    stone = stone * (1 - mortar[..., None] * 0.6)
    moss = np.clip((noise(n, 5, 4, seed=334) - 0.42) * 3.5 + mortar * 0.6, 0, 1)
    mcol = tint(noise(n, 4, 48, seed=335), (0.13, 0.22, 0.06), (0.30, 0.38, 0.11))
    stains = noise(n, 4, 2, seed=336)[..., None] * 0.25
    col = (stone * (1 - moss[..., None]) + mcol * moss[..., None]) * (1 - stains)
    save("ruin_stone", col)
    save("ruin_stone_n", normal_from_height(h, 6.0), 512)
    save("ruin_stone_r", np.clip(0.85 + moss * 0.1, 0, 1), 512)


def wet_planks():
    n = 1024
    y, x = np.mgrid[0:n, 0:n] / n
    planks = 5
    pid = np.floor(x * planks).astype(int)
    fx = x * planks - pid
    gap = np.clip(1 - np.minimum(fx, 1 - fx) / 0.035, 0, 1)
    r = np.random.default_rng(341)
    shade = r.random(planks)[pid % planks]
    grain = noise(n, 5, 4, seed=342)
    lines = 0.5 + 0.5 * np.sin((x * 70 + grain * 7 + shade * 10) * np.pi)
    col = tint(shade * 0.5 + lines * 0.3 + grain * 0.2, (0.20, 0.16, 0.11), (0.38, 0.30, 0.20))
    rot = np.clip((noise(n, 4, 4, seed=343) - 0.55) * 4, 0, 1)
    moss = np.clip((noise(n, 4, 6, seed=344) - 0.62) * 5, 0, 1) * gap.clip(0.3, 1)
    col = col * (1 - 0.55 * gap)[..., None] * (1 - rot * 0.3)[..., None]
    col = col * (1 - moss[..., None]) + np.array([0.18, 0.27, 0.08])[None, None] * moss[..., None]
    save("planks_wet", col)
    save("planks_wet_n", normal_from_height(lines * 0.15 - gap * 0.9 + grain * 0.1, 4.0), 512)
    save("planks_wet_r", np.clip(0.62 + rot * 0.2 - moss * 0.1, 0, 1), 512)


def water():
    n = 512
    h = noise(n, 5, 4, seed=351) * 0.6 + noise(n, 4, 16, seed=352) * 0.4
    save("water_n", normal_from_height(h, 2.5))


def hut_tin():
    n = 512
    y, x = np.mgrid[0:n, 0:n] / n
    ridges = 0.5 + 0.5 * np.sin(x * 2 * np.pi * 16)
    rust = np.clip((noise(n, 5, 4, seed=361) - 0.35) * 2.5, 0, 1)
    col = tint(rust, (0.42, 0.44, 0.42), (0.42, 0.22, 0.10)) * (0.8 + 0.2 * ridges)[..., None]
    streaks = noise(n, 3, 2, seed=362)[..., None] * (y[..., None] * 0.4)
    save("hut_tin", col * (1 - streaks))
    save("hut_tin_n", normal_from_height(ridges, 6.0))
    save("hut_tin_r", np.clip(0.45 + rust * 0.45, 0, 1))


def sign_logo():
    """Weathered wooden sign with the official PVPSPINARENA logo painted on (1024 × 512)."""
    root = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
    w, h = 1024, 512
    planks = np.asarray(Image.open(os.path.join(OUT, "planks_wet.png")).convert("RGB")).astype(float) / 255
    # Horizontal boards, lighter and greyer than the bridge (sun-bleached outpost sign).
    wood = np.rot90(planks, 1)[:h, :w] * np.array([1.25, 1.18, 1.05])[None, None]
    wood = np.clip(wood * 0.85 + wood.mean(axis=2, keepdims=True) * 0.25, 0, 1)
    logo = Image.open(os.path.join(root, "public", "brand", "arena-logo-email.png")).convert("RGBA")
    scale = min(w * 0.82 / logo.width, h * 0.8 / logo.height)
    logo = logo.resize((int(logo.width * scale), int(logo.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    canvas.paste(logo, ((w - logo.width) // 2, (h - logo.height) // 2), logo)
    paint = np.asarray(canvas).astype(float) / 255
    # Paint wear: flaked in patches, scratched along the grain, faded.
    flake = np.clip((noise(1024, 5, 8, seed=371)[:h, :w] - 0.12) * 4.0, 0.55, 1)
    scratches = (noise(1024, 3, 64, seed=372)[:h, :w] > 0.7) * 0.6
    alpha = paint[..., 3] * flake * (1 - scratches) * 0.92
    colour = paint[..., :3] * 0.82 + wood * 0.18
    out = wood * (1 - alpha[..., None]) + colour * alpha[..., None]
    grime = noise(1024, 4, 4, seed=373)[:h, :w][..., None] * 0.22
    out *= 1 - grime
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGB").save(os.path.join(OUT, "sign_logo.png"))


if __name__ == "__main__":
    bark()
    leaf_cluster("leaves_broad", 15, 0.36, 0.34, seed=401)
    leaf_cluster("leaves_canopy", 22, 0.26, 0.38, seed=402)
    leaf_cluster("leaves_understory", 9, 0.46, 0.42, seed=403)
    frond("frond_palm", 404, pinnae=34, leaflet=0.44, droop=0.55)
    frond("frond_fern", 405, pinnae=28, leaflet=0.26, droop=0.15, colors=((44, 82, 30), (70, 104, 40)), lobed=True)
    forest_floor()
    trail_mud()
    mossy_rock()
    ruin_stone()
    wet_planks()
    water()
    hut_tin()
    sign_logo()
    print("textures:", len(os.listdir(OUT)))
