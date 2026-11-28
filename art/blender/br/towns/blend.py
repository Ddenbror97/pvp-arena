"""
Blender side of the rebuilt towns: a Building's recorded parts (townkit.py) made into Blender
meshes (one object per level of detail, a material slot per surface, the tints as a colour
attribute, flat normals, texture coordinates in world metres as the game maps them), its
materials (the island's textures, tinted by the colour attribute, for Blender's own renders)
and its glTF export.

Game model space (x, y up, z front) is Blender's (x, -z, y); Blender's glTF exporter turns that
back into y up, so the exported file is in the game's axes.
"""
import math
import os

import bmesh
import bpy

TEX = "art/br/blackwater/tex"
# textured-kit.mjs MATERIALS: texture and metres per tile (Blender's renders only; the game maps
# its own the same way).
MATS = {
    "stone": ("sandstone", 3.2), "plaster": ("plaster", 2.4), "concrete": ("concrete", 3.0),
    "wood": ("wood", 2.0), "metal": ("corrugated", 2.0), "rooftile": ("rooftile", 1.6),
    "slate": ("slate", 2.2), "brick": ("brick", 1.8), "brickpale": ("brickpale", 1.8),
    "siding": ("siding", 2.4), "batten": ("batten", 2.4), "shingle": ("shingle", 1.68), "stucco": ("stucco", 2.4),
    "rubble": ("rubble", 2.6), "tiles": ("tiles", 2.5), "floor": ("floor", 3.0),
    "paint": (None, 3), "int": (None, 3), "flo": (None, 3), "glass": (None, 3),
}

CLASSES = ("near", "shell", "mid", "far")


def g2b(p):
    return (p[0], -p[2], p[1])


def material(key):
    name = f"town-{key}"
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    col = nt.nodes.new("ShaderNodeVertexColor")
    col.layer_name = "Col"
    tex, _ = MATS.get(key, (None, 3))
    if tex and os.path.exists(f"{TEX}/{tex}.jpg"):
        img = nt.nodes.new("ShaderNodeTexImage")
        img.image = bpy.data.images.load(os.path.abspath(f"{TEX}/{tex}.jpg"), check_existing=True)
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0
        nt.links.new(img.outputs["Color"], mix.inputs["A"])
        nt.links.new(col.outputs["Color"], mix.inputs["B"])
        nt.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
    else:
        nt.links.new(col.outputs["Color"], bsdf.inputs["Base Color"])
    # Back faces see-through, as the game culls them (Blender draws both sides).
    out = nt.nodes.get("Material Output")
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mixs = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(geo.outputs["Backfacing"], mixs.inputs["Fac"])
    nt.links.new(bsdf.outputs["BSDF"], mixs.inputs[1])
    nt.links.new(tr.outputs["BSDF"], mixs.inputs[2])
    nt.links.new(mixs.outputs["Shader"], out.inputs["Surface"])
    m.use_backface_culling = True
    bsdf.inputs["Roughness"].default_value = 0.15 if key == "glass" else 0.85
    if key == "metal":
        bsdf.inputs["Metallic"].default_value = 0.3
    if key == "glass":
        bsdf.inputs["Alpha"].default_value = 0.35
        m.surface_render_method = "BLENDED"
    return m


def tile(key):
    return MATS.get(key, (None, 3))[1]


