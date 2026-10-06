import type { Guide } from "./types";

export const guide: Guide = {
  slug: "billy-walters",
  cluster: "Casino knowledge",
  keyword: "billy walters",
  secondary: [
    "billy walters gambler",
    "billy walters computer group",
    "billy walters insider trading",
    "billy walters book",
  ],
  title: "Billy Walters: Sports Bettor, Computer Group, Conviction",
  description:
    "Billy Walters: the Kentucky-born sports bettor behind the Computer Group, his 2017 insider-trading conviction, the 2021 commutation and the maths of the vig.",
  h1: "Billy Walters: the sports bettor, the syndicate and the trial",
  answer:
    "Billy Walters is an American professional gambler widely regarded as one of the most successful sports bettors of all time. He rose to prominence in the 1980s as the betting force behind the Computer Group syndicate, later ran his own large betting operation from Las Vegas, and was convicted of insider trading in 2017. President Trump commuted his five-year sentence in January 2021.",
  facts: [
    "Born 15 July 1946 in Munfordville, Kentucky.",
    "Placed bets for the Computer Group, a 1980s syndicate built on computer models of college and pro sports.",
    "Convicted in April 2017 of securities fraud, wire fraud and conspiracy over Dean Foods trading tips.",
    "Sentenced to five years and a $10 million fine; the sentence was commuted on 20 January 2021.",
    "At standard −110 pricing, a bettor must win 52.38% of bets just to break even.",
  ],
  sections: [
    {
      id: "early",
      title: "Early life in Kentucky and the road to Las Vegas",
      body: `William T. "Billy" Walters was born on 15 July 1946 in Munfordville, a small town in Hart County, Kentucky. His father died when he was an infant, and he was raised largely by his grandmother in modest circumstances. In his own telling, he placed his first bet as a young boy and was hooked on the numbers from then on.

As a young man he worked as a car salesman in Louisville and gambled on the side, playing cards and golf for money and betting on sports. He has said he went broke several times in those years. The pattern is familiar from other professionals' biographies: a period of losing that teaches bankroll discipline the hard way.

By the early 1980s he was in Las Vegas. His break came not from a single big win but from joining a group that was trying something new: using computers to price games more accurately than the bookmakers did.

### What makes a sports bettor different

Most famous gamblers on this site made their names at cards. Walters is different. His game was the betting market itself: finding prices that were wrong and getting money down before they moved. That puts him closer to a trader than to a card player, which is also why his later legal trouble came from the stock market.

For other profiles from the same era, see the [famous gamblers overview](/guides/famous-gamblers) and the [casino knowledge topic hub](/guides/topics/casino-knowledge). This page covers his career; for betting technique itself, the [how to win at sports betting](/guides/how-to-win-at-sports-betting) guide keeps the strategy.`,
    },
    {
      id: "computer-group",
      title: "The Computer Group",
      body: `The Computer Group was a sports-betting syndicate that operated from the early 1980s. Its core was a set of computer models, developed by Michael Kent, that estimated point spreads for college football and basketball from team statistics. When the model's number differed enough from the bookmakers' line, the group bet.

Walters's role was execution. A model is worthless if you cannot get money down at the price it likes, and bookmakers limit or refuse customers they suspect are sharp. Walters organised the betting, spreading it across many outlets and many people so that the group could place large sums before lines moved.

### Why it mattered

In the early 1980s, lines were set largely by experienced oddsmakers' judgment. A group that could process more data, faster, had an edge. Over time bookmakers adapted, sharpened their own numbers, and learned to watch where sharp money came from. The edge the Computer Group enjoyed was the edge of being early to a method.

### The federal investigation

The group's success drew a long federal investigation into illegal gambling in the mid-1980s, including FBI raids. The case is part of the group's legend and is covered in books and articles about the era. Walters has always maintained that his betting was legal where it was placed.

### The roulette story

Walters is also linked to a widely reported roulette win at the Golden Nugget in Atlantic City in 1986. The usual account says he and associates believed a wheel was biased toward certain numbers and won several million dollars betting on them before the casino stopped play. The details come from press reports and his own later accounts; treat the figures as reported rather than audited.`,
    },
    {
      id: "method",
      title: "How a professional bettor beats the vig",
      body: `Walters's career only makes sense once you see how thin the margin is. Most point-spread and totals bets are priced at −110: risk $110 to win $100.

### The break-even rate

At −110, a bettor needs to win 110 / (110 + 100) = 52.38% of bets to break even. Win 50% and you lose about 4.5% of what you risk, because the bookmaker's margin is built into the price.

### A worked season

Take 1,000 bets at $1,100 each to win $1,000.

| Win rate | Wins × $1,000 | Losses × $1,100 | Net |
| --- | --- | --- | --- |
| 50% | $500,000 | $550,000 | −$50,000 |
| 52% | $520,000 | $528,000 | −$8,000 |
| 55% | $550,000 | $495,000 | +$55,000 |

A bettor who is right 55% of the time makes about 5% on $1.1 million risked. That is a very good record, and it is also a narrow one. The difference between a professional and a losing bettor is a few percentage points of accuracy.

### Execution is the second edge

Because the margin is thin, getting the best available price matters as much as picking sides. Moving from −110 to −105 changes the break-even rate from 52.38% to 51.22%. A syndicate that could bet early, at many books, at the best number, could turn a modest forecasting edge into large profits. That is why Walters's operation relied on networks of people placing bets on his behalf.

### Why bookmakers limit winners

A bookmaker earns its margin when it takes roughly balanced action at a fair-ish price. A customer who consistently bets before the line moves in their direction is taking the other side of the bookmaker's own mistakes, and over time that customer costs money. The standard response is to cut the customer's maximum stake or close the account. That is why a professional's problem is rarely finding a bet; it is getting a meaningful amount on it. Walters's use of other people to place bets was a response to exactly this, and the market has kept evolving since, with books sharing information about sharp accounts and moving lines faster.

For how these prices convert into probabilities, see the [implied probability guide](/guides/implied-probability).`,
    },
    {
      id: "trial",
      title: "The insider-trading case",
      body: `In 2016 federal prosecutors in New York and the US Securities and Exchange Commission charged Walters over trading in shares of Dean Foods. The case centred on Thomas C. Davis, a former chairman of the Dean Foods board, who admitted passing confidential company information to Walters and pleaded guilty. Davis testified against Walters at trial.

### Conviction and sentence

In April 2017 a jury convicted Walters on ten counts, including securities fraud, wire fraud and conspiracy. Prosecutors put his profits and avoided losses from the trading at roughly $40 million. In July 2017 he was sentenced to five years in prison and fined $10 million, alongside forfeiture.

The case also involved golfer Phil Mickelson, who had traded Dean Foods shares. Mickelson was not charged with a crime. He was named in the SEC's civil case as a relief defendant and agreed to repay trading profits of about $1 million, without admitting wrongdoing.

### Appeal and commutation

Walters appealed. The appeal raised the conduct of an FBI agent who had leaked information about the investigation to journalists; the appeals court acknowledged the misconduct but upheld the conviction. Walters was moved to home confinement in 2020 during the COVID-19 pandemic, and on 20 January 2021, his last day in office, President Donald Trump commuted the remaining sentence. A commutation shortens a sentence; it is not a pardon and does not overturn the conviction.

Walters has continued to maintain his innocence.`,
    },
    {
      id: "later",
      title: "Memoir, reputation and the lessons",
      body: `In 2023 Walters published a memoir, *Gambler: Secrets from a Life at Risk*. It covers his childhood, his betting methods and the trial, and it attracted wide coverage for its account of his former betting relationship with Mickelson. Walters has also been known for charitable giving and for high-stakes golf.

### What his career shows

- **Edges in betting markets are small and temporary.** The Computer Group's advantage shrank as bookmakers improved. Any public method loses value as others copy it.
- **Execution is part of the edge.** A forecast is only worth money if you can bet at the price it needs. Professionals spend as much effort on getting bets placed as on picking them.
- **Information has legal limits.** Sports bettors use public data and their own models. Trading on confidential company information is a crime. Walters's conviction came from the second category, not the first.

### Why most bettors do not become Walters

The table in the previous section shows the problem. A casual bettor who wins 50% of −110 bets loses about 4.5% of turnover over time. That is not bad luck; it is the price. Survival requires beating the market, not just picking some winners. The [house edge guide](/guides/house-edge) explains the same idea in casino games, where the margin is fixed rather than set by a market.

Other public cases, told as history rather than a method, are [sports betting scandals](/guides/sports-betting-scandals).`,
    },
    {
      id: "pvp",
      title: "Sports-betting edges versus a hashed PvP round",
      body: `Walters made money because betting lines are opinions, and opinions can be wrong. A casino game whose odds are fixed by its rules has no opinion to beat.

PVPspinArena runs three player-vs-player games, and each has a fixed, stated structure:

- **Coinflip**: two players, 50/50. The winner takes the pot minus any fee shown before entry. No model or information gives either player an advantage.
- **Jackpot**: your win chance equals your share of the pot, stated before the draw.
- **Roulette**: a 33-slot wheel, 16 Purple and 16 Silver slots paying 2x and 1 Green paying 14x. Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. There is no line to shop and no early number to take.

Outcomes come from seeds committed before the round and revealed after it, so no one, including the operator, can use information about the result before it settles. Anyone can check a settled round on the [fairness](/fairness) page, or read how the scheme works in [commit reveal](/guides/commit-reveal-scheme).

The honest takeaway is that there is no Walters-style edge in a hashed round. Treat play on [Roulette](/roulette) or Coinflip as entertainment with a known price, not as a market to beat. Gambling is 18+, and limits are on the [responsible gambling](/responsible-gambling) page.

In the same cluster, see also [phil ivey](/guides/phil-ivey) and [edward thorp](/guides/edward-thorp).`,
    },
  ],
  faqs: [
    {
      q: "Who is Billy Walters?",
      a: "An American professional gambler from Kentucky, known as one of the most successful sports bettors ever and for his 2017 insider-trading conviction, later commuted.",
    },
    {
      q: "What was the Computer Group?",
      a: "A 1980s sports-betting syndicate that used computer models, developed by Michael Kent, to find mispriced lines. Walters organised much of its betting.",
    },
    {
      q: "Why was Billy Walters convicted?",
      a: "A jury found him guilty in 2017 of insider trading in Dean Foods shares, based on confidential tips from former board chairman Thomas Davis, who pleaded guilty and testified.",
    },
    {
      q: "Did Billy Walters get a pardon?",
      a: "No. President Trump commuted his sentence on 20 January 2021. A commutation ends the remaining sentence but leaves the conviction in place.",
    },
    {
      q: "What is Billy Walters's book called?",
      a: "Gambler: Secrets from a Life at Risk, a memoir published in 2023 covering his childhood, betting career and trial.",
    },
    {
      q: "What win rate does a sports bettor need to break even?",
      a: "At standard −110 pricing, 52.38%. Winning half your bets at that price loses about 4.5% of the amount risked.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Billy Walters (gambler)",
      url: "https://en.wikipedia.org/wiki/Billy_Walters_(gambler)",
    },
    { label: "Wikipedia: Insider trading", url: "https://en.wikipedia.org/wiki/Insider_trading" },
    {
      label: "Encyclopaedia Britannica: gambling",
      url: "https://www.britannica.com/topic/gambling",
    },
  ],
  related: [
    "famous-gamblers",
    "archie-karas",
    "doyle-brunson",
    "how-to-win-at-sports-betting",
    "implied-probability",
    "edward-thorp",
    "phil-ivey",
  ],
  updated: "2026-09-27",
};
