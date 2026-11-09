"""
MP5 viewmodel gun (Blender, headless): "HK MP5 SMG" by dani-zzz (Sketchfab, CC BY 4.0) split into
the parts that animate, a claw mount for optics, marker empties and viewmodel units, exported
for merge_gun_viewmodel.mjs to place on the shared first-person arm rigs.

    python build_mp5_viewmodel.py -- <hk_mp5_smg/scene.gltf> <out.glb> <out.blend>

Source (after import): Blender Z up, muzzle +Y, the cocking lever on the left (−X); the model is
an MP5A2 (fixed stock) at 1.332× real size (its Sketchfab root scale): 0.90 units long for the
real 680 mm. Five PBR parts (Grip, Body, Mag & Barrel, Buttstock, Attachments), 2K maps.

What it does:
  1. Imports, bakes the transforms and classifies every connected component by position:
     magazine (body + floor plate), cocking lever (knob + arm), trigger, rear sight drum,
     front sight hood; everything else is the static gun.
  2. Adds a STANAG claw mount with a short Picatinny rail over the receiver (hidden in game until
     an optic is fitted, as on a real MP5 where the mount comes with the sight).
  3. Places the gun so its pistol grip lands in the rig's right hand (the AK grip the hand is
     posed on): grip top under the web of the hand, palm-height centre on the AK's.
  4. Marker empties the runtime reads (see art/blender/mp5/README.md), 2.0 units per metre.
"""

import math
import os
import sys

import bpy  # noqa: I001
import bmesh
import mathutils

argv = sys.argv[sys.argv.index("--") + 1 :]
SRC, OUT_GLB, OUT_BLEND = argv[:3]

SRC_PER_METRE = 1.332  # the Sketchfab root scale baked into the import
GLB_PER_METRE = 2.0  # the shared viewmodel rig (AK: 1.76 units for 880 mm)
S = GLB_PER_METRE / SRC_PER_METRE

# Landmarks, source units (measured: art/blender/mp5/README.md).
BORE_Z = 0.0665  # barrel / muzzle axis
TUBE_Z = 0.103  # cocking-lever tube axis (above the barrel)
MUZZLE_Y = 0.451
GRIP_TOP_Z = -0.016  # pistol grip meets the trigger housing
GRIP_PALM = (-0.069, -0.064)  # (z, y centre) of the grip at palm height (4 cm real below its top)
# Rig (glTF, rig units): the AK grip the right hand is posed on. Its top meets the receiver at
# Y −0.10; at palm height (Y −0.18) its section centre is at Z −0.1955.
RIG_GRIP_TOP_Y = -0.10
RIG_PALM = (-0.18, -0.1955)
RIG_GRIPR = (-0.0007, -0.095, -0.172)

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)

bpy.ops.import_scene.gltf(filepath=SRC)
sources = {}
for o in list(bpy.data.objects):
    if o.type != "MESH":
        continue
    o.data = o.data.copy()
    o.data.transform(o.matrix_world)
    o.parent = None
    o.matrix_world = mathutils.Matrix.Identity(4)
    sources[o.data.materials[0].name] = o
for o in list(bpy.data.objects):
    if o.type != "MESH":
        bpy.data.objects.remove(o)


def components(bm):
    bm.faces.ensure_lookup_table()
    seen, out = set(), []
    for face in bm.faces:
        if face.index in seen:
            continue
        stack, comp = [face], []
        seen.add(face.index)
        while stack:
            f = stack.pop()
            comp.append(f)
            for e in f.edges:
                for g in e.link_faces:
                    if g.index not in seen:
                        seen.add(g.index)
                        stack.append(g)
        vs = {v for f in comp for v in f.verts}
        lo = mathutils.Vector([min(v.co[i] for v in vs) for i in range(3)])
        hi = mathutils.Vector([max(v.co[i] for v in vs) for i in range(3)])
        out.append((comp, lo, hi))
    return out


def inside(lo, hi, box_lo, box_hi, tol=0.002):
    return all(box_lo[i] - tol <= lo[i] and hi[i] <= box_hi[i] + tol for i in range(3))


