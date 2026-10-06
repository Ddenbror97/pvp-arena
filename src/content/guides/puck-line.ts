import type { Guide } from "./types";

export const guide: Guide = {
  slug: "puck-line",
  cluster: "Sports betting",
  keyword: "puck line",
  secondary: ["NHL puck line", "hockey spread", "puck line vs moneyline", "minus 1.5 hockey"],
  title: "Puck Line Betting: NHL Spreads Explained Simply",
  description:
    "The NHL puck line explained: how the 1.5-goal spread works, puck line vs moneyline odds, empty-net math and when the puck line offers value.",
  h1: "Puck Line Betting: NHL Spreads Explained Simply",
  answer:
    "Puck line betting is the National Hockey League's usual spread: a 1.5-goal handicap. The favorite at minus 1.5 must win by two or more goals. The underdog at plus 1.5 cashes by winning the game or by losing by exactly one. A one-goal game, including overtime and a shootout final, does not cover minus 1.5. The price next to 1.5 is a different contract from the moneyline. This page shows the settlement, the empty-net fork, and a labeled illustration. It is not a pick sheet. Adults 18+ only. PVPspinArena does not post hockey lines.",
  facts: [
    "The standard puck line is 1.5 goals: favorite minus 1.5, underdog plus 1.5.",
    "A one-goal final does not cover minus 1.5. Overtime and shootout wins are one-goal games on the scoreboard.",
    "Plus 1.5 covers an underdog win and also a loss by exactly one goal.",
    "An empty-net goal is the usual last-minute way a one-goal lead becomes a two-goal lead.",
    "The American price on minus 1.5 is not the moneyline. Each market has its own juice.",
    "PVPspinArena is not a sportsbook and does not grade hockey tickets. Adults 18+ only.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What the puck line is selling",
      body: `Puck line is a handicap market, not a prediction you are owed. The book posts minus 1.5 on the side it prices as the favorite and plus 1.5 on the other side. You are buying one of those two results at the American number printed beside it. If that number is not on your slip, you do not have the bet you remember from a preview.

Hockey scores in single goals, so 1.5 is a wide hook relative to a typical final. Many games end by one goal. Those games cash the underdog's puck line and lose the favorite's, even when the favorite's name is on the win column. That is the whole product. It is the hockey cousin of a [point spread](/guides/point-spread-explained), with the number fixed at one and a half instead of moving by half points all night.

Start with [Sports betting guides](/guides/topics/sports-betting) if the menu of prices is still new. A [moneyline](/guides/moneyline-betting-explained) asks only who wins. The puck line asks by how many. [Over/under betting](/guides/over-under-betting) asks a third question: how many total goals, not who covered.

Adults 18+ only. This is not legal advice and not a promo. PVPspinArena runs Jackpot, Coinflip and Roulette. It does not sell a puck line. [Fairness](/fairness) checks those hashed rounds. [Jackpot](/) is a shared pot, not an NHL handicap. If a session turns into chasing, stop and use [responsible gambling](/responsible-gambling).`,
    },
    {
      id: "settlement",
      title: "How minus 1.5 and plus 1.5 settle",
      body: `Minus means the favorite must clear the number. Plus means the underdog receives the number. There is no way to win a hockey game by one and a half goals, so a standard puck line does not push. The margin is either one (or a loss) or two-plus.

Read the market rules before you assume overtime. On most North American books the puck line uses the final score including overtime and the shootout. A shootout win is posted as one extra goal for the winner, so the final margin is one. The favorite can win the moneyline in extras and still lose minus 1.5. Some books also offer a regulation-only price. That is a different market. A regulation lead that later dies in overtime would grade differently there. The word "including overtime" on the coupon is the contract.

Alternate hockey spreads, such as minus 2.5, are the same idea at a steeper margin and a different price. They are not a free hook on the standard 1.5. Write both the handicap and the American odds. Remembering only "the puck line" is how people discover they bought 2.5.

A one-goal favorite win is the result that splits the two markets. Moneyline favorite wins. Puck-line favorite loses. Underdog plus 1.5 wins. Underdog moneyline loses. If you cannot say which of those four tickets you hold, you are not ready to stake.

Live puck lines re-quote after every goal. A new 1.5 in the second period is a new offer, not a refund of the pre-game juice. Empty-net spots in the last two minutes are the loud version of that re-quote.`,
    },
    {
      id: "versus-moneyline",
      title: "Puck line versus moneyline prices",
      body: `The moneyline prices a win. The puck line prices a two-goal win for the favorite, or a one-goal cushion for the dog. Books do not give you that extra condition for free. The favorite's minus 1.5 is usually a longer price than the same side's moneyline, because one-goal wins are stripped out of the ways to cash. The underdog's plus 1.5 is usually shorter than the underdog moneyline, because one-goal losses now pay.

The figures below are an illustration, not a live board and not a pick. Convert them with the method on [implied probability](/guides/implied-probability) before you treat a gap as value.

| Ticket | Line | American | Implied | $20 stake wins |
| --- | --- | --- | --- | --- |
| Favorite puck line | −1.5 | −130 | 56.5% | $15.38 |
| Underdog puck line | +1.5 | +110 | 47.6% | $22.00 |
| Favorite moneyline | win | −175 | 63.6% | $11.43 |
| Underdog moneyline | win | +150 | 40.0% | $30.00 |

Minus 130 implies 130/230, about 56.5%. Plus 110 implies 100/210, about 47.6%. Those two already sum past 100%, which is the hold on that pair. The moneyline pair has its own hold. Subtracting 63.6 from 56.5 and calling the gap "the chance of a one-goal game" is a sketch, not a de-vigged probability. Each market carries a different margin, so the raw gap is not a clean event probability.

People reach for the favorite's puck line when the moneyline looks too short and they are willing to lose the bet on a one-goal win. People reach for plus 1.5 when they think the game stays inside one goal and they would rather take a shorter plus than need the outright. Neither habit is value by itself. Value is your own number against the price after juice. This page will not supply a side.`,
    },
    {
      id: "empty-net",
      title: "Worked example: empty-net math",
      body: `Empty-net math is the last-minute fork that decides a lot of puck line tickets. Illustration only: you hold the favorite at minus 1.5, stake $20 at minus 130, so a cover pays about $15.38 profit. With a minute left the score is 2–1 for your side. The trailing team pulls its goalie.

### What each next goal does

| Last-minute event | Margin | Favorite −1.5 | Favorite moneyline |
| --- | --- | --- | --- |
| Leader scores into the empty net | 2 or more | Cover, about +$15.38 | Win |
| Trailer scores, then your side wins in extras | 1 | Loss, −$20 | Win |
| Trailer scores, then the trailer wins in extras | your side loses | Loss, −$20 | Loss |
| No more goals, lead holds at one | 1 | Loss, −$20 | Win |

The empty-net goal is the path that turns a losing puck line into a cover without needing another full period. The trailer tying the game sends the ticket toward extras, where a favorite win is still only one goal and minus 1.5 loses. People watching only the moneyline cheer a late save. People holding minus 1.5 need the extra goal or they have lost.

Do not treat this table as a frequency. This page does not claim what share of NHL games produce an empty-net goal. The mechanism is enough: a one-goal lead is not a cover, and the goalie pull is the moment that lead can become two. If you are betting live into that minute, you are buying a new price on a specific fork, not "getting even" on the pre-game ticket.

A second cash note: if your side is already up by two, minus 1.5 is covering unless the other side scores twice. The pull then threatens the cover instead of creating it. Read the score before you reuse a slogan about empty nets.`,
    },
    {
      id: "dog-example",
      title: "Worked example: plus 1.5 on the underdog",
      body: `Second illustration, still not a pick. You take the underdog at plus 1.5, American plus 110, stake $20. A winning ticket pays $22 profit and returns $42. A losing ticket costs the $20.

- The underdog wins in regulation, overtime, or a shootout: plus 1.5 wins. Profit about $22.
- The underdog loses by exactly one, including a one-goal overtime or shootout final: plus 1.5 still wins. Profit about $22.
- The underdog loses by two or more: plus 1.5 loses. You are down $20.

That middle row is why plus 1.5 exists. A 3–2 loss that feels like a bad night for the club is a winning puck line ticket. The underdog moneyline at the illustration price of plus 150 would have lost that same 3–2. You gave up the longer plus-money in exchange for the one-goal cushion. If the game blows open, both underdog tickets lose and the cushion did nothing.

Compare the two underdog shapes with the same $20 before you click. Plus 150 on the moneyline pays $30 when the dog wins outright and pays $0 on a one-goal loss. Plus 110 on the puck line pays $22 in both of those worlds and still pays $0 if the dog loses by two or more. You are choosing which losses you can stand, not unlocking a better team.

Log the handicap, the American price, and whether the book includes overtime. A push cannot save you on 1.5. There is no landing exactly on a half goal. If you wanted a refund on a one-goal game, you did not buy this market.`,
    },
    {
      id: "checklist",
      title: "Checklist before any puck line stake",
      body: `Use this checklist on the slip, not from memory. One game. No parlay built to repair an earlier hockey loss.

- The handicap on the slip is 1.5, not an alternate 2.5 you glanced past.
- The American price is written next to the side, favorite or dog.
- The rules say whether overtime and the shootout count. You can point at the sentence.
- You can state the one-goal result in one line: who cashes, who does not.
- The stake is an amount you can lose tonight. The loss limit is already written.
- You are 18+ and the product is legal where you are. No workaround counts as a rule.
- Live bets into a goalie pull are a new contract. The pre-game price is already behind you.

If a cell is blank, skip the wager. A blank cell is a decision. Filling it from a highlight clip is how a puck line note becomes an ad you wrote for yourself. The [odds converter](/guides/odds-converter) is there if the book shows decimals and you still think in American prices. Convert, then decide. Do not let a plus sign feel like a gift when the handicap is doing the work.`,
    },
    {
      id: "not-a-book",
      title: "A puck line is not a pot on this site",
      body: `PVPspinArena will not book your hockey ticket. There is no minus 1.5 on a club, no empty-net cash-out, and no shootout grade. Jackpot shares are fractions of a player pot. Coinflip is a hashed 50/50 with a published fee. Roulette is a counted wheel. None of those products covers a one-goal loss.

If the puck line was the goal, a coin will not satisfy it, and this page should not pretend otherwise. [Fairness](/fairness) verifies a reveal on the games this site actually runs. It does not verify a late goal, a blown lead, or a number you saw on another screen.

Keep the lesson in one sentence: minus 1.5 needs two goals, plus 1.5 survives a one-goal loss, and the American price is the fee for that shape. When that sentence is clear and the phone is still in your hand after a loss, the next skill is stopping, not finding a live 1.5 to erase the ticket. Adults 18+ only.`,
    },
  ],
  faqs: [
    {
      q: "What is a puck line in NHL betting?",
      a: "A puck line is the standard hockey spread at 1.5 goals. The favorite must win by two or more. The underdog covers by winning or by losing by one. The American odds beside 1.5 are part of the ticket, and they are not the same number as the moneyline on that game.",
    },
    {
      q: "Does overtime count on the puck line?",
      a: "On most North American books, yes. Overtime and the shootout are included, and a shootout win is posted as a one-goal final. That means a favorite can win in extras and still fail to cover minus 1.5. A regulation-only market, if the book offers one, is a different contract. Read the rule on the slip.",
    },
    {
      q: "Can a puck line push?",
      a: "A standard 1.5 puck line does not push, because a team cannot win by half a goal. The margin is one, or it is two or more, or your side loses. Whole-number spreads in other sports can refund the stake. Do not expect that refund on the usual hockey line.",
    },
    {
      q: "When is the puck line a better shape than the moneyline?",
      a: "Only as a comparison you can write down. Favorite minus 1.5 pays more than a short moneyline and loses one-goal wins. Underdog plus 1.5 pays less than the dog moneyline and cashes one-goal losses. Subtracting the two implied prices is a sketch, not a true probability, because each market has its own hold. This page does not name a side.",
    },
    {
      q: "Can I bet a puck line on PVPspinArena?",
      a: "No. This site is not a sportsbook and does not post team handicaps. The games are Jackpot, Coinflip and Roulette for adults 18+. A hashed pot does not settle an NHL margin, an empty-net goal, or a shootout. Fairness checks on this site verify those rounds only.",
    },
  ],
  sources: [
    { label: "NHL", url: "https://www.nhl.com" },
    { label: "Wikipedia: National Hockey League", url: "https://en.wikipedia.org/wiki/National_Hockey_League" },
    { label: "Wikipedia: Fixed-odds betting", url: "https://en.wikipedia.org/wiki/Fixed-odds_betting" },
  ],
  related: [
    "moneyline-betting-explained",
    "point-spread-explained",
    "over-under-betting",
    "implied-probability",
  ],
  updated: "2026-10-06",
};
