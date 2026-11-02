"""
CROSSFIRE crash-site wreck from the Mi-8 model in source/mi8 (CC BY 4.0, see source/README.md).

Imported by crossfire_kit.py. The model is reshaped into the wreck the gameplay solids describe
(layout.py: heli-*), never the other way round for its outline:
  * landing gear, weapon pylons/pods, rotor blur discs and the long main-rotor blades removed;
  * scaled 3x (11 m fuselage), nose west (-x), belly sunk 0.25 m into the square (it crashed on
    its belly);
  * the flank door and window slits cut with exact booleans at the collision openings, the hull
    given an inner skin (solidify, dark interior) so the cabin reads from inside and the cut
    edges show torn metal thickness;
  * a cabin floor plate and the cargo bulkhead (inside its gameplay box);
  * the tail boom broken into the two pieces lying in the square (heli-tail-a / heli-tail-b),
    the fin and tail rotor thrown onto the terminal tower roof (above reach).
Everything below 2.9 m inside the playable rectangle is checked to stay within 6 cm of the
heli-* solids (except flat ground debris <= 0.16 m), like the rest of the map.
"""
import math, os
import bpy, bmesh
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "source", "mi8", "scene.gltf")
SCALE = 3.0
SINK = 0.25


def _bb(o):
    vs = [o.matrix_world @ v.co for v in o.data.vertices]
    return [min(v[i] for v in vs) for i in range(3)], [max(v[i] for v in vs) for i in range(3)]


def _join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    objs[0].name = name
    return objs[0]


def _apply(o):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def material(tex_dir):
    m = bpy.data.materials.get("mi8")
    if m:
        return m
    m = bpy.data.materials.new("mi8")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    col = nt.nodes.new("ShaderNodeTexImage")
    col.image = bpy.data.images.load(os.path.join(tex_dir, "mi8.png"), check_existing=True)
    rough = nt.nodes.new("ShaderNodeTexImage")
    rough.image = bpy.data.images.load(os.path.join(tex_dir, "mi8_r.png"), check_existing=True)
    rough.image.colorspace_settings.name = "Non-Color"
    nt.links.new(col.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(rough.outputs["Color"], b.inputs["Roughness"])
    b.inputs["Metallic"].default_value = 0.35
    return m


def inner_material():
    m = bpy.data.materials.get("mi8-inner")
    if m:
        return m
    m = bpy.data.materials.new("mi8-inner")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.11, 0.115, 0.1, 1)
    b.inputs["Roughness"].default_value = 0.7
    b.inputs["Metallic"].default_value = 0.4
    return m


