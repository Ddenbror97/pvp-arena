import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-prediction-markets",
  cluster: "Foundations",
  keyword: "crypto prediction markets",
  secondary: ["event share markets", "crypto event contracts"],
  title: "Crypto Prediction Markets: Shares That Pay on Events",
  h1: "Crypto Prediction Markets: Shares That Pay on Events",
  description:
    "Crypto prediction markets sell a share that pays if an event happens. Learn what the product is, then use the comparison page to judge a specific venue.",
  answer:
    "Crypto prediction markets are places to trade a share that pays if an event happens. You might see a question about an election, a sports result, a price level, or a date a public body will act. You pay a price in a crypto asset, often a stablecoin. If the event meets the contract’s test, the share settles at the published high value. If it does not, the share settles at the published low value, which may be zero. That payoff is the product. Everything else is venue, rail, and interface.\n\nThis page explains the object. It does not rank venues and it does not invent volume. When you already understand the share and you want to compare stand-ins, use [polymarket alternatives](/guides/polymarket-alternatives). When you are thinking about wallet-based casino games and need that separate definition, use [web3 casino](/guides/web3-casino). Those are neighboring topics. They are not the same article as this one.\n\nThis page is for adults 21 and older. A share can expire worthless. If putting money on an event stops being entertainment you can afford, stop and use the limits on our [responsible gambling](/responsible-gambling) page. Whether a given venue may accept you is a legal question this page does not decide. Rules change. PVPspinArena does not list these markets. It offers jackpot, coinflip, and roulette in USD only.",
  facts: [],
  sections: [
    {
      id: "the-share-and-the-two-settlements",
      title: "The share and the two settlements",
      body: "Picture a contract with two end states and a price in between. The contract names an event, a deadline, and a resolution method. It names a settlement value if the event qualifies and a settlement value if it does not. Traders buy and sell the claim before the deadline. The price they trade is their business. The end values are the contract’s business.\n\nA common shape is a share that settles at one unit of the collateral if the answer is yes and at zero if the answer is no. That shape is common. It is not universal. Some contracts pay a different pair of numbers. Some split one collateral pot across more than two outcomes. Read the pair or the split on the market you open. A mental model of “one dollar or nothing” will mis-state a contract that says something else, and it will mis-state a contract denominated in a token that is not a dollar.\n\nYou can often sell before resolution. Selling transfers the claim to someone else at the new price. You lock in that price, minus fees, and you leave the final settlement to the buyer. If you hold through resolution, you get the settlement value, not the last trade. People blur those moments. A last trade of 0.90 is not a settlement of 0.90. Settlement still follows the event.\n\nFees sit on the trade, the settlement, or both. A network fee can sit on the deposit and the withdrawal if the rail is a public chain. None of those fees is the event. They are the cost of holding the claim. A small position can be eaten by fees even when the event goes your way. Read the schedule for the size you mean to trade.\n\nThe contract should also say what happens if the event is canceled, postponed, or too ambiguous to call. Void, delayed resolution, and a committee tie-break are different outcomes. A void that returns the last price, a void that returns a fixed amount, and a forced yes are three different products. The heading “rules” under the market is the product. The chart is only the trading.\n\nOne venue where a share pays a dollar if the event happens is [how Polymarket works](/guides/how-does-polymarket-work).",
    },
    {
      id: "the-price-is-a-trade-and-people-read-it-as-a-cha",
      title: "The price is a trade, and people read it as a chance",
      body: "Because a yes-share is worth more when traders think the event is likelier, the price drifts between the low settlement and the high settlement as beliefs and hedges change. A price of 0.62 on a zero-to-one share is often described as a 62 percent chance. That description is a translation. It is useful as a translation of the crowd’s current willingness to pay. It is not a measurement of the future, and the venue does not owe you 62 wins out of 100.\n\nThe translation also ignores fees, the risk that resolution is disputed, and the risk that you cannot sell when you want. A 0.62 quote you cannot exit is not the same object as a 0.62 quote in a deep book. This page will not pretend to know which markets are deep. Depth is local and it changes. If the order book shows you a wide gap between the price to buy and the price to sell, the “chance” you read off the middle is a story about a thin market.\n\nTraders buy for reasons that are not pure belief. Someone may hedge a business exposure. Someone may be forced to exit. Someone may be wrong. The price mixes all of that. Calling it a prediction is fair as a nickname and sloppy as a promise. The promise, if any, is the settlement rule. The nickname is the chart.\n\nA sportsbook line is a related but different display. The book posts a price and takes the other side under its own margin. A prediction market often matches buyers and sellers against each other, with the venue charging a fee and holding collateral until the rule pays someone. You can lose on either product. The counterparty structure is not the same. Learning the line-to-payout path of a sportsbook will not tell you who pays an event share. The contract tells you.\n\nNothing here is an instruction to trade because a price “looks wrong.” A price that looks wrong may be informed, illiquid, or both. Disagreeing is allowed. Disagreeing with money you cannot lose is how a nickname becomes a bill.",
    },
    {
      id: "crypto-is-the-rail",
      title: "Crypto is the rail",
      body: "“Crypto” in the name is about how value moves, not about a special ability to see the future. Collateral may be a stablecoin pegged, with whatever risk that peg carries, to the US dollar. Collateral may be a volatile token, in which case the event risk and the token’s own price risk stack. A share denominated in a moving token can look profitable in token units and poor in USD, or the reverse. If you think in dollars, track dollars.\n\nDeposits and withdrawals can require a network fee and a wait for confirmation. Sending the wrong asset on the wrong network is a common way to lose funds before any event resolves. The venue’s cashier page is the instruction. A general article should not invent an address or a chain for you. If the cashier is unclear, do not guess.\n\nSelf-custody venues add keys. The share lives in a wallet you control, or in a contract that recognizes that wallet. Lose the key and you lose the claim. Sign a bad approval and a contract you did not mean to trust can move tokens. Those are crypto-rail risks. They sit beside the event risk. They do not replace it. A perfect call on the event still fails if the funds never arrive or the wallet is compromised.\n\nCustodial venues hide the keys and show a balance. The rail may still be crypto in the company’s wallet. Your risk shifts toward the company and its withdrawal queue. Neither design removes the need to read resolution. Both designs need a fee check. [Polymarket alternatives](/guides/polymarket-alternatives) is where those custody piles are compared across stand-in venues. This page only needs you to see that “crypto” names the rail.\n\nStablecoin collateral is still not a bank deposit. The token can depeg, freeze, or become something the venue stops accepting. A contract that pays “one unit” pays one unit of that token. What the unit is worth in USD on settlement day is a second question. Keep it separate from whether the event happened.",
    },
    {
      id: "resolution-finishes-the-definition",
      title: "Resolution finishes the definition",
      body: "Until resolution, you hold a tradable claim. At resolution, the claim becomes the settlement value. The mechanism is whatever the market specified: a named public source, a staff decision, a vote, an oracle. The mechanism is not a courtesy. A share without a resolution method is an argument with a price chart.\n\nDisputes happen when the source is late, the wording is sloppy, or traders disagree about a real-world edge case. The contract’s dispute window is the only protest that matters. A social-media thread does not settle the share. If you do not understand the window, you do not fully understand the share you bought.\n\nEdge cases are where product definitions earn their keep. A game canceled after you bought. A candidate who withdraws. A price that touches a level on one exchange and not another. The rules either map those cases or they leave them to a person. Mapped cases are boring and good. Unmapped cases are a committee, whether the interface admits it or not.\n\nThis is also why two markets with the same headline are not the same share. The headline is a sentence in English. The share is the settlement paragraph. Compare paragraphs, not headlines, when you use the worksheet on [polymarket alternatives](/guides/polymarket-alternatives).",
    },
    {
      id: "what-this-product-is-not",
      title: "What this product is not",
      body: "It is not a [web3 casino](/guides/web3-casino). A web3 casino game settles because a disclosed game procedure says so: a flip, a spin, a hand. You are not waiting on an election office or a league. Wallet, chain, and contract risk can appear in both products. The thing being resolved is different. Mixing the vocabulary makes people look for a “house edge” on an election share and for an “implied probability” on a roulette wheel. Each idea belongs to its own page.\n\nIt is not a PVPspinArena game. Jackpot, coinflip, and roulette here are USD games. They do not pay because an outside event occurred. They pay because the game resolved. If you want a dollar stake on a coin flip or a wheel, that is the product on this site. If you want a share on the outside world, you want a prediction market this site does not run.\n\nIt is not a license to ignore eligibility. Some venues block regions. Some argue they sit under federal derivatives rules. Some are simply websites with a wallet connect button. This page defines the share so you can recognize it. Recognition is not permission. If you need the caution about US event contracts and state sportsbook law, read that as its own hedged topic, and do not expect a brand to be cleared here.\n\nAdults 21 and older can follow a price for curiosity and still refuse to fund it. The educational core is short. A share pays the high settlement if the written event happens and the low settlement if it does not. The price in between is a trade. Crypto is how the trade is collateralized. The venue’s resolution paragraph is part of the share. Comparison shopping, when you want it, is a separate worksheet, not a second definition of the same idea.\n\nThe rest of this subject is on the [Foundations guides](/guides/topics/foundations). See [polymarket alternatives](/guides/polymarket-alternatives), [web3 casino](/guides/web3-casino), [what is a crypto casino](/guides/what-is-a-crypto-casino). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [responsible gambling](/responsible-gambling) before you play.\n\nTwo venues people compare for that contract are not casinos. [Polymarket vs Kalshi](/guides/polymarket-vs-kalshi) is who can sign up, who holds the money, and what resolves the event.",
    },
  ],
  faqs: [
    {
      q: "What do you buy on a crypto prediction market?",
      a: "You buy a share, or a contract, that pays a published amount if the event happens and a smaller or zero amount if it does not. The trading price moves until resolution as buyers and sellers agree.",
    },
    {
      q: "Is the price a promise that the event will happen?",
      a: "The price is what traders pay each other under the contract’s payoff rule. People sometimes read it as an implied chance, and it remains a trade price rather than a guarantee from the venue.",
    },
    {
      q: "What does crypto change?",
      a: "Crypto is the rail: collateral and payout may be a stablecoin or another token, and a network fee can apply when you move funds. The event and the resolution rule still define the product.",
    },
    {
      q: "How do I choose among venues?",
      a: "Use the Polymarket alternatives page to compare custody, resolution source, and who may sign up. This page defines the share. That page is the worksheet for stand-in venues.",
    },
    {
      q: "Is this the same as a web3 casino?",
      a: "No. A web3 casino is a game settled by a disclosed game rule, often with a wallet. A prediction market is a share on an outside event. PVPspinArena offers jackpot, coinflip, and roulette in USD only, which is neither product.",
    },
  ],
  sources: [],
  related: [
    "polymarket-alternatives",
    "web3-casino",
    "prediction-market-legal-us",
    "is-crypto-gambling-legal",
  ],
  updated: "2026-09-26",
};
