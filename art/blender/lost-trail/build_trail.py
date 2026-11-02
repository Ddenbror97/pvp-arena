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
    # River rock shares the layered-rock normal map (same strata), dark and glossy.
    "rock-wet": material("rock-wet", "rock_wet", "rock_moss_n", "rock_wet_r"),
    "reeds": material("reeds", "reeds", None, None, roughness=0.7, alpha=True, double=True),
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
        self.col = None  # optional per-corner RGB (exported as COLOR_0, multiplies the albedo)

    def slot(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def poly(self, pts, uvs, mat, cols=None):
        base = len(self.v)
        self.v.extend(pts)
        self.f.append(list(range(base, base + len(pts))))
        self.uv.append(uvs)
        self.mi.append(self.slot(mat))
        if cols is not None:
            if self.col is None:
                self.col = [[(1, 1, 1)] * len(f) for f in self.f[:-1]]
            self.col.append(cols)
        elif self.col is not None:
            self.col.append([(1, 1, 1)] * len(pts))

    def obj(self, name, coll, shadow=True, weld=False, sharp=None):
        """`weld` shares coincident vertices and shades smooth (tubes, boulders: smaller and
        rounder); `sharp` (degrees) keeps creases above that angle crisp."""
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(p) for p in self.v], [], self.f)
        uvl = me.uv_layers.new(name="UVMap")
        i = 0
        for poly, uvs in zip(me.polygons, self.uv):
            for li, uv in zip(poly.loop_indices, uvs):
                uvl.data[li].uv = uv
        if self.col is not None:
            ca = me.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
            for poly, cols in zip(me.polygons, self.col):
                for li, c in zip(poly.loop_indices, cols):
                    ca.data[li].color = (*c, 1.0)
        for m in self.mats:
            me.materials.append(m)
        for poly, mi in zip(me.polygons, self.mi):
            poly.material_index = mi
            poly.use_smooth = False
        me.validate()
        if weld:
            bm = bmesh.new()
            bm.from_mesh(me)
            bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
            bm.to_mesh(me)
            bm.free()
            for poly in me.polygons:
                poly.use_smooth = True
            if sharp:
                me.set_sharp_from_angle(angle=math.radians(sharp))
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


def box_faces(mesh, x0, x1, y0, y1, z0, z1, mat, tile, skip=(), top_mat=None, top_tile=None, wobble=0.0, seed=0, flat_top=False):
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
        if wobble and key != "-y" and not (flat_top and key == "+y"):
            subdivided(mesh, pts, m, t, wobble, seed)
        else:
            quad(mesh, pts, m, t)


def subdivided(mesh, pts, mat, tile, wobble, seed, cells=None):
    """Face split into a grid; interior vertices pushed inward by noise (never outward)."""
    a, b, c, d = pts
    n = (b - a).cross(c - a).normalized()
    ku = cells or max(2, min(10, int((b - a).length / 0.5)))
    kv = cells or max(2, min(8, int((d - a).length / 0.5)))
    grid = [[None] * (kv + 1) for _ in range(ku + 1)]
    for i in range(ku + 1):
        for j in range(kv + 1):
            u, v = i / ku, j / kv
            p = a.lerp(b, u).lerp(d.lerp(c, u), v)
            # Zero on the face border (no cracks between faces), full one cell in.
            amp = wobble * min(1.0, min(u, 1 - u) * ku, min(v, 1 - v) * kv)
            h = mnoise.noise(p * 0.9 + Vector((seed, seed * 0.3, 0))) * 0.7 + mnoise.noise(p * 2.7 + Vector((seed, 0, 5))) * 0.3
            grid[i][j] = p - n * (abs(h) * amp)
    for i in range(ku):
        for j in range(kv):
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


def tube(mesh, pts, radii, mat, sides=5, v_scale=1.0):
    """A tube through Blender-space points (lianas, roots). Rotation-minimising frames."""
    if len(pts) < 2:
        return
    t0 = (pts[1] - pts[0]).normalized()
    ref = Vector((0, 0, 1)) if abs(t0.z) < 0.9 else Vector((1, 0, 0))
    nrm = t0.cross(ref).normalized()
    rings, dist = [], 0.0
    for k, p in enumerate(pts):
        t = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]).normalized()
        nrm = (nrm - t * nrm.dot(t)).normalized()
        bin_ = t.cross(nrm)
        r = radii[k]
        rings.append([p + (nrm * math.cos(2 * math.pi * i / sides) + bin_ * math.sin(2 * math.pi * i / sides)) * r for i in range(sides)])
    vs = [0.0]
    for k in range(1, len(pts)):
        dist += (pts[k] - pts[k - 1]).length
        vs.append(dist * v_scale)
    for k in range(len(pts) - 1):
        for i in range(sides):
            j = (i + 1) % sides
            mesh.poly([rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]],
                      [(i / sides * 0.5, vs[k]), ((i + 1) / sides * 0.5, vs[k]), ((i + 1) / sides * 0.5, vs[k + 1]), (i / sides * 0.5, vs[k + 1])], mat)


