"""Quick Cycles preview of the SDF glove (shape only). bpy python: preview_glove.py -- rig.json outdir voxel"""
import bpy, sys, os, math, time
import numpy as np, mathutils
sys.path.insert(0, os.path.dirname(__file__))
import glove_sdf as G
rig_path, out, voxel = sys.argv[sys.argv.index("--") + 1:][:3]
voxel = float(voxel)
rig = G.load_rig(rig_path)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
def to_blender(p):  # glTF (x, y, z) -> Blender (x, -z, y)
    p = np.asarray(p); return np.stack([p[..., 0], -p[..., 2], p[..., 1]], -1)
objs = {}
for side in ("L", "R"):
    h = G.HandFrame(rig, side)
    t = time.time()
    v, f, parts, info = G.surface(h, voxel)
    print(side, "verts", len(v), "faces", len(f), f"{time.time()-t:.1f}s")
    vw = to_blender(h.to_world(v))
    me = bpy.data.meshes.new(f"glove{side}")
    me.from_pydata(vw.tolist(), [], f[:, ::-1].tolist())
    me.update()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(f"glove{side}", me); sc.collection.objects.link(o); objs[side] = (o, h)
mat = bpy.data.materials.new("g"); mat.use_nodes = True
b = mat.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (0.05, 0.05, 0.055, 1); b.inputs["Roughness"].default_value = 0.6
for o, _ in objs.values(): o.data.materials.append(mat)
sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.cycles.device = "CPU"
sc.render.resolution_x = sc.render.resolution_y = 600
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.57, 0.6, 1)
for rot, e in (((0.6, 0.2, 0.5), 3.0), ((-0.9, 0.4, 2.6), 1.5)):
    s = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); s.data.energy = e; s.rotation_euler = rot; sc.collection.objects.link(s)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"
for side, (o, h) in objs.items():
    c = mathutils.Vector(to_blender(h.to_world(h.along * 0.03)).tolist())
    vec = lambda v: mathutils.Vector(to_blender(v).tolist())
    views = {"dorsal": -h.palmar, "palmar": h.palmar, "thumb": h.across, "little": -h.across, "front": h.along + 0.4 * -h.palmar}
    for name, d in views.items():
        cam.data.ortho_scale = 0.55
        cam.location = c + vec(d).normalized() * 1.5
        up = vec(h.along) if name != "front" else vec(-h.palmar)
        cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
        # roll so the hand's fingers point up in frame
        m = cam.matrix_world.to_3x3(); fwd = (c - cam.location).normalized()
        right = fwd.cross(up).normalized(); upv = right.cross(fwd)
        cam.matrix_world = mathutils.Matrix((right, upv, -fwd)).transposed().to_4x4() @ mathutils.Matrix.Identity(4)
        cam.location = c - fwd * 1.5
        for oo, _ in objs.values(): oo.hide_render = oo is not o
        sc.render.filepath = f"{out}/{side}_{name}.png"; bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=f"{out}/preview.blend")
