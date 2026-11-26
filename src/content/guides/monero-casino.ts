import type { Guide } from "./types";

export const guide: Guide = {
  slug: "monero-casino",
  cluster: "Crypto payments",
  keyword: "monero casino",
  secondary: ["xmr casino", "monero gambling", "private coin casino", "xmr deposit casino"],
  title: "Monero Casino: XMR Privacy and Payment Evidence",
  description:
    "Understand what Monero privacy hides, what a casino still knows and how XMR payment proofs help distinguish a missing account credit from a failed send.",
  h1: "Monero casino payments: privacy, crediting and proof",
  answer:
    "A Monero casino accepts XMR on Monero. Its privacy features limit public visibility of transaction participants and amounts, but the operator can still know your account details, communications and its own payment records. Privacy does not guarantee withdrawal access or remove identity requirements. For a disputed deposit, Monero's payment-proof tools are more useful than expecting a public explorer to show an ordinary address-and-amount receipt.",
  facts: [
    "Monero uses privacy mechanisms that differ from a transparent address ledger.",
    "Public transaction visibility does not reveal the same information as a Bitcoin-style receipt.",
    "Official wallet tools can verify a payment using transaction-specific evidence.",
    "A payment proof is different from a wallet seed or spend key.",
  ],
  sections: [
    {
      id: "privacy",
      title: "Separate blockchain privacy from the operator's records",
      body: "The [Monero project overview](https://www.getmonero.org/get-started/what-is-monero/) describes hidden sender, receiver and amount information using stealth addresses, ring signatures and RingCT. That describes the network's privacy design; it is not a promise that an account-based service has no information about you.\n\nThe casino can retain login details, chat messages and the deposit destination it assigned. Read its verification and withdrawal terms before paying rather than interpreting XMR support as a no-checks policy.",
    },
    {
      id: "proof",
      title: "Use transaction-specific evidence for a missing credit",
      body: "Monero's [payment-proof guide](https://www.getmonero.org/resources/user-guides/prove-payment.html) explains checking a transaction with its ID, transaction key and destination address. Official wallet tools can determine the amount sent to that address and its confirmations.\n\nUse the wallet's proof/check workflow and the service's verified support route. A transaction key relates to that payment; a seed phrase or private spend key controls the wallet and must remain private. Do not publish sensitive proof data in an open chat.",
    },
    {
      id: "status",
      title: "An unlocked balance and a casino credit are separate",
      body: "The [official wallet guide](https://www.getmonero.org/resources/user-guides/monero-wallet-cli.html) explains that newly received funds require confirmations before they unlock. That wallet rule does not prescribe a casino's account-credit schedule or withdrawal processing time.\n\nKeep the sending record, the destination assigned to you and any support reference. [Crypto casino withdrawals](/guides/crypto-casino-withdrawals) helps separate operator processing from a submitted chain payment.",
    },
    {
      id: "limits",
      title: "Check the exit before funding the account",
      body: "Confirm that both the casino and any exchange you intend to use support XMR withdrawals for your location and account. A deposit option alone does not establish an available cash-out route.\n\nUse a wallet that actually supports Monero; [wallet creation](/guides/how-to-create-a-crypto-wallet) and [self-custody](/guides/self-custody-wallet) explain custody choices. More network guides are in [Crypto payments](/guides/topics/crypto-payments). [Responsible gambling](/responsible-gambling) covers loss limits independently of payment privacy.",
    },
  ],
  faqs: [
    {
      q: "Does Monero hide everything from a casino?",
      a: "No. Network privacy does not erase the operator's account records, communications or payment information.",
    },
    {
      q: "How can a Monero payment be proved?",
      a: "Official wallet tools can check transaction-specific evidence, including the transaction ID, transaction key and destination.",
    },
    {
      q: "Should support receive my wallet seed?",
      a: "No. A payment proof is different from the seed or spend key that controls your wallet.",
    },
    {
      q: "Do confirmations guarantee a withdrawal?",
      a: "No. Wallet confirmation rules and the operator's account or withdrawal processing are separate.",
    },
  ],
  sources: [
    {
      label: "Monero — What is Monero?",
      url: "https://www.getmonero.org/get-started/what-is-monero/",
    },
    {
      label: "Monero — How to prove payment",
      url: "https://www.getmonero.org/resources/user-guides/prove-payment.html",
    },
    {
      label: "Monero — official wallet CLI guide",
      url: "https://www.getmonero.org/resources/user-guides/monero-wallet-cli.html",
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
    text: "Verify XMR support and keep transaction-specific proof for any missing credit.",
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
