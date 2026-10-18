import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cold-wallet-vs-hot-wallet",
  cluster: "Crypto payments",
  keyword: "cold wallet vs hot wallet",
  secondary: ["hardware wallet vs hot wallet", "cold storage", "hot wallet risks", "ledger casino"],
  title: "Cold Wallet vs Hot Wallet: Security and Casino Use",
  description:
    "Cold wallet vs hot wallet: what stays offline, what you connect to a casino, seed risk, and a safer split for gambling funds.",
  h1: "Cold wallet vs hot wallet: what to connect to a casino",
  answer:
    "Cold wallet vs hot wallet is a split between keys that stay offline and keys that live on a phone or browser. A cold wallet, usually a hardware device, signs rarely and is the right home for savings. A hot wallet is convenient for a casino deposit and is also the wallet malware and fake sites can reach. Connect a small hot wallet to a casino; keep the cold wallet away from the site.",
  facts: [
    "A hot wallet’s keys sit on an internet-connected device; a cold wallet’s keys stay offline until you sign.",
    "Hardware devices such as a Ledger still have a seed phrase; the device is not a substitute for that backup.",
    "Casinos need a deposit from an address they can match, which almost always means a hot wallet you control.",
    "Approving a token spend from a hot wallet can drain it; a normal USDC send does not need a blanket approval.",
    "PVPspinArena verifies a wallet with a message signature and accepts on-chain Bitcoin, plus USDC or ETH on Base.",
  ],
  sections: [
    {
      id: "definitions",
      title: "What “cold” and “hot” actually mean",
      body: `The phrase cold wallet vs hot wallet is about whether private keys can be reached from the internet when you are not trying to sign.

A hot wallet is software on a laptop, phone or extension. MetaMask, many mobile wallets and exchange apps are hot. They are easy to connect to a site. They are also easy to phish.

A cold wallet keeps keys offline. The common form is a hardware wallet: a small device that signs inside its own chip. Paper or metal backups of a seed are also "cold storage" in the backup sense, but a steel plate cannot send USDC. Someone still has to load those words into a signer.

This sits in the [crypto payments](/guides/topics/crypto-payments) cluster. It is for adults aged 18 or over who will move a gambling budget, not their rent. PVPspinArena is a PvP Jackpot, Coinflip and Roulette site. It is not a reason to plug your life savings into a browser.

Exchange accounts are a third category people call a wallet. They are custodial hot wallets you do not sign. Useful for buying USDC. Poor as the last hop if a casino matches a verified from-address, and poor as long-term storage.

For the wider choice of apps, see [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). For the key-ownership idea, see [self custody wallet](/guides/self-custody-wallet). The cold-versus-hot split only applies after you already chose self-custody. An exchange "cold storage" marketing line is the company's cold storage, not yours.`,
    },
    {
      id: "hot-risks",
      title: "Hot wallet risks that show up at casinos",
      body: `Hot wallets fail in boring, repeatable ways.

- **Fake sites.** A lookalike domain asks you to connect and then requests a token approval or a typed seed. Bookmark the real site.
- **Drainer contracts.** A "verify wallet to claim" button is often a permit to empty USDC.
- **Clipboard malware.** The address you copied is swapped for an attacker's address.
- **Seed screenshots.** A photo of 12 words in a camera roll is a hot backup, not a cold one.
- **Shared computers.** A hotel laptop with an extension installed is not your wallet; it is theirs.

A casino session raises the rate of connecting, signing and pasting. That is why the hot wallet should hold only the week's budget. If that wallet is emptied, the cold wallet still holds the rest.

Public Wi-Fi plus a hot extension is a classic pairing. If you must play away from home, prefer your phone's data and a wallet you already set up, not a new download over hotel Wi-Fi. A "Ledger live update" from a search ad is a recurring scam shape.

PVPspinArena's [MetaMask casino](/guides/metamask-casino) flow is a message signature plus a normal transfer. It does not need an infinite USDC approval. If any page asks for your [seed phrase](/guides/seed-phrase), close it. Support will ask for a transaction hash, never for twelve words.`,
    },
    {
      id: "cold",
      title: "Cold storage and hardware wallets",
      body: `A hardware wallet is a signer, not a vault in the sky. Coins still live on the chain. The device stores keys and asks you to confirm the destination and amount on its screen. That screen is the feature: malware can change what your laptop displays; it should not be able to change what the device shows if you read it.

### Hardware wallet versus hot wallet

| Need | Hot wallet | Hardware / cold |
| --- | --- | --- |
| Daily casino deposit | Fits | Awkward on purpose |
| Long-term savings | Poor | Fits |
| Seed still exists | Yes | Yes |
| Phishing a signature | Common | Harder if you read the device |
| Lost device | Recover from seed | Recover from seed |

"Ledger casino" talk in forums usually means people who connected a hardware wallet through a hot interface to a gambling site. That can be done. It trains you to approve gambling origins on a device you wanted for savings. A cheaper pattern is: hardware wallet holds savings; a separate hot seed holds play money.

Cold storage that never signs is safer still. You do not need the savings device to touch a casino at all.`,
    },
    {
      id: "split",
      title: "A safer split for gambling funds",
      body: `Use two (or three) buckets.

1. **Savings cold wallet.** Hardware device, seed on paper or steel, never connected to a casino, never used for Discord "support."
2. **Funding hot wallet.** Browser or phone wallet on Base, funded with the month's or week's gambling budget in USDC plus a little ETH for gas.
3. **Optional exchange account.** A place to buy USDC, not a place to keep a long-term stack, and not the sender if the casino matches deposits to a verified self-custody address.

On PVPspinArena you verify the hot wallet on your [profile](/profile) with a signature, then send USDC or ETH on Base. The site never needs the cold seed. Withdrawals go back to an address you choose; sending them to the hot wallet is fine if the amount is still "play money." Sweep larger cashouts to cold storage in a separate, careful transaction.

Label the wallets in a way you will still understand in six months. "Play-Base" and "Savings" is enough. Do not reuse the play seed on a second phone "for convenience." Two hot copies of the same seed are two attack surfaces.

This split does not make gambling safe. It makes a bad session or a drained hot wallet a bounded loss. It also makes a stolen laptop less likely to include the steel plate in the same bag. Geography of backups is part of the split: the paper seed for savings should not live in the same drawer as the hot-wallet recovery sheet.`,
    },
    {
      id: "connect",
      title: "What to connect to a casino — and what not to",
      body: `Connect the hot wallet only.

Do not:

- Enter a cold seed into MetaMask "just this once" on the same profile you use for casinos.
- Blind-sign a contract interaction you do not understand.
- Keep payroll-sized USDC on the same address you verify on five gambling sites.
- Photograph the hardware wallet's words.

Do:

- Add Base as a network on the hot wallet.
- Verify the address on the device or extension before every send.
- Test with a small amount.
- Review token allowances after any experiment on other sites.

Browser profiles help. A dedicated browser profile that only opens the bookmarked casino and the block explorer reduces the chance that a random tab's script talks to the same extension. It is not a hardware wallet. It is a cheaper hygiene step.

If a site requires a wallet connection only to prove ownership, a signature is enough. If it requires a deposit, that is a transfer. Keep those two actions separate in your head. A connect request that suddenly becomes a "permit" or "increase allowance" is a different action. Reject it on this site and on any clone.

Mobile hot wallets add SIM-swap and notification-fatigue risk. Approve only what you initiated. If a push says "urgent wallet sync," it is probably not your idea.`,
    },
    {
      id: "example",
      title: "Worked example: $800 savings and a $40 session",
      body: `Riley has $800 in USDC and wants a $40 session on PVPspinArena.

1. Riley's $760 stays on a hardware wallet that has never visited a gambling origin.
2. Riley buys or sends $40 USDC plus a few dollars of ETH to a fresh MetaMask on Base.
3. On the profile, Riley connects that MetaMask and signs the verification message. The hardware wallet stays in a drawer.
4. Riley copies the deposit address from the site and sends $40 USDC from MetaMask. Gas is a few cents.
5. After credit, Riley plays Jackpot or Coinflip with a written stop of $40.
6. If $22 remains, Riley withdraws to MetaMask. Next day Riley can move $22 to the hardware wallet or leave it as next week's budget.

If MetaMask is drained by a fake site the same night, the $760 is untouched. That is the whole point of the split.

A worse version of the same week: Riley imports the hardware seed into MetaMask because a YouTube comment said "easier approvals." Now the $800 shares one hot key. The device in the drawer is an empty plastic shell. Cold is a property of the key's exposure, not of owning a USB stick.

Riley can also send a cashout straight to the hardware address if that address is on Base and Riley verifies it on the device screen. That is fine. Connecting the device to the casino origin is the habit to avoid, not receiving USDC while the device is unplugged.`,
    },
    {
      id: "summary",
      title: "Summary: hot for the session, cold for the rest",
      body: `Hot wallets are convenient and exposed. Cold wallets are slower and meant for money you cannot replace. A casino should see only a funded hot address. The seed for savings should never be typed into a gambling page.

Travel and inheritance are the late-night questions. A hardware device in checked luggage plus a seed in the same bag is one loss event. A seed only in your head is one medical event away from a permanent lockout. Write a simple instruction for a trusted person that does not live in the same cloud folder as a seed photo.

PVPspinArena asks for a signature and a Base transfer, not for a hardware seed. Treat every stake as money you can lose, and keep the device that holds the rest offline. The site's Jackpot, Coinflip and Roulette rounds do not get safer because the leftover USDC is cold. Adults aged 18 or over who only remember one habit should remember this: the casino sees the hot address; the cold seed never types itself into a browser.

They get less catastrophic when the leftover was never in the hot wallet.

What the device actually stores is in [what is a hardware wallet](/guides/what-is-a-hardware-wallet). Using one as the signer while MetaMask only displays the transaction is [connect a Ledger to MetaMask](/guides/connect-ledger-to-metamask).

A third model, neither a single hot key nor a hardware stick, is a [multisig wallet](/guides/multisig-wallet).`,
    },
  ],
  faqs: [
    {
      q: "Should I connect a Ledger directly to a casino?",
      a: "You can, but it trains a savings device to trust gambling sites. A small hot wallet for deposits is the cleaner split, and it keeps a drained play key from becoming a drained savings key.",
    },
    {
      q: "Is a hardware wallet useless if it still has a seed phrase?",
      a: "No. The device protects keys during signing. The seed is the backup if the device dies. Both must be protected.",
    },
    {
      q: "Can I deposit to PVPspinArena from cold storage?",
      a: "Only by signing a Base transfer from an address the site can match to your account. Practically, people use a verified hot wallet and keep cold storage offline.",
    },
    {
      q: "What is the main hot wallet risk at casinos?",
      a: "Phishing and token-spend approvals. Fake sites ask you to sign something that empties the wallet. A normal USDC send should not need a blanket approval.",
    },
    {
      q: "Does a cold wallet change game odds?",
      a: "No. It only changes how you store funds you have not deposited yet.",
    },
  ],
  sources: [
    { label: "ethereum.org — Security", url: "https://ethereum.org/en/security/" },
    { label: "ethereum.org — Wallets", url: "https://ethereum.org/en/wallets/" },
    {
      label: "Ledger Academy — Not your keys",
      url: "https://www.ledger.com/academy/not-your-keys-not-your-coins-why-it-matters",
    },
  ],
  related: [
    "usdc-casino",
    "ledger-vs-trezor",
    "seed-phrase",
    "crypto-wallet-for-gambling",
    "metamask-casino",
    "connect-ledger-to-metamask",
    "what-is-a-hardware-wallet",
    "multisig-wallet",
  ],
  updated: "2026-09-26",
};
