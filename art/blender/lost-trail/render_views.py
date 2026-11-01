"""
Render review views of build/lost-trail.blend (Cycles CPU, low samples) into a contact sheet.

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
    "overhead": ((0, 62, 0.01), (0, 0, 0), 50),
    "spawnA": ((-19.5, EYE, 0.5), (-10, EYE, 4.3), 80),
    "spawnB": ((19.5, EYE, -0.5), (10, EYE, -4.3), 80),
    "bridge": ((-5.4, EYE, 1.3), (6, EYE, 0.8), 80),
    "post": ((-9.6, 1.5 + EYE, -10.6), (0, 0.8, 0), 80),
    "ford": ((-9, EYE, 12.6), (6, EYE, 11), 80),
    "canopy": ((-8, EYE, 3), (-6, 30, 2), 90),
    "boundary": ((-12, EYE, 13.5), (-30, 6, 30), 80),
}
names = argv[1].split(",") if len(argv) > 1 else list(VIEWS)

bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, "build", "lost-trail.blend"))
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
world.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.65, 0.6, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 1.4
sc.world = world
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
sun.data.energy = 3.0
sun.data.color = (1.0, 0.89, 0.72)
sc.collection.objects.link(sun)
d = Vector((18, 14, 26)).normalized()  # game (18, 26, -14) → Blender (x, -z, y)
sun.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
# As in the game: crowns and foliage never cast shadows (noShadow); hide the canopy for the
# overhead plan view.
for o in bpy.data.objects:
    if o.get("noShadow") or "crown" in o.name:
        o.visible_shadow = False
def show_canopy(on):
    for o in bpy.data.objects:
        if "crown" in o.name and o.location.z > 12:
            o.hide_render = not on
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.clip_end = 400
g2b = lambda p: Vector((p[0], -p[2], p[1]))
os.makedirs(OUT, exist_ok=True)
for name in names:
    eye, target, fov = VIEWS[name]
    show_canopy(name != "overhead")
    cam.location = g2b(eye)
    direction = g2b(target) - g2b(eye)
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam.data.angle = math.radians(fov)
    sc.render.filepath = os.path.join(OUT, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", name)
