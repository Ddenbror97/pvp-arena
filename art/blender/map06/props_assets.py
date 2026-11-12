"""
SANDGATE (map 06) street-life prop library (owner, 2026-11-12: "the maps feel empty ... objects to
fill up the maps ... players can hide behind a tree, an exploded car"). Imports the second batch of
Sketchfab downloads (incoming/, CC BY 4.0, credited in docs/fps-bomb/ASSETS.md), keeps the parts
the map uses, decimates the heavy ones, bakes each to real-world metres (origin at the bottom
centre, long axis along Blender X, front to -Y) and re-grades / downsizes their textures like
assets.py. Writes build/props-library.blend (one object per prop) and build/props-library.json
(sizes and triangle counts), which props.py places.

  /root/bpyenv/bin/python art/blender/map06/props_assets.py

Not imported: "Burned car" (H3RITAGE3D, CC BY-NC) and "Low Poly Market Stall Pack" (assetfactory,
Sketchfab Standard): neither licence allows use in the game.
"""
import bpy, bmesh, json, math, os, sys
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import assets as A  # noqa: E402  (its helpers: import_parts, join, decimate, recentre, textures)
import layout as L  # noqa: E402  (PROP_SHAPES: the collision boxes each prop must stay inside)

SANDGATE_INC = A.INC

A.LIBTEX = os.path.join(HERE, "build", "tex", "props")
os.makedirs(A.LIBTEX, exist_ok=True)
OUT = os.path.join(HERE, "build", "props-library.blend")
REPORT = os.path.join(HERE, "build", "props-library.json")
SHAPES = L.PROP_SHAPES


def clean_ac(pil):
    """Paint the maker's label (top panel) and the small print (grille frame) out of the outdoor
    unit's texture with the plain panel beside each."""
    s = pil.width / 512
    for (x0, y0, x1, y1), dx in (((352, 170, 398, 192), -60), ((228, 484, 290, 496), 70)):
        b = tuple(int(v * s) for v in (x0, y0, x1, y1))
        patch = pil.crop((b[0] + int(dx * s), b[1], b[2] + int(dx * s), b[3]))
        pil.paste(patch, b[:2])
    return pil


A.CLEAN["ac"] = clean_ac


