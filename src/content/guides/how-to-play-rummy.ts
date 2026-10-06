import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-play-rummy",
  cluster: "Games of chance",
  keyword: "how to play rummy",
  secondary: ["rummy rules", "rummy card game", "rummy melds", "rummy scoring", "rummy variants"],
  title: "How to Play Rummy: Rules, Melds, Scoring and Variants",
  description:
    "How to play rummy: deal sizes, sets and runs, drawing and laying off, going out, scoring, draw odds and the main variants from Rummy 500 to Indian rummy.",
  h1: "How to play rummy: rules, melds, scoring and variants",
  answer:
    "How to play rummy: deal each player a hand (10 cards for two players, 7 for three or four). On your turn, draw from the stock or discard pile, lay down melds and discard one card. Melds are sets of three or four same-rank cards or runs of three or more in one suit. The first player to meld every card scores the cards left in opponents' hands.",
  facts: [
    "Basic rummy uses one 52-card deck for two to six players; ace is normally low.",
    "Deal 10 cards each for two players, 7 each for three or four, and 6 each for five or six.",
    "A set is three or four cards of one rank; a run is three or more consecutive cards of one suit.",
    "Face cards count 10, aces 1 and number cards their pip value when scoring leftover hands.",
    "Going out in a single turn with no earlier melds, called going rummy, usually doubles the score.",
  ],
  sections: [
    {
      id: "basics",
      title: "What rummy is and what you need",
      body: `Rummy is a family of draw-and-discard card games, not a single game. Every member shares one idea: improve your hand by drawing and discarding until you can arrange it into matched groups called melds. The version described here is basic rummy, sometimes called straight rummy or rum, which is the common ancestor most players learn first.

The origin of the family is debated. Conquian, played in Mexico and the southwestern United States in the 19th century, is often cited as an early rummy game, and card historians have proposed other roots. What is well documented is how far the idea spread: gin rummy, canasta, Rummy 500, contract rummy and Indian rummy all descend from the same draw-meld-discard loop.

You need:

- a standard [52-card deck](/guides/52-card-deck), jokers removed (some groups add them as wild cards);
- two to six players (with more than six, use two decks);
- paper for scores.

Cards rank K, Q, J, 10 down to 2, then ace. In basic rummy the ace is low, so A-2-3 of hearts is a run but Q-K-A is not. Some house rules allow the ace high as well; agree before the deal.

If you only ever play two-handed, the most popular variant is [gin rummy](/guides/how-to-play-gin-rummy), which has its own knocking and undercut rules. This page covers the base game and the variants built from it, all part of the [games of chance topic](/guides/topics/games-of-chance).`,
    },
    {
      id: "deal",
      title: "The deal and the turn sequence",
      body: `Choose the first dealer by cutting; low card usually deals. The deal then passes to the left after each hand. Shuffle, have the player to the right cut, and deal one card at a time clockwise.

| Players | Cards each |
| --- | --- |
| 2 | 10 |
| 3–4 | 7 |
| 5–6 | 6 |

Place the rest face down as the **stock** and turn the top card face up beside it to start the **discard pile**.

### Each turn has three steps

1. **Draw** one card: either the top card of the stock (unseen) or the top card of the discard pile (seen).
2. **Meld or lay off**, if you want to: place sets or runs face up in front of you, and add single cards to melds already on the table, yours or anyone else's.
3. **Discard** one card face up onto the discard pile. If you drew from the discard pile, you may not throw the same card straight back on that turn.

Play passes to the left. If the stock runs out before anyone goes out, turn the discard pile over without shuffling to form a new stock, and continue.

### Laying off

Laying off is what makes basic rummy different from gin. If an opponent has melded 5-6-7 of clubs and you hold the 8 of clubs, you can place it on their run during your turn. Laying off reduces the points you are caught with and moves you toward going out. Watch what opponents meld, because a card that looks useless in your hand may be playable on theirs.`,
    },
    {
      id: "melds",
      title: "Melds: sets, runs and what to keep",
      body: `There are two kinds of meld.

- **Set (group, book):** three or four cards of the same rank, such as 9♠ 9♥ 9♦.
- **Run (sequence):** three or more consecutive cards of the same suit, such as 4♥ 5♥ 6♥ 7♥.

A card can belong to only one meld at a time when you lay it down, though you can add cards to melds later.

### Counting your outs

Good rummy play is mostly about counting how many unseen cards help each partial meld, called outs. Consider three partial melds in a two-player game:

| Partial meld | Cards that complete it | Outs |
| --- | --- | --- |
| Pair: 7♣ 7♦ | 7♥, 7♠ | 2 |
| Open-ended run: 7♥ 8♥ | 6♥, 9♥ | 2 |
| Inside run: 7♥ 9♥ | 8♥ | 1 |
| Pair plus connector: 7♣ 7♦ 8♦ | 7♥, 7♠, 6♦, 9♦ | 4 |

After a two-player deal, 31 cards remain in the stock. If none of your outs has been seen, a single stock draw hits one of two outs with probability 2/31, about 6.5%, and one of four outs with probability 4/31, about 12.9%. Cards that serve two melds at once, like the 7♦ above, are the most valuable in your hand.

### What to discard

Throw high cards that do not connect with anything first, because a stranded king costs 10 points if an opponent goes out. Avoid discarding a card your left-hand neighbour just picked up a neighbour of; if they took the 6♠ from the pile, the 5♠ and 7♠ are dangerous.

### When to meld and when to hold

Laying melds down early protects you: those cards can no longer be caught in your hand if someone else goes out, and a melded king no longer costs 10. The downside is information. Once your run of 4-5-6 of diamonds is on the table, every opponent knows the 3 and 7 of diamonds are useful to you, and anyone holding them can lay them off on your meld to shed points themselves.

A reasonable rule of thumb:

- Meld early when your hand is full of high cards, or when an opponent has already laid down several melds and looks close to going out.
- Hold melds back when your hand is low in points and you are one or two cards from going rummy, since the doubled score is worth the risk.
- Always meld a set of four immediately; nobody can add to it, so holding it gives you nothing.

In games with three or more players, the risk of being caught rises, because any of several opponents can end the hand. Meld sooner as the table gets bigger.`,
    },
    {
      id: "scoring",
      title: "Going out and scoring a hand",
      body: `A player goes out by getting rid of every card, either by melding them all or by melding all but one and discarding the last. The hand ends immediately.

### Card values

| Cards | Points |
| --- | --- |
| K, Q, J | 10 each |
| 10 down to 2 | face value |
| Ace | 1 |

The player who went out scores the total value of all cards still held by every opponent. Melds already on the table do not count against their owners in basic rummy.

### Going rummy

If you go out in a single turn without having melded anything earlier in the hand, you have gone rummy, and most rules double your score for the hand. This rewards holding melds back when you are close, but it is risky: if someone else goes out first, you are caught with all those points.

### A worked hand

Three players. Ana goes out. Ben holds K♠ 9♦ 4♣ (23 points). Cara holds Q♥ Q♣ A♦ 3♠ (24 points). Ana scores 47. If Ana went rummy, she scores 94.

### Winning the game

Play to an agreed total, commonly 100 or 150 points, or play a fixed number of deals. With stakes, the usual settlement is a fixed rate per point of difference between each player and the winner.`,
    },
    {
      id: "variants",
      title: "Popular rummy variants",
      body: `Once you know the base game, most rummy variants are easy to pick up. The core changes are hand size, how the discard pile works, and how scoring counts.

| Variant | Key difference |
| --- | --- |
| Gin rummy | Two players, 10 cards, no melding until the hand ends; knock with 10 or less deadwood |
| Rummy 500 | You score the cards you meld and lose points for cards left in hand; you may take deep cards from the discard pile |
| Contract rummy (Kalooki, Shanghai) | Each deal requires a specific contract, such as two sets or a set and a run, before you may meld |
| Indian rummy | 13-card hands, two decks with jokers, and a valid hand needs two runs, at least one without wild cards |
| Canasta | Two decks, partnerships, seven-card melds called canastas |
| Oklahoma rummy | A gin variant where the upcard sets the knocking limit |

[Canasta rules](/guides/canasta-rules) and gin rummy each have a full guide because their scoring is very different from basic rummy.

### Rummy 500 in brief

In Rummy 500, every meld you lay down earns its card values, and cards left in your hand when someone goes out are subtracted. You may take any card from the discard pile, provided you take every card above it and immediately meld the deepest one you took. The first player to 500 wins. The full sheet is [rummy 500 rules](/guides/rummy-500-rules).

### Indian rummy and skill

Indian rummy is widely played online for money. Courts in India have long treated rummy as a game where skill predominates, which is why it is regulated differently from pure chance games there. Laws differ elsewhere, so check yours.`,
    },
    {
      id: "stakes",
      title: "Playing rummy for money",
      body: `Rummy is a classic home game for small stakes. Anyone playing for money should be 18 or older, or the local legal gambling age, and should check the rules on private gambling where they live.

Common settlement methods:

- **Per point:** each loser pays the winner a set rate for the points by which they trail, such as one cent per point.
- **Per game:** a fixed amount from each loser to the winner.
- **Per hand:** the player who goes out collects their hand score in cash immediately.

Rummy has meaningful skill, since counting outs, watching discards and managing high cards change results over many hands. The deal still decides individual hands, so a stronger player loses often in the short run. That balance is discussed in [skill-based gambling](/guides/skill-based-gambling). Keep stakes to an amount you have set aside in advance, as described in [gambling budget](/guides/gambling-budget), and if play starts to feel like chasing, use the tools on the [responsible gambling](/responsible-gambling) page.`,
    },
    {
      id: "pvp",
      title: "Draw odds and a hashed PvP round",
      body: `The outs arithmetic above is ordinary conditional probability: count the helpful unseen cards and divide by all unseen cards. It only works if the stock is truly random, which depends on an honest shuffle and cut.

PVPspinArena applies the same requirement to digital rounds. It runs three player-vs-player games: Jackpot, [Coinflip](/coinflip) and Roulette. A Coinflip is a fair 50/50 between two players. On Roulette's 33-slot wheel, Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee on average, about a 7.88% house edge on Purple or Silver after the 5% win fee. Results come from seeds committed before the round and revealed afterwards, so any settled round can be checked on the [fairness](/fairness) page, which plays the role of an honest cut.

The difference is skill. In rummy, good discards shift your odds over many hands. In a coin flip there is nothing to optimise, and [expected value in gambling](/guides/expected-value-gambling) explains how to price that entertainment.

See also [phase 10](/guides/phase-10-rules) and [tonk](/guides/tonk-card-game).`,
    },
  ],
  faqs: [
    {
      q: "How many cards do you get in rummy?",
      a: "In basic rummy, two players get 10 cards each, three or four players get 7 each, and five or six players get 6 each.",
    },
    {
      q: "Is the ace high or low in rummy?",
      a: "Low in standard basic rummy, so A-2-3 is a run and Q-K-A is not. Many house rules allow it high as well, so agree before playing.",
    },
    {
      q: "Can you go out by discarding in rummy?",
      a: "Yes. You may meld all but one card and discard the last one to go out, or meld every card without a final discard.",
    },
    {
      q: "What does going rummy mean?",
      a: "Melding your whole hand in one turn without any earlier melds that hand. Most rules double the points you score for it.",
    },
    {
      q: "What is the difference between rummy and gin rummy?",
      a: "Basic rummy lets you meld and lay off during the hand. Gin rummy is a two-player game where melds stay hidden until someone knocks with 10 or fewer deadwood points.",
    },
  ],
  sources: [
    { label: "Wikipedia: Rummy", url: "https://en.wikipedia.org/wiki/Rummy" },
    { label: "Pagat: Rummy rules", url: "https://www.pagat.com/rummy/rummy.html" },
    {
      label: "Bicycle Cards: how to play Rummy",
      url: "https://bicyclecards.com/how-to-play/rummy-rum",
    },
  ],
  related: [
    "how-to-play-gin-rummy",
    "canasta-rules",
    "52-card-deck",
    "31-card-game",
    "how-to-play-spades",
    "phase-10-rules",
  ],
  updated: "2026-09-27",
};
