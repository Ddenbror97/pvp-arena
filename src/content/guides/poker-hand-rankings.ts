import type { Guide } from "./types";

export const guide: Guide = {
  slug: "poker-hand-rankings",
  cluster: "Poker",
  keyword: "poker hand rankings",
  secondary: [
    "poker hands in order",
    "what beats what in poker",
    "poker kickers",
    "royal flush",
    "full house vs flush",
  ],
  title: "Poker Hand Rankings: High Card to Royal Flush",
  description:
    "Poker hand rankings from high card to royal flush, with kickers, ties and one table. Hold'em uses this list; casino side games may not.",
  h1: "Poker hand rankings: the ordered list, kickers and ties",
  answer:
    "Poker hand rankings are a fixed order of five-card categories: royal flush, straight flush, four of a kind, full house, flush, straight, three of a kind, two pair, one pair, then high card. Higher category always beats lower. Kickers break ties inside a category. Texas Hold'em uses this list at showdown. Some casino side games do not.",
  facts: [
    "A standard ranking compares exactly five cards; extra hole cards are unused except as kickers if they enter the five.",
    "A flush is any five suited cards; a straight is five ranks in sequence; A-2-3-4-5 is the wheel, the lowest straight.",
    "A full house (three plus a pair) beats a flush. That surprise is the most common ranking error.",
    "Identical five-card hands split the pot; suits do not rank at showdown in standard Hold'em.",
    "Three Card Poker and video poker use related categories but different paytables and sometimes different orders.",
  ],
  sections: [
    {
      id: "the-list",
      title: "The ranking table",
      body: `This [poker](/guides/topics/poker) page is the showdown list for standard five-card poker, including Texas Hold'em. It is for adults 18+. Memorise the order before you memorise any tip.

| Rank | Hand | Example | Beats |
| --- | --- | --- | --- |
| 1 | Royal flush | A♠ K♠ Q♠ J♠ 10♠ | Everything |
| 2 | Straight flush | 9♥ 8♥ 7♥ 6♥ 5♥ | Four of a kind and below |
| 3 | Four of a kind | 8♣ 8♦ 8♥ 8♠ K♦ | Full house and below |
| 4 | Full house | Q♣ Q♦ Q♠ 4♥ 4♣ | Flush and below |
| 5 | Flush | K♣ J♣ 9♣ 6♣ 2♣ | Straight and below |
| 6 | Straight | 10♠ 9♦ 8♣ 7♥ 6♠ | Trips and below |
| 7 | Three of a kind | 7♠ 7♦ 7♣ A♥ 3♣ | Two pair and below |
| 8 | Two pair | A♠ A♦ 5♣ 5♥ 9♦ | One pair and below |
| 9 | One pair | K♣ K♦ 10♠ 8♥ 2♣ | High card |
| 10 | High card | A♦ J♣ 9♠ 6♥ 3♣ | Only a worse high card |

Suits do not break ties in Hold'em. A spade flush and a heart flush compare by rank of the five cards, not by suit name. If you learned “spades are highest” from a different game, leave that rule at the door.

Read the example column out loud once. “Kings full of fours” is a full house: three kings, two fours. “Nines full of aces” beats “eights full of aces” because you compare the trips first. People reverse that under pressure. Slow down at showdown. Name the trips, then the pair. If both match, it is a split. That ten-second habit saves more money than another mnemonic.

The [how to play poker](/guides/how-to-play-poker) pillar is the streets. This page is only what those streets are fighting over.

### Why the order is this order

The list is not a popularity contest. It is rarity under a 52-card deck when you make five-card hands. Four of a kind is rarer than a full house, so it ranks higher. A flush is rarer than a straight, so it ranks higher. A royal flush is a named straight flush: ace-high, same suit. You do not need the combinatorics to play. You need the order automatic when the board pairs and someone tables a boat.

If a home game reverses flushes and straights, that is a house rule, not “real poker”. Ask before you sit. Online Hold'em will not reverse them for you.

Omaha uses this same list with four hole cards. [Omaha poker rules](/guides/omaha-poker-rules) is that deal. Stud deals a different number of cards face up. [Seven card stud](/guides/seven-card-stud) is that game.`,
    },
    {
      id: "kickers",
      title: "Kickers, boards and five-card maths",
      body: `A kicker is a leftover card that is part of your five-card hand when the main category is tied. If two players have a pair of aces, the next three cards in each five-card hand decide it. The fourth hole card that did not make the five does not play.

### Board pairs everyone

If the board is A♣ A♦ 9♠ 6♥ 2♣ and you hold K♠ 8♦, your hand is aces with king-nine-six. An opponent with K♥ 7♣ has the same five-card hand once the board supplies the rest. You split. An opponent with Q♠ Q♦ has two pair, aces and queens, and wins.

### You do not always use both hole cards

On a four-flush board, one suited hole card can complete a flush. The other hole card is idle. On a paired board, two pair may be “board pair plus your pair”. Read five cards, not two.

### Ace in straights

Ace can sit high (10-J-Q-K-A) or low (A-2-3-4-5). It cannot wrap (Q-K-A-2-3 is not a straight).

### Naming the nuts

Before you bet a river, name the best possible five-card hand given this board. That hand is the nuts. If the board is 9♣ 8♣ 7♣ 2♦ 2♠, a club flush is not automatically the nuts — a nine-high straight flush is, and a full house or quads can also exist. If you cannot name the nuts, you cannot know whether you are betting for value or bluffing into a hand that never folds.

Practice on folded hands. Watch the board, name the nuts, then see what people table. Ten orbits of that drill beats another ranking mnemonic. You already have the table. Use it as a naming tool, not as wallpaper.`,
    },
    {
      id: "example",
      title: "Worked example: an $80 pot and a kicker",
      body: `This is the only numeric example on this page.

Pot $80. Board: K♠ 9♦ 9♣ 4♥ 2♠. You table A♣ K♦ (two pair, kings and nines, ace kicker). Opponent tables K♣ Q♠ (two pair, kings and nines, queen kicker).

Your five-card hand: K-K-9-9-A. Theirs: K-K-9-9-Q. Ace beats queen. You win $80.

If the opponent had A♦ Q♣, both five-card hands are K-K-9-9-A. Split $40 each.

If the opponent had 9♥ 8♥, they have three nines. Trips beat two pair. You lose $80.

That is the whole job of rankings: name the category, then compare the five cards. Feelings about “I had top pair” do not appear in the list. [Texas Hold'em rules](/guides/texas-holdem-rules) explain when you even get to table those cards.`,
    },
    {
      id: "common-errors",
      title: "Ranking errors that cost pots",
      body: `These mistakes show up at low-stakes tables every night.

- **Flush over full house.** A pretty flush still loses to three-plus-a-pair. Look at paired boards.
- **Counting six cards.** Poker hands are five. A sixth ace in your hand is not a sixth card in the ranking.
- **Two pair versus a higher two pair.** Aces and twos lose to kings and queens? No. Aces and twos beat kings and queens. Compare the top pair first, then the second pair, then the kicker.
- **Straight on a paired board you ignored.** You can have a straight and still lose to a boat. Name both hands before you cheer.
- **“I had a pair in my hand.”** A pair of threes in the hole loses to a pair of kings on the board that everyone shares, unless you improve the five-card mix.

### Casino games that look similar

[Video poker paytables](/guides/video-poker-paytables) pay a posted schedule for five-card categories. That is a house game. [Three Card Poker strategy](/guides/three-card-poker-strategy) uses a three-card order and ante bonuses. Do not export Hold'em folklore onto those felts. They are not the same ranking job.

Omaha high uses this same list but you must use exactly two hole cards and three board cards. A flush in your hand with one suit on the board is not a flush. Short-deck (six-plus) often ranks a flush above a full house because the stripped deck changes frequencies. If the sticker says short-deck, ask for that order before you put a chip in. This page will not save you from a ranking you refused to read.`,
    },
    {
      id: "ties-and-chops",
      title: "Ties, chops and what does not rank",
      body: `### True ties

If the five cards match in rank, the pot splits. Suits are not a tie-breaker in standard Hold'em. Some home games invent suit orders. Casino and online Hold'em generally do not.

### The unused hole card

If the board is the nut flush and you both played one spade, the second hole card is compared only if it is among the five. On a five-spade board, everyone who saw the river plays the same flush unless they can make a straight flush with a hole card. Often the pot chops.

### Lowball and other lists

Omaha, short-deck, and deuce-to-seven lowball change what is possible or reverse the order. If the table is not Hold'em, ask for that game's chart. This page is the common high-hand list.

### Why this still matters if you never see a showdown

Most pots end with a fold. Rankings still matter because they tell you what you are representing and what you are afraid of. If you cannot name the nuts on this board, you cannot price a bluff or a call. [Poker pot odds](/guides/poker-pot-odds) need a hand to be drawing at.`,
    },
    {
      id: "not-a-system",
      title: "A ranking list is not a winning system",
      body: `Knowing that a flush beats a straight does not make you plus-EV. It stops you from mucking a winner and from stacking off with a loser you misread. The rest is selection, position, sizing, rake and a sample large enough that [variance in gambling](/guides/variance-in-gambling) does not look like a personality.

PVPspinArena does not use this list. There is no showdown on [Roulette](/roulette). A colour pays a posted multiplier. If you came here from a hashed PvP lobby, keep the products separate: rankings for rooms that deal cards, posted prices for this site.

[Expected value](/guides/expected-value-gambling) is how you price a call once you know what you are drawing to. Rankings tell you whether that draw is a flush or a gutshot. They do not tell you to call.

### What a ranking list cannot do

It cannot tell you whether to bluff. It cannot tell you whether a pair is good. It cannot tell you the rake. It cannot make a short sample honest. People who memorise the list and then call every river “because I had two pair” have the category and missed the board. Two pair on a four-straight, four-flush board is often third-best. The list is necessary. It is not sufficient.

If you want the streets that produce these hands, stay in this cluster. If you want a hashed colour or a pot without a showdown, leave the list behind and read the posted price. Mixing the two is how someone says “I had a flush” about a 14x Green. You did not. You had a colour.`,
    },
    {
      id: "summary",
      title: "Summary: name five cards, then stop arguing",
      body: `Poker hand rankings are an ordered catalogue. Higher category wins. Kickers break ties. Suits do not. Full houses beat flushes. Five cards, not six.

Use the table at showdown and when you name the nuts. Use a budget when you sit. PVPspinArena is not a poker room. If rankings became a reason to chase “one more hand” you cannot afford, stop. Read [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). This cluster is 18+.

If you remember only three lines: full house beats flush, five cards not six, suits do not break ties. Those three stop the expensive misreads. The rest of the table is still worth memorising. Those three are worth not arguing about at 1 a.m. Name the five cards, push the pot, and sit the next hand only if the note says you still can.

How often those hands show up, and what they are worth, is [poker math](/guides/poker-math).`,
    },
  ],
  faqs: [
    {
      q: "Does a flush beat a full house?",
      a: "No. A full house ranks above a flush in standard poker hand rankings, including Texas Hold'em.",
    },
    {
      q: "Do suits matter in Hold'em rankings?",
      a: "Suits make flushes and straight flushes. They do not break ties between otherwise identical five-card hands.",
    },
    {
      q: "What is a kicker?",
      a: "A card in your five-card hand that is not part of the main pair or trips, used to break ties when the category matches.",
    },
    {
      q: "Is A-2-3-4-5 a straight?",
      a: "Yes. It is the lowest straight, often called the wheel. Ace can also play high in 10-J-Q-K-A.",
    },
    {
      q: "Do video poker and Three Card Poker use this exact list?",
      a: "They use related five-card or three-card categories, but paytables and some orders differ. Treat those as house games with posted charts.",
    },
    {
      q: "Does PVPspinArena use poker hand rankings?",
      a: "No. This site does not deal poker. Jackpot, Coinflip and Roulette pay posted pot or colour prices.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: List of poker hands",
      url: "https://en.wikipedia.org/wiki/List_of_poker_hands",
    },
    { label: "Wikipedia: Texas hold 'em", url: "https://en.wikipedia.org/wiki/Texas_hold_%27em" },
    { label: "Wizard of Odds: video poker", url: "https://wizardofodds.com/games/video-poker/" },
  ],
  related: [
    "how-to-play-poker",
    "texas-holdem-rules",
    "poker-for-beginners",
    "video-poker-paytables",
    "three-card-poker-strategy",
    "poker-math",
  ],
  updated: "2026-09-26",
};
