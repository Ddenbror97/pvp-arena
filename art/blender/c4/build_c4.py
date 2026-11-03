"""
C4 device for Bomb Defusal: the first-person plant (Terrorist) and defuse (Police) prop and the
planted bomb in the world. One model, built from the supplied download (see README.md).

    python build_c4.py -- <scene.gltf> <out.glb> [--blend c4.blend] [--previews <dir>]

Model (device space, glTF axes, metres, real size): +X right, +Y top (the LED / screen end),
+Z out of the keypad face. The origin is the centre of the back face, so a planted bomb's origin
sits on the ground.

- The source is a skinned model; it is posed (rest), un-skinned and split into static parts.
- `C4_Body`: everything that never moves, one mesh, one primitive per material.
- `C4_Keys`: the twelve keypad buttons (lit caps and rubber bodies), with one morph target per
  key (`press_1` … `press_hash`) that pushes that key KEY_TRAVEL into the keypad. The game
  drives them from the fingertip, so a key goes down only while a finger is on it.
- `C4_Screen`: a quad over the LCD window with UVs 0–1 upright; the game draws the display
  into a canvas texture.
- `C4_LedsOn`: the lit indicator LEDs (shown when armed / blinking); the unlit LEDs are in the
  body underneath.
- `C4_Key_<k>` empties: each key's cap-top centre, and `C4_Screen` bounds, for the game.

The control rig and clips are added by animate_c4.py (imported at the end).
"""
import bpy, bmesh, json, math, os, sys
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1 :]
SRC, OUT = argv[0], argv[1]
BLEND = argv[argv.index("--blend") + 1] if "--blend" in argv else None
PREVIEWS = argv[argv.index("--previews") + 1] if "--previews" in argv else None

KEY_TRAVEL = 0.0012
KEYS = {
    "1": "button1", "2": "button2", "3": "button3",
    "4": "button4", "5": "button5", "6": "button6",
    "7": "button7", "8": "button8", "9": "button9",
    "star": "buttonast", "0": "button0", "hash": "buttonhash",
}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
scene = bpy.context.scene

# ---------------------------------------------------------------- un-skin into static meshes
for obj in list(bpy.data.objects):
    if obj.type == "MESH" and not (obj.parent and obj.parent.type == "ARMATURE"):
        bpy.data.objects.remove(obj)  # stray helper (Icosphere)
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
dominant = {}
for obj in meshes:
    names = {g.index: g.name for g in obj.vertex_groups}
    dominant[obj.name] = [
        names[max(v.groups, key=lambda g: g.weight).group] if v.groups else "" for v in obj.data.vertices
    ]
    bpy.context.view_layer.objects.active = obj
    for mod in list(obj.modifiers):
        if mod.type == "ARMATURE":
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            bpy.ops.object.modifier_apply(modifier=mod.name)
    world = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = world
for obj in list(bpy.data.objects):
    if obj.type != "MESH":
        bpy.data.objects.remove(obj)

# Device space: right = -src x, top = -src y, face = +src z (Blender: face is -Y, top +Z).
lo = Vector((min(min((o.matrix_world @ Vector(c))[i] for c in o.bound_box) for o in meshes) for i in range(3)))
hi = Vector((max(max((o.matrix_world @ Vector(c))[i] for c in o.bound_box) for o in meshes) for i in range(3)))
centre = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
to_device = Matrix(((-1, 0, 0, 0), (0, 0, -1, 0), (0, -1, 0, 0), (0, 0, 0, 1))) @ Matrix.Translation(-centre)
for obj in meshes:
    obj.data.transform(to_device @ obj.matrix_world)
    obj.matrix_world = Matrix.Identity(4)
    obj.data.update()
FACE = Vector((0, -1, 0))  # Blender direction out of the keypad face

# ---------------------------------------------------------------- materials
def simplify(material):
    """Drop the specular map (KHR_materials_specular → physical shader program); keep PBR maps."""
    if not material or not material.use_nodes:
        return
    tree = material.node_tree
    for node in tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            for name in ("Specular IOR Level", "Specular Tint"):
                socket = node.inputs.get(name)
                if socket:
                    for link in list(socket.links):
                        tree.links.remove(link)
            node.inputs["Specular IOR Level"].default_value = 0.5
