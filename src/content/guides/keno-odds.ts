import type { Guide } from "./types";

export const guide: Guide = {
  slug: "keno-odds",
  cluster: "Casino games",
  keyword: "keno odds",
  secondary: ["keno house edge", "keno paytable", "80 ball keno", "keno rtp"],
  title: "Keno Odds Explained: Spot Counts and House Edge",
  description:
    "Keno odds on an 80-ball, 20-draw card: how spot counts set hit chances, why paytables often keep 20% or more, and how to read one ticket.",
  h1: "Keno odds: spot counts, 80-ball draws and the real keep",
  answer:
    "Keno odds are combination counts on an 80-number field with 20 numbers drawn. You mark n spots; the paytable pays for catching k of those n. The true chance of a catch is a hypergeometric fraction. Casinos short-pay the rare catches and the common ones, so many tickets sit at a 20% to 40% house edge — lottery territory, not baccarat. PVPspinArena does not offer keno; Jackpot, Coinflip and Roulette are the live games.",
  facts: [
    "Classic keno draws 20 numbers from 80. Your ticket marks 1 to 10 (sometimes more) spots.",
    "Hit chances are hypergeometric: C(n,k) × C(80−n, 20−k) / C(80,20), not “1 in 4 because 20/80.”",
    "A 1-spot that pays 3x total on a hit (true p = 20/80) is a 25% house edge.",
    "Multi-spot jackpots fund themselves with fat edges on the catches you actually hit.",
    "PVPspinArena does not offer keno; the live games are Jackpot, Coinflip and Roulette.",
  ],
  sections: [
    {
      id: "what",
      title: "What a keno ticket is buying",
      body: `Keno looks like a lotto slip because it is one. You choose how many spots to mark. The house draws 20 of 80. A paytable maps “catch k of n” to a payout. You do not pick hits during the draw.

### The loop

1. Choose a stake and a spot count n.
2. Mark n numbers, or let a RNG pick them.
3. 20 numbers are drawn (balls, a grid, or a generator).
4. Count matches. The paytable pays or doesn’t.

There is no skill in marking birthdays. Every n-subset of the same size has the same distribution of catches. This page is in the [casino games topic](/guides/topics/casino-games). Adults 18+. No “best keno” lists.

Video keno and instant keno use the same hypergeometric idea at a much higher speed. Pace multiplies the keep. Live-drawn keno is slower and still expensive if the paytable is ugly.

A club-style draw every four minutes at $5 is 15 tickets an hour, $75 turnover. At a 30% ticket the expected cost is about $22.50 an hour — already baccarat-session money on a worse product. Video keno at a ticket every six seconds is 600 tickets an hour. Same $5 and 30% is $3,000 wagered and about $900 expected keep. The paytable did not change. The clock did. If you came from [online casino games](/guides/online-casino-games) looking for a “simple numbers” game, simple is not cheap. Write P(k) × pay for the rows you actually hit before you mark a birthday.`,
    },
    {
      id: "table",
      title: "Spot odds: a compact hypergeometric table",
      body: `C(80,20) is the universe: about 3.535×10^18, but you never need that number raw. You need ratios. A spreadsheet or a hypergeometric calculator is enough. What you must not do is treat “20 of 80, so 25%” as the chance of a 10-spot jackpot. That 25% is only the 1-spot hit rate. Every extra marked number changes the distribution. The jackpot is a tiny left tail. The keep lives in the fat middle.

| Ticket | Event | Exact chance | Fair total payout | What a cheap-looking paytable often does |
| --- | --- | --- | --- | --- |
| 1-spot | Catch 1 | 20/80 = 25% | 4x | Pays 3x; edge 25% |
| 2-spot | Catch 2 | C(2,2)×C(78,18)/C(80,20) ≈ 6.01% | ~16.6x | Often pays 12x or less |
| 4-spot | Catch 4 | ≈ 0.31% | ~326x | Jackpot line, still short |
| 4-spot | Catch 2 | ≈ 21.3% | ~4.7x | Often pays 1x–2x (push or tiny) |
| 10-spot | Catch 10 | ≈ 1 in 8.9 million | Millions-to-1 fair | Posted 100,000:1 class prizes |
| 10-spot | Catch 5 | ≈ 5.14% | ~19.5x | Often a few times stake |

Formula for catching exactly k of n when 20 are drawn from 80:

P(k) = C(n,k) × C(80−n, 20−k) / C(80,20)

provided the right-hand combination is defined (you cannot catch 8 on a 4-spot).

The 1-spot row is the teaching row. True p = 1/4. Fair even-money would be wrong; fair is 4x total. Pay 3x and the product is 0.75. That is a 25% edge on the simplest ticket in the game. [House edge](/guides/house-edge) is that product, not the jackpot font size.

[RTP explained](/guides/rtp-explained) is the same keep as a payback percentage: a 25% edge is 75% RTP. It is not a 75% chance the ticket wins.`,
    },
    {
      id: "worked",
      title: "Worked example: $2 on a 1-spot versus a 10-spot",
      body: `**1-spot at 3x.** One hundred tickets, $2 each. Turnover $200. Hit about 25 tickets, each returning $6. Expected return = 25 × $6 = $150. Expected cost $50 (25%).

If the sheet pays 4x on a 1-spot, that row is fair. Many do not. Read the 1-spot line first; it is the easiest honesty check.

**10-spot, illustrative sheet.** Suppose catch-0 and catch-1 pay 0, catch-5 pays 5x, catch-10 pays 50,000x, and the in-between rows are modest. The rare 10-catch (about 1 in 8.9 million) can still leave the whole ticket at a 25–35% edge because the catches you actually see — 3, 4, 5 — are short-paid.

Expected cost on $200 at a 30% ticket ≈ $60. Same $200 on banker baccarat at 1.06% ≈ $2.12. Keno is not “baccarat with more numbers.”

### Combo tickets

Marking groups and playing many n-subsets at once raises turnover. Each subset is its own ticket. The edge does not fall because you “covered more.” You just bought more high-edge slips.`,
    },
    {
      id: "variants",
      title: "Way tickets, video keno and lotto cousins",
      body: `**Way / combo keno.** One card, many bets. Price each way as its own n-spot. The pretty pattern is not a discount.

**Video keno.** Same 80/20 idea, sometimes 80/10 or a bonus ball. Speed is the product. A 25% edge every fifteen seconds is how a $40 stack becomes a $400 evening.

**Bonus balls and multipliers.** A random 3x on the paytable is not free if the base pays were cut to fund it. Invert: average multiplier × base EV should still sit at 1 − edge.

**Lotto and bingo.** State lotteries often keep about half. [Crypto lottery](/guides/crypto-lottery) and [crypto bingo](/guides/crypto-bingo) are cousins: combination pays, fat tails, house or operator take in the table. The side-by-side of the two draw games is [keno vs bingo](/guides/keno-vs-bingo). Do not import keno’s 25% onto a PvP pot, and do not import Jackpot’s pot-share math onto an 80-ball card.`,
    },
    {
      id: "not-here",
      title: "PVPspinArena does not offer keno",
      body: `There is no 80-ball card here. The live games are Jackpot, Coinflip and Roulette.

- [Jackpot](/) — your chance is your share of a visible pot, not C(n,k) against a house paytable.
- [Coinflip](/coinflip) — 50/50, fee published.
- [Roulette](/roulette) — 33 slots you can count without a binomial coefficient.
- [online casino games](/guides/online-casino-games) — where keno sits in a lobby: specialty, high keep.

If a site shows “up to 96% keno RTP,” believe the paytable product, not the banner. Some video keno variants are configured far kinder than casino floor cards; some are worse. The hypergeometric does not change. The r column does.`,
    },
    {
      id: "read",
      title: "How to read a keno paytable in two minutes",
      body: `1. Find n (spots) and how many are drawn (usually 20 of 80).
2. Write P(k) for the rows that pay.
3. Multiply each P(k) by that row’s total payout.
4. Sum. That is expected return. Edge = 1 − sum.
5. If you cannot get P(k), you cannot price the ticket.

You do not need all rows for a sanity check. Price the 1-spot. Price the most common paying catch on your n (often catch-3 or catch-4 on mid spots). If those two are already ugly, the jackpot row will not save the ticket.

Pick numbers randomly or sequentially — it does not matter. Avoid “lucky” extra multipliers you have not priced.

Way tickets deserve a second pass because they hide turnover. A card that marks 10 numbers as five 4-spot ways is five tickets, not one. If each 4-spot is the 37% floor sheet, five $2 ways are $10 of 37% action per draw — expected keep about $3.70 a draw. Twenty draws is $74 expected on $200 through the ways, while the jackpot line on a single 10-spot still almost never hits. People remember the one catch-7 story. The invert remembers the catch-2 rows.`,
    },
    {
      id: "more-spots",
      title: "Worked 4-spot and 8-spot rows you can actually finish",
      body: `The 1-spot is the honesty check. Mid spots are what people actually mark. You can finish a few rows by hand with the hypergeometric.

### 4-spot, 20 drawn from 80

P(catch 0) = C(4,0)×C(76,20)/C(80,20) ≈ 0.308.  
P(catch 1) ≈ 0.433.  
P(catch 2) ≈ 0.213.  
P(catch 3) ≈ 0.043.  
P(catch 4) ≈ 0.0031.

A floor-style sheet that pays 0, 0, 1x, 4x, 80x on those five rows:

EV ≈ 0.213×1 + 0.043×4 + 0.0031×80 ≈ 0.213 + 0.172 + 0.248 = 0.633. Edge **about 37%**.

A kinder video sheet that pays 0, 0, 2x, 15x, 200x:

EV ≈ 0.426 + 0.645 + 0.620 = 1.691 — that would be *player* edge, which is why real sheets do not pay those three rows at once. If catch-2 is a push (1x) and catch-3 is 8x and catch-4 is 100x: EV ≈ 0.213 + 0.344 + 0.310 = 0.867, edge **about 13%**. Still worse than banker baccarat. Better than the 37% floor card. The jackpot font did not decide it. The middle rows did.

### 8-spot sketch

Catch-8 on 8 spots is about 1 in 230,000. A 10,000× top line on that event contributes about 0.043 to EV — four cents on the dollar — if the probability is ~1/230,000. The game’s keep is decided by catch-4 and catch-5, which happen often enough to feel like “I was close.” If those pays are 1x and 3x against true fair multiples near 7x and 20x, the ticket is already dead.

### Race keno and bonus draws

An extra drawn ball that “only helps” is funded by lower base pays. Price the full distribution, or treat the bonus as unread.

Fifty $5 tickets on the 37% 4-spot: $250 wagered, expected cost about $92. Fifty $5 banker chips: expected cost about $1.33. Keno is not a table game with more numbers. It is a lottery that lets you pick how many spots to misprice.`,
    },
    {
      id: "limits",
      title: "Jackpot fonts and knowing when to pocket the slip",
      body: `Keno sells a wall of numbers and a rare top line. That is a variance costume on a high keep. If you are buying more ways to chase a catch-10, or jumping from $2 to $20 after a near miss, stop.

Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion) if a draw schedule has become a habit. The [responsible gambling](/responsible-gambling) page is the on-site list.

This site is 18+. A correct hypergeometric is not a reason to mark another card.

Set a ticket count, not a “until I catch 6.” Twenty $3 cards on a 25% 1-spot is $60 through a 25% keep, about $15 expected — a known expensive hour. Twenty $3 cards on an unread 10-spot jackpot sheet can be worse and will feel closer because catch-4 looks like almost. Almost is not a pay row. If video keno is the format, cap minutes as well as tickets; the draw interval is the hidden multiplier. When the cap hits, pocket the slip. The next 20-ball set does not owe you a catch, a catch-5, or a “make-up” jackpot. Independence is the whole game after the paytable.

Picking more spots does not invent an edge. [Keno strategy](/guides/keno-strategy) is the set of systems people try, and the odds page is still the price.

The same paytables appear as [crypto keno](/guides/crypto-keno) when the cashier is a wallet.`,
    },
  ],
  faqs: [
    {
      q: "How are keno odds calculated?",
      a: "Hypergeometric counts: ways to choose k hits from your n spots times ways to fill the rest of the 20-draw from the unmarked numbers, divided by C(80,20).",
    },
    {
      q: "What is a typical keno house edge?",
      a: "Many casino and video paytables sit around 20% to 40%. Some published video-keno RTPs are better; believe the sheet in front of you, not a genre average.",
    },
    {
      q: "Does picking lucky numbers change keno odds?",
      a: "No. Every n-set has the same catch distribution. Birthdays and patterns do not beat the paytable.",
    },
    {
      q: "Is the 1-spot the best keno ticket?",
      a: "It is the easiest to price. If it pays 3x on a 25% hit, the edge is 25%. Other spots can be better or worse; only the summed P(k)×pay says which.",
    },
    {
      q: "Does PVPspinArena have keno?",
      a: "No. PVPspinArena offers Jackpot, Coinflip and Roulette only. This guide is the 80-ball pricing sheet for tickets elsewhere.",
    },
    {
      q: "Is video keno different from live keno?",
      a: "The combination math is the same family. Video is faster and may use a different paytable or draw size. Speed raises hourly cost at the same edge.",
    },
  ],
  sources: [
    { label: "Wizard of Odds: keno", url: "https://wizardofodds.com/games/keno/" },
    { label: "Wikipedia: Keno", url: "https://en.wikipedia.org/wiki/Keno" },
    {
      label: "Wikipedia: Hypergeometric distribution",
      url: "https://en.wikipedia.org/wiki/Hypergeometric_distribution",
    },
  ],
  related: [
    "online-casino-games",
    "house-edge",
    "rtp-explained",
    "crypto-lottery",
    "crypto-bingo",
    "keno-strategy",
    "crypto-keno",
  ],
  updated: "2026-09-26",
};
