"""
Procedural PBR textures for CROSSFIRE (deterministic, seeded).

  python3 art/blender/crossfire/textures.py      # writes art/blender/crossfire/build/tex/*.png

Reuses the Dustfront generator (art/blender/map/textures.py) for the shared sun-baked set
(sandstone, plaster, paving, concrete, corrugated metal, wood, canvas, roof tiles, palms, the
PVPSPINARENA banners, hazard stripes) and adds the urban set: brick, asphalt, terrazzo tiles,
rust, a shop-sign / terminal signage atlas and the weathered Mi-8 paint.
"""
import importlib.util, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "build", "tex")
spec = importlib.util.spec_from_file_location("dust_textures", os.path.join(HERE, "..", "map", "textures.py"))
MT = importlib.util.module_from_spec(spec)
spec.loader.exec_module(MT)
MT.OUT = OUT
noise, normal_from_height, blocks, tint = MT.noise, MT.normal_from_height, MT.blocks, MT.tint
# Normal maps and the far-background facades at half resolution (texture memory budget).
MT.HALF.update({"brick_r", "asphalt_r", "tiles_r", "rust_n", "rust_r", "brick_n", "asphalt_n", "tiles_n", "paving_n",
                "sandstone_n", "facade", "facade_ind"})


def save(name, arr, mode="RGB"):
    MT.save(name, arr, mode)


def brick():
    n = 1024
    bevel, ids, mortar = blocks(n, 16, 8, 0.018, seed=21)
    m1, m2 = noise(n, 5, 8, seed=22), noise(n, 4, 32, seed=23)
    base = tint(ids, (0.55, 0.27, 0.18), (0.70, 0.40, 0.27))
    base = base * (0.82 + 0.3 * m2[..., None])
    soot = np.clip((m1 - 0.55) * 2.5, 0, 1)
    base = base * (1 - 0.35 * soot[..., None])
    mor = np.array([0.66, 0.62, 0.56]) * (0.85 + 0.2 * m2[..., None])
    alb = base * (1 - mortar[..., None]) + mor * mortar[..., None]
    h = bevel * 0.8 + m2 * 0.2 - mortar * 0.4
    save("brick", alb)
    save("brick_n", normal_from_height(h, 5.0))
    save("brick_r", 0.78 + 0.15 * mortar + 0.05 * m2)


def asphalt():
    n = 1024
    m1, m2, m3 = noise(n, 5, 6, seed=31), noise(n, 4, 64, seed=32), noise(n, 3, 3, seed=33)
    grain = np.random.default_rng(34).random((n, n))
    base = 0.20 + 0.09 * m2 + 0.05 * grain
    patch = (m3 > 0.62).astype(float)
    base = base * (1 - 0.25 * patch) + 0.02 * patch
    dust = np.clip((m1 - 0.45) * 1.6, 0, 1)
    alb = np.dstack([base, base * 0.97, base * 0.93])
    alb = alb * (1 - 0.45 * dust[..., None]) + np.array([0.58, 0.50, 0.40]) * 0.45 * dust[..., None]
    # Hairline cracks: thresholded ridges of a mid-frequency noise.
    ridge = 1 - np.abs(noise(n, 4, 10, seed=35) - 0.5) * 2
    crack = np.clip((ridge - 0.96) * 30, 0, 1)
    alb = alb * (1 - 0.6 * crack[..., None])
    h = grain * 0.4 + m2 * 0.4 - crack * 0.6
    save("asphalt", alb)
    save("asphalt_n", normal_from_height(h, 2.5))
    save("asphalt_r", 0.82 + 0.1 * grain - 0.1 * patch)


