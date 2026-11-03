"""Report each downloaded source model: bounds, triangles, objects (for the import table)."""
import bpy, sys, os, json
from mathutils import Vector
src = sys.argv[sys.argv.index("--") + 1]
out = {}
for name in sorted(os.listdir(src)):
    g = os.path.join(src, name, "scene.gltf")
    if not os.path.exists(g):
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=g)
    dg = bpy.context.evaluated_depsgraph_get()
    tris = 0; lo = Vector((1e9,)*3); hi = Vector((-1e9,)*3); objs = []
    for o in bpy.context.scene.objects:
        if o.type != "MESH":
            continue
        e = o.evaluated_get(dg); m = e.to_mesh(); m.calc_loop_triangles()
        tris += len(m.loop_triangles)
        for v in m.vertices:
            w = o.matrix_world @ v.co
            lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
        objs.append((o.name, len(m.loop_triangles), [round(min(p[i] for p in bb), 2) for i in range(3)], [round(max(p[i] for p in bb), 2) for i in range(3)]))
        e.to_mesh_clear()
    imgs = sorted({(i.name, tuple(i.size)) for i in bpy.data.images})
    out[name] = {"tris": tris, "min": [round(x, 2) for x in lo], "max": [round(x, 2) for x in hi], "objects": len(objs),
                 "images": [f"{n} {s[0]}x{s[1]}" for n, s in imgs][:12], "objs": objs[:80]}
    print("DONE", name, tris, flush=True)
json.dump(out, open(sys.argv[sys.argv.index("--") + 2], "w"), indent=1)
