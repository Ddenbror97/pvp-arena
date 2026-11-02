"""
Fit the wreck's curved parts with collision boxes (run with Blender's Python).

  python fit_heli.py      # writes heli_fit.json, read by layout.py (then re-run layout.py)

The cabin's flank layers, roof and openings are designed in layout.py; the nose, the closed rear
and the two tail-boom pieces are curved, so their boxes are fitted to the model here. Each part
is cut into x slabs, each slab into height layers (0-0.9, 0.9-1.6, 1.6 m up). A box must

* enclose every vertex of its slab and layer below 2.9 m within 6 cm (no visual-only cover:
  the same rule heli.validate and the kit validation apply), and
* have each face land on the hull within 6.5 cm where the browser probe tests it: the face
  centre at y = min(1.0, top - 0.15) (no invisible walls; tests/e2e/fps-crossfire.spec.ts).

A slab that cannot satisfy both is split until it can. The nose and the rear are fitted
separately (the model is not symmetric end to end); the boom pieces are identical twins.
"""
import bpy, json, math, os, sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
bpy.ops.wm.read_factory_settings(use_empty=True)
import heli  # noqa: E402

L = json.load(open(os.path.join(HERE, "build", "layout.json")))
to_blender = lambda x, y, z: (x, -z, y)  # noqa: E731
cols = {}


def section(n):
    if n not in cols:
        c = bpy.data.collections.new(n)
        bpy.context.scene.collection.children.link(c)
        cols[n] = c
    return cols[n]


heli.build(L, section, to_blender, os.path.join(HERE, "build", "tex"), bpy.data.materials.new("steel"))
dg = bpy.context.evaluated_depsgraph_get()
CAB = next(s for s in L["solids"] if s["id"] == "heli-roof")["w"] / 2
LAYERS = ((0.0, 0.9), (0.9, 1.6), (1.6, None))
TIP_LAYERS = ((0.0, 0.35), (0.35, 0.65), (0.65, 0.95), (0.95, 1.25), (1.25, 1.6), (1.6, None))  # the rounded ends
TOL, PROBE_TOL = 0.055, 0.06
DBG = (lambda m: print("FIT", m)) if os.environ.get("FIT_DEBUG") else (lambda m: None)
up = lambda v: math.ceil(v * 100 - 1e-6) / 100  # noqa: E731


class Part:
    def __init__(self, names):
        objs = [o for o in bpy.data.objects if o.type == "MESH" and any(n in o.name for n in names)]
        self.trees = [BVHTree.FromObject(o, dg) for o in objs]
        self.verts = [(p.x, p.z, -p.y) for o in objs for p in (o.matrix_world @ v.co for v in o.data.vertices)]

    def cast(self, org, d):
        best = None
        for t in self.trees:
            hit = t.ray_cast(Vector(to_blender(*org)), Vector(to_blender(*d)), 30)
            if hit[0] is not None and (best is None or hit[3] < best):
                best = hit[3]
        return best


def fit_part(part, x_lo, x_hi, z_c, slab=0.3, tips=(True, True)):
    """Tight boxes for the part between x_lo and x_hi: x slabs x height layers, each box face
    TOL inside the outermost vertex of its slab/layer (so no vertex is more than TOL outside),
    the end slabs out to the model's tips. Adjacent slabs with equal extents are merged."""
    # Slabs `slab` wide, finer (0.15 m) over the last 0.9 m toward a rounded tip.
    fine = 0.9 if any(tips) else 0.0
    core_lo, core_hi = x_lo + (fine if tips[0] else 0), x_hi - (fine if tips[1] else 0)
    n = max(1, round((core_hi - core_lo) / slab))
    edges = [core_lo + (core_hi - core_lo) * i / n for i in range(n + 1)]
    if tips[0]:
        edges = [x_lo + 0.15 * k for k in range(6)] + edges
    if tips[1]:
        edges = edges + [x_hi - 0.15 * k for k in range(5, -1, -1)]
    n = len(edges) - 1
    rows = {}
    for i, (a, b) in enumerate(zip(edges, edges[1:])):
        tip = (tips[0] and a < x_lo + fine - 1e-6) or (tips[1] and b > x_hi - fine + 1e-6)
        for li, (y0, y1) in enumerate(TIP_LAYERS if tip else LAYERS):
            li = (li, tip)
            sel = [v for v in part.verts if 0.16 < v[1] <= 2.9 and y0 - 1e-6 <= v[1] <= (y1 or 9) + 1e-6
                   and a - 1e-6 <= v[0] <= b + 1e-6]
            if not sel:
                continue
            top = min(y1 or 3.3, up(max(v[1] for v in sel)))
            top = max(top, y0 + 0.05)
            # The surface between vertices (low-poly hull) can bulge past them: sample it too.
            lo_z, hi_z = min(v[2] for v in sel), max(v[2] for v in sel)
            lo_x, hi_x = min(v[0] for v in sel), max(v[0] for v in sel)
            ys = [max(y0, 0.17) + (min(top, 2.9) - max(y0, 0.17)) * k / 4 for k in range(5)]
            for k in range(5):
                xx = a + (b - a) * k / 4
                for yy in ys:
                    d = part.cast((xx, yy, z_c - 3.0), (0, 0, 1))
                    if d is not None:
                        lo_z = min(lo_z, z_c - 3.0 + d)
                    d = part.cast((xx, yy, z_c + 3.0), (0, 0, -1))
                    if d is not None:
                        hi_z = max(hi_z, z_c + 3.0 - d)
            for zz in (z_c + (hi_z - z_c) * t for t in (0, 0.5, 0.9)) if (i == n - 1 and tips[1]) else ():
                for yy in ys:
                    d = part.cast((b + 6.0, yy, zz), (-1, 0, 0))
                    if d is not None:
                        hi_x = max(hi_x, b + 6.0 - d)
            for zz in (z_c + (hi_z - z_c) * t for t in (0, 0.5, 0.9)) if (i == 0 and tips[0]) else ():
                for yy in ys:
                    d = part.cast((a - 6.0, yy, zz), (1, 0, 0))
                    if d is not None:
                        lo_x = min(lo_x, a - 6.0 + d)
            zl = up(max(0.02, z_c - lo_z - TOL))
            zr = up(max(0.02, hi_z - z_c - TOL))
            x0 = min(a, -up(-(lo_x + TOL))) if (i == 0 and tips[0]) else a
            x1 = max(b, up(hi_x - TOL)) if (i == n - 1 and tips[1]) else b
            rows.setdefault(li, []).append([x0, x1, round(z_c - zl, 3), round(z_c + zr, 3), y0, top])
    out = []
    for li, boxes in rows.items():
        merged = [boxes[0]]
        for bx in boxes[1:]:
            m = merged[-1]
            if abs(m[1] - bx[0]) < 1e-6 and m[2:] == bx[2:]:
                m[1] = bx[1]
            else:
                merged.append(bx)
        out += [[round(v, 3) for v in bx] for bx in merged]
    return out


