import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pai-gow-tiles",
  cluster: "Casino games",
  keyword: "pai gow tiles",
  secondary: [
    "pai gow dominoes",
    "chinese dominoes",
    "pai gow tile rankings",
    "how to play pai gow",
  ],
  title: "Pai Gow Tiles: Chinese Domino Rules and Tile Rankings",
  description:
    "Pai gow tiles explained: the 32 Chinese dominoes, civil and military tiles, pair rankings, Wong and Gong, scoring, setting four tiles into two hands, and odds.",
  h1: "Pai gow tiles: the Chinese domino game, tile rankings and setting hands",
  answer:
    "Pai gow tiles is a Chinese banking game played with a set of 32 dominoes. Each player receives four tiles and splits them into a high hand and a low hand of two tiles each. Hands score the total pips modulo 10, with special pairs, Wongs and Gongs above ordinary nines. To win, both of your hands must beat the banker's; one of each is a push.",
  facts: [
    "A pai gow set has 32 tiles: 11 matched pairs of civil tiles and 10 unmatched military tiles.",
    "The Gee Joon pair (1-2 and 2-4) is the highest hand; each Gee Joon tile can count as 3 or 6.",
    "A Wong is Teen or Day with a nine; a Gong is Teen or Day with an eight.",
    "Four tiles can be split into two hands in only three ways.",
    "Ties in value and tile rank go to the banker, and casinos usually take 5% of winning bets.",
  ],
  sections: [
    {
      id: "set",
      title: "The 32-tile set: civil and military",
      body: `Pai gow ("make nine" is the usual translation) uses Chinese dominoes, not the double-six Western set. There are 32 tiles. Every tile has two ends marked with one to six pips, and there are no blank ends. The set is divided into two families that matter for pairing and ranking.

### Civil tiles

Eleven tile designs appear twice each, making 22 civil tiles. They are ranked in a fixed traditional order, highest first:

| Rank | Name (common spelling) | Pips | Total |
| --- | --- | --- | --- |
| 1 | Teen (Heaven) | 6-6 | 12 |
| 2 | Day (Earth) | 1-1 | 2 |
| 3 | Yun (Man) | 4-4 | 8 |
| 4 | Gor (Goose) | 1-3 | 4 |
| 5 | Mooy (Flower) | 5-5 | 10 |
| 6 | Chong (Long) | 3-3 | 6 |
| 7 | Bon (Bench) | 2-2 | 4 |
| 8 | Foo (Axe) | 5-6 | 11 |
| 9 | Ping (Partition) | 4-6 | 10 |
| 10 | Tit (Long leg seven) | 1-6 | 7 |
| 11 | Look (Big head six) | 1-5 | 6 |

### Military tiles

Ten tiles appear only once. They pair by total rather than by identical faces:

| Group | Tiles | Total |
| --- | --- | --- |
| Chop Gow (nines) | 4-5, 3-6 | 9 |
| Chop Bot (eights) | 3-5, 2-6 | 8 |
| Chop Chit (sevens) | 3-4, 2-5 | 7 |
| Chop Ng (fives) | 1-4, 2-3 | 5 |
| Gee Joon | 1-2, 2-4 | 3 and 6 |

Tile names are Cantonese-derived and spellings vary between casinos and books, but the pips are universal. If you know Western dominoes, the [dominoes rules guide](/guides/dominoes-rules) covers the double-six set, which works very differently.`,
    },
    {
      id: "scoring",
      title: "Scoring a two-tile hand",
      body: `Every hand is two tiles, and the basic score is the total number of pips modulo 10. You drop the tens digit, as in baccarat.

- Teen (12) + Look (6) = 18 → **8**
- Mooy (10) + Chop Chit 3-4 (7) = 17 → **7**
- Foo (11) + Gor (4) = 15 → **5**
- Mooy (10) + Ping (10) = 20 → **0**

The best ordinary score is 9 and the worst is 0. If the baccarat rule is new to you, the [baccarat rules guide](/guides/baccarat-rules) uses the same modulo-10 count.

### Hands above nine

Three kinds of hand outrank every ordinary score.

1. **Pairs.** Two identical civil tiles, or the two military tiles in the same group, make a pair. Pairs beat everything else.
2. **Wong.** Teen or Day with any nine-tile (4-5 or 3-6). Worth more than 9; a Teen Wong beats a Day Wong.
3. **Gong.** Teen or Day with any eight (Yun 4-4, or Chop Bot 3-5 or 2-6). Worth more than 9 but less than a Wong.

### The Gee Joon tiles

The two Gee Joon tiles are the most flexible in the set. When they are not paired together, each can be counted as either 3 or 6, whichever is better for the hand. Gee Joon 1-2 with Teen can therefore be 3 + 12 = 15 → 5 or 6 + 12 = 18 → 8, so it scores 8. Paired together, they form the highest hand in the game.

### Pair order

From highest to lowest: Gee Joon, Teen, Day, Yun, Gor, Mooy, Chong, Bon, Foo, Ping, Tit, Look, Chop Gow, Chop Bot, Chop Chit, Chop Ng. The civil pairs follow the civil ranking; military pairs sit below all of them.`,
    },
    {
      id: "play",
      title: "How a round is played",
      body: `A casino pai gow tiles table has a banker (the house dealer, or a player who takes the bank) and up to several players. The flow is the same in both cases.

1. **Bets.** Players place their bets before the deal.
2. **Build the woodpile.** The dealer shuffles the tiles face down and stacks them into eight stacks of four.
3. **Dice.** Three dice are rolled, and the total decides which position receives the first stack. Stacks are then handed out in order.
4. **Set.** Each player arranges their four tiles into a high hand and a low hand. The high hand must outrank the low hand.
5. **Banker sets.** The banker sets its tiles according to the house way, a fixed set of rules published by the casino.
6. **Compare.** Each player's high hand is compared with the banker's high hand, and low with low.

### Results

| Your high hand | Your low hand | Result |
| --- | --- | --- |
| Wins | Wins | You win, minus commission |
| Wins | Loses | Push |
| Loses | Wins | Push |
| Loses | Loses | You lose |

### Ties and copies

When a player hand and the banker hand have the same score, the hand holding the higher-ranking single tile wins. If that tile is also equal in rank, the hand is a **copy** and the banker wins. In the common rule, hands that score zero go to the banker without comparing tiles. Copies are one of the two main sources of the banker's advantage; the other is the commission.

### Commission and banking

Casinos usually charge 5% on winning player bets. Players can often take a turn as banker, playing against everyone at the table, with the house co-banking or charging commission on the banker's net win. Because the banker wins copies, banking is generally the stronger position.`,
    },
    {
      id: "setting",
      title: "Setting four tiles into two hands",
      body: `Four tiles can be split into two pairs in only three ways: tile A goes with B, C or D, and the remaining two form the other hand. That makes pai gow tiles easy to learn and subtle to master, because the three options often trade a strong high hand against a strong low hand.

### A worked split

You hold Teen (6-6), Chop Gow 4-5 (9), Mooy (5-5) and Tit (1-6).

| Split | High hand | Low hand |
| --- | --- | --- |
| Teen + 4-5 / Mooy + Tit | Wong (Teen with a nine) | 10 + 7 = 17 → 7 |
| Teen + Mooy / 4-5 + Tit | 6 (9 + 7 = 16) | 2 (12 + 10 = 22) |
| Teen + Tit / Mooy + 4-5 | 9 (12 + 7 = 19) | 9 (10 + 9 = 19) |

The middle split is clearly worst. The other two are a genuine choice: Wong/7 makes the high hand almost unbeatable except by a pair, while 9/9 gives two strong hands and a better chance of winning both. Because a single win only pushes, balance often matters more than a single huge hand. House ways and strategy writers differ on borderline splits like this, which is why reading the casino's own house way is worthwhile.

### General principles

- **Keep pairs** unless splitting them makes two strong hands; for example, some pairs of tens or elevens are split when the result is two high scores.
- **Look for Wongs and Gongs** whenever you hold Teen or Day.
- **Protect the low hand.** A 9-high hand paired with a 1-low hand usually just pushes.
- **Use Gee Joon flexibility.** Try each Gee Joon tile as 3 and as 6 in every split.

Most casinos will set your hand the house way on request, which is a reasonable default. The card-based cousin, with a 53-card deck and five-card and two-card hands, is explained in the [pai gow poker guide](/guides/pai-gow-poker).`,
    },
    {
      id: "edge",
      title: "Odds and house edge",
      body: `Pai gow tiles is a low-volatility game because so many hands push. That makes it popular with players who want long sessions, and it means results swing less than in games like craps or roulette at the same stake.

### Where the edge comes from

- **Copies.** Identical scores with equal top tiles go to the banker.
- **Commission.** 5% of player wins goes to the house.
- **House way.** The banker's fixed strategy is designed to be strong.

Exact house-edge figures depend on the house way, the commission and whether the player sets well, and published analyses vary. They generally place the player's disadvantage in the low single digits, broadly similar to pai gow poker, and lower when the player takes the bank. Treat any single precise figure you see with caution unless it names the house way it assumes.

### Probability sense-checks

- There are C(32, 4) = 35,960 possible four-tile deals from a full set.
- The Gee Joon pair needs both specific tiles: C(30, 2) = 435 of those 35,960 deals, about 1.2%, include both.
- Any given civil pair, such as the two Teens, also appears in about 1.2% of deals.

The general relationship between commission, ties and edge is explained in [house edge](/guides/house-edge), and [variance in gambling](/guides/variance-in-gambling) explains why a high push rate slows swings.`,
    },
    {
      id: "history",
      title: "History and where it is played",
      body: `Chinese dominoes have a long history in China, and pai gow is one of several games played with them, along with Tien Gow and others. Traditional accounts place the origin of the tiles centuries ago, often in the Song dynasty, but the early history is not firmly documented, so treat precise origin dates as tradition.

Pai gow tiles travelled with Chinese immigrants to North America in the 19th century and later became a fixture in casinos in Nevada, California card rooms and Macau. The game's reputation for complexity kept it mostly a specialist table. In 1985, Sam Torosian introduced pai gow poker at the Bell Card Club in California, adapting the same high-hand and low-hand structure to playing cards, and that version became far more widespread in Western casinos.

Pai gow tiles is related to other tile games only by equipment. Mahjong uses a different set and entirely different rules; see [mahjong tiles](/guides/mahjong-tiles). The wider collection of table games is in the [casino games topic hub](/guides/topics/casino-games). Real-money play is for adults only, 18+ or your local legal age.`,
    },
    {
      id: "pvp",
      title: "Scores, pushes and edge on a hashed PvP round",
      body: `PVPspinArena runs three player-vs-player games in USDC or ETH on the Base network, for adults 18+ only. None involves tiles, but the edge arithmetic is the same kind of counting.

On [Roulette](/roulette), 16 Purple and 16 Silver slots pay 2x and 1 Green slot pays 14x on a 33-slot wheel. Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee, with no pushes. [Coinflip](/coinflip) is a 50/50 between two players, and in [Jackpot](/) your win chance equals your share of the pot; in both, the winner takes the pot minus any fee shown before entry.

Where pai gow relies on a banker's fixed house way, PvP rounds rely on committed seeds. The result is fixed before play, and you can verify any settled round on the [fairness page](/fairness). If you want to keep sessions short, set limits on the [responsible gambling](/responsible-gambling) page first.

In the same cluster, see also [teen patti](/guides/teen-patti), [craps strategy](/guides/craps-strategy), and [baccarat strategy](/guides/baccarat-strategy).`,
    },
  ],
  faqs: [
    {
      q: "How many tiles are in a pai gow set?",
      a: "32. There are 11 civil tile designs appearing twice each (22 tiles) and 10 military tiles that appear once and pair by total.",
    },
    {
      q: "What is the highest hand in pai gow tiles?",
      a: "The Gee Joon pair, made of the 1-2 and 2-4 tiles. After that come the Teen pair, Day pair and the other pairs in ranking order.",
    },
    {
      q: "What is a Wong in pai gow?",
      a: "A Wong is Teen (6-6) or Day (1-1) combined with a nine-tile (4-5 or 3-6). It outranks every ordinary score, including 9, but loses to any pair.",
    },
    {
      q: "What happens if the banker and player tie in pai gow tiles?",
      a: "The hand with the higher-ranking single tile wins. If the tiles are also equal in rank, the hand is a copy and the banker wins.",
    },
    {
      q: "Is pai gow tiles the same as pai gow poker?",
      a: "No. Pai gow tiles uses 32 Chinese dominoes and two-tile hands. Pai gow poker, introduced in 1985, uses a 53-card deck with a five-card and a two-card hand.",
    },
  ],
  sources: [
    { label: "Wikipedia: Pai gow", url: "https://en.wikipedia.org/wiki/Pai_gow" },
    { label: "Wikipedia: Chinese dominoes", url: "https://en.wikipedia.org/wiki/Chinese_dominoes" },
  ],
  related: [
    "pai-gow-poker",
    "teen-patti",
    "dragon-tiger",
    "baccarat-rules",
    "dominoes-rules",
    "mahjong-tiles",
    "craps-strategy",
    "baccarat-strategy",
  ],
  updated: "2026-09-27",
};
