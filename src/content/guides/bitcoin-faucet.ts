import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bitcoin-faucet",
  cluster: "Crypto payments",
  keyword: "bitcoin faucet",
  secondary: ["crypto faucet", "btc faucet", "free bitcoin faucet", "testnet faucet"],
  title: "Bitcoin Faucet: What Faucets Pay and How Scams Work",
  description:
    "Bitcoin faucet guide: where faucets came from, what a crypto faucet really pays per hour, why withdrawals stall, and the scams that hide behind free coins.",
  h1: "Bitcoin faucet explained: history, real earnings and common scams",
  answer:
    "A bitcoin faucet is a website or app that gives away tiny amounts of bitcoin, usually a few satoshis, for completing captchas, watching ads or waiting on a timer. The first one, in 2010, gave away 5 BTC per visitor to spread the word. Today faucets pay fractions of a cent per claim, funded by advertising. Many are low-value time sinks, and some are fronts for gambling, malware or deposit scams.",
  facts: [
    "Gavin Andresen ran the first well-known bitcoin faucet in 2010, giving away 5 BTC per visitor.",
    "One satoshi is 0.00000001 BTC; faucets usually pay tens to hundreds of satoshis per claim.",
    "Faucets earn from ads and referrals; your attention is the product being sold.",
    "Withdrawal minimums and on-chain fees often exceed what a casual user can earn.",
    "Testnet faucets hand out valueless test coins for developers and are a legitimate, different tool.",
  ],
  sections: [
    {
      id: "what",
      title: "What a bitcoin faucet is and where the idea came from",
      body: `The name is literal: a faucet drips coins. In 2010, when bitcoin was worth very little and few people had any, developer Gavin Andresen set up a site that gave each visitor 5 BTC to encourage people to try the software. It worked as a promotion, and the name stuck.

Once bitcoin gained a market price, giving away whole coins became impossible. Faucets shifted to paying **satoshis**, the smallest unit (0.00000001 BTC), and to funding themselves with advertising. A modern crypto faucet typically works like this:

1. You visit the site and solve a captcha, watch an ad, or complete a short task.
2. The site credits a small number of satoshis or other tokens to an internal balance.
3. A timer makes you wait, often from a few minutes to an hour, before the next claim.
4. Once the balance passes a withdrawal minimum, you can request a payout to a wallet or a partner service.

### Why they exist

The operator is selling your attention. Every claim shows ads, and many faucets add referral programs, offer walls (install an app, sign up for a service) and on-site games. If the ad revenue per visitor is higher than the satoshis paid out, the faucet is profitable. The design goal is to keep you returning, not to pay you well.

### Crypto faucets beyond bitcoin

The same model exists for litecoin, dogecoin and many tokens; the umbrella term is **crypto faucet**. Some newer projects run faucets as marketing to seed a token's holder count. The economics are the same: tiny payouts in exchange for time and data.`,
    },
    {
      id: "earnings",
      title: "What a bitcoin faucet really pays",
      body: `The honest way to evaluate a faucet is an hourly rate. Suppose a faucet pays 50 satoshis per claim with a one-hour timer, and you claim every hour for eight hours a day.

- Per day: 8 × 50 = 400 satoshis.
- Per 30 days: 12,000 satoshis, or 0.00012 BTC.

At an illustrative price of $100,000 per BTC, one satoshi is worth $0.001, so 12,000 satoshis is about $12 for a month of hourly claims. At lower prices it is proportionally less. Even on generous assumptions, the time spent works out to cents per hour.

### The withdrawal wall

Faucets typically hold your earnings until you hit a minimum. Sending bitcoin on-chain costs a network fee paid in satoshis per virtual byte, and at busy times that fee can be larger than a month of faucet earnings. Some faucets route payouts through the Lightning Network or a custodial micro-wallet to avoid this; the [Lightning guide](/guides/lightning-network-gambling) explains how off-chain payments make tiny amounts movable, and [bitcoin fees](/guides/bitcoin-fees) covers why small on-chain amounts can be uneconomic.

### Comparison with alternatives

| Method | Typical effort | Realistic return |
| --- | --- | --- |
| Faucet claims | Captchas and ads, all day | Cents per hour |
| Buying a small amount | Minutes | Whatever you pay, minus fees |
| Earning in your normal job | Normal work | Your hourly wage |

For almost everyone, working an extra hour and buying a small amount of bitcoin beats a month of faucet claims. Faucets can still be a harmless way to get a first few satoshis to learn how a wallet receives funds, as long as you treat them as a lesson rather than income.`,
    },
    {
      id: "ecosystem",
      title: "Rotators, micro-wallets and the hidden costs",
      body: `Faucets rarely operate alone. A small ecosystem grew around them, and each piece changes what you actually get.

### Rotators and faucet lists

A **rotator** is a site that links to dozens of faucets in sequence so users can claim from one after another. Rotators earn their own ad revenue and referral commissions from every faucet on the list. Being on a rotator says nothing about whether a faucet pays; some lists include sites that stopped paying long ago.

### Micro-wallets

On-chain fees make paying 50 satoshis directly impossible, so many faucets pay into a **micro-wallet**: a third-party custodial service that pools tiny balances from many faucets until the user withdraws. That solves fees but adds custody risk. If the micro-wallet closes, is hacked or freezes accounts, balances disappear. Several micro-wallet services have shut down over the years, taking users' small balances with them. Treat any balance there as unconfirmed until it reaches a wallet you control, as explained in the [self-custody wallet guide](/guides/self-custody-wallet).

### Paid-to-click and offer walls

Many faucet sites blend in paid-to-click ads, surveys and app-install offers. Offers pay more satoshis, but they collect personal data, sign you up for services or install apps you then need to remove. The satoshi reward is the price of that data.

### Privacy and tax

Faucets typically log your IP address, device fingerprint and email, and the payout address links that identity to your wallet history on a public chain. Using a fresh receive address helps. In some countries, crypto received for doing tasks can count as income, even when the amounts are tiny; if you claim regularly, keep a simple record.

### Time is the real cost

If you value your time at even a low hourly wage, the opportunity cost of claiming dwarfs the payout. That is the clearest sign that the faucet, not the user, captures most of the value.`,
    },
    {
      id: "scams",
      title: "Faucet scams and red flags",
      body: `Because faucets attract people looking for free money, they attract scams. The patterns repeat.

### Deposit to withdraw

The site shows a large “earned” balance and then asks you to send a small deposit to “activate” or “unlock” withdrawals. The balance is fictional. The deposit is the product.

### Fake mining and cloud mining upsells

Some faucets present a “miner” in the browser that appears to generate coins faster, then sell upgrades. Browser mining of bitcoin is not economically viable on ordinary hardware, and cloud-mining upsells tied to faucets are a well-known fraud pattern.

### Malware and extensions

Downloads that promise automatic claiming, faucet bots or “earn while you sleep” tools are a common route for clipboard hijackers and wallet stealers. A faucet never needs you to install anything to pay you.

### Seed phrase and wallet connection requests

A faucet only needs a receive address. Any site asking for your recovery phrase or requesting a wallet signature that grants token approvals is attempting theft. The [seed phrase guide](/guides/seed-phrase) and [revoke token approvals](/guides/revoke-token-approvals) cover the defences.

### Red-flag checklist

- Earnings that are far higher than other faucets advertise.
- Withdrawal minimums that move every time you get close.
- Requirements to deposit, buy a token or pay a fee to withdraw.
- Anonymous operators, recent domains and aggressive referral pressure.
- Mandatory app installs or browser extensions.

If a faucet shows any two of these, leave. The broader patterns are in the [fake casino sites guide](/guides/fake-casino-sites).`,
    },
    {
      id: "gambling",
      title: "Faucets, dice and the gambling hook",
      body: `Many bitcoin faucets include a built-in game: roll a number, multiply your faucet balance, or claim a “lucky” bonus. This is not an accident. A faucet balance is small and slow; a dice game offers the chance to make it bigger quickly. That turns a free drip into practice at gambling.

The maths of those games is the same as any house-edge game. If a faucet dice game pays 1.98x on a roll that wins 50% of the time, the expected return is 0.5 × 1.98 = 0.99, a 1% edge. Over enough rolls the balance trends down by roughly that share of the total wagered. Wagering the same 400 satoshis back and forth a hundred times puts 40,000 satoshis through the game, and a 1% edge on that turnover is about 400 satoshis, the whole day's claims.

### Why this matters

Faucet users are often new to crypto and sometimes young. Some faucet games have no age gate. Money gambling is for adults only, 18+ or the local legal age, and a faucet game that feels like free play still builds the habit of chasing a multiplier. The [crypto dice game guide](/guides/crypto-dice-game) explains dice edges in more detail, and [house edge](/guides/house-edge) explains why turnover, not the single bet, drives losses.

### “No-deposit” promotions

Casino no-deposit offers work on a similar logic: a small free balance with wagering requirements designed to keep you playing. The [no deposit bonus guide](/guides/no-deposit-bonus-casino) covers how those terms usually play out.`,
    },
    {
      id: "testnet",
      title: "Testnet faucets: the legitimate kind",
      body: `There is a second, entirely different use of the word. Developers testing software need coins on **test networks** such as Bitcoin testnet or signet, or Ethereum's Sepolia and Base Sepolia. Test coins have no market value by design, so there is nothing to buy. Testnet faucets hand them out free so that developers can deploy contracts and send transactions without risking real money.

| | Mainnet faucet | Testnet faucet |
| --- | --- | --- |
| Coins | Real BTC or tokens | Test coins with no value |
| Funded by | Ads and referrals | Projects, foundations, infrastructure providers |
| Purpose | Promotion, attention | Development and testing |
| Scam risk | High | Low, but fake “testnet” sites exist |

Two cautions apply. Test coins cannot be sold, so any site offering to buy or swap them for real money is a scam. And testnet faucets sometimes require a small mainnet balance or a social login to limit abuse; that is normal, but never share a recovery phrase to satisfy it.

If you are learning how wallets and transactions work, a testnet faucet is the better classroom. You can practise sending, confirming and reading a block explorer without any money at stake. The [Crypto payments topic](/guides/topics/crypto-payments) links the wallet and transfer guides that pair well with that practice.`,
    },
    {
      id: "pvp",
      title: "Faucets and PVPspinArena",
      body: `PVPspinArena runs three player-vs-player games, Jackpot, [Coinflip](/coinflip) and [Roulette](/roulette), with real stakes in USDC or ETH on the Base network. It is 18+ only. There is no faucet, and faucet balances are not a sensible way to fund play: the amounts are tiny, they are usually on other networks, and the time cost is out of proportion to the value.

What carries over is the maths lesson. A faucet dice game with a 1% edge drains a balance slowly through turnover; Roulette's 33-slot wheel returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee, so a Purple or Silver bet costs about 3.03% before the win fee. A Coinflip is a 50/50 between two players, with the winner taking the pot minus any fee shown before entry. Settled rounds can be verified on [fairness](/fairness).

If a free balance has turned into chasing, the [responsible gambling](/responsible-gambling) page has limits and support.`,
    },
  ],
  faqs: [
    {
      q: "Do bitcoin faucets still work?",
      a: "Some still pay, but only tiny amounts, typically tens to hundreds of satoshis per claim. Realistic earnings are cents per hour, and many faucets are scams or ad farms.",
    },
    {
      q: "What is a crypto faucet?",
      a: "A site or app that gives away small amounts of a cryptocurrency for simple tasks such as captchas, ads or timers. It is funded by advertising and referrals.",
    },
    {
      q: "How much can you earn from a bitcoin faucet?",
      a: "At 50 satoshis an hour for eight hours a day, about 12,000 satoshis a month. At $100,000 per bitcoin that is roughly $12, before withdrawal minimums and fees.",
    },
    {
      q: "Are bitcoin faucets safe?",
      a: "Receiving to an address is low risk. The danger is in deposit-to-withdraw schemes, faucet bots and extensions carrying malware, and sites asking for your seed phrase or wallet approvals.",
    },
    {
      q: "What is a testnet faucet?",
      a: "A faucet that gives out test coins for networks such as Bitcoin testnet or Base Sepolia. The coins have no value and exist so developers can test without real money.",
    },
  ],
  sources: [
    { label: "Wikipedia: Gavin Andresen", url: "https://en.wikipedia.org/wiki/Gavin_Andresen" },
    { label: "Wikipedia: Bitcoin", url: "https://en.wikipedia.org/wiki/Bitcoin" },
    {
      label: "Wikipedia: Lightning Network",
      url: "https://en.wikipedia.org/wiki/Lightning_Network",
    },
  ],
  related: [
    "lightning-network-gambling",
    "crypto-casino-bonus-codes",
    "polygon-casino",
    "bitcoin-fees",
    "fake-casino-sites",
    "bitcoin-casino",
  ],
  updated: "2026-09-27",
};
