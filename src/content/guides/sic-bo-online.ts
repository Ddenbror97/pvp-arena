import type { Guide } from "./types";

export const guide: Guide = {
  slug: "sic-bo-online",
  cluster: "Casino games",
  keyword: "sic bo online",
  secondary: ["sic bo online"],
  title: "Sic Bo Online: Rules, Bets and the Lower-Edge Wagers",
  description:
    "Sic bo online is three dice and one roll. Big and Small lose on triples. On published 1 to 1 tables their edge is 2.78%. Other boxes cost more.",
  h1: "Sic bo online: three dice, 216 outcomes, and a paytable that is local",
  answer:
    "Sic bo online is a bet on one roll of three dice. There are 216 equally likely outcomes. Big is a total of 11 through 17, Small is 4 through 10, and both lose if the roll is a triple. On the UK, New Zealand, Austria, and Macau columns of a standard published table, Big and Small pay 1 to 1 with a house edge of 2.78%. A specific triple is a different bet, and its odds are not the same in every jurisdiction.",
  facts: [
    "Three dice produce 216 outcomes. Only 56 of those look different if you ignore which die is which, but the probabilities use all 216.",
    "Big and Small exclude triples. A triple is not a quiet push. It loses those bets.",
    "The 2.78% figure for Big and Small is the house edge on the 1 to 1 price in that published comparison. It is not a promise about every online skin.",
    "Specific triples, totals, and single-die bets pay more because they hit less often. Their house edge on the same table is often much higher.",
    "An online rules screen can differ from a Macau layout. Price the screen you are playing.",
  ],
  sections: [
    {
      id: "roll",
      title: "One roll, then the bet is over",
      body: `You place chips on named boxes. The dice are shaken. Every bet on that roll wins or loses immediately. Nothing carries to the next shake. That is the difference from craps, where some bets need a sequence of rolls. [History of dice](/guides/history-of-dice) is background, not a paytable.

The totals run from 3 to 18. Small and Big skip the triples inside their ranges, so three 2s is not a Small winner even though 6 is between 4 and 10. The same is true of three 5s and Big. Odd and Even, where offered, also lose on triples in the published rules.`,
    },
    {
      id: "edges",
      title: "The low-edge boxes and the expensive ones",
      body: `Wikipedia's comparison table gives Big and Small a 48.61% chance and a 1 to 1 payoff in the United Kingdom, New Zealand, Austria, and Macau, which it lists as a 2.78% house edge. Two-die combinations of two different numbers are also listed at 6 to 1 and 2.78% in those same columns, except that Macau prints both a 5 to 1 price and a 6 to 1 price.

The rest of the layout is where the edge jumps. On that UK column a specific triple pays 180 to 1 with a 16.2% house edge, and any triple pays 30 to 1 with a 13.89% house edge. Macau's specific triple is listed at 150 to 1, which is a worse price. Austria's is listed at 190 to 1. Those three numbers are enough to show why "the" sic bo odds do not exist.

| Bet, as published | UK price | UK house edge on that table |
| --- | --- | --- |
| Big or Small, triples lose | 1 to 1 | 2.78% |
| Specific triple | 180 to 1 | 16.2% |
| Any triple | 30 to 1 | 13.89% |

Use the table as a map of the published comparison, then throw it out if your rules screen disagrees. [House edge](/guides/house-edge) is how to read a payoff against a probability. [Expected value](/guides/expected-value-gambling) is the same idea in currency.`,
    },
    {
      id: "choosing-bets",
      title: "Compare bets before choosing a system",
      body: "For a bet-by-bet comparison, read [Sic Bo strategy and house edges](/guides/sic-bo-strategy). Compare the payoff printed on your screen with the probability of that outcome. A staking progression cannot remove the house edge, and a lower-edge bet can still lose. The rules and price of each box matter more than a system's name.",
    },
    {
      id: "online",
      title: "What changes when the dice are on a screen",
      body: `The mathematics of three fair dice do not change because the shake is animated. The contract can. An online game can delete Small, change a triple payoff, or add a side bet that was never on a Macau felt. The rules page of that game is the paytable. A pretty dice cup is not.

If the game does not show the payoff for a box, do not bet that box. This page will not fill the blank. A "lower edge" claim is only true for the bets whose price you have checked. Big and Small earn that description on the published 1 to 1 tables above. They do not earn it by the name alone.`,
    },
    {
      id: "stop",
      title: "A fast game is still a priced game",
      body: `Sic bo settles every few seconds. That is a lot of edges in an hour if you keep every box lit. The lower-edge bets are still negative. They are only lower than the triple boxes beside them.

Adults only. [Responsible gambling](/responsible-gambling) is the limit that matters when the shake button is the whole interface. PVPspinArena does not offer sic bo. Its dice, where it has them, are other games, described in the [terms](/terms). More tables live under [casino games](/guides/topics/casino-games). [Casino war](/guides/casino-war-game) is a card game with a different tie rule. Do not mix the two paytables.`,
    },
  ],
  faqs: [
    {
      q: "Does a triple win Big or Small?",
      a: "No, on the standard layout. Triples lose Big, Small, Odd, and Even even when the total sits inside the range.",
    },
    {
      q: "Why do people call Big and Small the better bets?",
      a: "On the published 1 to 1 tables compared here, their house edge is 2.78%, far below a specific triple on the same table. Your screen has to match that price.",
    },
    {
      q: "Are there 56 possible rolls or 216?",
      a: "There are 216 equally likely outcomes. Fifty-six is the count of distinguishable patterns if you ignore which die showed which number. Probabilities use 216.",
    },
    {
      q: "Is the online edge the Macau edge?",
      a: "Only if the paytable matches. Jurisdictions already disagree on triple odds. An online game can disagree again.",
    },
    {
      q: "Does PVPspinArena run sic bo?",
      a: "No.",
    },
  ],
  sources: [{ label: "Wikipedia: Sic bo", url: "https://en.wikipedia.org/wiki/Sic_bo" }],
  related: ["house-edge", "expected-value-gambling", "casino-war-game", "history-of-dice"],
  updated: "2026-10-21",
};
