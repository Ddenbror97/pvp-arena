import type { Guide } from "./types";

export const guide: Guide = {
  slug: "alternate-lines",
  cluster: "Sports betting",
  keyword: "alternate lines",
  secondary: ["alt spread", "buying points", "selling points"],
  title: "Alternate Lines in Betting: Alt Spreads and Totals",
  description:
    "Alternate lines explained: how alt spreads and totals reprice odds, the math behind buying or selling points and when alternate lines add value.",
  h1: "Alternate lines: a different number at a different price",
  answer:
    "Alternate lines are extra spreads and totals posted beside the main number, each with its own odds, so moving off the main line changes both the score you need and the price you take. Buying points makes the cover easier and the payout shorter. Selling points makes the cover harder and the payout longer. The main line is not a fair coin either. An alt is a new contract, not a free tweak. This is not betting advice. Adults 18+.",
  facts: [
    "An alternate spread or total is a different bet from the main number, even on the same game.",
    "Buying points costs juice, and selling points collects a longer price for a harder cover.",
    "A half point through a common margin, such as 3 in football, is usually the expensive step.",
    "The extra stake on a bought hook is paid on every result, not only on the margin you picked up.",
    "An alt adds value only if its price is longer than the chance of the new result, which the menu does not tell you.",
    "A teaser is a packaged move of several numbers, while an alt is one number at a time.",
  ],
  sections: [
    {
      id: "what-they-are",
      title: "What alternate lines are",
      body: `The main line is the number the book leads with, often a spread near −110 on both sides or a total at a similar price. Alternate lines are the other numbers on the same game: more points for the favorite, fewer points, a higher total, a lower total. Each one has a price. You are not editing the main ticket. You are choosing a different ticket that happens to be about the same teams.

That distinction matters when you compare notes. A friend who bet −3 and a friend who bet −7 did not make the same bet at different confidence levels. One needs a four-point win. The other needs an eight-point win. Their profits and losses diverge exactly on the margins in between. [Point spread](/guides/point-spread-explained) is the main-number version. Start there if −3 itself is still fuzzy. This page is what the board does after that number.

[Sports betting guides](/guides/topics/sports-betting) collect totals and moneylines too. A moneyline is not an alternate spread. It has no points. An alt spread always has points, and the odds move because the points moved. If the slip shows a new number and the same −110, look again. Most alts reprice. A flat price on a very different number is a quote to question, not a gift.`,
    },
    {
      id: "alt-spread-math",
      title: "How an alt spread reprices the odds",
      body: `Worked spread, with illustrative prices rather than a live board. The main line is the favorite −3 at −110. You risk $110 to win $100. A three-point win pushes. A four-point win cashes. An alternate −2.5 at −130 risks $130 to win the same $100. A three-point win now cashes, because −2.5 only needs a win by three or more. You pay $20 more risk on every result so that one margin, the old push, becomes a win.

An alternate the other way, favorite −7 at +180, is a sale of points. A $100 stake profits $180 if the favorite wins by eight or more. A seven-point win loses, whereas −3 would have won. You took a harder number and the book paid you plus money for it. Neither alt is "the sharp one" from the prices alone.

| Line | Illustrative price | Stake to win $100 | Three-point win by the favorite | Eight-point win |
| --- | --- | --- | --- | --- |
| −2.5 | −130 | $130 | Win | Win |
| −3 | −110 | $110 | Push, stake back | Win |
| −7 | +180 | about $55.56 | Loss | Win |

The −7 row's stake to win $100 is 100 / 1.80, about $55.56, because +180 pays $1.80 of profit per $1. The table is the trade. Buying to −2.5 spends an extra $20 of risk against the main line to flip the three-point case from a push to a win. Selling to −7 gives up every margin from four through seven, which win at −3 and lose at −7, in exchange for plus money. [Push in betting](/guides/push-in-betting) is the middle row's tie. The alt is how the board sells you a way off that tie.`,
    },
    {
      id: "buy-or-sell",
      title: "The math of buying or selling points",
      body: `Buying points is paying a worse price for an easier number. The cost is not a one-time fee attached only to the key margin. In the −2.5 example you risk $130 instead of $110 on the bets you were already going to win by four or more, and on the bets you were already going to lose. The three-point win is the only result that changed from a push to a win. You should be able to say that sentence before you buy. If the only reason is "I hate pushes," the $20 is the price of that dislike.

Selling points is the mirror. You accept a number that loses some results the main line would have won, and the odds get longer. Selling is not free money. It is a bet that the margin will be large enough to clear the worse number. If you sell from −3 to −7, you need the favorite to win by eight, not by four. The plus price is compensation for the results you handed back to the book.

Football books usually charge more to move across 3 than across a rare margin, because scoring is built from threes and sevens. This page does not state how often games land on 3. It states that the juice gap is the book's price for that step, and you read the gap rather than a rule of thumb about always buying the hook. A half point from −6.5 to −7 can be cheaper than a half point from −2.5 to −3 on the same menu, or it can be priced however that book wants. Compare those two prices on the actual slip. [Vig betting](/guides/vig-betting) is the margin inside whichever price you accept. Moving the number does not waive it.`,
    },
    {
      id: "alt-totals",
      title: "Alt totals use the same trade",
      body: `Second worked market. The main total is 47.5 at −110, so the over risks $110 to win $100 and needs 48 or more. An alternate over 44.5 at an illustrative −170 risks $170 to win $100. The over now wins on 45, 46, and 47 as well as on 48 or more. You paid $60 of extra risk to pick up those three combined scores. Landing on 44 still loses both overs. Landing on 50 wins both, and the alt wasted $60 of extra stake on a result the main total already covered.

| Total, over | Illustrative price | Risk to win $100 | Game lands 46 | Game lands 50 |
| --- | --- | --- | --- | --- |
| 44.5 | −170 | $170 | Win | Win |
| 47.5 | −110 | $110 | Loss | Win |
| 50.5 | +160 | $62.50 | Loss | Loss |

The 50.5 row is selling. At +160 you risk $62.50 to win $100, and a game that lands 50 loses the over. You were paid a longer price to need 51. [Over under betting](/guides/over-under-betting) explains the main total. The alt table is the same over, three different hurdles. Pick the hurdle whose price you understand. Do not pick it because the button was closer to your guess of the score. A guess of 46 is a reason to notice that 47.5 loses and 44.5 wins, and then to look at −170 and decide whether 46 is worth that juice. The guess is not the calculation.`,
    },
    {
      id: "when-value",
      title: "When an alternate line is the better description",
      body: `An alt adds value only in a narrow sense: the price on the new number is longer than the chance you assign to that cover, after the juice. The menu does not print that chance. It prints the price. So "value" is not a label you can read off the alt board. It is a comparison you would have to bring from outside, and this page will not pretend to supply it. What the page can say is when the alt is the bet you actually mean.

If you believe the favorite wins but not by a blowout, −7 at plus money is a different claim from −3 at −110. One of them matches the sentence in your head. Matching the sentence is not the same as having an edge. It does stop you from betting a number you disagree with and then blaming the hook. If you only wanted the main line and wandered into −7 because the plus price looked exciting, the alt did not add value. It changed the subject.

A [teaser bet](/guides/teaser-bet) moves several numbers at once for a menu price. That is a package of alts plus a parlay rule. Do not price a single alt as if it were a teaser leg, and do not price a teaser as if it were one alt. Key numbers make some steps expensive. Passing is allowed. The main line is allowed. The alt is allowed when you can state the margin that changed and the extra juice in one breath. Adults 18+. This is not betting advice.`,
    },
    {
      id: "checklist",
      title: "A checklist before you leave the main line",
      body: `Leave the main number only on purpose.

- Write the main number, the alt number, and both prices, including the juice.
- Name the margins or totals that win one ticket and lose the other.
- On a bought hook, divide the extra risk by the profit and admit that cost applies to every result.
- Treat a move across 3 or 7 in football as a step to price, not as an automatic buy.
- Do not call an alt a teaser, and do not call a different number the same bet.
- Pass if you cannot say why the main line was wrong for you. Adults 18+. This is not betting advice.

The [responsible gambling](/responsible-gambling) page is the stop if buying points has become a way to make every bet feel safer. Easier numbers at shorter prices are not safer. They are a different contract with a worse payout.`,
    },
    {
      id: "pvp-contrast",
      title: "The points are priced. A pot is shared.",
      body: `Sportsbooks charge vig on the main line and charge again, in the odds, when you buy or sell points. The −130 on −2.5 in the illustration is juice plus the cost of the hook, mixed into one price. There is no separate fair coin underneath the alt board. Shopping two books can improve the alt you take. A system of always buying the half point does not remove the charge. It standardizes it.

A PvP pot is shared among the players in the pot. Nobody is laying you an alt spread. [Fairness](/fairness) explains how this site's rounds can be checked. [Jackpot](/) is the pot, not an alternate total. This page states no player counts, no rake, and no jackpot size. Adults 18+. Nothing here is betting advice.`,
    },
  ],
  faqs: [
    {
      q: "What are alternate lines in betting?",
      a: "They are additional spreads and totals on a game that already has a main number. Each alt carries its own price. −7 at plus money is not the same bet as −3 at −110, even though the teams match. Buying points moves you to an easier number and a shorter payout. Selling points does the opposite. The main line stays on the board for anyone who wants that contract. Adults 18+. This is not a suggestion to leave it.",
    },
    {
      q: "How does buying points change the price?",
      a: "You pay more juice for a number that covers more results. In the illustration, −3 at −110 risks $110 to win $100 and pushes if the favorite wins by three. −2.5 at −130 risks $130 to win $100 and wins on that three-point margin. The extra $20 is charged on every outcome, not only when the game lands on three. Real menus differ. Read the slip. The example is the shape of the trade, not a quote.",
    },
    {
      q: "What does selling points mean?",
      a: "You take a harder number in exchange for a longer price. A favorite −7 at an illustrative +180 profits $180 on a $100 stake only if the team wins by eight or more. Margins that would have cashed −3, such as a four-point win, lose the alt. The plus money is payment for those lost covers. It is not a bonus on top of the main line. You do not get both tickets unless you bet both.",
    },
    {
      q: "Do alternate totals work like alt spreads?",
      a: "Yes. The main total might be 47.5 at −110. An over 44.5 at an illustrative −170 wins if the game lands 45, 46, or 47, cases the main over loses, and you risk $170 instead of $110 to win $100. A higher total at plus money is the sell. Compare the hurdle and the juice. A different total is a different bet. Do not shop them as if the number had stayed the same.",
    },
    {
      q: "When do alternate lines add value?",
      a: "Only if the price is longer than the chance of the new cover, which the board does not reveal. What you can check is whether the alt matches the margin you actually mean, and whether you can name the results that flipped and the juice you paid. Always buying a half point is a habit, not a value rule. Key football numbers are often the expensive steps. Passing keeps you on the main line. This is not betting advice.",
    },
  ],
  sources: [
    { label: "Sports betting", url: "https://en.wikipedia.org/wiki/Sports_betting" },
    { label: "National Football League", url: "https://www.nfl.com" },
  ],
  related: [
    "point-spread-explained",
    "over-under-betting",
    "odds-converter",
    "nfl-betting",
  ],
  updated: "2026-10-06",
};
