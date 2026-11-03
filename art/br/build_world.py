"""
Project Island (Battle Royale) world builder: the concept map -> terrain heightfield, land cover,
water bodies and POI data, all on one 10 x 10 km coordinate system.

    python3 art/br/build_world.py            # writes public/fps/br/*.v1.* and art/br/build/*

World coordinates (shared with src/lib/fps/br/world.ts):
  * metres, origin at the map centre, +x east, +z south (three.js: -z is north), +y up,
    sea level y = 0;
  * the playable square is [-5000, 5000] on x and z; the map UI grid is A-J (west -> east)
    x 1-10 (north -> south), 1 km per cell;
  * the concept image (art/br/concept/project-island-concept.png) is 1254 px with the grid square
    at pixels [13, 1193) x [11, 1191): 118 px per km.

Outputs:
  public/fps/br/height.v1.hf     2561 x 2561 heights (3.906 m spacing): 16-byte header ("PIH2",
                                 u16 width, u16 height, f32 spacing, f32 offset), then zlib of
                                 uint16 residuals of the plane predictor (left + up - up-left)
                                 over heights stored as (h + 50 m) in centimetres
  public/fps/br/landcover.v1.lc  1280 x 1280 land-cover classes (7.8 m per pixel): 8-byte header
                                 ("PIC1", u16 width, u16 height), then zlib of one class id per byte
  public/fps/br/world.v1.json    water bodies, POIs, bridges, height encoding
  art/br/build/*.png             review images (hillshade, land cover, water)
"""

from __future__ import annotations

import json
import struct
import zlib
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[2]
CONCEPT = ROOT / "art/br/concept/project-island-concept.png"
OUT = ROOT / "public/fps/br"
BUILD = ROOT / "art/br/build"

WORLD = 10_000.0  # metres
HALF = WORLD / 2
GRID = 2561  # height samples per side (2560 intervals)
SPACING = WORLD / (GRID - 1)
COVER = 1280  # land-cover texels per side
IMG_X0, IMG_Y0, IMG_SIZE = 13, 11, 1180  # grid square inside the concept image
HEIGHT_OFFSET = 50.0  # stored = (h + 50) * 100, so -50 m .. 605 m fit in uint16
SEED = 20261103

# Land-cover classes (the client's splat shader and scatter use the same ids).
WATER, SAND, GRASS, FIELD, FOREST, ROCK, URBAN, ROAD = 0, 1, 2, 3, 4, 5, 6, 7
COVER_NAMES = ["water", "sand", "grass", "field", "forest", "rock", "urban", "road"]


def px_to_world(px: float, py: float) -> tuple[float, float]:
    """Concept-image pixel -> world metres (x east, z south)."""
    return ((px - IMG_X0) / IMG_SIZE * WORLD - HALF, (py - IMG_Y0) / IMG_SIZE * WORLD - HALF)


def world_to_grid(x: float, z: float) -> tuple[float, float]:
    return ((x + HALF) / SPACING, (z + HALF) / SPACING)


