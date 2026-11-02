"""Compose the four baked backdrop faces into one 2×2 atlas (straight alpha).

    python3 bake/compose.py <bakeDir> <out.png>

The bake canvas holds MSAA-resolved colours over a transparent clear, so partially covered
leaf-edge texels are dark (colour × coverage): divide by alpha. Texels under half alpha are
cut by the game's alpha test anyway; their colour is set to the nearest kept texel's (dilated)
so mip levels don't bleed black or the clear colour into the silhouettes."""
import json
import sys

import numpy as np
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
meta = json.load(open(f"{src}/backdrop.json"))
size = meta["size"]
rows = round(size * meta["keepTop"])  # each face is cropped to its top rows (see bake.mjs)
SLOT = {"px": (0, 0), "nx": (1, 0), "pz": (0, 1), "nz": (1, 1)}  # (column, row) from the top-left
atlas = np.zeros((rows * 2, size * 2, 4), dtype=np.float32)
for face in meta["faces"]:
    im = np.asarray(Image.open(f"{src}/face-{face['name']}.png").convert("RGBA"), dtype=np.float32)[:rows] / 255
    a = im[..., 3:4]
    rgb = np.where(a > 1e-3, im[..., :3] / np.maximum(a, 1e-3), 0.0).clip(0, 1)
    col, row = SLOT[face["name"]]
    atlas[row * rows:(row + 1) * rows, col * size:(col + 1) * size] = np.concatenate([rgb, a], axis=2)
# Below FILL_ELEVATION the bake's gaps look through the whole forest to the sky beyond it. From
# the centre that is what the 3D forest showed too, but from anywhere nearer a wall the terrain
# and trunks in front no longer line up with the gaps, and sky would show through the bottom of
# the forest. A jungle is opaque at ground level: those gaps are filled with the surrounding
# forest's colour (normalised convolution of the opaque texels) mixed with the haze, and made
# opaque.
GAP = 40  # texels (about 3.5°)
FILL_ELEVATION = 16.0  # degrees above the eye (about the canopy base seen from the centre)
keep_top = meta["keepTop"]
v_fill = 0.5 + 0.5 * np.tan(np.radians(FILL_ELEVATION))  # face v (0 bottom, 1 top) at that elevation
row_fill = round((1 - v_fill) * size)  # face rows below this are filled
opaque = atlas[..., 3] >= 0.5
blur = lambda x: np.asarray(Image.fromarray(x).filter(ImageFilter.GaussianBlur(18)), dtype=np.float32)
weight = blur((opaque * 255).astype(np.uint8)) / 255
fill = np.stack([blur((atlas[..., c] * opaque * 255).astype(np.uint8)) / 255 for c in range(3)], axis=2)
fill = np.where(weight[..., None] > 1e-3, fill / np.maximum(weight[..., None], 1e-3), 0.0)
# Half way to the map's haze (lost-trail.ts lighting.fog.color): misty depth, not a dark wall.
HAZE = np.array([0x8A, 0xA0, 0x93], dtype=np.float32) / 255
fill = fill * 0.5 + HAZE * 0.5
for face in meta["faces"]:
    col, row = SLOT[face["name"]]
    block = (slice(row * rows + row_fill, (row + 1) * rows), slice(col * size, (col + 1) * size))
    region = atlas[block]
    solid = region[..., 3] >= 0.5
    # Only gaps between trunks (forest on both sides within GAP texels on the same row); wide
    # openings such as the river valley keep their sky.
    cols = np.arange(solid.shape[1])[None, :].repeat(solid.shape[0], 0)
    left = np.maximum.accumulate(np.where(solid, cols, -10**6), axis=1)
    right = np.flip(np.minimum.accumulate(np.flip(np.where(solid, cols, 10**6), 1), axis=1), 1)
    gap = ~solid & (cols - left <= GAP) & (right - cols <= GAP)
    region[..., :3][gap] = fill[block][gap]
    region[..., 3][gap] = 1.0
    atlas[block] = region

# Dilate colour into the cut texels (a few passes of a max-alpha neighbour fill).
rgb, a = atlas[..., :3], atlas[..., 3]
keep = a >= 0.5
img = Image.fromarray((np.concatenate([rgb * keep[..., None], keep[..., None]], axis=2) * 255).astype(np.uint8))
for _ in range(6):
    blurred = img.filter(ImageFilter.BoxBlur(2))
    b = np.asarray(blurred, dtype=np.float32) / 255
    cur = np.asarray(img, dtype=np.float32) / 255
    w = b[..., 3:4]
    fill = np.where(w > 1e-3, b[..., :3] / np.maximum(w, 1e-3), 0)
    has = cur[..., 3:4] > 0.5
    new_rgb = np.where(has, cur[..., :3], fill)
    new_a = np.maximum(cur[..., 3:4], (w > 1e-3).astype(np.float32))
    img = Image.fromarray((np.concatenate([new_rgb, new_a], axis=2) * 255).astype(np.uint8))
final = np.asarray(img, dtype=np.float32) / 255
final[..., 3] = a  # the real coverage, for the alpha test
Image.fromarray((final.clip(0, 1) * 255).astype(np.uint8)).save(out)
print(json.dumps({"atlas": out, "size": [size * 2, rows * 2]}))
