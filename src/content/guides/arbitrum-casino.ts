import type { Guide } from "./types";

export const guide: Guide = {
  slug: "arbitrum-casino",
  cluster: "Crypto payments",
  keyword: "arbitrum casino",
  secondary: ["arbitrum gambling", "usdc on arbitrum", "arb casino", "arbitrum one casino"],
  title: "Arbitrum Casino Guide: ETH Fees and USDC Deposits",
  description:
    "How an Arbitrum casino works: ETH and USDC on Arbitrum One, gas compared with Base, confirmation time, and the wrong-network trap.",
  h1: "Arbitrum casino: L2 fees, USDC deposits and network traps",
  answer:
    "An Arbitrum casino credits deposits on Arbitrum One: ETH for gas and often native USDC minted on that chain. Transfers usually confirm in a second or two when the sequencer is healthy, and fees are paid in ETH on Arbitrum, not in USDC. The trap is the network name. Arbitrum USDC is not Base USDC. ETH sent to a Base address, or USDC.e sent when the cashier asked for native USDC, will not credit. PVPspinArena is not an Arbitrum casino.",
  facts: [
    "Arbitrum One chain ID is 42161. Base is 8453. Both use 0x addresses and ETH for gas.",
    "Circle issues native USDC on Arbitrum at a different contract from bridged USDC.e.",
    "Arbitrum sequencer confirmations are typically well under two seconds; L2-to-L1 withdrawals still wait a challenge window of about seven days.",
    "Gas on Arbitrum is usually cents, in the same cheap band as Base and far below Ethereum mainnet.",
    "PVPspinArena accepts on-chain Bitcoin, and USDC and ETH on Base. It does not watch Arbitrum One or Arbitrum Nova.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What an Arbitrum casino is watching",
      body: `An Arbitrum casino is a gambling site that credits a deposit when it sees a transfer on Arbitrum. In practice that almost always means **Arbitrum One** (chain ID 42161): ETH, and USDC issued on that chain. The address is a 0x string because One is EVM-compatible.

That is the whole definition. Cheap gas is a property of the rollup, not a promise that the games are fair. Arbitrum gambling is still gambling. You must be 18 or older.

Arbitrum is not one product name. One is the main rollup. Nova is a separate chain with a different trust model. Orbit chains are other instances. A cashier that says “Arbitrum” without “One” is unfinished copy. Ask which chain ID they watch.

This guide lives with other rails in [crypto payments](/guides/topics/crypto-payments). It is the Arbitrum twin of the [Avalanche casino](/guides/avalanche-casino) explainer: teach the chain, then show why this site is not on it.

PVPspinArena is Jackpot, Coinflip and Roulette. Deposits are USDC and ETH on Base. It is not an ARB casino, not an Arbitrum One casino, and it will not credit an Arbiscan transaction.

ARB the governance token is not the chip. Some rooms take ARB. Many take ETH and USDC only. Read the cashier asset list. A wallet that shows a large ARB balance and empty ETH cannot pay gas and cannot satisfy a USDC deposit field. Three tickers, three jobs.`,
    },
    {
      id: "fees",
      title: "ETH fees on Arbitrum versus Base and mainnet",
      body: `Arbitrum One is an optimistic rollup. You pay a child-chain gas fee in **ETH on Arbitrum**, plus a data charge that tracks Ethereum blob or calldata prices. Official docs describe an Ethereum-style base fee on the L2 and a parent-chain component on top.

Under normal load a simple ETH or USDC transfer costs cents or less — often in the same $0.01 to $0.10 band as other large L2s. Congestion and a high Ethereum data price can raise that. Cheap is the common case, not a law.

You pay in **ETH on Arbitrum**. USDC on Arbitrum does not pay its own gas. A wallet that shows 50 USDC and 0 ETH on chain 42161 will fail the send. The same trap exists on Base with ETH, which [gas fees explained](/guides/gas-fees-explained) covers for this site’s rail.

### Compared with Base and mainnet

[Base vs Ethereum](/guides/base-vs-ethereum) is the pair this site actually uses. For a casino deposit the useful comparison is:

| Network | Chain ID | Gas asset | Typical simple send | Soft confirmation |
| --- | --- | --- | --- | --- |
| Ethereum mainnet | 1 | ETH on mainnet | dollars when busy | ~12 seconds per block |
| Arbitrum One | 42161 | ETH on Arbitrum | cents | ~0.25–2 seconds |
| Base | 8453 | ETH on Base | cents, often a fraction of a cent | ~2 seconds |

The difference that matters at the cashier is **which RPC the site watches**. A cheap Arbitrum transfer to a Base deposit address is still a lost transfer. Read [USDC casino](/guides/usdc-casino) for why PVPspinArena watches Base only.

If the wallet fee preview is several dollars, you are probably on Ethereum mainnet, not on Arbitrum.

### How to confirm you are on 42161

In MetaMask the network name can be edited. The chain ID cannot, if you added the official parameters. Open network details. You want **42161**. Currency symbol ETH is not enough — Base and mainnet also show ETH. RPC and explorer URLs should point at Arbitrum One, not Nova and not an impersonator RPC. A phishing network entry with a friendly name and the wrong ID is how people sign a send that never reaches the cashier.

You still need a little ETH on that same account on 42161. Bridging USDC over and forgetting ETH is the most common failed first deposit on any L2, including this one.`,
    },
    {
      id: "usdc",
      title: "Native USDC versus USDC.e",
      body: `Circle issues native USDC on Arbitrum One. There is also **USDC.e**: Ethereum USDC that was bridged through Arbitrum’s canonical bridge and later renamed so the tickers would stop colliding.

Native USDC (Circle) and USDC.e are different contracts. A casino that lists one will not credit the other, even though both aim at one dollar and both live on chain 42161.

### Contracts to check, not to memorise as investment advice

Circle and Arbitrum docs publish native USDC as 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 and bridged USDC.e as 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8. Paste the contract the cashier printed. Do not trust a ticker in a wallet dropdown.

### CCTP versus the canonical bridge

Circle’s Cross-Chain Transfer Protocol burns and mints native USDC. The canonical Arbitrum bridge lock-and-mints USDC.e when you choose that path. A “bridge then deposit” plan fails when you arrive as the token the cashier does not list.

This is not a deposit walkthrough for PVPspinArena. This site does not take Arbitrum USDC. The lesson is the same on every L2: ticker plus chain plus contract, or you are guessing.

Exchanges add a fourth trap: a withdrawal picker labelled “Arbitrum” that still sends USDT, or native USDC, or USDC.e, depending on the day. Match the **token** the casino listed, not only the network word. If the exchange cannot send native USDC on One, do not invent a hop through a random wrapper just to force the send.`,
    },
    {
      id: "confirmations",
      title: "Confirmation time and the seven-day window",
      body: `Arbitrum’s sequencer can include a transfer in a fraction of a second. Soft confirmation — the moment an explorer shows the send — is usually one to two seconds. A casino that waits for one or a few L2 blocks can credit you before the kettle boils.

That speed is why “arbitrum casino” pages advertise instant play. It is also why a wrong-network send hurts immediately: there is no long pending window to notice the chain name.

### What “final” does not mean

Optimistic rollups inherit a **challenge window** of about seven days for canonical withdrawals back to Ethereum. That window matters if you are bridging L2 → L1 through the official bridge. It does not mean your casino deposit sits pending for a week. Application-level credit follows the L2 inclusion the cashier chose to wait for.

If a site says “wait 7 days for your deposit,” they are confusing a bridge exit with a cashier watch. Ask which chain they monitor. If they cannot answer with a chain ID, leave.

Nova and Orbit instances have their own sequencers. Do not assume One timings apply.

A casino that waits for “12 confirmations” on Arbitrum is copying a mainnet habit. Twelve One blocks are a few seconds, not twelve minutes. That is fine. A casino that waits for Ethereum finality on an L2 send is confused. Ask what they count. If they count L1 batches, your credit can lag a busy Ethereum period even though Arbiscan already shows success. That lag is not a lost deposit. A wrong-network send that Arbiscan also shows as success *is* a lost deposit. Learn the difference before you open a ticket.`,
    },
    {
      id: "traps",
      title: "Wrong-network traps that do not reverse",
      body: `The address string does not tell you which asset arrived. The same 0x account can hold ETH on Base, ETH on Arbitrum and ETH on mainnet as three separate balances.

### Mistakes that do not undo themselves

- Sending **USDC on Arbitrum** to a **USDC on Base** address (or the reverse).
- Sending **ETH on Arbitrum** to an Ethereum or Base deposit because all three look like 0x.
- Sending **USDC.e** when the cashier listed native USDC.
- Using **Arbitrum Nova** in an Arbitrum One deposit field.
- Treating a [crypto bridge](/guides/crypto-bridge) output as the casino address.

MetaMask can add Arbitrum One as a custom network. That is convenient and dangerous. Switching the network dropdown after you copied the address is how people donate a deposit to the void.

Always paste the token contract and the chain ID the cashier published. Fake “USDC” contracts exist on every EVM chain.`,
    },
    {
      id: "example",
      title: "Worked $25 deposit",
      body: `You want $25 of play.

| What you send | Where the casino watches | Result |
| --- | --- | --- |
| 25 native USDC on Arbitrum One | Arbitrum One, native USDC | Credits if the contract matches |
| 25 USDC.e on Arbitrum One | Arbitrum One, native USDC | No credit; wrong contract |
| 25 USDC on Base | Arbitrum One | No credit; funds sit on Base |
| 0.01 ETH on Arbitrum One | Arbitrum One, ETH accepted | Credits if they accept ETH |
| 0.01 ETH on Arbitrum to a Base 0x | Base | No Arbitrum credit; recovery is a support problem |
| 25 USDC on Arbitrum to PVPspinArena | Base | No credit. This site does not watch Arbitrum |

Gas on the successful One row is usually cents, paid in ETH that already lives on 42161. If you hold USDC on One and zero ETH on One, buy or bridge a little ETH first. Do not “just send the USDC” and hope the wallet sponsors the fee.

If the $25 is meant for this site, acquire USDC on Base instead. Do not bridge to Arbitrum “because it is also an L2.”`,
    },
    {
      id: "not-here",
      title: "Why PVPspinArena is Base, not Arbitrum",
      body: `PVPspinArena settled on Base so small dollar stakes do not die in mainnet gas and so the cashier has one watcher. It is a [USDC casino](/guides/usdc-casino) rail plus ETH on the same chain.

Arbitrum One is a real, widely used L2. It is still the wrong network for this cashier. A correct Arbiscan link will not move the [wallet](/wallet) page.

If you already hold funds on Arbitrum and you want to play here, that is a bridge-or-exchange problem onto Base, then a USDC or ETH send to the address this site shows. The bridge guide covers the general risk; this page will not walk a deposit that this site cannot see.

Open [how it works](/how-it-works) for the live Jackpot, Coinflip and Roulette rules. None of those games become “Arbitrum games” because your wallet can add chain 42161.

Use an Arbitrum casino only if you can state chain ID, token contract and fee asset, and only with money you can lose. Use this site only if you want hashed PvP in dollars on Base.

If a support chat tells you to “just switch the network and resend,” stop. A confirmed send on the wrong chain is not a pending send on the right one. Recovery, if it exists, is a manual process on their side and often fails. The cheap L2 fee you already paid does not buy a reverse button.

Write three lines on paper before any first send: chain ID 42161 or 8453, token contract, gas asset. If you cannot fill all three, you are not ready to deposit. That habit is cheaper than a support ticket.`,
    },
  ],
  faqs: [
    {
      q: "Does PVPspinArena accept Arbitrum deposits?",
      a: "No. It accepts on-chain Bitcoin, and USDC and ETH on Base. An Arbitrum One transfer will not credit, even if the 0x address string matches.",
    },
    {
      q: "Is gas cheaper on Arbitrum than on Base?",
      a: "Both are usually cents for a simple send and far cheaper than Ethereum mainnet. The gap between them is small next to the cost of sending on the wrong chain.",
    },
    {
      q: "What is USDC.e on Arbitrum?",
      a: "Bridged Ethereum USDC that lives on Arbitrum One under a different contract from Circle’s native USDC. A cashier that lists one will not credit the other.",
    },
    {
      q: "Why do I need ETH if I only hold USDC on Arbitrum?",
      a: "Gas is paid in ETH on Arbitrum. A USDC-only wallet cannot broadcast the transfer until it also holds ETH on chain 42161.",
    },
    {
      q: "How long does an Arbitrum casino deposit take?",
      a: "Soft confirmation is usually one to two seconds. The casino then waits for however many L2 blocks it chose. The seven-day window is for official L2-to-L1 exits, not for a normal cashier credit.",
    },
    {
      q: "Is Arbitrum Nova the same as Arbitrum One?",
      a: "No. They are different chains. A Nova send will not appear on an One deposit watcher.",
    },
  ],
  sources: [
    {
      label: "Arbitrum docs — Gas and fees",
      url: "https://docs.arbitrum.io/how-arbitrum-works/deep-dives/gas-and-fees",
    },
    {
      label: "Arbitrum docs — USDC on Arbitrum One",
      url: "https://docs.arbitrum.io/arbitrum-bridge/usdc-arbitrum-one",
    },
    {
      label: "Circle — USDC on Arbitrum",
      url: "https://www.circle.com/blog/usdc-on-arbitrum-now-available",
    },
  ],
  related: ["base-vs-ethereum", "gas-fees-explained", "usdc-casino", "polygon-casino"],
  updated: "2026-09-26",
};
