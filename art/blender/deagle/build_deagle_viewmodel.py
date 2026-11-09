"""
Desert Eagle viewmodel pistol (Blender, headless): "Desert Eagle" by ELIZION (Sketchfab,
CC BY 4.0) with its slide group, hammer, trigger and magazine as moving parts, marker empties and
viewmodel units, exported for merge_gun_viewmodel.mjs to place on the shared first-person rigs.

    python build_deagle_viewmodel.py -- <desert_eagle/scene.gltf> <out.glb> <out.blend>

Source (after import): Blender Z up, muzzle −Y, the slide stop on +X (the pistol's left), in
centimetres: 27.7 cm long (a Mark XIX with the 6" barrel is 27.3 cm). The pistol is turned to
the rig's convention (muzzle +Y, right +X in Blender) and scaled to 2.0 units per metre.

Parts: Slide (the slide with its bolt, extractor, safety and rear sight: everything the source
groups under `Group001`; it rides back over the fixed barrel), Hammer (cocked by the slide),
Trigger, Magazine (body, floor plate and follower); the frame, fixed barrel, front sight, slide
stop and buttons stay static. The loose display cartridge is dropped.
"""

import math
import os
import sys

import bpy  # noqa: I001
import mathutils

argv = sys.argv[sys.argv.index("--") + 1 :]
SRC, OUT_GLB, OUT_BLEND = argv[:3]

S = 2.0 / 100  # source centimetres → rig units (2.0 per metre)
TURN = mathutils.Matrix.Rotation(math.pi, 4, "Z")  # muzzle −Y → +Y, left +X → −X

# Landmarks in the turned source (cm; muzzle +Y, right +X, up +Z). See README.md.
BORE_Z = 24.14  # the .50 bore at the muzzle (12 mm hole, z 23.54–24.74)
MUZZLE_Y = 10.84
GRIP_TOP_Z = 17.5  # grip front strap meets the trigger guard
GRIP_PALM = (13.5, -11.0)  # (z, y centre) of the grip 4 cm below its top
SLIDE_TRAVEL_CM = 5.5
# Rig (glTF, rig units): the AK grip the right hand is posed on (as the MP5 build).
RIG_GRIP_TOP_Y = -0.10
RIG_PALM = (-0.18, -0.1955)
RIG_GRIPR = (-0.0007, -0.095, -0.172)

PARTS = {
    "Slide": [
        "Slide_low", "Safety_low", "BoltMain_low", "BoltAdd_low", "RearSight_low",
        "SlidePart_low", "BoltButton_low", "BoltBack_low",
    ],
    "Magazine": ["Magazine_low", "MagazineBase_low", "BaseInside_low"],
    "Hammer": ["Hammer_low"],
    "Trigger": ["Trigger_low"],
    "Drop": ["Bullet_low", "BulletCase_low"],
}

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)
bpy.ops.import_scene.gltf(filepath=SRC)

meshes = {}
for o in list(bpy.data.objects):
    if o.type != "MESH":
        continue
    node = o.parent.name if o.parent else o.name
    o.data = o.data.copy()
    o.data.transform(TURN @ o.matrix_world)
    meshes.setdefault(node, []).append(o)
for o in list(bpy.data.objects):
    if o.type != "MESH":
        bpy.data.objects.remove(o)
for objs in meshes.values():
    for o in objs:
        o.parent = None
        o.matrix_world = mathutils.Matrix.Identity(4)


def part_of(node):
    for part, names in PARTS.items():
        if node in names:
            return part
    return "Frame"


groups = {}
for node, objs in meshes.items():
    groups.setdefault(part_of(node), []).extend(objs)
for o in groups.pop("Drop", []):
    bpy.data.objects.remove(o)
print("REPORT parts", {k: [o.name for o in v] for k, v in groups.items()})


def join(name, objs):
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


objs = {name: join(f"{name}Geometry", group) for name, group in groups.items()}


def vbox(obj):
    pts = [v.co for v in obj.data.vertices]
    return (
        mathutils.Vector([min(v[i] for v in pts) for i in range(3)]),
        mathutils.Vector([max(v[i] for v in pts) for i in range(3)]),
    )


for o in objs.values():
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35), keep_sharp_edges=True)
    o.data.validate()

# ---------------------------------------------------------------- hierarchy + markers (cm)
root = bpy.data.objects.new("DEAGLE", None)
bpy.context.scene.collection.objects.link(root)


def empty(name, loc, parent=root):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.empty_display_size = 1.0
    e.parent = parent
    e.location = loc
    return e


def attach(obj, parent, pivot):
    obj.data.transform(mathutils.Matrix.Translation(-pivot))
    obj.parent = parent
    obj.location = (0, 0, 0)


objs["Frame"].parent = root

