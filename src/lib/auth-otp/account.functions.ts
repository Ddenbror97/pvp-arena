import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireLiveSession } from "@/integrations/supabase/live-session";
import {
  changePassword,
  completeEmailChange,
  completePasswordReset,
  resendEmailChange,
  resendPasswordReset,
  startEmailChange,
  startPasswordReset,
} from "./account.server";

function clientMeta() {
  const ip =
    getRequestHeader("cf-connecting-ip") ??
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const ua = getRequestHeader("user-agent")?.slice(0, 300) ?? null;
  return { ip, ua };
}

const email = z.string().trim().email().max(320);
const password = z.string().min(8).max(72);
const challengeId = z.string().uuid();
const code = z.string().regex(/^\d{6}$/);

export const startPasswordResetFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email }).parse(d))
  .handler(async ({ data }) => startPasswordReset({ email: data.email, ...clientMeta() }));

export const resendPasswordResetFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ challengeId }).parse(d))
  .handler(async ({ data }) =>
    resendPasswordReset({ challengeId: data.challengeId, ...clientMeta() }),
  );

export const completePasswordResetFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ challengeId, code, password }).parse(d))
  .handler(async ({ data }) => completePasswordReset(data));

export const changePasswordFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((d) =>
    z.object({ currentPassword: z.string().min(1).max(72), newPassword: password }).parse(d),
  )
  .handler(async ({ data, context }) =>
    changePassword({
      userId: context.userId,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    }),
  );

export const startEmailChangeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((d) =>
    z.object({ currentPassword: z.string().min(1).max(72), newEmail: email }).parse(d),
  )
  .handler(async ({ data, context }) =>
    startEmailChange({
      userId: context.userId,
      currentPassword: data.currentPassword,
      newEmail: data.newEmail,
      ...clientMeta(),
    }),
  );

export const resendEmailChangeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((d) => z.object({ challengeId }).parse(d))
  .handler(async ({ data, context }) =>
    resendEmailChange({ userId: context.userId, challengeId: data.challengeId, ...clientMeta() }),
  );

export const completeEmailChangeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((d) => z.object({ challengeId, code }).parse(d))
  .handler(async ({ data, context }) =>
    completeEmailChange({ userId: context.userId, challengeId: data.challengeId, code: data.code }),
  );
