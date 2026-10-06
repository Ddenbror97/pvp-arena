import type { Guide } from "./types";

export const guide: Guide = {
  slug: "rust-skin-prices",
  cluster: "CS:GO heritage",
  keyword: "rust skin prices",
  secondary: ["rust item prices", "rust skin value", "rust workshop skins", "rust skin market"],
  title: "Rust Skin Prices: What Moves Value and Liquidity",
  description:
    "What moves rust skin prices: rarity, twitches, item type, thin markets, and why using skins as casino chips is messier than a dollar balance.",
  h1: "Rust skin prices: rarity, liquidity and gambling risk",
  answer:
    "Rust skin prices are whatever a buyer will pay today for a cosmetic on the Steam Community Market or in a peer deal — not Facepunch’s old store tag. Rarity, Twitch exclusives, item type (AK versus a wood door) and thin order books move that number. Using the skin as a casino chip adds holds, fees and bot risk on top of a quote that can gap overnight.",
  facts: [
    "Facepunch sells new cosmetics on the official Rust item store; many later trade on the Steam Community Market (app 252490).",
    "Workshop submissions are not prices. A skin has a market only after Facepunch ships it and Steam lists it.",
    "Twitch-drop and other exclusive lines can stay thin: high asks, few bids.",
    "A Steam Market sale still pays wallet funds minus the usual Steam plus publisher cut, about 15%.",
    "Rust skin gambling uses the same bot-and-hold problems as CS skins, with even patchier books.",
  ],
  sections: [
    {
      id: "what-moves",
      title: "What actually moves rust skin prices",
      body: `**Rust skin prices** are not a Facepunch official list after the first sale. They are last trades and current asks on the [Steam Community Market for Rust](https://steamcommunity.com/market/search?appid=252490), plus whatever a cash buyer whispers.

Four forces show up in almost every spike or dump:

1. **How few copies exist** — store time-boxes, drops, and retired lines.
2. **Twitch and other exclusives** — “twitches” in search slang: drop-only or stream-bundle items with a small float of owners.
3. **Item type** — weapons you see every raid versus a deployable you place once.
4. **Book thickness** — a last sale of $80 with no bid at $40 is not an $80 inventory.

[CS2 skin prices](/guides/cs2-skin-prices) are a thicker, more watched book. Rust often looks like that market’s illiquid cousin: same Steam rails, fewer daily fills.

A useful habit: write the **bid**, the **ask**, and the **last three sales** for any item you are about to call a price. If you only have the ask, you have a shop window, not a market. If the last three sales are 90 days old, you have history class.

Adults 18+ only. This page does not give investing advice. Cosmetics go to zero for years and then do not. A streamer “loadout tour” is entertainment. It is not a price list you should paste into a deposit screen.`,
    },
    {
      id: "store-workshop",
      title: "Item store, workshop and the rust skin market",
      body: `Three layers get collapsed into “**rust workshop skins**.”

### Workshop

Anyone can submit a skin in the Rust Workshop. A vote or a pretty screenshot is not a listing. It has no **rust skin value** until Facepunch accepts it into a store round and Steam creates a marketable item. Favourites on a Workshop page are not bids. Do not price a submission as if it already shipped.

### Official store

New cosmetics rotate on the [Facepunch store](https://rust.facepunch.com/store/) and the in-game / Steam item store. You pay a set dollar tag. Some items are tradable later; some stay bound. Read the listing. A bound store pack is not a chip and not a market quote.

### Community Market

Once an item is tradable, **rust item prices** are player-set. Steam takes the usual market cut — Steam fee plus game-publisher fee, typically about 15% — and pays you wallet funds you cannot withdraw as bank cash. [Steam market fees](/guides/steam-market-fees) is the fee walk.

### Worked store-versus-market example

| Path | You pay | You receive if you sell later |
| --- | --- | --- |
| Store day-one at $4.99 | $4.99 | Whatever the book is, minus ~15%, in Steam wallet, after any trade hold |
| Market buy at $12.00 | $12.00 listed | Next sale minus ~15%, if a bid exists |
| “Site value” $18 deposit | $0 cash; you sent the item | Site coins, not a Steam bid |

The third row is how skin lobbies flatten **rust skin market** quotes. Believe a filled Steam sale over a deposit ticker.

Store packs that unbundle on the Market can look like a bargain until you price each piece at the bid, not the pack tag. A $12 pack that splits into four $2 asks is a $8 window, then 15% if you sell. Do the add. Do not use the trailer price as rust skin value.`,
    },
    {
      id: "twitch-exclusives",
      title: "Twitch drops, rarity and thin books",
      body: `Rust has used Twitch drops, plus other limited grants, enough that “twitches” is a real price word.

### Why exclusives gap

A drop that ran for two weekends has a hard owner count. If those owners are collectors, the ask stays high and the bid stays empty. One panic listing can print a “price” that never repeats.

### Why common store rifles stay calmer

An AK skin that sat in the store for months has more copies. The book is still thin versus CS2, but you can often see a cluster of sales instead of one lonely $400 ghost.

### How to read a quote without lying

- Prefer a tight cluster of recent sales over the highest ask.
- If the buy order wall is $8 and the ask is $40, your “value” is closer to $8 if you need out today.
- Recheck after a new store round. Facepunch shipping a similar finish can flatten last month’s unique.

Rarity here is not a CS case colour. It is supply, demand and whether anyone is online with wallet funds this hour.

Twitch campaigns also train people to treat a drop as an earnings event. A free skin with a $30 ask is not $30 income. It is an item you might sell after a hold, after a fee, if a bid exists. Most drops are common clothing. Price those at the book, which is often cents.`,
    },
    {
      id: "item-type",
      title: "Item type: why an AK and a wood door are not one market",
      body: `Rust cosmetics cover guns, armour, clothing, building parts, furniture and joke deployables. They do not share liquidity.

### Higher attention

Assault rifles, metal facemasks, and a few “always on the hotbar” guns attract more screenshots and more traders. Prices still swing. They just print more often.

### Lower attention

Garage doors, boxes, and seasonal furniture can have beautiful art and a dead book. A last sale from three months ago is archaeology.

### Sets versus singles

Armour sets and store packs fragment when people sell pieces. The “set price” on a YouTube thumbnail may assume all four pieces at yesterday’s peak. Add the pieces you actually own, at today’s fills.

Clothing you hide under armour is closer to a door than to an AK: someone must care about the screenshot. Metal facemasks and chests get more wear-time on stream, so more people search the name. That still does not make a last ask a bid.

If you need a single number for a backpack, build it like the CS adder: unit price you believe, times quantity, minus fee if you would use Steam. There is no second inventory-value product on this site for Rust; do not wait for one. The method is the same honesty test as [CS2 inventory value](/guides/cs2-inventory-value).`,
    },
    {
      id: "liquidity",
      title: "Liquidity: the part rust skin value posters skip",
      body: `Liquidity is how fast you can sell near the last print without eating a 30% gap.

### Signs the book is thin

- One listing, rest of the page empty.
- Last sale older than the last Facepunch store refresh.
- Buy orders stacked far below asks.
- Name confusion (two skins that look alike in a thumbnail).

### Holds make thin worse

A Steam trade or listing hold parks the item while the book moves. See [Steam trade hold](/guides/steam-trade-hold) if the skin is sitting in pending. A seven- or fifteen-day wait on a twitch exclusive is how a “$200 skin” becomes a story.

### Fees make thin worse again

You need the next buyer to pay enough that 85% of their click still feels like a win versus the store tag you paid. On a quiet door skin, that buyer may not exist this month.

Currency tabs matter. A euro listing converted in your head at yesterday’s FX is how two traders disagree by 8% and both think the other is lying. Pick one currency for the notebook.

None of this is an argument to “invest.” It is why a screenshot is not a stack of dollars.`,
    },
    {
      id: "gambling",
      title: "Why skins are messier casino chips than a dollar balance",
      body: `[Rust gambling](/guides/rust-gambling) lobbies copy the CS bot loop: Steam login, deposit skin, play a ticker, withdraw some other skin. The book is thinner, so the ticker lie is larger.

### Extra mess versus a USDC stake

- **Valuation.** The site’s “rust skin prices” column is their column.
- **Inventory.** Bots hold what they hold. Your “withdraw the same AK” may be a different finish.
- **Holds and bans.** Steam can delay or lock the account. [Skin gambling vs crypto](/guides/skin-gambling-vs-crypto) is the general case.
- **Agreement.** Using Steam to gamble is against Valve’s Subscriber Agreement.

A dollar stablecoin is a boring chip: one unit, one chain, no workshop lore. PVPspinArena uses USDC or ETH on Base for player-versus-player Jackpot, Coinflip and Roulette. It does not list Rust cosmetics and is not a Kick or Twitch house. Watch a pot on [Jackpot](/) if you want to see a USD stake with no skin ticker. The pot share is a percent of dollars, not a percent of a Facepunch store tag. That is the whole point of a dollar chip: everyone in the room is counting the same unit.

If the urge is already “deposit the whole wardrobe,” that is a budget problem, not a pricing problem. 18+ only.

A rust skin market tab with 200 listings is still not CS2 volume. Sort by quantity sold, not by pretty art. If sold/day is blank or tiny, your exit is a story you tell yourself.`,
    },
    {
      id: "heritage",
      title: "Where this sits on PVPspinArena",
      body: `Rust is not Counter-Strike. The pages still sit in [CS:GO heritage](/guides/topics/csgo-heritage) because the cashier design — Steam items as chips — is the same leftover idea.

Use this guide to read **rarity, twitches, item type and thin markets**. Use the Rust gambling guide when you need the lobby formats. Use market-fees and skin-versus-crypto when the question is “why is my wallet not cash?”

We will not publish a second “Rust inventory value” essay that duplicates the adder logic. Price the lines you have, on the book that exists today, and do not let a site coin rename them.

If you only remember one method: bid, ask, last three sales, fee, hold. Five numbers. Skip any of them and you are quoting a vibe. Rust punishes vibe quotes because the next fill may be next month. Write the date on the note. A January ask is not a March price.`,
    },
  ],
  faqs: [
    {
      q: "What decides rust skin prices?",
      a: "Copies in circulation, whether the line was store-wide or drop-exclusive, how desirable the item type is, and how thick the Steam book is today. Facepunch’s old store tag is only the first sale.",
    },
    {
      q: "Are Rust Workshop skins worth money?",
      a: "Not until Facepunch ships them as real items and Steam lists them. A Workshop page is a submission, not a market.",
    },
    {
      q: "Why are Twitch drop skins expensive or unsellable?",
      a: "Supply is capped and owners are often collectors, so asks sit high while bids stay thin. A single listing is not a price you can hit.",
    },
    {
      q: "Can I cash out Rust skins through Steam?",
      a: "Steam pays Community Market sales into Steam wallet, minus about 15% fees. That wallet is not a bank withdrawal.",
    },
    {
      q: "Should I use Rust skins as gambling chips?",
      a: "They are a worse chip than a dollar token: thin prices, holds, bot inventories and Valve’s rules. A USDC balance is at least a number you can count.",
    },
    {
      q: "Does PVPspinArena buy or price Rust skins?",
      a: "No. This is a pricing explainer. The site is crypto PvP on Base, not a Rust skin market.",
    },
  ],
  sources: [
    { label: "Official Rust item store (Facepunch)", url: "https://rust.facepunch.com/store/" },
    {
      label: "Steam Community Market: Rust (app 252490)",
      url: "https://steamcommunity.com/market/search?appid=252490",
    },
    {
      label: "Rust Steam Workshop",
      url: "https://steamcommunity.com/workshop/browse/?appid=252490",
    },
    {
      label: "Steam Support: Community Market FAQ",
      url: "https://help.steampowered.com/en/faqs/view/61F0-72B7-9A18-C70B",
    },
  ],
  related: ["pvp-gambling", "tf2-gambling", "rust-gambling", "csgo-coinflip", "cs2-roulette"],
  updated: "2026-09-26",
};
