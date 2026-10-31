"""Inspect the shipped AK viewmodel GLB: parts, triangle counts, bounds, pivots."""
import bpy, sys, mathutils
glb = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
dg = bpy.context.evaluated_depsgraph_get()
for o in sorted(bpy.data.objects, key=lambda o: o.name):
    line = f"{o.type:9s} {o.name:28s} parent={o.parent.name if o.parent else '-':22s}"
    if o.type == "MESH":
        me = o.data
        tris = sum(len(p.vertices) - 2 for p in me.polygons)
        bb = [o.matrix_world @ mathutils.Vector(c) for c in o.bound_box]
        lo = [min(v[i] for v in bb) for i in range(3)]; hi = [max(v[i] for v in bb) for i in range(3)]
        sharp = sum(1 for e in me.edges if e.use_edge_sharp)
        line += f" tris={tris:6d} size=({hi[0]-lo[0]:.3f},{hi[1]-lo[1]:.3f},{hi[2]-lo[2]:.3f}) uvs={len(me.uv_layers)} mats={[m.name for m in me.materials]}"
    else:
        p = o.matrix_world.translation
        line += f" at=({p.x:.3f},{p.y:.3f},{p.z:.3f})"
    print(line)
