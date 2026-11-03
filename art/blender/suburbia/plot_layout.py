"""Top-down plot of SUBURBAN SHOWDOWN's gameplay solids (build/layout.json) for the docs.

  python3 art/blender/suburbia/plot_layout.py [out.png]   # default docs/fps-map/img/suburbia-layout-topdown.png
"""
import json, os, sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
L = json.load(open(os.path.join(HERE, "build", "layout.json")))
W, D = L["arena"]["width"], L["arena"]["depth"]
fig, ax = plt.subplots(figsize=(13, 9.6))
ax.add_patch(Rectangle((-W / 2, -D / 2), W, D, fill=True, color="#cfe3b8", lw=0))
ax.add_patch(Circle((0, 4.0), 12.5, color="#8d9094", lw=0))   # cul-de-sac asphalt
ax.add_patch(Rectangle((-5, 12), 10, D / 2 - 12, color="#8d9094", lw=0))
ax.add_patch(Rectangle((-W / 2, -D / 2), W, D, fill=False, lw=2, color="k"))


def colour(s):
    top = s["y"] + s["h"] / 2
    k = s["kind"]
    if s["layer"] == "bullet":
        return None
    if k.startswith(("bus", "truck")):
        return "#f2c230" if k.startswith("bus") else "#8e5bd6"
    if k.startswith("car"):
        return "#6b3fa0"
    if k == "stair":
        return "#e8c56d"
    if k in ("house-floor2", "balcony"):
        return "#d8c7a5"
    if k in ("picket-fence", "hedge"):
        return "#3f7a3a" if k == "hedge" else "#f4f1ea"
    if top >= 5:
        return "#7d828a"
    if top >= 2.5:
        return "#f9c784"
    if top >= 1.55:
        return "#f2a46b"
    return "#b5774b"


for s in sorted(L["solids"], key=lambda s: s["y"] + s["h"] / 2):
    x0, z0 = s["x"] - s["w"] / 2, s["z"] - s["d"] / 2
    c = colour(s)
    if c is None:
        ax.add_patch(Rectangle((x0, z0), s["w"], s["d"], fill=False, ls=":", lw=0.6, color="#806040"))
        continue
    ax.add_patch(Rectangle((x0, z0), s["w"], s["d"], color=c, ec="#4a3a2a", lw=0.4))
for k, sp in L["spawns"].items():
    ax.plot(sp["x"], sp["z"], marker="*", ms=18, color="red")
    ax.text(sp["x"], sp["z"] - 1.3, f"Spawn {k}", ha="center", color="red", weight="bold")
labels = [(0, 4.8, "SCHOOL\nBUS"), (0, -14.0, "TRUCK"), (0, -21.5, "tower"), (0, 17, "EXIT ROAD"),
          (-19, 0, "HOUSE A\n(2 floors)"), (19, 0, "HOUSE B\n(2 floors)"), (-19.8, -9, "garage A"), (19.8, -9, "garage B"),
          (-17, 13, "side yard A"), (17, 13, "side yard B"), (0, -18.6, "BACK LANE"), (-28.5, 8, "backyard A"), (28.5, 8, "backyard B")]
for x, z, t in labels:
    ax.text(x, z, t, ha="center", va="center", fontsize=8, color="#222", weight="bold")
ax.set_xlim(-W / 2 - 1, W / 2 + 1)
ax.set_ylim(D / 2 + 1, -D / 2 - 1)
ax.set_aspect("equal")
ax.grid(alpha=0.2)
ax.set_title("SUBURBAN SHOWDOWN — 64 × 46 m, mirror-symmetric (north up). Dotted = roofs (bullet-only)", fontsize=10)
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "docs/fps-map/img/suburbia-layout-topdown.png")
fig.tight_layout()
fig.savefig(out, dpi=90)
print("wrote", out)
