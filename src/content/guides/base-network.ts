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
      body: "Base is a blockchain network designed to make Ethereum cheaper and faster to use. It is a layer 2, which means it runs on top of Ethereum rather than replacing it.\n\n### Who is behind it\n\nBase was incubated by Coinbase, one of the largest crypto exchanges. It opened its mainnet to the public in August 2023. Base does not have its own native token; it uses ETH for fees.\n\n### What it is for\n\nBase is a general-purpose network. People use it for payments, trading, games, social apps and more. For everyday users, the main benefits are:\n\n- **Low fees**: often a small fraction of what the same transfer would cost on Ethereum mainnet.\n- **Fast confirmations**: blocks roughly every two seconds.\n- **Familiar tools**: the same wallets and addresses as Ethereum.\n\nIf you want to set up your wallet for Base, our [add Base to MetaMask guide](/guides/add-base-network-metamask) has the steps.",
    },
    {
      id: "layer2",
      title: "How a layer 2 works",
      body: 'Ethereum mainnet is secure but can be slow and expensive when busy. Layer 2 networks handle transactions separately, then post compressed data back to Ethereum.\n\n### Optimistic rollups\n\nBase is an optimistic rollup. In simple terms:\n\n1. Transactions are collected and ordered on Base.\n2. Batches of transaction data are posted to Ethereum.\n3. The system assumes batches are valid unless someone proves otherwise within a challenge window.\n\nThis design lets Base inherit much of Ethereum\'s security while processing many more transactions cheaply.\n\n### The OP Stack\n\nBase is built on the OP Stack, open-source software developed for Optimism. Networks using it form part of what is often called the Superchain, sharing standards and tooling.\n\n### Safe and finalized blocks\n\nBecause Base posts data to Ethereum, there are stages of confirmation. A block can be seen on Base almost instantly, but it becomes "safe" once its data is posted to Ethereum, and fully "finalized" later. Careful apps wait for these stages before treating large payments as settled.',
    },
    {
      id: "fees",
      title: "Fees and speed on Base",
      body: '### What you pay\n\nEvery transaction on Base pays gas in ETH. The fee has two parts:\n\n- **Layer 2 execution fee**: the cost of running the transaction on Base.\n- **Layer 1 data fee**: the cost of posting its data to Ethereum.\n\nSince Ethereum\'s 2024 upgrade that introduced cheaper data "blobs", layer 2 fees dropped sharply. A simple USDC transfer on Base usually costs a small fraction of a dollar, though fees rise when the network is busy.\n\n### Why you need ETH even for USDC\n\nGas is always paid in ETH on Base. If your wallet has USDC but no ETH on Base, you cannot send the USDC. Keep a small amount of ETH on Base for fees.\n\n### Speed\n\nBase produces blocks about every two seconds. Most transfers appear within seconds. For safety, many apps wait for a few more steps before crediting funds, as described above.',
    },
    {
      id: "usdc",
      title: "USDC on Base",
      body: "USDC is a stablecoin issued by Circle, designed to hold a value of $1. Circle issues native USDC directly on Base.\n\n### Native vs bridged USDC\n\n- **Native USDC** is issued by Circle on Base and can be redeemed through Circle's systems.\n- **Bridged USDC** (sometimes labelled USDbC) was an earlier version moved from Ethereum through a bridge.\n\nMost apps now use native USDC. Always check the token contract address shown by the app you are using.\n\n### Why USDC on Base suits payments\n\n- Stable value.\n- Low transfer fees.\n- Fast confirmations.\n- Widely supported by exchanges and wallets.\n\nFor a fuller comparison of stablecoins, see our [USDC vs USDT guide](/guides/usdc-vs-usdt-gambling). To get USDC in the first place, read [how to buy USDC](/guides/how-to-buy-usdc).",
    },
    {
      id: "getting-funds",
      title: "Getting funds onto Base",
      body: "There are two common ways to get ETH and USDC on Base.\n\n### Withdraw from an exchange\n\nMany exchanges, including Coinbase, let you withdraw directly to Base. Choose Base as the network when withdrawing. This is usually the simplest and cheapest route.\n\n### Bridge from another network\n\nIf your funds are on Ethereum mainnet or another network, you can use a bridge to move them to Base. Bridges vary in speed, fees and security. Use well-known bridges, double-check the destination network, and start with a small amount.\n\n### Common mistakes\n\n- Choosing the wrong network when withdrawing.\n- Sending USDC without having ETH on Base for gas.\n- Sending a bridged or unsupported token version.\n- Copying an address incorrectly.\n\nAlways send a small test amount first when using a new route.",
    },
    {
      id: "explorer",
      title: "Using a Base block explorer",
      body: "A block explorer lets you look up any transaction or address on Base. The main one is BaseScan (basescan.org).\n\n### What you can check\n\n- Whether a transaction succeeded or failed.\n- How many confirmations it has.\n- The exact token and amount sent.\n- The fee paid.\n\n### How to use it\n\n1. Copy the transaction hash from your wallet or the app.\n2. Paste it into the explorer's search bar.\n3. Check the status, token, amount and addresses.\n\n### Why it helps\n\nIf a deposit seems slow, the explorer shows whether it has actually been confirmed on the network. When PVPspinArena sends a withdrawal, the transaction hash lets you confirm the payment yourself.",
    },
    {
      id: "why-pvp",
      title: "Why PVPspinArena uses Base",
      body: "PVPspinArena settles deposits and withdrawals in USDC on Base mainnet.\n\n### Reasons\n\n- **Low fees** keep small deposits and withdrawals practical.\n- **Fast blocks** mean deposits are detected quickly.\n- **Native USDC** keeps balances in stable dollar terms.\n- **Ethereum compatibility** means MetaMask and other common wallets work.\n\n### How deposits work\n\nYou verify your wallet address on your profile by signing a message. On the wallet page you connect that wallet and send USDC on Base. The transfer is detected, checked and credited to your USD balance automatically. See the [wallet page](/how-it-works#wallet) for the network and the send button.\n\n### How withdrawals work\n\nWithdrawals are sent as USDC on Base to your verified address. A withdrawal is marked finished only once its transaction is in a safe block and two independent network providers agree it succeeded. Our [crypto casino withdrawals guide](/guides/crypto-casino-withdrawals) explains why this matters, and our [USDC casino guide](/guides/usdc-casino) covers the wider picture.",
    },
    {
      id: "risks",
      title: "Risks and limitations",
      body: "Base is widely used, but like any network it has trade-offs.\n\n- **Centralised sequencer**: at present, Base's transaction ordering is run by a single operator. This is common for layer 2 networks but is a point of centralisation.\n- **Bridge risk**: bridges between networks have historically been targets for hacks.\n- **Irreversible transfers**: as on any blockchain, a transfer to the wrong address cannot be undone.\n- **Fee spikes**: during busy periods, fees can rise.\n- **Scam tokens**: anyone can create tokens on Base; always check contract addresses.\n\nUnderstanding these risks helps you use Base safely. Keep your seed phrase offline, as our [seed phrase guide](/guides/seed-phrase) explains, and double-check every transfer.",
    },
    {
      id: "compare",
      title: "Base compared with other networks",
      body: "Base is one of several networks that support USDC and Ethereum-style wallets.\n\n### Ethereum mainnet\n\n- Highest security and decentralisation.\n- Fees can be high during busy periods.\n- Slower blocks, about every 12 seconds.\n\n### Base\n\n- Layer 2 built on the OP Stack.\n- Low fees and fast blocks.\n- Strong exchange support through Coinbase.\n\n### Other layer 2 networks\n\nArbitrum, Optimism and others offer similar benefits with different designs and ecosystems.\n\n### Non-Ethereum networks\n\nSolana, Tron and others also support stablecoins but use different wallets and address formats. Sending to the wrong type of network is a common and costly mistake.\n\n### The rule of thumb\n\nAlways send tokens on the network the recipient supports. For PVPspinArena, that means USDC on Base. If in doubt, check the [wallet page](/how-it-works#wallet) before sending.",
    },
    {
      id: "apps",
      title: "What people use Base for",
      body: "Base has grown into one of the most active layer 2 networks. Common uses include:\n\n- **Payments**: sending stablecoins between people and businesses.\n- **Trading**: decentralised exchanges and token swaps.\n- **Games and social apps**: on-chain games, social platforms and creator tools.\n- **Onramps**: moving funds from Coinbase and other exchanges into on-chain apps cheaply.\n\nFor gaming platforms, the combination of low fees and native USDC is the main draw. Small deposits and withdrawals make sense on Base in a way they often do not on Ethereum mainnet, where a single transfer can cost more than the amount being sent.",
    },
    {
      id: "safety",
      title: "Staying safe on Base",
      body: "- Only add Base to your wallet using official network details.\n- Check the token contract before accepting or sending tokens.\n- Ignore unexpected tokens that appear in your wallet; many are scams.\n- Keep a small ETH balance for gas, not your whole savings, in the wallet you use for apps.\n- Verify large transfers on BaseScan before assuming they arrived.\n- Never share your seed phrase, however official a request looks.",
    },
    {
      id: "deposit-walkthrough",
      title: "A typical first deposit on Base",
      body: "Here is how a first deposit to a Base-based app usually goes, without repeating the full wallet setup.\n\n1. **Buy USDC** on an exchange that supports Base withdrawals.\n2. **Buy a small amount of ETH** for gas, or check whether the exchange lets you withdraw ETH on Base as well.\n3. **Withdraw both to your wallet**, choosing Base as the network each time.\n4. **Check the arrival** in your wallet and, if needed, on BaseScan.\n5. **Verify your wallet** on the app if it requires it. On PVPspinArena this is a signed message on your profile.\n6. **Send a small test amount** of USDC from the linked wallet on the wallet page.\n7. **Wait for credit**, then send the rest once you are confident everything works.\n\n### Timing\n\nOn Base, the transfer itself usually confirms within seconds. Apps that wait for extra safety steps may take a little longer before your balance updates. PVPspinArena shows deposit status updates as the deposit is detected and credited.\n\n### Fees to expect\n\nYou pay a small ETH gas fee for each send. Exchanges may also charge their own withdrawal fee, which is separate from the network fee.\n\nMore crypto payments reading lives in our [Crypto payments guides](/guides/topics/crypto-payments).\n\nGetting onto Base is its own set of mistakes. [Bridge to Base](/guides/bridge-to-base) is the hop. [Base network fees](/guides/base-network-fees) are what the hop costs. [Coinbase Wallet to Base](/guides/coinbase-wallet-to-base) is one path that still has to name the network.",
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
  related: [
    "usdc-casino",
    "base-vs-ethereum",
    "ethereum-gambling",
    "gas-fees-explained",
    "crypto-bridge",
    "bridge-to-base",
    "base-network-fees",
    "coinbase-wallet-to-base",
    "stuck-crypto-transaction",
  ],
  updated: "2026-11-26",
};
