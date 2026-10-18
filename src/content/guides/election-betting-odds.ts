import type { Guide } from "./types";

export const guide: Guide = {
  slug: "election-betting-odds",
  cluster: "Prediction markets",
  keyword: "election betting odds",
  secondary: ["political odds", "election prediction market", "convert election odds"],
  title: "Election Betting Odds: How Markets Price Politics",
  description:
    "How election betting odds work, where they come from, how accurate prediction markets have been and how to read political odds as probabilities.",
  h1: "Election betting odds and how to read them as prices",
  answer:
    "Election betting odds are prices on political outcomes, posted by a book in American odds or by a market as a share price. You convert either figure into a percent with arithmetic this page shows on teaching numbers, not on a live candidate. The percent is what the price implies. It is not a poll and not a promise. Markets have been informative in some races and wrong in others. Adults 18+ only. Not financial, legal, or tax advice.",
  facts: [
    "A share at 40 cents converts to a 40% price because 40 divided by 100 is 0.40.",
    "American +150 converts to 40% because 100 divided by 250 is 0.40.",
    "American −200 converts to about 66.7% because 200 divided by 300 is two thirds.",
    "Those percents are implied by the price. They are not a count of how the election will happen.",
    "Research on prediction markets finds useful signals in some settings and clear misses in others.",
    "This page does not quote a live candidate price.",
  ],
  sections: [
    {
      id: "where-prices-come-from",
      title: "Where election betting odds come from",
      body: `Election betting odds are somebody's willingness to pay for a political result. A sportsbook posts a number and will take the other side under its margin. A prediction market lets people trade a share that pays if the result happens, and the last price is whatever the buyers and sellers just agreed. Both get called odds. They are produced differently, and the percent you read off them still is not a ballot count.

The inputs are public and private. Polls, fundraising, economic numbers, and scandals move the conversation. So do hedges, partisans who want a side regardless of price, and thin books where a small order shifts the quote. A campaign contract can be a research object and a billboard at the same time. Treat the billboard as a price.

This page will not quote a live candidate. Any cent figure below is a teaching input, labeled as one, so the conversion can be checked without pretending this guide knows tonight's market. If you want the live number, open the venue and read it there. Then run the arithmetic yourself.

Adults 18+ only. Political contracts can go to zero. This is not financial, legal, or tax advice, and it is not a voting guide. The cluster home is [Prediction market guides](/guides/topics/prediction-markets). How the share itself trades is [how Polymarket works](/guides/how-does-polymarket-work). If the stake is hurting, use [responsible gambling](/responsible-gambling).`,
    },
    {
      id: "share-prices",
      title: "How a share price becomes a percent",
      body: `On a market that pays $1 for a correct Yes share and $0 otherwise, the price in cents is already the implied percent. Example 1: a Yes share at 40 cents. Divide the price by the payout. 40 / 100 = 0.40, which is 40%. One hundred shares cost 100 × $0.40 = $40. If that side resolves Yes, the payout is $100 and the profit is $60 before fees. If it resolves No, the loss is $40. The 40% described the invoice. It did not survey voters.

The same conversion is the one in [how Polymarket works](/guides/how-does-polymarket-work): a 63 cent share is a 63% price. Nothing about elections makes the translation more official. A political market can be thinner than a liquid game, so the 40 cents may be a last trade between a much lower bid and a much higher offer. Write down the price you can actually buy and the price you can actually sell. The midpoint is a summary, not a fill.

Fees move the percent you need. If it costs more than 40 cents all-in to hold a share that pays $1, the implied price is higher than the headline cent. Read the schedule on that venue. This page will not supply a universal political-market fee.

Two contracts on "the election" can be different bets. One pays on the call on election night. One pays on certification. One pays if a party wins the popular vote, another if it wins the electoral vote. Convert the price only after you know which sentence you bought. A 40% price on the wrong sentence is a precise number about the wrong event.`,
    },
    {
      id: "american-odds",
      title: "How American odds become the same kind of percent",
      body: `Books often post elections in American odds. [Implied probability](/guides/implied-probability) is the general converter. The two formulas you need are short.

Positive odds +A imply 100 / (A + 100). Example, still teaching and still not a candidate: +150. 100 / (150 + 100) = 100 / 250 = 0.40, or 40%. The same 40% as the 40 cent share, by design, so you can see the formats meet. A $100 stake at +150 returns $250 if it wins, which is the $100 stake plus $150 profit. You are being paid like an event the book treats as 40% for pricing purposes, before you ask whether the book's hold makes the true break-even stricter.

Negative odds −A imply A / (A + 100). Teaching number: −200. 200 / (200 + 100) = 200 / 300 = 0.667, about 66.7%. You risk $200 to win $100. The price talks like a two-thirds event. Favorite prices in elections often look like this, and the hold means a pair of candidates can both be priced so their implied percents sum to more than 100%. That extra is the book's margin, not extra probability hiding in the electorate.

| Quote you see | Arithmetic | Implied price |
| --- | --- | --- |
| Yes share at 40 cents | 40 / 100 | 40% |
| American +150 | 100 / (150 + 100) = 100 / 250 | 40% |
| American −200 | 200 / (200 + 100) = 200 / 300 | 66.7% |

Check the row against the ticket in your hand. Then stop. A converted percent is the start of a comparison with your own estimate, not the end of an argument.`,
    },
    {
      id: "accuracy",
      title: "How accurate these markets have actually been",
      body: `Researchers have studied prediction markets for years, including the Iowa Electronic Markets and the survey by Justin Wolfers and Eric Zitzewitz in the Journal of Economic Perspectives (2004). The careful summary is that markets can aggregate information well in some settings, that prices often move when news is real, and that they are not magic. They have tracked competitive races in ways polls also tracked, and they have been confidently wrong. A market is a running price. Accuracy is something you score afterward, on a set of resolved events, not something a single quote carries on its face.

Beware a precise accuracy percent in a headline. "Markets are 80% accurate" usually hides a choice about which markets, which lead time, and what "accurate" means. A favorite priced at 80% who wins is not the same test as a set of 50% races called within a point. This page will not invent that percent. Read the paper if you want the historical tables, and expect the tables to disagree with a slogan.

Political markets add problems the lab does not. They can be thin. A motivated buyer can push a small contract. Rules about who may trade, and from which country, change the population whose beliefs are in the price. Resolution can lag the public call, so a contract that looks "settled" on television is still open. Favorite-longshot bias, known from other betting markets, can make long shots too expensive and favorites a bit short. None of that yields a correction factor you should subtract from tonight's quote without doing the work.

Use the price as one input next to polls, not as a replacement that ends the need to read. When they diverge, you have a question, not a trade you are obligated to make.`,
    },
    {
      id: "reading",
      title: "A way to read a political price without a live quote",
      body: `Pick the contract sentence first. Office, date, vote type, and what counts as a winner. Then write the price in one format. Convert it with the table above. Then write a second percent that is yours, from whatever evidence you actually looked at, and label it as yours. The gap between the price and your percent is the only thing a trade could be about. If you do not have a second percent, you are not disagreeing with the market. You are cheering it.

Example 2 stays fictional. Suppose your own estimate for a teaching outcome is 50%, and the share is 40 cents, a 40% price. You are 10 percentage points apart. On 100 shares the cost is $40 and the Yes payout is $100. You are saying the contract is cheap relative to your 50% figure. Expected payout under your estimate is 0.50 × $100 = $50, against a $40 cost, or $10 of expected profit before fees. If your estimate is wrong and the true chance is the market's 40%, expected payout is $40 and the edge is zero before fees. The $10 exists only inside your estimate. Fees can erase it. So can a resolution rule that does not match the outcome you estimated.

That is the whole discipline. Convert. Separate your number from their number. Subtract costs. Respect the sentence being settled. Do not let a televised percent skip those steps. And do not update your estimate by copying the price and then claiming you found a gap. That gap is zero by construction.

[Prediction markets and US law](/guides/prediction-market-legal-us) is the separate question of whether you may trade a given contract at all. A clean conversion is not permission.`,
    },
    {
      id: "limits",
      title: "What political odds cannot tell you",
      body: `They cannot tell you how to vote. A price is not a moral argument and not a forecast you owe allegiance to. They cannot tell you that a candidate is "safe" because the implied percent is high. High prices lose. They cannot be averaged across venues that settle on different rules and then called a consensus. They cannot be turned into a betting system by this page, because this page has no live prices and no slate.

They also go stale. A quote from this morning is not a quote after a debate, a court ruling, or a dropout. If you are going to use a number, use the number on the screen at the time you act, and keep a copy of the contract text with it.

| Limit | What to do instead |
| --- | --- |
| No live price is printed here | Open the venue and convert with the formulas |
| A percent is not a poll | Keep your evidence in a separate note |
| Two headlines can hide two rules | Read the settlement source before comparing |
| History is mixed | Cite a paper, not a slogan about accuracy |
| The category is disputed in the US | Check eligibility. Do not route around a block |

The table is a brake. Election screens are built to feel like news. The brake is how you keep a news feeling from becoming a stake you did not price.`,
    },
    {
      id: "hashed-pot",
      title: "A hashed pot is not a political market",
      body: `Election betting odds move when beliefs about an election move. A hashed player-versus-player pot does not. On [Jackpot](/), players fund one pot and a committed seed selects a ticket. There is no candidate, no electoral vote, and no American odds. The result is a draw you can recompute, not a civic outcome.

[Fairness](/fairness) runs that recomputation after the seed is published. It will not convert +150 into a percent, and an election market will not publish a Jackpot seed. PVPspinArena does not list political contracts. Jackpot, Coinflip, and Roulette are the games, funded with USDC or ETH on Base. This guide invents no accuracy rate for them and no fee percent.

Checklist when you see a political price:

- Ignore any candidate quote that came from this page, because there is not one.
- Name the exact settlement rule.
- Convert the share or the American odds with the formulas above.
- Write your own percent on a separate line.
- Subtract fees before you call the gap an edge.
- Stop if the stake is there to prove a point rather than to match a price you can lose.

Adults 18+ only. Not financial, legal, or tax advice.`,
    },
  ],
  faqs: [
    {
      q: "How do you convert election betting odds to a probability?",
      a: "A $1 Yes share at 40 cents is 40/100, or 40%. American +150 is 100/(150+100), also 40%. American −200 is 200/(200+100), about 66.7%. Those are implied prices. They are not polls, and the examples are teaching numbers, not live candidates.",
    },
    {
      q: "Are prediction markets accurate about elections?",
      a: "Sometimes informative, sometimes wrong. Work such as Wolfers and Zitzewitz (2004) and the Iowa Electronic Markets found real signal in places and real misses in others. A single price does not carry an accuracy score. Ignore slogans that quote a neat percent without a defined test.",
    },
    {
      q: "Why does this page skip current candidate prices?",
      a: "A live price expires, and printing one would pretend the guide is a feed. Open the venue for the number, confirm which rule it settles on, and convert it yourself. Two contracts with the same name can pay on a call, a certification, or a different vote.",
    },
    {
      q: "What does a 10-point gap mean in dollars?",
      a: "In the teaching example, you think 50% and the share costs 40 cents. One hundred shares cost $40 and pay $100 if Yes. Under your 50% figure, expected payout is $50, or $10 over the cost, before fees. If the market's 40% is right, that $10 was never there.",
    },
    {
      q: "Are election odds the same product as Jackpot?",
      a: "No. Election odds price an outside political result. Jackpot is a hashed player-versus-player pot funded by players and checked on Fairness after the seed is published. A debate does not move that pot. Adults 18+ only. This is not betting advice.",
    },
  ],
  sources: [
    {
      label: "Wolfers and Zitzewitz, Prediction Markets, Journal of Economic Perspectives (2004)",
      url: "https://www.aeaweb.org/articles?id=10.1257/0895330041371321",
    },
    { label: "Polymarket", url: "https://polymarket.com/" },
    { label: "National Council on Problem Gambling", url: "https://www.ncpgambling.org/" },
  ],
  related: [
    "how-does-polymarket-work",
    "implied-probability",
    "crypto-prediction-markets",
    "prediction-market-legal-us",
  ],
  updated: "2026-10-06",
};
