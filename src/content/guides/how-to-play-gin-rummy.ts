import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-play-gin-rummy",
  cluster: "Games of chance",
  keyword: "how to play gin rummy",
  secondary: [
    "gin rummy rules",
    "gin rummy scoring",
    "gin rummy knocking",
    "gin rummy undercut",
    "hollywood gin",
  ],
  title: "How to Play Gin Rummy: Knocking, Undercuts and Scoring",
  description:
    "How to play gin rummy: the deal, upcard, deadwood, knocking, gin and undercut bonuses, scoring to 100, Hollywood and Oklahoma gin, and playing for stakes.",
  h1: "How to play gin rummy: knocking, gin, undercuts and scoring",
  answer:
    "How to play gin rummy: two players get 10 cards each, then take turns drawing from the stock or discard pile and discarding one card. You aim to form sets and runs. When your unmatched cards (deadwood) total 10 points or less you may knock and end the hand. Going gin, with zero deadwood, earns a bonus. The first player to 100 points wins.",
  facts: [
    "Gin rummy is a two-player game with a 52-card deck and 10-card hands; ace is low.",
    "You may knock once your deadwood totals 10 points or less; face cards count 10, aces 1.",
    "Gin (zero deadwood) usually earns a 25-point bonus, and the opponent may not lay off.",
    "An undercut, when the defender's deadwood is equal to or lower than the knocker's, usually earns the defender 25 bonus points.",
    "A standard game runs to 100 points, with a 100-point game bonus and 25 points per hand won.",
  ],
  sections: [
    {
      id: "basics",
      title: "What gin rummy is",
      body: `Gin rummy is the best-known two-player member of the [rummy](/guides/how-to-play-rummy) family. Unlike basic rummy, nobody lays melds on the table during the hand. You build them privately and reveal everything only when someone ends the hand by knocking. That hidden information is what makes gin a game of reading discards.

The commonly told story credits Elwood T. Baker, a whist teacher, with creating the game in New York around 1909, though the details rest on later accounts. Gin became hugely popular in the United States in the 1930s and 1940s, especially in the film industry, which is where the name Hollywood gin for its multi-game scoring comes from. Poker legend [Stu Ungar](/guides/stu-ungar) was reputed to be one of the strongest gin players of his era before he turned to poker.

You need one standard [52-card deck](/guides/52-card-deck) and a score sheet. Cards rank K high to ace low; the ace is always low, so A-2-3 is a run and Q-K-A is not. For scoring:

| Cards | Deadwood value |
| --- | --- |
| K, Q, J | 10 |
| 10 to 2 | face value |
| Ace | 1 |

Melds are the same as in all rummy games: sets of three or four cards of one rank, and runs of three or more consecutive cards in one suit. Each card may be used in only one meld when you lay down your hand. Gin belongs to the [games of chance topic](/guides/topics/games-of-chance) with the other card games on this site.`,
    },
    {
      id: "deal",
      title: "The deal, the upcard and each turn",
      body: `Cut for the first deal; the loser of each hand usually deals the next. The dealer gives 10 cards to each player, one at a time, places the rest face down as the stock, and turns the top card face up to start the discard pile.

### The upcard

The first turn has a special rule in the standard game:

1. The non-dealer may take the upcard. If they do, they discard and play continues normally.
2. If the non-dealer declines, the dealer may take it.
3. If both decline, the non-dealer draws the top card of the stock and play continues.

### A normal turn

1. Draw one card, either the top of the stock or the top of the discard pile.
2. Discard one card face up. You may not discard the card you just took from the pile on the same turn.
3. Optionally knock instead of discarding normally (see below).

### When the stock runs low

The stock is not reshuffled. If only two cards remain in the stock and the player who drew the card before them discards without knocking, the hand is cancelled and redealt with no score. This rule prevents a stalemate where neither player can improve.

### Reading discards

Every card your opponent picks up from the discard pile tells you something. If they take the 8♥, they probably hold 8s or 7♥/9♥. After that, discarding the 8♠, 7♥ or 9♥ feeds them. Good gin players track every picked-up card and every discard, which is why the game rewards memory more than almost any other card game.

### Early discards

In the first few turns, the standard advice is to shed high unmatched cards, because a stranded king costs 10 points if your opponent knocks quickly. Keep middle cards such as 6s, 7s and 8s longer: each one can join a set or a run in two directions, so it has more outs than a king, which can only extend a run downward. Once your opponent starts discarding a suit, cards in that suit become safer for you to throw, since they are unlikely to be building a run there.`,
    },
    {
      id: "knocking",
      title: "Knocking, gin and laying off",
      body: `Your **deadwood** is the total value of cards that are not part of any meld. When, after drawing, your deadwood is 10 or less, you may knock. You discard one card face down, then spread your hand showing melds and deadwood separately.

### What the defender does

The defending player then spreads their own hand, forming as many melds as possible. They may also **lay off** their unmatched cards onto the knocker's melds, for example adding the 9♣ to a knocker's 6-7-8 of clubs. Laying off reduces the defender's deadwood.

### Going gin

If you knock with zero deadwood, you have gone **gin**. The defender may not lay off against a gin hand. Some rules also recognise **big gin**, where all 11 cards (after drawing) form melds and you do not need to discard; this carries a larger bonus, commonly 31 or 50 points depending on the rule set.

### A worked knock

After drawing and discarding face down, you hold: 4♠ 5♠ 6♠ · 9♦ 9♣ 9♥ · J♥ Q♥ K♥ · 2♣. Your deadwood is 2, so you knock with the 2♣ as deadwood.

Your opponent holds: 7♠ · 3♦ 3♥ 3♣ · 10♥ · 5♦ 6♦ 7♦ · A♣ 8♣. They lay off the 7♠ on your spade run and the 10♥ on your J-Q-K of hearts. Their remaining deadwood is A♣ + 8♣ = 9. You score 9 − 2 = 7 points.

### Knock early or wait for gin?

Knocking early catches an opponent with a lot of deadwood. Waiting for gin earns the bonus and blocks lay-offs, but gives the opponent more draws to improve or to knock first. Most strong players knock as soon as they can in the early part of a hand, and wait only when their deadwood is already very low and several outs to gin remain.`,
    },
    {
      id: "undercut",
      title: "Undercuts and the risk of knocking high",
      body: `If, after laying off, the defender's deadwood is **equal to or lower than** the knocker's, the defender has undercut the knocker. The defender scores the difference plus an undercut bonus, commonly 25 points (some rule sets use 10 or 20). A tie counts as an undercut, so the knocker needs strictly lower deadwood to score.

### Worked undercut

You knock with 9 deadwood. Your opponent spreads their hand, lays off two cards and is left with 6. They score (9 − 6) + 25 = 28 points. Knocking with 9 instead of waiting cost you not only the hand but a 25-point swing.

### Why knocking with 10 is risky late in a hand

Early in the hand, a defender typically holds several unmatched cards, so an undercut is unlikely. As the stock shrinks, both hands improve, and a defender who has been collecting low cards may have single-digit deadwood. Two warning signs:

- Your opponent has been discarding high cards and picking up low ones.
- They have taken few discards, suggesting their melds are already built from the stock.

When you see those signs, knock only with low deadwood, or keep drawing toward gin.

### A gin cannot be undercut

Because the defender may not lay off against gin and their deadwood cannot be below zero, gin is immune to undercuts. If both players have zero deadwood, the knocker still scores gin under standard rules.`,
    },
    {
      id: "scoring",
      title: "Scoring a game of gin rummy",
      body: `Points from each hand accumulate toward a target, usually 100.

| Event | Points to |
| --- | --- |
| Successful knock | Knocker: defender's deadwood minus knocker's deadwood |
| Gin | Knocker: defender's full deadwood plus 25 bonus |
| Undercut | Defender: difference plus 25 bonus |
| Winning the game (first to 100) | 100-point game bonus |
| Each hand won during the game | 25-point line or box bonus |
| Shutout (loser won no hands) | Commonly doubles the winner's total |

At the end of the game, each player adds their line bonuses, and the winner adds the game bonus. The final margin is the difference between the two totals, which is what gets settled if you play for stakes.

### Hollywood scoring

Hollywood gin runs three games at once. Your first hand win is scored in game one only; your second in games one and two; your third and later wins in all three. Games end independently when a player reaches 100 in each, so one session produces three results.

### Oklahoma gin

In Oklahoma gin, the value of the first upcard sets the knock limit for the hand: a 7 upcard means you need 7 or less to knock. If the upcard is an ace, you usually must go gin, and many groups double all scores when the upcard is a spade. It is a common way to add variety to a long session.`,
    },
    {
      id: "stakes",
      title: "Playing gin rummy for money",
      body: `Gin has long been played for money, from kitchen tables to private card clubs. Everyone involved should be 18 or older, or the local legal gambling age, and private gambling laws differ by country and region.

The usual format is a rate per point on the final margin. At one cent a point, a win of 180 to 60 after bonuses pays $1.20. Hollywood scoring roughly triples the exposure per session because three games run at once. Agree on these before the first deal:

- the knock limit and whether Oklahoma rules apply;
- gin, big gin and undercut bonuses;
- line bonus, game bonus and shutout rules;
- the rate per point and when you settle.

Gin rewards skill more than many card games: discard reading and knock timing produce consistent winners over hundreds of hands. Short sessions still swing widely. See [skill-based gambling](/guides/skill-based-gambling) for how skill and luck interact, and [variance in gambling](/guides/variance-in-gambling) for why a better player can lose a night. If losses start to feel urgent, take a break using the [responsible gambling](/responsible-gambling) tools.`,
    },
    {
      id: "pvp",
      title: "Gin rummy maths and a hashed PvP round",
      body: `Gin decisions are probability decisions. After the deal, 31 cards remain in the stock. If you need one of three unseen cards to go gin, the chance your next stock draw hits is 3/31, about 9.7%, before accounting for cards your opponent may hold. That is the kind of estimate strong players make on every turn.

PVPspinArena runs three player-vs-player games where there are no draws to count: Jackpot, [Coinflip](/coinflip) and Roulette. A Coinflip is an even 50/50. Roulette's 33-slot wheel returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee. Results come from committed seeds, and anyone can verify a settled round on the [fairness](/fairness) page, much as a fresh deck and a cut keep a gin table honest. None of that gives a player an edge; for gin's skill side, compare the [how to play Spades](/guides/how-to-play-spades) guide.

See also [tonk](/guides/tonk-card-game).`,
    },
  ],
  faqs: [
    {
      q: "When can you knock in gin rummy?",
      a: "When the value of your unmatched cards, your deadwood, is 10 points or less after you draw. You then discard face down and spread your hand.",
    },
    {
      q: "What is an undercut in gin rummy?",
      a: "When the defender's deadwood, after laying off, is equal to or less than the knocker's. The defender scores the difference plus a bonus, usually 25 points.",
    },
    {
      q: "How much is gin worth in gin rummy?",
      a: "The opponent's full deadwood plus a gin bonus, usually 25 points. The opponent may not lay off cards against a gin hand.",
    },
    {
      q: "Can you lay off in gin rummy?",
      a: "Only the defender can, and only after the other player knocks. They may add unmatched cards to the knocker's melds, except when the knocker went gin.",
    },
    {
      q: "What does Hollywood gin mean?",
      a: "A scoring method that runs three games at once. Your first hand win counts in game one, your second in games one and two, and later wins in all three.",
    },
  ],
  sources: [
    { label: "Wikipedia: Gin rummy", url: "https://en.wikipedia.org/wiki/Gin_rummy" },
    { label: "Pagat: Gin Rummy rules", url: "https://www.pagat.com/rummy/ginrummy.html" },
    {
      label: "Bicycle Cards: how to play Gin Rummy",
      url: "https://bicyclecards.com/how-to-play/gin-rummy",
    },
  ],
  related: [
    "how-to-play-rummy",
    "canasta-rules",
    "stu-ungar",
    "52-card-deck",
    "31-card-game",
    "tonk-card-game",
  ],
  updated: "2026-09-27",
};
