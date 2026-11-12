"""
SANDGATE (map 06) asset record and attribution.

  python3 art/blender/map06/credits.py

When the downloaded sources are present (incoming/, gitignored), every model's title, author,
source page and licence are read from its own license.txt (as delivered by Sketchfab) and written
with the usage notes below to art/blender/map06/assets.json (machine-readable, committed). From
assets.json it then writes:
  docs/fps-bomb/ASSETS.md                  (human-readable asset record)
  public/fps/models/sandgate-credits.txt   (the public CC BY credit lines shipped with the map)

A model whose licence is not CC0 / CC BY 4.0 is refused (free_ac_unit: Sketchfab Standard).
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
INC = os.path.join(HERE, "incoming")
OUT_JSON = os.path.join(HERE, "assets.json")

# folder → (library name in assets.py or None, where and how it is used, modifications)
MODELS = {
    "40ft_iso_general_container_free_asset_pack": (
        "container", "A long containers (×2) and the B site container.",
        "Only the plain, unbranded grey container is used (the branded ones in the pack are not). Cut "
        "from 40 ft to 5 m by removing the middle section (doors and corner castings kept), texture "
        "desaturated and tinted per container (olive, faded tan, rust brown), 1K."),
    "military_trucks": (
        "mrap / jeep", "A site truck (tan), B supply truck (green), A long car (desert tint) and the burnt "
        "car at the top of B main (charred tint).",
        "Split into the six-wheel armoured truck and the light utility vehicle; wheels decimated, radio "
        "antennas, an antenna mount and wing mirrors removed, scaled to the placement rectangle; custom dark "
        "chassis fill and stowage lockers between the truck's wheels. Collision is several boxes measured on "
        "the placed model (layout.py VEHICLES)."),
    "forklift_gameready": (
        "forklift", "A site forklift (with a custom pallet and crate stack on the forks).",
        "Decimated to 60 %, textures 512 px and slightly desaturated, scaled to its placement rectangle; custom "
        "enclosed cab (painted frame, dark glazing) and roof plate so the cab is as solid as its collision."),
    "crate_and_barrels_asset_pack": (
        "crate / barrel", "Wooden crates (A quad, A steps, mid boost, mid and hall crates, forklift load); "
        "barrels on rooftops.",
        "The warning stickers were painted out of the crate texture; 512 px textures; barrel desaturated."),
    "military_crate_-_4096px2": (
        "ammo", "The long military crate at mid.",
        "Decimated 43k → 2.6k triangles, textures 1K/512."),
    "hesco_barrier_pbr": (
        "hesco", "Every HESCO blast wall and sand barrier (A wall, mid wall, spawn screens, A low cover).",
        "Decimated to 22 %, re-graded to desert sand, 1K/512, stacked and fitted cell by cell to the boxes."),
    "sandbag_wall_-_24mb": (
        "sandbag", "B main sandbags (halfway down the banana-style lane).",
        "One bag extracted and decimated (8.9k → 310 triangles), restacked in a running bond to fill the box."),
    "door_metal_door_window": (
        "metaldoor", "Steel doors set into industrial facades.",
        "Decimated to 35 %, glass made opaque (no transmission), warm-graded, 512 px."),
    "electrical_box_-_free": (
        "ebox", "Electrical cabinets set into facade niches.",
        "Decimated to 30 %, re-graded, 512 px."),
    "diesel_generator": (
        "generator", "Generators on rooftops (skyline detail).",
        "Emission removed, yellow paint re-graded to khaki, decimated to 45 %, 512 px."),
    "roll_door": (
        "rolldoor", "Roller shutters in industrial facade openings.",
        "Only the rolling door mesh is used; decimated to 7 %, re-graded, 512 px."),
    "desert_house": (
        "house", "Background houses in the skyline beyond the playable edge.",
        "Unlit materials rebuilt as lit PBR materials so they take the map's sun and fog."),
    "t_wall_barrier": (
        "twall", "The T-wall perimeter on the arena edge behind Terrorist spawn.",
        "Re-graded to sand-coloured concrete, 512 px, scaled to 3.6 m."),
    "military_concrete_barrier": (
        "bremer", "The concrete barrier perimeter on the arena edge behind Police spawn.",
        "Re-graded to sand-coloured concrete, 512 px, scaled to 4 m."),
    # Downloaded, reviewed, not used:
    "concrete_barriers": (None, "Not used (small road barriers in saturated colours; no box to fit).", ""),
    "forklift_-_free_low_poly": (None, "Not used (the game-ready forklift fits the palette better).", ""),
    "hesco_barrier": (None, "Not used (carries large 'HESCO' lettering; the PBR variant is used instead).", ""),
    "sandbags_or_ricebags": (None, "Not used.", ""),
    "military_container": (None, "Not used (bright yellow transport cases clash with the palette).", ""),
    "free_ac_unit": (None, "EXCLUDED: Sketchfab Standard licence, not CC BY. Never imported.", ""),
    # Street life (owner, 2026-11-12: "the maps feel empty"): props_assets.py → props.py, each prop
    # enclosed by its collision boxes (layout.py PROPS).
    "burnt_out_car": (
        "wreck", "The burnt-out car on the Terrorist west road (cover).",
        "Photogrammetry scan cropped to the car and a 0.45 m band of scorched ground laid flat on the street; "
        "decimated 183k → 5.5k triangles, 1K / 256 px textures, slightly desaturated."),
    "lowpoly_abandoned_simple_car_prop_-_game_ready": (
        "car", "Two parked wrecks (Terrorist mid jog, east road) as cover.",
        "Scaled to 4.1 m, textures 4K → 512 / 256 px, desaturated. No badges or logos on the model."),
    "low_poly_market_stall__game-ready_asset": (
        "stall", "Market stalls in the mid plaza and in B main's first bend (a counter-height cover).",
        "Kept the frame, awning, produce crates and bread; the hanging meat, sausages, hooks and cobblestone "
        "disc removed; decimated 474k → 8k triangles, 512 / 256 px textures."),
    "low_poly_wooden_cart": (
        "cart", "A handcart on the mid plaza's west side.", "Scaled to 2.6 m, 512 / 128 px textures, desaturated."),
    "low-poly_clay_pot": (
        "pot", "Terracotta pots along the walls (A long, A site, mid, B main, Police spawn).",
        "The saucer disc removed, decimated to 25 %, 0.62 m tall."),
    "date_palm_and_vegetation": (
        "palm-1 / palm-3 / shrub", "Date palms in Terrorist spawn, mid plaza and on A site (trunk cover); a bush "
        "in B main.",
        "Two of the three palms used (one texture shared), decimated to 45 %, fronds drooping below 2.35 m "
        "trimmed; 1K / 256 px textures, desaturated."),
    "low_poly_palms_pack": (
        "tall-palm", "Tall palms at both spawns (skyline over the roofs).",
        "One palm of the pack, its untextured dry fronds and bark tinted, fronds below 2.35 m trimmed, 8.5 m."),
    "rubble_pile_game_ready__2k_pbr": (
        "rubble", "Rubble piles at wall bases (a 0.33 m step).",
        "Decimated to 50 %, re-graded to the street dust, 512 / 256 px, flattened to 0.33 m."),
    "satellite_dish": (
        "dish", "Satellite dishes on the roofs (found by ray casts on the built town).",
        "Decimated to 30 %, tinted weathered grey, 1.15 m."),
    "lowpoly_air_conditioner_outdoor_unit": (
        "ac", "Outdoor air-conditioning units hung on the facades above head height.",
        "The maker's label and small print painted out of the texture; 256 / 128 px."),
    "tire_stack": (
        "tires", "Tyre stacks (Terrorist spawn exit, west road, A long, Terrorist mid).", "Scaled to 1 m."),
    "trash_bag_low_poly_game_ready_pbr": (
        "bag", "Rubbish bags in corners along the lanes.", "Decimated 1.8k → 370 triangles, 256 / 128 px."),
    "burned_car": (None, "EXCLUDED: CC BY-NC (no commercial use). Never imported.", ""),
    "low_poly_market_stall_pack": (None, "EXCLUDED: Sketchfab Standard licence, not CC BY. Never imported.", ""),
}

TEXTURES = {
    # Poly Haven id: (name in build/tex, how it is used)
    "cracked_concrete_wall": ("plaster", "Weathered plaster walls (graded to warm cream; per-building tints by vertex colour). 2K albedo."),
    "large_sandstone_blocks_01": ("sandstone, flagstone", "Sandstone buildings, plinths, quoins, window surrounds, stairs, piers; "
                                  "warm flagstone paving on A site and mid. 2K / 1K albedo."),
    "concrete_pavement": ("pavement", "Concrete slab paving on B site, B connector and Police spawn."),
    "asphalt_02": ("asphalt", "Service roads (Terrorist roads, A long, Police corridors)."),
    "gravel_embedded_concrete_02": ("yard", "Yards and passage floors (Terrorist spawn, B main, interiors)."),
    "gravel": ("dirt", "Dirt lanes (B main, lower mid) and the desert floor beyond the edge."),
    "gravel_concrete_03": ("concrete", "Warehouse walls, roofs, platforms, steps, blast-wall segments."),
    "sandstone_cracks": ("adobe", "Sand-plaster (adobe) buildings and the horizon hills."),
    "patterned_plaster_wall": ("brickplaster", "Accent buildings with a brick-relief plaster (A site)."),
    "gravel_embedded_concrete": (None, "Downloaded, not used (too grey for the palette)."),
}

CUSTOM = [
    "Building and facade kit (build_sandgate.py): every 8 m block dressed from the layout grid — inset plaster / "
    "sandstone / adobe / concrete-and-cladding walls, flush plinths, string courses, cornices, quoins and pilasters, "
    "recessed windows with stone surrounds and sills, open and closed shutters, iron grilles, doors, recessed "
    "loggias with railings, AC and cabinet niches, drainpipes in chases, shop boards; upper storeys, parapets and "
    "terracotta lean-to roofs above the 8 m collision.",
    "Covered passages (Police passages, B hall, lower passage): plaster over ceramic-tile wainscot, timber-beamed "
    "ceilings, lamps; the Police guard office roof and ceiling.",
    "Gameplay cover built to its box: stairs, A platform, A catwalk, B loading dock with hazard edge and bumpers, "
    "gate piers with recessed timber leaves and beams, guard booth, B well, B planters, pillars, spawn and corridor "
    "walls, office walls, cast-concrete blast-wall segments (A long), vehicle underbody fills, forklift pallet.",
    "Ground: per-area asphalt, concrete slabs, flagstones, yard concrete and dirt with vertex-colour variation; "
    "decals for sand drifts, cracks, oil, tyre tracks, drains, manholes, road paint, plant-zone outlines and the "
    "painted A / B letters and arrows (plain letters, no branding).",
    "Skyline: exterior ring buildings, water towers, rooftop tanks / AC boxes / masts, overhead cables, horizon hills.",
    "Procedural textures (textures.py): terracotta barrel-tile roofs, painted wood, painted corrugated metal, the "
    "facade trim atlas (window, shutter, doors, roller shutter, grille, vent, AC front, panel, cabinet, sign, beam, "
    "recess, ceramic tiles, hazard stripes, soil) and the decal atlas.",
]


def read_license(folder):
    txt = open(os.path.join(INC, folder, "license.txt"), encoding="utf-8").read()
    get = lambda k: re.search(rf"\* {k}:\s*(.+)", txt).group(1).strip()
    author = get("author")
    m = re.match(r"(.+?) \((https?://[^)]+)\)", author)
    lic = get("license type")
    lm = re.match(r"(.+?) \((https?://[^)]+)\)", lic)
    return {"title": get("title"), "source": get("source"), "author": m.group(1) if m else author,
            "author_url": m.group(2) if m else "", "license": lm.group(1) if lm else lic, "license_url": lm.group(2) if lm else ""}


def build_json():
    if not os.path.isdir(INC):
        return json.load(open(OUT_JSON))
    models = []
    known = {m["folder"]: m for m in json.load(open(OUT_JSON))["models"]} if os.path.exists(OUT_JSON) else {}
    for folder, (lib, usage, mods) in MODELS.items():
        if not os.path.exists(os.path.join(INC, folder, "license.txt")):  # downloads not on this machine
            m = known[folder]
            info = {k: m[k] for k in ("title", "source", "author", "author_url", "license", "license_url")}
        else:
            info = read_license(folder)
        used = lib is not None
        if used and info["license"] not in ("CC-BY-4.0", "CC0"):
            sys.exit(f"refusing {folder}: licence {info['license']}")
        models.append({"folder": folder, **info, "used": used, "library": lib, "usage": usage, "modifications": mods})
    textures = [{"id": k, "name": f"{k.replace('_', ' ').title()}", "url": f"https://polyhaven.com/a/{k}", "license": "CC0",
                 "used": v[0] is not None, "files": v[0], "usage": v[1]} for k, v in TEXTURES.items()]
    data = {"map": "sandgate", "glb": "public/fps/models/sandgate.glb", "models": models, "textures": textures, "custom": CUSTOM}
    with open(OUT_JSON, "w") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
        f.write("\n")
    return data


def write_docs(data):
    used = [m for m in data["models"] if m["used"]]
    unused = [m for m in data["models"] if not m["used"]]
    md = ["# SANDGATE (map 06) — asset record", "",
          "Generated by `art/blender/map06/credits.py` from `art/blender/map06/assets.json` (titles, authors, source pages "
          "and licences read from each download's own `license.txt`). The public credit file shipped with the map is "
          "`public/fps/models/sandgate-credits.txt`.", "",
          "Only CC0 and CC BY 4.0 sources are used. No PVPSPINARENA / PVP spinArena branding and no real-world brand "
          "artwork appears anywhere in the map (the branded containers of the container pack are not used; crate "
          "warning stickers were painted out).", "",
          "## Sketchfab models (CC BY 4.0 — attribution required)", "",
          "| Model | Author | Licence | Used for | Modifications |", "| --- | --- | --- | --- | --- |"]
    for m in used:
        md.append(f"| [{m['title']}]({m['source']}) | [{m['author']}]({m['author_url']}) | [{m['license']}]({m['license_url']}) | "
                  f"{m['usage']} | {m['modifications']} |")
    md += ["", "### Downloaded and reviewed, not used", "", "| Model | Author | Licence | Note |", "| --- | --- | --- | --- |"]
    for m in unused:
        md.append(f"| [{m['title']}]({m['source']}) | [{m['author']}]({m['author_url']}) | {m['license']} | {m['usage']} |")
    md += ["", "## Poly Haven textures (CC0)", "", "| Texture | Used as | Usage |", "| --- | --- | --- |"]
    for t in data["textures"]:
        md.append(f"| [{t['name']}]({t['url']}) | {t['files'] or '—'} | {t['usage']} |")
    md += ["", "Scans are graded into the map palette (saturation, mean colour, contrast) and resized by `textures.py`: "
           "2K albedo on the plaster and sandstone walls and the trim / decal atlases, 1K elsewhere, 512 px normal and "
           "ORM (occlusion / roughness / metalness) maps.", "", "## Custom-made for this map", ""]
    md += [f"- {c}" for c in data["custom"]]
    md.append("")
    with open(os.path.join(ROOT, "docs/fps-bomb/ASSETS.md"), "w") as f:
        f.write("\n".join(md))
    txt = ["SANDGATE (map 06) — third-party asset credits", "",
           "This map uses the following 3D models under the Creative Commons Attribution 4.0 licence",
           "(https://creativecommons.org/licenses/by/4.0/). They were modified (cut, decimated, re-textured,",
           "re-coloured, rescaled) for this game; see docs/fps-bomb/ASSETS.md for details.", ""]
    for m in used:
        txt.append(f'- This work is based on "{m["title"]}" ({m["source"]}) by {m["author"]} ({m["author_url"]}) '
                   f'licensed under {m["license"]} ({m["license_url"]})')
    txt += ["", "Textures from Poly Haven (https://polyhaven.com), CC0 (public domain):"]
    for t in data["textures"]:
        if t["used"]:
            txt.append(f"- {t['name']}: {t['url']}")
    txt += ["", "All other geometry and textures of the map were made for this game.", ""]
    with open(os.path.join(ROOT, "public/fps/models/sandgate-credits.txt"), "w") as f:
        f.write("\n".join(txt))


if __name__ == "__main__":
    d = build_json()
    write_docs(d)
    print("credits:", sum(m["used"] for m in d["models"]), "models,", sum(t["used"] for t in d["textures"]), "textures")
