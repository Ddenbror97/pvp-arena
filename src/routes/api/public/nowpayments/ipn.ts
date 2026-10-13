import { createFileRoute } from "@tanstack/react-router";
import { nowpaymentsIpnGone } from "@/lib/crypto/nowpayments/retired";

export const Route = createFileRoute("/api/public/nowpayments/ipn")({
  server: {
    handlers: {
      GET: async () => nowpaymentsIpnGone(),
      POST: async () => nowpaymentsIpnGone(),
      PUT: async () => nowpaymentsIpnGone(),
    },
  },
});
