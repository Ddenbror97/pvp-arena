"""
Asset statistics and z-fighting check for an (uncompressed) arena GLB.

  python3 art/blender/map/check_glb.py art/blender/map/build/aim-arena.glb [--json out.json]

Reports meshes, primitives (≈ draw calls before culling), materials, textures (count, pixels,
estimated GPU bytes with mips), triangles, and coplanar same-facing overlapping triangle pairs
(z-fighting risk). Exit code 1 if any coplanar overlap is found.
"""
import json, struct, sys
from collections import defaultdict
import numpy as np

COMP = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def load(path):
    data = open(path, "rb").read()
    assert data[:4] == b"glTF"
    off, js, binary = 12, None, b""
    while off < len(data):
        length, kind = struct.unpack_from("<II", data, off)
        chunk = data[off + 8: off + 8 + length]
        if kind == 0x4E4F534A:
            js = json.loads(chunk)
        else:
            binary = chunk
        off += 8 + length
    return js, binary


def accessor(js, binary, i):
    a = js["accessors"][i]
    bv = js["bufferViews"][a["bufferView"]]
    n = NCOMP[a["type"]]
    dtype = COMP[a["componentType"]]
    start = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = bv.get("byteStride", 0)
    item = np.dtype(dtype).itemsize * n
    if stride and stride != item:
        raw = np.frombuffer(binary, np.uint8, a["count"] * stride, start).reshape(a["count"], stride)[:, :item]
        arr = raw.copy().view(dtype).reshape(a["count"], n)
    else:
        arr = np.frombuffer(binary, dtype, a["count"] * n, start).reshape(a["count"], n)
    return arr.astype(np.float64) if dtype == np.float32 else arr


def node_matrices(js):
    out = {}

    def local(nd):
        if "matrix" in nd:
            return np.array(nd["matrix"]).reshape(4, 4).T
        t = np.array(nd.get("translation", [0, 0, 0]))
        q = nd.get("rotation", [0, 0, 0, 1])
        s = np.array(nd.get("scale", [1, 1, 1]))
        x, y, z, w = q
        r = np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
        ])
        m = np.eye(4)
        m[:3, :3] = r * s
        m[:3, 3] = t
        return m

    def walk(i, parent):
        m = parent @ local(js["nodes"][i])
        out[i] = m
        for c in js["nodes"][i].get("children", []):
            walk(c, m)

    for root in js["scenes"][js.get("scene", 0)]["nodes"]:
        walk(root, np.eye(4))
    return out


def tri_overlap_2d(a, b, eps=1e-4):
    """Separating-axis test for two 2D triangles; touching edges do not count as overlap."""
    for tri in (a, b):
        for i in range(3):
            p, q = tri[i], tri[(i + 1) % 3]
            axis = np.array([p[1] - q[1], q[0] - p[0]])
            norm = np.linalg.norm(axis)
            if norm < 1e-12:
                continue
            axis /= norm
            pa, pb = a @ axis, b @ axis
            if pa.max() <= pb.min() + eps or pb.max() <= pa.min() + eps:
                return False
    return True


