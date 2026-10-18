import { createFileRoute } from "@tanstack/react-router";
import { workerEnv } from "@/lib/worker-env";

const MAX_BODY = 1_500_000;

export const Route = createFileRoute("/api/public/didit/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = workerEnv("DIDIT_WEBHOOK_SECRET");
        if (!secret) return new Response("Unavailable", { status: 503 });
        const raw = await request.text();
        if (raw.length > MAX_BODY) return new Response("Payload too large", { status: 413 });
        const { trustedSessionId } = await import("@/lib/identity/webhook");
        const sessionId = await trustedSessionId(
          raw,
          {
            signatureV2: request.headers.get("x-signature-v2"),
            signatureSimple: request.headers.get("x-signature-simple"),
            timestamp: request.headers.get("x-timestamp"),
          },
          secret,
        );
        if (!sessionId) return new Response("Unauthorized", { status: 401 });
        const { applySession } = await import("@/lib/identity/didit.server");
        await applySession(sessionId).catch(() => undefined);
        return Response.json({ ok: true });
      },
    },
  },
});
