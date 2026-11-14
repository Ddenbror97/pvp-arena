import { createFileRoute } from "@tanstack/react-router";
import { BombMatch } from "@/components/fps/BombMatch";
import { FairPlayNotice } from "@/components/fps/FairPlayNotice";

/** Practice Bomb Defusal (5v5 on Sandgate, bots fill empty slots). Not in the 1v1 map rotation. */
export const Route = createFileRoute("/fps-bomb")({
  head: () => ({
    meta: [
      { title: "Bomb Defusal Practice | PvPStrike" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <>
      <FairPlayNotice />
      <BombMatch />
    </>
  ),
});
