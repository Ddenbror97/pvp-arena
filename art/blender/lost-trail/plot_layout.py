"""Top-down plan of build/layout.json with routes and validation metrics (build/plan.png)."""
import json, os
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
L = json.load(open(os.path.join(HERE, "build/layout.json")))
V = json.load(open(os.path.join(HERE, "build/validation.json")))
S, PAD = 22, 50
W, D = L["arena"]["width"], L["arena"]["depth"]
img = Image.new("RGB", (int(W * S) + 2 * PAD, int(D * S) + 2 * PAD + 70), (38, 52, 33))
d = ImageDraw.Draw(img, "RGBA")
F = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
FB = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)
P = lambda x, z: (PAD + (x + W / 2) * S, PAD + (z + D / 2) * S)
def rect(s, fill, outline=None):
    x0, z0 = P(s["x"] - s["w"] / 2, s["z"] - s["d"] / 2); x1, z1 = P(s["x"] + s["w"] / 2, s["z"] + s["d"] / 2)
    d.rectangle([x0, z0, x1, z1], fill=fill, outline=outline)
# playable ground
d.rectangle([*P(-W / 2, -D / 2), *P(W / 2, D / 2)], fill=(150, 124, 86))
for s in L["solids"]:
    if s["layer"] == "barrier":
        rect(s, (58, 90, 48) if s["kind"] != "gorge" else (46, 96, 110))
col = {"ridge": (190, 160, 110), "stone-step": (215, 200, 160), "rock-wall": (110, 110, 100), "boulder": (125, 125, 115),
       "ruin-wall": (170, 165, 140), "crate": (180, 130, 70), "crate-stack": (150, 100, 50), "log": (110, 80, 50),
       "hut": (120, 95, 70), "sandbags": (200, 185, 140), "bridge-post": (90, 60, 30), "trunk": (85, 60, 40), "hero-trunk": (70, 48, 30)}
for s in sorted([s for s in L["solids"] if s["layer"] != "barrier"], key=lambda s: s["y"] + s["h"] / 2):
    rect(s, col.get(s["kind"], (255, 0, 255)), (30, 25, 20))
# bridge deck + water at crossings
d.rectangle([*P(-2.6, -1.7), *P(2.6, 1.7)], outline=(240, 220, 160), width=2)
for z0, z1 in ((-15.4, -12.6), (9.4, 15.2)):
    d.rectangle([*P(-2.6, z0), *P(2.6, z1)], fill=(70, 140, 150, 140))
# heights of elevated / tall solids
for s in L["solids"]:
    top = s["y"] + s["h"] / 2
    if s["layer"] == "box" and s["kind"] in ("ridge", "rock-wall", "ruin-wall", "crate-stack", "boulder", "sandbags") and s["w"] * s["d"] > 0.5:
        d.text((P(s["x"], s["z"])[0] - 9, P(s["x"], s["z"])[1] - 6), f"{top:.1f}", fill=(0, 0, 0), font=F)
# routes (A side), mirrored for B
routes = {"A bridge": [(-20, 0), (-17, 4.3), (-13.5, 4.4), (-8, 3.2), (-5.6, 2.6), (-3.4, 1.15), (0, 1.15)],
          "B ridge/north": [(-20, 0), (-17, -4.3), (-16.6, -5.2), (-16.6, -11.5), (-9.6, -11.5), (-8.6, -14.3), (-4, -14.3), (0, -14)],
          "C river trail": [(-20, 0), (-17, 4.3), (-16.6, 7.5), (-16.6, 12.4), (-8.2, 12.6), (-5, 12.6), (-2, 10.3), (0, 10.3)]}
rc = {"A bridge": (255, 220, 80), "B ridge/north": (120, 200, 255), "C river trail": (255, 140, 200)}
for name, pts in routes.items():
    for sign in (1, -1):
        d.line([P(sign * x, z) for x, z in pts], fill=(*rc[name], 230), width=3)
c = V["firstContact"]
d.line([P(c["a"]["x"], c["a"]["z"]), P(c["b"]["x"], c["b"]["z"])], fill=(255, 60, 60, 220), width=2)
for k, sp in L["spawns"].items():
    x, z = P(sp["x"], sp["z"]); d.ellipse([x - 10, z - 10, x + 10, z + 10], fill=(40, 170, 60) if k == "A" else (200, 50, 50)); d.text((x - 4, z - 7), k, fill="white", font=FB)
post = P(-9.6, -10.8); d.text((post[0] - 12, post[1] - 22), "POST", fill=(255, 255, 255), font=FB)
post = P(9.6, -10.8); d.text((post[0] - 12, post[1] - 22), "POST", fill=(255, 255, 255), font=FB)
d.text(P(-1.6, -0.2), "BRIDGE", fill=(255, 255, 230), font=FB)
d.text(P(-2.0, 11.5), "FORD", fill=(255, 255, 230), font=FB)
d.text(P(-3.4, -15.2), "LOG CROSSING", fill=(255, 255, 230), font=F)
y = int(D * S) + PAD + 14
legend = [("A bridge", rc["A bridge"]), ("B ridge / north", rc["B ridge/north"]), ("C river trail", rc["C river trail"]), (f"first contact {c['seconds']} s ({c['distanceM']} m)", (255, 60, 60))]
x = PAD
for label, colr in legend:
    d.rectangle([x, y + 3, x + 18, y + 9], fill=colr); d.text((x + 24, y - 2), label, fill="white", font=F); x += 210
d.text((PAD, y + 22), "dark green: impassable jungle (movement only)   blue: river gorge   numbers: top height (m)   44 × 36 m", fill=(220, 220, 200), font=F)
d.text((PAD, y + 40), f"spawn safety {V['spawnPairsVisible']}/{V['spawnPairsChecked']} visible pairs   walk times A {V['walkSeconds']['A bridge']}s  B post {V['walkSeconds']['B ridge post']}s  B crossing {V['walkSeconds']['B north crossing']}s  C ford {V['walkSeconds']['C ford']}s", fill=(220, 220, 200), font=F)
img.save(os.path.join(HERE, "build/plan.png"))
