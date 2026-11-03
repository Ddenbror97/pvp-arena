"""
AWP viewmodel rifle (Blender, headless): sourced CC-BY "Sniper" (stevennvh) refinished as the
classic olive-polymer / black-steel AWP, animated parts separated, marker empties, viewmodel units.

    python build_awp_viewmodel.py -- <sniper/scene.gltf> <out.glb> <out.blend>

What it does (source coordinates after import: Blender Z up, muzzle +Y, bolt handle on +X,
~45 units per metre — the 30 mm scope tube is 1.34 units across, the rifle 53.3 units long):
  1. Imports the 14-part source, welds its flat-shaded facets and classifies every connected
     component by position: buttstock, receiver block, bolt group, magazine, scope, bipod, …
  2. Removes what is not an AWP: the bipod, the open flip-up lens caps, the piggy-back mini
     red-dot on top of the scope, the side-saddle cartridges, and the slab fore-end that hid
     the barrel.
  3. Adds what the AWP silhouette and the shared arm rig need: a raked pistol grip lofted from
     the AK grip sections the right hand is posed on (so the fingers close on it), a wider
     rounded fore-end that leaves the barrel free-floated above it, and the barrel section the
     old fore-end covered.
  4. Separates the parts that animate: Bolt (body, slides straight back along the bore),
     BoltHandle (arm + knob, rotates about the bolt axis), Magazine (drops straight down,
     chunkier and seated deeper in the stock), Trigger.
  5. Refinishes: olive polymer stock (source scratch texture re-tinted), dark steel action,
     barrel, bolt and rings, green scope tube with black bells/turrets, coated lenses.
  6. Adds the marker empties the runtime reads (see art/blender/awp/README.md), scales to the
     viewmodel's 2.0 units per metre with the bore on the root's Y = 0 plane (as the M4), and
     exports a GLB that merge_awp_viewmodel.mjs places on the shared first-person arm rig.
"""

import math
import os
import sys

import bpy  # noqa: I001  (bpy must load before bmesh/mathutils)
import bmesh
import mathutils
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1 :]
SRC, OUT_GLB, OUT_BLEND = argv[:3]
TEX_DIR = os.path.join(os.path.dirname(os.path.abspath(OUT_GLB)), "textures")
os.makedirs(TEX_DIR, exist_ok=True)
SRC_TEX = os.path.join(os.path.dirname(os.path.abspath(SRC)), "textures")

# --- Measured landmarks (source units). See art/blender/awp/README.md.
UNITS_PER_METRE = 45.0  # 53.3-unit rifle ≈ 1.185 m; 1.34-unit scope tube ≈ 30 mm
GLB_PER_METRE = 2.0  # the shared viewmodel rig: 1.76 units for an 880 mm AK
S = GLB_PER_METRE / UNITS_PER_METRE
BORE_Z = 1.84  # barrel / muzzle-brake axis (bolt axis 1.855)
BOLT_AXIS_Z = 1.855
BOLT_FACE_Y = 2.07  # front of the bolt body
PORT = (-2.14, 2.00)  # ejection-port opening along the bore (right side, z 2.02–2.43)
BOLT_TRAVEL = BOLT_FACE_Y - PORT[0] + 0.25  # bolt face clears the port's rear edge
HANDLE_LIFT_DEG = 65.0
RECEIVER_SPLIT_Z = 1.45  # receiver block: black steel above, olive stock below
SCOPE_AXIS_Z = 3.473
OCULAR_Y, OBJECTIVE_Y = -5.58, 6.16
EYE_BEHIND_OCULAR = 0.03 * UNITS_PER_METRE
MUZZLE_Y = 38.28
TRIGGER_BOX = ((-0.2, -3.05, -0.95), (0.2, -2.35, -0.15))
# The rig's right hand: rifle-local Z offset the merge applies (AWP_GRIP_ALIGN[2]). The pistol
# grip below is lofted in rig space from the AK grip sections and converted with it; the merge
# verifies that this file's GripR lands on the rig's GripR.
RIG_ALIGN_Z = -0.44
RIG_GRIPR = (-0.0007, -0.095, -0.172)
RIG_SUPPORT_Z = -0.79  # where poseRifleHands puts the support hand (handguard z −0.88 + 0.09)

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)


