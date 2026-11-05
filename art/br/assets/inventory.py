#!/usr/bin/env python3
"""Project Island 3D asset inventory.

Scans downloaded model zips (Sketchfab / Poly Haven style) WITHOUT extracting
them: every member is read in memory through `zipfile`. Nothing inside an
archive is executed, written to disk, or used as a filesystem path.

Usage (from the repo root):
    python3 -I art/br/assets/inventory.py [--out art/br/assets] [--list PATH]
                                          [--input GLOB ...] [--rescan]

Outputs (in --out):
    inventory.json   machine-readable; also the cache (keyed by zip sha256)
    INVENTORY.md     human report grouped by intended map area
    ATTRIBUTION.md   CC BY credits for every licence-OK asset

Rerunning is incremental: zips already in inventory.json (same sha256 and
same TOOL_VERSION) are not re-parsed, and entries for zips that have since
disappeared from disk are kept (marked present=false).
"""
import argparse
import base64
import datetime as dt
import difflib
import glob
import hashlib
import io
import json
import math
import os
import posixpath
import re
import sys
import urllib.parse
import warnings
import zipfile

TOOL_VERSION = 3  # bump when parse_zip() output changes (invalidates the per-zip cache)

DEFAULT_INPUTS = [
    "/mnt/user-data/attachments/6a16bbd3-946b-525c-a56d-aa69438e92da/*.zip",
    "/mnt/user-data/uploads/*.zip",
]
DEFAULT_LIST = "/home/claude/br-assets/index.html"

MAX_MEMBER = 600 * 1024 * 1024      # skip members declared larger than this
MAX_TOTAL = 6 * 1024 ** 3           # refuse archives declaring more than this in total
MAX_MEMBERS = 20000
MAX_TEXT = 64 * 1024                # bytes read from licence/readme files
MAX_DEPTH = 256                     # node hierarchy depth guard

# ---------------------------------------------------------------- budgets
# Heuristic per-category budgets (documented in INVENTORY.md).
BUDGETS = {
    #            tris    per-piece  tex_px  tex_MB  draws
    "prop":     dict(tris=15000,  piece=15000, tex=2048, texmb=24,  draws=12, down="1K"),
    "building": dict(tris=60000,  piece=60000, tex=2048, texmb=96,  draws=12, down="2K"),
    "vehicle":  dict(tris=80000,  piece=80000, tex=2048, texmb=96,  draws=12, down="2K"),
    "tree":     dict(tris=None,   piece=10000, tex=2048, texmb=24,  draws=12, down="1K"),
    "kit":      dict(tris=None,   piece=15000, tex=2048, texmb=96,  draws=12, down="1K"),
    "building-kit": dict(tris=None, piece=60000, tex=2048, texmb=128, draws=12, down="2K"),
    "vehicle-kit": dict(tris=None, piece=80000, tex=2048, texmb=128, draws=12, down="2K"),
    "texture-set": dict(tris=None, piece=None, tex=2048, texmb=None, draws=None, down="1K"),
    "fps":      dict(tris=50000,  piece=50000, tex=4096, texmb=96,  draws=12, down="2K"),
}
KIT_TOTAL_WARN = 250000  # informational: whole kit file

# Plausible largest-side range in metres per category (outside -> "SCALE?" flag).
SIZE_RANGE = {
    "prop": (0.05, 40), "building": (1.0, 400), "vehicle": (0.5, 100), "tree": (0.5, 60),
    "kit": (0.05, 1000), "building-kit": (1.0, 1500), "vehicle-kit": (0.5, 1000),
    "texture-set": (0, 1e9), "fps": (0.02, 10),
}

# Manual category overrides keyed by Sketchfab uid or normalised title
# (lowercase, non-alphanumerics -> single spaces).
CATEGORY_OVERRIDES = {
    "big box store": "building",
    "heliport helipad air base helicopter": "building",
    "parking lot uf": "kit",
    "warehouse shelving unit": "prop",
    "simple storefront interior pack": "building-kit",
    "free simple storefront interior pack": "building-kit",
    "large industrial storage tanks": "building-kit",
    "low poly container yard": "building-kit",
    "concrete girder beam bridges tunnels free": "building-kit",
}

# ---------------------------------------------------------------- helpers

def now_local():
    return dt.datetime.now().astimezone()


def clean_text(s, limit=200):
    """Untrusted text -> single-line, printable, length-limited."""
    if s is None:
        return None
    s = re.sub(r"[\x00-\x1f\x7f]", " ", str(s))
    s = re.sub(r"\s+", " ", s).strip()
    return s[:limit]


def md(s):
    """Escape for a Markdown table cell."""
    if s is None:
        return ""
    s = clean_text(s, 200)
    return (s.replace("\\", "\\\\").replace("|", "\\|").replace("<", "&lt;")
             .replace("[", "\\[").replace("]", "\\]")
             .replace("*", "\\*").replace("_", "\\_").replace("`", "\\`"))


