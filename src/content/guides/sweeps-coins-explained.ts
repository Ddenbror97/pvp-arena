import type { Guide } from "./types";

export const guide: Guide = {
  slug: "sweeps-coins-explained",
  cluster: "Sweepstakes",
  keyword: "sweeps coins",
  secondary: [
    "what are sweeps coins",
    "sweeps coins redeem",
    "sweeps coins playthrough",
    "SC coins casino",
  ],
  title: "Sweeps Coins Explained: Earn, Play, Then Redeem",
  description:
    "What Sweeps Coins are, how people receive them, what playthrough and redeem floors do, and why they are not the same as USDC on a PvP site.",
  h1: "Sweeps Coins explained: the promotional chip that might cash out",
  answer:
    "Sweeps Coins are the promotional balance on a sweepstakes casino. You do not buy them as a wager. You receive them with Gold Coin packs, dailies, codes, or a mail-in entry. After playthrough and checks, leftover Sweeps Coins may redeem for cash or a gift card. They are not USDC. PVPspinArena does not issue Sweeps Coins.",
  facts: [
    "Sweeps Coins are a promotional entry chip, not a deposit you own the way you own a wallet balance.",
    "Gold Coin purchases often include a Sweeps Coin allotment; the allotment carries the redeem rules.",
    "Playthrough, game weighting, and a minimum SC balance sit between a win and a payout.",
    "Some sites offer a no-purchase mail-in path. It is slow by design and still sits inside official rules.",
    "PVPspinArena balances are USDC or ETH on Base. There is no Sweeps Coin meter on this site.",
  ],
  sections: [
    {
      id: "what-they-are",
      title: "What Sweeps Coins are",
      body: `Sweeps Coins are the chip a [sweepstakes casino](/guides/sweepstakes-casino) treats as a sweepstakes entry. The lobby shows them next to Gold Coins. Marketing calls them “SC,” “rewards,” or a house brand name. The function is the same: they are the only balance that might leave the site as cash or a card.

This [sweepstakes](/guides/topics/sweepstakes) guide is for adults aged 18 or over. It does not list live SC drop amounts. Those change by brand and week. If a streamer shouts a number, treat it as their promo, not as a fact on this page.

Sweeps Coins are not a dollar in your pocket until a redemption clears. Before that they are a terms object: they can expire, they can fail playthrough, and they can be unsusable in your state. [Gold Coins versus Sweeps Coins](/guides/gold-coins-vs-sweeps-coins) is the companion if you need the pair in one table.`,
    },
    {
      id: "how-you-get-them",
      title: "How people receive Sweeps Coins",
      body: `Operators issue SC through a short list of pipes. Names vary. The pipes do not.

### Purchase bundles

You buy Gold Coins. The receipt includes a promotional SC allotment. The allotment is why you paid. The Gold Coins are why the operator says you did not wager.

### Dailies, codes and account drops

Login calendars, email codes, and “reload” pops add small SC piles. They train a daily open. They rarely clear a redeem floor by themselves.

### Alternative method of entry

Some official rules describe a mail-in or other no-purchase path. That path exists so the promotion can be described as a sweepstakes. It is usually slower and more limited than buying a bundle. It is not a secret cash machine.

### Support adjustments

A missing daily or a bug can produce a manual credit. That credit is still promotional SC. It still follows playthrough.

None of these pipes is how a [crypto casino](/guides/what-is-a-crypto-casino) credits USDC. A chain transfer either confirms or it does not. There is no “allotment” sitting beside a Gold Coin pile.

Keep a simple log if you use more than one pipe in a week: date, source (bundle, daily, code, mail-in), SC credited, and the playthrough that applies to that pile. Operators sometimes attach different multiples to different sources. Mixing them in your head is how a 1× daily and a 40× purchase allotment become “I thought everything was 1×.” The official rules, not the toast on screen, name the multiple for each credit.`,
    },
    {
      id: "playthrough",
      title: "Playthrough, weighting and redeem floors",
      body: `Receiving Sweeps Coins is the easy screenshot. Spending them under the rules is the product.

[Wagering requirements](/guides/casino-wagering-requirements) on a welcome bonus are the same shape: a multiple, a list of games that count, a time limit, a max bet while the meter runs. Sweepstakes playthrough is that shape with a different coin name.

A redeem floor is a second gate. You can finish playthrough and still sit under the minimum SC the cashier will send. The floor turns small daily drops into a reason to buy another bundle.

Game weighting decides whether a slot stake counts at 100% and a table stake at 10%, or the reverse. If you “clear” on a game that counts at 0%, you cleared nothing.

[How sweepstakes casinos work](/guides/how-do-sweepstakes-casinos-work) orders these gates as a loop. Read that page before you treat a 50 SC balance as money.

Max-bet rules while playthrough is open are easy to miss and expensive to breach. A $2 SC stake that feels small in Gold Coin mode can void a promotional pile if the SC max bet is $0.50. The void can take the leftover SC, not just the offending spin. Read the max-bet line before you raise the slider because a bonus round “needs more.”

Time limits work the same way. A seven-day clock on a 40× pile is a rush tool. Rush tools exist to make you buy another bundle when the clock is almost done. If you cannot finish the meter inside a budget you already wrote, let the pile expire. Expired SC is a sunk promotional credit. Another bundle to “save” it is a new purchase.`,
    },
    {
      id: "not-usdc",
      title: "Sweeps Coins are not USDC",
      body: `USDC is a dollar stablecoin you can hold in a wallet you control. Sweeps Coins are a ledger line on an operator’s server. You cannot send SC to another address. You cannot verify SC on a block explorer. You cannot take SC to a different brand.

That difference decides every later argument. A delayed USDC withdrawal is a chain or a cashier policy. A delayed SC redemption is a promotional review. A lost seed phrase is a wallet problem. A lost SC balance is a terms problem.

Think of SC as a coupon with extra steps, not as a stablecoin with a skin. A coupon can expire, can require a minimum basket, and can be refused at the till. Calling the coupon “coins” does not make it money in transit. If you need a dollar you can send to someone else tonight, you need an asset rail, not an SC ledger.

People also ask whether SC “stack” across brands. They do not. Brand A’s 40 SC are useless at Brand B. There is no common clearing house. A merge or a white-label reskin can even rename the chip and reset a pile under new official rules. Read the email that says “we’ve upgraded.” Upgrades sometimes zero promotional balances.

PVPspinArena shows dollars because deposits are USDC or ETH on Base. The [Jackpot](/) pot is not an SC prize pool. If someone in chat says “sweeps on Base,” they are mixing two products. This site does not mix them.`,
    },
    {
      id: "example",
      title: "Worked example: 20 SC and two meters (illustration only)",
      body: `These figures are teaching numbers. They are not a live drop.

| Path | Start | Rule | What must happen | Typical leftover risk |
| --- | --- | --- | --- | --- |
| A | 20 SC | 1× playthrough, 10 SC redeem floor | Stake 20 SC; hold at least 10 SC after play | Variance can drop you under 10 SC |
| B | 20 SC | 40× playthrough, 50 SC redeem floor | 800 SC of weighted play; then reach 50 SC | The meter usually consumes the pile |
| C | 20 USDC on this site | No SC meter | Play a posted pot or wheel | Outcome risk only, no promotional multiple |

Path A looks kind. Path B is why people buy a second bundle “just to finish.” Path C is a different product: [house edge](/guides/house-edge) or a PvP fee, not a bonus clause.

If you cannot recompute the multiple from the terms page in one minute, do not treat the 20 SC as $20.`,
    },
    {
      id: "language",
      title: "Marketing words that hide the meter",
      body: `Decode the lobby copy before you tap.

- “Free SC” still sits inside official rules. Free to receive is not free to redeem.
- “Instant redeem” still means after the gates the terms name.
- “No purchase necessary” points at a mail-in path, not at a blank check.
- “Gold Coin sale” is a purchase. The SC sidecar is the hook.
- “Unlimited entertainment” is Gold Coin language. It is not a payout promise.

[Fake casino sites](/guides/fake-casino-sites) use the same excitement with a worse cashier. A cloned sweepstakes lobby that never redeems is a scam, not a strict playthrough. If the domain is a week old and the redeem button opens a chat that asks you to “unlock” with another payment, stop.

A [social casino](/guides/social-casino) that never added SC will not redeem either — and that can be honest, if the store page said so. Honesty is the difference, not the chip art.

Support scripts will sometimes say “your SC are worth dollars.” Ask them to point at the redeem section instead. Value at redeem, after gates, is the only dollar figure that matters. A lobby conversion rate printed on a pack (“100,000 GC + 10 SC for $19.99”) is a shop price, not a guaranteed $10 waiting in SC. The 10 SC still have to survive play, the floor, and review.`,
    },
    {
      id: "record",
      title: "What to save if you request a redeem",
      body: `If you intend to redeem, keep records as if a dispute is possible. Save the official rules PDF as it appeared on the day you bought the bundle. Save the receipt. Save the playthrough screen that shows 100%. Save the redeem ticket id. Chat transcripts disappear; email tickets last longer.

Those files will not force a payout. They give you something to attach to a consumer complaint if the operator cites a rule that was not in the document you saved. They also stop you from arguing from memory about a multiple you never wrote down.

This site does not run that paperwork loop. A USDC withdrawal on Base is a transaction you can look up. That is a different kind of record, and it is one reason PVPspinArena is not a Sweeps Coin cashier. If you want a chain txid, you are in the crypto column. If you want a promotional ticket, you are in the sweepstakes column. Do not expect one record set to satisfy the other desk.`,
    },
    {
      id: "summary",
      title: "Summary and when to stop",
      body: `Sweeps Coins are the promotional chip on a sweepstakes casino. They arrive with packs, dailies or mail-in rules. They redeem only after playthrough, floors, identity checks, and a state filter. They are not USDC. This site does not issue them.

You must be 18 or over. If you are buying bundles to finish an SC meter you no longer enjoy, stop. Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). A promotional chip is a poor reason to chase.`,
    },
  ],
  faqs: [
    {
      q: "What are Sweeps Coins?",
      a: "Sweeps Coins are promotional entries on a sweepstakes casino. They sit beside Gold Coins. After playthrough and other checks, leftover Sweeps Coins may be redeemable for cash or a gift card. They are not a crypto deposit and they are not spendable off that operator’s site.",
    },
    {
      q: "Can I buy Sweeps Coins directly?",
      a: "Most operators say you buy Gold Coins and receive Sweeps Coins as a promotional allotment. Some regions and brands word this differently. The practical test is the terms: which chip can redeem, and what multiple applies. Do not trust a cashier label alone.",
    },
    {
      q: "Do Sweeps Coins expire?",
      a: "They can. Official rules may set inactivity clocks, promotion windows, or account-closure rules that zero SC. Read the expiry line before you grind a meter for a week. An expired chip is not a debt the operator owes you. Screenshot the date if you plan to redeem close to the deadline.",
    },
    {
      q: "Are Sweeps Coins the same as USDC?",
      a: "No. USDC is a stablecoin you can hold in a wallet. Sweeps Coins are a site ledger. PVPspinArena uses USDC and ETH on Base and does not issue Sweeps Coins. You cannot bridge SC onto Base, and a Base txid will not move an SC redeem ticket.",
    },
    {
      q: "What playthrough do Sweeps Coins usually need?",
      a: "It varies by brand and by how the coins were issued. Some allotments are 1×. Purchase-linked piles can be much higher. This page will not invent a live multiple. Find the number in the official rules, then multiply it by the SC you received before you call the pile “cash.”",
    },
    {
      q: "Does PVPspinArena give Sweeps Coins?",
      a: "No. There is no SC balance, no Gold Coin shop, and no redeem desk for promotional chips. Games are Jackpot, Coinflip and Roulette. If you arrived looking for a two-token sweepstakes cashier, this is the wrong product. Watch a live pot instead of hunting a daily SC drop.",
    },
  ],
  sources: [
    {
      label: "FTC — Prize, sweepstakes and lottery scams",
      url: "https://www.ftc.gov/consumer-advice/money-credit/scams/prize-sweepstakes-lotteries",
    },
    { label: "NCPG — Responsible gambling resources", url: "https://www.ncpgambling.org/" },
    { label: "Circle — USDC overview", url: "https://www.circle.com/usdc" },
  ],
  related: [
    "sweepstakes-casino",
    "gold-coins-vs-sweeps-coins",
    "how-do-sweepstakes-casinos-work",
    "casino-wagering-requirements",
    "house-edge",
    "how-do-sweepstakes-casinos-make-money",
  ],
  updated: "2026-09-26",
};