def rig_to_src(Y, Z):
    """Rig-space (bore line Y = 0, muzzle −Z) height/depth → source (y, z)."""
    return (RIG_ALIGN_Z - Z) / S, Y / S + BORE_Z


# ---------------------------------------------------------------- import + weld
bpy.ops.import_scene.gltf(filepath=SRC)
sources = {}
for o in list(bpy.data.objects):
    if o.type != "MESH":
        continue
    o.data = o.data.copy()
    o.data.transform(o.matrix_world)
    key = o.data.materials[0].name  # lambert*: one material per source part
    sources[key] = o
for o in list(bpy.data.objects):
    if o.type != "MESH":
        bpy.data.objects.remove(o)
for o in sources.values():
    o.parent = None
    o.matrix_world = mathutils.Matrix.Identity(4)


def components(bm):
    """Face-connected components: list of (faces, lo, hi, tris)."""
    bm.faces.index_update()
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
        out.append((comp, lo, hi, sum(len(f.verts) - 2 for f in comp)))
    return out


def all_in(face, lo, hi):
    return all(lo[i] - 1e-3 <= v.co[i] <= hi[i] + 1e-3 for v in face.verts for i in range(3))


# ---------------------------------------------------------------- materials + textures
def load_src(name):
    path = next(p for p in os.listdir(SRC_TEX) if p.startswith(name + "_"))
    return bpy.data.images.load(os.path.join(SRC_TEX, path))


def image_from(pixels, name, w, h):
    img = bpy.data.images.new(name, w, h, alpha=False)
    img.pixels.foreach_set(pixels.astype(np.float32).ravel())
    img.filepath_raw = os.path.join(TEX_DIR, name + ".png")
    img.file_format = "PNG"
    img.save()
    return img


def box_blur(a, radius):
    """Separable wrap-around box blur (the textures tile on the lofted parts)."""
    for axis in (0, 1):
        acc = np.zeros_like(a)
        for d in range(-radius, radius + 1):
            acc += np.roll(a, d, axis=axis)
        a = acc / (2 * radius + 1)
    return a


def tinted(src_name, out_name, rgb, contrast=0.8, lo=0.55, hi=1.45, size=None):
    """
    Re-tint a photo texture to `rgb` (sRGB 0–1), keeping its scratches as luminance variation.
    The photo's vignette and blotches are removed (luminance over a wide blur), so it tiles
    without dark bands along the lofted fore-end and grip.
    """
    img = load_src(src_name)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    lum = px[..., :3] @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    lum = lum / np.maximum(box_blur(box_blur(lum, 10), 10), 1e-3)
    ratio = np.clip(lum**contrast, lo, hi)
    out = np.ones((h, w, 4), dtype=np.float32)
    out[..., :3] = np.clip(np.array(rgb, dtype=np.float32) * ratio[..., None], 0, 1)
    result = image_from(out, out_name, w, h)
    if size:
        result.scale(*size)
        result.save()
    bpy.data.images.remove(img)
    return result


def scaled_copy(src_name, out_name, size, gain=1.0):
    img = load_src(src_name)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    px[..., :3] = np.clip(px[..., :3] * gain, 0, 1)
    px[..., 3] = 1
    result = image_from(px, out_name, w, h)
    if size and (w, h) != tuple(size):
        result.scale(*size)
        result.save()
    bpy.data.images.remove(img)
    return result