def octagon_layer(mesh, x0, x1, y0, y1, z0, z1, chamfer, mat, tile, wobble, seed, top=True, bottom=False,
                  top_mat=None, top_tile=None):
    """One rock bed: an octagonal slab (box with chamfered vertical edges), game coords.
    Long faces get inward noise; never leaves its box."""
    c = min(chamfer, (x1 - x0) * 0.3, (z1 - z0) * 0.3)
    ring = [(x0 + c, z0), (x1 - c, z0), (x1, z0 + c), (x1, z1 - c), (x1 - c, z1), (x0 + c, z1), (x0, z1 - c), (x0, z0 + c)]
    for i in range(8):
        (ax, az), (bx, bz) = ring[i], ring[(i + 1) % 8]
        pts = [B(ax, y0, az), B(bx, y0, bz), B(bx, y1, bz), B(ax, y1, az)]
        # Outward-facing order (ring runs clockwise seen from +y in game coords → reverse).
        pts = [pts[1], pts[0], pts[3], pts[2]]
        if i % 2 == 0 and wobble:
            subdivided(mesh, pts, mat, tile, wobble, seed + i)
        else:
            quad(mesh, pts, mat, tile)
    if top:
        quad(mesh, [B(x, y1, z) for x, z in ring][::-1], top_mat or mat, top_tile or tile)
    if bottom:
        quad(mesh, [B(x, y0, z) for x, z in ring], mat, tile)


def strata_block(mesh, x0, x1, y0, y1, z0, z1, mat, tile, seed, top_mat=None, top_tile=None, max_inset=0.1,
                 top_inset=0.1, ground=True):
    """Layered rock filling (never exceeding) a collision box: beds 0.22–0.55 m thick, each set
    back by its own amount with chamfered corners, so ledges, overhangs and partings read in
    silhouette. Bed partings line up with the texture's (same bed scale)."""
    r = random.Random(seed)
    ys = [y0]
    while y1 - ys[-1] > 0.6:
        ys.append(ys[-1] + r.uniform(0.22, 0.55))
    ys.append(y1)
    lim = min(max_inset, (x1 - x0) * 0.18, (z1 - z0) * 0.18)
    along_x = (x1 - x0) >= (z1 - z0)
    length = (x1 - x0) if along_x else (z1 - z0)
    for i in range(len(ys) - 1):
        last = i == len(ys) - 2
        cap = top_inset if last else (0.03 if i == 0 and ground else lim)
        # Jointed blocks: each bed breaks into 0.9–2.4 m blocks, each set back on its own.
        cuts_ = [0.0]
        while length - cuts_[-1] > 2.6:
            cuts_.append(cuts_[-1] + r.uniform(0.9, 2.4))
        cuts_.append(length)
        for a0, a1 in zip(cuts_, cuts_[1:]):
            ins = [r.uniform(0.0, min(lim, cap)) for _ in range(4)]
            if along_x:
                bx0, bx1, bz0, bz1 = x0 + a0, x0 + a1, z0, z1
                bx0 += ins[0] if a0 == 0 else 0.0
                bx1 -= ins[1] if a1 == length else 0.0
                bz0, bz1 = bz0 + ins[2], bz1 - ins[3]
            else:
                bx0, bx1, bz0, bz1 = x0, x1, z0 + a0, z0 + a1
                bz0 += ins[2] if a0 == 0 else 0.0
                bz1 -= ins[3] if a1 == length else 0.0
                bx0, bx1 = bx0 + ins[0], bx1 - ins[1]
            octagon_layer(mesh, bx0, bx1, ys[i], ys[i + 1], bz0, bz1, r.uniform(0.04, 0.16), mat, tile,
                          wobble=min(0.08, lim * 0.8), seed=seed * 7 + i * 13 + int(a0 * 10),
                          top=True, bottom=i > 0, top_mat=top_mat if last else None, top_tile=top_tile if last else None)


