import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bingo-patterns",
  cluster: "Games of chance",
  keyword: "bingo patterns",
  secondary: ["bingo pattern list", "bingo game patterns", "blackout bingo", "four corners bingo"],
  title: "Bingo Patterns: Common Shapes and How Long They Take",
  description:
    "Bingo patterns explained: lines, four corners, X, frame and blackout, how many numbers each needs, and how pattern choice sets game length.",
  h1: "Bingo patterns: common shapes and how they change game length",
  answer:
    "Bingo patterns are the shapes a player must complete on a card to win a game: a single line, four corners, a letter X, a picture frame or a full blackout. The pattern decides how many numbers you need, so it sets how long the game runs. A single line in a busy hall usually ends in 12 to 20 calls; a blackout can take 60 or more.",
  facts: [
    "A 75-ball card is 5 × 5 with a free centre square, so it holds 24 numbers.",
    "There are 12 winning straight lines on a 75-ball card: 5 rows, 5 columns and 2 diagonals.",
    "Lines through the centre need only 4 numbers because the free space counts.",
    "In our simulation with 100 cards in play, a single line was won after about 16 calls on average and a blackout after about 63.",
    "90-ball tickets use three prizes in sequence: one line, two lines, full house.",
  ],
  sections: [
    {
      id: "what",
      title: "What a bingo pattern is",
      body: `In bingo, the numbers are drawn at random and every player marks the matching squares on their card. The pattern is the rule that says which marked squares count as a win. Change the pattern and you change the game, even though the balls, the cards and the caller stay the same. Keno also draws numbers, but the ticket, the pace, and the cost are a different product. That comparison is [keno vs bingo](/guides/keno-vs-bingo).

There are two main card formats:

- **75-ball** (common in North America): a 5 × 5 grid under the letters B-I-N-G-O. B holds 1–15, I holds 16–30, N holds 31–45, G holds 46–60 and O holds 61–75. The centre square is free, so a card has 24 numbers.
- **90-ball** (common in the UK, Ireland and Australia): a ticket of 3 rows and 9 columns with 15 numbers, five per row.

75-ball halls use a huge variety of patterns because a square card lends itself to shapes and letters. 90-ball halls mostly play the same three-stage format every game.

For the calling side of the game (how numbers are announced and checked), see [bingo caller](/guides/bingo-caller). For playing online with crypto, [crypto bingo](/guides/crypto-bingo) covers sites and RTP. This page sits in the [Games of chance topic](/guides/topics/games-of-chance).`,
    },
    {
      id: "list",
      title: "Common 75-ball bingo patterns",
      body: `The table counts how many numbers each pattern needs, with the free space already counted where it falls inside the shape.

| Pattern | Squares to mark | Numbers needed | Notes |
| --- | --- | --- | --- |
| Single line | Any row, column or diagonal | 4 or 5 | 4 if the line crosses the centre |
| Four corners | The four corner squares | 4 | Quick, popular early game |
| Postage stamp | A 2 × 2 block in a corner | 4 | Sometimes any corner, sometimes only top right |
| Small diamond | The 8 squares around the centre | 8 | Also called small picture frame |
| Letter X | Both diagonals | 8 | Free centre shared by both |
| Plus sign | Middle row and N column | 8 | Also called cross |
| Letter T | Top row and N column | 8 | |
| Letter L | B column and bottom row | 9 | |
| Two lines | Any two lines | 7 to 10 | Depends on overlap and centre |
| Picture frame | All outer edge squares | 16 | Also called outside edge |
| Blackout | Every square | 24 | Also called coverall |

### Variations halls use

- **Roving or crazy patterns.** A crazy L or crazy T can sit in any orientation, which makes it much quicker because there are more ways to complete it.
- **Hard-way bingo.** A line that does not use the free space, so it always needs 5 numbers.
- **Letters and pictures.** Halls invent shapes for holidays, such as a Christmas tree or a kite. Count the squares; the count predicts the length.
- **Blackout in N numbers.** A coverall jackpot that only pays if the card is filled within a set number of calls. If nobody makes it, a smaller consolation prize is paid instead.`,
    },
    {
      id: "length",
      title: "How pattern choice changes game length",
      body: `The more numbers a pattern needs, the longer the game. But two other things matter just as much: how many ways the pattern can be completed on a card, and how many cards are in play.

### One card, one fixed pattern

If you need k specific numbers out of 75, the expected number of calls before the last of them is drawn is k × 76 / (k + 1). For four corners (k = 4) that is 60.8 calls. For a blackout (k = 24) it is 73.0. A single card on its own is a slow way to play.

### Many cards in play

A hall does not wait for your card. The game ends when the first card anywhere completes the pattern. We simulated games with randomly generated 75-ball cards and averaged the number of calls to the first winner:

| Cards in play | Single line | Four corners | Letter X | Picture frame | Blackout |
| --- | --- | --- | --- | --- | --- |
| 1 | 42 | 60 | 68 | 72 | 73 |
| 10 | 26 | 40 | 55 | 65 | 68 |
| 100 | 16 | 25 | 43 | 58 | 63 |
| 500 | 12 | 19 | 36 | 53 | 60 |

These are simulation averages, rounded, and real halls will vary. The pattern is clear, though. A single line has 12 routes to victory on every card, so with hundreds of cards someone finishes quickly. A blackout has one route per card, so even 500 cards need about 60 calls.

### The bubble

Callers talk about breaking the bubble: the earliest call at which any win is possible. For four corners that is call 4. For a blackout it is call 24, and in practice it never happens anywhere near that. The average line game ends well before half the balls are drawn.`,
    },
    {
      id: "odds",
      title: "The probability behind the shapes",
      body: `For a pattern needing k specific numbers, the chance that a single card has completed it after n calls is:

C(75 − k, n − k) / C(75, n)

### Worked numbers for one card

| Calls made | Four corners | One 5-number line | Blackout |
| --- | --- | --- | --- |
| 30 | 2.3% | 0.8% | about 1 in 43 trillion |
| 40 | 7.5% | 3.8% | about 1 in 410 million |
| 50 | 19.0% | 12.3% | about 1 in 212,000 |
| 60 | 40.1% | 31.6% | about 1 in 715 |

The blackout column shows why halls can attach a large jackpot to "coverall in 50 numbers or fewer". With 500 cards in play, the chance that anyone fills a card by call 50 is only about 500 × 1/212,000, roughly 0.24% per game. The jackpot can roll for a long time.

### Horizontal lines win more often

Because each column only draws from its own 15 numbers, a vertical line needs five numbers from one narrow range while a horizontal line needs one number from each column. When many cards are in play, research published in *Math Horizons* found that horizontal lines win about three times as often as vertical ones. It does not help you pick a card, since every card has the same rows and columns, but it explains why the winning line is usually horizontal.

### More cards, same maths

Playing more cards raises your chance of winning a given game in proportion to your share of the cards in play. Buying 6 of 300 cards gives you about a 2% chance. That is the same logic as a pot share, and it is covered in more depth in [law of large numbers](/guides/law-of-large-numbers-gambling).

The chance a card completes a shape is [bingo odds](/guides/bingo-odds). The pattern names live on this page.`,
    },
    {
      id: "ninety",
      title: "90-ball patterns",
      body: `In 90-ball bingo, the pattern sequence is almost always the same:

1. **One line.** Any complete horizontal row of five numbers.
2. **Two lines.** Any two complete rows on the same ticket.
3. **Full house.** All 15 numbers on the ticket.

Each stage is played in turn without clearing the ticket, so a session produces three winners per game.

### How long a full house takes

For one ticket, the expected call at which all 15 numbers are out is 15 × 91 / 16 ≈ 85.3, nearly the whole bag. The chance that a single ticket has a full house within 60 calls is about 0.12%, and within 70 calls about 1.6%. In a busy hall the full house usually lands earlier because so many tickets compete, but it is still the long part of the game.

Tickets are sold in strips of six that together contain every number from 1 to 90 exactly once. Buying a full strip guarantees that each ball called marks one of your tickets, which feels productive but does not change your chance of a full house relative to the number of tickets in the hall.

### Other formats

- **80-ball**, played on a 4 × 4 card, is common online and uses patterns such as corners, lines and the inner square.
- **30-ball** or speed bingo uses a 3 × 3 card and a full house only, so games take seconds.

The fewer numbers a card holds, the faster the game ends, which is the same principle as the 75-ball table above.`,
    },
    {
      id: "choose",
      title: "Choosing patterns as a host or player",
      body: `### For hosts

If you run a charity night, a school fundraiser or a family game, the pattern is your pacing tool.

- Open with quick games: a single line or four corners to get people marking and winning early.
- Put shapes of 8 to 9 numbers, such as X, T or L, in the middle of the session.
- Finish with a picture frame or blackout for the biggest prize.
- Display the pattern clearly before each game and repeat it before the first ball.

Prize size should track difficulty. A blackout takes several times as many calls as a line, so it deserves a larger prize. Rules on who may run bingo for money, and what prizes are allowed, differ by country and region. Many places license charity bingo separately, so check before selling cards.

### For players

- Patterns change how long you are in the game, not your share of the chance. Your odds of winning any game equal your cards divided by all cards in play, whatever the shape.
- Crazy and roving patterns end faster, which means more games per hour and more spending per hour.
- Count the cost per hour, not just per card. Twenty quick line games can cost more than five blackout games.

Bingo prizes, like [pull tabs](/guides/pull-tabs) and [quick pick](/guides/quick-pick-lottery) lottery tickets, return less than players pay in overall, because the organiser keeps part of the takings. Play for adults only, 18+ or the local legal age.`,
    },
    {
      id: "pvp",
      title: "Patterns, pot shares and PvP rounds",
      body: `Strip away the dauber and bingo is a shared pot. Everyone buys in, one random draw sequence decides the winner, and your chance is your share of the cards. The pattern just decides how long the draw takes.

PVPspinArena runs the same idea without the waiting. In [Jackpot](/), players add wagers to one pot and your win chance equals your share of it: put in 5% of the pot and you win about 5% of the time. The winner takes the pot minus any fee shown before entry. [Coinflip](/coinflip) is the two-player case, a straight 50/50. [Roulette](/roulette) is a shared wheel of 33 slots where Purple and Silver pay 2x and Green pays 14x, returning 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee of every bet.

Each result comes from committed seeds, so the draw is fixed before anyone joins, and any settled round can be checked on [fairness](/fairness). A bingo hall asks you to trust the blower; a hashed round lets you verify it. Play is in USDC or ETH on Base, and the [responsible gambling](/responsible-gambling) page has limits if games start running longer than you planned.`,
    },
  ],
  faqs: [
    {
      q: "What are the most common bingo patterns?",
      a: "Single line, four corners, postage stamp, letter X, letter T, letter L, picture frame and blackout (coverall). 90-ball bingo mostly uses one line, two lines and full house.",
    },
    {
      q: "What is the easiest bingo pattern to win?",
      a: "Four corners and a line through the free centre square each need only four numbers. A single line is usually the quickest game overall because every card has 12 possible lines.",
    },
    {
      q: "How many numbers does it take to get a blackout in bingo?",
      a: "A 75-ball blackout needs all 24 numbers on the card. With a few hundred cards in play, the first blackout typically comes after roughly 60 calls. One card alone averages about 73 calls.",
    },
    {
      q: "Does the pattern change my odds of winning?",
      a: "No. Your chance of winning a game is your number of cards divided by all cards in play. The pattern changes how long the game lasts and how many games you play per hour.",
    },
    {
      q: "What is a crazy pattern in bingo?",
      a: "A crazy pattern, such as a crazy L or crazy T, can be completed in any orientation on the card. More possible positions mean games end faster than with a fixed pattern.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Bingo (American version)",
      url: "https://en.wikipedia.org/wiki/Bingo_(American_version)",
    },
    {
      label: "Wikipedia: List of British bingo nicknames",
      url: "https://en.wikipedia.org/wiki/List_of_British_bingo_nicknames",
    },
  ],
  related: ["bingo-caller", "crypto-bingo", "pull-tabs", "quick-pick-lottery", "keno-odds"],
  updated: "2026-09-27",
};
