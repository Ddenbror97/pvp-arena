import type { Guide } from "./types";

export const guide: Guide = {
  slug: "line-shopping",
  cluster: "Sports betting",
  keyword: "line shopping",
  secondary: ["compare sportsbook odds", "best price routine", "odds shopping"],
  title: "Line Shopping: The Easiest Edge in Sports Betting",
  description:
    "Line shopping explained: how comparing odds across books adds real ROI, worked examples by sport and a simple routine to always get the best price.",
  h1: "Line shopping: the same side, two different prices",
  answer:
    "Line shopping is comparing the price of the same bet at more than one book and taking the best number you can actually get. The edge is small on one ticket and real across many, because −110 and −105 are not the same contract. Shopping does not pick winners. It lowers the vig you pay when you already have a side. This page shows the arithmetic. It is not betting advice. Adults 18+.",
  facts: [
    "The same team at −110 and at −105 risks different amounts to win the same $100.",
    "Break-even is about 52.38 percent at −110 and about 51.22 percent at −105.",
    "A better moneyline pays more on a win without changing the team you picked.",
    "A different point spread is a different bet, not a shopped price on the same bet.",
    "Stale numbers and accounts you cannot cash out of are not the best price.",
    "Shopping reduces vig without deleting it, and it is not a selection system.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What line shopping is",
      body: `Line shopping is a price check. You decide the market, then you read that market at two or more books before you stake. The best price is the one that pays more if you win or risks less to win the same amount, on the same number. −3 −110 and −3 −105 are the same spread and different juice. −3 −110 and −3.5 −110 are different spreads. Only the first pair is shopping. The second pair is buying or selling points, which is a new bet.

The habit is dull, which is why it gets skipped. The bet slip at the book you already had open is one sample. Another book can be a half point better or a nickel better on the juice, and the nickel is money. [Odds converter](/guides/odds-converter) turns those American prices into break-even percentages so the nickel has a unit. [Sports betting guides](/guides/topics/sports-betting) are the cluster this price check belongs to.

You can only shop books you can use. A number on a screen you cannot withdraw from is not a price. A number that moves while you are typing is not the number you saw. The routine below includes those checks because the arithmetic is worthless on a quote you cannot fill.`,
    },
    {
      id: "nfl-juice",
      title: "The same NFL side at two prices",
      body: `Worked case for a spread, illustrative prices, not a live board. You want a side at −3. Book A posts −110. Book B posts −105. To win $100 of profit you risk $110 at Book A and $105 at Book B. The $5 difference is the shop. If the bet wins, both books pay $100 profit and Book B tied up less cash. If the bet loses, Book B loses $105 instead of $110.

Break-even is the implied probability of the price. At −110 it is 110 / 210, about 52.38 percent. At −105 it is 105 / 205, about 51.22 percent. Shopping moved the hurdle by about 1.16 percentage points. [Implied probability](/guides/implied-probability) is that conversion in general. You did not become a better handicapper. You stopped paying the wider hurdle.

Second number, still arithmetic, not a claim anyone wins at this rate. Suppose the side wins 52 of 100 bets. At −110, staking $110 each time, 52 wins pay 52 × $100 = $5,200 and 48 losses cost 48 × $110 = $5,280. Net is −$80. At −105, staking $105, the same 52 wins pay $5,200 and 48 losses cost 48 × $105 = $5,040. Net is +$160. Same wins, same losses, different price, different sign. The $240 swing is 100 × $5 of juice you did not pay on the losses, plus the fact that the wins were unchanged. It is an illustration of price. It is not a forecast that your side wins 52 percent.

| Price | Risk to win $100 | Break-even | Net if 52 of 100 win |
| --- | --- | --- | --- |
| −110 | $110 | about 52.38% | −$80 |
| −105 | $105 | about 51.22% | +$160 |

[NFL betting](/guides/nfl-betting) is full of −110 menus, which is why a nickel shows up so often. The table does not say to bet NFL. It says the nickel is a different contract.`,
    },
    {
      id: "by-sport",
      title: "A moneyline example, and prices by sport",
      body: `Spreads are not the only shop. A moneyline at +150 pays $150 profit on a $100 stake. The same team at +165 pays $165 profit on that $100. You did not take a different side. You took $15 more if it hits, and you lose the same $100 if it misses. Implied probability falls from 100/250 = 40 percent to 100/265, about 37.7 percent. You are laying a smaller percentage for the identical result. That is the shop on a plus price.

Sports differ in how the menu is usually built. The pairs below are shapes, not today's board and not a ranking of sports.

| Market shape | Worse illustrative price | Better illustrative price | What the shop changes |
| --- | --- | --- | --- |
| NFL or NBA spread | −115 | −105 | $10 less risked to win $100 |
| MLB or NHL moneyline | +140 | +155 | $15 more profit on a $100 stake |
| Soccer three-way price | +120 on a side | +135 on that side | $15 more profit, if it is the same result |

An NBA −115 versus −105 is the same lesson as the NFL nickel, with a larger gap. A soccer price is only comparable when both books are grading the same thing, such as both using a three-way line or both using a two-way line. Shopping a three-way +120 against a two-way +135 mixes a draw rule into the price. Those are not the same bet. [Moneyline betting](/guides/moneyline-betting-explained) is the two-way version. Read the draw rule before you call a soccer number better.

Props shop poorly because the books hang different totals for the same player. A lower total at a shorter price can be the better or worse deal, and you cannot see it from the juice alone. If the numbers differ, write both numbers. Do not shop them as if they were identical.`,
    },
    {
      id: "routine",
      title: "A routine that checks the price first",
      body: `Keep it short enough to do every time. Open the market you already decided to look at. Write the price at the first book, including the juice. Write the price at the second book. If the point spreads match, take the longer payout or the smaller risk. If the spreads differ, stop and decide whether you want the different number at all. Then look at the max bet. A better price that accepts $5 is not the price for a $100 decision. Fill the size you can actually get, or pass.

Do this before you are in a hurry. In-game prices move while you compare, and a routine that takes two minutes can shop a number that died. For a pregame side, two books and one line of notes are enough. A third book helps when the first two disagree by more than a nickel. More tabs than that often become a way to talk yourself into the bet you wanted at the first book anyway.

Record the price you took and the price you refused. The log is the only proof the routine happened. Memory will remember the wins at the better price and forget the times you were too impatient to look. The log will not. It also stops you from counting a different spread as a shop. If the numbers in the two columns are not the same bet, the column is a different decision.`,
    },
    {
      id: "what-it-does-not",
      title: "What shopping does not do",
      body: `It does not find winners. A terrible side at −105 is still a terrible side. The table with 52 wins only flips the sign because 52 sits between 51.22 and 52.38. If the side wins 50 of 100, both prices lose money, and −105 loses less. Less is not a profit. [Vig betting](/guides/vig-betting) is the margin you are trimming. Trimming it is the whole edge on offer here. There is no second edge hiding in a pattern of who you shop.

It does not justify a book you should not use. Limits, slow withdrawals, and rules you did not read can cost more than a nickel of juice. A price from a screen that will not pay you is not a price. It also does not apply to a teaser menu or a parlay chart unless you compare the same teaser or the same parlay. Those products hide the shop inside a package. Compare packages to packages.

Shopping is legal price comparison, not a way around a limit and not a reason to hold many accounts you do not need. If a book cuts your limit, take the smaller bet or leave. Do not treat the cut as a puzzle. Adults 18+. This is not betting advice, and the 52-win column is arithmetic on a made-up rate.`,
    },
    {
      id: "checklist",
      title: "A checklist for the best number",
      body: `Run the list on the bet you are about to place, not on a theoretical one.

- Confirm both books are grading the same market, including overtime and draw rules.
- Write both prices with the juice, and circle the one that pays more or risks less.
- If the spreads or totals differ, treat them as two bets, not as a shop.
- Check that the better price will accept the stake you mean to use.
- Log the price you took and the price you left.
- Pass if the only edge is the thrill of having looked. Adults 18+. This is not betting advice.

The [responsible gambling](/responsible-gambling) page is the stop if shopping has become an excuse to bet more often. A better price on a bet you did not need is still a bet.`,
    },
    {
      id: "pvp-contrast",
      title: "Less vig is still vig. A pot is shared.",
      body: `Sportsbooks charge vig on the price. Line shopping is how you pay a smaller version of that charge when two books disagree. The best −105 in the table is still a price that needs about 51.22 percent to break even on a two-way bet that would be 50 percent if it were fair. You beat the other book's price. You did not beat a fair coin by a system.

A PvP pot is shared among the players in the pot. There is no second sportsbook to shop, because there is no spread on offer. [Fairness](/fairness) explains how this site's rounds can be checked. [Jackpot](/) is the pot, not a football line. This page states no player counts, no rake, and no jackpot size. Adults 18+. Nothing here is betting advice.`,
    },
  ],
  faqs: [
    {
      q: "Why does line shopping change ROI?",
      a: "Because the price changes the break-even rate on the same wins and losses. At −110 you risk $110 to win $100, and about 52.38 percent must win to break even. At −105 you risk $105, and the hurdle is about 51.22 percent. In a made-up run of 52 wins out of 100, −110 loses $80 and −105 wins $160. That gap is the shop. It is not a promise that any side wins 52 percent.",
    },
    {
      q: "Is a better spread the same as a better price?",
      a: "No. −3 at −110 and −3 at −105 are the same bet at two prices, and shopping applies. −3 at −110 and −2.5 at −130 are different numbers. The second one wins on a three-point margin that pushes the first one, and it charges for that. Compare identical markets when you shop. If the number moved, decide whether you want the new number. Do not label that decision as getting a better price on the old one.",
    },
    {
      q: "How many books do you need?",
      a: "Two are enough to start, if both will actually take the bet and pay you. A third helps when the first two differ by more than a small amount of juice. Ten screens do not help if you only ever bet the first tab. Write the prices down. A better number you cannot get, because of a limit or a dead quote, is not your price. The routine is the comparison, not the number of logos.",
    },
    {
      q: "Does shopping work on moneylines and totals?",
      a: "Yes, when the result being graded is the same. A +150 moneyline versus +165 on the same team pays $15 more per $100 stake if it wins. Totals shop the same way when both books hang the same total. A 47 and a 47.5 are different totals. Soccer prices shop only when both books use the same draw rule. Props need extra care because the stat line itself often differs.",
    },
    {
      q: "Can line shopping remove the vig?",
      a: "It can reduce the vig you pay on that bet. It does not remove the margin from a still-short price. A −105 side still breaks even above 50 percent. Finding −105 instead of −110 is the edge this page describes. A staking system on top of the shop does not create a second edge. If both books are −110, shopping found nothing, and forcing a bet anyway is not the routine. Adults 18+. This is not betting advice.",
    },
  ],
  sources: [
    { label: "Vigorish", url: "https://en.wikipedia.org/wiki/Vigorish" },
    { label: "Sports betting", url: "https://en.wikipedia.org/wiki/Sports_betting" },
  ],
  related: [
    "odds-converter",
    "implied-probability",
    "house-edge",
    "moneyline-betting-explained",
  ],
  updated: "2026-10-06",
};
