import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireLiveSession } from "@/integrations/supabase/live-session";
import { startWithdrawalCode } from "./withdrawal.server";

export const withdrawalTargetSchema = z.discriminatedUnion("rail", [
  z.object({
    rail: z.literal("evm"),
    chainId: z.number().int().positive(),
    asset: z.string().regex(/^[A-Z0-9]{2,12}$/),
    usdCents: z.number().int().positive().max(100_000_000),
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  }),
  z.object({
    rail: z.literal("btc"),
    usdCents: z.number().int().positive().max(100_000_000),
    address: z.string().min(14).max(120),
  }),
]);

export const withdrawalCodeSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

/** Emails a one-time code that approves exactly this withdrawal. */
export const sendWithdrawalCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((d) => withdrawalTargetSchema.parse(d))
  .handler(async ({ data, context }) =>
    startWithdrawalCode({
      userId: context.userId,
      target: data,
      ip:
        getRequestHeader("cf-connecting-ip") ??
        getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
        null,
      ua: getRequestHeader("user-agent")?.slice(0, 300) ?? null,
    }),
  );
