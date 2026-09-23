import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/responsible-gambling")({
  head: () => ({
    meta: [
      { title: "Responsible gambling — PVPCasino" },
      { name: "description", content: "Tools and guidance for playing responsibly on PVPCasino." },
      { property: "og:title", content: "Responsible gambling — PVPCasino" },
      { property: "og:description", content: "Tools and guidance for playing responsibly on PVPCasino." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage title="Responsible gambling">
      <p>Gambling should be entertainment, never a way to make money. Only play with what you can afford to lose.</p>
      <h2>Self-exclusion</h2>
      <p>Self-excluded accounts are blocked from entering games on the server. Contact support to request self-exclusion.</p>
      <h2>Limits</h2>
      <p>Deposit and wager limits will be available before any real-money launch.</p>
      <h2>Get help</h2>
      <p>If gambling is causing you harm, seek support from a local problem-gambling service.</p>
    </LegalPage>
  ),
});
