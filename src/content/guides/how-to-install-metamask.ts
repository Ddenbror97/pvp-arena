import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-install-metamask",
  cluster: "Crypto payments",
  keyword: "how to install metamask",
  secondary: ["install metamask extension", "metamask download official"],
  title: "How to Install MetaMask Without a Fake Extension",
  h1: "How to Install MetaMask Without a Fake Extension",
  description:
    "How to install MetaMask from an official store listing, create a local wallet, and avoid fake extensions that ask for a seed phrase.",
  answer:
    "How to install MetaMask starts with the publisher, not with a casino banner. MetaMask is a self-custody wallet: a browser extension and a mobile app that keep keys on your device. The company does not hold your Secret Recovery Phrase, and there is no password reset that recovers a lost phrase. The install creates software. The phrase, which the app shows you if you create a new wallet, creates the keys. A page that mixes those two steps and asks you to type the words into the website is not an install. It is a theft form.\n\nYou are an adult making a tool choice. Gambling is only for people 21 or older, and only with money you can afford to lose. Installing a wallet does not require you to wager, and it does not improve the odds if you do.",
  facts: [],
  sections: [
    {
      id: "what-the-install-actually-puts-on-the-device",
      title: "What the install actually puts on the device",
      body: "On a computer, the install adds an extension to one browser profile. A work profile and a personal profile do not share it. On a phone, the install adds the official app from the official app store. Either copy can create a new vault or restore an existing one. The local password you choose encrypts that vault on that device. It is not an account password stored at the company, and it will not follow you to a new computer unless you restore with the phrase.\n\nThe first launch asks whether you are new or whether you already have a Secret Recovery Phrase. New means the app generates the phrase and shows it once for you to record offline. Restore means you type an existing phrase into the official app, not into a website, because you already created that wallet somewhere else. Both paths end with addresses the app can display. Neither path gives the company a copy of the words.\n\nAfterward the wallet can show Ethereum and other EVM networks. The network list inside the app is the source of truth for what that install supports. MetaMask does not natively hold Solana, Bitcoin, or XRP the way Phantom or a Bitcoin wallet does. Do not judge the install a failure because those assets are absent. Do not fix that absence by adding a Snap from a link in an ad. Snaps and bridges are optional add-ons with extra trust, and this guide will not walk through a Snap install a fake site could copy.",
    },
    {
      id: "official-listing-versus-a-lookalike",
      title: "Official listing versus a lookalike",
      body: "The safe pattern is short. Open the publisher’s official website yourself, or open your browser’s extension store yourself. Follow the listing that official site identifies. Read the publisher name the store shows. Install from that listing. On mobile, use the store that came with the phone, search the app name, and match the publisher before you tap install. Pause if the icon art matches and the publisher name does not.\n\nLookalikes use a close domain, a sponsored search result, a post in a chat, or a “download” button on a gambling site. The file may be named like the real extension. The page may show screenshots of the real setup, then a form for the Secret Recovery Phrase “to finish installing.” Close it. The real flow never needs the phrase on a download page. If you are creating a new wallet, you do not have a phrase yet. If you are restoring, you enter it only in the app you installed from the official listing.\n\n[Is MetaMask safe](/guides/is-metamask-safe) is the follow-up once the real extension is present: what the app can protect, and what a leaked phrase defeats anyway. Install is only the first gate. A genuine app still signs whatever you approve. Pin the extension so you open it from the toolbar, not from a link a page draws to look like a button.",
    },
    {
      id: "new-wallet-restore-and-the-local-password",
      title: "New wallet, restore, and the local password",
      body: "Choose “create” when you do not already have a phrase. The app will show the words. Write them on paper, in order, and store that paper offline. Do not photograph them, do not email them, and do not type them into a “backup” website the next tab suggests. Confirm the words if the app asks you to check your copy. Then set a local password you can remember, because that password is what opens the vault on this device day to day. If you forget it and you still have the paper, you can restore inside the official app. If you skip the paper, the password is not a backup the company can reset.\n\nChoose “restore” or “import” only when the phrase is already yours and you are typing it into the official app. Count the words the app expects. Do it on a device you control, not on a public computer, and not by reading the words to someone on a call who says they will type them for you. When the restore finishes, check that the address matches an address you have used before, if you have one written down separately from the phrase. A restore that shows a brand-new address you have never funded may mean a typo in the words. Stop and recheck the paper before you send anything.\n\nYou can add more accounts later under the same phrase. Each account has its own address. The install does not force you to keep savings and play money on one address. It also does not create a casino balance. A wallet balance and a site balance are different until you send a transaction you meant to send.",
    },
    {
      id: "install-steps-that-avoid-a-fake-page",
      title: "Install steps that avoid a fake page",
      body: "These steps stay in the store and in the official app. They do not include a website form for the phrase, and they do not include a Snap install.\n\n### Open the store yourself\n\nType the publisher’s official site or open the browser’s extension directory from the browser menu. Do not use a download button embedded in a casino, a video description, or a direct message. On a phone, open the official app store the same way.\n\n### Match the publisher, then install\n\nRead the publisher name on the listing. If it matches the official site’s listing, install. If the name is a near miss, back out. The extension should land in the profile you are using. If you need it in a second profile, install it there too from the same official listing. Do not copy a file between computers from a chat attachment.\n\n### Create or restore inside the app\n\nOpen the extension from the toolbar, or open the mobile app from the home screen. Create a new wallet or restore with a phrase you already hold. Set the local password in that app. If any step moves you to a full website that wants the phrase, you are no longer in the install. Close it.\n\n### Write the phrase offline before you fund anything\n\nIf this is a new wallet, record the Secret Recovery Phrase on paper while the app is showing it. Confirm you can read your own handwriting. Put the paper somewhere that is not your browser. Only then consider funding the address. A vault with no backup and a balance in it is one browser reset away from a lockout the company cannot undo.\n\n### Check the network list and stop\n\nOpen the network list in the app and see which EVM networks it offers. That list is the source of truth. Do not add networks from a popup you did not intend to open. Do not hunt for Solana or Bitcoin inside this install and then follow a third-party fix. You have finished how to install MetaMask when the app unlocks with your local password and you know where the paper backup is.",
    },
    {
      id: "after-the-icon-is-real",
      title: "After the icon is real",
      body: "Funding, swapping, and connecting to sites are later jobs. [MetaMask casino](/guides/metamask-casino) explains connection and signatures if you choose to use the wallet with a gambling site that accepts an EVM wallet. Read prompts. A connection is not an unlimited token approval. A message you can read is not a blind hash. You can use the wallet for months and never connect it to a casino.\n\nPVPspinArena settles jackpot, coinflip, and roulette in USD. It does not require this install. If you never want those games, the wallet is still only a keyring for the networks it lists. If you do play elsewhere, keep a separate account for the play amount so the address you connect is not your long-term savings. The phrase backs up every account under it, so the paper backup still matters after you split accounts.\n\nUpdates should come from the same store listing. A popup inside a random website that says your MetaMask is out of date and offers an installer is the fake-extension pattern again. Open the store yourself and see if an update exists. Remove a lookalike if you installed one, and if you typed a phrase into it, move funds to a new phrase using a clean official install. The old words are no longer secret.",
    },
    {
      id: "what-a-finished-install-does-not-change",
      title: "What a finished install does not change",
      body: "The extension can be deleted later. Deleting it removes the local vault from that profile. It does not delete the on-chain account. The keys still control the funds if the phrase exists. That is why the paper backup comes before any balance, and why you do not “clean up” the browser until you know the phrase is written down. There is no support ticket that replaces a skipped backup.\n\nA second profile is a second install. If you switch browsers or you use a work profile and a home profile, repeat the store check in each one rather than copying a folder from a message. The mobile app does not automatically prove the desktop extension is genuine, and the desktop icon does not prove the phone app is genuine. Match the publisher in each store. Then create or restore. Then stop. You do not need a casino account to finish the setup, and you do not need to buy a token the same day.\n\nThe install also does not make you anonymous, and it does not make a game fair or unfair. It does not set a gambling limit. It does not hold a dollar balance for you. It shows token balances on the networks it understands, and it signs what you confirm. How to install MetaMask well is mostly refusal: refuse the wrong publisher, refuse the phrase form, refuse the add-on you do not need, and keep the local password separate from the words on paper.\n\nThe rest of this subject is on the [Crypto payments guides](/guides/topics/crypto-payments). See [is metamask safe](/guides/is-metamask-safe), [metamask casino](/guides/metamask-casino), [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [wallet](/wallet) before you play.",
    },
  ],
  faqs: [
    {
      q: "How to install MetaMask without grabbing a fake extension?",
      a: "Start from the publisher’s official site or the browser’s official extension store, and match the publisher name the store displays. Do not install from a button on a casino, an ad, or a file a stranger sent.",
    },
    {
      q: "Does installing MetaMask give the company my Secret Recovery Phrase?",
      a: "MetaMask is a self-custody wallet, so the phrase is shown to you on your device and the company does not keep a copy. There is no password reset that recovers the phrase if you lose it.",
    },
    {
      q: "Can I install MetaMask and hold Solana or Bitcoin natively?",
      a: "The native networks are Ethereum and EVM chains. The install does not turn MetaMask into a Solana or Bitcoin wallet, and the in-app network list is the source of truth afterward.",
    },
    {
      q: "Should the download page ask me to type a seed phrase?",
      a: "The phrase appears inside the official app after you create a wallet, for you to write down offline. A website form that collects those words during install is an attack.",
    },
    {
      q: "Do I need to install MetaMask for PVPspinArena?",
      a: "PVPspinArena settles jackpot, coinflip, and roulette in USD and does not require MetaMask. Install a wallet only if you have your own reason to hold EVM assets.",
    },
  ],
  sources: [],
  related: ["is-metamask-safe", "metamask-casino"],
  updated: "2026-09-26",
};
