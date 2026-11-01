"""
PVPSPINARENA 1v1 aim arena: the single source of truth for gameplay solids.

  python3 art/blender/map/layout.py            # writes src/lib/fps/arena-layout.ts + build/layout.json

Coordinates are metres with feet at y = 0. x runs along the 40 m axis (spawn A west / -x,
spawn B east / +x), z along the 32 m axis (upper route north / -z, lower route south / +z).
Every gameplay solid is an axis-aligned box, mirrored across x = 0, so both spawns get identical
cover, routes, elevation and timings; only the visual theme differs (west Mediterranean
sandstone, east industrial). Blender builds the render meshes around exactly these boxes.

Box fields: id, x/y/z centre, w/h/d full size, surface (bullet impact material), kind
(what Blender dresses it as), and layer:
  "box"       blocks movement and bullets (map.ts BOXES)
  "bullet"    bullets only, above head height (map.ts STRUCTURES), e.g. arch lintels
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))

ARENA = {"width": 40.0, "depth": 32.0}
STEP = 0.3  # stair riser; simulation STEP_HEIGHT is 0.35
PLATFORM_TOP = 1.5
WALL_H = 4.4  # courtyard arcade walls
BAND_H = 6.0  # buildings on the north/south edges
LOW_COVER = 1.15  # hides a crouched player (head top 1.05 m) from the server visibility test; jump apex is 0.89 m

solids = []


def box(id, x0, x1, z0, z1, y0, y1, surface, kind, layer="box", theme=None):
    solids.append({
        "id": id, "x": round((x0 + x1) / 2, 4), "y": round((y0 + y1) / 2, 4), "z": round((z0 + z1) / 2, 4),
        "w": round(x1 - x0, 4), "h": round(y1 - y0, 4), "d": round(z1 - z0, 4),
        "surface": surface, "kind": kind, "layer": layer, "theme": theme,
    })


def pair(id, x0, x1, z0, z1, y0, y1, surface, kind, layer="box", surface_east=None, kind_east=None):
    """Mirrored pair: west (-x, Mediterranean) and east (+x, industrial)."""
    box(f"{id}-w", x0, x1, z0, z1, y0, y1, surface, kind, layer, "west")
    box(f"{id}-e", -x1, -x0, z0, z1, y0, y1, surface_east or surface, kind_east or kind, layer, "east")


def centred(id, x, z, w, d, h, surface, kind, y0=0.0, layer="box", theme=None):
    box(id, x - w / 2, x + w / 2, z - d / 2, z + d / 2, y0, y0 + h, surface, kind, layer, theme)


# ------------------------------------------------------------------ edge buildings (inside bounds)
for i, (x0, x1) in enumerate([(-20, -8), (-8, 8), (8, 20)]):
    theme = ["west", "centre", "east"][i]
    box(f"north-building-{i}", x0, x1, -16, -14.5, 0, BAND_H, "concrete", "edge-building", theme=theme)
    box(f"south-building-{i}", x0, x1, 14.5, 16, 0, BAND_H, "concrete" if i == 0 else "metal",
        "edge-building", theme=theme)

# ------------------------------------------------------------------ courtyard arcade walls
# North wall (upper route): arches at x = ±(6.8..9.8) and a central arch behind the tarp stack.
pair("north-wall-outer", -12, -9.8, -10.5, -10, 0, WALL_H, "concrete", "arcade-wall")
pair("north-wall-inner", -6.8, -1.3, -10.5, -10, 0, WALL_H, "concrete", "arcade-wall")
pair("north-arch-lintel", -9.8, -6.8, -10.5, -10, 3.2, WALL_H, "concrete", "arch-lintel", layer="bullet")
centred("north-arch-lintel-centre", 0, -10.25, 2.6, 0.5, WALL_H - 3.2, "concrete", "arch-lintel", y0=3.2, layer="bullet", theme="centre")
# South wall (lower route): two openings, industrial gates.
pair("south-wall-outer", -12, -9.8, 10, 10.5, 0, WALL_H, "concrete", "arcade-wall")
centred("south-wall-centre", 0, 10.25, 13.6, 0.5, WALL_H, "concrete", "arcade-wall", theme="centre")
pair("south-gate-lintel", -9.8, -6.8, 10, 10.5, 3.2, WALL_H, "concrete", "arch-lintel", layer="bullet")

# ------------------------------------------------------------------ elevated platform + stairs (x2)
pair("platform", -16, -12, -10.5, -6.6, 0, PLATFORM_TOP, "concrete", "platform")
pair("platform-ledge", -13.6, -12, -6.6, -3.2, 0, PLATFORM_TOP, "concrete", "platform")
for i in range(1, 6):
    z1 = -3.2 - 0.68 * (i - 1)
    z0 = -3.2 - 0.68 * i
    pair(f"stair-{i}", -15.6, -13.6, z0, z1, 0, STEP * i, "concrete", "stair")
# Parapets: crouched players are covered, standing heads are exposed; a gap drops to the corridor.
pair("parapet-courtyard", -12.35, -12, -10.5, -3.2, PLATFORM_TOP, PLATFORM_TOP + LOW_COVER, "concrete", "parapet")
pair("parapet-corridor", -16, -13.5, -10.5, -10.15, PLATFORM_TOP, PLATFORM_TOP + LOW_COVER, "concrete", "parapet")

# ------------------------------------------------------------------ spawn-side buildings and shield
pair("house-south", -16, -12, 3.2, 10.5, 0, 5.0, "concrete", "house")
pair("spawn-shield", -14.35, -13.45, -1.8, 1.8, 0, 2.4, "concrete", "spawn-shield", surface_east="metal", kind_east="spawn-shield")
pair("spawn-alley-crates-n", -19.6, -18.6, -7.0, -5.4, 0, 2.2, "wood", "crate-stack")
pair("spawn-alley-crates-s", -19.6, -18.6, 5.4, 7.0, 0, 2.2, "wood", "crate-stack")

# ------------------------------------------------------------------ courtyard cover
centred("tarp-stack", 0, 0.0, 4.0, 3.2, 2.6, "wood", "tarp-stack", theme="centre")
pair("lane-stack", -10.7, -6.5, -3.9, -1.5, 0, 2.6, "wood", "crate-stack", surface_east="metal", kind_east="container")
pair("lane-crate", -6.15, -4.65, 0.35, 1.85, 0, 1.45, "wood", "crate")
pair("north-crate", -5.4, -4.15, -8.0, -6.75, 0, 1.25, "wood", "crate")
pair("north-lowwall", -9.6, -7.0, -7.9, -7.3, 0, LOW_COVER, "concrete", "low-wall")
pair("south-crates", -5.8, -3.4, 4.35, 5.65, 0, 1.3, "wood", "crate")
pair("south-barrier", -10.0, -7.2, 6.1, 6.7, 0, LOW_COVER, "concrete", "jersey-barrier")
pair("side-crate", -11.2, -10.0, 1.2, 3.3, 0, 2.2, "wood", "crate-stack")

# ------------------------------------------------------------------ upper route (north corridor)
# Staggered tall pieces turn both corridors into an S-bend: no corridor-long sightline, and the
# flank must be cleared corner by corner. Side pieces hug the courtyard wall, the centre piece
# the edge building, with 2.2 m between them.
centred("well-house", 0, -13.5, 2.4, 2.0, 2.4, "concrete", "well-house", theme="centre")
pair("market-stall", -5.4, -3.4, -12.5, -10.5, 0, 2.4, "wood", "market-stall", surface_east="metal", kind_east="container-short")

# ------------------------------------------------------------------ lower route (south corridor)
centred("corridor-container", 0, 13.45, 3.0, 2.1, 2.6, "metal", "container", theme="centre")
pair("corridor-stack", -6.0, -3.6, 10.5, 12.4, 0, 2.4, "wood", "crate-stack", surface_east="metal", kind_east="container-short")
pair("corridor-crates", -10.4, -9.0, 13.1, 14.5, 0, 1.45, "wood", "crate")

# ------------------------------------------------------------------ perimeter (bullets; movement uses ARENA bounds)
walls = [
    {"id": "wall-west", "x": -20.4, "y": 3.2, "z": 0, "w": 0.8, "h": 6.4, "d": 33.6, "surface": "concrete"},
    {"id": "wall-east", "x": 20.4, "y": 3.2, "z": 0, "w": 0.8, "h": 6.4, "d": 33.6, "surface": "concrete"},
    {"id": "wall-north", "x": 0, "y": 3.2, "z": -16.4, "w": 40, "h": 6.4, "d": 0.8, "surface": "concrete"},
    {"id": "wall-south", "x": 0, "y": 3.2, "z": 16.4, "w": 40, "h": 6.4, "d": 0.8, "surface": "concrete"},
]
spawns = {"A": {"x": -18.2, "z": 0.0, "yaw": -1.5707963267948966}, "B": {"x": 18.2, "z": 0.0, "yaw": 1.5707963267948966}}

if __name__ == "__main__":
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
        "// Generated by art/blender/map/layout.py — edit the layout there, then re-run it.",
        "// PVPSPINARENA 1v1 aim arena: gameplay solids (metres, feet at y = 0, box centres + full sizes).",
        'import type { Solid } from "./map";',
        "",
        f"export const ARENA_LAYOUT_SIZE = {{ width: {ARENA['width']}, depth: {ARENA['depth']} }} as const;",
        "/** Block movement and bullets. */",
        "export const LAYOUT_BOXES: Solid[] = [",
        *[row(s) for s in boxes],
        "];",
        "/** Bullets only (above head height). */",
        "export const LAYOUT_STRUCTURES: Solid[] = [",
        *[row(s) for s in bullets],
        "];",
        "/** Perimeter: bullets (movement is bounded by the arena rectangle). */",
        "export const LAYOUT_WALLS: Solid[] = [",
        *[row(s) for s in walls],
        "];",
        f"export const LAYOUT_SPAWNS = {{",
        f"  A: {{ x: {spawns['A']['x']}, z: {spawns['A']['z']}, yaw: -Math.PI / 2 }},",
        f"  B: {{ x: {spawns['B']['x']}, z: {spawns['B']['z']}, yaw: Math.PI / 2 }},",
        "} as const;",
        "",
    ]
    with open(os.path.join(ROOT, "src/lib/fps/arena-layout.ts"), "w") as f:
        f.write("\n".join(ts))
    print(f"{len(boxes)} boxes, {len(bullets)} bullet-only, {len(walls)} walls")
