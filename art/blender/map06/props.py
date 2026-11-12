"""
SANDGATE (map 06) street life: places the prop library (props_assets.py → build/props-library.blend)
where layout.py's PROPS put them (build/layout.json "props", each enclosed by its collision
boxes), plus the decoration out of reach: outdoor air-conditioning units hung on the facades along
the lanes and satellite dishes on the roofs, both found by ray casts against the built town
(sandgate.blend). Exports build/sandgate-props-raw.glb with every prop under one culling section,
which instance_sections.mjs turns into GPU-instanced batches and merge_props.mjs adds to the map.

  /root/bpyenv/bin/python art/blender/map06/props.py
"""
import bpy, json, math, os, random, sys
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from kit import B  # noqa: E402

OUT = os.path.join(HERE, "build", "sandgate-props-raw.glb")
LAYOUT = os.path.join(HERE, "build", "layout.json")
TOWN = os.path.join(HERE, "sandgate.blend")
LIBRARY = os.path.join(HERE, "build", "props-library.blend")
# Small props neither cast shadows (keeps the shadow pass cheap) nor need to.
NO_SHADOW = {"pot", "bag", "rubble", "tires", "ac", "dish", "shrub"}

# Facade units: a point on the wall's line and the direction out of the wall (into the lane), and
# the lane's floor (0 here); the cast toward the wall finds its face. Bottom 2.35 m over the floor
# (over a player's head).
AC = [
    (-27.0, 24.0, (0, 1)), (-16.0, 24.0, (0, 1)), (-20.0, 31.0, (0, -1)), (-30.0, 12.0, (-1, 0)),
    (-30.0, -6.5, (-1, 0)), (-38.0, 19.0, (1, 0)), (-38.0, -27.5, (1, 0)), (-10.0, -3.5, (1, 0)),
    (-5.5, -14.0, (0, 1)), (0.0, 6.0, (-1, 0)), (4.0, 24.5, (1, 0)), (22.0, 5.0, (1, 0)),
    (28.0, 8.5, (-1, 0)), (25.0, 33.0, (0, 1)), (12.0, -30.0, (0, -1)), (34.0, 26.0, (-1, 0)),
]
# Rooftop dishes: points over the building blocks near the lanes (the roof found by a cast down,
# higher than ROOF_MIN).
DISH = [(-26.0, 22.6), (-14.0, 21.5), (-28.0, -9.0), (-20.0, 5.0), (12.0, -9.0), (20.0, 8.0), (2.0, 4.5),
        (12.0, 18.0), (26.0, 30.0), (-12.0, -18.5), (12.0, -27.5), (-33.5, -12.0), (16.0, 35.5)]
ROOF_MIN = 5.0
PROPS_KEY = "props"  # the layout.json list of placed props
# Props assembled from several library pieces: model → (piece, x, y, z, yaw) in the model's frame
# (game axes: x along the model, z toward its front).
ASSEMBLIES = {}