for material in bpy.data.materials:
    simplify(material)

# ---------------------------------------------------------------- split by part
def split(obj, keep):
    """Move the faces whose vertices all satisfy keep(vertex index) into a new object."""
    groups = dominant[obj.name]
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(obj.data)
    for f in bm.faces:
        f.select = all(keep(groups[v.index]) for v in f.verts)
    selected = sum(f.select for f in bm.faces)
    bmesh.update_edit_mesh(obj.data)
    if not selected:
        bpy.ops.object.mode_set(mode="OBJECT")
        return None
    bpy.ops.mesh.separate(type="SELECTED")
    bpy.ops.object.mode_set(mode="OBJECT")
    part = [o for o in bpy.context.selected_objects if o is not obj][0]
    # Keep the per-vertex group names for the new object (separate keeps vertex order per face set).
    dominant[part.name] = [part.vertex_groups[max(v.groups, key=lambda g: g.weight).group].name if v.groups else "" for v in part.data.vertices]
    dominant[obj.name] = [obj.vertex_groups[max(v.groups, key=lambda g: g.weight).group].name if v.groups else "" for v in obj.data.vertices]
    return part

def by_material(name):
    return [o for o in bpy.data.objects if o.type == "MESH" and o.data.materials and o.data.materials[0].name == name]

is_key = lambda g: any(f"c4_{b}_" in g for b in KEYS.values())
key_of = lambda g: next((k for k, b in KEYS.items() if f"c4_{b}_" in g), None)

# Unlit key-cap overlay (the keypad is always lit while the device is in use).
for o in list(bpy.data.objects):
    if o.type == "MESH" and set(dominant[o.name]) <= {"v_weapon.c4_buttons_off_21", ""} and "buttons_off" in "".join(set(dominant[o.name])):
        bpy.data.objects.remove(o)

key_parts, leds_on, screens = [], [], []
for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    groups = set(dominant[o.name])
    if any(is_key(g) for g in groups):
        part = split(o, is_key)
        if part:
            key_parts.append(part)
    if any("screen_on" in g or "screen_off" in g for g in groups):
        part = split(o, lambda g: "screen_on" in g or "screen_off" in g)
        if part:
            screens.append(part)
    if any("leds1_on" in g or "leds2_on" in g for g in groups):
        part = split(o, lambda g: "_on_" in g and "leds" in g)
        if part:
            leds_on.append(part)

# Screen window: the lit screen's extent on the face, then the parts are dropped (the game draws it).
pts = [v.co for s in screens for v in s.data.vertices]
sx = (min(p.x for p in pts), max(p.x for p in pts))
sz = (min(p.z for p in pts), max(p.z for p in pts))
sy = min(p.y for p in pts)  # most face-ward (Blender -Y is out of the face)
for s in screens:
    bpy.data.objects.remove(s)
inset = 0.0006
screen_mesh = bpy.data.meshes.new("C4_Screen")
x0, x1, z0, z1 = sx[0] + inset, sx[1] - inset, sz[0] + inset, sz[1] - inset
y = sy - 0.0002
screen_mesh.from_pydata([(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)], [], [(0, 1, 2, 3)])
uv = screen_mesh.uv_layers.new(name="UVMap")
for loop, (u, v) in zip(screen_mesh.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
    uv.data[loop.index].uv = (u, v)
screen_material = bpy.data.materials.new("c4_screen")
screen_material.use_nodes = True
bsdf = screen_material.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.02, 0.025, 0.01, 1)
bsdf.inputs["Roughness"].default_value = 0.35
bsdf.inputs["Emission Color"].default_value = (0.55, 0.62, 0.12, 1)
bsdf.inputs["Emission Strength"].default_value = 1.0
# A tiny placeholder map so the export keeps the quad's UVs (the game draws its own display).
placeholder = bpy.data.images.new("c4_screen_placeholder", 16, 8)
placeholder.pixels = [0.12, 0.14, 0.03, 1.0] * (16 * 8)
placeholder.pack()
image_node = screen_material.node_tree.nodes.new("ShaderNodeTexImage")
image_node.image = placeholder
screen_material.node_tree.links.new(image_node.outputs["Color"], bsdf.inputs["Base Color"])
screen_mesh.materials.append(screen_material)
screen = bpy.data.objects.new("C4_Screen", screen_mesh)
scene.collection.objects.link(screen)

