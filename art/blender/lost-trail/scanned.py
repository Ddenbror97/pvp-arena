"""
Optional scanned CC0 vegetation and rocks for LOST TRAIL (see source/SCANNED-ASSETS.md).

build_trail.py asks `scanned_library(slot, ...)` for each replaceable library slot. When
`source/scanned/<slot>/` holds glTF/GLB downloads, each file becomes one library variant:
imported, flattened into a single mesh, based at the origin, scaled to the slot's height,
decimated to the slot's triangle budget, its textures capped at 1024 px and its materials
renamed so the runtime treats alpha-tested ones as foliage (wind, alpha-to-coverage). With no
files the procedural library is used, so the build never depends on downloads.

Slots only cover decoration that has no collision. Gameplay rocks, walls and giant trunks stay
procedural because they are built inside their collision boxes.
"""
import glob
import os

import bpy
import bmesh
from mathutils import Matrix, Vector

# slot: target height (m), triangle budget per variant, cast into the static shadow map.
SLOTS = {
    "fern": dict(height=1.1, tris=1200, shadow=False),
    "bush": dict(height=1.5, tris=1500, shadow=False),
    "palm": dict(height=10.0, tris=4000, shadow=True),
    "reeds": dict(height=1.0, tris=600, shadow=False),
    "rock": dict(height=1.1, tris=900, shadow=True),
}
MAX_VARIANTS = 2  # each variant is one instanced draw per culling section
MAX_TEXTURE = 1024


def scanned_files(root, slot):
    folder = os.path.join(root, slot)
    files = sorted(glob.glob(os.path.join(folder, "*.gltf")) + glob.glob(os.path.join(folder, "*.glb")))
    return files[:MAX_VARIANTS]


def _flatten(objs, name, library):
    """Bake every imported mesh's world transform, join them into one object in `library`."""
    meshes = [o for o in objs if o.type == "MESH"]
    for o in meshes:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    with bpy.context.temp_override(selected_editable_objects=meshes, active_object=meshes[0]):
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1:
        with bpy.context.temp_override(active_object=meshes[0], selected_editable_objects=meshes):
            bpy.ops.object.join()
    main = meshes[0]
    for o in objs:
        if o is not main and o.name in bpy.data.objects:
            bpy.data.objects.remove(o, do_unlink=True)
    for c in list(main.users_collection):
        c.objects.unlink(main)
    library.objects.link(main)
    main.name = main.data.name = name
    return main


def _normalise(obj, height):
    """Base centred on the origin, z min on the ground, scaled to `height`."""
    me = obj.data
    lo = Vector((min(v.co[i] for v in me.vertices) for i in range(3)))
    hi = Vector((max(v.co[i] for v in me.vertices) for i in range(3)))
    me.transform(Matrix.Translation((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)))
    s = height / max(1e-3, hi.z - lo.z)
    me.transform(Matrix.Scale(s, 4))


def _decimate(obj, budget):
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    if tris <= budget:
        return tris
    mod = obj.modifiers.new("budget", "DECIMATE")
    mod.ratio = budget / tris
    with bpy.context.temp_override(object=obj, active_object=obj):
        bpy.ops.object.modifier_apply(modifier="budget")
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def _materials(obj, slot):
    for i, mat in enumerate(obj.data.materials):
        if mat is None:
            continue
        mat.name = f"scan-{slot}-{i}"
        if mat.node_tree:
            for node in mat.node_tree.nodes:
                img = getattr(node, "image", None)
                if img and max(img.size) > MAX_TEXTURE:
                    w, h = img.size
                    k = MAX_TEXTURE / max(w, h)
                    img.scale(max(1, int(w * k)), max(1, int(h * k)))
        # Foliage is double-sided and alpha-tested (the glTF importer keeps MASK cut-outs).
        if slot != "rock":
            mat.use_backface_culling = False


def scanned_library(slot, root, library):
    """Library objects built from source/scanned/<slot>/, or [] to keep the procedural ones."""
    spec = SLOTS[slot]
    out = []
    for k, path in enumerate(scanned_files(root, slot)):
        before = set(bpy.data.objects)
        if path.endswith(".glb") or path.endswith(".gltf"):
            bpy.ops.import_scene.gltf(filepath=path)
        new = [o for o in bpy.data.objects if o not in before]
        if not any(o.type == "MESH" for o in new):
            print("SCANNED skip (no mesh)", path)
            continue
        obj = _flatten(new, f"lib-{slot}-scan{k}", library)
        _normalise(obj, spec["height"])
        tris = _decimate(obj, spec["tris"])
        _materials(obj, slot)
        if not spec["shadow"]:
            obj["noShadow"] = True
        print("SCANNED", slot, os.path.basename(path), tris, "tris")
        out.append(obj)
    return out
