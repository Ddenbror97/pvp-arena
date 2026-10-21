/** Slices narrower than this hide the face. A 100-player pot would otherwise stack avatars. */
export const WHEEL_AVATAR_MIN_DEG = 14;

/** Leave the baked texture alone for the slow end of a spin. A new upload there is a hitch. */
export const WHEEL_TEXTURE_QUIET_MS = 1500;

export const WHEEL_VIEW = 400;
export const WHEEL_R = 200;
export const WHEEL_INNER = 138;

export function wheelShowsAvatar(sweepDeg: number): boolean {
  return sweepDeg > WHEEL_AVATAR_MIN_DEG;
}

/** Center of the face on the 400-unit wheel, in the same space as the slices. */
export function wheelAvatarCenter(start: number, end: number): { x: number; y: number } {
  const mid = (start + end) / 2;
  const a = ((mid - 90) * Math.PI) / 180;
  const rr = (WHEEL_R + WHEEL_INNER) / 2 - 4;
  return { x: WHEEL_R + rr * Math.cos(a), y: WHEEL_R + rr * Math.sin(a) };
}

/**
 * Dim every slice except the winner. The overlay is a sibling of the rotor,
 * rotated by the same final angle, so fading it in does not repaint the wheel.
 */
export function winnerShade(startDeg: number, endDeg: number): string {
  const sweep = Math.min(360, Math.max(0, endDeg - startDeg));
  const from = ((startDeg % 360) + 360) % 360;
  return `conic-gradient(from ${from.toFixed(3)}deg, transparent 0deg ${sweep.toFixed(3)}deg, color-mix(in srgb, var(--background) 78%, transparent) ${sweep.toFixed(3)}deg 360deg)`;
}

/** True when a texture upload would land in the crawl at the end of the spin. */
export function wheelTextureQuiet(remainMs: number, painted: boolean): boolean {
  return painted && remainMs > 0 && remainMs < WHEEL_TEXTURE_QUIET_MS;
}
