"""
Build the detailed LOST TRAIL jungle in Blender from build/layout.json (layout.py), the EZ-Tree
skeletons (trees/generate_trees.mjs → build/trees) and the textures (textures.py → build/tex).

  python build_trail.py -- <out.glb> [--blend out.blend]

Rules (see docs/FPS-LOST-TRAIL.md):
- Gameplay solids are dressed inside their collision boxes, so what stops bullets is what you
  see. Large trunks inside the arena are gameplay trunks; decorative trees inside the arena are
  slender, and big trees stand beyond the edge or in the impassable jungle.
- Repeated plants and trees are linked duplicates of a small library (one mesh each), which
  gltf-transform turns into GPU instances. Objects are grouped into spatial sections so the
  renderer frustum-culls them; static meshes are merged per material inside a section.
- Detail by distance from the playable area: "near" trees at the edge, "far" further out, "bg"
  (decimated) for the background forest.
- Foliage cards are alpha-tested (glTF MASK), double-sided. Leaves cast into the static shadow
  map (rendered once), which gives the dappled canopy light at no per-frame cost.
"""
import bpy, bmesh, json, math, os, random, sys
from mathutils import Vector, Matrix, noise as mnoise

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index("--") + 1:]
OUT = argv[0]
BLEND = argv[argv.index("--blend") + 1] if "--blend" in argv else None
L = json.load(open(os.path.join(HERE, "build", "layout.json")))
TEX = os.path.join(HERE, "build", "tex")
TREES = os.path.join(HERE, "build", "trees")
W, D = L["arena"]["width"], L["arena"]["depth"]
rng = random.Random(4242)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene


def B(x, y, z):
    """Game/glTF (x, y up, z) → Blender (x, -z, y up)."""
    return Vector((x, -z, y))


# =============================================================================== materials
_images = {}


def image(name, data=False):
    if (name, data) not in _images:
        img = bpy.data.images.load(os.path.join(TEX, name + ".png"), check_existing=True)
        if data:
            img.colorspace_settings.name = "Non-Color"
        _images[(name, data)] = img
    return _images[(name, data)]


def material(name, albedo=None, normal=None, rough=None, color=(1, 1, 1), roughness=0.85, metal=0.0,
             alpha=False, double=False):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = roughness
    b.inputs["Metallic"].default_value = metal
    if albedo:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = image(albedo)
        if color != (1, 1, 1):
            mix = nt.nodes.new("ShaderNodeMix")
            mix.data_type = "RGBA"
            mix.blend_type = "MULTIPLY"
            mix.inputs["Factor"].default_value = 1.0
            nt.links.new(t.outputs["Color"], mix.inputs[6])
            mix.inputs[7].default_value = (*color, 1)
            nt.links.new(mix.outputs[2], b.inputs["Base Color"])
        else:
            nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
        if alpha:
            # Exported as glTF alphaMode MASK (alpha-tested cards, no sorting, no blending).
            clip = nt.nodes.new("ShaderNodeMath")
            clip.operation = "ROUND"
            nt.links.new(t.outputs["Alpha"], clip.inputs[0])
            nt.links.new(clip.outputs[0], b.inputs["Alpha"])
    else:
        b.inputs["Base Color"].default_value = (*color, 1)
    if normal:
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = image(normal, True)
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(n.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    if rough:
        r = nt.nodes.new("ShaderNodeTexImage")
        r.image = image(rough, True)
        nt.links.new(r.outputs["Color"], b.inputs["Roughness"])
    m.use_backface_culling = not double
    m.diffuse_color = (*color, 1)
    return m


M = {
    "bark": material("bark-jungle", "bark_jungle", "bark_jungle_n", "bark_jungle_r"),
    "bark-pale": material("bark-pale", "bark_pale", "bark_pale_n", "bark_pale_r"),
    "leaves-canopy": material("leaves-canopy", "leaves_canopy", "leaves_canopy_n", None, roughness=0.62, alpha=True, double=True),
    "leaves-broad": material("leaves-broad", "leaves_broad", "leaves_broad_n", None, roughness=0.58, alpha=True, double=True),
    "leaves-under": material("leaves-under", "leaves_understory", "leaves_understory_n", None, roughness=0.55, alpha=True, double=True),
    "frond-palm": material("frond-palm", "frond_palm", "frond_palm_n", None, roughness=0.6, alpha=True, double=True),
    "frond-fern": material("frond-fern", "frond_fern", "frond_fern_n", None, roughness=0.6, alpha=True, double=True),
    "floor": material("forest-floor", "forest_floor", "forest_floor_n", "forest_floor_r"),
    "mud": material("trail-mud", "trail_mud", "trail_mud_n", "trail_mud_r"),
    "rock": material("rock-moss", "rock_moss", "rock_moss_n", "rock_moss_r"),
    "ruin": material("ruin-stone", "ruin_stone", "ruin_stone_n", "ruin_stone_r"),
    "planks": material("planks-wet", "planks_wet", "planks_wet_n", "planks_wet_r"),
    "crate": material("crate-wood", "planks_wet", "planks_wet_n", "planks_wet_r", color=(1.25, 1.1, 0.85)),
    "sandbag": material("sandbag", "trail_mud", "trail_mud_n", None, color=(1.55, 1.7, 1.15), roughness=0.95),
    "tin": material("hut-tin", "hut_tin", "hut_tin_n", "hut_tin_r", metal=0.6),
    "water": material("river-water", None, "water_n", None, color=(0.025, 0.055, 0.045), roughness=0.28),
    "rope": material("rope", None, None, None, color=(0.45, 0.36, 0.22), roughness=0.95),
}
# World-space texture tile sizes (metres per repeat).
TILE = {"floor": 2.6, "mud": 3.0, "rock": 2.2, "ruin": 2.4, "planks": 1.6, "crate": 1.2, "sandbag": 0.8,
        "tin": 1.4, "bark": 2.0}


# =============================================================================== mesh building
class Mesh:
    """Accumulates polygons (Blender coords) with UVs and material slots, then makes an object."""

    def __init__(self):
        self.v, self.f, self.uv, self.mi, self.mats = [], [], [], [], []

    def slot(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def poly(self, pts, uvs, mat):
        base = len(self.v)
        self.v.extend(pts)
        self.f.append(list(range(base, base + len(pts))))
        self.uv.append(uvs)
        self.mi.append(self.slot(mat))

    def obj(self, name, coll, shadow=True):
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(p) for p in self.v], [], self.f)
        uvl = me.uv_layers.new(name="UVMap")
        i = 0
        for poly, uvs in zip(me.polygons, self.uv):
            for li, uv in zip(poly.loop_indices, uvs):
                uvl.data[li].uv = uv
        for m in self.mats:
            me.materials.append(m)
        for poly, mi in zip(me.polygons, self.mi):
            poly.material_index = mi
            poly.use_smooth = False
        me.validate()
        o = bpy.data.objects.new(name, me)
        if not shadow:
            o["noShadow"] = True
        coll.objects.link(o)
        return o


def world_uv(p, n, tile):
    """Box-projected world UVs (Blender coords) for planar faces."""
    a = max(range(3), key=lambda i: abs(n[i]))
    if a == 2:
        return (p.x / tile, p.y / tile)
    if a == 0:
        return (p.y / tile, p.z / tile)
    return (p.x / tile, p.z / tile)


