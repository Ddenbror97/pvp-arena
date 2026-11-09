"""Contact sheet of runtime-review renders: python3 sheet.py <dir> <substring> <out.png>"""
import glob, os, sys
from PIL import Image, ImageDraw
d, sub, out = sys.argv[1:4]
files = sorted(f for f in glob.glob(os.path.join(d, "*.png")) if sub in os.path.basename(f))
W, H, cols = 480, 270, 3
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (W * cols, H * rows), "white")
for i, f in enumerate(files):
    x, y = (i % cols) * W, (i // cols) * H
    sheet.paste(Image.open(f).resize((W, H)), (x, y))
    ImageDraw.Draw(sheet).text((x + 6, y + 6), os.path.basename(f), fill="black")
sheet.save(out)
