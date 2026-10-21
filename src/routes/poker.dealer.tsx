import { lazy, Suspense } from "react";
import { createFileRoute, ClientOnly, notFound } from "@tanstack/react-router";

const Gallery = import.meta.env.DEV
  ? lazy(() => import("@/components/poker/DealerGallery").then((m) => ({ default: m.DealerGallery })))
  : null;

export const Route = createFileRoute("/poker/dealer")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => ({ meta: [{ title: "Dealer animation (dev)" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  if (!Gallery) return null;
  return (
    <ClientOnly fallback={null}>
      <Suspense fallback={null}>
        <Gallery />
      </Suspense>
    </ClientOnly>
  );
}
