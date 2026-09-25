import type { Guide } from "./types";

export const guide: Guide = {
  slug: "seed-phrase",
  cluster: "Crypto payments",
  keyword: "seed phrase",
  secondary: ["what is a seed phrase", "recovery phrase", "seed phrase security", "seed phrase scam"],
  title: "Seed Phrase Explained: How to Keep Your Wallet Safe",
  description:
    "What a seed phrase is, how it controls your crypto wallet, how to store it safely, the scams that target it, and why no casino or support team will ask for it.",
  h1: "Seed phrase explained: what it is and how to keep it safe",
  answer:
    "A seed phrase, also called a recovery phrase, is a list of usually 12 or 24 words that can recreate your crypto wallet and every key in it. Anyone who has your seed phrase can take all your funds, from anywhere, without your password. Write it down offline, store it somewhere safe, never type it into a website, and never share it with anyone, including support staff or a casino.",
  facts: [
    "Most wallets use 12 or 24 words from a standard list of 2,048 words (BIP-39).",
    "Your seed phrase can recreate all of your wallet's private keys and addresses.",
    "Anyone with the phrase has full control of the funds; transfers cannot be reversed.",
    "No legitimate wallet, exchange, casino or support agent will ever ask for it.",
    "PVPspinArena verifies wallets with a signed message, never with a seed phrase.",
  ],
  sections: [
    {
      id: "what",
      title: "What is a seed phrase?",
      body: `When you create a self-custody wallet such as MetaMask, it shows you a list of words and asks you to write them down. That list is your seed phrase.

### Why it exists

Crypto wallets are really sets of private keys. Keys are long, random numbers that are hard to back up. A seed phrase turns that randomness into ordinary words that are easier to write and check.

### What it does

From the seed phrase, the wallet can recreate:

- Your private keys.
- All your wallet addresses.
- Access to every token on every supported network.

If you lose your phone or computer, installing the wallet on a new device and entering the seed phrase restores everything.

### Other names

You may see it called a recovery phrase, secret recovery phrase, mnemonic or backup phrase. They all mean the same thing. If you are new to wallets, start with our [crypto wallet for gambling guide](/guides/crypto-wallet-for-gambling).`,
    },
    {
      id: "how",
      title: "How a seed phrase works",
      body: `You do not need to understand the maths to stay safe, but a little background helps.

### The word list

Most wallets follow a standard called BIP-39. It uses a fixed list of 2,048 English words. A 12-word phrase is chosen randomly from that list, with a checksum built into the last word to catch typos.

### From words to keys

The phrase is turned into a large number called a seed. From the seed, the wallet derives a tree of private keys, one for each account. Each private key has a matching public address, which is what you share to receive funds.

### Why it is so powerful

Because every key comes from the seed, the phrase is effectively the master key to the whole wallet. It works on any compatible wallet app, on any device, anywhere in the world.

### Seed phrase vs password

- **Password**: unlocks the wallet app on one device.
- **Seed phrase**: recreates the wallet itself on any device.

Someone who has your password but not your device usually cannot get in. Someone with your seed phrase can.`,
    },
    {
      id: "store",
      title: "How to store your seed phrase safely",
      body: `The safest place for a seed phrase is offline, in a location only you control.

### Good practices

- **Write it on paper** with a pen, clearly and in order.
- **Check it** by comparing with the wallet screen, word by word.
- **Keep it somewhere secure**, such as a locked drawer or safe.
- **Consider a second copy** in a different secure place, in case of fire or flood.
- **Consider a metal backup** for larger amounts; metal plates survive fire and water better than paper.

### Things to avoid

- Screenshots or photos.
- Notes apps, email drafts or cloud documents.
- Password managers that sync online, unless you fully understand the risks.
- Typing it into any website or app other than your wallet during a genuine restore.
- Storing it next to the device it unlocks.

### Tell someone you trust

For larger holdings, consider how a trusted person could access funds in an emergency, without giving them the phrase today.`,
    },
    {
      id: "scams",
      title: "Seed phrase scams to watch for",
      body: `Because a seed phrase gives full control, scammers put a lot of effort into getting it.

### Fake support

Someone contacts you on Discord, Telegram, X or email, claiming to be support for a wallet, exchange or casino. They say your account has a problem and ask for your seed phrase to "verify" or "sync" it. Real support will never ask.

### Fake websites

Scam sites copy the look of real wallets or apps and ask you to "restore" or "validate" your wallet by typing your phrase. Always check the address carefully and use bookmarks.

### Fake airdrops and giveaways

Messages promise free tokens if you connect or verify your wallet with your phrase.

### Malicious apps and extensions

Fake wallet apps and browser extensions can steal phrases when you enter them. Only download wallets from official sources.

### "Wallet recovery" services

After a loss, some people are targeted by fake recovery services that ask for the seed phrase of whatever wallet is left.

If anyone asks for your seed phrase for any reason, it is a scam.`,
    },
    {
      id: "casinos",
      title: "Seed phrases and crypto casinos",
      body: `When you use a crypto casino, your seed phrase should never be involved.

### How legitimate sites connect to your wallet

- **Deposits**: you send funds from your wallet to the site's address. The site never needs your keys.
- **Wallet verification**: you sign a message in your wallet to prove you own an address.
- **Withdrawals**: the site sends funds to your address.

### On PVPspinArena

You verify your wallet by signing a message in MetaMask, which proves ownership without revealing any keys. Deposits from that verified address are then credited automatically. Withdrawals go back to your wallet from the [wallet page](/wallet). At no point do we ask for your seed phrase or private key, and our support will never ask for them. Our [MetaMask casino guide](/guides/metamask-casino) explains the flow.

### Red flag

If a casino, or someone claiming to represent one, asks for your seed phrase, stop immediately.`,
    },
    {
      id: "signing",
      title: "Signing safely",
      body: `Even without sharing your phrase, you can lose funds by signing the wrong thing.

### Know what you are signing

- **Message signatures** (like wallet verification) prove ownership and do not move funds.
- **Transactions** move tokens and cost gas.
- **Token approvals** let a contract spend your tokens, sometimes without limit.

Read every wallet prompt. If a simple login asks you to approve unlimited token spending, reject it.

### Use a separate wallet

Many people keep a small "hot" wallet for everyday use, including gambling, and a separate wallet for savings. If the hot wallet is ever compromised, the savings are not.

### Check network and address

Before sending USDC, confirm you are on the right network. Our [add Base to MetaMask guide](/guides/add-base-network-metamask) shows how.`,
    },
    {
      id: "lost",
      title: "What if you lose or expose your seed phrase?",
      body: `### If you lose it but still have access

Your wallet still works on the device you are using. Create a new wallet with a new seed phrase, back up the new phrase properly, and move your funds to it.

### If you lose it and lose access

Without the seed phrase, there is usually no way to recover the wallet. No company can reset it. This is why the backup matters so much.

### If someone else may have seen it

Act immediately:

1. Create a new wallet with a new seed phrase on a clean device.
2. Move all funds to the new wallet.
3. Revoke token approvals from the old wallet if possible.
4. Update any sites where the old address was verified.

On PVPspinArena, if you move to a new wallet, verify the new address on your profile before sending deposits from it. Our [crypto casino withdrawals guide](/guides/crypto-casino-withdrawals) explains how withdrawals are sent to your verified address.`,
    },
    {
      id: "checklist",
      title: "Seed phrase checklist",
      body: `- Written on paper or metal, not stored digitally.
- Checked word by word against the wallet screen.
- Kept in a secure place, with a second copy stored separately.
- Never typed into a website, form or chat.
- Never shared with support, friends or a casino.
- A separate hot wallet used for gambling and everyday use.
- Every signature and approval read before confirming.

Following these steps protects you from the most common ways people lose crypto. If you are just getting started with USDC, our [how to buy USDC guide](/guides/how-to-buy-usdc) covers the next step.`,
    },
  ],
  faqs: [
    {
      q: "What is a seed phrase?",
      a: "A seed phrase is a list of usually 12 or 24 words that can recreate your crypto wallet and all its private keys on any compatible wallet app.",
    },
    {
      q: "Should I ever share my seed phrase?",
      a: "No. Anyone with your seed phrase can take all your funds. No legitimate wallet, exchange, casino or support team will ever ask for it.",
    },
    {
      q: "Where should I store my seed phrase?",
      a: "Offline, written on paper or stamped on metal, in a secure place. Avoid screenshots, cloud notes and email.",
    },
    {
      q: "Can I recover a wallet without the seed phrase?",
      a: "Usually not. If you lose both your device access and your seed phrase, the wallet generally cannot be recovered by anyone.",
    },
    {
      q: "Does PVPspinArena need my seed phrase?",
      a: "No. PVPspinArena verifies your wallet with a signed message and never asks for your seed phrase or private key.",
    },
  ],
  sources: [
    { label: "BIP-39: Mnemonic code for generating deterministic keys", url: "https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki" },
    { label: "MetaMask: Secret Recovery Phrase safety", url: "https://support.metamask.io/" },
    { label: "FTC: What to know about cryptocurrency and scams", url: "https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-and-scams" },
  ],
  related: ["crypto-wallet-for-gambling", "metamask-casino", "crypto-casino-withdrawals", "add-base-network-metamask"],
  updated: "2026-09-25",
};
