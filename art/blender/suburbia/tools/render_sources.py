"""Inspection renders of each downloaded source model (two views each, framed on its bounds)."""
import bpy, sys, os, math
from mathutils import Vector
argv = sys.argv[sys.argv.index("--") + 1:]
src, out = argv[0], argv[1]
only = argv[2].split(",") if len(argv) > 2 else None
os.makedirs(out, exist_ok=True)
for name in sorted(os.listdir(src)):
    g = os.path.join(src, name, "scene.gltf")
    if not os.path.exists(g) or (only and name not in only):
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=g)
    sc = bpy.context.scene
    meshes = [o for o in sc.objects if o.type == "MESH"]
    # Skip giant helper planes / backdrops (bounds far larger than the rest).
    pts = []
    for o in meshes:
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
        size = max((max(p[i] for p in bb) - min(p[i] for p in bb)) for i in range(3))
        o["size"] = size
    sizes = sorted(o["size"] for o in meshes)
    med = sizes[len(sizes) // 2]
    for o in meshes:
        if len(meshes) > 2 and o["size"] > 8 * med:
            o.hide_render = True
            continue
        pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
    c = (lo + hi) / 2; r = (hi - lo).length / 2
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 12; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 480, 360
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.78, 0.82, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 3
    sun.rotation_euler = (0.7, 0.2, 0.8); sc.collection.objects.link(sun)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.clip_end = r * 20; cam.data.clip_start = r / 100
    for i, (az, el) in enumerate(((35, 20), (215, 30))):
        d = Vector((math.cos(math.radians(az)) * math.cos(math.radians(el)), math.sin(math.radians(az)) * math.cos(math.radians(el)), math.sin(math.radians(el))))
        cam.location = c + d * r * 2.6
        cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
        cam.data.lens = 35
        sc.render.filepath = os.path.join(out, f"{name}-{i}.png")
        bpy.ops.render.render(write_still=True)
    print("RENDERED", name, flush=True)
