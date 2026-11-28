"""Floors with a finish (owner, 2026-11-27, of the white apartment block's stairwell and corridor:
"add klinkers och golv saknas. leta efter fler lägeheter som saknar"; then "stair/inside balcony
wall").

  - apartment (the white block, 176 placements): its stairwell, corridor and stairs, and the
    balconies, in klinker (ceramic floor tiles, a colour and size per building); the flats keep
    their painted floors (interior-style.ts: planks, tiles or carpet per placement).
  - the towers (Skyline Residences, the Downtown brick and office towers: lobby, floors, clubhouse,
    roofs): their floors were flat colours where the builder meant finishes (build_condo.mjs K:
    oak, bathroom tile, carpet, marble, decking, stone stairs): drawn as planks, tiles, carpet,
    marble slabs and decking, the stairs as stone slabs.

Writes art/br/floors-gaps-v1.json for art/blender/br/floor_finish.mjs (after patch_parts.mjs:
the same tag, world revision gaps-v1).

    python3 art/br/fitout/floors.py
"""

import json
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
models = {}

# The apartment block (build_apartment.mjs): the stairwell x −10…−6.7 (its floors and the core
# wall's foot), the corridor z −5.7…−4.05 east of it, the stairs (colour `stair`, flights and
# landings, their risers), the balconies' slab tops (z 6…7.4, the corner fans to x 11.4).
STAIR = [0.6, 0.6, 0.58]
PLASTER = [0.93, 0.92, 0.89]
KLINKER = [0.75, 0.72, 0.68]  # (the shader picks the building's colour; this is the fallback)
models["apartment"] = {
    "lods": [0],
    "rules": [
        {"kind": "klinker", "prim": "Access floor and steps", "box": [-9.8, -0.5, -5.8, -6.55, 13, 5.8], "recolour": KLINKER, "why": "the stairwell's floors"},
        {"kind": "klinker", "prim": "Access floor and steps", "box": [-6.7, -0.5, -5.8, 9.8, 13, -4.05], "recolour": KLINKER, "why": "the corridor's floors"},
        {"kind": "klinker", "prim": "apartment", "colour": STAIR, "up": False, "box": [-9.8, -0.5, -6, -6.5, 13, 6], "recolour": KLINKER, "why": "the stairs, treads and risers"},
        {"kind": "klinker", "prim": "apartment", "colour": PLASTER, "box": [-6.45, 2.5, 6.0, 11.45, 12.5, 7.45], "recolour": KLINKER, "why": "the balconies' floors"},
    ],
}

# The towers (build_condo.mjs K colours), every style (condo, brick, office) and storey kind.
K = {
    "oak": ([0.55, 0.4, 0.27], "planks"),
    "tile": ([0.74, 0.75, 0.76], "tiles"),
    "carpet": ([0.36, 0.33, 0.31], "carpet"),
    "marble": ([0.88, 0.87, 0.84], "marble"),
    "deck": ([0.56, 0.45, 0.34], "deck"),
}
STONE_STAIR = [0.72, 0.71, 0.69]
for style in ("condo", "brick", "office"):
    for part in ("lobby", "floor", "roof-b") + (("club",) if style == "condo" else ()):
        mid = f"{style}-{part}"
        rules = [
            {"kind": kind, "prim": mid, "colour": colour, "box": [-40, -0.5, -40, 40, 0.9, 40], "why": f"the {name} floors"}
            for name, (colour, kind) in K.items()
        ]
        rules.append({"kind": "marble", "prim": mid, "colour": STONE_STAIR, "up": False, "why": "the stairs, stone"})
        models[mid] = {"lods": [0], "rules": rules}

with open(os.path.join(ROOT, "floors-gaps-v1.json"), "w") as f:
    json.dump({"tag": "gaps-v1", "models": models}, f, indent=1)
print("floors-gaps-v1:", len(models), "models")
