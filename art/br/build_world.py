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
    # (Pad 340 → 600, 2026-11-11: the works were six buildings on a small yard in a 2 km island.)
    dict(id="east-works", name="East Works", px=(1070, 795), radius=65, pad=600, kind="industrial"),
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
    # Eastport (J4, owner 2026-11-11: "a city to the right side of the hospital at the sea that
    # needs an upgrade"): the concept's harbour town north of the river mouth, on the east coast.
    dict(id="eastport", name="Eastport", px=(1150, 420), radius=42, pad=440, kind="town"),
    # Skyline Residences (G4/H4, owner 2026-11-13: "build something diffrent, like high sky
    # skrepers … like a apartment condiminium luxery small one", in the countryside the owner
    # ringed between the hospital and the quarry): two luxury towers, the island's tallest.
    dict(id="skyline", name="Skyline Residences", px=(1012.5, 400.5), radius=22, pad=230, kind="residential"),
]
# Runways: flat strips (image px endpoints, width m).
RUNWAYS = [((612, 832), (860, 852), 60), ((900, 1102), (1050, 1030), 50)]
# Bridges to the island (image px endpoints): road decks over the strait.
BRIDGES = [dict(id="west-bridge", a=(512, 880), b=(522, 975)), dict(id="east-bridge", a=(895, 893), b=(880, 990))]
# Dams (concept map C5): a solid concrete wall with a road on its crest, holding the upper lake
# (south, ~62 m) above the lower one (north, ~28 m). Drawn on land, so it does not cut the water mask.
DAMS = [
    dict(id="old-dam", a=(198, 563), b=(300, 587), deck=70.0, width=16.0, low=(240, 520), levels=[((250, 640), 61.5)])
]
# (`low`: a pixel in the lower lake, below the wall; the powerhouse yard is on that side.
# `levels`: a lake's water level, by a pixel inside it: the reservoir's as it was before the water
# came up to the wall (measured round the larger lake, its ring ran down the dam's old dry pit).)
# Mountains and hills: (image px centre, radius px, height m, ridged?).
MOUNTAINS = [
    # (Heights raised 2026-11-11, owner: "increase mountains/hills" round Iron Peaks and Pine
    # Ridge; changing a height draws no extra noise, so the rest of the island is unchanged.)
    ((545, 95), 120, 322, True),  # Iron Peaks massif
    ((430, 70), 110, 172, True),  # western shoulder of the massif
    ((660, 120), 95, 230, True),
    ((470, 275), 120, 150, True),  # Pine Ridge escarpment above the creek
    ((860, 140), 110, 160, False),  # hills between the peaks and the quarry
    # (the quarry's hill is its own flat-topped massif, below)
    ((1120, 330), 90, 70, False),
    ((120, 650), 140, 75, False),  # west coast hills (Old Dam / Murder Cabins)
    ((200, 860), 110, 60, False),
    ((556, 628), 60, 38, False),  # prison plateau
    ((1110, 560), 90, 55, False),  # east hills above Riverwood
    ((380, 1080), 90, 35, False),  # island west hills
    ((760, 1150), 80, 25, False),
    # Relief audit (owner, 2026-11-09: "it should not just be flat … some areas have hills"):
    # hills where the concept map draws dark, shadowed forest, clear of the towns' pads.
    ((330, 262), 85, 135, True),  # B–C3: the wooded ridge between Northstar and Pine Creek
    ((95, 300), 70, 70, False),  # A3: coastal hills between Northstar and Bayview
    ((440, 625), 75, 85, True),  # D6: the forest west of Blackwater Prison
    ((640, 690), 60, 55, False),  # E6–7: hills south-east of the prison
    ((375, 735), 70, 85, True),  # C7: the forest east of Murder Cabins
    ((720, 222), 70, 125, True),  # F2: north of the lake, under Iron Peaks
    ((1062, 470), 60, 60, False),  # I4–5: between the hospital and Riverwood
    ((1132, 702), 70, 65, False),  # I–J6–7: the south-east headland
    ((850, 1120), 50, 40, False),  # G–H10: the island's south shore
    # Riverwood audit (owner, 2026-11-09: "ensure not flat boring areas"): the town sat in a
    # 2 km plain at one height. Hills around it (not ridged: no draw from the shared noise).
    ((862, 702), 55, 34, False),  # H7: a wooded hill south-west of Riverwood
    ((866, 612), 45, 22, False),  # H6: west of the town, on the existing rise
    ((958, 500), 52, 30, False),  # H5: a bluff across the main river, north of the town
]
# More relief round Iron Peaks and Pine Ridge (owner, 2026-11-11: "increase mountains/hills"
# where the concept draws grey rock and dark forest): (image px centre, radius px, height m,
# ridged?), on their own noise (MORE_RELIEF_SEED) so nothing else on the island moves.
MORE_RELIEF = [
    ((700, 140), 70, 125, True),  # the rocky spur east of the summits (F1-2)
    ((610, 150), 60, 70, True),  # between the massif and the spur, over the lake road
    ((815, 75), 45, 105, False),  # the headland on the north coast, east of the peaks (G1)
    ((895, 78), 40, 80, False),  # and the next one along the coast (H1)
    ((390, 150), 70, 70, True),  # the western foothills above Pine Ridge (D2)
    ((420, 300), 60, 120, True),  # Pine Ridge's rock band over the creek, west end (D3)
    ((520, 305), 50, 70, True),  # and its east end (E3)
]
MORE_RELIEF_SEED = SEED + 404
# Blackwater Prison on a rocky knoll (owner, 2026-11-09: "it looks like the prison should be on a
# slightly rock/hill"): it sat on a terrace cut into a hillside, overlooked from the south-west.
# Its yard is now a level top above the country all round, `rim` m from the centre (wobbled),
# then a rocky face (`cliff` m at `face` rise/run, walkable) and a skirt (`skirt`) down to the
# ground; higher ground near the foot (the south-west) is lowered so the face shows all round.
# One road climbs to the south gate on a ramp (`ramp` rise/run); the north gate opens onto the
# rocks (the north face drops ~55 m to the river valley: no road can climb it).
PRISON_KNOLL = dict(top=85.0, rim=190.0, cliff=13.0, face=0.85, skirt=0.5, ramp=0.1)
# Murder Cabins' summer camp clearing ((x, z) metres from the POI's centre, radius m).
CAMP_CLEARING = ((-8.0, -244.0), 60.0)
# The estates (owner, 2026-11-11: "big houses in the zone spread out", the Hospital's hill
# mansion, the villa in the Old Dam's loop, the compound east of Pine Ridge): level sites (world
# x, z, radius) for layout.ts estates(), blended out to 1.6 x the radius. Kept 1.6 x their
# radius off the roads.
ESTATE_SITES = [
    ((-2230.0, 1600.0), 30.0),
    ((-2190.0, 2210.0), 30.0),
    ((-2060.0, -110.0), 30.0),
    ((3490.0, -1855.0), 32.0),
    ((695.0, -2720.0), 40.0),
    # Modern houses round Murder Cabins' estates and behind the west beach.
    ((-2080.0, 1760.0), 22.0),
    ((-2360.0, 1920.0), 22.0),
    ((-2030.0, 2080.0), 22.0),
    ((-2420.0, 1700.0), 22.0),
    ((-4470.0, 1680.0), 22.0),
    ((-4566.0, 1658.0), 22.0),
]
# Riverwood's lumber yard (x0, x1, z0, z1, metres from the town's centre): bare earth.
RIVERWOOD_YARD = (-420.0, -170.0, -395.0, -280.0)
# The south gate's road (metres from the prison's centre), joining the road south of it.
PRISON_ROAD = [(0.0, 80.0), (0.0, 190.0), (-4.0, 262.0), (-10.0, 340.0), (-15.0, 400.0), (-15.0, 442.0)]
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
    "riverwood": dict(xs=[910, 925, 945, 966, 990, 1010, 1029, 1059], ys=[596, 609, 622, 635, 646, 657, 667, 680], blend=120),
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
    # Eastport (J4): the harbour town at the east coast, densest along the waterfront (east).
    "eastport": dict(
        height=8.0,
        blend=170,
        xs=[1128.0, 1136.0, 1144.0, 1152.0, 1160.0, 1168.0],
        ys=[398.0, 406.6, 415.2, 423.8, 432.4],
        density=[
            [0.1, 0.18, 0.25, 0.3, 0.28],
            [0.15, 0.3, 0.42, 0.5, 0.4],
            [0.15, 0.32, 0.45, 0.5, 0.42],
            [0.1, 0.2, 0.28, 0.32, 0.25],
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
HARBORS = [
    (-3850.0, -3550.0, 3245.0, 3325.0, 2.6),
    # Eastport's waterfront: the quay along the town's sea front, for the fish market and piers.
    (4772.0, 4868.0, -1700.0, -1410.0, 2.6),
]
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


# Crossings placed in world metres where the concept's are ambiguous: Riverwood's road south
# over its channel, the sliver of land beside it and the sea inlet, to the East Works road
# (owner, 2026-11-09: the road dead-ended at the water). Both ends on dry land.
WORLD_CROSSINGS = [((3832.0, 850.0), (3800.0, 1040.0))]

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


# Road grading: the steepest a road climbs (rise / run), the most it is cut into or built up
# from the ground (m), the slope of its banks (rise / run), and the shoulder (m each side).
# (Road audit 2026-11-09: cuttings to 24 m and fills to 10 m, so a road over a ridge goes
# through a pass at the grade instead of climbing it at 40 % where 6 m of cut ran out.)
ROAD_GRADE, ROAD_CUT, ROAD_FILL, ROAD_BANK, ROAD_SHOULDER = 0.13, 24.0, 10.0, 0.5, 2.0


def road_profile(raw: np.ndarray, step: float, pin: np.ndarray | None = None) -> np.ndarray:
    """A road's heights along its length: the ground smoothed over ~60 m, then the grade held
    to ROAD_GRADE (cutting crests, filling dips), never more than ROAD_CUT below or ROAD_FILL
    above the ground. `pin` (NaN where free) holds it to a road it meets, so the two join level."""
    prof = nd.gaussian_filter1d(raw, 15.0 / step, mode="nearest")
    pinned = None if pin is None else ~np.isnan(pin)
    near_pin = None
    if pinned is not None and pinned.any():
        prof[pinned] = pin[pinned]
        near_pin = nd.distance_transform_edt(~pinned) * step < 150.0
    rise = ROAD_GRADE * step
    for _ in range(40):
        before = prof.copy()
        for k in range(1, len(prof)):  # forward and back: no step steeper than the grade
            prof[k] = np.clip(prof[k], prof[k - 1] - rise, prof[k - 1] + rise)
        for k in range(len(prof) - 2, -1, -1):
            prof[k] = np.clip(prof[k], prof[k + 1] - rise, prof[k + 1] + rise)
        clipped = np.clip(prof, raw - ROAD_CUT, raw + ROAD_FILL)
        # Within 150 m of a join the ramp to the other road's level may cut or fill 8 m further,
        # so a road meeting one on an embankment (or in a cutting) climbs to it at the grade.
        loose = np.clip(prof, raw - ROAD_CUT - 8.0, raw + ROAD_FILL + 8.0)
        prof = clipped if near_pin is None else np.where(near_pin, loose, clipped)
        if pinned is not None and pinned.any():
            prof[pinned] = pin[pinned]
        if np.abs(prof - before).max() < 0.01:
            break
    return prof


def trim_roads(roads: list, inside, step: float = 4.0, keep: float = 30.0) -> list:
    """Cut roads where `inside(x, z)` holds (resampled every `step` m where they do); pieces
    shorter than `keep` m are dropped."""
    out = []
    for line in roads:
        pts = np.array(line, np.float64)
        if not any(inside(px_, pz_) for px_, pz_ in pts) and not _crosses(pts, inside, step):
            out.append(line)
            continue
        seg = np.hypot(*(pts[1:] - pts[:-1]).T)
        s = np.concatenate([[0.0], np.cumsum(seg)])
        ss = np.linspace(0, s[-1], max(2, int(s[-1] / step) + 1))
        piece = []
        for d in ss:
            p_ = (float(np.interp(d, s, pts[:, 0])), float(np.interp(d, s, pts[:, 1])))
            if inside(*p_):
                if len(piece) > 1 and piece_len(piece) >= keep:
                    out.append(piece)
                piece = []
            else:
                piece.append(p_)
        if len(piece) > 1 and piece_len(piece) >= keep:
            out.append(piece)
    return out


def _crosses(pts: np.ndarray, inside, step: float) -> bool:
    for (ax, az), (bx, bz) in zip(pts[:-1], pts[1:]):
        n = max(2, int(np.hypot(bx - ax, bz - az) / step))
        if any(inside(ax + (bx - ax) * t, az + (bz - az) * t) for t in np.linspace(0, 1, n)):
            return True
    return False


def _point_segment(p, a, b) -> float:
    """Distance (m) from point p to the segment a-b on the ground plane."""
    vx, vz = b[0] - a[0], b[1] - a[1]
    t = min(1.0, max(0.0, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / max(vx * vx + vz * vz, 1e-9)))
    return float(np.hypot(p[0] - (a[0] + vx * t), p[1] - (a[1] + vz * t)))


def piece_len(piece: list) -> float:
    p = np.array(piece)
    return float(np.hypot(*(p[1:] - p[:-1]).T).sum())


# Roadside ditches (owner, 2026-11-09: "image a fight at a road thats flat"): beyond each
# shoulder of a country road, a ditch DITCH_DEPTH deep along its flat middle and DITCH_WIDTH
# wide (wide enough to survive the 3.9 m height grid), deep enough to crouch or lie in out of
# sight of the road.
DITCH_DEPTH, DITCH_WIDTH = 1.2, 7.0


def grade_roads(h: np.ndarray, roads: list, in_channel: np.ndarray, ditch: np.ndarray | None = None, floor: np.ndarray | None = None) -> np.ndarray:
    """Cut and fill the ground to each road's graded profile: flat across the carriageway and
    its shoulders, banks at ROAD_BANK beyond (as road cuttings and embankments). Where roads
    meet, the nearest road's profile wins. Roads are graded longest first, and a road is held to
    the height of any road already graded where it runs on that road's carriageway, so a side
    road joins the road it meets level instead of at a step."""
    step = SPACING
    reach = ROAD_WIDTH / 2 + ROAD_SHOULDER + ROAD_CUT / ROAD_BANK
    best = np.full(h.shape, np.inf, np.float32)
    target = np.zeros(h.shape, np.float32)
    length = lambda l_: sum(np.hypot(q[0] - p_[0], q[1] - p_[1]) for p_, q in zip(l_[:-1], l_[1:]))
    for line in sorted(roads, key=length, reverse=True):
        pts = np.array(line, np.float64)
        if len(pts) < 2:
            continue
        seg = np.hypot(*(pts[1:] - pts[:-1]).T)
        s = np.concatenate([[0.0], np.cumsum(seg)])
        if s[-1] < 1:
            continue
        ss = np.linspace(0, s[-1], max(2, int(s[-1] / step) + 1))
        xs, zs = np.interp(ss, s, pts[:, 0]), np.interp(ss, s, pts[:, 1])
        gi, gj = (xs + HALF) / SPACING, (zs + HALF) / SPACING
        raw = nd.map_coordinates(h, [gj, gi], order=1, mode="nearest")
        ii = np.clip(np.round(gj).astype(int), 0, GRID - 1)
        jj = np.clip(np.round(gi).astype(int), 0, GRID - 1)
        pin = np.where(best[ii, jj] < ROAD_WIDTH / 2, target[ii, jj], np.nan)
        prof = road_profile(raw, ss[1] - ss[0], pin)
        if floor is not None:  # never below a lake it runs beside
            prof = np.maximum(prof, floor[ii, jj])
        for k in range(len(ss) - 1):
            ax, az, bx, bz = xs[k], zs[k], xs[k + 1], zs[k + 1]
            j0 = max(0, int((min(ax, bx) - reach + HALF) / SPACING))
            j1 = min(GRID - 1, int((max(ax, bx) + reach + HALF) / SPACING) + 1)
            i0 = max(0, int((min(az, bz) - reach + HALF) / SPACING))
            i1 = min(GRID - 1, int((max(az, bz) + reach + HALF) / SPACING) + 1)
            cx = np.arange(j0, j1 + 1) * SPACING - HALF
            cz = np.arange(i0, i1 + 1) * SPACING - HALF
            X, Z = np.meshgrid(cx, cz)
            vx, vz = bx - ax, bz - az
            t = np.clip(((X - ax) * vx + (Z - az) * vz) / max(vx * vx + vz * vz, 1e-9), 0, 1)
            d = np.hypot(X - (ax + t * vx), Z - (az + t * vz)).astype(np.float32)
            win = best[i0 : i1 + 1, j0 : j1 + 1]
            closer = d < win
            win[closer] = d[closer]
            target[i0 : i1 + 1, j0 : j1 + 1][closer] = (prof[k] + (prof[k + 1] - prof[k]) * t)[closer]
    near = best < reach
    edge = ROAD_WIDTH / 2 + ROAD_SHOULDER
    flat = np.maximum(0.0, best - edge) * ROAD_BANK
    if ditch is None:
        graded = np.clip(h, target - flat, target + flat)
    else:
        # The cut bank starts beyond the ditch; inside it the ground is dug out to its profile
        # (never down to the water: the bottom stays 0.5 m above the sea).
        cut_flat = np.maximum(0.0, best - edge - DITCH_WIDTH) * ROAD_BANK
        graded = np.clip(h, target - flat, target + np.where(ditch, cut_flat, flat))
        u = (best - edge) / DITCH_WIDTH
        dig = np.where(ditch & (u > 0) & (u < 1), DITCH_DEPTH * np.minimum(1.0, 1.6 * np.sin(np.pi * np.clip(u, 0, 1))), 0.0)
        floor_ = np.maximum(target - dig, np.minimum(target, 0.5))
        graded = np.where(dig > 0, np.minimum(graded, floor_), graded)
    keep = 1 - in_channel  # river channels keep their banks: roads cross on bridges
    out = h.copy()
    out[near] = (graded * keep + h * (1 - keep))[near]
    print("roads graded: max cut %.1f m, max fill %.1f m" % ((h - out).max(), (out - h).max()))
    return out


def prison_rim(a: np.ndarray) -> np.ndarray:
    """The prison knoll's top edge (m from the centre) at bearing `a`: 163-206 m (the wall's
    bastion tips are 132 m out). Pulled in on the east, where the country road passes 215 m
    out: the face and skirt come down to it there instead of its cutting leaving a 20 m step."""
    wobble = 9 * np.sin(3 * a + 0.7) + 5 * np.sin(5 * a + 2.1) + 3 * np.sin(11 * a + 0.3)
    return PRISON_KNOLL["rim"] + wobble - 30 * np.maximum(np.cos(a), 0) ** 4


def prison_knoll(h: np.ndarray, x: np.ndarray, z: np.ndarray, cx: float, cz: float, crag: np.ndarray) -> np.ndarray:
    """Blackwater Prison's knoll (PRISON_KNOLL): a level top, a rocky face, a skirt, the ramp."""
    k = PRISON_KNOLL
    top, cliff, face_k, skirt = k["top"], k["cliff"], k["face"], k["skirt"]
    dx, dz = x - cx, z - cz
    d = np.hypot(dx, dz)
    near = d < 700
    out = h.copy()
    dn, an, hn = d[near], np.arctan2(dz[near], dx[near]), h[near]
    s = np.maximum(dn - prison_rim(an), 0.0)
    band = cliff / face_k  # the face's width (m)
    face = top - np.where(s < band, s * face_k, cliff + (s - band) * skirt)
    # Broken ledges on the face (the crag noise, a metre or two): rock, not a smooth bank.
    face -= np.clip(crag[near], 0, 1) * 2.5 * smoothstep(0, 4, s) * (1 - smoothstep(band, band + 25, s))
    # Ground higher than the face's foot is lowered towards it within 90 m of the face.
    foot = top - cliff - 2.0
    lower = 1 - smoothstep(band, band + 90, s)
    ground = hn - np.maximum(hn - foot, 0) * lower
    hk = np.where(s <= 0, top, np.maximum(ground, face))
    # The south gate's ramp: from the top's edge down at `ramp` to the ground, with banks.
    pts = [(cx + px_, cz + pz_) for px_, pz_ in PRISON_ROAD]
    xn, zn = x[near], z[near]
    best, along = np.full(dn.shape, np.inf), np.zeros(dn.shape)
    run = 0.0
    for (ax, az), (bx, bz) in zip(pts[:-1], pts[1:]):
        vx, vz = bx - ax, bz - az
        L = np.hypot(vx, vz)
        t = np.clip(((xn - ax) * vx + (zn - az) * vz) / (L * L), 0, 1)
        dd = np.hypot(xn - (ax + t * vx), zn - (az + t * vz))
        closer = dd < best
        best[closer], along[closer] = dd[closer], run + t[closer] * L
        run += L
    # The ramp leaves the top where the road crosses the rim (it runs due south to there).
    edge = float(prison_rim(np.array(np.pi / 2))) - PRISON_ROAD[0][1]
    ramp = np.maximum(top - k["ramp"] * np.maximum(along - edge, 0), ground)
    ramp = np.minimum(ramp, top)
    bank = np.abs(ramp - hk) * 2.0 + 2.0
    w = 1 - smoothstep(6.0, 6.0 + bank, best)
    hk = hk * (1 - w) + ramp * w
    out[near] = hk
    return out


def smoothstep(e0: float, e1: float, v: np.ndarray) -> np.ndarray:
    t = np.clip((v - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# Iron Peaks summits (world x, z, extra height m, south reach m): the massif's tops, sharpened.
IRON_SUMMITS = [
    # (Raised 2026-11-11 with the massif, and two summits on the eastern spur.)
    (-539.0, -4496.0, 138.0, 370.0),  # the main summit (radio mast)
    (-578.0, -4082.0, 112.0, 330.0),
    (-195.0, -4156.0, 120.0, 330.0),
    (297.0, -4246.0, 105.0, 300.0),
    (-1371.0, -4637.0, 80.0, 300.0),  # the western shoulder
    (822.0, -3907.0, 95.0, 260.0),  # the eastern spur
    (520.0, -4420.0, 80.0, 240.0),
]


def iron_peaks(x: np.ndarray, z: np.ndarray, h: np.ndarray) -> np.ndarray:
    """Height added to Iron Peaks: pointed summits, steeper to the north, joined by saddles."""
    rng = np.random.default_rng(SEED + 202)
    add = np.zeros_like(h)
    box = (x > -2000) & (x < 1500) & (z < -3400)
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
    # The map's edge (edges audit 2026-11-09): the concept's land ran off the map on all four
    # sides (27 headlands, up to 17 m high at the edge), and the terrain stops at the edge, so
    # those were sheer walls with nothing beneath. The sea now runs round the whole map: land
    # ends 120-300 m inside the edge, on a wavy line, so the new shore reads as coast.
    along = np.where(np.abs(x) >= np.abs(z), z, x)  # position along the nearest edge
    margin = 210 + 55 * np.sin(along / 290.0 + 1.3) + 35 * np.sin(along / 117.0 + 0.4) + 15 * np.sin(along / 47.0)
    # Under Iron Peaks the massif stands close to the north edge: the sea comes in less far
    # there (100 m) so the mountain keeps its summits and still meets the water on a slope.
    ip_x = px_to_world(545, 95)[0]
    margin = margin * (1 - 0.55 * (1 - smoothstep(900.0, 1500.0, np.abs(x - ip_x))) * (z < -2500) * (np.abs(z) >= np.abs(x)))
    # Eastport's harbour (2026-11-11) stands on the concept's coast at the east edge: the sea
    # comes in only ~75 m there, so the town and its quay keep their waterfront.
    ep_z = px_to_world(1150, 425)[1]
    margin = margin * (1 - 0.64 * (1 - smoothstep(300.0, 520.0, np.abs(z - ep_z))) * (x > 3500) * (np.abs(x) >= np.abs(z)))
    edge_d = HALF - np.maximum(np.abs(x), np.abs(z))
    land &= edge_d > margin
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
    # (Relief audit 2026-11-09: stronger 520 m swells were tried and dropped: they put ridges on
    # the river bridges' banks. The relief comes from the hills in MOUNTAINS instead.)
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
    relief_rng = np.random.default_rng(MORE_RELIEF_SEED)
    for (cx, cy), rad_px, height, is_ridged in MORE_RELIEF:
        mx, mz = px_to_world(cx, cy)
        rad = rad_px / IMG_SIZE * WORLD
        d = np.hypot(x - mx, z - mz) / rad
        bump = np.exp(-(d**2) * 2.2)
        if is_ridged:
            bump *= 0.55 + 0.6 * ridged(GRID, relief_rng, rad * 0.9)
        # (Faded out at the coast: a hill meets the sea on a slope, as the beaches expect.)
        h += bump * height * smoothstep(0, 160, sea_dist)
    # Redstone Quarry's mountain (owner, 2026-11-08: "it should be like a mountain/sand hole"): a
    # broad, flat-topped massif about 75 m above the country, its outer slopes faded out at the
    # coast; the pit is sunk into its top (below), so the rim stands some 110 m up.
    qmx, qmz = px_to_world(1000, 195)
    qmr = 118 / IMG_SIZE * WORLD * 0.85
    # (Terrain audit 2026-11-09: 75 m over a flank twice as long, about 8 % on average, so the
    # country roads can climb it; at 115 m over 570 m they ran up 30-40 % slopes.)
    h += 75.0 * smoothstep(qmr * 2.3, qmr * 1.12, np.hypot(x - qmx, z - qmz)) * smoothstep(0, 250, sea_dist)
    # Crags on the high ground (owner, 2026-11-04: "a rockier look for Iron Peaks"): ridged
    # detail and broken ledges above ~100 m, from their own generator (the rest of the island's
    # randomness is unchanged).
    crng = np.random.default_rng(SEED + 101)
    crag = ridged(GRID, crng, 240.0)
    ledge = fractal(GRID, crng, [(70, 1.0), (28, 0.5)])
    # (Not on the quarry's massif: there they made a field of 10-20 m pimples that the roads ran
    # over; its rock is in the pit's benches and the rock faces placed on them.)
    off_quarry = smoothstep(qmr * 2.0, qmr * 2.6, np.hypot(x - qmx, z - qmz))
    h += smoothstep(90, 200, h) * (crag * 24.0 + np.abs(ledge) * 3.5) * off_quarry
    # Iron Peaks as a sniper mountain (owner, 2026-11-04 audit: "fun sniper mountains, good to run
    # up"): the old massif was one rounded dome whose 310-350 m tops sat among 250-300 m humps,
    # so the long views (300 m-1 km) were blocked. Each summit now rises as its own peak, sharp
    # and steep (partly cliffs) on the north, the sea side, and longer climbable slopes to the
    # south, toward the map; saddle ridges link the summits so the crest can be walked from perch
    # to perch. Its own generator: the rest of the island is unchanged.
    h += iron_peaks(x, z, h)
    # Rivers (owner, 2026-11-08: the river sides were broken): the valley eases the land down
    # to a low bank 1.8 m above the water, over 160 m on flat ground and up to ~380 m where the
    # land is high, then a rounded channel 3.4 m deep. (The old valley only lowered the land to
    # 45 % of its height plus 3 m, so the channel cut a 10-25 m vertical slot into it: rock walls
    # and a canal at the bottom.) The centreline meanders (river_line).
    river_dist = np.full(x.shape, np.inf, np.float32)
    # Within a channel (plus 20 m of bank) roads do not fill the river: they cross on bridges.
    in_channel = np.zeros(x.shape, np.float32)
    river_bank = np.zeros(x.shape, np.float32)
    wet_mask = np.zeros(x.shape, bool)
    core_mask = np.zeros(x.shape, bool)
    BANK = 1.8
    for r in RIVERS:
        pts = river_line(r)
        d = polyline_distance(x, z, pts)
        edge = r["width"] * 0.62
        spread = 160.0 + np.clip(h - BANK, 0.0, 200.0) * 1.1
        t = np.clip((d - edge) / spread, 0.0, 1.0)
        valley = t * t * (3 - 2 * t)
        h = np.where(d < edge + spread, BANK + (h - BANK) * valley, h)
        # The channel: a smooth U from the bank to 3.4 m under the water at the middle.
        u = np.clip(d / edge, 0.0, 1.0)
        bed = -3.4 + (BANK + 3.4) * (u * u * (3 - 2 * u)) ** 1.5
        h = np.where(d < edge, np.minimum(h, bed), h)
        river_dist = np.minimum(river_dist, d)
        in_channel = np.maximum(in_channel, 1 - smoothstep(r["width"] * 0.62, r["width"] * 0.62 + 20, d))
        # Pads give way over 90 m (a town's level ground meets the river on a slope, not a wall).
        river_bank = np.maximum(river_bank, 1 - smoothstep(r["width"] * 0.62, r["width"] * 0.62 + 90, d))
        wet_mask |= d < r["width"] * 0.62 + 2
        core_mask |= d < r["width"] * 0.4
    # Lakes from the concept: basins with their own water level.
    # Smoothed outline: the concept's pixels made stepped shores (a gaussian of ~12 m before the
    # threshold rounds them).
    lakes = nd.gaussian_filter(resample(lakes_img, GRID), 3.0) > 0.5
    lakes_concept = lakes.copy()
    # The water meets the Old Dam's wall (owner, 2026-11-11: "check the water at the dam so the
    # bridge has water like in the image"). The concept's lakes stop short of the wall (the dam's
    # grey concrete and its shadow cover the water next to it), so both lakes ended 30-60 m out
    # and the wall stood in a dry strip. From the wall's face, along each perpendicular to it,
    # the strip up to the lake on that side becomes part of that lake: the reservoir against the
    # whole upstream face; below the wall the lower lake against the outer thirds, the middle
    # third staying the powerhouse yard (layout.ts damUpgrade). Only across the valley: a ray
    # whose ground rises more than POOL_RISE over its lake's water is a hillside, left dry (below
    # the wall, POOL_RISE_LOW: the tailwater basin is dug out of the valley floor at the toe).
    POOL_REACH, POOL_RISE, POOL_RISE_LOW, YARD_DEPTH = 300.0, 14.0, 40.0, 56.0
    pre_lab, _ = nd.label(lakes_concept)
    pre_level = {}
    for d_ in DAMS:
        (dax, daz), (dbx, dbz) = px_to_world(*d_["a"]), px_to_world(*d_["b"])
        dlen = float(np.hypot(dbx - dax, dbz - daz))
        ux_, uz_ = (dbx - dax) / dlen, (dbz - daz) / dlen
        nx_, nz_ = -uz_, ux_
        lx_, lz_ = px_to_world(*d_["low"])
        low_sign = 1.0 if (lx_ - dax) * nx_ + (lz_ - daz) * nz_ > 0 else -1.0
        # (One sheet per side, each kept to its own side of the wall: closed together, the two
        # met under the wall and the two lakes became one, at one level.)
        pools = {1.0: np.zeros(lakes.shape, bool), -1.0: np.zeros(lakes.shape, bool)}

        def cell(wx, wz):
            gi, gj = world_to_grid(wx, wz)
            return int(round(np.clip(gj, 0, GRID - 1))), int(round(np.clip(gi, 0, GRID - 1)))

        filled_rays = 0
        why = {"far+": 0, "rise+": 0, "far-": 0, "rise-": 0, "ok+": 0, "ok-": 0}
        for t_ in np.arange(dlen * 0.1, dlen * 0.9, SPACING * 0.5):
            for sgn in (1.0, -1.0):
                # (Below the wall's middle third the powerhouse yard comes first: the water starts
                # at its outer edge, YARD_DEPTH m out.)
                start = YARD_DEPTH if sgn == low_sign and dlen * 0.33 < t_ < dlen * 0.67 else d_["width"] / 2 - 1.5
                ray = []
                hit = 0
                for s_ in np.arange(start, POOL_REACH, SPACING * 0.5):
                    c_ = cell(dax + ux_ * t_ + nx_ * s_ * sgn, daz + uz_ * t_ + nz_ * s_ * sgn)
                    if lakes_concept[c_]:
                        hit = int(pre_lab[c_])
                        break
                    ray.append(c_)
                if not hit or not ray:
                    why["far" + ("-" if sgn == low_sign else "+")] += 1
                    continue
                if hit not in pre_level:
                    m_ = pre_lab == hit
                    ring_ = nd.binary_dilation(m_, iterations=6) & ~m_
                    pre_level[hit] = float(np.percentile(h[ring_], 20)) - 1.2
                if max(h[c_] for c_ in ray) > pre_level[hit] + (POOL_RISE_LOW if sgn == low_sign else POOL_RISE):
                    why["rise" + ("-" if sgn == low_sign else "+")] += 1
                    continue
                for c_ in ray:
                    pools[sgn][c_] = True
                filled_rays += 1
                why["ok" + ("-" if sgn == low_sign else "+")] += 1
        # Close the rays into one sheet of water and keep it within reach of the wall.
        across_ = ((x - dax) * nx_ + (z - daz) * nz_)
        pool = np.zeros(lakes.shape, bool)
        for sgn, p_ in pools.items():
            pool |= nd.binary_closing(p_, iterations=3) & (across_ * sgn > d_["width"] / 2 - 2.5)
        pool &= ~lakes_concept
        band = polyline_distance(x, z, [(dax, daz), (dbx, dbz)]) < POOL_REACH
        pool &= band
        print("dam %s: water to the wall on %d rays (%s), %.1f ha" % (d_["id"], filled_rays, why, pool.sum() * SPACING * SPACING / 10_000))
        lakes |= pool
    # (Not at a dam's abutments: the crest's ends stand on the ground there, 2026-11-11; the lake
    # carving eases in from 25 to 85 m out.)
    abut_free = np.ones(lakes.shape, np.float32)
    for d_ in DAMS:
        for end in (d_["a"], d_["b"]):
            ex, ez = px_to_world(*end)
            abut_free = np.minimum(abut_free, smoothstep(25.0, 85.0, np.hypot(x - ex, z - ez)))
    lake_lab, lake_n = nd.label(lakes)
    water_bodies = []
    for i in range(1, lake_n + 1):
        m = lake_lab == i
        if m.sum() < 400:
            continue
        ring = nd.binary_dilation(m, iterations=6) & ~m
        level = float(np.percentile(h[ring], 20)) - 1.2
        # A lake a river runs into or through is part of the river: the river's water level
        # (the sea's), not a pond held metres above it behind a sliver of bank.
        for d_ in DAMS:
            for (lpx, lpy), lv in d_.get("levels", []):
                gi_, gj_ = world_to_grid(*px_to_world(lpx, lpy))
                if m[int(round(gj_)), int(round(gi_))]:
                    level = lv
        merged = bool((nd.binary_dilation(m, iterations=8) & wet_mask).any())
        if merged:
            level = 0.0
        # One continuous profile across the shore (owner, 2026-11-08: the banks were broken): a
        # signed distance to the outline, smoothed so the grid's stair-steps vanish, gives the
        # bed (deepening 6 % to 6 m) and the shore (rising 15 % to a lip, then easing into the
        # land over 60 m, further where the land is high). The old cut dropped a whole metre or
        # two from one cell to the next along the outline: saw-teeth all round every lake.
        inside = nd.distance_transform_edt(m) * SPACING
        near = nd.distance_transform_edt(~m) * SPACING
        sd = nd.gaussian_filter(near - inside, 1.5)  # m, negative in the water
        lip = 1.2 if merged else 0.4
        bed = level - np.minimum(6.0, 0.25 + np.maximum(-sd, 0.0) * 0.06)
        rim = level + np.minimum(lip, np.maximum(sd, 0.0) * 0.15)
        spread = 60.0 + np.clip(h - level - lip, 0.0, 150.0) * 1.6
        t = np.clip((sd - lip / 0.15) / spread, 0.0, 1.0)
        blend = t * t * (3 - 2 * t)
        profile = np.where(sd < 0, bed, rim * (1 - blend) + h * blend)
        # It only ever lowers the ground (so it never fills a river channel beside the lake).
        zone = sd < spread + lip / 0.15
        h = np.where(zone, h - (h - np.minimum(h, profile)) * abut_free, h)
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
    # The benches fill the outer 55 % of the radius (a deep hole with steep, rock-faced walls);
    # the inner 45 % is the flat floor. pit: 0 at the rim, 1 where the floor begins.
    WALL, BENCHES = 0.55, 6
    pit = np.clip((1 - qd / q_rad) / WALL, 0, 1)
    # Bench lines wander a little per bench as well.
    bench = pit * BENCHES + 0.18 * np.sin(4 * q_ang + 3 * np.floor(pit * BENCHES))
    terraces = np.floor(bench) / BENCHES
    # Bench faces: 15 % of each bench's width, about 60° (the rock faces). Scree (owner,
    # 2026-11-11: "players can't leave the hole"): in staggered sectors of every bench, about a
    # quarter of the way round, the face is a slope of broken rock at half its height per metre
    # (27°) instead: a player can climb out bench by bench almost anywhere round the pit.
    bench_k = np.floor(bench)
    scree = smoothstep(0.55, 0.8, np.cos(7 * q_ang + bench_k * 1.9 + 0.6))
    face = 0.15 + 0.5 * scree
    terraces = terraces + (bench - bench_k).clip(0, None).clip(0, face) / face / BENCHES
    terraces = np.clip(terraces, 0, 1)
    # Haul roads: two ramps spiralling 1.25 turns from the rim to the floor at an even grade,
    # interleaved half a turn apart so they never cross: the north-east one from the plant, the
    # south-west one from the works yard (two ways down, not one choke). Inside their bands the
    # benches give way to the ramps.
    turns, ramp_w = 1.25, 16.0
    entries = [np.arctan2(-0.6, 0.8), np.arctan2(-0.6, 0.8) + np.pi]  # rim entry angles
    ramp_level = np.full_like(pit, np.inf)
    for phi0 in entries:
        rel = np.mod(phi0 - q_ang, 2 * np.pi)  # angle travelled clockwise from the entry
        for k in range(2):
            t = (rel + 2 * np.pi * k) / (2 * np.pi * turns)  # 0 at the rim, 1 at the floor
            ok = t <= 1
            r_centre = q_rad * (1 - WALL * 0.98 * t)
            near = ok & (np.abs(qd - r_centre) < ramp_w)
            ramp_level = np.where(near, np.minimum(ramp_level, np.clip(t, 0, 1)), ramp_level)
    on_ramp = np.isfinite(ramp_level) & (qd < q_rad)
    terraces = np.where(on_ramp, ramp_level, terraces)
    # Access ramps (owner, 2026-11-11: "players can somehow leave the hole from more ways"): six
    # straight cuts from the floor to the rim between the haul roads, 12 m wide at an even grade
    # (the wall's 140 m over its ~440 m width: about 32 %), easing into the benches either side.
    for k in range(6):
        a0 = entries[0] + (k + 0.5) * np.pi / 3
        lateral = np.abs(np.sin(q_ang - a0)) * qd * q_rad / np.maximum(qd, 1e-3)
        lateral = np.where(np.cos(q_ang - a0) > 0, lateral, np.inf)
        w_ramp = 1 - smoothstep(6.0, 14.0, lateral)
        terraces = np.where(qd < q_rad, terraces * (1 - w_ramp) + np.clip(pit, 0, 1) * w_ramp, terraces)
    haul_roads = []
    for phi0 in entries:
        line = []
        for t in np.linspace(0, 1, 60):
            a = phi0 - t * 2 * np.pi * turns
            rr = q_rad * (1 - WALL * 0.98 * t)
            w = 1 + 0.1 * np.sin(2 * a + 1.1) + 0.06 * np.sin(3 * a + 2.3) + 0.035 * np.sin(5 * a + 0.4)
            line.append((qx + np.cos(a) * rr * w, qz + np.sin(a) * rr * w))
        haul_roads.append(line)
    # Benches step down from one rim level (the ground along the pit's edge) to a flat floor at
    # most 140 m lower, never below 12 m (the pit stays dry above the sea).
    ring = (qd > q_rad * 0.97) & (qd < q_rad * 1.03)
    rim_level = float(np.median(rim[ring]))
    floor = max(12.0, rim_level - 140.0)
    pit_surface = rim_level - (rim_level - floor) * np.clip(terraces, 0, 1)
    blend = smoothstep(q_rad * 1.05, q_rad * 0.9, qd)
    h = np.where(qd < q_rad * 1.05, np.minimum(rim, pit_surface * blend + rim * (1 - blend)), h)
    # Spoil heaps on the floor (owner, 2026-11-11: the pit floor was 700 m of flat dead space):
    # tipped mounds of overburden 8-16 m high, cover and high ground, left clear of the hall in
    # the middle and of where the haul roads and ramps arrive.
    # Each is a ridge (tipped from one end), its long axis across the radius, with a rough crest.
    spoil_rng = np.random.default_rng(SEED + 211)
    spoil_noise = fractal(GRID, spoil_rng, [(18, 1.0), (7, 0.4)])
    for ang, rr, height, length, width in ((0.3, 0.55, 14.0, 130.0, 45.0), (1.4, 0.72, 10.0, 100.0, 38.0), (2.5, 0.5, 16.0, 150.0, 50.0), (3.6, 0.74, 9.0, 90.0, 34.0), (4.6, 0.58, 12.0, 120.0, 42.0), (5.6, 0.76, 8.0, 80.0, 30.0)):
        mx_ = qx + np.cos(ang) * q_rad * (1 - WALL) * rr
        mz_ = qz + np.sin(ang) * q_rad * (1 - WALL) * rr
        ux_, uz_ = -np.sin(ang), np.cos(ang)  # across the radius
        along_s = ((x - mx_) * ux_ + (z - mz_) * uz_) / (length / 2)
        across_s = ((x - mx_) * -uz_ + (z - mz_) * ux_) / (width / 2)
        mound = np.clip(1 - along_s ** 2, 0, 1) * np.exp(-(across_s ** 2) * 2.2)
        h = h + np.where(qd < q_rad * (1 - WALL), height * mound * (1 + 0.25 * spoil_noise), 0.0)
    quarry = qd < q_rad

    def quarry_depth(px_, pz_):
        """How far inside the pit's (wobbly) rim a point is (m; negative outside)."""
        a_ = np.arctan2(pz_ - qz, px_ - qx)
        w_ = 1 + 0.1 * np.sin(2 * a_ + 1.1) + 0.06 * np.sin(3 * a_ + 2.3) + 0.035 * np.sin(5 * a_ + 0.4)
        return q_rad * 1.06 - np.hypot(px_ - qx, pz_ - qz) / w_

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
    # A crossing whose end lands in other water (Riverwood's channel runs beside a sea inlet
    # with only a sliver of land between) carries on over it to dry land: before, the bridge was
    # refused ("ends wet") and the road stopped at the channel (owner, 2026-11-09).
    def water_at(px_, pz_):
        gi, gj = world_to_grid(px_, pz_)
        i_, j_ = int(round(np.clip(gj, 0, GRID - 1))), int(round(np.clip(gi, 0, GRID - 1)))
        return bool(wet_mask[i_, j_] or lakes[i_, j_] or not land[i_, j_])
    for span in WORLD_CROSSINGS:
        crossings.append(span)
    # A "crossing" that runs along the channel is a traced road following the bank into the
    # water, not a crossing: its road is cut out of the channel like any other, but no bridge is
    # built and its ends are not kept as bridge heads (connect_roads joins or prunes them).
    river_lines = [river_line(r) for r in RIVERS]
    along = [span for span in crossings if not crosses_river(span, river_lines)]
    crossings = [extend_span(span, water_at) for span in crossings if span not in along]
    roads = cut_crossings(roads, crossings + along)
    fixed_spans = [(px_to_world(*b["a"]), px_to_world(*b["b"])) for b in BRIDGES + DAMS]
    roads += bridge_connectors(roads, crossings + fixed_spans, wet_at)
    # Only the haul roads go down into the quarry: the traced roads stop at its rim (they ran
    # straight down the bench faces). Before the network is joined up, so a stub left at the rim
    # is treated like any other dead end.
    roads = trim_roads(roads, lambda px_, pz_: quarry_depth(px_, pz_) > 0)
    def h_at(px_, pz_):
        gi, gj = world_to_grid(px_, pz_)
        return float(nd.map_coordinates(h, [[np.clip(gj, 0, GRID - 1)], [np.clip(gi, 0, GRID - 1)]], order=1)[0])
    poi_keep = [(*px_to_world(*p["px"]), (p["pad"] / 2 + 60) if p["pad"] else 250.0) for p in POIS]
    span_ends = [e for s_ in crossings + fixed_spans for e in s_]
    def keep_at(px_, pz_):
        """A road end that arrives somewhere: a POI, the coast, a bridge."""
        if any(np.hypot(px_ - cx, pz_ - cz) < r for cx, cz, r in poi_keep):
            return True
        if any(np.hypot(px_ - ex, pz_ - ez) < 60 for ex, ez in span_ends):
            return True
        gi, gj = world_to_grid(px_, pz_)
        return bool(sea_dist[int(round(np.clip(gj, 0, GRID - 1))), int(round(np.clip(gi, 0, GRID - 1)))] < 60)
    roads, road_ends = connect_roads(roads, wet_at, h_at, keep_at, crossings + fixed_spans)
    # Blackwater Prison's road up to its south gate (no road reached either gate before). Added
    # after the network is joined up (its end in the yard is not a loose end to join), ending
    # on the nearest point of the road south of the prison.
    pcx, pcz = px_to_world(*next(p["px"] for p in POIS if p["id"] == "blackwater-prison"))
    prison_road = [(pcx + px_, pcz + pz_) for px_, pz_ in PRISON_ROAD]
    ex, ez = prison_road[-1]
    join = min((pt for line in roads for pt in line), key=lambda pt: np.hypot(pt[0] - ex, pt[1] - ez))
    assert np.hypot(join[0] - ex, join[1] - ez) < 40, "the prison road's junction moved"
    roads.append(prison_road[:-1] + [tuple(join)])
    site_reach = [(*px_to_world(*p["px"]), (p["pad"] / 2 + 120) if p["pad"] else p["radius"] / IMG_SIZE * WORLD) for p in POIS]

    def protect(px_, pz_):
        """A road end that arrives somewhere a player goes: a POI, a bridge (not just the coast)."""
        if any(np.hypot(px_ - cx, pz_ - cz) < r for cx, cz, r in site_reach):
            return True
        return any(np.hypot(px_ - ex, pz_ - ez) < 60 for ex, ez in span_ends)

    town_rects = [(t["xs"][0] - 60, t["xs"][-1] + 60, t["zs"][0] - 60, t["zs"][-1] + 60) for t in towns.values()]
    sx_, sz_ = px_to_world(*next(p["px"] for p in POIS if p["id"] == "island-superstore"))
    town_rects.append((sx_ + SUPERSTORE_RING[0] - 60, sx_ + SUPERSTORE_RING[1] + 60, sz_ + SUPERSTORE_RING[2] - 60, sz_ + SUPERSTORE_RING[3] + 60))
    site_discs = [(*px_to_world(*p["px"]), p["pad"] / 2 + 40) for p in POIS if p["pad"]]

    def in_zone(px_, pz_):
        """Inside a town's street grid, the Superstore's ring or a site's pad: roads there are laid
        out on purpose (blocks, yards), not traced."""
        if any(x0_ <= px_ <= x1_ and z0_ <= pz_ <= z1_ for x0_, x1_, z0_, z1_ in town_rects):
            return True
        return any(np.hypot(px_ - cx, pz_ - cz) < r for cx, cz, r in site_discs)

    # Sites a road must reach: (name, entrance point, reach of a road already serving it).
    access = []
    for p in POIS:
        cx, cz = px_to_world(*p["px"])
        if p["id"] == "murder-cabins":
            (ox, oz), _r = CAMP_CLEARING
            access.append((p["id"], (cx + ox, cz + oz + 40.0), 120.0))
        elif p["pad"]:
            access.append((p["id"], (cx, cz), p["pad"] / 2 + 150.0))
        elif p["kind"] != "mountain":
            access.append((p["id"], (cx, cz), p["radius"] / IMG_SIZE * WORLD * 0.9))
    roads = finish_network(roads, water_at, h_at, crossings + fixed_spans, protect, in_zone, access, h, wet_mask | lakes | ~land, town_rects, site_discs)
    roads = strait_roads(roads, water_at)
    # No road through a dam's wall (owner, 2026-11-10: "rocks at the dam that the user can enter
    # and look broken"). The joined-up network ran along the Old Dam's axis on the valley floor
    # and crossed it twice, inside the wall; grading those roads then cut trenches into the
    # ground beside it. A road stops where the wall stands more than 2.5 m above the ground
    # (the crest carries the road across); at the abutments, where crest and ground meet, the
    # roads still run on to it.
    def in_dam_wall(px_, pz_):
        for d_ in DAMS:
            (ax_, az_), (bx_, bz_) = px_to_world(*d_["a"]), px_to_world(*d_["b"])
            vx_, vz_ = bx_ - ax_, bz_ - az_
            len_ = float(np.hypot(vx_, vz_))
            t_ = ((px_ - ax_) * vx_ + (pz_ - az_) * vz_) / (len_ * len_)
            if not 0.0 < t_ < 1.0:
                continue
            qx_, qz_ = ax_ + vx_ * t_, az_ + vz_ * t_
            if np.hypot(px_ - qx_, pz_ - qz_) > d_["width"] / 2 + 26.0:
                continue
            ha_, hb_ = h_at(ax_, az_), h_at(bx_, bz_)
            crest = ha_ + (hb_ - ha_) * t_ + max(0.0, d_["deck"] - (ha_ + hb_) / 2) * np.sin(np.pi * t_)
            if crest - h_at(qx_, qz_) > 2.5:
                return True
        return False
    n_before = len(roads)
    roads = trim_roads(roads, in_dam_wall)
    print("dam: %d roads before, %d after keeping them out of the wall" % (n_before, len(roads)))
    # The finish pass rebuilds the roads (their ends move to the junctions' centres), so the
    # country dead ends are taken afresh: an end more than 12 m from any other road that
    # arrives nowhere (a site, a bridge, the coast). Each gets a farm, a cabin or a camp.
    seg_a = np.array([a_ for line in roads for a_ in line[:-1]])
    seg_b = np.array([b_ for line in roads for b_ in line[1:]])
    seg_own = np.concatenate([[i_] * (len(line) - 1) for i_, line in enumerate(roads)])
    span_heads = [e_ for s_ in crossings + fixed_spans for e_ in s_]
    road_ends = []
    for i_, line in enumerate(roads):
        for e_, q_ in ((line[0], line[1]), (line[-1], line[-2])):
            e_ = np.array(e_)
            v_ = seg_b - seg_a
            t_ = np.clip(((e_ - seg_a) * v_).sum(1) / np.maximum((v_ * v_).sum(1), 1e-9), 0, 1)
            d_ = np.hypot(*(seg_a + v_ * t_[:, None] - e_).T)
            d_[seg_own == i_] = np.inf
            if d_.min() <= 12 or any(np.hypot(e_[0] - cx_, e_[1] - cz_) < r_ for cx_, cz_, r_ in poi_keep):
                continue
            if any(np.hypot(e_[0] - hx, e_[1] - hz) < 60 for hx, hz in span_heads):
                continue
            if h_at(*e_) < 6:
                continue
            # (A road that stops at a dam's wall ends at the dam, not in the country.)
            if any(_point_segment(e_, px_to_world(*dm_["a"]), px_to_world(*dm_["b"])) < 60 for dm_ in DAMS):
                continue
            u_ = e_ - np.array(q_)
            u_ /= np.hypot(*u_) or 1.0
            road_ends.append((round(float(e_[0]), 1), round(float(e_[1]), 1), round(float(u_[0]), 3), round(float(u_[1]), 3)))
    print("roads: %d country dead ends (farms, cabins and camps go at them)" % len(road_ends))
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
            # (A harbour town stands a few metres over its quay, not on the hill behind it.)
            target = TOWNS[p["id"]].get("height", target)
            # (River channels and their banks stay as carved: a pad never fills a river.)
            # (Riverwood blends over 120 m, so the hills around it come up to the town's edge.)
            w = (1 - smoothstep(0, TOWNS[p["id"]].get("blend", 220), d)) * (1 - river_bank)
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
            w = (1 - smoothstep(0, 200, np.hypot(dx, dz))) * (1 - river_bank)
            h = h * (1 - w) + target * w
            p["height"] = round(target, 2)
            continue
        if p["id"] == "blackwater-prison":
            h = prison_knoll(h, x, z, cx, cz, crag)
            p["height"] = PRISON_KNOLL["top"]
            continue
        d = np.hypot(x - cx, z - cz)
        r = p["pad"] / 2
        gi, gj = world_to_grid(cx, cz)
        target = float(smooth[int(gj), int(gi)])
        w = (1 - smoothstep(r * 0.85, r * 1.4, d)) * (1 - river_bank)
        h = h * (1 - w) + target * w
        p["height"] = round(target, 2)
    # Murder Cabins' summer camp (layout.ts summerCamp): a level clearing on the lake's south
    # shore, so its cabins, tents and range stand on the flat (the shore slopes 7-10 %).
    mcx, mcz = px_to_world(*next(p["px"] for p in POIS if p["id"] == "murder-cabins"))
    (ccx, ccz), crad = CAMP_CLEARING
    ccx, ccz = mcx + ccx, mcz + ccz
    gi, gj = world_to_grid(ccx, ccz)
    target = float(smooth[int(gj), int(gi)])
    w = 1 - smoothstep(crad * 0.8, crad * 1.6, np.hypot(x - ccx, z - ccz))
    h = h * (1 - w) + target * w
    for (ecx, ecz), erad in ESTATE_SITES:
        gi, gj = world_to_grid(ecx, ecz)
        target = float(smooth[int(gj), int(gi)])
        w = 1 - smoothstep(erad * 0.9, erad * 1.6, np.hypot(x - ecx, z - ecz))
        h = h * (1 - w) + target * w
    # Harbour quays: level ground at the water's edge (never raising the sea floor).
    for hx0, hx1, hz0, hz1, hh in HARBORS:
        dx = np.maximum(np.maximum(hx0 - x, x - hx1), 0)
        dz = np.maximum(np.maximum(hz0 - z, z - hz1), 0)
        w = (1 - smoothstep(0, 45, np.hypot(dx, dz))) * (h > -0.5)
        h = h * (1 - w) + hh * w
    # The hills and Iron Peaks' northern faces ran off the map's north edge; with the sea now
    # round the map, they come down to it no steeper than 1.4:1 from the new shore: a rocky sea
    # cliff, not a 400 m wall into the sea (edges audit 2026-11-09; steeper would break the
    # terrain LOD's range rule). Before the summit perches are found.
    h = np.where(land, np.minimum(h, 0.8 + np.maximum(edge_d - margin, 0.0) * 1.4), h)
    # Iron Peaks sniper perches (spec §3): the highest summits of the massif, at least 300 m
    # apart, get a small flat top (radius 9 m, blended out to 34 m) so a tower or a sandbag nest
    # can stand there. The layout places on these points (world.v1.json `perches`).
    ix, iz = px_to_world(545, 95)
    near = (np.hypot(x - ix, z - iz) < 1100) & (h > 120) & land
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
    # The floor rises gently away from rivers and lakes (4 % from 1 m at the water's edge),
    # instead of switching on at a fixed distance: that switch drew a stepped 2-3 m ledge along
    # every bank, cell by cell (owner, 2026-11-08: "the river sides are broken").
    water_cells = wet_mask | lakes
    water_dist = nd.distance_transform_edt(~water_cells) * SPACING
    dry_floor = np.minimum(1.2 + 3.0 * smoothstep(0, 220, sea_dist), 1.0 + water_dist * 0.04)
    h = np.where(land & ~water_cells & ~quarry, np.maximum(h, dry_floor), h)
    # Coast: beaches, then the sea floor.
    sea_floor = -6.0 - 30.0 * (1 - np.exp(-(nd.distance_transform_edt(~land) * SPACING) / 600.0))
    beach = smoothstep(0, 70, sea_dist)
    # (Not across a river's channel or a lake: a river reaches the sea through its mouth instead
    # of ending at a sand bar with a step into the sea floor.)
    h = np.where(land & ~wet_mask, h * beach + 0.8 * (1 - beach), np.where(land, h, sea_floor))
    # Lake banks (2026-11-09 audit): ground outside a lake lower than its surface (a valley the
    # outline cuts across, as south of the lake by Murder Cabins) would show the water ending in
    # mid-air over it. (After the beaches since the edges audit: the beach blend flattened the
    # banks of the lakes near the coast back below their water.) The bank rises to just above the water (3 % further out) and eases back
    # into the country over 20-90 m; ground already higher is left alone. (Not by the Old Dam:
    # its wall holds the reservoir back, the valley below it stays open.)
    dam_d = np.min([polyline_distance(x, z, [px_to_world(*d_["a"]), px_to_world(*d_["b"])]) for d_ in DAMS], axis=0)
    off_dam = smoothstep(150.0, 260.0, dam_d)
    for wb in water_bodies:
        bx0, bz0, bx1, bz1 = wb["bounds"]
        box_ = (x >= bx0 - 120) & (x <= bx1 + 120) & (z >= bz0 - 120) & (z <= bz1 + 120)
        body = lakes & (x >= bx0 - 5) & (x <= bx1 + 5) & (z >= bz0 - 5) & (z <= bz1 + 5)
        dist = nd.distance_transform_edt(~body) * SPACING
        bank = wb["level"] + 0.3 + dist * 0.03
        # (Easing down to the beach within 40 m of the sea, not a wall into it.)
        w = (1 - smoothstep(20.0, 90.0, dist)) * box_ * ~body * land * off_dam * smoothstep(0.0, 40.0, sea_dist)
        raised = np.where(h < bank, h * (1 - w) + bank * w, h)
        if (raised - h).max() > 0.05:
            print("lake bank: %s raised up to %.1f m" % (wb["id"], (raised - h).max()))
        h = raised
    # A dam's reservoir side (owner, 2026-11-10: "rocks at the dam that the user can enter"):
    # between the Old Dam's wall and its reservoir the valley floor lay up to 19 m below the
    # water, a dry pit against the wall that the lakeside road crossed on a rock-sided
    # causeway. The ground there now stands at the reservoir's bank, level up to the wall.
    for d_ in DAMS:
        (dax, daz), (dbx, dbz) = px_to_world(*d_["a"]), px_to_world(*d_["b"])
        dvx, dvz = dbx - dax, dbz - daz
        dlen = float(np.hypot(dvx, dvz))
        dmx, dmz = (dax + dbx) / 2, (daz + dbz) / 2
        near_ = [wb for wb in water_bodies if wb["bounds"][0] - 400 < dmx < wb["bounds"][2] + 400 and wb["bounds"][1] - 400 < dmz < wb["bounds"][3] + 400]
        if not near_:
            continue
        res = max(near_, key=lambda wb: wb["level"])
        rcx, rcz = (res["bounds"][0] + res["bounds"][2]) / 2, (res["bounds"][1] + res["bounds"][3]) / 2
        up = np.sign((rcx - dax) * -dvz + (rcz - daz) * dvx) or 1.0
        side_ = ((x - dax) * -dvz + (z - daz) * dvx) / dlen * up
        along_ = ((x - dax) * dvx + (z - daz) * dvz) / dlen
        w_ = (side_ > 0) * (1 - smoothstep(90.0, 130.0, side_)) * smoothstep(-20.0, 20.0, along_) * (1 - smoothstep(dlen - 20.0, dlen + 20.0, along_)) * land * ~lakes
        bench = res["level"] + 0.3
        filled = np.where(h < bench, h * (1 - w_) + bench * w_, h)
        print("dam %s: reservoir side filled up to %.1f m" % (d_["id"], (filled - h).max()))
        h = filled
        # The powerhouse yard below the wall (2026-11-11 upgrade): a level bench at the toe of
        # the downstream face, along its middle third, for the powerhouse, the switchyard and the
        # tailrace basin; it eases back into the valley over 40 m.
        down_ = -side_
        # (12-56 m out since 2026-11-11: the tailwater comes up to its outer edge.)
        yard = (down_ > 12) & (down_ < YARD_DEPTH) & (along_ > dlen * 0.33) & (along_ < dlen * 0.67) & land & ~lakes
        if yard.any():
            level_ = float(np.median(h[yard]))
            d_yard = np.hypot(np.maximum(np.maximum(12 - down_, down_ - YARD_DEPTH), 0), np.maximum(np.maximum(dlen * 0.33 - along_, along_ - dlen * 0.67), 0))
            w_yard = (1 - smoothstep(0.0, 40.0, d_yard)) * (down_ > 0) * land * ~lakes
            h = h * (1 - w_yard) + level_ * w_yard
            print("dam %s: powerhouse yard at %.1f m" % (d_["id"], level_))
    # Grade the roads (terrain audit 2026-11-09): over the hills and the quarry's massif the
    # roads followed the ground up 30-110 % slopes. Each road now has its own smoothed,
    # grade-limited profile, cut into or built up from the ground, with banks. Late: the pads
    # level the towns first, and the smoothing and the beaches above would soften or step the
    # cuttings. Three passes: where roads meet, each pass starts from the ground the others
    # were graded to, so the joins converge instead of leaving a step. Never below dry ground.
    # Ditches only on country roads: not in a town's grid or the Superstore's ring, on a site's
    # pad, by a bridge or a dam (the abutments), or at the water.
    ditch = land & ~nd.binary_dilation(water_cells, iterations=12)  # (not within ~45 m of water)
    for x0_, x1_, z0_, z1_ in town_rects:
        ditch &= ~((x >= x0_) & (x <= x1_) & (z >= z0_) & (z <= z1_))
    for cx_, cz_, r_ in site_discs:
        ditch &= np.hypot(x - cx_, z - cz_) > r_ + 20
    for a_, b_ in crossings + fixed_spans:
        ditch &= polyline_distance(x, z, [a_, b_]) > 40
    h_pre = h.copy()
    # Roads by a lake stay above its water (within ~45 m of it): a cutting through a raised
    # bank left the lake's surface 12 m above the road beside it.
    road_floor = np.full(h.shape, -1e3, np.float32)
    for wb in water_bodies:
        bx0, bz0, bx1, bz1 = wb["bounds"]
        body = lakes & (x >= bx0 - 5) & (x <= bx1 + 5) & (z >= bz0 - 5) & (z <= bz1 + 5)
        road_floor[nd.binary_dilation(body, iterations=12)] = np.maximum(road_floor[nd.binary_dilation(body, iterations=12)], wb["level"] + 0.6)
    for pass_ in range(3):
        h = grade_roads(h, roads, in_channel, ditch if pass_ == 2 else None, road_floor)
    # A road's cutting never lowers a lake's shore below the water: within ~30 m of a lake the
    # ground the grading took below the lake's level goes back to just above it (else the lake
    # stood above a road cut beside it, its surface ending in mid-air).
    for wb in water_bodies:
        bx0, bz0, bx1, bz1 = wb["bounds"]
        body = lakes & (x >= bx0 - 5) & (x <= bx1 + 5) & (z >= bz0 - 5) & (z <= bz1 + 5)
        shore = nd.binary_dilation(body, iterations=8) & ~body
        lv = wb["level"] + 0.3
        h = np.where(shore & (h < lv) & (h_pre >= lv), lv, h)
    h = np.where(land & ~water_cells & ~quarry, np.maximum(h, dry_floor), h)
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
    for haul_road in haul_roads:
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
    # Concept water that is dry ground on the final terrain (a lake's rim, a river's old line):
    # grass (the shore strip below) rather than the water class's mud.
    cover[land_c & (cover == WATER)] = GRASS
    # Inland lakes are water up to their own level (2026-11-09 audit: since the 11-08 rebuild the
    # line above turned every lake into grass, and the water draw keeps a lake's surface only
    # where the cover says water: the Old Dam's reservoir and all 15 lakes were dry, wooded
    # basins under an invisible surface).
    lake_wet = np.zeros(h.shape, bool)
    lakes_near = nd.binary_dilation(lakes, iterations=8)
    for wb in water_bodies:
        bx0, bz0, bx1, bz1 = wb["bounds"]
        box_ = (x >= bx0 - 30) & (x <= bx1 + 30) & (z >= bz0 - 30) & (z <= bz1 + 30)
        # The ground below the level that the lake reaches (its whole basin, which can run a
        # little past the lake's traced outline: lake-3's north shore was a dry 12 m trench).
        # (Within ~30 m of the outline: a lake near the coast must not spill over the low
        # land between it and the sea.)
        below = box_ & (h < wb["level"] - 0.05) & lakes_near
        lab_, _ = nd.label(below)
        seeds = np.unique(lab_[below & lakes])
        lake_wet |= np.isin(lab_, seeds[seeds > 0])
    # A cover texel is water if any height cell under it is (edges audit 2026-11-09: halfway
    # sampling left a 7.8 m strip of rock cover along steep lake shores, a dry trench showing
    # 12 m down into lake-3). Water drawn over a texel's higher part is hidden by the ground.
    n_ = COVER * 2
    wet_t = lake_wet[:n_, :n_].reshape(COVER, 2, COVER, 2).any(axis=(1, 3))
    # And a texel beside the water whose lowest ground is below a lake's level (a steep shore
    # whose foot is in that texel and its top in the next one).
    low_t = h[:n_, :n_].reshape(COVER, 2, COVER, 2).min(axis=(1, 3))
    xt = x[:n_:2, :n_:2]
    zt = z[:n_:2, :n_:2]
    for wb in water_bodies:
        bx0, bz0, bx1, bz1 = wb["bounds"]
        box_t = (xt >= bx0 - 30) & (xt <= bx1 + 30) & (zt >= bz0 - 30) & (zt <= bz1 + 30)
        wet_t |= nd.binary_dilation(wet_t & box_t, iterations=1) & box_t & (low_t < wb["level"] - 0.05)
    cover[wet_t] = WATER
    # Concept road pixels away from the final road lines (owner, 2026-11-08: roads ending in
    # weird places): asphalt blotches on beaches and in fields, and the tracks of the spurs and
    # specks the network audit removed, go back to grass. POI pads keep theirs (car parks, yards).
    cell_c = WORLD / COVER
    on_line = np.zeros(cover.shape, bool)
    for line in roads:
        for (ax, az), (bx, bz) in zip(line[:-1], line[1:]):
            n = max(2, int(np.hypot(bx - ax, bz - az) / (cell_c * 0.5)))
            ci = ((ax + (bx - ax) * np.linspace(0, 1, n) + HALF) / cell_c).astype(int)
            cj = ((az + (bz - az) * np.linspace(0, 1, n) + HALF) / cell_c).astype(int)
            ok = (ci >= 0) & (ci < COVER) & (cj >= 0) & (cj < COVER)
            on_line[cj[ok], ci[ok]] = True
    near_line = nd.distance_transform_edt(~on_line) * cell_c < 14
    gx, gz = grid_coords(COVER)
    pads = np.zeros(cover.shape, bool)
    for p in POIS:
        if p["pad"]:
            px, pz = px_to_world(*p["px"])
            pads |= np.hypot(gx - px, gz - pz) < p["pad"] / 2 + 30
    cover[(cover == ROAD) & ~near_line & ~pads] = GRASS
    # Beaches along the sea (45 m); rivers and lakes only get a narrow strip of shore (10 m) and
    # grass beyond (owner, 2026-11-08: the river banks were 45 m sand beaches).
    sea_true = nd.zoom((~land).astype(np.float32), COVER / GRID, order=1) > 0.5
    fresh = sea_c & ~sea_true
    near_sea = nd.distance_transform_edt(~sea_true) * (WORLD / COVER) < 45
    near_fresh = nd.distance_transform_edt(~fresh) * (WORLD / COVER) < 10
    cover[land_c & (near_sea | near_fresh) & (cover != URBAN) & (cover != ROAD)] = SAND
    slope = np.hypot(*np.gradient(hc, WORLD / COVER))
    cover[land_c & (slope > 0.75)] = ROCK
    high = hc > 170
    cover[land_c & high & (cover != FOREST)] = ROCK
    # Tree line: bare rock above 210 m, forest included.
    cover[land_c & (hc > 210)] = ROCK
    # Blackwater Prison's knoll: its face is bare rock all round (on the 7.8 m cover grid the
    # 15 m band's slope averages under the rock threshold in places).
    kx, kz = px_to_world(*next(p["px"] for p in POIS if p["id"] == "blackwater-prison"))
    kgx, kgz = grid_coords(COVER)
    ks = np.hypot(kgx - kx, kgz - kz) - prison_rim(np.arctan2(kgz - kz, kgx - kx))
    cover[land_c & (ks > -3) & (ks < PRISON_KNOLL["cliff"] / PRISON_KNOLL["face"] + 10)] = ROCK
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

    # Riverwood's lumber yard on the north bank (layout.ts riverwoodWaterfront): bare earth, no
    # trees growing between the log stacks and the sheds.
    rx, rz = px_to_world(*next(p["px"] for p in POIS if p["id"] == "riverwood"))
    yx0, yx1, yz0, yz1 = RIVERWOOD_YARD
    cover[(cxs > rx + yx0) & (cxs < rx + yx1) & (czs > rz + yz0) & (czs < rz + yz1) & land_c & (cover != ROAD)] = SAND
    # The harbour quays are paved.
    for hx0, hx1, hz0, hz1, _ in HARBORS:
        cover[(cxs > hx0) & (cxs < hx1) & (czs > hz0) & (czs < hz1) & land_c] = URBAN
    # Redstone Quarry: the pit and its benches are bare gravel (no trees), as drawn.
    qx, qz = px_to_world(1000, 195)
    qa = np.arctan2(czs - qz, cxs - qx)
    qw = 1 + 0.1 * np.sin(2 * qa + 1.1) + 0.06 * np.sin(3 * qa + 2.3) + 0.035 * np.sin(5 * qa + 0.4)
    # (Rock, 2026-11-11: as sand, the inland-bank shading turned the whole pit to grass and earth.
    # The rock class pairs bare rock with gravel over large patches: a worked quarry.)
    cover[(np.hypot(cxs - qx, czs - qz) / qw < 118 / IMG_SIZE * WORLD * 0.85) & land_c] = ROCK

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
    # The lakes' water texels stay water (the steep-shore rock above would take a steep shore's
    # foot back, leaving a dry strip along it).
    cover[wet_t] = WATER
    return dict(h=h, cover=cover.astype(np.uint8), water_bodies=water_bodies, bridges=bridges, perches=perches, land=land, lakes=lakes, water=water_mask, roads=roads, road_ends=road_ends)


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
    return [(r, river_line(r)) for r in RIVERS]


def river_line(r: dict) -> list[tuple[float, float]]:
    """A river's centreline in world metres, meandering (owner, 2026-11-08: the rivers were
    dead-straight canals): the concept's polyline, densified every 20 m and swung side to side
    by two slow waves along its length (up to ~40 m), seeded per river. The ends stay put (the
    source, and the mouth at the sea)."""
    pts = [px_to_world(*p) for p in r["pts"]]
    dense: list[tuple[float, float, float, float]] = []  # x, z, normal x, normal z
    for (ax, az), (bx, bz) in zip(pts[:-1], pts[1:]):
        L = float(np.hypot(bx - ax, bz - az)) or 1.0
        n = max(1, int(L / 20))
        for k in range(n):
            t = k / n
            dense.append((ax + (bx - ax) * t, az + (bz - az) * t, -(bz - az) / L, (bx - ax) / L))
    dense.append((pts[-1][0], pts[-1][1], dense[-1][2], dense[-1][3]))
    # Smooth the normals (corners of the concept polyline) over ~200 m.
    nx = nd.gaussian_filter1d(np.array([d[2] for d in dense]), 5, mode="nearest")
    nz = nd.gaussian_filter1d(np.array([d[3] for d in dense]), 5, mode="nearest")
    rng = np.random.default_rng(SEED + 211 + sum(map(ord, r["id"])))
    p1, p2 = rng.uniform(0, 2 * np.pi, 2)
    out = []
    count = len(dense)
    for k, (x, z, _, _) in enumerate(dense):
        s = k * 20.0
        taper = min(1.0, k / 6, (count - 1 - k) / 6)
        off = (26 * np.sin(s / 240 + p1) + 13 * np.sin(s / 97 + p2)) * taper
        ln = float(np.hypot(nx[k], nz[k])) or 1.0
        out.append((x + nx[k] / ln * off, z + nz[k] / ln * off))
    return out


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


def connect_roads(roads: list, wet_at, h_at, keep_at, spans: list) -> list:
    """Road network audit (owner, 2026-11-08: "some roads end in a weird place"). The roads are
    traced from the concept art in pieces: ~1,000 ends stopped 12-45 m short of the road they
    belong to, others ran a few hundred metres into a field and stopped, and a few pieces (the
    Northfield grid among them) were not joined to the network at all.

    1. A loose end within 45 m of another road joins it (at the nearest point, a T-junction, or
       that road's own loose end), unless the link would cross water.
    2. A loose end within 150 m of a road ahead of it (not behind) joins it with a curve that
       leaves in the road's own direction, over dry ground no steeper than a country road.
    3. A dead-end spur still loose and shorter than 300 m back to its junction is cut back to
       the junction; fragments loose at both ends and shorter than 300 m go.
    4. Pieces not joined to the main network (bridges count as joins) are linked to it where a
       dry, gentle link exists (up to 300 m, 600 m for a long piece or one serving a POI); short
       pieces that cannot be linked (a lone loop in a field) go.
    Ends that arrive somewhere stay ends (`keep_at`: a town, a site, the coast, a bridge); the
    longer country dead ends left lead to a farm or a cabin (layout.ts countryside)."""
    roads = [list(map(tuple, line)) for line in roads if len(line) >= 2]
    JOIN, REACH, LOOSE, SPUR, LOOP = 45.0, 150.0, 10.0, 300.0, 260.0

    def segments():
        a, b, owner = [], [], []
        for i, line in enumerate(roads):
            for p, q in zip(line[:-1], line[1:]):
                a.append(p)
                b.append(q)
                owner.append(i)
        return np.array(a, np.float64), np.array(b, np.float64), np.array(owner)

    A, B, O = segments()

    def dists(p, own):
        v = B - A
        w = np.asarray(p, np.float64) - A
        t = np.clip((w * v).sum(1) / np.maximum((v * v).sum(1), 1e-9), 0, 1)
        q = A + v * t[:, None]
        d = np.hypot(q[:, 0] - p[0], q[:, 1] - p[1])
        d[O == own] = np.inf
        return d, q

    def nearest(p, own):
        d, q = dists(p, own)
        k = int(np.argmin(d))
        return float(d[k]), (float(q[k, 0]), float(q[k, 1])), int(O[k])

    def length(line):
        return float(sum(np.hypot(q[0] - p[0], q[1] - p[1]) for p, q in zip(line[:-1], line[1:])))

    def heading(line, end):
        """Unit direction the road runs out of its end (from ~25 m back)."""
        pts = line if end == -1 else line[::-1]
        p = np.array(pts[-1])
        back, walked = pts[-1], 0.0
        for k in range(len(pts) - 2, -1, -1):
            walked += float(np.hypot(*(np.array(pts[k + 1]) - pts[k])))
            back = pts[k]
            if walked >= 25:
                break
        v = p - np.array(back)
        n = float(np.hypot(*v))
        return v / n if n > 1e-6 else None

    def usable(path, max_grade=0.12):
        xs = np.array(path)
        hs = np.array([h_at(x_, z_) for x_, z_ in xs])
        step = np.hypot(*np.diff(xs, axis=0).T)
        if any(wet_at(x_, z_) for x_, z_ in xs):
            return False
        return bool((np.abs(np.diff(hs)) <= max_grade * np.maximum(step, 1e-3) + 0.3).all())

    def curve(p, u, q):
        """A link leaving p along u and arriving at q: a quadratic curve, points every ~8 m."""
        p, q = np.array(p), np.array(q)
        L = float(np.hypot(*(q - p)))
        c = p + u * L * 0.45
        n = max(2, int(L / 8))
        t = np.linspace(0, 1, n + 1)[:, None]
        pts = (1 - t) ** 2 * p + 2 * (1 - t) * t * c + t * t * q
        return [(float(a), float(b)) for a, b in pts]

    # 1-2. Joins.
    joined = linked = 0
    for i in range(len(roads)):
        for end in (0, -1):
            p = roads[i][end]
            d, q, _ = nearest(p, i)
            if d <= LOOSE:
                continue
            if d <= JOIN:
                if any(wet_at(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t) for t in np.linspace(0, 1, 10)):
                    continue
                link = [q]
            else:
                u = heading(roads[i], end)
                if u is None:
                    continue
                # Ahead of the end: the nearest road point within a 70° cone.
                dd, qq = dists(p, i)
                v = qq - np.array(p)
                ahead = (v @ u) >= np.cos(np.radians(70)) * np.maximum(dd, 1e-6)
                dd = np.where(ahead, dd, np.inf)
                k = int(np.argmin(dd))
                if not np.isfinite(dd[k]) or dd[k] > REACH:
                    continue
                path = curve(p, u, (float(qq[k, 0]), float(qq[k, 1])))
                if not usable(path):
                    continue
                link = path[1:]
                linked += 1
            if end == 0:
                roads[i][:0] = link[::-1]
            else:
                roads[i].extend(link)
            joined += 1
        if i % 200 == 199:
            A, B, O = segments()
    A, B, O = segments()

    # 3. The network as a graph (roads split where they meet), pruned of dead-end spurs that run
    #    into a field and stop, and of the little loops and hooks the tracer left at road ends.
    g = road_graph(roads, LOOSE + 1)
    alive = [not e["internal"] for e in g["edges"]]
    node_keep = {n: keep_at(*pos) for n, pos in g["pos"].items()}

    def incident():
        inc: dict = {}
        for k, e in enumerate(g["edges"]):
            if alive[k]:
                inc.setdefault(e["u"], []).append(k)
                inc.setdefault(e["v"], []).append(k)
        return inc

    def walk(n, k, inc, limit):
        """From node n along edge k through plain bends (degree-2 nodes): edges, length, end node."""
        path, total, cur = [k], g["edges"][k]["len"], n
        while True:
            e = g["edges"][path[-1]]
            cur = e["v"] if e["u"] == cur else e["u"]
            if cur == n or total >= limit or node_keep.get(cur) or len(inc.get(cur, [])) != 2:
                return path, total, cur
            nxt = [j for j in inc[cur] if j != path[-1]]
            if not nxt or nxt[0] in path:
                return path, total, cur
            path.append(nxt[0])
            total += g["edges"][nxt[0]]["len"]

    trimmed = loops = 0
    for _ in range(6):
        changed = False
        inc = incident()
        for n, ks in inc.items():
            if node_keep[n]:
                continue
            if len(ks) == 1 and alive[ks[0]]:
                path, total, _ = walk(n, ks[0], inc, SPUR)
                if total < SPUR:
                    for k in path:
                        alive[k] = False
                    trimmed += 1
                    changed = True
            elif len(ks) >= 2:
                for k in ks:
                    if not alive[k]:
                        continue
                    path, total, end = walk(n, k, inc, LOOP)
                    if end == n and total < LOOP:
                        for j in path:
                            alive[j] = False
                        loops += 1
                        changed = True
        if not changed:
            break
    # Internal pieces (where two roads run together) stay unless both neighbours went.
    E = g["edges"]
    k = 0
    while k < len(E):
        if not E[k]["internal"]:
            k += 1
            continue
        j = k
        while j < len(E) and E[j]["internal"] and E[j]["road"] == E[k]["road"]:
            j += 1
        nb = [m for m in (k - 1, j) if 0 <= m < len(E) and E[m]["road"] == E[k]["road"]]
        keep_run = any(alive[m] for m in nb) or not nb
        for m in range(k, j):
            alive[m] = keep_run
        k = j
    roads = g["rebuild"](alive)

    # 4. Pieces off the network: linked to it, or dropped when small.
    nr = len(roads)
    g = road_graph(roads + [[tuple(a_), tuple(b_)] for a_, b_ in spans], LOOSE + 1)
    parent = {n: n for n in g["pos"]}

    def find(a_):
        while parent[a_] != a_:
            parent[a_] = parent[parent[a_]]
            a_ = parent[a_]
        return a_

    for e in g["edges"]:
        parent[find(e["u"])] = find(e["v"])
    road_group: dict = {}
    for e in g["edges"]:
        if e["road"] < nr:
            road_group.setdefault(e["road"], find(e["u"]))
    groups: dict = {}
    for i, grp in road_group.items():
        groups.setdefault(grp, []).append(i)
    size = {grp: sum(length(roads[i]) for i in m) for grp, m in groups.items()}
    main = max(size, key=size.get)
    A, B, O = segments()
    gid = {grp: k for k, grp in enumerate(groups)}
    seg_group = np.array([gid.get(road_group.get(int(o)), -1) for o in O])
    important = {grp: any(keep_at(*roads[i][0]) or keep_at(*roads[i][-1]) for i in m) for grp, m in groups.items()}
    # Candidate links from every piece but the main one to each other piece: per pair, the few
    # shortest from points at least 40 m apart. Then, shortest first (Kruskal), a link is built
    # where it joins two pieces not yet joined and runs over dry, gentle ground.
    cands = []
    for grp, members in groups.items():
        if grp == main:
            continue
        g0 = gid[grp]
        per_pair: dict = {}
        for i in members:
            for p in roads[i][::2] + [roads[i][-1]]:
                d, q = dists(p, -1)
                order = np.argsort(d)[:400]
                seen = set()
                for k in order:
                    h_ = int(seg_group[k])
                    if h_ in seen or h_ == g0 or h_ < 0 or d[k] > 600:
                        continue
                    seen.add(h_)
                    lst = per_pair.setdefault(h_, [])
                    lst.append((float(d[k]), p, (float(q[k, 0]), float(q[k, 1]))))
        for h_, lst in per_pair.items():
            lst.sort(key=lambda c: c[0])
            picked = []
            for c in lst:
                if all(np.hypot(c[1][0] - o[1][0], c[1][1] - o[1][1]) >= 40 for o in picked):
                    picked.append(c)
                if len(picked) == 6:
                    break
            cands += [(c[0], g0, h_, c[1], c[2]) for c in picked]
    cands.sort(key=lambda c: c[0])
    names = list(groups)
    big = {gid[grp]: important[grp] or size[grp] >= 800 for grp in groups}
    up = list(range(len(names)))

    def top(a_):
        while up[a_] != a_:
            up[a_] = up[up[a_]]
            a_ = up[a_]
        return a_

    extra = []
    for d, g0, h_, p, q in cands:
        if top(g0) == top(h_) or d > (600 if big[g0] or big[h_] else 300):
            continue
        p, q = np.array(p), np.array(q)
        steps = max(2, int(d / 8))
        path = [(float(a_), float(b_)) for a_, b_ in (p + (q - p) * t for t in np.linspace(0, 1, steps + 1))]
        if usable(path, 0.15):
            extra.append(path)
            up[top(g0)] = top(h_)
    m0 = top(gid[main])
    gone = set()
    for grp, members in groups.items():
        if top(gid[grp]) != m0 and not important[grp] and size[grp] < 800:
            gone.update(members)
    roads = [line for i, line in enumerate(roads) if i not in gone] + extra
    # The dead ends left (country roads that run out in the open): where they are and which way
    # the road was heading, for the countryside layout to put a farm or a cabin at the end.
    g = road_graph(roads, LOOSE + 1)
    deg: dict = {}
    for e in g["edges"]:
        if not e["internal"]:
            deg[e["u"]] = deg.get(e["u"], 0) + 1
            deg[e["v"]] = deg.get(e["v"], 0) + 1
    road_ends = []
    for i, (n0, n1) in enumerate(g["ends"]):
        for end, nd_ in ((0, n0), (-1, n1)):
            p = roads[i][end]
            if deg.get(nd_, 0) == 1 and not keep_at(*p):
                u = heading(roads[i], end)
                if u is not None:
                    road_ends.append((round(p[0], 1), round(p[1], 1), round(float(u[0]), 3), round(float(u[1]), 3)))
    print(
        f"roads: {joined} loose ends joined ({linked} by a curve up to {REACH:.0f} m), {trimmed} dead-end spurs "
        f"and {loops} small loops removed, {len(groups) - 1} detached pieces: {len(extra)} linked, {len(gone)} roads dropped; "
        f"{len(road_ends)} country dead ends left"
    )
    return roads, road_ends


def road_graph(roads: list, reach: float) -> dict:
    """The road network as a graph: each road densified to 5 m and split where it comes within
    `reach` of another road (or of itself, further along); nodes are those meeting places (and
    the road ends), edges the stretches between. `rebuild(alive)` turns a subset of the edges back
    into road polylines."""
    from scipy.spatial import cKDTree

    STEP = 5.0
    dense, orig = [], []
    for line in roads:
        out, keep = [line[0]], [True]
        for p, q in zip(line[:-1], line[1:]):
            n = max(1, int(np.ceil(np.hypot(q[0] - p[0], q[1] - p[1]) / STEP)))
            out += [(p[0] + (q[0] - p[0]) * t / n, p[1] + (q[1] - p[1]) * t / n) for t in range(1, n + 1)]
            keep += [t == n for t in range(1, n + 1)]
        dense.append(out)
        orig.append(keep)
    verts = np.array([p for line in dense for p in line])
    owner = np.array([i for i, line in enumerate(dense) for _ in line])
    local = np.array([k for line in dense for k in range(len(line))])
    parent = np.arange(len(verts))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    junction = np.zeros(len(verts), bool)
    for a, b in cKDTree(verts).query_pairs(reach):
        if owner[a] == owner[b] and abs(int(local[a]) - int(local[b])) * STEP < reach * 4:
            continue
        junction[a] = junction[b] = True
        parent[find(a)] = find(b)
    starts = np.cumsum([0] + [len(line) for line in dense])
    junction[starts[:-1]] = True
    junction[starts[1:] - 1] = True
    node = np.array([find(v) for v in range(len(verts))])
    pos: dict = {}
    for v in np.nonzero(junction)[0]:
        pos.setdefault(int(node[v]), []).append(verts[v])
    pos = {n: tuple(np.mean(ps, axis=0)) for n, ps in pos.items()}
    edges = []
    for i, line in enumerate(dense):
        s0 = starts[i]
        cuts = [k for k in range(len(line)) if junction[s0 + k]]
        for a, b in zip(cuts[:-1], cuts[1:]):
            u, v = int(node[s0 + a]), int(node[s0 + b])
            L = float(sum(np.hypot(line[k + 1][0] - line[k][0], line[k + 1][1] - line[k][1]) for k in range(a, b)))
            edges.append(dict(road=i, a=a, b=b, u=u, v=v, len=L, internal=(u == v and L < reach * 3)))

    def rebuild(alive):
        """Runs of alive edges back into polylines: the road's own vertices, plus the points
        where a run was cut."""
        out, run, last = [], [], None
        for k, e in enumerate(edges):
            if alive[k] and run and last is not None and last["road"] == e["road"] and last["b"] == e["a"]:
                run[1] = e["b"]
            else:
                if run:
                    out.append(run)
                run = [e["road"], e["b"], e["a"]] if alive[k] else []
            last = e if alive[k] else None
        if run:
            out.append(run)
        # A run under 12 m is dropped unless it links two places the rest of the network
        # reaches (a short connector between two junctions, which dropping would disconnect).
        deg_: dict = {}
        for k, e in enumerate(edges):
            if alive[k] and e["u"] != e["v"]:
                deg_[e["u"]] = deg_.get(e["u"], 0) + 1
                deg_[e["v"]] = deg_.get(e["v"], 0) + 1
        res = []
        for i, b, a in out:
            line = [dense[i][k] for k in range(a, b + 1) if k in (a, b) or orig[i][k]]
            n0, n1 = int(node[starts[i] + a]), int(node[starts[i] + b])
            # Each end to its junction's centre: a junction can be a little cluster of points
            # (roads within `reach` of each other), and with some of its roads gone the rest
            # must still meet at one point.
            line[0], line[-1] = pos[n0], pos[n1]
            joins = n0 != n1 and deg_.get(n0, 0) >= 2 and deg_.get(n1, 0) >= 2
            if joins or sum(np.hypot(q[0] - p[0], q[1] - p[1]) for p, q in zip(line[:-1], line[1:])) >= 12:
                res.append(line)
        return res

    ends = [(int(node[starts[i]]), int(node[starts[i + 1] - 1])) for i in range(len(dense))]
    return dict(pos=pos, edges=edges, rebuild=rebuild, ends=ends)


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


def crosses_river(span, river_lines: list, min_angle: float = 45.0) -> bool:
    """Whether a span crosses the nearest river at more than `min_angle` degrees (a bridge),
    rather than running along it."""
    a, b = np.array(span[0], float), np.array(span[1], float)
    mid, d = (a + b) / 2, b - a
    best, tangent = np.inf, None
    for pts in river_lines:
        for p, q in zip(pts[:-1], pts[1:]):
            p, q = np.array(p, float), np.array(q, float)
            v = q - p
            t = np.clip(np.dot(mid - p, v) / max(np.dot(v, v), 1e-9), 0, 1)
            dist = np.hypot(*(mid - (p + t * v)))
            if dist < best:
                best, tangent = dist, v
    if tangent is None or best > 150:
        return True  # not at a river (a lake, the strait): leave it as it was
    cos = abs(np.dot(d, tangent)) / max(np.hypot(*d) * np.hypot(*tangent), 1e-9)
    return cos < np.cos(np.radians(min_angle))


def extend_span(span, water_at, reach: float = 160.0, step: float = 4.0):
    """Move each end of a bridge span outward along its axis while it stands in water (up to
    `reach` m), then 10 m onto the dry ground."""
    a, b = np.array(span[0], float), np.array(span[1], float)
    L = np.hypot(*(b - a)) or 1.0
    u = (b - a) / L
    def out(p, d):
        moved = 0.0
        while moved < reach and water_at(*p):
            p, moved = p + d * step, moved + step
        return p + d * 10.0 if moved > 0 else p
    a2, b2 = out(a, -u), out(b, u)
    return ((float(a2[0]), float(a2[1])), (float(b2[0]), float(b2[1])))


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


def finish_network(roads: list, water_at, h_at, spans: list, protect, in_zone, access, h_grid, water_grid, zone_rects=(), zone_discs=()) -> list:
    """Road audit before release (owner, 2026-11-09: "audit the roads to be correct … so the
    edges is correct connected around the map"). After the network is joined up:

    1. Road left running through water outside a bridge (a connector laid along a channel's
       edge) is cut out; what is left of such a road under 60 m goes (a stub to the water).
    2. Every bridge end has a road: one more than 6 m from any road is linked to the nearest dry
       road point ahead of it on its own bank within 450 m (a straight link no steeper than 15 %;
       the Crossroads-to-prison bridge stood 380 m from the nearest road on its north bank).
    3. Junctions meet: a road end 3-24 m from another road (connect_roads counts 10 m as joined,
       which left a grass gap of up to 6 m between the end and the other road's edge) runs on to
       the nearest point of that road, unless the link would cross water; an end that ran past
       that road is cut back to it instead. Hairpins (turns over 150°) are removed before and
       after.
    4. Stubs under 20 m that still end loose go.
    5. Roads to nowhere (owner: "random dead ends"): a part of the network hanging off the rest
       by a single road (a dead-end spur, a lasso loop on a stem) with nothing a player goes to
       on it (no POI, no bridge; the bare coast does not count) is removed back to the junction
       it hangs from when under 1.2 km; each dead end left is joined to another road within
       800 m where a dry link no steeper than 18 % exists; branches still dead-ending under 2 km
       go too."""

    def on_span(px_, pz_, pad=8.0):
        for (ax, az), (bx, bz) in spans:
            vx, vz = bx - ax, bz - az
            L2 = vx * vx + vz * vz
            t = ((px_ - ax) * vx + (pz_ - az) * vz) / max(L2, 1e-9)
            if -0.08 <= t <= 1.08 and np.hypot(ax + t * vx - px_, az + t * vz - pz_) < pad:
                return True
        return False

    def wet(px_, pz_):
        return water_at(px_, pz_) and not on_span(px_, pz_)

    def length(line):
        return float(sum(np.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(line[:-1], line[1:])))

    # 1. Wet stretches.
    out, cut = [], 0
    for line in roads:
        pts = []
        for a, b in zip(line[:-1], line[1:]):
            n = max(1, int(np.hypot(b[0] - a[0], b[1] - a[1]) / 4))
            pts += [(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n) for k in range(n)]
        pts.append(line[-1])
        if not any(wet(*q) for q in pts):
            out.append(line)
            continue
        cut += 1
        piece = []
        for q in pts:
            if wet(*q):
                if len(piece) >= 2 and length(piece) >= 60:
                    out.append(piece)
                piece = []
            else:
                piece.append(q)
        if len(piece) >= 2 and length(piece) >= 60:
            out.append(piece)
    roads = out

    def nearest(p, own=None):
        best, bd = None, np.inf
        for k, line in enumerate(roads):
            if k == own:
                continue
            arr = np.asarray(line)
            a, b = arr[:-1], arr[1:]
            v = b - a
            t = np.clip(((np.asarray(p) - a) * v).sum(1) / np.maximum((v * v).sum(1), 1e-9), 0, 1)
            q = a + v * t[:, None]
            d = np.hypot(*(q - np.asarray(p)).T)
            j = int(np.argmin(d))
            if d[j] < bd:
                bd, best = float(d[j]), (float(q[j, 0]), float(q[j, 1]))
        return bd, best

    def dry_link(p, q, max_grade):
        # (Over dry ground only: a link never runs out over a bridge's water.)
        n = max(2, int(np.hypot(q[0] - p[0], q[1] - p[1]) / 6))
        path = [(p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n) for k in range(n + 1)]
        if any(water_at(*c) for c in path[1:-1]):
            return None
        hs = [h_at(*c) for c in path]
        step = np.hypot(q[0] - p[0], q[1] - p[1]) / n
        if max(abs(b - a) for a, b in zip(hs[:-1], hs[1:])) / step > max_grade:
            return None
        return path

    def unhook(lines):
        """Hairpins (a vertex where the road turns more than 150°: an end that ran past the road
        it joins and came back) are removed, vertex by vertex. Returns how many went."""
        n_ = 0
        for line in lines:
            k = 1
            while k < len(line) - 1:
                a, b, c = np.array(line[k - 1]), np.array(line[k]), np.array(line[k + 1])
                u, v = b - a, c - b
                nu, nv = np.hypot(*u), np.hypot(*v)
                if nu < 1e-6 or nv < 1e-6 or (u @ v) < np.cos(np.radians(150)) * nu * nv:
                    del line[k]
                    n_ += 1
                    k = max(1, k - 1)
                else:
                    k += 1
        return n_

    # 2. Bridge ends.
    linked = 0
    unlinked = []
    for a, b in spans:
        for end, other in ((a, b), (b, a)):
            d, _ = nearest(end)
            if d <= 6.0:
                continue
            best = None
            for line in roads:
                for c in line:
                    dc = np.hypot(c[0] - end[0], c[1] - end[1])
                    if dc > 450 or (best and dc >= best[0]):
                        continue
                    # On this bank: within 120° of straight on from the bridge (the link may not
                    # cross water either, below).
                    ox, oz = end[0] - other[0], end[1] - other[1]
                    if (c[0] - end[0]) * ox + (c[1] - end[1]) * oz < -0.5 * dc * np.hypot(ox, oz):
                        continue
                    best = (dc, c)
            path = dry_link(end, best[1], 0.15) if best else None
            if path:
                roads.append(path)
                linked += 1
            else:
                unlinked.append([round(end[0]), round(end[1])])

    # 3. Junction gaps (the hairpins out first, so the ends are where the roads really stop).
    hooks = unhook(roads)
    closed = 0
    for i, line in enumerate(roads):
        for end in (0, -1):
            p = line[end]
            d, q = nearest(p, i)
            if not (3.0 < d <= 24.0):
                continue
            # An end that ran past the other road would hook back to it: cut the end back to
            # where it comes closest to that road instead (a clean T, not a U-turn).
            nb = line[1] if end == 0 else line[-2]
            u = np.array([p[0] - nb[0], p[1] - nb[1]])
            v = np.array([q[0] - p[0], q[1] - p[1]])
            if (u @ v) < -0.17 * np.hypot(*u) * np.hypot(*v):
                seq = line if end == -1 else line[::-1]
                k = int(np.argmin([np.hypot(c[0] - q[0], c[1] - q[1]) for c in seq]))
                if k < 1:
                    continue
                seq = seq[: k + 1]
                d2, q2 = nearest(seq[-1], i)
                path = dry_link(seq[-1], q2, 0.25) if d2 > 3.0 else [seq[-1]]
                if not path:
                    continue
                seq = seq + path[1:]
                line[:] = seq if end == -1 else seq[::-1]
                closed += 1
                continue
            path = dry_link(p, q, 0.25)
            if not path:
                continue
            if end == 0:
                line[:0] = path[::-1][:-1]
            else:
                line.extend(path[1:])
            closed += 1

    hooks += unhook(roads)

    # 4. Loose stubs.
    out = []
    stubs = 0
    for i, line in enumerate(roads):
        if length(line) < 20 and min(nearest(line[0], i)[0], nearest(line[-1], i)[0]) > 3.0:
            stubs += 1
            continue
        out.append(line)
    # 5. Roads to nowhere: small dangling pieces go; the dead ends left are joined to the
    #    network where a dry, gentle link exists; what still dead-ends then goes too.
    import networkx as nx

    def dangling(lines, limit):
        """The network as a graph; every part hanging off the rest by one road, with nothing a
        player goes to on it and at most `limit` m of road (the bridge tree of the graph's
        2-edge-connected blocks, cut from the largest block outwards): (graph, alive edges,
        [(edge keys, length, nodes)])."""
        nr_ = len(lines)
        g_ = road_graph(lines + [[tuple(a_), tuple(b_)] for a_, b_ in spans], 4.0)
        E_ = g_["edges"]
        keep_ = {n: bool(protect(*pos)) for n, pos in g_["pos"].items()}
        for e in E_:
            if e["road"] >= nr_:  # the bridges themselves are destinations
                keep_[e["u"]] = keep_[e["v"]] = True
        H = nx.Graph()
        for k, e in enumerate(E_):
            if e["u"] != e["v"]:
                if H.has_edge(e["u"], e["v"]):
                    H[e["u"]][e["v"]]["keys"].append(k)
                else:
                    H.add_edge(e["u"], e["v"], keys=[k])
        bridges_ = set(frozenset(b_) for b_ in nx.bridges(H) if len(H[b_[0]][b_[1]]["keys"]) == 1)
        H2 = H.copy()
        H2.remove_edges_from([tuple(b_) for b_ in bridges_])
        block = {}
        for bi, comp in enumerate(nx.connected_components(H2)):
            for n in comp:
                block[n] = bi
        nblocks = max(block.values()) + 1 if block else 0
        blen = [0.0] * nblocks
        bkeep = [False] * nblocks
        bnodes = [[] for _ in range(nblocks)]
        bkeys = [[] for _ in range(nblocks)]
        for n, bi in block.items():
            bkeep[bi] |= bool(keep_.get(n))
            bnodes[bi].append(n)
        for u, v, d in H.edges(data=True):
            if frozenset((u, v)) not in bridges_:
                blen[block[u]] += sum(E_[k]["len"] for k in d["keys"])
                bkeys[block[u]] += d["keys"]
        T = nx.Graph()
        T.add_nodes_from(range(nblocks))
        for b_ in bridges_:
            u, v = tuple(b_)
            T.add_edge(block[u], block[v], keys=H[u][v]["keys"])
        alive_ = [True] * len(E_)
        parts = []
        for comp in nx.connected_components(T):
            root = max(comp, key=lambda bi: (bkeep[bi], blen[bi]))
            parent = {root: None}
            order = [root]
            for x in order:
                for y in T[x]:
                    if y not in parent:
                        parent[y] = x
                        order.append(y)
            sub_len, sub_keep = {}, {}
            for x in reversed(order):
                kids = [y for y in T[x] if parent.get(y) == x]
                sub_len[x] = blen[x] + sum(sub_len[y] + sum(E_[k]["len"] for k in T[x][y]["keys"]) for y in kids)
                sub_keep[x] = bkeep[x] or any(sub_keep[y] for y in kids)
            stack = [root]
            while stack:
                x = stack.pop()
                for y in T[x]:
                    if parent.get(y) != x:
                        continue
                    total = sub_len[y] + sum(E_[k]["len"] for k in T[x][y]["keys"])
                    if not sub_keep[y] and total <= limit:
                        ks, nodes, st = list(T[x][y]["keys"]), [], [y]
                        while st:
                            z = st.pop()
                            ks += bkeys[z]
                            nodes += bnodes[z]
                            for w in T[z]:
                                if parent.get(w) == z:
                                    ks += T[z][w]["keys"]
                                    st.append(w)
                        for k in ks:
                            alive_[k] = False
                        parts.append((ks, total, set(nodes)))
                    else:
                        stack.append(y)
        for k, e in enumerate(E_):
            if e["road"] >= nr_:
                alive_[k] = False
        return g_, alive_, parts

    roads = out
    # (a) The dead ends: a link to another road (not back into its own branch) within 800 m
    #     over dry ground no steeper than 18 %.
    g, alive, parts = dangling(roads, 1e9)
    own = [set(p_[2]) for p_ in parts]
    deg: dict = {}
    for e in g["edges"]:
        if e["u"] != e["v"]:
            deg[e["u"]] = deg.get(e["u"], 0) + 1
            deg[e["v"]] = deg.get(e["v"], 0) + 1
    joined_ends = 0
    span_pts = [p_ for s_ in spans for p_ in s_]
    for n_, pos in g["pos"].items():
        if deg.get(n_, 0) != 1 or in_zone(*pos) or any(np.hypot(pos[0] - q[0], pos[1] - q[1]) < 60 for q in span_pts):
            continue
        branch = next((o for o in own if n_ in o), set())
        branch_pts = [g["pos"][m_] for m_ in branch]
        best = None
        for line in roads:
            for c in line[::2]:
                dc = np.hypot(c[0] - pos[0], c[1] - pos[1])
                if dc < 30 or dc > 800 or (best and dc >= best[0]):
                    continue
                if any(np.hypot(c[0] - q[0], c[1] - q[1]) < 40 for q in branch_pts):
                    continue
                best = (dc, c)
        if best:
            path = dry_link(pos, best[1], 0.18)
            if path and not any(in_zone(*q) for q in path[1:-1]):
                roads.append(path)
                joined_ends += 1
    # (b) Tangles: country roads (outside the towns and sites) that loop back on themselves
    #     within 1 km (the tracer's little loops, triangles, lassos and doubled stretches).
    #     The network is taken junction to junction (a "link" runs between two junctions, through
    #     any joins of two roads end to end); of each such small loop the longest link goes,
    #     longest first, so one road runs where two wound. A link is only taken out between two
    #     real junctions, so no road is left hanging.
    g = road_graph(roads + [[tuple(a_), tuple(b_)] for a_, b_ in spans], 4.0)
    E = g["edges"]
    nr = len(roads)
    alive = [True] * len(E)
    inc: dict = {}
    for k, e in enumerate(E):
        inc.setdefault(e["u"], []).append(k)
        inc.setdefault(e["v"], []).append(k)
    span_nodes = {n for e in E if e["road"] >= nr for n in (e["u"], e["v"])}
    junction_ = {n for n, ks in inc.items() if len(ks) != 2 or n in span_nodes}
    links, seen = [], set()
    for n0 in junction_:
        for k0 in inc[n0]:
            if k0 in seen:
                continue
            chain, n, k, total = [], n0, k0, 0.0
            while True:
                seen.add(k)
                chain.append(k)
                total += E[k]["len"]
                n = E[k]["v"] if E[k]["u"] == n else E[k]["u"]
                if n in junction_:
                    break
                k = inc[n][0] if inc[n][1] == k else inc[n][1]
            links.append(dict(a=n0, b=n, keys=chain, len=total))
    M = nx.MultiGraph()
    for li, l_ in enumerate(links):
        M.add_edge(l_["a"], l_["b"], key=li, len=l_["len"])
    loops = 0
    for li in sorted(range(len(links)), key=lambda i: -links[i]["len"]):
        l_ = links[li]
        a_, b_ = l_["a"], l_["b"]
        if l_["len"] > (450 if l_["a"] == l_["b"] else 600) or any(E[k]["road"] >= nr for k in l_["keys"]):
            continue
        if a_ == b_ and l_["len"] < 80:  # a junction's own knot of short pieces, not a loop
            continue
        if M.degree(a_) < 3 or M.degree(b_) < 3:
            continue
        nodes = {E[k][w] for k in l_["keys"] for w in ("u", "v")}
        if any(in_zone(*g["pos"][n]) or protect(*g["pos"][n]) and n not in (a_, b_) for n in nodes):
            continue
        if a_ == b_:  # a lasso: a loop off one junction, going nowhere
            M.remove_edge(a_, b_, key=li)
            for k in l_["keys"]:
                alive[k] = False
            loops += 1
            continue
        M.remove_edge(a_, b_, key=li)
        G2 = nx.Graph()
        for x, y, d in M.edges(data=True):
            if not G2.has_edge(x, y) or G2[x][y]["len"] > d["len"]:
                G2.add_edge(x, y, len=d["len"])
        try:
            dist, path = nx.single_source_dijkstra(G2, a_, b_, cutoff=1000 - l_["len"], weight="len") if a_ in G2 and b_ in G2 else (None, None)
        except nx.NetworkXNoPath:
            dist, path = None, None
        ok = dist is not None and all(G2[x][y]["len"] <= l_["len"] for x, y in zip(path[:-1], path[1:]))
        ok = ok and not any(in_zone(*g["pos"][n]) for n in path)
        if ok:
            for k in l_["keys"]:
                alive[k] = False
            loops += 1
        else:
            M.add_edge(a_, b_, key=li, len=l_["len"])
    for k, e in enumerate(E):
        if e["road"] >= nr:
            alive[k] = False
    roads = g["rebuild"](alive)
    roads = [line for line in roads if len(line) >= 2]
    unhook(roads)
    def spurs(lines, limit, rounds=3):
        """Spurs to nowhere: from each loose end (not at a site or bridge) back along the road to
        its first junction; a spur no longer than `limit` goes. Roads between junctions are never
        touched, so no through road is lost. Returns the lines and the length removed."""
        removed = 0.0
        for _ in range(rounds):
            nr_ = len(lines)
            g_ = road_graph(lines + [[tuple(a_), tuple(b_)] for a_, b_ in spans], 4.0)
            E_ = g_["edges"]
            adj: dict = {}
            for k, e in enumerate(E_):
                if e["u"] != e["v"]:
                    adj.setdefault(e["u"], []).append(k)
                    adj.setdefault(e["v"], []).append(k)
            span_nodes_ = {n for e in E_ if e["road"] >= nr_ for n in (e["u"], e["v"])}
            alive_ = [e["road"] < nr_ for e in E_]
            gone = 0.0
            for n0, ks in adj.items():
                if len(ks) != 1 or n0 in span_nodes_ or protect(*g_["pos"][n0]) or in_zone(*g_["pos"][n0]):
                    continue
                chain, n, k, total = [], n0, ks[0], 0.0
                while True:
                    chain.append(k)
                    total += E_[k]["len"]
                    n = E_[k]["v"] if E_[k]["u"] == n else E_[k]["u"]
                    if len(adj[n]) != 2 or n in span_nodes_ or protect(*g_["pos"][n]) or total > limit:
                        break
                    k = adj[n][0] if adj[n][1] == k else adj[n][1]
                if total <= limit and all(alive_[c] for c in chain):
                    for c in chain:
                        alive_[c] = False
                    gone += total
            lines = [l_ for l_ in g_["rebuild"](alive_) if len(l_) >= 2]
            removed += gone
            if not gone:
                break
        return lines, removed

    # (c) Short spurs still leading nowhere go (up to 300 m back to their junction).
    roads, pruned_len = spurs(roads, 300.0)
    # Least-cost routes over the terrain (slope costs, water is impassable) on a coarse grid.
    from skimage.graph import MCP_Geometric

    C = 4  # cost grid: every 4th height sample (15.6 m)
    hs = h_grid[::C, ::C]
    gy, gx = np.gradient(hs, SPACING * C)
    slope = np.hypot(gx, gy)
    cost = 1.0 + 60.0 * slope**2 + np.where(slope > 0.25, 200.0, 0.0)
    cost[water_grid[::C, ::C]] = np.inf
    # Nor through a town, the Superstore or a site's pad (their own streets and yards).
    zi, zj = np.mgrid[0 : cost.shape[0], 0 : cost.shape[1]]
    zx, zz = zj * C * SPACING - HALF, zi * C * SPACING - HALF
    for cx_, cz_, r_ in zone_discs:
        cost[np.hypot(zx - cx_, zz - cz_) < r_] = np.inf
    for x0_, x1_, z0_, z1_ in zone_rects:
        cost[(zx >= x0_) & (zx <= x1_) & (zz >= z0_) & (zz <= z1_)] = np.inf

    def cell(p_):
        gi_, gj_ = world_to_grid(*p_)
        return (int(np.clip(round(gj_ / C), 0, cost.shape[0] - 1)), int(np.clip(round(gi_ / C), 0, cost.shape[1] - 1)))

    def terrain_route(srcs, dsts):
        """The cheapest route from any of `srcs` to any of `dsts` (world points), as a smoothed
        polyline from the source point to the destination point, or None."""
        srcs = [p_ for p_ in srcs if np.isfinite(cost[cell(p_)])]
        dsts = [q for q in dsts if np.isfinite(cost[cell(q)])]
        if not srcs or not dsts:
            return None
        mcp = MCP_Geometric(cost)
        costs, _ = mcp.find_costs(list({cell(p_) for p_ in srcs}))
        best = None
        for q in dsts:
            ij = cell(q)
            if np.isfinite(costs[ij]) and (best is None or costs[ij] < best[0]):
                best = (costs[ij], ij, q)
        if best is None:
            return None
        cells = mcp.traceback(best[1])
        first = (cells[0][1] * C * SPACING - HALF, cells[0][0] * C * SPACING - HALF)
        src = min(srcs, key=lambda p_: np.hypot(p_[0] - first[0], p_[1] - first[1]))
        pts = [((j * C) * SPACING - HALF, (i * C) * SPACING - HALF) for i, j in cells]
        pts = chaikin(rdp(pts, 6.0), 2)
        return [tuple(src)] + pts[1:-1] + [tuple(best[2])] if len(pts) > 2 else [tuple(src), tuple(best[2])]

    # Road ends just short of a bridge's end (within 15 m) meet it exactly.
    for line in roads:
        for k_ in (0, -1):
            q = min(span_pts, key=lambda p_: np.hypot(p_[0] - line[k_][0], p_[1] - line[k_][1]), default=None)
            if q is not None and 0 < np.hypot(q[0] - line[k_][0], q[1] - line[k_][1]) < 15:
                line[k_] = tuple(q)
    roads = [line for line in roads if sum(np.hypot(q[0] - p_[0], q[1] - p_[1]) for p_, q in zip(line[:-1], line[1:])) > 1.0]
    # (d) Pieces of the network cut off from the rest (no road between them and the island's main
    #     network) are joined to it by the cheapest route over the ground.
    g = road_graph(roads + [[tuple(a_), tuple(b_)] for a_, b_ in spans], 4.0)
    Gc = nx.Graph()
    for e in g["edges"]:
        Gc.add_edge(e["u"], e["v"], len=e["len"])
    comps = sorted(nx.connected_components(Gc), key=lambda c: -sum(d["len"] for _, _, d in Gc.subgraph(c).edges(data=True)))
    main_pts = [g["pos"][n] for n in comps[0]] if comps else []
    rejoined = 0
    for comp in comps[1:]:
        has_span = any(min(np.hypot(g["pos"][n][0] - q[0], g["pos"][n][1] - q[1]) for q in span_pts) < 1 for n in comp)
        if sum(d["len"] for _, _, d in Gc.subgraph(comp).edges(data=True)) < 150 and not has_span:
            continue
        pts_ = [g["pos"][n] for n in comp]
        near = [q for q in main_pts if min(np.hypot(q[0] - p_[0], q[1] - p_[1]) for p_ in pts_) < 2500]
        path = terrain_route(pts_, near) if near else None
        if path:
            roads.append(path)
            rejoined += 1
    # (e) Every site has a road in: a site with no road inside its reach gets one, routed over
    #     the terrain from the nearest road to its entrance (not the mountain, which is climbed).
    routed = []
    for name, (tx, tz), reach in access:
        if any(np.hypot(c[0] - tx, c[1] - tz) < reach for line in roads for c in line):
            continue
        cand = [c for _, c in sorted(((np.hypot(c[0] - tx, c[1] - tz), c) for line in roads for c in line[::3]), key=lambda t: t[0])[:40]]
        path = terrain_route(cand, [(tx, tz)])
        if path and name != "murder-cabins":
            # It stops at the site's edge (half its reach out), not among its buildings.
            k_ = next((k for k, q in enumerate(path) if np.hypot(q[0] - tx, q[1] - tz) < reach * 0.5), len(path))
            path = path[: max(k_, 2)]
        if path:
            roads.append(path)
            routed.append(name)
    print("road finish: %d dead ends joined to the network, %d loops and doubled stretches undone, %.1f km of spurs to nowhere removed, %d cut-off pieces rejoined, roads routed to %s"
          % (joined_ends, loops, pruned_len / 1000, rejoined, routed or "no site (all had one)"))
    print(
        "road finish: %d roads cut out of water, %d bridge ends linked%s, %d junction gaps closed, %d hairpins removed, %d stubs dropped"
        % (cut, linked, (" (unlinked: %s)" % unlinked) if unlinked else "", closed, hooks, stubs)
    )
    return roads


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
# World metres. North of the strait: a coast road from Murder Cabins' road over the west
# bridge's head along the shore to the east bridge's head (before, the east bridge's north end
# ran 400 m into a field and stopped), a spur up to Southern Military Base's south road, and on
# from the east bridge to the Riverwood channel's bridge (East Works). On the Superstore island:
# a road along its north coast between the two bridge heads, and one from the west bridge down
# past Island Village to the south coast road. Each was checked on the terrain: dry all the way,
# at most ~13 % at its steepest (road_profile grades the rest).
STRAIT_ROADS = [
    [(-2950, 1580), (-2700, 1900), (-2350, 2200), (-1900, 2380), (-1450, 2420), (-1050, 2400), (-771.2, 2364.4)],
    [(-771.2, 2364.4), (-450, 2260), (-50, 2140), (400, 2170), (900, 2280), (1400, 2320), (1900, 2330), (2250, 2390), (2474.6, 2474.6)],
    [(1000, 2290), (1030, 2050), (1080, 1840)],
    [(2474.6, 2474.6), (2560, 2200), (2660, 1950), (2760, 1760), (2840.9, 1644.5)],
    [(-686.4, 3169.5), (-300, 3230), (200, 3200), (700, 3220), (1200, 3240), (1700, 3250), (2100, 3300), (2347.5, 3296.6)],
    [(-686.4, 3169.5), (-880, 3450), (-1050, 3750), (-1120, 4050), (-1120, 4300), (-1128, 4440), (-1150, 4545)],
]

def strait_roads(roads: list, water_at) -> list:
    """The strait's roads go in after the network is joined up and tidied, as drawn (the first
    try fed them in with the traced roads: the tidy-up cut the coast road in two 16 m apart and
    looped stubs round the west bridge's head). Each is smoothed like the manual roads; its ends
    are tied to the nearest road within 60 m (a point is put on that road where they meet), and
    any other road that stops within 25 m of one of them runs on to it."""
    lines = [chaikin([(float(x), float(z)) for x, z in line], 2) for line in STRAIT_ROADS]

    def closest(line, x, z):
        best = (np.inf, 0, (x, z))
        for k in range(len(line) - 1):
            (ax, az), (bx, bz) = line[k][:2], line[k + 1][:2]
            dx, dz = bx - ax, bz - az
            ll = dx * dx + dz * dz
            t = 0.0 if ll < 1e-9 else max(0.0, min(1.0, ((x - ax) * dx + (z - az) * dz) / ll))
            px, pz = ax + t * dx, az + t * dz
            d = float(np.hypot(px - x, pz - z))
            if d < best[0]:
                best = (d, k, (float(px), float(pz)))
        return best

    def tie(line, end, others, reach):
        x, z = line[end][:2]
        hit = None
        for o in others:
            if o is line or len(o) < 2:
                continue
            d, k, q = closest(o, x, z)
            if d < reach and (hit is None or d < hit[0]):
                hit = (d, o, k, q)
        if hit is None or hit[0] < 0.5:
            return hit is not None
        d, o, k, q = hit
        if np.hypot(q[0] - o[k][0], q[1] - o[k][1]) > 0.5 and np.hypot(q[0] - o[k + 1][0], q[1] - o[k + 1][1]) > 0.5:
            o.insert(k + 1, q)
        if end == -1:
            line.append(q)
        else:
            line.insert(0, q)
        return True

    wet = sum(1 for line in lines for x, z in line if water_at(x, z))
    for line in lines:
        for end in (0, -1):
            if not tie(line, end, lines + roads, 60.0):
                print("strait road end not tied:", [round(v, 1) for v in line[end]])
    joined = 0
    for r in roads:
        for end in (0, -1):
            x, z = r[end][:2]
            if 1400 < z < 4500 and -3200 < x < 3200 and tie(r, end, lines, 25.0):
                joined += 1
    roads = roads + lines
    print(f"strait roads: {len(lines)} drawn, {joined} road ends run on to them, {wet} points over water")
    return roads


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
        rivers=[dict(id=r["id"], width=r["width"], points=[[round(v, 1) for v in p] for p in (lambda q: q[::4] + ([q[-1]] if (len(q) - 1) % 4 else []))(river_line(r))]) for r in RIVERS],
        bridges=result["bridges"],
        perches=result["perches"],
        runways=[dict(a=[round(v, 1) for v in px_to_world(*a)], b=[round(v, 1) for v in px_to_world(*b)], width=w) for a, b, w in RUNWAYS],
        roads=[dict(width=ROAD_WIDTH, points=[[round(x, 1), round(z, 1)] for x, z in line]) for line in result["roads"]],
        roadEnds=[list(e) for e in result["road_ends"]],
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
