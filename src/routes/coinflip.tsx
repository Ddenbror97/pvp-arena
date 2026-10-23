import { createFileRoute, Outlet, useMatch, useNavigate } from "@tanstack/react-router";
import room from "@/assets/coinflip/room.webp";
import { GameFacts } from "@/components/seo/GameFacts";
import { indexableHead } from "@/lib/seo/indexable-head";
import { CreatePanel } from "@/components/coinflip/CreatePanel";
import { OpenGames, RecentCoinflips } from "@/components/coinflip/OpenGames";
import { GameChat } from "@/components/chat/GameChat";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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
  const navigate = useNavigate();
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
      <Dialog
        open={!!child}
        onOpenChange={(open) => {
          if (!open) navigate({ to: "/coinflip", replace: true });
        }}
      >
        <DialogContent className="cf-duel-card w-[min(56rem,calc(100%-1.5rem))] max-w-none gap-0 overflow-hidden border-white/15 bg-[#070514] p-0 sm:rounded-2xl [&>button]:z-20">
          <DialogTitle className="sr-only">Coinflip duel</DialogTitle>
          <DialogDescription className="sr-only">
            The duel stays open over the coinflip lobby.
          </DialogDescription>
          <img
            className="cf-duel-fill"
            src={room}
            alt=""
            width={1280}
            height={720}
            decoding="async"
          />
          <img
            className="cf-duel-room"
            src={room}
            alt=""
            width={1280}
            height={720}
            decoding="async"
          />
          <div className="cf-duel-shade" aria-hidden />
          <div className="cf-duel-body">{child ? <Outlet /> : null}</div>
        </DialogContent>
      </Dialog>
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
      <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-4 xl:h-[34rem] xl:grid-cols-[280px_minmax(0,1fr)_300px] xl:items-stretch xl:gap-4">
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
          className="order-3 h-72 sm:h-80 lg:col-span-2 xl:order-1 xl:col-span-1 xl:h-full xl:min-h-0"
        />
      </div>
      <RecentCoinflips />
    </>
  );
}
