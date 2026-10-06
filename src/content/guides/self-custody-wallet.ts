import type { Guide } from "./types";

export const guide: Guide = {
  slug: "self-custody-wallet",
  cluster: "Crypto payments",
  keyword: "self custody wallet",
  secondary: [
    "non custodial wallet",
    "self custody crypto",
    "not your keys",
    "self custody vs exchange",
  ],
  title: "Self Custody Wallet Guide: Keys, Risk and Deposits",
  description:
    "What a self custody wallet is: you hold the keys, you sign deposits, and a casino never needs your seed phrase to credit a balance.",
  h1: "Self custody wallet: you hold the keys, the casino does not",
  answer:
    "A self custody wallet is software or hardware where you hold the private keys. You sign sends and messages. An exchange wallet is the opposite: the company holds the keys and you hold an IOU. A casino can credit a deposit from your self-custody address without ever seeing your seed phrase. If someone asks for those words, they are stealing.",
  facts: [
    "Self-custody means you control the keys; the chain does not have a password-reset desk.",
    "“Not your keys, not your coins” applies to exchanges and to any site that holds a credited balance.",
    "A casino deposit is a transfer you sign, not a handover of the seed.",
    "Losing the seed without a backup means the funds are gone.",
    "PVPspinArena matches deposits to a verified self-custody address on Base.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What a self-custody (non-custodial) wallet is",
      body: `A self custody wallet, also called a non-custodial wallet, is a tool that lets you hold cryptographic keys and use them to send assets and sign messages. MetaMask, many mobile wallets and hardware devices are in this class. The wallet vendor does not have a copy of your seed that can move funds if you forget a password.

The slogan "not your keys, not your coins" is the contrast. On an exchange you see a number. The exchange signs the real transactions. If the exchange freezes the account or fails, you are in their queue. In self-custody you are the signer. You are also the person who can lose everything with one bad paste.

This [crypto payments](/guides/topics/crypto-payments) how-to is for adults aged 18 or over. PVPspinArena expects a self-custody sender so it can match the on-chain from-address to your account. It is a PvP Jackpot, Coinflip and Roulette site, not a wallet vendor and not an exchange.

"Not your keys" is a custody slogan, not a fairness slogan. Holding keys does not let you recompute a game. It lets you refuse a send and keep what you did not deposit.

Related reading: [cold wallet vs hot wallet](/guides/cold-wallet-vs-hot-wallet), [seed phrase](/guides/seed-phrase), and [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). If you are still on an exchange-only setup, withdraw a test amount to a wallet you created yourself before you try a casino deposit. The test is cheap education. The first real send is a poor time to learn what a network dropdown is.`,
    },
    {
      id: "keys",
      title: "Keys, addresses and what the casino can see",
      body: `A wallet holds a seed, derives private keys, and publishes addresses. Anyone can send USDC to your address. Only the key can send it out.

When you verify on PVPspinArena you sign a short message. That proves you control the key for that address at that moment. It does not give the site the key. It does not move USDC. Gas is not charged for a personal-sign message.

When you deposit, you create a normal transfer to the site's deposit address. The site sees the sender, the amount, the token and the transaction hash. It does not see your seed. Support will never need those words to "speed up" a credit. If credit is slow, the useful packet is the Base transaction hash plus the time you sent it.

Message signatures can still be abused on other sites. A login signature is one thing. A signature that says "I permit this contract to move my USDC" is another. Read the prompt type. On PVPspinArena, wallet verification is the first kind.

If a chat asks you to "validate" by typing 12 words into a website, that is not self-custody. That is handing custody to a thief. The same is true of a QR code that opens a page titled "restore." Your paper backup is for *your* wallet app, offline, when you decide to restore.`,
    },
    {
      id: "vs-exchange",
      title: "Self-custody versus an exchange account",
      body: `| Question | Self-custody wallet | Exchange account |
| --- | --- | --- |
| Who signs sends? | You | The exchange |
| Who can freeze it? | Nobody but you (plus chain-level freezes on some tokens) | The exchange and its bank partners |
| Password reset | No; seed or nothing | Email and support |
| Casino deposit matching | Works: from-address is yours | Often fails: many users share an exchange hot wallet |
| Good for savings? | With a cold split, yes | Convenient, counterparty risk |

Self-custody vs exchange is not a moral contest. Exchanges are how many people buy USDC. They are a weak last hop if the casino credits by sender address. Withdraw to your own wallet first, then deposit.

After you deposit, the casino holds a balance. That slice is no longer self-custodied until you withdraw. The wallet slogan applies to the site the same way it applies to an exchange.`,
    },
    {
      id: "howto",
      title: "How to use a self-custody wallet with this site",
      body: `Follow this order the first time.

1. **Install a wallet you chose from a real store or the vendor site.** Do not install an extension from a sponsored ad on a search page.
2. **Write the seed on paper, offline.** Confirm the wallet's quiz. Store the paper where a roommate or a photo backup will not leak it.
3. **Add the Base network** if it is not already listed. You need Base for this site.
4. **Fund the wallet** with USDC on Base and a little ETH for gas. Buy on an exchange, withdraw on Base, or swap carefully.
5. **Open your [profile](/profile)** and connect the wallet. Sign the verification message. Read the message; it should not spend tokens.
6. **Copy the deposit address** from the wallet page. Send a small USDC test, then the rest of the session budget.
7. **Play only with a budget.** Jackpot, Coinflip and Roulette can take the stake. Withdraw what you want to keep.

If the signature prompt shows a contract interaction, a token amount or a chain you did not pick, cancel. Verification on this site is a typed message, not a swap.

The [MetaMask casino](/guides/metamask-casino) guide is the same path with MetaMask-specific clicks. Use it if you want screenshots of the Base network fields. Use this page if you want the custody idea: you remain the signer until the transfer leaves.

After a successful first loop, write down the pattern so you do not invent a new one when you are tired: verify, test send, full send, play to a stop, withdraw. Skipping the test send to "save gas" is how people learn about address-poisoning the expensive way.`,
    },
    {
      id: "risks",
      title: "Risks you accept when you hold the keys",
      body: `Self-custody crypto removes a company from the signer role. It adds jobs you cannot delegate.

- **No recovery desk.** If the seed is gone and the device is wiped, the USDC is gone.
- **Irreversible sends.** Wrong address or wrong network is usually final.
- **Physical theft.** A paper seed in a desk drawer is a target.
- **Inheritance.** If nobody else can find the backup, heirs cannot either.
- **Malware.** A hot self-custody wallet is still hot.

A casino never needs to take those jobs from you to credit a balance. Be suspicious of anyone who offers to "hold the seed for support."

USDC can still be frozen at an address by the issuer when law requires it. Self-custody is not sovereignty over Circle's blacklist. It is control of the key that signs.

Phishing sites impersonate wallets as often as they impersonate casinos. Bookmark the official extension page. Check the character-by-character URL. A "self custody crypto" landing page that asks you to paste a seed to "sync Base" is not a wallet. It is a collector.

Shared custody is a special case. If two people know the same seed, you do not have self-custody; you have joint custody with no undo. Multisig is the grown-up version of shared control. It is unnecessary for a $40 gambling budget and valuable for savings you refuse to keep on an exchange.`,
    },
    {
      id: "example",
      title: "Worked example: exchange USDC to a verified sender",
      body: `Alex buys $30 of USDC on an exchange and wants it on PVPspinArena.

1. Alex already created a self-custody wallet and stored the seed on paper.
2. Alex withdraws $30 USDC from the exchange on Base to that wallet. The exchange charges its withdrawal fee.
3. Alex signs the site verification from that wallet. The from-address is now linked to the account.
4. Alex sends $30 USDC on Base to the deposit address. A few cents of ETH pay gas.
5. After confirmations, $30.00 shows in the header. Alex can withdraw later to the same wallet.

If Alex had sent $30 straight from the exchange to the deposit address, the from-address might be a shared exchange wallet. The site could not match it to Alex automatically. Self-custody is what makes the match possible.

A second failure mode: Alex verifies wallet A, then deposits from wallet B because the exchange withdrawal landed on a different address in the same app. The site sees an unmatched sender. Always deposit from the verified address, even if that means one extra hop from a second account in the same wallet.

When Alex later withdraws, the destination can be A or a cold address Alex controls. The site still does not need the seed. Alex should read the outgoing address on the screen, not in a chat that "updated the treasury."`,
    },
    {
      id: "summary",
      title: "Summary: you sign, the casino credits, nobody takes the seed",
      body: `A self-custody wallet is the arrangement where you hold the keys. You sign deposits and proofs of ownership. The casino holds a balance only after credit, and it should never ask for the phrase that recreates the wallet.

Software updates and seed exports deserve a slow minute. Official wallet apps can show a recovery screen. A pop-up on a casino tab that asks for the same words is not an official update. Close the tab.

Use a dedicated hot wallet for play, keep savings colder, and treat every stake as money you can lose. PVPspinArena accepts USDC and ETH on Base from a verified address — nothing more. If you only remember three rules: you sign, the casino never needs the phrase, and a credited balance is no longer self-custodied until you withdraw. Adults aged 18 or over who skip those rules usually skip them when they are tired. Write the deposit loop down once.

The games are player-versus-player pots, not a reason to import a life-savings seed into a browser the night you sign up.

Splitting the key across several signers is a [multisig wallet](/guides/multisig-wallet).

A common beginner self-custody app is [Exodus](/guides/exodus-wallet).`,
    },
  ],
  faqs: [
    {
      q: "Does self-custody mean the casino cannot take my deposit?",
      a: "Once you send, the tokens are at the deposit address. Self-custody applies to what is still in your wallet. After credit you are waiting on the site to pay withdrawals, which on this site also means daily limits and review above $25.",
    },
    {
      q: "Is a non-custodial wallet the same as a self-custody wallet?",
      a: "Yes. Both phrases mean you hold the keys. Custodial means someone else does, including an exchange or a casino balance after credit.",
    },
    {
      q: "Why can’t I deposit from an exchange?",
      a: "Many exchanges send from a shared hot wallet. This site matches deposits to your verified address, so the send should come from that wallet after you withdraw USDC on Base to it.",
    },
    {
      q: "Will PVPspinArena ever ask for my seed phrase?",
      a: "No. Verification is a signed message that cannot move USDC. Anyone who asks for the words is not the site.",
    },
    {
      q: "What if I lose my self-custody wallet?",
      a: "Restore from the seed on a new device, offline, using the official wallet app. If the seed is lost too, the funds cannot be recovered by support, Circle or the casino. That is the trade you accept when you alone hold those recovery keys with no reset desk.",
    },
  ],
  sources: [
    { label: "ethereum.org — What is a wallet?", url: "https://ethereum.org/en/wallets/" },
    { label: "ethereum.org — Security", url: "https://ethereum.org/en/security/" },
    {
      label: "MetaMask — Basic safety tips",
      url: "https://support.metamask.io/privacy-and-security/basic-safety-and-security-tips-for-metamask/",
    },
  ],
  related: [
    "usdc-casino",
    "cold-wallet-vs-hot-wallet",
    "ledger-vs-trezor",
    "seed-phrase",
    "crypto-wallet-for-gambling",
    "export-metamask-private-key",
    "how-to-delete-metamask-account",
    "how-to-create-a-crypto-wallet",
    "multisig-wallet",
    "exodus-wallet",
  ],
  updated: "2026-09-26",
  howTo: true,
};
