import type { Guide } from "./types";

export const guide: Guide = {
  slug: "smart-contract-casino",
  cluster: "Provably fair",
  keyword: "smart contract casino",
  secondary: ["onchain casino", "decentralized casino contract", "contract based gambling"],
  title: "Smart Contract Casinos: On-Chain Gambling",
  description:
    "Fully on-chain casinos hold funds and settle bets in code. How the contracts work, where randomness comes from, and the audit risks involved.",
  h1: "Smart Contract Casinos: Fully On-Chain Gambling",
  answer:
    "A smart contract casino is an online gambling product where wagers, settlement and payouts are enforced by blockchain programs instead of a private server ledger. You connect a wallet, send tokens into a contract or pool, and outcomes trigger automatic transfers back to winners according to rules anyone can read on a block explorer. That transparency is real, but it does not remove human risk: upgrade keys, oracle randomness, unaudited code and phishing front-ends can still drain players who treat on-chain as automatically safe.",
  facts: [
    "Smart contracts are public programs on a blockchain; anyone can inspect the bytecode and read past transactions.",
    "Fully on-chain casinos usually require a wallet signature and a network fee for every bet or claim.",
    "Randomness on-chain almost never comes from the contract alone; oracles or commit-reveal schemes supply it.",
    "Upgradeable proxies let developers change logic after launch unless ownership is renounced or timelocked.",
    "Hybrid sites may use contracts only for deposits while game results still run on servers with provably fair proofs.",
  ],
  sections: [
    {
      id: "what-makes-a-casino-on-chain",
      title: "What makes a casino on-chain",
      body: `Marketing teams use on-chain and web3 interchangeably, but the technical bar for a **smart contract casino** is specific: the economically important steps happen in a contract that executes on a public network.

### Deposits and stakes

In a fully on-chain design, your bet is a token transfer or a call into a game contract. The contract balance or an internal mapping records how much you risked. There is no separate casino database that could silently edit your stake after the fact, though an off-chain UI can still lie about which contract you are calling.

### Outcomes tied to transactions

When a round resolves, the contract emits an event or updates storage, then sends winnings in the same flow or in a follow-up claim transaction. You can trace that path on a block explorer. That is different from a hybrid operator who credits an internal balance and only moves crypto when you withdraw.

### What stays off-chain anyway

Front-ends, matchmaking, anti-bot checks, customer support and KYC often remain on servers. A polished website does not prove every pixel of gameplay is in Solidity. Read the docs and follow the transaction your wallet signs.

### How this relates to provably fair

On-chain code can implement [commit-reveal](/guides/commit-reveal-scheme) or consume oracle output. Server-based sites can publish the same maths with HMAC. The [provably fair casino](/guides/provably-fair-casino) overview explains verification habits that apply to both. PVPspinArena is hybrid: rounds use commit-reveal HMAC on servers, not an on-chain VRF draw, and you can check results on the [Fairness](/fairness) page.

### Topic context

For the wider picture of player-verifiable games, see the [provably fair guides](/guides/topics/provably-fair) topic hub and compare on-chain claims with [RNG versus provably fair](/guides/rng-vs-provably-fair) expectations.`,
    },
    {
      id: "contract-held-bankrolls",
      title: "Contract-held bankrolls",
      body: `Who holds the money is the first question before you approve a token spend.

### Single contract treasury

Many dice or crash clones keep the house bankroll in one contract address. Players bet against that pool. If the pool is undercapitalised, a lucky streak can make the contract unable to pay max wins even when the randomness was fair.

### Player-versus-player pools

PvP pots lock player stakes until a winner is chosen. The house may take a fee in the same transaction. Shared pots need clear rules about refunds if a round never fills.

### Escrow versus infinite approval

Some flows ask for a one-time deposit; others request a large token allowance so each bet is cheaper on gas. Unlimited approvals are convenient but dangerous if the contract is malicious or upgraded into something malicious. Revoke unused allowances after you stop playing, and keep a separate gambling wallet with limited funds on the [wallet](/wallet) page habits even when the site looks decentralised.

### Proof of reserves off-chain

On-chain balance is visible, but it does not prove the operator is not running parallel off-chain liabilities. [Proof of reserves](/guides/proof-of-reserves) discussions matter when a brand mixes custodial accounts with chain deposits.

### Red flags

- No published contract address linked from the official site
- Bankroll in a personal wallet the team controls without multisig disclosure
- Promised yields on the house pool that sound like securities marketing
- Front-end URLs that do not match the verified contract the docs describe

When in doubt, send a test transaction with the minimum stake and confirm the explorer shows the expected contract before you size up.`,
    },
    {
      id: "settlement-and-payouts-in-code",
      title: "Settlement and payouts in code",
      body: `Settlement is where smart contracts shine when they are honest and painful when they are not.

### Deterministic payout tables

Games map random outputs to multipliers in public functions. You can simulate inputs offline if you know the randomness source. Compare that transparency with opaque server RNG described in [how random number generators work](/guides/how-random-number-generators-work).

### Reentrancy and rounding

Classic bugs let attackers recall payout functions before state updates finish, draining pools. Rounding errors can favour the house over millions of micro-bets. Professional audits focus on these paths; unaudited forks of popular games repeat old exploits.

### Claim versus instant payout

Some designs pay immediately; others require a separate claim transaction after a vrf callback arrives. Failed callbacks can strand winnings until someone pays gas to retry.

### Partial failures

If a transaction reverts because gas is too low or a token is paused, your bet might not land even though the UI showed success. Always read the wallet confirmation and the explorer receipt.

### Verifying a single round

Even on-chain, you still need the seed or oracle request id to recompute outcomes. Treat explorer logs like fairness receipts. The walkthrough mindset in [provably fair games](/guides/provably-fair-games) applies once you have those inputs.`,
    },
    {
      id: "randomness-sources-compared",
      title: "Randomness sources compared",
      body: `Blockchains cannot roll dice inside pure contract code without external input. Every smart contract casino imports randomness somehow.

### On-chain commit-reveal

The operator commits a hash before bets close, then reveals a seed that players check against the hash. That mirrors server-side provably fair and can be implemented entirely in contract events plus off-chain reveal timing. Players must confirm the commitment happened before stakes were known.

### Block hash and miner influence

Using recent block hashes as entropy is outdated on proof-of-stake chains because validators have limited but non-zero influence and predictable timing. Serious products avoid naive blockhash roulette.

### Oracle vrf services

Verifiable random function oracles deliver a random word plus a proof that nodes did not pick the number after seeing your bet. Latency and fees apply; the game waits for a callback transaction. Read the oracle docs and note who pays callback gas.

### Centralised server seed with chain payout

Hybrid brands run animations on servers, publish HMAC proofs, and only use contracts for token movements. PVPspinArena follows that pattern for Jackpot, Coinflip and [Roulette](/roulette): commit-reveal on the server, not Chainlink on-chain vrf, with verification on [how it works](/how-it-works).

### Choosing what to trust

Oracle vrf shifts trust to oracle operators and contract authors. Commit-reveal shifts trust to timely commitments and correct HMAC code. Neither removes the need to read the actual implementation.`,
    },
    {
      id: "audit-and-upgrade-risk",
      title: "Audit and upgrade risk",
      body: `A contract address on Twitter is not the same as a reviewed deployment.

### What audits cover

Firms trace fund flows, reentrancy, access control and oracle integration. Reports are snapshots in time. They do not guarantee future upgrades behave the same way.

### Upgradeable proxies

Many casinos deploy a proxy pointing at logic that admins can swap. A benign upgrade can fix bugs; a malicious upgrade can whitelist a drainer. Look for timelocks, multisig owners and published diff reviews.

### Admin keys and pause buttons

Emergency pause functions protect against exploits but also let insiders freeze withdrawals. Understand who holds those keys and whether renouncement is real or cosmetic.

### Verified source code

Explorers let teams publish source that matches bytecode. Compare the verified repo to the address linked on the official site. Phishing domains love to paste unrelated verified contracts.

### Audits versus provably fair

Lab certificates for server RNG, discussed under gaming lab norms in the broader [crypto casino license](/guides/crypto-casino-license) context, test different layers than bytecode review. On-chain products still need player verification habits from the [provably fair calculator](/guides/provably-fair-calculator) mindset when seeds are published.

### Incident response

When exploits happen, teams migrate users to new contracts. Treat migration announcements skeptically until you read the new permissions.`,
    },
    {
      id: "gas-costs-per-bet",
      title: "Gas costs per bet",
      body: `Every on-chain interaction has a price in native gas token. That changes bankroll math.

### Per-bet versus batched play

Rolling dice on Ethereum mainnet for each $1 bet can cost more in gas than the edge justifies. Layer-two networks and alt chains reduce fees but introduce bridge risk described in [web3 casino](/guides/web3-casino) comparisons.

### Oracle callback surcharges

Vrf-powered games often require the house or the player to pay for the randomness delivery transaction. Small bets may be economically impossible even when odds look fair.

### Failed transactions still cost

Reverted transactions burn gas. Misconfigured slippage or insufficient allowance hurts even when no bet was placed.

### Wallet UX friction

Mobile wallets on congested networks make rapid sessions unpleasant. Hybrid custodial balances exist partly to avoid that friction.

### When hybrid makes sense

If you bet frequently with small stakes, a server-settled provably fair game with cheap internal balance updates may fit better than a pure smart contract casino, provided you trust custody during play and verify rounds you care about.`,
    },
    {
      id: "on-chain-vs-hybrid-models",
      title: "On-chain vs hybrid models",
      body: `Most players encounter both models even if marketing says fully decentralised.

### Fully on-chain strengths

Rules are public, balances are visible, and settlements leave explorer trails. Regulators and researchers can replay history. For high-stakes single transactions, that audit trail matters.

### Fully on-chain weaknesses

Speed, animation, responsible gambling tooling and chargeback-style support are harder. Bugs are immutable unless upgraded. Gas spikes price out casual play.

### Hybrid strengths

Fast loops, richer games, email recovery and clearer RG pages on licensed brands. PVPspinArena keeps multiplayer fairness on servers with HMAC commit-reveal while using familiar wallet deposits on [wallet](/wallet).

### Hybrid weaknesses

You trust operator custody between deposit and withdrawal. You must still verify proofs rather than assuming honesty.

### Questions before depositing

1. Which contract address holds my stake right now?
2. Where does randomness originate and can I recompute one past bet?
3. Who can upgrade the contract and is there a timelock?
4. What happens if the front-end domain is wrong — can I call the contract directly?
5. Are RG tools available on the [responsible gambling](/responsible-gambling) page or only in marketing copy?

### Practical takeaway

Treat a smart contract casino as a financial program you would not sign without reading. Combine bytecode review, oracle understanding and the verification discipline from [HMAC-SHA256 provably fair](/guides/hmac-sha256-provably-fair) guides when the product publishes seeds. On-chain transparency helps only when you use it.

Some on-chain games buy randomness from a network instead of publishing a seed. [Chainlink VRF](/guides/chainlink-vrf-gambling) is that purchase. The proof is about the draw, not about the edge.`,
    },
  ],
  faqs: [
    {
      q: "Is a smart contract casino always provably fair?",
      a: "Not automatically. Code can be biased, use hidden admin functions or rely on manipulable randomness. You still need to read the logic or verify published seeds and oracle proofs.",
    },
    {
      q: "Why does every bet cost gas?",
      a: "Public networks charge for computation and storage. Each bet writes state or emits events, so validators require a fee unless the product batches bets off-chain.",
    },
    {
      q: "Can developers change the game after launch?",
      a: "Yes, if the deployment is upgradeable or if they ask you to approve a new contract. Check ownership, timelocks and audit history before trusting a address long term.",
    },
    {
      q: "Does PVPspinArena run games inside smart contracts?",
      a: "No. Jackpot, Coinflip and Roulette settle on servers with commit-reveal HMAC fairness you can check after each round. Wallet flows handle deposits and withdrawals separately.",
    },
    {
      q: "How do I verify an on-chain bet?",
      a: "Collect transaction hashes, contract events and any committed seed or vrf request id, then recompute the outcome with the published formula or use a block explorer to confirm payouts matched the rules.",
    },
  ],
  sources: [
    {
      label: "Ethereum — Smart contract documentation",
      url: "https://ethereum.org/en/developers/docs/smart-contracts/",
    },
    { label: "Chainlink — VRF documentation", url: "https://docs.chain.link/vrf" },
  ],
  related: [
    "web3-casino",
    "proof-of-reserves",
    "commit-reveal-scheme",
    "provably-fair-casino",
    "smart-contract-audit",
  ],
  updated: "2026-09-26",
};
