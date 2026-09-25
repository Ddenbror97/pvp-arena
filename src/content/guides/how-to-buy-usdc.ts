import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-buy-usdc",
  cluster: "Crypto payments",
  keyword: "how to buy usdc",
  secondary: ["buy usdc", "buy usdc on base", "usdc exchange", "withdraw usdc to metamask"],
  title: "How to Buy USDC and Send It on Base, Step by Step",
  description:
    "How to buy USDC: choose an exchange, verify your account, buy with a card or bank transfer, and withdraw USDC on the Base network to your own wallet safely.",
  h1: "How to buy USDC and send it on Base",
  answer:
    "Here is how to buy USDC: open an account at a regulated crypto exchange, verify your identity, add money by bank transfer or card, and buy USDC. Then withdraw it to your own wallet, choosing the Base network if that is where you want to use it. Always send a small test amount first and double-check the network before confirming.",
  facts: [
    "USDC is a dollar stablecoin issued by Circle and designed to be redeemable 1:1 for US dollars.",
    "Most large exchanges sell USDC and let you withdraw it on several networks, including Base.",
    "The network you withdraw on must match the network where the funds will be received.",
    "Exchanges usually require identity verification before you can buy or withdraw.",
    "Base network fees are usually small, but you need a little ETH on Base to send USDC from a wallet.",
  ],
  sections: [
    {
      id: "why",
      title: "Why buy USDC?",
      body: `USDC is a stablecoin: a digital token designed to keep a steady value of one US dollar. It is issued by Circle, which states that each USDC is backed by cash and short-term US government bonds and can be redeemed one for one.

People buy USDC because it combines the speed of crypto with the stability of dollars. You can send it anywhere in minutes, often for a tiny fee, without the price swings of Bitcoin or ETH.

For online gaming, that stability is useful. If you deposit $20 of USDC, your balance is worth about $20 whatever the crypto market does. PVPspinArena accepts USDC on the Base network and shows every balance in US dollars, so a 20 USDC deposit becomes $20.00. Our [USDC casino guide](/guides/usdc-casino) explains how that works end to end.

This guide covers the practical side: where to buy USDC, how to get it into a wallet you control, and how to avoid the mistakes that most often cost people money.`,
    },
    {
      id: "where",
      title: "Where to buy USDC",
      body: `There are three main ways to buy USDC.

### Centralised exchanges

Large exchanges such as Coinbase, Kraken and Binance sell USDC directly for dollars, euros and other currencies. They are usually the cheapest and easiest option for beginners. Coinbase is also a founding partner of Base, which makes moving USDC onto Base straightforward there.

### In-wallet purchases

Wallets like MetaMask offer a "buy" button that connects to third-party payment providers. This is convenient, because the USDC goes straight to your wallet, but fees are often higher than on an exchange.

### Swapping other crypto

If you already hold ETH, you can swap it for USDC on a decentralised exchange directly from your wallet. This needs some familiarity with swaps and slippage settings.

### How to choose

- Check the exchange is licensed or registered in your country.
- Compare trading fees and deposit fees for your payment method.
- Confirm it supports USDC withdrawals on Base.
- Look at withdrawal fees and minimum withdrawal amounts.

Availability varies by country, so check which options are open to you before you start.`,
    },
    {
      id: "steps",
      title: "Step by step: buying USDC on an exchange",
      body: `The exact screens differ, but the process is similar on every major exchange.

1. **Create an account.** Sign up with your email and a strong, unique password.
2. **Turn on two-factor authentication.** Use an authenticator app rather than SMS where possible.
3. **Verify your identity.** Exchanges are required to check who you are. You will usually upload an ID document and a selfie. This can take minutes or a few days.
4. **Add money.** Choose a bank transfer, card or another local method. Bank transfers are usually cheapest; cards are fastest.
5. **Buy USDC.** Search for USDC, enter the amount in your currency and confirm. Check the total cost, including fees, before you press buy.
6. **Check your balance.** The USDC appears in your exchange account.

### Fees to watch

- **Spread**: the difference between the buy and sell price.
- **Trading fee**: a percentage or fixed fee per purchase.
- **Payment fee**: card purchases often cost more than bank transfers.

Some exchanges show all of these as one total. If not, compare the dollar amount you pay with the USDC you receive.`,
    },
    {
      id: "wallet",
      title: "Moving USDC to your own wallet",
      body: `Keeping USDC on an exchange is fine for a short time, but to use it with sites that match deposits by wallet address, such as PVPspinArena, you need it in a wallet you control.

### Why use your own wallet

- You hold the keys, so the funds are yours, not an IOU from the exchange.
- Sites that verify your wallet can match deposits to your account.
- You can see every transaction on a block explorer.

### Setting one up

MetaMask is a common choice and supports Base. Install it only from the official website or app store, write down your recovery phrase on paper, and add the Base network. Our guides to the [MetaMask casino setup](/guides/metamask-casino) and [adding Base to MetaMask](/guides/add-base-network-metamask) walk through each step.

### Copy your address

In MetaMask, click your account name to copy your address. It starts with 0x and is 42 characters long. The same address works on Ethereum and Base, which is why choosing the correct network during withdrawal is so important.`,
    },
    {
      id: "base",
      title: "Withdrawing USDC on the Base network",
      body: `This is the step where mistakes happen, so go slowly.

1. **Open the exchange's withdraw page** and choose USDC.
2. **Paste your wallet address.** Check the first four and last four characters against MetaMask.
3. **Choose the network: Base.** Exchanges list several networks for USDC, such as Ethereum, Base, Solana and others. Select Base.
4. **Enter the amount.** Start with a small test amount, such as $5.
5. **Review the fee** and confirm. Complete any email or two-factor check.
6. **Wait.** Withdrawals on Base usually arrive within minutes, though exchanges may add their own processing time.
7. **Check MetaMask.** Switch MetaMask to Base. If USDC does not show, add the USDC token for Base from MetaMask's token list.

### Why the network matters

A USDC transfer on Ethereum does not appear on Base, and one on Solana will not reach an Ethereum-style address at all. Picking the wrong network is the most common way people lose crypto. Some losses can be recovered with effort; some cannot.

Once the test amount arrives, send the rest.`,
    },
    {
      id: "gas",
      title: "Getting a little ETH for fees",
      body: `USDC transfers from your own wallet need a network fee, and on Base that fee is paid in ETH, not USDC. Without any ETH on Base, MetaMask cannot send your USDC.

### How much you need

Base fees are usually a fraction of a cent to a few cents per transfer. A dollar or two of ETH on Base is typically enough for many transfers, though fees can rise during busy periods.

### How to get it

- **Buy ETH on the same exchange** and withdraw it on Base to the same address, just like USDC.
- **Use a wallet purchase** in MetaMask for a small amount.
- **Swap a little USDC for ETH** on Base, which itself needs a tiny fee, so this works best if you already have some ETH.

### Depositing ETH instead

PVPspinArena also accepts ETH deposits on Base and converts them to a US dollar balance. However, because ETH's price moves, the dollar value can change between buying and depositing. USDC keeps things simpler for a planned budget.`,
    },
    {
      id: "safety",
      title: "Safety tips when buying USDC",
      body: `A few habits prevent most problems.

- **Only use exchanges available and regulated where you live.** Check official registers if unsure.
- **Bookmark the exchange.** Phishing sites copy login pages. Always use your bookmark.
- **Use an authenticator app for two-factor authentication.** SMS codes can be intercepted through SIM swaps.
- **Whitelist withdrawal addresses.** Many exchanges let you restrict withdrawals to saved addresses.
- **Send a test amount first.** Every time you use a new address or network.
- **Never share your recovery phrase.** Exchange support never needs it; neither does any casino.
- **Beware of "USDC" lookalikes.** Scam tokens can use the same name. Use the USDC listed by your wallet or the official contract address published by Circle.
- **Keep records.** Save transaction hashes and exchange statements. Some countries tax crypto disposals, including spending stablecoins, so keep records for tax purposes.

If you plan to use USDC for gaming, decide on a [gambling budget](/guides/gambling-budget) before you buy, and only buy that amount.`,
    },
    {
      id: "deposit",
      title: "Using your USDC on PVPspinArena",
      body: `With USDC on Base in your wallet, depositing takes a few minutes.

1. **Verify your wallet** on your profile by connecting MetaMask and signing a short message. It costs no gas.
2. **Open the wallet page** and copy the deposit address.
3. **Send USDC on Base** from your verified MetaMask account.
4. **Wait for confirmations.** The site detects your transfer, waits until it is safely confirmed and checks it with two independent blockchain data providers.
5. **Play.** Your balance updates in US dollars.

Deposits must come from your verified address, because that is how they are matched to your account. Deposits sent directly from an exchange cannot be matched automatically.

Once funded, you can join a [crypto jackpot](/guides/crypto-jackpot) pot, open a [coinflip](/guides/csgo-coinflip) duel or bet on [roulette](/guides/cs2-roulette).`,
    },
    {
      id: "next",
      title: "Before your first deposit",
      body: `Before you send your first USDC, take a few minutes to understand where it is going. Read [how it works](/how-it-works) for an overview of PVPspinArena's balances, deposits and withdrawals, including why deposits are credited only after confirmations and why withdrawals have limits and reviews.

It is also worth opening the [Fairness page](/fairness) and checking a finished game or two. It shows exactly how results are produced and lets you verify them yourself, so you know what you are playing before you spend anything.

Finally, write down your budget and stick to it. Buying exactly the amount you plan to play, rather than a round number "just in case", is one of the simplest ways to keep gaming spending under control. If you want to start small, a single session's budget plus a dollar or two of ETH for fees is plenty for a first try.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `To buy USDC, open and verify an account at a regulated exchange, add money by bank transfer or card, and purchase USDC. Then withdraw it to your own wallet, choosing the Base network if you plan to use it there.

Always check the network and address, send a small test amount first and keep a little ETH on Base for fees. Protect your accounts with an authenticator app, bookmarks and address whitelists, and never share your recovery phrase.

On PVPspinArena, send USDC on Base from your verified wallet, and your balance appears in dollars after confirmations. Buy only what fits your budget.`,
    },
  ],
  faqs: [
    {
      q: "What is the cheapest way to buy USDC?",
      a: "Usually a bank transfer to a large exchange, then buying USDC there. Card purchases and in-wallet buy buttons are faster but often cost more.",
    },
    {
      q: "Can I buy USDC directly on Base?",
      a: "Many exchanges let you buy USDC and then withdraw it on Base. Some wallets also offer purchases that deliver USDC straight to Base.",
    },
    {
      q: "What happens if I send USDC on the wrong network?",
      a: "It will not arrive where you expected. Depending on the networks and the receiving service, it may be recoverable or lost, so always check the network first.",
    },
    {
      q: "Do I need ETH to send USDC?",
      a: "Yes, when sending from your own wallet. Fees on Base are paid in ETH, so keep a small amount of ETH on Base in the same wallet.",
    },
    {
      q: "Can I deposit USDC to PVPspinArena directly from an exchange?",
      a: "Not automatically. Deposits are matched by your verified wallet address, so withdraw from the exchange to your verified wallet first, then send from there.",
    },
  ],
  sources: [
    { label: "Circle: USDC", url: "https://www.circle.com/usdc" },
    { label: "Circle: USDC contract addresses", url: "https://developers.circle.com/stablecoins/usdc-contract-addresses" },
    { label: "Base documentation: network information", url: "https://docs.base.org/chain/network-information" },
    { label: "MetaMask Help Center", url: "https://support.metamask.io/" },
  ],
  related: ["base-network", "usdc-casino", "add-base-network-metamask", "metamask-casino"],
  updated: "2026-09-25",
  howTo: true,
};
