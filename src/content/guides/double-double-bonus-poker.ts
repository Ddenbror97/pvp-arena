import type { Guide } from "./types";

export const guide: Guide = {
  slug: "double-double-bonus-poker",
  cluster: "Poker",
  keyword: "double double bonus poker",
  secondary: [
    "double double bonus poker rtp",
    "double double bonus poker max win",
    "double double bonus poker demo",
  ],
  title: "Double Double Bonus Poker: Kicker and Paytable",
  description:
    "Compare Double Double Bonus Poker’s four-of-a-kind kicker awards, paytable rows, credit values and strategy requirements without mixing poker formats.",
  h1: "Double double bonus poker: the kicker changes the award",
  answer:
    "Double double bonus poker is a video-poker variant whose four-of-a-kind awards depend on the rank of the quads and sometimes the fifth card, called the kicker. Four aces with a qualifying low kicker can pay differently from four aces alone. The exact paytable and wager column determine the award and the appropriate hold strategy.",
  facts: [
    "The fifth card can change a qualifying four-of-a-kind award.",
    "Full-house, flush and other rows also affect expected return.",
    "Jacks or Better holds cannot be copied unchanged to a different schedule.",
    "A listed award in credits needs a denomination before it becomes a dollar amount.",
  ],
  sections: [
    {
      id: "what",
      title: "Read the whole schedule",
      body: `Identify the four-aces row, its qualifying kicker row and the other low-quad categories. Then check the full-house, flush, two-pair and royal-flush awards. A headline ace payout alone does not determine the game’s return.

The South Dakota Lottery’s September 2022 guide separates four aces with a 2, 3 or 4 kicker from other four-aces outcomes in its Double Double Bonus listing. Its lab-derived odds are for the documented games, not a universal paytable or guarantee for another operator.`,
    },
    {
      id: "compare",
      title: "Match the strategy to the rows",
      body: `Expected-value analysis compares every possible draw for the cards held. Changing an award can change which draw is preferable. Use analysis for the exact table rather than selecting a hold because it once appeared in a Jacks or Better example.

See [video-poker paytables](/guides/video-poker-paytables), [Jacks or Better strategy](/guides/jacks-or-better-strategy) and [Joker Poker](/guides/joker-poker) in the [poker topic](/guides/topics/poker). A wild-card game is another distinct model.`,
    },
    {
      id: "fees",
      title: "Keep credits and return separate",
      body: `A hypothetical 200-credit award at a $0.05 denomination is $10. That is a conversion example, not this game’s published award. Check the selected wager column and whether an award scales proportionally with the credits played.

RTP requires probabilities weighted by awards under a defined strategy. A maximum award and the frequency of any win answer different questions. Neither a short demo nor a large possible ace award establishes profitable play.`,
    },
    {
      id: "examples",
      title: "Before playing a paid version",
      body: `Confirm the provider, version, paytable, denomination and selected wager. A practice mode, when available, may use different terms. PVPspinArena does not offer this video-poker game.

Meet the operator’s minimum age and local eligibility requirements. Fix a spending limit before chasing a particular kicker; use [responsible gambling](/responsible-gambling) if repeated draws are exceeding that limit.`,
    },
  ],
  faqs: [
    {
      q: "What does the kicker do?",
      a: "The fifth card can qualify a four-of-a-kind hand for a different award under the listed schedule.",
    },
    {
      q: "Is every paytable identical?",
      a: "No. Check all rows and the selected wager column; the title does not establish one RTP.",
    },
    {
      q: "Can I use a Jacks or Better chart?",
      a: "Use a chart matched to the actual schedule. Different quad and other awards can change the preferred hold.",
    },
    {
      q: "How do credits become dollars?",
      a: "Multiply awarded credits by the selected credit denomination. Read the wager column too.",
    },
    {
      q: "Does a large ace award imply a positive return?",
      a: "No. The complete distribution, paytable and strategy determine expected return; one rare award is insufficient.",
    },
  ],
  sources: [
    {
      label: "South Dakota Lottery: video-poker game odds and paytable caveats (September 2022)",
      url: "https://lottery.sd.gov/wp-content/uploads/2022/10/VideoLottery_GamingOdds.pdf",
    },
  ],
  related: [
    "video-poker-paytables",
    "jacks-or-better-strategy",
    "cash-game-poker",
    "crypto-poker",
    "joker-poker",
  ],
  updated: "2026-11-26",
};
