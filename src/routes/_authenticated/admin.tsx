import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { AdminDashboard } from "@/components/admin/Dashboard";
import { isAdminTab, type AdminTab } from "@/lib/admin/ops";

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { section: AdminTab; log?: string | undefined } => {
    const raw = search["section"];
    const log = search["log"];
    return {
      section: typeof raw === "string" && isAdminTab(raw) ? raw : "overview",
      log: typeof log === "string" && log.length > 0 && log.length <= 80 ? log.trim() : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Admin — PVPspinArena" },
      { name: "description", content: "PVPspinArena operations dashboard." },
      { property: "og:title", content: "Admin — PVPspinArena" },
      { property: "og:description", content: "PVPspinArena operations dashboard." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      ...ogImageMeta(),
    ],
  }),
  component: AdminDashboard,
});
