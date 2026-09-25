import { lazy, Suspense } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { RouletteGame } from "@/components/roulette/RouletteGame";
import { RecentRounds } from "@/components/roulette/RecentRounds";
import { fetchCurrentRound, fetchHistory } from "@/lib/roulette/api";
import heads from "@/assets/coin-heads.png.asset.json";
import tails from "@/assets/coin-tails.png.asset.json";
import green from "@/assets/roulette-green.png.asset.json";

export const Route = createFileRoute("/roulette")({
  head: () => ({
    meta: [
      { title: "Roulette — Multiplayer Coin Roulette | PVPspinArena" },
      {
        name: "description",
        content:
          "Bet on Purple, Silver or the 14x Green in our multiplayer coin roulette. Each slot is equally likely, the roll is server-drawn, and you can verify it.",
      },
      { property: "og:title", content: "Roulette — Multiplayer Coin Roulette | PVPspinArena" },
      { property: "og:description", content: "Multiplayer coin roulette: Purple, Silver or Green 14x. Verifiable." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
    links: [heads.url, tails.url, green.url].map((href) => ({ rel: "preload", as: "image", href, type: "image/webp" })),
  }),
  loader: ({ context }) => {
    if (typeof window === "undefined") return;
    void context.queryClient.prefetchQuery({ queryKey: ["roulette-round"], queryFn: fetchCurrentRound, staleTime: 2000 });
    void context.queryClient.prefetchQuery({ queryKey: ["roulette-history", 48], queryFn: () => fetchHistory(48), staleTime: 2000 });
  },
  component: RoulettePage,
});

const GameChat = lazy(() => import("@/components/chat/GameChat").then((m) => ({ default: m.GameChat })));

function RoulettePage() {
  return (
    <>
      <div>
        <h1 className="font-display text-2xl">Roulette</h1>
      </div>
      <div className="mt-3 min-h-[1287px] xl:min-h-[552px]">
      <ClientOnly fallback={<section aria-hidden className="h-[1287px] animate-pulse rounded-2xl bg-card xl:h-[552px]" />}>
        <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
          <Suspense fallback={<div className="order-2 h-64 animate-pulse rounded-xl border border-border bg-card xl:order-1 xl:h-full xl:min-h-[526px]" />}>
            <GameChat gameType="roulette" className="order-2 h-64 xl:order-1 xl:h-full xl:min-h-[526px]" />
          </Suspense>
          <div className="order-1 xl:order-2"><RouletteGame /></div>
        </div>
      </ClientOnly>
      </div>
      <RecentRounds />
    </>
  );
}
