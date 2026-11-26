import type { Guide } from "./types";

export const guide: Guide = {
  slug: "splash-sports-review",
  cluster: "Sports betting",
  keyword: "splash sports",
  secondary: ["peer pools", "commissioner contest", "pick em pool"],
  title: "Splash Sports Review: Pools, Fees and Payouts",
  description:
    "Review Splash Sports contest rules, fees, prize splits and elimination settings, with a pool-cost example and clear limits on untested payment claims.",
  h1: "Splash Sports review: understand the actual contest",
  answer:
    "Splash Sports hosts contests such as survivor, pick’em and fantasy formats. Entrants pay the listed entry cost and compete under that contest’s scoring and prize rules. Eligibility, elimination settings, ties and fees can differ by format. Review the individual contest details before treating a pool as winner-take-all or assuming an advertised prize equals entry collections.",
  facts: [
    "The contest’s prize schedule is published before entry.",
    "Guaranteed and non-guaranteed contests need different fee calculations.",
    "A tied rank can combine and split occupied prize positions.",
    "This is a rules review, without a deposit or withdrawal test.",
  ],
  sections: [
    {
      id: "cost",
      title: "A pool-cost example",
      body: "If a hypothetical non-guaranteed pool collects 100 entries of $20, entry collections are $2,000. If its published prizes total $1,800 and the remaining $200 is the administration charge, that is 10% of collections. This is an original accounting example, not a universal Splash fee. A guaranteed contest can have operator-funded overlay, so subtracting prizes from incomplete entry collections does not always measure the operator’s fee.",
    },
    {
      id: "rules",
      title: "Survivor, pick’em and ties",
      body: "Survivor contests can differ in lives, repeat-team limits, extra-pick weeks, deadlines and buybacks. Pick’em asks entrants to make a set of selections under its own scoring system. Check whether picks are straight-up or against the spread.\n\nSplash’s general house rules say tied entrants normally share the combined prizes for the places occupied unless contest-specific rules say otherwise. For example, if first and second prizes are $100 and $60 and two entrants tie for first under that rule, each receives $80. Read the actual contest for exceptions.",
    },
    {
      id: "access",
      title: "Eligibility and payment limits",
      body: "The house rules distinguish availability by product and location and list higher age requirements in certain jurisdictions. A product available to one adult in one state need not be available to another. Winning account credit and a completed bank withdrawal are separate steps; the published rules do not establish a measured payment speed.\n\nSee [survivor pools](/guides/survivor-pool), [pick’em pools](/guides/pick-em-pool) and [fantasy payout schedules](/guides/fantasy-football-payouts) in the [sports betting topic](/guides/topics/sports-betting). Count every entry and buyback toward a fixed budget using [responsible gambling limits](/responsible-gambling).",
    },
  ],
  faqs: [
    {
      q: "Is every Splash contest winner-take-all?",
      a: "No. Read the contest’s prize schedule, tie terms and format.",
    },
    {
      q: "Can the same team be reused in survivor?",
      a: "That depends on the contest’s repeat-team settings. The basic no-repeat format is only one variant.",
    },
    {
      q: "How are tied prize positions split?",
      a: "The general house rule combines prizes for the occupied positions and splits them evenly unless the contest specifies otherwise.",
    },
    {
      q: "Was withdrawal speed tested?",
      a: "No. This review explains published contest documentation and does not claim a funded payment test.",
    },
  ],
  sources: [
    {
      label: "Splash Sports: house rules",
      url: "https://legal.splashsports.com/legal/splash-sports-house-rules",
    },
    {
      label: "Splash Sports: survivor settings",
      url: "https://splashsports.com/games/survivor",
    },
    {
      label: "Splash Sports: withdrawal FAQs",
      url: "https://legal.splashsports.com/faq-categories/withdrawals",
    },
  ],
  related: ["fantasy-football-payouts", "dfs-strategy", "bet-with-friends-online"],
  updated: "2026-11-26",
};
