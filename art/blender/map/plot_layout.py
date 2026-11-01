"""Top-down plot of build/layout.json (gameplay solids), for checking against the reference."""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
L = json.load(open(os.path.join(HERE, "build/layout.json")))
S = 24  # px per metre
W, D = L["arena"]["width"], L["arena"]["depth"]
img = Image.new("RGB", (int(W * S) + 80, int(D * S) + 80), (196, 178, 150))
d = ImageDraw.Draw(img)
F = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
P = lambda x, z: (40 + (x + W / 2) * S, 40 + (z + D / 2) * S)
col = {"edge-building": (120, 104, 86), "arcade-wall": (150, 128, 100), "platform": (210, 190, 120), "stair": (225, 205, 140),
       "parapet": (170, 150, 90), "house": (130, 112, 92), "spawn-shield": (90, 90, 96), "crate-stack": (140, 96, 50), "container": (170, 50, 40),
       "tarp-stack": (80, 120, 70), "crate": (160, 112, 62), "low-wall": (160, 160, 160), "jersey-barrier": (170, 170, 170), "well": (120, 140, 160),
       "planter": (90, 130, 80), "arch-lintel": None}
for s in sorted(L["solids"], key=lambda s: s["y"] + s["h"] / 2):
    c = col.get(s["kind"], (255, 0, 255))
    if c is None:
        x0, z0 = P(s["x"] - s["w"] / 2, s["z"] - s["d"] / 2); x1, z1 = P(s["x"] + s["w"] / 2, s["z"] + s["d"] / 2)
        d.rectangle([x0, z0, x1, z1], outline=(60, 40, 20)); continue
    x0, z0 = P(s["x"] - s["w"] / 2, s["z"] - s["d"] / 2); x1, z1 = P(s["x"] + s["w"] / 2, s["z"] + s["d"] / 2)
    d.rectangle([x0, z0, x1, z1], fill=c, outline=(40, 30, 20))
    top = s["y"] + s["h"] / 2
    if s["kind"] not in ("edge-building",):
        d.text(((x0 + x1) / 2 - 8, (z0 + z1) / 2 - 5), f"{top:.1f}", fill=(0, 0, 0), font=F)
for k, sp in L["spawns"].items():
    x, z = P(sp["x"], sp["z"]); d.ellipse([x - 8, z - 8, x + 8, z + 8], fill=(40, 160, 40) if k == "A" else (180, 40, 40)); d.text((x - 4, z - 6), k, fill="white", font=F)
x0, z0 = P(-12, -10); x1, z1 = P(12, 10); d.rectangle([x0, z0, x1, z1], outline=(255, 255, 255))
x0, z0 = P(-20, -16); x1, z1 = P(20, 16); d.rectangle([x0, z0, x1, z1], outline=(0, 0, 0), width=2)
img.save(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "build/layout.png"))
