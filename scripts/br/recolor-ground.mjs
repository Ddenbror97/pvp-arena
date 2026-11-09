/**
 * Ground texture recolour (owner, 2026-11-05: the town lawns read as lime turf with red-brown
 * speckles). A few of the downloaded tiles are far off the island's palette (ground-style.ts):
 * lime grass, near-black moss with red soil spots, near-black soil. The terrain shader pulls each
 * channel toward the palette, which on such tiles blows the off-colour spots up. This bakes the
 * fix into the texture once, offline (no shader cost): those layers keep their light and dark
 * detail (brightness against the layer's mean) and take their colour from the palette.
 *
 *   node scripts/br/recolor-ground.mjs          (then: node scripts/br/bake-surface.mjs)
 *
 * Rewrites public/fps/br/ground/albedo.webp (those layers only) and their `mean` in ground.json.
 * Idempotent in effect: a recoloured layer is already on its palette and changes no further.
 */
import fs from "node:fs";
import sharp from "sharp";
import { LAYER_TARGET, PALETTE_PULL } from "../../src/lib/fps/br/ground-style.ts";

/** How much of each layer's colour comes from the palette (the rest: the channel-wise tint). */
const MONO = { grass: 0.75, moss: 0.9, soil: 0.8, forest: 0.5 };
const LUM = [0.2126, 0.7152, 0.0722];

const dir = "public/fps/br/ground/";
const meta = JSON.parse(fs.readFileSync(dir + "ground.json", "utf8"));
const size = meta.albedo;
const { data, info } = await sharp(dir + "albedo.webp", { limitInputPixels: false })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
if (info.width !== size || info.height !== size * meta.layers.length)
  throw new Error(`albedo.webp: ${info.width}×${info.height}`);

meta.layers.forEach((layer, i) => {
  const mono = MONO[layer.id];
  if (!mono) return;
  const target = LAYER_TARGET[layer.id];
  // The shader's per-channel tint for the layer as it is now (terrain.ts loadGround).
  const tint = layer.mean.map((m, c) =>
    Math.min(14, Math.max(0.35, 1 + (target[c] / Math.max(m, 1e-4) - 1) * PALETTE_PULL)),
  );
  const lumMean = layer.mean.reduce((s, m, c) => s + m * LUM[c], 0);
  const start = i * size * size * 4;
  const sum = [0, 0, 0];
  for (let p = start; p < start + size * size * 4; p += 4) {
    const lin = [0, 1, 2].map((c) => (data[p + c] / 255) ** 2);
    const k = Math.min(2.2, Math.max(0.35, lin.reduce((s, v, c) => s + v * LUM[c], 0) / lumMean));
    for (let c = 0; c < 3; c++) {
      // In the stored space: the shader multiplies by the tint it derives from the new mean,
      // which for an on-palette layer is ≈ 1, so store the final colour.
      const v = Math.min(1, lin[c] * tint[c] * (1 - mono) + target[c] * k * mono);
      data[p + c] = Math.round(Math.sqrt(v) * 255);
      sum[c] += (data[p + c] / 255) ** 2;
    }
  }
  layer.mean = sum.map((s) => +(s / (size * size)).toFixed(4));
  console.log(layer.id, "mean", layer.mean.join(" "), "target", target.join(" "));
});

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
  limitInputPixels: false,
})
  .webp({ quality: 82, effort: 6 })
  .toFile(dir + "albedo.webp.tmp");
fs.renameSync(dir + "albedo.webp.tmp", dir + "albedo.webp");
fs.writeFileSync(dir + "ground.json", JSON.stringify(meta, null, 1) + "\n");
console.log("albedo.webp", Math.round(fs.statSync(dir + "albedo.webp").size / 1024), "kB");
