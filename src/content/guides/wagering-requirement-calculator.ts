import type { Guide } from "./types";

export const guide: Guide = {
  slug: "wagering-requirement-calculator",
  cluster: "Games & odds",
  keyword: "casino wagering requirements",
  secondary: ["wagering calculator", "bonus turnover calculator", "playthrough calculator"],
  title: "Wagering Requirement Calculator for Bonuses",
  description:
    "Calculate what clearing a bonus actually costs: turnover, game weighting, time limits and whether the offer is worth taking at all.",
  h1: "Wagering Requirement Calculator: Bonus Turnover and True Value",
  answer:
    "Casino wagering requirements are the playthrough multiple attached to bonus money: you must stake a stated amount before cash-out unlocks. A wagering requirement calculator multiplies the base (bonus only, or deposit plus bonus) by the multiple, adjusts for game weighting, and estimates expected cost using house edge on that turnover. PVPspinArena does not run a welcome-bonus meter; Jackpot, Coinflip and Roulette post fees and edges instead. 18+ only.",
  facts: [
    "Turnover needed = wagering multiple × eligible base (bonus, or deposit + bonus).",
    "Game weighting can shrink how much a stake counts toward the meter.",
    "Expected cost of clearing ≈ effective turnover × house edge (teaching estimate).",
    "Time limits, max bets and max cash-outs can void value even when the multiple looks soft.",
    "A 0× offer with a huge headline can still be worse than no bonus if other rules are harsh — always price the full clause set.",
  ],
  sections: [
    {
      id: "playthrough",
      title: "What playthrough means",
      body: `Playthrough, rollover and wagering are player words for the same gate: promotional balance is locked until you have staked enough on eligible games.

### The core identity

Required handle H = M × B

- M = multiple (for example 35× or 40×).
- B = base the terms apply to.

If M = 40 and B = $25 bonus-only, H = $1,000 of weighted stakes. That is the homework. The gift is not $25 cash in your pocket.

### Why operators use it

An unconstrained credit is a cash drop. A meter buys a session. Operators are not confused about this; marketing is. Your job with a wagering calculator is to price the session before you deposit.

### Words that hide the same meter

- “Play through 30 times”
- “40× rollover on bonus”
- “Wagering contribution applies”

If two words appear in one PDF, find which number attaches to which word. Some rooms use rollover for deposit+bonus and playthrough for bonus-only. The calculator does not care about the label; it cares about M and B.

The deep explainer for clauses and sweepstakes wording is [casino wagering requirements](/guides/casino-wagering-requirements); this page is the arithmetic. Bonus taxonomy: [casino bonuses explained](/guides/casino-bonuses-explained).

Hub: [Games and odds](/guides/topics/games-and-odds). Adults only. Bring a pen; the banner will not do this homework for you.`,
    },
    {
      id: "base",
      title: "Bonus-only vs deposit-plus-bonus",
      body: `Read which base the PDF uses. The same “40×” headline hides two different H values.

| Deposit | Bonus | Multiple | Base rule | Required handle H |
| --- | --- | --- | --- | --- |
| $50 | $50 | 40× | Bonus only | $2,000 |
| $50 | $50 | 40× | Deposit + bonus | $4,000 |
| $20 | $100 | 30× | Bonus only | $3,000 |
| $20 | $100 | 30× | Deposit + bonus | $3,600 |
| $100 | $50 | 25× | Bonus only | $1,250 |
| $100 | $50 | 25× | Deposit + bonus | $3,750 |

### Worked misread

Player sees “100% match up to $50, 40× wagering,” deposits $50, gets $50 bonus, assumes H = $2,000. Terms say deposit + bonus. True H = $4,000. The calculator’s first job is to force that sentence into the open.

### Free spins base

Sometimes the base is winnings from spins, not face value of the spins. 20 spins that win $18 with 40× on winnings → H = $720, not 40× some “$2 per spin” fiction. Use the terms’ base, not the banner.

### Sticky bonuses vs locked bonuses

Some products let you wager deposit cash while bonus sits locked; others mix balances. The handle identity still holds, but cash-flow feel changes. If you cannot tell which dollars are clearing the meter, ask support to quote the clause — chat paraphrases are not terms.`,
    },
    {
      id: "cost",
      title: "Expected cost of clearing a bonus",
      body: `Once you know H, price the entertainment tax of clearing it.

### Teaching estimate

Expected loss while clearing ≈ H_eff × e

- H_eff is the real money that must pass through eligible games after weighting.
- e is the house edge of the games you will actually play.

### Worked $25 bonus, 40× bonus-only, slots at 4% edge

- H = $1,000.
- If slots weight 100%, H_eff = $1,000.
- Expected leak ≈ $40 while clearing.
- Net “gift” in expectation ≈ $25 − $40 = −$15 before any max-cash-out cap.

The bonus can still be fun. It is often negative EV homework. That is the calculator’s point.

### Worked $100 bonus, 20× bonus-only, 2% edge game at full weight

- H = $2,000.
- EL ≈ $40.
- Net vs gift ≈ +$60 in expectation — before time limits, max bets and caps. Still not free money; still a forced session.

### Lower edge games

If blackjack at ~0.5% edge weights 10%, you may need 10× the face stake to move the meter. H_eff balloons. See weighting next.

### Link to EV

Clearing cost is an [expected value](/guides/expected-value-gambling) problem on forced turnover, not a puzzle you solve with a progression. [House edge](/guides/house-edge) is the e in the product. Progressions that claim to “clear faster for free” still pay e on every extra dollar of handle.`,
    },
    {
      id: "weighting",
      title: "Game weighting effects",
      body: `Weighting w means a $1 stake contributes $w toward the meter.

Effective stake toward meter = stake × w

To finish handle H you need raw stakes ≈ H / w when w is constant.

### Table

| Face stake | Weight w | Contribution | Raw $ to finish $1,000 meter |
| --- | --- | --- | --- |
| $5 | 100% | $5 | $1,000 |
| $5 | 20% | $1 | $5,000 |
| $5 | 10% | $0.50 | $10,000 |
| $5 | 5% | $0.25 | $20,000 |
| $5 | 0% | $0 | Impossible on that game |

### Expected cost with weighting

If you clear on a game with edge e and weight w, rough expected loss ≈ (H / w) × e.

Example: H = $1,000, w = 0.1, e = 0.5% → raw handle $10,000 → expected leak ≈ $50.

Example: H = $2,000, w = 0.2, e = 1% → raw $10,000 → EL ≈ $100.

A “low edge” game with tiny weight can cost more to clear than 96% slots at full weight. Always multiply.

### Mixed weighting

If you split volume half slots (100%, e = 4%) and half tables (10%, e = 1%), the meter does not move linearly with cash spent. Track contribution dollars, not face stakes. A bonus turnover calculator that ignores w is fiction.

### PVPspinArena note

This site has no bonus weighting table. Pots and the wheel are priced with posted fees and edges on [how it works](/how-it-works) and live pages like [Coinflip](/coinflip).`,
    },
    {
      id: "time",
      title: "Time limits and their impact",
      body: `Multiples ignore the calendar. Terms do not.

### Clock math

If H = $4,000 and you can stake $200/day eligible, you need 20 days. A 7-day expiry makes the offer operationally impossible without raising stake size — which may hit a max-bet clause and void the bonus.

If H_eff = $1,000 after weighting and you play $50/hour eligible, you need about 20 hours. A 48-hour expiry is tight unless that is already your plan.

### Max bet while clearing

A $5 max bet on a $4,000 meter is at least 800 bets. At one minute each, that is 13+ hours of pure clicking. The calculator should output minimum bets ≈ H_eff / max_bet as a feasibility check.

### Max cash-out

A $25 no-deposit with 50× and a $50 cap means even a lucky clear is capped. Price the cap, not the fantasy balance. If EL while clearing is $40 and the cap is $50, you are doing homework for a thin upside.

### Void rules

Betting both sides, using excluded games, or exceeding max bet can reset the meter to zero. A playthrough calculator that ignores void rules overstates value. Country blocks and game exclusions belong in the same checklist as M and B.`,
    },
    {
      id: "worth",
      title: "Is the bonus worth taking",
      body: `Run this checklist before depositing for a match.

1. Compute H from the real base and multiple.
2. Apply weighting for the game you will play → H_eff.
3. Estimate EL ≈ H_eff × e.
4. Compare EL to bonus face value and to any max cash-out.
5. Check expiry vs feasible stake rate and max bet.
6. Check excluded games and country rules.
7. Ask whether you would have played that handle anyway.

### Decision rule (teaching)

If EL > bonus value and the cap is low, skip. If EL < bonus value and you would have played that volume anyway at the same edge, the bonus may soften a session you already planned — it still does not print free money.

If you would not have played that volume, the bonus is buying a larger session than your budget wanted. That is often the real cost.

### Rakeback contrast

Ongoing [rakeback](/guides/rakeback-explained) is a rebate on volume without a locked welcome meter. Different product. Do not paste rakeback % into a wagering multiple box.

### Foundations

If multiples and edges still blur, read [Foundations](/guides/topics/foundations) then return to the arithmetic. For stake sizing once you decide to play without a meter, use bankroll discipline — not a harder bonus.`,
    },
    {
      id: "worked",
      title: "Worked examples",
      body: `### Example 1 — soft-looking match

- Deposit $100, bonus $100, 25× on bonus only, slots 100% at 4% edge.
- H = $2,500. EL ≈ $100.
- Expected net vs taking $100 gift ≈ $0 before time caps. Borderline entertainment, not a coup.

### Example 2 — deposit + bonus trap

- Same money, 25× on D+B → H = $5,000. EL ≈ $200. Gift $100. Expected homework cost doubles.

### Example 3 — weighting trap

- $50 bonus, 40× bonus-only → H = $2,000.
- Tables weight 10%, edge 1%.
- Raw handle $20,000. EL ≈ $200. Skip unless you love that table volume.

### Example 4 — no-deposit spins

- Wins $12, 50× on winnings, slots 100%, e = 5%.
- H = $600. EL ≈ $30. Cap $20. Even a clear is capped below expected leak. Poor offer.

### Example 5 — compare to no bonus

Playing $2,500 handle on 4% slots without a bonus: EL ≈ $100. With Example 1’s $100 bonus and same handle, EL ≈ $100 against a $100 credit — similar mean, different lock-in stress. The meter’s real cost is often optionality and rules, not only EL.

### Example 6 — time fail

- H = $3,000, max bet $10, expiry 24 hours.
- Minimum 300 bets. At 30 seconds each, 2.5 hours of nonstop play — possible but grim. If you also sleep and work, the offer fails the clock before it fails the edge.

### Example 7 — high multiple, high weight, low edge

- $200 bonus, 50× bonus-only, H = $10,000, game e = 0.5% at 100% weight.
- EL ≈ $50. Looks good on paper. Then read the $20 max cash-out — and walk away.

### Example 8 — full worksheet

Offer: deposit $75, 100% match, 35× on deposit + bonus, slots 100% at 3.5% edge, 14-day expiry, $5 max bet while clearing, $200 max cash-out.

1. B = $150. M = 35. H = $5,250.
2. w = 1 → H_eff = $5,250.
3. EL ≈ $5,250 × 0.035 ≈ $184.
4. Gift face = $75. EL > gift. Cap $200 does not rescue the mean.
5. Min bets ≈ 5,250 / 5 = 1,050. At one minute each, 17+ hours inside 14 days — possible, unpleasant.
6. Verdict: skip unless you already planned ~$5k slot handle for fun and accept ~$184 expected cost for a $75 credit with lock-in.

### Example 9 — honest “maybe”

Same as Example 1 but you already play $2,500/month on those slots. The bonus does not increase your planned handle; it only adds rules. If the rules are mild and EL ≈ gift, taking it is optional softener — still not a strategy to get rich.

Home: [PVPspinArena](/). Help if bonuses are chasing fuel: [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "How do I calculate casino wagering requirements?",
      a: "Multiply the wagering multiple by the eligible base (bonus only or deposit plus bonus). Adjust for game weighting to get the real handle you must put through.",
    },
    {
      q: "What is the expected cost of clearing a bonus?",
      a: "As a teaching estimate, multiply effective turnover by the house edge of the games you use to clear. Compare that to the bonus value and any cash-out cap.",
    },
    {
      q: "Does 100% game weighting mean the bonus is good?",
      a: "No. It only means stakes count fully toward the meter. You still pay edge on that turnover and must satisfy time and max-bet rules.",
    },
    {
      q: "Bonus-only or deposit-plus-bonus — which is better?",
      a: "Bonus-only needs less handle for the same multiple. Always read which base the terms use; the banner rarely stresses the difference.",
    },
    {
      q: "Does PVPspinArena have wagering requirements?",
      a: "No welcome-bonus playthrough meter. Games are Jackpot, Coinflip and Roulette with posted fees and edges instead of rollover homework.",
    },
  ],
  sources: [
    {
      label: "UK Gambling Commission — bonuses and promotions guidance hub",
      url: "https://www.gamblingcommission.gov.uk/",
    },
    { label: "Wikipedia: House edge (gambling)", url: "https://en.wikipedia.org/wiki/House_edge" },
  ],
  related: [
    "casino-wagering-requirements",
    "casino-bonuses-explained",
    "house-edge",
    "expected-value-gambling",
    "rakeback-explained",
  ],
  updated: "2026-09-26",
};
