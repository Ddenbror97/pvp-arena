import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cs2-knife-prices",
  cluster: "CS:GO heritage",
  keyword: "cs2 knife prices",
  secondary: [
    "karambit price",
    "cs2 knife value",
    "doppler knife price",
    "how much is a cs2 knife",
  ],
  title: "CS2 Knife Prices: What Moves Value and Wear",
  description:
    "What moves CS2 knife prices: finish, wear, pattern, StatTrak, liquidity, and why a knife is a worse chip than a dollar stablecoin.",
  h1: "CS2 knife prices: finish, wear, pattern and liquidity",
  answer:
    "CS2 knife prices are set by finish, wear, pattern, StatTrak and how easy the knife is to sell, not by a published payout table. A Factory New Karambit Doppler can be worth many times a Battle-Scarred vanilla of the same model. That number is a market quote, not a chip. Steam takes about 15 percent on Community Market sales, third-party books are thinner than they look, and a knife can sit listed while its quote moves. A dollar stablecoin does not do that.",
  facts: [
    "CS2 knives are cosmetic; they do not change damage, spray or movement.",
    "Wear uses float bands from Factory New through Battle-Scarred; lower float usually sells higher on the same finish.",
    "Pattern indexes (Doppler phase, Fade percent, Case Hardened blue) can multiply a listing far above the 'same name' median.",
    "Steam Community Market fees on CS2 items are typically a 5 percent Steam fee plus a 10 percent game fee.",
    "A knife is a worse gambling chip than USDC because price, fees and sale time sit outside the round.",
  ],
  sections: [
    {
      id: "what-moves",
      title: "What actually moves CS2 knife prices",
      body: `A knife in Counter-Strike 2 is a rare cosmetic. It comes from a case, a drop, a trade or a market buy. It does not make you a better player. People still pay real money for how it looks, and that is the whole market.

CS2 knife prices are not one number. Search "karambit price" and you will see a spread from cheap vanillas to six-figure Doppler and gem listings. The model is only the first filter. Finish, wear, pattern, StatTrak, stickers, souvenir status and how many buyers are actually online all change the quote.

Think of the price as a stack of discounts and premiums on top of a base model:

- **Model**: Karambit, M9 Bayonet, Butterfly, Talon and the rest. Scarcer animations and older collections sit higher.
- **Finish**: Doppler, Fade, Lore, vanilla, rusted covers. Some finishes have almost no demand.
- **Wear**: Factory New through Battle-Scarred. A scratch across the play side can erase a third of the ask.
- **Pattern**: Phase, gem, blue percentage. Two knives with the same name are not the same SKU.
- **StatTrak**: A kill counter. It usually adds a premium, not a new game.
- **Liquidity**: What you can sell this week, not what a screenshot claimed last month.

This sits in the [CS:GO heritage](/guides/topics/csgo-heritage) cluster because knives were the high-status chip of the skin-gambling years. They still are, on paper. They are a poor unit of account. For how ordinary skins are priced, see [CS2 skin prices](/guides/cs2-skin-prices).`,
    },
    {
      id: "wear-pattern",
      title: "Wear, float and pattern: the same name is not the same knife",
      body: `Wear is a float between 0 and 1, bucketed into five labels. The labels are what most people search. The float is what traders argue about.

| Wear | Typical float | What buyers do |
| --- | --- | --- |
| Factory New | 0.00–0.07 | Pay up for clean play-side metal |
| Minimal Wear | 0.07–0.15 | Often the value band if FN looks identical in-game |
| Field-Tested | 0.15–0.38 | Largest supply; scratches start to show |
| Well-Worn | 0.38–0.45 | Discount unless the finish hides wear |
| Battle-Scarred | 0.45–1.00 | Cheap unless a "black gem" or similar look is the point |

A 0.01 Factory New and a 0.06 Factory New share a label and can differ by hundreds of dollars on a high finish. Screenshots lie; inspect the float.

Pattern is the other silent multiplier. Doppler and Gamma Doppler split into phases; Ruby, Sapphire, Black Pearl and Emerald sit above the common phases. Fade is priced by gold-to-purple percentage. Case Hardened is priced by how much blue sits on the play side. Two "Doppler" karambits are not interchangeable.

StatTrak adds a counter and a smaller buyer pool. Souvenir knives from Majors are a different book again. Stickers can add value or do nothing. None of this is a house edge. It is fashion inventory.

If you are using knives as inputs to a contract, the output is still an item with the same problems. The [CS2 trade-up calculator](/guides/cs2-trade-up-calculator) is for expected item value, not for turning a blade into a stable chip.`,
    },
    {
      id: "worked-example",
      title: "Worked example: listing a Doppler versus holding USDC",
      body: `Suppose a Karambit Doppler (Phase 2), Field-Tested, no StatTrak, last sale $1,800 on a third-party book. You want $1,800 of "balance" for a session.

### Path A — sell on Steam Community Market

You list so that you receive $1,800. With the usual CS2 15 percent stack, the buyer pays about $2,070. If instead you list at a $1,800 buyer price, you receive about $1,565 after Steam's 5 percent and the 10 percent game fee, before rounding. That is [Steam market fees](/guides/steam-market-fees) doing what they always do. You also wait for a buyer who wants that exact phase and wear. If the book moves 8 percent down while you wait, the cash is smaller still.

### Path B — sell on a third-party market

Fees are often lower than 15 percent, but you eat spread, withdrawal holds and the site's solvency. Instant sale buttons are bids, not mid-market. A $1,800 "price" can become $1,680 in the wallet after the spread.

### Path C — deposit the knife on a skin site

The site values it. Deposit rates are often below the public ask. You now hold site coins that track their book, not yours. Withdrawal may be a different knife at their ask. That is the old skin-gambling loop in [skin gambling vs crypto](/guides/skin-gambling-vs-crypto).

### Path D — sell once, hold USDC, play cash PvP

You take the haircut once, hold a dollar token, and stake a number that does not change while the round runs. On PVPspinArena that chip is USDC or ETH on Base, shown in USD. The knife is out of the pot.

| Path | What $1,800 "means" | Extra risk after the sale click |
| --- | --- | --- |
| Steam list | Buyer price or you-receive, 15% apart | Wait time, quote drift |
| Third-party | Bid minus fee | Site and withdrawal risk |
| Skin deposit | Their valuation | Spread on the way out |
| USDC chip | $1.00 per token, by design | Network and site risk only |

The Doppler can still be a collectible you like. It is a bad chip.`,
    },
    {
      id: "liquidity",
      title: "Liquidity, books and why a quote is not cash",
      body: `Liquidity is how fast you can sell near the last print. Cheap vanillas in popular models turn over. A high-tier gem can have one serious bid. Screenshots of "how much is a CS2 knife" mix those two markets.

Third-party graphs look continuous because they interpolate. The real book is a handful of bids. If two sellers list under you, your ask is wallpaper. If a new case floods similar finishes, the median drops and your "value" was yesterday's print.

Steam's own market adds another constraint: wallet funds, region rules, trade holds and the 15 percent cut. You cannot treat a Community Market listing like a bank wire. You also cannot treat a bot deposit like cash. Valve's terms restrict using Steam for gambling; that is a legal and account risk, not a pricing footnote. Read the [Steam Subscriber Agreement](https://store.steampowered.com/subscriber_agreement/) before you send a knife to any third party.

Cash-out fantasy is how people over-bet. They count a $2,400 listing as $2,400 of bankroll, then discover the bid is $2,050 and the Steam path is $2,090 to the buyer for $1,800 in the wallet. Budget the bid you can actually hit this week, after fees. If you cannot name that number, you do not have a chip. You have an unsold collectible.

New finishes and operation drops reprice whole families in a day. A knife that was "the" Doppler last season can be the dull one this season. Collectors care. A pot should not.`,
    },
    {
      id: "worse-chip",
      title: "Why a knife is a worse chip than a dollar stablecoin",
      body: `A gambling chip should be boring. You should know what $20 is before the draw, during the draw and after the draw.

A knife fails that test in four ways:

1. **The unit moves.** Finish hype, pro skins and case supply change the quote while you are in a queue.
2. **The unit is not fungible.** Your Phase 2 is not their Phase 4. Pots that "value" knives are running an appraisal desk, not a ledger.
3. **The rails take a cut.** Steam's 15 percent, third-party spreads and skin-site deposit rates are fees you do not see on a USDC transfer of the same dollars.
4. **Cashing out is another market.** Winning a knife is not winning dollars. You still have to sell it.

USDC is designed to stay near one dollar. On PVPspinArena you deposit USDC or ETH on Base; ETH is converted and balances are shown in USD. There is no float inspector and no Doppler phase. The round is Jackpot, Coinflip or Roulette. Results can be checked on the [fairness](/fairness) page.

That is the contrast, not a claim that crypto play is "safe." You can still lose the stake. You cannot lose an extra 12 percent because the bid walked away while the wheel was spinning.

PVPspinArena is not a skin site. It will not take a karambit, value it, or send you a Bayonet when you withdraw. If you want the blade, keep it in the inventory. If you want a session, sell it first and stake a number.`,
    },
    {
      id: "buy-without-lying",
      title: "How to read a knife listing without lying to yourself",
      body: `If you are buying a knife as a collectible, do the boring work.

1. **Inspect float and pattern index**, not only the wear label and the beauty shot.
2. **Compare the same SKU** — model, finish, StatTrak, souvenir — across Steam and at least one third-party book.
3. **Price the exit.** What is the bid today, after fees? That is your real mark-to-market.
4. **Ignore streamer unboxings.** A case opening is a lottery ticket, not a price feed. See [CS:GO case opening](/guides/csgo-case-opening) for the odds problem.
5. **Do not deposit it to gamble.** If the plan is a pot, convert to cash first.

If you are selling, decide the you-receive number before you open the listing form. Steam's two boxes — buyer pays versus you receive — exist because of the 15 percent stack. Use the you-receive box when you are budgeting.

None of this is investment advice. Knives can go nowhere for years. They can also spike when a clip goes viral. That volatility is why they are interesting to collectors and useless as chips.

You must be 18 or older to gamble. A knife in a teenager's inventory is still an item, not a reason to open a skin site. If play is getting away from you, use the [responsible gambling](/responsible-gambling) page and stop.`,
    },
    {
      id: "summary",
      title: "What to remember about knife value",
      body: `CS2 knife prices move on finish, wear, pattern, StatTrak and liquidity. The name on the inspect screen is a category, not a quote. Steam's 15 percent and thinner third-party books mean a screenshot is not a bankroll. A knife is a collectible with a slow, fee-heavy exit. A dollar stablecoin is a chip.

PVPspinArena runs cash PvP — Jackpot and Coinflip — plus a coloured Roulette wheel, in USDC and ETH on Base. It does not hold blades. If you came here from a Doppler tab, sell the item on a market you trust, then decide whether a session is still worth a fixed dollar amount. That decision is the whole point of separating fashion from a pot.`,
    },
  ],
  faqs: [
    {
      q: "Why do two knives with the same name have different prices?",
      a: "Wear, float, pattern index, StatTrak and stickers change the SKU. A Doppler phase or a blue gem is not the same item as a dull roll of the same finish.",
    },
    {
      q: "How much is a CS2 knife in general?",
      a: "There is no single number. Cheap vanillas can be tens of dollars; high-tier karambits and gems can be thousands. Always price the exact float and pattern.",
    },
    {
      q: "Does StatTrak always increase a knife's price?",
      a: "Usually there is a premium, but the buyer pool is smaller. On some finishes the extra is thin once you subtract fees and wait time.",
    },
    {
      q: "Can I deposit a knife on PVPspinArena?",
      a: "No. PVPspinArena accepts on-chain Bitcoin, and USDC and ETH on Base. Sell the knife first if you want a dollar stake.",
    },
    {
      q: "Is a listed price the same as cash?",
      a: "No. Steam takes about 15 percent on CS2 sales, third-party bids sit below asks, and a listing can sit while the quote moves.",
    },
    {
      q: "Are knives a good way to store a gambling bankroll?",
      a: "No. They are illiquid, non-fungible and fee-heavy. A stablecoin keeps the unit still while you play.",
    },
  ],
  sources: [
    { label: "Counter-Strike 2 official site", url: "https://www.counter-strike.net/" },
    {
      label: "Steam Support — Community Market FAQ",
      url: "https://help.steampowered.com/en/faqs/view/61F0-72B7-9A18-C70B",
    },
    {
      label: "Steam Subscriber Agreement",
      url: "https://store.steampowered.com/subscriber_agreement/",
    },
    { label: "Circle — USDC", url: "https://www.circle.com/en/usdc" },
  ],
  related: [
    "pvp-gambling",
    "cs2-doppler-phases",
    "case-hardened-blue-gem",
    "cs2-agents",
    "cs2-charms",
  ],
  updated: "2026-09-26",
};