def boulder(mesh, centre, half, seed, mat, tile, subdiv=3, cuts=6, flat_bottom=True, clamp=False, beds=True):
    """Natural boulder (Blender coords): noisy ellipsoid, flattened facets where it split along
    joints (random planes, vertices only ever pulled inward), faint bedding ledges. With
    `clamp`, every vertex stays inside the box `centre ± half` (gameplay boulders)."""
    r = random.Random(seed)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    hx, hy, hz = half
    planes = []
    for _ in range(cuts):
        d = Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(-0.4, 1.0))).normalized()
        planes.append((d, r.uniform(0.55, 0.82)))
    for v in bm.verts:
        p = v.co.copy()
        n = mnoise.noise(p * 1.3 + Vector((seed * 1.7, 0, 0))) * 0.6 + mnoise.noise(p * 3.1 + Vector((0, seed, 0))) * 0.25
        p *= (1.1 if clamp else 1.0) + 0.16 * n
        for d, off in planes:  # joint facets
            e = p.dot(d) - off
            if e > 0:
                p -= d * e * 0.92
        if beds:  # bedding: faint terraces up the height
            z = p.z
            p.z = z - 0.018 * math.sin(z * 7.0 + seed) ** 2
        q = Vector((p.x * hx, p.y * hz, p.z * hy))
        if flat_bottom and q.z < -hy * 0.6:
            q.z = -hy * 0.6 - (q.z + hy * 0.6) * 0.15
        if clamp:
            q = Vector((max(-hx, min(hx, q.x)), max(-hz, min(hz, q.y)), max(-hy, min(hy, q.z))))
        v.co = q + centre
    bm.normal_update()
    for f in bm.faces:
        pts = [v.co.copy() for v in f.verts]
        nrm = f.normal
        mesh.poly(pts, [world_uv(p, nrm, tile) for p in pts], mat)
    bm.free()


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


def trunk_profile(me, bark_slots, crown_base):
    """Trunk centre and radius by height (lib/Blender coords) from the bark vertices."""
    zs_ = {}
    for poly in me.polygons:
        if poly.material_index not in bark_slots:
            continue
        for vi in poly.vertices:
            co = me.vertices[vi].co
            zs_.setdefault(int(co.z / 0.5), []).append(co)
    prof, centre, rad = {}, Vector((0, 0)), None
    for b in range(2, int(crown_base / 0.5) + 1):
        pts = zs_.get(b, [])
        lim = (rad * 2.2 + 0.4) if rad else 2.5
        near = [p for p in pts if (Vector((p.x, p.y)) - centre).length < lim]
        if len(near) < 4:
            continue
        c = sum((Vector((p.x, p.y)) for p in near), Vector((0, 0))) / len(near)
        ds = sorted((Vector((p.x, p.y)) - c).length for p in near)
        rad = ds[int(len(ds) * 0.8)]
        centre = c
        prof[b] = (c, rad)
    keys = sorted(prof)

    def at(z):
        b = min(keys, key=lambda k: abs(k * 0.5 + 0.25 - z))
        return prof[b]
    return at


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
    if detail == "near":
        thin_bark(bark, 0.45)
    return bark


def thin_bark(obj, ratio):
    """Collapse-decimate only the bark (vertex group), leaving leaf cards intact. Most bark
    triangles are crown twigs 20–30 m up whose ring detail never reads; the quadric error
    metric removes those first, so trunk and limb silhouettes hold."""
    me = obj.data
    slots = {i for i, mt in enumerate(me.materials) if mt.name.startswith("bark")}
    leaf_slot = next(i for i, mt in enumerate(me.materials) if mt.name.startswith("leaves"))
    leaf_z = sorted(me.vertices[vi].co.z for poly in me.polygons if poly.material_index == leaf_slot for vi in poly.vertices[:1])
    crown_base = leaf_z[int(len(leaf_z) * 0.06)]
    at = trunk_profile(me, slots, crown_base)
    keep_trunk = set()
    for v in me.vertices:  # the trunk below the crown keeps every ring (UVs stay unstretched)
        if v.co.z <= crown_base:
            c, rad = at(v.co.z) if v.co.z > 1.0 else at(1.0)
            if (Vector((v.co.x, v.co.y)) - c).length < rad * 1.6 + 0.15:
                keep_trunk.add(v.index)
    vg = obj.vertex_groups.new(name="bark")
    vg.add(sorted({vi for poly in me.polygons if poly.material_index in slots for vi in poly.vertices} - keep_trunk), 1.0, "REPLACE")
    mod = obj.modifiers.new("thin", "DECIMATE")
    mod.ratio = ratio
    mod.vertex_group = "bark"
    with bpy.context.temp_override(object=obj, active_object=obj):
        bpy.ops.object.modifier_apply(modifier="thin")
    obj.vertex_groups.remove(obj.vertex_groups["bark"])


