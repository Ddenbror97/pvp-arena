"""
SPAS-12 viewmodel gun (Blender, headless): "Franchi SPAS-12" by FamousUnityHubSoldier (Sketchfab,
Sketchfab Standard licence; the owner approved its use, 2026-11-13) split into the parts that
animate, with a 12-gauge shell to load, an optic rail, marker empties and viewmodel units,
exported for merge_gun_viewmodel.mjs to place on the shared first-person arm rigs.

    python build_spas12_viewmodel.py -- <franchi_spas-12/scene.gltf> <out.glb> <out.blend>

Source: a skinned kit in decimetres (a 12-gauge shell is 0.58 long, 0.206 across), its variants
side by side and its moving parts parked far away in the rest pose; the glTF's own pose puts
the gun together. Posed, the muzzle points −X with Z up; here it is turned to the other guns'
build frame (Z up, muzzle +Y, the bolt handle and ejection port on the right, +X).

What it does:
  1. Imports and takes every mesh as posed. Faces go to a part by the bone that carries them:
     the bolt (j_bolt), the shell carrier that covers the loading port (j_carrier), the trigger,
     the pump fore-end; the chambered shell becomes the shell the hand loads; the rest is the
     static gun. Dropped: the long barrel, the fixed stock, the second shell, and the magazine
     spring and follower (inside the tube, never seen).
  2. Decimates the dense parts (the kit is 73.7k triangles; a viewmodel gun here is 13-30k).
  3. Gives the base-colour-only materials metal or polymer factors.
  4. Adds a Picatinny rail over the receiver (hidden in game until an optic is fitted).
  5. Places the gun so its pistol grip lands in the rig's right hand, and adds the marker
     empties the runtime reads (art/blender/spas12/README.md), 2.0 units per metre.
"""

import math
import os
import sys

import bpy  # noqa: I001
import bmesh
import mathutils

argv = sys.argv[sys.argv.index("--") + 1 :]
SRC, OUT_GLB, OUT_BLEND = argv[:3]

SRC_PER_METRE = 10.0  # decimetres
GLB_PER_METRE = 2.0  # the shared viewmodel rig (AK: 1.76 units for 880 mm)
S = GLB_PER_METRE / SRC_PER_METRE

# Landmarks, build frame, source units (measured from the posed kit, 2026-11-13).
BORE_Z = 1.818  # barrel axis
TUBE_Z = 1.4735  # magazine tube axis, under the barrel
TUBE_REAR_Y = 0.036  # the tube's mouth, at the front of the loading port
MUZZLE_Y = 5.799
GRIP_TOP_Z = 1.0  # the pistol grip meets the trigger housing
GRIP_PALM = (0.6, -2.095)  # (z, y centre) of the grip 4 cm below its top
RECV_TOP_Z = 2.021
SHELL_LEN = 0.58
# Rig (glTF, rig units): the AK grip the right hand is posed on (as build_mp5_viewmodel.py).
RIG_GRIP_TOP_Y = -0.10
RIG_PALM = (-0.18, -0.1955)
RIG_GRIPR = (-0.0007, -0.095, -0.172)

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)

bpy.ops.import_scene.gltf(filepath=SRC)
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
TURN = mathutils.Matrix(((0, 1, 0, 0), (-1, 0, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1)))

# (source object, bone that carries the faces) → part; None drops them.
DROP = {"Object_61", "Object_62", "Object_63", "Object_75", "Object_71", "Icosphere"}
BONE_PART = {
    "j_bolt_011": "Bolt",
    "j_carrier_06": "Carrier",
    "j_trigger_02": "Trigger",
    "j_pump_012": "Pump",
    "j_firesel_013": "Pump",
    "shell_015": "Shell",
    "j_spring_014": None,
    "j_mag_follower_017": None,
}
# Collapse ratio per source material where the kit is denser than a viewmodel needs.
DECIMATE = {
    "Reclaimer18_stock": 0.3,
    "Reclaimer18_partB": 0.42,
    "Reclaimer18_partC": 0.42,
    "Reclaimer18_handle": 0.5,
    "Reclaimer18_partA": 0.7,
}
# (metallic, roughness): the kit ships base colour only.
SURFACE = {
    "Reclaimer18_partA": (0.75, 0.42),
    "Reclaimer18_partB": (0.7, 0.45),
    "Reclaimer18_partC": (0.1, 0.62),  # the polymer fore-end
    "Reclaimer18_barrel": (0.8, 0.4),
    "Reclaimer18_barrel_thing": (0.8, 0.4),
    "Reclaimer18_barrel_sight": (0.7, 0.45),
    "Reclaimer18_handle": (0.05, 0.6),  # polymer pistol grip
    "Reclaimer18_stock": (0.7, 0.45),
    "shell_12def": (0.35, 0.42),
}

