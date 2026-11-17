#!/usr/bin/env python3
"""Roads graded into the terrain where they climb a cliff (owner, 2026-11-16: "audit and fix the
roads to be correct, no broken roads").

The roads were traced and the ground smoothed under them before the relief added on 2026-11-11
(build_world.py MORE_RELIEF: Pine Ridge's rock band, the spurs and headlands) and the higher
hills; where that relief crossed a road it left the road climbing a rock face: 17 places steeper
than 1 in 1 (up to 6 m of rise in 1 m), 64 steeper than 30 %. The road there was drawn as a
strip of asphalt up the face, or rose over it as a ridge.

For every road (world.v1.json, joined end to end through its joints) the centreline is sampled
every 2 m. Each stretch steeper than STEEP is widened, both ways, until its ends are no more
than GRADE apart (at most WINDOW m long), and the ground along the road there is graded: kept
where it is gentle enough, cut or filled where not (graded()). The carriageway
and `FLAT` m beyond each edge exactly, eased back into the hillside over `BLEND` m more (a
cutting through the rock, an embankment below it). Stretches within `BRIDGE_CLEAR` m of a
bridge's ends are left alone (their approaches are graded to the deck).

Reads public/fps/br/height.v1.hf, writes public/fps/br/height.v2.hf (the same format: "PIH2",
plane-predictor residuals, zlib). The server and the client load the same file.

    python3 -I art/br/grade_roads.py
"""
import json
import math
import struct
import zlib
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public/fps/br/height.v1.hf"
OUT = ROOT / "public/fps/br/height.v2.hf"
META = ROOT / "public/fps/br/world.v1.json"
WORLD_HALF = 5000.0

STEP = 2.0
STEEP = 0.25
GRADE = 0.15
WINDOW = 480.0
FLAT = 1.5
BLEND = 9.0
BRIDGE_CLEAR = 15.0
CUT_SHARE = 0.85
FILL_SLOPE = 1.6
PASSES = int(__import__("os").environ.get("PASSES", "3"))
ITERATIONS = 8000


def read(path):
    raw = path.read_bytes()
    magic, w, h, spacing, offset = struct.unpack("<4sHHff", raw[:16])
    assert magic == b"PIH2", magic
    r = np.frombuffer(zlib.decompress(raw[16:]), dtype="<u2").reshape(h, w).astype(np.int64)
    q = np.cumsum(np.cumsum(r, axis=0), axis=1) & 0xFFFF
    return q.astype(np.float64) / 100.0 - offset, spacing, offset


def write(path, heights, spacing, offset):
    q = np.rint((heights + offset) * 100.0).astype(np.int64)
    assert q.min() >= 0 and q.max() < 65536, (q.min(), q.max())
    pad = np.zeros((q.shape[0] + 1, q.shape[1] + 1), dtype=np.int64)
    pad[1:, 1:] = q
    r = (pad[1:, 1:] - pad[1:, :-1] - pad[:-1, 1:] + pad[:-1, :-1]) & 0xFFFF
    h, w = q.shape
    body = zlib.compress(r.astype("<u2").tobytes(), 9)
    path.write_bytes(struct.pack("<4sHHff", b"PIH2", w, h, spacing, offset) + body)


