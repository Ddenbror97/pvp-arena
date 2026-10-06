import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-play-euchre",
  cluster: "Games of chance",
  keyword: "how to play euchre",
  secondary: [
    "euchre rules",
    "euchre bowers",
    "euchre scoring",
    "euchre card game",
    "going alone euchre",
  ],
  title: "How to Play Euchre: Trump, Bowers, Bidding and Scoring",
  description:
    "How to play euchre: the 24-card deck, dealing, ordering up trump, right and left bowers, going alone, scoring to 10 points and the odds behind each call.",
  h1: "How to play euchre: trump, bowers, bidding and scoring",
  answer:
    "How to play euchre: four players in two partnerships use a 24-card deck of nines through aces. Each player gets five cards, and a turned-up card proposes trump, which players accept or change. The jack of trump (right bower) and the other jack of the same colour (left bower) are the top trumps. Win at least three of five tricks to score; first team to 10 wins.",
  facts: [
    "Standard euchre uses 24 cards: 9, 10, J, Q, K and A in each suit.",
    "Four players, two partnerships, five cards each; the four leftover cards form the kitty.",
    "Trump ranks right bower, left bower, A, K, Q, 10, 9, giving seven trumps per hand.",
    "Makers score 1 point for three or four tricks, 2 for all five, and 4 for all five alone.",
    "If the makers take fewer than three tricks they are euchred and the defenders score 2.",
  ],
  sections: [
    {
      id: "basics",
      title: "What euchre is and where it is played",
      body: `Euchre is a fast partnership trick-taking game. It is widely believed to descend from Juckerspiel, a game from Alsace, and was brought to North America by German-speaking immigrants in the 19th century. It became one of the most popular card games in the United States during that century and remains a fixture in the Midwest, Ontario and parts of England, Australia and New Zealand.

Euchre also gave the deck one of its best-known cards. The joker was added to American packs in the 19th century as the "best bower", a top trump for euchre, before other games adopted it.

You need four players and a 24-card pack: the 9, 10, jack, queen, king and ace of each suit, taken from a standard [52-card deck](/guides/52-card-deck). Partners sit opposite each other. Some groups use a 25-card pack with a joker as the highest trump, or a 32-card pack with 7s and 8s; the rules below are for the common 24-card game.

Compared with [Spades](/guides/how-to-play-spades), euchre is short: five tricks per hand and a game to only 10 points, so a full game often takes 15 to 20 minutes. It is part of the [games of chance topic](/guides/topics/games-of-chance) with the other trick-taking games on this site.`,
    },
    {
      id: "bowers",
      title: "Trump and the bowers",
      body: `Once trump is chosen for a hand, the ranking changes in two suits.

### The trump suit (highest to lowest)

1. **Right bower:** the jack of the trump suit.
2. **Left bower:** the other jack of the same colour. It becomes a member of the trump suit for the whole hand.
3. Ace, king, queen, 10 and 9 of trump.

That makes seven trumps in the pack.

### The other suits

The two suits of the opposite colour rank normally: A, K, Q, J, 10, 9. The suit that loses its jack to become the left bower ranks A, K, Q, 10, 9, with only five cards.

| If trump is | Right bower | Left bower |
| --- | --- | --- |
| Hearts | J♥ | J♦ |
| Diamonds | J♦ | J♥ |
| Spades | J♠ | J♣ |
| Clubs | J♣ | J♠ |

### The most common beginner mistake

The left bower is a trump, not a card of its printed suit. If hearts are trump and diamonds are led, you may not follow with the J♦; it is a heart for this hand. If hearts are led and you hold the J♦, you must play it (or another heart) because you are able to follow suit.

On average, a five-card hand holds 5 × 7/24 ≈ 1.46 trumps, so a hand with three trumps including a bower is well above average.`,
    },
    {
      id: "deal-bid",
      title: "Dealing and making trump",
      body: `The dealer deals five cards to each player, traditionally in packets of three then two (or two then three). The four remaining cards form the kitty, placed face down with the top card turned face up. This upcard proposes trump.

### Round one: ordering up

Starting with the player to the dealer's left, each player in turn may pass or accept the upcard's suit as trump.

- An opponent of the dealer who accepts says "I order it up".
- The dealer's partner says "I assist".
- The dealer says "I pick it up".

In every case the dealer takes the upcard into their hand and discards one card face down. The team that chose trump becomes the **makers**; the other team are the **defenders**.

### Round two: naming a suit

If all four players pass, the upcard is turned face down. Starting again at the dealer's left, each player may name any other suit as trump or pass. If everyone passes a second time, the hand is thrown in and the deal passes left. A popular variation, **stick the dealer**, forces the dealer to name a suit if the first three players pass in round two.

### Going alone

The player who makes trump may announce they are **going alone**. Their partner puts their cards face down and sits out the hand. The loner plays against both defenders, with the chance of a bigger score. What happens to the upcard when the dealer's partner goes alone varies between groups, so settle it in advance.

### When to order up

A common rule of thumb is to call trump when you expect to win three tricks with your partner's help, which usually means three trumps, or two trumps including a bower plus an off-suit ace. Seat matters:

- **Dealer's partner:** assisting gives the dealer an extra trump, so a slightly weaker hand is enough.
- **Opponents of the dealer:** ordering up hands the dealer a trump, often a high one, so you need a stronger hand.
- **Round two:** nobody wanted the upcard's suit, so the same-colour suit (called next) often holds bowers for the player on the dealer's left. Naming next from that seat is a well-known tactic.

Being euchred costs 2 points. A call that scores 1 point when it works therefore breaks even at a success rate of two in three (p × 1 = (1 − p) × 2 gives p = 2/3), ignoring what the other team might do if you pass.

### What the kitty hides

From your seat, you see your five cards and the upcard, leaving 18 unseen cards: 15 in other hands and 3 buried in the kitty. The chance that your partner holds a specific missing card, such as the right bower, is 5/18, about 28%; the chance it is buried is 3/18, about 17%.`,
    },
    {
      id: "play",
      title: "Playing the tricks",
      body: `The player to the dealer's left leads the first trick, unless that player's partner is going alone, in which case the next player leads. Play goes clockwise.

1. You must follow the suit led if you can, remembering that the left bower belongs to the trump suit.
2. If you cannot follow suit, you may play any card, including a trump.
3. The highest trump wins the trick; if no trump is played, the highest card of the suit led wins.
4. The winner of each trick leads the next.

### A worked trick

Spades are trump. West leads the A♥. North, holding no hearts, plays the 9♠. East plays the K♥. South plays the J♣, which is the left bower and therefore a spade. South's left bower beats North's 9♠, so South wins the trick.

### Basic strategy

- **Lead trump** when your side made trump and you hold the right bower; drawing the defenders' trumps protects your side aces.
- **Lead an off-suit ace** when defending, to win a trick before the makers can trump.
- **Trump your partner's losing trick, not their winner.** If partner has played the ace of the suit led, save your trump.
- **Count trumps.** With seven in play and some buried in the kitty, knowing how many are gone tells you when your king or queen of trump is high.`,
    },
    {
      id: "scoring",
      title: "Scoring a hand and winning the game",
      body: `Only one team scores on each hand.

| Result | Points |
| --- | --- |
| Makers win 3 or 4 tricks | 1 to makers |
| Makers win all 5 tricks (a march) | 2 to makers |
| Loner wins 3 or 4 tricks | 1 to makers |
| Loner wins all 5 tricks | 4 to makers |
| Makers win fewer than 3 tricks (euchred) | 2 to defenders |

The first team to 10 points wins. Many players keep score with two spare cards, a 6 and a 4, sliding one over the other so the visible pips show the score.

### Why going alone is worth considering

Going alone only pays extra if you win all five tricks. An illustrative comparison, with assumed numbers: suppose that with your partner you would march 60% of the time, take 3–4 tricks 35% of the time and be euchred 5% of the time. That averages 2(0.60) + 1(0.35) − 2(0.05) = 1.45 points, counting the euchre as a 2-point loss. Suppose that alone you would sweep 50%, take 3–4 tricks 45% and be euchred 5%. That averages 4(0.50) + 1(0.45) − 2(0.05) = 2.35. When your hand is strong enough to win all five on its own, going alone roughly doubles the value. When it relies on partner to win a trick, it does not.

### The value of defending

A euchre is worth 2 points, the same as a march, so defenders who hold two trumps against a thin maker should play for the euchre.`,
    },
    {
      id: "stakes",
      title: "Euchre for stakes and tournaments",
      body: `Euchre is often played for small stakes, such as a fixed amount per game or a bonus for each loner and euchre, and in organised euchre tournaments that rotate partners. Anyone playing for money should be 18 or older, or the local legal gambling age, and should follow local rules on private gambling.

Before a stakes game, agree on the rules that vary most:

- whether stick the dealer applies;
- whether a defender may also go alone against a loner;
- whether a misdeal or reneging (failing to follow suit when able) costs 2 points;
- the deck size and whether a joker is used.

Short games mean luck in the deal shows up strongly over a single night, even though good calling and counting pay off over months. See [skill-based gambling](/guides/skill-based-gambling) and [variance in gambling](/guides/variance-in-gambling) for how that plays out. If a friendly stake starts to feel like chasing, pause and use the [responsible gambling](/responsible-gambling) tools.`,
    },
    {
      id: "pvp",
      title: "Euchre odds and a hashed PvP round",
      body: `The kitty is euchre's built-in uncertainty: three unseen cards that no one can use. Players adjust for it with conditional probability, just as in the 5/18 calculation above.

PVPspinArena runs three player-vs-player games that remove card judgement altogether: Jackpot, [Coinflip](/coinflip) and Roulette. A Coinflip is an even 50/50 between two players. Roulette's 33-slot wheel returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee. Results come from seeds committed before the round, and any settled round can be verified on the [fairness](/fairness) page, which does the job an honest shuffle and cut do at a euchre table. For another partnership game with exact bidding, see [Oh Hell](/guides/oh-hell-card-game).

In the same cluster, see also [how to play rummy](/guides/how-to-play-rummy) and [how to play gin rummy](/guides/how-to-play-gin-rummy).

See also [hearts](/guides/hearts-card-game-rules) and [pinochle](/guides/pinochle-rules).`,
    },
  ],
  faqs: [
    {
      q: "What cards are used in euchre?",
      a: "The standard game uses 24 cards: the 9, 10, jack, queen, king and ace of each suit. Some versions add a joker or the 7s and 8s.",
    },
    {
      q: "What is the left bower in euchre?",
      a: "The jack of the same colour as trump. It ranks second only to the right bower and counts as a trump card for the whole hand.",
    },
    {
      q: "How many points do you need to win euchre?",
      a: "Ten points. Teams score 1 or 2 points per hand, or 4 for a successful loner that wins all five tricks.",
    },
    {
      q: "What does it mean to get euchred?",
      a: "The team that chose trump won fewer than three tricks. The defending team scores 2 points for the hand.",
    },
    {
      q: "What is stick the dealer in euchre?",
      a: "A variation where, if the first three players pass in the second round, the dealer must name a trump suit instead of throwing the hand in.",
    },
  ],
  sources: [
    { label: "Wikipedia: Euchre", url: "https://en.wikipedia.org/wiki/Euchre" },
    { label: "Pagat: Euchre rules", url: "https://www.pagat.com/euchre/euchre.html" },
    {
      label: "Bicycle Cards: how to play Euchre",
      url: "https://bicyclecards.com/how-to-play/euchre",
    },
  ],
  related: [
    "how-to-play-spades",
    "oh-hell-card-game",
    "pitch-card-game",
    "52-card-deck",
    "bourre-card-game",
    "how-to-play-rummy",
    "how-to-play-gin-rummy",
    "hearts-card-game-rules",
  ],
  updated: "2026-09-27",
};
