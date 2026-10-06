import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-buy-solana",
  cluster: "Crypto payments",
  keyword: "how to buy solana",
  secondary: ["buy sol", "buy solana crypto", "solana wallet", "sol fees"],
  title: "How to Buy Solana (SOL): Exchanges, Wallets and Fees",
  description:
    "How to buy Solana: choose an exchange, buy SOL, move it to a wallet like Phantom or Solflare, and understand lamports, priority fees and account rent.",
  h1: "How to buy Solana: exchanges, wallets and SOL fees",
  answer:
    "Here is how to buy Solana: verify an account on an exchange that lists SOL in your country, deposit money by bank transfer or card, buy SOL, then withdraw it to a Solana wallet such as Phantom or Solflare. Send a small test first. Solana network fees are tiny, starting at 5,000 lamports (0.000005 SOL) per signature, but exchange spreads and withdrawal fees still matter.",
  facts: [
    "SOL is the native coin of the Solana blockchain; it pays transaction fees and can be staked to validators.",
    "One SOL equals one billion lamports, and the base fee is 5,000 lamports per signature, with optional priority fees on top.",
    "Solana addresses are base58 strings with no 0x prefix; they are not interchangeable with Ethereum or Base addresses.",
    "New token accounts on Solana need a small rent-exempt deposit, about 0.002 SOL, which is why wallets keep a little SOL back.",
    "The cheapest route for most buyers is a bank transfer into an exchange and a limit order, not a card purchase.",
  ],
  sections: [
    {
      id: "what",
      title: "What you are buying",
      body: `Solana is a proof-of-stake blockchain whose mainnet beta launched in 2020. Its native coin, SOL, does three jobs: it pays transaction fees, it is staked by holders to secure the network, and it is the base asset most Solana apps price things in. When people say "buy Solana", they mean buying SOL.

Two points shape how you buy it:

- **SOL is volatile.** Unlike a stablecoin, its price moves by several percent on ordinary days. If you want a dollar-stable balance on Solana, you would buy SOL for fees and a stablecoin for the balance.
- **Solana is its own ecosystem.** Its wallets, addresses and token standard (SPL tokens) differ from Ethereum's. A MetaMask address is not a Solana address unless the wallet explicitly supports Solana; see [does MetaMask support Solana](/guides/does-metamask-support-solana).

Using SOL at casinos is a separate topic, covered in [Solana casino](/guides/solana-casino). This page stays on buying, storing and fees.`,
    },
    {
      id: "where",
      title: "Where to buy SOL",
      body: `| Route | Payment | Cost | Notes |
| --- | --- | --- | --- |
| Exchange order book | Bank transfer | Lowest | Needs identity verification |
| Exchange quick-buy | Bank or card | Moderate to high | Spread is built into the quoted price |
| In-wallet purchase (Phantom, Solflare) | Card or local methods via a third-party provider | Highest | Lands straight in self-custody |
| Swap from another token | Crypto you already hold | Swap fee plus slippage | Needs the other token on Solana or a bridge |

Most large global exchanges list SOL, but availability of specific deposit methods varies by country. Check that the exchange is permitted where you live, supports your currency, and supports **withdrawals on the Solana network**; a few platforms let you buy SOL without letting you withdraw it.

### Step by step on an exchange

1. Create and verify the account, then enable app-based two-factor authentication.
2. Deposit local currency. Bank transfers are usually cheapest; cards post instantly at a higher fee.
3. Open the SOL market for your currency, or a SOL/USDC or SOL/USDT pair.
4. Place a limit order near the best price to avoid paying the spread on a market order.
5. Decide whether to keep SOL on the exchange or withdraw it to your own wallet.

If you only have a card, compare the final amount of SOL you receive across providers; [buy crypto with card](/guides/buy-crypto-with-card) explains why the headline fee rarely tells the full story.`,
    },
    {
      id: "wallets",
      title: "Choosing a Solana wallet",
      body: `A wallet holds the keys that control your SOL. The popular self-custody options are browser extensions and mobile apps.

| Wallet type | Examples | Strengths | Trade-offs |
| --- | --- | --- | --- |
| Software wallet | Phantom, Solflare, Backpack | Free, dapp support, built-in staking and swaps | Keys live on an internet-connected device |
| Hardware wallet | Ledger with a Solana app | Keys stay on a separate device | Costs money, slower to use |
| Exchange account | Any exchange | Easy, no key management | The exchange holds your coins |

Phantom is the best-known Solana wallet and now supports other chains too; its setup and seed-phrase handling are covered in [Phantom wallet](/guides/phantom-wallet-gambling). Whatever you choose, the recovery phrase is the wallet. Write it down offline, never enter it into a website, and read [seed phrase](/guides/seed-phrase) if you have not handled one before.

### Withdrawing from the exchange

1. In the wallet, copy your receiving address. It is a base58 string of roughly 32–44 characters.
2. On the exchange, choose SOL and the **Solana** network.
3. Paste the address and check the first and last several characters.
4. Send a small amount first. Solana usually confirms in seconds, so the test barely slows you down.
5. Send the rest once the test shows up.

Some exchanges ask for a "memo" on Solana deposits into their own accounts. A personal wallet does not need one; an exchange deposit often does.`,
    },
    {
      id: "fees",
      title: "Solana fees: lamports, priority fees and rent",
      body: `Solana fees are small, but they work differently from Ethereum gas.

### Base fee

Each transaction pays 5,000 lamports per signature. With one signature that is 0.000005 SOL. At an illustrative SOL price of $150, that is $0.00075, well under a tenth of a cent.

### Priority fees

When the network is busy, wallets add an optional priority fee priced in micro-lamports per compute unit. A transaction using 200,000 compute units at 10,000 micro-lamports per unit adds 2,000,000,000 micro-lamports, or 2,000 lamports. The total is still a fraction of a cent. During popular token launches, priority fees can rise far higher, and a wallet may suggest several cents or more.

### Rent-exempt deposits

Solana charges for storing data. To hold a new SPL token such as USDC, your wallet creates a token account, and that account must hold a rent-exempt minimum of about 0.002 SOL. You get it back if you close the account later. This is why sending your entire SOL balance out can fail, and why wallets keep a small amount back.

### Exchange withdrawal fees

The exchange usually charges a flat SOL fee to withdraw, often larger than the actual network fee. Worked example:

| Item | Amount |
| --- | --- |
| Buy $300 of SOL at 0.3% trading fee | $0.90 |
| Exchange withdrawal fee (illustrative 0.01 SOL at $150) | $1.50 |
| Network fee paid by the exchange | Included |
| **Total** | **$2.40** |

The network is cheap; the platform charges are what add up. Compare this with account-based EVM gas in [gas fees explained](/guides/gas-fees-explained).`,
    },
    {
      id: "timing",
      title: "Pricing, order types and buying in stages",
      body: `Because SOL moves a lot, how you place the order matters more than it does for a stablecoin.

### Market orders versus limit orders

A market order fills immediately against the best offers on the book. On a liquid SOL pair the slippage is small for a few hundred dollars, but it grows with size and with thin local-currency markets. A limit order names your price and waits. The trade-off is simple: a market order guarantees the fill, a limit order guarantees the price.

Worked example: the book shows the best offer at $150.00 and the next levels at $150.20 and $150.50. A market order for 10 SOL that clears all three levels in equal parts pays an average of about $150.23, or $2.33 more than 10 × $150.00. A limit at $150.00 pays exactly $1,500 if it fills, and nothing if the price runs away.

### Quick-buy spreads

Simple "buy" screens usually quote a single price that already includes a spread. Compare it with the order-book price on the same exchange. A 1.5% spread on $1,000 is $15, often more than the visible fee.

### Buying in stages

Some buyers split a purchase into equal amounts over several weeks, a practice usually called dollar-cost averaging. It does not raise the expected return. It reduces the chance of buying the whole amount at a short-term peak, and it lowers regret. Recurring-buy features on exchanges automate it, but each purchase pays its own fee, so very small recurring buys can be costly.

### Checking the price you paid

After the trade, open the order history and note the average fill price and the fee in SOL or in your currency. Those two numbers are your cost basis, which you will need if you later sell, swap or report taxes.`,
    },
    {
      id: "risks",
      title: "Risks to understand before you buy",
      body: `- **Price volatility.** SOL can fall 20% or more in a week. Buy only what you are willing to see drop.
- **Network outages.** Solana has had several block-production halts in its history, most in 2021–2022, during which transfers stalled until validators restarted the chain. Funds were not lost, but they could not move.
- **Scam tokens and drainer sites.** Unsolicited tokens and NFTs often link to sites that ask you to sign a transaction that empties the wallet. Read what you sign, and treat free tokens as bait.
- **Wrong network.** Sending SOL to an Ethereum-style address, or USDC on Solana to a Base address, will not work. [Sent crypto to the wrong network](/guides/sent-crypto-to-wrong-network) explains the recovery odds.
- **Taxes.** In many countries, swapping or selling SOL is a taxable event. Keep records of what you paid.

### Staking

Most wallets let you stake SOL to a validator for a variable yield. Staked SOL takes time to unlock, typically until the end of an epoch of roughly two days, and a poorly run validator earns less. Staking is optional and has nothing to do with buying.`,
    },
    {
      id: "pvp",
      title: "SOL and PVPspinArena",
      body: `PVPspinArena runs three player-vs-player games, [Jackpot](/), [Coinflip](/coinflip) and [Roulette](/roulette), with play in USDC or ETH on the Base network, not on Solana. If you hold SOL, the practical route is to sell or swap it for USDC on an exchange and withdraw that USDC on Base; [how to buy USDC](/guides/how-to-buy-usdc) covers the Base withdrawal. Moving value between chains yourself is possible through a bridge, with extra steps and risks explained in [crypto bridge](/guides/crypto-bridge).

The coin you start with does not change the games. A Coinflip is a 50/50, and Purple and Silver return 32/33 before the win fee, about a 7.88% edge after it, and Green returns 14/33. Results come from committed seeds, and you can check any settled round on [fairness](/fairness).

Gambling is 18+ or the legal age where you live. Set a budget in dollars before converting a volatile coin, and use the [responsible gambling](/responsible-gambling) tools if you need a break. More wallet and network guides live in the [crypto payments topic](/guides/topics/crypto-payments).

In the same cluster, see also [how to buy usdt](/guides/how-to-buy-usdt), [cash app bitcoin](/guides/cash-app-bitcoin), and [buy crypto with paypal](/guides/buy-crypto-with-paypal).`,
    },
  ],
  faqs: [
    {
      q: "What is the easiest way to buy Solana?",
      a: "An exchange quick-buy or an in-wallet purchase in Phantom or Solflare is easiest. A bank transfer into an exchange with a limit order is usually cheapest.",
    },
    {
      q: "How much does it cost to send SOL?",
      a: "The base network fee is 5,000 lamports, or 0.000005 SOL, per signature. Priority fees add a little when the network is busy. Exchange withdrawal fees are usually the bigger cost.",
    },
    {
      q: "Can I keep SOL in MetaMask?",
      a: "Only if your MetaMask version supports Solana accounts. Otherwise use a Solana wallet such as Phantom or Solflare. Solana and Ethereum addresses are not interchangeable.",
    },
    {
      q: "Why can't I send my whole SOL balance?",
      a: "Wallets keep enough SOL for the fee and for rent-exempt minimums on accounts. Token accounts hold about 0.002 SOL each, which you recover if you close them.",
    },
    {
      q: "Is buying Solana with a card a good idea?",
      a: "It works and is fast, but card purchases and in-wallet on-ramps usually cost several percent more than a bank transfer into an exchange. Compare the final amount of SOL you receive.",
    },
    {
      q: "Do I need a memo when sending SOL?",
      a: "Not to a personal wallet. Some exchanges require a memo or tag for deposits so they can credit the right account. Follow the deposit screen exactly.",
    },
  ],
  sources: [
    { label: "Solana docs: transaction fees", url: "https://solana.com/docs/core/fees" },
    {
      label: "Wikipedia: Solana (blockchain platform)",
      url: "https://en.wikipedia.org/wiki/Solana_(blockchain_platform)",
    },
    { label: "Phantom wallet", url: "https://phantom.com/" },
  ],
  related: [
    "solana-casino",
    "phantom-wallet-gambling",
    "does-metamask-support-solana",
    "how-to-buy-usdt",
    "cash-app-bitcoin",
    "self-custody-wallet",
    "buy-crypto-with-paypal",
  ],
  updated: "2026-09-27",
};
