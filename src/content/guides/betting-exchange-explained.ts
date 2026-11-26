import type { Guide } from "./types";

export const guide: Guide = {
  slug: "betting-exchange-explained",
  cluster: "Sports betting",
  keyword: "betting exchange explained",
  secondary: [
    "how does a betting exchange work",
    "back and lay",
    "betting exchange commission",
    "lay betting",
  ],
  title: "Betting Exchange Explained: Back, Lay and Commission",
  description:
    "How a betting exchange works: backing and laying between users, lay liability, commission on net winnings, and how it differs from a bookmaker.",
  h1: "Betting exchange explained: back, lay and commission",
  answer:
    "A betting exchange is a marketplace where bettors bet against each other instead of against a bookmaker. You either back an outcome (bet it happens) or lay it (bet it does not, taking the bookmaker's role). The exchange matches opposite bets, holds both sides' money and charges commission on net winnings in each market instead of building a margin into the odds.",
  facts: [
    "Backing bets an outcome happens; laying bets it does not.",
    "A lay's liability is lay stake × (odds − 1): what you pay if the outcome happens.",
    "The exchange matches users' opposite bets and charges commission on net market winnings.",
    "Unmatched bets stay open until someone takes the other side or you cancel.",
    "Exchanges are licensed in some countries and US states, not everywhere sportsbooks are.",
  ],
  sections: [
    {
      id: "how",
      title: "How a betting exchange works",
      body: "On a bookmaker, the bookmaker sets the odds and takes the other side of your bet. On a betting exchange, other users take the other side. Each market shows two columns of prices: **back** (the best odds you can bet at) and **lay** (the best odds at which someone will let you take the bookmaker's side). Smarkets' help centre explains [what a betting exchange is](https://help.smarkets.com/hc/en-gb/articles/115001820389-What-is-a-betting-exchange) with a worked back bet.\n\nWhen you place a bet, the exchange looks for an opposite bet at the same or better odds. If one exists, your bet is **matched**. If not, your bet sits in the market as an offer until someone matches it or you cancel. Partly matched bets are common: $50 at your price may be matched while the other $50 waits.\n\nThe exchange never cares who wins. It earns commission on the winnings, which is why prices on an exchange are often closer to the true odds than a bookmaker's. Because users trade with each other, the model belongs with [peer-to-peer sports betting](/guides/peer-to-peer-sports-betting).",
    },
    {
      id: "lay",
      title: "Laying and liability",
      body: "To **lay** is to offer a bet to other users. If you lay a team at 4.00 for a $10 stake, you are saying it will not win. Someone backs it with your $10 offer:\n\n- If the team does **not** win, you win the backer's $10 stake (minus commission).\n- If the team **wins**, you pay the backer's profit: $10 × (4.00 − 1) = **$30**. That $30 is your **liability**, and the exchange holds it from your balance when the bet is matched.\n\nLaying short odds is cheap to fund and pays often; laying long odds risks a large liability for a small win. Smarkets shows [how lay liability is calculated](https://help.smarkets.com/hc/en-gb/articles/115003381865-How-to-calculate-the-liability-of-a-lay-bet). Laying is what makes [matched betting](/guides/matched-betting) and exchange [hedging](/guides/hedge-betting) possible.",
    },
    {
      id: "commission",
      title: "How commission is charged",
      body: "Exchanges charge a percentage of your **net winnings in a market**, not of each bet and not of losing bets. If you back and lay in the same market, only the overall profit is charged.\n\n**Example.** In one market you win $40 on one bet and lose $10 on another. Net market winnings: $30. At a 2% rate the commission is $0.60; you keep $29.40. Had you lost overall, you would pay no commission on that market.\n\nRates differ by exchange and sometimes by customer or market. Smarkets publishes a [commission breakdown](https://help.smarkets.com/hc/en-gb/articles/212106009-Commission-breakdown); other exchanges publish their own. When you compare an exchange price with a bookmaker price, subtract commission first: decimal odds of 3.00 at 2% commission pay like about 2.96. [Line shopping](/guides/line-shopping) explains why that comparison matters.",
    },
    {
      id: "vs",
      title: "Exchange versus bookmaker",
      body: "| | Bookmaker | Betting exchange |\n| --- | --- | --- |\n| Who you bet against | The bookmaker | Other users |\n| How it earns | Margin built into odds | Commission on net winnings |\n| Lay bets | No | Yes |\n| Winning-account limits | Common | Not the business model, though terms still apply |\n| Liquidity | Always quotes a price | Depends on other users; big markets are deep, small ones thin |\n\nThe exchange's weakness is liquidity: in a minor market there may be no one to match your bet at a fair price. Its strength is that a winning customer is not a problem for the exchange. The [sports betting topic](/guides/topics/sports-betting) covers the bookmaker side.",
    },
    {
      id: "legal",
      title: "Where exchanges are allowed",
      body: "Betting exchanges are licensed in some countries, such as Great Britain. In the United States, licensing is state by state, and many states that allow sportsbooks have not licensed an exchange model. Some US products call themselves exchanges or prediction markets under federal rules; [prediction markets and US law](/guides/prediction-market-legal-us) explains why that is a different legal question. Check your regulator before you deposit.\n\nUse [responsible gambling tools](/responsible-gambling) to keep spending within an affordable limit.",
    },
  ],
  faqs: [
    {
      q: "What does lay mean in betting?",
      a: "To lay is to bet that an outcome will not happen, taking the bookmaker's side against another user's back bet. If the outcome happens, you pay the backer's profit.",
    },
    {
      q: "How much can I lose on a lay bet?",
      a: "Your liability: lay stake × (odds − 1). Laying $10 at 4.00 risks $30. The exchange holds that amount when the bet is matched.",
    },
    {
      q: "How does betting exchange commission work?",
      a: "It is a percentage of your net winnings in each market. Losing markets are not charged. At 2%, net winnings of $30 cost $0.60.",
    },
    {
      q: "What is an unmatched bet?",
      a: "An offer no one has taken yet. It stays open until another user matches it, the market closes, or you cancel it.",
    },
    {
      q: "Are betting exchanges better than sportsbooks?",
      a: "Prices are often closer to fair and winners are not the problem, but small markets can lack liquidity, and exchanges are not licensed in many places where sportsbooks are.",
    },
  ],
  sources: [
    {
      label: "Smarkets: what is a betting exchange",
      url: "https://help.smarkets.com/hc/en-gb/articles/115001820389-What-is-a-betting-exchange",
    },
    {
      label: "Smarkets: what is lay betting on an exchange",
      url: "https://help.smarkets.com/hc/en-gb/articles/115003374849-What-is-lay-betting-on-an-exchange",
    },
    {
      label: "Smarkets: how to calculate the liability of a lay bet",
      url: "https://help.smarkets.com/hc/en-gb/articles/115003381865-How-to-calculate-the-liability-of-a-lay-bet",
    },
    {
      label: "Smarkets: commission breakdown",
      url: "https://help.smarkets.com/hc/en-gb/articles/212106009-Commission-breakdown",
    },
    {
      label: "GambleAware",
      url: "https://www.gambleaware.org/",
    },
  ],
  related: [
    "peer-to-peer-sports-betting",
    "matched-betting",
    "hedge-betting",
    "line-shopping",
    "novig-review",
  ],
  updated: "2026-11-26",
};
