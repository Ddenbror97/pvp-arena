import { createFileRoute, Outlet, useMatch } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { loadSlottPaint, useQuerySeed } from "@/lib/first-paint";
import { SLOT_STAGE } from "@/lib/slott/stage";
import { SlottLobby } from "@/components/slott/SlottLobby";

export const Route = createFileRoute("/slott")({
  head: () => ({
    meta: [
      { title: "P2P Slott | 1v1 PvP Slot Duel | PVPspinArena" },
      {
        name: "description",
        content:
          "Duel another player on a 5×4 slot: equal stakes, 6 spins each, highest score takes the pot. Rare WILD bonuses boost the prize and every spin is provably fair.",
      },
      { property: "og:title", content: "P2P Slott | 1v1 PvP Slot Duel | PVPspinArena" },
      {
        property: "og:description",
        content:
          "Equal stakes, 6 spins each, highest score takes the pot. Every spin is provably fair.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
    links: [
      { rel: "preload", as: "image", href: SLOT_STAGE, type: "image/webp", fetchPriority: "high" },
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
  return <SlottLobby paintedAt={paint.recent?.at} />;
}
