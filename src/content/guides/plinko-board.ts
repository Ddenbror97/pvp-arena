import type { Guide } from "./types";

export const guide: Guide = {
  slug: "plinko-board",
  cluster: "Games of chance",
  keyword: "plinko board",
  secondary: ["price is right plinko", "diy plinko board", "galton board", "plinko board physics"],
  title: "Plinko Board: The Price Is Right, Physics and DIY Builds",
  description:
    "The Plinko board explained: how The Price Is Right game works, why chips pile up in the middle, Galton board maths, and how to build a DIY board at home.",
  h1: "Plinko board: the TV game, the physics, and how to build one",
  answer:
    "A Plinko board is an upright pegboard where a flat disc dropped from the top bounces off staggered pegs into a row of prize slots at the bottom. It became famous as a pricing game on The Price Is Right in 1983. Physically it is a noisy Galton board: each peg nudges the chip left or right, so most drops land near the middle.",
  facts: [
    "Plinko debuted on the US version of The Price Is Right in January 1983 and became one of the show's best-known games.",
    "The classic board has nine slots; the centre slot is the top prize, flanked by two $0 slots.",
    "An idealised board with n rows gives a binomial spread: P(slot k) = C(n,k) / 2^n.",
    "Real chips skip pegs, spin and travel sideways, so actual landings are wider than the textbook curve.",
    "Online Plinko is a different product with a random number generator and a paytable; plinko-gambling covers it.",
  ],
  sections: [
    {
      id: "what",
      title: "What a Plinko board is",
      body: `A Plinko board is a tall, slightly tilted or vertical panel studded with pegs arranged in offset rows, like bricks in a wall. A flat disc, usually called a chip, is released from a slot along the top edge. It hits a peg, tips one way, falls to the next row, hits another peg, and so on until it drops into one of the bins along the bottom. Each bin has a value.

That is the entire game. There is no skill in the fall itself. The only decision is where along the top edge to release the chip, and even that has a smaller effect than most players expect.

The same device has older names. Victorian scientist Francis Galton built a pegboard he called a quincunx, now usually called a **Galton board** or bean machine, to demonstrate how many small random events add up to a bell-shaped pattern. Japanese pachinko machines use a similar peg field with steel balls, covered in [pachinko odds](/guides/pachinko-odds). This page is about the physical board: the TV game, the physics and home builds. For the online casino version with multipliers and risk levels, see [Plinko gambling](/guides/plinko-gambling). The wider family of chance devices lives in the [Games of chance topic](/guides/topics/games-of-chance).`,
    },
    {
      id: "price-is-right",
      title: "Plinko on The Price Is Right",
      body: `Plinko first appeared on the US daytime version of The Price Is Right in January 1983 and quickly became one of the show's most requested pricing games. The rules have stayed broadly stable:

1. The contestant starts with one Plinko chip.
2. They are shown small prizes, each with a two-digit price where one digit is correct. Picking the right price for each item earns another chip, up to five in total.
3. From a platform at the top of the board, they drop each chip from any starting slot they choose.
4. Each chip's landing slot adds its cash value to the total.

### The slot values

The standard board has nine bins across the bottom. The layout that viewers know best is symmetric:

| Slot | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Value | $100 | $500 | $1,000 | $0 | $10,000 | $0 | $1,000 | $500 | $100 |

The centre $10,000 slot is the prize everyone aims for, and it is deliberately flanked by two $0 slots. Special and prime-time episodes have sometimes used boosted values; treat any quoted maximum as specific to that episode rather than a permanent rule.

### Why the design is clever

The board puts the jackpot exactly where the physics sends chips most often, then places nothing on either side. A chip that drifts one bin off-centre scores zero. That tension — the most likely area holding both the best and the worst outcomes — is what makes every drop watchable.`,
    },
    {
      id: "physics",
      title: "Plinko board physics and the maths of the bell curve",
      body: `### The idealised model

Imagine a perfect board with n rows. At each peg the chip goes left or right with probability 1/2, independently. After n rows, the bin it lands in depends only on how many rights it took. The number of rights follows a binomial distribution:

P(k rights) = C(n, k) / 2^n

For a 12-row board with 13 bins:

| Bin (rights) | Ways C(12,k) | Probability |
| --- | --- | --- |
| 0 or 12 (edges) | 1 | 0.02% each |
| 3 or 9 | 220 | 5.4% each |
| 5 or 7 | 792 | 19.3% each |
| 6 (centre) | 924 | 22.6% |

The centre bin gets about 1 in 4.4 drops. Each edge bin gets 1 in 4,096. That steep fall-off is why Galton used the device: many tiny independent nudges sum to a curve that approaches the normal distribution as rows increase.

### What real chips do

A physical chip is not a point. It has mass, spin and momentum, and the pegs are not perfect. Real behaviour departs from the model in predictable ways:

- **Momentum carries.** A chip moving right tends to keep moving right for a peg or two, so drops are not independent. The spread gets wider than the binomial curve.
- **Skips and double bounces.** Chips sometimes clear a row or rattle between two pegs.
- **Side walls reflect.** On a narrow board like the TV version, chips that drift to the edge bounce back, which piles probability onto the outer-middle bins.
- **Build tolerances.** A peg a few millimetres off, or a board tilted slightly, biases results. Casino operators would call this a mechanical bias; home builders just call it wonky.

### Does the drop position matter?

Somewhat. Starting above the centre raises the chance of a centre landing compared with starting at the edge, because the chip has less distance to travel back. But the spread from a real board is wide enough that a centre drop still lands in the centre bin only a minority of the time, and the neighbouring $0 bins are as likely as the jackpot. Fans and hobbyists who have simulated the TV board generally conclude that centre drops maximise expected value, but no drop is anywhere near reliable.`,
    },
    {
      id: "expected-value",
      title: "Expected value of a drop: a worked example",
      body: `Suppose a 12-row idealised board had bins paying, from centre outward: centre $10,000, next $0, then $1,000, $500, $100, and $0 beyond. Using the 12-row probabilities from above for a centre drop:

- Centre (k = 6): 22.6% × $10,000 = $2,256
- k = 5 or 7: 38.7% × $0 = $0
- k = 4 or 8: 2 × 12.1% = 24.2% × $1,000 = $242
- k = 3 or 9: 10.7% × $500 = $54
- k = 2 or 10: 3.2% × $100 = $3

That sums to about $2,555 per chip. The number is illustrative only — the TV board has nine bins, side walls and real chips, so its true figure differs — but it shows the structure. Most of the expected value comes from one bin that hits less than a quarter of the time. That is a high-variance prize: about 39% of chips win nothing, and more than three in four pay $1,000 or less.

This is the same logic that sits under any payout table. [Expected value](/guides/expected-value-gambling) weights each prize by its probability; variance describes how far single outcomes swing from that average. A game show gives chips away free, so the contestant has no downside. A casino version charges a stake and sets the payouts so the average return sits below it, which is the difference explored in [Plinko odds](/guides/plinko-odds).`,
    },
    {
      id: "diy",
      title: "How to build a DIY Plinko board",
      body: `A home Plinko board is a popular project for parties, fundraisers, classrooms and school fairs. A tabletop version takes an afternoon; a full-size one a weekend.

### Materials

| Item | Typical choice |
| --- | --- |
| Back panel | Plywood or MDF, 12–18 mm thick |
| Pegs | Wooden dowels, nails or screws with smooth heads |
| Chips | Wooden or acrylic discs, poker chips for tabletop |
| Bins | Thin strips of wood or acrylic as dividers |
| Frame | Side rails to stop chips flying off |
| Finish | Paint, clear coat, printed slot labels |

### Layout rules that make it work

1. **Peg spacing.** Leave a gap between pegs of roughly 1.5 to 2 times the chip diameter. Too tight and chips jam; too wide and they fall straight through.
2. **Offset rows.** Each row shifts by half the spacing, so every chip has to hit a peg.
3. **Consistent height.** Keep peg heads flush at the same depth, or chips will catch on proud ones.
4. **Tilt the board.** A slight backward lean keeps chips against the panel instead of popping out. Add a clear front panel if kids will use it.
5. **Rows versus bins.** More rows produce a smoother, tighter bell curve. Eight to twelve rows is a sensible range for a home board.
6. **Test before labelling.** Drop 100 chips from the centre, tally the bins, and set prize values after you see how your board actually behaves.

### Reading your test tally

With 100 test drops, a bin that should catch 20% will usually show somewhere between about 12 and 28 hits, because the standard deviation is √(100 × 0.2 × 0.8) = 4. Do not re-drill pegs because one bin looks a little hot. If one side consistently collects far more chips than the other over a few hundred drops, check that the board hangs level and that the pegs in the top rows are centred.

### Setting prizes at an event

For a charity stall, put small prizes in the common middle-outer bins and one headline prize in a less likely bin. If players pay to drop, check your local rules on prize games first; paid entry plus chance plus a prize can bring a game under gambling law in many places. The [casino party ideas](/guides/casino-party-ideas) guide covers how play-money events are usually set up.`,
    },
    {
      id: "carnival",
      title: "Plinko-style games at fairs and arcades",
      body: `Pegboard drops show up well beyond television. Arcade coin-pushers and ticket redemption machines use peg fields to scatter coins or balls. Fairground stalls sometimes run a pay-per-drop board with a prize wall.

Those setups deserve the same scrutiny as other [carnival games](/guides/carnival-games). The operator chooses peg layout, bin widths, and which bins carry prizes, and can tune a board so the headline prize bin is narrow or near the edge. Arcade machines with payout settings work similarly to the ones described in [claw machine tricks](/guides/claw-machine-tricks). None of this is necessarily dishonest; it is how prize games cover their costs. But it means a physical board you did not build is not guaranteed to follow the neat curve above.`,
    },
    {
      id: "pvp",
      title: "From peg physics to hashed rounds",
      body: `A physical board gets its randomness from friction, spin and tiny build flaws, which makes it fun to watch and very hard to audit. Digital games replace the pegs with a random number generator, which can be audited but cannot be seen.

PVPspinArena runs three player-vs-player games — Jackpot on [the home page](/), [Coinflip](/coinflip) and [Roulette](/roulette) — in USDC or ETH on Base, with results drawn from committed seeds that anyone can verify for a settled round on [fairness](/fairness). Roulette is the closest in spirit to a prize board: a 33-slot wheel with 16 Purple and 16 Silver slots paying 2x and 1 Green slot paying 14x. Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Coinflip is a straight 50/50 between two players, and a Jackpot win chance equals your share of the pot.

The shared lesson is the one Galton demonstrated: individual outcomes are unpredictable, averages are not. Real-money play is 18+, and the [responsible gambling](/responsible-gambling) page has tools for setting limits.`,
    },
  ],
  faqs: [
    {
      q: "How does the Plinko board on The Price Is Right work?",
      a: "Contestants win up to five chips by pricing small items, then drop each chip from the top of a pegboard. Each chip's landing slot adds cash; the centre slot pays the top prize and sits between two $0 slots.",
    },
    {
      q: "Where should you drop a Plinko chip?",
      a: "Near the centre if the top prize is in the middle bin. It raises the chance of landing centrally, but real chips scatter widely, and the neighbouring zero bins are about as likely as the jackpot.",
    },
    {
      q: "Is Plinko pure luck?",
      a: "Almost entirely. The only choice is the drop position, which shifts the odds a little. After release, the path depends on bounces that nobody can control or predict precisely.",
    },
    {
      q: "What is the difference between a Plinko board and a Galton board?",
      a: "A Galton board is a scientific demonstration with many rows and small balls that form a bell curve. A Plinko board is a game version with fewer rows, larger chips and prize values on the bins.",
    },
    {
      q: "How many rows should a DIY Plinko board have?",
      a: "Eight to twelve rows works well for home builds. More rows give a smoother bell curve but need a taller board and more careful peg spacing.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: List of The Price Is Right pricing games",
      url: "https://en.wikipedia.org/wiki/List_of_The_Price_Is_Right_pricing_games",
    },
    { label: "Wikipedia: Galton board", url: "https://en.wikipedia.org/wiki/Galton_board" },
    {
      label: "Wikipedia: Binomial distribution",
      url: "https://en.wikipedia.org/wiki/Binomial_distribution",
    },
  ],
  related: [
    "plinko-gambling",
    "plinko-odds",
    "carnival-games",
    "claw-machine-tricks",
    "pachinko-odds",
    "casino-party-ideas",
  ],
  updated: "2026-09-27",
};
