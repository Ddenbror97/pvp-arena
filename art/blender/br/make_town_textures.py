#!/usr/bin/env python3
"""Six textures for the rebuilt first towns (Northstar, Millhaven, Crossroads, Riverwood;
2026-11-27, original work, procedural): red brick, pale brick, painted lap siding,
board-and-batten, asphalt roof shingles and stucco. Written next to the Poly Haven set the textured kit
reads (art/br/blackwater/tex). Each is near neutral where it is painted (siding, battens,
shingles), so a building's tint gives its colour; the bricks keep their mortar grey.

    python3 art/blender/br/make_town_textures.py

Tiles (textured-kit.mjs MATERIALS): brick and brickpale 1.8 m (24 courses of 75 mm, 8 bricks
of 225 mm), siding 2.4 m (16 boards of 150 mm), batten 2.4 m (8 boards of 300 mm), shingle
1.68 m (12 courses of 140 mm, tabs of 280 mm).
"""
import numpy as np
from PIL import Image, ImageFilter

OUT = "art/br/blackwater/tex"
N = 512
rng = np.random.default_rng(1127)


def save(name, rgb):
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    img.save(f"{OUT}/{name}.jpg", quality=86, optimize=True)


def fbm(scale, octaves=4):
    """Tileable value noise in 0..1 (sum of wrapped, upsampled random grids)."""
    out = np.zeros((N, N))
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        cells = scale * (2**o)
        g = rng.random((cells, cells))
        img = Image.fromarray((g * 255).astype(np.uint8)).resize((N, N), Image.BICUBIC)
        # Wrap: average with the rolled copy so the edges meet.
        a = np.asarray(img, dtype=float) / 255
        a = (a + np.roll(a, N // 2, 0) + np.roll(a, N // 2, 1) + np.roll(np.roll(a, N // 2, 0), N // 2, 1)) / 4
        out += a * amp
        tot += amp
        amp *= 0.5
    out /= tot
    return (out - out.min()) / (out.max() - out.min() + 1e-9)


def bricks(base, spread, mortar, name):
    courses, per = 24, 8
    ch = N / courses
    bw = N / per
    img = np.zeros((N, N, 3))
    grain = fbm(16, 3)
    y = np.arange(N)[:, None]
    x = np.arange(N)[None, :]
    row = (y // ch).astype(int)
    off = (row % 2) * (bw / 2)
    col = ((x + off) // bw).astype(int) % per
    # Each brick its own shade and hue.
    shade = rng.normal(0, 1, (courses, per))
    hue = rng.normal(0, 1, (courses, per))
    s = shade[row % courses, col]
    h = hue[row % courses, col]
    for c in range(3):
        img[..., c] = base[c] + spread * s + [10, 2, -6][c] * h + (grain - 0.5) * 34
    # Mortar joints: 10 mm of 75 mm (about 2.6 px of 21.3), with a soft edge.
    fy = (y % ch) / ch
    fx = ((x + off) % bw) / bw
    joint = (fy < 0.13) | (fx < 0.045)
    edge = ((fy < 0.2) & ~(fy < 0.13)) | ((fx < 0.07) & ~(fx < 0.045))
    mort = np.array(mortar)[None, None, :] + (fbm(32, 2)[..., None] - 0.5) * 30
    img = np.where(joint[..., None], mort, img)
    img = np.where(edge[..., None], img * 0.82, img)
    # A few chipped or sooty bricks.
    soot = fbm(6, 3)
    img *= (0.86 + 0.14 * soot)[..., None]
    save(name, img)


bricks([150, 62, 46], 16, [168, 164, 156], "brick")
bricks([206, 184, 148], 14, [196, 192, 184], "brickpale")

# Lap siding: 16 boards per 2.4 m tile, the shadow under each board's lap, faint grain.
img = np.zeros((N, N, 3))
y = np.arange(N)[:, None] * np.ones((1, N))
bh = N / 16
fy = (y % bh) / bh
board = 228 - 34 * fy  # each board lighter at its top, shaded toward the lap below
board = np.where(fy > 0.9, 150, board)  # the lap's shadow line
grain = fbm(4, 4)
streak = np.asarray(
    Image.fromarray((rng.random((N, 8)) * 255).astype(np.uint8)).resize((N, N), Image.BICUBIC),
    dtype=float,
)
v = board + (grain - 0.5) * 14 + (streak / 255 - 0.5) * 8
for c, k in enumerate([1.0, 0.99, 0.96]):
    img[..., c] = v * k
save("siding", img)

# Board-and-batten: 8 boards per 2.4 m tile, a 60 mm batten over each joint, wood grain.
img = np.zeros((N, N, 3))
x = np.arange(N)[None, :] * np.ones((N, 1))
bw = N / 8
fx = (x % bw) / bw
g = fbm(3, 5)
lines = np.sin((x / 3.1) + g * 18) * 0.5 + 0.5
wood = 170 + (g - 0.5) * 40 + lines * 14
# Each board its own shade.
shade = rng.normal(0, 9, 8)
wood += shade[(x // bw).astype(int) % 8]
batten = (fx > 0.9) | (fx < 0.02)
wood = np.where(batten, wood + 16, wood)
wood = np.where((fx > 0.885) & (fx < 0.9), wood * 0.6, wood)  # the batten's shadow side
for c, k in enumerate([1.0, 0.9, 0.78]):
    img[..., c] = wood * k
save("batten", img)

# Asphalt shingles: 12 courses per 1.68 m tile, tabs of 280 mm staggered by half a tab, the
# granules a fine noise, each tab a slightly different shade, the course's shadow line.
img = np.zeros((N, N, 3))
y = np.arange(N)[:, None] * np.ones((1, N))
x = np.arange(N)[None, :] * np.ones((N, 1))
ch = N / 12
tw = N / 6
row = (y // ch).astype(int)
off = (row % 2) * (tw / 2)
tab = ((x + off) // tw).astype(int) % 6
shade = rng.normal(0, 1, (12, 6))
fy = (y % ch) / ch
fx = ((x + off) % tw) / tw
gran = rng.random((N, N))
gran = np.asarray(Image.fromarray((gran * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), dtype=float) / 255
v = 150 + 12 * shade[row % 12, tab] + (gran - 0.5) * 60 + (fbm(8, 3) - 0.5) * 20
v = np.where(fy > 0.88, v * 0.55, v)  # the course above's shadow
v = np.where(fx < 0.015, v * 0.6, v)  # the slot between tabs
for c in range(3):
    img[..., c] = v
save("shingle", img)
# Stucco (the plains' adobe and Mission walls): a fine troweled render, near white to be
# tinted, the trowel's arcs a faint swirl, a few hairline patches.
img = np.zeros((N, N, 3))
base = 214 + (fbm(24, 4) - 0.5) * 26 + (fbm(5, 3) - 0.5) * 16
y = np.arange(N)[:, None] * np.ones((1, N))
x = np.arange(N)[None, :] * np.ones((N, 1))
swirl = np.sin((x * 0.06 + np.sin(y * 0.045) * 3.0) + fbm(3, 2) * 6) * 5
grain = (rng.random((N, N)) - 0.5) * 10
v = base + swirl + grain
for c, k in enumerate([1.0, 0.985, 0.96]):
    img[..., c] = v * k
save("stucco", img)
print("brick, brickpale, siding, batten, shingle, stucco written to", OUT)