# ---------------------------------------------------------------------------------------- POIs
# Positions read off the concept map (image pixels): centre and rough radius of each location.
# `pad` is the flattened building area (metres), `kind` drives density and future asset kits.
POIS = [
    dict(id="northstar-town", name="Northstar Town", px=(222, 180), radius=95, pad=720, kind="town-large"),
    dict(id="iron-peaks", name="Iron Peaks", px=(545, 95), radius=95, pad=0, kind="mountain"),
    dict(id="pine-ridge", name="Pine Ridge", px=(500, 250), radius=80, pad=0, kind="forest-compounds"),
    dict(id="redstone-quarry", name="Redstone Quarry", px=(1000, 195), radius=118, pad=0, kind="quarry"),
    dict(id="millhaven", name="Millhaven", px=(318, 382), radius=95, pad=620, kind="town-industrial"),
    dict(id="crossroads", name="Crossroads", px=(605, 450), radius=55, pad=400, kind="commercial"),
    dict(id="central-hospital", name="Central Hospital", px=(860, 420), radius=80, pad=420, kind="hospital"),
    dict(id="old-dam", name="Old Dam", px=(250, 578), radius=55, pad=0, kind="dam"),
    dict(id="murder-cabins", name="Murder Cabins", px=(262, 805), radius=70, pad=0, kind="cabins"),
    dict(id="blackwater-prison", name="Blackwater Prison", px=(556, 628), radius=55, pad=280, kind="prison"),
    dict(id="riverwood", name="Riverwood", px=(975, 625), radius=85, pad=540, kind="town"),
    dict(id="southern-military-base", name="Southern Military Base", px=(735, 790), radius=110, pad=560, kind="military"),
    dict(id="east-works", name="East Works", px=(1070, 795), radius=65, pad=340, kind="industrial"),
    dict(id="island-superstore", name="Island Superstore", px=(655, 1055), radius=80, pad=640, kind="superstore"),
    # The concept map's small grid of houses west of the Superstore (D9) and the red-roofed
    # compound at the island's western end (C9/D9).
    dict(id="island-village", name="Island Village", px=(505, 1058), radius=45, pad=260, kind="town"),
    dict(id="west-point", name="West Point", px=(428, 1068), radius=25, pad=120, kind="town"),
    dict(id="island-airfield", name="Island Airfield", px=(985, 1050), radius=95, pad=520, kind="airfield"),
]
# Runways: flat strips (image px endpoints, width m).
RUNWAYS = [((612, 832), (860, 852), 60), ((900, 1102), (1050, 1030), 50)]
# Bridges to the island (image px endpoints): road decks over the strait.
BRIDGES = [dict(id="west-bridge", a=(512, 880), b=(522, 975)), dict(id="east-bridge", a=(895, 893), b=(880, 990))]
# Mountains and hills: (image px centre, radius px, height m, ridged?).
MOUNTAINS = [
    ((545, 95), 120, 290, True),  # Iron Peaks massif
    ((430, 70), 110, 140, True),  # western shoulder of the massif
    ((660, 120), 95, 150, True),
    ((470, 275), 120, 85, True),  # Pine Ridge escarpment above the creek
    ((860, 140), 110, 110, False),  # hills between the peaks and the quarry
    ((1000, 195), 150, 75, False),  # the quarry's hill: the pit is cut into it
    ((1120, 330), 90, 70, False),
    ((120, 650), 140, 75, False),  # west coast hills (Old Dam / Murder Cabins)
    ((200, 860), 110, 60, False),
    ((556, 628), 60, 38, False),  # prison plateau
    ((1110, 560), 90, 55, False),  # east hills above Riverwood
    ((380, 1080), 90, 35, False),  # island west hills
    ((760, 1150), 80, 25, False),
]
# Rivers: polylines in image px (traced from the concept), widths in metres. All reach the sea or
# a lake; the valley around each is lowered toward the water.
RIVERS = [
    dict(id="pine-creek", width=36, pts=[(370, 292), (420, 318), (470, 335), (520, 342), (560, 340), (600, 350), (630, 356)]),
    dict(id="main-river", width=48, pts=[(285, 545), (330, 545), (380, 545), (430, 552), (480, 545), (530, 525), (580, 555), (630, 575), (680, 582), (740, 562), (800, 546), (860, 548), (920, 555), (980, 540), (1040, 512), (1100, 480), (1150, 452), (1190, 430)]),
    dict(id="riverwood-channel", width=44, pts=[(930, 840), (955, 760), (990, 728), (1040, 712), (1085, 690), (1125, 670), (1170, 655), (1195, 650)]),
]
# Label boxes on the concept image (px, padded), excluded when reading land cover.
LABELS = [
    (160, 136, 257, 177), (626, 93, 724, 117), (460, 220, 554, 242), (983, 176, 1068, 220),
    (270, 376, 364, 398), (558, 421, 662, 443), (813, 396, 894, 438), (164, 540, 228, 562),
    (518, 613, 624, 654), (923, 586, 1020, 608), (227, 785, 297, 825), (716, 761, 817, 802),
    (602, 1033, 704, 1074),
]


def concept() -> np.ndarray:
    im = np.asarray(Image.open(CONCEPT).convert("RGB")).astype(np.float32)
    return im[IMG_Y0 : IMG_Y0 + IMG_SIZE, IMG_X0 : IMG_X0 + IMG_SIZE]


def label_mask() -> np.ndarray:
    m = np.zeros((IMG_SIZE, IMG_SIZE), bool)
    for x0, y0, x1, y1 in LABELS:
        m[y0 - IMG_Y0 : y1 - IMG_Y0, x0 - IMG_X0 : x1 - IMG_X0] = True
    return m