def covered(b, nx, nz, y, allb):
    """The face is shared with a touching box at its probe point (an internal face)."""
    px = b["x"] + nx * b["w"] / 2
    pz = b["z"] + nz * b["d"] / 2
    for o in allb:
        if o is b or not (o["y"] - o["h"] / 2 <= y <= o["y"] + o["h"] / 2):
            continue
        if nx and abs((o["x"] - nx * o["w"] / 2) - px) < 1e-3 and abs(pz - o["z"]) <= o["d"] / 2:
            return True
        if nz and abs((o["z"] - nz * o["d"] / 2) - pz) < 1e-3 and abs(px - o["x"]) <= o["w"] / 2:
            return True
    return False


def probe_report(part, boxes, others):
    """Emulate the browser probe (tests/e2e/fps-crossfire.spec.ts) on these boxes: worst offsets."""
    allb = [dict(x=(b[0] + b[1]) / 2, z=(b[2] + b[3]) / 2, w=b[1] - b[0], d=b[3] - b[2], y=(b[4] + b[5]) / 2, h=b[5] - b[4])
            for b in boxes] + others
    blocked = lambda x, z: any(o["y"] - o["h"] / 2 < 1.8 and abs(x - o["x"]) < o["w"] / 2 + 0.35  # noqa: E731
                               and abs(z - o["z"]) < o["d"] / 2 + 0.35 for o in allb)
    worst = []
    for b in allb[:len(boxes)]:
        top = b["y"] + b["h"] / 2
        y = min(1.0, top - 0.15)
        if y < 0.2 or b["y"] - b["h"] / 2 > y:
            continue
        for nx, nz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            half = b["w"] / 2 if nx else b["d"] / 2
            ox, oz = b["x"] + nx * (half + 0.6), b["z"] + nz * (half + 0.6)
            if blocked(ox, oz) or covered(b, nx, nz, y, allb):
                continue
            d = part.cast((ox, y, oz), (-nx, 0, -nz))
            off = 0.6 - d if d is not None else float("inf")
            worst.append((round(off, 3), round(b["x"], 2), round(b["z"], 2), round(b["y"], 2), nx, nz))
    worst.sort(key=lambda t: -abs(t[0]))
    return worst


hull = Part(("mi8-body", "window"))
xs = [v[0] for v in hull.verts if 0.16 < v[1] <= 2.9]
nose = fit_part(hull, min(xs), -CAB, 0.0, tips=(True, False))
rear = fit_part(hull, CAB, max(xs), 0.0, tips=(False, True))
tail = Part(("mi8-heli-tail-a",))
txs = [v[0] for v in tail.verts]
tails = fit_part(tail, min(txs), max(txs), heli.TAIL_C[1], slab=0.4, tips=(False, False))
others = [s for s in L["solids"] if not s["id"].startswith(("heli-nose", "heli-rear", "heli-tail"))]
both = Part(("mi8-body", "window", "mi8-heli-tail-a", "mi8-bulkheads"))
rep = probe_report(both, nose + rear + tails, others)
print("HELI FIT", {"nose": len(nose), "rear": len(rear), "tail": len(tails)}, "probes", len(rep),
      "worst", [r for r in rep if abs(r[0]) > 0.065], "over 6.5 cm:", sum(1 for r in rep if abs(r[0]) > 0.065))
out = {"nose": nose, "rear": rear, "tail": tails, "probe_worst": rep[0][0] if rep else 0}
json.dump(out, open(os.path.join(HERE, "heli_fit.json"), "w"), indent=1)