def quad(mesh, pts, mat, tile):
    n = (pts[1] - pts[0]).cross(pts[2] - pts[0])
    if n.length < 1e-9:
        return
    n.normalize()
    mesh.poly(pts, [world_uv(p, n, tile) for p in pts], mat)


def box_faces(mesh, x0, x1, y0, y1, z0, z1, mat, tile, skip=(), top_mat=None, top_tile=None, wobble=0.0, seed=0):
    """Axis-aligned box in game coords (x, y up, z). `wobble` displaces subdivided faces inward."""
    c = [B(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    # corner index: (xi * 2 + yi) * 2 + zi
    faces = {
        "-x": (0, 1, 3, 2), "+x": (4, 6, 7, 5), "-y": (0, 4, 5, 1), "+y": (2, 3, 7, 6),
        "-z": (0, 2, 6, 4), "+z": (1, 5, 7, 3),
    }
    for key, idx in faces.items():
        if key in skip:
            continue
        pts = [c[i] for i in idx]
        m, t = (top_mat or mat, top_tile or tile) if key == "+y" else (mat, tile)
        if wobble and key != "-y":
            subdivided(mesh, pts, m, t, wobble, seed)
        else:
            quad(mesh, pts, m, t)


def subdivided(mesh, pts, mat, tile, wobble, seed, cells=None):
    """Face split into a grid; interior vertices pushed inward by noise (never outward)."""
    a, b, c, d = pts
    n = (b - a).cross(c - a).normalized()
    size = max((b - a).length, (d - a).length)
    k = cells or max(2, min(8, int(size / 0.6)))
    grid = [[None] * (k + 1) for _ in range(k + 1)]
    for i in range(k + 1):
        for j in range(k + 1):
            u, v = i / k, j / k
            p = a.lerp(b, u).lerp(d.lerp(c, u), v)
            edge = min(u, 1 - u, v, 1 - v)
            amp = wobble * min(1.0, edge * k)  # zero on the face border: no cracks between faces
            h = mnoise.noise(p * 0.9 + Vector((seed, seed * 0.3, 0)))
            grid[i][j] = p - n * (abs(h) * amp)
    for i in range(k):
        for j in range(k):
            q = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]]
            mesh.poly(q, [world_uv(p, n, tile) for p in q], mat)


def cylinder(mesh, x, z, y0, y1, r0, r1, mat, tile=1.0, n=12, axis="y", caps=True):
    """Cylinder (game coords) along y, x or z through (x, y?, z)."""
    rings = []
    for y, r in ((y0, r0), (y1, r1)):
        ring = []
        for i in range(n):
            a = 2 * math.pi * i / n
            if axis == "y":
                ring.append(B(x + math.cos(a) * r, y, z + math.sin(a) * r))
            elif axis == "x":
                ring.append(B(y, x + math.cos(a) * r, z + math.sin(a) * r))
            else:
                ring.append(B(x + math.cos(a) * r, z + math.sin(a) * r, y))
        rings.append(ring)
    length = abs(y1 - y0)
    for i in range(n):
        j = (i + 1) % n
        q = [rings[0][i], rings[0][j], rings[1][j], rings[1][i]]
        mesh.poly(q, [(i / n * 3, 0), ((i + 1) / n * 3, 0), ((i + 1) / n * 3, length / tile), (i / n * 3, length / tile)], mat)
    if caps:
        for k, ring in enumerate(rings):
            pts = ring if k else list(reversed(ring))
            mesh.poly(pts, [(0.5 + 0.5 * math.cos(2 * math.pi * i / n), 0.5 + 0.5 * math.sin(2 * math.pi * i / n)) for i in range(n)], mat)


# =============================================================================== collections
root = bpy.data.collections.new("lost-trail")
sc.collection.children.link(root)
library = bpy.data.collections.new("library")  # unlinked from the scene before export
sc.collection.children.link(library)
_sections = {}


def section(name):
    if name not in _sections:
        c = bpy.data.collections.new(name)
        root.children.link(c)
        _sections[name] = c
    return _sections[name]


def section_of(x, z):
    if abs(x) > W / 2 + 4 or abs(z) > D / 2 + 4:
        # Background quadrants: culled as a block when the player looks away.
        return "bg-" + ("w" if x < 0 else "e") + ("n" if z < 0 else "s")
    sx = "west" if x < -7.5 else "east" if x > 7.5 else "centre"
    sz = "north" if z < -6 else "south" if z > 6 else "mid"
    return f"{sx}-{sz}"


def veg_section(x, z):
    """Coarse culling sections for instanced vegetation: arena quadrants, background quadrants."""
    q = ("w" if x < 0 else "e") + ("n" if z < 0 else "s")
    return section(("bg-" if max(abs(x) - W / 2, abs(z) - D / 2) > 6.5 else "veg-") + q)


def instance(lib_obj, x, y, z, yaw=0.0, scale=1.0, sx=None, coll=None, name=None):
    o = bpy.data.objects.new(name or lib_obj.name.replace("lib-", "i-"), lib_obj.data)
    o.location = B(x, y, z)
    o.rotation_euler = (0, 0, yaw)
    s = sx or (scale, scale, scale)
    o.scale = s
    o["instance"] = True
    if lib_obj.get("noShadow"):
        o["noShadow"] = True
    (coll or veg_section(x, z)).objects.link(o)
    return o


# =============================================================================== tree library
# EZ-Tree units → metres: emergent ≈ 33 m, hardwood ≈ 27 m, broad ≈ 23 m, slender ≈ 12 m,
# twisted ≈ 14 m (the brief's 15–35 m canopy, 4–15 m midstory).
ARCH_SCALE = {"emergent": 0.66, "hardwood": 0.72, "broad": 0.66, "slender": 0.85, "twisted": 0.8}


def import_tree(arch, seed, detail):
    path = os.path.join(TREES, f"{arch}-{seed}-{detail}.obj")
    before = set(bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=path, forward_axis="NEGATIVE_Z", up_axis="Y")
    objs = [o for o in bpy.data.objects if o not in before]
    for o in objs:
        for c in o.users_collection:
            c.objects.unlink(o)
        library.objects.link(o)
    # The importer puts the Y-up → Z-up conversion on the objects: bake it into the meshes,
    # since instances share only the mesh data. Then scale to the archetype's real height.
    with bpy.context.temp_override(selected_editable_objects=objs, active_object=objs[0]):
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    s = ARCH_SCALE[arch]
    for o in objs:
        o.data.transform(Matrix.Scale(s, 4))
    bark = next(o for o in objs if o.name.startswith("bark"))
    leaves = next(o for o in objs if o.name.startswith("leaves"))
    pale = arch in ("slender", "broad")
    bark.data.materials.clear()
    bark.data.materials.append(M["bark-pale" if pale else "bark"])
    leaves.data.materials.clear()
    leaves.data.materials.append(M["leaves-canopy" if arch in ("emergent", "hardwood") else "leaves-broad"])
    with bpy.context.temp_override(active_object=bark, selected_editable_objects=[bark, leaves]):
        bpy.ops.object.join()
    bark.name = f"lib-{arch}-{seed}-{detail}"
    bark.data.name = bark.name
    return bark


