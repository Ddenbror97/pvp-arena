import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-play-mega-millions",
  cluster: "Lottery",
  keyword: "how to play mega millions",
  secondary: [
    "mega millions rules",
    "mega millions drawing",
    "megaplier",
    "mega ball",
  ],
  title: "How to Play Mega Millions: Rules, Odds and Prize Tiers",
  description:
    "How to play Mega Millions in plain English: picking numbers, the Megaplier, drawing days, every prize tier and the true odds of winning the jackpot.",
  h1: "How to play Mega Millions under the current matrix",
  answer:
    "How to play Mega Millions is one line in a two-pool draw: 5 numbers from 1 to 70, plus 1 Mega Ball from 1 to 24. That line’s jackpot chance is 1 in 290,472,336, because C(70, 5) × 24 = 290,472,336. Drawings are Tuesday and Friday. The redesign that set this matrix also reset the ticket price and the multiplier; confirm both on the ticket and on megamillions.com before you pay. Adults only. Extra lines multiply cost and chance together. They are not a system.",
  facts: [
    "Current jackpot odds are 1 in 290,472,336 per line: 5 from 70, plus 1 from 24.",
    "C(70, 5) = 12,103,014 white-ball combinations.",
    "Drawings are Tuesday and Friday. The selling state sets the sales cutoff.",
    "The jackpot is an annuity with a cash option. Lower tiers are fixed prizes on the official chart.",
    "A multiplier changes many fixed prizes. It does not change the combination count.",
  ],
  sections: [
    {
      id: "the-line",
      title: "The line you are buying",
      body: `How to play Mega Millions is easier to remember if you separate the slip from the jackpot sign. The slip is 5 different white-ball numbers from 1 through 70 and 1 Mega Ball from 1 through 24. White order does not matter. The Mega Ball is drawn from its own pool. You win the jackpot only when both parts match. Partial matches pay whatever the current prize chart says, not whatever a headline implies.

### Price and multiplier after the redesign

The matrix in this guide is the current one: 5 from 70 and 1 from 24. When that matrix replaced the older 1-from-25 Mega Ball, the game also republished its price and its multiplier. The price announced with the redesign was $5 a play, with a multiplier built into the play rather than sold only as a separate Megaplier dollar. Treat that as a rule you must confirm. The number on megamillions.com and the number on your ticket control. If an add-on still exists in your state, the terminal will show it as its own charge.

These [Lottery guides](/guides/topics/lottery) are for adults. The minimum age is the age set by the state that sells the ticket, 18 in most of them. Buy from that lottery, not from a site that merely uses the name.`,
    },
    {
      id: "mark-and-draw",
      title: "Marking a slip, drawing nights, and cutoff",
      body: `You can fill the numbers or take a quick pick. A quick pick is still one combination in the list of 290,472,336. It is not a hotter line. Popular handwritten numbers matter only if you win and have to share, which is the subject of the [quick pick](/guides/quick-pick-lottery) page.

1. Pick the next drawing, or a future drawing if the state sells one.
2. Choose 5 numbers from 1 to 70, or mark quick pick.
3. Choose 1 Mega Ball from 1 to 24, unless quick pick filled it.
4. Accept a multiplier or add-on only after you see the extra price.
5. Pay, then read the printed ticket against the slip before you leave.

| Drawing | Day | What to verify |
| --- | --- | --- |
| First draw of the week | Tuesday | Ticket date, cutoff, and Mega Ball pool 1–24 |
| Second draw | Friday | Same checks; a Tuesday miss does not carry forward |

Drawings are Tuesday and Friday nights. Publish times are set by the game, and sales cutoffs are set by the selling state, often well before the balls drop. A ticket bought after cutoff is for the following draw. If nobody wins the jackpot, the prize rolls and your old line does not. Powerball’s calendar is a different product, with different nights and a different matrix, on the [how to play Powerball](/guides/how-to-play-powerball) page.`,
    },
    {
      id: "jackpot-math",
      title: "Worked example: why the jackpot is 1 in 290,472,336",
      body: `The jackpot count is short enough to redo on paper.

White balls, 5 from 70:

C(70, 5) = (70 × 69 × 68 × 67 × 66) / 120.

70 × 69 = 4,830; × 68 = 328,440; × 67 = 22,005,480; × 66 = 1,452,361,680; ÷ 120 = 12,103,014.

Mega Ball, 1 from 24:

12,103,014 × 24 = 290,472,336.

One line covers 1 of those outcomes. Three different lines cover 3. If the price in your hand is $5, three lines cost 3 × $5 = $15, and the jackpot chance is 3 / 290,472,336. The $15 did not buy a new kind of probability. It bought three ordinary tickets.

### What rolling the jackpot does not do

Buy 8 lines at a $5 price and the spend is 8 × $5 = $40. Coverage is 8 combinations. Chance of the jackpot is 8 / 290,472,336. The other 290,472,328 outcomes are still losses on the jackpot row. Write that fraction down if a clerk calls 8 lines a “good shot.”

A jackpot that has rolled for two months is a larger prize on the same list. N stays 290,472,336. People call that “better odds” because the sign changed. The sign is the prize. The odds are the list. Both numbers belong in the decision, and only one of them moved. The overview of that distinction is the [odds of winning the lottery](/guides/odds-of-winning-the-lottery) page.`,
    },
    {
      id: "tiers",
      title: "Prize tiers as way counts, with dollars left on the official chart",
      body: `Each lower tier is a subset of the same 290,472,336 outcomes. The way counts below are the combinations, so you can audit them. Dollar prizes were reset with the matrix change. Copy the live dollar column from megamillions.com instead of memorizing an old Megaplier card. If the official chart drops a row, that row is not a prize, whatever a third-party page claims.

| Match | Ways | Odds (290,472,336 / ways) |
| --- | --- | --- |
| 5 + Mega Ball | 1 | 1 in 290,472,336 |
| 5, Mega Ball wrong | 23 | 1 in 12,629,232 |
| 4 + Mega Ball | 325 | 1 in 893,761.03 |
| 4, Mega Ball wrong | 7,475 | 1 in 38,859.18 |
| 3 + Mega Ball | 20,800 | 1 in 13,965.02 |
| 3, Mega Ball wrong | 478,400 | 1 in 607.17 |
| 2 + Mega Ball | 436,800 | 1 in 665.00 |
| 1 + Mega Ball | 3,385,200 | 1 in 85.81 |
| Mega Ball only | 8,259,888 | 1 in 35.17 |

The match-5 miss on the Mega Ball is 23 because 24 balls are in the pool and 1 of them is correct, so 23 are wrong. Rows with no white-ball match and no Mega Ball are not in the table. They are losses.

### Worked tier: 4 white balls plus the Mega Ball

C(5, 4) × C(65, 1) = 5 × 65 = 325 ways, and the Mega Ball is correct, so you do not multiply by 23. Odds: 290,472,336 / 325 = 893,761.03. The same 4 white balls with a wrong Mega Ball are 325 × 23 = 7,475 ways. The gold ball is the whole difference between those rows. A multiplier, if your ticket has one, scales the fixed prize after the match. It does not turn 325 ways into 326.

Add the way counts in the table: 1 + 23 + 325 + 7,475 + 20,800 + 478,400 + 436,800 + 3,385,200 + 8,259,888 = 12,588,912. If the official chart pays every one of those rows, the chance of some prize is 290,472,336 / 12,588,912 ≈ 1 in 23.07. If the chart skips a small row, drop that row’s ways and divide again. The jackpot row is still the single combination at the top. A 1-in-23 figure is the “any prize” figure, and most of those prizes are the small end of the chart.`,
    },
    {
      id: "claim",
      title: "Checking results and claiming without spending the gross",
      body: `After the draw, compare the ticket with the official numbers. White order does not matter. The Mega Ball does. A retailer may scan small prizes up to a limit that state sets. Larger prizes are claimed with the selling lottery, inside a deadline that state sets. There is no single national number of days. The date on the ticket and the lottery’s claim page control.

Sign and store the ticket once you know the state’s rule on whose name is published. If keeping your name off a press release matters, read the anonymity guide before you sign in a way you cannot undo. The cash-versus-annuity choice after a confirmed hit is on the [lump sum vs annuity](/guides/lump-sum-vs-annuity) page.

The jackpot, if you hit it, is a choice between an annuity and a cash option. That choice is not a Mega Millions-only trick, and it is not settled on the play slip. Use the [lump sum versus annuity](/guides/lump-sum-vs-annuity) page, then the tax page, before you pick. A multiplier on a small tier is simpler: the chart states the multiplied amount, and withholding rules may still apply once the prize is large enough. This is not tax advice.

An office group that split the $15 should have agreed the split before the drawing. A text message after a win is how pools break.`,
    },
    {
      id: "checklist",
      title: "Checklist for a Mega Millions purchase",
      body: `Use this at the terminal. Mega Millions is not Powerball with a different logo, so do not reuse a Powerball habit for the pools or the nights.

- The ticket says Mega Millions and shows Tuesday or Friday, the drawing you meant.
- Five numbers are between 1 and 70.
- The Mega Ball is between 1 and 24, not 1 and 26.
- The price matches the current play, including any multiplier you accepted.
- You checked the printout against the slip.
- You can lose the whole price. Three lines at a $5 price are $15 and only 3 combinations.
- You are not buying this because the jackpot rolled. The list is still 290,472,336.
- The ticket goes somewhere you can find after Friday or Tuesday night.

If the Mega Ball pool on the ticket is 1 to 25, you are looking at an old rule sheet or the wrong game. Stop and read the current official page.`,
    },
    {
      id: "pvp-different-game",
      title: "A PvP pot does not follow Mega Millions rules",
      body: `PVPspinArena does not enter you in the Tuesday or Friday draw. How to play Mega Millions ends at the state lottery. A PvP Jackpot is a pot the players fund. Your tickets are the cents you add, not a row on a 70-number grid.

### One comparison, then stop

A single Mega Millions line is 1 of 290,472,336 outcomes. A $10 stake in a $50 pot is 10/50 of that pot. The first number is a national combination count. The second number changes if someone else joins. Neither purchase repairs the other. You can enjoy one, the other, both, or neither. You cannot add them into a system.

Finished PvP rounds are checked on [Fairness](/fairness). The pot is [Jackpot](/). The on-site coin flip is a separate two-outcome game. None of those pages cashes a Mega Millions ticket, and this page does not describe a hashed pot.

Adults 18 and older. If two drawings a week have become a bill you hide, the right next page is [responsible gambling](/responsible-gambling), not another matrix.`,
    },
  ],
  faqs: [
    {
      q: "What are the Mega Millions jackpot odds?",
      a: "One line is 1 in 290,472,336 under the current rules. C(70, 5) equals 12,103,014 white-ball sets, and the Mega Ball pool has 24 numbers, so 12,103,014 × 24 = 290,472,336. The older 25-ball Mega Ball pool is not this count. Confirm the pool on megamillions.com before you use any odds figure.",
    },
    {
      q: "When is the Mega Millions drawing?",
      a: "Mega Millions draws on Tuesday and Friday. The selling state stops ticket sales before the draw, so a late purchase rolls to the next night. Your combination does not stay alive just because the jackpot rolled. Read the drawing date printed on the ticket, not the date you meant to play.",
    },
    {
      q: "How is Mega Millions different from Powerball?",
      a: "Mega Millions uses 5 from 70 and 1 from 24, with jackpot odds of 1 in 290,472,336, and it draws on Tuesday and Friday. Powerball uses 5 from 69 and 1 from 26, with odds of 1 in 292,201,338, and it draws on Monday, Wednesday, and Saturday. Prices, multipliers, and prize charts are separate too.",
    },
    {
      q: "Does the multiplier improve my odds?",
      a: "No. A multiplier changes the fixed prize you are paid after you match a tier. The jackpot combination count stays 290,472,336. Confirm whether the current game includes the multiplier in the base price or sells it as an add-on. Either way, the balls do not get more likely.",
    },
    {
      q: "Where do I see the dollar prize for each tier?",
      a: "On megamillions.com and on the selling lottery’s prize chart. This guide counts the ways for each match so you can audit the odds. It does not freeze dollar prizes, because the redesign replaced the old amounts. Match the chart’s rows to the way counts here, then use the dollars on the official page.",
    },
  ],
  sources: [
    { label: "Mega Millions", url: "https://www.megamillions.com/" },
    { label: "Powerball", url: "https://www.powerball.com/" },
    { label: "Multi-State Lottery Association", url: "https://www.musl.com/" },
  ],
  related: [
    "how-to-play-powerball",
    "odds-of-winning-the-lottery",
    "powerball-odds",
    "lump-sum-vs-annuity",
    "quick-pick-lottery",
  ],
  updated: "2026-10-06",
  howTo: true,
};
