"""
Render review views of crossfire.blend (Cycles CPU, low samples) into a contact sheet.

  python render_views.py -- <out_dir> [view,view,...]

Views use game coordinates (x, y, z with y up) for the eye and the look-at target.
"""
import bpy, math, os, sys
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index("--") + 1:]
OUT = argv[0]
EYE = 1.6
VIEWS = {
    "overhead": ((0, 72, 0.01), (0, 0, 0), 55),
    "spawnA": ((-21.6, EYE, 6.5), (-10, EYE, 4.0), 80),
    "spawnB": ((21.6, EYE, -6.5), (10, EYE, -4.0), 80),
    "square": ((-9.5, EYE, -6.5), (2, 1.0, 1), 80),
    "squareB": ((9.5, EYE, 6.5), (-2, 1.0, -1), 80),
    "heliDoor": ((2.2, EYE, -5.0), (2.2, 1.2, 0), 75),
    "cabin": ((-2.6, EYE, -0.6), (3.5, 1.3, -0.3), 85),
    "market": ((-12.8, EYE, 13.6), (10, 2.6, 13.6), 80),
    "passage": ((12.8, EYE, -13.6), (-10, 2.6, -13.6), 80),
    "terraceA": ((-15.5, 3.0 + EYE, -12.0), (4, 1.0, 1.0), 80),
    "interiorA": ((-22.6, EYE, -7.6), (-14, 1.3, -1.5), 85),
    "terminalB": ((4.0, EYE, 2.0), (16, 3.0, 4.0), 80),
    "skyline": ((-12, EYE, 14), (-34, 9, 30), 80),
}
names = argv[1].split(",") if len(argv) > 1 else list(VIEWS)

bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, "crossfire.blend"))
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = 8
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 640, 360
sc.render.image_settings.file_format = "PNG"
# Lighting approximating the map definition (sun + sky).
world = bpy.data.worlds.new("w")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.78, 0.72, 0.62, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 1.1
sc.world = world
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
sun.data.energy = 3.4
sun.data.color = (1.0, 0.80, 0.58)
sc.collection.objects.link(sun)
d = Vector((-26, -20, 17)).normalized()  # game (-26, 17, 20) → Blender (x, -z, y)
sun.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
# As in the game: noShadow objects never cast shadows.
for o in bpy.data.objects:
    if o.get("noShadow"):
        o.visible_shadow = False
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.clip_end = 400
g2b = lambda p: Vector((p[0], -p[2], p[1]))
os.makedirs(OUT, exist_ok=True)
for name in names:
    eye, target, fov = VIEWS[name]
    cam.location = g2b(eye)
    direction = g2b(target) - g2b(eye)
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam.data.angle = math.radians(fov)
    sc.render.filepath = os.path.join(OUT, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", name)
