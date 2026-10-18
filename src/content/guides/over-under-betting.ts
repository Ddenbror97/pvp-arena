import type { Guide } from "./types";

export const guide: Guide = {
  slug: "over-under-betting",
  cluster: "Sports betting",
  keyword: "over under betting explained",
  secondary: ["what is over under", "totals betting", "over under sports", "point total bet"],
  title: "Over Under Betting Explained: Totals and Juice",
  description:
    "Over under betting explained: how a total is set, why both sides carry juice, alternate lines, and a worked $15 slip that is not a roulette over.",
  h1: "Over under betting explained: a total, two juiced sides",
  answer:
    "Over under betting explained: the book posts a total — points, goals, runs — and you bet whether the combined score goes over or under that number. Both sides usually carry juice, often −110/−110. A push on a whole-number total typically refunds the stake. PVPspinArena is not a sportsbook and does not post game totals.",
  facts: [
    "An over/under (total) is a bet on a counted stat versus a posted number, not on which team wins.",
    "Over cashes if the total is strictly above the number; under cashes if it is strictly below.",
    "A whole-number total can push; a half point (44.5) cannot.",
    "Standard juice on both sides means a .500 over/under record still loses money.",
    "PVPspinArena does not take totals. A roulette colour is not an “over.”",
  ],
  sections: [
    {
      id: "what",
      title: "What an over/under is",
      body: `A total is a line on how much scoring (or another counted thing) the book will take action on. You are not picking a winner. You are picking a side of a number. That is over under betting explained in one breath.

This [sports betting topic](/guides/topics/sports-betting) page is for adults 18+. No picks. [What is sports betting](/guides/what-is-sports-betting) is the pillar. [Point spread](/guides/point-spread-explained) is the handicap on a winner. [Moneyline](/guides/moneyline-betting-explained) is the winner without a handicap. Totals are the third classic ticket.

House rules matter more than people think. Do they count overtime? Which player’s minutes count on a prop total? Is a shortened game “action”? Read the market text once. Settlement arguments after a rain delay are how people stay in chat instead of closing the book.

“Game total” and “first-half total” are different contracts. A 24–17 first half can cash a first-half over and still miss a full-game over if the second half dies. Over under betting explained poorly is when those two tickets share a brain. Write which clock the number belongs to.`,
    },
    {
      id: "set",
      title: "How totals are set and moved",
      body: `A total opens where the book will take both sides, then moves with weather, injuries, pace news and money. A total that drops from 48.5 to 45.5 is not nature apologizing. It is a re-quote.

What commonly moves a points total:

- **Injuries** to a quarterback, a closer, a number-one scorer.
- **Weather** in outdoor sports: wind and rain often push totals down.
- **Pace and whistle.** Two fast teams can keep a number high even if both defences look “good” on a graphic.
- **Handle.** One-sided public overs are a stereotype because they are often true.

You do not need a desk job to use this. You need to stop treating the first 44.5 you saw as a fact about the universe. [How sports betting works](/guides/how-does-sports-betting-work) is the same offer/move story as moneylines.

Pace is not a vibe. If you cannot name a reason the total should be wrong — a missing starter, a 20-mph wind, a whistle-happy crew — you have a feeling. Feelings do not beat −110. They generate handle.

Team totals (one side’s points only) and player props are totals with thinner markets and, usually, worse juice. Start with the game total if you are still learning the contract.

A team total is still a two-way juiced number. Over 22.5 on Home is not a moneyline in costume. Home can win 21–20 and miss that over. If your opinion is “Home wins a low-scoring slog,” you may want a moneyline or a spread, not a team over. Match the ticket to the sentence or you will cash the wrong one and call the book wrong.`,
    },
    {
      id: "juice",
      title: "Juice on both sides of a total",
      body: `The number 44.5 is not the whole price. The −110 next to Over and Under is the fee.

**Illustration (not a pick):** Over 44.5 −110, Under 44.5 −110.

| Side | Total | American | Implied | $22 to win |
| --- | --- | --- | --- | --- |
| Over | 44.5 | −110 | 52.38% | $20 |
| Under | 44.5 | −110 | 52.38% | $20 |
| Sum | — | — | 104.76% | — |

A .500 record on these tickets loses. You need more than 52.38% correct sides to break even. [Implied probability](/guides/implied-probability) is the conversion. [House edge](/guides/house-edge) is the cousin name.

Sometimes the book leaves 44.5 alone and shades to Over −115 / Under −105. That is still a hold. Add the implied chances with the [odds converter](/guides/odds-converter). If you only look at the 44.5, you missed the product.

A second juice illustration: Over 44.5 −115, Under 44.5 −105. Implied 53.49% and 51.22%, sum 104.71%. The hold is similar to −110/−110, but the over is more expensive. If you always click Over because “games go over,” you have volunteered for the worse side of a shaded pair.`,
    },
    {
      id: "worked",
      title: "Worked $15 illustration",
      body: `**Illustration (not a pick):** $15 on Over 44.5 at −110 (stake box, so you win about $13.64).

| Combined points | Over ticket | Under ticket (if you had taken it) |
| --- | --- | --- |
| 45 or more | +$13.64 | −$15 |
| 44 or fewer | −$15 | +$13.64 |
| Exactly 44.5 | impossible | impossible |
| Exactly 45 on a 45 / 45 line | push, $15 back | push, $15 back |

On a whole-number 45, a 45–0-style final that sums to 45 is a push on most US books. The hook at 44.5 exists so that final cannot sit on the number.

If you instead bought Over 47.5 at plus money, you bought a harder number at a better payout. Write both. Alt totals are where people remember only the friendlier 41.5 and forget they laid a worse American price.

This $15 is a teaching stake, not a unit we recommend. [How to bet on sports](/guides/how-to-bet-on-sports) sizes from a budget you can lose.

A second cash walk-through: $40 on Under 41.5 at +100 (even money). If the game finishes 20–20, you profit $40. If it finishes 24–21, you lose $40. Plus-money on a tougher under is not “free.” You bought a harder number. Write 41.5 and +100 together or you will remember only the plus.`,
    },
    {
      id: "alts",
      title: "Alternate totals and live totals",
      body: `Alternate totals let you pick a different X. Lower overs are more likely and pay less (or ask more juice). Higher overs are less likely and pay more. That trade is coherent if you convert it. It is a vig farm if you only shop the X that matches a narrative (“this game has to be a shootout”).

Live totals re-quote after every score. An under at 38.5 late in a 24–10 game is a new contract, not a continuation of your pre-game 44.5. Cash-out on a total is also a new offer. [How to win at sports betting](/guides/how-to-win-at-sports-betting) will not call live unders a system.

Live boards multiply decisions per hour. More juiced decisions is how a planned $15 illustration becomes a $150 night. Speed is not a discount.

Alternate player totals — hits, threes, rushing yards — are the same contract with thinner markets. The juice is often worse and the void rules are pickier (must start, minimum innings). If you cannot recite the void rule, you do not have a prop. You have a hope.

Weather totals deserve a written reason. “It might rain” is not a reason. A named wind number, a delayed start, or a starting pitcher change is a reason. If you cannot put the reason in the log, you are guessing which way the public already went.

[Parlay](/guides/parlay-betting-explained) tiles love stacking a total with a moneyline. That correlation is why the SGP engine exists. If you cannot price the stack, place the single or place nothing.`,
    },
    {
      id: "vs",
      title: "Totals versus spreads versus moneylines",
      body: `Pick the contract that matches the opinion.

- **Moneyline:** who wins.
- **Spread:** who covers a handicap.
- **Total:** how much scoring (or the listed stat).

A coherent opinion can still be minus-EV after juice. “I think this is a 40-point game” is not automatically an under at 44.5 −110. You need the 44.5 to be the wrong number by more than the fee.

Esports uses round totals and map totals the same way. [Esports betting](/guides/esports-betting) is the title-specific page. The juice table does not change because the “points” are rounds on Mirage.

[Sports betting with crypto](/guides/sports-betting-with-crypto) does not make an under sharper. It changes the cashier.

Closing totals move like closing sides. If you took Under 45.5 and the number closed 44.0, you beat the close on that illustration even if the game went over. Log both columns if you care about process. If you only log the trophy, you will remember the 48–31 and forget you bought a soft number.

A total that lands on the posted number is a [push](/guides/push-in-betting), and the stake comes back. A goal market that ignores the total is [both teams to score](/guides/both-teams-to-score).`,
    },
    {
      id: "not-roulette",
      title: "A total is not a roulette over",
      body: `PVPspinArena does not post 44.5. [Roulette](/roulette) colours are slot counts: Purple is 16/33 at 2x, not “over 7.” Calling a colour an over is a category error. [Fairness](/fairness) verifies a seed, not a box score.

| Product | What “over” would mean | Actual product |
| --- | --- | --- |
| Sports total | Combined score vs a line | Juiced two-way book market |
| 33-slot wheel | Nothing useful | 2x on 16 Purple or 16 Silver, 14x on 1 Green |
| Jackpot | Nothing useful | Share of a pot |

If you lost an under and opened this lobby to “get over,” you are mixing products. Name the product or close both tabs.

A hashed pot does not care that the game finished 41–38. Do not bring a box score into [Jackpot](/) and expect the seed to settle an argument about 44.5.

If you want a counted random result you can verify, that is this site’s wheel or pot. If you want a counted sports result, that is a book’s total. Over under betting explained is the second thing. Mixing them is how a missed under becomes a Green click you did not budget.

Over under betting explained, on this domain, is literacy. We will not take the total in any state.

A last habit: before you tap Over or Under, say the void rule out loud. “Overtime counts. Minimum length applies. This is the game total, not the first half.” If you cannot say it, you do not have a total. You have a tile.

If two legal books show 44.5 −110 and 45.5 −110 on the same game, that half point is the whole product. Take the number that matches your sentence, not the number that matches a graphic. Shopping X is as real as shopping juice.`,
    },
    {
      id: "stop",
      title: "If live totals are already the whole night",
      body: `Chasing a missed over with a live over, then an alternate, then a player prop, is a common way totals get expensive. If you cannot watch a game without a number, the next page is not a sharper weather model.

Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). Use the [responsible gambling](/responsible-gambling) page for helplines such as 1-800-GAMBLER.

A total is supposed to be one decision. If your night is a stack of live unders, you are no longer pricing 44.5. You are paying juice by the hour. That is the moment to close the app, not to buy 43.5 because “one more stop.”

A total is a juiced two-way on a counted stat. If that is clear and you still cannot stop tapping, stop the account, not the converter.

Football keeps a total beside the three-way result. [Soccer betting](/guides/soccer-betting) is where the draw, the handicap and the goal line have to be read as different bets.`,
    },
  ],
  faqs: [
    {
      q: "What is over/under betting?",
      a: "A bet on whether a listed total — usually combined points — finishes over or under the book’s number. Both sides are typically juiced.",
    },
    {
      q: "What happens if the score lands on the total?",
      a: "On a whole number, most US books push and refund the stake. A half-point total cannot land exactly on the number.",
    },
    {
      q: "Does overtime count in a total?",
      a: "Often yes on US major-sport game totals, but not always on every league or prop. Read the market rules. This is not a universal law.",
    },
    {
      q: "Why do I lose if I go 10–10 on overs and unders?",
      a: "Because −110 juice means a .500 record is a losing process. You need more than 52.38% correct sides to break even on that illustration.",
    },
    {
      q: "Can I bet overs on PVPspinArena?",
      a: "No. This site is not a sportsbook. Roulette colours are not totals.",
    },
    {
      q: "Is an over easier than a moneyline?",
      a: "No. It is a different listed result with the same style of juice. A .500 record on −110 totals still loses money.",
    },
  ],
  sources: [
    { label: "Wikipedia: Over–under", url: "https://en.wikipedia.org/wiki/Over–under" },
    {
      label: "Wikipedia: Mathematics of bookmaking",
      url: "https://en.wikipedia.org/wiki/Mathematics_of_bookmaking",
    },
    { label: "UK Gambling Commission", url: "https://www.gamblingcommission.gov.uk/" },
  ],
  related: [
    "what-is-sports-betting",
    "point-spread-explained",
    "moneyline-betting-explained",
    "parlay-betting-explained",
    "implied-probability",
    "how-does-sports-betting-work",
  ],
  updated: "2026-09-26",
};
