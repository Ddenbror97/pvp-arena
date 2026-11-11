"""Top-down plan of IRON DISTRICT from build/layout.json: floor heights, cover, slabs, railings,
plant zones, spawns and callouts (build/plan.png). Optional: build/timings.json route overlays.

  python3 art/blender/iron-district/plan.py [--scale 10]
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
L = json.load(open(os.path.join(HERE, "build", "layout.json")))
S = int(sys.argv[sys.argv.index("--scale") + 1]) if "--scale" in sys.argv else 10
W, D = L["arena"]["width"], L["arena"]["depth"]
M = 40
img = Image.new("RGB", (int(W * S) + 2 * M, int(D * S) + 2 * M + 60), (24, 24, 28))
g = ImageDraw.Draw(img, "RGBA")
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", max(10, S + 2))
    small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", max(8, S))
except OSError:
    font = small = ImageFont.load_default()
P = lambda x, z: (M + (x + W / 2) * S, M + (z + D / 2) * S)
LEVEL = {0.0: (70, 60, 90), 1.2: (150, 140, 120), 2.4: (178, 160, 120), 4.2: (120, 160, 190), 5.4: (205, 190, 150)}


def rect(s, fill, outline=None, width=1):
    x0, z0 = P(s["x"] - s["w"] / 2, s["z"] - s["d"] / 2)
    x1, z1 = P(s["x"] + s["w"] / 2, s["z"] + s["d"] / 2)
    g.rectangle([x0, z0, x1, z1], fill=fill, outline=outline, width=width)


def shade(top):
    near = min(LEVEL, key=lambda k: abs(k - top))
    base = LEVEL[near]
    t = max(-1, min(1, (top - near) / 1.2))
    return tuple(int(c * (1 + 0.25 * t)) for c in base)


# Walkable floors: regions, then tunnels on top (drawn dark), then boxes by kind.
for name, x0, x1, z0, z1, y in L["regions"]:
    g.rectangle([*P(x0, z0), *P(x1, z1)], fill=LEVEL.get(y, (150, 150, 150)))
for name, x0, x1, z0, z1 in L["tunnels"]:
    g.rectangle([*P(x0, z0), *P(x1, z1)], fill=(80, 60, 110, 180), outline=(170, 130, 230), width=2)
for s in L["solids"]:
    k, top = s["kind"], s["y"] + s["h"] / 2
    if k == "building":
        rect(s, (52, 50, 56), (40, 40, 44))
    elif k in ("ground",):
        continue
    elif k == "tunnel-ceiling":
        continue
    elif k in ("stair", "ramp"):
        rect(s, shade(top) + (255,), (90, 80, 70))
    elif k in ("slab", "catwalk", "balcony"):
        rect(s, (120, 170, 210, 120), (90, 150, 200))
    elif k in ("wall", "interior", "gate"):
        rect(s, (40, 38, 42), None)
    else:
        rect(s, (196, 96, 52) if s["surface"] != "wood" else (160, 110, 60), (60, 30, 20))
for s in L["barriers"]:
    rect(s, (90, 200, 255), None)
for s in L["structures"]:
    rect(s, (0, 0, 0, 0), (255, 255, 255, 60))
for k, v in L["bombsites"].items():
    g.rectangle([*P(v["x0"], v["z0"]), *P(v["x1"], v["z1"])], fill=(220, 40, 40, 40), outline=(240, 70, 70), width=3)
    cx, cz = P((v["x0"] + v["x1"]) / 2, (v["z0"] + v["z1"]) / 2)
    g.text((cx, cz), k, fill=(255, 90, 90), font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", S * 5), anchor="mm")
for team, col in (("police", (80, 140, 255)), ("terrorist", (255, 190, 60))):
    for p in L["spawns"][team]:
        x, z = P(p["x"], p["z"])
        g.ellipse([x - S * 0.5, z - S * 0.5, x + S * 0.5, z + S * 0.5], fill=col)
routes = os.path.join(HERE, "build", "routes.json")
if os.path.exists(routes):
    for r in json.load(open(routes)):
        pts = [P(p["x"], p["z"]) for p in r["path"]]
        col = (255, 200, 60, 200) if r["team"] == "terrorist" else (100, 160, 255, 200)
        g.line(pts, fill=col, width=max(2, S // 4))
for name, x, z, y in L["callouts"]:
    px, pz = P(x, z)
    g.text((px, pz), name, fill=(255, 255, 255), font=small, anchor="mm", stroke_width=2, stroke_fill=(0, 0, 0))
# Legend
ly = int(D * S) + 2 * M
for n, (lv, col) in enumerate(LEVEL.items()):
    g.rectangle([M + n * 170, ly, M + n * 170 + 20, ly + 20], fill=col)
    g.text((M + n * 170 + 26, ly + 2), {0.0: "tunnel 0 m", 1.2: "lowland 1.2", 2.4: "market 2.4", 4.2: "catwalk 4.2", 5.4: "upper town 5.4"}[lv], fill=(230, 230, 230), font=small)
g.text((M + 5 * 170, ly + 2), "rails = cyan, slabs = blue, cover = orange", fill=(230, 230, 230), font=small)
img.save(os.path.join(HERE, "build", "plan.png"))
print("build/plan.png", img.size)