def add_buttress(obj, base_r, fins=5, height=2.6, reach=1.25, seed=0):
    """Buttress-root fins: thin flared plates radiating from the trunk base, joined into obj
    (in the trunk's own bark material, so the fins add no draw call)."""
    r = random.Random(seed)
    bark_mat = obj.data.materials[0]
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
            m.poly(pts if side > 0 else list(reversed(pts)), uvs if side > 0 else list(reversed(uvs)), bark_mat)
        # Top edge strip closing the fin.
        for k in range(len(prof) - 1):
            (d0, y0), (d1, y1) = prof[k], prof[k + 1]
            q = [Vector((ca * d0 - sa * th, -(sa * d0 + ca * th), y0)), Vector((ca * d1 - sa * th, -(sa * d1 + ca * th), y1)),
                 Vector((ca * d1 + sa * th, -(sa * d1 - ca * th), y1)), Vector((ca * d0 + sa * th, -(sa * d0 - ca * th), y0))]
            m.poly(q, [(0, 0), (1, 0), (1, 0.1), (0, 0.1)], bark_mat)
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


# ------------------------------------------------------------------ giant-tree dressing
def decorate_tree(src, name, seed, roots=False, lianas=3, vines=10, epiphytes=6, min_hang=5.5):
    """Copy of a tree with lianas spiralling the trunk and looping into the crown, hanging vines
    and aerial roots under the crown (bottoms ≥ min_hang above the base, so nothing reaches into
    head height), epiphyte clumps on the trunk and in forks and, with `roots`, strangler roots
    netting the trunk down to the ground. Uses the tree's own bark and leaf materials, so it
    adds triangles but no draw calls."""
    r = random.Random(seed)
    o = src.copy()
    o.data = src.data.copy()
    o.name = o.data.name = name
    library.objects.link(o)
    me = o.data
    bark_slots = {i for i, mt in enumerate(me.materials) if mt.name.startswith("bark")}
    leaf_slot = next(i for i, mt in enumerate(me.materials) if mt.name.startswith("leaves"))
    bark_mat, leaf_mat = me.materials[min(bark_slots)], me.materials[leaf_slot]
    leaf_pts = [me.vertices[vi].co.copy() for poly in me.polygons if poly.material_index == leaf_slot for vi in poly.vertices[:1]]
    leaf_pts.sort(key=lambda p: p.z)
    crown_base = leaf_pts[int(len(leaf_pts) * 0.06)].z
    at = trunk_profile(me, bark_slots, crown_base)
    m = Mesh()

    def on_trunk(z, a, out=0.04):
        c, rad = at(z)
        return Vector((c.x + math.cos(a) * (rad + out), c.y + math.sin(a) * (rad + out), z))

    under = [p for p in leaf_pts if crown_base <= p.z < crown_base + 4.0 and Vector((p.x, p.y)).length > 1.6]
    # Lianas: spiral up the trunk, then sag across to a limb in the crown.
    for k in range(lianas):
        a0, turns = r.uniform(0, math.tau), r.uniform(0.8, 1.8) * r.choice((-1, 1))
        z0, z1 = 0.3, crown_base * r.uniform(0.85, 0.98)
        rad0 = r.uniform(0.045, 0.075)
        pts = [on_trunk(z0 + (z1 - z0) * t, a0 + turns * math.tau * t, rad0 + 0.01) for t in [i / 28 for i in range(29)]]
        if under:
            end = r.choice(under)
            a, b = pts[-1], end
            sag = min(r.uniform(1.5, 4.0), max(0.0, min(a.z, b.z) - min_hang))
            pts += [a.lerp(b, t) - Vector((0, 0, sag * 4 * t * (1 - t))) for t in [i / 10 for i in range(1, 11)]]
        tube(m, pts, [rad0 * (1 - 0.35 * i / len(pts)) for i in range(len(pts))], bark_mat, sides=5, v_scale=0.5)
    # Hanging vines (leafy) and aerial roots (bare, thin) under the crown.
    for k in range(vines):
        if not under:
            break
        top = r.choice(under)
        length = min(r.uniform(3.0, 9.0), top.z - min_hang)
        if length < 1.2:
            continue
        leafy = k % 2 == 0
        sway = Vector((r.uniform(-1, 1), r.uniform(-1, 1), 0)) * 0.25
        n_ = max(3, int(length / 0.9))
        pts = [top + Vector((0, 0, -length * t)) + sway * math.sin(t * 3.0 + k) * t for t in [i / n_ for i in range(n_ + 1)]]
        tube(m, pts, [0.03 if leafy else 0.022] * len(pts), bark_mat, sides=3, v_scale=0.5)
        if leafy:
            for i, p in enumerate(pts[1:], 1):
                d = Vector((math.cos(i * 2.3 + k), math.sin(i * 2.3 + k), 0))
                card_quad(m, p, d.cross(Vector((0, 0, 1))), (d + Vector((0, 0, -0.5))).normalized(), 0.55, 0.6, leaf_mat)
        else:  # aerial-root tip curling slightly
            tip = pts[-1]
            tube(m, [tip, tip + Vector((0.08, 0.05, -0.25)), tip + Vector((0.18, 0.02, -0.4))], [0.02, 0.015, 0.008], bark_mat, sides=3)
    # Epiphytes: leafy clumps on the trunk (above head height) and in the forks of limbs.
    spots = []
    for k in range(epiphytes):
        z = r.uniform(4.0, max(4.5, crown_base * 0.92))
        a = r.uniform(0, math.tau)
        spots.append((on_trunk(z, a, 0.02), Vector((math.cos(a), math.sin(a), 0))))
    limbs = [me.vertices[vi].co.copy() for poly in me.polygons if poly.material_index in bark_slots
             for vi in poly.vertices[:1] if crown_base < me.vertices[vi].co.z < crown_base + 6
             and 1.5 < Vector((me.vertices[vi].co.x, me.vertices[vi].co.y)).length < 5]
    for _ in range(min(4, len(limbs))):
        p = r.choice(limbs)
        spots.append((p, Vector((p.x, p.y, 0)).normalized()))
    for p, out in spots:
        axis = (out * 0.55 + Vector((0, 0, 1))).normalized()
        side = axis.cross(Vector((0, 0, 1)) if abs(axis.z) < 0.99 else Vector((1, 0, 0))).normalized()
        for i in range(6):
            a = math.tau * i / 6 + r.uniform(-0.3, 0.3)
            d = (side * math.cos(a) + axis.cross(side) * math.sin(a))
            up = (d * 0.75 + axis * 0.65).normalized()
            card_quad(m, p, up.cross(d).normalized() if up.cross(d).length > 1e-3 else side, up, 0.42, r.uniform(0.55, 0.85), leaf_mat, bend=0.25, segs=2)
    # Strangler roots: down the trunk from 3–8 m, flaring out over the buttresses to the ground.
    if roots:
        for k in range(r.randint(6, 9)):
            a = r.uniform(0, math.tau)
            ztop = r.uniform(3.0, min(8.0, crown_base * 0.7))
            drift = r.uniform(-0.6, 0.6)
            pts = []
            for i in range(19):
                t = i / 18
                z = ztop * (1 - t)
                flare = 0.0 if z > 1.2 else (1.2 - z) * r.uniform(0.35, 0.7)
                pts.append(on_trunk(max(z, 0.3), a + drift * t, 0.03 + flare) if z > 0.3 else on_trunk(0.3, a + drift * t, 0.03 + flare) + Vector((0, 0, z - 0.3)))
            pts[-1].z = -0.15
            tube(m, pts, [0.05 + 0.06 * (i / 18) for i in range(19)], bark_mat, sides=5, v_scale=0.5)
    tmp = m.obj("tmp-deco", library, weld=True, sharp=60)
    with bpy.context.temp_override(active_object=o, selected_editable_objects=[o, tmp]):
        bpy.ops.object.join()
    return o


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