def tiles():
    """Terrazzo floor tiles (terminal / residential ground floors)."""
    n = 1024
    y, x = np.mgrid[0:n, 0:n] / n
    k = 4
    gx, gy = (x * k) % 1, (y * k) % 1
    grout = ((gx < 0.012) | (gx > 0.988) | (gy < 0.012) | (gy > 0.988)).astype(float)
    chips = (np.random.default_rng(41).random((n, n)) > 0.985).astype(float)
    m = noise(n, 4, 16, seed=42)
    base = np.dstack([0.72 + 0.06 * m, 0.69 + 0.06 * m, 0.63 + 0.05 * m])
    base = base * (1 - 0.35 * chips[..., None]) * (1 - 0.45 * grout[..., None])
    dirt = np.clip((noise(n, 5, 4, seed=43) - 0.5) * 2, 0, 1)
    base = base * (1 - 0.3 * dirt[..., None])
    save("tiles", base)
    save("tiles_n", normal_from_height(-grout * 0.6 + m * 0.1, 3.0))
    save("tiles_r", 0.35 + 0.35 * dirt + 0.2 * grout)


def rust():
    n = 512
    m1, m2 = noise(n, 5, 8, seed=51), noise(n, 4, 32, seed=52)
    base = tint(m1, (0.36, 0.17, 0.08), (0.56, 0.30, 0.13)) * (0.8 + 0.3 * m2[..., None])
    save("rust", base)
    save("rust_n", normal_from_height(m2 * 0.7 + m1 * 0.3, 4.0))
    save("rust_r", 0.82 + 0.15 * m2)


