"""
Forearm skin albedo with visible arm hair (tileable), from the v1 skin tile.

  python skin_texture.py <forearm-skin-v1.webp> <forearm-skin-v2.webp>

The runtime repeats the tile 2x round the arm and 3x along it (≈10 x 11 cm per tile), with v
running from the wrist to the elbow. Hairs are drawn as tapered, slightly curved strands lying
along the arm and angled toward the little-finger side, as on a real dorsal forearm, at a
density that reads at first-person distance; a soft shadow under each strand grounds it.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, dst = sys.argv[1:3]
base = Image.open(src).convert("RGB")
W, H = base.size
S = 2  # supersample
rng = np.random.default_rng(1919)
px_per_mm = W / 100.0  # tile ≈ 100 mm round the arm

hair = Image.new("L", (W * S, H * S), 0)
shadow = Image.new("L", (W * S, H * S), 0)
dh = ImageDraw.Draw(hair)
ds = ImageDraw.Draw(shadow)
count = 1100
for _ in range(count):
    length = rng.uniform(5, 10) * px_per_mm * S
    angle = np.radians(90 + rng.normal(14, 9))  # along the arm, leaning to one side
    curl = rng.normal(0, 0.0035)
    x, y = rng.uniform(0, W * S), rng.uniform(0, H * S)
    width = rng.uniform(1.0, 1.9) * S
    tone = int(rng.uniform(150, 255))
    pts = []
    a = angle
    steps = 14
    for k in range(steps + 1):
        pts.append((x, y))
        x += np.cos(a) * length / steps
        y += np.sin(a) * length / steps
        a += curl * steps / 4
    for k in range(steps):
        taper = 1 - 0.75 * (k / steps)
        for ox in (-W * S, 0, W * S):
            for oy in (-H * S, 0, H * S):
                p0 = (pts[k][0] + ox, pts[k][1] + oy)
                p1 = (pts[k + 1][0] + ox, pts[k + 1][1] + oy)
                dh.line([p0, p1], fill=int(tone * (0.6 + 0.4 * taper)), width=max(1, int(width * taper)))
                ds.line([(p0[0] + 1.5 * S, p0[1] + 1.0 * S), (p1[0] + 1.5 * S, p1[1] + 1.0 * S)], fill=90, width=max(1, int(width * taper * 1.6)))
hair = hair.resize((W, H), Image.LANCZOS)
shadow = shadow.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))

skin = np.asarray(base, np.float32) / 255
h = np.asarray(hair, np.float32)[..., None] / 255
sh = np.asarray(shadow, np.float32)[..., None] / 255
hair_col = np.array([0.20, 0.13, 0.085], np.float32)
skin = skin * (1 - 0.18 * sh)
skin = skin * (1 - 0.85 * h) + hair_col * 0.85 * h
# A touch more warmth and contrast than v1, which read pale under the viewmodel lights.
skin = np.clip((skin - 0.5) * 1.06 + 0.5, 0, 1) * np.array([1.0, 0.95, 0.9])
Image.fromarray((skin * 255 + 0.5).astype(np.uint8)).save(dst, quality=90, method=6)
print("wrote", dst, W, H)
