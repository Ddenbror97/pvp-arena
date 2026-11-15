#!/usr/bin/env python3
"""Two textures for the 2026-11-15 location buildings (original work, procedural):
corrugated sheet metal (sheds, hangars, warehouses) and clay roof tiles (village roofs).
Written next to the Poly Haven set the textured kit reads (art/br/blackwater/tex).

    python3 art/blender/br/make_location_textures.py
"""
import math
import random

from PIL import Image, ImageFilter

OUT = "art/br/blackwater/tex"
N = 512
rnd = random.Random(1115)


def noise(img, amount):
    px = img.load()
    for y in range(N):
        for x in range(N):
            r, g, b = px[x, y]
            n = rnd.randint(-amount, amount)
            px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))


# Corrugated sheet: 16 ribs per tile (the kit tiles it every 2 m: 12.5 cm pitch), ribs vertical
# on walls (varying along u), light and shade across each rib, a few streaks of weather.
img = Image.new("RGB", (N, N))
px = img.load()
ribs = 16
for x in range(N):
    s = math.sin(2 * math.pi * ribs * x / N)
    v = 178 + 52 * s
    for y in range(N):
        px[x, y] = (int(v), int(v), int(v))
noise(img, 10)
for _ in range(40):
    x = rnd.randrange(N)
    y0 = rnd.randrange(N)
    ln = rnd.randrange(40, 220)
    for y in range(y0, min(N, y0 + ln)):
        for dx in range(rnd.randint(1, 3)):
            r, g, b = px[(x + dx) % N, y]
            px[(x + dx) % N, y] = (int(r * 0.86), int(g * 0.86), int(b * 0.88))
# A sheet lap every half tile (a horizontal seam).
for y in (0, 1, N // 2, N // 2 + 1):
    for x in range(N):
        r, g, b = px[x, y]
        px[x, y] = (int(r * 0.7), int(g * 0.7), int(b * 0.7))
img = img.filter(ImageFilter.GaussianBlur(0.6))
img.save(f"{OUT}/corrugated.jpg", quality=86)

# Clay roof tiles: 8 courses per tile (1.6 m: 20 cm courses) of 8 tiles each, staggered, each
# rounded (lighter at its crown) with a shadow under the course above, colour varying a little.
img = Image.new("RGB", (N, N))
px = img.load()
rows, cols = 8, 8
ch, cw = N // rows, N // cols
for r in range(rows):
    off = (cw // 2) * (r % 2)
    shades = [rnd.uniform(0.82, 1.08) for _ in range(cols + 1)]
    for y in range(r * ch, (r + 1) * ch):
        t = (y - r * ch) / ch  # 0 at the course's top edge (under the one above)
        for x in range(N):
            c = ((x + off) // cw) % cols
            u = ((x + off) % cw) / cw
            crown = 0.72 + 0.38 * math.sin(math.pi * u)
            shade = (0.55 + 0.45 * min(1, t * 4)) * crown * shades[c]
            px[x, y] = (
                max(0, min(255, int(176 * shade))),
                max(0, min(255, int(92 * shade))),
                max(0, min(255, int(62 * shade))),
            )
noise(img, 8)
img = img.filter(ImageFilter.GaussianBlur(0.5))
img.save(f"{OUT}/rooftile.jpg", quality=86)
print("ok")
