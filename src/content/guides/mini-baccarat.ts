import type { Guide } from "./types";

export const guide: Guide = {
  slug: "mini-baccarat",
  cluster: "Casino games",
  keyword: "mini baccarat",
  secondary: ["banker commission", "mini baccarat third card", "nine-seat baccarat"],
  title: "Mini Baccarat: Smaller Table and the Commission",
  description:
    "Mini baccarat is a nine-seat table the dealer reveals. Maryland prints a 5 percent banker cut, with exceptions. A stake floor is not on those sheets.",
  h1: "Mini baccarat: a smaller table, a dealer reveal, and the commission line",
  answer:
    "Mini baccarat is the small-table version of the same two-hand game. Maryland's rules, opened 20 October 2026, seat at most nine players and bar them from touching the cards. Washington allows a banker commission of up to 5 percent. A dollar minimum is not printed. No sheet promises a win.",
  facts: [
    "Last tested 20 October 2026 on the Washington State Gambling Commission mini-baccarat rules and the Maryland Lottery mini baccarat standard rules.",
    "A mini baccarat table in the Maryland text has numbered seats for no more than nine players, with the dealer on the opposite side.",
    "Maryland says players may not touch, handle, remove, or alter the cards. The dealer turns the hands. A timed squeeze length is not published.",
    "On an ordinary Maryland table, a winning banker bet pays 1 to 1 and the house takes vigorish equal to 5 percent of the amount won. EZ, Fortune 7, and no-commission tables are exceptions.",
    "Washington's overview says winning banker bets may be charged a commission of up to 5 percent, and tie bets pay at least 8 to 1. A table minimum in dollars is not on either sheet.",
    "The house-edge percent is not printed on those two rule texts. PVPspinArena does not offer this game.",
  ],
  sections: [
    {
      id: "table",
      title: "What mini baccarat changes on the sheets we opened",
      body: `Maryland's chapter on the furniture is concrete. The table has numbered positions for no more than nine seated players, all on one side, and a place for the dealer opposite them.

Washington allows up to nine wagering areas. A lower stake than a big table is the usual reason people ask, and neither sheet prints that dollar.

The minimum stays not published until the sign prints it. Do not invent a floor.

This note sits in the [casino games topic](/guides/topics/casino-games). [The banker and player boxes in the long form](/guides/baccarat-rules) is the companion note. Adults 18+ only.

The deal is still two hands, two cards or three, from a shoe of up to eight decks. You bet before any card comes out. You do not choose the draw.`,
    },
    {
      id: "squeeze",
      title: "Nine seats, and a reveal the players do not hold",
      body: `The long squeeze is a player peeling a face-down card. Maryland's procedure forbids that job. Players may not touch, handle, remove, or alter any cards used in the game.

The dealer places the cards and announces the point counts. Washington allows the first four cards face down, face up, or mixed, and it says the dealer turns the hands up and calls the totals when that is the house procedure.

A mini baccarat reveal, on these sheets, is the dealer's. A count of seconds for a big-table peel is not published here, so this note will not invent one. The rule we can state is who holds the card.

That shorter reveal does not change the draw. A natural 8 or 9 stops the third card.

Tens and pictures count as 0, aces as 1, and only the last digit counts. Washington's example is 7 and 5, valued at 2.

[Which box is the cheaper ordinary bet](/guides/baccarat-strategy) still depends on the commission the sign actually charges. A fast deal multiplies hands. It does not multiply your edge.`,
    },
    {
      id: "commission",
      title: "The commission line, including where it is absent",
      body: `Maryland's payout chapter is the clear sentence. Unless the table is EZ Baccarat, Fortune 7, or no-commission baccarat, a winning banker wager pays 1 to 1 and the house extracts vigorish equal to 5 percent of the amount won.

The same chapter lets the house round that vigorish to 25 cents, or up to the next highest multiple of 25 cents. It may take the cut when the hand is paid, or track it with a marker until the shoe changes or the player leaves.

Washington's overview is a cap, not a single rate. Winning banker bets may be charged up to 5 percent.

A lower rate fits that sentence. A higher rate does not, on this sheet.

A mini baccarat table marked no-commission, EZ, or Fortune 7 is a different contract. Maryland defines Fortune 7 as a variation in which vigorish is not collected. Do not quote 5 percent on a layout whose sign says otherwise.

Player bets pay even money, with no commission sentence. Tie bets on the Washington overview pay at least 8 to 1.

If the sign is missing, that tie price stays not published. The long-run house edge is not printed on either sheet.

[What a price over many bets is called](/guides/house-edge) is the general idea. It is not a number these two PDFs compute for you.`,
    },
    {
      id: "tableau",
      title: "Third-card rules from the Washington sheet",
      body: `Washington prints the draw, so this note may repeat it. It is a rule of the deal, not a choice, and memorizing it does not create an edge.

If either two-card total is 8 or 9, it is a natural. Neither hand draws. A natural 9 beats a natural 8.

Otherwise the player hand draws a third card on 0 through 5 and stands on 6 or 7. When the player stands, the banker draws on 0 through 5 and stands on 6 through 9.

When the player drew, the banker's total uses this grid from the Washington sheet.

| Banker total | Third card drawn to the player |
| --- | --- |
| 0, 1, or 2 | Banker always draws |
| 3 | Draws unless the third card is 8 |
| 4 | Draws on 2 through 7 |
| 5 | Draws on 4 through 7 |
| 6 | Draws on 6 or 7 |
| 7 | Stands |
| 8 or 9 | Natural. Neither hand draws |

Maryland matches the player split: draw below 6, stay on 6 or more. Equal totals tie, and the main bets push.

A mini baccarat hand you "read" from the last five results is not in these rules. [A reserved blackjack table](/guides/casino-table-rental) is a different draw.`,
    },
    {
      id: "dollars",
      title: "A winning banker chip with the 5 percent cut",
      body: `These pictures use Maryland's ordinary table, the one that takes 5 percent of the amount won. They are not a shoe we dealt. A no-commission sign cancels the pictures.

Example 1 — a clean $20 win. Five percent of $20 is $1, already a multiple of 25 cents, so you keep $19 of profit.

The stake comes back with that $19. The rounding clause adds nothing on this win.

Example 2 — a $12 win. Five percent is $0.60, and the next 25-cent step is $0.75. Maryland allows that round-up.

The sheet does not print the long-run effect of the extra $0.15. That percent stays not published.

Example 3 — a different product. A $10 Purple win pays $20 before the fee, the fee is $1, and the credit is $19.

Most Purple stakes lose the $10. That is roulette, not a banker bet.

A tie price of "at least 8 to 1" does not tell you the edge of the tie. Washington did not print that edge. Leave it not published.

The mini baccarat chip in example 1 is the $20 banker win, not a promise the banker wins the next hand.`,
    },
    {
      id: "compare",
      title: "This layout beside a house pit and a player wheel",
      body: `The commission is a charge on a winning banker bet at a house table. A player-pot game charges a posted fee instead. They do not share a percent.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
| --- | --- | --- | --- | --- | --- |
| Ordinary Maryland banker bet | 5% vigorish on the amount won. Long-run edge not published | The house | not published | not published | not published |
| House-banked casino | Washington allows up to 5% commission. A named pit's sign may differ | The house | not published | not published | not published |
| PVPspinArena | Purple and Silver about 7.88% after the 5% win fee. This game is not offered | Each roulette stake settles on its own | Balance updates when the round settles | yes, seed committed before the round | Shown on the bet control. Coinflip minimum is $1 |

How PvP compares: there is no banker box here. [Roulette](/roulette) uses 33 slots, 16 Purple, 16 Silver, and 1 Green. Purple and Silver pay 2x, then 5% comes off the winning payout.

The 7.88% edge is 16/33 times 1.90, minus 1. It is not a baccarat commission, and it does not fill the unpublished house-edge cell on the rule sheets.

A settled round can be recomputed on the [fairness page](/fairness). The check matches this site's seed. It does not audit a shoe.

Cash-out minimum is $20 in BTC, USDC, or ETH, after wagering at least half of deposited dollars. We did not time a cash-out.

[The 20-unit single-zero package](/guides/james-bond-roulette-strategy) is a wheel layout with its own printed loss. Do not move 2.70% onto a banker bet.`,
    },
    {
      id: "checks",
      title: "Checks before you sit at the small layout",
      body: `Use the sign on the table in front of you. A familiar nine-seat shape does not prove the commission.

- [ ] Confirm you are 18, or older if local law sets a higher age.
- [ ] Read whether the sign says 5 percent, up to 5 percent, or no commission.
- [ ] If the sign is silent, leave the commission not published.
- [ ] Confirm players do not touch the cards unless that house posts a different rule.
- [ ] Accept the Washington draw only if the table's rules match it.
- [ ] Leave the long-run house edge unpublished when the sheet has no percent.
- [ ] Leave the table minimum unpublished when the sign has no dollar.
- [ ] Do not treat a tie at "at least 8 to 1" as a cheap hedge.
- [ ] Set a loss stop in dollars before the first hand.
- [ ] If the session becomes a chase, call 1-800-GAMBLER.
- [ ] Do not ask this site's fairness page to audit the shoe.`,
    },
    {
      id: "leave",
      title: "Who should leave the nine seats alone",
      body: `A fast dealer reveal fits more hands into an hour. A mini baccarat commission you have not priced is how a small table spends a bankroll. The sheets do not owe you a banker run.

Do not play if you are under 18, or under a higher age where you live. Do not play where the game is illegal. Do not stake rent, savings, or money with a due date.

Do not raise the banker chip because the last five hands went the other way. Nothing in the Washington draw stores that debt.

This page is an editorial note on two public rule texts. It is not a forecast.

If the shoe stops being a bounded spend, stop. Call 1-800-GAMBLER and open [responsible gambling](/responsible-gambling).

The [terms](/terms) list this site's wheel and its fee. They do not list a mini table.`,
    },
  ],
  faqs: [
    {
      q: "Is mini baccarat a different draw from the big table?",
      a: "The sheets we opened describe the same kind of two-hand game, dealt to at most nine seats, with the dealer turning the cards. Washington prints the third-card tableau, including naturals on 8 or 9 and a player draw on 0 to 5. Maryland bars players from touching the cards. A big-table squeeze timed in seconds is not on these pages, so that duration stays not published. The draw is not a decision you make.",
    },
    {
      q: "What banker commission is actually printed?",
      a: "Maryland's ordinary table takes 5 percent of the amount won on a winning banker bet, and it may round that cut up to the next 25 cents. EZ Baccarat, Fortune 7, and no-commission tables are written exceptions. Washington says the commission may be up to 5 percent, which allows a lower rate. If the sign in front of you is silent, write not published. The long-run house edge is not on either sheet.",
    },
    {
      q: "Do the rules print a smaller minimum stake?",
      a: "No dollar minimum is printed on the Maryland or Washington texts we opened. People call the game a smaller-stake table, and the seat cap of nine is printed, but the chip size is not. Leave the minimum not published until the layout sign shows it. Do not copy a number from a different pit. Nine seats describe the furniture. They do not price the hand.",
    },
    {
      q: "Who squeezes the cards?",
      a: "Maryland says players may not touch, handle, remove, or alter the cards, so the dealer reveals them. Washington has the dealer turn the hands and call the totals. That is a shorter reveal than a player peel. A length in seconds for either style is not published on these sheets. The rule changes who holds the card. It does not change the last-digit total.",
    },
    {
      q: "Does a $20 banker win keep $20?",
      a: "Not on the ordinary Maryland table. A $20 win at 1 to 1 owes 5 percent of the amount won, which is $1, so the profit kept is $19 and the stake comes back. A $12 win is 60 cents before rounding, and the sheet allows a round up to 75 cents. Those pictures assume the table is not marked no-commission. They are not a promise the banker wins.",
    },
    {
      q: "Does PVPspinArena deal this game?",
      a: "No. The site does not offer a banker bet or a nine-seat shoe. Roulette uses 33 slots, and Purple or Silver carries about a 7.88% edge after the 5% fee on a winning payout. That percent is not a baccarat commission. A settled round can be recomputed on the fairness page. We did not time a cash-out. The cash-out minimum in the terms is $20.",
    },
  ],
  sources: [
    {
      label: "Washington State Gambling Commission: Mini-Baccarat rules",
      url: "https://wsgc.wa.gov/sites/default/files/2023-11/Mini-Bacarrat%20Game%20Rules%20Revised%204-12-22_0.pdf",
    },
    {
      label: "Maryland Lottery: Mini Baccarat standard rules",
      url: "https://www.mdgaming.com/wp-content/uploads/2023/08/Mini-Baccarat-Standard-Rules-Version-1.10.pdf",
    },
  ],
  related: [
    "come-bet-craps",
    "casino-table-rental",
    "james-bond-roulette-strategy",
    "baccarat-rules",
    "baccarat-strategy",
    "house-edge",
  ],
  updated: "2026-10-20",
};
