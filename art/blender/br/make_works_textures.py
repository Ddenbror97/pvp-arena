#!/usr/bin/env python3
"""Textures for East Works' yards (original work, procedural, 2026-11-17; owner: "poolish east
works … new colors and floor"):

 - yard: poured concrete in 4 m bays (saw-cut joints, each bay its own shade), oil stains,
   tyre tracks and hairline cracks, as a works yard wears;
 - asphalt: dark road asphalt with its aggregate, patched and worn lighter where wheels run.

Both tile seamlessly (periodic noise and layouts). Written next to the textured kit's set
(art/br/blackwater/tex).

    python3 art/blender/br/make_works_textures.py
"""
import numpy as np
from PIL import Image, ImageFilter

OUT = "art/br/blackwater/tex"
N = 512


def pnoise(size, seed, n=N):
    """Periodic smooth noise in [0, 1]: white noise low-passed in frequency space."""
    r = np.random.default_rng(seed).standard_normal((n, n))
    f = np.fft.fft2(r)
    k = np.fft.fftfreq(n)[:, None] ** 2 + np.fft.fftfreq(n)[None, :] ** 2
    f *= np.exp(-k * (n / size) ** 2 * 4)
    v = np.real(np.fft.ifft2(f))
    return (v - v.min()) / (v.max() - v.min())


def fbm(seed, sizes=(160, 60, 22, 8, 3), weights=(0.38, 0.27, 0.17, 0.11, 0.07)):
    return sum(w * pnoise(s, seed + i) for i, (s, w) in enumerate(zip(sizes, weights)))


def save(rgb, name, blur=0.4):
    img = Image.fromarray(np.clip(rgb * 255, 0, 255).astype(np.uint8))
    img.filter(ImageFilter.GaussianBlur(blur)).save(f"{OUT}/{name}.jpg", quality=86)


rng = np.random.default_rng(2117)
yy, xx = np.mgrid[0:N, 0:N]

# ---------------------------------------------------------------- yard concrete
# The tile is 8 m (two 4 m bays each way): joints every N/2 px.
B = N // 2
bay = (yy // B) * 2 + (xx // B)
shade = rng.uniform(0.9, 1.06, 4)[bay]
grain = fbm(11)
speck = np.clip((np.random.default_rng(12).random((N, N)) - 0.8) * 4, 0, 1)
CONC = np.array([0.68, 0.67, 0.64])
rgb = CONC[None, None, :] * (shade * (0.82 + 0.3 * grain) - 0.08 * speck)[:, :, None]
# Saw-cut joints (dark, 3 px), a little ragged.
jx = np.minimum(xx % B, B - xx % B)
jy = np.minimum(yy % B, B - yy % B)
joint = np.clip(1.6 - np.minimum(jx, jy) + (pnoise(4, 13) - 0.5) * 1.2, 0, 1)
rgb *= (1 - 0.45 * joint)[:, :, None]
# Oil stains: dark soft blots.
oil = np.clip((fbm(14, (60, 25, 9), (0.5, 0.3, 0.2)) - 0.62) * 4, 0, 1)
rgb *= (1 - 0.35 * oil)[:, :, None]
# Tyre tracks: two darker bands running along y with a wobble, faint.
wob = (pnoise(80, 15)[:, 0] - 0.5) * 40
for c in (0.3, 0.38, 0.72, 0.8):
    d = np.abs(xx - (c * N + wob[yy])) % N
    d = np.minimum(d, N - d)
    rgb *= (1 - 0.1 * np.clip(1 - d / 9, 0, 1) * pnoise(20, 16))[:, :, None]
# Hairline cracks: thin dark lines from a ridged noise.
ridge = 1 - np.abs(pnoise(70, 17) * 2 - 1)
crack = np.clip((ridge - 0.985) * 60, 0, 1) * np.clip((pnoise(60, 18) - 0.62) * 5, 0, 1)
rgb *= (1 - 0.3 * crack)[:, :, None]
save(rgb, "yard")

# ---------------------------------------------------------------- asphalt
grain = fbm(31)
agg = np.random.default_rng(32).random((N, N))
ASPH = np.array([0.26, 0.26, 0.27])
rgb = ASPH[None, None, :] * (0.86 + 0.18 * grain + 0.3 * (agg - 0.5))[:, :, None]
# Light aggregate stones.
stones = np.clip((np.random.default_rng(33).random((N, N)) - 0.93) * 12, 0, 1)
rgb = rgb * (1 - 0.5 * stones[:, :, None]) + np.array([0.55, 0.54, 0.5]) * 0.5 * stones[:, :, None]
# Patches: squares of fresher (darker) asphalt.
patch = np.zeros((N, N))
for _ in range(5):
    x0, y0 = rng.integers(0, N, 2)
    w, h = rng.integers(40, 120, 2)
    m = (((xx - x0) % N) < w) & (((yy - y0) % N) < h)
    patch[m] = 1
patch = np.array(Image.fromarray((patch * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))) / 255
rgb *= (1 - 0.07 * patch)[:, :, None]
save(rgb, "asphalt", blur=0.3)
print("ok")
