import type { Guide } from "./types";

export const guide: Guide = {
  slug: "is-kalshi-gambling",
  cluster: "Prediction markets",
  keyword: "is kalshi gambling",
  secondary: ["kalshi gambling or trading", "kalshi cftc", "kalshi state lawsuits"],
  title: "Is Kalshi Gambling? What the Law and Regulators Say",
  description:
    "Is Kalshi gambling or trading? We break down CFTC rules, state lawsuits, how event contracts differ from sports bets and what it means for you.",
  h1: "Is Kalshi gambling, or something regulators still split on",
  answer:
    "Is Kalshi gambling a question with more than one official answer. The Commodity Futures Trading Commission framework treats listed event contracts as exchange instruments. Several state gaming authorities have argued that sports contracts are wagers that need a state license, and they have sued or ordered stops. Those positions disagree. This page will not collapse them into a yes or a no and call that the law. Adults 18+ only. Not legal, financial, or tax advice.",
  facts: [
    "There is no single legal yes or no this page can hand you.",
    "Kalshi's own account is that it lists event contracts on a CFTC-regulated exchange.",
    "State gaming cases have treated some sports contracts as illegal wagering under state law.",
    "A contract priced at 30 cents can lose 30 cents. That loss shape is why people call it a bet.",
    "A state sportsbook ticket and an event contract cite different rulebooks even on the same game.",
    "The argument does not turn the contract into a hashed player-versus-player pot.",
  ],
  sections: [
    {
      id: "no-verdict",
      title: "Why this page will not give a yes or a no",
      body: `Is Kalshi gambling gets typed like a question with a one-word answer. The word people want is permission. A permission slip would have to be true in every courtroom that has touched the product, and that is not the record. Federal derivatives law and state gaming statutes are both being argued. They are not synonyms, and a blog does not get to pick the winner.

What you can take from this page is a map. Who calls the contract a regulated instrument. Who calls it a wager. How the dollars behave either way. What you should do with your own money while the map is unfinished. The map is not a ruling. If you need a ruling, you need a lawyer in your state and the primary documents, not a guide.

Adults 18+ only. Whatever the label, the premium you pay can go to zero. This is not legal advice, financial advice, or tax advice. Start from [Prediction market guides](/guides/topics/prediction-markets). The product tour, fees included, is the [Kalshi review](/guides/kalshi-review). The wider US frame is [prediction markets and US law](/guides/prediction-market-legal-us).

[Is crypto gambling legal](/guides/is-crypto-gambling-legal) answers a neighboring question about casino-style crypto wagering. Do not paste that answer onto an event contract. The statutes people cite are different.`,
    },
    {
      id: "cftc",
      title: "What the CFTC framework calls the contract",
      body: `The Commodity Futures Trading Commission regulates designated contract markets. Kalshi's public position is that it is one of those markets and that the contracts it lists are event contracts under the Commodity Exchange Act, not sportsbook tickets under a state gaming act. The Commission has its own limits on what an exchange may list, including a long argument about gaming and about contracts that look like wagers. Those limits have been fought in rulemakings and in court. A sentence that said "the CFTC allows every Kalshi market" would be false to that history.

Read the primary pages. The Commission's site is the regulator's voice. Kalshi's regulatory disclosures are the company's voice. This guide is a third voice, and it is the least important of the three when they conflict. Registration, if you confirm it, means the exchange is inside a federal perimeter. It does not mean a state attorney general has agreed that perimeter erases state gambling law. Preemption is the legal fight. It is not a fact you can borrow from a marketing line.

For you, the practical piece of the federal story is the contract specification. The event, the source that settles it, and the rules for an ambiguous outcome are what you hold. A regulated label does not rewrite a sloppy specification into a clear one. If you cannot find the source, you do not yet know what you bought, whatever the agency chart says.

Keep the category and the payout apart. Calling it a derivative does not change a $0 settlement into a refund.`,
    },
    {
      id: "states",
      title: "What state lawsuits and orders have argued",
      body: `State gaming regulators license sportsbooks. Several of them have looked at sports event contracts and said the activity is sports wagering in their state, offered without the license they require. The tools they have used include lawsuits and orders telling the company to stop offering those contracts to their residents. Kalshi has answered that federal exchange law controls and that states cannot reclassify a listed contract as a local bet.

This page will not narrate each docket as if the story were finished. Cases move. A win in one federal court is not a statute in every state. A cease-and-desist that was later stayed is not the same as a cease-and-desist that is in force. Quoting a headline from either side as "the law" is how readers get a verdict this guide refuses to give.

What the lawsuits do establish, without a final national answer, is disagreement. Serious state officials have been willing to call the sports product gambling. The company has been willing to call it trading. Both statements are claims in a live argument. Your account screen may already reflect one side of that argument by blocking a state or a sport. Believe the screen over a thread that says the block is temporary or illegitimate. This guide will not tell you how to evade it.

Election and economic contracts are not automatically inside the same state theory as a point-spread lookalike. Do not assume a lawsuit about games decides a contract about a data release, or the reverse. Read the market you mean to trade.`,
    },
    {
      id: "payoff",
      title: "Why the payoff still feels like a stake",
      body: `Set the lawsuits aside for one page of arithmetic. The dollars do not wait on a caption. Example 1: you buy Yes at 30 cents. If the contract resolves Yes, it pays $1 and your profit before fees is 70 cents. If it resolves No, you lose the 30 cents. The most you can lose on that contract is the price you paid. That is the shape of a stake. People call it gambling because the stake can vanish on an uncertain event. People call it trading because you can sell the contract to someone else before the event, at a new price, the way a position changes hands.

Both descriptions fit the cashflows. Neither description is the legal verdict. A thing can have the payoff of a bet and the plumbing of an exchange. The fee schedule and the bid-ask spread decide whether the middle is as clean as the 30-cent story. A contract you cannot sell is just the stake until resolution.

Example 2 uses 50 contracts at that same 30 cents. Cost is 50 × $0.30 = $15. If Yes, payout is 50 × $1 = $50 and profit is $35 before fees. If No, the loss is $15. Scaling does not create a new product. It multiplies the stake. If you are sizing up to get back a loss, the legal label is irrelevant and the behavior is the problem. Stop.

The price is still not a measured probability. Thirty cents is what the book of orders will charge you. [Kalshi review](/guides/kalshi-review) walks the fee method without inventing today's percent. Subtract the fee before you compare 30 cents with your own estimate of the event.`,
    },
    {
      id: "sportsbook",
      title: "How an event contract differs from a sports bet",
      body: `A sports bet at a state sportsbook is a wager against the book at American or decimal odds. The book sets the price, takes the other side, and holds a license from the state gaming authority. You generally cannot sell the ticket to a stranger at a new price, though some books offer a cash-out that is just the book buying it back on its own terms.

An event contract on an exchange is a position in a listed instrument. The quote is in cents. Someone else can hold the other side. The exchange clears the trade. The document you need is the contract specification, not a bet slip's house rules, though the specification can still void, delay, or define a messy event. The regulator the company names is the CFTC. The regulator the state names, in the lawsuits, is itself.

| Piece | State sportsbook ticket | Kalshi-style event contract |
| --- | --- | --- |
| Price | American or decimal odds | 1 cent to 99 cents, pays $1 if correct |
| Counterparty | The book | Another participant, cleared by the exchange |
| License people cite | State gaming commission | CFTC exchange status, disputed by some states |
| Selling early | Cash-out if the book offers it | A trade, if the book of orders is there |
| Worst loss | The stake, usually | The premium you paid, before extra fees |

Same game on both rows can still be two products. Do not place one because a court said something about the other. Do not assume a block on one means the other is blessed.`,
    },
    {
      id: "for-you",
      title: "What the disagreement means for your money",
      body: `While regulators disagree, you still decide whether to pay the premium. The decision is not a legal conclusion. It is a loss limit plus an eligibility check. If the app will not open the contract in your state, you do not have a trade. If the app will open it, you still might be inside a fight that later restricts the market, freezes a listing, or changes how it settles. That is part of the risk of a product whose category is argued in public.

Age rules apply on top. Eighteen is the floor to read this page. The account may require more. Taxes may not follow casino withholding even when the payoff feels like a bet, and they may still apply. This page will not tell you which form to file. A preparer and the IRS pages can. The label "trading" is not a tax exemption you can assume.

If you are using the lawsuit as a reason to deposit more, you have left the question this page can help with. The honest consumer stance is boring. Confirm the source that settles the contract. Assume the premium can be lost. Read the fee on your size. Believe a geo-block. Keep the amount inside entertainment money.

| If you need | Use |
| --- | --- |
| The payout and the fee method | The Kalshi review on this site |
| The US legal map, hedged | Prediction markets and US law |
| Casino-style crypto rules | The separate crypto-gambling legality guide |
| A personal legal opinion | A lawyer, not this page |`,
    },
    {
      id: "hashed-pot",
      title: "A hashed pot does not settle the legal fight",
      body: `None of the CFTC filings or the state complaints turn an event contract into a hashed player-versus-player pot. On [Jackpot](/), players fund one pot and a committed seed picks a ticket. The outcome is a draw, published so it can be checked. It is not an election, a total, or a data print. State gaming law and federal exchange law are the wrong captions for that draw, and this page will not pretend a Jackpot ticket answers "is Kalshi gambling."

[Fairness](/fairness) recomputes the hash after the seed is out. The recomputation tests the draw. It does not test whether a state court will call an event contract a wager. Kalshi does not run that pot. PVPspinArena does not list event contracts. The games here are Jackpot, Coinflip, and Roulette, funded with USDC or ETH on Base. No user count and no fee percent are stated, because this guide is not a performance ad.

Checklist while the category is disputed:

- Do not treat this page as a yes or a no.
- Read the contract source, not the headline.
- Confirm the app allows your state, and do not route around a block.
- Risk only the premium you can lose.
- Keep lawsuit news out of your stake size.
- Use Fairness only for a hashed pot, not as a legal cite.

Adults 18+ only. Not legal, financial, or tax advice.`,
    },
  ],
  faqs: [
    {
      q: "So is Kalshi gambling, yes or no?",
      a: "This page will not say yes or no and call it the law. The CFTC exchange framework and state gaming lawsuits describe the same sports contracts in different categories. Courts have not produced one rule for every state. Your app's block or acceptance is the practical fact for today, not a verdict.",
    },
    {
      q: "Why do state regulators call sports contracts bets?",
      a: "Their claim is that a contract on a game is sports wagering under state law and needs their license. The company's claim is that a listed event contract is a federal exchange product states cannot reclassify. Both are arguments in active disputes. A headline about one hearing is not the national answer.",
    },
    {
      q: "Does the CFTC label make the contract safe?",
      a: "A regulated venue is a different risk from an anonymous site. It is not a promise you will be paid a profit, and it does not stop a contract from settling at $0. Confirm the status on official pages. You can still lose the premium, and some states still dispute sports listings.",
    },
    {
      q: "How much can you lose on a 30-cent contract?",
      a: "The premium. Fifty contracts at 30 cents cost $15, which is the loss if that side pays $0, before any extra fee. If the side pays $1, the payout is $50 and the profit is $35 before fees. Selling early replaces those end states with whatever price you can actually get.",
    },
    {
      q: "Does this disagreement apply to Jackpot?",
      a: "No. Jackpot is a hashed player-versus-player pot on this site, checked on the Fairness page. It does not list event contracts and it is not Kalshi. Use the Kalshi review for the product, and use a lawyer for a personal legal question. Adults 18+ only.",
    },
  ],
  sources: [
    { label: "Commodity Futures Trading Commission", url: "https://www.cftc.gov/" },
    { label: "Kalshi", url: "https://kalshi.com/" },
    { label: "National Council on Problem Gambling", url: "https://www.ncpgambling.org/" },
  ],
  related: [
    "kalshi-review",
    "prediction-market-legal-us",
    "is-crypto-gambling-legal",
    "polymarket-vs-kalshi",
  ],
  updated: "2026-10-06",
};
