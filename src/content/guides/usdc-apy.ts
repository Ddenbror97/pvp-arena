import type { Guide } from "./types";

export const guide: Guide = {
  slug: "usdc-apy",
  cluster: "Crypto payments",
  keyword: "usdc apy",
  secondary: ["usdc interest", "usdc yield", "circle yield", "usdc savings rate"],
  title: "USDC APY: Where Yield Comes From and the Risks",
  description:
    "USDC APY explained: CeFi versus DeFi yield, what you are lending, and why a casino balance is not an interest-bearing account.",
  h1: "USDC APY: where the yield comes from and what you risk",
  answer:
    "USDC APY is an interest-style rate some platforms advertise for lending or staking USD Coin. The yield comes from borrowers, from a company’s treasury product, or from a DeFi pool — not from the token magically growing. A casino balance is not an interest account and is not USDC yield. This is not financial advice. Yield can go to zero. Smart-contract risk and issuer risk remain.",
  facts: [
    "APY is a yearly rate used in ads; the live rate can change daily or go to zero.",
    "CeFi yield means you are crediting a company. DeFi yield means you are using a smart contract.",
    "You are usually lending USDC or taking pool risk, not “earning” because you hold the token in a wallet.",
    "Circle is the issuer of USDC; a yield product is a separate company or contract.",
    "A PVPspinArena balance does not pay USDC interest.",
  ],
  sections: [
    {
      id: "what",
      title: "What people mean by USDC APY",
      body: `USDC APY, USDC interest, USDC yield and USDC savings rate are four labels for the same hunt: “I have dollars on-chain, who will pay me to leave them there?” The token itself does not pay. Someone else wants the dollars and is willing to pay a rate, or a platform is sharing a return from assets it holds.

If you need the coin first — who issues it, what the reserves are, why the peg can wobble — read [what is USDC](/guides/what-is-usdc). If you need how a deposit and cashout work on a gambling site, read [USDC casino](/guides/usdc-casino). This page does not rewrite either. It stays on earning interest.

This sits in the [crypto payments](/guides/topics/crypto-payments) cluster. It is for adults aged 18 or over. It is not financial advice, not a recommendation to lend, and not a promise that any rate you saw on a screenshot still exists.

PVPspinArena accepts USDC and ETH on Base for player-versus-player Jackpot, Coinflip and Roulette. A balance here is a game ledger. It is not a savings account.`,
    },
    {
      id: "where",
      title: "Where the yield comes from",
      body: `Someone is paying. If you cannot name who, you do not understand the product.

### Typical sources

- **Borrowers in a lending market.** Other people post collateral and borrow USDC. You supply USDC. They pay interest. The protocol or the company takes a cut. Your rate moves when demand to borrow moves.
- **A centralised platform’s own book.** A CeFi app may lend customer USDC to institutions, or it may run a program that looks like a savings rate. You are a creditor of that company.
- **Circle or partner programs.** “Circle yield” in search results often means an institutional or partner product, not a button in MetaMask. Eligibility, region and paperwork differ. Retail screenshots lie about this.
- **Incentives.** A new pool may pay extra tokens on top of a thin real rate. When the extra tokens stop, the APY collapses. That was never “USDC interest.” It was a marketing budget.

Idle USDC in a self-custody wallet earns nothing. That is normal. The token is a dollar stand-in, not a bond until you put it into a product that is a bond-shaped risk.

USDC interest in a screenshot is often a blended number: a base borrow rate plus a temporary reward token plus a boost for locking. Split those three before you compare products. The base rate is the only piece that might still be there next month. The reward token has its own price. The lock is a liquidity cost. Adding them into one “APY” is how a 4% book becomes a 14% ad.

Stablecoin yield is also not unique to USDC. Other dollar tokens advertise rates. A higher number on a thinner coin is usually more risk, not a bargain. This page will not compare tickers. If you hold USDC because you wanted Circle’s product, do not jump to a lookalike because a tile is taller.`,
    },
    {
      id: "cefi-defi",
      title: "CeFi versus DeFi yield",
      body: `| | CeFi (app, exchange, “earn”) | DeFi (Aave-style pool, on-chain) |
| --- | --- | --- |
| Who you trust | A company and its custody | Code, oracles, and whoever can upgrade the contract |
| How you get in | Account, maybe KYC | Wallet, network, gas |
| What you are lending | Often a claim on the company’s books | Tokens in a pool |
| How you exit | Their queue, their freeze button | A transaction, unless the pool is stuck |
| Headline risk | Insolvency, freeze, hidden rehypothecation | Bug, oracle, governance, depeg |

CeFi is simpler to click and easier to lose as a customer if the firm fails. DeFi is visible on-chain and still easy to lose if you sign the wrong approval or if the contract is wrong.

A USDC savings rate on an exchange can be cut overnight. A DeFi utilisation rate can spike or die. Neither is a bank deposit in the FDIC sense. Do not use the word “savings” as if it were a regulated cash account unless the specific product is one — and most crypto yield is not.

If you do not already hold USDC, [how to buy USDC](/guides/how-to-buy-usdc) is the purchase page. Buying and then immediately dumping the pile into the highest APY tile is how people meet insolvency and smart-contract failure in the same month.`,
    },
    {
      id: "risks",
      title: "What you risk when you chase a rate",
      body: `Yield can go to zero. That is the first risk and the one ads skip.

### Issuer risk

USDC is designed to track a dollar. Circle publishes reserve information. A depeg, a freeze on an address, or a regulatory shock is still possible. Yield does not cancel issuer risk. It stacks on top.

### Platform and smart-contract risk

CeFi: you may be an unsecured creditor. DeFi: a bug, an admin key, or an oracle can empty a pool. Audits reduce some risk. They do not delete it.

### Liquidity and lockups

Some products make you wait. A 30-day lock is not “the same as USDC in your wallet.” If you need the dollars for a deposit on the [wallet](/wallet) page this week, locked yield is the wrong pile.

### Regulatory and regional risk

Earn programs appear and vanish by country. A rate you saw on a US YouTuber’s screen may be illegal or unavailable where you live. That is your problem to check, not ours to certify.

### Peg and opportunity theatre

A 12% APY on a stablecoin is not free. Either someone is paying a lot to borrow, incentives are temporary, or risk is higher than the tile admits. If the number looks like a credit-card APR, ask who the distressed borrower is.

This is not financial advice. If you cannot afford to lose the USDC, do not lend it.

Taxes can turn a pretty APY into a chore. Some places treat each interest credit as income. Some treat a reward token as income at the moment it hits the wallet, even if you never sell it. We will not map your country. If the rate is small and the paperwork is large, that is a reason to skip the product, not a reason to hide it.

Scam tiles copy real brand names. “Circle yield” on a connect-wallet page that is not Circle is a drain. Official products have a URL you can type from memory after you have checked it once. They do not need your seed, and they do not need you to “validate USDC” by pasting 24 words.`,
    },
    {
      id: "casino",
      title: "Why a casino balance is not yield",
      body: `A USDC casino credits a ledger when your transfer confirms. That ledger is for play. It does not accrue USDC APY. It does not compound. It is not Circle yield. Leaving $200 on a gambling site “to earn” is a category error. You are leaving a game balance that can be wagered, limited, or withdrawn under that site’s rules.

On PVPspinArena the balance is dollars after a USDC or ETH deposit on Base. Jackpot, Coinflip and Roulette are player-versus-player games. They are not a money-market fund. If you want the deposit steps, that is [USDC casino](/guides/usdc-casino), not this page.

A win on Coinflip is not yield. It is a bet that settled. A loss is not a “negative APY.” Mixing gambling results into a savings spreadsheet is how people convince themselves they have a rate. They have a hobby with a house fee or a PvP fee and a lot of variance.

If you withdraw back to your wallet, that USDC can go into a yield product later. That is a new decision, after the game. Do not leave extra on the site “in case a rate appears.” It will not appear. Withdraw what you are not about to play.

### Do not mix the piles

1. **Spend pile**: a hot wallet or the site balance, sized as a gambling budget you can lose.
2. **Cash pile**: USDC you might send next week, sitting in a wallet you control, earning nothing unless you choose a yield product on purpose.
3. **Yield pile** (optional, never required): only money you can leave in a product whose risks you can name.

If a casino advertises “earn APY on your balance,” read the terms. You may be lending to the house, sitting in their bank, or looking at a number they can change. That is not the same as holding USDC in self-custody.

For the broader stablecoin category, [what is a stablecoin](/guides/what-is-a-stablecoin) stays on pegs and designs. This page will not retell it.`,
    },
    {
      id: "worked",
      title: "Worked example: a headline rate versus dollars in a year",
      body: `Illustrative only. Not a forecast.

You see 5% APY advertised on 1,000 USDC.

1. If the rate stayed 5% for a year and compounded as advertised, the brochure profit is about 50 USDC.
2. If the rate drops to 1% after a month, the rest of the year is 1%. Your actual take is much closer to 10–15 USDC before any fee, not 50.
3. If the platform pauses withdrawals for 90 days, you did not have 1,000 USDC. You had a claim.
4. If the contract is exploited in month two, the APY was a rounding error on a 100% loss.

| Outcome | Rough result on 1,000 USDC | Lesson |
| --- | --- | --- |
| Rate holds 5% all year, product is honest | About +50 before tax | Still issuer + platform risk |
| Rate dies in a month | Small single-digit gain | Headlines are not contracts |
| Withdrawal freeze | 1,000 stuck | Yield is not liquidity |
| Failure | 0 | APY does not cap loss |

Tax treatment depends on where you live. We are not your accountant.

If you came here from a gambling tab, size the gaming wallet first. Yield is a separate decision for a separate pile.`,
    },
    {
      id: "practical",
      title: "A boring checklist (still not advice)",
      body: `- Name the borrower or the company. If you cannot, skip it.
- Read whether you can exit today.
- Separate casino money from yield money. Never leave a gambling balance to “earn.”
- Prefer products you can explain in one sentence to a sceptical friend.
- Watch for incentive tokens that make the APY look tall.
- Never send a seed phrase to “enable yield.”
- You must be 18 or over to gamble. Yield products have their own age and region rules.

If chasing a USDC savings rate has become a way to fund more play, stop. Use the [responsible gambling](/responsible-gambling) page. A rate is not a strategy for Jackpot.`,
    },
  ],
  faqs: [
    {
      q: "What is USDC APY?",
      a: "It is an advertised yearly rate for lending or placing USDC in a CeFi or DeFi product. The token in a plain wallet does not pay that rate.",
    },
    {
      q: "Does a casino balance earn USDC interest?",
      a: "No. A casino ledger is for play. It is not an interest account and it is not Circle yield.",
    },
    {
      q: "Is Circle yield the same as holding USDC?",
      a: "No. Circle issues USDC. A yield program is a separate product with eligibility and extra risk.",
    },
    {
      q: "Can USDC yield go to zero?",
      a: "Yes. Borrow demand can vanish, incentives can end, and a platform can close the program. You can also lose the principal.",
    },
    {
      q: "Is this financial advice?",
      a: "No. It is an educational explanation of where advertised rates come from and what can go wrong.",
    },
    {
      q: "Does PVPspinArena pay APY on deposits?",
      a: "No. Deposits become a dollar game balance for PvP. Withdrawals go back as crypto, not as interest.",
    },
  ],
  sources: [
    { label: "Circle: USDC", url: "https://www.circle.com/en/usdc" },
    {
      label: "SEC: Investor alerts",
      url: "https://www.sec.gov/resources-for-investors/investor-alerts-bulletins",
    },
    {
      label: "FTC: What to know about cryptocurrency and scams",
      url: "https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-and-scams",
    },
  ],
  related: [
    "usdc-casino",
    "what-is-usdc",
    "what-is-a-stablecoin",
    "stablecoin-casino",
    "usdt-casino",
  ],
  updated: "2026-09-26",
};
