#!/usr/bin/env python3
"""Old Fortress: a stone fortress on a hill (owner, 2026-11-17: "An old stone fortress with towers,
battlements, underground chambers, and a central courtyard. Multiple ways to breach the walls",
"Build this complex fortress, large one"), on the forested slope between the Arena and the west
strait bridge's road, marked on the owner's map.

This pass shapes the site after forgotten_ruins.py. The fortress itself stands on a built stone
base (build_fortress.mjs `fort-base`: its cellars and dungeon inside it, the courtyard on top,
BASE m over the ground), so the ground here is:

 - the ledge: flat at the base's foot (P) under the whole fortress and LEDGE m round it on the
   west, south and east, falling away past it in a rock slope (the hill the fortress crowns);
 - the ditch: on the north, where the slope rises behind the fortress, the ground cut down to the
   same level in a dry ditch DITCH m wide, its far side a steep rock bank up to the bridgehead (a
   pad at the courtyard's height, P + BASE, where the bridge to the gate lands);
 - the approach: a cleared track from the bridgehead to the road in the north-east (the ground
   there is gentle and left as it is);
 - the land cover: the hill cleared of forest within CLEAR m (a fortress keeps its field of fire),
   grass on the ledge, the ditch and the track, rock on the steep faces, built-up under the base.

Roads are left where they are (ROAD_KEEP m, easing in over KEEP_BLEND m).

Reads height.v3.hf, landcover.v2.lc and world.v2.json; writes height.v4.hf, landcover.v3.lc and
world.v3.json (the POI added).

    python3 -I art/br/old_fortress.py
"""
import json
import struct
import zlib
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
# Superseded world files are kept out of the deploy, in art/br/world-base (cleanup 2026-11-23):
# only the live height, land cover and meta (src/lib/fps/br/world.ts WORLD_ASSETS) are published.
BASE = ROOT / "art/br/world-base"
SRC_H, OUT_H = BASE / "height.v3.hf", BASE / "height.v4.hf"
SRC_C, OUT_C = BASE / "landcover.v2.lc", BASE / "landcover.v3.lc"
SRC_M, OUT_M = BASE / "world.v2.json", BASE / "world.v3.json"
HALF = 5000.0

CX, CZ = -1080.0, 1810.0
P = 41.0  # the ledge and the base's foot
BASE = 10.0  # the base's height: the courtyard at P + BASE
# The base's half sizes (x, z) and the ledge round it (west, south, east).
BX, BZ = 86.0, 76.0
LEDGE = 24.0
FALL = 16.0  # the rock slope from the ledge's edge down to the hillside
# The ditch on the north: from the base's face out DITCH m, then the bank up to the bridgehead.
DITCH = 24.0
BANK = 7.0
HEAD = (0.0, 20.0, 26.0)  # bridgehead: local x centre, half width, depth (north of the bank)
HEAD_BLEND = 45.0
# The track from the bridgehead to the road (its end, on the road).
TRACK_END = (-935.0, 1412.0)
TRACK_HALF = 4.0
CLEAR = 175.0
RADIUS = 270.0
ROAD_KEEP, KEEP_BLEND = 9.0, 22.0

WATER, GRASS, FOREST, ROCK, URBAN, ROAD = 0, 2, 4, 5, 6, 7


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


def seg_t(px, pz, a, b):
    ax, az = a
    bx, bz = b
    dx, dz = bx - ax, bz - az
    return np.clip(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0.0, 1.0)


def poly_dist(px, pz, pts):
    d = np.full(px.shape, np.inf)
    for a, b in zip(pts, pts[1:]):
        d = np.minimum(d, seg_dist(px, pz, a, b))
    return d


def noise(px, pz, size, seed):
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


def box_dist(lx, lz, hx, hz):
    """Distance outside an axis-aligned box of half sizes hx, hz (0 inside)."""
    dx = np.maximum(np.abs(lx) - hx, 0)
    dz = np.maximum(np.abs(lz) - hz, 0)
    return np.hypot(dx, dz)


