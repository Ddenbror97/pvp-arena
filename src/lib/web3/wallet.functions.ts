import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { WALLET_ERROR_CODES } from "./errors";
import { CLIENT_EVENTS, issueChallenge, recordEvent, verifyChallenge } from "./wallet.server";

export const requestWalletChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ address: z.string().regex(/^0x[0-9a-fA-F]{40}$/) }).parse(d))
  .handler(async ({ data, context }) => issueChallenge(context.userId, data.address));

export const verifyWalletSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        challengeId: z.string().uuid(),
        signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) =>
    verifyChallenge(context.userId, data.challengeId, data.signature),
  );

export const recordWalletEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        event: z.enum(CLIENT_EVENTS),
        address: z
          .string()
          .regex(/^0x[0-9a-fA-F]{40}$/)
          .nullable(),
        reason: z.enum(WALLET_ERROR_CODES).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) =>
    recordEvent(context.userId, data.event, data.address, data.reason),
  );