# Slide: origin on the bore at the slide's rear face; travels back (−Y source, +Z GLB).
slo, shi = vbox(objs["Slide"])
slide_pivot = mathutils.Vector((0, slo.y, BORE_Z))
slide = empty("ChargingHandle", slide_pivot)
attach(objs["Slide"], slide, slide_pivot)
# Overhand rack: the serrations at the slide's rear, on its right side, half-way up.
empty("ChargingKnob", (shi.x - 0.1, 3.0, (slo.z + shi.z) / 2 + 0.6 - BORE_Z), parent=slide)

# Hammer: pivot at its pin (low front of the part); the slide cocks it back.
hlo, hhi = vbox(objs["Hammer"])
hammer_pivot = mathutils.Vector((0, hhi.y - 0.6, hlo.z + 0.6))
hammer = empty("Hammer", hammer_pivot)
attach(objs["Hammer"], hammer, hammer_pivot)

tlo, thi = vbox(objs["Trigger"])
trig_pivot = mathutils.Vector((0, (tlo.y + thi.y) / 2, thi.z))
trigger = empty("Trigger", trig_pivot)
attach(objs["Trigger"], trigger, trig_pivot)

# Magazine: pivot at its top centre (inside the grip); drops along the grip axis.
mlo, mhi = vbox(objs["Magazine"])
mag_pivot = mathutils.Vector(((mlo.x + mhi.x) / 2, (mlo.y + mhi.y) / 2, mhi.z))
magazine = empty("Magazine", mag_pivot)
attach(objs["Magazine"], magazine, mag_pivot)
# Support hand on the fresh magazine: fingers round its lower third, palm on the front.
empty("MagazineGrip", (0, mhi.y - mag_pivot.y - 0.8, mlo.z + 3.2 - mag_pivot.z), parent=magazine)

empty("MuzzleDeviceTip", (0, MUZZLE_Y, BORE_Z))
empty("EjectionPort", (1.3, -5.7, BORE_Z + 0.2))
empty("MagRelease", (-1.35, -6.8, 18.1))  # the button behind the trigger guard (left side)
empty("SlideRelease", (-1.8, -7.6, 21.0))  # the slide stop lever above it
empty("RearSightAperture", (0, -11.1, 25.75))
empty("FrontSightPost", (0, 9.7, 26.0))
# The Mark XIX's Picatinny rail on top of the fixed barrel (flat at z 25.36 from y −1 to 8 cm,
# ahead of the slide): the red dot's mount (battle royale; the only optic the Deagle takes).
empty("OpticRail", (0, 3.2, 25.36))

# ---------------------------------------------------------------- viewmodel units + placement
shift_z = RIG_GRIP_TOP_Y - GRIP_TOP_Z * S
shift_y = -RIG_PALM[1] - GRIP_PALM[1] * S
print("REPORT palm section lands at rig Y", round(GRIP_PALM[0] * S + shift_z, 4), "(AK", RIG_PALM[0], ")")
bpy.context.view_layer.update()
for o in bpy.data.objects:
    if o is root or o.parent is None:
        continue
    o.location = o.location * S
    if o.type == "MESH":
        o.data.transform(mathutils.Matrix.Scale(S, 4))
    else:
        o.empty_display_size = 0.02
root.location = (0, shift_y, shift_z)
bpy.context.view_layer.update()
grip_r = empty("GripR", (0, 0, 0), parent=None)
grip_r.location = (RIG_GRIPR[0], -RIG_GRIPR[2], RIG_GRIPR[1])
grip_r.rotation_euler = (math.radians(-16.0), 0, 0)
grip_r.parent = root
grip_r.matrix_parent_inverse = root.matrix_world.inverted()
# GripL: the support hand cups the shooting hand at the front of the grip, palm-height, left.
empty("GripL", (-2.4 * S, (GRIP_PALM[1] + 4.2) * S, GRIP_PALM[0] * S))

bpy.context.view_layer.update()


def rig(name):
    w = bpy.data.objects[name].matrix_world.translation
    return (round(w.x, 4), round(w.z, 4), round(-w.y, 4))


tri_total = 0
for o in bpy.data.objects:
    if o.type == "MESH":
        t = sum(len(p.vertices) - 2 for p in o.data.polygons)
        tri_total += t
        print("REPORT", o.name, "tris", t)
print("REPORT total tris", tri_total)
for name in (
    "GripR", "GripL", "ChargingHandle", "ChargingKnob", "Hammer", "Trigger", "Magazine",
    "MagazineGrip", "MuzzleDeviceTip", "EjectionPort", "MagRelease", "SlideRelease",
    "RearSightAperture", "FrontSightPost", "OpticRail",
):
    print("REPORT marker", name, "rig", rig(name))
print("REPORT slide travel rig", round(SLIDE_TRAVEL_CM * S, 4), "magazine height rig", round((mhi.z - mlo.z) * S, 4))

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
