import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { referralCookieToSet } from "@/lib/referral/cookie";

const CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/;
const COOKIE = "pvp_ref";

function cookieSecure() {
  return getRequest()?.headers.get("x-forwarded-proto") === "https";
}

function cookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, path: "/", secure: cookieSecure() };
}

/** Validate an invite code and remember it until signup. The code is public; the inviter id is not. */
export const openInvite = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ code: z.string().max(32) }).parse(d))
  .handler(async ({ data }) => {
    const code = data.code.toUpperCase();
    if (!CODE.test(code)) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{
        data: {
          ok?: boolean;
          username?: string;
          deposit_cents?: number;
          play_cents?: number;
        } | null;
        error: { message?: string } | null;
      }>;
    };
    const { data: peek, error } = await admin.rpc("referral_peek", { p_code: code });
    if (error || !peek?.ok) return { ok: false as const };
    const { data: terms } = await admin.rpc("referral_terms");
    const store = referralCookieToSet(getCookie(COOKIE), code);
    if (store) setCookie(COOKIE, store, { ...cookieOptions(), maxAge: 60 * 60 * 24 * 7 });
    return {
      ok: true as const,
      username: peek.username ?? "a player",
      deposit_cents: Number(terms?.deposit_cents ?? 5000),
      play_cents: Number(terms?.play_cents ?? 500),
    };
  });

/** Attach the signed-in new account to the invite stored at click time. Idempotent. */
export const claimReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const code = getCookie(COOKIE);
    if (!code || !CODE.test(code)) return { ok: false as const, reason: "none" as const };
    const { data, error } = await context.supabase.rpc(
      "referral_claim" as never,
      { p_code: code } as never,
    );
    if (error) return { ok: false as const, reason: "error" as const };
    const result = (data ?? { ok: false }) as {
      ok: boolean;
      reason?: string;
      attributed?: boolean;
    };
    if (result.reason !== "no_profile") deleteCookie(COOKIE, cookieOptions());
    return result;
  });
