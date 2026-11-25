import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireLiveSession } from "@/integrations/supabase/live-session";
import { issueChallenge, verifyChallenge } from "./wallet.server";

export const requestWalletChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((d) => z.object({ address: z.string().regex(/^0x[0-9a-fA-F]{40}$/) }).parse(d))
  .handler(async ({ data, context }) => issueChallenge(context.userId, data.address));

export const verifyWalletSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((d) =>
    z
      .object({
        challengeId: z.string().uuid(),
        signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const result = await verifyChallenge(context.userId, data.challengeId, data.signature);
    if (result.ok && "address" in result && typeof result.address === "string") {
      const { noticeWalletLinked } = await import("@/lib/auth-otp/withdrawal.server");
      await noticeWalletLinked(context.userId, result.address, data.challengeId);
    }
    return result;
  });