def norm_name(s):
    s = (s or "").lower()
    s = re.sub(r"\.zip$", "", s)
    s = re.sub(r"^[0-9a-f]{8}-", "", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


UID_RE = re.compile(r"([0-9a-f]{32})")
SF_URL_RE = re.compile(r"https?://(?:www\.)?sketchfab\.com/(?:3d-models|models)/[A-Za-z0-9_\-]+")


def uid_from_url(url):
    if not url:
        return None
    m = UID_RE.search(url.rsplit("/", 1)[-1])
    return m.group(1) if m else None


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

# ---------------------------------------------------------------- licence

def licence_verdict(lic):
    """Return (verdict, reason) for a licence string (None = missing)."""
    if not lic:
        return "REVIEW", "no licence information in archive"
    t = lic.lower()
    if re.search(r"\bnc\b|non-?commercial", t):
        return "REJECT", "NonCommercial licence"
    if re.search(r"\bnd\b|no-?deriv", t):
        return "REJECT", "NoDerivatives licence (we must decimate/modify)"
    if "editorial" in t:
        return "REJECT", "Editorial-only licence"
    if re.search(r"standard|royalty|paid|all rights reserved|sketchfab license", t):
        return "REJECT", "Standard/paid licence"
    if re.search(r"\bsa\b|share-?alike", t):
        return "REVIEW", "ShareAlike: modified models must also be released CC BY-SA"
    if re.search(r"cc0|public ?domain|publicdomain/zero", t):
        return "OK", "CC0 / public domain"
    if re.search(r"cc[- ]?by\b|cc[- ]by[- ]\d|creativecommons\.org/licenses/by/", t):
        return "OK", "CC BY"
    return "REVIEW", "unrecognised licence string"


def parse_licence_text(text):
    out = {}
    def grab(key):
        m = re.search(r"^\s*\*?\s*" + key + r"\s*:\s*(.+)$", text, re.I | re.M)
        return clean_text(m.group(1)) if m else None
    out["title"] = grab("title")
    out["source"] = grab("source")
    out["author"] = grab("author")
    out["licence"] = grab("license type") or grab("licence type") or grab("license")
    if not out["source"]:
        m = SF_URL_RE.search(text)
        out["source"] = m.group(0) if m else None
    if not out["licence"]:
        m = re.search(r"creativecommons\.org/(?:licenses|publicdomain)/[a-z\-]+/[\d.]+", text, re.I)
        if m:
            out["licence"] = m.group(0)
        elif re.search(r"\bCC0\b", text):
            out["licence"] = "CC0"
    return {k: v for k, v in out.items() if v}


def split_author(a):
    """'Name (https://sketchfab.com/user)' -> (name, url)."""
    if not a:
        return None, None
    m = re.match(r"^(.*?)\s*\((https?://[^)\s]+)\)\s*$", a)
    if m:
        return m.group(1).strip() or None, m.group(2)
    return a, None


def licence_link(lic):
    if not lic:
        return None
    m = re.search(r"https?://creativecommons\.org/[^\s)]+", lic)
    if m:
        return m.group(0).replace("http://", "https://")
    t = lic.lower()
    if "cc0" in t:
        return "https://creativecommons.org/publicdomain/zero/1.0/"
    m = re.search(r"cc[- ]by[- ](\d\.\d)", t)
    if m:
        return "https://creativecommons.org/licenses/by/%s/" % m.group(1)
    return None


def licence_label(lic):
    if not lic:
        return None
    t = lic.lower()
    m = re.search(r"cc[- ]by(?:[- ](sa|nc|nd|nc[- ]sa|nc[- ]nd))?[- ](\d\.\d)", t)
    if m:
        mod = ("-" + m.group(1).upper().replace(" ", "-")) if m.group(1) else ""
        return "CC BY%s %s" % (mod.replace("-", " ").replace("  ", " ") if mod else "", m.group(2))
    m = re.search(r"licenses/(by[a-z\-]*)/(\d\.\d)", t)
    if m:
        return "CC %s %s" % (m.group(1).upper().replace("-", " "), m.group(2))
    if "cc0" in t or "publicdomain/zero" in t:
        return "CC0 1.0"
    return clean_text(lic, 60)

# ---------------------------------------------------------------- matrices (column-major, glTF)

IDENT = [1.0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 1.0]


def mmul(a, b):
    c = [0.0] * 16
    for col in range(4):
        for row in range(4):
            c[col * 4 + row] = sum(a[k * 4 + row] * b[col * 4 + k] for k in range(4))
    return c


def trs(node):
    if "matrix" in node and isinstance(node["matrix"], list) and len(node["matrix"]) == 16:
        return [float(x) for x in node["matrix"]]
    t = node.get("translation", [0, 0, 0])
    r = node.get("rotation", [0, 0, 0, 1])
    s = node.get("scale", [1, 1, 1])
    x, y, z, w = [float(v) for v in r]
    sx, sy, sz = [float(v) for v in s]
    rm = [
        1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0,
        2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
        2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0,
        0, 0, 0, 1,
    ]
    sm = [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1]
    tm = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, float(t[0]), float(t[1]), float(t[2]), 1]
    return mmul(tm, mmul(rm, sm))


def xform(m, p):
    x, y, z = p
    return (m[0] * x + m[4] * y + m[8] * z + m[12],
            m[1] * x + m[5] * y + m[9] * z + m[13],
            m[2] * x + m[6] * y + m[10] * z + m[14])


def uniform_scale(m):
    det = (m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2])
           + m[8] * (m[1] * m[6] - m[5] * m[2]))
    return math.copysign(abs(det) ** (1 / 3), det) if det else 0.0


class BBox:
    def __init__(self):
        self.lo = [math.inf] * 3
        self.hi = [-math.inf] * 3

    def add(self, p):
        for i in range(3):
            self.lo[i] = min(self.lo[i], p[i])
            self.hi[i] = max(self.hi[i], p[i])

    def merge(self, o):
        if o.valid():
            self.add(o.lo)
            self.add(o.hi)

    def valid(self):
        return self.lo[0] <= self.hi[0]

    def size(self):
        return [round(self.hi[i] - self.lo[i], 3) for i in range(3)] if self.valid() else None

# ---------------------------------------------------------------- zip reading

def resolve_member(base_dir, uri, names):
    """Resolve a glTF URI to a zip member name (zip namespace only)."""
    if not uri or uri.startswith("data:"):
        return None
    u = urllib.parse.unquote(uri.split("?")[0].split("#")[0]).replace("\\", "/")
    if u.startswith("/") or re.match(r"^[a-z]+:", u, re.I):
        return None
    p = posixpath.normpath(posixpath.join(base_dir, u)) if base_dir else posixpath.normpath(u)
    if p.startswith("../") or p == "..":
        return None
    if p in names:
        return p
    low = {n.lower(): n for n in names}
    return low.get(p.lower())


def image_info(fobj):
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        with Image.open(fobj) as im:   # header only, no decode
            return im.size[0], im.size[1], (im.format or "?")


def tex_mb(w, h):
    return w * h * 4 * 1.33 / (1024 * 1024)


FORMAT_EXTS = {
    ".gltf": "gltf", ".glb": "glb", ".fbx": "fbx", ".obj": "obj", ".blend": "blend",
    ".usdz": "usdz", ".usd": "usd", ".usdc": "usd", ".dae": "dae", ".3ds": "3ds", ".stl": "stl",
    ".max": "max", ".ma": "maya", ".mb": "maya", ".c4d": "c4d", ".abc": "abc", ".ply": "ply",
    ".spp": "substance", ".unitypackage": "unitypackage", ".uasset": "uasset",
}
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".tga", ".tif", ".tiff", ".psd", ".exr",
              ".hdr", ".ktx2", ".dds", ".bmp"}
TEXT_RE = re.compile(r"(licen[cs]e|readme|copying|credits|attribution)[^/]*$", re.I)


