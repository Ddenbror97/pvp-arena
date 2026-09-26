import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ogImageMeta } from "@/lib/og";
import { arenaLogo } from "@/assets/media";

const HomeArena = lazy(() => import("@/components/jackpot/HomeArena"));

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
    links: [{ rel: "preload", as: "image", href: arenaLogo, type: "image/webp" }],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <h1 className="sr-only">PVPspinArena Jackpot</h1>
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <HomeArena />
        </Suspense>
      </ClientOnly>
    </>
  );
}
