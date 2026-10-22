import { createFileRoute, Outlet, useMatch } from "@tanstack/react-router";
import { GameFacts } from "@/components/seo/GameFacts";
import { PoolLobby } from "@/components/pool/PoolLobby";
import { indexableHead } from "@/lib/seo/indexable-head";
import { loadPoolPaint, useQuerySeed } from "@/lib/first-paint";

export const Route = createFileRoute("/pool")({
  head: () =>
    indexableHead({
      path: "/pool",
      title: "8-Ball Pool | Skill Match for a Pot | PVPspinArena",
      description:
        "Play 1v1 8-ball for a stake. The winner is the rules replay of the shots. The rack seed does not pick a winner. A 5% fee comes off the pot.",
      crumb: "8-ball",
    }),
  loader: ({ location }) => loadPoolPaint(location.pathname),
  component: PoolLayout,
});

function PoolLayout() {
  const child = useMatch({ from: "/pool/$matchId", shouldThrow: false });
  if (child) return <Outlet />;
  return (
    <>
      <Lobby />
      <GameFacts game="pool" />
    </>
  );
}

function Lobby() {
  const paint = Route.useLoaderData();
  useQuerySeed([[["pool-lobby"], paint.lobby]]);
  return <PoolLobby />;
}
