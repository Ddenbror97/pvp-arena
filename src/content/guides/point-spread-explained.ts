import type { Guide } from "./types";

export const guide: Guide = {
  slug: "point-spread-explained",
  cluster: "Sports betting",
  keyword: "what does spread mean in sports betting",
  secondary: ["point spread", "against the spread", "ATS betting", "what is a spread in betting"],
  title: "Point Spread Explained: The Line and the Juice",
  description:
    "What does spread mean in sports betting? The point spread is a handicap plus juice. This page shows how -3.5 works, when a game pushes, and a worked $20 slip.",
  h1: "What does spread mean in sports betting? A handicap plus juice",
  answer:
    "What does spread mean in sports betting? The point spread is a handicap the book adds so both sides can be priced near even money. The favorite must win by more than the number. The underdog can lose by less than the number — or win outright — and still cash. Juice still sits on both sides. PVPspinArena is not a sportsbook and does not post lines.",
  facts: [
    "A spread is a handicap, not a prediction you are owed and not a PvP head start.",
    "Favorite −3.5 must win by 4 or more. Underdog +3.5 cashes on a loss by 1–3 or any win.",
    "A whole number can push: the stake is usually refunded if the margin matches the spread exactly.",
    "Standard juice is often −110 on both sides, so you must win more than 52.38% of ATS bets to break even.",
    "PVPspinArena does not take spreads. It runs hashed Jackpot, Coinflip and Roulette only.",
  ],
  sections: [
    {
      id: "meaning",
      title: "What a point spread is",
      body: `A point spread is how a book turns a mismatch into two tickets people will actually take. Instead of making you lay a huge moneyline on a heavy favorite, the book says: this side must win by more than X. The other side gets X points. That X is the spread.

This [sports betting topic](/guides/topics/sports-betting) page is for adults 18+. It is not a pick sheet. Every number below is a teaching illustration. Read [what is sports betting](/guides/what-is-sports-betting) if you still need the menu.

“Against the spread” (ATS) is the usual phrase for whether a side covered. Covering is not the same as winning the game. A favorite can win the game and lose the bet. An underdog can lose the game and win the bet.

The spread is not a moral score of which team is better. It is a number the book is willing to take action on, then move. [How sports betting works](/guides/how-does-sports-betting-work) is the machinery behind that move.

Key numbers in some sports — 3 and 7 in American football, 1 in baseball’s run line — are not magic. They are margins that happen often enough that a half point around them changes a lot of tickets. Paying extra juice to “buy” from −3 to −2.5 can be rational. Doing it every week because a graphic said “key number” is how you donate a second fee.`,
    },
    {
      id: "read",
      title: "How to read −3.5 and +3.5",
      body: `Minus means favorite. Plus means underdog. The number is the handicap.

**Illustration (not a pick):** Home −3.5, Away +3.5.

- Home covers only if Home wins by 4 or more.
- Away covers if Away wins, or if Away loses by 1, 2 or 3.
- A 3-point Home win: Away cashes. Home does not.
- A 4-point Home win: Home cashes. Away does not.

Half points exist so the margin cannot land exactly on the number. Whole numbers allow a push.

**Illustration (not a pick):** Home −3, Away +3, final Home by 3.

- Both ATS tickets typically push. Stakes come back. No juice collected on those tickets.
- That is why books like 3 and 7 in football: those margins happen, and half points around them change a lot of tickets.

Alternate spreads are the same idea at a different X, with a different price. A steeper favorite (−7.5 instead of −3.5) should pay more on the underdog and ask more juice or a worse number on the favorite. Convert before you admire the “hook.”

Teasers ask you to move multiple spreads in your favour and take a posted teaser price. That is a packaged product with its own hold, not a clever way to “fix” 3 and 7. If you cannot write the teaser’s implied chance, you bought a bundle. This page stays on a single spread so the handicap is visible.`,
    },
    {
      id: "juice",
      title: "Juice on the spread — an illustration",
      body: `The handicap is not the only number. The price next to it is usually −110/−110 or something close. That is the vig.

**Illustration (not a pick):** both sides −110 at 3.5.

| Side | Spread | American | Implied | $22 risked wins |
| --- | --- | --- | --- | --- |
| Home | −3.5 | −110 | 52.38% | $20 |
| Away | +3.5 | −110 | 52.38% | $20 |
| Sum | — | — | 104.76% | — |

You must win more than 52.38% of these ATS bets to break even. “I cover about half the time” is a losing process at −110. The [implied probability](/guides/implied-probability) page is the conversion. The [house edge](/guides/house-edge) page is the casino cousin.

Sometimes one side is −115 and the other is −105. That is the book shading juice instead of moving the 3.5. It is still a fee. Use the [odds converter](/guides/odds-converter) and add the implied chances. If the sum is 104% or 106%, you have found the hold.

A second juice illustration: you take Home −3.5 at −120 because the other book’s −110 is on an app you did not fund. Implied on −120 is 54.55%. Your break-even ATS rate just rose. The 3.5 did not change. The fee did. What does spread mean in sports betting includes that second number. The handicap without the juice is only half the ticket.`,
    },
    {
      id: "push",
      title: "Pushes, hooks and alt lines",
      body: `A **push** on a whole-number spread refunds the stake on most US books. You did not beat the juice. You also did not pay it on that ticket. People who say “I almost covered” after a push are describing a refund, not a near-win that is owed to them.

A **hook** is the .5. It kills the push. That is why −2.5 versus −3 is a real price difference in football, not a rounding error.

**Alt lines** let you buy a friendlier handicap at a worse price, or a tougher handicap at a better price. That trade can be rational if you know what you bought. It is a common way to overpay juice without noticing. Write both the X and the American number. If you only remember the X, you bought a slogan.

Live spreads re-quote as the score changes. That is a new offer, not a correction of the pre-game juice. [How to bet on sports](/guides/how-to-bet-on-sports) still wants one sentence: “Away +3.5 must not lose by 4 or more.”

Buying points after a bad first quarter is the most expensive hobby version of an alt line. The live X already moved. The juice is often worse. You are not “getting the hook you deserved.” You are taking a new contract because the old one is losing.

Buying a different number than the main line is [alternate lines](/guides/alternate-lines). Moving the number and taking a shorter price on purpose is a [teaser bet](/guides/teaser-bet).`,
    },
    {
      id: "vs-ml",
      title: "Spread versus moneyline",
      body: `A [moneyline](/guides/moneyline-betting-explained) asks who wins. A spread asks who covers a handicap. They are not the same bet with extra decoration.

When people pick a spread instead of a moneyline:

- The favorite’s moneyline is too short (say −280) and they want a nearer even-money ticket, accepting that a 1-point win loses the spread.
- The underdog’s moneyline is a long plus, and they would rather take points at −110 than need the outright.

When people pick a moneyline instead of a spread:

- They think the favorite wins ugly, by 1 or 2, and they do not want the handicap.
- They think the underdog wins outright and they want the plus-money, not +3.5 at −110.

Neither choice is “more correct.” Each is a different listed result. [Over/under](/guides/over-under-betting) is a third listed result: the total, not the winner.

A parlay that stacks a spread and a moneyline on the same game is often highly correlated. The [parlay](/guides/parlay-betting-explained) page is where that juice compounds.`,
    },
    {
      id: "worked",
      title: "Worked $20 illustration",
      body: `**Illustration (not a pick):** you stake $20 on Away +3.5 at −110. The book requires about $22 to win $20 at true −110; some slips let you enter $20 to win $18.18. Know which box you typed.

Assume the slip is $20 to win $18.18 (common when you fill the stake box).

| Final margin | Away result ATS | Your $20 slip |
| --- | --- | --- |
| Away wins by any | Cover | +$18.18 (return $38.18) |
| Away loses by 1–3 | Cover | +$18.18 |
| Away loses by 4+ | No cover | −$20 |
| Away loses by 3 on a −3 / +3 line | Push | $20 back |

If you instead laid Home −3.5 at the same juice, the first two rows flip. That is the whole product: two sides of one handicap, both juiced.

Do not “confirm” the illustration on a hashed [Coinflip](/coinflip). A flip has no handicap. A 3.5 is not a seed.

A second cash walk-through: $50 on Home −7 at −110, final Home by 7. Push. You get $50 back. You did not “almost win $45.” You had a refund. People who treat pushes as moral victories start the next ticket tilted. A push is a scratch. Log it as a scratch.`,
    },
    {
      id: "not-pvp",
      title: "A spread is not a PvP handicap",
      body: `PVPspinArena does not post −3.5 on a team. Jackpot shares are pot fractions. Roulette slots are a counted wheel. There is no “give the underdog 3.5 points” button on [Roulette](/roulette).

If you lost a spread and want a different product, name it honestly. A 2x colour is a house paytable with about a 7.88% Purple or Silver edge after the win fee on this site, not an ATS hedge. [Fairness](/fairness) will verify a reveal. It will not verify a late flag that added a point.

What does spread mean in sports betting, on this domain: a vocabulary lesson so you can read a book. Not a line we will take.

If you only remember one pair of numbers, remember −3.5 and −110. The first is the handicap. The second is the fee. People who quote only the first are describing a football graphic, not a ticket.

A last ATS log habit: write cover / no-cover / push in one column and beat-the-close / not in another. A week of covers on soft numbers is not a winning process. A week of no-covers on numbers you beat can still be the better process. Trophies lie. The two columns do not.

If you only bet spreads for a month, your log should show X, juice, cover, and close. Missing any one of those four is how a “good ATS week” becomes a story you cannot audit. What does spread mean in sports betting includes the audit, not just the hook.`,
    },
    {
      id: "stop",
      title: "If covering is already a chase",
      body: `Live spreads after a bad first half are how a $20 illustration becomes a $200 night. If you are buying hooks to erase an earlier ticket, you are not pricing X. You are bargaining with a scoreboard.

Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). Use the [responsible gambling](/responsible-gambling) page if you need a helpline tonight.

A spread is a handicap plus juice. If that sentence is clear and you still cannot put the phone down, the next skill is stopping, not finding a better hook.

Live hooks after a bad first half are still juice. Buying from +2.5 to +3.5 because “now I have the key number” is a new contract at a new price. Convert it or skip it.

The same handicap shows up on the two biggest American menus. [NFL betting](/guides/nfl-betting) and [NBA betting](/guides/nba-betting) are mostly spreads and totals, each with the book's margin still inside the number.`,
    },
  ],
  faqs: [
    {
      q: "What does spread mean in sports betting?",
      a: "A point handicap plus a price. The favorite must win by more than the number; the underdog cashes if they win or lose by less than the number. Juice still applies.",
    },
    {
      q: "What happens if the game lands on the spread?",
      a: "On a whole number, most US books push and refund the stake. A half-point hook prevents that push.",
    },
    {
      q: "Is −3.5 the same as −3?",
      a: "No. −3 can push if the favorite wins by exactly 3. −3.5 cannot push; the favorite must win by 4 or more.",
    },
    {
      q: "Why is spread juice often −110?",
      a: "It is the conventional two-way vig. Each side implies about 52.38%, so a .500 ATS record loses money.",
    },
    {
      q: "Can I bet a spread on PVPspinArena?",
      a: "No. This site is not a sportsbook and does not post team lines.",
    },
    {
      q: "What does ATS mean?",
      a: "Against the spread: whether a side covered the handicap, not whether it won the game. A favorite can win the game and lose ATS.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Point spread",
      url: "https://en.wikipedia.org/wiki/Spread_betting#Sports",
    },
    {
      label: "Wikipedia: Mathematics of bookmaking",
      url: "https://en.wikipedia.org/wiki/Mathematics_of_bookmaking",
    },
    { label: "UK Gambling Commission", url: "https://www.gamblingcommission.gov.uk/" },
  ],
  related: [
    "what-is-sports-betting",
    "moneyline-betting-explained",
    "over-under-betting",
    "how-does-sports-betting-work",
    "implied-probability",
    "odds-converter",
  ],
  updated: "2026-09-26",
};