def parse_zip(path):
    rec = {"errors": [], "skipped_members": [], "formats": [], "member_count": 0}
    try:
        z = zipfile.ZipFile(path)
    except Exception as e:
        msg = "cannot open archive: %s (%s)" % (type(e).__name__, clean_text(e, 120))
        try:
            with open(path, "rb") as f:
                head = f.read(4)
            if head == b"PK\x03\x04":
                msg += "; starts with a zip local header but has no readable central directory: truncated/incomplete download, re-download"
        except OSError:
            pass
        rec["errors"].append(msg)
        rec["fatal"] = True
        return rec
    with z:
        infos = z.infolist()
        rec["member_count"] = len(infos)
        if len(infos) > MAX_MEMBERS:
            rec["errors"].append("too many members (%d)" % len(infos))
            rec["fatal"] = True
            return rec
        total = sum(i.file_size for i in infos)
        rec["uncompressed_bytes"] = total
        if total > MAX_TOTAL:
            rec["errors"].append("declared uncompressed total %.1f GB exceeds guard" % (total / 1e9))
        ok = {}
        for i in infos:
            if i.is_dir():
                continue
            if i.file_size > MAX_MEMBER:
                rec["skipped_members"].append({"name": clean_text(i.filename), "declared_bytes": i.file_size,
                                               "reason": "declared size > 600 MB (zip-bomb guard)"})
                continue
            if i.flag_bits & 0x1:
                rec["skipped_members"].append({"name": clean_text(i.filename), "reason": "encrypted"})
                continue
            ok[i.filename] = i
        names = set(ok)

        def read(name, limit=None):
            with z.open(ok[name]) as f:
                return f.read(limit) if limit else f.read()

        # formats
        fmts = set()
        loose_images = []
        for n in names:
            ext = posixpath.splitext(n)[1].lower()
            if ext in FORMAT_EXTS:
                fmts.add(FORMAT_EXTS[ext])
            elif ext in IMAGE_EXTS:
                loose_images.append(n)
        if "gltf" in fmts and any(n.lower().endswith(".bin") for n in names):
            fmts.discard("gltf")
            fmts.add("gltf+bin")
        rec["formats"] = sorted(fmts)

        # licence
        lic = {}
        for n in sorted(names, key=lambda x: (x.count("/"), len(x))):
            if TEXT_RE.search(n) and posixpath.splitext(n)[1].lower() in ("", ".txt", ".md"):
                try:
                    text = read(n, MAX_TEXT).decode("utf-8", "replace")
                except Exception as e:
                    rec["errors"].append("licence read failed: %s" % type(e).__name__)
                    continue
                got = parse_licence_text(text)
                if got:
                    lic = got
                    lic["file"] = clean_text(n)
                    break
        # glTF candidates: prefer root-most .glb/.gltf
        cands = sorted([n for n in names if n.lower().endswith((".gltf", ".glb"))],
                       key=lambda x: (x.count("/"), not x.lower().endswith(".glb"), len(x)))
        gltf_json, glb_bin = None, None
        if cands:
            g = cands[0]
            rec["gltf_member"] = clean_text(g)
            if len(cands) > 1:
                rec["other_gltf_members"] = [clean_text(c) for c in cands[1:20]]
            try:
                raw = read(g)
                if g.lower().endswith(".glb"):
                    gltf_json, glb_bin = parse_glb(raw)
                else:
                    gltf_json = json.loads(raw.decode("utf-8-sig"))
            except Exception as e:
                rec["errors"].append("glTF JSON parse failed: %s (%s)" % (type(e).__name__, clean_text(e, 120)))
        if gltf_json is not None:
            extras = (gltf_json.get("asset") or {}).get("extras") or {}
            rec["gltf_generator"] = clean_text((gltf_json.get("asset") or {}).get("generator"))
            for k_src, k_dst in (("title", "title"), ("author", "author"), ("source", "source"), ("license", "licence")):
                if not lic.get(k_dst) and extras.get(k_src):
                    lic[k_dst] = clean_text(extras[k_src])
                    lic.setdefault("file", "glTF asset.extras")
        rec["licence"] = lic

        if gltf_json is not None:
            try:
                rec["model"] = model_stats(gltf_json)
            except Exception as e:
                rec["errors"].append("glTF stats failed: %s (%s)" % (type(e).__name__, clean_text(e, 120)))
            try:
                rec["textures"] = gltf_textures(gltf_json, glb_bin, posixpath.dirname(cands[0]), names, z, ok)
                used = set(t.get("member") for t in rec["textures"]["images"])
                unused = [n for n in loose_images if n not in used]
                rec["textures"]["unreferenced_image_files"] = len(unused)
            except Exception as e:
                rec["errors"].append("texture scan failed: %s (%s)" % (type(e).__name__, clean_text(e, 120)))
        else:
            # no glTF: report loose images
            imgs = []
            for n in sorted(loose_images)[:200]:
                imgs.append(one_image(z, ok[n], clean_text(n)))
            rec["textures"] = summarise_images(imgs)
        rec["polyhaven_like"] = bool(
            not lic and any(re.search(r"_(diff|nor_gl|arm|rough)_\dk\.", n) for n in names))
    return rec


def parse_glb(raw):
    import struct
    if len(raw) < 20 or raw[:4] != b"glTF":
        raise ValueError("not a GLB")
    _, ver, length = struct.unpack_from("<4sII", raw, 0)
    off, js, binc = 12, None, None
    while off + 8 <= min(length, len(raw)):
        clen, ctype = struct.unpack_from("<II", raw, off)
        data = raw[off + 8: off + 8 + clen]
        if ctype == 0x4E4F534A:
            js = json.loads(data.decode("utf-8-sig"))
        elif ctype == 0x004E4942:
            binc = data
        off += 8 + clen + ((4 - clen % 4) % 4 if clen % 4 else 0)
    if js is None:
        raise ValueError("GLB has no JSON chunk")
    return js, binc


def one_image(z, info, label):
    try:
        with z.open(info) as f:
            w, h, fmt = image_info(f)
        return {"member": info.filename, "name": label, "w": w, "h": h, "format": fmt}
    except Exception as e:
        return {"member": info.filename, "name": label, "error": type(e).__name__}


def summarise_images(imgs):
    sized = [i for i in imgs if "w" in i]
    return {
        "count": len(imgs),
        "images": imgs,
        "max_px": max([max(i["w"], i["h"]) for i in sized], default=0),
        "rgba_mb": round(sum(tex_mb(i["w"], i["h"]) for i in sized), 1),
        "unreadable": sum(1 for i in imgs if "error" in i),
    }


def gltf_textures(j, glb_bin, base_dir, names, z, ok):
    imgs = []
    for idx, im in enumerate(j.get("images") or []):
        label = clean_text(im.get("name") or im.get("uri") or "image%d" % idx, 120)
        uri = im.get("uri")
        try:
            if uri and uri.startswith("data:"):
                b64 = uri.split(",", 1)[1]
                if len(b64) > 80 * 1024 * 1024:
                    imgs.append({"name": label, "error": "data URI too large"})
                    continue
                w, h, fmt = image_info(io.BytesIO(base64.b64decode(b64)))
                imgs.append({"name": label, "member": None, "w": w, "h": h, "format": fmt})
            elif uri:
                m = resolve_member(base_dir, uri, names)
                if not m:
                    imgs.append({"name": label, "error": "missing in zip"})
                    continue
                r = one_image(z, ok[m], label)
                imgs.append(r)
            elif "bufferView" in im and glb_bin is not None:
                bv = j["bufferViews"][im["bufferView"]]
                o = bv.get("byteOffset", 0)
                w, h, fmt = image_info(io.BytesIO(glb_bin[o:o + bv["byteLength"]]))
                imgs.append({"name": label, "member": None, "w": w, "h": h, "format": fmt})
            else:
                imgs.append({"name": label, "error": "no source"})
        except Exception as e:
            imgs.append({"name": label, "error": type(e).__name__})
    return summarise_images(imgs)