def find_mounts():
    """Ray casts against the built town: (AC: wall face point, normal), (dish: roof point)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # The town's meshes appended into an empty scene (opening the .blend itself crashes the bpy
    # module); no collision proxies, markers or the asset library's originals.
    with bpy.data.libraries.load(TOWN, link=False) as (src, dst):
        dst.objects = [n for n in src.objects if not n.startswith(("collision", "lib-", "bombsite", "spawn"))]
    for o in dst.objects:
        if o is not None and o.type == "MESH":
            bpy.context.scene.collection.objects.link(o)
    dg = bpy.context.evaluated_depsgraph_get()
    sc = bpy.context.scene
    ac, dish = [], []
    for x, z, (nx, nz), *floor in AC:
        fl = floor[0] if floor else 0.0
        hit = None
        for along in (0.0, 0.6, -0.6, 1.2, -1.2):
            px, pz = x + nx * 1.5 + (along if nx == 0 else 0), z + nz * 1.5 + (along if nz == 0 else 0)
            # The face must be flat behind the whole unit: three casts across it, all within 2 cm.
            hits = []
            for side in (-0.36, 0.0, 0.36):
                for dy in (0.05, 0.55):
                    ox, oz = px + (side if nx == 0 else 0), pz + (side if nz == 0 else 0)
                    ok, loc, nrm, *_ = sc.ray_cast(dg, B(ox, fl + 2.35 + dy, oz), B(-nx, 0, -nz), distance=2.2)
                    hits.append((ok, loc, nrm))
            if all(h[0] for h in hits):
                d = [((h[1] - B(px, 0, pz)).dot(B(-nx, 0, -nz))) for h in hits]
                n = hits[1][2]
                if max(d) - min(d) < 0.02 and abs(n.dot(B(nx, 0, nz))) > 0.98:
                    loc = hits[2][1]
                    hit = (loc.x, -loc.y, nx, nz, fl)
                    break
        print("AC", x, z, "->", hit, flush=True)
        if hit:
            ac.append(hit)
    for x, z in DISH:
        ok, loc, nrm, *_ = sc.ray_cast(dg, B(x, 40, z), B(0, -1, 0), distance=60)
        flat = ok and nrm.z > 0.97 and loc.z > ROOF_MIN  # a roof, not the street
        if flat:  # a roof with room for the dish (no parapet edge within 0.7 m)
            for dx, dz in ((0.7, 0), (-0.7, 0), (0, 0.7), (0, -0.7)):
                ok2, loc2, n2, *_ = sc.ray_cast(dg, B(x + dx, 40, z + dz), B(0, -1, 0), distance=60)
                flat = flat and ok2 and abs(loc2.z - loc.z) < 0.03 and n2.z > 0.97
        print("DISH", x, z, "->", (round(loc.z, 2) if ok else None), "flat" if flat else "skip", flush=True)
        if flat:
            dish.append((x, loc.z, z))
    return ac, dish


def main():
    ac, dish = find_mounts()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    with bpy.data.libraries.load(LIBRARY, link=False) as (src, dst):
        dst.objects = [n for n in src.objects if n.startswith("lib-")]
    lib = {o.name[4:]: o for o in dst.objects}
    coll = bpy.data.collections.new("Street Props")
    bpy.context.scene.collection.children.link(coll)
    section = bpy.data.objects.new("section-Street_Props", None)
    coll.objects.link(section)
    rnd = random.Random(6)

    def place(model, x, y, z, yaw, ys=1.0):
        o = bpy.data.objects.new(model, lib[model].data)
        o.location = B(x, y, z)
        o.rotation_euler = (0, 0, yaw)
        o.scale = (1, 1, ys)
        o.parent = section
        if model in NO_SHADOW:
            o["noShadow"] = True
        coll.objects.link(o)
        return o

    counts = {}
    for p in json.load(open(LAYOUT))[PROPS_KEY]:
        y = p.get("y", 0.0)
        if p["model"] in ASSEMBLIES:
            c, s_ = math.cos(p["yaw"]), math.sin(p["yaw"])
            for piece, lx, ly, lz, lyaw in ASSEMBLIES[p["model"]]:
                # game axes: x' = x c + z s, z' = -x s + z c (a Blender yaw about up)
                place(piece, p["x"] + lx * c + lz * s_, y + ly, p["z"] - lx * s_ + lz * c, p["yaw"] + lyaw)
        else:
            place(p["model"], p["x"], y, p["z"], p["yaw"], p.get("yscale", 1.0))
        counts[p["model"]] = counts.get(p["model"], 0) + 1
    for x, z, nx, nz, fl in ac:
        # The unit's back (model -y, game +z) against the wall, its fan out into the lane.
        yaw = math.atan2(nx, nz)
        place("ac", x + nx * 0.19, fl + 2.35, z + nz * 0.19, yaw)
        counts["ac"] = counts.get("ac", 0) + 1
    for x, y, z in dish:
        place("dish", x, y, z, rnd.uniform(-0.6, 0.6) + math.pi)  # aimed roughly south
        counts["dish"] = counts.get("dish", 0) + 1
    print("PROPS", json.dumps(counts), flush=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=True, export_yup=True,
                              export_texcoords=True, export_normals=True, export_materials="EXPORT",
                              export_image_format="WEBP", export_image_quality=82, export_extras=True,
                              export_animations=False, export_vertex_color="ACTIVE", export_all_vertex_colors=False,
                              use_active_scene=True)
    print("exported", OUT)


if __name__ == "__main__":
    main()
