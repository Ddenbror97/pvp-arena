import type { Guide } from "./types";

export const guide: Guide = {
  slug: "mexican-train-rules",
  cluster: "Games of chance",
  keyword: "mexican train rules",
  secondary: [
    "how to play mexican train",
    "mexican train dominoes",
    "mexican train scoring",
    "mexican train doubles rule",
  ],
  title: "Mexican Train Rules: Setup, Trains, Doubles and Scoring",
  description:
    "Mexican train rules for double-twelve dominoes: how many tiles to deal, the engine, personal and Mexican trains, markers, doubles, scoring and all 13 rounds.",
  h1: "Mexican train rules: setup, trains, markers, doubles and scoring",
  answer:
    "Mexican train rules in short: use a double-twelve set of 91 dominoes, place the highest double in the centre as the engine, and deal each player a hand. On your turn you add one tile to your own train, the shared Mexican train or any train with a marker. If you cannot play, draw once, then mark your train. The round ends when someone plays their last tile; lowest total after 13 rounds wins.",
  facts: [
    "A double-twelve set has 91 tiles; each number appears on 13 tiles and 14 tile ends.",
    "Round one starts with the double-12 as the engine, round two with the double-11, down to the double-blank in round 13.",
    "If you cannot play, you draw one tile; if it still does not fit, you place a marker on your train and it becomes open to everyone.",
    "Playing a double obliges a follow-up play, and in the common rule the double must be covered before other play continues.",
    "At the end of a round players score the pips left in their hands, and the lowest total after all rounds wins.",
  ],
  sections: [
    {
      id: "setup",
      title: "Equipment and setup",
      body: `Mexican Train is a draw-style domino game for roughly 2 to 8 players, built on a double-twelve set. If you are new to dominoes, the [dominoes rules](/guides/dominoes-rules) guide explains matching ends, doubles and the boneyard; this page covers what Mexican Train adds.

### What you need

- A double-twelve set: 91 tiles, numbers 0 to 12.
- A hub (the "station"): a centrepiece with a slot for the engine double and spokes for each train. A hub is convenient but optional.
- One marker per player, usually small plastic trains, plus one for the Mexican train.
- A score sheet.

### How many tiles to deal

Shuffle the tiles face down after removing the round's engine double. A common deal table:

| Players | Tiles each |
| --- | --- |
| 2 to 4 | 15 |
| 5 to 6 | 12 |
| 7 to 8 | 10 |

Published rule sets vary by a tile or two, so treat this as a default and agree it before play. The remaining tiles form the boneyard.

### The engine

In round one, the double-12 goes in the centre as the **engine**. Each round after that uses the next double down: double-11, double-10 and so on, to the double-blank in round 13. Some groups decide the engine differently, for example by having players draw until someone finds the right double, but setting it aside before the deal is simplest.`,
    },
    {
      id: "trains",
      title: "Personal trains and the Mexican train",
      body: `Every player builds a **personal train**: a line of dominoes that starts from the engine and runs toward that player. The first tile of your train must match the engine number. In round one, that means a tile with a 12 on one end. After that, each tile matches the open end of your train, as in any domino game.

### The Mexican train

The **Mexican train** is a public train that any player can add to. It also starts from the engine with a matching tile. Common rules let any player start the Mexican train on their turn by playing a tile that matches the engine; some groups require you to start your own train first. Once started, anyone may play on it on any turn.

### Where you may play on a turn

1. Your own personal train.
2. The Mexican train.
3. Any other player's train that has a marker on it.

You may not play on another player's unmarked train. That restriction is what makes the markers matter.

### Planning your train

Before the first play, look for the longest chain in your hand that starts with the engine number. For example, in round one with 12-5, 5-9, 9-2, 2-2 and 2-7, you have a five-tile chain: 12-5, 5-9, 9-2, 2-2, 2-7. Keep that chain for your own train and treat everything else as spare tiles to feed the Mexican train or marked trains. Players who do this well go out faster, because they are never stuck without a move on their own line.`,
    },
    {
      id: "turns",
      title: "Turns, drawing and train markers",
      body: `Play usually goes clockwise, starting with the player to the left of the dealer or the player who set the engine.

### A normal turn

- Play one tile in a legal spot (own train, Mexican train or a marked train).
- If you cannot play, draw one tile from the boneyard. If it fits, play it at once.
- If the drawn tile does not fit, or the boneyard is empty, place your marker on your train. Your turn ends.

### What a marker means

A marker announces that you were stuck. While it sits on your train, every player may play on your train. The marker comes off as soon as you play a tile on your own train again. The Mexican train is always open, so its marker is simply a reminder of which line it is.

### The first turn

Many groups use a special opening: on your first turn, you may play as many tiles as you can on your own train in one go, laying out the chain you planned. Others play one tile per turn from the start. The multi-tile opening speeds the game considerably, so agree it before round one.

### Calling your last tile

A widespread house rule says that when you are down to one tile, you must announce it, often by tapping your last tile on the table. If another player catches you failing to announce before your next turn, you draw a penalty tile, commonly one or two.

### Worked turn

Your train ends in 8. You hold 3-10 and 6-1; the Mexican train ends in 10 and nobody has a marker out. You cannot play on your own train, but you can put 3-10 on the Mexican train. That uses your turn, and your own train stays unmarked.`,
    },
    {
      id: "doubles",
      title: "The doubles rule",
      body: `Doubles are where Mexican Train gets tactical, and where house rules differ most.

### Playing a double

Doubles are laid crosswise. When you play a double, you must play again. The common rule is that the double must be **satisfied**, meaning covered by a tile matching it, before normal play continues.

1. You play the double-7 on your train and immediately try to cover it with another tile that has a 7.
2. If you cannot, draw one tile. If it covers the double, play it.
3. If you still cannot, place your marker on your train. The turn passes.
4. The next players must try to cover the double first, drawing once each if they cannot, and placing markers if they fail. No other play is allowed until the double is covered.

### Why doubles are dangerous

An uncovered double can force several players to draw and mark their trains, which opens their lines and bloats their hands. Holding the last remaining tile of a suit and then playing that double can therefore stall the whole table. But doubles are also heavy: the double-12 is 24 pips, and getting stuck with it at the end of a round is expensive.

### Common variations

- Some groups let a player play two doubles in one turn, followed by a covering tile.
- Some ban ending the round on a double, or require it to be covered even if it is your last tile.
- Some ignore the "must satisfy" rule and let the double sit open like any other tile.

Write down your group's version. Disputes about doubles are the most common argument at a Mexican Train table.`,
    },
    {
      id: "scoring",
      title: "Ending a round and scoring",
      body: `A round ends in one of two ways:

- A player plays their last tile (goes out). That player scores 0 for the round.
- The game is blocked: the boneyard is empty and nobody can play.

Every other player adds up the pips on the tiles left in hand. Those points are recorded, and lower is better. After 13 rounds, from the double-12 engine down to the double-blank, the player with the lowest total wins.

### The double-blank

The double-blank has no pips, which would make it a free tile to hold. Many groups score it as 50 points so that nobody wants to be caught with it. Check which convention you are using.

### Worked scoring

A round ends when your opponent goes out. You hold 12-10, 6-6 and 0-0. Under plain pip scoring you take 22 + 12 + 0 = 34 points. Under the 50-point double-blank rule you take 22 + 12 + 50 = 84.

### Pip arithmetic

A double-twelve set holds 1,092 pips (each number from 0 to 12 appears on 14 tile ends, and 14 × 78 = 1,092). The average tile carries 12 pips. A hand of 10 unplayed tiles costs about 120 points on average, which is why dumping heavy tiles early and going out quickly matters more than any single clever play.

### Long games

Thirteen rounds can take two hours or more with a big group. Shorter games simply use fewer rounds, for example starting at double-9, or a smaller double-nine set for fewer players.`,
    },
    {
      id: "odds",
      title: "Odds of starting your train and basic strategy",
      body: `You cannot start your own train without a tile matching the engine, so the opening deal matters.

### Worked probability

Four players, 15 tiles each, round one. With the double-12 set aside as the engine, 90 tiles remain, and 12 of them carry a 12 (12-0 through 12-11). The chance your 15-tile hand contains none of them is C(78, 15) ÷ C(90, 15), about 9.5%. So roughly 90% of the time you can start your train on the first turn. On average you will hold 15 × 12/90 = 2 tiles that match the engine.

### Strategy principles

1. **Plan the longest chain** from the engine through your hand, and play it on your own train.
2. **Feed spares elsewhere.** Tiles that do not fit your chain go on the Mexican train or marked trains, so you do not waste them.
3. **Dump heavy tiles early** when a spot is available, to limit damage if someone goes out.
4. **Use doubles as weapons** late in a round, when you hold other tiles of that suit and opponents may not.
5. **Watch markers.** An opponent's open train is an easy place to shed an awkward tile.

The [expected value](/guides/expected-value-gambling) guide shows how to weigh holding a strong double against the risk of being stuck with it.`,
    },
    {
      id: "stakes",
      title: "Playing for stakes and the PvP connection",
      body: `Mexican Train is usually a family or club game, but some groups add a small stake per point or per game. If you do, keep it among adults 18+ (or the local legal age), agree the stake and all house rules in writing, and set a maximum. Because points accumulate over 13 rounds, a per-point stake can grow faster than expected: a bad night of 400 points at even a small amount per point adds up.

Luck plays a large part: the deal decides whether you can start your train, and a single uncovered double can bury you. Skill in chaining, dumping and timing doubles shows over many games, not one evening. The [variance in gambling](/guides/variance-in-gambling) guide explains why short samples mislead.

PVPspinArena runs three player-vs-player games in USDC or ETH on the Base network, and all three are pure chance. A [Coinflip](/coinflip) is a fair 50/50 between two players; in Jackpot your win chance equals your share of the pot; Roulette's 33-slot wheel returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee on average. Every result comes from committed seeds that can be checked on [fairness](/fairness). Related tile games, including [chicken foot dominoes](/guides/chicken-foot-dominoes), sit in the [Games of chance topic](/guides/topics/games-of-chance). If a regular game night starts to cost more than you planned, the tools at [responsible gambling](/responsible-gambling) can help.`,
    },
  ],
  faqs: [
    {
      q: "How many dominoes does each player get in Mexican Train?",
      a: "A common table is 15 tiles each for 2 to 4 players, 12 for 5 or 6, and 10 for 7 or 8, using a double-twelve set. Rule sets vary slightly.",
    },
    {
      q: "Can you play on the Mexican train on your first turn?",
      a: "Usually yes, if you have a tile matching the engine. Some groups require you to start your own train first, so agree the rule before playing.",
    },
    {
      q: "What happens when you play a double in Mexican Train?",
      a: "You must play again. In the common rule the double must be covered with a matching tile; if you cannot, you draw once and then mark your train, and the next players must cover it.",
    },
    {
      q: "What does the train marker mean?",
      a: "It shows that you could not play. While the marker is on your train, any player may add tiles to it. You remove it when you play on your own train again.",
    },
    {
      q: "How do you score Mexican Train?",
      a: "When a round ends, each player adds the pips left in their hand. Many groups count the double-blank as 50. The lowest total after 13 rounds wins.",
    },
  ],
  sources: [
    { label: "Wikipedia: Mexican Train", url: "https://en.wikipedia.org/wiki/Mexican_Train" },
    { label: "Wikipedia: Dominoes", url: "https://en.wikipedia.org/wiki/Dominoes" },
  ],
  related: [
    "dominoes-rules",
    "chicken-foot-dominoes",
    "texas-42-dominoes",
    "mahjong-tiles",
    "pai-gow-tiles",
  ],
  updated: "2026-09-27",
};
