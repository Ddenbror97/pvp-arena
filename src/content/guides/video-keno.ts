import type { Guide } from "./types";

export const guide: Guide = {
  slug: "video-keno",
  cluster: "Casino games",
  keyword: "video keno",
  secondary: ["video keno paytable", "video keno spots", "video keno draw"],
  title: "Video Keno: Grid, Draw Count, and a Missing Paytable",
  description:
    "Video keno on the South Dakota rule and the Montana device file: grid, spots, and draw size. No casino catch paytable was opened. The screen can still lose.",
  h1: "Video keno: the grid a rule requires, and the paytable it leaves blank",
  answer:
    "Video keno is a screen card. You mark spots and a draw hits or misses them. South Dakota uses a grid no bigger than 1 to 80, a pick of 2 to 10, and at least 10 drawn. Montana's 2026 file draws at least 20 and requires an 80 percent return. An unopened casino paytable stays unpublished.",
  facts: [
    "Last tested 20 October 2026 on South Dakota rule 48:02:08:07 and Montana device file version 2.6, dated 19 March 2026.",
    "The South Dakota video keno rule took effect 18 August 1989. It prints no paytable and no return percent.",
    "Montana section 4.10 requires a 1-to-80 card, 2 to 10 spots, at least 20 drawn, an 80 percent minimum return, an $800 award cap, and a $2 maximum bet.",
    "Pennsylvania Undersea Keno uses 1 through 80, a pick of 3 to 10, and 20 drawn after three bonus spots.",
    "A casino catch price was not on a page we opened. That cell stays not published.",
    "This site does not offer the screen game. Purple and Silver are about a 7.88 percent edge after the 5 percent fee.",
  ],
  sections: [
    {
      id: "rule",
      title: "What the video keno rule requires on the screen",
      body: `The page we opened is South Dakota Administrative Rule 48:02:08:07. The source line is 16 SDR 27, effective 18 August 1989.

The rule is a floor for video lottery machines in that state. It is not a Nevada cabinet, and it is not a promise about tonight's ticket.

### One card, a bounded grid, a short pick

Each machine must display a fixed grid not greater than 1 to 80. Only one card may be on the screen. The player selects between two and ten numbers, and those picks must show.

The game draws with an approved random number generator. At least ten numbers are drawn per play, and each drawn number is indicated.

At the end the screen shows the draws, the picks, the match count, and the credits. The rule does not print which catches pay.

A paytable is not published on this page. The [casino games](/guides/topics/casino-games) hub collects draw notes. We did not open an account or time a cash-out.`,
    },
    {
      id: "montana",
      title: "A March 2026 device file with a return floor",
      body: `Montana's Gambling Control Division published Requirements Specification version 2.6 on 19 March 2026. Section 4.10 is the keno block in that video-gambling file.

The card uses numbers 1 through 80. The player may mark 2 to 10 spots and must be able to pick them. The game draws at least 20 numbers, in generator order, and shows them on the card.

The screen must show the bet, the spots marked, and the hits. If more than one card is offered, the card count must be clear.

### A floor, not a named cabinet

The section requires a minimum 80 percent return at each bet increment. A progressive uses the jackpot base when that minimum is computed.

The maximum award is $800, including any bonus. The maximum bet is $2 per game.

Those figures bind a submission in that state. They are not the return of a casino cabinet somewhere else. If the glass is silent, write not published.

A casino video keno paytable was not in section 4.10. The file says to draw at least 20 numbers. It does not say the draw stops at 20.`,
    },
    {
      id: "sheet",
      title: "One screen sheet that does print prizes",
      body: `Pennsylvania Lottery's Undersea Keno PDF is a different product. It is a monitor game, not a South Dakota terminal, and not a casino bank of screens.

The grid is 10 by 8, numbers 1 through 80. The player marks 3 to 10 spots. Purchase prices on the sheet are $0.10, $0.50, $1, $2, $5, $10, $20, and $30.

Play adds three bonus spots, then draws 20 numbers. A turbo switch speeds the draw.

### What we will not retype

The PDF prints a $1 prize grid and an odds grid. This article does not retype every cell, because a wrapped table can shift a column. Open the PDF for the catch dollars.

The odds header says the figures are "1 in." The overall row reads 6.6, 3.9, 10.3, 6.2, 4.2, 9.8, 6.5, and 4.7 for 3 through 10 spots. That row is a win-something rate on that sheet, not a casino edge.

Ten free games follow when all three bonus numbers are inside the 20. The free-game wheel can pay 1x, 2x, 3x, 4x, 5x, or 10x, or 30 draws, or 5 times the price at once. A sequence caps at 50 free games.

Auto play offers 5, 10, 15, or 20 plays. A single prize greater than $600 locks the card for a retailer claim.

| Item | South Dakota rule | Montana device file | Pennsylvania Undersea sheet |
| --- | --- | --- | --- |
| What it governs | video lottery software | a video gambling submission | one lottery monitor game |
| Number grid | not greater than 1 to 80 | 1 to 80 | 1 through 80 |
| Spots the player marks | 2 to 10 | 2 to 10 | 3 to 10 |
| Numbers drawn | at least 10 | at least 20 | 20, after 3 bonus spots |
| Return or award cap | not published | at least 80 percent return; $800 max award | prize grid printed; not retyped here |
| Stake limit | not published | $2 maximum bet | $0.10 to $30 purchase prices |
| Catch-by-catch paytable | not published | not published | printed on the PDF |`,
    },
    {
      id: "distinct",
      title: "Why an 80-ball formula is not this glass",
      body: `A ticket that draws exactly 20 from 80 has a combination price. That arithmetic is on [the catch-probability sheet](/guides/keno-odds). Use it only when the draw count and the pay column are both in front of you.

South Dakota allows a draw of 10. Montana allows a draw above 20. Either change moves the chance of a catch.

Pasting an 80-and-20 fraction onto a different draw is a different game. Calling that fraction a video keno edge is the mistake.

[How two draw games sit side by side](/guides/keno-vs-bingo) does not fill the missing casino column. [The price a game keeps](/guides/house-edge) names that column once a paytable is in hand.

Neither state file prints seconds per game. The Pennsylvania sheet has turbo and auto play. A casino button's pace was not on a page we opened.

The count-by-fours note is [the button game](/guides/fan-tan-game). The two-side card deal is [the joker-card game](/guides/andar-bahar).`,
    },
    {
      id: "pots",
      title: "A screen card beside a house game and a player pot",
      body: `Three products get mixed because each can show numbers. Only this site's player games have a fee you can recompute from rules printed here.

Do not paste a video keno percent onto the wheel. The 80 percent line is a Montana submission floor. The Pennsylvania odds row is a lottery sheet.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
| --- | --- | --- | --- | --- | --- |
| This screen game | not published for a casino glass; Montana submissions at least 80 percent return | a paytable | not published | not published | not published |
| House-banked casino | inside that house's paytable; no percent is fixed here | the house | not published | not published | not published |
| PVPspinArena | Slott takes 10 percent of a winning pot. Purple and Silver are about a 7.88 percent edge after the 5 percent win fee | other players | balance updates when the round settles | yes, seed committed before the round | shown on the bet control |

How PvP compares: a screen card prices a ticket against a paytable. [Roulette](/roulette) prices a stake against other players on a 33-pocket wheel, with 16 Purple, 16 Silver, and 1 Green.

Purple and Silver pay 2x, then 5 percent comes off that winning payout, so a hit keeps 1.90 times the stake. Sixteen divided by 33, times 1.90, minus 1, is about −0.0788.

That figure is the 7.88 percent edge. Green pays 14x, and this page does not quote a Green edge.

A settled round can be recomputed on the [fairness page](/fairness). The check matches this site's commit. It does not audit a lottery or a casino screen.

Balances are US dollars, funded with Bitcoin or with USDC or ETH on Base. Cash-out minimum is $20 in BTC, USDC, or ETH. We did not time a cash-out.

Coinflip minimum is $1. This site does not host the number screen.`,
    },
    {
      id: "examples",
      title: "Three labeled pictures, none of them a promise",
      body: `None of these pictures is a cabinet we played. The first two use a page we opened. The third uses a fee from this site.

Example 1 — Montana caps. The file caps the bet at $2 and the award at $800, bonus included. On a $2 stake the arithmetic lid is $800.

That $800 is a submission ceiling, not an expected result. It is not a video keno win we watched.

Example 2 — lottery price. Undersea Keno lists $1 among its purchase prices. The catch dollars for that $1 play stay on the PDF.

A prize above $600 on that sheet locks the card. That is a claim rule, not a forecast.

Example 3 — Purple payout. A $25 Purple stake that wins pays 2x, which is $50. Five percent of that payout is $2.50, so the player receives $47.50.

One win does not reveal the 7.88 percent edge. Most Purple stakes lose.`,
    },
    {
      id: "checks",
      title: "Checks before a number screen is treated as a rule you read",
      body: `Use the glass you are pressing. A familiar 1-to-80 grid does not prove the South Dakota draw, the Montana caps, or the Pennsylvania prize cells.

- [ ] Confirm you are 18, or older if local law sets a higher age.
- [ ] Read the paytable on the machine, not a rule from another state.
- [ ] Accept a 1-to-80 grid only if that glass prints it.
- [ ] Accept a 2-to-10 pick only if that glass prints it.
- [ ] Accept the draw count only if that glass prints it. At least 10 and at least 20 are different rules.
- [ ] Leave the catch prices unpublished when the glass does not show them.
- [ ] Do not treat Montana's 80 percent floor as the return of a different cabinet.
- [ ] Do not treat the Pennsylvania PDF as a casino paytable.
- [ ] Do not treat a turbo button as a change in the price. Pace spends the stake faster.
- [ ] Set a loss stop before the first paid play.
- [ ] If the session becomes a chase, call 1-800-GAMBLER.
- [ ] Recompute a PVPspinArena round on the fairness page, and do not ask it to audit a lottery.`,
    },
    {
      id: "limits",
      title: "Who should leave the number screen alone",
      body: `A video keno session can end below the stake you brought. An 80 percent floor, where it applies, is a long-run rule, so losses are ordinary. A prize cell is a price on one sheet, not a plan.

Do not play if you are under 18, or under a higher local age. Do not play where the game is illegal. Do not stake rent, savings, or money with a due date.

Do not play to get even. A quiet run is not a debt the next draw owes you.

[Why a cold run is not a credit](/guides/gamblers-fallacy) is the general point. This page is an editorial note, not a statute and not a coupon.

This site does not offer the title. If play stops being a bounded spend, call 1-800-GAMBLER and open [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "How many numbers does a video keno draw use?",
      a: "It depends on the page. South Dakota requires at least 10 numbers drawn, on a grid no larger than 1 to 80. Montana's March 2026 file requires at least 20 on a 1-to-80 card. Pennsylvania's Undersea sheet draws 20 after three bonus spots. A casino glass can differ. If that glass is silent, the draw size stays not published.",
    },
    {
      q: "How many spots can the player mark?",
      a: "South Dakota and Montana both print a pick of 2 to 10. The Pennsylvania sheet uses 3 to 10. Those are three documents, not one national rule. The video keno pick on a casino button can differ from all three. Read that glass before you treat a band as universal. A one-spot button, or a pick above 10, was not in the rules we opened.",
    },
    {
      q: "Is the paytable published?",
      a: "A casino catch paytable is not published here. South Dakota prints no prize column. Montana prints an 80 percent minimum return, an $800 award cap, and a $2 bet cap. Those are submission limits, not dollars per catch. Pennsylvania prints a $1 prize grid on its lottery PDF. Open that PDF for the cells, and do not paste them onto a casino screen.",
    },
    {
      q: "Does an 80 percent return mean a ticket wins 80 percent of the time?",
      a: "No. Montana's 80 percent line is a minimum long-run return for a submission in that state. It is not a hit rate, and it is not the return of a cabinet the file does not name. Wins can be rare and still leave a long-run return near that floor, if the prizes are large. One session can finish below the stake you brought.",
    },
    {
      q: "What does the Pennsylvania sheet add that the state rules do not?",
      a: "The Undersea PDF prints prices from $0.10 to $30, a draw of 20, three bonus spots, turbo, and auto play of 5, 10, 15, or 20. Ten free games follow when all three bonus numbers are drawn. A prize over $600 locks the card for a retailer claim. That sheet is a lottery product. It does not price a casino screen.",
    },
    {
      q: "Does this site offer the screen game?",
      a: "No. This site does not host the title. The comparison here is roulette, a 33-pocket wheel with a 5 percent fee on a winning payout. Purple and Silver keep 1.90 times the stake on a win, and the long-run edge on those two is about 7.88 percent. A fairness check recomputes this site's commit. It does not audit a state rule or a lottery PDF.",
    },
  ],
  sources: [
    {
      label: "South Dakota Legislature, Administrative Rule 48:02:08:07, software requirements for video keno",
      url: "https://sdlegislature.gov/Rules/Administrative/48:02:08:07",
    },
    {
      label: "Montana Department of Justice, Gambling Control Division, video gambling device requirements version 2.6 (19 March 2026), section 4.10",
      url: "https://dojmt.gov/wp-content/uploads/2026/04/VGM-Modification-Requirements-v2.6.pdf",
    },
    {
      label: "Pennsylvania Lottery, Undersea Keno Game Rules (Smart Chip Play)",
      url: "https://www.palottery.pa.gov/PaLotteryWebSite/media/PDF/Smart%20Chip%20Play/Undersea-Keno-Game-Rules-Smart-Chip-Play.pdf",
    },
  ],
  related: [
    "keno-odds",
    "keno-vs-bingo",
    "house-edge",
    "live-dealer-casino",
    "gamblers-fallacy",
    "french-roulette",
  ],
  updated: "2026-10-20",
};