# (part, source material, box lo, box hi): components wholly inside the box go to the part.
RULES = [
    ("Magazine", "Mag__Barrel", (-0.016, 0.095, -0.212), (0.016, 0.22, 0.05)),
    ("CockingLever", "Mag__Barrel", (-0.04, 0.29, 0.096), (-0.001, 0.311, 0.111)),
    ("Trigger", "Attachments", (-0.006, 0.007, -0.05), (0.006, 0.026, -0.007)),
    ("RearSight", "Attachments", (-0.015, -0.084, 0.119), (0.015, -0.035, 0.148)),
    ("FrontSight", "Mag__Barrel", (-0.016, 0.38, 0.052), (0.016, 0.406, 0.155)),
]
parts = {}
for key, obj in sources.items():
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.faces.index_update()
    tag = {}
    for comp, lo, hi in components(bm):
        part = "Gun"
        for name, mat, blo, bhi in RULES:
            if mat == key and inside(lo, hi, blo, bhi):
                part = name
                break
        for f in comp:
            tag[f.index] = part
    for part in set(tag.values()):
        sub = bm.copy()
        sub.faces.ensure_lookup_table()
        bmesh.ops.delete(sub, geom=[f for f in sub.faces if tag[f.index] != part], context="FACES")
        mesh = bpy.data.meshes.new(f"{part}_{key}")
        sub.to_mesh(mesh)
        sub.free()
        mesh.materials.append(obj.data.materials[0])
        parts.setdefault(part, []).append(mesh)
    bm.free()
for obj in sources.values():
    bpy.data.objects.remove(obj)
print("REPORT parts", {k: len(v) for k, v in parts.items()})


def join(name, meshes):
    objs = []
    for m in meshes:
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


