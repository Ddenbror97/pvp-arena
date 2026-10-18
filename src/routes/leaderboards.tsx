import { createFileRoute, Outlet, useMatch } from "@tanstack/react-router";
import { LeaderboardIndex } from "@/components/leaderboard/PublicLeaderboards";
import { useQuerySeed } from "@/lib/first-paint";
import { loadPublicListPaint } from "@/lib/leaderboard/paint";

export const Route = createFileRoute("/leaderboards")({
  loader: ({ location }) =>
    location.pathname === "/leaderboards" || location.pathname === "/leaderboards/"
      ? loadPublicListPaint()
      : null,
  head: () => ({
    meta: [
      { title: "Leaderboards — PVPspinArena" },
      {
        name: "description",
        content: "Partner wager races on PVPspinArena. Rankings use settled real-money stakes.",
      },
      { property: "og:title", content: "Leaderboards — PVPspinArena" },
      {
        property: "og:description",
        content: "Partner wager races ranked from settled real-money stakes.",
      },
    ],
  }),
  component: LeaderboardsLayout,
});

function LeaderboardsLayout() {
  const list = Route.useLoaderData();
  useQuerySeed([[["leaderboard-public-list"], list ? { data: list, at: Date.now() } : null]]);
  const child = useMatch({ from: "/leaderboards/$campaignId", shouldThrow: false });
  const partner = useMatch({ from: "/leaderboards/p/$username", shouldThrow: false });
  if (child || partner) return <Outlet />;
  return <LeaderboardIndex />;
}