def main():
    H, spacing, offset = read_h(SRC_H)
    meta = json.loads(SRC_M.read_text())
    assert not any(p["id"] == "old-fortress" for p in meta["pois"])
    n = H.shape[0]
    ax = np.arange(n) * spacing - HALF
    reach = RADIUS + 60
    i0, i1 = np.searchsorted(ax, [CX - reach, CX + reach])
    j0, j1 = np.searchsorted(ax, [CZ - reach, CZ + reach])
    X, Z = np.meshgrid(ax[i0:i1], ax[j0:j1])
    old = H[j0:j1, i0:i1].copy()
    lx, lz = X - CX, Z - CZ

    road_d = np.full(X.shape, np.inf)
    for road in meta["roads"]:
        pts = road["points"]
        xs = [p[0] for p in pts]
        zs = [p[1] for p in pts]
        if max(xs) < CX - reach or min(xs) > CX + reach or max(zs) < CZ - reach or min(zs) > CZ + reach:
            continue
        road_d = np.minimum(road_d, poly_dist(X, Z, pts) - road["width"] / 2)
    free = smooth(ROAD_KEEP, ROAD_KEEP + KEEP_BLEND, road_d)

    new = old.copy()
    rough = (noise(X, Z, 9.0, 4) - 0.5) * 1.6 + (noise(X, Z, 26.0, 5) - 0.5) * 2.4

    # The hill: the ledge flat at P round the base (west, south, east), the rock slope beyond it
    # down to the natural ground (or up to it, on the north and the uphill corners).
    ledge_d = box_dist(lx, lz, BX + LEDGE, BZ + LEDGE)
    k_ledge = 1 - smooth(0.0, FALL, ledge_d + np.minimum(rough, 0) * 0.6)
    new = new * (1 - k_ledge) + P * k_ledge
    # Where the slope falls away, a rocky lip: the hill's flanks stay steep near the ledge.
    below = np.clip(P - old, 0, None)
    lip = np.clip(1 - (ledge_d - 2) / (FALL * 1.6), 0, 1) * (ledge_d > 0)
    new = np.where((old < P) & (ledge_d > 0), np.maximum(new, old + below * lip ** 1.6 + rough * 0.4 * lip), new)

    # The ditch on the north: from the base's north face out DITCH m, across the whole width.
    north = -(lz + BZ)  # metres north of the base's north face
    span = 1 - smooth(BX + LEDGE, BX + LEDGE + FALL, np.abs(lx))
    k_ditch = np.where((north > -2) & (north < DITCH), 1.0, 0.0) * span
    new = new * (1 - k_ditch) + P * k_ditch
    # The bank: from the ditch's floor up to the bridgehead's level over BANK m (rock).
    top = P + BASE
    bank = smooth(DITCH, DITCH + BANK, north)
    hx, hw, hd = HEAD
    head_k = (1 - smooth(hw, hw + HEAD_BLEND, np.abs(lx - hx))) * (1 - smooth(DITCH + BANK + hd, DITCH + BANK + hd + HEAD_BLEND, north))
    # Behind the bank: the natural slope, but never below the bridgehead's level near it.
    behind = (north >= DITCH) * span
    target = np.maximum(old, P + (top - P) * bank)
    target = target * (1 - head_k * bank) + top * head_k * bank
    new = np.where(behind > 0, new * (1 - behind) + target * behind, new)

    # The track: from the bridgehead to the road (a cleared strip over the gentle ground; the
    # ground under it is left as it is).
    head_pt = (CX + hx, CZ - BZ - DITCH - BANK - hd)

    out = old * (1 - free) + new * free
    # Never touch the ground beyond the location.
    fade = 1 - smooth(RADIUS - 40, RADIUS + 40, np.hypot(lx, lz) - 40)
    out = old * (1 - fade) + out * fade
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
    clx, clz = CXg - CX, CZg - CZ
    sub = C[cj0:cj1, ci0:ci1]
    keep = (sub == WATER) | (sub == ROAD)
    edge = CLEAR + (noise(CXg, CZg, 40.0, 7) - 0.5) * 60
    clear = (np.hypot(clx, clz * 1.1) < edge) & ~keep
    sub[clear & (sub == FOREST)] = GRASS
    track = seg_dist(CXg, CZg, head_pt, TRACK_END) < TRACK_HALF + 1.5
    sub[track & ~keep] = GRASS
    hi = np.clip(((CXg + HALF) / spacing).astype(int), 0, n - 1)
    hj = np.clip(((CZg + HALF) / spacing).astype(int), 0, n - 1)
    gz_, gx_ = np.gradient(H, spacing)
    steep = np.hypot(gx_, gz_)[hj, hi] > 0.75
    near = np.hypot(clx, clz) < RADIUS - 30
    sub[steep & near & ~keep] = ROCK
    # Built-up under the fortress's base (its footprint, as every building pad is partly built):
    # nothing grows there, and the ground's shade under it is paving, not grass.
    sub[(np.abs(clx) < BX + 2) & (np.abs(clz) < BZ + 2)] = URBAN
    C[cj0:cj1, ci0:ci1] = sub
    OUT_C.write_bytes(raw[:8] + zlib.compress(C.tobytes(), 9))

    meta["pois"].append(
        dict(
            id="old-fortress",
            name="Old Fortress",
            kind="fortress",
            x=CX,
            z=CZ,
            radius=RADIUS,
            padHeight=P,
            padRadius=120.0,
        )
    )
    OUT_M.write_text(json.dumps(meta, separators=(",", ":")))
    changed = np.abs(out - old)
    print(
        f"ledge {P:.1f} m, courtyard {top:.1f} m; ground changed in "
        f"{(changed > 0.05).sum()} cells (max {changed.max():.1f} m); rock {(sub == ROCK).sum()} cover cells"
    )


main()
