import { createFileRoute } from "@tanstack/react-router";
import room from "@/assets/pool/room.webp";
import { PoolPractice } from "@/components/pool/PoolPractice";
export const Route = createFileRoute("/pool/practice")({
  head: () => ({
    meta: [
      { title: "Free 8-ball Practice vs Bot | PVPspinArena" },
      {
        name: "description",
        content:
          "Practise 8-ball for free against a dedicated pool bot. No stake or payout; the same table, physics and shot rules as cash pool.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "preload", as: "image", href: room, type: "image/webp" }],
  }),
  component: PoolPractice,
});
