/**
 * Ground textures for Project Island's terrain (owner, 2026-11-04: real ground per zone, with
 * variants so it does not all look the same). Sketchfab CC BY 4.0 tile textures (credits in
 * public/fps/br/ground/ATTRIBUTION.md), staged out of their downloads with
 * art/br/assets/stage-style extraction (colour and normal images only).
 *
 *   node br/build_ground.mjs <staged dir> <out dir>      (run from art/blender)
 *
 * Writes one vertical strip per map (every layer stacked, read into a texture array by the
 * client): albedo.webp (1024 px layers) and normal.webp (512 px layers), plus ground.json with
 * each layer's id, its linear mean colour (the far field shades with it, so near detail and
 * far colour match) and its tile size in metres.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [dir, out] = process.argv.slice(2);
if (!dir || !out) throw new Error("usage: build_ground.mjs <staged dir> <out dir>");
fs.mkdirSync(out, { recursive: true });

/** Layer order is the texture-array index used by terrain.ts (GROUND_LAYERS). */
const LAYERS = [
  // id, staged folder, tile size (m)
  ["grass", "grass", 3.2],
  ["moss", "moss", 3.6],
  ["straw", "straw", 2.6],
  ["soil", "soil", 3.4],
  ["forest", "forest", 3.4],
  ["sand", "sand", 4.0],
  ["mud", "mud", 3.6],
  ["rock", "rock", 4.5],
  ["gravel", "gravel", 2.4],
  ["concrete", "concrete", 4.0],
  ["tiles", "runway", 6.0],
  ["asphalt", "asphalt-old", 5.0],
  ["snow", "snow", 4.0],
];
const ALBEDO = 1024,
  NORMAL = 512;
/** Layers whose bright specks (flowers) read as cartoon stars at the ground's scale. */
const DEFLOWER = ["grass"];

/**
 * Flowers out of a grass layer: pixels much brighter than the grass around them (grown a few
 * pixels to take whole flowers) are filled with grass copied from another part of the same
 * tile (the first offset that is not a flower itself), feathered at the edge.
 */
async function deflower(a) {
  const W = ALBEDO;
  const blur = await sharp(a, { raw: { width: W, height: W, channels: 3 } })
    .blur(12)
    .raw()
    .toBuffer();
  const lum = (b, i) => 0.2126 * b[i] + 0.7152 * b[i + 1] + 0.0722 * b[i + 2];
  const core = new Uint8Array(W * W);
  for (let p = 0; p < W * W; p++) if (lum(a, p * 3) - lum(blur, p * 3) > 34) core[p] = 1;
  const R = 6,
    mask = new Float32Array(W * W);
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      if (!core[y * W + x]) continue;
      for (let dy = -R; dy <= R; dy++)
        for (let dx = -R; dx <= R; dx++) {
          const d = Math.hypot(dx, dy);
          if (d > R) continue;
          const q = ((y + dy + W) % W) * W + ((x + dx + W) % W);
          mask[q] = Math.max(mask[q], Math.min(1, (R + 1 - d) / 2.5));
        }
    }
  const src = Buffer.from(a);
  const OFFS = [
    [211, 97],
    [389, 613],
    [97, 433],
    [701, 251],
    [523, 877],
  ];
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      const p = y * W + x,
        m = mask[p];
      if (m <= 0) continue;
      let q = -1;
      for (const [ox, oy] of OFFS) {
        const c = ((y + oy) % W) * W + ((x + ox) % W);
        if (mask[c] === 0) {
          q = c;
          break;
        }
      }
      if (q < 0) continue;
      for (let c = 0; c < 3; c++)
        a[p * 3 + c] = Math.round(src[p * 3 + c] * (1 - m) + src[q * 3 + c] * m);
    }
}

const toLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const file = (folder, kind) => {
  const f = fs.readdirSync(path.join(dir, folder)).find((n) => n.startsWith(kind));
  if (!f) throw new Error(`${folder}: no ${kind}`);
  return path.join(dir, folder, f);
};

const albedo = [],
  normal = [],
  layers = [];
for (const [id, folder, size] of LAYERS) {
  const a = await sharp(file(folder, "baseColor"), { limitInputPixels: false })
    .removeAlpha()
    .resize(ALBEDO, ALBEDO, { kernel: "lanczos3" })
    .raw()
    .toBuffer();
  if (DEFLOWER.includes(id)) await deflower(a);
  const n = await sharp(file(folder, "normal"), { limitInputPixels: false })
    .removeAlpha()
    .resize(NORMAL, NORMAL, { kernel: "lanczos3" })
    .raw()
    .toBuffer();
  let r = 0,
    g = 0,
    b = 0;
  for (let i = 0; i < a.length; i += 3) {
    r += toLinear(a[i]);
    g += toLinear(a[i + 1]);
    b += toLinear(a[i + 2]);
  }
  const px = a.length / 3;
  layers.push({
    id,
    size,
    mean: [r / px, g / px, b / px].map((v) => Math.round(v * 10000) / 10000),
  });
  albedo.push(a);
  normal.push(n);
  console.log(id, layers.at(-1).mean);
}
const strip = (bufs, s, name, quality) =>
  sharp(Buffer.concat(bufs), { raw: { width: s, height: s * bufs.length, channels: 3 } })
    .webp({ quality, effort: 5 })
    .toFile(path.join(out, name));
await strip(albedo, ALBEDO, "albedo.webp", 84);
await strip(normal, NORMAL, "normal.webp", 92);
fs.writeFileSync(
  path.join(out, "ground.json"),
  JSON.stringify({ albedo: ALBEDO, normal: NORMAL, layers }, null, 1) + "\n",
);
// Credits (CC BY 4.0) from the staged downloads' license files.
const credits = JSON.parse(fs.readFileSync(path.join(dir, "credits.json"), "utf8"));
const lines = LAYERS.map(([id, folder]) => {
  const c = credits[folder];
  return `- \`${id}\`: "${c.title}" by ${c.author.replace(/ \(.*\)$/, "")} (${c.source}), licensed under CC BY 4.0. Resized and recoloured toward the island's palette in the terrain shader.`;
});
fs.writeFileSync(
  path.join(out, "ATTRIBUTION.md"),
  `# Ground textures (Project Island terrain)\n\nAll CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).\n\n${lines.join("\n")}\n`,
);
for (const f of ["albedo.webp", "normal.webp"])
  console.log(f, (fs.statSync(path.join(out, f)).size / 1e6).toFixed(2), "MB");
