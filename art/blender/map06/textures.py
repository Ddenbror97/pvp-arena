"""
SANDGATE (map 06) PBR textures (deterministic). Writes art/blender/map06/build/tex/*.

  python3 art/blender/map06/textures.py

Two sources:
- CC0 Poly Haven 2K scans (incoming/<id>_2k, see docs/fps-bomb/ASSETS.md), graded into the map's
  warm sand / limestone / ochre palette (saturation pulled toward the target colour, mean colour
  matched, contrast kept) and resized to the GPU budget below.
- Procedural sets made here: terracotta barrel-tile roofs, painted wood, painted corrugated metal,
  a facade trim atlas (windows, shutters, doors, roller shutters, vents, AC fronts, cabinets,
  ceramic tile bands, hazard edges) and an RGBA decal atlas (bombsite letters, road paint,
  sand drifts, stains, cracks, drains, grime).

Conventions (as glTF expects): *_c albedo sRGB; *_n OpenGL tangent-space normal (+Y up);
*_orm linear occlusion (R) / roughness (G) / metalness (B), the Poly Haven "arm" layout.
Budget: 2K albedo only on the three hero surfaces (plaster, sandstone, site pavement) and the two
atlases; every normal/ORM of a tiling surface ships at 512 (low-frequency detail).
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
INC = os.path.join(HERE, "incoming")
OUT = os.path.join(HERE, "build", "tex")
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, os.path.join(HERE, "..", "map"))
import textures as base  # noqa: E402  (Dustfront helpers: tileable noise, normals)

noise, normal_from_height = base.noise, base.normal_from_height
F32 = np.float32


def save(name, arr, size=None, quality=92):
    arr = np.clip(arr, 0, 1)
    mode = "L" if arr.ndim == 2 else ("RGBA" if arr.shape[2] == 4 else "RGB")
    img = Image.fromarray((arr * 255 + 0.5).astype(np.uint8), mode)
    if size and img.width != size:
        img = img.resize((size, size), Image.LANCZOS)
    path = os.path.join(OUT, name + (".png" if mode == "RGBA" or name.endswith("_n") else ".jpg"))
    if path.endswith(".jpg"):
        img.save(path, quality=quality)
    else:
        img.save(path, optimize=True)


def load(path, size=None):
    img = Image.open(path).convert("RGB")
    if size and img.width != size:
        img = img.resize((size, size), Image.LANCZOS)
    return np.asarray(img).astype(F32) / 255


def grade(col, target, sat=0.6, contrast=1.0, lift=0.0):
    """Pull saturation toward `sat` of the original, then match the mean colour to `target`
    (sRGB 0..1) while keeping the scan's luminance detail."""
    lum = (col * np.array([0.299, 0.587, 0.114], F32)).sum(2, keepdims=True)
    out = lum + (col - lum) * sat
    mean_lum = lum.mean()
    out = mean_lum + (out - mean_lum) * contrast + lift
    out = out * (np.array(target, F32) / out.reshape(-1, 3).mean(0))
    return np.clip(out, 0, 1)


# --------------------------------------------------------------------------- Poly Haven scans
SCANS = {
    # name: (Poly Haven id, albedo size, target mean colour, saturation, contrast, rough scale)
    "plaster": ("cracked_concrete_wall", 2048, (0.85, 0.79, 0.68), 0.5, 0.5, 1.0),
    "sandstone": ("large_sandstone_blocks_01", 2048, (0.74, 0.64, 0.50), 0.4, 0.8, 1.0),
    "flagstone": ("large_sandstone_blocks_01", 1024, (0.76, 0.665, 0.53), 0.55, 0.7, 1.0),
    "pavement": ("concrete_pavement", 1024, (0.73, 0.65, 0.53), 0.9, 0.9, 1.0),
    "asphalt": ("asphalt_02", 1024, (0.48, 0.44, 0.39), 0.6, 0.9, 1.0),
    "yard": ("gravel_embedded_concrete_02", 1024, (0.71, 0.64, 0.53), 0.8, 0.75, 1.0),
    "dirt": ("gravel", 1024, (0.66, 0.55, 0.42), 0.75, 0.7, 1.0),
    "concrete": ("gravel_concrete_03", 1024, (0.69, 0.64, 0.56), 0.5, 0.8, 1.0),
    "adobe": ("sandstone_cracks", 1024, (0.78, 0.67, 0.52), 0.55, 0.65, 1.0),
    "brickplaster": ("patterned_plaster_wall", 1024, (0.78, 0.68, 0.57), 0.7, 0.9, 1.0),
}


