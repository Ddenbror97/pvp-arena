import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/btcpay-reconcile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleCryptoJob } = await import("@/lib/crypto/jobs.server");
        return handleCryptoJob("btcpay", request);
      },
    },
  },
});
