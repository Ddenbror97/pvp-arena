"""
IRON DISTRICT street life: places the prop library (props_assets.py → build/props-library.blend)
where layout.py's STREET puts it (build/layout.json "street", each on its floor and enclosed by its
collision boxes), the scaffold assembled from its modules, plus outdoor air-conditioning units on
the facades and satellite dishes on the roofs (ray casts against iron-district.blend). Uses
SANDGATE's placer (../map06/props.py). Exports build/iron-district-props-raw.glb.

  /root/bpyenv/bin/python art/blender/iron-district/props.py
"""
import math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "map06"))
import props as P  # noqa: E402

TUN, LOW, MKT, WALK, UP = 0.0, 1.2, 2.4, 4.2, 5.4
P.OUT = os.path.join(HERE, "build", "iron-district-props-raw.glb")
P.LAYOUT = os.path.join(HERE, "build", "layout.json")
P.TOWN = os.path.join(HERE, "iron-district.blend")
P.LIBRARY = os.path.join(HERE, "build", "props-library.blend")
P.PROPS_KEY = "street"
P.NO_SHADOW = {"pallet", "rubble", "ac", "dish", "tarp", "bistro", "picnic", "scooter", "drum"}
P.ROOF_MIN = 7.0
# Facade units: (x, z on the wall's line, direction into the lane, the lane's floor).
P.AC = [
    (-10.0, 6.5, (1, 0), LOW), (-2.0, -25.0, (1, 0), LOW), (8.0, -14.0, (-1, 0), LOW), (14.0, -43.0, (0, 1), LOW),
    (18.0, -27.0, (1, 0), MKT), (44.0, -35.0, (-1, 0), MKT), (39.0, 0.0, (-1, 0), MKT), (34.0, 3.0, (1, 0), MKT),
    (-30.0, 30.0, (0, 1), UP), (-24.0, 36.0, (0, -1), UP), (30.0, 30.0, (0, 1), UP), (26.0, 39.5, (0, -1), UP),
    (1.0, 24.0, (-1, 0), UP), (-10.0, 20.0, (1, 0), UP), (-22.0, -30.0, (-1, 0), LOW), (-26.0, 13.0, (-1, 0), LOW),
]
P.DISH = [(5.0, 12.5), (-14.0, 10.0), (16.0, -18.0), (13.0, -25.0), (-12.0, -37.5), (31.0, 24.0), (10.0, 22.0),
          (16.0, 26.0), (6.0, 26.0), (36.0, 24.0), (-20.0, 14.0)]
# The scaffold over a facade: two bays wide, three lifts high (the closed lift at the bottom, open
# lifts above), tarps on the street face of the bottom lift and of one bay above. Its frame: x along
# the facade, z toward the street, the bays' depth 1.3 m.
BAY_W, LIFT_H, TARP_Z = 3.0, 2.72, 0.68
P.ASSEMBLIES = {
    "scaffold": [("scaffold-bay" if lift == 0 else "scaffold-open", (k - 0.5) * BAY_W, lift * LIFT_H, 0.0, 0.0)
                 for lift in range(3) for k in range(2)]
    + [("tarp", (k - 0.5) * BAY_W, lift * LIFT_H + 0.32, TARP_Z, 0.0) for lift, k in ((0, 0), (0, 1), (1, 1))],
    # Three pallets stacked, the middle one turned a quarter.
    "pallets": [("pallet", 0.0, 0.258 * i, 0.0, (math.pi / 2) * (i % 2)) for i in range(3)],
}

if __name__ == "__main__":
    P.main()
