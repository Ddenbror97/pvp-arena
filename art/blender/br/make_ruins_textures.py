#!/usr/bin/env python3
"""Textures for Forgotten Ruins' Maya buildings (original work, procedural, 2026-11-17):

 - mayastone: weathered limestone ashlar, courses of varying height, each block its own shade,
   dark joints with moss creeping out of them, rain streaks and lichen;
 - mossstone: the same stone under a heavy coat of moss (terrace tops, ruined crowns);
 - flagstone: the plaza's paving, irregular slabs with grass and moss in the joints;
 - glyphs: a carved frieze of glyph blocks in relief (cornices, stelae, the temple's panels).

All tile seamlessly (periodic noise and layouts). Written next to the textured kit's set
(art/br/blackwater/tex).

    python3 art/blender/br/make_ruins_textures.py
"""
import numpy as np
from PIL import Image, ImageFilter

OUT = "art/br/blackwater/tex"
N = 512
rng = np.random.default_rng(1117)


def pnoise(size, seed, n=N):
    """Periodic smooth noise in [0, 1]: white noise low-passed in frequency space."""
    r = np.random.default_rng(seed).standard_normal((n, n))
    f = np.fft.fft2(r)
    k = np.fft.fftfreq(n)[:, None] ** 2 + np.fft.fftfreq(n)[None, :] ** 2
    f *= np.exp(-k * (n / size) ** 2 * 4)
    v = np.real(np.fft.ifft2(f))
    return (v - v.min()) / (v.max() - v.min())


def fbm(seed, sizes=(160, 60, 22, 8), weights=(0.45, 0.3, 0.17, 0.08)):
    return sum(w * pnoise(s, seed + i) for i, (s, w) in enumerate(zip(sizes, weights)))


def save(rgb, name, blur=0.5):
    img = Image.fromarray(np.clip(rgb * 255, 0, 255).astype(np.uint8))
    img.filter(ImageFilter.GaussianBlur(blur)).save(f"{OUT}/{name}.jpg", quality=86)


STONE = np.array([0.86, 0.83, 0.73])
MOSS = np.array([0.30, 0.40, 0.17])
MOSS_DARK = np.array([0.17, 0.25, 0.10])
LICHEN = np.array([0.80, 0.80, 0.70])


