import type { Guide } from "./types";

export const guide: Guide = {
  slug: "poker-math",
  cluster: "Poker",
  keyword: "poker math",
  secondary: [
    "poker combinatorics",
    "poker equity",
    "rule of 2 and 4",
    "icm poker",
    "poker probability",
  ],
  title: "Poker Math: Combos, Equity, EV and the Rule of 2 and 4",
  description:
    "Poker math explained with worked numbers: hand combos, card removal, equity, EV of calls and bluffs, the rule of 2 and 4, and ICM basics for tournaments.",
  h1: "Poker math: combinatorics, equity, EV and ICM with worked examples",
  answer:
    "Poker math is the arithmetic behind every decision: counting how many hand combinations an opponent can hold, estimating your equity (share of the pot you win on average), and comparing the expected value of calling, betting or folding. Shortcuts like the rule of 2 and 4 turn outs into rough percentages, and ICM converts tournament chips into prize money.",
  facts: [
    "There are 1,326 two-card starting hands in Hold'em, grouped into 169 strategically distinct types.",
    "A pocket pair has 6 combos, a suited hand 4 and an offsuit hand 12.",
    "A pocket pair flops a set or better about 11.8% of the time, roughly 1 in 8.5.",
    "The rule of 4 says 9 outs on the flop is about 36%; the exact figure is 35.0%.",
    "Under ICM, a tournament chip is worth less the more of them you hold.",
  ],
  sections: [
    {
      id: "combos",
      title: "Combinatorics: counting hands instead of guessing",
      body: `Every poker read eventually becomes a count. When you say an opponent "has a big pair", the useful question is how many specific two-card combinations fit that description, and how many of them are still possible given the cards you can see.

### The base numbers

A 52-card deck gives C(52,2) = 52 × 51 / 2 = 1,326 possible starting hands. They collapse into 169 types: 13 pocket pairs, 78 suited non-pairs and 78 offsuit non-pairs.

| Hand type | Combos | Probability of being dealt |
| --- | --- | --- |
| A specific pair (e.g. AA) | 6 | 6/1,326 ≈ 0.45% (1 in 221) |
| Any pocket pair | 78 | ≈ 5.88% (1 in 17) |
| A specific suited hand (e.g. AKs) | 4 | ≈ 0.30% |
| A specific offsuit hand (e.g. AKo) | 12 | ≈ 0.90% |
| AK, suited or not | 16 | ≈ 1.21% |

A pair has 6 combos because four aces can be paired in C(4,2) = 6 ways. A non-pair like AK has 4 × 4 = 16 ways, of which 4 share a suit.

### Card removal

Visible cards delete combos. On an A-7-2 flop, only three aces remain, so an opponent's AA drops from 6 combos to C(3,2) = 3. If you also hold an ace, it drops to 1. Sets of sevens or deuces are 3 combos each. AK falls from 16 combos to 3 × 4 = 12 once one ace is on board, and to 2 × 4 = 8 if you hold another.

This is how strong players compare "value" against "bluffs". If a river raise represents a set (say 6 combos total across two ranks) and the missed flush draws that could bluff number 12, the raiser's range is two-thirds bluffs by count before you weight for how often each actually raises. Counting does not make the read; it tells you how much the read has to carry. For the wider picture of ranges and balance, see [GTO poker strategy](/guides/gto-poker-strategy), and for the hand order itself, [poker hand rankings](/guides/poker-hand-rankings).`,
    },
    {
      id: "outs",
      title: "Outs, draws and the rule of 2 and 4",
      body: `An out is an unseen card that improves you to the hand you expect to win with. After the flop you have seen 5 cards (your two plus three on board), so 47 remain unseen from your point of view. After the turn, 46 remain.

### Exact odds for common draws

The exact chance of hitting by the river from the flop is 1 − (misses/47) × (misses − 1)/46.

| Draw | Outs | Turn only | Flop to river (exact) | Rule of 4 |
| --- | --- | --- | --- | --- |
| Gutshot straight | 4 | 8.5% | 16.5% | 16% |
| Two overcards | 6 | 12.8% | 24.1% | 24% |
| Open-ended straight | 8 | 17.0% | 31.5% | 32% |
| Flush draw | 9 | 19.1% | 35.0% | 36% |
| Flush + gutshot | 12 | 25.5% | 45.0% | 48% |
| Flush + open-ender | 15 | 31.9% | 54.1% | 60% |

Worked flush draw: 38 non-hearts remain of 47. Missing twice is (38/47) × (37/46) = 1,406/2,162 ≈ 65.0%, so you hit about 35.0%.

### The shortcut and its correction

The rule of 2 and 4 says: multiply outs by 4 on the flop when you will see both cards, and by 2 when only one card is to come. It is excellent up to about 8 outs and overstates big draws. A common fix for more than 8 outs is to subtract (outs − 8) from the ×4 figure: 15 outs becomes 60 − 7 = 53%, close to the true 54.1%.

Two warnings. First, "rule of 4" assumes you get to see the river for free or at a known price; if a big turn bet is coming, use the one-card ×2 number. Second, outs are only real if they win. A flush out that also pairs the board may complete an opponent's full house, so discount "dirty" outs rather than counting them at face value.`,
    },
    {
      id: "equity",
      title: "Equity: your share of the pot",
      body: `Equity is the fraction of the pot you would win on average if all remaining cards were dealt with no more betting. It is the bridge between counting and money.

### Preflop matchups

These all-in equities are approximate and vary slightly by exact suits:

| Matchup | Approximate equity |
| --- | --- |
| AA vs KK | about 82% / 18% |
| Pair vs two overcards (e.g. QQ vs AKo) | about 57% / 43% |
| Small pair vs two overcards (22 vs AKo) | about 52% / 48% |
| Dominated hand (AK vs AQ) | about 74% / 26% |
| Two overcards vs two undercards (AKo vs 76s) | about 60% / 40% |

The "coin flip" nickname for a pair against two overcards is loose: it ranges from roughly 52/48 to 57/43. Domination (sharing a card with a better kicker) is far worse than being "behind" in a flip.

### Equity against a range

Opponents hold ranges, not hands. If a player shoves with {QQ+, AK}, that is 18 pair combos (QQ, KK, AA) plus 16 AK combos, 34 total. Holding JJ, you are roughly 18% against each overpair and about 55% against AK. Weighted: (18 × 0.18 + 16 × 0.55) / 34 ≈ (3.24 + 8.80) / 34 ≈ 35%. You are not flipping; you are a clear underdog, and that number goes straight into the call decision in the next section.

Equity is not the same as "how often you win the hand", because betting lets players fold equity away. A hand with 30% equity that folds to every river bet realises far less than 30% of the pot. Poker solvers call the difference equity realisation; for a human, the practical takeaway is that position and playability let you realise more of what the raw number promises.`,
    },
    {
      id: "ev",
      title: "Expected value of calls, bets and bluffs",
      body: `Expected value (EV) is probability-weighted profit: EV = Σ(probability × result). Every poker decision is a choice between EVs, and folding is the zero line. The broader definition lives in [expected value in gambling](/guides/expected-value-gambling); here is how it shows up at the table.

### EV of a call

The pot is $100 and a player bets $50. Calling costs $50 to win $150. With 35% equity and no further betting:

EV(call) = 0.35 × $150 − 0.65 × $50 = $52.50 − $32.50 = +$20.

Break-even equity is $50 / ($150 + $50) = 25%. That ratio is the pot-odds formula, and the details, including implied odds, are on the [pot odds guide](/guides/poker-pot-odds).

### EV of a bluff

A pure bluff wins the pot when the opponent folds and loses the bet when called. Betting B into pot P, the break-even fold frequency is B / (P + B).

| Bet size | Needs folds at least |
| --- | --- |
| Half pot | 33.3% |
| Two-thirds pot | 40% |
| Pot | 50% |
| Twice pot | 66.7% |

Worked: $75 into $100. If the opponent folds 45% of the time, EV = 0.45 × $100 − 0.55 × $75 = $45 − $41.25 = +$3.75. At 40% folds it is $40 − $45 = −$5.

### Semi-bluffs combine both

A flush draw that bets gets two ways to win: immediate folds, plus equity when called. With 35% equity and a 30% fold rate, a pot-sized bet can be profitable even though neither source alone is enough. This is why good players bet draws that have both fold equity and outs, and check draws that have neither.

The mirror image is minimum defence frequency, P / (P + B): facing a pot-size bet, a defender who folds more than 50% lets any two cards bluff profitably.`,
    },
    {
      id: "icm",
      title: "ICM basics: when chips are not money",
      body: `In a cash game, a $1 chip is worth $1. In a tournament, chips convert to prizes only through finishing position, and the conversion is not linear. The Independent Chip Model (ICM), usually computed with the Malmuth–Harville method, estimates each player's share of the remaining prize pool from stack sizes.

### A worked three-handed example

Prizes: $500, $300, $200. Stacks: A 5,000, B 3,000, C 2,000 (10,000 total).

The model says your chance to finish first equals your chip share. Chances for second come from removing each possible winner and rescaling.

- P(A 1st) = 0.50. P(A 2nd) = 0.30 × 5/7 + 0.20 × 5/8 ≈ 0.339. P(A 3rd) ≈ 0.161.
- A's equity = 500 × 0.50 + 300 × 0.339 + 200 × 0.161 ≈ $383.9.
- B's equity works out to $327.5 and C's to about $288.6. The three add to $1,000.

| Player | Chip share | ICM prize share |
| --- | --- | --- |
| A | 50% | 38.4% |
| B | 30% | 32.8% |
| C | 20% | 28.9% |

### What that changes

The chip leader holds half the chips but under 39% of the money. Doubling up adds less money than busting costs, so all-in calls near the money need more equity than chip-EV maths suggests. A call that is +EV in chips at 52% equity can be −EV in dollars. Short stacks gain leverage because the big stacks risk more real value when they call them.

ICM has known limits: it ignores skill, position and future blinds. It is a baseline for final tables and satellites, where the gap between chips and prize value is widest, not a complete strategy.`,
    },
    {
      id: "variance",
      title: "Variance, sample size and the maths of a win rate",
      body: `Correct decisions only pay over volume. Poker win rates are small relative to their swings, which is why short-term results say little about skill.

A winning cash-game player might earn 5 big blinds per 100 hands with a standard deviation around 80–100 bb/100 (typical ranges for no-limit Hold'em; the exact figure depends on style and format). Over 10,000 hands, expected profit is 500 bb, but one standard deviation is about 100 × √100 = 1,000 bb. A long-term winner can easily be down after 10,000 hands. Over 100,000 hands, expectation is 5,000 bb against a standard deviation of about 3,160 bb, and the picture finally starts to separate skill from luck.

### Practical rules that follow

- Judge decisions by EV at the time, not by whether the river helped.
- Bankroll in buy-ins, because swings are measured in buy-ins. See [poker bankroll management](/guides/poker-bankroll-management).
- Rake is a fixed drag on every pot. A 5 bb/100 winner paying 6 bb/100 in rake is a loser; [how to win at poker](/guides/how-to-win-at-poker) covers rake in depth.

The same ideas sit under every game in the [poker topic hub](/guides/topics/poker): counting, equity and EV explain why good play wins slowly and bad luck feels loud. [Variance in gambling](/guides/variance-in-gambling) covers the statistics more generally.`,
    },
    {
      id: "pvp",
      title: "The same arithmetic on a hashed PvP round",
      body: `PVPspinArena is a player-vs-player crypto casino with three games, played in USDC or ETH on the Base network and open to adults 18+ only. There is no poker on the site, but the maths in this guide applies directly.

- **Equity:** in [Jackpot](/), your win chance equals your share of the pot. Put in $30 of a $120 pot and your equity is 25%, just like a range calculation, except the number is exact rather than estimated.
- **EV:** [Coinflip](/coinflip) is a 50/50 between two players; the winner takes the pot minus any fee shown before entry, so EV before that fee is zero.
- **Edge:** on [Roulette](/roulette), 16 Purple and 16 Silver slots pay 2x and 1 Green pays 14x on a 33-slot wheel. Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Purple is (16/33) × 2 = 0.970 per unit staked before the win fee.

The difference from poker is that there is no decision that moves the probability: no fold equity, no outs to count, no ICM. Every round comes from committed seeds that you can check on the [fairness page](/fairness) after settlement. If a session stops being entertainment, the [responsible gambling](/responsible-gambling) page has limits and help links.`,
    },
  ],
  faqs: [
    {
      q: "What is the rule of 2 and 4 in poker?",
      a: "Multiply your outs by 4 on the flop to estimate your chance of hitting by the river, or by 2 for one card. It is close for up to about 8 outs and overstates bigger draws, so subtract (outs − 8) above that.",
    },
    {
      q: "How many starting hands are there in Texas Hold'em?",
      a: "There are 1,326 two-card combinations, which group into 169 types: 13 pairs, 78 suited hands and 78 offsuit hands. Pairs have 6 combos each, suited hands 4 and offsuit hands 12.",
    },
    {
      q: "What is equity in poker?",
      a: "Equity is your share of the pot if the hand were run out with no more betting. JJ against a shove range of QQ+ and AK has roughly 35% equity.",
    },
    {
      q: "Do you need to be good at maths to play poker?",
      a: "You need a handful of numbers, not advanced maths: combo counts, outs, break-even percentages and bluff frequencies. Most players memorise the common ones and practise estimating the rest.",
    },
    {
      q: "What is ICM in poker tournaments?",
      a: "The Independent Chip Model converts stack sizes into a share of the prize pool. It shows that chips lose value as you accumulate them, so risky calls near the money need more equity.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Poker probability",
      url: "https://en.wikipedia.org/wiki/Poker_probability",
    },
    {
      label: "Wikipedia: Independent Chip Model",
      url: "https://en.wikipedia.org/wiki/Independent_Chip_Model",
    },
    {
      label: "Wizard of Odds: Texas Hold'em",
      url: "https://wizardofodds.com/games/texas-hold-em/",
    },
  ],
  related: [
    "poker-pot-odds",
    "gto-poker-strategy",
    "texas-holdem-strategy",
    "how-to-win-at-poker",
    "expected-value-gambling",
    "poker-bankroll-management",
  ],
  updated: "2026-09-27",
};
