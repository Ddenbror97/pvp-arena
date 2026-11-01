"""
Police M4A1 viewmodel rifle (Blender, headless): sourced CC-BY M4A1 + carry handle + suppressor.

    python3.11 build_m4_viewmodel.py -- <rifle.gltf> <handle.gltf> <suppressor.gltf> \
        <base_black.png> <mr_black.png> <out.glb> <out.blend>

What it does (source coordinates: Blender Z up, muzzle +Y, model units):
  1. Imports the M4A1, removes the red-dot optic and the flip-up rear sight (the carry handle
     replaces both), and recolours the tan furniture to black polymer (textures prepared by
     recolor_m4_textures.py).
  2. Separates the parts that animate: MagazineGeometry (drops straight out of the magwell)
     and ChargingHandleGeometry (the T-latch, pulled straight back).
  3. Mounts the carry handle (rear aperture toward the shooter) on the receiver rail and the
     suppressor over the flash hider, with a restrained PVPSPINARENA violet anodised accent
     on the suppressor's front cap and the charging-handle latch.
  4. Adds marker empties the runtime reads: Magazine, MagazineGrip, ChargingHandle,
     MuzzleDeviceTip, EjectionPort, BoltCatch, MagRelease.
  5. Scales to the viewmodel's units (the AK GLB's ~2.0 units per metre) and exports a GLB the
     merge step (merge_m4_viewmodel.mjs) combines with the shared first-person arm rig.
"""

import math
import os
import sys

import bpy  # noqa: I001  (bpy must load before bmesh/mathutils)
import bmesh
import mathutils

argv = sys.argv[sys.argv.index("--") + 1 :]
RIFLE, HANDLE, SUPP, BASE, MR, OUT_GLB, OUT_BLEND = argv[:7]

# --- Measured landmarks (source units). See art/blender/m4/README.md.
UNITS_PER_METRE = 5.776  # 4.84-unit model ≈ 838 mm M4A1
GLB_PER_METRE = 2.0  # the AK viewmodel GLB: 1.76 units for an 880 mm AK
S = GLB_PER_METRE / UNITS_PER_METRE
BORE_Z = 0.313
RAIL_TOP_Z = 0.506
FLASH_HIDER_BASE_Y = 2.2

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)