def model_stats(j):
    nodes = j.get("nodes") or []
    meshes = j.get("meshes") or []
    acc = j.get("accessors") or []

    def acount(i):
        try:
            return int(acc[i].get("count", 0))
        except (IndexError, TypeError, AttributeError):
            return 0

    # per-mesh costs (unique)
    mesh_cost = []
    other_modes = 0
    for m in meshes:
        tris = verts = prims = 0
        morph = False
        corners = []
        for p in m.get("primitives") or []:
            prims += 1
            attrs = p.get("attributes") or {}
            pos = attrs.get("POSITION")
            n = acount(pos) if pos is not None else 0
            verts += n
            mode = p.get("mode", 4)
            if mode == 4:
                tris += (acount(p["indices"]) if p.get("indices") is not None else n) // 3
            else:
                other_modes += 1
            if p.get("targets"):
                morph = True
            if pos is not None and pos < len(acc):
                a = acc[pos]
                if isinstance(a.get("min"), list) and isinstance(a.get("max"), list) and len(a["min"]) >= 3:
                    lo, hi = a["min"], a["max"]
                    corners.append([(x, y, z) for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2])])
        mesh_cost.append({"tris": tris, "verts": verts, "prims": prims, "morph": morph, "corners": corners})

    scenes = j.get("scenes") or []
    si = j.get("scene", 0)
    roots = scenes[si].get("nodes", []) if scenes and 0 <= si < len(scenes) else list(range(len(nodes)))

    world = {}
    total = {"tris": 0, "verts": 0, "draws": 0, "mesh_nodes": 0}
    bbox_all = BBox()
    used_mats = set()
    morph_any = False
    visited = set()

    def walk(ni, parent, depth, acc_box, acc_cost):
        nonlocal morph_any
        if depth > MAX_DEPTH or ni in visited or not (0 <= ni < len(nodes)):
            return
        visited.add(ni)
        nd = nodes[ni]
        m = mmul(parent, trs(nd))
        world[ni] = m
        mi = nd.get("mesh")
        if mi is not None and 0 <= mi < len(meshes):
            c = mesh_cost[mi]
            inst = 1
            ext = (nd.get("extensions") or {}).get("EXT_mesh_gpu_instancing")
            if ext:
                attrs = ext.get("attributes") or {}
                any_attr = next(iter(attrs.values()), None)
                inst = max(1, acount(any_attr)) if any_attr is not None else 1
            for k in ("tris", "verts"):
                acc_cost[k] += c[k] * inst
            acc_cost["draws"] += c["prims"]
            acc_cost["mesh_nodes"] += 1
            if c["morph"]:
                morph_any = True
            for p in meshes[mi].get("primitives") or []:
                if p.get("material") is not None:
                    used_mats.add(p["material"])
            for cs in c["corners"]:
                for pt in cs:
                    acc_box.add(xform(m, pt))
        for ch in nd.get("children") or []:
            walk(ch, m, depth + 1, acc_box, acc_cost)

    # effective root: descend through wrapper nodes (no mesh, one child)
    eff = list(roots)
    path_m = IDENT
    wrappers = []
    while len(eff) == 1 and 0 <= eff[0] < len(nodes):
        nd = nodes[eff[0]]
        if nd.get("mesh") is not None or len(nd.get("children") or []) == 0:
            break
        path_m = mmul(path_m, trs(nd))
        wrappers.append(clean_text(nd.get("name") or "#%d" % eff[0], 60))
        eff = list(nd.get("children") or [])
        if len(wrappers) > 16:
            break

    pieces = []
    base = path_m  # world matrix of the wrapper chain (IDENT when there are no wrappers)
    for ni in eff:
        b = BBox()
        c = {"tris": 0, "verts": 0, "draws": 0, "mesh_nodes": 0}
        walk(ni, base, 0, b, c)
        nm = clean_text((nodes[ni].get("name") if 0 <= ni < len(nodes) else None) or "#%d" % ni, 60)
        pieces.append({"name": nm, "tris": c["tris"], "draws": c["draws"], "size_m": b.size()})
        for k in total:
            total[k] += c[k]
        bbox_all.merge(b)

    pieces.sort(key=lambda p: -p["tris"])
    unique_tris = sum(c["tris"] for c in mesh_cost)
    return {
        "tris": total["tris"],
        "verts": total["verts"],
        "draws": total["draws"],
        "unique_tris": unique_tris,
        "meshes": len(meshes),
        "primitives": sum(c["prims"] for c in mesh_cost),
        "materials": len(j.get("materials") or []),
        "materials_used": len(used_mats),
        "nodes": len(nodes),
        "mesh_nodes": total["mesh_nodes"],
        "skins": len(j.get("skins") or []),
        "animations": len(j.get("animations") or []),
        "morph_targets": morph_any,
        "non_triangle_primitives": other_modes,
        "size_m": bbox_all.size(),
        "root_wrappers": wrappers,
        "root_scale": round(uniform_scale(path_m), 6),
        "pieces_count": len(pieces),
        "max_piece_tris": pieces[0]["tris"] if pieces else 0,
        "top_pieces": pieces[:6],
        "extensions_used": [clean_text(e, 60) for e in (j.get("extensionsUsed") or [])][:20],
    }

# ---------------------------------------------------------------- asset list

def load_asset_list(path):
    items, areas = [], []
    try:
        html = open(path, encoding="utf-8").read()
    except OSError as e:
        print("warning: asset list unreadable: %s" % e, file=sys.stderr)
        return areas, items

    def block(name, close):
        m = re.search(r"const " + name + r"\s*=\s*\[(.*?)\n" + re.escape(close), html, re.S)
        return m.group(1) if m else ""
    for line in block("AREAS", "];").splitlines():
        line = line.strip().rstrip(",")
        if line.startswith("["):
            try:
                a = json.loads(line)
                areas.append({"id": a[0], "title": a[1], "grid": a[2]})
            except ValueError:
                pass
    for line in block("ITEMS", "];").splitlines():
        line = line.strip().rstrip(",")
        if line.startswith("["):
            try:
                a = json.loads(line)
            except ValueError:
                continue
            items.append({"area": a[0], "name": a[1], "author": a[2], "uid": a[3],
                          "ktris": a[4], "glb_mb": a[5], "priority": a[6], "use": a[7]})
    return areas, items

# ---------------------------------------------------------------- classification

PROP_WORDS = r"shel(f|ves|ving)|door|\bbed\b|trolley|crate|barrel|pallet|\bbox(es)?\b|sign|cone|light|pole|" \
             r"fence|barrier|sandbag|ricebag|hesco|bale|log pile|generator|dumpster|ac unit|electrical|ladder|" \
             r"parachute|billboard|loudspeaker|drum|bags\b|machine|conveyor|tank|container|transformer|props\b"
