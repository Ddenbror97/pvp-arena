import type { Guide } from "./types";

export const guide: Guide = {
  slug: "gasless-transactions",
  cluster: "Crypto payments",
  keyword: "gasless transactions",
  secondary: ["paymaster", "erc-4337 gas", "who pays the gas fee"],
  title: "Gasless Transactions: Who Pays the Fee You Skip",
  description:
    "A gasless transaction still has a network fee. ERC-4337 lets a paymaster sponsor it or take an ERC-20. You still sign. Read who pays.",
  h1: "Gasless transactions: the fee moved, it did not disappear",
  answer:
    "Gasless transactions are a label for a blockchain action where you do not pay the network fee in the chain's native coin. Under ERC-4337, a paymaster can sponsor that fee or let you pay with an ERC-20 token. You still sign the operation. Someone still pays the validator. If you cannot see who, you do not know the price.",
  facts: [
    "ERC-4337 introduces a UserOperation, which is not itself a base-layer transaction.",
    "Bundlers package UserOperations into a transaction that calls an EntryPoint contract.",
    "The EIP lists sponsored fees and ERC-20 fee payment as reasons to abstract gas.",
    "A signature on a UserOperation is defined by the account, not by a single protocol rule.",
    "PVPspinArena's terms say Bitcoin and Base network fees are separate from the game fee. They do not describe a gasless cashier.",
  ],
  sections: [
    {
      id: "what-moved",
      title: "What the word gasless is hiding",
      body: `Every included action on a public chain costs a validator something. "Gasless" means that cost is not coming out of your ether, or your Base ETH, in the transaction you personally broadcast. It can be paid by an app, deducted from a token, or bundled into a price you already accepted.

ERC-4337, "Account Abstraction Using Alt Mempool," is the specification people mean when they talk about this on Ethereum and on EVM networks that support it. Users send UserOperation objects to a separate mempool. Bundlers package those objects into a handleOps call on an EntryPoint contract, and that call is the transaction that lands in a block.

The EIP's motivation says abstracting gas payments allows a third party to pay, or the user to pay with tokens. That is the mechanism. It is not a statement that the fee is zero.

The cluster home is [Crypto payments](/guides/topics/crypto-payments). [Gas fees explained](/guides/gas-fees-explained) is the native-coin version of the same bill. Read both before you treat a "no gas" button as a discount.`,
    },
    {
      id: "what-you-sign",
      title: "You still authorise the action",
      body: `A UserOperation carries calldata, gas fields, a nonce, and a signature. The EIP says the signature's meaning is defined by the smart-account implementation, not by the protocol. That is useful, and it is also the risk: you are trusting that account's validation code to do what the screen said.

A paymaster that sponsors you can also refuse you. Sponsorship can be limited to one app, one token, or one spending cap. If the paymaster stops, your "gasless" action stops, even though your keys still exist.

None of this removes a game fee, a spread, or a bad price. It only changes who transmits the chain fee.

If a site asks you to paste a seed phrase so it can "cover gas," that is not a paymaster. Stop. [Wallet security checklist](/guides/wallet-security-checklist) is the refusal list.`,
    },
    {
      id: "this-cashier",
      title: "What this site's cashier actually says",
      body: `The terms say Bitcoin deposits and withdrawals use the Bitcoin network, and USDC and ETH deposits and withdrawals are supported on Base. Network fees for those transactions are separate from the game fee. The page does not offer a sponsored UserOperation as the deposit method.

So a deposit here is an ordinary transfer you pay to send, unless a future terms page says otherwise. Do not assume a gasless toggle that some other app advertises. [Base versus Ethereum](/guides/base-vs-ethereum) is the network distinction: the same-looking address on the wrong network does not arrive.

[How it works](/how-it-works) is the game list. The chain fee and the game fee are different lines on purpose.`,
    },
    {
      id: "check",
      title: "Questions worth asking before you tap the button",
      body: `Who broadcasts the transaction, and which contract do they call? Which token, if any, is debited for the fee, and is that debit shown before you sign? Can the sponsor refuse the operation after you have approved something else? Does the screen ask for a seed phrase or a spending approval that outlives this one action?

Adults only. A missing gas prompt is not a reason to deposit money you need. [Responsible gambling](/responsible-gambling) is the stop, including when the prompt looked free.

[How to create a crypto wallet](/guides/how-to-create-a-crypto-wallet) covers the key you should still control. A sponsored fee does not move custody of that key to the sponsor.`,
    },
  ],
  faqs: [
    {
      q: "Does gasless mean the network fee is zero?",
      a: "No. It means you are not the one paying it in the chain's native coin. A paymaster, a token debit, or an app can be paying it instead.",
    },
    {
      q: "What is a paymaster?",
      a: "In ERC-4337, it is the contract that can sponsor a UserOperation or accept an ERC-20 in place of the native gas token. The EIP describes that role. A given app's paymaster has its own rules.",
    },
    {
      q: "Do I still have to sign?",
      a: "Yes. A UserOperation includes a signature. What that signature authorises depends on the account implementation, so read the prompt.",
    },
    {
      q: "Are PVPspinArena deposits gasless?",
      a: "The terms describe ordinary Bitcoin and Base transfers, and say those network fees are separate from the game fee. They do not describe a sponsored deposit.",
    },
    {
      q: "Can a gasless button ask for my seed phrase?",
      a: "A real paymaster flow does not need your seed phrase. A prompt that asks for it is a theft attempt.",
    },
  ],
  sources: [
    { label: "ERC-4337: Account Abstraction Using Alt Mempool", url: "https://eips.ethereum.org/EIPS/eip-4337" },
    { label: "PVPspinArena terms: networks and fees", url: "https://pvpspinarena.com/terms" },
  ],
  related: ["gas-fees-explained", "account-abstraction-wallet", "base-vs-ethereum", "wallet-security-checklist"],
  updated: "2026-10-21",
};
