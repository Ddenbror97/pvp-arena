import type { Guide } from "./types";

export const guide: Guide = {
  slug: "matched-betting",
  cluster: "Sports betting",
  keyword: "matched betting",
  secondary: [
    "matched betting calculator",
    "matched betting explained",
    "qualifying bet",
    "free bet lay stake",
  ],
  title: "Matched Betting Explained: The Maths, Costs and Limits",
  description:
    "How matched betting works: back at a bookmaker, lay on an exchange, the lay-stake formula, a qualifying loss, a free bet worked out, and account limits.",
  h1: "Matched betting explained: the maths, the costs and the limits",
  answer:
    "Matched betting is backing an outcome with a bookmaker and laying the same outcome on a betting exchange, so that whichever way the event goes the two bets roughly cancel out and the bookmaker's free bet or bonus is what you keep. The result does not depend on predicting the match. It depends on close prices, exchange commission and the bonus terms, and bookmakers can limit accounts that only take offers.",
  facts: [
    "Matched betting pairs a back bet at a bookmaker with a lay bet on an exchange.",
    "Lay stake = back stake × back odds ÷ (lay odds − commission), for a normal cash bet.",
    "The qualifying bet usually loses a little; that small loss is the cost of unlocking the offer.",
    "A stake-not-returned free bet is worth less than its face value once it is laid off.",
    "Bookmakers can restrict stakes or offers on accounts that only bet on promotions.",
  ],
  sections: [
    {
      id: "how",
      title: "How matched betting works",
      body: `A bookmaker offers a promotion, typically "bet $10, get a $10 free bet". You place the qualifying bet with the bookmaker (a **back** bet: you win if the outcome happens). At the same time you place a **lay** bet on the same outcome on a betting exchange: you win if it does not happen, because you are acting as the bookmaker for another exchange user.

If the two prices are close, the back and the lay cancel each other. You lose a little on the qualifying bet, then use the free bet the same way. Because a free bet risks none of your own money, laying it off locks in most of its value whichever side wins.

Two things make the exchange half possible. First, an exchange lets you lay at all; see [betting exchanges explained](/guides/betting-exchange-explained). Second, the exchange charges **commission** on net winnings in a market, so every lay is priced with that fee in mind. Matched betting is related to [arbitrage betting](/guides/arbitrage-betting), which looks for a price gap without a bonus, and to [hedge betting](/guides/hedge-betting), which offsets a bet you already hold. The whole family sits in the [sports betting topic](/guides/topics/sports-betting).`,
    },
    {
      id: "formula",
      title: "The lay-stake formula and a qualifying bet",
      body: `For a normal (cash) back bet, the lay stake that leaves the same result either way is:

**Lay stake = back stake × back odds ÷ (lay odds − commission)**

Commission is written as a decimal: 2% is 0.02.

**Worked example: qualifying bet.** You back $10 at decimal odds of 3.00 with the bookmaker. The exchange lay price is 3.10 and commission is 2%.

- Lay stake = 10 × 3.00 ÷ (3.10 − 0.02) = 30 ÷ 3.08 = **$9.74**.
- Your lay **liability** (what you pay if the outcome happens) = 9.74 × (3.10 − 1) = **$20.45**.

| Outcome | Bookmaker bet | Exchange lay | Net |
| --- | --- | --- | --- |
| Back wins | +$20.00 | −$20.45 | **−$0.45** |
| Back loses | −$10.00 | +$9.74 × 0.98 = +$9.55 | **−$0.45** |

The $0.45 is the **qualifying loss**: the price of unlocking the free bet. The exchange must hold the liability ($20.45) in your account before the lay is matched, so you need that money available, not just the $10 back stake. Smarkets' help centre shows the same [lay liability calculation](https://help.smarkets.com/hc/en-gb/articles/115003381865-How-to-calculate-the-liability-of-a-lay-bet).`,
    },
    {
      id: "free-bet",
      title: "Laying off a free bet",
      body: `Most free bets are **stake not returned (SNR)**: if a $10 free bet wins at 5.00, you receive the $40 profit but not the $10 stake. So the formula uses (back odds − 1):

**Lay stake (SNR free bet) = free bet × (back odds − 1) ÷ (lay odds − commission)**

**Worked example.** A $10 SNR free bet backed at 5.00, laid at 5.20 with 2% commission.

- Lay stake = 10 × 4.00 ÷ (5.20 − 0.02) = 40 ÷ 5.18 = **$7.72**.
- Liability = 7.72 × 4.20 = **$32.43**.

| Outcome | Free bet | Exchange lay | Net |
| --- | --- | --- | --- |
| Back wins | +$40.00 | −$32.43 | **+$7.57** |
| Back loses | $0 | +$7.72 × 0.98 = +$7.57 | **+$7.57** |

The "$10" free bet is worth about $7.57, and after the $0.45 qualifying loss the whole offer nets about **$7.12**. Higher back odds usually keep more of a free bet's value, but they also raise the liability you must fund on the exchange. A [bonus bet](/guides/bonus-bets-explained) page explains the stake-returned and stake-not-returned wording you will see in terms.`,
    },
    {
      id: "costs",
      title: "What eats the margin",
      body: `The tables above assume the prices are still there when you click. In practice:

- **Price movement.** If the lay price moves before your lay is matched, the two sides no longer cancel. Place the lay first and check it is fully matched, or accept that a partly matched lay leaves you exposed.
- **Commission.** Exchanges charge a percentage of net winnings in each market. Smarkets explains [why it charges commission](https://help.smarkets.com/hc/en-gb/articles/212654725-Why-do-Smarkets-charge-commission) and gives a [commission breakdown](https://help.smarkets.com/hc/en-gb/articles/212106009-Commission-breakdown); other exchanges use other rates.
- **Terms.** Minimum odds, qualifying markets, expiry dates, one-offer-per-household rules and "bet must settle within 7 days" clauses decide whether the bonus pays at all. A missed condition turns the qualifying loss into a plain loss.
- **Wagering requirements.** Casino-style bonuses that must be wagered many times are a different product; the [wagering requirement calculator](/guides/wagering-requirement-calculator) shows why they are rarely worth matching.`,
    },
    {
      id: "limits",
      title: "Account limits, legality and tax",
      body: `Matched betting uses offers as written. It is not cheating the event. But a bookmaker sets its own commercial rules: it can restrict the stake you may place, stop sending offers ("gubbing"), or close an account that only bets on promotions. Expect that to happen; it is the usual end of a matched betting run, not a malfunction.

Whether matched betting is permitted where you live depends on whether the bookmaker and the exchange are licensed for you. Many US states license sportsbooks but not betting exchanges, so the lay side may not exist. Check [where sports betting is legal](/guides/sports-betting-legal-states) and use only licensed operators. Tax treatment also varies by country: in the United States, gambling winnings are taxable income and losses are only deductible within the IRS rules in [Topic 419](https://www.irs.gov/taxtopics/tc419). Keep a log of every back, lay, commission and bonus, so you can show the net result.

Adults only, 18 or the higher age your law sets. This guide explains the arithmetic; it is not legal or tax advice. PVPspinArena does not run a sportsbook or an exchange, and any promotional credit it gives follows its own [terms](/terms), not a bookmaker's. Its games are player-versus-player pots explained on [how it works](/how-it-works). If betting stops being a fixed, affordable spend, stop and read [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "Is matched betting risk-free?",
      a: "No. The maths removes most of the outcome risk only if both bets are placed at the planned prices, the lay is fully matched and the offer pays under its terms. Price moves, unmatched lays, mistakes and voided bonuses all create losses.",
    },
    {
      q: "What is a qualifying loss?",
      a: "The small loss on the first, cash bet you place to unlock a free bet. In this guide's example, backing $10 at 3.00 and laying at 3.10 with 2% commission loses $0.45 whichever side wins.",
    },
    {
      q: "Why is a $10 free bet worth less than $10?",
      a: "Most free bets are stake not returned: a win pays the profit but not the $10 stake. Laid off at 5.00/5.20 with 2% commission, the example free bet is worth about $7.57.",
    },
    {
      q: "Why do bookmakers limit matched bettors?",
      a: "A bookmaker's offers are priced for customers who keep betting. Accounts that only take offers and lay them off are unprofitable for the book, so it may cut stakes or stop offers. That is a commercial decision within its terms.",
    },
    {
      q: "Can I do matched betting in the US?",
      a: "Only where both sides exist legally for you. Many states license sportsbooks but not betting exchanges, so there may be no licensed way to lay. Check your state's regulator first.",
    },
  ],
  sources: [
    {
      label: "Smarkets: how to calculate the liability of a lay bet",
      url: "https://help.smarkets.com/hc/en-gb/articles/115003381865-How-to-calculate-the-liability-of-a-lay-bet",
    },
    {
      label: "Smarkets: what is lay betting on an exchange",
      url: "https://help.smarkets.com/hc/en-gb/articles/115003374849-What-is-lay-betting-on-an-exchange",
    },
    {
      label: "Smarkets: commission breakdown",
      url: "https://help.smarkets.com/hc/en-gb/articles/212106009-Commission-breakdown",
    },
    {
      label: "IRS Topic 419: gambling income and losses",
      url: "https://www.irs.gov/taxtopics/tc419",
    },
    { label: "GambleAware", url: "https://www.gambleaware.org/" },
  ],
  related: [
    "arbitrage-betting",
    "betting-exchange-explained",
    "bonus-bets-explained",
    "hedge-betting",
    "wagering-requirement-calculator",
  ],
  updated: "2026-11-18",
  cta: {
    title: "Prefer a pot you can check?",
    text: "PVPspinArena runs no sportsbook to match against. Jackpot pays the pot to one player, chance equal to stake share, with a 5% fee.",
    primary: { to: "/how-it-works", label: "How the games work" },
    secondary: { to: "/guides/betting-exchange-explained", label: "Betting exchanges explained" },
  },
};