def add_buttress(obj, base_r, fins=5, height=2.6, reach=1.25, seed=0):
    """Buttress-root fins: thin flared plates radiating from the trunk base, joined into obj."""
    r = random.Random(seed)
    m = Mesh()
    for i in range(fins):
        a = 2 * math.pi * (i + r.uniform(-0.15, 0.15)) / fins
        ca, sa = math.cos(a), math.sin(a)
        out = base_r + reach * r.uniform(0.75, 1.15)
        h = height * r.uniform(0.75, 1.1)
        th = 0.09
        prof = [(base_r * 0.7, 0), (out, 0), (out * 0.92, 0.12), (base_r + (out - base_r) * 0.45, h * 0.35), (base_r * 0.85, h)]
        for side in (-1, 1):
            px, pz = -sa * th * side, ca * th * side
            pts = [Vector((ca * d + px, -(sa * d + pz), y)) for d, y in prof]
            uvs = [(d / 1.5, y / 1.5) for d, y in prof]
            m.poly(pts if side > 0 else list(reversed(pts)), uvs if side > 0 else list(reversed(uvs)), M["bark"])
        # Top edge strip closing the fin.
        for k in range(len(prof) - 1):
            (d0, y0), (d1, y1) = prof[k], prof[k + 1]
            q = [Vector((ca * d0 - sa * th, -(sa * d0 + ca * th), y0)), Vector((ca * d1 - sa * th, -(sa * d1 + ca * th), y1)),
                 Vector((ca * d1 + sa * th, -(sa * d1 - ca * th), y1)), Vector((ca * d0 + sa * th, -(sa * d0 - ca * th), y0))]
            m.poly(q, [(0, 0), (1, 0), (1, 0.1), (0, 0.1)], M["bark"])
    tmp = m.obj("tmp-fins", library)
    with bpy.context.temp_override(active_object=obj, selected_editable_objects=[obj, tmp]):
        bpy.ops.object.join()


def background_level(src, keep=0.45, grow=1.35):
    """'bg' detail: decimated bark, fewer and larger leaf cards (whole cards kept)."""
    o = src.copy()
    o.data = src.data.copy()
    o.name = src.name.replace("-far", "-bg")
    o.data.name = o.name
    library.objects.link(o)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    leaf_slot = next(i for i, m in enumerate(o.data.materials) if m.name.startswith("leaves"))
    r = random.Random(7)
    # Leaf cards are separate islands of 2 triangles / 1 quad: drop by island.
    bm.faces.ensure_lookup_table()
    drop, seen = [], set()
    for f in bm.faces:
        if f.material_index != leaf_slot or f in seen:
            continue
        island = {f}
        stack = [f]
        while stack:
            g = stack.pop()
            for e in g.edges:
                for h in e.link_faces:
                    if h not in island:
                        island.add(h)
                        stack.append(h)
        seen |= island
        if r.random() > keep:
            drop.extend(island)
        else:
            c = sum((v.co for g in island for v in g.verts), Vector()) / sum(len(g.verts) for g in island)
            for v in {v for g in island for v in g.verts}:
                v.co = c + (v.co - c) * grow
    bmesh.ops.delete(bm, geom=list(set(drop)), context="FACES")
    bm.to_mesh(o.data)
    bm.free()
    mod = o.modifiers.new("dec", "DECIMATE")
    mod.ratio = 0.4
    with bpy.context.temp_override(object=o, active_object=o):
        bpy.ops.object.modifier_apply(modifier="dec")
    return o


LIB = {}
for arch in ("emergent", "hardwood", "broad", "slender", "twisted"):
    for seed in (11, 23):
        for detail in ("near", "far"):
            o = import_tree(arch, seed, detail)
            if arch in ("emergent", "hardwood", "broad"):
                base_r = {"emergent": 1.15, "hardwood": 0.8, "broad": 0.9}[arch] * ARCH_SCALE[arch]
                add_buttress(o, base_r * 0.95, fins=5 if arch == "emergent" else 4, height=2.8 if arch == "emergent" else 1.8,
                             reach=1.4 if arch == "emergent" else 0.9, seed=seed)
            LIB[(arch, seed, detail)] = o
        LIB[(arch, seed, "bg")] = background_level(LIB[(arch, seed, "far")])


def card_quad(m, center, right, up, w, h, mat, bend=0.0, segs=1):
    """A (bent) card from its base centre: `up` is the card's length direction."""
    pts_l, pts_r = [], []
    for k in range(segs + 1):
        t = k / segs
        p = center + up * (h * t) - Vector((0, 0, bend * h * t * t))
        pts_l.append(p - right * (w / 2))
        pts_r.append(p + right * (w / 2))
    for k in range(segs):
        q = [pts_l[k], pts_r[k], pts_r[k + 1], pts_l[k + 1]]
        m.poly(q, [(0, k / segs), (1, k / segs), (1, (k + 1) / segs), (0, (k + 1) / segs)], mat)


def lib_palm(seed):
    r = random.Random(seed)
    m = Mesh()
    height = r.uniform(9, 13)
    lean = Vector((r.uniform(-1, 1), r.uniform(-1, 1), 0)).normalized() * r.uniform(0.8, 2.0)
    prev = None
    segs = 10
    for k in range(segs + 1):
        t = k / segs
        c = lean * (t * t) + Vector((0, 0, height * t))
        rr = 0.2 - 0.06 * t
        ring = [c + Vector((math.cos(2 * math.pi * i / 8) * rr, math.sin(2 * math.pi * i / 8) * rr, 0)) for i in range(8)]
        if prev:
            for i in range(8):
                j = (i + 1) % 8
                m.poly([prev[i], prev[j], ring[j], ring[i]], [(i / 8, (k - 1) * 0.8), ((i + 1) / 8, (k - 1) * 0.8), ((i + 1) / 8, k * 0.8), (i / 8, k * 0.8)], M["bark-pale"])
        prev = ring
    top = lean + Vector((0, 0, height))
    for i in range(13):
        a = 2 * math.pi * i / 13 + r.uniform(-0.2, 0.2)
        d = Vector((math.cos(a), math.sin(a), 0))
        up = (d * 0.85 + Vector((0, 0, r.uniform(0.15, 0.55)))).normalized()
        card_quad(m, top, Vector((-d.y, d.x, 0)), up, r.uniform(1.6, 2.1), r.uniform(4.0, 5.2), M["frond-palm"], bend=0.45, segs=4)
    o = m.obj(f"lib-palm-{seed}", library)
    return o


def lib_fern(seed, size=1.0):
    r = random.Random(seed)
    m = Mesh()
    for i in range(10):
        a = 2 * math.pi * i / 10 + r.uniform(-0.2, 0.2)
        d = Vector((math.cos(a), math.sin(a), 0))
        up = (d * 0.75 + Vector((0, 0, r.uniform(0.35, 0.8)))).normalized()
        card_quad(m, Vector((0, 0, 0.02)), Vector((-d.y, d.x, 0)), up, 0.55 * size, r.uniform(1.1, 1.6) * size, M["frond-fern"], bend=0.35, segs=3)
    o = m.obj(f"lib-fern-{seed}", library, shadow=False)
    o["noShadow"] = True
    return o


def lib_bush(seed, size=1.0):
    r = random.Random(seed)
    m = Mesh()
    for i in range(7):
        a = math.pi * i / 7 + r.uniform(-0.1, 0.1)
        d = Vector((math.cos(a), math.sin(a), 0))
        off = Vector((r.uniform(-0.3, 0.3), r.uniform(-0.3, 0.3), 0))
        tilt = Vector((0, 0, 1)).lerp(d.cross(Vector((0, 0, 1))), r.uniform(-0.25, 0.25)).normalized()
        card_quad(m, off, d, tilt, 1.5 * size, r.uniform(1.2, 1.7) * size, M["leaves-under"], bend=0.05, segs=1)
    o = m.obj(f"lib-bush-{seed}", library, shadow=False)
    o["noShadow"] = True
    return o


