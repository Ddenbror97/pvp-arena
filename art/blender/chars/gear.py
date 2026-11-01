"""
Hard-surface tactical gear for the PvPStrike characters.

Police (CT tactical operator): plate carrier (front/back plates, cummerbund, shoulder straps),
three rifle-mag pouches, radio with antenna, POLICE patches front and back, duty belt with
buckle, drop holster on the right thigh, knee pads. Head kit: high-cut ballistic helmet with
side rails and NVG shroud, comms headset, wrap eyewear.

Terrorist (urban insurgent): coyote chest rig with three tall AK mag pouches, H-harness,
belt with side pouches, knee-high nothing. The face covering (balaclava / shemagh) stays the
game's runtime head-wrap, so the head kit is empty.

Body pieces are built in world space on the A-pose (Blender metres, faces -Y). Head-kit pieces
are built in head-centre space with the face toward +Y, matching the realistic head GLB.
Returns (gear_objects [(obj, rigid_bone or None)], head_kit [obj]).
"""
import math
import numpy as np
import bpy, bmesh
from mathutils import Vector, Matrix

import body_sdf

_col = None


def _obj(name, bm, mat, bevel=0.0, segs=2):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    _col.objects.link(o)
    me.materials.append(mat)
    if bevel:
        m = o.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = segs
        m.limit_method = "ANGLE"
    w = o.modifiers.new("wn", "WEIGHTED_NORMAL")
    w.keep_sharp = True
    bpy.context.view_layer.objects.active = o
    for mod in list(o.modifiers):
        with bpy.context.temp_override(object=o):
            bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in me.polygons:
        p.use_smooth = True
    _uv(o)
    return o


def _uv(o):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.01)
    bpy.ops.object.mode_set(mode="OBJECT")
    o.select_set(False)


def box(name, c, size, mat, bevel=0.006, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if rot is not None:
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=rot, verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(c), verts=bm.verts)
    return _obj(name, bm, mat, bevel, 3)


def cyl(name, a, b, r, mat, segs=16, bevel=0.0):
    a, b = Vector(a), Vector(b)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=(b - a).length)
    q = (b - a).to_track_quat("Z", "Y").to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation((a + b) / 2) @ q, verts=bm.verts)
    return _obj(name, bm, mat, bevel)


def _torso_section(z, role, off, n=48, sx=1.0):
    """Points around the torso superellipse at height z, pushed outward by `off`."""
    prof = body_sdf.STYLES[role]["torso"]
    zs, a, b, c = (np.array(v) for v in zip(*prof))
    A, B, C = np.interp(z, zs, a) * sx + off, np.interp(z, zs, b) + off, np.interp(z, zs, c)
    e = 2 / 2.4
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        ct, st = math.cos(t), math.sin(t)
        pts.append((A * math.copysign(abs(ct) ** e, ct), C + B * math.copysign(abs(st) ** e, st), z))
    return pts


