"""
Render review views of suburbia.blend (Cycles CPU, low samples).

  python render_views.py -- <out_dir> [view,view,...] [--samples N] [--size WxH]

Views use game coordinates (x, y, z with y up) for the eye and the look-at target.
"""
import bpy, math, os, sys
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index("--") + 1:]
OUT = argv[0]
EYE = 1.6
VIEWS = {
    "overhead": ((0, 88, 0.01), (0, 0, 0), 50),
    "aerial": ((-30, 34, 30), (0, 0, -2), 60),
    "spawnA": ((-29.5, EYE, -2.0), (-20, 1.4, 1.0), 85),
    "backyardA": ((-31.0, EYE, 9.0), (-24, 1.6, -4.0), 85),
    "porchA": ((-9.0, EYE, 1.0), (10, 2.0, 2.0), 80),
    "streetA": ((-6.5, EYE, 13.0), (-18, 3.5, -2.0), 80),
    "houseB": ((6.5, EYE, 8.0), (19, 3.5, 0.0), 80),
    "kitchenA": ((-24.2, EYE, 0.5), (-18.5, 1.0, 4.0), 85),
    "livingA": ((-14.0, EYE, 4.5), (-18.0, 1.0, -2.5), 85),
    "upstairsA": ((-23.5, 3.0 + EYE, -3.6), (-14, 4.0, 1.5), 85),
    "balconyA": ((-11.6, 3.0 + EYE, 1.8), (6, 1.5, 4.0), 80),
    "truck": ((0.5, EYE, -5.5), (0.0, 1.6, -11.0), 80),
    "cargo": ((-2.2, 0.9 + EYE, -10.6), (2.6, 1.6, -12.3), 85),
    "lane": ((-27.0, EYE, -17.0), (0.0, 3.0, -20.0), 80),
    "passageA": ((-26.5, EYE, -14.5), (-10, 1.4, -13.0), 80),
    "sideyardA": ((-24.0, EYE, 7.8), (-12, 2.0, 18.0), 80),
    "exit": ((3.0, EYE, 12.0), (0.0, 2.0, 24.0), 80),
    "garageA": ((-12.5, EYE, -9.0), (-22, 1.2, -9.0), 80),
}
names = [a for a in argv[1].split(",")] if len(argv) > 1 and not argv[1].startswith("--") else list(VIEWS)
samples = int(argv[argv.index("--samples") + 1]) if "--samples" in argv else 10
size = argv[argv.index("--size") + 1] if "--size" in argv else "800x450"

bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, "suburbia.blend"))
sc = bpy.context.scene
lib = bpy.data.collections.get("sketchfab-library")
if lib:
    for o in lib.objects:
        o.hide_render = True
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = samples
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = (int(v) for v in size.split("x"))
sc.render.image_settings.file_format = "PNG"
sc.view_settings.view_transform = "AgX"
world = bpy.data.worlds.new("w")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.62, 0.74, 0.92, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
sc.world = world
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
sun.data.energy = 3.6
sun.data.color = (1.0, 0.94, 0.84)
sun.data.angle = math.radians(1.5)
sc.collection.objects.link(sun)
d = Vector((-24, -18, 30)).normalized()  # game sun position (-24, 30, 18) -> Blender (x, -z, y)
sun.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
for o in bpy.data.objects:
    if o.get("noShadow"):
        o.visible_shadow = False
# As in the game: the baked AO and the tint families ride on the vertex colour (COLOR_0).
done = set()
for o in bpy.data.objects:
    if o.type != "MESH" or "Color" not in o.data.color_attributes:
        continue
    for m in o.data.materials:
        if not m or m.name in done or not m.use_nodes:
            continue
        done.add(m.name)
        nt = m.node_tree
        b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not b:
            continue
        ca = nt.nodes.new("ShaderNodeVertexColor")
        ca.layer_name = "Color"
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0
        inp = b.inputs["Base Color"]
        if inp.links:
            nt.links.new(inp.links[0].from_socket, mix.inputs[6])
        else:
            mix.inputs[6].default_value = inp.default_value
        nt.links.new(ca.outputs["Color"], mix.inputs[7])
        nt.links.new(mix.outputs[2], inp)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.clip_end = 600
g2b = lambda p: Vector((p[0], -p[2], p[1]))  # noqa: E731
os.makedirs(OUT, exist_ok=True)
for name in names:
    eye, target, fov = VIEWS[name]
    cam.location = g2b(eye)
    cam.rotation_euler = (g2b(target) - g2b(eye)).to_track_quat("-Z", "Y").to_euler()
    cam.data.angle = math.radians(fov)
    sc.render.filepath = os.path.join(OUT, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", name, flush=True)
