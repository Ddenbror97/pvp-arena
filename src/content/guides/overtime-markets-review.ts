import type { Guide } from "./types";

export const guide: Guide = {
  slug: "overtime-markets-review",
  cluster: "Sports betting",
  keyword: "overtime markets",
  secondary: [
    "overtime markets fees",
    "overtime markets commission",
    "overtime markets legit",
  ],
  title: "Overtime Markets Fees: 2% AMM and Parlay Add-On",
  description:
    "Overtime Markets prints a 2% sports AMM fee, a 3% plus 3% parlay fee, and speed-market LP rates. A licence number is not published. We did not trade.",
  h1: "Overtime Markets in 2026: the 2% fee, parlays, and speed cuts",
  answer:
    "Overtime Markets is a crypto sports exchange that prices tickets from oracle odds and then adds a fee. The sports AMM page sets that protocol fee at 2%. Parlay docs add 3% plus a 3% safebox fee, and speed markets subtract an LP fee plus 2%. We did not trade or time a payout.",
  facts: [
    "Last tested 20 October 2026 on the Overtime Markets docs for the sports AMM, parlays, speed markets, and trading rules. We did not trade. No affiliate link.",
    "The sports AMM page says the protocol fee is currently 2%, on top of odds brought on-chain through Chainlink.",
    "Parlay guidelines add 3% plus the normal safebox fee of 3%, with a minimum buy-in of 3 USD and a cap of 15 positions.",
    "Speed markets pay 2x on a win minus an LP fee and a fixed 2% safebox fee. Two short strike rows print X, not a percent.",
    "A gambling licence number and a minimum age were not on the fee and rules pages we opened.",
    "The marketing site answered. We did not copy a live price into this article.",
  ],
  sections: [
    {
      id: "shape",
      title: "What the docs say the exchange is",
      body: `The trading guidelines call Overtime Markets a decentralized sportsbook. Prices come from Chainlink nodes and named providers, including OpticOdds. A change to feeds or contract logic has to pass an OIP vote by OVER holders.

Data from that pipeline is the settlement authority. If a newspaper disagrees with the node, the node wins. That is their sentence, not an audit we ran.

[How two bettors get matched](/guides/betting-exchange-explained) is a back-and-lay book. This product is an automated market maker. You hit a pool, and the pool can stop offering a side when its risk limit is full.

[A plain start on sports prices](/guides/what-is-sports-betting) is the wider idea. The [sports betting topic](/guides/topics/sports-betting) is the hub. [The offshore book](/guides/jazz-sports-review) is a cashier account, not this contract.

Two-way markets include extra time by default. Three-way markets count regulation unless a note says otherwise. We did not place a ticket.`,
    },
    {
      id: "amm",
      title: "What Overtime Markets charges on the sports AMM",
      body: `The AMM page says implied probabilities come from global odds providers and are brought on-chain through Chainlink. On top of those odds, the protocol fee is currently 2%, and it funds the fee pool.

The page does not say whether 2% is of the stake, of the payout, or of the margin inside the price. A dollar line is not printed. Dollar example 1 is arithmetic, not a ticket we settled.

If 2% is read as a charge on a $100 stake, the fee is $2. If it is read as a charge on a $100 profit, the fee is also $2.

The page does not pick a base. Do not budget $2 until the quote on the ticket shows the cut.

Half of the protocol fees from partner-driven trading is redirected to the integrator wallet. That share is not a discount for the bettor.

A bettor who uses OVER as collateral, instead of USDC or ETH, gets a reduced margin by design. The percent of that reduction is not on the AMM page.

Each market has a risk limit. When one side is full, the AMM stops offering more of that side until the other side trades. A price on the screen is not a promise the next click still fits.`,
    },
    {
      id: "parlay",
      title: "The parlay add-on and the 3% safebox line",
      body: `The Overtime Markets parlay page says parlays incur an additional fee of 3%, plus the normal safebox fee of 3%. Buy-in minimum is 3 USD.

A parlay is limited to 15 positions, and it is buys only. The same team, player, or fighter cannot appear twice, even on another date.

The page also says the minimum price quote is 200 combined quote. It does not define the unit in that sentence.

Combined quotes in the worked lines are decimals multiplied together, such as 0.70 times 0.10. Treat 200 as their printed token until the ticket explains it.

Dollar example 2 stays labeled. If both 3% fees apply to a $3 minimum buy-in, 6% is $0.18.

The page does not say the percents are of the buy-in. The $0.18 is arithmetic, not a receipt.

If one market in the parlay is cancelled, that quote is removed and the collateral applies to the legs that remain. A four-leg ticket can become a three-leg ticket without a new stake. [A combined ticket at a sportsbook](/guides/parlay-betting-explained) is the house version of the same shape.

The sports AMM page's 2% and this page's normal 3% safebox are not the same sentence. Keep both. Do not average them into one commission.`,
    },
    {
      id: "speed",
      title: "Speed-market LP fees, including the rows marked X",
      body: `Overtime Markets speed tickets are up or down on ETH or BTC, from 1 minute to 24 hours. The strike is the price at the moment you buy, so the page says the implied chance is 50:50. A win is a 2x payout minus the quoted LP fee and a fixed 2% safebox fee.

The parameter list also says an LP fee that changes with strike time and a protocol fee of 2%. The LP table we saved prints X for 1 minute through 4 minutes 59 seconds, and X again for 5 minutes through 9 minutes 59 seconds.

From 10 minutes to 14 minutes 59 seconds the LP fee is 15%. From 15 minutes to 59 minutes 59 seconds it is 13%.

From 60 minutes to 119 minutes 59 seconds it is 12%. From 120 minutes to 24 hours it is 10%.

Minimum buy-in is 3 USD and the maximum is 200 USD. The treasury is the sole liquidity provider. Parameters change by OIP, and the page said it was updated 21 days before 20 October 2026.

Dollar example 3 uses a $10 buy-in only as far as the page allows. A win is described as 2x before the cuts, so the gross is $20.

The page does not print the dollar size of the LP fee or the 2% safebox on that $20. The net is not published as one number.

X is not zero. A short strike with an unpublished LP fee is a blank, not a free trade.`,
    },
    {
      id: "rules",
      title: "Voids, draws, and the 24-hour abandonment line",
      body: `If a draw price is listed and the match draws, both team selections lose. If no draw option exists and the match draws, bets are void.

That pair of sentences is easy to mix up. Read which market you bought.

A pre-game forfeit or no-contest voids bets on the fixture, with a note that some exceptions may apply. A retirement after the start is a moneyline loss for the retiring side. Other bets void unless they are already mathematically decided.

If no official resumption is known within 24 hours of the advertised start, unsettled full-game markets may be voided. A match that finishes late is not void only because it finished late. Sport-specific rules still apply.

A licence number is not on these pages. A minimum age is not on them either.

[Where a state permit exists](/guides/sports-betting-legal-states) will not list this contract as a state book. [The margin a book keeps](/guides/vig-betting) is the house version of a fee that here is itemized instead.

US filers can read IRS Topic 419. Gambling winnings, including sports bets, are taxable even without a Form W-2G.

[How a US filer reports a win](/guides/report-gambling-winnings) follows that topic. This is not tax advice.

Support timing and a help address were not on the fee pages we opened. Those cells are not published.`,
    },
    {
      id: "compare",
      title: "A 2% reading next to a 5% player pot",
      body: `The comparison below is numerical and narrow. Two $50 Coinflip stakes make a $100 pot, the fee is $5, and the winner is paid $95.

Four $50 Jackpot entries make a $200 pot, the fee is $10, and the winner is paid $190.

A $2 figure appears only if someone reads the printed 2% as 2% of a $100 stake. Overtime Markets does not print that worked line. The $5 pot fee is a different bet: you play another person, the cut is on the pot, and there is no parlay leg and no oracle.

| | Overtime Markets | A house-banked book | PVPspinArena |
| --- | --- | --- | --- |
| Fee or edge | Sports AMM protocol fee 2%. Parlays 3% plus 3%. Speed LP fee plus 2% safebox | An overround inside the price | 5% of a Coinflip or Jackpot pot |
| Who you play | The AMM, or the treasury on speed markets | The book | Another player |
| Payout speed | On-chain claim. A clock in minutes is not published | not one number | $20 minimum cash-out |
| Provably fair | Settlement follows the published oracle. No casino seed | No | Yes |
| Minimum bet | Parlay and speed minimum 3 USD. Sports AMM minimum not published | not one number | $1 Coinflip |

[Player pots on sports](/guides/peer-to-peer-sports-betting) is the idea of facing another bettor. [A named exchange that posts its own commission](/guides/smarkets-review) is a third shape. Do not paste that commission onto this protocol fee.

[Coinflip](/coinflip) shows the 5% cut before you match. [Fairness](/fairness) checks the seed.

Roulette is 33 slots, Purple and Silver pay 2x, and Green pays 14x. About 7.88% is the Purple or Silver edge after the fee, and Slott takes 10% of a winning pot. Those figures are in the [terms](/terms).`,
    },
    {
      id: "score",
      title: "Checklist, scorecard, and who should stay out",
      body: `Read the Overtime Markets quote on the ticket. The docs below were opened on 20 October 2026, and a live quote wins if it disagrees.

- [ ] Sports AMM protocol fee is printed at 2%, and the base of that 2% is not printed.
- [ ] Parlays add 3% plus a 3% safebox fee, minimum 3 USD, buys only, 15 positions.
- [ ] Speed markets subtract an LP fee and a 2% safebox fee from a 2x payout.
- [ ] LP rows under 10 minutes print X, which is not a percent I can budget.
- [ ] The 10% to 15% LP rows are the longer strikes, not every strike.
- [ ] A cancelled parlay leg leaves the collateral on the remaining legs.
- [ ] OVER collateral is a reduced margin without a printed percent.
- [ ] A draw with a draw price listed loses both team selections.
- [ ] A licence number and a minimum age are not on these pages.
- [ ] 1-800-GAMBLER is saved, and the responsible-gambling page is open.

| Item | Printed on docs opened 20 October 2026 |
| --- | --- |
| Fees | 2% sports AMM protocol fee. Parlay 3% plus 3% safebox. Speed LP table plus 2% safebox |
| Payout speed | not published as a clock. Claim is on-chain |
| Fairness proof | Chainlink and named providers settle. No casino-style seed |
| Licensing | not published |
| Support | not published on the fee pages |
| Bonus terms | OVER collateral reduced margin, percent not published. No welcome bonus on these pages |

Three cons should slow a trade. The fee is three different sentences depending on the product, so a single commission number would be a fiction.

Short speed markets hide the LP fee behind X. There is no licence number on the pages that explain the rules, and the other side can be the pool rather than a person.

Who should stay out: anyone who needs a lay, anyone who needs a state licence, anyone who will treat X as zero, anyone chasing, and anyone under the age their own law requires. If this stops being a read, call 1-800-GAMBLER.

[Responsible gambling](/responsible-gambling) belongs open before the next ticket. A void is not a win, and a 2x banner is not the amount after the safebox fee.`,
    },
  ],
  faqs: [
    {
      q: "What fee does the sports AMM charge?",
      a: "The AMM page sets the protocol fee at 2%, on top of oracle odds, and it does not say whether that 2% is of the stake, the payout, or the margin. A $100 stake read as 2% is $2, and that reading is arithmetic, not a settled ticket. Partner volume sends half of those fees to an integrator, which is not your discount.",
    },
    {
      q: "What do parlays cost?",
      a: "The parlay page adds 3% plus a normal safebox fee of 3%. The minimum buy-in is 3 USD, the cap is 15 positions, and the ticket is buy-only. If both percents were of that $3, the fee would be $0.18, and the page does not say the base is the buy-in. A cancelled leg drops out and the collateral stays on the rest.",
    },
    {
      q: "How do speed-market fees work?",
      a: "A winning speed position is a 2x payout minus the LP fee for that strike time and a fixed 2% safebox fee. Strikes under 10 minutes print X instead of a percent. Longer strikes print 15%, 13%, 12%, and 10%. Buy-ins run from 3 USD to 200 USD. We did not buy one.",
    },
    {
      q: "Is the 2% fee the same as a 5% pot fee?",
      a: "No single reading makes them the same bet. Two $50 Coinflip stakes are a $100 pot, a $5 fee, and a $95 payout to the winner. A 2% charge on a $100 stake would be $2 only if the fee is on the stake, which the AMM page does not confirm. One cut is on a player pot. The other is inside an oracle price.",
    },
    {
      q: "Is a licence number printed?",
      a: "A gambling licence number is not on the AMM, parlay, speed-market, or trading-rules pages we opened on 20 October 2026. A minimum age is not on them either. Settlement follows Chainlink and the named providers even when other media disagree. That is an oracle rule, not a state sportsbook permit.",
    },
    {
      q: "Did this review place an Overtime Markets trade?",
      a: "No. We opened the docs and the marketing site on 20 October 2026, did not connect a wallet, and did not buy a ticket. There is no affiliate link. Live quotes were not copied into this page. If the ticket shows a different fee than the doc, believe the ticket.",
    },
  ],
  sources: [
    {
      label: "Overtime AMM and liquidity mechanics",
      url: "https://docs.overtime.io/learn-about-overtime/overtime-amm-and-liquidity-mechanics",
    },
    {
      label: "Overtime on-chain parlays",
      url: "https://docs.overtime.io/learn-about-overtime/onchain-parlays",
    },
    {
      label: "Overtime speed markets",
      url: "https://docs.overtime.io/introduction-to-speed-markets",
    },
    {
      label: "Overtime sports trading guidelines",
      url: "https://docs.overtime.io/learn-about-overtime/sports-trading-guidelines",
    },
    {
      label: "IRS Topic 419, gambling income and losses",
      url: "https://www.irs.gov/taxtopics/tc419",
    },
  ],
  related: [
    "betting-exchange-explained",
    "vig-betting",
    "peer-to-peer-sports-betting",
    "parlay-betting-explained",
    "jazz-sports-review",
    "smarkets-review",
  ],
  updated: "2026-10-20",
};
