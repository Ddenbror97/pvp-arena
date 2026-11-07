type BrAccessEnvironment = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

/** Fresh database role lookup: admission tickets and JWT metadata do not confer BR access. */
export async function hasBrAdminAccess(env: BrAccessEnvironment, userId: string): Promise<boolean> {
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
      signal: AbortSignal.timeout(1200),
    });
    return response.ok && (await response.json()) === true;
  } catch {
    return false;
  }
}

/** Bounded parallel checks, deduplicated per user, with no positive role cache. */
export async function brAdminUsers(
  env: BrAccessEnvironment,
  userIds: string[],
): Promise<Set<string>> {
  const pending = [...new Set(userIds)];
  const admins = new Set<string>();
  await Promise.all(
    Array.from({ length: Math.min(4, pending.length) }, async () => {
      for (let userId = pending.pop(); userId !== undefined; userId = pending.pop()) {
        if (await hasBrAdminAccess(env, userId)) admins.add(userId);
      }
    }),
  );
  return admins;
}
