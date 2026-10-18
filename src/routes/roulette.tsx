import { createFileRoute } from "@tanstack/react-router";
import "@/lib/roulette/tick.functions";
import { ogImageMeta } from "@/lib/og";
import { RouletteGame } from "@/components/roulette/RouletteGame";
import { RecentRounds } from "@/components/roulette/RecentRounds";
import { GameChat } from "@/components/chat/GameChat";
import { useSeedIdentities } from "@/components/prestige/PrestigeProvider";
import { coinHeads, coinTails, rouletteGreen } from "@/assets/media";
import { loadRoulettePaint, useQuerySeed } from "@/lib/first-paint";

export const Route = createFileRoute("/roulette")({
  head: () => ({
    meta: [
      { title: "PVPspinArena Roulette: 2x and 14x Provably Fair Spins" },
      {
        name: "description",
        content:
          "Spin a 33-slot crypto roulette wheel: Purple or Silver pays 2x, Green pays 14x. Fast timed rounds in USD, and every result is provably fair and checkable.",
      },
      {
        property: "og:title",
        content: "PVPspinArena Roulette: 2x and 14x Provably Fair Spins",
      },
      {
        property: "og:description",
        content:
          "Spin a 33-slot crypto roulette wheel: Purple or Silver pays 2x, Green pays 14x. Fast timed rounds in USD, and every result is provably fair and checkable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
    links: [coinHeads, coinTails, rouletteGreen].map((href) => ({
      rel: "preload",
      as: "image",
      href,
      type: "image/webp",
    })),
  }),
  loader: () => loadRoulettePaint(),
  component: RoulettePage,
});

function RoulettePage() {
  const paint = Route.useLoaderData();
  const roundId = paint.round?.data?.id;
  useQuerySeed([
    [["roulette-round"], paint.round],
    [["roulette-history", 48], paint.history],
    [["roulette-recent", 0], paint.recent],
    [["roulette-setup"], paint.setup],
    roundId != null ? [["roulette-bets", roundId], paint.bets] : null,
    [["real-play-open"], paint.playOpen],
  ]);
  useSeedIdentities(
    [
      (paint.bets?.data ?? []).map((b) => b.user_id),
      (paint.chat?.data ?? []).map((m) => m.user_id),
    ],
    paint.identities,
  );
  return (
    <>
      <h1 className="sr-only">Roulette</h1>
      <div className="min-h-[1307px] xl:min-h-[572px]">
        <div className="grid items-stretch gap-3 xl:grid-cols-[280px_minmax(0,1fr)] xl:min-h-[546px]">
          <GameChat
            gameType="roulette"
            initial={paint.chat}
            className="order-2 h-64 xl:order-1 xl:h-[34rem]"
          />
          <div className="order-1 flex min-h-0 min-w-0 flex-col game-panel rounded-xl border p-2.5 xl:order-2 xl:h-full xl:py-2">
            <RouletteGame />
          </div>
        </div>
      </div>
      <RecentRounds />
    </>
  );
}
