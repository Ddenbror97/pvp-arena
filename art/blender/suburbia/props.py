"""
Sketchfab models for SUBURBAN SHOWDOWN (all CC BY 4.0, credited in public/fps/models/ATTRIBUTION.md;
prepared by tools/prep_sources.py into source/*.glb: metres, front along +X, origin at the centre of
the footprint, base at 0). Imported by build_suburbia.py.

Every model is placed onto the gameplay solids that describe it (layout.py), never the other way
round: its position, facing and uniform scale come from the solid, and validate() checks that every
vertex below 2.9 m inside the playable rectangle lies within 6 cm of a solid, as for the kit.
Repeated models are linked duplicates (exported as GPU instances by gltf-transform instance).
"""
import math, os
import bpy, bmesh
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "source")
LIB = {}          # item name -> library object (hidden, not exported)
USES = {}         # item name -> number of placements
PLACED = []       # (object, validate?)
SECTION = [None]  # the build's section(name) -> collection
FACE = {"+x": 0.0, "-x": math.pi, "-z": math.pi / 2, "+z": -math.pi / 2}
MIRROR = {"+x": "-x", "-x": "+x", "+z": "+z", "-z": "-z"}


def to_blender(x, y, z):
    return Vector((x, -z, y))


def load(files):
    lib = bpy.data.collections.new("sketchfab-library")
    for f in files:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, f + ".glb"))
        for o in set(bpy.data.objects) - before:
            if o.type != "MESH":
                bpy.data.objects.remove(o, do_unlink=True)
                continue
            for c in list(o.users_collection):
                c.objects.unlink(o)
            lib.objects.link(o)
            o.parent = None
            o.data.transform(o.matrix_world)
            o.matrix_world = Matrix.Identity(4)
            LIB[o.name] = o
    # One material per source name across the imports (the cars share their tyre, trim, glass,
    # light and interior materials): fewer draw calls.
    by_name = {}
    shared = ("car_", "RB1c_", "UCB_", "Carbadges", "Numberplates")
    for m in list(bpy.data.materials):
        base = m.name.split(".")[0]
        if not base.startswith(shared):
            continue
        if base in by_name and m is not by_name[base]:
            m.user_remap(by_name[base])
            bpy.data.materials.remove(m)
        else:
            by_name.setdefault(base, m)
    return lib


def derived(name, src, keep=None, transform=None):
    """A library item derived from another (a cut-down copy)."""
    o = LIB[src].copy()
    o.data = LIB[src].data.copy()
    o.name = o.data.name = name
    if keep is not None:
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.co)], context="VERTS")
        bm.to_mesh(o.data)
        bm.free()
    if transform is not None:
        o.data.transform(transform)
    LIB[name] = o
    return o


def anchor_of(name, mode):
    """Footprint point of an item that goes on the solid's centre: the bbox centre (default)
    or the centre of its base (the vertices within 15 cm of the ground: poles, lamps)."""
    if mode != "base":
        return Vector((0, 0, 0))
    vs = [v.co for v in LIB[name].data.vertices if v.co.z < 0.15]
    lo = Vector([min(v[i] for v in vs) for i in range(2)])
    hi = Vector([max(v[i] for v in vs) for i in range(2)])
    return Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, 0))


def place(sec_name, name, x, z, face="+x", scale=1.0, y=0.0, stretch=1.0, anchor=None, check=True, shadow=True):
    """Linked duplicate of a library item at game (x, y, z), its +X turned to `face`, scaled
    (stretch scales its +X length only), the anchor point put on (x, z)."""
    src = LIB[name]
    o = bpy.data.objects.new(f"{name}.{USES.get(name, 0):02d}", src.data)
    USES[name] = USES.get(name, 0) + 1
    phi = FACE[face] if isinstance(face, str) else face
    sc = Vector((scale * stretch, scale, scale))
    a = anchor_of(name, anchor)
    rot = Matrix.Rotation(phi, 4, "Z")
    off = rot @ Vector((a.x * sc.x, a.y * sc.y, 0))
    o.location = to_blender(x, y, z) - off
    o.rotation_euler = (0, 0, phi)
    o.scale = sc
    if not shadow:
        o["noShadow"] = True
    SECTION[0](sec_name).objects.link(o)
    PLACED.append((o, check))
    return o


def finish():
    """Flag shared meshes as instances (gltf-transform instance turns them into GPU instances)."""
    for o, _ in PLACED:
        if o.data.users > 2:  # library object + 2 or more placements
            o["instance"] = True


def validate(L, in_reach, tol=0.061):
    bpy.context.view_layer.update()
    hw, hd = L["arena"]["width"] / 2, L["arena"]["depth"] / 2
    solids = L["solids"]
    bad = {}
    for o, check in PLACED:
        if not check:
            continue
        mw = o.matrix_world
        for v in o.data.vertices:
            w = mw @ v.co
            x, y, z = w.x, w.z, -w.y
            if not in_reach(x, y, z, hw, hd):
                continue
            if not any(abs(x - s["x"]) <= s["w"] / 2 + tol and abs(z - s["z"]) <= s["d"] / 2 + tol
                       and s["y"] - s["h"] / 2 - tol <= y and (y <= s["y"] + s["h"] / 2 + tol or s["layer"] == "box")
                       for s in solids):
                bad.setdefault(o.name, []).append((round(x, 3), round(y, 3), round(z, 3)))
    return bad


