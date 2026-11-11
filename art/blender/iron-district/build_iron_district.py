"""
Build the IRON DISTRICT render scene in Blender from build/layout.json (layout.py), the textures
(textures.py → build/tex) and the asset library (assets.py → build/library.blend).

  python3 art/blender/iron-district/build_iron_district.py -- <out.glb> [--blend out.blend]

Rules (as Sandgate, docs/fps-bomb/IRON-DISTRICT.md "Environment"):
- Every gameplay solid is dressed INSIDE its collision box: what stops movement and bullets is what
  you see. Facades sit 4 cm inside the building blocks; windows, doors and arches are recessed into
  them; terrain fill shows as retaining walls and paving; tunnel walls, the vault ribs and the
  ceiling sit in the tunnel's solids. Above the 9.6 m blocks the architecture is free (roofs,
  storeys, the chimney, the tower crane): no eye reaches 9.6 m.
- Visual-only details that stand in walkable space are thin and high (cables ≥ 6.5 m, awnings over
  the market stalls ≥ 2.8 m above the floor, ivy cards ≤ 3 cm off a wall).
- Ramps: the visible slope runs through the back edges of its 0.15 m collision risers, so feet stand
  at most 0.15 m above it and nothing visible is ever above the collision.
- One culling section per area (glTF empties); static geometry merged per material inside it;
  repeated props are linked duplicates → GPU instances (instance_sections.mjs).
"""
import bpy, json, math, os, random, sys, hashlib, gc
gc.disable()

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from kit import B, Mesh, Layout, material, quad, box, atlas_uv, atlas_sub, cylinder, tube, TILE, lin  # noqa: E402
from mathutils import Vector, Matrix  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["build/iron-district-raw.glb"]
OUT = argv[0]
BLEND = argv[argv.index("--blend") + 1] if "--blend" in argv else None
L = json.load(open(os.path.join(HERE, "build", "layout.json")))
SOLIDS, STRUCT, BARR = L["solids"], L["structures"], L["barriers"]
REGIONS, TUNNELS, SITES, VEH = L["regions"], L["tunnels"], L["bombsites"], L["vehicles"]
LV = L["levels"]
W, D = L["arena"]["width"], L["arena"]["depth"]
HW, HD = W / 2, D / 2
TOP = 9.6
TUN_CEIL = 3.2

bpy.ops.wm.read_factory_settings(use_empty=True)
LAY = Layout("Iron District")


def H(*parts):
    """Deterministic hash in [0, 1)."""
    return int(hashlib.md5(repr(parts).encode()).hexdigest()[:8], 16) / 2 ** 32


def pick(seq, *key):
    return seq[int(H(*key) * len(seq)) % len(seq)]


# =============================================================================== materials
def emissive_copy(base, name, strength, color=(1.0, 0.86, 0.62)):
    """A copy of `base` that also emits its own albedo (tinted): the tunnel's lamp-lit masonry reads
    warm and bright in shadow without a dynamic light (glTF emissive texture × factor)."""
    m = base.copy()
    m.name = name
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tex = b.inputs["Base Color"].links[0].from_node if b.inputs["Base Color"].links else None
    if tex is not None:
        nt.links.new(tex.outputs["Color"], b.inputs["Emission Color"])
    else:
        b.inputs["Emission Color"].default_value = (*color, 1)
    b.inputs["Emission Strength"].default_value = strength
    TILE[name] = TILE[base.name]
    return m


def alpha_material(name, tex, tile=1.0, roughness=0.8, metal=0.0):
    """Alpha-tested (glTF MASK) atlas material: railings, grating, foliage, awnings."""
    m = material(name, tex, tile, roughness=roughness, metal=metal, double=True)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    t = b.inputs["Base Color"].links[0].from_node
    # The glTF exporter writes alphaMode MASK (cutoff 0.5) for alpha that passes a
    # Math "Greater Than" node; plain alpha would export as BLEND (sorting, no depth writes).
    gt = nt.nodes.new("ShaderNodeMath")
    gt.operation = "GREATER_THAN"
    gt.inputs[1].default_value = 0.5
    nt.links.new(t.outputs["Alpha"], gt.inputs[0])
    nt.links.new(gt.outputs["Value"], b.inputs["Alpha"])
    m.surface_render_method = "DITHERED"
    return m


M = {
    "plaster": material("plaster", "plaster", 2.6),
    "sandstone": material("sandstone", "sandstone", 2.4),
    "rubble": material("rubble", "rubble", 2.2),
    "brickplaster": material("brickplaster", "brickplaster", 1.8),
    "brick": material("brick", "brick", 2.0),
    "concrete": material("concrete", "concrete", 3.0),
    "pavement": material("pavement", "pavement", 2.4),
    "floor": material("floor", "floor", 3.0),
    "garage": material("garage", "garage", 3.0),
    "asphalt": material("asphalt", "asphalt", 4.0),
    "flags": material("flags", "flags", 2.2),
    "cobble": material("cobble", "cobble", 1.8),
    "planks": material("planks", "planks", 2.0),
    "rustpaint": material("rustpaint", "rustpaint", 1.6, metal=0.3),
    "rust": material("rust", "rust", 1.6, metal=0.4),
    "rooftile": material("rooftile", "rooftile", 1.5),
    "wood": material("wood", "wood", 1.2),
    "metal": material("metal", "metal", 1.2),
    "trim": material("trim", "trim", 1.0),
    "trim2": alpha_material("trim2", "trim2", 1.0),
    "decal": material("decal", "decals", 1.0, blend=True, orm=False, normal=False, roughness=0.9),
}
M["brick-tun"] = emissive_copy(M["brick"], "brick-tun", 0.32)
M["pipe"] = material("pipe", None, 1.0, roughness=0.5, metal=0.5, color=(0.24, 0.29, 0.26))
M["floor-tun"] = emissive_copy(M["floor"], "floor-tun", 0.22)
M["concrete-tun"] = emissive_copy(M["concrete"], "concrete-tun", 0.28)
lamp = material("lamp", "trim2", 1.0, roughness=0.4, normal=False, orm=False)
lb = lamp.node_tree.nodes["Principled BSDF"]
nt_ = lamp.node_tree
nt_.links.new(lb.inputs["Base Color"].links[0].from_node.outputs["Color"], lb.inputs["Emission Color"])
lb.inputs["Emission Strength"].default_value = 3.0
M["lamp"] = lamp
T = {k: i for i, k in enumerate(["window", "shutter", "door", "plankdoor", "roller", "grille", "vent", "acfront",
                                 "panel", "cabinet", "sign", "beam", "dark", "tiles", "hazard", "soil"])}
T2 = {k: i for i, k in enumerate(["factorywin", "archwin", "ironrail", "grating", "lamp", "awning", "ivy", "bougain",
                                  "warnsign", "poster", "cage", "chimney", "pipe", "glassroof", "mountain", "leaf"])}
DC = {k: i for i, k in enumerate(["letterA", "letterB", "arrow", "line", "hazardline", "oil", "sandedge", "cracks",
                                  "tyres", "drain", "manhole", "streaks", "damp", "sandpatch", "pebbles", "stain"])}
PLASTER_TINT = [(1, 1, 1), (1, 0.96, 0.88), (0.98, 0.9, 0.76), (1, 0.88, 0.72), (0.96, 0.9, 0.82), (1, 0.84, 0.70),
                (0.92, 0.86, 0.80)]
SHUTTER = [(0.40, 0.60, 0.60), (0.50, 0.55, 0.38), (0.36, 0.48, 0.62), (0.33, 0.44, 0.36), (0.62, 0.33, 0.25),
           (0.74, 0.63, 0.45)]


def grime(y, base, top):
    g = 1.0 - 0.24 * math.exp(-(y - base) / 0.7) - 0.07 * math.exp(-(y - base) / 2.5)
    if top is not None and y > top - 1.2:
        g -= 0.06 * min(1.0, (y - (top - 1.2)) / 1.2)
    return g


def mul(c, g):
    return (c[0] * g, c[1] * g, c[2] * g)


# =============================================================================== areas
def area_at(x, z, y=None):
    if y is not None and y < TUN_CEIL - 0.1:
        for _, x0, x1, z0, z1 in TUNNELS:
            if x0 - 0.6 <= x <= x1 + 0.6 and z0 - 0.6 <= z <= z1 + 0.6:
                return "Tunnel"
    if z >= 14 or (z >= 10 and x < -26):
        return "Upper Town"
    if x < -21 and z < -11:
        return "A Foundry"
    if x < -24:
        return "A Main"
    if z < -35 and x <= 20:
        return "Police Side"
    if x > 21 and z < -10:
        return "B Market"
    if x > 21:
        return "B Lower"
    return "Mid"


_buckets = {}


def bucket(area, category):
    key = (area, category)
    if key not in _buckets:
        _buckets[key] = Mesh()
    return _buckets[key]


# =============================================================================== layout queries
def region_at(x, z):
    hit = None
    for r in REGIONS:
        name, x0, x1, z0, z1, y = r
        if x0 <= x < x1 and z0 <= z < z1:
            hit = r
    return hit


def tunnel_at(x, z):
    return any(x0 <= x < x1 and z0 <= z < z1 for _, x0, x1, z0, z1 in TUNNELS)


def open_intervals(x, z):
    """Open air at (x, z): (lo, hi) bands (the region's floor up to the sky, the tunnel 0..3.2)."""
    if abs(x) > HW or abs(z) > HD:
        return []
    out = []
    r = region_at(x, z)
    if r is not None:
        out.append((r[5], 99.0))
    if tunnel_at(x, z):
        out.append((0.0, TUN_CEIL))
    return out


