"""
PBR texture set and Blender materials for the PvPStrike characters.

Textures are generated procedurally with numpy (deterministic) at 1K/512: a fine twill
for uniform/jacket cloth, ripstop for trousers, Cordura nylon with MOLLE webbing rows for
carriers and pouches, pebbled leather for boots, synthetic knit/leather for gloves, matte
polymer for the helmet, and printed patches (POLICE). Albedo maps are neutral and tinted by
each role's palette (glTF baseColorFactor), so both characters share one image set. Fine
detail repeats in texture space (KHR_texture_transform) over the smart-UV atlas.
"""
import math, os
import numpy as np
import bpy
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "build", "tex")
_rng = np.random.default_rng(2026)


def noise(n, octaves=5, base=4, persistence=0.55, seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros((n, n))
    amp = total = 0.0
    amp = 1.0
    for o in range(octaves):
        cells = base * 2**o
        if cells > n:
            break
        lat = r.random((cells, cells))
        xs = np.arange(n) * cells / n
        i0 = np.floor(xs).astype(int) % cells
        i1 = (i0 + 1) % cells
        f = xs - np.floor(xs)
        f = f * f * (3 - 2 * f)
        rows = lat[i0] * (1 - f)[:, None] + lat[i1] * f[:, None]
        out += (rows[:, i0] * (1 - f)[None] + rows[:, i1] * f[None]) * amp
        total += amp
        amp *= persistence
    return out / total


def nmap(h, s):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * s
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * s
    n = np.dstack([-dx, dy, np.ones_like(h)])
    return n / np.linalg.norm(n, axis=2, keepdims=True) * 0.5 + 0.5


def save(name, a):
    a = np.clip(a, 0, 1)
    Image.fromarray((a * 255 + 0.5).astype(np.uint8)).save(os.path.join(TEX, name + ".png"))


def make_textures():
    os.makedirs(TEX, exist_ok=True)
    n = 1024
    y, x = np.mgrid[0:n, 0:n] / n
    # Twill: diagonal ribs + yarn noise; the albedo carries soft wear and sun fade.
    rib = 0.5 + 0.5 * np.sin((x + y) * 2 * np.pi * 96)
    yarn = noise(n, 6, 64, seed=1)
    wear = noise(n, 5, 4, seed=2)
    save("twill_n", nmap(rib * 0.6 + yarn * 0.4, 2.2))
    save("twill", np.dstack([0.82 + 0.1 * wear + 0.05 * yarn] * 3))
    save("twill_r", 0.82 + 0.1 * yarn)
    # Ripstop: square grid of heavier threads.
    g = ((x * 48) % 1 < 0.08) | ((y * 48) % 1 < 0.08)
    weave = 0.5 + 0.25 * (np.sin(x * 2 * np.pi * 256) + np.sin(y * 2 * np.pi * 256))
    save("ripstop_n", nmap(g * 0.6 + weave * 0.25 + yarn * 0.2, 2.0))
    save("ripstop", np.dstack([0.8 + 0.12 * wear - 0.06 * g] * 3))
    # Cordura with MOLLE: horizontal 1" webbing rows with stitch tacks, coarse nylon weave.
    rows = ((y * 16) % 1 < 0.55).astype(float)
    tack = (((x * 12) % 1 < 0.04) & (rows > 0)).astype(float)
    edge = np.clip(1 - np.abs(((y * 16) % 1) - 0.55) / 0.02, 0, 1) + np.clip(1 - ((y * 16) % 1) / 0.02, 0, 1)
    cw = 0.5 + 0.25 * (np.sin(x * 2 * np.pi * 180) * np.sin(y * 2 * np.pi * 180))
    save("cordura_n", nmap(rows * 0.5 + cw * 0.3 - edge * 0.4 - tack * 0.3, 3.0))
    save("cordura", np.dstack([0.78 + 0.12 * wear - 0.12 * tack - 0.08 * edge] * 3))
    save("cordura_r", 0.7 + 0.15 * yarn - 0.1 * rows)
    # Pebbled leather (boots, gloves palm).
    peb = noise(n, 4, 96, seed=3)
    crease = np.clip(1 - np.abs(noise(n, 4, 6, seed=4) - 0.5) / 0.015, 0, 1)
    save("leather_n", nmap(peb * 0.5 - crease * 0.5, 3.0))
    save("leather", np.dstack([0.78 + 0.12 * noise(n, 5, 8, seed=5) - 0.15 * crease] * 3))
    save("leather_r", 0.55 + 0.25 * peb)
    # Helmet polymer: fine orange-peel paint with scuffs.
    peel = noise(n, 3, 128, seed=6)
    scuff = np.clip((noise(n, 5, 8, seed=7) - 0.7) * 4, 0, 1)
    save("polymer_n", nmap(peel * 0.4, 2.0))
    save("polymer", np.dstack([0.86 + 0.08 * peel - 0.25 * scuff] * 3))
    save("polymer_r", 0.6 + 0.2 * peel + 0.15 * scuff)
    # Patches: POLICE (navy carrier) and a blank sand tab (insurgent rig).
    w, h = 1024, 256
    img = Image.new("RGB", (w, h), (12, 16, 24))
    d = ImageDraw.Draw(img)
    font = None
    for path in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                 "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"):
        if os.path.exists(path):
            font = ImageFont.truetype(path, 180)
            break
    font = font or ImageFont.load_default()
    d.text((w / 2, h / 2), "POLICE", fill=(232, 232, 228), font=font, anchor="mm")
    arr = np.asarray(img).astype(float) / 255
    arr = arr * (0.9 + 0.1 * noise(256, 4, 32, seed=8)[np.arange(h) % 256][:, np.arange(w) % 256, None])
    save("patch_police", arr)


