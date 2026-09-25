import type { Guide } from "./types";

export const guide: Guide = {
  slug: "base-network",
  cluster: "Crypto payments",
  keyword: "base network",
  secondary: ["what is base network", "base blockchain", "base layer 2", "usdc on base"],
  title: "Base Network Explained: Fees, Speed and USDC on Base",
  description:
    "What the Base network is, how this Ethereum layer 2 works, fees and speed, bridging, USDC on Base, block explorers, and why PVPspinArena settles on Base.",
  h1: "Base network explained: fees, speed and USDC on Base",
  answer:
    "Base is an Ethereum layer 2 network incubated by Coinbase and launched to the public in 2023. It processes transactions off Ethereum's main chain and posts them back to Ethereum, which makes transfers much cheaper and faster while keeping Ethereum-style addresses and wallets. Base uses ETH for gas and supports native USDC, which is why many crypto apps, including PVPspinArena, use it for deposits and withdrawals.",
  facts: [
    "Base is an Ethereum layer 2 built on the OP Stack, the same software behind Optimism.",
    "Its mainnet chain ID is 8453.",
    "Gas fees on Base are paid in ETH, not in USDC.",
    "Circle issues native USDC on Base.",
    "Base uses the same 0x addresses as Ethereum, so MetaMask works with it.",
  ],
  sections: [
    {
      id: "what",
      title: "What is the Base network?",
      body: `Base is a blockchain network designed to make Ethereum cheaper and faster to use. It is a layer 2, which means it runs on top of Ethereum rather than replacing it.

### Who is behind it

Base was incubated by Coinbase, one of the largest crypto exchanges. It opened its mainnet to the public in August 2023. Base does not have its own native token; it uses ETH for fees.

### What it is for

Base is a general-purpose network. People use it for payments, trading, games, social apps and more. For everyday users, the main benefits are:

- **Low fees**: often a small fraction of what the same transfer would cost on Ethereum mainnet.
- **Fast confirmations**: blocks roughly every two seconds.
- **Familiar tools**: the same wallets and addresses as Ethereum.

If you want to set up your wallet for Base, our [add Base to MetaMask guide](/guides/add-base-network-metamask) has the steps. This guide explains what Base is and how it works.`,
    },
    {
      id: "layer2",
      title: "How a layer 2 works",
      body: `Ethereum mainnet is secure but can be slow and expensive when busy. Layer 2 networks handle transactions separately, then post compressed data back to Ethereum.

### Optimistic rollups

Base is an optimistic rollup. In simple terms:

1. Transactions are collected and ordered on Base.
2. Batches of transaction data are posted to Ethereum.
3. The system assumes batches are valid unless someone proves otherwise within a challenge window.

This design lets Base inherit much of Ethereum's security while processing many more transactions cheaply.

### The OP Stack

Base is built on the OP Stack, open-source software developed for Optimism. Networks using it form part of what is often called the Superchain, sharing standards and tooling.

### Safe and finalized blocks

Because Base posts data to Ethereum, there are stages of confirmation. A block can be seen on Base almost instantly, but it becomes "safe" once its data is posted to Ethereum, and fully "finalized" later. Careful apps wait for these stages before treating large payments as settled.`,
    },
    {
      id: "fees",
      title: "Fees and speed on Base",
      body: `### What you pay

Every transaction on Base pays gas in ETH. The fee has two parts:

- **Layer 2 execution fee**: the cost of running the transaction on Base.
- **Layer 1 data fee**: the cost of posting its data to Ethereum.

Since Ethereum's 2024 upgrade that introduced cheaper data "blobs", layer 2 fees dropped sharply. A simple USDC transfer on Base usually costs a small fraction of a dollar, though fees rise when the network is busy.

### Why you need ETH even for USDC

Gas is always paid in ETH on Base. If your wallet has USDC but no ETH on Base, you cannot send the USDC. Keep a small amount of ETH on Base for fees.

### Speed

Base produces blocks about every two seconds. Most transfers appear within seconds. For safety, many apps wait for a few more steps before crediting funds, as described above.`,
    },
    {
      id: "usdc",
      title: "USDC on Base",
      body: `USDC is a stablecoin issued by Circle, designed to hold a value of $1. Circle issues native USDC directly on Base.

### Native vs bridged USDC

- **Native USDC** is issued by Circle on Base and can be redeemed through Circle's systems.
- **Bridged USDC** (sometimes labelled USDbC) was an earlier version moved from Ethereum through a bridge.

Most apps now use native USDC. Always check the token contract address shown by the app you are using.

### Why USDC on Base suits payments

- Stable value.
- Low transfer fees.
- Fast confirmations.
- Widely supported by exchanges and wallets.

For a fuller comparison of stablecoins, see our [USDC vs USDT guide](/guides/usdc-vs-usdt-gambling). To get USDC in the first place, read [how to buy USDC](/guides/how-to-buy-usdc).`,
    },
    {
      id: "getting-funds",
      title: "Getting funds onto Base",
      body: `There are two common ways to get ETH and USDC on Base.

### Withdraw from an exchange

Many exchanges, including Coinbase, let you withdraw directly to Base. Choose Base as the network when withdrawing. This is usually the simplest and cheapest route.

### Bridge from another network

If your funds are on Ethereum mainnet or another network, you can use a bridge to move them to Base. Bridges vary in speed, fees and security. Use well-known bridges, double-check the destination network, and start with a small amount.

### Common mistakes

- Choosing the wrong network when withdrawing.
- Sending USDC without having ETH on Base for gas.
- Sending a bridged or unsupported token version.
- Copying an address incorrectly.

Always send a small test amount first when using a new route.`,
    },
    {
      id: "explorer",
      title: "Using a Base block explorer",
      body: `A block explorer lets you look up any transaction or address on Base. The main one is BaseScan (basescan.org).

### What you can check

- Whether a transaction succeeded or failed.
- How many confirmations it has.
- The exact token and amount sent.
- The fee paid.

### How to use it

1. Copy the transaction hash from your wallet or the app.
2. Paste it into the explorer's search bar.
3. Check the status, token, amount and addresses.

### Why it helps

If a deposit seems slow, the explorer shows whether it has actually been confirmed on the network. When PVPspinArena sends a withdrawal, the transaction hash lets you confirm the payment yourself.`,
    },
    {
      id: "why-pvp",
      title: "Why PVPspinArena uses Base",
      body: `PVPspinArena settles deposits and withdrawals in USDC on Base mainnet.

### Reasons

- **Low fees** keep small deposits and withdrawals practical.
- **Fast blocks** mean deposits are detected quickly.
- **Native USDC** keeps balances in stable dollar terms.
- **Ethereum compatibility** means MetaMask and other common wallets work.

### How deposits work

You verify your wallet address on your profile by signing a message. USDC sent from that address to the platform's deposit address on Base is detected, checked and credited to your USD balance automatically. See the [wallet page](/wallet) for the current address and network.

### How withdrawals work

Withdrawals are sent as USDC on Base to your verified address. A withdrawal is marked finished only once its transaction is in a safe block and two independent network providers agree it succeeded. Our [crypto casino withdrawals guide](/guides/crypto-casino-withdrawals) explains why this matters, and our [USDC casino guide](/guides/usdc-casino) covers the wider picture.`,
    },
    {
      id: "risks",
      title: "Risks and limitations",
      body: `Base is widely used, but like any network it has trade-offs.

- **Centralised sequencer**: at present, Base's transaction ordering is run by a single operator. This is common for layer 2 networks but is a point of centralisation.
- **Bridge risk**: bridges between networks have historically been targets for hacks.
- **Irreversible transfers**: as on any blockchain, a transfer to the wrong address cannot be undone.
- **Fee spikes**: during busy periods, fees can rise.
- **Scam tokens**: anyone can create tokens on Base; always check contract addresses.

Understanding these risks helps you use Base safely. Keep your seed phrase offline, as our [seed phrase guide](/guides/seed-phrase) explains, and double-check every transfer.`,
    },
  ],
  faqs: [
    {
      q: "What is the Base network?",
      a: "Base is an Ethereum layer 2 network incubated by Coinbase and launched in 2023. It offers low fees and fast transfers while using Ethereum-style addresses and wallets.",
    },
    {
      q: "Does Base have its own token?",
      a: "No. Base does not have a native token. Gas fees are paid in ETH.",
    },
    {
      q: "Why do I need ETH to send USDC on Base?",
      a: "Every transaction on Base pays its network fee in ETH. Without a small ETH balance on Base, your wallet cannot send USDC.",
    },
    {
      q: "Is USDC on Base the same as USDC on Ethereum?",
      a: "Both are issued by Circle and worth $1, but they live on different networks. You must send USDC on the network the recipient supports.",
    },
    {
      q: "What is the Base chain ID?",
      a: "Base mainnet uses chain ID 8453. Wallets use this number to identify the network.",
    },
  ],
  sources: [
    { label: "Base documentation", url: "https://docs.base.org/" },
    { label: "Circle: USDC on Base", url: "https://www.circle.com/multi-chain-usdc/base" },
    { label: "BaseScan block explorer", url: "https://basescan.org/" },
    { label: "Optimism: OP Stack documentation", url: "https://docs.optimism.io/" },
  ],
  related: ["add-base-network-metamask", "how-to-buy-usdc", "usdc-casino", "seed-phrase"],
  updated: "2026-09-25",
};
