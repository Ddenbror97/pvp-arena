import { createFileRoute } from "@tanstack/react-router";
import { arenaLogo } from "@/assets/media";
import HomeArena from "@/components/jackpot/HomeArena";
import { GameFacts } from "@/components/seo/GameFacts";
import { indexableHead } from "@/lib/seo/indexable-head";
import { useSeedIdentities } from "@/components/prestige/PrestigeProvider";
import { loadJackpotPaint, useQuerySeed } from "@/lib/first-paint";

export const Route = createFileRoute("/")({
  loader: () => loadJackpotPaint(),
  head: () =>
    indexableHead({
      path: "/",
      title: "PvP Jackpot | CSGO-Style Crypto Jackpot | PVPspinArena",
      description:
        "Play crypto Jackpot with real players. Join the pot, compete for the prize and verify every round with PVPspinArena's provably fair system.",
      site: true,
      extraLinks: [{ rel: "preload", as: "image", href: arenaLogo, type: "image/webp" }],
    }),
  component: Index,
});

function Index() {
  const paint = Route.useLoaderData();
  const gameId = paint.game?.data?.id;
  useQuerySeed([
    [["open-game"], paint.game],
    gameId != null ? [["players", gameId], paint.players] : null,
    [["recent-games", 0], paint.recent],
  ]);
  useSeedIdentities(
    [
      (paint.players?.data ?? []).map((p) => p.user_id),
      (paint.recent?.data ?? []).map((g) => g.winner_id).filter((id): id is string => !!id),
      (paint.chat?.data ?? []).map((m) => m.user_id),
    ],
    paint.identities,
  );
  return (
    <>
      <h1 className="sr-only">PVPspinArena Jackpot</h1>
      <HomeArena chat={paint.chat} />
      <GameFacts game="jackpot" />
    </>
  );
}