def water_from_concept(im: np.ndarray) -> np.ndarray:
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    w = (b - r > 22) & (g - r > 12) & (b >= g - 6)
    # The dark sea strip at the bottom edge and the frame: anything outside the land outline.
    dark = (r < 40) & (g < 45) & (b < 45)
    w |= dark & (np.arange(IMG_SIZE)[:, None] > 1120)
    w = nd.binary_opening(w, iterations=1)
    w = nd.binary_closing(w, iterations=2)
    # The concept draws the island bridges as land strips; they are structures over the sea.
    yy, xx = np.mgrid[0:IMG_SIZE, 0:IMG_SIZE]
    for b in BRIDGES:
        (ax, ay), (bx, by) = b["a"], b["b"]
        ax, ay, bx, by = ax - IMG_X0, ay - IMG_Y0, bx - IMG_X0, by - IMG_Y0
        vx, vy = bx - ax, by - ay
        t = np.clip(((xx - ax) * vx + (yy - ay) * vy) / (vx * vx + vy * vy), 0.12, 0.88)
        d = np.hypot(xx - (ax + t * vx), yy - (ay + t * vy))
        w |= d < 7
    return w


def resample(mask_or_field: np.ndarray, size: int, order: int = 1) -> np.ndarray:
    return nd.zoom(mask_or_field.astype(np.float32), size / mask_or_field.shape[0], order=order)


def fractal(size: int, rng: np.random.Generator, octaves: list[tuple[float, float]]) -> np.ndarray:
    """Sum of smoothed random octaves: (wavelength m, amplitude m)."""
    out = np.zeros((size, size), np.float32)
    for wavelength, amp in octaves:
        cells = max(2, int(WORLD / wavelength) + 3)
        base = rng.standard_normal((cells, cells)).astype(np.float32)
        layer = nd.zoom(base, size / cells, order=3)[:size, :size]
        layer /= max(1e-6, float(layer.std()))
        out += layer * amp
    return out


def ridged(size: int, rng: np.random.Generator, wavelength: float) -> np.ndarray:
    n = fractal(size, rng, [(wavelength, 1.0), (wavelength / 2.3, 0.5), (wavelength / 5.1, 0.25)])
    return 1.0 - np.abs(np.tanh(n * 0.9))


def grid_coords(size: int) -> tuple[np.ndarray, np.ndarray]:
    a = np.linspace(-HALF, HALF, size, dtype=np.float32)
    return np.meshgrid(a, a)  # x, z


def polyline_distance(x: np.ndarray, z: np.ndarray, pts: list[tuple[float, float]]) -> np.ndarray:
    d = np.full(x.shape, np.inf, np.float32)
    for (ax, az), (bx, bz) in zip(pts, pts[1:]):
        vx, vz = bx - ax, bz - az
        t = np.clip(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1)
        d = np.minimum(d, np.hypot(x - (ax + t * vx), z - (az + t * vz)))
    return d


