"""
Project Island ground grass kit (owner, 2026-11-12: "add gras sticking up, green gras in green
ground floors, more yellow gras in those ground floor areas ... make sure execute this good so it
does not look generic/flat").

Reads the four CC BY 4.0 Sketchfab packs the owner downloaded (glTF, unpacked one per folder)
and writes what the game draws (public/fps/br/grass/):

  grass-v1.webp   one RGBA atlas with every clump's texture (alpha cut out, colour bled into the
                  transparent pixels so mip levels do not darken the blade edges)
  grass-v1.bin    every clump's vertices (position, normal, uv: 8 float32) and indices (uint16)
  grass-v1.json   the clumps: name, family, offsets and counts, height and footprint

Each clump is moved to stand on the origin (its foot at y = 0, centred in x/z), in metres. The
textures are cropped to the part the chosen clumps use and packed at one texel density, so no
clump is blurrier than another.

  python3 -I art/br/grass/build_grass.py <dir with the four unpacked packs> [out dir]
"""
import json, os, struct, sys
import numpy as np
from PIL import Image, ImageFilter

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "../../../public/fps/br/grass")
ATLAS = 2048

# The clumps used, by pack folder and node name, with the family the island scatters them as:
# fresh (green), aged (green going yellow), dry (straw), tall (seed heads, sparse).
PICK = [
    ("grass_pack_lowpoly_game-ready", "Grass main fresh_Grass_Mat_0", "fresh"),
    ("grass_pack_lowpoly_game-ready", "Grass main fresh.001_Grass_Mat_0", "fresh"),
    ("realistic_grass_pack_for_games_free", "Object_18", "fresh"),
    ("realistic_grass_pack_for_games_free", "Object_16", "fresh"),
    ("realistic_grass_pack_for_games_free", "Object_10", "fresh"),
    ("grass_pack_lp", "green-material", "fresh"),
    ("grass_pack_lowpoly_game-ready", "Grass main aged_Grass_Mat_0", "aged"),
    ("grass_pack_lowpoly_game-ready", "Grass main aged.002_Grass_Mat_0", "aged"),
    ("grass_pack_lp", "mid-material", "aged"),
    ("realistic_grass_pack_for_games_free", "Object_4", "aged"),
    ("grass_pack_lowpoly_game-ready", "Grass tall low_Tall_grass_Mat_0", "aged"),
    ("grass_pack_lowpoly_game-ready", "Grass main dry_Grass_Mat_0", "dry"),
    ("grass_pack_lp", "yellow-material", "dry"),
    ("dry_grass", "clump_dry_grass_8_M_dry_grass_0", "dry"),
    ("dry_grass", "clump_dry_grass_6_M_dry_grass_0", "dry"),
    ("grass_pack_lowpoly_game-ready", "Grass tall high.001_Tall_grass_Mat_0", "tall"),
]

CTYPE = {5126: ("f", 4), 5123: ("H", 2), 5125: ("I", 4), 5121: ("B", 1)}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def node_matrix(n):
    if "matrix" in n:
        return np.array(n["matrix"], dtype=float).reshape(4, 4).T
    t = n.get("translation", [0, 0, 0])
    x, y, z, w = n.get("rotation", [0, 0, 0, 1])
    s = n.get("scale", [1, 1, 1])
    r = np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])
    m = np.eye(4)
    m[:3, :3] = r * np.array(s)
    m[:3, 3] = t
    return m