def signs():
    """Signage atlas (4 x 2 cells of 256 x 128): shop signs, terminal signs (no real brands)."""
    W, H = 1024, 256
    img = Image.new("RGB", (W, H), (30, 30, 30))
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 46)
        small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 30)
    except OSError:
        font = small = ImageFont.load_default()
    cells = [
        ((32, 110, 64), "PHARMACY", (240, 240, 230), "+"),
        ((150, 40, 30), "CAFE", (250, 220, 170), None),
        ((20, 60, 120), "MOBILE", (230, 230, 240), None),
        ((200, 140, 30), "BAKERY", (60, 30, 10), None),
        ((25, 70, 120), "BUS TERMINAL", (245, 245, 245), None),
        ((40, 40, 40), "EXIT", (90, 220, 120), None),
        ((210, 190, 150), "MARKET", (90, 50, 20), None),
        ((120, 30, 30), "NO ENTRY", (245, 240, 230), None),
    ]
    for i, (bg, text, fg, mark) in enumerate(cells):
        x0, y0 = (i % 4) * 256, (i // 4) * 128
        d.rectangle([x0 + 4, y0 + 4, x0 + 251, y0 + 123], fill=bg, outline=(20, 20, 20), width=6)
        f = font if len(text) <= 8 else small
        tw = d.textlength(text, font=f)
        d.text((x0 + 128 - tw / 2, y0 + 64 - f.size / 2 - 4), text, fill=fg, font=f)
        if mark:
            d.text((x0 + 18, y0 + 30), mark, fill=fg, font=font)
    arr = np.asarray(img).astype(float) / 255
    grime = noise(W, 4, 8, seed=61)[:H, :W] if False else np.tile(noise(256, 4, 8, seed=61), (1, 4))
    arr = arr * (0.78 + 0.22 * grime[..., None])
    save("signs", arr)


def mi8():
    """The Mi-8 colour map, weathered: sun-faded, dusty, soot-streaked, scratched."""
    src = Image.open(os.path.join(HERE, "source", "mi8", "textures", "bo2_mtl_mi8_desert_baseColor.png")).convert("RGB")
    a = np.asarray(src).astype(float) / 255
    h, w = a.shape[:2]
    m = np.asarray(Image.fromarray((noise(512, 5, 6, seed=71) * 255).astype(np.uint8)).resize((w, h))) / 255
    fine = np.asarray(Image.fromarray((noise(512, 3, 48, seed=72) * 255).astype(np.uint8)).resize((w, h))) / 255
    grey = a.mean(axis=2, keepdims=True)
    a = a * 0.8 + grey * 0.2                       # sun-faded
    soot = np.clip((m - 0.58) * 3.0, 0, 1)[..., None]
    a = a * (1 - 0.65 * soot)                      # fire soot
    dust = np.clip((fine - 0.5) * 2, 0, 1)[..., None]
    a = a * (1 - 0.25 * dust) + np.array([0.62, 0.54, 0.42]) * 0.25 * dust
    scratch = (np.random.default_rng(73).random((h, w)) > 0.996)[..., None]
    a = np.where(scratch, a * 0.5 + 0.35, a)
    save("mi8", a)
    save("mi8_r", 0.62 + 0.25 * soot[..., 0] + 0.1 * fine)


def decals():
    """Decal atlas, RGBA, 4 x 2 cells of 256 x 256 (alpha-tested): 0 scorch, 1 oil stain,
    2 road paint stripe, 3 road arrow, 4 graffiti tag, 5 torn poster, 6 bullet holes, 7 cracks."""
    C = 256
    out = np.zeros((2 * C, 4 * C, 4))
    y, x = np.mgrid[0:C, 0:C] / C
    r = np.hypot(x - 0.5, y - 0.5) * 2
    rng = np.random.default_rng(81)

    def put(i, rgb, a):
        r0, c0 = (i // 4) * C, (i % 4) * C
        out[r0:r0 + C, c0:c0 + C, :3] = rgb
        out[r0:r0 + C, c0:c0 + C, 3] = np.clip(a, 0, 1)

    n1, n2 = noise(C, 5, 4, seed=82), noise(C, 4, 16, seed=83)
    # 0 scorch: soot, darker in the middle, ragged edge.
    a = np.clip((1 - r) * 1.6 + (n1 - 0.5) * 1.2, 0, 1)
    put(0, np.dstack([0.05 + 0.04 * n2] * 3), (a > 0.35) * 1.0)
    # 1 oil / water stain.
    a = np.clip((0.8 - r) * 2 + (n1 - 0.5) * 1.5, 0, 1)
    put(1, np.dstack([0.07 + 0.03 * n2, 0.065 + 0.03 * n2, 0.06 + 0.02 * n2]), (a > 0.5) * 1.0)
    # 2 worn road paint stripe (fills the cell; worn patches drop out).
    wear = noise(C, 5, 12, seed=84)
    put(2, np.dstack([0.86 * np.ones((C, C)), 0.84 * np.ones((C, C)), 0.76 * np.ones((C, C))]),
        ((wear > 0.32) & (np.abs(x - 0.5) < 0.46)) * 1.0)
    # 3 arrow.
    arrow = ((np.abs(x - 0.5) < 0.12) & (y > 0.35) & (y < 0.95)) | ((y < 0.4) & (y > 0.05) & (np.abs(x - 0.5) < (0.4 - y) * 1.1))
    put(3, np.dstack([0.86 * np.ones((C, C)), 0.84 * np.ones((C, C)), 0.76 * np.ones((C, C))]), (arrow & (wear > 0.3)) * 1.0)
    # 4 graffiti tag: spray strokes (purple core, white outline) spelling an abstract tag.
    img = Image.new("RGBA", (C, C), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    try:
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 92)
    except OSError:
        f = ImageFont.load_default()
    for dx, dy in ((-5, 0), (5, 0), (0, -5), (0, 5), (-4, -4), (4, 4)):
        d.text((26 + dx, 70 + dy), "PVP", fill=(240, 240, 235, 255), font=f)
    d.text((26, 70), "PVP", fill=(140, 50, 220, 255), font=f)
    for k in range(9):  # drips
        xx = 40 + k * 22 + int(rng.integers(0, 10))
        d.line([(xx, 150), (xx, 150 + int(rng.integers(10, 60)))], fill=(140, 50, 220, 255), width=3)
    g = np.asarray(img).astype(float) / 255
    put(4, g[..., :3], (g[..., 3] > 0.5) * (n2 > 0.2))
    # 5 torn poster: paper with a logo block and lines of text, ragged torn edge.
    paper = np.dstack([0.86 * np.ones((C, C)), 0.82 * np.ones((C, C)), 0.72 * np.ones((C, C))]) * (0.8 + 0.2 * n2[..., None])
    block = (np.abs(x - 0.5) < 0.36) & (y > 0.1) & (y < 0.45)
    paper[block] = np.array([0.32, 0.12, 0.55])
    for ty in (0.55, 0.64, 0.73, 0.82):
        paper[(np.abs(y - ty) < 0.018) & (np.abs(x - 0.5) < 0.34 - 0.12 * (ty > 0.7))] = 0.12
    torn = (np.abs(x - 0.5) < 0.42 + 0.05 * (n1 - 0.5)) & (y > 0.04) & (y < 0.96 - 0.25 * np.clip(x - 0.55, 0, 1) - 0.08 * n1)
    put(5, paper, torn * 1.0)
    # 6 bullet holes: dark cores with chipped light rings.
    rgb = np.zeros((C, C, 3))
    a = np.zeros((C, C))
    for _ in range(14):
        cx, cy = rng.uniform(0.1, 0.9, 2)
        rr = np.hypot(x - cx, y - cy)
        ring = (rr < 0.045) & (rr >= 0.018)
        core = rr < 0.018
        rgb[ring] = 0.75
        a[ring] = (n2[ring] > 0.3)
        rgb[core] = 0.03
        a[core] = 1
    put(6, rgb, a)
    # 7 cracks: thin dark ridges.
    ridge = 1 - np.abs(noise(C, 4, 6, seed=85) - 0.5) * 2
    put(7, np.dstack([0.08 * np.ones((C, C))] * 3), ((ridge > 0.955) & (r < 0.95)) * 1.0)
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGBA").save(os.path.join(OUT, "decals.png"))


def facade():
    """Distant city blocks: a plaster wall with a 4 x 4 window grid (one texture tile = 4 bays
    x 4 storeys, 3.2 m each); a few windows have shutters closed or AC units."""
    n = 1024
    y, x = np.mgrid[0:n, 0:n] / n
    m1, m2 = noise(n, 5, 4, seed=121), noise(n, 4, 32, seed=122)
    wall = tint(m1, (0.70, 0.62, 0.50), (0.82, 0.74, 0.60)) * (0.88 + 0.16 * m2[..., None])
    gx, gy = (x * 4) % 1, (y * 4) % 1
    win = (np.abs(gx - 0.5) < 0.2) & (gy > 0.3) & (gy < 0.8)
    frame = (np.abs(gx - 0.5) < 0.23) & (gy > 0.27) & (gy < 0.83) & ~win
    cell = (np.floor(x * 4) + 4 * np.floor(y * 4)).astype(int)
    rnd = np.random.default_rng(123).random(16)[cell]
    glass = np.dstack([0.06 + 0.05 * m2, 0.07 + 0.05 * m2, 0.08 + 0.05 * m2])
    shutter = np.dstack([0.32 + 0.1 * m2, 0.42 + 0.1 * m2, 0.40 + 0.1 * m2])
    pane = np.where((rnd > 0.7)[..., None], shutter, glass)
    wall = np.where(win[..., None], pane, wall)
    wall = np.where(frame[..., None], wall * 0.7, wall)
    sill = (np.abs(gx - 0.5) < 0.25) & (np.abs(gy - 0.84) < 0.015)
    wall[sill] = wall[sill] * 1.15
    stain = np.clip((noise(n, 5, 8, seed=124) - 0.6) * 2, 0, 1)
    wall = wall * (1 - 0.3 * stain[..., None])
    save("facade", wall)
    # Industrial: corrugated panels with a strip-window band.
    ind = tint(m1, (0.50, 0.53, 0.54), (0.62, 0.64, 0.64)) * (0.9 + 0.1 * np.sin(x * np.pi * 2 * 48)[..., None])
    band = (gy > 0.55) & (gy < 0.72)
    ind[band] = glass[band]
    ind = ind * (1 - 0.35 * stain[..., None])
    save("facade_ind", ind)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for f in (MT.sandstone, MT.plaster, MT.paving, MT.concrete, MT.corrugated, MT.wood, MT.canvas,
              MT.roof_tiles, MT.palm, MT.banner, MT.stencil, brick, asphalt, tiles, rust, signs, mi8, decals, facade):
        f()
        print("wrote", f.__name__)
