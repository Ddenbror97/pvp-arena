import type { Guide } from "./types";

export const guide: Guide = {
  slug: "come-bet-craps",
  cluster: "Casino games",
  keyword: "come bet craps",
  secondary: ["come bet versus pass line", "come odds", "craps come point"],
  title: "Come Bet Craps: Pass Line, Odds, and a Dollar Layout",
  description:
    "Come bet craps starts on the next roll, not the come-out. Odds can ride behind it, the Wizard page prints the price, and a dollar layout is not a promise.",
  h1: "Come bet craps: the next-roll contract, the odds chip, and a dollar layout",
  answer:
    "Come bet craps is a pass-line contract that starts on the next roll. The Wizard page opened on 20 October 2026 calls it the same as pass, at 1.41% on the flat chip. Odds behind it are marked at zero house edge. A dollar layout below is not a promise the point arrives.",
  facts: [
    "Last tested 20 October 2026 on the Wizard of Odds craps basics page at wizardofodds.com/games/craps/basics/.",
    "A come bet craps chip is the same contract as pass, begun on any roll that is not the come-out. The next roll is that chip's come-out.",
    "Pass, and therefore the come flat bet, is printed at 1.41% per bet made, 1.41% per bet resolved, and 0.42% per roll.",
    "Odds pay 2 to 1 on 4 and 10, 3 to 2 on 5 and 9, and 6 to 5 on 6 and 8. The page marks that chip at 0.00% house edge.",
    "On a come-out roll the page lists odds on come bets as OFF unless the player asks otherwise. A table minimum is not published on that page.",
    "PVPspinArena does not offer craps. Roulette is 33 slots, with about a 7.88% Purple or Silver edge after the 5% win fee.",
  ],
  sections: [
    {
      id: "contract",
      title: "What a come bet craps chip agrees to",
      body: `The Wizard page says a come bet is mathematically the same as a pass bet. The difference is when you may put it down. You place it on any roll except the come-out.

The roll that follows is the come-out for that chip alone. A 7 or 11 wins even money. A 2, 3, or 12 loses.

Any other total, 4, 5, 6, 8, 9, or 10, becomes that chip's point. The dealer moves the flat bet to that number. The chip then wins if the point repeats before a 7, and loses if the 7 comes first.

The dice did not change jobs. The contract is a sequence, and the sequence is a little worse than a coin at even money. That gap is the printed 1.41%.

This note sits with the [casino games topic](/guides/topics/casino-games). [Where the boxes sit on the felt](/guides/craps-table-layout) is the map. Adults 18+ only.

A come-out 7 that wins a new come chip is the same 7 that can take down come bets already sitting on points. The page does not treat that as a surprise. It is the layout.`,
    },
    {
      id: "pass",
      title: "The pass line starts on a different roll",
      body: `Pass is allowed on the come-out, when the puck says the shooter has no point. The page tells you not to place a pass bet after that roll. It says a late pass bet is allowed and is a poor price, because the value of the line is in the come-out.

Come is the way to start a fresh line contract while a point is already up. You can have the pass line working on the shooter's point and one or more come points at the same time.

That does not lower the 1.41% on each flat chip. It raises how many of those chips a single 7 can remove.

Don't come is the mirror. The page says it matches don't pass, placed any time except the come-out, and that you may lay odds if a point is rolled for it.

Don't-pass itself is a touch cheaper than pass on that page, about 0.05% lower, because of the way the 12 is handled on the dark side. The come family follows the same split. Read [which chips to skip](/guides/craps-strategy) before you add a center bet on top.

[The pair counts behind the line](/guides/craps-odds) are the 36-way table. This page stays on the come contract rather than repeating every proposition.`,
    },
    {
      id: "odds",
      title: "Odds behind the come chip",
      body: `After your come point is set, you may take odds. The Wizard page says the win and the multiple match pass-line odds.

A come bet craps odds chip pays 2 to 1 on 4 and 10, 3 to 2 on 5 and 9, and 6 to 5 on 6 and 8. The page's odds table is 0.00% per bet made, per bet resolved, and per roll.

The flat come chip in front of that odds chip still carries 1.41%. You cannot buy the zero-edge chip without a line or come bet under it. The package is a priced chip plus a fair chip, not a free game.

Many rooms use 3X-4X-5X odds: up to 3 times the flat bet on 4 or 10, 4 times on 5 or 9, and 5 times on 6 or 8. The page's combined table prints 0.00374 for that package, and the prose calls the same combined edge 0.374%.

On the come-out, the page lists odds on come bets as OFF unless you ask otherwise. A 7 then wins a new come flat bet and returns odds that were off.

If your come point hits on that roll while odds are off, the flat bet wins and the odds push. Leaving them off does not change the 0.00% mark.

[A screen table instead of a stick](/guides/online-craps) can hide that on/off switch inside a menu. Open the menu. If it does not say, the setting is not published for that install.`,
    },
    {
      id: "dollars",
      title: "A dollar layout on one come number",
      body: `No casino minimum is printed on the Wizard page. These pictures use $10 so the multiples are easy to see. They are not a session result.

Example 1 — the flat chip. A $10 come bet wins $10 on a come-out 7 or 11 for that chip, and loses $10 on 2, 3, or 12.

If the roll is a 6, the $10 moves to the 6. A 6 before a 7 pays $10 even money. A 7 first takes the $10.

Example 2 — odds on the 6. At 5 times odds the extra chip is $50, and 6 to 5 pays $60 profit if the 6 arrives first.

The $50 is the zero-edge chip on the page we opened. The $10 in front of it is not.

Example 3 — the printed average. One hundred resolved $10 come bets are $1,000 of flat action. At 1.41% the expected cost is $14.10.

That $14.10 is a long-run average. It is not your next hundred, and the odds dollars sit outside that 1.41% line.

The come bet craps layout in these pictures keeps the come-out. Skipping that roll is a different bet.`,
    },
    {
      id: "compare",
      title: "The felt beside a house pit and a player wheel",
      body: `Craps prices a sequence of dice. A player-pot game prices a stake against other people and a posted fee. The 1.41% does not move from one product to the other.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
| --- | --- | --- | --- | --- | --- |
| Come flat bet | 1.41% on the Wizard page. Odds chip 0.00% | The house | not published | not published | not published |
| House-banked casino | The same family of prices where the layout matches. A different felt is not published | The house | not published | not published | not published |
| PVPspinArena | Purple and Silver about 7.88% after the 5% win fee. No craps layout | Other players' pool is not this bet. Roulette settles each stake on its own | Balance updates when the round settles | yes, seed committed before the round | Shown on the bet control. Coinflip minimum is $1 |

How PvP compares: this site does not take come bets. [Roulette](/roulette) uses 33 slots, 16 Purple, 16 Silver, and 1 Green. Purple and Silver pay 2x, then 5% comes off the winning payout.

A $10 Purple win pays $20 before the fee. Five percent of $20 is $1, so the credit is $19.

Most Purple stakes lose the $10. The 7.88% figure is 16/33 times 1.90, minus 1. Do not paste 1.41% onto that wheel.

A settled round can be recomputed on the [fairness page](/fairness). The check matches this site's commit. It does not audit a craps layout.

Cash-out minimum is $20 in BTC, USDC, or ETH. We did not time one.

[What the table keeps over a long run](/guides/house-edge) is the same kind of subtraction as 1.41 cents per flat dollar.`,
    },
    {
      id: "put",
      title: "A late chip is not the same contract",
      body: `A put bet skips the come-out. You are then betting only that the number arrives before a 7, at even money on the flat chip.

| Chip | When it starts | Printed edge on the Wizard page |
| --- | --- | --- |
| Pass or come flat | Includes that chip's come-out | 1.41% |
| Odds behind it | After the point | 0.00% if the multiple is true |
| Put on 4 or 10 | Skips the come-out | 33.33% per bet resolved |
| Put on 5 or 9 | Skips the come-out | 20.00% per bet resolved |
| Put on 6 or 8 | Skips the come-out | 9.09% per bet resolved |

The come-out 7s and 11s are what made 1.41% possible. At ordinary 3X-4X-5X the page prefers a place or a buy over the put.

A come bet that still receives its own come-out is the cheaper flat chip. Say which chip you hold before you quote 1.41%.

[A rented pit table](/guides/casino-table-rental) does not rewrite this contract. Holding the dice for your party does not change the pairs.`,
    },
    {
      id: "checks",
      title: "Checks before the come chip leaves your rail",
      body: `Use the list on the layout you are touching. A familiar box name does not prove the Wizard multiples.

- [ ] Confirm you are 18, or older if local law sets a higher age.
- [ ] Place the come chip only when it is not the shooter's come-out, unless the house posts a different rule.
- [ ] Treat 7 and 11 as wins, and 2, 3, and 12 as losses, on that chip's first roll.
- [ ] Move the point in your head to 4, 5, 6, 8, 9, or 10, and wait for that number or a 7.
- [ ] Take odds only in the multiple the layout prints, at 2 to 1, 3 to 2, or 6 to 5.
- [ ] Know whether come odds are OFF on the next come-out.
- [ ] Do not quote 1.41% on a put bet that skipped the come-out.
- [ ] Leave a table minimum unpublished if the felt does not print one.
- [ ] Set a loss stop in dollars before the first come chip.
- [ ] If the session becomes a chase, call 1-800-GAMBLER.
- [ ] Do not ask this site's fairness page to audit the dice.`,
    },
    {
      id: "leave",
      title: "Who should let the come box stay empty",
      body: `A 1.41% chip is still a cost. A hot shooter does not store a debt to your come bets. The next 7 is still a 7.

Do not play if you are under 18, or under a higher age where you live. Do not play where the game is illegal. Do not stake rent, savings, or money with a due date.

Do not add come bets so you can feel present on every roll. Each flat chip is another 1.41% contract, and one 7 resolves all of them against you.

This page is an editorial note on one Wizard article. If your felt prints different odds, that felt wins.

If the chips stop being a bounded spend, stop. Call 1-800-GAMBLER and open [responsible gambling](/responsible-gambling).

[The small-table card game](/guides/mini-baccarat) is a different contract on a different layout. Do not carry 1.41% across the pit.`,
    },
  ],
  faqs: [
    {
      q: "Does a come bet craps chip pay a better price than pass?",
      a: "No. The Wizard page calls the come bet mathematically the same as pass, and it prints 1.41% for the pass flat bet. The difference is the roll you start on. Come begins after a point is already up, and its next roll acts as a come-out for that chip only. Odds behind either bet are a separate chip marked at zero house edge. Neither line promises the next shooter.",
    },
    {
      q: "What happens on the come chip's first roll?",
      a: "A 7 or 11 wins even money. A 2, 3, or 12 loses. A 4, 5, 6, 8, 9, or 10 becomes the point, and the flat bet moves to that number. From there the point must show before a 7. That sequence is the whole contract. It is the same sequence as the pass line, started one roll later than the shooter's come-out.",
    },
    {
      q: "Do come odds have a house edge?",
      a: "The Wizard page marks the odds chip at 0.00%, provided it pays 2 to 1 on 4 and 10, 3 to 2 on 5 and 9, and 6 to 5 on 6 and 8. The flat come bet under it remains 1.41%. On a come-out the same page lists come odds as OFF unless you ask for them to work. A table's maximum multiple is a house rule, and it is not published as one worldwide number.",
    },
    {
      q: "What is a put bet, and why is it costlier?",
      a: "A put bet skips the come-out and wagers only that a chosen number arrives before a 7, at even money on the flat chip. The page prints 33.33% on 4 and 10, 20.00% on 5 and 9, and 9.09% on 6 and 8, per bet resolved. The come-out wins were the cheap part of the contract. At ordinary odds limits the page prefers a place or a buy over that skip.",
    },
    {
      q: "Does PVPspinArena offer a come bet?",
      a: "No. The live wheel here is roulette, with 33 slots, not a craps layout. Purple and Silver pay 2x and carry about a 7.88% edge after the 5% fee on a winning payout. That number is not 1.41%, and it should not be pasted onto a come chip. A settled round can be recomputed on the fairness page. We did not time a cash-out. The cash-out minimum in the terms is $20.",
    },
    {
      q: "Is the 1.41% a promise about one shooter?",
      a: "No. It is the printed ratio of expected loss to the flat wager, per bet made and per bet resolved. One hundred $10 come bets have an expected cost of about $14.10, and your hundred can finish far from that average. The odds chip is outside that percent when it pays the true multiple. A loud table does not reduce either figure.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: Craps basics",
      url: "https://wizardofodds.com/games/craps/basics/",
    },
  ],
  related: [
    "casino-table-rental",
    "mini-baccarat",
    "online-craps",
    "craps-odds",
    "craps-strategy",
    "house-edge",
  ],
  updated: "2026-10-20",
};
