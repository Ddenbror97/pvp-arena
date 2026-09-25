import type { Guide } from "./types";

export const guide: Guide = {
  slug: "metamask-casino",
  cluster: "Crypto payments",
  keyword: "metamask casino",
  secondary: ["metamask gambling", "casino that accepts metamask", "connect metamask to casino", "wallet signature"],
  title: "MetaMask Casino Guide: Connect, Deposit and Stay Safe",
  description:
    "How a MetaMask casino works: connecting your wallet, what signing a message means, depositing on Base, and the safety checks to make before approving anything.",
  h1: "MetaMask casino guide: connect, deposit and stay safe",
  answer:
    "A MetaMask casino is a crypto casino you can use with the MetaMask wallet. You connect MetaMask to prove which address is yours, usually by signing a free message, then send deposits from that wallet on the network the site supports. Your funds stay in MetaMask until you send them, and you should never share your secret recovery phrase with any site.",
  facts: [
    "MetaMask is a self-custody wallet: only you hold the keys to its addresses.",
    "Connecting a wallet only shares your public address; it does not give a site access to your funds.",
    "Signing a plain text message costs no gas and cannot move tokens by itself.",
    "PVPspinArena uses a signed message to verify your wallet, then matches deposits by that address.",
    "No legitimate site will ever ask for your secret recovery phrase or private key.",
  ],
  sections: [
    {
      id: "what-is",
      title: "What is a MetaMask casino?",
      body: `MetaMask is one of the most widely used crypto wallets. It runs as a browser extension and a mobile app, and works with Ethereum and compatible networks such as Base. A MetaMask casino is simply a [crypto casino](/guides/what-is-a-crypto-casino) that lets you use MetaMask to identify yourself and to send deposits.

There are two common designs:

- **Wallet as identity.** You connect MetaMask and sign a message to prove you own an address. The site links that address to your account and credits deposits sent from it.
- **Wallet as login.** Some sites let you sign in with only your wallet, with no email or password.

PVPspinArena uses the first design. You sign in with an email code, then verify your MetaMask wallet on your profile. Deposits sent from that verified address on Base are matched to your account.

In both designs, your funds stay in your wallet until you choose to send them. The site never has permission to move tokens out of MetaMask on its own, as long as you only sign messages and never approve token spending you do not understand.`,
    },
    {
      id: "setup",
      title: "Setting up MetaMask for casino play",
      body: `If you do not have MetaMask yet, set it up before you visit any casino.

1. **Install from the official source.** Download the extension from metamask.io or the official browser store listing, or the mobile app from the official app store. Fake MetaMask downloads are a common scam.
2. **Create a wallet.** Choose a strong password for the app.
3. **Write down the secret recovery phrase.** This is 12 words that can restore your wallet on any device. Write it on paper, keep it offline, and never type it into a website.
4. **Add the Base network.** PVPspinArena accepts deposits on Base. Our guide on [adding Base to MetaMask](/guides/add-base-network-metamask) shows the settings.
5. **Fund the wallet.** Buy or transfer USDC or ETH on Base. Our [how to buy USDC guide](/guides/how-to-buy-usdc) covers exchanges and networks.

### Consider a separate account

MetaMask lets you create multiple accounts in the same wallet. Using a separate account only for gaming, funded with your [gambling budget](/guides/gambling-budget), keeps your main savings out of reach and makes your spending easy to see.`,
    },
    {
      id: "connect",
      title: "Connecting MetaMask to a casino",
      body: `When you connect MetaMask to a website, the site asks the wallet for your public address. MetaMask shows a pop-up asking which account to share.

### What connecting does

- It shares your public address and the network you are on.
- It lets the site ask MetaMask to show you requests, such as signing a message or sending a transaction.

### What connecting does not do

- It does not give the site your private key or recovery phrase.
- It does not let the site move your funds without your approval.
- It does not approve any spending.

### Disconnecting

You can see and remove connected sites in MetaMask's settings under connected sites or permissions. It is good practice to disconnect sites you no longer use.

### On PVPspinArena

On your profile, choose to verify a wallet. MetaMask asks to connect, then asks you to sign a short message. Once signed, the address is linked to your account. Only one player can verify a given address, and the site's own treasury and payout addresses can never be linked to a player account.`,
    },
    {
      id: "signing",
      title: "Signing messages vs approving transactions",
      body: `MetaMask shows you several kinds of requests. Knowing the difference is the most important safety skill for any MetaMask casino.

### Signing a message

A plain message signature, often labelled "Signature request", shows readable text such as "Verify wallet for PVPspinArena" with a unique code. Signing it proves you control the address. It costs no gas, sends nothing on-chain and cannot move tokens.

### Sending a transaction

A transaction moves value or calls a smart contract. It costs gas and appears on the blockchain. Sending USDC to a deposit address is a transaction.

### Token approvals

An approval gives a smart contract permission to spend your tokens, sometimes up to an unlimited amount. This is the request scammers most want you to sign. A simple deposit to an address does not need an approval.

### Typed data signatures

Some requests show structured data. These can be legitimate, but certain types, such as "permit" signatures, act like approvals. If MetaMask shows a spending cap or mentions permit, stop and check.

### A simple rule

On PVPspinArena you will only ever sign a readable verification message and send ordinary transfers. You will never be asked to approve token spending.`,
    },
    {
      id: "deposit",
      title: "Depositing from MetaMask",
      body: `Once your wallet is verified, depositing is a normal transfer.

1. **Open the wallet page** on the site and copy the deposit address. Check the network shown, which is Base on PVPspinArena.
2. **Switch MetaMask to Base.** Check the network name at the top of MetaMask.
3. **Choose the token.** Select USDC or ETH.
4. **Paste the address and amount.** Double-check the first and last characters of the address.
5. **Review the fee and confirm.** Base fees are usually a fraction of a cent to a few cents.
6. **Wait for confirmations.** The site detects the transfer and credits it after confirmation checks.

### Why the sending address matters

PVPspinArena matches deposits to your account by the verified sending address. If you send from an exchange or a different wallet, the deposit cannot be matched automatically. Always send from the MetaMask account you verified.

### Test first

For your first deposit, send a small amount and wait until it is credited before sending more. Our [USDC casino guide](/guides/usdc-casino) explains what happens at each stage.`,
    },
    {
      id: "withdraw",
      title: "Withdrawing back to MetaMask",
      body: `Withdrawals go the other way: the site sends funds from its payout wallet to your address.

### What to expect

- You request an amount on the wallet page.
- The site checks your balance and holds the amount.
- The payout is sent on Base. On PVPspinArena, withdrawals are only marked finished once the payment is in a safe block and two independent blockchain data providers agree.
- The tokens appear in MetaMask.

### Limits and reviews

Many sites have withdrawal limits and manual reviews for larger amounts. On PVPspinArena there is a daily limit, and larger requests wait for review before being sent.

### If tokens do not show

If MetaMask does not display received USDC, the token may just need adding. Search for USDC in MetaMask's token list on Base, or import it using the official USDC contract address for Base published by Circle. Check the transaction on a Base block explorer to confirm it arrived.

Our upcoming [crypto casino withdrawals guide](/guides/crypto-casino-withdrawals) covers timings and common delays in more depth.`,
    },
    {
      id: "safety",
      title: "MetaMask safety checklist",
      body: `Most losses from MetaMask casinos come from scams, not from games. Keep this checklist in mind.

- **Never share your recovery phrase.** No site, support agent or admin will ever need it. Anyone asking is a scammer.
- **Check the URL.** Phishing sites copy real casino designs. Bookmark the real address and use the bookmark.
- **Read every pop-up.** If MetaMask shows an approval, a spending cap or a permit, and you only meant to verify or deposit, reject it.
- **Beware of fake support.** Scammers message people in chat or social media offering help. Use only official support channels.
- **Ignore surprise tokens.** Unknown tokens that appear in your wallet can lead to scam sites. Do not interact with them.
- **Keep software updated.** Update MetaMask and your browser regularly.
- **Revoke old approvals.** Block explorer tools let you review and revoke token approvals you gave in the past.
- **Use a hardware wallet for savings.** For larger amounts, keep funds on a hardware wallet and move only a gaming budget to a hot wallet.

Our [crypto wallet for gambling guide](/guides/crypto-wallet-for-gambling) compares wallet types in more detail.`,
    },
    {
      id: "troubleshooting",
      title: "Common MetaMask problems",
      body: `A few problems come up again and again.

- **Wrong network.** If a deposit does not arrive, check you sent on Base. Transfers on another network do not appear on Base.
- **Not enough ETH for gas.** Sending USDC on Base still needs a tiny amount of ETH on Base to pay the network fee.
- **Pending transaction stuck.** Rarely, a transaction waits because the fee was too low. MetaMask lets you speed up or cancel pending transactions.
- **Signature pop-up not appearing.** Click the MetaMask icon; requests sometimes open behind the browser window. On mobile, use the browser built into the MetaMask app.
- **Address already linked.** On PVPspinArena, each wallet can be verified by only one account. If you see this message, use a different MetaMask account.
- **Deposit sent from an exchange.** Deposits from exchange addresses cannot be matched to your account automatically. Withdraw from the exchange to your verified MetaMask first.

If a deposit still does not show after confirmations, keep the transaction hash and contact support.`,
    },
    {
      id: "next",
      title: "Where to go next",
      body: `Once your wallet is verified and funded, read [how it works](/how-it-works) for an overview of PVPspinArena's games, balances and payments. You can check any finished game on the [Fairness page](/fairness), which runs every check in your own browser.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `A MetaMask casino lets you keep control of your funds while playing. Connecting shares only your public address, and signing a readable message proves ownership without costing gas or moving tokens.

Set up MetaMask from the official source, keep your recovery phrase offline, add Base and fund a separate gaming account. Deposit by sending USDC or ETH from your verified address on the correct network, and expect withdrawals to pass confirmation checks and limits.

The biggest risks are phishing and misleading approvals. Read every pop-up, never share your phrase and reject any spending approval you did not expect. Then you can enjoy PvP games like [crypto jackpot](/guides/crypto-jackpot) with your wallet safely in your hands.`,
    },
  ],
  faqs: [
    {
      q: "Is it safe to connect MetaMask to a casino?",
      a: "Connecting only shares your public address. The risk comes from what you sign or approve afterwards. Read every request and reject token approvals you did not expect.",
    },
    {
      q: "Does signing a message cost gas?",
      a: "No. A plain message signature is created in your wallet and never sent to the blockchain, so it costs nothing and cannot move tokens.",
    },
    {
      q: "Which network should I use in MetaMask for PVPspinArena?",
      a: "Use Base. PVPspinArena accepts USDC and ETH on Base, and transfers sent on other networks will not arrive.",
    },
    {
      q: "Why do I need ETH if I deposit USDC?",
      a: "Network fees on Base are paid in ETH. Keep a small amount of ETH on Base in your wallet to cover the fee for USDC transfers.",
    },
    {
      q: "Can a casino take funds from my MetaMask?",
      a: "Not without your approval. A site can only move your tokens if you send them or approve a contract to spend them, so never approve spending you do not understand.",
    },
  ],
  sources: [
    { label: "MetaMask Help Center", url: "https://support.metamask.io/" },
    { label: "Base documentation: network information", url: "https://docs.base.org/chain/network-information" },
    { label: "Ethereum.org: wallets", url: "https://ethereum.org/en/wallets/" },
    { label: "EIP-191: Signed data standard", url: "https://eips.ethereum.org/EIPS/eip-191" },
  ],
  related: ["add-base-network-metamask", "crypto-wallet-for-gambling", "usdc-casino"],
  updated: "2026-09-25",
};
