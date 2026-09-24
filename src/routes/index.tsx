import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { JackpotStage } from "@/components/jackpot/JackpotStage";
import { RecentGames } from "@/components/jackpot/RecentGames";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jackpot — PVPspinArena" },
      { name: "description", content: "Join the live PvP jackpot. Bigger stake, bigger slice of the wheel. Server-decided, verifiable draws." },
      { property: "og:title", content: "Jackpot — PVPspinArena" },
      { property: "og:description", content: "Live PvP jackpot with provably fair, server-decided draws. Test credits only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <h1 className="sr-only">PVPspinArena Jackpot</h1>
      <JackpotStage />
      <RecentGames />
    </>
  );
}
