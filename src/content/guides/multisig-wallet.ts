import type { Guide } from "./types";

export const guide: Guide = {
  slug: "multisig-wallet",
  cluster: "Crypto payments",
  keyword: "multisig wallet",
  secondary: [
    "multi signature wallet",
    "m of n wallet",
    "safe multisig",
    "2 of 3 multisig",
    "multisig vs mpc",
  ],
  title: "Multisig Wallet: How m-of-n Signing Works and When",
  description:
    "Multisig wallet guide: how m-of-n signing works on Bitcoin and in Safe on Ethereum, threshold maths, real failures, and when a multisig is worth it.",
  h1: "Multisig wallet explained: m-of-n keys, Safe and real use cases",
  answer:
    "A multisig wallet needs several independent keys to approve a transaction, written as m-of-n: a 2-of-3 wallet has three keys and any two can sign. It removes the single point of failure of one seed phrase, because one stolen or lost key is not enough to move funds. It suits treasuries, teams and long-term savings. It adds setup work, higher fees and new ways to lock yourself out.",
  facts: [
    "m-of-n means n keys exist and any m of them must sign; 2-of-3 is the most common personal setup.",
    "Bitcoin multisig uses script (OP_CHECKMULTISIG), standardised for addresses by BIP 16 in 2012.",
    "On Ethereum and layer 2s, multisig is usually a smart-contract wallet such as Safe (formerly Gnosis Safe).",
    "A 2-of-3 survives the loss of any one key and the theft of any one key.",
    "Multisig does not stop signers approving a malicious transaction they cannot read; the 2025 Bybit theft showed that.",
  ],
  sections: [
    {
      id: "how",
      title: "How a multisig wallet works",
      body: `An ordinary wallet has one private key, backed up by one [seed phrase](/guides/seed-phrase). Whoever holds it controls the funds. A multisig wallet replaces that single key with a rule: **m of these n keys must sign**.

- **2-of-2:** both keys required. Protects against theft of one key, but losing either key locks the funds.
- **2-of-3:** any two of three. The classic personal and small-team setup.
- **3-of-5:** common for company treasuries and DAOs, so one absent or compromised signer never blocks or steals.

### Bitcoin: multisig in script

Bitcoin has supported multisig in its scripting language for years through the OP_CHECKMULTISIG opcode. BIP 16, activated in 2012, introduced pay-to-script-hash (P2SH) addresses, which made multisig practical: the sender pays to a short hash, and the spender later reveals the full script and enough signatures. SegWit and Taproot later reduced the size and improved privacy. Wallets such as Sparrow, Electrum and several hardware-wallet apps coordinate Bitcoin multisig.

### Ethereum and EVM chains: contract wallets

Ethereum accounts controlled by a single key cannot natively require several signatures. So EVM multisig is usually a **smart-contract wallet**: a contract holds the funds and only executes a transaction once enough owners have signed it. Safe (previously Gnosis Safe) is the dominant implementation and is deployed on Ethereum and many layer 2 networks, including Base. This is a cousin of the ideas in [account abstraction wallets](/guides/account-abstraction-wallet): the wallet is code, so rules such as thresholds, spending limits and recovery modules can be added.

Either way the principle is identical. No single device, person or phrase is enough.`,
    },
    {
      id: "threshold",
      title: "Threshold maths: choosing m and n",
      body: `Pick m and n by writing down two failure modes: keys you might **lose**, and keys an attacker might **steal**.

| Setup | Keys you can lose and still spend | Keys an attacker needs |
| --- | --- | --- |
| 1-of-1 | 0 | 1 |
| 2-of-2 | 0 | 2 |
| 2-of-3 | 1 | 2 |
| 3-of-5 | 2 | 3 |

The rule of thumb: you can lose n − m keys, and a thief needs m.

### A worked risk comparison

Suppose each key, stored separately, has a 5% chance of being lost over five years (a house fire, a forgotten location, a dead device), independently.

- **1-of-1:** lockout probability is 5%.
- **2-of-2:** you lose access if either is lost: 1 − 0.95² ≈ 9.75%. Worse than a single key.
- **2-of-3:** you lose access only if two or more are lost: 3 × 0.05² × 0.95 + 0.05³ ≈ 0.725%.

The same 2-of-3 also means one stolen key is useless. That combination, far lower lockout risk and higher theft resistance, is why 2-of-3 is the default recommendation. The independence assumption is the weak point: three keys in one drawer fail together. Spread them across locations and, ideally, across hardware makers, a point the [Ledger vs Trezor guide](/guides/ledger-vs-trezor) touches on.

### What you must back up

For Bitcoin multisig, the seeds are not enough. You also need the **wallet descriptor** or the list of all extended public keys and the script type, otherwise two seeds cannot rebuild the address. For a Safe, the contract address and network are the equivalent. Store that record with each key.`,
    },
    {
      id: "uses",
      title: "When a multisig wallet is worth it",
      body: `Multisig costs effort. It pays off in a few clear situations.

1. **Long-term personal savings.** A 2-of-3 across two hardware wallets and one backup in a separate location removes the single seed phrase as a catastrophe point.
2. **Business and DAO treasuries.** No single employee can move funds, and one departure does not freeze the treasury. Safe is the standard tool for this on EVM chains.
3. **Inheritance planning.** A family member can hold one key and a lawyer or trusted party another, so heirs can recover funds without anyone being able to spend alone. Collaborative custody services sell exactly this model.
4. **Shared pools.** Two partners holding a joint fund can require both signatures, or two of three with a neutral third party.

### When it is overkill

For a small spending balance, multisig adds friction without much benefit. A plain [self-custody wallet](/guides/self-custody-wallet) with a well-stored phrase, or a hardware wallet, covers most personal needs. A useful split is a multisig vault for savings and a single-key hot wallet holding only what you intend to spend, topped up from the vault when needed.

### Multisig vs MPC and Shamir backups

These are often confused.

- **Multisig:** several full keys, several signatures, visible on-chain as a multisig or contract.
- **MPC (multi-party computation):** one key that never exists in one place; parties compute a single ordinary signature together. Looks like a normal address on-chain. Common at custodians and some consumer wallets.
- **Shamir's Secret Sharing:** one seed split into shares for backup. When you recover, the seed is reassembled in one place, so the signing key is still single.`,
    },
    {
      id: "failures",
      title: "Real multisig failures and what they teach",
      body: `Multisig raises the bar. It does not make a system safe on its own, and the largest crypto thefts include multisig setups.

### Bybit, February 2025

Roughly $1.5 billion in ETH and related tokens was taken from a Bybit cold wallet secured by a Safe multisig. Investigations reported that attackers compromised part of the Safe{Wallet} web interface so that signers saw a routine transfer while actually approving a change to the wallet's contract logic. The FBI attributed the theft to North Korean actors. The lesson: if every signer relies on the same interface and signs data they cannot independently read, the threshold collapses to one point of failure. Hardware wallets that show full transaction details, and signers who verify on separate tools, matter as much as m.

### Ronin bridge, 2022

The Ronin network's bridge used a 5-of-9 validator scheme. Attackers gained control of five keys, several of them effectively held by one organisation, and withdrew funds worth over $600 million at the time. Nine keys under too few real owners behaved like a much weaker threshold.

### Parity wallet, 2017

Parity's multisig contract library had bugs. One was exploited to drain funds in July 2017; in November a user accidentally triggered a flaw that disabled the shared library, freezing hundreds of thousands of ETH in dependent wallets. Contract multisig inherits smart-contract risk, which is why audited, widely used code matters; see [smart contract audits](/guides/smart-contract-audit).`,
    },
    {
      id: "myths",
      title: "Multisig myths that cause real losses",
      body: `Most multisig problems come from assumptions rather than from the cryptography.

### “More keys is always safer”

Adding keys only helps if they are held and stored independently. A 3-of-5 where one person controls three devices is, in practice, a 1-of-1 with extra steps. Raising m improves theft resistance but increases lockout risk; raising n without raising m does the opposite. Choose the pair from the loss-and-theft table above, not from a sense that bigger numbers feel stronger.

### “Multisig protects me from signing something bad”

It protects you from a single compromised key. It does not protect you if every signer approves the same malicious payload. If all signers use one website to build and review transactions, a compromised website can fool all of them at once. Independent verification, preferably on hardware screens and a second tool, is the defence.

### “A multisig is private”

Traditional Bitcoin multisig reveals the full script, including all public keys and the threshold, when you spend. Taproot-based schemes can make some multisig spends look like single-key spends, but support varies by wallet. A Safe on an EVM chain is a public contract: anyone can see its owners and threshold.

### “A Safe can be recovered like an exchange account”

Only if you set up a recovery method in advance, such as enough owners in reserve or an optional recovery module. Otherwise, if owners below the threshold remain, the funds are stuck in the contract permanently. There is no help desk that can override a threshold.

### “The coordinator app holds my funds”

Coordinator software builds and shares transactions; it does not hold keys. If it disappears, you can rebuild the wallet in other software using the backed-up descriptor or Safe address.`,
    },
    {
      id: "setup",
      title: "Costs and a safe setup checklist",
      body: `### Fees

Bitcoin multisig transactions carry more signature data than single-key ones, so they cost more in [network fees](/guides/bitcoin-fees), though SegWit and Taproot narrow the gap. A Safe on an EVM chain costs gas to deploy and slightly more gas per transaction than a plain transfer. On Ethereum mainnet that can be several dollars; on a layer 2 such as Base it is usually cents. The [gas fees guide](/guides/gas-fees-explained) explains the difference.

### Checklist

1. Choose the threshold first, usually 2-of-3.
2. Use separate devices, ideally from different makers, each with its own seed stored in a different place.
3. Record the descriptor, extended public keys or Safe address and network with each backup.
4. Create the wallet and verify the receive address on at least two signing devices.
5. Send a small amount, then practise a full spend using two keys before funding it properly.
6. Practise recovery: rebuild the wallet from backups on a clean device.
7. For every real transaction, read the destination and amount on the hardware screen, not only in the browser.
8. Review signers when people leave a team, and rotate keys through a transaction rather than by sharing seeds.

The [Crypto payments topic](/guides/topics/crypto-payments) collects the wallet, network and transfer guides that sit around this process.`,
    },
    {
      id: "pvp",
      title: "Multisig and PVPspinArena play",
      body: `PVPspinArena runs three player-vs-player games, Jackpot, [Coinflip](/coinflip) and [Roulette](/roulette), with play in USDC or ETH on the Base network. A multisig is a vault, not a gaming wallet: requiring two approvals for each Roulette bet would be slow, and contract wallets sign messages differently from single-key accounts, so not every dapp flow works smoothly with them.

The practical pattern is the savings-and-spending split. Keep reserves in a 2-of-3, move a fixed session budget on Base into a single-key wallet, and play from that. The second signature becomes a natural pause before topping up.

That pause is useful because the maths does not change with the wallet. Roulette's 33-slot wheel pays 2x on Purple and Silver and 14x on Green, returning 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee on every bet. Coinflip is a 50/50 between two players, with the winner taking the pot minus any fee shown before entry. Settled rounds can be checked on [fairness](/fairness).

PVPspinArena is 18+. If you are raising the hot-wallet budget more often than planned, the [responsible gambling](/responsible-gambling) page has limits and support.

In the same cluster, see also [exodus wallet](/guides/exodus-wallet).`,
    },
  ],
  faqs: [
    {
      q: "What is a 2-of-3 multisig wallet?",
      a: "A wallet with three keys where any two must sign to move funds. You can lose one key and still spend, and a thief who steals one key cannot move anything.",
    },
    {
      q: "Is a multisig wallet safer than a hardware wallet?",
      a: "They solve different problems and work best together. A hardware wallet protects one key from malware; a multisig removes the single key. The strongest personal setup is a multisig built from several hardware wallets.",
    },
    {
      q: "What is Safe in crypto?",
      a: "Safe, formerly Gnosis Safe, is a smart-contract multisig wallet for Ethereum and many EVM networks. Owners set a threshold, and the contract only executes a transaction once enough owners sign.",
    },
    {
      q: "What happens if I lose one key in a multisig?",
      a: "In a 2-of-3 you can still spend with the other two and should move funds to a new multisig with fresh keys. In a 2-of-2, losing one key locks the funds.",
    },
    {
      q: "Do multisig wallets cost more in fees?",
      a: "Slightly. Bitcoin multisig transactions are larger, and a Safe costs gas to deploy and a little more per transaction. On layer 2 networks the difference is usually cents.",
    },
  ],
  sources: [
    { label: "Wikipedia: Multisignature", url: "https://en.wikipedia.org/wiki/Multisignature" },
    {
      label: "BIP 16: Pay to Script Hash",
      url: "https://github.com/bitcoin/bips/blob/master/bip-0016.mediawiki",
    },
    { label: "Safe official site", url: "https://safe.global/" },
  ],
  related: [
    "exodus-wallet",
    "self-custody-wallet",
    "what-is-a-hardware-wallet",
    "account-abstraction-wallet",
    "seed-phrase",
    "ledger-vs-trezor",
  ],
  updated: "2026-09-27",
};
