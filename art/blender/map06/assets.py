"""
SANDGATE (map 06) asset library: imports the downloaded Sketchfab models (incoming/, CC BY 4.0,
credited in docs/fps-bomb/ASSETS.md and public/fps/models/sandgate-credits.txt), keeps only the
parts the map uses, joins each into one mesh, decimates the heavy ones, recentres them (origin at
the bottom centre, long axis along Blender X), and re-grades / downsizes their textures into the
map's palette and texture budget. Writes build/library.blend (one object per asset, in the
"Asset Library" collection), which build_sandgate.py appends and instances.

  /root/bpyenv/bin/python art/blender/map06/assets.py

free_ac_unit is under the Sketchfab Standard licence and is deliberately never imported.
"""
import bpy, bmesh, json, math, os, sys
import numpy as np
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
INC = os.path.join(HERE, "incoming")
LIBTEX = os.path.join(HERE, "build", "tex", "lib")
OUT = os.path.join(HERE, "build", "library.blend")
os.makedirs(LIBTEX, exist_ok=True)


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def grade_fn(target=None, sat=1.0, contrast=1.0):
    def f(rgb):
        l = lum(rgb)[..., None]
        out = l + (rgb - l) * sat
        m = l.mean()
        out = m + (out - m) * contrast
        if target is not None:
            out = out * (np.array(target) / np.maximum(out.reshape(-1, 3).mean(0), 1e-4))
        return np.clip(out, 0, 1)
    return f


def clean_crate(pil):
    """Paint the three warning stickers of the crate texture over with plain boards from the
    same sheet (the pack's crate carries a 'danger' and a radiation label)."""
    w = pil.width / 2048
    for box, src_y in (((317, 358, 717, 640), 1258), ((1382, 358, 1766, 600), 760), ((1382, 1382, 1766, 1715), 1050)):
        x0, y0, x1, y1 = (int(v * w) for v in box)
        patch = pil.crop((x0, int(src_y * w), x1, int(src_y * w) + (y1 - y0)))
        pil.paste(patch, (x0, y0))
    return pil


CLEAN = {"crate": clean_crate}

