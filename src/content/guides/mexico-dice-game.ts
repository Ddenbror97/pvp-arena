import type { Guide } from "./types";

export const guide: Guide = {
  slug: "mexico-dice-game",
  cluster: "Games of chance",
  keyword: "mexico dice game",
  secondary: [
    "mexico dice rules",
    "how to play mexico dice",
    "mexico dice scoring",
    "mexico drinking dice",
  ],
  title: "Mexico Dice Game: Rules, Scoring Order and Lives",
  description:
    "Mexico dice game rules: how to read a two-dice roll, the full scoring order from 21 down to 31, lives, roll limits and the odds of beating any roll you face.",
  h1: "Mexico dice game: rules, the scoring order and how lives work",
  answer:
    "The Mexico dice game is a two-dice elimination game. You read a roll with the higher die first, so a 6 and a 3 is 63. A 2 and 1 (21, called Mexico) is the best roll, doubles come next from 66 down to 11, then the remaining rolls from 65 down to 31. Each round the lowest roll loses a life, and the last player with lives left wins.",
  facts: [
    "Two dice give 36 outcomes and 21 distinct Mexico scores.",
    "Mexico (21) comes up 2 times in 36, about 5.6% of rolls.",
    "61 is the median roll: exactly half of all rolls are 61 or better.",
    "Three tries at Mexico give about a 15.8% chance of throwing it at least once.",
    "The leader's number of rolls caps everyone else's, which makes stopping early a weapon.",
  ],
  sections: [
    {
      id: "what",
      title: "What the Mexico dice game is",
      body: `Mexico is a quick two-dice game for three or more players. It needs two dice, a cup, and something to track lives: tokens, coins, or a third die turned down one pip each time you lose. It is popular as a bar and party game, and when played for money each player antes into a pot that the last survivor takes. Money play is for adults, 18+ or your local legal age.

Mexico is the open-roll member of a family of two-dice games that share the same scoring idea. Its best-known relative is Mia (in Germany, Mäxchen), where rolls are hidden under the cup and players can lie about what they rolled. Mexico has no bluffing: everyone sees every roll, so the decisions are about when to stop rolling. If you want the bluffing version, [liar's dice](/guides/liars-dice) covers the five-dice cousin in depth.

The game sits in the [Games of chance topic](/guides/topics/games-of-chance) with other small-group dice games such as [cee lo](/guides/cee-lo-rules) and [ship captain crew](/guides/ship-captain-crew).`,
    },
    {
      id: "scoring",
      title: "Reading a roll and the scoring order",
      body: `Put the higher die first and read the pair as a two-digit number. A 4 and a 6 is 64, not 46. Then rank rolls in three tiers:

1. **Mexico:** 21 (a 2 and a 1). Always the best roll.
2. **Doubles:** 66, 55, 44, 33, 22, 11, in that order. Any double beats any non-double.
3. **Everything else:** from 65 down to 31, compared as numbers.

The full order, with how often each roll comes up:

| Rank | Roll | Ways out of 36 | Chance of this roll or better |
| --- | --- | --- | --- |
| 1 | 21 (Mexico) | 2 | 5.6% |
| 2–7 | 66, 55, 44, 33, 22, 11 | 1 each | 8.3% (66) to 22.2% (11) |
| 8 | 65 | 2 | 27.8% |
| 9 | 64 | 2 | 33.3% |
| 10 | 63 | 2 | 38.9% |
| 11 | 62 | 2 | 44.4% |
| 12 | 61 | 2 | 50.0% |
| 13 | 54 | 2 | 55.6% |
| 14 | 53 | 2 | 61.1% |
| 15 | 52 | 2 | 66.7% |
| 16 | 51 | 2 | 72.2% |
| 17 | 43 | 2 | 77.8% |
| 18 | 42 | 2 | 83.3% |
| 19 | 41 | 2 | 88.9% |
| 20 | 32 | 2 | 94.4% |
| 21 | 31 | 2 | 100% |

Doubles come up only 1 way in 36 each, because both dice must match. Every mixed roll, including Mexico, has 2 ways (a 2 then a 1, or a 1 then a 2). That is why 21 is almost twice as likely as 66, even though it ranks higher. The ranking is tradition, not rarity, a pattern that also shows up in [poker dice](/guides/poker-dice).`,
    },
    {
      id: "rules",
      title: "Rules of a round",
      body: `House rules vary, so agree these points before the first roll. The most common version:

1. Everyone starts with the same number of lives, often six.
2. The first player (the leader) may roll up to three times. After each roll, they either stop or roll again. The last roll counts, even if an earlier one was better.
3. The number of rolls the leader used becomes the limit for everyone else in that round. If the leader stopped after one roll, every other player gets exactly one roll.
4. After everyone has rolled, the player with the lowest roll loses one life.
5. If anyone rolled Mexico during the round, many groups double the penalty: the loser loses two lives instead of one. Some double for each Mexico rolled.
6. Players tied for lowest roll off, one roll each, until one is lowest.
7. The loser of the round usually leads the next one.
8. A player with no lives left is out. The last player with lives wins the game and, if you played for money, the pot.

### Why the roll limit matters

The limit is the heart of Mexico. A leader who rolls 65 on the first throw and stops forces everyone else to beat it in a single roll. A leader who needs three tries gives everyone three tries. The rule turns a pure luck game into one with a real, if small, decision each turn.`,
    },
    {
      id: "odds",
      title: "Mexico dice odds: beating the roll in front of you",
      body: `The table above gives the chance of matching or beating any roll in one throw. With several throws, the chance of reaching a target at least once is 1 − (chance of missing)^n.

| Target (at least) | One roll | Two rolls | Three rolls |
| --- | --- | --- | --- |
| Mexico | 5.6% | 10.8% | 15.8% |
| Any double or Mexico | 22.2% | 39.5% | 53.0% |
| 61 or better | 50.0% | 75.0% | 87.5% |
| 51 or better | 72.2% | 92.3% | 97.9% |

### Worked example: Mexico in three tries

Missing Mexico on one roll has probability 34/36. Missing three times is (34/36)³ = 4,913/5,832 ≈ 0.842. So the chance of at least one Mexico is about 15.8%.

### Worked example: surviving as a follower

You are last to roll in a four-player round, the limit is three rolls, and the current lowest is 54. You only need to beat 54, which means rolling 61 or better: a 50% chance per roll. You can stop the moment you beat it, so you fail only if all three rolls miss: (1/2)³ = 12.5%. Your chance of keeping your life is 87.5%, before counting ties at 54 that would send you to a roll-off.

This is the [dice roll probability](/guides/dice-roll-probability) toolkit in miniature: count outcomes out of 36, then chain independent attempts.`,
    },
    {
      id: "strategy",
      title: "Strategy: when the leader should stop",
      body: `Followers have an easy rule: stop as soon as you are not the lowest roll so far. You gain nothing by rolling again once you are safe, and extra rolls can only make your final roll worse.

The leader has the real decision. Stopping early caps everyone else, but a weak roll is a target anyone can beat.

### Stopping on a strong roll

The leader throws 65 on the first roll and stops. In a four-player game, each follower gets one roll. The leader loses a life only if all three roll higher than 65, which means a double or Mexico: 8/36 each. The chance all three do it is (8/36)³ ≈ 1.1%. Stopping is clearly right.

### Stopping on a weak roll

The leader throws 42 on the first roll. A follower beats 42 with any of 43 or better: 28 of 36 outcomes. If the leader stops, the chance all three followers beat 42 in one roll each is (28/36)³ ≈ 47%, so the leader loses a life nearly half the time. Rerolling is better: a second roll is 61 or better half the time, and even a mediocre second roll is usually an improvement over 42.

### A simple rule of thumb

As leader on the first roll, stop on 61 or better, reroll anything lower. On the second roll, stop on about 53 or better. On the third, you have no choice. This is not a solved optimum, since the best cut-off depends on the number of players and on tie rules, but it follows the numbers above and avoids the two costly mistakes: stopping on junk and rerolling a strong result.`,
    },
    {
      id: "variants",
      title: "House variations and playing for money",
      body: `Mexico travels well, so every group adds its own twist. The common ones, and what they do to the odds:

### Holding one die

Some groups let a player set one die aside and reroll only the other. Holding a 6 is very strong: the rerolled die makes 66 one time in six and 61 to 65 otherwise, so you are guaranteed 61 or better, the median roll. Holding a 1 is a gamble: one time in six you make Mexico and one time in six you make 11, a double, but the other four outcomes (31, 41, 51, 61) are mostly weak. If your group allows holds, agree whether a hold counts as one of your limited rolls.

### Tie rules

The standard roll-off can be replaced by "all tied players lose a life". That speeds the game up and makes common low rolls such as 41 and 42 more dangerous, because ties among weak rolls are frequent in larger groups.

### Scoring by points

Instead of lives, some groups play a fixed number of rounds and give the lowest roller a penalty point each time. The player with the fewest points at the end wins. This keeps everyone in the game until the end, which suits a party better than elimination.

### Money formats

Two formats are common. In the first, everyone antes once and the survivor takes the whole pot. In the second, each lost life costs a fixed chip into the pot. With equal players and fair dice, both formats have zero expected value for everyone: your share of the pot matches your chance of taking it. Keep the ante small, agree the rules in advance, and stop at the time you set rather than when you are down.`,
    },
    {
      id: "pvp",
      title: "From a dice cup to a hashed PvP round",
      body: `Mexico is a player-vs-player game with no house: everyone antes, and the survivor takes the pot. Over many games between equal players, nobody has an edge, and the leader's stopping decision is the only skill.

PVPspinArena runs three player-vs-player games with the same no-dealer spirit. In [Coinflip](/coinflip), two players take opposite sides of a 50/50, and the winner takes the pot minus any fee shown before entry. In Jackpot, everyone adds to one pot, and your chance of winning equals your share of it. Roulette is the one house-style game: a 33-slot wheel where Purple and Silver pay 2x and Green pays 14x, so Purple and Silver return 32/33 and Green returns 14/33 before the win fee.

A dice cup lets everyone see the roll. Online, every result comes from seeds committed before the round, and anyone can recompute a settled round on the [fairness](/fairness) page. That proves the result was not changed afterwards; it does not make any strategy a winner. Set your stake and your stopping point before the first round, and use the [responsible gambling](/responsible-gambling) tools if a party game turns into chasing losses.`,
    },
  ],
  faqs: [
    {
      q: "How do you play the Mexico dice game?",
      a: "Each player rolls two dice and reads the higher die first. The leader may roll up to three times and sets the roll limit for everyone else. The lowest roll of the round loses a life, and the last player with lives wins.",
    },
    {
      q: "What is the best roll in Mexico?",
      a: "A 2 and a 1, read as 21 and called Mexico. It beats everything, including 66. Many groups double the life loss in any round where Mexico is rolled.",
    },
    {
      q: "What is the lowest roll in Mexico dice?",
      a: "31, a 3 and a 1. Next lowest are 32, then 41 and 42. Remember that 21 is not low: it is Mexico, the top roll.",
    },
    {
      q: "Do doubles beat 65 in Mexico?",
      a: "Yes. Every double, even 11, beats every mixed roll except Mexico. The order is 21, then 66 down to 11, then 65 down to 31.",
    },
    {
      q: "How many lives do you get in Mexico?",
      a: "Groups usually start with six lives, often tracked on a spare die, but any agreed number works. Fewer lives make shorter games.",
    },
    {
      q: "What is the difference between Mexico and Mia?",
      a: "They share the scoring order, but in Mia the roll is hidden and players may bluff about it. In Mexico every roll is shown, so the only decision is when to stop.",
    },
  ],
  sources: [
    { label: "Wikipedia: Mia (game)", url: "https://en.wikipedia.org/wiki/Mia_(game)" },
    {
      label: "Wikipedia: List of dice games",
      url: "https://en.wikipedia.org/wiki/List_of_dice_games",
    },
    { label: "Encyclopaedia Britannica: dice", url: "https://www.britannica.com/topic/dice" },
  ],
  related: [
    "liars-dice",
    "cee-lo-rules",
    "ship-captain-crew",
    "poker-dice",
    "left-right-center-rules",
    "dice-roll-probability",
  ],
  updated: "2026-09-27",
};
