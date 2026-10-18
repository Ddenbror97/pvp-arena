import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { SLOT_STAGE } from "@/lib/slott/stage";
import { SlottMatch } from "@/components/slott/SlottMatch";

export const Route = createFileRoute("/slott/$gameId")({
  head: ({ params }) => ({
    meta: [
      { title: `P2P Slott #${params.gameId} — PVPspinArena` },
      {
        name: "description",
        content: `Live state and fairness proof for P2P Slott match #${params.gameId}.`,
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: `P2P Slott #${params.gameId} — PVPspinArena` },
      {
        property: "og:description",
        content: "1v1 slot duel with verifiable, server-decided spins.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
    links: [
      { rel: "preload", as: "image", href: SLOT_STAGE, type: "image/webp", fetchPriority: "high" },
    ],
  }),
  component: Page,
});

function Page() {
  const { gameId } = Route.useParams();
  const id = Number(gameId);
  if (!Number.isSafeInteger(id) || id <= 0)
    return <p className="text-muted-foreground">Match not found.</p>;
  return (
    <ClientOnly fallback={<div className="h-[640px] animate-pulse rounded-2xl bg-card" />}>
      <SlottMatch key={id} id={id} />
    </ClientOnly>
  );
}
