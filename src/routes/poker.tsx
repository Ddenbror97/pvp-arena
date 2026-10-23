import { createFileRoute, Outlet, useMatch } from "@tanstack/react-router";
import { GameFacts } from "@/components/seo/GameFacts";
import { indexableHead } from "@/lib/seo/indexable-head";
import { loadPokerPaint, useQuerySeed } from "@/lib/first-paint";
import { DEALER_IMAGE, POKER_ROOM } from "@/lib/poker/assets";
import { DEALER_IDLE_URL } from "@/lib/poker/dealer-frames";
import { PokerLobby } from "@/components/poker/PokerLobby";

export const Route = createFileRoute("/poker")({
  head: () =>
    indexableHead({
      path: "/poker",
      title: "Poker | Six-Max No-Limit Hold'em | PVPspinArena",
      description:
        "Six-max No-Limit Texas Hold'em against real players. Cash stacks, a 5% fee only after a flop, and a shuffle you can recompute.",
      crumb: "Poker",
      extraLinks: [
        {
          rel: "preload",
          as: "image",
          href: POKER_ROOM,
          type: "image/webp",
          fetchPriority: "high",
        },
        {
          rel: "preload",
          as: "image",
          href: DEALER_IMAGE,
          type: "image/webp",
          fetchPriority: "high",
        },
        {
          rel: "preload",
          as: "image",
          href: DEALER_IDLE_URL,
          type: "image/webp",
          fetchPriority: "high",
        },
      ],
    }),
  loader: ({ location }) => loadPokerPaint(location.pathname),
  component: PokerLayout,
});

function PokerLayout() {
  const table = useMatch({ from: "/poker/$tableId", shouldThrow: false });
  const replay = useMatch({ from: "/poker/replay", shouldThrow: false });
  const dealerGallery = useMatch({ from: "/poker/dealer", shouldThrow: false });
  if (table || replay || dealerGallery) return <Outlet />;
  return <PokerLobbyPage />;
}

function PokerLobbyPage() {
  const paint = Route.useLoaderData();
  useQuerySeed([[["poker-lobby"], paint.lobby]]);
  return (
    <>
      <h1 className="sr-only">Poker</h1>
      <PokerLobby />
      <GameFacts game="poker" />
    </>
  );
}