def sb(s):
    return s["x"] - s["w"] / 2, s["x"] + s["w"] / 2, s["y"] - s["h"] / 2, s["y"] + s["h"] / 2, s["z"] - s["d"] / 2, s["z"] + s["d"] / 2


def style_at(x, z):
    """Facade family: factory brick (the foundry, A main, the boiler house, mid's west), concrete
    warehouses (the Police side), old-town plaster and stone (market, apartments, upper town)."""
    if z < -34 and -12 < x < 22:
        return "warehouse"
    if x < -8 and z < 16:
        return "factory"
    if -10 <= x < 10 and -40 < z < 12:
        return "factory" if x < 0 else "warehouse"
    if x > 32 and z < -34:
        return "stone"
    return "oldtown"


# =============================================================================== facades
WI = 0.04  # wall plane inset behind the collision boundary


class Face:
    """One side of a solid: u along the face (to the right seen from outside), y up, w outward
    (0 = the collision boundary)."""

    def __init__(self, s, side):
        x0, x1, y0, y1, z0, z1 = sb(s)
        self.side = side
        if side == "+x":
            self.line, self.a0, self.a1, self.nv = x1, z1, z0, (1, 0)
        elif side == "-x":
            self.line, self.a0, self.a1, self.nv = x0, z0, z1, (-1, 0)
        elif side == "+z":
            self.line, self.a0, self.a1, self.nv = z1, x0, x1, (0, 1)
        else:
            self.line, self.a0, self.a1, self.nv = z0, x1, x0, (0, -1)
        self.len = abs(self.a1 - self.a0)
        self.dir = 1 if self.a1 > self.a0 else -1

    def P(self, u, y, w):
        a = self.a0 + self.dir * u
        nx, nz = self.nv
        if nx:
            return (self.line + nx * w, y, a)
        return (a, y, self.line + nz * w)

    def quad(self, mesh, u0, u1, y0, y1, w, mat, uvs=None, cols=None):
        quad(mesh, [self.P(u0, y0, w), self.P(u1, y0, w), self.P(u1, y1, w), self.P(u0, y1, w)], mat, uvs=uvs, cols=cols)

    def reveal(self, mesh, u0, u1, y0, y1, depth, mat, sill=True, head=True, cols=None):
        """The four inner sides of a recessed opening (depth into the solid)."""
        w0, w1 = -WI, -WI - depth
        P = self.P
        sides = [
            [P(u0, y0, w1), P(u0, y0, w0), P(u0, y1, w0), P(u0, y1, w1)],  # left jamb, faces +u
            [P(u1, y0, w0), P(u1, y0, w1), P(u1, y1, w1), P(u1, y1, w0)],  # right jamb, faces -u
        ]
        if head:
            sides.append([P(u0, y1, w1), P(u0, y1, w0), P(u1, y1, w0), P(u1, y1, w1)])  # head, faces down
        if sill:
            sides.append([P(u0, y0, w0), P(u0, y0, w1), P(u1, y0, w1), P(u1, y0, w0)])  # sill, faces up
        for pts in sides:
            quad(mesh, pts, mat, cols=cols)

    def opening(self, mesh, u0, u1, y0, y1, cell, depth=0.22, wall_mat=None, atlas="trim", tint=(1, 1, 1), sill=True):
        """A recessed window / door: the atlas cell at the back, the reveals in the wall material."""
        uvs = atlas_uv(T[cell] if atlas == "trim" else T2[cell])
        self.quad(mesh, u0, u1, y0, y1, -WI - depth, M[atlas], uvs=uvs, cols=[tint] * 4)
        if atlas == "trim2":  # alpha window: a dark interior behind the glass
            self.quad(mesh, u0, u1, y0, y1, -WI - depth - 0.05, M["trim"], uvs=atlas_uv(T["dark"]))
        self.reveal(mesh, u0, u1, y0, y1, depth, wall_mat or M["plaster"], sill=sill)


def runs_of(s, side, y_lo, y_hi):
    """Exposed stretches of a solid's side: [(u0, u1, base, cap)] where open air touches it between
    y_lo and y_hi (base = the floor in front; cap = the top of the exposure)."""
    f = Face(s, side)
    out, cur = [], None
    n = max(1, int(round(f.len / 0.5)))
    step = f.len / n
    for k in range(n):
        u = (k + 0.5) * step
        p = f.P(u, 0, 0.25)
        bands = [(max(lo, y_lo), min(hi, y_hi)) for lo, hi in open_intervals(p[0], p[2])]
        bands = [b for b in bands if b[1] - b[0] > 0.05]
        key = min(bands) if bands else None
        if cur and key == cur[2]:
            cur[1] = (k + 1) * step
        else:
            if cur and cur[2]:
                out.append((cur[0], cur[1], cur[2][0], cur[2][1]))
            cur = [k * step, (k + 1) * step, key]
    if cur and cur[2]:
        out.append((cur[0], cur[1], cur[2][0], cur[2][1]))
    return f, out


