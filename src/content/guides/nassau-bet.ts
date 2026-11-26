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
    "A Nassau bet contains three contests: the front nine, back nine and overall eighteen holes. A $5 Nassau begins with three $5 contests between the sides. Presses create additional bets, so agree whether they are allowed or automatic, when they start and which remaining holes they cover.",
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
      body: 'Say "$5 Nassau" and you have named three stakes, not one. Five dollars rides on holes 1 through 9. Five dollars rides on holes 10 through 18. Five dollars rides on the match from the first tee to the last green. Lose the front and you can still win the back and the 18. Win all three and you win $15, before presses enter the card.\n\nThe back nine starts all square on the 10th tee. The overall does not reset. It keeps the holes already won and lost.\n\nThis is a match between two players. Ana and Ben play their own balls. A foursome can run the same three bets as a team game, usually better ball, and the press rules below still fit. The worked card is the two-player version so every hole has one winner or a half.',
    },
    {
      id: "match-play",
      title: "How a hole moves the match",
      body: "Match play counts holes, not the total of your strokes. If Ana makes 4 and Ben makes 5, Ana wins the hole and goes 1 up on every bet that includes that hole and is already running. If both make 5, the hole is halved and every live bet stays where it was. The 4 and the 5 are only there to decide the hole. They are not added into a stroke-play purse.\n\nThe table later shows Ana's lead. A positive number means Ana is up. A negative number means Ben is up. Zero is all square. A blank, written as a dash, means that bet is not being played on that hole yet, or the nine it belonged to is over.\n\nA player may concede a hole. The concession is a loss on every bet that is live. Picking up the ball with no concession leaves the hole unfinished. Finish it or give it. On this card nobody concedes. Every hole is won by Ana, won by Ben, or halved.\n\nYou keep playing after a nine is decided. The overall may still be alive, and the back nine has not started.\n\n[Peer to peer sports betting](/guides/peer-to-peer-sports-betting) needs the same grade: a win, a half, and what a concession does. Write it before the first drive.",
    },
    {
      id: "presses",
      title: "When a press starts, and when it dies",
      body: "A press is a new bet for the same $5. It covers only the holes still left on that nine. It starts all square. The original bet keeps running beside it. Calling it double or nothing hides that fact. You can win the original and lose the press, which is what Ana does on the front.\n\nThis card uses an automatic 2-down press. When a player is 2 down at the end of a hole, the new bet starts on the next tee. Nobody has to ask, and nobody can refuse. A manual press, where the leader may say no, is a different agreement.\n\nPresses apply to the nine you are on. They do not apply to the overall on this card. Some groups press the 18 the same way. If you want that, the card gets more bets and the $25 below is the wrong total. Leave the overall unpressed unless the first tee said otherwise.\n\nA press can be pressed. Go 2 down on the press and another $5 starts on the following hole. A press with no holes left does not open. Two down after the 9th is a lost front. Front presses die at the turn. The 10th tee is a fresh nine, all square, plus the overall's lead.\n\nThe presses on this card open like this. After hole 2 Ana is 2 up on the front, so Ben is 2 down and front press 1 starts on hole 3. After hole 4 that press has Ben 2 up, so Ana is 2 down and front press 2 starts on hole 5. After hole 11 Ben is 2 up on the back, so back press 1 starts on hole 12. After hole 14 that press has Ana 2 up, so back press 2 starts on hole 15.",
    },
    {
      id: "full-card",
      title: "A $5 Nassau through 18 holes",
      body: 'The number in each bet column is Ana\'s lead after the hole. Dash means the bet is not live. "Half" means the hole was halved.\n\n| Hole | Won by | Front | Front press 1 | Front press 2 | Overall | Back | Back press 1 | Back press 2 |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n| 1 | Ana | 1 | — | — | 1 | — | — | — |\n| 2 | Ana | 2 | — | — | 2 | — | — | — |\n| 3 | Ben | 1 | -1 | — | 1 | — | — | — |\n| 4 | Ben | 0 | -2 | — | 0 | — | — | — |\n| 5 | half | 0 | -2 | 0 | 0 | — | — | — |\n| 6 | Ana | 1 | -1 | 1 | 1 | — | — | — |\n| 7 | Ben | 0 | -2 | 0 | 0 | — | — | — |\n| 8 | Ana | 1 | -1 | 1 | 1 | — | — | — |\n| 9 | half | 1 | -1 | 1 | 1 | — | — | — |\n| 10 | Ben | — | — | — | 0 | -1 | — | — |\n| 11 | Ben | — | — | — | -1 | -2 | — | — |\n| 12 | Ana | — | — | — | 0 | -1 | 1 | — |\n| 13 | half | — | — | — | 0 | -1 | 1 | — |\n| 14 | Ana | — | — | — | 1 | 0 | 2 | — |\n| 15 | Ana | — | — | — | 2 | 1 | 3 | 1 |\n| 16 | Ben | — | — | — | 1 | 0 | 2 | 0 |\n| 17 | Ana | — | — | — | 2 | 1 | 3 | 1 |\n| 18 | half | — | — | — | 2 | 1 | 3 | 1 |\n\nRead the last line of each bet. Front closes on hole 9 with Ana 1 up. Front press 1 closes with Ana 1 down, so Ben wins it. Front press 2 closes with Ana 1 up. Overall closes on 18 with Ana 2 up. Back closes with Ana 1 up. Back press 1 closes with Ana 3 up. Back press 2 closes with Ana 1 up.\n\nAfter hole 17, back press 1 is already Ana\'s. She is 3 up with one hole left. Ben could win 18 and she would still be 2 up. The half on 18 does not change a bet that could not be lost.\n\nEach win pays $5 from the loser to the winner. Ana wins the front, front press 2, the overall, the back, back press 1, and back press 2. That is six times $5, or $30. Ben wins front press 1, so Ana pays him $5. Net, Ben pays Ana $25. The three original bets would have been $15 at most if every one went the same way and nobody pressed. The presses are why a "$5 Nassau" settled at $25.',
    },
    {
      id: "checklist",
      title: "A checklist before anyone can press",
      body: "Presses are where a small Nassau bet gets large. Settle these lines before hole 1.\n\n- The three amounts. This card is $5, $5, and $5. A $5 front, $5 back, and $10 overall is a different sentence.\n- Automatic 2-down presses on the nines only. The overall is not pressed.\n- A press starts on the next hole, all square, and only for the holes left on that nine.\n- A press may itself be pressed. There is no cap on this card. Add a cap if you want one.\n- The leader cannot refuse an automatic press. If you want refusals, you are on manual presses, and you must say so.\n- A concession loses every live bet on that hole.\n- A personal stop. Seven bets of $5 is $35 of face value. Ana's win was $25. A worse card can be the whole $35, and a longer press chain can pass it.\n- That stop fits inside a [gambling budget](/guides/gambling-budget) written before the round, not renegotiated at the turn.\n- Adults 18+. [Responsible gambling](/responsible-gambling) covers a match between friends. The unit being five dollars does not move it outside that page.\n\nIf you did not discuss presses, you do not have this card. You have three bets and a future argument.",
    },
    {
      id: "teams-and-closeouts",
      title: "Teams, strokes, and a bet that closes early",
      body: 'A four-ball Nassau uses the same three bets, with a side\'s score equal to its better ball. "$5 a team" means the losing team hands over $5. "$5 a player" means each loser pays each winner. This example is one versus one, so $5 is loser to winner.\n\nStrokes, if you use them, come off the score before you decide the hole. List the holes. A stroke announced after a press has opened is a new rule aimed at a live bet. [Betting with friends online](/guides/bet-with-friends-online) gets the same dispute when the rule shows up after the result.\n\nA bet closes early when the lead is bigger than the holes that remain. Front press 1 on this card stays live through 9, because a 2-up lead with holes left can still be caught. Back press 1 cannot be caught after 17. You do not have to play the last putt to know who won that press, but you may still need the putt for the overall, the back, and back press 2. Pick up only the bets that are mathematically over. Play the rest.\n\nA [50-50 raffle](/guides/50-50-raffle) settles by a draw. A Nassau bet settles by holes won. If you want a draw to break an all-square nine, that is an extra rule. This card leaves an all-square nine as a push that pays zero. None of the seven bets pushed.',
    },
    {
      id: "agreed-format",
      title: "A Nassau starts with three contests",
      body: "Talisker’s golf guide lists Nassau as front, back and total, with net scoring in that club’s format. A $5 Nassau therefore begins with three $5 contests between the opposing sides, before presses. Presses add separate exposure; agree whether they are optional, automatic or prohibited and which holes they cover. The club example establishes the format, not a universal obligation to press.\n\nExplore the [sports betting topic](/guides/topics/sports-betting) for related rules and examples.",
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
    {
      label: "Talisker Club: golf guide, Nassau and net skins formats",
      url: "https://www.taliskerclub.com/wp-content/uploads/2025/03/GOLF-GUIDE-2025-7.pdf",
    },
    {
      label: "USGA: amateur-status guidance on optional wagering",
      url: "https://www.usga.org/content/usga/home-page/rules-hub/amateur-status/amateur-status-modernization/general-guidance-notes.html",
    },
  ],
  related: ["wolf-golf-game", "skins-game-golf", "golf-side-bets", "bingo-bango-bongo-golf"],
  updated: "2026-11-26",
};