ROLE_PALETTE = {
    "police": {
        "top": ("twill", (0.085, 0.105, 0.16), 0.85),   # navy uniform shirt
        "pants": ("ripstop", (0.075, 0.09, 0.135), 0.85),
        "boots": ("leather", (0.06, 0.058, 0.055), 0.5),
        "gloves": ("leather", (0.05, 0.05, 0.052), 0.6),
        "skin": (None, (0.62, 0.45, 0.36), 0.55),
        "gear": ("cordura", (0.055, 0.06, 0.068), 0.8),  # black carrier and pouches
        "webbing": ("cordura", (0.04, 0.042, 0.046), 0.85),
        "plastic": (None, (0.05, 0.05, 0.055), 0.45),
        "metal": (None, (0.32, 0.33, 0.34), 0.35),
        "helmet": ("polymer", (0.10, 0.115, 0.135), 0.6),
        "patch": ("patch_police", (1, 1, 1), 0.9),
        "lens": (None, (0.03, 0.035, 0.04), 0.08),
    },
    "terrorist": {
        "top": ("twill", (0.085, 0.085, 0.08), 0.88),   # charcoal field jacket
        "pants": ("ripstop", (0.24, 0.20, 0.15), 0.9),  # dusty brown cargo trousers
        "boots": ("leather", (0.22, 0.17, 0.12), 0.65),  # brown suede tactical shoes
        "gloves": ("leather", (0.12, 0.1, 0.085), 0.7),
        "skin": (None, (0.55, 0.39, 0.29), 0.55),
        "gear": ("cordura", (0.32, 0.26, 0.18), 0.85),  # coyote chest rig
        "webbing": ("cordura", (0.25, 0.25, 0.19), 0.9),  # olive webbing
        "plastic": (None, (0.06, 0.06, 0.06), 0.5),
        "metal": (None, (0.3, 0.3, 0.3), 0.4),
        "helmet": ("polymer", (0.2, 0.2, 0.18), 0.6),
        "patch": ("cordura", (0.45, 0.4, 0.3), 0.9),
        "lens": (None, (0.03, 0.035, 0.04), 0.08),
    },
}
REPEAT = {"twill": 7, "ripstop": 6, "cordura": 3, "leather": 5, "polymer": 2, "patch_police": 1}


def _image(name, data):
    path = os.path.join(TEX, name + ".png")
    img = bpy.data.images.load(path, check_existing=True)
    if data:
        img.colorspace_settings.name = "Non-Color"
    return img


def material(role, key):
    tex, tint, rough = ROLE_PALETTE[role][key]
    m = bpy.data.materials.new(f"{role}-{key}")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = 0.85 if key == "metal" else 0.0
    if key == "skin":
        b.inputs["Subsurface Weight"].default_value = 0.1
    if not tex:
        b.inputs["Base Color"].default_value = (*tint, 1)
        return m
    uv = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    rep = REPEAT.get(tex, 4)
    mp.inputs["Scale"].default_value = (rep, rep, 1)
    nt.links.new(uv.outputs["UV"], mp.inputs["Vector"])
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = _image(tex, False)
    nt.links.new(mp.outputs["Vector"], t.inputs["Vector"])
    if tint != (1, 1, 1):
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1
        nt.links.new(t.outputs["Color"], mix.inputs[6])
        mix.inputs[7].default_value = (*tint, 1)
        nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    else:
        nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    if os.path.exists(os.path.join(TEX, tex + "_n.png")):
        tn = nt.nodes.new("ShaderNodeTexImage")
        tn.image = _image(tex + "_n", True)
        nt.links.new(mp.outputs["Vector"], tn.inputs["Vector"])
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = 0.8
        nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    if os.path.exists(os.path.join(TEX, tex + "_r.png")):
        tr = nt.nodes.new("ShaderNodeTexImage")
        tr.image = _image(tex + "_r", True)
        nt.links.new(mp.outputs["Vector"], tr.inputs["Vector"])
        nt.links.new(tr.outputs["Color"], b.inputs["Roughness"])
    return m


def palette(role):
    make_textures()
    return {k: material(role, k) for k in ROLE_PALETTE[role]}
