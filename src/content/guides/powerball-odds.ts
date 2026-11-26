import type { Guide } from "./types";

export const guide: Guide = {
  slug: "powerball-odds",
  cluster: "Lottery",
  keyword: "powerball odds",
  secondary: [
    "powerball probability",
    "powerball prize tiers",
    "power play odds",
    "powerball chances",
  ],
  title: "Powerball Odds Explained: Every Prize Tier and Payout",
  description:
    "Powerball odds for every prize tier, from 1 in 292 million jackpot to the $4 prize, plus what Power Play changes and the expected value per ticket.",
  h1: "Powerball odds for every prize tier",
  answer:
    "Powerball odds start at 1 in 292,201,338 for the jackpot, which is C(69, 5) × 26. Every lower tier is a smaller slice of that same list of 292,201,338 outcomes. Match 5 white balls without the Powerball is 25 ways, or 1 in 11,688,053.52. The Powerball alone is 7,624,512 ways, or about 1 in 38.32. Power Play multiplies many fixed prizes and does not change how many ways you match. Adults only. This is not a system.",
  facts: [
    "All prize tiers together are 11,750,538 ways, about 1 in 24.87.",
    "The $1,000,000 match-5 prize has 25 ways. Power Play lifts that prize to $2,000,000 and does not multiply the jackpot.",
    "Fixed prizes used below are the amounts long published for this matrix. Confirm the live chart on powerball.com.",
    "A bigger jackpot changes the top prize’s value. It does not change the way counts.",
  ],
  sections: [
    {
      id: "jackpot-count",
      title: "The jackpot count that every other tier divides",
      body: "Powerball odds are one list. Five white balls are drawn from 1 through 69. One red Powerball is drawn from 1 through 26. Order on the white balls does not matter.\n\nC(69, 5) = (69 × 68 × 67 × 66 × 65) / 120 = 11,238,513.\n\nMultiply by the 26 red balls:\n\n11,238,513 × 26 = 292,201,338.\n\nThat product is the denominator for every tier. A tier’s odds are 292,201,338 divided by how many ways that tier can happen. The base play is $2. Drawing nights and how to mark a slip are on the [how to play Powerball](/guides/how-to-play-powerball) page, not in this table.\n\n### What a single line covers\n\nOne line covers 1 outcome. It wins the jackpot only if both the white set and the red ball match. It can win a lower tier on the same draw if the match is partial. It cannot win two tiers at once: the lottery assigns the highest match. These [Lottery guides](/guides/topics/lottery) treat that assignment as the official tier, not as a second ticket.",
    },
    {
      id: "tier-table",
      title: "Every prize tier: ways, odds, and fixed prizes",
      body: "Way counts below are computed from the matrix. Dollar amounts are the fixed prizes Powerball has published with this matrix: $1,000,000, $50,000, $100, $7, and $4. Jackpot prizes are pari-mutuel and advertised as an annuity with a cash option. Confirm the chart on the official site if the game changes. Rounded odds are 292,201,338 divided by the way count.\n\n| Match | Ways | Odds | Fixed prize |\n| --- | --- | --- | --- |\n| 5 white + Powerball | 1 | 1 in 292,201,338 | Jackpot |\n| 5 white | 25 | 1 in 11,688,053.52 | $1,000,000 |\n| 4 white + Powerball | 320 | 1 in 913,129.18 | $50,000 |\n| 4 white | 8,000 | 1 in 36,525.17 | $100 |\n| 3 white + Powerball | 20,160 | 1 in 14,494.11 | $100 |\n| 3 white | 504,000 | 1 in 579.76 | $7 |\n| 2 white + Powerball | 416,640 | 1 in 701.33 | $7 |\n| 1 white + Powerball | 3,176,880 | 1 in 91.98 | $4 |\n| Powerball only | 7,624,512 | 1 in 38.32 | $4 |\n\nAdd the nine way counts: 1 + 25 + 320 + 8,000 + 20,160 + 504,000 + 416,640 + 3,176,880 + 7,624,512 = 11,750,538. Overall odds of some prize are 292,201,338 / 11,750,538 ≈ 1 in 24.87.\n\nThe match-5 row is 25 because the white balls are right and the red ball is one of the 25 wrong Powerballs. The Powerball-only row is C(64, 5) = 7,624,512, the ways to pick 5 white balls from the 64 that were not drawn, with the red ball right.",
    },
    {
      id: "worked-match-four",
      title: "Worked example: 4 white balls plus the Powerball",
      body: "Match 4 white balls and the Powerball. The drawn white set has 5 balls. You matched 4 of them, so you missed 1.\n\nWays to choose which 4 of the 5 drawn whites you matched: C(5, 4) = 5.\n\nThe fifth white number on your line must come from the 64 whites that were not drawn: C(64, 1) = 64.\n\nWhite-ball sets: 5 × 64 = 320.\n\nThe red ball must be the one drawn Powerball, so it contributes a factor of 1, not 25. Tier ways = 320.\n\nPowerball odds for this tier: 292,201,338 / 320 = 913,129.18125, or about 1 in 913,129.18.\n\n### The same whites with the wrong red ball\n\nIf the red ball is wrong, multiply by 25: 320 × 25 = 8,000 ways. Odds: 292,201,338 / 8,000 = 36,525.16725, about 1 in 36,525.17. That is the $100 tier in the published chart, not the $50,000 tier. The red ball is the entire gap between those two rows. Guessing it does not get easier because you already matched 4 white balls. It is still 1 red ball out of 26, and the tier table has already counted both cases.",
    },
    {
      id: "worked-ev",
      title: "Worked example: expected value of the fixed prizes",
      body: "Expected value is prize times probability, summed. Using the published fixed prizes and the way counts above, two rows show the method, then the total of all fixed tiers.\n\nPowerball-only: prize $4, ways 7,624,512.\n\n4 × 7,624,512 / 292,201,338 ≈ $0.104.\n\nMatch 5 white, no Powerball: prize $1,000,000, ways 25.\n\n1,000,000 × 25 / 292,201,338 ≈ $0.086.\n\nDo that for every fixed row. The eight fixed prizes sum to about $0.32 of expected value on a $2 ticket. The jackpot is extra and depends on the cash option that draw.\n\n### A jackpot line at one cash level\n\nAt a $200,000,000 cash option, jackpot value is 200,000,000 / 292,201,338 ≈ $0.68. Fixed prizes plus that jackpot line are about $1.00 of value on a $2 ticket, before income tax and before a shared jackpot. You are still short of the price. Taxes and splits make the gap larger. This is not a threshold where buying becomes a plan. Withholding is not the whole bill; the leftover is on the [lottery taxes](/guides/lottery-taxes) page, and the definition of the sum is [expected value](/guides/expected-value-gambling). A shared jackpot splits that $0.68 before tax, so two winners turn the jackpot line into about $0.34 on the same $2 ticket.\n\nA larger cash option raises only the jackpot term. It does not raise the $0.32 from the fixed tiers. Two lines double both the $0.32 and the jackpot term, and they double the $4 you spend. The expected loss per dollar is the same shape on one line and on twenty. That is the sense in which Powerball odds refuse a volume strategy. You can buy more combinations. You cannot buy a better price per combination unless the cash option itself changed, and even then every line you add is priced at the new level, not at a discount. Three winners would cut the $0.68 jackpot term to about $0.23, while the fixed prizes stay per ticket. Power Play's extra dollar is a separate ticket and is not inside this $2 sum. The gap can shrink when the cash option is enormous, and it does not flip into a plan you should fund.",
    },
    {
      id: "power-play",
      title: "What Power Play changes and what it leaves alone",
      body: "Power Play is an optional extra dollar on top of the $2 play in participating sales. A separate draw picks a multiplier. Under the rules Powerball publishes, the jackpot is not multiplied. The match-5 prize of $1,000,000 becomes $2,000,000 with Power Play, rather than taking whatever multiplier was drawn. Other fixed prizes are multiplied by the Power Play number drawn. A 10× outcome is offered when the advertised jackpot is at or under the limit in the current rules, often described as $150 million. Confirm that limit and the multiplier wheel on powerball.com, because the add-on is a rule sheet, not a law of arithmetic.\n\n| Multiplier drawn | A $100 tier becomes | A $7 tier becomes |\n| --- | --- | --- |\n| 2× | $200 | $14 |\n| 3× | $300 | $21 |\n| 4× | $400 | $28 |\n| 5× | $500 | $35 |\n| 10× | $1,000 | $70 |\n\nA $50,000 tier at 5× pays 5 × 50,000 = $250,000 if that multiplier is the one drawn and the rules multiply that row. The ways stay 320. You did not become more likely to be in those 320. You paid $3 for a larger prize if you are.\n\nThe way counts do not move. Power Play odds of matching are the same Powerball odds as the base game. You paid $3 instead of $2 so that a hit on a multiplied tier pays more. Whether that extra dollar is worth it depends on the multiplier distribution and the prizes, not on a feeling that the red ball is due.\n\nDouble Play, where it is sold, is a separate drawing with its own prize card and another dollar. It is not a second copy of this table. Read that card on the official site before you add it.",
    },
    {
      id: "read-the-chart",
      title: "Checklist for reading a Powerball odds chart",
      body: "Use this before you treat a screenshot as the game.\n\n- Confirm the matrix is still 5 from 69 and 1 from 26. If either pool changes, every row in this guide changes.\n- Divide 292,201,338 by the way count yourself on one row. If you cannot land near the printed odds, you have the wrong chart.\n- Separate the jackpot annuity from the cash option. Odds refer to matching, not to the advertised sum of payments.\n- Remember overall odds near 1 in 24.9 count the $4 prizes.\n- Treat Power Play as a price increase and a prize multiplier, not as extra combinations.\n- Ignore past-draw frequency lists. They do not edit C(69, 5).\n- If you only wanted the purchase steps, switch to the how-to-play page instead of re-reading tiers.\n\nThe same warning applies to number picking. A quick pick and a chosen line have identical Powerball odds. Sharing a popular line is the leftover issue, explained on the [quick pick](/guides/quick-pick-lottery) page.",
    },
    {
      id: "pvp-not-tiers",
      title: "A PvP pot has no Powerball tier table",
      body: "### Why the tier table does not transfer\n\nThere is no $4 Powerball-only prize, no Power Play wheel, and no 1-in-292,201,338 jackpot line. If your cents are 15 percent of the pot, your chance at that pot is 15 percent, minus nothing except a posted fee if the table shows one. That chance is large compared with any row above and it applies only to that pot. Losing it is still losing it.\n\nAdults 18 and older. Lottery math is not a plan to get ahead. If spending on draws is no longer optional, use [responsible gambling](/responsible-gambling).\n\nThe prize chart is the dollars by match count. [That chart](/guides/powerball-payout-chart) leaves the standing lump-sum jackpot dollar unpublished. The 19 October 2026 drawing report was opened separately.",
    },
  ],
  faqs: [
    {
      q: "What are the overall Powerball odds of winning any prize?",
      a: "Add the way counts of all nine winning tiers. They total 11,750,538 combinations. Divide 292,201,338 by that total and you get about 1 in 24.87. Most of those wins are the $4 and $7 tiers. The overall figure is not the jackpot figure and should not be quoted as if it were.",
    },
    {
      q: "Does Power Play improve Powerball odds?",
      a: "No. Power Play multiplies certain fixed prizes after you match. The jackpot is not multiplied. The match-5 prize becomes $2,000,000 with Power Play under the published rules. Your number of ways to match stays the same, and the play costs an extra dollar. Confirm the current multiplier rules on the official site.",
    },
    {
      q: "How many ways are there to win $50,000?",
      a: "The published $50,000 tier is 4 white balls plus the Powerball: C(5, 4) × C(64, 1) = 320 ways. Odds are 292,201,338 / 320, or about 1 in 913,129.18. The same four white balls with the wrong Powerball are the $100 tier, with 8,000 ways. Confirm the dollar amount on the live chart.",
    },
    {
      q: "Is Powerball ever a positive-value ticket?",
      a: "Only on paper, and usually not after tax and splits. Fixed prizes contribute about $0.32 on the published chart. The jackpot term is the cash option divided by 292,201,338. That sum has to clear $2, then still survive taxes and other winners. Matching the balls is not something a system can force.",
    },
  ],
  sources: [
    {
      label: "Powerball",
      url: "https://www.powerball.com/",
    },
    {
      label: "Multi-State Lottery Association",
      url: "https://www.musl.com/",
    },
    {
      label: "Mega Millions",
      url: "https://www.megamillions.com/",
    },
  ],
  related: [
    "how-to-play-powerball",
    "odds-of-winning-the-lottery",
    "lottery-taxes",
    "lump-sum-vs-annuity",
    "expected-value-gambling",
  ],
  updated: "2026-11-26",
};
