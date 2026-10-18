import type { Guide } from "./types";

export const guide: Guide = {
  slug: "vig-betting",
  cluster: "Sports betting",
  keyword: "vig betting",
  secondary: ["juice in betting", "calculate the vig", "minus 110 juice"],
  title: "Vig in Betting: What Juice Costs You and How to Beat It",
  description:
    "What the vig (juice) is, how to calculate it from any odds, how -110 lines make books money and how to cut the vig you pay on every bet.",
  h1: "Vig betting: what juice costs on a two-way price",
  answer:
    "Vig betting means staking into the juice, the margin a sportsbook builds into the odds so both sides of a market add up to more than a fair book. Juice is the same charge under a friendlier name. A pair of −110 prices is the usual example: each side implies about 52.38 percent, and the pair implies about 104.76 percent. The extra is how the book is paid. You can shop a tighter price. You cannot beat the vig with a system. This is not betting advice. Adults 18+.",
  facts: [
    "Vig, juice, and overround are names for the margin inside the price, not a separate fee on the receipt.",
    "A minus American price implies the absolute odds over those odds plus 100, and a plus price implies 100 over the odds plus 100.",
    "Two sides at −110 sum to about 104.76 percent, which is about 4.76 points of overround.",
    "The balanced-book hold is that overround divided by the sum, about 4.55 percent on a −110 pair.",
    "A −105 pair cuts the overround roughly in half compared with −110, and it is still not a fair coin.",
    "No staking sequence removes the sum of the implied probabilities.",
  ],
  sections: [
    {
      id: "what-juice-is",
      title: "What the vig is, and why it is called juice",
      body: `Vig is the price of betting against a book instead of against a fair coin. Juice is the cashier's word for the same thing. On a spread, the points can look even, favorite −3 and dog +3, while the money is not even. Both sides might be −110. You risk $110 to win $100, whichever side you take. The extra $10 is not a tip. It is the vig, collected as a shorter payout rather than as a line item.

If the book took equal money on both sides of that −110 pair, one side would win $100 for the customers and the other side would lose $110. The $10 difference, scaled up, is the book's revenue on a balanced market. Real books are not perfectly balanced, and unbalanced books can win more or less than the theoretical hold. The formula still tells you the margin that was in the menu. [House edge](/guides/house-edge) is the same idea stated for casino games and for this margin. The sportsbook version is usually shown as overround first.

[Sports betting guides](/guides/topics/sports-betting) use these words across spreads, totals, and moneylines. The receipt rarely says "vig." It says the odds. Learning to see the odds as a percentage is the whole skill this page teaches. It does not teach a side.`,
    },
    {
      id: "calculate-it",
      title: "How to calculate juice from any odds",
      body: `Convert each price to an implied probability, then add. For a minus price, divide the absolute odds by the absolute odds plus 100. For a plus price, divide 100 by the odds plus 100. The sum minus 1 is the overround, the extra probability the book hung on the market. You can leave it in percentage points. A sum of 1.0476 is 4.76 points of overround.

The hold on a balanced book is a second step, and it is a smaller number. Divide the overround by the sum of the implied probabilities. On the −110 pair, 0.0476 / 1.0476 is about 0.0455, or 4.55 percent. People mix these up and call both "the vig." Say which one you mean. Overround is the sum minus one. Hold, in this balanced-book sense, is the overround divided by the sum. [Implied probability](/guides/implied-probability) is the conversion. [Odds converter](/guides/odds-converter) will do the American-to-percentage step if you do not want to divide by hand.

Worked pair, the standard juice. Each −110 price is 110 / 210 = 0.52381, or 52.381 percent. Two of them sum to 104.762 percent. Overround is 4.762 points. Balanced hold is about 4.55 percent. Risking $110 to win $100 is the same fact in dollars. The book needs the market to be bet both ways, in some proportion, for that hold to describe the day. Your own ticket does not "pay 4.55 percent." Your ticket pays the price you took, win or lose.

A plus price uses the other fraction. +150 is 100 / 250 = 40 percent. −150 is 150 / 250 = 60 percent. Always match the formula to the sign. Swapping them invents a vig that is not on the board.`,
    },
    {
      id: "minus-110",
      title: "Why a pair of −110 prices pays the book",
      body: `Take $1,100 bet on each side at −110, a perfectly balanced illustration. Each side is trying to win $1,000, because 1100 × (100/110) = 1000. One side wins and is paid $1,000. The other side loses $1,100. The book keeps $100. That $100 is 100 / 2200, about 4.55 percent of the total handle, which matches the hold formula. The customers as a group risked $2,200 and the winners received $1,000 of profit, not $1,100.

| Market | Each side's implied probability | Sum | Overround | Balanced hold |
| --- | --- | --- | --- | --- |
| −110 / −110 | 52.381% | 104.762% | 4.76 points | about 4.55% |
| −105 / −105 | 51.220% | 102.439% | 2.44 points | about 2.38% |

The second row is the shopped market. −105 implies 105 / 205 = 51.220 percent. Two sides sum to 102.439 percent. Overround falls from about 4.76 points to about 2.44 points. On the same $1,100 versus $1,100 picture, a −105 pair would pay the winners more and keep less. [Line shopping](/guides/line-shopping) is how you go looking for that tighter pair. Finding it is reducing the vig you pay. It is not a handicapping opinion about the teams.

If the book is not balanced, the dollar result moves. A book that takes too much money on the winner can lose the day even with vig in the price. The vig is the structural margin, not a guarantee the book profits on that game. For you, the structural fact remains: your break-even rate is the implied probability of the price you took, not 50 percent.`,
    },
    {
      id: "cannot-system-it",
      title: "You cut vig by shopping, not by a system",
      body: `The title on this page says "beat it" because that is how people search. The arithmetic does not allow a beat-the-juice system. A progression that doubles after a loss, a teaser that buys points, or a parlay that multiplies legs all keep a margin inside whatever price you accept. Doubling changes the stake. It does not change 110/210. Buying points moves the number and usually shortens the price further. Parlays multiply short prices, which stacks the vig rather than cancelling it.

What does cut the vig is a better price on the same bet. The −105 row is the demonstration. You can also pass. Not betting a −120 side you only liked at −110 is a vig decision. The book does not charge you for the bets you refuse. Refusing is the only method here that drops your paid juice to zero on that market.

Do not average your way out. Ten bets at −110 are ten bets at −110. A calculator that shows a long-run hold near 4.55 percent on a balanced coin is describing the menu, not offering a sequence that flips the sign. If someone sells a sequence as beating the juice, they are selling stake variation. Adults 18+. This is not betting advice, and shopping a price is not a claim the side will cover.`,
    },
    {
      id: "moneyline-hold",
      title: "A moneyline pair, so the formula is not only −110",
      body: `Second worked market. One side −150, the other +130. These prices are an illustration of a lopsided game, not a quote. The favorite's implied probability is 150 / 250 = 60 percent. The underdog's is 100 / 230, about 43.48 percent. The sum is about 103.48 percent. Overround is about 3.48 points, which is tighter than the −110 pair even though one side looks expensive. Short favorites can hide a smaller overround than a flat −110 spread. You have to add. The favorite's −150 is not the vig by itself.

| Side | American price | Implied probability |
| --- | --- | --- |
| Favorite | −150 | 60% |
| Dog | +130 | about 43.48% |
| Sum |  | about 103.48% |

Hold in the balanced sense would require a specific split of dollars, not a 50/50 split, because the sides are not the same price. Do not divide 3.48 by two and call it the customer's fee. Convert your own price, know your own break-even, and compare it with another book's price on that same side. A +140 dog against a −150 favorite at another book is a different market sum and a better dog price. That comparison is shopping. The sum tells you how wide the whole board is. Your ticket only contains one row of it.

Three-way markets, such as soccer with a draw, add a third implied probability before you subtract from 100. Leaving the draw out understates the vig. If the slip has three prices, add three.`,
    },
    {
      id: "checklist",
      title: "A checklist for the price you actually took",
      body: `Do this on the slip in front of you. A remembered −110 is not the vig on a different number.

- Convert your price to an implied probability with the plus or minus formula.
- If you can see the other side, add it and subtract 1 to get the overround.
- Write the break-even rate next to the stake, so 52.38 percent is visible at −110.
- Compare one other book on the same market before you accept the wider price.
- Refuse any plan that claims a staking sequence beats the juice.
- Stop when the stake is money you cannot lose. Adults 18+. This is not betting advice.

The [responsible gambling](/responsible-gambling) page is the stop if chasing losses has become the system. Juice does not shrink because the last bet lost. It sits in the next price at the same size.`,
    },
    {
      id: "pvp-contrast",
      title: "Sportsbook juice versus a pot that is shared",
      body: `Sportsbooks charge vig by shortening both sides of a market. That is the business. A −110 pair is the clearest picture: the winners are paid as if the chance were worse than a coin, on both sides, so the pair sums past 100 percent. Shopping can move you toward the −105 row. No system moves you to a sum of 100 percent at a book that intends to keep operating.

A PvP pot is shared among the players who entered it. You are not taking −110 against a book that hung −110 the other way. [Fairness](/fairness) explains how this site's rounds can be checked. [Jackpot](/) is the pot, not a juiced spread. This page states no player counts, no rake, and no jackpot size. Adults 18+. Nothing here is betting advice.`,
    },
  ],
  faqs: [
    {
      q: "What is the vig, or juice, in betting?",
      a: "It is the margin inside the odds. On a typical spread both sides are −110, so you risk $110 to win $100 even when the points look even. That extra risk is the juice. Add the implied probabilities of both sides and the sum lands above 100 percent. The amount above 100 is the overround. Juice, vig, and overround are the same family of words. The receipt shows the odds, not a separate vig line. Adults 18+.",
    },
    {
      q: "How do you calculate vig from American odds?",
      a: "For a minus price, divide the absolute odds by the absolute odds plus 100. For a plus price, divide 100 by the odds plus 100. Add every side, then subtract 1 for the overround. Two −110 sides are about 52.38 percent each, summing to about 104.76 percent, or 4.76 points of overround. Balanced-book hold divides that overround by the sum and lands near 4.55 percent. Name which figure you mean.",
    },
    {
      q: "How do −110 lines make the book money?",
      a: "If equal money sits on both sides, the winners are paid less than the losers forfeited. On $1,100 per side, each side is shooting for $1,000 of profit. The winning customers receive $1,000 and the losing customers forfeit $1,100, so $100 stays with the book. That is about 4.55 percent of the $2,200 handle in this balanced illustration. A lopsided book can win more or lose the game. The margin in the menu is still there.",
    },
    {
      q: "Can you beat the vig with a system?",
      a: "No. Progressions change the stake and leave the price alone. Teasers and parlays keep a margin in the menu they sell. The thing that cuts vig is a tighter price on the same bet, such as −105 instead of −110, or passing on the bet. −105 still sums with its pair to more than 100 percent. Shopping reduces what you pay. It is not a system that beats juice, and it is not betting advice.",
    },
    {
      q: "Is overround the same number as hold?",
      a: "Not quite. Overround is the sum of the implied probabilities minus one. On a −110 pair that is about 4.76 percentage points. The balanced-book hold divides the overround by the sum, which comes out near 4.55 percent. Both describe the margin. They are not interchangeable on a calculator. Three-way markets need every price, including the draw, inside the sum. Leaving a side out makes the vig look smaller than the board.",
    },
  ],
  sources: [
    { label: "Vigorish", url: "https://en.wikipedia.org/wiki/Vigorish" },
    {
      label: "National Council on Problem Gambling — help and treatment",
      url: "https://www.ncpgambling.org/help-treatment/",
    },
  ],
  related: ["house-edge", "implied-probability", "odds-converter", "moneyline-betting-explained"],
  updated: "2026-10-06",
};
