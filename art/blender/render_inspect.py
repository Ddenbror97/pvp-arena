"""Close-up Cycles renders of the AK mesh (arms hidden) for quality inspection."""
import bpy, sys, math, mathutils
args = sys.argv[sys.argv.index("--") + 1:]
glb, out = args[0], args[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
for o in list(bpy.data.objects):
    if o.name in ("FPArms", "Icosphere") or o.name.startswith("SpareMagazine"):
        o.hide_render = True
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 48
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 1280, 720
sc.view_settings.view_transform = "AgX"
world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.55, 0.58, 0.62, 1); bg.inputs[1].default_value = 0.6
def light(name, loc, energy, size):
    d = bpy.data.lights.new(name, "AREA"); d.energy = energy; d.size = size
    o = bpy.data.objects.new(name, d); o.location = loc; sc.collection.objects.link(o)
    o.rotation_euler = (mathutils.Vector((0, 0.5, 0)) - mathutils.Vector(loc)).to_track_quat("-Z", "Y").to_euler()
light("key", (1.2, 0.2, 0.9), 220, 1.2); light("rim", (-1.0, 1.4, 0.6), 160, 1.0); light("fill", (0.6, -0.8, -0.3), 60, 2)
cam_data = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_data); sc.collection.objects.link(cam); sc.camera = cam
shots = {
  "side":     ((0.0, 0.6, 0.02), (1.6, 0.6, 0.05), 32),
  "receiver": ((0.0, 0.5, 0.0),  (0.45, 0.42, 0.06), 40),
  "fp":       ((0.0, 0.9, 0.0),  (0.08, -0.05, 0.12), 26),
  "mag":      ((0.0, 0.48, -0.15),(-0.4, 0.3, -0.15), 45),
}
for name, (target, loc, lens) in shots.items():
    cam.location = loc; cam_data.lens = lens
    cam.rotation_euler = (mathutils.Vector(target) - mathutils.Vector(loc)).to_track_quat("-Z", "Z").to_euler()
    sc.render.filepath = f"{out}/{name}.png"; bpy.ops.render.render(write_still=True)
