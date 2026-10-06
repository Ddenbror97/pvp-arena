import type { Guide } from "./types";

export const guide: Guide = {
  slug: "run-line",
  cluster: "Sports betting",
  keyword: "run line",
  secondary: ["MLB run line", "baseball spread", "minus 1.5 runs", "alternate run line"],
  title: "Run Line Betting: MLB Spreads and When to Use Them",
  description:
    "MLB run line explained: how the 1.5-run spread works, run line vs moneyline pricing, alternate run lines and favorite and underdog situations.",
  h1: "Run Line Betting: MLB Spreads and When to Use Them",
  answer:
    "Run line betting is baseball's standard spread: a 1.5-run handicap. The favorite at minus 1.5 must win by two or more runs. The underdog at plus 1.5 cashes by winning the game or by losing by exactly one run. A one-run final splits the two markets: the moneyline favorite wins, and the run-line favorite does not. Prices are an illustration on this page, not a board and not a pick. Adults 18+ only. PVPspinArena does not post baseball lines.",
  facts: [
    "The standard MLB run line is 1.5 runs: favorite minus 1.5, underdog plus 1.5.",
    "A one-run win does not cover minus 1.5. There is no push on a half-run hook.",
    "Plus 1.5 covers an underdog win and a loss by exactly one run.",
    "Because one-run games are common, the plus 1.5 side is often the shorter price.",
    "Alternate run lines such as 2.5 are a different handicap with a different number.",
    "PVPspinArena is not a sportsbook. Adults 18+ only. This page is not a pick sheet.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What the run line is selling",
      body: `Run line is a handicap, the baseball version of a [point spread](/guides/point-spread-explained). The usual number is one and a half runs. You are not betting that a club is "good." You are betting a margin at a price. The favorite must clear two runs. The underdog survives anything closer than that, including a win.

A [moneyline](/guides/moneyline-betting-explained) only asks who wins. The run line asks by how many. [Over/under betting](/guides/over-under-betting) asks how many runs both teams score together. Three questions, three tickets. Mixing them up is how a one-run loss feels like a bad beat when the slip actually covered.

The hockey cousin is the puck line, also posted at 1.5. The sports are different. Baseball does not decide a tie with a shootout that adds one run. If the game is a one-run final, minus 1.5 loses and plus 1.5 wins. That sentence is the product. Read [puck line betting](/guides/puck-line) only if you want the hockey settlement next to this one. Do not copy a hockey empty-net story onto a ninth inning.

[Sports betting guides](/guides/topics/sports-betting) is the cluster menu. Adults 18+ only. This is not legal advice. PVPspinArena runs Jackpot, Coinflip and Roulette. [Fairness](/fairness) checks those hashed rounds. [Jackpot](/) is a player pot, not a baseball handicap. If the session becomes chasing, use [responsible gambling](/responsible-gambling).`,
    },
    {
      id: "settlement",
      title: "How minus 1.5 and plus 1.5 settle",
      body: `Minus 1.5 wins only if that side wins by two or more runs. Plus 1.5 wins if that side wins by any margin or loses by exactly one. A half run cannot land, so the standard run line does not push. You either clear it or you do not.

| Final | Favorite −1.5 | Underdog +1.5 |
| --- | --- | --- |
| Favorite wins by 2 or more | Win | Loss |
| Favorite wins by exactly 1 | Loss | Win |
| Underdog wins by any score | Loss | Win |

Extra innings count on a full-game run line unless the coupon says otherwise. A walk-off in the tenth that makes the final one run is still a one-run game. The moneyline winner cashes. The minus 1.5 ticket does not. People who remember only the win forget the margin they bought.

Listed-pitcher rules sit beside the handicap. Many books void or re-price the ticket if a named starter does not start. That is a house rule, not a law of baseball, and it is not the same at every counter. Read the sentence before first pitch. A scratch announced after you bet can turn a "lock" into a refund or a different price. Write down which rule you accepted.

Five-inning rules for shortened games are also in the market notes. A rain delay that ends a game before the book will grade it is not a moral win. It is whatever the rule says: void, stand, or a listed cutoff. If you cannot find the cutoff, you do not know your ticket.

Alternate run lines move the handicap. Minus 2.5 means the favorite must win by three or more. Plus 2.5 covers a two-run loss. The price changes with the number. Buying a friendlier hook is not free. You paid for it in the American odds, even if the screen highlights the new run number and hides the juice.`,
    },
    {
      id: "pricing",
      title: "Run line versus moneyline pricing",
      body: `One-run games happen often enough that books do not price minus 1.5 like a small tax on the moneyline. The favorite's run line is often plus money, or at least much longer than the moneyline, because one-run wins are removed from the ways to cash. The underdog's plus 1.5 is often the minus-juice side. You are laying a price to buy the one-run cushion. That feels backwards the first time you see it. It is the usual shape, not a glitch.

The board below is an illustration, not a live line and not a side to bet. Convert the American numbers with [implied probability](/guides/implied-probability) before you call a gap "value."

| Ticket | Line | American | Implied | $20 stake wins |
| --- | --- | --- | --- | --- |
| Favorite run line | −1.5 | +120 | 45.5% | $24.00 |
| Underdog run line | +1.5 | −140 | 58.3% | $14.29 |
| Favorite moneyline | win | −180 | 64.3% | $11.11 |
| Underdog moneyline | win | +155 | 39.2% | $31.00 |

Plus 120 implies 100/220, about 45.5%. Minus 140 implies 140/240, about 58.3%. The pair sums past 100%. That overflow is the hold. The moneyline pair has a separate hold. Do not subtract 64.3 from 45.5 and call the difference the true chance of a one-run game. Two markets, two margins. The sketch is useful. It is not a de-vigged probability.

Favorite situations, as a shape and not a pick: the moneyline is short, you think the win will be by two or more, and you would rather take plus money on minus 1.5 than lay a heavy price on any win. Underdog situations: you think the game stays inside one run, and you would rather lay minus 140 on plus 1.5 than need the outright at a longer plus. If you cannot say which losses you are accepting, stay on the moneyline until you can.`,
    },
    {
      id: "example-favorite",
      title: "Worked example: favorite minus 1.5",
      body: `Illustration only. You stake $20 on the favorite's run line at plus 120. A cover pays $24 profit and returns $44. A loss costs $20. The moneyline on the same club, in this illustration, is minus 180. That $20 moneyline would pay about $11.11 if the club simply wins.

- Final favorite by 2 or more: run line wins, about +$24. Moneyline also wins, about +$11.11.
- Final favorite by exactly 1: run line loses, −$20. Moneyline still wins.
- Favorite loses by any margin: both tickets lose.

The middle row is the entire reason the run line pays more. You sold every one-run win in exchange for a longer price. If your reason for the bet was "they should win a close game behind a good starter," you bought the wrong contract. Close is exactly the result that beats the moneyline and loses minus 1.5.

Alternate number, same stake, still an illustration: minus 2.5 at a longer plus, say plus 180. Now you need a win by three or more to earn $36, and a two-run win that would have covered 1.5 becomes a loss. Write the handicap on the same line as the plus. A bigger plus with a bigger number is not a better team. It is a steeper hill.

Do not confirm the arithmetic on a coin flip. A hashed flip has no run margin. The $24 is a teaching payout on a labeled price, not a result this site will grade.`,
    },
    {
      id: "example-dog",
      title: "Worked example: underdog plus 1.5",
      body: `Second illustration, still not a pick. You lay minus 140 on the underdog at plus 1.5. Stake $20. Profit if it covers is $20 times 100/140, about $14.29. Return is about $34.29.

- Underdog wins by any score: plus 1.5 wins, about +$14.29. The underdog moneyline at the illustration plus 155 would have paid $31 on the same $20.
- Underdog loses by exactly one: plus 1.5 still wins, about +$14.29. The moneyline loses.
- Underdog loses by two or more: plus 1.5 loses the $20. The moneyline loses too.

You paid for the middle row. A 4–3 loss that ruins the club's night is a winning run-line ticket. The cost of that cushion is the difference between $31 and $14.29 on the nights the dog wins outright, plus the juice inside minus 140. If you only wanted the upset, the moneyline is the ticket that pays the upset and does not pay the one-run loss.

Favorite and underdog labels follow the moneyline, not the run-line price. The club at plus 1.5 can still be the side you lay juice on. Calling that club "the favorite" because the price is minus 140 confuses the handicap with the vig. Say "underdog, plus 1.5, minus 140" out loud. Three facts. If one of them is missing, the slip is not finished.

Log a push only if you bought a whole-number alternate that can land exactly. The standard 1.5 cannot. A refund you hoped for on a one-run game was never in this contract.`,
    },
    {
      id: "checklist",
      title: "Checklist before any run line stake",
      body: `One game. No parlay built to get back a one-run loss from last night.

- The slip says 1.5, not an alternate 2.5 you tapped by habit.
- You wrote favorite or underdog, the handicap, and the American price on one line.
- You know what a one-run win does to this exact ticket.
- Listed pitcher, extra innings, and shortened-game rules are sentences you can find.
- The stake fits a loss limit you set before the first pitch.
- You are 18+ and allowed to use that book where you live.
- You are not moving to 2.5 only because the plus sign got larger.

If the pitcher rule is a blank, leave the stake blank too. A blank is a decision. The [odds converter](/guides/odds-converter) helps when the book shows a decimal and you still think in American prices. Convert the juice, then choose the margin. Do not let plus 1.5 feel safe because the word "plus" is friendly. On the usual board you are often laying minus money for that plus.`,
    },
    {
      id: "not-a-book",
      title: "A run line is not a pot on this site",
      body: `PVPspinArena will not book a baseball margin. There is no minus 1.5 on a club, no listed-pitcher void, and no ninth-inning cash-out. Jackpot is a shared pot. Coinflip is a hashed 50/50 with a published fee. Roulette is a counted wheel. None of them covers a one-run loss.

[Fairness](/fairness) verifies a reveal on the games this site runs. It does not verify a walk-off or a scratch. If the run line was the product you wanted, a coin will not replace it.

Keep one sentence: minus 1.5 needs two runs, plus 1.5 survives a one-run loss, and the price beside the hook is the fee. When that is clear and you are still hunting a live alternate after a loss, stop. Adults 18+ only.`,
    },
  ],
  faqs: [
    {
      q: "What is a run line in MLB betting?",
      a: "A run line is baseball's standard spread, usually 1.5 runs. The favorite must win by two or more. The underdog covers by winning or by losing by one. The American price next to 1.5 is part of the bet, and it is often a very different number from that club's moneyline.",
    },
    {
      q: "Why is the underdog run line often minus money?",
      a: "One-run games are common, so plus 1.5 wins a lot of tickets that the underdog moneyline loses. The book charges for that cushion. Laying minus 140 on plus 1.5 is a normal shape, not a screen error. The moneyline favorite is still the favorite. The juice just moved onto the dog's handicap.",
    },
    {
      q: "What is an alternate run line?",
      a: "An alternate run line is the same bet at a different margin, such as 2.5 instead of 1.5, with a new price. A longer plus on a steeper number is not free value. You need more runs. Read both the hook and the odds before you treat an alternate as the standard line.",
    },
    {
      q: "Does a run line push if the game is decided by one run?",
      a: "No. A 1.5-run line cannot land exactly, so it does not push. A one-run win loses for minus 1.5 and wins for plus 1.5. A whole-number alternate can push if the margin matches it. Do not expect a refund on the standard hook.",
    },
    {
      q: "Can I bet a run line on PVPspinArena?",
      a: "No. This site is not a sportsbook and does not post run lines. Jackpot, Coinflip and Roulette are the games, for adults 18+ only. A hashed round does not grade a baseball margin, a listed pitcher, or extra innings. Fairness checks here do not settle a final score.",
    },
  ],
  sources: [
    { label: "MLB", url: "https://www.mlb.com" },
    { label: "Wikipedia: Major League Baseball", url: "https://en.wikipedia.org/wiki/Major_League_Baseball" },
    { label: "Wikipedia: Fixed-odds betting", url: "https://en.wikipedia.org/wiki/Fixed-odds_betting" },
  ],
  related: [
    "moneyline-betting-explained",
    "point-spread-explained",
    "over-under-betting",
    "puck-line",
  ],
  updated: "2026-10-06",
};
