import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cs2-trading-sites",
  cluster: "CS:GO heritage",
  keyword: "cs2 trading sites",
  secondary: ["best cs2 trade sites", "skin trading platforms", "trade sites compared"],
  title: "CS2 Trading Sites Compared on Fees | PvP Spin Arena",
  description:
    "Trade sites all promise the best rate. Compare real fee structures, payout speed and safety signals before you move an inventory.",
  h1: "CS2 Trading Sites Compared: Fees, Speed and Safety",
  answer:
    "CS2 trading sites are third-party books that buy, sell or match peer trades for Counter-Strike skins outside the Steam Community Market. Compare them on fee structure, payout speed, hold policy and safety signals—not on banner APRs. Steam Market remains the Wallet rail; trading sites are the cash or crypto rail with their own risk.",
  facts: [
    "Trading sites are not Valve; they use Steam trades plus their own ledgers.",
    "Fee pages differ: percent, spread-only, withdrawal fees or all three.",
    "Instant sell is usually cheaper for the seller than a slow peer fill.",
    "Trade holds and bot inventories affect how fast you can re-list.",
    "PVPspinArena does not operate a skin trading book.",
  ],
  sections: [
    {
      id: "vs-steam",
      title: "How trade sites differ from the Steam market",
      body: `Steam Community Market settles in Wallet funds after Valve’s fee stack. CS2 trading sites settle in cash, balance credit or crypto after their own rules. That is the whole product difference.

This comparison sits in [CS:GO heritage](/guides/topics/csgo-heritage). Adults 18+ only. It does not endorse a brand. For a two-site deep dive see [CSFloat vs Skinport](/guides/csfloat-vs-skinport). For Steam’s fee math see [Steam market fees](/guides/steam-market-fees).

Use Steam Market when Wallet spending is the goal. Use a trading site when you need money that leaves Steam. Mixing the two in your head is how people “sell for $100” and still cannot pay rent.`,
    },
    {
      id: "fees",
      title: "Fee structures explained",
      body: `Ask four fee questions on every site:

1. What does the seller receive on a peer sale?
2. What does an instant-sell bid imply versus last sold?
3. Is there a deposit or listing fee?
4. What does withdrawal cost on each payout rail?

Some books look “zero fee” because they live on spread. Others show a clean percent and a tight book. Neither shape is automatically better. Compute you-receive on the same item across two tabs the same hour.

Fees move. Ranges of a few percent to double-digit instant discounts both appear in the wild depending on liquidity and item tier. Re-read the live page; do not tattoo a blog number from last year onto today’s knife.`,
    },
    {
      id: "instant-vs-peer",
      title: "Instant sell vs peer trade",
      body: `Instant sell: the site (or its liquidity partner) is the buyer. Fast. Wider discount.

Peer trade: another user buys. Often better gross price. Fill risk and more waiting.

High-demand rifles fill. Ugly stickers and odd floats teach patience. If your cashout deadline is tonight, instant is a feature, not a failure.

After either path, Steam’s own clocks still apply. [Steam trade hold](/guides/steam-trade-hold) can park items even when the site UI says done.`,
    },
    {
      id: "bots",
      title: "Trade holds and bot inventories",
      body: `Most reputable books trade through known bots or clear peer flows. Confirm the Steam account name against the site’s published identity every time. A lookalike bot is a classic drain.

Bot inventories get full. Queues form. That is operational friction, not proof of theft—but combined with silence from support it becomes a red flag. Prefer sites that show queue position and deliver status without asking you to “help” via remote software.

Never trade while a second unexpected offer appears. Cancel unknowns. Finish one flow at a time.`,
    },
    {
      id: "safety",
      title: "Safety signals to check",
      body: `Positive signals:

- Long-lived domain, clear company or operator identity, written fee and AML pages.
- Support that does not ask for Guard codes.
- Consistent bot accounts documented on-site.
- Withdrawal history you can verify on your side (bank refs, tx hashes).

Negative signals:

- Only Discord admins, no docs.
- Guaranteed above-market bids in ads.
- Urgent “verify now” links from search ads.
- Requests for seed phrases, passwords or authenticator exports.

[Fake casino sites](/guides/fake-casino-sites) patterns overlap heavily with fake trading portals. Bookmark by typing. [How to sell CS2 skins](/guides/how-to-sell-cs2-skins) has a safer step order you can reuse on any book.`,
    },
    {
      id: "avoid",
      title: "Sites to avoid",
      body: `Avoid anything that:

- Needs your Steam password.
- Pays “double” if you deposit into a case battle first.
- Exists only as a mirror of a famous brand name.
- Refuses to show fees until after you trade.

Also avoid using trading sites as gambling front-doors. If the product is a wager, call it a wager. Cashout is a sale.`,
    },
    {
      id: "compare-two",
      title: "How to compare two offers",
      body: `Pick one item. Open two books. Same hour. Write:

| Field | Site A | Site B |
| --- | --- | --- |
| Bid / you receive | | |
| Estimated hold | | |
| Withdrawal fee | | |
| KYC needed for your amount | | |
| Payout rails you can use | | |

Choose the higher risk-adjusted you-receive, not the prettier UI. Then trade small once before you move a main inventory.

After coins arrive, a Base deposit on PVPspinArena’s [wallet](/wallet) is optional. Trading sites and this casino are separate products. More reading: [CS:GO heritage](/guides/topics/csgo-heritage).

Compare you-receive on the same item across two books in the same hour. Banner percents are theatre; the fill is mathematics.`,
    },
  ],
  faqs: [
    {
      q: "Are CS2 trading sites safer than Steam Market?",
      a: "They solve a different problem. Steam is Wallet-only with Valve’s rules. Trading sites add counterparty and phishing risk in exchange for cash or crypto payouts.",
    },
    {
      q: "Why do fees differ so much between sites?",
      a: "Liquidity model, instant versus peer flow, payout rail and fraud cost all differ. Compare you-receive on the same item instead of headline percents.",
    },
    {
      q: "Can a trading site ban me from Steam?",
      a: "Valve enforces Steam rules. Risky behaviour—scams, banned trade patterns, credential sharing—can lead to Steam restrictions regardless of which site you meant to use.",
    },
    {
      q: "Should I sell knives on the first site in search ads?",
      a: "No. Type the domain you already trust. Ads are a phishing channel.",
    },
    {
      q: "Does PVPspinArena compete with trading sites?",
      a: "No. It does not buy or sell skins. It accepts USDC or ETH on Base for Six-max poker, Jackpot, Coinflip, Roulette, and P2P Slott.",
    },
  ],
  sources: [
    {
      label: "Steam Support — Trading",
      url: "https://help.steampowered.com/en/wizard/HelpWithSteamGuardCode",
    },
    {
      label: "Steam Subscriber Agreement",
      url: "https://store.steampowered.com/subscriber_agreement/",
    },
  ],
  related: [
    "csfloat-vs-skinport",
    "steam-market-fees",
    "steam-trade-hold",
    "how-to-sell-cs2-skins",
  ],
  updated: "2026-11-05",
};
