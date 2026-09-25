import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { CoinflipRoom } from "@/components/coinflip/CoinflipRoom";

export const Route = createFileRoute("/coinflip/$gameId")({
  head: ({ params }) => ({
    meta: [
      { title: `Coinflip #${params.gameId} — PVPspinArena` },
      { name: "description", content: `Live state and fairness proof for coinflip game #${params.gameId}.` },
      { property: "og:title", content: `Coinflip #${params.gameId} — PVPspinArena` },
      { property: "og:description", content: "1v1 coinflip with a verifiable, server-decided result." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: Page,
});

function Page() {
  const { gameId } = Route.useParams();
  const id = Number(gameId);
  if (!Number.isSafeInteger(id) || id <= 0) return <p className="text-muted-foreground">Game not found.</p>;
  return (
    <ClientOnly fallback={<div className="h-[520px] animate-pulse rounded-2xl bg-card" />}>
      <CoinflipRoom id={id} />
    </ClientOnly>
  );
}
