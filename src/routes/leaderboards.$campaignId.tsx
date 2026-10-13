import { createFileRoute } from "@tanstack/react-router";
import { LeaderboardBoard } from "@/components/leaderboard/PublicLeaderboards";
import { useQuerySeed } from "@/lib/first-paint";
import { loadPublicBoardPaint } from "@/lib/leaderboard/paint";

export const Route = createFileRoute("/leaderboards/$campaignId")({
  loader: ({ params }) => loadPublicBoardPaint(params.campaignId),
  head: () => ({
    meta: [
      { title: "Leaderboard — PVPspinArena" },
      {
        name: "description",
        content: "Rankings, prizes, and rules for a PVPspinArena partner leaderboard.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BoardRoute,
});

function BoardRoute() {
  const { campaignId } = Route.useParams();
  const board = Route.useLoaderData();
  useQuerySeed([
    [["leaderboard-board", campaignId, 0], board ? { data: board, at: Date.now() } : null],
  ]);
  return <LeaderboardBoard campaignId={campaignId} />;
}