def grade(heights, spacing, meta):
    """One pass over the whole road network: every road sampled every STEP m, the samples at a
    junction one node; then, until no step between neighbouring nodes is steeper than GRADE,
    each steeper step is closed from both ends (cut above, fill below). Nodes within
    BRIDGE_CLEAR m of a bridge's end keep their height. Returns the ground with the changed
    road corridors stamped in, and a report of the changed stretches."""
    H, W = heights.shape

    def height_at(x, z):
        gx = (x + WORLD_HALF) / spacing
        gz = (z + WORLD_HALF) / spacing
        i = min(max(int(math.floor(gx)), 0), W - 2)
        j = min(max(int(math.floor(gz)), 0), H - 2)
        fx, fz = gx - i, gz - j
        a = heights[j, i] * (1 - fx) + heights[j, i + 1] * fx
        b = heights[j + 1, i] * (1 - fx) + heights[j + 1, i + 1] * fx
        return a * (1 - fz) + b * fz

    ends = [tuple(p) for b in meta["bridges"] for p in (b["a"], b["b"])]
    key = lambda x, z: (round(x * 2), round(z * 2))
    index = {}
    xs, zs, halves = [], [], []

    def node(x, z, half):
        k = key(x, z)
        if k not in index:
            index[k] = len(xs)
            xs.append(x)
            zs.append(z)
            halves.append(half)
        n = index[k]
        halves[n] = max(halves[n], half)
        return n

    ea, eb, ed = [], [], []
    for road in meta["roads"]:
        half = road["width"] / 2
        pts = road["points"]
        prev = None
        for k in range(len(pts) - 1):
            ax, az = pts[k]
            bx, bz = pts[k + 1]
            seg = math.hypot(bx - ax, bz - az)
            if seg < 0.01:
                continue
            n = max(1, int(math.ceil(seg / STEP)))
            for i in range(n + 1):
                if i == 0 and prev is not None:
                    continue
                cur = node(ax + (bx - ax) * i / n, az + (bz - az) * i / n, half)
                if prev is not None and cur != prev:
                    ea.append(prev)
                    eb.append(cur)
                    ed.append(seg / n)
                prev = cur
    xs, zs, halves = np.array(xs), np.array(zs), np.array(halves)
    # A road ending on another one's side (a T-junction, not at a shared point) is joined to
    # that road's nearest node: one carriageway, one height.
    degree = np.bincount(np.array(ea + eb), minlength=len(xs))
    cell = {}
    for n in range(len(xs)):
        cell.setdefault((int(xs[n] // 8), int(zs[n] // 8)), []).append(n)
    linked = set(zip(ea, eb)) | set(zip(eb, ea))
    for n in np.nonzero(degree == 1)[0]:
        cx, cz = int(xs[n] // 8), int(zs[n] // 8)
        best, best_d = None, halves[n] + 2.5
        for i in (-1, 0, 1):
            for j in (-1, 0, 1):
                for m in cell.get((cx + i, cz + j), []):
                    if m == n or (n, m) in linked:
                        continue
                    d = math.hypot(xs[m] - xs[n], zs[m] - zs[n])
                    # (Not its own road's next nodes: those are linked or further along it.)
                    if d < best_d and d > 0.01:
                        best, best_d = m, d
        if best is not None:
            ea.append(n)
            eb.append(best)
            ed.append(max(best_d, 1.0))
            linked |= {(n, best), (best, n)}
    ea, eb, ed = np.array(ea), np.array(eb), np.array(ed)
    h = np.array([height_at(x, z) for x, z in zip(xs, zs)])
    pinned = np.zeros(len(xs), dtype=bool)
    for ex, ez in ends:
        pinned |= np.hypot(xs - ex, zs - ez) < BRIDGE_CLEAR
    p = h.copy()
    limit = GRADE * ed
    for it in range(ITERATIONS):
        diff = p[ea] - p[eb]
        excess = np.abs(diff) - limit
        bad = excess > 1e-4
        if not bad.any():
            break
        # Mostly cut from the higher end (a cutting), little fill under the lower one: a tall
        # narrow embankment stood up as a pyramid.
        hi_end = np.where(diff > 0, ea, eb)
        lo_end = np.where(diff > 0, eb, ea)
        delta = np.zeros(len(p))
        count = np.zeros(len(p))
        np.add.at(delta, hi_end, np.where(bad, -excess * CUT_SHARE, 0.0))
        np.add.at(delta, lo_end, np.where(bad, excess * (1 - CUT_SHARE), 0.0))
        np.add.at(count, ea, bad.astype(float))
        np.add.at(count, eb, bad.astype(float))
        p += np.where(count > 0, delta / np.maximum(count, 1), 0.0)
        p[pinned] = h[pinned]
    steps = np.abs(p[ea] - p[eb]) / ed
    print(f"  {it + 1} iterations; steepest step left {steps.max():.3f}")
    changed = np.abs(p - h) > 0.02
    # Stamp the changed nodes, and every node near them at its own height (a road the grading
    # does not touch keeps its ground). Nearest node wins each grid point.
    near_cells = set(zip((xs[changed] // 64).astype(int), (zs[changed] // 64).astype(int)))
    best_d = np.full((H, W), np.inf)
    target = np.zeros((H, W))
    reach = np.zeros((H, W))
    blend = np.full((H, W), BLEND)
    for n in range(len(xs)):
        cx, cz = int(xs[n] // 64), int(zs[n] // 64)
        if not any((cx + i, cz + j) in near_cells for i in (-1, 0, 1) for j in (-1, 0, 1)):
            continue
        # A fill's sides slope out FILL_SLOPE m a metre of its height (an embankment, not a wall).
        b_n = max(BLEND, FILL_SLOPE * max(0.0, p[n] - h[n]))
        r_out = halves[n] + FLAT + b_n
        cells = int(math.ceil(r_out / spacing)) + 1
        ci = int(round((xs[n] + WORLD_HALF) / spacing))
        cj = int(round((zs[n] + WORLD_HALF) / spacing))
        j0, j1 = max(cj - cells, 0), min(cj + cells, H - 1)
        i0, i1 = max(ci - cells, 0), min(ci + cells, W - 1)
        gx = np.arange(i0, i1 + 1) * spacing - WORLD_HALF
        gz = np.arange(j0, j1 + 1) * spacing - WORLD_HALF
        dist = np.hypot(gx[None, :] - xs[n], gz[:, None] - zs[n])
        win = best_d[j0 : j1 + 1, i0 : i1 + 1]
        closer = dist < win
        win[closer] = dist[closer]
        target[j0 : j1 + 1, i0 : i1 + 1][closer] = p[n]
        reach[j0 : j1 + 1, i0 : i1 + 1][closer] = halves[n] + FLAT
        blend[j0 : j1 + 1, i0 : i1 + 1][closer] = b_n
    t = np.clip((best_d - reach) / blend, 0.0, 1.0)
    weight = np.where(np.isfinite(best_d), 1.0 - t * t * (3 - 2 * t), 0.0)
    # The ground at a bridge's ends stays exactly where it was (the deck's height comes from
    # it): none within 8 m of an end, easing in by 20 m.
    gx = np.arange(W) * spacing - WORLD_HALF
    gz = np.arange(H) * spacing - WORLD_HALF
    for ex, ez in ends:
        i0, i1 = max(int((ex - 25 + WORLD_HALF) / spacing), 0), min(int((ex + 25 + WORLD_HALF) / spacing) + 1, W)
        j0, j1 = max(int((ez - 25 + WORLD_HALF) / spacing), 0), min(int((ez + 25 + WORLD_HALF) / spacing) + 1, H)
        dist = np.hypot(gx[None, i0:i1] - ex, gz[j0:j1, None] - ez)
        u = np.clip((dist - 8.0) / 12.0, 0.0, 1.0)
        weight[j0:j1, i0:i1] *= u * u * (3 - 2 * u)
    # The report: changed stretches as clusters of changed nodes.
    report = []
    for n in np.nonzero(changed)[0]:
        c = next((r for r in report if math.hypot(r["x"] - xs[n], r["z"] - zs[n]) < 80), None)
        if c is None:
            c = {"x": float(xs[n]), "z": float(zs[n]), "nodes": 0, "cut": 0.0, "fill": 0.0}
            report.append(c)
        c["nodes"] += 1
        c["cut"] = max(c["cut"], round(float(h[n] - p[n]), 1))
        c["fill"] = max(c["fill"], round(float(p[n] - h[n]), 1))
    return heights + weight * (target - heights), report, float(steps.max())


def main():
    heights, spacing, offset = read(SRC)
    meta = json.loads(META.read_text())
    original = heights
    # Again on its own result (the ground under a node is read back from the stamped grid).
    for n in range(PASSES):
        heights, report, steepest = grade(heights, spacing, meta)
        print(f"pass {n + 1}: {len(report)} stretches, steepest {steepest:.3f}")
    moved = np.abs(heights - original)
    write(OUT, heights, spacing, offset)
    print(
        f"{int((moved > 0.05).sum())} grid points moved, most {moved.max():.1f} m "
        f"→ {OUT.relative_to(ROOT)}"
    )
    (ROOT / "art/br/grade_roads.report.json").write_text(
        json.dumps(sorted(report, key=lambda r: -max(r["cut"], r["fill"])), indent=1) + "\n"
    )


if __name__ == "__main__":
    main()
