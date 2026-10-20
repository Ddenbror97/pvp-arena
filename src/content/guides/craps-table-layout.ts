import type { Guide } from "./types";

export const guide: Guide = {
  slug: "craps-table-layout",
  cluster: "Casino games",
  keyword: "craps table layout",
  secondary: ["craps table layout rules", "craps table layout odds", "craps table layout payout"],
  title: "Craps Table Layout: Pass, Odds, Come, Field",
  description:
    "A craps table layout maps pass, don't pass, odds, come, field, and place bets. Payoffs are quoted from rules we opened. Edge percents are our arithmetic.",
  h1: "Craps table layout: pass, don't pass, odds, come, and field",
  answer:
    "Pass and don't pass sit on the near rail for the come-out. Odds sit behind a line bet after a point. Come and don't come use the next roll as their come-out. Place bets cover six numbers and the field is one roll. Quoted payoffs are from rules we opened. A printed edge percent is not published.",
  facts: [
    "Last tested 20 October 2026. We did not play a shoe, throw dice, open a casino account, or time a cash-out.",
    "New Jersey regulation 13:69F-1.4 prints Pass, Don't Pass, Come, and Don't Come at 1 to 1.",
    "That payout section prints the field at 1 to 1 on 3, 4, 9, 10, and 11, and at 2 to 1 on 2 and on 12.",
    "The Nevada approved-games text we opened lists variant craps files. A standalone standard craps rules PDF was not in that text.",
    "Wynn's casino page loaded and does not print a felt chart, a pass payoff, or an odds multiple.",
    "A house-edge percent is not published on the Nevada, New Jersey, MGM, or Wynn pages we opened. Percents below are our arithmetic.",
  ],
  sections: [
    {
      id: "rail",
      title: "Reading a craps table layout from the rail inward",
      body: `A craps table layout is two mirrored ends around a shared center. The pass line is the near band, and don't pass sits just above it.

Come and don't come are the next band. Above them are the boxes for 4, 5, 6, 8, 9, and 10, plus the field rectangle for 2, 3, 4, 9, 10, 11, and 12.

The shared center holds proposition spots and hardways. Regulation 13:69F-1.2 names those wagers, and a scale drawing is not published.

MGM Resorts publishes a casino craps table layout note on its Gamesense page. It describes a come-out, a point, and the felt where bets sit.

[Casino games](/guides/topics/casino-games) is the hub. The screen version is [a button grid instead of a rail](/guides/online-craps). Wynn's page names blackjack, roulette, slots, poker, and a sports book, and a felt chart there is not published.`,
    },
    {
      id: "come-out",
      title: "Come-out rules on the pass and don't pass bands",
      body: `Regulation 13:69F-1.2 puts a Pass Bet on the Pass Line before the come-out. It wins on 7 or 11, or if 4, 5, 6, 8, 9, or 10 repeats before a 7. It loses on 2, 3, or 12, or if a 7 shows before the point.

Don't pass wins on 2 or 3, or if a 7 shows before the point. It loses on 7 or 11, or if the point repeats. A come-out 12 voids it, and MGM's guide states that same push.

Both line bets pay 1 to 1 under 13:69F-1.4. Pass and come stay up after a point. Don't pass may be taken down, and it may not be increased afterward.

The Nevada Crapless Craps PDF is a variant. On its come-out, only 7 wins the pass line, and it pays even money. Totals 2, 3, 11, and 12 become points, and don't pass is absent.

A lay bet there, if offered, takes a 5 percent vig. Other pays are described as the standard game and are not listed. Those standard pays are not published in the PDF.`,
    },
    {
      id: "odds",
      title: "Odds chips behind the line, at the printed true odds",
      body: `Odds on a craps table layout are a second stack behind the flat. After 4, 5, 6, 8, 9, or 10, regulation 13:69F-1.6 allows a supplement the casino may cap at the flat stake.

The flat still pays 1 to 1. The supplement pays 2 to 1 on 4 or 10, 3 to 2 on 5 or 9, and 6 to 5 on 6 or 8. Don't-pass supplements pay the reverse prices, and come bets use the same pairs.

A 4 is 3 ways against 6 ways for a 7, so 2 to 1 is fair. A 5 is 4 against 6, and a 6 is 5 against 6. On a 6, five wins of 6 units and six losses of 5 units cancel.

MGM says those odds pay true odds and the house holds no advantage on that bet. The regulation does not print "zero percent." Up to 100 times the flat is allowed, and a 3-4-5x multiple is not published here.

See [which spots the arithmetic keeps cheaper](/guides/craps-strategy).`,
    },
    {
      id: "boxes",
      title: "Come, field, and the six place-number boxes",
      body: `A Come Bet uses the next roll as its come-out. It wins on 7 or 11, loses on 2, 3, or 12, and otherwise the total must repeat before a 7.

Don't come wins on 2 or 3, loses on 7 or 11, and is void on 12. It wins a come point if a 7 shows first. The flat pays 1 to 1.

The field wins on 2, 3, 4, 9, 10, 11, or 12 and loses on 5, 6, 7, or 8. Pays are 1 to 1 on 3, 4, 9, 10, and 11, and 2 to 1 on 2 and on 12. MGM's field line was garbled, so it is not used as a payoff.

Place bets on 4, 5, 6, 8, 9, or 10 win if the number shows before a 7. They are off on the come-out unless called on. Pays are 9 to 5, 7 to 5, and 7 to 6 on the pairs above.

A buy can swap in true odds for a charge of at most 5 percent. Whether that charge is taken up front or only on a win is a house checklist, and that checklist is not published here.

| Box | Printed payoff | Edge we can show |
|---|---|---|
| Pass | 1 to 1 | 7/495, our arithmetic |
| Don't pass | 1 to 1, void on come-out 12 | 3/220, our arithmetic |
| Odds on 4 or 10 | 2 to 1 | 0, our arithmetic |
| Odds on 5 or 9 | 3 to 2 | 0, our arithmetic |
| Odds on 6 or 8 | 6 to 5 | 0, our arithmetic |
| Field | 1 to 1 on 3, 4, 9, 10, 11; 2 to 1 on 2 and 12 | 1/18, our arithmetic |
| Place 6 or 8 | 7 to 6 | 1/66, our arithmetic |
| Place 4 or 10 | 9 to 5 | 1/15, our arithmetic |
| Place 5 or 9 | 7 to 5 | 1/25, our arithmetic |
| Any Seven | 4 to 1 | 1/6, our arithmetic |
| Wynn felt | not published | not published |
| Nevada standard craps PDF | not published | not published |

Hard 4 and hard 10 pay 7 to 1, and hard 6 and hard 8 pay 9 to 1. A percent for every hop bet is not published.`,
    },
    {
      id: "arithmetic",
      title: "Edges from the dice, because no page prints a percent",
      body: `Two dice have 36 faces. Ways for 2 through 12 are 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, and 1. Pass wins on 8 come-out faces, loses on 4, and the other 24 set a point.

Point 4 or 10 then wins 3 of 9. Point 5 or 9 wins 4 of 10, and point 6 or 8 wins 5 of 11. Add 8/36, plus two times (3/36) times (1/3), plus two times (4/36) times (2/5), plus two times (5/36) times (5/11).

That is 10/36, plus 4/45, plus 25/198. Over 990 the parts are 275, 88, and 125, or 244/495 wins. Losses are 251/495, so the flat keeps 7/495.

Don't pass pushes a twelve. Wins are 949/1980 and losses are 976/1980, with the push at 55/1980. The edge is 3/220.

Come copies the pass fraction, and don't come copies that don't-pass fraction.

The field's 16 winners and 20 losers would keep 4/36 at even money. The extra unit on 2 and on 12 returns 2/36, so the net is 1/18.

Place 6 at 7 to 6 is 1/66. The other place rows and Any Seven are in the table. No page we opened prints these as percents.

[What a keep per dollar means](/guides/house-edge) is the name for the gap. At 1x odds the flat still loses 7/495, and the edge on average handle is 7/825. A printed combined percent is not published.`,
    },
    {
      id: "dollars",
      title: "Three dollar examples using only printed pays",
      body: `### Example A. A $10 pass line

Expected loss is 10 times 7/495, about 14 cents, on each finished come-out. Odds at the printed true odds add zero. The cents stay on the flat, and a minimum that would block $10 is not published.

### Example B. An $18 field bet

The field edge is 1/18, so $18 loses about $1 a roll under 1 to 1 and 2 to 1. A 3 to 1 pay on 12 is not published in the New Jersey section. We do not use a triple.

### Example C. Two $50 Coinflip stakes

This site has no dice felt. Two $50 Coinflip stakes make a $100 pot, the fee is $5, and the winner receives $95. We did not open an account or time a cash-out.`,
    },
    {
      id: "checklist",
      title: "A checklist before the dice leave a hand",
      body: `Use this list before you treat the whole craps table layout as one price.

- [ ] I can point to the pass line and the don't pass bar as two bands.
- [ ] I know a come-out 12 voids don't pass under the New Jersey rule we opened.
- [ ] I know odds pay 2 to 1, 3 to 2, or 6 to 5 only after a point.
- [ ] I know the field pays 2 to 1 on both 2 and 12 in that regulation.
- [ ] I know place 6 and 8 pay 7 to 6, so the stake must be payable at that price.
- [ ] I know place bets are off on the come-out unless they are called on.
- [ ] I know a printed house-edge percent is not published on the pages opened for this test.
- [ ] I know Wynn's casino page did not print a felt chart on 20 October 2026.
- [ ] I am of legal age, and Wynn prints 21 to gamble on its floor.
- [ ] I can afford to lose the stake, and I will stop if the dice stop being entertainment.

If the felt bars a different number, the felt controls the bet. Our fractions describe the New Jersey text.`,
    },
    {
      id: "pvp",
      title: "A player pot beside this felt",
      body: `A craps table layout is a house contract, and this site does not offer one. PVPspinArena does not book sports.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
|---|---|---|---|---|---|
| Pass line under NJ 13:69F | 7/495 of the flat, our arithmetic; a printed percent is not published | The house | not published | not published | not published |
| Odds behind that pass bet | 0 on the odds stack, our arithmetic from the printed true odds | The house | not published | not published | not published |
| PVPspinArena Coinflip | 5% of the pot | Another player | not published; cash-out minimum is $20 | A check is published on the fairness page | $1 |

Coinflip and Jackpot each take 5 percent of the pot. Four $50 Jackpot entries make a $200 pot, the fee is $10, and the winner receives $190. Coinflip's minimum is $1, and the cash-out minimum is $20 in BTC, USDC, or ETH.

Roulette here is 33 slots: 16 Purple and 16 Silver pay 2x, and 1 Green pays 14x. Five percent comes off a winning payout, and the Purple or Silver edge after that fee is about 7.88 percent. P2P Slot takes 10 percent of a winning pot.

How PvP compares: you face another player's stake, and the fee is a share of the pot. Read the [fairness](/fairness) check and open [Coinflip](/coinflip).

Half a blackjack wager is [giving half back when the rule allows it](/guides/blackjack-surrender). Rail gestures are [motions a dealer is told to read](/guides/blackjack-hand-signals).

Anyone under the local age should skip the game. Wynn prints 21 for its floor, and anyone using money already owed should skip it too.

If it stops being entertainment, stop and call 1-800-GAMBLER. Use our [responsible gambling](/responsible-gambling) page. We did not play a shoe.`,
    },
  ],
  faqs: [
    {
      q: "Where does the pass line sit, and what does it pay?",
      a: "The pass bet sits on the Pass Line before the come-out, and regulation 13:69F-1.4 pays it at 1 to 1. It wins on 7 or 11, or when 4, 5, 6, 8, 9, or 10 repeats before a 7. It loses on 2, 3, or 12, or when a 7 arrives first. A diagram with table dimensions is not published on the pages we opened.",
    },
    {
      q: "What do the odds behind the line pay?",
      a: "After a point, regulation 13:69F-1.6 pays the supplement at 2 to 1 on 4 or 10, at 3 to 2 on 5 or 9, and at 6 to 5 on 6 or 8. Those prices match the ways the point beats a 7, so our arithmetic on that stack is zero. The flat still pays 1 to 1 and still carries 7/495. A maximum multiple above even odds is a local rule.",
    },
    {
      q: "Does the field pay the same on 2 and on 12?",
      a: "Regulation 13:69F-1.4 pays the field 1 to 1 on 3, 4, 9, 10, and 11, and 2 to 1 on both 2 and 12. Our arithmetic on those pays is an edge of 1/18. A triple on 12 is not published in that section. MGM's field line did not render as a clean payoff, so we do not treat it as a second price.",
    },
    {
      q: "Did Nevada publish a standard felt chart in the PDF we opened?",
      a: "The approved-games text we opened did not include a standalone standard craps rules PDF. The Crapless Craps PDF changes the come-out and drops don't pass, and it does not print the standard pays. A house-edge percent is not published in that PDF. Wynn's casino page also prints no felt chart.",
    },
    {
      q: "Does PVPspinArena run a dice table?",
      a: "PVPspinArena does not offer this felt to players on the site. Comparisons here use Coinflip at 5 percent of the pot, Jackpot at that same fee, Roulette on a 33-slot wheel, and P2P Slot at 10 percent of a winning pot. The cash-out minimum is $20. We did not open an account or time a cash-out on 20 October 2026.",
    },
    {
      q: "Who should stay off the rail?",
      a: "Anyone under the age required where they stand should stay off, and Wynn prints 21 as the age on its floor. Anyone who cannot lose the stake without missing a bill should stay off too. The line is still a negative expectation under the arithmetic above. If play stops being entertainment, stop and call 1-800-GAMBLER.",
    },
  ],
  sources: [
    {
      label: "Nevada Gaming Control Board, Rules of Play for Approved Games",
      url: "https://www.gaming.nv.gov/divisions/gaming-lab/approved-games/",
    },
    {
      label: "Nevada Gaming Control Board, Crapless Craps rules of play",
      url: "https://www.gaming.nv.gov/siteassets/content/divisions/enforcement/rules-of-play/Crapless_Craps.pdf",
    },
    {
      label: "New Jersey Division of Gaming Enforcement, Chapter 69F rules of the games (craps, N.J.A.C. 13:69F-1)",
      url: "https://www.nj.gov/oag/ge/docs/Regulations/CHAPTER69F.pdf",
    },
    {
      label: "MGM Resorts, Guide to Craps",
      url: "https://www.mgmresorts.com/en/gamesense/guide-to-craps.html",
    },
    {
      label: "Wynn Las Vegas casino page",
      url: "https://www.wynnlasvegas.com/casino",
    },
  ],
  related: [
    "online-craps",
    "craps-strategy",
    "house-edge",
    "keno-odds",
    "blackjack-surrender",
    "blackjack-hand-signals",
  ],
  updated: "2026-10-20",
};
