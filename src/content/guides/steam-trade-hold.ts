import type { Guide } from "./types";

export const guide: Guide = {
  slug: "steam-trade-hold",
  cluster: "CS:GO heritage",
  keyword: "steam trade hold",
  secondary: [
    "steam trade hold 7 days",
    "steam pending trade",
    "why steam trade hold",
    "steam guard trade hold",
  ],
  title: "Steam Trade Hold: Why Items Sit for a Week",
  description:
    "What a Steam trade hold is, why items wait up to 7 days, how it interacts with market listings, and why it is a poor chip for gambling.",
  h1: "Steam trade hold: why items sit and what you can do",
  answer:
    "A Steam trade hold is Valve’s delay on items after a trade or, in related cases, a market listing, while Steam Guard and account checks finish. People search “steam trade hold 7 days” because the Mobile Authenticator must usually be on for seven full days before new trades skip the hold. Until then, Steam can park items for up to 15 days. The hold is anti-theft, not a shipping queue you can rush.",
  facts: [
    "Steam’s help pages: trades started without a Mobile Authenticator that has been on for seven days can be held up to 15 days.",
    "Adding an authenticator does not shorten a hold that already started.",
    "Market listings have their own hold rules; a market hold is not the same timer as a trade hold.",
    "Steam wallet funds from a sale are not withdrawable cash, even after a listing clears.",
    "A held item is a terrible gambling chip: you cannot move it while Steam has it.",
  ],
  sections: [
    {
      id: "what",
      title: "What a Steam trade hold is",
      body: `A **Steam trade hold** means the items in a completed offer are not yours to use, sell or send on yet. Steam shows them as pending or held. You can usually see the countdown. You cannot cancel the clock by asking support to “just release it.”

Holds exist so that if someone else added an authenticator or emptied an account, the real owner has days to notice and recover the account before the items vanish into the market.

### What it looks like

- A sent trade that says items will be held for N days.
- A received item that sits in inventory but is locked for trade and often for market.
- A **steam pending trade** that is already accepted and still not liquid.

You can usually still *see* the item. Seeing it is not using it. In-game equip rules vary by title; trading and listing are what the hold is about.

This is not a PVPspinArena delay. The site does not touch Steam trades. It is crypto PvP with USDC or ETH on Base. Adults 18+ only.`,
    },
    {
      id: "seven-days",
      title: "Why people say seven days — and why it can be fifteen",
      body: `Two different clocks get flattened into “a week.”

### The seven-day authenticator clock

Steam’s documented rule is that a **Steam Guard Mobile Authenticator** must protect the account for **at least seven days** before new trades skip the hold. Those are seven full 24-hour periods on Valve’s clock, not “I enabled it last Saturday.” Trades you create during that first week can still take a **hold of up to 15 days**.

### The fifteen-day hold itself

If the account is not protected that way, items leaving in a trade can be held for up to 15 days so you can spot a theft. New Steam Guard on an account that had none can also restrict trading and the Community Market for 15 days.

### Worked timeline

| Day | What you did | What new trades do |
| --- | --- | --- |
| 0 | Enable Mobile Authenticator | New trades can still take up to a 15-day hold |
| 3 | Send a knife | That offer can still be held; enabling Guard does not cut an existing hold |
| 7+ | Authenticator has been on seven full days | New trades can complete after confirmation, if no other restriction applies |
| Later | Disable Guard or fail the 7-day rule again | Holds and market locks can return |

So “why steam trade hold” is usually: Guard is missing, Guard is too new, or another restriction (new payment method, password reset, limited account) is stacked on top. Read Steam’s own [Trade and Market Holds](https://help.steampowered.com/en/faqs/view/34A1-EA3F-83ED-54AB) and [Trading and Market Restrictions](https://help.steampowered.com/en/faqs/view/451E-96B3-D194-50FC) pages rather than a Discord screenshot.

Steam has also documented shorter holds on some long-time friend trades in older help text. Do not plan a bot deposit around a “1-day friend” exception. If the UI says 15 days, it is 15 days. Community posts that say every hold is seven days are flattening the authenticator clock with the item clock.

A **steam guard trade hold** is that first-week and no-app case, not a random Valve tax on every friend trade forever.`,
    },
    {
      id: "market",
      title: "How a hold interacts with market listings",
      body: `The Community Market is a second queue.

### Held items often cannot list

If Steam is still holding an item, you generally cannot put it on the market until the hold ends. Buyers will not see it. Your “inventory value” during a hold is a screenshot, not a live ask.

### Listings have their own holds

Steam can hold **market listings** when Guard is new or when other restrictions apply. A listing hold is not the same object as a trade hold, but it feels the same: the item is stuck and the wallet credit has not arrived.

### After a sale

When a listing does fill, you receive Steam wallet funds minus the usual ~15% Steam plus publisher fee. That wallet still cannot be pulled to a bank. [Steam market fees](/guides/steam-market-fees) cover the cut. [CS2 inventory value](/guides/cs2-inventory-value) is the worksheet for adding prices — it will not shorten a hold.

### Worked money example

You accept a trade for a $40 rifle on day 0 of a 15-day hold. For two weeks you cannot list it. On day 16 you list at $40. If it sells, you receive about $34 in wallet. The hold did not cost 15%; the sale did. The hold cost **time and optionality**.

If during those 15 days the rifle’s book falls to $28, you did not “lose the hold fee.” You lost a moveable listing. That is why traders enable Guard a week before they need to move anything large.`,
    },
    {
      id: "what-you-can-do",
      title: "What you can actually do while items sit",
      body: `You cannot bribe the timer. You can stop making it worse.

### Do

- Enable the official Steam Mobile Authenticator on **your** phone, from Steam’s instructions, and leave it on.
- Wait the full seven days before you need hold-free trades.
- Confirm you recognise every device and every new Guard add. If you did not add it, recover the account first.
- Use Steam’s trade confirmations. Do not approve a hold you do not recognise.
- Keep a record of the offer ID and the countdown.

### Do not

- Do not “verify” your account through a site that asks for a Guard code or a remote desktop.
- Do not disable and re-enable the authenticator to “reset” a hold. That can start another restriction.
- Do not expect Support to delete a documented hold because you have a match tonight.

If the account is trade-banned rather than held, that is a different lock. See [Steam trade ban](/guides/steam-trade-ban). A hold ends; a ban may not.

Password resets, new payment methods and a newly enabled Guard on an account that had none can stack a market lock on top of a trade hold. Fix the restriction list on Steam Support before you send a second offer “to test.” Each test can be another held item.`,
    },
    {
      id: "gambling",
      title: "Why a held item is a poor gambling chip",
      body: `Skin casinos need items to move to bots. A hold means the bot — or you — cannot complete the loop on the schedule the lobby implied.

### Practical failures

- **Deposit pending.** You sent a skin. The site may not credit you until Steam releases it, or it may credit you and still sit on risk if the hold reverses in a dispute story. Either way you are waiting on Valve, not on a pot.
- **Withdraw pending.** A “win” you cannot trade for a week is not cash and not a usable rifle.
- **Price drift.** A 15-day hold on a hyped sticker or a new collection can outlast the spike you thought you locked in.
- **Agreement risk.** Using Steam to gamble is against the [Steam Subscriber Agreement](https://store.steampowered.com/subscriber_agreement/). Holds are not the only way that path goes wrong.

If the plan was “use inventory as chips,” read [skin gambling vs crypto](/guides/skin-gambling-vs-crypto). A dollar on Base does not get a seven-day Steam hold. It can still be money you should not lose.

PVPspinArena does not take skins and is not a case site. Jackpot and Coinflip on the [home pot](/) use a USD balance. That is the honest contrast, not a claim that crypto is “safe.”`,
    },
    {
      id: "vs-crypto",
      title: "Holds versus a balance you can send",
      body: `Steam’s hold is an account-security product. It assumes items are unique, reversible for a few days, and stuck inside Valve’s inventory server.

USDC on Base is a token. Once a transfer confirms, the recipient has it. There is no seven-day Valve clock. There is also no “Support, please undo that send.” Wrong address is gone.

### When each friction matters

- **Hold friction** is why skins are a messy chip: delayed, fee-cut, wallet-locked.
- **Chain friction** is gas, the right network, and not leaking a seed. Our payments cluster covers that; this page stays on Steam.

If you play here, set size first on a [gambling budget](/guides/gambling-budget) and keep the session in the [wallet](/wallet) you control. Do not deposit a held AWP into a bot and call it liquidity.

A token send can fail for a different reason — wrong network, no gas, a typo address. That is minutes of damage or permanent loss, not a published seven-day clock. Read the destination twice. The hold article is not a payments guide.

This article sits in [CS:GO heritage](/guides/topics/csgo-heritage) because the hold is leftover skin-economy plumbing, not a casino feature. Enable Guard a week before you need to move a knife, not the night you promised a buyer.`,
    },
    {
      id: "checklist",
      title: "A short hold checklist",
      body: `1. Is this a trade hold, a market listing hold, or a trade ban? Read the exact Steam wording.
2. Has Mobile Authenticator been on for seven full days?
3. Did you create the offer during those first seven days? Then a 15-day hold can still apply.
4. Did you just reset a password, add a payment method, or turn Guard off? Check restrictions before you blame the last trade partner.
5. Are you trying to move the item into a gambling bot? Stop. The hold is telling you the item is not a chip.

Steam publishes the rules. Community posts that say “it’s always seven days” are flattening two clocks. Believe the help article over a meme.

If you play elsewhere with a token, there is still a delay: chain confirmation. It is minutes, not a Valve week, and it is not reversible. Different product, different failure mode. Do not treat “no Steam hold” as “no risk.”`,
    },
  ],
  faqs: [
    {
      q: "How long is a Steam trade hold?",
      a: "If Mobile Authenticator has not been protecting the account for seven full days, Steam can hold traded items for up to 15 days. After that seven-day Guard period, new trades can complete without that hold if no other restriction applies.",
    },
    {
      q: "Why do I still have a hold after enabling Steam Guard?",
      a: "Enabling the app does not cut a hold that already started, and trades created in the first seven days can still be held. The seven days are full 24-hour periods.",
    },
    {
      q: "Can Steam Support remove a trade hold?",
      a: "Documented security holds are automated. Support generally will not shorten them because you are in a hurry. If the account was stolen, recover it first through official Steam Support only.",
    },
    {
      q: "Does a trade hold affect Community Market listings?",
      a: "A held item usually cannot be listed until the hold ends. Listings can also have separate market holds. Wallet proceeds still cannot be withdrawn as cash.",
    },
    {
      q: "Is a trade hold the same as a trade ban?",
      a: "No. A hold is a timed lock on specific items or listings. A trade ban blocks trading more broadly and may last much longer. See the Steam trade ban guide.",
    },
    {
      q: "Does PVPspinArena cause Steam trade holds?",
      a: "No. This site does not use Steam trade bots. Holds are Steam account rules. Games here use USDC or ETH on Base.",
    },
  ],
  sources: [
    {
      label: "Steam Support: Steam Trade and Market Holds",
      url: "https://help.steampowered.com/en/faqs/view/34A1-EA3F-83ED-54AB",
    },
    {
      label: "Steam Support: Trading and Market Restrictions",
      url: "https://help.steampowered.com/en/faqs/view/451E-96B3-D194-50FC",
    },
    {
      label: "Steam Subscriber Agreement",
      url: "https://store.steampowered.com/subscriber_agreement/",
    },
  ],
  related: [
    "pvp-gambling",
    "steam-trade-ban",
    "cs2-armory-pass",
    "cs2-operation",
    "steam-market-fees",
  ],
  updated: "2026-09-26",
};