SPECS = {
    # name: source folder, object filter, yaw to put the long axis on X, decimation, texture
    # sizes (colour, other), colour grade.
    "container": dict(src="40ft_iso_general_container_free_asset_pack", pick=lambda o: o.data.materials[0].name == "Material.014" and len(o.data.polygons) > 2000,
                      yaw=90, tex=(1024, 512), grade=grade_fn((0.66, 0.65, 0.62), sat=0.0, contrast=1.05)),
    "mrap": dict(src="military_trucks", pick=lambda o: max((o.matrix_world @ Vector(c)).x for c in o.bound_box) < -5.0,
                 yaw=90, dec={"Object_4": 0.22, "Object_9": 0.22, "Object_12": 0.22, "Object_6": 0.6, "Object_8": 0.5}, tex=(1024, 512)),
    "jeep": dict(src="military_trucks", pick=lambda o: min((o.matrix_world @ Vector(c)).x for c in o.bound_box) > -4.0,
                 yaw=90, dec={"Object_15": 0.22, "Object_19": 0.22, "Object_14": 0.6}, tex=(1024, 512)),
    "forklift": dict(src="forklift_gameready", pick=lambda o: True, yaw=90, dec_all=0.6, tex=(512, 512),
                     grade=grade_fn(sat=0.72, contrast=0.95)),
    "crate": dict(src="crate_and_barrels_asset_pack", pick=lambda o: o.name.startswith("pCube12"), yaw=0, tex=(512, 512)),
    "barrel": dict(src="crate_and_barrels_asset_pack", pick=lambda o: o.name.startswith("pCylinder1"), yaw=0, tex=(512, 512),
                   grade=grade_fn(sat=0.7)),
    "ammo": dict(src="military_crate_-_4096px2", pick=lambda o: True, yaw=0, dec_all=0.06, tex=(1024, 512)),
    "hesco": dict(src="hesco_barrier_pbr", pick=lambda o: True, yaw=0, dec_all=0.22, tex=(1024, 512),
                  grade=grade_fn((0.66, 0.59, 0.47), sat=0.8, contrast=1.0)),
    "sandbag": dict(src="sandbag_wall_-_24mb", pick=lambda o: o.name.startswith("Cube_Mat_0"), yaw=0, dec_all=0.035, tex=(512, 512),
                    grade=grade_fn((0.62, 0.52, 0.38), sat=0.8)),
    "twall": dict(src="t_wall_barrier", pick=lambda o: True, yaw=0, tex=(512, 512),
                  grade=grade_fn((0.70, 0.64, 0.54), sat=0.5)),
    "bremer": dict(src="military_concrete_barrier", pick=lambda o: True, yaw=90, tex=(512, 512),
                   grade=grade_fn((0.70, 0.63, 0.52), sat=0.45)),
    "metaldoor": dict(src="door_metal_door_window", pick=lambda o: True, yaw=0, dec_all=0.35, tex=(512, 512),
                      grade=grade_fn((0.50, 0.47, 0.41), sat=0.35)),
    "rolldoor": dict(src="roll_door", pick=lambda o: o.name.startswith("SM_RollingDoor"), yaw=0, dec_all=0.07, tex=(512, 512),
                     grade=grade_fn((0.62, 0.58, 0.50), sat=0.4)),
    "ebox": dict(src="electrical_box_-_free", pick=lambda o: True, yaw=0, dec_all=0.3, tex=(512, 512),
                 grade=grade_fn((0.52, 0.53, 0.46), sat=0.6)),
    "generator": dict(src="diesel_generator", pick=lambda o: True, yaw=0, dec_all=0.45, tex=(512, 512),
                      grade=grade_fn((0.52, 0.50, 0.38), sat=0.22, contrast=1.05)),
    "house": dict(src="desert_house", pick=lambda o: True, yaw=0, tex=(512, 256)),
}


def import_parts(src, pick):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(INC, src, "scene.gltf"))
    new = [o for o in bpy.data.objects if o not in before]
    keep = [o for o in new if o.type == "MESH" and o.data.materials and pick(o)]
    return new, keep


def join(objs, name):
    for o in objs:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    with bpy.context.temp_override(active_object=objs[0], selected_editable_objects=objs, selected_objects=objs):
        if len(objs) > 1:
            bpy.ops.object.join()
    o = objs[0]
    o.data = o.data.copy()  # break sharing with other imports of the same file
    o.data.transform(o.matrix_world)
    o.matrix_world = Matrix.Identity(4)
    o.name = o.data.name = "lib-" + name
    return o


def decimate(o, ratio, only=None):
    m = o.modifiers.new("dec", "DECIMATE")
    m.ratio = ratio
    m.use_collapse_triangulate = True
    with bpy.context.temp_override(object=o, active_object=o):
        bpy.ops.object.modifier_apply(modifier=m.name)


def recentre(o, yaw):
    me = o.data
    if yaw:
        me.transform(Matrix.Rotation(math.radians(yaw), 4, "Z"))
    vs = np.array([v.co[:] for v in me.vertices])
    mn, mx = vs.min(0), vs.max(0)
    me.transform(Matrix.Translation(Vector((-(mn[0] + mx[0]) / 2, -(mn[1] + mx[1]) / 2, -mn[2]))))
    me.update()
    return (mx - mn).tolist()


