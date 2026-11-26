import type { Guide } from "./types";

export const guide: Guide = {
  slug: "xrp-casino",
  cluster: "Crypto payments",
  keyword: "xrp casino",
  secondary: ["ripple casino", "gamble with xrp", "xrp gambling sites", "xrp deposit casino"],
  title: "XRP Casino: Destination Tags and Reserve Checks",
  description:
    "Check XRP casino deposits by matching the XRP Ledger address and destination tag, then distinguish account reserves, transfer fees and casino crediting.",
  h1: "XRP casino deposits: destination tags, reserves and account credit",
  answer:
    "An XRP casino accepting native XRP needs an XRP Ledger payment to its specified address and, where required, destination tag. The tag can identify your customer account behind a shared receiving address. Network fees, ledger account reserves and a casino's deposit minimum are separate amounts. A transfer that reaches the ledger can still need operator assistance if the tag was omitted.",
  facts: [
    "Destination tags let a receiving service identify the intended customer or purpose.",
    "A shared XRP Ledger deposit address may require a tag.",
    "XRP Ledger account reserves differ from transaction fees.",
    "A wrapped XRP token on another network is not a native XRP Ledger payment.",
  ],
  sections: [
    {
      id: "tag",
      title: "The tag identifies the credit, not a second address",
      body: "The [XRPL destination-tag documentation](https://xrpl.org/docs/concepts/transactions/source-and-destination-tags) explains why exchanges and other services use tags with shared accounts. Copy the tag exactly into the dedicated field when the receiving service requires one. A note stored only in your sending app is not a destination tag.\n\nIf a payment was accepted without the expected tag, keep the transaction ID, destination and intended account details. Contact the service through its established support route; do not send a second payment to an unsolicited recovery agent.",
    },
    {
      id: "reserve",
      title: "Why the full wallet balance may not be spendable",
      body: "[XRPL's reserve documentation](https://xrpl.org/docs/concepts/accounts/reserves) describes a base reserve for an account and additional reserves for owned objects. Reserve settings can change through validator voting. A reserve is not the casino's charge for accepting your deposit.\n\nCheck your wallet's spendable amount and the recipient's minimum independently. Funding a new personal account can also require enough XRP to meet the ledger reserve.",
    },
    {
      id: "asset",
      title: "Native XRP and wrapped tokens need different routes",
      body: "A receiving screen marked XRP Ledger requires that ledger's asset and transaction format. A token carrying the XRP ticker on Ethereum or another chain has a separate contract and support policy. See [MetaMask and XRP](/guides/does-metamask-support-xrp) before interpreting an imported token as native XRP.\n\n[Creating a wallet](/guides/how-to-create-a-crypto-wallet) and [withdrawal troubleshooting](/guides/crypto-casino-withdrawals) cover the custody and service-credit stages.",
    },
    {
      id: "operator",
      title: "Do the account checks before a test payment",
      body: "Confirm the legal entity, your eligibility, minimum credit and withdrawal terms before paying. A small test is useful only if it meets the service's stated minimum; ledger acceptance alone does not prove future withdrawals will be processed.\n\nThe [Crypto payments hub](/guides/topics/crypto-payments) covers other receiving networks. Keep gambling deposits inside an affordable loss budget using [responsible gambling](/responsible-gambling); XRP's payment mechanics cannot cap losses for you.",
    },
  ],
  faqs: [
    {
      q: "Why does an XRP casino ask for a destination tag?",
      a: "A shared receiving account can use the tag to identify which customer should receive credit.",
    },
    {
      q: "What if I omitted a required tag?",
      a: "Save the accepted transaction details and contact the receiving service. Automatic account credit may fail even though the ledger accepted the payment.",
    },
    {
      q: "Is the account reserve a casino fee?",
      a: "No. It is a ledger requirement associated with the XRP account and its objects.",
    },
    {
      q: "Is wrapped XRP equivalent for deposits?",
      a: "No. Match the exact asset and network the recipient supports. A wrapped token does not arrive as native XRP.",
    },
  ],
  sources: [
    {
      label: "XRPL — Source and Destination Tags",
      url: "https://xrpl.org/docs/concepts/transactions/source-and-destination-tags",
    },
    {
      label: "XRPL — Reserves",
      url: "https://xrpl.org/docs/concepts/accounts/reserves",
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
    text: "Confirm XRP Ledger support, the destination and any required tag before sending.",
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