def facade(s, f, u0, u1, base, cap, seed):
    x, z = f.P((u0 + u1) / 2, 0, 0)[0], f.P((u0 + u1) / 2, 0, 0)[2]
    area = area_at(x, z, base + 0.5)
    mesh = bucket(area, "Buildings")
    style = style_at(x, z)
    if base < 0.5 and cap <= TUN_CEIL + 0.01:
        return tunnel_wall(f, u0, u1, area)
    span = u1 - u0
    top = min(cap, TOP)
    if style == "factory":
        wall_m, plinth_m, tint = M["brick"], M["concrete"], pick([(1, 1, 1), (0.92, 0.86, 0.82), (1, 0.95, 0.9)], "ft", seed)
    elif style == "warehouse":
        wall_m, plinth_m, tint = M["concrete"], M["concrete"], pick([(1, 0.97, 0.92), (0.92, 0.92, 0.9), (1, 0.93, 0.85)], "wt", seed)
    elif style == "stone":
        wall_m, plinth_m, tint = M["rubble"], M["sandstone"], (1, 1, 1)
    else:
        wall_m = pick([M["plaster"], M["plaster"], M["plaster"], M["rubble"], M["brickplaster"]], "om", seed)
        plinth_m, tint = M["sandstone"], pick(PLASTER_TINT, "ot", seed)
    colf = lambda u, y: mul(tint, grime(y, base, top))
    plinth = 0.55 if style != "factory" else 0.45
    # Plinth band and the wall above it (the wall plane sits WI inside the collision face).
    f.quad(mesh, u0, u1, base, base + plinth, -WI + 0.0, plinth_m, cols=[mul((1, 1, 1), grime(base, base, top))] * 2 + [(1, 1, 1)] * 2)
    holes = []
    # Bays: openings per storey (ground storey 3.4 m, then 3.1 m).
    bay = 3.4 if style in ("factory", "warehouse") else 3.1
    nb = max(1, int(span // bay))
    pad = (span - nb * bay) / 2
    storeys = []
    y = base
    while y + 2.6 < top - 0.4:
        storeys.append(y)
        y += 3.4 if not storeys[1:] else 3.1
    for q in range(nb):
        c0 = u0 + pad + q * bay
        cm = c0 + bay / 2
        for si, sy in enumerate(storeys):
            r = H("open", seed, q, si)
            if style == "factory":
                if si == 0 and r < 0.18 and span > 6:
                    holes.append((cm - 1.4, cm + 1.4, sy, sy + 3.3, "roller", "trim", (0.75, 0.7, 0.62)))
                elif si == 0 and r < 0.6:
                    holes.append((cm - 1.0, cm + 1.0, sy + 0.9, min(top - 0.5, sy + 4.6), "archwin", "trim2", (1, 1, 1)))
                elif si >= 1 and r < 0.75 and (si != 1 or H("tall", seed, q) > 0.6):
                    holes.append((cm - 1.2, cm + 1.2, sy + 0.8, min(top - 0.4, sy + 2.6), "factorywin", "trim2", (1, 1, 1)))
            elif style == "warehouse":
                if si == 0 and r < 0.25 and span > 6:
                    holes.append((cm - 1.4, cm + 1.4, sy, sy + 3.2, "roller", "trim", pick([(0.7, 0.72, 0.66), (0.62, 0.66, 0.7)], "rc", seed, q)))
                elif r < 0.55:
                    holes.append((cm - 0.9, cm + 0.9, sy + 1.0, sy + 2.4, "factorywin", "trim2", (1, 1, 1)))
                elif r < 0.7:
                    holes.append((cm - 0.6, cm + 0.6, sy + 1.4, sy + 2.2, "vent", "trim", (1, 1, 1)))
            else:
                paint = pick(SHUTTER, "sh", seed, q)
                if si == 0:
                    if r < 0.32:
                        holes.append((cm - 0.6, cm + 0.6, sy, sy + 2.3, pick(["door", "plankdoor"], "dk", seed, q), "trim", paint))
                    elif r < 0.75:
                        holes.append((cm - 0.55, cm + 0.55, sy + 0.95, sy + 2.25, pick(["shutter", "grille", "window"], "gw", seed, q), "trim", paint))
                else:
                    if r < 0.8:
                        holes.append((cm - 0.55, cm + 0.55, sy + 0.9, sy + 2.3, pick(["shutter", "window", "shutter"], "uw", seed, q, si), "trim", paint))
    # Wall with the openings cut out (columns between openings, plus sills / heads).
    cuts = sorted({u0, u1, *[h[0] for h in holes], *[h[1] for h in holes]})
    for a, b in zip(cuts, cuts[1:]):
        mid = (a + b) / 2
        gaps = sorted((h[2], h[3]) for h in holes if h[0] <= mid <= h[1])
        yy = base + plinth
        for g0, g1 in gaps:
            g0 = max(g0, base + plinth)
            if g0 > yy + 1e-4:
                f.quad(mesh, a, b, yy, g0, -WI, wall_m, cols=[colf(a, yy), colf(b, yy), colf(b, g0), colf(a, g0)])
            yy = max(yy, g1)
        if top > yy + 1e-4:
            f.quad(mesh, a, b, yy, top, -WI, wall_m, cols=[colf(a, yy), colf(b, yy), colf(b, top), colf(a, top)])
    for (h0, h1, y0, y1, cell, atlas, paint) in holes:
        y0 = max(y0, base + (plinth if y0 > base + 0.01 else 0))
        f.opening(mesh, h0, h1, y0, y1, cell, depth=0.2 if atlas == "trim" else 0.25, wall_mat=wall_m if style != "oldtown" else M["sandstone"],
                  atlas=atlas, tint=paint, sill=y0 > base + 0.01)
        # Old town: sandstone surround flush with the wall (a frame of thin quads 2 cm proud of the
        # recessed wall plane, still inside the collision).
        if style == "oldtown":
            for (a, b, c, d) in ((h0 - 0.12, h0, y0 - 0.1, y1 + 0.12), (h1, h1 + 0.12, y0 - 0.1, y1 + 0.12), (h0 - 0.12, h1 + 0.12, y1, y1 + 0.14)):
                f.quad(mesh, a, b, max(base, c), d, -WI + 0.02, M["sandstone"])
            if y0 > base + 3 and H("bal", seed, h0) < 0.25:  # iron balconette in front of the window
                rail = bucket(area, "Props")
                f.quad(rail, h0 - 0.1, h1 + 0.1, y0, y0 + 0.95, 0.02, M["trim2"], uvs=atlas_uv(T2["ironrail"]))
            if H("veg", seed, h0) < 0.18:  # bougainvillea spilling over the opening head
                veg = bucket(area, "Vegetation")
                f.quad(veg, h0 - 0.6, h1 + 0.6, y1 - 0.4, y1 + 1.2, 0.03, M["trim2"], uvs=atlas_uv(T2["bougain"]))
    # Cornice at the block top (and the free architecture above it).
    f.quad(mesh, u0, u1, top - 0.35, top, -WI + 0.02, plinth_m if style == "oldtown" else M["concrete"])
    if style == "factory" and H("sign", seed) < 0.35 and span > 4:
        u = u0 + span * H("su", seed)
        f.quad(bucket(area, "Props"), max(u0, u - 0.4), min(u1, u + 0.4), base + 2.0, base + 2.8, 0.01, M["trim2"], uvs=atlas_uv(T2["warnsign"]))
    if style == "oldtown" and H("poster", seed) < 0.3 and span > 4:
        u = u0 + span * H("pu", seed)
        f.quad(bucket(area, "Props"), max(u0, u - 0.6), min(u1, u + 0.6), base + 1.2, base + 2.6, 0.005, M["trim2"], uvs=atlas_uv(T2["poster"]))
    if style == "oldtown" and H("ivy", seed) < 0.3 and span > 3:
        u = u0 + span * H("iu", seed)
        w_ = 1.2 + 2.0 * H("iw", seed)
        f.quad(bucket(area, "Vegetation"), max(u0, u - w_ / 2), min(u1, u + w_ / 2), base + 0.3, min(top, base + 3.5 + 4 * H("ih", seed)), 0.025,
               M["trim2"], uvs=atlas_uv(T2["ivy"]))
    if style in ("oldtown", "stone") and H("lantern", seed) < 0.35 and span > 4:
        u = u0 + span * H("lu", seed)
        lp = f.P(u, base + 3.0, 0.0)
        lantern(area, lp, f.nv)


def roofline(s, f, u0, u1, seed, depth_max=4.0):
    """Free architecture above the 9.6 m block along an exposed face: a terracotta roof sloping back
    (old town), a parapet with a sawtooth roof (factory), a parapet (warehouse)."""
    x, z = f.P((u0 + u1) / 2, 0, 0)[0], f.P((u0 + u1) / 2, 0, 0)[2]
    style = style_at(x, z)
    area = area_at(x, z)
    mesh = bucket(area, "Roofs")
    if style in ("oldtown", "stone"):
        extra = 3.0 if H("st", seed) < 0.35 else 0.0
        if extra:
            tint = pick(PLASTER_TINT, "rt", seed)
            f.quad(mesh, u0, u1, TOP, TOP + extra, -WI, M["plaster"], cols=[tint] * 4)
            span = u1 - u0
            for q in range(max(1, int(span // 3.1))):
                c = u0 + (q + 0.5) * span / max(1, int(span // 3.1))
                f.opening(mesh, c - 0.5, c + 0.5, TOP + 0.8, TOP + 2.1, "shutter", wall_mat=M["sandstone"], tint=pick(SHUTTER, "rs", seed, q))
        y0 = TOP + extra
        depth = min(4.0, depth_max * 0.5)
        quad(mesh, [f.P(u0, y0, 0.35), f.P(u1, y0, 0.35), f.P(u1, y0 + 1.7, -depth), f.P(u0, y0 + 1.7, -depth)], M["rooftile"])
        quad(mesh, [f.P(u0, y0 - 0.12, 0.35), f.P(u0, y0 - 0.12, -depth), f.P(u1, y0 - 0.12, -depth), f.P(u1, y0 - 0.12, 0.35)][::-1], M["wood"])
    elif style == "factory":
        f.quad(mesh, u0, u1, TOP, TOP + 1.2, -WI, M["brick"])
        f.quad(mesh, u0, u1, TOP + 1.2, TOP + 1.4, -WI + 0.03, M["concrete"])
        # sawtooth: glazed north lights stepping back from the parapet
        for k in range(min(3, max(0, int((depth_max - 1.0) // 4.0)))):
            w0, w1 = -1.0 - 4.0 * k, -4.0 - 4.0 * k
            quad(mesh, [f.P(u0, TOP + 1.2, w0), f.P(u1, TOP + 1.2, w0), f.P(u1, TOP + 3.4, w0), f.P(u0, TOP + 3.4, w0)],
                 M["trim2"], uvs=[(0.25 * T2["glassroof"] % 4 * 0 + 0.25 * (T2["glassroof"] % 4) + 0.004, 0.004), (0.25 * (T2["glassroof"] % 4) + 0.246, 0.004),
                                  (0.25 * (T2["glassroof"] % 4) + 0.246, 0.246), (0.25 * (T2["glassroof"] % 4) + 0.004, 0.246)])
            quad(mesh, [f.P(u0, TOP + 3.4, w0), f.P(u1, TOP + 3.4, w0), f.P(u1, TOP + 1.2, w1), f.P(u0, TOP + 1.2, w1)], M["metal"],
                 cols=[(0.62, 0.3, 0.24)] * 4)
    else:
        f.quad(mesh, u0, u1, TOP, TOP + 0.9, -WI, M["concrete"])
        quad(mesh, [f.P(u0, TOP + 0.9, 0), f.P(u1, TOP + 0.9, 0), f.P(u1, TOP + 0.9, -0.3), f.P(u0, TOP + 0.9, -0.3)], M["concrete"])


def atlas_box(mesh, x0, x1, y0, y1, z0, z1, mat, cell, atlas=None):
    """A box whose every face shows one atlas cell (lamps): world UVs would sample the whole atlas."""
    P = lambda x, y, z: (x, y, z)
    faces = [
        [P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1)],
        [P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0)],
        [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)],
        [P(x1, y0, z0), P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0)],
        [P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)],
        [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)],
    ]
    for pts in faces:
        quad(mesh, pts, mat, uvs=atlas_uv(cell))


def lantern(area, p, nv):
    mesh = bucket(area, "Lamps")
    x, y, z = p
    nx, nz = nv
    # bracket and a lantern box with emissive panes, 0.25 m off the wall
    cx, cz = x + nx * 0.28, z + nz * 0.28
    atlas_box(mesh, cx - 0.1, cx + 0.1, y - 0.25, y + 0.05, cz - 0.1, cz + 0.1, M["lamp"], T2["lamp"])
    box(mesh, cx - 0.13, cx + 0.13, y + 0.05, y + 0.12, cz - 0.13, cz + 0.13, M["metal"])
    tube(mesh, [(x + nx * 0.02, y + 0.1, z + nz * 0.02), (cx, y + 0.12, cz)], 0.015, M["metal"], sides=4)


def tunnel_wall(f, u0, u1, area):
    mesh = bucket("Tunnel", "Tunnel")
    f.quad(mesh, u0, u1, 0.0, 0.45, -WI, M["concrete-tun"], cols=[(0.8, 0.8, 0.8)] * 2 + [(1, 1, 1)] * 2)
    f.quad(mesh, u0, u1, 0.45, TUN_CEIL, -WI, M["brick-tun"], cols=[(0.95, 0.92, 0.88)] * 4)
    # pipes along the wall (two runs) and a cable tray, lamps every ~6 m
    for py, r in ((2.35, 0.09), (2.62, 0.06)):
        tube(bucket("Tunnel", "Props"), [f.P(u0, py, -WI + r + 0.01), f.P(u1, py, -WI + r + 0.01)], r, M["pipe"], sides=6)
    tube(bucket("Tunnel", "Props"), [f.P(u0, 2.05, -WI + 0.03), f.P(u1, 2.05, -WI + 0.03)], 0.02, M["metal"], sides=4)
    span = u1 - u0
    for q in range(int(span // 6.0)):
        u = u0 + 3.0 + q * 6.0
        p = f.P(u, 2.15, 0.0)
        nx, nz = f.nv
        lm = bucket("Tunnel", "Lamps")
        cx, cz = p[0] + nx * 0.12, p[2] + nz * 0.12
        atlas_box(lm, cx - 0.16, cx + 0.16, 2.0, 2.3, cz - 0.16, cz + 0.16, M["lamp"], T2["lamp"])
        quad(lm, [f.P(u - 0.2, 1.95, 0.25), f.P(u + 0.2, 1.95, 0.25), f.P(u + 0.2, 2.35, 0.25), f.P(u - 0.2, 2.35, 0.25)], M["trim2"],
             uvs=atlas_uv(T2["cage"]))
        # streak of water damage below some lamps
        if H("dmg", u, f.line) < 0.4:
            f.quad(bucket("Tunnel", "Decals"), u - 0.6, u + 0.6, 0.0, 1.8, -WI + 0.005, M["decal"], uvs=atlas_uv(DC["streaks"]))


def dress_building(s):
    seed = s["id"]
    for side in ("+x", "-x", "+z", "-z"):
        f, runs = runs_of(s, side, 0.0, TOP)
        for (u0, u1, base, cap) in runs:
            facade(s, f, u0, u1, base, cap, (seed, side, round(u0, 1)))
            if cap > TOP - 0.1:
                roofline(s, f, u0, u1, (seed, side, round(u0, 1)), s["w"] if side in ("+x", "-x") else s["d"])


def dress_fill(s):
    """Terrain fill: retaining walls where a lower floor (or the tunnel) meets it."""
    x0, x1, y0, y1, z0, z1 = sb(s)
    for side in ("+x", "-x", "+z", "-z"):
        f, runs = runs_of(s, side, 0.0, y1)
        for (u0, u1, base, cap) in runs:
            if cap - base < 0.05:
                continue
            x, z = f.P((u0 + u1) / 2, 0, 0)[0], f.P((u0 + u1) / 2, 0, 0)[2]
            if base < 0.5 and cap <= TUN_CEIL + 0.01:
                tunnel_wall(f, u0, u1, "Tunnel")
                continue
            area = area_at(x, z, base + 0.2)
            mesh = bucket(area, "Retaining Walls")
            mat = M["rubble"] if style_at(x, z) in ("oldtown", "stone") else M["concrete"]
            f.quad(mesh, u0, u1, base, cap, -WI, mat, cols=[(0.85, 0.83, 0.8)] * 2 + [(1, 1, 1)] * 2)
            f.quad(mesh, u0, u1, cap - 0.18, cap, -WI + 0.03, M["sandstone"] if mat is M["rubble"] else M["concrete"])


def dress_tunnel_ceiling(s):
    x0, x1, y0, y1, z0, z1 = sb(s)
    mesh = bucket("Tunnel", "Tunnel")
    # underside (the tunnel ceiling) where the tunnel is below, plus brick ribs every 3 m
    quad(mesh, [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], M["concrete-tun"], cols=[(0.7, 0.68, 0.66)] * 4)
    along_x = (x1 - x0) >= (z1 - z0)
    a0, a1 = (x0, x1) if along_x else (z0, z1)
    n = int((a1 - a0) // 3.0)
    for k in range(1, n + 1):
        a = a0 + k * (a1 - a0) / (n + 1)
        if along_x:
            box(mesh, a - 0.18, a + 0.18, y0 - 0.22, y0, z0, z1, M["brick-tun"], bottom=True, skip=("py",))
        else:
            box(mesh, x0, x1, y0 - 0.22, y0, a - 0.18, a + 0.18, M["brick-tun"], bottom=True, skip=("py",))


# =============================================================================== ground
def ground_mat(name, y):
    table = {
        "ct-spawn": "pavement", "rail-yard": "asphalt", "a-gate": "concrete", "control-room": "floor",
        "market-street": "asphalt", "market-hall": "planks", "b-gate-steps": "flags", "ct-mid": "asphalt",
        "a-court": "floor", "shipping-hall": "garage", "lower-yard": "asphalt", "loading-ramp": "concrete",
        "lower-mid": "pavement", "t-mid-steps": "sandstone", "boiler-house": "floor", "annex": "floor",
        "tunnel-pocket": "concrete", "arcade": "flags", "arcade-north": "flags", "b-court": "flags",
        "b-arch": "cobble", "lower-alley": "cobble", "alley-bend": "cobble", "upper-alley": "cobble",
        "market-lane": "cobble", "apt-ground": "planks", "apt-upper-south": "planks", "high-street": "cobble",
        "tunnel-stairs": "concrete", "t-mid-plaza": "flags", "t-spawn": "flags", "upper-lane": "cobble",
        "apt-street": "cobble",
    }
    return table.get(name, "pavement")


def value_noise(x, z, scale, seed):
    gx, gz = x / scale, z / scale
    x0, z0 = math.floor(gx), math.floor(gz)
    fx, fz = gx - x0, gz - z0
    fx, fz = fx * fx * (3 - 2 * fx), fz * fz * (3 - 2 * fz)
    v = lambda a, b: H("vn", seed, a, b)
    return (v(x0, z0) * (1 - fx) + v(x0 + 1, z0) * fx) * (1 - fz) + (v(x0, z0 + 1) * (1 - fx) + v(x0 + 1, z0 + 1) * fx) * fz


def ground_col(x, z):
    g = 0.86 + 0.16 * value_noise(x, z, 6.0, 1) + 0.06 * value_noise(x, z, 2.2, 2)
    return (g, g * 0.98, g * 0.95)


def ground():
    G = 0.5
    cells = {}
    nx, nz = int(W / G), int(D / G)
    for i in range(nx):
        for j in range(nz):
            x, z = -HW + (i + 0.5) * G, -HD + (j + 0.5) * G
            r = region_at(x, z)
            if r is not None and r[5] > 0.0:
                cells[(i, j)] = (ground_mat(r[0], r[5]), r[5])
            elif r is not None:
                cells[(i, j)] = ("concrete", 0.0)
            if tunnel_at(x, z):
                cells.setdefault(("t", i, j), ("floor-tun", 0.0))
    # greedy rectangles of equal (material, height); tunnel floor as its own layer
    for layer in ("g", "t"):
        rem = {k: v for k, v in cells.items() if (len(k) == 3) == (layer == "t")}
        key = (lambda i, j: ("t", i, j)) if layer == "t" else (lambda i, j: (i, j))
        idx = lambda k: (k[1], k[2]) if layer == "t" else k
        rem = {idx(k): v for k, v in rem.items()}
        while rem:
            (i0, j0), v = min(rem.items(), key=lambda kv: (kv[0][1], kv[0][0]))
            i1 = i0
            while rem.get((i1 + 1, j0)) == v:
                i1 += 1
            j1 = j0
            while all(rem.get((i, j1 + 1)) == v for i in range(i0, i1 + 1)):
                j1 += 1
            for i in range(i0, i1 + 1):
                for j in range(j0, j1 + 1):
                    del rem[(i, j)]
            mat, y = v
            xa, xb = -HW + i0 * G, -HW + (i1 + 1) * G
            za, zb = -HD + j0 * G, -HD + (j1 + 1) * G
            nxs, nzs = max(1, math.ceil((xb - xa) / 3.0)), max(1, math.ceil((zb - za) / 3.0))
            for a in range(nxs):
                for b in range(nzs):
                    qa, qb = xa + (xb - xa) * a / nxs, xa + (xb - xa) * (a + 1) / nxs
                    ra, rb = za + (zb - za) * b / nzs, za + (zb - za) * (b + 1) / nzs
                    pts = [(qa, y, rb), (qb, y, rb), (qb, y, ra), (qa, y, ra)]
                    area = area_at((qa + qb) / 2, (ra + rb) / 2, y + 0.1)
                    quad(bucket(area, "Ground"), pts, M[mat], cols=[ground_col(p[0], p[2]) for p in pts])


# =============================================================================== stairs, ramps, slabs
RAMPS = {}


def dress_stair(s):
    x0, x1, y0, y1, z0, z1 = sb(s)
    area = area_at(s["x"], s["z"], y1 - 0.2)
    if s["kind"] == "ramp":
        RAMPS.setdefault(s["id"].rsplit("-", 1)[0], []).append(s)
        mesh = bucket(area, "Stairs")
        # sides only (the visible top is the smooth ramp)
        box(mesh, x0, x1, y0, y1, z0, z1, M["concrete"], skip=("py",))
        return
    mesh = bucket(area, "Stairs")
    sid = s["id"]
    metal = sid.startswith(("a-catwalk-stairs", "cr-stairs"))
    if sid.startswith("apt-balcony-stairs"):
        mat = M["sandstone"]
    elif metal:
        mat = M["rustpaint"]
    elif sid.startswith(("t-mid-steps", "tun-stairs", "b-gate", "mh-steps", "apt-stairs")):
        mat = M["sandstone"] if not sid.startswith(("tun-stairs", "apt-stairs")) else (M["concrete"] if sid.startswith("tun") else M["wood"])
    else:
        mat = M["concrete"]
    box(mesh, x0, x1, y0, y1, z0, z1, mat, cols=[(0.45, 0.47, 0.46)] * 4 if metal else None)


def ramps():
    for rid, steps in RAMPS.items():
        x0 = min(s["x"] - s["w"] / 2 for s in steps)
        x1 = max(s["x"] + s["w"] / 2 for s in steps)
        z0 = min(s["z"] - s["d"] / 2 for s in steps)
        z1 = max(s["z"] + s["d"] / 2 for s in steps)
        base = min(s["y"] - s["h"] / 2 for s in steps)
        tops = sorted(steps, key=lambda s: s["y"] + s["h"] / 2)
        lowest, highest = tops[0], tops[-1]
        # The ramp rises along z here (both ramps in the layout); low end at the lowest riser.
        rising_pos = lowest["z"] < highest["z"]
        d = lowest["d"]
        ylo, yhi = base, highest["y"] + highest["h"] / 2
        za, zb = (z0, z1) if rising_pos else (z1, z0)
        area = area_at((x0 + x1) / 2, (z0 + z1) / 2, (ylo + yhi) / 2)
        mesh = bucket(area, "Stairs")
        mat = M["concrete"] if rid.startswith("loading") else M["cobble"]
        # Through the back edges of the risers: y = ylo + riser · (t / d), t from the low end.
        # The last riser's back edge meets the landing (yhi + riser).
        pts = [(x0, ylo, za), (x1, ylo, za), (x1, yhi, zb), (x0, yhi, zb)]
        if not rising_pos:
            pts = [pts[1], pts[0], pts[3], pts[2]]
        quad(mesh, pts, mat, cols=[ground_col(p[0], p[2]) for p in pts])
        # curbs along both sides
        for cx in (x0, x1 - 0.25):
            quad(mesh, [(cx, ylo + 0.15, za), (cx + 0.25, ylo + 0.15, za), (cx + 0.25, yhi + 0.15, zb), (cx, yhi + 0.15, zb)][::(1 if rising_pos else -1)],
                 M["sandstone"])


def dress_slab(s):
    x0, x1, y0, y1, z0, z1 = sb(s)
    area = area_at(s["x"], s["z"], y1 + 0.2)
    mesh = bucket(area, "Floors")
    k, sid = s["kind"], s["id"]
    if k == "catwalk" or sid.startswith("cr-landing"):
        # steel deck: grating top (alpha shows the dark plate below), yellow edge, steel underside
        box(mesh, x0, x1, y0, y1 - 0.02, z0, z1, M["rustpaint"], bottom=True, cols=[(0.55, 0.55, 0.52)] * 4)
        nu, nv = max(1, round((x1 - x0) / 1.0)), max(1, round((z1 - z0) / 1.0))
        cell = atlas_uv(T2["grating"])
        for a in range(nu):
            for b in range(nv):
                qa, qb = x0 + (x1 - x0) * a / nu, x0 + (x1 - x0) * (a + 1) / nu
                ra, rb = z0 + (z1 - z0) * b / nv, z0 + (z1 - z0) * (b + 1) / nv
                quad(bucket(area, "Props"), [(qa, y1 - 0.005, rb), (qb, y1 - 0.005, rb), (qb, y1 - 0.005, ra), (qa, y1 - 0.005, ra)], M["trim2"], uvs=cell)
        return
    if k == "balcony":
        box(mesh, x0, x1, y0, y1, z0, z1, M["sandstone"], top=M["flags"], bottom=True)
        return
    # apartment floor: planks on top, plaster ceiling below
    box(mesh, x0, x1, y0, y1, z0, z1, M["plaster"], top=M["planks"], bottom=True)


def dress_wall_piece(s):
    x0, x1, y0, y1, z0, z1 = sb(s)
    area = area_at(s["x"], s["z"], y0 + 0.5)
    mesh = bucket(area, "Buildings")
    sid = s["id"]
    if sid.startswith(("hall-", "boiler-", "annex-")):
        mat = M["brick"]
    elif sid.startswith(("cr-",)):
        mat = M["concrete"]
    elif sid.startswith(("mh-",)):
        mat = M["rubble"]
    elif sid.startswith("mid-gate"):
        mat = M["sandstone"]
    else:
        mat = M["plaster"]
    tint = pick(PLASTER_TINT, "wp", sid.rsplit("-", 1)[0]) if mat is M["plaster"] else (1, 1, 1)
    box(mesh, x0, x1, y0, y1, z0, z1, mat, bottom=y0 > 0.5, colf=lambda p: mul(tint, grime(p[1], y0, None)))


# =============================================================================== library props
LIBFILE = os.path.join(HERE, "build", "library.blend")
LIB = {}
if os.path.exists(LIBFILE):
    with bpy.data.libraries.load(LIBFILE, link=False) as (src, dst):
        dst.objects = [n for n in src.objects if n.startswith("lib-")]
    for o in dst.objects:
        LIB[o.name[4:]] = o
lib_coll = LAY.side("Asset Library")
for o in LIB.values():
    lib_coll.objects.link(o)


def lib_dims(name):
    o = LIB[name]
    xs = [v.co.x for v in o.data.vertices]
    ys = [v.co.y for v in o.data.vertices]
    zs = [v.co.z for v in o.data.vertices]
    return (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))


DIMS = {k: lib_dims(k) for k in LIB}


def place(name, area, category, x, y, z, sx, sy, sz, yaw=0.0, shadow=True):
    """Instance a library mesh. (sx, sy, sz): target size along the library's own X (long axis),
    height and Y (depth) after `yaw` (radians, about game y)."""
    if name not in LIB:
        return None
    dx, dy, dz = DIMS[name]
    o = bpy.data.objects.new(name, LIB[name].data)
    o.location = B(x, y, z)
    o.rotation_euler = (0, 0, yaw)
    o.scale = (sx / dx, sz / dy, sy / dz)
    o["instance"] = True
    if not shadow:
        o["noShadow"] = True
    LAY.get(area, category).objects.link(o)
    return o


def fit(name, s, area, category="Props", inset=0.02, along=None, yaw_extra=0.0, scale=(1, 1, 1), y0=None, h=None):
    x0, x1, by0, by1, z0, z1 = sb(s)
    w, d = s["w"] - 2 * inset, s["d"] - 2 * inset
    hh = (h if h is not None else s["h"] - inset)
    long_x = (along == "x") if along else (w >= d)
    yaw = (0.0 if long_x else math.pi / 2) + yaw_extra
    L_, Wd = (w, d) if long_x else (d, w)
    return place(name, area, category, s["x"], by0 if y0 is None else y0, s["z"], L_ * scale[0], hh * scale[1], Wd * scale[2], yaw)


# =============================================================================== cover and props
def stone_block(mesh, s, mat, top=None):
    x0, x1, y0, y1, z0, z1 = sb(s)
    box(mesh, x0, x1, y0, y1, z0, z1, mat, top=top, colf=lambda p: (grime(p[1], y0, None),) * 3)


def container(mesh, s, paint):
    x0, x1, y0, y1, z0, z1 = sb(s)
    box(mesh, x0 + 0.02, x1 - 0.02, y0, y1 - 0.02, z0 + 0.02, z1 - 0.02, M["metal"], cols=[paint] * 4)
    # corner posts
    for (cx, cz) in ((x0, z0), (x1, z0), (x0, z1), (x1, z1)):
        box(mesh, cx - 0.0 if cx == x0 else cx - 0.12, cx + 0.12 if cx == x0 else cx, y0, y1, cz if cz == z0 else cz - 0.12,
            cz + 0.12 if cz == z0 else cz, M["rustpaint"], cols=[mul(paint, 0.8)] * 4)


def crucible(area, s):
    """The ladle furnace: a riveted crucible on a steel cradle with a pouring lip and a hood."""
    x0, x1, y0, y1, z0, z1 = sb(s)
    mesh = bucket(area, "Industrial")
    cx, cz = s["x"], s["z"]
    r = min(s["w"], s["d"]) / 2 - 0.05
    box(mesh, x0 + 0.05, x1 - 0.05, y0, y0 + 0.6, z0 + 0.05, z1 - 0.05, M["rustpaint"], cols=[(0.5, 0.5, 0.48)] * 4)
    cylinder(mesh, cx, cz, y0 + 0.6, y1 - 1.0, r * 0.82, r, M["rust"], n=20, caps=False, tile=1.5)
    cylinder(mesh, cx, cz, y1 - 1.0, y1 - 0.85, r, r, M["rustpaint"], n=20, caps=False, tile=1.5)
    cylinder(mesh, cx, cz, y1 - 0.85, y1 - 0.05, r, r * 0.95, M["rust"], n=20, caps=True, tile=1.5)
    for k in range(4):  # cradle trunnions
        a = k * math.pi / 2
        px, pz = cx + math.cos(a) * (r - 0.05), cz + math.sin(a) * (r - 0.05)
        box(mesh, px - 0.12, px + 0.12, y0 + 0.6, y1 - 0.5, pz - 0.12, pz + 0.12, M["rustpaint"])


def boiler(area, s):
    x0, x1, y0, y1, z0, z1 = sb(s)
    mesh = bucket(area, "Industrial")
    r = min(s["w"], s["d"]) / 2 - 0.05
    cylinder(mesh, s["x"], s["z"], y0, y1 - 0.05, r, r, M["rustpaint"], n=18, tile=1.2, cols=(0.7, 0.75, 0.7))
    for yy in (y0 + 0.8, y1 - 0.8):
        cylinder(mesh, s["x"], s["z"], yy, yy + 0.08, r + 0.0, r + 0.0, M["rust"], n=18, caps=False)


def jersey(mesh, s):
    x0, x1, y0, y1, z0, z1 = sb(s)
    along_x = (x1 - x0) >= (z1 - z0)
    # tapered profile: full width at the foot, 40 % at the top (inside the box)
    if along_x:
        c, h = (z0 + z1) / 2, (z1 - z0) / 2
        prof = [(-h, y0), (h, y0), (h * 0.55, y0 + (y1 - y0) * 0.3), (h * 0.35, y1), (-h * 0.35, y1), (-h * 0.55, y0 + (y1 - y0) * 0.3)]
        for (a, ya), (b, yb) in zip(prof, prof[1:] + prof[:1]):
            quad(mesh, [(x0, ya, c + a), (x1, ya, c + a), (x1, yb, c + b), (x0, yb, c + b)][::-1], M["concrete"])
        quad(mesh, [(x0, y, c + a) for a, y in prof][::-1][:4], M["concrete"])
    else:
        box(mesh, x0, x1, y0, y1, z0, z1, M["concrete"])


def stall(area, s):
    x0, x1, y0, y1, z0, z1 = sb(s)
    mesh = bucket(area, "Market")
    box(mesh, x0, x1, y0, y1, z0, z1, M["wood"], cols=[pick([(0.7, 0.55, 0.4), (0.62, 0.66, 0.5)], "stc", s["id"])] * 4)
    # crates of produce on the counter (inside the box top band) and an awning on posts (visual,
    # 2.85 m above the market floor: above every jump)
    long_x = (x1 - x0) >= (z1 - z0)
    aw0, aw1 = y0 + 2.85, y0 + 3.15
    if long_x:
        for px in (x0 + 0.05, x1 - 0.1):
            box(mesh, px, px + 0.05, y1, aw0, z0 + 0.05, z0 + 0.1, M["wood"])
        quad(bucket(area, "Market"), [(x0 - 0.2, aw0, z1 + 0.6), (x1 + 0.2, aw0, z1 + 0.6), (x1 + 0.2, aw1, z0 - 0.2), (x0 - 0.2, aw1, z0 - 0.2)],
             M["trim2"], uvs=atlas_uv(T2["awning"]))
    else:
        for pz in (z0 + 0.05, z1 - 0.1):
            box(mesh, x0 + 0.05, x0 + 0.1, y1, aw0, pz, pz + 0.05, M["wood"])
        quad(bucket(area, "Market"), [(x1 + 0.6, aw0, z0 - 0.2), (x1 + 0.6, aw0, z1 + 0.2), (x0 - 0.2, aw1, z1 + 0.2), (x0 - 0.2, aw1, z0 - 0.2)],
             M["trim2"], uvs=atlas_uv(T2["awning"]))


def fountain(area, s):
    x0, x1, y0, y1, z0, z1 = sb(s)
    if not fit("fountain", s, area, "Market", inset=0.03):
        stone_block(bucket(area, "Market"), s, M["sandstone"])
    mesh = bucket(area, "Market")
    # water surface just below the rim
    quad(mesh, [(x0 + 0.35, y1 - 0.18, z1 - 0.35), (x1 - 0.35, y1 - 0.18, z1 - 0.35), (x1 - 0.35, y1 - 0.18, z0 + 0.35), (x0 + 0.35, y1 - 0.18, z0 + 0.35)],
         M["trim2"], uvs=atlas_uv(T2["glassroof"]), cols=[(0.25, 0.42, 0.45)] * 4)


def fountain_column(area, s):
    x0, x1, y0, y1, z0, z1 = sb(s)
    mesh = bucket(area, "Market")
    cx, cz = s["x"], s["z"]
    cylinder(mesh, cx, cz, y0, y1 - 1.3, 0.38, 0.3, M["sandstone"], n=12)
    # upper bowl and finial above every reach (≥ 2.8 m over the terrace)
    cylinder(mesh, cx, cz, y1 - 1.3, y1 - 1.05, 0.3, 0.75, M["sandstone"], n=16, caps=False)
    cylinder(mesh, cx, cz, y1 - 1.05, y1 - 0.95, 0.75, 0.7, M["sandstone"], n=16)
    cylinder(mesh, cx, cz, y1 - 0.95, y1, 0.14, 0.05, M["sandstone"], n=8)


def wagon(area, s):
    x0, x1, y0, y1, z0, z1 = sb(s)
    mesh = bucket(area, "Industrial")
    box(mesh, x0 + 0.1, x1 - 0.1, y0, y0 + 0.7, z0 + 0.25, z1 - 0.25, M["rust"])
    box(mesh, x0, x1, y0 + 0.7, y1, z0, z1, M["rustpaint"], cols=[(0.55, 0.42, 0.32)] * 4)
    for k in range(3):  # rails the wagon stands on run through the yard
        pass


def rails_in_yard():
    mesh = bucket("Police Side", "Ground Props")
    for z in (-44.0, -42.9):
        box(mesh, -33, -8.2, 1.2, 1.26, z - 0.04, z + 0.04, M["rust"])
    for k in range(int((-8.2 + 33) / 0.7)):
        x = -33 + k * 0.7
        box(mesh, x, x + 0.22, 1.2, 1.23, -44.4, -42.5, M["wood"], cols=[(0.5, 0.45, 0.4)] * 4)


def racking(area, s):
    x0, x1, y0, y1, z0, z1 = sb(s)
    mesh = bucket(area, "Industrial")
    long_x = (x1 - x0) >= (z1 - z0)
    n = 3
    for k in range(n + 1):
        a = (x0 + (x1 - x0) * k / n) if long_x else (z0 + (z1 - z0) * k / n)
        if long_x:
            box(mesh, min(max(a - 0.05, x0), x1 - 0.1), min(max(a + 0.05, x0 + 0.1), x1), y0, y1, z0, z1, M["rustpaint"], cols=[(0.3, 0.42, 0.62)] * 4)
        else:
            box(mesh, x0, x1, y0, y1, min(max(a - 0.05, z0), z1 - 0.1), min(max(a + 0.05, z0 + 0.1), z1), M["rustpaint"], cols=[(0.3, 0.42, 0.62)] * 4)
    for yy in (y0 + 0.15, y0 + 1.3, y0 + 2.45):
        box(mesh, x0, x1, yy, yy + 0.1, z0, z1, M["rustpaint"], cols=[(0.85, 0.5, 0.15)] * 4)
        # boxes on each shelf (inside the rack)
        if yy + 1.0 < y1:
            box(mesh, x0 + 0.1, x1 - 0.1, yy + 0.1, yy + 0.95, z0 + 0.1, z1 - 0.1, M["wood"], cols=[(0.75, 0.62, 0.45)] * 4)


def dress_cover(s):
    k, sid = s["kind"], s["id"]
    x0, x1, y0, y1, z0, z1 = sb(s)
    area = area_at(s["x"], s["z"], y0 + 0.3)
    if k in ("building",):
        return
    if k == "furnace":
        if sid == "a-ladle":
            crucible(area, s)
        else:
            stone_block(bucket(area, "Industrial"), s, M["rustpaint"])
        return
    if k == "machine":
        mesh = bucket(area, "Industrial")
        box(mesh, x0, x1, y0, y0 + 0.5, z0, z1, M["concrete"])
        box(mesh, x0 + 0.1, x1 - 0.1, y0 + 0.5, y1, z0 + 0.1, z1 - 0.1, M["rustpaint"], cols=[pick([(0.85, 0.75, 0.4), (0.5, 0.65, 0.55)], "mc", sid)] * 4)
        return
    if k == "container":
        container(bucket(area, "Industrial"), s, pick([(0.6, 0.25, 0.18), (0.25, 0.4, 0.55), (0.45, 0.5, 0.3)], "cp", sid))
        return
    if k == "crate-stack":
        n = max(1, round(s["h"] / 1.1))
        for q in range(n):
            hh = s["h"] / n
            fit("wooden-box", dict(s, y=y0 + hh * (q + 0.5), h=hh), area, "Props", yaw_extra=(math.pi / 2 if q % 2 else 0))
        return
    if k in ("crate", "cart") and sid != "lower-alley-cart":
        fit("wooden-box", s, area, "Props")
        return
    if k == "cart":
        mesh = bucket(area, "Props")
        box(mesh, x0, x1, y0 + 0.35, y1, z0, z1, M["wood"])
        for zz in (z0 + 0.4, z1 - 0.4):
            cylinder(mesh, x0 - 0.0, zz, y0, y0 + 0.01, 0.01, 0.01, M["wood"], n=4)
        return
    if k == "generator":
        if not fit("generator", s, area, "Industrial"):
            stone_block(bucket(area, "Industrial"), s, M["rustpaint"])
        return
    if k == "dock":
        mesh = bucket(area, "Industrial")
        box(mesh, x0, x1, y0, y1, z0, z1, M["concrete"], top=M["garage"])
        # hazard edge on the courtyard side and black rubber bumpers
        quad(bucket(area, "Decals"), [(x1 - 0.35, y1 + 0.006, z1), (x1, y1 + 0.006, z1), (x1, y1 + 0.006, z0), (x1 - 0.35, y1 + 0.006, z0)],
             M["decal"], uvs=atlas_uv(DC["hazardline"]))
        for zz in range(int(z0) + 2, int(z1), 3):
            box(mesh, x1 - 0.02, x1, y0 + 0.4, y1 - 0.1, zz, zz + 0.5, M["metal"], cols=[(0.15, 0.15, 0.15)] * 4)
        return
    if k == "pad":
        mesh = bucket(area, "Industrial")
        box(mesh, x0, x1, y0, y1, z0, z1, M["concrete"])
        return
    if k == "boiler":
        boiler(area, s)
        return
    if k in ("jersey",):
        jersey(bucket(area, "Props"), s)
        return
    if k == "kiosk":
        mesh = bucket(area, "Props")
        box(mesh, x0, x1, y0, y1, z0, z1, M["wood"], cols=[(0.5, 0.62, 0.55)] * 4)
        return
    if k == "stall":
        stall(area, s)
        return
    if k == "fountain":
        if sid == "b-fountain":
            fountain(area, s)
        else:
            fountain_column(area, s)
        return
    if k in ("stone-wall", "terrace", "pier", "trough", "planter"):
        mesh = bucket(area, "Props")
        stone_block(mesh, s, M["rubble"] if k == "stone-wall" else M["sandstone"], top=M["sandstone"])
        if k == "planter":
            place("plant", area, "Vegetation", s["x"], y1, s["z"], 0.7, 0.9, 0.7)
        if k == "trough":
            quad(mesh, [(x0 + 0.15, y1 - 0.15, z1 - 0.15), (x1 - 0.15, y1 - 0.15, z1 - 0.15), (x1 - 0.15, y1 - 0.15, z0 + 0.15), (x0 + 0.15, y1 - 0.15, z0 + 0.15)],
                 M["trim2"], uvs=atlas_uv(T2["glassroof"]))
        return
    if k == "wagon":
        wagon(area, s)
        return
    if k == "buffer":
        mesh = bucket(area, "Industrial")
        box(mesh, x0, x1, y0, y1, z0, z1, M["rustpaint"], cols=[(0.7, 0.2, 0.15)] * 4)
        return
    if k == "booth":
        mesh = bucket(area, "Props")
        box(mesh, x0, x1, y0, y1 - 0.15, z0, z1, M["plaster"], cols=[(0.9, 0.9, 0.86)] * 4)
        box(mesh, x0, x1, y1 - 0.15, y1, z0, z1, M["metal"], cols=[(0.4, 0.42, 0.42)] * 4)
        return
    if k in ("car",):
        if not fit("van", s, area, "Vehicles", along="x"):
            stone_block(bucket(area, "Vehicles"), s, M["metal"])
        return
    if k == "bins":
        place("drum-grey", area, "Props", s["x"], y0, s["z"] - 0.35, 0.58, s["h"] - 0.02, 0.58)
        place("drum-blue", area, "Props", s["x"], y0, s["z"] + 0.45, 0.58, s["h"] - 0.02, 0.58)
        return
    if k == "pump":
        if not fit("generator", s, area, "Tunnel"):
            stone_block(bucket("Tunnel", "Tunnel"), s, M["rustpaint"])
        return
    if k == "pipe":
        mesh = bucket("Tunnel", "Props")
        long_x = (x1 - x0) >= (z1 - z0)
        r = min(s["d"] if long_x else s["w"], s["h"]) / 2 - 0.02
        if long_x:
            tube(mesh, [(x0, y0 + r + 0.02, s["z"]), (x1, y0 + r + 0.02, s["z"])], r, M["rustpaint"], sides=8)
        else:
            tube(mesh, [(s["x"], y0 + r + 0.02, z0), (s["x"], y0 + r + 0.02, z1)], r, M["rustpaint"], sides=8)
        return
    if k in ("furniture", "counter", "bench", "shelving"):
        mesh = bucket(area, "Interiors")
        box(mesh, x0, x1, y0, y1, z0, z1, M["wood"] if k != "shelving" else M["rustpaint"],
            cols=[(0.62, 0.48, 0.35)] * 4 if k != "shelving" else [(0.4, 0.45, 0.5)] * 4)
        return
    if k == "racking":
        racking(area, s)
        return
    if k == "post":
        box(bucket(area, "Industrial"), x0, x1, y0, y1, z0, z1, M["rustpaint"], cols=[(0.85, 0.7, 0.2)] * 4)
        return
    if k == "column":
        mesh = bucket(area, "Buildings")
        cylinder(mesh, s["x"], s["z"], y0, y1, min(s["w"], s["d"]) / 2 - 0.01, min(s["w"], s["d"]) / 2 - 0.03, M["sandstone"], n=12)
        return
    if k == "crane":
        mesh = bucket(area, "Industrial")
        box(mesh, x0, x1, y0, y1, z0, z1, M["rustpaint"], cols=[(1.0, 0.85, 0.3)] * 4)
        return
    if k == "door":
        box(bucket(area, "Buildings"), x0, x1, y0, y1, z0, z1, M["wood"] if s["surface"] == "wood" else M["metal"],
            cols=[(0.55, 0.42, 0.3)] * 4 if s["surface"] == "wood" else [(0.5, 0.52, 0.5)] * 4)
        return
    if k in ("blast-wall", "wall") and not sid.startswith(("cr-", "hall-", "mh-", "apt-", "annex-", "boiler-", "mid-gate")):
        stone_block(bucket(area, "Props"), s, M["concrete"])
        return
    if k in ("wall", "building", "interior", "gate"):
        dress_wall_piece(s)
        return
    if k == "roof":
        mesh = bucket(area, "Roofs")
        box(mesh, x0, x1, y0, y1, z0, z1, M["concrete"], top=M["rooftile"], bottom=True)
        return
    if k in ("forklift", "vehicle"):
        return  # vehicles are placed from VEHICLES
    if k == "prop":
        dress_prop(s)
        return
    # fallback
    stone_block(bucket(area, "Props"), s, M["concrete"])


def dress_vehicles():
    for vid, v in VEH.items():
        area = area_at((v["x0"] + v["x1"]) / 2, (v["z0"] + v["z1"]) / 2, v["base"] + 0.3)
        model = {"forklift": "forklift", "truck": "truck", "van": "van"}[v["model"]]
        L_ = v["z1"] - v["z0"]
        Wd = v["x1"] - v["x0"]
        # library long axis along X; the layout's vehicles run along z with the nose at z0
        place(model, area, "Vehicles", (v["x0"] + v["x1"]) / 2, v["base"], (v["z0"] + v["z1"]) / 2, L_ * 0.98, v["h"] * 0.98, Wd * 0.98,
              yaw=math.pi / 2)


def dress_structure(s):
    k, sid = s["kind"], s["id"]
    x0, x1, y0, y1, z0, z1 = sb(s)
    area = area_at(s["x"], s["z"], y0 - 0.5)
    mesh = bucket(area, "Roofs")
    if k == "roof":
        mat = M["metal"] if sid.startswith(("a-roof", "hall", "b-bay")) else M["concrete"]
        tint = [(0.62, 0.3, 0.24)] * 4 if sid.startswith(("hall", "a-roof")) else None
        box(mesh, x0, x1, y0, y1, z0, z1, mat, bottom=True, cols=tint, top=M["rooftile"] if sid.startswith(("mh", "apt")) else None)
    elif k == "beam":
        box(mesh, x0, x1, y0, y1, z0, z1, M["rustpaint"], bottom=True, cols=[(0.35, 0.36, 0.36)] * 4)
    elif k == "crane":
        box(mesh, x0, x1, y0, y1, z0, z1, M["rustpaint"], bottom=True, cols=[(1.0, 0.85, 0.3)] * 4)
    elif k == "arch":
        box(mesh, x0, x1, y0, y1, z0, z1, M["sandstone"], bottom=True)
    else:
        box(mesh, x0, x1, y0, y1, z0, z1, M["concrete"], bottom=True)


def dress_railing(s):
    x0, x1, y0, y1, z0, z1 = sb(s)
    area = area_at(s["x"], s["z"], y0 + 0.3)
    mesh = bucket(area, "Railings")
    yellow = s["id"].startswith(("a-catwalk", "cr-"))
    long_x = (x1 - x0) >= (z1 - z0)
    if yellow:  # tube rails: top rail, knee rail, posts every 1.5 m (painted safety yellow)
        c = (s["z"] if long_x else s["x"])
        for yy in (y1 - 0.04, y0 + 0.5):
            pts = [(x0, yy, c), (x1, yy, c)] if long_x else [(c, yy, z0), (c, yy, z1)]
            tube(mesh, pts, 0.03, M["rustpaint"], sides=6)
        n = max(1, int((x1 - x0 if long_x else z1 - z0) / 1.5))
        for k in range(n + 1):
            a = (x0 + (x1 - x0) * k / n) if long_x else (z0 + (z1 - z0) * k / n)
            p0, p1 = ((a, y0, c), (a, y1, c)) if long_x else ((c, y0, a), (c, y1, a))
            tube(mesh, [p0, p1], 0.025, M["rustpaint"], sides=4)
        return
    # wrought iron (alpha card, double-sided), one atlas repeat per ~1.1 m of railing
    a0, a1 = (x0, x1) if long_x else (z0, z1)
    n = max(1, round((a1 - a0) / 1.1))
    for k in range(n):
        b0, b1 = a0 + (a1 - a0) * k / n, a0 + (a1 - a0) * (k + 1) / n
        if long_x:
            pts = [(b0, y0, s["z"]), (b1, y0, s["z"]), (b1, y1, s["z"]), (b0, y1, s["z"])]
        else:
            pts = [(s["x"], y0, b1), (s["x"], y0, b0), (s["x"], y1, b0), (s["x"], y1, b1)]
        quad(mesh, pts, M["trim2"], uvs=atlas_uv(T2["ironrail"]))


# =============================================================================== landmarks
def chimney(x, z, y0, h, r):
    mesh = bucket("A Main", "Landmarks")
    cylinder(mesh, x, z, y0, y0 + h, r * 1.15, r, M["brick"], n=16, caps=False, tile=2.0)
    cylinder(mesh, x, z, y0 + h, y0 + h + 1.6, r, r * 1.08, M["trim2"], n=16, caps=True, tile=1.0)


def tower_crane(x, z, y0, h, jib_yaw):
    mesh = bucket("Mid", "Landmarks")
    yel = [(1.0, 0.82, 0.25)] * 4
    s = 0.8
    # lattice mast: four chords and diagonal braces every 2 m
    for (dx, dz) in ((-s, -s), (s, -s), (s, s), (-s, s)):
        tube(mesh, [(x + dx, y0, z + dz), (x + dx, y0 + h, z + dz)], 0.07, M["rustpaint"], sides=4)
    for k in range(int(h // 2)):
        yy = y0 + k * 2
        for (a, b) in (((-s, -s), (s, -s)), ((s, -s), (s, s)), ((s, s), (-s, s)), ((-s, s), (-s, -s))):
            tube(mesh, [(x + a[0], yy, z + a[1]), (x + b[0], yy + 2, z + b[1])], 0.04, M["rustpaint"], sides=3)
    c, sn = math.cos(jib_yaw), math.sin(jib_yaw)
    top = y0 + h
    box(mesh, x - 1.2, x + 1.2, top, top + 2.2, z - 1.2, z + 1.2, M["metal"], cols=[(0.9, 0.88, 0.8)] * 4)  # slewing unit/cab
    for side in (-0.6, 0.6):
        tube(mesh, [(x - sn * side, top + 2.2, z + c * side), (x + c * 32 - sn * side, top + 2.2, z + sn * 32 + c * side)], 0.08, M["rustpaint"], sides=4)
    tube(mesh, [(x, top + 3.4, z), (x + c * 32, top + 2.2, z + sn * 32)], 0.06, M["rustpaint"], sides=4)
    tube(mesh, [(x, top + 6.0, z), (x + c * 18, top + 2.6, z + sn * 18)], 0.04, M["metal"], sides=3)
    tube(mesh, [(x, top + 6.0, z), (x - c * 10, top + 2.6, z - sn * 10)], 0.04, M["metal"], sides=3)
    tube(mesh, [(x, top + 2.2, z), (x, top + 6.0, z)], 0.12, M["rustpaint"], sides=4)
    # counter-jib with its concrete counterweight
    tube(mesh, [(x, top + 2.2, z), (x - c * 11, top + 2.2, z - sn * 11)], 0.1, M["rustpaint"], sides=4)
    cx, cz = x - c * 10, z - sn * 10
    box(mesh, cx - 1.0, cx + 1.0, top, top + 2.0, cz - 1.0, cz + 1.0, M["concrete"])
    # hook block hanging at the jib's middle
    hx, hz = x + c * 18, z + sn * 18
    tube(mesh, [(hx, top + 2.2, hz), (hx, top - 6.0, hz)], 0.015, M["metal"], sides=3)
    box(mesh, hx - 0.25, hx + 0.25, top - 6.6, top - 6.0, hz - 0.2, hz + 0.2, M["rustpaint"], cols=yel)


def mountains():
    mesh = bucket("Exterior", "Backdrop")
    segs = 24
    r = 240.0
    for i in range(segs):
        a0, a1 = i / segs * math.tau, (i + 1) / segs * math.tau
        h0 = 26 + 30 * value_noise(math.cos(a0) * 50, math.sin(a0) * 50, 40, 3)
        h1 = 26 + 30 * value_noise(math.cos(a1) * 50, math.sin(a1) * 50, 40, 3)
        p = [(math.cos(a0) * r, -2, math.sin(a0) * r), (math.cos(a1) * r, -2, math.sin(a1) * r),
             (math.cos(a1) * r, h1, math.sin(a1) * r), (math.cos(a0) * r, h0, math.sin(a0) * r)]
        quad(mesh, p, M["trim2"], uvs=atlas_sub(T2["mountain"], 0.0, 1.0, 0.0, 1.0), cols=[(0.86, 0.9, 0.95)] * 4)
    g = bucket("Exterior", "Backdrop")
    for (xa, xb, za, zb) in ((-260, 260, -260, -HD), (-260, 260, HD, 260), (-260, -HW, -HD, HD), (HW, 260, -HD, HD)):
        quad(g, [(xa, 0.6, zb), (xb, 0.6, zb), (xb, 0.6, za), (xa, 0.6, za)], M["cobble"], cols=[(0.55, 0.52, 0.45)] * 4)


def cables():
    for (a, b) in (((-10, 7.6, 30), (-10, 7.4, 36)), ((8, 7.0, 34), (8, 7.4, 38)), ((24, 7.2, 30), (26, 7.0, 36)),
                   ((34, 6.8, 2), (39, 7.0, 0)), ((-32, 7.5, -2), (-36, 7.2, -4)), ((22, 7.6, -40), (18, 7.2, -36)),
                   ((-4, 7.0, -10), (6, 7.0, -12)), ((40, 7.2, 20), (44, 7.0, 22))):
        area = area_at((a[0] + b[0]) / 2, (a[2] + b[2]) / 2)
        pts = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 0.5 * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t)
               for t in [q / 8 for q in range(9)]]
        tube(bucket(area, "Props"), pts, 0.018, M["metal"], sides=4)


def site_letters():
    for k, v in SITES.items():
        y = v["y0"] + (0.2 if k == "A" else 0.2)
        x, z = (v["x0"] + v["x1"]) / 2, (v["z0"] + v["z1"]) / 2
        if k == "A":
            x, z, y = -36.0, -16.0, 1.2
        else:
            x, z, y = 25.0, -16.5, 2.4
        area = area_at(x, z, y + 0.2)
        mesh = bucket(area, "Decals")
        s_ = 2.6
        quad(mesh, [(x - s_ / 2, y + 0.012, z + s_ / 2), (x + s_ / 2, y + 0.012, z + s_ / 2), (x + s_ / 2, y + 0.012, z - s_ / 2), (x - s_ / 2, y + 0.012, z - s_ / 2)],
             M["decal"], uvs=atlas_uv(DC["letter" + k]), cols=[(0.95, 0.9, 0.82)] * 4)


def ground_decals():
    """Cracks, oil, stains and drains on the floors (alpha, no shadow)."""
    rng = random.Random(7)
    for r in REGIONS:
        name, x0, x1, z0, z1, y = r
        if y < 0.5 or name.endswith(("stairs", "steps", "ramp", "lane")):
            continue
        n = int((x1 - x0) * (z1 - z0) / 40)
        for _ in range(n):
            x, z = rng.uniform(x0 + 1, x1 - 1), rng.uniform(z0 + 1, z1 - 1)
            if region_at(x, z) is not r:
                continue
            cell = rng.choice(["cracks", "stain", "oil", "stain", "drain"] if y < 2 else ["cracks", "stain", "pebbles", "drain"])
            s_ = rng.uniform(1.0, 2.4) if cell != "drain" else 0.6
            yaw = rng.uniform(0, math.pi)
            c, sn = math.cos(yaw), math.sin(yaw)
            pts = [(x + a * c - b * sn, y + 0.01, z + a * sn + b * c) for a, b in ((-s_ / 2, s_ / 2), (s_ / 2, s_ / 2), (s_ / 2, -s_ / 2), (-s_ / 2, -s_ / 2))]
            quad(bucket(area_at(x, z, y + 0.1), "Decals"), pts, M["decal"], uvs=atlas_uv(DC[cell]))
    # the tunnel's drainage channel (dark wet strip down the middle of each leg)
    for _, x0, x1, z0, z1 in TUNNELS:
        long_x = (x1 - x0) >= (z1 - z0)
        c = (z0 + z1) / 2 if long_x else (x0 + x1) / 2
        pts = [(x0, 0.01, c + 0.25), (x1, 0.01, c + 0.25), (x1, 0.01, c - 0.25), (x0, 0.01, c - 0.25)] if long_x else \
            [(c - 0.25, 0.01, z1), (c + 0.25, 0.01, z1), (c + 0.25, 0.01, z0), (c - 0.25, 0.01, z0)]
        quad(bucket("Tunnel", "Decals"), pts, M["decal"], uvs=atlas_uv(DC["oil"]))


def dress_prop(s):
    """A dressing prop: the model named in the id, fitted to its collision box."""
    model = s["id"][len("prop-"):].rsplit("-", 1)[0]
    x0, x1, y0, y1, z0, z1 = sb(s)
    area = area_at(s["x"], s["z"], y0 + 0.2)
    if model in ("gas-cylinder", "gas-cylinder-2", "drum-red", "drum-blue", "drum-grey", "drum-green", "barrel", "plant", "oil-can"):
        place(model, area, "Props", s["x"], y0, s["z"], s["w"] - 0.02, s["h"] - 0.01, s["d"] - 0.02)
    else:
        fit(model, s, area, "Props")


def wall_decor():
    """Wall-mounted and overhead decoration above every reach (no collision needed): the airducts
    high on the shipping hall's north wall."""
    for k in range(4):
        place("airduct", "A Main", "Props", -38 + k * 3.2, 6.4, -10.0, 1.46, 0.87, 0.55, 0.0)


# =============================================================================== build
for s in SOLIDS:
    k = s["kind"]
    if k == "building":
        dress_building(s)
    elif k == "ground":
        dress_fill(s)
    elif k == "tunnel-ceiling":
        dress_tunnel_ceiling(s)
    elif k in ("stair", "ramp"):
        dress_stair(s)
    elif k in ("slab", "catwalk", "balcony"):
        dress_slab(s)
    else:
        dress_cover(s)
ramps()
ground()
for s in STRUCT:
    dress_structure(s)
for s in BARR:
    dress_railing(s)
dress_vehicles()
rails_in_yard()
site_letters()
ground_decals()
wall_decor()
cables()
mountains()
chimney(-44.5, -4.0, TOP, 24.0, 1.3)
tower_crane(13.0, 0.0, TOP, 22.0, math.radians(200))

for (area, cat), mesh in _buckets.items():
    if len(mesh):
        shadow = cat not in ("Decals", "Vegetation", "Backdrop", "Lamps", "Railings")
        o = mesh.obj(f"{area}-{cat}".replace(" ", "_"), LAY.get(area, cat), shadow=shadow)

if BLEND:
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND), relative_remap=True)


# =============================================================================== merge + export
def join_static(objs, name):
    by = {}
    for o in objs:
        if o.type == "MESH" and not o.get("instance"):
            by.setdefault(bool(o.get("noShadow")), []).append(o)
    for ns, group in by.items():
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
