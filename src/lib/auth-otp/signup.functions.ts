import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { resendSignupCode, startSignup, verifySignupCode } from "./signup.server";
import { TURNSTILE_RETRY } from "./turnstile";
import { verifyTurnstile } from "./turnstile.server";

function clientMeta() {
  const ip =
    getRequestHeader("cf-connecting-ip") ??
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const ua = getRequestHeader("user-agent")?.slice(0, 300) ?? null;
  return { ip, ua };
}

export const startSignupFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().email().max(320),
        password: z.string().min(8).max(72),
        username: z.string().regex(/^[A-Za-z0-9_]{3,20}$/),
        ageConfirmed: z.literal(true),
        captchaToken: z.string().max(2048).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) =>
    startSignup({
      email: data.email,
      password: data.password,
      username: data.username,
      captchaToken: data.captchaToken ?? "",
      ...clientMeta(),
    }),
  );

export const confirmSignupHumanFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ captchaToken: z.string().max(2048).optional() }).parse(d))
  .handler(async ({ data }) => {
    const ok = await verifyTurnstile(data.captchaToken ?? "", clientMeta().ip);
    return ok ? { ok: true as const } : { ok: false as const, error: TURNSTILE_RETRY };
  });

export const resendSignupCodeFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ challengeId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) =>
    resendSignupCode({ challengeId: data.challengeId, ...clientMeta() }),
  );

export const verifySignupCodeFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }).parse(d),
  )
  .handler(async ({ data }) => verifySignupCode(data));
