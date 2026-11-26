import type { Guide } from "./types";

export const guide: Guide = {
  slug: "double-chance-bet",
  cluster: "Sports betting",
  keyword: "double chance",
  secondary: ["1X soccer coupon", "12 soccer coupon", "X2 soccer coupon"],
  title: "Double Chance Bet: 1X, X2 and 12 Explained",
  description:
    "Understand double chance bets on soccer, the 1X, X2 and 12 combinations, draw settlement and how the market differs from draw no bet and moneylines.",
  h1: "Double chance bet: two of the three soccer outcomes",
  answer:
    "A double chance bet covers two results in a three-way soccer market: 1X is home win or draw, X2 is draw or away win, and 12 is either team winning. The uncovered result loses. Ordinary full-time markets use 90 minutes plus stoppage time, excluding extra time and penalties unless the rules say otherwise.",
  facts: [
    "1 means home win, X means draw and 2 means away win.",
    "1X and X2 win on a draw; 12 loses on a draw.",
    "Draw no bet refunds a draw instead of paying a win.",
    "Greater outcome coverage usually comes with a smaller payout.",
  ],
  sections: [
    {
      id: "outcomes",
      title: "Grade the three combinations",
      body: "| Full-time score | 1X | X2 | 12 |\n| --- | --- | --- | --- |\n| Home wins 2–0 | Win | Loss | Win |\n| Draw 1–1 | Win | Win | Loss |\n| Away wins 0–2 | Loss | Win | Win |\n\nThe draw is an outcome, not automatically a push. In particular, 12 loses on a draw. [Draw no bet](/guides/draw-no-bet) uses a different refund rule; [soccer betting](/guides/soccer-betting) explains 1X2 and other match markets.",
    },
    {
      id: "price",
      title: "Coverage does not make the three outcomes equally likely",
      body: "A home win, draw and away win are not automatically one-third each. If an original hypothetical estimate assigns 50%, 30% and 20%, then 1X has 80% probability, X2 has 50% and 12 has 70%. Those values come from the stated assumptions, not from a real fixture.\n\nAt example decimal odds of 1.25, a $20 winning bet returns $25 including stake and earns $5 profit. Break-even is 1 / 1.25 = 80%. A wider win condition can still be a poor price. Avoid adding the probabilities of all three double-chance selections to measure ordinary three-way overround: their coverage overlaps.",
    },
    {
      id: "period",
      title: "Period and combination checks",
      body: "Confirm that the selection covers the intended match and period. A team can draw after 90 minutes and win in extra time; the ordinary full-time 12 ticket still loses if it excludes extra time. A “to qualify” market follows a different test.\n\nA double-chance leg combined with totals or BTTS can be correlated, so the combined price needs the joint probability. See [both teams to score](/guides/both-teams-to-score) and the [sports betting topic](/guides/topics/sports-betting). Keep the stake within a fixed limit using [responsible gambling tools](/responsible-gambling).",
    },
  ],
  faqs: [
    {
      q: "Does 12 refund my stake on a draw?",
      a: "No. The 12 double-chance selection wins only on a home or away win, so a draw loses.",
    },
    {
      q: "Is 1X the same as draw no bet?",
      a: "No. 1X pays a win on a home win or draw. A home draw-no-bet ticket refunds a draw.",
    },
    {
      q: "Does extra time count?",
      a: "Ordinary full-time soccer markets exclude extra time and penalties unless specifically included.",
    },
    {
      q: "Is a double chance automatically a two-thirds chance?",
      a: "No. The home, draw and away probabilities depend on the fixture and are not equally likely by default.",
    },
  ],
  sources: [
    {
      label: "DraftKings: betting glossary and settlement terms",
      url: "https://support.draftkings.com/dk/en-us/glossary-of-betting-terms?id=kb_article_view&sysparm_article=KB0010398",
    },
    {
      label: "FanDuel Iowa: sportsbook rules, including sport-specific settlement",
      url: "https://policies.fanduel.com/SB/IA/2026-10-29T12-02-28.html",
    },
  ],
  related: [
    "draw-no-bet",
    "both-teams-to-score",
    "asian-handicap",
    "what-is-sports-betting",
    "vig-betting",
    "lucky-15-bet",
  ],
  updated: "2026-11-26",
};
