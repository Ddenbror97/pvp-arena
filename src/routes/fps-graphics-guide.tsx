import { createFileRoute } from "@tanstack/react-router";
import { GpuGuidePage } from "@/components/fps/GpuGuide";

export const Route = createFileRoute("/fps-graphics-guide")({
  head: () => ({
    meta: [
      { title: "Graphics card guide | PvPStrike | PVPspinArena" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GpuGuidePage,
});
