import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { resendSignupCode, startSignup, verifySignupCode } from "./signup.server";

function clientMeta() {
  const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
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
      })
      .parse(d),
  )
  .handler(async ({ data }) => startSignup({ email: data.email, password: data.password, username: data.username, ...clientMeta() }));

export const resendSignupCodeFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ challengeId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => resendSignupCode({ challengeId: data.challengeId, ...clientMeta() }));

export const verifySignupCodeFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data }) => verifySignupCode(data));
