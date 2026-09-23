import { createFileRoute, Outlet, useMatch } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { CreatePanel } from "@/components/coinflip/CreatePanel";
import { OpenGames, RecentCoinflips } from "@/components/coinflip/OpenGames";
import { useCoinflipRealtime } from "@/lib/coinflip/api";

export const Route = createFileRoute("/coinflip")({
  head: () => ({
    meta: [
      { title: "Coinflip — PVPspinArena" },
      { name: "description", content: "1v1 coinflip: pick heads or tails, match a wager, winner takes the pot. Server-decided and verifiable. Test credits only." },
      { property: "og:title", content: "Coinflip — PVPspinArena" },
      { property: "og:description", content: "1v1 provably fair coinflip. Test credits only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoinflipLayout,
});

function CoinflipLayout() {
  const child = useMatch({ from: "/coinflip/$gameId", shouldThrow: false });
  if (child) return <Outlet />;
  return (
    <>
      <h1 className="font-display text-3xl">Coinflip</h1>
      <p className="mt-1 text-sm text-muted-foreground">1 vs 1. Same wager, opposite sides, winner takes the pot. 50/50, decided on the server before the flip.</p>
      <ClientOnly fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-card" />}>
        <Lobby />
      </ClientOnly>
    </>
  );
}

function Lobby() {
  useCoinflipRealtime();
  return (
    <>
      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        <CreatePanel />
        <OpenGames />
      </div>
      <RecentCoinflips />
    </>
  );
}
