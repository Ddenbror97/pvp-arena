import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cardano-casino",
  cluster: "Crypto payments",
  keyword: "cardano casino",
  secondary: ["ada casino", "gamble with cardano", "cardano gambling sites", "ada deposit casino"],
  title: "Cardano Casino: ADA Deposits, UTXOs and Wallets",
  description:
    "Check ADA casino deposits using Cardano's transaction model: minimum outputs, fees in ADA, wallet support and proof that a casino credited the transfer.",
  h1: "Cardano casino deposits: ADA, minimum outputs and crediting",
  answer:
    "A Cardano casino accepts ADA on the Cardano network. The important payment checks are the receiving address, available ADA after fees, minimum output requirements and the casino's crediting policy. ADA is the native coin; a similarly named token on an EVM network is a different asset. Cardano transaction inclusion does not by itself prove the casino credited your account.",
  facts: [
    "Cardano transactions consume existing UTXOs and create new outputs.",
    "Each output must carry a minimum amount of ADA.",
    "Transaction fees depend on transaction size and, where applicable, script execution.",
    "A casino's deposit minimum is separate from Cardano's minimum-output requirement.",
  ],
  sections: [
    {
      id: "utxo",
      title: "Why a tiny ADA send can fail before it reaches a casino",
      body: "The [Cardano Developer Portal](https://developers.cardano.org/docs/learn/core-concepts/transactions/) explains that transactions consume UTXOs and create outputs, with inputs balancing outputs plus the fee. Each output needs a minimum ADA amount. A wallet may therefore reject a tiny output even when the balance appears sufficient for the intended payment.\n\nCheck the amount the recipient will receive and the ADA needed for the transaction. A casino can impose its own higher deposit floor. Neither number can be inferred from a token's market price.",
    },
    {
      id: "wallet",
      title: "Use a Cardano receiving route",
      body: "Select ADA on Cardano in both the sending wallet and the deposit screen. Do not choose an Ethereum-style network merely because a similarly named asset appears there. [Creating a crypto wallet](/guides/how-to-create-a-crypto-wallet) begins with supported networks; [Ethereum gambling](/guides/ethereum-gambling) concerns another payment system.\n\nA network selection error is a payment problem, not a game outcome. Keep the destination and transaction ID for any support request.",
    },
    {
      id: "credit",
      title: "Separate the transaction from the account credit",
      body: "Check whether the wallet submitted the transfer, whether it was included and whether the cashier applied it to the correct account. Script-related costs and ordinary ADA transfer costs are not interchangeable; the developer documentation identifies both transaction size and execution as relevant to fees.\n\nThe [withdrawal guide](/guides/crypto-casino-withdrawals) follows the separate operator-processing stage. Ask for the stated confirmation and crediting policy before sending a test that could fall below the deposit minimum.",
    },
    {
      id: "risk",
      title: "Payment support leaves operator questions open",
      body: "ADA support says nothing about the operator's permission to serve your location, custody arrangements or game payouts. Read those terms before choosing a stake; do not add ADA simply to retrieve a disputed small balance.\n\n[USDC casino payments](/guides/usdc-casino) describe a different asset model, while [Crypto payments](/guides/topics/crypto-payments) groups the network-specific guides. Use [responsible gambling](/responsible-gambling) for a spending cap that covers repeated deposits as well as bets.",
    },
  ],
  faqs: [
    {
      q: "Does an ADA balance guarantee a tiny transfer will work?",
      a: "No. The transaction must cover fees and satisfy the minimum ADA required in each output.",
    },
    {
      q: "Is Cardano's minimum output the casino minimum?",
      a: "No. The network output requirement and the operator's deposit floor are separate.",
    },
    {
      q: "Can I use an ADA-named EVM token instead?",
      a: "Only if the receiving service explicitly supports that different asset and network. Native ADA is on Cardano.",
    },
    {
      q: "Does inclusion prove the casino credited me?",
      a: "No. Verify both the chain transaction and the account credit under the operator's policy.",
    },
  ],
  sources: [
    {
      label: "Cardano Developer Portal — transactions, fees and minimum UTXOs",
      url: "https://developers.cardano.org/docs/learn/core-concepts/transactions/",
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
    text: "Match native ADA and the Cardano network. Check minimum outputs and the amount the service will credit.",
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
