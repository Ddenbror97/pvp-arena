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
    dict(id="blackwater-prison", name="Blackwater Prison", px=(556, 628), radius=55, pad=340, kind="prison"),
    dict(id="riverwood", name="Riverwood", px=(975, 625), radius=85, pad=540, kind="town"),
    dict(id="southern-military-base", name="Southern Military Base", px=(735, 790), radius=110, pad=560, kind="military"),
    dict(id="east-works", name="East Works", px=(1070, 795), radius=65, pad=340, kind="industrial"),
    dict(id="island-superstore", name="Island Superstore", px=(655, 1055), radius=80, pad=1360, kind="superstore"),
    # The concept map's small grid of houses west of the Superstore (D9) and the red-roofed
    # compound at the island's western end (C9/D9).
    dict(id="island-village", name="Island Village", px=(505, 1058), radius=45, pad=260, kind="town"),
    dict(id="west-point", name="West Point", px=(428, 1068), radius=25, pad=120, kind="town"),
    dict(id="island-airfield", name="Island Airfield", px=(985, 1050), radius=95, pad=520, kind="airfield"),
    # New neighbourhoods (final map audit, 2026-11-04): see TOWNS.
    dict(id="bayview", name="Bayview", px=(113, 406), radius=40, pad=600, kind="town"),
    dict(id="northfield", name="Northfield", px=(780, 318), radius=36, pad=560, kind="town"),
    # Fisher's Cove (B8/C8, owner 2026-11-04 "investigate this zone … at the coast"): the
    # concept's fishing hamlet on the bay south-west of Murder Cabins (on the terrain, no pad).
    dict(id="fishers-cove", name="Fisher's Cove", px=(166, 964), radius=30, pad=0, kind="cabins"),
]
# Runways: flat strips (image px endpoints, width m).
RUNWAYS = [((612, 832), (860, 852), 60), ((900, 1102), (1050, 1030), 50)]
# Bridges to the island (image px endpoints): road decks over the strait.
BRIDGES = [dict(id="west-bridge", a=(512, 880), b=(522, 975)), dict(id="east-bridge", a=(895, 893), b=(880, 990))]
# Dams (concept map C5): a solid concrete wall with a road on its crest, holding the upper lake
# (south, ~62 m) above the lower one (north, ~28 m). Drawn on land, so it does not cut the water mask.
DAMS = [dict(id="old-dam", a=(198, 563), b=(300, 587), deck=70.0, width=16.0)]
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
    dict(id="main-river", width=48, pts=[(356, 547), (380, 545), (430, 552), (480, 545), (530, 525), (580, 555), (630, 575), (680, 582), (740, 562), (800, 546), (860, 548), (920, 555), (980, 540), (1040, 512), (1100, 480), (1150, 452), (1190, 430)]),
    dict(id="riverwood-channel", width=44, pts=[(930, 840), (955, 760), (990, 728), (1040, 712), (1085, 690), (1125, 670), (1170, 655), (1195, 650)]),
]
# Towns on street grids read off the concept map (image px): the x of every north-south street and
# the y of every east-west street. Each block between them is built in proportion to the roofs the
# concept shows in it (block density), and its edges are streets (the traced road tangle inside
# the grid is replaced). The whole grid sits on one flat pad.
TOWNS = {
    "northstar-town": dict(xs=[135, 159, 182, 206, 230, 252, 276, 310], ys=[90, 105, 125, 144, 164, 185, 200, 215, 230, 245]),
    "millhaven": dict(xs=[225, 250, 266, 290, 316, 342, 366, 400, 425], ys=[324, 344, 365, 385, 407, 434]),
    "riverwood": dict(xs=[910, 925, 945, 966, 990, 1010, 1029, 1059], ys=[596, 609, 622, 635, 646, 657, 667, 680]),
    "crossroads": dict(xs=[545, 571, 587, 605, 641, 669], ys=[407, 420, 435, 447, 462, 475, 485, 495]),
    # New neighbourhoods from the final map audit (owner, 2026-11-04: "look for areas that can be
    # improved by building a new neighbourhood"): the concept map leaves these empty, so their
    # blocks' densities are set here instead of read off the roofs (rows north to south).
    # Bayview (B4): a seaside suburb on the flat west coast between Millhaven and the sea.
    "bayview": dict(
        xs=[85.0, 94.4, 103.8, 113.2, 122.6, 132.0, 141.4],
        ys=[383.0, 392.4, 401.8, 411.2, 420.6, 430.0],
        density=[
            [0.12, 0.18, 0.2, 0.2, 0.15, 0.1],
            [0.18, 0.3, 0.42, 0.35, 0.2, 0.15],
            [0.2, 0.35, 0.5, 0.4, 0.22, 0.15],
            [0.15, 0.25, 0.32, 0.25, 0.2, 0.1],
            [0.1, 0.15, 0.2, 0.15, 0.12, 0.0],
        ],
    ),
    # Northfield (G3): a commuter estate in the open fields between the hospital and the quarry.
    "northfield": dict(
        xs=[757.0, 766.4, 775.8, 785.2, 794.6, 804.0],
        ys=[299.0, 308.4, 317.8, 327.2, 336.6],
        density=[
            [0.15, 0.2, 0.25, 0.2, 0.12],
            [0.2, 0.35, 0.45, 0.3, 0.18],
            [0.18, 0.3, 0.35, 0.25, 0.15],
            [0.1, 0.18, 0.2, 0.15, 0.1],
        ],
    ),
}
STREET_WIDTH = 9.0  # metres
# A block counts as built from this roof density; empty blocks keep no streets of their own.
BLOCK_MIN = 0.08
# Island Superstore (owner, 2026-11-04: "should look like the map"): the concept map's complex
# compressed to ~0.6 scale around our 150 m store: a ring road (x0, x1, z0, z1, metres from the
# POI), a street grid inside it and spokes out to the island's roads; the traced road pieces
# inside are dropped. The pad is flat out to the ring and the lot is paved only inside it.
# Fisher's Cove waterfront (world metres x0, x1, z0, z1, height): a level quay along the bay's
# north shore for the fish market and the piers (the hamlet itself stays on its slope).
HARBORS = [(-3850.0, -3550.0, 3245.0, 3325.0, 2.6)]
SUPERSTORE_RING = (-560.0, 600.0, -300.0, 262.0)
SUPERSTORE_ASPHALT = [
    (-246, 246, -258, -102),  # north car park
    (-246, 246, 66, 156),  # south car park
    (-535, -312, -296, 156),  # west yards
    (312, 572, -296, 156),  # east yards
    (-556, 596, 202, 258),  # behind the south rows
]
SUPERSTORE_STREETS = [
    # Inner grid: block roads east and west of the lots, the south shop street, the axis.
    [(-250, -300), (-250, 262)],
    [(250, -300), (250, 262)],
    [(-560, 160), (600, 160)],
    [(0, -300), (0, -96)],
    [(0, 64), (0, 262)],
    # The loop around the store (service yard behind it, fire lane in front).
    [(-96, -96), (96, -96), (96, 64), (-96, 64), (-96, -96)],
    # Spokes to the island's roads.
    [(-683, 0), (-560, 0)],
    [(88, -300), (88, -508)],
    [(-103, 262), (-103, 330)],
    [(141, 262), (141, 300)],
]


