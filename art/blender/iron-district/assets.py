"""
IRON DISTRICT asset library: imports the downloaded models (incoming/, gitignored; manifest and
credits in docs/fps-bomb/IRON-DISTRICT-ASSETS.md and public/fps/models/iron-district-credits.txt),
keeps the parts the map uses, joins each into one mesh, decimates the heavy ones, recentres them
(origin at the bottom centre, long axis along Blender X) and downsizes their textures to the map's
budget. Writes build/library.blend ("Asset Library" collection, one object per asset) and
build/library.json (sizes, triangles), which build_iron_district.py appends and instances.

  python3 art/blender/iron-district/assets.py        (bpy as a Python module)

Sketchfab models are CC BY 4.0, Poly Haven models CC0. The Sketchfab "Trash bin" is deliberately
not imported: its mesh name (trashcan_indoor001a / lobby_fixtures) is a Source-engine asset name,
so the upload's licence cannot be trusted.
"""
import bpy, bmesh, json, math, os, sys
import numpy as np
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
INC = os.path.join(HERE, "incoming")
LIBTEX = os.path.join(HERE, "build", "tex", "lib")
OUT = os.path.join(HERE, "build", "library.blend")
os.makedirs(LIBTEX, exist_ok=True)

sys.path.insert(0, os.path.join(HERE, "..", "map06"))
import assets as sg  # noqa: E402  (Sandgate helpers: join, decimate, recentre, litify, role_of)

sg.LIBTEX = LIBTEX
sg.CLEAN = {}


def names(*prefixes):
    return lambda o: any(o.name == p or o.name.startswith(p) for p in prefixes)


def exact(*ns):
    s = set(ns)
    return lambda o: o.name in s


PACK = "industrial_asset_pack"
# `dec_all` sets each prop's triangle budget by its size on screen. The render audit of 2026-11-11
# found the props holding 190k of the map's 253k triangles (a 0.5 m power box had 7.4k).
SPECS = {
    # name: src (folder with scene.gltf, or a Poly Haven .blend), pick, yaw, dec, tex (colour, data)
    "forklift": dict(src="forklift", pick=lambda o: True, yaw=0, dec_all=0.2, tex=(1024, 512), atlas=1024),
    "drum-blue": dict(src=PACK, pick=exact("barrel_barrel_0", "cap.barrel_cap.barrel_0", "cap.base_cap.base_0"), yaw=0, tex=(512, 128), atlas=512),
    "drum-red": dict(src=PACK, pick=exact("barrel2_barrel2_0", "cap.barrel2_cap.barrel2_0", "cap.base2_cap.base2_0"), yaw=0, tex=(512, 128), atlas=512),
    "drum-green": dict(src=PACK, pick=exact("barrel3_barrel3_0", "cap.barrel3_cap.barrel3_0", "cap.base3_cap.base3_0"), yaw=0, tex=(512, 128), atlas=512),
    "drum-grey": dict(src=PACK, pick=exact("barrel4_barrel4_0", "cap.barrel4_cap.barrel4_0", "cap.base4_cap.base4_0"), yaw=0, tex=(512, 128), atlas=512),
    "gas-cylinder": dict(src=PACK, pick=exact("cylinder_T.G.Cylinder_0", "tap_tap_0", "valve_valve_0", "dial_dial_0", "dial.rim_dial.rim_0"), yaw=0, tex=(512, 128), atlas=512),
    "gas-cylinder-2": dict(src=PACK, pick=exact("cylinder2_T.G.Cylinder2_0", "dial2_dial2_0", "dial.rim2_dial.rim2_0", "tap2_tap2_0", "valve2_valve2_0"), yaw=0, tex=(512, 128), atlas=512),
    "oil-can": dict(src=PACK, pick=exact("oil.can_can_0", "cap_cap_0", "cap.rim_cap.rim_0", "handle_handle_0"), yaw=0, tex=(256, 256), atlas=256),
    "pallet": dict(src=PACK, pick=exact("Cube.001_pallet_0"), yaw=0, tex=(512, 128)),
    "wooden-box": dict(src=PACK, pick=exact("Cube.002_Wooden Box_0"), yaw=0, tex=(512, 128)),
    "truck": dict(src="low_poly_truck", pick=lambda o: True, yaw=90, tex=(512, 128), atlas=512),
    "van": dict(src="french_delivery_van_-_low_poly_model", pick=lambda o: True, yaw=90, tex=(512, 128), atlas=512),
    "generator": dict(src="mini_power_generator", pick=lambda o: True, yaw=0, dec_all=0.014, tex=(512, 128), atlas=512),
    "plant": dict(src="potted_plant", pick=lambda o: True, yaw=0, dec_all=0.11, tex=(512, 128), atlas=512),
    "fountain": dict(src="alcazar_garden_fountain", pick=lambda o: True, yaw=0, dec_all=0.017, tex=(1024, 256)),
    # Poly Haven (CC0) .blend models
    "power-box": dict(blend="power_box_01_2k.blend/power_box_01_2k.blend", yaw=0, dec_all=0.12, tex=(512, 128)),
    "utility-box": dict(blend="utility_box_01_2k.blend/utility_box_01_2k.blend", yaw=0, dec_all=0.45, tex=(512, 128)),
    "utility-box-2": dict(blend="utility_box_02_2k.blend/utility_box_02_2k.blend", yaw=0, dec_all=0.35, tex=(512, 128)),
    "airduct": dict(blend="modular_airduct_circular_01_2k.blend/modular_airduct_circular_01_2k.blend", yaw=0, dec_all=0.18, tex=(512, 128), keep_parts=True),
    "crate": dict(blend="wooden_crate_02_2k.blend/wooden_crate_02_2k.blend", yaw=0, dec_all=0.4, tex=(512, 128)),
    "barrel": dict(blend="barrel_03_2k.blend/barrel_03_2k.blend", yaw=0, tex=(512, 128)),
    "small-oil-can": dict(blend="small_oil_can_01_2k.blend/small_oil_can_01_2k.blend", yaw=0, dec_all=0.08, tex=(256, 256)),
}


