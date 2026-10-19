import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/crypto-sweeps")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleCryptoJob } = await import("@/lib/crypto/jobs.server");
        return handleCryptoJob("sweeps", request);
      },
    },
  },
});
