type RoleClient = {
  rpc: (
    name: "has_role",
    args: { _user_id: string; _role: "admin" },
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

/** Display and admission use the same database-backed role, never editable user metadata. */
export async function canPlayBattleRoyale(db: RoleClient, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    const result = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
    return !result.error && result.data === true;
  } catch {
    return false;
  }
}
