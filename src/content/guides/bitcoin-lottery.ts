import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bitcoin-lottery",
  cluster: "Lottery",
  keyword: "bitcoin lottery",
  secondary: ["btc lottery", "crypto lottery", "satoshi lottery", "bitcoin jackpot lottery"],
  title: "Bitcoin Lottery Guide: Odds, Jackpots and House Edge",
  description:
    "Understand Bitcoin lottery tickets, draw probabilities, prize funding, custody and payout risks, with original examples separating odds from expected return.",
  h1: "Bitcoin lottery: ticket odds, jackpots and the house edge",
  answer:
    "A bitcoin lottery accepts Bitcoin for entries or pays prizes in BTC. In a simple fair draw with one winner among N equally likely tickets, one ticket has a 1-in-N chance. Your share of eligible tickets determines probability; a retained fee or smaller prize affects the return, not that probability. Number-matching lotteries require a different calculation from their number matrix.",
  facts: [
    "A lottery ticket’s chance is 1 divided by the number of equally likely tickets, if the draw is honest.",
    "House edge in a lottery is the share of ticket sales the operator keeps or leaks to extra tickets.",
    "Progressive prizes look large because they are rare; the extra headline is paid by losing tickets.",
    "BTC denomination adds price risk: the dollar value of a fixed satoshi prize moves with Bitcoin.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What a bitcoin lottery is",
      body: 'A bitcoin lottery is an online draw funded and paid in Bitcoin. You buy one or more tickets. At a posted time, or when a pot of tickets fills, a winning number is chosen. Prizes may be a fixed BTC amount, a share of ticket sales, or a progressive jackpot that rolls until someone hits a rare combination.\n\n"Satoshi lottery" usually means tiny ticket prices, because a satoshi is a small fraction of a BTC. Cheap tickets do not improve the odds. They only change the unit.\n\nIf you hold BTC and wanted a [bitcoin casino](/guides/bitcoin-casino) instead, that is still a different cashier. This site takes USDC and ETH on Base.',
    },
    {
      id: "odds",
      title: "Separate selection probability from payout value",
      body: "In an original one-winner example, 200 equally likely eligible tickets and one ticket held give a 1-in-200 chance. If the prize is 0.01 BTC, that ticket’s expected gross prize contribution is 0.01 / 200 = 0.00005 BTC. Subtract the ticket cost and any applicable fees to estimate net expected value.\n\nA smaller prize does not by itself change the chance of selection. Extra eligible house tickets change the denominator; unequal entry weights change the model. Number-matching products require combination arithmetic rather than a ticket-sales denominator.",
    },
    {
      id: "edge",
      title: "Where the house edge sits in a lottery",
      body: 'The [house edge](/guides/house-edge) of a lottery is the operator\'s expected keep as a fraction of ticket spend.\n\nIf a draw sells $100,000 of tickets and returns $55,000 in prizes in expectation, the house edge is 45%. National lotteries often sit in a high band like that because they fund other purposes. Online BTC lotteries vary. Some return a large share of sales into a visible pot. Some advertise a huge progressive while the par ticket value is poor.\n\nCompute it when you can:\n\n1. Price of one ticket, in BTC and in dollars.\n2. Number of tickets in this draw (or the design N if tickets are unlimited against a random number).\n3. Prize table in the same units.\n4. Expected return = sum of (prize × probability). Edge = 1 − expected return / ticket price.\n\nIf the site will not state N or the prize table, you cannot compute the edge. That is a reason to leave, not a reason to "trust the jackpot photo."\n\nRollover clauses and "must buy 10 tickets to qualify" rules change N for *you* without changing the banner. Bonus tickets that cannot win the top tier are advertising, not odds. A promotional ticket can still require a paid purchase, restrict eligible prizes or carry withdrawal conditions. Count those costs before valuing it.\n\nBTC denomination invites a second error: quoting the jackpot in dollars on a green day and ignoring it on a red day. Pick one unit for the EV calculation and stick to it through the draw.',
    },
    {
      id: "progressive",
      title: "Progressive jackpots and why the headline misleads",
      body: 'A progressive grows because losing tickets donate to a pool. The advertised BTC jackpot can look like a life-changing amount while your ticket still has a 1-in-millions chance.\n\nTwo numbers belong on the same line: jackpot size and jackpot probability. A $2,000,000 prize at 1 in 20,000,000 is an expected $0.10 of jackpot value before any lesser prizes. If the ticket cost $2, the jackpot alone is not a bargain. Lesser prizes may fill some of the gap. They may not.\n\nBTC progressives add a second chart. If the pool is denominated in Bitcoin and BTC rises, the dollar headline grows without anyone hitting. If BTC falls, the dream shrinks. That is price risk, not a hotter game.\n\nNear-miss animations on lottery pages are decoration. They do not alter N. If a UI shows your ticket "one digit off," that is theatre unless the rules pay a near-miss tier you can find in the prize table.',
    },
    {
      id: "example",
      title: "An original ticket-value example",
      body: "Assume a simple fair draw with 2,000,000 equally likely tickets, each costing $0.10, and one $50,000 prize. Buying 200 tickets costs $20 and covers 200 / 2,000,000 = 0.01% of the outcomes. The expected gross prize is 0.0001 × $50,000 = $5, so the expected net result is a $15 loss.\n\nThe example uses dollars only to make the arithmetic clear. A BTC-denominated ticket and BTC-denominated prize should first be compared in BTC; converting to dollars adds exchange-rate risk. Multiple prize tiers require their own probabilities and values.",
    },
    {
      id: "summary",
      title: "Summary: buy N, or buy a share of a pot",
      body: "Legal lotteries in some countries fund public programmes and still have a steep edge. An offshore BTC raffle with a neon jackpot is not automatically a better deal because it uses Bitcoin. Often it is a worse deal plus a harder complaint path.\n\nIf a page uses both words, make them define ticket identity before you send coins.\n\nExplore the [lottery topic](/guides/topics/lottery) for related rules and examples.\n\nContinue with [crypto bingo](/guides/crypto-bingo).\n\nUse [responsible gambling tools](/responsible-gambling) to keep spending within an affordable limit.",
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
      q: "Can I verify a lottery draw?",
      a: "Only if the operator publishes a method you can recompute. Many BTC lotteries do not. Ask for the commitment before you buy tickets, and refuse a draw that is only an RNG certificate on a PDF.",
    },
    {
      q: "Why do progressive BTC jackpots look so large?",
      a: "Because they roll. The size is the pile of prior losing tickets (and sometimes a BTC price rise), not a sign that your ticket is hot or that the next draw is due.",
    },
  ],
  sources: [
    {
      label: "Bitcoin.org — How Bitcoin works",
      url: "https://bitcoin.org/en/how-it-works",
    },
    {
      label: "UK Gambling Commission — Lotteries",
      url: "https://www.gamblingcommission.gov.uk/",
    },
    {
      label: "ethereum.org — Wallets",
      url: "https://ethereum.org/en/wallets/",
    },
  ],
  related: [
    "crypto-bingo",
    "crypto-scratch-cards",
    "crypto-horse-racing-betting",
    "sports-betting-with-crypto",
  ],
  updated: "2026-11-26",
};
