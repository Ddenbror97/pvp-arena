import { createFileRoute } from "@tanstack/react-router";
import { DuelLobby } from "@/components/fps/DuelLobby";

export const Route = createFileRoute("/fps-duel")({
  head: () => ({
    meta: [{ title: "PvPStrike | PVPspinArena" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: DuelLobby,
});
