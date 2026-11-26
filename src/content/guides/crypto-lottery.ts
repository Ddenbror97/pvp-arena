import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-lottery",
  cluster: "Lottery",
  keyword: "crypto lottery",
  secondary: ["bitcoin lottery", "on chain lottery", "crypto lotto", "satoshi lottery"],
  title: "Crypto Lottery Guide: Ticket Odds and Jackpots",
  description:
    "Understand crypto lottery tickets, draw probabilities, prize funding, custody and payout risks, with original examples separating odds from expected return.",
  h1: "Crypto lottery: ticket odds, jackpots and draw risk",
  answer:
    "A crypto lottery uses digital assets for entries, prizes or both. In a simple one-winner draw, your chance is your eligible tickets divided by all equally likely tickets. Number-matching games instead use the game’s number matrix. Fees and retained prize funds reduce the payout; they do not automatically reduce the chance of a ticket being selected. Verify the draw procedure, prize funding and withdrawal rules.",
  facts: [
    "A fair lottery ticket’s chance is 1 divided by the number of equally likely tickets in that draw.",
    "House edge is the share of ticket sales the operator keeps, or the value of extra house tickets.",
    "On-chain lotteries still have an edge if the prize table returns less than 100% of sales.",
    "A progressive jackpot looks large because it is rare; losing tickets fund the meter.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What a crypto lottery is selling",
      body: "A crypto lottery is a numbered draw with a crypto cashier. You buy one or more tickets in BTC, ETH, SOL or a stablecoin. At a posted time, or when a ticket cap fills, a winning number is chosen. The prize may be a fixed coin amount, a share of sales, or a jackpot that rolls until a rare combination hits.\n\nThe coin on the cashier does not change the combinatorics. A USDC ticket, an ETH ticket and a satoshi lottery ticket are the same machine if N and the prize table match. Cheap tickets change the unit, not the odds. A “crypto lotto” banner is the same product wearing a shorter name.\n\nThis [lottery](/guides/topics/lottery) guide is generic: ticket identity, draw risk and jackpots across coins. An on chain lottery is a draw method, not a better prize table. The Bitcoin-specific cashier, satoshi pricing and BTC price risk live on the [bitcoin lottery](/guides/bitcoin-lottery) page. Read that next if the site you are looking at is denominated in BTC.\n\nAdults aged 18 or over only. A wallet login is not a lottery licence. Paying in crypto does not make a foreign raffle legal where you live.",
    },
    {
      id: "ticket-odds",
      title: "Choose the probability model that fits the draw",
      body: "If a fair draw selects one winning ticket uniformly from 100 eligible tickets, owning three gives a 3% chance. A retained 10% of sales changes the prize amount, not the 3% selection probability. If the operator adds eligible house tickets, the denominator changes.\n\nFor a number-matching lottery, calculate combinations from the stated number pools instead. Ticket sales need not determine the number of possible winning combinations. Distinguish a verifiable draw procedure from proof that the operator holds enough funds to pay the prize.",
    },
    {
      id: "on-chain-vs-house",
      title: "On-chain draws versus house draws",
      body: "“On-chain” and “house” are draw methods. Neither one is a gift.\n\n### House draws\n\nA house lottery uses a server random-number generator. You see a countdown and a winner photo. You usually cannot recompute the number from public inputs. Some sites paste an RNG certificate after the fact. A PDF is not a commitment you could have checked before you bought.\n\n### On-chain draws\n\nAn on-chain lottery publishes a method: a future block hash, a verifiable random function, or a commit-reveal. In the better designs you can recompute the winning index from the published inputs. That answers “was this draw the one they committed to?” It does not answer “is the prize table fair?”\n\nA perfectly verified 40% RTP raffle is still a 60% keep. Verification is honesty about the number, not generosity about the pot.\n\n### What to demand before you buy\n\n1. How N is defined (sold tickets, or a fixed numeric range).\n2. The prize table in the same unit as the ticket.\n3. Whether the house holds extra tickets.\n4. The commitment, published *before* ticket sales close.\n\nIf those four lines are missing, you are buying a story about crypto, not a priced ticket. Draw risk includes more than “the number might be bent.” It includes a prize schedule that never returned a fair share, and a complaint path that ends at a Telegram admin.",
    },
    {
      id: "jackpots",
      title: "Jackpots: headlines are not ticket value",
      body: "A lottery jackpot is almost never “the pot of this draw.” It is a rare prize funded by a skim from many losing tickets, sometimes rolled across draws. That is the same family of idea as a progressive slot meter. The long-shot maths is on [progressive jackpot odds](/guides/progressive-jackpot-odds).\n\nTwo numbers belong on one line: prize size and hit probability. A $1,000,000 prize at 1 in 25,000,000 is $0.04 of expected jackpot value before lesser prizes. If the ticket cost $2, the jackpot alone is not a bargain. Lesser prizes may fill some of the gap. They may not. Add them. Do not stare at the neon total.\n\nCrypto adds a second chart when the prize is a volatile coin. A “2 BTC jackpot” is a moving dollar headline. Price risk is not a hotter game. If you want a stable unit, a dollar ticket is easier to budget — and still a lottery if N is huge.\n\nNear-miss animations — “you were one digit off” — are decoration unless a published near-miss tier pays. Theatre is not odds.",
    },
    {
      id: "example",
      title: "An original prize-fund calculation",
      body: "Suppose 1,000,000 equally likely tickets sell for $0.20 each and the sole prize is $80,000. One hundred tickets cost $20 and give a 100 / 1,000,000 = 0.01% chance. Expected gross prize is $8; expected net result is a $12 loss.\n\nIf every ticket sells, collections total $200,000 and the stated prize returns 40% of those collections. That is a payout calculation, not evidence that every crypto lottery retains 60%. A real product needs its complete prize table, entry counts and funding rules.",
    },
    {
      id: "summary",
      title: "How to read a listing before you buy",
      body: "A crypto lottery is a prize schedule sold in coins. Odds are 1-in-N. The house edge is whatever the prize table does not return. Progressives are losing tickets piled up. An on-chain hash can prove the number and still leave a steep keep.\n\nLegal national lotteries in some countries fund public programmes and still have a steep edge. An offshore crypto raffle with a neon jackpot is not automatically a better deal because it uses a wallet. Often it is a worse deal plus a harder complaint path.\n\nContinue with [house edge](/guides/house-edge).\n\nUse [responsible gambling tools](/responsible-gambling) to keep spending within an affordable limit.",
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
    {
      label: "Wikipedia: Lottery",
      url: "https://en.wikipedia.org/wiki/Lottery",
    },
    {
      label: "Wizard of Odds: house edge of casino games",
      url: "https://wizardofodds.com/gambling/house-edge/",
    },
  ],
  related: ["bitcoin-lottery", "progressive-jackpot-odds", "house-edge"],
  updated: "2026-11-26",
};
