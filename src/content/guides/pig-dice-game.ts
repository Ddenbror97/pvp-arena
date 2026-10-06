import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pig-dice-game",
  cluster: "Games of chance",
  keyword: "pig dice game",
  secondary: ["how to play pig", "pig dice rules", "hold at 20", "two-dice pig", "pig to 100"],
  title: "Pig Dice Game: Rules and Hold at 20 | PvP Spin Arena",
  description:
    "Pig dice game rules: one die, take turns, roll and add, bank or continue. A 1 wipes the turn, not the score. First to 100. Hold-at-20 is the known points rule.",
  h1: "Pig dice game: one die, a turn total, and the race to 100",
  answer:
    "The pig dice game uses one standard die, sometimes two. Players take turns. On your turn you roll and add the face to a turn total, then either roll again or bank that total onto your score. A roll of 1 wipes the turn total and does not touch points you already banked. The first player to reach 100 wins. This is the numbered-die game Pig. Pass the Pigs, the rubber-pig game, is a different product.",
  facts: [
    "One die is the standard game. A 1 ends the turn and scores 0 for that turn. Faces 2 through 6 add to the turn total.",
    "Banked points stay banked. Only the current turn total is at risk.",
    "The usual target is 100. The first player to reach it on a bank wins.",
    "Hold at 20 maximizes expected points per turn in the one-die game: below 20, rolling raises the expected turn total; at 20 it is a wash.",
    "Winning the game is a different goal. Published optimal play banks earlier when far ahead and rolls past 20 when the opponent is about to finish.",
    "Two-dice sheets disagree. On the sheet used here, one 1 adds nothing and the turn continues; two 1s wipe the turn total only.",
  ],
  howTo: true,
  sections: [
    {
      id: "turn",
      title: "How a turn works",
      body: `You need one six-sided die, two or more players, and a way to write two numbers per person: the banked score, and the turn total that has not been banked yet. Seats go in order. The youngest player, or a starting roll, goes first, and play passes left.

A turn is a sequence of rolls by one player:

1. Roll the die.
2. If the face is 1, the turn total becomes 0 and the turn ends. The banked score is unchanged. Pass the die.
3. If the face is 2, 3, 4, 5, or 6, add it to the turn total.
4. Choose. Bank: add the turn total to your score, set the turn total to 0, and pass the die. Or roll again, and return to step 1.

The turn total is a pile sitting on the table. Banking slides that pile onto your score. A 1 sweeps the pile off the table. It does not reach into the score you already banked on earlier turns.

Say your score is 40 and this turn you have rolled 6, then 5, then 4. The turn total is 15. You can bank and move to 55, or roll again. A 3 would make the turn total 18. A 1 would leave you on 40, the same score you started the turn with.

Agree the target before the first roll. One hundred is the usual line. Some tables play to 50 for a short game or to 200 for a long one. The hold-at-20 arithmetic below assumes the one-die bust rule. It does not assume a particular target, but the endgame advice does: once a bank would reach the target, you bank and the game is over.

Pig sits with the other push-your-luck dice games in the [games of chance hub](/guides/topics/games-of-chance). [Farkle](/guides/farkle-rules) is the same family with six dice and a scoring table. Pig is the smallest version of that choice: one die, one bad face, one decision.`,
    },
    {
      id: "one-die",
      title: "The one-die bust, and why the score is safe",
      body: `Each face from 1 to 6 has probability 1/6 on a fair die. Five of the six faces help you. One of them ends the turn. The helpful faces average (2 + 3 + 4 + 5 + 6) / 5 = 4. So a roll that survives adds 4 points on average, and a roll that fails adds nothing and deletes the turn total.

Write T for the turn total you already hold, before the next roll. The expected change in T is:

- With probability 5/6 you add 4.
- With probability 1/6 you lose T.

Expected change = (5/6) × 4 − (1/6) × T = (20 − T) / 6.

That expression is positive when T is under 20, zero at 20, and negative above 20. This is the whole of the famous hold-at-20 result for expected points. It is an argument about one turn, not about the match. Reiner Knizia set it out in Dice Games Properly Explained (1999) as a fair bet: you risk 20 to gain 4, and 4-to-20 is the same ratio as the 1-to-5 odds against rolling a 1.

John Scarne described Pig in print in Scarne on Dice (1945). Classroom sheets and family tables have carried it since, because the rules fit on a card and the decision is real. The arithmetic of a single fair die is the same counting used in [dice roll probability](/guides/dice-roll-probability): six faces, equal weight, no memory from the last roll.`,
    },
    {
      id: "hold",
      title: "Hold at 20, and when the race says otherwise",
      body: `Hold at 20 is a policy: if the turn total is 20 or more, bank, unless banking is not yet enough and the alternative is to hand a player who can win on the next turn an easy finish. If the turn total is under 20, roll. Also bank the moment the turn total would put your score at or past 100.

Todd W. Neller and Clifton G. M. Presser solved the one-die game for the probability of winning, not for expected points, in the UMAP Journal in 2004. Their point is the one Knizia already flagged. Points on a turn and the chance of reaching 100 first are different objectives. The clean example in their paper: the opponent has 99, you have 78, and the turn total is 20. Hold at 20 banks to 98 and almost certainly loses, because the opponent is one safe roll from the target. Rolling once more can reach 100 on a 2 or better. The chance of winning by rolling is higher than the chance of winning by banking, even though 20 is the points-maximizing line in the middle of the game.

The shape of that solution, in plain language:

- With both scores low, hold at 20 is close to best play.
- When you are far ahead, bank sooner than 20. You are protecting a lead, and a bust gives the trail a free chance to catch up.
- When the opponent is near 100, or you are far behind, roll past 20. A modest bank does not change who is about to win.

You do not need the full table of states at a kitchen table. You need the threshold, plus the two endgame exceptions. Write them down before anyone is angry about a bust. The policy is a choice you made in advance, which is the useful part.

[Shut the box](/guides/shut-the-box) has a similar flavour: each roll spends a total, and a roll you cannot place ends the turn. Pig's decision is optional continuation. Shut the box's decision is whether a legal close exists. Both reward knowing the distribution before the die leaves your hand.`,
    },
    {
      id: "two-dice",
      title: "Two-dice Pig, and Pass the Pigs",
      body: `Some tables play Pig with two dice. Agree the bust rule out loud, because two common sheets contradict each other.

The sheet this page uses:

- If neither die shows 1, add both faces to the turn total. You may bank or roll again.
- If exactly one die shows 1, that roll adds nothing. The turn total stays as it was, and you keep the turn.
- If both dice show 1, the turn total is wiped. The banked score stays. The turn ends.

A stricter sheet, the one summarized in the usual encyclopedia entry for Pig, is harsher. A single 1 scores nothing and ends the turn. Two 1s wipe the player's entire banked score as well as the turn. If you learned the game from that page, you learned that stricter sheet. Either sheet is playable. Mixing them mid-game is how arguments start.

Under the gentler sheet, the turn dies only on snake eyes, 1 of 36 rolls. A lone 1 is a wasted roll, not a bust, so the one-die hold-at-20 line does not carry over. There are 25 outcomes with no 1, and those sums average 8. The expected change in a turn total T is (200 − T) / 36, still positive until T passes 200. With a target of 100, roll until you can bank a win.

Pass the Pigs is a different game. David Moffatt's commercial version, sold as Pig Mania in 1977 and later as Pass the Pigs, uses two small rubber pigs rather than numbered dice. Sides, backs, and snouts score on a chart, and a touching or opposite-side throw can wipe a turn or a score. Mention it only so a search for "pig" does not land you in the wrong rules. If the objects in your hand have pips, you are playing the die game on this page.

Where adults stake money on the result, play is 18+ or the local legal age. Pig is mostly the die, with a thin layer of stopping rules. A better threshold helps across many games. It does not rescue a night of 1s.`,
    },
    {
      id: "example",
      title: "A sample race to 100",
      body: `Two players, Ada and Bo, one die, target 100, hold at 20 unless the endgame says otherwise. Scores start at 0.

Ada's first turn: 6, 4, 5, 3, then 6. The turn total is 24. She banks. Score: Ada 24, Bo 0.

Bo: 5, 6, 2, then 1. The turn total had reached 13 and the 1 wipes it. Score: Ada 24, Bo 0.

Ada: 4, 4, 6, 6. Turn total 20. She banks. Score: Ada 44, Bo 0.

Bo: 6, 6, 5, 4, 3. Turn total 24. He banks. Score: Ada 44, Bo 24.

The mistake new players make is narrating the turn total as if it were already banked. Near the end, with Ada on 86, a turn total of 15 reaches 101 and she banks. She does not roll again out of habit. If instead Bo is on 96 and Ada's turn total is 22 with a score of 62, banking to 84 hands Bo a straightforward finish. Rolling past 22 is the race decision. The points line and the match pull apart, and the match is what ends the evening.

[Liars dice](/guides/liars-dice) asks for a different skill, reading what someone claims about hidden dice. Pig hides nothing. Every face is on the table. The only private information is what you intend to do with the next roll, and you can decide that before the game starts.`,
    },
    {
      id: "pvp",
      title: "Banking a turn and a hashed round",
      body: `Pig's choice is whether to lock in a total or risk it. A player-versus-player round on this site has no optional extra roll. The result is one draw from a committed procedure, and both players see the same rule before they stake.

PVPspinArena runs three games, in USDC or ETH on Base. Coinflip is two players and a 50/50. Roulette is a shared 33-slot wheel: 16 purple and 16 silver pay 2x, and 1 green pays 14x, so Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Jackpot pays the pot to one player, with a win chance equal to that player's share of the pot, minus any fee shown before entry. You can check a settled round from the committed seeds on the [fairness page](/fairness).

The habit worth copying from Pig is the one you make before the die is in the air. In Pig that is a hold threshold. In a staked game it is a loss limit you set while you are calm. Tools for that sit on the [responsible gambling](/responsible-gambling) page. Play is 18+ only.

If you want another race-to-a-total with more combinations, use [Yahtzee](/guides/yahtzee-rules). If you want a three-dice banking game with a published house edge, use [chuck-a-luck](/guides/chuck-a-luck). Pig remains the cleanest place to see a 1/6 bust priced against an average gain of 4.

See also [tenzi](/guides/tenzi-rules).`,
    },
  ],
  faqs: [
    {
      q: "What are the rules of the pig dice game?",
      a: "Players take turns with one die. Add each roll of 2 through 6 to a turn total, then bank it onto your score or roll again. A 1 wipes the turn total and leaves banked points alone. First to 100 wins.",
    },
    {
      q: "Does a roll of 1 wipe your whole score in Pig?",
      a: "In the standard one-die game, no. A 1 wipes only the current turn total. Points you already banked on earlier turns stay on your score.",
    },
    {
      q: "What is hold at 20 in Pig?",
      a: "Bank when the turn total reaches 20, and roll when it is below 20. That line maximizes expected points per turn. Near the end of a race to 100, the better play often leaves that line to protect a lead or to catch a player who is about to win.",
    },
    {
      q: "How does two-dice Pig treat a single 1?",
      a: "On the sheet used here, one 1 adds nothing for that roll and you keep the turn. Two 1s wipe the turn total only. Other published sheets end the turn on a single 1 and wipe the entire score on two 1s. Agree before you play.",
    },
    {
      q: "Is Pig the same game as Pass the Pigs?",
      a: "No. Pig on this page uses a numbered die and a turn total. Pass the Pigs is a commercial game from 1977 that uses rubber pigs and a chart of positions. The bust idea is similar. The equipment and the scoring are not.",
    },
  ],
  sources: [
    { label: "Wikipedia: Pig (dice game)", url: "https://en.wikipedia.org/wiki/Pig_(dice_game)" },
    {
      label: "Neller and Presser, Optimal Play of the Dice Game Pig (2004)",
      url: "https://cs.gettysburg.edu/~tneller/papers/pig.pdf",
    },
    { label: "Wikipedia: Pass the Pigs", url: "https://en.wikipedia.org/wiki/Pass_the_Pigs" },
  ],
  related: [
    "farkle-rules",
    "shut-the-box",
    "dice-roll-probability",
    "yahtzee-rules",
    "tenzi-rules",
  ],
  updated: "2026-09-29",
};
