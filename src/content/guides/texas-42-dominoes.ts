import type { Guide } from "./types";

export const guide: Guide = {
  slug: "texas-42-dominoes",
  cluster: "Games of chance",
  keyword: "texas 42 dominoes",
  secondary: [
    "texas 42 rules",
    "42 domino game",
    "how to play 42 dominoes",
    "42 bidding and trumps",
  ],
  title: "Texas 42 Dominoes: Rules, Bidding and Trumps",
  description:
    "Texas 42 dominoes explained: four players, count tiles worth 35 points, bidding from 30 to 84, choosing trumps, following suit, marks, nel-o and plunge.",
  h1: "Texas 42 dominoes: rules, bidding and trumps",
  answer:
    "Texas 42 dominoes is a four-player partnership trick-taking game played with a double-six set. Each player draws seven tiles, then bids on how many of the hand's 42 points their team will take. The high bidder names trumps and leads. Seven tricks score one point each and five count tiles add 35 more. Make your bid to win a mark; seven marks wins the game.",
  facts: [
    "42 uses a standard 28-tile double-six set; four players in fixed partnerships draw seven tiles each.",
    "The hand holds exactly 42 points: 7 for tricks plus 35 from the five count tiles.",
    "Count tiles: 5-5 and 6-4 are worth 10 each; 5-0, 4-1 and 3-2 are worth 5 each.",
    "The minimum bid is 30; bids of 42 and 84 are one-mark and two-mark contracts to take every trick.",
    "Texas designated 42 its official State Domino Game in 2011.",
  ],
  sections: [
    {
      id: "what",
      title: "What Texas 42 is",
      body: `42 is a trick-taking game, closer to Spades or Pitch than to the block-and-draw domino games most people learn first. Nobody matches ends on a line. Instead, each player plays one tile to a trick, the highest tile wins it, and the partnership that wins the right tricks and the right tiles scores.

The commonly told origin story places the game in Garner, Texas, in 1887, where two boys are said to have adapted a card game like Pitch to dominoes because many Protestant families of the time disapproved of playing cards. That account comes from a 1985 newspaper article and is best treated as the traditional story rather than a documented record. What is documented is the game's standing: it is often called the national game of Texas, a state championship is held in Hallettsville, and the Texas Legislature named it the official State Domino Game in 2011.

### What you need

- One double-six set: 28 tiles, numbers 0 to 6.
- Four players in two partnerships, partners sitting opposite.
- A score sheet for marks or points.

If you want the card-game logic behind 42, the [pitch card game](/guides/pitch-card-game) and [how to play spades](/guides/how-to-play-spades) guides cover bidding and trumps with cards. For line-building domino games, see [dominoes rules](/guides/dominoes-rules). All of these sit in the [Games of chance topic](/guides/topics/games-of-chance).`,
    },
    {
      id: "points",
      title: "Where the 42 points come from",
      body: `Every hand is worth exactly 42 points, which is where the name comes from.

| Source | Tiles | Points |
| --- | --- | --- |
| Tricks | 7 tricks at 1 point each | 7 |
| Ten-counts | 5-5, 6-4 | 20 |
| Five-counts | 5-0, 4-1, 3-2 | 15 |
| **Total** | | **42** |

The count tiles are simply the tiles whose pips add to 5 or 10. Players call them count, and the whole game revolves around them. A team that takes four tricks containing no count scores 4. A team that takes one trick containing the 5-5 and the 6-4 scores 21. Capturing count matters far more than capturing tricks.

That is why 30 is the minimum bid. To reach 30, a team normally needs most of the count as well as several tricks. Because 35 of the 42 points sit in just five tiles, most of the drama in a hand is about who is forced to play count onto whose trick.`,
    },
    {
      id: "bidding",
      title: "Shuffling, drawing and bidding",
      body: `One player shuffles the tiles face down. Players then draw seven each; many tables have the shuffler draw last so they cannot steer the draw. No tiles are left over.

### The auction

Starting with the player to the dealer's left and moving clockwise, each player gets one chance to bid or pass. Rules at most tables:

1. The minimum bid is 30. Each bid must beat the previous one.
2. A bid of 42 means taking every trick and is worth one mark.
3. The highest opening bid is 84, two marks, also taking every trick.
4. After an 84, a later player may only raise by one mark at a time (three marks, then four).
5. If everyone passes, the dealer must bid 30. Some groups reshuffle instead.

### How to value a hand

Beginners count trumps and doubles. A double is the highest tile of its suit, so every double you hold is a likely trick. A long trump suit lets you pull opponents' trumps and then cash doubles.

As a rough guide for beginners, a trump suit of four or more tiles including its double, plus another double or two, is a reasonable hand to open near the minimum. With fewer trumps and no doubles, passing and letting your partner speak is usually wiser. Experienced players refine this by counting which count tiles they can protect. Bidding one or two points above the minimum just to stop the opponents choosing trumps is called a spite bid, and it can backfire.`,
    },
    {
      id: "trumps",
      title: "Trumps, suits and following",
      body: `The winning bidder names trumps. There are three kinds of choice:

- **A suit**, from blanks to sixes. Every tile containing that number becomes a trump.
- **Doubles.** The seven doubles form the trump suit.
- **No trumps**, also called follow-me.

### Which suit a tile belongs to

When a non-trump tile is led, it belongs to the suit of its **higher** end. The 4-3 led is a four. But if threes are trumps, the 4-3 is a trump and nothing else. A trump tile only ever belongs to the trump suit.

### Ranking within a suit

The double is the highest tile of its suit, then the others rank by their other end. With sixes as trumps, the order is 6-6, 6-5, 6-4, 6-3, 6-2, 6-1, 6-0. With doubles as trumps, 6-6 is high and 0-0 is low.

### Following suit

The bidder leads the first trick. Everyone must follow the suit led if they can. If you cannot follow, you may play any tile, including a trump. The highest trump wins; if no trump is played, the highest tile of the suit led wins. The winner of each trick leads the next.

Failing to follow suit when you could is a renege, and at most tables it forfeits the hand.

### Worked trick

Fives are trumps. North leads 6-2 (a six). East plays 6-1, following. South has no six and plays 5-0, a trump that is also five count. West follows with 6-6. South's 5-0 wins the trick with the only trump played, and that trick is worth 1 + 5 = 6 points for North–South.`,
    },
    {
      id: "scoring",
      title: "Making the bid, marks and special contracts",
      body: `### Scoring by marks

The standard game is to seven marks. The bidding team wins one mark if they take at least the points they bid (two marks for a successful 84). If they fall short, they are set and the opponents take the marks instead. Play often stops as soon as the outcome is certain. Many tables tally marks with strokes that spell out ALL.

### Scoring by points

Some groups play to 250. A bidding team that makes its bid scores the points it took, and the opponents score the points they caught. If the bidders are set, they score nothing and the opponents score the bid plus whatever they caught. Example: a 30 bid that takes only 26 gives the setters 30 + 16 = 46.

### Special contracts

| Contract | Requirement | Reward |
| --- | --- | --- |
| 84 | Bidders take all 7 tricks, tricks stacked face down | 2 marks |
| Nel-o | Bidder takes no tricks; partner sits out | 1 mark |
| Splash | Bidder with 3 doubles; partner names trumps and leads | 2–3 marks by house rule |
| Plunge | Bidder with 4 doubles; partner names trumps; take every trick | 4 marks at most tables |

Nel-o, splash and plunge are house options. Agree them before the first shuffle, along with whether doubles in nel-o count as high, low or a separate suit.`,
    },
    {
      id: "odds",
      title: "Odds and strategy for better 42",
      body: `A double-six set can be dealt into C(28, 7) = 1,184,040 different seven-tile hands for any one player, so memorising hands is hopeless. Probability still guides good play.

### How many trumps to expect

Each suit has seven tiles. With seven tiles in each of four hands, the average player holds 7 × 7 / 28 = 1.75 tiles of any given suit. That is why holding four trumps is a strong hand: you have more than double your share.

### Where the missing tiles are

If you do not hold a tile, it is in one of three other hands, so before any play your partner holds it with probability 1/3 and the opponents with 2/3. If you are missing the 5-5 and bid fives, expect the opponents to hold it two times in three. Plan to pull it with high trumps rather than hoping partner has it.

### Practical strategy

1. **Pull trumps early** when you are the bidder. Each round of trumps clears opponents' ability to ruff your doubles.
2. **Lead doubles** of side suits once trumps are drawn. A double cannot be beaten in its own suit.
3. **Give count to your partner.** If partner is winning the trick, drop a count tile on it. If the opponents are winning, play trash, a no-count tile.
4. **Track the count.** Five tiles hold 35 points. Knowing which have fallen tells you whether a set is still possible.
5. **Do not overbid for trumps.** A spite bid you cannot make gives the opponents a mark anyway.

### A worked bidding decision

You hold 6-6, 6-5, 6-3, 6-0, 5-5, 4-4 and 2-1. That is four sixes including the double, plus two side doubles, one of which is the 5-5 ten-count.

- Bid sixes. Leading 6-6 then 6-5 should pull most of the three outstanding sixes; on average each opponent holds only about one tile of any suit.
- Your 5-5 and 4-4 are then winners in their suits, and the 5-5 brings 10 points with it.
- The missing sixes are 6-4, 6-2 and 6-1. Players must follow suit, so each trump lead drags them out, and if the 6-4 falls under your 6-6 or 6-5 you also collect its 10 points.
- The danger is one opponent holding all three missing sixes. Then one trump survives two rounds and can ruff a double. The chance that a particular other hand holds all three is C(18, 4) / C(21, 7) ≈ 2.6%, so about 5.3% across both opponents.
- The 2-1 is a sure loser, so a 42 or 84 is off the table.

A bid of 30 or 31 is comfortable here. Most players would not push higher without knowing more about partner's hand.`,
    },
    {
      id: "stakes",
      title: "Stakes, tournaments and the PvP link",
      body: `42 is played in church halls, family kitchens and organised tournaments across Texas, usually for bragging rights. Where groups do play for money, it is typically a small amount per mark or per game between partnerships. Money play is for adults only, 18+ or the local legal age, and private gambling rules vary by country and state.

42 is a skill game with a luck deal. Over one hand, the draw matters enormously: a hand with four doubles is simply better than a hand of trash. Over dozens of games, the stronger partnership bids more accurately, loses fewer sets and wins more marks. That skill edge is why tournament winners repeat.

PVPspinArena sits at the other end of the scale. Its three player-vs-player games, [Jackpot](/), [Coinflip](/coinflip) and [Roulette](/roulette), have no skill layer at all, played in USDC or ETH on Base. On Roulette's 33-slot wheel, each of Purple and Silver hits 16/33 of the time and pays 2x, so Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Seeds are committed before the round, and any settled result can be verified on [fairness](/fairness). If money on any game stops being a pastime, see [responsible gambling](/responsible-gambling).

In the same cluster, see also [mahjong tiles](/guides/mahjong-tiles) and [mexican train rules](/guides/mexican-train-rules).`,
    },
  ],
  faqs: [
    {
      q: "Why is the domino game called 42?",
      a: "Each hand contains exactly 42 points: one point for each of the seven tricks plus 35 points from the five count tiles (5-5 and 6-4 at ten each, 5-0, 4-1 and 3-2 at five each).",
    },
    {
      q: "What is the minimum bid in Texas 42?",
      a: "The minimum bid is 30. If all four players pass, the dealer is usually forced to bid 30, though some groups reshuffle instead.",
    },
    {
      q: "Is a double high or low in 42?",
      a: "In standard play the double is the highest tile of its suit. Some nel-o variants let the bidder declare doubles low or as their own suit, so agree that before play.",
    },
    {
      q: "What does it mean to be set in 42?",
      a: "The bidding team is set when it fails to take the points it bid. The opponents then win the mark, or in points scoring they receive the bid plus any points they caught.",
    },
    {
      q: "Can you play Texas 42 with three players?",
      a: "Yes. A common three-handed version removes the 1-0 tile and deals nine tiles each, with bidding otherwise similar to the four-player game.",
    },
  ],
  sources: [
    { label: "Wikipedia: 42 (dominoes)", url: "https://en.wikipedia.org/wiki/42_(dominoes)" },
    { label: "Wikipedia: Dominoes", url: "https://en.wikipedia.org/wiki/Dominoes" },
    {
      label: "Wikipedia: Trick-taking game",
      url: "https://en.wikipedia.org/wiki/Trick-taking_game",
    },
  ],
  related: [
    "chicken-foot-dominoes",
    "dominoes-rules",
    "mexican-train-rules",
    "pitch-card-game",
    "how-to-play-spades",
    "mahjong-tiles",
  ],
  updated: "2026-09-27",
};
