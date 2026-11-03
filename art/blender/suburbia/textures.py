"""
Procedural PBR textures for SUBURBAN SHOWDOWN (deterministic, seeded).

  python3 art/blender/suburbia/textures.py      # writes art/blender/suburbia/build/tex/*.png

Reuses the shared generators: Dustfront's (art/blender/map/textures.py: concrete, wood, plaster,
the PVPSPINARENA banners from public/brand/arena-logo-email.png) and CROSSFIRE's (brick,
asphalt). Adds the suburban set: lap siding, asphalt shingles, lawn, clipped hedge, privacy-fence
boards, interior floorboards, sidewalk with expansion joints, the violet PVPSPINARENA wraps for
the truck, the storage container, the bus and the billboard, the monument sign, the distant
street facades and a ground decal atlas (oil, manhole, cracks, road paint).
"""
import importlib.util, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
OUT = os.path.join(HERE, "build", "tex")


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


MT = _load("dust_textures", os.path.join(HERE, "..", "map", "textures.py"))
MT.OUT = OUT
CT = _load("crossfire_textures", os.path.join(HERE, "..", "crossfire", "textures.py"))
CT.OUT = OUT
CT.MT.OUT = OUT
noise, normal_from_height, tint = MT.noise, MT.normal_from_height, MT.tint
MT.HALF.update({"brick", "boards", "floor", "wood", "concrete", "plaster", "interior_n", "siding_n", "siding_r", "shingles_n", "grass_n", "hedge_n", "boards_n", "floor_n",
                "sidewalk_n", "sidewalk_r", "brick_r", "asphalt_r", "brick_n", "asphalt_n", "facade_sub"})
CT.MT.HALF.update(MT.HALF)
VIOLET = np.array([0.42, 0.16, 0.86])
VIOLET_DEEP = np.array([0.16, 0.05, 0.36])
LOGO = Image.open(os.path.join(ROOT, "public/brand/arena-logo-email.png")).convert("RGBA")


def save(name, arr, mode="RGB"):
    MT.save(name, arr, mode)


def font(size):
    for f in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def siding():
    """Horizontal lap siding (white; tinted per house), 8 boards per tile (1 tile = 1.6 m)."""
    n = 1024
    y, x = np.mgrid[0:n, 0:n] / n
    f = (y * 8) % 1
    lip = np.clip((f - 0.86) / 0.14, 0, 1)            # shadow line under each board's lap
    grain = noise(n, 5, 24, seed=201)
    streak = noise(n, 4, 4, seed=202)
    base = 0.86 + 0.06 * grain - 0.04 * streak
    shade = 1 - 0.45 * lip ** 2
    alb = np.dstack([base * shade, base * shade * 0.995, base * shade * 0.985])
    dirt = np.clip((noise(n, 4, 3, seed=203) - 0.55) * 2, 0, 1) * (y ** 2)
    alb = alb * (1 - 0.12 * dirt[..., None])
    h = f * 0.8 - lip * 0.9 + grain * 0.05
    save("siding", alb)
    save("siding_n", normal_from_height(h, 6.0))
    save("siding_r", 0.55 + 0.25 * grain + 0.1 * lip)


def shingles():
    n = 1024
    y, x = np.mgrid[0:n, 0:n] / n
    rows = 10
    row = np.floor(y * rows).astype(int)
    off = (row % 2) * 0.5 / 6
    col = np.floor(((x + off) % 1) * 6).astype(int)
    fy = y * rows - row
    fx = ((x + off) % 1) * 6 - col
    tab = np.random.default_rng(211).random((rows, 6))[row % rows, col % 6]
    grit = np.random.default_rng(212).random((n, n))
    base = 0.20 + 0.10 * tab + 0.06 * grit
    gap = (np.minimum(fx, 1 - fx) < 0.025) & (fy > 0.45)
    edge = np.clip((fy - 0.88) / 0.12, 0, 1)
    shade = (1 - 0.5 * edge) * np.where(gap, 0.45, 1.0)
    alb = np.dstack([base * shade * 1.0, base * shade * 0.98, base * shade * 1.04])
    moss = np.clip((noise(n, 4, 3, seed=213) - 0.62) * 2.5, 0, 1)
    alb = alb * (1 - 0.3 * moss[..., None]) + np.array([0.18, 0.2, 0.12]) * 0.3 * moss[..., None]
    h = fy * 0.6 - gap * 0.5 + grit * 0.15
    save("shingles", alb)
    save("shingles_n", normal_from_height(h, 5.0))


