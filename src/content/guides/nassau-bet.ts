import type { Guide } from "./types";

export const guide: Guide = {
  slug: "nassau-bet",
  cluster: "Sports betting",
  keyword: "nassau bet",
  secondary: ["golf press", "front nine back nine", "automatic 2-down press"],
  title: "Nassau Bet in Golf: Rules, Presses and Payout Examples",
  description:
    "Nassau bet rules for a golf match: front, back, overall, automatic presses, and a $5 card walked through all 18 holes with the payout.",
  h1: "Nassau bet: front nine, back nine, the 18, and the press",
  answer:
    "A Nassau bet is three golf matches at once. The front nine is one bet, the back nine is another, and all 18 holes are a third. Adults 18+. This page uses $5 on each, with an automatic press when a player goes 2 down on a nine. The press is an extra bet. It does not replace the one already running. PVPspinArena does not run golf bets. The example is Ana against Ben, and Ben pays Ana $25 when the card is added up.",
  facts: [
    "A $5 Nassau is $5 on the front, $5 on the back, and $5 on the 18. That is $15 before any press.",
    "Scoring is match play. Win a hole, lose a hole, or halve it. You are not adding strokes for the bet.",
    "An automatic press starts on the next hole when someone is 2 down on that nine.",
    "A front-nine press dies at the turn. It does not follow you to hole 10.",
    "This card does not press the overall. Some groups do. That choice belongs on the first tee.",
    "Seven bets are settled. Ana wins six and loses one. The net is $25 from Ben to Ana.",
  ],
  sections: [
    {
      id: "three-bets",
      title: "Three bets inside one Nassau",
      body: `Say "$5 Nassau" and you have named three stakes, not one. Five dollars rides on holes 1 through 9. Five dollars rides on holes 10 through 18. Five dollars rides on the match from the first tee to the last green. Lose the front and you can still win the back and the 18. Win all three and you win $15, before presses enter the card.

The back nine starts all square on the 10th tee. The overall does not reset. It keeps the holes already won and lost.

This is a match between two players. Ana and Ben play their own balls. A foursome can run the same three bets as a team game, usually better ball, and the press rules below still fit. The worked card is the two-player version so every hole has one winner or a half.

The stake comes from the other player. [PvP gambling](/guides/pvp-gambling) is the family name. Nobody is laying a book. [Sports betting](/guides/topics/sports-betting) on this site is reading material. It is not a Nassau desk. The other foursome cards are [wolf](/guides/wolf-golf-game), [skins](/guides/skins-game-golf), [side bets](/guides/golf-side-bets), and [bingo bango bongo](/guides/bingo-bango-bongo-golf). Adults 18+. The page is rules and a full card, not a pick and not legal advice.`,
    },
    {
      id: "match-play",
      title: "How a hole moves the match",
      body: `Match play counts holes, not the total of your strokes. If Ana makes 4 and Ben makes 5, Ana wins the hole and goes 1 up on every bet that includes that hole and is already running. If both make 5, the hole is halved and every live bet stays where it was. The 4 and the 5 are only there to decide the hole. They are not added into a stroke-play purse.

The table later shows Ana's lead. A positive number means Ana is up. A negative number means Ben is up. Zero is all square. A blank, written as a dash, means that bet is not being played on that hole yet, or the nine it belonged to is over.

A player may concede a hole. The concession is a loss on every bet that is live. Picking up the ball with no concession leaves the hole unfinished. Finish it or give it. On this card nobody concedes. Every hole is won by Ana, won by Ben, or halved.

You keep playing after a nine is decided. The overall may still be alive, and the back nine has not started.

[Peer to peer sports betting](/guides/peer-to-peer-sports-betting) needs the same grade: a win, a half, and what a concession does. Write it before the first drive.`,
    },
    {
      id: "presses",
      title: "When a press starts, and when it dies",
      body: `A press is a new bet for the same $5. It covers only the holes still left on that nine. It starts all square. The original bet keeps running beside it. Calling it double or nothing hides that fact. You can win the original and lose the press, which is what Ana does on the front.

This card uses an automatic 2-down press. When a player is 2 down at the end of a hole, the new bet starts on the next tee. Nobody has to ask, and nobody can refuse. A manual press, where the leader may say no, is a different agreement.

Presses apply to the nine you are on. They do not apply to the overall on this card. Some groups press the 18 the same way. If you want that, the card gets more bets and the $25 below is the wrong total. Leave the overall unpressed unless the first tee said otherwise.

A press can be pressed. Go 2 down on the press and another $5 starts on the following hole. A press with no holes left does not open. Two down after the 9th is a lost front. Front presses die at the turn. The 10th tee is a fresh nine, all square, plus the overall's lead.

The presses on this card open like this. After hole 2 Ana is 2 up on the front, so Ben is 2 down and front press 1 starts on hole 3. After hole 4 that press has Ben 2 up, so Ana is 2 down and front press 2 starts on hole 5. After hole 11 Ben is 2 up on the back, so back press 1 starts on hole 12. After hole 14 that press has Ana 2 up, so back press 2 starts on hole 15.`,
    },
    {
      id: "full-card",
      title: "A $5 Nassau through 18 holes",
      body: `The number in each bet column is Ana's lead after the hole. Dash means the bet is not live. "Half" means the hole was halved.

| Hole | Won by | Front | Front press 1 | Front press 2 | Overall | Back | Back press 1 | Back press 2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Ana | 1 | — | — | 1 | — | — | — |
| 2 | Ana | 2 | — | — | 2 | — | — | — |
| 3 | Ben | 1 | -1 | — | 1 | — | — | — |
| 4 | Ben | 0 | -2 | — | 0 | — | — | — |
| 5 | half | 0 | -2 | 0 | 0 | — | — | — |
| 6 | Ana | 1 | -1 | 1 | 1 | — | — | — |
| 7 | Ben | 0 | -2 | 0 | 0 | — | — | — |
| 8 | Ana | 1 | -1 | 1 | 1 | — | — | — |
| 9 | half | 1 | -1 | 1 | 1 | — | — | — |
| 10 | Ben | — | — | — | 0 | -1 | — | — |
| 11 | Ben | — | — | — | -1 | -2 | — | — |
| 12 | Ana | — | — | — | 0 | -1 | 1 | — |
| 13 | half | — | — | — | 0 | -1 | 1 | — |
| 14 | Ana | — | — | — | 1 | 0 | 2 | — |
| 15 | Ana | — | — | — | 2 | 1 | 3 | 1 |
| 16 | Ben | — | — | — | 1 | 0 | 2 | 0 |
| 17 | Ana | — | — | — | 2 | 1 | 3 | 1 |
| 18 | half | — | — | — | 2 | 1 | 3 | 1 |

Read the last line of each bet. Front closes on hole 9 with Ana 1 up. Front press 1 closes with Ana 1 down, so Ben wins it. Front press 2 closes with Ana 1 up. Overall closes on 18 with Ana 2 up. Back closes with Ana 1 up. Back press 1 closes with Ana 3 up. Back press 2 closes with Ana 1 up.

After hole 17, back press 1 is already Ana's. She is 3 up with one hole left. Ben could win 18 and she would still be 2 up. The half on 18 does not change a bet that could not be lost.

Each win pays $5 from the loser to the winner. Ana wins the front, front press 2, the overall, the back, back press 1, and back press 2. That is six times $5, or $30. Ben wins front press 1, so Ana pays him $5. Net, Ben pays Ana $25. The three original bets would have been $15 at most if every one went the same way and nobody pressed. The presses are why a "$5 Nassau" settled at $25.`,
    },
    {
      id: "checklist",
      title: "A checklist before anyone can press",
      body: `Presses are where a small Nassau bet gets large. Settle these lines before hole 1.

- The three amounts. This card is $5, $5, and $5. A $5 front, $5 back, and $10 overall is a different sentence.
- Automatic 2-down presses on the nines only. The overall is not pressed.
- A press starts on the next hole, all square, and only for the holes left on that nine.
- A press may itself be pressed. There is no cap on this card. Add a cap if you want one.
- The leader cannot refuse an automatic press. If you want refusals, you are on manual presses, and you must say so.
- A concession loses every live bet on that hole.
- A personal stop. Seven bets of $5 is $35 of face value. Ana's win was $25. A worse card can be the whole $35, and a longer press chain can pass it.
- That stop fits inside a [gambling budget](/guides/gambling-budget) written before the round, not renegotiated at the turn.
- Adults 18+. [Responsible gambling](/responsible-gambling) covers a match between friends. The unit being five dollars does not move it outside that page.

If you did not discuss presses, you do not have this card. You have three bets and a future argument.`,
    },
    {
      id: "teams-and-closeouts",
      title: "Teams, strokes, and a bet that closes early",
      body: `A four-ball Nassau uses the same three bets, with a side's score equal to its better ball. "$5 a team" means the losing team hands over $5. "$5 a player" means each loser pays each winner. This example is one versus one, so $5 is loser to winner.

Strokes, if you use them, come off the score before you decide the hole. List the holes. A stroke announced after a press has opened is a new rule aimed at a live bet. [Betting with friends online](/guides/bet-with-friends-online) gets the same dispute when the rule shows up after the result.

A bet closes early when the lead is bigger than the holes that remain. Front press 1 on this card stays live through 9, because a 2-up lead with holes left can still be caught. Back press 1 cannot be caught after 17. You do not have to play the last putt to know who won that press, but you may still need the putt for the overall, the back, and back press 2. Pick up only the bets that are mathematically over. Play the rest.

A [50-50 raffle](/guides/50-50-raffle) settles by a draw. A Nassau bet settles by holes won. If you want a draw to break an all-square nine, that is an extra rule. This card leaves an all-square nine as a push that pays zero. None of the seven bets pushed.`,
    },
    {
      id: "fee",
      title: "Stake, who pays, and a 5% pot fee",
      body: `On the course Ben pays Ana $25. No third party takes a cut. Seven bets have a face value of $35. The net is $25 because Ana lost one of them.

An equivalent pot has both players post the stake. Each $5 bet is a $10 pot. Seven bets are $70 posted. Jackpot and Coinflip take 5% of the pot. Five percent of $10 is $0.50, and five percent of $70 is $3.50. That fee is what a pot game would remove. Ana and Ben do not pay it.

| Bet | Stake | Who pays | Pot if both posted the stake | 5% fee |
| --- | --- | --- | --- | --- |
| Front | $5 | Ben pays Ana $5 | $10 | $0.50 |
| Front press 1 | $5 | Ana pays Ben $5 | $10 | $0.50 |
| Front press 2 | $5 | Ben pays Ana $5 | $10 | $0.50 |
| Overall | $5 | Ben pays Ana $5 | $10 | $0.50 |
| Back | $5 | Ben pays Ana $5 | $10 | $0.50 |
| Back press 1 | $5 | Ben pays Ana $5 | $10 | $0.50 |
| Back press 2 | $5 | Ben pays Ana $5 | $10 | $0.50 |
| Seven bets | $35 face | Ana's net is $25 | $70 | $3.50 |

The $25 and the $70 are different piles. The $25 is the net of seven winner-take payments. The $70 counts both players' stakes on every bet, including the bet Ben won. [House edge](/guides/house-edge) is the name for the cut inside a priced game. [Coinflip](/coinflip) takes its 5% off a pot. It does not score a nine. Roulette on this site is a 33-slot house game.

PVPspinArena does not offer a Nassau, does not press a nine, and does not hold this $25. Adults 18+.`,
    },
  ],
  faqs: [
    {
      q: "What does a $5 Nassau cost if you lose everything?",
      a: "Before presses, three bets are $15. Each automatic press adds another $5. This card created four presses, so seven bets and $35 of face value were live. Ana won $25 of that. A card where every bet goes one way can reach the full face value, and more presses can push past the original $15 quickly.",
    },
    {
      q: "Does a press replace the original bet?",
      a: "No. The original nine keeps its own score. The press starts all square on the next hole and runs beside it. On this front nine Ana wins the original, loses the first press, and wins the second press. One player can win and lose money on the same nine.",
    },
    {
      q: "When does the press start?",
      a: "On this card, on the hole after a player becomes 2 down. Two down through two holes means the press starts on the third tee. The overall is not pressed here. A front press ends on hole 9 and does not continue on the back.",
    },
    {
      q: "Can the other player refuse a press?",
      a: "Not on an automatic card. The press opens by the score. A manual press can be written so the player who is ahead may refuse. If you did not say which version you are playing, decide before the round. Do not decide when someone is already 2 down.",
    },
    {
      q: "Is the overall the same as adding the front and the back?",
      a: "No. The front and the back are separate bets that reset. The overall is one match across all 18 holes. You can split the nines and still win or lose the 18. On this card Ana wins all three base bets, and she also wins three presses and loses one.",
    },
  ],
  sources: [
    { label: "Wikipedia: Golf", url: "https://en.wikipedia.org/wiki/Golf" },
    { label: "Wikipedia: Match play", url: "https://en.wikipedia.org/wiki/Match_play" },
  ],
  related: [
    "wolf-golf-game",
    "skins-game-golf",
    "golf-side-bets",
    "bingo-bango-bongo-golf",
  ],
  updated: "2026-10-07",
};
