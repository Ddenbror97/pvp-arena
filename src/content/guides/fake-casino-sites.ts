import type { Guide } from "./types";

export const guide: Guide = {
  slug: "fake-casino-sites",
  cluster: "Foundations",
  keyword: "fake casino sites",
  secondary: [
    "fake crypto casino",
    "casino phishing",
    "clone casino site",
    "wallet drainer casino",
  ],
  title: "Fake Casino Sites: Red Flags, Clones and How to Check",
  description:
    "How to spot fake casino sites: clone domains, wallet-drain approvals, support impersonation, and a checklist before you sign a deposit.",
  h1: "Fake casino sites: clone domains, drainers and a pre-deposit check",
  answer:
    "Fake casino sites copy a real brand or invent one so you will connect a wallet, sign a malicious approval or send funds to an address they control. The usual tells are lookalike domains, drain-and-repeat approvals, and 'support' that wants your seed phrase. Check the domain, the contract you are asked to sign, and a small test withdrawal before you treat a site as real.",
  facts: [
    "Clone casinos reuse logos and layouts on a domain that is one character off the real one.",
    "A wallet drainer is a contract approval or signature that lets someone empty tokens you hold.",
    "No legitimate casino or wallet support team will ask for your seed phrase.",
    "CISA and the FTC describe phishing as a request that looks official and is designed to steal credentials or funds.",
    "PVPspinArena verifies wallets with a signed message that moves no funds and never asks for a recovery phrase.",
  ],
  sections: [
    {
      id: "what",
      title: "What fake casino sites are",
      body: `A fake casino site is a website that wants your keys or your coins and does not intend to run a fair game. Some are clones of a known brand. Some are original names with stolen game screenshots. Some are real-looking houses that pay small withdrawals to bait a large deposit, then stall. The last group is a grey cousin of the first two; treat the checks the same.

Crypto makes the payoff immediate. There is no card network to reverse a Base transfer. If you approve a spender, the thief does not need your password again. That is why fake crypto casinos cluster around wallet pop-ups rather than "forgot password" emails alone.

This guide is a how-to in our [foundations cluster](/guides/topics/foundations). Pair it with [are online casinos rigged](/guides/are-online-casinos-rigged) for edge-versus-cheat, [seed phrase](/guides/seed-phrase) for recovery-word attacks, and [crypto wallet for gambling](/guides/crypto-wallet-for-gambling) for a cleaner setup. The [best crypto gambling sites](/guides/best-crypto-gambling-sites) checklist is the buying-side version of the same habit.

PVPspinArena will never DM you a "new domain" or ask you to re-enter a 12-word phrase. If someone does, they are not us.`,
    },
    {
      id: "clones",
      title: "Clone domains and the one-character trap",
      body: `Clones work because people type fast and trust logos.

- **Typosquatting:** pvpspinarenna.com, pvpspin-arena.com, a unicode lookalike that prints the same in some fonts.
- **Wrong TLD:** the real site is \`.com\` and the ad is \`.app\` or \`.io\`.
- **Subdomain theatre:** fairness-pvpspinarena.example.net is not the site.
- **Search ads.** A paid result can outrank the real URL for a week.

### How to check a domain

1. Type the URL from a bookmark you saved on a day you were sober and careful, or from the official account you already verified.
2. Read every character, including hyphens and the TLD.
3. Confirm TLS, but do not stop there. Thieves have certificates too.
4. Compare the about, terms and deposit-address patterns with a source you already trust.
5. If a streamer or a Discord "admin" sent the link, assume it is hostile until the domain matches your bookmark.

A clone can still have a pretty [guides](/guides) scrape. Content theft is cheap. The deposit address is the part they change.`,
    },
    {
      id: "drainers",
      title: "Wallet-drain approvals and hostile signatures",
      body: `The dangerous click is often not "send" but "approve".

A token allowance lets a contract move USDC (or another asset) from your wallet later, without another confirmation for each transfer. A drainer asks for unlimited or huge allowance the moment you "connect to play". A permit or a typed-data signature can do the same job with a message that looks like "sign in".

### What a normal casino connect looks like

On PVPspinArena, wallet verification is a signed message that proves you own the address. It does not move funds and does not set a spender. Deposits are transfers you start, to an address the site shows, on Base. If a "casino" needs \`setApprovalForAll\` or an unlimited \`approve\` before you have even seen a game, leave.

### Worked example

You open a clone. The wallet prompt says "Sign to verify". The decoded message is not a login nonce; it is a permit for USDC to a contract you have never seen, amount max uint256. If you sign, a bot can empty the USDC you hold on that network. The site can still show a fake $20 bonus. The bonus was never the product. The approval was.

Revoke allowances on a reputable explorer or revocation tool if you already signed. Then move remaining assets to a fresh wallet if you typed a seed phrase anywhere. The [seed phrase guide](/guides/seed-phrase) is the longer warning.`,
    },
    {
      id: "support",
      title: "Support impersonation and fake urgency",
      body: `Thieves play customer service because people in a panic skip the domain check.

- A Telegram or Discord account with the site logo, messaging you first.
- "Your withdrawal is stuck; send gas to this address."
- "Compliance needs your seed to whitelist the wallet."
- A second site that "resets" your 2FA if you paste a code.

Real support does not need your recovery phrase. Real support does not ask you to pay a surprise unlock fee to a personal wallet. Real support has a ticket on the domain you already bookmarked.

The FTC's phishing page and CISA's social-engineering note describe the same shape in different industries: official tone, urgent deadline, a request that a real institution would never make. A casino skin does not change the shape.

If you are already chasing a lost deposit, stop talking in DMs. Open a ticket only on the bookmarked site, or accept that the money is gone and protect the rest of the wallet. Help with the gambling-harm side is on the [responsible gambling page](/responsible-gambling).`,
    },
    {
      id: "checklist",
      title: "Pre-deposit checklist: do this before you sign or send",
      body: `Work the list in order. If any step fails, do not deposit.

1. **Confirm you are an adult** and that using the site is lawful where you live.
2. **Lock the URL** in a bookmark. Refuse ad and chat links that do not match it.
3. **Read what you will sign.** If the wallet cannot show a plain login message, refuse. If it asks for unlimited token approval, refuse.
4. **Check fairness or a licence.** Either a regulator register or a commit-reveal you can reproduce. Hidden odds are a warning; missing both is a stop.
5. **Read withdrawal terms.** Limits, reviews, networks. See [crypto casino withdrawals](/guides/crypto-casino-withdrawals) for the questions.
6. **Send a test amount** on the stated network only. Wrong network is a self-own; a fake site will still take it.
7. **Withdraw a slice** before you scale up. A site that cannot pay $15 will not pay $1,500.
8. **Never share a seed phrase.** Not with support, not with a "verifier dapp", not with a QR code from a friend.

Messenger clones are the same theft with a chat UI. A Telegram bot that pastes a deposit address is a fake casino site that never bothered to buy a domain. Start from a bookmark, not from a DM.

A ranking table cannot replace these clicks. If a listicle "best site" URL does not match the host you typed, the list is an ad. Use the [best crypto gambling sites](/guides/best-crypto-gambling-sites) checklist on the host you typed, not on the ad redirect.`,
    },
    {
      id: "hit",
      title: "If you already signed or sent to a fake site",
      body: `Speed matters more than embarrassment.

1. Disconnect the site in your wallet.
2. Revoke token allowances you granted on that network.
3. If you typed a seed phrase, that wallet is burned. Move anything left from a new wallet you created offline, if you still control a key the thief does not have — which you do not, if they have the phrase. In that case, only funds you have not yet received to the burned address are safe.
4. Save URLs, txids and screenshots. Report to IC3 or your local equivalent, and to the wallet vendor if they have a phishing form.
5. Warn the community without pasting your seed or private key "for verification".

Do not pay a recovery firm that found you. Secondary scams target people who just got drained.

Then decide whether you still want a casino open in that browser profile. If you do, use a dedicated wallet with only the session's funds, as the [crypto wallet for gambling](/guides/crypto-wallet-for-gambling) guide describes.`,
    },
    {
      id: "real",
      title: "What a checkable site looks like on purpose",
      body: `A real operation can survive slow customers. It publishes terms, a deposit network, a fairness method and a support path that does not start in your DMs.

PVPspinArena shows balances in dollars after USDC or ETH on Base. [How it works](/how-it-works) is the rules page. The [fairness page](/fairness) lets you verify a round. Wallet connect is a message, not an allowance. If a clone copies the CSS and changes those two facts — the address and the approval — believe the wallet, not the CSS.

Fake casino sites exist because haste is profitable. The checklist is slow on purpose. Use it once, bookmark the result, and treat every new link as untrusted again.

Work the list even when the site looks like us. A clone can copy the lobby CSS and still change the deposit address or wrap a drain approval in a “verify to claim” button. Believe the wallet prompt and the host you typed. Do not believe a Discord moderator who found you first.

Adults 18+ only. If a clone’s joke is that nobody checks age, that is another reason to leave. PVPspinArena will not migrate you to a new URL in a chat. If someone does that in our name, they are running a fake casino site.`,
    },
    {
      id: "example",
      title: "Worked example: the extra letter",
      body: `You search a brand, click the first ad, and land on a host with one extra letter. The lobby matches. A “limited bonus” button asks you to connect. The wallet shows an unlimited USDC approve to a contract you do not recognise. You refuse, type the brand yourself, and get a different host that only asks for a signed login message.

| Signal | Fake tab | Real tab |
| --- | --- | --- |
| Host | Ad redirect, extra letter | Bookmark / typed |
| Wallet prompt | Unlimited approve | Message, no spend |
| Support | DM with a new address | Ticket you opened |
| Test withdraw | Excuses | Small amount returns |

That table is the whole how-to. Haste is the product the clone sells. Slow is the defence. If you already signed the approve, revoke it, move leftovers, and do not send a "recovery fee." Write the host next to the tx hash so future-you can prove which tab it was.

The same theft happens in chat. A Telegram bot that pastes a deposit address is a fake casino site that skipped buying a domain. Start from a bookmark. If a bonus page wants a seed phrase, close it. If support DMs a second address, close that too.

Do the same walk when a friend pastes a "mirror" because the "main site is down". Mirrors that appear only in chat are clones until the host matches your bookmark. A second tell is a new token contract with the same ticker as USDC. The logo can be identical. The spender is not. If the site wants you to swap into "site USDC" before you play, you are not depositing. You are buying their chip on their terms.

Adults 18 or older can still lose money on a real site. A fake site skips the game and takes the stack. The checklist is how you tell the two apart before the first signature. A public ledger on a host you typed is slower than an ad. That slowness is the point.`,
    },
  ],
  faqs: [
    {
      q: "How do I spot fake casino sites?",
      a: "Check the exact domain against a bookmark, read every wallet prompt, refuse seed-phrase requests, and test a small withdrawal. Logos and certificates are not proof.",
    },
    {
      q: "What is a clone casino site?",
      a: "A copy of a real brand on a lookalike domain, usually with a different deposit address or a drainer contract behind the same layout.",
    },
    {
      q: "What is a wallet drainer casino?",
      a: "A page that tricks you into signing an approval or permit so an attacker can move your tokens. It may still look like a lobby with games.",
    },
    {
      q: "Will PVPspinArena ask for my seed phrase?",
      a: "No. Verification is a signed message. Anyone asking for the phrase is a scammer, including accounts that use our name.",
    },
    {
      q: "I sent funds to a fake crypto casino. Can I reverse it?",
      a: "Usually no. Blockchain transfers are final. Revoke approvals, abandon a burned seed, save txids and file a report. Do not pay a second 'recovery' service.",
    },
    {
      q: "Are fake sites the same as a rigged but real casino?",
      a: "No. A rigged operator still runs a site that may pay someone. A fake site's product is the theft. Check both: honesty of the game and honesty of the domain.",
    },
  ],
  sources: [
    {
      label: "FTC: How to recognize and avoid phishing scams",
      url: "https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams",
    },
    {
      label: "CISA: Avoiding social engineering and phishing attacks",
      url: "https://www.cisa.gov/news-events/news/avoiding-social-engineering-and-phishing-attacks",
    },
    { label: "FBI Internet Crime Complaint Center (IC3)", url: "https://www.ic3.gov/" },
    {
      label: "MetaMask: Secret Recovery Phrase safety",
      url: "https://support.metamask.io/privacy-and-security/staying-safe/what-is-a-secret-recovery-phrase-and-how-to-keep-your-crypto-wallet-secure/",
    },
  ],
  related: [
    "what-is-a-crypto-casino",
    "no-kyc-casino",
    "anonymous-casino",
    "are-online-casinos-rigged",
    "curacao-gambling-license",
    "are-online-casinos-safe",
  ],
  howTo: true,
  updated: "2026-09-26",
};
