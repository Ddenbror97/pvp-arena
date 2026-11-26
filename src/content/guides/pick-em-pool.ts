import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pick-em-pool",
  cluster: "Sports betting",
  keyword: "pick em pool",
  secondary: ["pick em pool promo code", "pick em pool legal states", "pick em pool payout"],
  title: "Pick’em Pool Rules: Scoring, Ties and Payouts",
  description:
    "Learn how pick’em pools score straight-up and against-spread selections, use confidence points, handle ties and deadlines and calculate the prize fund.",
  h1: "Pick em pool: agree the scoring before the first pick",
  answer:
    "A pick em pool asks entrants to select outcomes from a slate of games and ranks them under a shared scoring rule. It can use straight-up winners, against-the-spread selections or confidence points. The organizer must state deadlines, tie handling, missed-pick treatment, entry limits and prize splits before collecting money.",
  facts: [
    "A straight-up pool and an ATS pool can grade the same game differently.",
    "Confidence points weight selections instead of counting every pick equally.",
    "Prize-fund arithmetic must include any actual administration charge.",
    "Pool rules and local authorization are separate questions.",
  ],
  sections: [
    {
      id: "scores",
      title: "Choose the scoring model",
      body: "In a simple straight-up pool, each correct winner can earn one point. An ATS pool grades the team against a designated spread, so it needs a line source and timestamp as well as a push rule. A confidence pool assigns different weights, often using each weight once per slate; verify whether a tied game returns points, gives zero or uses another rule.\n\n[ATS results](/guides/ats-in-betting) and [bracket pools](/guides/bracket-pool) explain two neighboring formats. Survivor is different: it usually eliminates unsuccessful entries rather than accumulating a full slate’s points.",
    },
    {
      id: "money",
      title: "An original prize-fund example",
      body: "Twenty entrants paying $10 collect $200. With no administration charge, that is the prize fund. A stated 70/30 first-and-second split pays $140 and $60. If the agreed rules instead retain $20 for administration, the $180 prize fund splits to $126 and $54. Do not silently subtract expenses after entries close.\n\nFor tied places, decide whether to combine and split the occupied prizes or apply an announced tiebreaker such as a selected game’s total. A tiebreaker chosen after the results favors hindsight.",
    },
    {
      id: "deadlines",
      title: "Deadline and disruption rules",
      body: "Specify whether picks lock at the first game, each selected game or a weekly deadline. State how postponed games, canceled games, missed picks and late entries are treated. Keep a timestamped copy of entries and rules. Splash’s published pool documentation is an example of a formal platform rule set, not a legal authorization for every private pool.\n\nSee [survivor pools](/guides/survivor-pool), [fantasy payout agreements](/guides/fantasy-football-payouts) and the [sports betting topic](/guides/topics/sports-betting). Check local paid-pool restrictions and set an affordable season budget with [responsible gambling tools](/responsible-gambling).",
    },
  ],
  faqs: [
    {
      q: "Is a pick’em pool the same as survivor?",
      a: "No. A pick’em pool usually scores a slate of picks; survivor generally eliminates an entry after an unsuccessful required pick, subject to its variant rules.",
    },
    {
      q: "Can a team win the game but lose an ATS pool pick?",
      a: "Yes. The result must also beat the designated spread.",
    },
    {
      q: "How should a tie for first be paid?",
      a: "Use the announced prize-split or tiebreaker rule. Write it before entries are accepted.",
    },
    {
      q: "Is an office pool automatically lawful?",
      a: "No. A private or workplace setting does not by itself resolve local gambling restrictions or organizer requirements.",
    },
  ],
  sources: [
    {
      label: "Splash Sports: house rules and pool-format links",
      url: "https://legal.splashsports.com/legal/splash-sports-house-rules",
    },
    {
      label: "Splash Sports: configurable survivor format",
      url: "https://splashsports.com/games/survivor",
    },
  ],
  related: [
    "bet-with-friends-online",
    "what-is-sports-betting",
    "sports-betting-legal-states",
    "peer-to-peer-sports-betting",
    "public-betting-percentages",
  ],
  updated: "2026-11-26",
};
