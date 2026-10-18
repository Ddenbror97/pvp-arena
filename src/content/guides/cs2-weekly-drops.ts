import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cs2-weekly-drops",
  cluster: "CS:GO heritage",
  keyword: "cs2 weekly drops",
  secondary: ["cs2 weekly drop", "cs2 prime drop", "cs2 drop pool", "csgo weekly drop"],
  title: "CS2 Weekly Drops: Prime, XP and the Drop Pool",
  description:
    "CS2 weekly drops explained: Prime, XP, the active drop pool, what a free drop is worth, and why login “drop” sites are scams.",
  h1: "CS2 weekly drops: Prime, XP, the pool and what you actually get",
  answer:
    "CS2 weekly drops are Valve’s regular free cosmetic track: play matches, earn enough XP in the weekly window, and receive an item from the current drop pool — often a weapon case, graffiti or a modest collection skin. Prime Status is the usual gate. The pool rotates. A weekly drop is not a guaranteed Covert and it is not a reason to log into a third-party “drop booster.”",
  facts: [
    "The weekly track is earned by playing CS2, not by idling a phishing site.",
    "Prime Status is the usual requirement for the regular weekly drop.",
    "The active drop pool is a Valve list that can change when cases rotate.",
    "A dropped case is free; a key to open it is not.",
    "Third-party pages that promise extra weekly drops for a Steam login are a scam pattern.",
  ],
  sections: [
    {
      id: "what",
      title: "What a weekly drop is",
      body: `A weekly drop is an item Valve grants after you cross a playtime / XP threshold inside a reset window. The client shows progress. When the bar fills, you receive something from the **active drop pool**. Then you wait for the next week.

This is the same habit people still call a CSGO weekly drop. The client changed. The idea — play, unlock, receive a pool item — did not.

This guide sits in [CS:GO heritage](/guides/topics/csgo-heritage). Adults 18+ only. PVPspinArena does not grant drops. [How it works](/how-it-works) is about Jackpot, Coinflip and Roulette in dollars.

If your search was really “how to get free skins,” the wider warning page is [how to get free CS2 skins](/guides/free-cs2-skins). This page is the weekly machine in detail.

The week is a habit designer. Valve wants you to launch the client. Advertisers want you to launch a phishing page that looks like the client. Your job is to treat the bar as optional. A missed week is not a debt. A filled bar is not a wage. If you only logged in because the reset was in two hours and you were already tired, you are working for a graffiti. Close the game. The pool will still be there after you sleep.

People also confuse the weekly drop with Prime matchmaking quality, with Armory stars, and with a Major souvenir. Those are four products. Mixing them is how you buy a pass “so the weekly is better” and then open every case with a key. Separate the taps before you spend.`,
    },
    {
      id: "prime",
      title: "Prime, XP and the reset",
      body: `**Prime** is the account flag Valve uses to gate matchmaking trust and, in practice, the drop track most players mean. If you do not have Prime, do not expect the same weekly item. Buying Prime is a Steam purchase when you do not already own it. It is not a third-party “activation.”

**XP** comes from playing official modes Valve counts. Exact numbers and weekly caps change. Read the live client, not a 2022 spreadsheet. If you are short of the threshold on reset day, you do not get a retroactive drop for almost-playing.

**The reset** is a weekly clock. You cannot store three unused drops because you played a marathon on Sunday. Unused progress generally dies with the window. That is the design: a drip, not a bank.

### Illustration

You play enough mid-week to fill the bar and receive a case from the current pool. You play more hours the same week. You do not receive a second ordinary weekly drop just because you are still in-game. Extra hours are practice, not a second cashier.

Competitive rank, Premier rating and Faceit do not replace this bar. They are different numbers. A high rating with no Prime can still mean no weekly track.`,
    },
    {
      id: "pool",
      title: "What is in the drop pool",
      body: `The pool is Valve’s current free table. It usually includes:

- Weapon cases from the **active** set — the same cases you see in the Armory / drop documentation for this season.
- Graffiti and other modest cosmetics.
- Collection skins from collections Valve still allows to drop.

It usually does not include:

- A guaranteed Covert or knife. Those rarities can appear the way any loot table can, not as the plan.
- Souvenir packages from a Major that is not running.
- Another player’s inventory.

When a case **leaves** the weekly pool, you stop receiving that case for free. Existing copies remain on the Market. That rotation is why old cases become a different supply story — see [cheapest covert skin](/guides/cheapest-covert-skins-cs2) for how printers stop.

[CS2 operation](/guides/cs2-operation) stars and [Armory](/guides/cs2-armory-pass) stars are parallel taps. They are not the weekly drop. Do not merge the bars in your head.`,
    },
    {
      id: "worth",
      title: "What a drop is worth — and what a key does to that sentence",
      body: `A drop’s honest value is the you-receive price on the tape you would actually use, after fees, if you sold it today. For a common case that is a small Wallet number. For graffiti it can be cents.

### Opening versus selling

If you buy a key and open the case, you have started [CS:GO case opening](/guides/csgo-case-opening). The drop was free. The opening is a paid loot box. Average return is below key-plus-case. “I got a free red” after a key purchase is a highlight, not a system.

### Illustration, not a live quote

Suppose the dropped case last-sold on Steam at a figure you will look up. After the market cut you would receive less than the buyer paid. If the key costs more than that you-receive number, opening is entertainment you are paying for. Selling the case is the actually free path.

Do not deposit the case into a skin lobby. The overlay’s credit is a markdown, and Steam-as-casino is an Agreement risk.`,
    },
    {
      id: "table",
      title: "Weekly drop versus the other free-feeling taps",
      body: `| Tap | Ticket | What you get | When it stops |
| --- | --- | --- | --- |
| Weekly drop | Prime + XP in the window | One pool item | Pool rotates; week resets |
| Major souvenir | Event rules | Souvenir package / item | When the event ends |
| Operation redeem | Paid pass + stars | Season tile or roll | When the operation ends |
| Armory redeem | Paid pass + stars | Shop tile | When Valve rotates stock |
| “Drop booster” website | Your Steam login | Usually nothing, or theft | When you revoke access |

The last row is the scam. Valve already has a drop system. A site cannot add a second official weekly drop. It can only take a session.`,
    },
    {
      id: "scams",
      title: "Sites that sell the weekly drop back to you",
      body: `Search ads will promise “cs2 weekly drops generator,” “extra Prime drop,” or “claim missed drop.” They want OpenID, an API key or a trade URL.

You cannot miss a drop in a way a stranger can restore. If the client did not grant it, a webpage will not. If you already signed in, treat it as a breach: password, Guard devices, API keys, Steam support’s phishing help.

Idling software and “XP farms” also sit in a grey that can violate Valve’s rules and still not beat a normal week of matches. This page will not teach you to idle. Play the game or skip the drop.

PVPspinArena will never ask for Steam to “credit a drop.” If a clone does, close it.

If the client UI and a website disagree about whether you earned the week, believe the client. Websites do not grant Valve drops. They grant phishing forms.`,
    },
    {
      id: "week-plan",
      title: "How to treat the week like a drip, not a shift",
      body: `A weekly drop works when it is leftover from matches you wanted. It fails when you open CS2 only to fill a bar, hate the mode, buy a key, and search “missed drop” at reset.

### A boring weekly plan

- Play the modes you already play. If the bar fills, collect. If it does not, skip.
- Decide in advance: sell the case, keep the case, or open it with a key you already budgeted. Do not decide after the reveal animation.
- Do not schedule a second session on Sunday night “just to finish XP.” That session is a chore with a loot hook.
- After you collect, leave the inventory. The Market will still exist on Monday.

XP rules change. Valve can retune week length, caps and what counts. When the client text disagrees with a guide from last year, the client wins. This page teaches the shape: threshold, pool, one drip, Prime as the usual gate.

If you share an account, the week belongs to whoever played. Fighting over who “earned” the drop is how households turn cosmetics into scorekeeping. Give the item to the person who will use it, or sell it and split Wallet funds if that is your house rule. Do not deposit it into a site to “make it fair.”

Travel weeks and exam weeks are allowed to miss a drop. The pool rotation does not owe you a catch-up crate. Sites that claim they can restore a missed week are lying.

A graffiti drop is a successful weekly drop. It is not a failure that must be avenged with a key. If only a red would have felt like success, you were not collecting a drip. You were spinning a wheel Valve did not label as a wheel.

Reset day is when the phishing ads spike. “Claim your missed weekly drop” banners follow the same calendar Valve uses. Expect them. Do not click them. If you are unsure whether the client granted the item, look in the inventory and in the official drop UI — not in a Google result.

Playing with friends does not multiply the official week. Five people in a lobby can still mean five separate Prime bars, or one bar if you share a login (do not share a login). Boosting accounts through a “drop farm” service is how people collect restrictions and empty inventories. This page will not teach that service. Play your own week or skip it.`,
    },
    {
      id: "stop",
      title: "If the week is a slot machine",
      body: `A drip feed is a powerful habit. Some people play modes they hate only to fill the bar, then open every case, then refill the Wallet, then hunt “missed drop” ads.

If the bar is running you, skip a week. The pool will still be there. If you cannot skip, the problem is larger than XP. Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). The [responsible gambling](/responsible-gambling) page lists blockers that work on storefronts too.

If you already played a mode you hate just to fill the bar, skip the key. The drop was the prize. Opening it is a second product. Tomorrow’s reset will not refund tonight’s tilt.

Play because you wanted a match. Take the drop if it arrives. Do not build a night around a graffiti.`,
    },
  ],
  faqs: [
    {
      q: "How do CS2 weekly drops work?",
      a: "Play official modes, earn XP toward the weekly threshold, receive one item from the current drop pool if you qualify (usually Prime). Then wait for the next window. Extra hours the same week are not a second cashier.",
    },
    {
      q: "Do I need Prime for weekly drops?",
      a: "Prime is the usual gate. Confirm in the live client. Do not buy “Prime unlocks” from a third-party site.",
    },
    {
      q: "Can I get more than one weekly drop?",
      a: "The ordinary track is one unlock per window. Extra hours are not a second cashier. Event or pass items are different products.",
    },
    {
      q: "Why did I get a case instead of a skin?",
      a: "Cases are in the pool. A case is a real drop. Opening it is a separate paid action.",
    },
    {
      q: "Can a website give me extra weekly drops?",
      a: "No. That pitch is a phishing or malware pattern.",
    },
    {
      q: "Does PVPspinArena use weekly drops?",
      a: "No. The site does not touch Steam drops.",
    },
  ],
  sources: [
    { label: "Counter-Strike 2 official site", url: "https://www.counter-strike.net/" },
    {
      label: "Steam Support — Prime Status",
      url: "https://help.steampowered.com/en/faqs/view/647C-5AAF-D785-17FB",
    },
    {
      label: "Steam Support — Phishing and scams",
      url: "https://help.steampowered.com/en/faqs/view/3644-0DAF-A807-31C5",
    },
    {
      label: "Steam Subscriber Agreement",
      url: "https://store.steampowered.com/subscriber_agreement/",
    },
  ],
  related: [
    "free-cs2-skins",
    "cs2-operation",
    "cs2-armory-pass",
    "csgo-case-opening",
    "cs2-case-odds",
  ],
  updated: "2026-09-26",
};
