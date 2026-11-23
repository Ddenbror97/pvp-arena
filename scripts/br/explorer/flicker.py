"""
Frame-to-frame flicker of the explorer's captures (needs numpy and Pillow).

A fixed eye whose view turns a third of a pixel a frame: what a far pixel shows should not
change, so a pixel that changes and changes back the next frame is aliasing. Counted over the
whole frame and along the water's edges (pixels within 4 px of a water/land boundary).

  python3 scripts/br/explorer/flicker.py views <out.json> [frames]
      the turning views (from the plane's and the parachute's heights, over the strait, the
      lakes, the coast and across each river) for capture.mjs's VIEW_FILE
  SHOT=png CLOCK_MS=16.7 VIEW_FILE=<out.json> node scripts/br/explorer/capture.mjs <dir>
      (PROBE=<file.js> to hide layers: see capture.mjs)
  python3 scripts/br/explorer/flicker.py measure <dir> [<dir> …]
      per run of frames: there-and-back energy (mean grey levels a pixel a frame) on the
      shore band / open water / whole frame, and shore flashes (pixels jumping more than 24
      of 255 and back) a frame. The first directory's first frames say where the water is.

The software renderer thresholds a partial alpha where a GPU dithers its samples: to see what
alpha-to-coverage shows, capture with a PROBE that makes the water blend by its alpha
(material.alphaToCoverage = false; transparent = true).
"""
import glob
import json
import math
import sys

RUNS = {
    "plane": ((-3200, 800, -2600), (1500, -420, 4200)),
    "plane2": ((1500, 800, -1500), (-2500, -500, 5000)),
    "chute": ((-600, 600, -500), (1500, -330, 6000)),
    "chute2": ((-2400, 500, -2200), (-1500, -260, 3500)),
    "coast": ((2500, 700, 1500), (3000, -300, 3000)),
    "creek": ((-900, 800, 2600), (0, -800, -4900)),
    "main": ((1500, 800, 3600), (0, -800, -4700)),
    "main6": ((300, 800, 5200), (800, -800, -6100)),
    "channel": ((1200, 700, -2400), (2700, -700, 3600)),
}


def views(out, frames=8):
    step = math.radians(75 / 720) * 0.37
    made = {}
    for name, (p, look) in RUNS.items():
        yaw = math.atan2(look[0], look[2])
        pitch = math.atan2(look[1], math.hypot(look[0], look[2]))
        for i in range(frames):
            y, t = yaw + step * i, pitch + step * 0.6 * i
            made[f"{name}-{i:02d}"] = [
                list(p),
                [p[0] + math.sin(y) * math.cos(t) * 5000, p[1] + math.sin(t) * 5000, p[2] + math.cos(y) * math.cos(t) * 5000],
                {"fov": 75, "near": 0.1},
            ]
    json.dump(made, open(out, "w"))


def measure(dirs):
    import numpy as np
    from PIL import Image, ImageFilter

    def frames(d, n):
        return sorted(glob.glob(f"{d}/{n}-[0-9][0-9].png"))

    ref = dirs[0]
    names = sorted({f.split("/")[-1].rsplit("-", 1)[0] for f in glob.glob(ref + "/*-[0-9][0-9].png")})
    bands = {}
    for n in names:
        rgb = np.asarray(Image.open(frames(ref, n)[0]).convert("RGB"), dtype=np.int16)
        water = (rgb[..., 2] - rgb[..., 0] > 22) & (rgb[..., 2] > 95)
        water[: rgb.shape[0] // 3] = False  # (the sky)
        mask = Image.fromarray((water * 255).astype(np.uint8))
        grown = np.asarray(mask.filter(ImageFilter.MaxFilter(9))) > 0
        shrunk = np.asarray(mask.filter(ImageFilter.MinFilter(9))) > 0
        band = grown & ~shrunk
        band[: rgb.shape[0] // 3] = False
        bands[n] = (band, shrunk)
    print("energy: shore band / open water / whole frame; then shore flashes a frame")
    for d in dirs:
        row = []
        for n in names:
            grey = [np.asarray(Image.open(f).convert("L"), dtype=np.int16) for f in frames(d, n)]
            if len(grey) < 3:
                continue
            energy = np.zeros(grey[0].shape)
            flashes = np.zeros(grey[0].shape)
            for a, b, c in zip(grey, grey[1:], grey[2:]):
                d1, d2 = b - a, c - b
                back = np.sign(d1) != np.sign(d2)
                energy += np.where(back, np.minimum(np.abs(d1), np.abs(d2)), 0)
                flashes += back & (np.abs(d1) > 24) & (np.abs(d2) > 24)
            k = len(grey) - 2
            band, inner = bands[n]
            row.append(
                f"{n}: {energy[band].mean() / k:.2f} / {energy[inner].mean() / k:.2f} / {energy.mean() / k:.2f}, {flashes[band].sum() / k:.0f}"
            )
        print(d.rstrip("/").split("/")[-1].ljust(8), "  ".join(row))


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "views":
        views(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 8)
    elif len(sys.argv) > 2 and sys.argv[1] == "measure":
        measure(sys.argv[2:])
    else:
        print(__doc__)
