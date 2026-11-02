"""
Build SUBURBAN SHOWDOWN in Blender from build/layout.json (art/blender/suburbia/layout.py).

  python build_suburbia.py -- <out.glb> [--blockout] [--blend out.blend] [--fit]

Same pipeline and asset shape as the other maps (art/blender/crossfire/build_crossfire.py): objects
grouped into spatial culling sections (west / centre / east x north / mid / south, plus ground,
roofs, perimeter, background), one joined mesh per material inside a section, repeated models as
linked duplicates (glTF mesh instancing, then GPU instancing via gltf-transform), node tree
mirroring the sections.

--blockout   every gameplay solid as a plain box, for layout checks in the game.
(default)    the procedural suburb (suburbia_kit.py) plus the Sketchfab models (props.py).
--fit        print each placed model's bounds (for fitting the collision to the models).
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
ROOT_NAME = "suburbia"


def to_blender(x, y, z):
    """Game/glTF (x, y up, z) -> Blender (x, -z, y up)."""
    return (x, -z, y)


def material(name, color, rough=0.85, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
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
    """One mesh per material set inside a section (fewer draw calls, still cullable per section)."""
    by_mat = {}
    for o in list(collection.objects):
        if o.type == "MESH" and o.data.users == 1 and not o.get("instance"):
            key = (tuple(sorted(m.name for m in o.data.materials if m)), bool(o.get("noShadow")))
            by_mat.setdefault(key, []).append(o)
    for key, objs in by_mat.items():
        if len(objs) < 2:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.join()
        objs[0].name = f"{collection.name}-{key[0][0] if key[0] else 'mesh'}{'-ns' if key[1] else ''}"


def export(out):
    root = bpy.data.collections[ROOT_NAME]
    for c in root.children:
        empty = bpy.data.objects.new(f"section-{c.name}", None)
        c.objects.link(empty)
        for o in c.objects:
            if o is not empty and o.parent is None:
                o.parent = empty
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=True, export_yup=True,
                              export_texcoords=True, export_normals=True, export_materials="EXPORT",
                              export_image_format="WEBP", export_extras=True, export_animations=False,
                              export_vertex_color="ACTIVE", use_active_collection=False, use_visible=True)


root, section = sections()
if BLOCKOUT:
    mats = {
        "concrete": material("dev-concrete", (0.80, 0.78, 0.74)),
        "metal": material("dev-metal", (0.42, 0.31, 0.63), 0.6, 0.3),
        "wood": material("dev-wood", (0.55, 0.42, 0.28)),
    }
    import suburbia_kit
    for s in L["solids"]:
        box_object(s["id"], s["x"], s["y"], s["z"], s["w"], s["h"], s["d"], mats[s["surface"]],
                   section(suburbia_kit.section_of(s["x"], s["z"])))
    for w in L["walls"]:
        box_object(w["id"], w["x"], w["y"], w["z"], w["w"], w["h"], w["d"], mats["wood"], section("perimeter"))
    floor = material("dev-floor", (0.45, 0.55, 0.35), 0.9)
    box_object("floor", 0, -0.2, 0, L["arena"]["width"] + 12, 0.4, L["arena"]["depth"] + 12, floor, section("ground"))
    for c in list(root.children):
        join_by_material(c)
else:
    import suburbia_kit
    import props
    suburbia_kit.build(L, section, to_blender)
    props.build(L, section, suburbia_kit.section_of, suburbia_kit.TREE_SPOTS)
    if "--fit" in argv:
        props.fit_report(L)
    bad = props.validate(L, suburbia_kit.in_reach)
    if bad:
        print(f"PROPS VALIDATE: {sum(len(v) for v in bad.values())} model vertices outside collision:")
        for k, v in bad.items():
            print("   ", k, len(v), v[:4])
    else:
        print("PROPS VALIDATE: every model matches collision within 6 cm below 2.9 m")
    for c in list(root.children):
        join_by_material(c)

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND), relative_remap=True)
    bpy.ops.file.make_paths_relative()
    bpy.ops.wm.save_mainfile()
export(OUT)
print("exported", OUT)
