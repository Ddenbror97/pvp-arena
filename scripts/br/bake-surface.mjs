/** Offline aerial albedo from the island's existing credited tiles. No runtime generation. */
import fs from "node:fs";
import { inflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { GROUND_LAYERS, LAYER_TARGET, PALETTE_PULL } from "../../src/lib/fps/br/ground-style.ts";
const dir = "public/fps/br/ground/";
const size = 2048,
  tileSize = 32;
const meta = JSON.parse(fs.readFileSync(dir + "ground.json"));
const cover = fs.readFileSync("public/fps/br/landcover.v1.lc");
if (cover.toString("ascii", 0, 4) !== "PIC1") throw Error("Unexpected land cover");
const width = cover.readUInt16LE(4),
  height = cover.readUInt16LE(6);
const classes = inflateSync(cover.subarray(8));
if (classes.length !== width * height) throw Error("Invalid land cover payload");
const weights = await Promise.all(
  Array.from({ length: 8 }, async (_, id) => {
    const mask = Buffer.alloc(classes.length);
    // Soften the broad aerial colour transitions; collision/vegetation classes stay untouched.
    for (let i = 0; i < mask.length; i++) mask[i] = classes[i] === id ? 255 : 0;
    return sharp(mask, { raw: { width, height, channels: 1 } })
      .blur(4)
      .resize(size, size)
      .greyscale()
      .raw()
      .toBuffer();
  }),
);
if (weights.some((w) => w.length !== size * size))
  throw Error("Land-cover weights must be single-channel");
const tiles = await Promise.all(
  meta.layers.map((layer, i) =>
    sharp(dir + "albedo.webp", { limitInputPixels: false })
      .extract({ left: 0, top: i * meta.albedo, width: meta.albedo, height: meta.albedo })
      .resize(tileSize, tileSize)
      .removeAlpha()
      .raw()
      .toBuffer(),
  ),
);
const tint = meta.layers.map((l) =>
  l.mean.map((mean, c) =>
    Math.max(
      0.35,
      Math.min(14, 1 + (LAYER_TARGET[l.id][c] / Math.max(mean, 1e-4) - 1) * PALETTE_PULL),
    ),
  ),
);
const pairs = [
  ["mud", "sand"],
  ["sand", "sand"],
  ["grass", "moss"],
  ["straw", "soil"],
  ["forest", "moss"],
  ["rock", "gravel"],
  ["concrete", "tiles"],
  ["asphalt", "asphalt"],
].map((pair) => pair.map((id) => GROUND_LAYERS.indexOf(id)));
const hash = (x, z) => {
  let n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
const noise = (x, z) => {
  const ix = Math.floor(x),
    iz = Math.floor(z);
  let u = x - ix,
    v = z - iz;
  u = u * u * (3 - 2 * u);
  v = v * v * (3 - 2 * v);
  return (
    (hash(ix, iz) * (1 - u) + hash(ix + 1, iz) * u) * (1 - v) +
    (hash(ix, iz + 1) * (1 - u) + hash(ix + 1, iz + 1) * u) * v
  );
};
function sample(layer, x, z, channel) {
  const scale = meta.layers[layer].size * 32;
  const px = ((((x / scale) % 1) + 1) % 1) * tileSize,
    pz = ((((z / scale) % 1) + 1) % 1) * tileSize;
  const ix = Math.floor(px),
    iz = Math.floor(pz),
    u = px - ix,
    v = pz - iz;
  const at = (dx, dz) =>
    tiles[layer][(((iz + dz) % tileSize) * tileSize + ((ix + dx) % tileSize)) * 3 + channel] / 255;
  const c = (at(0, 0) * (1 - u) + at(1, 0) * u) * (1 - v) + (at(0, 1) * (1 - u) + at(1, 1) * u) * v;
  return c * c * tint[layer][channel];
}
const pixels = Buffer.alloc(size * size * 3);
for (let row = 0; row < size; row++)
  for (let col = 0; col < size; col++) {
    const i = row * size + col,
      x = ((col + 0.5) * 10000) / size - 5000,
      z = ((row + 0.5) * 10000) / size - 5000;
    const broad = noise(x / 460, z / 460),
      medium = noise(x / 85 + 41, z / 85);
    // Rotated parcels break up the fields into restrained cultivated patches, not a grid overlay.
    const fx = x * 0.94 - z * 0.342,
      fz = x * 0.342 + z * 0.94;
    const field = hash(Math.floor(fx / 210), Math.floor(fz / 290));
    let total = 0;
    const rgb = [0, 0, 0];
    for (let k = 0; k < 8; k++) {
      const w = weights[k][i] / 255;
      if (w < 0.004) continue;
      const [a, b] = pairs[k];
      const variant =
        k === 3 ? 0.1 + field * 0.3 : Math.max(0, Math.min(0.65, (broad - 0.3) * 1.3));
      const variation = (0.85 + broad * 0.23 + medium * 0.13) * (k === 3 ? 0.9 + field * 0.2 : 1);
      for (let c = 0; c < 3; c++)
        rgb[c] +=
          (sample(a, x, z, c) * (1 - variant) + sample(b, -z + 71, x + 29, c) * variant) *
          w *
          variation;
      total += w;
    }
    for (let c = 0; c < 3; c++)
      pixels[i * 3 + c] = Math.round(
        Math.sqrt(Math.max(0, Math.min(1, rgb[c] / Math.max(total, 0.001)))) * 255,
      );
  }
// Raw RGB is decoded with the same square approximation as the existing tile arrays.
await sharp(pixels, { raw: { width: size, height: size, channels: 3 } })
  .webp({ quality: 90, effort: 6 })
  .toFile(dir + "surface-v1.webp");
const sha = (value) => createHash("sha256").update(value).digest("hex");
fs.writeFileSync(
  dir + "surface-v1.json",
  JSON.stringify(
    {
      size,
      worldSize: 10000,
      flipY: false,
      palette: sha(JSON.stringify({ GROUND_LAYERS, LAYER_TARGET, PALETTE_PULL })),
      sources: Object.fromEntries(
        ["public/fps/br/landcover.v1.lc", dir + "ground.json", dir + "albedo.webp"].map((f) => [
          f,
          sha(fs.readFileSync(f)),
        ]),
      ),
      output: sha(fs.readFileSync(dir + "surface-v1.webp")),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    output: dir + "surface-v1.webp",
    size,
    bytes: fs.statSync(dir + "surface-v1.webp").size,
  }),
);
