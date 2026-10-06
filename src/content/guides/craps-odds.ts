import type { Guide } from "./types";

export const guide: Guide = {
  slug: "craps-odds",
  cluster: "Casino games",
  keyword: "craps odds",
  secondary: ["pass line odds", "craps house edge", "craps propositions", "don't pass"],
  title: "Craps Odds: Pass Line Versus Proposition Bets",
  description:
    "Craps odds on the pass line versus propositions: the 36-pair table, 1.41% line edge, and why any-seven is a 16.67% price on the same cubes.",
  h1: "Craps odds: pass line versus proposition bets on the same cubes",
  answer:
    "Craps odds start with 36 equally likely two-dice pairs, then a payoff schedule. The pass-line sequence uses those pairs and still keeps about 1.41%. Don’t-pass is about 1.36%. Proposition bets use the same cubes and short-pay hard: any seven at 5x is a 16.67% house edge. The dice can be fair while the chip is not. PVPspinArena does not offer craps — only Jackpot, Coinflip and Roulette.",
  facts: [
    "Two distinguishable dice make 36 ordered pairs; 7 appears in 6 of them (16.67%).",
    "Pass line is about 1.41% house edge; don’t-pass is about 1.36% because 12 usually pushes.",
    "True odds behind the line, where offered, pay the point’s real ratio and add no extra edge on that extra chip.",
    "Any seven, yo, horn and most hop bets are high-edge propositions on the same 36 pairs.",
    "PVPspinArena does not offer craps; the live games are Jackpot, Coinflip and Roulette.",
  ],
  sections: [
    {
      id: "pairs",
      title: "Start from 36 pairs, not eleven totals",
      body: `Craps odds are combination counts. (1,6) and (6,1) are different outcomes. People who treat 2 through 12 as eleven equal bins get every proposition wrong.

The full pair table — and why 7 leads at 6/36 — is in [dice roll probability](/guides/dice-roll-probability). This page applies that table to the line and to the junk in the middle of the layout.

### Come-out in one line

- 7 or 11: pass wins (8/36).
- 2, 3 or 12: pass loses (4/36). Don’t-pass usually wins on 2 or 3 and **pushes** on 12.
- 4, 5, 6, 8, 9 or 10 becomes the **point**. Pass then wins if that point repeats before the next 7.

The cubes did not become unfair. The even-money pay on a sequence that is a little worse than 50/50 is the edge. This sits in the [casino games topic](/guides/topics/casino-games). Adults 18+ only. No casino rankings.

If you only remember one layout sentence, remember this: the line is a sequence price; the centre is a one-roll or hard-way price; odds are a 0% rider you buy only after you have already paid the sequence. Mixing them without naming which chip is which is how a 1.41% night becomes a 10% night while you still say “I only play craps.” You played several games that share a felt.`,
    },
    {
      id: "table",
      title: "Pass line versus propositions: the odds table",
      body: `| Bet | True chance (pairs or sequence) | Typical total payout | Approx. house edge |
| --- | --- | --- | --- |
| Pass line | Sequence, ~49.29% win | 2x | 1.41% |
| Don’t pass | Sequence, 12 push | 2x | 1.36% |
| Odds on 4 or 10 (where offered) | 3/9 vs 7 | 3:1 / 1:2 | 0% on the odds chip |
| Odds on 5 or 9 | 4/10 vs 7 | 3:2 / 2:3 | 0% on the odds chip |
| Odds on 6 or 8 | 5/11 vs 7 | 6:5 / 5:6 | 0% on the odds chip |
| Field (2 and 12 pay 2x) | 16/36 | 2x / extra on 2,12 | 5.56% |
| Field (2 and 12 pay 3x on one) | 16/36 | Better 2 or 12 | 2.78% |
| Any seven | 6/36 | 5x | 16.67% |
| Any craps (2,3,12) | 4/36 | 8x | 11.11% |
| Yo (11) | 2/36 | 16x | 11.11% |
| Hard 6 or 8 | 1 way vs 10 resolving | 10x | 9.09% |
| Hard 4 or 10 | 1 way vs 8 resolving | 8x | 11.11% |

The first rows are why craps has a “low edge” reputation. The last rows are why the centre of the table exists. Same 36 pairs. Different r. That is [house edge](/guides/house-edge) in one layout.

Place bets and buy bets sit between those worlds: better than yo, worse than the line plus odds. Read the vig. Instant [crypto dice](/guides/crypto-dice-game) is a slider, not this sequence — do not quote 1.41% on a roll-under 50.`,
    },
    {
      id: "worked",
      title: "Worked example: $10 pass versus $10 any seven",
      body: `**Pass.** You bet $10 on the line for 150 decisions. Turnover = $1,500. At 1.41% the expected cost is about $21.15.

A **decision** is a resolved pass bet: come-out win/loss or point resolved by point-or-seven. It is not every roll. A long point burns clock without extra line decisions unless you also press other chips.

**Any seven.** You bet $10 on any seven for 150 *rolls*. Chance 6/36, pay 5x total. EV per dollar = (6/36)×5 = 0.833. Edge 16.67%. Expected cost on $1,500 ≈ $250.

Same $10, same evening, opposite prices. The seven you wanted on the come-out is the seven that kills a point — and the seven the centre sells at a 5x that should have been 6x.

### Point of 4, isolated

Ways to 4: 3. Ways to 7: 6. Conditional win chance = 3/9 = 1/3. Fair isolated pay would be 3x. The line still paid even money on the whole sequence. That gap, mixed with come-out 7s and 11s, is how 1.41% appears. An 8 is 5/11 ≈ 45.5% — better than a 4, still not even, still even money on pass.`,
    },
    {
      id: "odds-bets",
      title: "True odds: the 0% chip next to a 1.41% chip",
      body: `Where casinos allow **odds** behind a pass or come bet, that extra amount pays the true point ratio: 2:1 on 4/10, 3:2 on 5/9, 6:5 on 6/8. The odds chip has no house edge. The line chip in front of it still does.

You cannot take odds without a line bet. The package is “cheap plus free,” not “free.” Table limits on odds (3x, 5x, 10x, 100x) change how much of your action sits at 0%. They do not flip the line to a player advantage.

Don’t-pass odds are the inverse ratios. The 12 push on don’t-pass is why that dark-side line is slightly cheaper than pass at the come-out, not because the house likes you.`,
    },
    {
      id: "not-here",
      title: "PVPspinArena does not offer craps",
      body: `There is no pass line and no stickman. The live games are Jackpot, Coinflip and Roulette.

- [Jackpot](/) — pot share is chance.
- [Coinflip](/coinflip) — 50/50, not 8/36 for 7-or-11.
- [Roulette](/roulette) — 33 slots, about 7.88% on Purple or Silver and about 59.70% on Green after the 5% win fee.
- [dice duel](/guides/dice-duel-game) — a different two-cube product, still house-banked.

If you want cubes you can count, use the 36-pair table, then ask whether the posted multiple is 1/p. If it is not, you have found the keep. A hashed slider that says “dice” is a different sample space. How an online table replaces the pit is in [online craps](/guides/online-craps). This page stays on the maths.

A working illustration for a loud table: $10 pass plus $10 odds on a 6 or 8 (6:5). The line chip still carries 1.41%. The odds chip is 0% when it pays 6:5. You have not “beaten” the table; you have diluted the blended edge by putting more dollars on the fair chip. If the house caps odds at 3×, most of your action can sit near 0.5% blended — still a cost, still better than any seven. If you “celebrate” a seven-out by hopping the yo, you just bought the 11% row and threw the dilution away.`,
    },
    {
      id: "myths",
      title: "Hot shooters, systems and the centre of the table",
      body: `A fair cube has no memory. After three points, P(7) is still 6/36. Pressing the yo because the shooter is “due” is the same error as chasing red.

Place-6 and place-8 are often sold as “the smart way to play.” They are better than any seven and worse than line-plus-odds. That can be a reasonable entertainment purchase if you write the vig. It is not a system.

Martingale on the line still risks a table-max wipeout for a one-unit profit. The 1.41% does not care about your progression.

Hard-way pressers treat an easy 8 as a sign the hard 8 is coming. An easy 8 is 3+5, 4+4 is the hard. They are different pairs. After an easy 8 the chance the next resolving 6/8/7 is a hard 8 has not improved. The 9.09% hard-6/8 row stays 9.09%. If you like the noise, buy it at that price and stop calling it a read.`,
    },
    {
      id: "come-place",
      title: "Come, place and hop: the rest of the layout",
      body: `Once the line is clear, the rest of the felt is extra tickets on the same 36 pairs.

### Come / don’t-come

A come bet is a pass-line bet that starts on the next roll after a point is on. Same 1.41% family, same odds-behind option. It lets you have several points working. It does not lower the edge. It raises how many cheap chips you have in action — and how many seven-outs can hit you at once.

### Place 6 and 8

Place-6 (or 8) typically pays 7:6. True chance a 6 arrives before 7 is 5/11. Fair pay would be 6:5. 7:6 is a 1.52% edge — close to the line, worse than line-plus-odds, much better than yo. Place-5/9 at 7:5 is about 4.00%. Place-4/10 at 9:5 is about 6.67%. People quote “place the 6” as if it were the 0% odds chip. It is not.

### Buy bets

A buy-4 or buy-10 pays true 2:1 minus a 5% vig on the bet (or on the win, depending on the house). Vig-on-win is kinder. Either way you are in the low-to-mid single digits, not at zero.

### Hop and hard-way timing

A hop bet is a one-roll proposition: specific pair, or a two-way total. One-roll 3 (1-2) at 15:1 on a 2/36 chance is an 11.11% edge if they pay 16x total. Hard ways stay up until the number is made easy or a 7 shows; they are not “due” after three easy 8s.

### Worked place-6 hour

You place $12 on 6 (a 7:6 unit). In a long session the 6-versus-7 decision happens often. Confirm the house wording: 7:6 usually means $14 profit on $12, so a win returns $26 total. Lose and the $12 is gone.

If win returns $12 + $14 = $26, EV = (5/11)×26 = 11.818, edge on $12 is 1 − 11.818/12 = 1.52%. Fifty such decisions: $600 action, expected cost about $9. Same fifty hops on yo at $12: far uglier. Stay on the line unless you have priced the place vig out loud.`,
    },
    {
      id: "limits",
      title: "When the layout should close",
      body: `Craps is loud and social. The centre bets are designed to be grabbed between rolls. If you are stacking propositions to “stay in the action,” you have left the 1.41% story.

Set a number of line decisions and a loss cap before the come-out. If you cannot walk from a hot table, use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). The [responsible gambling](/responsible-gambling) page lists on-site tools.

This site is 18+. Knowing that any seven pays 5x instead of 6x is not a reason to buy the chip.

A quiet plan: $10 pass, 3× odds when the point is on, no centre. If a third of rolls are come-out decisions and you get 40 decisions in a session, line action is $400, expected keep about $5.60. Odds dollars ride at 0% and add variance without adding keep. The moment you hop a yo “for the table,” you have left that plan. Write the hop as its own $10 × 11% purchase — or do not pick it up. Loud tables are designed so the centre feels like participation. It is a price list. Use it that way or stay on the line.

Which bets to use, and which to skip, is [craps strategy](/guides/craps-strategy).`,
    },
  ],
  faqs: [
    {
      q: "What are the best craps odds on the layout?",
      a: "Pass or don’t-pass, then true odds if offered. Those are the cheap chips. Propositions use the same dice with much worse multiples.",
    },
    {
      q: "Why is any seven so bad if 7 is common?",
      a: "Because it is common, a fair total payout is 6x. Paying 5x on 6/36 keeps one-sixth of the action. Common and well-paid are different facts.",
    },
    {
      q: "Do odds bets have a house edge?",
      a: "The odds chip itself is usually 0% when it pays the true point ratio. You still need a line bet in front, and that line bet keeps about 1.4%.",
    },
    {
      q: "Is crypto dice the same as craps odds?",
      a: "No. Most crypto dice games are a 0–100 slider with a built-in edge. They do not use the 36-pair come-out sequence.",
    },
    {
      q: "Does PVPspinArena have craps?",
      a: "No. PVPspinArena offers Jackpot, Coinflip and Roulette only. This guide is the pass-versus-proposition map for tables elsewhere.",
    },
    {
      q: "Is don’t-pass better than pass?",
      a: "Slightly, about 1.36% versus 1.41%, because 12 is usually a push for don’t-pass. Both are cheap next to the centre of the table.",
    },
  ],
  sources: [
    { label: "Wizard of Odds: craps", url: "https://wizardofodds.com/games/craps/" },
    { label: "Wikipedia: Craps", url: "https://en.wikipedia.org/wiki/Craps" },
    { label: "Wikipedia: Dice", url: "https://en.wikipedia.org/wiki/Dice" },
  ],
  related: [
    "dice-roll-probability",
    "crypto-dice-game",
    "dice-duel-game",
    "house-edge",
    "online-casino-games",
    "online-craps",
    "craps-strategy",
  ],
  updated: "2026-09-26",
};
