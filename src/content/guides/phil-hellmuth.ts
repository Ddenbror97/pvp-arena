import type { Guide } from "./types";

export const guide: Guide = {
  slug: "phil-hellmuth",
  cluster: "Casino knowledge",
  keyword: "phil hellmuth",
  secondary: ["phil hellmuth net worth", "phil hellmuth story", "phil hellmuth facts"],
  title: "Phil Hellmuth: WSOP Records and Tournament Results",
  description:
    "Phil Hellmuth is known for WSOP tournament achievements. Learn how to read his official player record and distinguish cashes, bracelets and net profit.",
  h1: "Phil Hellmuth: reading a poker tournament record",
  answer:
    "Phil Hellmuth is a professional poker player known for his World Series of Poker tournament career and his 1989 Main Event victory. The WSOP player record is the appropriate source for dated bracelet and cash results. A tournament payout records a gross award; it is not an audited statement of personal profit or wealth.",
  facts: [
    "WSOP records tournament achievements by event and player.",
    "A bracelet count is a dated sporting statistic, not a fixed lifetime number.",
    "Buy-ins, repeated entries, backing and taxes affect the value retained from a cash.",
  ],
  sections: [
    {
      id: "section-1",
      title: "Start with the event record",
      body: `Use the official WSOP player page to check the event, year, finish and award. A victory in a non-WSOP competition is not a WSOP bracelet, and a televised cash-game win is not a tournament cash. Historical articles can preserve an old count; compare the date before calling the number current.`,
    },
    {
      id: "section-2",
      title: "What a payout tells you",
      body: `A cash is the prize awarded for a recorded finish. To calculate net tournament profit, account for entries and other relevant costs. To calculate a player's personal share, also account for any backing or swapped action. Those arrangements generally are not supplied by the results table.

[Poker bankroll management](/guides/poker-bankroll-management) concerns exposure across events, while [poker fundamentals](/guides/how-to-play-poker) concerns decisions within them.`,
    },
    {
      id: "section-3",
      title: "Reputation and evidence",
      body: `Televised personality is part of Hellmuth's public profile, but it does not quantify skill in every format or prove a specific hand was correct. Evaluate a hand from its rules and action. For another WSOP career, see [Doyle Brunson](/guides/doyle-brunson).`,
    },
  ],
  faqs: [
    {
      q: "What is Phil Hellmuth known for?",
      a: "His WSOP tournament career, including winning the Main Event in 1989.",
    },
    {
      q: "Where should I check his current bracelet count?",
      a: "The official WSOP player record, with attention to its update date and which events it includes.",
    },
    {
      q: "Are gross cashes the same as profit?",
      a: "No. Entry costs and any shared ownership of action have to be accounted for.",
    },
    {
      q: "Can a tournament record verify his net worth?",
      a: "No. Personal wealth also depends on assets, debts, taxes and activity outside recorded tournaments.",
    },
  ],
  sources: [
    {
      label: "WSOP: Poker Hall of Fame and player records",
      url: "https://www.wsop.com/hall-of-fame/",
    },
    {
      label: "WSOP.com player page for Phil Hellmuth",
      url: "https://www.wsop.com/players/690290266/phil-hellmuth/",
    },
  ],
  related: [
    "texas-holdem-rules",
    "how-to-play-poker",
    "gto-poker-strategy",
    "poker-bankroll-management",
    "tom-dwan",
  ],
  updated: "2026-11-26",
};