def lib_rock(seed, size=1.0, mat=None):
    """Instanced rock: a faceted, bedded boulder sitting on (and sunk into) the ground."""
    m = Mesh()
    boulder(m, Vector((0, 0, 0.32 * size)), (size, 0.62 * size, size * 0.85), seed, mat or M["rock"], TILE["rock"], subdiv=3, cuts=5)
    o = m.obj(f"lib-rock-{seed}", library, weld=True, sharp=38)
    return o


# Decorated near-edge trees (the forest wall players see) and the in-arena giants.
DECO = {
    "emergent": decorate_tree(LIB[("emergent", 11, "near")], "lib-emergent-11-deco", 501, roots=True),
    "hardwood": decorate_tree(LIB[("hardwood", 11, "near")], "lib-hardwood-11-deco", 502, roots=True, lianas=2, vines=8),
}
HERO = {
    "emergent": decorate_tree(LIB[("emergent", 23, "near")], "lib-emergent-23-hero", 503, lianas=4, vines=12, epiphytes=8),
    "hardwood": decorate_tree(LIB[("hardwood", 23, "near")], "lib-hardwood-23-hero", 504, lianas=3, vines=10, epiphytes=7),
}


# Scanned CC0 replacements (source/scanned/<slot>/, see source/SCANNED-ASSETS.md) take over a
# slot when present; otherwise the procedural library below is used.
sys.path.insert(0, HERE)
from scanned import scanned_library  # noqa: E402

