import type { Guide } from "./types";

export const guide: Guide = {
  slug: "ethereum-gambling",
  cluster: "Crypto payments",
  keyword: "ethereum gambling",
  secondary: ["eth casino", "ethereum casino", "eth gambling", "ethereum gas fees"],
  title: "Ethereum Gambling Guide: ETH Fees, L2s and Risk",
  description:
    "How ethereum gambling works: ETH deposits, gas fees, layer-2 networks like Base, confirmation times, and why mainnet is often the expensive path.",
  h1: "Ethereum gambling: ETH deposits, gas and layer-2 networks",
  answer:
    "Ethereum gambling means funding a casino with ETH or with tokens that live on Ethereum-style networks. On Ethereum mainnet, every send pays a gas fee that can dwarf a small bet. Layer-2 networks such as Base use ETH for gas too, but typically cost cents instead of many dollars. Confirmations are faster on those rollups. PVPspinArena accepts ETH and USDC on Base, not ETH on Ethereum mainnet. Sending mainnet ETH to a Base deposit address is a wrong-network transfer and will not credit.",
  facts: [
    "Ethereum mainnet gas is paid in ETH and can cost several dollars for a simple transfer when the chain is busy.",
    "Base, Arbitrum, Optimism and other layer 2s also use ETH for gas, usually at a much lower dollar price.",
    "A 0x address looks the same on mainnet and on Base; the chain you select in the wallet is what matters.",
    "PVPspinArena accepts ETH and USDC on Base, not Ethereum mainnet ETH. On-chain Bitcoin is a separate deposit.",
    "Withdrawals on PVPspinArena have a $250 daily limit; requests over $25 wait for review.",
  ],
  howTo: true,
  sections: [
    {
      id: "what-is",
      title: "What ethereum gambling means",
      body: `Ethereum gambling is not one product. It is a family of deposit rails that share 0x addresses and ETH-denominated gas.

- **Mainnet ETH casinos** ask you to send ETH on Ethereum (chain ID 1).
- **Token casinos on mainnet** ask for USDC, USDT or another ERC-20 on Ethereum.
- **Layer-2 casinos** ask for ETH or tokens on Base, Arbitrum, Optimism or another rollup.

The wallet screen can look identical. The network dropdown is the whole game. Ethereum gambling for adults 18 or over still needs a budget, honest cashout rules and a clear house or PvP fee. Cheap gas does not make a bet safer.

PVPspinArena is PvP Jackpot, Coinflip and Roulette. It takes **ETH on Base** and **USDC on Base**. It also accepts on-chain Bitcoin. It is not a SOL, LTC, DOGE or USDT casino, and it is not a mainnet-ETH casino. This guide is how ETH deposits, gas and layer 2s work, and how to deposit here without paying mainnet prices. The rest of the cluster is under [crypto payments](/guides/topics/crypto-payments).`,
    },
    {
      id: "mainnet",
      title: "ETH deposits on Ethereum mainnet",
      body: `On mainnet, you send ETH from a wallet to the casino's 0x address while the wallet network is set to Ethereum. Miners (now validators) include the transaction in a block. A site may wait for a handful of mainnet confirmations — often a minute or two in clock time, longer if it is conservative.

### Why this path is expensive for small bets

Gas is the fee for computation and storage on Ethereum. A simple ETH transfer is one of the cheaper mainnet actions, and it can still be $2, $8 or more when many people are using the chain. An ERC-20 token transfer costs more gas than a plain ETH send. If you planned a $15 session, a $7 fee to arrive and another fee to leave can be the largest cost you pay.

### When mainnet still makes sense

Large transfers, settlement that must live on L1, or a casino that truly only watches chain ID 1. For everyday ethereum gambling stakes, a layer 2 is usually the rational rail. Compare the two in [Base vs Ethereum](/guides/base-vs-ethereum).`,
    },
    {
      id: "gas",
      title: "Gas fees on Ethereum, in practice",
      body: `Gas has two parts people mix up.

- **Gas used**: how much work the transaction did. An ETH send uses 21,000 gas. Token transfers use more.
- **Gas price**: how much you pay per unit, in gwei, which rises with demand.

You pay **gas used × gas price** in ETH. The dollar cost is that ETH amount times the ETH price. Nobody at the casino "sets your gas" when you deposit from your own wallet. You (or the wallet's estimator) set it. The casino pays gas when it sends a withdrawal.

[Gas fees explained](/guides/gas-fees-explained) is the plain-language version. The gambling-specific point is simple: if the fee is a large fraction of the deposit, you picked the wrong network or the wrong moment.

EIP-1559 also burns a base fee and pays a tip to validators. You do not need the mechanism to make a good decision. You need a fee preview in the wallet before you hit confirm.

### Reading a wallet fee preview

Most wallets show a dollar estimate and a wait time (slow, market, fast). For a casino deposit, market is usually enough on Base. On mainnet, "fast" during a busy NFT launch is how a $20 plan becomes a $12 arrival. If the estimate is more than about 10% of the deposit, change network or wait. You can also lower the max fee on advanced settings, but if you set it below the current base fee the transaction will sit pending. Pending is not credited. Canceling a pending mainnet send can cost a second gas payment. That is another reason small sessions belong on Base.`,
    },
    {
      id: "l2",
      title: "Layer-2 networks like Base",
      body: `A layer 2 processes transactions off Ethereum's crowded main chain and posts data back to Ethereum. You still use an 0x wallet. You still pay gas in ETH. The ETH has to be **on that layer 2**.

### Base in one paragraph

Base is an optimistic rollup incubated by Coinbase. Chain ID 8453. Blocks are about two seconds. Circle issues native USDC on Base. PVPspinArena settles here. See the [Base network](/guides/base-network) guide for architecture.

### Other L2s

Arbitrum, Optimism, zkSync and others exist. A deposit of ETH on Arbitrum is **not** a deposit of ETH on Base. Same address format, different ledger. Exchanges list these as separate withdrawal networks. Pick the one the casino named.

### ETH on Base versus USDC on Base

Both are accepted on PVPspinArena. USDC credits one-for-one into a dollar ledger. ETH is converted to a dollar amount at the moment of credit, then no longer tracks ETH. You still need a little ETH on Base in the wallet to pay gas for the USDC send.`,
    },
    {
      id: "howto-deposit",
      title: "How to deposit ETH on Base, step by step",
      body: `This is the path that matches PVPspinArena.

1. **Install or open an EVM wallet** such as MetaMask. Add Base (chain ID 8453) if it is not already listed.
2. **Get ETH on Base**, not on Ethereum mainnet. Withdraw ETH from an exchange choosing the Base network, or move ETH through a reputable bridge if you understand the extra risk.
3. **Optional: get USDC on Base** if you prefer a stable chip. Many people deposit USDC and keep only a few dollars of ETH for gas.
4. **Open your PVPspinArena profile**, connect the wallet and sign the verification message. The signature cannot move funds.
5. **Copy the deposit address** from the [wallet](/wallet) page. Confirm the page says Base.
6. **Send ETH on Base** (or USDC on Base) from that same verified address. In the wallet, the network selector must say Base before you confirm.
7. **Wait for the site's confirmations** and dual-provider check. A typical credit is a minute or two after the Base transaction is safe.
8. **Play only after the balance updates.** Open [Coinflip](/coinflip) or another listed game when the credit notice is on screen.

If the wallet is still on Ethereum mainnet, stop. Changing the destination address is not enough. Change the network.

### Checks after you press confirm

- The wallet activity tab should say Base, not Ethereum.
- A Base explorer should show the hash within a few seconds.
- The token should be ETH or native USDC, not a random ERC-20 you swapped by mistake.
- The amount leaving the wallet should match the amount you typed. A second popup for a token approval is not required for a plain deposit on this site. If you see an unlimited approval, you are not on the deposit flow — cancel.

Keep a written note of the hash until the credit notice appears. If you switch browser tabs and lose the wallet popup result, the explorer is the source of truth, not your memory of the dollar amount.`,
    },
    {
      id: "example",
      title: "Worked example: $20 of play, mainnet versus Base",
      body: `ETH is $3,200 in this example. You want $20 of play plus room for fees.

### Expensive path (mainnet ETH to a mainnet casino)

You send 0.008 ETH ($25.60) on Ethereum. Gas is 21,000 × 25 gwei = 0.000525 ETH ($1.68). The casino credits 0.008 ETH. If ETH dips 3% before you play, the dollar chip is already lighter. A later withdrawal pays mainnet gas again from the casino's side and may take a larger minimum.

### Intended path (PVPspinArena)

You withdraw 22 USDC and 0.004 ETH on **Base** from an exchange. Withdrawal fees: $1.00 on USDC, $0.50 on ETH. You receive 21 USDC and about 0.0038 ETH.

You deposit 20 USDC on Base. Gas: 0.000004 ETH ($0.01). The site credits $20.00. Leftover ETH stays in the wallet for a later cashout send if you move leftover USDC elsewhere.

| Path | Fee to move ~$20 | Clock | Price risk after credit |
| --- | --- | --- | --- |
| ETH on Ethereum mainnet | Often $1–$15+ | Minutes | ETH still moves if balance stays in ETH |
| ETH on Base, then converted | Cents | About a minute | Dollar amount fixed at credit |
| USDC on Base | Cents | About a minute | Dollar chip |

Mainnet is often the expensive path because the gas is large relative to a small stake, not because Ethereum is "broken."`,
    },
    {
      id: "wrong-network",
      title: "Risks of sending on the wrong network",
      body: `The 0x address that holds your ETH on mainnet is the same string as your Base address. Funds do not follow the string across chains by magic. They sit on the chain you broadcast to.

### Failures that look successful

- Exchange withdrawal set to **Ethereum**; casino watches **Base**. Explorer on etherscan.io shows success. BaseScan shows nothing.
- Wallet network set to **Ethereum**; you paste the Base deposit address. You paid mainnet gas to a key that may or may not be controlled on L1.
- You bridge to **Arbitrum** and then send to a **Base** casino address.

Recovery is a support process with no promise. Do not send a second transaction to "push" the first.

Read the [USDC casino](/guides/usdc-casino) deposit rules: verified sender, Base only, two providers. The same discipline applies to ETH on Base.

### How to talk to support without making it worse

Send the Base transaction hash, the sending address, the amount, and the UTC time. Do not send a seed phrase, a screenshot of a mainnet explorer without saying it is mainnet, or a second transfer "to get attention." If the first send was on chain ID 1, say so immediately. Honesty about the network is faster than hoping the site will notice ETH on the wrong ledger.

If you used a bridge and the claim on Base never happened, that is a bridge-support problem until the tokens sit in your Base wallet. The casino cannot credit a balance it has not received.`,
    },
    {
      id: "pvp",
      title: "ETH on PVPspinArena after it credits",
      body: `Once ETH or USDC credits, your balance is in dollars. Games are Jackpot, Coinflip and Roulette. Platform fees, if any, appear before you join. Withdrawals: $250 daily limit, review over $25, USDC or ETH out on Base.

### After the session

If you withdraw ETH on Base, the dollar amount you requested is sent as ETH at send time. If you withdraw USDC, you get USDC. Either way you are back in a wallet, not in a casino ledger. Move leftover funds off the gaming wallet if you do not plan to play again soon.

If you still hold mainnet ETH you never meant to gamble with, leave it there. Do not "clean it up" by bridging a tiny leftover that costs more in gas than it is worth.

Ethereum gambling on mainnet is a valid rail for sites that actually watch chain ID 1. For this site, mainnet is the wrong network and the expensive habit. Use Base, keep a little ETH for gas, and prefer USDC if you want the session to stay a dollar session.

### A note on speed and chasing

Layer-2 confirmations are fast enough that you can deposit, lose, and deposit again in a few minutes. That is a feature of the rail and a risk for the budget. Set the refill rule before the first pot: for example, one deposit per day, or no deposit after a loss limit. Cheap gas should not become cheap excuses.`,
    },
  ],
  faqs: [
    {
      q: "Does PVPspinArena accept ETH on Ethereum mainnet?",
      a: "No. Send ETH or USDC on Base only. Mainnet ETH to the deposit address will not credit through the automatic system.",
    },
    {
      q: "Why is ethereum gambling on mainnet expensive for small bets?",
      a: "Gas is paid in ETH at mainnet prices. A transfer can cost several dollars, which is a large tax on a $10 or $20 deposit.",
    },
    {
      q: "Do I pay gas in USDC on Base?",
      a: "No. Base gas is paid in ETH. Keep a small ETH balance on Base even if you deposit USDC.",
    },
    {
      q: "How long does an ETH deposit on Base take?",
      a: "The chain confirms in seconds. The site still waits for its confirmation policy and two data providers, usually about a minute or two after a healthy transfer.",
    },
    {
      q: "If I deposit ETH, does my balance keep moving with the ETH price?",
      a: "Not after credit. PVPspinArena converts ETH to a dollar amount when it credits, then keeps the ledger in dollar cents.",
    },
    {
      q: "What is the withdrawal limit?",
      a: " $250 per day. Requests over $25 are reviewed. Payouts are USDC or ETH on Base, not mainnet.",
    },
  ],
  sources: [
    { label: "Ethereum.org — Gas and fees", url: "https://ethereum.org/en/developers/docs/gas/" },
    { label: "Ethereum.org — Layer 2", url: "https://ethereum.org/en/layer-2/" },
    { label: "Base documentation", url: "https://docs.base.org/" },
    { label: "Etherscan gas tracker", url: "https://etherscan.io/gastracker" },
  ],
  related: [
    "usdc-casino",
    "gas-fees-explained",
    "crypto-bridge",
    "bitcoin-casino",
    "solana-casino",
  ],
  updated: "2026-09-26",
};
