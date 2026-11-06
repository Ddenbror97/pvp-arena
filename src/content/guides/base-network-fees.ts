import type { Guide } from "./types";

export const guide: Guide = {
  slug: "base-network-fees",
  cluster: "Crypto payments",
  keyword: "base network fees",
  secondary: ["base gas fees", "base transaction cost", "cheap l2 fees"],
  title: "Base Network Fees: Real Transaction Costs",
  description:
    "Base transactions cost cents, not dollars, until they do not. How fees are set, typical costs per action, and how to budget gas for deposits.",
  h1: "Base Network Fees: What a Transaction Really Costs",
  answer:
    "Base network fees are L2 gas charges paid in ETH on Base for transfers, swaps and contract calls. They are usually far below Ethereum mainnet, often in the cents range for simple sends when the network is calm, but they move with demand and L1 data costs. Budget a small ETH gas reserve on Base beside your USDC play funds.",
  facts: [
    "Base fees are paid in ETH on Base, not in USDC.",
    "Simple transfers are usually cheap; complex contract calls cost more.",
    "Fees spike when L2 demand or L1 data posting costs rise.",
    "Mainnet bridging costs are separate from Base-side gas.",
    "PVPspinArena deposits need enough Base ETH to cover the transfer gas.",
  ],
  sections: [
    {
      id: "how-calculated",
      title: "How Base fees are calculated",
      body: `Base inherits an EIP-1559-style fee market adapted for an L2: you pay for computation and for data that ultimately anchors to Ethereum. Wallets show a max fee estimate before you sign.

This page sits in [crypto payments](/guides/topics/crypto-payments). Adults 18+. Pair with [gas fees explained](/guides/gas-fees-explained) for the general model and [base network](/guides/base-network) for chain context.

You cannot pay Base gas in USDC alone. Keep a small ETH balance on Base even if you deposit USDC to casinos.`,
    },
    {
      id: "typical",
      title: "Typical costs by action",
      body: `Illustrative calm-network ranges (they move—check your wallet quote):

- **Native ETH transfer:** often well under a dollar, commonly cents.
- **ERC-20 USDC transfer:** usually cents to low tens of cents.
- **Swap on a DEX:** higher than a plain transfer; still typically far below mainnet.
- **Approval transaction:** its own fee; avoid unlimited approvals you do not need.

During congestion, multiply your mental model. The wallet’s estimate beats any article number—including this one.`,
    },
    {
      id: "spikes",
      title: "Why fees spike",
      body: `Spikes come from busy Base blocks, elevated priority fees, and rising costs to post data to Ethereum. NFT mints and meme frenzy days are classic triggers.

If a deposit is not urgent, wait. If it is urgent, pay the quote or use a smaller test size first. Do not dig into savings to “save” on a spike by bridging via a random cheap aggregator you have never opened before.`,
    },
    {
      id: "vs-mainnet",
      title: "Fees vs Ethereum mainnet",
      body: `Mainnet transfers can cost several dollars to tens of dollars when busy. That is a primary reason PVPspinArena and many apps settle on Base. Bridging from mainnet still incurs mainnet gas once—see conceptual bridging costs in [crypto bridge](/guides/crypto-bridge) and the Base walkthrough pages in this cluster.

After funds live on Base, repeated casino deposits and withdrawals should stay cheap relative to mainnet, subject to living fee markets.`,
    },
    {
      id: "budget",
      title: "Budgeting gas for deposits",
      body: `Practical reserve: enough Base ETH for several USDC transfers and a couple of mistakes. Exact amounts change; many players keep a buffer measured in a few dollars of ETH rather than dust.

Steps before a session:

1. Confirm Base network selected.
2. Confirm USDC balance and ETH gas balance.
3. Send a tiny test deposit to the real [wallet](/wallet) address if new.
4. Then send the real amount.

[How to swap tokens](/guides/how-to-swap-tokens) helps if you hold only USDC and need ETH for gas—mind swap fees too.`,
    },
    {
      id: "tools",
      title: "Tools for checking current fees",
      body: `Use your wallet’s pre-flight estimate, Base block explorers, and status pages from infrastructure providers when they publish congestion notes. Ignore Telegram screenshots of “gas is free today.”

If MetaMask quotes a shocking fee, you may be on the wrong network or interacting with a unexpectedly heavy contract. Cancel and re-read the network dropdown.`,
    },
    {
      id: "waste",
      title: "Cutting fee waste",
      body: `Batch mentally: fewer, clearer transfers beat twelve micro-deposits. Skip vanity contract interactions. Revoke dusty approvals in one periodic session rather than one panic click per scam link.

Casino side: PVPspinArena matches normal transfers—no approval tax. Games on the [home page](/) still charge their own fee or edge; gas is only the rail cost.

Keep ETH on Base for gas even when you play in USDC. Fee quotes move; budget a buffer, not dust.`,
    },
  ],
  faqs: [
    {
      q: "Why did my Base transfer cost more today?",
      a: "Demand and L1 data costs move. Use the live wallet estimate. Yesterday’s cents are not a guarantee.",
    },
    {
      q: "Can I pay Base fees in USDC?",
      a: "No. Keep ETH on Base for gas even when your play balance is USDC.",
    },
    {
      q: "Are Base fees always cheaper than Ethereum?",
      a: "Typically yes for comparable actions, but not a law of physics. Always read the quote.",
    },
    {
      q: "Does bridging cost Base fees or mainnet fees?",
      a: "Bridging from Ethereum charges mainnet gas (and bridge fees if any). Using funds afterward charges Base gas.",
    },
    {
      q: "How much ETH should I keep for PVPspinArena deposits?",
      a: "Enough for several transfers at today’s quotes. Top up when the buffer gets near dust.",
    },
  ],
  sources: [
    { label: "Base Docs — Fees", url: "https://docs.base.org/" },
    {
      label: "Coinbase Help — What is Base?",
      url: "https://help.coinbase.com/en/coinbase/getting-started/crypto-education/what-is-base",
    },
  ],
  related: ["base-network", "gas-fees-explained", "how-to-swap-tokens", "crypto-bridge"],
  updated: "2026-11-05",
};
