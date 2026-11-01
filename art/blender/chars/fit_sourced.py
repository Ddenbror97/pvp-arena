"""
Fit a downloaded, already-rigged character (Sketchfab glTF) to the game's character runtime.

  python fit_sourced.py -- <scene.gltf> <police|terrorist> <out.glb> [--blend out.blend]

Steps: import, drop the preview animation and helper objects, bake the Sketchfab node
transforms into metres (z-up, facing -Y like Mixamo), rename the skeleton to the plain Mixamo
names authored-character.ts drives (Hips, Spine*, Neck, Head, HeadTop_End, Left/Right
Shoulder/Arm/ForeArm/Hand/UpLeg/Leg/Foot/ToeBase), place HeadTop_End at the crown so the
Head..HeadTop_End midpoint is the head centre the game puts on the 1.6 m head hitbox,
convert spec/gloss materials to metal/rough PBR, cap textures at 2K and export a WebP GLB.
"""
import bpy, os, re, sys
import numpy as np
from mathutils import Vector, Matrix
from PIL import Image

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, ROLE, OUT = argv[0], argv[1], argv[2]
BLEND = argv[argv.index("--blend") + 1] if "--blend" in argv else None
TMP = os.path.join(os.path.dirname(os.path.abspath(OUT)), f"{ROLE}-tex")
os.makedirs(TMP, exist_ok=True)

# Valve-style names used by the insurgent rig → Mixamo.
VALVE = {
    "root hips": "Hips", "spine lower": "Spine", "spine upper": "Spine1", "spine upper 1": "Spine2",
    "head neck lower": "Neck", "head neck upper": "Head",
    "arm left shoulder 1": "LeftShoulder", "arm left shoulder 2": "LeftArm", "arm left elbow": "LeftForeArm",
    "arm left wrist": "LeftHand", "arm right shoulder 1": "RightShoulder", "arm right shoulder 2": "RightArm",
    "arm right elbow": "RightForeArm", "arm right wrist": "RightHand",
    "leg left thigh": "LeftUpLeg", "leg left knee": "LeftLeg", "leg left ankle": "LeftFoot", "leg left toes": "LeftToeBase",
    "leg right thigh": "RightUpLeg", "leg right knee": "RightLeg", "leg right ankle": "RightFoot", "leg right toes": "RightToeBase",
}


def clean(name):
    n = re.sub(r"_\d+$", "", name)
    n = re.sub(r"^[A-Za-z0-9]+:", "", n)  # swat:Hips → Hips
    return VALVE.get(n, n)


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)
for o in list(bpy.data.objects):
    if o.type == "MESH" and not o.data.materials:
        bpy.data.objects.remove(o)  # Sketchfab's preview icosphere
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
rig.animation_data_clear()

# Bake the node hierarchy (FBX→glTF rotations and cm scale) into the rig and meshes.
for o in [rig] + meshes:
    mw = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = mw
for o in meshes:
    mw = o.matrix_world.copy()
    o.parent = rig
    o.matrix_world = mw
bpy.ops.object.select_all(action="DESELECT")
for o in [rig] + meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
for o in list(bpy.data.objects):
    if o.type == "EMPTY":
        bpy.data.objects.remove(o)

# Normalise to a 1.8 m figure standing on z = 0.
P = np.concatenate([np.array([o.matrix_world @ v.co for v in o.data.vertices]) for o in meshes])
lo, hi = P.min(0), P.max(0)
s = 1.8 / (hi[2] - lo[2])
rig.scale = (s, s, s)
rig.location = (-(lo[0] + hi[0]) / 2 * s, 0, -lo[2] * s)
bpy.ops.object.select_all(action="DESELECT")
for o in [rig] + meshes:
    o.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
P = np.concatenate([np.array([o.matrix_world @ v.co for v in o.data.vertices]) for o in meshes])
front = P[:, 1].mean() - P[P[:, 2] < 0.1][:, 1].mean()  # toes point to the front

# Mixamo names, and the crown end bone.
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
eb = rig.data.edit_bones
for b in list(eb):
    b.name = clean(b.name)
