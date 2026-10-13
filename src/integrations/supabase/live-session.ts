import { createMiddleware } from "@tanstack/react-start";

type SessionClient = {
  rpc: (fn: string) => PromiseLike<{ error: { message: string } | null }>;
};

/** Rejects a still-unexpired access token whose auth.sessions row is gone. */
export async function assertLiveSession(supabase: SessionClient): Promise<void> {
  const { error } = await supabase.rpc("_assert_live_session");
  if (error) throw new Error("Unauthorized: Session is not active");
}

/**
 * Second gate for money server functions. requireSupabaseAuth calls the same
 * check; this stays in application code so a regenerated auth middleware
 * cannot drop it from withdrawals or wallet changes.
 */
export const requireLiveSession = createMiddleware({ type: "function" }).server(
  async ({ next, context }) => {
    const supabase = (context as unknown as { supabase?: SessionClient } | undefined)?.supabase;
    if (!supabase) throw new Error("Unauthorized: Session is not active");
    await assertLiveSession(supabase);
    return next();
  },
);
