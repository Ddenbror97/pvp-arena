import type { Guide } from "./types";

export const guide: Guide = {
  slug: "proof-of-reserves",
  cluster: "Foundations",
  keyword: "proof of reserves",
  secondary: [
    "por crypto",
    "merkle tree reserves",
    "proof of liabilities",
    "exchange proof of reserves",
  ],
  title: "Proof of Reserves: What the Attestation Actually Shows",
  description:
    "Proof of reserves explained: Merkle trees, liabilities, what an attestation proves, and why it is not the same as a hashed game result.",
  h1: "Proof of reserves: what the attestation actually shows",
  answer:
    "Proof of reserves is a snapshot that tries to show an exchange or custodian holds enough on-chain assets to cover customer balances at a moment in time. A typical design is a Merkle tree of liabilities plus signed addresses for assets. It can catch a crude hole in the vault. It does not prove ongoing solvency, hidden debts, or that a casino game was fair.",
  facts: [
    "Proof of reserves is a point-in-time claim about assets versus listed customer balances.",
    "A Merkle tree lets you check that your balance was included without publishing every account.",
    "Assets without matching liabilities, or liabilities left off the tree, make the report misleading.",
    "An attestation by an accounting firm is still a snapshot plus the firm’s procedures, not a live feed.",
    "A hashed game seed proves a draw was pre-committed; it says nothing about a withdrawal wallet’s contents.",
  ],
  sections: [
    {
      id: "meaning",
      title: "What people mean by proof of reserves",
      body: `After several exchange failures, "proof of reserves" became a marketing phrase. In the strict sense it is an attempt to show that customer liabilities are backed by assets the firm can sign for on-chain. The honest name for a complete version is closer to proof of solvency: assets, liabilities and the gap between them.

A casino or exchange can publish wallet balances on a block explorer without a Merkle tree. That is a screenshot of addresses, not a proof that those addresses are all the wallets, or that customer IOUs were fully counted.

This [Foundations](/guides/topics/foundations) guide is for adults aged 18 or over. It explains what a POR attestation actually shows, then contrasts it with a hashed PvP result. PVPspinArena is a Jackpot, Coinflip and Roulette site that credits USDC and ETH on Base. On-chain deposits and payouts have hashes you can look up. That is payment evidence. It is not automatically a proof-of-reserves ceremony, and it is not a substitute for the [Fairness](/fairness) page.

If you are asking [are online casinos rigged](/guides/are-online-casinos-rigged), keep site solvency and game honesty on two lines. A solvent cheat can still tilt an RNG. An insolvent honest hashed pot can still fail to pay. POR talk after 2022 often arrived as a banner on the same week as a new deposit campaign. Read the snapshot date before you increase a balance because a root was tweeted.`,
    },
    {
      id: "merkle",
      title: "Merkle trees and proof of liabilities",
      body: `A Merkle tree of liabilities works like this in outline.

1. The firm lists each customer's balance at a snapshot height.
2. Those leaves are hashed in pairs up to a single Merkle root, which is published.
3. You are given your leaf and the sibling hashes on the path to the root.
4. You recompute the root. If it matches, your balance was in that tree.

That is proof of inclusion. It is valuable. It is also narrow. It proves *your* row was counted. It does not prove the firm did not omit a different customer, invent negative balances, or move assets for the photo.

Proof of liabilities is the name for "we counted the IOUs." Proof of reserves is the name for "we showed coins." You need both, plus a rule that the assets are unencumbered. A loaned-out stack can still sit in an address the firm signs.

Some designs add a third-party attestor who samples leaves and watches the root publication. That helps if you trust the attestor's scope. It does not help if the scope excludes legal claims or sister companies.

POR crypto dashboards that only show a big green number are ads until you can verify a leaf. If you cannot find your account ID in the download, you have a press release. Download the path, recompute, and store the root with a date. A root without a height or timestamp is a slogan.

Negative leaves or "netting" of debts inside the tree are a known way to shrink apparent liabilities. If the methodology PDF does not forbid that, ask. Self-serve inclusion proofs are for the balances the firm chose to put in the file.`,
    },
    {
      id: "assets",
      title: "What an attestation can show about assets",
      body: `On-chain assets are the easy part in theory. The firm signs a message from listed addresses, or an auditor observes balances at a time. Anyone can add the coins.

Limits:

- **Off-chain assets.** IOUs at other custodians, bank cash, and in-transit transfers may be asserted, not seen on a public chain.
- **Borrowed coins.** The firm can borrow for a day, pose, and return the coins.
- **Liabilities to non-customers.** Bonds, hacks already incurred, and legal judgments may not sit in the Merkle tree.
- **Token mix.** Showing 10,000 BTC does not cover 10,000 BTC-equivalent of altcoin IOUs if customers are owed those alts.
- **Access.** A signed address proves control at sign time, not that a single person cannot abscond tomorrow.

Accounting attestations add a third party who followed a written procedure. Read the procedure. An "agreed-upon procedures" letter is not the same as a full financial-statement audit. Dates matter. A letter from last quarter does not describe this morning.

Stablecoin issuer reports — Circle on USDC, Tether on USDT — are a different reserve story. They answer whether the *coin* is reserved, not whether a casino that takes the coin can pay you. Do not paste a Circle transparency URL into a debate about a betting site's treasury.

Exchange proof of reserves after a contagion week is also not a promise that withdrawal queues will stay at zero. Operations, fiat rails and sudden runs sit outside a Monday Merkle root.`,
    },
    {
      id: "casino",
      title: "What POR does not say about a casino",
      body: `A gambling balance is an IOU. Proof of reserves, if a casino published one, would speak to whether the payout wallets and treasury look large enough for the sum of player ledgers at a snapshot.

It would not say:

- That your next withdrawal will be signed. Limits and reviews still apply. See [crypto casino withdrawals](/guides/crypto-casino-withdrawals).
- That a slot or a live table used an honest RNG.
- That a PvP pot was hashed before you joined.
- That the terms will not void a bonus-tainted cashout.

PVPspinArena applies a $250 daily withdrawal limit and reviews requests over $25. Those are operational controls. They are not a Merkle ceremony. You can still view deposit and payout transactions on a Base explorer when they exist.

Hot-wallet versus cold-wallet splits at a casino matter here too. A POR that counts a cold address the ops team cannot sign in a crisis is a comforting number that still delays your cashout. A POR that counts only the hot wallet may look thin while most coins sit offline. Ask which addresses are in the sum and how fast they can move.

A [what is a crypto casino](/guides/what-is-a-crypto-casino) explainer covers the cashier. This page covers the solvency slogan people paste next to it. If a support agent sends a BaseScan link to the deposit wallet and calls it proof of reserves, that is a balance of one address, not a liability tree.`,
    },
    {
      id: "vs-fair",
      title: "Proof of reserves is not a hashed game result",
      body: `Players mash the word "proof" into one pile. Keep two protocols apart.

| Protocol | Question it answers | What you recompute |
| --- | --- | --- |
| Proof of reserves / Merkle liabilities | Were assets ≥ listed balances at time T? | Your leaf path to a published root (if offered) |
| Provably fair seed | Was this draw fixed after I bet? | Hash of the revealed seed and the result formula |

A [provably fair casino](/guides/provably-fair-casino) can be solvent or not. A solvent casino can still run an opaque RNG. You want both classes of answer if both risks worry you. One PDF cannot do both jobs.

On this site, recompute the round on Fairness. Then, if you care about treasury risk, look at how payouts are sent, what the limits are, and whether you are leaving more balance than you can afford to have stuck.`,
    },
    {
      id: "example",
      title: "Worked example: a clean root and an empty cashout queue",
      body: `Priya uses Exchange E, which published a Merkle root on Monday and a list of signed BTC addresses that sum to 12,000 BTC. Customer BTC IOUs in the tree sum to 11,400 BTC.

1. Priya verifies her leaf. The root matches. Her 0.5 BTC was included.
2. The report does not list a 2,000 BTC loan due Tuesday. If that loan is real, Monday's surplus was cosmetic.
3. Priya also plays on a casino that never published a tree. She deposits 50 USDC on Base, plays a $2 Coinflip, and checks the seed on Fairness. The draw matches. The casino could still pause withdrawals.
4. Priya withdraws $40. The tx confirms on Base. That is proof of *that* payout, not a POR for all players.

The Monday root was useful and incomplete. The Coinflip hash was useful and incomplete. Priya's working rule is: verify what can be verified, and do not store a month's rent on either platform.

If Exchange E later omits Priya's leaf after she files a ticket, the old root still proves she was counted on Monday. It does not force a court to treat the PDF as a bailout. Keep your own export.

If the casino never offers a tree, Priya can still reduce exposure: withdraw to a self-custody wallet after a session, keep a budget, and use Fairness on every pot she cares about. Absence of POR is common among small PvP sites. It is a reason to size the balance, not automatically a proof of fraud.`,
    },
    {
      id: "summary",
      title: "Summary: a snapshot is not a live solvency feed",
      body: `Proof of reserves, done carefully, is a snapshot of assets plus a Merkle inclusion proof for your liability. It can expose a crude hole. It can be gamed with borrowed coins and missing debts. It is not a hashed roulette number and it is not a promise that tomorrow's cashout will broadcast.

Frequency matters. A monthly root is better than a never. A weekly root can still be gamed for a day. Continuous proof systems exist in research and in a few products; they are not what most casino banners mean.

Use POR as one document. Use fairness tools for the draw. Use withdrawal history and limits for the cashier. On PVPspinArena, test a finished round on Fairness and keep a budget you can lose — including to a delayed cashout. Do not deposit more because a Merkle graphic looked official. Adults aged 18 or over should keep POR, hashed seeds and withdrawal limits on three lines of the same notepad. Confusing them is how a green dashboard becomes an oversized deposit.

Deposit because the remaining balance is a loss you have already accepted.

Merkle proofs of balances are related to, but not the same as, a [zero-knowledge proof](/guides/zero-knowledge-proof-gambling).`,
    },
  ],
  faqs: [
    {
      q: "Does proof of reserves mean an exchange cannot fail?",
      a: "No. It is a snapshot. Hidden liabilities, borrowed assets and later losses can still sink the firm.",
    },
    {
      q: "What is a Merkle tree used for in POR?",
      a: "It commits to a list of customer balances so you can check your row was included without publishing everyone else’s name and amount.",
    },
    {
      q: "Is proof of reserves the same as Circle’s USDC attestation?",
      a: "They are cousins: both are reserve stories. Circle’s reports are about the stablecoin issuer. An exchange POR is about that exchange’s customer IOUs.",
    },
    {
      q: "Can I use POR to check if a game was fair?",
      a: "No. Use a seed commitment and reveal, or a lab RNG report, depending on the product.",
    },
    {
      q: "Does PVPspinArena publish a Merkle proof of reserves?",
      a: "The site shows on-chain deposits and payouts and lets you verify game seeds. That is not the same ceremony as an exchange-style Merkle POR dashboard.",
    },
  ],
  sources: [
    { label: "Kraken — Proof of reserves", url: "https://www.kraken.com/proof-of-reserves" },
    {
      label: "a16z crypto — Proof of solvency",
      url: "https://a16zcrypto.com/posts/article/proof-of-solvency/",
    },
    { label: "CFA Institute — Proof of reserves discussion", url: "https://www.cfainstitute.org/" },
  ],
  related: [
    "what-is-a-crypto-casino",
    "fake-casino-sites",
    "no-kyc-casino",
    "anonymous-casino",
    "are-online-casinos-rigged",
    "zero-knowledge-proof-gambling",
  ],
  updated: "2026-09-26",
};
