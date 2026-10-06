import type { Guide } from "./types";

export const guide: Guide = {
  slug: "kalshi-review",
  cluster: "Prediction markets",
  keyword: "kalshi review",
  secondary: ["kalshi fees", "kalshi event contracts", "is kalshi legit"],
  title: "Kalshi Review: Fees, Markets and Is Kalshi Legit?",
  description:
    "Our Kalshi review covers how event contracts work, fees, sports and election markets, withdrawals, legality and who Kalshi is actually right for.",
  h1: "Kalshi review of fees, markets, and who it fits",
  answer:
    "Kalshi review, in one paragraph: Kalshi lists event contracts that trade from 1 cent to 99 cents and pay $1 if the contract is correct. The price is a market quote. Fees sit on a schedule you have to read, because this page will not invent a current percent. Sports and election contracts are not the same thing as a state sportsbook, and Kalshi is not legal, or even offered, in every state. Adults 18+ only. Not financial, legal, or tax advice.",
  facts: [
    "A typical Kalshi contract is quoted from 1 cent to 99 cents and pays $1 if it is correct.",
    "Yes at 40 cents risks 40 cents to make 60 cents before fees, per contract.",
    "The fee schedule changes. Read the line that applies to your size instead of trusting a remembered percent.",
    "CFTC-regulated event contracts are a different legal object from a state-licensed sportsbook ticket.",
    "Some states have challenged sports contracts. Availability in the app is the practical check.",
    "A Kalshi contract is not a hashed player-versus-player pot.",
  ],
  sections: [
    {
      id: "scope",
      title: "What this Kalshi review is deciding",
      body: `A Kalshi review has to separate three questions that ads collapse. What is the contract. What does it cost after fees. Who is allowed to hold it where you live. "Is Kalshi legit" is mostly the third question plus whether you can withdraw, not a vibe about the logo.

Kalshi presents itself as an exchange for event contracts under the Commodity Futures Trading Commission. Confirm that status on Kalshi's own regulatory pages and on cftc.gov, because a guide should not be your only copy of a registration. Exchange status is not a promise that a contract makes money. It is a statement about which rulebook the company claims, and about which regulator built that rulebook.

Adults 18+ only. You can lose the price you pay for a contract. This page is not financial advice, legal advice, or tax advice. The cluster home is [Prediction market guides](/guides/topics/prediction-markets). If the position is money you cannot lose, stop and use [responsible gambling](/responsible-gambling).

Two companion pages carry weight this review will not repeat. [Polymarket versus Kalshi](/guides/polymarket-vs-kalshi) compares the venues. [Prediction markets and US law](/guides/prediction-market-legal-us) is the legal map, including why a national "yes" does not exist.`,
    },
    {
      id: "contract",
      title: "Event contracts priced from 1 cent to 99 cents",
      body: `A typical contract is a yes-or-no claim on a written event. It trades between 1 cent and 99 cents and pays $1 if the outcome matches the side you hold. A Yes quoted at 40 cents costs 40 cents. If Yes is correct, the contract pays $1, so the profit before fees is 60 cents. If No is correct, the contract pays $0 and the loss is the 40 cents you paid.

People read 40 cents as a 40% chance. The honest label is a 40% price. The market can be wrong, thin, or pushed by someone hedging a business. The exchange does not owe you 40 wins in every 100. The settlement paragraph owes you $1 or $0 according to its source, its deadline, and its tie-break rules.

Example 1 scales the same quote. One hundred Yes contracts at 40 cents cost $40. If the event resolves Yes, the payout is $100 and the profit is $60. If it resolves No, the loss is $40. Fees, below, sit on top of that identity. So does the spread: the price to buy and the price to sell are not always the same number, and a last trade you cannot exit is not cash.

The No side of a complete book is the complement before fees. A Yes at 40 cents and a No at 60 cents add to $1. Fees and a wide book can make the two offers add to something else. Read both sides on the screen. [Crypto prediction markets](/guides/crypto-prediction-markets) explains the share in general. Kalshi's version is the exchange's rulebook and its dollar collateral, not a token you have to assume.`,
    },
    {
      id: "fees",
      title: "How to read the fee schedule without a fake percent",
      body: `Kalshi's fees change. A review that printed "the fee is 2%" or any other live percent would be a guess by the time you opened an order. This Kalshi review will not do that. The method is short enough to reuse.

Open the fee schedule in the app or on the help site. Write down what the fee attaches to: the price of the contract, the profit, each side of the trade, settlement, or a membership. Write down whether it is a cent per contract or a percent. Multiply that rule by the number of contracts you will actually trade, not by a round number from a thumbnail.

Example 2 is a fake schedule, labeled so it cannot be quoted as Kalshi's fee. Suppose the schedule charged 1 cent per contract at entry and nothing later. A Yes at 40 cents would cost 41 cents all-in. If it resolves Yes, profit is $1.00 − $0.41 = $0.59. If it resolves No, the loss is $0.41, not $0.40. The 1 cent exists here so you can see the subtraction. Delete it and insert the line from the schedule you opened today.

A small contract is where a fixed cent hurts. Forty contracts at 1 cent would be 40 cents of fee on a position that might only have been $16 of premium. The same cent is a smaller share of a large order. Price your size. Also read whether a fee is charged again when you sell before resolution. An early exit can pay the schedule twice and still be the right risk decision. It should be a decision you made with both charges written down.

If the schedule is ambiguous, do not average it with a number from a forum. Ambiguous means the cost is unknown, and unknown is not zero.`,
    },
    {
      id: "markets",
      title: "Sports, elections, and why this is not a sportsbook",
      body: `Kalshi lists contracts on events people also bet: games, awards, economic prints, and elections. The subject matter overlaps a sportsbook. The legal object does not. A state sportsbook posts American odds under a state gaming license and books the bet as the house. A CFTC-regulated event contract is an exchange instrument. Buyers and sellers meet on the contract, the exchange matches and clears, and the payout is $1 or $0 on the written terms.

That distinction is why this page will not say Kalshi is legal in every state. State regulators have treated some sports event contracts as sports wagering that needs their license. Kalshi has treated those contracts as products a federal exchange may list. Lawsuits and orders have followed. [Prediction markets and US law](/guides/prediction-market-legal-us) holds that disagreement without turning it into a clearance letter. Your screen is the operational test: if a contract is unavailable in your state, it is unavailable, whatever the theory says.

Election contracts add a wording risk that a point spread does not. The resolution source, the date, and the rule for a withdrawn candidate or a recount are the product. Two contracts with the same headline can pay on different sources. Read the source. A price is not a poll, and a poll is not a settlement.

Do not use a sportsbook habit as a translator and then skip the contract text. [Is Kalshi gambling](/guides/is-kalshi-gambling) is the page for the argument about names. This review stays on fees, markets, withdrawals, and fit.`,
    },
    {
      id: "withdrawals",
      title: "Withdrawals, and what legit can mean",
      body: `"Is Kalshi legit" usually means three checks. Is the company the regulated exchange it claims to be. Can you get money out. Are you allowed to use it where you live. The first check is the regulatory page plus the CFTC's own materials, not a screenshot in a group chat. The second check is a small withdrawal you actually complete before you size up. The third check is the app's state rules, which have been contested and which this review refuses to summarize as "all states."

Read the withdrawal page for the rail it uses, the minimum, and any review step. This page will not invent a processing time. A time you remember from last year is not a service level. Identity checks can pause a first withdrawal. That pause is ordinary for a regulated account and still your problem if you needed the money for rent. Keep the stake separate from rent.

Legit does not mean profitable. A registered venue can list a contract whose price is a bad deal after fees. A smooth withdrawal can return the remains of a position that resolved to zero. Use registration as a filter against anonymous cashiers. Use the contract text as the filter against a bad price.

If support is the only record of your balance, export statements while the account is healthy. A dispute is easier with the fill, the fee, and the resolution source saved than with a memory of the cents.`,
    },
    {
      id: "who-it-fits",
      title: "Who a Kalshi contract is actually for",
      body: `The contract fits an adult who can lose the premium, who will read the resolution source, and who has confirmed the app accepts their state. It fits someone pricing an event they understand better than the quote, after fees, with a size small enough that a $0 resolution does not change the month. It is a poor fit if you want a casino game, a parlay card, or a payout you do not have to define.

It is also a poor fit if you need a yes-or-no legal blessing. You will not get one here. Federal exchange rules and state gaming claims are both real descriptions of the fight. They are not a personal opinion you can convert into permission.

| Check | What to record before you buy |
| --- | --- |
| Contract | Event, source, deadline, and the recount or void rule |
| Price | Cents from 1 to 99, and the profit if it pays $1 |
| Fee | The schedule line for your size, dated today |
| Access | Whether the app accepts your state for this contract |
| Exit | Whether you can sell, and what a second fee would cost |

| Buyer | A Kalshi contract is a fit when |
| --- | --- |
| You can lose the premium | The stake is the price you pay, and it can go to zero |
| You will read the source | Settlement follows the paragraph, not the headline |
| Your state is accepted | The app says so today, and you are not routing around a block |
| You want a pot instead | It is not a fit. Use a hashed pot, described next |`,
    },
    {
      id: "hashed-pot",
      title: "A hashed player-versus-player pot is not an event contract",
      body: `Kalshi pays $1 if a written event happens. A hashed player-versus-player pot pays the players who funded it, according to a draw. On [Jackpot](/), the pot is the buy-in. A fee is taken when the round settles. A seed committed before the result maps to a winning ticket. Nothing about an election, a game, or a data print is inside that draw.

[Fairness](/fairness) checks the published seed against the hash. The check can show that the ticket matches the commit. It cannot show that an event contract used the right resolution source. Kalshi does not settle Jackpot, and Jackpot does not list event contracts.

PVPspinArena offers Jackpot, Coinflip, and Roulette, funded with USDC or ETH on Base. It does not offer Kalshi. This review cites no volume, no user count, and no fee percent for those games. Choose the object. A 40-cent contract is a priced claim on the outside world. A Jackpot ticket is a share of a pot.

Checklist before the order:

- Read the resolution source and the deadline.
- Write the premium you lose if the contract pays $0.
- Apply today's fee schedule to your size. Do not reuse the fake 1 cent from this page.
- Confirm the app accepts your state. Do not treat a block as optional.
- Withdraw a small test before you scale.
- Stop if you are adding size to win back a resolved loss.

Adults 18+ only. Not financial, legal, or tax advice.`,
    },
  ],
  faqs: [
    {
      q: "How much does a Kalshi contract pay?",
      a: "A typical contract is priced from 1 cent to 99 cents and pays $1 if your side is correct. Yes at 40 cents risks 40 cents to make 60 cents before fees. One hundred such contracts cost $40 and pay $100 if Yes. Fees and the spread change the all-in result.",
    },
    {
      q: "What is Kalshi's current fee percent?",
      a: "This review does not print one. The schedule changes, and a remembered percent is how people mis-price a small order. Open the schedule, see whether the fee hits price, profit, or settlement, and multiply by the size you will trade. The 1 cent example above is fake.",
    },
    {
      q: "Is Kalshi legal in every state?",
      a: "No. This page will not say that. CFTC exchange rules and state challenges to sports contracts are different claims, and courts have not issued one national permission slip. If the app blocks your state or a contract, that block is the practical answer for today.",
    },
    {
      q: "Is Kalshi the same as a sportsbook?",
      a: "The topics can overlap. The product does not. A sportsbook ticket is a state-licensed wager against the book. A Kalshi contract is an exchange instrument quoted in cents and paid at $1 if correct. Read the resolution source. Do not translate American odds and skip the text.",
    },
    {
      q: "Is a Kalshi contract the same as Jackpot?",
      a: "No. Kalshi settles a written event. Jackpot is a hashed player-versus-player pot funded by players and checked on the Fairness page after the seed is published. A news result does not move that pot. Adults 18+ only. This is not legal advice.",
    },
  ],
  sources: [
    { label: "Kalshi", url: "https://kalshi.com/" },
    { label: "Commodity Futures Trading Commission", url: "https://www.cftc.gov/" },
    { label: "National Council on Problem Gambling", url: "https://www.ncpgambling.org/" },
  ],
  related: [
    "polymarket-vs-kalshi",
    "prediction-market-legal-us",
    "is-kalshi-gambling",
    "crypto-prediction-markets",
  ],
  updated: "2026-10-06",
};
