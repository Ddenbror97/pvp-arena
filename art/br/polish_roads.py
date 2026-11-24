#!/usr/bin/env python3
"""The island's roads, audited and polished (owner, 2026-11-18: "audit all of the roads cross the
map for battle royale. remove deadend roads, roads that have no meaning. every road should be
connected and have a propose "meaning" no objects under the road, the roads should connect
smoothly, no bumpy roads, flat/straight well organizad").

What the audit found in world.v3.json (1,137 roads, 263 km):

  - 100 hooks: a road's first or last metre or two turned back on itself where it was snapped to
    a junction a little behind its end (a spike of asphalt at the junction), 4 longer spikes and
    5 hooks of up to 40 m;
  - 16 dead ends that lead nowhere (no farm, cabin or camp at the end, no POI, no bridge) and 4
    roads stopping 20-60 m short of the bridge or dam they lead to;
  - doubled roads: the strait roads (strait_roads(), added last) laid beside older ones: a loop
    off the north cable bridge's foot back onto the main road, a beach road from the same foot
    onto the sand and into the shallows, the old road beside the south island's main road, and
    470 m of a road a few metres beside another east of Redstone Quarry;
  - the quarry's two haul roads ended 100-200 m short of the network;
  - 171 bumps: the road's ground more than 35 cm off its own 22 m mean (up to 0.75 m).

What this does (world.v3 → world.v4, landcover.v3 → landcover.v4, height.v4 → height.v5):

  1. Hooks and spikes dropped; longer hooks re-joined as a T where the road leaves.
  2. The doubled roads and the stubs to nowhere removed (REMOVE); the roads short of a bridge or
     the dam taken onto its end (CONNECT); the quarry's haul roads branch onto the network.
  3. What that leaves hanging: a stub goes (and the piece behind it, while what is given up
     stays under STUB m); a longer road to nowhere gets a destination instead: its end joins
     roadEnds, where layout.ts countryside() puts a farm, a cabin or a camp.
  4. The land cover under the roads removed goes back to its neighbours' (no asphalt-grey strip
     left in a field); the new branches are painted road.
  5. Every road outside the POIs is graded smooth along its length: its ground eased onto a
     26 m mean (twice; never more than MAX_SHIFT), the carriageway and FLAT m beyond exactly, blended out over BLEND m.
     Not within BRIDGE_CLEAR of a bridge's ends (graded to the deck already) nor inside a POI
     (its buildings stand on pads).

    python3 -I art/br/polish_roads.py
"""
import json
import math
import struct
import zlib
from collections import defaultdict
from pathlib import Path

import numpy as np

# Superseded world files are kept out of the deploy, in art/br/world-base (cleanup 2026-11-23):
# only the live height, land cover and meta (src/lib/fps/br/world.ts WORLD_ASSETS) are published.
BASE = Path(__file__).resolve().parents[2] / "art/br/world-base"
SRC_M, OUT_M = BASE / "world.v3.json", BASE / "world.v4.json"
SRC_C, OUT_C = BASE / "landcover.v3.lc", BASE / "landcover.v4.lc"
SRC_H, OUT_H = BASE / "height.v4.hf", BASE / "height.v5.hf"
HALF = 5000.0
WATER, GRASS, FIELD, FOREST, ROCK, URBAN, ROAD = 0, 2, 3, 4, 5, 6, 7

STUB = 200.0
STEP = 2.0
MEAN = 13  # samples: the 26 m mean
# A bump is eased out, a hill is not moved: the ground never shifts more than this.
MAX_SHIFT = 1.2
FLAT = 1.5
BLEND = 6.0
BRIDGE_CLEAR = 40.0
MIN_SHIFT = 0.04
# Left as they are: a dip on the road east of Redstone Quarry where the graded ground, between
# the drawn road's triangles and its own, came up through the asphalt by a few millimetres.
LEAVE = [(4414.5, -4291.5)]

