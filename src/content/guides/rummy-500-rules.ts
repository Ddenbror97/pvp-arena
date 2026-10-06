import type { Guide } from "./types";

export const guide: Guide = {
  slug: "rummy-500-rules",
  cluster: "Games of chance",
  keyword: "rummy 500 rules",
  secondary: ["500 rum", "rummy 500 scoring", "500 rummy discard pile", "rummy 500 going out"],
  title: "Rummy 500 Rules: Melds, Score and Going Out",
  description:
    "Rummy 500 rules race to 500 points with melds you can lay off. See the deal, the score for aces, and how going out ends the hand.",
  h1: "Rummy 500 rules: melds, score and going out",
  answer:
    "Rummy 500 rules race to 500 points. You draw, meld sets and runs, lay off on melds already on the table, and the hand ends when someone goes out. A common score counts face cards at 10 and aces at 15. A common discard rule lets you take cards from the pile only when you use the card you reached immediately. House sheets differ, so agree before the deal.",
  facts: [
    "500 rum, also called rummy 500, is a rummy variant for 2 to 8 players. Three to five is the count most write-ups prefer.",
    "A standard 52-card deck is enough for up to four players. Use two decks when five or more play. Jokers are optional.",
    "Deal 13 cards each to two players, and 7 cards each when three or more play.",
    "A common rule: you may take the top discard only if you meld or lay it off immediately. Reaching deeper means taking every card above the one you use.",
    "A common score counts jacks, queens, and kings at 10, and aces at 15. Pip cards are face value on some sheets and 5 each on others.",
    "When a player goes out, the hand ends. Each player adds meld points and subtracts cards left in hand. First to 500 wins.",
  ],
  sections: [
    {
      id: "what",
      title: "What rummy 500 adds to basic rummy",
      body: `Rummy 500 is still a draw-and-meld game. If you have never melded a set or a run, read [how to play rummy](/guides/how-to-play-rummy) first. That page is the basic loop: draw one, lay sets and runs, discard one, and score the cards opponents have left. This page is the variant that races to 500 and keeps a running score of the cards you have melded, not only a score at the end.

Wikipedia lists the names 500 rum, pinochle rummy, rummy 500, and 500 rummy for the same family, and notes that canasta later grew out of this kind of melding game. The distinctive idea is that each player scores the value of the cards they lay down. You can be ahead before anyone goes out. You can also go backward, because cards still in your hand are subtracted when the hand ends.

Layoff is the other daily difference. In the common version you may add cards to melds already on the table, including melds another player owns. The cards you lay off stay in front of you and score for you. You are not donating points to the person who started the meld. Some houses forbid laying off on opponents. That is a different game, closer to keeping your melds private. [Hand and foot](/guides/hand-and-foot-rules) is a further step away: a partnership, two piles each, and books of seven, not a race to 500. Say which version you are playing.

The game sits with the other draw-and-meld games in the [games of chance topic](/guides/topics/games-of-chance). Nothing on this page changes the basic rummy deal chart or the gin knocking rules. Those stay on their own pages.`,
    },
    {
      id: "deal",
      title: "The deck, the deal and the stock",
      body: `Use one 52-card deck for two, three, or four players. Wikipedia notes that five or more players should use two decks, 104 cards, or 108 if you are also using jokers. Shuffle. The player to the dealer's right may cut. Deal one card at a time, clockwise, starting at the dealer's left.

### How many cards

- Two players: **13** cards each.
- Three or more: **7** cards each.

That split is the one Wikipedia and Bicycle both publish. Do not deal 13 to a five-player table or the stock vanishes. Do not deal 7 to two players unless your house has said it wants a shorter hand. A two-player game with 13 cards is the common published version, and it plays closer to a long meld hand than to a seven-card sprint.

Place the rest face down as the stock. Turn the top card face up beside it. That upcard starts the discard pile. Spread the discard pile slightly as it grows so players can see the order. Players may look through the pile. They may not reorder it. The order is the rule that makes a deep pickup legal or illegal.

A variation deals one extra card to the player on the dealer's left, who then chooses the first upcard from their hand. Skip that unless you agreed it. The plain turn of the stock's top card is enough.`,
    },
    {
      id: "melds",
      title: "Sets, runs and laying off",
      body: `A set is three or four cards of the same rank. A run is three or more cards in sequence in one suit. Four of a kind is a set, not a requirement. You may lay more than one meld on the same turn.

The ace is high or low. Queen-king-ace is a run, and ace-2-3 is a run. King-ace-2 is not, unless the house allows that corner. One ace cannot be high and low at the same time.

You meld after you draw and before you discard. Cards you lay down stay face up in front of you. On later turns you may add to your own melds. In the common version you may also lay off on other players' melds: a 7 on a set of 7s, or the 6 and 7 of spades on a spade run that already shows 8, 9, 10. A single card is a legal layoff. It is not, by itself, a new meld. You need three cards to start a set or a run.

[Gin rummy](/guides/how-to-play-gin-rummy) is the two-player cousin that does not use this layoff table and does not race to 500. In gin you knock, you do not build a public meld pile all night. If your table wants a private hand and a knock, play gin. If your table wants points for every card on the table, stay with 500.`,
    },
    {
      id: "discard",
      title: "Taking the discard pile",
      body: `The discard pile is the part beginners misplay, because basic rummy only offers the top card, and you may keep it in your hand. Rummy 500 is stricter about using what you take, and more generous about how deep you may reach.

### The short form

You may take the top card of the discard pile if you use that card immediately in a meld or a layoff. If you cannot or will not use it now, draw from the stock instead. You do not take the top card for later.

The common published extension, on both the Bicycle sheet and the Wikipedia summary, lets you reach a buried card. You must take every card above the one you want, and you must use the card you reached immediately in a set, a run, or a layoff. The cards that were above it may be melded on that same turn or added to your hand. They are not all required to be melded. Only the card you reached has to be used at once.

Example. The pile, from the bottom up, shows 6, then 4, then queen. You hold two 4s. You may take the queen and the 4, because the queen is above the 4, and you must meld the 4 at once with the pair in your hand. The queen can sit in your hand. You may not take the 4 and leave the queen on the pile. You may not take the 4, fail to meld it, and call it a draw.`,
    },
    {
      id: "score",
      title: "Face cards at 10 and aces at 15",
      body: `Score the cards on the table in front of you, not the cards you wish you had melded. A common version, the one to teach first, uses:

| Card | Points in a common version |
| --- | --- |
| Ace, played high or in a set | 15 |
| Ace, played low in A-2-3 | 1 on many sheets, 15 on others |
| King, queen, jack, and 10 | 10 |
| 2 through 9 | Face value, or 5 each if the house says so |
| Joker, if you use one | 15 |

Pagat's sheet is the face-value pip line: 2 through 10 score their pips, face cards score 10, ace and joker score 15, and an ace in A-2-3 scores 1 instead of 15. Wikipedia's main summary scores ace through 9 at 5 unless the ace is played high, in which case the ace is 15, and it scores the 10 and the face cards at 10. Both are real published sheets. They change whether a run of low cards is worth laying down. Face value rewards a 9 more than a 3. The all-fives sheet does not.

Say the sentence before the deal: "Aces are 15, low ace in A-2-3 is 1, faces and tens are 10, other cards are face value." That is the Pagat-style common version this page recommends when the table has no habit of its own. If someone at the table grew up on "everything under 10 is 5," you can play that instead. You cannot play both on the same hand.`,
    },
    {
      id: "going-out",
      title: "Going out ends the hand",
      body: `The hand ends immediately when a player gets rid of every card, either by melding the last card or, on sheets that require a final discard, by discarding it. Play stops. Nobody else gets a consolation layoff, unless you adopted that extra beat on purpose. The common version stops.

Bicycle's sheet scores each player as follows. Add the points showing on the table in front of that player. Subtract the points still in that player's hand. The difference, which can be negative, is added to the running total. The player who went out has an empty hand, so they only add. Everyone else may lose more than they gained on the melds.

Example. You have 85 points on the table and 90 in your hand when someone else goes out. You score minus 5 for the hand. A player with 40 on the table and a 10 left in hand scores plus 30. Small melds with a clean hand beat a fat hand that never laid off.

The first player to reach 500 wins. If two or more players cross 500 on the same hand, the sheets disagree, so agree this with the scoring sentence. Bicycle: the higher score wins. Wikipedia's main summary: the player who went out wins the tie. A third house plays one more hand. Pick one. The higher-score rule needs no extra deal and still rewards the melds.`,
    },
    {
      id: "houses",
      title: "House rules worth naming once",
      body: `The arguments are predictable. Name them and then deal.

- Pip cards: face value, or 5 each.
- Low ace in A-2-3: 1 point, or 15.
- Around-the-corner runs: off, unless you want them.
- Deep discard: allowed, with every card above the one you use, or top card only.
- A pickup that is only a one-card layoff: allowed, or banned.
- Final discard required to go out: yes or no.
- Tie at 500: higher score, or the player who went out.
- Jokers: out, or in as wild cards worth 15.
- Layoffs on opponents: allowed and scored by the player who plays them.

Write the answers on the score sheet. A 500-point game is long enough that a fuzzy ace will be worth a real argument by the fourth hand.

[Canasta rules](/guides/canasta-rules) are the descendant that locked melding into partnership books, wild twos, and a much larger pack. You do not need those rules to finish a game of 500. [Phase 10 rules](/guides/phase-10-rules) demand a different contract every hand. Phase 10 is not "500 with phases." If the table wants one scoring target and open layoffs, keep this sheet.

The [about page](/about) is the short note on this site if you arrived here from a search and wanted the card game rather than a casino table. Bring a deck, a pad, and the nine answers above. First to 500.`,
    },
  ],
  faqs: [
    {
      q: "How many cards are dealt in rummy 500?",
      a: "Deal 13 cards each when two people play, and 7 cards each when three or more play. Use one 52-card deck for up to four players and two decks for five or more. Jokers are optional. The rest of the cards form the stock, and one upcard starts the discard pile.",
    },
    {
      q: "Can you take the whole discard pile?",
      a: "A common rule lets you take the top card only if you use it immediately in a meld or layoff. The usual extension lets you take a buried card if you also take every card above it and meld the card you reached on that turn. Cards above it may stay in your hand. If you will not use the card now, draw from the stock.",
    },
    {
      q: "How much is an ace worth?",
      a: "A common version counts an ace at 15, and counts an ace melded low in A-2-3 at 1. Face cards and tens count 10. Another published sheet counts ace through 9 at 5 unless the ace is high, in which case it is 15. Agree before the deal. An ace left in hand counts 15.",
    },
    {
      q: "Who scores a card you lay off?",
      a: "In the common version, you do. Lay the card in front of yourself, on the matching set or run, and it counts in your total. Some houses give the points to the player who owns the original meld. Say which practice you use before the first layoff, and keep the cards in that player's fan.",
    },
    {
      q: "What if two players pass 500 on the same hand?",
      a: "The hand still ends when someone goes out, and both scores are recorded. Bicycle's sheet gives the game to the higher score. Wikipedia's summary gives it to the player who went out. A house may play one more hand instead. Agree the tie before you start, not when both totals cross 500.",
    },
  ],
  sources: [
    { label: "Wikipedia: 500 rum", url: "https://en.wikipedia.org/wiki/500_rum" },
    { label: "Bicycle Cards: 500 Rum", url: "https://bicyclecards.com/how-to-play/500-rum/" },
    { label: "Pagat: 500 Rummy", url: "https://www.pagat.com/rummy/500rum.html" },
  ],
  related: ["how-to-play-rummy", "hand-and-foot-rules", "how-to-play-gin-rummy", "canasta-rules"],
  updated: "2026-09-29",
  howTo: true,
};
