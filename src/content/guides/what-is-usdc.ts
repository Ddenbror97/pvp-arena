import type { Guide } from "./types";

export const guide: Guide = {
  slug: "what-is-usdc",
  cluster: "Crypto payments",
  keyword: "what is usdc",
  secondary: ["usd coin", "circle usdc", "usdc reserves", "usdc on base"],
  title: "What Is USDC? Circle, Reserves and Casino Deposits",
  description:
    "What is USDC: who issues it, how reserves work, which networks it lives on, and why a USDC casino balance stays in dollars.",
  h1: "What is USDC? The dollar stablecoin used on PVPspinArena",
  answer:
    "What is USDC? USD Coin is a dollar stablecoin issued by Circle. Each token is designed to be redeemable one for one with a US dollar by eligible customers, and Circle publishes reserve reports for the cash and short-term government securities that back it. USDC exists on several blockchains; PVPspinArena accepts it on Base and credits a dollar balance after confirmations.",
  facts: [
    "USDC is issued by Circle, a US-based company, not by a casino or by Tether.",
    "Circle publishes reserve information and attestations for the assets that back USDC.",
    "The same ticker exists on many networks; a send on the wrong chain will not arrive.",
    "On Base, transfers typically confirm in seconds and fees are usually a few cents.",
    "PVPspinArena credits USDC 1:1 into a US-dollar ledger and also accepts ETH on Base.",
  ],
  sections: [
    {
      id: "definition",
      title: "USD Coin in plain English",
      body: `USD Coin, ticker USDC, is Circle's dollar token. You can hold it in a self-custody wallet, send it to another address, or redeem it for dollars if you are an eligible Circle customer. One USDC is designed to stay near one US dollar. That is the whole product: a blockchain token with a dollar peg, not a share of Circle and not a casino chip until a site credits it.

People mix USDC up with USDT and with "crypto dollars" invented by a gambling brand. Circle is the issuer. Tether issues USDT. A casino that shows $10.00 after a 10 USDC deposit is keeping its own ledger; the tokens themselves sat in the deposit address.

This page is part of the [crypto payments](/guides/topics/crypto-payments) guides. It is written for adults aged 18 or over who want to understand the coin before they send it. PVPspinArena uses USDC as a deposit asset for player-versus-player Jackpot, Coinflip and Roulette. It is not a poker room, sportsbook or lottery, and it does not take USDT or Bitcoin.

If you need the broader category first, start with [what is a stablecoin](/guides/what-is-a-stablecoin). If you already know you will deposit here, the [USDC casino](/guides/usdc-casino) guide walks the send and cashout steps.`,
    },
    {
      id: "circle",
      title: "Who issues USDC and what Circle is responsible for",
      body: `Circle Internet Financial issues USDC. Historically Coinbase helped launch the coin through a joint arrangement; Circle is the issuer you should name when you ask who stands behind the token. Circle is not PVPspinArena, not your wallet vendor and not the Base sequencer.

What Circle does:

- Mints USDC when eligible parties deliver dollars.
- Burns USDC when eligible parties redeem.
- Holds and reports the reserve assets.
- Can freeze tokens at specific addresses when required by law.

What Circle does not do:

- Credit your casino balance.
- Reverse a send you made to the wrong address.
- Guarantee a game result.

Circle also publishes terms for who may mint and redeem at par. A person with a self-custody wallet is usually a secondary holder: you bought USDC on an exchange or a swap, not from Circle's desk. That is normal. It means your exit to bank dollars is typically sell-on-exchange, not a corporate redemption form. The peg still relies on someone, somewhere, being able to redeem.

If a support chat claims to be "Circle recovery" and asks for a seed phrase, it is a thief. Circle will never need your recovery words to explain a transfer you already broadcast. A casino support desk will not need them either. The transaction hash on a Base explorer is the artefact that proves a send.`,
    },
    {
      id: "reserves",
      title: "USDC reserves: what the reports are for",
      body: `Circle states that USDC is fully reserved and publishes transparency materials, including attestations by an accounting firm and a breakdown that is typically heavy in cash and short-term US Treasuries. Those documents are about Circle's ability to redeem tokens at the issuer level. They are not an audit of any gambling site.

Read a reserve report as an answer to one question: if every circulating USDC were presented for redemption by people who qualify, would the disclosed assets cover it at the snapshot date? Even a clean report has limits. It is a point in time. It does not prove the next month. It does not prove your casino has the USDC it owes you.

That last point is why cashout rules still matter. On PVPspinArena, withdrawals have a $250 daily limit and requests over $25 wait for review. Those checks are about the site's payout wallet, not about Circle's Treasuries.

USDC reserves also do not make gambling profitable. A dollar that stays a dollar can still be lost on a Coinflip. Treat Circle's PDF as homework on the token, then treat the casino's withdrawal page as homework on the chip. Those are two different counterparties. You can be right about Circle and still wait on a manual review for a $40 cashout.

A practical reading habit: open the latest transparency page, note the date, note the mix of Treasuries versus cash, and note whether the attestor is named. If the page is months old, the snapshot is stale. If a gambling site cites a Circle report as proof that *the site* is solvent, that is a category error. Circle's Treasuries do not sit in the casino payout wallet.`,
    },
    {
      id: "networks",
      title: "Which networks USDC lives on",
      body: `USDC is a multi-chain token. Ethereum mainnet, Base, Solana, Arbitrum and others all have USDC. The name matches; the ledgers do not. A Base transfer never appears on Ethereum mainnet. Bridges and official Circle tooling exist to move between domains, but a casino deposit address is almost always one chain only.

### USDC on Base

Base is an Ethereum layer-2. Addresses look like Ethereum addresses, and wallets such as MetaMask can add Base as a network. Fees are paid in a little ETH, not in USDC. For small deposits that is the point: a few cents of gas instead of a mainnet token transfer that can cost several dollars.

PVPspinArena watches Base only. If you withdraw USDC from an exchange, pick Base in the network menu, not "Ethereum," "Solana" or a generic "USD Coin" default. Send a small test the first time.

### How to stay on the right rail

1. Open the [wallet](/wallet) page and confirm the network label is Base.
2. In the exchange or wallet, select USDC and Base, then paste the deposit address.
3. Compare the first and last characters of the address before you confirm.
4. Keep enough ETH on Base to pay the send.

Bridges exist if your USDC is stranded on another chain. They add smart-contract risk, extra time and sometimes a fee that looks small until you are moving $15. For a first session it is usually cleaner to sell on the exchange and withdraw native USDC on Base than to "just bridge it" from a tutorial video.

[How to buy USDC](/guides/how-to-buy-usdc) covers getting the token onto Base from a card or exchange. Read the network dropdown twice. The most expensive USDC lesson is a perfectly valid token on the chain the casino does not watch.`,
    },
    {
      id: "casino-balance",
      title: "Why a USDC casino balance stays in dollars",
      body: `Once PVPspinArena credits a deposit, the internal unit is US dollar cents. Ten USDC becomes $10.00. A $1.50 Coinflip deducts $1.50. A win credits dollars, not a floating ETH amount.

That design has two effects. First, you do not watch a ticker between rounds. Second, ETH deposits are converted at credit time, so after that moment they behave like the USDC path. The conversion rate is a snapshot, not a promise that ETH will hold that dollar value in your wallet.

Compare that with a site that keeps your chip in BTC or ETH. There the balance number in coins can stay flat while the dollar value moves. Neither model is "more honest." They expose different risks. Dollar chips expose Circle and the site. Coin chips expose the market.

ETH on Base is accepted as a second on-ramp, not as a second chip after credit. The dollar figure you see later is the conversion at credit, plus wins and losses. If ETH rallies after that, your casino header does not rally with it. If you wanted ETH price exposure, you should have kept the coins in the wallet.

USDT is the other common dollar chip. PVPspinArena does not take it. The comparison is in [USDC vs USDT gambling](/guides/usdc-vs-usdt-gambling). If a friend tells you to "just send USDT, it's the same dollar," they are describing the peg target, not the token or the network this site watches.`,
    },
    {
      id: "example",
      title: "Worked example: 25 USDC from an exchange to a first round",
      body: `Here is a concrete path for an adult who already holds USDC on a centralised exchange.

1. Create or open your PVPspinArena account and verify a self-custody wallet on your profile by signing a message. The signature does not spend USDC.
2. On the exchange, withdraw 25 USDC. Choose Base. Paste the address from the wallet page, not a random address from a chat.
3. Wait until the exchange marks the withdrawal complete and BaseScan shows the tokens in your wallet.
4. Send those 25 USDC on Base to the site deposit address. Pay the gas in ETH.
5. After confirmations and agreement from two blockchain data providers, the header shows $25.00.
6. Open Coinflip, create a $2.00 game, and treat the $2.00 as money you can lose. Later, withdraw what you want to keep, knowing amounts over $25 are reviewed and the daily cap is $250.

If step 3 used Ethereum mainnet by mistake, the site will not credit the transfer. That is a wrong-network loss risk, not a Circle reserve failure.`,
    },
    {
      id: "risks",
      title: "What USDC does not protect you from",
      body: `Holding USDC removes most overnight price swings. It does not remove:

- **Issuer and regulatory risk.** Circle can freeze addresses. Law can change how USDC is issued in your country.
- **Chain risk.** You must use the network the destination supports.
- **Wallet risk.** A leaked seed phrase drains USDC like any other token.
- **Site risk.** After credit, you are a creditor of the casino until you withdraw.
- **Game risk.** Player-versus-player pots still have a fee or variance. You can lose the stake.

Issuer freezes are rare for ordinary players and still real. Circle can comply with sanctions lists. Self-custody does not override that. If an address is frozen, the casino cannot magic the tokens onto Base for you.

Bookmark the real site. Never approve a surprise token-spend to "verify USDC." This site credits a normal transfer, not a blind allowance. If you experiment on other dapps, review allowances afterward so a forgotten approval cannot empty the same hot wallet you use for deposits.

Keep a written [gambling budget](/guides/gambling-budget) before the first 25 USDC leaves the exchange. A stablecoin makes it easier to spend "just another 10" because the number still looks like cash. That is a feature of the unit, not a reason to skip a stop-loss.`,
    },
    {
      id: "summary",
      title: "Summary: Circle's dollar token, your send, the site's ledger",
      body: `USDC is Circle's dollar stablecoin, reserved and redeemable at the issuer for eligible customers, and issued on several chains. Casinos use it because a dollar in is a dollar on the chip. PVPspinArena accepts USDC and ETH on Base only, shows dollars after credit, and is a PvP jackpot, coinflip and roulette site — not a USDT, Tron or Bitcoin casino.

Check the network, verify the wallet, and keep a budget before the first send.

The other widely used dollar token is covered in [what is Tether](/guides/what-is-tether).`,
    },
  ],
  faqs: [
    {
      q: "Is USDC the same as a US dollar in my bank?",
      a: "No. USDC is a token issued by Circle. Banks, deposit insurance and Circle redemption rules are different systems. You can also lose USDC to a bad transfer.",
    },
    {
      q: "Who is Circle?",
      a: "Circle is the company that issues USDC and publishes reserve information. It is not the casino, and it will not recover a send you made to the wrong address.",
    },
    {
      q: "Can I deposit USDC on Ethereum mainnet to PVPspinArena?",
      a: "No. The site watches Base. A mainnet transfer will not be detected as a deposit.",
    },
    {
      q: "Does my credited balance stay in USDC?",
      a: "The site keeps balances in US dollar cents. A 10 USDC deposit becomes $10.00. Cashouts are sent as USDC on Base.",
    },
    {
      q: "Is USDC safer than ETH for a gambling session?",
      a: "It is more stable in dollars while you wait. It is not safer against a stolen wallet, a wrong network or a dishonest site, and it does not improve game odds.",
    },
  ],
  sources: [
    { label: "Circle — USDC overview", url: "https://www.circle.com/usdc" },
    { label: "Circle — Transparency", url: "https://www.circle.com/transparency" },
    { label: "Base — Network documentation", url: "https://docs.base.org/" },
  ],
  related: [
    "usdc-casino",
    "what-is-a-stablecoin",
    "stablecoin-casino",
    "usdt-casino",
    "usdc-vs-usdt-gambling",
    "what-is-tether",
  ],
  updated: "2026-09-26",
};
