"""How much the trees change per step of a tree walk (tree-walk.mjs), and where they jump.

A steady walk changes the trees' pixels about as much every step; a tree that swaps how it is
drawn adds a jump on top. Compared: the pixels that are foliage in both frames of a step (dark
and green: the sky, its moving clouds and the ground's own texture are left out), as the mean
absolute difference of their colours (0..765). Reported: each step's change, and the steps that
stand out from their neighbours.

  python3 -I scripts/br/explorer/tree-walk-diff.py <dir> [<dir to compare> ...] [--rows=190]

--rows: only the picture's top rows (the tree line; the grass at the feet is green too).
"""
import glob
import sys

import numpy as np
from PIL import Image

rows = next((int(a.split("=")[1]) for a in sys.argv[1:] if a.startswith("--rows=")), None)


def foliage(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (g >= b) & (g >= r - 8) & ((r + g + b) < 330)


def walk(folder):
    frames = [
        np.asarray(Image.open(f).convert("RGB"), dtype=np.int16)
        for f in sorted(glob.glob(f"{folder}/[0-9][0-9][0-9].png"))
    ]
    out = []
    for a, b in zip(frames, frames[1:]):
        m = foliage(a) & foliage(b)
        if rows:
            m[rows:] = False
        out.append(float(np.abs(a - b).sum(axis=2)[m].mean()) if m.any() else 0.0)
    return out


for folder in [a for a in sys.argv[1:] if not a.startswith("--")]:
    d = walk(folder)
    # A jump: a step well above the steps round it.
    jumps = []
    for i, v in enumerate(d):
        near = sorted(d[max(0, i - 4) : i] + d[i + 1 : i + 5])
        base = near[len(near) // 2]
        if v > base * 1.04 + 0.8:
            jumps.append((i + 1, round(v, 1), round(base, 1)))
    print(folder)
    print(f"  steps {len(d)}, median change {np.median(d):.1f}, max {max(d):.1f}")
    print(f"  jumps ({len(jumps)}): {jumps}")
    print("  per step:", " ".join(f"{v:.1f}" for v in d))
