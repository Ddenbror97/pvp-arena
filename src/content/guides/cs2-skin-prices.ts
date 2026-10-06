import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cs2-skin-prices",
  cluster: "CS:GO heritage",
  keyword: "cs2 skin prices",
  secondary: ["cs2 skin value", "counter strike skin prices", "skin float", "steam market prices"],
  title: "CS2 Skin Prices: What Moves Value and How to Check",
  description:
    "What moves CS2 skin prices: rarity, float, stickers, liquidity, and why using skins as casino chips is a worse unit than a dollar stablecoin.",
  h1: "CS2 skin prices: rarity, float, liquidity and gambling risk",
  answer:
    "CS2 skin prices are market prices for cosmetic weapon items, set by supply and demand on the Steam Community Market and third-party exchanges. Rarity, wear (float), pattern, stickers and how easily the item sells all move the number. That number is a trading quote, not a stable chip, which is why using skins as casino credit is a worse unit than a dollar stablecoin.",
  facts: [
    "CS2 skins are cosmetic only; they do not change gun damage or accuracy.",
    "Wear is stored as a float value from 0 to 1, which maps onto Factory New through Battle-Scarred.",
    "Valve has published case rarity odds; most openings return common items worth less than a key.",
    "Steam Market listings settle in Steam Wallet funds, not unrestricted cash.",
    "A stablecoin such as USDC is designed to stay near $1, so a $10 stake is still $10 while you play.",
  ],
  sections: [
    {
      id: "what",
      title: "What a CS2 skin price actually is",
      body: `A CS2 skin price is the amount someone is willing to pay for a specific cosmetic right now. It is not a manufacturer's suggested retail price. Valve does not publish an official dollar value for an AWP Asiimov. Traders do, by posting buy and sell orders.

The Steam Community Market is the default public tape: last sold, lowest ask, highest bid, all in Steam Wallet currency. Third-party markets quote cash or crypto and often sit a few percent away from Steam because they offer a different exit (real money versus wallet credit) and take a fee.

This guide sits in the [CS:GO heritage cluster](/guides/topics/csgo-heritage) because the pricing machinery is the same one that turned skins into gambling chips after 2013. If you want the loot-box side, read [CS:GO case opening](/guides/csgo-case-opening). If you want why those chips were a bad bankroll, read [skin gambling versus crypto](/guides/skin-gambling-vs-crypto).

Trophy screenshots of Souvenir Dragon Lores and record Howls are not a price method for a Field-Tested playskin. A knife category, a full inventory sum and Valve's market cut are separate jobs. This page stays on how a single item is quoted.

PVPspinArena does not price, buy or accept CS2 skins. The rest of this page teaches you how the market works so you can check a listing like an adult, then explains why that listing is a poor unit to bet with.`,
    },
    {
      id: "rarity",
      title: "Rarity, collections and why supply dominates",
      body: `Every skin belongs to a collection or a case. New cases add supply. Old cases get rarer when they stop dropping. A Covert rifle from an active case is usually cheaper than the same rarity from a discontinued collection, because more copies still enter the market every day.

Wear bands matter almost as much as the name. Factory New and Minimal Wear copies of a popular finish can trade at several times a Battle-Scarred one. Collectors pay for a clean look. That is taste, not a hidden stat.

### What does not move price

- The gun's in-game performance. Skins are paint.
- A streamer using it for one match, unless that clip actually changes demand.
- A gambling site's internal credit value. That is their spreadsheet.

Patches, operations and trade-up recipes can reprice a whole collection in a week. If you hold an item as "value", you are holding fashion inventory. Our [CS2 betting guide](/guides/cs2-betting) is about match odds. This page is about why the sticker on your rifle is not a savings account.

### A supply shock you can picture

A new operation case starts dropping. The first week, a Covert rifle from that case might list at $80 because almost nobody has opened one yet. Two months later the same wear band can sit at $25 because the drop pool printed thousands of copies. Nothing about the paint changed. Supply did. The reverse happens when a case leaves the drop pool: existing copies become the whole stock, and patient holders wait for the next wave of collectors.

That is a trading story. It is a terrible bankroll story. A $80 chip that becomes a $25 chip while you are waiting on a trade hold is a second bet you did not mean to place.`,
    },
    {
      id: "float",
      title: "Float, stickers and pattern: the details that change a quote",
      body: `Float is a number from 0 to 1 stored on the item. Lower usually means cleaner. Two Factory New skins can still differ: 0.01 looks better than 0.06, and some buyers will pay a premium for a low float screenshot. High-tier traders inspect the inspect link, not just the wear name.

### Stickers

Applied stickers, especially old tournament holos and rare capsules, can add a large premium or, if placed badly, almost nothing. A scraped sticker is not the same asset as a clean one. Sites that auto-value inventories often ignore sticker value or apply a blunt percentage. That is how a $200 stickered rifle becomes $80 of "site credit".

### Patterns

Some finishes are pattern-based: Case Hardened blues, Fade percentages, Doppler phases, marble fades. The name on the tile is not the item. Two "Factory New Case Hardened" AK-47s can differ by thousands of dollars. If a price tool does not show the pattern index, it is not pricing the skin you hold.

Check the inspect, the float, the stickers and the pattern before you trust a headline number. Then check actual completed sales, not only the lowest current ask. An ask is a wish. A sale is a price.`,
    },
    {
      id: "liquidity",
      title: "Liquidity: the part price screenshots leave out",
      body: `Liquidity is how fast you can sell near the last price without moving the market. A $3 mil-spec with dozens of daily Steam sales is liquid. A $1,200 souvenir with one sale last month is not.

### Why traders care

- **Spread.** The gap between best bid and best ask is the cost of being impatient.
- **Steam fees.** Valve takes a cut on Community Market sales. Your "last sold $50" is not $50 in your pocket.
- **Wallet lock-in.** Steam Market proceeds become Steam Wallet funds, not a bank transfer.
- **Third-party cash-out.** External markets may pay cash or crypto and add their own fees, holds and scam risk.

A gambling site that "values" your inventory at mid-market is quoting a number you cannot necessarily exit at. That is fine for a collection screenshot. It is a bad bankroll. If you cannot sell the item in a day without eating a 15% haircut, it is not $X. It is $X minus friction, time and hope.

### Steam Wallet versus cash, in one table

| Exit | What you receive | Typical extra cost |
| --- | --- | --- |
| Steam Community Market | Steam Wallet funds | Valve's market cut |
| Third-party cash market | Cash or crypto | Their fee, hold and counterparty risk |
| Gambling site credit | A number on an overlay | Deposit markdown plus withdraw inventory |

The same AWP can print three honest numbers on the same afternoon. Pick the exit first, then read the tape that belongs to it.`,
    },
    {
      id: "check",
      title: "How to check a CS2 skin price, with a worked example",
      body: `Use more than one tape and write the friction down.

### Worked example

You want a price on a Minimal Wear AWP with a mid-range float and no special stickers.

1. Open the Steam Community Market listing for that exact market hash name. Note last sold, lowest ask and volume.
2. Compare two cash markets for the same wear and a similar float. Ignore pattern-only premia if this finish is not pattern-based.
3. Subtract Steam's market fee from a Steam sale, or the cash market's fee from a cash sale.
4. Ask whether you could sell three copies this week without crashing the bid. If volume is two sales a month, haircut the number.

Suppose Steam last sold at $42.00, the lowest ask is $44.50, and a cash market bid is $38.00. After fees you might net about $36–$40 depending on the rail. The honest trading range is that band, not the $44.50 ask you screenshot for a friend.

If a site then credits the same AWP at $31, you have found the deposit spread. That gap is not "the market". It is the casino's buy price.

Repeat the exercise on a low-volume souvenir. Steam last sold at $220 three weeks ago. Cash bids may sit near $170 if they exist at all. A site that credits $200 is quoting a number you cannot hit this week. That is when people keep gambling until a matching withdraw appears.`,
    },
    {
      id: "chips",
      title: "Why skins are a worse gambling unit than a stablecoin",
      body: `A chip should be boring. CS2 skin prices are interesting, which is the problem.

| Property | CS2 skin | USDC-style stablecoin |
| --- | --- | --- |
| What sets the value? | Collectors and supply shocks | A 1:1 dollar design |
| Deposit | Trade bot, valuation table | On-chain transfer |
| While you play | Price can move | Balance stays in dollars |
| Cash-out | Sell an item, eat fees | Send the token |
| Audit | Site's price list | Public amount |

Using skins as chips stacks three bets: the game result, the site's valuation, and the market after you win. You can "win" a pot and still be down versus the cash you could have kept. That is not a secret edge. It is extra variance you did not need.

A [gambling budget](/guides/gambling-budget) is easier when the unit does not need a float check. PVPspinArena shows balances in US dollars after a USDC or ETH deposit on Base. Ten dollars is ten dollars until you bet it. That will not make you a better trader. It will stop you confusing a Doppler phase with a bankroll.`,
    },
    {
      id: "tools",
      title: "Price tools, inspect links and what they omit",
      body: `Most public CS2 skin price tools show a headline number for a market hash name. That is a starting quote for a common wear band, not a valuation of the inspect you are holding.

### What a headline misses

- **Float inside the band.** Two Minimal Wear rifles can be $8 apart if one is 0.08 and the other is 0.14.
- **Stickers.** Auto-price engines often apply a blunt percent or ignore crafts.
- **Pattern.** Case Hardened, Fade, Doppler and marble finishes need the index, not the tile name.
- **Stale sales.** A "last sold" from three weeks ago on a thin book is a rumor.
- **Your exit.** A Steam ask is not a cash bid.

Open the inspect link. Read float, stickers and pattern. Then look at completed sales on the tape you will actually use. If the tool cannot show those fields, treat its number as a category average.

A gambling overlay that "instantly values your inventory" is applying a spreadsheet so the site can buy your items at a discount. Use a tool to learn the market. Do not use the casino's credit column as the tool.`,
    },
    {
      id: "safer",
      title: "Collect, trade or walk away — but do not blur the jobs",
      body: `Skins are allowed to be a hobby. Trade them, inspect them, wait for a low float you like. That is collecting. The moment a site turns the same inspect link into "credit", you have started a different activity with age limits, loss risk and, on many item sites, no licence.

If you gamble, use a unit you can count. If you collect, use markets you can exit. Doing both through the same trade bot is how people lose a knife and then decide the "price" was whatever the overlay said at midnight.

PVPspinArena will not help you liquidate an inventory into a pot. [Jackpot](/) and [Coinflip](/coinflip) take cash stakes. Bring dollars, not a stickered rifle. If the inventory is the fun, keep it in Steam and stay out of the casino column entirely.

Re-check bid, ask and last fills whenever an overlay shows one “value.” If you would not sell at that number today, do not bet as if you already did.`,
    },
  ],
  faqs: [
    {
      q: "What moves CS2 skin prices?",
      a: "Supply from cases and collections, wear and float, pattern, stickers, popularity after updates, and how easily the item sells. There is no official Valve list price.",
    },
    {
      q: "What is skin float?",
      a: "Float is a 0-to-1 wear value stored on the item. Lower is usually cleaner. It sits inside named bands such as Factory New and Battle-Scarred, and collectors pay extra for extreme lows.",
    },
    {
      q: "Are Steam Market prices the real price?",
      a: "They are a real public tape in Steam Wallet funds, after Valve's fee. Cash markets can print a different number because the exit is different. Use both, plus actual sales.",
    },
    {
      q: "Why do gambling sites value my skins lower?",
      a: "They are buying inventory they must later pay out. The markdown is their spread, plus a buffer for price swings and illiquid items.",
    },
    {
      q: "Can I deposit CS2 skins on PVPspinArena?",
      a: "No. The site uses USDC or ETH on Base and shows balances in USD. Skins stay in Steam.",
    },
    {
      q: "Is a rare skin a good bankroll?",
      a: "No. It is a collectible with a bid-ask spread. A bankroll needs a stable unit you can spend without inspecting a pattern index.",
    },
  ],
  sources: [
    { label: "Steam Community Market", url: "https://steamcommunity.com/market/" },
    { label: "Counter-Strike 2 official site", url: "https://www.counter-strike.net/" },
    {
      label: "Steam Subscriber Agreement",
      url: "https://store.steampowered.com/subscriber_agreement/",
    },
    { label: "Circle: USDC overview", url: "https://www.circle.com/usdc" },
  ],
  related: [
    "pvp-gambling",
    "most-expensive-cs2-skins",
    "cs2-knife-prices",
    "cs2-doppler-phases",
    "case-hardened-blue-gem",
  ],
  updated: "2026-09-26",
};