# River bridges the concept draws (image px, one point on each bank, along the road;
# roads crossing a channel unbroken are found from the road itself). The traced
# roads stop short of them (bridge decks are darker than asphalt), so they are listed; each span
# is widened to dry ground on both banks when the world is built.
RIVER_BRIDGES = [
    ((677, 578), (687, 606)),  # F5: Crossroads south over the main river
    ((909, 549), (910, 565)),  # H5: the hospital ring road south to Riverwood
    ((561, 538), (552, 557)),  # E5: Crossroads to Blackwater Prison
    ((938, 795), (956, 799)),  # H7: the Riverwood channel by East Works
    ((1186, 425), (1184, 440)),  # J4: the coast road over the main river's mouth
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


# Iron Peaks summits (world x, z, extra height m, south reach m): the massif's tops, sharpened.
IRON_SUMMITS = [
    (-539.0, -4496.0, 125.0, 330.0),  # the main summit (radio mast)
    (-578.0, -4082.0, 95.0, 300.0),
    (-195.0, -4156.0, 105.0, 300.0),
    (297.0, -4246.0, 85.0, 280.0),
    (-1371.0, -4637.0, 70.0, 260.0),  # the western shoulder
]


def iron_peaks(x: np.ndarray, z: np.ndarray, h: np.ndarray) -> np.ndarray:
    """Height added to Iron Peaks: pointed summits, steeper to the north, joined by saddles."""
    rng = np.random.default_rng(SEED + 202)
    add = np.zeros_like(h)
    box = (x > -2000) & (x < 900) & (z < -3500)
    xs, zs = x[box], z[box]
    peaks = np.zeros(xs.shape, np.float64)
    for sx, sz, height, reach in IRON_SUMMITS:
        dx, dz = xs - sx, zs - sz
        ang = np.arctan2(dz, dx)  # +z is south: sin(ang) > 0 faces south
        # Reach by direction: long to the south (climbable), short to the north (cliffs), with a
        # few lobes so the peak is not a cone.
        lobes = 1 + 0.16 * np.sin(3 * ang + rng.uniform(0, 6.3)) + 0.1 * np.sin(5 * ang + rng.uniform(0, 6.3))
        r = reach * (0.78 + 0.32 * np.sin(ang)) * lobes
        # The tip rounded over ~45 m (a pointed summit is steepest at the top, and its perch
        # could not be walked onto); further out the faces keep their pitch.
        d = np.sqrt(dx * dx + dz * dz + 45.0**2) - 45.0
        t = np.clip(1 - d / r, 0, 1)
        peaks = np.maximum(peaks, height * t**1.45)
    # Saddles: a crest between neighbouring summits, 45 % of the lower one's extra height.
    order = sorted(IRON_SUMMITS, key=lambda s: s[0])
    for (ax, az, ah, _), (bx, bz, bh, _) in zip(order, order[1:]):
        d = polyline_distance(xs, zs, [(ax, az), (bx, bz)])
        peaks = np.maximum(peaks, 0.45 * min(ah, bh) * np.clip(1 - d / 170.0, 0, 1) ** 1.6)
    # Broken ledges on the new faces (a rockier read than smooth cones).
    ledge = ridged(GRID, rng, 90.0)[box]
    peaks += smoothstep(25, 80, peaks) * ledge * 9.0
    add[box] = peaks
    return add


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
    # Specks of land under ~3,000 m² (a few cells of beach in the sea, from the concept's
    # coastline pixels) go under water: at beach height in deep water, each terrain level of
    # detail drew them above or below the surface, so they blinked when seen from the air
    # (owner, 2026-11-05: flicker from the parachute). Real islands are far larger.
    speck_lab, speck_n = nd.label(land)
    speck_sizes = nd.sum(land, speck_lab, range(1, speck_n + 1)) * SPACING * SPACING
    small = [i + 1 for i, a in enumerate(speck_sizes) if a < 3000]
    land &= ~np.isin(speck_lab, small)
    print("land specks removed:", len(small))
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
    # Crags on the high ground (owner, 2026-11-04: "a rockier look for Iron Peaks"): ridged
    # detail and broken ledges above ~100 m, from their own generator (the rest of the island's
    # randomness is unchanged).
    crng = np.random.default_rng(SEED + 101)
    crag = ridged(GRID, crng, 240.0)
    ledge = fractal(GRID, crng, [(70, 1.0), (28, 0.5)])
    h += smoothstep(90, 200, h) * (crag * 24.0 + np.abs(ledge) * 3.5)
    # Iron Peaks as a sniper mountain (owner, 2026-11-04 audit: "fun sniper mountains, good to run
    # up"): the old massif was one rounded dome whose 310-350 m tops sat among 250-300 m humps,
    # so the long views (300 m-1 km) were blocked. Each summit now rises as its own peak, sharp
    # and steep (partly cliffs) on the north, the sea side, and longer climbable slopes to the
    # south, toward the map; saddle ridges link the summits so the crest can be walked from perch
    # to perch. Its own generator: the rest of the island is unchanged.
    h += iron_peaks(x, z, h)
    # Rivers: valleys lowered toward the water and a channel below sea level.
    river_dist = np.full(x.shape, np.inf, np.float32)
    # Within a channel (plus 20 m of bank) roads do not fill the river: they cross on bridges.
    in_channel = np.zeros(x.shape, np.float32)
    wet_mask = np.zeros(x.shape, bool)
    core_mask = np.zeros(x.shape, bool)
    for r in RIVERS:
        pts = [px_to_world(*p) for p in r["pts"]]
        d = polyline_distance(x, z, pts)
        # A gentle valley (400 m) down to banks ~3 m above the water, then the channel.
        valley = smoothstep(r["width"] * 0.6, 420.0, d)
        h = h * (0.45 + 0.55 * valley) + (1 - valley) * 3.0
        channel = 1 - smoothstep(r["width"] * 0.35, r["width"] * 0.62, d)
        h = h * (1 - channel) + channel * -2.5
        river_dist = np.minimum(river_dist, d)
        in_channel = np.maximum(in_channel, 1 - smoothstep(r["width"] * 0.62, r["width"] * 0.62 + 20, d))
        wet_mask |= d < r["width"] * 0.62 + 2
        core_mask |= d < r["width"] * 0.4
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
    q_rad = 118 / IMG_SIZE * WORLD * 0.85
    rim = h.copy()
    # Irregular outline: the radius wobbles with the angle (a few low harmonics), so the benches
    # read as blasted rock faces rather than rings.
    q_ang = np.arctan2(z - qz, x - qx)
    wobble = 1 + 0.1 * np.sin(2 * q_ang + 1.1) + 0.06 * np.sin(3 * q_ang + 2.3) + 0.035 * np.sin(5 * q_ang + 0.4)
    qd = np.hypot(x - qx, z - qz) / wobble
    pit = np.clip(1 - qd / q_rad, 0, 1)
    # Bench lines wander a little per bench as well.
    bench = pit * 7 + 0.18 * np.sin(4 * q_ang + 3 * np.floor(pit * 7))
    terraces = np.floor(bench) / 7
    terraces = terraces + (bench - np.floor(bench)).clip(0, 0.12) / 0.12 / 7  # bench edges
    # Haul road: a ramp spiralling 1.25 turns from the rim (north-east, toward the plant) to the
    # floor at an even grade; inside its band the benches give way to the ramp.
    turns, ramp_w = 1.25, 16.0
    phi0 = np.arctan2(-0.6, 0.8)  # rim entry angle
    rel = np.mod(phi0 - q_ang, 2 * np.pi)  # angle travelled clockwise from the entry
    ramp_level = np.full_like(pit, np.inf)
    for k in range(2):
        t = (rel + 2 * np.pi * k) / (2 * np.pi * turns)  # 0 at the rim, 1 at the floor
        ok = t <= 1
        r_centre = q_rad * (1 - 0.86 * t)
        near = ok & (np.abs(qd - r_centre) < ramp_w)
        ramp_level = np.where(near, np.minimum(ramp_level, np.clip(t, 0, 1) * 6 / 7), ramp_level)
    on_ramp = np.isfinite(ramp_level) & (pit > 0)
    terraces = np.where(on_ramp, ramp_level, terraces)
    haul_road = []
    for t in np.linspace(0, 1, 60):
        a = phi0 - t * 2 * np.pi * turns
        rr = q_rad * (1 - 0.86 * t)
        w = 1 + 0.1 * np.sin(2 * a + 1.1) + 0.06 * np.sin(3 * a + 2.3) + 0.035 * np.sin(5 * a + 0.4)
        haul_road.append((qx + np.cos(a) * rr * w, qz + np.sin(a) * rr * w))
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
    road_px = [(line, ROAD_WIDTH) for line in extract_roads(im, labels, water_img)]
    road_px += seeded_roads(im, road_px)
    road_px += [
        (chaikin([(float(x - IMG_X0), float(y - IMG_Y0)) for x, y in line], 2), ROAD_WIDTH) for line in MANUAL_ROADS
    ]
    roads = [[(cx / IMG_SIZE * WORLD - HALF, cy / IMG_SIZE * WORLD - HALF) for cx, cy in line] for line, _ in road_px]
    towns = town_grids(im, labels)
    roads = cut_town_roads(roads, towns) + town_streets(towns)
    roads = superstore_roads(roads)
    def wet_at(px_, pz_):
        gi, gj = world_to_grid(px_, pz_)
        return bool(wet_mask[int(round(np.clip(gj, 0, GRID - 1))), int(round(np.clip(gi, 0, GRID - 1)))])
    def core_at(px_, pz_):
        gi, gj = world_to_grid(px_, pz_)
        return bool(core_mask[int(round(np.clip(gj, 0, GRID - 1))), int(round(np.clip(gi, 0, GRID - 1)))])
    crossings = listed_crossings(wet_at)
    # Roads that run unbroken through a channel's core (not along its bank).
    for span in river_crossings(roads, core_at):
        if not any(np.hypot(span[0][0] - c[0][0], span[0][1] - c[0][1]) < 90 for c in crossings):
            crossings.append(span)
    roads = cut_crossings(roads, crossings)
    fixed_spans = [(px_to_world(*b["a"]), px_to_world(*b["b"])) for b in BRIDGES + DAMS]
    roads += bridge_connectors(roads, crossings + fixed_spans, wet_at)
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
    w_road = (1 - smoothstep(ROAD_WIDTH * 0.6, ROAD_WIDTH * 2.5, road_dist)) * (1 - in_channel)
    h = h * (1 - w_road) + road_smooth * w_road
    # POI pads: flatten building areas to their own smoothed height.
    smooth = nd.gaussian_filter(h, 40)
    for p in POIS:
        t = towns.get(p["id"])
        if t:
            x0, x1, z0, z1 = t["xs"][0] - 40, t["xs"][-1] + 40, t["zs"][0] - 40, t["zs"][-1] + 40
            dx = np.maximum(np.maximum(x0 - x, x - x1), 0)
            dz = np.maximum(np.maximum(z0 - z, z - z1), 0)
            d = np.hypot(dx, dz)
            gi, gj = world_to_grid((x0 + x1) / 2, (z0 + z1) / 2)
            target = float(smooth[int(gj), int(gi)])
            # (River channels and their banks stay as carved: a pad never fills a river.)
            w = (1 - smoothstep(0, 220, d)) * (1 - in_channel)
            h = h * (1 - w) + target * w
            p["height"] = round(target, 2)
            p["town"] = t
            continue
        if not p["pad"]:
            continue
        cx, cz = px_to_world(*p["px"])
        if p["id"] == "island-superstore":
            # Flat out to the ring road, blended over 200 m beyond it.
            x0, x1, z0, z1 = SUPERSTORE_RING
            dx = np.maximum(np.maximum(cx + x0 - 20 - x, x - cx - x1 - 20), 0)
            dz = np.maximum(np.maximum(cz + z0 - 20 - z, z - cz - z1 - 20), 0)
            gi, gj = world_to_grid(cx, cz)
            target = float(smooth[int(gj), int(gi)])
            w = (1 - smoothstep(0, 200, np.hypot(dx, dz))) * (1 - in_channel)
            h = h * (1 - w) + target * w
            p["height"] = round(target, 2)
            continue
        d = np.hypot(x - cx, z - cz)
        r = p["pad"] / 2
        gi, gj = world_to_grid(cx, cz)
        target = float(smooth[int(gj), int(gi)])
        w = (1 - smoothstep(r * 0.85, r * 1.4, d)) * (1 - in_channel)
        h = h * (1 - w) + target * w
        p["height"] = round(target, 2)
    # Harbour quays: level ground at the water's edge (never raising the sea floor).
    for hx0, hx1, hz0, hz1, hh in HARBORS:
        dx = np.maximum(np.maximum(hx0 - x, x - hx1), 0)
        dz = np.maximum(np.maximum(hz0 - z, z - hz1), 0)
        w = (1 - smoothstep(0, 45, np.hypot(dx, dz))) * (h > -0.5)
        h = h * (1 - w) + hh * w
    # Iron Peaks sniper perches (spec §3): the highest summits of the massif, at least 300 m
    # apart, get a small flat top (radius 9 m, blended out to 34 m) so a tower or a sandbag nest
    # can stand there. The layout places on these points (world.v1.json `perches`).
    ix, iz = px_to_world(545, 95)
    near = (np.hypot(x - ix, z - iz) < 1100) & (h > 120)
    peaks = (h == nd.maximum_filter(h, size=int(160 / SPACING))) & near
    pj, pi = np.nonzero(peaks)
    order = np.argsort(-h[pj, pi])
    perches = []
    for k in order:
        px_, pz_ = float(x[pj[k], pi[k]]), float(z[pj[k], pi[k]])
        if any(np.hypot(px_ - q["x"], pz_ - q["z"]) < 300 for q in perches):
            continue
        top = float(h[pj[k], pi[k]]) - 0.6
        d = np.hypot(x - px_, z - pz_)
        # Blended out over 9-34 m (the summits are rounded in iron_peaks, so the blend stays
        # walkable onto the top).
        w = 1 - smoothstep(9.0, 34.0, d)
        h = np.where(d < 34, top * w + h * (1 - w), h)  # cut and fill to a level top
        perches.append(dict(x=round(px_, 1), z=round(pz_, 1), y=round(top, 2)))
        if len(perches) == 7:
            break
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
    # Roads never run under a lake: a road inside a lake's outline is raised to just above it.
    road_near = road_dist < ROAD_WIDTH * 1.2
    # (Not under the dam: its crest carries the road, the wall stands on the original ground.)
    for d_ in DAMS:
        pa_, pb_ = px_to_world(*d_["a"]), px_to_world(*d_["b"])
        road_near &= polyline_distance(x, z, [pa_, pb_]) > 30
    for wb in water_bodies:
        bx0, bz0, bx1, bz1 = wb["bounds"]
        inside = road_near & (x >= bx0) & (x <= bx1) & (z >= bz0) & (z <= bz1) & (h < wb["level"] + 0.6)
        h = np.where(inside, wb["level"] + 0.6, h)
    # Bridges sit above the strait; keep the abutments on land at deck height.
    bridges = []
    for b in BRIDGES:
        pa, pb = px_to_world(*b["a"]), px_to_world(*b["b"])
        bridges.append(dict(id=b["id"], a=[round(pa[0], 1), round(pa[1], 1)], b=[round(pb[0], 1), round(pb[1], 1)], deck=14.0, width=12.0))
    for d in DAMS:
        pa, pb = px_to_world(*d["a"]), px_to_world(*d["b"])
        bridges.append(dict(id=d["id"], a=[round(pa[0], 1), round(pa[1], 1)], b=[round(pb[0], 1), round(pb[1], 1)], deck=d["deck"], width=d["width"], solid=True))
    # River bridges where roads cross the channels: the deck clears the higher bank by 3 m.
    def h_at(px_, pz_):
        gi, gj = world_to_grid(px_, pz_)
        return float(h[int(round(np.clip(gj, 0, GRID - 1))), int(round(np.clip(gi, 0, GRID - 1)))])
    k = 0
    for pa, pb in crossings:
        # Only a real crossing: both ends on dry land, the channel under the span.
        under = min(h_at(pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t) for t in np.linspace(0.1, 0.9, 17))
        if h_at(*pa) < 0.6 or h_at(*pb) < 0.6 or under > 0:
            print("no bridge (ends wet or no channel):", [round(v) for v in pa + pb])
            continue
        k += 1
        deck = max(h_at(*pa), h_at(*pb), 2.0) + 3.0
        bridges.append(dict(id=f"river-bridge-{k}", a=[round(pa[0], 1), round(pa[1], 1)], b=[round(pb[0], 1), round(pb[1], 1)], deck=round(deck, 2), width=10.0))
    # Roads that end in the sea (traced beach edges) are trimmed back to land.
    roads = trim_wet_roads(roads, h_at)
    # The quarry's haul road (carved into the benches above, kept out of the road smoothing).
    roads.append([(float(px_), float(pz_)) for px_, pz_ in haul_road])
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
    # Tree line: bare rock above 210 m, forest included.
    cover[land_c & (hc > 210)] = ROCK
    # Building pads: a built-up core (lots, yards and streets come from the concept map around it),
    # so every POI with buildings reads as a settlement and stays free of forest.
    cxs, czs = grid_coords(COVER)
    for p in POIS:
        if not p["pad"]:
            continue
        px, pz = px_to_world(*p["px"])
        d = np.hypot(cxs - px, czs - pz)
        core = (d < p["pad"] / 2 * 0.62) & land_c & (cover != ROAD) & (cover != WATER)
        if p["id"] == "island-superstore":
            # Paved inside the ring road only (the concept's lots, compressed); the rest of the
            # traced lot around it goes back to grass.
            x0, x1, z0, z1 = SUPERSTORE_RING
            ring = (cxs > px + x0) & (cxs < px + x1) & (czs > pz + z0) & (czs < pz + z1) & land_c
            near = (np.abs(cxs - px) < 900) & (np.abs(czs - pz) < 700) & land_c
            cover[near & ~ring & (cover == URBAN)] = GRASS
            cover[ring & (cover != ROAD) & (cover != WATER)] = URBAN
            # Asphalt (the road shade) on the car parks and the yards between the blocks, as
            # dark as the concept's lots; concrete stays around the store and under the shops.
            for ax0, ax1, az0, az1 in SUPERSTORE_ASPHALT:
                m = (cxs > px + ax0) & (cxs < px + ax1) & (czs > pz + az0) & (czs < pz + az1) & land_c
                cover[m & (cover != WATER)] = ROAD
            continue
        # Towns pave by block below; elsewhere the pad's core is a built-up lot.
        if p["id"] not in towns:
            cover[core] = URBAN
        cover[(d < p["pad"] / 2) & (cover == FOREST)] = GRASS

    # Town grids: shop blocks are paved along their street fronts, housing blocks only at the
    # pavement (houses stand on lawns), gardens and back yards inside (grass: scattered trees,
    # bushes); the densest blocks and Millhaven's industrial east are paved through; empty blocks
    # are grass (no forest in a town).
    for tid, t in towns.items():
        for i, j, dens in t["blocks"]:
            bx0, bx1 = t["xs"][i], t["xs"][i + 1]
            bz0, bz1 = t["zs"][j], t["zs"][j + 1]
            m = (cxs > bx0) & (cxs < bx1) & (czs > bz0) & (czs < bz1) & land_c
            if dens >= BLOCK_MIN:
                if dens >= 0.6 or (tid == "millhaven" and i >= 6):
                    cover[m] = URBAN
                else:
                    edge = np.minimum(np.minimum(cxs - bx0, bx1 - cxs), np.minimum(czs - bz0, bz1 - czs))
                    # Shop blocks: paved fronts and lots; housing: pavement, houses on lawns.
                    band = 26 if dens >= 0.3 else 9
                    cover[m & (edge < band)] = URBAN
                    cover[m & (edge >= band) & (cover != ROAD)] = GRASS
            cover[m & (cover == FOREST)] = GRASS

    # Crossroads farm fields (owner, 2026-11-04): open grass around the junction town becomes
    # a patchwork of fields out to ~650 m, hedgerow strips (grass) between them; farms follow
    # (layout.ts builds farms where the roads pass fields).
    t = towns.get("crossroads")
    if t:
        x0, x1, z0, z1 = t["xs"][0], t["xs"][-1], t["zs"][0], t["zs"][-1]
        dx = np.maximum(np.maximum(x0 - cxs, cxs - x1), 0)
        dz = np.maximum(np.maximum(z0 - czs, czs - z1), 0)
        ring = (np.hypot(dx, dz) > 30) & (np.hypot(dx, dz) < 650) & land_c & (cover == GRASS)
        hedge = (np.mod(cxs + 37, 190) < 8) | (np.mod(czs + 11, 160) < 8)
        cover[ring & ~hedge] = FIELD

    # The harbour quays are paved.
    for hx0, hx1, hz0, hz1, _ in HARBORS:
        cover[(cxs > hx0) & (cxs < hx1) & (czs > hz0) & (czs < hz1) & land_c] = URBAN
    # Redstone Quarry: the pit and its benches are bare gravel (no trees), as drawn.
    qx, qz = px_to_world(1000, 195)
    qa = np.arctan2(czs - qz, cxs - qx)
    qw = 1 + 0.1 * np.sin(2 * qa + 1.1) + 0.06 * np.sin(3 * qa + 2.3) + 0.035 * np.sin(5 * qa + 0.4)
    cover[(np.hypot(cxs - qx, czs - qz) / qw < 118 / IMG_SIZE * WORLD * 0.85) & land_c] = SAND

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
    return dict(h=h, cover=cover.astype(np.uint8), water_bodies=water_bodies, bridges=bridges, perches=perches, land=land, lakes=lakes, water=water_mask, roads=roads)


def town_grids(im: np.ndarray, labels: np.ndarray) -> dict:
    """Each town's streets in world metres and its blocks [i, j, roof density] (concept map)."""
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    sat = im.max(-1) - im.min(-1)
    # Light roofs (white, grey) and red-brown roofs; tan fields (r - g < 35) do not count.
    roof = ((lum > 150) & (sat < 70)) | ((r > g + 35) & (r > b + 40) & (lum > 70))
    out = {}
    for tid, t in TOWNS.items():
        xs, ys = t["xs"], t["ys"]
        blocks = []
        dens_all = []
        if "density" in t:
            # Laid out by hand (no roofs on the concept map there).
            blocks = [[i, j, float(t["density"][j][i])] for j in range(len(ys) - 1) for i in range(len(xs) - 1)]
            out[tid] = dict(
                xs=[round(px_to_world(v, 0)[0], 1) for v in xs],
                zs=[round(px_to_world(0, v)[1], 1) for v in ys],
                blocks=blocks,
                street=STREET_WIDTH,
            )
            continue
        for j in range(len(ys) - 1):
            for i in range(len(xs) - 1):
                x0, x1 = xs[i] + 2 - IMG_X0, xs[i + 1] - 2 - IMG_X0
                y0, y1 = ys[j] + 2 - IMG_Y0, ys[j + 1] - 2 - IMG_Y0
                region = roof[y0:y1, x0:x1]
                lab = labels[y0:y1, x0:x1]
                ok = ~lab
                dens = float(region[ok].mean()) if ok.sum() > region.size * 0.35 else None
                blocks.append([i, j, dens])
                if dens is not None:
                    dens_all.append(dens)
        mean = float(np.mean(dens_all)) if dens_all else 0.2
        for blk in blocks:
            if blk[2] is None:
                blk[2] = mean  # under a label: the town's average
            blk[2] = round(min(1.0, blk[2]), 3)
        out[tid] = dict(
            xs=[round(px_to_world(v, 0)[0], 1) for v in xs],
            zs=[round(px_to_world(0, v)[1], 1) for v in ys],
            blocks=blocks,
            street=STREET_WIDTH,
        )
    return out


def superstore_roads(roads: list) -> list:
    """Drop the traced pieces inside the Superstore's ring road; add its own street grid."""
    cx, cz = px_to_world(655, 1055)
    x0, x1, z0, z1 = SUPERSTORE_RING
    out = []
    for line in roads:
        cur = []
        for a, b in zip(line[:-1], line[1:]):
            mx, mz = (a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cz
            if x0 - 25 < mx < x1 + 25 and z0 - 25 < mz < z1 + 25:
                if len(cur) >= 2:
                    out.append(cur)
                cur = []
                continue
            if not cur:
                cur = [a]
            cur.append(b)
        if len(cur) >= 2:
            out.append(cur)
    ring = [(x0, z0), (x1, z0), (x1, z1), (x0, z1), (x0, z0)]
    for line in [ring] + SUPERSTORE_STREETS:
        pts = []
        for (ax, az), (bx, bz) in zip(line[:-1], line[1:]):
            n = max(1, int(np.hypot(bx - ax, bz - az) / 20))
            pts += [(cx + ax + (bx - ax) * k / n, cz + az + (bz - az) * k / n) for k in range(n)]
        pts.append((cx + line[-1][0], cz + line[-1][1]))
        out.append(pts)
    return out


def cut_town_roads(roads: list, towns: dict) -> list:
    """Drop the traced road pieces inside a town grid (its streets replace them)."""
    out = []
    for line in roads:
        cur = []
        for a, b in zip(line[:-1], line[1:]):
            mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            inside = any(
                t["xs"][0] + 15 < mx < t["xs"][-1] - 15 and t["zs"][0] + 15 < mz < t["zs"][-1] - 15 for t in towns.values()
            )
            if inside:
                if len(cur) >= 2:
                    out.append(cur)
                cur = []
                continue
            if not cur:
                cur = [a]
            cur.append(b)
        if len(cur) >= 2:
            out.append(cur)
    return out


def town_streets(towns: dict) -> list:
    """Street polylines: every edge of a built block (each street once, merged along its line)."""
    lines = []
    for t in towns.values():
        xs, zs = t["xs"], t["zs"]
        built = {(i, j) for i, j, d in t["blocks"] if d >= BLOCK_MIN}
        # East-west streets: along zs[j], spans where the block above or below is built.
        for j in range(len(zs)):
            run = None
            for i in range(len(xs) - 1):
                on = (i, j) in built or (i, j - 1) in built
                if on and run is None:
                    run = i
                if (not on or i == len(xs) - 2) and run is not None:
                    end = i + 1 if on else i
                    if end > run:
                        lines.append([(xs[run], zs[j]), (xs[end], zs[j])])
                    run = None
        for i in range(len(xs)):
            run = None
            for j in range(len(zs) - 1):
                on = (i, j) in built or (i - 1, j) in built
                if on and run is None:
                    run = j
                if (not on or j == len(zs) - 2) and run is not None:
                    end = j + 1 if on else j
                    if end > run:
                        lines.append([(xs[i], zs[run]), (xs[i], zs[end])])
                    run = None
    # Densify (the terrain smoothing and the land cover follow the points).
    out = []
    for (ax, az), (bx, bz) in (l for l in lines):
        n = max(1, int(np.hypot(bx - ax, bz - az) / 20))
        out.append([(ax + (bx - ax) * k / n, az + (bz - az) * k / n) for k in range(n + 1)])
    return out


def _river_world():
    return [(r, [px_to_world(*p) for p in r["pts"]]) for r in RIVERS]


def _seg_dist(px_, pz_, pts):
    best = np.inf
    for (ax, az), (bx, bz) in zip(pts[:-1], pts[1:]):
        vx, vz = bx - ax, bz - az
        t = np.clip(((px_ - ax) * vx + (pz_ - az) * vz) / (vx * vx + vz * vz), 0, 1)
        best = min(best, np.hypot(px_ - (ax + t * vx), pz_ - (az + t * vz)))
    return best


def river_crossings(roads: list, wet_at) -> list:
    """Where a road crosses a river channel: the bridge span, from 16 m before the channel to
    16 m after it, as (a, b) in world metres."""
    spans = []
    for line in roads:
        pts = []
        for a, b in zip(line[:-1], line[1:]):
            n = max(1, int(np.hypot(b[0] - a[0], b[1] - a[1]) / 2))
            pts += [(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n) for k in range(n)]
        pts.append(line[-1])
        wet = [wet_at(px_, pz_) for px_, pz_ in pts]
        k = 0
        while k < len(pts):
            if not wet[k]:
                k += 1
                continue
            s0 = k
            while k < len(pts) and wet[k]:
                k += 1
            s1 = k - 1
            if s0 == 0 or k >= len(pts):
                continue  # the road ends in the river: no crossing
            # 16 m (8 samples) of dry road on each side.
            a = pts[max(0, s0 - 8)]
            b = pts[min(len(pts) - 1, s1 + 8)]
            if not any(np.hypot(a[0] - c[0], a[1] - c[1]) < 40 for c, _ in spans):
                spans.append((a, b))
    return spans


def bridge_connectors(roads: list, spans: list, wet_at) -> list:
    """Short roads from each bridge end to the nearest road (ends first) within 120 m, so every
    bridge joins the network; a connector never runs through the channel."""
    out = []
    for a, b in spans:
        for end, other in ((a, b), (b, a)):
            best, best_d = None, 120.0
            for line in roads:
                for k, p in enumerate(line):
                    d = np.hypot(p[0] - end[0], p[1] - end[1])
                    # Prefer road ends (a road the tracer stopped short of the bridge).
                    d_eff = d * (0.6 if k in (0, len(line) - 1) else 1.0)
                    # Stay on this bank: the point must be farther from the other end than we are.
                    if np.hypot(p[0] - other[0], p[1] - other[1]) < np.hypot(end[0] - other[0], end[1] - other[1]):
                        continue
                    if d_eff < best_d:
                        best, best_d = p, d_eff
            if best is None or np.hypot(best[0] - end[0], best[1] - end[1]) < 4:
                continue
            if any(wet_at(end[0] + (best[0] - end[0]) * t, end[1] + (best[1] - end[1]) * t) for t in np.linspace(0, 1, 12)):
                continue
            n = max(1, int(np.hypot(best[0] - end[0], best[1] - end[1]) / 10))
            out.append([(end[0] + (best[0] - end[0]) * k / n, end[1] + (best[1] - end[1]) * k / n) for k in range(n + 1)])
    return out


def listed_crossings(wet_at) -> list:
    """RIVER_BRIDGES in world metres, each end moved outward until it stands on dry ground."""
    spans = []
    for a_px, b_px in RIVER_BRIDGES:
        a0, b0 = np.array(px_to_world(*a_px)), np.array(px_to_world(*b_px))
        L = np.hypot(*(b0 - a0)) or 1.0
        u = (b0 - a0) / L
        # Along the axis (from 60 m before a to 120 m past b): the wet run nearest the listed
        # points; the span runs from the dry ground before it to the dry ground after it.
        ts = np.arange(-60.0, L + 120.0, 2.0)
        wet = [wet_at(*(a0 + u * t)) for t in ts]
        runs, k = [], 0
        while k < len(ts):
            if wet[k]:
                k0 = k
                while k < len(ts) and wet[k]:
                    k += 1
                runs.append((ts[k0], ts[k - 1]))
            k += 1
        if not runs:
            continue
        t0, t1 = min(runs, key=lambda r: abs((r[0] + r[1]) / 2 - L / 2))
        a, b = a0 + u * (t0 - 10), a0 + u * (t1 + 10)
        spans.append(((float(a[0]), float(a[1])), (float(b[0]), float(b[1]))))
    return spans


def paired_crossings(roads: list, wet_at, existing: list) -> list:
    """Roads the tracer split at a river (one end on each bank): ends facing each other across a
    channel, less than 160 m apart, get a bridge between their last dry points."""
    def dry_end(line, rev):
        pts = line[::-1] if rev else line
        # Walk back from the end while the road is in the channel.
        for k, p in enumerate(pts):
            if not wet_at(*p):
                return p, pts[min(len(pts) - 1, k + 3)]
        return None, None
    ends = []
    for li, line in enumerate(roads):
        if len(line) < 2:
            continue
        for rev in (False, True):
            end = line[-1] if not rev else line[0]
            p, back = dry_end(line, not rev)
            if p is None:
                continue
            # Only ends at a river: some wet ground within 70 m ahead (or the end itself is wet).
            hx, hz = p[0] - back[0], p[1] - back[1]
            n = np.hypot(hx, hz) or 1.0
            hx, hz = hx / n, hz / n
            if not (wet_at(*end) or any(wet_at(p[0] + hx * d, p[1] + hz * d) for d in range(4, 70, 3))):
                continue
            ends.append((li, p, (hx, hz)))
    spans = []
    used = set()
    for a in range(len(ends)):
        la, pa, ha = ends[a]
        best = None
        for b in range(len(ends)):
            lb, pb, hb = ends[b]
            if b == a or lb == la or b in used or a in used:
                continue
            dx, dz = pb[0] - pa[0], pb[1] - pa[1]
            d = np.hypot(dx, dz)
            if d < 12 or d > 160:
                continue
            # Facing each other, and the gap between them is (partly) channel.
            if (dx * ha[0] + dz * ha[1]) / d < 0.5 or (-dx * hb[0] - dz * hb[1]) / d < 0.5:
                continue
            if not any(wet_at(pa[0] + dx * t, pa[1] + dz * t) for t in np.linspace(0.1, 0.9, 17)):
                continue
            if best is None or d < best[0]:
                best = (d, b, pb)
        if best:
            used.update({a, best[1]})
            span = (pa, best[2])
            if not any(np.hypot(span[0][0] - c[0], span[0][1] - c[1]) < 40 for c, _ in existing + spans):
                spans.append(span)
    return spans


def cut_crossings(roads: list, spans: list) -> list:
    """Remove the road under each bridge (the deck carries it)."""
    def on_span(p):
        for a, b in spans:
            vx, vz = b[0] - a[0], b[1] - a[1]
            L2 = vx * vx + vz * vz
            t = ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / L2
            if 0.04 < t < 0.96 and np.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vz)) < 6:
                return True
        return False
    out = []
    for line in roads:
        dense = []
        for a, b in zip(line[:-1], line[1:]):
            n = max(1, int(np.hypot(b[0] - a[0], b[1] - a[1]) / 3))
            dense += [(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n) for k in range(n)]
        dense.append(line[-1])
        if not any(on_span(p) for p in dense):
            out.append(line)
            continue
        cur = []
        for p in dense:
            if on_span(p):
                if len(cur) >= 2:
                    out.append(rdp(cur, 0.6))
                cur = []
            else:
                cur.append(p)
        if len(cur) >= 2:
            out.append(rdp(cur, 0.6))
    return out


