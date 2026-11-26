import type { Guide } from "./types";

export const guide: Guide = {
  slug: "binance-coin-casino",
  cluster: "Crypto payments",
  keyword: "binance coin casino",
  secondary: ["bnb casino", "bsc casino", "gamble with bnb", "binance smart chain casino"],
  title: "Binance Coin Casino: BNB Networks and Deposit Checks",
  description:
    "Check BNB casino deposits by network, distinguish BNB Smart Chain from opBNB and avoid obsolete Beacon Chain routes or unsupported token transfers.",
  h1: "Binance coin casino deposits: which BNB network does the cashier mean?",
  answer:
    "A Binance coin casino needs to specify the network on which it accepts BNB. BNB Smart Chain and opBNB are separate networks even when a wallet shows the same address. Old BNB Beacon Chain instructions add a further risk because that chain has been sunset. Confirm the active receiving route rather than sending on the cheapest network offered by an exchange.",
  facts: [
    "BNB Smart Chain is an EVM-compatible network.",
    "BNB is used for gas on BNB Smart Chain.",
    "opBNB is a separate network rather than another name for BNB Smart Chain.",
    "Beacon Chain recovery information concerns legacy assets, not a normal casino deposit route.",
  ],
  sections: [
    {
      id: "bsc",
      title: "Identify BNB Smart Chain explicitly",
      body: "[BNB Chain's documentation](https://docs.bnbchain.org/bnb-smart-chain/introduction/) describes BNB Smart Chain and its gas and validator system. In a deposit flow, match the cashier's network to the withdrawal network at the exchange or wallet. The BNB ticker is not enough.\n\nSending native BNB and sending a BEP-20 token on BSC are also different asset choices. A casino can accept one without accepting every token the chain carries.",
    },
    {
      id: "legacy",
      title: "Do not reuse old Beacon Chain payment instructions",
      body: "The [official recovery-tool sunset plan](https://docs.bnbchain.org/announce/token-recovery-sunset-plan/) concerns migration of eligible legacy Beacon Chain assets. It says only BEP2 tokens mirrored to BEP20 tokens qualify; non-mirrored assets are not eligible.\n\nThat recovery context should not be confused with an ordinary casino payment. If a cashier or saved note offers obsolete Beacon Chain instructions, verify the receiving route before moving anything. Avoid recovery links supplied by strangers.",
    },
    {
      id: "same-address",
      title: "The same address can exist on another network",
      body: "A matching 0x string does not bridge funds. Check the selected chain, supported asset and receiving minimum at both ends. In particular, do not substitute opBNB just because it appears in the sender's network list.\n\nFor comparisons, [Ethereum gambling](/guides/ethereum-gambling) covers another EVM network and [gas fees](/guides/gas-fees-explained) explains why lower gas cost does not imply payment compatibility.",
    },
    {
      id: "credit",
      title: "Keep proof of the credited deposit",
      body: "Retain the network, transaction ID, amount and account-credit record. If the transfer is confirmed but the account remains empty, ask the service to reconcile those details before making another deposit. [Crypto casino withdrawals](/guides/crypto-casino-withdrawals) covers the corresponding exit checks.\n\nOther chains are grouped in [Crypto payments](/guides/topics/crypto-payments). Use [responsible gambling](/responsible-gambling) for an overall spending limit, including repeat funding and conversion costs.",
    },
  ],
  faqs: [
    {
      q: "Does every BNB deposit use BNB Smart Chain?",
      a: "No. Verify the exact network named by the recipient. BNB can appear in different network contexts.",
    },
    {
      q: "Can opBNB be substituted for BNB Smart Chain?",
      a: "Only when the receiving service explicitly supports it. A shared address format does not transfer funds between networks.",
    },
    {
      q: "Should I follow an old Beacon Chain guide?",
      a: "Treat it as legacy information and verify against current official sunset guidance before moving assets.",
    },
    {
      q: "Does accepting BNB mean accepting all BEP-20 tokens?",
      a: "No. Asset support and network support are separate requirements.",
    },
  ],
  sources: [
    {
      label: "BNB Chain — BNB Smart Chain introduction",
      url: "https://docs.bnbchain.org/bnb-smart-chain/introduction/",
    },
    {
      label: "BNB Chain — Beacon Chain token-recovery sunset plan",
      url: "https://docs.bnbchain.org/announce/token-recovery-sunset-plan/",
    },
  ],
  related: [
    "ethereum-gambling",
    "gas-fees-explained",
    "how-to-create-a-crypto-wallet",
    "crypto-casino-withdrawals",
    "usdc-casino",
  ],
  updated: "2026-11-26",
  cta: {
    title: "Check the receiving instructions",
    text: "Match the BNB network at both ends; the ticker and address format alone are insufficient.",
    primary: {
      to: "/how-it-works#wallet",
      label: "Site deposit instructions",
    },
    secondary: {
      to: "/guides/crypto-casino-withdrawals",
      label: "Withdrawal checks",
    },
  },
};