def lib_vine(seed):
    """Hanging liana: a thin rope-like stem with leaf cards along it (hung from 16 m)."""
    r = random.Random(seed)
    m = Mesh()
    pts = []
    for k in range(9):
        t = k / 8
        pts.append(Vector((math.sin(t * 3 + seed) * 0.35, math.cos(t * 2 + seed) * 0.25, -t * r.uniform(9, 12))))
    for k in range(8):
        a, b = pts[k], pts[k + 1]
        side = Vector((0.03, 0, 0))
        m.poly([a - side, a + side, b + side, b - side], [(0, 0), (0.05, 0), (0.05, 1), (0, 1)], M["bark"])
        m.poly([a - Vector((0, 0.03, 0)), a + Vector((0, 0.03, 0)), b + Vector((0, 0.03, 0)), b - Vector((0, 0.03, 0))], [(0, 0), (0.05, 0), (0.05, 1), (0, 1)], M["bark"])
        if k > 1:
            d = Vector((math.cos(k * 2.1), math.sin(k * 2.1), 0))
            card_quad(m, b, d.cross(Vector((0, 0, 1))), (d + Vector((0, 0, -0.4))).normalized(), 0.8, 0.9, M["leaves-broad"], segs=1)
    o = m.obj(f"lib-vine-{seed}", library, shadow=False)
    o["noShadow"] = True
    return o


def lib_rock(seed, size=1.0):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
    for v in bm.verts:
        n = mnoise.noise(v.co * 1.6 + Vector((seed, 0, 0)))
        v.co *= 1 + 0.28 * n
        v.co.z *= 0.62
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, 0.25))
    for v in bm.verts:
        v.co *= size
    me = bpy.data.meshes.new(f"lib-rock-{seed}")
    bm.to_mesh(me)
    bm.free()
    uvl = me.uv_layers.new()
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uvl.data[li].uv = world_uv(co, poly.normal, TILE["rock"])
    me.materials.append(M["rock"])
    o = bpy.data.objects.new(me.name, me)
    library.objects.link(o)
    return o


PALMS = [lib_palm(s) for s in (1, 2)]
FERNS = [lib_fern(s, sz) for s, sz in ((4, 1.0), (6, 0.8))]
BUSHES = [lib_bush(s, sz) for s, sz in ((7, 1.0), (8, 1.3))]
VINES = [lib_vine(9)]
ROCKS = [lib_rock(s, sz) for s, sz in ((11, 1.0), (13, 0.7))]


# =============================================================================== playable-area tests
SOLIDS = L["solids"]
BOXES = [s for s in SOLIDS if s["layer"] == "box"]
BARRIERS = [s for s in SOLIDS if s["layer"] == "barrier"]
REG = L["regions"]


def inside(s, x, z, margin=0.0):
    return abs(x - s["x"]) < s["w"] / 2 - margin and abs(z - s["z"]) < s["d"] / 2 - margin


def in_arena(x, z, margin=0.0):
    return abs(x) < W / 2 - margin and abs(z) < D / 2 - margin


def in_jungle(x, z, margin=0.6):
    """Inside an impassable jungle zone (inside the arena) with a margin from its edge."""
    return any(s["kind"] in ("jungle", "edge") and inside(s, x, z, margin) for s in BARRIERS)


def lane_clear(x, z, r):
    """Nothing visual taller than ankle height within r of where players walk."""
    for gx in (-r, 0, r):
        for gz in (-r, 0, r):
            px, pz = x + gx, z + gz
            if in_arena(px, pz) and not any(inside(s, px, pz) for s in BARRIERS) and not any(inside(b, px, pz) for b in BOXES):
                return False
    return True


