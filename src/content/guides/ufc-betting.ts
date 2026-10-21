import type { Guide } from "./types";

export const guide: Guide = {
  slug: "ufc-betting",
  cluster: "Sports betting",
  keyword: "ufc betting",
  secondary: ["ufc odds", "ufc point spread", "how to bet on ufc"],
  title: "UFC Betting: Moneylines, Rounds and Weight Class",
  description:
    "UFC betting is a moneyline plus method and round markets. Scoring uses the 10-point must system. A weight miss follows the bout rules and the slip.",
  h1: "UFC betting: method and rounds, not a point spread",
  answer:
    "UFC betting prices a mixed martial arts bout. The moneyline is who wins. A method market is how: knockout, technical knockout, submission, or a decision on the 10-point must system. A round market is when. Those are different bets. Weight classes and the definition of a finish come from the bout rules. This page does not quote odds, and a point spread is a poor name for a fight.",
  facts: [
    "Unified Rules scoring gives the round winner 10 points and the other fighter 9 or fewer, except a rare 10-10 round.",
    "Judges weigh effective striking and grappling first. Aggressiveness and cage control are tie-breaks, not the main score.",
    "A finish and a decision are different results. A method bet can lose on a fight the moneyline won.",
    "The scheduled length is in the bout agreement. Do not assume every fight is five rounds.",
    "PVPspinArena does not book fights.",
  ],
  sections: [
    {
      id: "method",
      title: "Four results people mix up",
      body: `The Association of Boxing Commissions' Unified Rules of MMA describe knockouts, technical knockouts, and submissions as ways a bout ends before the scorecards, and they describe the 10-point must system for the rounds that reach the judges. A moneyline that pays the winner is settled by whichever of those the referee and the commission record. A "to win by finish" bet loses if the same fighter wins a decision. A "to win by decision" bet loses if the same fighter wins in the second round.

Round betting asks whether the stoppage falls inside a named round. A decision means no round contained the finish. Read whether a technical decision, a disqualification, or a no contest is a winner, a void, or a loss on that ticket. The Unified Rules have their own conditions for a technical decision. The sportsbook can be stricter. The slip wins the argument.`,
    },
    {
      id: "scorecards",
      title: "What 10-9 actually means",
      body: `Three judges score. The fighter who won the round gets 10. The other gets 9 for a close round, 8 for a large-margin round, and lower still when the criteria say so. A 10-10 is allowed and described as rare. Damage and effective grappling are the first pass. Effective aggressiveness and control of the fighting area are considered when that first pass is even. Defense is not itself a score.

You do not need to rescore the fight to bet it. You do need to know that a decision market is a bet on the judges, and a finish market is a bet on the referee stopping it. [Moneyline betting explained](/guides/moneyline-betting-explained) is the winner market in other sports. Here the winner can arrive by stoppage or by cards. [Prop bets explained](/guides/prop-bets-explained) is the right family for method and round.`,
    },
    {
      id: "weight",
      title: "Weight is a safety rule, not a handicap",
      body: `The Unified Rules list classes from atomweight through super heavyweight, and they describe what happens when a fighter misses weight, including a catchweight limit of five pounds when the two are in different classes. A promotion can also contract a catchweight from the start. The class on the poster is not always the class both fighters made.

A missed weight can change the bout, the purse, or whether the bout happens. It does not, by itself, tell you how a sportsbook grades a ticket that was already sold. Look at that book's weigh-in rule. A "point spread" label copied from a football coupon is the wrong tool. Fights are not priced as minus-3.5 except as a novelty market a book bothers to define. [Vig betting](/guides/vig-betting) still applies to the two-way price.`,
    },
    {
      id: "absent",
      title: "No fight card on this site",
      body: `PVPspinArena does not offer UFC betting. Adults only. [Responsible gambling](/responsible-gambling) matters on a card of early prelims, because the number of bets available is large and the events are short. [What sports betting is](/guides/what-is-sports-betting) is the general contract. The topic hub is [sports betting](/guides/topics/sports-betting). The [terms](/terms) do not list a fight market.`,
    },
  ],
  faqs: [
    {
      q: "Is a UFC bet a point spread?",
      a: "The standard bet is a moneyline on the winner, plus separate markets for method and round. A football-style spread is not the usual market.",
    },
    {
      q: "What is the 10-point must system?",
      a: "The winner of the round is given 10. The other fighter is given 9 or fewer. An even round, scored 10-10, is allowed and uncommon.",
    },
    {
      q: "If my fighter wins a decision, do I win a finish bet?",
      a: "No. A finish bet needs a stoppage. A decision is the other result.",
    },
    {
      q: "How many rounds is the fight?",
      a: "The bout agreement says. Do not assume five. A round bet is graded against the scheduled length on that agreement and the market rules.",
    },
    {
      q: "Does this site take fight bets?",
      a: "No.",
    },
  ],
  sources: [
    {
      label: "ABC Unified Rules of MMA (August 2025 PDF)",
      url: "https://www.abcboxing.com/wp-content/uploads/2025/08/Unified-Rules-of-MMA-8.2025.pdf",
    },
  ],
  related: ["moneyline-betting-explained", "prop-bets-explained", "vig-betting", "what-is-sports-betting"],
  updated: "2026-10-21",
};