def import_gltf(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    for m in meshes:
        m.data = m.data.copy()
        m.data.transform(m.matrix_world)
        m.parent = None
        m.matrix_world = mathutils.Matrix.Identity(4)
    for o in new:
        if o.type != "MESH":
            bpy.data.objects.remove(o)
    if len(meshes) > 1:
        bpy.ops.object.select_all(action="DESELECT")
        for m in meshes:
            m.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.join()
    return meshes[0]


def delete_faces(obj, predicate):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    doomed = [f for f in bm.faces if predicate(f.calc_center_median(), f)]
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    bm.to_mesh(obj.data)
    bm.free()
    return len(doomed)


def separate(obj, predicate, name):
    """Move the faces matching `predicate` into a new object called `name`."""
    part_bm = bmesh.new()
    part_bm.from_mesh(obj.data)
    rest_bm = part_bm.copy()
    bmesh.ops.delete(
        part_bm,
        geom=[f for f in part_bm.faces if not predicate(f.calc_center_median(), f)],
        context="FACES",
    )
    moved = [f for f in rest_bm.faces if predicate(f.calc_center_median(), f)]
    count = len(moved)
    bmesh.ops.delete(rest_bm, geom=moved, context="FACES")
    mesh = bpy.data.meshes.new(name)
    part_bm.to_mesh(mesh)
    part_bm.free()
    rest_bm.to_mesh(obj.data)
    rest_bm.free()
    new = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(new)
    for m in obj.data.materials:
        mesh.materials.append(m)
    return new, count


def vbox(obj):
    pts = [v.co for v in obj.data.vertices]
    return (
        mathutils.Vector([min(v[i] for v in pts) for i in range(3)]),
        mathutils.Vector([max(v[i] for v in pts) for i in range(3)]),
    )


def component_faces(obj, predicate):
    """Face indices of every face-connected component whose bounds satisfy predicate(lo, hi)."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    seen, chosen = set(), set()
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
        lo = [min(v.co[i] for v in vs) for i in range(3)]
        hi = [max(v.co[i] for v in vs) for i in range(3)]
        if predicate(lo, hi):
            chosen.update(f.index for f in comp)
    bm.free()
    return chosen


# ---------------------------------------------------------------- rifle
rifle = import_gltf(RIFLE)
rifle.name = "ReceiverGeometry"
mat = rifle.data.materials[0]
mat.name = "M4Finish"
for node in mat.node_tree.nodes:
    if node.type == "TEX_IMAGE" and node.image:
        n = node.image.name.lower()
        if "basecolor" in n:
            node.image = bpy.data.images.load(BASE)
        elif "metallic" in n:
            img = bpy.data.images.load(MR)
            img.colorspace_settings.name = "Non-Color"
            node.image = img

def in_box(c, lo, hi):
    return all(lo[i] <= c[i] <= hi[i] for i in range(3))


# Optic and flip-up rear sight: everything above the rail over the receiver.
removed = delete_faces(rifle, lambda c, f: c.z > RAIL_TOP_Z + 0.006 and -1.13 <= c.y <= 0.0)
print("REPORT removed optic/BUIS faces", removed)

# Magazine: the tan (originally Flat Dark Earth) polymer components under the magwell. Component
# selection keeps the lower receiver's magwell lips (black aluminium) on the rifle.
SOURCE_BASE = os.path.join(os.path.dirname(RIFLE), "textures", "Grid_baseColor.png")
tan_image = bpy.data.images.load(SOURCE_BASE)
TW, TH = tan_image.size
tan_pixels = tan_image.pixels[:]


def is_tan(rgb):
    r, g, b = rgb
    mx, mn = max(rgb), min(rgb)
    if mx < 0.25 or (mx - mn) / max(mx, 1e-4) < 0.18:
        return False
    d = max(mx - mn, 1e-5)
    hue = (((g - b) / d) % 6 if mx == r else (b - r) / d + 2 if mx == g else (r - g) / d + 4) * 60
    return 18 < hue < 55


def tan_component_faces(obj, box_lo, box_hi):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    uv = bm.loops.layers.uv.active
    bm.faces.ensure_lookup_table()
    seen, chosen = set(), set()
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
        lo = [min(v.co[i] for v in vs) for i in range(3)]
        hi = [max(v.co[i] for v in vs) for i in range(3)]
        if not all(box_lo[i] <= lo[i] and hi[i] <= box_hi[i] for i in range(3)):
            continue
        votes = 0
        samples = 0
        for f in comp[:60]:
            for loop in f.loops:
                u, v = loop[uv].uv
                x = int((u % 1) * (TW - 1))
                y = int((v % 1) * (TH - 1))
                k = (y * TW + x) * 4
                votes += is_tan(tan_pixels[k : k + 3])
                samples += 1
        # Tan polymer, or anything hanging well below the magwell (the magazine's dark ribs).
        if (samples and votes / samples > 0.5) or lo[2] < -0.15:
            chosen.update(f.index for f in comp)
    bm.free()
    return chosen


mag_faces = tan_component_faces(rifle, (-0.09, -0.5, -0.95), (0.09, 0.09, 0.12))
mag, n = separate(rifle, lambda c, f: f.index in mag_faces, "MagazineGeometry")
print("REPORT magazine faces", n)
# The T-latch: two thin plates behind the upper receiver (the ring below is the castle nut).
latch = component_faces(
    rifle,
    lambda lo, hi: lo[1] > -1.245 and hi[1] < -1.12 and lo[2] > 0.36 and hi[2] < 0.395,
)
handle, n = separate(rifle, lambda c, f: f.index in latch, "ChargingHandleGeometry")
print("REPORT charging handle faces", n)

# ---------------------------------------------------------------- carry handle
carry = import_gltf(HANDLE)
carry.name = "CarryHandleGeometry"
k = 1.03 / 5.27  # 178 mm long
carry.data.transform(mathutils.Matrix.Rotation(math.radians(90), 4, "Z"))
carry.data.transform(mathutils.Matrix.Scale(k, 4))
lo, hi = vbox(carry)
carry.data.transform(
    mathutils.Matrix.Translation(
        (-(lo.x + hi.x) / 2, -1.105 - lo.y, RAIL_TOP_Z - 0.004 - lo.z)
    )
)
print("REPORT carry handle", lo, hi)

# ---------------------------------------------------------------- suppressor
supp = import_gltf(SUPP)
supp.name = "SuppressorGeometry"
supp.data.transform(mathutils.Matrix.Diagonal((0.47, 0.52, 0.47, 1)))
lo, hi = vbox(supp)
supp.data.transform(
    mathutils.Matrix.Translation(
        (-(lo.x + hi.x) / 2, FLASH_HIDER_BASE_Y - lo.y, BORE_Z - (lo.z + hi.z) / 2)
    )
)
SUPP_FRONT = FLASH_HIDER_BASE_Y + (hi.y - lo.y)
# Decimate: 48k-triangle source is far over a viewmodel muzzle device budget.
dec = supp.modifiers.new("dec", "DECIMATE")
dec.ratio = 0.22
bpy.context.view_layer.objects.active = supp
bpy.ops.object.modifier_apply(modifier="dec")
supp_mat = supp.data.materials[0]
supp_mat.name = "SuppressorFinish"
bsdf = next(n for n in supp_mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
for link in list(supp_mat.node_tree.links):
    if link.to_node == bsdf and link.to_socket.name in ("Metallic", "Roughness", "Normal"):
        supp_mat.node_tree.links.remove(link)
bsdf.inputs["Metallic"].default_value = 0.75
bsdf.inputs["Roughness"].default_value = 0.5
for node in list(supp_mat.node_tree.nodes):
    if node.type == "TEX_IMAGE" and (
        node.image is None or not os.path.exists(bpy.path.abspath(node.image.filepath))
    ):
        supp_mat.node_tree.nodes.remove(node)

# ---------------------------------------------------------------- violet accent
accent = bpy.data.materials.new("PVPAccent")
accent.use_nodes = True
ab = accent.node_tree.nodes["Principled BSDF"]
ab.inputs["Base Color"].default_value = (0.16, 0.05, 0.32, 1)
ab.inputs["Metallic"].default_value = 0.85
ab.inputs["Roughness"].default_value = 0.34
supp.data.materials.append(accent)
cap_from = SUPP_FRONT - 0.13
for poly in supp.data.polygons:
    if poly.center.y > cap_from:
        poly.material_index = len(supp.data.materials) - 1
handle.data.materials.append(accent)
for poly in handle.data.polygons:
    if poly.center.y < -1.205:  # the latch's finger pull
        poly.material_index = len(handle.data.materials) - 1

# Soft machined edges: the source is a 536-triangle block with knife-sharp corners.
bev = carry.modifiers.new("bevel", "BEVEL")
bev.width = 0.006
bev.segments = 2
bev.limit_method = "ANGLE"
bev.harden_normals = True
bpy.context.view_layer.objects.active = carry
bpy.ops.object.modifier_apply(modifier="bevel")
wn = carry.modifiers.new("wn", "WEIGHTED_NORMAL")
wn.keep_sharp = True
bpy.ops.object.modifier_apply(modifier="wn")
carry_mat = carry.data.materials[0] if carry.data.materials else bpy.data.materials.new("x")
carry_mat.name = "CarryHandleFinish"
carry_mat.use_nodes = True
cb = next(n for n in carry_mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
cb.inputs["Base Color"].default_value = (0.035, 0.036, 0.04, 1)
cb.inputs["Metallic"].default_value = 0.7
cb.inputs["Roughness"].default_value = 0.42

# ---------------------------------------------------------------- hierarchy + markers
root = bpy.data.objects.new("M4A1", None)
bpy.context.scene.collection.objects.link(root)


def empty(name, loc, parent=root):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.parent = parent
    e.location = loc
    return e


def bbox(obj):
    pts = [v.co for v in obj.data.vertices]
    return (
        mathutils.Vector([min(v[i] for v in pts) for i in range(3)]),
        mathutils.Vector([max(v[i] for v in pts) for i in range(3)]),
    )


mlo, mhi = bbox(mag)
mag_pivot = mathutils.Vector(((mlo.x + mhi.x) / 2, (mlo.y + mhi.y) / 2, mhi.z))
magazine = empty("Magazine", mag_pivot)
mag.data.transform(mathutils.Matrix.Translation(-mag_pivot))
mag.parent = magazine
# Support-hand grip: just behind the magazine's front edge, a third of the way down its body.
empty("MagazineGrip", (0, mhi.y - mag_pivot.y - 0.06, (mlo.z - mhi.z) * 0.3), magazine)

hlo, hhi = bbox(handle)
handle_pivot = mathutils.Vector(((hlo.x + hhi.x) / 2, hhi.y, (hlo.z + hhi.z) / 2))
charging = empty("ChargingHandle", handle_pivot)
handle.data.transform(mathutils.Matrix.Translation(-handle_pivot))
handle.parent = charging

for obj in (rifle, carry, supp):
    obj.parent = root
empty("MuzzleDeviceTip", (0, SUPP_FRONT, BORE_Z))
empty("EjectionPort", (0.09, -0.40, 0.372))
empty("BoltCatch", (-0.083, -0.56, 0.17))
empty("MagRelease", (0.083, -0.52, 0.12))

# Viewmodel units; bore axis through the origin's Z = 0 plane.
root.location = (0, 0, -BORE_Z * S)
root.scale = (S, S, S)

bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format="GLB",
    export_yup=True,
    export_apply=False,
    export_image_format="WEBP",
    export_texcoords=True,
    export_normals=True,
    export_tangents=False,
)
for o in (rifle, mag, handle, carry, supp):
    print(o.name, "tris", sum(len(p.vertices) - 2 for p in o.data.polygons))
print("suppressor front (source units)", SUPP_FRONT)
