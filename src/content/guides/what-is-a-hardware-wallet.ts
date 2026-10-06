import type { Guide } from "./types";

export const guide: Guide = {
  slug: "what-is-a-hardware-wallet",
  cluster: "Crypto payments",
  keyword: "what is a hardware wallet",
  secondary: ["hardware wallet definition", "secure signing device"],
  title: "What Is a Hardware Wallet? Keys and the Screen",
  h1: "What Is a Hardware Wallet? Keys and the Screen",
  description:
    "A hardware wallet keeps private keys on a chip and shows the address on its own screen. Learn what the device does before you approve a send.",
  answer:
    "What is a hardware wallet, in the sense that matters when you move money? It is a small physical device whose job is to hold private keys and to sign transactions only after you confirm the details on its own screen. The coins are not inside the plastic. They are entries on a public ledger. The device is the signer. A laptop, phone, or browser wallet can prepare a payment and show you a friendly summary. That summary is easy to fake. The hardware wallet exists so the secret that can spend the coins never has to leave a dedicated chip, and so you can check the destination address on a display the computer does not control.\n\nThe device does not undo a bad download or a seed phrase you already typed into a website. This page defines the signer. It does not compare product lines, and it does not decide whether you should plug one into a casino.",
  facts: [],
  sections: [
    {
      id: "what-the-device-actually-is",
      title: "What the device actually is",
      body: "A hardware wallet is a purpose-built signer. You connect it to a computer or a phone with a cable or a wireless link, or you use a camera for a QR code on some models. Companion software on that computer builds an unsigned transaction: who gets paid, which asset moves, which chain, and what fee you are offering. The device receives that unsigned payload, checks it, shows you the parts a human can verify, and, if you press the physical buttons, produces a signature. The computer then broadcasts the signed transaction. The private key used for that signature is generated on the device and stays there.\n\nThat split is the whole product. The computer is good at screens, networks, and account lists. It is also a place where malware lives. The hardware wallet is bad at browsing and good at one narrow task: keeping a secret and attaching it only to a message you approved. Some devices put that secret in a secure element, a chip designed to resist casual extraction. Others use a general-purpose microcontroller and rely on software design, a secure boot process, and the fact that the key is not sitting in a browser profile. Those are engineering choices. A side-by-side of two popular brands is a different article. Read [Ledger vs Trezor](/guides/ledger-vs-trezor) when you want that comparison. This page stays on the shared idea.\n\nThe device is not an account at a company. If the manufacturer disappears, your coins do not disappear with its website, provided you still have the recovery phrase and a compatible signer. You will see the same addresses in the companion app that you would see in a software wallet. That is normal. The app is a window. It asks the device for public keys and derives addresses so it can show balances by looking at the chain. Showing a balance does not require the private key. Spending does.",
    },
    {
      id: "keys-stay-on-the-chip",
      title: "Keys stay on the chip",
      body: 'When you initialize a genuine device, it creates a new master secret inside the chip. You did not email that secret to yourself. You did not choose it by typing a favorite sentence. The device draws randomness, turns it into key material, and then shows you a recovery phrase, usually a list of words, so you can rebuild the same material later. After setup, spending keys are meant to stay inside the chip. The computer asks for a signature. It does not ask the chip to export the key, and a honest firmware build refuses that export.\n\nA malicious web page can ask a browser wallet to sign whatever that wallet will display. The same page can talk to a hardware wallet only by sending a request the device tries to decode onto its own screen. If you reject what the screen shows, nothing is signed. That protection collapses if you type the recovery phrase into the laptop. The secret has left the chip.\n\nPublic keys and addresses do leave the device. They have to. An address is how someone pays you, and a public key is how the network checks a signature. Sharing an address does not let a stranger spend. Sharing the recovery phrase does. The chip cannot save you from a phrase you photographed, stored in a cloud note, or read aloud to a person who said they were support.\n\nThe chip runs code. Install firmware only through the official companion app, and start from a device you bought yourself. A device that arrived with a phrase already filled in is not your wallet. Reset it and create a new phrase, or send it back.\n\nThere is a limit you should know before you trust the marketing line "keys never leave." The recovery phrase is a copy of the secret, by design. Some devices also offer an optional extra passphrase that produces a different wallet from the same word list. If you turn that on, the extra secret is as important as the words, and the device will not remind you later. Leave it off until you understand it.',
    },
    {
      id: "the-screen-confirms-the-address",
      title: "The screen confirms the address",
      body: "The screen is the reason to own the device. Companion software can be altered. A browser can be altered. A clipboard can be altered so that the address you pasted is not the address you copied. The hardware wallet screen is a separate display. When it works as designed, it shows the transaction the chip is about to sign, not the transaction the website wishes you would approve.\n\nBefore you confirm, read the address on the device, not only the first and last characters. Attackers build lookalike addresses on purpose. Read the amount. If the screen shows a fee, a chain, or a token contract, read those too. If the screen cannot decode the transaction and only offers a blind hash, you are trusting the computer. Decline that prompt unless you already accept the risk.\n\nReceive flows need the same habit. When someone is about to pay you, show the address from the device screen, not only from the app window. Malware that rewrites the app window is a known pattern. The chip can display the address that matches the key it holds. Compare that string to the one you send in chat or print on an invoice. For a large incoming payment, this check is the whole point of the hardware.\n\nDifferent networks use different address shapes. A string that does not look like the addresses you have used on that network is a reason to stop, not a reason to tap approve because the app says the request is safe. Buttons are part of the confirmation. A tap on the computer mouse does not approve a well-designed hardware prompt. You press buttons on the device. That physical step is easy to rush when you are tired or when a page is counting down. Rushing is how people sign the wrong prompt. If anything on the screen is unfamiliar, unplug the device and find out what the prompt means before you continue.",
    },
    {
      id: "the-seed-phrase-is-the-real-backup",
      title: "The seed phrase is the real backup",
      body: "Losing the device is inconvenient. Losing the only copy of the recovery phrase is final. The phrase is the backup of the keys. Write it on paper or stamp it in metal. Store it where fire, theft, and roommates are thought through in a boring way. Do not put it in a password manager that syncs to a cloud you barely watch. Do not put it in a photo roll. Do not put it in email. Anyone who sees the words can recreate the wallet on their own device and move the coins. They do not need your PIN, and they do not need to steal the gadget from your desk.\n\nThe PIN stops a stranger who finds the gadget. It does not stop someone who has the phrase. Some devices wipe themselves after too many wrong PIN attempts, which is fine only if the phrase is stored somewhere else.\n\nTest the backup before the wallet holds savings. Set the device up, write the phrase, send a tiny amount, reset the device, restore from the phrase, and confirm the same address appears. If you skip the test, you find out during an emergency whether your handwriting was readable.\n\nNever enter the phrase because a website asked you to reconnect, verify, or sync. A manufacturer, a casino, and a tax tool can all work without those words. Type a recovery phrase only into a hardware device you trust, during a restore. When a page asks, close the page.\n\nIf you suspect the phrase has been seen, move the coins to a new wallet with a new phrase. The person who copied it can wait.",
    },
    {
      id: "what-the-device-does-not-do",
      title: "What the device does not do",
      body: "A hardware wallet does not make a bad payment a good payment. If you confirm an address that belongs to a scammer, the chip will sign faithfully. If you approve a token permission you do not understand, the chip will sign that too, when the screen shows it and you accept. The device raises the cost of stealing the key. It does not understand your intent beyond the fields it can display.\n\nIt does not choose a network for you. Sending on the wrong chain is still your mistake. It also does not replace a small hot wallet for everyday spending. That split, including any casino connection, is covered in [cold wallet vs hot wallet](/guides/cold-wallet-vs-hot-wallet). This page will not walk through those patterns. Gambling is for adults 21 and older, and only with money you can afford to lose.\n\nIt does not prove that a website is honest. PVPspinArena offers jackpot, coinflip, and roulette settled in USD. Deposit and payout wallets are separate. A hardware device does not audit those games, and you do not need this device to understand that a deposit address and a payout address are different destinations. Check each one on a screen you trust.\n\nIt does not stay safe if you buy it from a stranger who preloaded a seed. Generate your own. It does not stay safe if you disable every warning in the companion app because the warnings slow you down. The warnings are the product.",
    },
    {
      id: "how-to-check-a-receive-address",
      title: "How to check a receive address",
      body: 'Use the device when the payment matters. Open the receive flow in the official app. Connect the hardware wallet. Let the device display the address. Compare every character to the address you are about to share, or scan from the device flow rather than from a screenshot you edited earlier. For a repeat payee, you can keep a short written note of addresses you have already verified on the device, and still re-check when the amount is large.\n\nIf the app and the device disagree, stop. Do not send to the app address "just this once." Disagreement means one of the two displays is wrong, and the device is the one tied to the key. Update firmware only through the official app, then try the receive flow again. If they still disagree, do not receive funds to that setup until you know why.\n\nWhen you pay someone else, paste the address they gave you and read it on the hardware screen. A small test to that same checked address is a sane pattern for a new destination. Copy from the person you are paying, not from a random line in your history. Buy the device new, initialize it yourself, and keep the phrase away from anyone who offers to "recover" it for you.\n\nThe rest of this subject is on the [Crypto payments guides](/guides/topics/crypto-payments). See [cold wallet vs hot wallet](/guides/cold-wallet-vs-hot-wallet), [ledger vs trezor](/guides/ledger-vs-trezor), [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [wallet](/wallet) before you play.',
    },
  ],
  faqs: [
    {
      q: "Does a hardware wallet store my coins?",
      a: "The coins stay on the blockchain under an address, and the device does not hold them. The device stores the keys that can sign a transfer from that address.",
    },
    {
      q: "What should I read on the device screen?",
      a: "Read the full address, the amount, and the network or asset name if the screen shows them. Approve only when those details match what you meant to sign.",
    },
    {
      q: "Can I restore the wallet if I lose the device?",
      a: "Yes, if you still have the recovery phrase that the device showed when you set it up. A new device from the same family can usually import that phrase and reach the same keys.",
    },
    {
      q: "Is the recovery phrase the same thing as the device?",
      a: "The phrase is a backup of the key material, and anyone who has it can move the coins without your device. Keep it offline and never type it into a website.",
    },
    {
      q: "Where do I compare hardware brands or casino use?",
      a: "Brand differences belong on the Ledger versus Trezor page. Whether to connect a hardware device to a gambling site belongs on the cold wallet versus hot wallet page.",
    },
  ],
  sources: [],
  related: ["cold-wallet-vs-hot-wallet", "ledger-vs-trezor"],
  updated: "2026-09-26",
};
