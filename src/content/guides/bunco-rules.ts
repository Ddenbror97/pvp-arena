import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bunco-rules",
  cluster: "Games of chance",
  keyword: "bunco",
  secondary: ["bunco rules", "how to play bunco", "baby bunco", "bunco party setup"],
  title: "Bunco: Party Dice Rules, Scoring and Rounds",
  description:
    "Bunco rules for a party: 12 players, six rounds, 21-point buncos, baby buncos, table rotation, and the exact odds of rolling three of a kind.",
  h1: "Bunco: party dice rules, six rounds and how scoring works",
  answer:
    "Bunco is a social dice game for twelve or more players at tables of four. Each set has six rounds; in round n you want to roll n on three dice. Each matching die scores 1. Three of the target is a bunco worth 21. Three of another face is a baby bunco, usually 5. The head table rings a bell at 21 and everyone stops. Winners rotate up.",
  facts: [
    "A standard party is 12 players at three tables of four, with partners sitting opposite.",
    "A set is six rounds; the target face equals the round number (round 4 wants 4s).",
    "A bunco (three of the target) is 1 in 216 rolls, about 0.46%.",
    "A baby bunco is 5 in 216 rolls, about 2.31%, if every non-target triple scores.",
    "You miss and pass the dice on 120 of 216 rolls, about 55.6%.",
  ],
  sections: [
    {
      id: "what",
      title: "What bunco is and what you need",
      body: `Bunco is a loud, low-skill party game. You are not choosing a strategy line. You are rolling three dice as fast as the table will allow, shouting when something scores, and moving seats between rounds. That is why it works for mixed ages and mixed card-game experience: the decisions are social, not mathematical.

A full table of twelve is the usual picture: three tables of four, two partnerships at each table. You can run eight players (two tables) or sixteen (four tables). Keep the count a multiple of four so every seat has a partner. Each table needs three dice, a pencil, a table tally and a player scorecard. The head table (table 1) also needs a bell. Many groups add a fuzzy die or other "traveler" that moves to whoever just rolled a bunco.

The word itself has a double life. Wikipedia traces bunco to a 19th-century confidence game, related to an English pastime called eight-dice cloth, that reached San Francisco gambling rooms around 1855. The same word later named bunco parlors and, in police slang, bunco squads. The living-room game is a later parlor version: same dice, none of the swindle. If you want a street con instead, [three-card monte](/guides/three-card-monte) is the honest write-up of a game you cannot win.

Bunco sits with other kitchen-table dice games in the [Games of chance topic](/guides/topics/games-of-chance). For a party that also wants a chip-passing game with no partnerships, see [left right center rules](/guides/left-right-center-rules). For a night built around play-money tables, [casino party ideas](/guides/casino-party-ideas) covers the rest of the room.`,
    },
    {
      id: "how-to-play",
      title: "How a set and a round work",
      body: `A **set** is six rounds, numbered 1 through 6. In round 1 the target is 1. In round 2 it is 2, and so on. Groups often play two, three or four sets in an evening. Write that number on the invitation so people know when prizes get handed out.

### One round, step by step

1. A player at the head table rings the bell. Every table starts together.
2. Players take turns rolling all three dice. Some groups let both partnerships roll at once; most pass one set of dice clockwise.
3. Score the roll (see the next section). If you scored anything, roll again and add to the same running total.
4. If you score nothing, pass the dice.
5. The first team at the **head table** to reach 21 points rings the bell. Every other table stops at once. A player mid-roll usually finishes that roll, then puts the dice down.
6. At each table, the partnership with more points that round marks a W; the other marks an L. Ties are a T, or some groups replay a sudden-death roll.

Other tables can finish above 21. The bell is a clock, not a cap on their score. That is why a bunco at table 3 feels huge on your personal card and still does not end the room.

### After the round: who moves

Standard rotation:

- **Winners at the head table stay.** Losers at the head table go to the lowest table.
- **Winners at every other table move up** one table.
- **Losers stay**, except the head-table losers who just dropped.
- **Partners split.** The arriving winners sit opposite each other, or the host's card says "sit with someone new." The point is that you do not keep the same teammate all night.

Number the tables 1 (head), 2, 3. Put the bell only on table 1 so there is one clock.`,
    },
    {
      id: "scoring",
      title: "Scoring: ones, buncos and baby buncos",
      body: `Write the house sheet on a whiteboard before round 1. The rows below are the version most party kits print.

| Roll | Points | What people shout |
| --- | --- | --- |
| Each die showing the target | 1 per die | nothing, or the number |
| Three of the target (a bunco) | 21 | "Bunco!" |
| Three of any other face (baby / mini / fuzzy bunco) | 5 | "Baby bunco!" |
| Anything else | 0, pass the dice | — |

A bunco is an instant 21, so at the head table it also ends the round. At other tables you still call it, take 21, and keep rolling until the bell. Some kits treat a bunco as 21 **and** a personal tally mark for the traveler prize; some treat baby bunco as a prize-only event with **zero** table points. If baby bunco is worth 0, the miss rate rises and rounds last longer. Agree once.

### Worked rolls in round 4

- 4, 2, 6: one target. Score 1 and roll again.
- 4, 4, 1: two targets. Score 2 and roll again.
- 4, 4, 4: bunco. Score 21. Head table rings.
- 6, 6, 6: baby bunco. Score 5 (if your sheet pays it) and roll again.
- 2, 3, 5: miss. Pass.

You do not add faces. Two 2s in round 4 are not a 4. Only pips that match the round number count, plus the two triple bonuses.

### What each player tracks

Keep two books. The **table tally** is Us vs Them for the current round, wiped when the bell rings. The **personal card** is your Ws, Ls, buncos and baby buncos across the whole night. Prizes usually pay most Ws, most buncos, most baby buncos, and last place (often a joke gift). The traveler goes to whoever holds it when the last bell rings.`,
    },
    {
      id: "odds",
      title: "Exact odds on three dice",
      body: `Three fair dice have 6³ = 216 equally likely outcomes. The target face is one specific number. The same table applies in every round; only the label on the target changes.

| Event | Outcomes | Chance | Roughly |
| --- | --- | --- | --- |
| Miss (no target, not a baby bunco) | 120 | 120/216 ≈ 55.56% | 5 in 9 |
| Exactly one target | 75 | 75/216 ≈ 34.72% | 1 in 3 |
| Exactly two targets | 15 | 15/216 ≈ 6.94% | 1 in 14 |
| Bunco (three targets) | 1 | 1/216 ≈ 0.46% | 1 in 216 |
| Baby bunco (any other triple) | 5 | 5/216 ≈ 2.31% | 1 in 43 |
| Any score, so you roll again | 96 | 96/216 ≈ 44.44% | 4 in 9 |

### Why 120 misses, not 125

There are 5³ = 125 outcomes with no target pip. Five of those are the non-target triples (three 2s through three 6s in round 1, and the matching set in later rounds). Those five are baby buncos if your sheet pays them. 125 − 5 = 120 true misses.

### Expected points on one roll

Using 1 / 2 / 21 / 5 for one, two, bunco and baby:

E = (1×75 + 2×15 + 21×1 + 5×5) / 216 = 151/216 ≈ 0.70 points per roll.

Most of that 0.70 is singles. The bunco row is only 21/216 ≈ 0.10 points of the average, but it is the whole story at the head table because 21 ends the round. A team that "gets hot" is usually stringing singles and doubles, not printing buncos. The bunco is a 1-in-216 lottery ticket that also happens to be the buzzer.

The same counting sits under every dice game on this site. [Dice roll probability](/guides/dice-roll-probability) is the general table. [Farkle rules](/guides/farkle-rules) uses six dice and a push-your-luck stop; bunco uses three dice and a clock.`,
    },
    {
      id: "party",
      title: "Party setup, money and house variants",
      body: `### Checklist

- 12 chairs, three tables, space to shout.
- 9 dice (three per table), extras in a cup.
- Head-table bell. Traveler if you want a floating prize.
- One table tally per table, one personal card per player.
- A prize table: most wins, most buncos, most babies, worst luck.
- Food that can sit. Rounds are short; conversation is the product.

### Money

A bunco night is often a potluck with joke prizes. If adults put cash on Ws or on the traveler, that is gambling. Keep it 18+ (or the local legal age), write the buy-in and the prize split before anyone sits, and cap the night so a cold card is a known cost, not a chase. The dice do not care who brought dessert.

### Variants worth deciding first

- **Baby bunco points:** 5, or prize-only with 0 table points.
- **Head-table target:** 21 is standard; some groups use 11 for a shorter night.
- **Ghost / dummy:** with 11 players, one seat is a ghost whose rolls a neighbor makes.
- **No partnerships:** four players, each for themselves, still use the 21-point bell.
- **Sets:** two sets is a short evening; four sets is a long one.

None of these change the 1-in-216 bunco rate. They change how long you sit and what you write on the card.`,
    },
    {
      id: "pvp",
      title: "Bunco luck and a hashed PvP round",
      body: `Bunco is honest about being luck. There is no card to count and no tile to save. The only skill is social: keep the dice moving, keep the card honest, stop when the bell says stop.

PVPspinArena is also honest about the price. It runs three player-vs-player games in USDC or ETH on Base: [Jackpot](/), [Coinflip](/coinflip) and [Roulette](/roulette). Coinflip is a 50/50. Roulette is a 33-slot wheel (16 Purple and 16 Silver at 2x, 1 Green at 14x). Purple and Silver return 32/33 before the win fee, about a 7.88% edge after it, and Green returns 14/33. Jackpot pays the pot minus any fee shown before entry, with win chance equal to your share. Seeds are committed up front; any settled round can be checked on [fairness](/fairness).

A bunco night and a hashed round share one useful habit: write the stop before the noise starts. If the party pot or the next match is already a chase, use the tools on [responsible gambling](/responsible-gambling). Play is 18+ only.

If you want a night with more decisions and fewer bells, [shut the box](/guides/shut-the-box) is the tile game at the same party. Bunco stays the game you deal when the room should not have to remember a chart.

See also [tenzi](/guides/tenzi-rules) and [horse race dice](/guides/horse-race-dice-game).`,
    },
  ],
  faqs: [
    {
      q: "How many people do you need to play bunco?",
      a: "Twelve is the classic party: three tables of four. You can run any multiple of four. With a leftover player, use a ghost seat whose rolls a neighbor makes.",
    },
    {
      q: "What is a bunco in bunco?",
      a: "Three dice all showing the current round's number: three 5s in round 5. It scores 21 points. At the head table it also ends the round.",
    },
    {
      q: "What is a baby bunco?",
      a: "Three of a kind that is not the target, such as three 6s in round 2. Most sheets pay 5 points. Some groups record it only for a prize and give it no table points.",
    },
    {
      q: "When does a bunco round end?",
      a: "When a team at the head table reaches 21 points and rings the bell. Other tables stop even if their score is higher or lower than 21.",
    },
    {
      q: "What are the odds of rolling a bunco?",
      a: "Exactly 1 in 216, about 0.46%, on a fair three-dice roll. A baby bunco is 5 in 216, about 2.31%.",
    },
    {
      q: "Do you stay with the same partner all night?",
      a: "No. After each round, winners move up a table and pair with someone new. Head-table winners stay; head-table losers drop to the lowest table.",
    },
  ],
  sources: [
    { label: "Wikipedia: Bunco", url: "https://en.wikipedia.org/wiki/Bunco" },
    { label: "Encyclopaedia Britannica: dice", url: "https://www.britannica.com/topic/dice" },
    { label: "Wikipedia: Dice", url: "https://en.wikipedia.org/wiki/Dice" },
  ],
  related: [
    "left-right-center-rules",
    "farkle-rules",
    "yahtzee-rules",
    "shut-the-box",
    "casino-party-ideas",
    "dice-roll-probability",
    "tenzi-rules",
  ],
  updated: "2026-09-27",
};
