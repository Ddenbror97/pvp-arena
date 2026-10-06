import type { Guide } from "./types";

export const guide: Guide = {
  slug: "oh-hell-card-game",
  cluster: "Games of chance",
  keyword: "oh hell card game",
  secondary: [
    "oh hell rules",
    "nomination whist",
    "oh pshaw",
    "blackout card game",
    "oh hell scoring",
  ],
  title: "Oh Hell Card Game: Exact Bidding, Trump and Scoring",
  description:
    "Oh Hell card game rules: the changing deal, exact-trick bidding, the dealer constraint, trump from the leftover card, scoring and adult stakes.",
  h1: "Oh Hell card game: exact bids, changing deals and scoring",
  answer:
    "The Oh Hell card game is a trick-taking game where you bid the exact number of tricks you will take. The number of cards dealt changes each hand. Trump is usually a leftover card turned up. Hit your bid and you score a bonus plus your tricks; miss and you score little or nothing. The dealer's bid is constrained so the table cannot all be right.",
  facts: [
    "Oh Hell is also known as Nomination Whist, Oh Pshaw, Blackout and Blob, with local scoring differences.",
    "Three to seven players is comfortable; a 52-card deck is dealt in a descending then ascending series of hand sizes.",
    "Each player bids a number of tricks from zero up to the cards in that hand; the goal is to take exactly that many.",
    "A widespread dealer rule forbids the last bid from making the sum of bids equal the number of tricks, so someone must miss.",
    "A common score is 10 plus the tricks taken for an exact hit; missed bids score 0, or 1 per trick with no bonus.",
  ],
  sections: [
    {
      id: "what",
      title: "What Oh Hell is and how it differs from Spades",
      body: `The Oh Hell card game is a member of the exact-bidding family. You are not trying to take the most tricks. You are trying to take the number you named, no more and no less. That single rule turns a whist-style table into a game of counting, sandbagging and spoiling other people's contracts.

It appeared in London and New York in the 1930s under several names. British groups often say Nomination Whist. American groups say Oh Pshaw or Blackout. The German-speaking world has German Bridge; Spain has La Podrida. The core is shared: changing hand size, a bid, exact tricks.

Compared with [Spades](/guides/how-to-play-spades), there are no partnerships and no bags. Compared with [euchre](/guides/how-to-play-euchre), the deck is the full 52 and the hand length is not fixed at five. Oh Hell lives with those games in the [Games of chance topic](/guides/topics/games-of-chance).

You need three to seven players (four or five is the sweet spot), a standard [52-card deck](/guides/52-card-deck), ace high, and a score sheet. Adults playing for money should be 18+ or the local legal age and should agree scoring and settlement before the first deal.`,
    },
    {
      id: "deal",
      title: "The changing deal and how trump is set",
      body: `The distinctive schedule is the **up-and-down**. John McLeod's widely used description on Pagat deals a first hand of 10 cards when three to five play (8 cards if six play, 7 if seven), then steps down to 1 and back up to the start size. Four players then play 19 hands: 10 down to 1 and back to 10.

Many home groups invert it: start at 1, climb to a maximum, and stop, or climb and descend. The one-card hand is the famous moment. Everyone holds a single card, bids 0 or 1, and the table can see almost everything.

### Trump

After the deal, the next card of the leftover pack is turned face up. That suit is trump for the hand. If the entire deck was dealt — which happens when four play a 13-card hand — there is no leftover card. House rules then play no trump, or let the dealer name trump, or use a fixed rotation. Agree this before you hit a 13-card deal.

Cards rank A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2 in each suit. Any trump beats any non-trump. Follow the suit led if you can; if you cannot, you may trump or discard.

### A worked one-card hand

Four players, one card each. Trump is hearts from the leftover card. You hold the king of hearts. The other three cards are unseen among 51 leftovers in theory, but only three are in play. You will win the trick unless someone else holds a higher heart — only the ace. Bidding 1 is usually correct; bidding 0 is a bet that the ace is out against you. The dealer constraint (below) may force someone to bid the "wrong" number on purpose.`,
    },
    {
      id: "bidding",
      title: "Bidding and the dealer constraint",
      body: `Bidding starts with the player left of the dealer and moves clockwise. Each bid is an integer from 0 to n, where n is the number of cards in the hand. There is no competitive auction: one number each, once.

### The overbid / underbid rule

The most important house rule in Oh Hell is the **dealer constraint**. The dealer bids last and is not allowed to choose a number that makes the sum of all bids equal n. If three players have already bid 2, 1 and 0 on a 5-card hand, the bids already sum to 3, so the dealer may bid 0, 1, 4 or 5, but not 2 (3 + 2 = 5 = n). Someone at the table is mathematically guaranteed to miss.

This is why the game is called Oh Hell. The dealer is often forced to bid a number they do not want, and the rest of the table will play to break contracts.

Some groups omit the constraint and allow a "perfect table" where everyone can succeed. That version is flatter and kinder to the dealer. Say which you are playing.

### How to count a bid

There is no official formula. A practical count:

| Holding | Typical contribution |
| --- | --- |
| Ace of trump | 1 |
| King of trump with a small trump | often 1 |
| Off-suit ace, if the suit is likely to be led | about 1, less in long hands |
| Void with spare trumps | extra ruffing tricks |
| Long trump (four or more in a 10-card hand) | extra late tricks |

Then adjust for the constraint. If you sit before the dealer and the running total is already near n, a 0 bid may be safer than a greedy 3, because opponents will dump extra tricks on anyone who is "out."`,
    },
    {
      id: "scoring",
      title: "Scoring: bonus for exact, and a worked game",
      body: `Pagat records two dominant methods.

### Exact-only (Blackout / Blob)

Hit the bid: score **10 + tricks taken** (a 0 bid that holds scores 10). Miss: score 0. The scorekeeper can write a "1" in front of a successful bid and scribble out a miss, which is why misses look like black blobs.

### Tricks-plus-bonus (most widespread)

Everyone scores **1 point per trick taken**. Anyone who also hit the exact bid adds **10**. A player who bid 2 and took 2 scores 12. A player who bid 2 and took 3 scores 3. Misses still collect their tricks, so there is a small reason not to tank the hand after you are already set.

### Worked four-player hand

n = 4 cards. Bids: 1, 0, 2, and dealer 0 (cannot bid 1 because 1+0+2+1 = 4). Tricks taken: 1, 1, 2, 0.

Exact-only scores: 11, 0, 12, 10. Dealer's 0 held.

Tricks-plus-bonus: 11, 1, 12, 10.

The player who bid 0 and took 1 is the one who "broke" — and in the second system they still got 1 point for the extra trick.

### Stakes

A simple cash conversion: after the last hand, each player pays or receives the difference between their score and the table average, times a unit. If average is 80 and you have 95, you collect 15 units. If you have 62, you pay 18. This keeps the game zero-sum among players. Write the unit first. A 19-hand match at a $0.50 unit is usually a modest swing; a $5 unit on the same pad is a different night. Gambling is 18+.

[Pitch](/guides/pitch-card-game) is the other common American point-trick game people stake; it scores named points rather than exact bids.`,
    },
    {
      id: "play",
      title: "Play, breaking contracts and small-hand odds",
      body: `Play is standard trick-taking. The player left of the dealer leads (some groups let the dealer lead; agree). Highest trump wins, or highest card of the suit led.

### Tactics after the bid

- If you are on a 0: duck, throw winners under other winners, and never open a suit you cannot afford.
- If you need one more trick: lead a winner, or trump in when it is safe.
- If you already have your bid: dump high cards onto other people's tricks so they go over.
- If the dealer was forced into a bad bid: the table often plays to keep that player off their number.

### A little probability

In a 1-card hand with four players, each player holds 1 of 52. Trump is known. The chance you hold the highest remaining trump in play is not 1/4, because trump was cut from the leftover pile and only four cards plus the upcard are relevant. Exact computation needs the upcard. The useful habit is simpler: on a 1-card hand, an off-suit king loses to any trump and to the ace of its suit. Bid 0 more often than your ego wants.

In a 10-card hand you see 10 of 52, about 19% of the deck. Your trump count is information. Four trumps in ten cards is a long suit; the chance of being dealt four or more hearts when hearts are trump is the hypergeometric probability C(13,4)C(39,6)/C(52,10) plus the higher terms, on the order of 20%. You do not need the fraction at the table. You need to notice that four trumps plus an off ace is not a 2-bid. On a 7-card hand the same four-trump holding is stronger still, because fewer cards remain to beat you, and a 0-bid is harder because you will be forced to win something if those trumps are led.

A fair shuffle matters in a stakes game. [How to shuffle cards](/guides/how-to-shuffle-cards) covers why seven riffles is the usual benchmark.`,
    },
    {
      id: "pvp",
      title: "Exact bids, variance and a hashed PvP round",
      body: `Oh Hell rewards counting and memory, but the changing deal injects huge luck. A 1-card hand can swing 10 points on a single unseen ace. Over a 19-hand match that noise shrinks; over one evening it can decide the money.

PVPspinArena runs three player-vs-player games in USDC or ETH on Base: Jackpot, [Coinflip](/coinflip) and Roulette. Coinflip is a fair 50/50. Roulette returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee. There is no bid to hit. Results come from committed seeds, and any settled round can be verified on [fairness](/fairness) — the digital version of watching the cut.

If a friendly unit is climbing to recover a blobbed 0-bid, stop. Use [responsible gambling](/responsible-gambling). The game is optional and 18+.

See also [hearts](/guides/hearts-card-game-rules).`,
    },
  ],
  faqs: [
    {
      q: "How do you play the Oh Hell card game?",
      a: "Deal a changing number of cards, turn a leftover card for trump, bid the exact tricks you will take, then play. Score a bonus if you hit the bid. The dealer is often forbidden from making the total bids equal the number of tricks.",
    },
    {
      q: "Why can't the dealer bid certain numbers in Oh Hell?",
      a: "The dealer-constraint rule blocks a bid that would make the sum of all bids equal the cards in the hand, so at least one player must miss. Some groups skip this rule.",
    },
    {
      q: "How is Oh Hell scored?",
      a: "Two common methods: 10 plus tricks for an exact hit and 0 for a miss, or 1 point per trick plus 10 extra for an exact hit. Agree before you deal.",
    },
    {
      q: "How many players can play Oh Hell?",
      a: "Three to seven is standard. Four or five keeps hand sizes interesting without making the down-and-up last all night.",
    },
    {
      q: "Is Oh Hell the same as Nomination Whist?",
      a: "Often yes: British Nomination Whist of the 'big ships' type is essentially Oh Hell. The name Nomination Whist is also used for other bidding games, so ask which rules the table means.",
    },
  ],
  sources: [
    { label: "Pagat: Oh Hell!", url: "https://www.pagat.com/exact/ohhell.html" },
    { label: "Wikipedia: Oh hell", url: "https://en.wikipedia.org/wiki/Oh_hell" },
    { label: "Pagat: Nomination Whist", url: "https://www.pagat.com/whist/nomination.html" },
  ],
  related: [
    "how-to-play-spades",
    "how-to-play-euchre",
    "pitch-card-game",
    "52-card-deck",
    "bourre-card-game",
    "how-to-shuffle-cards",
    "hearts-card-game-rules",
  ],
  updated: "2026-09-27",
};