SCANNED = os.environ.get("LOST_TRAIL_SCANNED", os.path.join(HERE, "source", "scanned"))
PALMS = scanned_library("palm", SCANNED, library) or [lib_palm(s) for s in (1, 2)]
FERNS = scanned_library("fern", SCANNED, library) or [lib_fern(s, sz) for s, sz in ((4, 1.0), (6, 0.8))]
BUSHES = scanned_library("bush", SCANNED, library) or [lib_bush(s, sz) for s, sz in ((7, 1.0), (8, 1.3))]
VINES = [lib_vine(9)]
ROCKS = scanned_library("rock", SCANNED, library) or [lib_rock(s, sz) for s, sz in ((11, 1.0), (13, 0.7))]


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
    """A faceted boulder that fills its collision box (every vertex clamped inside the box)."""
    m = Mesh()
    boulder(m, B(s["x"], s["y"], s["z"]), (s["w"] / 2, s["h"] / 2, s["d"] / 2), seed, M["rock"], TILE["rock"],
            subdiv=3, cuts=9, flat_bottom=False, clamp=True, beds=False)
    m.obj(s["id"], section(section_of(s["x"], s["z"])), weld=True, sharp=38)


def extent(s):
    return (s["x"] - s["w"] / 2, s["x"] + s["w"] / 2, s["y"] - s["h"] / 2, s["y"] + s["h"] / 2, s["z"] - s["d"] / 2, s["z"] + s["d"] / 2)


def crate(m, x0, x1, y0, y1, z0, z1):
    box_faces(m, x0 + 0.012, x1 - 0.012, y0, y1 - 0.012, z0 + 0.012, z1 - 0.012, M["crate"], TILE["crate"], skip=("-y",))
    # Frame boards proud of the faces but inside the collision box.
    t = 0.07
    for (a0, a1, b0, b1) in ((x0, x0 + t, z0, z0 + t), (x1 - t, x1, z0, z0 + t), (x0, x0 + t, z1 - t, z1), (x1 - t, x1, z1 - t, z1)):
        box_faces(m, a0, a1, y0, y1, b0, b1, M["planks"], TILE["planks"], skip=("-y",))


dressed_trees = set()
# Each mirrored pair uses the same giant (sides read identically); species vary by position.
HERO_FOR = {"river-tree": "emergent", "plaza-tree": "hardwood", "trail-tree": "emergent", "ridge-tree": "hardwood",
            "bank-tree-n": "emergent"}
HERO_BASE_R = {"emergent": 1.15 * ARCH_SCALE["emergent"], "hardwood": 0.8 * ARCH_SCALE["hardwood"]}
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
        arch = HERO_FOR.get(s["tree"], "emergent")
        # Trunk girth matches the collision; height is capped so the giants stay ~40–48 m.
        sc_ = (d / 2) / HERO_BASE_R[arch] * 1.02
        tseed = sum(map(ord, s["tree"])) % 97
        yaw = tseed * 0.37 if s["side"] != "east" else math.pi - tseed * 0.37
        instance(HERO[arch], s["x"], 0, s["z"], yaw=yaw, sx=(sc_, sc_, min(sc_, 1.4 if arch == "emergent" else 1.55)),
                 name=f"hero-{key}")
        continue
    if k == "boulder":
        rock_in_box(s, seed)
        continue
    if k == "ridge":
        # Walkable top: the top bed stays flush with the collision top and edges (players stand on it).
        strata_block(m, x0, x1, y0, y1, z0, z1, M["rock"], TILE["rock"], seed, top_mat=M["floor"], top_tile=TILE["floor"],
                     max_inset=0.1, top_inset=0.0)
    elif k == "rock-wall":
        strata_block(m, x0, x1, y0, y1, z0, z1, M["rock"], TILE["rock"], seed, max_inset=0.1, top_inset=0.06)
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


