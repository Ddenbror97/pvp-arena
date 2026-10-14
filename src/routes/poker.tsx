import { createFileRoute, ClientOnly, Outlet, useMatch } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { PokerLobby } from "@/components/poker/PokerLobby";

export const Route = createFileRoute("/poker")({
  head: () => ({
    meta: [
      { title: "Poker | Six-Max No-Limit Hold'em | PVPspinArena" },
      {
        name: "description",
        content:
          "Six-max No-Limit Texas Hold'em against real players with a live dealer. Cash stacks, rake only when a flop is dealt, and a provably fair shuffle you can verify.",
      },
      { property: "og:title", content: "Poker | Six-Max No-Limit Hold'em | PVPspinArena" },
      {
        property: "og:description",
        content: "No-Limit Hold'em with a live dealer and a provably fair shuffle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: PokerLayout,
});

function PokerLayout() {
  const table = useMatch({ from: "/poker/$tableId", shouldThrow: false });
  const replay = useMatch({ from: "/poker/replay", shouldThrow: false });
  if (table || replay) return <Outlet />;
  return (
    <ClientOnly
      fallback={
        <div className="mx-auto h-[420px] w-full max-w-6xl animate-pulse rounded-2xl bg-card" />
      }
    >
      <PokerLobby />
    </ClientOnly>
  );
}
