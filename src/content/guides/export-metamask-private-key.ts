import type { Guide } from "./types";

export const guide: Guide = {
  slug: "export-metamask-private-key",
  cluster: "Crypto payments",
  keyword: "export metamask private key",
  secondary: ["metamask account private key", "reveal metamask key risk"],
  title: "Export MetaMask Private Key: Risks and Limits",
  h1: "Export MetaMask Private Key: Risks and Limits",
  description:
    "Exporting a MetaMask private key reveals one account. Anyone with that key can spend the funds. Never reveal it on a call, a screen share, or a website form.",
  answer:
    'Export MetaMask private key is a request the wallet can fulfill and almost nobody should make. The export shows the spending secret for one account. Anyone who sees it can move what that account holds, on every network that account can reach, without your password and without another prompt on your phone. The usual theft is not a genius hack. It is a screen share, a remote-support session, or a website form that asks you to paste the key "so we can verify the wallet."\n\nDo not do this on a call. Do not do it while a stranger can see your screen. Do not type the key into a chat, a ticket, a Google form, or a page that claims to be support. This article explains what the secret is and what it is not. It does not print a click-path. Menu names change, and a written click-path is exactly the script a phisher reads back to you as if they were official help.\n\nMetaMask is a [self-custody wallet](/guides/self-custody-wallet). You hold the keys. The company does not keep a spare that can undo a transfer. How you store the broader backup, the secret recovery phrase, is covered in the [seed phrase](/guides/seed-phrase) guide. Read that page before you write anything down. This page stays on the single-account key and the ways it leaks.\n\nGambling is for people 21 or older, and only with money you can afford to lose. A leaked key does not care whether the coins were for play or for savings. It spends both.',
  facts: [],
  sections: [
    {
      id: "what-the-private-key-is",
      title: "What the private key is",
      body: "A MetaMask wallet starts from a secret recovery phrase. From that phrase the app derives accounts. Each account has an address you can share and a private key you must not share. The address is the public name. People can send funds to it. The private key is the ability to sign. Signing is how coins leave.\n\nThink of the phrase as the master backup and the private key as the key to one door in that house. Exporting the private key opens that one door for whoever copies it. It does not, by itself, list every other account. That limit is real and easy to over-read. If the account you export is the one that holds the money, one key is enough for a thief. If you later import that same key into another app, you have copied the door onto a second device. You have not created a second lock.\n\nThe key is a long secret. Wallets sometimes show it as a hex string. A photo, a screenshot, a clipboard history, and a screen recording are all copies. Treat every display of the key as a copy you now have to track.\n\nThe app password only locks the extension on that browser. It is not the private key. Someone who has the private key does not need the password at all. They import the key into a wallet they control and sign from there.",
    },
    {
      id: "what-an-export-reveals-and-what-it-leaves-alone",
      title: "What an export reveals, and what it leaves alone",
      body: 'An export is tied to the account you have selected. The address for that account and the key for that account are a pair. Other accounts created in the same MetaMask wallet have their own keys. Those other keys stay unshown until someone reveals them too, or until someone has the secret recovery phrase, which can derive them all.\n\nThat is why "I only exported one account" is a narrow sentence. It is true about the export. It is false comfort if the recovery phrase has already been photographed, typed into a site, or stored in a notes app. The phrase is the wider secret. Storage, paper backups, and the rule that no support agent needs the words live in the [seed phrase](/guides/seed-phrase) guide. Use that guide for the phrase. Use this one to remember that a single key is already a full spend authority for its account.\n\nExporting does not move coins by itself. The danger is disclosure. After the key is on another machine, the other machine can sign whenever it wants. You might still see the balance in MetaMask until the outgoing transfer confirms. Seeing the balance is not control. Control is who can sign.\n\nThe export also does not show a private key for a hardware wallet account that MetaMask is only displaying. If the account was added through a device that signs internally, the browser is not supposed to hold that key. A screen that offers to reveal a key for an account is a sign you are looking at a hot account, or at a fake prompt. Hardware accounts stay on the device. Typing a hardware wallet\'s recovery phrase into MetaMask to "export" it copies those keys into the browser and ends the hardware protection. That is a new hot wallet, not a view of the old one.\n\nNetworks do not each have a separate key for the same account. One Ethereum-style account uses the same key on every Ethereum-style network. Revealing it reveals spending power for the ether and the tokens that account holds on each of those networks. A thief does not need you to be switched to the right network in your extension.',
    },
    {
      id: "who-can-spend-after-the-key-is-visible",
      title: "Who can spend after the key is visible",
      body: 'Possession is the whole permission. A person, a malware program, or a script that holds the key can build a transfer, sign it, and broadcast it. They can do that at 3 a.m. They can split the funds across many addresses. They can wait until a later deposit lands and take that too. The chain accepts a valid signature. It does not ask whether the signer was the person who created the wallet.\n\nYou will not get a MetaMask pop-up on your machine when they spend, because they are not using your machine. Your pop-up only appears when a site asks the extension on that browser to sign. An imported key elsewhere bypasses your extension completely. If you still have funds in the exposed account, move them to a new account whose key has never been displayed, from a device you believe is clean. Do that before you do anything else with the old account. Then assume the old account will be drained the moment anything new arrives.\n\nMalware does not need you to export on purpose. It looks for files, clipboard contents, and screenshots. Exporting "just for a minute" creates the artifact malware is hunting. If a site told you to export so it can "connect" you, the site is the malware, even if the rest of the page looks like a casino, a wallet, or a bank.',
    },
    {
      id: "do-not-do-this-on-a-call",
      title: "Do not do this on a call",
      body: 'Do not do this on a call. Read that as a rule, not as a style warning.\n\nNo employee of MetaMask, no exchange agent, no casino support account, and no "recovery specialist" needs your private key. They do not need it to find a transaction, to speed a deposit, or to prove you own an address. Ownership is proved by signing a message or sending a tiny amount from the address, and even those steps should happen only on a site you opened yourself. A key is never the proof they should ask for.\n\nThe call usually follows a script. There is urgency. A prize, a frozen account, or a stuck deposit will clear if you validate the wallet. Hang up. Close the screen share. If you reached them from a search ad, a direct message, or an unexpected email, you were not talking to the company. Starting the call yourself does not make a reveal safe. The secret is unsafe in any conversation.\n\nIf someone has already walked you through a reveal, treat the key as public. Move funds to a fresh wallet. Do not reuse the exposed account for a new deposit because the balance looks untouched. Attackers often wait. Change passwords on email and exchange accounts from a device that did not perform the export, in case the same session stole those too. Then read the [seed phrase](/guides/seed-phrase) guide and make the new backup offline. Do not store the new phrase in the same notes file or the same screenshot roll as the leaked key.',
    },
    {
      id: "the-usual-theft-paths",
      title: "The usual theft paths",
      body: 'Most losses that start with "export" follow a short list.\n\nA website form is the clearest one. The page looks like a wallet unlock, a casino login, or a giveaway. It asks for the private key or the recovery phrase and calls that step verification. You paste. Their server receives the secret. Minutes later the account is empty. Sometimes the page is a typo of a real domain. Sometimes it was linked from a comment under a video about exporting keys. The article you wanted and the form you found are not the same site.\n\nA screen share is the second path. The attacker never receives a paste. They watch. They may tell you the characters out loud so you think they are helping you check the copy. They are reading it into their own notes.\n\nA remote desktop is the third. Once another person can click, they do not need you to understand the export. They need the computer unlocked and the wallet password typed. "Type your password so I can fix the sync" is the moment the session became theirs.\n\nA cloud backup is the fourth, and it feels less like theft. You exported to "save it," the phone uploaded the screenshot, and a later account break-in on the photo library takes the key. The thief never met you. The export still did the damage.\n\nA fake support chat is the same theft with a widget. You searched an error, opened the first result, and the widget offered to restore funds if you reveal the key. The person who receives the key is the new owner.\n\n[Self-custody](/guides/self-custody-wallet) means those paths have no company undo. The phrase "not your keys, not your coins" also runs the other way: once the key is theirs, the coins are theirs. The chain will not check your chat logs.',
    },
    {
      id: "a-safer-way-to-move-or-restore-access",
      title: "A safer way to move or restore access",
      body: 'People look up an export for a few honest reasons. They want to use the same account in another wallet. They are leaving a computer. They think a site requires the key to connect. Only the first two are even in the neighborhood of a real task, and both have a safer route.\n\nTo use a wallet on a new device, restore from the secret recovery phrase inside the official app, on a machine you control, with no one watching. That process recreates the accounts without you painting a single key across a chat window. The [seed phrase](/guides/seed-phrase) guide explains how to keep that phrase offline and how to spot the tricks that ask for it. Follow that storage advice. Do not invent a parallel system where the private key sits in email "in case the phrase is lost." Two copies in two unsafe places are worse than one careful paper backup.\n\nTo move funds, send them in the app with a normal transfer to a new address you control. You sign inside the wallet. The private key never has to appear as text. A small test, then the rest, is the same habit you would use for any send. The receiving wallet should be one you set up fresh if you suspect the old browser was exposed.\n\nA site that says it cannot connect unless you export the key is asking for the wrong proof. Connecting a wallet shares an address and lets you approve a signature. It does not require a paste. PVPspinArena offers jackpot, coinflip, and roulette in USD, and a legitimate connection there is a wallet prompt you can reject. Any game site that demands a raw key is done talking to you. Close it.\n\nIf the account is on a hardware device, leave the key on the device. MetaMask can request signatures. The device approves them. Copying the device seed into the browser so the browser can show a private key ends the hardware protection. When you are unsure, do not reveal the key to check the format. Showing it gives the account away.\n\nThe rest of this subject is on the [Crypto payments guides](/guides/topics/crypto-payments). See [self custody wallet](/guides/self-custody-wallet), [seed phrase](/guides/seed-phrase), [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [wallet](/wallet) before you play.',
    },
  ],
  faqs: [
    {
      q: "Does exporting a MetaMask private key reveal every account?",
      a: "The exported key belongs to the one account you reveal. The secret recovery phrase can recreate every account in that wallet, which is why seed storage belongs in the seed phrase guide.",
    },
    {
      q: "Can someone steal funds with only the private key?",
      a: "Anyone who has the private key can sign transfers and spend what that account holds. They do not need your password, your email, or your phone once they have the key.",
    },
    {
      q: "Should I export my key on a support call?",
      a: "Do not do this on a call. A screen share, a remote-control session, or a form a caller tells you to paste into is a common way keys are stolen.",
    },
    {
      q: "Is the private key the same as the secret recovery phrase?",
      a: "They are different secrets. The phrase is the backup for the wallet, and a private key is the spending secret for one account derived from that backup.",
    },
    {
      q: "What should I do if I already pasted my key into a website?",
      a: "Move the remaining funds to a new wallet you control, using a device you trust, as soon as you can. Treat the exposed account as public, and read the seed phrase guide before you store the new backup.",
    },
    {
      q: "Can MetaMask support recover a leaked key?",
      a: "A self-custody wallet has no company vault that can claw funds back. Once someone spends from the key, the transfer is a normal blockchain transaction.",
    },
  ],
  sources: [],
  related: ["self-custody-wallet", "seed-phrase"],
  updated: "2026-09-26",
};
