/**
 * Avatars are limited to the built-in DiceBear styles and are always loaded
 * through our own server (`/api/public/avatar/...`), so a player's browser
 * never requests an image from a host another player chose.
 */
export const AVATAR_STYLES = ["shapes", "rings", "glass", "identicon", "bottts-neutral", "thumbs"] as const;
export type AvatarStyle = (typeof AVATAR_STYLES)[number];

const STORED = /^https:\/\/api\.dicebear\.com\/9\.x\/(shapes|rings|glass|identicon|bottts-neutral|thumbs)\/svg\?seed=([A-Za-z0-9_]{1,40})$/;
const SEED = /^[A-Za-z0-9_]{1,40}$/;

export function isAvatarStyle(s: string): s is AvatarStyle {
  return (AVATAR_STYLES as readonly string[]).includes(s);
}
export function isAvatarSeed(s: string): boolean {
  return SEED.test(s);
}

/** Value stored in the profile (validated again by the database). */
export function storedAvatarUrl(style: AvatarStyle, seed: string): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`;
}

/** Same-origin URL to render, or null for anything that isn't an allowed avatar. */
export function avatarSrc(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const m = STORED.exec(stored);
  return m ? `/api/public/avatar/${m[1]}/${m[2]}` : null;
}
