import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — PVPspinArena" },
      { name: "description", content: "What PVPspinArena stores and what other players can see." },
      { property: "og:title", content: "Privacy — PVPspinArena" },
      { property: "og:description", content: "What PVPspinArena stores and what other players can see." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage title="Privacy">
      <h2>Public</h2>
      <p>Your username, avatar, and your entries in jackpot rounds (amounts and chances) are visible to everyone.</p>
      <h2>Private</h2>
      <p>Your email, wallet balance and transaction history are visible only to you.</p>
    </LegalPage>
  ),
});
