import type { Guide } from "./types";

export const guide: Guide = {
  slug: "peer-to-peer-sports-betting",
  cluster: "Sports betting",
  keyword: "peer to peer sports betting",
  secondary: [
    "p2p sports betting",
    "peer to peer betting app",
    "bet against other people",
    "social betting",
  ],
  title: "Peer to Peer Sports Betting: How Bettors Bet Each Other",
  description:
    "How peer to peer sports betting works: exchanges, matching, commission instead of vig, liquidity, friend bets and escrow, and where it is legal.",
  h1: "Peer to peer sports betting: how bettors bet each other",
  answer:
    "Peer to peer sports betting means your bet is matched with another bettor who takes the opposite side, instead of with a sportsbook that sets the price and takes the risk. The platform matches the two sides, holds both stakes and earns a commission or fee, usually on winnings. Prices can be closer to fair than a sportsbook's, but a bet only happens if someone takes the other side.",
  facts: [
    "In peer to peer sports betting another bettor, not the house, takes the other side.",
    "The platform earns commission or a fee instead of building vig into the odds.",
    "A bet needs a match: thin markets may have no taker at a fair price.",
    "Betting exchanges are the largest form of peer to peer sports betting.",
    "Legality depends on licensing where you are; many US states license sportsbooks but not exchanges.",
  ],
  sections: [
    {
      id: "how",
      title: "How peer to peer betting works",
      body: 'At a sportsbook, the book quotes both sides of a game, builds a margin into the prices and takes whichever side you choose. In peer to peer sports betting, the platform only connects bettors. You post the bet you want (team, stake, odds) or take a bet someone else has posted. When the two sides agree on a price, the bet is **matched** and both stakes are locked until the game settles.\n\nThe biggest example is the betting exchange, where you can back or lay an outcome; see [betting exchanges explained](/guides/betting-exchange-explained). Smarkets\' help centre describes [what a betting exchange is](https://help.smarkets.com/hc/en-gb/articles/115001820389-What-is-a-betting-exchange). Some newer apps show the same idea as an order book with "buy" and "sell" buttons, and some prediction-market products trade sports outcomes as contracts; [prediction markets and US law](/guides/prediction-market-legal-us) covers why those are regulated differently.',
    },
    {
      id: "price",
      title: "Commission instead of vig",
      body: "A sportsbook typically prices both sides of an even game at −110. You stake $110 to win $100 on either side; the gap is the [vig](/guides/vig-betting), about 4.5% of the money wagered if both sides are bet equally.\n\nOn a peer to peer platform, two bettors can meet at even money (+100, or 2.00 decimal) and the platform charges a commission on the winner's profit instead.\n\n**Worked example.** You and another bettor each stake $100 at 2.00. The winner's profit is $100. At a 2% commission the winner keeps $98. Compare: winning a $110 bet at −110 also pays $100 profit, but you had to risk $110 to get it.\n\nCommission rates and how they apply (per bet, per market, on net winnings) differ by platform; Smarkets publishes its [commission breakdown](https://help.smarkets.com/hc/en-gb/articles/212106009-Commission-breakdown). Always compare after the fee: [implied probability](/guides/implied-probability) and the [odds converter](/guides/odds-converter) help.",
    },
    {
      id: "liquidity",
      title: "Matching and liquidity",
      body: "The catch is that someone must want the other side. In a big market (an NFL game, a Premier League match) there is usually plenty of money at prices close to fair. In a small one (a lower-league game, a niche prop) your offer may sit unmatched, or be only partly matched.\n\n- **Unmatched** bets carry no risk until matched; you can usually cancel them.\n- **Partly matched** bets mean only some of your stake is live. Check the matched amount before assuming you are fully on.\n- **Moving prices.** If you want an instant match, you take the best price on offer, which may be worse than the price you would post and wait for.\n\n[Line shopping](/guides/line-shopping) still applies: compare the exchange price, after commission, with what licensed sportsbooks offer.",
    },
    {
      id: "friends",
      title: "Friend bets, pools and escrow",
      body: "Peer to peer betting also covers informal bets between people who know each other: office pools, a [pick'em pool](/guides/pick-em-pool), golf side games. These usually have no platform at all, which means no one holds the money and no one enforces settlement. If a third party offers to hold both stakes, read what happens if the result is disputed; [escrow betting](/guides/escrow-betting) explains the questions to ask. In many jurisdictions, social bets are lawful only when nobody takes a cut. The [sports betting topic](/guides/topics/sports-betting) groups the related guides.",
    },
    {
      id: "legal",
      title: "Where it is legal",
      body: "Betting exchanges are licensed in some countries, such as Great Britain. In the United States, sports betting is licensed state by state, and most states license sportsbooks, not exchanges; a few US operators run exchange-style models under a state sportsbook licence. Check [where sports betting is legal](/guides/sports-betting-legal-states) and confirm that the platform names a licence for your state.\n\nUse [responsible gambling tools](/responsible-gambling) to keep spending within an affordable limit.",
    },
  ],
  faqs: [
    {
      q: "What is peer to peer sports betting?",
      a: "Betting where another bettor takes the opposite side of your bet. The platform matches the two sides, holds the stakes and charges a commission or fee, instead of setting odds and taking the risk itself.",
    },
    {
      q: "Is peer to peer betting cheaper than a sportsbook?",
      a: "Often, in busy markets: two bettors can meet at even money and pay a small commission, compared with −110 on both sides at a sportsbook. In thin markets the best available price can be worse.",
    },
    {
      q: "What happens if nobody matches my bet?",
      a: "It stays unmatched and you are not at risk. You can usually cancel it. If only part of it is matched, only that part is live.",
    },
    {
      q: "Is peer to peer sports betting legal in the US?",
      a: "It depends on the state. Most states license sportsbooks rather than exchanges. Use only a platform that names a licence for your state.",
    },
    {
      q: "Are bets between friends peer to peer betting?",
      a: "Yes, but without a platform no one holds the money or settles disputes, and the law on social betting varies by place.",
    },
  ],
  sources: [
    {
      label: "Smarkets: what is a betting exchange",
      url: "https://help.smarkets.com/hc/en-gb/articles/115001820389-What-is-a-betting-exchange",
    },
    {
      label: "Smarkets: commission breakdown",
      url: "https://help.smarkets.com/hc/en-gb/articles/212106009-Commission-breakdown",
    },
    {
      label: "Smarkets: what is lay betting on an exchange",
      url: "https://help.smarkets.com/hc/en-gb/articles/115003374849-What-is-lay-betting-on-an-exchange",
    },
    {
      label: "GambleAware",
      url: "https://www.gambleaware.org/",
    },
  ],
  related: [
    "betting-exchange-explained",
    "escrow-betting",
    "pick-em-pool",
    "vig-betting",
    "sports-betting-legal-states",
  ],
  updated: "2026-11-26",
};