# ---------------------------------------------------------------- join and name
def join(objs, name):
    objs = [o for o in objs if o]
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    out = bpy.context.view_layer.objects.active
    out.name = out.data.name = name
    return out

keys_groups = []
for p in key_parts:
    keys_groups.extend(dominant[p.name])
keys = join(key_parts, "C4_Keys")
dominant["C4_Keys"] = [keys.vertex_groups[max(v.groups, key=lambda g: g.weight).group].name if v.groups else "" for v in keys.data.vertices]
leds = join(leds_on, "C4_LedsOn")
body = join([o for o in bpy.data.objects if o.type == "MESH" and o not in (keys, leds, screen)], "C4_Body")
# Merge material slots that share a material (the joined parts each brought their own slot).
bpy.context.view_layer.objects.active = body
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
bpy.ops.object.material_slot_remove_unused()

# Key morphs: each key's vertices pushed KEY_TRAVEL into the face.
keys.shape_key_add(name="Basis")
anchors = {}
for k in KEYS:
    sk = keys.shape_key_add(name=f"press_{k}", from_mix=False)
    idx = [i for i, g in enumerate(dominant["C4_Keys"]) if key_of(g) == k]
    for i in idx:
        sk.data[i].co = keys.data.vertices[i].co - FACE * KEY_TRAVEL
    cap = [keys.data.vertices[i].co for i in idx]
    top = min(c.y for c in cap)
    anchors[k] = (sum(c.x for c in cap) / len(cap), top, sum(c.z for c in cap) / len(cap))
for obj in (keys, leds, body, screen):
    for g in list(obj.vertex_groups):
        obj.vertex_groups.remove(g)
    obj.data.update()

# Markers the game reads: key cap tops, screen window.
for k, (x, yy, z) in anchors.items():
    e = bpy.data.objects.new(f"C4_Key_{k}", None)
    e.empty_display_size = 0.004
    e.location = (x, yy, z)
    scene.collection.objects.link(e)
model = {
    "keyTravel": KEY_TRAVEL,
    "keys": {k: [round(a[0], 5), round(a[2], 5), round(-a[1], 5)] for k, a in anchors.items()},
    "screen": {"x": [round(x0, 5), round(x1, 5)], "y": [round(z0, 5), round(z1, 5)], "z": round(-y, 5)},
    "size": [round(v, 5) for v in (hi.x - lo.x, hi.y - lo.y, hi.z - lo.z)],
}
root = bpy.data.objects.new("C4", None)
scene.collection.objects.link(root)
for obj in (keys, leds, body, screen) + tuple(o for o in bpy.data.objects if o.name.startswith("C4_Key_")):
    obj.parent = root
root["c4"] = json.dumps(model)
print("C4 MODEL", json.dumps(model))
print("C4 PARTS", {o.name: (len(o.data.polygons), [m.name for m in o.data.materials]) for o in (body, keys, leds, screen)})

# ---------------------------------------------------------------- rig, clips, cameras, export
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import animate_c4  # noqa: E402

animate_c4.build(scene, root, model)
if PREVIEWS:
    animate_c4.render_previews(scene, PREVIEWS)
if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
bpy.ops.object.select_all(action="DESELECT")
bpy.ops.export_scene.gltf(
    filepath=os.path.abspath(OUT),
    export_format="GLB",
    export_animations=True,
    export_animation_mode="NLA_TRACKS",
    export_force_sampling=True,
    export_optimize_animation_size=False,
    export_optimize_animation_keep_anim_object=True,
    export_morph=True,
    export_morph_normal=False,
    export_extras=True,
    export_cameras=False,
    export_lights=False,
    export_apply=False,
)
print("exported", OUT)
