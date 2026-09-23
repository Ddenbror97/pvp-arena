import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { CoinflipRoom } from "@/components/coinflip/CoinflipRoom";

export const Route = createFileRoute("/coinflip/$gameId")({
  head: ({ params }) => ({
    meta: [
      { title: `Coinflip #${params.gameId} — PVPCasino` },
      { name: "description", content: `Live state and fairness proof for coinflip game #${params.gameId}.` },
      { property: "og:title", content: `Coinflip #${params.gameId} — PVPCasino` },
      { property: "og:description", content: "1v1 coinflip with a verifiable, server-decided result. Test credits only." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
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