def trim_wet_roads(roads: list, h_at) -> list:
    """Cut the ends of roads that run into the sea (beach edges traced as roads)."""
    out = []
    for line in roads:
        k0, k1 = 0, len(line) - 1
        while k0 < k1 and h_at(*line[k0]) < 0.4:
            k0 += 1
        while k1 > k0 and h_at(*line[k1]) < 0.4:
            k1 -= 1
        if k1 - k0 >= 1:
            out.append(line[k0 : k1 + 1])
    return out


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
    # sat < 45: grey asphalt on the map is slightly warm (≈ 35); tan dirt tracks are ≥ 50.
    mask = (top > 30) & (sat < 45) & (lum > 110) & ~nd.binary_dilation(water, iterations=1)
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


# Grey roads the luminance test misses (darker asphalt next to light fields): a point on each, read
# off the concept map (image px), and the direction to follow. The tracker snaps to the ridge and
# follows it until it fades or meets a road already found.
SEED_ROADS = [
    ((350, 686), (1, 0.3)),  # dam lake to the strait bridge
    ((350, 686), (-1, -0.2)),
    ((400, 150), (1, 1)),  # north of Pine Ridge
    ((400, 150), (-1, -0.8)),
]


# Roads read point by point off a gridded 3x zoom of the concept map (image px), where neither the
# colour test nor the tracker follows them: the grey loop west of Murder Cabins.
MANUAL_ROADS = [
    [(157, 641), (140, 640), (115, 630), (105, 600), (112, 578)],
    [
        (157, 687), (137, 693), (120, 703), (113, 720), (112, 747), (113, 777), (118, 800),
        (130, 817), (153, 823), (173, 830), (187, 840), (192, 853),
    ],
]


