"""
Build the tactical gloves for the first-person rig (Blender, headless).

  python build_gloves.py -- <rig.json> <outdir> [--lp-voxel 0.0017] [--hp-voxel 0.0007]
      [--tris 7500] [--textures] [--size 2048]

Per hand: sculpted SDF (glove_sdf.py) -> marching cubes -> game mesh (decimated, smooth) with
skin weights from the same field -> one shared UV atlas for both hands. With --textures it also
builds the high-poly, bakes macro normals / AO from it and writes the PBR set (glove_textures.py).

Outputs (outdir):
  gloves.json + gloves.bin   game mesh in bind space, joints indexed into the shipped skin
  gloves.blend               editable source (game + high-poly meshes, UVs, weights)
"""
import bpy, bmesh, sys, os, math, json, time
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import glove_sdf as G

argv = sys.argv[sys.argv.index("--") + 1:]
rig_path, outdir = argv[:2]


def opt(name, default):
    return type(default)(argv[argv.index(name) + 1]) if name in argv else default


LP_VOXEL = opt("--lp-voxel", 0.0017)
HP_VOXEL = opt("--hp-voxel", 0.0007)
TRIS = opt("--tris", 7500)
SIZE = opt("--size", 2048)
TEXTURES = "--textures" in argv
os.makedirs(outdir, exist_ok=True)
rig = G.load_rig(rig_path)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene


def to_blender(p):  # glTF (x, y, z) -> Blender (x, -z, y)
    p = np.asarray(p)
    return np.stack([p[..., 0], -p[..., 2], p[..., 1]], -1)


def from_blender(p):
    p = np.asarray(p)
    return np.stack([p[..., 0], p[..., 2], -p[..., 1]], -1)


def make_object(name, verts_world_gltf, faces):
    me = bpy.data.meshes.new(name)
    me.from_pydata(to_blender(verts_world_gltf).tolist(), [], faces[:, ::-1].tolist())
    me.update()
    o = bpy.data.objects.new(name, me)
    sc.collection.objects.link(o)
    return o


def apply_modifier(o, mod):
    with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
        bpy.ops.object.modifier_apply(modifier=mod.name)


hands = {}
for side in ("L", "R"):
    h = G.HandFrame(rig, side)
    t0 = time.time()
    v, f, parts, info = G.surface(h, LP_VOXEL)
    lp = make_object(f"glove_{side}", h.to_world(v), f)
    # Collapse decimation keeps curvature where it matters (knuckles, guard rim, fingertips).
    dec = lp.modifiers.new("dec", "DECIMATE")
    dec.ratio = min(1.0, TRIS / len(f))
    apply_modifier(lp, dec)
    # Light smoothing evens the triangle fan sizes left by the decimator without shrinking much.
    sm = lp.modifiers.new("smooth", "CORRECTIVE_SMOOTH")
    sm.iterations = 4
    sm.use_only_smooth = True
    sm.smooth_type = "LENGTH_WEIGHTED"
    apply_modifier(lp, sm)
    lp.data.shade_smooth()
    hands[side] = (h, lp, parts, info)
    print(side, "game mesh", len(lp.data.polygons), "tris", f"{time.time() - t0:.1f}s")

# --- Skin weights from the field -------------------------------------------------------------
for side, (h, lp, parts, info) in hands.items():
    me = lp.data
    world = from_blender(np.array([v.co for v in me.vertices]))
    metres = (world - h.wrist_world) * G.HAND_SCALE
    _, d_parts = G.evaluate(h, parts, info, metres, want_parts=True)
    names, order, top = G.bone_weights(h, parts, d_parts)
    groups = {n: lp.vertex_groups.new(name=n) for n in names}
    for i in range(len(me.vertices)):
        for j in range(order.shape[1]):
            w = float(top[i, j])
            if w > 0:
                groups[names[order[i, j]]].add([i], w, "REPLACE")

# --- One UV atlas for both hands ------------------------------------------------------------------
bpy.ops.object.select_all(action="DESELECT")
for _, lp, _, _ in hands.values():
    lp.select_set(True)
    lp.data.uv_layers.new(name="UVMap")