def shorten(o, length):
    """Cut the middle out of a long mesh (along X) so it is `length` long: delete everything
    within |x| < cut, move both ends inward. Keeps the ends' doors and corner castings, the
    corrugation pitch and the texture density."""
    me = o.data
    vs = np.array([v.co[:] for v in me.vertices])
    full = vs[:, 0].max() - vs[:, 0].min()
    cut = (full - length) / 2
    bm = bmesh.new()
    bm.from_mesh(me)
    for sign in (-1, 1):
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(sign * cut, 0, 0), plane_no=(1, 0, 0))
    # Keep the two end pieces (|x| >= cut), delete the middle band, move the ends together.
    edge = cut
    dead = [f for f in bm.faces if abs(f.calc_center_median().x) < edge]
    bmesh.ops.delete(bm, geom=dead, context="FACES")
    for v in bm.verts:
        if v.co.x > 0:
            v.co.x -= edge
        else:
            v.co.x += edge
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bm.to_mesh(me)
    bm.free()


def bisect_at(o, xs):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    for x in xs:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(x, 0, 0), plane_no=(1, 0, 0))
    bm.to_mesh(o.data)
    bm.free()


def role_of(node, nt):
    """'color' for images feeding Base Color, else 'data'."""
    stack, seen = [node], set()
    while stack:
        n = stack.pop()
        for out in n.outputs:
            for l in out.links:
                to = l.to_node
                if to.type == "BSDF_PRINCIPLED" and l.to_socket.name == "Base Color":
                    return "color"
                if to.name not in seen:
                    seen.add(to.name)
                    stack.append(to)
    return "data"


def litify(m):
    """Sketchfab 'shadeless' materials import as unlit (KHR_materials_unlit): rebuild them as a
    matte Principled BSDF so the props take the map's sun, shadows and fog like everything else.
    Glass with transmission becomes opaque dusty dark glass (transmission makes three.js redraw
    every opaque mesh into a transmission buffer each frame)."""
    nt = m.node_tree
    out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None)
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None and out is not None:
        img = next((n for n in nt.nodes if n.type == "TEX_IMAGE"), None)
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        bsdf.inputs["Roughness"].default_value = 0.9
        if img:
            nt.links.new(img.outputs["Color"], bsdf.inputs["Base Color"])
        nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
        for n in list(nt.nodes):
            if n.type in ("BACKGROUND", "EMISSION", "MIX_SHADER", "LIGHT_PATH", "ADD_SHADER", "BSDF_TRANSPARENT"):
                nt.nodes.remove(n)
    if bsdf is not None and bsdf.inputs["Transmission Weight"].default_value > 0:
        bsdf.inputs["Transmission Weight"].default_value = 0.0
        bsdf.inputs["Base Color"].default_value = (0.05, 0.06, 0.065, 1)
        bsdf.inputs["Roughness"].default_value = 0.2
        bsdf.inputs["Alpha"].default_value = 1.0
        for l in list(bsdf.inputs["Alpha"].links):
            nt.links.remove(l)
        m.surface_render_method = "DITHERED"


