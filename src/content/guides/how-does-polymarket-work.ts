import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-does-polymarket-work",
  cluster: "Prediction markets",
  keyword: "how does polymarket work",
  secondary: ["polymarket shares", "polymarket usdc", "polymarket odds"],
  title: "How Does Polymarket Work? Shares, Odds and USDC Payouts",
  description:
    "How Polymarket works step by step: buying yes and no shares, reading prices as odds, USDC deposits, resolution rules and the key risks to know.",
  h1: "How does Polymarket work when you buy yes and no shares",
  answer:
    "How does Polymarket work in practice: you buy Yes or No shares on a written event, priced in cents, and a correct share pays one dollar of the collateral at resolution. A Yes share at 63 cents is a 63 percent price, not a verified probability. Deposits are commonly in USDC. The resolution rule, the dispute path, and the chance you cannot sell are the risks that sit beside the headline. Adults 18+ only. Not financial, legal, or tax advice.",
  facts: [
    "Yes and No are separate shares. A correct share pays the settlement value, often $1.",
    "A 63 cent Yes is a 63% price. The market is not certifying that the event happens 63% of the time.",
    "One hundred Yes shares at 63 cents cost $63 and pay $100 if Yes, for a $37 profit before fees.",
    "USDC is a dollar-pegged token, not a bank deposit. The peg and the wallet are separate risks.",
    "Selling at 70 cents locks that price. It is not the same event as holding to resolution.",
    "Access rules change by region. The site's eligibility check beats a guide's memory.",
  ],
  sections: [
    {
      id: "the-steps",
      title: "The steps, from question to share",
      body: `How does Polymarket work as a sequence. You open a market, which is a question with a deadline and a resolution rule. You choose Yes or No. You pay the current price for shares. If you hold the correct side through resolution, each share settles at the high value in the rules, commonly one unit. If you hold the wrong side, it settles at the low value, commonly zero. Before the deadline you can try to sell to someone else and take the new price instead of waiting.

That is the whole machine. The chart, the comments, and the percent label are displays on top of it. The share is the claim. The rule is what the claim pays. [Crypto prediction markets](/guides/crypto-prediction-markets) defines that object without tying it to one brand. This page is the brand's usual flow, still subject to the text on the market you open.

Adults 18+ only. Shares can expire worthless. This is not financial, legal, or tax advice. The cluster home is [Prediction market guides](/guides/topics/prediction-markets). If a position is no longer money you can lose, use [responsible gambling](/responsible-gambling).

Who may sign up changes. Polymarket has operated under restrictions that have shifted, including US access. This guide will not tell you the current country list and will not describe a way around a block. The eligibility screen is the fact. The legal frame for US readers is [prediction markets and US law](/guides/prediction-market-legal-us).`,
    },
    {
      id: "yes-no",
      title: "Buying Yes shares and No shares",
      body: `Yes and No are two claims on one question. They are not a single toggle with a cosmetic label. You can buy Yes, buy No, or, on some screens, see a price for each. Holding Yes gains when the market decides the event happened. Holding No gains when it decides the event did not. Holding both, in equal size, is closer to holding the collateral than to having an opinion, and fees can make that pair cost more than the settlement.

The order is a trade against other users, through the market's book, not a bet slip the house writes in American odds. The price moves when people pay more or less. Your fill is the price you actually received, which can be worse than the last trade if you lift a thin offer.

Example 1 uses the 63 cent figure from the question people ask. You buy 100 Yes shares at 63 cents. Cost is 100 × $0.63 = $63. If the market resolves Yes, payout is 100 × $1 = $100 and profit is $37 before fees. If it resolves No, payout is $0 and the loss is $63. The 63 cents was never a promise that Yes was "likely." It was the invoice.

A No share at 37 cents is the textbook complement, because 63 + 37 = 100. Fees, and a gap between the buy price and the sell price, can make the two live offers add to something other than a dollar. Read both numbers on the book before you treat them as a neat pair. [Polymarket alternatives](/guides/polymarket-alternatives) is where you compare this shape with other venues. The shape is common. The custody and the rule text are not.`,
    },
    {
      id: "price-versus-probability",
      title: "A 63 cent price is not a verified probability",
      body: `The interface will happily show 63% next to a 63 cent Yes. The translation is arithmetic: 63 / 100 = 0.63. Use it as a description of the price. Refuse it as a measurement of the future. Nobody at the venue ran the event 100 times. Traders paid 63 cents because of beliefs, hedges, boredom, and constraints. Those reasons are not a calibration study.

A verified probability would need a model, a base rate, and an honest error bar. A share price needs a seller. When the book is deep, the price is harder to ignore, because a lot of money disagreed with you and stayed. When the book is a few orders wide, the middle you call "63%" might be a stale print between a 55 cent bid and a 70 cent offer. The chance you feel is then a story about a gap.

This is the same caution as reading odds on any market, and it is sharper here because the display already speaks in percents. [Implied probability](/guides/implied-probability) is how a sportsbook price becomes a percent that still is not the truth. A Polymarket percent skips the American-odds step and still is not the truth.

Do not buy because the number "looks wrong" by ten points. A price that looks wrong may be informed. Disagreeing is allowed. Disagreeing with the rent money is how a nickname on a chart becomes a bill. Write your own percent, subtract fees, and see if the gap survives. If you cannot say what evidence would change your percent, you do not have a percent. You have a side.`,
    },
    {
      id: "usdc",
      title: "USDC deposits and what the token is not",
      body: `Funding is commonly in USDC, a stablecoin designed to track the US dollar. You deposit USDC, you buy shares with it, and a winning share pays out in that collateral. [What USDC is](/guides/what-is-usdc) covers the token: an issuer, a peg, and the ways a peg can fail. A share that pays one USDC pays one token. What that token is worth in dollars on settlement day is a second question, usually a quiet one, and not a question you are allowed to skip forever.

The wallet is a separate risk from the event. On a crypto rail you can send the wrong asset, use the wrong network, or sign an approval that lets another contract move funds. Those losses happen before any market resolves. The deposit screen is the instruction. This guide will not invent an address or a chain for you. If the screen is unclear, stop.

A custodial balance hides the keys and shows a number. Your risk shifts toward the company and its withdrawal queue. A self-custody balance leaves the keys with you. Lose them and you lose the claim. Neither design makes the resolution paragraph optional.

Example 2 is an exit, not a resolution. You bought Yes at 63 cents. The price is now 70 cents and you sell. You lock 7 cents per share before fees, and you no longer care how the event resolves. On 100 shares the sale brings $70 against a $63 cost, a $7 gain before fees. That $7 is a trade result. It is not evidence the event was 70% likely, and it is not the $37 you would have made by holding to a Yes settlement. People mix those two paydays and then feel cheated by the one they did not choose.`,
    },
    {
      id: "resolution",
      title: "Resolution rules finish the definition",
      body: `Until resolution you hold a price. At resolution you hold the rule. The rule names a source: a public page, an official result, a data feed, or a process the market text describes. It names a time. It should name what happens if the source is late, if the event is canceled, or if reasonable readers split on the wording. A market without those sentences is an argument with a chart.

Disputes are part of the product, not a scandal by default. Ambiguous headlines get bought. The only protest that pays is the one the market's dispute window allows. A social post does not settle a share. If you do not know the window, you do not fully know the share.

Two markets can share a headline and pay on different facts. One election market might use a call by a named network. Another might wait on certification. One sports market might include overtime. Another might not. Compare paragraphs when you compare prices. [Election betting odds](/guides/election-betting-odds) is the political version of that reading skill, and it still will not quote a live candidate.

Edge cases are where the plain English fails. A candidate withdraws. A game is postponed past the deadline. A number prints and is revised. The text either maps the case or leaves it to a person or a vote. Mapped cases are dull and useful. Unmapped cases are discretion, even when the interface looks automatic.`,
    },
    {
      id: "risks",
      title: "The risks that survive a correct call",
      body: `You can be right about the event and still lose money. The share can resolve on a source you did not read. The token can be worth less than the dollar you imagined. The book can refuse your exit at the price on the screen. The platform can restrict the region, the market, or the withdrawal. A correct forecast does not insure any of those.

Fees sit on the trade, and a network fee can sit on the deposit and the withdrawal. A small position can be eaten by costs even when the side wins. Read the schedule for your size. This page will not print a percent that will be stale.

| Risk | What it does to a correct opinion |
| --- | --- |
| Resolution text | Pays on a different fact than the one you assumed |
| USDC and the wallet | A token or a key problem arrives before the event |
| Thin book | You cannot sell near 63 cents, so the price is not an exit |
| Region rules | The market or the cash-out is unavailable to you |
| Fees | The edge you thought you had was smaller than the cost |

| Action | Cash in the 63 cent example |
| --- | --- |
| Buy 100 Yes at 63 cents | Pay $63 |
| Resolve Yes | Receive $100, profit $37 before fees |
| Resolve No | Receive $0, lose $63 |
| Sell at 70 cents instead | Receive $70, profit $7 before fees |

The second table is the same example as the prose, put where you can see the fork. Holding and selling are different products. Pick one on purpose.`,
    },
    {
      id: "hashed-pot",
      title: "A hashed pot does not resolve an outside event",
      body: `Polymarket pays because a written event met a rule. A hashed player-versus-player pot pays because a committed draw selected a ticket. On [Jackpot](/), the players fund the pot, a fee is taken at settlement, and a seed maps to the winner. There is no Yes share, no USDC election market, and no 63 cent probability display. A news event cannot change the ticket.

[Fairness](/fairness) recomputes that hash after the seed is published. The check is about the draw. It does not audit a prediction-market resolution source, and Polymarket does not publish a Jackpot seed. PVPspinArena does not host these markets. It offers Jackpot, Coinflip, and Roulette, funded with USDC or ETH on Base. This page states no volume and no fee percent for those games.

Checklist before you buy a share:

- Read the resolution source, the deadline, and the dispute window.
- Treat the cent price as a price. Write your own percent separately.
- Confirm you can fund in the asset the screen names, on the network it names.
- Note the fee on your size and the gap between buy and sell.
- Confirm the site accepts your region. Do not route around a block.
- Decide in advance whether you will hold or sell, and what loss ends it.

Adults 18+ only. Not financial, legal, or tax advice.`,
    },
  ],
  faqs: [
    {
      q: "Does a 63 cent Yes share mean a 63 percent chance?",
      a: "It means a 63 percent price. Dividing 63 cents by one dollar is arithmetic, not a study of how often the event happens. Thin books, fees, and hedges all sit inside that number. One hundred shares at 63 cents cost $63 and pay $100 only if the rule says Yes.",
    },
    {
      q: "What do you deposit on Polymarket?",
      a: "The usual collateral is USDC, a stablecoin that targets the dollar. A winning share pays in that collateral. USDC is not a bank deposit, and a wallet mistake can lose funds before any event resolves. Follow the deposit screen's asset and network. This page will not invent an address.",
    },
    {
      q: "What happens if you sell before the event?",
      a: "You take the sale price and give up the settlement. Bought at 63 cents and sold at 70 cents, 100 shares return $70 against a $63 cost, a $7 gain before fees. That is a different result from holding to a $100 Yes payout or a $0 No payout.",
    },
    {
      q: "Who decides the outcome?",
      a: "The market's resolution rule decides: a named source, a time, and a path for disputes and cancellations. A headline is not the rule. Two markets with the same title can pay on different facts. Social media does not settle the share. Read the dispute window before you need it.",
    },
    {
      q: "Is a Polymarket share the same as Jackpot?",
      a: "No. A share pays if an outside event meets a written test. Jackpot is a hashed player-versus-player pot: players fund it, a committed seed picks the ticket, and Fairness recomputes the draw. PVPspinArena does not list prediction markets. Adults 18+ only.",
    },
  ],
  sources: [
    { label: "Polymarket", url: "https://polymarket.com/" },
    { label: "Polymarket docs", url: "https://docs.polymarket.com/" },
    { label: "Circle, USDC", url: "https://www.circle.com/usdc" },
  ],
  related: [
    "polymarket-alternatives",
    "what-is-usdc",
    "crypto-prediction-markets",
    "election-betting-odds",
  ],
  updated: "2026-10-06",
};
