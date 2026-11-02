"""
CROSSFIRE (urban 1v1 aim arena): the single source of truth for its gameplay solids.

  python3 art/blender/crossfire/layout.py   # writes src/lib/fps/crossfire-layout.ts + build/layout.json

Conventions as the other maps: metres, feet at y = 0; x runs along the 48 m axis (spawn A west,
spawn B east), z along the 40 m axis (north = -z). Every gameplay solid is an axis-aligned box.

Balance by point symmetry: each solid at (x, z) has an identical twin at (-x, -z), so both
spawns get the same cover, routes and timings while the dressing differs completely (A side:
residential block and market alley; B side: transport terminal and construction passage).

Layers:
  "box"     blocks movement and bullets (BOXES); tops are walkable
  "bullet"  bullets only, above head height (STRUCTURES): interior ceilings and upper floors,
            so the practice bot's ground grid still runs through the interiors

Areas (A side; the B side is the 180-degree twin)
  Crash square      x -12..12, z -9..9: the wreck of a heavy transport helicopter lying on its
                    belly along x (enterable cabin: side door on each flank, window slits, solid
                    nose and rear), its broken tail boom, an abandoned pickup, jersey barriers
                    and supply crates.
  Market alley      z 11.5..16 (A's close flank), shop backs separate it from the square with
                    two connectors; twin: the construction passage at z -16..-11.5.
  Residential block x -24..-14, z -9..1: an enterable ground floor (two doors, a window band
                    toward the square); twin: the transport terminal.
  Roof terrace      x -18..-12, z -16..-9 at 3 m, parapets, reached by stairs from the square's
                    west street; overlooks the construction passage and the square's north half.
                    Twin: the B terrace over the market alley.
  Spawn yard        x -24..-14, z 1..11.5 with a spawn shield; opens to the market alley and
                    the west street.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))

ARENA = {"width": 48.0, "depth": 40.0}
STEP = 0.3            # stair riser; simulation STEP_HEIGHT is 0.35
TERRACE = 3.0         # roof terrace deck
LOW = 1.15            # hides a crouched player (head top 1.05 m)
CRATE = 1.3           # jumpable crate (shared jump clears ~1.54 m)
SILL = 0.95           # window sill (below the jump-tested 1.0 m range)
WALL = 0.3            # interior building wall thickness
CEIL = 3.4            # ground-floor ceiling (bullet-only above)

solids = []


def box(id, x0, x1, z0, z1, y0, y1, surface, kind, layer="box", side=None):
    assert x0 < x1 and z0 < z1 and y0 < y1, id
    solids.append({
        "id": id, "x": round((x0 + x1) / 2, 4), "y": round((y0 + y1) / 2, 4), "z": round((z0 + z1) / 2, 4),
        "w": round(x1 - x0, 4), "h": round(y1 - y0, 4), "d": round(z1 - z0, 4),
        "surface": surface, "kind": kind, "layer": layer, "side": side,
    })


def twin(id, x0, x1, z0, z1, y0, y1, surface, kind, layer="box", kind_b=None, surface_b=None):
    """A-side solid and its 180-degree twin on the B side."""
    box(f"{id}-a", x0, x1, z0, z1, y0, y1, surface, kind, layer, "a")
    box(f"{id}-b", -x1, -x0, -z1, -z0, y0, y1, surface_b or surface, kind_b or kind, layer, "b")


def centred(id, x0, x1, z0, z1, y0, y1, surface, kind, layer="box"):
    """A solid that is its own twin (symmetric about the origin)."""
    assert abs(x0 + x1) < 1e-9 and abs(z0 + z1) < 1e-9, id
    box(id, x0, x1, z0, z1, y0, y1, surface, kind, layer, "centre")


# ------------------------------------------------------------------ edge blocks (tall, solid)
# South edge (A: market shopfronts) and its twin north edge (B: construction yard sheds).
twin("south-shops-w", -24, -10, 16, 20, 0, 7.5, "concrete", "shop-row", kind_b="industrial-row")
twin("south-shops-c", -10, 4, 16, 20, 0, 6.5, "concrete", "shop-row", kind_b="industrial-row")
twin("south-shops-e", 4, 12, 16, 20, 0, 8.2, "concrete", "shop-row", kind_b="industrial-row")
# The B terrace block's twin sits at the north-west: tall residential tower with a roof terrace.
twin("tower", -24, -18, -16, -9, 0, 9.0, "concrete", "apartment-tower", kind_b="terminal-tower")
twin("terrace", -18, -12, -16, -9, 0, TERRACE, "concrete", "terrace", kind_b="terrace")
# Terrace parapets (cover for a crouched player on the deck), with a gap above the stairs.
twin("parapet-s", -18, -14.2, -9.3, -9.0, TERRACE, TERRACE + 0.95, "concrete", "parapet")
twin("parapet-e", -12.3, -12.0, -16, -11.0, TERRACE, TERRACE + 0.95, "concrete", "parapet")
# Stairs to the terrace in the west street, rising north against the residential block.
for i in range(1, 11):
    z1 = -9.0 + 0.55 * (10 - i)
    twin(f"terrace-stair-{i:02d}", -14.0, -12.6, z1, z1 + 0.55, 0, STEP * i, "concrete", "stair")
# North edge west of the construction passage: the tower's twin covers x 18..24 z 9..16 etc.
twin("north-w", -24, -12, -20, -16, 0, 8.6, "concrete", "apartment-rear", kind_b="terminal-rear")

# ------------------------------------------------------------------ residential block (A) / terminal (B)
RX0, RX1, RZ0, RZ1 = -24.0, -14.0, -9.0, 1.0
twin("res-wall-n", RX0, RX1, RZ0, RZ0 + WALL, 0, CEIL, "concrete", "res-wall")
# East wall (toward the square): door near the south end, a window band in the middle.
twin("res-wall-e1", RX1 - WALL, RX1, RZ0 + WALL, -5.6, 0, CEIL, "concrete", "res-wall")
twin("res-sill-e", RX1 - WALL, RX1, -5.6, -2.6, 0, SILL, "concrete", "res-sill")
twin("res-head-e", RX1 - WALL, RX1, -5.6, -2.6, 2.3, CEIL, "concrete", "res-header")
twin("res-wall-e2", RX1 - WALL, RX1, -2.6, -1.6, 0, CEIL, "concrete", "res-wall")
twin("res-wall-e3", RX1 - WALL, RX1, 0.0, RZ1, 0, CEIL, "concrete", "res-wall")
# South wall (toward the spawn yard): door x -20..-18.4.
twin("res-wall-s1", RX0, -20.0, RZ1 - WALL, RZ1, 0, CEIL, "concrete", "res-wall")
twin("res-wall-s2", -18.4, RX1, RZ1 - WALL, RZ1, 0, CEIL, "concrete", "res-wall")
# Ceiling and the floors above (bullets only, so the bot's grid still runs inside).
twin("res-ceiling", RX0, RX1, RZ0, RZ1, CEIL, CEIL + 0.3, "concrete", "res-ceiling", layer="bullet")
twin("res-upper", RX0, RX1 - 0.6, RZ0, RZ1, CEIL + 0.3, 8.4, "concrete", "res-upper", layer="bullet")
# Interior cover: a counter and a structural column.
twin("res-counter", -21.6, -19.4, -6.4, -5.6, 0, LOW, "wood", "counter", kind_b="ticket-counter")
twin("res-column", -17.3, -16.7, -3.8, -3.2, 0, CEIL, "concrete", "column")

# ------------------------------------------------------------------ spawn yard (A) / transport yard (B)
twin("spawn-shield", -17.6, -16.8, 3.8, 9.2, 0, 2.6, "concrete", "spawn-shield", kind_b="transport-barrier")
# The yard's square side: walls with one gate (z 4..6.2), so the centre route turns twice.
twin("yard-wall-1", -14.3, -14.0, 1.0, 4.0, 0, 2.6, "concrete", "yard-wall", kind_b="yard-fence")
twin("yard-wall-2", -14.3, -14.0, 6.2, 9.0, 0, 2.6, "concrete", "yard-wall", kind_b="yard-fence")
twin("yard-crates", -23.4, -22.2, 1.4, 2.6, 0, CRATE, "wood", "crate")
twin("yard-car", -21.0, -16.6, 10.0, 11.6, 0, 1.55, "metal", "car", kind_b="van")

# ------------------------------------------------------------------ shop backs between square and market alley
# Row z 9..11.5 from x -12 to 12; connectors at x -8..-6 and x 3..5, open at x 9.5..12 (east end).
twin("row-s1", -14.3, -8.0, 9.0, 11.5, 0, 3.6, "concrete", "shop-back", kind_b="site-office")
twin("row-s2", -6.0, 3.0, 9.0, 11.5, 0, 3.6, "concrete", "shop-back", kind_b="site-office")
twin("row-s3", 5.0, 9.5, 9.0, 11.5, 0, 3.6, "concrete", "shop-back", kind_b="site-office")

# ------------------------------------------------------------------ market alley cover (A) / construction passage (B)
twin("alley-stall-1", -10.4, -8.6, 14.0, 16.0, 0, LOW, "wood", "market-stall", kind_b="pipe-stack", surface_b="metal")
twin("alley-stall-2", -1.6, 0.2, 11.5, 13.2, 0, LOW, "wood", "market-stall", kind_b="pipe-stack", surface_b="metal")
twin("alley-crates", 6.2, 7.4, 14.6, 16.0, 0, CRATE, "wood", "crate")
twin("alley-shutter-box", -14.0, -12.4, 11.5, 12.9, 0, 2.2, "metal", "kiosk", kind_b="generator")

# ------------------------------------------------------------------ crash square
# Helicopter wreck: the Mi-8 model (art/blender/crossfire/source/mi8, fitted by heli.py) lying on
# its belly along x, nose west. At 3x model scale the fuselage is 11 m long and 3 m wide; its
# flanks lean inward above shoulder height, so each flank is three stacked layers that follow the
# hull (lower wall, shoulder, upper shoulder) under a roof block. Enterable cabin: a side door on
# each flank (twins), window slits, a centre bulkhead. Cabin interior: |x| < 3.7 (the model's port door ends at x -3.69), |z| < 1.0.
HX, HZ, CAB, HTOP = 5.5, 1.50, 3.7, 2.6
LOWER = (0.0, 1.4, 1.30, HZ)  # (y0, y1, |z| inner, |z| outer)
SHOULDER = (1.4, 2.1, 0.98, 1.45)
UPPER = (2.1, HTOP, 0.72, 1.22)
centred("heli-roof", -CAB, CAB, -0.85, 0.85, HTOP, 3.3, "metal", "heli-roof")
# Nose and closed rear: curved, so their boxes are fitted to the model by fit_heli.py
# (heli_fit.json: x slabs in two layers). The model is not symmetric end to end, so these are
# the only solids without an exact twin; the layout test bounds the difference.
FIT_PATH = os.path.join(HERE, "heli_fit.json")
FIT = json.load(open(FIT_PATH)) if os.path.exists(FIT_PATH) else None
if FIT:
    for end, side, kind in (("nose", "a", "heli-nose"), ("rear", "b", "heli-rear")):
        for i, (x0, x1, z0, z1, y0, y1) in enumerate(FIT[end]):
            box(f"heli-{end}-{i}", x0, x1, z0, z1, y0, y1, "metal", kind, side=side)
else:  # first fit: plain end blocks
    twin("heli-nose", -HX, -CAB, -HZ, HZ, 0, 3.0, "metal", "heli-nose", kind_b="heli-rear")
twin("heli-upper", -CAB, CAB, -UPPER[3], -UPPER[2], UPPER[0], UPPER[1], "metal", "heli-wall")
# The cabin ceiling drops towards the cockpit and the clamshell doors.
twin("heli-hood", -CAB, -2.5, -UPPER[2], UPPER[2], UPPER[0], UPPER[1], "metal", "heli-roof")


def flank(name, x0, x1, layers):
    for i, (y0, y1, zi, zo) in enumerate(layers):
        twin(f"heli-{name}-{i}", x0, x1, -zo, -zi, y0, y1, "metal", "heli-wall")


# North flank, west to east (the south flank is its twin): wall, window slit (sill 1.1, open to
# 1.6), wall, door (x 1.2 to the rear block, lintel 2.1). The south door is the model's own
# port-side cabin door widened to the same gap.
SLIT = ((0.0, 1.1, LOWER[2], LOWER[3]), (1.6, SHOULDER[1], SHOULDER[2], SHOULDER[3]))
flank("wall-n1", -CAB, -3.2, (LOWER, SHOULDER))
flank("slit-n", -3.2, -2.0, SLIT)
flank("wall-n2", -2.0, 1.2, (LOWER, SHOULDER))
# Cargo bulkhead at the cabin centre: the doors are twins, so they always line up through the
# origin; this blocks that line and leaves a passage on each side.
centred("heli-bulkhead", -0.5, 0.5, -0.2, 0.2, 0, HTOP, "metal", "heli-bulkhead")
# The broken tail boom, in two pieces thrown clear in the crash.
if FIT and isinstance(FIT.get("tail"), list):  # the two boom pieces: identical, fitted slabs
    for i, (x0, x1, z0, z1, y0, y1) in enumerate(FIT["tail"]):
        twin(f"heli-tail-{i}", x0, x1, z0, z1, y0, y1, "metal", "heli-tail")
else:
    twin("heli-tail", 8.3, 11.3, 4.4, 5.4, 0, 1.3, "metal", "heli-tail", kind_b="heli-tail")
# The main rotor mast and hub torn off beside the fuselage (breaks the lanes along its flanks).
twin("rotor-debris", -0.2, 1.6, 1.7, 2.6, 0, 1.2, "metal", "rotor-hub")
# Abandoned pickup and supply crates.
twin("pickup", -9.8, -5.6, 4.4, 6.4, 0, 1.6, "metal", "pickup", kind_b="pickup")
twin("square-crates", 1.0, 2.3, 5.2, 6.5, 0, CRATE, "wood", "supply-crate")
twin("barrier-1", -4.2, -1.6, -6.0, -5.4, 0, LOW, "concrete", "jersey-barrier")
twin("barrier-2", 8.4, 10.4, -0.9, -0.3, 0, LOW, "concrete", "jersey-barrier")
# Outside the residential east door: a stacked-crate screen 1.2 m off the wall (breaks the
# door-to-gate lines; the exit becomes a short S-bend).
twin("door-cover", -12.8, -11.6, -2.2, 1.2, 0, 2.2, "wood", "crate-stack", kind_b="cargo-stack")

walls = [
    {"id": "wall-west", "x": -24.4, "y": 4.5, "z": 0, "w": 0.8, "h": 9.0, "d": 41.6, "surface": "concrete"},
    {"id": "wall-east", "x": 24.4, "y": 4.5, "z": 0, "w": 0.8, "h": 9.0, "d": 41.6, "surface": "concrete"},
    {"id": "wall-north", "x": 0, "y": 4.5, "z": -20.4, "w": 48, "h": 9.0, "d": 0.8, "surface": "concrete"},
    {"id": "wall-south", "x": 0, "y": 4.5, "z": 20.4, "w": 48, "h": 9.0, "d": 0.8, "surface": "concrete"},
]
spawns = {"A": {"x": -21.6, "z": 6.5, "yaw": -1.5707963267948966}, "B": {"x": 21.6, "z": -6.5, "yaw": 1.5707963267948966}}


def emit():
    ids = [s["id"] for s in solids]
    assert len(ids) == len(set(ids)), "duplicate ids"
    os.makedirs(os.path.join(HERE, "build"), exist_ok=True)
    with open(os.path.join(HERE, "build", "layout.json"), "w") as f:
        json.dump({"arena": ARENA, "solids": solids, "walls": walls, "spawns": spawns}, f, indent=1)

    def row(s):
        return (f'  {{ id: "{s["id"]}", x: {s["x"]}, y: {s["y"]}, z: {s["z"]}, w: {s["w"]}, h: {s["h"]}, '
                f'd: {s["d"]}, surface: "{s["surface"]}" }},')

    boxes = [s for s in solids if s["layer"] == "box"]
    bullets = [s for s in solids if s["layer"] == "bullet"]
    ts = [
        "// Generated by art/blender/crossfire/layout.py — edit the layout there, then re-run it.",
        "// CROSSFIRE urban 1v1 aim arena: gameplay solids (metres, feet at y = 0, box centres + full sizes).",
        'import type { Solid } from "./map";',
        "",
        f"export const CROSSFIRE_SIZE = {{ width: {ARENA['width']}, depth: {ARENA['depth']} }} as const;",
        "/** Block movement and bullets; tops are walkable. */",
        "export const CROSSFIRE_BOXES: Solid[] = [",
        *[row(s) for s in boxes],
        "];",
        "/** Bullets only (ceilings and upper floors, above head height). */",
        "export const CROSSFIRE_STRUCTURES: Solid[] = [",
        *[row(s) for s in bullets],
        "];",
        "/** Perimeter: bullets (movement is bounded by the arena rectangle). */",
        "export const CROSSFIRE_WALLS: Solid[] = [",
        *[row(s) for s in walls],
        "];",
        "export const CROSSFIRE_SPAWNS = {",
        f"  A: {{ x: {spawns['A']['x']}, z: {spawns['A']['z']}, yaw: -Math.PI / 2 }},",
        f"  B: {{ x: {spawns['B']['x']}, z: {spawns['B']['z']}, yaw: Math.PI / 2 }},",
        "} as const;",
        "",
    ]
    with open(os.path.join(ROOT, "src/lib/fps/crossfire-layout.ts"), "w") as f:
        f.write("\n".join(ts))
    print(f"{len(boxes)} boxes, {len(bullets)} bullet-only, {len(walls)} walls")


if __name__ == "__main__":
    emit()