def load_pack(folder):
    g = json.load(open(os.path.join(SRC, folder, "scene.gltf")))
    blob = open(os.path.join(SRC, folder, g["buffers"][0]["uri"]), "rb").read()

    def acc(i):
        a = g["accessors"][i]
        v = g["bufferViews"][a["bufferView"]]
        fmt, size = CTYPE[a["componentType"]]
        n = NCOMP[a["type"]]
        start = v.get("byteOffset", 0) + a.get("byteOffset", 0)
        stride = v.get("byteStride", size * n)
        out = np.zeros((a["count"], n))
        for k in range(a["count"]):
            out[k] = struct.unpack_from("<" + fmt * n, blob, start + k * stride)
        return out

    meshes = {}
    seen = {}

    def walk(i, parent):
        n = g["nodes"][i]
        m = parent @ node_matrix(n)
        if "mesh" in n:
            name = n.get("name", f"node{i}")
            seen[name] = seen.get(name, -1) + 1
            key = name if seen[name] == 0 else f"{name}#{seen[name]}"
            for p in g["meshes"][n["mesh"]]["primitives"]:
                pos = acc(p["attributes"]["POSITION"])
                nor = acc(p["attributes"]["NORMAL"])
                uv = acc(p["attributes"]["TEXCOORD_0"])
                idx = acc(p["indices"]).astype(int).ravel() if "indices" in p else np.arange(len(pos))
                pos = (m @ np.c_[pos, np.ones(len(pos))].T).T[:, :3]
                nm = np.linalg.inv(m[:3, :3]).T
                nor = (nm @ nor.T).T
                nor /= np.linalg.norm(nor, axis=1, keepdims=True) + 1e-9
                mat = g["materials"][p.get("material", 0)]
                tex = mat["pbrMetallicRoughness"]["baseColorTexture"]["index"]
                img = g["images"][g["textures"][tex]["source"]]["uri"]
                meshes[key] = dict(pos=pos, nor=nor, uv=uv, idx=idx, image=os.path.join(SRC, folder, img))
        for c in n.get("children", []):
            walk(c, m)

    for r in g["scenes"][g.get("scene", 0)]["nodes"]:
        walk(r, np.eye(4))
    # Node names repeat in one pack (Grass Pack LP): the n-th mesh of a name is "name#n".
    return meshes


packs = {}
clumps = []
for folder, key, family in PICK:
    if folder not in packs:
        packs[folder] = load_pack(folder)
    m = packs[folder].get(key)
    if m is None:
        # Same-named nodes are numbered across the pack in walk order ("green-material#2").
        raise SystemExit(f"{folder}: no node {key}; have {sorted(packs[folder])}")
    clumps.append(dict(m, name=f"{folder}/{key}", family=family))

# Stand each clump on the origin, in metres (glTF units are metres).
for c in clumps:
    p = c["pos"]
    c["pos"] = p - np.array([(p[:, 0].min() + p[:, 0].max()) / 2, p[:, 1].min(), (p[:, 2].min() + p[:, 2].max()) / 2])
    c["height"] = float(c["pos"][:, 1].max())
    c["radius"] = float(np.hypot(c["pos"][:, 0], c["pos"][:, 2]).max())

# Crops: the part of each texture the chosen clumps use, and its texel density (px per metre of
# blade, along the clump's height).
crops = {}
for c in clumps:
    im = c["image"]
    u0, v0 = c["uv"].min(0)
    u1, v1 = c["uv"].max(0)
    cr = crops.setdefault(im, dict(u0=1, v0=1, u1=0, v1=0, density=0))
    cr.update(u0=min(cr["u0"], u0), v0=min(cr["v0"], v0), u1=max(cr["u1"], u1), v1=max(cr["v1"], v1))
for im, cr in crops.items():
    w, h = Image.open(im).size
    cr["u0"], cr["v0"] = max(0, cr["u0"] - 0.004), max(0, cr["v0"] - 0.004)
    cr["u1"], cr["v1"] = min(1, cr["u1"] + 0.004), min(1, cr["v1"] + 0.004)
    cr["w"], cr["h"] = (cr["u1"] - cr["u0"]) * w, (cr["v1"] - cr["v0"]) * h
    # Metres of clump per pixel of this crop: the tallest clump that uses it, over its v span.
    users = [c for c in clumps if c["image"] == im]
    cr["mpp"] = max(c["height"] / max(1.0, (c["uv"][:, 1].max() - c["uv"][:, 1].min()) * h) for c in users)


def pack(scale):
    """Shelf-pack every crop at `scale` × (its own px for the same metres as the densest): the
    tallest first, each into the first shelf it fits (a new shelf when none has room)."""
    items = sorted(crops.items(), key=lambda kv: -kv[1]["h"] * kv[1]["mpp"])
    shelves = []  # [y, height, x used]
    place = {}
    for im, cr in items:
        k = scale * cr["mpp"] / min(c["mpp"] for c in crops.values())
        w, h = int(np.ceil(cr["w"] * k)) + 4, int(np.ceil(cr["h"] * k)) + 4
        if w > ATLAS:
            return None
        for sh in shelves:
            if h <= sh[1] and sh[2] + w <= ATLAS:
                place[im] = (sh[2], sh[0], w, h, k)
                sh[2] += w
                break
        else:
            y = shelves[-1][0] + shelves[-1][1] if shelves else 0
            if y + h > ATLAS:
                return None
            shelves.append([y, h, w])
            place[im] = (0, y, w, h, k)
    return place


