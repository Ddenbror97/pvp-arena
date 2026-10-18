import { createFileRoute, Outlet, useMatch } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { CreatePanel } from "@/components/coinflip/CreatePanel";
import { OpenGames, RecentCoinflips } from "@/components/coinflip/OpenGames";
import { GameChat } from "@/components/chat/GameChat";
import { useSeedIdentities } from "@/components/prestige/PrestigeProvider";
import { useCoinflipRealtime } from "@/lib/coinflip/api";
import { loadCoinflipPaint, useQuerySeed } from "@/lib/first-paint";

export const Route = createFileRoute("/coinflip")({
  head: () => ({
    meta: [
      { title: "PvP Coinflip | 1v1 Crypto Coin Flip | PVPspinArena" },
      {
        name: "description",
        content:
          "Play crypto Coinflip against real players. Pick your side, join the battle and verify every result with PVPspinArena's provably fair system.",
      },
      { property: "og:title", content: "PvP Coinflip | 1v1 Crypto Coin Flip | PVPspinArena" },
      {
        property: "og:description",
        content:
          "Play crypto Coinflip against real players. Pick your side, join the battle and verify every result with PVPspinArena's provably fair system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  loader: ({ location }) => loadCoinflipPaint(location.pathname),
  component: CoinflipLayout,
});

function CoinflipLayout() {
  const child = useMatch({ from: "/coinflip/$gameId", shouldThrow: false });
  if (child) return <Outlet />;
  return (
    <>
      <h1 className="sr-only">Coinflip</h1>
      <Lobby />
    </>
  );
}

function Lobby() {
  const paint = Route.useLoaderData();
  useCoinflipRealtime();
  useQuerySeed([
    [["coinflip-open"], paint.open],
    [["coinflip-live"], paint.live],
    [["coinflip-recent", 0], paint.recent],
  ]);
  useSeedIdentities(
    [
      (paint.open?.data ?? []).map((g) => g.creator_id),
      (paint.live?.data ?? []).flatMap((g) =>
        [g.creator_id, g.opponent_id].filter((id): id is string => !!id),
      ),
      (paint.chat?.data ?? []).map((m) => m.user_id),
    ],
    paint.identities,
  );
  return (
    <>
      <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px] xl:items-stretch">
        <div className="order-1 min-w-0 lg:order-2">
          <OpenGames />
        </div>
        <div className="order-2 min-w-0 lg:order-1 xl:order-3">
          <CreatePanel />
        </div>
        <GameChat
          gameType="coinflip"
          initial={paint.chat}
          className="order-3 h-72 sm:h-80 lg:col-span-2 xl:order-1 xl:col-span-1 xl:h-[34rem]"
        />
      </div>
      <RecentCoinflips />
    </>
  );
}