bpy.context.view_layer.objects.active = hands["L"][1]
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(62), island_margin=0.0, scale_to_bounds=False, correct_aspect=True)
bpy.ops.uv.average_islands_scale()
bpy.ops.uv.pack_islands(udim_source="CLOSEST_UDIM", rotate=True, margin_method="FRACTION", margin=0.006, shape_method="CONCAVE")
bpy.ops.object.mode_set(mode="OBJECT")

if TEXTURES:
    import glove_textures

    glove_textures.build(hands, outdir, SIZE, HP_VOXEL, to_blender, from_blender, reuse="--reuse-bakes" in argv)


# --- Export the game mesh in bind space -----------------------------------------------------------
def export(hands):
    bind_inv = np.linalg.inv(np.array(rig["bindSpace"]).reshape(4, 4).T)
    joint_index = {n: j["index"] for n, j in rig["joints"].items()}
    P, N, UV, T, J, W, I = [], [], [], [], [], [], []
    base = 0
    for side in ("L", "R"):
        h, lp, _, _ = hands[side]
        me = lp.data
        me.calc_tangents(uvmap="UVMap")
        uv = me.uv_layers["UVMap"].data
        group_names = [g.name for g in lp.vertex_groups]
        vw = []
        for v in me.vertices:
            gs = sorted(((g.weight, joint_index[group_names[g.group]]) for g in v.groups if g.weight > 0), reverse=True)[:4]
            total = sum(w for w, _ in gs)
            gs = [(w / total, j) for w, j in gs] + [(0.0, 0)] * (4 - len(gs))
            vw.append(gs)
        key_index = {}
        co_s, n_s, t_s, sign_s = [], [], [], []
        for poly in me.polygons:
            corners = []
            for li in poly.loop_indices:
                loop = me.loops[li]
                key = (loop.vertex_index, round(uv[li].uv[0], 6), round(uv[li].uv[1], 6), *[round(c, 4) for c in loop.normal])
                if key not in key_index:
                    key_index[key] = base + len(key_index)
                    co_s.append(from_blender(np.array(me.vertices[loop.vertex_index].co)))
                    n_s.append(from_blender(np.array(loop.normal)))
                    t_s.append(from_blender(np.array(loop.tangent)))
                    sign_s.append(loop.bitangent_sign)
                    # glTF UV origin is top-left.
                    UV.append((uv[li].uv[0], 1.0 - uv[li].uv[1]))
                    ws = vw[loop.vertex_index]
                    J.append([j for _, j in ws])
                    W.append([w for w, _ in ws])
                corners.append(key_index[key])
            for k in range(1, len(corners) - 1):
                I.append((corners[0], corners[k], corners[k + 1]))
        # Sculpted on the relaxed hand: skin into the rig's bind pose with the same weights.
        index_name = {j["index"]: n for n, j in rig["joints"].items()}
        Js = np.array(J[base:])
        bones = np.vectorize(index_name.get)(Js)
        weights = np.array(W[base:])
        metres = (np.array(co_s) - h.wrist_world) * G.HAND_SCALE
        bound, normals = h.to_bind(metres, np.array(n_s), bones, weights)
        _, tangents = h.to_bind(metres, np.array(t_s), bones, weights)
        world = h.wrist_world + bound / G.HAND_SCALE
        P.extend((np.c_[world, np.ones(len(world))] @ bind_inv.T)[:, :3])
        N.extend(normals)
        T.extend(np.c_[tangents, np.array(sign_s)])
        base += len(key_index)
    arrays = {
        "POSITION": np.array(P, np.float32),
        "NORMAL": np.array(N, np.float32),
        "TANGENT": np.array(T, np.float32),
        "TEXCOORD_0": np.array(UV, np.float32),
        "JOINTS_0": np.array(J, np.uint16),
        "WEIGHTS_0": np.array(W, np.float32),
        "indices": np.array(I, np.uint32),
    }
    meta, offset = {}, 0
    with open(os.path.join(outdir, "gloves.bin"), "wb") as fh:
        for name, a in arrays.items():
            fh.write(a.tobytes())
            meta[name] = {"offset": offset, "count": int(a.shape[0]), "dtype": str(a.dtype), "shape": list(a.shape)}
            offset += a.nbytes
    with open(os.path.join(outdir, "gloves.json"), "w") as fh:
        json.dump(meta, fh)
    print("exported", len(P), "vertices", len(I), "triangles")


export(hands)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(outdir, "gloves.blend"))
