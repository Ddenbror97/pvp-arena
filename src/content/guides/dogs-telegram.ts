import type { Guide } from "./types";

export const guide: Guide = {
  slug: "dogs-telegram",
  cluster: "Foundations",
  keyword: "dogs telegram",
  secondary: ["dogs telegram legit", "dogs telegram payout", "dogs telegram real money"],
  title: "DOGS Telegram: Token Claims and Withdrawal Checks",
  description:
    "Separate a DOGS Telegram score from received TON tokens and a completed sale. Check asset identity, claim availability and withdrawal scam warnings.",
  h1: "DOGS Telegram: distinguish the app balance from a token payment",
  answer:
    "DOGS Telegram balances need to be separated into in-app rewards, tokens actually received on TON and proceeds from a completed sale. Those stages do not have a fixed conversion just because the name matches. DOGS is documented as a TON token, but that does not establish a current claim window or guarantee that an individual account can withdraw.",
  facts: [
    "The DOGS crypto-asset white paper describes a token on TON.",
    "A displayed app allocation is different from a confirmed token transfer.",
    "A token's name or icon alone cannot authenticate its contract.",
    "No current claim entitlement, payout amount or completion time is established here.",
  ],
  sections: [
    {
      id: "identity",
      title: "What the available documentation actually identifies",
      body: "The [DOGS crypto-asset white paper hosted by Kraken](https://assets-cms.kraken.com/files/51n36hrp/facade/50d26048ea357f6c90a533ca75aa9fb1a572548c.pdf) describes community rewards and a transferable token on TON. It is documentation of the asset, not evidence that a particular bot is genuine or a promotion remains open.\n\nKeep the mini-app identity, token identity and your account entitlement separate. A copied dog icon can impersonate a project without controlling its token. [Telegram casino bots](/guides/telegram-casino-bot) have additional gambling and custody questions; a reward token is not automatically a casino balance.",
    },
    {
      id: "balance",
      title: "Read each stage of the balance",
      body: "| Stage | Evidence to look for |\n| --- | --- |\n| In-app reward | Account record and applicable claim conditions |\n| Token received | Correct network, token identity and wallet transaction |\n| Exchange deposit | Credit to your own eligible exchange account |\n| Sale or withdrawal | Executed order and received proceeds |\n\nA quoted market price is not a completed sale. Minimum trade sizes, liquidity and account restrictions can leave a small balance unusable. [Games that pay real money](/guides/games-that-pay-real-money) explains the difference between a reward display and a completed redemption.",
    },
    {
      id: "ton",
      title: "Verify the token before moving it",
      body: "[TON's jetton documentation](https://docs.ton.org/applications/payments/jettons) warns that fake token wallets can display arbitrary balances. Token identity depends on the expected master contract, not the ticker alone. Confirm it from the project's established documentation and the receiving service's supported-asset information.\n\nFor an exchange deposit, follow the selected TON token's address and any comment requirement. A successful on-chain transfer and an exchange credit are separate events. The [TON wallet guide](/guides/ton-wallet) covers the network-specific wallet questions.",
    },
    {
      id: "claims",
      title: "Requests that should interrupt a claim",
      body: "A stranger asking for a seed phrase or a payment to unlock a large reward creates a separate security risk. [Bitcoin.org's scam guidance](https://bitcoin.org/en/scams) describes advance-payment giveaways, impersonation and wallet-draining prompts; the same request patterns are useful warning signs around token claims.\n\nNo current DOGS payout test was performed during review. If the app does not offer a verifiable claim, retain its account record rather than paying an unsolicited support contact. Set time and spending limits using [responsible gambling](/responsible-gambling) where reward loops lead into wagering. Related product checks sit in [Foundations](/guides/topics/foundations).",
    },
  ],
  faqs: [
    {
      q: "Is a DOGS app score already money in a wallet?",
      a: "No. Check whether the account has a claim entitlement and whether the correct token was actually transferred.",
    },
    {
      q: "Is DOGS associated with TON?",
      a: "The cited crypto-asset white paper documents DOGS as a token on TON. That does not authenticate every similarly named bot.",
    },
    {
      q: "Is a DOGS withdrawal currently guaranteed?",
      a: "No current claim window or individual entitlement was verified, and no withdrawal test was performed.",
    },
    {
      q: "Should support need a seed phrase for a claim?",
      a: "No. A recovery phrase grants wallet access. Keep it private and verify support through the project's established channels.",
    },
  ],
  sources: [
    {
      label: "DOGS crypto-asset white paper, hosted by Kraken",
      url: "https://assets-cms.kraken.com/files/51n36hrp/facade/50d26048ea357f6c90a533ca75aa9fb1a572548c.pdf",
    },
    {
      label: "TON Docs — jetton payments and token-identity checks",
      url: "https://docs.ton.org/applications/payments/jettons",
    },
    {
      label: "Bitcoin.org — Avoid Scams",
      url: "https://bitcoin.org/en/scams",
    },
  ],
  related: [
    "telegram-casino-bot",
    "skill-based-gambling",
    "games-that-pay-real-money",
    "pvp-gambling",
    "x-empire-telegram",
  ],
  updated: "2026-11-26",
};
