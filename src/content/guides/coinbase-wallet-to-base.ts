import type { Guide } from "./types";

export const guide: Guide = {
  slug: "coinbase-wallet-to-base",
  cluster: "Crypto payments",
  keyword: "coinbase wallet to base",
  secondary: ["move funds to base", "coinbase to base network", "base deposit from exchange"],
  title: "Coinbase Wallet to Base: Move Funds | PvP Spin Arena",
  description:
    "Two safe routes get funds from Coinbase onto Base. Step-by-step instructions, fee comparison, and what to do after a wrong-network send.",
  h1: "Coinbase Wallet to Base: Moving Funds Without Losing Them",
  answer:
    "Coinbase Wallet to Base usually means either withdrawing crypto from Coinbase on the Base network directly into your self-custody address, or moving assets on another network and bridging them to Base. Pick the network in the withdrawal dropdown with care—the address string can look identical across chains while the funds do not follow. No flow needs your seed phrase.",
  facts: [
    "Direct Base withdrawal from Coinbase is usually simpler than bridging.",
    "The same 0x address can exist on many chains; the network choice is the send.",
    "Coinbase exchange and Coinbase Wallet app are related but not identical products.",
    "Wrong-network sends are difficult or impossible to reverse.",
    "PVPspinArena credits Base USDC or ETH from your verified self-custody address.",
  ],
  howTo: true,
  sections: [
    {
      id: "two-ways",
      title: "Two ways to get funds onto Base",
      body: "**Route A — Direct withdrawal to Base.** If Coinbase lists Base for your asset, withdraw USDC or ETH on Base to your MetaMask (or other) address.\n\n**Route B — Withdraw on mainnet (or another chain), then bridge.** Use only when Base withdrawal is unavailable.\n\nSee [crypto payments](/guides/topics/crypto-payments). Adults 18+. Related reads: [coinbase to MetaMask transfer](/guides/coinbase-to-metamask-transfer), [coinbase wallet casino](/guides/coinbase-wallet-casino), [base network](/guides/base-network).",
    },
    {
      id: "direct",
      title: "Direct withdrawal to Base",
      body: "1. In Coinbase, choose Send / Withdraw.\n2. Select the asset (USDC or ETH for PVPspinArena play).\n3. Paste your self-custody address.\n4. Explicitly select **Base** as the network.\n5. Send a tiny test first.\n6. Confirm receipt on Base in your wallet and an explorer.\n7. Then send the rest.\n\nFees are whatever Coinbase shows that day—they move. Compare to bridging costs before you choose Route B out of habit.",
    },
    {
      id: "bridge-path",
      title: "Bridging from mainnet",
      body: "If you already withdrew to Ethereum mainnet, use an official Base bridge flow with a bookmarked URL. Pay mainnet gas, wait, confirm on Base. Conceptual background: [crypto bridge](/guides/crypto-bridge).\n\nNever “validate” a phrase to speed a bridge. Hardware wallets should show destination details you recognise.",
    },
    {
      id: "dropdown",
      title: "Picking the right network in the dropdown",
      body: "The dropdown is the whole game. Base, Ethereum, Arbitrum and others can share address formats. Sending USDC on Ethereum to an address you only monitor on Base will not credit a Base cashier.\n\nRead the network name aloud before you confirm. If Coinbase warns about compatibility, believe the warning.",
    },
    {
      id: "fees",
      title: "Fees compared",
      body: "Direct Base withdrawal: Coinbase withdrawal fee (if any) + negligible Base receive side.\n\nMainnet withdrawal + bridge: Coinbase fee + mainnet gas + bridge time + later Base gas.\n\nWhen both exist, direct Base usually wins on complexity even if fees look similar. Live quotes beat this paragraph.",
    },
    {
      id: "wrong-network",
      title: "What to do if you pick the wrong network",
      body: "1. Stop sending more.\n2. Note tx hash, asset, source network and destination address.\n3. Check whether the destination chain received the funds in an explorer.\n4. Contact Coinbase support with the hash if the mistake was on their withdrawal UI.\n5. Do not pay “recovery” freelancers who need your seed.\n\nSome wrong-network sends are unrecoverable. Prevention is the real fix.",
    },
    {
      id: "confirm",
      title: "Confirming the deposit",
      body: "On Base, verify balance. For PVPspinArena: sign in, verify wallet with a message signature, send a normal USDC or ETH transfer to the address on the real [wallet](/how-it-works#wallet) page. No token approval required.\n\nThen play only what you budgeted on [Coinflip](/coinflip) or other listed games. Arrival success ≠ edge-free games.\n\nThe network dropdown is the transaction. Same address bytes on the wrong chain will not credit a Base cashier.",
    },
  ],
  faqs: [
    {
      q: "Is Coinbase Wallet the same as the Coinbase exchange app?",
      a: "They are related Coinbase products with different custody models. Exchange withdrawals send to an address you specify; the Wallet app is self-custody. Read which one you are using.",
    },
    {
      q: "Can I withdraw USDC on Base from Coinbase?",
      a: "Often yes when Coinbase lists Base for that asset. Confirm in the network dropdown at send time.",
    },
    {
      q: "Why did my Coinbase send not show in MetaMask?",
      a: "Usually wrong network selected in MetaMask, or the withdrawal used a different chain than you are viewing.",
    },
    {
      q: "Does moving to Base require sharing my seed?",
      a: "No. Only sign transactions or approve withdrawals inside official apps.",
    },
    {
      q: "How does PVPspinArena fit in?",
      a: "After funds are on Base in your wallet, verify the address and transfer USDC or ETH normally. The site matches deposits from that address.",
    },
  ],
  sources: [
    {
      label: "Coinbase Help — Send and receive crypto",
      url: "https://help.coinbase.com/en/coinbase/trading-and-funding/sending-or-receiving-cryptocurrency/how-to-send-and-receive-cryptocurrency",
    },
    { label: "Base Docs — Bridging", url: "https://docs.base.org/chain/bridges-mainnet" },
  ],
  related: [
    "coinbase-to-metamask-transfer",
    "coinbase-wallet-casino",
    "base-network",
    "crypto-bridge",
  ],
  updated: "2026-11-26",
};