REMOVE = {
    1122: "doubles 1125 for 470 m (x 4390, z -3710..-3255)",
    656: "the old road beside the south island's main road 1132 (x 608..751)",
    657: "the old road beside the south island's main road 1132 (x 751..911)",
    1066: "a loop off the north cable bridge's foot back onto the main road 1128 (with 625, 623)",
    625: "the same loop",
    623: "the same loop",
    624: "a beach road from the north cable bridge's foot onto the sand and into the shallows",
    622: "the beach road's other half",
    388: "a 110 m stub ending in a field",
    0: "a 64 m stub ending in the forest",
    299: "an 84 m stub",
    407: "a 116 m stub",
    585: "a 279 m stub ending in a field",
    634: "a 60 m stub",
    662: "a 22 m stub beside the south cable bridge's end",
    732: "a 78 m stub",
    796: "an 83 m stub",
    852: "a 50 m stub",
    1104: "a 74 m stub",
    1114: "a 40 m stub",
}
# Roads whose end stops short of a bridge's or the dam's end: (the end, where it goes).
CONNECT = {
    398: ([598, -235], [625.8, -198.7]),
    401: ([-418, -417], [-393.6, -454.4]),
    # (Onto the dam's approach, 12.6 m out from its end: bridges.ts bridgeApproaches.)
    416: ([-2576, -158], [-2556.1, -115.9]),
    421: ([-2627, -95], [-2556.1, -115.9]),
    1101: ([4398, -3714], "onto:1125"),  # onto 1125, where the removed 1122 had taken it
}
# The quarry's haul roads: (road, the ring's point the branch leaves from, the branch's end).
QUARRY = [(1135, [3945, -4011], [3952.9, -4123.7]), (1136, [2796, -2882], [2755.6, -2795.1])]


def dist(a, b):
    return math.hypot(b[0] - a[0], b[1] - a[1])


def turn(a, b, c):
    u = (b[0] - a[0], b[1] - a[1])
    v = (c[0] - b[0], c[1] - b[1])
    nu, nv = math.hypot(*u), math.hypot(*v)
    if nu < 1e-6 or nv < 1e-6:
        return 0.0
    return math.degrees(math.acos(max(-1.0, min(1.0, (u[0] * v[0] + u[1] * v[1]) / (nu * nv)))))


def project(p, roads, skip=None, only=None):
    """The nearest point of the roads to p: (distance, point)."""
    best = (1e9, None)
    for j, q in enumerate(roads):
        if j == skip or (only is not None and j != only):
            continue
        pts = q["points"]
        for a, b in zip(pts, pts[1:]):
            ex, ez = b[0] - a[0], b[1] - a[1]
            l2 = ex * ex + ez * ez or 1.0
            t = max(0.0, min(1.0, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ez) / l2))
            c = [a[0] + ex * t, a[1] + ez * t]
            d = dist(c, p)
            if d < best[0]:
                best = (d, c)
    return best


