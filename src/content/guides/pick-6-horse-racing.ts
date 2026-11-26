import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pick-6-horse-racing",
  cluster: "Horse racing",
  keyword: "pick 6 horse racing",
  secondary: [
    "pick 6 horse racing odds",
    "pick 6 horse racing payout",
    "pick 6 horse racing explained",
  ],
  title: "Pick 6 Horse Racing: Ticket Cost and Pool Rules",
  description:
    "Learn how Pick 6 horse racing tickets cover six races, multiply combination costs and handle takeout, carryovers, consolation prizes and scratches.",
  h1: "Pick 6 horse racing: six winners and the cost of coverage",
  answer:
    "Pick 6 horse racing requires selecting the winner of each of six designated races. Using multiple horses in a leg buys extra combinations: multiply the number selected in each leg, then multiply by the base stake. Payouts come from the relevant pari-mutuel pool under track-specific takeout, carryover, scratch and consolation rules.",
  facts: [
    "Six designated races form the sequence; check the race numbers.",
    "Two horses in every leg produce 64 combinations.",
    "Carryover and jackpot formats are not interchangeable.",
    "A scratch substitution can change what the ticket actually covers.",
  ],
  sections: [
    {
      id: "cost",
      title: "Build the ticket before buying it",
      body: "A ticket using 2 × 1 × 3 × 2 × 1 × 2 horses contains 24 combinations. At a hypothetical $1 base it costs $24; at a $0.20 base it costs $4.80. The track’s minimum and format determine which base is available. A single in a leg reduces cost but makes that horse essential to every combination.\n\nCompare [exactas](/guides/exacta-bet), [trifectas](/guides/trifecta-bet) and the [horse racing topic](/guides/topics/horse-racing) for single-race combination bets.",
    },
    {
      id: "pools",
      title: "Carryovers, consolation and takeout",
      body: "NYRA’s published wagering page distinguishes Pick 6 takeout on ordinary and carryover days and describes a net-pool allocation between six-winner and five-winner tickets. Those are NYRA terms, not one national Pick 6 schedule. Other tracks can offer a jackpot format that reserves money for a unique winning ticket. Read the current wager menu and mandatory-payout conditions.\n\nA carryover is money in the pool, not proof of positive expected value for your ticket. New betting volume, takeout, number of winning combinations and your selections still determine the result.",
    },
    {
      id: "changes",
      title: "Scratches, surface switches and official results",
      body: "Check scratch substitutions before the first leg. Rules may substitute a designated favorite or use another procedure; a scratched selection does not always mean a refund. A canceled race or surface switch can have separate all-winner or refund provisions. Keep the receipt until the entire sequence is official.\n\n[Horse-racing odds](/guides/horse-racing-odds-explained) explains why pool payoffs are not locked in when the bet is placed. Set the full ticket budget, including backups, before submitting; [responsible gambling tools](/responsible-gambling) can help limit rapid cost expansion.",
    },
  ],
  faqs: [
    {
      q: "Is Pick 6 six bets on one race?",
      a: "No. It covers winners in six designated races.",
    },
    {
      q: "What does two horses in each leg cost?",
      a: "It creates 2 to the sixth power, or 64 combinations. Multiply 64 by the permitted base stake.",
    },
    {
      q: "Is a carryover a guaranteed profitable opportunity?",
      a: "No. The total pool, takeout, competition and probability of your combinations still matter.",
    },
    {
      q: "Does a scratched horse always refund the ticket?",
      a: "No. Multi-race wagers can use substitution or other track-specific rules. Check the exact wager terms.",
    },
  ],
  sources: [
    {
      label: "NYRA: wager definitions, pools and takeout",
      url: "https://www.nyra.com/saratoga/racing/nyra-wagering-info/",
    },
    {
      label: "New York Gaming Commission: Pick Six jackpot-pool rule",
      url: "https://cms.nyra.com/uploads/wysiwyg/assets/uploads/Pick-Six_Jackpot_NYSGC_Rule.pdf",
    },
  ],
  related: [
    "exacta-bet",
    "horse-racing-odds-explained",
    "how-to-bet-on-horse-racing",
    "house-edge",
    "quinella-bet",
  ],
  updated: "2026-11-26",
};
