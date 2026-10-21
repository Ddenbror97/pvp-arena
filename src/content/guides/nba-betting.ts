import type { Guide } from "./types";

export const guide: Guide = {
  slug: "nba-betting",
  cluster: "Sports betting",
  keyword: "nba betting",
  secondary: ["nba odds", "nba point spread", "how to bet on nba"],
  title: "NBA Betting: Spreads, Totals and Schedule Spots",
  description:
    "NBA betting prices 2s, 3s, and free throws. A tied fourth quarter goes to five-minute overtime. Whether your bet includes it is written on the slip.",
  h1: "NBA betting: 12-minute quarters, and no tie to settle",
  answer:
    "NBA betting is a price on a National Basketball Association game. A field goal inside the arc is two points, a field goal outside it is three, and a free throw is one. Each regulation period is 12 minutes. If the score is tied at the end of the fourth period, the rules say play resumes for as many five-minute overtime periods as it takes. A spread and a total still are not the moneyline. No line is quoted here.",
  facts: [
    "Regulation cannot finish as a draw. Overtime is part of the league rule, in five-minute periods.",
    "Scoring is 2, 3, and 1. There is no fixed menu of 3 and 7 the way there is in football.",
    "A spread, a total, and a moneyline ask different questions. The hold sits in the price.",
    "A back-to-back is a date on the schedule. It is not, on this page, a measured advantage.",
    "PVPspinArena does not book basketball.",
  ],
  sections: [
    {
      id: "clock",
      title: "The clock and the overtime rule",
      body: `The NBA's official playing rules say each regulation period is 12 minutes and each overtime period is five. If the score is tied when the fourth period ends, play resumes, without a change of baskets, for however many overtime periods are required. That is why an NBA moneyline does not have a draw the way a soccer 1X2 does. The game produces a winner unless it is stopped for a reason the competition, not a betting guide, defines.

A basket in the air as time expires can still count, under the end-of-period exceptions in those rules. That is a scoring question for the officials. Your bet is graded by the market rules after the official result.`,
    },
    {
      id: "markets",
      title: "Why basketball lines look different from football lines",
      body: `Possessions are worth two or three, plus free throws of one. The total is a large number because there are many possessions, not because someone invented a big total. A spread of a few points is a small slice of that total. Neither fact tells you whether the price is fair.

[Moneyline betting explained](/guides/moneyline-betting-explained) is who wins. [Vig betting](/guides/vig-betting) is the book's margin on both sides. [What sports betting is](/guides/what-is-sports-betting) is the general contract. A player prop is a different settlement: points, rebounds, or assists as the market defines them, which may or may not include overtime. Read that sentence on the prop, not on the game spread.`,
    },
    {
      id: "schedule",
      title: "Schedule spots are facts, not edges",
      body: `The league calendar shows who played yesterday and who travels. A back-to-back is visible without a model. What it is worth in points is a forecast. This page does not make it. Books disagree, and a public "rest edge" percent you did not compute is not a number to bet.

The same restraint applies to injuries. A listed absence is news. The point value of the absence is the book's opinion plus yours. Separate the two.`,
    },
    {
      id: "grade",
      title: "Grade the market you bought",
      body: `Because overtime is required, many basketball markets include it. "Many" is not "this slip." A first-half total ends at halftime even if the game later needs an extra period. A shortened or postponed game follows the book, not a custom you heard about football.

PVPspinArena does not offer NBA betting. Adults only. [Responsible gambling](/responsible-gambling) is the limit on a nightly schedule that can hold ten games. The cluster is [sports betting](/guides/topics/sports-betting). The [terms](/terms) are about this site's own products.`,
    },
  ],
  faqs: [
    {
      q: "Can an NBA game end in a tie?",
      a: "Not in a completed game. If the fourth period is tied, the rules call for five-minute overtime periods until there is a winner.",
    },
    {
      q: "How long is a quarter?",
      a: "Twelve minutes of regulation. Overtime periods are five minutes.",
    },
    {
      q: "Does my spread include overtime?",
      a: "Check the market. League overtime and bet settlement are not the same sentence. Halves and quarters end on time even when the game later continues.",
    },
    {
      q: "Is a back-to-back worth a certain number of points?",
      a: "It is a schedule fact. This page does not assign it a point value.",
    },
    {
      q: "Does this site book the NBA?",
      a: "No.",
    },
  ],
  sources: [
    {
      label: "NBA official rules: scoring and timing",
      url: "https://official.nba.com/rule-no-5-scoring-and-timing/",
    },
  ],
  related: ["moneyline-betting-explained", "vig-betting", "what-is-sports-betting", "prop-bets-explained"],
  updated: "2026-10-21",
};
