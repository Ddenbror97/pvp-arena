import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-lottery",
  cluster: "Games & odds",
  keyword: "crypto lottery",
  secondary: ["bitcoin lottery", "on chain lottery", "crypto lotto", "satoshi lottery"],
  title: "Crypto Lottery Guide: Ticket Odds and Jackpots",
  description:
    "How a crypto lottery works: ticket odds, on-chain versus house draws, jackpots, and why a PvP pot is a different product from a lottery.",
  h1: "Crypto lottery: ticket odds, jackpots and draw risk",
  answer:
    "A crypto lottery sells numbered tickets or shares in a draw and pays winners in coins or a dollar token. Ticket odds are 1 divided by the number of equally likely tickets, then cut by any extra house tickets or a withheld prize slice. On-chain draws publish a random source you can check; house draws often do not. A jackpot is usually a rare prize funded by losing tickets, not a pot you share. That product is not a PvP stake.",
  facts: [
    "A fair lottery ticket’s chance is 1 divided by the number of equally likely tickets in that draw.",
    "House edge is the share of ticket sales the operator keeps, or the value of extra house tickets.",
    "On-chain lotteries still have an edge if the prize table returns less than 100% of sales.",
    "A progressive jackpot looks large because it is rare; losing tickets fund the meter.",
    "PVPspinArena is not a crypto lottery. Jackpot is a PvP pot: your cents in are your tickets in that pot.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What a crypto lottery is selling",
      body: `A crypto lottery is a numbered draw with a crypto cashier. You buy one or more tickets in BTC, ETH, SOL or a stablecoin. At a posted time, or when a ticket cap fills, a winning number is chosen. The prize may be a fixed coin amount, a share of sales, or a jackpot that rolls until a rare combination hits.

The coin on the cashier does not change the combinatorics. A USDC ticket, an ETH ticket and a satoshi lottery ticket are the same machine if N and the prize table match. Cheap tickets change the unit, not the odds. A “crypto lotto” banner is the same product wearing a shorter name.

This [games and odds](/guides/topics/games-and-odds) guide is generic: ticket identity, draw risk and jackpots across coins. An on chain lottery is a draw method, not a better prize table. The Bitcoin-specific cashier, satoshi pricing and BTC price risk live on the [bitcoin lottery](/guides/bitcoin-lottery) page. Read that next if the site you are looking at is denominated in BTC.

Adults aged 18 or over only. A wallet login is not a lottery licence. Paying in crypto does not make a foreign raffle legal where you live.

PVPspinArena is not a lottery, not a sportsbook and not a raffle hall. Its Jackpot game is a hashed player-versus-player pot. Every cent you add is a ticket to that pot. One player takes what remains after any posted fee.`,
    },
    {
      id: "ticket-odds",
      title: "Ticket odds: N is the whole honest story",
      body: `If a draw sells 50,000 equally likely tickets and you hold 1, your chance of first prize is 1 in 50,000, or 0.002%, if the draw is honest. If you hold 25 tickets, it is 25 in 50,000, or 0.05%. Linearity is the entire clean model.

Operators muddy N in four ways:

- **Extra tickets.** The house keeps virtual tickets, a “house share,” or a bot player. Your 1-of-N becomes 1-of-(N + house).
- **Unlimited tickets against a huge range.** The interface looks like “buy as many as you want,” but the draw is a random integer in a fixed range. Your chance is one over that range, not one over “how many people showed up.”
- **Tiered prizes.** Consolation bands make “you can win” true while the top prize stays microscopic.
- **Rollover rules.** “Must hold 10 tickets to qualify” changes N for you without changing the banner.

Write N before you send coins. If the page will not state N, or the range the RNG uses, you cannot price the ticket. That is a reason to leave.

Late sales matter. If tickets stay on sale after a “winning number” commitment is already determined, early buyers and late buyers are not in the same game. Demand that sales close *before* the random source is fixed. A countdown clock is not a close. A posted block height or a locked ticket count is a close.

You cannot beat a 1-in-N draw by picking “lucky” numbers. Buying 10 times the tickets multiplies your chance by 10 and your spend by 10. The edge percentage does not improve. The [house edge](/guides/house-edge) of a lottery is whatever the prize table does not return.

A state jackpot uses the same combination count. The [odds of winning the lottery](/guides/odds-of-winning-the-lottery) cover Powerball, Mega Millions, and the smaller games.`,
    },
    {
      id: "on-chain-vs-house",
      title: "On-chain draws versus house draws",
      body: `“On-chain” and “house” are draw methods. Neither one is a gift.

### House draws

A house lottery uses a server random-number generator. You see a countdown and a winner photo. You usually cannot recompute the number from public inputs. Some sites paste an RNG certificate after the fact. A PDF is not a commitment you could have checked before you bought.

### On-chain draws

An on-chain lottery publishes a method: a future block hash, a verifiable random function, or a commit-reveal. In the better designs you can recompute the winning index from the published inputs. That answers “was this draw the one they committed to?” It does not answer “is the prize table fair?”

A perfectly verified 40% RTP raffle is still a 60% keep. Verification is honesty about the number, not generosity about the pot.

### What to demand before you buy

1. How N is defined (sold tickets, or a fixed numeric range).
2. The prize table in the same unit as the ticket.
3. Whether the house holds extra tickets.
4. The commitment, published *before* ticket sales close.

If those four lines are missing, you are buying a story about crypto, not a priced ticket. Draw risk includes more than “the number might be bent.” It includes a prize schedule that never returned a fair share, and a complaint path that ends at a Telegram admin.`,
    },
    {
      id: "jackpots",
      title: "Jackpots: headlines are not ticket value",
      body: `A lottery jackpot is almost never “the pot of this draw.” It is a rare prize funded by a skim from many losing tickets, sometimes rolled across draws. That is the same family of idea as a progressive slot meter. The long-shot maths is on [progressive jackpot odds](/guides/progressive-jackpot-odds).

Two numbers belong on one line: prize size and hit probability. A $1,000,000 prize at 1 in 25,000,000 is $0.04 of expected jackpot value before lesser prizes. If the ticket cost $2, the jackpot alone is not a bargain. Lesser prizes may fill some of the gap. They may not. Add them. Do not stare at the neon total.

Crypto adds a second chart when the prize is a volatile coin. A “2 BTC jackpot” is a moving dollar headline. Price risk is not a hotter game. If you want a stable unit, a dollar ticket is easier to budget — and still a lottery if N is huge.

A [crypto jackpot](/guides/crypto-jackpot) in the PvP sense is a different sentence: players’ money is the pot, tickets equal contributions, one winner, a posted fee. There is no rolled-over progressive taking a silent bite unless the product says so.

Near-miss animations — “you were one digit off” — are decoration unless a published near-miss tier pays. Theatre is not odds.`,
    },
    {
      id: "example",
      title: "Worked example: 100 tickets versus a $20 PvP pot",
      body: `Sam has $20 that can be lost.

**Lottery path.** A crypto lottery sells tickets at $0.20. This draw has 1,000,000 equally likely tickets and a single $80,000 prize (a cartoon table so the arithmetic is visible). Sam buys 100 tickets.

| Step | Number |
| --- | --- |
| Chance of the prize | 100 / 1,000,000 = 0.01% |
| Expected prize value | 0.0001 × $80,000 = $8 |
| Spend | $20 |
| Expected loss | $12 |
| House keep if the prize is funded from full sales | ($200,000 − $80,000) / $200,000 = 60% |

Real rooms mix a smaller posted prize and a progressive. The method stays: prize table times probabilities, minus ticket cost. If Bitcoin or ETH is the prize unit, redo the dollar line when the chart moves.

**PvP path.** Sam puts $20 into a PVPspinArena Jackpot that already has $80. Sam now holds 20% of the tickets in *that* pot.

1. If the fee is 0% and nobody else joins, there is a 20% chance to take $100. Expected value is $20.
2. If two more players add $20 each, the pot is $140 and Sam has 20/140 of the tickets. Expected value is still about $20 before a fee.
3. A 1% fee would shave $1.40 off a $140 pot. That is a posted cost, not a hidden 60% prize withhold.

The lottery bought a long shot against a withheld prize. The PvP pot bought a share equal to the money in. Different products. Neither is “due.”`,
    },
    {
      id: "not-pvp",
      title: "Why a PvP pot is not a crypto lottery",
      body: `| Feature | Crypto lottery | PvP Jackpot on this site |
| --- | --- | --- |
| Ticket meaning | Number you bought against a huge N | Cents you put in this pot |
| Prize source | Schedule, progressive, leftover sales | The pot itself |
| Typical edge | Often large | Posted fee only (default 0%) |
| Draw | House RNG or on-chain random | Hash then reveal on Fairness |
| Asset | Any advertised coin | Dollar ledger via USDC or ETH on Base |

Do not call a 1-in-N raffle a “jackpot” in the PvP sense. Do not call a PvP pot a lottery just because one winner takes the money. The ticket identity is the difference.

PVPspinArena will not sell you a weekly raffle. Open [Jackpot](/) if you want pot tickets, [Coinflip](/coinflip) if you want two-sided pots, or [Roulette](/roulette) if you want the 33-slot wheel. The [Fairness](/fairness) page is where a finished round is checked — not a lottery PDF.

If a landing page uses both words, make them define ticket identity before you send coins. “Crypto lottery jackpot” is usually a raffle wearing a pot costume.

On-chain ticket NFTs do not change N. A pretty token that says “ticket #1842” is still one of however many were minted. If minting never closes, N is the range, not the live holder count. Ask which.`,
    },
    {
      id: "summary",
      title: "How to read a listing before you buy",
      body: `A crypto lottery is a prize schedule sold in coins. Odds are 1-in-N. The house edge is whatever the prize table does not return. Progressives are losing tickets piled up. An on-chain hash can prove the number and still leave a steep keep.

Use a lottery only if you can state N, the prize table and the expected loss, and only with money you can lose. Use this site only if you want hashed PvP games in dollars on Base — not a raffle.

Legal national lotteries in some countries fund public programmes and still have a steep edge. An offshore crypto raffle with a neon jackpot is not automatically a better deal because it uses a wallet. Often it is a worse deal plus a harder complaint path.

Adults who enjoy a weekly raffle should still be able to write N, the prize table and the expected loss on paper. If those three numbers are missing, you are buying a story. If the story is in Bitcoin, switch to the bitcoin lottery guide for denomination risk. If the story is “everyone’s tickets are the pot,” you may be looking at a PvP product — and then you should demand a published share, not a mystery N.`,
    },
  ],
  faqs: [
    {
      q: "Is a crypto lottery legal?",
      a: "It depends on your country. Paying in crypto does not create a lottery licence or make a foreign draw legal at home. Check the law where you live before you buy tickets.",
    },
    {
      q: "Are cheaper tickets better value?",
      a: "No. A cheaper ticket is a smaller piece of the same 1-in-N machine unless the prize table says otherwise. Pricing changes the unit, not the edge.",
    },
    {
      q: "Does an on-chain draw remove the house edge?",
      a: "No. An on-chain random source can prove which number was drawn. The edge still sits in extra house tickets and in a prize table that returns less than sales.",
    },
    {
      q: "Does PVPspinArena run a crypto lottery?",
      a: "No. It is not a lottery. Jackpot is a player-versus-player pot funded in dollar terms after a USDC or ETH deposit on Base, and your tickets equal your cents in that pot.",
    },
    {
      q: "How is this different from a bitcoin lottery?",
      a: "Same ticket maths, different cashier. The bitcoin lottery guide covers BTC denomination and price risk. This page stays on generic ticket odds, draw types and jackpots.",
    },
    {
      q: "Why do crypto lottery jackpots look so large?",
      a: "Because they roll. The size is the pile of prior losing tickets, not a sign that your ticket is hot or that the next draw is due.",
    },
  ],
  sources: [
    {
      label: "Powerball — official prize chart and odds",
      url: "https://www.powerball.com/powerball-prize-chart",
    },
    { label: "Wikipedia: Lottery", url: "https://en.wikipedia.org/wiki/Lottery" },
    {
      label: "Wizard of Odds: house edge of casino games",
      url: "https://wizardofodds.com/gambling/house-edge/",
    },
  ],
  related: ["bitcoin-lottery", "progressive-jackpot-odds", "house-edge", "crypto-jackpot"],
  updated: "2026-09-26",
};