BUILDING_WORDS = r"house|building|hangar|hanger|station|barn|cabin|motel|diner|\bstore\b|garage|factory|" \
                 r"warehouse|tower|prison|shed|lighthouse|\bdam\b|pier|bridge|hospital|hallway|police|polyclinic|" \
                 r"duplex|checkpoint|tent|heliport|helipad|runway|shop|silos?\b|storefront|row buildings|yard"
VEHICLE_WORDS = r"plane|aircraft|hercules|\bc ?130\b|\bc ?17\b|chinook|\bch ?47\b|helicopter|\bmi ?8\b|truck|" \
                r"forklift|vehicle|excavator|bulldozer|railway tank|crane"
NOT_VEHICLE = r"pallet truck|tower crane|heliport|helipad"
TREE_WORDS = r"tree|pine|oak|birch|forest|conifer|bush|spruce|quercus|\bfir\b"
FPS_WORDS = r"\bm4|ar 15|rifle|suppressor|sniper|swat|terrorist|character|\brig\b|carry handle"
KIT_WORDS = r"\bpack\b|\bkit\b|\bset\b|collection|\bprops\b|\bmodular\b|\bassets\b|" \
            r"(barriers|signs|cones|pallets|fences|lights|shelves|tanks|trucks|vehicles|dumpsters|barrels|" \
            r"buildings|containers|bridges)\b"


def classify(title, area, rec):
    t = norm_name(title)
    for k in (rec.get("uid"), t):
        if k and k in CATEGORY_OVERRIDES:
            return CATEGORY_OVERRIDES[k]
    if rec.get("polyhaven_like"):
        return "texture-set"
    if area is None and re.search(FPS_WORDS, t):
        return "fps"
    if re.search(TREE_WORDS, t) and area in (None, "nature"):
        return "tree"
    if re.search(VEHICLE_WORDS, t) and not re.search(NOT_VEHICLE, t):
        base = "vehicle"
    elif re.search(PROP_WORDS, t) and not re.search(r"\bbuildings?\b|\bhouse\b|lighthouse", t):
        base = "prop"
    elif re.search(BUILDING_WORDS, t) or area == "towns":
        base = "building"
    elif area == "vehicles":
        base = "vehicle"
    else:
        base = "prop"
    pieces = ((rec.get("model") or {}).get("pieces_count") or 0)
    if pieces > 3 and re.search(KIT_WORDS, t):
        return {"prop": "kit", "building": "building-kit", "vehicle": "vehicle-kit"}[base]
    return base