def material(name, color=(1, 1, 1), metal=0.0, rough=0.5, image=None, uv_scale=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Roughness"].default_value = rough
    if image is not None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return m


# Classic AWP: olive-drab polymer stock, dark steel, green scope tube with black bells.
MAT = {
    "polymer": material(
        "AWPPolymer",
        rough=0.62,
        image=tinted("lambert7", "awp_polymer", (0.215, 0.245, 0.12), contrast=0.6, lo=0.7, hi=1.25),
    ),
    "rubber": material("AWPRubber", color=(0.035, 0.036, 0.034), rough=0.85),
    "steel": material(
        "AWPSteel",
        metal=0.8,
        rough=0.42,
        image=scaled_copy("lambert6", "awp_steel", (1024, 1024), gain=0.75),
    ),
    "scope_green": material(
        "AWPScopeGreen",
        metal=0.2,
        rough=0.45,
        image=tinted("lambert7", "awp_scope_green", (0.25, 0.27, 0.115), contrast=0.5, lo=0.75, hi=1.2),
    ),
    "scope_black": material(
        "AWPScopeBlack",
        metal=0.55,
        rough=0.4,
        image=scaled_copy("lambert23", "awp_scope_black", (512, 256), gain=0.8),
    ),
    "lens": material("AWPLens", color=(0.012, 0.03, 0.036), metal=0.0, rough=0.06),
}
for img in bpy.data.images:
    if img.name.startswith("lambert"):
        bpy.data.images.remove(img)
ORDER = list(MAT)

# ---------------------------------------------------------------- classify source faces
# Every face is assigned (bucket, material) or None (removed). Buckets become objects.
SRC_MAT = {  # whole parts with one destination
    "lambert25": ("Receiver", "steel"),  # muzzle brake
    "lambert15": ("Receiver", "steel"),  # stud and stock screws
    "lambert24": ("Receiver", "steel"),  # sling swivels
    "lambert14": ("Scope", "scope_black"),  # ring screws
    "lambert23": ("Scope", "scope_black"),  # rings, bands, turrets, bell ends
    "lambert18": ("Scope", "lens"),  # objective lens
    "lambert17": ("Scope", "lens"),  # ocular lens
    "lambert21": None,  # mini red-dot window
    # Side-saddle cartridges on the left of the stock: removed (bright clutter in first person,
    # not on the AWP), with their holder below.
    "lambert9": None,
    "lambert12": None,
    "lambert10": None,
    "lambert27": None,
}
assign = {}  # (source key, face index) -> (bucket, material) | None
removed = {"bipod": 0, "flip caps": 0, "mini red dot": 0, "fore-end slab": 0, "barrel stub": 0}


def classify_lambert7(bm):
    """Buttstock, receiver block (+trigger, guard), scope tube, side-saddle."""
    # Receiver block: cut at the stock line so the action reads as black steel on olive.
    block = next(c for c in components(bm) if c[1].z < -1.0 and c[2].y > 4.0)
    geom = list({e for f in block[0] for e in f.edges}) + list(block[0])
    geom += list({v for f in block[0] for v in f.verts})
    bmesh.ops.bisect_plane(
        bm, geom=geom, plane_co=(0, 0, RECEIVER_SPLIT_Z), plane_no=(0, 0, 1), clear_inner=False
    )
    out = {}
    for comp, lo, hi, _ in components(bm):
        for f in comp:
            c = f.calc_center_median()
            if hi.y < -3.0 and lo.y < -12:  # buttstock
                out[f.index] = ("Stock", "polymer")
            elif lo.z > 4.2 and lo.y > -2.5 and hi.y < -0.7:  # mini red dot body
                out[f.index] = None
                removed["mini red dot"] += 1
            elif lo.z > 2.4:  # scope: tube/eyepiece/bell green, end rings black
                green = lo.y > -5.6 and hi.y < 5.1
                out[f.index] = ("Scope", "scope_green" if green else "scope_black")
            elif lo.x < -0.6 and hi.x < -0.6:  # side-saddle shell holder
                out[f.index] = None
            elif all_in(f, *TRIGGER_BOX):
                out[f.index] = ("Trigger", "steel")
            elif c.z < -0.16 or c.x < -0.67 or c.z > RECEIVER_SPLIT_Z:
                out[f.index] = ("Receiver", "steel")  # guard, left lever, action
            else:
                out[f.index] = ("Stock", "polymer")
    return out


def classify_lambert6(bm):
    """The catch-all part: action, bolt, barrel, rail, magazine, bipod, scope hardware, buttpad."""
    out = {}
    for comp, lo, hi, tris in components(bm):
        tag = None
        if lo.y > 15.9 and hi.y < 16.9:
            tag, why = None, "bipod"
        elif lo.z > 4.1 and (hi.y < -4.0 or lo.y > 4.5):
            tag, why = None, "flip caps"
        elif lo.z > 4.0 and lo.y > -2.1 and hi.y < -0.7:
            tag, why = None, "mini red dot"
        elif lo.y < -3.2 and hi.y > 15.9 and lo.z > -0.2:
            tag, why = None, "fore-end slab"
        elif hi.y < -12.5:
            tag = ("Stock", "rubber")  # buttpad
        elif hi.z < 0 and abs(lo.y + 1.05) < 0.05 and tris == 140:
            tag = ("Magazine", "steel")
        elif hi.x > 1.5 and lo.z < 0.5:  # bolt group (+ hidden inner action parts)
            for f in comp:
                c = f.calc_center_median()
                if all_in(f, (-0.4, 3.59, 1.44), (0.4, 10.12, 2.26)):
                    out[f.index] = None
                    removed["barrel stub"] += 1
                elif (c.x > 0.2 and all_in(f, (0.2, -3.97, 0.25), (1.7, -3.07, 2.3))) or all_in(
                    f, (-0.3, -3.97, 1.44), (1.0, -3.07, 1.71)
                ):  # arm, knob and the root bar under the bolt
                    out[f.index] = ("BoltHandle", "steel")
                elif all_in(f, (-0.5, -4.6, 1.35), (0.5, BOLT_FACE_Y + 0.02, 2.36)):
                    out[f.index] = ("Bolt", "steel")
                else:
                    out[f.index] = ("Receiver", "steel")
            continue
        elif all(lo[i] >= (-0.51, -4.61, 1.34)[i] and hi[i] <= (0.51, BOLT_FACE_Y + 0.01, 2.37)[i] for i in range(3)):
            tag = ("Bolt", "steel")  # bolt body segments not welded to the handle group
        elif lo.z > 2.7:
            tag = ("Scope", "scope_black")  # rings, turrets, bands
        else:
            tag = ("Receiver", "steel")  # rail, barrel, studs, inner parts
        if tag is None:
            removed[why] += len(comp)
        for f in comp:
            out[f.index] = tag
    return out


BUCKETS = ["Stock", "Receiver", "Scope", "Bolt", "BoltHandle", "Magazine", "Trigger"]
bucket_meshes = {}
for key, obj in sources.items():
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    if key == "lambert7":
        table = classify_lambert7(bm)
    elif key == "lambert6":
        table = classify_lambert6(bm)
    else:
        bm.faces.index_update()
        table = {f.index: SRC_MAT[key] for f in bm.faces}
    bm.faces.index_update()
    layer = bm.faces.layers.int.new("bucket")
    for f in bm.faces:
        tag = table[f.index]
        f[layer] = BUCKETS.index(tag[0]) if tag else -1
        f.material_index = ORDER.index(tag[1]) if tag else 0
    for b, bucket in enumerate(BUCKETS):
        part = bm.copy()
        lay = part.faces.layers.int["bucket"]
        bmesh.ops.delete(part, geom=[f for f in part.faces if f[lay] != b], context="FACES")
        if len(part.faces):
            mesh = bpy.data.meshes.new(f"{bucket}_{key}")
            for k in ORDER:
                mesh.materials.append(MAT[k])
            part.to_mesh(mesh)
            bucket_meshes.setdefault(bucket, []).append(mesh)
        part.free()
    bm.free()
for obj in sources.values():
    bpy.data.objects.remove(obj)
buckets = bucket_meshes
print("REPORT removed faces", removed)


def new_object(name, meshes):
    """Join meshes (all using the ORDER material slots) into one object."""
    objs = []
    for m in meshes:
        assert [x.name for x in m.materials] == [MAT[k].name for k in ORDER], m.name
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


# ---------------------------------------------------------------- new geometry (lofts)
def ring(center_a, center_b, half_a, half_b, n=24, power=3.0):
    """Superellipse ring in a plane: returns [(a, b, t)] with t the normalised perimeter param."""
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        ca, sa = math.cos(t), math.sin(t)
        a = center_a + half_a * math.copysign(abs(ca) ** (2 / power), ca)
        b = center_b + half_b * math.copysign(abs(sa) ** (2 / power), sa)
        pts.append((a, b))
    return pts


def loft(name, rings3d, cap_start=True, cap_end=True, uv_scale=0.22):
    """Rings of 3D points (same count) → quad loft with perimeter/axis UVs."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    vrings = [[bm.verts.new(p) for p in r] for r in rings3d]
    n = len(rings3d[0])
    along = [0.0]
    for a, b in zip(rings3d, rings3d[1:]):
        ca = sum((mathutils.Vector(p) for p in a), mathutils.Vector()) / n
        cb = sum((mathutils.Vector(p) for p in b), mathutils.Vector()) / n
        along.append(along[-1] + (cb - ca).length)
    perim = []
    for r in rings3d:
        acc = [0.0]
        for i in range(n):
            acc.append(acc[-1] + (mathutils.Vector(r[(i + 1) % n]) - mathutils.Vector(r[i])).length)
        perim.append(acc)
    for k in range(len(vrings) - 1):
        for i in range(n):
            j = (i + 1) % n
            f = bm.faces.new((vrings[k][i], vrings[k][j], vrings[k + 1][j], vrings[k + 1][i]))
            for loop, (kk, ii) in zip(f.loops, ((k, i), (k, i + 1), (k + 1, i + 1), (k + 1, i))):
                loop[uv].uv = (perim[kk][ii] * uv_scale, along[kk] * uv_scale)
    for idx, flip in ((0, True), (len(vrings) - 1, False)):
        if (idx == 0 and not cap_start) or (idx > 0 and not cap_end):
            continue
        verts = vrings[idx][::-1] if flip else vrings[idx]
        f = bm.faces.new(verts)
        for loop in f.loops:
            loop[uv].uv = (loop.vert.co.x * uv_scale, loop.vert.co.y * uv_scale)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def set_material(mesh, key):
    for k in ORDER:
        mesh.materials.append(MAT[k])
    for p in mesh.polygons:
        p.material_index = ORDER.index(key)


# Fore-end: rounded, wider than the action, top just under the free-floated barrel.
# (y, half-width, z top, z bottom)
FORE_END = [
    (3.90, 0.62, 1.40, 0.12),
    (4.60, 0.82, 1.42, -0.05),
    (5.60, 0.92, 1.42, -0.22),
    (12.0, 0.92, 1.42, -0.18),
    (15.2, 0.89, 1.42, 0.02),
    (15.75, 0.82, 1.38, 0.22),
    (16.05, 0.64, 1.28, 0.42),
]
fe_rings = []
for y, hw, top, bot in FORE_END:
    fe_rings.append(
        [(a, y, b) for a, b in ring(0.0, (top + bot) / 2, hw, (top - bot) / 2, n=28, power=3.2)]
    )
fore_end = loft("ForeEnd", fe_rings, uv_scale=0.09)  # one texture span along it: no repeat bands
set_material(fore_end, "polymer")

# Pistol grip: horizontal sections of the AK grip the rig's right hand is posed on
# (rig-space height Y, front Z, back Z), raked like it, converted to source units.
AK_GRIP = [
    (-0.050, -0.287, -0.152),  # inside the stock wrist
    (-0.120, -0.275, -0.171),
    (-0.140, -0.257, -0.165),
    (-0.180, -0.241, -0.150),
    (-0.200, -0.227, -0.138),
    (-0.220, -0.219, -0.131),
    (-0.240, -0.217, -0.131),
    (-0.260, -0.216, -0.138),
    (-0.275, -0.214, -0.150),
    (-0.285, -0.206, -0.166),
]
GRIP_HALF_W = 0.022 / S
grip_rings = []
for k, (Y, zf, zb) in enumerate(AK_GRIP):
    yf, z = rig_to_src(Y, zf)
    yb, _ = rig_to_src(Y, zb)
    taper = 1.0 if k < len(AK_GRIP) - 2 else (0.92 if k == len(AK_GRIP) - 2 else 0.78)
    grip_rings.append(
        [(a, b, z) for a, b in ring(0.0, (yf + yb) / 2, GRIP_HALF_W * taper, (yf - yb) / 2, n=24, power=2.6)]
    )
grip = loft("PistolGrip", grip_rings[::-1], cap_end=False)  # bottom capped, top inside the wrist
set_material(grip, "polymer")
print("REPORT grip top/bottom src", rig_to_src(*AK_GRIP[1][:2]), rig_to_src(AK_GRIP[-1][0], AK_GRIP[-1][1]))

# Barrel section the slab fore-end hid: receiver ring → the source barrel at the fore-end tip.
barrel_rings = []
for y, r, zc in ((3.6, 0.40, 1.85), (4.6, 0.40, 1.848), (15.6, 0.352, 1.812), (16.3, 0.345, 1.81)):
    barrel_rings.append([(a, y, b) for a, b in ring(0.0, zc, r, r, n=20, power=2.0)])
barrel = loft("BarrelSection", barrel_rings, cap_start=False, cap_end=False)
set_material(barrel, "steel")

buckets["Stock"] += [fore_end, grip]
buckets["Receiver"].append(barrel)

objs = {name: new_object(f"{name}Geometry", meshes) for name, meshes in buckets.items()}

# ---------------------------------------------------------------- magazine: chunkier, seated deeper
mag = objs["Magazine"]
mlo = mathutils.Vector([min(v.co[i] for v in mag.data.vertices) for i in range(3)])
mhi = mathutils.Vector([max(v.co[i] for v in mag.data.vertices) for i in range(3)])
mc = (mlo + mhi) / 2
MAG_TOP = 1.0  # top hidden inside the action (source top was flush with the stock bottom)
for v in mag.data.vertices:
    v.co.x = mc.x + (v.co.x - mc.x) * 1.7
    v.co.y = mc.y + (v.co.y - mc.y) * 1.45
    if v.co.z > mhi.z - 0.05:
        v.co.z = MAG_TOP
mag.data.update()

# ---------------------------------------------------------------- shading
for o in objs.values():
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(38), keep_sharp_edges=True)
    o.data.validate()

# ---------------------------------------------------------------- hierarchy + markers
col_names = {
    "AWP_Rifle": ["StockGeometry", "ReceiverGeometry"],
    "AWP_Scope": ["ScopeGeometry"],
    "AWP_Animated": [],
    "AWP_Markers": [],
}
cols = {}
for name in col_names:
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    cols[name] = c


def move_to(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    cols[col].objects.link(obj)


root = bpy.data.objects.new("AWP", None)
cols["AWP_Rifle"].objects.link(root)


def empty(name, loc, parent=root, col="AWP_Markers", rot=None):
    e = bpy.data.objects.new(name, None)
    cols[col].objects.link(e)
    e.empty_display_size = 0.4
    e.parent = parent
    e.location = loc
    if rot:
        e.rotation_euler = rot
    return e


def vbox(obj):
    pts = [v.co for v in obj.data.vertices]
    return (
        mathutils.Vector([min(v[i] for v in pts) for i in range(3)]),
        mathutils.Vector([max(v[i] for v in pts) for i in range(3)]),
    )


def attach(obj, parent, pivot_world):
    """Re-centre obj's mesh on pivot_world (source coords) and parent it (no transform)."""
    obj.data.transform(mathutils.Matrix.Translation(-pivot_world))
    obj.parent = parent
    obj.location = (0, 0, 0)


for name in ("StockGeometry", "ReceiverGeometry"):
    objs[name.replace("Geometry", "")].parent = root
    move_to(objs[name.replace("Geometry", "")], "AWP_Rifle")
objs["Scope"].parent = root
move_to(objs["Scope"], "AWP_Scope")

# Bolt: origin on the bolt axis at the bolt face; slides back (+Z in the GLB) by BOLT_TRAVEL.
bolt_pivot = mathutils.Vector((0, BOLT_FACE_Y, BOLT_AXIS_Z))
bolt = empty("Bolt", bolt_pivot, col="AWP_Animated")
attach(objs["Bolt"], bolt, bolt_pivot)
move_to(objs["Bolt"], "AWP_Animated")
# Handle: pivot on the bolt axis level with the handle; rotating it about the bore lifts the knob.
hlo, hhi = vbox(objs["BoltHandle"])
handle_pivot = mathutils.Vector((0, (hlo.y + hhi.y) / 2, BOLT_AXIS_Z))
handle = empty("BoltHandle", handle_pivot - bolt_pivot, parent=bolt, col="AWP_Animated")
attach(objs["BoltHandle"], handle, handle_pivot)
move_to(objs["BoltHandle"], "AWP_Animated")
knob_verts = [v.co + handle_pivot for v in objs["BoltHandle"].data.vertices if v.co.x + handle_pivot.x > 1.0]
knob_pts = [v for v in knob_verts if v.z < (min(p.z for p in knob_verts) + 0.5)]
knob_centre = mathutils.Vector(
    [(min(p[i] for p in knob_pts) + max(p[i] for p in knob_pts)) / 2 for i in range(3)]
)
empty("BoltKnob", knob_centre - handle_pivot, parent=handle, col="AWP_Markers")

# Magazine: pivot at the top centre; drops straight down (−Y in the GLB).
mlo, mhi = vbox(mag)
mag_pivot = mathutils.Vector(((mlo.x + mhi.x) / 2, (mlo.y + mhi.y) / 2, mhi.z))
magazine = empty("Magazine", mag_pivot, col="AWP_Animated")
attach(mag, magazine, mag_pivot)
move_to(mag, "AWP_Animated")
STOCK_BOTTOM_Z = -0.17  # stock underside around the magazine
# Support-hand palm: just behind the front edge, halfway down the exposed part (as the M4).
empty(
    "MagazineGrip",
    (0, mhi.y - mag_pivot.y - 0.45, (STOCK_BOTTOM_Z + mlo.z) / 2 - mag_pivot.z),
    parent=magazine,
)

tlo, thi = vbox(objs["Trigger"])
trig_pivot = mathutils.Vector((0, (tlo.y + thi.y) / 2, thi.z))
trigger = empty("Trigger", trig_pivot, col="AWP_Animated")
attach(objs["Trigger"], trigger, trig_pivot)
move_to(objs["Trigger"], "AWP_Animated")

# Grip frames in rifle-local source units. GripR = the rig's right-hand frame (the merge checks
# it lands there); GripL = support-hand station on the fore-end, on the bore line.
gy, gz = rig_to_src(RIG_GRIPR[1], RIG_GRIPR[2])
empty("GripR", (RIG_GRIPR[0] / S, gy, gz), rot=(math.radians(-16.0), 0, 0))
ly, _ = rig_to_src(0, RIG_SUPPORT_Z)
empty("GripL", (0, ly, BORE_Z))
empty("MuzzleDeviceTip", (0, MUZZLE_Y, 1.815))
empty("EjectionPort", (0.62, (PORT[0] + PORT[1]) / 2, 2.22))
empty("MagRelease", (0, -1.68, -0.25))
# Scope: eye point ~3 cm behind the ocular lens on the optical axis (−Z of the GLB node looks
# forward through the scope: identity rotation), objective lens centre.
empty("ScopeEye", (0, OCULAR_Y - EYE_BEHIND_OCULAR, SCOPE_AXIS_Z))
empty("ScopeObjective", (0, OBJECTIVE_Y, SCOPE_AXIS_Z))

# Viewmodel units; bore axis through the root's Y = 0 plane (GLB), as the M4. Unlike the M4
# (scale on its root node), the scale is baked into the geometry and every local translation,
# so the AWP node has unit scale and the runtime's offsets (bolt travel, magazine drop) are in
# viewmodel-rig units in every node's parent space.
bpy.context.view_layer.update()
for o in bpy.data.objects:
    if o is root or o.parent is None:
        continue
    o.location = o.location * S
    if o.type == "MESH":
        o.data.transform(mathutils.Matrix.Scale(S, 4))
root.location = (0, 0, -BORE_Z * S)

# ---------------------------------------------------------------- report
bpy.context.view_layer.update()
tri_total = 0
for o in bpy.data.objects:
    if o.type == "MESH":
        t = sum(len(p.vertices) - 2 for p in o.data.polygons)
        tri_total += t
        print("REPORT", o.name, "tris", t)
print("REPORT total tris", tri_total)


def glb(v):
    """Source point → GLB rifle-local (root applied): x, (z − bore)·S, −y·S."""
    return (round(v[0] * S, 4), round((v[2] - BORE_Z) * S, 4), round(-v[1] * S, 4))


for name in (
    "Bolt", "BoltHandle", "BoltKnob", "Magazine", "MagazineGrip", "Trigger", "GripR", "GripL",
    "MuzzleDeviceTip", "EjectionPort", "MagRelease", "ScopeEye", "ScopeObjective",
):
    o = bpy.data.objects[name]
    w = (root.matrix_world.inverted() @ o.matrix_world.translation) / S
    print("REPORT marker", name, "src", tuple(round(x, 3) for x in w), "glb", glb(w))
print("REPORT bolt travel src", round(BOLT_TRAVEL, 3), "glb", round(BOLT_TRAVEL * S, 4))
print("REPORT magazine height src", round(mhi.z - mlo.z, 3), "glb", round((mhi.z - mlo.z) * S, 4),
      "seated depth glb", round((mhi.z - STOCK_BOTTOM_Z) * S, 4))
print("REPORT knob centre src", tuple(round(x, 3) for x in knob_centre), "lift deg", HANDLE_LIFT_DEG)

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
