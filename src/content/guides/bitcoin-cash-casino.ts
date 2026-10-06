import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bitcoin-cash-casino",
  cluster: "Crypto payments",
  keyword: "bitcoin cash casino",
  secondary: ["bch casino", "bitcoin cash gambling", "bch deposit", "bch confirmations"],
  title: "Bitcoin Cash Casino: BCH Fees, Confirmations, Limits",
  description:
    "Bitcoin cash casino guide: how BCH deposits and withdrawals work, why fees are tiny, how many confirmations casinos want, and the address mix-ups to avoid.",
  h1: "Bitcoin cash casino: BCH fees, confirmations and availability",
  answer:
    "A bitcoin cash casino accepts BCH, the 2017 fork of bitcoin with larger blocks. Deposits usually cost a fraction of a cent in network fees and confirm in about ten minutes per block, though many casinos wait for several confirmations. BCH is widely but not universally accepted. The main risks are price swings, wrong-network sends, and the ordinary checks any offshore casino needs.",
  facts: [
    "Bitcoin Cash split from bitcoin in a hard fork on 1 August 2017; holders of BTC at the fork received an equal amount of BCH.",
    "BCH blocks can hold up to 32 MB and arrive about every ten minutes, which keeps typical fees well under one cent.",
    "Casinos and exchanges often require more confirmations for BCH than for BTC, because a smaller hash rate makes chain reorganisations cheaper to attempt.",
    "BCH uses the CashAddr format (bitcoincash:q…), but older 1… legacy addresses look identical to bitcoin's and are a common source of lost funds.",
    "Because BCH is volatile, a deposit's dollar value can change between sending and playing; many casinos convert or display balances in dollars.",
  ],
  sections: [
    {
      id: "what",
      title: "What Bitcoin Cash is",
      body: `Bitcoin Cash (BCH) came out of the "block size war" of 2015–2017. One camp wanted bitcoin to scale by raising the 1 MB block size limit so more transactions fit on-chain. The other favoured SegWit and off-chain layers such as Lightning. When SegWit went ahead on bitcoin, the big-block camp forked on 1 August 2017, creating a separate chain with an 8 MB limit, later raised to 32 MB in 2018.

The chain split again in later years. In November 2018 a dispute produced Bitcoin SV (BSV) as a separate coin. In November 2020 another split left the Bitcoin Cash Node implementation as the main BCH chain, with the other side renamed eCash. When a casino lists "BCH", it means this surviving chain.

### Technical differences from bitcoin that matter for payments

| Feature | Bitcoin (BTC) | Bitcoin Cash (BCH) |
| --- | --- | --- |
| Block size limit | About 4M weight units (SegWit) | 32 MB |
| Target block time | 10 minutes | 10 minutes |
| Typical simple-payment fee | Cents to dollars, varies with demand | Well under one cent |
| SegWit | Yes | No |
| Address format | bc1…, 3…, 1… | bitcoincash:q… (CashAddr), legacy 1… |
| Lightning Network | Yes | Not used |

Both chains use proof-of-work mining with the same SHA-256 algorithm, which is why hash rate can move between them. For the general question of how bitcoin transfers work at casinos, see [bitcoin casino](/guides/bitcoin-casino).`,
    },
    {
      id: "fees",
      title: "BCH fees at a casino",
      body: `BCH network fees are low because blocks are rarely full. Most wallets use a rate of about 1 satoshi per byte. A simple one-input, two-output transaction is roughly 220–230 bytes, so the fee is about 220–230 sats.

### Worked example

At an illustrative BCH price of $400, one BCH is 100,000,000 sats, so one sat is $0.000004.

- A 226-byte deposit at 1 sat/byte costs 226 sats, about **$0.0009**.
- The same payment shape on bitcoin at 20 sat/vB, using a 141 vB SegWit transaction, costs 2,820 sats. At $100,000 per BTC that is **$2.82**.

That difference is the main reason BCH appears on casino cashier lists. For small deposits, BTC fees can be a large share of the stake. [Bitcoin fees](/guides/bitcoin-fees) explains the BTC side of that comparison.

### The fees that are not network fees

- **Exchange withdrawal fees.** If you buy BCH on an exchange and send it straight to a casino, the exchange's flat withdrawal fee will likely dwarf the network fee.
- **Spread and conversion.** Many casinos convert BCH to a dollar balance on deposit and back on withdrawal. Each conversion can carry a margin.
- **Casino withdrawal fees and minimums.** Some sites charge a flat withdrawal fee or set a minimum withdrawal.

The full cost chain for a crypto deposit is laid out in [crypto casino deposit fees](/guides/crypto-casino-deposit-fees).`,
    },
    {
      id: "confirmations",
      title: "Confirmations and deposit speed",
      body: `A confirmation is a block that includes your transaction; each later block adds one more. The more confirmations, the harder it is for anyone to reverse the payment by rewriting the chain. [Blockchain confirmations](/guides/blockchain-confirmations) covers the general theory.

### Why BCH often needs more confirmations

BCH shares its mining algorithm with bitcoin but has a small fraction of bitcoin's hash rate. That makes a deep chain reorganisation cheaper to attempt on BCH than on BTC, so exchanges and casinos protect themselves by waiting longer. Requirements vary by operator:

| Operator type | Typical BCH confirmations | Approximate wait |
| --- | --- | --- |
| Casino, small deposit | 1–3 | 10–30 minutes |
| Casino, large deposit | 3–6 | 30–60 minutes |
| Large exchange | Often 6 or more, sometimes much higher | 1 hour or longer |

These ranges are indicative. The cashier page or deposit screen shows the exact number for that site.

### Zero-confirmation payments

The BCH community has long promoted accepting unconfirmed ("0-conf") transactions for small retail payments, and some node software broadcasts double-spend proofs to warn merchants. A few services credit small BCH deposits before the first confirmation. Most casinos do not, because a deposit is effectively a cash-out risk if it is later reversed.

### When a deposit is slow

- Check the transaction ID on a BCH block explorer. If it has confirmations, the delay is on the casino's side; contact support with the ID.
- If it has no confirmations after an hour, the fee may have been set below the relay minimum by an unusual wallet setting.`,
    },
    {
      id: "addresses",
      title: "Addresses and wrong-network mistakes",
      body: `This is where most BCH money is lost.

### CashAddr versus legacy

BCH introduced the CashAddr format in 2018. CashAddr addresses start with "bitcoincash:" followed by "q" or "p", or just the "q…" part. They cannot be confused with a bitcoin address. But BCH also still accepts the **legacy format**, which starts with "1" or "3" and is identical in appearance to legacy bitcoin addresses. A BTC wallet will happily send to a "1…" address even if it came from a BCH wallet.

### Common mistakes

1. **Sending BTC to a BCH deposit address shown in legacy format.** The BTC arrives on the bitcoin chain at an address the casino's BCH system does not watch.
2. **Sending BCH to a BTC address.** The BCH lands on the BCH chain at an address that may only be recoverable if the owner controls the same private key there.
3. **Picking the wrong coin in an exchange withdrawal menu.** "BCH", "BSV" and "XEC" are separate coins on separate chains.

Recovery depends on whether the receiving party controls the keys and is willing to help. Custodial casinos and exchanges often cannot or will not. The general rules are in [sent crypto to the wrong network](/guides/sent-crypto-to-wrong-network).

### Safe routine

- Ask the casino's cashier for a CashAddr address and use a BCH wallet that shows CashAddr by default.
- Paste, then check the first and last several characters.
- Send a small test deposit before a large one.`,
    },
    {
      id: "in-out",
      title: "Getting BCH in and cashing it back out",
      body: `### Buying BCH

Most large exchanges list BCH against major currencies and against stablecoins. The usual route is a bank transfer into the exchange, a limit order on the BCH market, and a withdrawal to your own wallet or straight to a casino deposit address. Some payment apps that sell bitcoin also sell BCH, but check whether they allow transfers out; buying is useless for deposits if the coin cannot leave the app.

### Wallets

Any wallet you use needs genuine BCH support, not just "bitcoin". Look for one that displays CashAddr addresses, lets you see the fee before sending, and gives you a recovery phrase you store offline. Hardware wallets with a BCH app keep the keys off your computer. If you are new to self-custody, read [seed phrase](/guides/seed-phrase) first.

### Withdrawing winnings

A casino BCH withdrawal is the reverse of a deposit: you give the site an address and it sends a transaction. Points to check:

1. **Address format.** Give a CashAddr address from a BCH wallet or a BCH deposit address from an exchange, never a BTC address.
2. **Processing time.** The network part takes minutes; the casino's manual review, if any, is often the slow step.
3. **Exchange deposit requirements.** If you send winnings to an exchange, it will want its own number of confirmations before crediting, which may be higher than the casino's.

### Worked example: a small deposit round trip

You move $100 of BCH from an exchange to a casino and later withdraw $100 back.

| Step | Illustrative cost |
| --- | --- |
| Exchange trading fee, buy | $0.20 |
| Exchange BCH withdrawal fee | $0.40 |
| Network fee, deposit | under $0.01 |
| Casino withdrawal fee | $0 to $1 |
| Network fee, withdrawal | under $0.01 |
| Exchange trading fee, sell | $0.20 |

The network fees are almost nothing; the platform fees and any price change while you hold BCH are the real costs.`,
    },
    {
      id: "choose",
      title: "Choosing a casino that accepts BCH",
      body: `Many crypto casinos list BCH next to BTC, LTC and DOGE, and payment processors used by smaller sites often support it too. Acceptance is not universal, and some sites that once listed it have removed it. Accepting a coin says nothing about the operator's honesty.

### Checklist

1. **Licence and jurisdiction.** Know who regulates the site and whether it is permitted where you live; [crypto casino license](/guides/crypto-casino-license) explains the common regimes.
2. **Confirmation requirement and minimum deposit** for BCH specifically.
3. **Balance currency.** Does the site hold BCH, or convert to dollars? Converting protects you from price swings mid-session but adds spread.
4. **Withdrawal rules.** Minimums, fees, processing times, and whether withdrawals must go back in the coin you deposited. Our [crypto casino withdrawals](/guides/crypto-casino-withdrawals) guide covers what "instant" usually means.
5. **Fairness evidence.** Can you verify results, or only trust them?
6. **Scam signals.** Clone domains, withdrawal "tax" demands and fake support are covered in [fake casino sites](/guides/fake-casino-sites).

### Price exposure

Worked example: you deposit 1 BCH when it is worth $400 and the site keeps your balance in BCH. You break even at the tables, and BCH falls 10% before you withdraw. You get back 1 BCH, now worth $360. The $40 loss came from the market, not the games. If that exposure is unwelcome, convert to a stablecoin first or use a site that converts on deposit.

Similar coin-specific pages exist for [Litecoin](/guides/litecoin-casino) and [Dogecoin](/guides/dogecoin-casino).`,
    },
    {
      id: "pvp",
      title: "Bitcoin Cash and PVPspinArena",
      body: `PVPspinArena runs three player-vs-player games, [Jackpot](/), [Coinflip](/coinflip) and [Roulette](/roulette), with play in USDC or ETH on the Base network. BCH cannot be sent to a Base address. If you hold BCH, sell it for USDC on an exchange that supports Base withdrawals, then send the USDC on Base. That also removes the price exposure described above, because USDC is designed to hold $1.

The games are the same whatever coin you started with. Jackpot win chance equals your share of the pot. A Coinflip is a 50/50 between two players. Purple and Silver return 32/33 before the win fee, about a 7.88% edge after it, and Green returns 14/33. Seeds are committed before bets close, and any settled round can be checked on [fairness](/fairness).

Gambling is 18+ or the legal age where you live. Set a budget in dollars before converting, and use the [responsible gambling](/responsible-gambling) tools if play stops being fun. The [crypto payments topic](/guides/topics/crypto-payments) collects the other coin and network guides.`,
    },
  ],
  faqs: [
    {
      q: "Do crypto casinos accept Bitcoin Cash?",
      a: "Many do, usually alongside BTC, LTC and DOGE, but acceptance is not universal. Check the cashier page for BCH specifically, plus its minimum deposit and confirmation requirement.",
    },
    {
      q: "How long does a BCH casino deposit take?",
      a: "Blocks arrive about every ten minutes. With a typical requirement of one to six confirmations, expect roughly 10 to 60 minutes. Some sites wait longer for large deposits.",
    },
    {
      q: "Is Bitcoin Cash cheaper than bitcoin for gambling deposits?",
      a: "On network fees, yes. A simple BCH transaction usually costs well under a cent, while BTC fees range from cents to dollars. Exchange and casino fees can still outweigh the network fee.",
    },
    {
      q: "What happens if I send BTC to a BCH address?",
      a: "The BTC goes to that address on the bitcoin chain, where the casino's BCH system may not see it. Recovery depends on the operator controlling the key and agreeing to help.",
    },
    {
      q: "Why do casinos need more confirmations for BCH?",
      a: "BCH has much less mining power than bitcoin, so rewriting recent blocks is cheaper to attempt. Waiting for more confirmations reduces the risk of a reversed deposit.",
    },
  ],
  sources: [
    { label: "Wikipedia: Bitcoin Cash", url: "https://en.wikipedia.org/wiki/Bitcoin_Cash" },
    { label: "Bitcoin Cash project site", url: "https://bitcoincash.org/" },
    {
      label: "Wikipedia: fork (blockchain)",
      url: "https://en.wikipedia.org/wiki/Fork_(blockchain)",
    },
  ],
  related: [
    "bitcoin-casino",
    "litecoin-casino",
    "dogecoin-casino",
    "bitcoin-fees",
    "blockchain-confirmations",
    "sent-crypto-to-wrong-network",
  ],
  updated: "2026-09-27",
};
