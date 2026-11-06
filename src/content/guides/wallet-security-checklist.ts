import type { Guide } from "./types";

export const guide: Guide = {
  slug: "wallet-security-checklist",
  cluster: "Crypto payments",
  keyword: "wallet security tips",
  secondary: ["crypto wallet security", "secure your wallet", "wallet safety checklist"],
  title: "Wallet Security Checklist for Players | PvP Spin Arena",
  description:
    "A practical security checklist for a wallet you gamble from: fund separation, seed storage, approval discipline and casino phishing patterns.",
  h1: "Wallet Security Checklist for Gambling Balances",
  answer:
    "Wallet security tips for gambling balances start with a boring split: a hot play wallet funded with only this week’s stake, a separate savings wallet that never connects to casino sites, and zero tolerance for seed-phrase requests. Add short auto-lock, approval reviews, bookmark-only deposits and a monthly routine. The wallet cannot make a wager +EV; it can stop a stranger from finishing your bankroll for you.",
  facts: [
    "Play funds and savings should not share the same hot wallet risk.",
    "Seed phrases belong offline; casinos never need them.",
    "Message signatures log you in; token approvals can spend your tokens.",
    "Phishing domains and fake support DMs are the common casino-adjacent thefts.",
    "PVPspinArena uses message verification plus normal Base transfers—not spending allowances.",
  ],
  sections: [
    {
      id: "threat-model",
      title: "Threat model for a gambling wallet",
      body: `You are defending against phishing sites, malicious approvals, device malware, shoulder surfing and your own fatigue at 2 a.m. You are not defending against a mathematically fair game suddenly becoming unfair because MetaMask exists.

This checklist lives in [crypto payments](/guides/topics/crypto-payments). Adults 18+. Deep dives: [crypto wallet for gambling](/guides/crypto-wallet-for-gambling), [self-custody wallet](/guides/self-custody-wallet), [is MetaMask safe](/guides/is-metamask-safe), [seed phrase](/guides/seed-phrase).`,
    },
    {
      id: "hot-hygiene",
      title: "Hot wallet hygiene",
      body: `Install the wallet from the official store. Pin it. Auto-lock in minutes. Keep a thin browser profile for gambling—no random coupon extensions. Update when the vendor ships security fixes, not when a banner says “sync wallet.”

Mobile: official apps only. Avoid in-app browsers on casino promos for seed entry—there should be no seed entry at all after setup.`,
    },
    {
      id: "separation",
      title: "Separating play funds from savings",
      body: `Create a dedicated play account or phrase. Fund it with a weekly ceiling. Keep long-term holdings on a hardware wallet that never clicks “connect” on a casino. If the play wallet dies, the loss is pre-accepted.

[How to create a crypto wallet](/guides/how-to-create-a-crypto-wallet) is the setup sequence. [Cold wallet vs hot wallet](/guides/cold-wallet-vs-hot-wallet) explains the split.

| Wallet job | What it holds | What it should never do |
| --- | --- | --- |
| Play wallet | This week's stake only | Store savings or a seed photo |
| Savings wallet | Money you cannot click away | Connect to a casino or sign a casino prompt |
| Hardware wallet | The savings keys | Type its phrase into a browser | [What is a hardware wallet](/guides/what-is-a-hardware-wallet) covers how the device keeps keys offline, and [Ledger vs Trezor](/guides/ledger-vs-trezor) compares common hardware options. If you sign from MetaMask with the device attached, follow [connect Ledger to MetaMask](/guides/connect-ledger-to-metamask) so the key never leaves the hardware.`,
    },
    {
      id: "seed-rules",
      title: "Seed phrase storage rules",
      body: `Paper or metal. Offline. No photos. No cloud notes. No “support” chat. If you typed the phrase into a website, move funds to a new wallet immediately—password changes do not help.

Anyone asking for the phrase to “unlock a bonus” is stealing.`,
    },
    {
      id: "approvals",
      title: "Approval and signature discipline",
      body: `Read every prompt. Prefer message signatures and normal transfers. Reject unlimited token approvals for casino deposits. Periodically revoke stale allowances; [revoke token approvals](/guides/revoke-token-approvals) shows how to find and cancel them.

PVPspinArena: verify wallet with a signature, deposit USDC or ETH on Base via transfer shown on the real [wallet](/wallet) page.`,
    },
    {
      id: "phishing",
      title: "Phishing patterns in casino promos",
      body: `Lookalike domains in ads. Discord “admins.” Fake giveaways. Urgency timers. “Verify wallet” pages that request seeds. Bookmark the real site. [Fake casino sites](/guides/fake-casino-sites) lists tells, and [MetaMask scams](/guides/metamask-scams) covers the wallet-side versions of the same tricks.

If a stream overlay link differs from your bookmark, trust the bookmark.`,
    },
    {
      id: "monthly",
      title: "Monthly security routine",
      body: `1. Review connected sites; disconnect dead ones.
2. Review token approvals; revoke unknowns.
3. Confirm play wallet holds only the intended budget.
4. Check device updates and extension publisher names.
5. Re-read [responsible gambling](/responsible-gambling) limits before topping up.

Security keeps keys yours. Budgets keep nights finite. Games on [how it works](/how-it-works) still take a fee or edge.

For balances you cannot afford to lose to one device, use a [multisig wallet](/guides/multisig-wallet).

Play wallet versus savings wallet is the highest leverage split. Seeds stay offline forever.

Write down the network name you intend to use before you open the send modal. Speaking Base or Ethereum out loud sounds silly and prevents silent dropdown mistakes that explorers cannot undo. [How to send crypto](/guides/how-to-send-crypto) walks the full send screen, [what is a crypto wallet address](/guides/what-is-a-crypto-wallet-address) explains why the same address can exist on several chains, and [sent crypto to the wrong network](/guides/sent-crypto-to-wrong-network) covers what is recoverable if it already happened.`,
    },
  ],
  faqs: [
    {
      q: "What is the single highest-impact wallet security tip?",
      a: "Never share or type your seed phrase after setup, and keep savings offline from casino connects. That single habit blocks the most common total-loss stories players report.",
    },
    {
      q: "Should my gambling wallet be my main MetaMask account?",
      a: "Better as a separate account or phrase with a capped balance you can afford to lose in a bad week.",
    },
    {
      q: "Do I need a hardware wallet to gamble?",
      a: "Not for tiny play funds. Yes for anything you would hate to lose to a browser trick.",
    },
    {
      q: "Are message signatures dangerous?",
      a: "Plain login messages are usually safe. Blind-signing opaque data or approvals is where people get hurt. Read the prompt type.",
    },
    {
      q: "How does PVPspinArena fit this checklist?",
      a: "Use a play wallet, verify with a message, transfer on Base, skip approvals, and never hand over a seed.",
    },
  ],
  sources: [
    {
      label: "MetaMask — Stay safe checklist",
      url: "https://support.metamask.io/stay-safe/safety-in-web3-start-here/",
    },
    { label: "Ethereum.org — Wallets security", url: "https://ethereum.org/en/security/" },
  ],
  related: [
    "crypto-wallet-for-gambling",
    "self-custody-wallet",
    "seed-phrase",
    "is-metamask-safe",
    "metamask-scams",
    "multisig-wallet",
  ],
  updated: "2026-11-05",
};
