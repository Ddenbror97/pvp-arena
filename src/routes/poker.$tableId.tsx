import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { DEALER_IMAGE, POKER_ROOM } from "@/lib/poker/assets";
import { PokerRoom } from "@/components/poker/PokerRoom";
import { PokerTable } from "@/components/poker/PokerTable";

export const Route = createFileRoute("/poker/$tableId")({
  head: ({ params }) => ({
    meta: [
      { title: `Poker table #${params.tableId} — PVPspinArena` },
      { name: "description", content: "Live six-max No-Limit Hold'em table." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: `Poker table #${params.tableId} — PVPspinArena` },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
    links: [
      { rel: "preload", as: "image", href: POKER_ROOM, type: "image/webp", fetchPriority: "high" },
      { rel: "preload", as: "image", href: DEALER_IMAGE, fetchPriority: "high" },
    ],
  }),
  component: Page,
});

function Page() {
  const { tableId } = Route.useParams();
  const id = Number(tableId);
  if (!Number.isSafeInteger(id) || id <= 0)
    return <p className="text-muted-foreground">Table not found.</p>;
  return (
    <>
      <PokerRoom />
      <ClientOnly
        fallback={
          <div className="poker-screen">
            <div className="poker-stage-wrap">
              <div className="poker-stage is-wide" />
            </div>
          </div>
        }
      >
        <PokerTable key={id} id={id} />
      </ClientOnly>
    </>
  );
}
