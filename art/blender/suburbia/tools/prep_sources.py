"""
Prepare the owner-downloaded Sketchfab models (CC BY 4.0) for SUBURBAN SHOWDOWN.

  /root/bpyenv/bin/python tools/prep_sources.py -- <downloads dir> [key,key,...]

<downloads dir> holds one folder per Sketchfab download (scene.gltf, scene.bin, textures/,
license.txt), as unzipped from the "glTF" download. For each model this keeps only the parts
the map uses, applies the transforms, puts every item in one frame (metres, front along +X,
origin at the centre of its footprint, base at z = 0), trims hidden geometry, decimates the
heavy ones, scales textures to what they cover on screen and drops the specular maps (the game
does not use them), then writes art/blender/suburbia/source/<key>.glb plus the licence text.
The build (build_suburbia.py) only ever reads these prepared files.
"""
import bpy, bmesh, os, sys, shutil, math
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "source"))
argv = sys.argv[sys.argv.index("--") + 1:]
SRC = argv[0]
ONLY = argv[1].split(",") if len(argv) > 1 else None
TMP = os.path.join(HERE, "..", "build", "prep-tex")

# key: (download folder, unit scale, rotation about Z to put the front on +X (degrees),
#       items {name: object-name filter}, texture size cap, decimate ratio, extra cleanup)
MODELS = {
    "bus": ("school_bus", 1.0, 90, {"bus": None}, 1024, 0.5, None),
    "truck_cab": ("box_truck_game_asset", 0.3, 180, {"truck_cab": None}, 512, 1.0, "truck"),
    "car_duke": ("duke_69_-_low_poly_model", 1.0, 0, {"car_duke": None}, 512, 0.25, "car"),
    "car_negotiator": ("negotiator_80_-_low_poly_model", 1.0, 0, {"car_negotiator": None}, 512, 0.25, "car"),
    "car_wagon": ("fairheaven_sw_84_-_low_poly_model", 1.0, 0, {"car_wagon": None}, 512, 0.25, "car"),
    "picket": ("green__white_picket_fence", 1.0, 0, {"picket": None}, 256, 0.35, None),
    "shed": ("worn_shed_pbr_game-ready", 0.01, 90, {"shed": None}, 512, 1.0, None),
    "pole": ("utility_pole_pbr", 0.01, 0, {"pole": None}, 256, 0.35, None),
    "mailbox": ("old_us_mailbox", 1.0, -90, {"mailbox": None}, 256, 0.5, None),
    "picnic": ("picnic_table_-_low_poly", 1.0, 0, {"picnic": None}, 256, 1.0, None),
    "tower": ("radio_tower", 0.01, 0, {"tower": lambda n: not n.startswith("Floor")}, 256, 1.0, "tower"),
    "oak": ("oak_tree__game_ready", 1.0, 0, {"oak": None}, 512, 0.3, "oak"),
    "bushes": ("bush_pack_-_game_ready_3d_plants_fbxobjglb", 1.0, 0, {
        "bush_abutilon": lambda n: n.lower().startswith("abutilon"),
        "bush_cassia": lambda n: n.lower().startswith("cassia"),
        "bush_fead": lambda n: n.lower().startswith("fead"),
        "bush_greenfead": lambda n: n.lower().startswith("green fead"),
    }, 256, 0.3, None),
    "props": ("pbr_street_props_pack_game_ready", 1.0, 0, {
        "bin_red": ("Object_12", "Object_14", "Object_16", "Object_18"),
        "bin_blue": ("Object_20", "Object_22", "Object_24", "Object_26"),
        "bin_yellow": ("Object_28", "Object_30", "Object_32", "Object_34"),
        "bin_green": ("Object_36", "Object_38", "Object_40", "Object_42"),
        "dumpster": ("Object_80", "Object_82"),
        "streetlight": ("Object_112",),
        "hydrant": ("Object_108",),
        "box_s": ("Object_50",), "box_m": ("Object_52",), "box_l": ("Object_54",), "box_h": ("Object_56",),
        "trashbag": ("Object_72",),
        "bench": ("Object_76", "Object_78"),
    }, 256, 0.6, None),
    "signs": ("street_asset_pack", 1.0, 0, {
        "sign_stop": lambda n: n.startswith("stop_"),
        "sign_giveway": lambda n: n.startswith("give_way_"),
        "sign_nowaiting": lambda n: n.startswith("no_waiting_"),
        "cone": lambda n: n.startswith("Cone_"),
    }, 256, 1.0, None),
    "furniture": ("low_poly_furnitures_full_bundle", 1.0, 0, {
        "bed_white": ("Object_48",), "bed_blue": ("Object_10",),
        "sofa_cream": ("Object_38",), "sofa_black": ("Object_20",),
        "dresser": ("Object_54",), "wardrobe": ("Object_56",),
        "fireplace_white": ("Object_58",), "fireplace_stone": ("Object_4",),
    }, 256, 1.0, None),
}


