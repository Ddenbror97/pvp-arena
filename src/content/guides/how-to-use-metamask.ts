import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-use-metamask",
  cluster: "Crypto payments",
  keyword: "how to use metamask",
  secondary: ["metamask tutorial", "use metamask wallet"],
  title: "How to Use MetaMask: Accounts, Networks and Sends",
  h1: "How to Use MetaMask: Accounts, Networks and Sends",
  description:
    "How to use MetaMask: pick an account, trust the in-app network list, read each signature, and send only what you mean to send.",
  answer:
    "How to use MetaMask is a handful of habits inside the official app: unlock with the local password, pick an account, pick a network from the list the app shows, and read every prompt before you confirm. MetaMask is a self-custody wallet. The company does not hold your Secret Recovery Phrase, and there is no password reset that recovers a lost phrase. The app proposes transactions. You authorize them. Nothing in a website’s “easy mode” replaces that reading.\n\nGambling is only for people 21 or older, and only with money you can afford to lose. Knowing the buttons does not change the price of a wager. This guide assumes the real extension or mobile app is already installed. If a page wants the phrase before you can “use” the wallet, close the page.",
  facts: [],
  sections: [
    {
      id: "unlock-then-look-at-the-account-you-actually-sel",
      title: "Unlock, then look at the account you actually selected",
      body: "Open MetaMask from the browser toolbar or the phone’s app icon. Enter the local password there. The password decrypts the vault on that device. It is not sent to a casino as a login, and typing it into a website does nothing useful. If you forgot it and you still have the Secret Recovery Phrase, restore inside the official app and set a new local password. If the phrase is gone, the company cannot invent a new one.\n\nThe account switcher lists addresses derived from that phrase. Nicknames are local. The address is what a site will store and what a sender will pay. Before you receive or send, read the address on the screen, not a nickname from memory. A second account is still your keyring. It is the right place for a small play balance if you do not want savings on the same address you connect to sites. Creating that extra account does not require revealing the phrase again.\n\nLock the app when you stand up. A locked vault stops a casual person at the keyboard. It does not stop someone who already copied the phrase. Day-to-day use and long-term backup are different jobs. Use the password often. Touch the phrase almost never, and never on a webpage.",
    },
    {
      id: "trust-the-in-app-network-list",
      title: "Trust the in-app network list",
      body: "MetaMask’s native networks are Ethereum and other EVM chains. Open the network control and read the name before every send. That in-app list is the source of truth. A site can request that you add a network. Add one only when you already know why, from a source you opened yourself. If the list and a blog post disagree, believe the list. Features move. The screen in your hand is the one that will build the transaction.\n\nThe same address style can appear on more than one EVM network because the key is shared and the ledgers are not. A token balance on one network is not a balance on another. Sending on the wrong network is the ordinary way to strand funds while the wallet “worked.” Check the asset name too. Lookalike tickers exist. If you cannot see the network and the asset in the confirmation, do not confirm.\n\nMetaMask does not natively hold Solana, Bitcoin, or XRP the way Phantom or a Bitcoin wallet does. How to use MetaMask does not include a Snap tutorial. Snaps and bridges are optional add-ons with extra trust, and fake sites copy install steps. For those chains, use a wallet built for them. Staying inside the networks the app lists is the use pattern that matches the product.",
    },
    {
      id: "receive-send-and-read-the-fee",
      title: "Receive, send, and read the fee",
      body: "To receive, copy the address from the account you selected, on the network the sender will use. Send that address through a channel you trust, and check the first and last characters if you read it back. Do not accept a “corrected” address from a chat you did not start. The wallet cannot know that a clipboard was swapped. You can.\n\nTo send, choose the asset, paste the destination, enter the amount, and read the confirmation. Gas is the network fee, paid in that network’s native coin. The wallet shows an estimate before you approve. You do not need a memorized dollar figure. You need to recognize a fee that is absurd next to the amount you are sending, and to cancel if the destination looks wrong. A confirmed send is final. MetaMask cannot file a chargeback. The company does not sit in the middle of the transfer.\n\nStart with an amount you can afford to lose to a typo when you are paying a new address. After it arrives, send the rest. That habit costs a second fee and saves the larger mistake. It does not help if the address format itself is wrong, such as a Solana address pasted into an EVM send. In that case the wallet should be showing you an invalid destination, and you should stop rather than hunt for a tool that forces the send through.",
    },
    {
      id: "signatures-approvals-and-swaps",
      title: "Signatures, approvals, and swaps",
      body: "Sites ask for four kinds of yes. A connection shares your public address. A message signature proves you saw a piece of text, and a readable sentence is what a normal login looks like. A transaction moves the asset you picked. A token approval lets a contract pull that token later, up to a cap that can be unlimited. How to use MetaMask safely is mostly knowing which of the four you are looking at.\n\nReject blind signatures, where the prompt is a hash you cannot read, when you thought you were logging in. Reject unlimited approvals when the site only needed you to send a normal transfer. You can disconnect a site in the wallet’s connected-sites list. Disconnecting does not reverse a send and does not erase an approval you already set. If the prompt appeared on a site you reached from an ad, close the tab and reopen the service from a bookmark before you try again.\n\nA swap trades one token for another. It often stays on the same network, it can ask for an approval the first time, and the price can move before it fills. This guide does not repeat that procedure. [How to swap tokens](/guides/how-to-swap-tokens) covers slippage, approvals, and the difference between a swap and a bridge. Use it when you truly need a different asset. Skip it when you already hold what the recipient asked for. A casino banner that says you must swap before a simple transfer is a reason to slow down, not a step to click through.",
    },
    {
      id: "use-steps-for-a-careful-send",
      title: "Use steps for a careful send",
      body: "### Unlock the official app\n\nUse the toolbar icon or the phone app you installed from the official store. Enter the local password only there. If the interface is a website asking for the Secret Recovery Phrase, stop using it.\n\n### Select the account and the network\n\nPick the account whose address you intend to spend from. Pick the network from the in-app list that matches the recipient’s instructions. Read both names on the confirmation, not from memory of the last session.\n\n### Check the asset, the amount, and the destination\n\nPaste the destination and compare the ends of the address with the source you trust. Confirm the asset ticker is the one you meant, on that network. Look at the fee estimate. Cancel if any line is a surprise.\n\n### Approve once, then wait\n\nConfirm a single transaction. Do not sign a second prompt you did not expect, especially an approval or an unreadable hash, while the first is pending. Save the transaction hash the wallet shows if you need to ask the recipient what they see. Do not send the phrase along with the hash.",
    },
    {
      id: "when-the-other-party-is-a-gambling-site",
      title: "When the other party is a gambling site",
      body: "[MetaMask casino](/guides/metamask-casino) is the longer version of connect-and-sign for gambling sites that accept this wallet. The short version matches everything above. Connect the play account, sign a message you can read, and send a transfer yourself if a deposit is required. Do not set an unlimited allowance because a button labeled “deposit” requested it. Do not type the Secret Recovery Phrase into the cashier.\n\nPVPspinArena settles jackpot, coinflip, and roulette in USD. MetaMask is not required. Using the wallet well on some other EVM site does not create a balance here, and sending the wrong asset does not oblige any site to fix it. Keep the play amount separate from savings. Lock the extension when the session is over. The phrase stays on paper, offline, because use of the app was never supposed to display those words again.\n\nIf a feature you remember has moved, the in-app network list and the text of the current prompt still decide. How to use MetaMask is that reading habit, repeated. The interface can change. The rule that you confirm only what you understand does not.",
    },
    {
      id: "when-a-prompt-is-the-wrong-kind-of-yes",
      title: "When a prompt is the wrong kind of yes",
      body: "Daily use goes bad in the gap between a button on a website and the confirmation in the wallet. The website can say “continue,” “deposit,” or “verify” for all four request types. Only the wallet text tells you which one you are about to authorize. Pause until you can name it. Connection means the site will see an address. A readable signature means you are attesting to a sentence. A send means those units of that asset leave. An approval means a contract may pull the token later. If the label on the site and the label in the wallet do not match, the wallet wins and you cancel.\n\nPending transactions deserve the same patience. A slow network is not a reason to sign a second, different request from the same tab. Open the activity list in the official app and see whether the first send is still waiting. Speeding it up, when the app offers that inside its own window, is a fee change on the same transfer. It is not a new destination and it is not a phrase entry. If a helper in chat wants the Secret Recovery Phrase in order to “push” the transaction, they are not helping. The hash is enough to talk about a public transfer. The words that rebuild the wallet are not.\n\nHardware confirmations add a screen you should actually read. If a device is paired, the address and amount on the device are the ones that matter, not a browser animation above it. How to use MetaMask with extra hardware is still the same habit: the official app, the in-app network, and a destination you checked. It is not a Snap you installed from a gambling popup, and it is not a bridge you do not understand. Leave Solana, Bitcoin, and XRP to wallets that hold them natively. Forcing those tickers through an EVM confirmation is how a careful click still lands on the wrong ledger.\n\nThe rest of this subject is on the [Crypto payments guides](/guides/topics/crypto-payments). See [metamask casino](/guides/metamask-casino), [how to swap tokens](/guides/how-to-swap-tokens), [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [wallet](/wallet) before you play.",
    },
  ],
  faqs: [
    {
      q: "How to use MetaMask for the first send?",
      a: "Unlock the official app, select the account and the network from the in-app list, and paste a destination you checked yourself. Confirm the asset and the fee estimate in the wallet before you approve.",
    },
    {
      q: "Does the password move my funds?",
      a: "The password only unlocks the local vault. Transfers happen when you confirm a transaction, and there is no password reset that recovers a lost Secret Recovery Phrase.",
    },
    {
      q: "Can I use MetaMask on Solana or Bitcoin?",
      a: "Native use is Ethereum and EVM chains. It does not natively hold Solana, Bitcoin, or XRP the way a dedicated wallet does, so use those wallets for those chains.",
    },
    {
      q: "Is a token swap required before every transfer?",
      a: "Send the asset you already hold if it is the one the recipient expects. A swap is a separate trade, with its own approval and slippage, covered in the token swap guide.",
    },
    {
      q: "Does PVPspinArena require me to use MetaMask?",
      a: "PVPspinArena settles jackpot, coinflip, and roulette in USD and does not require MetaMask. If you connect any wallet, never type the Secret Recovery Phrase into the site.",
    },
  ],
  sources: [],
  related: ["metamask-casino", "how-to-swap-tokens"],
  updated: "2026-09-26",
};
