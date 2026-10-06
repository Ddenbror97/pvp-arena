import type { Guide } from "./types";

export const guide: Guide = {
  slug: "poker-dice",
  cluster: "Games of chance",
  keyword: "poker dice",
  secondary: ["poker dice rules", "poker dice hands", "poker dice odds", "dice poker"],
  title: "Poker Dice: Rules, Hand Rankings and Exact Odds",
  description:
    "Poker dice rules, the hand rankings, exact odds for all 7,776 rolls of five dice, and which dice to keep on a reroll, with worked probability examples.",
  h1: "Poker dice: rules, hand rankings and the odds of every hand",
  answer:
    "Poker dice is a game played with five dice whose faces show 9, 10, J, Q, K and A (or ordinary pips read the same way). You roll, keep some dice, reroll the rest, and the best poker-style hand wins. Five of a kind is the top hand at 6 in 7,776. One pair is the most common result at about 46%. There are no suits, so flushes do not exist.",
  facts: [
    "Five dice have 6^5 = 7,776 equally likely ordered outcomes.",
    "One roll: one pair 46.30%, two pair 23.15%, three of a kind 15.43%, bust 6.17%.",
    "Full house (3.86%) is more common than a straight (3.09%), yet most rules rank it higher.",
    "Holding three of a kind and rerolling two dice makes four or five of a kind 30.6% of the time.",
    "A five of a kind within three rolls, keeping the biggest group, lands about 4.6% of the time.",
  ],
  sections: [
    {
      id: "what",
      title: "What poker dice is",
      body: `Poker dice takes the hands of five-card poker and puts them on five dice. A traditional set has six faces printed like playing cards: 9, 10, Jack, Queen, King and Ace. With ordinary dice you read 1 as the 9, 2 as the 10 and so on up to 6 as the Ace, or you simply rank pips 1 to 6 and agree that 6 is high. The game is the same either way.

Because a die has no suit, there is no flush and no straight flush. That removes two hands from the card ladder and leaves eight: five of a kind, four of a kind, full house, straight, three of a kind, two pair, one pair and a bust (no pair, no straight).

The game has many relatives. Generala in Latin America and Yahtzee in the English-speaking world score similar patterns on a sheet across many turns; see [Yahtzee rules](/guides/yahtzee-rules) for the scorecard version. The "dice poker" minigame in The Witcher video games brought the head-to-head form to a new audience. All of them live in the [Games of chance topic](/guides/topics/games-of-chance) because the dice decide nearly everything and the player decides only what to keep.

### Equipment

You need five dice, a cup or shaker, and ideally a tray with raised sides so dice cannot roll off the table. Card-faced dice are cheap and make hands easy to read at a glance, which matters when four people are comparing results quickly. Pipped dice work fine once everyone agrees which face is high. A pen and paper help if you play to a points total or track lives rather than settling each round in cash.

If you already know the card game, the hand names will be familiar; [poker hand rankings](/guides/poker-hand-rankings) covers the card order, and the differences here come straight from the missing suits and the different counting.`,
    },
    {
      id: "rules",
      title: "Rules of a standard round",
      body: `House rules vary more than in most dice games, so agree on three points before anyone rolls: how many rerolls, whether straights count, and how ties break.

1. Each player puts the agreed stake in the pot, if you play for money. Gambling for stakes is 18+ (or your local legal age).
2. The first player rolls all five dice.
3. The player may set aside any dice and reroll the rest. Most groups allow two rerolls, for three rolls in total. Some pub rules allow only one.
4. The final five dice are the player's hand. Play passes to the left.
5. After everyone has rolled, the best hand takes the pot.

### Breaking ties

Compare the main group first: a full house of Kings over 9s beats Queens over Aces. If the main groups match, compare the second group, then the leftover dice (kickers) from highest down. The high straight (10 to Ace) beats the low straight (9 to King). If two hands are identical die for die, the tied players roll off, or they split the pot.

### Common variants

- **Aces wild:** an Ace can stand for any face. This makes five of a kind far more common and is best kept for casual play.
- **Leader sets the limit:** the first player's number of rolls becomes the maximum for everyone else in that round, which rewards stopping early on a strong hand.
- **No straights:** some groups skip straights entirely and count those rolls as a bust.`,
    },
    {
      id: "odds",
      title: "Hand rankings and odds on one roll",
      body: `Five dice give 6 × 6 × 6 × 6 × 6 = 7,776 ordered outcomes, each equally likely. Counting each hand is ordinary combinatorics: pick the face values, then count the ways to arrange them across five dice.

| Hand | How it is counted | Ways | Probability |
| --- | --- | --- | --- |
| Five of a kind | 6 faces | 6 | 0.08% |
| Four of a kind | 6 × 5 kickers × 5 positions | 150 | 1.93% |
| Full house | 6 trips × 5 pairs × 10 arrangements | 300 | 3.86% |
| Straight | 2 straights × 120 orders | 240 | 3.09% |
| Three of a kind | 6 × 10 kicker pairs × 20 arrangements | 1,200 | 15.43% |
| Two pair | 15 pair choices × 4 kickers × 30 arrangements | 1,800 | 23.15% |
| One pair | 6 × 10 kicker sets × 60 arrangements | 3,600 | 46.30% |
| Bust | 4 non-straight sets × 120 orders | 480 | 6.17% |

The ways add up to 7,776, which is a good check that nothing was double counted.

### Worked example: two pair

Choose the two pair values: C(6,2) = 15. Choose the odd die from the four remaining faces: 4. Arrange two, two and one across five positions: 5! / (2! × 2!) = 30. Multiply: 15 × 4 × 30 = 1,800, or 1,800 / 7,776 ≈ 23.15%.

### Why the ranking looks strange

The table is not in order of rarity. A straight is rarer than a full house, and a bust (6.17%) is rarer than three of a kind (15.43%), yet the bust ranks last. Poker dice copies the card-game order for familiarity. With five cards from 52, a straight really is more common than a full house; with five dice from six faces, it is not. A few rule sets put the straight above the full house to match the dice. Either is fine as long as the table agrees first.

This is also a neat reminder that "rare" and "strong" are separate ideas. For more two-dice and multi-dice counting, see [dice roll probability](/guides/dice-roll-probability).`,
    },
    {
      id: "rerolls",
      title: "Which dice to keep: reroll odds",
      body: `With rerolls, the decision that matters is what to hold. Each rerolled die is a fresh 1-in-6 draw, so the maths is short.

| You hold | Reroll | Best outcome and chance |
| --- | --- | --- |
| Three of a kind | 2 dice | Four or five of a kind: 1 − (5/6)² = 11/36 ≈ 30.6% |
| Three of a kind | 2 dice | Full house (the two new dice pair up off the trips): 5/36 ≈ 13.9% |
| Two pair | 1 die | Full house: 2/6 ≈ 33.3% |
| One pair | 3 dice | At least three of a kind: 1 − (5/6)³ = 91/216 ≈ 42.1% |
| 10-J-Q-K | 1 die | Straight (9 or Ace): 2/6 ≈ 33.3% |
| J-Q-K-A or 9-10-J-Q | 1 die | Straight (one face works): 1/6 ≈ 16.7% |
| Four of a kind | 1 die | Five of a kind: 1/6 ≈ 16.7% |

### A real decision

You roll 9, 10, J, Q, Q. You can keep 9-10-J-Q and chase a King (16.7% for a straight), or keep the Queens and roll three dice (42.1% for trips or better, with a small chance of a full house or four Queens). If the opponent already shows two pair, the Queens line gives you more ways to win. If the opponent shows three Aces, only a straight or four Queens beat it, and the straight draw may be the better single shot. Good poker dice play is reading the target, then picking the line with the most winning outcomes.

### Two pair: keep both or break it?

Holding Kings and 9s, you can reroll the odd die (a 1-in-3 shot at a full house, and you never finish worse than two pair) or keep only the Kings and roll three dice. The second line reaches three Kings or better 42.1% of the time, but 57.9% of the time you finish with one pair or two pair that may be weaker than what you broke. Against a single pair, keep both pairs: you already win. Against three of a kind, breaking to the Kings can be right, because two pair loses anyway and the three-dice roll gives more routes past trips, including four Kings at 3 × (1/6)² × (5/6) + (1/6)³ ≈ 7.4% for at least two more Kings.

### Over three rolls

If you always keep your largest group and reroll everything else, the chance of finishing with five of a kind in three rolls is about 4.6%. That is the same figure often quoted for rolling a Yahtzee in one turn, because the process is identical. One-roll odds are only the start; rerolls roughly multiply the chance of a big hand several times over.`,
    },
    {
      id: "money",
      title: "Playing poker dice for money",
      body: `Poker dice is usually a social game, played for a round of drinks or a small pot. Between players of similar skill, the expected value is close to zero: each person's share of the pot matches their chance of winning, and nobody takes a cut. The skill edge is small. It comes from rerolling correctly against the hand you have to beat, and from not tilting after a bad roll.

A few sensible habits:

- Fix the stake and the number of rounds before starting.
- Agree on reroll count, straights and ties in advance, because arguments about rules cost more goodwill than any pot is worth.
- Roll into a tray or cup so nobody can control the dice. Sliding or "setting" dice is the oldest cheat at every dice table.
- Keep money play to adults, and keep the amount small enough that losing ten rounds in a row would not matter. That streak happens; the chance of losing ten straight in a fair four-player game is (3/4)^10 ≈ 5.6%.

Dice fairness matters more than people think. Cheap dice with drilled pips are close enough for a pub game, but a loaded or shaved die shifts the counts in the table above. Casinos use precision dice for this reason, as [craps odds](/guides/craps-odds) explains.`,
    },
    {
      id: "pvp",
      title: "From dice on a table to a hashed PvP round",
      body: `Poker dice works because every face is equally likely and every roll is independent. The same two properties are what make an online game fair, but a screen cannot show you the dice, so you need another way to check them.

PVPspinArena runs three player-vs-player games. [Coinflip](/coinflip) is the closest cousin to a two-player dice duel: two players, a 50/50 result, and the winner takes the pot minus any fee shown before entry. Jackpot works like a shared pot where your win chance equals your share of it. Roulette uses a 33-slot wheel where Purple and Silver pay 2x and return about 96.97% of each bet before the win fee, while Green pays 14x and returns about 42.42%. After the fee the Purple or Silver edge is about 7.88%.

Results come from committed seeds: the server commits to a hidden seed before the round and reveals it afterwards, so anyone can recompute the outcome on the [fairness](/fairness) page. That is the digital equivalent of rolling in an open tray. If you enjoy the head-to-head side of dice, [dice duel](/guides/dice-duel-game) compares PvP dice formats, and [liar's dice](/guides/liars-dice) adds bluffing to five-dice hands. Play is 18+, and the [responsible gambling](/responsible-gambling) page has limits and help if a friendly game stops feeling friendly.`,
    },
  ],
  faqs: [
    {
      q: "How do you play poker dice?",
      a: "Roll five dice, keep any you like, and reroll the rest, usually up to two more times. Your final five dice form a poker hand, and the best hand at the table wins the round.",
    },
    {
      q: "What beats what in poker dice?",
      a: "Five of a kind, then four of a kind, full house, straight, three of a kind, two pair, one pair and bust. Some groups rank the straight above the full house because it is rarer on dice.",
    },
    {
      q: "What are the odds of five of a kind in poker dice?",
      a: "On a single roll it is 6 in 7,776, about 1 in 1,296. With three rolls and keeping your largest group each time, it rises to about 4.6%.",
    },
    {
      q: "Is there a flush in poker dice?",
      a: "No. Dice faces have no suits, so flushes and straight flushes do not exist. The two straights are 9 to King and 10 to Ace.",
    },
    {
      q: "What is the most common hand in poker dice?",
      a: "One pair, at 3,600 of 7,776 outcomes, about 46.3% of single rolls. Two pair is next at about 23.2%.",
    },
  ],
  sources: [
    { label: "Wikipedia: Poker dice", url: "https://en.wikipedia.org/wiki/Poker_dice" },
    { label: "Encyclopaedia Britannica: dice", url: "https://www.britannica.com/topic/dice" },
    { label: "Wikipedia: Generala", url: "https://en.wikipedia.org/wiki/Generala" },
  ],
  related: [
    "yahtzee-rules",
    "liars-dice",
    "cee-lo-rules",
    "mexico-dice-game",
    "dice-roll-probability",
    "poker-hand-rankings",
  ],
  updated: "2026-09-27",
};
