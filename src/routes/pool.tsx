import { createFileRoute, Outlet, redirect, useMatch } from "@tanstack/react-router";
import hero from "@/assets/pool/hero.webp";
import { GameFacts } from "@/components/seo/GameFacts";
import { PoolLobby } from "@/components/pool/PoolLobby";
import { indexableHead } from "@/lib/seo/indexable-head";
import { loadPoolPaint, useQuerySeed } from "@/lib/first-paint";

export const Route = createFileRoute("/pool")({
  beforeLoad: ({ location }) => {
    const path = location.pathname.replace(/\/$/, "") || "/";
    if (path === "/pool") throw redirect({ to: "/8-ball-pool", statusCode: 301 });
  },
  head: () =>
    indexableHead({
      path: "/pool",
      title: "8-Ball Pool | Skill Match for a Pot | PVPspinArena",
      description:
        "Play 1v1 8-ball for a stake. The winner is the rules replay of the shots. The rack seed does not pick a winner. A 5% fee comes off the pot.",
      crumb: "8 Pool",
      extraLinks: [
        {
          rel: "preload",
          as: "image",
          href: hero,
          type: "image/webp",
          fetchPriority: "high",
        },
      ],
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
      <div className="px-4 pb-28 sm:px-6 lg:pb-10">
        <GameFacts game="pool" />
      </div>
    </>
  );
}

function Lobby() {
  const paint = Route.useLoaderData();
  useQuerySeed([[["pool-lobby"], paint.lobby]]);
  return <PoolLobby />;
}
