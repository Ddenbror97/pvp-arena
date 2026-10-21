import type { Guide } from "./types";

export const guide: Guide = {
  slug: "blackjack-tournaments",
  cluster: "Blackjack",
  keyword: "blackjack tournaments",
  secondary: ["blackjack tournaments"],
  title: "Blackjack Tournaments: Chips, the Clock and the Buy-In",
  description:
    "Blackjack tournaments rank you by chips, not by cash expected value. The buy-in, clock, and cut are on the event sheet. Basic strategy is the cash game.",
  h1: "Blackjack tournaments: the chip count is the score, not the edge",
  answer:
    "Blackjack tournaments charge a buy-in and give you tournament chips that rank you against the field. You advance, or you cash, by having more chips than other players when the round ends, not by making the highest expected-value decision on every hand. Basic strategy is the cash-game chart. It does not by itself win a tournament. Starting chips, hands per round, and prizes are on that event's sheet. This page leaves them blank.",
  facts: [
    "The buy-in is the entry price. Tournament chips are the score. They are not cash you can withdraw in the middle of a round.",
    "A cut is a ranking. Surviving with more chips than the bubble matters more than the theoretical value of one hand.",
    "Basic strategy minimises the house edge in a cash game under posted rules. A tournament can make a lower-expectation play correct if the alternative eliminates you.",
    "The clock limits how many hands you get. You cannot wait indefinitely for a favorable spot.",
    "No payout table on this page is an event. If the sheet is missing, you do not know the price of the buy-in.",
  ],
  sections: [
    {
      id: "score",
      title: "Cash chips and tournament chips are different objects",
      body: `In a cash game you win or lose money on the hand, and the right chart is the one that loses least to the posted rules. [How to play blackjack](/guides/how-to-play-blackjack) is that game: two cards, a dealer card, hit, stand, double, split, or surrender, then the dealer's rule. [Blackjack basic strategy](/guides/blackjack-basic-strategy) is the chart for a named set of those rules.

A tournament uses the same buttons and a different scoreboard. Your stack is compared with the other stacks at a deadline. Finishing one chip above a cut is a success. Finishing one chip below it is a failure, even if your decisions had the better cash expectation. That is the whole change.`,
    },
    {
      id: "when-chart-breaks",
      title: "When the cash chart is the wrong objective",
      body: `Suppose the cut is close and you are short. A double that basic strategy would refuse can be the only play that reaches the next round before the cards run out. The double can be a losing bet in a vacuum and still be the play that maximises your chance of advancing. The reverse happens too. A thin edge that risks your whole stack can be a mistake when a push would let you fold into the money and a loss would not.

This page will not print a substitute chart. The correct play depends on the stacks, the hands remaining, and the prize jumps, and those are properties of one event. Anyone selling a fixed "tournament basic strategy" without those inputs is selling a cash chart under a new name.

[Expected value](/guides/expected-value-gambling) still describes a single bet. Tournament equity describes your share of the prize pool given the ranking. They are not the same number.`,
    },
    {
      id: "sheet",
      title: "The only numbers that count are on the sheet",
      body: `Read the buy-in, what is prize pool and what is fee, the starting stack, how many hands or minutes a round lasts, how many players advance, and what happens to a tie on the bubble. A rebuy, if it exists, is a second buy-in with a deadline. Betting minimums and maximums change the size of a swing. A maximum that is your whole stack is a different game from a maximum of one unit.

If any of those lines is missing, you cannot price the event. Do not fill them from a different casino's poster. [House edge](/guides/house-edge) still applies to each hand under the dealing rules. The entry fee applies to the tournament. Add them only after both are known.`,
    },
    {
      id: "not-a-listing",
      title: "This is not a schedule",
      body: `PVPspinArena does not run blackjack tournaments and does not deal blackjack. Adults only. [Responsible gambling](/responsible-gambling) applies to a buy-in the same way it applies to a session, with the extra pressure of a clock.

More blackjack pages are under [blackjack](/guides/topics/blackjack). The [terms](/terms) describe this site's games. They are not a tournament rules sheet.`,
    },
  ],
  faqs: [
    {
      q: "Does basic strategy win a blackjack tournament?",
      a: "It plays each cash hand well. A tournament pays rank at a deadline. A play that basic strategy rejects can be right when you need chips to reach a cut, and a thin edge can be wrong when a loss eliminates you.",
    },
    {
      q: "Are tournament chips worth their face value?",
      a: "Not as cash during the round. They are a score. The prize list converts a finishing position into money, after the fee.",
    },
    {
      q: "What should I know before I pay the buy-in?",
      a: "The fee, the starting stack, the length of a round, the number who advance, the bet limits, and the prize jumps. Those lines are on the event sheet.",
    },
    {
      q: "Can I use one strategy for every event?",
      a: "No. Stacks, hands remaining, and payouts change the objective. A chart that ignores them is a cash chart.",
    },
    {
      q: "Does PVPspinArena host these?",
      a: "No.",
    },
  ],
  sources: [
    { label: "Wikipedia: Blackjack", url: "https://en.wikipedia.org/wiki/Blackjack" },
  ],
  related: ["how-to-play-blackjack", "blackjack-basic-strategy", "expected-value-gambling", "house-edge"],
  updated: "2026-10-21",
};
