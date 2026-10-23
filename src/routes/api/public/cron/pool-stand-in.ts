import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/pool-stand-in")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handlePoolStandIn } = await import("@/lib/pool/stand-in.server");
        return handlePoolStandIn(request);
      },
    },
  },
});
