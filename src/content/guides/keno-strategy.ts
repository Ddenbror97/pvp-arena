import type { Guide } from "./types";

export const guide: Guide = {
  slug: "keno-strategy",
  cluster: "Games & odds",
  keyword: "keno strategy",
  secondary: ["keno tips", "keno spot count", "keno paytable", "video keno strategy"],
  title: "Keno Strategy: Pick Counts and Paytables",
  description:
    "Keno strategy is choosing spot counts against a paytable. Compare expected value by pick count and learn to spot a bad paytable fast.",
  h1: "Keno Strategy: Pick Counts and Payout Tables Compared",
  answer:
    "Keno strategy, stated honestly, is a choice of spot count n on a fixed paytable, not a hunt for hot numbers. Every n-subset of the same size shares the same hypergeometric catch distribution. The house edge lives in how each catch k is paid versus true odds. Most tickets sit at 20% to 40% keep — lottery territory. The only levers are how many spots you mark, how many tickets you buy, and when you stop. Nothing in a past draw sheet moves tomorrow’s probabilities.",
  facts: [
    "Classic keno draws 20 numbers from 80. You mark 1 to 10 spots (sometimes more); catches are hypergeometric, not 20/80 intuition.",
    "The 1-spot line is the fastest honesty check: pay 3x on a 25% hit is a 25% house edge before you read the jackpot font.",
    "Raising spot count shifts probability mass toward middle catches; jackpots fund themselves with short pays on rows you actually hit.",
    "Video keno speed multiplies the same per-ticket edge; pace is a cost lever, not a math lever.",
    "PVPspinArena does not offer keno; Jackpot, Coinflip and Roulette are the live games.",
  ],
  sections: [
    {
      id: "frame",
      title: "What keno strategy can and cannot choose",
      body: `Keno is a lottery slip with a grid. You pick how many numbers to mark — the spot count n — and the paytable pays for catching k of those n when 20 of 80 are drawn. There is no in-draw skill. Birthdays, diagonals, and “systems” that rotate marks do not change the combination math.

### The honest strategy list

1. **Spot count n.** One spot is a quarter hit rate with a brutal short pay. Ten spots is a jackpot hunt with a fat middle you will live in.
2. **Paytable row.** Read catch-by-catch payouts, not the top prize alone.
3. **Ticket count and stake.** Expected cost scales with tickets times edge times stake.
4. **Stop rules.** A written cap on spend and time before the first mark.

What is not on the list: tracking “hot” and “cold” numbers, copying last draw sheets, or believing a club keno board “owes” a catch because the screen went quiet. Draws are independent unless the operator publishes a broken generator — and even then your fix is to leave, not to outguess it.

The combination tables live on [keno odds](/guides/keno-odds). This page is the decision layer: how to use those fractions without folklore. Adults 18+ only. Cluster reading sits in [games and odds](/guides/topics/games-and-odds).`,
    },
    {
      id: "spots",
      title: "Spot counts: how n reshapes your ticket",
      body: `Spot count is the main variance dial. The draw always pulls 20 of 80. Your n marked spots are a subset; catches k follow the hypergeometric law:

P(k) = C(n,k) × C(80−n, 20−k) / C(80,20)

### One spot versus four versus ten

| n | Event you feel | Approx. chance | Strategy meaning |
| --- | --- | --- | --- |
| 1 | Any hit | 25% | Simple, loud edge if pay is 3x not 4x |
| 4 | Catch 2 | ~21% | You will see this often; paytable must be read here |
| 4 | Catch 4 | ~0.31% | Jackpot line on a small ticket |
| 10 | Catch 5 | ~5.1% | “Normal” life on a big ticket |
| 10 | Catch 10 | ~1 in 8.9 million | Marketing, not a plan |

Raising n does not “improve odds” in the sense of RTP. It moves you from a coin-flip-ish hit rate (1-spot) toward a long middle with a microscopic left tail (10-spot). Operators love selling the tail. Your wallet lives in catch 3, 4, and 5.

There is no universally best n. There is a paytable for each n on the sheet in front of you. A “smart” n on a 35% ticket is still a 35% ticket.

### Quick spot-count habits

- Read the **1-spot** line even if you never play it. It exposes the house temperament in one row.
- If you play **multi-spot**, write the expected catch band (what k happens often) before you mark.
- **Combo tickets** that play many subsets at once multiply turnover. That is not diversification; it is more edge per minute.`,
    },
    {
      id: "paytable",
      title: "How to read one paytable in five minutes",
      body: `Strategy without arithmetic is decoration. Open the sheet for the exact game variant — 80/20 is standard, but paylines differ.

### Step-by-step

1. Choose n you might play. Copy every catch k row and its **total return** (stake included or not — know which).
2. Attach P(k) from the hypergeometric formula or a trusted calculator. [Keno odds](/guides/keno-odds) lists teaching rows.
3. Compute contribution C(k) = P(k) × pay(k) for each paying row. Zero pays stay zero.
4. Sum Σ C(k). That is expected return per dollar staked, i.e. RTP as a decimal.
5. House edge = 1 − Σ C(k). Compare to [house edge](/guides/house-edge) on games you understand.

If the sheet hides probabilities, you can still finish step 3–5 from published catches. If it hides pays for middle catches, you cannot price the ticket. Walk.

### The 1-spot teaching row

True hit rate 20/80 = 25%. Fair total pay is 4x (triple your profit plus stake back). Pay 3x total and EV = 0.25 × 3 = 0.75. That is 25% edge / 75% RTP. Many players never look because the number feels “simple.” Simple is where casinos short-pay hardest.

[RTP explained](/guides/rtp-explained) is the vocabulary page. [Expected value gambling](/guides/expected-value-gambling) turns the sum into dollars: EV = (RTP − 1) × stake per ticket.`,
    },
    {
      id: "myths",
      title: "Hot numbers, patterns and other non-strategies",
      body: `Forum keno strategy is mostly pattern matching on independent draws.

### Myths that do not move edge

- **Hot and cold boards.** Past draws do not change future combinations unless the game is rigged. A quiet board is a sample, not a debt.
- **Never play birthdays (1–31).** Those numbers are not more likely to hit. You might share jackpots more often if you win — that is a split problem, not an edge problem.
- **Always max spots for the jackpot.** The jackpot row is priced into the whole ticket. Middle catches pay for the poster.
- **Quick pick versus manual.** Every n-combination is equally likely to produce k catches. Own numbers and a machine pick are the same bet, which is what [quick pick](/guides/quick-pick-lottery) spells out.

### What looks like strategy but is pace

Video keno at six-second cycles is the same paytable as a live draw every four minutes. The per-ticket edge is identical. The **hourly** expected cost is not. If your “system” is playing more tickets because the UI is fast, you bought more minus-EV slips, not better math.

[Variance in gambling](/guides/variance-in-gambling) explains why a 25% edge ticket can still deliver a small win sometimes. Variance is not edge. A lucky hour does not prove a system.`,
    },
    {
      id: "worked",
      title: "Worked tickets: 1-spot grind versus 10-spot dream",
      body: `Assume $1 tickets and illustrative pays — always recompute on your sheet.

### A — 1-spot at 3x total, 100 tickets

Hit about 25 times, return $3 each → $75 back on $100 wagered. Expected cost $25 (25% edge). Session feel: frequent tiny wins with a steady leak. This is the honest baseline for “simple keno.”

### B — 10-spot, catch-5 pays 5x, catch-10 pays 50,000x

Catch-10 is ~1 in 8.9 million. You will not live there. Catch-5 near 5% means you see fives occasionally; catch-3 and catch-4 happen constantly. If those rows pay 0x or 1x, the whole ticket can sit at 30% edge even with a giant top line.

Turnover example: 200 tickets at $1 with 30% edge → $60 expected cost. Same $200 on a 1% baccarat-style line would be about $2 expected cost. Keno is not “relaxing table game” pricing. It is lottery pricing with a grid costume.

### C — switching n mid-session

Changing from 4-spot to 10-spot after a dry streak does not reset odds. It buys a different variance shape on a new high-edge product. Write n before the session, not after frustration.`,
    },
    {
      id: "limits",
      title: "The only levers that are not folklore",
      body: `Once the paytable is priced, you cannot think your way to positive EV.

### Stake and budget

Keep ticket stake small versus session bankroll. A [gambling budget](/guides/gambling-budget) should cap **expected cost**, not just deposit size. At 30% edge, $50 of tickets expects $15 gone before variance.

### Ticket cap

Decide ticket count before the first mark. Club keno every four minutes makes 15 tickets an hour easy. Video keno makes hundreds possible. The cap is the strategy.

### Game choice elsewhere

If you want countable odds without a lottery paytable, compare with products that publish transparent prices. [Coinflip](/coinflip) is a single 50/50 pot share here, not a 75% RTP slip. [Roulette](/roulette) publishes 33 slots with a uniform colour edge you can derive.

None of that makes keno “beaten.” It gives you a reference for how expensive the grid is.

### When to leave

If you cannot stop at the ticket cap, stop before the first mark. Chasing catches on a 25%+ ticket is how lottery edge becomes a household problem. Use [responsible gambling](/responsible-gambling) tools if play stops feeling optional.`,
    },
    {
      id: "not-here",
      title: "PVPspinArena does not offer keno",
      body: `There is no keno grid on this site. Live games are Jackpot, Coinflip and Roulette — player pots and a counted wheel, not an 80-ball house draw.

Use this keno strategy page when a casino or app hands you a spot picker and a paytable. Price the sheet, pick n for variance you can survive, cap tickets, and ignore hot-number overlays.

For provably fair originals elsewhere, verification confirms the draw; it does not shrink a 30% paytable. See [provably fair games](/guides/provably-fair-games) for the verification stack, and [how it works](/how-it-works) for how this site publishes fairness on Roulette and Coinflip instead.

If you remember one sentence: **spot count chooses variance; the paytable chooses edge; speed chooses how fast you pay.** Everything else is marketing on the glass.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `Keno strategy is paytable math plus stop rules. Spot count n moves you between frequent small hits and rare jackpots, but RTP is still Σ P(k) × pay(k). Most sheets keep 20% or more because middle catches are short-paid while the top line sells hope.

Do not chase hot numbers, rotate “systems,” or raise spot count after a dry spell. Read the 1-spot row, sum your ticket, cap volume, and compare the hourly expected cost to games with thinner edges.

PVPspinArena does not run keno. When you want published pot or wheel odds instead of a lottery slip, use the live products on the [home page](/), [Coinflip](/coinflip), or [Roulette](/roulette). Keno can be entertainment if you priced it first. It is never an income plan.

Before you mark numbers, photograph or export the paytable row for your n. Operators change sheets between video variants and club draws more often than players notice. A strategy note that says “4-spot pays well” without the catch-3 line is incomplete. Catch-3 on a 4-spot ticket happens far more often than catch-4; if catch-3 pays break-even or less, that is where your session lives. Treat the paytable like a loan document: read the fine rows, not the billboard jackpot.

Spot-count advice does not change when the game is [crypto keno](/guides/crypto-keno).`,
    },
  ],
  faqs: [
    {
      q: "Is there a winning keno strategy?",
      a: "No strategy beats a negative paytable. You can choose spot count for variance, read the sheet, cap tickets, and stop. Hot numbers and patterns do not change hypergeometric odds.",
    },
    {
      q: "How many spots should I pick in keno?",
      a: "Pick the spot count whose catch band you can tolerate after you price that row on the paytable. Low spots hit often with a fat edge; high spots chase jackpots with a long dry middle.",
    },
    {
      q: "Why do keno paytables keep 20% or more?",
      a: "Operators short-pay common and rare catches versus true odds. Jackpots are funded by the rows you actually hit, not by generous RTP.",
    },
    {
      q: "Does video keno change the odds?",
      a: "The math is the same if the draw is 20 of 80. Speed changes how many tickets you buy per hour, which multiplies expected cost.",
    },
    {
      q: "Does PVPspinArena have keno?",
      a: "No. PVPspinArena offers Jackpot, Coinflip and Roulette only. Use this guide to price keno elsewhere.",
    },
  ],
  sources: [
    { label: "Wikipedia: Keno", url: "https://en.wikipedia.org/wiki/Keno" },
    { label: "Wizard of Odds: Keno", url: "https://wizardofodds.com/games/keno/" },
  ],
  related: [
    "keno-odds",
    "house-edge",
    "expected-value-gambling",
    "gambling-budget",
    "crypto-keno",
    "quick-pick-lottery",
  ],
  updated: "2026-09-26",
};
