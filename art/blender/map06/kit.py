"""
SANDGATE build kit: polygon accumulator, PBR materials, world-projected UVs and the collection /
culling-section layout. Imported by build_sandgate.py (runs inside Blender's Python).

Coordinates: game/glTF (x, y up, z) → Blender (x, -z, y). Every helper takes game coordinates.
"""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "build", "tex")


def B(x, y, z):
    """Game/glTF (x, y up, z) → Blender (x, -z, y up)."""
    return Vector((x, -z, y))


# =============================================================================== materials
_images = {}


def image(name, data=False):
    key = (name, data)
    if key not in _images:
        for ext in (".jpg", ".png"):
            path = os.path.join(TEX, name + ext)
            if os.path.exists(path):
                break
        img = bpy.data.images.load(path, check_existing=True)
        if data:
            img.colorspace_settings.name = "Non-Color"
        _images[key] = img
    return _images[key]


def gltf_output_group():
    """The glTF exporter reads ambient occlusion from a node group named 'glTF Material Output'."""
    g = bpy.data.node_groups.get("glTF Material Output")
    if g:
        return g
    g = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
    g.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    g.nodes.new("NodeGroupInput")
    return g


TILE = {}  # material name → metres per texture repeat (world-projected UVs)


def material(name, tex=None, tile=2.0, roughness=0.85, metal=0.0, blend=False, orm=True, normal=True,
             color=(1, 1, 1), double=False):
    """PBR material from build/tex/<tex>_c (+ _n, _orm). `blend` → glTF alphaMode BLEND (decals)."""
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = roughness
    b.inputs["Metallic"].default_value = metal
    b.inputs["Base Color"].default_value = (*color, 1)
    if tex:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = image(tex + "_c")
        nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
        if blend:
            nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
            m.surface_render_method = "BLENDED"
            m.use_transparency_overlap = False
        if normal and os.path.exists(os.path.join(TEX, tex + "_n.png")):
            n = nt.nodes.new("ShaderNodeTexImage")
            n.image = image(tex + "_n", True)
            nm = nt.nodes.new("ShaderNodeNormalMap")
            nt.links.new(n.outputs["Color"], nm.inputs["Color"])
            nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
        if orm and os.path.exists(os.path.join(TEX, tex + "_orm.jpg")):
            r = nt.nodes.new("ShaderNodeTexImage")
            r.image = image(tex + "_orm", True)
            sep = nt.nodes.new("ShaderNodeSeparateColor")
            nt.links.new(r.outputs["Color"], sep.inputs["Color"])
            nt.links.new(sep.outputs["Green"], b.inputs["Roughness"])
            nt.links.new(sep.outputs["Blue"], b.inputs["Metallic"])
            grp = nt.nodes.new("ShaderNodeGroup")
            grp.node_tree = gltf_output_group()
            nt.links.new(sep.outputs["Red"], grp.inputs["Occlusion"])
    m.use_backface_culling = not double
    m.diffuse_color = (*color, 1)
    TILE[name] = tile
    return m