def grass():
    n = 1024
    blades = np.random.default_rng(221).random((n, n))
    m1, m2, m3 = noise(n, 5, 6, seed=222), noise(n, 4, 24, seed=223), noise(n, 3, 2, seed=224)
    g = tint(m1 * 0.6 + blades * 0.4, (0.20, 0.32, 0.10), (0.36, 0.50, 0.16))
    dry = np.clip((m3 - 0.58) * 2.5, 0, 1)
    g = g * (1 - 0.45 * dry[..., None]) + np.array([0.50, 0.48, 0.26]) * 0.45 * dry[..., None]
    g = g * (0.85 + 0.25 * m2)[..., None]
    save("grass", g)
    save("grass_n", normal_from_height(blades * 0.7 + m2 * 0.3, 2.5))


def hedge():
    n = 512
    leaves = noise(n, 6, 32, seed=231)
    clumps = noise(n, 4, 6, seed=232)
    holes = np.clip((0.3 - leaves) * 4, 0, 1)
    g = tint(leaves * 0.7 + clumps * 0.3, (0.07, 0.18, 0.05), (0.22, 0.40, 0.12))
    g = g * (1 - 0.6 * holes[..., None])
    save("hedge", g)
    save("hedge_n", normal_from_height(leaves * 0.8 + clumps * 0.2, 7.0))


def boards():
    """Vertical privacy-fence boards (1 tile = 1.2 m: 8 boards)."""
    n = 1024
    y, x = np.mgrid[0:n, 0:n] / n
    f = (x * 8) % 1
    gap = np.minimum(f, 1 - f) < 0.02
    ids = np.random.default_rng(241).random(8)[np.floor(x * 8).astype(int) % 8]
    grain = 0.5 + 0.5 * np.sin((x * 8 + noise(n, 3, 8, seed=242) * 0.6) * np.pi * 14)
    base = tint(ids * 0.5 + grain * 0.5, (0.42, 0.30, 0.19), (0.58, 0.43, 0.28))
    weather = np.clip((noise(n, 4, 3, seed=243) - 0.5) * 2, 0, 1) * y
    base = base * (1 - 0.25 * weather[..., None]) + np.array([0.5, 0.5, 0.48]) * 0.25 * weather[..., None]
    base[gap] *= 0.35
    h = grain * 0.3 - gap * 0.8
    save("boards", base)
    save("boards_n", normal_from_height(h, 4.0))


def floor():
    """Interior floorboards (oak), 1 tile = 1.6 m."""
    n = 1024
    y, x = np.mgrid[0:n, 0:n] / n
    rows = 10
    row = np.floor(y * rows).astype(int)
    off = np.random.default_rng(251).random(rows)[row % rows]
    fx = (x + off) % 1
    seam = (np.minimum(y * rows - row, 1 - (y * rows - row)) < 0.03) | (np.minimum(fx * 2 % 1, 1 - fx * 2 % 1) < 0.006)
    ids = np.random.default_rng(252).random((rows, 2))[row % rows, np.floor(fx * 2).astype(int) % 2]
    grain = 0.5 + 0.5 * np.sin((y * rows * 2 + noise(n, 3, 12, seed=253) * 1.5) * np.pi * 6)
    base = tint(ids * 0.5 + grain * 0.5, (0.45, 0.29, 0.16), (0.62, 0.44, 0.26))
    base[seam] *= 0.5
    save("floor", base)
    save("floor_n", normal_from_height(grain * 0.2 - seam * 0.8, 3.0))


def interior():
    """Interior paint: near-white with a faint roller stipple (tinted per house)."""
    n = 512
    m, fine = noise(n, 5, 3, seed=311), noise(n, 6, 48, seed=312)
    base = 0.86 + 0.04 * m + 0.03 * fine
    save("interior", np.dstack([base, base * 0.99, base * 0.97]))
    save("interior_n", normal_from_height(fine * 0.5 + m * 0.2, 1.2))


def sidewalk():
    n = 1024
    y, x = np.mgrid[0:n, 0:n] / n
    m, fine = noise(n, 6, 4, seed=261), noise(n, 7, 48, seed=262)
    base = 0.62 + 0.08 * m + 0.06 * fine
    joint = (np.minimum((x * 2) % 1, 1 - (x * 2) % 1) < 0.006) | (np.minimum((y * 2) % 1, 1 - (y * 2) % 1) < 0.006)
    base = np.where(joint, base * 0.55, base)
    stain = np.clip((noise(n, 4, 6, seed=263) - 0.6) * 2, 0, 1)
    alb = np.dstack([base, base * 0.99, base * 0.96]) * (1 - 0.2 * stain[..., None])
    save("sidewalk", alb)
    save("sidewalk_n", normal_from_height(fine * 0.4 - joint * 0.8, 3.0))
    save("sidewalk_r", 0.85 + 0.08 * fine)


