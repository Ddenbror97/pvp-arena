import { createClient } from "@supabase/supabase-js";
import { assertLiveSession } from "@/integrations/supabase/live-session";
import { workerEnv } from "@/lib/worker-env";

/**
 * Same checks as `requireSupabaseAuth` for a plain API route: a signed,
 * unexpired access token whose session still exists. Returns the user id.
 */
export async function authenticatedUserId(request: Request): Promise<string | null> {
  const token = /^Bearer ([^\s]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token || token.split(".").length !== 3) return null;
  const url = workerEnv("SUPABASE_URL");
  const key = workerEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return null;
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  try {
    const { data, error } = await supabase.auth.getClaims(token);
    const sub = data?.claims?.sub;
    if (error || typeof sub !== "string") return null;
    await assertLiveSession(supabase as unknown as Parameters<typeof assertLiveSession>[0]);
    return sub;
  } catch {
    return null;
  }
}
