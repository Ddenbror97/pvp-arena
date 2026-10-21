import type { Guide } from "./types";

export const guide: Guide = {
  slug: "poker-hud",
  cluster: "Poker",
  keyword: "poker hud",
  secondary: ["heads-up display stats", "sample size", "own-hand statistics"],
  title: "Poker HUD Numbers Are Not a 30-Hand Tell",
  description:
    "A poker HUD shows counts from hands you played. Thirty hands is a small sample. The live tools page did not load, so a current allow-list is not published.",
  h1: "A poker HUD counts hands you already played, not the next card",
  answer:
    "A poker HUD is a heads-up display of counts from hands a player has already seen, such as how often someone entered a pot or raised. It cannot see the next card. Thirty hands is a thin sample, and the arithmetic below shows the swing. The live tools page did not load, so a current allow-list is not published.",
  facts: [
    "Last tested 20 October 2026. The live PokerStars tools URL returned a FanDuel homepage. We then opened the Internet Archive capture of that policy dated 26 December 2024, plus the National Council on Problem Gambling helpline page.",
    "That capture describes a poker HUD style of in-game numerical stats, limited to information from your own play, and it does not print a sample-size minimum.",
    "Real-time advice that reads the current hand and tells you the action is prohibited at all times on that capture. This note does not name a product and does not give install steps.",
    "Product names on the permitted and prohibited lists did not come through as text. Those names are not published here.",
    "A 30-hand rate can sit far from a long-run rate by ordinary swing. The arithmetic is ours, not a line on the capture.",
    "We did not open an account, install software, or time a cash-out.",
  ],
  sections: [
    {
      id: "counts",
      title: "What a poker HUD is allowed to count",
      body: `The capture we could read is web.archive.org's 26 December 2024 copy of pokerstars.com/poker/room/prohibited. The live URL did not serve that text on this test.

The capture sorts tools into three groups: permitted at all times, prohibited at all times, and permitted only while the poker software is closed. A book and a lot of play sit on the allowed side of that capture's own introduction.

Permitted items include a report of basic game state, such as pot odds or absolute hand strength. They include a static chart of starting hands for unopened pots. They include numerical stats shown during play, built only from hands you accumulated yourself.

The same paragraph limits those stats: they may not be split by card values, and they may not change automatically because the game state or an opponent's tendency changed. A hotkey may fire a decision you already made, such as a half-pot bet.

A hotkey that picks a random size between half and three quarters of the pot is prohibited. The player, not the macro, chooses the size.

The [Poker](/guides/topics/poker) hub is the cluster for this note. [Solver study away from the table](/guides/gto-poker-strategy) is a different activity from a number painted on a felt.`,
    },
    {
      id: "own",
      title: "Your own hands, not a shared database",
      body: `The capture says a database of many players, shared so you can look up someone you have never played, is an unfair advantage. Datamining, which means watching games you are not in so you can store the hands, is prohibited at all times.

Mass sharing of hands, private results, or playing statistics in order to analyze opponents is in the same prohibited list. Sharing hole cards is prohibited. Hosting a live stream is called out as not the same thing as sharing hole cards.

A display that only replays counts from hands you actually played is the narrow permission. It is still not a person, and it is still only a fraction.

Players often call that narrow panel a poker HUD. The capture itself does not require the label.

[Playing a single opponent](/guides/heads-up-poker-strategy) makes each hand a large share of a small sample. The capture does not print a heads-up exception. [A private-club app note](/guides/pppoker-review) and [a crypto card-room note](/guides/coinpoker-review) are other rooms. Their tool rules are not this capture.`,
    },
    {
      id: "thirty",
      title: "Why thirty hands is a noisy fraction",
      body: `Suppose a player truly enters 20% of hands over a long run. In 30 hands the expected count is 6. The usual swing is the square root of 30 times 0.2 times 0.8, which is the square root of 4.8, about 2.19 hands.

Nine hands out of 30 is 30%, which is 3 hands above 6, or about 1.4 of those swings. It is ordinary noise, not a new personality.

Over 300 hands the same 20% expects 60 hands. The swing is the square root of 48, about 6.9 hands, or about 2.3 percentage points. Closer, and still not the next card.

A poker HUD that prints 30% after 30 hands is reporting a short window. The capture prints no minimum sample, so a cutoff of 30, or of 300, is not a room rule. It is arithmetic on this page, and it is not a tell you can trust.

[A lead into last street's bettor](/guides/donk-bet-poker) can show up twice in a short window and look like a habit. Two bets are not a rate.`,
    },
    {
      id: "advice",
      title: "Real-time advice is a different tool",
      body: `The capture calls a tool that tells you the action, by reading the current game, cheating. It puts that tool in the prohibited-at-all-times group, next to a program that plays with no human decision.

A human must choose the action and the exact relative size of any bet or raise. Auto-folders are prohibited. Tools that delay a decision by a fixed or random time are prohibited.

Programs that compute range-versus-range equity, ICM, or Nash equilibrium are in the group you must not run while the client is open. A large set of advice tables, beyond a basic open-or-fold chart, is in that same group. The capture does not print a price for any of them.

This page does not tell you how to install a display, a chart, or a banned tool. It does not name a cracked copy, and product names on the lists did not render as text, so they stay unpublished.

A poker HUD in the narrow sense above is not the real-time advisor the capture bans. This page still gives no steps for either one.`,
    },
    {
      id: "live",
      title: "The live policy page did not open",
      body: `On this test, pokerstars.com/poker/room/prohibited returned the FanDuel homepage. A 20 October 2026 allow-list is therefore not published from the live URL.

The archive footer prints TSG Interactive Gaming Europe Limited, Malta registration C54266, and licence MGA/B2C/213/2011 awarded on 1 August 2018. That footer is the December 2024 capture. It is not a fresh reading of a live certificate, because the live URL did not serve the policy.

The capture says the operator may look for prohibited tools running on a computer and may study play. It also says staff do not read browsing history or private files.

Funds may be withheld for bots, for repeating a warning, for bypassing detection, or for privately developed software that breaks the policy. We did not test that enforcement.

| What the December 2024 capture prints | Status in this note |
| --- | --- |
| Numerical stats from your own play | generally permitted, with the limits above |
| Real-time action advice | prohibited at all times |
| Shared opponent databases and datamining | prohibited at all times |
| Range, ICM, or Nash tools while the client is open | prohibited during play |
| Product names on the lists | not published, the names did not render |
| A required sample size | not published |
| Live 2026 wording of the same URL | not published, the page did not load |`,
    },
    {
      id: "dollars",
      title: "Dollar results a panel can misread",
      body: `A sum of money on a panel is a total of pots, not a salary.

Example 1: the panel says a player won $40 across 30 hands. One pot can be the whole $40. The next hand is not worth $40, and the panel does not owe a repeat.

Example 2: nine entries in 30 hands is 30%, next to a long-run 20% that expects six entries. The extra three hands are inside the swing worked out above. Paying them off as if they were a stable tell is a choice, not a calculation the capture printed.

Example 3: two $50 Coinflip stakes on this site make a $100 pot, the fee is $5, and the winner receives $95. We did not time a cash-out, and a poker HUD is not part of that coin game.`,
    },
    {
      id: "compare",
      title: "A screen of stats beside a player pot",
      body: `The capture prices no hand. It sorts software. A casino edge is not on it.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
| --- | --- | --- | --- | --- | --- |
| A stats display | not a bet | depends on the room's own rule | not published | not published | not published |
| House-banked casino | not published | the house | not published | not published | not published |
| PVPspinArena | Coinflip and Jackpot take 5% of the pot | other players | balance updates when the round settles | yes, where a seed is committed before the round | Coinflip minimum is $1 |

How PvP compares: [Poker](/poker) here is a table against other players, and this note does not add a stats panel to it. [Fairness](/fairness) recomputes a settled round that publishes a seed. That check does not audit a third-party display, and it does not read a 30-hand sample.

Slott takes 10% of a winning pot. Purple and Silver roulette keep about a 7.88% edge after the 5% win fee. Neither number comes from a heads-up display.`,
    },
    {
      id: "list",
      title: "A list before you trust a percentage",
      body: `Use the list before you change a bet because of a panel.

- [ ] Count the hands in the window before you read the percent.
- [ ] Treat 30 hands as a noisy fraction, not as a person.
- [ ] Keep stats inside hands you actually played, on the capture's rule.
- [ ] Do not use a shared database of strangers. The capture prohibits that.
- [ ] Do not run a tool that picks the action for you.
- [ ] Do not install anything from this page. It has no steps.
- [ ] Leave product names unpublished when the list did not render.
- [ ] Remember the live URL did not load, so the 2026 wording is not published.
- [ ] Set a loss stop that does not depend on a panel.
- [ ] If the panel becomes a chase, call 1-800-GAMBLER.

The helpline page prints 1-800-MY-RESET and says that line is not a crisis service. A crisis is 911 or 988.`,
    },
    {
      id: "stop",
      title: "Who should not treat a panel as a plan",
      body: `Do not play if you are under 18, or under a higher local age. Do not play where the game is illegal. Do not stake rent or money with a due date.

A percentage is not a tell you can trust after a few dozen hands, and it is not money the next pot owes you. Chasing a number on a screen is the same chase as chasing a card.

This page is an editorial note. We did not open an account, and we did not run a detection check.

Cash-out minimum on this site is $20 in BTC, USDC, or ETH. If the session stops being optional, call 1-800-GAMBLER and open [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "What does the display show?",
      a: "A poker HUD, on the narrow reading of the December 2024 capture, shows numerical counts from hands you played yourself, plus basic figures such as pot odds or absolute hand strength. It may not split those counts by card value, and it may not swap the numbers automatically as the hand changes. It does not see the next card. Product names for software that does this did not render on the capture, so this note names none.",
    },
    {
      q: "Why is 30 hands not a tell?",
      a: "A poker HUD percent after 30 hands is a short window. If the long-run entry rate is 20%, thirty hands expect about six entries, with a usual swing of about 2.19 hands. Nine entries, which is 30%, sits about 1.4 swings above that center. That gap is ordinary noise. The capture prints no minimum sample, so neither 30 nor 300 is a room rule. The next hand is still unknown.",
    },
    {
      q: "What did the capture prohibit outright?",
      a: "Real-time advice that reads the hand and names the action, programs that play without a human choice, decision delays, hole-card sharing, datamining, and mass sharing of stats to study opponents. A poker HUD built from a database of strangers is outside the permission the capture describes. Range, ICM, and Nash tools are barred while the client is open. This page does not explain how to obtain any of those tools.",
    },
    {
      q: "Did the live tools page load?",
      a: "No. The live URL returned a FanDuel homepage, not the policy. The wording above is the 26 December 2024 archive capture, including a footer licence number that belongs to that capture. A current allow-list is not published. We did not open an account, and we did not test enforcement or a cash-out. If you need the rule in force today, open the room's own page yourself and read that copy.",
    },
    {
      q: "Who should ignore a panel?",
      a: "Anyone under 18, anyone under a higher local age, and anyone playing where the game is illegal. Anyone staking rent or money with a due date should stop. Anyone who needs a 30-hand percent to justify the next bet is chasing a sample, not reading a rule. Call 1-800-GAMBLER if the session is no longer optional. The helpline page also prints 1-800-MY-RESET and says it is not a crisis line.",
    },
    {
      q: "How does this differ from a priced player pot?",
      a: "A display does not set the fee. On this site Coinflip takes 5% of the pot, so two $50 stakes pay the winner $95. Fairness recomputes a settled round that publishes a seed, and that check does not audit third-party software. The archive capture sorts tools. It does not quote a rake for a heads-up display, and it does not promise that a percentage wins the next hand.",
    },
  ],
  sources: [
    {
      label: "Internet Archive capture, 26 December 2024, of the PokerStars prohibited-tools page",
      url: "https://web.archive.org/web/20241226192245/https://www.pokerstars.com/poker/room/prohibited/",
    },
    {
      label: "National Council on Problem Gambling helpline",
      url: "https://www.ncpgambling.org/help-treatment/about-the-national-problem-gambling-helpline/",
    },
  ],
  related: [
    "gto-poker-strategy",
    "heads-up-poker-strategy",
    "cash-game-poker",
    "donk-bet-poker",
    "pppoker-review",
    "coinpoker-review",
  ],
  updated: "2026-10-20",
};
