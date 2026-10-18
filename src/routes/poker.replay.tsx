import { lazy, Suspense } from "react";
import { createFileRoute, ClientOnly, notFound } from "@tanstack/react-router";
import type { ReplayFixture } from "@/components/poker/PokerReplay";

const Replay = import.meta.env.DEV
  ? lazy(async () => {
      const [{ PokerReplay }, fixture] = await Promise.all([
        import("@/components/poker/PokerReplay"),
        import("@/lib/poker/replay/recorded-hands.json"),
      ]);
      const data = fixture.default as unknown as ReplayFixture;
      return { default: () => <PokerReplay fixture={data} /> };
    })
  : null;

export const Route = createFileRoute("/poker/replay")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => ({ meta: [{ title: "Poker replay (dev)" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  if (!Replay) return null;
  return (
    <ClientOnly fallback={null}>
      <Suspense fallback={null}>
        <Replay />
      </Suspense>
    </ClientOnly>
  );
}
