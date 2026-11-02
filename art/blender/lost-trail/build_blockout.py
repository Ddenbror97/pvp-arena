"""
Build LOST TRAIL in Blender from build/layout.json (art/blender/lost-trail/layout.py).

  python build_blockout.py -- <out.glb> [--blend out.blend]

Phase 2 blockout: every gameplay solid as a plain coloured box (by kind), placeholder forest
(trunk cylinders + crown blobs) in the movement-only jungle zones, a canopy layer over the arena
and a background forest ring, the river and the ground. Placeholder trees are linked duplicates
of a few meshes, which gltf-transform turns into GPU instances (EXT_mesh_gpu_instancing).
Objects are grouped into spatial sections so the runtime can frustum-cull them.
"""
import bpy, bmesh, json, math, os, random, sys

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index("--") + 1:]
OUT = argv[0]
BLEND = argv[argv.index("--blend") + 1] if "--blend" in argv else None
L = json.load(open(os.path.join(HERE, "build", "layout.json")))
W, D = L["arena"]["width"], L["arena"]["depth"]
rng = random.Random(1337)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene


def to_blender(x, y, z):
    """Game/glTF (x, y up, z) → Blender (x, -z, y up)."""
    return (x, -z, y)


def material(name, color, rough=0.9, metal=0.0):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    m.diffuse_color = (*color, 1)
    return m


MAT = {
    "rock": material("bo-rock", (0.42, 0.42, 0.38)),
    "ruin": material("bo-ruin", (0.55, 0.53, 0.45)),
    "wood": material("bo-wood", (0.36, 0.24, 0.13)),
    "trunk": material("bo-trunk", (0.27, 0.2, 0.14)),
    "crate": material("bo-crate", (0.5, 0.38, 0.2)),
    "hut": material("bo-hut", (0.4, 0.33, 0.24)),
    "ridge": material("bo-ridge", (0.36, 0.3, 0.2)),
    "step": material("bo-step", (0.6, 0.58, 0.5)),
    "sandbag": material("bo-sandbag", (0.55, 0.5, 0.36)),
    "ground": material("bo-ground", (0.24, 0.22, 0.13)),
    "trail": material("bo-trail", (0.42, 0.33, 0.2)),
    "water": material("bo-water", (0.12, 0.26, 0.24), 0.15),
    "crown": material("bo-crown", (0.12, 0.24, 0.1)),
    "crown-far": material("bo-crown-far", (0.1, 0.2, 0.1)),
    "edge": material("bo-edge-wall", (0.14, 0.2, 0.12)),
}
KIND_MAT = {
    "ruin-wall": "ruin", "rock-wall": "rock", "boulder": "rock", "ridge": "ridge", "stone-step": "step",
    "sandbags": "sandbag", "crate": "crate", "crate-stack": "crate", "log": "wood", "hut": "hut",
    "bridge-post": "wood", "trunk": "trunk", "hero-trunk": "trunk",
}


def section_name(x, z):
    if abs(x) > W / 2 + 1 or abs(z) > D / 2 + 1:
        return "background"
    sx = "west" if x < -7.5 else "east" if x > 7.5 else "centre"
    sz = "north" if z < -6 else "south" if z > 6 else "mid"
    return f"{sx}-{sz}"


root = bpy.data.collections.new("lost-trail")
sc.collection.children.link(root)
_sections = {}


def section(name):
    if name not in _sections:
        c = bpy.data.collections.new(name)
        root.children.link(c)
        _sections[name] = c
    return _sections[name]


def link(o, coll):
    for c in o.users_collection:
        c.objects.unlink(o)
    coll.objects.link(o)


def mesh_object(name, bm, mat, coll):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    coll.objects.link(o)
    return o


def box(name, x, y, z, w, h, d, mat, coll, inset=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = v.co.x * (w - 2 * inset) + x
        v.co.y = v.co.y * (d - 2 * inset) - z
        v.co.z = v.co.z * (h - 2 * inset) + y
    return mesh_object(name, bm, mat, coll)


# ------------------------------------------------------------------ gameplay solids
trees = {}
for s in L["solids"]:
    if s["layer"] == "barrier":
        continue
    if s.get("tree"):
        trees.setdefault(s["tree"] + s["id"][-2:] if s["side"] != "centre" else s["tree"], []).append(s)
        continue
    box(s["id"], s["x"], s["y"], s["z"], s["w"], s["h"], s["d"], MAT[KIND_MAT.get(s["kind"], "rock")],
        section(section_name(s["x"], s["z"])))


# ------------------------------------------------------------------ placeholder tree meshes
def trunk_mesh(name, r0, r1, h, n=10):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=n, radius1=r0, radius2=r1, depth=h)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, h / 2))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(MAT["trunk"])
    return me