# ---------------------------------------------------------------- claw mount + rail (new geometry)
def box_mesh(name, boxes, material):
    """Union of axis-aligned boxes [(lo, hi)] as one mesh (separate closed boxes)."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    for lo, hi in boxes:
        res = bmesh.ops.create_cube(bm, size=1.0)
        for v in res["verts"]:
            v.co = mathutils.Vector(
                [lo[i] + (hi[i] - lo[i]) * (v.co[i] + 0.5) for i in range(3)]
            )
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        n = f.normal
        for loop in f.loops:
            c = loop.vert.co
            if abs(n.z) > 0.7:
                loop[uv].uv = (c.x * 8, c.y * 8)
            elif abs(n.x) > 0.7:
                loop[uv].uv = (c.y * 8, c.z * 8)
            else:
                loop[uv].uv = (c.x * 8, c.z * 8)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material)
    o = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(o)
    return o


mount_mat = bpy.data.materials.new("MP5Mount")
mount_mat.use_nodes = True
bsdf = mount_mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.035, 0.036, 0.038, 1)
bsdf.inputs["Metallic"].default_value = 0.65
bsdf.inputs["Roughness"].default_value = 0.42
# Receiver top (source): z 0.128 over y −0.03 … 0.11, 0.052 wide. A claw mount clamps on it:
# two bases straddling the receiver, a bridge, then the rail (slots every 10 mm real).
RECV_TOP = 0.1275
mm = SRC_PER_METRE / 1000
rail_lo_z = RECV_TOP + 14 * mm
rail_hi_z = rail_lo_z + 6 * mm
boxes = []
for y0, y1 in ((-0.03, 0.0), (0.072, 0.102)):  # clamp feet over the receiver dimples
    boxes.append(((-0.028, y0, RECV_TOP - 9 * mm), (-0.022, y1, RECV_TOP + 3 * mm)))
    boxes.append(((0.022, y0, RECV_TOP - 9 * mm), (0.028, y1, RECV_TOP + 3 * mm)))
    boxes.append(((-0.028, y0, RECV_TOP), (0.028, y1, rail_lo_z)))
boxes.append(((-0.011, -0.03, rail_lo_z - 4 * mm), (0.011, 0.102, rail_lo_z)))  # bridge
# Picatinny: a 21 mm top with recoil slots (raised teeth between them).
boxes.append(((-10.5 * mm, -0.03, rail_lo_z), (10.5 * mm, 0.102, rail_hi_z - 3 * mm)))
y = -0.03 + 2 * mm
while y + 5.2 * mm < 0.102:
    boxes.append(((-10.5 * mm, y, rail_hi_z - 3 * mm), (10.5 * mm, y + 5.2 * mm, rail_hi_z)))
    y += 10 * mm
mount = box_mesh("OpticMountGeometry", boxes, mount_mat)
objs["OpticMount"] = mount
print("REPORT rail top src", round(rail_hi_z, 4), "y", -0.03, 0.102)

# ---------------------------------------------------------------- shading
for o in objs.values():
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35), keep_sharp_edges=True)
    o.data.validate()

# ---------------------------------------------------------------- hierarchy + markers
root = bpy.data.objects.new("MP5", None)
bpy.context.scene.collection.objects.link(root)


def empty(name, loc, parent=root, rot=None):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.empty_display_size = 0.02
    e.parent = parent
    e.location = loc
    if rot:
        e.rotation_euler = rot
    return e


def attach(obj, parent, pivot):
    obj.data.transform(mathutils.Matrix.Translation(-pivot))
    obj.parent = parent
    obj.location = (0, 0, 0)


for name in ("Gun", "RearSight", "FrontSight", "OpticMount"):
    objs[name].parent = root

# Magazine: pivot at the top centre of its body (inside the magwell); drops along its own axis.
mlo, mhi = vbox(objs["Magazine"])
mag_pivot = mathutils.Vector(((mlo.x + mhi.x) / 2, (mlo.y + mhi.y) / 2, mhi.z))
magazine = empty("Magazine", mag_pivot)
attach(objs["Magazine"], magazine, mag_pivot)
# Support palm: on the magazine's front face, halfway down the part below the magwell.
MAGWELL_BOTTOM_Z = -0.012
empty("MagazineGrip", (0, mhi.y - mag_pivot.y - 0.03, (MAGWELL_BOTTOM_Z + mlo.z) / 2 - mag_pivot.z), parent=magazine)

# Cocking lever: origin on the tube axis level with the lever; travels back (−Y source, +Z GLB)
# and turns about the tube axis to hook into the notch.
clo, chi = vbox(objs["CockingLever"])
lever_pivot = mathutils.Vector((0, (clo.y + chi.y) / 2, TUBE_Z))
lever = empty("ChargingHandle", lever_pivot)
attach(objs["CockingLever"], lever, lever_pivot)
knob = mathutils.Vector((clo.x + 0.004, (clo.y + chi.y) / 2, (clo.z + chi.z) / 2))
empty("ChargingKnob", knob - lever_pivot, parent=lever)

tlo, thi = vbox(objs["Trigger"])
trig_pivot = mathutils.Vector((0, (tlo.y + thi.y) / 2, thi.z))
trigger = empty("Trigger", trig_pivot)
attach(objs["Trigger"], trigger, trig_pivot)

empty("MuzzleDeviceTip", (0, MUZZLE_Y, BORE_Z))
empty("EjectionPort", (0.027, 0.14, 0.078))
empty("MagRelease", (0, 0.094, -0.02))
rlo, rhi = vbox(objs["RearSight"])
empty("RearSightAperture", ((rlo.x + rhi.x) / 2, (rlo.y + rhi.y) / 2, rlo.z + (rhi.z - rlo.z) * 0.62))
flo, fhi = vbox(objs["FrontSight"])
empty("FrontSightPost", (0, (flo.y + fhi.y) / 2, fhi.z - 0.012))

# ---------------------------------------------------------------- viewmodel units + rig placement
# Height: the grip top under the web of the hand (rig Y −0.10). Fore-aft: the grip's palm-height
# centre on the AK's. Rig (glTF) ↔ Blender: glTF (x, y, z) = Blender (x, z, −y).
shift_z = RIG_GRIP_TOP_Y - GRIP_TOP_Z * S
palm_rig_y = GRIP_PALM[0] * S + shift_z  # where the MP5 palm-height section lands (rig Y)
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
# GripR: the rig's right-hand frame, so the merge can verify the placement.
grip_r = empty("GripR", (0, 0, 0), parent=None)
grip_r.location = (RIG_GRIPR[0], -RIG_GRIPR[2], RIG_GRIPR[1])
grip_r.rotation_euler = (math.radians(-16.0), 0, 0)
grip_r.parent = root
grip_r.matrix_parent_inverse = root.matrix_world.inverted()
# GripL: support-hand station, mid-handguard on its axis (Blender source → placed).
HANDGUARD = (0.27, 0.062)  # (y, z) source
gl = empty("GripL", (0, HANDGUARD[0] * S, HANDGUARD[1] * S))

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
    "GripR", "GripL", "Magazine", "MagazineGrip", "ChargingHandle", "ChargingKnob", "Trigger",
    "MuzzleDeviceTip", "EjectionPort", "MagRelease", "RearSightAperture", "FrontSightPost",
):
    print("REPORT marker", name, "rig", rig(name))
print("REPORT magazine height rig", round((mhi.z - mlo.z) * S, 4))

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
