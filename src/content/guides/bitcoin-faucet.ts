import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bitcoin-faucet",
  cluster: "Crypto payments",
  keyword: "bitcoin faucet",
  secondary: ["crypto faucet", "btc faucet", "free bitcoin faucet", "testnet faucet"],
  title: "Bitcoin Faucet: Rewards, Test Coins and Scam Checks",
  description:
    "Separate bitcoin faucet rewards from valueless testnet coins. Check withdrawal floors, actual receipts and the risks of deposits demanded to unlock prizes.",
  h1: "Bitcoin faucet rewards: what is transferable and what is only a test?",
  answer:
    "A bitcoin faucet distributes small amounts of bitcoin or advertises a reward for an action. A developer testnet faucet instead provides test coins with no real-world value. Before spending time or sharing data, identify which network and asset the service uses, whether the balance can be withdrawn and whether the claim requires an upfront payment. A counter on a website is not proof that bitcoin reached your wallet.",
  facts: [
    "Mainnet bitcoin and development-network test coins are different assets.",
    "Bitcoin's developer documentation describes testnet satoshis as having no real-world value.",
    "A site's reward counter is different from a completed wallet receipt.",
    "Advance-payment giveaways and fake support are documented scam patterns.",
  ],
  sections: [
    {
      id: "unit",
      title: "Start with the network and the unit",
      body: "One BTC contains 100 million satoshis. A reward stated in sats is therefore a quantity of bitcoin only if the service actually owes and sends mainnet BTC. A site may instead display internal points or developer-network coins.\n\n[Bitcoin's testing documentation](https://developer.bitcoin.org/examples/testing.html) explains testnet and regtest as development environments. Free test coins let developers test transactions; they are not a route to cash gambling deposits.",
    },
    {
      id: "cost",
      title: "Calculate what a completed withdrawal would mean",
      body: "Record the withdrawal floor, your credited reward per task and any fee deducted before the payment. Divide the minimum by the reward to estimate the number of successful claims required. If either number changes, recalculate rather than assuming earlier task time guarantees payment.\n\nCompare the net amount with the time and personal data required. [Bitcoin fees](/guides/bitcoin-fees) explains the difference between a network charge and a website's own withdrawal fee.",
    },
    {
      id: "proof",
      title: "A payout claim needs a received payment",
      body: "For an on-chain payout, check the transaction and the receiving wallet on the intended network. For Lightning, verify the actual wallet receipt under the requested invoice or payment flow; [Lightning Network gambling](/guides/lightning-network-gambling) explains that separate payment system.\n\nA transaction screenshot belonging to somebody else cannot establish that your account is withdrawable. Keep your own task, balance and payment records if a dispute arises.",
    },
    {
      id: "scams",
      title: "Do not fund a prize to unlock it",
      body: "[Bitcoin.org's scam guidance](https://bitcoin.org/en/scams) describes fake giveaways that demand a smaller payment, impersonated support and malicious wallet prompts. A service asking for a seed phrase or an unexplained release payment is creating a risk beyond the value of the advertised reward.\n\nUse the [fake casino site checks](/guides/fake-casino-sites) when a faucet leads into gambling. Claims should not turn into repeated deposits to recover a balance. [Responsible gambling](/responsible-gambling) provides spending controls, and [Crypto payments](/guides/topics/crypto-payments) groups the relevant wallet and network guides.",
    },
  ],
  faqs: [
    {
      q: "Can testnet faucet coins be cashed out as bitcoin?",
      a: "They are development-network coins; Bitcoin's documentation says testnet satoshis have no real-world value.",
    },
    {
      q: "Does a faucet counter prove I own bitcoin?",
      a: "No. Verify the asset, withdrawal terms and an actual receipt in your wallet.",
    },
    {
      q: "What should I compare before completing tasks?",
      a: "The reward per successful task, withdrawal minimum, deductions and time or personal data required.",
    },
    {
      q: "Should I pay to unlock a free payout?",
      a: "An upfront release payment is a documented giveaway-scam pattern. Independently verify the request and keep wallet secrets private.",
    },
  ],
  sources: [
    {
      label: "Bitcoin Developer Guide — Testing Applications",
      url: "https://developer.bitcoin.org/examples/testing.html",
    },
    {
      label: "Bitcoin.org — Avoid Scams",
      url: "https://bitcoin.org/en/scams",
    },
  ],
  related: [
    "lightning-network-gambling",
    "crypto-casino-bonus-codes",
    "polygon-casino",
    "bitcoin-fees",
    "fake-casino-sites",
    "bitcoin-casino",
  ],
  updated: "2026-11-26",
};
