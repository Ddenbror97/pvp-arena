"""
FROSTLINE (winter 1v1 aim arena): the single source of truth for its gameplay solids.

  python3 art/blender/frostline/layout.py   # writes src/lib/fps/frostline-layout.ts + build/layout.json

Same conventions as the AIM ARENA (art/blender/map/layout.py): metres, feet at y = 0; x runs
along the 40 m axis (spawn A west / -x, spawn B east / +x), z along the 32 m axis (upper
communications route north / -z, lower industrial route south / +z). Every gameplay solid is an
axis-aligned box mirrored across x = 0 (identical cover, routes and timings for both spawns);
only the dressing differs (west: Soviet barracks and guard post; east: watchtower and
industrial). Blender dresses exactly these boxes.

Layers:
  "box"     blocks movement and bullets (BOXES)
  "bullet"  bullets only, above head height (STRUCTURES): the warehouse loading-bay roof

Routes
  A  central courtyard (24 x 19.5 m): centre generator stack, lane containers, a snowed-in car
     and low cover; the main aim duel.
  B  upper communications route: corridor along the comms building, whose concrete walkway
     (1.5 m, railing) is the one elevated position; stairs at both ends, counter-angles from the
     courtyard through the fence openings.
  C  lower industrial route: corridor along the warehouse with container S-bends, then the
     covered loading bay (roofed passage) and gates back into the courtyard.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))

ARENA = {"width": 40.0, "depth": 32.0}
STEP = 0.3            # stair riser; simulation STEP_HEIGHT is 0.35
WALK_TOP = 1.5        # comms walkway deck
LOW_COVER = 1.15      # hides a crouched player (head top 1.05 m); jump apex is 0.89 m
FENCE_H = 2.4         # courtyard concrete fence (opaque to standing players)
BAND = 13.5           # inner face of the north/south building bands
FENCE_N = (-9.75, -9.4)
FENCE_S = (9.4, 9.75)

solids = []


def box(id, x0, x1, z0, z1, y0, y1, surface, kind, layer="box", theme=None):
    solids.append({
        "id": id, "x": round((x0 + x1) / 2, 4), "y": round((y0 + y1) / 2, 4), "z": round((z0 + z1) / 2, 4),
        "w": round(x1 - x0, 4), "h": round(y1 - y0, 4), "d": round(z1 - z0, 4),
        "surface": surface, "kind": kind, "layer": layer, "theme": theme,
    })


def pair(id, x0, x1, z0, z1, y0, y1, surface, kind, layer="box", surface_east=None, kind_east=None):
    """Mirrored pair: west (-x) and east (+x)."""
    box(f"{id}-w", x0, x1, z0, z1, y0, y1, surface, kind, layer, "west")
    box(f"{id}-e", -x1, -x0, z0, z1, y0, y1, surface_east or surface, kind_east or kind, layer, "east")


def centred(id, x, z, w, d, h, surface, kind, y0=0.0, layer="box", theme="centre"):
    box(id, x - w / 2, x + w / 2, z - d / 2, z + d / 2, y0, y0 + h, surface, kind, layer, theme)


# ------------------------------------------------------------------ building bands (edges)
pair("barracks", -20, -8, -16, -BAND, 0, 6.4, "concrete", "barracks")
box("comms-building", -8, 8, -16, -BAND, 0, 7.0, "concrete", "comms-building", theme="centre")
pair("guardhouse", -20, -8, BAND, 16, 0, 5.6, "concrete", "guardhouse", surface_east="metal", kind_east="shed")
# Warehouse: solid end walls; the front is an open loading bay under a roof (covered passage).
pair("warehouse-end", -8, -7, BAND, 16, 0, 7.2, "metal", "warehouse-end")
box("warehouse-roof", -7, 7, BAND - 0.3, 16, 3.6, 3.9, "metal", "warehouse-roof", layer="bullet", theme="centre")
pair("bay-pillar", -3.6, -3.2, BAND, BAND + 0.4, 0, 3.6, "metal", "pillar")
pair("bay-pallets", -6.4, -4.6, 14.6, 16, 0, 1.3, "wood", "pallets")
centred("bay-crates", 0, 15.15, 2.4, 1.7, 2.2, "wood", "crate-stack")

# ------------------------------------------------------------------ communications walkway (route B)
WZ0, WZ1 = -BAND, -11.8
box("walkway", -4.6, 4.6, WZ0, WZ1, 0, WALK_TOP, "concrete", "walkway", theme="centre")
for i in range(1, 5):
    # Steps rise toward the walkway: step 1 (0.3 m) is the outermost.
    x1 = -4.6 - 0.62 * (4 - i)
    pair(f"walk-stair-{i}", x1 - 0.62, x1, WZ0, WZ1, 0, STEP * i, "concrete", "stair")
box("walkway-railing", -4.6, 4.6, WZ1 - 0.2, WZ1, WALK_TOP, WALK_TOP + LOW_COVER, "metal", "railing", theme="centre")

# ------------------------------------------------------------------ courtyard boundary fences
pair("fence-n-outer", -12, -8.8, *FENCE_N, 0, FENCE_H, "concrete", "fence")
pair("fence-n-inner", -6.0, -2.2, *FENCE_N, 0, FENCE_H, "concrete", "fence")
pair("fence-s-outer", -12, -9.6, *FENCE_S, 0, FENCE_H, "concrete", "fence")
pair("fence-s-inner", -6.6, -1.6, *FENCE_S, 0, FENCE_H, "concrete", "fence")

# ------------------------------------------------------------------ spawn yards
pair("spawn-shield", -14.4, -13.6, -3.0, 3.0, 0, 2.6, "concrete", "spawn-shield")
pair("guard-hut", -17.2, -12.0, -9.75, -5.4, 0, 3.2, "concrete", "guard-hut", surface_east="metal", kind_east="cabin")
pair("fuel-store", -17.2, -12.0, 5.4, 9.75, 0, 2.6, "metal", "container")

# ------------------------------------------------------------------ courtyard cover (route A)
# The two lane blockers (north crate stack, south container) cover the spawn-exit bands
# (|z| 3–5.4 m) so no exit sees the other side's exit; the generator, the transformer and the
# truck break the three east–west lanes at x = 0. Low cover fills the duel space between them.
centred("generator-stack", 0, 0, 3.2, 4.0, 2.6, "metal", "generator-stack")
pair("lane-stack", -8.6, -6.4, -6.0, -2.0, 0, 2.2, "wood", "crate-stack")
pair("lane-container", -8.84, -6.4, 1.2, 7.26, 0, 2.59, "metal", "container")
centred("transformer", 0, -6.6, 2.6, 2.0, 2.4, "metal", "transformer")
centred("truck", 0, 6.6, 4.6, 2.0, 2.6, "metal", "truck")
pair("centre-crate", -5.0, -3.8, -1.0, 0.2, 0, 1.3, "wood", "crate")
pair("north-barrier", -6.0, -3.4, -7.0, -6.4, 0, LOW_COVER, "concrete", "jersey-barrier")
pair("south-tote", -5.2, -4.2, 4.0, 5.0, 0, LOW_COVER, "metal", "tote")
pair("west-crates", -11.6, -10.4, -0.6, 0.6, 0, 1.3, "wood", "crate")

# ------------------------------------------------------------------ upper route (north corridor)
# S-bend: the barracks annex (north) then a crate stack against the fence (south), so the
# corridor never shows one alley to the other.
pair("barracks-annex", -16.0, -13.0, -BAND, -11.3, 0, 3.4, "concrete", "annex", surface_east="metal", kind_east="annex")
pair("corridor-stack-n", -11.0, -9.4, -11.5, -9.75, 0, 2.2, "wood", "crate-stack")

# ------------------------------------------------------------------ lower route (south corridor)
pair("corridor-container", -6.5, -3.6, FENCE_S[1], 11.9, 0, 2.59, "metal", "container")
centred("corridor-crates", 0, 12.55, 2.6, 1.9, 2.2, "wood", "crate-stack")
pair("corridor-tote", -11.0, -10.0, 12.3, 13.3, 0, LOW_COVER, "metal", "tote")

# ------------------------------------------------------------------ perimeter (bullets; movement uses ARENA bounds)
walls = [
    {"id": "wall-west", "x": -20.4, "y": 3.2, "z": 0, "w": 0.8, "h": 6.4, "d": 33.6, "surface": "concrete"},
    {"id": "wall-east", "x": 20.4, "y": 3.2, "z": 0, "w": 0.8, "h": 6.4, "d": 33.6, "surface": "concrete"},
    {"id": "wall-north", "x": 0, "y": 3.2, "z": -16.4, "w": 40, "h": 6.4, "d": 0.8, "surface": "concrete"},
    {"id": "wall-south", "x": 0, "y": 3.2, "z": 16.4, "w": 40, "h": 6.4, "d": 0.8, "surface": "concrete"},
]
spawns = {"A": {"x": -18.2, "z": 0.0, "yaw": -1.5707963267948966}, "B": {"x": 18.2, "z": 0.0, "yaw": 1.5707963267948966}}


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
        "// Generated by art/blender/frostline/layout.py — edit the layout there, then re-run it.",
        "// FROSTLINE winter 1v1 aim arena: gameplay solids (metres, feet at y = 0, box centres + full sizes).",
        'import type { Solid } from "./map";',
        "",
        f"export const FROSTLINE_SIZE = {{ width: {ARENA['width']}, depth: {ARENA['depth']} }} as const;",
        "/** Block movement and bullets. */",
        "export const FROSTLINE_BOXES: Solid[] = [",
        *[row(s) for s in boxes],
        "];",
        "/** Bullets only (above head height). */",
        "export const FROSTLINE_STRUCTURES: Solid[] = [",
        *[row(s) for s in bullets],
        "];",
        "/** Perimeter: bullets (movement is bounded by the arena rectangle). */",
        "export const FROSTLINE_WALLS: Solid[] = [",
        *[row(s) for s in walls],
        "];",
        "export const FROSTLINE_SPAWNS = {",
        f"  A: {{ x: {spawns['A']['x']}, z: {spawns['A']['z']}, yaw: -Math.PI / 2 }},",
        f"  B: {{ x: {spawns['B']['x']}, z: {spawns['B']['z']}, yaw: Math.PI / 2 }},",
        "} as const;",
        "",
    ]
    with open(os.path.join(ROOT, "src/lib/fps/frostline-layout.ts"), "w") as f:
        f.write("\n".join(ts))
    print(f"{len(boxes)} boxes, {len(bullets)} bullet-only, {len(walls)} walls")


if __name__ == "__main__":
    emit()
