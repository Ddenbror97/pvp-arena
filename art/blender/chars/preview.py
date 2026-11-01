"""Workbench turnaround of a character .blend or GLB: front, side, back, three-quarter, face.

  python preview.py -- <file.blend|file.glb> <out_dir>
"""
import bpy, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src, out = argv[0], argv[1]
os.makedirs(out, exist_ok=True)
if src.endswith(".blend"):
    bpy.ops.wm.open_mainfile(filepath=src)
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
# Fit like the game: body scaled so the head centre (Head..HeadTop_End midpoint) is at 1.6 m,
# the realistic head and head kit unscaled at that point.
HEAD_GLB = os.path.join(HERE, "..", "..", "..", "public", "fps", "models", "reference-head-webp.glb")
kit = bpy.data.objects.get("head-kit")
rig = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
if rig and kit:
    hb = rig.data.bones
    c = (hb["Head"].head_local + hb["HeadTop_End"].head_local) / 2
    s = 1.6 / c.z
    rig.scale = (s * 1.06, s * 1.06, s)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=HEAD_GLB)
    for o in set(bpy.data.objects) - before:
        # Same neck taper as authored-character.ts (three y = Blender z, three z = Blender -y).
        if o.type == "MESH" and any(m and m.name.endswith(".body") for m in o.data.materials):
            def ss(e0, e1, x):
                t = min(1, max(0, (x - e0) / (e1 - e0)))
                return t * t * (3 - 2 * t)
            for v in o.data.vertices:
                x, y, z = v.co.x, v.co.z, -v.co.y
                b = ss(0.08, 0.16, -y)
                nx = x + (max(-0.068, min(0.068, x)) - x) * b
                ny = y - ss(0.12, 0.18, -y) * 0.05
                nz = z + (max(-0.062, min(0.074, z)) - z) * b
                v.co = (nx, -nz, ny)
        if o.parent is None:
            o.location = (0, 0, 1.6)
            o.rotation_mode = "XYZ"
            o.rotation_euler.z += math.pi  # head GLB faces +Y here; the body faces -Y
    kit.location = (0, 0, 1.6)
    kit.rotation_euler.z = math.pi
if "hidehead" in argv:
    for o in bpy.data.objects:
        if o.type == "MESH" and o.name.startswith(("short", "low-poly", "Mesh")):
            o.hide_render = True
CYCLES = "cycles" in argv
sc.render.engine = "CYCLES" if CYCLES else "BLENDER_WORKBENCH"
if CYCLES:
    sc.cycles.samples = 24
    sc.cycles.use_denoising = True
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
    sc.collection.objects.link(sun)
    sc.view_settings.view_transform = "AgX"
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "TEXTURE"
sc.display.shading.show_cavity = True
sc.display.shading.show_shadows = False
sc.render.resolution_x, sc.render.resolution_y = 720, 960
if not sc.world:
    sc.world = bpy.data.worlds.new("w")
sc.world.color = (0.32, 0.35, 0.4)
if CYCLES:
    sc.world.use_nodes = True
    sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.35, 0.38, 0.42, 1)
    sc.world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    sc.render.resolution_x, sc.render.resolution_y = 480, 640
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.lens = 70
for name, ang, dist, tz, lens in (("front", 0, 4.2, 0.92, 70), ("side", 90, 4.2, 0.92, 70), ("back", 180, 4.2, 0.92, 70),
                                  ("threequarter", 35, 4.2, 0.92, 70), ("face", 25, 1.1, 1.6, 85)):
    a = math.radians(ang)
    cam.data.lens = lens
    t = Vector((0, 0, tz))
    cam.location = t + Vector((math.sin(a) * dist, -math.cos(a) * dist, 0.05))
    cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(out, name + ".png")
    bpy.ops.render.render(write_still=True)
print("PREVIEW", out)
