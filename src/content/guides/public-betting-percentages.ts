import type { Guide } from "./types";

export const guide: Guide = {
  slug: "public-betting-percentages",
  cluster: "Sports betting",
  keyword: "public betting percentages",
  secondary: [
    "public betting percentages fees",
    "public betting percentages commission",
    "public betting percentages legit",
  ],
  title: "Public Betting Percentages: Tickets vs Money",
  description:
    "Read public betting percentages correctly: ticket count versus money wagered, provider samples, timestamps and why a public split is not a prediction.",
  h1: "Public betting percentages: identify the denominator",
  answer:
    "Public betting percentages describe a provider’s recorded wagers on each side of a market. Ticket percentage counts bets; money percentage measures their stake value. A side can have most tickets but less money if its average bet is smaller. The sample is not automatically the entire betting market, and the split does not predict who wins.",
  facts: [
    "Ticket share and money share answer different questions.",
    "A provider’s customer sample can differ from the wider market.",
    "The market, line, source and timestamp are essential context.",
    "A reverse move does not prove informed bettors caused it.",
  ],
  sections: [
    {
      id: "example",
      title: "A split that points in two directions",
      body: "In an original example, 70 tickets of $10 favor Team A and 30 tickets of $100 favor Team B. Team A has 70% of tickets but only $700 / $3,700 = 18.92% of the money. Team B has 30% of tickets and 81.08% of the money. Neither percentage is a probability of winning.\n\nA screenshot without the ticket count and stake denominator can exaggerate a small sample. A single large wager can move the money percentage sharply.",
    },
    {
      id: "source",
      title: "Ask what the provider actually counts",
      body: "Check whether the figures come from one operator, several operators or an estimate. Record the sport, exact market, accepted line and update time. Spread tickets, moneyline tickets and parlay inclusions are not interchangeable. A 70% number on the moneyline does not establish the spread split.\n\nLater wagers and price changes can alter the sample. A number from yesterday cannot explain today’s final line unless the data window matches.",
    },
    {
      id: "interpretation",
      title: "Do not turn a descriptive split into a betting rule",
      body: "A line can move after injury news, roster changes or another operator’s repricing. A move opposite the ticket majority does not prove a secret sharp position or a guaranteed contrarian edge. Compare the actual price with a defensible probability estimate.\n\nSee [reverse line movement](/guides/reverse-line-movement), [closing line value](/guides/closing-line-value) and [line shopping](/guides/line-shopping) in the [sports betting topic](/guides/topics/sports-betting). Keep a fixed loss limit with [responsible gambling tools](/responsible-gambling), rather than increasing stakes because a bar chart appears decisive.",
    },
  ],
  faqs: [
    {
      q: "Can a side lead tickets but trail money?",
      a: "Yes. Numerous small bets can be outweighed by fewer large bets.",
    },
    {
      q: "Is 70% of tickets a 70% chance to win?",
      a: "No. It describes selected betting activity, not the event’s win probability.",
    },
    {
      q: "Does one book’s split represent every bettor?",
      a: "No. It covers that provider’s stated sample and reporting window.",
    },
    {
      q: "Does reverse line movement prove sharp money?",
      a: "No. News, other market prices and sample differences can also explain the movement.",
    },
  ],
  sources: [
    {
      label: "DraftKings: betting glossary and settlement terms",
      url: "https://support.draftkings.com/dk/en-us/glossary-of-betting-terms?id=kb_article_view&sysparm_article=KB0010398",
    },
  ],
  related: [
    "vig-betting",
    "what-is-sports-betting",
    "house-edge",
    "gamblers-fallacy",
    "pick-em-pool",
  ],
  updated: "2026-11-26",
};
