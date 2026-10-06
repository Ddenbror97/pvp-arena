import type { Guide } from "./types";

export const guide: Guide = {
  slug: "exodus-wallet",
  cluster: "Crypto payments",
  keyword: "exodus wallet",
  secondary: [
    "exodus wallet review",
    "is exodus wallet safe",
    "exodus wallet fees",
    "exodus crypto wallet",
  ],
  title: "Exodus Wallet Review: Features, Security and Fees",
  description:
    "Exodus wallet review: how the self-custody desktop and mobile wallet stores keys, what swaps and network fees cost, and the scams to watch for.",
  h1: "Exodus wallet review: features, security model and real costs",
  answer:
    "Exodus wallet is a self-custody software wallet for desktop, mobile and browser, launched in 2015. Your private keys are generated and stored on your device and backed up by a 12-word recovery phrase, so Exodus the company cannot freeze or recover your funds. It is easy to use and supports many assets. The trade-offs are hot-wallet exposure to malware, swap spreads built into quotes, and code that is not fully open source.",
  facts: [
    "Exodus was founded by JP Richardson and Daniel Castagnoli; the first desktop release shipped in late 2015.",
    "It is non-custodial: no account, no KYC for the wallet itself, and keys stay on your device.",
    "Sending costs only the network fee; built-in swaps and card purchases carry a spread or provider fee.",
    "Exodus can pair with a Trezor hardware wallet so signing happens off the computer.",
    "Anyone asking for your 12 words, including “Exodus support”, is running a scam.",
  ],
  sections: [
    {
      id: "what",
      title: "What Exodus is and how it differs from an exchange",
      body: `Exodus is a software wallet. You install it on Windows, macOS, Linux, iOS or Android, or add the browser extension (marketed as the Exodus Web3 Wallet), and it generates a set of private keys locally. There is no username and no email login for the wallet itself. The password you set only encrypts the wallet file on that one device. The **12-word recovery phrase** is the real master key: anyone with those words can rebuild every address on any compatible wallet.

That makes Exodus a [self-custody wallet](/guides/self-custody-wallet), the opposite of leaving coins on an exchange. On an exchange you hold an IOU and the company can pause withdrawals, ask for ID, or lose funds in an insolvency. With Exodus nobody can pause you, and nobody can help you if you lose the phrase.

### Who makes it

Exodus Movement, Inc. is a US company founded by JP Richardson and Daniel Castagnoli. It raised money from the public in 2021 through a Regulation A share offering, which is unusual for a wallet maker. The company earns money mainly from the swap and purchase features inside the app, not from charging you to hold coins.

### Who it suits

Exodus is popular with people moving from exchanges to their first self-custody wallet because the interface is visual: portfolio charts, one screen per asset, and a single phrase that covers Bitcoin, Ethereum, Solana and many other chains. Power users who want custom RPC endpoints, detailed transaction building or fully auditable code tend to prefer tools such as MetaMask, Sparrow or a hardware wallet's own app. The [Crypto payments topic](/guides/topics/crypto-payments) compares those routes in more depth.`,
    },
    {
      id: "security",
      title: "Exodus security model: what protects you and what does not",
      body: `A wallet's security is the answer to one question: where can the private key be stolen from? For Exodus, the key lives encrypted on an internet-connected device. That puts it in the hot-wallet category described in [cold wallet vs hot wallet](/guides/cold-wallet-vs-hot-wallet).

### Layers that help

- **Local encryption.** The wallet file is encrypted with your password. A thief who copies the file still needs the password.
- **Biometric or PIN lock on mobile.** Stops a casual person who picks up your phone.
- **Recovery phrase.** If the device dies, the 12 words restore everything. This protects against loss, not theft.
- **Trezor pairing.** Exodus can use a Trezor device as the signer. The key never touches the computer, which is the single biggest upgrade available.

### Layers that do not exist

- **No account-level 2FA.** There is no server to put a second factor on. Security is the device plus the phrase.
- **No reversal.** A signed transaction is final. Exodus support cannot claw it back.
- **Partial transparency.** Exodus is not fully open source. Some components are public, but outside developers cannot audit the whole app the way they can with fully open wallets. Many users accept this; some security-focused users do not.

### The realistic threats

The common losses are not exotic cryptography attacks. They are clipboard malware that swaps a pasted address, a fake Exodus download from a search ad, a phishing page that asks you to “verify” your phrase, and a malicious token approval signed in the browser extension. Every one of those works on any hot wallet. The fixes are the same: install only from the official site or official app stores, check the first and last characters of every pasted address, keep the phrase on paper offline, and review [token approvals](/guides/revoke-token-approvals) you no longer need.`,
    },
    {
      id: "fees",
      title: "Exodus wallet fees: network fees, swap spreads and purchases",
      body: `Exodus does not charge a fee to hold coins or to receive them. What you pay depends on the action.

| Action | Who gets paid | How it shows up |
| --- | --- | --- |
| Send BTC, ETH, SOL, tokens | Network validators or miners | Network fee shown before you confirm |
| Built-in swap | Swap partner and Exodus | Spread built into the quoted rate, plus network fees |
| Buy with card or bank | Third-party provider | Provider fee and rate shown at checkout |
| Staking (where offered) | Validators | Part of rewards, shown in the staking screen |

### Network fees

Network fees are set by the chain, not by Exodus. A Bitcoin send pays per virtual byte of transaction data; Ethereum and its layer 2 networks pay gas. The [gas fees guide](/guides/gas-fees-explained) explains why the same USDC transfer can cost several dollars on Ethereum mainnet and a fraction of a cent on a layer 2 such as Base.

### Swap spreads, worked

Exodus quotes swaps as a single rate. The spread is inside that rate, so the app will not show a separate fee line. You can measure it yourself. Suppose ETH trades at $3,000 on a large exchange and you swap $500 of USDC in Exodus. If the quote gives you 0.1633 ETH, you received about $490 of ETH at the market price. The effective cost is roughly $10, or 2%, plus the network fee. The figures here are illustrative; spreads vary by pair, size and market conditions, so compare the quote with a public price before you confirm.

For large or frequent swaps, a decentralised exchange can be cheaper; the [token swap guide](/guides/how-to-swap-tokens) covers slippage and routing. For small, occasional swaps, many users happily pay the convenience cost. What matters is knowing it is there.`,
    },
    {
      id: "features",
      title: "Exodus features compared with other wallet types",
      body: `Exodus bundles several tools into one app. The practical question is which of them you actually need.

- **Multi-chain portfolio.** One recovery phrase covers Bitcoin, Ethereum and EVM tokens, Solana and many more. Supported assets and networks change over time, so check the in-app list rather than a third-party review.
- **Built-in swaps.** Convenient, priced with a spread, as described above.
- **Buy and sell.** Routed through third-party providers, each with its own fees, limits and country availability.
- **Staking.** Available for some proof-of-stake assets. Rewards and lock-up terms vary by asset.
- **Web3 browser extension.** Lets you connect to dapps the way MetaMask does.
- **Hardware pairing.** Trezor devices can sign for Exodus accounts.

### How it stacks up

| Feature | Exodus | MetaMask | Hardware wallet alone |
| --- | --- | --- | --- |
| Custody | Self | Self | Self |
| Chains | Many, incl. Bitcoin | EVM-first, others via add-ons | Depends on companion app |
| Key location | Device (hot) or Trezor | Device (hot) or hardware | Offline device |
| Fully open source | No | Largely | Varies by maker |
| Best for | Simple multi-asset holding | EVM dapps | Long-term storage |

If most of your activity is on EVM networks and dapps, compare with the [MetaMask casino guide](/guides/metamask-casino). If you mainly hold, the [Ledger vs Trezor comparison](/guides/ledger-vs-trezor) is the more important decision. Many people end up with two wallets: a hardware-backed vault and a small hot wallet for day-to-day use.`,
    },
    {
      id: "setup",
      title: "Setting up Exodus safely and sending on the right network",
      body: `A clean setup removes most of the risk before it starts.

1. Download from the official Exodus site or the official Apple and Google stores. Check the developer name; fake wallet apps have appeared in app stores before.
2. Create a new wallet and set a strong password unique to this device.
3. Write the 12 words on paper, in order, and store them offline. Do not photograph them, email them or keep them in a notes app. The [seed phrase guide](/guides/seed-phrase) covers storage options.
4. Restore test: on a spare device or after a reinstall, confirm the phrase actually restores the wallet before you fund it with meaningful money.
5. Send a small test amount first, then the rest.

### Network matching

Stablecoins exist on many chains. USDC on Ethereum, USDC on Base and USDC on Solana are different tokens at different addresses. Exodus shows the network for each asset; the sender and receiver must match. If you send USDC on one network to an address that expects another, recovery ranges from awkward to impossible. The [wrong network guide](/guides/sent-crypto-to-wrong-network) explains what can and cannot be recovered.

Before relying on Exodus for a specific network, confirm the network appears in the asset's menu in your version of the app. If it does not, do not improvise with a manual contract address.`,
    },
    {
      id: "restore",
      title: "Restoring, migrating and retiring an Exodus wallet",
      body: `Sooner or later every wallet gets moved: a new phone, a dead laptop, or a decision to switch apps.

### Restoring Exodus on a new device

Install Exodus from the official source, choose the restore option and enter the 12 words in order. Balances reappear because they live on the blockchains, not in the app. Settings such as custom asset lists, labels and transaction notes may not come back, so rebuild them after the restore.

### Moving to another wallet

The 12 words follow the widely used BIP39 standard, so in principle other wallets can import them. In practice, different wallets derive addresses along different paths, and some chains in Exodus use conventions another app does not. A restored phrase can therefore show an empty balance in a different wallet even though the funds are safe. The cleaner route is usually to create the new wallet with its own fresh phrase and send the assets across, one network at a time, starting with a small test.

### Retiring a wallet properly

1. Move every asset out, including small token balances and staked positions, which may need to be unstaked first.
2. Revoke token approvals granted from the old addresses if they held EVM tokens.
3. Uninstall the app and delete the wallet file.
4. Keep or destroy the old phrase deliberately. If any funds or airdrops could still arrive at those addresses, keep it safe; otherwise destroy it so it cannot be found later.

A wallet phrase that has ever been typed into a website, photographed or stored in the cloud should be treated as compromised. Create a new wallet and move funds rather than continuing to use it.`,
    },
    {
      id: "pvp",
      title: "Using Exodus with PVPspinArena",
      body: `PVPspinArena runs three player-vs-player games, Jackpot, [Coinflip](/coinflip) and [Roulette](/roulette), played in USDC or ETH on the Base network. The wallet you use to fund play is your choice; what matters is holding the right asset on Base and connecting a wallet that can sign on that network.

A sensible pattern is to keep savings in a hardware-backed or cold setup and move only a session budget into a hot wallet such as Exodus. That limits the damage from a compromised laptop and makes the budget concrete: when the hot wallet is empty, the session is over.

The maths of the games does not depend on the wallet. A Coinflip is a 50/50 between two players, with the winner taking the pot minus any fee shown before entry. On Roulette, Purple and Silver pay 2x and Green pays 14x on a 33-slot wheel, so Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Each settled round can be checked on [fairness](/fairness) using the committed seeds.

PVPspinArena is 18+. If topping up the hot wallet has started to feel automatic, the [responsible gambling](/responsible-gambling) page lists limits and support options.

In the same cluster, see also [multisig wallet](/guides/multisig-wallet).`,
    },
  ],
  faqs: [
    {
      q: "Is Exodus wallet safe?",
      a: "It is a reputable self-custody wallet, but it is a hot wallet: keys sit on an internet-connected device. It is as safe as that device and your recovery phrase. Pairing a Trezor makes it much stronger.",
    },
    {
      q: "Does Exodus charge fees?",
      a: "Holding and receiving are free. Sends pay the network fee. Built-in swaps include a spread inside the quoted rate, and card or bank purchases carry the provider's fees.",
    },
    {
      q: "Can Exodus recover my wallet if I lose my phrase?",
      a: "No. Exodus does not hold your keys. Without the 12-word phrase, a lost or wiped device means lost funds. Anyone claiming they can recover it for you is a scammer.",
    },
    {
      q: "Is Exodus open source?",
      a: "Not fully. Some components are public, but the complete app is not open for independent audit. Users who require fully open code usually choose a different wallet.",
    },
    {
      q: "Can I use Exodus with a hardware wallet?",
      a: "Yes, Exodus supports Trezor devices as signers. Transactions are prepared in Exodus and approved on the Trezor, so the private key stays off the computer.",
    },
  ],
  sources: [
    { label: "Exodus official site", url: "https://www.exodus.com/" },
    {
      label: "Wikipedia: Cryptocurrency wallet",
      url: "https://en.wikipedia.org/wiki/Cryptocurrency_wallet",
    },
    { label: "Trezor official site", url: "https://trezor.io/" },
  ],
  related: [
    "multisig-wallet",
    "self-custody-wallet",
    "cold-wallet-vs-hot-wallet",
    "seed-phrase",
    "ledger-vs-trezor",
    "metamask-casino",
  ],
  updated: "2026-09-27",
};