def picked(o, flt):
    if flt is None:
        return True
    if callable(flt):
        return flt(o.name)
    return any(o.name == f or o.name.startswith(f + "_") or o.name.startswith(f + ".") for f in flt)


def join(objs, name):
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


def bake_world(o):
    """Apply the full world matrix to the mesh and clear the parent."""
    mw = o.matrix_world.copy()
    o.parent = None
    o.data.transform(mw)
    o.matrix_world = Matrix.Identity(4)


def delete_verts(o, keep):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.co)], context="VERTS")
    bm.to_mesh(o.data)
    bm.free()


def cleanup(o, kind):
    if kind == "truck":
        # Keep the cab, bonnet, front wheels and the rear axle (under the new cargo box); drop
        # the white cargo box and the rear bumper. Frame here: rotated (x' = -x) and scaled
        # x0.3 (model units -> metres), not yet re-centred.
        delete_verts(o, lambda c: c.x > -6.8 * 0.3 or (-21.6 * 0.3 < c.x < -18.4 * 0.3 and c.z < -0.2 * 0.3))
    if kind == "car":
        # Underside detail nobody sees from 1.6 m.
        pass


def brand_tower():
    """Repaint the radio tower's red bands PVPSPINARENA violet (hue shift of the red pixels)."""
    import numpy as np
    for img in bpy.data.images:
        if "color0" not in img.name.lower() or not img.size[0]:
            continue
        px = np.array(img.pixels[:]).reshape(-1, 4)
        r, g, b = px[:, 0], px[:, 1], px[:, 2]
        red = (r > g * 1.6) & (r > b * 1.6)
        lum = r[red] * 0.6 + 0.2
        px[red, 0], px[red, 1], px[red, 2] = lum * 0.42, lum * 0.14, lum * 0.95
        img.pixels[:] = px.ravel()
        img.update()


def scale_textures(cap):
    os.makedirs(TMP, exist_ok=True)
    for k, img in enumerate(list(bpy.data.images)):
        if not img.users:
            continue
        if not img.size[0]:
            print("  (image without pixels)", img.name, img.users)
            continue
        name = img.name
        lower = name.lower()
        w, h = img.size
        f = min(1.0, cap / max(w, h))
        if "normal" in lower:
            f = min(f, 0.5)
        if f < 1.0:
            img.scale(max(4, int(w * f)), max(4, int(h * f)))
        safe = "".join(ch if ch.isalnum() else "_" for ch in name)
        path = os.path.join(TMP, f"{k:03d}-{safe}.png")
        img.filepath_raw = path
        img.file_format = "PNG"
        img.save()
        # Grey / 1-bit sources make the exporter's WebP conversion fail: store them as RGB.
        from PIL import Image as PImage
        pim = PImage.open(path)
        if pim.mode not in ("RGB", "RGBA"):
            pim.convert("RGBA" if "A" in pim.mode else "RGB").save(path)
        # The importer packs its images; swap in the scaled file so the exporter reads it.
        new = bpy.data.images.load(path)
        new.colorspace_settings.name = img.colorspace_settings.name
        img.user_remap(new)
        bpy.data.images.remove(img)


KEEP_DETAIL = {"shed"}   # models that keep their normal / metallic-roughness maps
CAR_MATS = (  # (substring of the source material name, shared flat material, colour, roughness, metallic)
    (("Glass", "Transperent"), "car_glass", (0.035, 0.04, 0.05), 0.08, 0.2),
    (("Lights",), "car_lights", (0.75, 0.72, 0.66), 0.2, 0.3),
    (("Badges", "Numberplates", "Misk"), "car_trim", (0.62, 0.62, 0.64), 0.3, 0.7),
    (("Interior",), "car_interior", (0.07, 0.065, 0.06), 0.8, 0.0),
)


def flat(name, colour, rough, metal):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*colour, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m


