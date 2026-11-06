import type { Guide } from "./types";

export const guide: Guide = {
  slug: "metamask-swap-fees",
  cluster: "Crypto payments",
  keyword: "metamask swap fees",
  secondary: ["metamask swap cost", "metamask quote and gas"],
  title: "MetaMask Swap Fees: Trading Charge, Gas and Quotes",
  h1: "MetaMask swap fees: the trading fee is only part of the quote",
  description:
    "MetaMask's standard trading fee is 0.875%, with possible discounts. Separate that fee from gas, bridge charges and price impact before confirming a swap.",
  answer:
    "MetaMask swap fees include a standard MetaMask trading charge of 0.875% under the current published fee policy, with eligible discounts possible. Network gas, bridge-provider charges and execution effects are separate. The quote shown before confirmation is the relevant price for a transaction; a remembered percentage is not its complete cost. Policy checked November 5, 2026.",
  facts: [
    "The current published standard MetaMask trading fee is 0.875%.",
    "Discount programmes can change the fee applied to an eligible trade.",
    "Gas is a network charge, separate from MetaMask's trading fee.",
    "With supported gasless swaps, network costs can be covered from the swap tokens.",
  ],
  sections: [
    {
      id: "quote",
      title: "Read the quote as several separate costs",
      body: `Compare the amount you pay with the amount you expect to receive, then inspect the network fee and any bridge-provider charge. Do not add the displayed trading fee twice if the receive quote already includes it. Price impact describes how the trade interacts with liquidity; slippage tolerance limits an acceptable execution difference, rather than naming a second fixed platform fee.

[How to swap tokens](/guides/how-to-swap-tokens) covers the transaction flow. [Gas fees explained](/guides/gas-fees-explained) covers the network portion.`,
    },
    {
      id: "gas",
      title: "Gas and approvals can change the total",
      body: `An approval and the swap can be separate on-chain transactions. Inspect each wallet prompt and its fee. The network can charge for an included transaction even if its execution reverts.

Some MetaMask routes support gasless swaps, where gas is covered from tokens being swapped. That does not make network execution free. Use the supported route's quote rather than assuming a separate native-token balance is always required or that gas has disappeared. [Token approval revocation](/guides/revoke-token-approvals) explains the permission that can remain after a trade.`,
    },
    {
      id: "example",
      title: "A trading-fee example, not a live swap quote",
      body: `At the standard 0.875% rate, a hypothetical $100 trade corresponds to an $0.875 platform fee before considering discounts and the rest of the route. It does not establish the final number of tokens received. Gas, market liquidity and any cross-chain costs still need their own quote.

Do not compare a wallet's final receive amount with an exchange's headline rate while omitting either route's additional costs. Compare equivalent asset amounts on the same destination network.`,
    },
    {
      id: "check",
      title: "Check again if the route refreshes",
      body: `A quote can refresh before signing. Recheck the destination asset, network and amount rather than confirming an old preview from memory. For a bank payout, [withdrawing from MetaMask](/guides/how-to-withdraw-from-metamask) separates Send from Sell; a swap does not by itself send currency to a bank.

The [crypto payments topic](/guides/topics/crypto-payments) groups these routes. PVPspinArena's [wallet](/wallet) instructions concern its own deposits; they do not set MetaMask's fees.`,
    },
  ],
  faqs: [
    {
      q: "What is the standard MetaMask swap fee?",
      a: "The published standard trading fee is currently 0.875%, with eligible discounts possible. Check the quote and current policy.",
    },
    {
      q: "Does that percentage include network gas?",
      a: "No. The trading fee and network fee are different components, even when a route covers gas from the tokens being swapped.",
    },
    {
      q: "Are gasless swaps free?",
      a: "No. In the supported gasless flow, network costs are covered from the swap tokens rather than disappearing.",
    },
    {
      q: "Can an approval cost money before a swap happens?",
      a: "Yes. A separately submitted approval is an on-chain transaction with its own fee. Review each prompt before signing.",
    },
  ],
  sources: [
    {
      label: "MetaMask Help — standard trading fee and gasless swaps",
      url: "https://support.metamask.io/trade/metamask-fees/",
    },
    {
      label: "Ethereum.org — transactions, nonces and confirmation",
      url: "https://ethereum.org/developers/docs/transactions",
    },
  ],
  related: ["how-to-swap-tokens", "gas-fees-explained"],
  updated: "2026-11-05",
};