def crown_mesh(name, rx, rz, mat):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
    for v in bm.verts:
        v.co.x *= rx
        v.co.y *= rx
        v.co.z *= rz
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    return me


# A few archetypes, reused as linked duplicates (GPU instances after export).
ARCH = {
    "canopy": (trunk_mesh("lib-trunk-canopy", 0.55, 0.32, 24), crown_mesh("lib-crown-canopy", 5.5, 2.6, MAT["crown"]), 24),
    "tall": (trunk_mesh("lib-trunk-tall", 0.4, 0.22, 17), crown_mesh("lib-crown-tall", 3.6, 2.0, MAT["crown"]), 17),
    "mid": (trunk_mesh("lib-trunk-mid", 0.22, 0.14, 9), crown_mesh("lib-crown-mid", 2.4, 1.5, MAT["crown"]), 9),
    "far": (trunk_mesh("lib-trunk-far", 0.6, 0.4, 26), crown_mesh("lib-crown-far", 7.0, 3.2, MAT["crown-far"]), 26),
}


def place_tree(kind, x, z, coll, scale=1.0, tag="tree"):
    trunk_me, crown_me, h = ARCH[kind]
    yaw = rng.uniform(0, math.tau)
    t = bpy.data.objects.new(f"{tag}-{kind}-trunk", trunk_me)
    t.location = to_blender(x, 0, z)
    t.rotation_euler = (0, 0, yaw)
    t.scale = (scale, scale, scale)
    t["instance"] = True
    coll.objects.link(t)
    c = bpy.data.objects.new(f"{tag}-{kind}-crown", crown_me)
    c.location = to_blender(x, h * scale, z)
    c.rotation_euler = (0, 0, yaw)
    c.scale = (scale, scale, scale)
    c["instance"] = True
    c["noShadow"] = True
    coll.objects.link(c)


# Gameplay trunks: one round placeholder trunk per tree (collision is the crossed boxes).
for tid, parts in trees.items():
    a = parts[0]
    d = a["diameter"]
    h = a["h"]
    x, z = a["x"], a["z"]
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=d / 2 * 1.02, radius2=d / 2 * 0.78, depth=h + 6)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(x, -z, (h + 6) / 2))
    mesh_object(f"tree-{tid}", bm, MAT["trunk"], section(section_name(x, z)))
    crown = bpy.data.objects.new(f"tree-{tid}-crown", ARCH["canopy"][1])
    crown.location = to_blender(x, h + 13, z)
    crown["instance"] = True
    crown["noShadow"] = True
    section(section_name(x, z)).objects.link(crown)


# ------------------------------------------------------------------ forest volume
placed = 0
# Dense trees inside the movement-only jungle zones (their trunks stay clear of the lanes).
for s in L["solids"]:
    if s["layer"] != "barrier" or s["kind"] == "gorge":
        continue
    area = s["w"] * s["d"]
    for _ in range(int(area / 9)):
        x = rng.uniform(s["x"] - s["w"] / 2 + 0.8, s["x"] + s["w"] / 2 - 0.8)
        z = rng.uniform(s["z"] - s["d"] / 2 + 0.8, s["z"] + s["d"] / 2 - 0.8)
        kind = rng.choice(["mid", "mid", "tall", "canopy"])
        place_tree(kind, x, z, section(section_name(x, z)), rng.uniform(0.8, 1.2), "jungle")
        placed += 1
# Background forest ring: arena edge out to ~70 m, denser near the edge.
for ring, (r0, r1, step, kinds) in enumerate(
    [(0.5, 12, 4.0, ["canopy", "tall", "mid"]), (12, 30, 6.5, ["canopy", "tall", "far"]), (30, 50, 10.0, ["far"])]
):
    x = -W / 2 - r1
    while x <= W / 2 + r1:
        z = -D / 2 - r1
        while z <= D / 2 + r1:
            px, pz = x + rng.uniform(-step / 2, step / 2), z + rng.uniform(-step / 2, step / 2)
            dx = max(0.0, abs(px) - W / 2)
            dz = max(0.0, abs(pz) - D / 2)
            out = max(dx, dz)
            if r0 <= out < r1:
                place_tree(rng.choice(kinds), px, pz, section("background"), rng.uniform(0.85, 1.25), "bg")
                placed += 1
            z += step
        x += step
