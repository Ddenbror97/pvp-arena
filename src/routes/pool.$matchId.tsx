import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { PoolMatch } from "@/components/pool/PoolMatch";

export const Route = createFileRoute("/pool/$matchId")({
  head: ({ params }) => ({
    meta: [
      { title: `8-ball #${params.matchId} — PVPspinArena` },
      {
        name: "description",
        content: `Live 8-ball match #${params.matchId}. The winner is the replay of the shots, not a draw.`,
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: `8-ball #${params.matchId} — PVPspinArena` },
      {
        property: "og:description",
        content: "1v1 8-ball. The paid winner has to match a replay of the shots.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: Page,
});

function Page() {
  const { matchId } = Route.useParams();
  const id = Number(matchId);
  if (!Number.isSafeInteger(id) || id <= 0)
    return <p className="text-sm">That match does not exist.</p>;
  return <PoolMatch matchId={id} />;
}
