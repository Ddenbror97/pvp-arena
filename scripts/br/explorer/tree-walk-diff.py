"""How much the picture changes per step of a tree walk (tree-walk.mjs), and where it jumps.

A steady walk changes about the same share of the picture every step; a tree that swaps how it
is drawn adds a jump on top. Reported: each step's change (mean absolute difference of the
frames, 0..255, upper two thirds of the picture: the trees, not the ground at the feet), the
median step, and the steps that stand out from their neighbours.

  python3 -I scripts/br/explorer/tree-walk-diff.py <dir> [<dir to compare>]
"""
import glob
import sys

import numpy as np
from PIL import Image


def walk(folder):
    frames = [
        np.asarray(Image.open(f).convert("RGB"), dtype=np.int16)
        for f in sorted(glob.glob(f"{folder}/[0-9][0-9][0-9].png"))
    ]
    h = frames[0].shape[0]
    return [float(np.abs(b[: h * 2 // 3] - a[: h * 2 // 3]).mean()) for a, b in zip(frames, frames[1:])]


for folder in sys.argv[1:]:
    d = walk(folder)
    med = float(np.median(d))
    # A jump: a step well above the steps round it.
    jumps = []
    for i, v in enumerate(d):
        near = sorted(d[max(0, i - 4) : i] + d[i + 1 : i + 5])
        base = near[len(near) // 2]
        if v > base * 1.35 + 0.3:
            jumps.append((i + 1, round(v, 2), round(base, 2)))
    print(folder)
    print(f"  steps {len(d)}, median change {med:.2f}, max {max(d):.2f}, p90 {np.percentile(d, 90):.2f}")
    print(f"  spread (std/median) {np.std(d) / med:.3f}")
    print(f"  jumps ({len(jumps)}): {jumps}")
    print("  per step:", " ".join(f"{v:.1f}" for v in d))
