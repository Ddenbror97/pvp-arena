import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-bridge",
  cluster: "Crypto payments",
  keyword: "crypto bridge",
  secondary: ["cross chain bridge", "bridge crypto", "bridge to base", "wrap token"],
  title: "Crypto Bridge Guide: How Cross-Chain Transfers Work",
  description:
    "How a crypto bridge works, why people use one before a casino deposit, fee and contract risks, and safer ways to move USDC onto Base.",
  h1: "Crypto bridge: moving coins across chains without losing them",
  answer:
    "A crypto bridge is a service that moves value from one blockchain to another — for example Ethereum mainnet USDC to Base USDC — by locking or burning tokens on the source chain and minting or releasing them on the destination. People use a bridge when an exchange will not withdraw on the network they need. Bridges add smart-contract risk, extra fees, wrapped-token confusion and more addresses to get right. For a small PVPspinArena deposit, withdrawing USDC on Base from an exchange is usually safer than bridging.",
  facts: [
    "A bridge does not teleport the same coins; it locks or burns on one chain and releases a representation on another.",
    "Bridge smart contracts have been major hack targets; size and reputation do not make a bridge risk-free.",
    "Wrapped or bridged USDC can be a different token from native USDC on the destination chain.",
    "PVPspinArena accepts native USDC and ETH on Base, not BTC, SOL, LTC, DOGE or USDT.",
    "Withdrawals on PVPspinArena have a $250 daily limit; requests over $25 wait for review.",
  ],
  howTo: true,
  sections: [
    {
      id: "what",
      title: "What a crypto bridge is",
      body: `Blockchains do not share balances. ETH on Ethereum is not ETH on Base. USDC on Solana is not USDC on Base. A crypto bridge is the machinery in the middle: you send an asset to a contract or custodian on chain A, and you receive an asset on chain B that is supposed to be worth the same.

There are several designs (lock-and-mint, burn-and-mint, liquidity pools, official canonical bridges). As a player you do not need the white paper. You need to know that **two transactions, two fees and a third-party contract** now sit between you and the casino.

Bridges are for adults who already understand wallet risk. They are not a gambling product. Using one before Jackpot, Coinflip or Roulette does not change the odds. It only changes how you fund a dollar chip.

PVPspinArena never asks you to bridge into a "site bridge address." You send USDC or ETH on Base to the deposit address on the [wallet](/wallet) page. Official-looking bridge pages in ads are a common phishing pattern. Background reading lives under [crypto payments](/guides/topics/crypto-payments).`,
    },
    {
      id: "why",
      title: "Why people bridge before a casino deposit",
      body: `The usual story: your coins are on the wrong chain.

- USDC sits on Ethereum mainnet; the casino wants Base.
- ETH is on mainnet; you want cheap gas on an L2.
- You received SOL or TRC-20 USDT and the site does not list those networks.

A bridge looks like a shortcut because you never open an exchange. For large, experienced users who already trust a specific canonical bridge, that can be true. For a $25 session, the shortcut is often more steps, more signatures and more ways to pick the wrong token.

Compare the alternative: send the asset to an exchange that already holds it, sell or [swap tokens](/guides/how-to-swap-tokens), withdraw USDC on Base. You take exchange custody risk for a short window instead of bridge-contract risk. Many people prefer that for gambling-sized amounts.

If the only problem is "I am on Ethereum and I need Base," read [Base vs Ethereum](/guides/base-vs-ethereum) before you sign a bridge approval.

### When a bridge is the honest choice

You cannot pass an exchange (banned jurisdiction, no KYC appetite, or the asset is already in self-custody and the exchange does not list that exact token). You can name the destination token. You can afford to lose the amount if the contract fails. You have time to claim on the destination chain. Those conditions together make a crypto bridge a reasonable tool.

If any condition is missing — especially "I can afford to lose this" — stop. A $40 gambling deposit is almost never worth a novel bridge you saw in a Discord screenshot.`,
    },
    {
      id: "howto",
      title: "How a bridge transfer works, step by step",
      body: `This is the generic flow. Exact buttons differ by product.

1. **Confirm the destination casino network.** For PVPspinArena that is Base, chain ID 8453, native USDC or ETH.
2. **Pick a bridge that lists that exact pair** (for example ETH mainnet → ETH on Base, or USDC mainnet → native USDC on Base).
3. **Connect the wallet on the source network** first. Approve the token spend if the bridge requires it. An approval can allow the contract to move that token later; use a limited amount when the UI allows.
4. **Enter the destination address.** Usually it is your own 0x address, the same string, on Base — **not** the casino address.
5. **Read the output token name.** You want native USDC or ETH on Base, not a randomly wrapped "USDC.e" the casino does not credit.
6. **Pay source-chain gas** to lock or swap. Wait until the bridge UI shows the destination transaction.
7. **Pay destination gas if asked** (some designs require a claim transaction on Base). Keep ETH on Base for that claim.
8. **Only then** send from your wallet to the casino deposit address on Base.

If any step shows a token you do not recognise, stop. Bridging into the casino address in step 4 is how people lose the lock transaction.`,
    },
    {
      id: "risks",
      title: "Fee and contract risks",
      body: `### Fees

You can pay: source gas, bridge spread or liquidity fee, destination gas, and then casino deposit gas. Four numbers. A $20 move can grow a $4 tail. [Gas fees explained](/guides/gas-fees-explained) covers the chain pieces.

### Contract and custody risk

Bridges hold or mint large pots. They have been stolen from. Official branding reduces phishing risk; it does not remove bug risk. If you cannot afford to lose the bridged amount, do not bridge it.

### Wrapped-token risk

The asset you receive might be a representation that trades near $1 but is not the contract the casino watches. Native USDC on Base is the token Circle issues there. A wrapped cousin can sit in the wallet looking like "USDC" and still fail the deposit watcher.

### User-error risk

Wrong destination chain, wrong recipient, approval to a fake bridge site, or closing the UI before the claim step. Explorers on both chains should show your hashes before you contact anyone.

### Phishing that copies real bridges

Search ads and social posts clone official bridge domains with extra letters or a different TLD. Bookmark the URL from the project's documentation, not from a casino comment. Check the SSL name, then check the contract address the UI asks you to approve against a source you already trust. A fake bridge that looks finished will still take a source-chain lock. There is no destination mint because there is no honest destination.

If anyone offers to "bridge for you" after you send them the coins, that is not a bridge. That is sending money to a stranger.`,
    },
    {
      id: "safer",
      title: "Safer ways to move USDC onto Base",
      body: `Ranked for a gambling-sized amount:

1. **Buy USDC on an exchange and withdraw on Base.** Fewest smart contracts. Identity checks apply. This is the default advice in the [USDC casino](/guides/usdc-casino) guide.
2. **Deposit the coin you already hold to an exchange, convert, withdraw USDC on Base.** Works for BTC, SOL, LTC, DOGE, USDT and mainnet ETH.
3. **Use a well-known canonical bridge to your own wallet, then deposit.** Acceptable if you understand approvals and native versus wrapped tokens.
4. **Use an unknown "instant bridge" from a casino comment section.** Do not.

PVPspinArena accepts on-chain Bitcoin on its own invoice. It is not a SOL, LTC, DOGE or USDT casino. Those coins have to become USDC or ETH on Base by path 2 or 3, never by sending them to the 0x deposit address. Do not send BTC to that 0x address.`,
    },
    {
      id: "example",
      title: "Worked example: $80 mainnet USDC toward a $40 session",
      body: `You hold 80 USDC on Ethereum mainnet. You want $40 on PVPspinArena.

### Exchange route

1. Send 80 USDC on mainnet to the exchange. Gas: $4.20.
2. Withdraw 42 USDC on Base ($1.00 exchange fee). Receive 41 USDC. Time: 15 minutes.
3. Deposit 40 USDC on Base. Gas: $0.02. Credit $40.00.

Rail cost about $5.22, mostly mainnet gas you could not avoid if the coins started on L1.

### Bridge route

1. Bridge 45 USDC mainnet → native USDC on Base. Bridge fee 0.15%; source gas $4.20; destination claim $0.05. Receive about 44.78 USDC.
2. Deposit 40 USDC on Base. Gas $0.02.
3. You still hold ~4.76 USDC on Base.

Rail cost similar in this snapshot, plus bridge-contract risk. If the bridge had minted a wrapped USDC the site does not list, step 2 would have failed even though the wallet showed a USDC-like token.

For $40, many people still pick the exchange because a stuck bridge is harder to unwind than a delayed withdrawal.`,
    },
    {
      id: "wrong-chain",
      title: "If funds go to the wrong chain",
      body: `Stop sending. Save both transaction hashes, the addresses and the token contracts.

- If you bridged to **Arbitrum** instead of Base, you now have an Arbitrum balance. You need another hop (exchange or a second bridge), not a casino support miracle.
- If you sent **bridged USDC** to PVPspinArena and the watcher wants **native USDC**, the deposit will not auto-credit.
- If you sent the **bridge lock** to the casino address, the bridge never received the lock and the destination mint will never happen.

Support can look up hashes. It cannot invent a credit on a chain it does not watch. Do not pay a "recovery specialist" who found you in DMs.`,
    },
    {
      id: "vs-exchange",
      title: "Bridging versus exchange withdrawal, then play",
      body: `Use a crypto bridge when you cannot use an exchange, you understand the token you will receive, and the amount is one you can stand to have stuck.

Use an exchange withdrawal when you want the fewest new contracts and a clear Base USDC or ETH output.

Then deposit on Base, wait for confirmations and two providers, and play under a dollar budget. Cashouts: $250 daily limit, review over $25, USDC or ETH on Base. Game rules are on [how it works](/how-it-works).

A bridge is a tool for crossing ledgers. It is not a faster casino and it is not a place to send your seed phrase.

### Time and attention

A bridge UI can sit on "waiting for destination" for minutes. That is normal. Closing the tab and starting a second bridge is how you double-lock funds. Leave the tab open, keep the source hash, and only open the casino when BaseScan shows the tokens in your wallet.

If you are tired or rushing to catch a Jackpot pot, do not bridge. Use an exchange withdrawal in the morning. Cross-chain machinery plus gambling urgency is a bad mix. The pot will be gone; your coins do not need to be gone too.

PVPspinArena will still be PvP Jackpot, Coinflip and Roulette tomorrow, with the same Base deposit rules. A crypto bridge is optional infrastructure, not part of the game.`,
    },
  ],
  faqs: [
    {
      q: "What does a crypto bridge do?",
      a: "It moves value between blockchains by locking or burning tokens on one chain and releasing tokens on another. It does not send the same coins through a tunnel.",
    },
    {
      q: "Should I bridge USDC to deposit on PVPspinArena?",
      a: "Only if you cannot withdraw USDC on Base from an exchange. Bridging to your own wallet, then depositing native USDC on Base, is the safer order. Do not bridge to the casino address.",
    },
    {
      q: "Why are bridges considered risky?",
      a: "They concentrate funds in smart contracts and have been hacked. You also risk receiving a wrapped token the destination will not credit.",
    },
    {
      q: "Can I bridge BTC or SOL directly into PVPspinArena?",
      a: "On-chain Bitcoin uses its own invoice. Do not bridge BTC to the Base address. The site does not accept SOL, LTC, DOGE or USDT.",
    },
    {
      q: "Who pays the fees in a bridge?",
      a: "You pay source-chain gas, any bridge fee or spread, sometimes a destination claim, and then the casino deposit gas. Read each preview.",
    },
    {
      q: "What if the bridge shows complete but the casino does not credit?",
      a: "Check that the output is native USDC or ETH on Base and that you then sent a second transfer to the deposit address from your verified wallet. The bridge arrival in your wallet is not a casino deposit.",
    },
  ],
  sources: [
    { label: "Ethereum.org — Bridges", url: "https://ethereum.org/en/bridges/" },
    { label: "L2BEAT — Bridges", url: "https://l2beat.com/bridges/summary" },
    { label: "Base documentation", url: "https://docs.base.org/" },
  ],
  related: [
    "usdc-casino",
    "bitcoin-casino",
    "solana-casino",
    "litecoin-casino",
    "dogecoin-casino",
    "sent-crypto-to-wrong-network",
  ],
  updated: "2026-09-26",
};