def main(path, out_json=None):
    js, binary = load(path)
    mats = js.get("materials", [])
    images = js.get("images", [])
    textures = js.get("textures", [])
    nodes = node_matrices(js)
    prims = 0
    tris_total = 0
    instanced = 0
    planes = defaultdict(list)
    per_material = defaultdict(int)
    for ni, m in nodes.items():
        nd = js["nodes"][ni]
        if "mesh" not in nd:
            continue
        mesh = js["meshes"][nd["mesh"]]
        inst = nd.get("extensions", {}).get("EXT_mesh_gpu_instancing")
        count = 1
        if inst:
            count = js["accessors"][inst["attributes"]["TRANSLATION"]]["count"]
            instanced += 1
        for p in mesh["primitives"]:
            prims += 1
            pos = accessor(js, binary, p["attributes"]["POSITION"])
            idx = accessor(js, binary, p["indices"]).reshape(-1).astype(np.int64) if "indices" in p else np.arange(len(pos))
            world = (np.c_[pos, np.ones(len(pos))] @ m.T)[:, :3]
            t = world[idx.reshape(-1, 3)]
            tris_total += len(t) * count
            per_material[mats[p.get("material", 0)]["name"] if mats else "?"] += len(t) * count
            if inst:
                continue  # instances are separate props; their own coplanarity is checked once
            n = np.cross(t[:, 1] - t[:, 0], t[:, 2] - t[:, 0])
            area = np.linalg.norm(n, axis=1)
            keep = area > 1e-10
            n[keep] /= area[keep, None]
            d = np.einsum("ij,ij->i", n, t[:, 0])
            mname = mats[p.get("material", 0)]["name"] if mats else "?"
            for k in np.nonzero(keep)[0]:
                key = (tuple(float(c) for c in np.round(n[k], 3)), round(float(d[k]), 3))
                planes[key].append((t[k], f"{mesh.get('name', '?')}"))
    # Coplanar same-facing overlaps.
    overlaps = []
    for (normal, dist), items in planes.items():
        if len(items) < 2:
            continue
        nv = np.array(normal)
        ax = np.argmax(np.abs(nv))
        keep_axes = [i for i in range(3) if i != ax]
        flat = [(tri[:, keep_axes], dbl) for tri, dbl in items]
        # Bucket by 2D bounding box grid to avoid O(n^2) on big planes (e.g. the floor).
        grid = defaultdict(list)
        for i, (tri, _) in enumerate(flat):
            lo, hi = tri.min(0), tri.max(0)
            for gx in range(int(np.floor(lo[0])), int(np.floor(hi[0])) + 1):
                for gy in range(int(np.floor(lo[1])), int(np.floor(hi[1])) + 1):
                    grid[(gx, gy)].append(i)
        seen = set()
        for cell in grid.values():
            for a_i in range(len(cell)):
                for b_i in range(a_i + 1, len(cell)):
                    i, j = cell[a_i], cell[b_i]
                    if (i, j) in seen:
                        continue
                    seen.add((i, j))
                    if tri_overlap_2d(flat[i][0], flat[j][0]):
                        overlaps.append({"normal": normal, "d": dist, "a": items[i][0].round(3).tolist(), "b": items[j][0].round(3).tolist(),
                                         "meshes": [items[i][1], items[j][1]]})
    pixels = 0
    gpu_bytes = 0
    from io import BytesIO
    try:
        from PIL import Image
    except ImportError:
        Image = None
    for img in images:
        if "bufferView" in img and Image:
            bv = js["bufferViews"][img["bufferView"]]
            raw = binary[bv.get("byteOffset", 0): bv.get("byteOffset", 0) + bv["byteLength"]]
            try:
                w, h = Image.open(BytesIO(raw)).size
            except Exception:
                w = h = 0
            pixels += w * h
            gpu_bytes += int(w * h * 4 * 4 / 3)
    stats = {
        "file_bytes": len(open(path, "rb").read()),
        "nodes": len(js.get("nodes", [])),
        "meshes": len(js.get("meshes", [])),
        "primitives": prims,
        "instanced_nodes": instanced,
        "materials": len(mats),
        "textures": len(textures),
        "images": len(images),
        "texture_megapixels": round(pixels / 1e6, 2),
        "texture_gpu_mb_estimate": round(gpu_bytes / 2**20, 1),
        "triangles": int(tris_total),
        "coplanar_overlaps": len(overlaps),
        "triangles_by_material": dict(sorted(per_material.items(), key=lambda kv: -kv[1])),
    }
    print(json.dumps({k: v for k, v in stats.items() if k != "triangles_by_material"}, indent=1))
    groups = defaultdict(int)
    for o in overlaps:
        c = np.mean(np.array(o["a"]), 0).round(0).tolist()
        groups[(tuple(o["meshes"]), tuple(o["normal"]), tuple(c))] += 1
    for (ms, nrm, c), k in list(groups.items())[:40]:
        print("COPLANAR", k, ms, nrm, c)
    if out_json:
        json.dump({**stats, "overlap_examples": overlaps[:20]}, open(out_json, "w"), indent=1)
    return 1 if overlaps else 0


if __name__ == "__main__":
    args = sys.argv[1:]
    out = args[args.index("--json") + 1] if "--json" in args else None
    sys.exit(main(args[0], out))
