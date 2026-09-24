import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/crypto-reconcile")({
  server: {
    handlers: {
      POST: async () => {
        const { handleCryptoJob } = await import("@/lib/crypto/jobs.server");
        return handleCryptoJob("reconcile");
      },
    },
  },
});