def simplify_materials(key, kind):
    """Game budget: keep only the base colour texture (normal, metallic-roughness and emissive
    maps dropped, constant roughness instead), except for KEEP_DETAIL models; the cars' many
    small materials (glass, lights, badges, plates, interior) become shared flat materials."""
    if kind == "car":
        for o in bpy.context.scene.objects:
            if o.type != "MESH":
                continue
            for i, m in enumerate(o.data.materials):
                for keys, name, col, r, mt in CAR_MATS:
                    if m and any(k in m.name for k in keys):
                        o.data.materials[i] = flat(name, col, r, mt)
                        break
    if key in KEEP_DETAIL:
        return
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        nt = m.node_tree
        b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        for n in list(nt.nodes):
            if n.type == "TEX_IMAGE" and n.image and any(t in n.image.name.lower() for t in
                                                         ("normal", "metallic", "roughness", "emissive", "occlusion")):
                nt.nodes.remove(n)
        if b and key not in ("oak", "bushes"):
            # Opaque props: an alpha link makes the exporter composite (and fail on) a new image.
            for l in list(b.inputs["Alpha"].links):
                nt.links.remove(l)
            b.inputs["Alpha"].default_value = 1.0
        if b:
            if not b.inputs["Roughness"].links:
                b.inputs["Roughness"].default_value = max(0.35, b.inputs["Roughness"].default_value)
            if not b.inputs["Metallic"].links and "Body" not in m.name and "bodymat" not in m.name.lower():
                b.inputs["Metallic"].default_value = min(0.2, b.inputs["Metallic"].default_value)
            if "Emission Strength" in b.inputs:
                b.inputs["Emission Strength"].default_value = 0.0
    for img in list(bpy.data.images):
        if not img.users:
            bpy.data.images.remove(img)


def drop_specular():
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        nt = m.node_tree
        for n in list(nt.nodes):
            if n.type == "TEX_IMAGE" and n.image and "specular" in n.image.name.lower():
                nt.nodes.remove(n)
        for n in nt.nodes:
            if n.type == "BSDF_PRINCIPLED":
                for inp in ("Specular IOR Level", "Specular Tint"):
                    if inp in n.inputs:
                        for l in list(n.inputs[inp].links):
                            nt.links.remove(l)


def prep(key, spec):
    folder, unit, rot, items, cap, ratio, kind = spec
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, folder, "scene.gltf"))
    for o in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
        if o.data.users > 1:
            o.data = o.data.copy()
        bake_world(o)
    turn = Matrix.Rotation(math.radians(rot), 4, "Z") @ Matrix.Scale(unit, 4)
    out = []
    for name, flt in items.items():
        done = {x.name for x in out}
        objs = [o for o in bpy.context.scene.objects
                if o.type == "MESH" and o.name not in done and picked(o, flt)]
        if key == "bushes":
            objs = [o for o in objs if not o.name.startswith("Cube")]
        assert objs, (key, name)
        o = join(objs, name)
        o.data.transform(turn)
        cleanup(o, kind)
        vs = [v.co for v in o.data.vertices]
        lo = Vector([min(v[i] for v in vs) for i in range(3)])
        hi = Vector([max(v[i] for v in vs) for i in range(3)])
        o.data.transform(Matrix.Translation(Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))))
        if ratio < 1.0:
            mod = o.modifiers.new("dec", "DECIMATE")
            mod.ratio = ratio
            mod.use_collapse_triangulate = True
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.modifier_apply(modifier="dec")
        out.append(o)
        dims = hi - lo
        print(f"  {name}: {dims.x:.3f} x {dims.y:.3f} x {dims.z:.3f} m, {len(o.data.polygons)} faces after decimation")
    if kind == "oak":
        # A light far-away version for the trees round the block.
        far = out[0].copy()
        far.data = out[0].data.copy()
        far.name = far.data.name = "oak_far"
        bpy.context.scene.collection.objects.link(far)
        mod = far.modifiers.new("dec", "DECIMATE")
        mod.ratio = 0.15
        bpy.context.view_layer.objects.active = far
        bpy.ops.object.modifier_apply(modifier="dec")
        out.append(far)
        print(f"  oak_far: {len(far.data.polygons)} faces")
    for o in list(bpy.context.scene.objects):
        if o not in out:
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    drop_specular()
    simplify_materials(key, kind)
    if kind == "tower":
        brand_tower()
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    scale_textures(cap)
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, key + ".glb"), export_format="GLB",
                              export_image_format="WEBP", export_yup=True, export_apply=True,
                              export_animations=False, export_extras=False)
    lic = os.path.join(SRC, folder, "license.txt")
    shutil.copy(lic, os.path.join(OUT, key + ".license.txt"))
    print("PREPARED", key, os.path.getsize(os.path.join(OUT, key + ".glb")) // 1024, "KB")


for key, spec in MODELS.items():
    if ONLY and key not in ONLY:
        continue
    prep(key, spec)
