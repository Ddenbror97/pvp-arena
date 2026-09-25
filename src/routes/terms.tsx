import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — PVPspinArena" },
      { name: "description", content: "Terms for using PVPspinArena." },
      { property: "og:title", content: "Terms — PVPspinArena" },
      { property: "og:description", content: "Terms for using PVPspinArena." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: () => (
    <LegalPage title="Terms">
      <h2>Real-money play</h2>
      <p>PVPspinArena accepts deposits in USDC and ETH on the Base network. Deposits are credited to your account balance in US dollars; winnings can be withdrawn back to your verified wallet. Balances are not insured and crypto assets can be volatile.</p>
      <h2>Eligibility</h2>
      <p>You must be 18 or older and legally allowed to use this kind of service where you live. It is your responsibility to check the rules that apply to you.</p>
      <h2>Deposits and withdrawals</h2>
      <p>Deposits are credited after the required network confirmations and only when sent from a wallet you have verified on your profile. Withdrawals are sent to your verified wallet and may be reviewed before processing. Minimum amounts and daily limits apply and are shown in the wallet.</p>
      <h2>Responsible play</h2>
      <p>You can self-exclude at any time from your profile; self-excluded accounts cannot deposit, wager or withdraw until the exclusion ends. Never play with money you cannot afford to lose.</p>
      <h2>Game rules</h2>
      <p>Each round is decided by the published fairness protocol. The complete pot, minus any house fee shown on the game record (currently 0%), goes to the winner.</p>
      <h2>Availability</h2>
      <p>The service is provided as is. We do not guarantee uninterrupted availability, and network congestion or maintenance can delay deposits and withdrawals.</p>
    </LegalPage>
  ),
});