def wetness(x, z):
    """Albedo multiplier for the ground: dark, cool, mud-brown soil fading in toward the water
    (river banks beyond the edge, the gorge lips and the fords inside the arena)."""
    out = max(abs(x) - W / 2, abs(z) - D / 2)
    dist = abs(x - river_x(z)) - (2.8 if out > 0 else 2.6)
    w = smooth(3.2, 0.0, dist) * (0.85 + 0.15 * mnoise.noise(Vector((x * 0.5, z * 0.5, 7))))
    w = max(0.0, min(1.0, w))
    return (1 - 0.42 * w, 1 - 0.45 * w, 1 - 0.5 * w)


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
        corners = [(xa, za), (xb, za), (xb, zb), (xa, zb)]
        pts = [B(x_, H[(x_, z_)], z_) for x_, z_ in corners]
        ground.poly(list(reversed(pts)), [world_uv(p, Vector((0, 0, 1)), TILE["floor"]) for p in reversed(pts)], M["floor"],
                    cols=[wetness(x_, z_) for x_, z_ in reversed(corners)])
ground.obj("ground", section("ground"))

# Gorge: rock walls down to a stony bed, deep still water.
gm = Mesh()
for z0, z1 in GORGES:
    for side in (-1, 1):
        x = side * 2.6
        for ya, yb, mat in ((0.0, -1.15, M["rock"]), (-1.15, -2.4, M["rock-wet"])):  # wet below high water
            pts = [B(x, ya, z0), B(x, ya, z1), B(x, yb, z1), B(x, yb, z0)]
            if side < 0:
                pts = list(reversed(pts))
            subdivided(gm, pts, mat, TILE["rock"], -0.25, 17 + side)  # bulge into the gorge
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


PROPORTION = random.Random(31)


def tree_at(x, z, detail, arch=None):
    arch = arch or rng.choice(VARIANTS[detail])
    lib = DECO[arch] if detail == "near" and arch in DECO else LIB[(arch, 11, detail)]
    # Per-tree proportions: girth and height vary independently (own RNG: placement unchanged).
    yaw, s_ = rng.uniform(0, math.tau), rng.uniform(0.82, 1.18)
    instance(lib, x, ground_h(x, z), z, yaw=yaw, sx=(s_, s_, s_ * PROPORTION.uniform(0.88, 1.12)))
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
            instance(FERNS[-1], px, 0.0, pz, yaw=rng.uniform(0, math.tau), scale=rng.uniform(0.6, 0.85))
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


# =============================================================================== riverbanks
# All river dressing lives in the "river" section, merged per material (wet rock, reeds, roots):
# three draws for the whole river. Inside the arena it stays below ground level in the gorge,
# inside impassable zones, or ankle-high in the fords, so sight lines are unchanged.
wet, reed, broots = Mesh(), Mesh(), Mesh()
rr = random.Random(777)
counts = {"wet": 0, "reed": 0, "root": 0, "stone": 0}


def lib_reeds(seed):
    """A 1 m reed clump (instanced and scaled per placement)."""
    r = random.Random(seed)
    m = Mesh()
    for i in range(5):
        a = math.tau * i / 5 + r.uniform(-0.4, 0.4)
        d = Vector((math.cos(a), math.sin(a), 0))
        up = (Vector((0, 0, 1)) + d * r.uniform(0.05, 0.25)).normalized()
        card_quad(m, d * r.uniform(0.0, 0.15), d.cross(Vector((0, 0, 1))), up, 0.5, r.uniform(0.85, 1.1), M["reeds"], bend=0.08, segs=2)
    o = m.obj(f"lib-reeds-{seed}", library, shadow=False)
    o["noShadow"] = True
    return o


REEDS = scanned_library("reeds", SCANNED, library)[:1] or [lib_reeds(31)]  # one clump, varied by yaw/scale (one draw)
WET_ROCKS = [lib_rock(41, 1.0, M["rock-wet"])]
for o_ in WET_ROCKS:
    o_.name = o_.data.name = o_.name.replace("lib-rock", "lib-wetrock")
RIVER = section("river")


def reed_clump(_m, x, y, z, height, seed):
    instance(REEDS[seed % len(REEDS)], x, y, z, yaw=(seed % 628) / 100, sx=(height * 0.9, height * 0.9, height), coll=RIVER)


def wet_rock(x, y, z, size, flat, seed):
    """Instanced river rock: `size` across, `flat` × size tall (the lib rock is ~1.1 m tall)."""
    instance(WET_ROCKS[seed % len(WET_ROCKS)], x, y, z, yaw=(seed % 628) / 100, sx=(size, size * 0.85, flat * size / 0.62), coll=RIVER)


