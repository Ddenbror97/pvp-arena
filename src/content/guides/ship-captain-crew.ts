import type { Guide } from "./types";

export const guide: Guide = {
  slug: "ship-captain-crew",
  cluster: "Games of chance",
  keyword: "ship captain crew",
  secondary: [
    "ship captain and crew",
    "654 dice game",
    "ship captain crew rules",
    "midnight dice cargo",
  ],
  title: "Ship Captain Crew: Rules and Qualifying Odds",
  description:
    "Ship captain crew rules: bank a 6, then a 5, then a 4 in three rolls, score the two cargo dice, and the real odds of qualifying at all.",
  h1: "Ship captain crew: rules, cargo scoring and qualifying odds",
  answer:
    "Ship captain crew is a five-dice pub game. You have three rolls to bank a 6 (the ship), then a 5 (the captain), then a 4 (the crew), in that order. If you crew the ship, the other two dice are cargo and their total is your score. If you miss the 6-5-4 sequence in three rolls, you score zero. Highest cargo wins the pot.",
  facts: [
    "Standard turn: five dice, three rolls, bank 6 then 5 then 4 in order.",
    "A 4 showing before you have a 5 cannot be kept; you throw it back.",
    "Chance of 6, 5 and 4 all showing on the first roll of five dice is about 15.8%.",
    "Published tallies put the chance of qualifying by the third roll near 54%, so about 46% of turns score 0.",
    "Cargo of 12 (midnight) is 1 in 36 on a given two-dice roll; cargo of 2 is also 1 in 36.",
  ],
  sections: [
    {
      id: "rules",
      title: "Ship captain crew rules",
      body: `Ship, captain and crew (also 6-5-4, ship of fools, or destroyer) is a bar dice game for two or more players. Wikipedia's page on [ship, captain, and crew](https://en.wikipedia.org/wiki/Ship,_captain,_and_crew) is the common three-roll, five-dice version this guide uses. Some kits give five rolls; that is a different, much easier game. Agree the roll cap before anyone puts money in the glass.

### A turn

1. Roll all five dice.
2. If a 6 is showing, bank one 6 as the **ship**. Extra 6s are just more dice.
3. Once you have a ship, you may bank a 5 as the **captain** from this roll or a later one.
4. Once you have ship and captain, you may bank a 4 as the **crew**.
5. You may not bank a 5 before a 6, or a 4 before a 5. A 4 on roll one with no 5 is thrown back.
6. After banking what you are allowed, reroll the rest. You get **three rolls total**.
7. If you have 6-5-4 after the third roll, the two leftover dice are **cargo**. Their sum is your score (2 through 12).
8. If you crewed on roll one or two, you may spend leftover rolls to reroll one or both cargo dice. Keep the new faces; you cannot go back.
9. If you never crew, score 0.

### Worked turn

Roll 1: 6, 4, 3, 3, 1. Bank the 6. The 4 is not legal yet. Reroll four dice.

Roll 2: 6, 3, 2, 2. No 5. You already have a ship, so the extra 6 does nothing. Reroll four.

Roll 3: 5, 4, 3, 5. Bank a 5 and a 4. Cargo is 3+5 = 8. No rolls left to improve it.

### Winning

Each player takes one turn. Highest cargo wins the pot. Ties either split or carry the pot to the next round, house choice. A first-roll crew with high cargo (especially 12, "midnight") is what later players have to beat; some tables then cap later players at the same number of rolls the leader used. That catch-up rule is a variant. Say it out loud.

Money play is for adults, 18+ or the local legal age. The game sits in the [Games of chance topic](/guides/topics/games-of-chance) next to [Mexico dice](/guides/mexico-dice-game) and [cee-lo](/guides/cee-lo-rules), the other short-order bar dice games.`,
    },
    {
      id: "qualify",
      title: "Odds of qualifying: the 6, then the 5, then the 4",
      body: `Qualifying means you own a 6, a 5 and a 4 by the end of roll 3. Cargo never counts until that is true.

### All three on the first roll

Five dice must show at least one 6, one 5 and one 4. Inclusion-exclusion on 6⁵ = 7,776 outcomes:

- P(missing a given face) = (5/6)⁵ ≈ 0.4019
- P(missing two given faces) = (4/6)⁵ ≈ 0.1317
- P(missing 4, 5 and 6) = (3/6)⁵ = 0.03125

P(all three faces present) = 1 − 3×0.4019 + 3×0.1317 − 0.03125 ≈ **0.158**, or 15.8%.

That is not "any 6, 5 and 4 in any order later." It is the first-roll snapshot.

### Building in order, one stage at a time

If you only keep what the sequence allows, each stage is a "at least one target face" problem on the dice you still hold.

| Stage | Dice you roll | Target | P(hit this roll) |
| --- | --- | --- | --- |
| Find the ship | 5 | at least one 6 | 1 − (5/6)⁵ ≈ 59.8% |
| Then the captain | 4 | at least one 5 | 1 − (5/6)⁴ ≈ 51.8% |
| Then the crew | 3 | at least one 4 | 1 − (5/6)³ ≈ 42.1% |
| Crew with two dice | 2 | at least one 4 | 1 − (5/6)² ≈ 30.6% |
| Crew with one die | 1 | a 4 | 1/6 ≈ 16.7% |

The full three-roll tree branches (you can find 6 and 5 on the same roll, or stall for two rolls on the ship). Enumerations and simulations of that tree land near **54%** to score at all and **46%** to score zero. Treat 54% as a computed neighbourhood, not a pub guess, and not a fake extra decimal.

### What that means for a pot

In a five-player rotation, the chance that a given player scores 0 is about 46%. The chance that **nobody** crews is 0.46⁵ ≈ 2.1%, so a full wipe is uncommon but not rare over a long night. The chance you crew and still lose to a bigger cargo is the rest of the game.

### Expected score, zeros included

If 46% of turns score 0 and the other 54% score a two-dice total whose average is 7 (before cargo rerolls), a rough expected score per turn is 0.54 × 7 ≈ 3.8. That is why a posted 8 already feels huge: it is more than double the long-run average, not because 8 is a rare two-dice total. Rerolls on early crews lift the 7 a little; late crews that must keep junk pull it down. Treat 4 points a turn as the right order of magnitude for a no-skill, three-roll game.

### How this compares to the other bar games

[Cee-lo](/guides/cee-lo-rules) is a banker-vs-player 4-5-6 game: triples and 4-5-6 are instant decisions, and you do not build a sequence across three rolls. [Mexico](/guides/mexico-dice-game) ranks a two-dice reading and knocks out lives. Ship captain crew is the one that makes you **qualify** before you are allowed to have a score. That filter is why so many turns print a zero and why the pot swings.`,
    },
    {
      id: "cargo",
      title: "Cargo maths once you have a crew",
      body: `Cargo is two ordinary dice. The totals are the usual 36-outcome table, the same one on [dice roll probability](/guides/dice-roll-probability).

| Cargo | Ways | Chance | Nickname |
| --- | --- | --- | --- |
| 12 | 1 | 2.78% | midnight, boxcars |
| 11 | 2 | 5.56% | |
| 10 | 3 | 8.33% | |
| 9 | 4 | 11.11% | |
| 8 | 5 | 13.89% | |
| 7 | 6 | 16.67% | |
| 2 | 1 | 2.78% | minimum |

Expected cargo **conditional on qualifying and keeping the two dice as they lie** is 7, because two fair dice average 3.5 each. If you qualified on roll 1 or 2, you should reroll cargo that sits below your goal.

### When to reroll leftover cargo

Suppose you crewed on roll 1 and have two rolls left. You hold 3+2 = 5. Rerolling both dice has E = 7, so you reroll. Holding 6+6 = 12, you never reroll. Holding 6+4 = 10, two leftover rolls is a tougher call: P(beat 10) = P(11 or 12) = 3/36 = 8.3% on a single reroll, but you have two tries if you commit to keep rolling when you miss. Against a table that has already posted 11, you must chase. Against a table of zeros, 10 is usually enough.

A single leftover roll and a cargo of 8: P(improve) = P(9–12) = 10/36 ≈ 27.8%, P(worse) = P(2–7) = 21/36 = 58.3%, P(same) = 5/36. The average after a forced reroll is still 7, so you give away a point in expectation to chase the tail. Only do it if someone already has 9 or better, or if the pot rules pay only first place.

### Qualifying late vs qualifying early

Crew on roll 3 and you live with the cargo you rolled. That is why a 15.8% first-roll crew is so valuable: you bought option value on the two dice, not just a score.`,
    },
    {
      id: "strategy",
      title: "Thin strategy and house variants",
      body: `The sequence is forced. Strategy is only: which extra 6 to throw back (always throw extras; they are not cargo until you crew), and whether to reroll cargo. Do not "save" a 4 before you have a 5. The rules already forbid it, and players who "remember" the 4 are playing a different game.

### Variants (say them first)

- **Five rolls** instead of three. Qualifying becomes common; cargo fights dominate.
- **Ship and crew only** (6 and 4). Three cargo dice, higher scores, easier qualify.
- **Any order** on 6, 5 and 4. First-roll qualify jumps well above 15.8% because you no longer throw back an early 4.
- **Lowest cargo wins.** Same sequence, inverted score. Midnight becomes the worst hold.
- **Leader sets the roll cap.** If the first player crews on one roll, everyone else gets one roll. This is a real swing; it is not the default Wikipedia game.

### A night of ten turns

Ten turns at ~54% to score is about 5 or 6 cargos. Chance of scoring on all ten is 0.54¹⁰ ≈ 0.2%, so a "perfect card" of ten scores is a story, not a plan. Chance of three or more zeros in ten turns is the common night. If you are playing a $5 glass and you treat three zeros as a signal to raise the glass, you are chasing a sequence filter, not a cold table.

[Farkle](/guides/farkle-rules) is the cousin that lets you stop. Ship captain crew never lets you stop before you crew; the stop is only on cargo.`,
    },
    {
      id: "pvp",
      title: "Qualifying odds and a hashed PvP round",
      body: `Ship captain crew is a sequence filter. Most of the drama is binary: did you crew, or did you score zero? The cargo is a small two-dice game glued on the end.

PVPspinArena makes the filter visible. It runs three player-vs-player games in USDC or ETH on Base. [Coinflip](/coinflip) is a 50/50, no sequence to complete. [Roulette](/roulette) is 33 slots, 16 Purple and 16 Silver at 2x, 1 Green at 14x, every bet returning 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee. [Jackpot](/) sets win chance equal to your share of the pot, the same idea as a share of a glass on the bar. Seeds are committed; check a settled round on [fairness](/fairness).

If the next "one more glass" is already a chase, use [responsible gambling](/responsible-gambling). Play is 18+ only.

### Worked three-roll path

Five dice. First roll: 6, 6, 2, 3, 1. Bank one 6 (the ship). Four dice remain. Second roll: 5, 5, 4, 2. Bank a 5 (captain) and a 4 (crew). Two dice left as cargo on the last roll: you may reroll them if the house allows a cargo reroll, or keep 5+2=7. Many tables freeze cargo once the crew is complete; write that down. If the second roll had been 5, 3, 2, 1 with no 4, you would still need a 4 on the last roll of the leftover dice. Miss it and the 6 and 5 you banked score nothing.

That all-or-nothing shape is why the game feels swingy. About 46% of three-roll turns score zero even though most rolls “look busy.” Compare [liars dice](/guides/liars-dice), where a bad cup still leaves you with four dice and a bid.

### Bar stakes

A common adult stake is a drink per zero, or a pound-per-pip of cargo against last place. With four players and 54% qualification, expect roughly two zeros a round. Cap the number of rounds before the first glass, the same way you would cap a [Coinflip](/coinflip) session. Uncapped “until someone crews a 12” is how a pub game becomes a chase.`,
    },
  ],
  faqs: [
    {
      q: "How do you play ship captain crew?",
      a: "Roll five dice up to three times. Bank a 6, then a 5, then a 4, in that order. The other two dice are cargo and their total is your score. Miss the sequence and you score zero.",
    },
    {
      q: "What are the odds of getting ship, captain and crew?",
      a: "About 15.8% on the first roll of five dice. About 54% by the end of a standard three-roll turn, so roughly 46% of turns score nothing.",
    },
    {
      q: "Can you keep a 4 before you have a 5?",
      a: "No. The crew cannot board before the captain. Throw the 4 back and roll it again after you bank a 5.",
    },
    {
      q: "What is a midnight in ship captain crew?",
      a: "Cargo totalling 12, two sixes, after you have already crewed the ship. It is 1 in 36 on a given two-dice roll.",
    },
    {
      q: "Should you reroll cargo?",
      a: "Reroll totals well below 7 if you still have a roll left and you only need to beat the table. Keep 11 or 12. Rerolling an 8 or 9 in expectation gives those points away unless someone already beat you.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Ship, captain, and crew",
      url: "https://en.wikipedia.org/wiki/Ship,_captain,_and_crew",
    },
    { label: "Encyclopaedia Britannica: dice", url: "https://www.britannica.com/topic/dice" },
    { label: "Wikipedia: Dice", url: "https://en.wikipedia.org/wiki/Dice" },
  ],
  related: [
    "mexico-dice-game",
    "cee-lo-rules",
    "farkle-rules",
    "yahtzee-rules",
    "dice-roll-probability",
    "left-right-center-rules",
  ],
  updated: "2026-09-27",
};
