import type { Guide } from "./types";

export const guide: Guide = {
  slug: "check-raise-poker",
  cluster: "Poker",
  keyword: "check raise",
  secondary: ["check then raise", "pot odds", "limit lowball exception"],
  title: "Check Raise: The Line, the Price, a Dollar Pot",
  description:
    "A check raise is a check, then a raise after a bet. This note prices one dollar line and cites where the raise is allowed. It does not promise the pot.",
  h1: "A check raise is a check, then a raise after someone bets",
  answer:
    "A check raise is a check, then a raise after someone bets. Robert's Rules of Poker, version 11, permits that line except in certain lowball forms. Limit ace-to-five does not permit it unless players are told it is allowed. A dollar pot below prices the call the bettor then faces. That price is not a promise the raise wins.",
  facts: [
    "Last tested 20 October 2026. Opened Robert's Rules of Poker version 11, the Poker Tournament Directors Association rules, and the National Council on Problem Gambling helpline page.",
    "Robert's Rules says a check raise is permitted in all games except certain forms of lowball.",
    "Limit ace-to-five does not permit the line unless players are alerted. Deuce-to-seven text allows it after the draw. No-limit and pot-limit lowball allow it.",
    "TDA rule 57 says a player who says check while facing a bet may call or fold, and may not raise. The check has to come when no bet is facing you.",
    "TDA rule 50 prints no cap on the number of raises in no-limit or pot-limit. A dollar price below is arithmetic, not a chart from either sheet.",
    "We did not sit a hand. The line is not a promise of profit.",
  ],
  sections: [
    {
      id: "permit",
      title: "Where a check raise is permitted",
      body: `Robert's Rules of Poker, version 11, at homepokertourney.org, puts the permission in the betting section. The line is allowed in all games except certain forms of lowball.

The order is the whole definition. You check when nobody has bet on that street, someone else bets, and then you raise.

If you never checked, the raise is just a raise. That full order is the check raise.

Saying the words in the wrong spot is a different rule. TDA rule 57 says that if you face no bet and declare raise, you must make at least a minimum bet. If you declare check while a bet is facing you, you may call or fold, and you cannot raise.

The [Poker](/guides/topics/poker) hub holds the street notes. [A weak-hand bet](/guides/bluffing-in-poker) can be the bet you are raising, or it can be your raise. The sheets we opened do not sort the motives.

[Leading into the prior aggressor](/guides/donk-bet-poker) is the other order: a bet with no check first. Do not use one name for both lines.`,
    },
    {
      id: "lowball",
      title: "The lowball forms that block the line",
      body: `Limit ace-to-five is the clear block. Robert's Rules says check-raise, in that section's hyphenated spelling, is not permitted in limit play unless the players are alerted that it is allowed.

Deuce-to-seven keeps the ace-to-five rules except where the text lists differences. One difference says the line is allowed on any hand after the draw.

The sentence we read names the after-draw case and does not add a separate before-the-draw permission. Unless a house card says otherwise, that before-draw cell stays the ace-to-five rule, and a check raise there is a rules question rather than a default.

No-limit and pot-limit lowball say the line is allowed. Draw high says it is permitted both before and after the draw. Those sentences are on the same version 11 page.

If your card is silent, do not invent an alert you did not hear. Ask. A home game that grew up banning the line is describing a house card, not the version 11 default.`,
    },
    {
      id: "dollars",
      title: "Building the raise in dollars",
      body: `These pictures price one street. They do not pay a session.

Example 1: the pot is $40, you check, and an opponent bets $20. You raise to $60 total, which puts $60 of yours into the pot.

If they fold, the $120 comes back to you, and $60 of it is the raise you just posted, so the new money from them is their $20.

Example 2: they call the $40 more, and the pot becomes $160. They risked $40 to contest $160, which is 40 divided by 160, or 25%.

That 25% is the immediate price if the street ended there. Later streets can add bets the percentage does not include.

Example 3: two $50 Coinflip stakes on this site make a $100 pot, the fee is $5, and the winner receives $95. There is no check and no raise in that game. We did not time a cash-out.

A fold in Example 1 can be followed by three failed lines and still lose the hour. Neither sheet prints a recovery rate.`,
    },
    {
      id: "odds",
      title: "Pot odds on the call that follows",
      body: `The bettor who faces the raise is the one looking at the 25% price in Example 2. They already have $20 in, the extra chips to continue are $40, and the pot before that extra $40 is $120.

Call amount divided by the pot after the call is the fraction. 40 divided by 160 is 0.25. Risk divided by the pot they would win if the hand ended is $40 to $120, which is the same 1 to 3, and the same 25%.

That figure ignores cards still to come and bets still to be made. It is not a hand reading. It does not say the caller is ahead, and it does not say the raiser is ahead.

TDA rule 45 says a raise must be at least the largest prior full bet or raise of the current round. In the example the opening bet is $20, so a legal raise adds at least $20 more beyond a call.

The raise to $60 adds $40 beyond the $20 call, which clears that minimum. A room can set a larger minimum, and if it does not print one, the larger minimum is not published.

The fraction above is the price next to a check raise. It is not a win rate from either sheet.

[Equilibrium study](/guides/gto-poker-strategy) can price a line with ranges. This page does not. The 25% is chips, not a solver output.`,
    },
    {
      id: "caps",
      title: "Limit caps that no-limit does not use",
      body: `Robert's Rules says no-limit and pot-limit allow unlimited raising. In limit poker, a pot with three or more players who are not all-in has a cap.

A game with three or more betting rounds allows a bet and three raises. A game with two betting rounds, such as draw, allows a bet and four raises. Heads-up play allows unlimited raising except in tournaments, and a cap that was already reached does not come off because a third player folded.

TDA rule 50 matches the no-limit and pot-limit side: no cap on the number of raises. In limit, the house limit applies even heads-up until the event is down to two players.

A check raise in a limit game still has to fit that cap. If the round is already at the last allowed raise, the sheets do not let you add another one because the play felt strong. The action left is call or fold, under the cap you are actually using.

[The two-card street order](/guides/texas-holdem-rules) has four betting rounds, so the three-raise limit sentence is the one Robert's Rules points at for a full hold'em hand. Confirm the card before you count.`,
    },
    {
      id: "compare",
      title: "A player pot beside a house game",
      body: `The line is a sequence between players. Neither sheet prints a house percentage for it.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
| --- | --- | --- | --- | --- | --- |
| This line | not published | other players | not published | not published | not published |
| House-banked casino | not published | the house | not published | not published | not published |
| PVPspinArena | Coinflip and Jackpot take 5% of the pot | other players | balance updates when the round settles | yes, where a seed is committed before the round | Coinflip minimum is $1 |

How PvP compares: [Poker](/poker) on this site is a table against other players. [Fairness](/fairness) recomputes a settled round that publishes a seed. That check does not decide whether a limit lowball game alerted the table, and it does not price the 25% call.

| Rule we opened | What it says about the line |
| --- | --- |
| Robert's Rules, betting section | permitted except certain lowball |
| Limit ace-to-five | not permitted unless players are alerted |
| Deuce-to-seven difference list | allowed after the draw |
| No-limit and pot-limit lowball | allowed |
| Draw high | permitted before and after the draw |
| TDA rule 57 | saying check while facing a bet blocks a raise |
| TDA rule 50 | no cap on raise count in no-limit or pot-limit |
| Win rate | not published |

[Keeping a stack of buy-ins](/guides/poker-bankroll-management) is a separate choice from this street. [Numbers on a screen](/guides/poker-hud) do not make the line profitable.`,
    },
    {
      id: "list",
      title: "A list before you check with a plan to raise",
      body: `Say the sequence before the chips move.

- [ ] Check only when no bet is facing you.
- [ ] If a bet is facing you and you say check, TDA rule 57 blocks the raise.
- [ ] Name the game. Limit ace-to-five needs an alert.
- [ ] In limit, count the raises already made against the cap.
- [ ] Make the raise at least the size of the prior full bet, under TDA rule 45.
- [ ] Price the call the other player will face, in dollars, before you raise.
- [ ] Treat 25% in the example as this pot only, not as a win rate.
- [ ] Do not use the line to get even.
- [ ] Keep a loss stop that survives a failed raise.
- [ ] If the session is a chase, call 1-800-GAMBLER.

The helpline page prints 1-800-MY-RESET and says that line is not a crisis service. A crisis is 911 or 988.`,
    },
    {
      id: "stop",
      title: "Who should not use the line to get even",
      body: `Do not play if you are under 18, or under a higher local age. Do not play where the game is illegal. Do not stake rent or money with a due date.

A raise after a check can take the pot, and it can lose a larger pot than a check-fold would have lost. The sheets permit the sequence in most games. They do not promise the result.

This page is an editorial note. We did not open a card-room account.

Cash-out minimum on this site is $20 in BTC, USDC, or ETH. If the hour stops being optional, call 1-800-GAMBLER and open [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "What is the sequence?",
      a: "A check raise is a check when no bet is facing you, followed by a raise after someone else bets. Robert's Rules of Poker version 11 permits that sequence in all games except certain lowball forms. If you say check while a bet is already facing you, TDA rule 57 says you may call or fold and you may not raise. The sheets do not call the sequence a winning plan.",
    },
    {
      q: "Where is the line blocked?",
      a: "Limit ace-to-five blocks a check raise unless players are alerted that it is allowed. Deuce-to-seven, on the difference list, allows the line after the draw. The before-draw cell is not given its own permission in the sentences we read. No-limit and pot-limit lowball allow it, and draw high allows it before and after the draw. If the house card is silent, ask before you use the line. Do not invent an alert.",
    },
    {
      q: "What does the dollar example price?",
      a: "In the picture, a $40 pot meets a $20 bet and a check raise to $60. If the bettor calls $40 more, the pot is $160, and $40 of $160 is 25%. That is the immediate price of the call if the street ended. It ignores later bets. It is not a promise that either player is ahead, and neither rule sheet prints a profit for the sequence. One fold does not describe the hour.",
    },
    {
      q: "Is there a cap on raises?",
      a: "In no-limit and pot-limit, Robert's Rules and TDA rule 50 both say there is no cap on the number of raises. In limit, Robert's Rules allows a bet and three raises when the game has three or more betting rounds, and a bet and four raises when it has two. Tournament limit keeps a house cap even heads-up until two players remain, on the TDA wording. A sequence that arrives after the cap is not given an extra raise.",
    },
    {
      q: "Who should not play the line for money?",
      a: "Anyone under 18, anyone under a higher local age, and anyone playing where the game is illegal. Anyone staking rent or money with a due date should leave. Anyone using the sequence to get even is chasing, and the rules do not store a debt the next street must repay. Call 1-800-GAMBLER if the session is no longer optional. The helpline page also prints 1-800-MY-RESET and says it is not a crisis line.",
    },
    {
      q: "How is a player pot different?",
      a: "The sequence is a rule between players, and the sheets print no fee for it. On this site Coinflip takes 5% of the pot, so two $50 stakes pay the winner $95. Fairness recomputes a settled round that publishes a seed. That check does not decide a lowball alert, and it does not turn a 25% price into a forecast. We did not sit a hand and we did not time a cash-out.",
    },
  ],
  sources: [
    {
      label: "Robert's Rules of Poker, version 11",
      url: "https://homepokertourney.org/roberts-rules-of-poker.htm",
    },
    {
      label: "Poker Tournament Directors Association rules",
      url: "https://www.pokertda.com/view-poker-tda-rules/",
    },
    {
      label: "National Council on Problem Gambling helpline",
      url: "https://www.ncpgambling.org/help-treatment/about-the-national-problem-gambling-helpline/",
    },
  ],
  related: [
    "bluffing-in-poker",
    "gto-poker-strategy",
    "texas-holdem-rules",
    "donk-bet-poker",
    "cash-game-poker",
    "poker-bankroll-management",
  ],
  updated: "2026-10-20",
};
