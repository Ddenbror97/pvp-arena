import type { Guide } from "./types";

export const guide: Guide = {
  slug: "hi-lo-strategy",
  cluster: "Games & odds",
  keyword: "hilo strategy",
  secondary: [
    "acey deucey strategy",
    "higher lower strategy",
    "in between card strategy",
    "red dog strategy",
  ],
  title: "Hi-Lo Strategy: Every Correct Call | PvP Spin Arena",
  description:
    "Hi-Lo has a correct call for each card. See the full decision table, how payouts compare to true odds, and how streak risk compounds.",
  h1: "Hi-Lo Strategy: Correct Calls and Cumulative Risk",
  answer:
    "Hilo strategy depends on which hi-lo product you are playing. Acey-Deucey and in-between bets that the next card sits strictly between two up-cards; the spread width sets the true win chance. Casino higher-lower bets above or below one up-card; ties are where the house often hides margin. In both cases the only honest strategy is to take posted pays only when they beat the true odds, pass bad tickets, and refuse progression systems that recycle the same negative edge.",
  facts: [
    "In-between: win chance equals inside ranks divided by remaining cards if draws are uniform.",
    "A one-rank spread has about an 8% win chance on a fresh deck; even money is catastrophic.",
    "Higher-lower on a middle card is near a coin flip; ties that lose add several percent of edge.",
    "Passing tight spreads is often the best hi lo strategy in home games and some casino tables.",
    "PVPspinArena does not offer hi-lo; Jackpot, Coinflip and Roulette are the live games.",
  ],
  sections: [
    {
      id: "pick-game",
      title: "Pick the game before you pick a strategy",
      body: `“Hi lo” names at least two different bets. Strategy advice that ignores the rules is noise.

### Acey-Deucey / in-between

Two cards define endpoints. You bet the third rank is **strictly between** them. Suits usually do not matter. Consecutive ranks (spread zero) have no inside cards; sensible rules force a pass.

### Casino higher-lower

One up-card. You choose higher or lower on the next card. Ace high-only is standard but not universal. **Ties** may lose, push, or trigger a side pay — read the felt text.

Our [hi lo card game](/guides/hi-lo-card-game) guide separates the products and lists sample odds. This page is what you can actually optimise — and what you cannot. It sits with the other pricing notes in [Games and odds](/guides/topics/games-and-odds).

Adults 18+. For generic pricing language see [foundations](/guides/topics/foundations).`,
    },
    {
      id: "spread",
      title: "Spread width sets the price in in-between",
      body: `Assume one 52-card deck, two up-cards removed, third card from 50 remaining, ace high.

Inside rank count s gives win probability s/50.

| Example up-cards | Inside ranks s | Win chance | Fair pay (1/p) | Even-money EV |
| --- | --- | --- | --- | --- |
| 6–7 (consecutive) | 0 | 0% | n/a | Pass |
| 5–6 | 0 | 0% | n/a | Pass |
| 4–8 | 3 | 6/50 = 12% | 8.33x | −76% at 1:1 |
| 5–9 | 3 | 12/50 = 24% | 4.17x | −52% at 1:1 |
| 4–9 | 4 | 16/50 = 32% | 3.125x | −36% at 1:1 |
| 3–king | 11 | 44/50 = 88% | 1.14x | +14% at 1:1 if forced |

Home-game hi lo strategy often defaults to even money on any spread. That makes tight spreads a gift to the bank and wide spreads a steal for the player who may pass everything else. Casino tables post pays by spread or charge a time rake instead.

**Strategy you can use:** pass 0–2 inside ranks unless the pay table explicitly compensates. Take only spreads where quoted pay × p exceeds 1 − your risk tolerance for variance.

### Ace-low variants

Some tables treat ace as low only (A-2-3 … Q-K-A not wrapped). Inside counts change. A spread from ace to 4 has different inside ranks than ace-high between ace and 4. Hi lo strategy that worked on ace-high home rules can be wrong on ace-low felt text. Read one round of help before you stake.

### Multi-deck shoes

If the game draws from a shoe without replacement across hands, p shifts slightly as ranks leave. The spread table above is single-deck teaching math. Shifts are second-order compared to accepting even money on a 12% ticket — fix the big leak first.`,
    },
    {
      id: "higher-lower",
      title: "Higher-lower: middle cards and tie rules",
      body: `With one up-card, picking **higher** or **lower** is not symmetric unless the up-card is central.

Up-card 7 (ace high), one deck minus the seven: 24 ranks beat it, 24 ranks lose, 3 sevens tie.

If ties **push**, P(win) = 24/51 ≈ 47.06% on either side — still short at even money because pushes freeze action.

If ties **lose**, effective win rate stays 24/51 but ties become losses: EV on a $1 even-money win ≈ (24/51)×2 − 1 ≈ −5.9%. That tie rule is the whole [house edge](/guides/house-edge) on an otherwise “fair-looking” button.

Up-card ace high-only: “higher” is nearly hopeless. “Lower” wins on 48/51. A UI that defaults to higher on ace is selling a trap.

### Hi lo strategy on higher-lower

1. Read tie handling first.
2. Avoid forced picks on extreme up-cards unless the pay is adjusted (some apps pay 4x on narrow wins).
3. Do not alternate higher/lower based on streaks; cards are without replacement within the shoe, but past results do not create obligation.

Compare [coin flip odds](/guides/coin-flip-odds) only when ties push and pays are true 2x. Most casino hi-lo is not that clean.

### Pair side bets and colour side bets

Many digital hi-lo apps attach red/black or exact-pair side bets with independent edges above 5%. Hi lo strategy that ignores side bets is fine; hi lo strategy that chases them because “the spread looked lucky” pays two edges in one hand. Decline side bets unless you calculate them separately.

### Recording results

Spreadsheets of last ten outcomes do not change deck composition enough to matter on fresh shoes. On single-deck between rounds with replacement, history is irrelevant. On depleted shoes, only serious counters extract tiny shifts — and they still pass bad spreads.`,
    },
    {
      id: "red-dog",
      title: "Red Dog and spread pays in casinos",
      body: `Red Dog (or similar) packages the in-between idea with a posted pay ladder by spread width and optional raise after you see the spread.

Typical live edges under sensible raise rules sit around 2.5%–3.5% — far better than even money on a 1-rank spread, still negative.

### Raise or fold

Good Red Dog hi lo strategy: fold spread zero, raise only when the posted pay beats the true p from the remaining deck (accounting for cards already seen if the game uses a shoe).

### Counting seen cards

In a single-deck product, every up-card slightly shifts p. Casual players ignore this; counters nudge raises on wide spreads when inside ranks become slightly more dense. The edge shift is small compared to a bad pay table — do not confuse counting with a system that beats a 5% carnival ticket.

Link the dollars to [expected value gambling](/guides/expected-value-gambling): EV = p×pay − 1 per unit staked when lose-all on miss.`,
    },
    {
      id: "systems",
      title: "Progression systems and side bets",
      body: `Hi lo attracts Martingale variants because some spreads feel “almost fair”.

### Doubling after a miss

If each trial is negative EV, scaling stake after loss increases ruin probability without changing the sign of the expectation. Our [martingale strategy](/guides/martingale-strategy) guide works the arithmetic for 50/50; hi-lo trials are usually worse than 50/50 unless you pass aggressively.

### “Always bet the middle spread”

Betting only 6-inside spreads might avoid the worst tickets but still sums negative EV if pays are flat 1:1. You need a pay table, not a superstition.

### Side bets on suits or exact rank

These are independent long-shot taxes. Hi lo strategy that ignores side bets is fine; hi lo strategy that chases them is expensive entertainment.

None of this replaces reading the rules on the felt or in the app info panel.`,
    },
    {
      id: "session",
      title: "Session rules that are not magic",
      body: `Because hi lo rounds resolve quickly, the practical hi lo strategy is table selection and stop rules.

### Table selection

- Prefer games that let you **pass** bad spreads.
- Prefer ties that **push** over ties that **lose** if pays are unchanged.
- Compare posted pays on 3-inside and 4-inside spreads; that is where carnival games bleed.

### Bankroll

Use a fixed unit and a loss cap per session. [Gambling budget](/guides/gambling-budget) applies even when individual bets look small. Twenty “cheap” 1:1 spread bets at 8% win chance burn like one bad roulette afternoon.

### Speed

Electronic hi-lo can deal three cards every few seconds. Edge × wagered is the cost. Slowing down is a real strategy; pattern betting is not.

If you cannot state the tie rule and the pay for a 3-inside spread from memory after reading the rules once, pause before staking.

### Worked session: carnival in-between at even money

One hundred $5 bets on random spreads averaging 3 inside ranks (p ≈ 24%):

- Fair pay ≈ 4.17x; even money pays 2x
- E ≈ 0.24×2 = 0.48 per $5 → expected loss $0.52 per hand
- Hundred hands → expected loss ≈ $52 on $500 wagered

Passing every spread with fewer than six inside ranks might cut volume in half and eliminate the worst tickets — hi lo strategy is often “do not play” rather than “outsmart”.

### Worked session: higher-lower, ties lose, up-card queen

Ace high, remaining ranks: 24 below, 23 above, 3 queens tie.

Pick lower: win 24/50, lose 23/50, tie 3/50 as loss → same structure as 7-up-card with shifted counts. EV at even money: (24/50)×2 − 1 = −4%. Picking higher mirrors with 23 wins. There is no side with edge; choose the lesser-variance side only if pays differ.

### Dealer rake games

Some live rooms take a rake from the pot instead of posting spread pays. Your hi lo strategy then includes comparing rake percent to the average p of the spreads people actually play. A 5% rake on a 48% spread is a very different lease than 5% on a 12% spread.`,
    },
    {
      id: "not-here",
      title: "PVPspinArena does not offer hi-lo",
      body: `No Acey-Deucey table and no higher-lower widget live here. Products with published structures:

- [Coinflip](/coinflip) — two-player 50/50, not a house spread game.
- [Roulette](/roulette) — fixed multipliers on a 33-slot wheel.
- [Jackpot](/) — pot share odds you can see before you join.
- [Responsible gambling](/responsible-gambling) — limits and help links.

Use this hi lo strategy page when a crypto casino adds a “simple” card mini-game beside slots. Use [variance in gambling](/guides/variance-in-gambling) when you need language for why passing boring spreads beats chasing 8:1 tickets on a 12% win chance.

Honest summary: identify the product, compute or read p, compare to pay, pass when p×pay is below 1, and refuse systems that raise stake after losses. That is the entire edge-aware playbook.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `Hi lo strategy starts with rules: in-between versus higher-lower, ace treatment, tie handling. Spread width sets win probability in Acey-Deucey; ties and forced picks set the leak in higher-lower. Take posted pays only when they beat true odds, pass the rest, and cap session loss.

Progressions do not erase negative EV. PVPspinArena does not run hi-lo; for transparent odds on this site, use Coinflip or Roulette. When a friend says “always bet between”, ask for the pay on a 1-rank spread — the answer usually ends the argument. Spread betting rewards patience: the strongest hi lo strategy on carnival tickets is often folding more hands than your ego prefers. One extra sentence of discipline beats any progression spreadsheet on negative tickets.

Electronic versions sometimes bundle hi-lo beside [wheel of fortune casino game](/guides/wheel-of-fortune-casino-game) style wheels. Treat each mini-game as its own paytable; mixing progressions across products doubles leak speed without adding edge.`,
    },
  ],
  faqs: [
    {
      q: "What is the best hi lo strategy?",
      a: "Pass spreads where quoted pay times win probability is below 1. Read tie rules on higher-lower. Avoid progressions. There is no betting pattern that makes a negative-EV ticket positive.",
    },
    {
      q: "Should I always bet on wide spreads?",
      a: "Wide spreads win more often but pays are usually cut. Only bet when the posted pay beats the fair inverse of win chance, or when even money is actually offered on an 88% ticket you may pass otherwise.",
    },
    {
      q: "Do ties matter in hi lo?",
      a: "Yes. Ties that lose on higher-lower add several percent of house edge. Ties that push reduce how often you win outright but are usually kinder than ties that lose at even money.",
    },
    {
      q: "Is Acey-Deucey the same as casino hi-lo?",
      a: "No. Acey-Deucey is a between-two-cards bet. Casino hi-lo is usually higher or lower versus one up-card. Strategy differs completely.",
    },
    {
      q: "Does PVPspinArena have hi lo?",
      a: "No. Live games are Jackpot, Coinflip and Roulette. This guide explains hi lo strategy for tables on other sites.",
    },
  ],
  sources: [
    { label: "Wizard of Odds: Red Dog", url: "https://wizardofodds.com/games/red-dog/" },
    { label: "Wikipedia: Expected value", url: "https://en.wikipedia.org/wiki/Expected_value" },
  ],
  related: ["hi-lo-card-game", "house-edge", "expected-value-gambling", "gambling-budget"],
  updated: "2026-09-26",
};
