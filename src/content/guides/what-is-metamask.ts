import type { Guide } from "./types";

export const guide: Guide = {
  slug: "what-is-metamask",
  cluster: "Crypto payments",
  keyword: "what is metamask",
  secondary: ["metamask wallet explained", "metamask browser extension"],
  title: "What Is MetaMask? A Self-Custody Wallet, Explained",
  h1: "What Is MetaMask? A Self-Custody Wallet, Explained",
  description:
    "What is MetaMask: a self-custody wallet for Ethereum and EVM chains. The company does not hold your Secret Recovery Phrase or funds.",
  answer:
    "What is MetaMask? It is a self-custody wallet for Ethereum and other EVM chains, shipped as a browser extension and a mobile app. You hold the keys. The company does not hold your Secret Recovery Phrase, and there is no password reset that recovers a lost phrase. The app shows balances, builds transactions, and asks you to confirm them. Funds are not an account balance sitting on MetaMask’s servers. If you lose the phrase and have no other backup, the company cannot recreate it.\n\nThat design is the whole product. A website can request a connection. It cannot spend from your wallet unless you approve a transaction or a token allowance. Gambling is only for people 21 or older, and only with money you can afford to lose. Understanding the wallet does not make a wager profitable.",
  facts: [],
  sections: [
    {
      id: "a-self-custody-wallet-not-a-company-account",
      title: "A self-custody wallet, not a company account",
      body: "A custodial account, such as a balance at an exchange, is an IOU. The company signs the real transactions. If the company freezes the login, you wait on their process. MetaMask is the other shape. The software on your device holds the keys derived from the Secret Recovery Phrase. You sign sends and messages. The vendor does not keep a copy of that phrase that can move funds when you forget a password.\n\nPeople still talk about a “MetaMask account” as if it were an email login. The closer picture is a keyring. The extension or app is the interface. The phrase is the backup of the keys. The addresses are what other people see when you receive funds. You can install the interface on a new phone, enter the phrase inside the official app, and reach the same addresses. You cannot email support a photo of your ID and have them reissue the phrase. That limitation is the point of self-custody, and it is also why phishing works: attackers pretend the limitation is not real.\n\nPVPspinArena settles jackpot, coinflip, and roulette in USD. MetaMask is not required to play those games. The site is not a wallet vendor and it does not custody your Secret Recovery Phrase. If you choose a self-custody wallet for an Ethereum-style deposit somewhere, you are still the signer. A dollar balance on a gaming site is a separate ledger from the tokens sitting in the wallet until you send them.",
    },
    {
      id: "what-the-phrase-and-the-password-each-do",
      title: "What the phrase and the password each do",
      body: "When you create a wallet, MetaMask shows a Secret Recovery Phrase and asks you to record it. From those words the app derives your private keys and addresses. Anyone who has the phrase can move the funds on every chain those keys control, without your local password and without asking the company. The password is different. It encrypts the vault on that browser profile or phone so a stranger who opens the unlocked screen for a minute cannot click send. It is not a master key stored at MetaMask headquarters.\n\nForget the password and still have the phrase, and you can restore inside the official app and pick a new local password. Forget the phrase and lose the only device where the vault was saved, and there is no reset desk. Write the phrase down offline when the app shows it. Do not type it into a website, a notes app synced to the cloud, or a chat with someone who claims to be support. This guide will not teach a storage ritual beyond that warning. The job here is to name the object so later guides can cover how to keep it.\n\nA common lie in “what is MetaMask” videos is that the password recovers everything. It recovers access to a vault that is still on the device. It does not travel with you. Reinstalling the browser, switching profiles, or removing the extension can remove that local copy. The on-chain addresses remain. Only the phrase, or another backup you made on purpose, brings the keys back.",
    },
    {
      id: "ethereum-evm-chains-and-what-it-does-not-hold-na",
      title: "Ethereum, EVM chains, and what it does not hold natively",
      body: "MetaMask’s native networks are Ethereum and EVM chains that speak the same style of address and transaction. You can add networks the app supports, and the network list inside your install is the source of truth. Marketing pages and casino help desks go stale. If a network is not in the app you are holding, do not follow a popup from a random tab that offers to “fix” that by collecting your phrase.\n\nMetaMask does not natively hold Solana, Bitcoin, or XRP the way Phantom or a Bitcoin wallet does. Those assets live on different systems, with different address formats and different signing rules. Optional Snaps or bridges sometimes claim to extend a wallet toward another chain. They are add-ons with extra trust: more code, more prompts, and another place a fake site can imitate. This guide does not walk through installing a Snap. If you need Solana for a Solana game, use a Solana wallet. If you need bitcoin, use a Bitcoin wallet. Forcing those assets into an EVM interface is how people send coins to an address that cannot receive them.\n\nThe same 0x-style address can exist on more than one EVM network because the key is the same and the ledgers are not. A token you see on one network is not automatically on another. Read the network name in the app before you send. Gas, the fee for the transaction, is paid in the network’s native coin, and the wallet shows an estimate before you confirm. Do not treat a ticker symbol alone as proof you are on the right ledger.",
    },
    {
      id: "accounts-addresses-and-what-strangers-can-see",
      title: "Accounts, addresses, and what strangers can see",
      body: "One Secret Recovery Phrase can derive many accounts. MetaMask lists them in an account switcher. Each has its own address. Nicknames you assign, such as “play” or “savings,” stay on your device. The chain and any website store the address. Connecting the wrong account is a successful action aimed at an empty or unintended address.\n\nBalances are public on the chain once someone knows the address. That is normal. It becomes a privacy problem when one address receives a salary, holds savings, and pays a gambling site, and then the address is pasted into a public chat. A separate account funded only with a play amount keeps the rest of the keyring off that trail. The phrase still backs up every account derived from it. Separating accounts is not the same as having two independent phrases.\n\nReceiving is copying an address from the wallet and giving it to the sender. Copy it from the official app, not from a screenshot a stranger edited. Sending is choosing the asset, the amount, the network, and the destination, then confirming inside the wallet. The company does not reverse a send you signed. There is no chargeback desk for a self-custody transfer.",
    },
    {
      id: "connecting-to-a-site-versus-moving-funds",
      title: "Connecting to a site versus moving funds",
      body: "A connection shares a public address and lets the site send later requests to the wallet. A message signature can prove you control that address. A transaction can move the asset you chose. A token approval can allow a contract to pull that token later, up to a cap that is sometimes unlimited. Those four actions look similar in a popup and they are not interchangeable. A site that only needs to know who you are should stop at a connection and a readable signature.\n\n[MetaMask casino](/guides/metamask-casino) walks through that pattern in a gambling setting: connect, read what you sign, and do not hand over the phrase. The casino still cannot see the phrase if you never type it. Blind requests, where the wallet shows a hash you cannot read, are a reason to reject, not a fancier login. Unlimited approvals are a reason to reject when the site only needed a normal transfer.\n\nYou can review and remove connected sites in the wallet. Disconnecting stops new requests from that site. It does not undo a transaction already confirmed, and it does not delete an approval you already granted. If you do not recognize a site in that list, disconnect it and avoid sending from a tab you did not open yourself.",
    },
    {
      id: "where-it-sits-among-gambling-wallets",
      title: "Where it sits among gambling wallets",
      body: "MetaMask is one [crypto wallet for gambling](/guides/crypto-wallet-for-gambling) choice when the site uses an EVM network the app can show. It is a poor fit when the site wants native Solana or native bitcoin, because those are not what the wallet holds the way a dedicated app does. Match the wallet to the chain. Then match the chain to the site. A famous extension does not convert a deposit onto a ledger the site is not watching.\n\nHot wallets are convenient because they are online. That convenience is the risk. Keep a play amount in the hot wallet and leave long-term savings somewhere you do not connect to casino sites. MetaMask can sit next to a hardware device so the signing key is confirmed on the device. The phrase for that setup is still something only you should hold. No casino, including one that settles jackpot, coinflip, and roulette in USD, needs the words.\n\nIf a feature in the app changes, trust the screen in front of you over a blog post. The in-app network list, the account you selected, and the exact request text are the facts of that session. What is MetaMask, in practice, is that session: your keys, your confirmation, and no company reset if the phrase leaks or disappears.",
    },
    {
      id: "what-stays-true-when-the-interface-changes",
      title: "What stays true when the interface changes",
      body: "Wallet screens get renamed. A menu that said one thing last year may say another thing now. The facts that do not depend on a label are the ones to keep. MetaMask is self-custody. The Secret Recovery Phrase is the backup of the keys, and the company does not store a copy it can send you. The local password unlocks this device only. Native activity is on Ethereum and EVM chains. Solana, Bitcoin, and XRP are not held here the way a dedicated wallet holds them. Snaps and bridges, when they exist, are optional and add trust. The network list in the app you opened yourself is the source of truth for that install.\n\nThose facts also tell you what a stranger is not allowed to demand. They are not allowed to “verify” you by collecting the phrase. They are not allowed to remote-reset a lost phrase. They are not allowed to turn a readable login into an unlimited token approval without you noticing, because you are supposed to notice. If a tutorial and the app disagree, follow the app, then leave the tutorial. What is MetaMask is the keyring in front of you, not the screenshot in an ad.\n\nPVPspinArena still settles only jackpot, coinflip, and roulette, and it settles them in USD. You can understand MetaMask completely and never connect it there. If you do connect a wallet on any site, connect from the extension icon you installed, pick the account on purpose, and keep the phrase offline.\n\nThe rest of this subject is on the [Crypto payments guides](/guides/topics/crypto-payments). See [metamask casino](/guides/metamask-casino), [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [wallet](/wallet) before you play.\n\nAlso read [is metamask safe](/guides/is-metamask-safe).\n\nThe practical neighbours are [how to install MetaMask](/guides/how-to-install-metamask), [how to use MetaMask](/guides/how-to-use-metamask) and [MetaMask login help](/guides/metamask-login-help). Removing an account is [how to delete a MetaMask account](/guides/how-to-delete-metamask-account). Lookalikes are [MetaMask scams](/guides/metamask-scams).",
    },
  ],
  faqs: [
    {
      q: "What is MetaMask used for?",
      a: "MetaMask stores keys on your device, shows balances on Ethereum and EVM networks, and lets you sign messages or send transactions. Sites can ask the wallet to connect, and you approve or reject each request.",
    },
    {
      q: "Does MetaMask hold my crypto on its servers?",
      a: "MetaMask does not hold your crypto on its servers, because it is a self-custody wallet and the company does not hold your Secret Recovery Phrase or your funds. The chain records the balances, and the keys on your device authorize movement.",
    },
    {
      q: "What happens if I forget the MetaMask password?",
      a: "The password only unlocks the local vault. There is no password reset that recovers a lost Secret Recovery Phrase, though you can restore inside the official app if you still have that phrase.",
    },
    {
      q: "Can MetaMask hold Solana, Bitcoin, or XRP the way a dedicated wallet does?",
      a: "Its native networks are Ethereum and EVM chains. It does not natively hold Solana, Bitcoin, or XRP the way Phantom or a Bitcoin wallet does, and the in-app network list is the source of truth for your install.",
    },
    {
      q: "Do I need MetaMask to use PVPspinArena?",
      a: "PVPspinArena settles jackpot, coinflip, and roulette in USD and does not require MetaMask. A wallet connection is optional and must never include your Secret Recovery Phrase.",
    },
  ],
  sources: [],
  related: ["metamask-casino", "crypto-wallet-for-gambling"],
  updated: "2026-09-26",
};
