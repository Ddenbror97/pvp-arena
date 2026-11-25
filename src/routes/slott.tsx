import { createFileRoute, Outlet, useMatch } from "@tanstack/react-router";
import { GameFacts } from "@/components/seo/GameFacts";
import { indexableHead } from "@/lib/seo/indexable-head";
import { loadSlottPaint, useQuerySeed } from "@/lib/first-paint";
import { SYMBOL_IMG } from "@/lib/slott/symbols";
import { IDLE_GRID } from "@/components/slott/timing";
import { SLOT_STAGE } from "@/lib/slott/stage";
import { SlottLobby } from "@/components/slott/SlottLobby";

export const Route = createFileRoute("/slott")({
  head: () =>
    indexableHead({
      path: "/slott",
      title: "P2P Slott | 1v1 PvP Slot Duel | PVPspinArena",
      description:
        "Duel another player on a 5×4 slot: equal stakes, 6 spins each, highest score takes the pot. Rare WILD bonuses boost the prize and every spin is provably fair.",
      crumb: "P2P Slott",
      extraLinks: [
        ...Array.from(new Set(IDLE_GRID.map((id) => SYMBOL_IMG[id]!))).map((href) => ({
          rel: "preload",
          as: "image" as const,
          type: "image/webp",
          href,
        })),
        {
          rel: "preload",
          as: "image",
          href: SLOT_STAGE,
          type: "image/webp",
          fetchPriority: "high",
        },
      ],
    }),
  loader: ({ location }) => loadSlottPaint(location.pathname),
  component: SlottLayout,
});

function SlottLayout() {
  const child = useMatch({ from: "/slott/$gameId", shouldThrow: false });
  if (child) return <Outlet />;
  return <SlottLobbyPage />;
}

function SlottLobbyPage() {
  const paint = Route.useLoaderData();
  useQuerySeed([
    [["slot-config"], paint.config],
    [["slot-open"], paint.open],
    [["slot-recent", 0], paint.recent],
  ]);
  return (
    <>
      <SlottLobby paintedAt={paint.recent?.at} />
      <GameFacts game="slott" />
    </>
  );
}
