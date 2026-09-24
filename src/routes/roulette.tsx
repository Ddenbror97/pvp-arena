import { lazy, Suspense } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { RouletteGame } from "@/components/roulette/RouletteGame";
import { fetchCurrentRound, fetchHistory } from "@/lib/roulette/api";

export const Route = createFileRoute("/roulette")({
  head: () => ({
    meta: [
      { title: "Roulette — PVPspinArena" },
      { name: "description", content: "Multiplayer colour roulette: Red, Black, Yellow or Green 14x. Server-drawn and verifiable. Test credits only." },
      { property: "og:title", content: "Roulette — PVPspinArena" },
      { property: "og:description", content: "Pick a colour, watch the roll. Provably fair, test credits only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  loader: ({ context }) => {
    if (typeof window === "undefined") return;
    void context.queryClient.prefetchQuery({ queryKey: ["roulette-round"], queryFn: fetchCurrentRound, staleTime: 2000 });
    void context.queryClient.prefetchQuery({ queryKey: ["roulette-history"], queryFn: () => fetchHistory(12), staleTime: 2000 });
  },
  component: RoulettePage,
});

const GameChat = lazy(() => import("@/components/chat/GameChat").then((m) => ({ default: m.GameChat })));

function RoulettePage() {
  return (
    <>
      <h1 className="font-display text-3xl">Roulette</h1>
      <p className="mt-1 text-sm text-muted-foreground">Pick a colour before the roll. Everyone plays the same spin.</p>
      <ClientOnly fallback={<div className="mt-5 h-[40rem] animate-pulse rounded-2xl bg-card" />}>
        <div className="mt-5 grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <Suspense fallback={<div className="order-2 h-72 animate-pulse rounded-xl border border-border bg-card xl:order-1 xl:h-[40rem]" />}>
            <GameChat gameType="roulette" className="order-2 h-72 xl:order-1 xl:h-[40rem]" />
          </Suspense>
          <div className="order-1 xl:order-2"><RouletteGame /></div>
        </div>
      </ClientOnly>
    </>
  );
}
