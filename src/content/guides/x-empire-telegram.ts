import type { Guide } from "./types";

export const guide: Guide = {
  slug: "x-empire-telegram",
  cluster: "Foundations",
  keyword: "x empire",
  secondary: ["x empire legit", "x empire payout", "x empire real money"],
  title: "X Empire Telegram: X Tokens and Cash-Out Evidence",
  description:
    "Understand X Empire's TON token, the limits of historical listing notices and the checks needed to distinguish app points from actual withdrawal proceeds.",
  h1: "X Empire Telegram: app rewards, X tokens and completed withdrawals",
  answer:
    "X Empire has a TON-based token called X, documented in a 2024 exchange listing announcement. That historical listing establishes the asset and announced network, not a current airdrop entitlement or a guaranteed cash-out from the Telegram app. Separate the app's reward record, a received token balance and the proceeds of an executed sale.",
  facts: [
    "KuCoin's 16 October 2024 announcement identifies X as a TON-based token.",
    "The announcement is historical evidence, not confirmation that deposits or claims are currently open.",
    "A TON token and an in-app reward record are different balances.",
    "No current X Empire withdrawal test or account entitlement was verified.",
  ],
  sections: [
    {
      id: "record",
      title: "What the 2024 listing confirms",
      body: "[KuCoin's listing announcement](https://www.kucoin.com/announcement/en-x-empire-x-gets-listed-on-kucoin-world-premiere) names X Empire, identifies the TON-Jetton network and gives an October 2024 trading and withdrawal schedule. It links the project's website and social channels.\n\nThose are dated statements. They do not demonstrate that the same trading pair, deposit route or game claim remains available in November 2026.",
    },
    {
      id: "units",
      title: "Follow the balance across three stages",
      body: "| Stage | Evidence |\n| --- | --- |\n| App reward | Your account allocation and its claim terms |\n| Received X token | Correct TON asset and transaction in the receiving wallet |\n| Sale proceeds | Completed order, fees and final received amount |\n\nTapping progress, a token quantity and a dollar valuation should not be combined into one number. A price screenshot is not evidence of an executed sale. [Games that pay real money](/guides/games-that-pay-real-money) explains why redemption matters more than the displayed score.",
    },
    {
      id: "network",
      title: "Token identity matters more than the letter X",
      body: "[TON's token-processing documentation](https://docs.ton.org/applications/payments/jettons) explains that counterfeit jetton contracts can show arbitrary balances. Match the asset using established project and receiving-service information rather than a name or icon.\n\nIf using an exchange, confirm its present network support and any required deposit comment before sending. See [TON wallets](/guides/ton-wallet) for wallet context and [Telegram casino bots](/guides/telegram-casino-bot) for the separate risks of entrusting balances to a bot.",
    },
    {
      id: "claims",
      title: "Assess a claim without paying to rescue it",
      body: "Keep the source of any claim link, the terms shown to your account and any completed transfer. Do not supply a seed phrase, import an unknown wallet backup or pay an unsolicited agent to reactivate an allocation. [Bitcoin.org's scam guidance](https://bitcoin.org/en/scams) describes these support and advance-payment patterns.\n\nThe absence of a verified current claim is a reason to leave entitlement unresolved. A different casino's fee table cannot price X Empire rewards. For spending controls where reward chasing becomes wagering, use [responsible gambling](/responsible-gambling). Related product checks are in [Foundations](/guides/topics/foundations).",
    },
  ],
  faqs: [
    {
      q: "Does X Empire have a token?",
      a: "KuCoin's dated listing announcement identifies X as a TON-based token. Check current project and receiving-service information before moving it.",
    },
    {
      q: "Does the 2024 listing prove a claim is open now?",
      a: "No. A historical listing schedule does not establish current game eligibility, exchange support or withdrawal availability.",
    },
    {
      q: "Was an X Empire withdrawal tested?",
      a: "No. No current cash-out test or individual claim entitlement was verified.",
    },
    {
      q: "Is an app score the same as sale proceeds?",
      a: "No. Confirm the token transfer, then any executed sale and final withdrawal separately.",
    },
  ],
  sources: [
    {
      label: "KuCoin — X Empire (X) listing announcement, 16 October 2024",
      url: "https://www.kucoin.com/announcement/en-x-empire-x-gets-listed-on-kucoin-world-premiere",
    },
    {
      label: "TON Docs — jetton payments and counterfeit-token checks",
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
    "house-edge",
    "games-that-pay-real-money",
    "dogs-telegram",
  ],
  updated: "2026-11-26",
};
