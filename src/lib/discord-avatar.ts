import { renderAvatarWebp, uploadAvatarFile } from "@/lib/avatar-upload/client";
import { centerSquareCrop, discordAvatarFetchUrl } from "@/lib/discord-auth";

type DiscordUser = {
  user_metadata?: unknown;
  identities?: { provider?: string; identity_data?: unknown }[] | null;
};

/**
 * Copies a Discord profile photo into the existing avatar upload once.
 * The stored value is our own WebP. A failure leaves the DiceBear default.
 */
export async function adoptDiscordAvatar(user: DiscordUser | null | undefined): Promise<boolean> {
  if (typeof document === "undefined" || !user) return false;
  const picture = discordAvatarFetchUrl(user);
  if (!picture || !allowedDiscordPhoto(picture)) return false;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.referrerPolicy = "no-referrer";
  img.decoding = "async";
  img.src = picture;
  try {
    await img.decode();
  } catch {
    return false;
  }
  if (img.naturalWidth < 1 || img.naturalHeight < 1) return false;
  try {
    const blob = await renderAvatarWebp(img, centerSquareCrop(img.naturalWidth, img.naturalHeight));
    await uploadAvatarFile(blob, () => {});
    return true;
  } catch {
    return false;
  }
}

function allowedDiscordPhoto(picture: string): boolean {
  let url: URL;
  try {
    url = new URL(picture);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash)
    return false;
  if (url.hostname !== "cdn.discordapp.com" || url.search !== "?size=256") return false;
  return /^\/avatars\/\d{17,20}\/[A-Za-z0-9_]{2,64}\.png$/.test(url.pathname);
}