parts = {}  # part → [mesh]
for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    if o.name in DROP:
        continue
    e = o.evaluated_get(dg)
    posed = bpy.data.meshes.new_from_object(e)
    posed.transform(TURN @ e.matrix_world)
    groups = [g.name for g in o.vertex_groups]
    bone_of = []
    for v in o.data.vertices:
        g = max(v.groups, key=lambda g: g.weight, default=None)
        bone_of.append(groups[g.group] if g else "")
    material = o.data.materials[0]
    bm = bmesh.new()
    bm.from_mesh(posed)
    bm.faces.ensure_lookup_table()
    tag = {}
    for f in bm.faces:
        votes = {}
        for v in f.verts:
            b = bone_of[v.index]
            votes[b] = votes.get(b, 0) + 1
        bone = max(votes, key=votes.get)
        tag[f.index] = BONE_PART.get(bone, "Gun") if bone in BONE_PART else "Gun"
    for part in {p for p in tag.values() if p}:
        sub = bm.copy()
        sub.faces.ensure_lookup_table()
        bmesh.ops.delete(sub, geom=[f for f in sub.faces if tag[f.index] != part], context="FACES")
        mesh = bpy.data.meshes.new(f"{part}_{material.name}")
        sub.to_mesh(mesh)
        sub.free()
        mesh.materials.append(material)
        parts.setdefault(part, []).append(mesh)
    bm.free()
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
print("REPORT parts", {k: len(v) for k, v in parts.items()})

for name, (metallic, roughness) in SURFACE.items():
    m = bpy.data.materials.get(name)
    if not m:
        continue
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness


def tris(mesh):
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


def decimated(mesh, ratio):
    o = bpy.data.objects.new("tmp", mesh)
    bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    mod = o.modifiers.new("d", "DECIMATE")
    mod.ratio = ratio
    mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    out = o.data
    bpy.data.objects.remove(o)
    return out


def join(name, meshes):
    objs = []
    for m in meshes:
        ratio = DECIMATE.get(m.materials[0].name)
        # (The small moving parts keep every triangle: they are looked at up close.)
        if ratio and name in ("GunGeometry", "PumpGeometry") and tris(m) > 1500:
            before = tris(m)
            m = decimated(m, ratio)
            print("REPORT decimate", name, m.materials[0].name, before, "->", tris(m))
        o = bpy.data.objects.new(name, m)
        bpy.context.scene.collection.objects.link(o)
        objs.append(o)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    o.data.name = name
    return o


objs = {name: join(f"{name}Geometry", meshes) for name, meshes in parts.items()}


def vbox(obj):
    pts = [v.co for v in obj.data.vertices]
    return (
        mathutils.Vector([min(v[i] for v in pts) for i in range(3)]),
        mathutils.Vector([max(v[i] for v in pts) for i in range(3)]),
    )


