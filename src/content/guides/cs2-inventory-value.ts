import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cs2-inventory-value",
  cluster: "CS:GO heritage",
  keyword: "cs2 inventory value",
  secondary: [
    "csgo inventory value",
    "steam inventory worth",
    "cs2 inventory worth",
    "how much is my cs2 inventory",
  ],
  title: "CS2 Inventory Value: Price a CSGO and CS2 Loadout",
  description:
    "How to price CS2 inventory value (and older CSGO inventories): market vs cash, the 15% Steam fee, and a simple adder you can use on this page.",
  h1: "CS2 inventory value: price a CS2 or CSGO loadout",
  answer:
    "CS2 inventory value is the sum of listed prices for the items in a Counter-Strike 2 loadout. The same adder covers older CSGO inventory value: CS2 inherited those items in 2023, so one page is enough. A Steam listing is not cash. Wallet funds stay on Steam, and a Community Market sale usually loses about 15% to fees.",
  facts: [
    "This page covers both CS2 inventory value and CSGO inventory value; do not look for a second guide.",
    "A typical Steam Community Market sale pays you about 85% of the buyer’s listed price.",
    "Steam wallet funds cannot be withdrawn to a bank or card.",
    "Third-party cash buyers use their own prices, holds and account risk, not Valve’s list.",
    "PVPspinArena is not a Steam market or case site; play uses USDC or ETH on Base.",
  ],
  sections: [
    {
      id: "calculator",
      title: "How to use the live inventory adder",
      body: `The live calculator sits at the [top of this page](#calculator). It does not pull your Steam inventory and it does not scrape live listings. You type items you already priced, then it adds them.

### Steps

1. Open the adder at [#calculator](#calculator).
2. Enter a name you will recognise later, such as “AK-47 | Redline FT”.
3. Set quantity and a unit price in dollars from a listing you trust.
4. Click Add item for the next row.
5. Leave “Subtract 15% Steam Market fee” on if you want a cash-out-style total, or off if you only want a wallet-style gross.

Gross is quantity times unit price, summed. Net is 85% of that when the fee toggle is on. That 15% is the usual Steam plus publisher cut on a Community Market sale, not a tax on every way to sell.

Price each line yourself. A float, a pattern, StatTrak and a thin sell wall can move a “same” skin by a lot. Our [CS2 skin prices](/guides/cs2-skin-prices) guide is the deeper price walk; this page is only the total.

Name the wear in the row. “Redline” without FT or MW is how people inflate a loadout by pasting the FN ask onto a scuffed copy. If you hold three of a cheap rifle, use one unit price times three — do not invent a “bulk bonus.”

Adults 18+ only. Adding numbers is not a promise that anyone will pay them today.`,
    },
    {
      id: "market-vs-cash",
      title: "Market value is not cash in your pocket",
      body: `People search “how much is my cs2 inventory” and “steam inventory worth” as if the answer were a bank balance. It is not.

### Three different numbers

- **Ask / last sale on Steam.** What the Community Market just printed. Useful, public, and still a Steam-wallet number.
- **After the 15% fee.** What you would receive in wallet funds if that sale filled at the listed price.
- **Cash a buyer would wire.** A third-party quote, usually lower, after their spread, holds and risk.

Steam wallet funds buy games, items and gifts. They do not leave Steam as dollars. If you need rent money, a $400 “inventory worth” screenshot is not $400.

### CSGO inventories use the same adder

A leftover CS:GO loadout is the same item set CS2 uses. Wear, stickers and names carried over. Price those rows the same way. There is no separate “csgo inventory value” article on this site, and there should not be: one adder, one fee, one wallet rule. Searches for steam inventory worth and cs2 inventory worth belong here too. One worksheet.

If you are comparing skins as chips versus a dollar token, the [skin gambling vs crypto](/guides/skin-gambling-vs-crypto) guide is the comparison. PVPspinArena shows balances in USD backed by USDC on Base, which you can move from a [wallet](/wallet) you control.`,
    },
    {
      id: "steam-fee",
      title: "The 15% Steam fee, worked through",
      body: `Valve’s Community Market takes a Steam fee and a game-publisher fee. For Counter-Strike items those two usually add to about **15%** of the sale. The buyer pays the listed price; you receive the rest in Steam wallet.

### Worked example

Suppose you price a small loadout from listings you checked today:

| Item | Qty | Unit $ | Line $ |
| --- | --- | --- | --- |
| AK-47 \\| Redline (FT) | 1 | 18.00 | 18.00 |
| Cheap rifles | 3 | 0.40 | 1.20 |
| Covert knife (MW) | 1 | 220.00 | 220.00 |
| **Gross** | | | **239.20** |

After a 15% market fee: 239.20 × 0.85 = **$203.32** in Steam wallet if every line sold at those asks. Toggle the fee on the adder and you should see the same split.

### Same loadout, two days later

Suppose the knife’s tight cluster of sales is now $195 and the Redline ask is $16.50. Gross becomes 16.50 + 1.20 + 195.00 = **$212.70**. After 15%: **$180.80**. The adder did not break. The book moved. Save the date next to a screenshot if you are comparing weeks.

### What the example hides

- Those asks can sit for days. A “buy now” on a thin knife is often below the last sale.
- Stickers, nametags and rare patterns are not in the unit price unless you put them there.
- A second sale on the same account still pays the fee again.
- StatTrak is a different market hash name. Do not paste the normal ask onto a StatTrak row.

[Steam market fees](/guides/steam-market-fees) walk the 5% + 10% split in more detail. Use this page only to add lines you already believe.`,
    },
    {
      id: "where-prices",
      title: "Where to read a unit price",
      body: `The adder is only as honest as the unit you type.

### Steam Community Market

Search the exact market hash name, including wear. Use several recent sales, not one outlier. If the sell wall is one listing 30% above the next, the high ask is not your inventory value.

### Third-party indexes

Sites that chart CS2 prices are useful for history. They are not a bid. Some blend Steam and peer-to-peer quotes. If you paste their number, say so to yourself: you are pricing a chart, not a filled order.

### Knives and thin items

A knife can be most of a loadout. One stale listing will dominate the total. Cross-check [CS2 knife prices](/guides/cs2-knife-prices) ideas (wear band, pattern, volume) before you treat a screenshot as money.

### What not to do

Do not paste a site’s “deposit value” from a skin casino. Those numbers are often marked up so the case or pot looks generous. They are not Steam asks and they are not cash.

### Cheap filler and keys

Cases, keys and 0.03 rifles can pad a row count without moving the total. If 40 of 45 lines are under a dollar, say so. The headline number is usually the knife plus two rifles. The adder is still useful: it stops you forgetting a $12 agent or a sticker capsule you would actually sell.

PVPspinArena does not take skins. If you want a dollar figure you can actually send, that is a USDC or ETH balance on Base, not a loadout screenshot.`,
    },
    {
      id: "what-moves",
      title: "What moves a loadout total after you add it",
      body: `A saved total goes stale. The same 20 items can be worth a different number next week without you trading anything.

### Wear and float

Two Redlines are not one price. Factory New and Battle-Scarred can be several times apart. If you average “the skin” instead of the wear you hold, the adder lies. Float bands belong on the unit, not as a later fudge.

### Liquidity

High-volume rifles have tight spreads. Souvenirs, rare patterns and brand-new collections can have a last sale and no buyer. Inventory value that lives in one illiquid knife is a hope, not a stack.

### Patches, stickers and events

Operation leftovers, capsule hype and pro-sticker stacks move some lines and leave others flat. Do not revalue the whole inventory because one capsule spiked.

### Currency and region

Steam lists in the buyer’s wallet currency. A dollar screenshot from another region can include VAT or a different reference FX. Stay consistent: pick one currency for every row.

Operations and new collections reprint attention. A week of hype can lift one rifle and leave your knife flat. Reprice the lines that moved. Do not apply a “market is up 10%” fudge to the whole backpack.

This cluster lives under [CS:GO heritage](/guides/topics/csgo-heritage) because the pricing habits are leftover from 2013 skins, not from a crypto cashier.`,
    },
    {
      id: "gambling-chips",
      title: "Why a priced inventory is a poor gambling chip",
      body: `Skin sites used to treat inventory value as a deposit. You sent items to a bot, they printed site coins, you played, you hoped a bot still held something you wanted.

That path has costs this adder will not show:

- **Valuation spread.** Deposit prices are often below the market you just added, and withdraw skins are often above it.
- **Holds and bans.** A trade hold can park the item for days. A trade ban can park it for good. Those are Steam rules, not a casino feature.
- **Bot risk.** You are sending items to someone else’s account. If the site dies, the “value” is gone.
- **Valve rules.** Using Steam to gamble has been against the Subscriber Agreement for years.

A dollar stablecoin does not fix the urge to chase. It does remove the fake precision of a marked-up skin ticker. If you play on PVPspinArena, the number on [Jackpot](/) or a Coinflip room is the number you staked, in USD.

If adding your inventory is a step toward depositing it on a random skin lobby, stop and read the comparison on [skin gambling vs crypto](/guides/skin-gambling-vs-crypto) first. This site is 18+.`,
    },
    {
      id: "honest-total",
      title: "How to keep the total honest",
      body: `Use the adder as a worksheet, not a brag.

- Price the items you would actually sell, not a fantasy knife you do not own.
- Use the same source and the same day for every unit price.
- Turn the 15% fee on when you are asking “what would Steam wallet look like?”
- Turn it off when you are only ranking a loadout against yesterday’s loadout.
- Write a cash quote on a separate line if someone offered fiat. Do not mix it into the Steam column.
- Recheck thin items before you make a decision. A week-old knife ask is not a bid.

If the honest after-fee number is small, that is the answer. Padding the total with deposit bonuses from a case site does not make the inventory larger.

### A second honesty pass

Write two totals on paper: **keep** (items you would not sell) and **sellable** (items you would list this month). Only the sellable column is inventory value in any useful sense. A souvenir you will never list is a decoration. Counting it at a 2018 peak is how “worth $3k” posts get written.

PVPspinArena will not import this worksheet. It does not list skins, open cases or sit on Kick or Twitch as a house casino. It runs player-versus-player Jackpot, Coinflip and Roulette with USDC or ETH on Base. Price the loadout here; play, if you play, with a balance you can count in dollars.`,
    },
  ],
  faqs: [
    {
      q: "How do I check my CS2 inventory value?",
      a: "List each item with a current unit price, multiply by quantity, and add the lines. The calculator on this page does that sum and can subtract the usual 15% Steam Market fee. It does not log into Steam for you.",
    },
    {
      q: "Is CSGO inventory value different from CS2?",
      a: "No separate page is needed. CS2 uses the same items CS:GO used. Price the wear and name you actually hold. The fee and the wallet rule are the same.",
    },
    {
      q: "Why is my Steam inventory worth less after I sell?",
      a: "A Community Market sale typically pays about 85% of the listed price into Steam wallet, and that wallet is not withdrawable cash.",
    },
    {
      q: "Can I turn CS2 inventory value into cash?",
      a: "Not through Steam. Wallet funds stay on Steam. Cash requires a third-party buyer, with their price, holds and risk, or selling the items some other legal way in your country.",
    },
    {
      q: "Does PVPspinArena price or take CS2 skins?",
      a: "No. This adder is a worksheet. The site is crypto PvP with USDC or ETH on Base, not a Steam market or case site.",
    },
    {
      q: "Should I include knives at the highest listing I see?",
      a: "No. Use a price that has recently filled or a tight cluster of asks. One lonely high listing will inflate the whole loadout.",
    },
  ],
  sources: [
    {
      label: "Steam Support: Community Market FAQ",
      url: "https://help.steampowered.com/en/faqs/view/61F0-72B7-9A18-C70B",
    },
    {
      label: "Steam Subscriber Agreement",
      url: "https://store.steampowered.com/subscriber_agreement/",
    },
    { label: "Counter-Strike 2 official site", url: "https://www.counter-strike.net/" },
  ],
  related: [
    "pvp-gambling",
    "cs2-skin-prices",
    "most-expensive-cs2-skins",
    "cs2-knife-prices",
    "cs2-doppler-phases",
  ],
  updated: "2026-09-26",
  howTo: true,
  widget: "cs2-inventory",
};
