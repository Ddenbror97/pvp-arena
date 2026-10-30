// Server-only Resend sender. Same path as signup codes: Lovable gateway when
// LOVABLE_API_KEY is set, otherwise the Resend API directly.
import { appendFileSync } from "node:fs";
import { workerEnv } from "@/lib/worker-env";
import { developmentEmailSink } from "./email-sink.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const DEFAULT_FROM = "PVPspinArena <noreply@pvpspinarena.com>";
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

function env(name: string): string {
  const v = workerEnv(name);
  if (!v) throw new Error(`Missing server configuration: ${name}`);
  return v;
}

/** Normalise a configured sender into a strict `Name <addr>` that Resend accepts. */
export function normaliseFrom(raw: string, fallbackName = "PVPspinArena"): string | null {
  const v = raw
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
  const m = v.match(/<\s*([^<>\s]+)\s*>/);
  const addr = (m?.[1] ?? v).trim().toLowerCase();
  if (!EMAIL_RE.test(addr)) return null;
  const name = (m ? v.slice(0, v.indexOf("<")) : "").replace(/["<>]/g, "").trim() || fallbackName;
  return `${name} <${addr}>`;
}

export async function sendAuthEmail(input: {
  to: string;
  idempotencyKey: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  // Local browser tests have no Resend project. A development process can
  // capture mail only in its dedicated OS temp directory. Production always
  // uses the configured delivery service, even if a sink variable is present.
  const sink = developmentEmailSink(workerEnv("AUTH_EMAIL_SINK"), process.env["NODE_ENV"]);
  if (sink) {
    appendFileSync(
      sink,
      `${JSON.stringify({ to: input.to, subject: input.subject, text: input.text })}\n`,
    );
    return { ok: true };
  }
  let from = normaliseFrom(process.env["AUTH_EMAIL_FROM"] ?? workerEnv("AUTH_EMAIL_FROM") ?? "");
  if (!from) {
    console.warn("AUTH_EMAIL_FROM missing or malformed; using default sender");
    from = DEFAULT_FROM;
  }
  const replyRaw = workerEnv("AUTH_EMAIL_REPLY_TO") ?? process.env["AUTH_EMAIL_REPLY_TO"];
  const replyTo = replyRaw && EMAIL_RE.test(replyRaw.trim()) ? replyRaw.trim() : undefined;
  const payload = {
    from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(replyTo ? { reply_to: replyTo } : {}),
  };

  const resendKey = workerEnv("RESEND_API_KEY");
  const lovableKey = workerEnv("LOVABLE_API_KEY");
  const res = lovableKey
    ? await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": env("RESEND_API_KEY"),
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify(payload),
      })
    : resendKey
      ? await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
            "Idempotency-Key": input.idempotencyKey,
          },
          body: JSON.stringify(payload),
        })
      : null;
  if (!res) {
    console.error("No RESEND_API_KEY or LOVABLE_API_KEY configured for auth email");
    return { ok: false, error: "email_not_configured" };
  }
  if (!res.ok) {
    const body = await res.text();
    console.error(`Resend send failed [${res.status}]: ${body.slice(0, 300)}`);
    return { ok: false, error: `http_${res.status}` };
  }
  return { ok: true };
}