def assess(a):
    """Fill flags + actions for an asset dict (in place)."""
    cat = a["category"]
    b = BUDGETS[cat]
    flags, actions = [], []
    v = a["licence"]["verdict"]
    if v != "OK":
        flags.append("LIC-" + v)
    m = a.get("model") or {}
    tx = a.get("textures") or {}
    over_ratio = 0.0
    if v == "REJECT":
        actions.append("reject (licence: %s)" % a["licence"]["reason"])
    if not m:
        if "gltf+bin" in a["formats"] or "glb" in a["formats"] or "gltf" in a["formats"]:
            flags.append("GLTF-ERROR")
            actions.append("re-download (glTF unreadable)")
        elif a["formats"]:
            flags.append("needs-conversion")
            actions.append("needs-conversion (%s to glTF in Blender)" % "/".join(a["formats"]))
        else:
            flags.append("NO-MODEL")
            actions.append("reject (no model in archive)")
    else:
        tris = m["tris"]
        piece = m["max_piece_tris"]
        if b["tris"] and tris > b["tris"]:
            over_ratio = tris / b["tris"]
            flags.append("TRIS>%dk (%.1fx)" % (b["tris"] // 1000, over_ratio))
            if over_ratio > 6 and cat in ("building", "vehicle"):
                actions.append("use only as far hero piece, or reject (%.0fx budget)" % over_ratio)
            elif over_ratio > 6:
                actions.append("decimate to %dk (heavy: %.0fx) or reject" % (b["tris"] // 1000, over_ratio))
            else:
                actions.append("decimate to %dk" % (b["tris"] // 1000))
        if b["piece"] and not b["tris"] and piece > b["piece"]:
            r = piece / b["piece"]
            over_ratio = max(over_ratio, r)
            flags.append("PIECE>%dk (%.1fx)" % (b["piece"] // 1000, r))
            if cat == "tree":
                actions.append("decimate each tree to ≤10k + impostor/billboard LOD" if r < 8
                               else "reject for mass instancing (%.0fx) / hero tree only" % r)
            else:
                actions.append("decimate heavy pieces to %dk" % (b["piece"] // 1000))
        if cat.endswith("kit") and tris > KIT_TOTAL_WARN:
            flags.append("KIT-TOTAL %dk" % (tris // 1000))
        if b["draws"] and m["draws"] > b["draws"] and not cat.endswith("kit"):
            flags.append("DRAWS %d" % m["draws"])
            actions.append("atlas materials (%d draws to ≤%d)" % (m["draws"], b["draws"]))
        elif cat.endswith("kit") and m["materials_used"] > 12:
            flags.append("MATS %d" % m["materials_used"])
            actions.append("atlas materials across kit (%d materials)" % m["materials_used"])
        if m["skins"]:
            flags.append("SKINNED")
        if m["animations"]:
            flags.append("ANIM %d" % m["animations"])
        if m["morph_targets"]:
            flags.append("MORPH")
        sz = m.get("size_m")
        if (cat == "tree" or cat.endswith("kit")) and m.get("pieces_count", 0) > 1:
            # pieces are laid out side by side: judge scale by the largest single piece
            psz = [max(p["size_m"]) for p in m.get("top_pieces", []) if p.get("size_m")]
            sz = [max(psz)] if psz else sz
        if sz:
            mx = max(sz)
            lo, hi = SIZE_RANGE.get(cat, (0, 1e9))
            if mx > hi or mx < lo:
                flags.append("SCALE? %.3g m" % mx)
                hint = ""
                if mx > hi and lo <= mx / 100 <= hi:
                    hint = "; x0.01 would give %.3g m" % (mx / 100)
                elif mx < lo and lo <= mx * 100 <= hi:
                    hint = "; x100 would give %.3g m" % (mx * 100)
                actions.append("check scale (largest side %.3g m%s)" % (mx, hint))
        ext = m.get("extensions_used") or []
        if "KHR_materials_pbrSpecularGlossiness" in ext:
            flags.append("SPEC-GLOSS")
            actions.append("convert spec/gloss materials to metal/rough (three.js r147+ dropped the extension)")
        if cat == "tree":
            actions.append("instance (InstancedMesh)")
    if tx:
        if b["tex"] and tx.get("max_px", 0) > b["tex"]:
            flags.append("TEX %dpx" % tx["max_px"])
            actions.append("downscale textures to %s" % b["down"])
        elif b["texmb"] and tx.get("rgba_mb", 0) > b["texmb"]:
            actions.append("downscale textures to %s" % b["down"])
        if b["texmb"] and tx.get("rgba_mb", 0) > b["texmb"]:
            flags.append("TEXMB %.0f" % tx["rgba_mb"])
        missing = [i for i in tx.get("images", []) if i.get("error")]
        if missing:
            flags.append("TEX-MISSING %d" % len(missing))
    if cat == "texture-set":
        flags = [f for f in flags if not f.startswith(("TRIS>", "DRAWS", "SCALE?"))]
        actions = [x for x in actions if not x.startswith(("check scale", "atlas"))]
        actions.insert(0, "material/texture set: use the maps only (ignore the preview mesh)")
    if not actions:
        actions.append("use as-is")
    a["flags"] = flags
    a["actions"] = list(dict.fromkeys(actions))
    a["over_budget"] = any(f.startswith(("TRIS>", "PIECE>", "TEX ", "DRAWS", "MATS")) for f in flags)
    a["budget_ratio"] = round(over_ratio, 2)

# ---------------------------------------------------------------- main build

def build(args):
    out = os.path.abspath(args.out)
    os.makedirs(out, exist_ok=True)
    jpath = os.path.join(out, "inventory.json")
    cache = {}
    if os.path.exists(jpath) and not args.rescan:
        try:
            with open(jpath, encoding="utf-8") as f:
                cache = json.load(f)
        except (OSError, ValueError) as e:
            print("warning: could not read previous inventory.json (%s); starting fresh" % e, file=sys.stderr)
    zips = cache.get("zips", {}) if cache.get("tool_version") == TOOL_VERSION else {}
    files = cache.get("files", {})
    for f in files.values():
        f["present"] = False

    paths = []
    for g in args.input:
        paths.extend(glob.glob(g))
    paths = sorted(set(p for p in paths if p.lower().endswith(".zip") and os.path.isfile(p)))

    new = 0
    for p in paths:
        st = os.stat(p)
        prev = files.get(p)
        if prev and prev.get("size") == st.st_size and prev.get("mtime_ns") == st.st_mtime_ns:
            sha = prev["sha256"]
        else:
            sha = sha256_file(p)
        mt = dt.datetime.fromtimestamp(st.st_mtime).astimezone()
        files[p] = {"sha256": sha, "size": st.st_size, "mtime_ns": st.st_mtime_ns,
                    "mtime": mt.isoformat(timespec="seconds"), "batch": mt.date().isoformat(),
                    "present": True}
        if sha not in zips:
            new += 1
            if not args.quiet:
                print("parse %s" % os.path.basename(p), file=sys.stderr)
            rec = parse_zip(p)
            rec["sha256"] = sha
            rec["size"] = st.st_size
            rec["parsed_at"] = now_local().isoformat(timespec="seconds")
            zips[sha] = rec

    areas, items = load_asset_list(args.list)
    by_uid = {it["uid"]: it for it in items}
    by_norm = {norm_name(it["name"]): it for it in items}

    # group zip files -> assets
    groups = {}
    for p, f in sorted(files.items(), key=lambda kv: (kv[1]["mtime"], kv[0])):
        rec = zips.get(f["sha256"])
        if rec is None:
            continue
        lic = rec.get("licence") or {}
        uid = uid_from_url(lic.get("source"))
        key = ("sf:" + uid) if uid else ("sha:" + f["sha256"])
        groups.setdefault(key, []).append((p, f, rec))

    assets, unparseable = [], []
    matched_uids = set()
    for key, members in groups.items():
        p0, f0, rec = next(((p, f, r) for p, f, r in members if r.get("model")), members[0])
        lic = rec.get("licence") or {}
        if rec.get("fatal"):
            for p, f, r in members:
                unparseable.append({"path": p, "sha256": f["sha256"], "size": f["size"], "batch": f["batch"],
                                    "present": f["present"], "errors": r.get("errors")})
            continue
        uid = uid_from_url(lic.get("source"))
        slug = re.sub(r"^[0-9a-f]{8}-", "", os.path.basename(p0))
        title = lic.get("title") or slug[:-4].replace("_", " ")
        match, method = None, None
        if uid and uid in by_uid:
            match, method = by_uid[uid], "uid"
        else:
            for cand in (norm_name(title), norm_name(slug)):
                if cand in by_norm:
                    match, method = by_norm[cand], "name"
                    break
            if not match:
                best, score = None, 0.0
                for n, it in by_norm.items():
                    s = max(difflib.SequenceMatcher(None, norm_name(title), n).ratio(),
                            difflib.SequenceMatcher(None, norm_name(slug), n).ratio())
                    if s > score:
                        best, score = it, s
                if best and score >= 0.88:
                    match, method = best, "fuzzy name (%.2f)" % score
        if match and method != "uid" and uid:
            method += ", different Sketchfab model (uid %s)" % uid
        elif match:
            matched_uids.add(match["uid"])
        verdict, reason = licence_verdict(lic.get("licence"))
        if verdict == "REVIEW" and not lic.get("licence") and rec.get("polyhaven_like"):
            reason = "no licence file; looks like a Poly Haven texture set (CC0 at polyhaven.com) - confirm source"
        elif verdict == "REVIEW" and not lic.get("licence") and match:
            reason = "no licence file; asset list says CC BY 4.0 - confirm on Sketchfab page"
        author_name, author_url = split_author(lic.get("author"))
        shas = sorted(set(f["sha256"] for _, f, _ in members))
        a = {
            "key": key,
            "title": clean_text(title),
            "author": author_name,
            "author_url": author_url,
            "source": lic.get("source"),
            "uid": uid,
            "licence": {"string": lic.get("licence"), "label": licence_label(lic.get("licence")),
                        "link": licence_link(lic.get("licence")), "file": lic.get("file"),
                        "verdict": verdict, "reason": reason},
            "list_match": ({"area": match["area"], "name": match["name"], "uid": match["uid"],
                            "method": method, "list_ktris": match["ktris"], "priority": match["priority"]}
                           if match else None),
            "zips": [{"path": p, "sha256": f["sha256"], "size": f["size"], "mtime": f["mtime"],
                      "batch": f["batch"], "present": f["present"]} for p, f, _ in members],
            "duplicate": len(members) > 1,
            "duplicate_kind": (None if len(members) == 1 else
                               ("identical files" if len(shas) == 1 else "same Sketchfab model, different zip content")),
            "batch": min(f["batch"] for _, f, _ in members),
            "formats": rec.get("formats", []),
            "gltf_member": rec.get("gltf_member"),
            "model": rec.get("model"),
            "textures": ({k: v for k, v in rec["textures"].items()} if rec.get("textures") else None),
            "skipped_members": rec.get("skipped_members"),
            "errors": rec.get("errors"),
            "polyhaven_like": rec.get("polyhaven_like", False),
        }
        area = match["area"] if match else None
        a["category"] = classify(a["title"], area, dict(rec, uid=uid))
        assess(a)
        assets.append(a)

    area_order = [x["id"] for x in areas]
    assets.sort(key=lambda a: (area_order.index(a["list_match"]["area"]) if a["list_match"] else 99,
                               a["title"].lower()))
    missing = [it for it in items if it["uid"] not in matched_uids]

    result = {
        "tool_version": TOOL_VERSION,
        "generated": now_local().isoformat(timespec="seconds"),
        "command": "python3 -I art/br/assets/inventory.py --out art/br/assets",
        "inputs": args.input,
        "asset_list": args.list,
        "budgets": BUDGETS,
        "areas": areas,
        "assets": assets,
        "unparseable": unparseable,
        "not_arrived": missing,
        "arrived_list_uids": sorted(matched_uids),
        "files": files,
        "zips": zips,
    }
    tmp = jpath + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=1, ensure_ascii=False)
    os.replace(tmp, jpath)
    write_report(result, os.path.join(out, "INVENTORY.md"))
    write_attribution(result, os.path.join(out, "ATTRIBUTION.md"))
    ok = sum(1 for a in assets if a["licence"]["verdict"] == "OK")
    rv = sum(1 for a in assets if a["licence"]["verdict"] == "REVIEW")
    rj = sum(1 for a in assets if a["licence"]["verdict"] == "REJECT")
    print("%d zip files (%d newly parsed), %d assets: %d OK / %d REVIEW / %d REJECT, %d unparseable, "
          "%d list items not arrived -> %s" % (len([f for f in files.values() if f["present"]]), new,
                                              len(assets), ok, rv, rj, len(unparseable), len(missing), out))

# ---------------------------------------------------------------- report

def fmt_k(n):
    if n is None:
        return ""
    return "%.1fk" % (n / 1000) if n >= 1000 else str(n)


def row(a):
    m = a.get("model") or {}
    tx = a.get("textures") or {}
    sz = m.get("size_m")
    size = "×".join("%.3g" % v for v in sz) if sz else ""
    tris = fmt_k(m.get("tris")) if m and a["category"] != "texture-set" else "-"
    if m and (a["category"] == "tree" or a["category"].endswith("kit")) and m.get("pieces_count", 0) > 1:
        tris += " (%d pcs, max %s)" % (m["pieces_count"], fmt_k(m["max_piece_tris"]))
    lic = a["licence"]["verdict"]
    if a["licence"]["verdict"] != "OK":
        lic += ": " + a["licence"]["reason"]
    return "| %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s |" % (
        md(a["title"]) + (" ⧉" if a["duplicate"] else "")
        + (" (name match only: different Sketchfab model)" if a["list_match"] and "different" in a["list_match"]["method"] else ""),
        md(a["author"]), md(lic), a["category"], tris,
        m.get("draws", "-") if m else "-",
        tx.get("max_px") or "-", ("%.0f" % tx["rgba_mb"]) if tx else "-", size,
        md(", ".join(a["flags"])) or "-", md("; ".join(a["actions"])), a["batch"][5:])


HEADER = ("| Name | Author | Licence | Cat | Tris | Draws | Max tex | Tex MB | Size m (x×y×z) | Flags | Suggested action | Batch |\n"
          "|---|---|---|---|--:|--:|--:|--:|---|---|---|---|")


def write_report(r, path):
    assets = r["assets"]
    areas = {x["id"]: x for x in r["areas"]}
    L = []
    w = L.append
    gen = r["generated"]
    today = gen[:10]
    w("# Project Island asset inventory")
    w("")
    w("Generated %s by `art/br/assets/inventory.py` (tool v%d). Rerun: `%s` (incremental; cached by zip sha256)."
      % (gen, r["tool_version"], r["command"]))
    w("")
    present = [f for f in r["files"].values() if f["present"]]
    lic = {v: sum(1 for a in assets if a["licence"]["verdict"] == v) for v in ("OK", "REVIEW", "REJECT")}
    dups = [a for a in assets if a["duplicate"]]
    over = [a for a in assets if a["over_budget"]]
    conv = [a for a in assets if "needs-conversion" in a["flags"]]
    on_list = [a for a in assets if a["list_match"]]
    batches = {}
    for a in assets:
        batches[a["batch"]] = batches.get(a["batch"], 0) + 1
    w("## Summary")
    w("")
    w("| | |")
    w("|---|--:|")
    w("| Zip files scanned (present now) | %d |" % len(present))
    w("| Unique assets | %d |" % len(assets))
    w("| Licence OK / REVIEW / REJECT | %d / %d / %d |" % (lic["OK"], lic["REVIEW"], lic["REJECT"]))
    w("| Assets with duplicate zips | %d (%d extra files) |" % (len(dups), sum(len(a["zips"]) - 1 for a in dups)))
    w("| Over budget (tris, per-piece, texture px or draws) | %d |" % len(over))
    w("| Needs conversion (no glTF) | %d |" % len(conv))
    w("| Unparseable zips | %d |" % len(r["unparseable"]))
    w("| On the asset list: arrived / not yet | %d / %d (list has %d items) |"
      % (len(r["arrived_list_uids"]), len(r["not_arrived"]), len(r["arrived_list_uids"]) + len(r["not_arrived"])))
    w("| Not on the asset list | %d |" % (len(assets) - len(on_list)))
    for b in sorted(batches, reverse=True):
        w("| Assets first seen in batch %s%s | %d |" % (b, " (today)" if b == today else "", batches[b]))
    w("")
    w("### Worst budget offenders")
    w("")
    worst = sorted([a for a in assets if a["budget_ratio"] > 1], key=lambda a: -a["budget_ratio"])[:12]
    w("| Asset | Area | Cat | Tris | Over by | Suggested action |")
    w("|---|---|---|--:|--:|---|")
    for a in worst:
        m = a["model"] or {}
        w("| %s | %s | %s | %s | %.1fx | %s |" % (md(a["title"]), a["list_match"]["area"] if a["list_match"] else "not on list",
                                                 a["category"], fmt_k(m.get("tris")), a["budget_ratio"], md("; ".join(a["actions"]))))
    w("")
    w("Most draw calls (primitive uses; atlas/merge before use):")
    w("")
    for a in sorted([a for a in assets if a.get("model") and a["category"] != "texture-set"],
                    key=lambda a: -a["model"]["draws"])[:8]:
        w("- %s: %d draws, %d materials" % (md(a["title"]), a["model"]["draws"], a["model"]["materials"]))
    w("")
    w("Heaviest textures (uncompressed RGBA + mips):")
    w("")
    for a in sorted([a for a in assets if a.get("textures")], key=lambda a: -a["textures"]["rgba_mb"])[:8]:
        w("- %s: %.0f MB, %d images, max %d px" % (md(a["title"]), a["textures"]["rgba_mb"],
                                                  a["textures"]["count"], a["textures"]["max_px"]))
    w("")
    w("### Budget heuristics")
    w("")
    w("- **prop** (small props): > 15k triangles, or any texture > 2048 px (downscale to 1K), or > 12 draws.")
    w("- **building**: > 60k triangles. **vehicle** (vehicles/aircraft): > 80k triangles. Textures > 2048 px -> 2K.")
    w("- **tree**: any single tree (top-level piece under the Sketchfab root wrappers) > 10k triangles is a problem for instancing thousands.")
    w("- **kit / building-kit** (packs with several top-level pieces): budget applied per piece (15k / 60k); kit total > 250k noted; > 12 materials -> atlas.")
    w("- Any model with > 12 draw calls (primitive uses) -> atlas materials. Texture MB = w·h·4·1.33 (RGBA + mips), summed over the glTF's images; over 24 MB (prop/tree) or 96 MB (building/vehicle) is noted.")
    w("- Triangles are counted as rendered by the default scene (each node use of a mesh counts), mode 4 only. Sizes are metres after all node transforms (Sketchfab root rotation/scale included), glTF Y-up.")
    w("- SCALE? = largest side (per piece for kits/trees) outside a plausible range for the category (prop 0.05-40 m, building 1-400 m, vehicle 0.5-100 m, tree 0.5-60 m). Many Sketchfab FBX exports are in centimetres or arbitrary units; verify in Blender before fixing.")
    w("- SPEC-GLOSS = uses KHR_materials_pbrSpecularGlossiness, which three.js (repo uses 0.186) no longer loads; re-export as metal/rough.")
    w("- Category is guessed from the title and list area; override in `CATEGORY_OVERRIDES` in the script. Ratios > 6x on buildings/vehicles suggest hero-only or reject.")
    w("- Licence: OK only for CC BY (any version) and CC0/public domain. NC, ND, Editorial, Standard/paid -> REJECT; SA, missing or unrecognised -> REVIEW.")
    w("")
    w("⧉ = asset arrived in more than one zip (see Duplicates). Batch = date (MM-DD) the first copy's file was saved.")
    w("")

    for area in r["areas"]:
        rows = [a for a in assets if a["list_match"] and a["list_match"]["area"] == area["id"]]
        miss = [it for it in r["not_arrived"] if it["area"] == area["id"]]
        w("## %s" % md(area["title"]))
        w("")
        n_arr = len({a["list_match"]["uid"] for a in rows if a["list_match"]["uid"] in r["arrived_list_uids"]})
        w("Grid %s. Arrived %d, not yet %d." % (md(area["grid"]), n_arr, len(miss)))
        w("")
        if rows:
            w(HEADER)
            for a in rows:
                w(row(a))
            w("")
    rest = [a for a in assets if not a["list_match"]]
    w("## Not on the asset list")
    w("")
    w("Includes the earlier 5v5 / FPS downloads and the Poly Haven texture sets (the list footer says terrain and building textures come from Poly Haven / ambientCG, CC0).")
    w("")
    if rest:
        w(HEADER)
        for a in rest:
            w(row(a))
        w("")
    w("## Duplicates")
    w("")
    if not dups:
        w("None.")
    for a in dups:
        w("- **%s** (%s): %s" % (md(a["title"]), a["duplicate_kind"],
                                 ", ".join("`%s`" % os.path.basename(z["path"]) for z in a["zips"])))
    w("")
    w("## Unparseable zips")
    w("")
    if not r["unparseable"]:
        w("None.")
    for u in r["unparseable"]:
        w("- `%s` (%.1f MB, %s): %s" % (os.path.basename(u["path"]), u["size"] / 1e6, u["batch"],
                                        md("; ".join(u["errors"] or []))))
    skipped = [(a, s) for a in assets for s in (a.get("skipped_members") or [])]
    errs = [(a, e) for a in assets for e in (a.get("errors") or [])]
    if skipped or errs:
        w("")
        w("Partial problems inside otherwise-parsed zips:")
        w("")
        for a, s in skipped:
            w("- %s: skipped `%s` (%s)" % (md(a["title"]), md(s["name"]), s["reason"]))
        for a, e in errs:
            w("- %s: %s" % (md(a["title"]), md(e)))
    w("")
    w("## Not arrived yet (on the list, no matching zip)")
    w("")
    if not r["not_arrived"]:
        w("Everything on the list has arrived.")
    else:
        w("| Area | Name | Author | Priority | Sketchfab tris |")
        w("|---|---|---|---|--:|")
        for it in r["not_arrived"]:
            w("| %s | [%s](https://sketchfab.com/3d-models/%s) | %s | %s | %sk |"
              % (it["area"], md(it["name"]), it["uid"], md(it["author"]), it["priority"], it["ktris"]))
    w("")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L))


def write_attribution(r, path):
    L = ["# Third-party 3D model credits", "",
         "Generated by `art/br/assets/inventory.py` on %s from the licence files inside each download. "
         "Do not edit by hand; rerun the tool." % r["generated"][:10], ""]
    by = [a for a in r["assets"] if a["licence"]["verdict"] == "OK" and "CC0" not in (a["licence"]["reason"] or "")]
    cc0 = [a for a in r["assets"] if a["licence"]["verdict"] == "OK" and "CC0" in (a["licence"]["reason"] or "")]
    L.append("## Creative Commons Attribution")
    L.append("")
    for a in sorted(by, key=lambda a: a["title"].lower()):
        label = a["licence"]["label"] or "CC BY 4.0"
        link = a["licence"]["link"] or "https://creativecommons.org/licenses/by/4.0/"
        author = a["author"] or "unknown author"
        src = " (%s)" % a["source"] if a["source"] else ""
        L.append('- "%s" by %s%s, licensed under %s (%s)' % (a["title"].replace('"', "'"), author, src, label, link))
    if cc0:
        L += ["", "## CC0 / public domain (no attribution required)", ""]
        for a in sorted(cc0, key=lambda a: a["title"].lower()):
            L.append('- "%s"%s' % (a["title"], (" by " + a["author"]) if a["author"] else ""))
    L += ["", "Assets whose licence is under REVIEW or REJECT are not listed; see INVENTORY.md.", ""]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L))


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--out", default=here, help="output directory (default: the script's directory)")
    ap.add_argument("--list", default=DEFAULT_LIST, help="asset list HTML (index.html with ITEMS array)")
    ap.add_argument("--input", action="append", help="glob of zips (repeatable; default: attachments + uploads)")
    ap.add_argument("--rescan", action="store_true", help="ignore the cache and re-parse every zip")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()
    if not args.input:
        args.input = DEFAULT_INPUTS
    build(args)


if __name__ == "__main__":
    main()
