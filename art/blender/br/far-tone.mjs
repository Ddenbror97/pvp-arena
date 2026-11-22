/**
 * Colours for the far LODs of blocks of storeys (the towers, the apartment and Bauhaus blocks).
 *
 * A far LOD is seen from 300 m (from the air) or 600–800 m (on foot) to 4 km: a storey is 1–6
 * pixels high there. Whatever repeats at every storey in full contrast (a window band against a
 * white wall, a slab's pale edge on a dark frame) is then lines about a pixel wide, and lines
 * that thin come and go as the camera moves: the block's side crawls (owner, 2026-11-22: the
 * balcony apartments and towers "flicker in downtown alot in the parchute in higher attitude").
 * Measured in a glide 320 m off, on the sides in shade: 35–39 of every 1,000 pixels flashing
 * each frame with bands 1.5 to 1 in brightness, 13 with wide bands 1.8 to 1.
 *
 * So a far LOD paints each storey as two bands that keep the wall's average colour, the lighter
 * no more than FAR_BAND_RATIO times the darker: the storeys still read, nothing flashes.
 *
 * And it paints them flush, as strips of the wall itself (`strips`), never as boxes standing
 * proud of it. A band 2 cm proud has a 2 cm ledge on top, lit by the sun like a roof while the
 * wall under it is in shade: a bright line a twentieth of a pixel wide, which shows as white
 * dots that come and go along every storey (20–26 of 1,000 pixels flashing on the shaded sides
 * of the apartment and Bauhaus blocks with their bands as boxes). The same where one storey's
 * top meets the next one's foot in a tower: nothing lit from above may show in the seam.
 *
 * Vertex colours are linear (the renderer takes COLOR_0 as it is), so averaging them by area is
 * what a distant pixel does.
 */
export const FAR_BAND_RATIO = 1.25;

const r3 = (v) => +v.toFixed(3);

/** Colours averaged by area: blend([colour, share], …). */
export function blend(...parts) {
  const sum = [0, 0, 0];
  let total = 0;
  for (const [colour, share] of parts) {
    total += share;
    colour.forEach((v, i) => (sum[i] += share * v));
  }
  return sum.map((v) => r3(v / total));
}

/**
 * The two bands of a striped wall for a far LOD: `dark` and `light` as [colour, share of the
 * storey's height]. Returns { mean, dark, light }: the wall's average colour and the two bands'
 * colours round it, `ratio` apart at most (bands already closer than that are kept).
 */
export function bands([dark, darkShare], [light, lightShare], ratio = FAR_BAND_RATIO) {
  const mean = blend([dark, darkShare], [light, lightShare]);
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  if (lum(light) <= lum(dark) * ratio) return { mean, dark, light };
  const fd = darkShare / (darkShare + lightShare);
  const a = 1 / (fd + (1 - fd) * ratio);
  return { mean, dark: mean.map((v) => r3(v * a)), light: mean.map((v) => r3(v * a * ratio)) };
}

/**
 * A wall from y0 to y1 as strips: `painted` [[from, to, colour], …] (in any order, not
 * overlapping) and `base` wherever nothing is painted. Returns [[from, to, colour], …] bottom to
 * top, covering y0..y1 without a gap (each strip one flat quad of the wall for the caller).
 */
export function strips(y0, y1, painted, base) {
  const out = [];
  let y = y0;
  for (const [a, b, colour] of [...painted].sort((p, q) => p[0] - q[0])) {
    const from = Math.max(a, y0),
      to = Math.min(b, y1);
    if (to - from < 1e-6) continue;
    if (from < y - 1e-6) throw new Error(`strips overlap at ${from}`);
    if (from - y > 1e-6) out.push([y, from, base]);
    out.push([from, to, colour]);
    y = to;
  }
  if (y1 - y > 1e-6) out.push([y, y1, base]);
  return out.map(([a, b, c]) => [r3(a), r3(b), c]);
}