def asphalt():
    """Residential asphalt: fine aggregate, a few sealed patches and faint hairline cracks
    (calmer than CROSSFIRE's worn city asphalt)."""
    n = 1024
    m1, m2, m3 = noise(n, 5, 6, seed=301), noise(n, 4, 64, seed=302), noise(n, 3, 3, seed=303)
    grain = np.random.default_rng(304).random((n, n))
    base = 0.17 + 0.05 * m2 + 0.05 * grain
    patch = (m3 > 0.66).astype(float)
    base = base * (1 - 0.18 * patch)
    alb = np.dstack([base, base * 0.98, base * 0.96])
    ridge = 1 - np.abs(noise(n, 4, 8, seed=305) - 0.5) * 2
    crack = np.clip((ridge - 0.985) * 40, 0, 1) * (m1 > 0.55)
    alb = alb * (1 - 0.45 * crack[..., None])
    h = grain * 0.5 + m2 * 0.3 - crack * 0.5
    save("asphalt", alb)
    save("asphalt_n", normal_from_height(h, 2.0))
    save("asphalt_r", 0.8 + 0.12 * grain - 0.08 * patch)


def logo_on(img, box, height_frac=0.8):
    """Paste the PVPSPINARENA logo into box (x0, y0, x1, y1) of a PIL image, centred."""
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    s = min(bw / LOGO.width, bh * height_frac / LOGO.height)
    lw, lh = int(LOGO.width * s), int(LOGO.height * s)
    img.alpha_composite(LOGO.resize((lw, lh), Image.LANCZOS), (x0 + (bw - lw) // 2, y0 + (bh - lh) // 2))


def wrap(name, w, h, tagline=None, stripe=True):
    """Brand wrap: near-black violet base (the logo's violet and white read on it), a violet
    glow behind the logo, a light streak, violet stripes, the logo, optional tagline."""
    y, x = np.mgrid[0:h, 0:w] / np.array([h, w])[:, None, None]
    base = np.array([0.045, 0.035, 0.075])[None, None] * (0.85 + 0.3 * noise(256, 3, 4, seed=270)[
        (y * 255).astype(int), (x * 255).astype(int)])[..., None]
    glow = np.exp(-(((x - 0.5) * w / h) ** 2 * 0.5 + (y - 0.42) ** 2) / 0.09) * 0.35
    base = base + glow[..., None] * VIOLET
    streak = np.exp(-((y - 0.8 - (x - 0.5) * 0.35) ** 2) / 0.0015) * 0.55
    base = base + streak[..., None] * np.array([0.55, 0.35, 0.95])
    if stripe:
        base[(y > 0.9) & (y < 0.935)] = VIOLET * 1.1
        base[(y > 0.945) & (y < 0.955)] = np.array([0.85, 0.8, 0.95])
    img = Image.fromarray((np.clip(base, 0, 1) * 255).astype(np.uint8), "RGB").convert("RGBA")
    logo_on(img, (int(w * 0.08), int(h * 0.06), int(w * 0.92), int(h * (0.72 if tagline else 0.88))))
    if tagline:
        d = ImageDraw.Draw(img)
        size = int(h * 0.075)
        while d.textlength(tagline, font=font(size)) > w * 0.86:
            size -= 2
        fnt = font(size)
        tw = d.textlength(tagline, font=fnt)
        d.text(((w - tw) / 2, h * 0.75), tagline, font=fnt, fill=(240, 232, 255, 255))
    img.convert("RGB").save(os.path.join(OUT, name + ".png"))


def wraps():
    wrap("truck_wrap", 1024, 512, "1V1 AIM ARENA  ·  PVPSPINARENA.COM")
    wrap("container_wrap", 512, 512, "PORTABLE ARENA STORAGE")
    wrap("billboard", 1024, 384, "JOIN THE 1V1 AIM ARENA")
    wrap("bus_wrap", 1024, 256, None, stripe=False)
    # Monument sign face: stone panel with the logo and "SUBURBAN SHOWDOWN".
    w, h = 1024, 384
    m = noise(512, 5, 6, seed=271)
    stone = tint(np.array(Image.fromarray((m * 255).astype(np.uint8)).resize((w, h))) / 255.0,
                 (0.18, 0.17, 0.2), (0.27, 0.25, 0.3))
    img = Image.fromarray((np.clip(stone, 0, 1) * 255).astype(np.uint8), "RGB").convert("RGBA")
    d = ImageDraw.Draw(img)
    d.rectangle((18, 18, w - 18, h - 18), outline=(150, 90, 240, 255), width=8)
    logo_on(img, (60, 30, w - 60, int(h * 0.72)))
    fnt = font(46)
    t = "SUBURBAN SHOWDOWN"
    d.text(((w - d.textlength(t, font=fnt)) / 2, h * 0.74), t, font=fnt, fill=(235, 228, 250, 255))
    img.convert("RGB").save(os.path.join(OUT, "monument.png"))


def facade_sub():
    """Distant houses: siding with a 2-storey window grid (tile = 4 bays x 2 storeys, 3 m each)."""
    n = 1024
    y, x = np.mgrid[0:n, 0:n] / n
    gx, gy = (x * 4) % 1, (y * 2) % 1
    cell = (np.floor(x * 4) + 4 * np.floor(y * 2)).astype(int)
    rnd = np.random.default_rng(281).random(8)[cell]
    lap = np.clip((((y * 2 * 14) % 1) - 0.85) / 0.15, 0, 1)
    wall = (0.80 - 0.25 * lap)[..., None] * np.array([1.0, 0.98, 0.95])
    win = (np.abs(gx - 0.5) < 0.18) & (gy > 0.3) & (gy < 0.75) & (rnd > 0.2)
    frame = (np.abs(gx - 0.5) < 0.21) & (gy > 0.27) & (gy < 0.78) & ~win & (rnd > 0.2)
    shutter = ((np.abs(gx - 0.27) < 0.05) | (np.abs(gx - 0.73) < 0.05)) & (gy > 0.3) & (gy < 0.75) & (rnd > 0.2)
    glass = np.dstack([0.12 + 0.1 * gy, 0.15 + 0.1 * gy, 0.2 + 0.1 * gy])
    wall = np.where(win[..., None], glass, wall)
    wall = np.where(frame[..., None], np.array([0.95, 0.95, 0.93]), wall)
    wall = np.where(shutter[..., None], np.array([0.25, 0.12, 0.45]), wall)
    save("facade_sub", wall)


def decals():
    """Ground decal atlas 4 x 2: 0 oil stain, 1 manhole, 2 cracks, 3 tyre marks, 4 drain grate,
    5 road arrow, 6 leaves, 7 storm-drain stencil."""
    C = 256
    out = np.zeros((C * 2, C * 4, 4))
    yy, xx = np.mgrid[0:C, 0:C] / C
    r = np.hypot(xx - 0.5, yy - 0.5)
    n1 = noise(C, 4, 6, seed=291)

    def put(i, rgb, a):
        cx, cy = (i % 4) * C, (i // 4) * C
        out[cy:cy + C, cx:cx + C, :3] = rgb
        out[cy:cy + C, cx:cx + C, 3] = np.clip(a, 0, 1)

    put(0, np.dstack([0.04 + 0.03 * n1] * 3), np.clip((0.42 - r - (n1 - 0.5) * 0.25) * 6, 0, 0.8))
    ring = (r < 0.46).astype(float)
    grid = ((np.floor(xx * 14) + np.floor(yy * 14)) % 2) * 0.08
    put(1, np.dstack([0.22 + grid + 0.05 * n1] * 3) * (1 - 0.4 * ((r > 0.42) & (r < 0.46))[..., None]), ring)
    ridge = 1 - np.abs(noise(C, 4, 5, seed=292) - 0.5) * 2
    put(2, np.dstack([0.08 * np.ones((C, C))] * 3), (ridge > 0.95) * 0.9)
    tyre = ((np.abs(xx - 0.35) < 0.06) | (np.abs(xx - 0.65) < 0.06)) * (0.4 + 0.3 * n1)
    put(3, np.dstack([0.05 * np.ones((C, C))] * 3), tyre * 0.6)
    bars = ((np.abs(xx - 0.5) < 0.42) & (np.abs(yy - 0.5) < 0.25)).astype(float)
    slots = ((xx * 12) % 1 < 0.5) & (bars > 0)
    put(4, np.dstack([np.where(slots, 0.03, 0.25)] * 3), bars)
    arrow = (((np.abs(xx - 0.5) < 0.08) & (yy > 0.35)) | ((yy < 0.4) & (yy > 0.08) & (np.abs(xx - 0.5) < (0.4 - yy) * 0.9))).astype(float)
    put(5, np.dstack([0.92 * np.ones((C, C))] * 3), arrow * (0.75 + 0.25 * n1))
    lv = (noise(C, 4, 24, seed=293) > 0.7).astype(float) * np.clip(1.2 - r * 2.2, 0, 1)
    put(6, np.dstack([0.45 + 0.2 * n1, 0.28 + 0.1 * n1, 0.08 + 0 * n1]), lv)
    img = Image.new("RGBA", (C, C), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fnt = font(28)
    for k, t in enumerate(("NO DUMPING", "DRAINS TO", "CREEK")):
        d.text(((C - d.textlength(t, font=fnt)) / 2, 60 + k * 44), t, font=fnt, fill=(235, 235, 240, 220))
    st = np.array(img).astype(float) / 255
    put(7, st[..., :3], st[..., 3])
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGBA").save(os.path.join(OUT, "decals.png"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for f in (MT.concrete, MT.wood, MT.plaster, MT.banner, MT.corrugated, CT.brick, asphalt,
              siding, shingles, grass, hedge, boards, floor, interior, sidewalk, wraps, facade_sub, decals):
        f()
        print("wrote", f.__name__)
