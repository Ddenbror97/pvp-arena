import type { Guide } from "./types";

export const guide: Guide = {
  slug: "futures-bet",
  cluster: "Sports betting",
  keyword: "futures bet",
  secondary: ["championship odds", "season win total", "mvp futures price"],
  title: "Futures Bets Explained: Odds, Hold and Hedging Tips",
  description:
    "How futures bets work for championships, MVPs and win totals, why futures carry high hold, and when to hedge or cash out before the season ends.",
  h1: "Futures bet: a price that waits on a season",
  answer:
    "Futures bet is a wager on a result that settles later, such as a championship, a league MVP, or a team's win total, at odds the book posts before that result exists. The ticket can sit for months. The board usually holds more margin than a single-game spread, because many outcomes are priced at once and the book keeps your stake the whole time. Hedging or cashing out later is a new price, not a refund of that margin. This is not betting advice. Adults 18+.",
  facts: [
    "A futures ticket grades at the end of the event it names, not at the end of the week you bet it.",
    "Championship, MVP, and win-total markets are different products with different hold shapes.",
    "A board of longshots can sum well past 100 percent implied probability even in a tiny example.",
    "Your stake is tied up until settlement, a hedge, or a cash-out offer you accept.",
    "A hedge locks a number only when the new bet truly opposes the original ticket.",
    "Cash out closes the ticket at the book's new price and does not restore the opening odds.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What a futures bet is",
      body: `A futures bet is a price on something that has not finished, and often has not started. You stake now. The book settles when the championship is decided, when the award is announced, or when the team's wins are complete. Until then the ticket is open. The odds you took do not update in your favor if the team improves. You already have your price. The board's new price is for someone else, unless you hedge or cash out.

The long calendar is the product. A Sunday spread is over that night. A title price can still be alive in the spring. Injuries, trades, and schedule strength happen while the stake is unavailable. That is not a hidden fee on the receipt. It is time, and time has a cost if you needed the money for anything else. [Moneyline betting](/guides/moneyline-betting-explained) is the single-game cousin. A futures moneyline on a title is the same American-odds object with a much longer life.

[Sports betting guides](/guides/topics/sports-betting) cover the short-priced markets these tickets get confused with. A futures bet is not a parlay of regular-season games unless the slip says it is. Read the settlement sentence. "Wins the championship" is not "wins the division" and not "makes the final." The noun on the ticket is the grade.`,
    },
    {
      id: "three-markets",
      title: "Championships, MVPs, and win totals",
      body: `A championship future is one winner out of many teams. You are buying a longshot or a short favorite against the field, and every other team is also priced. An MVP future is the same shape with players instead of teams. The field is large, the hold is usually wide, and a player can miss time without the ticket voiding, unless the rule says otherwise. Read whether a trade or an injury has any effect. Often it does not. You bet the player, and the player has to win the award under the definition the book used.

A win total is closer to a normal total. The book hangs a number of wins, such as 10.5, and you take over or under. It is still a future because it waits on a season, not a night. The juice is often fatter than a Sunday total, and the result moves with schedule changes and rest that you cannot see in October. [NFL betting](/guides/nfl-betting) is one league where all three menus exist. College awards and conference titles are a different calendar. The NCAA runs college sport. It does not post your book's win total.

These markets do not share one settlement clock. A championship might need the final game. An MVP might use a ballot the book named. A win total might count only regular-season games and ignore the postseason. Betting the wrong noun is a loss even when "your team had a great year." The year is not the market.`,
    },
    {
      id: "high-hold",
      title: "Why the hold on a futures board is wide",
      body: `Add the implied probabilities. A plus price implies 100 / (price + 100). A four-team toy board, invented for the arithmetic and not copied from any league, might look like this. Team A +200 is 100/300, about 33.33 percent. Team B +250 is 100/350, about 28.57 percent. Team C +300 is 25 percent. Team D +350 is 100/450, about 22.22 percent. The sum is about 109.13 percent. Overround is about 9.1 points, on only four prices. A real championship board has far more teams, and each extra longshot the book posts can add another slice of implied probability. The sum climbs. That is the shape of futures hold. It is not a measured hold for a named league, and this page will not invent one.

| Team on a toy board | Price | Implied probability |
| --- | --- | --- |
| A | +200 | about 33.33% |
| B | +250 | about 28.57% |
| C | +300 | 25% |
| D | +350 | about 22.22% |
| Sum |  | about 109.13% |

[Implied probability](/guides/implied-probability) is the conversion. The second worked observation is the comparison with a Sunday pair. Two sides at −110 sum to about 104.8 percent. The toy futures board, with four teams and no claim to be realistic, already sums higher. A 30-team board can be wider still. You do not need a fake percentage from a sportsbook ad to see the direction. More outcomes, each priced with juice, make a larger sum. Your ticket is one row. The hold is the sum of the rows.

Win totals are two-way, so they will not sum like a 30-team outright. They can still be −120 each side instead of −110. Convert them anyway. "It is just a total" does not mean Sunday juice.`,
    },
    {
      id: "hedge-later",
      title: "When a hedge before the end can lock a number",
      body: `A hedge is a second bet that wins if the original ticket loses. On a futures bet, that often means betting against your team once it is close to the title, or betting the opponent in a final. The size is arithmetic. [Hedge betting](/guides/hedge-betting) has the full calculator. One illustration belongs here so the scale is obvious.

You hold $50 at +800. If the team wins the title, profit is $400 and the stake at risk was $50. Suppose the opponent in a final is −200, an illustrative price. Net odds on −200 are 100/200 = 0.5. The hedge stake that matches both outcomes is (400 + 50) / (1 + 0.5) = $300. If the original wins, you make $400 and lose the $300 hedge, net +$100. If the hedge wins, you make $150 and lose the $50 original, net +$100. You locked $100 by laying out $300 of new money to protect a $50 ticket.

| Outcome | Original $50 at +800 | Hedge $300 at −200 | Net |
| --- | --- | --- | --- |
| Your team wins the title | +$400 | −$300 | +$100 |
| Opponent wins | −$50 | +$150 | +$100 |

That lock is not free and not always available. The opponent may be −400, and the locked number can turn negative. The hedge has to oppose the same outcome. Betting a regular-season side does not settle a championship ticket. Passing on the hedge keeps the $400 upside and the chance of losing $50. Both are allowed. Neither is advice. Adults 18+.`,
    },
    {
      id: "cash-out",
      title: "Cash out is a new price, not the old ticket",
      body: `[Cash out betting](/guides/cash-out-betting) is the book offering to close the futures ticket for a number it names. You do not place the opposing bet yourself. The original ticket disappears if you accept. The offer is often worse than a hedge you could fill at a fair opposing price, and sometimes it is the only exit because no opposing price exists yet. Compare the offer with the locked net from the hedge equation before you tap it. If you cannot fill a hedge, the comparison is the offer versus holding.

Cash out does not give you the opening price back. A team you took at +800 might cash out at a small profit after a hot month, which feels like skill and is a new contract. You sold the rest of the season. If the team then wins the title, the sale is the whole story. If the team falls apart, the sale saved the stake. You cannot know which story you are in. You can know whether the number on the button is one you wrote down as acceptable before you opened the app.

Early cash out also interacts with the hold you already paid. The board was wide when you entered. The exit price includes a margin again. Two margins and a long tie-up of stake are the cost of "just having a future on." If that sentence is the entire reason for the bet, the ticket is entertainment with a clock. Price it that way, and do not describe the clock as an investment.`,
    },
    {
      id: "checklist",
      title: "A checklist for a long-dated ticket",
      body: `The season is long enough to forget what you bought. Write it down on day one.

- Name the exact result that grades the ticket, including regular season versus playoffs.
- Convert the price to an implied probability and note the other prices on that board if you can see them.
- Decide what happens to the stake if it is tied up for months.
- Write the hedge or cash-out net that would make you close, before that button appears.
- Confirm a hedge market actually opposes the ticket, or do not call it a hedge.
- Keep the stake inside money you can lose. Adults 18+. This is not betting advice.

The [responsible gambling](/responsible-gambling) page is the stop if an open future has become a reason to bet the team every week on top of it. The future is already the position.`,
    },
    {
      id: "pvp-contrast",
      title: "Season-long juice versus a pot that is shared",
      body: `Sportsbooks charge vig on a futures board by hanging more implied probability than a fair book, then holding the stake until the result. The toy four-team sum over 109 percent is the picture, not a league's real menu. Hedging and cash out add another price. They do not refund the width of the board you entered.

A PvP pot is shared among the players in the pot. It settles on a round, not on a season-long award, and it is not a championship price. [Fairness](/fairness) explains how this site's rounds can be checked. [Jackpot](/) is the pot, not a futures ticket. This page states no player counts, no rake, and no jackpot size. Adults 18+. Nothing here is betting advice.`,
    },
  ],
  faqs: [
    {
      q: "How does a futures bet settle?",
      a: "It settles when the named result exists, under the definition on the ticket. A championship future needs that title, not a strong regular season. An MVP future needs the award the book named. A win total needs the count of wins the market included, often regular season only. The odds you took stay the odds. Newer prices are for new bets, hedges, or cash out. If the noun on the slip is vague, do not guess. Adults 18+.",
    },
    {
      q: "Why is the hold on futures higher?",
      a: "Because the book prices many outcomes at once, and each price carries margin. A toy four-team board at +200, +250, +300, and +350 sums to about 109 percent implied probability, already wider than a pair of −110 sides near 105 percent. A real board with more teams can be wider. Those toy prices are not a league's odds. They show the direction. Your stake also sits until the result, which a Sunday bet does not ask for.",
    },
    {
      q: "When should you hedge a futures bet?",
      a: "When an opposing price exists on the same outcome and the hedge stake locks a net you prefer to the full swing. The illustration of $50 at +800 against −200 locks $100 only by staking $300 more. A shorter opponent price can lock a loss instead. Hedging a different market, such as a regular-season side, does not close a title ticket. Compute the net first. This is not advice to hedge or to hold.",
    },
    {
      q: "Is cash out better than a hedge?",
      a: "Cash out is the book closing your ticket at its number. A hedge keeps the ticket and adds a bet you size. Compare the cash-out offer with the locked net of a hedge you can actually fill. If the offer is worse and the hedge is available, the hedge is the richer exit on those inputs. If no opposing bet exists, cash out may be the only way to close. Neither exit restores the opening odds. Both are new prices.",
    },
    {
      q: "Do win totals work like championship odds?",
      a: "They both wait, and they are different shapes. A championship price is one winner out of a field, so the hold is the sum of many implied probabilities. A win total is over or under a number of wins, closer to a game total with a longer clock and often fatter juice. Convert both sides anyway. Do not assume Sunday −110 because the word total is on the screen.",
    },
  ],
  sources: [
    { label: "National Football League", url: "https://www.nfl.com" },
    { label: "NCAA", url: "https://www.ncaa.org" },
  ],
  related: [
    "cash-out-betting",
    "implied-probability",
    "moneyline-betting-explained",
    "nfl-betting",
  ],
  updated: "2026-10-06",
};
