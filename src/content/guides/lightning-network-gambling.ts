import type { Guide } from "./types";

export const guide: Guide = {
  slug: "lightning-network-gambling",
  cluster: "Crypto payments",
  keyword: "lightning network casino",
  secondary: [
    "lightning network gambling",
    "bitcoin lightning casino",
    "ln casino deposit",
    "btc lightning gambling",
  ],
  title: "Lightning Network Casino: BTC Rails, Not This Site",
  description:
    "Lightning Network casino deposits use Bitcoin Lightning rails. How invoices work, what fails, and why this site uses USDC on Base.",
  h1: "Lightning Network casino: Bitcoin Lightning rails, not Base",
  answer:
    "A Lightning Network casino takes Bitcoin over Lightning: you pay a BOLT11 invoice (or a similar LN offer) from a Lightning wallet, the payment channel network routes satoshis, and the site credits a BTC or dollar balance. Fees are usually tiny and settlement is fast compared with on-chain Bitcoin. PVPspinArena is not a Lightning Network casino. It accepts on-chain Bitcoin, plus USDC and ETH on Base. Lightning BTC will not credit here.",
  facts: [
    "Lightning is a Bitcoin layer-2 payment-channel network, not a separate casino coin.",
    "Deposits are invoices or offers, not a Base 0x USDC transfer.",
    "On-chain BTC sent to a Lightning invoice, or LN paid to an on-chain address, will not land.",
    "Many “LN casinos” are custodial: the site holds BTC after the invoice clears.",
    "PVPspinArena watches Base for USDC and ETH. It does not watch Lightning.",
  ],
  sections: [
    {
      id: "what",
      title: "What a Lightning Network casino is watching",
      body: `A **Lightning Network casino** is a gambling cashier built on Bitcoin’s Lightning rails. You do not broadcast a main-chain transaction for every chip. You pay an invoice. Lightning nodes route the payment across channels. If it succeeds, the site’s node (or its processor) received satoshis and credits your account.

That is the whole definition. Fast and cheap is a property of the rail. It is not a promise the games are fair, licensed or solvent.

This guide is in [crypto payments](/guides/topics/crypto-payments). Adults 18+ only. PVPspinArena is Jackpot, Coinflip and Roulette with on-chain Bitcoin, plus USDC or ETH on Base. It is not a Lightning cashier.

On-chain BTC rooms are covered in [bitcoin casino](/guides/bitcoin-casino). Read that page if your coins are sitting in a bc1 address and you have never opened a Lightning wallet. This page is the invoice rail.

Marketing will say “instant bitcoin” and show a QR. Instant is the route succeeding. Instant is not the review on the way out, not the KYC if you cash to an exchange, and not the dollar value of BTC next hour. If you wanted instant *and* a stable chip, you wanted a cheap L2 stablecoin send, which is what [guides](/guides) on this site keep pointing at: USDC on Base.

Do not open a Lightning wallet for the first time on the same night you open a casino account. Learn invoices with a tiny payment to yourself or to a merchant you already use. Then, if you still want an LN room, use a test amount. Do not learn routing failures with a session bankroll.

If your exchange can withdraw USDC on Base, that path is usually less to learn than standing up Lightning for a $25 session. Save LN for rooms that only speak invoices — and for people who already had the wallet.`,
    },
    {
      id: "invoices",
      title: "Invoices, channels and why “send BTC” is the wrong button",
      body: `Lightning payments are **invoices** (classically BOLT11): a string that encodes amount, expiry, destination and routing hints. Some wallets now use BOLT12 offers. Either way, you are not pasting a Base USDC address.

### What has to be true

- Your wallet must speak Lightning, not only on-chain Bitcoin.
- The invoice must still be unexpired. LN invoices die. Paying a dead QR does nothing useful.
- Liquidity must exist along a route. Payments can fail for channel capacity even when both parties are honest.
- The amount is often fixed on the invoice. Overpaying or underpaying is not like sending extra USDC to a 0x.

### The classic mix-up

On-chain Bitcoin and Lightning Bitcoin are both “BTC” in casual speech. They are not interchangeable addresses. Sending a main-chain transaction to a Lightning invoice does not work. Paying Lightning to an on-chain deposit address does not work. Wrapped BTC on another chain is a third object.

If a cashier shows both “BTC” and “BTC Lightning,” read the label twice. Then send a satoshi-scale test if the site allows it.

Mobile wallets hide a lot of this. A “scan and pay” button can switch from on-chain to LN without a loud warning. Read the decode screen: amount, expiry, destination. If there is no expiry, you may be on-chain. If there is a 30-second expiry, you are on Lightning. Do not pay from a screenshot someone else sent. Clone invoices are a common steal.

Channel capacity failures look like “the casino is down.” Sometimes the casino is fine and your wallet cannot find a route. Wait, try a smaller amount, or use a different outbound path — do not invent a second invoice from a chat.`,
    },
    {
      id: "fees",
      title: "Fees: routing, processors and the game you came for",
      body: `Lightning routing fees are typically small — satoshis, not a Steam-style 15 percent. That is why people search this keyword for “cheap bitcoin gambling.” Cheap rail is not cheap play.

Custodial processors (exchanges, wallet apps, “LN pay” buttons) can add their own fee. The casino can add a deposit minimum in satoshis. Channel open and close costs sit in the background if you run your own node; casual users never see them until a wallet passes them through.

[Crypto casino deposit fees](/guides/crypto-casino-deposit-fees) is the three-bill framework. On Lightning the exchange/processor bill and the routing bill replace “Base gas.” The game bill remains.

### Illustration, labeled

You want $25 of play. An LN invoice is 25,000,000 satoshis if Bitcoin is $40,000 in this teaching example (numbers are for structure, not a live quote). A routing fee of a few satoshis barely moves the dollar. A 2 percent processor fee does. A 40× bonus attached to the invoice does more damage than any routing fee. Price the contract, not the meme that “Lightning is free.”`,
    },
    {
      id: "custody",
      title: "Custodial credit versus a channel you control",
      body: `After a successful invoice, most casinos hold BTC (or a dollar ledger they say is backed by BTC). You have an IOU. That is the same custody shape as any hot-wallet casino, just with a faster on-ramp.

Self-custodial Lightning (your node, your channels) does not make the casino less custodial once they have credited you. It only changes how you paid.

Withdrawals may go back out as Lightning, as on-chain BTC, or as a different coin. “Instant LN in, slow chain out” is a common pair. Read the cash-out page. [Crypto casino withdrawals](/guides/crypto-casino-withdrawals) is the general clock.

Price risk remains if the balance stays in BTC. A Lightning rail does not peg the dollar. If you wanted a stable chip, you wanted a stablecoin, not a faster bitcoin.`,
    },
    {
      id: "table",
      title: "Lightning versus Base on this site",
      body: `| Question | Lightning Network casino | PVPspinArena |
| --- | --- | --- |
| Asset on the wire | BTC satoshis over LN | USDC or ETH on Base |
| What you paste | Invoice / offer | 0x deposit address |
| Fee token | Routing + any processor | ETH on Base for gas |
| Typical speed | Seconds if the route works | Seconds on Base after credit rules |
| Dollar stability | No, if the ledger stays BTC | Yes, balances in USD cents |
| If you pay the other rail | No credit | No credit |

There is no bridge button on this site that “converts Lightning into Base.” Convert on an exchange you trust: BTC → USDC, withdraw USDC on **Base**, then deposit. [How to buy USDC](/guides/how-to-buy-usdc) and [gas fees explained](/guides/gas-fees-explained) cover that path.

A page that looks like us and shows a Lightning QR is not us.`,
    },
    {
      id: "risks",
      title: "What goes wrong on LN cashiers",
      body: `- **Expired invoice.** You paid a new invoice the support chat invented. The first payment is gone.
- **Phishing QR.** A stream overlay or a DM replaced the site’s invoice.
- **Failed route, wallet shows pending.** Do not pay a second invoice until the first is failed or settled. Double-pay is how people “lose” a deposit that later credits twice — or not.
- **Amountless invoices** you fill with a fat-finger. Read the amount the site printed, not the amount your wallet guessed.
- **Custodial wallet freeze.** Your LN wallet was an exchange account. They paused Lightning. The casino is not the blocker.

None of this is legal advice. Whether you may gamble where you live does not change because the rail was faster.`,
    },
    {
      id: "when-ln",
      title: "When Lightning is a reasonable cashier — elsewhere",
      body: `Lightning can be a good *rail* for someone who already lives in BTC, keeps a funded LN wallet, and accepts that the casino balance is still custody plus price risk. Fast satoshis beat a 40-minute on-chain wait when the mempool is ugly. That is a real product for rooms that actually watch Lightning.

It is the wrong cashier for this site. We do not watch invoices. We watch Base. If your coins are in a Lightning wallet and you want a dollar session here, the path is boring: swap to USDC, withdraw on Base, deposit USDC. Two extra minutes, one readable chip.

### Who should not open an LN casino account

- Anyone whose only Bitcoin is on an exchange that does not support Lightning withdrawals. You would be adding a wallet, channels and a new failure mode to save a miner fee you were not going to pay anyway.
- Anyone sizing a $15 session. Channel and processor minimums can eat that plan. A Base USDC send of $15 plus cents of gas is the shape we built for.
- Anyone who wanted “anonymous, untraceable, no account.” LN casinos still have accounts, device fingerprints and withdrawal rules. Fast is not invisible.

Node operators already know liquidity, inbound capacity and probe-fail payments. This page will not teach you to run a node. If you do not already have a Lightning wallet you trust, do not start one *because* a casino QR looked cheap.

Invoice phishing is faster than on-chain phishing because you decide in seconds. Screenshot the amount and destination the site showed. Compare to the wallet decode *before* you tap send. If they differ, stop. Support will not need you to pay a “corrected” invoice in a chat.

A Lightning Network casino is a bitcoin casino with a different envelope. Read the [bitcoin casino](/guides/bitcoin-casino) price-risk section if you will keep the balance in BTC after the invoice clears.`,
    },
    {
      id: "stop",
      title: "If instant rails are making instant chases",
      body: `Lightning’s pitch is speed. Speed is how a planned $20 becomes four invoices in twelve minutes. The rail is working. The budget is not.

If you cannot sit with a failed invoice without sending another, step away. Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). Help links are on [responsible gambling](/responsible-gambling).

If you already paid two invoices because the first one “looked stuck,” stop and wait. Double-pays are how a $25 plan becomes $50 before a chip appears. Speed is not a requirement to act twice.

PVPspinArena will not take the Lightning invoice. On-chain Bitcoin is a separate deposit on the wallet page, after you can close the tab.`,
    },
  ],
  faqs: [
    {
      q: "Does PVPspinArena accept Lightning Network deposits?",
      a: "No. It is not a Lightning Network casino. On-chain Bitcoin, and USDC or ETH on Base, are accepted. A Lightning invoice will not credit.",
    },
    {
      q: "What is a Lightning Network casino?",
      a: "A gambling site that credits Bitcoin paid over Lightning invoices (or offers), not a Base USDC transfer. On-chain BTC and Lightning are different payment types.",
    },
    {
      q: "Can I send on-chain BTC to a Lightning invoice?",
      a: "No. They are different payment types. The funds will not credit.",
    },
    {
      q: "Are Lightning casino fees lower than Bitcoin on-chain?",
      a: "Routing fees are usually much smaller than a congested on-chain miner fee. Processor fees and game edge can still dominate. Cheap rail is not cheap play.",
    },
    {
      q: "If I hold BTC, how do I use this site?",
      a: "Deposit on-chain Bitcoin from the wallet page, or send USDC or ETH on Base. A Lightning payment will not credit.",
    },
    {
      q: "Is Lightning gambling anonymous?",
      a: "Not automatically. Custodial wallets, KYC exchanges and the casino account still exist. Fast is not invisible.",
    },
  ],
  sources: [
    { label: "Lightning Network overview (lightning.network)", url: "https://lightning.network/" },
    { label: "Bitcoin.org — Lightning Network", url: "https://bitcoin.org/en/lightning-network" },
    {
      label: "BOLT11 invoice specification",
      url: "https://github.com/lightning/bolts/blob/master/11-payment-encoding.md",
    },
    { label: "Circle — USDC", url: "https://www.circle.com/en/usdc" },
  ],
  related: [
    "bitcoin-casino",
    "crypto-casino-deposit-fees",
    "gas-fees-explained",
    "usdc-casino",
    "base-network",
    "does-metamask-support-bitcoin",
  ],
  updated: "2026-09-26",
};