def bank_root(m, x0, z0, x1, z1, seed):
    """A root snaking down a bank from (x0, z0) into the water at (x1, z1), half-buried."""
    r = random.Random(seed)
    pts = []
    for i in range(9):
        t = i / 8
        x = x0 + (x1 - x0) * t + math.sin(t * 5 + seed) * 0.2
        z = z0 + (z1 - z0) * t + math.cos(t * 4 + seed) * 0.2
        pts.append(B(x, ground_h(x, z) + 0.04 - 0.1 * t, z))
    tube(m, pts, [r.uniform(0.07, 0.12) * (1 - 0.6 * i / 8) for i in range(9)], M["bark"], sides=5, v_scale=0.5)


# Beyond the edge: boulders and reeds along both banks, roots running down into the water.
for zsign in (-1, 1):
    z = zsign * (D / 2 + 0.6)
    while abs(z) < D / 2 + 46:
        rx = river_x(z)
        for side in (-1, 1):
            if rr.random() < 0.55:
                size = rr.uniform(0.35, 1.2)
                bx = rx + side * rr.uniform(2.2, 3.6)
                wet_rock(bx, ground_h(bx, z) - 0.2 * size, z, size, 0.6, rr.randint(0, 9999))
                counts["wet"] += 1
            for _ in range(rr.randint(1, 3)):
                rx_ = rx + side * rr.uniform(2.4, 4.2)
                rz_ = z + rr.uniform(-1.2, 1.2)
                reed_clump(reed, rx_, ground_h(rx_, rz_) - 0.05, rz_, rr.uniform(0.9, 1.6), rr.randint(0, 9999))
                counts["reed"] += 1
            if rr.random() < 0.3:
                bank_root(broots, rx + side * rr.uniform(4.5, 6.0), z + rr.uniform(-1, 1), rx + side * 2.5, z + rr.uniform(-1, 1), rr.randint(0, 999))
                counts["root"] += 1
        z += zsign * rr.uniform(1.8, 2.8)

# In the gorge: wet boulders breaking the water (tops well below ground level), reeds and
# roots along the wall foot, roots draping over the lips.
for z0, z1 in GORGES:
    for _ in range(int((z1 - z0) * 1.3)):
        size = rr.uniform(0.35, 0.8)
        bx, bz = rr.uniform(-2.1, 2.1), rr.uniform(z0 + 0.4, z1 - 0.4)
        wet_rock(bx, -2.05, bz, size, min(1.0, 0.75 / size) * 0.9, rr.randint(0, 9999))
        counts["wet"] += 1
    for side in (-1, 1):
        zz = z0 + 0.3
        while zz < z1 - 0.3:
            reed_clump(reed, side * rr.uniform(2.25, 2.45), -1.6, zz, rr.uniform(0.7, 1.1), rr.randint(0, 9999))
            counts["reed"] += 1
            zz += rr.uniform(0.6, 1.4)
        for _ in range(int((z1 - z0) / 2.2)):
            zz = rr.uniform(z0 + 0.3, z1 - 0.3)
            x = side * 2.5
            pts = [B(x + side * 0.12, 0.03, zz)]
            for i in range(1, 8):
                pts.append(B(x - side * (0.02 + 0.03 * math.sin(i)), -0.2 * i, zz + math.sin(i * 0.9 + zz) * 0.15))
            tube(broots, pts, [0.06 - 0.005 * i for i in range(8)], M["bark"], sides=4, v_scale=0.5)
            counts["root"] += 1

# Fords: flat wet stones in the shallows, ankle-high at most (players wade through them).
for z0, z1 in CROSSINGS:
    for _ in range(9):
        size = rr.uniform(0.2, 0.45)
        bx, bz = rr.choice((-1, 1)) * rr.uniform(1.4, 2.5), rr.uniform(z0 + 0.3, z1 - 0.3)
        wet_rock(bx, -0.13, bz, size, 0.32 / size * 0.62 * 0.62, rr.randint(0, 9999))
        counts["stone"] += 1

# Reeds where the river leaves the arena, inside the impassable edge zones only.
for zsign in (-1, 1):
    for _ in range(26):
        x, z = rr.uniform(-4.2, 4.2), zsign * rr.uniform(D / 2 - 2.6, D / 2)
        if abs(x) < 2.75 and abs(z) <= D / 2:
            continue  # the water channel itself
        if lane_clear(x, z, 0.6) and in_arena(x, z):
            reed_clump(reed, x, 0.0, z, rr.uniform(0.9, 1.4), rr.randint(0, 9999))
            counts["reed"] += 1

broots.obj("bank-roots", section("river"), weld=True)
print("RIVERBANKS", json.dumps(counts))


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
                              export_vertex_color="ACTIVE", export_all_vertex_colors=False,
                              use_active_scene=True)


sc.collection.children.unlink(library)  # instances keep their mesh data; the sources aren't exported
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
export(OUT)
print("exported", OUT)
