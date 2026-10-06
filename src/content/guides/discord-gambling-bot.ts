import type { Guide } from "./types";

export const guide: Guide = {
  slug: "discord-gambling-bot",
  cluster: "Foundations",
  keyword: "discord gambling bot",
  secondary: [
    "discord bet bot",
    "discord casino bot",
    "gambling bot discord",
    "discord coinflip bot",
  ],
  title: "Discord Gambling Bot Guide: Risks, Scams and Safer Play",
  description:
    "How a Discord gambling bot works, why most are unlicensed and easy to fake, common scam patterns, and safer places to play with a public ledger.",
  h1: "Discord gambling bot risks: scams, custody and safer alternatives",
  answer:
    "A Discord gambling bot is a chat bot that takes bets inside a server: you tip it coins or crypto, it runs a coinflip, crash or roulette command, and it is supposed to pay winners back in the same channel. Most are unlicensed, easy to clone, and hold your funds in a wallet you cannot audit. That is a worse custody story than a site with a public deposit address and a fairness page.",
  facts: [
    "Discord's terms restrict using the service for illegal activity; a gambling bot is not a licensed casino because it lives in a server.",
    "Anyone who can add a bot can copy a popular command list and point the payout wallet at themselves.",
    "Custody is usually a single hot wallet or an IOU balance the operator can edit.",
    "Impersonation of 'support' staff and fake withdraw bots is a common theft pattern.",
    "PVPspinArena is a website, not a Discord bot, and does not take bets in chat.",
  ],
  sections: [
    {
      id: "what",
      title: "What a Discord gambling bot is",
      body: `A Discord gambling bot is software added to a server that responds to chat commands. Typical commands look like \`!cf 10\`, \`!roll\` or a slash command that opens a mini roulette. The bot tracks a balance per Discord user ID. You fund that balance by tipping the bot, sending crypto to an address it DMs, or buying a server-only coin with a real token.

The attraction is obvious: your friends are already in the channel, the round is a message, and there is no website to load. The cost of that convenience is that the casino is a process running on someone else's computer, identified by an application ID you probably did not verify.

This guide is in our [foundations cluster](/guides/topics/foundations). It is not a list of bots to add. We will not name "working" servers or share invite links. Unlicensed chat casinos are easy to fake and hard to police. If you want the wider cheat-versus-edge lesson, read [are online casinos rigged](/guides/are-online-casinos-rigged). If you want clone-site patterns that also show up as fake bot pages, read [fake casino sites](/guides/fake-casino-sites).

PVPspinArena does not operate a Discord bet bot, a Discord casino bot or a Discord coinflip bot. Chat is not our cashier.`,
    },
    {
      id: "how",
      title: "How the money and the 'game' usually move",
      body: `There are three common money paths.

1. **On-platform IOU.** You send crypto to an address. The bot credits "coins". Those coins are a row in a database. They are not your keys.
2. **Tip currency.** A separate economy bot holds a server token. The gambling bot debits it. You still do not hold the private key.
3. **Peer escrow theatre.** The bot claims to hold both sides of a coinflip in one address. You cannot see a signed commitment before the command.

Results are almost always a server-side random number. Some operators paste a "provably fair" string after the fact. After-the-fact hashes do not prove the result was fixed before you typed the command. A real commit-reveal publishes a hash first.

### Why "the server is big" is not diligence

A 40,000-member server can still be one admin key. Nitro badges and animated banners are not a licence. A second bot with the same avatar can be invited to a lookalike server tonight. Discord usernames and display names are cheap to copy.

If you cannot recompute a round, cannot name a legal entity, and cannot withdraw to an address you control without begging an admin, you do not have a casino. You have a group chat with a tip jar.

### A worked IOU path

You tip 0.02 ETH. The bot replies "20 coins". You run \`!cf 10\` and win. Balance shows 30 coins. Nothing on a block explorer changed except the first tip. The extra 10 coins exist only as a row the operator can edit, freeze or delete. A later withdraw of "30 coins" is a promise, not a queued transaction you can watch. Compare that with a site deposit: the credit matches a txid you can open on a Base explorer. The result still needs a fairness check, but the cashier is not a chat log.`,
    },
    {
      id: "unlicensed",
      title: "Why most bots are unlicensed — and why that matters",
      body: `A gambling licence attaches to an operator, a jurisdiction and a set of player-protection rules: age checks, complaints, segregated funds, advertising limits. Adding a bot to a Discord server does none of that. Discord is a communications platform. Its terms and guidelines restrict illegal activity and give Discord a right to remove apps that break the rules. That is not the same as the UK Gambling Commission testing your roulette.

### What you lose without a licence or a public ledger

- No regulator register to look up.
- No guaranteed identity check that you are an adult — which is a problem, not a perk, when servers are full of teenagers.
- No standard complaint path if the bot goes offline with the pot.
- No published house edge you can hold them to.

"No KYC" as a boast often means "no one to sue". Our [PvP gambling guide](/guides/pvp-gambling) describes a model where the operator's income is a fee and the pot is player money. That model still needs an operator you can find and a result you can check. A disappearing Discord application ID fails both tests.

We will not tell you how to run, host or "secure" an underground bot. That would be helping the wrong product. The adult move is to leave the category.`,
    },
    {
      id: "scams",
      title: "Scam patterns that show up every week",
      body: `These are the repeats. Treat them as disqualifying, not as puzzles.

- **Clone bots.** Same name, same avatar, different application ID. The withdraw address is the scammer's.
- **Fake support.** A "admin" DMs you after a failed withdraw and asks you to send a test amount, a seed phrase, or a wallet-connect signature.
- **Rain / airdrop bait.** You must send first to "unlock" a pot that does not exist.
- **Edited messages.** A bot or a webhook edits the winning number after people react. Screenshots lie; message IDs can still be swapped if you were not watching.
- **Exit.** The bot stops responding. The server is rebranded. The wallet is emptied.
- **Phishing sites** linked from the bot: "verify wallet to tip". That is a drainer. See [fake casino sites](/guides/fake-casino-sites) for the browser version of the same trick.

### Worked example

You join a server advertised as "provably fair discord coinflip bot". The bot DMs an ETH address. You send 0.05 ETH. Balance shows 50 coins. You win twice in chat. Withdraw requests a "gas fee" of 0.02 ETH to a second address. You send it. Both addresses drain to a mixer. The bot is replaced by a new invite the next morning. Nothing in Discord's UI can reverse that.

The FBI's Internet Crime Complaint Center exists for a reason. File if you were hit. Do not send more to "unlock" the first loss.`,
    },
    {
      id: "safer",
      title: "Safer places to play — and what 'safer' means",
      body: `Safer does not mean you will win. It means you can see the rail, the rules and the result.

A public-ledger deposit is a transaction you can look up. A fairness page that commits a seed hash before a round is something you can recompute. A company name and terms page give you a document, not a vibe. Age gates are a feature when the audience is 18+.

PVPspinArena is built that way on purpose: email account, wallet verification by signed message (never a seed phrase), USDC or ETH on Base, [Jackpot](/) and [Coinflip](/coinflip) as player-versus-player games, [Roulette](/roulette) with a published wheel, and a [fairness page](/fairness) for every finished round. That is a website with a ledger, not a slash command.

If chat is the only interface, assume you cannot audit it. If a friend insists "our bot has been up for a year", ask who holds the keys and what happens when that person is bored. One year is not a licence.

| Check | Chat bot | Public-ledger site |
| --- | --- | --- |
| Deposit | Tip or DM address | On-chain transfer you can look up |
| Result | Server RNG, often after the fact | Seed hash committed before the round |
| Withdraw | Admin or bot command | Token send to your address |
| Identity | A Discord application ID | A URL, terms page and company text |

"Safer" also means the audience is supposed to be adults. A Discord server that mixes homework channels with a crash bot is a reason to leave, not a reason to look for a quieter command prefix.

If betting in a server is already a problem — hiding it, chasing, using money meant for bills — stop. Use the tools and help links on the [responsible gambling page](/responsible-gambling). A Discord mute is not self-exclusion. Our [how to stop gambling guide](/guides/how-to-stop-gambling) is the longer version.`,
    },
    {
      id: "already",
      title: "If you already used a bot",
      body: `Do this in order.

1. Stop depositing. There is no "one more flip" that recovers a hot-wallet operator.
2. Remove the bot from servers you admin. Kick lookalike apps.
3. Rotate any password or 2FA you typed into a "verify" page linked from the server.
4. If you signed a wallet-connect request, revoke approvals on the chain you used.
5. Move remaining funds from that wallet to a new one if you signed anything you did not understand.
6. Keep message links and txids. Report to Discord and, if money moved, to IC3 or your local cybercrime route.

Then decide whether you still want to gamble at all. If you do, pick a product with a URL you can spell, a deposit you can see on a block explorer, and a result you can check. If you do not, that is a complete and respectable outcome.

We will not help you "find a trusted discord casino bot". That sentence is how the next clone gets traffic.

The same product in a different messenger is still an unlicensed chat cashier. A Telegram "VIP" deposit address does not improve custody because the icon is a paper plane. Treat it as a second hot wallet you cannot audit, not as an upgrade.`,
    },
    {
      id: "choose",
      title: "Chat is for talking, not for escrow",
      body: `Discord is good at communities. It is bad at being a vault. A gambling bot combines a random number you cannot see with a cashier you cannot sue. That combination is why the scam pattern is so stable: cheap to copy, fast to drain, easy to rebrand.

Adults who want a coinflip can use a site that publishes the fee and the seed commitment. Adults who want to talk about a match can use Discord without tipping a bot. Mixing the two is how a Friday voice chat becomes a Saturday IC3 form.

PVPspinArena will not add a chat cashier to "meet users where they are". Where they are, in this case, is a place designed for messages, not for holding someone else's ETH.

A server boost, a custom emoji pack and a #wins channel are stage design. They do not create a reserve, a licence or a replayable seed. If you cannot bookmark a host, archive terms and replay a commitment, you are tipping a stranger who can rename the app tomorrow. Adults 18+ who still want a flip can use a public site. Everyone else can keep Discord for talking and leave the cashier out of the sidebar.`,
    },
  ],
  faqs: [
    {
      q: "What is a Discord gambling bot?",
      a: "It is a bot added to a Discord server that takes bets through chat commands and keeps a per-user balance, usually funded by crypto tips or an IOU coin.",
    },
    {
      q: "Are Discord gambling bots legal?",
      a: "Most are unlicensed. Whether using one is legal depends on your local gambling laws. Discord's own terms also restrict illegal activity. Check both before you send funds.",
    },
    {
      q: "Why are Discord casino bots so often scams?",
      a: "They are cheap to clone, custody is a hot wallet or a database row, and there is no public commit before the result. Exit scams and fake support DMs are easy.",
    },
    {
      q: "Is a Discord coinflip bot provably fair?",
      a: "Almost never in a way you can verify. A hash posted after the flip does not prove the result was fixed first. Prefer a site that commits a seed before entries.",
    },
    {
      q: "Does PVPspinArena run a Discord betting bot?",
      a: "No. PVPspinArena is a crypto PvP website. It does not take bets in Discord and will not ask you to tip a bot.",
    },
    {
      q: "What should I do if a bot stole my crypto?",
      a: "Stop sending money, revoke wallet approvals, move remaining funds if you signed unknown transactions, save txids, and report to Discord and a cybercrime centre such as IC3.",
    },
  ],
  sources: [
    { label: "Discord Terms of Service", url: "https://discord.com/terms" },
    { label: "Discord Community Guidelines", url: "https://discord.com/guidelines" },
    { label: "FBI Internet Crime Complaint Center (IC3)", url: "https://www.ic3.gov/" },
    {
      label: "FTC: How to recognize and avoid phishing scams",
      url: "https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams",
    },
  ],
  related: [
    "what-is-a-crypto-casino",
    "telegram-casino-bot",
    "kick-gambling-streamers",
    "twitch-slots-ban",
    "crypto-gambling-taxes",
  ],
  updated: "2026-09-26",
};