# ---------------------------------------------------------------- optic rail (new geometry)
def box_mesh(name, boxes, material):
    """Union of axis-aligned boxes [(lo, hi)] as one mesh (separate closed boxes)."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    for lo, hi in boxes:
        res = bmesh.ops.create_cube(bm, size=1.0)
        for v in res["verts"]:
            v.co = mathutils.Vector([lo[i] + (hi[i] - lo[i]) * (v.co[i] + 0.5) for i in range(3)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        n = f.normal
        for loop in f.loops:
            c = loop.vert.co
            if abs(n.z) > 0.7:
                loop[uv].uv = (c.x, c.y)
            elif abs(n.x) > 0.7:
                loop[uv].uv = (c.y, c.z)
            else:
                loop[uv].uv = (c.x, c.z)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material)
    o = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(o)
    return o


mount_mat = bpy.data.materials.new("SPASMount")
mount_mat.use_nodes = True
bsdf = mount_mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.03, 0.031, 0.033, 1)
bsdf.inputs["Metallic"].default_value = 0.7
bsdf.inputs["Roughness"].default_value = 0.42
# A rail screwed to the receiver top, from behind the rear sight back over the bolt: a 21 mm
# Picatinny top with recoil slots every 10 mm, on a low base.
mm = SRC_PER_METRE / 1000
RAIL_Y = (-1.55, -0.15)
base_top = RECV_TOP_Z + 4 * mm
rail_top = base_top + 6 * mm
boxes = [
    ((-8 * mm, RAIL_Y[0], RECV_TOP_Z - 2 * mm), (8 * mm, RAIL_Y[1], base_top)),
    ((-10.5 * mm, RAIL_Y[0], base_top), (10.5 * mm, RAIL_Y[1], rail_top - 3 * mm)),
]
y = RAIL_Y[0] + 2 * mm
while y + 5.2 * mm < RAIL_Y[1]:
    boxes.append(((-10.5 * mm, y, rail_top - 3 * mm), (10.5 * mm, y + 5.2 * mm, rail_top)))
    y += 10 * mm
objs["OpticMount"] = box_mesh("OpticMountGeometry", boxes, mount_mat)
print("REPORT rail top src", round(rail_top, 4), "y", RAIL_Y)

# ---------------------------------------------------------------- shading
for o in objs.values():
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40), keep_sharp_edges=True)
    o.data.validate()

# ---------------------------------------------------------------- hierarchy + markers
root = bpy.data.objects.new("SPAS12", None)
bpy.context.scene.collection.objects.link(root)


def empty(name, loc, parent=root, rot=None):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.empty_display_size = 0.2
    e.parent = parent
    e.location = loc
    if rot:
        e.rotation_euler = rot
    return e


def attach(obj, parent, pivot):
    obj.data.transform(mathutils.Matrix.Translation(-pivot))
    obj.parent = parent
    obj.location = (0, 0, 0)


for name in ("Gun", "OpticMount"):
    objs[name].parent = root

# The pump fore-end: its own node (it does not cycle in semi-automatic fire; the support hand
# holds it). Origin on the tube axis at its middle.
plo, phi = vbox(objs["Pump"])
pump_pivot = mathutils.Vector((0, (plo.y + phi.y) / 2, TUBE_Z))
pump = empty("Pump", pump_pivot)
attach(objs["Pump"], pump, pump_pivot)

# The shell the hand loads ("Magazine" to the runtime's reload clips): at rest it sits pushed
# home inside the magazine tube, just past the tube's mouth (out of sight). Its origin is its
# middle, its axis the tube's, brass to the rear.
slo, shi = vbox(objs["Shell"])
shell_mid = (slo + shi) / 2
objs["Shell"].data.transform(mathutils.Matrix.Translation(-shell_mid))
seated = mathutils.Vector((0, TUBE_REAR_Y + 0.06 + SHELL_LEN / 2, TUBE_Z))
shell = empty("Magazine", seated)
objs["Shell"].parent = shell
objs["Shell"].location = (0, 0, 0)
# The support hand's hold on it: the fingers round the hull from below-left, the thumb on the
# brass (the palm side is −X, toward the hand coming up from the left).
empty("MagazineGrip", (-0.02, -0.1, -0.06), parent=shell)

# The bolt ("ChargingHandle"): it runs back on every shot (gas operation) and is drawn back by
# its handle on the right. Origin on the bore axis at the bolt's middle.
blo, bhi = vbox(objs["Bolt"])
bolt_pivot = mathutils.Vector((0, (blo.y + bhi.y) / 2, BORE_Z))
bolt = empty("ChargingHandle", bolt_pivot)
attach(objs["Bolt"], bolt, bolt_pivot)
# The handle's knob: the part of the bolt beyond the receiver's right wall.
knob = [v.co + bolt_pivot for v in objs["Bolt"].data.vertices if v.co.x + bolt_pivot.x > 0.3]
knob_at = sum(knob, mathutils.Vector()) / len(knob)
empty("ChargingKnob", knob_at - bolt_pivot, parent=bolt)

# The shell carrier (the flap that closes the loading port): hinged at its rear end, it is
# pushed up into the receiver by the shell going in.
clo, chi = vbox(objs["Carrier"])
carrier_pivot = mathutils.Vector((0, -0.977, 1.42))
carrier = empty("Carrier", carrier_pivot)
attach(objs["Carrier"], carrier, carrier_pivot)

tlo, thi = vbox(objs["Trigger"])
trig_pivot = mathutils.Vector((0, (tlo.y + thi.y) / 2, thi.z))
trigger = empty("Trigger", trig_pivot)
attach(objs["Trigger"], trigger, trig_pivot)

empty("MuzzleDeviceTip", (0, MUZZLE_Y, BORE_Z))
empty("EjectionPort", (0.19, 0.0, BORE_Z - 0.05))
# The loading port, under the receiver between the trigger guard and the tube's mouth: where the
# shell's nose goes in, and the carrier-latch button on the right of the receiver.
empty("LoadingPort", (0, -0.35, clo.z - 0.02))
empty("MagRelease", (0.2, -0.7, 1.27))
# Sights: the rear aperture on the barrel shroud, the blade over the muzzle.
gun_pts = [v.co for v in objs["Gun"].data.vertices]
rear = [p for p in gun_pts if 0.77 <= p.y <= 1.12 and p.z > 2.05 and abs(p.x) < 0.08]
front = [p for p in gun_pts if 4.52 <= p.y <= 5.08 and p.z > 1.94 and abs(p.x) < 0.06]
rear_top = max(p.z for p in rear)
front_top = max(p.z for p in front)
empty("RearSightAperture", (0, sum(p.y for p in rear) / len(rear), rear_top - 0.05))
empty("FrontSightPost", (0, sum(p.y for p in front) / len(front), front_top - 0.012))
print("REPORT sights rear top", round(rear_top, 3), "front top", round(front_top, 3))

# ---------------------------------------------------------------- viewmodel units + rig placement
# Height: the grip top under the web of the hand (rig Y −0.10). Fore-aft: the grip's palm-height
# centre on the AK's. Rig (glTF) ↔ Blender: glTF (x, y, z) = Blender (x, z, −y).
shift_z = RIG_GRIP_TOP_Y - GRIP_TOP_Z * S
palm_rig_y = GRIP_PALM[0] * S + shift_z
shift_y = -RIG_PALM[1] - GRIP_PALM[1] * S
print("REPORT palm section lands at rig Y", round(palm_rig_y, 4), "(AK palm", RIG_PALM[0], ")")
bpy.context.view_layer.update()
for o in bpy.data.objects:
    if o is root or o.parent is None:
        continue
    o.location = o.location * S
    if o.type == "MESH":
        o.data.transform(mathutils.Matrix.Scale(S, 4))
root.location = (0, shift_y, shift_z)
bpy.context.view_layer.update()
grip_r = empty("GripR", (0, 0, 0), parent=None)
grip_r.location = (RIG_GRIPR[0], -RIG_GRIPR[2], RIG_GRIPR[1])
grip_r.rotation_euler = (math.radians(-16.0), 0, 0)
grip_r.parent = root
grip_r.matrix_parent_inverse = root.matrix_world.inverted()
# GripL: the support hand under the pump fore-end, toward its rear (a comfortable reach).
GRIP_L = (plo.y + 0.55, TUBE_Z - 0.06)  # (y, z) source
empty("GripL", (0, GRIP_L[0] * S, GRIP_L[1] * S))

bpy.context.view_layer.update()


def rig(name):
    w = bpy.data.objects[name].matrix_world.translation
    return (round(w.x, 4), round(w.z, 4), round(-w.y, 4))


tri_total = 0
for o in bpy.data.objects:
    if o.type == "MESH":
        t = tris(o.data)
        tri_total += t
        print("REPORT", o.name, "tris", t)
print("REPORT total tris", tri_total)
for name in (
    "GripR", "GripL", "Magazine", "MagazineGrip", "ChargingHandle", "ChargingKnob", "Carrier",
    "Pump", "Trigger", "MuzzleDeviceTip", "EjectionPort", "LoadingPort", "MagRelease",
    "RearSightAperture", "FrontSightPost",
):
    print("REPORT marker", name, "rig", rig(name))
print("REPORT shell length rig", round(SHELL_LEN * S, 4), "gun length rig", round((MUZZLE_Y + 5.8) * S, 3))

bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(OUT_BLEND), compress=True)
bpy.ops.export_scene.gltf(
    filepath=os.path.abspath(OUT_GLB),
    export_format="GLB",
    export_yup=True,
    export_apply=False,
    export_image_format="AUTO",
    export_texcoords=True,
    export_normals=True,
    export_tangents=False,
    export_materials="EXPORT",
)
