/**
 * A model's collision boxes in a short string (src/lib/fps/br/collision-fill.ts computes the
 * same): their count and a weighted sum of their coordinates, to the millimetre.
 */
export function boxesFingerprint(boxes) {
  let s = 0;
  boxes.forEach((b, i) => b.forEach((v, k) => (s += v * (((i * 6 + k) % 7) + 1))));
  return `${boxes.length}:${Math.round(s * 1000)}`;
}

/**
 * Boxes as the fill file stores them (collision-fill.ts decodeBoxes reads it): six signed
 * 16-bit centimetres per box, little-endian, in base64. ±327 m, 1 cm; a fill box is on a
 * 25 cm grid anyway, and as numbers in JSON the fill held 13 MB in a room of 128 MB.
 */
export function encodeBoxes(boxes) {
  const a = new Int16Array(boxes.length * 6);
  boxes.forEach((b, i) => b.forEach((v, k) => (a[i * 6 + k] = Math.round(v * 100))));
  return Buffer.from(a.buffer).toString("base64");
}

export function decodeBoxes(text) {
  const raw = Buffer.from(text, "base64");
  const a = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);
  const out = [];
  for (let i = 0; i < a.length; i += 6) out.push([...a.subarray(i, i + 6)].map((v) => v / 100));
  return out;
}
