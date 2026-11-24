#!/usr/bin/env python3
"""The Southern Military Base's south road taken off the runway (owner, 2026-11-23: "road at the
airfield going incorrectly"; then "continue with still open one road").

Road 1095 ran from the base's turning loop south, out through the south gate, over the flight
line's apron and straight across the runway to the coast road (1094), which it met as a T. No
airfield has a public road across its runway, and nothing else crossed it.

The base keeps its other ways in (the roads north and east, and from the coast the road round
the runway's west end), so the road now ends on the flight line: from the loop through the south
gate and 50 m out onto the apron (to its point at z 1879.4), a service road onto the hard
standing. The rest (the apron's south half, the runway and the 300 m down to the coast road) is
gone: its land cover goes back to its neighbours' (polish_roads.repaint). The coast road had no
point at the T, so it is untouched. The ground needs nothing: the old line was graded smooth and
stays so.

world.v4 → world.v5, landcover.v4 → landcover.v5.

    python3 -I art/br/runway_road.py
"""
import json
import math
import struct
import sys
import zlib
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from polish_roads import repaint  # noqa: E402

BR = Path(__file__).resolve().parents[2] / "public/fps/br"
# Superseded world files are kept out of the deploy, in art/br/world-base (cleanup 2026-11-23):
# only the live height, land cover and meta (src/lib/fps/br/world.ts WORLD_ASSETS) are published.
BASE = Path(__file__).resolve().parents[2] / "art/br/world-base"
SRC_M, OUT_M = BASE / "world.v4.json", BR / "world.v5.json"
SRC_C, OUT_C = BASE / "landcover.v4.lc", BR / "landcover.v5.lc"

ROAD = 1095
# The road's first point on the coast road and its point at the base's loop.
SOUTH, NORTH = (1000.0, 2290.0), (1102.4, 1814.2)
# The last point kept, counted from the loop: 50 m onto the apron (it starts at z 1826.7).
KEEP_TO = (1070.6, 1879.4)


def crosses(points, a, b, half):
    """Whether a polyline comes within half of the segment a-b (the runway's centreline)."""
    ax, az = a
    dx, dz = b[0] - ax, b[1] - az
    length = math.hypot(dx, dz)
    ux, uz = dx / length, dz / length
    sides = set()
    for x, z in points:
        t = (x - ax) * ux + (z - az) * uz
        n = -(x - ax) * uz + (z - az) * ux
        if 0 <= t <= length:
            if abs(n) <= half:
                return True
            sides.add(n > 0)
    return len(sides) > 1


def main():
    meta = json.loads(SRC_M.read_text())
    old_roads = [dict(r, points=list(r["points"])) for r in meta["roads"]]
    road = meta["roads"][ROAD]
    pts = [tuple(p) for p in road["points"]]
    assert pts[0] == SOUTH and pts[-1] == NORTH, (pts[0], pts[-1])
    cut = pts.index(KEEP_TO)
    # Kept from the cut to the loop, in the old direction (the loop stays its end).
    road["points"] = [list(p) for p in pts[cut:]]
    kept = sum(math.dist(p, q) for p, q in zip(pts[cut:], pts[cut + 1 :]))
    gone = sum(math.dist(p, q) for p, q in zip(pts[: cut + 1], pts[1 : cut + 1]))
    print(f"road {ROAD}: kept {kept:.0f} m (loop to the apron), removed {gone:.0f} m")

    runway = meta["runways"][0]
    over = [i for i, r in enumerate(meta["roads"]) if crosses(r["points"], runway["a"], runway["b"], runway["width"] / 2)]
    print("roads over the runway now:", over)
    assert not over, over

    raw = SRC_C.read_bytes()
    assert raw[:4] == b"PIC1"
    cw, ch = struct.unpack("<HH", raw[4:8])
    C = np.frombuffer(zlib.decompress(raw[8:]), np.uint8).reshape(ch, cw).copy()
    C, given, added = repaint(C, old_roads, meta["roads"])
    print(f"land cover: {given} road cells given back to the land, {added} painted")
    OUT_C.write_bytes(raw[:8] + zlib.compress(C.tobytes(), 9))
    OUT_M.write_text(json.dumps(meta, separators=(",", ":")))


if __name__ == "__main__":
    main()
