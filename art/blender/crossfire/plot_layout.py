"""Top-down plot of CROSSFIRE's gameplay solids (build/layout.json) for the docs.

  python3 art/blender/crossfire/plot_layout.py [out.png]   # default docs/fps-map/img/crossfire-layout-topdown.png
"""
import json, os, sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
L = json.load(open(os.path.join(HERE, "build", "layout.json")))
W, D = L["arena"]["width"], L["arena"]["depth"]
fig, ax = plt.subplots(figsize=(10.5, 9))
ax.add_patch(Rectangle((-W / 2, -D / 2), W, D, fill=False, lw=2, color="k"))


def colour(s):
    top = s["y"] + s["h"] / 2
    if s["layer"] == "bullet":
        return None
    if s["kind"].startswith(("heli-", "rotor")):
        return "#d9c3a8" if top > 1.0 else "#c9a27e"
    if s["kind"] in ("terrace",):
        return "#c9a227"
    if s["kind"] == "stair":
        return "#e8c56d"
    if top >= 6:
        return "#9aa0a6"
    if top >= 2.5:
        return "#f9c784" if top < 3.5 else "#ffc07a"
    if top >= 1.55:
        return "#f2a46b"
    return "#b5774b"


for s in sorted(L["solids"], key=lambda s: s["y"] + s["h"] / 2):
    x0, z0 = s["x"] - s["w"] / 2, s["z"] - s["d"] / 2
    c = colour(s)
    if c is None:
        ax.add_patch(Rectangle((x0, z0), s["w"], s["d"], fill=True, color="#efe8dc", alpha=0.65, lw=0))
        ax.add_patch(Rectangle((x0, z0), s["w"], s["d"], fill=False, ls=":", lw=0.8, color="#a08060"))
        continue
    ax.add_patch(Rectangle((x0, z0), s["w"], s["d"], color=c, ec="#5a4a3a", lw=0.5))
for k, sp in L["spawns"].items():
    ax.plot(sp["x"], sp["z"], marker="*", ms=16, color="red")
    ax.text(sp["x"], sp["z"] + 1.2, f"Spawn {k}", ha="center", color="red", weight="bold")
labels = [(0, -7.8, "CRASH SQUARE"), (0, 0, "Mi-8 wreck\n(enterable)"), (-2, 14.2, "MARKET ALLEY"), (2, -14.2, "CONSTRUCTION PASSAGE"),
          (-19, -4, "RESIDENTIAL\n(interior)"), (19, 4, "TRANSPORT\nTERMINAL\n(interior)"), (-15, -12.5, "Roof terrace A (3 m)"),
          (15, 12.5, "Roof terrace B (3 m)"), (-21, -12.5, "Apartment\ntower"), (21, 12.5, "Terminal\ntower"), (-19, 9.2, "yard A"),
          (19, -9.2, "yard B")]
for x, z, t in labels:
    ax.text(x, z, t, ha="center", va="center", fontsize=8, color="#333", weight="bold" if "wreck" in t else None)
ax.set_xlim(-W / 2 - 1, W / 2 + 1)
ax.set_ylim(D / 2 + 1, -D / 2 - 1)
ax.set_aspect("equal")
ax.grid(alpha=0.25)
ax.set_title("CROSSFIRE — 48 × 40 m, point-symmetric (north up). Dotted = interior ceilings (bullet-only); "
             "wreck ends fitted to the Mi-8 model", fontsize=9)
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "docs/fps-map/img/crossfire-layout-topdown.png")
fig.tight_layout()
fig.savefig(out, dpi=90)
print("wrote", out)