def polish(meta, log):
    roads = meta["roads"]
    # 1. Duplicate points, hooks at the ends, spikes.
    for r in roads:
        p = [r["points"][0]]
        for q in r["points"][1:]:
            if dist(p[-1], q) > 0.5:
                p.append(q)
        changed = True
        while changed and len(p) > 2:
            changed = False
            if dist(p[0], p[1]) < 8 and turn(p[0], p[1], p[2]) > 100:
                p.pop(0)
                log["hooks"] += 1
                changed = True
            elif dist(p[-2], p[-1]) < 8 and turn(p[-3], p[-2], p[-1]) > 100:
                p.pop()
                log["hooks"] += 1
                changed = True
            else:
                for k in range(1, len(p) - 1):
                    if turn(p[k - 1], p[k], p[k + 1]) > 150 and min(dist(p[k - 1], p[k]), dist(p[k], p[k + 1])) < 30:
                        p.pop(k)
                        log["spikes"] += 1
                        changed = True
                        break
        r["points"] = p
    for i, r in enumerate(roads):
        p = r["points"]
        for front in (True, False):
            if len(p) < 3:
                break
            a, b, c = (p[0], p[1], p[2]) if front else (p[-1], p[-2], p[-3])
            if dist(a, b) < 40 and turn(a, b, c) > 115:
                d, q = project(b, roads, skip=i)
                if q is not None and d < dist(a, b) + 5 and turn(q, b, c) <= 115:
                    q = [round(q[0], 1), round(q[1], 1)]
                    if front:
                        p[0] = q
                    else:
                        p[-1] = q
                    log["hooks re-joined"] += 1
        for k in range(1, len(p) - 1):
            if turn(p[k - 1], p[k], p[k + 1]) > 130 and min(dist(p[k - 1], p[k]), dist(p[k], p[k + 1])) < 45:
                p.pop(k)
                log["spikes"] += 1
                break
    # 2. Connections, the quarry's branches, the removals.
    for i, (end, target) in CONNECT.items():
        if isinstance(target, str):
            target = project(end, roads, only=int(target.split(":")[1]))[1]
        target = [round(target[0], 1), round(target[1], 1)]
        pts = roads[i]["points"]
        if dist(pts[0], end) < dist(pts[-1], end):
            pts.insert(0, target)
        else:
            pts.append(target)
        log["joined to a bridge, the dam or a road"] += 1
    for i, start, branch in QUARRY:
        pts = roads[i]["points"]
        k = min(range(len(pts)), key=lambda j: dist(pts[j], start))
        assert k < 4, (i, k)
        roads[i]["points"] = pts[k:]
        mid = [(pts[k][0] + branch[0]) / 2, (pts[k][1] + branch[1]) / 2]
        roads.append({"width": roads[i]["width"], "points": [pts[k], mid, branch]})
        log["quarry branches"] += 1
    kept = [r for i, r in enumerate(roads) if i not in REMOVE]
    log["removed (doubled, stubs)"] = len(REMOVE)
    # 3. What is left hanging.
    ends = {(round(e[0], 1), round(e[1], 1)) for e in meta["roadEnds"]}

    def joined(p, skip):
        return project(p, kept, skip=skip)[0] < 8

    def purposeful(p):
        if (round(p[0], 1), round(p[1], 1)) in ends:
            return True
        if any(dist(p, e) < 30 for b in meta["bridges"] for e in (b["a"], b["b"])):
            return True
        return any(dist(p, (q["x"], q["z"])) < q.get("radius", 100) * 0.8 for q in meta["pois"])

    given = {}
    new_ends = []
    while True:
        drop, far = set(), []
        for i, r in enumerate(kept):
            pts = r["points"]
            length = sum(dist(a, b) for a, b in zip(pts, pts[1:]))
            for e, other, nxt in ((pts[0], pts[-1], pts[1]), (pts[-1], pts[0], pts[-2])):
                if joined(e, i) or purposeful(e):
                    continue
                spent = given.get((round(e[0], 1), round(e[1], 1)), 0.0)
                if spent + length <= STUB:
                    drop.add(i)
                    given[(round(other[0], 1), round(other[1], 1))] = spent + length
                else:
                    d = dist(e, nxt) or 1.0
                    far.append([round(e[0], 1), round(e[1], 1), round((e[0] - nxt[0]) / d, 3), round((e[1] - nxt[1]) / d, 3)])
                break
        if not drop:
            for f in far:
                if (f[0], f[1]) not in ends:
                    new_ends.append(f)
                    ends.add((f[0], f[1]))
            break
        log["stubs left hanging, removed"] += len(drop)
        kept = [r for i, r in enumerate(kept) if i not in drop]
    log["roads to nowhere given a site at their end"] = len(new_ends)
    # 4. Pieces of road joined to nothing at all (a tangle of 9 m bits east of the quarry): the
    # network is one piece, crossing the rivers and the strait on its bridges.
    parent = list(range(len(kept)))

    def root(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for i, r in enumerate(kept):
        for e in (r["points"][0], r["points"][-1]):
            for j, q in enumerate(kept):
                if j != i and project(e, [q])[0] < 8:
                    parent[root(i)] = root(j)
    for b in meta["bridges"]:
        near = [i for i, r in enumerate(kept) for e in (b["a"], b["b"]) if any(dist(p, e) < 40 for p in r["points"])]
        for i in near[1:]:
            parent[root(i)] = root(near[0])
    sizes = defaultdict(float)
    for i, r in enumerate(kept):
        sizes[root(i)] += sum(dist(a, b) for a, b in zip(r["points"], r["points"][1:]))
    main_ = max(sizes, key=sizes.get)
    loose = {i for i in range(len(kept)) if root(i) != main_ and sizes[root(i)] < 150}
    log["loose pieces removed"] = len(loose)
    kept = [r for i, r in enumerate(kept) if i not in loose]
    meta["roads"] = kept
    meta["roadEnds"] = meta["roadEnds"] + new_ends
    return meta


# ---------------------------------------------------------------- rasters


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
    path.write_bytes(struct.pack("<4sHHff", b"PIH2", w, h, spacing, offset) + zlib.compress(r.astype("<u2").tobytes(), 9))


def strip_mask(roads, n, cell, extra, centre=0.5):
    """Cells of an n × n grid (cell m) whose centre (the height grid: its nodes, centre=0) lies
    within a road's half width + extra."""
    mask = np.zeros((n, n), dtype=bool)
    for r in roads:
        half = r["width"] / 2 + extra
        pts = np.array(r["points"], float)
        for a, b in zip(pts, pts[1:]):
            lo = np.minimum(a, b) - half
            hi = np.maximum(a, b) + half
            i0, i1 = max(0, int((lo[0] + HALF) / cell)), min(n - 1, int((hi[0] + HALF) / cell) + 1)
            j0, j1 = max(0, int((lo[1] + HALF) / cell)), min(n - 1, int((hi[1] + HALF) / cell) + 1)
            if i1 < i0 or j1 < j0:
                continue
            xs = (np.arange(i0, i1 + 1) + centre) * cell - HALF
            zs = (np.arange(j0, j1 + 1) + centre) * cell - HALF
            X, Z = np.meshgrid(xs, zs)
            e = b - a
            l2 = float(e @ e) or 1.0
            t = np.clip(((X - a[0]) * e[0] + (Z - a[1]) * e[1]) / l2, 0, 1)
            d = np.hypot(X - a[0] - e[0] * t, Z - a[1] - e[1] * t)
            mask[j0 : j1 + 1, i0 : i1 + 1] |= d <= half
    return mask


def repaint(C, old_roads, new_roads):
    n = C.shape[0]
    cell = 2 * HALF / n
    old = strip_mask(old_roads, n, cell, 1.0)
    new = strip_mask(new_roads, n, cell, 1.0)
    gone = old & ~new & (C == ROAD)
    # Each cell given up takes the commonest land (not road, not water) within two cells.
    out = C.copy()
    for j, i in zip(*np.nonzero(gone)):
        win = C[max(0, j - 2) : j + 3, max(0, i - 2) : i + 3].ravel()
        win = win[(win != ROAD) & (win != WATER)]
        out[j, i] = np.bincount(win).argmax() if win.size else GRASS
    added = new & ~old & (C != WATER) & (C != ROAD)
    out[added] = ROAD
    return out, int(gone.sum()), int(added.sum())


def grade(H, spacing, meta, log):
    """Each road's ground eased onto its own mean along it (see the module's docstring)."""
    n = H.shape[0]
    src = H.copy()
    # Per node: the nearest road sample's shift (by distance), so the ups and downs of a bump a
    # few metres apart are not averaged away on the 3.9 m grid.
    best = np.full(H.shape, np.inf)
    goal = np.zeros_like(H)
    strength = np.zeros_like(H)
    halves = np.zeros_like(H)

    def height(x, z):
        gx, gz = (x + HALF) / spacing, (z + HALF) / spacing
        i = np.clip(np.floor(gx).astype(int), 0, n - 2)
        j = np.clip(np.floor(gz).astype(int), 0, n - 2)
        fx, fz = gx - i, gz - j
        return (src[j, i] * (1 - fx) * (1 - fz) + src[j, i + 1] * fx * (1 - fz) + src[j + 1, i] * (1 - fx) * fz + src[j + 1, i + 1] * fx * fz)

    bridge_ends = [e for b in meta["bridges"] for e in (b["a"], b["b"])]
    # (A POI's pad: its buildings stand there. Its radius reaches far into the countryside.)
    pois = [(q["x"], q["z"], q.get("padRadius") or q.get("radius", 100) * 0.4) for q in meta["pois"]]
    for r in meta["roads"]:
        pts = np.array(r["points"], float)
        seg = np.hypot(*np.diff(pts, axis=0).T)
        s = np.concatenate([[0], np.cumsum(seg)])
        if s[-1] < 30:
            continue
        t = np.arange(0, s[-1] + 1e-6, STEP)
        x, z = np.interp(t, s, pts[:, 0]), np.interp(t, s, pts[:, 1])
        y = height(x, z)
        target = y.copy()
        for _ in range(2):
            pad = np.pad(target, (MEAN // 2, MEAN // 2), mode="edge")
            target = np.convolve(pad, np.ones(MEAN) / MEAN, mode="valid")
        # The ends stay where they meet the rest (a junction, a bridge): eased in over the mean.
        k = np.minimum(t, s[-1] - t) / (STEP * MEAN)
        delta = (target - y) * np.clip(k, 0, 1)
        for ex, ez in bridge_ends:
            delta[np.hypot(x - ex, z - ez) < BRIDGE_CLEAR] = 0
        for px, pz, pr in pois:
            delta[np.hypot(x - px, z - pz) < pr] = 0
        for px, pz in LEAVE:
            delta[np.hypot(x - px, z - pz) < 30] = 0
        moving = np.abs(delta) >= MIN_SHIFT
        if not moving.any():
            continue
        # How far each sample may move the ground: fully where the road is graded, easing to
        # nothing over a mean's length round a stretch left alone (a bridge's end, a POI).
        keep = (k > 0) & ~np.isin(np.arange(len(t)), np.nonzero(delta == 0)[0])
        free = np.convolve(np.pad(keep.astype(float), (MEAN // 2, MEAN // 2), mode="edge"), np.ones(MEAN) / MEAN, mode="valid")
        free = np.minimum(free, keep.astype(float))
        aim = y + np.clip((target - y) * np.clip(k, 0, 1), -MAX_SHIFT, MAX_SHIFT)
        log["roads graded"] += 1
        log["metres of road graded"] += int(np.count_nonzero(moving) * STEP)
        half = r["width"] / 2 + FLAT + spacing * 0.7
        reach = half + BLEND
        for xc, zc, ac, fc in zip(x, z, aim - y, free):
            if fc <= 0:
                continue
            i0, i1 = max(0, int((xc - reach + HALF) / spacing)), min(n - 1, int((xc + reach + HALF) / spacing) + 1)
            j0, j1 = max(0, int((zc - reach + HALF) / spacing)), min(n - 1, int((zc + reach + HALF) / spacing) + 1)
            X, Z = np.meshgrid(np.arange(i0, i1 + 1) * spacing - HALF, np.arange(j0, j1 + 1) * spacing - HALF)
            d = np.hypot(X - xc, Z - zc)
            b = best[j0 : j1 + 1, i0 : i1 + 1]
            closer = d < b
            b[closer] = d[closer]
            goal[j0 : j1 + 1, i0 : i1 + 1][closer] = ac
            strength[j0 : j1 + 1, i0 : i1 + 1][closer] = fc
            halves[j0 : j1 + 1, i0 : i1 + 1][closer] = half
    # Full within the carriageway and FLAT beyond (half; the grid's half diagonal more, so a node
    # under the road's edge counts), eased out over BLEND.
    w = np.clip((halves + BLEND - best) / BLEND, 0, 1)
    w = w * w * (3 - 2 * w) * strength
    # The shift along the road, not a level: the ground across it keeps its own fall (a road
    # on a hillside is not cut level into it).
    H = src + goal * w
    shift = H - src
    log["largest shift (m)"] = round(float(np.abs(shift).max()), 2)
    j, i = np.unravel_index(np.argmax(np.abs(shift)), shift.shape)
    log["  at"] = f"({i * spacing - HALF:.0f}, {j * spacing - HALF:.0f})"
    log["ground nodes moved over 1 m"] = int((np.abs(shift) > 1).sum())
    log["ground nodes moved"] = int((np.abs(shift) > 0.01).sum())
    return H


def main():
    log = defaultdict(int)
    meta = json.loads(SRC_M.read_text())
    old_roads = [dict(r, points=list(r["points"])) for r in meta["roads"]]
    meta = polish(meta, log)
    H, spacing, offset = read_h(SRC_H)
    # Twice: the first pass's bilinear ground between the grid's nodes keeps a little of a
    # bump that sat between them.
    for _ in range(2):
        H = grade(H, spacing, meta, log)

    write_h(OUT_H, H, spacing, offset)
    raw = SRC_C.read_bytes()
    assert raw[:4] == b"PIC1"
    cw, ch = struct.unpack("<HH", raw[4:8])
    C = np.frombuffer(zlib.decompress(raw[8:]), np.uint8).reshape(ch, cw).copy()
    C, gone, added = repaint(C, old_roads, meta["roads"])
    log["road cells given back to the land"] = gone
    log["road cells painted (new branches)"] = added
    OUT_C.write_bytes(raw[:8] + zlib.compress(C.tobytes(), 9))
    OUT_M.write_text(json.dumps(meta, separators=(",", ":")))
    for k, v in log.items():
        print(f"{k}: {v}")


if __name__ == "__main__":
    main()
