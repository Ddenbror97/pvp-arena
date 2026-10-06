import type { Guide } from "./types";

export const guide: Guide = {
  slug: "steam-market-fees",
  cluster: "CS:GO heritage",
  keyword: "steam market fees",
  secondary: [
    "steam community market fee",
    "steam 15 percent",
    "steam sale fee",
    "steam listing fee",
  ],
  title: "Steam Market Fees: The 15 Percent Cut Explained",
  description:
    "Steam market fees: the 15 percent cut, how it hits trade-ups and cash-outs, and why skin gambling stacks fees you do not see on USDC.",
  h1: "Steam market fees: the 15 percent cut and what it costs you",
  answer:
    "Steam market fees on CS2, TF2 and other Valve items are typically a 5 percent Steam transaction fee plus a 10 percent game-specific fee — about 15 percent on top of what the seller receives. If you want $100 in your Steam Wallet, the buyer pays about $115. If the buyer pays $100, you receive about $87. That cut hits every Community Market cash-out and every trade-up you later sell. Skin gambling stacks more spreads on top. A USDC transfer does not.",
  facts: [
    "Steam's Community Market FAQ describes a Steam transaction fee that scales to 5 percent, with a higher percentage on tiny sales because of minimums.",
    "CS2 and other Valve games add a game-specific fee commonly 10 percent, which is why people say a 15 percent Steam cut.",
    "The listing UI has two numbers: what you receive and what the buyer pays. They differ by the fee stack.",
    "Fees are collected in Steam Wallet funds, not as a separate invoice you can skip.",
    "USDC on Base has network gas, not a 15 percent marketplace haircut, which is why it is a cleaner gambling chip.",
  ],
  sections: [
    {
      id: "the-cut",
      title: "What the 15 percent actually is",
      body: `Steam Community Market is not a free noticeboard. Valve takes a **Steam transaction fee** and, on many titles, a **game-specific fee** that goes to the publisher — which for CS2 and TF2 is also Valve.

On a typical CS2 listing the stack is 5% + 10% = 15% of the seller proceed, shown as a higher buyer price. Tiny listings pay a larger percentage because each fee has a minimum (a cent-scale floor), so a $0.03 sticker is not a clean 15%.

This is the steam community market fee people mean when they say "steam 15 percent." It is not a listing fee you pay up front to put the item on the board. You list for free. The cut happens when it sells.

Official wording lives in Steam's [Community Market FAQ](https://help.steampowered.com/en/faqs/view/61F0-72B7-9A18-C70B). Rounding can make a $100 buyer price net something like $86.96 rather than a textbook $86.96–$87.00. Use the UI, not a napkin, when the cents matter.

This guide sits in [CS:GO heritage](/guides/topics/csgo-heritage) because that 15 percent is why skin-as-chip math always leaked.`,
    },
    {
      id: "how-to-read",
      title: "How to read the two boxes when you list",
      body: `The listing form has two linked fields.

1. **You receive** — what hits the Steam Wallet if it sells.
2. **Buyer pays** — what the buyer is charged, including Steam's cut.

They are the same sale. If you type $100 in "you receive" on a CS2 item, buyer pays about $115. If you type $100 in "buyer pays," you receive about $87.

### Steps

1. Open the item in Community Market and click Sell.
2. Decide which number is your budget: cash you want, or a price you think will fill.
3. Enter that number in the matching box. Watch the other box update.
4. Check the fee line. You should see a Steam fee and a game fee.
5. Confirm only if the you-receive figure is still worth the wait.

There is no steam listing fee beyond that. Cancelling a listing does not charge 15 percent. The cut is on a fill.

Region, Wallet currency and conversion can add more slippage when the buyer is not in your currency. That is separate from the 15 percent.`,
    },
    {
      id: "worked-example",
      title: "Worked example: $100 you-receive versus $100 buyer-pays",
      body: `Assume a clean 15 percent stack and ignore rounding so the structure is visible.

| You type | Buyer pays | You receive | Cut |
| --- | --- | --- | --- |
| $100 you receive | $115.00 | $100.00 | $15.00 |
| $100 buyer pays | $100.00 | $86.96 | $13.04 |

The second row is $100 / 1.15. People who say "I sold a $100 skin" sometimes mean the ask the buyer saw. They did not get $100.

### Trade-up then sell

You spend $80 of skins on a [CS2 trade-up calculator](/guides/cs2-trade-up-calculator) path. The output lists. If you need Steam Wallet cash, you sell and lose ~15% again. The contract did not pay dollars. It paid an item that still has to cross the market.

Case openings have the same last mile: [CS:GO case opening](/guides/csgo-case-opening) is a lottery; Community Market is the cashier.

### Third-party markets

External CS2 books often charge less than 15 percent and pay out crypto or fiat. You trade Valve's cut for that site's solvency, KYC and withdrawal rules. Price the whole path. A 2% site fee plus a 3% off-ramp can still beat Steam on a $1,000 knife — and can still be worse if the site stalls.`,
    },
    {
      id: "skin-gambling",
      title: "How skin gambling stacks fees you do not see on USDC",
      body: `[Skin gambling vs crypto](/guides/skin-gambling-vs-crypto) is the long version. The short version is a pile of haircuts:

1. **You bought the skin** — Steam or a third party already took a cut.
2. **You deposit to a bot** — they credit below mid.
3. **You play** — rake or a house game.
4. **You withdraw an item** — they debit at their ask.
5. **You sell** — Steam 15 percent or another book.

USDC on Base is a transfer. You pay [gas](/guides/gas-fees-explained) in ETH, usually cents. The casino may take a game fee. There is no 15 percent marketplace tax to "cash out" a dollar that is already a dollar.

On PVPspinArena you deposit USDC or ETH on Base from the [wallet](/wallet). Balances are USD. Withdrawals are USDC or ETH on Base, with a $250 daily limit and review above $25. No trade bot, no Community Market, no 10 percent game fee on the way out.

That is the contrast. Crypto play still loses to edges and to your own volume. It does not silently levy Steam's sale fee on every exit.`,
    },
    {
      id: "prices",
      title: "What the fee does to quoted CS2 prices",
      body: `Public "price" websites mix Steam last-sale, Steam ask and third-party bid. A $50 Steam sale might be a $50 buyer-pays print. The seller saw ~$43.50. If a skin site uses Steam last-sale to value your deposit, you need to know which side of the 15 percent they mean.

[CS2 skin prices](/guides/cs2-skin-prices) and knife quotes have the same problem at larger numbers. A $2,000 listing that "sold" on Steam moved ~$1,739 to the seller if $2,000 was the buyer price.

When you compare two books, convert both to **you receive in the asset you actually want** — Wallet funds, bank, or USDC — after every fee. The pretty mid-market line is not that number.

Steam Wallet funds also spend like Steam Wallet funds. You cannot pay rent with them without another conversion. That conversion is why people leave Steam for third-party cash-out, and why those sites exist.

Buyers pay the stacked price, so a $50 "cheap" AK on Steam is $50 out of their Wallet. The seller sees ~$43.50. Price sites that chart Steam last-sale are charting the buyer side unless they say otherwise. If you mentally mark your inventory at those prints, you are marking an asset you do not have yet, at a number you will not receive.`,
    },
    {
      id: "rounding-wallet",
      title: "Rounding, minimums and Wallet lock-in",
      body: `On a $100 you-receive CS2 sale the 15 percent story is clean. On a $0.12 sticker it is not. Steam applies each fee with a minimum, then rounds. A sale that should be a few pennies of fee can lose a third of the price. That is why dumping a pile of cheap drops "to clean the inventory" can be a worse cashier than throwing them into a trade-up you actually priced.

### A practical rounding check

1. List one cheap item and read both fee lines.
2. List one expensive item and read both fee lines.
3. Notice the effective percent. It falls toward 15% as the price rises, and blows up as the price falls.

Do this once so you stop using 15% as a law of physics on $0.04 nametags.

### Wallet lock-in

Proceeds land in Steam Wallet. They buy games, items and market listings. They do not become a bank transfer inside Steam. To get dollars you use a third-party buyer, a gift-card grey market (often against Steam rules), or you simply spend the Wallet. Each extra hop is another spread. That is a structural reason USDC is a better chip: the token is already the dollar-like thing you budget in.

If your plan is "list on Steam, then gamble the Wallet on a skin site," you will pay 15 percent to create Wallet funds, then a bot spread to create site coins. Two cashiers before the first pot. Sell once to a cash book, or do not convert at all and keep the item.

This is not tax advice. Wallet movements and third-party cash-outs can still be taxable events where you live.`,
    },
    {
      id: "checklist",
      title: "Fee checklist before you list or deposit",
      body: `1. **Name the you-receive figure** in Wallet currency.
2. **Look at both fee lines** — Steam and game-specific.
3. **On cheap items, expect worse than 15%** because of minimums.
4. **If the next step is a gambling bot, add their spread** to the Steam cut you already paid or will pay.
5. **If the next step is PVPspinArena, sell first**, then send USDC on Base. Do not try to deposit a skin.
6. **Stay 18+** if the plan is gambling. A market sale is not a bet; the site after it might be.

If you are pricing a whole inventory, apply you-receive to each line, then sum. Do not sum buyer-pays prints and call it a bankroll. That single habit is how people think they have $800 and discover they have $700 of Wallet after a week of fills.

Valve's [Subscriber Agreement](https://store.steampowered.com/subscriber_agreement/) is the Steam-side rulebook. Using Steam for gambling is restricted. This is not legal advice.`,
    },
    {
      id: "summary",
      title: "Fifteen percent is a cashier, not a game",
      body: `Steam market fees on Valve items are usually 5% + 10%. The two listing boxes exist because of that stack. Trade-ups and case items still have to sell. Skin gambling adds more spreads. USDC does not take a 15 percent Community Market cut.

PVPspinArena will not list a skin for you. Convert on a market you accept, then play Jackpot, Coinflip or Roulette in dollars if you still want a session. Keep Steam for games, not for a hidden rake.

Fifteen percent is not a conspiracy. It is a published cashier. Once you see both boxes, you can stop treating a Steam print as cash. That is the whole skill. After that, the only decision left is whether a session is still worth a fixed dollar amount.`,
    },
  ],
  faqs: [
    {
      q: "How much is the Steam Community Market fee?",
      a: "On CS2 and many Valve items, about 15 percent: a 5 percent Steam fee plus a 10 percent game fee, with minimums that hurt tiny sales more.",
    },
    {
      q: "Who pays the Steam sale fee — buyer or seller?",
      a: "The buyer is charged more than the seller receives. Economically the cut comes out of the sale. The UI lets you lock either side of the equation.",
    },
    {
      q: "Is there a separate Steam listing fee?",
      a: "No. Listing is free. The cut is taken when the item sells. Cancelling a listing does not charge the 15 percent.",
    },
    {
      q: "How do Steam fees hit a trade-up?",
      a: "The contract outputs an item. If you sell that item on Community Market, the 15 percent applies to that sale. The trade-up itself is not a cash payout.",
    },
    {
      q: "Does PVPspinArena charge Steam market fees?",
      a: "No. It does not use Steam. Deposits and withdrawals are USDC or ETH on Base. You still pay Base gas and any game fee.",
    },
    {
      q: "Why do my numbers not equal exactly 15 percent?",
      a: "Steam rounds each fee and applies minimums. On cheap items the effective rate is higher. Use the listing preview.",
    },
  ],
  sources: [
    {
      label: "Steam Support — Community Market FAQ",
      url: "https://help.steampowered.com/en/faqs/view/61F0-72B7-9A18-C70B",
    },
    {
      label: "Steam Subscriber Agreement",
      url: "https://store.steampowered.com/subscriber_agreement/",
    },
    { label: "Steam Community Market", url: "https://steamcommunity.com/market/" },
    { label: "Circle — USDC", url: "https://www.circle.com/en/usdc" },
  ],
  related: [
    "pvp-gambling",
    "steam-trade-hold",
    "steam-trade-ban",
    "cs2-armory-pass",
    "cs2-operation",
  ],
  updated: "2026-09-26",
  howTo: true,
};