def smoothstep(e0: float, e1: float, v: np.ndarray) -> np.ndarray:
    t = np.clip((v - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def build() -> dict:
    rng = np.random.default_rng(SEED)
    im = concept()
    labels = label_mask()
    water_img = water_from_concept(im)
    # Lakes: water components that do not touch the image border (the sea does).
    lab, n = nd.label(water_img)
    # The sea: components reaching within 20 px (170 m) of the map edge (the frame line itself
    # is not water, so the very border row cannot be used).
    edge = np.zeros(water_img.shape, bool)
    edge[:20], edge[-20:], edge[:, :20], edge[:, -20:] = True, True, True, True
    border = set(np.unique(lab[edge])) - {0}
    sizes = nd.sum(water_img, lab, range(1, n + 1))
    sea_img = np.isin(lab, list(border))
    lakes_img = water_img & ~sea_img
    # Drop specks (grid lines, shadows) smaller than ~0.4 ha.
    for i in range(1, n + 1):
        if i not in border and sizes[i - 1] < 60:
            lakes_img[lab == i] = False
    # Land = not sea; fill tiny holes and remove sea specks inland.
    land_img = ~sea_img
    land_img = nd.binary_closing(land_img, iterations=2)

    x, z = grid_coords(GRID)
    land = resample(land_img, GRID) > 0.5
    sea_dist = nd.distance_transform_edt(land) * SPACING  # m from the sea, on land

    # ------------------------------------------------------------------------------ heights
    h = 3.0 + 30.0 * (1 - np.exp(-sea_dist / 800.0))
    # Rolling H1Z1-style countryside: broad swells, hills and small undulations (none below the
    # coastal base, so the noise never sinks inland ground under the sea).
    rolling = fractal(GRID, rng, [(3200, 22.0), (1400, 17.0), (520, 7.0), (180, 1.6), (60, 0.4)])
    h += np.maximum(rolling, -0.6 * (h - 2.0)) * smoothstep(40, 500, sea_dist)
    for (cx, cy), rad_px, height, is_ridged in MOUNTAINS:
        mx, mz = px_to_world(cx, cy)
        rad = rad_px / IMG_SIZE * WORLD
        d = np.hypot(x - mx, z - mz) / rad
        bump = np.exp(-(d**2) * 2.2)
        if is_ridged:
            bump *= 0.55 + 0.6 * ridged(GRID, rng, rad * 0.9)
        h += bump * height
    # Rivers: valleys lowered toward the water and a channel below sea level.
    river_dist = np.full(x.shape, np.inf, np.float32)
    for r in RIVERS:
        pts = [px_to_world(*p) for p in r["pts"]]
        d = polyline_distance(x, z, pts)
        # A gentle valley (400 m) down to banks ~3 m above the water, then the channel.
        valley = smoothstep(r["width"] * 0.6, 420.0, d)
        h = h * (0.45 + 0.55 * valley) + (1 - valley) * 3.0
        channel = 1 - smoothstep(r["width"] * 0.35, r["width"] * 0.62, d)
        h = h * (1 - channel) + channel * -2.5
        river_dist = np.minimum(river_dist, d)
    # Lakes from the concept: basins with their own water level.
    lakes = resample(lakes_img, GRID) > 0.5
    lake_lab, lake_n = nd.label(lakes)
    water_bodies = []
    for i in range(1, lake_n + 1):
        m = lake_lab == i
        if m.sum() < 400:
            continue
        ring = nd.binary_dilation(m, iterations=6) & ~m
        level = float(np.percentile(h[ring], 20)) - 1.2
        inside = nd.distance_transform_edt(m) * SPACING
        depth = np.minimum(6.0, 0.6 + inside * 0.06)
        h[m] = np.minimum(h[m], level - depth[m])
        # Banks: blend the surroundings down to the shore.
        near = nd.distance_transform_edt(~m) * SPACING
        blend = smoothstep(0, 45, near)
        shore = ~m & (near < 45)
        h[shore] = h[shore] * blend[shore] + (level + 0.4) * (1 - blend[shore])
        if level < 0.5:
            continue  # a coastal pool: the carved bed sits under the sea surface
        ys, xs = np.nonzero(m)
        water_bodies.append(
            dict(
                id=f"lake-{len(water_bodies) + 1}",
                level=round(level, 2),
                bounds=[
                    round(float(xs.min() * SPACING - HALF), 1),
                    round(float(ys.min() * SPACING - HALF), 1),
                    round(float(xs.max() * SPACING - HALF), 1),
                    round(float(ys.max() * SPACING - HALF), 1),
                ],
                areaHa=round(float(m.sum() * SPACING * SPACING / 10_000), 1),
            )
        )
    # Quarry: a terraced open pit.
    qx, qz = px_to_world(1000, 195)
    qd = np.hypot(x - qx, z - qz)
    q_rad = 118 / IMG_SIZE * WORLD * 0.85
    rim = h.copy()
    pit = np.clip(1 - qd / q_rad, 0, 1)
    terraces = np.floor(pit * 7) / 7
    terraces = terraces + (pit * 7 - np.floor(pit * 7)).clip(0, 0.12) / 0.12 / 7  # bench edges
    # Benches step down from one rim level (the ground along the pit's edge) to a flat floor at
    # most 75 m lower, never below 12 m (the pit stays dry above the sea).
    ring = (qd > q_rad * 0.97) & (qd < q_rad * 1.03)
    rim_level = float(np.median(rim[ring]))
    floor = max(12.0, rim_level - 75.0)
    pit_surface = rim_level - (rim_level - floor) * np.clip(terraces, 0, 1)
    blend = smoothstep(q_rad * 1.05, q_rad * 0.9, qd)
    h = np.where(qd < q_rad * 1.05, np.minimum(rim, pit_surface * blend + rim * (1 - blend)), h)
    quarry = qd < q_rad
    # Roads: smooth the ground along every road (no bumps or cross-slope), before the pads.
    road_px = extract_roads(im, labels, water_img)
    roads = [[(cx / IMG_SIZE * WORLD - HALF, cy / IMG_SIZE * WORLD - HALF) for cx, cy in line] for line in road_px]
    road_mask = np.zeros((GRID, GRID), bool)
    for line in roads:
        for (ax, az), (bx, bz) in zip(line[:-1], line[1:]):
            n = max(2, int(np.hypot(bx - ax, bz - az) / (SPACING * 0.5)))
            for t in np.linspace(0, 1, n):
                gi, gj = world_to_grid(ax + (bx - ax) * t, az + (bz - az) * t)
                if 0 <= int(gj) < GRID and 0 <= int(gi) < GRID:
                    road_mask[int(round(gj)), int(round(gi))] = True
    road_dist = nd.distance_transform_edt(~road_mask) * SPACING
    road_smooth = nd.gaussian_filter(h, 6)
    w_road = 1 - smoothstep(ROAD_WIDTH * 0.6, ROAD_WIDTH * 2.5, road_dist)
    h = h * (1 - w_road) + road_smooth * w_road
    # POI pads: flatten building areas to their own smoothed height.
    smooth = nd.gaussian_filter(h, 40)
    for p in POIS:
        if not p["pad"]:
            continue
        cx, cz = px_to_world(*p["px"])
        d = np.hypot(x - cx, z - cz)
        r = p["pad"] / 2
        gi, gj = world_to_grid(cx, cz)
        target = float(smooth[int(gj), int(gi)])
        w = 1 - smoothstep(r * 0.85, r * 1.4, d)
        h = h * (1 - w) + target * w
        p["height"] = round(target, 2)
    for (a, b, width) in RUNWAYS:
        pa, pb = px_to_world(*a), px_to_world(*b)
        d = polyline_distance(x, z, [pa, pb])
        gi, gj = world_to_grid((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2)
        target = float(smooth[int(gj), int(gi)])
        w = 1 - smoothstep(width * 0.6, width * 2.5, d)
        h = h * (1 - w) + target * w
    # Dry land never dips under the beach height (only channels and lakes are below it).
    wet = (river_dist < 40) | nd.binary_dilation(lakes, iterations=3) | quarry
    h = np.where(land & ~wet, np.maximum(h, 1.2 + 3.0 * smoothstep(0, 220, sea_dist)), h)
    # Coast: beaches, then the sea floor.
    sea_floor = -6.0 - 30.0 * (1 - np.exp(-(nd.distance_transform_edt(~land) * SPACING) / 600.0))
    beach = smoothstep(0, 70, sea_dist)
    h = np.where(land, h * beach + 0.8 * (1 - beach), sea_floor)
    # Bridges sit above the strait; keep the abutments on land at deck height.
    bridges = []
    for b in BRIDGES:
        pa, pb = px_to_world(*b["a"]), px_to_world(*b["b"])
        bridges.append(dict(id=b["id"], a=[round(pa[0], 1), round(pa[1], 1)], b=[round(pb[0], 1), round(pb[1], 1)], deck=14.0, width=12.0))
    h = h.astype(np.float32)

    # --------------------------------------------------------------------------- land cover
    cover_img = classify(im, labels, water_img)
    cover = nd.zoom(cover_img, COVER / IMG_SIZE, order=0)
    # Re-derive water and sand on the final terrain (the cover grid is 7.8 m).
    hc = nd.zoom(h, COVER / GRID, order=1)
    sea_c = hc < 0.3
    cover[sea_c] = WATER
    land_c = ~sea_c
    near_sea = nd.distance_transform_edt(land_c) * (WORLD / COVER) < 45
    cover[land_c & near_sea & (cover != URBAN) & (cover != ROAD)] = SAND
    slope = np.hypot(*np.gradient(hc, WORLD / COVER))
    cover[land_c & (slope > 0.75)] = ROCK
    high = hc > 170
    cover[land_c & high & (cover != FOREST)] = ROCK
    # Building pads: a built-up core (lots, yards and streets come from the concept map around it),
    # so every POI with buildings reads as a settlement and stays free of forest.
    cxs, czs = grid_coords(COVER)
    for p in POIS:
        if not p["pad"]:
            continue
        px, pz = px_to_world(*p["px"])
        d = np.hypot(cxs - px, czs - pz)
        core = (d < p["pad"] / 2 * 0.62) & land_c & (cover != ROAD) & (cover != WATER)
        cover[core] = URBAN
        cover[(d < p["pad"] / 2) & (cover == FOREST)] = GRASS

    # Roads are road in the land cover too (shading under the strip; no trees on them).
    cell = WORLD / COVER
    for line in roads:
        for (ax, az), (bx, bz) in zip(line[:-1], line[1:]):
            n = max(2, int(np.hypot(bx - ax, bz - az) / (cell * 0.5)))
            for t in np.linspace(0, 1, n):
                ci = int((ax + (bx - ax) * t + HALF) / cell)
                cj = int((az + (bz - az) * t + HALF) / cell)
                if 0 <= ci < COVER and 0 <= cj < COVER and cover[cj, ci] != WATER:
                    cover[cj, ci] = ROAD

    water_mask = (h < 0.0) | (lakes & (h < np.max([w["level"] for w in water_bodies] + [0])))
    return dict(h=h, cover=cover.astype(np.uint8), water_bodies=water_bodies, bridges=bridges, land=land, lakes=lakes, water=water_mask, roads=roads)


ROAD_WIDTH = 7.0  # metres (two lanes)


def extract_roads(im: np.ndarray, labels: np.ndarray, water: np.ndarray) -> list[list[tuple[float, float]]]:
    """Road centrelines read off the concept map (image px of the grid square).

    Roads are thin, light, low-saturation lines: a white top-hat on luminance finds them, the
    mask is skeletonised, traced into polylines between junctions/ends, short spurs and specks
    (rock highlights, quarry terraces, label text) are dropped, and the rest is simplified and
    smoothed. Deterministic for the same image.
    """
    from skimage.morphology import skeletonize, white_tophat, disk

    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    sat = im.max(-1) - im.min(-1)
    top = white_tophat(lum, disk(3))
    mask = (top > 30) & (sat < 35) & (lum > 110) & ~nd.binary_dilation(water, iterations=1)
    mask &= ~nd.binary_dilation(labels, iterations=4)
    # Grid lines of the concept map (every 118 px) are not roads.
    for k in range(11):
        v = round(k * IMG_SIZE / 10)
        mask[:, max(0, v - 2) : v + 2] = False
        mask[max(0, v - 2) : v + 2, :] = False
    # Rock highlights on Iron Peaks and the quarry's terraces look like roads: skip those cores.
    yy, xx = np.mgrid[0 : IMG_SIZE, 0 : IMG_SIZE]
    for p in POIS:
        if p["kind"] in ("mountain", "quarry"):
            cx, cy = p["px"][0] - IMG_X0, p["px"][1] - IMG_Y0
            mask &= np.hypot(xx - cx, yy - cy) > p["radius"] * (0.8 if p["kind"] == "quarry" else 1.0)
    mask = nd.binary_dilation(mask, iterations=1)
    sk = skeletonize(mask)
    lab, n = nd.label(sk, structure=np.ones((3, 3)))
    sizes = nd.sum(sk, lab, range(1, n + 1))
    sk = np.isin(lab, np.nonzero(sizes >= 120)[0] + 1)

    # Trace the skeleton graph into polylines.
    nb = nd.convolve(sk.astype(np.int32), np.ones((3, 3), np.int32), mode="constant") - 1
    nb[~sk] = 0
    pixels = set(zip(*np.nonzero(sk)))
    nodes = {p for p in pixels if nb[p] != 2}
    offsets = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    used_edges: set[tuple] = set()
    paths: list[list[tuple[int, int]]] = []

    def neighbours(p):
        return [(p[0] + dy, p[1] + dx) for dy, dx in offsets if (p[0] + dy, p[1] + dx) in pixels]

    def walk(start, nxt):
        path = [start, nxt]
        prev, cur = start, nxt
        while cur not in nodes:
            options = [q for q in neighbours(cur) if q != prev and q not in path[-3:]]
            if not options:
                break
            prev, cur = cur, options[0]
            path.append(cur)
            if cur == start:
                break
        return path

    for start in sorted(nodes):
        for nxt in neighbours(start):
            key = (start, nxt)
            if key in used_edges:
                continue
            path = walk(start, nxt)
            used_edges.add((path[0], path[1]))
            used_edges.add((path[-1], path[-2]))
            paths.append(path)
    # Loops without any node.
    seen = {p for path in paths for p in path}
    for p in sorted(pixels - seen):
        if p in seen:
            continue
        nbs = neighbours(p)
        if not nbs:
            continue
        path = walk(p, nbs[0])
        seen.update(path)
        paths.append(path)

    def is_end(p):
        return nb[p] == 1

    lines = []
    for path in paths:
        # Spurs: short branches hanging off a junction with a free end.
        if len(path) < 18 and (is_end(path[0]) or is_end(path[-1])):
            continue
        if len(path) < 6:
            continue
        lines.append(rdp([(float(c), float(r_)) for r_, c in path], 1.2))
    return [chaikin(line, 2) for line in link_gaps(lines)]


def link_gaps(lines: list[list[tuple[float, float]]], reach: float = 18.0, cone: float = 0.6) -> list:
    """Bridge the gaps the map's faint road pixels leave: a free road end is joined to the
    nearest point of another road ahead of it (within `reach` px and `cone` rad of its heading).
    Then isolated scraps (short, both ends still free) are dropped."""
    from scipy.spatial import cKDTree

    pts, owner = [], []
    for i, line in enumerate(lines):
        for k in range(len(line) - 1):
            a, b = np.array(line[k]), np.array(line[k + 1])
            n = max(1, int(np.hypot(*(b - a)) / 2))
            for t in np.linspace(0, 1, n, endpoint=False):
                pts.append(a + (b - a) * t)
                owner.append(i)
        pts.append(np.array(line[-1]))
        owner.append(i)
    tree = cKDTree(np.array(pts))
    owner = np.array(owner)
    free = set()
    out = [list(line) for line in lines]
    for i, line in enumerate(lines):
        for end, prev in ((line[0], line[1]), (line[-1], line[-2])):
            e, pr = np.array(end), np.array(prev)
            near = [j for j in tree.query_ball_point(e, 3.0) if owner[j] != i]
            if near:
                continue  # already joined to another road
            heading = e - pr
            heading /= np.hypot(*heading) or 1.0
            best, best_d = None, reach + 1
            for j in tree.query_ball_point(e, reach):
                if owner[j] == i:
                    continue
                v = pts[j] - e
                d = np.hypot(*v)
                if d < 1e-6 or np.arccos(np.clip(np.dot(v / d, heading), -1, 1)) > cone:
                    continue
                if d < best_d:
                    best, best_d = pts[j], d
            if best is None:
                free.add((i, tuple(end)))
                continue
            if end == line[0]:
                out[i].insert(0, (float(best[0]), float(best[1])))
            else:
                out[i].append((float(best[0]), float(best[1])))
    kept = []
    for i, line in enumerate(out):
        length = sum(np.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(line[:-1], line[1:]))
        both_free = (i, tuple(lines[i][0])) in free and (i, tuple(lines[i][-1])) in free
        if both_free and length < 40:
            continue
        kept.append(line)
    return kept


def rdp(points: list[tuple[float, float]], eps: float) -> list[tuple[float, float]]:
    if len(points) < 3:
        return points
    a, b = np.array(points[0]), np.array(points[-1])
    ab = b - a
    norm = np.hypot(*ab) or 1.0
    d = [abs(ab[0] * (p[1] - a[1]) - ab[1] * (p[0] - a[0])) / norm for p in points[1:-1]]
    i = int(np.argmax(d)) + 1
    if d[i - 1] > eps:
        return rdp(points[: i + 1], eps)[:-1] + rdp(points[i:], eps)
    return [points[0], points[-1]]


def chaikin(points: list[tuple[float, float]], iterations: int) -> list[tuple[float, float]]:
    for _ in range(iterations):
        if len(points) < 3:
            return points
        out = [points[0]]
        for p, q in zip(points[:-1], points[1:]):
            out.append((0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]))
            out.append((0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]))
        out.append(points[-1])
        points = out
    return points


def classify(im: np.ndarray, labels: np.ndarray, water: np.ndarray) -> np.ndarray:
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    c = np.full(lum.shape, GRASS, np.uint8)
    c[lum < 58] = FOREST
    c[(lum >= 58) & (lum < 88) & (g >= r - 2)] = GRASS
    c[(lum >= 88) & (lum < 150)] = FIELD
    c[lum >= 150] = ROAD
    c[lum >= 205] = URBAN
    # Urban areas: POIs with buildings get URBAN where the concept is light (roofs, lots).
    yy, xx = np.mgrid[0:IMG_SIZE, 0:IMG_SIZE]
    for p in POIS:
        if not p["pad"]:
            continue
        cx, cy = p["px"][0] - IMG_X0, p["px"][1] - IMG_Y0
        inside = np.hypot(xx - cx, yy - cy) < p["radius"]
        c[inside & (lum >= 120)] = URBAN
    c[water] = WATER
    # Labels: take the most common class around them.
    if labels.any():
        filled = c.copy()
        idx = nd.distance_transform_edt(labels, return_distances=False, return_indices=True)
        filled[labels] = c[idx[0][labels], idx[1][labels]]
        c = filled
    # Mode filter (3x3) removes grid lines and text edges.
    out = c.copy()
    best = np.zeros(c.shape, np.int32)
    for k in range(8):
        cnt = nd.uniform_filter((c == k).astype(np.float32), 5)
        better = cnt > best
        out[better] = k
        best = np.maximum(best, cnt)
    return out


def write(result: dict) -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    BUILD.mkdir(parents=True, exist_ok=True)
    h = result["h"]
    q = np.clip(np.round((h + HEIGHT_OFFSET) * 100), 0, 65535).astype(np.int32)
    # Plane predictor (left + up - up-left), stored as wrapped int16 residuals: the terrain is
    # smooth, so residuals are tiny and deflate 6x better than raw heights (13 MB -> ~2 MB).
    r = q.copy()
    r[1:, 1:] = q[1:, 1:] - (q[1:, :-1] + q[:-1, 1:] - q[:-1, :-1])
    r[0, 1:] = q[0, 1:] - q[0, :-1]
    r[1:, 0] = q[1:, 0] - q[:-1, 0]
    raw = (r & 0xFFFF).astype("<u2").tobytes()
    header = b"PIH2" + struct.pack("<HHff", GRID, GRID, SPACING, HEIGHT_OFFSET)
    (OUT / "height.v1.hf").write_bytes(header + zlib.compress(raw, 9))
    cover_header = b"PIC1" + struct.pack("<HH", COVER, COVER)
    cover_bytes = np.ascontiguousarray(result["cover"], dtype=np.uint8).tobytes()
    (OUT / "landcover.v1.lc").write_bytes(cover_header + zlib.compress(cover_bytes, 9))
    meta = dict(
        version=1,
        world=dict(size=WORLD, grid=GRID, spacing=SPACING, heightOffset=HEIGHT_OFFSET, seaLevel=0),
        cover=dict(size=COVER, classes=COVER_NAMES),
        waterBodies=result["water_bodies"],
        rivers=[dict(id=r["id"], width=r["width"], points=[[round(v, 1) for v in px_to_world(*p)] for p in r["pts"]]) for r in RIVERS],
        bridges=result["bridges"],
        runways=[dict(a=[round(v, 1) for v in px_to_world(*a)], b=[round(v, 1) for v in px_to_world(*b)], width=w) for a, b, w in RUNWAYS],
        roads=[dict(width=ROAD_WIDTH, points=[[round(x, 1), round(z, 1)] for x, z in line]) for line in result["roads"]],
        pois=[
            dict(
                id=p["id"],
                name=p["name"],
                kind=p["kind"],
                x=round(px_to_world(*p["px"])[0], 1),
                z=round(px_to_world(*p["px"])[1], 1),
                radius=round(p["radius"] / IMG_SIZE * WORLD, 1),
                **({"padHeight": p["height"], "padRadius": p["pad"] / 2} if "height" in p else {}),
            )
            for p in POIS
        ],
        stats=dict(
            minHeight=round(float(h.min()), 2),
            maxHeight=round(float(h.max()), 2),
            landFraction=round(float(result["land"].mean()), 3),
        ),
    )
    (OUT / "world.v1.json").write_text(json.dumps(meta, indent=1))
    review(result)
    return meta


def review(result: dict) -> None:
    h = result["h"]
    small = nd.zoom(h, 1280 / GRID, order=1)
    gy, gx = np.gradient(small, WORLD / 1280)
    light = np.array([-0.6, -0.6, 0.53])
    n = np.dstack([-gx, -gy, np.ones_like(gx)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    shade = np.clip((n @ light) / np.linalg.norm(light), 0, 1)
    base = np.zeros(small.shape + (3,), np.float32)
    land = ~(nd.zoom(result["water"].astype(np.float32), 1280 / GRID, order=0) > 0.5)
    t = np.clip(small / 300, 0, 1)[..., None]
    base[land] = ((1 - t) * np.array([90, 130, 70]) + t * np.array([200, 190, 175]))[land]
    base[~land] = np.array([20, 70, 95])
    img = np.clip(base * (0.35 + 0.75 * shade[..., None]), 0, 255).astype(np.uint8)
    Image.fromarray(img).save(BUILD / "hillshade.png")
    pal = np.array(
        [[30, 90, 120], [220, 205, 150], [120, 160, 80], [190, 175, 110], [45, 85, 45], [140, 135, 125], [200, 200, 205], [90, 90, 95]],
        np.uint8,
    )
    Image.fromarray(pal[result["cover"]]).save(BUILD / "landcover.png")


if __name__ == "__main__":
    meta = write(build())
    print(json.dumps(meta["stats"]), len(meta["waterBodies"]), "lakes")
