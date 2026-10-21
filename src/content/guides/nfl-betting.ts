import type { Guide } from "./types";

export const guide: Guide = {
  slug: "nfl-betting",
  cluster: "Sports betting",
  keyword: "nfl betting",
  secondary: ["nfl odds", "nfl point spread", "how to bet on nfl"],
  title: "NFL Betting: Spreads, Totals and the Hold",
  description:
    "NFL betting prices scores of 6, 3, 2, and 1. A spread is not a moneyline. Overtime counts only if that market's rules say so. No odds are quoted here.",
  h1: "NFL betting: the scoreboard is 6, 3, 2, and 1",
  answer:
    "NFL betting is a price on a National Football League game. A touchdown is six points. A field goal is three. A safety is two. After a touchdown the try is one point by kick or two by running or passing the ball in from the 2-yard line. A spread, a total, and a moneyline are three different questions about that scoreboard. The book's margin is in the price. This page does not quote a line.",
  facts: [
    "Regulation is four quarters of 15 minutes. The clock stops often, so the wall-clock game is longer.",
    "The scoring menu is why margins of 3 and 7 are intelligible. A frequency for those margins is a statistic this page does not claim.",
    "A point spread is who covers a handicap. A total is the sum of both scores. A moneyline is who wins the game.",
    "If the game is tied after four quarters, overtime exists. Whether your bet includes it is written on the market, not assumed here.",
    "PVPspinArena does not book NFL games.",
  ],
  sections: [
    {
      id: "score",
      title: "What can change the score",
      body: `A touchdown is six, and then the try is a separate untimed play for one or two. A field goal is three, with no try after it. A safety is two, scored by the defense. Those four events are the whole offensive and defensive menu in ordinary play. A defensive return of a try can also score two, under the rules Wikipedia summarises for the NFL. You do not need a betting system to see why a three-point lead is a field goal and a seven-point lead is a touchdown plus a kicked try.

The NFL's own rulebook is the text that governs a live game, including the current overtime procedure. This page does not restate overtime drive-by-drive. Books have rewritten settlement when the league rewrote overtime before, and they will do it again. Read the market.`,
    },
    {
      id: "three-prices",
      title: "Spread, total, and moneyline",
      body: `The moneyline asks who is ahead when the market's clock stops. The spread asks who is ahead after you add or subtract the handicap. A favorite of 3 that wins by 2 covers for the underdog. A total asks whether the two scores, added, land over or under a number. A game can have a winner you picked and a total you missed.

The price next to each of those is not a probability printed by the league. It is the book's number, and the gap between the two sides is the hold. [Vig betting](/guides/vig-betting) is that gap. [Moneyline betting explained](/guides/moneyline-betting-explained) is the win-the-game version. [Prop bets explained](/guides/prop-bets-explained) covers a player stat, which settles on the stat, not on who covered.

Key numbers are a reason to look at 3 and 7 before you click, because of the scoring menu. They are not a claim that this season's games land there at a rate you can bet blind.`,
    },
    {
      id: "settlement",
      title: "Settlement is a sentence on the slip",
      body: `Overtime, a postponed game, a shortened game, and a player who does not start are market rules. One book grades a spread through overtime. Another voids a prop if the player misses a snap. Copy the sentence for the bet you are placing. Do not import it from a different sport, and do not import it from this paragraph.

[What sports betting is](/guides/what-is-sports-betting) is the general shape. The [sports betting](/guides/topics/sports-betting) topic is the cluster. Nothing here is a pick.`,
    },
    {
      id: "not-a-book",
      title: "No NFL product on this site",
      body: `PVPspinArena does not offer a sportsbook. Its [terms](/terms) describe other games. Adults only. [Responsible gambling](/responsible-gambling) applies to a Sunday card the same way it applies to any stake you cannot afford to lose. A hold does not become fair because the sport is familiar.`,
    },
  ],
  faqs: [
    {
      q: "How many points is a touchdown?",
      a: "Six, plus a try that is worth one if kicked or two if scored from the 2-yard line. A field goal is three. A safety is two.",
    },
    {
      q: "Does a spread include overtime?",
      a: "Only if that market's rules say so. The league plays overtime when regulation is tied. The slip is what grades your bet.",
    },
    {
      q: "Is the spread the same as the moneyline?",
      a: "No. The moneyline is who wins. The spread is who wins after a handicap. You can win one and lose the other.",
    },
    {
      q: "Why do people talk about 3 and 7?",
      a: "Because a field goal is 3 and a touchdown plus a kicked try is 7. That makes those margins common subjects of a line. It is not a measured frequency on this page.",
    },
    {
      q: "Can I bet the NFL here?",
      a: "No. This site does not book football.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: American football rules (scoring values)",
      url: "https://en.wikipedia.org/wiki/American_football_rules",
    },
    { label: "NFL rulebook", url: "https://operations.nfl.com/the-rules/nfl-rulebook/" },
  ],
  related: ["vig-betting", "moneyline-betting-explained", "prop-bets-explained", "what-is-sports-betting"],
  updated: "2026-10-21",
};
