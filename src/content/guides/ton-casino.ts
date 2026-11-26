import type { Guide } from "./types";

export const guide: Guide = {
  slug: "ton-casino",
  cluster: "Crypto payments",
  keyword: "ton casino",
  secondary: ["toncoin casino", "telegram casino ton", "gamble with ton", "toncoin gambling"],
  title: "TON Casino: Native Coin, Jettons and Deposit Credit",
  description:
    "Distinguish native TON from TON jettons before a casino deposit. Check token identity, receiving instructions and the difference between transfer and credit.",
  h1: "TON casino deposits: native coin, jettons and account credit",
  answer:
    "A TON casino must identify whether it accepts the network's native coin or a particular jetton token. Those are different assets and transfer flows. A Telegram interface does not prove that a service supports either one, and a successful wallet action does not establish a casino account credit. Match the selected asset, recipient instructions and any required deposit comment before sending.",
  facts: [
    "Jettons are fungible tokens implemented through smart contracts on TON.",
    "A jetton uses a master contract and per-holder token-wallet contracts.",
    "A token name alone cannot identify the genuine jetton.",
    "A recipient's crediting rules are separate from the wallet's submitted transfer.",
  ],
  sections: [
    {
      id: "assets",
      title: "Native coin and jettons are different payment paths",
      body: "[TON's jetton overview](https://docs.ton.org/standard/tokens/jettons/overview) describes the master-contract and individual token-wallet architecture. A token issued on TON is not automatically the same asset as the native network coin.\n\nIf a casino accepts a stablecoin or game token on TON, select that supported token rather than assuming any TON balance qualifies. [TON wallet guidance](/guides/ton-wallet) covers the receiving account; [USDC casino deposits](/guides/usdc-casino) illustrates why issuer and network support both matter.",
    },
    {
      id: "identity",
      title: "Validate the token instead of trusting its icon",
      body: "The [jetton payments guide](https://docs.ton.org/applications/payments/jettons) warns that fake token wallets can show arbitrary balances. A receiving service must recognize the intended master contract. A familiar logo or short ticker in a wallet is weak evidence by itself.\n\nUse established project information and the recipient's current supported-asset instructions. Do not let a direct-message sender choose the contract or persuade you to sign a corrective transaction.",
    },
    {
      id: "credit",
      title: "A transfer notification and a cashier credit are separate",
      body: "The documentation explains that jetton transfers involve multiple messages and that receiving services rely on appropriate transfer notifications. A generic 'sent' display therefore does not show that a casino completed its accounting.\n\nKeep the transaction, selected asset, receiving address and any comment the cashier required. Follow the recipient's instructions exactly; [crypto casino withdrawals](/guides/crypto-casino-withdrawals) covers similar reconciliation questions when sending out.",
    },
    {
      id: "telegram",
      title: "The app interface does not supply a guarantee",
      body: "A wallet opened within Telegram can still connect to a separate operator with its own custody and withdrawal rules. Read who controls the account and whether you can withdraw the supported asset before funding a game. A community channel is not payment insurance.\n\nThe [Crypto payments topic](/guides/topics/crypto-payments) brings together network guides. Set an affordable funding limit through [responsible gambling](/responsible-gambling), especially where chat notifications encourage repeated deposits.",
    },
  ],
  faqs: [
    {
      q: "Is every token on TON the native coin?",
      a: "No. Jettons are contract-based tokens with their own identity and transfer flow.",
    },
    {
      q: "Does a Telegram wallet prove a casino is legitimate?",
      a: "No. The interface does not establish the operator's identity, licence or ability to process withdrawals.",
    },
    {
      q: "How is a jetton identified?",
      a: "Check its expected master contract against reliable project and receiving-service information, rather than its ticker alone.",
    },
    {
      q: "Does a sent transfer prove an account credit?",
      a: "No. Verify the receiving service's credit and reconcile the asset, transaction and required deposit details if it is missing.",
    },
  ],
  sources: [
    {
      label: "TON Docs — jetton overview and contract architecture",
      url: "https://docs.ton.org/standard/tokens/jettons/overview",
    },
    {
      label: "TON Docs — jetton payment processing and security",
      url: "https://docs.ton.org/applications/payments/jettons",
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
    text: "Distinguish the native coin from a jetton and follow the recipient’s asset and comment instructions.",
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
