"""Shared fit-out helpers (boxes, liner walls, slabs, doors, cuts) for the fit-out generators."""

T = 0.15  # liner and partition thickness


def r(v):
    return round(v, 3)


def box(x0, y0, z0, x1, y1, z1):
    return [r(x0), r(y0), r(z0), r(x1), r(y1), r(z1)]


def wall_x(z, x0, x1, y0, y1, gaps=(), t=T):
    """A wall along x at z (thickness t towards +z), with door gaps (centre x, width, height)."""
    out, cur = [], x0
    for c, w, h in sorted(gaps):
        a, b = c - w / 2, c + w / 2
        if a > cur:
            out.append(box(cur, y0, z, a, y1, z + t))
        if h < y1 - y0:
            out.append(box(a, y0 + h, z, b, y1, z + t))
        cur = b
    if cur < x1:
        out.append(box(cur, y0, z, x1, y1, z + t))
    return out


def wall_z(x, z0, z1, y0, y1, gaps=(), t=T):
    """A wall along z at x (thickness t towards +x), with door gaps (centre z, width, height)."""
    return [[b[2], b[1], b[0], b[5], b[4], b[3]] for b in wall_x(x, z0, z1, y0, y1, gaps, t)]


def liner(x0, x1, z0, z1, y0, y1, gaps=None):
    """Liner walls just inside a shell's inner faces; gaps per side 'n' (z0), 's', 'w' (x0), 'e'."""
    g = gaps or {}
    return (
        wall_x(z0, x0, x1, y0, y1, g.get("n", ()))
        + wall_x(z1 - T, x0, x1, y0, y1, g.get("s", ()))
        + wall_z(x0, z0 + T, z1 - T, y0, y1, g.get("w", ()))
        + wall_z(x1 - T, z0 + T, z1 - T, y0, y1, g.get("e", ()))
    )


def slab(x0, x1, z0, z1, y, thick=0.2, hole=None):
    """A floor or ceiling slab (top at y) with an optional rectangular hole (x0, x1, z0, z1)."""
    if not hole:
        return [box(x0, y - thick, z0, x1, y, z1)]
    hx0, hx1, hz0, hz1 = hole
    parts = [
        (x0, x1, z0, hz0),
        (x0, x1, hz1, z1),
        (x0, hx0, hz0, hz1),
        (hx1, x1, hz0, hz1),
    ]
    return [box(a, y - thick, c, b, y, d) for a, b, c, d in parts if b - a > 0.05 and d - c > 0.05]


def door(x, z, y0, y1, along, width):
    return {"x": r(x), "z": r(z), "y0": r(y0), "y1": r(y1), "along": along, "width": r(width)}


def cut_x(x, z0, z1, y0, y1, width):
    """Cut a doorway through a wall running along x (centre x, the wall between z0 and z1)."""
    return box(x - width / 2, y0, z0, x + width / 2, y1, z1)


def cut_z(z, x0, x1, y0, y1, width):
    return box(x0, y0, z - width / 2, x1, y1, z + width / 2)


def _subtract(intervals, a, b):
    out = []
    for p, q in intervals:
        if b <= p or a >= q:
            out.append((p, q))
            continue
        if a > p:
            out.append((p, a))
        if b < q:
            out.append((b, q))
    return out


def room_liners(rects, y0, y1, gaps=(), t=T):
    """Liner walls round the union of rectangles (x0, x1, z0, z1): one wall of thickness t on the
    inside of every stretch of the union's outline. gaps: (x, z, width, height) openings on the
    outline (a doorway), cut out of whichever wall they fall on."""
    eps = 1e-3
    walls = []
    for i, (x0, x1, z0, z1) in enumerate(rects):
        others = [r for j, r in enumerate(rects) if j != i]
        for side in ("n", "s", "w", "e"):
            if side in ("n", "s"):
                c, out = (z0, z0 - eps) if side == "n" else (z1, z1 + eps)
                segs = [(x0, x1)]
                for a0, a1, b0, b1 in others:
                    if b0 < out < b1:
                        segs = _subtract(segs, a0, a1)
            else:
                c, out = (x0, x0 - eps) if side == "w" else (x1, x1 + eps)
                segs = [(z0, z1)]
                for a0, a1, b0, b1 in others:
                    if a0 < out < a1:
                        segs = _subtract(segs, b0, b1)
            for p, q in segs:
                if q - p < 0.05:
                    continue
                along_x = side in ("n", "s")
                g = []
                for gx, gz, w, h in gaps:
                    m, n = (gx, gz) if along_x else (gz, gx)
                    if abs(n - c) < 0.3 and p - 0.01 <= m <= q + 0.01:
                        a, b = max(p, m - w / 2), min(q, m + w / 2)
                        g.append(((a + b) / 2, b - a, h))
                pos = c if side in ("n", "w") else c - t
                walls += (wall_x if along_x else wall_z)(pos, p, q, y0, y1, g, t)
    return walls


def room_ceiling(rects, y, thick=0.15):
    return [box(x0, y - thick, z0, x1, y, z1) for x0, x1, z0, z1 in rects]
