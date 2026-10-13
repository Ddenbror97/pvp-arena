import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireLiveSession } from "@/integrations/supabase/live-session";

const pinSchema = z.string().regex(/^\d{6}$/);

function sessionOf(claims: object) {
  const value = (claims as { session_id?: unknown }).session_id;
  return typeof value === "string" ? { session_id: value } : {};
}

function fallback(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("FORBIDDEN")) return "You don't have access to this page.";
  return "Something went wrong. Try again.";
}

export const adminGateStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .handler(async ({ context }) => {
    try {
      const { adminGateStatus } = await import("./gate.server");
      return await adminGateStatus(context.userId, sessionOf(context.claims));
    } catch (error) {
      return { unavailable: true as const, error: fallback(error) };
    }
  });

export const createAdminPinFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((data) => z.object({ pin: pinSchema }).parse(data))
  .handler(async ({ data, context }) => {
    try {
      const { createAdminPin } = await import("./gate.server");
      return await createAdminPin(context.userId, sessionOf(context.claims), data.pin);
    } catch (error) {
      return { ok: false as const, error: fallback(error) };
    }
  });

export const verifyAdminPinFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((data) => z.object({ pin: pinSchema }).parse(data))
  .handler(async ({ data, context }) => {
    try {
      const { verifyAdminPinAndMaybeOtp } = await import("./gate.server");
      return await verifyAdminPinAndMaybeOtp(context.userId, sessionOf(context.claims), data.pin);
    } catch (error) {
      return { ok: false as const, error: fallback(error) };
    }
  });

export const sendAdminDeviceCodeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .handler(async ({ context }) => {
    try {
      const { sendAdminDeviceCode } = await import("./gate.server");
      return await sendAdminDeviceCode(context.userId, sessionOf(context.claims));
    } catch (error) {
      return { ok: false as const, error: fallback(error) };
    }
  });

export const verifyAdminDeviceCodeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((data) =>
    z.object({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    try {
      const { verifyAdminDeviceCode } = await import("./gate.server");
      return await verifyAdminDeviceCode(
        context.userId,
        sessionOf(context.claims),
        data.challengeId,
        data.code,
      );
    } catch (error) {
      return { ok: false as const, error: fallback(error) };
    }
  });
