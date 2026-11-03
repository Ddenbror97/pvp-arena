"""
Build the SANDGATE (map 06) render scene in Blender from build/layout.json (layout.py), the
textures (textures.py → build/tex) and the asset library (assets.py → build/library.blend).

  /root/bpyenv/bin/python art/blender/map06/build_sandgate.py -- <out.glb> [--blend out.blend]

Rules (docs/fps-bomb/DESIGN.md, "Environment"):
- Every gameplay solid is dressed INSIDE its collision box: what stops movement and bullets is
  what you see. Building blocks (8 m) get facades whose wall plane sits 4 cm inside the box;
  plinths, string courses, cornices, window surrounds are flush with the box; sills stick out at
  most 3 cm; windows, doors, niches are recessed into the block. Nothing below 7.8 m overhangs
  walkable floor. Cover (crates, HESCO, vehicles, containers, sandbags, gates...) is fitted to its
  box. Above the 8 m blocks the architecture is free (storeys, parapets, tiled roofs): the highest
  player eye is ~3.7 m (jumping on a 1.2 m platform), far below any of it.
- Covered passages (Police passages, B hall, lower passage) get a ceiling ≥ 3.6 m: above every
  player, below the 8 m roofs; the volume between ceiling and roof is closed.
- Repeated props are linked duplicates (GPU instances after instance_sections.mjs). Everything
  else is merged per material inside its area collection (one culling section per area).
"""
import bpy, json, math, os, random, sys, hashlib, gc
gc.disable()  # bpy struct wrappers + cyclic GC have crashed this script (segfault); allocations are bounded

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from kit import B, Mesh, Layout, material, quad, box, atlas_uv, atlas_sub, cylinder, tube, TILE, lin  # noqa: E402
from mathutils import Vector, Matrix  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["build/sandgate.glb"]
OUT = argv[0]
BLEND = argv[argv.index("--blend") + 1] if "--blend" in argv else None
L = json.load(open(os.path.join(HERE, "build", "layout.json")))
SOLIDS, OPEN, SITES = L["solids"], L["open"], L["bombsites"]
W, D = L["arena"]["width"], L["arena"]["depth"]
HW, HD = W / 2, D / 2

bpy.ops.wm.read_factory_settings(use_empty=True)
LAY = Layout("Sandgate")