def load_parts():
    """Import the Mi-8 and split it into body / tail / dropped parts (model space, metres)."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=SRC)
    new = [o for o in bpy.data.objects if o not in before]
    for o in [o for o in new if o.type == "MESH" and ("blur" in o.name or "blade_spin" in o.name)]:
        bpy.data.objects.remove(o)
    meshes = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    for o in meshes:
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
        _apply(o)
    for o in [o for o in bpy.data.objects if o not in before and o.type != "MESH"]:
        bpy.data.objects.remove(o)
    glass = next(o for o in meshes if "window" in o.name)
    main = next(o for o in meshes if "desert" in o.name)
    bpy.ops.object.select_all(action="DESELECT")
    main.select_set(True)
    bpy.context.view_layer.objects.active = main
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    parts = list(bpy.context.selected_objects)
    hull = max(parts, key=lambda o: len(o.data.polygons))
    hmn, hmx = _bb(hull)
    width = max(abs(hmn[1]), abs(hmx[1]))
    body, tail, fin = [], [], []
    for o in parts:
        mn, mx = _bb(o)
        span = [mx[i] - mn[i] for i in range(3)]
        cx = (mn[0] + mx[0]) / 2
        above = mn[2] > hmx[2] - 0.1
        rotor = above and (((span[0] > 0.9 or span[1] > 0.9) and (span[2] < 0.25 or max(span[0], span[1]) > 1.5))
                           or (span[2] < 0.12 and max(span[0], span[1]) > 0.5))  # blade segments
        gear = mn[2] < hmn[2] - 0.04
        lateral = max(abs(mn[1]), abs(mx[1])) > width * 1.1
        if rotor or gear or lateral:
            bpy.data.objects.remove(o)
        elif cx < -3.76:
            fin.append(o)
        elif cx < hmn[0] - 0.05:
            tail.append(o)
        else:
            body.append(o)
    return _join(body, "mi8-body"), _join(tail, "mi8-boom"), _join(fin, "mi8-fin"), glass, (hmn, hmx)


def place(o, M):
    o.data.transform(M)
    o.data.update()


def cut(o, game_boxes, to_blender):
    """Boolean-difference game-space boxes (x0, x1, y0, y1, z0, z1) out of `o`."""
    for i, (x0, x1, y0, y1, z0, z1) in enumerate(game_boxes):
        bpy.ops.mesh.primitive_cube_add(size=1)
        c = bpy.context.active_object
        c.name = f"cutter-{i}"
        a, b = Vector(to_blender(x0, y0, z0)), Vector(to_blender(x1, y1, z1))
        c.location = (a + b) / 2
        c.scale = (abs(b.x - a.x), abs(b.y - a.y), abs(b.z - a.z))
        mod = o.modifiers.new(f"cut-{i}", "BOOLEAN")
        mod.operation = "DIFFERENCE"
        mod.solver = "EXACT"
        mod.use_hole_tolerant = True
        mod.object = c
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(c)
        # The hull is an open surface, so the solver caps it with the cutter's faces; drop those
        # (faces lying on a cutter plane inside its rectangle) to leave a clean opening.
        lo = [min(a[k], b[k]) for k in range(3)]
        hi = [max(a[k], b[k]) for k in range(3)]
        bm = bmesh.new()
        bm.from_mesh(o.data)
        caps = []
        for f in bm.faces:
            vs = [v.co for v in f.verts]
            for k in range(3):
                for plane in (lo[k], hi[k]):
                    if all(abs(v[k] - plane) < 2e-3 for v in vs) and all(
                            lo[j] - 2e-3 <= v[j] <= hi[j] + 2e-3 for v in vs for j in range(3) if j != k):
                        caps.append(f)
                        break
                else:
                    continue
                break
        bmesh.ops.delete(bm, geom=caps, context="FACES")
        bm.to_mesh(o.data)
        bm.free()


def skin(o, inner):
    """Inner skin (solidify inward) with the dark interior material on the inside faces."""
    o.data.materials.append(inner)
    mod = o.modifiers.new("skin", "SOLIDIFY")
    mod.thickness = 0.045
    mod.offset = -1.0
    mod.use_flip_normals = False
    mod.material_offset = 1
    mod.material_offset_rim = 1
    mod.use_rim = True
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=mod.name)


def build(L, section, to_blender, tex_dir, steel):
    """Create the wreck objects in their culling sections; returns validation violations."""
    body, boom, fin, glass, (hmn, hmx) = load_parts()
    mat, inner = material(tex_dir), inner_material()
    for o in (body, boom, fin):
        o.data.materials.clear()
        o.data.materials.append(mat)
    glass.data.materials.clear()
    glass.data.materials.append(bpy.data.materials.get("glass") or inner)
    xc = (hmn[0] + hmx[0]) / 2
    # Model space -> Blender scene: centre the hull on x, belly at -SINK, scale, nose to -x.
    M = (Matrix.Translation((0, 0, -SINK)) @ Matrix.Rotation(math.pi, 4, "Z") @ Matrix.Scale(SCALE, 4)
         @ Matrix.Translation((-xc, 0, -hmn[2])))
    for o in (body, glass):
        place(o, M)
    solids = {s["id"]: s for s in L["solids"]}
    body = prune(L, body)
    # Openings at the collision gaps: the flank doors and window slits (game coordinates).
    lower, shoulder = solids["heli-wall-n2-0-a"], solids["heli-wall-n2-1-a"]
    zn = lower["z"] - lower["d"] / 2  # outer north face
    zi = shoulder["z"] + shoulder["d"] / 2  # cabin side of the shoulder layer
    door_x = (solids["heli-wall-n2-0-a"]["x"] + lower["w"] / 2, solids["heli-wall-n3-0-a"]["x"] - solids["heli-wall-n3-0-a"]["w"] / 2)
    slit_b, slit_t = solids["heli-slit-n-0-a"], solids["heli-slit-n-1-a"]
    slit_x = (slit_b["x"] - slit_b["w"] / 2, slit_b["x"] + slit_b["w"] / 2)
    door = (door_x[0], door_x[1], 0.02, shoulder["y"] + shoulder["h"] / 2, zn - 0.4, zi + 0.1)
    slit = (slit_x[0], slit_x[1], slit_b["y"] + slit_b["h"] / 2, slit_t["y"] - slit_t["h"] / 2, zn - 0.4, zi + 0.1)
    twin = lambda b: (-b[1], -b[0], b[2], b[3], -b[5], -b[4])
    cut(body, [door, twin(door), slit, twin(slit)], to_blender)
    skin(body, inner)
    # Tail boom: two segments lying in the heli-tail boxes, ends torn open.
    segs = []
    bmn, bmx = _bb(boom)
    mid = (bmn[0] + bmx[0]) / 2
    for i, (lo, hi) in enumerate(((bmn[0], mid), (mid, bmx[0] + 0.001))):
        seg = boom.copy()
        seg.data = boom.data.copy()
        bpy.context.scene.collection.objects.link(seg)
        bm = bmesh.new()
        bm.from_mesh(seg.data)
        for co, sign in ((lo, 1), (hi, -1)):
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(co, 0, 0),
                                   plane_no=(sign, 0, 0), clear_outer=False, clear_inner=True)
        bm.to_mesh(seg.data)
        bm.free()
        segs.append(seg)
    bpy.data.objects.remove(boom)
    for seg, sid, yaw in ((segs[0], "heli-tail-a", 0.03), (segs[1], "heli-tail-b", math.pi - 0.04)):
        s = solids[sid]
        smn, smx = _bb(seg)
        c = Vector(((smn[0] + smx[0]) / 2, (smn[1] + smx[1]) / 2, smn[2]))
        length = smx[0] - smn[0]
        k = min(SCALE, (s["w"] - 0.1) / length, (s["h"] - 0.05) / max(0.01, smx[2] - smn[2]), (s["d"] - 0.1) / max(0.01, smx[1] - smn[1]))
        T = (Matrix.Translation(Vector(to_blender(s["x"], 0.0, s["z"]))) @ Matrix.Rotation(yaw, 4, "Z")
             @ Matrix.Scale(k, 4) @ Matrix.Translation(-c))
        place(seg, T)
        skin(seg, inner)
        seg.name = f"mi8-{sid}"
    # Fin and tail rotor: wedged into the terminal tower roof (above reach).
    tower = solids["tower-b"]
    fmn, fmx = _bb(fin)
    c = Vector(((fmn[0] + fmx[0]) / 2, (fmn[1] + fmx[1]) / 2, fmn[2]))
    top = tower["y"] + tower["h"] / 2
    T = (Matrix.Translation(Vector(to_blender(tower["x"] - 1.0, top - 0.4, tower["z"] + 0.6)))
         @ Matrix.Rotation(0.5, 4, "X") @ Matrix.Rotation(2.3, 4, "Z") @ Matrix.Scale(SCALE, 4) @ Matrix.Translation(-c))
    place(fin, T)
    # Cabin floor plate and the cargo bulkhead (both inside their gameplay boxes).
    bm = bmesh.new()
    def cube(x0, x1, y0, y1, z0, z1):
        a, b = to_blender(x0, y0, z0), to_blender(x1, y1, z1)
        lo = [min(a[i], b[i]) for i in range(3)]
        hi = [max(a[i], b[i]) for i in range(3)]
        r = bmesh.ops.create_cube(bm, size=1)["verts"]
        for v in r:
            v.co = Vector([lo[i] + (hi[i] - lo[i]) * (v.co[i] + 0.5) for i in range(3)])
    cab = solids["heli-roof"]["w"] / 2
    cube(-cab, cab, 0.0, 0.05, -1.34, 1.34)
    bh = solids["heli-bulkhead"]
    bx0, bx1, bz0, bz1 = bh["x"] - bh["w"] / 2, bh["x"] + bh["w"] / 2, bh["z"] - bh["d"] / 2, bh["z"] + bh["d"] / 2
    for x in (bx0, bx1 - 0.08):
        cube(x, x + 0.08, 0.0, bh["h"], bz0, bz1)
    cube(bx0 + 0.08, bx1 - 0.08, 0.05, 1.1, bz0 + 0.02, bz1 - 0.02)
    cube(bx0 + 0.08, bx1 - 0.08, 1.1, 1.14, bz0, bz1)
    cube(bx0 + 0.15, bx1 - 0.15, 1.14, 1.8, bz0 + 0.03, bz1 - 0.03)
    me = bpy.data.meshes.new("mi8-cabin")
    bm.to_mesh(me)
    bm.free()
    cabin = bpy.data.objects.new("mi8-cabin", me)
    me.materials.append(steel)
    bpy.context.scene.collection.objects.link(cabin)
    objs = {"centre-mid": [body, glass, cabin], "details": [segs[0], segs[1]], "background": [fin]}
    for sec, os_ in objs.items():
        for o in os_:
            for c in o.users_collection:
                c.objects.unlink(o)
            section(sec).objects.link(o)
            o["noSplit"] = True
    return validate(L, [body, glass, cabin, segs[0], segs[1]], to_blender)


def _outside(L, x, y, z, tol=0.06):
    hw, hd = L["arena"]["width"] / 2, L["arena"]["depth"] / 2
    if y > 2.9 or y <= 0.16 or abs(x) > hw or abs(z) > hd:
        return False
    return not any(abs(x - b["x"]) <= b["w"] / 2 + tol and abs(z - b["z"]) <= b["d"] / 2 + tol
                   and b["y"] - b["h"] / 2 - tol <= y <= b["y"] + b["h"] / 2 + tol
                   for b in L["solids"] if b["id"].startswith(("heli-", "rotor-")))


def prune(L, body):
    """Drop the model's loose parts that would stand outside the wreck's collision below 2.9 m
    (cockpit/cabin fittings, seats, aerials): they would be cover players walk through."""
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    parts = list(bpy.context.selected_objects)
    hull = max(parts, key=lambda o: len(o.data.polygons))
    keep, dropped = [], 0
    for o in parts:
        vs = [o.matrix_world @ v.co for v in o.data.vertices]
        out = sum(1 for p in vs if _outside(L, p.x, p.z, -p.y))
        if o is not hull and out > 0:
            bpy.data.objects.remove(o)
            dropped += 1
        else:
            keep.append(o)
    print(f"HELI PRUNE: dropped {dropped} of {len(parts)} loose parts")
    return _join([hull] + [o for o in keep if o is not hull], "mi8-body")


def validate(L, objs, to_blender):
    """Vertices below 2.9 m inside the arena must lie within 6 cm of a heli solid (or be flat debris)."""
    boxes = [s for s in L["solids"] if s["id"].startswith(("heli-", "rotor-"))]
    hw, hd = L["arena"]["width"] / 2, L["arena"]["depth"] / 2
    bad = []
    for o in objs:
        for v in o.data.vertices:
            p = o.matrix_world @ v.co
            x, y, z = p.x, p.z, -p.y  # Blender -> game
            if y > 2.9 or y <= 0.16 or abs(x) > hw or abs(z) > hd:
                continue
            if not any(abs(x - b["x"]) <= b["w"] / 2 + 0.06 and abs(z - b["z"]) <= b["d"] / 2 + 0.06
                       and b["y"] - b["h"] / 2 - 0.06 <= y <= b["y"] + b["h"] / 2 + 0.06 for b in boxes):
                bad.append((o.name, round(x, 2), round(y, 2), round(z, 2)))
    print(f"HELI VALIDATE: {len(bad)} vertices outside the heli solids", bad[:8])
    if bad:
        import collections
        print("HELI BAD BY X", sorted(collections.Counter((b[0], round(b[1])) for b in bad).items()))
    return bad
