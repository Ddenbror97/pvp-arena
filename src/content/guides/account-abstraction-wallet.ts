import type { Guide } from "./types";

export const guide: Guide = {
  slug: "account-abstraction-wallet",
  cluster: "Crypto payments",
  keyword: "account abstraction wallet",
  secondary: ["erc-4337 wallet", "smart contract account", "useroperation"],
  title: "Account Abstraction Wallet: Smart Accounts, Same Risk",
  description:
    "An ERC-4337 account is a smart contract with its own signature and gas rules. It can still lose funds. You must be able to send a normal transfer.",
  h1: "Account abstraction wallet: programmable keys, ordinary losses",
  answer:
    "An account abstraction wallet, in the ERC-4337 sense, is a smart contract account. It sends a UserOperation, not a native transaction you broadcast yourself. Bundlers submit those operations through an EntryPoint. The account can define its own signature check, recovery, and who pays gas. The funds are still only as safe as that contract and the keys that satisfy it.",
  facts: [
    "ERC-4337 avoids a consensus change by using a higher-level UserOperation and an EntryPoint contract.",
    "The signature check is defined by the account, so multisig, passkeys, or a custom scheme are possible.",
    "Paymasters can sponsor gas or accept tokens. A sponsor can also refuse the operation.",
    "Custom recovery and guardians are features of the account code, not of the base chain.",
    "This site's terms accept Bitcoin, and USDC or ETH on Base, as ordinary transfers. The wallet has to be able to send one.",
  ],
  sections: [
    {
      id: "pieces",
      title: "The pieces ERC-4337 actually names",
      body: `The EIP calls a UserOperation a structure that describes what should be sent on a user's behalf. It has the fields you would expect on a transaction, including calldata and gas ceilings, plus fields the account needs. A bundler is the node that turns a set of UserOperations into one handleOps transaction. The EntryPoint is the contract that executes the bundle. The sender is the smart contract account.

That split is the product. Your "wallet" may be a website plus a contract, with the key living in a passkey, a phone, or a guardian set. [How to create a crypto wallet](/guides/how-to-create-a-crypto-wallet) is the single-key version. This page is the contract version. Both can be drained if you sign the wrong thing.

The cluster is [Crypto payments](/guides/topics/crypto-payments). [Gasless transactions](/guides/gasless-transactions) is the fee half of the same EIP.`,
    },
    {
      id: "what-you-gain",
      title: "What the extra machinery is for",
      body: `The EIP's motivation lists the reasons people accept the complexity. Validation can use a signature scheme other than the chain's default, including a multisig. Gas can be paid by a third party or with a token, which is how some apps onboard someone who has no native coin yet. Several actions can be bundled so they succeed or fail together.

None of those is a custody guarantee. A guardian who can recover the account can also be the person who takes it, if the recovery rules say so. A paymaster who sponsors you can set policy on what you are allowed to call. Read the account's own documentation for the specific app. The EIP does not set those policies.`,
    },
    {
      id: "cashier",
      title: "Sending a normal deposit from a smart account",
      body: `PVPspinArena's terms say the playable balance is a US-dollar ledger. Bitcoin, and USDC or ETH on Base, fund it. They are ordinary transfers on those networks. An account-abstraction wallet can be the sender if it can produce that transfer and pay, or have someone pay, the network fee. The site does not keep a separate "smart wallet balance."

If the app can only talk to its own contracts and cannot send USDC to an address you paste, it cannot fund this cashier. That is a limitation of the app, not a hidden deposit method.

[Base versus Ethereum](/guides/base-vs-ethereum) still matters. A smart account on one network does not appear on the other. [Wallet security checklist](/guides/wallet-security-checklist) still applies: do not reveal seeds, and do not grant an unlimited spend you do not need.

[How it works](/how-it-works) describes the games after the dollar balance exists. The account type does not change the game fee.`,
    },
    {
      id: "failures",
      title: "How these wallets fail",
      body: `The contract can have a bug. The guardian set can be wrong. The bundler or paymaster can be offline, so the account is temporarily unable to move even though the assets are still in it. A screen can describe a UserOperation in one sentence and encode another.

Treat the vendor's audit as the vendor's claim until you can read it. This page does not review a named wallet and does not rank them.

Adults only. A smoother login is not a reason to deposit rent money. [Responsible gambling](/responsible-gambling) is unchanged by the account standard.`,
    },
  ],
  faqs: [
    {
      q: "Is an account abstraction wallet a different blockchain?",
      a: "No. ERC-4337 is a higher-level flow on Ethereum-style chains. The account is a contract. The assets still sit on that chain.",
    },
    {
      q: "Who pays gas?",
      a: "You, in the native coin or in a token, or a paymaster that sponsors the UserOperation. The EIP allows all three. The app's screen has to say which one you are in.",
    },
    {
      q: "Can I recover it without a seed phrase?",
      a: "Only if that account's code says so, for example through a guardian. Recovery rules are not universal. Read the ones for the wallet you installed.",
    },
    {
      q: "Will PVPspinArena detect that I use a smart account?",
      a: "The cashier credits a Bitcoin or Base transfer into a US-dollar balance. It does not keep a separate smart-account ledger. The transfer has to arrive.",
    },
    {
      q: "Does a smart account make gambling safer?",
      a: "No. It changes how you authorise a transfer. The game still costs whatever its rules say, and a bug or a bad signature can still lose the funds.",
    },
  ],
  sources: [
    { label: "ERC-4337: Account Abstraction Using Alt Mempool", url: "https://eips.ethereum.org/EIPS/eip-4337" },
    { label: "PVPspinArena terms: balances and networks", url: "https://pvpspinarena.com/terms" },
  ],
  related: ["gasless-transactions", "how-to-create-a-crypto-wallet", "wallet-security-checklist", "base-vs-ethereum"],
  updated: "2026-10-21",
};
