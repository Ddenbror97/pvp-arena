import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { JackpotStage } from "@/components/jackpot/JackpotStage";
import { RecentGames } from "@/components/jackpot/RecentGames";
import { IntroGate } from "@/components/IntroGate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jackpot — PvP Jackpot Game | PVPspinArena" },
      {
        name: "description",
        content:
          "Enter the live PvP jackpot wheel: every cent you stake is a ticket in the draw, and a provably fair, server-decided draw picks the single winner.",
      },
      { property: "og:title", content: "Jackpot — PvP Jackpot Game | PVPspinArena" },
      { property: "og:description", content: "Live PvP jackpot wheel with provably fair, server-decided draws." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
    scripts: [{ children: INTRO_BOOT_SCRIPT }],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <IntroGate />
      <h1 className="sr-only">PVPspinArena Jackpot</h1>
      <JackpotStage />
      <RecentGames />
    </>
  );
}