def H(*parts):
    """Deterministic 0..1 hash of anything printable."""
    return int(hashlib.md5("|".join(map(str, parts)).encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


def pick(seq, *key):
    return seq[int(H(*key) * len(seq)) % len(seq)]


def wpick(weights, *key):
    t = H(*key) * sum(weights.values())
    for k, w in weights.items():
        t -= w
        if t <= 0:
            return k
    return k


# =============================================================================== materials
M = {
    "plaster": material("plaster", "plaster", 2.6),
    "sandstone": material("sandstone", "sandstone", 2.4),
    "adobe": material("adobe", "adobe", 3.0),
    "brick": material("brickplaster", "brickplaster", 1.7),
    "concrete": material("concrete", "concrete", 3.0),
    "pavement": material("pavement", "pavement", 2.4),
    "flagstone": material("flagstone", "flagstone", 2.6),
    "asphalt": material("asphalt", "asphalt", 4.0),
    "yard": material("yard", "yard", 3.0),
    "dirt": material("dirt", "dirt", 3.0),
    "rooftile": material("rooftile", "rooftile", 1.5),
    "wood": material("wood", "wood", 1.2),
    "metal": material("metal", "metal", 1.2),
    "trim": material("trim", "trim", 1.0),
    "decal": material("decal", "decals", 1.0, blend=True, orm=False, normal=False, roughness=0.9),
}
# Trim atlas cells (textures.py TRIM) and decal cells (textures.py DECALS).
T = {k: i for i, k in enumerate(["window", "shutter", "door", "plankdoor", "roller", "grille", "vent", "acfront",
                                 "panel", "cabinet", "sign", "beam", "dark", "tiles", "hazard", "soil"])}
DC = {k: i for i, k in enumerate(["letterA", "letterB", "arrow", "line", "hazardline", "oil", "sandedge", "cracks",
                                  "tyres", "drain", "manhole", "streaks", "damp", "sandpatch", "pebbles", "stain"])}

# Palette (vertex-colour multipliers on the graded textures).
TINT = {
    "plaster": [(1, 1, 1), (1, 0.965, 0.9), (0.98, 0.9, 0.76), (1, 0.88, 0.74), (0.94, 0.89, 0.81), (1, 0.93, 0.84), (0.97, 0.84, 0.72)],
    "adobe": [(1, 1, 1), (0.96, 0.93, 0.88), (1, 0.95, 0.88)],
    "sandstone": [(1, 1, 1), (0.96, 0.94, 0.9), (1, 0.95, 0.88)],
    "brick": [(1, 1, 1), (0.95, 0.9, 0.85)],
    "concrete": [(1, 0.98, 0.94), (0.95, 0.93, 0.88), (1, 0.95, 0.86)],
}
PAINT = [(0.40, 0.60, 0.60), (0.50, 0.55, 0.38), (0.56, 0.40, 0.28), (0.46, 0.57, 0.68), (0.33, 0.44, 0.36), (0.74, 0.63, 0.45),
         (0.62, 0.33, 0.25)]
METAL_PAINT = [(0.74, 0.70, 0.58), (0.62, 0.66, 0.52), (0.82, 0.74, 0.60), (0.70, 0.52, 0.40), (0.60, 0.62, 0.58)]


# =============================================================================== areas
AREA_OF = {"ct-spawn": "Police Spawn", "ct-to-a": "Police Spawn", "ct-to-b": "Police Spawn", "ct-mid": "Police Spawn",
           "a-house": "Police Spawn", "b-house": "Police Spawn", "site-a": "Bombsite A", "a-connector": "Bombsite A",
           "site-b": "Bombsite B", "b-connector": "Bombsite B", "b-heaven-access": "Bombsite B", "mid-plaza": "Central Mid",
           "t-mid-upper": "Central Mid", "t-mid-jog": "Central Mid", "t-mid-lower": "Central Mid", "lower-passage": "Central Mid",
           "t-spawn": "Terrorist Spawn", "t-west-exit": "Terrorist Spawn", "t-west-road": "A Long", "a-long": "A Long",
           "t-east-road": "B Main", "b-main-top": "B Main", "b-main-bend1": "B Main", "b-main-mid": "B Main",
           "b-main-bend2": "B Main", "b-hall": "B Main"}
# Open rectangles in priority order for "which area is this point in" (specific before broad).
PRIORITY = ["b-hall", "lower-passage", "a-house", "b-house", "a-connector", "b-connector", "site-a", "site-b",
            "b-heaven-access", "ct-mid", "ct-spawn", "ct-to-a", "ct-to-b", "mid-plaza", "t-mid-upper", "t-mid-jog",
            "t-mid-lower", "t-west-exit", "t-spawn", "a-long", "t-west-road", "t-east-road", "b-main-top", "b-main-bend1",
            "b-main-mid", "b-main-bend2"]
OPEN_BY = {o[0]: o for o in OPEN}


def open_rect_at(x, z, margin=0.0):
    for name in PRIORITY:
        _, x0, x1, z0, z1 = OPEN_BY[name]
        if x0 - margin <= x <= x1 + margin and z0 - margin <= z <= z1 + margin:
            return name
    best, bd = None, 1e9
    for name, x0, x1, z0, z1 in OPEN:
        d = math.hypot(max(x0 - x, 0, x - x1), max(z0 - z, 0, z - z1))
        if d < bd:
            best, bd = name, d
    return best


def area_at(x, z):
    if abs(x) > HW + 0.5 or abs(z) > HD + 0.5:
        return exterior_area(x, z)
    return AREA_OF[open_rect_at(x, z)]


def exterior_area(x, z):
    if abs(z) >= abs(x):
        return "Exterior Architecture N" if z < 0 else "Exterior Architecture S"
    return "Exterior Architecture W" if x < 0 else "Exterior Architecture E"


# Buckets: (area, category) → Mesh, turned into objects at the end.
BUCKETS = {}


def bucket(area, category="Buildings"):
    key = (area, category)
    if key not in BUCKETS:
        BUCKETS[key] = Mesh()
    return BUCKETS[key]


# =============================================================================== grid
G = 0.5
NG = int(W / G)
BUILD = [s for s in SOLIDS if s["kind"] == "building"]


def gi(v):
    return int(math.floor((v + HW) / G + 1e-6))


OWNER = {}
for s in BUILD:
    for i in range(gi(s["x"] - s["w"] / 2), gi(s["x"] + s["w"] / 2)):
        for j in range(gi(s["z"] - s["d"] / 2), gi(s["z"] + s["d"] / 2)):
            OWNER[(i, j)] = s["id"]


def cell_owner(i, j):
    if i < 0 or j < 0 or i >= NG or j >= NG:
        if j < 0:
            return "outside-n"
        if j >= NG:
            return "outside-s"
        return "outside-w" if i < 0 else "outside-e"
    return OWNER.get((i, j))


def cx(i):
    return -HW + i * G


# Covered passages: (name, x0, x1, z0, z1, ceiling height). Ceilings stay above every player
# (≥ 3.6 m: max eye height on a 1.2 m platform is ~2.9 m) and below the 8 m roofs.
COVERS = [("a-house", -20, 2, -29, -26, 4.0), ("b-house", 8, 20, -23, -20, 4.0),
          ("b-hall", 31, 37, -16, -6, 5.6), ("lower-passage", 10, 22, 11, 14, 3.7)]
OFFICE = (20, 25, -26, -18)


def cover_at(x, z):
    for c in COVERS:
        if c[1] <= x <= c[2] and c[3] <= z <= c[4]:
            return c
    return None


# =============================================================================== facade runs
# Boundary edges between open cells and building / outside cells, grouped into straight runs per
# owner. n = outward normal (from the solid into the open cell).
DIRS = {"+x": (1, 0), "-x": (-1, 0), "+z": (0, 1), "-z": (0, -1)}
edges = {}
for i in range(NG):
    for j in range(NG):
        if cell_owner(i, j) is not None:
            continue
        for key, (di, dj) in DIRS.items():
            o = cell_owner(i + di, j + dj)
            if o is None:
                continue
            # The solid is at (i+di, j+dj); its outward normal points back toward the open cell.
            n = {"+x": "-x", "-x": "+x", "+z": "-z", "-z": "+z"}[key]
            if di:
                line = cx(i + 1) if di > 0 else cx(i)
                edges.setdefault((n, line, o), []).append(cx(j))
            else:
                line = cx(j + 1) if dj > 0 else cx(j)
                edges.setdefault((n, line, o), []).append(cx(i))

RUNS = []
for (n, line, owner), starts in edges.items():
    starts.sort()
    a = starts[0]
    prev = a
    for s in starts[1:] + [None]:
        if s is not None and abs(s - prev - G) < 1e-6:
            prev = s
            continue
        RUNS.append({"n": n, "line": line, "owner": owner, "a": a, "b": prev + G})
        if s is not None:
            a = prev = s


def is_solid_pt(x, z):
    return cell_owner(gi(x), gi(z)) is not None


def corner_kind(run, at_end):
    """'convex' (the solid ends: outer corner), 'concave' (inner corner), 'flat' (another
    building continues the facade)."""
    n = DIRS[run["n"]]
    eps = G / 2
    t = run["b"] + eps if at_end else run["a"] - eps
    if n[0]:
        solid_pt = (run["line"] - n[0] * eps, t)
        open_pt = (run["line"] + n[0] * eps, t)
    else:
        solid_pt = (t, run["line"] - n[1] * eps)
        open_pt = (t, run["line"] + n[1] * eps)
    s, o = is_solid_pt(*solid_pt), is_solid_pt(*open_pt)
    if not s:
        return "convex"
    return "concave" if o else "flat"


def depth_behind(run, a, b, cap=6.0):
    """How far the solid region extends behind the facade span [a, b] (m), and whether it ends at
    open floor (then a mass from each side may only take half)."""
    n = DIRS[run["n"]]
    d = 0.0
    while d < 12:
        d2 = d + G
        ok = True
        for t in [a + G / 2 + k * G for k in range(int(round((b - a) / G)))]:
            if n[0]:
                p = (run["line"] - n[0] * (d2 - G / 2), t)
            else:
                p = (t, run["line"] - n[1] * (d2 - G / 2))
            if abs(p[0]) > HW or abs(p[1]) > HD:
                if run["owner"].startswith("outside"):
                    continue
                return min(cap, d), False
            if not is_solid_pt(*p):
                ok = False
                break
        if not ok:
            return min(cap, d / 2), True
        d = d2
    return cap, False


class Frame:
    """Facade-local frame: u along the wall (to the right seen from outside), y up, w along the
    outward normal (0 = collision boundary, negative = inside the block)."""

    def __init__(self, n, line, u_origin):
        self.n = n
        self.nv = DIRS[n]
        # r = (-n) × up: n=+z → r=+x; n=-z → r=-x; n=+x → r=-z; n=-x → r=+z
        self.rv = {"+z": (1, 0), "-z": (-1, 0), "+x": (0, -1), "-x": (0, 1)}[n]
        self.line = line
        self.u0 = u_origin  # world coordinate along the wall where u = 0

    def P(self, u, y, w):
        rx, rz = self.rv
        nx, nz = self.nv
        if nx:  # wall at x = line, running along z
            return (self.line + nx * w, y, self.u0 + rz * u)
        return (self.u0 + rx * u, y, self.line + nz * w)

    def face_key(self, local):
        """Local face ('front','back','left','right') → kit.box face key."""
        nx, nz = self.nv
        rx, rz = self.rv
        vec = {"front": (nx, nz), "back": (-nx, -nz), "right": (rx, rz), "left": (-rx, -rz)}[local]
        return {(1, 0): "px", (-1, 0): "nx", (0, 1): "pz", (0, -1): "nz"}[vec]

    def lbox(self, mesh, u0, u1, y0, y1, w0, w1, mat, skip=(), top=None, cols=None, bottom=False, colf=None):
        a, b = self.P(u0, y0, w0), self.P(u1, y1, w1)
        sk = tuple(self.face_key(s) if s in ("front", "back", "left", "right") else s for s in skip)
        box(mesh, min(a[0], b[0]), max(a[0], b[0]), y0, y1, min(a[2], b[2]), max(a[2], b[2]), mat, skip=sk, top=top,
            cols=cols, bottom=bottom, colf=colf)

    def wall(self, mesh, u0, u1, y0, y1, w, mat, uvs=None, cols=None, colf=None):
        """Quad facing +n at offset w."""
        pts = [self.P(u0, y0, w), self.P(u1, y0, w), self.P(u1, y1, w), self.P(u0, y1, w)]
        if colf:
            cols = [colf(u0, y0), colf(u1, y0), colf(u1, y1), colf(u0, y1)]
        quad(mesh, pts, mat, uvs=uvs, cols=cols)

    def flat(self, mesh, u0, u1, y, w_front, w_back, mat, up=True, uvs=None, cols=None):
        pts = [self.P(u0, y, w_front), self.P(u1, y, w_front), self.P(u1, y, w_back), self.P(u0, y, w_back)]
        if not up:
            pts = pts[::-1]
        quad(mesh, pts, mat, uvs=uvs, cols=cols)

    def side(self, mesh, u, y0, y1, w0, w1, mat, facing_right, cols=None):
        """Quad perpendicular to the wall at u, spanning w0..w1 (w0 > w1), facing ±r."""
        if facing_right:
            pts = [self.P(u, y0, w0), self.P(u, y0, w1), self.P(u, y1, w1), self.P(u, y1, w0)]
        else:
            pts = [self.P(u, y0, w1), self.P(u, y0, w0), self.P(u, y1, w0), self.P(u, y1, w1)]
        quad(mesh, pts, mat, cols=cols)


# -------------------------------------------------------------------- facade composition
WI = 0.04  # wall plane inset behind the collision boundary
STYLE_W = {
    "Bombsite A": {"sandstone": 4, "plaster": 4, "brick": 1},
    "Bombsite B": {"industrial": 5, "plaster": 3, "sandstone": 1},
    "Central Mid": {"plaster": 5, "adobe": 3, "sandstone": 2},
    "A Long": {"adobe": 3, "plaster": 4, "sandstone": 2, "industrial": 1},
    "B Main": {"industrial": 4, "adobe": 3, "plaster": 3},
    "Terrorist Spawn": {"adobe": 5, "plaster": 3, "industrial": 2},
    "Police Spawn": {"plaster": 6, "sandstone": 4},
}


def grime(y, top):
    """Vertex-colour weathering: dust and splash at the base, a darker band under the roof edge."""
    g = 1.0 - 0.26 * math.exp(-y / 0.7) - 0.08 * math.exp(-y / 2.5)
    if top is not None and y > top - 1.2:
        g -= 0.07 * min(1.0, (y - (top - 1.2)) / 1.2)
    return g


def mul(c, g):
    return (c[0] * g, c[1] * g, c[2] * g)


def wall_with_holes(fr, mesh, ua, ub, y0, y1, w, mat, holes, tint, top, rows=(0.5, 1.2, 2.4, 4.2)):
    """A wall band (u in [ua, ub], y in [y0, y1]) at offset w, with rectangular holes, emitted as
    row-merged quads; vertex colours carry tint × grime."""
    us = sorted({ua, ub} | {min(max(h[0], ua), ub) for h in holes} | {min(max(h[1], ua), ub) for h in holes})
    ys = sorted({y0, y1} | {min(max(h[2], y0), y1) for h in holes} | {min(max(h[3], y0), y1) for h in holes}
                | {r for r in rows if y0 < r < y1})
    colf = lambda u, y: mul(tint, grime(y, top))
    for yi in range(len(ys) - 1):
        ya, yb = ys[yi], ys[yi + 1]
        if yb - ya < 1e-4:
            continue
        run = None
        for ui in range(len(us) - 1):
            u_a, u_b = us[ui], us[ui + 1]
            if u_b - u_a < 1e-4:
                continue
            cu, cy = (u_a + u_b) / 2, (ya + yb) / 2
            inside = any(h[0] <= cu <= h[1] and h[2] <= cy <= h[3] for h in holes)
            if inside:
                if run:
                    fr.wall(mesh, run[0], run[1], ya, yb, w, mat, colf=colf)
                    run = None
            else:
                run = (run[0], u_b) if run else (u_a, u_b)
        if run:
            fr.wall(mesh, run[0], run[1], ya, yb, w, mat, colf=colf)


def ledge(fr, mesh, ua, ub, y, w_front, w_back, mat, holes, up=True, tint=(1, 1, 1)):
    """Horizontal strip (top/bottom of a flush band) minus the u-ranges of holes crossing y."""
    cuts = sorted((h[0], h[1]) for h in holes if h[2] - 1e-4 <= y <= h[3] + 1e-4)
    u = ua
    c = [mul(tint, 0.92)] * 4
    for a, b in cuts + [(ub, ub)]:
        if a > u + 1e-4:
            fr.flat(mesh, u, min(a, ub), y, w_front, w_back, mat, up=up, cols=c)
        u = max(u, b)


class Piece:
    def __init__(self, run, a, b, idx):
        self.run, self.a, self.b, self.idx = run, a, b, idx
        n = run["n"]
        self.fr = Frame(n, run["line"], 0)
        # u origin: the end of [a, b] from which r points along the wall.
        rx, rz = self.fr.rv
        r_along = rx if DIRS[n][1] else rz  # component of r along the run axis
        self.fr.u0 = a if r_along > 0 else b
        self.L = b - a
        nx, nz = DIRS[n]
        mid = (a + b) / 2
        self.mid = (run["line"] + nx * 1.0, mid) if nx else (mid, run["line"] + nz * 1.0)
        self.wmid = (run["line"], mid) if nx else (mid, run["line"])
        self.area = area_at(*self.mid)
        self.cover = cover_at(*self.mid)
        self.office = OFFICE[0] <= self.mid[0] <= OFFICE[1] and OFFICE[2] <= self.mid[1] <= OFFICE[3]
        self.key = (run["owner"], run["n"], run["line"], idx)
        ext = run["owner"].startswith("outside")
        weights = STYLE_W.get(self.area, {"plaster": 5, "adobe": 3, "sandstone": 2})
        # One identity per building block where it is short; long strips change every piece.
        run_len = run["b"] - run["a"]
        skey = (run["owner"],) if not ext and run_len < 14 else self.key
        self.style = "interior" if self.cover else wpick(weights, "style", *skey)
        base = "concrete" if self.style == "industrial" else ("plaster" if self.style == "interior" else self.style)
        self.wallmat = base
        self.tint = pick(TINT.get(base, [(1, 1, 1)]), "tint", *skey)
        dep, half = depth_behind(run, a, b)
        self.depth = dep
        if self.cover:
            self.H = self.cover[5]
        else:
            r = H("height", *skey)
            self.H = 8.0 if r < 0.42 else (9.2 if r < 0.62 else (10.6 if r < 0.85 else 12.0))
            if dep < 1.4:
                self.H = 8.0
        self.roof = "tiles" if (not self.cover and self.style in ("plaster", "sandstone", "adobe", "brick")
                                and H("roof", *skey) < 0.45 and dep >= 2.5) else "parapet"
        self.shut = pick(PAINT, "paint", *skey)
        # Beyond the playable edge (spawns open onto the arena boundary): a perimeter of concrete
        # barriers stands on the boundary and the buildings are set back behind it.
        self.setback = 2.2 if ext else 0.0
        if ext:
            self.fr0 = Frame(n, run["line"], self.fr.u0)
            nx, nz = DIRS[n]
            self.fr.line = run["line"] - (nx or nz) * self.setback

    @property
    def u_left(self):
        return 0.0

    def __repr__(self):
        return f"Piece({self.key}, L={self.L}, {self.style}, H={self.H})"


PIECES = []
for run in RUNS:
    # Split at covered-passage boundaries, then into building-sized pieces (≤ 12 m).
    cuts = {run["a"], run["b"]}
    for c in COVERS + [("office",) + OFFICE + (4.0,)]:
        lo, hi = (c[3], c[4]) if DIRS[run["n"]][0] else (c[1], c[2])
        plo, phi = (c[1], c[2]) if DIRS[run["n"]][0] else (c[3], c[4])
        if not (plo - 1.0 <= run["line"] <= phi + 1.0):
            continue
        for v in (lo, hi):
            if run["a"] < v < run["b"]:
                cuts.add(v)
    cuts = sorted(cuts)
    for s0, s1 in zip(cuts, cuts[1:]):
        k = max(1, math.ceil((s1 - s0) / 12.0))
        step = round((s1 - s0) / k / G) * G
        edges_ = [s0 + step * q for q in range(k)] + [s1]
        for q, (p0, p1) in enumerate(zip(edges_, edges_[1:])):
            if p1 - p0 > 1e-6:
                PIECES.append(Piece(run, p0, p1, q))
print("FACADES", len(RUNS), "runs", len(PIECES), "pieces")


def opening(fr, mesh, u0, u1, y0, y1, kind, p, wmat, tmat=None, depth=0.22, frame_w=0.12, sill=True, shutters=False):
    """A recessed opening with a flush surround (frame), reveals, sill and back panel. Returns the
    hole rectangle (outer surround) for the wall bands."""
    tmat = tmat or M["sandstone"]
    fw = frame_w
    yb = y0 if kind in ("door", "plankdoor", "roller", "metaldoor", "dark", "rolldoor") else y0 - fw
    hole = (u0 - fw, u1 + fw, max(0.0, yb), y1 + fw)
    tint_f = (1, 1, 1)
    # surround front faces (flush at w = 0) and outer returns (w 0 → -WI)
    ring = [(u0 - fw, u0, hole[2], hole[3]), (u1, u1 + fw, hole[2], hole[3]), (u0, u1, y1, y1 + fw)]
    if hole[2] < y0:
        ring.append((u0, u1, hole[2], y0))
    for (a, b, c, d) in ring:
        fr.wall(mesh, a, b, c, d, 0.0, tmat, cols=[mul(tint_f, grime(c, None))] * 2 + [mul(tint_f, grime(d, None))] * 2)
    fr.side(mesh, hole[0], hole[2], hole[3], 0.0, -WI, tmat, facing_right=False)
    fr.side(mesh, hole[1], hole[2], hole[3], 0.0, -WI, tmat, facing_right=True)
    fr.flat(mesh, hole[0], hole[1], hole[3], 0.0, -WI, tmat, up=True)
    if hole[2] > 0.01:
        fr.flat(mesh, hole[0], hole[1], hole[2], 0.0, -WI, tmat, up=False)
    # reveals (inside the opening, w 0 → -depth)
    dk = [(0.55, 0.52, 0.48)] * 4
    fr.side(mesh, u0, y0, y1, 0.0, -depth, wmat, facing_right=True, cols=dk)
    fr.side(mesh, u1, y0, y1, 0.0, -depth, wmat, facing_right=False, cols=dk)
    fr.flat(mesh, u0, u1, y1, 0.0, -depth, wmat, up=False, cols=[(0.5, 0.48, 0.45)] * 4)
    if y0 > 0.01:
        fr.flat(mesh, u0, u1, y0, 0.0, -depth, wmat, up=True, cols=[(0.8, 0.78, 0.74)] * 4)
    else:  # stone threshold: the recess has a floor (the ground stops at the collision boundary)
        fr.flat(mesh, u0 - 0.01, u1 + 0.01, 0.004, 0.0, -depth - 0.13, tmat, up=True, cols=[(0.7, 0.67, 0.62)] * 4)
    # back panel
    cell = {"window": "window", "shutter": "shutter", "grille": "grille", "door": "door", "plankdoor": "plankdoor", "loggia": "door",
            "roller": "roller", "vent": "vent", "dark": "dark", "sign": "sign", "cabinet": "cabinet"}.get(kind, "dark")
    tint = p.get("tint", (1, 1, 1))
    if kind in ("shutter", "door", "roller", "loggia"):
        tint = p.get("paint", (0.6, 0.6, 0.6))
    if kind not in ("metaldoor", "rolldoor"):
        fr.wall(mesh, u0, u1, y0, y1, -depth, M["trim"], uvs=atlas_uv(T[cell]), cols=[tint] * 4)
    else:
        fr.wall(mesh, u0, u1, y0, y1, -depth - 0.12, M["trim"], uvs=atlas_uv(T["dark"]))
    # sill: 3 cm proud of the boundary at most
    if sill and kind in ("window", "shutter", "grille"):
        fr.lbox(mesh, u0 - 0.06, u1 + 0.06, y0 - 0.07, y0, 0.03, -depth + 0.02, tmat, skip=("back",))
    # open shutter leaves lying on the wall beside the surround (inside the 4 cm inset)
    if shutters:
        sw = (u1 - u0) / 2
        for (a, b) in ((u0 - fw - sw, u0 - fw), (u1 + fw, u1 + fw + sw)):
            fr.lbox(mesh, a + 0.01, b - 0.01, y0 + 0.02, y1 - 0.02, -0.012, -WI, M["wood"], skip=("back", "front"),
                    cols=[p.get("paint", (0.6, 0.6, 0.6))] * 4)
            # front face with the louvre texture (the lbox front used world UVs: overwrite with a quad)
            fr.wall(mesh, a + 0.01, b - 0.01, y0 + 0.02, y1 - 0.02, -0.011, M["trim"], uvs=atlas_uv(T["shutter"]),
                    cols=[p.get("paint", (0.6, 0.6, 0.6))] * 4)
    return hole


def facade(p):
    fr, L_ = p.fr, p.L
    area = p.area
    mesh = bucket(area, "Interior Architecture" if p.cover else "Buildings")
    # Footing: close the 4 cm between the ground (ends at the collision boundary) and the inset
    # wall plane, so no sliver of sky shows at the base of a wall.
    fr.flat(mesh, -0.02, L_ + 0.02, 0.0, 0.0, -0.2, M["concrete"], cols=[(0.55, 0.5, 0.45)] * 4)
    wmat = M[p.wallmat]
    trimmat = M["concrete"] if p.style == "industrial" else M["sandstone"]
    Htop = p.H
    holes, ground_open = [], []
    margin = 0.45
    k = (p.key,)
    if p.style == "interior":
        # Covered passage wall: plaster over a ceramic-tile wainscot, doors and dark doorways.
        nb = max(1, int(L_ // 3.2))
        bw = L_ / nb
        for q in range(nb):
            c = (q + 0.5) * bw
            r = H("int", q, *k)
            if bw < 1.9 or r < 0.35:
                continue
            w_ = min(1.3, bw - 0.7)
            kind = "door" if r < 0.6 else ("plankdoor" if r < 0.8 else "dark")
            holes.append(opening(fr, mesh, c - w_ / 2, c + w_ / 2, 0.0, min(2.3, Htop - 0.6), kind,
                                 {"paint": pick(PAINT, "dp", q, *k)}, wmat, trimmat, depth=0.25, frame_w=0.1))
        # wainscot tiles in 1 m panels (the tile cell maps once per metre), flush at w = -0.02
        u = 0.0
        while u < L_ - 1e-3:
            u1 = min(L_, u + 1.0)
            cu = (u + u1) / 2
            if not any(h[0] - 1e-3 <= cu <= h[1] + 1e-3 for h in holes):
                frac = (u1 - u) / 1.0
                fr.wall(mesh, u, u1, 0.12, 1.12, -0.02, M["trim"], uvs=atlas_sub(T["tiles"], 0, frac, 0, 1),
                        cols=[(0.92, 0.9, 0.86)] * 4)
            u = u1
        wall_with_holes(fr, mesh, 0, L_, 0.0, Htop, -WI, wmat, holes, mul(p.tint, 0.93), None)
        ledge(fr, mesh, 0, L_, 1.12, -0.02, -WI, M["trim"], holes, up=True, tint=(0.5, 0.48, 0.45))
        # skirting under the tiles
        return
    # ---------------------------------------------------------------- exterior building facade
    ind = p.style == "industrial"
    PL = 0.0 if p.style == "sandstone" else (0.55 if ind else 0.6 + 0.3 * H("pl", *k))
    floors = [(0.0, 3.8), (3.8, min(Htop, 7.8))] + ([(7.8, Htop)] if Htop > 9.5 else [])
    nb = max(1, int(round(L_ / (4.2 if ind else 3.4))))
    bw = L_ / nb
    usable = lambda c, w_: c - w_ / 2 - 0.2 >= margin and c + w_ / 2 + 0.2 <= L_ - margin
    wtype = pick(["shutter_open", "shutter", "grille", "window"] if p.style in ("plaster", "brick")
                 else (["grille", "window", "shutter"] if p.style in ("sandstone", "adobe") else ["window", "vent"]), "wt", *k)
    # Pilasters (flush stone strips) where this building meets the next one along the facade.
    start_at_a = abs(fr.u0 - p.a) < 1e-6
    ends = {0.0: (p.a if start_at_a else p.b), L_: (p.b if start_at_a else p.a)}
    pil = []
    for u_end, coord in ends.items():
        at_run_end = abs(coord - (p.run["b"] if coord > p.run["a"] + 1e-6 else p.run["a"])) < 1e-6
        internal = not (abs(coord - p.run["a"]) < 1e-6 or abs(coord - p.run["b"]) < 1e-6)
        flat = internal or corner_kind(p.run, abs(coord - p.run["b"]) < 1e-6) == "flat"
        if flat and L_ > 2.0:
            pil.append((0.0, 0.32) if u_end == 0.0 else (L_ - 0.32, L_))
    for (a, b) in pil:
        holes.append((a, b, 0.0, Htop))
        fr.wall(mesh, a, b, 0.0, Htop, 0.0, trimmat, colf=lambda u, y: (grime(y, None),) * 3)
        if a > 0:
            fr.side(mesh, a, 0.0, Htop, 0.0, -WI, trimmat, facing_right=False)
        else:
            fr.side(mesh, b, 0.0, Htop, 0.0, -WI, trimmat, facing_right=True)
    margin = 0.45 + (0.32 if pil else 0.0)
    # A drainpipe in a shallow chase at one bay boundary (two on industrial blocks).
    if nb >= 2 and L_ > 5:
        for qq in ([int(H("dp", *k) * (nb - 1)) + 1] if not ind else [1, nb - 1]):
            c = qq * bw
            if c < margin + 0.2 or c > L_ - margin - 0.2:
                continue
            holes.append((c - 0.12, c + 0.12, 0.0, Htop - 0.3))
            fr.wall(mesh, c - 0.12, c + 0.12, 0.0, Htop - 0.3, -0.16, wmat, colf=lambda u, y: mul(p.tint, 0.8 * grime(y, Htop)))
            fr.side(mesh, c - 0.12, 0.0, Htop - 0.3, 0.0, -0.16, wmat, facing_right=True, cols=[mul(p.tint, 0.7)] * 4)
            fr.side(mesh, c + 0.12, 0.0, Htop - 0.3, 0.0, -0.16, wmat, facing_right=False, cols=[mul(p.tint, 0.7)] * 4)
            fr.flat(mesh, c - 0.12, c + 0.12, Htop - 0.3, 0.0, -0.16, wmat, up=False, cols=[mul(p.tint, 0.6)] * 4)
            px_, _, pz_ = fr.P(c, 0.0, -0.095)
            cylinder(mesh, px_, pz_, 0.12, Htop - 0.32, 0.055, 0.055, M["metal"], n=8, caps=False, cols=(0.52, 0.48, 0.42))
            for by in (1.2, 3.6, 6.0):
                if by < Htop - 0.6:
                    fr.lbox(mesh, c - 0.07, c + 0.07, by, by + 0.04, -0.03, -0.16, M["metal"], cols=[(0.3, 0.29, 0.27)] * 4)
    for q in range(nb):
        c = (q + 0.5) * bw
        for fi, (fy0, fy1) in enumerate(floors):
            r = H("bay", q, fi, *k)
            if fi == 0:
                # ground floor
                if ind and bw >= 3.6 and r < 0.4 and usable(c, 3.0):
                    holes.append(opening(fr, mesh, c - 1.4, c + 1.4, 0.0, 3.0, "roller",
                                         {"paint": pick(METAL_PAINT, "rp", q, *k)}, wmat, trimmat, depth=0.3, frame_w=0.15))
                    ground_open.append((c - 1.55, c + 1.55))
                    MODEL_PLACE.append(("rolldoor", fr, c, 2.8, 0.0, 3.0, -0.17, 0.22, p.area))
                elif r < (0.45 if not ind else 0.62) and usable(c, 1.3):
                    kind = "door" if H("dk", q, *k) < 0.6 else "plankdoor"
                    if ind:
                        kind = "metaldoor"
                    w_ = 1.3 if kind != "metaldoor" else 1.5
                    holes.append(opening(fr, mesh, c - w_ / 2, c + w_ / 2, 0.0, 2.35, kind,
                                         {"paint": pick(PAINT, "dp", q, *k)}, wmat, trimmat, depth=0.3))
                    ground_open.append((c - w_ / 2 - 0.12, c + w_ / 2 + 0.12))
                    if not ind and area in ("Central Mid", "Terrorist Spawn", "A Long", "B Main") and H("sg", q, *k) < 0.45 \
                            and usable(c, 1.7):
                        # painted shop board above the door (5 mm in front of the wall plane)
                        fr.wall(mesh, c - 0.85, c + 0.85, 2.62, 3.22, -WI + 0.005, M["trim"], uvs=atlas_uv(T["sign"]),
                                cols=[(0.95, 0.92, 0.88)] * 4)
                    if kind == "metaldoor":
                        MODEL_PLACE.append(("metaldoor", fr, c, w_, 0.0, 2.35, -0.36, 0.12, p.area))
                elif r < 0.78 and usable(c, 1.1):
                    kind = "grille" if wtype in ("grille", "window") and H("g", q, *k) < 0.6 else ("shutter" if not ind else "window")
                    holes.append(opening(fr, mesh, c - 0.55, c + 0.55, 1.05, 2.35, kind, {"paint": p.shut}, wmat, trimmat))
                elif r < 0.9 and usable(c, 0.9):
                    # recessed AC unit / electrical cabinet niche
                    if H("ac", q, *k) < 0.5:
                        holes.append(opening(fr, mesh, c - 0.45, c + 0.45, 1.4, 2.05, "dark", {}, wmat, trimmat, depth=0.36,
                                             frame_w=0.06, sill=False))
                        fr.wall(mesh, c - 0.42, c + 0.42, 1.42, 2.03, -0.07, M["trim"], uvs=atlas_uv(T["acfront"]),
                                cols=[(0.95, 0.93, 0.9)] * 4)
                    else:
                        # electrical cabinet (library model) set into a wall niche
                        holes.append(opening(fr, mesh, c - 0.42, c + 0.42, 0.45, 1.6, "dark", {}, wmat, trimmat, depth=0.32,
                                             frame_w=0.05, sill=False))
                        MODEL_PLACE.append(("ebox", fr, c, 0.8, 0.47, 1.1, -0.18, 0.24, p.area))
            else:
                if fy1 - fy0 < 2.4:
                    continue
                sy0 = fy0 + 0.9
                sy1 = min(fy1 - 0.45, sy0 + 1.5)
                if not ind and bw >= 2.8 and fi == 1 and H("lg", q, *k) < 0.14 and usable(c, 1.9):
                    # recessed loggia: a balcony inside the block, railing in the facade plane
                    ly0 = fy0 + 0.35
                    holes.append(opening(fr, mesh, c - 0.9, c + 0.9, ly0, ly0 + 2.45, "loggia", {"paint": p.shut}, wmat, trimmat,
                                         depth=0.95, sill=False))
                    fr.lbox(mesh, c - 0.9, c + 0.9, ly0 + 0.98, ly0 + 1.03, -0.02, -0.07, M["metal"], cols=[(0.22, 0.2, 0.18)] * 4)
                    nbar = 13
                    for bi in range(1, nbar):
                        bu = c - 0.9 + bi * 1.8 / nbar
                        fr.lbox(mesh, bu - 0.01, bu + 0.01, ly0, ly0 + 0.98, -0.035, -0.055, M["metal"], skip=("back",),
                                cols=[(0.22, 0.2, 0.18)] * 4)
                elif r < 0.85 and usable(c, 1.1):
                    if ind:
                        holes.append(opening(fr, mesh, c - 0.8, c + 0.8, sy0 + 0.6, sy1, "window", {}, wmat, trimmat, depth=0.18))
                    else:
                        kind = {"shutter_open": "window", "shutter": "shutter", "grille": "grille", "window": "window"}[wtype]
                        if H("cl", q, fi, *k) < 0.25:
                            kind = "shutter"
                        so = wtype == "shutter_open" and kind == "window" and bw >= 2.6 and usable(c, 2.5)
                        holes.append(opening(fr, mesh, c - 0.55, c + 0.55, sy0, sy1, kind, {"paint": p.shut}, wmat, trimmat,
                                             shutters=so))
                elif r < 0.88 and usable(c, 0.6):
                    holes.append(opening(fr, mesh, c - 0.3, c + 0.3, sy0 + 0.5, sy0 + 1.0, "vent", {}, wmat, trimmat,
                                         depth=0.08, frame_w=0.06, sill=False))
    # Plinth (flush, w = 0) and wall (w = -WI); string course at the first floor for masonry.
    tint = p.tint
    if PL > 0:
        ph = [h for h in holes]
        wall_with_holes(fr, mesh, 0, L_, 0.0, PL, 0.0, trimmat, ph, mul((1, 1, 1), 0.95), None, rows=())
        ledge(fr, mesh, 0, L_, PL, 0.0, -WI, trimmat, holes)
    if not ind:
        wall_with_holes(fr, mesh, 0, L_, PL, Htop - 0.3, -WI, wmat, holes, tint, Htop)
    if ind:
        # concrete ground storey, painted corrugated cladding above a concrete band
        wall_with_holes(fr, mesh, 0, L_, PL, 4.0, -WI, wmat, holes, tint, None)
        wall_with_holes(fr, mesh, 0, L_, 4.0, 4.25, 0.0, trimmat, [h for h in holes if h[2] < 4.25 and h[3] > 4.0], (0.95, 0.93, 0.9),
                        None, rows=())
        ledge(fr, mesh, 0, L_, 4.25, 0.0, -WI, trimmat, [h for h in holes if h[2] < 4.25 and h[3] > 4.0])
        ledge(fr, mesh, 0, L_, 4.0, 0.0, -WI, trimmat, [h for h in holes if h[2] < 4.25 and h[3] > 4.0], up=False)
        wall_with_holes(fr, mesh, 0, L_, 4.25, Htop, -WI, M["metal"], holes, pick(METAL_PAINT, "clad", *k), Htop)
    else:
        # cornice: flush band under the roof line
        cm = trimmat
        fr.wall(mesh, 0, L_, Htop - 0.3, Htop, 0.0, cm, cols=[(0.9, 0.88, 0.85)] * 4)
        fr.flat(mesh, 0, L_, Htop - 0.3, 0.0, -WI, cm, up=False, cols=[(0.6, 0.58, 0.55)] * 4)
    if not ind and p.style != "sandstone" and Htop >= 8 and H("sc", *k) < 0.6:
        sc_holes = [h for h in holes if h[2] < 3.95 and h[3] > 3.75]
        wall_with_holes(fr, mesh, 0, L_, 3.75, 3.95, 0.0, trimmat, sc_holes, (0.95, 0.93, 0.9), None, rows=())
        ledge(fr, mesh, 0, L_, 3.95, 0.0, -WI, trimmat, sc_holes)
        ledge(fr, mesh, 0, L_, 3.75, 0.0, -WI, trimmat, sc_holes, up=False)
    FACADE_INFO.append((p, holes, ground_open))


MODEL_PLACE = []
FACADE_INFO = []
for p in PIECES:
    facade(p)


# -------------------------------------------------------------------- corners, roofs, masses
def corner_quoins(run, at_end, area):
    """Outer corners: a flush stone quoin column hides the 4 cm inset where two walls meet."""
    n = DIRS[run["n"]]
    t = run["b"] if at_end else run["a"]
    x, z = (run["line"], t) if n[0] else (t, run["line"])
    # the solid is on the -n side; the quoin occupies [x - n*0.3, x] × [t - 0.3*s, t]
    s = -1 if at_end else 1  # into the run
    if n[0]:
        xa, xb = sorted((x, x - n[0] * 0.32))
        za, zb = sorted((t, t + s * 0.32))
    else:
        za, zb = sorted((z, z - n[1] * 0.32))
        xa, xb = sorted((t, t + s * 0.32))
    return xa, xb, za, zb


done_corners = set()
for run in RUNS:
    for at_end in (False, True):
        if corner_kind(run, at_end) != "convex":
            continue
        xa, xb, za, zb = corner_quoins(run, at_end, None)
        key = (round(xa, 2), round(za, 2))
        if key in done_corners:
            continue
        done_corners.add(key)
        cxm, czm = (xa + xb) / 2, (za + zb) / 2
        nx, nz = DIRS[run["n"]]
        area = area_at(cxm + nx * 1.0, czm + nz * 1.0)
        cv = cover_at(cxm + nx * 1.0, czm + nz * 1.0)
        top = cv[5] if cv else 8.0
        mesh = bucket(area)
        box(mesh, xa, xb, 0.0, top, za, zb, M["sandstone"], colf=lambda pt: (grime(pt[1], None),) * 3)


def mass_and_roof(p):
    """Above the 8 m collision: upper storeys, parapets and terracotta roofs (free architecture)."""
    if p.cover:
        return
    fr = p.fr
    mesh = bucket(p.area)
    L_, Ht = p.L, p.H
    dep = max(1.0, p.depth)
    wmat = M[p.wallmat]
    trim = M["concrete"] if p.style == "industrial" else M["sandstone"]
    tint = p.tint
    if Ht > 8.0:
        # Adjacent facades/cornices own the visible join. Recess the mass caps 2 cm:
        # flush caps quantized independently in another section can depth-fight at distance.
        inset = 0.02
        cols = [mul(tint, 0.96)] * 4
        fr.side(mesh, inset, 8.0, Ht, -WI, -dep, wmat, facing_right=False, cols=cols)
        fr.side(mesh, L_ - inset, 8.0, Ht, -WI, -dep, wmat, facing_right=True, cols=cols)
        pts = [fr.P(L_, 8.0, -dep + inset), fr.P(0, 8.0, -dep + inset),
               fr.P(0, Ht, -dep + inset), fr.P(L_, Ht, -dep + inset)]
        quad(mesh, pts, wmat, cols=cols)
    if p.roof == "tiles":
        rd = min(dep, 4.0)
        pitch = math.tan(math.radians(24))
        ridge = Ht + rd * pitch
        eave_w = 0.2  # overhang above 8 m only
        # roof surface
        pts = [fr.P(-0.12, Ht - 0.04, eave_w), fr.P(L_ + 0.12, Ht - 0.04, eave_w), fr.P(L_ + 0.12, ridge, -rd), fr.P(-0.12, ridge, -rd)]
        slope = math.hypot(rd + eave_w, ridge - Ht)
        quad(mesh, pts, M["rooftile"], uvs=[(0, 0), ((L_ + 0.24) / 1.5, 0), ((L_ + 0.24) / 1.5, slope / 2.8), (0, slope / 2.8)],
             cols=[(0.92, 0.9, 0.88)] * 2 + [(1, 1, 1)] * 2)
        # soffit and fascia
        fr.flat(mesh, -0.12, L_ + 0.12, Ht - 0.04, eave_w, -WI, M["wood"], up=False, cols=[(0.35, 0.3, 0.26)] * 4)
        fr.wall(mesh, -0.12, L_ + 0.12, Ht - 0.12, Ht - 0.04, eave_w, M["wood"], cols=[(0.4, 0.33, 0.27)] * 4)
        # gable ends (triangles) and the back wall up to the ridge
        for u, right in ((0.0, False), (L_, True)):
            tri = [fr.P(u, Ht, -WI), fr.P(u, Ht, -rd), fr.P(u, ridge, -rd)]
            if not right:
                tri = tri[::-1]
            quad(mesh, tri, wmat, cols=[mul(tint, 0.95)] * 3)
        pts = [fr.P(L_, Ht, -rd), fr.P(0, Ht, -rd), fr.P(0, ridge, -rd), fr.P(L_, ridge, -rd)]
        quad(mesh, pts, wmat, cols=[mul(tint, 0.95)] * 4)
        # flat roof behind the slope
        if Ht > 8.0 and dep > rd + 0.1:
            fr.flat(mesh, 0, L_, Ht, -rd, -dep, M["concrete"], cols=[(0.8, 0.77, 0.72)] * 4)
    else:
        # parapet with a coping stone
        ph = 0.6 + 0.4 * H("ph", *p.key)
        fr.lbox(mesh, 0, L_, Ht, Ht + ph - 0.08, -WI, -0.3, wmat, cols=[mul(tint, 0.95)] * 4)
        fr.lbox(mesh, 0, L_, Ht + ph - 0.08, Ht + ph, 0.0, -0.34, trim, cols=[(0.92, 0.9, 0.86)] * 4)
        if Ht > 8.0:
            fr.flat(mesh, 0, L_, Ht, -0.3, -dep, M["concrete"], cols=[(0.78, 0.75, 0.7)] * 4)


for p in PIECES:
    mass_and_roof(p)


def perimeter(p):
    """Concrete barrier wall on the arena boundary in front of a set-back outside facade: Bremer
    walls on the Police (north) edge, T-walls on the Terrorist (south) edge; closing side walls
    between the boundary and the set-back facade."""
    fr0 = p.fr0
    north = p.run["n"] == "+z"
    name, h, d, unit = ("bremer", 4.0, 1.2, 1.6) if north else ("twall", 3.6, 0.74, 1.38)
    n = max(1, round(p.L / unit))
    uw = p.L / n
    rx, rz = fr0.rv
    yaw = 0.0 if rx else math.pi / 2
    for q in range(n):
        x, _, z = fr0.P((q + 0.5) * uw, 0.0, -d / 2)
        place(name, p.area, "Military Sand Walls and Barriers", x, 0.0, z, uw - 0.03, h, d,
              yaw + (math.pi if H("pf", q, *p.key) < 0.5 else 0.0), tint=pick([(1, 0.96, 0.9), (0.95, 0.92, 0.86), (1, 1, 0.95)], "pt", q, *p.key))
    mesh = bucket(p.area)
    for u, right in ((0.0, True), (p.L, False)):
        fr0.side(mesh, u, 0.0, p.H, 0.0, -p.setback, M["plaster"], facing_right=right, cols=[mul(p.tint, 0.9)] * 4)


# Block roofs at 8 m (seen only from far away and from the upper storeys' gaps).
for s in BUILD:
    x0, x1, z0, z1 = s["x"] - s["w"] / 2, s["x"] + s["w"] / 2, s["z"] - s["d"] / 2, s["z"] + s["d"] / 2
    best = min(OPEN, key=lambda o: math.hypot(max(o[1] - s["x"], 0, s["x"] - o[2]), max(o[3] - s["z"], 0, s["z"] - o[4])))
    area = AREA_OF[best[0]]
    quad(bucket(area), [(x0, 8.0, z1), (x1, 8.0, z1), (x1, 8.0, z0), (x0, 8.0, z0)], M["concrete"], cols=[(0.72, 0.68, 0.62)] * 4)


# -------------------------------------------------------------------- covered passages
def cover_box(c):
    name, x0, x1, z0, z1, hc = c
    area = area_at((x0 + x1) / 2, (z0 + z1) / 2)
    mesh = bucket(area, "Interior Architecture")
    # ceiling (faces down) with timber beams across the short span, closed volume up to 8 m
    quad(mesh, [(x0, hc, z0), (x1, hc, z0), (x1, hc, z1), (x0, hc, z1)], M["concrete"], cols=[(0.62, 0.6, 0.57)] * 4)
    box(mesh, x0, x1, hc, 8.0, z0, z1, M["plaster"], skip=("ny",), top=M["concrete"],
        colf=lambda pt: (0.9, 0.86, 0.8) if pt[1] < 7.9 else (0.72, 0.68, 0.62))
    span_x = (x1 - x0) < (z1 - z0)
    length = (z1 - z0) if span_x else (x1 - x0)
    nbeam = int(length // 1.6)
    for q in range(1, nbeam + 1):
        t = (z0 if span_x else x0) + q * length / (nbeam + 1)
        if span_x:
            box(mesh, x0 + 0.04, x1 - 0.04, hc - 0.22, hc, t - 0.08, t + 0.08, M["wood"], cols=[(0.45, 0.36, 0.28)] * 4)
        else:
            box(mesh, t - 0.08, t + 0.08, hc - 0.22, hc, z0 + 0.04, z1 - 0.04, M["wood"], cols=[(0.45, 0.36, 0.28)] * 4)
    # lamps: small fixtures under the ceiling every ~5 m
    nl = max(1, int(length // 5))
    for q in range(nl):
        t = (z0 if span_x else x0) + (q + 0.5) * length / nl
        lx, lz = ((x0 + x1) / 2, t) if span_x else (t, (z0 + z1) / 2)
        box(mesh, lx - 0.25, lx + 0.25, hc - 0.32, hc - 0.22, lz - 0.08, lz + 0.08, M["metal"], bottom=True,
            cols=[(0.3, 0.3, 0.28)] * 4)


for c in COVERS:
    cover_box(c)


# =============================================================================== library assets
LIB = {}
with bpy.data.libraries.load(os.path.join(HERE, "build", "library.blend"), link=False) as (src, dst):
    dst.objects = [n for n in src.objects if n.startswith("lib-")]
libc = LAY.side("Asset Library")
for o in dst.objects:
    libc.objects.link(o)
    LIB[o.name[4:]] = o


def lib_dims(name):
    o = LIB[name]
    xs = [v.co.x for v in o.data.vertices]
    ys = [v.co.y for v in o.data.vertices]
    zs = [v.co.z for v in o.data.vertices]
    return (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))


DIMS = {k: lib_dims(k) for k in LIB}
_variants = {}


def variant(name, tint):
    """A copy of a library mesh with a vertex-colour tint (same materials, one more GPU batch)."""
    if tint is None:
        return LIB[name].data
    key = (name, tuple(round(t, 3) for t in tint))
    if key not in _variants:
        me = LIB[name].data.copy()
        me.name = f"lib-{name}-{len(_variants)}"
        ca = me.color_attributes.new("Color", "BYTE_COLOR", "CORNER")
        for d in ca.data:
            d.color = (lin(tint[0]), lin(tint[1]), lin(tint[2]), 1.0)
        me.color_attributes.active_color = ca
        _variants[key] = me
    return _variants[key]


def place(name, area, category, x, y, z, sx, sy, sz, yaw=0.0, tint=None, shadow=True):
    """Instance a library mesh. (sx, sy, sz): target size in game metres along the library's own
    X (long axis), Z (height) and Y (depth) after `yaw` (radians, about game y)."""
    dx, dy, dz = DIMS[name]
    o = bpy.data.objects.new(f"{name}", variant(name, tint))
    o.location = B(x, y, z)
    o.rotation_euler = (0, 0, yaw)
    o.scale = (sx / dx, sz / dy, sy / dz)
    o["instance"] = True
    if not shadow:
        o["noShadow"] = True
    LAY.get(area, category).objects.link(o)
    return o


def fit(name, s, area, category, tint=None, inset=0.02, along=None, yaw_extra=0.0, scale=(1, 1, 1)):
    """Fit a library model into a solid's box (long axis along the box's long side)."""
    w, h, d = s["w"] - 2 * inset, s["h"] - inset, s["d"] - 2 * inset
    long_x = (along == "x") if along else (w >= d)
    yaw = (0.0 if long_x else math.pi / 2) + yaw_extra
    L_, Wd = (w, d) if long_x else (d, w)
    return place(name, area, category, s["x"], s["y"] - s["h"] / 2, s["z"], L_ * scale[0], h * scale[1], Wd * scale[2], yaw, tint)


# =============================================================================== gameplay solids
def sb(s):
    return s["x"] - s["w"] / 2, s["x"] + s["w"] / 2, s["y"] - s["h"] / 2, s["y"] + s["h"] / 2, s["z"] - s["d"] / 2, s["z"] + s["d"] / 2


def area_of_solid(s):
    return area_at(s["x"], s["z"])


def hesco_wall(s, area, rows=None):
    x0, x1, y0, y1, z0, z1 = sb(s)
    long_x = (x1 - x0) >= (z1 - z0)
    L_ = (x1 - x0) if long_x else (z1 - z0)
    depth = (z1 - z0) if long_x else (x1 - x0)
    rows = rows or max(1, round(s["h"] / 1.1))
    hh = s["h"] / rows
    cells = max(1, round(L_ / 1.0))
    cl = L_ / cells
    for r in range(rows):
        for c in range(cells):
            t = (x0 if long_x else z0) + (c + 0.5) * cl
            jitter = (H("hj", s["id"], r, c) - 0.5) * 0.04
            cx_, cz_ = (t, s["z"]) if long_x else (s["x"], t)
            yaw = (0.0 if long_x else math.pi / 2) + pick([0, math.pi], "hy", s["id"], r, c) + jitter
            # The fabric bulges; the model's bounding box is 3 cm over the cell so the flat faces sit
            # on the collision faces (bulges at most 1.5 cm proud).
            place("hesco", area, "Military Sand Walls and Barriers", cx_, r * hh, cz_, cl + 0.03, hh + 0.01, depth + 0.03, yaw,
                  tint=pick([(1, 1, 1), (0.95, 0.93, 0.88), (1, 0.97, 0.9)], "ht", s["id"], r, c))


def sandbag_stack(s, area):
    x0, x1, y0, y1, z0, z1 = sb(s)
    long_x = (x1 - x0) >= (z1 - z0)
    L_ = (x1 - x0) if long_x else (z1 - z0)
    depth = (z1 - z0) if long_x else (x1 - x0)
    rows = max(1, round(s["h"] / 0.29))
    hh = s["h"] / rows
    for r in range(rows):
        n = max(1, round(L_ / 0.95))
        bl = L_ / n
        off = (bl / 2) if r % 2 else 0.0
        segs = []
        u = -off if off else 0.0
        while u < L_ - 1e-3:
            a, b = max(0.0, u), min(L_, u + bl)
            if b - a > 0.3:
                segs.append((a, b))
            u += bl
        for (a, b) in segs:
            t = (x0 if long_x else z0) + (a + b) / 2
            cx_, cz_ = (t, s["z"]) if long_x else (s["x"], t)
            yaw = (0.0 if long_x else math.pi / 2) + (H("sy", s["id"], r, a) - 0.5) * 0.06
            place("sandbag", area, "Military Sand Walls and Barriers", cx_, r * hh - 0.01, cz_, (b - a) - 0.02, hh + 0.04,
                  depth - 0.03, yaw)


def crate_grid(s, area, nx, nz, ny=1, kind="crate", tints=None):
    x0, x1, y0, y1, z0, z1 = sb(s)
    cw, cd, ch = (x1 - x0) / nx, (z1 - z0) / nz, (y1 - y0) / ny
    for a in range(nx):
        for b in range(nz):
            for c in range(ny):
                cxx = x0 + (a + 0.5) * cw
                czz = z0 + (b + 0.5) * cd
                yaw = pick([0, math.pi / 2, math.pi, -math.pi / 2], "cy", s["id"], a, b, c)
                sq = abs(cw - cd) < 0.05
                if not sq:
                    yaw = pick([0, math.pi], "cy", s["id"], a, b, c)
                    L_, Wd = (cw, cd) if True else (cd, cw)
                else:
                    L_, Wd = cw, cd
                t = pick(tints, "ct", s["id"], a, b, c) if tints else None
                place(kind, area, "Containers and Cover", cxx, y0 + c * ch, czz, L_ - 0.01, ch - 0.005, Wd - 0.01, yaw, tint=t)


def stone_block(mesh, s, mat=None, top=None, cap=0.0, colf=None):
    x0, x1, y0, y1, z0, z1 = sb(s)
    mat = mat or M["sandstone"]
    box(mesh, x0, x1, y0, y1, z0, z1, mat, top=top, colf=colf or (lambda pt: (grime(pt[1], None),) * 3))


def dress_solid(s):
    k = s["kind"]
    area = area_of_solid(s)
    x0, x1, y0, y1, z0, z1 = sb(s)
    if k == "building":
        return
    if k == "stair":
        mesh = bucket(area, "Stairs and Platforms")
        mat = M["sandstone"] if s["id"].startswith("a-platform") else M["concrete"]
        box(mesh, x0, x1, y0, y1, z0, z1, mat, top=M["pavement"] if mat is M["sandstone"] else M["concrete"],
            colf=lambda pt: (0.9 * grime(pt[1], None),) * 3 if pt[1] < y1 - 1e-3 else (0.95, 0.94, 0.9))
        return
    if k in ("platform", "catwalk"):
        mesh = bucket(area, "Stairs and Platforms")
        if s["id"] == "b-dock":
            box(mesh, x0, x1, y0, y1 - 0.12, z0, z1, M["concrete"], skip=("py",), colf=lambda pt: (grime(pt[1], None),) * 3)
            # steel edge with worn hazard stripes on the three open faces (atlas cell per metre)
            box(mesh, x0, x1, y1 - 0.12, y1, z0, z1, M["concrete"], skip=("nx", "pz", "nz"), cols=[(0.93, 0.9, 0.86)] * 4)
            for face in ("nx", "pz", "nz"):
                if face == "nx":
                    a0, a1 = z0, z1
                    P = lambda t, y: (x0, y, t)
                    order = lambda t0, t1, ya, yb: [P(t0, ya), P(t1, ya), P(t1, yb), P(t0, yb)]
                elif face == "pz":
                    a0, a1 = x0, x1
                    P = lambda t, y: (t, y, z1)
                    order = lambda t0, t1, ya, yb: [P(t0, ya), P(t1, ya), P(t1, yb), P(t0, yb)]
                else:
                    a0, a1 = x0, x1
                    P = lambda t, y: (t, y, z0)
                    order = lambda t0, t1, ya, yb: [P(t1, ya), P(t0, ya), P(t0, yb), P(t1, yb)]
                t = a0
                while t < a1 - 1e-3:
                    t1 = min(a1, t + 1.0)
                    quad(mesh, order(t, t1, y1 - 0.12, y1), M["trim"], uvs=atlas_sub(T["hazard"], 0, t1 - t, 0, 0.12))
                    t = t1
            for q in range(3):
                zc = z0 + (q + 0.5) * (z1 - z0) / 3
                box(mesh, x0 - 0.03, x0 + 0.02, 0.25, 0.85, zc - 0.25, zc + 0.25, M["metal"], cols=[(0.12, 0.11, 0.1)] * 4)
        elif s["kind"] == "catwalk":
            box(mesh, x0, x1, y0, y1 - 0.1, z0, z1, M["sandstone"], skip=("py",), colf=lambda pt: (grime(pt[1], None),) * 3)
            box(mesh, x0, x1, y1 - 0.1, y1, z0, z1, M["concrete"], top=M["concrete"], cols=[(0.9, 0.88, 0.84)] * 4)
        else:
            box(mesh, x0, x1, y0, y1 - 0.14, z0, z1, M["sandstone"], skip=("py",), colf=lambda pt: (grime(pt[1], None),) * 3)
            box(mesh, x0, x1, y1 - 0.14, y1, z0, z1, M["sandstone"], top=M["pavement"], cols=[(0.96, 0.94, 0.9)] * 4)
        return
    if k in ("vehicle", "forklift"):
        return  # dressed per vehicle (dress_vehicles): its several boxes share one model
    if k == "container":
        tint = {"long-container-1": (0.58, 0.62, 0.45), "long-container-2": (0.92, 0.8, 0.6), "b-container": (0.68, 0.45, 0.33)}.get(s["id"])
        fit("container", s, area, "Containers and Cover", tint=tint, inset=0.0)
        return
    if k == "crate-stack":
        crate_grid(s, area, 2, 2, 2, "crate")
        return
    if k == "crate":
        if s["id"] == "mid-crates":
            # one long military crate on the north row, two wooden crates on the south row
            sn = dict(s, d=s["d"] / 2, z=s["z"] - s["d"] / 4)
            place("ammo", area, "Containers and Cover", sn["x"], 0.0, sn["z"], sn["w"] - 0.04, sn["h"] - 0.01, sn["d"] - 0.04, 0.0)
            ss = dict(s, d=s["d"] / 2, z=s["z"] + s["d"] / 4)
            crate_grid(ss, area, 3, 1, 1, "crate")
        elif s["id"] == "hall-crates":
            crate_grid(s, area, 2, 2, 1, "crate")
        else:
            crate_grid(s, area, 1, 1, 1, "crate")
        return
    if k in ("blast-wall", "sand-barrier"):
        if s["id"] == "long-wall":
            blast_wall(s, area)
        else:
            hesco_wall(s, area)
        return
    if k == "sandbags":
        sandbag_stack(s, area)
        return
    if k == "gate":
        gate(s, area)
        return
    if k == "booth":
        booth(s, area)
        return
    if k == "well":
        mesh = bucket(area, "Props")
        t = 0.2
        box(mesh, x0, x1, 0, y1 - 0.12, z0, z1, M["sandstone"], skip=("py",), colf=lambda pt: (grime(pt[1], None),) * 3)
        for (a, b, c, d) in ((x0, x1, z0, z0 + t), (x0, x1, z1 - t, z1), (x0, x0 + t, z0 + t, z1 - t), (x1 - t, x1, z0 + t, z1 - t)):
            box(mesh, a, b, y1 - 0.12, y1, c, d, M["sandstone"], cols=[(0.95, 0.93, 0.9)] * 4)
        quad(mesh, [(x0 + t, y1 - 0.1, z1 - t), (x1 - t, y1 - 0.1, z1 - t), (x1 - t, y1 - 0.1, z0 + t), (x0 + t, y1 - 0.1, z0 + t)],
             M["trim"], uvs=atlas_uv(T["soil"]))
        return
    if k == "planter":
        mesh = bucket(area, "Props")
        box(mesh, x0, x1, 0, y1 - 0.1, z0, z1, M["concrete"], skip=("py",), colf=lambda pt: (grime(pt[1], None),) * 3)
        for (a, b, c, d) in ((x0, x1, z0, z0 + 0.12), (x0, x1, z1 - 0.12, z1), (x0, x0 + 0.12, z0, z1), (x1 - 0.12, x1, z0, z1)):
            box(mesh, a, b, y1 - 0.1, y1, c, d, M["sandstone"], cols=[(0.95, 0.93, 0.9)] * 4)
        u = x0 + 0.12
        while u < x1 - 0.12 - 1e-3:
            u1 = min(x1 - 0.12, u + 0.56)
            quad(mesh, [(u, y1 - 0.06, z1 - 0.12), (u1, y1 - 0.06, z1 - 0.12), (u1, y1 - 0.06, z0 + 0.12), (u, y1 - 0.06, z0 + 0.12)],
                 M["trim"], uvs=atlas_sub(T["soil"], 0, (u1 - u) / 0.56, 0, 1))
            u = u1
        return
    if k == "pillar":
        mesh = bucket(area, "Props")
        i = 0.05
        box(mesh, x0, x1, 0, 0.45, z0, z1, M["sandstone"], skip=("py",), colf=lambda pt: (grime(pt[1], None),) * 3)
        box(mesh, x0, x1, 0.45, 0.55, z0, z1, M["sandstone"], skip=("ny",), cols=[(0.9, 0.88, 0.84)] * 4)
        box(mesh, x0 + i, x1 - i, 0.55, y1 - 0.4, z0 + i, z1 - i, M["sandstone"], skip=("py", "ny"))
        box(mesh, x0, x1, y1 - 0.4, y1, z0, z1, M["sandstone"], bottom=True, cols=[(0.94, 0.92, 0.88)] * 4)
        return
    if k in ("spawn-wall", "office-wall"):
        mesh = bucket(area, "Buildings")
        tint = (1, 0.95, 0.88) if k == "spawn-wall" else (1, 0.98, 0.94)
        cap = 0.12
        top_y = y1
        box(mesh, x0, x1, 0, min(0.55, top_y), z0, z1, M["sandstone"], skip=("py",) if top_y > 0.55 else (),
            colf=lambda pt: (grime(pt[1], None),) * 3)
        if top_y > 0.55:
            inner_top = top_y - cap if top_y - cap > 0.55 else top_y
            bot = 0.55 if y0 < 0.55 else y0
            if y0 >= 0.55:  # window head above the opening
                box(mesh, x0, x1, y0, top_y - cap, z0, z1, M["plaster"], skip=(), bottom=True,
                    colf=lambda pt: mul(tint, grime(pt[1], top_y)))
            else:
                box(mesh, x0, x1, 0.55, top_y - cap, z0, z1, M["plaster"], skip=("ny",),
                    colf=lambda pt: mul(tint, grime(pt[1], top_y)))
            box(mesh, x0, x1, top_y - cap, top_y, z0, z1, M["sandstone"], cols=[(0.95, 0.93, 0.9)] * 4)
        return
    print("UNDRESSED", s["id"], k)


def blast_wall(s, area):
    """Cast-concrete blast-wall segments (custom): two 1.1 m units filling the 1 m deep box, a
    recessed joint between them, a chamfered cap and lifting loops (8 cm above the top)."""
    mesh = bucket(area, "Military Sand Walls and Barriers")
    x0, x1, y0, y1, z0, z1 = sb(s)
    long_x = (x1 - x0) >= (z1 - z0)
    L_ = (x1 - x0) if long_x else (z1 - z0)
    n = max(1, round(L_ / 1.1))
    seg = L_ / n
    gcol = lambda pt: mul((1.0, 0.95, 0.86), grime(pt[1], None))
    for q in range(n):
        a = (x0 if long_x else z0) + q * seg
        b = a + seg
        ja, jb = a + (0.025 if q else 0), b - (0.025 if q < n - 1 else 0)
        if long_x:
            box(mesh, ja, jb, 0, y1 - 0.12, z0, z1, M["concrete"], skip=("py",), colf=gcol)
            box(mesh, ja + 0.04, jb - 0.04, y1 - 0.12, y1, z0 + 0.04, z1 - 0.04, M["concrete"], colf=gcol)
            box(mesh, ja, jb, y1 - 0.16, y1 - 0.12, z0, z1, M["concrete"], skip=("ny",), colf=gcol)
        else:
            box(mesh, x0, x1, 0, y1 - 0.12, ja, jb, M["concrete"], skip=("py",), colf=gcol)
            box(mesh, x0 + 0.04, x1 - 0.04, y1 - 0.12, y1, ja + 0.04, jb - 0.04, M["concrete"], colf=gcol)
        # joint filler (dark, recessed 6 cm)
        if q:
            if long_x:
                box(mesh, a - 0.025, a + 0.025, 0, y1 - 0.12, z0 + 0.06, z1 - 0.06, M["concrete"], skip=("py", "px", "nx"),
                    cols=[(0.45, 0.42, 0.38)] * 4)
        # lifting loops
        cxl = (a + b) / 2
        for off in (-0.25, 0.25):
            lx, lz = (cxl + off, s["z"]) if long_x else (s["x"], cxl + off)
            tube(mesh, [(lx - 0.06, y1, lz), (lx - 0.05, y1 + 0.07, lz), (lx + 0.05, y1 + 0.07, lz), (lx + 0.06, y1, lz)], 0.012,
                 M["metal"], sides=4)


def gate(s, area):
    """Gate halves: a sandstone pier with a heavy timber door leaf swung open and recessed into
    each face (inside the box) and a timber post on the gap side; a beam spans the gap above
    head height (gate_beams)."""
    mesh = bucket(area, "Props")
    x0, x1, y0, y1, z0, z1 = sb(s)
    gap_px = s["id"].endswith("-w")  # the walkable gap is on the +x side of the west half
    px0, px1 = (x0, x1 - 0.18) if gap_px else (x0 + 0.18, x1)
    tx0, tx1 = (x1 - 0.18, x1) if gap_px else (x0, x0 + 0.18)
    wood = [(0.42, 0.34, 0.26)] * 4
    box(mesh, tx0, tx1, 0, y1, z0, z1, M["wood"], cols=wood, skip=("nx",) if gap_px else ("px",))
    inner = "px" if gap_px else "nx"
    ytop = y1 - 0.25
    gcol = lambda pt: (grime(pt[1], None),) * 3
    box(mesh, px0, px1, 0, ytop, z0, z1, M["sandstone"], skip=("py", "pz", "nz", inner), colf=gcol)
    box(mesh, px0, px1, ytop, y1, z0, z1, M["sandstone"], skip=(inner,), cols=[(0.95, 0.93, 0.9)] * 4)
    xa, xb = px0 + 0.12, px1 - 0.12
    ly0, ly1 = 0.06, ytop - 0.2
    for zf, sign in ((z0, -1), (z1, 1)):
        za = zf - sign * 0.07
        for (a, b, c, d) in ((px0, xa, 0, ytop), (xb, px1, 0, ytop), (xa, xb, ly1, ytop), (xa, xb, 0, ly0)):
            pts = [(a, c, zf), (b, c, zf), (b, d, zf), (a, d, zf)] if sign > 0 else [(b, c, zf), (a, c, zf), (a, d, zf), (b, d, zf)]
            quad(mesh, pts, M["sandstone"], cols=[gcol(q) for q in pts])
        pts = [(xa, ly0, za), (xb, ly0, za), (xb, ly1, za), (xa, ly1, za)]
        quad(mesh, pts if sign > 0 else [pts[1], pts[0], pts[3], pts[2]], M["trim"], uvs=atlas_uv(T["plankdoor"]),
             cols=[(0.95, 0.9, 0.85)] * 4)
        for xe, right in ((xa, True), (xb, False)):
            pz = [(xe, ly0, zf), (xe, ly0, za), (xe, ly1, za), (xe, ly1, zf)]
            if (right and sign < 0) or (not right and sign > 0):
                pz = pz[::-1]
            quad(mesh, pz, M["wood"], cols=wood)
        ceil_ = [(xa, ly1, zf), (xb, ly1, zf), (xb, ly1, za), (xa, ly1, za)]
        quad(mesh, ceil_[::-1] if sign > 0 else ceil_, M["wood"], cols=[(0.35, 0.3, 0.25)] * 4)
        sill_ = [(xa, ly0, zf), (xb, ly0, zf), (xb, ly0, za), (xa, ly0, za)]
        quad(mesh, sill_ if sign > 0 else sill_[::-1], M["sandstone"], cols=[(0.8, 0.78, 0.74)] * 4)
        # iron hinge straps across the leaf (2 mm proud of the leaf, inside the recess)
        for hy in (ly0 + 0.5, ly1 - 0.5):
            zh = za + sign * 0.002
            ph = [(xa, hy - 0.04, zh), (xb, hy - 0.04, zh), (xb, hy + 0.04, zh), (xa, hy + 0.04, zh)]
            quad(mesh, ph if sign > 0 else [ph[1], ph[0], ph[3], ph[2]], M["metal"], cols=[(0.2, 0.19, 0.18)] * 4)
    GATE_HALVES.append(s)


GATE_HALVES = []


def gate_beams():
    """Timber beam over each gate gap (above 3.2 m: over walkable floor but above every player)."""
    pairs = [("long-door-w", "long-door-e"), ("mid-door-w", "mid-door-e")]
    by = {s["id"]: s for s in SOLIDS}
    for a, b in pairs:
        sa, sb_ = by[a], by[b]
        area = area_at((sa["x"] + sb_["x"]) / 2, sa["z"])
        mesh = bucket(area, "Props")
        xa0 = sa["x"] - sa["w"] / 2
        xb1 = sb_["x"] + sb_["w"] / 2
        z0, z1 = sa["z"] - sa["d"] / 2, sa["z"] + sa["d"] / 2
        top = sa["y"] + sa["h"] / 2
        box(mesh, xa0, xb1, top, top + 0.32, z0 + 0.05, z1 - 0.05, M["wood"], bottom=True, cols=[(0.42, 0.34, 0.26)] * 4)


def booth(s, area):
    mesh = bucket(area, "Props")
    x0, x1, y0, y1, z0, z1 = sb(s)
    box(mesh, x0, x1, 0, 0.35, z0, z1, M["sandstone"], skip=("py",), colf=lambda pt: (grime(pt[1], None),) * 3)
    box(mesh, x0, x1, 0.35, y1 - 0.2, z0, z1, M["plaster"], skip=("ny", "py"), colf=lambda pt: mul((1, 0.94, 0.86), grime(pt[1], None)))
    box(mesh, x0, x1, y1 - 0.2, y1, z0, z1, M["wood"], cols=[(0.5, 0.42, 0.32)] * 4)
    # windows on three sides (recessed 2 cm look via a darker glass quad 5 mm in front)
    for face in ("px", "pz", "nz"):
        if face == "px":
            pts = [(x1 + 0.004, 1.1, z1 - 0.25), (x1 + 0.004, 1.1, z0 + 0.25), (x1 + 0.004, 1.9, z0 + 0.25), (x1 + 0.004, 1.9, z1 - 0.25)]
        elif face == "pz":
            pts = [(x0 + 0.25, 1.1, z1 + 0.004), (x1 - 0.25, 1.1, z1 + 0.004), (x1 - 0.25, 1.9, z1 + 0.004), (x0 + 0.25, 1.9, z1 + 0.004)]
        else:
            pts = [(x1 - 0.25, 1.1, z0 - 0.004), (x0 + 0.25, 1.1, z0 - 0.004), (x0 + 0.25, 1.9, z0 - 0.004), (x1 - 0.25, 1.9, z0 - 0.004)]
        quad(mesh, pts, M["trim"], uvs=atlas_uv(T["window"]))
    pts = [(x0 - 0.004, 0.36, z0 + 0.3), (x0 - 0.004, 0.36, z1 - 0.3), (x0 - 0.004, 2.1, z1 - 0.3), (x0 - 0.004, 2.1, z0 + 0.3)]
    quad(mesh, pts, M["trim"], uvs=atlas_uv(T["door"]), cols=[(0.45, 0.6, 0.6)] * 4)


for s in SOLIDS:
    dress_solid(s)
gate_beams()


def dress_vehicles():
    """Vehicles and the forklift: the model fills the placement rectangle (layout.py VEHICLES), the
    layout's boxes are measured on it. The underside between the wheels is closed by a dark chassis
    fill exactly where the body box reaches the ground; the forklift carries a pallet load (its
    'load' box) and a plated overhead guard (its 'roof' box)."""
    tints = {"a-truck": (0.92, 0.82, 0.62), "b-truck": None, "banana-car": (0.27, 0.23, 0.2), "long-car": (0.95, 0.88, 0.7)}
    by = {s_["id"]: s_ for s_ in SOLIDS}
    for vid, v in L["vehicles"].items():
        x0, x1, z0, z1, h = v["x0"], v["x1"], v["z0"], v["z1"], v["h"]
        pseudo = {"id": vid, "x": (x0 + x1) / 2, "y": h / 2, "z": (z0 + z1) / 2, "w": x1 - x0, "h": h, "d": z1 - z0}
        area = area_at(pseudo["x"], pseudo["z"])
        F = lambda a0, a1, b0, b1, c0, c1: (x0 + (x1 - x0) * a0, x0 + (x1 - x0) * a1, h * b0, h * b1, z0 + (z1 - z0) * c0, z0 + (z1 - z0) * c1)
        dark = [(0.07, 0.065, 0.06)] * 4
        if v["model"] == "forklift":
            fit("forklift", pseudo, area, "Industrial Equipment", inset=0.03)
            m = bucket(area, "Industrial Equipment")
            ld = by[vid + "-load"]
            lx0, lx1, ly0, ly1, lz0, lz1 = sb(ld)
            box(m, lx0, lx1, ly0 + 0.13, ly0 + 0.26, lz0, lz1, M["wood"], cols=[(0.62, 0.52, 0.4)] * 4, bottom=True)
            for (yy, hh_) in ((ly0 + 0.26, 0.62), (ly0 + 0.88, 0.52), (ly0 + 1.4, ly1 - ly0 - 1.4)):
                place("crate", area, "Industrial Equipment", (lx0 + lx1) / 2, yy, (lz0 + lz1) / 2, lx1 - lx0 - 0.02, hh_, lz1 - lz0 - 0.02, 0.0)
            rf = by[vid + "-roof"]
            rx0, rx1, ry0, ry1, rz0, rz1 = sb(rf)
            box(m, rx0 + 0.01, rx1 - 0.01, ry0 + 0.01, ry1 - 0.01, rz0 + 0.01, rz1 - 0.01, M["metal"], bottom=True,
                cols=[(0.22, 0.21, 0.2)] * 4)
            # enclosed cab: dark glazing in a painted frame on all four sides (inside the cab box)
            cb = by[vid + "-cab"]
            cx0, cx1, cy0, cy1, cz0, cz1 = sb(cb)
            box(m, cx0, cx1, cy0, cy1, cz0, cz1, M["metal"], skip=("py",), cols=[(0.62, 0.55, 0.3)] * 4)
            e = 0.004
            glass = [
                [(cx1 + e, cy0 + 0.1, cz1 - 0.06), (cx1 + e, cy0 + 0.1, cz0 + 0.06), (cx1 + e, cy1 - 0.06, cz0 + 0.06), (cx1 + e, cy1 - 0.06, cz1 - 0.06)],
                [(cx0 - e, cy0 + 0.1, cz0 + 0.06), (cx0 - e, cy0 + 0.1, cz1 - 0.06), (cx0 - e, cy1 - 0.06, cz1 - 0.06), (cx0 - e, cy1 - 0.06, cz0 + 0.06)],
                [(cx0 + 0.06, cy0 + 0.1, cz1 + e), (cx1 - 0.06, cy0 + 0.1, cz1 + e), (cx1 - 0.06, cy1 - 0.06, cz1 + e), (cx0 + 0.06, cy1 - 0.06, cz1 + e)],
                [(cx1 - 0.06, cy0 + 0.1, cz0 - e), (cx0 + 0.06, cy0 + 0.1, cz0 - e), (cx0 + 0.06, cy1 - 0.06, cz0 - e), (cx1 - 0.06, cy1 - 0.06, cz0 - e)],
            ]
            for g_ in glass:
                quad(m, g_, M["trim"], uvs=atlas_uv(T["window"]), cols=[(0.8, 0.8, 0.8)] * 4)
            fx0, fx1, _, _, fz0, fz1 = F(0.25, 0.75, 0, 0, 0.3125, 0.9583)
            box(m, fx0, fx1, 0.02, 0.25, fz0, fz1, M["trim"], skip=("py",), cols=dark)
        elif v["model"] == "mrap":
            fit("mrap", pseudo, area, "Vehicles", tint=tints.get(vid))
            m = bucket(area, "Vehicles")
            # dark chassis between the wheel tracks, and stowage lockers between the front and
            # middle wheels on both sides (fills the body box's sides below the hull)
            fx0, fx1, _, fy1, fz0, fz1 = F(0.2333, 0.8, 0, 0.279, 0.0833, 0.9667)
            box(m, fx0, fx1, 0.02, fy1, fz0, fz1, M["trim"], skip=("py",), cols=dark)
            for a0, a1 in ((0.02, 0.2333), (0.8, 0.98)):
                lx0, lx1, ly0, ly1, lz0, lz1 = F(a0, a1, 0.039, 0.386, 0.27, 0.5967)
                box(m, lx0, lx1, ly0, ly1, lz0, lz1, M["metal"], bottom=True, cols=[(0.24, 0.27, 0.2)] * 4)
        else:
            fit("jeep", pseudo, area, "Vehicles", tint=tints.get(vid))


dress_vehicles()

# Office roof (Police guard office on B: walls 4 m, a slab on top, timber ceiling inside).
ox0, ox1, oz0, oz1 = OFFICE
oarea = area_at(22.5, -22)
om = bucket(oarea, "Interior Architecture")
box(om, ox0, ox1, 4.0, 4.28, oz0, oz1, M["concrete"], bottom=False, cols=[(0.85, 0.82, 0.78)] * 4)
quad(om, [(ox0 + 0.4, 3.98, oz0 + 0.4), (ox1 - 0.4, 3.98, oz0 + 0.4), (ox1 - 0.4, 3.98, oz1 - 0.4), (ox0 + 0.4, 3.98, oz1 - 0.4)],
     M["wood"], cols=[(0.55, 0.45, 0.35)] * 4)
for q in range(4):
    zc = oz0 + 0.4 + (q + 0.5) * (oz1 - oz0 - 0.8) / 4
    box(om, ox0 + 0.4, ox1 - 0.4, 3.8, 3.98, zc - 0.07, zc + 0.07, M["wood"], bottom=True, cols=[(0.4, 0.32, 0.25)] * 4)

# Library models set into facade recesses: metal doors, roller doors, electrical cabinets.
for (name, fr, c, w_, y0_, h_, wc, dpt, area) in MODEL_PLACE:
    x, y, z = fr.P(c, 0.0, wc)
    nx, nz = fr.nv
    yaw = {(0, 1): 0.0, (0, -1): math.pi, (1, 0): math.pi / 2, (-1, 0): -math.pi / 2}[(nx, nz)]
    place(name, area, "Props", x, y0_, z, w_, h_, dpt, yaw)

for p in PIECES:
    if p.setback:
        perimeter(p)


# =============================================================================== ground
def ground_mat(name):
    if name in ("t-west-road", "t-east-road", "a-long", "ct-to-b", "ct-to-a"):
        return "asphalt"
    if name in ("site-b", "b-connector", "ct-spawn"):
        return "pavement"
    if name in ("site-a", "mid-plaza", "t-mid-upper", "t-mid-jog", "a-connector", "ct-mid"):
        return "flagstone"
    if name in ("b-main-top", "b-main-bend1", "t-mid-lower", "b-main-mid"):
        return "dirt"
    return "yard"


GROUND = {}
for i in range(NG):
    for j in range(NG):
        if cell_owner(i, j) is None:
            x, z = cx(i) + G / 2, cx(j) + G / 2
            GROUND[(i, j)] = ground_mat(open_rect_at(x, z))


def value_noise(x, z, scale, seed):
    """Smooth 2D value noise (bilinear on a hashed lattice)."""
    gx, gz = x / scale, z / scale
    x0, z0 = math.floor(gx), math.floor(gz)
    fx, fz = gx - x0, gz - z0
    fx, fz = fx * fx * (3 - 2 * fx), fz * fz * (3 - 2 * fz)
    v = lambda a, b: H("vn", seed, a, b)
    return (v(x0, z0) * (1 - fx) + v(x0 + 1, z0) * fx) * (1 - fz) + (v(x0, z0 + 1) * (1 - fx) + v(x0 + 1, z0 + 1) * fx) * fz


def ground_col(x, z, mat):
    n1 = value_noise(x, z, 6.0, 1)
    n2 = value_noise(x, z, 2.2, 2)
    g = 0.86 + 0.16 * n1 + 0.06 * n2
    # darker near walls (ambient occlusion-ish): distance to the nearest solid cell
    occl = 1.0
    for dd in (0.5, 1.0):
        for (dx, dz) in ((dd, 0), (-dd, 0), (0, dd), (0, -dd)):
            if is_solid_pt(x + dx, z + dz):
                occl = min(occl, 0.88 + 0.08 * (dd - 0.5) / 0.5)
    warm = (1.0, 0.97, 0.92) if mat in ("asphalt", "yard") else (1, 1, 1)
    return (g * occl * warm[0], g * occl * warm[1], g * occl * warm[2])


gmesh = bucket("Ground and Road Surfaces", "Ground")
# Greedy rectangles per material on the 0.5 m grid, emitted as ≤ 2 m quads (vertex colour noise).
remaining = dict(GROUND)
while remaining:
    (i0, j0), mat = min(remaining.items(), key=lambda kv: (kv[0][1], kv[0][0]))
    i1 = i0
    while remaining.get((i1 + 1, j0)) == mat:
        i1 += 1
    j1 = j0
    while all(remaining.get((i, j1 + 1)) == mat for i in range(i0, i1 + 1)):
        j1 += 1
    for i in range(i0, i1 + 1):
        for j in range(j0, j1 + 1):
            del remaining[(i, j)]
    xa, xb, za, zb = cx(i0), cx(i1 + 1), cx(j0), cx(j1 + 1)
    nxs = max(1, math.ceil((xb - xa) / 2.0))
    nzs = max(1, math.ceil((zb - za) / 2.0))
    for a in range(nxs):
        for b in range(nzs):
            qa, qb = xa + (xb - xa) * a / nxs, xa + (xb - xa) * (a + 1) / nxs
            ra, rb = za + (zb - za) * b / nzs, za + (zb - za) * (b + 1) / nzs
            pts = [(qa, 0.0, rb), (qb, 0.0, rb), (qb, 0.0, ra), (qa, 0.0, ra)]
            quad(gmesh, pts, M[mat], cols=[ground_col(p[0], p[2], mat) for p in pts])

# Ground outside the arena (under the exterior ring) and the distant desert floor.
EXT = 70.0
for (xa, xb, za, zb) in ((-EXT, EXT, -EXT, -HD), (-EXT, EXT, HD, EXT), (-EXT, -HW, -HD, HD), (HW, EXT, -HD, HD)):
    nxs, nzs = max(1, int((xb - xa) // 10)), max(1, int((zb - za) // 10))
    for a in range(nxs):
        for b in range(nzs):
            qa, qb = xa + (xb - xa) * a / nxs, xa + (xb - xa) * (a + 1) / nxs
            ra, rb = za + (zb - za) * b / nzs, za + (zb - za) * (b + 1) / nzs
            pts = [(qa, -0.02, rb), (qb, -0.02, rb), (qb, -0.02, ra), (qa, -0.02, ra)]
            quad(bucket(exterior_area((qa + qb) / 2, (ra + rb) / 2), "Ground"), pts, M["dirt"],
                 cols=[ground_col(q_[0], q_[2], "dirt") for q_ in pts])


# =============================================================================== decals
def decal(area, x, z, w, d, cell, yaw=0.0, y=0.012, tint=(1, 1, 1), uvs=None):
    """Flat ground decal (alpha-blended, no shadow), centred at (x, z), w × d, rotated by yaw."""
    c, s_ = math.cos(yaw), math.sin(yaw)
    corners = [(-w / 2, d / 2), (w / 2, d / 2), (w / 2, -d / 2), (-w / 2, -d / 2)]
    pts = [(x + a * c - b * s_, y, z + a * s_ + b * c) for a, b in corners]
    uv = uvs or atlas_uv(DC[cell])
    quad(bucket(area, "Decals"), pts, M["decal"], uvs=uv, cols=[tint] * 4)


# Sand drifting against every exterior wall base (and inside covered passages, lighter).
for p in PIECES:
    if p.setback:
        continue
    fr = p.fr
    seg = 2.0
    n = max(1, int(round(p.L / seg)))
    for q in range(n):
        u0, u1 = q * p.L / n, (q + 1) * p.L / n
        if any(go[0] < (u0 + u1) / 2 < go[1] for go in []):
            continue
        wdt = 0.55 + 0.35 * H("sd", q, *p.key)
        pts = [fr.P(u0, 0.01, wdt), fr.P(u1, 0.01, wdt), fr.P(u1, 0.01, -WI), fr.P(u0, 0.01, -WI)]
        a = H("sdu", q, *p.key) * 0.5
        uv = atlas_sub(DC["sandedge"], a, a + 0.5, 0, 1)
        if p.cover:
            continue
        quad(bucket(p.area, "Decals"), pts, M["decal"], uvs=uv, cols=[(0.9, 0.86, 0.8)] * 4)

# Bombsite letters on the ground, plant-zone outline paint, and wall letters.
for site, r in SITES.items():
    cxs, czs = (r["x0"] + r["x1"]) / 2, (r["z0"] + r["z1"]) / 2
    area = "Bombsite A" if site == "A" else "Bombsite B"
    decal(area, cxs, czs, 3.6, 3.6, "letter" + site, yaw=0.0, y=0.015, tint=(0.86, 0.36, 0.22))
    # dashed outline
    for (xa, za, xb, zb) in ((r["x0"], r["z0"], r["x1"], r["z0"]), (r["x1"], r["z0"], r["x1"], r["z1"]),
                             (r["x1"], r["z1"], r["x0"], r["z1"]), (r["x0"], r["z1"], r["x0"], r["z0"])):
        length = math.hypot(xb - xa, zb - za)
        nseg = int(length // 1.4)
        for q in range(nseg):
            t = (q + 0.5) / nseg
            mx, mz = xa + (xb - xa) * t, za + (zb - za) * t
            yaw = math.atan2(zb - za, xb - xa) - math.pi / 2
            decal(area, mx, mz, 0.16, 0.8, "line", yaw=yaw, y=0.014, tint=(0.92, 0.88, 0.8))

# Road markings: dashed centre lines, tyre tracks, oil stains, manholes, drains, cracks, sand.
for t in range(-36, -10, 3):
    decal("A Long", t + 0.5, 27.5, 0.14, 1.4, "line", yaw=math.pi / 2, tint=(0.95, 0.88, 0.62))
for t in range(17, 37, 3):
    decal("B Main", t + 0.5, 36.0, 0.14, 1.4, "line", yaw=math.pi / 2, tint=(0.95, 0.88, 0.62))
for t in range(-12, 22, 3):
    decal("A Long", -34.0, t + 0.5, 0.14, 1.4, "line", tint=(0.95, 0.88, 0.62))
rng = random.Random(606)
SCATTER = [("tyres", 1.6, 4.0, 0.7), ("oil", 1.4, 1.4, 0.5), ("cracks", 2.4, 2.4, 0.8), ("sandpatch", 3.0, 2.0, 0.9),
           ("pebbles", 1.6, 1.6, 0.8), ("stain", 2.4, 2.4, 0.8)]
cells = sorted(GROUND)
for q in range(170):
    i, j = cells[rng.randrange(len(cells))]
    x, z = cx(i) + G / 2, cx(j) + G / 2
    kind, w_, d_, a = SCATTER[rng.randrange(len(SCATTER))]
    mat = GROUND[(i, j)]
    if kind in ("tyres", "oil") and mat not in ("asphalt", "yard", "dirt"):
        kind, w_, d_ = "cracks", 2.2, 2.2
    if kind == "sandpatch" and mat == "dirt":
        continue
    if cover_at(x, z) and kind in ("sandpatch",):
        continue
    sc = 0.7 + 0.6 * rng.random()
    decal(area_at(x, z), x, z, w_ * sc, d_ * sc, kind, yaw=rng.random() * math.tau, y=0.008 + 0.0005 * (q % 7))
for q in range(26):
    i, j = cells[rng.randrange(len(cells))]
    x, z = cx(i) + G / 2, cx(j) + G / 2
    if GROUND[(i, j)] in ("asphalt", "yard", "pavement"):
        decal(area_at(x, z), x, z, 0.9, 0.9, rng.choice(["drain", "manhole"]), yaw=0.0, y=0.006)

# Navigation paint on walls: big "A"/"B" letters and arrows at decision points (plain letters).
WALL_SIGNS = [  # (x, y, z, wall normal, decal cell, size, rotation: 0 = arrow up, -pi/2 = to the right)
    (-10.0, 2.5, -8.0, "+x", "letterA", 1.3, 0), (-10.0, 1.35, -8.0, "+x", "arrow", 0.9, -math.pi / 2),
    (10.0, 2.5, -8.0, "-x", "letterB", 1.3, 0), (10.0, 1.35, -8.0, "-x", "arrow", 0.9, math.pi / 2),
    (-38.0, 3.6, -25.0, "+x", "letterA", 2.6, 0), (36.0, 3.6, -23.5, "-x", "letterB", 2.6, 0),
    (-5.0, 2.5, 31.0, "+z", "letterA", 1.1, 0), (-5.0, 1.45, 31.0, "+z", "arrow", 0.85, math.pi / 2),
    (12.0, 2.5, 31.0, "+z", "letterB", 1.2, 0), (12.0, 1.4, 31.0, "+z", "arrow", 0.9, -math.pi / 2),
    (-7.5, 2.6, -40.0, "+z", "letterA", 1.2, 0), (-7.5, 1.5, -40.0, "+z", "arrow", 0.9, math.pi / 2),
    (7.5, 2.6, -40.0, "+z", "letterB", 1.2, 0), (7.5, 1.5, -40.0, "+z", "arrow", 0.9, -math.pi / 2),
]
for (x, y, z, n, cell, size, rot) in WALL_SIGNS:
    nx, nz = DIRS[n]
    # 5 mm in front of the wall plane (4 cm inside the boundary)
    off = -WI + 0.005
    px, pz = x + nx * off, z + nz * off
    rx, rz = {"+z": (1, 0), "-z": (-1, 0), "+x": (0, -1), "-x": (0, 1)}[n]
    hs = size / 2
    corners = [(-hs, -hs), (hs, -hs), (hs, hs), (-hs, hs)]
    c, s_ = math.cos(rot), math.sin(rot)
    pts = []
    for a, b in corners:
        a2, b2 = a * c - b * s_, a * s_ + b * c
        pts.append((px + rx * a2, y + b2, pz + rz * a2))
    if is_solid_pt(x - nx * 0.25, z - nz * 0.25):
        quad(bucket(area_at(x + nx, z + nz), "Decals"), pts, M["decal"], uvs=atlas_uv(DC[cell]), cols=[(0.78, 0.3, 0.18)] * 4)
    else:
        print("SIGN-NOT-ON-WALL", x, z, n, cell)


# =============================================================================== exterior ring
def ext_building(x0, x1, z0, z1, h, seed):
    """Low-cost background building beyond the playable edge: plastered mass, trim-atlas windows
    as flat panels, parapet; terracotta roof on some."""
    area = exterior_area((x0 + x1) / 2, (z0 + z1) / 2)
    mesh = bucket(area, "Buildings")
    mat = pick([M["plaster"], M["plaster"], M["adobe"], M["sandstone"]], "em", seed)
    tint = pick(TINT["plaster"], "et", seed)
    box(mesh, x0, x1, 0, h, z0, z1, mat, top=M["concrete"], colf=lambda pt: mul(tint, grime(pt[1], h)))
    # windows on all four faces (2 cm proud, flat atlas panels)
    for face in ("px", "nx", "pz", "nz"):
        horiz = face in ("pz", "nz")
        a0, a1 = (x0, x1) if horiz else (z0, z1)
        span = a1 - a0
        nb = max(1, int(span // 3.2))
        for q in range(nb):
            c = a0 + (q + 0.5) * span / nb
            for fy in (1.2, 4.6, 8.0, 11.4):
                if fy + 1.5 > h - 0.6 or H("ew", seed, face, q, fy) < 0.3:
                    continue
                cell = pick(["window", "shutter", "grille", "window"], "ewc", seed, face, q, fy)
                tint_w = pick(PAINT, "ewp", seed) if cell == "shutter" else (1, 1, 1)
                if face == "px":
                    pts = [(x1 + 0.02, fy, c + 0.55), (x1 + 0.02, fy, c - 0.55), (x1 + 0.02, fy + 1.5, c - 0.55), (x1 + 0.02, fy + 1.5, c + 0.55)]
                elif face == "nx":
                    pts = [(x0 - 0.02, fy, c - 0.55), (x0 - 0.02, fy, c + 0.55), (x0 - 0.02, fy + 1.5, c + 0.55), (x0 - 0.02, fy + 1.5, c - 0.55)]
                elif face == "pz":
                    pts = [(c - 0.55, fy, z1 + 0.02), (c + 0.55, fy, z1 + 0.02), (c + 0.55, fy + 1.5, z1 + 0.02), (c - 0.55, fy + 1.5, z1 + 0.02)]
                else:
                    pts = [(c + 0.55, fy, z0 - 0.02), (c - 0.55, fy, z0 - 0.02), (c - 0.55, fy + 1.5, z0 - 0.02), (c + 0.55, fy + 1.5, z0 - 0.02)]
                quad(mesh, pts, M["trim"], uvs=atlas_uv(T[cell]), cols=[tint_w] * 4)
    # parapet
    box(mesh, x0, x1, h, h + 0.7, z0, z0 + 0.25, mat, cols=[tint] * 4)
    box(mesh, x0, x1, h, h + 0.7, z1 - 0.25, z1, mat, cols=[tint] * 4)
    box(mesh, x0, x0 + 0.25, h, h + 0.7, z0, z1, mat, cols=[tint] * 4)
    box(mesh, x1 - 0.25, x1, h, h + 0.7, z0, z1, mat, cols=[tint] * 4)


erng = random.Random(77)
# A ring of blocks beyond each edge (the playable edge's own 8 m blocks stand in front of them).
for side in ("n", "s", "w", "e"):
    t = -HW - 2
    while t < HW + 2:
        w_ = erng.uniform(6, 12)
        dpt = erng.uniform(7, 12)
        gap = erng.uniform(0.0, 3.0)
        h = erng.choice([9.5, 11.0, 12.5, 14.0, 10.0, 16.0])
        off = HD + 1.5 + erng.uniform(0, 4)
        a, b = t, min(t + w_, HW + 8)
        if side == "n":
            ext_building(a, b, -off - dpt, -off, h, (side, t))
        elif side == "s":
            ext_building(a, b, off, off + dpt, h, (side, t))
        elif side == "w":
            ext_building(-off - dpt, -off, a, b, h, (side, t))
        else:
            ext_building(off, off + dpt, a, b, h, (side, t))
        t += w_ + gap

# Distant desert houses (library model) and a water tower as skyline landmarks.
for q in range(10):
    ang = q / 10 * math.tau + 0.2
    r = 74 + erng.uniform(0, 14)
    x, z = math.cos(ang) * r, math.sin(ang) * r
    place("house", exterior_area(x, z), "Buildings", x, 0, z, 13.9 * 1.0, 14.1 * 1.0, 21.1 * 1.0, yaw=erng.random() * math.tau)


def water_tower(x, z, h=18.0):
    area = exterior_area(x, z)
    mesh = bucket(area, "Industrial Equipment")
    for (dx, dz) in ((-1.6, -1.6), (1.6, -1.6), (1.6, 1.6), (-1.6, 1.6)):
        cylinder(mesh, x + dx, z + dz, 0, h, 0.18, 0.14, M["metal"], n=6, caps=False, cols=(0.5, 0.48, 0.44))
    cylinder(mesh, x, z, h, h + 4.5, 3.0, 3.0, M["metal"], n=16, cols=(0.78, 0.72, 0.6))
    cylinder(mesh, x, z, h + 4.5, h + 5.6, 3.0, 0.3, M["metal"], n=16, cols=(0.6, 0.55, 0.48))


water_tower(-58, 52)
water_tower(62, -50, 16)


# Hills on the horizon: a ring of low dunes/hills (sand, hazy in the fog).
def hills():
    mesh = bucket("Exterior Architecture N", "Terrain")
    segs, r0, r1 = 64, 110.0, 200.0
    prof = lambda a: 8 + 22 * value_noise(math.cos(a) * 40, math.sin(a) * 40, 18, 9) + 10 * value_noise(math.cos(a) * 90, math.sin(a) * 90, 9, 10)
    for i in range(segs):
        a0, a1 = i / segs * math.tau, (i + 1) / segs * math.tau
        h0, h1 = prof(a0), prof(a1)
        p = [(math.cos(a0) * r0, -0.05, math.sin(a0) * r0), (math.cos(a1) * r0, -0.05, math.sin(a1) * r0),
             (math.cos(a1) * (r0 + 45), h1, math.sin(a1) * (r0 + 45)), (math.cos(a0) * (r0 + 45), h0, math.sin(a0) * (r0 + 45))]
        uvs = [(i * 4, 0), ((i + 1) * 4, 0), ((i + 1) * 4, 6), (i * 4, 6)]
        quad(mesh, p, M["adobe"], uvs=uvs, cols=[(0.95, 0.88, 0.78)] * 2 + [(1.0, 0.92, 0.8)] * 2)
        q2 = [p[3], p[2], (math.cos(a1) * r1, h1 * 0.6, math.sin(a1) * r1), (math.cos(a0) * r1, h0 * 0.6, math.sin(a0) * r1)]
        quad(mesh, q2, M["adobe"], uvs=[(i * 4, 6), ((i + 1) * 4, 6), ((i + 1) * 4, 12), (i * 4, 12)], cols=[(1.0, 0.92, 0.8)] * 4)
        # flat desert floor between the exterior ring and the hills
        f = [(math.cos(a0) * EXT * 1.0, -0.03, math.sin(a0) * EXT), (math.cos(a1) * EXT, -0.03, math.sin(a1) * EXT),
             (math.cos(a1) * r0, -0.05, math.sin(a1) * r0), (math.cos(a0) * r0, -0.05, math.sin(a0) * r0)]
        quad(mesh, f, M["dirt"], uvs=[(i * 4, 0), ((i + 1) * 4, 0), ((i + 1) * 4, 10), (i * 4, 10)], cols=[(1, 0.95, 0.88)] * 4)


hills()


# =============================================================================== cables & roof props
def cable(area, a, b, sag=0.6):
    pts = []
    for q in range(9):
        t = q / 8
        pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t))
    tube(bucket(area, "Props"), pts, 0.018, M["metal"], sides=4)


CABLES = [((-30, 6.8, -5), (-38, 6.4, -2)), ((-30, 6.6, 8), (-38, 7.0, 12)), ((-6, 6.9, 5), (0, 6.5, 7)),
          ((10, 6.8, 20), (4, 6.6, 24)), ((28, 6.9, 22), (34, 6.6, 25)), ((22, 6.7, 6), (28, 6.9, 4)),
          ((-10, 6.8, 27), (-10, 6.6, 31)), ((2, 7.0, -20), (8, 6.8, -16)), ((-20, 6.8, -20), (-30, 6.5, -24))]
for a, b in CABLES:
    cable(area_at((a[0] + b[0]) / 2, (a[2] + b[2]) / 2), a, b)

# Rooftop clutter on the 8 m blocks (visible above the roof line): water tanks, AC boxes, masts.
for s in BUILD:
    x0, x1, z0, z1 = s["x"] - s["w"] / 2, s["x"] + s["w"] / 2, s["z"] - s["d"] / 2, s["z"] + s["d"] / 2
    if (x1 - x0) < 3 or (z1 - z0) < 3:
        continue
    best = min(OPEN, key=lambda o: math.hypot(max(o[1] - s["x"], 0, s["x"] - o[2]), max(o[3] - s["z"], 0, s["z"] - o[4])))
    area = AREA_OF[best[0]]
    nprops = int((x1 - x0) * (z1 - z0) // 40) + 1
    for q in range(min(nprops, 4)):
        px = x0 + 1.2 + H("rx", s["id"], q) * (x1 - x0 - 2.4)
        pz = z0 + 1.2 + H("rz", s["id"], q) * (z1 - z0 - 2.4)
        kind = pick(["tank", "ac", "ac", "mast", "generator", "barrel"], "rk", s["id"], q)
        mesh = bucket(area, "Props")
        if kind == "tank":
            for (dx, dz) in ((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)):
                box(mesh, px + dx - 0.04, px + dx + 0.04, 8.0, 9.0, pz + dz - 0.04, pz + dz + 0.04, M["metal"], cols=[(0.4, 0.38, 0.35)] * 4)
            cylinder(mesh, px, pz, 9.0, 10.3, 0.7, 0.7, M["metal"], n=12, cols=pick([(0.75, 0.72, 0.65), (0.42, 0.45, 0.5), (0.6, 0.6, 0.58)], "tc", s["id"], q))
        elif kind == "ac":
            box(mesh, px - 0.5, px + 0.5, 8.0, 8.75, pz - 0.35, pz + 0.35, M["trim"], cols=[(0.9, 0.88, 0.84)] * 4)
        elif kind == "mast":
            cylinder(mesh, px, pz, 8.0, 12.5, 0.05, 0.03, M["metal"], n=5, caps=False, cols=(0.35, 0.34, 0.32))
            box(mesh, px - 0.5, px + 0.5, 11.6, 11.65, pz - 0.02, pz + 0.02, M["metal"], cols=[(0.35, 0.34, 0.32)] * 4)
        elif kind == "generator":
            place("generator", area, "Industrial Equipment", px, 8.0, pz, 0.9, 1.25, 1.55, yaw=H("gy", s["id"]) * math.tau)
        else:
            place("barrel", area, "Props", px, 8.0, pz, 0.6, 0.9, 0.6, yaw=H("by", s["id"]) * math.tau)

# Truck cargo (inside the a-truck box): nothing extra — the MRAP fills it.


# =============================================================================== build objects
for (area, cat), mesh in BUCKETS.items():
    if not len(mesh):
        continue
    shadow = cat not in ("Decals",)
    print("OBJ", area, cat, len(mesh.f), len(mesh.v), flush=True)
    o = mesh.obj(f"{area}-{cat}".replace(" ", "_"), LAY.get(area, cat), shadow=shadow)

# Collision geometry (not exported): every gameplay solid as a wire box, for review in Blender.
coll = LAY.side("Collision Geometry")
cm = Mesh()
for s in SOLIDS + L["walls"]:
    x0, x1, y0, y1, z0, z1 = sb(s)
    box(cm, x0, x1, y0, y1, z0, z1, M["concrete"], bottom=True)
co = cm.obj("collision-solids", coll)
co.display_type = "WIRE"
co.hide_render = True
# Gameplay markers (not exported): bombsite zones and spawns.
mk = LAY.side("Navigation and Gameplay Markers")
for site, r in SITES.items():
    e = bpy.data.objects.new(f"bombsite-{site}", None)
    e.empty_display_type = "CUBE"
    e.location = B((r["x0"] + r["x1"]) / 2, 0.5, (r["z0"] + r["z1"]) / 2)
    e.scale = ((r["x1"] - r["x0"]) / 2, (r["z1"] - r["z0"]) / 2, 0.5)
    mk.objects.link(e)
for team, pts in L["spawns"].items():
    for q, sp in enumerate(pts):
        e = bpy.data.objects.new(f"spawn-{team}-{q}", None)
        e.empty_display_type = "SINGLE_ARROW"
        e.location = B(sp["x"], 0, sp["z"])
        e.rotation_euler = (math.pi / 2, 0, sp["yaw"])
        mk.objects.link(e)
lt = LAY.side("Lighting")
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
sun.data.energy = 4.0
sun.location = B(30, 40, 20)
sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
lt.objects.link(sun)

stats = {"pieces": len(PIECES), "runs": len(RUNS), "instances": sum(1 for o in bpy.data.objects if o.get("instance")),
         "objects": {f"{a}/{c}": len(m.f) for (a, c), m in BUCKETS.items()}}
print("BUILD", json.dumps(stats))

# Save the organised .blend before merging (the merged export is derived from it).
if BLEND:
    bpy.context.preferences.filepaths.save_version = 0  # no .blend1 backups
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND), relative_remap=True)
    bpy.ops.file.make_paths_relative()
    bpy.ops.wm.save_mainfile()


# =============================================================================== merge + export
def join_static(objs, name):
    by_mat = {}
    for o in objs:
        if o.type == "MESH" and not o.get("instance"):
            by_mat.setdefault(bool(o.get("noShadow")), []).append(o)
    for ns, group in by_mat.items():
        if len(group) > 1:
            with bpy.context.temp_override(active_object=group[0], selected_editable_objects=group):
                bpy.ops.object.join()
        group[0].name = f"{name}{'-noshadow' if ns else ''}"


def export(out):
    sc = bpy.context.scene
    for name in list(LAY.extra):
        sc.collection.children.unlink(LAY.extra[name])
    for area, (c, cats) in LAY.areas.items():
        objs = LAY.objects(area)
        join_static(objs, area.replace(" ", "_"))
        objs = LAY.objects(area)
        empty = bpy.data.objects.new(f"section-{area.replace(' ', '_')}", None)
        c.objects.link(empty)
        for o in objs:
            if o is not empty:
                o.parent = empty
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=True, export_yup=True,
                              export_texcoords=True, export_normals=True, export_materials="EXPORT",
                              export_image_format="WEBP", export_image_quality=82, export_extras=True,
                              export_animations=False, export_vertex_color="ACTIVE", export_all_vertex_colors=False,
                              use_active_scene=True)


os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
export(OUT)
print("exported", OUT)
