type BrAccessEnvironment = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

/**
 * A role lookup's outcome. Only "denied" is the database saying no; "unknown" (timeout, network
 * error, HTTP error, unreadable reply) is no answer at all and must never be read as a denial:
 * the room's periodic re-check once dropped admins seconds after they connected whenever the
 * database took longer than its 1.2 s deadline to answer (2026-11-08).
 */
export type BrAccess = "admin" | "denied" | "unknown";

/** How long a role lookup may take (database round trip from the match region). */
const ROLE_TIMEOUT_MS = 5000;

/** Fresh database role lookup: admission tickets and JWT metadata do not confer BR access. */
export async function brAdminAccess(env: BrAccessEnvironment, userId: string): Promise<BrAccess> {
  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/has_role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Profile": "public",
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ _user_id: userId, _role: "admin" }),
      signal: AbortSignal.timeout(ROLE_TIMEOUT_MS),
    });
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      return "unknown";
    }
    const data: unknown = await response.json();
    // The RPC answers a boolean; anything else is not an answer.
    return data === true ? "admin" : data === false || data === null ? "denied" : "unknown";
  } catch {
    return "unknown";
  }
}

/** Admission: only a confirmed admin role lets a player in. */
export async function hasBrAdminAccess(env: BrAccessEnvironment, userId: string): Promise<boolean> {
  return (await brAdminAccess(env, userId)) === "admin";
}

/**
 * Periodic re-check: bounded parallel lookups, deduplicated per user, with no positive role
 * cache. Returns the users the database confirmed are no longer admins; users whose lookup
 * failed are left out (checked again next period).
 */
export async function brRevokedUsers(
  env: BrAccessEnvironment,
  userIds: string[],
): Promise<Set<string>> {
  const pending = [...new Set(userIds)];
  const revoked = new Set<string>();
  await Promise.all(
    Array.from({ length: Math.min(4, pending.length) }, async () => {
      for (let userId = pending.pop(); userId !== undefined; userId = pending.pop()) {
        if ((await brAdminAccess(env, userId)) === "denied") revoked.add(userId);
      }
    }),
  );
  return revoked;
}
