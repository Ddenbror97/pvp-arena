import type { Guide } from "./types";

export const guide: Guide = {
  slug: "tenzi-rules",
  cluster: "Games of chance",
  keyword: "tenzi rules",
  secondary: [
    "how to play tenzi",
    "tenzi dice game",
    "carma games tenzi",
    "tenzi shout",
    "ten dice race",
  ],
  title: "Tenzi Rules: The 10-Dice Race to Match | PvP Spin Arena",
  description:
    "Tenzi rules from Carma Games: 10 dice each, everyone rolls on Go, set aside your most common number, and shout Tenzi when all 10 match.",
  h1: "Tenzi rules: ten dice, one number, and a shout",
  answer:
    "Tenzi rules are a real-time race. Each player has 10 dice. Someone says Go, and everyone rolls all 10 at once. You pick a number you have the most of, set those dice aside, and reroll the rest, chasing 10 of that number. There are no turns. The first player to get all 10 showing the same number shouts Tenzi and wins. Carma Games publishes it. Team Tenzi and Splitzi are named variations in the box; play those from the printed sheet.",
  facts: [
    "Each player needs 10 dice of their own. A boxed set is often four colours, for two to four players.",
    "Only the opening roll is synchronised. After that, everyone rerolls at their own speed.",
    "You set aside the number you are collecting. The remaining dice are the only ones you roll.",
    "The winner is the first to have all 10 dice on that number and to shout Tenzi.",
    "The publisher's sheet also names variations, including Team Tenzi and Splitzi. Those are separate goals, not the base race.",
    "All 10 dice matching on a single roll of a fresh set is 6 × (1/6)^10, about 1 in 10 million. The game is won by setting dice aside, not by one lucky throw.",
  ],
  howTo: true,
  sections: [
    {
      id: "what",
      title: "What Tenzi is",
      body: `Tenzi is a commercial dice race from Carma Games. BoardGameGeek lists a 2011 edition. The box is aimed at a family table: a short round, often under a minute once people know the motion, age guidance on the box around 7 and up, and two to four players with the dice the game supplies. You can add players if you have more sets of 10 matching dice and enough table.

The equipment is the whole game. There is no board, no banker, and no score that carries inside a single round. Each person guards a small pool of dice. Colour is how you stop your 4s from mixing with the 4s next to you. If you play with borrowed dice, give each player a napkin or a sheet of paper as a lane.

Tenzi belongs with the other dice games in the [games of chance hub](/guides/topics/games-of-chance) because the outcome is faces on cubes. It is a race of speed and a little bit of choice, not a push-your-luck bank. Nobody busts. Nobody takes a turn. The clock is the other players' hands.

[Yahtzee](/guides/yahtzee-rules) also asks you to collect matching faces, but Yahtzee is turn-based, uses five dice, and fills a scorecard of categories. Tenzi has one category, ten dice, and everybody acts at once. If a group wants a quiet, scored game, Yahtzee is the better fit. If a group wants noise, Tenzi is the better fit.

This page states the base race. It names two official variations and does not rewrite them. If the sheet in your box disagrees with a sentence here, the sheet in the box wins for that copy of the game.`,
    },
    {
      id: "round",
      title: "A round from Go to the shout",
      body: `Seat everyone with room to roll without flinging dice into the next lane. Each player picks up all 10 dice. One person, who is also playing, says Go. That person does not get a head start; they say the word and roll with everyone else.

1. On Go, every player rolls all 10 dice.
2. Look at your own dice. Choose a number to collect. The usual choice is the number you rolled the most of.
3. Set every die showing that number to one side, where you will not pick them up again.
4. Gather the dice that show something else and roll them.
5. Set aside any new dice that show your number. Roll whatever is left.
6. Repeat until all 10 dice show the same number.
7. Shout Tenzi. The first player to do that wins the round.

After the opening roll, you do not wait. If the player on your left is still sorting their first roll, you are already on your second. The game is deliberately messy. Dice that leave your lane should be handed back without a debate in the middle of the round. Settle the lane rules before Go, not after someone shouts.

A die that is cocked, leaning on another die, or on the floor does not count as a face until it is sitting flat. Roll it again with the dice you still have in hand. A die you have already set aside stays set aside.

The shout is part of the win. A player who has 10 matches and stays silent has not claimed the round. In practice the table hears the shout and looks. If two players shout so close together that nobody can say who was first, replay the round. That is a house courtesy, not a line you will find printed as a timing device. The publisher's win condition is being first.

[Left Right Center](/guides/left-right-center-rules) is another fast dice game that passes objects around a table. Tenzi does not pass anything. Your dice stay yours for the whole round.`,
    },
    {
      id: "choose",
      title: "Choosing the number",
      body: `On the opening roll of 10 dice, ties are common. You might see three 2s and three 5s, and ones of everything else. Either 2 or 5 is a sound start. Pick one and commit. The base race, as usually played, keeps the number you set aside. Those dice are already correct for that number. Switching later means picking them back up and starting the collection again, which hands the table a large lead. This page does not add a switching rule. If your box allows a change of target, it will say so.

"The most of" means the mode of that roll. With 10 dice and 6 faces, the single most common face is often three or four dice. A worked opening roll:

| Face | Count in this roll |
| --- | --- |
| 1 | 1 |
| 2 | 4 |
| 3 | 2 |
| 4 | 0 |
| 5 | 2 |
| 6 | 1 |

You set aside the four 2s and reroll six dice. Suppose the six come up 2, 2, 5, 5, 3, 6. You add two more 2s to the pile. Four dice remain. The next roll is those four, and so on, until the pile holds ten 2s.

There is no scoring for how fast you were, unless your box includes the optional time labels some printings use as a joke scale for solo speed. The competitive game is ordinal: first shout wins, second shout does not get a partial prize. You can play a match of several rounds and count round wins. First to three round wins is a simple match. The box does not require a match; one shout can be the whole session.

Probability explains why the opening choice matters and why it does not decide the game. The chance a given die shows your number is 1/6 on every roll, and the rolls are independent. Setting aside four dice instead of two means you have fewer dice left to roll, so you finish sooner in expectation. It does not guarantee you finish first, because the other players are rolling at the same time and their hands may be faster than your count.

[Bunco](/guides/bunco-rules) also chases a matching number, in turns, with three dice and a rolling team score. Tenzi compresses that chase into one simultaneous scramble and then ends.`,
    },
    {
      id: "no-turns",
      title: "Why there are no turns",
      body: `Turn-based dice games exist so that everyone shares one set of dice and so that each decision can be checked. Tenzi spends dice instead of time. Four players need 40 dice on the table. The gain is that a round finishes before a conversation does. The cost is that you cannot reconstruct the round afterward. Nobody writes down the intermediate rolls. If you care about a photograph of a fair result, Tenzi is the wrong game. If you care about who shouted first, it is the right one.

A few table habits keep the race readable:

- One colour of dice per player, or one sheet of paper per player.
- Hands stay over your own lane. Reaching into someone else's set is a foul even when you are trying to help.
- The player who says Go is playing, not refereeing, unless your group appoints a caller who sits out.
- Phones stay down. The game is short enough that filming it mostly creates arguments about the frame rate of the shout.

Children play Tenzi as a dexterity game, which is what the box is for. Adults sometimes put a small stake on the shout. Where money is on the round, everyone at the table should be 18 or older, or the local legal age, and the stake should be agreed before Go and small enough that losing it does not matter. The dice do not know about the stake. A faster hand and a luckier opening count still decide it.

Skill shows up as clean cupping: gathering only the dice that failed, rolling them so they land in the lane, and spotting your number without a second look. It is a small skill. Across one round, the opening count and the rolls dominate. Across a long match, the player who fumbles less will win more shouts than a player who fumbles often. That is the entire strategy section the game supports.`,
    },
    {
      id: "names",
      title: "Named variations, by name only",
      body: `Carma's sheet lists more than the base race. Two names are enough to stop a search from inventing rules: Team Tenzi and Splitzi. They are official variations. They are not the base game, and they are not the same as each other. The printed sheet in the box states how each one changes the goal. This page does not restate those goals, because a paraphrased variation is how groups end up playing a third game nobody published.

If you do not have the sheet, play the base race above. It is complete: 10 dice, one number, first shout wins. Adding a house rule (a ban on choosing 1, a requirement to stack dice, a steal from a neighbour) makes a different game. Write that house rule down if you use it, and do not call it Tenzi when you teach it to someone who owns the box.

Retail listings sometimes mention a party pack or a booklet of extra ways to play. Treat those booklets as their own rulesets. A page about the base race cannot absorb dozens of variants without blurring the one procedure that every copy shares.

The same caution applies to solo play. People time themselves with 10 dice and try to beat a personal record. That is a fine drill. It is not a ranked system, and the labels some groups attach to time bands are flavour, not a handicap. [Dice roll probability](/guides/dice-roll-probability) will tell you how rare a given count is. It will not tell you how fast your hands are.

When you teach a new player, teach only the seven steps in the round section. Variations are for the second session, with the box open on the table.`,
    },
    {
      id: "pvp",
      title: "A shout, a coin, and a checked result",
      body: `Tenzi settles a winner by a shout at a kitchen table. A hashed player-versus-player round settles a winner by a procedure both people can recompute. They scratch different itches. One is a race you can see. The other is a draw you can audit.

PVPspinArena runs three games in USDC or ETH on Base. [Coinflip](/coinflip) is two players and a 50/50, the smallest head-to-head stake on the site. Roulette uses a 33-slot wheel where 16 purple and 16 silver pay 2x and 1 green pays 14x, so Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Jackpot gives a win chance equal to your share of the pot, and the winner takes the pot minus any fee shown before entry. Settled rounds can be checked from the committed seeds on the [fairness](/fairness) page.

None of those games asks you to shout, and none of them uses 10 physical dice. The link is only this: if you want a contest whose result is a public rule rather than the fastest hand, the coin is the simple one. If you want the fastest hand, stay with Tenzi and keep the stakes at zero, or keep them adult and small.

[Poker dice](/guides/poker-dice) is the turn-based cousin if the table wants hands and rerolls with a shared set. Tenzi stays the one you play when the rulebook is shorter than the round.

See also [horse race dice](/guides/horse-race-dice-game).`,
    },
  ],
  faqs: [
    {
      q: "What are the Tenzi rules in short?",
      a: "Each player rolls 10 dice at the same time on Go, sets aside the number they have the most of, and rerolls the rest until all 10 match. The first to shout Tenzi wins. There are no turns after the opening roll.",
    },
    {
      q: "How many dice does each player need in Tenzi?",
      a: "Ten. A standard box supplies enough for two to four players, usually in different colours so the sets stay separate.",
    },
    {
      q: "Do you take turns in Tenzi?",
      a: "No. Everyone rolls on Go, and after that each player rerolls their own remaining dice as fast as they can. You do not wait for the rest of the table.",
    },
    {
      q: "What are Team Tenzi and Splitzi?",
      a: "They are named variations printed by the publisher, not the base race. Use the sheet in the box for how each one changes the goal. The base game is still 10 dice on one number.",
    },
    {
      q: "Can you play Tenzi for money?",
      a: "The published game is a family race. If adults add a stake, everyone should be 18 or the local legal age, and the stake should be agreed before anyone says Go. The dice play the same either way.",
    },
  ],
  sources: [
    { label: "BoardGameGeek: Tenzi", url: "https://boardgamegeek.com/boardgame/113819/tenzi" },
    { label: "Wikipedia: Dice", url: "https://en.wikipedia.org/wiki/Dice" },
    { label: "Encyclopaedia Britannica: dice", url: "https://www.britannica.com/topic/dice" },
  ],
  related: [
    "yahtzee-rules",
    "bunco-rules",
    "horse-race-dice-game",
    "farkle-rules",
    "dice-roll-probability",
  ],
  updated: "2026-09-29",
};
