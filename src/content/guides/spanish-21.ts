import type { Guide } from "./types";

export const guide: Guide = {
  slug: "spanish-21",
  cluster: "Blackjack",
  keyword: "spanish 21",
  secondary: [
    "spanish 21 rules",
    "spanish blackjack",
    "spanish 21 house edge",
    "spanish 21 bonus payouts",
  ],
  title: "Spanish 21: Rules, Bonus Payouts and House Edge",
  description:
    "Spanish 21 explained: the 48-card deck with no tens, player 21 always wins, bonus 21s, double down rescue, the real house edge and key strategy shifts.",
  h1: "Spanish 21: no tens, liberal rules, bonus 21s and the house edge",
  answer:
    "Spanish 21 is a blackjack variant dealt from 48-card Spanish decks, which remove the four 10 spot cards from each deck but keep the jacks, queens and kings. To offset that, the rules are generous: player 21 always wins, you can double on any number of cards, late surrender is allowed and some 21s pay bonuses. The house edge is roughly 0.4% to 0.8% depending mainly on the soft 17 rule.",
  facts: [
    "Each Spanish deck has 48 cards: the four 10s are removed, so ten-value cards fall from 16 to 12 per deck.",
    "A player 21 wins even against a dealer 21, and a player blackjack beats a dealer blackjack.",
    "Five-card 21 pays 3:2, six-card 21 pays 2:1 and seven or more cards pays 3:1 on standard tables.",
    "Suited 7-7-7 against a dealer 7 up-card pays a fixed $1,000 or $5,000 bonus depending on bet size.",
    "With eight decks, the house edge is about 0.4% if the dealer stands on soft 17 and about 0.8% if the dealer hits.",
  ],
  sections: [
    {
      id: "what",
      title: "What Spanish 21 is and where it comes from",
      body: `Spanish 21 is a proprietary blackjack game owned by Masque Publishing. It is dealt from six or eight "Spanish" decks. A Spanish deck is a standard 52-card French deck with the four 10 spot cards taken out. The jacks, queens and kings stay in, so ten-value cards still exist; there are just fewer of them.

The name refers to the Spanish-suited deck tradition, where the 48-card baraja has no tens. The casino game uses ordinary French suits, though. You will see the usual spades, hearts, diamonds and clubs on the felt.

Removing tens is a heavy blow to the player, so the game adds a long list of rules that give value back. The result is a game that feels loose and exciting, with bonus 21s and aggressive doubling, but that sits in roughly the same edge range as a decent standard shoe. For the base rules it modifies, read [blackjack rules](/guides/blackjack-rules). The full set of variants sits in the [blackjack topic hub](/guides/topics/blackjack). Real-money Spanish 21 is for adults 18+ or the local legal age.`,
    },
    {
      id: "no-tens",
      title: "What removing the tens does to the maths",
      body: `Ten-value cards are the player's best friend. They make blackjacks, they make doubles on 10 and 11 succeed, and they make the dealer bust when drawing to a stiff. Taking 4 of them out of every deck changes the odds throughout.

### Card densities

| Deck type | Cards | Ten-value cards | Ten density | Aces | Ace density |
| --- | --- | --- | --- | --- | --- |
| Standard | 52 | 16 | 30.8% | 4 | 7.7% |
| Spanish | 48 | 12 | 25.0% | 4 | 8.3% |

### Blackjack frequency

The chance of a two-card blackjack from a fresh shoe is 2 × P(ace first) × P(ten second).

- Eight standard decks (416 cards, 32 aces, 128 tens): 2 × 32/416 × 128/415 ≈ 4.75%
- Eight Spanish decks (384 cards, 32 aces, 96 tens): 2 × 32/384 × 96/383 ≈ 4.18%

You get a blackjack about one hand in 21 in a standard shoe but about one in 24 here. Every blackjack you lose is a 3:2 payout that becomes an ordinary hand, and that is only the first of several costs.

### Doubles and dealer busts

A double on 11 wants a ten-value card. With a 25% ten density instead of 30.8%, a doubled 11 lands on 21 less often. And the dealer, drawing to 12 through 16, busts less often because the card most likely to bust them is rarer. Taken together, the removal of the tens is worth roughly 2% to the house by commonly cited estimates. That is the hole the liberal rules have to fill. Deck count maths in the standard game is covered in [how many decks in blackjack](/guides/how-many-decks-blackjack).`,
    },
    {
      id: "rules",
      title: "Spanish 21 rules that give value back",
      body: `Standard Spanish 21 tables use a bundle of player-friendly rules. Operators can change a few, so check the placard.

### The liberal rules

1. **Player 21 always wins.** Any player total of 21 is paid immediately and cannot be tied by the dealer. A player blackjack also beats a dealer blackjack.
2. **Double on any number of cards.** You can double after drawing, for example on a three-card 10.
3. **Double after split**, with resplitting to four hands common.
4. **Resplit aces, and hit or double split aces.** In the standard game, split aces usually get one card each.
5. **Late surrender.** Give up half your bet after the dealer checks for blackjack.
6. **Double down rescue.** After doubling, you may surrender the hand and forfeit an amount equal to your original bet, keeping the doubled portion.
7. **Blackjack pays 3:2.**

### Bonus 21s

Bonuses usually pay only on hands that have not been doubled.

| Hand | Mixed suits | Same suit | Spades |
| --- | --- | --- | --- |
| Five-card 21 | 3:2 | 3:2 | 3:2 |
| Six-card 21 | 2:1 | 2:1 | 2:1 |
| Seven or more card 21 | 3:1 | 3:1 | 3:1 |
| 6-7-8 | 3:2 | 2:1 | 3:1 |
| 7-7-7 | 3:2 | 2:1 | 3:1 |

A suited 7-7-7 when the dealer shows any 7 pays a fixed super bonus on standard tables: $1,000 for bets from $5 to $24 and $5,000 for bets of $25 or more, with a $50 "envy" bonus to other players at the table. It is extremely rare and should not drive your decisions.

### What the dealer does

The dealer checks for blackjack with an ace or ten-value card up. Some tables stand on soft 17 and some hit. That single rule is the largest swing in the edge, as the next section shows.`,
    },
    {
      id: "edge",
      title: "Spanish 21 house edge by rule set",
      body: `Most published analyses, including Wizard of Odds, put eight-deck Spanish 21 at about 0.4% when the dealer stands on soft 17 and about 0.8% when the dealer hits soft 17, assuming the full liberal rule set and correct Spanish 21 strategy. Six-deck games are slightly better for the player than eight-deck games.

### How that compares

| Game | Typical house edge |
| --- | --- |
| Spanish 21, 8 decks, dealer stands soft 17 | about 0.4% |
| Spanish 21, 8 decks, dealer hits soft 17 | about 0.8% |
| Good standard 6-deck game, 3:2, DAS | about 0.4% to 0.6% |
| Standard game paying 6:5 on blackjack | about 1.9% to 2% |
| [Free bet blackjack](/guides/free-bet-blackjack) | about 1% |

The numbers assume perfect play. A player who uses a standard chart in Spanish 21 gives up several tenths of a percent, because the right plays differ and the bonuses change several decisions.

### Why the liberal rules only just cover the hole

Player 21 always winning and the bonus payouts are the headline features, but both apply to a small share of hands. Late surrender and the doubling freedoms matter more over thousands of rounds. Together they roughly cancel the 2% cost of removing the tens, which is why the final figure lands close to a regular shoe rather than well below it. Read [house edge](/guides/house-edge) for how an edge like 0.8% becomes an expected cost: at $10 a hand and 80 hands an hour, 0.8% is about $6.40 per hour on average.`,
    },
    {
      id: "strategy",
      title: "How Spanish 21 strategy differs from basic strategy",
      body: `The standard [blackjack strategy chart](/guides/blackjack-strategy-chart) is wrong in a number of Spanish 21 spots. The lower ten density and the bonuses pull decisions in predictable directions.

### Double less often on first two cards

Because tens are rarer, a two-card 9, 10 or 11 is a weaker double. Spanish charts drop several doubles that standard charts make, especially on 9 and on 10 or 11 against strong dealer cards. The option to double later with three or more cards also reduces the pressure to double now.

### Hit more multi-card hands

Five-card and six-card 21s pay bonuses and a player 21 always wins, so drawing to a many-card total is worth more than usual. Many Spanish 21 charts make stand decisions on 12 to 16 depend on how many cards you already hold, for example standing on a two-card total but hitting the same total with four cards against the same dealer card.

### Surrender and rescue more

Late surrender is part of the game's value, and the double down rescue is a genuine tool when a doubled hand lands badly against a strong dealer card. Charts use both more than a standard chart uses surrender.

### Chasing bonuses is a trap

Do not hit a hand just to reach five cards. The bonuses are built into correct strategy already. Breaking strategy to go for a suited 6-7-8 costs more than the bonus returns.

If you want to test a Spanish 21 chart rather than trust one, the [blackjack simulator](/guides/blackjack-simulator) guide explains how. [Card counting](/guides/card-counting) also works differently here, because the count starts from a ten-poor deck.`,
    },
    {
      id: "side-bets",
      title: "Match the Dealer and other Spanish 21 side bets",
      body: `Spanish 21 tables often carry a side bet called Match the Dealer. It pays when one or both of your first two cards match the rank of the dealer's up-card, with a higher pay when the match is also suited. Paytables differ by casino and deck count, and the edge is well above the main game's. Treat it as a separate, more expensive wager rather than part of Spanish 21.

Other side bets on these tables work the same way. The broader comparison, with worked edges for Perfect Pairs and 21+3, is in [blackjack side bets](/guides/blackjack-side-bets).

### Checklist before you sit

- Dealer stands on soft 17 if you can find it.
- Late surrender and double down rescue are both offered.
- Blackjack pays 3:2.
- Bonuses are posted clearly, including whether they pay after splits.
- Six decks rather than eight, when the rest is equal.`,
    },
    {
      id: "pvp",
      title: "Pricing a game, from Spanish 21 to PVPspinArena",
      body: `Spanish 21 is a clean example of house-edge accounting. Remove tens and the player loses about 2%. Add liberal rules and the player gets most of it back. The final number, roughly 0.4% to 0.8%, is the only one that matters for your wallet, and it only holds if you use the right chart.

PVPspinArena runs three player-vs-player games with the pricing on the surface. [Roulette](/roulette) has 33 slots: 16 Purple and 16 Silver pay 2x and 1 Green pays 14x, so Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. [Coinflip](/coinflip) is a 50/50 between two players with any fee shown before entry. In the [Jackpot](/), your win chance equals your share of the pot. Each settled round can be checked on the [fairness](/fairness) page against its committed seeds.

None of those games have a chart that lowers the edge, and none need one. Gambling is for adults 18+, and budget and time-out tools are on the [responsible gambling](/responsible-gambling) page.

In the same cluster, see also [blackjack switch](/guides/blackjack-switch) and [infinite blackjack](/guides/infinite-blackjack).`,
    },
  ],
  faqs: [
    {
      q: "What is Spanish 21?",
      a: "A blackjack variant dealt from 48-card decks with the four 10s removed from each deck. Liberal rules such as player 21 always winning, late surrender and bonus 21s make up for the missing tens.",
    },
    {
      q: "Does Spanish 21 have better odds than blackjack?",
      a: "It depends on the rules. An eight-deck Spanish 21 game where the dealer stands on soft 17 runs about 0.4%, similar to a good standard game. If the dealer hits soft 17, it is about 0.8%.",
    },
    {
      q: "Are there face cards in Spanish 21?",
      a: "Yes. Only the four 10 spot cards are removed from each deck. Jacks, queens and kings stay in and count as ten, so there are 12 ten-value cards per 48-card deck.",
    },
    {
      q: "Can I use normal basic strategy in Spanish 21?",
      a: "It works poorly. Spanish charts double less on first two cards, hit more multi-card stiffs and surrender more. Using a standard chart costs several tenths of a percent.",
    },
    {
      q: "Does a player 21 beat a dealer blackjack in Spanish 21?",
      a: "A player blackjack beats a dealer blackjack. Because the dealer checks for blackjack before you act, a dealer natural ends the round early unless you also hold one. Any other player 21 wins immediately.",
    },
  ],
  sources: [
    { label: "Wikipedia: Spanish 21", url: "https://en.wikipedia.org/wiki/Spanish_21" },
    { label: "Wizard of Odds: Spanish 21", url: "https://wizardofodds.com/games/spanish-21/" },
    { label: "Wikipedia: Blackjack", url: "https://en.wikipedia.org/wiki/Blackjack" },
  ],
  related: [
    "free-bet-blackjack",
    "blackjack-switch",
    "infinite-blackjack",
    "how-many-decks-blackjack",
    "blackjack-rules",
  ],
  updated: "2026-09-27",
};