def band(name, role, z0, z1, off, thick, mat, keep=None, n=48, sx=1.0):
    """A strap or cummerbund wrapped round the torso between z0 and z1 (keep filters the arc)."""
    bm = bmesh.new()
    rings = []
    for z in (z0, z1):
        for o in (off, off + thick):
            rings.append([bm.verts.new(p) for p in _torso_section(z, role, o, n, sx)])
    lo_in, lo_out, hi_in, hi_out = rings
    idx = [i for i in range(n) if keep is None or keep(i / n * 2 * math.pi)]
    for i in idx:
        j = (i + 1) % n
        if keep is not None and j not in idx:
            continue
        for r0, r1 in ((lo_out, hi_out), (hi_in, lo_in), (hi_out, hi_in), (lo_in, lo_out)):
            bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
    # Cap the cut ends of an open band.
    if keep is not None:
        for i in idx:
            for e in ((i - 1) % n, (i + 1) % n):
                if e not in idx:
                    vs = (lo_in[i], lo_out[i], hi_out[i], hi_in[i])
                    bm.faces.new(vs if e > i else vs[::-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj(name, bm, mat, 0.0)


def strip(name, pts, width, thick, mat):
    """A flat strap swept along a polyline; its width lies along the local sideways axis."""
    P = [Vector(p) for p in pts]
    bm = bmesh.new()
    rows = []
    for k, p in enumerate(P):
        t = (P[min(k + 1, len(P) - 1)] - P[max(k - 1, 0)]).normalized()
        side = Vector((1, 0, 0))
        side = (side - t * side.dot(t)).normalized()
        nrm = t.cross(side).normalized()
        rows.append([bm.verts.new(p + side * sw * width / 2 + nrm * nt * thick / 2)
                     for sw, nt in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    for a, b in zip(rows, rows[1:]):
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(rows[0][::-1])
    bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj(name, bm, mat, 0.0)


def plane(name, c, w, h, mat, normal_y=-1):
    """A patch quad facing ±Y with full 0..1 UVs (for printed textures)."""
    bm = bmesh.new()
    s = normal_y
    vs = [bm.verts.new((c[0] + x * w / 2 * -s, c[1], c[2] + z * h / 2)) for x, z in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    f = bm.faces.new(vs)
    uv = bm.loops.layers.uv.new()
    for loop, t in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        loop[uv].uv = t
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    if (f.normal.y > 0) != (s > 0):
        bmesh.ops.reverse_faces(bm, faces=[f])
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    _col.objects.link(o)
    me.materials.append(mat)
    return o


def front_y(z, role, x=0.0):
    prof = body_sdf.STYLES[role]["torso"]
    zs, a, b, c = (np.array(v) for v in zip(*prof))
    A, B, C = np.interp(z, zs, a), np.interp(z, zs, b), np.interp(z, zs, c)
    k = max(0.0, 1 - (abs(x) / A) ** 2.4) ** (1 / 2.4)
    return C - B * k, C + B * k  # front (−y), back (+y)


# ------------------------------------------------------------------------------------ police
def police(J, M):
    g = []
    R = "police"
    fz0, fz1 = 1.10, 1.40
    yf = min(front_y(z, R)[0] for z in np.linspace(fz0, fz1, 7))
    yb = max(front_y(z, R)[1] for z in np.linspace(fz0, fz1, 7))
    # Plates sit just proud of the shirt; carrier fabric over hard plates.
    g.append((box("carrier-front", (0, yf - 0.022, 1.255), (0.30, 0.04, 0.31), M["gear"], 0.012), "Spine2"))
    g.append((box("carrier-back", (0, yb + 0.022, 1.255), (0.30, 0.04, 0.32), M["gear"], 0.012), "Spine2"))
    keep = lambda t: abs(math.cos(t)) > 0.55  # sides only, plates cover front/back
    g.append((band("cummerbund", R, 1.08, 1.24, 0.006, 0.016, M["webbing"], keep), "Spine1"))
    for s in (1, -1):
        x = s * 0.105
        pts = [(x, yf - 0.02, 1.40), (x, yf + 0.01, 1.455), (x * 1.05, -0.03, 1.49),
               (x * 1.05, 0.03, 1.49), (x, yb - 0.01, 1.455), (x, yb + 0.02, 1.40)]
        g.append((strip(f"shoulder-strap-{s}", pts, 0.06, 0.012, M["webbing"]), "Spine2"))
    # Three rifle-mag pouches on the lower front plate, with elastic tops.
    for k, x in enumerate((-0.085, 0.0, 0.085)):
        g.append((box(f"mag-pouch-{k}", (x, yf - 0.062, 1.17), (0.072, 0.04, 0.13), M["gear"], 0.008), "Spine2"))
        g.append((box(f"mag-pouch-top-{k}", (x, yf - 0.064, 1.24), (0.074, 0.042, 0.018), M["webbing"], 0.004), "Spine2"))
        g.append((box(f"mag-{k}", (x, yf - 0.064, 1.257), (0.05, 0.028, 0.03), M["plastic"], 0.004), "Spine2"))
    # POLICE patches.
    g.append((plane("patch-front", (0, yf - 0.0425, 1.355), 0.17, 0.042, M["patch"], -1), "Spine2"))
    g.append((plane("patch-back", (0, yb + 0.0425, 1.31), 0.26, 0.065, M["patch"], 1), "Spine2"))
    # Radio on the left front shoulder of the carrier, with a whip antenna.
    rx, rz = 0.115, 1.33
    g.append((box("radio", (rx, yf - 0.05, rz), (0.05, 0.03, 0.09), M["plastic"], 0.006), "Spine2"))
    g.append((cyl("radio-antenna", (rx + 0.012, yf - 0.05, rz + 0.045), (rx + 0.018, yf - 0.045, rz + 0.17), 0.004, M["plastic"], 8), "Spine2"))
    g.append((box("radio-pouch", (rx, yf - 0.042, rz - 0.02), (0.058, 0.028, 0.07), M["gear"], 0.006), "Spine2"))
    # Duty belt with buckle.
    g.append((band("belt", R, 0.955, 1.0, 0.012, 0.012, M["webbing"]), "Hips"))
    y_belt = front_y(0.975, R)[0]
    g.append((box("belt-buckle", (0, y_belt - 0.028, 0.977), (0.06, 0.012, 0.04), M["metal"], 0.003), "Hips"))
    # Drop holster on the right thigh (character's right is -X).
    up = Vector(J["RightUpLeg"])
    kn = Vector(J["RightLeg"])
    hp = up.lerp(kn, 0.3) + Vector((-0.085, -0.01, 0))
    g.append((box("holster-strap", (hp.x + 0.01, hp.y, hp.z - 0.05), (0.02, 0.17, 0.03), M["webbing"], 0.004), "RightUpLeg"))
    g.append((box("holster", (hp.x - 0.012, hp.y, hp.z), (0.04, 0.07, 0.17), M["plastic"], 0.012), "RightUpLeg"))
    g.append((box("holster-grip", (hp.x - 0.012, hp.y + 0.01, hp.z + 0.11), (0.03, 0.035, 0.07), M["plastic"], 0.008), "RightUpLeg"))
    g.append((cyl("holster-drop", (hp.x - 0.012, hp.y, 0.99), (hp.x - 0.012, hp.y, hp.z + 0.08), 0.012, M["webbing"], 8), "RightUpLeg"))
    # Knee pads.
    for side in ("Left", "Right"):
        k = Vector(J[f"{side}Leg"])
        g.append((box(f"knee-pad-{side}", (k.x, k.y - 0.07, k.z + 0.01), (0.09, 0.03, 0.12), M["plastic"], 0.014), f"{side}Leg"))
        g.append((band_leg(f"knee-strap-{side}", k + Vector((0, -0.005, 0.055)), 0.072, M["webbing"]), f"{side}Leg"))
    return g


def band_leg(name, c, r, mat):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=20, radius1=r, radius2=r, depth=0.022)
    bmesh.ops.translate(bm, vec=Vector(c), verts=bm.verts)
    o = _obj(name, bm, mat)
    m = o.modifiers.new("solid", "SOLIDIFY")
    m.thickness = 0.006
    with bpy.context.temp_override(object=o):
        bpy.ops.object.modifier_apply(modifier="solid")
    return o


def police_head(M):
    """Head-centre space, face toward +Y. The CC0 head spans x ±0.09 (skull), y ±0.13, z -0.18..0.16."""
    kit = []
    # High-cut helmet: an ellipsoid shell cut above the ears and brow.
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=24, radius=1.0)
    bmesh.ops.scale(bm, vec=(0.122, 0.142, 0.13), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(0, -0.008, 0.05), verts=bm.verts)
    cut = [f for f in bm.faces if _helmet_cut(f.calc_center_median())]
    bmesh.ops.delete(bm, geom=cut, context="FACES")
    o = _obj("helmet", bm, M["helmet"])
    m = o.modifiers.new("solid", "SOLIDIFY")
    m.thickness = 0.012
    m.offset = 1
    bev = o.modifiers.new("bev", "BEVEL")
    bev.width = 0.003
    bev.segments = 2
    for mod in list(o.modifiers):
        with bpy.context.temp_override(object=o):
            bpy.ops.object.modifier_apply(modifier=mod.name)
    kit.append(o)
    # ARC side rails and NVG shroud.
    for s in (1, -1):
        kit.append(box(f"helmet-rail-{s}", (s * 0.124, -0.008, 0.062), (0.008, 0.12, 0.018), M["plastic"], 0.003,
                       Matrix.Rotation(math.radians(-8 * s), 3, "Y")))
    kit.append(box("nvg-shroud", (0, 0.147, 0.115), (0.05, 0.012, 0.04), M["metal"], 0.004,
                   Matrix.Rotation(math.radians(-18), 3, "X")))
    # Comms headset: ear cups with a low-profile band under the helmet.
    for s in (1, -1):
        kit.append(cyl(f"ear-cup-{s}", (s * 0.09, 0.0, 0.005), (s * 0.12, 0.0, 0.005), 0.036, M["plastic"], 24, 0.006))
        kit.append(cyl(f"ear-cup-ring-{s}", (s * 0.086, 0.0, 0.005), (s * 0.093, 0.0, 0.005), 0.038, M["webbing"], 24))
    kit.append(cyl("boom-mic", (-0.11, 0.03, -0.02), (-0.06, 0.11, -0.06), 0.004, M["plastic"], 8))
    kit.append(cyl("boom-mic-tip", (-0.064, 0.106, -0.057), (-0.054, 0.118, -0.064), 0.008, M["webbing"], 10))
    # Wrap eyewear in front of the eyes (eyes at y ≈ 0.10, z ≈ 0.032).
    # Two-lobe ballistic lenses on a wrap curve: flat top, rounded lens bottoms, nose notch.
    bm = bmesh.new()
    R, sx, nu, nv = 0.126, 0.84, 36, 6
    tmax = math.asin(0.09 / (R * sx))
    rows = []
    for i in range(nu + 1):
        t = -tmax + 2 * tmax * i / nu
        x, y = R * sx * math.sin(t), R * math.cos(t)
        ax = abs(x)
        if ax < 0.011:
            bot = 0.03 - 0.006 * (ax / 0.011)
        else:
            u = min(1.0, (ax - 0.011) / 0.079)
            bot = 0.024 - 0.016 * math.sin(math.pi * min(1.0, u * 1.15)) ** 0.7 + 0.012 * u ** 3
        top = 0.052 - 0.006 * (ax / 0.09) ** 2
        rows.append([bm.verts.new((x, y, bot + (top - bot) * j / nv)) for j in range(nv + 1)])
    for r0, r1 in zip(rows, rows[1:]):
        for j in range(nv):
            bm.faces.new((r0[j], r1[j], r1[j + 1], r0[j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _obj("eyewear-lens", bm, M["lens"])
    m = o.modifiers.new("solid", "SOLIDIFY")
    m.thickness = 0.003
    with bpy.context.temp_override(object=o):
        bpy.ops.object.modifier_apply(modifier="solid")
    kit.append(o)
    for s in (1, -1):
        kit.append(box(f"eyewear-arm-{s}", (s * 0.094, 0.02, 0.04), (0.005, 0.09, 0.007), M["plastic"], 0.002))
    return kit


def _helmet_cut(p):
    # Remove the lower part: high-cut over the ears, brim above the brow, deeper at the back.
    if p.z < -0.005:
        return True
    if p.y > 0.06 and p.z < 0.085 - (abs(p.x) * 0.25):
        return True  # brow line
    if abs(p.x) > 0.07 and p.z < 0.055 and p.y > -0.05:
        return True  # ear cut-outs
    return False


# ------------------------------------------------------------------------------------ terrorist
def terrorist(J, M):
    g = []
    R = "terrorist"
    yf = min(front_y(z, R)[0] for z in np.linspace(1.06, 1.24, 5))
    yb = max(front_y(z, R)[1] for z in np.linspace(1.10, 1.40, 7))
    # Chest rig panel with three tall AK mag pouches and two side utility pouches.
    g.append((box("rig-panel", (0, yf - 0.015, 1.15), (0.30, 0.025, 0.17), M["gear"], 0.008), "Spine1"))
    for k, x in enumerate((-0.075, 0.0, 0.075)):
        g.append((box(f"ak-pouch-{k}", (x, yf - 0.047, 1.15), (0.068, 0.042, 0.155), M["gear"], 0.009), "Spine1"))
        g.append((box(f"ak-pouch-flap-{k}", (x, yf - 0.07, 1.215), (0.07, 0.008, 0.045), M["webbing"], 0.003), "Spine1"))
    for s in (1, -1):
        g.append((box(f"utility-pouch-{s}", (s * 0.135, yf - 0.03, 1.13), (0.06, 0.04, 0.09), M["gear"], 0.009), "Spine1"))
    g.append((band("rig-waist", R, 1.075, 1.105, 0.008, 0.008, M["webbing"]), "Spine1"))
    # H-harness: two straps over the shoulders crossed by a back strap.
    for s in (1, -1):
        x = s * 0.10
        pts = [(x, yf - 0.012, 1.23), (x, -0.11, 1.38), (x * 1.08, -0.02, 1.48),
               (x * 1.08, 0.05, 1.47), (x, yb + 0.004, 1.36), (x, yb - 0.004, 1.11)]
        g.append((strip(f"harness-{s}", pts, 0.04, 0.009, M["webbing"]), "Spine2"))
    g.append((box("harness-back", (0, yb + 0.008, 1.27), (0.22, 0.01, 0.035), M["webbing"], 0.003), "Spine2"))
    # Belt with buckle and a dump pouch.
    g.append((band("belt", R, 0.96, 0.995, 0.012, 0.01, M["webbing"]), "Hips"))
    y_belt = front_y(0.978, R)[0]
    g.append((box("belt-buckle", (0, y_belt - 0.026, 0.978), (0.05, 0.01, 0.035), M["metal"], 0.003), "Hips"))
    g.append((box("hip-pouch", (0.17, -0.02, 0.93), (0.045, 0.09, 0.08), M["gear"], 0.01), "Hips"))
    return g


def build(role, J, palette, collection):
    global _col
    _col = collection
    J = {k: tuple(v) for k, v in J.items()}
    if role == "police":
        return police(J, palette), police_head(palette)
    return terrorist(J, palette), []
