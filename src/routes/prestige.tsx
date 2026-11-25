import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PrestigeSkeleton } from "@/components/prestige/PrestigeSkeleton";
import { PrestigePage } from "@/components/prestige/PrestigePage";

export const Route = createFileRoute("/prestige")({
  ssr: false,
  pendingMs: 0,
  pendingMinMs: 0,
  pendingComponent: () => <PrestigeSkeleton signedIn />,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Prestige — PVPspinArena" },
      { name: "robots", content: "noindex, follow" },
      {
        name: "description",
        content: "Your PVPspinArena level, XP, avatar frames, crowns, and milestone rewards.",
      },
      { property: "og:title", content: "Prestige — PVPspinArena" },
      {
        property: "og:description",
        content: "See your level, the next unlock, and the full prestige roadmap.",
      },
    ],
  }),
  component: PrestigePage,
});
