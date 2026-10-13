import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { arenaLogo } from "@/assets/media";
import HomeArena from "@/components/jackpot/HomeArena";
import { useSeedIdentities } from "@/components/prestige/PrestigeProvider";
import { loadJackpotPaint, useQuerySeed } from "@/lib/first-paint";

export const Route = createFileRoute("/")({
  loader: () => loadJackpotPaint(),
  head: () => ({
    meta: [
      { title: "PvP Jackpot | CSGO-Style Crypto Jackpot | PVPspinArena" },
      {
        name: "description",
        content:
          "Play crypto Jackpot with real players. Join the pot, compete for the prize and verify every round with PVPspinArena's provably fair system.",
      },
      { property: "og:title", content: "PvP Jackpot | CSGO-Style Crypto Jackpot | PVPspinArena" },
      {
        property: "og:description",
        content:
          "Play crypto Jackpot with real players. Join the pot, compete for the prize and verify every round with PVPspinArena's provably fair system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
    links: [{ rel: "preload", as: "image", href: arenaLogo, type: "image/webp" }],
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
    </>
  );
}
