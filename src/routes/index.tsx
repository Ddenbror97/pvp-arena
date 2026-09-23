import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { JackpotStage } from "@/components/jackpot/JackpotStage";
import { RecentGames } from "@/components/jackpot/RecentGames";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jackpot — PVPCasino" },
      { name: "description", content: "Join the live PvP jackpot. Bigger stake, bigger slice of the wheel. Server-decided, verifiable draws." },
      { property: "og:title", content: "Jackpot — PVPCasino" },
      { property: "og:description", content: "Live PvP jackpot with provably fair, server-decided draws. Test credits only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <h1 className="sr-only">PVPCasino Jackpot</h1>
      <ClientOnly fallback={<div className="h-[520px] animate-pulse rounded-2xl bg-card" />}>
        <JackpotStage />
      </ClientOnly>
      <ClientOnly fallback={null}>
        <RecentGames />
      </ClientOnly>
    </>
  );
}
