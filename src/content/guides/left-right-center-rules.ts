import type { Guide } from "./types";

export const guide: Guide = {
  slug: "left-right-center-rules",
  cluster: "Games of chance",
  keyword: "left right center rules",
  secondary: ["lcr rules", "how to play lcr", "left center right dice", "lcr chip game"],
  title: "Left Right Center Rules: Chips, Dice and Odds",
  description:
    "Left right center rules in full: three dice, chip flow to L, C and R, how many dice you roll, and why later seats win slightly more often.",
  h1: "Left right center rules: chips, dice and who wins by seat",
  answer:
    "Left right center rules are short. Each player starts with three chips. On a turn you roll one die per chip you hold, up to three dice. L passes a chip left, R passes one right, C puts one in the centre pot, and a dot keeps that chip. Players with zero chips skip but can receive chips back. Last player still holding chips wins the pot.",
  facts: [
    "Each LCR die has L, C, R and three dots, so a chip stays on a 3/6 = 1/2 of faces.",
    "With three chips you always roll three dice; with one chip you roll one die.",
    "A centre face (C) removes a chip from the circle for the rest of the game.",
    "There are no choices. Seat order is the only structural difference between players.",
    "After the first turn in a four-player circle, the roller is down about 1.5 chips in expectation and each neighbour is up 0.5.",
  ],
  sections: [
    {
      id: "rules",
      title: "Left right center rules step by step",
      body: `LCR, sold as Left Center Right, is a chip-passing dice game for three or more people. George & Company LLC has sold a boxed LCR set in the United States since the early 1980s (foil packs) and under the LCR name in a tube from 1992; a 2009 Fourth Circuit opinion, *George Company LLC v. Imagination Entertainment Ltd.*, records that timeline. The mechanic is older than the trademark. You can play with three ordinary dice by reading 1–3 as dots, 4 as L, 5 as C and 6 as R.

### Setup

Sit in a circle. Give everyone three chips (or coins, or sweets). Put an empty pot in the middle. Decide who starts; after that, play passes left.

### A turn

1. Count the chips in front of you. Roll that many dice, **capped at three**. If you have seven chips, you still roll three. If you have one, you roll one. If you have zero, you skip.
2. Resolve each die:
   - **L:** give one of your chips to the player on your left.
   - **R:** give one of your chips to the player on your right.
   - **C:** put one of your chips into the centre pot.
   - **Dot:** that chip stays.
3. Pass the dice left.

You only move chips you still have. If you roll L, C, R with three chips, all three leave: one left, one right, one centre, and you sit at zero. You are not out. A neighbour can pass you a chip on a later turn and you roll again.

### Winning

When only one player has chips, that player takes the centre pot plus whatever they still hold. Some groups play a "last chip must go to centre" house rule so the winner is the person who dumped the final chip; that is a different game. The boxed rules end when one person still has chips.

LCR belongs with other party dice games in the [Games of chance topic](/guides/topics/games-of-chance). [Bunco](/guides/bunco-rules) is the partnership alternative. [Casino party ideas](/guides/casino-party-ideas) is the night-planning page.`,
    },
    {
      id: "dice",
      title: "What one die does to a chip",
      body: `One LCR die is a four-way split hiding inside six faces.

| Face | Count on the die | Chance | Where the chip goes |
| --- | --- | --- | --- |
| Dot | 3 | 3/6 = 50% | Stays with you |
| L | 1 | 1/6 ≈ 16.7% | Player on your left |
| R | 1 | 1/6 ≈ 16.7% | Player on your right |
| C | 1 | 1/6 ≈ 16.7% | Centre pot (out of play) |

Independence matters. Three dice are three separate chip orders, not one combined instruction. L, L, dot means two chips left and one stays, not "something about left."

### Expected chips you keep on a three-die roll

Each of your three chips survives with probability 1/2 (the dot). Expected chips kept from your own roll = 1.5. Expected chips to left = 0.5, to right = 0.5, to centre = 0.5. You "lose" 1.5 in expectation every time you roll three dice, before anyone pays you back.

### Worked first roll

You hold 3. You roll L, C, dot.

- L: one chip to your left.
- C: one chip to the pot.
- Dot: one chip stays.

You now have 1. Left neighbour has +1. The pot has 1. Right neighbour is unchanged. Next player rolls.

If you roll C, C, C (1 in 216), you empty yourself in one turn and the pot jumps by 3. Rare, loud, and still not a decision.`,
    },
    {
      id: "seats",
      title: "Odds of winning by seat",
      body: `LCR has no skill, so the only bias is **who rolls first**. Chips leave the circle only on C. L and R just rotate wealth. The first player is the first person who can throw chips into the pot, and at that moment nobody has paid them back yet.

### Four players, after A's first turn only

Label seats A (first), B (left of A), C, D (right of A). Each starts with 3.

A rolls three dice. In expectation:

| Seat | Start | From A's roll | Expected chips now |
| --- | --- | --- | --- |
| A | 3 | −1.5 | 1.5 |
| B (A's left) | 3 | +0.5 | 3.5 |
| C | 3 | 0 | 3.0 |
| D (A's right) | 3 | +0.5 | 3.5 |
| Pot | 0 | +0.5 | 0.5 |

B and D are already ahead of A, and C has not been taxed. After B's turn the wave moves, but A has still taken one extra "tax turn" that D has not taken. In a long game everyone rolls many times and the gap shrinks in **relative** terms, yet the extra tax never fully disappears. More players means a longer wait until the last seat acts, so the first-seat disadvantage grows.

### Why this page does not print a fake seat table

A published table of exact win rates by seat for every player count would need a defined house rule set and a full Markov model. Blog percentages without a method are not a source. The direction is solid: later seats are a little better; first seat is a little worse; the gap is small next to ordinary dice variance. If you want fairness, randomise the start each game, or play a number of games equal to the number of seats and rotate the first roll.

### Three players, same idea

A's first roll still dumps 0.5 to the pot in expectation and 0.5 to each neighbour. With only two neighbours, both of them are A's left and right, so both jump to 3.5 while A sits at 1.5. Then B rolls, then C. Same qualitative story, smaller table.

If you are playing for a pot among adults, the seat bias is a reason to rotate, not a reason to sit on D and call it a system. The [dice roll probability](/guides/dice-roll-probability) page is the same counting used here; LCR just relabels three of the six faces.

A concrete rotation that kills the argument: play n games in a row at an n-player table, and move the first roll one seat each game. Over that block every seat pays the first-player tax once. The dice will still decide who wins each game; you have only removed the systematic part.`,
    },
    {
      id: "flow",
      title: "Chip flow, zeros and why games end",
      body: `Think of the chips as two piles: **in the circle** and **in the pot**. Only C moves a chip from circle to pot. L and R never reduce the circle total. The game ends when the circle's chips all sit in front of one person.

With n players and 3n chips, you need enough C faces to concentrate the remainder. That can take five minutes or twenty. A table of eight starts with 24 chips; more C faces have to appear before one seat can own the rest.

### Zero is not out

A player at zero is skipped, but they are a receiving address. If B has 0 and A rolls L (B is A's left), B is back in with 1 chip and will roll one die next time. Eliminating someone in conversation ("you're out") is a rules error that changes who can receive.

### Why you never "play around" a neighbour

There is no bid, no keep-or-reroll, no choice of which chip to move. People still lean, blow on dice, and pick a "lucky" colour of chip. That is the [illusion of control](/guides/illusion-of-control), the same bias as shaking harder for a 6. The faces do not care.

### Money

If the centre pot is cash, LCR is gambling. Adults only, 18+ or the local legal age. A $1 chip and a $20 chip use the same dice. Write the unit first. The boxed game is sold as a family toy; cash is your group's choice, not the publisher's.`,
    },
    {
      id: "variants",
      title: "House rules that actually change the game",
      body: `**LCR Wild** (a later George & Company edition) adds a wild face that the roller assigns. That injects one decision and breaks the "no skill" line.

**Last chip to the pot.** The winner must dump their last chip with a C. Games last longer and the pot is always non-empty at the end. Seat bias remains.

**More than three starting chips.** The cap is still three dice, so a rich player only risks three chips a turn. Fortunes swing slower; first-seat tax matters less in the first minute and more over a long grind.

**Cards instead of dice.** Some commercial decks replace the three cubes. The mapping should still be 50% stay, 1/6 each way, or you have a different game.

If you want a party game with real choices, play [shut the box](/guides/shut-the-box) or [ship captain crew](/guides/ship-captain-crew). LCR is the game you hand to a table that should not have to remember a chart.`,
    },
    {
      id: "pvp",
      title: "Chip passing and a hashed PvP round",
      body: `LCR is a teaching tool for independence: each face is a separate order, the pot only grows on C, and seat order is a small tax. It is a poor teaching tool for skill, because there is none.

PVPspinArena runs three player-vs-player games in USDC or ETH on Base. [Coinflip](/coinflip) is a 50/50, closer to a single LCR die than it looks: one binary result, two players, pot in the middle. [Roulette](/roulette) is a 33-slot wheel, 16 Purple and 16 Silver at 2x, 1 Green at 14x, every bet returning 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee (about a 7.88% Purple or Silver edge after the win fee). [Jackpot](/) sets your chance equal to your share of the pot. Seeds are committed; verify a settled round on [fairness](/fairness).

If passing chips has become passing more cash than you meant, stop. Tools sit on [responsible gambling](/responsible-gambling). Play is 18+ only.`,
    },
  ],
  faqs: [
    {
      q: "What are the left right center rules?",
      a: "Start with three chips each. Roll one die per chip you hold, max three. L passes left, R passes right, C goes to the pot, dots stay. Last player with chips wins the pot.",
    },
    {
      q: "How many dice do you roll in LCR?",
      a: "As many as the chips in front of you, up to three. Seven chips still roll three dice. Zero chips skip the turn but can receive chips from neighbours.",
    },
    {
      q: "Are you out when you have zero chips?",
      a: "No. You skip rolling until someone passes you a chip. Only the last player who still holds chips wins.",
    },
    {
      q: "Does the first player have worse odds in LCR?",
      a: "Slightly. The first seat is the first to dump chips toward the pot, before anyone has paid them back. Later seats get a small structural edge. Rotate the start if you play for money.",
    },
    {
      q: "Can you play LCR with regular dice?",
      a: "Yes. Read 1, 2 and 3 as dots, 4 as L, 5 as C and 6 as R. That matches the boxed die's 3–1–1–1 split.",
    },
    {
      q: "Is LCR a game of skill?",
      a: "No. The boxed rules give you no decisions. Seat order is the only systematic difference, and it is small next to the dice.",
    },
  ],
  sources: [
    {
      label: "George Co. v. Imagination Entertainment (4th Cir. 2009)",
      url: "https://caselaw.findlaw.com/court/us-4th-circuit/1258735.html",
    },
    { label: "Encyclopaedia Britannica: dice", url: "https://www.britannica.com/topic/dice" },
    { label: "Wikipedia: Dice", url: "https://en.wikipedia.org/wiki/Dice" },
  ],
  related: [
    "bunco-rules",
    "ship-captain-crew",
    "farkle-rules",
    "casino-party-ideas",
    "dice-roll-probability",
    "illusion-of-control",
  ],
  updated: "2026-09-27",
};
