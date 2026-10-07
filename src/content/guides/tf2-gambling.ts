import type { Guide } from "./types";

export const guide: Guide = {
  slug: "tf2-gambling",
  cluster: "CS:GO heritage",
  keyword: "tf2 gambling",
  secondary: ["tf2 betting", "tf2 jackpot", "mann co key gambling", "tf2 item betting"],
  title: "TF2 Gambling Guide: Keys, Items and Site Risk",
  description:
    "TF2 gambling explained: keys, hats, third-party sites, Steam ToS risk, and why cash-settled crypto PvP is a clearer alternative.",
  h1: "TF2 gambling: keys, hats, site risk and a cash alternative",
  answer:
    "TF2 gambling means staking Team Fortress 2 items — usually Mann Co. Supply Crate Keys, hats or Unusuals — on third-party jackpot, coinflip or betting sites. The items are cosmetics. The sites are not Steam. Valve's Subscriber Agreement does not allow using Steam for gambling, and a trade bot can still empty an inventory. Cash-settled crypto PvP is clearer because the chip is a dollar amount, not a key the site revalued.",
  facts: [
    "Mann Co. Supply Crate Keys are the usual unit of account in TF2 trading and in many TF2 gambling queues.",
    "Hats and Unusual effects can be worth many keys; their prices move with fashion, not with a pot share.",
    "Steam's Subscriber Agreement restricts using Steam for gambling; third-party TF2 sites sit outside Valve's product.",
    "Skin-era jackpot and coinflip formats were reused for TF2 keys the same way they were for CS skins.",
    "PVPspinArena does not take TF2 items. It is USDC and ETH on Base, Jackpot, Coinflip and Roulette.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What TF2 gambling looks like",
      body: `Team Fortress 2 has had a real-money item economy for a long time. Keys open crates. Hats are the joke that became a market. Unusual hats with particle effects are the rare end. Because those items trade, people treated them as chips.

TF2 gambling sites copied the CS:GO loop: log in with Steam, trade items to a bot, receive site credit, play jackpot or coinflip, withdraw a different pile of items. "TF2 betting" sometimes also meant staking keys on match outcomes. The mechanics are the same family as [skin gambling vs crypto](/guides/skin-gambling-vs-crypto).

This sits in [CS:GO heritage](/guides/topics/csgo-heritage) because the formats — tf2 jackpot, coinflip, coloured wheels — came from that era, even when the backpack was hats instead of AKs. Buying, pricing, and trade scams are on [TF2 trading](/guides/tf2-trading). This page stays with betting.

PVPspinArena is not a TF2 site and not a skin site. It will not ask for a Steam trade. You must be 18 or older to gamble anywhere that is actually gambling, including a key pot.`,
    },
    {
      id: "keys-hats",
      title: "Keys, hats and why the chip keeps moving",
      body: `The Mann Co. Store sells keys at a published real-money price. The Steam Community Market and third-party TF2 sites print a different price. Traders use "keys" as a unit the way CS players use "a red." That unit is stabler than a hyped CS finish, and it is still not a dollar.

Hats and Unusuals are worse units. An effect can go cold. A bot can value your Unusual at 40 keys on the way in and offer a 36-key Unusual on the way out. That spread is a fee with a festive wrapping.

Craft hats, paints, name tags and kits add more SKUs. A site that "accepts all items" is running an appraisal desk. You are not looking at a ledger. You are looking at their price list.

[Steam market fees](/guides/steam-market-fees) still apply if you cash out through Community Market: the usual Steam 5 percent plus a game fee on Valve titles, about 15 percent stacked. Selling a key to fund a cash site is often cleaner than depositing the key in a bot and hoping the credit matches backpack.tf.

Unusual hats add a particle effect and a much thinner book. Two Burning Flames of the same hat can still differ by paint, professional killstreak kits and whether the seller wants keys or dollars. A site that auto-prices Unusuals from a spreadsheet is guessing. If the guess is low on the way in and high on the way out, that is the business.`,
    },
    {
      id: "phishing",
      title: "Phishing that looks like a friendly bot",
      body: `The highest-EV play against a TF2 gambler is not a rigged coinflip. It is a login page that looks like Steam.

Typical sequence: a Google ad or a Discord "jackpot just paid 200 keys" screenshot, a domain with an extra dash, a Steam OpenID clone, and a trade offer from a bot named something like "TF2Jackpot #14." You confirm because the site said you would. The offer is their items out of *your* backpack, not a deposit. Steam Guard was the only lock, and you turned the key.

### Habits that cut this off

- Type the Steam community URL yourself when you need to accept a trade. Do not follow a "confirm deposit" button from a new domain.
- Check the bot's Steam profile age, inventory and trade URL against the site's published list. A one-day-old "official bot" is not official.
- Keep Steam Guard on a device you hold. SMS-only Guard is weaker.
- After any scare, revoke API keys at Steam and change the password.

None of that makes a real jackpot site a good idea. It only stops the theft that happens before the first pot.

TF2's cartoon tone is why parents miss this. Keys are sold next to hats in a game rated for teens. A gambling site that only asks for a Steam login is not checking age. If you are not 18, do not trade items into a pot. If you are a parent, the [responsible gambling](/responsible-gambling) tools include device-level blocks.`,
    },
    {
      id: "worked-example",
      title: "Worked example: ten keys into a jackpot",
      body: `You have 10 Mann Co. keys. A third-party site values keys at $1.80 on deposit and $2.00 on withdraw. The Mann Co. price and the Steam ask are somewhere around the mid $2s; the exact print moves.

### On the TF2 jackpot site

Deposit 10 keys → $18.00 credit. You join a pot. Your share is $18 of a $90 pot (20%). You win. You try to withdraw $90 of items. The bot's inventory is 40 keys at $2.00 each and a hat they call $10. You leave with 40 keys on their book — except they only send 38 because of a "minimum withdraw" and a 5% rake you missed in the FAQ. You now have 38 keys and a Steam trade hold.

If you then sell those keys on Steam to get wallet funds, you take the 15 percent stack again.

### Cash alternative

Sell 10 keys on a market you accept, take about $20 each minus fees — use your real bid, not this illustration — and deposit USDC on Base. Stake $50 on [Coinflip](/coinflip) or a Jackpot share. The pot is dollars. The withdraw is dollars. No bot needs your backpack.

| Step | Item pot | Cash PvP |
| --- | --- | --- |
| In | Their key price | $1.00 per USDC |
| Game | Share of a valued pot | Share of a USD pot |
| Out | Their item ask | USDC or ETH on Base |
| Extra | Trade holds, ToS, phishing | Network and site risk |

The illustration numbers will be wrong next month. The structure will not.`,
    },
    {
      id: "tos-risk",
      title: "Steam ToS, bots and site risk",
      body: `Valve's Subscriber Agreement is the document that matters on the Steam side. It restricts using Steam for gambling and other unauthorised commercial uses. In 2016 Valve sent cease-and-desist letters to many skin-gambling operators. TF2 sites were part of the same economy even when CS:GO got the headlines.

Practical meaning for you:

- **Account risk.** A trade API key or a "sign in with Steam" phishing page can empty the backpack. That loss is not a bad beat. It is theft.
- **Hold risk.** Steam trade holds delay the withdraw. A site can die during a hold.
- **Valuation risk.** Credit is their number.
- **Licence risk.** Many TF2 gambling domains have no licence you can enforce. See [fake casino sites](/guides/fake-casino-sites).
- **Underage risk.** TF2 is played by minors. A gambling site that only checks a Steam login is not doing age assurance.

Rust item pots have the same shape; [Rust gambling](/guides/rust-gambling) is the sibling explainer.

This is not legal advice. Whether a given site is lawful where you live is a local question. "It's only keys" has not impressed regulators who treat convertible items as stakes.`,
    },
    {
      id: "cash-alternative",
      title: "Why cash-settled crypto PvP is clearer",
      body: `Clearer does not mean "you will win." It means the unit, the share and the withdraw are the same kind of number.

On PVPspinArena the chip is USDC or ETH on Base, shown in USD. Jackpot chance equals your share. Coinflip is 50/50 on equal stakes. Roulette is a published 33-slot wheel. You can verify a round on the [fairness](/fairness) page. The house fee on PvP games defaults to 0%.

You do not hand anyone a Steam session. You do not care if Unusual prices crater during the round. You do care about seed phrases, wrong-network sends and your own budget — ordinary crypto risks, not backpack risks.

If you like TF2, play TF2. If you want a pot, sell the keys and stake cash. Mixing them is how people lose both the Unusual and the evening.

Keys also hide spend. Ten keys does not feel like a $25 decision even when that is the Mann Co. tag. Write the fiat number on a note before the trade. If you cannot name it, you are not budgeting. You are crafting.`,
    },
    {
      id: "safer",
      title: "If you still use a TF2 item site",
      body: `I will not recommend a domain. I will tell you what "less sloppy" looks like.

1. **Use a dedicated Steam account** with only the items you intend to trade. Do not store Unusuals you cannot replace on the same account you point at random bots.
2. **Revoke unused API tokens** and check login history.
3. **Read the valuation page** before the first trade. If deposit and withdraw prices differ, that is the fee.
4. **Screenshot the trade** and the site credit.
5. **Never type a password or Steam Guard** into a page you found in a Discord ad.
6. **Stop if you are not 18.** There is no "it's just hats" exception.

If the site is a Telegram bot or a cloned lobby, walk away. If play is no longer optional, use [responsible gambling](/responsible-gambling).`,
    },
    {
      id: "summary",
      title: "Keys are items. Pots should be cash",
      body: `TF2 gambling is skin gambling with a different backpack: keys as chips, hats as jackpot filler, bots as cashiers, and Steam's rules hanging over the trade. Site risk and ToS risk sit on top of ordinary minus-EV games.

PVPspinArena will not take a Mann Co. key. Convert to USDC or ETH on Base if you want Jackpot, Coinflip or Roulette here. Keep the Unusual on the account you actually play TF2 with.

A cash pot will not make you a better Pyro. It will not make the Unusual rarer. It only stops the site from being an extra appraiser between you and a number you can write down. If that is not worth a sell, keep the hat and skip the queue. Write the dollar number once. Then decide.`,
    },
  ],
  faqs: [
    {
      q: "What do people use as chips in TF2 gambling?",
      a: "Usually Mann Co. Supply Crate Keys, plus hats and Unusuals that sites convert into key-denominated credit.",
    },
    {
      q: "Is TF2 gambling allowed on Steam?",
      a: "Valve's Subscriber Agreement restricts using Steam for gambling. Third-party sites operate outside Steam and can still cost you the account if you trade carelessly.",
    },
    {
      q: "Why is a key a bad chip compared with USDC?",
      a: "Deposit and withdraw prices differ, Steam fees apply when you cash out, and the key price can move. USDC is designed to stay near one dollar.",
    },
    {
      q: "Does PVPspinArena accept TF2 items?",
      a: "No. It accepts on-chain Bitcoin, and USDC and ETH on Base. It does not use Steam trade bots.",
    },
    {
      q: "Was TF2 part of the 2016 skin-gambling crackdown?",
      a: "The public letters targeted the skin-gambling industry around Steam. TF2 keys sat in the same trade-bot economy even when CS:GO got more coverage.",
    },
    {
      q: "What is the biggest practical risk on a TF2 jackpot site?",
      a: "Phishing and malicious trade offers that empty the backpack, plus sites that vanish while items are on hold. Those sit beside the game's own rake.",
    },
  ],
  sources: [
    { label: "Team Fortress 2 official site", url: "https://www.teamfortress.com/" },
    {
      label: "Steam Subscriber Agreement",
      url: "https://store.steampowered.com/subscriber_agreement/",
    },
    {
      label: "Steam Support — Community Market FAQ",
      url: "https://help.steampowered.com/en/faqs/view/61F0-72B7-9A18-C70B",
    },
    {
      label: "Valve — SSA and Steam use restrictions (help)",
      url: "https://help.steampowered.com/en/faqs/view/6862-8119-C23E-EA7B",
    },
  ],
  related: ["pvp-gambling", "rust-gambling", "rust-skin-prices", "csgo-coinflip", "cs2-roulette"],
  updated: "2026-09-26",
};
