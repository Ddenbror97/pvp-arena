import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-swap-tokens",
  cluster: "Crypto payments",
  keyword: "how to swap tokens",
  secondary: ["token swap", "uniswap swap", "swap usdt to usdc", "dex slippage"],
  title: "How to Swap Tokens: DEX Steps, Slippage and Fees",
  description:
    "How to swap tokens before a casino deposit: DEX versus exchange, slippage, approvals, bridging risk, and a safer route to USDC on Base.",
  h1: "How to swap tokens without overpaying or picking the wrong chain",
  answer:
    "How to swap tokens before a casino deposit: pick the chain you will actually use, choose an exchange or a DEX, set slippage, read the approval and confirm the output token. A swap does not move you to another network by itself. If you hold USDT on Ethereum and need USDC on Base for PVPspinArena, you still have a bridge or a withdrawal after the swap. Wrong-chain USDC is a failed deposit, not a bad price.",
  facts: [
    "A swap trades one token for another on the same network unless you also use a bridge.",
    "DEX swaps need a token approval the first time; that allowance is a lasting permission.",
    "Slippage settings let the fill move against you; thin pools can take more than you expect.",
    "PVPspinArena accepts USDC and ETH on Base, not USDT and not Solana or mainnet USDC.",
    "Exchange conversions plus a Base withdrawal are often simpler than a DEX plus a bridge.",
  ],
  sections: [
    {
      id: "dex-vs-cex",
      title: "DEX versus exchange: which swap you want",
      body: `You can swap on a centralised exchange or on a decentralised exchange (DEX) such as Uniswap.

### Exchange conversion

You already passed KYC. You convert USDT to USDC in the account, then withdraw USDC on Base. You pay trading fees, but you avoid wallet approvals and most slippage surprises. This is the default I recommend if [how to buy USDC](/guides/how-to-buy-usdc) is still open in another tab.

### DEX swap

You keep self-custody. You connect a wallet, approve the token, swap in a pool and pay [gas fees](/guides/gas-fees-explained) in the network’s coin. You must pick the DEX that exists on the chain you are on. Uniswap on Ethereum does not output Base USDC.

### Hybrid mistakes

People swap USDT to USDC on Ethereum, then paste a Base deposit address. That is two products. The swap succeeded. The deposit cannot. Read [crypto bridge](/guides/crypto-bridge) before you treat a “swap and bridge” widget as one click.

PVPspinArena never runs your swap. Anyone who asks you to swap inside a casino pop-up and approve unlimited USDT is selling you a drain, not a conversion.

Aggregators that split a trade across several pools can look clever and still route through a fake token with the USDC name. On Base, confirm the output contract against Circle’s published address. On Ethereum, do the same before you decide to bridge. A 0.2% “better” quote is not better if the token does not redeem.

You must be 18 or older to gamble after you hold USDC. A swap is not a way to hide a deposit from yourself.`,
    },
    {
      id: "same-chain",
      title: "Same-chain DEX steps",
      body: `If you already hold a token on Base and want USDC on Base, a DEX can be enough.

1. **Switch the wallet to Base.** Confirm the chain id matches official Base docs.
2. **Open a reputable DEX** from a bookmark, not from a search ad.
3. **Select the input token and USDC** as output. Check the USDC contract is Circle’s Base USDC, not a clone ticker.
4. **Enter the amount** and read the quote, fee tier and minimum received.
5. **Set slippage** you understand. 0.5% is a common start for liquid stables. Wide settings on a thin coin are how people donate.
6. **Approve the input token** if asked. Prefer an exact or modest allowance, not unlimited, when the wallet offers the choice.
7. **Swap** and wait for the receipt. Confirm the USDC balance on a Base explorer.
8. **Revoke the allowance later** if you do not plan to swap again.

You must be 18 or older if the next step is a casino. The swap itself is just a trade.

If the wallet warns about a custom spender or an unverified token list, stop. Importing a token so the DEX can “see your USDT” is normal. Importing a token because a stranger in chat sent a contract is not.

Price impact is shown separately from slippage on many UIs. Price impact is the pool moving because of your size. Slippage is the extra room you allow. Both can stack. On a $50 stable swap, neither should look dramatic. If they do, you are in the wrong pool.`,
    },
    {
      id: "slippage",
      title: "Slippage, MEV and stable pairs",
      body: `Slippage is how far the execution price can move from the quote. On a deep USDC/ETH pool a small swap barely moves. On a meme coin the same setting can fill at a much worse rate.

For USDT to USDC on a large pool, unexpected slippage is a warning: you may be on the wrong chain, a fake USDC or a routing path through a thin hop.

### Practical settings

- Stable-to-stable on a major DEX: keep slippage tight and abort if the quote looks off by more than a few cents on a $100 trade.
- Volatile input: size down or use a limit-style tool if you have one.
- Never max-slippage “so it goes through” on a first try.

MEV searchers can sandwich loose slippage. That is another reason tight settings on liquid pairs are worth the occasional failed transaction.

Gas is separate. A failed swap can still cost ETH. That is annoying on Base and painful on Ethereum.

Deadline settings matter on busy networks. A swap that sits in the mempool past its deadline should fail rather than fill at a stale price. Do not keep raising the deadline to force a bad trade through.

If you are swapping only to pay casino gas, buy or withdraw a few dollars of ETH on Base instead. Turning a huge USDT pile into ETH “just in case” leaves you with price risk you did not need.`,
    },
    {
      id: "approvals",
      title: "Approvals are the lasting risk",
      body: `The first DEX visit asks you to approve the router to spend your USDT or ETH-wrapped token. That permission can remain after you close the tab. Unlimited allowances are convenient for the DEX and convenient for a later hack of that router or a phishing site that reuses the spender.

### Rules

- Read the spender. If you opened Uniswap, the spender should be Uniswap’s documented contract for that chain, not a random “Aggregator v9.”
- Reject approvals that appear on a site you thought was a casino verify screen. PVPspinArena uses a message signature only.
- After you have USDC, you do not need the old USDT allowance. Revoke it.
- A deposit to a [USDC casino](/guides/usdc-casino) address is a transfer, not an approval.

If a swap UI asks for your recovery phrase to “complete routing,” it is theft.

Permit signatures (typed data that sets an allowance without a separate approve transaction) can save gas and still grant a spender. Read them as approvals. PVPspinArena will not send a permit. A “casino swap” that starts with a permit is the wrong tab.

After a successful swap, wait for the wallet balance to update before you copy the casino address. Sending the input token by habit is a classic follow-up mistake.`,
    },
    {
      id: "to-base",
      title: "Getting the output onto Base for PVPspinArena",
      body: `Target state: USDC or ETH on Base in a wallet you will verify.

| You hold now | Safer next step | Avoid |
| --- | --- | --- |
| USDT on an exchange | Convert to USDC, withdraw on Base | Withdrawing USDT to the site |
| USDT on Ethereum | Convert on the exchange, or swap then withdraw/bridge to Base | Sending Ethereum USDC to the site |
| USDC on Base | Deposit from the verified wallet | Extra swaps you do not need |
| ETH on Base | Deposit ETH, or swap to USDC on Base first | Bridging ETH to Solana “because fees look low” |

Official Circle USDC on Base is the token the site expects. Bridged lookalikes can show as USDC in a wallet and still fail a naive mental check. Confirm the contract on an explorer.

After the wallet is funded, verify on the site and send from that address. Daily withdrawals later are capped at $250, with review over $25. Swapping more than you can lose is still a budget problem, not a DEX problem.

This whole path lives under [crypto payments](/guides/topics/crypto-payments). The casino does not care how you obtained USDC as long as the token, chain and sender are correct. It also will not reimburse slippage.

If you hold ETH on Base and prefer a dollar-stable balance before you deposit, swapping to USDC on Base is the clean case: same chain, no bridge. Depositing ETH directly is also valid; the site converts to a dollar figure at credit time.`,
    },
    {
      id: "worked-example",
      title: "Worked example: USDT on Ethereum to $25 credited",
      body: `You have 40 USDT on Ethereum in MetaMask and want $25 on PVPspinArena.

1. You decide the DEX-plus-bridge path is more moving parts than you want.
2. You send 40 USDT on Ethereum to an exchange that accepts ERC-20 USDT. You pay mainnet gas.
3. On the exchange you convert 40 USDT to about 39.9 USDC after the spread.
4. You withdraw 2 USDC on **Base** to MetaMask. It arrives.
5. You withdraw 30 USDC on Base. You keep a little USDC on the exchange.
6. You swap a small amount of ETH on Base only if you need gas, or you withdraw ETH on Base.
7. You verify MetaMask, deposit 25 USDC and see $25.00. You do not dump the rest into one Jackpot pot.

If you had swapped 40 USDT to USDC on Ethereum Uniswap, you would still be on Ethereum. The extra hop remains. The exchange path made the network change explicit.

Open [how it works](/how-it-works) before you size the first game. A clean swap does not improve roulette odds.

If you skip the exchange and use a bridge widget after the Ethereum swap, treat that as a second project: confirm the destination chain is Base, confirm the output is USDC, send a test, then the rest. Do not bridge directly to the casino address. Bridge to your wallet, then deposit.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `How to swap tokens safely is mostly how to stay on the right ledger. Use an exchange when you need a network change and identity is already done. Use a DEX for same-chain conversions with tight slippage and careful approvals. Land Circle USDC or ETH on Base, then deposit from a verified wallet. PVPspinArena will not swap for you and will not need a token allowance.

Treat this as part of [crypto payments](/guides/topics/crypto-payments), not as a way to manufacture an edge.

If you swap often, keep a short log: date, chain, input, output, tx hash, USDC received. That log is how you notice a fake token the second time, and how you explain a missing deposit to support without guessing. It is also how you see whether DEX fees are actually cheaper than the exchange conversion you skipped. One logged month of swaps will tell you more than a single viral “zero fee” screenshot.`,
    },
  ],
  faqs: [
    {
      q: "Does swapping USDT to USDC automatically put me on Base?",
      a: "No. A swap stays on the current chain. You still need a Base withdrawal or a bridge before a PVPspinArena deposit.",
    },
    {
      q: "What slippage should I use for USDC pairs?",
      a: "On a liquid stable pool, keep it tight, often around 0.5% or less. If the quote looks worse than a few cents per hundred dollars, stop and check the token and chain.",
    },
    {
      q: "Why does the DEX ask me to approve tokens?",
      a: "The router needs permission to pull the input token. That permission can last. Prefer a limited allowance and revoke it later.",
    },
    {
      q: "Can I swap inside PVPspinArena?",
      a: "No. Fund a wallet with USDC or ETH on Base and send a normal transfer. In-site swap pop-ups that want approvals are a warning sign.",
    },
    {
      q: "Is a DEX cheaper than an exchange conversion?",
      a: "Sometimes, on the same chain, if gas is low and the pool is deep. Once you add a bridge and a mistake fund, the exchange path is often cheaper in practice.",
    },
    {
      q: "Can I swap ETH to USDC after I already deposited ETH?",
      a: "Not on the site. Once credited, the balance is in dollars. If you want USDC in your wallet instead, withdraw later as USDC on Base, subject to limits and review.",
    },
  ],
  sources: [
    { label: "Uniswap Help Center", url: "https://support.uniswap.org/" },
    { label: "Circle — USDC", url: "https://www.circle.com/en/usdc" },
    { label: "Base documentation", url: "https://docs.base.org/" },
    {
      label: "Ethereum.org — Decentralized exchanges (DEXs)",
      url: "https://ethereum.org/en/get-eth/#decentralized-exchanges-dexs",
    },
  ],
  related: [
    "usdc-casino",
    "coinbase-to-metamask-transfer",
    "add-base-network-metamask",
    "crypto-casino-withdrawals",
    "instant-withdrawal-casino",
    "how-to-use-metamask",
    "metamask-swap-fees",
    "erc20-vs-trc20",
  ],
  updated: "2026-09-26",
  howTo: true,
};
