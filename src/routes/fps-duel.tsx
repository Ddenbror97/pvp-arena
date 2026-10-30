import { createFileRoute } from "@tanstack/react-router";
import { STRIKE_SHOWCASE } from "@/lib/fps/showcase";
import { DuelLobby } from "@/components/fps/DuelLobby";

export const Route = createFileRoute("/fps-duel")({
  head: () => ({
    links: [
      {
        rel: "preload",
        as: "image",
        href: STRIKE_SHOWCASE,
        type: "image/webp",
        fetchPriority: "high",
      },
    ],
    meta: [{ title: "PvPStrike | PVPspinArena" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: DuelLobby,
});
