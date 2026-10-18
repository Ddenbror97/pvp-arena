import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireLiveSession } from "@/integrations/supabase/live-session";

export const identityStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .handler(async ({ context }) => {
    const { syncIdentity } = await import("./didit.server");
    return syncIdentity(context.userId);
  });

export const startIdentityFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ origin: z.string().max(200).optional() }).parse(d ?? {}))
  .middleware([requireSupabaseAuth, requireLiveSession])
  .handler(async ({ context, data }) => {
    const { startIdentity } = await import("./didit.server");
    return startIdentity(context.userId, data.origin);
  });
