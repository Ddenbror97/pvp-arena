import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { partnerCookieToSet } from "@/lib/partner/cookie";

const CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/;
const COOKIE = "pvp_partner";

function cookieSecure() {
  return getRequest()?.headers.get("x-forwarded-proto") === "https";
}

function cookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, path: "/", secure: cookieSecure() };
}

/** Validate a partner acquisition code and remember it. The code is public; the partner id is not. */
export const openPartnerLink = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ code: z.string().max(32) }).parse(d))
  .handler(async ({ data }) => {
    const code = data.code.toUpperCase();
    if (!CODE.test(code)) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: { ok?: boolean; username?: string } | null; error: { message?: string } | null }>;
    };
    const { data: peek, error } = await admin.rpc("partner_acquisition_peek", { p_code: code });
    if (error || !peek?.ok) return { ok: false as const };
    const store = partnerCookieToSet(getCookie(COOKIE), code);
    if (store) setCookie(COOKIE, store, { ...cookieOptions(), maxAge: 60 * 60 * 24 * 7 });
    return { ok: true as const, username: peek.username ?? "a partner" };
  });

/** Attribute the signed-in new account to the partner code stored at click time. Idempotent. */
export const claimPartnerAttribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const code = getCookie(COOKIE);
    if (!code || !CODE.test(code)) return { ok: false as const, reason: "none" as const };
    const { data, error } = await context.supabase.rpc(
      "partner_acquisition_claim" as never,
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
