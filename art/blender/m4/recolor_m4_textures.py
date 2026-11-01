"""
Police M4A1 finish: recolour the source textures before the Blender build.

    python3 recolor_m4_textures.py <Grid_baseColor.png> <Grid_metallicRoughness.png> \
        <out_base.png> <out_mr.png>

- Tan (Flat Dark Earth) polymer furniture → black polymer: value kept relative (scratches and
  wear survive), metalness off, roughness raised.
- Anodised / phosphate metal → darker gunmetal with the light wear speckle compressed, so it
  reads as satin black under the arena's sky light instead of frosted chrome.
- Saturated non-tan details (the removed optic's lens) are left alone.
"""
import sys

import numpy as np
from PIL import Image

base_in, mr_in, base_out, mr_out = sys.argv[1:5]
src = np.asarray(Image.open(base_in).convert("RGB")).astype(np.float32) / 255
r, g, b = src[..., 0], src[..., 1], src[..., 2]
mx, mn = src.max(-1), src.min(-1)
sat = (mx - mn) / np.maximum(mx, 1e-4)
d = np.maximum(mx - mn, 1e-5)
hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
tan = (hue > 18) & (hue < 55) & (sat > 0.18) & (mx > 0.25)
lum = 0.299 * r + 0.587 * g + 0.114 * b

poly = np.clip(0.075 + (lum - 0.58) * 0.55, 0.035, 0.4)
black = np.stack([poly * 0.98, poly, poly * 1.04], -1)
metal_lum = src.mean(-1, keepdims=True)
metal = np.clip(0.11 + (metal_lum - 0.25) * 0.55, 0.03, 0.5) * np.array([0.97, 1.0, 1.04])
out = np.where(tan[..., None], black, np.where(sat[..., None] > 0.35, src, metal))
Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(base_out)

mr = np.asarray(Image.open(mr_in).convert("RGB")).astype(np.float32) / 255
mr[..., 2] = np.where(tan, 0.04, mr[..., 2])
mr[..., 1] = np.where(tan, np.clip(mr[..., 1] * 0.6 + 0.3, 0.45, 0.85), mr[..., 1])
Image.fromarray((mr * 255).astype(np.uint8)).save(mr_out)
print(f"tan texels {tan.mean():.3f}")
