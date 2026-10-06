import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-buy-usdt",
  cluster: "Crypto payments",
  keyword: "how to buy usdt",
  secondary: [
    "buy usdt",
    "buy tether",
    "usdt exchange",
    "buy usdt with bank transfer",
    "withdraw usdt to wallet",
  ],
  title: "How to Buy USDT: Exchanges, Costs and Network Choice",
  description:
    "How to buy USDT step by step: pick an exchange or app, fund it, read the real cost, choose the right network, and withdraw Tether to a wallet safely.",
  h1: "How to buy USDT: exchanges, costs and choosing a network",
  answer:
    "Here is how to buy USDT: open a verified account on a regulated exchange that serves your country, deposit local currency by bank transfer or card, and buy Tether on the USDT market. Then withdraw it on the network your destination supports, such as Tron or Ethereum, after sending a small test amount. Bank transfers are usually cheapest; card purchases cost more.",
  facts: [
    "Centralised exchanges are the cheapest route for most people; wallet on-ramps and card purchases are faster but usually cost more.",
    "Your real cost is the trading fee plus the spread plus the withdrawal fee, not the headline fee alone.",
    "USDT exists on many chains; the withdrawal screen asks you to choose one, and it must match the receiving address.",
    "A test withdrawal of a small amount costs one extra network fee and protects the whole balance from a wrong-network mistake.",
    "Buying crypto is for adults, and exchanges require identity verification (KYC) before you can deposit fiat.",
  ],
  sections: [
    {
      id: "routes",
      title: "The main ways to buy USDT",
      body: `There are four common routes, and they trade price against convenience.

| Route | How you pay | Typical cost | Best for |
| --- | --- | --- | --- |
| Centralised exchange (order book) | Bank transfer, sometimes card | Lowest: small trading fee plus spread | Most buyers, larger amounts |
| Exchange "buy" button | Bank or card | Higher: built-in spread | Speed, small amounts |
| Wallet on-ramp (MoonPay-style providers) | Card, local payment apps | Highest: provider fee plus spread | Buying straight into self-custody |
| Peer-to-peer marketplace | Bank transfer to a seller | Varies with seller price | Regions with few exchange options |

A fifth route suits people who already hold crypto: swap another token for USDT on an exchange or a decentralised exchange. That is covered in [how to swap tokens](/guides/how-to-swap-tokens).

### Choosing an exchange

Look for four things, in this order:

1. **It serves your country legally.** Availability of USDT specifically varies; some regions, including parts of the EU under MiCA rules, have seen exchanges restrict it.
2. **It supports a cheap deposit method in your currency**, such as SEPA, Faster Payments, ACH or a local instant-payment rail.
3. **It lists a USDT market you can use**, for example USDT against your currency, or USDT against USD or USDC.
4. **It supports withdrawals on the network you need.** Not every exchange offers every chain.

If you are new to what the token is and who issues it, start with [what is Tether](/guides/what-is-tether).`,
    },
    {
      id: "steps",
      title: "Step by step: buying USDT on an exchange",
      body: `1. **Create and verify the account.** Expect to upload an ID document and sometimes proof of address. This is standard anti-money-laundering practice and can take minutes or days.
2. **Turn on two-factor authentication** with an authenticator app, not SMS if you can avoid it. Set a withdrawal allowlist if the exchange offers one.
3. **Deposit local currency.** A bank transfer is usually free or cheap. Cards post instantly but often carry a 1–4% fee, depending on the exchange and your card issuer.
4. **Buy USDT.** On an order book, a limit order at or near the best price avoids most of the spread. A market order fills instantly at whatever the book offers.
5. **Decide where it will live.** Leaving USDT on the exchange is simplest if you will trade again soon. Moving it to your own wallet removes exchange risk; see [self-custody wallet](/guides/self-custody-wallet).
6. **Withdraw on the right network**, after a test transaction. The next sections cover both.

### Card purchases

If your only option is a card, compare the final "you receive" number, not the headline fee. Card-specific issues such as cash-advance charges and declined transactions are covered in [buy crypto with card](/guides/buy-crypto-with-card).`,
    },
    {
      id: "cost",
      title: "Working out the real cost",
      body: `A purchase has three separate costs. Exchanges tend to advertise the smallest one.

- **Trading fee:** a percentage of the order, often 0.1–0.6% on order books and higher on simple "buy" buttons.
- **Spread:** the gap between the price you pay and the mid-market price. USDT pairs are usually tight on large exchanges, but convenience buttons can bake in 0.5–2%.
- **Withdrawal fee:** a flat fee charged in USDT to send it out. It depends on the network and on the exchange's own policy.

### Worked example

You buy $500 of USDT with a bank transfer and withdraw it.

| Item | Rate or fee | Cost |
| --- | --- | --- |
| Deposit by bank transfer | Free | $0.00 |
| Trading fee | 0.2% of $500 | $1.00 |
| Spread | 0.1% | $0.50 |
| Withdrawal (cheap network) | 1 USDT flat | $1.00 |
| **Total** | | **$2.50, or 0.5%** |

Now the same $500 bought with a card through a wallet on-ramp at a 3.5% all-in fee, then sent on a busy network with a $5 fee: about $22.50, nine times the cost. The ranges above are illustrative; exchanges change fee schedules, so read the order preview and the withdrawal screen every time. For how these costs add up across a full deposit to a casino, see [crypto casino deposit fees](/guides/crypto-casino-deposit-fees).`,
    },
    {
      id: "network",
      title: "Choosing the network for your USDT",
      body: `When you withdraw, the exchange asks which network to use. This is the step where most expensive mistakes happen.

| Network | Address looks like | Fee level | Notes |
| --- | --- | --- | --- |
| Tron (TRC-20) | Starts with "T" | Low | Very common on exchanges; wallet needs TRX for fees if you send again |
| Ethereum (ERC-20) | Starts with "0x" | Higher, varies with demand | Widest DeFi support |
| Solana | Base58 string, no prefix | Very low | Wallet needs a little SOL for fees |
| BNB Smart Chain | Starts with "0x" | Low | Same address format as Ethereum, different chain |
| TON | Often starts with "UQ" or "EQ" | Low | Telegram wallet ecosystem |

Two warnings. First, several networks share the "0x" address format, so an address that looks valid can still be on the wrong chain. Second, the receiving service decides, not you. If a destination says "USDT on Tron only", sending Ethereum USDT will not arrive, and recovery depends entirely on whether the receiver can and will help. The technical differences are in [ERC-20 vs TRC-20](/guides/erc20-vs-trc20), and recovery options are in [sent crypto to the wrong network](/guides/sent-crypto-to-wrong-network).

### Gas tokens

On most chains you pay network fees in the chain's own coin, not in USDT. Exchanges pay that for you on the way out, but once USDT is in your own wallet you need a small amount of TRX, ETH or SOL to move it again.`,
    },
    {
      id: "alternatives",
      title: "Peer-to-peer, swaps and cashing back out",
      body: `### Peer-to-peer markets

Several large exchanges run P2P desks where individuals sell USDT for local bank transfers or mobile payments. The exchange holds the seller's USDT in escrow until the seller confirms your payment arrived. This is the main route in places where card and bank rails into exchanges are limited.

How to use one without getting burned:

1. Pick sellers with long trade histories and high completion rates, not just the best price.
2. Pay only through the method shown in the order, from an account in your own name.
3. Never move the conversation or the payment off the platform. Escrow only protects trades that stay on it.
4. Compare the P2P price with the regular market. A premium of 1–3% is common in some regions; a much larger one is a sign you should look elsewhere.

### Swapping into USDT

If you already hold crypto, a swap is often simpler than a new fiat purchase. On an exchange, sell the coin into a USDT pair. On a decentralised exchange, check that the output token is the official USDT contract for that chain and set a sensible slippage limit. Swaps on busy chains can cost more in network fees than the trading fee itself.

### Selling USDT later

Plan the exit before you buy. The cheapest way back to your bank is usually the reverse of the way in: send USDT to an exchange on a network it supports, sell into your local currency, and withdraw by bank transfer. Check three things in advance: that the exchange accepts USDT deposits on your chosen network, the fiat withdrawal fee, and any daily withdrawal limit on your verification tier.

### Record keeping

In many countries, buying a stablecoin is not taxable in itself, but swapping or selling crypto can be. Keep exports of your exchange history and wallet transactions; they are far easier to download now than to rebuild later.`,
    },
    {
      id: "safety",
      title: "Test transactions and avoiding scams",
      body: `### The test transaction

Send a small amount first, such as 10 USDT, and wait for it to arrive before sending the rest. On a cheap network the test costs about a dollar. Measured against a $2,000 transfer sent to the wrong chain, that is inexpensive insurance. [How to send crypto](/guides/how-to-send-crypto) has a checklist for copying and verifying addresses.

### Common USDT scams

- **Fake USDT tokens.** Anyone can create a token called "USDT". Check the contract address against the issuer's official list before accepting a payment.
- **Address poisoning.** Scammers send tiny transfers from addresses that match the first and last characters of one you use, hoping you copy theirs from your history. Always copy from the source.
- **P2P chargebacks and fake receipts.** On peer-to-peer markets, only release or send once your bank shows cleared funds, and use the platform's escrow.
- **"Guaranteed yield" offers.** Promises of fixed high returns on USDT are a classic fraud pattern.

Keep your recovery phrase offline and never type it into a website; see [seed phrase](/guides/seed-phrase).`,
    },
    {
      id: "pvp",
      title: "USDT, USDC and playing on PVPspinArena",
      body: `PVPspinArena runs three player-vs-player games, [Jackpot](/), [Coinflip](/coinflip) and [Roulette](/roulette), and play is in USDC or ETH on the Base network. If you are buying a stablecoin specifically to play there, buying USDC on Base directly saves a swap and a second fee; [how to buy USDC](/guides/how-to-buy-usdc) covers that route. If you already hold USDT, swap it to USDC and send it on Base. Other casinos' handling of Tether is covered in [USDT casino](/guides/usdt-casino).

Whichever token you use, the maths of the games does not change. A Coinflip is a 50/50 between two players, and Purple and Silver return 32/33 before the win fee, about a 7.88% edge after it, and Green returns 14/33. You can verify any settled round on [fairness](/fairness).

Gambling is 18+ or the legal age where you live. Decide your budget before you buy the token, not after, and use the [responsible gambling](/responsible-gambling) tools if play stops being entertainment. More payment guides are collected in the [crypto payments topic](/guides/topics/crypto-payments).

In the same cluster, see also [how to buy solana](/guides/how-to-buy-solana), [cash app bitcoin](/guides/cash-app-bitcoin), and [buy crypto with paypal](/guides/buy-crypto-with-paypal).`,
    },
  ],
  faqs: [
    {
      q: "What is the cheapest way to buy USDT?",
      a: "Usually a bank transfer into a large exchange, then a limit order on a USDT market, then a withdrawal on a low-fee network. Card purchases and wallet on-ramps are faster but typically cost several percent.",
    },
    {
      q: "Can I buy USDT without KYC?",
      a: "Regulated exchanges require identity verification before fiat deposits. Some peer-to-peer and swap routes need less, but they carry more scam risk, and the rules depend on your country.",
    },
    {
      q: "Which network should I choose when withdrawing USDT?",
      a: "The one the receiving wallet or service supports. Tron and Solana are cheap, Ethereum is widely supported but costlier. The network must match on both ends.",
    },
    {
      q: "Why do I need TRX or ETH to send my USDT?",
      a: "Network fees are paid in the chain's own coin. Once USDT is in your own wallet, you need a small amount of that coin to move it again.",
    },
    {
      q: "Is it safe to keep USDT on an exchange?",
      a: "It is convenient, but you rely on the exchange staying solvent and honest. For balances you will not trade soon, a self-custody wallet removes that risk, though the issuer can still freeze tokens.",
    },
    {
      q: "How long does it take to buy USDT?",
      a: "Verification can take minutes to days. After that, a card purchase is instant, a bank transfer can take from seconds to a few business days, and a withdrawal usually arrives within minutes.",
    },
  ],
  sources: [
    { label: "Tether: official site and supported protocols", url: "https://tether.to/en/" },
    {
      label: "Wikipedia: Tether (cryptocurrency)",
      url: "https://en.wikipedia.org/wiki/Tether_(cryptocurrency)",
    },
    {
      label: "US FTC: what to know about cryptocurrency and scams",
      url: "https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-and-scams",
    },
  ],
  related: [
    "what-is-tether",
    "erc20-vs-trc20",
    "usdt-casino",
    "how-to-buy-usdc",
    "how-to-buy-solana",
    "buy-crypto-with-paypal",
    "cash-app-bitcoin",
  ],
  updated: "2026-09-27",
};