def scans():
    for name, (pid, size, target, sat, contrast, _) in SCANS.items():
        d = os.path.join(INC, f"{pid}_2k", "textures")
        col = load(os.path.join(d, f"{pid}_diff_2k.jpg"), size)
        save(f"{name}_c", grade(col, target, sat, contrast))
        save(f"{name}_n", load(os.path.join(d, f"{pid}_nor_gl_2k.jpg"), 512))
        arm = load(os.path.join(d, f"{pid}_arm_2k.jpg"), 512)
        arm[..., 2] = 0.0  # stone, plaster, concrete: never metallic
        arm[..., 0] = 0.35 + 0.65 * arm[..., 0]  # soften baked AO (the sun still shadows)
        save(f"{name}_orm", arm)


# --------------------------------------------------------------------------- procedural helpers
def orm(ao, rough, metal):
    return np.dstack([ao, rough, metal]).astype(F32)


def ramp(x, a, b):
    return np.clip((x - a) / (b - a), 0, 1)


def roof_tiles():
    """Mediterranean barrel (Roman) tiles: 6 columns × 8 courses per tile repeat."""
    n = 1024
    y, x = (np.mgrid[0:n, 0:n] / n).astype(F32)
    cols, rows = 6, 8
    fx = (x * cols) % 1
    row = np.floor(y * rows)
    fy = y * rows - row
    rng = np.random.default_rng(5)
    jit = rng.random((rows, cols * 2)).astype(F32)
    cid = np.floor(x * cols).astype(int) % cols
    tone = jit[row.astype(int) % rows, cid]
    barrel = np.sqrt(np.clip(1 - (2 * fx - 1) ** 2, 0, 1))  # half-cylinder
    lip = ramp(fy, 0.0, 0.18)  # each course overlaps the one below
    h = barrel * (0.55 + 0.45 * lip)
    gap = ramp(np.abs(fx - 0.5), 0.47, 0.5)  # channel between barrels
    m = noise(n, 6, 4, seed=81).astype(F32)
    fine = noise(n, 6, 48, seed=82).astype(F32)
    terracotta = np.array([0.66, 0.36, 0.22], F32)
    pale = np.array([0.80, 0.55, 0.38], F32)
    colr = terracotta * (1 - tone[..., None] * 0.6) + pale * (tone[..., None] * 0.6)
    colr = colr * (0.82 + 0.18 * fine)[..., None]
    dust = ramp(m, 0.45, 0.8) * 0.45 + gap * 0.5
    colr = colr * (1 - dust[..., None]) + np.array([0.74, 0.64, 0.50], F32) * dust[..., None]
    shade = (0.62 + 0.38 * lip) * (0.55 + 0.45 * barrel) * (1 - gap * 0.5)
    colr *= shade[..., None]
    save("rooftile_c", colr, 512)
    save("rooftile_n", normal_from_height(h * 0.9 + fine * 0.08, 7.0), 512)
    save("rooftile_orm", orm(0.55 + 0.45 * barrel * lip, 0.72 + 0.2 * fine, 0 * h), 512)


