import type { Guide } from "./types";

export const guide: Guide = {
  slug: "stuck-crypto-transaction",
  cluster: "Crypto payments",
  keyword: "crypto transaction stuck",
  secondary: ["pending transaction stuck", "speed up transaction", "cancel pending tx"],
  title: "Stuck Crypto Transaction: How to Fix It | PvP Spin Arena",
  description:
    "A pending deposit is usually fixable. How to tell pending from dropped, speed up or replace a transaction, and handle nonce and network mistakes.",
  h1: "Stuck Crypto Transaction: How to Unstick a Deposit",
  answer:
    "A crypto transaction stuck in pending usually means the network has not included your transfer yet—often because gas is too low, the mempool is busy, or a nonce is blocking later sends. Distinguish pending, dropped and failed, then speed up or replace carefully. Wrong-network sends are a different failure mode and are often unrecoverable.",
  facts: [
    "Pending means broadcast but not yet mined or confirmed.",
    "Dropped means nodes forgot it; you may need to resend.",
    "Failed means it was included but reverted—gas was still spent.",
    "Nonce gaps can freeze an entire wallet queue.",
    "Casino credit waits on chain confirmation plus their matcher—not vibes.",
  ],
  sections: [
    {
      id: "why",
      title: "Why transactions stall",
      body: `Blockchains order transactions by fees and protocol rules. If your max fee sits below what validators or sequencers demand, you wait. L2s like Base are usually fast, but they still stall when you underpay or when a previous nonce never lands.

This troubleshooting page sits in [crypto payments](/guides/topics/crypto-payments). Adults 18+. See [gas fees explained](/guides/gas-fees-explained) and [crypto casino deposit fees](/guides/crypto-casino-deposit-fees) for cost context. [Base network](/guides/base-network) covers the chain PVPspinArena uses.`,
    },
    {
      id: "states",
      title: "Pending vs dropped vs failed",
      body: `**Pending:** visible as pending in wallet/explorer; not confirmed.

**Dropped:** no longer in mempool; never confirmed; funds should still be in your address.

**Failed / reverted:** included on-chain but the call failed; gas gone; value usually returned unless the call moved it.

Read an explorer, not only the wallet icon. Screenshots from Discord “helpers” are not status.`,
    },
    {
      id: "speed-up",
      title: "Speeding up or replacing a transaction",
      body: `Most wallets offer Speed up / Replace: same nonce, higher fee. Confirm you are on the correct network before paying more.

Cancel-by-replace sends a 0-value transfer to yourself with the same nonce and higher fee. Only do this if you understand you are racing the original.

Do not spam ten replacements at once. One careful bump beats a nonce storm.`,
    },
    {
      id: "nonce",
      title: "Nonce problems explained",
      body: `Each account’s transactions must confirm in nonce order. If nonce 41 is stuck, 42+ wait forever. Fix or cancel 41 first.

Custom nonce tools exist in advanced wallet settings. Wrong manual nonces create new stuck states. If unsure, use the wallet’s guided speed-up and support docs from the wallet vendor—not a casino DM.`,
    },
    {
      id: "wrong-network",
      title: "Wrong-network sends",
      body: `If you intended Base but signed on Ethereum (or the reverse), speeding up will not move it to the other chain. Check the explorer network.

Recovery options are limited. Document the hash. Contact the sending exchange if they executed the wrong network. Ignore seed-phrase “recovery” freelancers.

[Add Base network to MetaMask](/guides/add-base-network-metamask) before the next attempt.`,
    },
    {
      id: "gone",
      title: "When funds are genuinely gone",
      body: `Funds are gone when a confirmed transfer left your address to a destination you do not control—or when you signed a malicious approval that later drained tokens. A long pending state is not “gone” yet.

If drained via approval, revoke remaining allowances, move leftovers to a fresh wallet, and treat the old phrase as burned if it was ever phished.`,
    },
    {
      id: "prevent",
      title: "Preventing it next time",
      body: `1. Use wallet fee suggestions; add buffer when urgent.
2. One transfer at a time until confirmed.
3. Verify network name every signature.
4. Test-deposit small to PVPspinArena’s [wallet](/wallet) address first.
5. Keep Base ETH for gas so USDC sends do not stall for lack of fee token.

Stuck deposits do not change game outcomes on [fairness](/fairness)—they only delay credit.

Fix the oldest stuck nonce first. Wrong-network sends are not cured by speed-ups.

How many blocks a cashier waits for is [blockchain confirmations](/guides/blockchain-confirmations). A transfer that left on the wrong chain is [sent crypto to the wrong network](/guides/sent-crypto-to-wrong-network). A casino that has not approved a cashout yet is [casino withdrawal pending](/guides/casino-withdrawal-pending).`,
    },
  ],
  faqs: [
    {
      q: "How long should I wait before speeding up?",
      a: "If the wallet estimate is minutes and you have waited several times that with no confirmation, check an explorer and consider a fee bump. Instant panic replacements cause nonce messes.",
    },
    {
      q: "Will PVPspinArena credit a pending transaction?",
      a: "Credit follows confirmed Base transfers from your verified address. Pending is not confirmed.",
    },
    {
      q: "Why are later transactions stuck too?",
      a: "Usually an earlier nonce is still pending. Fix the oldest stuck tx first.",
    },
    {
      q: "Can support reverse a wrong-network send?",
      a: "Often no. Exchanges sometimes help for their own mistakes; self-custody mistakes are frequently final.",
    },
    {
      q: "Is a failed transaction a lost deposit?",
      a: "Failed/reverted calls usually return the value but consume gas. Confirm on an explorer before resending.",
    },
  ],
  sources: [
    {
      label: "MetaMask — User guide: transactions and gas",
      url: "https://support.metamask.io/transactions-and-gas/",
    },
    {
      label: "MetaMask — How to speed up or cancel a transaction",
      url: "https://support.metamask.io/transactions-and-gas/transactions/how-to-speed-up-or-cancel-a-pending-transaction/",
    },
  ],
  related: [
    "gas-fees-explained",
    "crypto-casino-deposit-fees",
    "base-network",
    "add-base-network-metamask",
    "blockchain-confirmations",
    "sent-crypto-to-wrong-network",
    "casino-withdrawal-pending",
    "how-to-send-crypto",
  ],
  updated: "2026-11-05",
};
