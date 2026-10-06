import type { Guide } from "./types";

export const guide: Guide = {
  slug: "phantom-wallet-gambling",
  cluster: "Crypto payments",
  keyword: "phantom wallet",
  secondary: [
    "phantom gambling",
    "phantom solana wallet",
    "phantom deposit",
    "phantom seed phrase",
  ],
  title: "Phantom Wallet Guide: Solana Gambling Deposits",
  description:
    "How to use a Phantom wallet for gambling deposits: Solana versus other networks, approvals, seed safety, and why PVPspinArena still needs USDC on Base.",
  h1: "Phantom wallet for gambling: Solana deposits and network traps",
  answer:
    "A Phantom wallet is a self-custody app that began as a Solana wallet and now also supports Ethereum-style networks. You can use it to hold SOL, SPL tokens and, on some setups, EVM assets. For gambling, the hard part is the network: a Solana deposit will not credit a site that only watches Base. PVPspinArena accepts USDC and ETH on Base after you verify a wallet by signing a message, so Phantom on Solana is not a deposit path unless you first move value onto Base.",
  facts: [
    "Phantom is a self-custody wallet: you hold the recovery phrase, not the casino.",
    "Phantom started on Solana and later added support for other networks, including EVM chains.",
    "A token with the same ticker on Solana is not the same asset as USDC on Base.",
    "PVPspinArena credits USDC and ETH sent on Base from a wallet you verified by signing a message.",
    "No legitimate casino, wallet or support chat will ever ask for your Phantom recovery phrase.",
  ],
  sections: [
    {
      id: "what-phantom-is",
      title: "What a Phantom wallet actually is",
      body: `Phantom is a [crypto wallet for gambling](/guides/crypto-wallet-for-gambling) only in the sense that it can hold coins and send them. It is not a casino account, and connecting it does not give a site your funds. You keep the keys. The site sees a public address after you approve a connection, and it can ask Phantom to show you a signature or a transaction.

That design is useful if you already live on Solana. Many people buy SOL or Solana USDC, keep it in Phantom and look for a [Solana casino](/guides/solana-casino). The product name then becomes a trap: “I have USDC in Phantom” does not tell you which chain that USDC lives on.

### What connecting does

- It shares a public address for the network Phantom is using.
- It lets the site request a signature or a send.
- It does not move tokens by itself.

### What connecting does not do

- It does not hand over your recovery phrase.
- It does not let the site sweep your balance later.
- It does not prove you sent a deposit from that address unless the site also matches the on-chain sender.

PVPspinArena uses a signed message on an EVM wallet to verify the sender, then matches deposits to that address. If you only have Phantom set up for Solana, you still need a Base-capable wallet and USDC or ETH on Base before the [wallet page](/wallet) can credit you.

Players must be 18 or older. Treat Phantom as a payment tool, not as a way to hide play from yourself.`,
    },
    {
      id: "networks",
      title: "Solana versus Base: the network trap",
      body: `Same ticker, different ledger. USDC on Solana is an SPL token. USDC on Base is an ERC-20 token. Explorers, addresses and recovery paths differ. Sending Solana USDC to a Base deposit address, or the reverse, usually means the tokens leave your wallet and never appear on the site.

This is the main Phantom gambling mistake. The wallet UI can show “USDC” in more than one place once you add extra networks. You have to read the network label, not just the dollar amount.

| Asset you hold | Network it lives on | Will PVPspinArena credit it? |
| --- | --- | --- |
| USDC (SPL) | Solana | No. The site does not watch Solana. |
| SOL | Solana | No. |
| USDC (ERC-20) | Base | Yes, from a verified sender. |
| ETH | Base | Yes, converted to a dollar balance when credited. |
| USDC | Ethereum mainnet | No. Wrong chain, even if the address looks similar. |

### How people get stuck

- They copy a Base deposit address into Phantom while Phantom is still on Solana.
- They withdraw from an exchange to “USDC (Solana)” because that network was cheapest, then try to deposit to a Base site.
- They assume a [crypto bridge](/guides/crypto-bridge) is instant and lossless. Bridges have their own fees, delays and failure modes.

If you want to play on PVPspinArena, plan the destination first: USDC or ETH on Base. Phantom can be part of the journey, but Solana is not the destination.

This sits in the wider [crypto payments](/guides/topics/crypto-payments) cluster: the coin name is never enough without the chain name.`,
    },
    {
      id: "approvals",
      title: "Approvals, signatures and Phantom prompts",
      body: `Phantom will show several kinds of request. You should treat them as different actions, not as “the connect button.”

### Connection

A connection request lists the site origin. Check the domain against a bookmark. Fake casino pages clone logos and ask you to connect first so the next prompt looks expected.

### Message signature

A readable message that says you are verifying a wallet is the safe pattern PVPspinArena uses on EVM wallets. Signing it costs no gas and cannot transfer tokens by itself. If Phantom shows a message you cannot read, or a message that mentions spending, stop.

### Transaction

A send of SOL, SPL USDC or an EVM token is a real transfer. Read the destination, amount and network fee. On Solana, a wrong program or a malicious dapp can still drain an account if you approve a transaction you do not understand.

### Token approvals on EVM

If you use Phantom’s EVM support, an unlimited token approval is the request scammers want. A deposit to a published address does not need an approval. PVPspinArena never asks you to approve a contract to spend USDC. You send a normal transfer after a message signature.

### A working rule

If you meant to identify yourself, you should see text, not a spend cap. If you meant to deposit, you should see a transfer to an address you copied from the site, on the network the site named. Anything else is a reason to reject the prompt and leave.`,
    },
    {
      id: "seed-safety",
      title: "Recovery phrase, devices and support scams",
      body: `Phantom shows a secret recovery phrase when you create the wallet. That phrase can recreate the wallet on any device. It is the same class of secret as a MetaMask [seed phrase](/guides/seed-phrase). Anyone who has the words can empty every account derived from them.

Write the words on paper, store them offline and never type them into a website, a Discord form or a “wallet sync” page. Phantom support will not ask for the phrase. A casino will not ask for it. A Telegram admin will not ask for it. Those requests are theft.

### Practical habits

- Use a strong device passcode and the wallet’s lock timer.
- Prefer official app stores and phantom.app, not ads that look like update links.
- Keep a separate gaming account or a dedicated wallet funded only with what you can afford to lose.
- Do not screenshot the phrase or store it in cloud notes.
- If anyone offers to “fix a failed deposit” by importing your wallet, they are stealing it.

A lost phrase is not something the casino can restore. The site only sees public addresses and signed messages. If you lose Phantom access, you lose the coins still sitting in it, even if a deposit never left the wallet.`,
    },
    {
      id: "worked-example",
      title: "Worked example: from Phantom on Solana to a Base deposit",
      body: `Suppose you have 40 USDC in Phantom on Solana and you want $20 on PVPspinArena for a [Coinflip](/coinflip) game. You cannot send those 40 USDC to the site deposit address.

1. **Confirm what you hold.** In Phantom, open USDC and read the network. If it says Solana, stop. That is not Base USDC.
2. **Decide the route.** Either sell or swap to a supported path on an exchange that can withdraw USDC on Base, or use a reputable bridge after you understand the fee and the destination token.
3. **Get a Base address you control.** Install or open a Base-capable wallet such as MetaMask, add Base and copy that address. Do not paste the PVPspinArena deposit address into a Solana send screen.
4. **Move a test amount.** Send a small USDC amount on Base to your own wallet first. Wait until a Base explorer shows success.
5. **Verify on the site.** On your profile, connect the Base wallet and sign the verification message. No token approval.
6. **Deposit from that same address.** Send USDC on Base to the address on the wallet page. Keep a little ETH on Base for gas.
7. **Only then send the rest.** After $2.00 credits, send the remaining $18.00 the same way.

If step 2 uses a bridge, treat the bridge as a separate product with its own risk. Do not skip the test amount. A 40 USDC mistake on the wrong chain is much more expensive than a 1 USDC test.

Once credited, balances on PVPspinArena are in US dollars. A later withdrawal goes back out as USDC on Base to the address you request, subject to the $250 daily limit and review on amounts over $25.`,
    },
    {
      id: "pvp-and-limits",
      title: "What PVPspinArena expects if you still use Phantom",
      body: `PVPspinArena runs player-versus-player Jackpot, Coinflip and Roulette. It is not a Solana program you sign inside Phantom. Money in is a Base transfer. Money out is a Base transfer from the site’s payout wallet after checks.

If Phantom now shows Base in your build, you could in theory hold Base USDC there and send it, but only after you verify that exact address on the site. Many players find MetaMask or another EVM wallet clearer for Base because the network switch is explicit. Either way, the rules are the same:

- Deposits must come from the verified sender on Base.
- Verification is a message signature, not a token approval.
- Wrong-network sends are not auto-credited.
- Withdrawals are not a Phantom feature; they are an on-chain payout you then import or view in whatever wallet holds that address.

Read [how it works](/how-it-works) before you size a first deposit. Set a budget you can lose. Phantom’s speed on Solana does not change the house math of a PvP pot or a roulette spin.

If a send from Phantom never appears, copy the transaction signature, check it on the explorer for the network you actually used and stop sending more. Support can only help if the hash exists on Base and the sender is the verified wallet.

Keep Phantom’s activity log. A Solana signature and a Base hash are different objects. Pasting a Solana signature into a Base support form wastes a day. If you used a bridge, keep both legs: the Solana burn or lock and the Base mint or unlock. Those two hashes together explain a “missing” balance better than a screenshot of the Phantom home screen.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `A Phantom wallet is a capable self-custody app, especially if your coins already sit on Solana. It is a poor mental model for a Base-only casino. Ticker names lie across chains. Approvals and typed transactions can still drain you. The recovery phrase is never a support field.

For PVPspinArena, plan USDC or ETH on Base, verify by signing a message and send a test amount from that address. Use Phantom if it helps you hold or move coins, not as a shortcut around the network the site actually watches.`,
    },
  ],
  faqs: [
    {
      q: "Can I deposit to PVPspinArena directly from Phantom on Solana?",
      a: "No. The site credits USDC and ETH on Base from a verified wallet. Solana USDC and SOL sent to a Base address will not appear as a balance.",
    },
    {
      q: "Does Phantom support Base?",
      a: "Phantom has added EVM networks in some versions, but you must confirm the network label before you send. If Base is not selected, the transfer is not a PVPspinArena deposit.",
    },
    {
      q: "Will PVPspinArena ask for my Phantom recovery phrase?",
      a: "Never. Verification is a signed message on a wallet you control. Anyone asking for the words is trying to steal the wallet.",
    },
    {
      q: "I sent Solana USDC to the site address. Can support recover it?",
      a: "Wrong-network sends are often unrecoverable. Check the explorer for the chain you used, keep the hash and contact support, but do not assume a credit.",
    },
    {
      q: "Is connecting Phantom the same as approving a spend?",
      a: "No. A connection shares an address. A token approval or a malicious transaction is a separate prompt. Reject anything that grants spending you did not intend.",
    },
    {
      q: "What should I keep in Phantom if I play on Base sites?",
      a: "Keep only a gaming budget in any hot wallet. Savings belong in a separate wallet. On Base you also need a little ETH for gas if you send USDC yourself.",
    },
  ],
  sources: [
    { label: "Phantom Help Center", url: "https://help.phantom.com/" },
    {
      label: "Circle — USDC on multiple networks",
      url: "https://www.circle.com/en/usdc-multichain",
    },
    { label: "Base documentation", url: "https://docs.base.org/" },
    { label: "Solana documentation — wallets", url: "https://solana.com/docs/intro/wallets" },
  ],
  related: [
    "usdc-casino",
    "coinbase-wallet-casino",
    "trust-wallet-casino",
    "walletconnect-casino",
    "self-custody-wallet",
    "does-metamask-support-solana",
  ],
  updated: "2026-09-26",
};
