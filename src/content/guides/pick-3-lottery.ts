import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pick-3-lottery",
  cluster: "Lottery",
  keyword: "pick 3 lottery",
  secondary: ["pick 3 lottery odds", "pick 3 lottery payout", "how pick 3 lottery works"],
  title: "Pick 3 Lottery Odds, Straight, Box, and Payouts",
  description:
    "Pick 3 lottery on the Pennsylvania chart: a $1 straight pays $500 at 1 in 1,000. A 6-way box pays $80. Other states print different tables.",
  h1: "Pick 3 lottery straight, box, and straight/box on one state chart",
  answer:
    "Pick 3 lottery in Pennsylvania is a three-digit draw at 50 cents or $1. A $1 straight pays $500 in exact order, at 1 in 1,000. A $1 box on three distinct digits pays $80 in any order, at 1 in 166.67. Straight/box is only 50 cents. Other states print different pay tables. This is not a system.",
  facts: [
    "Last tested 20 October 2026 against the Pennsylvania Lottery PICK 3 prizes page and the Pennsylvania Lottery game guide PDF.",
    "A straight matches three digits in exact order. Any three digits: $250 on a 50-cent play, $500 on a $1 play, chance 1 in 1,000.",
    "A box on three distinct digits pays $40 at 50 cents or $80 at $1, chance 1 in 166.67. A box with one pair pays $80 or $160, chance 1 in 333.33.",
    "Straight/box is only available at 50 cents per play. The $1 column on that row is a dash.",
    "Day sales end at 1:05 pm. Evening sales end at 6:57 pm. The game guide says both times are daily.",
    "Other states print different pay tables. Do not carry these dollars across a state line.",
  ],
  sections: [
    {
      id: "one-state",
      title: "One worked state, two drawings, and a chart that is not national",
      body: `How pick 3 lottery works in Pennsylvania is a choice of three digits, a play type, and a drawing. You can play the day drawing, the evening drawing, or both. Advance play runs up to seven consecutive drawings.

The base price is 50 cents or $1 per play. Wild Ball, if you add it, doubles the cost of each play.

Wild Ball prizes are a separate table. They are not the base prizes with a new name.

The game guide says day sales end at 1:05 pm and evening sales end at 6:57 pm. Animated day results are posted after 1:35 pm.

The evening drawing is at 6:59 pm. Those clocks are Pennsylvania's.

A terminal can pick the digits for you. You still choose the play type. The prizes page does not say a random ticket silently changes straight into box.

Number-picking habits live on a [separate page about choosing digits](/guides/pick-3-strategy). This page is the pay table. The cluster home is the [lottery topic hub](/guides/topics/lottery).`,
    },
    {
      id: "odds",
      title: "Pick 3 lottery odds for straight, box, and the combined row",
      body: `Pick 3 lottery odds below are the chances Pennsylvania prints, not a blend of fifty state charts. Straight is one order out of 1,000 three-digit results, from 0-0-0 through 9-9-9.

A box pays if the digits appear in any order. Three distinct digits have six orders, and the chart's chance is 1 in 166.67.

One pair plus a different digit has three orders, and the chance is 1 in 333.33. The prize is smaller when more orders are covered, because the stake is still one play.

Straight/box is described as a straight play combined with a box play. It is sold only at 50 cents.

The chart prints a straight prize and a box prize on that row. It does not print a single summed dollar for an exact-order hit.

Read those two figures as the two lines Pennsylvania printed.

| Play | What matches | 50-cent prize | $1 prize | Chances |
|---|---|---|---|---|
| Straight | 3 digits in exact order | $250 | $500 | 1 in 1,000 |
| Box, one pair | 3 digits in any order | $80 | $160 | 1 in 333.33 |
| Box, 3 distinct digits | 3 digits in any order | $40 | $80 | 1 in 166.67 |
| Front pair | First 2 digits in exact order | $25 | $50 | 1 in 100 |
| Back pair | Last 2 digits in exact order | $25 | $50 | 1 in 100 |
| Straight/box, 3 distinct | Straight line and box line | $250 and $40 | not offered | 1 in 1,000 and 1 in 166.67 |
| Straight/box, one pair | Straight line and box line | $250 and $80 | not offered | 1 in 1,000 and 1 in 333.33 |

Front pair and back pair are on the same Pennsylvania page. They are not the three play types this article is here to explain, and they are easy to buy by accident if you only meant a straight.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
|---|---|---|---|---|---|
| Pennsylvania PICK 3 | fixed prizes on the state chart; hold percent not published on that page | the drawing | retailer or lottery claim; minutes not published | no | 50 cents |
| House-banked casino | not published | the house | not published | no | not published |
| PVPspinArena Coinflip | 5% of the pot | another player | when the round settles | yes | $1 |`,
    },
    {
      id: "worked",
      title: "Worked tickets using the digits Pennsylvania prints",
      body: `The prizes page uses 1-2-3 and 1-1-2 as the examples. Those rows are the contract for this section.

A straight 1-2-3 wins the straight prize only when the drawing is 1-2-3. The page shows $250 at 50 cents and $500 at $1. A drawing of 1-2-4, or of 1-3-2, does not pay that straight row.

A box 1-2-3 wins when those three distinct digits appear in any order. The page shows $40 at 50 cents and $80 at $1. A box 1-1-2 wins on any order of that pair, at $80 or $160.

A straight/box 1-2-3 is a 50-cent play. The example row lists a drawing result of 1-2-3 and of 1-2-3 in any order, with prizes $250 (straight) and $40 (box).

A straight/box 1-1-2 lists $250 (straight) and $80 (box). The $1 column is a dash.

This article does not add $250 and $40 into a new prize the chart never totaled.

The four-digit game on the [Pennsylvania four-digit chart](/guides/pick-4-lottery) uses another matrix and another set of dollars. Do not paste this table onto that game.`,
    },
    {
      id: "examples",
      title: "Three labeled prices, including a peer pot",
      body: `Example 1. You buy a $1 straight on 4-7-2.

If the drawing is 4-7-2 in that order, the Pennsylvania chart pays $500. The chance is 1 in 1,000.

If the drawing is 4-2-7, this straight ticket does not pay.

The pick 3 lottery payout on that straight row is $500 for $1, or $250 for 50 cents. Order is the whole bet.

Example 2. You buy a $1 box on 4-7-2.

The digits are all different, so the chart's prize is $80 if they appear in any order, at 1 in 166.67. You paid $1, not $6.

The smaller prize is how one box stake covers six orders.

A $1 box on 4-4-7 is the pair shape. The chart pays $160, at 1 in 333.33. Using the distinct-digit prize on a pair is how people misread the table.

Example 3. Two people play Coinflip at $50 a side.

The pot is $100. Five percent is $5.

The winner receives $95.

That fee is published before the round. A 50-cent straight/box is a lottery purchase with the two prize lines above. The $95 is not a PICK 3 prize, and the coin has no digit order.`,
    },
    {
      id: "other-states",
      title: "Why the next state's glass will not match this table",
      body: `Pennsylvania prints $500 for a $1 straight. Another lottery can print a different prize and a different name.

A straight stays near 1 in 1,000 when each digit runs from 0 to 9. The dollars are that lottery's choice.

A pick 3 lottery ticket from outside Pennsylvania follows the chart on that ticket. This page does not quote a second state's prizes.

Wild Ball doubles the price. On a $1 straight the wild-ball column shows $200 at 1 in 333, beside a $500 base prize.

A 6-way box shows $36 at 1 in 56. A 3-way box shows $72 at 1 in 111.

A 50-cent play cuts those prizes in half. The page does not say to add the columns.

Front pair and back pair pay $50 at $1, at 1 in 100. They match two digits and ignore the third.

The life-annuity game is the [rules-table annuity draw](/guides/lucky-for-life-lottery). It is not a three-digit box.`,
    },
    {
      id: "checklist",
      title: "What to check on the slip before you pay",
      body: `The play type is the prize. The digits alone are not.

- [ ] Name the state on the ticket. Use these dollars only for Pennsylvania.
- [ ] Say straight, box, or straight/box out loud before the clerk or the app confirms.
- [ ] For a $1 straight, expect $500 only on an exact-order hit, at 1 in 1,000.
- [ ] For a $1 box of three distinct digits, expect $80 in any order, at 1 in 166.67.
- [ ] For a $1 box with a pair, expect $160, at 1 in 333.33.
- [ ] Buy straight/box only at 50 cents. The $1 column is not offered.
- [ ] Do not add the straight line and the box line into a prize the chart did not total.
- [ ] If you add Wild Ball, expect the price to double and read the wild-ball column.
- [ ] Stop day sales in your plan at 1:05 pm and evening sales at 6:57 pm, Pennsylvania time.
- [ ] Keep the ticket. A photo of a slip is not what the game guide calls the purchase.
- [ ] Leave any other state's pair prizes as not published on this page.`,
    },
    {
      id: "tax",
      title: "Tax, age, and the people who should skip the terminal",
      body: `IRS Topic 419 says lottery winnings are taxable gambling income, including amounts that never arrive on a Form W-2G. Pennsylvania's prizes page does not print a withholding percent.

[How a lottery prize is taxed](/guides/lottery-taxes) and [what gets entered on the return](/guides/report-gambling-winnings) are the filing pages. This article does not invent a rate.

The prizes page opened here does not print a minimum age. The age is whatever that state requires, and the number is not published on the chart. Anyone under that age should not buy.

A straight that missed yesterday is not due today. Each drawing is a new set of three digits. The belief that a cold number owes you a hit is the [habit of treating chance as a debt](/guides/gamblers-fallacy).

Anyone who is chasing a loss, and anyone who cannot stop at a written limit, should not play. Call 1-800-GAMBLER. The page for limits on this site is [responsible gambling](/responsible-gambling).`,
    },
    {
      id: "pvp",
      title: "A fixed state prize beside a pot you can recount",
      body: `Pennsylvania's straight prize is a fixed dollar if the order hits. The chart does not change because more people liked 1-2-3 that afternoon. A peer pot does change with who sat down, and the fee is a percent of that pot.

Four $50 Jackpot entries make a $200 pot. Five percent is $10.

The winner receives $190. Roulette is a different game here: 33 slots, 16 Purple and 16 Silver paying 2x, one Green paying 14x, and 5% off a winning payout.

Purple and Silver are about a 7.88% edge after the fee.

You can read a settled round on [fairness](/fairness). We did not buy a Pennsylvania ticket or time a claim.

This site does not sell PICK 3. Cash-out here starts at $20 in BTC, USDC, or ETH.

A $1 straight aimed at $500 is a lottery contract with a 1 in 1,000 chance on that row. A $1 Coinflip is a different contract against one other player, with a 5% fee on the pot.`,
    },
  ],
  faqs: [
    {
      q: "Does a straight/box pay both prize lines when the order is exact?",
      a: "Pennsylvania prints both lines and does not print a combined total. On a 50-cent straight/box of three distinct digits, the row shows $250 for the straight and $40 for the box, with chances of 1 in 1,000 and 1 in 166.67.\n\nThe example lists an exact drawing and an any-order drawing on the same row. Adding $250 and $40 would invent a $290 prize the chart does not state.\n\nThe $1 straight/box column is a dash.",
    },
    {
      q: "Why is the box prize smaller than the straight prize?",
      a: "A $1 straight pays $500 and needs one exact order, at 1 in 1,000. A $1 box on three distinct digits pays $80 and wins on any order, at 1 in 166.67.\n\nThe box stake is still one play. The prize is lower because more results pay it.\n\nA pair box pays $160 at 1 in 333.33, which sits between those two rows. The pattern of the digits picks the row.",
    },
    {
      q: "Can I use this pay table in another state?",
      a: "These figures are Pennsylvania's prizes page and game guide, opened 20 October 2026. Another state can sell a three-digit game with a different straight prize, a different box prize, and a different name.\n\nThe count of outcomes is 1,000 wherever each digit runs from 0 through 9. The dollars are that lottery's choice. Read the chart where you buy.",
    },
    {
      q: "What does Wild Ball change on a $1 straight?",
      a: "Wild Ball doubles the cost of the play. On the $1 chart, a straight shows a $500 base-game prize and a $200 wild-ball prize, with a wild-ball chance of 1 in 333.\n\nA 50-cent play cuts those prizes in half, according to the footnote. The page prints the two prizes in separate columns.\n\nIt does not instruct you to add them on every ticket. Front pair and back pair have their own wild-ball rows.",
    },
    {
      q: "When do Pennsylvania sales stop?",
      a: "The game guide says PICK 3 day sales end at 1:05 pm and evening sales end at 6:57 pm, daily. Day results are shown after 1:35 pm.\n\nThe evening television drawing is at 6:59 pm. Advance play can cover up to seven drawings.\n\nA ticket bought after the cutoff is for a later drawing, not the one that just closed. Confirm the cutoff on the day you play.",
    },
    {
      q: "Is there a way to force the next three digits?",
      a: "There is not. Each drawing is a new three-digit result.\n\nA number that has been quiet is not owed a win, and a number that just hit is not blocked. Straight, box, and straight/box change which results pay and how much.\n\nThey do not change the draw. If you cannot stop, call 1-800-GAMBLER before you buy another ticket.",
    },
  ],
  sources: [
    {
      label: "Pennsylvania Lottery, PICK 3 prizes and chances",
      url: "https://www.palottery.pa.gov/draw-games/pick-3/prizes-chances.aspx",
    },
    {
      label: "Pennsylvania Lottery game guide (PDF), PICK 3 how to play and sales cutoffs",
      url: "https://www.palottery.pa.gov/PaLotteryWebSite/media/Page-Images/Game%20Guide/Game-Guide.pdf",
    },
    {
      label: "IRS Topic 419, Gambling income and losses, reviewed 24 September 2026",
      url: "https://www.irs.gov/taxtopics/tc419",
    },
  ],
  related: [
    "pick-3-strategy",
    "pick-4-lottery",
    "lottery-taxes",
    "report-gambling-winnings",
    "lucky-for-life-lottery",
    "keno-odds",
  ],
  updated: "2026-10-20",
};
