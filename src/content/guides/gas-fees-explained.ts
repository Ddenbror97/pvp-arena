import type { Guide } from "./types";

export const guide: Guide = {
  slug: "gas-fees-explained",
  cluster: "Crypto payments",
  keyword: "gas fees explained",
  secondary: ["what are gas fees", "ethereum gas", "base gas fees", "crypto transfer fee"],
  title: "Gas Fees Explained: Why Crypto Transfers Cost Money",
  description:
    "Gas fees explained in plain English: who you pay, why Ethereum is expensive, why Base is cheap, and how fees change a small casino deposit.",
  h1: "Gas fees explained: who you pay and how to keep them low",
  answer:
    "Gas fees explained simply: they are payments for using a blockchain's limited block space. On Ethereum and on Base you pay them in ETH to validators (and a portion can be burned). They are not a casino surcharge and they are not optional if you want the transfer included. Ethereum mainnet is often expensive because many users compete for the same space. Base is usually cheap because it is a layer 2 with more room for ordinary sends. A $12 casino deposit can be fine on Base and irrational on mainnet if gas is $6.",
  facts: [
    "Gas is a fee for computation and inclusion, priced by demand for block space.",
    "On Ethereum-style networks, including Base, you pay gas in ETH, not in USDC.",
    "A simple ETH transfer uses 21,000 gas; token transfers use more.",
    "Base gas is typically cents; Ethereum mainnet gas is often dollars.",
    "PVPspinArena deposits are on Base. Withdrawals have a $250 daily limit; amounts over $25 are reviewed.",
  ],
  sections: [
    {
      id: "what",
      title: "What gas fees are",
      body: `A blockchain cannot process an unlimited number of transactions in each block. Gas is the unit that measures how much work a transaction needs, and the gas price is what you bid so validators will include it.

On Bitcoin the similar idea is a miner fee in satoshis per virtual byte. People still say "network fee." On Ethereum and Base, the word is gas, and the asset you pay with is ETH.

Gas fees explained in a gambling context: when you deposit from your own wallet, **you** pay the chain. When the casino withdraws to you, **it** pays the chain. The site may also take a game fee from a pot. Those are three different line items. None of them is a "play for free" waiver.

This site is PvP Jackpot, Coinflip and Roulette, 18+. Deposits are USDC and ETH on Base, not BTC, SOL, LTC, DOGE or USDT. Payment explainers sit in [crypto payments](/guides/topics/crypto-payments).`,
    },
    {
      id: "who",
      title: "Who you pay",
      body: `You do not pay "Ethereum Inc." or "the casino gas department" when you confirm a wallet popup.

- **Validators** (or miners on proof-of-work chains) receive a tip for including the transaction.
- **A base fee** on Ethereum-style EIP-1559 chains is burned, which removes that ETH from supply.
- **Your wallet** may show a single "network fee" that already combines base fee and tip.

The casino does not receive your deposit gas. If a support chat asks you to send extra ETH to a different address to "cover gas for credit," that is a scam.

Exchanges charge a **withdrawal fee** that can be larger than on-chain gas. That fee is their price for operating hot wallets and hedging. Check it before you move a $20 stack.

### Gas is not a tip to the casino

Support will never need you to "prepay gas" to a personal address. The deposit is a normal transfer. The withdrawal is signed by the site's payout wallet. If gas were owed to the platform, it would appear as a published fee on the [wallet](/wallet) page, not as a chat instruction. Treat unexpected gas requests the way you treat seed-phrase requests: as theft.`,
    },
    {
      id: "ethereum",
      title: "Why Ethereum mainnet is expensive",
      body: `Ethereum mainnet is where a huge amount of trading, NFT activity and settlement happens. When many people want into the next blocks, they raise the gas price. Your simple transfer competes with complex contract calls.

### The arithmetic

Cost in ETH ≈ gas used × gas price (in gwei) / 1e9.

Example: 21,000 gas × 40 gwei = 0.00084 ETH. At $3,000 per ETH that is $2.52. An ERC-20 transfer might use ~65,000 gas: about $7.80 at the same price.

### Why small casino deposits suffer

A $15 deposit with a $6 fee has a 40% "rail tax" before you see a chip. That is why [ethereum gambling](/guides/ethereum-gambling) on mainnet is a poor fit for tiny sessions, and why [Base vs Ethereum](/guides/base-vs-ethereum) is a deposit question, not a brand question.

Mainnet is not "too expensive to exist." It is too expensive for many $10–$30 moves. Large settlements can still belong there.`,
    },
    {
      id: "base",
      title: "Why Base is cheap",
      body: `Base executes transactions on a layer 2 and posts compressed data to Ethereum. Ordinary transfers do not fight for the same scarce mainnet gas. The result is a fee that is often a few cents or less.

You still pay **ETH on Base**. USDC does not pay its own gas. A wallet that shows $50 of USDC and $0.00 of ETH on Base will fail the send until you add a little ETH on that network.

Cheap is not free. During unusual congestion, Base fees can rise. They rarely look like a busy mainnet NFT mint, but you should still read the wallet preview. Official numbers and RPCs live in [Base documentation](https://docs.base.org/).

### ETH on Base is still ETH

People buy USDC, forget gas, and assume the stablecoin will "just send." It will not. The wallet needs a separate ETH balance on the same network. A common fix is to withdraw $3 of ETH on Base from an exchange even when the chip is USDC. That $3 is not for gambling. It is for moving the chip. If you spend it all on a thoughtless extra transfer, you will be stuck again.

Do not swap all leftover ETH back to USDC after every session if you plan to play this week. You will pay another withdrawal or swap to refill gas. Leave a reserve.`,
    },
    {
      id: "example",
      title: "How fees change a small casino deposit",
      body: `You want $20 of play on PVPspinArena. ETH is $2,500. USDC is $1.

### Path A — USDC on Base (intended)

Exchange USDC withdrawal fee: $1.00. You withdraw 22 USDC, receive 21. On-chain deposit gas: 0.000008 ETH ($0.02). Site credits $20.00 after you send 20 USDC. Rail cost: about $1.02 plus leftover dust. Playable.

### Path B — ETH on Ethereum mainnet to the same 0x string

You send 0.009 ETH ($22.50) on mainnet at 50 gwei. Transfer fee: 0.00105 ETH ($2.63). The casino that watches **Base** credits $0.00. You also spent $2.63 to create a recovery problem. This is the expensive path and the wrong network.

### Path C — ETH on Base, then converted

You withdraw 0.01 ETH on Base ($25.00) with a $0.80 exchange fee. Deposit 0.0084 ETH. Gas: $0.01. Site converts at $2,500 to $21.00. Dollar amount is now fixed. Rail cost is small; you accepted ETH price risk only until credit.

| Path | Reaches PVPspinArena? | Typical rail cost on ~$20 |
| --- | --- | --- |
| USDC on Base | Yes | Exchange fee + cents |
| ETH on Base | Yes (converted) | Exchange fee + cents |
| ETH or USDC on mainnet | No | Dollars, plus recovery risk |

Buy-and-withdraw steps are in [how to buy USDC](/guides/how-to-buy-usdc).`,
    },
    {
      id: "keep-low",
      title: "How to keep gas fees low",
      body: `1. **Use the network the site named.** Here that is Base. Do not "save a click" by leaving MetaMask on Ethereum.
2. **Prefer a simple send.** Deposit is a normal USDC or ETH transfer. This site does not need a token approval to play.
3. **Do not bridge a $15 stack by default.** A [crypto bridge](/guides/crypto-bridge) has its own fees and contract risk. An exchange withdrawal to Base is often cheaper.
4. **Move a planned amount once.** Two test sends are smart the first time you use an address; six panicked retries are how fees add up.
5. **Keep a gas reserve.** A few dollars of ETH on Base covers many USDC deposits and leftover transfers.
6. **Watch exchange withdrawal prices.** They are usually the largest fee you will pay.

If the wallet estimates a fee that is a large share of the deposit, stop and check the network name before you confirm.`,
    },
    {
      id: "pvp",
      title: "Gas on PVPspinArena deposits and cashouts",
      body: `Deposits: you pay Base gas from the verified wallet. Credits wait for confirmations and two providers. Games are on [how it works](/how-it-works).

Withdrawals: the site pays Base gas to send USDC or ETH to you. You still face the $250 daily limit and review above $25. "Instant" is not the promise; a signed, recorded payout is.

Gas fees are the price of using a public chain. They are honest when they are visible. They become a trap when they are larger than the bet you meant to place. Keep them low by staying on Base and treating mainnet as a different country.`,
    },
    {
      id: "mistakes",
      title: "Fee mistakes that quietly eat a small bankroll",
      body: `Gas is easy to understand as a number and easy to mess up as a habit. These are the patterns that show up around casino deposits.

### Retrying a "stuck" send

On mainnet, a low-fee transaction can sit pending. People hit send again with a higher fee and accidentally create a second transfer. On Base this is rarer, but double-broadcasts still happen if the wallet UI is unclear. Check the pending list before you send a twin.

### Funding gas on the wrong chain

You buy $5 of ETH on an exchange and withdraw it on Ethereum because that is the default. Your Base USDC still cannot move. You now own mainnet ETH you did not need. Withdraw a smaller ETH amount on **Base** instead.

### Approving a spender "to save gas later"

Some dapps ask for unlimited token approval so the next click is cheaper. PVPspinArena deposits do not need that. An unlimited approval is extra risk for no deposit benefit. If a page asks for it, you are not on the real deposit flow.

### Bridging to save a withdrawal fee

A $1.00 exchange Base withdrawal versus a $4.00 mainnet gas plus bridge spread is not a saving. Price the whole path. Cheap gas on the destination does not erase expensive gas on the source.

### Treating gas as the house edge

Gas is a rail cost. The game still has a fee or an edge after you arrive. Paying $0.02 to deposit does not make Roulette a better bet. Keep the concepts apart when you decide whether a session is worth starting.

### Leaving dust you cannot move

If you drain USDC to $0.40 and have $0.00 ETH on Base, that $0.40 may cost more than it is worth to rescue. Plan a gas reserve so leftovers can leave. For a $20 session, keeping $1 of ETH on Base is usually enough for several sends.

Avoid those six habits and gas stays a small, visible line item instead of the thing that decided your night.

If you only remember one number, remember this: on PVPspinArena a typical Base deposit fee is cents, and a mistaken Ethereum mainnet send is dollars plus a recovery problem. Check the network name in the wallet header before you confirm. That single glance is the whole fee strategy for small PvP sessions. Then look at the dollar estimate. If it is more than a small fraction of the deposit, you are on the wrong chain or the wrong moment.

A screen can hide the gas line without deleting the fee. [Gasless transactions](/guides/gasless-transactions) mean a relayer pays and gets paid back. An [account abstraction wallet](/guides/account-abstraction-wallet) can sponsor gas and can also put a guardian or a bug between you and the coins.

Bitcoin prices fees in sat/vB, not gas; that schedule is [bitcoin fees](/guides/bitcoin-fees).`,
    },
  ],
  faqs: [
    {
      q: "What are gas fees in one sentence?",
      a: "They are the price you pay a blockchain to include your transaction in a block, usually in that chain's fee token.",
    },
    {
      q: "Who receives the gas I pay on Base?",
      a: "Validators and the EIP-1559 fee mechanism — not PVPspinArena. A chat asking you to send extra coins for gas to a new address is a scam.",
    },
    {
      q: "Why is Ethereum gas higher than Base gas?",
      a: "Mainnet block space is in heavier demand. Base is a layer 2 with capacity for ordinary transfers, so the same send usually costs cents instead of dollars.",
    },
    {
      q: "Can I pay Base gas with USDC?",
      a: "No. Keep ETH on Base to move USDC. Without ETH, the USDC sits still.",
    },
    {
      q: "Do withdrawals have gas fees too?",
      a: "Yes. The sender pays. When you withdraw from this site, the payout wallet pays Base gas. When you send to the site, you pay.",
    },
    {
      q: "How do gas fees change a $10 deposit?",
      a: "On Base they barely do. On Ethereum mainnet they can consume a large share of $10, and that mainnet send will not credit here anyway.",
    },
  ],
  sources: [
    { label: "Ethereum.org — Gas and fees", url: "https://ethereum.org/en/developers/docs/gas/" },
    { label: "Ethereum.org — Layer 2 scaling", url: "https://ethereum.org/en/layer-2/" },
    { label: "Base documentation", url: "https://docs.base.org/" },
    { label: "Etherscan gas tracker", url: "https://etherscan.io/gastracker" },
  ],
  related: [
    "usdc-casino",
    "crypto-bridge",
    "bitcoin-casino",
    "solana-casino",
    "litecoin-casino",
    "metamask-swap-fees",
    "how-to-send-crypto",
    "blockchain-confirmations",
    "bitcoin-fees",
  ],
  updated: "2026-09-26",
};