def fit_report(L):
    """Placed bounds per object (game coordinates), for fitting the collision to the models."""
    bpy.context.view_layer.update()
    for o, check in PLACED:
        if not check:
            continue
        mw = o.matrix_world
        ws = [mw @ v.co for v in o.data.vertices]
        lo = [min(w.x for w in ws), min(w.z for w in ws), min(-w.y for w in ws)]
        hi = [max(w.x for w in ws), max(w.z for w in ws), max(-w.y for w in ws)]
        print(f"FIT {o.name:22s} x {lo[0]:7.3f}..{hi[0]:7.3f}  y {lo[1]:6.3f}..{hi[1]:6.3f}  z {lo[2]:7.3f}..{hi[2]:7.3f}")


# ------------------------------------------------------------------------------- the map's models
def build(L, section, section_of, tree_spots):
    SECTION[0] = section
    load(["bus", "truck_cab", "car_duke", "car_negotiator", "car_wagon", "picket", "shed", "pole", "mailbox",
          "picnic", "tower", "oak", "bushes", "props", "signs", "furniture"])
    S = {s["id"]: s for s in L["solids"]}
    c = lambda i: (S[i]["x"], S[i]["z"])  # noqa: E731
    sec = lambda i: section_of(*c(i))  # noqa: E731

    # Oak canopy for the trees in the playable area: the model above its first branches (z > 6 m
    # in model units), so the leaves start above reach; the trunk below is the kit's (in the
    # tree's collision post).
    oak = LIB["oak"]
    can = derived("oak_canopy", "oak", keep=lambda co: co.z > 6.0)
    mod = can.modifiers.new("dec", "DECIMATE")
    mod.ratio = 0.5
    bpy.context.scene.collection.objects.link(can)
    bpy.context.view_layer.objects.active = can
    bpy.ops.object.modifier_apply(modifier="dec")
    bpy.context.scene.collection.objects.unlink(can)

    # Centre: bus, truck cab, street cars.
    place("centre-mid", "bus", 0.0, 4.978, "-z", 1.12)
    tc = (S["truck-floor"]["z"])
    cab_len = LIB["truck_cab"].dimensions.x
    place(sec("truck-cab"), "truck_cab", 5.73 - cab_len / 2, tc, "+x", 1.0)
    for side, sx in (("a", -1), ("b", 1)):
        x, z = c(f"street-car-{side}")
        place(section_of(x, z), "car_wagon", x, z, "-z", 1.0)
        x, z = c(f"drive-car-{side}")
        if side == "a":
            place(section_of(x, z), "car_duke", x, z, "+x", 0.973)
        else:
            place(section_of(x, z), "car_negotiator", x, z, "-x", 1.032)

    def twin(fn):
        fn("a", -1)
        fn("b", 1)

    # Street furniture and yard props.
    def street(side, sx):
        face_out = "+x" if sx < 0 else "-x"
        x, z = c(f"mailbox-{side}")
        place(section_of(x, z), "mailbox", x, z, face_out, 1.4)
        x, z = c(f"hydrant-{side}")
        place(section_of(x, z), "hydrant", x, z, face_out, 1.0)
        x, z = c(f"street-lamp-{side}")
        place(section_of(x, z), "streetlight", x, z, face_out, 1.35, anchor="base")
        x, z = c(f"patio-table-{side}")
        place(section_of(x, z), "picnic", x, z, "+x", 1.0)
        x, z = c(f"yard-shed-{side}")
        place(section_of(x, z), "shed", x, z, "-z", 0.75)
        x, z = c(f"lane-shed-{side}")
        place(section_of(x, z), "shed", x, z, face_out, 0.75)
        x, z = c(f"lane-pole-{side}")
        place(section_of(x, z), "pole", x, z, "+x", 1.54, anchor="base")
        x, z = c(f"lane-dumpster-{side}")
        place(section_of(x, z), "dumpster", x, z, "+z" if sx < 0 else "-z", 1.1)
        # Wheelie bins: two side by side.
        s = S[f"yard-trash-{side}"]
        for k, bin_ in enumerate(("bin_green", "bin_blue") if side == "a" else ("bin_red", "bin_yellow")):
            place(section_of(s["x"], s["z"]), bin_, s["x"], s["z"] - s["d"] / 4 + k * s["d"] / 2, face_out, 1.0)
        s = S[f"passage-bins-{side}"]
        for k, bin_ in enumerate(("bin_blue", "bin_green") if side == "a" else ("bin_yellow", "bin_red")):
            place(section_of(s["x"], s["z"]), bin_, s["x"] - s["w"] / 4 + k * s["w"] / 2, s["z"], "+z", 1.0)
        # Cardboard boxes in the garage.
        s = S[f"garage-boxes-{side}"]
        x0, z0 = s["x"] - s["w"] / 2, s["z"] - s["d"] / 2
        se = section_of(s["x"], s["z"])
        place(se, "box_l", x0 + 0.26, z0 + 0.5, "+x", 1.0)
        place(se, "box_m", x0 + 0.86, z0 + 0.36, "+x", 1.0)
        place(se, "box_h", x0 + 0.86, z0 + 0.92, "+z", 1.0)
        place(se, "box_m", x0 + 0.36, z0 + 0.5, "+z", 1.0, y=0.494)
        place(se, "box_s", x0 + 0.86, z0 + 0.36, "-x", 1.0, y=0.494)
        # Shrubs: three per bed under the front windows, small ones in the planter.
        for bed in ("shrubs-n", "shrubs-s"):
            s = S[f"{bed}-{side}"]
            for k, bush in enumerate(("bush_fead", "bush_abutilon", "bush_greenfead")):
                zz = s["z"] - s["d"] / 2 + s["d"] * (k + 0.5) / 3
                place(section_of(s["x"], zz), bush, s["x"], zz, "+x" if k != 1 else "-z", 0.2, y=0.17)
        s = S[f"yard-planter-{side}"]
        for k, bush in enumerate(("bush_cassia", "bush_abutilon", "bush_cassia")):
            xx = s["x"] - s["w"] / 2 + s["w"] * (k + 0.5) / 3
            place(section_of(xx, s["z"]), bush, xx, s["z"], "+x", 0.13, y=s["h"] - 0.05)
        # Picket fences (Shuckwaffles' fence, x0.88 -> 1.25 m), segments stretched to fit.
        for fid in (f"yard-fence-w-{side}", f"passage-fence-{side}"):
            s = S[fid]
            along_x = s["w"] > s["d"]
            a0 = (s["x"] - s["w"] / 2) if along_x else (s["z"] - s["d"] / 2)
            length = s["w"] if along_x else s["d"]
            seg = LIB["picket"].dimensions.x * 0.88
            n = max(1, math.ceil(length / seg - 0.05))
            for i in range(n):
                a = a0 + length * (i + 0.5) / n
                x, z = (a, s["z"]) if along_x else (s["x"], a)
                place(section_of(x, z), "picket", x, z, "+x" if along_x else "+z", 0.88, stretch=length / n / seg)
        # Trees: canopy over each trunk post.
        for tid in (f"yard-tree-1-{side}", f"yard-tree-2-{side}", f"backyard-tree-{side}"):
            x, z = c(tid)
            place(section_of(x, z), "oak_canopy", x, z, 0.4 + 1.3 * (sum(map(ord, tid)) % 5), 0.16, y=3.0 - 6.0 * 0.16)
        # Furniture.
        x, z = c(f"house-sofa-{side}")
        place(section_of(x, z), "sofa_cream" if side == "a" else "sofa_black", x, z, "-x" if sx < 0 else "+x", 1.15)
        x, z = c(f"house-fireplace-{side}")
        place(section_of(x, z), "fireplace_white" if side == "a" else "fireplace_stone", x, z, "+x" if sx < 0 else "-x", 1.2)
        bx = S[f"house-bed-{side}"]
        hb = S[f"house-headboard-{side}"]
        x0b, x1b = min(bx["x"] - bx["w"] / 2, hb["x"] - hb["w"] / 2), max(bx["x"] + bx["w"] / 2, hb["x"] + hb["w"] / 2)
        place(section_of(bx["x"], bx["z"]), "bed_white", (x0b + x1b) / 2, bx["z"],
              "-z" if sx < 0 else "+z", 1.25, y=3.0)
        x, z = c(f"house-wardrobe-{side}")
        place(section_of(x, z), "wardrobe", x, z, "+x" if sx < 0 else "-x", 1.25, y=3.0)
        x, z = c(f"house-dresser-{side}")
        place(section_of(x, z), "dresser", x, z, "-z", 1.25, y=3.0)

    twin(street)
    # The radio tower carrying the billboard.
    x, z = c("tower-base")
    # The lattice above the transmitter hut's roof (the hut is the kit's, on the collision box).
    derived("tower_top", "tower", keep=lambda co: co.z > 2.7 / 1.2)
    place("centre-north", "tower_top", x, z, "+x", 1.2, y=0.0)
    # Background: oaks round the block, road signs on the exit road beyond the hoarding.
    for i, (x, z, s) in enumerate(tree_spots):
        place("background", "oak_far", x, z, i * 0.7, s, check=False, shadow=False)
    place("background", "sign_stop", -6.2, 26.5, "-z", 0.42, anchor="base", check=False)
    place("background", "sign_giveway", 6.2, 31.0, "+z", 0.42, anchor="base", check=False)
    place("background", "sign_nowaiting", -6.2, 36.0, "-z", 0.42, anchor="base", check=False)
    finish()
