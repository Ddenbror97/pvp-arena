"""
AK-47 viewmodel build (Blender 4.2+/5.x, runs headless: `python build_ak_viewmodel.py -- <args>`
with the `bpy` module, or `blender -b -P build_ak_viewmodel.py -- <args>`).

  args: <decompressed source .glb> <out rifle .glb> <out .blend> <out wear .png> [--size N] [--samples N]

What it does to the authored rifle (arms/rig are NOT touched; they are merged back unchanged by
merge_ak_viewmodel.mjs so the runtime hand-fitting keeps its exact bone frames):

1. Cleanup: drop scene junk and the spare magazine; weld duplicate vertices; recompute
   normals as smooth-by-angle + face-weighted so the stamped receiver, magazine ribs and
   furniture shade as continuous surfaces instead of faceted triangles.
2. Wear UVs: every rifle part gets one shared, non-overlapping UV set ("wear", exported as
   TEXCOORD_1) packed into a single atlas. The authored UV0 is kept for any authored maps.
3. Bakes (Cycles): per-part ambient occlusion and a bevel-normal edge mask into that atlas,
   packed as R = AO, G = edge/convexity, B = cavity. The runtime finish shader uses it for
   edge wear (bare steel / worn varnish) and contact darkening.

The .blend keeps the processed rifle plus bake material so artists can keep refining by hand.
"""
import bpy, bmesh, sys, math, os

argv = sys.argv[sys.argv.index("--") + 1 :]
SRC, OUT_GLB, OUT_BLEND, OUT_WEAR = argv[:4]
def opt(name, default):
    return int(argv[argv.index(name) + 1]) if name in argv else default
SIZE = opt("--size", 2048)
SAMPLES = opt("--samples", 64)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)

# ---------------------------------------------------------------- 1. cleanup
for o in list(bpy.data.objects):
    junk = o.name.startswith("Icosphere") or o.name.startswith("SpareMagazine")
    if junk:
        bpy.data.objects.remove(o, do_unlink=True)

rifle = [
    o for o in bpy.data.objects
    if o.type == "MESH" and o.name != "FPArms" and not o.find_armature()
]
print("rifle parts:", [o.name for o in rifle])

for o in rifle:
    me = o.data
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.to_mesh(me); bm.free()
    # Keep only the authored UV0, then add the shared wear UV as the second set.
    while len(me.uv_layers) > 1:
        me.uv_layers.remove(me.uv_layers[-1])
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    me.uv_layers.new(name="wear")
    for p in me.polygons:
        p.use_smooth = True
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    # Smooth by angle (sharp machined edges stay crisp) + face-weighted normals (flat
    # faces stay flat, bevels take the curvature) — the standard hard-surface game setup.
    for e in me.edges:
        e.use_edge_sharp = False
    me.set_sharp_from_angle(angle=math.radians(38))
    wn = o.modifiers.new("weighted", "WEIGHTED_NORMAL")
    wn.keep_sharp = True
    wn.weight = 50
    wn.mode = "FACE_AREA"
    bpy.ops.object.modifier_apply(modifier=wn.name)
    o.select_set(False)

# ---------------------------------------------------------------- 2. wear UV atlas
bpy.ops.object.select_all(action="DESELECT")
for o in rifle:
    o.select_set(True)
    o.data.uv_layers.active = o.data.uv_layers["wear"]
bpy.context.view_layer.objects.active = rifle[0]
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(55), island_margin=0.0, scale_to_bounds=False,
                         correct_aspect=True)
# Texel density: every part shares one scale; pack all parts into one atlas.
bpy.ops.uv.average_islands_scale()
bpy.ops.uv.pack_islands(udim_source="CLOSEST_UDIM", rotate=True, margin_method="FRACTION",
                        margin=0.004, shape_method="CONCAVE")
bpy.ops.object.mode_set(mode="OBJECT")

# ---------------------------------------------------------------- 3. bakes
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = SAMPLES
sc.render.bake.margin = 12
sc.render.bake.use_clear = True
world = bpy.data.worlds.new("bake-world"); sc.world = world
world.light_settings.distance = 0.07  # AO reach ≈ 4 cm on the real gun (model is ~1.6x scale)

def image(name):
    img = bpy.data.images.new(name, SIZE, SIZE, alpha=False, float_buffer=True)
    img.colorspace_settings.name = "Non-Color"
    return img

