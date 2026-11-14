import { createFileRoute } from "@tanstack/react-router";
import { BrMatch } from "@/components/fps/BrMatch";
import { BrAccessGate } from "@/components/fps/BrAccessGate";
import { FairPlayNotice } from "@/components/fps/FairPlayNotice";

/** Battle royale practice on Project Island (100 seats, bots fill the rest), linked from the lobby. */
export const Route = createFileRoute("/fps-br")({
  head: () => ({
    meta: [
      { title: "Battle Royale Practice | PvPStrike" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <BrAccessGate>
      <FairPlayNotice />
      <BrMatch />
    </BrAccessGate>
  ),
});
