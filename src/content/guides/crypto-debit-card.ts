import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-debit-card",
  cluster: "Crypto payments",
  keyword: "crypto debit card",
  secondary: [
    "crypto card",
    "bitcoin debit card",
    "spend crypto card",
    "crypto visa card",
    "self custody crypto card",
  ],
  title: "Crypto Debit Card: How Spending Crypto Really Works",
  description:
    "Crypto debit card guide: how cards convert crypto at checkout, custodial vs self-custody models, spreads and fees, tax on every spend, and issuer risk.",
  h1: "Crypto debit card: how spending crypto works, fees and risks",
  answer:
    "A crypto debit card lets you spend crypto anywhere Visa or Mastercard is accepted. The merchant still receives ordinary money: the card program sells your crypto, or a stablecoin balance, for local currency at the moment you pay. Costs hide in conversion spreads, FX and ATM fees. In many countries each spend also counts as selling crypto for tax, so a coffee can create a capital gain.",
  facts: [
    "Merchants never see crypto; the card network settles in fiat after the issuer converts your balance.",
    "Most cards are custodial: the balance sits with the card company, not in your own wallet.",
    "Self-custody cards exist that debit an on-chain wallet at payment time, usually in stablecoins.",
    "In the US, UK, Canada and Australia, spending crypto is generally a taxable disposal.",
    "Many card programs block gambling merchant codes such as MCC 7995.",
  ],
  sections: [
    {
      id: "what",
      title: "What a crypto debit card is and how a payment flows",
      body: `A crypto debit card looks and works like any bank card. The difference is what funds it. Instead of a bank balance, the card draws on crypto: bitcoin, ether, or more often a dollar [stablecoin](/guides/what-is-a-stablecoin) such as USDC.

This page is about **spending** crypto with a card. Using a normal bank card to **buy** crypto is the reverse flow, covered in [buy crypto with card](/guides/buy-crypto-with-card).

### A single tap, step by step

1. You tap the card at a shop for €20.
2. The card network (Visa or Mastercard) asks the issuer to authorise €20.
3. The issuer or program manager checks your crypto balance, sells enough of it at its quoted rate, and approves.
4. The merchant is paid €20 in euros through the normal settlement process, exactly as with any card.
5. Your app shows the crypto debited and the rate used.

Nothing about the checkout is crypto-native. The merchant pays normal card fees and cannot tell the difference. That is the appeal: crypto becomes spendable at tens of millions of card terminals without any merchant opting in.

### Who is actually involved

A single card usually involves several companies: a regulated **issuer** (often an e-money institution or bank) that holds the card licence, a **program manager** that runs the app, the **card network**, and a **crypto exchange or liquidity provider** doing the conversion. When a card stops working, the cause can sit with any of them, which is why programs sometimes end in one region while continuing elsewhere.`,
    },
    {
      id: "models",
      title: "Custodial, self-custody and prepaid top-up cards",
      body: `Crypto cards fall into three models, and the model matters more than the logo.

| Model | Where the crypto sits | Conversion time | Main risk |
| --- | --- | --- | --- |
| Custodial exchange card | Your exchange account | At payment | Exchange or issuer freezes, insolvency |
| Self-custody card | Your own on-chain wallet | At payment, via a smart contract or approval | Smart-contract and approval risk |
| Prepaid top-up card | Card balance in fiat | When you top up | Top-up fees, issuer risk |

### Custodial cards

Exchange cards are the most common. The card is a window onto your exchange balance; you pick which asset to spend first. Convenient, but you are trusting the company with the funds, which is the opposite of the [self-custody](/guides/self-custody-wallet) principle. Exchange cards often come with tiers, where better cashback requires holding or staking the exchange's own token, and those rewards can change or be cut.

### Self-custody cards

A newer model links a card to your own wallet. Gnosis Pay and the MetaMask Card are examples. You keep the keys; the card program is authorised to pull stablecoins from a designated account when you pay. You avoid exchange custody, but you must understand what the approval allows, and availability is usually limited by country. Treat any spending allowance like any other token approval and keep only a spending balance in that account; see [revoke token approvals](/guides/revoke-token-approvals).

### Prepaid top-up cards

Some cards simply let you convert crypto to fiat once, loading a regular prepaid balance. The conversion happens up front, so the tax event and the fee happen at top-up rather than at each purchase.

### Crypto credit cards are a different product

A crypto **credit** card is usually an ordinary credit line in fiat that pays rewards in bitcoin or another token. You are not spending crypto at all; you are borrowing money and receiving crypto as cashback. Interest, late fees and credit checks apply exactly as with any credit card. Some platforms have also offered loans secured by crypto collateral with a card attached, where a price drop can trigger a margin call or liquidation. Read which product you are applying for before comparing rewards.`,
    },
    {
      id: "costs",
      title: "What a crypto debit card really costs",
      body: `Crypto cards often advertise “no fees” while charging through the rate. Read the fee schedule for each of these.

| Cost | Typical form | Where to find it |
| --- | --- | --- |
| Conversion spread | Rate worse than market | Compare the rate in the app with a public price |
| FX fee | Percentage on foreign-currency spend | Fee schedule |
| ATM withdrawal | Free allowance, then a percentage or flat fee | Fee schedule |
| Card issuance or delivery | One-off | Order screen |
| Inactivity or monthly fee | Monthly | Terms |
| Top-up or network fee | Flat or gas-based | Deposit screen |

### Worked example

Say you spend $1,000 a month on a card funded with ETH. If the conversion spread is 1% and half your spending is abroad with a 2% FX fee, the monthly cost is about $10 + $10 = $20, or $240 a year. A card advertising 2% cashback in its own token would roughly offset that, but only if the token holds its value and the cashback tier does not change. These percentages are illustrative, not quotes from any specific card; the method is what matters.

Funding from a stablecoin removes the price move between top-up and spend, and usually narrows the spread, because the card is converting dollars to dollars or dollars to a major currency. Networks matter too: moving USDC on a layer 2 costs cents, while mainnet Ethereum can cost dollars, as the [gas fees guide](/guides/gas-fees-explained) explains.`,
    },
    {
      id: "tax",
      title: "Taxes: why every card swipe can be a sale",
      body: `In many countries, including the United States, the United Kingdom, Canada and Australia, tax authorities treat crypto as property or an asset rather than currency. Using it to pay for something is a **disposal**: you are treated as selling it at its market value at that moment. Rules differ in detail, so check your own jurisdiction or a tax professional.

### A worked gain

You bought 0.01 BTC for $300. Months later, bitcoin has doubled and you spend that 0.01 BTC on a $600 purchase with the card. For tax purposes you sold an asset with a $300 cost basis for $600: a $300 gain, even though you only bought a pair of shoes. If you had spent it after a fall, you might have a deductible loss instead.

### Why stablecoin cards are simpler

A stablecoin bought at $1 and spent at $1 produces little or no gain, but in several countries it is still a disposal that should be recorded. Hundreds of small card payments can create hundreds of rows in a tax report. Most card apps export transaction history; download it regularly, because programs can close and take the history with them.

### Rewards

Cashback paid in crypto may be treated as income, a rebate, or neither, depending on the country and how the program is structured. Do not assume it is tax-free. The [crypto gambling taxes guide](/guides/crypto-gambling-taxes) covers record-keeping habits that apply here too.`,
    },
    {
      id: "risks",
      title: "Issuer risk, freezes and merchant blocks",
      body: `### Issuer risk is real

In June 2020 the UK regulator restricted Wirecard Card Solutions after its German parent collapsed in an accounting scandal. Card programs that relied on it, including several crypto cards in Europe, stopped working temporarily while they moved to new issuers. Funds were generally recovered, but users could not spend for days or weeks. The lesson is that a card is only as reliable as the least visible company in its chain.

### Accounts can be frozen

Custodial cards run on full KYC and ongoing monitoring. Unusual patterns, sanctions screening or a missing document can freeze both the card and the underlying balance. Keep only a spending amount on the card account, not savings.

### Some merchants are blocked by design

Card programs choose which merchant category codes they allow. Gambling transactions use codes such as MCC 7995 (betting, including lottery tickets and casino chips), and many crypto cards decline them. Cash withdrawals and money transfers are also commonly restricted or charged extra.

### Scams wearing a card logo

“Crypto card” presales, cards that require buying a new token to activate, and support accounts asking for your seed phrase are common hooks. A real card never needs your recovery phrase. The [fake casino sites guide](/guides/fake-casino-sites) walks through the same phishing patterns in a gambling setting.`,
    },
    {
      id: "choose",
      title: "How to choose a crypto debit card",
      body: `Run through this list before ordering.

1. **Availability.** Is the card issued in your country, by which regulated issuer?
2. **Custody model.** Custodial exchange card, self-custody card or prepaid top-up?
3. **Funding asset.** Can you spend a stablecoin directly, or does it force a volatile asset?
4. **Real rate.** Compare the in-app conversion rate with a public price on a test purchase.
5. **Fee schedule.** FX, ATM, inactivity, issuance and top-up fees in writing.
6. **Rewards conditions.** Do rewards require locking a token, and can they be changed without notice?
7. **Export.** Can you download full transaction history for tax records?
8. **Blocks.** Which merchant categories are declined?
9. **Support and freezes.** How are disputes and chargebacks handled?

### A sensible setup

Treat the card like a travel wallet, not a bank. Keep a month's spending on it in a stablecoin, top up on a schedule, and keep savings in your own wallet or at a regulated bank. Turn on transaction notifications, lock the card in the app when you are not using it, and set the default spending asset explicitly so the app never sells a volatile coin you meant to hold. Download statements monthly for tax records.

If the answers are vague, the costs are usually in the vague parts. The [Crypto payments topic](/guides/topics/crypto-payments) links the stablecoin, network and wallet guides that sit on either side of a card.`,
    },
    {
      id: "pvp",
      title: "Crypto cards and PVPspinArena",
      body: `A crypto debit card is a tool for spending off-chain. PVPspinArena sits on the other side of the ledger: three player-vs-player games, Jackpot, [Coinflip](/coinflip) and [Roulette](/roulette), played from a wallet in USDC or ETH on the Base network. Cards and games do not need to touch, and keeping them apart is healthy. Winnings that stay in a wallet are visible and deliberate; card spending is everyday money.

The game maths is fixed regardless of how funds arrive. Roulette's 33-slot wheel pays 2x on Purple or Silver and 14x on Green, so Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Coinflip is a 50/50 between two players. Every settled round is checkable on [fairness](/fairness).

PVPspinArena is 18+. If you notice yourself moving everyday card money into play, the [responsible gambling](/responsible-gambling) page has limits and support.

In the same cluster, see also [how to buy usdt](/guides/how-to-buy-usdt), [how to buy solana](/guides/how-to-buy-solana), and [cash app bitcoin](/guides/cash-app-bitcoin).`,
    },
  ],
  faqs: [
    {
      q: "How does a crypto debit card work?",
      a: "When you pay, the card program sells enough of your crypto or stablecoin balance for local currency and the merchant is paid in fiat over Visa or Mastercard. The merchant never handles crypto.",
    },
    {
      q: "Do I pay tax when I use a crypto debit card?",
      a: "In many countries, yes. Spending crypto is usually treated as selling it, so a gain or loss arises on each purchase. Stablecoin spends produce little gain but may still need recording.",
    },
    {
      q: "Are crypto debit cards safe?",
      a: "They are as safe as the issuer, program manager and custody model behind them. Custodial cards can be frozen, and issuer failures have paused programs before. Keep only spending money on them.",
    },
    {
      q: "Is there a crypto debit card without KYC?",
      a: "Legitimate cards run on regulated card networks and require identity checks. Offers of anonymous crypto cards are frequently scams or short-lived programs that can freeze balances.",
    },
    {
      q: "Can I use a crypto debit card for gambling?",
      a: "Many card programs block gambling merchant codes such as MCC 7995, and cash withdrawals often carry fees. Check the terms, and keep gambling money separate from everyday spending.",
    },
  ],
  sources: [
    {
      label: "IRS: Frequently asked questions on virtual currency transactions",
      url: "https://www.irs.gov/individuals/international-taxpayers/frequently-asked-questions-on-virtual-currency-transactions",
    },
    { label: "Wikipedia: Debit card", url: "https://en.wikipedia.org/wiki/Debit_card" },
    {
      label: "Wikipedia: Merchant category code",
      url: "https://en.wikipedia.org/wiki/Merchant_category_code",
    },
  ],
  related: [
    "buy-crypto-with-paypal",
    "cash-app-bitcoin",
    "buy-crypto-with-card",
    "crypto-gambling-taxes",
    "stablecoin-payments-gambling",
    "what-is-a-stablecoin",
    "how-to-buy-usdt",
    "how-to-buy-solana",
  ],
  updated: "2026-09-27",
};
