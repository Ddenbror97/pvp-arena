import type { Guide } from "./types";

export const guide: Guide = {
  slug: "telegram-casino-bot",
  cluster: "Foundations",
  keyword: "telegram casino bot",
  secondary: [
    "telegram betting bot",
    "telegram crash bot",
    "crypto telegram casino",
    "telegram gambling scam",
  ],
  title: "Telegram Casino Bot Guide: Scams and Safer Play",
  description:
    "How a Telegram casino bot works, why most are unlicensed, common drain and exit scams, and safer ways to play with a public ledger.",
  h1: "Telegram casino bot: how the scams work and safer alternatives",
  answer:
    "A Telegram casino bot is a chat account that takes bets inside Telegram: you send crypto to an address the bot posts, or you tap inline buttons, and it replies with a crash multiplier, a dice or a 'provably fair' hash. Most are unlicensed. Many are drains or exit scams. A safer way to play is a public site with a published cashier, hashed results you can replay, and no bot asking for a seed phrase. This page does not recommend bots.",
  facts: [
    "Telegram is a messenger. It is not a gambling regulator and does not license casino bots.",
    "A bot can post a deposit address it controls; sending coins there is a transfer you cannot reverse.",
    "Common scams include fake support accounts, malicious 'connect wallet' pages, and operators who vanish after a weekend of deposits.",
    "Dice and crash messages in chat are not a public verifier unless you can replay seeds independently.",
    "PVPspinArena is not a Telegram bot. It is a website: Jackpot, Coinflip and Roulette in USDC and ETH on Base.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "How a Telegram casino bot is wired",
      body: `A Telegram casino bot is software with a Telegram username. You open a chat, tap Start, and it shows a menu: crash, dice, slots, sports, 'VIP'. Deposits are usually on-chain to an address the bot generates, or via a custodial balance the operator keeps after your first send. Withdrawals are a command and a hope.

Some bots use Telegram Payments or third-party invoice apps. Most crypto telegram casino products skip that and just paste a TRC-20 or TON address.

The game logic lives on a server you do not see. The chat is a remote control. That is the whole architecture. It is the same shape as a [Discord gambling bot](/guides/discord-gambling-bot), with a different app store.

TON, TRC-20 USDT and "send to this memo" flows are popular because they are cheap and easy to paste into a chat. Cheap rails help honest cashiers and thieves equally. A $200 USDT send that confirms in fifteen seconds is a $200 gift if the handle was a clone. Speed is not a safety feature.

This belongs in [foundations](/guides/topics/foundations): know the product before a username feels like a venue.

I will not name bots, post handles, or walk through how to stand one up. Unlicensed operators do not need a how-to. You need a picture of the scam surface.

PVPspinArena is a site, not a chat. You use a browser, a verified wallet and the [fairness](/fairness) page. We will never DM you a bot token.`,
    },
    {
      id: "unlicensed",
      title: "Why most bots are unlicensed — and why that matters",
      body: `A licence is a paper from a regulator, not a Telegram badge. Anyone can register a bot with BotFather. That registration proves a username exists. It does not prove the operator is allowed to take bets where you live, will pay you, or is a real company.

Offshore casino licences, when they exist, are attached to websites and companies. A chat handle is easy to clone. Yesterday's 'licensed' bot can be a different person today with a one-character username change.

[Are online casinos rigged](/guides/are-online-casinos-rigged) is the broader question. A bot makes the answer worse: you have no stable URL, no published terms you can archive, and often no named licensee.

This is not legal advice. Taking bets without a licence is unlawful in many places. Using a bot may also be unlawful where you live. "It's just Telegram" is not a defence I can give you. If you cannot legally gamble, do not.

Age: 18+ everywhere this article assumes a real bet. A cartoon sticker pack does not lower that.`,
    },
    {
      id: "scams",
      title: "Drain scams, exit scams and the usual cast",
      body: `### Exit scam

The bot pays small withdrawals for a week. A Telegram channel posts win screenshots. Deposit volume rises. On Sunday the commands return "maintenance." The operator empties the hot wallet. The username is gone on Monday. You are not a creditor. You are a row on a chain they already spent.

### Drain

A "verify wallet" button opens a site that asks for a seed phrase or an unlimited token approval. You thought you were linking a cashier. You signed a permit. The NFT and USDC leave. The bot did not need to beat you at crash.

### Fake support

You lose, you complain in the public group. A helper with a similar name DMs you. They need a 'refund fee' or a screenshot of your seed for 'whitelist.' That is the second theft.

### Clone and phish

Ads point to @NameCasinoo instead of @NameCasino. The menu looks identical. The deposit address is theirs.

### Telegram crash bot theatre

Crash is easy to fake in a chat: send a GIF of 2.47x, debit the people who were still in, credit a shill. Without a pre-round hash you can replay, the multiplier is a message, not a proof. Same for dice emojis. Telegram dice are cute. They are not your seed.

### Bonus drains

"Deposit 1 ETH, get 1 ETH." Withdrawal condition: 40× wager on a 5% edge game inside an app that can freeze you. You will not clear it. See [fake casino sites](/guides/fake-casino-sites) for the website version of the same script.

| Pattern | What you see | What happened |
| --- | --- | --- |
| Exit | Maintenance, then silence | They took the float |
| Drain | Wallet connect / seed | You signed theft |
| Clone | Almost the right handle | Wrong address |
| Fake support | Helpful DM | Second bite |
| Fake crash | Pretty multiplier | Unverifiable debit |`,
    },
    {
      id: "worked-example",
      title: "Worked example: $200 in, 'provably fair' in the chat",
      body: `You send $200 USDT (TRC-20) to the address a telegram betting bot printed. It replies "Balance $200." You play crash. A message says server seed hash \`a1f3…\`. You lose $80. You request $120 out. The bot asks for a 2% 'network fee' in a second coin to a second address. You send $4. Withdrawal pending. Two days later the bot is gone.

What you can prove on-chain: you paid $200 to address A and $4 to address B. What you cannot prove: that hash \`a1f3…\` mapped to that crash path, that a licensee existed, that anyone will answer.

A public PvP site with a committed seed and a withdraw to *your* verified address looks different. You still might lose the $80 at the table. You should not need a second mystery address to get the remainder. [PvP gambling](/guides/pvp-gambling) is the model: players' pot, published fee, checkable draw.

If a chat requires a 'gas prepay' to a personal wallet, treat it as a drain even if last week it paid.`,
    },
    {
      id: "after-loss",
      title: "If the bot already has your coins",
      body: `Do not send a second payment to unlock the first. That sentence is the whole section, but people need the surrounding facts.

Document the username, the numeric Telegram id if you can see it, the deposit address, the transaction hashes, the dates and any "licence" image they posted. Report the account in Telegram. If the amount is large enough to matter, file with a cybercrime contact such as the [IC3](https://www.ic3.gov/) in the US or your local equivalent. Expect little. On-chain sends to an operator you do not know are usually final.

A "recovery specialist" who found you in the same group is part of the same economy. They will want a seed, a remote-desktop session or an advance fee. Close the DM.

If you signed a token approval, revoke it from a block explorer's token-approval tool on the chain you used, from a machine you trust. Then move leftover funds to a new wallet whose seed never touched Telegram.

None of this is a reason to try a "better" bot. It is hygiene after a theft. If the larger problem is that you keep depositing into chats, that is gambling harm plus a scam surface. Use [responsible gambling](/responsible-gambling) and tell someone you actually know.

I will not list replacement handles. A public site with a verifier is the alternative this article will name: PVPspinArena, in a browser, on Base.`,
    },
    {
      id: "safer",
      title: "Safer ways to play — without a bot list",
      body: `Safer is relative. Gambling can still harm you. These steps reduce *messenger-specific* failure, not house edge.

1. **Use a website you can bookmark**, with terms, a cashier address that stays put, and a verifier. PVPspinArena is one such site: Jackpot, Coinflip, Roulette, USDC and ETH on Base.
2. **Never paste a seed phrase** into Telegram, a 'support form,' or a bot command.
3. **Never sign setApprovalForAll or unlimited ERC-20 allowances** to enter a chat game.
4. **Do not hunt handles** from Google ads or 'crypto telegram casino' lists. Lists go stale and get seeded by scammers.
5. **Verify the domain** if a bot claims to be 'the official chat of' a site. Start from the site, not from the chat.
6. **Cap what sits in any hot wallet** you use for play. A drain takes what is approved or unlocked.

I will not tell you which unlicensed bot is 'the trusted one.' That sentence is how these pages become affiliate laundries.

If you already deposited and the bot is wobbling, stop sending 'unlock' fees. Document the txids. Report to Telegram and, if the amount matters, to local cybercrime contacts. Recovery is unlikely. Do not let a second bot 'recover' the first.

If gambling is the problem, not the bot, use [responsible gambling](/responsible-gambling).`,
    },
    {
      id: "pvp-contrast",
      title: "What a public ledger session looks like here",
      body: `On this site you create an account, verify a wallet with a signature (no gas), and send USDC or ETH on Base to the deposit flow. Credits wait for confirmations. Games settle in USD. You can inspect a round instead of trusting a chat bubble.

We are not in your Telegram contacts. We will not ask you to 'switch to the VIP bot.' Anyone who does that in our name is a clone.

The games are still gambling. Coinflip can take the stake. Roulette has about a 7.88% Purple or Silver edge after the win fee. A public ledger does not make you a winner. It makes the cashier and the result less of a ghost story.

You must be 18 or older. A group chat full of minors is a reason to leave, not a reason to play smaller.`,
    },
    {
      id: "summary",
      title: "A username is not a casino",
      body: `A Telegram casino bot is a chat UI on top of a wallet the operator controls. Most are unlicensed. Exit scams, drains, clones and fake support are the job. I will not promote a handle.

If you play, use a public site, a verifier and a cashier you can name without opening a DM. PVPspinArena is built that way and is not a Telegram bot. If you came from a crash group, do not send a 'reactivation' payment. Close the chat.`,
    },
  ],
  faqs: [
    {
      q: "What is a Telegram casino bot?",
      a: "A Telegram account that accepts bets in chat, usually after you send crypto to an address it controls. The messenger is the interface, not a regulator.",
    },
    {
      q: "Are Telegram betting bots licensed?",
      a: "Most are not. A BotFather username is not a gambling licence. Treat licence claims as unverified until you can name the regulator and the company.",
    },
    {
      q: "What is the most common Telegram gambling scam?",
      a: "Exit scams after a run of small withdrawals, plus drain pages that ask for a seed or a blanket wallet approval. Fake support DMs are a close third.",
    },
    {
      q: "Does PVPspinArena run a Telegram casino bot?",
      a: "No. Play is on the website with USDC and ETH on Base. We will not ask you to deposit through a chat bot.",
    },
    {
      q: "Is a crash multiplier in Telegram provably fair?",
      a: "Only if you can replay a pre-committed seed to that exact path. A hash posted after the crash, or a GIF of a multiplier, is not enough.",
    },
    {
      q: "Someone in a group offered to recover my bot balance. Should I pay?",
      a: "No. Recovery accounts are a second scam. Do not send fees, seeds or new deposits.",
    },
  ],
  sources: [
    { label: "Telegram — Terms of Service", url: "https://telegram.org/tos" },
    {
      label: "FTC — Cryptocurrency and scams",
      url: "https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-and-scams",
    },
    { label: "FBI — Internet Crime Complaint Center", url: "https://www.ic3.gov/" },
    { label: "UK Gambling Commission", url: "https://www.gamblingcommission.gov.uk/" },
  ],
  related: [
    "what-is-a-crypto-casino",
    "kick-gambling-streamers",
    "twitch-slots-ban",
    "crypto-gambling-taxes",
    "discord-gambling-bot",
  ],
  updated: "2026-09-26",
};