def ashlar(seed, courses, moss_amount):
    """Blocks in `courses` rows; returns rgb and the joint mask."""
    r = np.random.default_rng(seed)
    y = np.arange(N)
    # Course heights vary (sum to N).
    hs = r.uniform(0.7, 1.3, courses)
    hs = np.round(hs / hs.sum() * N).astype(int)
    hs[-1] += N - hs.sum()
    tops = np.concatenate([[0], np.cumsum(hs)])
    shade = np.zeros((N, N))
    joint = np.zeros((N, N))
    for c in range(courses):
        y0, y1 = tops[c], tops[c + 1]
        # Block lengths along the course (wrap around).
        xs = [0]
        while xs[-1] < N:
            xs.append(xs[-1] + int(r.uniform(0.9, 2.2) * (y1 - y0)))
        xs[-1] = N
        off = r.integers(0, N)
        for b in range(len(xs) - 1):
            x0, x1 = xs[b], xs[b + 1]
            cols = (np.arange(x0, x1) + off) % N
            s = r.uniform(0.82, 1.1)
            shade[y0:y1][:, cols] = s
            # Joints: 3 px, a little irregular; the block's edges rounded (darker).
            jw = 5
            joint[y0 : y0 + jw][:, cols] = 1
            joint[y0:y1][:, cols[:jw]] = 1
            # Edge darkening within 10 px of each joint.
            for k in range(1, 10):
                f = 0.06 * (10 - k) / 10
                if y0 + jw + k < y1:
                    shade[y0 + jw + k, cols] -= f
                if jw + k < len(cols):
                    shade[y0:y1, cols[jw + k]] -= f * 0.7
    grain = fbm(seed + 10, (40, 14, 5, 2), (0.3, 0.3, 0.25, 0.15))
    pits = np.clip((pnoise(2.5, seed + 20) - 0.7) * 3, 0, 1) * 0.25
    stain = fbm(seed + 11, (50, 20, 8), (0.5, 0.3, 0.2))
    rgb = STONE[None, None, :] * (
        shade * (0.78 + 0.35 * grain) * (0.86 + 0.2 * stain) - pits
    )[:, :, None]
    # Rain streaks: darker vertical runs (noise stretched down the wall).
    streak = np.array(
        Image.fromarray((pnoise(4, seed + 30) * 255).astype(np.uint8)).resize((N // 8, N)).resize((N, N))
    ) / 255.0
    rgb *= (1 - 0.35 * np.clip((streak - 0.55) * 3, 0, 1))[:, :, None]
    # Moss: out of the joints and in broad patches.
    jb = np.array(Image.fromarray((joint * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(7))) / 255
    patches = fbm(seed + 40)
    m = np.clip((patches - (0.62 - moss_amount * 0.45)) * 5 + jb * (0.6 + moss_amount), 0, 1)
    m *= 0.55 + 0.45 * pnoise(5, seed + 41)
    mosscol = MOSS[None, None, :] * (0.7 + 0.6 * pnoise(4, seed + 42))[:, :, None]
    mosscol = mosscol * (1 - 0.4 * pnoise(9, seed + 43))[:, :, None] + MOSS_DARK * 0.4 * pnoise(9, seed + 43)[:, :, None]
    rgb = rgb * (1 - m[:, :, None]) + mosscol * m[:, :, None]
    # Lichen spots.
    lic = np.clip((pnoise(4, seed + 50) - 0.8) * 8, 0, 1) * (1 - m)
    rgb = rgb * (1 - 0.6 * lic[:, :, None]) + LICHEN * 0.6 * lic[:, :, None]
    # Joints: dark, ragged (mortar long gone), moss deep in them.
    jr = np.clip(joint * (0.6 + 0.6 * pnoise(3, seed + 60)), 0, 1)
    rgb = rgb * (1 - 0.7 * jr[:, :, None]) + MOSS_DARK * 0.5 * jr[:, :, None]
    return rgb


save(ashlar(1, 6, 0.05), "mayastone")
save(ashlar(2, 6, 0.85), "mossstone")

# Flagstones: an irregular grid (jittered Voronoi on a periodic lattice).
pts = []
cells = 7
for i in range(cells):
    for j in range(cells):
        pts.append(((i + rng.uniform(0.2, 0.8)) / cells * N, (j + rng.uniform(0.2, 0.8)) / cells * N))
pts = np.array(pts)
yy, xx = np.mgrid[0:N, 0:N]
d1 = np.full((N, N), 1e9)
d2 = np.full((N, N), 1e9)
idx = np.zeros((N, N), int)
for k, (px_, pz_) in enumerate(pts):
    for ox in (-N, 0, N):
        for oz in (-N, 0, N):
            d = np.hypot(xx - (px_ + ox), yy - (pz_ + oz))
            closer = d < d1
            d2 = np.where(closer, d1, np.minimum(d2, d))
            idx = np.where(closer, k, idx)
            d1 = np.where(closer, d, d1)
edge = d2 - d1
shade = rng.uniform(0.8, 1.08, len(pts))[idx]
grain = fbm(70, (40, 14, 5, 2), (0.3, 0.3, 0.25, 0.15))
rgb = STONE[None, None, :] * (shade * (0.82 + 0.3 * grain))[:, :, None] * 0.95
rgb *= np.clip(0.75 + edge / 40, 0.75, 1)[:, :, None]
gap = np.clip(1 - (edge - 2 - 5 * pnoise(6, 73)) / 4, 0, 1)
grass = np.array([0.26, 0.36, 0.13]) * (0.45 + 0.7 * pnoise(3, 71))[:, :, None]
moss = np.clip((fbm(72) - 0.55) * 4, 0, 1) * 0.7
rgb = rgb * (1 - moss[:, :, None]) + MOSS * moss[:, :, None]
rgb = rgb * (1 - gap[:, :, None]) + grass * gap[:, :, None]
save(rgb, "flagstone")

# Glyph frieze: 4 × 4 glyph blocks per tile, each a rounded cartouche with a few carved shapes
# (rings, bars, dots, a face's eyes and mouth), lit from the upper left as relief.
height = np.zeros((N, N))
B = N // 4
for gi in range(4):
    for gj in range(4):
        x0, y0 = gi * B, gj * B
        u = (xx[y0 : y0 + B, x0 : x0 + B] - x0) / B
        v = (yy[y0 : y0 + B, x0 : x0 + B] - y0) / B
        # The cartouche: a rounded square raised.
        q = np.maximum(np.abs(u - 0.5), np.abs(v - 0.5))
        h = np.clip((0.44 - q) * 30, 0, 1) * 0.6
        kind = rng.integers(0, 4)
        if kind == 0:  # ring and dot
            rr = np.hypot(u - 0.5, v - 0.5)
            h -= 0.35 * np.clip(1 - np.abs(rr - 0.22) * 25, 0, 1)
            h += 0.3 * np.clip(1 - rr * 12, 0, 1)
        elif kind == 1:  # bars and dots (numbers)
            for k in range(rng.integers(1, 4)):
                yb = 0.3 + 0.16 * k
                h -= 0.35 * ((np.abs(v - yb) < 0.045) & (np.abs(u - 0.5) < 0.28))
            for k in range(rng.integers(1, 4)):
                h -= 0.35 * (np.hypot(u - (0.32 + 0.18 * k), v - 0.2) < 0.06)
        elif kind == 2:  # a face: eyes, nose, mouth
            for ex in (0.36, 0.64):
                h -= 0.4 * (np.hypot(u - ex, v - 0.38) < 0.08)
            h -= 0.35 * ((np.abs(v - 0.68) < 0.05) & (np.abs(u - 0.5) < 0.18))
            h += 0.2 * ((np.abs(u - 0.5) < 0.05) & (np.abs(v - 0.52) < 0.1))
        else:  # scroll
            ang = np.arctan2(v - 0.5, u - 0.5)
            rr = np.hypot(u - 0.5, v - 0.5)
            spiral = np.abs(((rr * 22 - ang / np.pi * 1.5) % 3) - 1.5) < 0.45
            h -= 0.3 * (spiral & (rr < 0.36))
        height[y0 : y0 + B, x0 : x0 + B] = h
height = np.array(Image.fromarray((np.clip(height + 0.5, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.2))) / 255
gy, gx = np.gradient(height)
light = np.clip(1 + (-gx - gy) * 18, 0.45, 1.5)
grain = fbm(80, (40, 14, 5, 2), (0.3, 0.3, 0.25, 0.15))
erode = fbm(82, (30, 10, 4), (0.5, 0.3, 0.2))
rgb = STONE[None, None, :] * ((0.66 + 0.45 * grain) * light * (0.8 + 0.25 * height) * (0.75 + 0.4 * erode))[:, :, None]
moss = np.clip((fbm(81) - 0.58) * 4, 0, 1) * 0.65
rgb = rgb * (1 - moss[:, :, None]) + MOSS * moss[:, :, None]
save(rgb, "glyphs", blur=0.4)
print("ok")
