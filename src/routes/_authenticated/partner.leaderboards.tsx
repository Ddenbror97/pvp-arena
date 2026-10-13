import { createFileRoute } from "@tanstack/react-router";
import { PartnerLeaderboards } from "@/components/leaderboard/PartnerLeaderboards";

export const Route = createFileRoute("/_authenticated/partner/leaderboards")({
  head: () => ({
    meta: [
      { title: "Partner leaderboards — PVPspinArena" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PartnerLeaderboards,
});
