import { createFileRoute } from "@tanstack/react-router";
import { STRIKE_SHOWCASE } from "@/lib/fps/showcase";
import { DuelMatch } from "@/components/fps/DuelMatch";

export const Route = createFileRoute("/fps/$matchId")({
  validateSearch: (raw: Record<string, unknown>) => ({
    ...(typeof raw["invite"] === "string" && raw["invite"].length <= 128
      ? { invite: raw["invite"] }
      : {}),
    ...(raw["spectate"] === true || raw["spectate"] === "true" ? { spectate: true } : {}),
  }),
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
    meta: [
      { title: "PvPStrike Arena | PVPspinArena" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: FpsMatchRoute,
});
function FpsMatchRoute() {
  const { matchId } = Route.useParams();
  const search = Route.useSearch();
  return <DuelMatch key={matchId} matchId={matchId} {...search} />;
}