def import_gltf(src, pick):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(INC, src, "scene.gltf"))
    new = [o for o in bpy.data.objects if o not in before]
    keep = [o for o in new if o.type == "MESH" and o.data.materials and pick(o)]
    return new, keep


def import_blend(path):
    full = os.path.join(INC, path)
    with bpy.data.libraries.load(full, link=False) as (src, dst):
        dst.objects = list(src.objects)
    new = [o for o in dst.objects if o is not None]
    for o in new:
        bpy.context.scene.collection.objects.link(o)
    for img in bpy.data.images:  # resolve the blend's relative texture paths
        if img.filepath.startswith("//"):
            img.filepath = os.path.join(os.path.dirname(full), img.filepath[2:])
    # The meshes only: no rig widgets (wdg_*), and the rig's armature modifiers dropped (rest pose).
    keep = [o for o in new if o.type == "MESH" and o.data.materials and not o.name.startswith("wdg")]
    for o in keep:
        for m in list(o.modifiers):
            if m.type == "ARMATURE":
                o.modifiers.remove(m)
    return new, keep


def exr_to_png(img, size, path):
    """Poly Haven ships normal / roughness / metalness as EXR: resample and write 8-bit PNG."""
    img.reload()
    w, h = img.size
    if w > size or h > size:
        img.scale(min(w, size), min(h, size))
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()


def process_textures(o, name, sizes):
    """sg.process_textures, plus EXR sources (converted through Blender's own image I/O)."""
    for slot in o.data.materials:
        if not slot or not slot.use_nodes:
            continue
        for n in slot.node_tree.nodes:
            if n.type == "TEX_IMAGE" and n.image and n.image.filepath.lower().endswith(".exr"):
                role = sg.role_of(n, slot.node_tree)
                size = sizes[0] if role == "color" else sizes[1]
                stem = f"{name}-{bpy.path.clean_name(os.path.splitext(n.image.name)[0])}"
                path = os.path.join(LIBTEX, stem + ".png")
                exr_to_png(n.image, size, path)
                new = bpy.data.images.load(path)
                new.colorspace_settings.name = "Non-Color"
                new.name = stem
                n.image = new
    sg.process_textures(o, name, sizes, None)


