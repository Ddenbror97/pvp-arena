import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cs2-armory-pass",
  cluster: "CS:GO heritage",
  keyword: "cs2 armory pass",
  secondary: ["armory pass cs2", "armory stars", "armory pass worth it", "cs2 armory pass price"],
  title: "CS2 Armory Pass: Stars, Drops and Expected Value",
  description:
    "What the CS2 Armory Pass is: stars, redeemable items, expected value versus key openings, and why it is still a paid loot product.",
  h1: "CS2 Armory Pass: stars, redeemables and expected value",
  answer:
    "The CS2 Armory Pass is a paid Steam product that lets you earn Armory stars as you play and spend those stars on redeemable items — skins, charms and other Armory stock. It is not a skill tree and it is not a savings account. Expected value is usually below what you paid, the same shape as key openings, because most redeemables are common. It is still a paid loot product.",
  facts: [
    "The Armory Pass is bought on Steam; stars are earned by playing after you own the pass.",
    "Stars are spent in the Armory on redeemable items, not on a guaranteed Master skin.",
    "Valve has published rarity ladders for cases; Armory stock still behaves like a loot table even when you pick a tile.",
    "CS2 Armory Pass price is a Steam list price and can change; always read the current store page.",
    "A casino balance is not an Armory star, and an Armory item is not cash.",
  ],
  sections: [
    {
      id: "what",
      title: "What the CS2 Armory Pass is",
      body: `Armory Pass CS2 players bought is a season-style key to a shop that uses stars instead of a checkout cart. You pay real money on Steam. You play matches. You receive Armory stars. You spend stars on tiles in the Armory: weapon finishes, charms, and other redeemables Valve put in that rotation.

This page is in the [CS:GO heritage](/guides/topics/csgo-heritage) cluster. It is written for adults aged 18 or over. PVPspinArena does not sell passes and does not redeem stars. It is crypto player-versus-player gaming — [Jackpot](/), Coinflip, Roulette — with USDC and ETH on Base.

The Armory is not the same product as a classic operation, even though both use stars. Operations mixed missions, story, and exclusive collections. The Armory is a live shop you keep feeding. For the operation model, use the [CS2 operation](/guides/cs2-operation) guide.

Is the Armory Pass worth it? Only as paid entertainment with a known cost. If the question is “will I profit on the Steam market,” the honest default is no.

Think of the pass as a season ticket to a shop, not as a coupon that raises your rank. Competitive rating, Premier, and Faceit do not care how many stars you hold. Friends who say they “need the pass to grind” are mixing a cosmetic shop with practice. You can practice without the pass. You cannot redeem without it.

Family Steam accounts make this product easy to overspend. A pass bought on a shared wallet is still a loot spend. If you share a machine with someone under 18, do not leave a card on file and a pass one click away. This site is 18+ for gambling; paid loot is the same age conversation even when Valve sells it as a cosmetic track.`,
    },
    {
      id: "stars",
      title: "How Armory stars work",
      body: `Armory stars are a balance inside CS2. They arrive as you play while a pass is active. They leave when you redeem. They are not tradable on the Community Market as stars. You cannot send a friend three stars. You cannot deposit stars into a casino.

### What you are paying for

- **The pass**: a one-time (or repeating, if you buy another) Steam charge. CS2 Armory Pass price is whatever Valve shows today. Do not trust a year-old thumbnail.
- **Time**: stars expect you to play. If you hate the game, you are buying a grind.
- **The redeem**: each spend is a pull from Armory stock. Some tiles are a known item. Some are a roll. Read the tile.

### What stars are not

Stars are not XP that makes you a better rifler. They are not a yield product. They do not grow if you leave them unspent. They do not become USDC.

If Valve changes the earn rate, your leftover math changes. If a pass expires or a rotation ends, leftover stars may not buy the tile you were waiting for. Read the current patch notes, not this paragraph, for the live expiry rule.`,
    },
    {
      id: "redeemables",
      title: "Redeemable items, including charms",
      body: `The Armory’s job is to put items in inventories without using a 2013 weapon case every time. That includes finishes you could have seen in collections, and it includes newer cosmetics such as charms. The [CS2 charms](/guides/cs2-charms) guide covers attach points. Here, charms are just another redeemable line.

A redeemable can be:

- A specific item you click because you want that item.
- A random draw from a pool, paid in stars instead of a key.

The second kind is case opening with extra steps. The first kind is still paid if the only way to stock the item was the pass. Buying the same item later on the market may be cheaper than earning the stars. Compare before you grind.

Agents and operation leftovers are not automatically in every Armory rotation. Do not assume last year’s exclusive is this week’s tile.`,
    },
    {
      id: "ev",
      title: "Expected value versus key openings",
      body: `Expected value (EV) is the average market value you get back per unit of spend. For official weapon cases, EV is usually far below key plus case. Valve’s published ladder for cases — including a 0.26% rare-special tier — is on [CS2 case odds](/guides/cs2-case-odds). The [CS:GO case opening](/guides/csgo-case-opening) guide walks the same math in prose.

The Armory needs the same honesty even when Valve did not print a matching percentage table for every tile.

### Numbered comparison (illustrative)

1. Write down what you paid for the pass in dollars.
2. Estimate how many stars you will actually earn (not the theoretical maximum if you no-life the season).
3. Divide pass price by stars. That is your dollar cost per star.
4. For each redeem, multiply cost-per-star by stars spent. That is the price of the pull.
5. Look up the after-fee sale price of the item you received (or the average of the pool if it was a roll).
6. Subtract. If you are negative, you paid for entertainment. That is the normal result.

| Product | What you pay | What you get | Typical EV shape |
| --- | --- | --- | --- |
| Weapon case + key | Case + key | One random finish, rarely a knife | Below cost; see case-odds |
| Armory star redeem | Pass + time + stars | A tile or a roll | Usually below cost if you mark items to market |
| Direct market buy | Listed price + fees | The exact item | You pay the ask; no loot table |

“Armory pass worth it” threads that skip step 3 are fan fiction. Time is a cost. If you were going to play anyway, you can count time as zero, but you still paid for the pass.

A second honesty check: mark items to what they would sell for this week, not to the Armory tile’s implied prestige. A redeemable that “looks Covert” and sells for sixty cents after fees is a sixty-cent item. The shop art is not a price.

If Valve publishes per-tile odds for a roll, use them the way you would use case odds: multiply, add, compare with cost. If they do not, you cannot claim an edge. You can only claim a preference (“I wanted that charm”). Preference is a valid reason to pay. It is not EV.`,
    },
    {
      id: "loot",
      title: "Why it is still a paid loot product",
      body: `A loot product takes money (or a token you bought with money) and returns a random or grind-gated prize with market value. The Armory Pass qualifies. So do cases, so did operation star rolls, so do sticker capsules.

Regulators have treated some paid loot boxes as gambling in some countries. Valve has changed availability by region before. This is not a law lecture. It is a reminder that “it’s just cosmetics” does not change the money-plus-randomness shape.

Age matters. Counter-Strike has a young audience. You must be 18 or over to gamble. You should not use a pass as a way to “work” toward a knife. If you want a specific item, buy the item.

Stars also hide the unit price. Spending 15 stars feels like a game currency. Converting those stars back to the pass price plus your hours is how you see the dollar. People who skip that conversion buy a second pass because “I was so close.” Close is a feeling. The second pass is a new charge.

PVPspinArena is a different product: cash stakes against other players, checkable on [fairness](/fairness). We do not sell stars and we do not simulate the Armory. A USDC deposit does not become Armory credit, and an Armory charm does not become a Coinflip stake.`,
    },
    {
      id: "cash",
      title: "Cash PvP versus spending stars like chips",
      body: `Do not deposit Armory items into a skin site and call that a cash-out plan. You will take someone else’s price list and someone else’s bot.

- **Armory hobby**: you pay Valve, you receive cosmetics, you keep or sell them on a market that charges fees.
- **Cosmetics as chips**: you hand the item to a gambling bot. The charm or skin becomes site credit. That credit is not USDC.
- **Cash PvP**: you deposit USDC or ETH on Base and play Jackpot or Coinflip. The chip is a dollar.

If you enjoy the Armory, set a pass budget and stop when the pass is used. Do not buy a second pass to chase a tile you missed. That chase is the same loop as opening another case.

If the loop is hard to stop, use the [responsible gambling](/responsible-gambling) page.`,
    },
    {
      id: "practical",
      title: "A boring pass checklist",
      body: `- Read the current Steam price and the current Armory rotation before you buy.
- Decide the one or two redeemables you actually want. If they are on the market for less than your expected grind cost, buy them on the market.
- Track stars spent and dollars spent in one note. “I only used stars” is how people hide the pass price.
- Sell extras only after fees. A $0.12 item is not a win.
- Do not share your Steam login with an “Armory EV bot.”
- Leave PVPspinArena deposits in USDC. Do not try to fund a wallet by liquidating charms at 2 a.m.
- If a friend offers to “finish your stars” on your account, that is an account-share. You can lose the inventory.

Valve can change earn rates, tiles and pass pricing. None of those changes owes you a profit.

Stars also do not roll over into a future operation the way people hope. If the Armory rotation ends and your leftover stars cannot buy the tile you wanted, that leftover is part of the cost of the pass, not a coupon Valve owes you. Read the current season rules before you “save” stars for a rumour. A rumour is not a redeemable.`,
    },
  ],
  faqs: [
    {
      q: "What is the CS2 Armory Pass?",
      a: "A paid Steam pass that lets you earn Armory stars and spend them on redeemable items in the Armory. It is a loot product, not a skill unlock.",
    },
    {
      q: "How do Armory stars work?",
      a: "You earn them by playing while you own the pass, then spend them on Armory tiles. Stars are not tradable as stars and are not a casino currency.",
    },
    {
      q: "Is the Armory Pass worth it?",
      a: "As entertainment, maybe, if you were going to play anyway and you like the tiles. As a way to make money on the market, assume no.",
    },
    {
      q: "Is the Armory the same as case opening?",
      a: "Different UI, same money-plus-prize shape when the tile is a roll. Cases have a published rarity ladder; always compare after-fee sale prices to what you paid.",
    },
    {
      q: "What is the CS2 Armory Pass price?",
      a: "Whatever Valve lists on Steam today. Ignore year-old videos. Regional pricing differs.",
    },
    {
      q: "Can I use Armory items as chips on PVPspinArena?",
      a: "No. The site is not a skin marketplace. Deposits are USDC and ETH on Base.",
    },
  ],
  sources: [
    { label: "Counter-Strike 2 official site", url: "https://www.counter-strike.net/" },
    { label: "Counter-Strike blog", url: "https://blog.counter-strike.net/" },
    {
      label: "Steam Subscriber Agreement",
      url: "https://store.steampowered.com/subscriber_agreement/",
    },
  ],
  related: [
    "pvp-gambling",
    "cs2-operation",
    "steam-market-fees",
    "steam-trade-hold",
    "steam-trade-ban",
  ],
  updated: "2026-09-26",
};
