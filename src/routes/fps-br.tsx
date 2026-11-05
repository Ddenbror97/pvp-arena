import { createFileRoute } from "@tanstack/react-router";
import { BrMatch } from "@/components/fps/BrMatch";

/** Battle royale practice on Project Island (100 seats, bots fill the rest). Not linked yet. */
export const Route = createFileRoute("/fps-br")({
  head: () => ({
    meta: [
      { title: "Battle Royale Practice | PvPStrike" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BrMatch,
});
