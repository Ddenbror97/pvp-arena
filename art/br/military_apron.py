#!/usr/bin/env python3
"""The Southern Military Base's flight line levelled (owner, 2026-11-23: "southern military base
… its way to much dead space areas").

Between the compound's south wall and the runway, the flight line's apron (asphalt in the land
cover since 2026-11-15, build_world.py APRONS) lay over a hump: 22.7 m at the wall, up to 27 m
in the middle, back to 22 m at the runway. Every hangar and most of the aircraft the layout put
there (layout.ts militaryUpgrade, baseFlightLine) need level ground and were refused: five field
hangars, three hangars, two A-10s, the E-7 and two helicopters never stood, and the apron was
an empty slope.

This levels the apron to the base's pad (22.67 m) from the wall to 20 m short of the runway's
north edge, easing back into the country over EASE m round it. The runway and RUNWAY_KEEP m
round it are untouched (the runway is drawn and paved on its own ground). Roads over the apron
follow the new ground as they follow any ground (paved.ts lays them on the drawn heights).
Nothing else changes: the land cover, the world meta and the baked ground surface (from the land
cover alone) stay as they are.

Reads height.v5.hf and world.v4.json; writes height.v6.hf.

    python3 -I art/br/military_apron.py
"""
import json
import struct
import zlib
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
BR = ROOT / "public/fps/br"
SRC_H, OUT_H = BR / "height.v5.hf", BR / "height.v6.hf"
META = BR / "world.v4.json"
HALF = 5000.0

# The apron in the base's frame (x east, z south of the POI): from the wall's line to 20 m
# short of the runway's north edge, x X0..X1.
X0, X1 = -250.0, 230.0
Z0 = 225.0
SHORT = 20.0
EASE = 40.0
RUNWAY_KEEP, RUNWAY_BLEND = 2.0, 12.0


def read_h(path):
    raw = path.read_bytes()
    magic, w, h, spacing, offset = struct.unpack("<4sHHff", raw[:16])
    assert magic == b"PIH2", magic
    r = np.frombuffer(zlib.decompress(raw[16:]), dtype="<u2").reshape(h, w).astype(np.int64)
    q = np.cumsum(np.cumsum(r, axis=0), axis=1) & 0xFFFF
    return q.astype(np.float64) / 100.0 - offset, spacing, offset


def write_h(path, heights, spacing, offset):
    q = np.rint((heights + offset) * 100.0).astype(np.int64)
    assert q.min() >= 0 and q.max() < 65536, (q.min(), q.max())
    pad = np.zeros((q.shape[0] + 1, q.shape[1] + 1), dtype=np.int64)
    pad[1:, 1:] = q
    r = (pad[1:, 1:] - pad[1:, :-1] - pad[:-1, 1:] + pad[:-1, :-1]) & 0xFFFF
    h, w = q.shape
    body = zlib.compress(r.astype("<u2").tobytes(), 9)
    path.write_bytes(struct.pack("<4sHHff", b"PIH2", w, h, spacing, offset) + body)


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def main():
    H, spacing, offset = read_h(SRC_H)
    meta = json.loads(META.read_text())
    poi = next(p for p in meta["pois"] if p["id"] == "southern-military-base")
    cx, cz, pad = poi["x"], poi["z"], poi["padHeight"]
    # The base's runway (the one whose line passes south of the compound).
    rw = min(
        meta["runways"],
        key=lambda r: abs(
            (r["a"][1] + (cx - r["a"][0]) * (r["b"][1] - r["a"][1]) / (r["b"][0] - r["a"][0])) - cz
        ),
    )
    (ax_, az_), (bx_, bz_) = rw["a"], rw["b"]
    L = np.hypot(bx_ - ax_, bz_ - az_)
    ux, uz = (bx_ - ax_) / L, (bz_ - az_) / L
    half = rw["width"] / 2

    n = H.shape[0]
    coords = np.arange(n) * spacing - HALF
    reach = 420.0
    i0 = int(np.searchsorted(coords, cx + X0 - reach)), int(np.searchsorted(coords, cx + X1 + reach))
    j0 = int(np.searchsorted(coords, cz + Z0 - reach)), int(np.searchsorted(coords, cz + 520 + reach))
    X, Z = np.meshgrid(coords[i0[0] : i0[1]], coords[j0[0] : j0[1]])
    lx, lz = X - cx, Z - cz

    # Along and across the runway (across: + to the south of its centre line, the compound -).
    s = (X - ax_) * ux + (Z - az_) * uz
    t = -(X - ax_) * uz + (Z - az_) * ux
    t_north = -t  # metres north of the centre line
    # The apron's south limit at each x: SHORT m short of the runway's north edge.
    z_edge = (az_ + ((cx + lx) - ax_) * (bz_ - az_) / (bx_ - ax_)) - cz - half - SHORT
    # Distance outside the apron (0 inside).
    dx = np.maximum(np.maximum(X0 - lx, lx - X1), 0)
    dz = np.maximum(np.maximum(Z0 - lz, lz - z_edge), 0)
    out = np.hypot(dx, dz)
    w = 1.0 - smooth(0.0, EASE, out)
    # Keep the runway and its shoulders.
    rw_out = np.hypot(
        np.maximum(np.maximum(-s, s - L), 0), np.maximum(np.abs(t_north) - half, 0)
    )
    w *= smooth(RUNWAY_KEEP, RUNWAY_KEEP + RUNWAY_BLEND, rw_out)

    sub = H[j0[0] : j0[1], i0[0] : i0[1]]
    before = sub.copy()
    sub[:] = sub * (1 - w) + pad * w
    inside = (dx == 0) & (dz == 0)
    print(
        f"apron {inside.sum()} posts: was {before[inside].min():.2f}..{before[inside].max():.2f} m, "
        f"now {sub[inside].min():.2f}..{sub[inside].max():.2f}; changed {np.abs(sub - before).max():.2f} m at most, "
        f"runway posts changed {np.abs((sub - before)[rw_out <= RUNWAY_KEEP]).max():.3f} m"
    )
    write_h(OUT_H, H, spacing, offset)


if __name__ == "__main__":
    main()
