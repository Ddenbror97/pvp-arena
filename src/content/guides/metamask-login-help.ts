import type { Guide } from "./types";

export const guide: Guide = {
  slug: "metamask-login-help",
  cluster: "Crypto payments",
  keyword: "metamask login",
  secondary: ["metamask sign in problems", "metamask connect failed"],
  title: "MetaMask Login Help: Extension, Profile, Fake Site",
  h1: "MetaMask Login Help: Extension, Profile, Fake Site",
  description:
    "MetaMask login fails are usually the extension, the wrong browser profile, or a fake site. Fix the prompt without typing a seed phrase.",
  answer:
    "A MetaMask login is the moment a website asks your wallet to share a public address, and sometimes to sign a short message. The prompt is an identity check. MetaMask is a self-custody wallet, so the company does not hold your Secret Recovery Phrase, and there is no password reset that recovers a lost phrase. The password only unlocks the vault on this device. When the button spins and nothing appears, the usual causes are the extension, the wrong browser profile, or a fake site.\n\nPeople say “log in” because the button looks like every other sign-in form. The page does not receive your keys. You confirm the request inside the wallet you opened yourself. If a page offers a text box for the recovery words, that is not a MetaMask login. Close the tab. Gambling is only for people 21 or older, and only with money you can afford to lose. A working connection does not change the odds of a wager.",
  facts: [],
  sections: [
    {
      id: "what-a-metamask-login-is-asking-for",
      title: "What a MetaMask login is asking for",
      body: "A normal connect request tells the site that a wallet is present, lets you choose which account address to share, and may ask you to sign a human-readable message. Sharing the address reveals public information. Signing a plain message does not broadcast a token transfer and does not set a spending allowance. You can reject the popup and the tokens stay where they are.\n\nThe local password is easy to confuse with a website password. You type it into the MetaMask extension or the official mobile app to decrypt the vault on that device. The company cannot email a replacement Secret Recovery Phrase. If you still have the phrase, you can restore the same accounts inside the official app and choose a new local password there. If the phrase is gone and you have no other vault backup, nobody at the company can rebuild the keys. A page that says support will reset the phrase is describing a power the product does not have.\n\nOne phrase can derive many accounts, and each account has its own address. The site stores the address you picked, not a single bucket called “your MetaMask.” If you funded a second account and connected the first, the login still succeeded and the site is looking at the wrong address. Networks are a separate choice. MetaMask’s native networks are Ethereum and other EVM chains. The list inside your own app is the source of truth for what that install can show. A login can finish on one network while a later send points at another.\n\nPVPspinArena settles jackpot, coinflip, and roulette in USD. MetaMask is not required. If a wallet is used, the useful action is a connection or a readable signature, then a transfer you confirm on purpose. The site does not need your phrase to settle those games in dollars.",
    },
    {
      id: "extension-browser-profile-or-a-fake-site",
      title: "Extension, browser profile, or a fake site",
      body: "MetaMask on desktop is an extension installed into a specific browser profile. A work profile, a guest window, and a personal profile do not share extensions. You can open the right website in the wrong profile, see no MetaMask icon, and get an honest “no wallet” error. Private windows often block extensions until you allow them. A phone browser will not see the desktop extension unless you use the MetaMask in-app browser or a pairing flow.\n\nCheck the extension before you blame the site. It may be disabled, hidden in the extensions menu, or old enough that the page no longer detects it cleanly. Update it from the browser’s official store listing, the same place you confirm the publisher, not from a file a stranger sent. If several wallet extensions are installed, they can compete to answer the page. The practical test is simple: in this profile, with other wallet extensions paused, does the MetaMask icon open the extension? If the icon opens a website that asks you to type the phrase, stop. That is the fake-site pattern, even when the icon art looks familiar.\n\nThe address bar on a fake site sits close to a real name, with an extra word, a swapped letter, or a different ending. The page may say the wallet must be re-synced or unlocked for login by entering the Secret Recovery Phrase. The real extension asks for the local password, or it shows a connect sheet that lists accounts. It does not collect the phrase on a casino domain, a support form, or an ad landing page. [Is MetaMask safe](/guides/is-metamask-safe) separates wallet bugs from prompts people approved. Open the site from a bookmark you made on a good visit. Ignore connect buttons in search ads, social replies, and QR codes posted by someone claiming to be support.",
    },
    {
      id: "prompts-that-are-normal-and-prompts-that-are-not",
      title: "Prompts that are normal and prompts that are not",
      body: "A healthy MetaMask login looks boring. The extension shows a popup that names the site and asks which account to connect. A second screen may ask you to sign a message you can actually read. You can reject it. You can disconnect the site later from the wallet’s connected-sites list and try again. That is the whole loop.\n\nCancel, and do not “finish the login,” if any of these appear. The page has a form for the Secret Recovery Phrase or a private key. A person in chat or on a call wants the words so they can complete the login. The first wallet request is a token spending approval, especially an unlimited one, before any readable sign-in message. The request is a blind signature: hex or a hash with no sentence, presented as a login. The popup names a different domain than the address bar.\n\nA readable signature and a token approval are different objects. The signature can prove you were present. The approval can let a contract pull a token later, up to the cap you set, including a cap that covers the whole balance. A casino login does not need that pull permission. Reject it and reopen the site from your bookmark. A site can also ask MetaMask to add a network. Confirm chain details only from a source you already trust. After you decide, the in-app network list is still the source of truth.",
    },
    {
      id: "when-the-site-expects-walletconnect-instead",
      title: "When the site expects WalletConnect instead",
      body: "Some sites never talk to the desktop extension. They show a WalletConnect button, a QR code, or a link into the phone app. That path is a pairing session between the site and a wallet you already have. It is not a new account and it is not a place to type a seed. Your keys stay in MetaMask. The session can still ask you to share an address, sign a message, or approve a transaction.\n\nUse it when the desktop browser has no extension, or when MetaMask lives on your phone and the game is open on a laptop. Scan the code with the official app. Read the domain inside the wallet before you approve. Decline pairings that arrived in a direct message. Disconnect the session when you are done so an old tab cannot keep asking for signatures. The [WalletConnect casino](/guides/walletconnect-casino) guide explains what a session can request and how phishing codes copy the real flow.\n\nIf the page shows both an extension button and a WalletConnect button, pick one and finish it. Starting both leaves you unsure which address the site stored. Connect the account that holds the funds you mean to use. Extra signatures “to refresh the login” are how a second, hostile request gets a careless click. If the website collects the Secret Recovery Phrase so the phone can connect, the website is the attack. Pairing exists so you never have to do that.",
    },
    {
      id: "a-locked-vault-a-blocked-popup-and-the-wrong-acc",
      title: "A locked vault, a blocked popup, and the wrong account",
      body: "A locked MetaMask still exists. The extension is installed and the page may detect it, but there is no unlocked account to share until you enter the local password in the extension popup. That field belongs in the toolbar window, not in the website’s main column. If you forgot the local password and you still have the Secret Recovery Phrase, restore inside the official app and set a new local password. That is not a company-held reset, and it does not apply if the phrase is gone.\n\nPopup blockers make a live login look broken. The page waits while the browser hides the window. Allow popups for that site, or open MetaMask from the toolbar while the page is waiting. Some browsers also need the extension set to run on the site rather than paused. Prefer the small extension window. A full-page site that replaced your tab and asks for the phrase is a reason to go back, not a login screen you should complete.\n\nThe wrong account is a successful login to the wrong address. Open the account switcher and read the address, not only the nickname. Nicknames are local labels. The site stores the address. If you keep a play account and a savings account under the same phrase, connect the play account on purpose. Disconnect and reconnect if you picked the wrong one. You do not reinstall, and you do not reveal the phrase to switch. A far-off computer clock can also make a timestamped signature fail, and a managed work computer can block the extension store. The honest fix is a profile where you are allowed to run the wallet. If a hardware device is paired, unlock it and match the address on the device screen before you sign.",
    },
    {
      id: "login-steps-that-stay-inside-the-wallet",
      title: "Login steps that stay inside the wallet",
      body: "Work through these in order. Each one happens in the browser or in the official app. None of them asks you to type the Secret Recovery Phrase into the website.\n\n### Confirm the extension in this profile\n\nOpen the extensions menu in the same window as the site. MetaMask should be enabled and allowed for the site. If you are in another profile or a private window, switch to the profile where you installed it, or allow the extension for that window. If it is missing, install it only from the official store listing the publisher’s site points to. Do not install from a download button on the casino page.\n\n### Unlock with the local password\n\nClick the toolbar icon and enter the local password there. If the vault opens, you are unlocked. If you cannot remember the password, restore only inside the official app, and only if you already have the Secret Recovery Phrase offline. Refuse any page that offers to unlock you in exchange for those words.\n\n### Allow the popup and choose the account\n\nReturn to the site from your bookmark and use its connect control once. Read the domain on the popup. Choose the account address you mean to use. If no popup appears, check for a blocked window and pause other wallet extensions. Approve the connection. If a second screen shows a readable message, sign only when the text matches a login you expected.\n\n### Reject anything that is not a login\n\nCancel token approvals, unlimited spending caps, and unreadable signature requests that appeared instead of a sentence. Cancel network adds you did not plan. If you already approved something you do not recognize, disconnect the site in MetaMask’s connected-sites list and do not send funds from that tab. Open the wallet from the toolbar icon, not from a link in the page.\n\n### Stop if the phrase was requested\n\nIf any screen asked for the Secret Recovery Phrase, treat the attempt as hostile. Do not finish the form. If you already typed the phrase into a website, move remaining funds to a new wallet with a new phrase, using the official app only. The old phrase is burned. A cleaner MetaMask login later does not undo words that already left your keyboard.\n\nThe rest of this subject is on the [Crypto payments guides](/guides/topics/crypto-payments). See [walletconnect casino](/guides/walletconnect-casino), [is metamask safe](/guides/is-metamask-safe), [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [wallet](/wallet) before you play.",
    },
  ],
  faqs: [
    {
      q: "Why does MetaMask login do nothing when I click connect?",
      a: "The extension is often missing, disabled, or running in a different browser profile than the tab you are using. A popup blocker or a locked wallet can also hide the prompt.",
    },
    {
      q: "Can I complete a MetaMask login by typing my Secret Recovery Phrase on a website?",
      a: "No legitimate MetaMask login asks you to type the Secret Recovery Phrase into a webpage. The phrase restores the wallet inside the official app, and a site that requests it is trying to take the keys.",
    },
    {
      q: "The extension is installed. Why does the site still not see MetaMask?",
      a: "Another wallet may be injecting itself first, or this profile may not have permission to run the extension. Open the extension menu in the same profile and confirm MetaMask is allowed on the site.",
    },
    {
      q: "Does a failed MetaMask login mean my funds moved?",
      a: "A failed connect leaves the tokens where they were, because sharing an address does not broadcast a transfer. Funds move only after you approve a transaction or a token spending request.",
    },
    {
      q: "Does PVPspinArena require a MetaMask login?",
      a: "PVPspinArena settles jackpot, coinflip, and roulette in USD and does not require MetaMask. If you connect a wallet, you still should never paste a Secret Recovery Phrase into the site.",
    },
  ],
  sources: [],
  related: ["walletconnect-casino", "is-metamask-safe"],
  updated: "2026-09-26",
};
