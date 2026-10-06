import type { Guide } from "./types";

export const guide: Guide = {
  slug: "liars-dice",
  cluster: "Games of chance",
  keyword: "liars dice",
  secondary: [
    "liar's dice rules",
    "how to play liars dice",
    "perudo rules",
    "liars dice odds",
    "dudo dice game",
  ],
  title: "Liars Dice: Rules, Bidding and the Odds of a Bid",
  description:
    "Liars dice rules explained: cups, bids, calling liar, wild ones and spot-on calls, plus binomial odds tables that show when a bid is likely to be true.",
  h1: "Liars dice: rules, bidding and how likely a bid is",
  answer:
    'Liars dice is a bluffing game. Every player rolls five dice under a cup, looks at their own dice, then players take turns raising a bid such as "seven 4s", meaning at least seven dice on the whole table show a 4. Instead of raising, the next player can call "liar". All cups lift, the loser gives up a die, and the last player holding dice wins.',
  facts: [
    "Each player normally starts with five dice and a cup; losing a challenge costs one die.",
    "A bid claims a minimum count of one face across every die on the table, not just the bidder's.",
    "Without wilds, each unseen die matches a named face with probability 1/6; with ones wild, it is 1/3.",
    "A useful benchmark: expected matches among unseen dice = unseen ÷ 6 (or ÷ 3 with wild ones).",
    "The bluffing game Bluff (Call My Bluff), a liars dice design by Richard Borg, won the 1993 Spiel des Jahres.",
  ],
  sections: [
    {
      id: "rules",
      title: "Liars dice rules step by step",
      body: `The version most people know is the "single hand" game, also sold as Perudo and known in South America as Dudo. The game is commonly traced to South America and said to have reached Europe through Spanish contact, though the early history is thin on hard evidence. The rules below are the widely played core.

### Setup

Each player gets five six-sided dice and an opaque cup. Everyone shakes their cup, slams it down, and peeks at their own dice without showing anyone.

### Bidding

1. The starting player makes a bid of a **quantity** and a **face**, such as "four 3s". That means at least four dice under all the cups combined show a 3.
2. Play moves clockwise. Each player must either **raise** or **challenge**.
3. A raise must increase the quantity, or keep the quantity and name a higher face. "Four 3s" can go to "four 5s" or "five 2s", but not to "three 6s".
4. A challenge ("liar", or "dudo" in Perudo) ends the bidding. Every cup lifts and the dice are counted.

### Resolving a challenge

- If the count is at least the bid, the bidder was telling the truth. The **challenger** loses one die.
- If the count is short, the bidder was lying (or unlucky). The **bidder** loses one die.

The loser usually starts the next round. When a player loses their last die, they're out. The last player with any dice wins.

### A sample bidding round (ones wild)

Three players, five dice each. You hold 5, 5, 5, 2, 1, so you count four toward 5s (three 5s plus the wild ace).

1. Left of you opens “three 2s”. That is below the wild-ones expected table count (about 3.33 hidden plus whatever they hold), so it is a probe, not a claim.
2. You raise to “six 5s”. You already have four, so you need two hidden matches from ten dice. That is well above 80% with wilds, a strong bid.
3. Right of you jumps to “eight 5s”. They may have two or three 5s, or they may be pushing you. Eight needs four hidden matches from your point of view if you treat your four as locked, which the ten-dice table prices around 44%.
4. You call liar. The live bid is eight 5s, not your earlier six. Cups lift: seven 5s counting wilds. Seven is short of eight, so the bidder loses a die.

If you had challenged the six instead, you would have been wrong. The skill is naming the threshold, not “feeling” that someone is lying.

Liars dice sits in the [games of chance hub](/guides/topics/games-of-chance). The dice are pure luck, but the bidding is a real skill, which makes it a cousin of [poker](/guides/gto-poker-strategy) more than of [Yahtzee](/guides/yahtzee-rules).`,
    },
    {
      id: "wilds",
      title: "Wild ones, spot-on calls and common variants",
      body: `Tables differ most on three rules. Agree on them before you shake.

### Ones as wild

In Perudo and many house games, 1s (called "aces") count as every face. If you bid "six 4s", every 4 and every 1 on the table counts. Two follow-on rules usually come with this:

- **Bidding aces:** because 1s aren't boosted by wilds, a bid on aces can halve the quantity, rounding up. "Eight 4s" can be followed by "four aces".
- **Leaving aces:** to switch back from aces to a normal face, you must bid at least double the ace quantity plus one. After "four aces", the next normal bid must be at least "nine" of something.

### Spot on (calza)

Instead of raising or challenging, a player can claim the last bid is **exactly** right. If the count matches exactly, they win back a lost die (up to the starting five). If not, they lose one. Exact hits are rare, so this is a high-risk call.

### Palifico and other extras

Perudo adds a special round when a player drops to one die. In that round wilds are off, and the face can't be changed. Some groups also allow "bidding on your own dice" reveals, or play the **common hand** version: one shared set of five poker dice passes between two players, with poker-style hand calls. That version is closer to [poker dice](/guides/poker-dice).`,
    },
    {
      id: "probability",
      title: "The probability that a bid is true",
      body: `Every die you can't see is an independent roll. With no wilds, the chance that it shows a named face is 1/6. With ones wild, the chance it shows the face or a 1 is 2/6 = 1/3. That's all you need: the number of matches among hidden dice follows a **binomial distribution**.

For n hidden dice and match chance p, the probability of exactly k matches is C(n, k) × pᵏ × (1 − p)ⁿ⁻ᵏ. A bid is true when your own matching dice plus the hidden matches reach the bid.

### Ten hidden dice (you plus two opponents with five each)

| At least this many hidden matches | No wilds (p = 1/6) | Ones wild (p = 1/3) |
| --- | --- | --- |
| 1 | 83.8% | 98.3% |
| 2 | 51.5% | 89.6% |
| 3 | 22.5% | 70.1% |
| 4 | 7.0% | 44.1% |
| 5 | 1.6% | 21.3% |
| 6 | 0.2% | 7.7% |
| 7 | under 0.1% | 2.0% |

### A worked bid

You hold 4, 4, 1, 2, 6 in a three-player game with ones wild. You count three toward 4s: two 4s plus the wild 1. The next bid you're weighing is "six 4s", so you need three more from ten hidden dice. From the table, that's 70.1%, a solid bid. "Seven 4s" needs four hidden matches, 44.1%, which makes it a coin-flip-minus bid. "Eight 4s" needs five, 21.3%, and should draw a challenge.

### The quick rule

Expected hidden matches = n × p. With ten hidden dice, that's 1.67 without wilds and 3.33 with wilds. Add your own matches to get a "fair" table count. Bids at or just below that line are more likely true than false. Bids two or more above it are usually false. This matches the benchmark in the game-theory literature: a bid at the expected count, rounded down, is true more often than not.`,
    },
    {
      id: "strategy",
      title: "Liars dice strategy: when to raise and when to call",
      body: `Good liars dice play mixes the maths above with reading people.

### Challenge on the numbers, not on a hunch

Before you call, count exactly how many hidden matches the bid needs. Then check it against the table. If the bid needs a result that happens under 30% of the time, calling is usually right. If it's above 60%, raising is usually right, even with a small bluff of your own.

### Remember that a raise is information

When a player moves from "five 3s" to "five 6s", they're probably holding 6s. Adjust. With ones wild, treat each bidder as holding about one or two extra of the face they named. Bidders who switch faces often are either holding a spread or bluffing on purpose to hide their strength.

### Manage the "hot seat"

The worst spot is being next to act after a high but plausible bid, with nothing in your cup. Early bidding tends to leave you a safer raise. Late bids stack up toward the danger zone. A modest opening bid on a face you hold keeps you out of trouble later in the round.

### Endgame with few dice

As dice leave the table, n shrinks and the distribution gets lumpier. With four hidden dice and wilds, the chance of at least two matches is 1 − (2/3)⁴ − 4(1/3)(2/3)³ = 1 − 16/81 − 32/81 = 33/81 ≈ 40.7%. Small endgames reward exact counting over gut feel.

### Five hidden dice, ones wild

Use this when you are heads-up and each of you has a few dice left, or when two opponents are short.

| At least this many hidden matches | Probability (p = 1/3) |
| --- | --- |
| 1 | 86.8% |
| 2 | 53.9% |
| 3 | 21.0% |
| 4 | 4.5% |
| 5 | 0.4% |

If you hold two of the named face and the bid is “five”, you need three hidden matches: about 21%. That is a call, not a hopeful raise, unless you have a strong read that the bidder is also loaded.

Playing well means making correct decisions more often. It doesn't guarantee a win on any one night, which is the same point as [expected value in gambling](/guides/expected-value-gambling).`,
    },
    {
      id: "stakes",
      title: "Playing liars dice for money",
      body: `Liars dice has long been a bar and tavern game. It was also shown on screen as a high-stakes game in *Pirates of the Caribbean: Dead Man's Chest* (2006). Common money formats include:

- **Buy-in and winner takes all:** everyone puts in the same stake, and the last player with dice takes the pot.
- **Pay per die lost:** each lost die pays a fixed amount into a pot, or directly to the challenger.
- **Drinks:** the loser buys a round, the classic bar version.

Where money is involved, it's for adults only (18+, or your local legal age). Agree on the stake and the variant rules before anyone lifts a cup. Unlike a casino game, there's no house edge here. Money moves between players, so over time the stronger bidders win slightly more. A short session is still mostly the dice. For the difference between skill and luck in games played for stakes, see [skill-based gambling](/guides/skill-based-gambling).

### A worked three-player pot

Three players buy in at $10, winner takes $30. Each starts with five dice. After four challenges, Alice has 3 dice, Ben 4, Cara 2. Expected ones-as-wild count for a face is about (3+4+2)/3 ≈ 3. Expected exact-face count is about 9/6 = 1.5. A bid of “six fours” from Alice is aggressive: she needs a lot of hidden fours plus wilds. If Ben calls and the table shows four fours and two ones, the bid stands and Cara (or whoever called, depending on house rule) loses a die. Write the call rule before the first cup lifts. Some tables make the bidder lose on a good bid; most make the caller lose.

### Why the last die is a different game

With one die left, Palifico-style or not, the binomial table shrinks. A lone die is a 1-in-6 shot on a named face, or 1-in-3 with wilds if ones still count. People overbid here because the pot feels “due.” It is not. Call more, raise less, unless you can see that the remaining dice cannot support the bid.`,
    },
    {
      id: "pvp",
      title: "Binomial odds and a hashed PvP round",
      body: `The binomial table that prices a liars dice bid also prices many small independent chances. It covers streaks of coin flips, hits on a roulette colour, and matches under a cup. For a coin, see [coin flip odds](/guides/coin-flip-odds): p = 1/2 in place of 1/6 or 1/3.

PVPspinArena runs three player-vs-player games in USDC or ETH on Base. A [Coinflip](/coinflip) is a fair 50/50 between two players. Roulette's 33-slot wheel returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee. Jackpot win chance equals your share of the pot. There's no bluffing in these games. Outcomes come from committed seeds, and any settled round can be checked on the [fairness page](/fairness). Play is 18+. The [responsible gambling](/responsible-gambling) page has limits if a game stops being fun.`,
    },
  ],
  faqs: [
    {
      q: "How do you play liars dice?",
      a: "Everyone rolls five dice under a cup and looks only at their own. Players take turns raising a bid on how many dice of a face are on the whole table, or call liar. The loser of a challenge drops a die; the last player with dice wins.",
    },
    {
      q: "Are ones wild in liars dice?",
      a: "In Perudo and many house games, yes: 1s count as any face. Bids on aces themselves can then be halved. Some tables play without wilds, so agree first.",
    },
    {
      q: "What are the odds a liars dice bid is true?",
      a: "Count your own matching dice, then use the binomial chance for the hidden dice: 1/6 per die without wilds, 1/3 with wild ones. With ten hidden dice and wilds, at least three hidden matches happen about 70% of the time.",
    },
    {
      q: "What does spot on mean in liars dice?",
      a: "It is a claim that the last bid is exactly right. If the count matches exactly the caller usually gains a die back; if not, the caller loses one.",
    },
    {
      q: "Is liars dice the same as Perudo?",
      a: "Perudo is a branded version of the same single-hand game, with wild aces, halving when bidding aces, spot-on calls and a special round when a player reaches one die.",
    },
  ],
  sources: [
    { label: "Wikipedia: Liar's dice", url: "https://en.wikipedia.org/wiki/Liar%27s_dice" },
    {
      label: "Wikipedia: Binomial distribution",
      url: "https://en.wikipedia.org/wiki/Binomial_distribution",
    },
    { label: "Encyclopaedia Britannica: dice", url: "https://www.britannica.com/topic/dice" },
  ],
  related: [
    "poker-dice",
    "yahtzee-rules",
    "farkle-rules",
    "cee-lo-rules",
    "coin-flip-odds",
    "skill-based-gambling",
  ],
  updated: "2026-09-27",
};