# =============================================================================== mesh building
class Mesh:
    """Accumulates polygons (game coords in, Blender coords stored) with UVs, per-corner colours
    (exported as COLOR_0, which multiplies the albedo: tints, grime, AO) and material slots."""

    def __init__(self):
        self.v, self.f, self.uv, self.mi, self.col, self.mats = [], [], [], [], [], []

    def slot(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def poly(self, pts, uvs, mat, cols=None):
        """pts in game coords."""
        base = len(self.v)
        self.v.extend(B(*p) for p in pts)
        self.f.append(list(range(base, base + len(pts))))
        self.uv.append(uvs)
        self.mi.append(self.slot(mat))
        self.col.append(cols if cols is not None else [(1, 1, 1)] * len(pts))

    def extend(self, other):
        for pts, f, uv, mi, col in zip([None] * len(other.f), other.f, other.uv, other.mi, other.col):
            base = len(self.v)
            self.v.extend(other.v[i] for i in f)
            self.f.append(list(range(base, base + len(f))))
            self.uv.append(uv)
            self.mi.append(self.slot(other.mats[mi]))
            self.col.append(col)

    def __len__(self):
        return len(self.f)

    def obj(self, name, coll, shadow=True, smooth=False):
        # Drop degenerate polygons (fewer than 3 corners or ~zero area) before building.
        keep = []
        for k, f in enumerate(self.f):
            if len(f) < 3:
                continue
            a = self.v[f[0]]
            area = Vector((0, 0, 0))
            for q in range(1, len(f) - 1):
                area += (self.v[f[q]] - a).cross(self.v[f[q + 1]] - a)
            if area.length > 1e-8:
                keep.append(k)
        if len(keep) != len(self.f):
            verts, faces, uv, mi, col = [], [], [], [], []
            for k in keep:
                base = len(verts)
                verts.extend(self.v[i] for i in self.f[k])
                faces.append(list(range(base, base + len(self.f[k]))))
                uv.append(self.uv[k]); mi.append(self.mi[k]); col.append(self.col[k])
            self.v, self.f, self.uv, self.mi, self.col = verts, faces, uv, mi, col
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(p) for p in self.v], [], self.f)
        # Create both loop layers first, then look them up again: adding a layer reallocates the
        # loop data, so a wrapper fetched before the second layer would write to freed memory.
        me.uv_layers.new(name="UVMap")
        me.color_attributes.new("Color", "BYTE_COLOR", "CORNER")
        uvl = me.uv_layers["UVMap"]
        ca = me.color_attributes["Color"]
        uv_flat, col_flat = [], []
        for uvs, cols in zip(self.uv, self.col):
            for uv in uvs:
                uv_flat.extend(uv)
            for c in cols:
                # Colours are authored as display-space multipliers; COLOR_0 is linear.
                col_flat.extend((lin(c[0]), lin(c[1]), lin(c[2]), 1.0))
        uvl.data.foreach_set("uv", uv_flat)
        ca.data.foreach_set("color", col_flat)
        me.color_attributes.active_color = ca
        for m in self.mats:
            me.materials.append(m)
        for poly, mi in zip(me.polygons, self.mi):
            poly.material_index = mi
            poly.use_smooth = smooth
        me.update()
        o = bpy.data.objects.new(name, me)
        if not shadow:
            o["noShadow"] = True
        coll.objects.link(o)
        return o


def lin(v):
    v = max(0.0, min(1.0, v))
    return v ** 2.2


def normal_of(pts):
    a, b, c = (Vector(p) for p in pts[:3])
    n = (b - a).cross(c - a)
    return n.normalized() if n.length > 1e-12 else Vector((0, 1, 0))


def world_uv(p, n, tile, off=(0.0, 0.0)):
    """Box-projected UVs in game coords: walls use (horizontal, y), floors (x, -z)."""
    ax = max(range(3), key=lambda i: abs(n[i]))
    if ax == 1:  # floor / ceiling
        return ((p[0] + off[0]) / tile, (-p[2] + off[1]) / tile)
    if ax == 0:  # wall facing ±x: u along z
        s = -1 if n[0] > 0 else 1
        return ((s * p[2] + off[0]) / tile, (p[1] + off[1]) / tile)
    s = 1 if n[2] > 0 else -1
    return ((s * p[0] + off[0]) / tile, (p[1] + off[1]) / tile)


def quad(mesh, pts, mat, tile=None, cols=None, uvs=None, off=(0.0, 0.0)):
    """Planar polygon with world-projected UVs (or explicit `uvs`)."""
    n = normal_of(pts)
    t = tile if tile is not None else TILE.get(mat.name, 2.0)
    if uvs is None:
        uvs = [world_uv(p, n, t, off) for p in pts]
    mesh.poly(pts, uvs, mat, cols)


def box(mesh, x0, x1, y0, y1, z0, z1, mat, tile=None, skip=(), top=None, bottom=False, cols=None, colf=None, off=(0.0, 0.0)):
    """Axis-aligned box (game coords). `skip` names faces to omit: 'px','nx','py','ny','pz','nz'.
    `top` overrides the material of the +y face. `colf(p)` gives a per-vertex colour."""
    P = lambda x, y, z: (x, y, z)
    faces = {
        "px": [P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1)],
        "nx": [P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0)],
        "pz": [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)],
        "nz": [P(x1, y0, z0), P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0)],
        "py": [P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)],
        "ny": [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)],
    }
    for k, pts in faces.items():
        if k in skip or (k == "ny" and not bottom):
            continue
        m = top if (k == "py" and top is not None) else mat
        c = [colf(p) for p in pts] if colf else cols
        quad(mesh, pts, m, tile, c, off=off)


def atlas_uv(cell, grid=4, inset=0.004, flip_u=False):
    """UV corners (bl, br, tr, tl) of an atlas cell (row 0 = top of the image)."""
    r, c = divmod(cell, grid)
    u0, u1 = c / grid + inset, (c + 1) / grid - inset
    v0, v1 = 1 - (r + 1) / grid + inset, 1 - r / grid - inset
    if flip_u:
        u0, u1 = u1, u0
    return [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]


