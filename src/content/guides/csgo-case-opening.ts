import type { Guide } from "./types";

export const guide: Guide = {
  slug: "csgo-case-opening",
  cluster: "CS:GO heritage",
  keyword: "csgo case opening",
  secondary: ["cs2 case opening", "csgo case odds", "cs2 case odds", "is case opening gambling"],
  title: "CS:GO Case Opening: Odds, Value and Real Risks",
  description:
    "How CS:GO and CS2 case opening works: keys, rarity tiers, published drop odds, expected value, loot box rules, and how case sites compare with PvP games.",
  h1: "CS:GO case opening: odds, value and the real risks",
  answer:
    "CSGO case opening, now usually called CS2 case opening, means using a paid key to unlock a weapon case and receive one random skin. Most results are common Mil-Spec skins worth less than the key; rare knives and gloves drop well under 1% of the time. Because you pay money for a random item with a market value, case opening works much like gambling, and on average it returns less than it costs.",
  facts: [
    "A case is opened with a key bought from Valve; the case itself is usually cheap or dropped in game.",
    "Odds published by Valve for China in 2017: Mil-Spec 79.92%, Restricted 15.98%, Classified 3.20%, Covert 0.64%, rare special items 0.26%.",
    "Most openings return an item worth less than the price of the key.",
    "Third-party case sites set their own odds and prices, which can differ from official cases.",
    "Several countries regulate or restrict paid loot boxes.",
  ],
  sections: [
    {
      id: "what",
      title: "What is CS:GO case opening?",
      body: `Weapon cases have been part of Counter-Strike since 2013. A case contains a set of possible skins. To open it, you need a key, which is bought for real money. When you open it, you receive one skin at random from the case's list.

With the move from CS:GO to CS2 in 2023, cases carried over, and the process is the same. People still search for both "csgo case opening" and "cs2 case opening".

### What you pay

- **The case**: often dropped for free in game or bought cheaply on the Steam Community Market.
- **The key**: sold by Valve at a fixed price in most regions.

### What you get

One skin, with a rarity tier and a wear level. Some also come as StatTrak versions that count kills. The skin can be kept, traded or sold on the market, which is what gives it a real-world value.

That value is also why case opening sits so close to gambling. If you are new to the skin economy, our [skin gambling vs crypto guide](/guides/skin-gambling-vs-crypto) explains how skins became a currency.`,
    },
    {
      id: "rarity",
      title: "Rarity tiers explained",
      body: `Every skin in a case belongs to a rarity tier, shown by colour.

- **Mil-Spec (blue)**: the most common tier.
- **Restricted (purple)**: uncommon.
- **Classified (pink)**: rare.
- **Covert (red)**: very rare.
- **Rare special items (gold)**: knives and, in some cases, gloves. The rarest outcome.

### Wear and float

Each skin also has a wear value from Factory New to Battle-Scarred, set by a hidden "float" number. Two copies of the same skin can have very different prices depending on wear.

### StatTrak

About 1 in 10 items from cases is commonly reported to be a StatTrak version, which usually sells for more.

### Patterns

Some skins have pattern variations that collectors pay large premiums for. This adds another layer of randomness to value, and another reason a single opening's worth is hard to predict.`,
    },
    {
      id: "odds",
      title: "CS2 and CS:GO case odds",
      body: `For years, case odds were not public. In 2017, Valve published odds for players in China after local rules required loot box odds to be disclosed. The figures most widely reported are:

- Mil-Spec: 79.92%
- Restricted: 15.98%
- Classified: 3.20%
- Covert: 0.64%
- Rare special item (knife or gloves): 0.26%

### What those numbers mean

- About 4 in 5 openings give the most common tier.
- A Covert skin appears roughly once every 156 openings on average.
- A knife or glove appears roughly once every 385 openings on average.

### Streaks are normal

Because each opening is independent, going hundreds of openings without a knife is normal. The idea that a rare drop is "due" after many attempts is the [gambler's fallacy](/guides/gamblers-fallacy).

These are the official odds as reported; third-party case sites use their own and may not publish them.`,
    },
    {
      id: "value",
      title: "Expected value: do cases pay off?",
      body: `Expected value (EV) is the average value you get back per opening. For almost all cases, EV is lower than the cost of the key.

### Why

Most results are Mil-Spec skins, which often sell for a small fraction of a key's price. The rare items that are worth a lot come up so seldom that, averaged across all openings, they do not make up the gap.

### How to estimate EV yourself

1. List each skin in the case with its market price.
2. Multiply each tier's average price by its drop chance.
3. Add them together.
4. Compare with the cost of the key plus the case.

If the sum is below the cost, you lose money on average. For official cases, it almost always is. That gap works like a house edge, which our [house edge guide](/guides/house-edge) explains.

### Market fees

Selling on the Steam Community Market also carries a fee on each sale, and Steam wallet funds cannot be withdrawn as cash, which lowers real value further.`,
    },
    {
      id: "gambling",
      title: "Is case opening gambling?",
      body: `Whether case opening counts as gambling depends on the law where you live, and the answer is still changing.

### Why many see it as gambling

- You pay real money.
- The outcome is random.
- The prize has a real market value.

Those are the three core features most gambling laws look for.

### How countries have responded

Some countries have taken action against paid loot boxes. Belgium and the Netherlands have both treated certain loot boxes as gambling in the past, and in some cases Valve restricted case opening for players there. Other countries require published odds, and many are still reviewing the issue.

### Age concerns

Counter-Strike has a large teenage audience. Case opening is available to anyone with a Steam account and money, which is why regulators and parents have raised concerns. If you are under 18, you should not gamble in any form.

Rules change often, so check current laws for your country rather than relying on older articles.`,
    },
    {
      id: "case-sites",
      title: "Third-party case opening sites",
      body: `Beyond official cases, many websites offer their own "cases" that you open with site credit, often bought with crypto or skins.

### How they differ

- **Own odds**: the site decides what is in each case and how likely each item is.
- **Own prices**: case prices and item values are set by the site, not the market.
- **Withdrawals**: winnings are usually paid out as skins through trade bots.

### Risks to watch

- Odds may be unpublished or hard to verify.
- Item values shown on the site may be higher than real market prices.
- Some sites have claimed "provably fair" without a working verifier.
- Licensing and legal status vary widely.

### Questions to ask

- Are the odds for every item published?
- Can I verify each opening with seeds?
- What is the real market price of the items I would receive?
- Who holds the licence, and where?

These are the same questions our [are online casinos rigged guide](/guides/are-online-casinos-rigged) recommends for any gambling site.`,
    },
    {
      id: "vs-pvp",
      title: "Case opening vs PvP games",
      body: `Case opening and player-vs-player games both grew out of the CS:GO era, but they work very differently.

### Who you play against

- **Case opening**: you play against the case's odds, set by the operator.
- **PvP games** such as [Jackpot](/) and [Coinflip](/coinflip): you play against other players. The house does not bet.

### Cost

- **Case opening**: the gap between key price and expected item value, often large.
- **PvP on PVPspinArena**: a configurable fee that defaults to 0%.

### Value

- **Case opening**: prizes are skins whose value depends on the market.
- **PVPspinArena**: everything is in USD, backed by USDC on Base.

### Fairness

- **Case opening**: official odds are published for some regions but individual openings cannot be verified.
- **PVPspinArena**: every round is provably fair and can be checked on the [fairness page](/fairness).

Our [CS:GO jackpot guide](/guides/csgo-jackpot) and [PvP gambling guide](/guides/pvp-gambling) explain how the pot and duel formats work.`,
    },
    {
      id: "history",
      title: "A short history of cases",
      body: `Weapon cases arrived in CS:GO in August 2013 with the Arms Deal update. They turned cosmetic skins into a large trading economy almost overnight. Collectors, traders and later gambling sites all built on that economy.

By 2016, skin gambling and case sites had become a major industry, and Valve publicly stated that using Steam for gambling broke its rules. The 2017 publication of case odds for China was another step in the debate over loot boxes. With CS2's launch in 2023, existing skins and cases carried over.

Our [CS:GO gambling history guide](/guides/csgo-gambling-history) covers the full timeline, including the rise of jackpot and coinflip sites.`,
    },
    {
      id: "safer",
      title: "If you open cases",
      body: `If you choose to open cases, treat it as paid entertainment with a known cost, not a way to make money.

- **Set a budget** and stop when it is spent. Our [gambling budget guide](/guides/gambling-budget) has a simple method.
- **Assume you will get the common tier.** Anything better is a bonus.
- **Do not chase a knife.** Hundreds of openings without one is normal.
- **Know the real price** of the items you receive, including market fees.
- **Avoid unverified case sites**, especially ones that hide their odds.
- **Keep your account safe.** Never log in to Steam through links from strangers.

If opening cases starts to feel hard to stop, or you spend more than you planned, take a break and look at the support options on the [responsible gambling page](/responsible-gambling).`,
    },
    {
      id: "ev-example",
      title: "A worked expected value example",
      body: `Here is a simplified example to show how expected value works. The prices are illustrative, not real market data.

Imagine a key costs $2.50 and a case costs $0.50, so each opening costs $3.00. Suppose the average sale value of each tier in that case is:

- Mil-Spec: $0.10
- Restricted: $0.60
- Classified: $3.00
- Covert: $15.00
- Rare special item: $200.00

Using the published odds:

- Mil-Spec: 0.7992 × $0.10 = $0.08
- Restricted: 0.1598 × $0.60 = $0.10
- Classified: 0.0320 × $3.00 = $0.10
- Covert: 0.0064 × $15.00 = $0.10
- Special: 0.0026 × $200.00 = $0.52

Total expected value: about $0.90 per opening, compared with a cost of $3.00. On average, each opening loses about $2.10, or 70% of what you spend. Real cases differ, and prices change constantly, but the pattern of a large gap between cost and expected value is typical.`,
    },
  ],
  faqs: [
    {
      q: "What are the odds of getting a knife in CS2 case opening?",
      a: "Based on odds Valve published for China in 2017, a rare special item such as a knife or gloves drops about 0.26% of the time, roughly 1 in 385 openings.",
    },
    {
      q: "Is CS:GO case opening worth it?",
      a: "Financially, usually not. For most cases, the average value of the items received is lower than the cost of the key.",
    },
    {
      q: "Is case opening gambling?",
      a: "It shares the core features of gambling: paying money for a random prize with real value. Some countries regulate it as gambling; others do not yet.",
    },
    {
      q: "Did case opening change with CS2?",
      a: "The mechanics stayed the same. Cases, keys and existing skins carried over from CS:GO to CS2 when it launched in 2023.",
    },
    {
      q: "Are third-party case opening sites fair?",
      a: "It depends on the site. Check whether odds are published, whether openings can be verified with seeds, and whether item values match real market prices.",
    },
  ],
  sources: [
    { label: "Counter-Strike 2 official site", url: "https://www.counter-strike.net/" },
    { label: "Steam Subscriber Agreement", url: "https://store.steampowered.com/subscriber_agreement/" },
    { label: "Belgian Gaming Commission: loot box research (2018)", url: "https://www.gamingcommission.be/" },
  ],
  related: ["skin-gambling-vs-crypto", "csgo-gambling-history", "house-edge", "csgo-jackpot"],
  updated: "2026-09-25",
};
