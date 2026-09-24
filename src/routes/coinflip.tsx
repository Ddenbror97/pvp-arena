import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { createFileRoute, Outlet, useMatch } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { CreatePanel } from "@/components/coinflip/CreatePanel";
import { OpenGames, RecentCoinflips } from "@/components/coinflip/OpenGames";
import { useCoinflipRealtime, fetchOpenCoinflips, fetchRecentCoinflips } from "@/lib/coinflip/api";

let appHydrated = false;

export const Route = createFileRoute("/coinflip")({
  head: () => ({
    meta: [
      { title: "Coinflip — PVPspinArena" },
      {
        name: "description",
        content:
          "1v1 coinflip: pick heads or tails, match a wager, winner takes the pot. Server-decided and verifiable. Test credits only.",
      },
      { property: "og:title", content: "Coinflip — PVPspinArena" },
      { property: "og:description", content: "1v1 provably fair coinflip. Test credits only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  // Start fetching lobby data during navigation/hydration (browser only), not after the lobby mounts.
  loader: ({ context }) => {
    // Skip on the first page load: data landing mid-hydration would mismatch the server HTML.
    if (typeof window === "undefined" || !appHydrated) return;
    void context.queryClient.prefetchQuery({ queryKey: ["coinflip-open"], queryFn: fetchOpenCoinflips, staleTime: 3000 });
    void context.queryClient.prefetchQuery({ queryKey: ["coinflip-recent"], queryFn: () => fetchRecentCoinflips(), staleTime: 3000 });
  },
  component: CoinflipLayout,
});

function CoinflipLayout() {
  const child = useMatch({ from: "/coinflip/$gameId", shouldThrow: false });
  if (child) return <Outlet />;
  return (
    <>
      <h1 className="font-display text-3xl">Coinflip</h1>
      <Lobby />
    </>
  );
}

const GameChat = lazy(() =>
  import("@/components/chat/GameChat").then((m) => ({ default: m.GameChat })),
);

function Lobby() {
  useCoinflipRealtime();
  useEffect(() => { appHydrated = true; }, []);
  return (
    <>
      <div className="mt-5 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <CreatePanel />
        <OpenGames />
        <ClientOnly fallback={<div className="h-72 animate-pulse rounded-xl border border-border bg-card sm:h-80 lg:col-span-2 xl:col-span-1 xl:h-[32rem]" />}>
          <Suspense fallback={<div className="h-72 animate-pulse rounded-xl border border-border bg-card sm:h-80 lg:col-span-2 xl:col-span-1 xl:h-[32rem]" />}>
                    <GameChat gameType="coinflip" className="h-72 sm:h-80 lg:col-span-2 xl:col-span-1 xl:h-[32rem]" />
          </Suspense>
        </ClientOnly>
      </div>
      <RecentCoinflips />
    </>
  );
}