def atlas_sub(cell, a0, a1, b0, b1, grid=4, inset=0.004):
    """Sub-rectangle (fractions a along u, b along v) of an atlas cell."""
    r, c = divmod(cell, grid)
    U0, U1 = c / grid + inset, (c + 1) / grid - inset
    V0, V1 = 1 - (r + 1) / grid + inset, 1 - r / grid - inset
    u = lambda a: U0 + (U1 - U0) * a
    v = lambda b: V0 + (V1 - V0) * b
    return [(u(a0), v(b0)), (u(a1), v(b0)), (u(a1), v(b1)), (u(a0), v(b1))]


def cylinder(mesh, x, z, y0, y1, r0, r1, mat, n=10, caps=True, tile=1.0, cols=None):
    pts0 = [(x + r0 * math.cos(2 * math.pi * i / n), y0, z + r0 * math.sin(2 * math.pi * i / n)) for i in range(n)]
    pts1 = [(x + r1 * math.cos(2 * math.pi * i / n), y1, z + r1 * math.sin(2 * math.pi * i / n)) for i in range(n)]
    circ = 2 * math.pi * max(r0, r1)
    for i in range(n):
        j = (i + 1) % n
        u0, u1 = i / n * circ / tile, (i + 1) / n * circ / tile
        mesh.poly([pts0[j], pts0[i], pts1[i], pts1[j]], [(u1, y0 / tile), (u0, y0 / tile), (u0, y1 / tile), (u1, y1 / tile)], mat,
                  [cols] * 4 if cols else None)
    if caps:  # top cap, wound for a +y normal (decreasing angle)
        top = pts1[::-1]
        mesh.poly(top, [((p[0] - x) / tile, (-(p[2] - z)) / tile) for p in top], mat, [cols] * n if cols else None)


def tube(mesh, pts, r, mat, sides=6, tile=1.0):
    """Thin tube along a polyline (cables, pipes, rails)."""
    pts = [Vector(p) for p in pts]
    rings = []
    for i, p in enumerate(pts):
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        a = Vector((0, 1, 0)) if abs(d.y) < 0.9 else Vector((1, 0, 0))
        u = d.cross(a).normalized()
        v = d.cross(u).normalized()
        rings.append([p + (u * math.cos(2 * math.pi * k / sides) + v * math.sin(2 * math.pi * k / sides)) * r for k in range(sides)])
    for i in range(len(pts) - 1):
        for k in range(sides):
            k2 = (k + 1) % sides
            mesh.poly([tuple(rings[i][k]), tuple(rings[i][k2]), tuple(rings[i + 1][k2]), tuple(rings[i + 1][k])],
                      [(k / sides, i / tile), ((k + 1) / sides, i / tile), ((k + 1) / sides, (i + 1) / tile), (k / sides, (i + 1) / tile)], mat)


# =============================================================================== collections
class Layout:
    """Blender organisation (plan §20): top-level area collections, each with category children.
    Areas are also the glTF culling sections (one empty per area in the exported scene)."""

    CATEGORIES = ("Buildings", "Interior Architecture", "Military Sand Walls and Barriers", "Containers and Cover",
                  "Vehicles", "Industrial Equipment", "Stairs and Platforms", "Props", "Decals")

    def __init__(self, root_name="Sandgate"):
        self.scene = bpy.context.scene
        self.root = bpy.data.collections.new(root_name)
        self.scene.collection.children.link(self.root)
        self.areas = {}
        self.extra = {}

    def area(self, name):
        if name not in self.areas:
            c = bpy.data.collections.new(name)
            self.root.children.link(c)
            self.areas[name] = (c, {})
        return self.areas[name]

    def get(self, area, category):
        c, cats = self.area(area)
        if category not in cats:
            cc = bpy.data.collections.new(f"{area} / {category}")
            c.children.link(cc)
            cats[category] = cc
        return cats[category]

    def side(self, name):
        """Non-exported collections (collision, markers, lighting, library)."""
        if name not in self.extra:
            c = bpy.data.collections.new(name)
            self.scene.collection.children.link(c)
            self.extra[name] = c
        return self.extra[name]

    def objects(self, area):
        c, cats = self.areas[area]
        out = list(c.objects)
        for cc in cats.values():
            out.extend(cc.objects)
        return out
