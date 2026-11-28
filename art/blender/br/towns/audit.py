"""
Audit of the rebuilt towns' houses (owner, 2026-11-27: "make sure no gaps in the new built
buildings and items standing in the air"), on the geometry Blender exports (near + shell: what
LOD0 draws):

  gaps      from points over every storey's floor inside every room, rays in 136 directions
            (level, 30° and 60° up and down, straight up and down). A ray goes through the back
            of a face (single-sided: the game culls it) and stops at the front of one. One that
            gets out of the house must have left its room by a door or a hole in that wall (a
            window's glass stops it), a stair well or into the next room; anywhere else it went
            through a gap (a seam between parts, a missing piece of wall, ceiling or floor).
  floating  every drawn part (box, slab, cylinder, beam, roof plane) touches the ground or a
            part that does, through parts within 2 cm of each other (their bounds).

    /path/to/python-with-bpy art/blender/br/towns/audit.py [id …] [--why] [--ray=x,y,z,dx,dy,dz]

Run from the repository root. Prints one line per house and the gaps and floating parts found.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402

import blend  # noqa: E402
from designs import DESIGNS  # noqa: E402
from townkit import SLAB, Building  # noqa: E402


def directions():
    out = []
    for elev, n in ((0, 48), (30, 24), (60, 12), (-30, 24), (-60, 12)):
        e = math.radians(elev)
        for i in range(n):
            a = 2 * math.pi * (i + 0.5 * (elev != 0)) / n
            out.append(Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e))))
    out += [Vector((0, 0, 1)), Vector((0, 0, -1))]
    return out


DIRS = directions()
WHY = "--why" in sys.argv
OWNER = {}


def track():
    """Which part each face of blend.Mesh came from (for --why)."""
    add, face = blend.Mesh.add, blend.Mesh.face

    def add2(self, P):
        self._part = P
        add(self, P)

    def face2(self, pts, key, tint):
        n = len(self.bm.faces)
        face(self, pts, key, tint)
        if len(self.bm.faces) > n:
            OWNER.setdefault(self.name, []).append(self._part)

    blend.Mesh.add, blend.Mesh.face = add2, face2


track()


PARTS = []


def tree(objs):
    verts, polys = [], []
    PARTS.clear()
    for ob in objs:
        me = ob.data
        base = len(verts)
        verts += [ob.matrix_world @ v.co for v in me.vertices]
        for p in me.polygons:
            polys.append([base + i for i in p.vertices])
        PARTS.extend(OWNER.get(ob.name, [None] * len(me.polygons)))
    return BVHTree.FromPolygons(verts, polys, epsilon=0.0)


LAST = [None]


def cast(bvh, o, d, far=120.0):
    """Distance to the first front face along d from o (None: it gets out)."""
    start, gone = Vector(o), 0.0
    for _ in range(40):
        loc, n, i, dist = bvh.ray_cast(start, d, far - gone)
        if loc is None:
            return None
        gone += dist
        if n.dot(d) < 0:
            LAST[0] = i
            return gone
        start = loc + d * 1e-3
        gone += 1e-3
    return gone


def inside(solids, x, y, z, pad):
    return any(b[0] - pad < x < b[3] + pad and b[1] - pad < y < b[4] + pad and b[2] - pad < z < b[5] + pad
               for b in solids)


def exit_of(v, o, d, y0, y1):
    """Where a ray from o (game) along d (game) leaves the storey's box: (face, point)."""
    best = None
    for k, lo, hi in ((0, v.x0, v.x1), (1, y0, y1), (2, v.z0, v.z1)):
        if abs(d[k]) < 1e-9:
            continue
        t = ((hi if d[k] > 0 else lo) - o[k]) / d[k]
        if best is None or t < best[0]:
            best = (t, k, d[k] > 0)
    t, k, up = best
    pt = tuple(o[i] + d[i] * t for i in range(3))
    face = {(0, False): "left", (0, True): "right", (2, False): "back", (2, True): "front",
            (1, True): "top", (1, False): "bottom"}[(k, up)]
    return face, pt