class Mesh:
    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.float_color.new("Col")
        self.uv = self.bm.loops.layers.uv.new("UVMap")
        self.slots = []

    def slot(self, key):
        if key not in self.slots:
            self.slots.append(key)
        return self.slots.index(key)

    def face(self, pts, key, tint):
        """A polygon in game coordinates, counter-clockwise seen from its front."""
        bm = self.bm
        vs = [bm.verts.new(g2b(p)) for p in pts]
        try:
            f = bm.faces.new(vs)
        except ValueError:
            return
        f.material_index = self.slot(key)
        f.smooth = False
        # The face's game-space normal: the texture's projection axis, as the game maps it.
        a, b, c = pts[0], pts[1], pts[2]
        u = [b[i] - a[i] for i in range(3)]
        w = [c[i] - a[i] for i in range(3)]
        n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
        if len(pts) > 3 and math.hypot(*n) < 1e-9:
            c = pts[3]
            w = [c[i] - a[i] for i in range(3)]
            n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
        ax, ay, az = abs(n[0]), abs(n[1]), abs(n[2])
        t = tile(key)
        for lp, p in zip(f.loops, pts):
            lp[self.col] = (*tint, 1.0)
            if ay >= ax and ay >= az:
                uv = (p[0], p[2])
            elif ax >= az:
                uv = (p[2], -p[1])
            else:
                uv = (p[0], -p[1])
            lp[self.uv].uv = (uv[0] / t, -uv[1] / t)

    def box(self, P):
        x0, y0, z0, x1, y1, z1 = P["b"]
        faces = {
            "top": [(x0, y1, z0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0)],
            "bottom": [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)],
            "z1": [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)],
            "z0": [(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)],
            "x1": [(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)],
            "x0": [(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)],
        }
        for name, pts in faces.items():
            if name in P["skip"]:
                continue
            m, tint = P["faces"].get(name, (P["m"], P["tint"]))
            self.face(pts, m, tint)

    def cyl(self, P):
        cx, cz = P["c"]
        y0, y1 = P["y"]
        r, n = P["r"], P["seg"]
        ring = [(cx + r * math.cos(2 * math.pi * i / n), cz + r * math.sin(2 * math.pi * i / n)) for i in range(n)]
        for i in range(n):
            a, b = ring[i], ring[(i + 1) % n]
            self.face([(a[0], y0, a[1]), (a[0], y1, a[1]), (b[0], y1, b[1]), (b[0], y0, b[1])], P["m"], P["tint"])
        if P["top"]:
            self.face([(p[0], y1, p[1]) for p in ring][::-1], P["m"], P["tint"])

    def beam(self, P):
        a, b, w, h = P["a"], P["b"], P["w"], P["h"]
        dx, dz = b[0] - a[0], b[2] - a[2]
        ln = math.hypot(dx, dz) or 1
        nx, nz = -dz / ln * w / 2, dx / ln * w / 2

        def c(p, sx, sy):
            return (p[0] + sx * nx, p[1] + sy * h / 2, p[2] + sx * nz)

        v = [c(a, -1, -1), c(a, 1, -1), c(a, 1, 1), c(a, -1, 1), c(b, -1, -1), c(b, 1, -1), c(b, 1, 1), c(b, -1, 1)]
        mid = [sum(p[k] for p in v) / 8 for k in range(3)]
        for f in ([0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [1, 2, 6, 5], [0, 4, 7, 3]):
            p = [v[i] for i in f]
            u = [p[1][k] - p[0][k] for k in range(3)]
            w2 = [p[3][k] - p[0][k] for k in range(3)]
            n = [u[1] * w2[2] - u[2] * w2[1], u[2] * w2[0] - u[0] * w2[2], u[0] * w2[1] - u[1] * w2[0]]
            ctr = [sum(q[k] for q in p) / 4 for k in range(3)]
            if sum(n[k] * (ctr[k] - mid[k]) for k in range(3)) < 0:
                p = p[::-1]
            self.face(p, P["m"], P["tint"])

    def add(self, P):
        t = P["t"]
        if t == "box":
            self.box(P)
        elif t == "poly":
            self.face(P["p"], P["m"], P["tint"])
        elif t == "cyl":
            self.cyl(P)
        elif t == "beam":
            self.beam(P)

    def object(self, coll):
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        for key in self.slots:
            me.materials.append(material(key))
        ob = bpy.data.objects.new(self.name, me)
        coll.objects.link(ob)
        return ob


def make(B, bid, coll):
    """The building's objects: <id>.near, <id>.shell, <id>.mid, <id>.far."""
    meshes = {c: Mesh(f"{bid}.{c}") for c in CLASSES}
    for P in B.k.parts:
        meshes[P["lod"]].add(P)
    for P in B.far.parts:
        meshes["far"].add(P)
    return [meshes[c].object(coll) for c in CLASSES if meshes[c].slots]


def export(objs, path):
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_normals=True,
        export_texcoords=True,
        export_vertex_color="ACTIVE",
        export_all_vertex_colors=True,
        export_image_format="NONE",
        export_materials="EXPORT",
        export_extras=False,
        export_animations=False,
    )
