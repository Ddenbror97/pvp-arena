"""
Grenades (HE · smoke · incendiary): the three models from the supplied "Game ready grenades set"
(Riskyerick, Sketchfab Standard licence), split into their moving parts, plus the first-person
control rig and clips (animate_grenades.py).

    python build_grenades.py -- <scene.gltf> <out.glb> [--blend grenades.blend] [--previews <dir>]

Only three of the pack's five grenades are used: RGD-5 (HE), M18 (smoke) and AN-M14 (incendiary,
"M14" in the pack). The F1 and the M84 are deleted on import and never exported.

Model space (glTF axes, metres, real size), per grenade:
- origin on the body's axis at the bottom, +Y up the grenade (fuse on top);
- the safety lever (spoon) on +X: the right palm closes over it;
- the pull ring on the -Z side ... wherever the source puts it relative to the lever (recorded in
  the metadata as `ring`).

Nodes per grenade `<t>` (he, smoke, fire):
- `GR_<t>`: the model root. Children:
  - `GR_<t>_Body`: everything that never moves (one mesh, the pack's material).
  - `GR_<t>_Lever` (empty at the lever's hinge) → `GR_<t>_LeverMesh`.
  - `GR_<t>_Pin` (empty at the pin's centre, local +X along the pull) → `GR_<t>_PinMesh`
    (the split pin and the pull ring: they come out together).
  - `GR_<t>_Grip`: where the right palm's centre sits (on the lever) and how the hand is turned
    (local +X along the hand, wrist → knuckles; local +Y out of the palm).
  - `GR_<t>_Ring`: the point on the ring the left thumb and index finger pinch.

Parts are identified by their loose-part signature (vertex count + bounds centre in the source,
parts.json), chosen by eye from colour-coded renders; tiny parts lying on a chosen part follow it.
"""
import bpy, bmesh, json, math, os, sys
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree

argv = sys.argv[sys.argv.index("--") + 1 :]
SRC, OUT = argv[0], argv[1]
BLEND = argv[argv.index("--blend") + 1] if "--blend" in argv else None
PREVIEWS = argv[argv.index("--previews") + 1] if "--previews" in argv else None
HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = json.load(open(os.path.join(HERE, "parts.json")))
TYPES = {"he": "RGD-5", "smoke": "M18", "fire": "M14"}
NAMES = {"he": "RGD-5 (HE)", "smoke": "M18 (smoke)", "fire": "AN-M14 (incendiary)"}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
scene = bpy.context.scene

def mesh_of(prefix):
    for o in bpy.data.objects:
        if o.type == "MESH" and o.name.startswith(prefix):
            return o
    raise SystemExit(f"missing {prefix}")

sources = {t: mesh_of(name) for t, name in TYPES.items()}
# Everything else (F1, M84, the importer's empties) goes.
for o in list(bpy.data.objects):
    if o not in sources.values():
        bpy.data.objects.remove(o)
for o in sources.values():
    world = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = world
    o.data.transform(world)
    o.matrix_world = Matrix.Identity(4)