lo, hi = 0.05, 4.0
for _ in range(40):
    mid = (lo + hi) / 2
    if pack(mid):
        lo = mid
    else:
        hi = mid
place = pack(lo)
atlas = Image.new("RGBA", (ATLAS, ATLAS), (0, 0, 0, 0))
for im, (x, y, w, h, k) in place.items():
    cr = crops[im]
    src = Image.open(im).convert("RGBA")
    W, H = src.size
    box = (int(cr["u0"] * W), int(cr["v0"] * H), int(np.ceil(cr["u1"] * W)), int(np.ceil(cr["v1"] * H)))
    piece = src.crop(box).resize((w - 4, h - 4), Image.LANCZOS)
    atlas.paste(piece, (x + 2, y + 2))
    cr["atlas"] = (x + 2, y + 2, w - 4, h - 4, box, W, H)

# Bleed the blades' colour into the transparent pixels (a few rounds of a max filter over the
# colour where alpha is zero), so mip levels average leaf colour, not black, at the edges.
rgba = np.array(atlas).astype(np.float32)
alpha = rgba[..., 3]
rgb = rgba[..., :3].copy()
known = alpha > 8
for _ in range(24):
    if known.all():
        break
    acc_ = np.zeros_like(rgb)
    cnt = np.zeros(alpha.shape, np.float32)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)):
        sh_k = np.roll(np.roll(known, dy, 0), dx, 1)
        sh_c = np.roll(np.roll(rgb, dy, 0), dx, 1)
        acc_ += sh_c * sh_k[..., None]
        cnt += sh_k
    grow = (~known) & (cnt > 0)
    rgb[grow] = acc_[grow] / cnt[grow][:, None]
    known = known | grow
# Anything still unknown (far from any blade): the atlas' mean blade colour.
mean = rgba[..., :3][alpha > 8].mean(0)
rgb[~known] = mean
out = np.dstack([rgb, alpha]).clip(0, 255).astype(np.uint8)
os.makedirs(OUT, exist_ok=True)
Image.fromarray(out, "RGBA").save(os.path.join(OUT, "grass-v1.webp"), lossless=False, quality=90, alpha_quality=100, method=6)

# Geometry: uv remapped into the atlas (glTF convention: v down, image rows top-down).
verts, index, entries = [], [], []
vbase = ibase = 0
for c in clumps:
    x, y, w, h, box, W, H = crops[c["image"]]["atlas"]
    u = (c["uv"][:, 0] * W - box[0]) / (box[2] - box[0]) * w + x
    v = (c["uv"][:, 1] * H - box[1]) / (box[3] - box[1]) * h + y
    uv = np.c_[u / ATLAS, v / ATLAS]
    n = len(c["pos"])
    verts.append(np.c_[c["pos"], c["nor"], uv].astype(np.float32))
    index.append(c["idx"].astype(np.uint16))
    entries.append(dict(name=c["name"], family=c["family"], vertex=vbase, vertices=n, index=ibase,
                        indices=int(len(c["idx"])), height=round(c["height"], 4), radius=round(c["radius"], 4)))
    vbase += n
    ibase += len(c["idx"])
vdata = np.concatenate(verts).tobytes()
idata = np.concatenate(index).tobytes()
with open(os.path.join(OUT, "grass-v1.bin"), "wb") as f:
    f.write(vdata)
    f.write(idata)
json.dump(dict(version=1, atlas="grass-v1.webp", bin="grass-v1.bin", stride=8, vertexBytes=len(vdata),
               indexBytes=len(idata), clumps=entries), open(os.path.join(OUT, "grass-v1.json"), "w"), indent=1)
print(f"atlas scale {lo:.3f}, {len(clumps)} clumps, {vbase} vertices, {ibase // 3} triangles")
for e in entries:
    print(f"  {e['family']:6} {e['indices'] // 3:4d} tris  h {e['height']:.2f} m  r {e['radius']:.2f} m  {e['name']}")