def allowed(B, v, L, face, pt):
    """A way out of the room the house has: a door or a hole in that side, a stair well, or
    another room past it (its own rays find its gaps)."""
    x, y, z = pt
    for w in B.vols:
        if w is not v and not w.open and w.x0 - 0.02 <= x <= w.x1 + 0.02 \
                and w.z0 - 0.02 <= z <= w.z1 + 0.02 and y < w.top + 0.05:
            return True
    if face in ("top", "bottom"):
        for st in B.stairs:
            q = B.well(st)
            if q[0] - 0.03 <= x <= q[2] + 0.03 and q[1] - 0.03 <= z <= q[3] + 0.03:
                return True
        return False
    return in_hole(B, v, L, face, pt)


def in_hole(B, v, L, face, pt):
    x, y, z = pt
    a = x if face in ("front", "back") else z
    _, party = B.side_state(v, face, L)
    for h in B.wall_holes(v, face, L, party):
        if h[0] - 0.03 <= a <= h[1] + 0.03 and h[2] - 0.03 <= y <= h[3] + 0.03:
            return True
    return False


def gaps(B, bvh):
    found = []
    for v in B.vols:
        if v.open:
            continue
        for L in range(v.floors):
            ys = [B.Y(L) + 0.5071, B.Y(L + 1) - SLAB - 0.3071]
            nx = max(1, int((v.x1 - v.x0 - 0.8) // 1.1) + 1)
            nz = max(1, int((v.z1 - v.z0 - 0.8) // 1.1) + 1)
            for i in range(nx):
                for j in range(nz):
                    # (Off the grid the parts are on by a few millimetres: a ray exactly along a
                    # seam between two parts' faces grazes both and is no gap.)
                    x = v.x0 + 0.4 + (v.x1 - v.x0 - 0.8) * (i + 0.5) / nx + 0.0123
                    z = v.z0 + 0.4 + (v.z1 - v.z0 - 0.8) * (j + 0.5) / nz + 0.0217
                    for y in ys:
                        if inside(B.k.solids, x, y, z, 0.12):
                            continue
                        o = Vector(blend.g2b((x, y, z)))
                        for d in DIRS:
                            if cast(bvh, o, d) is not None:
                                continue
                            dg = (d.x, d.z, -d.y)
                            face, pt = exit_of(v, (x, y, z), dg, B.Y(L), B.Y(L + 1) - SLAB)
                            if allowed(B, v, L, face, pt):
                                continue
                            # Out of the top at a wall: through a door or a hole that runs up past
                            # the storey's ceiling (a boat or loading door)?
                            if face == "top":
                                side, sp = exit_of(v, (x, y, z), dg, -1e9, 1e9)
                                if in_hole(B, v, L, side, sp):
                                    continue
                            why = f"from {x:.1f},{y:.1f},{z:.1f} dir {tuple(round(c, 2) for c in dg)}" if WHY else ""
                            found.append((f"gap ({face})", tuple(round(c, 2) for c in pt), why))
    return found


def desc(P):
    if P is None:
        return "?"
    return f"{P['t']} {P['m']} {[round(v, 2) for v in bounds(P)]}"


def outside(B, bvh):
    """From all round the house, rays at it from 2 m off its walls to its roof's height. Where
    one is inside the house before it meets anything (or before it gets through), it went in by
    a door or a hole in the wall below the walls' tops; under a roof or through solid wall it
    went through a gap (seen from outside: into the house, or the sky through it)."""
    closed = [v for v in B.vols if not v.open]
    opened = [v for v in B.vols if v.open]
    x0 = min(v.x0 for v in B.vols) - 2.0
    x1 = max(v.x1 for v in B.vols) + 2.0
    z0 = min(v.z0 for v in B.vols) - 2.0
    z1 = max(v.z1 for v in B.vols) + 2.0
    top = max(P["b"][4] if P["t"] == "box" else 0 for P in B.k.parts) + 1.0
    cache = {}

    def roof_at(v, x, z):
        """The house's top over (x, z): its roof planes, else its walls' top."""
        # (A flat roof is its top: what is over it, a taller part's eaves, is not its roof.)
        if v.roof.get("type", "flat") in ("flat", "mansard"):
            return v.top
        k = (v.name, round(x, 3), round(z, 3))
        if k not in cache:
            # The lowest roof plane over its walls' top there (a taller part's eaves above it
            # are not its roof).
            h = None
            start = Vector(blend.g2b((x, top + 5, z)))
            d = Vector((0, 0, -1))
            for _ in range(30):
                loc, n, i, dist = bvh.ray_cast(start, d, 200)
                if loc is None or loc.z < v.top - 0.05:
                    break
                P = PARTS[i]
                if P is not None and P["t"] == "poly":
                    h = loc.z
                start = loc + d * 1e-3
            cache[k] = h if h is not None else v.top
        return cache[k]

    def vol_at(vs, x, z, e=0.0):
        return next((v for v in vs if v.x0 - e < x < v.x1 + e and v.z0 - e < z < v.z1 + e), None)

    def real(o, d, t):
        """Not a ray slipping along the very edge or corner two parts share (their touching
        faces are not drawn, so it gets inside the wall): rays 8 mm beside it, either way across
        and up and down, get as far too (through a gap of 2 cm or more they do)."""
        p = d.cross(Vector((0, 0, 1))).normalized()
        for off in (p * 0.008, -p * 0.008, Vector((0, 0, 0.008)), Vector((0, 0, -0.008))):
            h = cast(bvh, o + off, d)
            if h is not None and h <= t + 0.01:
                return False
        return True

    found = []
    targets = [((v.x0 + v.x1) / 2 + 0.0131, (v.z0 + v.z1) / 2 + 0.0173) for v in closed]
    for ang in range(48):
        a = 2 * math.pi * (ang + 0.37) / 48
        r = max(x1 - x0, z1 - z0)
        for tx, tz in targets:
            ox, oz = tx + math.cos(a) * r, tz + math.sin(a) * r
            for yi in range(int(top / 0.6) + 1):
                y = 0.3071 + yi * 0.6
                dg = (tx - ox, 0.0, tz - oz)
                ln = math.hypot(dg[0], dg[2])
                dg = (dg[0] / ln, 0.0, dg[2] / ln)
                o = Vector(blend.g2b((ox, y, oz)))
                d = Vector(blend.g2b(dg)).normalized()
                # Up to what it meets first (or through, if it meets nothing): inside the house
                # on the way, it got in through a door or a hole, or through a gap.
                hit = cast(bvh, o, d)
                end = 2 * r if hit is None else hit - 0.02
                t, inside_v = 0.0, None
                while t < end:
                    t += 0.05
                    x, z = ox + dg[0] * t, oz + dg[2] * t
                    v = vol_at(closed, x, z)
                    if v is None or vol_at(opened, x, z, -0.01):
                        inside_v = None
                        continue
                    # (10 cm under it, not a ray grazing the roof's own slope.)
                    if y >= roof_at(v, x, z) - 0.1:
                        continue
                    pt = (x, y, z)
                    if y >= v.top - 0.05:
                        if real(o, d, t):
                            found.append(("gap (under the roof)", pt, f"ray from {ox:.1f},{y:.1f},{oz:.1f}"))
                            break
                        continue
                    # (Its walls once each way per volume crossed.)
                    if v is inside_v:
                        continue
                    inside_v = v
                    L = max(0, min(v.floors - 1, int((y - B.base) // B.fh)))
                    face, ept = exit_of(v, pt, (-dg[0], 0.0, -dg[2]), -1e9, 1e9)
                    if vol_at([w for w in closed if w is not v], ept[0], ept[2], 0.02):
                        continue
                    if not in_hole(B, v, L, face, ept) and real(o, d, t):
                        found.append((f"gap ({face} wall, from outside)", tuple(round(c, 2) for c in ept),
                                      f"ray from {ox:.1f},{y:.1f},{oz:.1f}"))
                        break
                    face, xpt = exit_of(v, pt, dg, -1e9, 1e9)
                    if vol_at([w for w in closed if w is not v], xpt[0], xpt[2], 0.02):
                        continue
                    if not in_hole(B, v, L, face, xpt) and hit is None and real(o, d, t):
                        found.append((f"gap ({face} wall, from outside)", tuple(round(c, 2) for c in xpt),
                                      f"ray from {ox:.1f},{y:.1f},{oz:.1f}"))
                        break
    return found


def bounds(P):
    if P["t"] == "box":
        b = P["b"]
        return (b[0], b[1], b[2], b[3], b[4], b[5])
    if P["t"] == "poly":
        xs, ys, zs = zip(*P["p"])
        return (min(xs), min(ys), min(zs), max(xs), max(ys), max(zs))
    if P["t"] == "cyl":
        (cx, cz), r = P["c"], P["r"]
        return (cx - r, P["y"][0], cz - r, cx + r, P["y"][1], cz + r)
    a, b, w, h = P["a"], P["b"], P["w"], P["h"]
    m = max(w, h) / 2
    return (min(a[0], b[0]) - m, min(a[1], b[1]) - h / 2, min(a[2], b[2]) - m,
            max(a[0], b[0]) + m, max(a[1], b[1]) + h / 2, max(a[2], b[2]) + m)


def floating(B):
    parts = [P for P in B.k.parts if P["lod"] in ("near", "shell")]
    bb = [bounds(P) for P in parts]
    e = 0.02
    grounded = [b[1] <= e for b in bb]
    # Union by touching bounds (cells of 2 m to keep it quick).
    cells = {}
    for i, b in enumerate(bb):
        for cx in range(int(math.floor(b[0] / 2)), int(math.floor(b[3] / 2)) + 1):
            for cz in range(int(math.floor(b[2] / 2)), int(math.floor(b[5] / 2)) + 1):
                cells.setdefault((cx, cz), []).append(i)
    reach = [i for i, g in enumerate(grounded) if g]
    seen = set(reach)
    while reach:
        i = reach.pop()
        a = bb[i]
        near = set()
        for cx in range(int(math.floor((a[0] - e) / 2)), int(math.floor((a[3] + e) / 2)) + 1):
            for cz in range(int(math.floor((a[2] - e) / 2)), int(math.floor((a[5] + e) / 2)) + 1):
                near.update(cells.get((cx, cz), ()))
        for j in near:
            if j in seen:
                continue
            b = bb[j]
            if (a[0] - e <= b[3] and b[0] - e <= a[3] and a[1] - e <= b[4] and b[1] - e <= a[4]
                    and a[2] - e <= b[5] and b[2] - e <= a[5]):
                seen.add(j)
                reach.append(j)
    return [(parts[i]["t"], parts[i]["m"], [round(v, 2) for v in bb[i]]) for i in range(len(parts)) if i not in seen]


def trace(bvh, o, d):
    """Every face along a ray (--ray=x,y,z,dx,dy,dz, game coordinates)."""
    start = Vector(o)
    for _ in range(30):
        loc, n, i, dist = bvh.ray_cast(start, d, 60)
        if loc is None:
            print("      → out")
            return
        g = (round(loc.x, 3), round(loc.z, 3), round(-loc.y, 3))
        print(f"      {'front' if n.dot(d) < 0 else 'back '} at {g}: {desc(PARTS[i])}")
        start = loc + d * 1e-3


def main():
    ids = [a for a in sys.argv[1:] if not a.startswith("--")] or list(DESIGNS)
    ray = next((a[6:] for a in sys.argv if a.startswith("--ray=")), None)
    coll = bpy.data.collections.new("audit")
    bpy.context.scene.collection.children.link(coll)
    bad = 0
    for did in ids:
        spec = DESIGNS[did]()
        spec["id"] = did
        B = Building(spec).build()
        # (--drop=i: the audit's own test, part i left out: it must find that gap.)
        drop = next((int(a[7:]) for a in sys.argv if a.startswith("--drop=")), None)
        if drop is not None:
            print("      dropped", desc(B.k.parts[drop]))
            del B.k.parts[drop]
        objs = [o for o in blend.make(B, did, coll) if o.name.split(".")[-1] in ("near", "shell")]
        bvh = tree(objs)
        if ray:
            x, y, z, dx, dy, dz = map(float, ray.split(","))
            d = Vector(blend.g2b((dx, dy, dz))).normalized()
            trace(bvh, Vector(blend.g2b((x, y, z))), d)
            continue
        g = gaps(B, bvh) + outside(B, bvh)
        f = floating(B)
        # One line per slit place (rounded to 10 cm), not per ray.
        first = {}
        for k, at, why in g:
            first.setdefault((k, tuple(round(c, 1) for c in at)), why)
        places = sorted(first)
        print(f"{'ok  ' if not places and not f else 'BAD '} {did:24} gaps {len(places):3}  floating {len(f):3}")
        for k, at in places[:12]:
            print(f"      {k} at {at} {first[(k, at)]}")
        for t, m, b in f[:12]:
            print(f"      floating {t} {m} {b}")
        bad += bool(places or f)
        for o in objs:
            bpy.data.objects.remove(o, do_unlink=True)
    print(f"{len(ids) - bad} of {len(ids)} without gaps or floating parts")


main()
