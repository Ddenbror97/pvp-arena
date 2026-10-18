import type { Guide } from "./types";

export const guide: Guide = {
  slug: "chainlink-vrf-gambling",
  cluster: "Provably fair",
  keyword: "chainlink vrf gambling",
  secondary: ["onchain randomness", "vrf casino", "verifiable random function"],
  title: "Chainlink VRF Gambling: On-Chain Randomness",
  description:
    "Verifiable random functions let a contract prove its randomness. How VRF works, how it compares with commit-reveal, and what it cannot prove.",
  h1: "Chainlink VRF in Gambling: On-Chain Randomness Explained",
  answer:
    "Chainlink VRF gambling designs ask an oracle network to produce a verifiable random value that a smart contract can check on-chain. The contract receives randomness plus a cryptographic proof that the value was generated correctly for a specific request. That is a different architecture from the commit-reveal HMAC style used on PVPspinArena, where the operator commits to a server seed hash before the round and reveals the seed after settlement.",
  facts: [
    "A verifiable random function (VRF) returns randomness together with a proof anyone can check.",
    "On-chain games use VRF when the contract itself must settle without trusting a hidden server seed.",
    "VRF requests cost gas and add latency compared with off-chain HMAC draws.",
    "VRF proves the randomness was generated correctly for the request; it does not remove house edge or guarantee solvency.",
    "PVPspinArena does not use Chainlink VRF; its Jackpot, Coinflip and Roulette rounds use commit-reveal HMAC.",
  ],
  sections: [
    {
      id: "problem",
      title: "The problem with on-chain randomness",
      body: `Blockchains make simple “random” draws unsafe if you only read future block hashes.

### Predictable block data

Validators and sophisticated bots can influence or anticipate some on-chain values. A game that uses an upcoming block hash as its only entropy can be manipulated or raced.

### Public state

Everything in a public mempool is visible. If a contract would reveal enough to predict an outcome before settlement, searchers can insert or cancel transactions to their benefit.

### Why oracles appear

Projects therefore outsource randomness to a service that can prove correct generation without exposing the secret key that produced it. Chainlink VRF is one widely cited implementation of that idea. It belongs in the wider [provably fair guides](/guides/topics/provably-fair) conversation as an on-chain method, not as a rename of seed hashing.

### Off-chain contrast

Most crypto casino lobbies still settle off-chain with server seeds. Those systems are closer to [RNG versus provably fair](/guides/rng-vs-provably-fair) debates than to VRF request logs.`,
    },
    {
      id: "how-vrf",
      title: "How a VRF works",
      body: `At a high level the flow looks like this.

### Request

A consumer contract asks for randomness, often paying a fee and including a unique request id and optional user seed.

### Fulfillment

Oracle nodes produce a random value using a secret key, then return the value and a proof to the chain.

### Verification

The consumer contract (or a coordinator) checks the proof against a published public key. If the proof verifies, the contract accepts the randomness and continues settlement.

### Binding to the request

The proof is tied to the specific request parameters. An operator should not be able to shop for a different random value after seeing the bet without failing verification.

### Mental model

Think of VRF as “randomness with a receipt,” whereas commit-reveal is “secret now, open later.” Both can be sound. They fail for different reasons when mis-implemented. Background on entropy sources also appears in [how random number generators work](/guides/how-random-number-generators-work).`,
    },
    {
      id: "compare",
      title: "VRF vs commit-reveal vs HMAC",
      body: `Players often hear “provably fair” and “VRF” used interchangeably. They are not.

### Commit-reveal HMAC

The operator publishes \`SHA-256(serverSeed)\`, takes bets, then reveals \`serverSeed\` and derives the result with a published HMAC formula. Anyone can recompute offline. This is what PVPspinArena documents on [Fairness](/fairness) for its arena games.

### Chainlink VRF

The contract does not hold a hidden server seed in the same way. It waits for an oracle fulfillment with a verifiable proof, then uses that randomness on-chain.

### Trade-offs

| Approach | Strength | Weakness |
| --- | --- | --- |
| Commit-reveal HMAC | Cheap, fast, easy to recompute in a browser | Relies on off-chain custody and honest reveal timing |
| VRF | On-chain verifiable fulfillment | Gas, latency, oracle dependency |
| Blind server RNG | Simple UX | Players cannot check individual draws |

### Choosing language carefully

Saying a site “uses Chainlink” when it only mirrors a marketing badge is a red flag. Ask for the request id and proof, or for the seed hash and reveal — whichever model they claim.`,
    },
    {
      id: "cost",
      title: "Cost and latency trade-offs",
      body: `On-chain randomness is not free.

### Gas

Each request and fulfillment consumes gas. Micropets that resolve every second are usually uneconomic on expensive chains.

### Time

Fulfillment is asynchronous. Players wait for oracle response and block inclusion. Off-chain HMAC can settle in milliseconds after betting closes.

### Chain selection

Teams pick cheaper networks or batch requests. That is an engineering choice, not proof of fairness by itself. Payment rails and chain ops live under [crypto payments](/guides/topics/crypto-payments).

### Hybrid products

Some “on-chain casinos” still compute entertainment outcomes off-chain and only bridge funds. Read whether VRF is actually in the bet path. The [web3 casino](/guides/web3-casino) overview helps separate branding from settlement.`,
    },
    {
      id: "proves",
      title: "What VRF proves and what it does not",
      body: `Be precise about the guarantee.

### What it proves

- The randomness delivered matches a proof under the oracle’s key for that request
- The consumer contract accepted a value that verifies, assuming the verification code is correct

### What it does not prove

- That multipliers are generous
- That the house edge is zero
- That the treasury can pay
- That upgrade keys will never change the rules
- That the front end you used is the contract you verified

### Parallel limits for HMAC

Commit-reveal has similar honesty limits: it proves non-tampering of the seed after commitment, not profitability. PVPspinArena’s HMAC design is transparent on the [Fairness](/fairness) page and is **not** a VRF deployment.`,
    },
    {
      id: "check",
      title: "Checking a VRF request on-chain",
      body: `If a game claims VRF, verification is explorational rather than “paste into a seed checker.”

### Gather identifiers

Find the request id, consumer contract address, and transaction that fulfilled randomness.

### Read events

Blockchain explorers show request and fulfillment events. Confirm the random word used by the game matches the fulfillment.

### Verify the consumer logic

Skim the contract source (when verified on the explorer) to see how the random word maps to a game outcome. A correct VRF with a biased mapping still yields a biased game.

### Compare with HMAC checkers

HMAC sites give you seeds and nonces for a [provably fair calculator](/guides/provably-fair-calculator). VRF sites give you proofs and transactions. Different tools, same sceptical habit.`,
    },
    {
      id: "overkill",
      title: "When VRF is overkill",
      body: `Not every wager needs an oracle.

### Off-chain arenas

Multiplayer pots that already commit a seed before lock can offer strong player checks without VRF latency. That is why many PvP products stay on commit-reveal.

### UX and cost

If players bet tiny stakes every few seconds, VRF fees dominate. HMAC remains the practical design.

### Marketing-only VRF

Some pages mention Chainlink in a footer while randomness is still a private RNG. Demand a concrete request you can look up. If they cannot provide one, treat the claim as unverified.

### Responsible close

On-chain proofs do not manage addiction risk. Keep a budget and use [responsible gambling](/responsible-gambling) tools regardless of oracle branding. Adults 18+ only.

### Bottom line on PVPspinArena

**Chainlink VRF gambling** is a real design family for smart-contract games. PVPspinArena’s Jackpot, Coinflip and Roulette use commit-reveal HMAC instead. Evaluate each product by the mechanism it actually ships, not by which buzzword appears in ads.`,
    },
    {
      id: "player-checklist",
      title: "Player checklist before trusting a VRF claim",
      body: `Use this list when a landing page waves an oracle logo.

1. Locate a real request id from a bet you placed or a public demo bet.
2. Open the fulfillment transaction on a block explorer and confirm the consumer address matches the game.
3. Read how the random word becomes a roll, card or crash point in verified source or docs.
4. Check whether the front end could show a different result than the contract stored.
5. Ask who can upgrade the consumer and pause the game — admin keys matter as much as randomness.
6. Compare fee drag: if VRF cost is large relative to stake size, the product economics may push toward fewer, larger bets.

### Red flags

- Logo only, no explorer links
- “VRF” mentioned beside games that settle instantly off-chain with no request events
- Refusal to show how the random word maps to the published odds table
- Mixing VRF language with a seed hash UI that never reveals a seed

### Where HMAC remains the right tool

Fast multiplayer rounds, tiny stakes and browser-side checkers favour commit-reveal. That is the deliberate choice behind PVPspinArena’s arena stack. VRF shines when settlement must live entirely in a contract and players already accept chain latency.

### Further reading in this hub

Pair this page with [provably fair games](/guides/provably-fair-games) for product-level comparisons and with [proof of reserves](/guides/proof-of-reserves) when the question shifts from randomness to whether the house can pay. Randomness proofs never answer solvency alone.

### Worked contrast in one paragraph

Suppose two crash games advertise identical 1% edges. Game A commits \`SHA-256(serverSeed)\` before bets, reveals after, and lets you recompute the crash point with HMAC in a notebook. Game B emits a Chainlink VRF request when the round locks and settles from the fulfilled random word in a contract. Both can be honest. Game A fails if the reveal never comes or the hash mismatches. Game B fails if fulfillment is stalled, the consumer is upgradeable into a biased mapper, or the UI lies about what the contract stored. Your verification toolkit must match the failure mode.

Oracle dependency also creates operational risk that HMAC lobbies rarely face. If the VRF service pauses, games stall. If gas spikes, fulfillment becomes expensive and operators may widen minimum bets. Those are not cheating; they are economics. Players should still demand transparency when delays happen, including public status notes and a clear rule for cancelled rounds. Compare that failure mode with an off-chain arena that can still reveal a seed even if a bridge is congested. Different stacks, different outages, same need for written procedures players can read before depositing.

When you document a VRF bet for your own records, save the request id, fulfillment transaction hash, consumer address, and a screenshot of the UI result. That packet is the on-chain equivalent of saving a server seed and nonce. Without it, a later disagreement becomes a forum argument instead of a reproducible check. Teams that refuse to help you gather those fields are not ready for players who take verification seriously. Finally, remember that VRF does not certify the front-end: phishing sites can display explorer links from a different contract while draining wallets through approvals. Always type the known domain, confirm the contract address from official docs, and never paste a seed phrase into any fairness tool. Adults 18+ only; pair technical checks with budget limits and breaks so verification habits do not become another compulsive loop around the same tables. If two products both claim VRF, prefer the one that publishes verified source, lists consumer addresses, and documents how cancelled fulfillments are refunded. Keep a short personal log of request ids the same way HMAC players keep seed reveals. Ten logged bets are enough to build the habit.`,
    },
  ],
  faqs: [
    {
      q: "Does PVPspinArena use Chainlink VRF?",
      a: "No. Its arena games commit to a server seed hash, settle the round, then reveal the seed for HMAC-style verification on the Fairness page.",
    },
    {
      q: "Is VRF more fair than commit-reveal?",
      a: "They solve related problems with different trust assumptions. VRF emphasises on-chain proof of randomness; commit-reveal emphasises pre-commitment and offline recomputation. Neither removes house edge.",
    },
    {
      q: "Can I verify VRF in a browser seed tool?",
      a: "Usually not. You verify proofs and contract events on-chain. Browser seed checkers are built for HMAC and hash commitments.",
    },
    {
      q: "Why do VRF games feel slower?",
      a: "The contract must wait for oracle fulfillment and block inclusion, which adds latency and gas cost compared with an off-chain draw.",
    },
    {
      q: "What should I ask a site that claims Chainlink?",
      a: "Ask for a recent request id, consumer address and how the random word maps to the outcome. If they only show a logo, the claim is incomplete.",
    },
  ],
  sources: [
    { label: "Chainlink — VRF documentation", url: "https://docs.chain.link/vrf" },
    {
      label: "NIST — SHA-256 (FIPS 180-4)",
      url: "https://csrc.nist.gov/publications/detail/fips/180/4/final",
    },
  ],
  related: [
    "rng-vs-provably-fair",
    "how-random-number-generators-work",
    "web3-casino",
    "commit-reveal-scheme",
    "provably-fair-casino",
  ],
  updated: "2026-09-26",
};
