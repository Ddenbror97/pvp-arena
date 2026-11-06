import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-send-crypto",
  cluster: "Crypto payments",
  keyword: "how to send crypto",
  secondary: ["send cryptocurrency", "crypto transfer steps"],
  title: "How to Send Crypto Without the Usual Mistakes",
  h1: "How to Send Crypto Without the Usual Mistakes",
  description:
    "How to send crypto: match the asset and network, check the address on a trusted screen, and save the hash before you close the wallet.",
  answer:
    "How to send crypto safely starts with the recipient's exact asset, network and address. In an EVM wallet such as MetaMask, select that network and token, enter the destination and amount, review the network fee, then confirm. A matching address format alone does not prove the receiving service supports the chain. Bitcoin and other non-EVM transfers need their own compatible wallet and destination.",
  facts: [
    "The destination service must support the chosen asset and network.",
    "The wallet preview shows the amount and network fee before signing.",
    "A transaction hash lets you check the transfer on the correct network's explorer.",
    "A confirmed transfer and a service credit are different events.",
  ],
  sections: [
    {
      id: "destination",
      title: "Start with the receiving instructions",
      body: `For an exchange or other custodial service, open its deposit screen and copy the address for the supported asset and network. Include a memo or tag if that service requires one. For a wallet you control, confirm which account and network should receive the funds.

[Wallet addresses](/guides/what-is-a-crypto-wallet-address) explains address formats. [Wrong-network transfers](/guides/sent-crypto-to-wrong-network) explains why an address match is not the same as a network match.`,
    },
    {
      id: "send",
      title: "Review and sign the transfer",
      body: `1. Select the sending account, network and asset.
2. Enter the receiver and the amount.
3. Review the network fee and destination before confirming.
4. For an unfamiliar route, send a small test that still meets the receiver's stated minimum.
5. Check that the test is actually credited before sending more.

MetaMask supports alternative-token gas payment on some networks. Other routes need the native fee token. Read the supported fee option in the wallet instead of assuming the same requirement on every chain.`,
    },
    {
      id: "track",
      title: "Keep the transaction hash and check the right explorer",
      body: `An explorer for the wrong chain cannot establish what happened to a transfer. Check the network, sender, recipient, token and status together. An exchange may wait for further confirmations or apply its own deposit checks after an on-chain success.

[Stuck crypto transactions](/guides/stuck-crypto-transaction) covers a pending broadcast. Do not submit a duplicate payment simply because a receiver has not credited the first one yet.`,
    },
    {
      id: "cashier",
      title: "Use the current cashier address",
      body: `A payment from a service and a deposit into that service are different directions. Use the active deposit instructions rather than reusing the address that sent a previous payout. PVPspinArena's [wallet](/wallet) provides its current cashier details.

See [crypto payments](/guides/topics/crypto-payments) for related guides. A legitimate transfer does not require giving a recipient or support agent your recovery phrase.`,
    },
  ],
  faqs: [
    {
      q: "Can I send a token on any network with the same address?",
      a: "No. The receiving wallet or service must support the selected chain and asset. Similar address formats are not proof of support.",
    },
    {
      q: "Do I always need a separate native-token balance for gas?",
      a: "Many routes require it, but some wallets and networks support alternative-token or sponsored fee payment. Use the option shown for the actual transfer.",
    },
    {
      q: "Does confirmed mean a casino or exchange credited me?",
      a: "Not necessarily. It establishes the chain transaction's result; the service may have additional confirmation and crediting requirements.",
    },
    {
      q: "What should I save after sending?",
      a: "Keep the asset, network, recipient, amount and transaction hash so the transfer can be checked without revealing private keys.",
    },
  ],
  sources: [
    {
      label: "MetaMask Help — sending tokens and paying network fees",
      url: "https://support.metamask.io/manage-crypto/move-crypto/send/how-to-send-tokens-from-your-metamask-wallet",
    },
    {
      label: "Ethereum.org — transactions, nonces and confirmation",
      url: "https://ethereum.org/developers/docs/transactions",
    },
  ],
  related: ["gas-fees-explained", "stuck-crypto-transaction"],
  updated: "2026-11-05",
};
