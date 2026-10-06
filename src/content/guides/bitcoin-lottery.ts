import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bitcoin-lottery",
  cluster: "Games & odds",
  keyword: "bitcoin lottery",
  secondary: ["btc lottery", "crypto lottery", "satoshi lottery", "bitcoin jackpot lottery"],
  title: "Bitcoin Lottery Guide: Odds, Jackpots and House Edge",
  description:
    "How a bitcoin lottery works: ticket odds, progressive jackpots, house edge, and why a PvP pot is a different product from a draw.",
  h1: "Bitcoin lottery: ticket odds, jackpots and the house edge",
  answer:
    "A bitcoin lottery sells numbered tickets or shares in a draw and pays winners in BTC or satoshis. Odds are the inverse of tickets outstanding, minus any extra house tickets or withheld prize slice. Progressive jackpots grow because most tickets lose. That product is a draw against a prize schedule, not a player-versus-player pot where your share of the tickets is exactly your share of the pot.",
  facts: [
    "A lottery ticket’s chance is 1 divided by the number of equally likely tickets, if the draw is honest.",
    "House edge in a lottery is the share of ticket sales the operator keeps or leaks to extra tickets.",
    "Progressive prizes look large because they are rare; the extra headline is paid by losing tickets.",
    "BTC denomination adds price risk: the dollar value of a fixed satoshi prize moves with Bitcoin.",
    "PVPspinArena is not a lottery. Jackpot is a PvP pot: your cents in are your tickets in that pot.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What a bitcoin lottery is",
      body: `A bitcoin lottery is an online draw funded and paid in Bitcoin. You buy one or more tickets. At a posted time, or when a pot of tickets fills, a winning number is chosen. Prizes may be a fixed BTC amount, a share of ticket sales, or a progressive jackpot that rolls until someone hits a rare combination.

"Satoshi lottery" usually means tiny ticket prices, because a satoshi is a small fraction of a BTC. Cheap tickets do not improve the odds. They only change the unit.

This [games and odds](/guides/topics/games-and-odds) guide is for adults aged 18 or over. It teaches lottery maths honestly, then contrasts it with PVPspinArena. This site is not a lottery, not a sportsbook and not a poker room. Its Jackpot game is a hashed player-versus-player pot: every cent you add is a ticket to that pot, and one player takes what remains after any posted fee.

If you hold BTC and wanted a [bitcoin casino](/guides/bitcoin-casino) instead, that is still a different cashier. This site takes USDC and ETH on Base.`,
    },
    {
      id: "odds",
      title: "Ticket odds without the poster math",
      body: `If a draw sells 10,000 equally likely tickets and you hold 1, your chance of first prize is 1 in 10,000, or 0.01%, if the draw is fair. If you hold 50 tickets, it is 50 in 10,000, or 0.5%. Linearity is the whole honest story.

Casinos and lotteries muddy that story in three ways:

- **Extra tickets.** The house keeps virtual tickets, or a bot "player," so the prize pool is not 100% of sales.
- **Tiered prizes.** Many small consolation prizes make the "you can win" banner true while the jackpot chance stays microscopic.
- **Progressives.** Part of each ticket funds a pool that almost nobody hits. See [progressive jackpot odds](/guides/progressive-jackpot-odds).

Unlimited-ticket designs against a random number in a huge range are the same idea with a different interface. If a "satoshi lottery" draws a 64-bit number and you bought one ticket, your chance is one over the range they actually use, not one over "however many people showed up." Read which model you are in. A pot that splits among holders is not a lottery with a fixed N.

You cannot beat a 1-in-N draw by picking "lucky" numbers. That is the gambler's fallacy applied to tickets. You can only buy more tickets or refuse the product. Buying 10 times the tickets multiplies your chance by 10 and your spend by 10. The edge percentage does not improve.`,
    },
    {
      id: "edge",
      title: "Where the house edge sits in a lottery",
      body: `The [house edge](/guides/house-edge) of a lottery is the operator's expected keep as a fraction of ticket spend.

If a draw sells $100,000 of tickets and returns $55,000 in prizes in expectation, the house edge is 45%. National lotteries often sit in a high band like that because they fund other purposes. Online BTC lotteries vary. Some return a large share of sales into a visible pot. Some advertise a huge progressive while the par ticket value is poor.

Compute it when you can:

1. Price of one ticket, in BTC and in dollars.
2. Number of tickets in this draw (or the design N if tickets are unlimited against a random number).
3. Prize table in the same units.
4. Expected return = sum of (prize × probability). Edge = 1 − expected return / ticket price.

If the site will not state N or the prize table, you cannot compute the edge. That is a reason to leave, not a reason to "trust the jackpot photo."

Rollover clauses and "must buy 10 tickets to qualify" rules change N for *you* without changing the banner. Bonus tickets that cannot win the top tier are advertising, not odds. Free-ticket promotions on other sites are still tickets against a hold; this guide will not call them a no-cost session.

BTC denomination invites a second error: quoting the jackpot in dollars on a green day and ignoring it on a red day. Pick one unit for the EV calculation and stick to it through the draw.`,
    },
    {
      id: "progressive",
      title: "Progressive jackpots and why the headline misleads",
      body: `A progressive grows because losing tickets donate to a pool. The advertised BTC jackpot can look like a life-changing amount while your ticket still has a 1-in-millions chance.

Two numbers belong on the same line: jackpot size and jackpot probability. A $2,000,000 prize at 1 in 20,000,000 is an expected $0.10 of jackpot value before any lesser prizes. If the ticket cost $2, the jackpot alone is not a bargain. Lesser prizes may fill some of the gap. They may not.

BTC progressives add a second chart. If the pool is denominated in Bitcoin and BTC rises, the dollar headline grows without anyone hitting. If BTC falls, the dream shrinks. That is price risk, not a hotter game.

A [crypto jackpot](/guides/crypto-jackpot) in the PvP sense is a different sentence: players' money is the pot, tickets equal contributions, one winner, a posted fee. There is no rolled-over progressive taking a silent bite unless the product says so.

Some BTC rooms brand every large prize a "jackpot lottery." Ask whether losers' money stays in *this* pot or funds a future rare hit. If it funds the future, you are closer to a progressive than to a PvP share. If it stays, and tickets equal money, you are closer to this site's Jackpot — except this site is in dollars on Base and publishes a seed commitment.

Near-miss animations on lottery pages are decoration. They do not alter N. If a UI shows your ticket "one digit off," that is theatre unless the rules pay a near-miss tier you can find in the prize table.`,
    },
    {
      id: "example",
      title: "Worked example: 200 tickets versus a $20 PvP pot",
      body: `Maya has $20 she can afford to lose.

**Lottery path.** A bitcoin lottery sells tickets at $0.10. This draw has 2,000,000 equally likely tickets and a single $50,000 prize (a simplified table so the arithmetic is visible). Total sales are $200,000 if every ticket sells. Maya buys 200 tickets.

1. Her chance of the prize is 200 / 2,000,000 = 0.01%.
2. Expected prize value is 0.0001 × $50,000 = $5.
3. She spent $20, so expected loss is $15.
4. House edge on this cartoon is ($200,000 − $50,000) / $200,000 = 75% if the prize is funded from sales that way. Real BTC lotteries often mix a smaller posted prize and a progressive. The method stays: prize table times probabilities, minus ticket cost.
5. If the same prize were 0.8 BTC and Bitcoin moved 10% before the draw, Maya's dollar EV would move even if N did not. That is price risk stacked on lottery risk.

**PvP path.** Maya puts $20 into a PVPspinArena Jackpot that already has $80. She now holds 20% of the tickets in *that* pot.

1. If the fee is 0% and nobody else joins, she has a 20% chance to take $100. Expected value is $20.
2. If two more players add $20 each, the pot is $140 and Maya has 20/140 of the tickets. Expected value is still about $20 before a fee.
3. A 1% fee would shave a dollar off the pot. That is a posted cost, not a hidden 75% prize withhold.

The lottery bought a long shot against a withheld prize. The PvP pot bought a share equal to her money. Different products. Neither is "due."`,
    },
    {
      id: "contrast",
      title: "Why a PvP pot is not a bitcoin lottery",
      body: `| Feature | Bitcoin lottery | PvP Jackpot on this site |
| --- | --- | --- |
| Ticket meaning | Number you bought against a huge N | Cents you put in this pot |
| Prize source | Schedule / progressive / leftover sales | The pot itself |
| Typical edge | Often large | Posted fee only (default 0%) |
| Asset | BTC (price risk) | Dollar ledger via USDC or ETH |
| Verify the draw | Sometimes a hash, often an RNG | Hash then reveal on Fairness |

Do not call a 1-in-N satoshi draw a "jackpot" in the PvP sense. Do not call a PvP pot a lottery just because one winner takes the money. The ticket identity is the difference.

PVPspinArena will not sell you a weekly BTC raffle. Open [Jackpot](/) if you want pot tickets, [Coinflip](/coinflip) if you want two-sided pots, or [Roulette](/roulette) if you want the 33-slot wheel.`,
    },
    {
      id: "summary",
      title: "Summary: buy N, or buy a share of a pot",
      body: `A bitcoin lottery is a prize schedule sold in BTC. Odds are 1-in-N. The house edge is whatever the prize table does not return. Progressives are losing tickets piled up. A PvP jackpot is your money as tickets in a single pot.

Legal lotteries in some countries fund public programmes and still have a steep edge. An offshore BTC raffle with a neon jackpot is not automatically a better deal because it uses Bitcoin. Often it is a worse deal plus a harder complaint path.

Use lotteries only if you can state N, the prize table and the edge, and only with money you can lose. Use this site only if you want hashed PvP games in dollars on Base — not a satoshi raffle. Adults aged 18 or over who enjoy a weekly raffle should still be able to write N, the prize table and the expected loss on a scrap of paper. If those three numbers are missing, you are buying a story about Bitcoin, not a priced ticket.

If a page uses both words, make them define ticket identity before you send coins.`,
    },
  ],
  faqs: [
    {
      q: "Is a bitcoin lottery legal?",
      a: "It depends on your country. Paying in BTC does not create a lottery licence or make a foreign draw legal at home. Check the law where you live before you buy tickets.",
    },
    {
      q: "Are satoshi tickets better value?",
      a: "No. A cheaper ticket is a smaller piece of the same 1-in-N machine unless the prize table says otherwise. Satoshi pricing changes the unit, not the edge.",
    },
    {
      q: "Does PVPspinArena run a bitcoin lottery?",
      a: "No. It is not a lottery. Jackpot is a player-versus-player pot funded in dollar terms after a USDC or ETH deposit on Base, and your tickets equal your cents in that pot.",
    },
    {
      q: "Can I verify a lottery draw?",
      a: "Only if the operator publishes a method you can recompute. Many BTC lotteries do not. Ask for the commitment before you buy tickets, and refuse a draw that is only an RNG certificate on a PDF.",
    },
    {
      q: "Why do progressive BTC jackpots look so large?",
      a: "Because they roll. The size is the pile of prior losing tickets (and sometimes a BTC price rise), not a sign that your ticket is hot or that the next draw is due.",
    },
  ],
  sources: [
    { label: "Bitcoin.org — How Bitcoin works", url: "https://bitcoin.org/en/how-it-works" },
    { label: "UK Gambling Commission — Lotteries", url: "https://www.gamblingcommission.gov.uk/" },
    { label: "ethereum.org — Wallets", url: "https://ethereum.org/en/wallets/" },
  ],
  related: [
    "crypto-jackpot",
    "crypto-bingo",
    "crypto-scratch-cards",
    "crypto-horse-racing-betting",
    "sports-betting-with-crypto",
  ],
  updated: "2026-09-26",
};
