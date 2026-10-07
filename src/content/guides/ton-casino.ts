import type { Guide } from "./types";

export const guide: Guide = {
  slug: "ton-casino",
  cluster: "Crypto payments",
  keyword: "ton casino",
  secondary: ["toncoin casino", "telegram casino ton", "gamble with ton", "toncoin gambling"],
  title: "TON Casino: Toncoin, Telegram Wallets, Fees",
  description:
    "A TON casino takes Toncoin, usually from a TON wallet rather than MetaMask. Fees are low. This site does not accept TON.",
  h1: "TON casino: Toncoin wallets, fees and Telegram habits",
  answer:
    "A TON casino accepts Toncoin on the TON blockchain. Fees are low and transfers are quick, and the usual wallets are TON wallets such as Tonkeeper, not MetaMask. A casino inside Telegram is still a casino with an operator, an edge and withdrawal rules. PVPspinArena does not accept TON and is not a Telegram bot.",
  facts: [
    "Toncoin is the native asset of TON. MetaMask does not hold it.",
    "Fees are typically very small, and the network is built for short confirmation times.",
    "Telegram mini-apps are a distribution channel. The operator is still whoever the terms name.",
    "A comment or memo on a TON transfer can matter. Copy what the cashier shows.",
    "PVPspinArena does not accept TON. There is no Telegram gambling bot on this site.",
  ],
  sections: [
    {
      id: "scope",
      title: "What people mean by a TON casino",
      body: `A ton casino search is commercial: someone wants a gambling site that accepts TON. Accepting a coin is a cashier choice. It is not a licence, a fairness proof, or a reason the game is cheaper. Adults 18+ only. This is not legal advice and not a deposit instruction for a blocked country.

Start in [Crypto payments](/guides/topics/crypto-payments). Read [how to create a crypto wallet](/guides/how-to-create-a-crypto-wallet) if you do not yet have a wallet that can actually hold TON. PVPspinArena's cashier is USDC or ETH on Base, explained on the [wallet](/wallet) page. We do not credit TON.

TON casino searches spiked with Telegram. People meet a bot or a mini-app and assume the chat platform is the casino. The chat is a window. The cashier, the company and the game rules are elsewhere, and you should be able to name them before you send Toncoin.

Write the date beside any fee or confirmation claim. Networks change parameters, and casinos change which assets they list. If the deposit screen you are looking at does not name TON and the exact network, you are not looking at a TON deposit.`,
    },
    {
      id: "network",
      title: "TON: fees, speed and finality",
      body: `TON is designed for high throughput and low fees. Everyday transfers cost fractions of a Toncoin and confirm quickly under normal conditions. That feel is closer to a message than to an Ethereum gas auction, which is why people skip the address check. TON also uses comments on transfers the way other chains use memos. If the casino prints a comment, it is part of the payment. There is a difference between the Toncoin you hold on TON and any wrapped representation elsewhere. The deposit screen's network is the one that counts. Speed does not create an undo button.

Those figures are the chain, not the casino. A casino can wait for more confirmations than the chain needs, or credit you instantly and take the reorg risk itself. The number on the cashier overrides a blog. Compare the chain fee with [gas fees](/guides/gas-fees-explained) so you do not treat an Ethereum-style gas bid and a cheap L1 fee as the same problem.

A low fee does not make the wager good. The game's edge is a separate percentage, paid every bet, and it usually dwarfs the network fee after a few rounds. See [house edge](/guides/house-edge). Sending TON cheaply to a high-edge game is still a high-edge game.

PVPspinArena does not route bets through TON. There is no TON invoice. If a page tells you to bridge onto TON in order to play here, it is not our page.`,
    },
    {
      id: "wallet",
      title: "Wallets that can hold TON",
      body: `Tonkeeper and the wallet features inside Telegram are the tools players actually use. They are not MetaMask and they do not share Ethereum keys. A 24-word Ethereum seed does not restore a TON wallet. Write down the TON wallet's own recovery method offline. Bots that ask you to import a seed into chat are steal attempts. Our [Telegram casino bot](/guides/telegram-casino-bot) page covers the bot risk in general. A TON casino that only exists as a username, with no terms page and no company name, is not ready for a deposit no matter how fast the chain is.

The recurring loss is the wrong wallet family. An Ethereum address is not a universal inbox. TON sent to an address that cannot spend it is often gone. Read the deposit warning twice, including any destination tag, memo or comment the casino prints. Our [crypto casino withdrawals](/guides/crypto-casino-withdrawals) page is the general failure list: wrong network, missing memo, a review queue.

MetaMask is an Ethereum-style wallet. It does not become a TON wallet because a casino logo is familiar. Where MetaMask support is a separate question, use the MetaMask guides already on this site rather than guessing from a token icon.

Keep the gambling float in its own wallet. If the session goes badly, the loss should be capped by that wallet. [Responsible gambling](/responsible-gambling) is the limit, not a hardware trick.`,
    },
    {
      id: "casino",
      title: "What the casino still has to prove",
      body: `Inside the app, look for the same facts as any other crypto casino: who operates it, which games are hashed versus studio games, what the edge is, and how a withdrawal returns to a wallet you control. Jetton-style tokens on TON are not Toncoin. A reward paid in a jetton may be unsellable. Price it at zero until you can sell it yourself. Country rules still apply inside a chat. A bot cannot license you.

A footer that says "TON accepted" is advertising. The proof is a deposit address you can match to the chain, a game whose edge or seed you can read, and a small withdrawal that returns. [Provably fair](/guides/provably-fair-casino) games are a method, not a coin. A studio slot paid in TON is still a studio slot.

Do not buy TON only because a casino lists it. You would be adding price risk on top of the wager. If you already hold it, you can still decide the game is a bad price. The coin and the game are two yes-or-no questions.

Identity checks can appear at withdrawal even when the deposit was just an address. [No-KYC casino](/guides/no-kyc-casino) explains that tradeoff. TON does not cancel it.`,
    },
    {
      id: "table",
      title: "TON at a glance",
      body: `| Question | TON | PVPspinArena |
| --- | --- | --- |
| Asset | TON | USDC or ETH on Base |
| Typical fee shape | Very small Toncoin fee; watch the transfer comment | Base network fee, not a TON fee |
| What you must not confuse | A Telegram bot versus the company that holds the money | A pot between players |
| Wallet family | A TON wallet such as Tonkeeper, not MetaMask | An Ethereum-style wallet on Base |
| This site accepts it? | No | Only USDC or ETH on Base |

This site is a website with a Base cashier, not a TON mini-app. Opening Telegram will not show a PVPspinArena balance.

Sibling chain pages use the same rows so the anchor stays specific: [Cardano casino](/guides/cardano-casino), [XRP casino](/guides/xrp-casino), [Shiba Inu casino](/guides/shiba-inu-casino), [Monero casino](/guides/monero-casino), [Binance Coin casino](/guides/binance-coin-casino), TON casino. None of them is a deposit guide for this site.`,
    },
    {
      id: "rehearsal",
      title: "Rehearse a TON deposit before you fund it",
      body: `Treat a ton casino cashier as a drill, not as a mood. Open the wallet that can hold TON first. The right family is A TON wallet such as Tonkeeper, not MetaMask. If the fee token for that wallet is empty, you are not ready, even when the TON balance looks large. Write the wallet's name on the note. An unfamiliar popup that offers to "connect and fix" the missing fee is not part of the drill.

Then log into the casino and open the deposit screen the same day. It has to name TON and TON. Copy the address from that screen, paste it, and compare the start and the end. A Telegram bot versus the company that holds the money is the failure this step exists to catch. If a tag, memo or comment is printed, it is part of the address. Screenshot the pair before you send.

Send the smallest amount the cashier will credit. Very small Toncoin fee; watch the transfer comment. Wait for the casino's own confirmation rule, which can be slower than the chain. Save the transaction id in the same note as the address. Do not send the rest of the float because the first transfer "looks fine" in your wallet. Fine in your wallet means broadcast. Fine at the casino means credited to you.

Withdraw a slice of that test back to the same wallet before you play in earnest. Time the wait. If the site asks for documents, write that down as a feature of the cashier, not as a surprise you will argue with later. If the test never returns, you have a cheap answer and you stop. This site is a website with a Base cashier, not a TON mini-app. Opening Telegram will not show a PVPspinArena balance.

Only after the round trip do you decide whether a larger amount is even a question. Convert your dollar loss limit into TON at the moment you would send it. When the dollar limit is gone, stop, even if the token count looks small. Stop if a bot asks for your seed phrase. Stop if you cannot find a terms page with a legal name. Low fees are not a substitute for knowing who has the float. A mini-app that hides the company name behind a username is not finished research, and a fast Toncoin transfer will not finish it for you.

PVPspinArena still does not accept TON. A successful rehearsal somewhere else does not create a balance here. This site's [wallet](/wallet) page lists USDC or ETH on Base. Adults 18+ only. If the drill left you wanting a second site to chase the test, stop and use [responsible gambling](/responsible-gambling) instead of another deposit screen.`,
    },
    {
      id: "stop",
      title: "When to stop",
      body: `Stop if a bot asks for your seed phrase. Stop if you cannot find a terms page with a legal name. Low fees are not a substitute for knowing who has the float. A mini-app that hides the company name behind a username is not finished research, and a fast Toncoin transfer will not finish it for you.

If a casino blocks your country, stop. This page will not describe a bypass. If you are sending TON to chase a loss from another coin, stop. The chain fee being small is not a reason to continue.

A useful session ends with the float you set aside, whether that float comes home or not. [How it works](/how-it-works) describes the three games on this site. It does not describe a TON lobby, because there is not one.

The asset still needs its own wallet. A [TON wallet](/guides/ton-wallet) such as Tonkeeper is not MetaMask, and this site does not accept TON.`,
    },
  ],
  faqs: [
    {
      q: "Is a Telegram casino the same as TON?",
      a: "Often they travel together, but a bot can take other coins and a TON casino can be an ordinary website. Read the cashier. The chat app is not the licence.",
    },
    {
      q: "Can I send TON from MetaMask?",
      a: "No. Use a TON wallet. An Ethereum seed will not hold Toncoin.",
    },
    {
      q: "Are TON fees the reason to play?",
      a: "Fees are small. The game's edge is the cost that repeats. A cheap transfer into a high-edge game is still a high-edge game.",
    },
    {
      q: "Does PVPspinArena have a TON bot?",
      a: "No. Play is on this website. Deposits are USDC or ETH on Base. Toncoin is not accepted.",
    },
    {
      q: "What is a jetton reward?",
      a: "A token on TON that is not Toncoin. It may not be sellable. Do not count it in your bankroll until you have sold it.",
    },
  ],
  sources: [
    {
      label: "TON docs — overview",
      url: "https://docs.ton.org/ton-concepts/overview",
    },
    {
      label: "GambleAware",
      url: "https://www.gambleaware.org/",
    },
  ],
  related: [
    "ethereum-gambling",
    "gas-fees-explained",
    "how-to-create-a-crypto-wallet",
    "crypto-casino-withdrawals",
    "usdc-casino",
  ],
  updated: "2026-09-27",
  cta: {
    title: "This cashier is Base",
    text: "PVPspinArena does not take TON. Jackpot, Coinflip and Roulette use USDC or ETH on Base. A TON balance in another wallet is not a deposit here.",
    primary: { to: "/wallet", label: "Open the wallet page" },
    secondary: { to: "/how-it-works", label: "How the site works" },
  },
};
