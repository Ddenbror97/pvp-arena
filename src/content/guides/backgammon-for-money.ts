import type { Guide } from "./types";

export const guide: Guide = {
  slug: "backgammon-for-money",
  cluster: "Skill wagers",
  keyword: "backgammon for money",
  secondary: ["cash backgammon", "doubling cube stakes", "backgammon for real money"],
  title: "Backgammon for Money: Sites, Stakes and Doubling Cube",
  description:
    "Backgammon for money: sites, posted stakes, the doubling cube, match fees you read yourself, and how a money game differs from a rules page.",
  h1: "Backgammon for money: sites, stakes, and the doubling cube",
  answer:
    "Backgammon for money means a posted stake on a race of fifteen checkers, multiplied by the doubling cube and sometimes by a gammon. Sites and clubs hold that stake between two players. The cube is the part that turns a calm game into a larger one without a new negotiation. This page prices that decision. It points at the rules and then leaves them. It does not invent a site’s rake, a bot rate, or a map of legal states.",
  facts: [
    "The base stake is the number on the table before anyone touches the cube.",
    "Each accepted double multiplies that stake. A pass concedes the current stake.",
    "A gammon or backgammon multiplies again, if the match rules say so.",
    "Clock, resign, and disconnect rules are part of the stake, not a side argument.",
    "A chance pot has no cube and no checkers. Its fee is a different purchase.",
  ],
  sections: [
    {
      id: "posted-stake",
      title: "The posted stake is the whole product until the cube moves",
      body: `A money game starts with a number both players can say. That number is what a plain win pays, before any double and before any gammon. Clubs write it on a board. Apps put it on a button. Friends bury it in a sentence they will remember differently. The third version is how backgammon arguments start. Repeat the number while the cube still shows 1.

“Sites” in the title are any room that will hold two stakes and deal a board: a club, a dedicated backgammon server, a general wager app with a backgammon mode. This page will not crown one. The useful differences are whether the rake is visible, whether you can see an opponent’s history, and whether the cube and gammon rules match the game you think you play. A site with a beautiful board and a hidden fee is a worse site than a plain board with a receipt.

[Wager app](/guides/wager-app) describes the hold in the abstract. Backgammon’s twist is that the hold may need to grow when the cube grows. If the app only locked the original stake, an accepted double is a promise to pay more later. Promises are how winners chase losers through support chat. Prefer a room that escrows the maximum, or that ends the game when a player cannot cover the next double.

Adults 18+ only. Real-money games of skill are treated differently in different places. The site’s eligibility check is the practical border. This is not legal advice, and there is no state list here for you to route around.`,
    },
    {
      id: "rules-pointer",
      title: "Rules and strategy live next door; the cube is the money",
      body: `Setup, hitting, the bar, and bearing off are in [backgammon rules](/guides/backgammon-rules). Choosing when a blot is a gift and when a double is premature is the work of [backgammon strategy](/guides/backgammon-strategy). Read those so the cube discussion below is about dollars, not about how a checker moves.

The cube is a stake changer either player may offer on their turn, under the rules you adopted. The other player takes, and the stake multiplies, or passes, and the game ends for the current stake. In a match, cube ownership and the score often restrict it. A Crawford-style rule stops a double in the game where a player is one point from victory. If your money game ignores that convention, say so. Mixing a cubeless habit with a cubed cash habit is how someone feels cheated by a rule they used for years without dollars.

Gammons multiply a win when the loser still has all fifteen checkers on. Backgammons multiply further when a checker is also on the bar or in the winner’s home. Those multipliers stack with the cube in standard money play. A $10 game doubled twice and then gammoned is no longer a $10 game. A room that plays “no gammons” to keep swings smaller should write that next to the stake. Silence means you will meet someone who plays the other way.

[Skill-based gambling](/guides/skill-based-gambling) fits backgammon more cleanly than it fits a sixty-second puzzle. Over a long sample, cube decisions and checker play move results. One game is still dice. The dice are the reason the stake has to be survivable when you play the position correctly and lose anyway.`,
    },
    {
      id: "suppose-cube",
      title: "Two Suppose paths for the same starting stake",
      body: `These paths use a $10 base so the multipliers stay obvious. They are not a quote from any site’s rake. Platform fees, if a platform is even in the middle, get read off the match screen. The fee cell stays “read the entry.”

Suppose neither player doubles. You win a plain game. You collect $10, or you pay $10 if you lose. A gammon, if gammons are on, makes that $20. You can sit down with a bankroll rule as simple as “I can lose four gammons.” That is $80 of risk on a $10 sticker, which is already more game than the sticker suggested, and nobody has doubled yet.

Suppose you double and your opponent takes, then doubles back and you take. The cube shows 4. The stake is $40 before a gammon. A gammon makes $80. If the room did not escrow $80, someone is playing on credit. Credit backgammon against a stranger is a collections hobby. Against a friend it is a way to bruise the friendship. Decline the take if covering the new number would hurt, even when the take is technically correct in a book. The book assumes you can pay.

| Cube shows | Plain win on a $10 base | Gammon, if played | What must be covered |
| --- | --- | --- | --- |
| 1 | $10 | $20 | The gammon, not just the sticker |
| 2 | $20 | $40 | An accepted double |
| 4 | $40 | $80 | A redouble you chose to take |
| 8 | $80 | $160 | A game that outgrew the plan |

The last row is where amateurs prove they like the feeling of a correct take more than they like their week. Passing is a legal move. It is often the money move when the bankroll rule is the real rule.`,
    },
    {
      id: "sites-and-fees",
      title: "What to read on a site before you care about the rating",
      body: `A rating is a matchmaking tool. It is not a cashier. Read the cashier first.

The match screen should show the base stake, the fee if any, whether gammons count, the clock, and the maximum the cube can reach if the site caps it. Some rooms cap the cube to protect bankrolls. A cap changes strategy and changes the worst loss. Know the cap before you criticize someone’s timid double.

Suppose a room charges each player $25 to sit a match, locks both amounts, and shows the winner receiving $45. The gap is $5 on a $50 pool in this illustration only. Your profit on a win is $20. You must win more than 25 of every 45 matches at that price to clear the fee, before you even talk about variance from gammons inside the match scoring. If the site instead takes a percent of each settled game, the math moves, and you need that percent from the screen, not from this paragraph.

[House edge](/guides/house-edge) is the wrong metaphor for a fair cube game between equals, and the right metaphor for the fee. The fee is how the room gets paid when skill is real. A strong player who beats the field by less than the fee is a winner on the board and a loser in the account. Matchmaking that pairs similar ratings pushes results toward even, which makes a fat fee decisive.

History matters. An account with a rating and a trail of games is a better stranger than a blank account offering a high stake. Blank accounts can be new humans. They can be something else. This page will not invent a rate. It will say high stakes and empty histories do not belong in the same click.

[Fake casino sites](/guides/fake-casino-sites) is worth five minutes if the “backgammon club” found you in a message. Type the domain yourself. A cube game does not require you to install a random helper.`,
    },
    {
      id: "comparison",
      title: "Checker skill versus a pot with no moves",
      body: `Players leave a tough match and look for a faster dollar. The faster dollar is usually a different bet.

| | Money backgammon | Coinflip or Jackpot | Roulette |
| --- | --- | --- | --- |
| Stake can grow mid-game | Yes, if you take a double | No | No |
| Fee | Read the entry | 5% of the pot | 5% of the winning payout |
| What skill changes | Cube and checkers, over a sample | Nothing | Nothing |
| Worst surprise | A gammon on a high cube | The fee you ignored | The Green slot’s price |
| Audit | Record, clock, and the rules you wrote | [Fairness](/fairness) | The same seeds |

PVPspinArena balances are USD, funded by Bitcoin or by USDC or ETH on Base. Jackpot and Coinflip take 5% of the pot. There is no cube to turn 5% into 20% mid-round, because there is no mid-round decision. Roulette uses 16 Purple, 16 Silver, and 1 Green on a 33-slot wheel, paying 2x, 2x, and 14x, then 5% of the winning payout. Purple or Silver sits near a 7.88% edge after the fee. Slott takes 10%, or a bomb keeps both stakes. Those prices are posted. They are not a backgammon tax.

[Games that pay real money](/guides/games-that-pay-real-money) separates this skill match from chance pots. The [skill wagers topic](/guides/topics/skill-wagers) is the cluster. Other stake pages are [spades for money](/guides/spades-for-money), [gin rummy for money](/guides/gin-rummy-for-money), and [trivia for money](/guides/trivia-for-money). [Coinflip](/coinflip) is the place you go when you want the dice of a coin and you are willing to say so. Using it to fade a cubed loss is how two prices get paid on one bad evening.

Clock play is part of honesty. A player who stalls a clear loss, fishing for a disconnect ruling, is playing the rulebook against you. Prefer sites that flag the clock in the result. Prefer to resign clear losses yourself so the cube does not become a hostage.`,
    },
    {
      id: "matchmaking",
      title: "Matchmaking, clocks, and the sample a rating hides",
      body: `Similar ratings make fair games and small edges. That is what you want if you love the board. It is a problem if you needed a soft field to beat a fee. A site that keeps feeding you weaker players is either bad at matching or running a promotion. Do not build a self-image on those games.

Long matches reduce the dice. One game to a cube of 8 is a lottery with skill at the edges. A match to 7 or 11 lets cube errors compound. Compare results inside one format.

Cheating online is usually a move generator or a second account. You will not prove it from one efficient cube. The practical response matches any unlabeled opponent: lower the stake, use the fair-play tools the site actually offers, and leave rooms that shrug. [Play chess for money](/guides/play-chess-for-money) has the same engine problem. The defensive habits transfer. The cube does not.

Disconnects during a double need a specific rule. A drop after you offer a double, before the take or pass, is an argument factory. Read that rule on a calm day.`,
    },
    {
      id: "checklist",
      title: "Checklist before the cube is in reach",
      body: `Say the list. Then play.

- Base stake is a number you can lose several times, because gammons exist.
- Gammon and backgammon are on or off, in writing.
- Cube cap, if any, is visible.
- Both players can cover the cap, or the site escrows it.
- Any platform fee was subtracted on the screen before the first roll.
- Clock and resign rules are visible.
- Opponent history exists, or the stake is a probe.
- You are not moving up in stake to win back a pass you regret.
- The room was opened by you, not by a link in a message.
- You know whether this is one game or a match.

Eighteen plus. Backgammon is absorbing, which is why sessions outlive budgets. A stop rule belongs next to the base stake: a number of matches, or a loss of a set amount, after which the board closes. [Responsible gambling](/responsible-gambling) is the longer version of that sentence.

If the checklist feels like paperwork, you are about to skip the only part of backgammon for money that is not on the strategy page. The checkers reward study. The cube rewards the person who can pass. [How it works](/how-it-works) will not teach the pass. It will show you a 5% pot fee on a game with no pass to make, which is a useful contrast on a night when you are too tilted to cube well.

Leave the base stake alone when you cannot describe the gammon price without looking embarrassed. Embarrassment is information. The cube will charge you for ignoring it.`,
    },
  ],
  faqs: [
    {
      q: "How does the doubling cube change the money?",
      a: "Each accepted double multiplies the base stake. A pass pays the current amount and ends the game. Gammons can multiply again if your rules include them. The sticker price is the floor, not the ceiling.",
    },
    {
      q: "What should I look for on a backgammon site?",
      a: "A visible base stake, a visible fee, gammon rules, a clock, and enough escrow for a high cube. Ratings are secondary. Read the entry rather than a published rake from an article.",
    },
    {
      q: "Can I beat the rake with better cube play?",
      a: "Better play can clear a small fee over a long sample against people you actually face. It does not clear a fee larger than your edge, and this page will not quote an edge percent for you.",
    },
    {
      q: "Are online opponents bots?",
      a: "Some accounts may use move generators. This page has no measured rate. Prefer trails, fair-play tools, and small stakes against empty profiles.",
    },
    {
      q: "Does a coinflip use a doubling cube?",
      a: "No. Coinflip and Jackpot take 5% of the pot and end. Roulette charges 5% of the winning payout on a 33-slot wheel. There is nothing to double.",
    },
  ],
  sources: [
    { label: "Backgammon (Wikipedia)", url: "https://en.wikipedia.org/wiki/Backgammon" },
    { label: "Doubling cube (Wikipedia)", url: "https://en.wikipedia.org/wiki/Doubling_cube" },
  ],
  related: [
    "spades-for-money",
    "gin-rummy-for-money",
    "trivia-for-money",
    "backgammon-rules",
  ],
  updated: "2026-10-07",
};
