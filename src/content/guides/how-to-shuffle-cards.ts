import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-shuffle-cards",
  cluster: "Casino knowledge",
  keyword: "how to shuffle cards",
  secondary: [
    "riffle shuffle",
    "overhand shuffle",
    "bridge shuffle",
    "seven shuffles",
    "table wash shuffle",
  ],
  title: "How to Shuffle Cards: Riffle, Overhand and 7 Shuffles",
  description:
    "How to shuffle cards properly: the riffle, bridge, overhand and table wash shuffles, plus why seven riffles mix a 52-card deck, per Bayer and Diaconis.",
  h1: "How to shuffle cards: techniques, casino procedure and the seven-shuffle rule",
  answer:
    "To learn how to shuffle cards well, use the riffle shuffle: split the deck into two roughly equal halves, let the corners interleave as you release them, push the halves together and repeat. Mathematicians Dave Bayer and Persi Diaconis showed that about seven riffle shuffles are needed to mix a 52-card deck well. Overhand shuffles alone need thousands of repetitions to reach the same randomness.",
  facts: [
    "A 52-card deck can be ordered in 52! ≈ 8.07 × 10^67 ways.",
    "Bayer and Diaconis (1992) showed that about seven riffle shuffles bring a 52-card deck close to random.",
    "After six riffles the deck is still far from random; after seven the distance drops sharply and keeps halving.",
    "Overhand shuffling mixes slowly; estimates for a well-mixed deck run into the thousands of shuffles.",
    "Casinos combine a table wash, riffles, strips and a cut, or use automatic shuffling machines.",
  ],
  sections: [
    {
      id: "why",
      title: "What a shuffle is supposed to achieve",
      body: `A shuffle has one job: make every possible order of the deck equally likely, so nobody can predict the next card. That target is enormous. A standard 52-card deck can be arranged in 52! ways:

52! = 52 × 51 × 50 × … × 1 ≈ **8.07 × 10^67**

That number is so large that a properly shuffled deck is almost certainly in an order that has never existed before. The composition of the deck and the odds of common draws are covered in [52 card deck](/guides/52-card-deck).

### Why "looks mixed" is not enough

A deck can look mixed and still carry patterns from the last hand. After a game of bridge or blackjack, cards are gathered in clumps: tricks, hands or discards. A weak shuffle leaves many of those clumps intact. For casual games that only matters a little. For games where money depends on the next card, it matters a lot: a player who can track clumps through a weak shuffle gains information. Casinos design their shuffle procedures around that risk, and card counters study it; see [card counting](/guides/card-counting).

### Measuring randomness

Mathematicians measure how close a shuffled deck is to perfectly random with a number called **total variation distance**. It runs from 1, meaning the order is completely predictable in some respect, to 0, meaning perfectly random. The question "how many shuffles are enough?" becomes "how many shuffles until that distance is small?". This guide sits in the [Casino knowledge topic](/guides/topics/casino-knowledge).`,
    },
    {
      id: "riffle",
      title: "How to do a riffle shuffle and bridge",
      body: `The riffle is the standard shuffle in card rooms and the one the seven-shuffle result applies to.

### Step by step

1. **Cut.** Hold the deck face down and split it into two roughly equal halves, one in each hand.
2. **Position.** Place the halves on the table, short ends facing each other and inner corners almost touching.
3. **Bend.** With your thumbs on the inner corners and fingers on the far ends, lift the inner edges slightly so the cards bow upward.
4. **Release.** Let the cards fall from both thumbs so they interleave. Try to release at an even rhythm; one or two cards at a time from alternating sides is ideal.
5. **Push together.** Square the two halves into one deck.
6. **Repeat.** Do this seven times for a 52-card deck.

### The bridge finish

After releasing the cards, many players finish with a **bridge**: keep your thumbs on top and your fingers underneath, bend the interleaved deck into an arch and let the cards cascade together. It looks smart and reduces wear on the cards, but it does not add randomness; the interleaving already happened.

### Common mistakes

- **Uneven cuts.** A 40–12 split interleaves poorly; aim for close to 26–26.
- **Clumped release.** Dropping five cards at once from one side preserves runs from the previous order.
- **Showing the bottom card.** Keep the deck low and tilted so the bottom card is not visible.
- **Bending too hard.** Excessive bowing creases the cards, and marked cards are a problem in any game.

A riffle on the table is gentler on cards than a riffle in the air, and it is what dealers are taught; the training side is in [dealer school](/guides/dealer-school).`,
    },
    {
      id: "other",
      title: "Overhand, Hindu, table wash and other shuffles",
      body: `Other shuffles are easier to learn, and they have a place, but not as the main mixing step.

### Overhand shuffle

Hold the deck in one hand, edges vertical. With the other hand, repeatedly slide small packets from the back of the deck to the front. It is the shuffle most people learn first.

The problem is that it moves cards in blocks. A card's neighbours tend to stay its neighbours. Mathematical work by Robin Pemantle and others showed that overhand shuffling mixes a deck far more slowly than riffling; estimates for bringing a 52-card deck close to random run into the thousands of overhand shuffles. Use it as a supplement, not as the whole shuffle.

### Hindu shuffle

Common in South Asia and among magicians. Hold the deck by its sides from above and pull small packets off the top into the other hand. Mathematically it behaves much like the overhand shuffle: pleasant, portable and slow to randomise.

### Table wash

Spread the cards face down on the table and move them around with both hands for a while, then gather them. Casinos call it a **wash**, some players call it a **smoosh**, and in baccarat rooms it has long been standard. It is used on new decks, which come in a fixed factory order, and it is surprisingly effective when done thoroughly. Diaconis has reportedly suggested that about a minute of vigorous washing is enough for a single deck, though that is less precisely studied than the riffle.

### Strip, cut and pile shuffles

- **Strip:** pull packets off the top and pile them in reverse order; it breaks up the top and bottom.
- **Cut:** splitting and swapping two halves adds no randomness on its own but protects against a dealer setting the top cards.
- **Pile shuffle:** dealing cards into piles and stacking them looks thorough but is a fixed permutation; repeated, it can even restore the original order.`,
    },
    {
      id: "seven",
      title: "Why seven riffle shuffles: the Bayer–Diaconis result",
      body: `In 1992 Dave Bayer and Persi Diaconis published "Trailing the Dovetail Shuffle to its Lair" in the *Annals of Applied Probability*. They analysed the riffle shuffle using the Gilbert–Shannon–Reeds model, which describes a realistic riffle: the cut follows a binomial distribution around the middle, and cards drop from each half with probability proportional to the number left in that half.

### The table

Their calculation gives the total variation distance from random after k riffles of a 52-card deck:

| Riffles | Distance from random |
| --- | --- |
| 1–4 | 1.000 |
| 5 | 0.924 |
| 6 | 0.614 |
| 7 | 0.334 |
| 8 | 0.167 |
| 9 | 0.085 |
| 10 | 0.043 |

Up to four riffles the deck is essentially as far from random as it can be by this measure. Then there is a cut-off: the distance collapses over the next few shuffles, and from seven onward it roughly halves with each extra riffle. Seven is where the deck first becomes "reasonably" mixed; more shuffles make it better.

### Rising sequences

A key idea in the proof is the **rising sequence**: a run of cards that stay in their original relative order. One riffle of a sorted deck creates at most two rising sequences; each further riffle can at most double the number. Two, four, eight, sixteen, thirty-two: after five riffles there can be at most 32, which is still fewer than a random deck typically shows. That is why five or six riffles leave detectable structure, and why magicians can exploit decks shuffled only a few times.

### Caveats

- The model assumes a realistic, somewhat sloppy riffle. **Perfect** riffles (faro shuffles) are not random at all: eight perfect out-faros return a 52-card deck to its starting order.
- Different measures of randomness give slightly different answers; some researchers argue that fewer shuffles suffice for specific games.
- More cards need more shuffles: the number grows roughly as (3/2) log₂ n, so a six-deck blackjack shoe needs substantially more mixing than one deck.`,
    },
    {
      id: "casino",
      title: "How casinos shuffle",
      body: `Casinos treat the shuffle as a security procedure, because a predictable deck is a way to lose money.

### A typical hand-shuffle procedure

House procedures vary, but a common pattern for hand-shuffled blackjack or baccarat is:

1. **Wash** new decks or the full shoe on the table.
2. **Riffle** in stacks, often working a multi-deck shoe in smaller portions.
3. **Strip** a stack to break up top and bottom sections.
4. **Riffle** again.
5. **Offer the cut** to a player, who inserts a cut card.
6. **Burn** one or more cards face down before dealing.

The exact order is written in the casino's internal controls and approved by the regulator. Dealers are trained to do it identically every time in view of surveillance cameras.

### Shuffling machines

Most modern casinos use automatic shuffling machines, especially for multi-deck games and poker. Two types matter:

- **Batch shufflers** shuffle a full shoe or deck between rounds.
- **Continuous shuffling machines (CSMs)** return discards to the machine after each round, so the shoe is never depleted. CSMs neutralise traditional card counting, because the remaining-deck composition never drifts far.

How many decks a game uses, and why it affects the edge, is covered in [how many decks in blackjack](/guides/how-many-decks-blackjack).

### Shuffle tracking and cheating

Advantage players have studied weak casino shuffles to follow clumps of high cards through the shuffle, a technique called shuffle tracking. Cheats, on the other hand, use false shuffles that look real but keep a stacked order, the same sleight of hand used in street cons such as [three card monte](/guides/three-card-monte). Both are reasons casinos moved to strict procedures and machines.`,
    },
    {
      id: "digital",
      title: "Physical shuffles vs digital randomness",
      body: `Online card games do not shuffle physically. They use a random number generator to pick a permutation, often with the Fisher–Yates algorithm, which produces every one of the 52! orders with equal probability when fed good random numbers. How those generators work is covered in [how random number generators work](/guides/how-random-number-generators-work), and the difference between certified RNGs and provably fair systems is in [RNG vs provably fair](/guides/rng-vs-provably-fair).

### A quick checklist for home games

- Use seven good riffles for one deck; more for multiple decks combined.
- Start with a wash if the deck is new or came straight from a game of bridge or rummy.
- Finish with a cut by another player.
- Keep the bottom card hidden while shuffling and dealing.
- Replace cards once they are bent, marked or sticky.

### How PVPspinArena handles randomness

PVPspinArena runs three player-vs-player games, [Jackpot](/), Coinflip and Roulette, and has no cards to shuffle. Results come from a commit-reveal scheme: the server's seed is committed as a hash before the round and revealed after, so it cannot be changed once bets are in. Anyone can take a settled round and verify the result on the [fairness](/fairness) page. It is the digital version of letting a player cut the deck: a check you can perform yourself, rather than a procedure you must trust. Roulette's 33 slots pay 2x on Purple or Silver and 14x on Green, about a 7.88% Purple or Silver edge after the win fee. Play is 18+.

In the same cluster, see also [law of large numbers](/guides/law-of-large-numbers-gambling), [monty hall problem](/guides/monty-hall-problem), and [regression to the mean](/guides/regression-to-the-mean-gambling).`,
    },
  ],
  faqs: [
    {
      q: "How many times should you shuffle a deck of cards?",
      a: "About seven riffle shuffles for a single 52-card deck, based on the Bayer–Diaconis analysis. Fewer leave noticeable patterns; more improve randomness further.",
    },
    {
      q: "What is the best way to shuffle cards?",
      a: "The riffle shuffle, done seven times with even cuts and a steady release, followed by a cut from another player. Start with a table wash for new decks.",
    },
    {
      q: "Is the overhand shuffle random?",
      a: "Only after a very large number of repetitions. It moves cards in blocks, so estimates for a well-mixed deck run into the thousands. Use it alongside riffles, not instead of them.",
    },
    {
      q: "How do casinos shuffle cards?",
      a: "Hand-shuffled games follow a fixed procedure of washing, riffling, stripping and cutting in view of cameras. Many games use automatic or continuous shuffling machines instead.",
    },
    {
      q: "What is a bridge shuffle?",
      a: "It is the finish after a riffle: you arch the interleaved cards with your thumbs and let them cascade together. It looks neat and saves wear but adds no randomness itself.",
    },
  ],
  sources: [
    { label: "Wikipedia: Shuffling", url: "https://en.wikipedia.org/wiki/Shuffling" },
    {
      label: "Wikipedia: Gilbert–Shannon–Reeds model",
      url: "https://en.wikipedia.org/wiki/Gilbert%E2%80%93Shannon%E2%80%93Reeds_model",
    },
    {
      label: "Wikipedia: Fisher–Yates shuffle",
      url: "https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle",
    },
  ],
  related: [
    "52-card-deck",
    "card-counting",
    "how-random-number-generators-work",
    "monty-hall-problem",
    "dealer-school",
    "three-card-monte",
    "law-of-large-numbers-gambling",
    "regression-to-the-mean-gambling",
  ],
  updated: "2026-09-27",
};
