/**
 * Discord is another Supabase identity on the same user id as email/password.
 * Matching emails are not merged. An existing account signs in with its
 * password, then links Discord from Security while that session is live.
 * A Discord photo is copied once, through the existing avatar upload, and only
 * while the profile still has the default DiceBear avatar.
 */
export const DISCORD_PROVIDER = "custom:discord";

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
  return provider === DISCORD_PROVIDER || provider === "discord";
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

function cdnUrl(source: unknown): string | null {
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  const id = record["id"];
  const avatar = record["avatar"];
  if (typeof id !== "string" || !/^\d{17,20}$/.test(id)) return null;
  if (typeof avatar !== "string" || !/^[A-Za-z0-9_]{2,64}$/.test(avatar)) return null;
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=256`;
}
