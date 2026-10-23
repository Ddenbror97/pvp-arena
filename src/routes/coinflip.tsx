import { useEffect } from "react";
import { createFileRoute, Outlet, useMatch, useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import room from "@/assets/coinflip/room.webp";
import { GameFacts } from "@/components/seo/GameFacts";
import { indexableHead } from "@/lib/seo/indexable-head";
import { CreatePanel } from "@/components/coinflip/CreatePanel";
import { OpenGames, RecentCoinflips } from "@/components/coinflip/OpenGames";
import { GameChat } from "@/components/chat/GameChat";
import { useSeedIdentities } from "@/components/prestige/PrestigeProvider";
import { useCoinflipRealtime } from "@/lib/coinflip/api";
import { loadCoinflipPaint, useQuerySeed } from "@/lib/first-paint";

const roomPreload = {
  rel: "preload" as const,
  as: "image" as const,
  href: room,
  type: "image/webp",
  fetchPriority: "high" as const,
};

export const Route = createFileRoute("/coinflip")({
  head: () =>
    indexableHead({
      path: "/coinflip",
      title: "PvP Coinflip | 1v1 Crypto Coin Flip | PVPspinArena",
      description:
        "Play crypto Coinflip against real players. Pick your side, join the battle and verify every result with PVPspinArena's provably fair system.",
      crumb: "Coinflip",
      extraLinks: [roomPreload],
    }),
  loader: ({ location }) => loadCoinflipPaint(location.pathname),
  component: CoinflipLayout,
});

function CoinflipLayout() {
  const child = useMatch({ from: "/coinflip/$gameId", shouldThrow: false });
  return (
    <>
      <h1 className="sr-only">Coinflip</h1>
      <div key="cf-home" className="cf-home">
        <img
          className="cf-room-fill"
          src={room}
          alt=""
          width={1280}
          height={720}
          decoding="async"
        />
        <img
          className="cf-room"
          src={room}
          alt=""
          width={1280}
          height={720}
          decoding="async"
          fetchPriority="high"
        />
        <div className="cf-room-shade" aria-hidden />
        <div className="cf-home-body">
          <Lobby />
        </div>
      </div>
      <GameFacts game="coinflip" />
      {child ? <CoinflipDuel /> : null}
    </>
  );
}

function CoinflipDuel() {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") navigate({ to: "/coinflip", replace: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
  const close = () => navigate({ to: "/coinflip", replace: true, resetScroll: false });
  return (
    <div className="cf-duel-pop" role="dialog" aria-modal="true" aria-labelledby="cf-duel-title">
      <button type="button" className="cf-duel-scrim" aria-label="Close coinflip" onClick={close} />
      <div className="cf-duel-card">
        <button type="button" className="cf-duel-x" aria-label="Close" onClick={close}>
          <X className="h-4 w-4" />
        </button>
        <h2 id="cf-duel-title" className="sr-only">
          Coinflip duel
        </h2>
        <div className="cf-duel-body">
          <Outlet />
        </div>
      </div>
    </div>
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
      <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-4 xl:h-[var(--lobby-chat)] xl:grid-cols-[280px_minmax(0,1fr)_300px] xl:items-stretch xl:gap-4">
        <div className="order-1 min-w-0 lg:order-2 xl:h-full xl:min-h-0 xl:overflow-y-auto">
          <OpenGames />
        </div>
        <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1 xl:order-3 xl:h-full xl:min-h-0 xl:overflow-hidden">
          <CreatePanel />
          <RecentCoinflips layout="rail" />
        </div>
        <GameChat
          gameType="coinflip"
          initial={paint.chat}
          className="order-3 h-64 lg:col-span-2 xl:order-1 xl:col-span-1 xl:h-[var(--lobby-chat)] xl:min-h-0"
        />
      </div>
      <RecentCoinflips />
    </>
  );
}