# Canopy over the arena: tall crowns high above the lanes (trunks only where they're out of the
# way: in jungle zones or beyond the edge); here, crowns only at 22–30 m.
for _ in range(70):
    x, z = rng.uniform(-W / 2, W / 2), rng.uniform(-D / 2, D / 2)
    c = bpy.data.objects.new("canopy-crown", ARCH["canopy"][1])
    c.location = to_blender(x, rng.uniform(22, 30), z)
    c.scale = (rng.uniform(0.8, 1.3),) * 3
    c["instance"] = True
    c["noShadow"] = True
    section(section_name(x, z)).objects.link(c)
print("PLACEHOLDER TREES", placed)

# ------------------------------------------------------------------ ground, trails, river
g = section("ground")
# Ground with the river channel cut out where the gorge runs (|x| < 2.6 outside the ford).
GX = 2.6
FAR = 60.0
for name, (x0, x1, z0, z1) in {
    "ground-west": (-W / 2 - FAR, -GX, -D / 2 - FAR, D / 2 + FAR),
    "ground-east": (GX, W / 2 + FAR, -D / 2 - FAR, D / 2 + FAR),
    "ground-bridge": (-GX, GX, -1.7, 1.7),  # under the deck (hidden by it)
    "ground-north-crossing": (-GX, GX, -15.4, -12.6),
    "ground-ford": (-GX, GX, 9.4, 15.2),
}.items():
    box(name, (x0 + x1) / 2, -0.2, (z0 + z1) / 2, x1 - x0, 0.4, z1 - z0, MAT["ground"], g)
# Gorge: rock walls down to the water and a river bed below it.
for name, (z0, z1) in {"gorge-n": (-12.6, -1.7), "gorge-s": (1.7, 9.4)}.items():
    for side in (-1, 1):
        box(f"{name}-wall-{'w' if side < 0 else 'e'}", side * (GX + 0.1), -1.0, (z0 + z1) / 2, 0.2, 2.0, z1 - z0,
            MAT["rock"], section("river"))
    box(f"{name}-bed", 0, -1.9, (z0 + z1) / 2, 2 * GX, 0.2, z1 - z0, MAT["rock"], section("river"))
# Trails (visual strips 2 cm above ground; no collision).
for name, (x0, x1, z0, z1) in {
    "trail-plaza": (-15.6, 15.6, -5.2, 5.2),
    "trail-south": (-17.6, 17.6, 9.4, 15.2),
    "trail-bank-n": (-8.6, 8.6, -15.4, -5.2),
}.items():
    box(name, (x0 + x1) / 2, 0.011, (z0 + z1) / 2, x1 - x0, 0.02, z1 - z0, MAT["trail"], g)
# River: gorge water surface sunk 1.2 m under the bridge, ford water ankle-deep at the trail.
for name, (z0, z1, y) in {"river-gorge-n": (-12.6, -1.7, -1.2), "river-gorge-s": (1.7, 9.4, -1.2),
                           "river-north-crossing": (-15.4, -12.6, 0.05),
                           "river-north": (-60, -15.4, 0.03), "river-ford": (9.4, 15.2, 0.05),
                           "river-south": (15.2, 60, 0.03)}.items():
    box(name, 0, y, (z0 + z1) / 2, 5.2, 0.04, z1 - z0, MAT["water"], section("river"))
# Bridge deck (visual; the deck is at ground level, the gorge is under it).
box("bridge-deck", 0, -0.04, 0, 5.6, 0.08, 3.4, MAT["wood"], section("centre-mid"))

# The bullet-only perimeter walls are never rendered: they are invisible bullet stops inside the
# dense forest edge (players cannot reach them; the trees in front hide where shots end).


def join_static(coll):
    """Merge non-instanced static meshes per material inside a section (fewer draw calls)."""
    by_mat = {}
    for o in list(coll.objects):
        if o.type == "MESH" and not o.get("instance"):
            by_mat.setdefault(o.data.materials[0].name, []).append(o)
    for name, objs in by_mat.items():
        if len(objs) < 2:
            continue
        with bpy.context.temp_override(active_object=objs[0], selected_editable_objects=objs):
            bpy.ops.object.join()
        objs[0].name = f"{coll.name}-{name}"


for c in list(root.children):
    join_static(c)


def export(out):
    for c in root.children:
        empty = bpy.data.objects.new(f"section-{c.name}", None)
        c.objects.link(empty)
        for o in c.objects:
            if o is not empty:
                o.parent = empty
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=True, export_yup=True,
                              export_texcoords=True, export_normals=True, export_materials="EXPORT",
                              export_extras=True, export_animations=False)


os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
export(OUT)
print("exported", OUT)