def bake_atlas(o, name, size):
    """Many-material props (the forklift has 40 materials, one draw call each): bake every
    material's base colour into one atlas on a fresh UV unwrap (Cycles, colour pass only) and
    give the mesh a single material (average roughness and metalness of the sources)."""
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 1
    sc.cycles.device = "CPU"
    me = o.data
    src_name = me.uv_layers.active.name
    me.uv_layers.new(name="atlas")
    me.uv_layers.active = me.uv_layers["atlas"]
    bpy.context.view_layer.objects.active = o
    for x in bpy.context.view_layer.objects:
        x.select_set(x is o)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(80), island_margin=0.002)
    bpy.ops.uv.pack_islands(rotate=True, margin=0.003)
    bpy.ops.object.mode_set(mode="OBJECT")
    img = bpy.data.images.new(f"{name}-atlas", size, size)
    rough, metal = [], []
    for m in me.materials:
        nt = m.node_tree
        b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if b is not None:
            rough.append(b.inputs["Roughness"].default_value)
            metal.append(b.inputs["Metallic"].default_value)
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = img
        nt.nodes.active = t
        # The source textures keep reading the original UV map.
        for n in nt.nodes:
            if n.type == "TEX_IMAGE" and n is not t and not n.inputs["Vector"].links:
                uvn = nt.nodes.new("ShaderNodeUVMap")
                uvn.uv_map = src_name
                nt.links.new(uvn.outputs["UV"], n.inputs["Vector"])
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, margin=4, use_clear=True)
    path = os.path.join(LIBTEX, f"{name}-atlas.jpg")
    img.filepath_raw = path
    img.file_format = "JPEG"
    img.save()
    mat = bpy.data.materials.new(f"lib-{name}-atlas")
    mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]
    t = mat.node_tree.nodes.new("ShaderNodeTexImage")
    t.image = bpy.data.images.load(path)
    mat.node_tree.links.new(t.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = float(np.mean(rough)) if rough else 0.7
    b.inputs["Metallic"].default_value = min(0.5, float(np.mean(metal))) if metal else 0.0
    me.materials.clear()
    me.materials.append(mat)
    me.uv_layers.remove(me.uv_layers[src_name])
    me.uv_layers["atlas"].name = "UVMap"
    sc.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    lib = bpy.data.collections.new("Asset Library")
    bpy.context.scene.collection.children.link(lib)
    report = {}
    for name, spec in SPECS.items():
        if "blend" in spec:
            new, keep = import_blend(spec["blend"])
        else:
            new, keep = import_gltf(spec["src"], spec["pick"])
        if not keep:
            print("ASSET-MISSING", name, flush=True)
            continue
        names_ = [x.name for x in new]
        o = sg.join(keep, name)
        for nm in names_:
            x = bpy.data.objects.get(nm)
            if x is not None and x is not o:
                bpy.data.objects.remove(x, do_unlink=True)
        for c in list(o.users_collection):
            c.objects.unlink(o)
        lib.objects.link(o)
        # Atlas first (the undecimated mesh unwraps into far fewer, larger islands), then
        # decimate (UVs are kept), then recentre.
        process_textures(o, name, spec["tex"])
        if spec.get("atlas"):
            bake_atlas(o, name, spec["atlas"])
        if spec.get("dec_all"):
            sg.decimate(o, spec["dec_all"])
        size = sg.recentre(o, spec["yaw"])
        o.data.update()
        tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
        report[name] = {"size": [round(s, 3) for s in size], "tris": tris, "materials": [m.name for m in o.data.materials]}
        print("ASSET", name, json.dumps(report[name]), flush=True)
        for img in list(bpy.data.images):
            if not img.users:
                bpy.data.images.remove(img)
        bpy.data.orphans_purge(do_recursive=True)
    bpy.data.orphans_purge(do_recursive=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT)
    json.dump(report, open(os.path.join(HERE, "build", "library.json"), "w"), indent=1)
    print("saved", OUT)


if __name__ == "__main__":
    main()
