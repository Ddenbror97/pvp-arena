import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-withdraw-from-metamask",
  cluster: "Crypto payments",
  keyword: "how to withdraw from metamask",
  secondary: ["send crypto from metamask", "metamask to exchange withdrawal"],
  title: "How to Withdraw from MetaMask: Send or Sell",
  h1: "How to withdraw from MetaMask: crypto transfers and bank cash-outs",
  description:
    "Withdraw crypto from MetaMask by sending to a supported wallet or exchange, or sell through an available provider. Check networks, fees and cash-out status.",
  answer:
    "How to withdraw from MetaMask depends on the destination: use Send to transfer crypto to a wallet or an exchange, or use Sell through an available provider to convert supported assets into currency for a bank account. A wallet transfer and a bank cash-out are different processes. Available sell providers, assets and regions vary; check the current quote rather than assuming every token can be paid directly to a bank.",
  facts: [
    "Send moves crypto to an address on the selected network.",
    "Sell uses an external provider and is available only for supported regions and assets.",
    "An exchange deposit must support the exact asset and network.",
    "A casino cashout is a payment from the operator, not a send from your MetaMask account.",
  ],
  sections: [
    {
      id: "send",
      title: "Send crypto to another wallet or an exchange",
      body: `Open the recipient's deposit instructions first. Select the supported network and asset in MetaMask, enter the destination and amount, and review the network fee before confirming. For a new destination, make a small test that also meets any receiving minimum. Save its transaction hash.

An exchange accepting a token on Ethereum does not necessarily accept it on Base. [How to send crypto](/guides/how-to-send-crypto) covers the transfer steps; [wrong-network transfers](/guides/sent-crypto-to-wrong-network) covers an error after sending. Network confirmation also does not prove an exchange has finished its own crediting checks.`,
    },
    {
      id: "sell",
      title: "Sell to currency where a provider is available",
      body: `MetaMask's Sell feature presents provider quotes for the selected location and asset. The provider can require identity verification and bank details. Review the amount expected in the bank, the charges and the supported network before completing the order. A wallet connection alone does not sell anything.

If no provider is available for the location or asset, an exchange that supports both the crypto deposit and the bank withdrawal may be a separate route. Compare its own terms; do not use an unsupported-region workaround. A token swap is not a bank payout.`,
    },
    {
      id: "status",
      title: "Separate blockchain status from payment status",
      body: `For a crypto transfer, use MetaMask Activity and the explorer for the selected network. For a Sell order, retain the provider order ID and consult its order status. An on-chain confirmation and a bank credit are separate milestones.

[Crypto casino withdrawals](/guides/crypto-casino-withdrawals) applies when an operator still holds the balance. Opening Send cannot withdraw an operator balance that has not arrived in your wallet.`,
    },
    {
      id: "scope",
      title: "Keep the transfer record",
      body: `Record the asset, network, address, amount and transaction or order ID. Do not send a second payment simply because the first status has not changed. For an unresolved provider order, use that provider's official support route.

More transfer explanations are in [crypto payments](/guides/topics/crypto-payments). The [wallet](/wallet) contains PVPspinArena's own cashier instructions, not MetaMask's bank-sale terms. Never provide a recovery phrase to someone offering to accelerate a payment.`,
    },
  ],
  faqs: [
    {
      q: "Can MetaMask send money directly to my bank?",
      a: "Its Sell feature can use a provider to convert supported crypto to currency for a bank account, where that region and asset are supported. Send by itself is a crypto transfer.",
    },
    {
      q: "Is a swap the same as withdrawing to a bank?",
      a: "No. A swap exchanges assets. A bank cash-out requires a supported sale and payment provider, or a separate exchange withdrawal.",
    },
    {
      q: "Why is a confirmed transfer missing from my exchange balance?",
      a: "Check the deposit network, asset and address against the exchange's instructions, then its confirmation and crediting requirements. A blockchain success status is not the same as an exchange credit.",
    },
    {
      q: "Does MetaMask control a casino withdrawal queue?",
      a: "No. The operator must first send its payment. Use the operator's request ID until a transaction hash or payment record is available.",
    },
  ],
  sources: [
    {
      label: "MetaMask Help — sending tokens and paying network fees",
      url: "https://support.metamask.io/manage-crypto/move-crypto/send/how-to-send-tokens-from-your-metamask-wallet",
    },
    {
      label: "MetaMask Help — selling crypto for currency through providers",
      url: "https://support.metamask.io/manage-crypto/move-crypto/sell/how-to-sell-your-crypto-assets-for-fiat-currency-in-metamask/",
    },
    {
      label: "Ethereum.org — transactions, nonces and confirmation",
      url: "https://ethereum.org/developers/docs/transactions",
    },
  ],
  related: ["crypto-casino-withdrawals", "coinbase-to-metamask-transfer"],
  updated: "2026-11-05",
};