def separate(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    return [o for o in bpy.context.selected_objects]

def bounds(obj):
    vs = [v.co for v in obj.data.vertices]
    lo = Vector([min(v[i] for v in vs) for i in range(3)])
    hi = Vector([max(v[i] for v in vs) for i in range(3)])
    return lo, hi

def signature(obj):
    lo, hi = bounds(obj)
    return len(obj.data.vertices), (lo + hi) / 2

def pick(parts, sigs, offset=Vector(), rotate=None):
    """The part matching each signature (same vertex count, nearest bounds centre)."""
    out = []
    for n, *c in sigs:
        want = Vector(c)
        if rotate:
            want = rotate(want)
        want = want + offset
        best = min(
            (p for p in parts if len(p.data.vertices) == n and p not in out),
            key=lambda p: (signature(p)[1] - want).length,
        )
        if (signature(best)[1] - want).length > 0.006:
            raise SystemExit(f"no part for signature {n} {c}")
        out.append(best)
    return out

def followers(parts, group, taken, reach=0.0012):
    """Small parts lying entirely on the group's surface (rivets, edges) follow it."""
    verts = [v.co for g in group for v in g.data.vertices]
    tree = KDTree(len(verts))
    for i, v in enumerate(verts):
        tree.insert(v, i)
    tree.balance()
    extra = []
    for p in parts:
        if p in taken or p in group or len(p.data.vertices) > 120:
            continue
        if all(tree.find(v.co)[2] < reach for v in p.data.vertices):
            extra.append(p)
    return extra

def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    out = bpy.context.view_layer.objects.active
    out.name = out.data.name = name
    return out

def g2b(v):
    v = Vector(v)
    return Vector((v.x, -v.z, v.y))

def gltf_matrix(pos, axes, scale=1.0):
    """Blender local matrix for a node whose glTF local axes are `axes` (x, y, z) at glTF `pos`."""
    x, y, z = (Vector(a).normalized() for a in axes)
    bx, bz, by = g2b(x), g2b(y), -g2b(z)
    m = Matrix((bx, by, bz)).transposed().to_4x4() @ Matrix.Scale(scale, 4)
    m.translation = g2b(pos)
    return m

def b2g(v):
    v = Vector(v)
    return [round(v.x, 5), round(v.z, 5), round(-v.y, 5)]

models = {}
reference = None
for t, name in TYPES.items():
    parts = separate(sources[t])
    # The body's axis: the centre of the widest parts' bounds (the round body).
    allv = [v.co for p in parts for v in p.data.vertices]
    lo = Vector([min(v[i] for v in allv) for i in range(3)])
    hi = Vector([max(v[i] for v in allv) for i in range(3)])
    body_parts = sorted(parts, key=lambda p: -(bounds(p)[1] - bounds(p)[0]).xy.length)[:3]
    axis = sum(((bounds(p)[0] + bounds(p)[1]) / 2 for p in body_parts), Vector()) / 3
    axis.z = lo.z
    if name in PARTS:
        ring = pick(parts, PARTS[name]["ring"])
        pin = pick(parts, PARTS[name]["pin"])
        lever = pick(parts, PARTS[name]["lever"])
        if name == "M18":
            reference = {"axis": axis.copy(), "ring": PARTS[name]}
    else:
        # The AN-M14 shares the M18's geometry, turned slightly: map the M18's choices by the
        # ring's direction about the axis.
        ref = reference
        big_ring = max(parts, key=lambda p: len(p.data.vertices))
        ring_c = signature(big_ring)[1] - axis
        ref_ring = Vector(ref["ring"]["ring"][0][1:]) - ref["axis"]
        angle = math.atan2(ring_c.y, ring_c.x) - math.atan2(ref_ring.y, ref_ring.x)
        rot = Matrix.Rotation(angle, 3, "Z")
        turn = lambda c: rot @ (c - ref["axis"])
        ring = pick(parts, ref["ring"]["ring"], axis, turn)
        pin = pick(parts, ref["ring"]["pin"], axis, turn)
        lever = pick(parts, ref["ring"]["lever"], axis, turn)
    taken = set(ring + pin + lever)
    pin_all = ring + pin + followers(parts, ring + pin, taken)
    taken |= set(pin_all)
    lever_all = lever + followers(parts, lever, taken)
    taken |= set(lever_all)
    body = [p for p in parts if p not in taken]

    # Directions about the axis (source space): lever → +X; ring direction kept for the record.
    def centre(group):
        vs = [v.co for g in group for v in g.data.vertices]
        return sum(vs, Vector()) / len(vs)
    lever_dir = centre(lever_all) - axis
    lever_dir.z = 0
    turn = Matrix.Rotation(-math.atan2(lever_dir.y, lever_dir.x), 4, "Z")
    to_model = turn @ Matrix.Translation(-axis)
    for p in parts:
        p.data.transform(to_model)
        p.data.update()
    pin_obj = join(pin_all, f"GR_{t}_PinMesh")
    lever_obj = join(lever_all, f"GR_{t}_LeverMesh")
    body_obj = join(body, f"GR_{t}_Body")
    for o in (pin_obj, lever_obj, body_obj):
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.ops.object.material_slot_remove_unused()

    blo, bhi = bounds(body_obj)
    radius = max(bhi.x, -blo.x, bhi.y, -blo.y)
    # Body radius at the grip height (the widest band of the lower body).
    grip_h = blo.z + (bhi.z - blo.z) * (0.42 if t == "he" else 0.45)
    # (A cylinder has no vertices mid-height: then its side's radius.)
    band = [v.co for v in body_obj.data.vertices if abs(v.co.z - grip_h) < 0.008]
    side = [v.co for v in body_obj.data.vertices if v.co.z < blo.z + (bhi.z - blo.z) * 0.8]
    grip_r = max(math.hypot(v.x, v.y) for v in (band or side))
    plo, phi = bounds(pin_obj)
    ring_c = centre([pin_obj])
    # The pin is pulled out horizontally toward the ring.
    pull = Vector((ring_c.x, ring_c.y, 0)).normalized()
    pin_pivot = Vector((0, 0, ring_c.z))  # on the axis, at the ring's height
    pin_len = max((v.co - pin_pivot).dot(pull) for v in pin_obj.data.vertices) - min(
        (v.co - pin_pivot).dot(pull) for v in pin_obj.data.vertices
    )
    llo, lhi = bounds(lever_obj)
    hinge = Vector((max(v.co.x for v in lever_obj.data.vertices if v.co.z > lhi.z - 0.006), 0, lhi.z - 0.003))

    root = bpy.data.objects.new(f"GR_{t}", None)
    scene.collection.objects.link(root)
    pin_node = bpy.data.objects.new(f"GR_{t}_Pin", None)
    lever_node = bpy.data.objects.new(f"GR_{t}_Lever", None)
    grip = bpy.data.objects.new(f"GR_{t}_Grip", None)
    pinch = bpy.data.objects.new(f"GR_{t}_Ring", None)
    for e in (pin_node, lever_node, grip, pinch):
        e.empty_display_size = 0.01
        scene.collection.objects.link(e)
        e.parent = root
    body_obj.parent = root
    # Pin node: at the pivot, local +X along the pull (Blender: rotate so +X = pull).
    pin_node.matrix_basis = Matrix.Translation(pin_pivot) @ Matrix.Rotation(math.atan2(pull.y, pull.x), 4, "Z")
    pin_obj.data.transform(pin_node.matrix_basis.inverted())
    pin_obj.parent = pin_node
    lever_node.matrix_basis = Matrix.Translation(hinge)
    lever_obj.data.transform(lever_node.matrix_basis.inverted())
    lever_obj.parent = lever_node
    # Right palm on the lever side at the grip height (glTF model space): the hand axis forward
    # (-Z), the palm facing the axis (-X), the knuckles' line up the grenade (+Y).
    grip_at = Vector((grip_r + 0.002, 0, grip_h))
    grip.matrix_basis = gltf_matrix(b2g(grip_at), ((0, 0, -1), (-1, 0, 0), (0, 1, 0)))
    # The ring's pinch point: its outermost point along the pull, at the ring's centre height.
    far = max(pin_obj.data.vertices, key=lambda v: (pin_node.matrix_basis @ v.co).dot(pull))
    pinch_at = pin_node.matrix_basis @ far.co
    pinch_at = Vector((pinch_at.x, pinch_at.y, ring_c.z))
    pinch.matrix_basis = Matrix.Translation(pinch_at)
    models[t] = {
        "name": NAMES[t],
        "height": round(bhi.z - blo.z, 5),
        "radius": round(radius, 5),
        "gripRadius": round(grip_r, 5),
        "gripHeight": round(grip_h, 5),
        "grip": b2g(grip_at),
        "pinch": b2g(pinch_at),
        "ringCentre": b2g(ring_c),
        "pull": b2g(pull),
        "pinLength": round(pin_len, 5),
        "pinPivot": b2g(pin_pivot),
        "hinge": b2g(hinge),
        "tris": {o.name: sum(len(f.vertices) - 2 for f in o.data.polygons) for o in (body_obj, pin_obj, lever_obj)},
        "_grip_at": grip_at,
        "_root": root,
        "_grip": grip,
        "_pinch": pinch,
        "_pin": pin_node,
    }
    print("GRENADE", t, {k: v for k, v in models[t].items() if not k.startswith("_")})

# ---------------------------------------------------------------- materials
# Keep the pack's PBR materials (base colour, metal/rough, normal); name them per grenade.
for t in TYPES:
    for o in (bpy.data.objects[f"GR_{t}_Body"], bpy.data.objects[f"GR_{t}_PinMesh"], bpy.data.objects[f"GR_{t}_LeverMesh"]):
        for m in o.data.materials:
            if m and not m.name.startswith("GR_"):
                m.name = f"GR_{t}"

model_meta = {t: {k: v for k, v in m.items() if not k.startswith("_")} for t, m in models.items()}

# ---------------------------------------------------------------- rig, clips, cameras, export
sys.path.insert(0, HERE)
import animate_grenades  # noqa: E402

animate_grenades.build(scene, models, model_meta)
if PREVIEWS:
    animate_grenades.render_previews(scene, models, PREVIEWS)
if BLEND:
    # Keep the source file light: 512 px textures packed in (the game uses 512 px anyway).
    for image in bpy.data.images:
        if image.size[0] > 512:
            image.scale(512, 512)
        image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND), compress=True)
bpy.ops.object.select_all(action="DESELECT")
bpy.ops.export_scene.gltf(
    filepath=os.path.abspath(OUT),
    export_format="GLB",
    export_animations=True,
    export_animation_mode="NLA_TRACKS",
    export_force_sampling=True,
    export_optimize_animation_size=False,
    export_optimize_animation_keep_anim_object=True,
    export_extras=True,
    export_cameras=False,
    export_lights=False,
    export_apply=False,
)
print("exported", OUT)
