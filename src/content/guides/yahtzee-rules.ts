import type { Guide } from "./types";

export const guide: Guide = {
  slug: "yahtzee-rules",
  cluster: "Games of chance",
  keyword: "yahtzee rules",
  secondary: [
    "how to play yahtzee",
    "yahtzee scorecard",
    "yahtzee odds",
    "yahtzee bonus rules",
    "yahtzee probability",
  ],
  title: "Yahtzee Rules: Scorecard, Bonuses and Real Odds",
  description:
    "Yahtzee rules explained: 13 rounds, three rolls, every scorecard box, the 35-point and Yahtzee bonuses, Joker rules and the real odds behind each category.",
  h1: "Yahtzee rules: the scorecard, the bonuses and the odds",
  answer:
    "Yahtzee rules in one breath: each turn you roll five dice up to three times, keeping any dice you like between rolls, then write a score in one of 13 boxes. Each box is used once, so a game lasts 13 turns. Reach 63 in the upper section for a 35-point bonus. Five of a kind is a Yahtzee worth 50, and extra Yahtzees earn 100 each.",
  facts: [
    "A game is 13 turns; every turn fills exactly one of the 13 scorecard boxes, even if it scores zero.",
    "Upper bonus: 35 points when Aces through Sixes total 63 or more (three of each face).",
    "Chance of a Yahtzee on a single roll of five dice is 6/7,776, about 1 in 1,296.",
    "Chasing a Yahtzee with all three rolls succeeds about 4.6% of the time.",
    "Published computer analysis puts the optimal average score at about 254.6 points per game.",
  ],
  sections: [
    {
      id: "turn",
      title: "How a Yahtzee turn works",
      body: `Yahtzee uses five standard dice, a cup and a score pad. It was launched in 1956 by the toy maker E. S. Lowe. The usual origin story is that Lowe bought the idea from a Canadian couple who played a "yacht game" on their boat. That story is well known but hard to check. The game later passed to Milton Bradley and is now sold by Hasbro.

On your turn:

1. Roll all five dice.
2. Keep any dice you like and reroll the rest. You can change your mind each time, and a die you kept after the first roll can be rerolled on the second.
3. After at most three rolls, you must write a score in one empty box on your card.

If the dice don't fit any box you still need, you **scratch**, which means writing a zero in a box you choose. Scratching is not failure. It's a decision about which zero hurts least. After 13 turns every box is full, and the highest total wins.

### A worked first turn

You roll 6, 6, 4, 2, 1. Keep both 6s and reroll the rest: 6, 3, 5. You now have three 6s. Reroll the 3 and 5: 6 and 2. Four 6s, 24 points. Early in the game that almost always belongs in Sixes, not in Four of a kind or Chance. Four 6s put you 6 above the 18-point par for that box, which later lets you survive a weak Aces or Twos result and still chase the 35-point upper bonus.

A different first roll, 1, 2, 3, 5, 6, is an inside four-run plus extras. Keep 2, 3, 5, 6 (open-ended) rather than 1, 2, 3, 5 (needs a 4 only). After two more rolls you finish a large straight about 56% of the time from the open end, versus about 31% if you keep the inside gap. Same “almost a straight” look; very different finish rates.

Yahtzee sits alongside [Farkle](/guides/farkle-rules) in the [games of chance hub](/guides/topics/games-of-chance). Both are push-your-luck dice games. Farkle asks when to stop rolling. Yahtzee asks what to aim for, and where to put the result.`,
    },
    {
      id: "scorecard",
      title: "The Yahtzee scorecard, box by box",
      body: `### Upper section

| Box | Scores | Par (three of the face) |
| --- | --- | --- |
| Aces | Total of 1s | 3 |
| Twos | Total of 2s | 6 |
| Threes | Total of 3s | 9 |
| Fours | Total of 4s | 12 |
| Fives | Total of 5s | 15 |
| Sixes | Total of 6s | 18 |
| **Bonus** | 35 if upper total ≥ 63 | 63 in total |

The 63 threshold equals three of every face. Four 6s (24) put you 6 above par, which pays for a weak Aces box later. Two 5s (10) leave you 5 short.

### Lower section

| Box | Requirement | Scores |
| --- | --- | --- |
| Three of a kind | At least three matching | Sum of all five dice |
| Four of a kind | At least four matching | Sum of all five dice |
| Full house | Three of one face + two of another | 25 |
| Small straight | Four in a row (1–4, 2–5 or 3–6) | 30 |
| Large straight | Five in a row (1–5 or 2–6) | 40 |
| Yahtzee | Five of a kind | 50 |
| Chance | Anything | Sum of all five dice |

### Yahtzee bonus and Joker rules

If you've already scored 50 in the Yahtzee box, each later Yahtzee earns a **100-point bonus**. It is also played as a **Joker**:

- If the matching upper box is empty, you must score it there. For example, five 4s go in Fours.
- If that upper box is full, you may use any open lower box. Full house, small straight and large straight then score their full 25, 30 or 40.
- If every lower box is full too, you must write a zero in an open upper box.

If you scratched the Yahtzee box earlier with a zero, later Yahtzees get no 100 bonus, but the Joker placement rules still apply. The theoretical maximum score is 1,575, which needs a Yahtzee on all 13 turns.

### Joker placement, two concrete cards

| Already filled | You roll five 3s | Where it must go | What you score |
| --- | --- | --- | --- |
| Yahtzee box has 50; Threes empty | Five 3s | Threes | 15 in the upper section, plus a 100 bonus |
| Yahtzee box has 50; Threes full; Full house empty | Five 3s | Full house (Joker) | 25, plus a 100 bonus |
| Yahtzee box has 0 (scratched); Threes empty | Five 3s | Threes | 15, and no 100 bonus |
| Everything lower full; only Aces open | Five 3s | Aces, as a forced zero | 0 |

The third row is why scratching Yahtzee early is expensive. You still have to follow Joker placement, but you lose the 100-point extras for the rest of the game.`,
    },
    {
      id: "odds",
      title: "Yahtzee probabilities on a single roll",
      body: `There are 6⁵ = 7,776 equally likely results for five dice. Counting how many fit each box gives the chance of hitting it on the very first roll:

| Category | Outcomes | Probability | Roughly |
| --- | --- | --- | --- |
| Yahtzee | 6 | 0.08% | 1 in 1,296 |
| Four of a kind or better | 156 | 2.01% | 1 in 50 |
| Full house | 300 | 3.86% | 1 in 26 |
| Large straight | 240 | 3.09% | 1 in 32 |
| Small straight (or better) | 1,200 | 15.43% | 1 in 6.5 |
| Three of a kind or better | 1,656 | 21.30% | 1 in 4.7 |

### How the counts work

- **Yahtzee:** six faces, one arrangement each, so 6 outcomes.
- **Full house:** 6 choices for the triple × 5 for the pair × 10 ways to place the pair among five dice = 300.
- **Large straight:** two runs (1–5 and 2–6) × 5! = 120 orderings each = 240.
- **Four of a kind or better:** exactly four is 6 × 5 × 5 = 150, plus 6 Yahtzees, for 156.

That's just one roll. What matters in play is the chance after you keep dice and use your remaining rolls.`,
    },
    {
      id: "rerolls",
      title: "Odds with rerolls: what to keep",
      body: `Most Yahtzee decisions come down to one question: given what you've kept, how likely are your two remaining rolls to finish it?

| You have kept | You need | Chance with 2 rolls left |
| --- | --- | --- |
| Open-ended four-run (2–3–4–5) | A 1 or a 6 | 1 − (4/6)² = 55.6% |
| Inside four-run (1–2–3–5) | A 4 | 1 − (5/6)² = 30.6% |
| Two pair | Either paired face | 1 − (4/6)² = 55.6% |
| Three of a kind | A fourth (for 4-of-a-kind) | 1 − (25/36)² = 51.8% |
| Three of a kind | Two more (Yahtzee) | 121/1,296 = 9.3% |
| Four of a kind | The fifth (Yahtzee) | 1 − (5/6)² = 30.6% |

The Yahtzee line from three of a kind works like this. Rolling the other two dice gives both matches with probability 1/36 and exactly one with probability 10/36. If you get exactly one, the last die has a 1/6 chance on the final roll. If you get none (25/36), you need both on the final roll (1/36). Total: 1/36 + (10/36)(1/6) + (25/36)(1/36) = 121/1,296.

If you chase a Yahtzee from scratch, keeping your most common face and switching when a bigger group appears, you finish about 4.6% of the time. That's roughly one Yahtzee turn in 22 when you go all in.

### Strategy that follows from the numbers

- **Protect the upper bonus.** 35 points is worth more than a full house. Early on, three or four 5s or 6s are usually best scored in the upper section.
- **Keep open-ended runs, not inside ones.** An open-ended four-run finishes the large straight almost twice as often as an inside one.
- **Use Chance late.** It soaks up a bad turn. Spending it on 18 in round three wastes insurance.
- **Scratch low.** If you have to write a zero, Aces (par 3) or Yahtzee late in the game usually cost least.
- **Know the ceiling.** Computer-solved optimal play averages about 254.6 points, according to published analyses such as Tom Verhoeff's. Scores around 200 to 250 are normal, and a 300 needs luck.

### What a “keep” is worth in points

Think in expected score, not in hope. You have three 6s and two junk after roll two, and both Sixes and Three of a kind are open. Rolling the two junk dice once:

- About 11/36 of the time you pick up a fourth or fifth 6 (four- or five-of-a-kind on 6s).
- The rest of the time you keep 18 in Sixes, or you can dump the total into Three of a kind if Sixes is already safe.

Early, 18–24 in Sixes plus the shot at the 35-point bonus usually beats parking 18 in Three of a kind and leaving Sixes empty. Late, if the upper bonus is already won or already dead, Three of a kind (sum of all five) can be the higher immediate score, especially if the two junk dice are 5s. The same dice, two different games.`,
    },
    {
      id: "variants",
      title: "Variants and playing for stakes",
      body: `Common variations include:

- **Triple Yahtzee:** three score columns filled in parallel, with the second and third columns worth two and three times their points.
- **Forced order:** boxes must be filled top to bottom, which removes most of the decisions.
- **Solitaire high-score play:** the same rules played alone, just to beat your own best.
- **Official Joker vs free choice:** some families let a bonus Yahtzee go in any box. Agree on this first.

Yahtzee is sometimes played for small stakes, such as a fixed amount per game or per 10 points of margin. Where money changes hands, it's for adults only (18+, or your local legal age). Keep the stakes small, since luck decides most single games. Good players lead over a long series, but one game can go to anybody.

### A worked money game

Four adults play a 13-turn game for $1 per 10 points of margin against last place. Alice 268, Ben 241, Cara 220, Dan 198. Dan pays Alice $7, Ben $4 and Cara $2. The sheet is the whole argument; there is no side pot for a first-roll Yahtzee unless you wrote that rule before the first roll. If you add a $5 bonus for any Yahtzee, write it. Unwritten side bets are how kitchen-table games turn into fights.

### Chance a 13-turn game contains a Yahtzee

About 4.6% of turns produce a Yahtzee with competent keeping. Over 13 turns the chance of at least one is 1 − (1 − 0.046)^13 ≈ 46%. Two Yahtzees in one game is about 12%. That is why a $5 Yahtzee bounty feels common and still is not a strategy. You are pricing a coin that lands roughly every other game, not a skill edge.`,
    },
    {
      id: "pvp",
      title: "Yahtzee odds and a hashed PvP round",
      body: `Yahtzee teaches the counting skill that every dice bet rests on. List the outcomes, count the ones you want, then divide. It is the same method behind [dice roll probability](/guides/dice-roll-probability) and [poker dice](/guides/poker-dice). It is also the core of [expected value](/guides/expected-value-gambling). There, you multiply each outcome by its payout and add them up.

PVPspinArena applies that arithmetic to three player-vs-player games in USDC or ETH on Base. A [Coinflip](/coinflip) is an even 50/50 between two players. On Roulette's 33-slot wheel, Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. In Jackpot, your chance to win equals your share of the pot. Results come from committed seeds, and anyone can recheck a settled round on the [fairness page](/fairness).

Yahtzee's lesson on long runs applies too. Short sessions are noisy, and averages only show up over many games. Play is 18+, and limits live on the [responsible gambling](/responsible-gambling) page.

See also [tenzi](/guides/tenzi-rules).`,
    },
  ],
  faqs: [
    {
      q: "How many rolls do you get in Yahtzee?",
      a: "Up to three per turn. You can keep any dice after the first and second roll and reroll the others, then you must score one box.",
    },
    {
      q: "What are the odds of rolling a Yahtzee?",
      a: "1 in 1,296 on a single roll of five dice. Using all three rolls and keeping your most common face, it is about 4.6%, or roughly 1 turn in 22.",
    },
    {
      q: "How does the Yahtzee bonus work?",
      a: "If your Yahtzee box already holds 50, every extra Yahtzee earns 100 bonus points and is placed using the Joker rules: matching upper box first, then any lower box at full value.",
    },
    {
      q: "What is the upper section bonus in Yahtzee?",
      a: "35 points if Aces through Sixes add up to 63 or more. That target is exactly three of each face.",
    },
    {
      q: "Can you score zero in Yahtzee?",
      a: "Yes. If nothing fits, you must put a zero in any open box. Picking the least valuable box for that zero is a key skill.",
    },
  ],
  sources: [
    { label: "Wikipedia: Yahtzee", url: "https://en.wikipedia.org/wiki/Yahtzee" },
    { label: "Wikipedia: Dice", url: "https://en.wikipedia.org/wiki/Dice" },
    { label: "Encyclopaedia Britannica: dice", url: "https://www.britannica.com/topic/dice" },
  ],
  related: [
    "farkle-rules",
    "poker-dice",
    "shut-the-box",
    "liars-dice",
    "dice-roll-probability",
    "expected-value-gambling",
    "tenzi-rules",
  ],
  updated: "2026-09-27",
};
