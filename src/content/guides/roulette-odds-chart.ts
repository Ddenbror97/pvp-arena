import type { Guide } from "./types";

export const guide: Guide = {
  slug: "roulette-odds-chart",
  cluster: "Games & odds",
  keyword: "roulette odds chart",
  secondary: [
    "roulette payout chart",
    "roulette probabilities",
    "european roulette odds",
    "american roulette odds",
  ],
  title: "Roulette Odds Chart: Payouts, Edges and Variants",
  description:
    "A roulette odds chart for inside and outside bets, European versus American edges, and how coloured PvP wheels publish different payouts.",
  h1: "Roulette odds chart: payouts, probabilities and house edge",
  answer:
    "A roulette odds chart lists each bet’s winning pockets, payout multiple and house edge. On a European single-zero wheel the edge is 2.70% for almost every standard bet; an American double-zero wheel is 5.26% on those same bets. Coloured PvP-style wheels use a different pocket count and a different payout row — PVPspinArena’s 33-slot wheel is about 7.88% on Purple or Silver and about 59.70% on Green after the 5% win fee.",
  facts: [
    "European roulette has 37 pockets (1–36 plus 0); American roulette has 38 (adds 00).",
    "A fair even-money bet would pay 2x on 18/36; the zeros are why the real chance is 18/37 or 18/38.",
    "Almost every European inside and outside bet has a 2.70% house edge; the five-number “basket” on American wheels is worse, about 7.89%.",
    "PVPspinArena Roulette uses 16 Purple, 16 Silver and 1 Green, paying 2x, 2x and 14x, for about a 7.88% Purple or Silver edge after the win fee.",
    "French even-money rules such as la partage can cut the even-money edge to about 1.35%.",
  ],
  sections: [
    {
      id: "how-to-read",
      title: "How to read a roulette odds chart",
      body: `Every roulette bet is three numbers: how many pockets win, what the posted payout is, and what those two imply for expected return.

House edge = 1 − (win probability × total payout).

Total payout here includes the stake coming back. A “1 to 1” even-money win is a 2x multiple. A “35 to 1” single-number win is a 36x multiple.

### Why zeros exist

Pockets 1–36 split evenly into red/black, odd/even, and high/low. Eighteen pockets would be a fair 2x. The extra 0 (and 00) win for the house on those bets. Inside bets are short-paid the same way: a single number is 1/37 but pays as if it were 1/36.

That is the whole game. Our [house edge guide](/guides/house-edge) is this formula in general form. A chart just fills it in for every marking on the layout.

If you have not sat at a layout yet, [how to play roulette](/guides/how-to-play-roulette) is the beginner order of the spin. This page is the payout chart.`,
    },
    {
      id: "european",
      title: "European roulette odds chart",
      body: `Single-zero wheel, 37 pockets. Unless a special even-money rule applies, every row below has a 2.70% house edge.

| Bet | Winning pockets | Probability | Posted payout | House edge |
| --- | --- | --- | --- | --- |
| Straight (one number) | 1 | 1/37 (2.70%) | 36x (35 to 1) | 2.70% |
| Split (two numbers) | 2 | 2/37 (5.41%) | 18x (17 to 1) | 2.70% |
| Street (three) | 3 | 3/37 (8.11%) | 12x (11 to 1) | 2.70% |
| Corner (four) | 4 | 4/37 (10.81%) | 9x (8 to 1) | 2.70% |
| Six-line | 6 | 6/37 (16.22%) | 6x (5 to 1) | 2.70% |
| Column or dozen | 12 | 12/37 (32.43%) | 3x (2 to 1) | 2.70% |
| Red / black | 18 | 18/37 (48.65%) | 2x (1 to 1) | 2.70% |
| Odd / even | 18 | 18/37 (48.65%) | 2x | 2.70% |
| High / low | 18 | 18/37 (48.65%) | 2x | 2.70% |

Worked even-money line: 18/37 × 2 = 0.9730, edge = 2.70%. Worked straight-up: 1/37 × 36 = 0.9730, same edge. The chart is flat on purpose. Picking a single number does not “pay better”; it pays the same edge with more variance. [Roulette colors](/guides/roulette-colors) makes that texture point for colour wheels; the European layout is the same idea with more labels.`,
    },
    {
      id: "american",
      title: "American roulette and the basket exception",
      body: `Add 00 and you have 38 pockets. The same posted payouts now sit on thinner probabilities.

| Bet | Probability | Posted payout | House edge |
| --- | --- | --- | --- |
| Straight | 1/38 (2.63%) | 36x | 5.26% |
| Split | 2/38 (5.26%) | 18x | 5.26% |
| Street | 3/38 (7.89%) | 12x | 5.26% |
| Corner | 4/38 (10.53%) | 9x | 5.26% |
| Six-line | 6/38 (15.79%) | 6x | 5.26% |
| Column / dozen | 12/38 (31.58%) | 3x | 5.26% |
| Red / black (and other even money) | 18/38 (47.37%) | 2x | 5.26% |
| Basket 0-00-1-2-3 | 5/38 (13.16%) | 7x (6 to 1) | 7.89% |

Even money: 18/38 × 2 = 0.9474, edge 5.26%. The five-number basket is the famous trap: 5/38 × 7 = 0.9211, edge 7.89%. If a layout offers that chip, skip it. Our [how to win at roulette](/guides/how-to-win-at-roulette) guide is blunt: you do not win long-run by picking a hotter label; you lose slower by picking the lower edge.

### French even-money relief

On some single-zero tables, la partage or en prison returns half an even-money stake when the ball finds 0. That halves the even-money edge to about 1.35%. Inside bets stay at 2.70%. If you only play even money and the table offers partage, that is the cheapest common wheel rule. It still is not a player edge.`,
    },
    {
      id: "pvp-wheel",
      title: "Coloured wheels use a different chart",
      body: `CS:GO-era and PvP-site wheels are not 37-pocket layouts. They are short colour rings with two common colours and one rare colour. You must not paste European percentages onto them.

### PVPspinArena chart

33 slots: 16 Purple, 16 Silver, 1 Green.

| Bet | Slots | Probability | Payout | Expected return | House edge |
| --- | --- | --- | --- | --- | --- |
| Purple | 16 | 16/33 (48.48%) | 2x | 0.9697 | 3.03% |
| Silver | 16 | 16/33 (48.48%) | 2x | 0.9697 | 3.03% |
| Green | 1 | 1/33 (3.03%) | 14x | 0.4242 | 57.58% |

16/33 × 2 = 32/33. 1/33 × 14 = 14/33. Purple and Silver share an edge. Green pays 14x on one slot, so its edge is much higher and its variance is higher too. You can count the slots on the [Roulette page](/roulette) and repeat the sum yourself. The longer walkthrough is in [crypto roulette](/guides/crypto-roulette).

### Do not mix charts

A streamer quoting “roulette is 2.70%” while spinning a 33-slot 14x green is describing a different product. Always count pockets, then apply the posted multiple. The [games and odds topic](/guides/topics/games-and-odds) is where those live numbers live on this site.`,
    },
    {
      id: "using",
      title: "Using the chart without fooling yourself",
      body: `A chart is for comparison, not for a system.

- Prefer the lower-edge wheel when you have a choice: French even-money with partage, then European, then a 33-slot colour wheel, then American, then the American basket.
- Prefer lower variance if your budget is small: even money and 2x colours last longer than straight-ups and 14x green.
- Ignore “due” colours. Independent spins do not settle debts. That is the [gambler's fallacy](/guides/gamblers-fallacy).
- Ignore martingales. Doubling after a 2x loss changes the shape of ruin, not the edge on the colour. See [martingale strategy](/guides/martingale-strategy).
- Multiply edge by total wagered. Sixty $1 Purple spins cost about $1.82 before the win fee, whatever pattern you painted on the felt.

No row in any of the tables above is +EV. The honest use of a roulette odds chart is to know what you are paying per dollar spun.

### Combining bets does not average the zeros away

A $1 red plus a $1 black covers 36 pockets on a European wheel and loses both when the ball finds 0. You turned two 2.70% bets into $2 wagered and a certain loss on zero. Expected cost is still about 5.4 cents per spin pair, not zero. A red-and-green split on a 33-slot wheel is the same idea: you paid two edges. Coverage is not insurance. Insurance would require the missing pockets to pay you, and they do not.

### Zero as a “number like the others”

Straight-up 0 on European is 1/37 at 36x, edge 2.70%, same as 17. It is not a hedge against other bets unless you compute the overlap. If you already have red, adding 0 is a new 2.70% chip, not a rebate on the red chip. Write each chip as its own row on the chart, then add the stakes. That sum is what the edge multiplies. A full layout of many 1-unit inside bets can look busy and still be one 2.70% leak, or this wheel's own edge, on a large total wagered. Busy is not safer. Busy is more dollars under the same percentage. If you want a single number for the night, multiply your average chips per spin by spins by the edge on that wheel. That product is the average tab. The chart exists to fill in the edge.`,
    },
    {
      id: "verify",
      title: "Published payouts you can check",
      body: `On a numbered European stream you still trust the studio’s wheel. On PVPspinArena you can also check that the committed seed mapped to the slot that paid.

Open [how it works](/how-it-works) for the cycle, then [Fairness](/fairness) after a round. The odds chart tells you whether the payout row is priced correctly. The fairness page tells you whether this spin used the published function. You want both. A verified spin is still priced at the chart above.

Call bets on a numbered racetrack — neighbours of zero, tiers du cylindre — look like coverage. Add the chips. Voisins du zéro is typically 9 chips covering 17 numbers at mixed straight and split prices, and the package still sits on the 2.70% European edge. You bought a bundle, not a discount. If the table card does not list the chip recipe, ask before you mimic a caller. The chart you want is still pocket count times posted multiple, summed across the bundle.`,
    },
    {
      id: "session",
      title: "Worked sessions on three wheels",
      body: `Put the chart into an hour of $2 chips so the percentages become money.

### European even money, 80 spins

- Chance ≈ 48.65% per spin. Edge 2.70%.
- Total wagered $160. Expected cost about $4.32.
- You will see plenty of wins. The cost is the zeros, not a lack of reds.

### American even money, 80 spins

- Chance ≈ 47.37%. Edge 5.26%.
- Same $160 wagered. Expected cost about $8.42.
- You paid about $4 extra versus European for the same entertainment shape. That is the 00.

### PVPspinArena Purple, 80 spins

- Chance = 16/33 ≈ 48.48%. Edge about 3.03% before the win fee.
- Same $160 wagered. Expected cost about $4.85 before the fee.
- Green at 14x on the same 80-spin, $2 clip costs about $92 before the fee, and it usually finishes near zero with a rare spike.

### Neighbours and call bets

Racetrack bets (voisins, tiers, orphelins) are just bundles of straight-ups and splits. Their edge on a European wheel stays 2.70% because each component is 2.70%. They do not “cover the wheel” in a way that removes zeros. A complete coverage of all 37 pockets would cost more than a 36x win can return. That is the chart again: you cannot buy the whole sample space at a profit.

Write the wheel type on your note before you write a colour. The chart is a price list. Use it that way.

### Inside bets are not “closer to even”

A corner at 9x on 4/37 returns 36/37, same as a straight-up at 36x on 1/37. The difference is how often you see a hit, not how much the zero costs you. Players who switch from red to a street because “I need a bigger hit to recover” have raised variance while keeping the 2.70%. Recovery is not a column on the chart. If the session is about recovery, the honest move is to stop, not to climb the layout.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `A roulette odds chart is probability times payout for each bet. European single-zero bets sit at 2.70%. American double-zero bets sit at 5.26%, except the five-number basket at 7.89%. La partage can cut even-money European play to about 1.35%. Coloured 33-slot wheels are a different chart: on PVPspinArena, Purple and Silver return 32/33 and Green returns 14/33 before the win fee.

Use the chart to pick a cheaper wheel and a variance you can survive. Do not use it to invent a winning pattern. Count the pockets in front of you, including ours on Roulette, before you import someone else’s percentages.

La partage and en prison, which the chart only names, are unpacked in [French roulette](/guides/french-roulette).

A live variant that rewrites the straight-up pay is [Lightning Roulette](/guides/lightning-roulette).`,
    },
  ],
  faqs: [
    {
      q: "What is a roulette odds chart?",
      a: "It is a table of each bet’s winning pockets, payout multiple and house edge. You compute edge as 1 minus (probability times total payout).",
    },
    {
      q: "Why is European roulette 2.70% and American 5.26%?",
      a: "Both pay even money as 2x on 18 pockets. European divides by 37 pockets, American by 38. 18/37 × 2 = 97.30% RTP; 18/38 × 2 = 94.74% RTP.",
    },
    {
      q: "Does a single-number bet have a worse edge?",
      a: "Not on a standard European or American layout. The straight-up pays 36x on 1/37 or 1/38, which matches the even-money edge. It is just lumpier.",
    },
    {
      q: "What is the house edge on PVPspinArena Roulette?",
      a: "Before the win fee, Purple and Silver return 32/33 and Green returns 14/33. Sixteen Purple slots and sixteen Silver slots pay 2x. The one Green slot pays 14x.",
    },
    {
      q: "Which roulette bet is best?",
      a: "The lowest-edge legal bet on the wheel you actually have. On a French table with la partage, even money is cheapest. On PVPspinArena Purple and Silver have the same edge, and Green is the expensive long shot.",
    },
    {
      q: "Is there a +EV row on the chart?",
      a: "No. Every standard posted payout is below the true odds. A chart that showed a player edge would be a mispriced table, not a strategy.",
    },
  ],
  sources: [
    { label: "Wikipedia: Roulette", url: "https://en.wikipedia.org/wiki/Roulette" },
    { label: "Wizard of Odds: roulette", url: "https://wizardofodds.com/games/roulette/" },
    {
      label: "Wikipedia: House advantage",
      url: "https://en.wikipedia.org/wiki/Casino_game#House_advantage",
    },
  ],
  related: [
    "crypto-jackpot",
    "roulette-colors",
    "how-to-win-at-roulette",
    "house-edge",
    "coin-flip-odds",
    "french-roulette",
    "lightning-roulette",
  ],
  updated: "2026-09-26",
};
