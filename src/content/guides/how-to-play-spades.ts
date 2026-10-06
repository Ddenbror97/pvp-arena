import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-play-spades",
  cluster: "Games of chance",
  keyword: "how to play spades",
  secondary: [
    "spades rules",
    "spades card game",
    "spades bidding",
    "spades nil bid",
    "spades scoring",
  ],
  title: "How to Play Spades: Rules, Bidding, Nil and Scoring",
  description:
    "How to play Spades: the deal, trick rules, bidding, nil and blind nil, bags, scoring to 500, worked hands and sensible rules for adult stakes games.",
  h1: "How to play Spades: rules, bidding, nil and scoring",
  answer:
    "How to play Spades: four players in two partnerships are dealt 13 cards each from a 52-card deck. Spades are always trump. Each player bids how many tricks they expect to win, and partners add their bids into one contract. Make the contract and you score ten points per bid trick plus one per overtrick; fall short and you lose ten per bid trick. First team to 500 wins.",
  facts: [
    "Spades uses a standard 52-card deck, ace high, with spades as permanent trump.",
    "Four players, two partnerships sitting opposite each other, 13 cards each and 13 tricks per hand.",
    "A made contract scores 10 points per bid trick; each overtrick is a bag worth 1 point.",
    "Ten accumulated bags cost 100 points, which is why overbidding and underbidding both hurt.",
    "A nil bid is worth +100 or −100; blind nil, bid before looking, is usually worth ±200.",
  ],
  sections: [
    {
      id: "basics",
      title: "What Spades is and what you need",
      body: `Spades is a partnership trick-taking game from the whist family. It is commonly dated to the United States in the late 1930s and spread widely through college dorms and the armed forces in the following decades. Today it is one of the most-played card games in North America, both at kitchen tables and in online apps.

You need four players, a standard [52-card deck](/guides/52-card-deck) with jokers removed, and a score sheet. Partners sit opposite each other, so play alternates between the two teams around the table. Cards rank from ace (high) down to two (low) in every suit.

Three rules make Spades different from plain whist:

- **Spades are always trump.** No suit is chosen per hand; any spade beats any card of another suit.
- **Everyone bids.** Each player names a number of tricks, and the partnership's bids combine into one contract.
- **Overtricks are penalised over time.** Winning more than you bid is not free, because those extra tricks (bags) pile up into a 100-point penalty.

The result is a game where the deal decides a lot, but judgement decides more. Counting your likely tricks, protecting a partner's nil and managing bags are skills that separate regular winners from casual players. Spades sits beside [Oh Hell](/guides/oh-hell-card-game), which uses exact bidding, and [euchre](/guides/how-to-play-euchre), which uses a short deck, in the [games of chance topic](/guides/topics/games-of-chance).`,
    },
    {
      id: "play",
      title: "The deal and the rules of trick play",
      body: `The first dealer is chosen by any agreed method, often high card. The deal then rotates clockwise. The dealer shuffles, the player to the right cuts, and cards are dealt one at a time face down until each player holds 13. A clean shuffle matters in a stakes game; see [how to shuffle cards](/guides/how-to-shuffle-cards) for why seven riffles is the usual benchmark.

### Leading and following

The player to the dealer's left leads the first trick. (Some groups play that the holder of the two of clubs leads it instead; agree before you start.) Play continues clockwise, one card per player.

1. You must follow the suit that was led if you can.
2. If you cannot follow suit, you may play any card, including a spade.
3. The trick is won by the highest spade played, or, if no spade was played, by the highest card of the suit led.
4. The winner of a trick leads the next one.

### Breaking spades

You may not lead a spade until spades have been "broken", meaning a spade has been played on an earlier trick because someone could not follow suit. The exception is a player who holds nothing but spades; they may lead one. This rule stops a player with a long spade suit from simply drawing trumps from the first trick.

### A worked trick

Hearts are led with the 9. The next player has hearts and plays the king. The third player is void in hearts and plays the 3 of spades. The fourth plays the ace of hearts. The 3 of spades wins, because any spade beats any heart, and spades are now broken for the rest of the hand.`,
    },
    {
      id: "bidding",
      title: "Bidding: how to count your tricks",
      body: `After the deal, bidding starts with the player to the dealer's left and goes clockwise once. Each player bids a number from 0 to 13. There is no overcalling as in bridge; each person gets one bid, and partners simply add theirs together. If North bids 4 and South bids 3, the North–South contract is 7 tricks.

### A practical valuation method

There is no single official formula, but most experienced players count roughly like this:

| Holding | Typical value |
| --- | --- |
| Ace of a side suit | 1 trick |
| King with at least one small card in the same suit | about half to one trick |
| Ace, king or queen of spades | 1 trick each, if the spade is protected by smaller spades |
| Each spade beyond the third | about 1 trick, since long spades win late |
| A void or singleton in a side suit, with spare spades | extra ruffing tricks |

Kings and queens lose value when you have long holdings in the suit, because opponents run out and trump them.

### Some useful numbers

Each player holds 13 of the 52 cards, so the average spade holding is 13 × 13/52 = 3.25 spades. The chance of being dealt no spades at all is C(39,13) / C(52,13), about 1.28%, or roughly one hand in 78. The chance of holding five or more spades is about 17.6%, and four spades about 23.9%. That is why a hand with six spades headed by the ace and king is a strong bid of four or more: those spades will usually win once shorter holdings are exhausted.

Bid what you expect to win, not what you hope to win. The combined contract must be made by the team, so a partner who can reliably take three tricks is worth more than one who guesses five and often takes three.`,
    },
    {
      id: "nil",
      title: "Nil and blind nil",
      body: `A player may bid **nil**, meaning zero tricks. Nil is a personal contract. The partner still bids normally, and the two contracts are scored separately.

- A successful nil scores +100 for the team.
- A failed nil (the nil bidder takes one or more tricks) scores −100.
- The partner's own bid is scored as usual. Tricks taken by a failed nil bidder do not count toward the partner's contract in the most common rules, though they may still count as bags. House rules vary here, so settle it before play.

**Blind nil** is bid before you look at your cards and is usually worth ±200. Many groups allow it only when a team is behind by 100 points or more, and some allow the blind nil bidder to exchange two cards with their partner.

### What makes a good nil hand

You want low cards and short suits: twos, threes and fours, no aces, few high spades, and ideally a void in a side suit so you can discard high cards when that suit is led. A lone ace of spades is almost always fatal, because it will win any trick it is played on.

### Covering a partner's nil

The nil bidder's partner plays to protect them. Lead high in suits where your partner is likely to hold middling cards, play above your partner when possible, and avoid forcing them to follow with a card that must win. A partner's successful nil is worth as much as a ten-trick contract, so it is often right to give up a trick or two of your own to secure it.`,
    },
    {
      id: "scoring",
      title: "Scoring, bags and winning the game",
      body: `At the end of each hand, each team counts the tricks won by both partners (excluding a nil bidder's tricks, depending on house rules) and compares the total with its contract.

| Result | Score |
| --- | --- |
| Contract made exactly | +10 × bid |
| Contract made with overtricks | +10 × bid, +1 per overtrick (bag) |
| Contract failed (set) | −10 × bid |
| Nil made / failed | +100 / −100 |
| Blind nil made / failed | +200 / −200 |
| Every 10 bags accumulated | −100, and the bag count resets |

### A worked hand

North bids 4 and South bids 3, for a contract of 7. East bids 2 and West bids nil.

- North–South take 8 tricks. They score 70 + 1 bag = 71.
- East takes 4 tricks and West takes 1. West's nil fails: −100. East's 2-trick contract is made with 2 bags: +22.
- East–West net −78 for the hand.

### Why bags matter

If a team's running bag total goes from 8 to 11 on a hand, it loses 100 points and carries 1 bag forward. A team that habitually underbids by two tricks per hand hits that penalty every five hands, which cancels roughly one made contract of 10. The best bid is the one you expect to make exactly.

### Ending the game

The usual target is 500 points. If both teams pass 500 on the same hand, the higher score wins. Many tables also end the game when a team falls to −200. Shorter games to 250 or 300 are common in casual play.`,
    },
    {
      id: "stakes",
      title: "Playing Spades for stakes",
      body: `Spades is widely played for small stakes among friends. Where money is involved, every player should be 18 or older, or the legal gambling age where you live, and local laws on private gambling apply. Common formats are:

- **Per game:** the losing team pays a fixed amount to the winning team.
- **Per point margin:** the losers pay a set rate per 100 points of difference, for example $1 per 100 points, rounded to the nearest 10.
- **Bonus for a set:** an extra unit paid when a team is set on a contract of 8 or more, which rewards aggressive but accurate bidding.

Write the house rules down before the first deal: who leads first, whether nil tricks count for the partner, whether blind nil is allowed and when, the bag penalty and the target score. Most arguments in stakes Spades come from rules that were never agreed.

### Luck versus skill

Over a single hand, the deal dominates. Over dozens of games, bidding accuracy and partnership play show up clearly. That mix is similar to other games covered in [skill-based gambling](/guides/skill-based-gambling): a strong pair can still lose an evening. Size stakes so a bad run is irrelevant, using the approach in [gambling budget](/guides/gambling-budget). If stakes are rising to win back losses, pause and use the tools on the [responsible gambling](/responsible-gambling) page.`,
    },
    {
      id: "pvp",
      title: "From a card table to a hashed PvP round",
      body: `Spades shows two forces that appear in every wager: randomness from the deal and decisions made by players. A fair game needs a fair shuffle that nobody can steer, which is why card clubs use cuts, fresh decks and rotating dealers.

PVPspinArena runs three player-vs-player games with no card skill involved: Jackpot, [Coinflip](/coinflip) and Roulette. A Coinflip is a straight 50/50 between two players. Roulette is a shared 33-slot wheel where Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Instead of a dealer's shuffle, each result comes from committed seeds that are revealed after the round, and any settled round can be checked on the [fairness](/fairness) page. The idea is the same as an honest cut of the cards: nobody should be able to know or change the outcome before bets close.

The difference is that Spades rewards skill over many hands, while a coin flip has no skill edge to find. Treat any money game as entertainment with a cost, and read [expected value in gambling](/guides/expected-value-gambling) if you want to put numbers on that cost.

In the same cluster, see also [how to play rummy](/guides/how-to-play-rummy) and [how to play gin rummy](/guides/how-to-play-gin-rummy).

See also [hearts](/guides/hearts-card-game-rules).`,
    },
  ],
  faqs: [
    {
      q: "How many cards do you deal in Spades?",
      a: "With four players you deal all 52 cards, 13 to each player, one at a time clockwise starting from the dealer's left.",
    },
    {
      q: "Can you lead spades on the first trick?",
      a: "Not under standard rules. Spades cannot be led until one has been played on an earlier trick, unless the leader holds only spades.",
    },
    {
      q: "What happens if you get 10 bags in Spades?",
      a: "Your team loses 100 points and the bag count resets. Any bags beyond ten carry forward toward the next penalty.",
    },
    {
      q: "How much is a nil bid worth in Spades?",
      a: "Usually 100 points if you take no tricks and minus 100 if you take any. Blind nil, bid before looking at your cards, is usually worth 200 either way.",
    },
    {
      q: "What score do you play Spades to?",
      a: "The common target is 500 points. Casual games often play to 250 or 300, and many groups also end the game if a team drops to minus 200.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Spades (card game)",
      url: "https://en.wikipedia.org/wiki/Spades_(card_game)",
    },
    { label: "Pagat: Spades rules", url: "https://www.pagat.com/auctionwhist/spades.html" },
    {
      label: "Bicycle Cards: how to play Spades",
      url: "https://bicyclecards.com/how-to-play/spades",
    },
  ],
  related: [
    "how-to-play-euchre",
    "oh-hell-card-game",
    "pitch-card-game",
    "52-card-deck",
    "how-to-shuffle-cards",
    "how-to-play-rummy",
    "how-to-play-gin-rummy",
    "hearts-card-game-rules",
  ],
  updated: "2026-09-27",
};