def wood():
    """Weathered painted planks (light paint, tinted per object with vertex colour) with bare
    grey-brown wood where the paint has flaked; vertical boards."""
    n = 512
    y, x = (np.mgrid[0:n, 0:n] / n).astype(F32)
    boards = 5
    bx = (x * boards) % 1
    bid = np.floor(x * boards)
    grain = noise(n, 6, 8, seed=91).astype(F32)
    streak = np.sin((x * boards * 40 + grain * 6 + bid * 3.1) * np.pi) * 0.5 + 0.5
    seam = ramp(np.abs(bx - 0.5), 0.46, 0.5)
    flake = ramp(noise(n, 6, 6, seed=92).astype(F32) + noise(n, 4, 32, seed=93).astype(F32) * 0.3, 0.98, 1.06)
    bare = np.array([0.42, 0.34, 0.25], F32) * (0.75 + 0.25 * streak)[..., None]
    paint = np.array([0.90, 0.88, 0.82], F32) * (0.9 + 0.1 * grain)[..., None]
    colr = paint * (1 - flake[..., None]) + bare * flake[..., None]
    colr *= (1 - seam * 0.55)[..., None]
    save("wood_c", colr)
    h = streak * 0.15 + (1 - seam) * 0.6 - flake * 0.12
    save("wood_n", normal_from_height(h, 5.0))
    save("wood_orm", orm(1 - seam * 0.5, 0.62 + flake * 0.25, 0 * h))


def metal():
    """Painted corrugated steel (light paint, tinted per object), rust runs, scratches."""
    n = 512
    y, x = (np.mgrid[0:n, 0:n] / n).astype(F32)
    corr = np.sin(x * 2 * np.pi * 8) * 0.5 + 0.5
    rust = ramp(noise(n, 6, 4, seed=101).astype(F32) * (0.6 + 0.4 * y), 0.55, 0.8)
    runs = ramp(noise(n, 4, 24, seed=102).astype(F32), 0.62, 0.75) * y
    rust = np.clip(rust + runs * 0.6, 0, 1)
    fine = noise(n, 6, 64, seed=103).astype(F32)
    paint = np.array([0.80, 0.79, 0.74], F32) * (0.92 + 0.08 * fine)[..., None]
    rusty = np.array([0.42, 0.24, 0.13], F32) * (0.8 + 0.4 * fine)[..., None]
    colr = paint * (1 - rust[..., None]) + rusty * rust[..., None]
    colr *= (0.85 + 0.15 * corr)[..., None]
    save("metal_c", colr)
    save("metal_n", normal_from_height(corr * 0.8 + fine * 0.05, 5.0))
    save("metal_orm", orm(0.8 + 0.2 * corr, 0.55 + 0.3 * rust, 0.25 * (1 - rust)))


# --------------------------------------------------------------------------- trim atlas
# 4 × 4 cells of 512 px; cell index = row * 4 + col (row 0 at the top of the image).
TRIM = ["window", "shutter", "door", "plankdoor",
        "roller", "grille", "vent", "acfront",
        "panel", "cabinet", "sign", "beam",
        "dark", "tiles", "hazard", "soil"]


