import type { Guide } from "./types";

export const guide: Guide = {
  slug: "ton-wallet",
  cluster: "Crypto payments",
  keyword: "ton wallet",
  secondary: ["tonkeeper", "toncoin wallet", "ton vs ethereum"],
  title: "TON Wallet: Custody for Toncoin, Not for This Site",
  description:
    "A TON wallet holds Toncoin on The Open Network. An Ethereum seed will not restore it. This site's terms accept Bitcoin and Base, not TON.",
  h1: "TON wallet: hold Toncoin before you trust a bot",
  answer:
    "A ton wallet stores Toncoin and talks to The Open Network, which is not Ethereum and not Base. Tonkeeper is a widely used app for that network. A MetaMask secret will not restore a TON account. A bot that asks you to paste the recovery phrase is stealing it. PVPspinArena's terms do not list TON as a deposit asset.",
  facts: [
    "TON is a separate network with its own addresses. An Ethereum address is not a TON address.",
    "Tonkeeper is one common TON wallet. It is not a Base or Ethereum wallet.",
    "This site's terms accept Bitcoin, and USDC or ETH on Base. TON is not on that list.",
    "Never type a recovery phrase into a website, a support chat, or a Telegram bot.",
    "A token that happens to be called the same thing on another chain is a different asset.",
  ],
  sections: [
    {
      id: "network",
      title: "Why a TON wallet is not MetaMask",
      body: `The Open Network uses its own accounts and its own address format. Software built for Ethereum, including MetaMask, speaks a different protocol. Importing a twelve-word Ethereum secret into a TON app, or the reverse, is not a restore. It is either ignored or, worse, handed to an app you did not mean to trust.

Tonkeeper is a normal example of a TON wallet people actually install. The official TON docs are the place to confirm how that network expects you to receive Toncoin. This page will not walk through a seed backup, because a backup written into a chat is how the coins leave.

You are in [Crypto payments](/guides/topics/crypto-payments). [How to create a crypto wallet](/guides/how-to-create-a-crypto-wallet) is the general key-custody page. [Base versus Ethereum](/guides/base-vs-ethereum) is a different pair of networks that do share an address style, which is its own mistake. TON does not share that style.`,
    },
    {
      id: "casino-network-check",
      title: "Check the network before using a TON casino",
      body: "The [TON casino guide](/guides/ton-casino) explains the difference between holding Toncoin and using it at a gambling operator. Confirm the operator and its supported deposit network independently before sending anything. PVPspinArena does not accept TON; an article about TON casinos is not a TON deposit option here.",
    },
    {
      id: "not-here",
      title: "This cashier does not take TON",
      body: `The terms say the playable balance is a US-dollar ledger. Bitcoin, and USDC or ETH on Base, can fund it and cash out. They are not separate playable balances, and TON is not named.

If a page, a bot, or a "support" account tells you to deposit Toncoin to play here, it is not describing these terms. Stop and open the site you typed yourself. [Wallet security checklist](/guides/wallet-security-checklist) is the short version: no seed phrase in a form, no unlimited approval for a transfer that should be a simple send.

[How it works](/how-it-works) lists the games after a dollar balance exists. None of them are priced in Toncoin.`,
    },
    {
      id: "bots",
      title: "Telegram is where the theft story usually starts",
      body: `TON activity clusters in Telegram. That is also where fake airdrops, fake support, and fake "connect your wallet" bots live. A real wallet connection does not require you to reveal the phrase that recreates the account. A prompt that wants the phrase wants the account.

Check the app you installed against the publisher you meant, not against a reply in a group. [Fake casino sites](/guides/fake-casino-sites) is the same pattern on the web: a lookalike that arrives the week a brand is being searched.

Adults only. A wallet guide is not a reason to gamble with money you need. [Responsible gambling](/responsible-gambling) still applies if the TON you hold is going to be staked somewhere else.`,
    },
    {
      id: "if-you-hold-it",
      title: "If you do hold Toncoin",
      body: `Send a small test to your own TON address and confirm it in a block explorer you chose, not in a link from a stranger. Fees and memo or comment fields, where a service demands them, are that service's rule. This site has no TON memo because it has no TON deposit.

Do not bridge or swap into a "wrapped" asset because a guide told you the ticker matched. [Gas fees explained](/guides/gas-fees-explained) is about EVM gas, not TON fees. Different networks, different bills.

This page is not a review of Tonkeeper and not an endorsement of any TON casino.`,
    },
  ],
  faqs: [
    {
      q: "Can I restore a TON wallet with a MetaMask seed?",
      a: "No. TON is not Ethereum. The secrets and the addresses belong to different networks.",
    },
    {
      q: "Does PVPspinArena accept TON or Toncoin?",
      a: "No. The terms list Bitcoin, and USDC or ETH on Base.",
    },
    {
      q: "Is Tonkeeper the only TON wallet?",
      a: "No. It is a common one. Whichever app you use, confirm the publisher and never reveal the recovery phrase.",
    },
    {
      q: "A bot says it will credit TON if I paste my phrase. What then?",
      a: "Close it. Pasting the phrase gives the bot the account. A deposit does not work that way.",
    },
    {
      q: "Can I swap TON to USDC and then deposit?",
      a: "Only if you end up with USDC on Base, which is the network the terms name, and you send it yourself. A swap on TON is not a Base deposit.",
    },
  ],
  sources: [
    { label: "TON documentation", url: "https://docs.ton.org/" },
    { label: "PVPspinArena terms: accepted networks", url: "https://pvpspinarena.com/terms" },
  ],
  related: [
    "how-to-create-a-crypto-wallet",
    "wallet-security-checklist",
    "base-vs-ethereum",
    "gas-fees-explained",
  ],
  updated: "2026-10-21",
};
