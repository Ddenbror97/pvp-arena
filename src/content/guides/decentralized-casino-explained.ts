import type { Guide } from "./types";

export const guide: Guide = {
  slug: "decentralized-casino-explained",
  cluster: "Provably fair",
  keyword: "decentralized casino",
  secondary: ["defi casino", "dao casino", "non custodial gambling"],
  title: "Decentralised Casinos: Custody and Risk | PvP Spin Arena",
  description:
    "Decentralised casinos vary hugely in custody and governance. Compare the models, the fairness claims, and the questions to ask before depositing.",
  h1: "Decentralised Casinos: Custody, Governance and Trade-Offs",
  answer:
    "A decentralized casino is marketed as gambling without a central operator holding every lever, but the label hides several architectures. Some brands are non custodial only at deposit time while servers still decide outcomes. Others put bankrolls in DAO treasuries with token voting. A few run logic in audited contracts with public randomness. Before you treat decentralised as safer, map who holds funds, who can change parameters, how fairness is proved, and what happens if liquidity or governance fails. The same domain can mix models: PvP pots with public seeds beside house games that remain opaque. Treat each product line as its own risk decision instead of trusting a single decentralised headline. If you cannot explain custody to a friend in two sentences, pause deposits until you can. Slow verification beats fast deposits every time. Use this checklist before every new chain.",
  facts: [
    "Decentralised branding does not automatically mean non custodial play for every bet; read the wallet flow for each game tab.",
    "DAO-governed casinos shift risk to token holders who may vote on fees, games and treasury moves without every player noticing.",
    "Player-banked liquidity pools can pay yield-like returns that are not guaranteed and can be drained by variance or smart contract exploits.",
    "Provably fair proofs and on-chain bytecode can coexist with centralised front-ends and support teams that still hold database balances.",
    "PVPspinArena uses server-side commit-reveal HMAC for PvP rounds while keeping familiar account custody during play, not on-chain vrf draws.",
  ],
  sections: [
    {
      id: "what-decentralised-claims-to-mean",
      title: "What 'decentralised' claims to mean",
      body: `The word decentralised sells trustlessness, yet casinos still need someone to ship code, run websites and answer tickets.

### Marketing versus architecture

A site may call itself a **decentralized casino** because it accepts USDC on Base, because a token exists, or because one minigame lives in a contract. Each meaning implies different risk. Ask which parts are actually on-chain versus styled to look like DeFi.

### Non custodial gambling in practice

True non custodial play means your stake sits in a contract or escrow you can inspect until settlement, without the house silently editing a database balance. Many crypto brands are non custodial at withdrawal but custodial while you click through animated games.

### DeFi casino overlap

Yield farms that route house edge to liquidity providers blur gambling with investment marketing. Returns depend on volume, variance and token price, not a fixed APR promise.

### Fairness language

Decentralisation is not the same as provably fair. Read whether outcomes are player-verifiable via [commit-reveal](/guides/commit-reveal-scheme) or only described as certified RNG in a white paper.

### Where to learn more

The [provably fair guides](/guides/topics/provably-fair) topic collects verification guides. Compare decentralised claims with the hybrid model in [web3 casino](/guides/web3-casino) before you deposit.

### Red flag phrases

If a landing page says fully decentralised but the fairness page only shows a PDF seal with no seeds, you are looking at marketing decentralisation. Demand reproducible checks the way you would on any [provably fair casino](/guides/provably-fair-casino) product.

### Community noise

Discord moderators are not auditors. Treat governance forum votes as politics, not safety proofs. Your checklist stays custody, upgrades, and reproducible fairness either on-chain or via published HMAC docs.`,
    },
    {
      id: "custody-models-compared",
      title: "Custody models compared",
      body: `Custody answers who can move your money without your signature.

### Fully custodial internal balance

You send crypto to an address the operator controls; they credit dollars or chips in a database. Fast games, familiar support, but you trust withdrawals. Most hybrid sites work this way during sessions.

### Smart contract escrow

Stakes lock in a contract until a result function runs. You still trust the contract code and any admin keys that can upgrade it.

### Wallet-native betting

Each wager is a transaction you sign. Non custodial in the narrow sense, but gas and UX costs rise.

### Multisig treasuries

House bankrolls controlled by several signers reduce single-key theft but concentrate governance politics.

### Proof visibility

On-chain balances can be read by anyone; custodial balances cannot. [Proof of reserves](/guides/proof-of-reserves) snapshots try to bridge that gap for hybrid brands.

### Choosing a model

Match custody to stake size. Small entertainment budgets may accept custodial speed if you verify occasional rounds on the [Fairness](/fairness) page. Large single bets deserve clearer escrow rules and documented upgrade keys.

### Withdrawal drills

Before you trust any decentralised label, run a small withdrawal immediately after your first deposit. Delayed or manual approval processes tell you custody is still human, regardless of token logos on the homepage.`,
    },
    {
      id: "governance-and-treasury-risk",
      title: "Governance and treasury risk",
      body: `DAO casino narratives invite players to own the house through tokens. That ownership is real risk exposure.

### Token voting scope

Governance may set rake, list new games, hire teams or move treasury funds. Low turnout lets whales pass controversial votes.

### Treasury drains

A DAO treasury paying developers from gambling revenue can run dry if volume falls or if an exploit empties a linked contract.

### Regulatory attention

Tokens that share house profits may attract securities scrutiny depending on jurisdiction. Licensing discussions in [crypto casino license](/guides/crypto-casino-license) guides apply even when marketing says code replaces lawyers.

### Insider allocations

Large team or investor unlocks can dump price while players still gamble with the same edge.

### No free safety

Governance decentralisation does not stop addictive play. Pair any model with limits from the [responsible gambling](/responsible-gambling) page when you need a break.

### Token price distraction

When the platform token drops thirty percent in a week, forum talk focuses on charts instead of house edge. Remember you are still gambling on games, not diversifying an investment portfolio.`,
    },
    {
      id: "liquidity-provision-and-player-banked-pools",
      title: "Liquidity provision and player-banked pools",
      body: `Some decentralised casinos treat the house bankroll as a liquidity pool anyone can join.

### How LP pools work

You deposit tokens into a pool contract that backs player bets against the house. Fees or a share of edge flow to LPs. Variance can still wipe the pool on a lucky player streak even when randomness is fair.

### Impermanent loss analogies

Unlike AMM impermanent loss, gambling pool risk is outright insolvency from payouts, not just price drift.

### Smart contract exploits

Pool contracts are high-value targets. Unaudited forks of popular pool code repeat historical bugs.

### Disclosure quality

Read whether LPs can withdraw instantly or face lockups, and whether the UI shows open interest versus pool depth.

### Player perspective

You are not an LP when you bet against the pool, but you still care whether the pool can pay max wins. Undercapitalised pools may cap payouts silently.

### Links to verification

When games publish seeds, recompute a sample bet using [provably fair games](/guides/provably-fair-games) methods even if the pool is on-chain.

### Insurance narratives

Some DAOs promise backstops if the pool empties. Read whether that backstop is another token mint, which dilutes holders, or a real treasury transfer with multisig thresholds you can inspect.`,
    },
    {
      id: "fairness-guarantees",
      title: "Fairness guarantees",
      body: `Decentralised branding does not replace maths checks.

### On-chain transparency

Public functions show payout tables, but biased randomness inputs still produce unfair outcomes. Follow oracle or commit-reveal docs carefully.

### Server-side provably fair

Hybrid decentralised brands may run animations off-chain while publishing HMAC proofs. PVPspinArena uses commit-reveal server seeds for Jackpot, Coinflip and [Roulette](/roulette), verifiable after settlement on [how it works](/how-it-works).

### Certified RNG labs

Traditional certificates test operator RNG implementations, not DAO tweets. Compare scope in [RNG versus provably fair](/guides/rng-vs-provably-fair) before you equate a seal with decentralisation.

### Fake decentralisation

A token plus a contract address on the footer, while outcomes still come from a private API, is a common gap. Demand reproducible verification steps.

### Player workflow

Pick one settled bet, gather seeds or chain events, and run the published algorithm or an independent [provably fair calculator](/guides/provably-fair-calculator). Skip brands that hide message formats.

### Oracle delays

Decentralised vrf callbacks can take minutes. A fairness check might require the request id from explorer logs, not only a server seed string. Budget time to learn that workflow before you bet large amounts.`,
    },
    {
      id: "regulatory-exposure",
      title: "Regulatory exposure",
      body: `Geography still matters when servers and teams exist.

### Licensing gaps

Many decentralised front-ends cite offshore registrations or none at all. [Curacao gambling license](/guides/curacao-gambling-license) pages explain what common seals actually mean.

### Anonymous teams

Pseudonymous founders complicate dispute resolution when funds stick.

### Blocklists and DNS

Regulators target domains and app stores even if contracts stay online. Users may lose UI access while code persists.

### Tax and KYC

On-chain transparency does not erase reporting duties. Players remain responsible for local law.

### Scam clones

Decentralised aesthetics attract [fake casino sites](/guides/fake-casino-sites) that mimic interfaces while routing deposits to unrelated addresses. Verify URLs and contract links from primary sources only.

### Jurisdiction shopping

Teams cite one licence country while serving others where the product is illegal. Decentralised wording does not move you outside local law; it only moves marketing copy onto crypto Twitter.`,
    },
    {
      id: "questions-to-ask-before-depositing",
      title: "Questions to ask before depositing",
      body: `Use this checklist before you approve a wallet spend or send a deposit.

### Custody and contracts

Where do tokens sit during an open bet? Which explorer address matches the official docs? Can admins upgrade logic?

### Fairness

Can you recompute one historical outcome with public inputs? Does randomness come from oracles, commit-reveal or undisclosed servers?

### Liquidity

If you bet against a pool, what is the max payout today? Are wins capped when the pool is thin?

### Governance

Who votes on fees and treasury moves? Are tokens heavily concentrated?

### Support and RG

Are time-outs and self-exclusion available, not only token staking? Does the site link to [responsible gambling](/responsible-gambling) tools and honest help resources?

### Practical next steps

Start with minimum stakes, verify one round, withdraw a test amount, then scale only if every answer satisfied you. Decentralised language is cheap; reproducible checks are not.

### Topic tie-in

Continue with [server seed and client seed](/guides/server-seed-client-seed) mechanics if the site publishes HMAC fairness, or study [HMAC-SHA256 provably fair](/guides/hmac-sha256-provably-fair) before you trust a black-box vrf badge alone.

### Long-term tracking

Save contract addresses and governance forum links the day you join. When teams migrate to v2 contracts, compare permissions side by side instead of clicking approve in a hurry.

### Week-one journal

During your first week on any decentralised label, write nightly notes: where funds sat, whether you could verify a bet, and whether support answered custody questions clearly. Patterns beat slogans. If every note mentions manual withdrawals or changing contract addresses, you are not experiencing the non custodial story the banner promised. If verification worked twice and withdrawals were instant at small size, you still scale slowly because exploits often appear after TVL spikes, not on day one. Share your journal notes with a sceptical friend before you increase stakes; outside eyes catch rationalisations you normalised during excitement.`,
    },
  ],
  faqs: [
    {
      q: "Is a decentralized casino the same as non custodial gambling?",
      a: "Not always. You might sign deposits into operator wallets while only settlement contracts are public. Read whether your active balance is in a contract or a database. Non custodial marketing with custodial gameplay is common.",
    },
    {
      q: "Do DAO casinos remove house edge?",
      a: "No. They may route edge to token holders or LPs, but the maths of the games remains. Governance can even raise fees by vote.",
    },
    {
      q: "Are decentralised casinos legal everywhere?",
      a: "No. Laws depend on your location and on whether the team holds a license. Decentralised branding is not a legal shield.",
    },
    {
      q: "How does PVPspinArena fit this map?",
      a: "It is a hybrid site with provably fair PvP rounds using commit-reveal HMAC, not a DAO-run on-chain house bank. You verify rounds on the fairness page rather than reading Solidity for each spin.",
    },
    {
      q: "What is the biggest practical risk?",
      a: "Often custody and upgrade keys, not randomness marketing. A malicious or buggy contract can take funds faster than a biased dice roll would. Treat every approve button like signing a blank cheque until you read permissions.",
    },
  ],
  sources: [
    {
      label: "Ethereum — Introduction to smart contracts",
      url: "https://ethereum.org/en/smart-contracts/",
    },
    { label: "Chainlink — Decentralized oracle network overview", url: "https://docs.chain.link/" },
  ],
  related: [
    "web3-casino",
    "proof-of-reserves",
    "provably-fair-casino",
    "crypto-casino-license",
    "polymarket-alternatives",
  ],
  updated: "2026-09-26",
};
