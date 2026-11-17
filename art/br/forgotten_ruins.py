#!/usr/bin/env python3
"""Forgotten Ruins: a Maya city in the rainforest (owner, 2026-11-17: "build other big
neighborhood location to the map that have alot of deadspace/gras area … forgotten ruins …
some tropical forest", "amazon enviroment with gras/forest", "bygg där. gör denna jungle
location nästan lika stor som downtown").

The site is the main island's largest empty grassland, south of Riverwood and east of the
Southern Military Base: the river channels on its east side, the base's runway past its
south-west edge. This pass shapes it, after grade_roads.py:

 - the plaza and the town round it: flat at the centre's height within PLAZA m, eased out
   over PLAZA_BLEND m; the great temple's square to the north level with it;
 - the escarpment: a limestone ridge along the south, its north face a cliff over the plaza
   side, with the cenote (a pool, a water body) at its foot;
 - mounds: buried ruins under the forest floor, and a gentle swell of the jungle floor;
 - the land cover: rainforest (forest) over the whole location except the plaza clearing, the
   causeways (sacbe) out to the roads, the roads, the rivers and the runway's approach; rock on
   the escarpment's face; water in the cenote.

Roads and the runway are left exactly where they are (the ground within ROAD_KEEP m of a road,
RUNWAY_KEEP m of the runway, is not touched, and changes ease in over the next KEEP_BLEND m).

Reads height.v2.hf, landcover.v1.lc and world.v1.json; writes height.v3.hf, landcover.v2.lc
and world.v2.json (the POI and the cenote added). The server and the client load the same
files.

    python3 -I art/br/forgotten_ruins.py
"""
import json
import math
import struct
import zlib
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
BR = ROOT / "public/fps/br"
SRC_H, OUT_H = BR / "height.v2.hf", BR / "height.v3.hf"
SRC_C, OUT_C = BR / "landcover.v1.lc", BR / "landcover.v2.lc"
SRC_M, OUT_M = BR / "world.v1.json", BR / "world.v2.json"
HALF = 5000.0

CX, CZ = 2420.0, 1790.0
RADIUS = 420.0
PLAZA = 150.0
PLAZA_BLEND = 70.0
# The great temple's ground (north of the plaza): flat at its own mean height.
TEMPLE = (2420.0, 1585.0, 46.0)  # x, z, half size
TEMPLE_BLEND = 30.0
# The escarpment: a ridge from W to E along the south, crest CREST m above the plaza.
RIDGE = [(2250.0, 2020.0), (2380.0, 2000.0), (2520.0, 2010.0), (2620.0, 2045.0)]
CREST = 17.0
RIDGE_HALF = 34.0  # half its width at the base (south side gentle, north side a cliff)
CLIFF = 7.0  # metres from the crest to the cliff's foot (north)
# The cenote: a pool at the cliff's foot.
CENOTE = (2430.0, 1962.0, 17.0)  # x, z, radius
CENOTE_DEPTH = 3.6
CENOTE_DROP = 0.7  # water level below the plaza
MOUNDS = [  # x, z, radius, height: buried temples under the forest
    (2195.0, 1720.0, 26.0, 4.5),
    (2265.0, 1545.0, 22.0, 3.5),
    (2600.0, 1585.0, 24.0, 3.8),
    (2660.0, 1830.0, 20.0, 3.0),
    (2150.0, 1890.0, 22.0, 3.2),
    (2520.0, 1480.0, 18.0, 2.6),
]
ROAD_KEEP, RUNWAY_KEEP, KEEP_BLEND = 9.0, 70.0, 22.0
# Causeways (sacbeob) from the plaza's edge out to the roads: grass strips through the forest.
CAUSEWAYS = [((2420.0, 1790.0), (2330.0, 1445.0)), ((2420.0, 1790.0), (2770.0, 1720.0)),
             ((2420.0, 1790.0), (2080.0, 1700.0))]
CAUSEWAY_HALF = 6.0

WATER, GRASS, FOREST, ROCK, ROAD = 0, 2, 4, 5, 7


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


def seg_dist(px, pz, a, b):
    ax, az = a
    bx, bz = b
    dx, dz = bx - ax, bz - az
    L2 = dx * dx + dz * dz
    t = np.clip(((px - ax) * dx + (pz - az) * dz) / L2, 0.0, 1.0)
    return np.hypot(px - (ax + t * dx), pz - (az + t * dz))


def poly_dist(px, pz, pts):
    d = np.full(px.shape, np.inf)
    for a, b in zip(pts, pts[1:]):
        d = np.minimum(d, seg_dist(px, pz, a, b))
    return d


