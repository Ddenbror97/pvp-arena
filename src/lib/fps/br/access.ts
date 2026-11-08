type RoleClient = {
  rpc: (
    name: "has_role",
    args: { _user_id: string; _role: "admin" },
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * The database role, as an answer: "unknown" when the lookup failed (an error or a network
 * failure), which admission must retry rather than report as "admin preview only".
 */
export async function battleRoyaleAccess(
  db: RoleClient,
  userId: string | null,
): Promise<"admin" | "denied" | "unknown"> {
  if (!userId) return "denied";
  try {
    const result = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (result.error) return "unknown";
    return result.data === true ? "admin" : "denied";
  } catch {
    return "unknown";
  }
}

/** Display and admission use the same database-backed role, never editable user metadata. */
export async function canPlayBattleRoyale(db: RoleClient, userId: string | null): Promise<boolean> {
  return (await battleRoyaleAccess(db, userId)) === "admin";
}
