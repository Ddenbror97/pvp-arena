import type { Guide } from "./types";

export const guide: Guide = {
  slug: "teen-patti",
  cluster: "Casino games",
  keyword: "teen patti",
  secondary: [
    "teen patti rules",
    "teen patti hand rankings",
    "teen patti odds",
    "blind and seen teen patti",
  ],
  title: "Teen Patti Rules: Hand Rankings, Blind Play and Odds",
  description:
    "Teen patti explained: dealing and boot, blind and seen betting, show and sideshow, the six hand rankings, and the exact odds of every three-card hand.",
  h1: "Teen patti: rules, hand rankings, blind and seen play, and odds",
  answer:
    "Teen patti is a three-card gambling game from South Asia, closely related to three card brag. Each player antes a boot, gets three cards, and bets either blind (without looking) or seen. Blind players bet half as much as seen players. Hands rank trail, pure sequence, sequence, colour, pair and high card, and the last player standing or the best hand at a show wins the pot.",
  facts: [
    'Teen patti means "three cards" and is played with a standard 52-card deck.',
    "There are 22,100 possible three-card hands.",
    "A trail (three of a kind) comes up 52 times in 22,100, about 1 in 425.",
    "About 74.4% of hands are high card only; a pair or better is about 25.6%.",
    "A seen player must bet at least twice what a blind player bets.",
  ],
  sections: [
    {
      id: "setup",
      title: "Setup, boot and dealing",
      body: `Teen patti ("three cards" in Hindi) is played by three to about seven players with a standard 52-card deck and no jokers in the basic game. It is especially associated with family and social games around Diwali, and it has spread widely online. Playing for money is for adults only, 18+ or your local legal age.

### The boot

Before the deal, every player puts a fixed ante, called the **boot**, into the pot. The boot also sets the opening **stake**, the reference amount that every later bet is measured against. With a boot of 1 unit and five players, the pot starts at 5.

### The deal

The dealer shuffles and deals three cards face down to each player, one at a time. Play then moves clockwise from the player to the dealer's left. Unlike poker, there are no community cards and no draw. The three cards you receive are the hand you finish with.

### How the pot is won

A hand ends in one of two ways:

1. Every player except one folds (packs), and the remaining player takes the pot without showing.
2. Two players remain and one of them asks for a **show**. Both hands are turned up and the higher one wins.

That simple structure hides a surprising amount of strategy, because the game has two kinds of player at the table at the same time: those who have looked at their cards and those who have not. The game belongs to the wider family of house and social card games in the [casino games topic hub](/guides/topics/casino-games).`,
    },
    {
      id: "blind-seen",
      title: "Blind and seen betting",
      body: `The defining rule of teen patti is that you may bet without looking at your cards. As long as you have not looked, you are a **blind** player. Once you look, you are a **seen** (or "chaal") player for the rest of the hand.

### The standard bet sizes

The details vary between groups, but the most widely published version works like this:

| Your status | Minimum bet | Maximum bet |
| --- | --- | --- |
| Blind | 1 × current stake | 2 × current stake |
| Seen | 2 × current stake | 4 × current stake |

The current stake is the amount the last blind player bet, or half the amount the last seen player bet. If you raise, the stake rises for everyone after you. Seen players pay double because they are betting with information.

### A worked round

Boot 1, four players, stake 1.

- Player A is blind and bets 1. Stake stays 1.
- Player B looks, is now seen, and bets 2 (the minimum).
- Player C is blind and raises to 2. The stake is now 2.
- Player D is seen and must bet at least 4.

Over a long hand the difference compounds. A player who stays blind for six rounds at stake 1 puts in 6 units; a seen player in the same rounds puts in 12.

### Why anyone stays blind

Blind play is cheaper, and it hides information: opponents cannot read your reaction to your cards. The cost is that you might keep paying with a hand you would have folded. Many players look after one or two rounds once the stake has risen.

These bet-size rules are the part most likely to change between tables, apps and families. Agree on them, and on any limit on the total pot, before the first deal.`,
    },
    {
      id: "show-sideshow",
      title: "Show, sideshow and folding",
      body: `### Packing

At your turn you can always **pack** (fold). You lose what you have put in and take no further part in the hand. Many groups also allow a blind player to pack without ever looking.

### Show

When only two players remain, either can ask for a show by paying the amount required, and both hands are revealed. Common rules:

- A seen player asks for a show by paying the seen bet (2 × stake).
- A blind player asks for a show by paying the blind bet (1 × stake).
- In many versions, if one player is blind, the other cannot force a show against them until they are seen.

If the hands are exactly equal in rank, most rules award the pot to the player who did not ask for the show, which discourages cheap shows.

### Sideshow

A **sideshow** (or compromise) is a private comparison with more than two players left. A seen player may ask the previous player, who must also be seen, for a sideshow when placing their bet. If the other player accepts, the two compare hands privately and the lower hand packs. The other player may refuse, and play continues.

A sideshow lets seen players thin the field without a full show. Refusing one is a signal too: players tend to accept when they are weak and have little to lose, and refuse when they are strong.

### Strategy notes

- Show requests cost money; asking for a show with a weak high card mainly donates the fee.
- Refused sideshows carry information about hand strength.
- As more players look, the pot grows faster, because every seen bet is double.

The game plays much like other betting games where fold equity matters; the maths of bluff frequency is covered in the [poker math guide](/guides/poker-math).`,
    },
    {
      id: "rankings",
      title: "Teen patti hand rankings",
      body: `From highest to lowest:

1. **Trail (set or trio):** three cards of the same rank. A-A-A is the best hand in the game, 2-2-2 the lowest trail.
2. **Pure sequence:** three consecutive cards of the same suit, such as 7♥ 8♥ 9♥.
3. **Sequence (run):** three consecutive cards, not all the same suit.
4. **Colour (flush):** three cards of the same suit, not in sequence.
5. **Pair:** two cards of the same rank.
6. **High card:** anything else.

### Ties within a category

- Higher ranks beat lower ranks: a pair of kings beats a pair of queens. With equal pairs, the odd card decides.
- For colours and high cards, compare the highest card, then the second, then the third.
- For sequences, A-K-Q is the highest. In many rule sets A-2-3 ranks second, above K-Q-J; in others it is the lowest sequence. Agree on this before playing.
- Suits do not rank in the standard game, so exactly equal hands tie and the show rules above decide.

### Comparison with poker

Teen patti rankings look like poker's but for three cards. The notable quirk is that a trail beats a pure sequence even though a pure sequence is slightly rarer (48 hands against 52). Three card poker, the casino game, ranks the straight flush above three of a kind for that reason. Otherwise the order matches frequency: a sequence is rarer than a colour with only three cards, which is why sequence ranks higher, the reverse of five-card poker. The casino version is explained in the [three card poker strategy guide](/guides/three-card-poker-strategy), and five-card rankings are on [poker hand rankings](/guides/poker-hand-rankings).`,
    },
    {
      id: "odds",
      title: "Teen patti odds for every hand",
      body: `With a 52-card deck there are C(52, 3) = 22,100 possible three-card hands. Each category can be counted exactly.

| Hand | Count | Calculation | Probability | About 1 in |
| --- | --- | --- | --- | --- |
| Trail | 52 | 13 ranks × C(4,3) | 0.235% | 425 |
| Pure sequence | 48 | 12 runs × 4 suits | 0.217% | 460 |
| Sequence | 720 | 12 runs × (4³ − 4) | 3.26% | 31 |
| Colour | 1,096 | 4 × (C(13,3) − 12) | 4.96% | 20 |
| Pair | 3,744 | 13 × C(4,2) × 48 | 16.94% | 6 |
| High card | 16,440 | the remainder | 74.39% | 1.3 |

The 12 runs are A-2-3 through Q-K-A (ace high or low). Each run can be dealt in 4³ = 64 suit patterns, of which 4 are all one suit. For colours, C(13,3) = 286 three-card combinations per suit, minus the 12 that are pure sequences.

### What that means at the table

- **A pair or better** appears in about 25.6% of hands. Three out of four hands are high card only.
- **Against one opponent**, a random hand has roughly a 25.6% chance of holding a pair or better, so a small pair beats most single opponents.
- **Against four opponents**, the chance that at least one holds a pair or better is roughly 1 − 0.744⁴ ≈ 69%. This treats the hands as independent, which is close but not exact because they share one deck.

Those numbers are why a high-card hand is usually worth a blind bet or two at most, and why seen players raising in a multi-way pot usually hold at least a pair. For converting these percentages into odds, see [implied probability](/guides/implied-probability).`,
    },
    {
      id: "variants",
      title: "Popular variants and casino versions",
      body: `Home and online groups use many variations. Names and exact rules differ, so treat these as common patterns rather than fixed standards.

| Variant | Change | Effect |
| --- | --- | --- |
| Joker / wild card | A card cut from the deck, or its rank, is wild | Trails and sequences become far more common |
| Muflis (lowball) | Lowest hand wins | Rankings are reversed |
| AK47 | Aces, kings, fours and sevens are wild | Big hands become routine |
| Four-card or best-of-four | Deal four, play the best three | More strong hands, more action |
| Closest to 999 | Card values summed, closest to 999 wins | A different game entirely |

### House-banked versions

Some online live casinos offer a house-banked teen patti in which you play against a dealer hand rather than other players, often with a pair-plus style side bet that pays according to your hand category. Structurally it resembles three card poker. The house edge depends entirely on the paytable, so check the published return before playing.

### Legal note

The legal status of playing teen patti for money depends on where you are. In India, gambling law is largely set at state level, and courts have long debated where card games sit between skill and chance. Other countries apply their general gambling rules. A summary of the Indian position for online play is in the [crypto casino India guide](/guides/crypto-casino-india). Always check local law, and keep stakes to amounts you are comfortable losing.`,
    },
    {
      id: "pvp",
      title: "Pot share and odds on a hashed PvP round",
      body: `PVPspinArena runs three player-vs-player games in USDC or ETH on the Base network, for adults 18+ only. Like teen patti, they are games between players rather than games against a dealer's hand, but there is no hidden information to bet on.

- In [Jackpot](/), players add wagers to one pot and your win chance equals your share. Put 2 into a 10-unit pot and your chance is exactly 20%. The winner takes the pot minus any fee shown before entry.
- [Coinflip](/coinflip) is a straight 50/50 between two players.
- On [Roulette](/roulette), 16 Purple and 16 Silver slots pay 2x and 1 Green slot pays 14x on a 33-slot wheel. Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee.

There is no blind or seen choice and no bluffing: each result comes from committed seeds, and anyone can verify a settled round on the [fairness page](/fairness). Set limits before you start using the [responsible gambling](/responsible-gambling) tools.

In the same cluster, see also [pai gow tiles](/guides/pai-gow-tiles), [craps strategy](/guides/craps-strategy), and [baccarat strategy](/guides/baccarat-strategy).`,
    },
  ],
  faqs: [
    {
      q: "What is the highest hand in teen patti?",
      a: "A trail of three aces (A-A-A) is the highest hand. Trails of any rank beat every pure sequence, sequence, colour, pair and high card.",
    },
    {
      q: "What is the difference between blind and seen in teen patti?",
      a: "A blind player has not looked at their cards and bets 1 to 2 times the current stake. A seen player has looked and must bet 2 to 4 times the stake.",
    },
    {
      q: "What is a sideshow in teen patti?",
      a: "A private comparison requested by a seen player with the previous seen player. If accepted, the lower hand folds. The other player can refuse.",
    },
    {
      q: "What are the odds of getting a trail in teen patti?",
      a: "52 of the 22,100 possible hands are trails, about 0.235% or 1 in 425.",
    },
    {
      q: "Is a sequence higher than a colour in teen patti?",
      a: "Yes. With three cards, a sequence (720 hands) is rarer than a colour (1,096 hands), so it ranks higher, unlike five-card poker where a flush beats a straight.",
    },
  ],
  sources: [
    { label: "Wikipedia: Teen patti", url: "https://en.wikipedia.org/wiki/Teen_patti" },
    { label: "Wikipedia: Three card brag", url: "https://en.wikipedia.org/wiki/Three_card_brag" },
  ],
  related: [
    "dragon-tiger",
    "pai-gow-tiles",
    "three-card-poker-strategy",
    "baccarat-rules",
    "casino-hold-em",
    "52-card-deck",
    "craps-strategy",
    "baccarat-strategy",
  ],
  updated: "2026-09-27",
};
