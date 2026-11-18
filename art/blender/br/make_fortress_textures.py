#!/usr/bin/env python3
"""Textures for the Old Fortress (original work, procedural, 2026-11-17), after the owner's
references (Carcassonne's walls, a castle of grey-gold limestone with slate cones):

 - castlestone: dressed limestone ashlar, warm grey-gold, block by block in its own shade, worn
   arrises, rain streaks, a little lichen (the towers, the keep, the gatehouse, copings);
 - castlewall: coursed rubble, the curtain walls' face: long flat stones laid in rough courses,
   thick lime mortar, darker at the foot;
 - slate: the towers' conical roofs and the hall's pitched roof, overlapping rows of grey-blue
   slates, each its own shade;
 - castlefloor: worn indoor flagstones (the halls, the cellars), large slabs in grey mortar.

All tile seamlessly. Written next to the textured kit's set (art/br/blackwater/tex).

    python3 art/blender/br/make_fortress_textures.py
"""
import numpy as np
from PIL import Image, ImageFilter

OUT = "art/br/blackwater/tex"
N = 512


def pnoise(size, seed, n=N):
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


def blur(a, r):
    return np.array(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))) / 255.0


LIME = np.array([0.80, 0.76, 0.66])
LICHEN = np.array([0.78, 0.78, 0.66])
MOSS = np.array([0.33, 0.38, 0.20])


def courses(seed, rows, lmin, lmax, jw, tint_spread, base):
    """Blocks laid in `rows` courses: shade per block, joint mask, edge wear."""
    r = np.random.default_rng(seed)
    hs = r.uniform(0.75, 1.25, rows)
    hs = np.round(hs / hs.sum() * N).astype(int)
    hs[-1] += N - hs.sum()
    tops = np.concatenate([[0], np.cumsum(hs)])
    shade = np.ones((N, N, 3))
    joint = np.zeros((N, N))
    wear = np.zeros((N, N))
    for c in range(rows):
        y0, y1 = tops[c], tops[c + 1]
        xs = [0]
        while xs[-1] < N:
            xs.append(xs[-1] + int(r.uniform(lmin, lmax) * (y1 - y0)))
        xs[-1] = N
        off = r.integers(0, N)
        for b in range(len(xs) - 1):
            cols = (np.arange(xs[b], xs[b + 1]) + off) % N
            s = r.uniform(1 - tint_spread, 1 + tint_spread * 0.6)
            warm = r.uniform(-0.025, 0.025)
            shade[y0:y1][:, cols] = base * s + np.array([warm, warm * 0.6, -warm * 0.6])
            joint[y0 : y0 + jw][:, cols] = 1
            joint[y0:y1][:, cols[:jw]] = 1
            # Worn arrises: the block's edges rounded and darker for a few px.
            for k in range(1, 9):
                f = 0.07 * (9 - k) / 9
                if y0 + jw + k < y1:
                    wear[y0 + jw + k, cols] += f
                if jw + k < len(cols):
                    wear[y0:y1, cols[jw + k]] += f * 0.8
                if y1 - k > y0 + jw:
                    wear[y1 - k, cols] += f * 0.5
    return shade, joint, wear


def stone_face(seed, rows, lmin, lmax, jw, spread, base, mortar_light, moss_amount):
    shade, joint, wear = courses(seed, rows, lmin, lmax, jw, spread, base)
    grain = fbm(seed + 10, (40, 14, 5, 2), (0.3, 0.3, 0.25, 0.15))
    pits = np.clip((pnoise(2.5, seed + 20) - 0.72) * 3, 0, 1) * 0.22
    stain = fbm(seed + 11, (30, 12, 5), (0.5, 0.3, 0.2))
    rgb = shade * ((0.84 + 0.22 * grain) * (0.93 + 0.08 * stain) - pits - wear)[:, :, None]
    streak = np.array(
        Image.fromarray((pnoise(4, seed + 30) * 255).astype(np.uint8)).resize((N // 8, N)).resize((N, N))
    ) / 255.0
    rgb *= (1 - 0.18 * np.clip((streak - 0.6) * 3, 0, 1))[:, :, None]
    lic = np.clip((pnoise(1.6, seed + 50) - 0.82) * 6, 0, 1)
    rgb = rgb * (1 - 0.3 * lic[:, :, None]) + LICHEN * 0.3 * lic[:, :, None]
    m = np.clip((fbm(seed + 40, (40, 16, 6, 3)) - (0.8 - moss_amount * 0.4)) * 4 + blur(joint, 4) * moss_amount * 0.6, 0, 1) * 0.35
    rgb = rgb * (1 - m[:, :, None]) + MOSS * m[:, :, None] * (0.8 + 0.4 * pnoise(5, seed + 41))[:, :, None]
    # Mortar: lime, recessed (a shadow along each joint's top), weathered.
    jr = np.clip(joint * (0.75 + 0.5 * pnoise(3, seed + 60)), 0, 1)
    mortar = LIME * mortar_light * (0.75 + 0.35 * grain)[:, :, None]
    rgb = rgb * (1 - jr[:, :, None]) + mortar * jr[:, :, None]
    shadow = np.roll(joint, 3, axis=0) * (1 - joint)
    rgb *= (1 - 0.25 * shadow)[:, :, None]
    return rgb


# Dressed ashlar: regular courses of long blocks.
save(stone_face(11, 7, 1.4, 2.8, 4, 0.07, np.array([0.72, 0.68, 0.59]), 0.9, 0.08), "castlestone")

# Coursed rubble: many low courses of short, uneven stones, wide joints.
rub = stone_face(21, 11, 0.6, 3.2, 7, 0.11, np.array([0.64, 0.61, 0.54]), 0.82, 0.12)
# Darker towards the bottom of the tile (damp): repeats every tile, so faint.
save(rub, "castlewall")

# Slate: overlapping rows, each slate its own shade, its lower edge a shadow line.
r = np.random.default_rng(31)
rows = 10
hs = N // rows
sl = np.zeros((N, N, 3))
edge = np.zeros((N, N))
for c in range(rows):
    y0 = c * hs
    xs = [0]
    while xs[-1] < N:
        xs.append(xs[-1] + int(r.uniform(0.75, 1.1) * hs))
    xs[-1] = N
    off = (c % 2) * hs // 2 + r.integers(0, 6)
    for b in range(len(xs) - 1):
        cols = (np.arange(xs[b], xs[b + 1]) + off) % N
        s = r.uniform(0.82, 1.12)
        col = np.array([0.30, 0.33, 0.37]) * s + r.uniform(-0.02, 0.02)
        sl[y0 : y0 + hs][:, cols] = col
        edge[y0 + hs - 3 : y0 + hs][:, cols] = 1
        edge[y0 : y0 + hs][:, cols[:2]] = 0.6
grain = fbm(35, (30, 10, 4, 2), (0.3, 0.3, 0.25, 0.15))
sl *= (0.8 + 0.35 * grain)[:, :, None]
sl *= (1 - 0.55 * edge)[:, :, None]
lic = np.clip((pnoise(1.5, 36) - 0.8) * 5, 0, 1) * 0.25
sl = sl * (1 - lic[:, :, None]) + np.array([0.55, 0.56, 0.45]) * lic[:, :, None]
save(sl, "slate", blur=0.4)

# Indoor flagstones: big rectangular slabs in grey mortar, worn smooth.
fl = stone_face(41, 4, 0.9, 1.6, 5, 0.06, np.array([0.58, 0.56, 0.52]), 0.62, 0.0)
fl *= (0.9 + 0.15 * pnoise(60, 42))[:, :, None]
save(fl, "castlefloor")
print("ok")
