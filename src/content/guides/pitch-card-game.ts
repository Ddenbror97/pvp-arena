import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pitch-card-game",
  cluster: "Games of chance",
  keyword: "pitch card game",
  secondary: [
    "auction pitch",
    "setback card game",
    "pitch high low jack",
    "how to play pitch",
    "pitch scoring",
  ],
  title: "Pitch Card Game: High, Low, Jack, Game and Bids",
  description:
    "Pitch card game rules: auction bidding, high low jack and game points, setback scoring, partnership play, and how adults stake a table to 7 or 21.",
  h1: "Pitch card game: High, Low, Jack, Game and setback scoring",
  answer:
    "The pitch card game, also called Auction Pitch or Setback, is a point-trick game. Players bid for the right to name trump, then play for four named points: High, Low, Jack and Game. The bidder who fails to make the bid is set back that many points. Partnerships or cutthroat tables both work. Adults often play to 7, 11 or 21.",
  facts: [
    "Pitch is an All Fours descendant: the four classic points are High, Low, Jack and Game.",
    "A common deal is six cards each from a 52-card deck; the highest bidder names trump by leading (pitching) a trump.",
    "High is the highest trump in play; Low is the lowest trump (often whoever wins the trick that contains it); Jack is the jack of trump if it was dealt.",
    "Game is won by the side with the higher total of card points in tricks: 10 = 10, ace = 4, king = 3, queen = 2, jack = 1.",
    "Failing the bid subtracts those points (setback). Smudge or shoot-the-moon bids try to take all four points at once.",
  ],
  sections: [
    {
      id: "what",
      title: "What Pitch is and where it sits",
      body: `The pitch card game is the American auction form of All Fours. English All Fours scored High, Low, Jack and Game centuries ago. Auction Pitch added a bid for the right to name trump. Setback is the same family under the name that emphasises the penalty: miss your bid and your score moves backward.

It is a kitchen-table and tournament staple in parts of the United States, especially the Midwest and New England, and it shows up in firehouse and church-hall nights. Partnership Pitch (two versus two, partners opposite) is the usual social form. Cutthroat (each player alone) is common with three or five.

Pitch sits with [euchre](/guides/how-to-play-euchre) and [Spades](/guides/how-to-play-spades) in the [Games of chance topic](/guides/topics/games-of-chance). [Texas 42](/guides/texas-42-dominoes) is the domino cousin: bidding for named points with a different deck. Tile and trump logic transfer; the cards do not.

You need a standard [52-card deck](/guides/52-card-deck), a way to keep score, and an agreed target (7, 11 or 21). Money games are 18+ or the local legal age.`,
    },
    {
      id: "points",
      title: "The four points: High, Low, Jack and Game",
      body: `A hand contains at most four points. Not every point is always in play. If the jack of trump was not dealt, Jack is not awarded. If card-point totals tie, Game is not awarded.

### High

Awarded to the player or side that **holds** the highest trump that was dealt. If the ace of trump is in play, High is the ace. If nobody was dealt the ace, High is the king, and so on. You do not have to win a trick with it; you have to have been dealt it (or, in some house rules, still possess it when it is played). The usual rule is: High belongs to whoever was dealt the highest trump.

### Low

Two common rules exist. **Older All Fours:** Low belongs to whoever was **dealt** the lowest trump. **Many modern Pitch tables:** Low belongs to whoever **wins the trick** that contains the lowest trump. The second rule makes the two of trump a card worth hunting. Agree which Low you use. It changes the value of a small trump in your hand.

### Jack

Awarded to whoever **wins the trick** containing the jack of trump, if that jack was dealt. Capturing Jack is the swing point of many hands.

### Game

Count card points in the tricks you have taken:

| Card | Game points |
| --- | --- |
| 10 | 10 |
| Ace | 4 |
| King | 3 |
| Queen | 2 |
| Jack | 1 |
| Everything else | 0 |

There are 80 card points in a full deck (four 10s = 40, four aces = 16, four kings = 12, four queens = 8, four jacks = 4). Only the cards that were dealt and then won in tricks count. The side with the higher total wins the Game point. A tie means no Game point.

### Worked example

Trump is spades. Dealt trumps in play: A♠, J♠, 8♠, 4♠, 2♠. High is A♠ (held by North). Low is 2♠; under "winner of the trick" rules East ruffs a heart with the 2♠ and earns Low. South captures J♠ and earns Jack. North–South took 44 card points, East–West 28, so North–South earn Game. Points this hand: North–South High, Jack, Game (3); East–West Low (1).`,
    },
    {
      id: "bidding",
      title: "The auction, the pitch and play",
      body: `### Deal

A common partnership deal is six cards to each of four players, three at a time. Some groups deal three, play, then deal three more (sellout / dealer-discards variants). Three-handed cutthroat often deals four or six. Leftover cards stay in a stock; they are not in play unless a variant lets the bidder draw.

### Bidding

Starting at the dealer's left, each player in turn may pass or bid a number of points they will take if they name trump. The minimum bid is usually 2. The maximum is 4 (all the points), sometimes called **smudge**, **slam** or **shoot the moon**. Each bid must be higher than the last, except on some tables where the dealer may take the current bid for the same number (Bicycle's Auction Pitch allows this). Many tables allow only one bid per player; others allow overcalls around the table once.

If everyone passes, house rules either throw the hand in, force the dealer to bid 2 (**stick the dealer**), or let the dealer name trump for 2.

### The pitch

The high bidder leads to the first trick and **must lead trump**. That lead is the pitch that names the suit. After that, play is standard: follow suit if you can; if you cannot, you may trump or discard. Highest trump wins, or highest card of the suit led.

In partnership play your partner's points count toward the bid. In cutthroat only your own points count.

### A practical bidding scale

| Holding (six cards) | Typical bid |
| --- | --- |
| Ace of a suit, jack of that suit, and a small trump | 3 is thinkable |
| Ace and a long side suit, no jack | 2 |
| Three small trumps after the fact, no ace or jack | usually pass |
| Ace, jack, ten of trump and a side ace | 4 / smudge territory |

You are bidding points, not tricks. Three tricks can still be zero points if they contain no High, Low, Jack or Game cards. Two tricks can be High and Jack. Count points, not piles.`,
    },
    {
      id: "setback",
      title: "Setback, targets and a worked scoreline",
      body: `The bidder's side must take at least as many of the four points as they bid. If they bid 3 and take High, Jack and Game, they score 3 (or they score all points they took, depending on house rules — the common rule is **the bidding side scores what they took if they made the bid**). If they bid 3 and take only High and Low, they are **set back** 3: subtract 3 from their score, and the defenders score the points they took (Jack and Game in this story, if those went the other way).

Some groups score only the bid on a make and ignore extra points; most social tables credit every point the makers actually earned once the bid is safe. Write it down.

### Game targets

- **7 points:** a short game, high variance, common for a work-night table.
- **11 points:** a middle length.
- **21 points:** a long game that lets skill show.

A side at 6, bidding 2, can go out by making 2. A side at 6 that bids 4 and fails drops to 2. Near the line, overbidding to "end it" is how setback earns its name.

### Worked rubber

North–South 5, East–West 4, target 7. North bids 2 and names hearts. Points fall High and Low to North–South, Jack and Game to East–West. Makers took 2 and make the bid. North–South reach 7 and win, even though they did not take Jack. If North had bid 3, they would be set to 2 and East–West would sit on 6 with Jack and Game.

### Stakes

Pay a unit per game, or a unit per point of margin, or a bonus for a smudge and for a set. Agree before the deal. [Oh Hell](/guides/oh-hell-card-game) settles on a running point total instead of named points; do not mix the two scorepads.`,
    },
    {
      id: "variants",
      title: "Partnership, cutthroat and extra-point Pitch",
      body: `### Partnership versus cutthroat

Partnership Pitch is four players, two teams, six cards. Cutthroat is every player for themselves; the bidder is alone against the field. Cutthroat makes a 3-bid much harder, because two or three opponents will throw Jack to each other to set you.

### 10-point and 13-point Pitch

Many regions add points: the off-jack (jack of the same colour as trump), jokers, the three of trump (trey), or both jokers plus off-jack. Ten-point Pitch is a different economy. Do not sit down and assume four points if the host says "we play Pitch" in Minnesota or Pennsylvania without asking the list.

### Smear / Schmier

Smear is the closely related game that treats the off-jack as a ranking trump and often uses a joker. It is not Pitch, but a Pitch player will recognise High, Low, Jack and Game immediately.

### Misdeals and renege

A card exposed in the deal is usually a misdeal. A renege (failing to follow suit when able) typically awards the remaining points to the other side or sets the bidder. Stakes games should state the penalty before it happens.`,
    },
    {
      id: "pvp",
      title: "Named points, luck in the deal and PvP maths",
      body: `Six cards from 52 means you see about 11.5% of the deck. The ace of a chosen trump is in your hand with probability 6/52 ≈ 11.5% before anyone bids, but after you look at six cards you know whether you hold it. The jack of that suit is the same 6/52 if you have not seen it. Jointly holding ace and jack of one suit in six cards is 6/52 × 5/51 ≈ 1.1% for a specific suit, or about 4.5% for some suit. That is why a 4-bid is rare and why smudge bonuses exist.

The leftover stock is unseen. Low may be a three, not a two. Game may hide in the undealt 10s. Good bidders allow for missing cards; they do not assume a full 80-point Game deck.

PVPspinArena runs three player-vs-player games in USDC or ETH on Base: Jackpot, [Coinflip](/coinflip) and Roulette. Coinflip is 50/50. Roulette returns 32/33, about a 7.88% Purple or Silver edge after the win fee. There is no Jack to capture. Seeds are committed and checkable on [fairness](/fairness). If a Pitch unit is already setback in real life — chasing a hole on the scorepad — pause and use [responsible gambling](/responsible-gambling). The card game is 18+ when money is out.

See also [pinochle](/guides/pinochle-rules).`,
    },
  ],
  faqs: [
    {
      q: "How do you play the pitch card game?",
      a: "Deal six cards, bid for the right to name trump, lead a trump to start, and play tricks. Score High, Low, Jack and Game. The bidder must take at least as many of those points as they bid or they are set back.",
    },
    {
      q: "What are High, Low, Jack and Game in Pitch?",
      a: "High is the highest trump dealt. Low is the lowest trump (dealt or captured, by house rule). Jack is winning the jack of trump. Game is the higher total of card points (10-A-K-Q-J) in tricks.",
    },
    {
      q: "What does setback mean in Pitch?",
      a: "The bidding side failed to take as many points as they bid, so that bid amount is subtracted from their score. Defenders still score the points they took.",
    },
    {
      q: "How many points do you play Pitch to?",
      a: "Common targets are 7, 11 and 21. Shorter games swing more on a single smudge or set.",
    },
    {
      q: "Is Pitch the same as Auction Pitch and Setback?",
      a: "Yes in the broad sense: they are names for the All Fours auction game. Local extras (off-jack, jokers, how Low is awarded) still need to be agreed.",
    },
  ],
  sources: [
    { label: "Pagat: Setback / Pitch", url: "https://www.pagat.com/allfours/pitch.html" },
    {
      label: "Wikipedia: Pitch (card game)",
      url: "https://en.wikipedia.org/wiki/Pitch_(card_game)",
    },
    {
      label: "Bicycle Cards: how to play Pitch",
      url: "https://bicyclecards.com/how-to-play/pitch",
    },
  ],
  related: [
    "how-to-play-euchre",
    "how-to-play-spades",
    "oh-hell-card-game",
    "texas-42-dominoes",
    "52-card-deck",
    "bourre-card-game",
    "pinochle-rules",
  ],
  updated: "2026-09-27",
};
