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
  title: "Discord Gambling Bot: Custody and Verification Risks",
  description:
    "Check a Discord gambling bot’s operator, fund custody, result verification and withdrawal evidence. A server role or fairness hash alone proves little.",
  h1: "Discord gambling bot: what the interface can and cannot prove",
  answer:
    "A Discord gambling bot can display bets, balances and outcomes inside a server. The server interface does not establish who controls funds, whether the result can be checked independently or whether a withdrawal will be honoured. Verify those separate claims rather than treating a bot, server role or public website as proof of reliability.",
  facts: [
    "A server display is an operator-controlled record, not necessarily a wallet you control.",
    "An outcome verifier, operator identity and payout process answer different questions.",
    "This guide contains no survey establishing how many bots are licensed or fraudulent.",
  ],
  sections: [
    {
      id: "operator",
      title: "Identify the operator behind the commands",
      body: "Record the exact application or bot identity and the entity named in its terms. A display name, copied avatar or server role is not a regulator record. If a licence is claimed, check the named entity, domain and permitted activity against the relevant register.\n\nDiscord’s platform rules are a separate layer from permission to operate a gambling service. The [licence-checking guide](/guides/crypto-casino-license) and [foundations hub](/guides/topics/foundations) explain why these checks should not be collapsed into a trust badge.",
    },
    {
      id: "custody",
      title: "A chat balance is not proof of a segregated balance",
      body: "Distinguish the address receiving a transfer from the internal balance shown by a command. The operator may control the receiving wallet and its own ledger. A public address alone does not show which funds belong to a customer or whether other liabilities exist.\n\nFor an illustrative 20-unit balance, ask whether it means redeemable funds, promotional credits or play points before valuing it at $20. The interface must establish the unit and applicable terms. [Crypto withdrawals](/guides/crypto-casino-withdrawals) separates an internal request from a completed transfer.",
    },
    {
      id: "proof",
      title: "What a fairness hash actually helps you check",
      body: "A useful verification process needs a commitment made before the relevant outcome, the later reveal, and an algorithm that reproduces the recorded result. A hash posted only after a result cannot establish that it was committed beforehand.\n\nEven a correctly reproduced result does not prove that the operator has enough funds or will honour a payout. [Provably fair verification](/guides/provably-fair-casino) covers result evidence; it does not substitute for a custody assessment.",
    },
    {
      id: "records",
      title: "Keep evidence that answers a particular dispute",
      body: "Useful records include the exact terms and date, application identity, message or round identifier, commitment and reveal where provided, account statement and any completed transaction record. Keep these privately; never send a recovery phrase to a supposed moderator.\n\nAn impersonated support account or a request to install an unrelated verifier is a reason to stop and verify identity. This page recommends no bot and gives no prevalence estimate. PVPspinArena does not accept wagers through Discord. Use [responsible gambling](/responsible-gambling) for support with paid play.",
    },
  ],
  faqs: [
    {
      q: "Does a Discord server role prove a bot is licensed?",
      a: "No. Server roles are not regulator records. Verify the named operator and any applicable permission independently.",
    },
    {
      q: "Does a provably fair hash prove withdrawals work?",
      a: "No. Result verification and the ability or willingness to pay are separate questions.",
    },
    {
      q: "Is a website automatically safer than a bot?",
      a: "No. Both require checks of operator identity, custody, terms and the evidence behind their claims.",
    },
    {
      q: "Did this guide audit or test a named bot?",
      a: "No. It explains evidence to assess, not a funded test, endorsement or statistical survey of bots.",
    },
  ],
  sources: [
    {
      label: "Discord: platform Community Guidelines",
      url: "https://discord.com/guidelines",
    },
    {
      label: "Ethereum.org: what a transaction records",
      url: "https://ethereum.org/en/developers/docs/transactions/",
    },
  ],
  related: [
    "crypto-casino-license",
    "crypto-casino-withdrawals",
    "provably-fair-casino",
    "fake-casino-sites",
  ],
  updated: "2026-11-15",
};
