import type { Guide } from "./types";

export const guide: Guide = {
  slug: "buy-crypto-with-paypal",
  cluster: "Crypto payments",
  keyword: "buy crypto with paypal",
  secondary: [
    "paypal crypto",
    "pyusd",
    "paypal crypto transfer",
    "paypal crypto fees",
    "buy bitcoin with paypal",
  ],
  title: "Buy Crypto With PayPal: Coins, PYUSD, Fees, Transfers",
  description:
    "Buy crypto with PayPal: which coins are offered, how PYUSD works, what purchase fees and spreads cost, and how to transfer crypto out to your own wallet.",
  h1: "Buy crypto with PayPal: coins, PYUSD, fees and transfers",
  answer:
    "To buy crypto with PayPal, open the Crypto section of the PayPal app in a supported country, pick a coin such as bitcoin, ether or PayPal's own PYUSD stablecoin, and pay from your balance or linked bank. PayPal charges a purchase fee plus a spread. You can transfer supported coins to external wallets, but only on the networks PayPal lists for each coin.",
  facts: [
    "PayPal began offering crypto buying and selling to US users in late 2020, starting with bitcoin, ether, bitcoin cash and litecoin.",
    "Transfers of crypto to external wallets arrived in 2022; before that, crypto bought on PayPal could only be sold back inside PayPal.",
    "PYUSD is a dollar stablecoin launched in 2023 for PayPal and issued by Paxos Trust Company; it started on Ethereum and was later added to Solana.",
    "PayPal publishes a crypto fee schedule and adds a spread to the exchange rate, so the total cost is higher than the fee line alone.",
    "Each coin can only be sent on the networks PayPal supports for it; a mismatch with the receiving wallet can lose the funds.",
  ],
  sections: [
    {
      id: "how",
      title: "How PayPal crypto works",
      body: `PayPal acts as a broker. You do not trade on an order book; you ask PayPal for a price, and PayPal fills the order through regulated partners that hold the coins in custody. The crypto shows up in the Crypto section of your PayPal account.

### Where it is available

PayPal launched crypto for US customers first, then expanded to the United Kingdom and some other markets. Venmo, which PayPal owns, offers a similar feature in the US. Coverage and coin lists vary by country and change over time, so the Crypto tab in your own app is the reliable check. You must be an adult account holder, and PayPal asks for identity information before you can buy.

### Buying step by step

1. Open the PayPal app or website and go to **Crypto**.
2. Choose a coin and tap **Buy**.
3. Enter an amount in your currency. Small minimums apply.
4. Choose a funding source: PayPal balance, linked bank, or in some cases a debit card.
5. Review the **fee** and the **exchange rate** on the preview screen, then confirm.

The coin appears in your account at once. You can hold, sell, send to other PayPal users, or transfer it out.

### What PayPal is not

It is not a full exchange. There are no limit orders, no margin, and a short list of coins. If you want a wide menu or better prices on large buys, an exchange is the better tool. Buying with a debit or credit card on exchanges and on-ramps is covered separately in [buy crypto with card](/guides/buy-crypto-with-card).`,
    },
    {
      id: "fees",
      title: "PayPal crypto fees and the spread",
      body: `The cost has two layers.

- **Transaction fee.** PayPal publishes a schedule that charges a flat fee on very small purchases and a percentage that falls as the order gets larger. In the US, percentages on its published schedule have sat roughly in the 1.5–2.3% range. Check the current page for your country; schedules change.
- **Spread.** The rate PayPal quotes includes a margin above the market price. It is not listed separately, so you infer it by comparing the quote with a public price at the same moment.

Selling has a similar fee in the other direction.

### Worked example

You buy $200 of bitcoin. Suppose the fee is 2.0%, or $4.00, and the spread is 0.5%.

| Step | Calculation | Value |
| --- | --- | --- |
| Amount paid | | $200.00 |
| Fee | 2.0% × $200 | −$4.00 |
| Amount converted | | $196.00 |
| Spread | 0.5% × $196 | −$0.98 |
| Bitcoin received, at market value | | about $195.02 |

That is about 2.5% to get in. Selling later at similar rates costs another 2.5% or so, so a round trip on a flat market loses about 5%. These rates are illustrative. The point is that a broker's convenience has a price, and it is larger on small, frequent trades.

### Transfer-out fees

Sending crypto to an external wallet costs a network fee, which PayPal shows before you confirm. On bitcoin and Ethereum mainnet, that fee rises when the network is busy. Background on why is in [gas fees explained](/guides/gas-fees-explained).`,
    },
    {
      id: "pyusd",
      title: "PYUSD: PayPal's stablecoin",
      body: `PayPal USD (PYUSD) is a dollar stablecoin launched in August 2023. It is issued by Paxos Trust Company, a New York-regulated trust company, and backed by dollar deposits, short-term US Treasuries and similar cash equivalents. Paxos publishes monthly reserve reports.

### How it differs from other coins in PayPal

- **Price:** designed to stay at $1, so it avoids the volatility of bitcoin or ether.
- **Networks:** it launched as an ERC-20 token on Ethereum and was added to Solana in 2024; other networks have been announced since. Check the current list before transferring.
- **Use:** you can hold it, send it to other PayPal or Venmo users, pay some merchants, or transfer it to external wallets on supported networks.

### PYUSD versus USDC and USDT

PYUSD is regulated and transparently reported, but it has far less circulation and exchange support than the two market leaders. Many exchanges and apps do not accept it yet. If the destination only takes USDC, you will need to swap first. The broader landscape is in [what is a stablecoin](/guides/what-is-a-stablecoin), with issuer-specific pages on [what is USDC](/guides/what-is-usdc) and [what is Tether](/guides/what-is-tether).

### Worked example: moving $500 of PYUSD

You buy $500 of PYUSD in PayPal and transfer it to your own Solana wallet. The Solana network fee is a fraction of a cent. On arrival you hold 500 PYUSD. If you now need USDC on another chain, a swap and a bridge each cost something, so check whether buying the destination token directly would have been cheaper.`,
    },
    {
      id: "transfers",
      title: "Transferring crypto out of PayPal",
      body: `Transfers to external wallets were added in 2022. They let you move coins into [self-custody](/guides/self-custody-wallet) or to an exchange.

### Steps

1. In **Crypto**, choose the coin and tap **Send** or **Transfer**.
2. Choose an external address, then pick the **network** PayPal offers for that coin.
3. Paste the address from your wallet. Check the first and last several characters.
4. Review the amount, the network fee and any limits, then confirm.

### Networks matter

PayPal only sends each coin on the networks it lists. At the time of writing, ether goes out on Ethereum mainnet and PYUSD on the networks shown for it. PayPal does not send to every layer-2. If you paste a Base or Arbitrum address for an Ethereum mainnet withdrawal, the funds arrive on Ethereum mainnet at that address; your wallet can access them only if it also supports Ethereum mainnet, and you will need ETH there to move them. When the receiving service only watches one chain, a mismatch can mean the funds are effectively lost; see [sent crypto to the wrong network](/guides/sent-crypto-to-wrong-network).

### Limits and holds

PayPal applies purchase and transfer limits that depend on your account and verification level. New accounts, large amounts or unusual activity can trigger reviews. Plan larger moves in advance.

### Receiving crypto into PayPal

You can also receive supported coins from external wallets to a PayPal address for that coin and network. Only send the exact coin on the exact network shown.`,
    },
    {
      id: "elsewhere",
      title: "Using PayPal to fund an exchange or wallet",
      body: `Buying inside PayPal is one route. The other is to use PayPal as a **payment method** on a third-party platform. Some exchanges and wallet on-ramp providers accept PayPal as a funding source in certain countries, and a few wallets have offered PayPal as an in-app purchase option for US users. Availability changes, so check the platform's payment list for your region.

### Why you might do this

- **Wider choice of coins and networks.** The exchange may list the exact token and chain you need, such as USDC on Base, which PayPal itself does not send.
- **Better pricing on larger amounts.** Once funds are on an exchange, a limit order can beat a broker quote.
- **No second transfer.** You skip the step of sending crypto out of PayPal and paying a network fee.

### What to check first

1. **Fees on both sides.** The platform may charge a PayPal deposit fee, and PayPal may apply its own charges depending on the funding source behind your PayPal account.
2. **Withdrawal holds.** Some platforms hold crypto bought with reversible payment methods for a period before you can withdraw it, because card and wallet payments can be charged back.
3. **Account names.** Most platforms require that the PayPal account is in the same name as the exchange account.

### Worked comparison

To end up with $300 of USDC on Base:

| Route | Steps | Illustrative cost |
| --- | --- | --- |
| Buy ETH in PayPal, send to exchange, sell for USDC, withdraw on Base | Four | PayPal fee and spread about 2.5%, mainnet network fee, exchange fees; roughly $10–$15 |
| Fund an exchange with PayPal, buy USDC, withdraw on Base | Three | Deposit fee plus trading fee plus Base withdrawal; often a few dollars |

The numbers are illustrative. The principle holds: fewer conversions and fewer mainnet transfers mean lower cost.`,
    },
    {
      id: "security",
      title: "Security, scams and taxes",
      body: `### Account security

- Turn on two-step verification for your PayPal account.
- PayPal never asks for your password or one-time code by phone, email or text.
- Transfers of crypto out of PayPal are final. There is no buyer protection for crypto sent to an external wallet.

### Common scams around PayPal crypto

- **Fake support.** Callers or chat accounts claiming to be PayPal ask you to "verify" by sending crypto. Genuine support will not.
- **Marketplace overpayment.** A buyer "accidentally" overpays and asks for the difference back in crypto. The original payment later reverses.
- **Investment groups.** Promises of guaranteed crypto returns, often introduced through social media, are a well-known fraud pattern. The US Federal Trade Commission publishes a list of warning signs, linked in the sources below.

### Taxes

In many countries, selling, swapping or spending crypto is a taxable disposal. PayPal provides account statements and, in some markets, tax forms. Transfers to your own wallet are usually not disposals in themselves, but they break PayPal's record of your cost basis, so keep your own records. For gambling-specific tax questions, see [crypto gambling taxes](/guides/crypto-gambling-taxes).`,
    },
    {
      id: "pvp",
      title: "PayPal crypto and PVPspinArena",
      body: `PVPspinArena runs three player-vs-player games, [Jackpot](/), [Coinflip](/coinflip) and [Roulette](/roulette), with play in USDC or ETH on the Base network. Crypto from PayPal does not land on Base directly. A typical route is to transfer ETH or a stablecoin from PayPal to an exchange that supports Base, convert to USDC if needed, and withdraw on Base. The [how to buy USDC](/guides/how-to-buy-usdc) and [bridge to Base](/guides/bridge-to-base) guides cover those steps. PayPal also has its own terms on gambling-related payments, so read them before using it as part of any gaming route.

The payment route does not change the odds. A Coinflip is a 50/50 between two players; Purple and Silver return 32/33 before the win fee, about a 7.88% edge after it, and Green returns 14/33. Results come from committed seeds, and any settled round can be checked on [fairness](/fairness).

Gambling is 18+ or the legal age where you live. Set a budget before moving money and use the [responsible gambling](/responsible-gambling) tools if play stops being fun. The [crypto payments topic](/guides/topics/crypto-payments) collects the rest of the payment guides.

In the same cluster, see also [how to buy usdt](/guides/how-to-buy-usdt), [how to buy solana](/guides/how-to-buy-solana), and [cash app bitcoin](/guides/cash-app-bitcoin).`,
    },
  ],
  faqs: [
    {
      q: "Can I buy crypto with PayPal?",
      a: "Yes, in supported countries. Open the Crypto section of the app, choose a listed coin such as bitcoin, ether or PYUSD, and pay from your balance or linked bank. Fees and a spread apply.",
    },
    {
      q: "How much are PayPal crypto fees?",
      a: "PayPal publishes a schedule with a flat fee on small purchases and a percentage on larger ones, plus a spread in the quoted rate. Check the preview screen for the exact cost.",
    },
    {
      q: "Can I send crypto from PayPal to MetaMask?",
      a: "Yes for supported coins on supported networks, such as ETH on Ethereum mainnet. Copy the MetaMask address, pick the matching network in PayPal, and send a small test first.",
    },
    {
      q: "What is PYUSD?",
      a: "PayPal USD, a dollar stablecoin issued by Paxos Trust Company and launched in 2023. It is backed by dollar deposits and short-term Treasuries and runs on Ethereum, Solana and other networks.",
    },
    {
      q: "Is buying crypto on PayPal cheaper than an exchange?",
      a: "Usually not. PayPal's fees and spread are higher than a limit order on a large exchange. Its advantage is convenience, especially for small purchases.",
    },
  ],
  sources: [
    {
      label: "PayPal: cryptocurrency",
      url: "https://www.paypal.com/us/digital-wallet/manage-money/crypto",
    },
    { label: "Paxos: PayPal USD (PYUSD)", url: "https://paxos.com/pyusd/" },
    { label: "Wikipedia: PayPal", url: "https://en.wikipedia.org/wiki/PayPal" },
    {
      label: "US FTC: what to know about cryptocurrency and scams",
      url: "https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-and-scams",
    },
  ],
  related: [
    "buy-crypto-with-card",
    "cash-app-bitcoin",
    "how-to-buy-usdc",
    "what-is-a-stablecoin",
    "how-to-buy-usdt",
    "coinbase-to-metamask-transfer",
    "how-to-buy-solana",
  ],
  updated: "2026-09-27",
};