# =============================================================================== gameplay dressing
def rock_in_box(s, seed):
    """A rounded boulder that fills its collision box (vertices clamped to the box)."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
    hx, hy, hz = s["w"] / 2, s["h"] / 2, s["d"] / 2
    for v in bm.verts:
        n = mnoise.noise(v.co * 1.4 + Vector((seed * 1.7, 0, 0)))
        p = v.co * (1.25 + 0.18 * n)
        # Blender (x, y=-z, z=y): clamp to the box, keep the bottom flat on the ground.
        v.co = Vector((max(-hx, min(hx, p.x * hx)), max(-hz, min(hz, p.y * hz)), max(-hy, min(hy, p.z * hy))))
    c = B(s["x"], s["y"], s["z"])
    bmesh.ops.translate(bm, verts=bm.verts, vec=c)
    me = bpy.data.meshes.new(s["id"])
    bm.to_mesh(me)
    bm.free()
    uvl = me.uv_layers.new()
    for poly in me.polygons:
        for li in poly.loop_indices:
            uvl.data[li].uv = world_uv(me.vertices[me.loops[li].vertex_index].co, poly.normal, TILE["rock"])
    me.materials.append(M["rock"])
    o = bpy.data.objects.new(s["id"], me)
    section(section_of(s["x"], s["z"])).objects.link(o)


def extent(s):
    return (s["x"] - s["w"] / 2, s["x"] + s["w"] / 2, s["y"] - s["h"] / 2, s["y"] + s["h"] / 2, s["z"] - s["d"] / 2, s["z"] + s["d"] / 2)


def crate(m, x0, x1, y0, y1, z0, z1):
    box_faces(m, x0 + 0.012, x1 - 0.012, y0, y1 - 0.012, z0 + 0.012, z1 - 0.012, M["crate"], TILE["crate"], skip=("-y",))
    # Frame boards proud of the faces but inside the collision box.
    t = 0.07
    for (a0, a1, b0, b1) in ((x0, x0 + t, z0, z0 + t), (x1 - t, x1, z0, z0 + t), (x0, x0 + t, z1 - t, z1), (x1 - t, x1, z1 - t, z1)):
        box_faces(m, a0, a1, y0, y1, b0, b1, M["planks"], TILE["planks"], skip=("-y",))


dressed_trees = set()
hero = [LIB[("emergent", 23, "near")], LIB[("emergent", 11, "near")]]
for s in BOXES:
    k = s["kind"]
    x0, x1, y0, y1, z0, z1 = extent(s)
    sect = section(section_of(s["x"], s["z"]))
    m = Mesh()
    seed = sum(map(ord, s["id"])) % 97
    if k in ("trunk", "hero-trunk"):
        key = f'{s["tree"]}-{s["side"]}'
        if key in dressed_trees:
            continue
        dressed_trees.add(key)
        d = s["diameter"]
        lib = hero[len(dressed_trees) % 2]
        sc_ = (d / 2) / (1.15 * ARCH_SCALE["emergent"]) * 1.02
        instance(lib, s["x"], 0, s["z"], yaw=seed * 0.37, scale=sc_, name=f"hero-{key}")
        continue
    if k == "boulder":
        rock_in_box(s, seed)
        continue
    if k == "ridge":
        box_faces(m, x0, x1, y0, y1, z0, z1, M["rock"], TILE["rock"], skip=("-y",), top_mat=M["floor"], top_tile=TILE["floor"], wobble=0.0)
    elif k == "rock-wall":
        box_faces(m, x0, x1, y0, y1, z0, z1, M["rock"], TILE["rock"], skip=("-y",), wobble=0.14, seed=seed)
    elif k in ("ruin-wall",):
        box_faces(m, x0, x1, y0, y1, z0, z1, M["ruin"], TILE["ruin"], skip=("-y",), wobble=0.05, seed=seed)
    elif k == "stone-step":
        box_faces(m, x0, x1, y0, y1, z0, z1, M["ruin"], TILE["ruin"], skip=("-y",))
    elif k == "sandbags":
        # Rows of bags inside the box, staggered.
        rows = max(1, int(round((y1 - y0) / 0.24)))
        along_x = (x1 - x0) >= (z1 - z0)
        length = (x1 - x0) if along_x else (z1 - z0)
        for r_ in range(rows):
            bags = max(1, int(length / 0.62))
            off = 0.31 if r_ % 2 else 0.0
            for b_ in range(bags):
                a0 = min(length - 0.02, b_ * (length / bags) + off * (b_ < bags - 1))
                a1 = min(length, a0 + length / bags - 0.04)
                ya, yb = y0 + r_ * (y1 - y0) / rows, y0 + (r_ + 1) * (y1 - y0) / rows - 0.02
                if along_x:
                    box_faces(m, x0 + a0, x0 + a1, ya, yb, z0 + 0.01, z1 - 0.01, M["sandbag"], TILE["sandbag"], skip=("-y",), wobble=0.03, seed=seed + b_)
                else:
                    box_faces(m, x0 + 0.01, x1 - 0.01, ya, yb, z0 + a0, z0 + a1, M["sandbag"], TILE["sandbag"], skip=("-y",), wobble=0.03, seed=seed + b_)
    elif k in ("crate", "crate-stack"):
        n = max(1, int(round((y1 - y0) / 1.1)))
        for i in range(n):
            crate(m, x0, x1, y0 + i * (y1 - y0) / n, y0 + (i + 1) * (y1 - y0) / n, z0, z1)
    elif k == "log":
        along_x = (x1 - x0) >= (z1 - z0)
        r_ = min(y1 - y0, (z1 - z0) if along_x else (x1 - x0)) / 2
        if along_x:
            cylinder(m, (y0 + y1) / 2 if False else s["y"], s["z"], x0, x1, r_, r_ * 0.92, M["bark"], TILE["bark"], n=14, axis="x")
        else:
            cylinder(m, s["x"], s["y"], z0, z1, r_, r_ * 0.92, M["bark"], TILE["bark"], n=14, axis="z")
    elif k == "hut":
        box_faces(m, x0, x1, y0, y1 - 0.25, z0, z1, M["planks"], TILE["planks"], skip=("-y", "+y"))
        # Tin roof inside the box top (players can't reach 3 m; overhang stays within the box).
        box_faces(m, x0, x1, y1 - 0.25, y1, z0, z1, M["tin"], TILE["tin"], skip=("-y",))
        box_faces(m, x0 + 0.05, x1 - 0.05, y1 - 0.3, y1 - 0.25, z0 + 0.05, z1 - 0.05, M["planks"], TILE["planks"], skip=())
    elif k == "bridge-post":
        cylinder(m, s["x"], s["z"], y0, y1, min(x1 - x0, z1 - z0) / 2, min(x1 - x0, z1 - z0) / 2 * 0.9, M["bark"], TILE["bark"], n=10)
    else:
        box_faces(m, x0, x1, y0, y1, z0, z1, M["rock"], TILE["rock"], skip=("-y",))
    if m.f:
        m.obj(s["id"], sect)


# =============================================================================== terrain
def smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


GORGES = [(-12.6, -1.7), (1.7, 9.4)]
CROSSINGS = [(-15.4, -12.6), (9.4, 15.2)]


def river_x(z):
    """River centre line: straight through the arena, meandering beyond it."""
    out = max(0.0, abs(z) - D / 2)
    return math.sin(z * 0.08) * 6.0 * smooth(0, 12, out)


def ground_h(x, z):
    e = max(abs(x) - W / 2, abs(z) - D / 2)
    rx = river_x(z)
    if e < 0:
        # Inside the arena: flat where players walk; low mounds in the impassable jungle.
        h = 0.0
        for s in BARRIERS:
            if s["kind"] == "jungle" and inside(s, x, z, 0.9):
                dd = min(s["w"] / 2 - abs(x - s["x"]), s["d"] / 2 - abs(z - s["z"])) - 0.9
                h = max(h, smooth(0, 2.5, dd) * (0.5 + 0.4 * mnoise.noise(Vector((x * 0.3, z * 0.3, 1)))))
        if any(z0 <= z <= z1 for z0, z1 in CROSSINGS) and abs(x) < 2.6:
            return -0.12  # shallow riverbed under the crossings' water
        return h
    # Beyond the edge: hillsides rising into the forest, a river valley along x = river_x(z).
    hill = smooth(1.0, 14.0, e) * 5.0 + mnoise.noise(Vector((x * 0.08, z * 0.08, 3))) * 1.6 * smooth(0, 6, e)
    valley = smooth(7.0, 2.5, abs(x - rx))
    return hill * (1 - valley) + (-0.25) * valley


ground = Mesh()
EXT = 62.0
step_in, step_out = 1.0, 3.0
xs = [x for x in [-W / 2 - EXT + i * step_out for i in range(int(EXT / step_out))]] + \
     [-W / 2 + i * step_in for i in range(int(W / step_in) + 1)] + \
     [W / 2 + (i + 1) * step_out for i in range(int(EXT / step_out))]
zs = [z for z in [-D / 2 - EXT + i * step_out for i in range(int(EXT / step_out))]] + \
     [-D / 2 + i * step_in for i in range(int(D / step_in) + 1)] + \
     [D / 2 + (i + 1) * step_out for i in range(int(EXT / step_out))]
H = {(x, z): ground_h(x, z) for x in xs for z in zs}
for i in range(len(xs) - 1):
    for j in range(len(zs) - 1):
        xa, xb, za, zb = xs[i], xs[i + 1], zs[j], zs[j + 1]
        cx, cz = (xa + xb) / 2, (za + zb) / 2
        if abs(cx) < 2.6 and any(z0 < cz < z1 for z0, z1 in GORGES):
            continue  # the gorge (its walls and bed are built separately)
        pts = [B(xa, H[(xa, za)], za), B(xb, H[(xb, za)], za), B(xb, H[(xb, zb)], zb), B(xa, H[(xa, zb)], zb)]
        ground.poly(list(reversed(pts)), [world_uv(p, Vector((0, 0, 1)), TILE["floor"]) for p in reversed(pts)], M["floor"])
ground.obj("ground", section("ground"))

# Gorge: rock walls down to a stony bed, deep still water.
gm = Mesh()
for z0, z1 in GORGES:
    for side in (-1, 1):
        x = side * 2.6
        pts = [B(x, 0.0, z0), B(x, 0.0, z1), B(x, -2.4, z1), B(x, -2.4, z0)]
        if side < 0:
            pts = list(reversed(pts))
        subdivided(gm, pts, M["rock"], TILE["rock"], -0.25, 17 + side)  # bulge into the gorge
    quad(gm, [B(-2.6, -2.3, z0), B(2.6, -2.3, z0), B(2.6, -2.3, z1), B(-2.6, -2.3, z1)][::-1], M["mud"], TILE["mud"])
# Close both sides of every gorge face (walls are seen from the bridge and both banks).
for k in range(len(gm.f)):
    face = gm.f[k]
    base = len(gm.v)
    gm.v.extend(gm.v[i] for i in reversed(face))
    gm.f.append(list(range(base, base + len(face))))
    gm.uv.append(list(reversed(gm.uv[k])))
    gm.mi.append(gm.mi[k])
gm.obj("gorge", section("river"))
water = Mesh()
for z0, z1 in GORGES:
    quad(water, [B(-2.6, -1.55, z0), B(2.6, -1.55, z0), B(2.6, -1.55, z1), B(-2.6, -1.55, z1)][::-1], M["water"], 4.0)
for z0, z1 in CROSSINGS:
    quad(water, [B(-2.62, 0.04, z0), B(2.62, 0.04, z0), B(2.62, 0.04, z1), B(-2.62, 0.04, z1)][::-1], M["water"], 4.0)
# The river beyond the arena (north and south), following the valley.
for zs_ in ((-D / 2 - EXT, -D / 2 + 2.6), (D / 2 - 2.8, D / 2 + EXT)):
    za = zs_[0]
    while za < zs_[1]:
        zb = min(zs_[1], za + 3.0)
        xa, xb = river_x(za), river_x(zb)
        quad(water, [B(xa - 2.8, -0.1, za), B(xa + 2.8, -0.1, za), B(xb + 2.8, -0.1, zb), B(xb - 2.8, -0.1, zb)][::-1], M["water"], 4.0)
        za = zb
water.obj("river", section("river"), shadow=False)

# Bridge: deck at the walking height, under-beams, rope rails between the corner posts.
bm_ = Mesh()
box_faces(bm_, -2.95, 2.95, -0.16, 0.0, -1.72, 1.72, M["planks"], TILE["planks"])
for z in (-1.5, 0, 1.5):
    box_faces(bm_, -3.2, 3.2, -0.45, -0.16, z - 0.12, z + 0.12, M["bark"], TILE["bark"], skip=())
for zz in (-1.86, 1.86):
    for y in (0.75, 1.15):
        a, b = B(-2.78, y, zz), B(2.78, y - 0.08, zz)
        bm_.poly([a + Vector((0, 0.02, 0)), b + Vector((0, 0.02, 0)), b - Vector((0, 0.02, 0)), a - Vector((0, 0.02, 0))], [(0, 0), (1, 0), (1, 1), (0, 1)], M["rope"])
        bm_.poly([a + Vector((0, 0, 0.02)), b + Vector((0, 0, 0.02)), b - Vector((0, 0, 0.02)), a - Vector((0, 0, 0.02))], [(0, 0), (1, 0), (1, 1), (0, 1)], M["rope"])
bm_.obj("bridge", section("centre-mid"))

# Trails: muddy paths along the three routes (slightly above the ground, one height per route).
ROUTES = {
    0.012: [(-20, 0), (-17, 4.3), (-13.5, 4.4), (-8, 3.2), (-5.6, 2.6), (-3.2, 1.1)],
    0.016: [(-20, 0), (-17, -4.3), (-16.6, -5.4)],
    0.020: [(-16.6, 4.6), (-16.6, 12.4), (-8.2, 12.6), (-5, 12.6), (-2.7, 10.6)],
    0.024: [(-8.4, -14.2), (-2.7, -14.0)],
}
tm = Mesh()
for hgt, pts in ROUTES.items():
    for sign in (1, -1):
        P = [Vector((sign * x, z)) for x, z in pts]
        widths = [rng.uniform(1.8, 2.6) for _ in P]
        left, right = [], []
        for k, p in enumerate(P):
            a = P[max(0, k - 1)]
            b = P[min(len(P) - 1, k + 1)]
            d = (b - a).normalized()
            nrm = Vector((-d.y, d.x))
            left.append(p + nrm * widths[k] / 2)
            right.append(p - nrm * widths[k] / 2)
        for k in range(len(P) - 1):
            q = [B(left[k].x, hgt, left[k].y), B(right[k].x, hgt, right[k].y), B(right[k + 1].x, hgt, right[k + 1].y), B(left[k + 1].x, hgt, left[k + 1].y)]
            n = (q[1] - q[0]).cross(q[2] - q[0])
            if n.z < 0:
                q = list(reversed(q))
            tm.poly(q, [world_uv(p, Vector((0, 0, 1)), TILE["mud"]) for p in q], M["mud"])
tm.obj("trails", section("ground"))


# =============================================================================== forest placement
placed = {"near": 0, "far": 0, "bg": 0, "mid": 0, "palm": 0, "fern": 0, "bush": 0, "vine": 0, "rock": 0}
ARCHES = ["emergent", "hardwood", "broad", "twisted"]


# Variants by distance: every archetype near the arena, fewer (one seed) further out, where
# rotation and scale variation hide repetition.
VARIANTS = {"near": ["emergent", "hardwood", "broad", "twisted"], "far": ["emergent", "hardwood", "broad"], "bg": ["emergent", "broad"]}


def tree_at(x, z, detail, arch=None):
    arch = arch or rng.choice(VARIANTS[detail])
    lib = LIB[(arch, 11, detail)]
    instance(lib, x, ground_h(x, z), z, yaw=rng.uniform(0, math.tau), scale=rng.uniform(0.82, 1.18))
    placed[detail] += 1


def edge_distance(x, z):
    return max(abs(x) - W / 2, abs(z) - D / 2)


# Upper canopy and background: Poisson-ish jittered grid beyond the edge, detail by distance.
for band, (e0, e1, spacing, detail) in enumerate([(1.2, 6.5, 4.6, "near"), (6.5, 22.0, 6.0, "far"), (22.0, 52.0, 8.0, "bg")]):
    x = -W / 2 - e1
    while x <= W / 2 + e1:
        z = -D / 2 - e1
        while z <= D / 2 + e1:
            px, pz = x + rng.uniform(-spacing * 0.45, spacing * 0.45), z + rng.uniform(-spacing * 0.45, spacing * 0.45)
            e = edge_distance(px, pz)
            if e0 <= e < e1 and abs(px - river_x(pz)) > 4.0:
                if band == 0 and rng.random() < 0.22:
                    instance(rng.choice(PALMS), px, ground_h(px, pz), pz, yaw=rng.uniform(0, math.tau), scale=rng.uniform(0.85, 1.15))
                    placed["palm"] += 1
                else:
                    tree_at(px, pz, detail)
            z += spacing
        x += spacing

# Midstory and floor beyond the edge: slender trees, palms, ferns and bushes hide the tree feet.
for _ in range(520):
    px, pz = rng.uniform(-W / 2 - 14, W / 2 + 14), rng.uniform(-D / 2 - 14, D / 2 + 14)
    e = edge_distance(px, pz)
    if e < 0.6 or abs(px - river_x(pz)) < 3.2:
        continue
    r_ = rng.random()
    if r_ < 0.12:
        instance(LIB[("slender", 11, "far" if e > 4 else "near")], px, ground_h(px, pz), pz, yaw=rng.uniform(0, math.tau), scale=rng.uniform(0.8, 1.2))
        placed["mid"] += 1
    elif r_ < 0.6:
        instance(rng.choice(FERNS), px, ground_h(px, pz), pz, yaw=rng.uniform(0, math.tau), scale=rng.uniform(0.9, 1.5))
        placed["fern"] += 1
    else:
        instance(rng.choice(BUSHES), px, ground_h(px, pz), pz, yaw=rng.uniform(0, math.tau), scale=rng.uniform(0.9, 1.6))
        placed["bush"] += 1

# Inside the arena's impassable jungle: slender trees and palms (thin trunks), dense undergrowth.
for s in BARRIERS:
    if s["kind"] != "jungle":
        continue
    area = s["w"] * s["d"]
    for _ in range(int(area / 2.2)):
        px = rng.uniform(s["x"] - s["w"] / 2 + 0.5, s["x"] + s["w"] / 2 - 0.5)
        pz = rng.uniform(s["z"] - s["d"] / 2 + 0.5, s["z"] + s["d"] / 2 - 0.5)
        r_ = rng.random()
        y = ground_h(px, pz)
        if r_ < 0.12 and inside(s, px, pz, 1.0):
            instance(LIB[("slender", 11, "near")], px, y, pz, yaw=rng.uniform(0, math.tau), scale=rng.uniform(0.75, 1.05))
            placed["mid"] += 1
        elif r_ < 0.2 and inside(s, px, pz, 1.0):
            instance(rng.choice(PALMS), px, y, pz, yaw=rng.uniform(0, math.tau), scale=rng.uniform(0.7, 0.95))
            placed["palm"] += 1
        elif r_ < 0.65:
            instance(rng.choice(FERNS), px, y, pz, yaw=rng.uniform(0, math.tau), scale=rng.uniform(0.9, 1.4))
            placed["fern"] += 1
        elif r_ < 0.9:
            instance(rng.choice(BUSHES), px, y, pz, yaw=rng.uniform(0, math.tau), scale=rng.uniform(1.0, 1.5))
            placed["bush"] += 1
        else:
            instance(rng.choice(ROCKS), px, y - 0.15, pz, yaw=rng.uniform(0, math.tau), scale=rng.uniform(0.4, 0.8))
            placed["rock"] += 1

# Low ferns tucked against the bases of rock walls, ruins and boulders (never on the bridge or
# in the bridgehead duel areas), so the floor is never bare.
for b in BOXES:
    if b["kind"] not in ("rock-wall", "ruin-wall", "boulder", "ridge", "hut") or abs(b["x"]) < 8.5 and abs(b["z"]) < 5.5:
        continue
    for _ in range(3):
        side = rng.choice(("x", "z"))
        if side == "x":
            px = b["x"] + rng.choice((-1, 1)) * (b["w"] / 2 + 0.25)
            pz = b["z"] + rng.uniform(-b["d"] / 2, b["d"] / 2)
        else:
            px = b["x"] + rng.uniform(-b["w"] / 2, b["w"] / 2)
            pz = b["z"] + rng.choice((-1, 1)) * (b["d"] / 2 + 0.25)
        if in_arena(px, pz, 0.3):
            instance(FERNS[1], px, 0.0, pz, yaw=rng.uniform(0, math.tau), scale=rng.uniform(0.6, 0.85))
            placed["fern"] += 1

# Lianas hanging from the canopy over the edges of the lanes (bottom ends stay above 4 m).
for _ in range(36):
    px, pz = rng.uniform(-W / 2, W / 2), rng.uniform(-D / 2, D / 2)
    instance(rng.choice(VINES), px, rng.uniform(15.5, 18.0), pz, yaw=rng.uniform(0, math.tau), scale=1.0)
    placed["vine"] += 1
print("PLACED", json.dumps(placed))


# =============================================================================== detail dressing
M["sign"] = material("sign-logo", "sign_logo", "planks_wet_n", None, roughness=0.8)
M["puddle"] = material("puddle", None, "water_n", None, color=(0.012, 0.014, 0.01), roughness=0.22)
M["dark"] = material("hut-interior", None, None, None, color=(0.02, 0.02, 0.018), roughness=1.0)
BOX = {b["id"]: b for b in BOXES}


def face_frame(b, face):
    """Centre, outward normal, horizontal tangent of a box face (game coords)."""
    x0, x1, y0, y1, z0, z1 = extent(b)
    return {
        "+x": (Vector((x1, 0, b["z"])), Vector((1, 0, 0)), Vector((0, 0, -1))),
        "-x": (Vector((x0, 0, b["z"])), Vector((-1, 0, 0)), Vector((0, 0, 1))),
        "+z": (Vector((b["x"], 0, z1)), Vector((0, 0, 1)), Vector((1, 0, 0))),
        "-z": (Vector((b["x"], 0, z0)), Vector((0, 0, -1)), Vector((-1, 0, 0))),
    }[face]


def panel(m, centre, normal, tangent, y, w, h, mat, out=0.015, uv=((0, 0), (1, 0), (1, 1), (0, 1)), thick=0.0):
    """A flat panel just in front of a face (game coords). Stays within a few cm of the box."""
    c = centre + normal * out
    p = [c - tangent * w / 2, c + tangent * w / 2]
    q = [B(p[0].x, y - h / 2, p[0].z), B(p[1].x, y - h / 2, p[1].z), B(p[1].x, y + h / 2, p[1].z), B(p[0].x, y + h / 2, p[0].z)]
    m.poly(q, list(uv), mat)


# Weathered PVPSPINARENA signs (official logo), flush on cover faces: spawn gates (plaza side),
# huts (trail side), the bridge supply stack (both ends). Three per side, never free-standing.
signs = Mesh()
for bid, face, along, y, w in (("spawn-gate-w", "+x", 0.0, 1.75, 1.7), ("spawn-gate-e", "-x", 0.0, 1.75, 1.7),
                               ("hut-w", "+z", 0.0, 2.05, 1.5), ("hut-e", "+z", 0.0, 2.05, 1.5),
                               ("bridge-crates", "-x", 0.0, 1.55, 1.05), ("bridge-crates", "+x", 0.0, 1.55, 1.05)):
    centre, normal, tangent = face_frame(BOX[bid], face)
    centre = centre + tangent * along
    # Board, its two hanging battens, and the painted face.
    panel(signs, centre, normal, tangent, y, w + 0.08, w / 2 + 0.08, M["planks"], out=0.012)
    panel(signs, centre, normal, tangent, y, w, w / 2, M["sign"], out=0.03)
signs.obj("signs", section("centre-mid"))

# Ivy and leaf mats climbing ruins, rock walls and huts (flat cards just off the faces).
ivy = Mesh()
for b in BOXES:
    if b["kind"] not in ("ruin-wall", "rock-wall", "hut", "ridge"):
        continue
    x0, x1, y0, y1, z0, z1 = extent(b)
    for face in ("+x", "-x", "+z", "-z"):
        centre, normal, tangent = face_frame(b, face)
        width = (z1 - z0) if face in ("+x", "-x") else (x1 - x0)
        n = int(width * (y1 - y0) / 0.45)
        for _ in range(n):
            if rng.random() < 0.4:
                continue
            a = rng.uniform(-width / 2 + 0.3, width / 2 - 0.3)
            # Denser near the ground and along the top edge.
            y = rng.choice((rng.uniform(y0 + 0.2, y0 + 1.0), rng.uniform(y1 - 0.6, y1 - 0.15), rng.uniform(y0 + 0.2, y1 - 0.2)))
            size = rng.uniform(0.3, 0.6)
            c = centre + tangent * a + normal * rng.uniform(0.018, 0.035)
            ang = rng.uniform(-0.6, 0.6)
            right = tangent * math.cos(ang) + Vector((0, 1, 0)) * math.sin(ang)
            up = Vector((0, 1, 0)) * math.cos(ang) - tangent * math.sin(ang)
            pts = [c - right * size / 2 - up * size / 2, c + right * size / 2 - up * size / 2, c + right * size / 2 + up * size / 2, c - right * size / 2 + up * size / 2]
            q = [B(p.x, max(0.01, p.y + y), p.z) for p in pts]
            ivy.poly(q, [(0, 0), (1, 0), (1, 1), (0, 1)], M["leaves-broad"])
ivy_obj = ivy.obj("ivy", section("centre-mid"), shadow=False)

# Surface roots spreading from the giant trees (low, half-buried; no collision, players step over).
roots = Mesh()
for s_ in BOXES:
    if s_["kind"] not in ("trunk", "hero-trunk") or not s_["id"].endswith(("-a-w", "-a-e", "-a")):
        continue
    d = s_["diameter"]
    for k in range(rng.randint(5, 7)):
        a = rng.uniform(0, math.tau)
        length = rng.uniform(1.6, 3.4) * d / 2
        r0 = rng.uniform(0.1, 0.17)
        pts = []
        for t in [i / 6 for i in range(7)]:
            rr = d / 2 * 0.9 + length * t
            wob = math.sin(t * 5 + k) * 0.25 * t
            pts.append((s_["x"] + math.cos(a + wob) * rr, s_["z"] + math.sin(a + wob) * rr, r0 * (1 - 0.8 * t)))
        for i in range(len(pts) - 1):
            (xa, za, ra), (xb, zb, rb) = pts[i], pts[i + 1]
            dx, dz = xb - xa, zb - za
            ln = math.hypot(dx, dz) or 1
            nx, nz = -dz / ln, dx / ln
            # A flattened half-tube: top strip and two sloped sides.
            for (u0, h0), (u1, h1) in (((-1, 0), (-0.45, 1)), ((-0.45, 1), (0.45, 1)), ((0.45, 1), (1, 0))):
                q = [B(xa + nx * ra * u0, ra * 0.7 * h0 - 0.02, za + nz * ra * u0), B(xb + nx * rb * u0, rb * 0.7 * h0 - 0.02, zb + nz * rb * u0),
                     B(xb + nx * rb * u1, rb * 0.7 * h1 - 0.02, zb + nz * rb * u1), B(xa + nx * ra * u1, ra * 0.7 * h1 - 0.02, za + nz * ra * u1)]
                roots.poly(q, [(0, i * 0.5), (0, (i + 1) * 0.5), (0.3, (i + 1) * 0.5), (0.3, i * 0.5)], M["bark"])
roots.obj("roots", section("centre-mid"))

# Fallen logs in the impassable jungle and beyond the edge (decor only; nobody can reach them).
log_lib = Mesh()
cylinder(log_lib, 0, 0, -3.0, 3.0, 0.42, 0.36, M["bark"], TILE["bark"], n=12, axis="x")
LOG = log_lib.obj("lib-log", library)
LOG.data.transform(Matrix.Translation((0, 0, 0.0)))
placed_logs = 0
for _ in range(60):
    px, pz = rng.uniform(-W / 2 - 10, W / 2 + 10), rng.uniform(-D / 2 - 10, D / 2 + 10)
    inside_jungle = any(sb["kind"] == "jungle" and inside(sb, px, pz, 3.2) for sb in BARRIERS)
    beyond = edge_distance(px, pz) > 3.5 and abs(px - river_x(pz)) > 4
    if not (inside_jungle or beyond):
        continue
    instance(LOG, px, ground_h(px, pz) + 0.2, pz, yaw=rng.uniform(0, math.tau), scale=rng.uniform(0.7, 1.15))
    placed_logs += 1
    if placed_logs >= 16:
        break

# Huts: door, window, corner posts and battens on the walls (all within 3 cm of the walls).
hut = Mesh()
for bid in ("hut-w", "hut-e"):
    b = BOX[bid]
    x0, x1, y0, y1, z0, z1 = extent(b)
    c, n, t = face_frame(b, "+z")
    panel(hut, c + t * (-(x1 - x0) / 2 + 0.85), n, t, 1.0, 0.95, 2.0, M["dark"], out=0.01)  # doorway
    panel(hut, c + t * 0.9, n, t, 1.7, 1.0, 0.6, M["dark"], out=0.01)  # window
    for face in ("+x", "-x", "+z", "-z"):
        c, n, t = face_frame(b, face)
        width = (z1 - z0) if face in ("+x", "-x") else (x1 - x0)
        for k in range(int(width / 0.9) + 1):
            panel(hut, c + t * (-width / 2 + k * width / int(width / 0.9)), n, t, (y1 - 0.25) / 2, 0.09, y1 - 0.3, M["planks"], out=0.022)
hut.obj("hut-detail", section("centre-mid"))

# Bridge: side stringer logs under the deck edges, thin hand-rail posts at mid-span.
br = Mesh()
for z in (-1.66, 1.66):
    cylinder(br, -0.12, z, -3.1, 3.1, 0.13, 0.12, M["bark"], TILE["bark"], n=8, axis="x")
for x in (-1.4, 1.4):
    for z in (-1.86, 1.86):
        cylinder(br, x, z, -0.1, 1.25, 0.055, 0.05, M["bark"], TILE["bark"], n=6)
br.obj("bridge-detail", section("centre-mid"))

# Puddles on the trails (dark, glossy; 1 cm above the mud).
pud = Mesh()
for hgt, pts in ROUTES.items():
    for sign in (1, -1):
        for (xa, za), (xb, zb) in zip(pts, pts[1:]):
            if rng.random() < 0.45:
                t = rng.uniform(0.25, 0.75)
                cx, cz = sign * (xa + (xb - xa) * t), za + (zb - za) * t
                rx, rz = rng.uniform(0.35, 0.7), rng.uniform(0.25, 0.5)
                ring = [B(cx + math.cos(a) * rx, hgt + 0.008, cz + math.sin(a) * rz) for a in [-i * math.tau / 12 for i in range(12)]]
                pud.poly(ring, [(0.5 + 0.5 * math.cos(a), 0.5 + 0.5 * math.sin(a)) for a in [-i * math.tau / 12 for i in range(12)]], M["puddle"])
pud.obj("puddles", section("ground"), shadow=False)
print("DETAIL logs", placed_logs, "ivy", len(ivy.f), "roots", len(roots.f))


# =============================================================================== merge + export
def join_static(coll):
    """Merge non-instanced meshes per material inside a section (fewer draw calls)."""
    by_mat = {}
    for o in list(coll.objects):
        if o.type == "MESH" and not o.get("instance") and len(o.data.materials) == 1:
            by_mat.setdefault((o.data.materials[0].name, bool(o.get("noShadow"))), []).append(o)
    for (name, ns), objs in by_mat.items():
        if len(objs) < 2:
            continue
        with bpy.context.temp_override(active_object=objs[0], selected_editable_objects=objs):
            bpy.ops.object.join()
        objs[0].name = f"{coll.name}-{name}"


for c in list(root.children):
    join_static(c)


def export(out):
    for c in root.children:
        empty = bpy.data.objects.new(f"section-{c.name}", None)
        c.objects.link(empty)
        for o in c.objects:
            if o is not empty:
                o.parent = empty
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=True, export_yup=True,
                              export_texcoords=True, export_normals=True, export_materials="EXPORT",
                              export_image_format="WEBP", export_extras=True, export_animations=False,
                              use_active_scene=True)


sc.collection.children.unlink(library)  # instances keep their mesh data; the sources aren't exported
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
export(OUT)
print("exported", OUT)
