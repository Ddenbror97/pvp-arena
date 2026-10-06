import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cash-app-bitcoin",
  cluster: "Crypto payments",
  keyword: "cash app bitcoin",
  secondary: [
    "buy bitcoin on cash app",
    "cash app bitcoin withdrawal",
    "cash app bitcoin fees",
    "cash app lightning",
  ],
  title: "Cash App Bitcoin: Buying, Sending, Fees and Limits",
  description:
    "Cash App bitcoin explained: how to buy BTC, send it on-chain or over Lightning, withdraw to your own wallet, and what fees, limits and verification apply.",
  h1: "Cash App bitcoin: buy, send, withdraw, fees and limits",
  answer:
    "Cash App bitcoin lets eligible US users buy and sell BTC inside Cash App, send it to other Cash App users, and withdraw it to an outside wallet on-chain or over the Lightning Network. Buying is simple, but the price includes a fee and spread shown before you confirm. Withdrawals need identity verification and are subject to rolling limits set in the app.",
  facts: [
    "Cash App is run by Block, Inc. and supports one cryptocurrency: bitcoin.",
    "Every purchase or sale shows a fee before confirmation; Cash App says the fee varies with market conditions, so compare the final amount rather than a headline rate.",
    "You can withdraw bitcoin to an external address on-chain, with a free standard speed and faster paid options, or pay Lightning invoices.",
    "Withdrawing and depositing bitcoin requires identity verification, and the app applies daily and weekly withdrawal limits.",
    "Bitcoin sent on-chain cannot be reversed; a wrong address or wrong network is usually permanent.",
  ],
  sections: [
    {
      id: "what",
      title: "What Cash App bitcoin is",
      body: `Cash App started as a peer-to-peer payments app and added bitcoin trading in 2018. It sits inside the same app as your cash balance, debit card and direct deposits, which is the main attraction: you can move from dollars to bitcoin in a few taps without opening an exchange account.

What you get:

- **Buy and sell** bitcoin against your Cash App dollar balance or linked debit card.
- **Send** bitcoin to other Cash App users by $Cashtag, which settles inside Cash App.
- **Withdraw** to any external bitcoin address, on-chain.
- **Receive** bitcoin from outside wallets to your Cash App bitcoin address.
- **Lightning**: pay and receive Lightning invoices for small, fast payments.
- **Auto Invest**: recurring purchases on a schedule.

What you do not get: other coins, limit orders, or a traditional order book. Cash App is a broker that quotes you a price. It is a convenient on-ramp, not a trading venue. For how bitcoin itself moves between wallets, [how to send crypto](/guides/how-to-send-crypto) covers the basics.

### Who can use it

Bitcoin features are offered to eligible users in the United States who are adults and pass Cash App's identity checks. Availability and features change, so treat the app itself as the final word for your account.`,
    },
    {
      id: "buy",
      title: "How to buy bitcoin on Cash App",
      body: `1. Open the **Money** tab (labelled differently in some versions) and choose **Bitcoin**.
2. Tap **Buy**, choose an amount, or type a custom figure. Small purchases of a dollar or so are allowed.
3. Review the confirmation screen. It shows the bitcoin amount, the exchange rate and the fee.
4. Confirm with your PIN or biometrics.

The bitcoin appears in your Cash App balance immediately. It is held by Cash App on your behalf until you withdraw it.

### Understanding the cost

Cash App's total cost has two layers: a service fee and a spread between the price you pay and the market price. Cash App says both depend on market activity, so the same $100 purchase can cost slightly different amounts on different days.

Worked example with illustrative numbers: you buy $100 of bitcoin, and the confirmation shows a $1.75 fee. You receive $98.25 worth of bitcoin at Cash App's quoted rate. If the quoted rate is also 0.5% above the market price, you effectively receive about $97.76 of bitcoin at market value, a total cost near 2.2%. Selling later carries a similar cost in the other direction, so a round trip on a flat market loses roughly 4%. Always read the confirmation screen; the figures here are only to show the arithmetic.

### Auto Invest

Recurring buys spread purchases over time. They do not lower the fee per trade, and very small daily buys can carry a higher percentage cost than one larger buy.`,
    },
    {
      id: "withdraw",
      title: "Withdrawing bitcoin to your own wallet",
      body: `Withdrawing moves bitcoin out of Cash App's custody and into a wallet where you hold the keys. That is the main reason to do it: an exchange or app can freeze, pause or lose access to accounts, while [self-custody](/guides/self-custody-wallet) puts control in your hands.

### Steps

1. Create a bitcoin wallet and back up its recovery phrase offline; see [seed phrase](/guides/seed-phrase).
2. Copy a **bitcoin** receiving address from the wallet. It usually starts with bc1, 1 or 3.
3. In Cash App, open Bitcoin, choose **Send** or **Withdraw**, and paste or scan the address.
4. Choose the speed. Standard is free but slower; faster options charge a fee.
5. Confirm, then track the transaction on a block explorer.

### Speed and confirmations

On-chain transactions wait in the mempool until a miner includes them in a block, roughly every ten minutes on average. A standard Cash App withdrawal may be batched with others, so it can take longer than a normal wallet send. Most receiving services wait for one or more confirmations before crediting; [blockchain confirmations](/guides/blockchain-confirmations) explains why. If a transfer sits unconfirmed for hours, [stuck crypto transaction](/guides/stuck-crypto-transaction) covers the options.

### Lightning withdrawals

For small amounts, Lightning is faster and cheaper: you paste a Lightning invoice, and payment settles in seconds. The receiving wallet must support Lightning. Lightning suits payments of tens or hundreds of dollars, not moving life savings.

### The costly mistake

Do not paste an address for another coin. Bitcoin Cash, Litecoin and some other networks use address formats that look similar to bitcoin's legacy formats. A transfer to the wrong network is normally unrecoverable.`,
    },
    {
      id: "limits",
      title: "Verification, limits and deposits",
      body: `### Verification

To withdraw or deposit bitcoin, Cash App asks you to verify your identity with your legal name, date of birth, the last four or full digits of your Social Security number, and sometimes a photo ID. This is part of US anti-money-laundering rules for money transmitters.

### Limits

Cash App applies rolling limits to bitcoin purchases and to bitcoin withdrawals, measured over 24 hours and over seven days. Its help pages have listed withdrawal caps of around $2,000 per day and $5,000 per week for verified accounts, but limits vary by account and change over time. Check the limits screen in your app before planning a large transfer. Splitting a large withdrawal across days to fit the caps is common and expected.

### Depositing bitcoin into Cash App

You can receive bitcoin from outside wallets to your Cash App bitcoin address, or via a Lightning invoice. On-chain deposits credit after the network confirms them. Only send bitcoin (BTC) on the bitcoin network. Tokens on other chains, including wrapped bitcoin on Ethereum or Base, cannot be received.

| Action | Needs verification | Typical speed | Cost |
| --- | --- | --- | --- |
| Buy with cash balance | Yes, for most users | Instant | Fee and spread shown in app |
| Send to a $Cashtag | Yes | Instant | Free inside Cash App |
| Withdraw on-chain, standard | Yes | Minutes to hours | Free |
| Withdraw on-chain, faster | Yes | Next block or so | Fee shown in app |
| Lightning payment | Yes | Seconds | Small or none |`,
    },
    {
      id: "fees-taxes",
      title: "Network fees, selling and taxes",
      body: `### Network fees

Bitcoin miners charge fees measured in satoshis per virtual byte. When the mempool is quiet, a simple transaction costs cents; during congestion, it can cost several dollars or more. Cash App's free standard withdrawal absorbs this by batching; its faster options pass some cost on. The mechanics of fee rates and speed-ups are explained in [bitcoin fees](/guides/bitcoin-fees).

### Selling back to dollars

Selling works like buying in reverse: choose **Sell**, confirm the amount and fee, and dollars land in your Cash App balance. You can then cash out to a bank, with standard transfers free and instant transfers charging a fee.

### Taxes

In the US, selling bitcoin, or spending it, is a taxable disposal. Cash App issues tax forms for bitcoin sales, but you are responsible for cost basis on bitcoin you received from elsewhere or moved between wallets. Gambling winnings are a separate category; [crypto gambling taxes](/guides/crypto-gambling-taxes) covers that side.

### Account security

- Use a strong PIN and turn on the security lock for payments.
- Cash App staff will never ask for your PIN or sign-in code.
- Scammers often pose as support or promise to "double" bitcoin you send. Any request to send bitcoin to unlock a prize is a scam.`,
    },
    {
      id: "compare",
      title: "Cash App compared with an exchange",
      body: `Cash App wins on convenience. An exchange usually wins on price and choice. The right answer depends on how much you buy and what you do with it next.

| Factor | Cash App | Typical exchange |
| --- | --- | --- |
| Setup | Already in the app you use for payments | Separate account and verification |
| Coins | Bitcoin only | Many coins and stablecoins |
| Order types | Quoted price only | Market and limit orders |
| Cost on small buys | Fee plus spread, can be a few percent | Often lower with limit orders |
| Withdrawal networks | Bitcoin on-chain and Lightning | Many chains, including Base on some exchanges |
| Custody | Cash App holds it until you withdraw | The exchange holds it until you withdraw |

### Worked comparison

Suppose you want $1,000 of bitcoin and you plan to hold it in your own wallet.

- **Cash App:** say a 1.5% combined fee and spread, then a free standard withdrawal. Cost about $15.
- **Exchange with a limit order:** say a 0.25% trading fee and a flat withdrawal fee of about $3. Cost about $5.50.

The $9.50 difference is the price of convenience on this one purchase. On a $50 buy the gap is cents, and Cash App's simplicity may be worth it. On repeated large buys, the gap compounds. These percentages are illustrative; check the live figures on each platform before deciding.

### When Cash App makes sense

- You already get paid into Cash App and want a small bitcoin allocation.
- You want Lightning payments without setting up a separate Lightning wallet.
- You are buying modest amounts and value the single app over saving a few dollars.

### When an exchange makes sense

- You want coins other than bitcoin, or stablecoins such as USDC.
- You need to withdraw to a specific network, such as Base.
- You are buying large amounts often enough that a percentage point matters.`,
    },
    {
      id: "pvp",
      title: "Cash App bitcoin and PVPspinArena",
      body: `PVPspinArena runs three player-vs-player games, [Jackpot](/), [Coinflip](/coinflip) and [Roulette](/roulette), with play in USDC or ETH on the Base network. Bitcoin from Cash App cannot be sent directly to a Base address. The workable route is to withdraw bitcoin to an exchange that supports Base, sell it for USDC, and withdraw the USDC on Base. [How to buy USDC](/guides/how-to-buy-usdc) walks through that last step. Casinos that take bitcoin directly are covered in [bitcoin casino](/guides/bitcoin-casino), and fast small payments in [Lightning network casino](/guides/lightning-network-gambling).

Payment apps also set their own rules on gambling transactions, so read Cash App's terms before routing money from it to any gaming site.

Converting coins does not change the odds. A Coinflip is a 50/50 between two players, and Purple and Silver return 32/33 before the win fee, about a 7.88% edge after it, and Green returns 14/33. Every settled round can be verified on [fairness](/fairness). Gambling is 18+ or your local legal age, and the [responsible gambling](/responsible-gambling) page has limits and support links. More payment guides are in the [crypto payments topic](/guides/topics/crypto-payments).

In the same cluster, see also [how to buy usdt](/guides/how-to-buy-usdt), [how to buy solana](/guides/how-to-buy-solana), and [buy crypto with paypal](/guides/buy-crypto-with-paypal).`,
    },
  ],
  faqs: [
    {
      q: "How much does Cash App charge to buy bitcoin?",
      a: "Cash App shows a fee and an exchange rate before you confirm. The fee varies with market conditions, and the rate includes a spread. Compare the bitcoin amount you receive rather than the fee line alone.",
    },
    {
      q: "Can I withdraw bitcoin from Cash App to another wallet?",
      a: "Yes. After identity verification you can send bitcoin on-chain to an external address, choosing a free standard speed or a faster paid option, or pay a Lightning invoice.",
    },
    {
      q: "What is the Cash App bitcoin withdrawal limit?",
      a: "Cash App sets rolling daily and weekly caps. Its help pages have listed around $2,000 per day and $5,000 per week for verified users, but check the limits screen in your app.",
    },
    {
      q: "Why is my Cash App bitcoin withdrawal pending?",
      a: "Standard withdrawals can be batched and then wait for miners to confirm them. Check the transaction ID on a block explorer; high network fees can slow confirmation.",
    },
    {
      q: "Does Cash App support other cryptocurrencies?",
      a: "No. Cash App supports bitcoin only. Other coins or tokens sent to your Cash App bitcoin address, including wrapped bitcoin on other chains, will not be credited.",
    },
  ],
  sources: [
    { label: "Cash App: bitcoin", url: "https://cash.app/bitcoin" },
    { label: "Wikipedia: Cash App", url: "https://en.wikipedia.org/wiki/Cash_App" },
    {
      label: "Wikipedia: Lightning Network",
      url: "https://en.wikipedia.org/wiki/Lightning_Network",
    },
  ],
  related: [
    "bitcoin-fees",
    "bitcoin-casino",
    "lightning-network-gambling",
    "buy-crypto-with-paypal",
    "blockchain-confirmations",
    "self-custody-wallet",
    "how-to-buy-usdt",
    "how-to-buy-solana",
  ],
  updated: "2026-09-27",
};