def noise(px, pz, size, seed):
    """Smooth value noise in [0, 1] (bilinear over a hashed lattice)."""
    gx, gz = px / size, pz / size
    i, j = np.floor(gx), np.floor(gz)
    fx, fz = gx - i, gz - j
    fx, fz = fx * fx * (3 - 2 * fx), fz * fz * (3 - 2 * fz)

    def h(a, b):
        v = np.sin(a * 127.1 + b * 311.7 + seed * 74.7) * 43758.5453
        return v - np.floor(v)

    return (h(i, j) * (1 - fx) + h(i + 1, j) * fx) * (1 - fz) + (
        h(i, j + 1) * (1 - fx) + h(i + 1, j + 1) * fx
    ) * fz


def main():
    H, spacing, offset = read_h(SRC_H)
    meta = json.loads(SRC_M.read_text())
    assert not any(p["id"] == "forgotten-ruins" for p in meta["pois"])
    n = H.shape[0]
    ax = np.arange(n) * spacing - HALF
    # The window the location covers (plus its blends).
    reach = RADIUS + 160
    i0, i1 = np.searchsorted(ax, [CX - reach, CX + reach])
    j0, j1 = np.searchsorted(ax, [CZ - reach, CZ + reach])
    X, Z = np.meshgrid(ax[i0:i1], ax[j0:j1])
    old = H[j0:j1, i0:i1].copy()
    r = np.hypot(X - CX, Z - CZ)
    base = float(old[np.abs(r) < 12].mean())

    # Where the ground may change: away from roads and the runway.
    road_d = np.full(X.shape, np.inf)
    for road in meta["roads"]:
        pts = road["points"]
        xs = [p[0] for p in pts]
        zs = [p[1] for p in pts]
        if max(xs) < CX - reach or min(xs) > CX + reach or max(zs) < CZ - reach or min(zs) > CZ + reach:
            continue
        road_d = np.minimum(road_d, poly_dist(X, Z, pts) - road["width"] / 2)
    run_d = np.full(X.shape, np.inf)
    for rw in meta["runways"]:
        run_d = np.minimum(run_d, seg_dist(X, Z, rw["a"], rw["b"]) - rw["width"] / 2)
    free = smooth(ROAD_KEEP, ROAD_KEEP + KEEP_BLEND, road_d) * smooth(
        RUNWAY_KEEP, RUNWAY_KEEP + KEEP_BLEND, run_d
    )
    inside = 1 - smooth(RADIUS - 30, RADIUS + 50, r)

    new = old.copy()
    # The plaza: flat at the centre's height.
    k = 1 - smooth(PLAZA, PLAZA + PLAZA_BLEND, r)
    new = new * (1 - k) + base * k
    # The great temple's square.
    tx, tz, th = TEMPLE
    td = np.maximum(np.abs(X - tx), np.abs(Z - tz))
    tk = 1 - smooth(th, th + TEMPLE_BLEND, td)
    tbase = base  # level with the plaza: the temple is one of the location's pad buildings
    # The jungle floor's swell (outside the plaza), up to ±1.2 m.
    swell = (noise(X, Z, 70.0, 3) - 0.5) * 2.4 * smooth(PLAZA + 20, PLAZA + PLAZA_BLEND + 40, r)
    new += swell * (1 - tk)
    new = new * (1 - tk) + tbase * tk
    # Mounds.
    for mx, mz, mr, mh in MOUNDS:
        d = np.hypot(X - mx, Z - mz) / mr
        new += mh * np.where(d < 1, (1 - d * d) ** 2, 0.0)
    # The escarpment: across the ridge line, a cliff on the north, a long slope south.
    ridge_d = poly_dist(X, Z, RIDGE)
    # Which side: the sign of the offset from the ridge in z (the ridge runs west-east).
    rz = np.interp(X, [p[0] for p in RIDGE], [p[1] for p in RIDGE])
    north = Z < rz
    ends = smooth(0, 40, np.minimum(X - RIDGE[0][0], RIDGE[-1][0] - X))
    rough = 0.85 + 0.3 * noise(X, Z, 18.0, 9)
    prof_n = 1 - smooth(CLIFF * 0.55, CLIFF * 1.45, ridge_d)  # steep
    prof_s = 1 - smooth(4.0, RIDGE_HALF * 1.6, ridge_d)  # gentle
    lift = CREST * ends * rough * np.where(north, prof_n, prof_s)
    new = np.where(lift > 0.05, np.maximum(new, base + lift), new)
    # The cenote: a bowl under the water.
    ccx, ccz, cr = CENOTE
    cd = np.hypot(X - ccx, Z - ccz)
    level = base - CENOTE_DROP
    bowl = level - CENOTE_DEPTH * (1 - smooth(0, cr, cd) ** 1.5)
    rim = smooth(cr - 1, cr + 6, cd)
    new = np.where(cd < cr + 6, np.minimum(new, bowl * (1 - rim) + new * rim), new)

    mix = free * inside
    out = old * (1 - mix) + new * mix
    H[j0:j1, i0:i1] = out
    write_h(OUT_H, H, spacing, offset)

    # Land cover.
    raw = SRC_C.read_bytes()
    assert raw[:4] == b"PIC1"
    cw, ch = struct.unpack("<HH", raw[4:8])
    C = np.frombuffer(zlib.decompress(raw[8:]), np.uint8).reshape(ch, cw).copy()
    cs = 2 * HALF / cw
    cax = (np.arange(cw) + 0.5) * cs - HALF
    ci0, ci1 = np.searchsorted(cax, [CX - reach, CX + reach])
    cj0, cj1 = np.searchsorted(cax, [CZ - reach, CZ + reach])
    CXg, CZg = np.meshgrid(cax[ci0:ci1], cax[cj0:cj1])
    cr_ = np.hypot(CXg - CX, CZg - CZ)
    sub = C[cj0:cj1, ci0:ci1]
    # The forest's edge: ragged, RADIUS ± 35 m.
    edge = RADIUS - 10 + (noise(CXg, CZg, 60.0, 5) - 0.5) * 70
    # East of the road the rainforest runs on down to the river channels' banks.
    edge = edge + 150 * smooth(CX + 250, CX + 380, CXg) * (1 - smooth(1500, 1450, CZg)) * (
        1 - smooth(2150, 2250, CZg)
    )
    clearing = PLAZA + 38 + (noise(CXg, CZg, 30.0, 6) - 0.5) * 30
    cw_d = np.full(CXg.shape, np.inf)
    for a, b in CAUSEWAYS:
        cw_d = np.minimum(cw_d, seg_dist(CXg, CZg, a, b))
    run_c = np.full(CXg.shape, np.inf)
    for rw in meta["runways"]:
        run_c = np.minimum(run_c, seg_dist(CXg, CZg, rw["a"], rw["b"]) - rw["width"] / 2)
    keep = (sub == WATER) | (sub == ROAD) | (run_c < RUNWAY_KEEP)
    jungle = (cr_ < edge) & (cr_ > clearing) & (cw_d > CAUSEWAY_HALF) & ~keep
    sub[jungle] = FOREST
    sub[(cr_ <= clearing) & ~keep] = GRASS
    sub[(cw_d <= CAUSEWAY_HALF) & (cr_ < edge) & ~keep] = GRASS
    # The escarpment's face: rock where the ground is steep.
    hi = ((CXg + HALF) / spacing).astype(int)
    hj = ((CZg + HALF) / spacing).astype(int)
    gz_, gx_ = np.gradient(H, spacing)
    steep = np.hypot(gx_, gz_)[hj, hi] > 0.7
    sub[steep & (cr_ < RADIUS) & ~keep] = ROCK
    ccd = np.hypot(CXg - ccx, CZg - ccz)
    sub[ccd < cr - 1.5] = WATER
    C[cj0:cj1, ci0:ci1] = sub
    OUT_C.write_bytes(raw[:8] + zlib.compress(C.tobytes(), 9))

    # The meta: the POI and the cenote.
    meta["pois"].append(
        dict(
            id="forgotten-ruins",
            name="Forgotten Ruins",
            kind="ruins",
            x=CX,
            z=CZ,
            radius=RADIUS,
            padHeight=round(base, 2),
            padRadius=0.0,
        )
    )
    meta["waterBodies"].append(
        dict(
            id="ruins-cenote",
            level=round(level, 2),
            bounds=[round(ccx - cr - 2, 1), round(ccz - cr - 2, 1), round(ccx + cr + 2, 1), round(ccz + cr + 2, 1)],
            areaHa=round(math.pi * cr * cr / 1e4, 2),
        )
    )
    OUT_M.write_text(json.dumps(meta, separators=(",", ":")))
    changed = np.abs(out - old)
    print(
        f"plaza {base:.2f} m, crest {out.max():.1f} m, cenote {level:.2f} m; "
        f"ground changed in {(changed > 0.05).sum()} cells (max {changed.max():.1f} m); "
        f"forest {(sub == FOREST).sum()} cover cells, rock {(sub == ROCK).sum()}"
    )


main()
