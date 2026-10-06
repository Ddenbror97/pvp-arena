import type { Guide } from "./types";

export const guide: Guide = {
  slug: "connect-ledger-to-metamask",
  cluster: "Crypto payments",
  keyword: "connect ledger to metamask",
  secondary: ["ledger hardware wallet metamask", "ledger blind signing risk"],
  title: "Connect Ledger to MetaMask: Keys Stay on Device",
  h1: "Connect Ledger to MetaMask: Keys Stay on Device",
  description:
    "Connect Ledger to MetaMask so the device signs and the keys stay off the browser. Watch for blind signing and fake Ledger Live downloads.",
  answer:
    "Connect Ledger to MetaMask when you want MetaMask's screens and a Ledger's keys. The browser builds a transaction or a message. The Ledger signs it inside the device. Used that way, the private key does not sit in the extension. A signature comes back. That split is the whole point of the connection. MetaMask becomes an interface. The hardware wallet remains the place the secret lives.\n\nThis page stays on that relationship and on two ways it goes wrong: blind signing, and a fake Ledger Live download. It does not invent button sequences. Device menus change between models and firmware, and a frozen click-path becomes bad advice the month after it is published. Follow the prompts on your device and in the current official apps, and use the checks below to decide whether those prompts deserve a yes.\n\nFor a brand comparison, read [Ledger vs Trezor](/guides/ledger-vs-trezor). For the broader split between keys on a device and keys in a browser, read [cold wallet vs hot wallet](/guides/cold-wallet-vs-hot-wallet). PVPspinArena offers jackpot, coinflip, and roulette in USD. A hardware wallet is a poor place to keep a gambling bankroll connected to sites all evening. Gambling is for adults 21 and older, and only with money you can afford to lose.",
  facts: [],
  sections: [
    {
      id: "what-the-connection-changes",
      title: "What the connection changes",
      body: "A Ledger is a hardware wallet. Keys are created on the device, protected by your PIN, and backed up by a recovery phrase you write down at setup. MetaMask, by itself, is a hot wallet: the keys it creates live in the browser profile, encrypted by a password that a malware-infected computer may eventually see. Connecting the two lets you keep using websites that speak MetaMask while the signing key for those accounts stays on the Ledger.\n\nThe accounts you connect are Ledger accounts. They can look, in the interface, like any other account: an address, a balance, a button that says send or sign. The difference shows up when a signature is required. The computer waits. The device asks you to review. If the device is locked, unplugged, or running the wrong companion app for that asset, the signature does not happen. That pause is a feature. A hot account would have signed as soon as you clicked in the browser.\n\nConnecting does not merge your old MetaMask hot accounts into the device. Those hot accounts still have keys in the browser until you move the funds and stop using them. A common setup is a small hot account for low-stakes use and a Ledger account for savings. [Cold wallet vs hot wallet](/guides/cold-wallet-vs-hot-wallet) explains why that split exists. Connecting a Ledger does not automatically transfer coins. You still send from the old address to the new one, with a test first, if you want the balance to live under the device.\n\nThe device has its own apps and account types. An Ethereum-style account is what MetaMask can display. A Bitcoin or other non-EVM account on the same Ledger is a different account, handled in the workflow that asset expects. Seeing a Ledger in MetaMask does not mean every coin on the device now appears in the extension.",
    },
    {
      id: "metamask-as-the-screen-the-ledger-as-the-signer",
      title: "MetaMask as the screen, the Ledger as the signer",
      body: "Websites know how to talk to MetaMask. They do not all know how to talk to every hardware wallet directly. The connection lets the site ask MetaMask for an address, then ask for a signature, and MetaMask forwards the signing request to the device. You get the site's flow and the device's confirmation. You do not get a reason to skip the device screen. The browser preview can be tampered with by a malicious page or by malware. The device screen is the shorter, harder place to lie. Read it.\n\nA normal send should show an amount and a destination you recognize before you approve on the device. A message signature should be a message you expected, not a blob you were told to ignore. If the device shows an address, compare it with the address you meant, not only with the browser. The first and last characters are not enough if you can read more of them on the device. Attackers grind lookalike addresses that match the edges.\n\nLeave the device locked when you are not signing, and name the Ledger account so you do not connect savings to a casual site.",
    },
    {
      id: "what-should-stay-off-the-browser",
      title: "What should stay off the browser",
      body: 'The recovery phrase for the Ledger stays on the backup you made for the Ledger. It does not get typed into MetaMask. It does not get typed into Ledger Live. It does not get typed into a casino, an exchange, or a support chat. Typing it into MetaMask "so the balances show up" creates a hot copy of every account the phrase can derive. You have then connected nothing. You have imported a seed. The hardware device is no longer the boundary. Anyone who later steals that browser profile steals the funds the device was supposed to protect.\n\nMetaMask\'s own hot-wallet phrase, if you already had one, is a different secret. Keep it for the hot accounts it actually controls. Do not mix the words with the Ledger\'s words on one card "to stay organized." Two phrases, two backups, two jobs. The [Ledger vs Trezor](/guides/ledger-vs-trezor) guide covers how those devices think about backups and chips. Use it when you are choosing hardware. Use this page when the hardware you chose is a Ledger and the screen in front of the site is MetaMask.\n\nPIN codes stay on the device entry, typed on the device. A website that asks for the Ledger PIN is fake. Companion software may ask you to unlock the device. It does not need you to submit the PIN into a text box in the browser. The same rule covers any "passphrase" you added as an extra wallet on the device. That passphrase is part of the secret. A form does not need it to connect.\n\nSupport staff do not need a remote-control session to "finish the connection." A real connection is a local plug-in or a local secure channel between the official app and the device, plus your eyes on the device screen. A stranger driving your mouse can approve something you did not read, or can send you to a fake download. Decline the remote session.',
    },
    {
      id: "blind-signing",
      title: "Blind signing",
      body: 'Blind signing means the device cannot decode the transaction into a clear amount, token, and destination, so it asks you to approve raw data or a hash. Some complex contract calls still arrive that way, depending on the app, the contract, and the firmware. The risk is plain: you are trusting the computer\'s preview for the meaning, and the computer is the machine that may be lying. The device is only proving that someone pressed the buttons.\n\nPrefer operations the device can explain. A simple transfer of a well-known asset should be one of those, on current official Ethereum apps, when you are sending the native coin or a token the app understands. If the screen falls back to data you cannot read, stop. Ask whether this action is a plain send you could do in a clearer form. A swap, a permit, or an unfamiliar contract is a common moment for a blind prompt. You can skip the swap. You cannot un-sign it.\n\n"Enable blind signing" is a setting people flip because a transaction failed without it. The failure was information. The setting is a trade. Turn it on only if you accept that some approvals will be opaque, and turn it off again when you are done if the device lets you. Do not leave it on forever because one site demanded it. A malicious site loves an always-on blind mode. This article will not tell you which menu holds the toggle, because the menu moves. The current device manual is the map. Your standard is the part that should not move: if you cannot explain the prompt, do not approve it.\n\nClear signing, when your firmware and the transaction support it, shows human-readable details on the device. A pretty preview in the browser plus a blank device screen is the wrong combination. Wait for the device. Contract approvals deserve extra suspicion. A prompt that lets a contract spend tokens can be broader than the one action you think you are doing. Savings on a Ledger should rarely meet unlimited approvals from sites you opened for entertainment.',
    },
    {
      id: "fake-ledger-live-downloads",
      title: "Fake Ledger Live downloads",
      body: 'Ledger Live is Ledger\'s companion app for installing device apps, updating firmware, and managing accounts. MetaMask can work beside it. Attackers know you will search for the download the moment a connection fails. They buy ads, register lookalike domains, and stuff chat replies with "the official installer." The fake app asks for your recovery phrase to "restore the device" or to "sync MetaMask." The real setup flow does not collect that phrase into the computer.\n\nType Ledger\'s address yourself, or open the store listing you have verified before. Do not use the link in an email, a direct message, or a pop-up that appeared after you installed something else. Do not use a search ad. Bookmark the real page once you are sure, and use the bookmark next time. If an installer asks for the 24 words, close it, disconnect the device, and assume the machine needs a careful look before you plug the Ledger in again.\n\nFirmware and app updates belong to that same official app. A MetaMask error is not a reason to sideload a "Ledger patch" from a forum. Delaying an update is usually safer than installing a hurried one from the wrong publisher. The device will keep your keys while you go find the real update path. Scammers add urgency on purpose. A broken connection can wait until tomorrow if the alternative is a fake updater tonight.\n\nBuy the device new, from Ledger or a seller you can verify. Generate the phrase on the device during setup. If the box arrived with words already filled in, do not use those words. The [Ledger vs Trezor](/guides/ledger-vs-trezor) guide is there if you are still choosing a device. Neither brand wants your phrase on a website.\n\nPhishing also clones the "connect hardware wallet" moment inside a fake MetaMask. Check that the extension is the one you installed from the official source, not a lookalike with a slightly different icon that a malicious site told you to add. The hardware connection cannot save you from a fake wallet that simply asks you to import a seed.',
    },
    {
      id: "a-hot-wallet-still-has-a-job",
      title: "A hot wallet still has a job",
      body: "Connecting a Ledger does not mean every future click should come from the savings account. [Cold wallet vs hot wallet](/guides/cold-wallet-vs-hot-wallet) makes the case for a small hot balance you can afford to lose and a cold balance you do not connect to random sites. MetaMask is a convenient hot wallet and a convenient window onto a Ledger. Those are two roles. Keep them on two accounts.\n\nA gambling session is a hot-wallet job if you do it at all. You connect, you deposit a stake you already decided, and you are done. Pointing the Ledger account at a casino and approving a pile of contract calls is how savings meet blind prompts. PVPspinArena offers jackpot, coinflip, and roulette in USD. If you play, fund play from an amount you moved on purpose, not from the account that holds everything else.\n\nWhen the session is over, disconnect the site in the wallet's connected-sites list and lock the device. Disconnecting does not rewind a signature you already made. An approval you granted remains until you revoke it with another transaction. If a connection fails, check the cable, the unlock, and the official app before you install anything new. A page that offers to fix the failure by taking the recovery phrase is the actual emergency.\n\nYou are finished when you can say three things. The keys for the savings account are on the Ledger. MetaMask can ask that device to sign, and you can refuse on the device. The browser never received the phrase. Button labels will change. Those three sentences should not.\n\nThe rest of this subject is on the [Crypto payments guides](/guides/topics/crypto-payments). See [ledger vs trezor](/guides/ledger-vs-trezor), [cold wallet vs hot wallet](/guides/cold-wallet-vs-hot-wallet), [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [wallet](/wallet) before you play.",
    },
  ],
  faqs: [
    {
      q: "Does connecting a Ledger give MetaMask my private keys?",
      a: "Used as designed, the Ledger keeps the keys on the device and MetaMask asks the device to sign. The browser receives a signature, not a copy of the key.",
    },
    {
      q: "Should I type my Ledger recovery phrase into MetaMask?",
      a: "Keep the Ledger phrase on the backup you made for the device. Typing it into a browser wallet copies the keys onto that computer and throws away the hardware boundary.",
    },
    {
      q: "What is blind signing?",
      a: "Blind signing means the device asks you to approve data it cannot show in plain language. Prefer transactions the device screen can explain, and stop when the screen does not match what you expect to send.",
    },
    {
      q: "How do I avoid a fake Ledger Live download?",
      a: "Get companion software from Ledger's own site or the official store listing you can verify, and type the address yourself. A search ad, a support chat link, or a popup inside another app is a common fake.",
    },
    {
      q: "Can I use MetaMask with a Ledger for everyday sends?",
      a: "MetaMask can be the interface while you confirm each send on the device. Review the address and amount on the device screen before you approve.",
    },
    {
      q: "Is a Ledger the same thing as a hot wallet?",
      a: "A hardware wallet is built so the keys stay off the internet-connected computer. The cold wallet and Ledger versus Trezor guides compare that setup with a browser wallet you use for spending.",
    },
  ],
  sources: [],
  related: ["ledger-vs-trezor", "cold-wallet-vs-hot-wallet"],
  updated: "2026-09-26",
};
