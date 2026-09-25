import type { Guide } from "./types";

export const guide: Guide = {
  slug: "usdc-casino",
  cluster: "Crypto payments",
  pillar: true,
  keyword: "usdc casino",
  secondary: ["usdc gambling", "usdt casino", "crypto casino deposit", "crypto casino withdrawal"],
  title: "USDC Casino Guide: Deposits, Withdrawals and Fees",
  description:
    "How a USDC casino works: sending USDC on Base, confirmation times, withdrawal checks and fees, and why a dollar stablecoin keeps balances simple.",
  h1: "USDC casino guide: deposits, withdrawals and fees",
  answer:
    "A USDC casino accepts USDC, a stablecoin designed to track the US dollar, for deposits and withdrawals. Because one USDC aims to equal one dollar, your balance doesn't swing with crypto prices. You send USDC from your wallet on a supported network such as Base, the casino credits it after confirmations, and payouts are sent back as USDC.",
  facts: [
    "USDC is issued by Circle and is designed to be redeemable 1:1 for US dollars.",
    "USDC exists on many networks. You must send on the network the casino supports.",
    "PVPspinArena accepts USDC and ETH on the Base network and shows balances in US dollars.",
    "Deposits are credited after confirmations, once two independent blockchain data providers agree.",
    "Withdrawals on PVPspinArena have a $250 daily limit; requests over $25 wait for review.",
  ],
  sections: [
    {
      id: "what-is",
      title: "What is a USDC casino?",
      body: `A USDC casino is a [crypto casino](/guides/what-is-a-crypto-casino) that uses USDC as its main currency. USDC is a stablecoin: a token issued by Circle that is backed by cash and short-term US government bonds and designed to be redeemable one for one with the US dollar.

For gaming, that stability is the main attraction. If you deposit Bitcoin or ETH, the dollar value of your balance moves with the market even while you are not playing. With USDC, $20 stays roughly $20, so your wins and losses come from the games, not from price swings.

PVPspinArena is built around this idea. You can deposit USDC or ETH on the Base network, and every balance is kept internally in US dollar cents. A 10 USDC deposit becomes $10.00, and a $5.00 win is exactly $5.00.`,
    },
    {
      id: "networks",
      title: "Networks: why Base, and why it matters",
      body: `USDC is issued on many blockchains, including Ethereum, Base, Solana and others. The token has the same name on each, but a transfer on one network does not appear on another. This is the most common way people lose money with crypto casinos: they send USDC on a network the site doesn't watch.

### Why Base

Base is a layer-2 network built on Ethereum. It uses the same address format as Ethereum and works with wallets such as MetaMask, but network fees are usually a fraction of a cent to a few cents. That makes small deposits practical.

### How to stay safe

- Check the network name on the casino's deposit page before you send.
- In your wallet or exchange, choose that exact network when withdrawing.
- If your exchange offers several USDC networks, pick Base for PVPspinArena.
- Send a small test amount the first time.

Our step-by-step guide to [adding the Base network to MetaMask](/guides/add-base-network-metamask) shows the settings, and [how to buy USDC](/guides/how-to-buy-usdc) covers getting USDC onto Base from an exchange.`,
    },
    {
      id: "deposit",
      title: "How USDC deposits work",
      body: `Here is what happens between pressing send and seeing your balance update on PVPspinArena.

1. **Verify your wallet.** On your profile, connect your wallet and sign a short message. This proves you own it and costs no gas. Deposits are matched to your account by this verified sender address.
2. **Copy the deposit address.** The wallet page shows the address and the supported network.
3. **Send USDC on Base.** Your wallet broadcasts the transfer and pays a small network fee.
4. **Detection.** The site checks the chain every minute and records the incoming transfer.
5. **Confirmations.** The deposit waits until enough blocks have been added on top of it that it is very unlikely to be reversed.
6. **Agreement.** Two independent blockchain data providers must both report the same transfer before it is credited.
7. **Credit.** Your balance increases once, exactly once, and a notice appears on screen.

In practice, a deposit typically appears within a minute or two of confirming. A deposit sent from a wallet that isn't verified to your account can't be matched automatically, so always deposit from your verified wallet.`,
    },
    {
      id: "withdraw",
      title: "How USDC withdrawals work",
      body: `Withdrawals are where honest sites differ most from marketing claims. A careful withdrawal process protects your money as much as the site's.

1. **Request.** You choose an amount and a destination address. The amount is placed on hold on your balance, so it can't be spent twice.
2. **Checks.** PVPspinArena applies a $250 daily withdrawal limit, and requests over $25 wait for a manual review.
3. **Signing and sending.** The payout wallet signs a USDC transfer on Base and broadcasts it. The signed transaction is stored before it is sent, so a restart can never create a second payout.
4. **Finality.** The withdrawal is only marked as finished when the transaction is in a block considered safe from reversal and both blockchain data providers agree on the result.
5. **Settlement.** The hold is released into a completed payout in the ledger.

If a payout transaction ever fails, the money stays held rather than disappearing, and it is only returned to your balance once the failure itself is confirmed. The [crypto casino withdrawals guide](/guides/crypto-casino-withdrawals) explains why "instant" promises deserve caution.`,
    },
    {
      id: "fees",
      title: "USDC casino fees explained",
      body: `There are three different kinds of cost to keep apart.

- **Network fees.** Paid to the blockchain when you send a transaction. On Base these are typically very small. You pay the network fee on deposits from your own wallet.
- **Exchange fees.** If you buy USDC on an exchange and withdraw it, the exchange may charge its own withdrawal fee. Check before you send.
- **Game fees.** In player-vs-player games like Jackpot and Coinflip, the platform may take a fee from each pot, shown before you enter.

A well-run USDC casino should tell you each of these clearly. Be wary of hidden conversion spreads, where a site quotes your balance in its own token at a rate that differs from the market.`,
    },
    {
      id: "usdc-vs-usdt",
      title: "USDC vs USDT for casino play",
      body: `USDT (Tether) is the other large dollar stablecoin, and many sites accept both. They aim for the same goal but differ in issuer, reserve reporting and which networks are most common. For a player the practical questions are simple: which one does the site accept, and on which network? PVPspinArena currently accepts USDC, not USDT. The full comparison is in our guide to [USDC vs USDT](/guides/usdc-vs-usdt-gambling).`,
    },
    {
      id: "example",
      title: "Worked example: from exchange to first game",
      body: `Suppose you hold USDC on an exchange and want to play a $2.00 Coinflip.

You connect MetaMask on your PVPspinArena profile and sign the verification message. In your exchange you withdraw 20 USDC, choosing Base as the network and pasting your MetaMask address. It arrives in MetaMask a few minutes later.

From MetaMask you send the 20 USDC on Base to the PVPspinArena deposit address. You pay a network fee of a few cents in ETH. Within about a minute of confirmation, $20.00 appears in the header and a notice says the deposit was added.

You open [Coinflip](/coinflip), create a $2.00 game and pick a side. When someone joins, the result is decided by the committed seed. Later you withdraw $15.00 to MetaMask. Because it is under $25, it goes out without manual review, and it is marked as finished once the block is safe and both providers agree.`,
    },
    {
      id: "security",
      title: "Keeping your USDC safe",
      body: "Stablecoins remove price swings, but they don't remove the everyday risks of holding crypto. A few habits cover most of them.\n\n- **Never share your recovery phrase.** No casino, support agent or wallet provider will ever need it. Anyone asking for it is trying to steal your funds.\n- **Use a dedicated gaming wallet.** Keep most of your savings in a separate wallet, and move only what you plan to play with into the wallet you verify on the casino.\n- **Check addresses carefully.** Copy and paste rather than typing, and compare the first and last few characters before sending. Malware that swaps copied addresses exists.\n- **Beware of fake sites.** Bookmark the real site and avoid clicking deposit links in messages or ads.\n- **Review token approvals.** Some sites ask you to approve a contract to spend your tokens. PVPspinArena doesn't: you send USDC directly with a normal transfer, and wallet verification is a message signature that can't move funds.\n\n### What the site should protect\n\nOn the site's side, look for signs that custody is taken seriously. PVPspinArena keeps its deposit wallet and payout wallet separate, applies daily withdrawal limits, and blocks the site's own wallets from ever being linked to a player account. All balances live in a double-entry ledger in which every transaction balances, and regular reconciliation checks compare balances with their full history.\n\n### When to contact support\n\nIf a deposit hasn't appeared after several minutes, find the transaction hash in your wallet and check it on a Base block explorer such as BaseScan. If it shows as successful on Base and was sent from your verified wallet, contact support with the hash. If it was sent on another network, explain which one; it won't be detected automatically.",
    },
    {
      id: "usdt",
      title: "Can you use USDT or other coins?",
      body: "Many players already hold USDT or other tokens. PVPspinArena accepts USDC and ETH on Base only. If you hold USDT, you can swap it for USDC on an exchange or a reputable decentralised exchange before sending, keeping in mind that swaps have their own fees and slippage. ETH deposits on Base are also accepted and are converted to a dollar balance when they are credited, so the dollar amount is fixed at that point.",
    },
    {
      id: "eth",
      title: "Depositing ETH instead of USDC",
      body: "If you prefer to deposit ETH on Base, the flow is the same: send from your verified wallet to the deposit address and wait for confirmations. The difference is price. Because ETH's dollar value moves, the amount credited depends on the ETH price at the moment of crediting. Once credited, your balance is in dollars and no longer moves with ETH. Remember to keep a little ETH in your wallet anyway, since network fees on Base are paid in ETH.",
    },
    {
      id: "summary",
      title: "Summary",
      body: `A USDC casino uses a dollar-tracking stablecoin, so your balance reflects your play rather than market swings. The key to using one safely is the network: send on the exact network the site supports, from a verified wallet, and start with a small amount. Look for clear confirmation rules, honest withdrawal limits and fees shown up front.

Before your first deposit, read about [choosing a crypto wallet for gaming](/guides/crypto-wallet-for-gambling) and set a [gambling budget](/guides/gambling-budget). When you are ready, the [wallet page](/wallet) shows your deposit address.`,
    },
  ],
  faqs: [
    {
      q: "Which network should I use to deposit USDC on PVPspinArena?",
      a: "Base. Sending USDC on any other network, such as Ethereum mainnet or Solana, won't be detected by the site's deposit system.",
    },
    {
      q: "How long does a USDC deposit take?",
      a: "Once your transfer confirms on Base, the site checks the chain every minute, waits for confirmations and credits your balance when two providers agree. This usually takes a minute or two.",
    },
    {
      q: "Why was my deposit not credited?",
      a: "The most common reasons are sending on the wrong network or sending from a wallet that isn't verified to your account. Check the transaction hash on a Base block explorer and contact support with it.",
    },
    {
      q: "Are USDC casino withdrawals instant?",
      a: "No honest site can promise that. Withdrawals are checked, signed and sent, then confirmed on-chain. On PVPspinArena, amounts over $25 also wait for a manual review.",
    },
    {
      q: "Is my balance in USDC or dollars?",
      a: "PVPspinArena keeps balances in US dollar cents. Deposits of USDC are credited one to one, so 10 USDC becomes $10.00.",
    },
  ],
  sources: [
    { label: "Circle — USDC transparency", url: "https://www.circle.com/transparency" },
    { label: "Base — Network documentation", url: "https://docs.base.org/" },
    { label: "BaseScan — Base block explorer", url: "https://basescan.org/" },
  ],
  related: ["what-is-a-crypto-casino", "metamask-casino", "how-to-buy-usdc", "crypto-casino-withdrawals", "usdc-vs-usdt-gambling"],
  updated: "2026-09-25",
  howTo: true,
};
