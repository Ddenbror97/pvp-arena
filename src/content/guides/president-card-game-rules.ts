import type { Guide } from "./types";

export const guide: Guide = {
  slug: "president-card-game-rules",
  cluster: "Games of chance",
  keyword: "president card game",
  secondary: [
    "president card game rules",
    "scum card game",
    "asshole card game",
    "climbing card game",
  ],
  title: "President Card Game Rules and Card Ranks | PvP Spin Arena",
  description:
    "President card game rules: 2s or aces high, how sets are beaten, who is president and scum, and the card exchange before the next hand.",
  h1: "President card game: ranks, shedding and the card exchange",
  answer:
    "The president card game is a shedding game for about four to seven players, also called Scum or Asshole. Play cards equal to or higher than the current play, in sets of the same count. In a common ranking the 2 is high and the ace is next. Another common ranking makes the ace high and the 2 low. The first player out is President. The last player with cards is Scum. Before the next hand, Scum gives their best cards to the President and receives low cards back, often two cards. Revolution and skip rules vary by house.",
  facts: [
    "Four to seven players is the usual game. Use a 52-card deck, and add jokers as the highest cards when the table is larger.",
    "Suits do not matter. A pair beats nothing unless the previous play was also a pair.",
    "A common rank order, high to low, is 2, ace, king, queen, jack, 10, down to 3.",
    "The other common order makes ace high and 2 low, with king under the ace.",
    "First player with no cards is President. Last player holding cards is Scum.",
    "The card exchange is the status rule: Scum passes their best cards to the President and gets low cards back.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What the president card game is",
      body: `President is a climbing game. You play a card or a set, and the next player must match the count and beat or equal the rank, or pass. The Western game descends from Chinese climbing games and from the Japanese game daifugo. Around a table you will hear Scum, Asshole, Capitalism, and President and Asshole. Those names point at the same shed-your-cards structure. This page uses President for the first player out and Scum for the last. The card exchange between those two seats is the status rule. Social punishments, dares and drinking forfeits are not card rules, and this guide does not describe them.

Use one [52-card deck](/guides/52-card-deck) for four to seven players. The deal will not come out even, and that is fine. Some players will hold one more card than others. For eight or more, add the two jokers, or add a second deck. Jokers, when you use them, rank above the 2 in the version taught here and are played as single cards. They are not wild.

The game is player against player. There is no bank and no house percentage. It sits with the other table games on the [games of chance](/guides/topics/games-of-chance) topic because the deal decides a large part of who gets the 2s.`,
    },
    {
      id: "ranks",
      title: "Rank order: 2s high or aces high",
      body: `Pick one rank order and keep it for the session. Examples on this page use 2s high.

| Order | High to low |
| --- | --- |
| 2s high (this page) | Joker if used, then 2, ace, king, queen, jack, 10, 9, 8, 7, 6, 5, 4, 3 |
| Aces high | Ace, king, queen, jack, 10, 9, 8, 7, 6, 5, 4, 3, 2 |

Suits never break a tie. The ace of spades is the same rank as the ace of hearts. You cannot beat an ace with another ace. You can match it only under a house rule that treats equals as a burn or a pass-on, which is covered later and is optional.

The 3 is the lowest card in the 2s-high game. Leading a 3 at the start of a fresh trick is the ordinary way to begin a low run of singles. Saving a 2 to beat a king is the ordinary reason the 2 is powerful: nothing in the basic game beats a single 2 except a joker, if jokers are in the deck.

[Shuffle](/guides/how-to-shuffle-cards) well. A clump of 2s in one hand decides a deal more clearly than any later choice. Cut the deck. Deal all the cards, one at a time, clockwise, until the deck is gone. Look at your hand and group it by rank so pairs and triples are obvious. You do not have to show those groups.

The first lead of the first hand is the player who holds the lowest card, the 3 of clubs if it is in the deck, or the lowest card by the order you chose, clubs before diamonds before hearts before spades only for the purpose of finding the starter. After that starter plays, suits go back to being irrelevant. Some tables let the player to the dealer's left lead anything. Either starter is fine if you announce it. This page uses the lowest card for the first lead of the session only. Later hands are led by the President, after the exchange.`,
    },
    {
      id: "play",
      title: "Playing singles and sets",
      body: `A trick starts with any one of these plays:

- One card.
- Two cards of the same rank.
- Three of the same rank.
- Four of the same rank.

The next player clockwise must play the same number of cards, of a rank equal to or higher than the current rank, or pass. A pair of kings beats a pair of queens. A single king does not beat a pair of 3s, because the count is wrong. You may not add extra cards to change the count.

Passing does not remove you from the hand. It removes you from this trick. If everyone else passes, the trick is over, the pile is set aside, and the last player who played starts a new trick with any legal card or set. A player who passed can play again on the new trick.

You may play a rank equal to the current rank. Under the basic rules, equals are a legal match and the turn simply continues. They do not clear the pile. Houses that treat equals as a skip or a burn are using an extra rule, described with the other house rules below.

Example. Ada leads a single 8. Ben passes. Cho plays a jack. Dee plays an ace. Ada plays a 2. Everyone else passes. Ada's 2 won the trick, the pile is dead, and Ada leads again. She leads a pair of 5s. The next player must play a pair of 5s or better, or pass. A single 2, however high, does not answer a pair.

When you play your last cards, you are out, and you take the highest seat still available. If your last play also wins the trick, you do not lead again. The next player who still has cards leads the new trick. If your last play does not clear the trick, the remaining players finish the trick without you.

Play continues until only one player has cards. That player is Scum. You do not make them play the last cards out.`,
    },
    {
      id: "seats",
      title: "Seats and the card exchange",
      body: `Finish order is the seating order for the next hand. With four players the names are:

| Finish | Seat |
| --- | --- |
| First out | President |
| Second | Vice-president |
| Third | Vice-scum |
| Last with cards | Scum |

With five players, add a neutral seat in the middle. With six or seven, extend the vice seats rather than inventing forfeits. The names are labels for the exchange. They are not instructions to embarrass anyone.

The exchange happens after the next hand is dealt and before the first lead.

- Scum gives the President their two highest cards. The President gives back any two cards they do not want, which will usually be low cards.
- Vice-scum gives the Vice-president their one highest card, and receives any one card back.

Give the best cards by rank, not by suit. A 2 is better than an ace in this version. If Scum has two 2s, those are the two cards. The President chooses which two cards return. Scum does not choose what they get back.

Then the President leads the new hand with any legal play. The lowest-card lead is only for the opening hand of the session, before anyone has a seat.

If the deal gives Scum no good cards, they still pass the best two they have. The exchange is not optional. Skipping it removes the point of the seats.

Players may sit anywhere. You do not have to move chairs, though many tables do, so the President sits in one spot and Scum in another. Moving chairs does not change the cards. The exchange does.

A tie on the last cards, two players going out on the same trick, should not happen, because only one play is made at a time. The player who played the cards that emptied their hand takes the higher seat. The player still holding cards continues.

Score across a session if you want a winner beyond a single hand: President 2 points, Vice-president 1, Scum 0, or any simple scale you write down. The exchange already rewards the President inside the cards. Points are optional.`,
    },
    {
      id: "house-rules",
      title: "Revolution, skips and other house rules",
      body: `Label every rule in this section as a house rule. The base game does not need them. Add one at a time.

- Skip or burn on equals. Playing the same rank skips the next player, or clears the pile so you lead again. Write which one you mean.
- Revolution. Four of a kind reverses rank for the rest of the hand, so 3s become high and 2s become low, or it only reverses the next trick. If you did not agree it before the deal, four of a kind is only a set of four.
- Jokers beat 2s, or jokers are wild and may join a pair to make a triple. Wild jokers change the game. This page ranks them strictly above the 2, as singles, when they are in the deck.
- Aces high instead of 2s high. Stated above. Do not switch at half-time.
- Must play if you can. The base game allows a pass even when you hold a beating card. Must-play removes that choice.
- Three of a kind starts a revolution, or three 2s clear the pile. Extra.

None of these is a penalty aimed at a person. They are play rules. If a table's version of President includes making Scum fetch drinks, sit on the floor, or take a dare, that is social hazing around the game. It is not a card rule, and you can play the full game, including the exchange, without it.

Stakes, if any, are between the players: a small agreed amount from Scum to President, or a point settled at the end of the night. Adults only, 18+. There is no rake in the rules themselves. Keep the amount fixed before the shuffle. The [responsible gambling](/responsible-gambling) page is for real-money play and limits, which is a different setting from a kitchen-table shed.

Adjacent card games with tricks and trumps, such as [spades](/guides/how-to-play-spades) and [oh hell](/guides/oh-hell-card-game), do not help you rank a 2 in President, but they use the same deck and the same need for a clear lead. President ignores suits on purpose. Once the table forgets that, people try to beat a spade with a heart of the same rank, which does nothing under either rank order.`,
    },
    {
      id: "session",
      title: "A clean way to run the session",
      body: `Deal the whole deck. Find the 3 of clubs and let that player lead one card. After two tricks the pattern is obvious: match the count, beat the rank, or pass.

Deal the next hand completely before anyone passes cards. President looks at Scum's two cards, then hands two back, face down. Those returned cards stay private. President then leads, often a low single or a low pair, saving 2s.

If a player puts down three cards on a pair, they take the play back and either play a legal pair or pass. The pile's count is what the next player has to match.

When only two players remain, they answer each other until one goes out. The player still holding cards is Scum. If the player who went out won the trick with that play, nobody remains to answer, and the other player is Scum at once.

Stop on a hand boundary, after an exchange, so the last President received the cards they were due. Pull jokers out if you added them before you use the deck for a 52-card game.

The skill is thinning the hand without spending the 2s. The deal still dominates. A hand with both 2s and a pair of aces is ahead before the first lead.

See also [palace](/guides/palace-card-game), [crazy eights](/guides/crazy-eights-rules) and [BS](/guides/bs-card-game-rules).`,
    },
  ],
  faqs: [
    {
      q: "How do you play the president card game?",
      a: "Deal all the cards. Play a single or a set of equal ranks. The next player matches the count with an equal or higher rank, or passes. First player out is President. The last player holding cards is Scum. Scum then gives their best cards to the President and receives cards back.",
    },
    {
      q: "Are 2s or aces high in president?",
      a: "Both orders are common. This page uses 2s high, then ace, king, and down to 3. The other common order makes the ace high and the 2 low. Agree before the deal and do not switch mid-session.",
    },
    {
      q: "How many cards does scum give the president?",
      a: "Often two. Scum passes their two highest cards, and the President returns any two cards. With vice seats, the next pair of ranks usually exchanges one card.",
    },
    {
      q: "What is a revolution in president?",
      a: "A house rule. Playing four of a kind reverses rank order, either for the rest of the hand or for the next trick, depending on the table. It is not part of the base game until you adopt it.",
    },
    {
      q: "Can you pass when you could beat the card?",
      a: "Yes in the base game. Passing is allowed even if you hold a higher card. Some houses require you to play if you can. That is a house rule.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: President (card game)",
      url: "https://en.wikipedia.org/wiki/President_(card_game)",
    },
    { label: "Pagat: President", url: "https://www.pagat.com/climbing/president.html" },
  ],
  related: [
    "palace-card-game",
    "crazy-eights-rules",
    "bs-card-game-rules",
    "speed-card-game",
    "52-card-deck",
  ],
  updated: "2026-09-29",
  howTo: true,
};