def bake_material(img, edge):
    m = bpy.data.materials.new(f"bake-{img.name}")
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = img
    uv = nt.nodes.new("ShaderNodeUVMap"); uv.uv_map = "wear"
    nt.links.new(uv.outputs[0], tex.inputs[0])
    nt.nodes.active = tex
    if edge:
        # Convexity from the difference between a bevelled and the true normal: bright on
        # machined edges and corners, which is where steel/varnish wears through first.
        geo = nt.nodes.new("ShaderNodeNewGeometry")
        bevel = nt.nodes.new("ShaderNodeBevel"); bevel.samples = 16; bevel.inputs[0].default_value = 0.006
        dot = nt.nodes.new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"
        nt.links.new(bevel.outputs[0], dot.inputs[0]); nt.links.new(geo.outputs["Normal"], dot.inputs[1])
        inv = nt.nodes.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1
        nt.links.new(dot.outputs["Value"], inv.inputs[1])
        gain = nt.nodes.new("ShaderNodeMath"); gain.operation = "MULTIPLY"; gain.inputs[1].default_value = 9
        gain.use_clamp = True
        nt.links.new(inv.outputs[0], gain.inputs[0])
        value = gain.outputs[0]
    else:
        # Per-part ("only local") AO: the AK's receiver shells and covers overlap each other by
        # fractions of a millimetre, which a scene-wide AO bake reads as total occlusion.
        ao = nt.nodes.new("ShaderNodeAmbientOcclusion")
        ao.only_local = True
        ao.samples = 32
        ao.inputs["Distance"].default_value = 0.07
        value = ao.outputs["AO"]
    emit = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(value, emit.inputs["Color"])
    nt.links.new(emit.outputs[0], out.inputs["Surface"])
    return m

# Only the rifle occludes itself: hands must not bake shadows onto the grip and handguard,
# and the magazine must not be darkened by things that move away during the reload.
for o in bpy.data.objects:
    if o.type == "MESH" and o not in rifle:
        o.hide_render = True
original = {o.name: [s.material for s in o.material_slots] for o in rifle}
results = {}
for kind, bake_type in (("ao", "EMIT"), ("edge", "EMIT")):
    img = image(f"ak-{kind}")
    mat = bake_material(img, kind == "edge")
    for o in rifle:
        for s in o.material_slots:
            s.material = mat
    bpy.ops.object.select_all(action="DESELECT")
    for o in rifle:
        o.select_set(True)
    bpy.context.view_layer.objects.active = rifle[0]
    sc.render.bake.use_clear = True
    print("baking", kind)
    bpy.ops.object.bake(type=bake_type, uv_layer="wear", margin=12, use_clear=True)
    results[kind] = img
for o in rifle:
    for s, m in zip(o.material_slots, original[o.name]):
        s.material = m

# Pack R = AO, G = edge, B = cavity (concavity proxy: occluded but not an edge).
import numpy as np
ao = np.array(results["ao"].pixels[:], dtype=np.float32).reshape(SIZE, SIZE, 4)[..., 0]
# Near-zero AO on a visible part means an enclosed or coincident face inside the same part, not
# a real crevice: fade those back to unoccluded so overlapping shells can never read as black.
ao = np.where(ao < 0.15, 1 - (1 - 0.15) * np.clip(ao / 0.15, 0, 1) ** 0.5, ao)
edge = np.array(results["edge"].pixels[:], dtype=np.float32).reshape(SIZE, SIZE, 4)[..., 0]
cavity = np.clip((1 - ao) * 1.6 - edge * 0.5, 0, 1)
packed = np.stack([ao, edge, cavity, np.ones_like(ao)], axis=-1)
out_img = bpy.data.images.new("ak-wear", SIZE, SIZE, alpha=False)
out_img.colorspace_settings.name = "Non-Color"
out_img.pixels[:] = packed.ravel()
out_img.filepath_raw = OUT_WEAR
out_img.file_format = "PNG"
out_img.save()
print(f"wear stats ao mean={ao.mean():.3f} edge mean={edge.mean():.3f} p99={np.percentile(edge, 99):.3f}")

# ---------------------------------------------------------------- export + source
for o in list(bpy.data.objects):
    o.select_set(o in rifle)
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB, export_format="GLB", use_selection=True,
    export_texcoords=True, export_normals=True, export_materials="EXPORT", export_image_format="NONE",
    export_animations=False, export_skins=False, export_apply=True,
)
# The float bake buffers are intermediates; the .blend references the packed 8-bit atlas on disk
# (relative path) so the source stays small and re-bakes overwrite one file.
for img in (results["ao"], results["edge"]):
    bpy.data.images.remove(img)
for m in list(bpy.data.materials):
    if m.name.startswith("bake-"):
        bpy.data.materials.remove(m)
# Kept (fake user) so the source carries the atlas; repoint it at the shipped webp after merging.
out_img.filepath = bpy.path.relpath(os.path.abspath(OUT_WEAR), start=os.path.dirname(os.path.abspath(OUT_BLEND)))
out_img.use_fake_user = True
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True, relative_remap=True)
print("done", OUT_GLB, OUT_BLEND, OUT_WEAR)
