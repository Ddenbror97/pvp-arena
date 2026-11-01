"""
Procedural PBR textures for the PVPSPINARENA aim arena (deterministic, seeded).

  python3 art/blender/map/textures.py      # writes art/blender/map/build/tex/*.png

Every texture tiles seamlessly. Albedo is sRGB; *_n.png are OpenGL tangent-space normals
(+Y up, as glTF expects); *_r.png are linear roughness. World sizes (metres per tile) live in
arena_kit.TILE so texel density stays near 512 px/m on walls and floors.
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "build", "tex")
rng = np.random.default_rng(1337)


def noise(n, octaves=5, base=4, persistence=0.55, seed=None):
    """Tileable value noise in [0, 1] (sum of bilinearly upsampled periodic lattices)."""
    r = np.random.default_rng(seed) if seed is not None else rng
    out = np.zeros((n, n))
    amp, total = 1.0, 0.0
    for o in range(octaves):
        cells = base * 2**o
        if cells > n:
            break
        lattice = r.random((cells, cells))
        # Periodic bilinear upsample.
        xs = np.arange(n) * cells / n
        i0 = np.floor(xs).astype(int) % cells
        i1 = (i0 + 1) % cells
        f = xs - np.floor(xs)
        f = f * f * (3 - 2 * f)
        rows = lattice[i0] * (1 - f)[:, None] + lattice[i1] * f[:, None]
        layer = rows[:, i0] * (1 - f)[None, :] + rows[:, i1] * f[None, :]
        out += layer * amp
        total += amp
        amp *= persistence
    return out / total


def normal_from_height(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    # Image rows run downward; OpenGL +Y (green) points up the texture.
    n = np.dstack([-dx, dy, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n * 0.5 + 0.5


# Maps whose detail is low-frequency ship at 512 px (GPU budget); albedo and the hero
# masonry/paving normals stay at 1024.
HALF = {"plaster_n", "concrete_n", "wood_n", "corrugated_n", "sandstone_r", "paving_r", "concrete_r", "corrugated_r"}


def save(name, arr, mode="RGB"):
    arr = np.clip(arr, 0, 1)
    img = Image.fromarray((arr * 255 + 0.5).astype(np.uint8), mode if arr.ndim == 3 else "L")
    if name in HALF and img.width > 512:
        img = img.resize((512, 512), Image.LANCZOS)
    img.save(os.path.join(OUT, name + ".png"))


def tint(mask, a, b):
    a, b = np.array(a), np.array(b)
    return a[None, None] * (1 - mask[..., None]) + b[None, None] * mask[..., None]


def blocks(n, rows, cols, mortar, jitter=0.0, seed=0):
    """Running-bond masonry: returns (height, per-block id value, mortar mask)."""
    r = np.random.default_rng(seed)
    y, x = np.mgrid[0:n, 0:n] / n
    row = np.floor(y * rows).astype(int)
    offset = (row % 2) * 0.5 / cols
    xs = (x + offset) % 1.0
    col = np.floor(xs * cols).astype(int)
    fy = y * rows - row
    fx = xs * cols - col
    edge = np.minimum(np.minimum(fx, 1 - fx) / cols * rows, np.minimum(fy, 1 - fy))
    ids = r.random((rows, cols))[row % rows, col % cols]
    mortar_mask = np.clip(1 - (edge - mortar) / (mortar * 0.6), 0, 1)
    bevel = np.clip(edge / (mortar * 2.5), 0, 1)
    return bevel, ids, mortar_mask


def sandstone():
    n = 1024
    bevel, ids, mortar = blocks(n, 8, 4, 0.035, seed=1)
    grain = noise(n, 7, 8, seed=11)
    pits = (noise(n, 3, 64, seed=12) > 0.78) * 0.6
    stain = noise(n, 4, 2, seed=13)
    base = tint(ids * 0.7 + grain * 0.3, (0.64, 0.54, 0.40), (0.77, 0.67, 0.52))
    base *= (0.86 + 0.14 * grain)[..., None]
    base = base * (1 - 0.25 * stain[..., None] * (np.mgrid[0:n, 0:n][0] / n)[..., None])
    base = base * (1 - mortar[..., None]) + np.array([0.62, 0.55, 0.45]) * mortar[..., None]
    h = bevel * 0.7 + grain * 0.25 - pits * 0.15
    save("sandstone", base)
    save("sandstone_n", normal_from_height(h, 6.0))
    save("sandstone_r", 0.78 + 0.15 * grain - 0.08 * ids)


def plaster():
    n = 1024
    m = noise(n, 6, 3, seed=21)
    fine = noise(n, 6, 32, seed=22)
    drip = noise(n, 3, 8, seed=23) * (np.mgrid[0:n, 0:n][0] / n) ** 3
    base = tint(m, (0.68, 0.61, 0.49), (0.78, 0.72, 0.60)) * (0.92 + 0.08 * fine)[..., None]
    base *= (1 - 0.35 * drip)[..., None]
    chip = (noise(n, 4, 16, seed=24) > 0.82).astype(float)
    base = base * (1 - chip[..., None] * 0.25)
    save("plaster", base)
    save("plaster_n", normal_from_height(fine * 0.6 + m * 0.3 - chip * 0.4, 3.0))


def paving():
    n = 1024
    bevel, ids, grout = blocks(n, 4, 4, 0.02, seed=31)
    # Square flags: undo the running-bond offset by using a grid.
    y, x = np.mgrid[0:n, 0:n] / n
    fx, fy = (x * 4) % 1, (y * 4) % 1
    edge = np.minimum(np.minimum(fx, 1 - fx), np.minimum(fy, 1 - fy))
    grout = np.clip(1 - (edge - 0.012) / 0.01, 0, 1)
    bevel = np.clip(edge / 0.05, 0, 1)
    r = np.random.default_rng(32)
    ids = r.random((4, 4))[np.floor(y * 4).astype(int) % 4, np.floor(x * 4).astype(int) % 4]
    grain = noise(n, 7, 8, seed=33)
    wear = noise(n, 4, 4, seed=34)
    base = tint(ids * 0.6 + grain * 0.4, (0.50, 0.42, 0.31), (0.64, 0.55, 0.42))
    base *= (0.85 + 0.15 * wear)[..., None]
    base = base * (1 - grout[..., None]) + np.array([0.36, 0.31, 0.25]) * grout[..., None]
    save("paving", base)
    save("paving_n", normal_from_height(bevel * 0.6 + grain * 0.2, 5.0))
    save("paving_r", 0.82 + 0.1 * grain - 0.12 * wear * (1 - grout))


def concrete():
    n = 1024
    m = noise(n, 6, 4, seed=41)
    fine = noise(n, 7, 32, seed=42)
    y, x = np.mgrid[0:n, 0:n] / n
    joint = np.clip(1 - np.minimum(np.minimum(x, 1 - x), np.minimum(y, 1 - y)) / 0.004, 0, 1)
    oil = np.clip((noise(n, 4, 3, seed=43) - 0.62) * 4, 0, 1)
    crack = np.clip(1 - np.abs(noise(n, 5, 6, seed=44) - 0.5) / 0.006, 0, 1) * (noise(n, 3, 2, seed=45) > 0.55)
    g = 0.40 + 0.10 * m + 0.05 * fine
    base = np.dstack([g * 0.98, g * 0.97, g * 0.94]) * (1 - 0.45 * oil[..., None])
    base *= (1 - 0.5 * joint - 0.4 * crack)[..., None]
    save("concrete", base)
    save("concrete_n", normal_from_height(fine * 0.4 - joint * 0.8 - crack * 0.6, 4.0))
    save("concrete_r", 0.86 - 0.3 * oil + 0.05 * fine)


def corrugated():
    """Greyscale (tinted by material) ribbed sheet metal with rust and wear."""
    n = 1024
    y, x = np.mgrid[0:n, 0:n] / n
    ribs = 0.5 + 0.5 * np.cos(x * 2 * np.pi * 16)  # 16 ribs per tile
    rust = np.clip((noise(n, 6, 8, seed=51) - 0.64) * 3, 0, 0.75)
    streak = noise(n, 4, 2, seed=52) * np.clip(noise(n, 2, 32, seed=53)[0:1, :] * 1.5 - 0.3, 0, 1)
    dents = noise(n, 4, 8, seed=54)
    g = 0.70 + 0.08 * dents - 0.22 * streak
    base = np.dstack([g, g, g])
    base = base * (1 - rust[..., None]) + np.array([0.42, 0.22, 0.10]) * rust[..., None]
    save("corrugated", base)
    save("corrugated_n", normal_from_height(ribs * 1.0 + dents * 0.15, 5.0))
    save("corrugated_r", 0.45 + 0.4 * rust + 0.1 * dents)


def wood():
    n = 1024
    y, x = np.mgrid[0:n, 0:n] / n
    planks = 6
    pid = np.floor(y * planks).astype(int)
    fy = y * planks - pid
    gap = np.clip(1 - np.minimum(fy, 1 - fy) / 0.03, 0, 1)
    r = np.random.default_rng(61)
    shade = r.random(planks)[pid % planks]
    grain = noise(n, 5, 4, seed=62)
    lines = 0.5 + 0.5 * np.sin((y * 60 + grain * 6 + shade * 10) * np.pi)
    base = tint(shade * 0.5 + lines * 0.3 + grain * 0.2, (0.40, 0.31, 0.21), (0.58, 0.46, 0.32))
    base *= (1 - 0.6 * gap)[..., None]
    knots = (noise(n, 3, 16, seed=63) > 0.86).astype(float)
    base *= (1 - 0.3 * knots)[..., None]
    save("wood", base)
    save("wood_n", normal_from_height(lines * 0.15 - gap * 0.8 + grain * 0.1, 4.0))


def canvas():
    n = 512
    y, x = np.mgrid[0:n, 0:n] / n
    weave = 0.5 + 0.25 * (np.sin(x * 2 * np.pi * 128) + np.sin(y * 2 * np.pi * 128))
    m = noise(n, 5, 4, seed=71)
    # Neutral light canvas: materials tint it (olive tarps, terracotta and sand awnings).
    base = tint(m, (0.78, 0.75, 0.68), (0.92, 0.90, 0.84)) * (0.9 + 0.1 * weave)[..., None]
    save("canvas", base)
    save("canvas_n", normal_from_height(weave * 0.3 + m * 0.4, 3.0))


def roof_tiles():
    n = 512
    y, x = np.mgrid[0:n, 0:n] / n
    rows, cols = 8, 6
    row = np.floor(y * rows)
    fx = (x * cols + (row % 2) * 0.5) % 1
    fy = y * rows - row
    barrel = np.sin(fx * np.pi)
    overlap = np.clip(fy * 1.4, 0, 1)
    m = noise(n, 5, 4, seed=81)
    h = barrel * overlap
    base = tint(m * 0.6 + h * 0.4, (0.50, 0.24, 0.14), (0.72, 0.38, 0.22)) * (0.55 + 0.45 * overlap)[..., None]
    save("rooftiles", base)
    save("rooftiles_n", normal_from_height(h, 6.0))


def palm():
    """Frond atlas (RGBA, alpha-tested) and trunk bark."""
    n = 512
    img = np.zeros((n, n, 4))
    y, x = np.mgrid[0:n, 0:n] / n
    # One frond along the texture's vertical axis: rachis + leaflets.
    rachis = np.abs(x - 0.5) < 0.008
    leaf = np.zeros((n, n), bool)
    for i in range(46):
        t = 0.04 + i * 0.02
        side = 1 if i % 2 else -1
        length = 0.42 * np.sin(np.pi * min(1, t / 0.98)) + 0.05
        # Leaflet: thin wedge angled forward from the rachis.
        u = (x - 0.5) * side
        v = y - t
        along = u / max(length, 1e-3)
        width = 0.012 * (1 - along)
        leaf |= (u > 0) & (u < length) & (np.abs(v - u * 0.35) < width)
    alpha = (leaf | rachis) & (y > 0.02) & (y < 0.99)
    m = noise(n, 5, 8, seed=91)
    col = tint(m, (0.20, 0.33, 0.10), (0.36, 0.48, 0.16))
    col[rachis] = (0.45, 0.42, 0.22)
    img[..., :3] = col
    img[..., 3] = alpha
    Image.fromarray((img * 255).astype(np.uint8), "RGBA").save(os.path.join(OUT, "palm_leaf.png"))
    rings = 0.5 + 0.5 * np.sin(y * 2 * np.pi * 24 + noise(n, 3, 4, seed=92) * 3)
    bark = tint(rings * 0.6 + noise(n, 5, 16, seed=93) * 0.4, (0.30, 0.24, 0.17), (0.50, 0.42, 0.30))
    save("palm_bark", bark)
    save("palm_bark_n", normal_from_height(rings, 4.0))


def banner():
    """Vertical PVPSPINARENA banner: the official logo on dark fabric with brand trim."""
    root = os.path.abspath(os.path.join(HERE, "../../.."))
    logo = Image.open(os.path.join(root, "public/brand/arena-logo-email.png")).convert("RGBA")
    w, h = 512, 1024
    y, x = np.mgrid[0:h, 0:w] / np.array([h, w])[:, None, None]
    weave = noise(512, 4, 64, seed=101)
    fabric = np.dstack([np.full((h, w), 0.055), np.full((h, w), 0.05), np.full((h, w), 0.09)])
    fabric *= (0.85 + 0.3 * np.tile(weave, (2, 1)))[..., None]
    purple = np.array([0.55, 0.18, 0.95])
    trim = (np.abs(x - 0.5) > 0.44) | (y < 0.03) | (y > 0.90)
    glow = np.exp(-((x - 0.5) ** 2 + (y - 0.42) ** 2 * 0.6) / 0.08) * 0.18
    fabric = fabric + glow[..., None] * purple
    fabric[trim] = purple * 0.75
    base = Image.fromarray((np.clip(fabric, 0, 1) * 255).astype(np.uint8), "RGB").convert("RGBA")
    lw = int(w * 0.82)
    lh = int(logo.height * lw / logo.width)
    base.alpha_composite(logo.resize((lw, lh), Image.LANCZOS), ((w - lw) // 2, int(h * 0.30)))
    # Swallowtail notch at the bottom (alpha-tested).
    a = np.ones((h, w))
    a[(y > 0.9) & (np.abs(x - 0.5) < (y - 0.9) * 4.5)] = 0
    out = np.array(base).astype(float) / 255
    out[..., 3] = a
    Image.fromarray((out * 255).astype(np.uint8), "RGBA").save(os.path.join(OUT, "banner.png"))
    # Wide courtyard banner (horizontal), logo centred.
    W, H = 1024, 256
    yy, xx = np.mgrid[0:H, 0:W] / np.array([H, W])[:, None, None]
    fab = np.dstack([np.full((H, W), 0.05), np.full((H, W), 0.045), np.full((H, W), 0.085)])
    fab = fab + (np.exp(-((xx - 0.5) ** 2 * 4 + (yy - 0.5) ** 2) / 0.05) * 0.2)[..., None] * purple
    edge = (yy < 0.05) | (yy > 0.95)
    fab[edge] = purple * 0.75
    wide = Image.fromarray((np.clip(fab, 0, 1) * 255).astype(np.uint8), "RGB").convert("RGBA")
    lh2 = int(H * 0.8)
    lw2 = int(logo.width * lh2 / logo.height)
    wide.alpha_composite(logo.resize((lw2, lh2), Image.LANCZOS), ((W - lw2) // 2, (H - lh2) // 2))
    wide.convert("RGB").save(os.path.join(OUT, "banner_wide.png"))


def stencil():
    """Industrial signage atlas: hazard stripes (top half) and a container ID plate (bottom)."""
    n = 512
    y, x = np.mgrid[0:n, 0:n] / n
    stripes = ((x + y) * 8 % 1) < 0.5
    img = np.where(stripes[..., None], np.array([0.85, 0.65, 0.08]), np.array([0.06, 0.06, 0.06]))
    m = noise(n, 4, 16, seed=111)
    img = img * (0.8 + 0.2 * m)[..., None]
    save("hazard", img)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for f in (sandstone, plaster, paving, concrete, corrugated, wood, canvas, roof_tiles, palm, banner, stencil):
        f()
        print("wrote", f.__name__)
