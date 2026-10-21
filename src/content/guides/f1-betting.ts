import type { Guide } from "./types";

export const guide: Guide = {
  slug: "f1-betting",
  cluster: "Sports betting",
  keyword: "f1 betting",
  secondary: ["f1 odds", "f1 point spread", "how to bet on f1"],
  title: "F1 Betting: Race Winners, Podiums and Outrights",
  description:
    "F1 betting splits the race winner, the podium, and the championship. A car under 90% of the winner's laps is not classified. A market can be stricter.",
  h1: "F1 betting: classified is a rule, and the market may be stricter",
  answer:
    "F1 betting prices a Formula 1 session. Under the FIA 2026 sporting regulations the race is the least number of complete laps that exceed 305 km, or 260 km in Monaco, and it also has a two-hour clock that a suspension can stretch toward three hours. A car is not classified if it covers less than 90% of the winner's laps, rounded down. A race-winner bet, a podium, and a season outright are three different results. This page quotes no odds.",
  facts: [
    "The winner is the car that covers the scheduled distance in the shortest time, or that leads when the time limit ends the race.",
    "Cars below 90% of the winner's lap count, rounded down to a whole lap, are not classified. That is a classification rule, not automatically a betting grade.",
    "A podium is the first three classified finishers. It is not the same bet as the winner.",
    "An outright is the championship, not Sunday's race. Qualifying is a separate session with its own classification.",
    "PVPspinArena does not book motor racing.",
  ],
  sections: [
    {
      id: "race",
      title: "Distance, time, and who finished",
      body: `Article B2.5 of the FIA 2026 Formula 1 sporting regulations sets the race distance at the smallest number of complete laps over 305 km, with Monaco at 260 km. If two hours pass before that distance is done, the leader is shown the end signal on the lap after the two hours, without exceeding the scheduled laps. A suspension can add time, up to a total of three hours.

Classification is in B2.5.5. First is the car that did the scheduled distance fastest, or that led across the control line when the time limit ended the race. Everyone else is ordered by completed laps, and by the order they crossed the line if the lap count matches. A car that did less than 90% of the winner's laps, rounded down, is not classified. A retirement can still be classified if it cleared that line. A retirement that did not is absent from the result, which is a different fact from "still running at the flag."

The regulations are dated and reissued. The citation here is Issue 9, 1 October 2026. A later issue can move a sentence. The FIA text in force that weekend is the sporting rule.`,
    },
    {
      id: "markets",
      title: "Winner, podium, and outright",
      body: `A race-winner market usually asks who is first in the classification the book accepts. A podium market pays if the driver is first, second, or third in that classification. Winning the race wins a podium bet. Finishing second wins the podium and loses the winner. An outright, or drivers' championship, market is the season. It is not settled on Sunday, and a driver who fails to be classified in one race is not out of the championship because of that sentence alone.

Qualifying is its own session. A pole bet is not a race bet. A fastest-lap bet is not a podium. [Prop bets explained](/guides/prop-bets-explained) is the right drawer for those. [What sports betting is](/guides/what-is-sports-betting) is the general contract. [Vig betting](/guides/vig-betting) is the margin in a price with a long list of drivers, where the hold is easy to underestimate because each price looks large.

A point spread is not a natural F1 market. If a book sells a "winning margin" or a head-to-head between two drivers, that market's own rule says whether a non-classification voids the ticket.`,
    },
    {
      id: "voids",
      title: "Do not treat 90% as the betting rule",
      body: `The 90% line decides the official classification. A sportsbook can still void a bet if the race distance is shortened below a threshold of its own, or if a driver does not take the start, or if the session is red-flagged and not resumed. Those sentences live on the slip. The FIA article explains what the officials published. It does not grade your ticket.

Head-to-head markets are the ones people misread. If one driver is not classified and the other is, some books pay the classified driver and some void. Find the sentence. A missing sentence is a reason not to bet the pair.`,
    },
    {
      id: "no-race",
      title: "No race book on this site",
      body: `PVPspinArena does not offer F1 betting. Adults only. [Responsible gambling](/responsible-gambling) applies to a Sunday that also sells qualifying, sprint, and a dozen specials. The hub is [sports betting](/guides/topics/sports-betting). The [terms](/terms) do not list a starting grid.`,
    },
  ],
  faqs: [
    {
      q: "How long is a Formula 1 race?",
      a: "The 2026 regulations set it at the fewest complete laps over 305 km, or 260 km in Monaco, with a two-hour limit that a suspension can extend up to three hours.",
    },
    {
      q: "What does 90% classified mean?",
      a: "A car that covers less than 90% of the winner's laps, rounded down to a whole lap, is not in the official classification. A betting market can use a stricter void rule.",
    },
    {
      q: "Does a podium bet win if my driver finishes second?",
      a: "Yes, if the market is top three in the classification the book uses. It does not win a race-winner bet.",
    },
    {
      q: "Is the championship settled by one race?",
      a: "No. An outright is the season. One unclassified race is not the championship result.",
    },
    {
      q: "Does this site book Formula 1?",
      a: "No.",
    },
  ],
  sources: [
    {
      label: "FIA 2026 Formula 1 sporting regulations, Issue 9 (1 October 2026)",
      url: "https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_b_sporting_-_iss_09_-_2026-10-01.pdf",
    },
  ],
  related: ["prop-bets-explained", "what-is-sports-betting", "vig-betting", "moneyline-betting-explained"],
  updated: "2026-10-21",
};
