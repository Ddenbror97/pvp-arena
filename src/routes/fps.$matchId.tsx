import { createFileRoute } from "@tanstack/react-router";
import { ROTATION_ART_PRELOAD } from "@/lib/fps/maps/loading-art";
import { DuelMatch } from "@/components/fps/DuelMatch";

export const Route = createFileRoute("/fps/$matchId")({
  validateSearch: (raw: Record<string, unknown>) => ({
    ...(typeof raw["invite"] === "string" && raw["invite"].length <= 128
      ? { invite: raw["invite"] }
      : {}),
    ...(raw["spectate"] === true || raw["spectate"] === "true" ? { spectate: true } : {}),
  }),
  head: () => ({
    links: ROTATION_ART_PRELOAD.map((href) => ({
      rel: "preload",
      as: "image",
      href,
      type: "image/webp",
      fetchPriority: "high" as const,
    })),
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