def process_textures(o, name, sizes, grade):
    done = {}
    for slot in o.data.materials:
        if not slot or not slot.use_nodes:
            continue
        litify(slot)
        nt = slot.node_tree
        # No emission on any imported prop (the generator ships an emissive control panel).
        for n in nt.nodes:
            if n.type == "BSDF_PRINCIPLED":
                n.inputs["Emission Strength"].default_value = 0.0
                for l in list(n.inputs["Emission Color"].links):
                    nt.links.remove(l)
        for n in list(nt.nodes):
            if n.type == "TEX_IMAGE" and not any(l for out in n.outputs for l in out.links):
                nt.nodes.remove(n)
        for n in nt.nodes:
            if n.type != "TEX_IMAGE" or not n.image:
                continue
            img = n.image
            if img.name in done:
                n.image = done[img.name]
                continue
            role = role_of(n, nt)
            size = sizes[0] if role == "color" else sizes[1]
            from PIL import Image
            # Read the source file directly (never img.pixels: 4K float buffers exhaust memory).
            pil = Image.open(bpy.path.abspath(img.filepath)).convert("RGBA")
            w, h = pil.size
            if role == "color" and name in CLEAN:
                pil = CLEAN[name](pil)
            if w > size or h > size:
                pil = pil.resize((min(w, size), min(h, size)), Image.LANCZOS)
            rgb = np.asarray(pil.convert("RGB")).astype(np.float32) / 255
            if rgb.reshape(-1, 3).std(0).max() < 0.012:  # flat colour / flat normal: no detail to keep
                pil = pil.resize((32, 32), Image.LANCZOS)
                rgb = np.asarray(pil.convert("RGB")).astype(np.float32) / 255
            if role == "color" and grade is not None:
                rgb = grade(rgb)
            has_alpha = role == "color" and np.asarray(pil)[..., 3].min() < 250
            out = Image.fromarray((rgb * 255 + 0.5).astype(np.uint8), "RGB")
            if has_alpha:
                out.putalpha(pil.getchannel("A"))
            stem = f"{name}-{bpy.path.clean_name(os.path.splitext(img.name)[0])}"
            path = os.path.join(LIBTEX, stem + (".png" if has_alpha or role == "data" else ".jpg"))
            out.save(path, **({"quality": 92} if path.endswith(".jpg") else {}))
            new = bpy.data.images.load(path)
            new.name = stem
            if role == "data":
                new.colorspace_settings.name = "Non-Color"
            done[img.name] = new
            n.image = new
        slot.name = f"lib-{name}-{slot.name}"


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    lib = bpy.data.collections.new("Asset Library")
    bpy.context.scene.collection.children.link(lib)
    report = {}
    for name, spec in SPECS.items():
        new, keep = import_parts(spec["src"], spec["pick"])
        for part in keep:  # per-part decimation (wheels, tyres) before the parts are joined
            for prefix, ratio in spec.get("dec", {}).items():
                if part.name == prefix or part.name.startswith(prefix + "_") or part.name.startswith(prefix + "."):
                    part.data = part.data.copy()
                    decimate(part, ratio)
        names = [x.name for x in new]
        o = join(keep, name)
        for nm in names:
            x = bpy.data.objects.get(nm)
            if x is not None and x is not o:
                bpy.data.objects.remove(x, do_unlink=True)
        for c in list(o.users_collection):
            c.objects.unlink(o)
        lib.objects.link(o)
        if spec.get("dec_all"):
            decimate(o, spec["dec_all"])
        size = recentre(o, spec["yaw"])
        if name == "jeep":  # drop the radio antennas: the car must fit a 1.5 m box
            bm = bmesh.new()
            bm.from_mesh(o.data)
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if max(v.co.z for v in f.verts) > 1.75], context="FACES")
            # and the wing mirrors (thin parts sticking out beside the cab above the bonnet line)
            cy = sum(v.co.y for v in bm.verts) / len(bm.verts)
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if min(v.co.z for v in f.verts) > 1.27
                                       and min(abs(v.co.y - cy) for v in f.verts) > 1.08], context="FACES")
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
            bm.to_mesh(o.data)
            bm.free()
            size = recentre(o, 0)
        if name == "mrap":  # drop the rear antenna mount that sticks up above the roof
            bm = bmesh.new()
            bm.from_mesh(o.data)
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if max(v.co.z for v in f.verts) > 2.47], context="FACES")
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
            bm.to_mesh(o.data)
            bm.free()
            size = recentre(o, 0)
        if name == "container":
            shorten(o, 5.0)
            size = recentre(o, 0)
        process_textures(o, name, spec["tex"], spec.get("grade"))
        o.data.update()
        tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
        report[name] = {"size": [round(s, 3) for s in size], "tris": tris, "materials": [m.name for m in o.data.materials]}
        print("ASSET", name, json.dumps(report[name]), flush=True)
        for img in list(bpy.data.images):
            if not img.users:
                bpy.data.images.remove(img)
        bpy.data.orphans_purge(do_recursive=True)
    # Drop everything the imports left behind (images, materials, meshes not used by the library).
    bpy.data.orphans_purge(do_recursive=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT)
    json.dump(report, open(os.path.join(HERE, "build", "library.json"), "w"), indent=1)
    print("saved", OUT)


if __name__ == "__main__":
    main()