head = eb["Head"]
near = P[np.abs(P[:, 0]) < 0.06]
crown = float(near[:, 2].max())
top = eb.get("HeadTop_End") or eb.new("HeadTop_End")
top.parent = head
top.head = Vector((head.head.x, head.head.y, crown - 0.012))
top.tail = top.head + Vector((0, 0, 0.05))
head.tail = top.head
bpy.ops.object.mode_set(mode="OBJECT")
for o in meshes:
    for g in o.vertex_groups:
        g.name = clean(g.name)
need = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "HeadTop_End"] + [
    f"{s}{p}" for s in ("Left", "Right") for p in ("Arm", "ForeArm", "Hand", "UpLeg", "Leg", "Foot")]
missing = [n for n in need if n not in rig.data.bones]
assert not missing, missing


# Materials: spec/gloss → metal/rough; cap at 2K.
def img_path(img):
    path = bpy.path.abspath(img.filepath) if img.filepath else None
    if path and os.path.exists(path):
        return path
    p = os.path.join(TMP, img.name + ".png")
    img.filepath_raw = p
    img.file_format = "PNG"
    img.save()
    return p


def load(path, data, cap):
    im = Image.open(path)
    if max(im.size) > cap:
        im = im.resize((cap, cap), Image.LANCZOS)
        path = os.path.join(TMP, os.path.basename(path))
        im.save(path)
    i = bpy.data.images.load(path, check_existing=True)
    if data:
        i.colorspace_settings.name = "Non-Color"
    return i


def textures_of(mat):
    out = {}
    for n in mat.node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image:
            k = n.image.name.lower()
            kind = "normal" if "normal" in k else "specgloss" if "specular" in k or "gloss" in k else "color"
            out.setdefault(kind, img_path(n.image))
    return out


for o in meshes:
    for slot in o.material_slots:
        m = slot.material
        tex = textures_of(m)
        cap = 1024 if "head" in m.name.lower() else 2048
        new = bpy.data.materials.new(f"{ROLE}-{m.name}")
        new.use_nodes = True
        nt = new.node_tree
        bsdf = nt.nodes["Principled BSDF"]
        bsdf.inputs["Metallic"].default_value = 0.0
        bsdf.inputs["Roughness"].default_value = 0.85
        if "color" in tex:
            t = nt.nodes.new("ShaderNodeTexImage")
            t.image = load(tex["color"], False, cap)
            nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
        if "normal" in tex:
            t = nt.nodes.new("ShaderNodeTexImage")
            t.image = load(tex["normal"], True, cap)
            nm = nt.nodes.new("ShaderNodeNormalMap")
            nt.links.new(t.outputs["Color"], nm.inputs["Color"])
            nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
        if "specgloss" in tex:
            sg = np.asarray(Image.open(tex["specgloss"]).convert("RGBA")).astype(float) / 255
            rough = 1.0 - sg[..., 3]  # glossiness lives in alpha
            spec = sg[..., :3].mean(2)
            # glTF metallicRoughness: G = roughness, B = metalness (bright spec → metal parts).
            mr = np.dstack([np.zeros_like(rough), rough, np.clip((spec - 0.35) / 0.4, 0, 1)])
            p = os.path.join(TMP, f"{m.name}_mr.png")
            Image.fromarray((mr * 255).astype(np.uint8)).save(p)
            t = nt.nodes.new("ShaderNodeTexImage")
            t.image = load(p, True, cap)
            sep = nt.nodes.new("ShaderNodeSeparateColor")
            nt.links.new(t.outputs["Color"], sep.inputs["Color"])
            nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
            nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
        slot.material = new

for o in meshes:
    o.name = f"{ROLE}-{o.name}"
rig.name = f"{ROLE}-rig"
J = {b.name: tuple(round(x, 3) for x in (rig.matrix_world @ b.head_local)) for b in rig.data.bones if b.name in need}
print("FIT", ROLE, "bones", len(rig.data.bones), "tris",
      sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons), "front", round(front, 3))
print("JOINTS", J)
if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_yup=True, export_skins=True,
                          export_animations=False, export_image_format="WEBP", export_materials="EXPORT")
print("EXPORTED", OUT)
