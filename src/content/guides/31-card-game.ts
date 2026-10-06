import type { Guide } from "./types";

export const guide: Guide = {
  slug: "31-card-game",
  cluster: "Games of chance",
  keyword: "31 card game",
  secondary: [
    "thirty-one card game",
    "scat card game",
    "blitz card game",
    "31 rules knocking",
    "31 for quarters",
  ],
  title: "31 Card Game: Scat Rules, Knocking and Lives",
  description:
    "31 card game rules explained: dealing, card values, knocking, lives and playing Scat for quarters, with real hand odds and a simple knock strategy.",
  h1: "31 card game: Scat rules, knocking, lives and odds",
  answer:
    "The 31 card game, also called Scat or Blitz, gives each player three cards and asks them to build the highest total in a single suit, with 31 the maximum. On your turn you draw and discard, or you knock to end the round. The lowest hand loses a life, usually a coin, and the last player with a life left wins the pot.",
  facts: [
    "Aces count 11, face cards 10 and number cards their pip value; only one suit counts toward your score.",
    "The best hand is 31: an ace plus two ten-value cards of the same suit, dealt about 1 time in 921.",
    "After a knock, every other player gets exactly one more turn before the showdown.",
    "Most groups give each player three lives, often three quarters or tokens.",
    "Played for coins, 31 is zero-sum between the players: there is no house edge unless someone takes a cut.",
  ],
  sections: [
    {
      id: "basics",
      title: "What the 31 card game is and what you need",
      body: `Thirty-one is a draw-and-discard game for roughly two to nine players using one standard 52-card deck with no jokers. It goes by a pile of regional names: Scat, Blitz, Ride the Bus, Cadillac and plain "31" are all common. It belongs to the same family as the German game Schwimmen, which uses a shorter deck but the same three-card, one-suit idea. If you want the deck itself explained, the [52 card deck](/guides/52-card-deck) guide covers suits, ranks and draw probabilities.

What you need:

- one deck, shuffled well;
- three tokens per player (coins, chips or matchsticks) to count lives;
- a flat surface with room for a face-down stock pile and a face-up discard pile.

The game is quick. A round often lasts under two minutes, and a full game with five players can finish in ten or fifteen. That pace is why it became a kitchen-table and bar game for small change. It sits in the [Games of chance topic](/guides/topics/games-of-chance) alongside other family card games like [gin rummy](/guides/how-to-play-gin-rummy), which uses a similar draw-then-discard rhythm but scores sets and runs instead of one suit.`,
    },
    {
      id: "rules",
      title: "Rules: dealing, card values and a normal turn",
      body: `### Deal

The dealer gives each player three cards face down, one at a time. The rest of the deck becomes the stock. The top card of the stock is turned face up to start the discard pile. Deal passes to the left after each round.

### Card values

| Card | Value |
| --- | --- |
| Ace | 11 |
| King, Queen, Jack | 10 |
| 10 down to 2 | Face value |

Your score is the total of the cards you hold **in one suit**. Ace of hearts, king of hearts and 4 of clubs scores 21 (the hearts), not 25. If all three cards are different suits, your score is simply your highest single card. Many groups add one extra hand: three cards of the same rank score 30, and some tables call it 30½ so it beats a suited 30 but loses to 31. Agree on this before the first deal.

### A turn

Play moves left from the dealer. On your turn you do exactly one of two things:

1. **Draw and discard.** Take either the top card of the stock or the top card of the discard pile, then discard one card face up. You always end your turn holding three cards. Most groups do not let you pick up the discard and throw the same card straight back.
2. **Knock.** Tap the table instead of drawing. This signals that the round will end soon (details in the next section).

If the stock runs out, the discard pile, minus its top card, is shuffled to form a new stock.

### Blitz

If you ever hold exactly 31, you show it immediately, even if it is not your turn in some house rules. The round ends at once, and every other player loses a life. Being dealt 31 works the same way.`,
    },
    {
      id: "knocking",
      title: "Knocking, the showdown and losing lives",
      body: `Knocking is the only real decision in the game beyond which card to keep. When you knock, you freeze your hand. Every other player gets one final turn, in order, to draw and discard. Then everyone reveals.

### Who loses a life

- The player with the **lowest** hand loses one life.
- If two or more tie for lowest, all of them lose a life, unless one of them is the knocker (see below).
- If the knocker has the lowest hand, many groups make the knocker lose **two** lives. This penalty is what stops people from knocking on a weak hand to end things quickly.
- A common house rule protects the knocker in a tie: if the knocker ties for lowest, the other tied player loses instead.
- A player who reaches 31 during the final round after a knock ends it immediately; everyone else, including the knocker, loses a life.

You cannot knock on the very first turn of a round in some groups, and you usually cannot knock if someone has already knocked. Settle both points before you start.

### Lives and elimination

Each player starts with three lives. When you lose your last one, many tables let you stay in for one more round as a "free ride" and only drop out the next time you lose. Groups have different names for that state, and some skip the free ride entirely. The last player still holding a life wins the game.`,
    },
    {
      id: "odds",
      title: "Hand odds in the 31 card game",
      body: `All of these use three cards drawn from a full 52-card deck. There are C(52,3) = 22,100 possible three-card hands.

| Hand | Count | Probability | Roughly |
| --- | --- | --- | --- |
| Dealt 31 (ace + two ten-value cards, same suit) | 4 × 6 = 24 | 0.109% | 1 in 921 |
| Three of a kind | 13 × 4 = 52 | 0.235% | 1 in 425 |
| All three cards in one suit | 4 × 286 = 1,144 | 5.18% | 1 in 19 |
| At least two cards in one suit | 13,312 | 60.2% | 3 in 5 |
| Three different suits | 8,788 | 39.8% | 2 in 5 |

### Where the numbers come from

- **31:** in each suit there is one ace and four ten-value cards (10, J, Q, K). Choosing two of the four gives C(4,2) = 6. Four suits gives 24 hands.
- **Three different suits:** the second card must avoid the first card's suit (39 of 51), and the third must avoid both (26 of 50). 39/51 × 26/50 ≈ 39.8%, so 60.2% of hands start with at least a two-card suit.

### What the table means in play

You will rarely be dealt a winner, but you draw a lot. Holding two cards of one suit, 11 more of that suit are among the 49 cards you have not seen, so a blind stock draw adds a suited card about 22% of the time (fewer if opponents are hoarding the suit). If you hold the ace and 9 of spades, only four spades complete a 30 or 31 (10, J, Q, K), about 8% per draw. Across several turns and the visible discard pile, hands in the mid-20s are common by the time someone knocks, which is why a 20 is usually not safe.

For the general idea of turning card counts into probabilities, the [expected value](/guides/expected-value-gambling) guide walks through the same arithmetic on bets.`,
    },
    {
      id: "strategy",
      title: "Strategy: what to keep and when to knock",
      body: `31 rewards two habits: committing to one suit quickly and knocking at the right moment.

### Pick a suit early

With a split hand, keep the suit that already has the most points or the best upgrade path. A suited ace plus a 9 (20) has more room than a suited 6 plus 5 (11). Throw away off-suit cards from lowest to highest unless an off-suit card is worth more than your whole suited total.

### Watch the discard pile

The discard pile tells you what other players are abandoning and, by what they pick up, which suit they are building. If the player on your left keeps grabbing diamonds, do not throw them a diamond king.

### Knock thresholds

There is no single correct number, but a rough guide based on how fast hands improve:

| Situation | Reasonable knock hand |
| --- | --- |
| Early in the round, 5–7 players | 27 or better |
| Early, 2–4 players | 25 or better |
| Several turns in, others drawing well | 29 or better |
| You are on your last life | Knock a bit earlier, before others can improve |

The logic is simple. Everyone else gets one more draw after you knock. The more players there are, the more chances someone improves past you, but you only need to not be the **lowest**, not the highest. With six players, a 26 is rarely last.

### Common mistakes

- Knocking on 22 to "end it" and eating the two-life penalty.
- Chasing a third suited card when you already hold 30 in two cards and a blitz is unlikely.
- Forgetting that three of a kind (if your table uses it) can be a fast route to 30.`,
    },
    {
      id: "money",
      title: "Playing 31 for quarters",
      body: `The classic money format is tiny. Each player puts three quarters in front of them, one per life. Two common ways to run it:

1. **Pay as you lose.** Each time you lose a life, one of your quarters goes into the middle. The last survivor takes everything.
2. **Ante up front.** Everyone puts their three quarters in the pot before the first deal, and the winner takes the pot.

Both produce the same result: with five players, the pot is $3.75 and the winner's profit is $3.00. There is no dealer taking a cut, so the game is zero-sum. Averaged over many games, equally skilled players break even, and a player who knocks well gains a little from those who do not. Stakes stay small because a game only pays one winner and the variance is high: a player who wins one game in five among equal opponents will often lose four or more in a row.

A few table rules keep money games friendly:

- agree the knock penalty, the three-of-a-kind rule and the free ride before any coins move;
- keep coins in view so everyone can count lives;
- set a stop: a number of games or a time, not "until I win it back".

Money play is for adults (18+ or your local legal age). If a friendly game is turning into chasing losses, the [responsible gambling](/responsible-gambling) page lists tools and help lines.`,
    },
    {
      id: "pvp",
      title: "How the same idea shows up on PVPspinArena",
      body: `A quarters game of 31 is player-vs-player money: nobody runs a house, everyone antes the same amount, and the pot goes to one winner. PVPspinArena runs three player-vs-player games on the same principle, with the draw replaced by a verifiable random result. In [Jackpot](/) your chance of winning equals your share of the pot, much as five equal antes in a 31 game give each player a notional one-in-five start. In [Coinflip](/coinflip) two players face a straight 50/50, and the winner takes the pot minus any fee shown before entry.

The difference is that 31 has decisions. Your knock timing and suit choice move your odds a little. A hashed round has no decisions after you enter: the result comes from committed seeds that anyone can check on the [fairness](/fairness) page. If you enjoy the skill part of 31, that is a real reason to prefer the card table. For more card games that work for small stakes, see [Oh Hell](/guides/oh-hell-card-game) and [Bourré](/guides/bourre-card-game).

See also [tonk](/guides/tonk-card-game) and [scopa](/guides/scopa-rules).`,
    },
  ],
  faqs: [
    {
      q: "How do you play the 31 card game?",
      a: "Each player gets three cards. On your turn, draw from the stock or discard pile and discard one card, trying to build the highest total in one suit. Knock when you think you are not the lowest. After one more turn each, the lowest hand loses a life.",
    },
    {
      q: "What happens if you get 31 in Scat?",
      a: "You reveal it immediately and the round ends. Every other player loses a life. This is often called a blitz.",
    },
    {
      q: "What if the person who knocks has the lowest hand?",
      a: "In most groups the knocker loses two lives instead of one. Some tables only charge one life; agree the rule before you start.",
    },
    {
      q: "Does three of a kind count in 31?",
      a: "Only if your group agrees. The common house rule scores three of a kind as 30, sometimes called 30 and a half so it beats a suited 30 but loses to 31.",
    },
    {
      q: "How many players can play 31?",
      a: "Two to about nine with one deck. Five to seven is the sweet spot, because the stock lasts long enough and knocking decisions matter.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Thirty-one (card game)",
      url: "https://en.wikipedia.org/wiki/Thirty-one_(card_game)",
    },
    { label: "Pagat: card game rules", url: "https://www.pagat.com/" },
    {
      label: "Encyclopaedia Britannica: card game",
      url: "https://www.britannica.com/topic/card-game",
    },
  ],
  related: [
    "bourre-card-game",
    "how-to-play-gin-rummy",
    "oh-hell-card-game",
    "how-to-play-spades",
    "52-card-deck",
    "tonk-card-game",
  ],
  updated: "2026-09-27",
};
