"""
IRON DISTRICT street-life prop library (owner, 2026-11-12: "the maps feel empty ... objects to fill
up the maps ... players can hide behind"). Built like SANDGATE's (../map06/props_assets.py, whose
helpers it uses): the downloads in incoming/ (CC BY 4.0, credited in
docs/fps-bomb/IRON-DISTRICT-ASSETS.md) plus the palms, rubble pile and air-conditioning unit
from SANDGATE's downloads. Writes build/props-library.blend and
build/props-library.json (sizes, triangles, and any surface outside the collision boxes of
layout.py STREET_SHAPES: "stray").

  /root/bpyenv/bin/python art/blender/iron-district/props_assets.py

Reviewed, not used: the cast-iron table set (208k triangles, untextured black), the game-ready
dumpster pack (real waste-company names on two of its four bins), the steel scaffolding tower
(one 35 m tower), the brick rubble kit (single bricks and wall fragments, no pile) and the olive
tree (untextured, one flat grey material). No rooftop dishes here: the roofs the casts find are
pitched tiles.
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "map06"))
import props_assets as PA  # noqa: E402  (SANDGATE's prop library builder and its helpers)

import importlib.util  # noqa: E402

# This map's layout (STREET_SHAPES), loaded by path: "layout" is already SANDGATE's module here.
_spec = importlib.util.spec_from_file_location("iron_layout", os.path.join(HERE, "layout.py"))
L = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(L)

INC = os.path.join(HERE, "incoming")
PA.A.LIBTEX = os.path.join(HERE, "build", "tex", "props")
os.makedirs(PA.A.LIBTEX, exist_ok=True)
PA.OUT = os.path.join(HERE, "build", "props-library.blend")
PA.REPORT = os.path.join(HERE, "build", "props-library.json")
PA.SHAPES = L.STREET_SHAPES


def clean_plate(pil):
    """The wreck's number plate carries the modeller's web address: painted over with the plate's
    own blank white."""
    s = pil.width / 4096
    box = tuple(int(v * s) for v in (1268, 466, 1334, 846))
    blank = pil.crop((int(1300 * s), int(452 * s), int(1306 * s), int(458 * s))).resize((box[2] - box[0], box[3] - box[1]))
    pil.paste(blank, box[:2])
    return pil


PA.A.CLEAN["e30"] = clean_plate
G = PA.A.grade_fn
pick = PA.prefix
SANDGATE = PA.SANDGATE_INC

SPECS = {
    "bistro": dict(inc=INC, src="bistrot_table_and_chair", pick=lambda o: True, yaw=0, dec_all=0.035, size=(2, 1.06),
                   tex=(512, 256), grade=G(sat=0.9),
                   merge={"osier02": "osier01", "tissu": "osier01", "assise_gold": "assise_black", "brass": "foot"}),
    "picnic": dict(inc=INC, src="outdoor_chair__table", pick=lambda o: True, yaw=0, size=(2, 0.92), tex=(512, 256),
                   vcol=True),
    "dumpster": dict(inc=INC, src="dumpster_old_and_weathered", pick=lambda o: True, yaw=0, size=(0, 2.0),
                     tex=(512, 256), grade=G(sat=0.85)),
    "scooter": dict(inc=INC, src="low_poly_vespa",
                    pick=lambda o: sum((o.matrix_world @ PA.Vector(c)).x for c in o.bound_box) / 8 < 2.0,
                    yaw=90, dec_all=0.35, size=(0, 1.8), tex=(256, 128), vcol=True),
    "skip": dict(inc=INC, src="old_rubbish_skip", pick=lambda o: True, yaw=90, size=(0, 3.6), tex=(512, 256),
                 grade=G(sat=0.8)),
    "pallet": dict(inc=INC, src="realistic_wooden_pallet_low-poly", pick=lambda o: True, yaw=0, size=(0, 1.2),
                   tex=(256, 128), grade=G(sat=0.85), merge={"cubes": "top-top", "pre-top": "top-top", "material": "top-top"}),
    "drum": dict(inc=INC, src="wooden_cable_drum", pick=lambda o: True, yaw=0, dec_all=0.15, size=(2, 1.2),
                 tex=(512, 256), grade=G(sat=0.85)),
    "e30": dict(inc=INC, src="abandoned_car_-_bmw_e30_sedan", pick=lambda o: True, yaw=0, dec_all=0.45, size=(0, 4.3),
                tex=(1024, 256), grade=G(sat=0.85)),
    "scaffold-bay": dict(inc=INC, src="modular_scaffolding_pack", pick=pick("Scaffolding_Segment_LOD2"), yaw=0,
                         scale=1.0, tex=(512, 256)),
    "scaffold-open": dict(inc=INC, src="modular_scaffolding_pack", pick=pick("Scaffolding_Segment_Open_LOD3"), yaw=0,
                          scale=1.0, tex=(512, 256)),
    "tarp": dict(inc=INC, src="modular_scaffolding_pack", pick=pick("Scaffolding_Tarp1_LOD1"), yaw=0, scale=1.0,
                 tex=(256, 128)),
    # SANDGATE's downloads, shared.
    "palm-1": dict(inc=SANDGATE, src="date_palm_and_vegetation", pick=pick("SM_DatePalm_1"), yaw=0, dec_all=0.45,
                   size=(2, 4.9), tex=(1024, 256), grade=G(sat=0.72), hook="palm"),
    "tall-palm": dict(inc=SANDGATE, src="low_poly_palms_pack", pick=PA.palm_pick(2), yaw=0, size=(2, 8.5),
                      tex=(512, 256), grade=G(sat=0.75), hook="tall-palm"),
    "rubble": dict(inc=SANDGATE, src="rubble_pile_game_ready__2k_pbr", pick=lambda o: True, yaw=0, dec_all=0.5,
                   size=(0, 1.6), tex=(512, 256), grade=G((0.5, 0.47, 0.43), sat=0.6)),
    "ac": dict(inc=SANDGATE, src="lowpoly_air_conditioner_outdoor_unit", pick=lambda o: True, yaw=0, size=(0, 0.86),
               tex=(256, 128), grade=G((0.72, 0.71, 0.66), sat=0.5)),
}

if __name__ == "__main__":
    PA.main(SPECS)
