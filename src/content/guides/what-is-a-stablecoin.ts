import type { Guide } from "./types";

export const guide: Guide = {
  slug: "what-is-a-stablecoin",
  cluster: "Crypto payments",
  keyword: "what is a stablecoin",
  secondary: [
    "stablecoin meaning",
    "fiat backed stablecoin",
    "algorithmic stablecoin",
    "stablecoin peg",
  ],
  title: "What Is a Stablecoin? Pegs, Reserves and Casino Use",
  description:
    "What is a stablecoin: how the peg works, USDC versus USDT, reserve risk, and why casinos use a dollar token instead of Bitcoin.",
  h1: "What is a stablecoin? Pegs, reserves and why casinos use one",
  answer:
    "What is a stablecoin, in one sentence: a crypto token designed to stay close to a fixed value, usually one US dollar. Issuers of the large dollar coins hold cash and short-term government debt and let eligible holders redeem tokens for dollars. Casinos like a dollar token because a $20 balance stays about $20 while you are not playing, unlike Bitcoin or ETH.",
  facts: [
    "A dollar stablecoin is designed to trade near $1; that target is called the peg.",
    "Fiat-backed coins such as USDC and USDT claim reserves of cash and short-term US Treasuries.",
    "Algorithmic coins try to hold the peg with code and incentives; several have failed.",
    "USDC and USDT are different issuers, reserve reports and networks, not interchangeable tokens.",
    "PVPspinArena accepts USDC and ETH on Base and keeps balances in US dollar cents.",
  ],
  sections: [
    {
      id: "meaning",
      title: "Stablecoin meaning: a token that aims at a peg",
      body: `People search "what is a stablecoin" because the name sounds like a promise of safety. It is not. A stablecoin is a digital token whose issuer or mechanism tries to keep its market price close to a reference, most often one US dollar. That target is the peg. The token still lives on a public blockchain. You can send it, lose it, or send it on the wrong network, just as with any other crypto asset.

The useful idea is simple. Bitcoin and ETH are priced by the market every second. If you deposit 0.01 BTC and the dollar price of Bitcoin drops 8% before you play, your session is already smaller in dollars. A dollar stablecoin is built so that one token is meant to stay near one dollar. Your wins and losses then come from the game, not from a chart.

This guide sits in [Crypto payments](/guides/topics/crypto-payments) because the peg, the reserves and the issuer matter before you ever open a deposit page. Gambling on PVPspinArena is for adults aged 18 or over. A stablecoin does not make a bet safer; it only keeps the unit of account steadier.

PVPspinArena is not a Bitcoin casino, a lottery or a sportsbook. It runs three player-versus-player games — [Jackpot](/), Coinflip and Roulette — and it credits USDC and ETH on the Base network into a dollar ledger. The rest of this article teaches how a peg is supposed to work, then contrasts that with coins that swing.`,
    },
    {
      id: "peg",
      title: "How a stablecoin peg actually holds",
      body: `A peg is a market outcome, not a law of physics. Two forces keep a well-run fiat-backed coin near $1.

### Redemption and minting

If the issuer will redeem one token for one dollar, traders have a reason to buy a cheap token and redeem it, or to mint a token when it trades above $1 and sell it. That arbitrage pulls the market price back toward the target. If redemption is slow, restricted, or not trusted, the peg can wobble even while the issuer still claims full reserves.

### Reserves

A fiat-backed stablecoin is only as strong as what sits behind it. The large dollar coins say each token is matched by cash, cash equivalents and short-term US government securities. Those assets are meant to be sold or redeemed so that holders who qualify can exit at par. Reserves are not the same as a casino bankroll, and they are not the same as a hashed game seed. They are an issuer balance-sheet claim.

### What the market price tells you

If a coin trades at $0.997 on a liquid exchange, that is a small discount, not a collapse. If it trades at $0.90 for hours, the market is saying redemption is in doubt. Watch the issuer's own redemption desk and the deepest order books, not a single casino quote.

For casino play the practical point is narrower: once a site credits a dollar balance, your chip is an IOU from that site, not a token sitting in your wallet. The peg still matters because deposits and cashouts are the token.`,
    },
    {
      id: "types",
      title: "Fiat-backed versus algorithmic stablecoins",
      body: `Not every token that calls itself a stablecoin works the same way.

### Fiat-backed

A fiat-backed stablecoin is issued when someone delivers dollars (or equivalent) to the issuer, and it is burned when someone redeems. USDC from Circle and USDT from Tether are the two names you will see on most gambling sites. They differ in who issues them, how they report reserves, and which chains they live on. Both are designed to be redeemable one for one with the dollar by eligible customers. See [what is USDC](/guides/what-is-usdc) for Circle's model and [USDC vs USDT for gambling](/guides/usdc-vs-usdt-gambling) for a side-by-side.

### Crypto-collateralised

Some coins are minted against a surplus of other crypto locked in a smart contract. They can hold a dollar target while remaining on-chain, but they can also be liquidated when collateral prices crash. They are uncommon as casino chips because few operators want that extra failure mode.

### Algorithmic

An algorithmic stablecoin tries to hold the peg with supply rules and incentives rather than a full cash reserve. Several well-known designs broke when confidence failed and the supporting token could not absorb selling. Treat any "stable" coin without a clear, redeemable reserve as a separate risk, not as a dollar.

Casinos almost always mean USDC or USDT when they say stablecoin. If a site pushes an in-house token that "tracks the dollar" without a public reserve report, treat that as a house chip with extra issuer risk.`,
    },
    {
      id: "usdc-usdt",
      title: "USDC versus USDT as casino chips",
      body: `Both coins aim at the same peg. For a player the differences that matter are issuer, reporting and network.

| Point | USDC | USDT |
| --- | --- | --- |
| Issuer | Circle | Tether |
| Typical reserve story | Cash and short-term Treasuries, monthly attestations | Cash and Treasuries, public reserve updates |
| Common casino networks | Ethereum, Base, Solana and others | Tron (TRC-20), Ethereum, others |
| PVPspinArena | Accepted on Base | Not accepted |

The ticker is not the transfer. USDC on Ethereum is not USDC on Base. USDT on Tron is not USDT on Ethereum. Sending the right ticker on the wrong chain is one of the most common ways people lose a deposit.

PVPspinArena is a [USDC casino](/guides/usdc-casino) in the narrow sense that it accepts USDC (and ETH) on Base and shows balances in dollars. It is not a USDT or Tron casino. If you already hold Tether, you convert or swap to USDC and withdraw on Base before you deposit.`,
    },
    {
      id: "reserve-risk",
      title: "Reserve risk, depegs and what they do not cover",
      body: `Reserve risk is the chance that the issuer cannot, or will not, honour redemptions at par. That can happen because of losses in the reserve portfolio, a run that forces fire sales, a freeze, or a legal freeze on the issuer. A short depeg on an exchange can also come from thin liquidity rather than insolvency.

What a reserve report does not tell you:

- That a casino will pay your withdrawal. The casino is a separate custodian of your balance.
- That a game result was honest. Fairness is a different question; see a [provably fair casino](/guides/provably-fair-casino) for hashed seeds.
- That your wallet is safe. A stolen seed phrase empties USDC as easily as ETH.

A dollar token also does not remove gambling risk. Jackpot, Coinflip and Roulette are still games of chance for adults. A stable unit of account only means a $5 stake is still about $5 if you sit idle.

History is the other teacher. When a large dollar coin traded a few cents off for a day, casinos that priced chips in that coin had to decide whether to freeze deposits, reprice, or eat the gap. Players who thought "stable" meant "cannot move" discovered that the peg is a market. When an algorithmic coin collapsed, anyone who used it as a chip discovered that the game never started; the token itself was the loss.

If you want the opposite product — a balance that moves with a scarce asset — that is a [bitcoin casino](/guides/bitcoin-casino) model. It is a valid design. It is also a second bet on price. Choose it on purpose, not because a homepage said "crypto" and you assumed the chip was a dollar.`,
    },
    {
      id: "casinos",
      title: "Why casinos use a dollar token instead of Bitcoin",
      body: `Operators like a dollar chip for the same reason bookkeepers do: the ledger stays in one unit. A $2 Coinflip is $2 at create time and $2 when someone joins. The site does not need to reprice every pot when Bitcoin moves.

Players like it for small sessions. Network fees on a cheap layer-2 can be cents, so a $10 deposit is not eaten by miner costs the way a small BTC send can be on a busy day.

The cost of that convenience is issuer and network risk instead of Bitcoin's price risk. You are trusting Circle (or Tether) to keep the peg, and you are trusting the casino with the credited balance after the transfer confirms.

PVPspinArena keeps the internal ledger in US dollar cents. Ten USDC credited becomes $10.00. ETH deposits are converted to dollars at credit time, so after that point they no longer track the ETH price. That is a product choice, not a claim that USDC is risk-free.`,
    },
    {
      id: "example",
      title: "Worked example: $20 of Bitcoin versus $20 of USDC",
      body: `Suppose two adults each set aside twenty dollars of value on a Monday.

1. **Alex** buys $20 of Bitcoin and sends it to a BTC casino. By Wednesday Bitcoin is down 6%. The site still shows the same BTC amount, but that stack is about $18.80 before any bet.
2. **Sam** buys $20 of USDC and sends it on Base to PVPspinArena from a verified wallet. After confirmations the header shows $20.00. The dollar figure does not move overnight.
3. Both play a $2 game and lose. Alex's remaining BTC is still marked to a moving market. Sam's remaining $18.00 is still $18.00 until the next deposit, game or withdrawal.
4. If instead Bitcoin rallies 6%, Alex is ahead in dollars without winning a round. That swing is not a game result. It is a second exposure.

The example is not an argument that USDC "wins." It is an argument that you should know which risk you are taking. Price risk, issuer risk, site risk and game risk are four different things.`,
    },
    {
      id: "summary",
      title: "Summary: a peg is a design, not a guarantee",
      body: `A stablecoin is a token built to stay near a reference price, usually one dollar, using reserves, redemption and market arbitrage. Fiat-backed coins are the ones casinos actually use. Algorithmic coins are a different, historically fragile design. USDC and USDT share a peg target and differ in issuer, reporting and chains.

Use a dollar token when you want the session to be about the game. Use Bitcoin when you accept dollar swings as part of the stack. On this site, send on-chain Bitcoin, or USDC or ETH on Base, from a wallet you control, and treat every stake as money you can afford to lose.

The largest dollar stablecoin by float is [Tether](/guides/what-is-tether).`,
    },
  ],
  faqs: [
    {
      q: "What is a stablecoin in plain English?",
      a: "It is a crypto token meant to stay close to a fixed value, usually one US dollar, so you can move a dollar-like amount on a blockchain without Bitcoin-style price swings.",
    },
    {
      q: "Is a stablecoin the same as cash in a bank?",
      a: "No. You hold a token from an issuer, on a chain you choose, and you can lose it to a bad send or a stolen wallet. Bank deposits follow different law and insurance rules.",
    },
    {
      q: "Why do crypto casinos prefer USDC or USDT over Bitcoin?",
      a: "A dollar token keeps displayed balances and bet sizes stable. Bitcoin adds a second bet on price, and small BTC transfers can be slow or expensive when the network is busy.",
    },
    {
      q: "Can a stablecoin lose its peg?",
      a: "Yes. If markets doubt redemption or reserves, the token can trade below a dollar. Large coins have wobbled; smaller algorithmic coins have collapsed.",
    },
    {
      q: "Does PVPspinArena accept every stablecoin?",
      a: "No. It accepts on-chain Bitcoin, and USDC and ETH on Base. USDT, TRX and Bitcoin deposits are not credited.",
    },
  ],
  sources: [
    { label: "Circle — USDC transparency", url: "https://www.circle.com/transparency" },
    { label: "Tether — Transparency", url: "https://tether.to/en/transparency" },
    { label: "ethereum.org — Stablecoins", url: "https://ethereum.org/en/stablecoins/" },
  ],
  related: [
    "what-is-a-crypto-casino",
    "stablecoin-casino",
    "usdt-casino",
    "usdc-vs-usdt-gambling",
    "stablecoin-payments-gambling",
    "what-is-tether",
  ],
  updated: "2026-09-26",
};