def faces_where(o, pred):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    dead = [f for f in bm.faces if pred(f)]
    bmesh.ops.delete(bm, geom=dead, context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(o.data)
    bm.free()
    o.data.update()


def scale_to(o, axis, size):
    vs = np.array([v.co[:] for v in o.data.vertices])
    k = size / (vs[:, axis].max() - vs[:, axis].min())
    o.data.transform(Matrix.Scale(k, 4))
    o.data.update()
    return k


def crop_wreck(o):
    """The burnt-out car is a photogrammetry scan of the car on a disc of scorched ground. Keep the
    car and a 0.45 m band of the ground round it (a scorch mark), flatten that band onto the floor
    (2 cm up), drop the rest. Measured: the car's body is what stands 0.3 m over the ground."""
    vs = np.array([v.co[:] for v in o.data.vertices])
    ground = np.percentile(vs[:, 2], 8)
    tall = vs[vs[:, 2] > ground + 0.3 * (vs[:, 2].max() - ground) / 1.6]
    x0, x1 = np.percentile(tall[:, 0], [0.5, 99.5])
    y0, y1 = np.percentile(tall[:, 1], [0.5, 99.5])
    length = max(x1 - x0, y1 - y0)
    m = 0.45 * length / 4.5  # the band, in scan units (the car is 4.5 m long)
    faces_where(o, lambda f: all(not (x0 - m <= v.co.x <= x1 + m and y0 - m <= v.co.y <= y1 + m) for v in f.verts)
                or any(not (x0 - 1.6 * m <= v.co.x <= x1 + 1.6 * m and y0 - 1.6 * m <= v.co.y <= y1 + 1.6 * m) for v in f.verts))
    for v in o.data.vertices:
        out = not (x0 - 0.05 * m <= v.co.x <= x1 + 0.05 * m and y0 - 0.05 * m <= v.co.y <= y1 + 0.05 * m)
        if out or v.co.z < ground + 0.02 * m:
            v.co.z = ground
    o.data.update()


def flatten_outside(o, x0, x1, y0, y1, top=0.03):
    """Vertices outside the footprint (Blender x, y) lowered to `top`: the scorch band round the
    wreck lies flat on the street."""
    for v in o.data.vertices:
        if not (x0 <= v.co.x <= x1 and y0 <= v.co.y <= y1):
            v.co.z = min(v.co.z, top)
    o.data.update()


def stray(o, shapes, lo=0.05, hi=2.0, tol=0.03):
    """Points on the triangles between `lo` and `hi` m up that no collision box of the layout's
    PROP_SHAPES holds (in game axes: x along the model, z = -Blender y). Over a box whose top is a
    floor (1.3 m or lower) the space up to 2 m above that top counts too; over a taller one it is
    out of reach."""
    vs = [v.co.copy() for v in o.data.vertices]
    floors = [b for b in shapes if b[6] <= 1.3]
    n = 0
    for p in o.data.polygons:
        a = vs[p.vertices[0]]
        for i in range(1, len(p.vertices) - 1):
            b, c = vs[p.vertices[i]], vs[p.vertices[i + 1]]
            for u in range(5):
                for t in range(5 - u):
                    q = a + (b - a) * (u / 4) + (c - a) * (t / 4)
                    x, z, y = q.x, -q.y, q.z
                    inside = lambda bx: bx[1] - tol <= x <= bx[2] + tol and bx[3] - tol <= z <= bx[4] + tol
                    if any(inside(bx) and bx[6] > 1.3 for bx in shapes):
                        continue  # over a box too tall to stand on
                    f = max([bx[6] for bx in floors if inside(bx)], default=0.0)
                    if f + lo < y < f + hi and not any(inside(bx) and bx[5] - tol <= y <= bx[6] + tol for bx in shapes):
                        n += 1
    return n


def merge_materials(o, merge):
    """Fewer draw calls: faces of material `a` drawn with material `b` (by name part), for each
    a → b of `merge`; the emptied slots removed."""
    names = [m.name if m else "" for m in o.data.materials]
    find = lambda part: next(i for i, n in enumerate(names) if part in n)
    remap = {find(a): find(b) for a, b in merge.items()}
    for p in o.data.polygons:
        p.material_index = remap.get(p.material_index, p.material_index)
    used = sorted({p.material_index for p in o.data.polygons})
    keep = [o.data.materials[i] for i in used]
    index = {old: new for new, old in enumerate(used)}
    for p in o.data.polygons:
        p.material_index = index[p.material_index]
    o.data.materials.clear()
    for m in keep:
        o.data.materials.append(m)


def colours_to_vertices(o, name):
    """Untextured multi-material models (flat colour factors): each face's colour moved into a
    vertex colour and one plain material drawn for all of them (one draw call, not one per colour)."""
    me = o.data
    cols = []
    for m in me.materials:
        b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m and m.use_nodes else None
        cols.append(tuple(b.inputs["Base Color"].default_value) if b else (0.8, 0.8, 0.8, 1.0))
    ca = me.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
    for p in me.polygons:
        c = cols[p.material_index]
        for li in p.loop_indices:
            ca.data[li].color = (c[0], c[1], c[2], 1.0)
    me.color_attributes.active_color = ca
    mat = bpy.data.materials.new(f"lib-{name}-painted")
    mat.use_nodes = True
    nt = mat.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Roughness"].default_value = 0.7
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Color"
    nt.links.new(attr.outputs["Color"], b.inputs["Base Color"])
    me.materials.clear()
    me.materials.append(mat)
    for p in me.polygons:
        p.material_index = 0


def trim_fronds(o, low, trunk):
    """Frond tips that droop below `low` metres are cut away (no visual surface may hang into the
    space a player walks through without collision). The trunk is the mesh islands no wider than
    `trunk` metres; it is kept whole."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    seen, dead = set(), []
    for f0 in bm.faces:
        if f0.index in seen:
            continue
        island, stack = [], [f0]
        seen.add(f0.index)
        while stack:
            f = stack.pop()
            island.append(f)
            for e in f.edges:
                for g in e.link_faces:
                    if g.index not in seen:
                        seen.add(g.index)
                        stack.append(g)
        xs = [v.co.x for f in island for v in f.verts]
        ys = [v.co.y for f in island for v in f.verts]
        if max(max(xs) - min(xs), max(ys) - min(ys)) <= trunk:
            continue
        dead += [f for f in island if any(v.co.z < low for v in f.verts)]
    bmesh.ops.delete(bm, geom=dead, context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(o.data)
    bm.free()
    o.data.update()


def tint_untextured(o, name_part, rgb):
    for m in o.data.materials:
        if m and name_part in m.name:
            b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if b is not None and not b.inputs["Base Color"].links:
                b.inputs["Base Color"].default_value = (*rgb, 1)


def palm_pick(n):
    return lambda o: o.name.startswith(f"Palm {n} ") or o.name.startswith(f"Palm {n}Healthy")


def prefix(*names):
    return lambda o: any(o.name.startswith(p) for p in names)


G = A.grade_fn
SPECS = {
    # name: source, picks, yaw, per-part / all decimation, size (axis 0 length / 2 height, metres),
    # textures (colour, data), grade, hook.
    "wreck": dict(src="burnt_out_car", pick=prefix("BurntCar_BurntCar_0"), yaw=90, dec_all=0.045,
                  size=(0, 5.4), tex=(1024, 256), grade=G(sat=0.85), hook="wreck"),
    "car": dict(src="lowpoly_abandoned_simple_car_prop_-_game_ready", pick=lambda o: True, yaw=0, size=(0, 4.1),
                tex=(512, 256), grade=G(sat=0.8)),
    "stall": dict(src="low_poly_market_stall__game-ready_asset",
                  pick=prefix("SM_Asset_Props_M_WoodDark", "SM_Asset_Props_M_MarketStallCloth_0.001", "SM_Asset_Props_M_LightWood",
                              "SM_Asset_Props_M_FruitVegMeat", "SM_Asset_Props_Material_0"),
                  yaw=0, dec={"SM_Asset_Props_M_MarketStallCloth_0.001": 0.03, "SM_Asset_Props_M_FruitVegMeat_0": 0.018,
                              "SM_Asset_Props_M_LightWood_0": 0.35, "SM_Asset_Props_Material_0": 0.1},
                  size=(2, 2.6), tex=(512, 256), grade=G(sat=0.85)),
    "cart": dict(src="low_poly_wooden_cart", pick=lambda o: True, yaw=90, size=(0, 2.6), tex=(512, 128), grade=G(sat=0.8)),
    "pot": dict(src="low-poly_clay_pot", pick=prefix("Object_3"), yaw=0, dec_all=0.25, size=(2, 0.62), tex=(256, 256)),
    "shrub": dict(src="date_palm_and_vegetation", pick=prefix("SM_Vegetation_1"), yaw=0, size=(2, 0.75), tex=(256, 128),
                  grade=G(sat=0.7, contrast=0.95)),
    "palm-1": dict(src="date_palm_and_vegetation", pick=prefix("SM_DatePalm_1"), yaw=0, dec_all=0.45, size=(2, 4.9),
                   tex=(1024, 256), grade=G(sat=0.72), hook="palm"),
    "palm-3": dict(src="date_palm_and_vegetation", pick=prefix("SM_DatePalm_3"), yaw=0, dec_all=0.45, size=(2, 4.3),
                   tex=(1024, 256), grade=G(sat=0.72), hook="palm", share="palm-1"),
    "tall-palm": dict(src="low_poly_palms_pack", pick=palm_pick(2), yaw=0, size=(2, 8.5), tex=(512, 256),
                      grade=G(sat=0.75), hook="tall-palm"),
    "rubble": dict(src="rubble_pile_game_ready__2k_pbr", pick=lambda o: True, yaw=0, size=(0, 1.6), tex=(512, 256), dec_all=0.5,
                   grade=G((0.46, 0.41, 0.35), sat=0.6)),
    "dish": dict(src="satellite_dish", pick=lambda o: True, yaw=0, dec_all=0.3, size=(2, 1.15), tex=(256, 256), hook="dish"),
    "ac": dict(src="lowpoly_air_conditioner_outdoor_unit", pick=lambda o: True, yaw=0, size=(0, 0.86), tex=(256, 128),
               grade=G((0.72, 0.71, 0.66), sat=0.5)),
    "tires": dict(src="tire_stack", pick=lambda o: True, yaw=0, size=(2, 1.0), tex=(256, 256)),
    "bag": dict(src="trash_bag_low_poly_game_ready_pbr", pick=lambda o: True, yaw=0, dec_all=0.2, size=(1, 0.78), tex=(256, 128),
                grade=G(sat=0.8)),
}


def main(specs=None):
    specs = SPECS if specs is None else specs
    bpy.ops.wm.read_factory_settings(use_empty=True)
    lib = bpy.data.collections.new("Prop Library")
    bpy.context.scene.collection.children.link(lib)
    report = {}
    for name, spec in specs.items():
        A.INC = spec.get("inc", SANDGATE_INC)
        new, keep = A.import_parts(spec["src"], spec["pick"])
        for part in keep:
            for pre, ratio in spec.get("dec", {}).items():
                if part.name == pre or part.name.startswith(pre + "."):
                    part.data = part.data.copy()
                    A.decimate(part, ratio)
        names = [x.name for x in new]
        o = A.join(keep, name)
        for nm in names:
            x = bpy.data.objects.get(nm)
            if x is not None and x is not o:
                bpy.data.objects.remove(x, do_unlink=True)
        for c in list(o.users_collection):
            c.objects.unlink(o)
        lib.objects.link(o)
        if spec.get("hook") == "wreck":
            crop_wreck(o)
        if spec.get("dec_all"):
            A.decimate(o, spec["dec_all"])
        if spec.get("hook") == "dish":  # untextured white: a weathered light grey
            for m in o.data.materials:
                b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
                if b is not None and not b.inputs["Base Color"].links:
                    b.inputs["Base Color"].default_value = (0.58, 0.57, 0.53, 1)
        A.recentre(o, spec["yaw"])
        if "size" in spec:  # else the source is in metres already
            axis, size = spec["size"]
            scale_to(o, axis, size)
        if spec.get("hook") == "wreck":
            flatten_outside(o, -2.2, 2.2, -1.08, 1.08)
        if spec.get("hook") in ("palm", "tall-palm"):
            # The trunk's foot at the origin (the crown leans off it), fronds trimmed round it.
            vs = np.array([v.co[:] for v in o.data.vertices])
            foot = vs[vs[:, 2] < 0.3][:, :2].mean(0)
            o.data.transform(Matrix.Translation(Vector((-foot[0], -foot[1], -vs[:, 2].min()))))
            trim_fronds(o, 2.35, 0.9)
            if spec["hook"] == "tall-palm":  # the pack's dry fronds and bark carry no texture
                tint_untextured(o, "Leaves_Dry", (0.36, 0.27, 0.15))
                tint_untextured(o, "Bark", (0.42, 0.37, 0.31))
            vs = np.array([v.co[:] for v in o.data.vertices])
            size3 = (vs.max(0) - vs.min(0)).tolist()
        else:
            size3 = A.recentre(o, 0)
        if spec.get("merge"):
            merge_materials(o, spec["merge"])
        if spec.get("vcol"):
            colours_to_vertices(o, name)
        if spec.get("share"):  # the same source texture as another prop: one copy of it
            o.data.materials.clear()
            for m in bpy.data.objects["lib-" + spec["share"]].data.materials:
                o.data.materials.append(m)
        else:
            A.process_textures(o, name, spec["tex"], spec.get("grade"))
        o.data.update()
        vs = np.array([v.co[:] for v in o.data.vertices])
        tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
        shapes = SHAPES.get(name)
        report[name] = {"stray": stray(o, shapes) if shapes else None, "size": [round(s, 3) for s in size3], "min": vs.min(0).round(3).tolist(),
                        "max": vs.max(0).round(3).tolist(), "tris": tris,
                        "materials": [m.name for m in o.data.materials if m]}
        print("PROP", name, json.dumps(report[name]), flush=True)
        for img in list(bpy.data.images):
            if not img.users:
                bpy.data.images.remove(img)
        bpy.data.orphans_purge(do_recursive=True)
    bpy.data.orphans_purge(do_recursive=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT)
    json.dump(report, open(REPORT, "w"), indent=1)
    print("saved", OUT)


if __name__ == "__main__":
    main()
