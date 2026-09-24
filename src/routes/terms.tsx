import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — PVPspinArena" },
      { name: "description", content: "Terms for using PVPspinArena during the test-credit period." },
      { property: "og:title", content: "Terms — PVPspinArena" },
      { property: "og:description", content: "Terms for using PVPspinArena during the test-credit period." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: () => (
    <LegalPage title="Terms">
      <h2>Test credits only</h2>
      <p>PVPspinArena currently runs on test credits. They have no cash value, cannot be purchased, withdrawn, exchanged or transferred.</p>
      <h2>Eligibility</h2>
      <p>You must be 18 or older and legally allowed to use this kind of service where you live.</p>
      <h2>No licence claimed</h2>
      <p>PVPspinArena is not a licensed gambling operator. Real-money play is disabled.</p>
      <h2>Game rules</h2>
      <p>Each jackpot round is decided by the published fairness protocol. The complete pot, minus any house fee shown on the game record (currently 0%), goes to the winner.</p>
    </LegalPage>
  ),
});
