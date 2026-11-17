/**
 * Discord is another Supabase identity on the same user id as email/password.
 * An existing account can also link Discord from Security while its session is
 * live. A Discord photo is copied once, through the existing avatar upload, and
 * only while the profile still has the default DiceBear avatar.
 *
 * Supabase's built-in Discord provider (owner, 2026-11-17: "the discord login
 * function does not work"). The custom OAuth2 provider ("custom:discord") read
 * Discord's /users/@me as generic OAuth claims: Discord sends `id` and
 * `verified`, not `sub` and `email_verified`, so every sign-in had no user id
 * ("error missing provider id") and an unverified email. The built-in provider
 * maps both.
 */
export const DISCORD_PROVIDER = "discord";

const PRODUCTION_HOSTS = new Set(["pvpspinarena.com", "www.pvpspinarena.com"]);

export function centerSquareCrop(
  width: number,
  height: number,
): { x: number; y: number; size: number } {
  const short = Math.min(width, height);
  return {
    x: width > 0 ? (width - short) / 2 / width : 0,
    y: height > 0 ? (height - short) / 2 / height : 0,
    size: 1,
  };
}

/** Known site origins only. Supabase still has to allow the same URL. */
export function oauthRedirect(origin: string, path: "/auth" | "/profile/security"): string | null {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  const host = url.hostname;
  const local = host === "localhost" || host === "127.0.0.1";
  if (PRODUCTION_HOSTS.has(host)) {
    if (url.protocol !== "https:") return null;
  } else if (local) {
    if (url.protocol !== "http:") return null;
  } else {
    return null;
  }
  return `${url.origin}${path}`;
}

export function discordSignInMessage(code: string, description: string): string {
  const text = `${code} ${description}`.replace(/\+/g, " ").toLowerCase();
  if (/access_denied|cancel/.test(text)) return "Discord sign-in was cancelled.";
  if (/identity_already|already linked/.test(text))
    return "That Discord account is already linked to another PVPspinArena account.";
  if (/email_exists|user_already|already registered|already been registered/.test(text))
    return "That email already has an account. Sign in with your password, then link Discord from Security.";
  if (/provider_email_needs_verification|unverified email/.test(text))
    return "Verify your email address in Discord first, then try again.";
  if (/manual_linking_disabled|manual linking/.test(text))
    return "Linking Discord is not available right now.";
  return "Couldn't sign in with Discord. Please try again.";
}

/** Second click while a redirect is starting does nothing. */
export function claimOAuthClick(gate: { current: boolean }): boolean {
  if (gate.current) return false;
  gate.current = true;
  return true;
}

type IdentitySource = {
  user_metadata?: unknown;
  identities?: { provider?: string; identity_data?: unknown }[] | null;
};

export function isDiscordProvider(provider: string | null | undefined): boolean {
  return provider === DISCORD_PROVIDER || provider === "custom:discord";
}

/**
 * Discord's userinfo returns an avatar hash, not a URL. This builds the CDN
 * address ourselves and refuses anything that is not that exact shape.
 */
export function discordAvatarFetchUrl(user: IdentitySource | null | undefined): string | null {
  if (!user) return null;
  const sources: unknown[] = [user.user_metadata];
  for (const identity of user.identities ?? []) {
    if (isDiscordProvider(identity.provider)) sources.push(identity.identity_data);
  }
  for (const source of sources) {
    const url = cdnUrl(source);
    if (url) return url;
  }
  return null;
}

/** The built-in provider's avatar URL: only a user avatar on Discord's CDN (not the defaults). */
const CDN_AVATAR =
  /^https:\/\/cdn\.discordapp\.com\/avatars\/(\d{17,20})\/([A-Za-z0-9_]{2,64})\.(?:png|gif|webp|jpg)$/;

function cdnUrl(source: unknown): string | null {
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  // Supabase's built-in Discord provider stores the whole CDN address.
  for (const key of ["avatar_url", "picture"]) {
    const value = record[key];
    const m = typeof value === "string" ? CDN_AVATAR.exec(value) : null;
    if (m) return `https://cdn.discordapp.com/avatars/${m[1]}/${m[2]}.png?size=256`;
  }
  const id = record["id"];
  const avatar = record["avatar"];
  if (typeof id !== "string" || !/^\d{17,20}$/.test(id)) return null;
  if (typeof avatar !== "string" || !/^[A-Za-z0-9_]{2,64}$/.test(avatar)) return null;
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=256`;
}