def ridge_map(im: np.ndarray) -> np.ndarray:
    from skimage.filters import sato

    lum = 0.3 * im[..., 0] + 0.59 * im[..., 1] + 0.11 * im[..., 2]
    return sato(lum, sigmas=[1.0, 1.6], black_ridges=False)


def snap(R, p, rad=6):
    x, y = int(round(p[0])), int(round(p[1]))
    win = R[y - rad:y + rad + 1, x - rad:x + rad + 1]
    j, i = np.unravel_index(np.argmax(win), win.shape)
    return (x - rad + i, y - rad + j)

def track(R, start, direction, stop, step=3.0, max_turn=0.5, floor=10.0, max_len=2000):
    """Follow a ridge from start along direction; stop where it fades, at `stop` (existing road), or after max_len steps."""
    pts = [start]
    d = np.array(direction, float); d /= np.linalg.norm(d)
    p = np.array(start, float)
    weak = 0
    H, W = R.shape
    for _ in range(max_len):
        best, bestv = None, -1
        for a in np.linspace(-max_turn, max_turn, 11):
            c, s = np.cos(a), np.sin(a)
            nd_ = np.array([d[0] * c - d[1] * s, d[0] * s + d[1] * c])
            q = p + nd_ * step
            qi = (int(round(q[0])), int(round(q[1])))
            if not (2 <= qi[0] < W - 2 and 2 <= qi[1] < H - 2):
                continue
            v = R[qi[1] - 1:qi[1] + 2, qi[0] - 1:qi[0] + 2].max() - abs(a) * 3
            if v > bestv:
                best, bestv = (q, nd_), v
        if best is None:
            break
        q, nd_ = best
        weak = weak + 1 if bestv < floor else 0
        if weak >= 4:
            pts = pts[:-3]
            break
        d = 0.6 * d + 0.4 * nd_; d /= np.linalg.norm(d)
        p = q
        pts.append((float(p[0]), float(p[1])))
        qi = (int(round(p[0])), int(round(p[1])))
        if len(pts) > 6 and stop[qi[1], qi[0]]:
            break
    return pts


def seeded_roads(im: np.ndarray, found: list) -> list:
    """Polylines (grid px) traced from SEED_ROADS, stopping at roads already found."""
    R = ridge_map(im)
    stop = np.zeros(R.shape, bool)
    for line, _ in found:
        for x, y in line:
            if 0 <= int(y) < IMG_SIZE and 0 <= int(x) < IMG_SIZE:
                stop[int(y), int(x)] = True
    stop = nd.binary_dilation(stop, iterations=3)
    out = []
    for (sx, sy), direction in SEED_ROADS:
        start = snap(R, (sx - IMG_X0, sy - IMG_Y0))
        pts = track(R, start, direction, stop)
        if len(pts) >= 8:
            out.append((chaikin(rdp([(float(x), float(y)) for x, y in pts], 1.2), 2), ROAD_WIDTH))
    return out


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
        perches=result["perches"],
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
                **({"town": p["town"]} if "town" in p else {}),
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
