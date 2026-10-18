/**
 * Content check for avatars. Rule-based, runs on the normalized 256×256
 * pixels in the same request, and sends nothing to any third party.
 *
 * - Explicit imagery: skin-pixel classification (RGB and YCbCr rules must
 *   both agree) plus connected skin regions, after Ap-apid's skin-region
 *   method. Images dominated by skin, or by several large skin regions around
 *   the centre, are refused.
 * - Graphic gore: a large share of deep blood-red pixels with real texture
 *   (flat red logos and backgrounds pass) next to skin.
 *
 * It is a coarse filter: it misses some explicit images and can refuse some
 * tight skin close-ups. Callers depend only on `moderateAvatarImage`, so the
 * rules can be replaced without touching the upload flow.
 */
import type { Pixels } from "./codecs";

export type ModerationResult = { ok: true } | { ok: false; reason: "explicit" | "graphic" };

export const MODERATION_RULES = {
  /** Below this share of skin the image always passes. */
  minSkin: 0.35,
  /** At or above this share of skin the image is refused. */
  dominantSkin: 0.6,
  /** A "large" region covers at least this share of the image. */
  largeRegion: 0.12,
  /** Share of the central box that is skin, for the multi-region rule. */
  centreSkin: 0.55,
  blood: 0.35,
  /** Luminance spread among blood pixels; flat red scores 0. */
  bloodTexture: 8,
  bloodSkin: 0.08,
};

const GRID = 128;

export function isSkin(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (!(r > 95 && g > 40 && b > 20 && max - min > 15 && Math.abs(r - g) > 15 && r > g && r > b))
    return false;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
}

export function isBlood(r: number, g: number, b: number): boolean {
  return r >= 90 && g <= 60 && b <= 60 && r > 2.2 * Math.max(g, b, 1);
}

/** Sizes of 4-connected regions in a boolean grid, largest first. */
function regionSizes(mask: Uint8Array, n: number): number[] {
  const seen = new Uint8Array(mask.length);
  const sizes: number[] = [];
  const stack: number[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    let size = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      size++;
      const x = i % n;
      const next = [x > 0 ? i - 1 : -1, x < n - 1 ? i + 1 : -1, i - n, i + n];
      for (const j of next) {
        if (j >= 0 && j < mask.length && mask[j] && !seen[j]) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    sizes.push(size);
  }
  return sizes.sort((a, b) => b - a);
}

export function analyzeAvatar(px: Pixels) {
  const step = px.width / GRID;
  const skin = new Uint8Array(GRID * GRID);
  let opaque = 0,
    skinCount = 0,
    bloodCount = 0,
    centreSkin = 0,
    centreTotal = 0;
  let lumSum = 0,
    lumSq = 0;
  const c0 = Math.floor(GRID * 0.2),
    c1 = Math.ceil(GRID * 0.8);
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const i = (Math.floor(gy * step) * px.width + Math.floor(gx * step)) * 4;
      const r = px.data[i]!,
        g = px.data[i + 1]!,
        b = px.data[i + 2]!,
        a = px.data[i + 3]!;
      if (a < 128) continue;
      opaque++;
      const inCentre = gx >= c0 && gx < c1 && gy >= c0 && gy < c1;
      if (inCentre) centreTotal++;
      if (isSkin(r, g, b)) {
        skin[gy * GRID + gx] = 1;
        skinCount++;
        if (inCentre) centreSkin++;
      }
      if (isBlood(r, g, b)) {
        bloodCount++;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        lumSum += lum;
        lumSq += lum * lum;
      }
    }
  }
  const total = Math.max(1, opaque);
  const regions = regionSizes(skin, GRID).map((s) => s / total);
  const mean = bloodCount ? lumSum / bloodCount : 0;
  return {
    skin: skinCount / total,
    centreSkin: centreTotal ? centreSkin / centreTotal : 0,
    largeRegions: regions.filter((s) => s >= MODERATION_RULES.largeRegion).length,
    blood: bloodCount / total,
    bloodTexture: bloodCount ? Math.sqrt(Math.max(0, lumSq / bloodCount - mean * mean)) : 0,
  };
}

export async function moderateAvatarImage(px: Pixels): Promise<ModerationResult> {
  const R = MODERATION_RULES;
  const a = analyzeAvatar(px);
  if (a.blood >= R.blood && a.bloodTexture >= R.bloodTexture && a.skin >= R.bloodSkin)
    return { ok: false, reason: "graphic" };
  if (a.skin < R.minSkin) return { ok: true };
  if (a.skin >= R.dominantSkin) return { ok: false, reason: "explicit" };
  if (a.largeRegions >= 2 && a.centreSkin >= R.centreSkin) return { ok: false, reason: "explicit" };
  return { ok: true };
}
