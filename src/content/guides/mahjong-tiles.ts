import type { Guide } from "./types";

export const guide: Guide = {
  slug: "mahjong-tiles",
  cluster: "Games of chance",
  keyword: "mahjong tiles",
  secondary: [
    "mahjong rules",
    "mahjong tile set",
    "mahjong tile meanings",
    "how many mahjong tiles",
  ],
  title: "Mahjong Tiles: Full Set, Suits, Honours and Meanings",
  description:
    "Mahjong tiles explained: the 144-tile set, the three suits, winds, dragons, flowers and seasons, regional sets, and the basic mahjong rules for a first game.",
  h1: "Mahjong tiles: the full set, suits, honours, meanings and basic rules",
  answer:
    "A standard Chinese set of mahjong tiles has 144 tiles: three suits (dots, bamboo and characters) numbered 1 to 9 with four copies of each (108), four winds and three dragons with four copies each (28), and eight bonus flower and season tiles. Players hold 13 tiles, draw and discard, and win with four sets plus a pair.",
  facts: [
    "108 suit tiles + 16 winds + 12 dragons + 8 flowers and seasons = 144 tiles in the standard Chinese set.",
    "There are 34 distinct playing tiles, each appearing four times; bonus tiles appear once each.",
    "Japanese riichi sets use 136 tiles with no flowers, usually adding red fives; American sets use 152 tiles including 8 jokers.",
    "The red dragon shows 中 (centre), the green dragon 發 (prosperity) and the white dragon is usually blank or framed.",
    "A standard winning hand has 14 tiles: four melds (pungs, kongs or chows) and one pair.",
  ],
  sections: [
    {
      id: "set",
      title: "The complete mahjong set at a glance",
      body: `Mahjong developed in China in the second half of the 19th century and spread to the West in the 1920s. The commonly told origin story places its development in the Ningbo region of eastern China, though the exact origin is debated. Whatever its source, the tile set has stayed remarkably consistent.

| Group | Tiles | Copies | Total |
| --- | --- | --- | --- |
| Dots (circles) 1–9 | 9 | 4 | 36 |
| Bamboo (sticks) 1–9 | 9 | 4 | 36 |
| Characters (cracks) 1–9 | 9 | 4 | 36 |
| Winds: East, South, West, North | 4 | 4 | 16 |
| Dragons: red, green, white | 3 | 4 | 12 |
| Flowers | 4 | 1 | 4 |
| Seasons | 4 | 1 | 4 |
| **Total** | | | **144** |

Remove the eight bonus tiles and you have 136 playing tiles: 34 distinct faces, each four times. That "four of each" structure is the key to the whole game. It sets what melds are possible and how many copies of a needed tile are still out there. Most sets also include dice, a wind indicator and sometimes tile racks and scoring sticks.

Mahjong sits with dominoes and pai gow in the tile games of the [Games of chance topic](/guides/topics/games-of-chance). The tiles look like dominoes, but play is closer to a card game such as rummy: you draw, discard and build sets.`,
    },
    {
      id: "suits",
      title: "The three suits: dots, bamboo and characters",
      body: `The three suits are the backbone of the set. Each runs from 1 to 9, and each number has four identical copies.

### Dots

Also called circles, balls or wheels. Each tile shows its number of circles, from a single large decorated circle on the 1 to nine small circles on the 9. They are commonly said to represent coins, which fits the game's money theme.

### Bamboo

Also called sticks or bams. Tiles 2 to 9 show that number of bamboo sticks. The 1 bamboo is the exception: it usually shows a bird, often a peacock or sparrow, which confuses new players who look for a single stick. Like dots, bamboo is often linked to strings of coins.

### Characters

Also called cracks or numbers. Each tile shows the Chinese numeral for 1 to 9 (一, 二, 三 and so on) above the character 萬 (wàn), meaning ten thousand. For players who do not read Chinese, many sets add small Arabic numerals in the corner.

### Terminals and simples

The 1s and 9s of each suit are called **terminals**. Tiles 2 to 8 are **simples**. Terminals matter because they can only form a sequence in one direction (1-2-3 or 7-8-9), and several scoring hands reward or penalise them. There are 13 different terminal and honour tiles in all (six terminals, four winds, three dragons), and the famous Thirteen Orphans hand needs one of each of those 13 tiles plus a pair of any of them.`,
    },
    {
      id: "honours",
      title: "Honour tiles: winds and dragons and what they mean",
      body: `Honour tiles have no numbers and cannot form sequences. They can only be collected as pairs, pungs (three of a kind) or kongs (four of a kind).

### Winds

| Tile | Character | Pinyin |
| --- | --- | --- |
| East | 東 | dōng |
| South | 南 | nán |
| West | 西 | xī |
| North | 北 | běi |

Each player sits in a wind position, and each round has a prevailing wind. A pung of your own seat wind or the round wind usually scores extra. Seats go East, South, West, North in the direction of play (anticlockwise), so South sits on East's right. That is the reverse of a map, a detail that surprises many first-time players.

### Dragons

| Dragon | Character | Meaning |
| --- | --- | --- |
| Red | 中 (zhōng) | Centre, middle |
| Green | 發 (fā) | Prosperity, getting rich |
| White | 白 (bái) | White; tile often blank or with a blue frame |

A pung of any dragon typically scores. Collecting pungs of all three dragons is a famous limit hand, often called Big Three Dragons. In American mahjong, the white dragon is nicknamed "soap" and doubles as a zero in hands built around the year.

Some players claim the dragons stand for Confucian virtues, or for the parts of the imperial examinations. These are popular explanations rather than documented history, so treat them as folklore.`,
    },
    {
      id: "bonus",
      title: "Flowers, seasons, jokers and regional sets",
      body: `### Flowers and seasons

The eight bonus tiles appear once each. The four flowers are usually plum, orchid, chrysanthemum and bamboo; the four seasons are spring, summer, autumn and winter. Each is numbered 1 to 4, matching the seats East, South, West and North. You never keep a bonus tile in your hand: you place it face up beside you and draw a replacement. In many Chinese scoring systems, drawing your own seat's flower or season earns a bonus.

### How regional sets differ

| Style | Tiles | Notable differences |
| --- | --- | --- |
| Chinese / Hong Kong | 144 | Flowers and seasons as bonus tiles |
| Japanese riichi | 136 | No flowers; usually one red 5 in each suit as a bonus (dora) |
| American (NMJL) | 152 | Adds 8 jokers; hands are set by an annual card |
| Singapore / Malaysia | Typically 148 or more | Adds animal bonus tiles |

American mahjong is governed by the National Mah Jongg League, founded in 1937, which publishes a new card of legal hands every year. Jokers can stand in for tiles in pungs and kongs but, under standard American rules, not in pairs or single tiles. Before any game, check that everyone's set matches the rules being used: an American set cannot be used for riichi without removing tiles, and a riichi set lacks the jokers an American game needs.`,
    },
    {
      id: "rules",
      title: "Basic mahjong rules for a first game",
      body: `Rules vary by region, but the core of a Chinese-style game is shared.

1. **Build the wall.** Four players shuffle the tiles face down and build a square wall, each side 18 stacks two tiles high (144 tiles). Dice decide where the wall is broken.
2. **Deal.** Each player takes 13 tiles; the dealer (East) takes 14 and starts by discarding one.
3. **Draw and discard.** Play moves anticlockwise. On your turn, draw a tile from the wall, then discard one face up. Your hand always returns to 13 tiles.
4. **Claim discards.** You may claim a discard to complete a meld. You can claim a tile for a pung or kong from any player, but a chow (sequence) only from the player on your left, whose turn comes just before yours.
5. **Win.** Complete a 14-tile hand of four melds and a pair, from a draw or a discard, and declare it.

### Melds

- **Chow:** three consecutive tiles in one suit, such as 4-5-6 of bamboo.
- **Pung:** three identical tiles.
- **Kong:** four identical tiles. You draw a replacement tile, because a kong uses four tiles to fill a three-tile slot.
- **Pair (eyes):** two identical tiles, needed once in a standard hand.

### Claim priority

A claim to win beats a pung or kong claim, which beats a chow claim. If two players want the same discard to win, most rules give it to the player next in turn.

Scoring is where versions diverge sharply, from simple Chinese point counts to Japanese yaku and han. Playing for money brings its own customs; the [mahjong gambling](/guides/mahjong-gambling) guide covers stakes, scoring units and parlours.`,
    },
    {
      id: "odds",
      title: "Counting tiles: the probability behind a wait",
      body: `Because every tile exists exactly four times, mahjong rewards counting. When your hand needs one more tile to win, you are "waiting". The number of useful tiles still unseen is your **live count**.

### Worked example

You hold 4-5 of dots and need a 3 or a 6 to finish. That is an open-ended wait: 8 tiles in total. You can see one 3 and one 6 in the discards, so 6 copies are live. Suppose 70 tiles are unseen from your point of view (the rest of the wall plus the other players' hands).

- Chance your next draw wins: 6/70 ≈ 8.6%.
- Chance of drawing a winner yourself within your next five draws, treating unseen tiles as equally likely: 1 − (64/70 × 63/69 × 62/68 × 61/67 × 60/66) ≈ 1 − 0.63 = 37%.

That ignores wins from discards, and opponents holding your tiles, so the real figure depends on play. Compare a single-tile wait, such as needing only the 7 to fill 6-_-8: at most four copies exist, so with one visible, just 3 are live and every probability roughly halves. That is why skilled players prefer waits with many live tiles, and why reading discards matters.

Counting in cards follows the same logic; the [52-card deck](/guides/52-card-deck) guide works through draws from a known composition. The [expected value](/guides/expected-value-gambling) guide shows how to weigh a slower, higher-scoring hand against a quick, cheap one.`,
    },
    {
      id: "pvp",
      title: "Tiles, chance and a verifiable shuffle",
      body: `A mahjong game mixes chance and skill. The wall is random, so any single hand can go either way, but over many sessions, counting tiles, choosing efficient waits and defending against dangerous discards separate strong players from weak ones. The same mix appears in [dominoes](/guides/dominoes-rules), which uses a smaller, simpler tile set.

The weak point of any physical shuffle is trust: you rely on everyone having mixed the tiles honestly. Online games replace the table shuffle with software, and players deserve a way to check it. PVPspinArena runs three player-vs-player games in USDC or ETH on the Base network: Jackpot, [Coinflip](/coinflip) and Roulette. Each result comes from committed seeds that are revealed after the round, so anyone can confirm on [fairness](/fairness) that the outcome was fixed before bets closed. A coin flip is a fair 50/50; Roulette's 33-slot wheel returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee on average, about a 7.88% Purple or Silver edge after the win fee.

If you play mahjong or anything else for money, you must be 18+ (or the local legal age), agree the stakes before the first tile is drawn, and keep a limit. The tools at [responsible gambling](/responsible-gambling) help if a regular game starts to feel like a problem.

In the same cluster, see also [mexican train rules](/guides/mexican-train-rules) and [chicken foot dominoes](/guides/chicken-foot-dominoes).`,
    },
  ],
  faqs: [
    {
      q: "How many tiles are in a mahjong set?",
      a: "A standard Chinese set has 144 tiles. Japanese riichi sets use 136 without flowers, and American sets have 152 including eight jokers. Some Southeast Asian sets add animal tiles.",
    },
    {
      q: "What are the three suits in mahjong?",
      a: "Dots (circles), bamboo (sticks) and characters (cracks). Each suit runs from 1 to 9 with four copies of every tile.",
    },
    {
      q: "What do the mahjong dragon tiles mean?",
      a: "The red dragon shows 中, meaning centre; the green dragon shows 發, meaning prosperity; and the white dragon, 白, is usually a blank tile or a blue frame.",
    },
    {
      q: "Why is the 1 bamboo a bird?",
      a: "By long tradition, the 1 bamboo shows a bird, often a peacock or sparrow, instead of a single stick. It counts as an ordinary 1 of the bamboo suit.",
    },
    {
      q: "What are the basic mahjong rules?",
      a: "Four players each hold 13 tiles, draw one and discard one each turn, and claim discards to form melds. The first to complete four melds and a pair wins the hand.",
    },
  ],
  sources: [
    { label: "Wikipedia: Mahjong", url: "https://en.wikipedia.org/wiki/Mahjong" },
    { label: "Wikipedia: Mahjong tiles", url: "https://en.wikipedia.org/wiki/Mahjong_tiles" },
    { label: "National Mah Jongg League", url: "https://www.nationalmahjonggleague.org/" },
  ],
  related: [
    "mahjong-gambling",
    "dominoes-rules",
    "mexican-train-rules",
    "pai-gow-tiles",
    "tavla",
    "chicken-foot-dominoes",
  ],
  updated: "2026-09-27",
};
