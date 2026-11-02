"""
Build FROSTLINE in Blender from build/layout.json (art/blender/frostline/layout.py).

  python build_frostline.py -- <out.glb> [--blockout] [--blend out.blend]

Same pipeline as the AIM ARENA (art/blender/map/build_arena.py), so the runtime gets the same
asset shape: objects grouped into spatial culling sections (west / centre / east x north / mid /
south), one joined mesh per material inside a section, repeated props as linked duplicates
(glTF mesh instancing, then GPU instancing via gltf-transform), node tree mirroring the sections.

--blockout   Phase 2: every gameplay solid as a plain box, for layout validation in the game.
(default)    Phase 4: the detailed winter environment (frost_kit.py) dressed around the same boxes.
"""
import bpy, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(1, os.path.join(HERE, "..", "map"))
argv = sys.argv[sys.argv.index("--") + 1:]
OUT = argv[0]
BLOCKOUT = "--blockout" in argv
BLEND = argv[argv.index("--blend") + 1] if "--blend" in argv else None
L = json.load(open(os.path.join(HERE, "build", "layout.json")))

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
ROOT_NAME = "frostline"


def to_blender(x, y, z):
    """Game/glTF (x, y up, z) -> Blender (x, -z, y up)."""
    return (x, -z, y)


def section_of(x, z):
    sx = "west" if x < -6.5 else "east" if x > 6.5 else "centre"
    sz = "north" if z < -6 else "south" if z > 6 else "mid"
    return f"{sx}-{sz}"


def material(name, color, rough=0.85, metal=0.0):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m


def box_object(name, x, y, z, w, h, d, mat, collection):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.name = name
    o.scale = (w, d, h)
    o.location = to_blender(x, y, z)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    for c in o.users_collection:
        c.objects.unlink(o)
    collection.objects.link(o)
    return o


def sections():
    root = bpy.data.collections.new(ROOT_NAME)
    sc.collection.children.link(root)
    cache = {}

    def get(name):
        if name not in cache:
            c = bpy.data.collections.new(name)
            root.children.link(c)
            cache[name] = c
        return cache[name]

    return root, get


def join_by_material(collection):
    """One mesh per material inside a section (fewer draw calls, still cullable per section)."""
    by_mat = {}
    for o in list(collection.objects):
        if o.type == "MESH" and o.data.users == 1 and not o.get("instance"):
            by_mat.setdefault((o.data.materials[0].name, bool(o.get("noShadow"))), []).append(o)
    for name, objs in by_mat.items():
        if len(objs) < 2:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.join()
        objs[0].name = f"{collection.name}-{name[0]}{'-ns' if name[1] else ''}"


def export(out):
    root = bpy.data.collections[ROOT_NAME]
    for c in root.children:
        empty = bpy.data.objects.new(f"section-{c.name}", None)
        c.objects.link(empty)
        for o in c.objects:
            if o is not empty and o.parent is None:
                o.parent = empty
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=True, export_yup=True,
                              export_texcoords=True, export_normals=True, export_materials="EXPORT",
                              export_image_format="WEBP", export_extras=True, export_animations=False,
                              export_vertex_color="ACTIVE")


root, section = sections()
if BLOCKOUT:
    mats = {
        "concrete": material("dev-concrete", (0.62, 0.64, 0.67)),
        "metal": material("dev-metal", (0.30, 0.38, 0.46), 0.6, 0.3),
        "wood": material("dev-wood", (0.45, 0.32, 0.20)),
    }
    for s in L["solids"]:
        box_object(s["id"], s["x"], s["y"], s["z"], s["w"], s["h"], s["d"], mats[s["surface"]],
                   section(section_of(s["x"], s["z"])))
    for w in L["walls"]:
        box_object(w["id"], w["x"], w["y"], w["z"], w["w"], w["h"], w["d"], mats["concrete"], section("perimeter"))
    snow = material("dev-snow", (0.86, 0.89, 0.93), 0.9)
    box_object("floor", 0, -0.2, 0, L["arena"]["width"] + 12, 0.4, L["arena"]["depth"] + 12, snow, section("ground"))
    for c in list(root.children):
        join_by_material(c)
else:
    import frost_kit

    frost_kit.build(L, section, to_blender)
    for c in list(root.children):
        join_by_material(c)

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND), relative_remap=True)
    bpy.ops.file.make_paths_relative()
    bpy.ops.wm.save_mainfile()
export(OUT)
print("exported", OUT)
