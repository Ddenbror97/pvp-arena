/**
 * Colour bleed for impostor cutouts: give every transparent and faint edge pixel the colour of
 * the nearest solid leaves (alpha unchanged). WebGL mipmaps average straight (not
 * premultiplied) RGBA, and the capture leaves those pixels black, so they darkened every
 * distant tree to near black (owner's H1Z1 reference review, 2026-11-05). Run by capture.mjs after each bake; standalone on existing files:
 *
 *   node scripts/br/impostors/bleed.mjs public/fps/br/models/tree-*.impostor.png
 */
import sharp from "sharp";

export async function bleed(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = new Uint8ClampedArray(data);
  // Which pixels have a true colour: the solid ones (faint edges come out of the capture
  // darkened toward black, like the clear ones).
  const SOLID = 128;
  let known = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) known[i] = px[i * 4 + 3] >= SOLID ? 1 : 0;
  // Grow the colours outward one ring at a time (averaging known neighbours).
  for (let ring = 0; ring < 64; ring++) {
    const next = known.slice();
    let grew = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (known[i]) continue;
        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx,
              yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const j = yy * w + xx;
            if (!known[j]) continue;
            r += px[j * 4];
            g += px[j * 4 + 1];
            b += px[j * 4 + 2];
            n++;
          }
        if (!n) continue;
        px[i * 4] = r / n;
        px[i * 4 + 1] = g / n;
        px[i * 4 + 2] = b / n;
        next[i] = 1;
        grew++;
      }
    known = next;
    if (!grew) break;
  }
  // Anything still unreached (far corners) takes the mean leaf colour.
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 0; i < w * h; i++)
    if (px[i * 4 + 3] >= SOLID) ((r += px[i * 4]), (g += px[i * 4 + 1]), (b += px[i * 4 + 2]), n++);
  for (let i = 0; i < w * h; i++)
    if (!known[i]) ((px[i * 4] = r / n), (px[i * 4 + 1] = g / n), (px[i * 4 + 2] = b / n));
  await sharp(Buffer.from(px.buffer), { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(file + ".tmp");
  const fs = await import("node:fs");
  fs.renameSync(file + ".tmp", file);
}

if (import.meta.url === `file://${process.argv[1]}`)
  for (const f of process.argv.slice(2)) {
    await bleed(f);
    console.log("bled", f);
  }
