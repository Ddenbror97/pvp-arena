"""
Build a PvPStrike character (Terrorist or Police) in Blender and export the runtime GLB.

  python build_character.py -- <terrorist|police> <out.glb> [--blend out.blend] [--voxel 0.005]

Pipeline: SDF clothed body (body_sdf.py) → marching cubes → Blender mesh, decimated with
silhouette-preserving collapse → materials by region (jacket/shirt, trousers, boots, gloves,
skin) → hard-surface tactical gear (gear.py) → Mixamo-named skeleton (skeleton.py) with
distance-based skin weights (rigid for gear) → glTF export. Head-mounted kit (helmet,
headset, eyewear) is exported as unskinned nodes in head-centre space, because the game fits
the realistic head separately onto the head hitbox.
"""
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import body_sdf  # noqa: E402
import skeleton  # noqa: E402
import gear  # noqa: E402
import materials as mats  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:]
ROLE, OUT = argv[0], argv[1]
BLEND = argv[argv.index("--blend") + 1] if "--blend" in argv else None
VOXEL = float(argv[argv.index("--voxel") + 1]) if "--voxel" in argv else 0.005
TARGET_BODY_TRIS = int(argv[argv.index("--tris") + 1]) if "--tris" in argv else 16000

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
J = skeleton.joints()

# ------------------------------------------------------------------------------------ body
verts, faces = body_sdf.grid_mesh(ROLE, VOXEL)
me = bpy.data.meshes.new(f"{ROLE}-body")
me.from_pydata(verts.tolist(), [], faces[:, ::-1].tolist())
me.update()
body = bpy.data.objects.new(f"{ROLE}-body", me)
sc.collection.objects.link(body)
bpy.context.view_layer.objects.active = body
body.select_set(True)
dec = body.modifiers.new("decimate", "DECIMATE")
dec.ratio = min(1.0, TARGET_BODY_TRIS / max(1, len(faces)))
dec.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier="decimate")
bpy.ops.object.shade_smooth()
me = body.data

# Materials by region (per face, from the SDF part labels at face centres).
palette = mats.palette(ROLE)
order = ["top", "pants", "boots", "gloves", "skin"]
for name in order:
    me.materials.append(palette[name])
centres = np.array([p.center[:] for p in me.polygons])
lab = body_sdf.labels(centres, ROLE)
idx = [order.index(l) for l in lab]
me.polygons.foreach_set("material_index", idx)

# UVs: smart projection, one atlas per body; fabric detail uses texture-space repeats.
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(55), island_margin=0.004, scale_to_bounds=False)
bpy.ops.object.mode_set(mode="OBJECT")

# ------------------------------------------------------------------------------------ gear
gear_objects, head_kit = gear.build(ROLE, J, palette, sc.collection)

# ------------------------------------------------------------------------------------ skeleton
arm_data = bpy.data.armatures.new(f"{ROLE}-rig")
rig = bpy.data.objects.new(f"{ROLE}-rig", arm_data)
sc.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
eb = {}
for name, head, tail, parent in skeleton.BONES:
    b = arm_data.edit_bones.new(name)
    h = Vector(J[head])
    if tail:
        t = Vector(J[tail])
    else:
        prev = Vector(J[[x for x in skeleton.BONES if x[0] == parent][0][1]])
        t = h + (h - prev).normalized() * 0.05
    b.head, b.tail = h, t
    if parent:
        b.parent = eb[parent]
        b.use_connect = False
    eb[name] = b
bpy.ops.object.mode_set(mode="OBJECT")

# ------------------------------------------------------------------------------------ weights
SEGMENTS = [(n, np.array(J[h]), np.array(J[t] if t else J[h])) for n, h, t, _ in skeleton.BONES if t]


def seg_dist(p, a, b):
    ba = b - a
    t = np.clip(((p - a) @ ba) / max(ba @ ba, 1e-12), 0, 1)
    return np.linalg.norm(p - (a + t[:, None] * ba), axis=1)


def skin(obj, allowed=None, rigid=None, sharp=0.035):
    """Distance-based weights to the nearest bones (top 3), or a single rigid bone."""
    vg = {n: obj.vertex_groups.new(name=n) for n, *_ in SEGMENTS}
    P = np.array([obj.matrix_world @ v.co for v in obj.data.vertices])
    if rigid:
        vg[rigid].add(list(range(len(P))), 1.0, "REPLACE")
        return
    names = [n for n, *_ in SEGMENTS if (allowed is None or n in allowed)]
    D = np.stack([seg_dist(P, a, b) for n, a, b in SEGMENTS if n in names], 1)
    # Side gating: a vertex never takes weights from the opposite limb.
    for k, n in enumerate(names):
        if n.startswith("Left"):
            D[P[:, 0] < -0.02, k] = 9
        if n.startswith("Right"):
            D[P[:, 0] > 0.02, k] = 9
    W = np.exp(-(D - D.min(1, keepdims=True)) / sharp)
    top = np.argsort(-W, 1)[:, :3]
    for i in range(len(P)):
        w = W[i, top[i]]
        w = w / w.sum()
        for k, wk in zip(top[i], w):
            if wk > 0.02:
                vg[names[k]].add([i], float(wk), "REPLACE")


BODY_BONES = [n for n, *_ in SEGMENTS if not n.endswith(("Toe_End", "HandEnd"))]
skin(body, allowed=BODY_BONES)
for obj, bone in gear_objects:
    skin(obj, rigid=bone) if bone else skin(obj, allowed=BODY_BONES)
for obj in [body] + [o for o, _ in gear_objects]:
    obj.parent = rig
    m = obj.modifiers.new("rig", "ARMATURE")
    m.object = rig

# Head kit: unskinned, authored around the head centre (game fits it to the head hitbox).
head_root = bpy.data.objects.new("head-kit", None)
sc.collection.objects.link(head_root)
for o in head_kit:
    o.parent = head_root

stats = {"body_tris": sum(len(p.vertices) - 2 for p in body.data.polygons),
         "gear_tris": sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o, _ in gear_objects),
         "head_kit_tris": sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in head_kit),
         "bones": len(arm_data.bones)}
print("STATS", stats)

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_yup=True, export_apply=False,
                          export_skins=True, export_animations=False, export_image_format="WEBP",
                          export_materials="EXPORT", export_extras=True)
print("EXPORTED", OUT)