def trim():
    S, C = 2048, 512
    col = np.zeros((S, S, 3), F32)
    hgt = np.zeros((S, S), F32)
    rough = np.ones((S, S), F32) * 0.8
    met = np.zeros((S, S), F32)
    ao = np.ones((S, S), F32)
    y, x = (np.mgrid[0:C, 0:C] / C).astype(F32)
    fine = noise(C, 6, 32, seed=111).astype(F32)
    blot = noise(C, 5, 4, seed=112).astype(F32)

    def put(name, c, h, r, m=None, a=None):
        i = TRIM.index(name)
        r0, c0 = (i // 4) * C, (i % 4) * C
        col[r0:r0 + C, c0:c0 + C] = c
        hgt[r0:r0 + C, c0:c0 + C] = h
        rough[r0:r0 + C, c0:c0 + C] = r
        met[r0:r0 + C, c0:c0 + C] = 0 if m is None else m
        ao[r0:r0 + C, c0:c0 + C] = 1 if a is None else a

    def frame_mask(bx, by, w):
        return ((x < bx + w) | (x > 1 - bx - w) | (y < by + w) | (y > 1 - by - w)) & (x > bx) & (x < 1 - bx) & (y > by) & (y < 1 - by)

    def rgb(v):
        return np.array(v, F32)[None, None]

    # window: dark wooden frame, 2 × 3 panes, dusty glass reflecting a warm sky gradient.
    frame = frame_mask(0.0, 0.0, 0.07)
    mull = (np.abs(x - 0.5) < 0.022) | (np.abs(y - 0.36) < 0.02) | (np.abs(y - 0.68) < 0.02)
    glass = rgb((0.34, 0.40, 0.45)) * (0.6 + 0.55 * (1 - y))[..., None] + rgb((0.40, 0.34, 0.26)) * (blot * 0.3)[..., None]
    wood_c = rgb((0.36, 0.25, 0.16)) * (0.8 + 0.2 * fine)[..., None]
    fm = (frame | mull)
    c = np.where(fm[..., None], wood_c, glass)
    put("window", c, fm * 0.7 + fine * 0.03, np.where(fm, 0.7, 0.12 + 0.3 * blot), a=np.where(fm, 1, 0.85))

    # shutter: louvre slats in a frame (light paint for vertex tint), flaking.
    slat = (y * 22) % 1
    sh = np.where(frame_mask(0, 0, 0.08), 0.7, 0.25 + 0.5 * slat)
    flake = ramp(blot + fine * 0.4, 1.0, 1.1)
    c = rgb((0.88, 0.86, 0.80)) * (0.55 + 0.45 * slat)[..., None]
    c = c * (1 - flake[..., None]) + rgb((0.40, 0.32, 0.23)) * flake[..., None]
    put("shutter", c, sh, 0.6 + 0.25 * flake, a=0.6 + 0.4 * slat)

    # door: double panelled door (light paint, tinted), dark centre gap, iron studs.
    gap = np.abs(x - 0.5) < 0.008
    px = (x % 0.5) / 0.5
    panels = ((np.abs(px - 0.5) < 0.33) & (((y > 0.08) & (y < 0.42)) | ((y > 0.52) & (y < 0.92))))
    inner = ((np.abs(px - 0.5) < 0.30) & (((y > 0.1) & (y < 0.40)) | ((y > 0.54) & (y < 0.90))))
    h = 0.7 - panels * 0.25 + inner * 0.18
    c = rgb((0.86, 0.83, 0.76)) * (0.9 + 0.1 * fine)[..., None]
    c = c * (1 - flake[..., None] * 0.8) + rgb((0.38, 0.29, 0.20)) * (flake[..., None] * 0.8)
    c = np.where(gap[..., None], rgb((0.05, 0.04, 0.03)), c)
    stud = ((np.abs(((x * 8) % 1) - 0.5) < 0.08) & (np.abs(((y * 10) % 1) - 0.5) < 0.06) & ~panels)
    c = np.where(stud[..., None], rgb((0.18, 0.16, 0.14)), c)
    put("door", c, h + stud * 0.2 - gap * 0.6, 0.65, m=stud * 0.6, a=1 - gap * 0.8)

    # plankdoor: natural dark wood planks with iron straps.
    bx = (x * 6) % 1
    strap = (np.abs(y - 0.2) < 0.03) | (np.abs(y - 0.8) < 0.03)
    grain = np.sin((x * 6 * 30 + blot * 8) * np.pi) * 0.5 + 0.5
    c = rgb((0.40, 0.29, 0.19)) * (0.75 + 0.25 * grain)[..., None] * (1 - ramp(np.abs(bx - 0.5), 0.46, 0.5) * 0.6)[..., None]
    c = np.where(strap[..., None], rgb((0.16, 0.14, 0.13)), c)
    put("plankdoor", c, (1 - ramp(np.abs(bx - 0.5), 0.46, 0.5)) * 0.6 + strap * 0.3, np.where(strap, 0.45, 0.7), m=strap * 0.7)

    # roller: horizontal steel slats (light paint), rust at the base.
    sl = (y * 30) % 1
    rust = ramp(blot * (0.4 + 0.8 * y), 0.5, 0.8)
    c = rgb((0.78, 0.77, 0.72)) * (0.7 + 0.3 * np.sin(sl * np.pi))[..., None]
    c = c * (1 - rust[..., None]) + rgb((0.40, 0.24, 0.14)) * rust[..., None]
    put("roller", c, np.sin(sl * np.pi) * 0.5, 0.45 + 0.35 * rust, m=0.6 * (1 - rust))

    # grille: iron bars over a dark interior window.
    bars = (np.abs(((x * 7) % 1) - 0.5) < 0.07) | (np.abs(((y * 4) % 1) - 0.5) < 0.04)
    inside = rgb((0.07, 0.065, 0.06)) * (0.6 + 0.6 * (1 - y))[..., None]
    c = np.where(bars[..., None], rgb((0.17, 0.15, 0.13)), inside)
    c = np.where(frame[..., None], rgb((0.55, 0.50, 0.42)), c)
    put("grille", c, bars * 0.6 + frame * 0.8, np.where(bars, 0.5, 0.9), m=bars * 0.7, a=np.where(bars | frame, 1, 0.5))

    # vent: louvred metal vent in a frame.
    lv = (y * 12) % 1
    c = rgb((0.62, 0.60, 0.55)) * (0.4 + 0.6 * lv)[..., None]
    c = np.where(frame_mask(0, 0, 0.06)[..., None], rgb((0.66, 0.64, 0.58)), c)
    put("vent", c, lv * 0.5, 0.55, m=0.5, a=0.5 + 0.5 * lv)

    # acfront: AC condenser front: casing, round fan grille, side louvres.
    r = np.hypot(x - 0.38, y - 0.5)
    fan = r < 0.3
    ring = (np.abs(((r * 30) % 1) - 0.5) < 0.18) & fan
    louv = (x > 0.74) & (x < 0.94) & (((y * 16) % 1) < 0.5) & (y > 0.12) & (y < 0.88)
    c = rgb((0.80, 0.78, 0.72)) * (0.9 + 0.1 * fine)[..., None]
    c = np.where(fan[..., None], rgb((0.10, 0.10, 0.10)), c)
    c = np.where(ring[..., None], rgb((0.45, 0.45, 0.43)), c)
    c = np.where(louv[..., None], rgb((0.35, 0.34, 0.31)), c)
    dirt = ramp(blot, 0.5, 0.9) * 0.35
    c = c * (1 - dirt[..., None]) + rgb((0.45, 0.38, 0.28)) * dirt[..., None]
    put("acfront", c, 0.6 - fan * 0.4 + ring * 0.2 - louv * 0.2, 0.55, m=0.3, a=np.where(fan, 0.5, 1))

    # panel: plain painted steel with rivets and wear (AC sides, cabinets, boxes).
    riv = (np.abs(((x * 8) % 1) - 0.5) < 0.05) & (np.abs(((y * 8) % 1) - 0.5) < 0.05) & ((x < 0.06) | (x > 0.94) | (y < 0.06) | (y > 0.94) | True) & ((((x * 8) % 1) < 0.5) | True)
    riv = riv & ((x < 0.08) | (x > 0.92) | (y < 0.08) | (y > 0.92))
    wear = ramp(blot + fine * 0.3, 0.98, 1.08)
    c = rgb((0.74, 0.73, 0.68)) * (0.92 + 0.08 * fine)[..., None]
    c = c * (1 - wear[..., None]) + rgb((0.30, 0.27, 0.24)) * wear[..., None]
    put("panel", c, 0.5 + riv * 0.3, 0.5 + 0.2 * wear, m=0.4 + 0.4 * wear)

    # cabinet: two-door electrical cabinet, warning triangle (no text), vents.
    tri = (y > 0.25) & (y < 0.42) & (np.abs(x - 0.75) < (y - 0.25) * 0.6)
    c = rgb((0.56, 0.58, 0.50)) * (0.9 + 0.1 * fine)[..., None]
    c = c * (1 - wear[..., None]) + rgb((0.28, 0.26, 0.22)) * wear[..., None]
    c = np.where(tri[..., None], rgb((0.85, 0.66, 0.12)), c)
    c = np.where((np.abs(x - 0.5) < 0.006)[..., None], rgb((0.08, 0.08, 0.08)), c)
    vents = (y > 0.75) & (y < 0.88) & (((y * 60) % 1) < 0.5) & ((np.abs(x - 0.25) < 0.15) | (np.abs(x - 0.75) < 0.15))
    c = np.where(vents[..., None], rgb((0.15, 0.15, 0.14)), c)
    put("cabinet", c, 0.5 - vents * 0.2 - (np.abs(x - 0.5) < 0.006) * 0.4, 0.5, m=0.45)

    # sign: faded painted board with a geometric pattern (no lettering, no branding).
    band = (np.abs(y - 0.5) < 0.12)
    dots = (np.hypot(((x * 6) % 1) - 0.5, ((y * 2) % 1) - 0.5) < 0.14) & ~band
    c = rgb((0.72, 0.60, 0.40))
    c = np.where(band[..., None], rgb((0.38, 0.52, 0.52)), c)
    c = np.where(dots[..., None], rgb((0.62, 0.30, 0.20)), c)
    fade = ramp(blot, 0.3, 0.9) * 0.45
    c = c * (1 - fade[..., None]) + rgb((0.82, 0.76, 0.64)) * fade[..., None]
    c = np.where(frame_mask(0, 0, 0.04)[..., None], rgb((0.30, 0.22, 0.15)), c)
    put("sign", c * (0.92 + 0.08 * fine)[..., None], 0.5 + frame_mask(0, 0, 0.04) * 0.2, 0.75)

    # beam: dark weathered timber (lintels, gate beams, pergola).
    grain = np.sin((y * 50 + blot * 10) * np.pi) * 0.5 + 0.5
    c = rgb((0.34, 0.25, 0.17)) * (0.7 + 0.3 * grain)[..., None] * (0.9 + 0.1 * fine)[..., None]
    put("beam", c, grain * 0.3, 0.78)

    # dark: deep recess / interior darkness (open doorways seen from outside).
    put("dark", rgb((0.045, 0.04, 0.035)) * (0.7 + 0.6 * (1 - y))[..., None], np.zeros_like(x), 0.95, a=np.full_like(x, 0.3))

    # tiles: glazed ceramic band, Mediterranean geometric motif, chipped and dusty.
    tx, ty = (x * 4) % 1, (y * 4) % 1
    d = np.abs(tx - 0.5) + np.abs(ty - 0.5)
    motif = d < 0.32
    centre = np.hypot(tx - 0.5, ty - 0.5) < 0.1
    grout = (tx < 0.03) | (ty < 0.03)
    c = rgb((0.80, 0.74, 0.62))
    c = np.where(motif[..., None], rgb((0.30, 0.46, 0.47)), c)
    c = np.where(centre[..., None], rgb((0.72, 0.52, 0.24)), c)
    c = np.where(grout[..., None], rgb((0.62, 0.57, 0.48)), c)
    chip = ramp(fine + blot * 0.5, 0.9, 1.0)
    c = c * (1 - chip[..., None]) + rgb((0.70, 0.62, 0.50)) * chip[..., None]
    put("tiles", c, 0.6 - grout * 0.4 - chip * 0.2, np.where(grout, 0.85, 0.25 + 0.5 * chip))

    # hazard: worn yellow/black diagonal stripes (dock edge, bollards).
    st = (((x + y) * 5) % 1) < 0.5
    worn = ramp(blot + fine * 0.5, 0.7, 0.95)
    c = np.where(st[..., None], rgb((0.80, 0.62, 0.12)), rgb((0.10, 0.09, 0.08)))
    c = c * (1 - worn[..., None]) + rgb((0.45, 0.42, 0.38)) * worn[..., None]
    put("hazard", c, 0.5 - worn * 0.1, 0.55 + 0.3 * worn, m=worn * 0.5)

    # soil: dry planter soil with pebbles and dead grass tufts (planter and well tops).
    peb = (noise(C, 3, 64, seed=113).astype(F32) > 0.7)
    tuft = ramp(noise(C, 5, 16, seed=114).astype(F32), 0.62, 0.75)
    c = rgb((0.42, 0.33, 0.24)) * (0.8 + 0.3 * fine)[..., None]
    c = np.where(peb[..., None], rgb((0.62, 0.56, 0.46)), c)
    c = c * (1 - tuft[..., None]) + rgb((0.58, 0.52, 0.30)) * tuft[..., None]
    put("soil", c, fine * 0.4 + peb * 0.3 + tuft * 0.3, 0.92)

    save("trim_c", col)
    save("trim_n", normal_from_height(hgt, 4.0), 1024)
    save("trim_orm", orm(ao, rough, met), 1024)


# --------------------------------------------------------------------------- decal atlas
DECALS = ["letterA", "letterB", "arrow", "line",
          "hazardline", "oil", "sandedge", "cracks",
          "tyres", "drain", "manhole", "streaks",
          "damp", "sandpatch", "pebbles", "stain"]
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def decals():
    S, C = 2048, 512
    atlas = np.zeros((S, S, 4), F32)
    y, x = (np.mgrid[0:C, 0:C] / C).astype(F32)
    fine = noise(C, 6, 48, seed=121).astype(F32)
    blot = noise(C, 5, 6, seed=122).astype(F32)

    def put(name, rgb, alpha):
        i = DECALS.index(name)
        r0, c0 = (i // 4) * C, (i % 4) * C
        atlas[r0:r0 + C, c0:c0 + C, :3] = rgb
        atlas[r0:r0 + C, c0:c0 + C, 3] = np.clip(alpha, 0, 1)

    def glyph(ch):
        img = Image.new("L", (C, C), 0)
        dr = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype(FONT, 420)
            bb = dr.textbbox((0, 0), ch, font=font)
            dr.text(((C - (bb[2] - bb[0])) / 2 - bb[0], (C - (bb[3] - bb[1])) / 2 - bb[1]), ch, fill=255, font=font)
        except OSError:  # no font: stencil polygons
            if ch == "A":
                dr.polygon([(256, 50), (430, 470), (350, 470), (256, 230), (162, 470), (82, 470)], fill=255)
                dr.rectangle((170, 330, 342, 390), fill=255)
            else:
                dr.rectangle((110, 50, 190, 470), fill=255)
                dr.ellipse((110, 50, 400, 260), fill=255)
                dr.ellipse((110, 250, 420, 470), fill=255)
                dr.ellipse((190, 110, 320, 200), fill=0)
                dr.ellipse((190, 310, 340, 410), fill=0)
        return np.asarray(img.filter(ImageFilter.GaussianBlur(1.2))).astype(F32) / 255

    # Painted stencil letters: off-white paint (tinted per use), worn by traffic and sun.
    wear = ramp(noise(C, 6, 12, seed=123).astype(F32) * 0.7 + fine * 0.5, 0.62, 0.8)
    paint = np.full((C, C, 3), 0.92, F32) * (0.92 + 0.08 * fine)[..., None]
    for ch in "AB":
        put("letter" + ch, paint, glyph(ch) * (1 - wear) * 0.95)
    # arrow (pointing up the cell)
    img = Image.new("L", (C, C), 0)
    ImageDraw.Draw(img).polygon([(256, 40), (420, 220), (310, 220), (310, 470), (202, 470), (202, 220), (92, 220)], fill=255)
    put("arrow", paint, np.asarray(img.filter(ImageFilter.GaussianBlur(1.5))).astype(F32) / 255 * (1 - wear) * 0.9)
    # line: a road-paint stripe along v (the quad stretches it), ragged edges.
    edge = ramp(0.36 - np.abs(x - 0.5) + (fine - 0.5) * 0.04, 0.0, 0.02)
    put("line", paint, edge * (1 - wear * 0.9) * 0.9)
    # hazardline: yellow/black stripes along v.
    st = (((y * 6 + x) % 1) < 0.5)
    hz = np.where(st[..., None], np.array([0.86, 0.66, 0.12], F32), np.array([0.09, 0.08, 0.07], F32))
    put("hazardline", hz, edge * (1 - wear * 0.8))
    # oil: dark soft stain.
    r = np.hypot(x - 0.5, y - 0.5) + (blot - 0.5) * 0.25
    put("oil", np.full((C, C, 3), 0.06, F32), ramp(0.42 - r, 0, 0.25) * 0.75)
    # sandedge: wind-blown sand against a wall (v = 1 at the wall, fading to v = 0).
    sand = np.array([0.74, 0.63, 0.47], F32) * (0.88 + 0.18 * fine)[..., None]
    a = ramp(y + (blot - 0.5) * 0.9 + (fine - 0.5) * 0.3, 0.3, 1.05) * (0.75 + 0.25 * fine)
    put("sandedge", sand, a * 0.62)
    # cracks: branching dark cracks (thresholded ridged noise).
    rid = 1 - np.abs(noise(C, 6, 6, seed=124).astype(F32) * 2 - 1)
    cr = ramp(rid, 0.94, 0.985) * ramp(0.48 - np.hypot(x - 0.5, y - 0.5), 0, 0.1)
    put("cracks", np.full((C, C, 3), 0.22, F32), cr * 0.5)
    # tyres: two worn tread tracks along v.
    tr = ((np.abs(x - 0.27) < 0.08) | (np.abs(x - 0.73) < 0.08)) * (0.5 + 0.5 * (((y * 40) % 1) < 0.5))
    put("tyres", np.full((C, C, 3), 0.10, F32), tr * (0.35 + 0.3 * blot) * ramp(0.5 - np.abs(y - 0.5), 0, 0.15))
    # drain: cast-iron grate.
    g = (np.abs(x - 0.5) < 0.42) & (np.abs(y - 0.5) < 0.42)
    slots = g & (((x * 14) % 1) < 0.55) & (np.abs(y - 0.5) < 0.36)
    c = np.where(slots[..., None], np.array([0.03, 0.03, 0.03], F32), np.array([0.22, 0.20, 0.18], F32) * (0.8 + 0.3 * fine)[..., None])
    put("drain", c, g.astype(F32))
    # manhole: round cover with ring pattern.
    r = np.hypot(x - 0.5, y - 0.5)
    ring = (np.abs(((r * 22) % 1) - 0.5) < 0.2)
    c = np.array([0.24, 0.22, 0.20], F32) * (0.75 + 0.25 * ring + 0.1 * fine)[..., None]
    put("manhole", c, (r < 0.46).astype(F32))
    # streaks: dark rain/grime streaks running down from the top of the cell.
    sx = noise(C, 4, 24, seed=125).astype(F32)[0][None, :].repeat(C, 0)
    st = ramp(sx, 0.55, 0.8) * (1 - y) ** 1.5 + ramp(blot, 0.6, 0.9) * 0.2
    put("streaks", np.array([0.20, 0.17, 0.13], F32) * np.ones((C, C, 3), F32), st * 0.55)
    # damp: dirt band at the base of walls (v = 0 at the ground).
    put("damp", np.array([0.30, 0.25, 0.19], F32) * np.ones((C, C, 3), F32), ramp(1 - y + (blot - 0.5) * 0.4, 0.45, 1.0) * 0.55)
    # sandpatch: irregular drift of sand on paving.
    r = np.hypot((x - 0.5) * 1.0, (y - 0.5) * 1.6) + (blot - 0.5) * 0.35 + (fine - 0.5) * 0.08
    put("sandpatch", sand, ramp(0.42 - r, 0, 0.18) * 0.9)
    # pebbles: scattered grit and small stones.
    peb = ramp(noise(C, 3, 96, seed=126).astype(F32), 0.72, 0.8) * ramp(0.46 - np.hypot(x - 0.5, y - 0.5) - (blot - 0.5) * 0.2, 0, 0.12)
    put("pebbles", np.array([0.58, 0.52, 0.43], F32) * (0.7 + 0.5 * fine)[..., None], peb)
    # stain: large soft dirt stain.
    r = np.hypot(x - 0.5, y - 0.5) + (blot - 0.5) * 0.3
    put("stain", np.array([0.30, 0.24, 0.17], F32) * np.ones((C, C, 3), F32), ramp(0.45 - r, 0, 0.3) * 0.45 * (0.6 + 0.4 * fine))
    save("decals_c", atlas)


if __name__ == "__main__":
    scans()
    roof_tiles()
    wood()
    metal()
    trim()
    decals()
    print("textures ->", OUT, len(os.listdir(OUT)))
