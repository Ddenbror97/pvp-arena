import type { Guide } from "./types";

export const guide: Guide = {
  slug: "walletconnect-casino",
  cluster: "Crypto payments",
  keyword: "wallet connect",
  secondary: [
    "walletconnect",
    "wallet connect qr",
    "walletconnect phishing",
    "connect wallet casino",
  ],
  title: "WalletConnect Casino Guide: Sign-In Without Seed",
  description:
    "How Wallet Connect works at a casino: QR pairing, what a signature can and cannot do, phishing prompts, and safer ways to verify a wallet.",
  h1: "Wallet Connect at a casino: pair, sign and avoid fake prompts",
  answer:
    "Wallet Connect is a pairing protocol. A desktop site shows a QR code, your mobile wallet scans it and the two sides can request signatures or transactions without you typing a seed phrase. At a casino that is useful for proving an address and sending a deposit from your phone. It is also a favourite phishing channel: a copied QR or a hostile session can still ask you to sign a spend. PVPspinArena only needs a readable message signature, then a normal transfer on Base.",
  facts: [
    "Wallet Connect pairs a site with a wallet; it is not a wallet and it does not hold keys.",
    "Scanning a QR shares a session so the site can send requests to your wallet app.",
    "A plain message signature cannot move tokens; a transaction or approval can.",
    "PVPspinArena verifies wallets with a signed message and never asks for a seed phrase.",
    "You should disconnect sessions you do not recognise and never scan a QR from chat support.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What Wallet Connect is (and is not)",
      body: `Wallet Connect, often written WalletConnect, is a way for a website to talk to a mobile or desktop wallet over an encrypted session. You do not create a new account with “Wallet Connect.” You already have MetaMask, Coinbase Wallet, Trust Wallet or another compatible app. The protocol only carries requests.

That matters at a [crypto wallet for gambling](/guides/crypto-wallet-for-gambling) setup because many players browse on a laptop and keep keys on a phone. Pairing avoids exporting keys. It does not avoid reading prompts.

### What a session can do

- Show your public address to the site.
- Ask you to sign a message.
- Ask you to send a transaction or approve a contract.

### What a session cannot do by itself

- Recreate your wallet from a [seed phrase](/guides/seed-phrase).
- Move funds if you never approve a request.
- Make a wrong-network deposit suddenly appear on Base.

If a page asks you to type 12 words “to connect with Wallet Connect,” it is fake. Real pairing is a scan or a deep link, then in-app approvals.

Players must be 18 or older. A paired wallet is still real money.

Wallet Connect versions differ in relay servers and metadata, but the user job stays the same: confirm the origin, then confirm each later request as if it were a new decision. A green check on the pairing card is not a review of the next contract call. Scammers rely on people treating the session as a trusted tunnel. It is a tunnel to whatever site created the QR.

Some wallets show “WalletConnect” and “Wallet Connect” in the same menu as browser extensions. Pick the official entry in your wallet app. A third-party “WC helper” extension that asks to import keys is not the protocol.`,
    },
    {
      id: "pair-steps",
      title: "How to pair with a QR code, step by step",
      body: `This is the usual desktop-to-mobile flow.

1. **Open the real site from a bookmark.** Phishing domains run Wallet Connect too.
2. **Choose Wallet Connect** in the site’s connect modal, not a random browser extension you did not install.
3. **Confirm the WalletConnect modal** shows a QR and a list of wallet apps.
4. **Open your wallet app** and use its official scan or WalletConnect button.
5. **Read the pairing screen** in the wallet: origin name, URL and the address you are sharing.
6. **Approve the session** only if the URL matches the site in your laptop browser.
7. **Stay in the wallet** for the next prompt. Do not approve a second QR from a popup you did not start.

### On PVPspinArena

After the session exists, the site asks you to sign a short verification message. Approve that in the wallet. Then disconnect if you like; you do not need a live session sitting open to keep the address verified. Deposits still come from a send you start yourself on Base.

If the QR expires, start again from the site. Do not reuse a screenshot of an old code.

See [how it works](/how-it-works) for why the site wants a verified sender at all: deposits are matched to that address, not to a session id.

If the laptop tab sleeps and you come back to a new QR, assume the old session is dead. Scan the new code only after you confirm you still sit on the bookmarked domain. Close extra Wallet Connect modals from other tabs first. Two tabs can show two QRs, and the wrong scan pairs you with a phishing overlay you did not notice.

Mobile-only users can often skip QR pairing and use the wallet’s built-in browser on the same bookmarked URL. Wallet Connect is for the split-device case, not a requirement.`,
    },
    {
      id: "signatures",
      title: "What a signature can and cannot do",
      body: `This is the skill that keeps Wallet Connect useful instead of dangerous.

### Message signature

Readable text such as “Verify wallet for PVPspinArena” plus a nonce is the safe case. Signing proves you control the address. It is off-chain. It costs no gas. It cannot transfer USDC.

### Typed data

Structured “Sign typed data” requests can be legitimate. Some of them behave like permits: they grant a spender. If the wallet decodes a spending cap, a token and a spender you do not recognise, reject it. A casino verify step should not need a permit.

### Send transaction

A transaction is on-chain. You pay gas. Value or a contract call moves. Sending USDC to a deposit address is this type. Sending ETH to a random operator is also this type. Read the to-address.

### Token approval

An approval lets a contract pull tokens later. PVPspinArena does not need one. If Wallet Connect surfaces an approve or increaseAllowance while you thought you were only signing in, you are in the wrong flow.

Our [MetaMask casino](/guides/metamask-casino) guide uses the same distinctions; Wallet Connect is just the pipe that delivers the prompt to your phone.

On a small phone screen, wallets collapse details behind “view more.” Open those details every time until the habit sticks. You want the destination address or the decoded spender, not only the dapp name. A verify message should be readable English plus a nonce. If you see hex-only data and the wallet cannot decode it, treat that as a stop, not as a puzzle.

Gas estimates on a Wallet Connect transaction are paid by the wallet’s current network. If the phone is on Ethereum and you thought you were depositing on Base, you may sign a costly mainnet send. Check the network badge in the wallet before you confirm, not only the site copy on the laptop.`,
    },
    {
      id: "phishing",
      title: "Phishing prompts, fake QRs and session hijacks",
      body: `[Fake casino sites](/guides/fake-casino-sites) love Wallet Connect because the UI looks official inside your real wallet. The wallet branding is genuine. The site is not.

### Common patterns

- Ads and Discord “support” send a QR that pairs you with their dapp, then ask for an unlimited USDC approval.
- A clone site uses a lookalike domain and a real Wallet Connect QR.
- After you pair the real site, a second overlay asks you to “re-verify” with a different QR.

### Habits that cut most of this

- Bookmark the casino. Type it yourself once.
- Compare the URL on the laptop with the URL shown in the wallet pairing card.
- One session at a time. If you already paired, do not scan a second code for the same task.
- Reject any request that mentions spending, bridging or claiming airdrops while you are trying to verify.
- In the wallet, open active sessions and disconnect stale ones after you finish.

Wallet Connect metadata can be spoofed more easily than people expect. The durable check is the destination address and the decoded action, not the logo on the QR modal.

Support impersonators send “reconnect” QRs after a fake deposit failure. A real support agent can ask for a transaction hash you already have. They cannot fix a pending prompt by pairing a new session. If you did not start a deposit, you do not need a new QR.

Another pattern is a session that stays alive for weeks. You verify once, forget the pairing and later approve a swap because the wallet banner looks like the casino. After you sign the message, open the wallet’s session list and disconnect. Re-pair the next time you need a signature. A few extra seconds beat an unlimited allowance.`,
    },
    {
      id: "pvp-use",
      title: "Using Wallet Connect with PVPspinArena",
      body: `PVPspinArena is a PvP Jackpot, Coinflip and Roulette site. It accepts USDC and ETH on Base. Wallet Connect is optional plumbing. You can also use a browser extension on the same machine.

What the site needs:

- A verified address, proven with a message signature.
- Later deposits from that same address on Base.
- Withdrawals you request on the site, sent on-chain after checks, not pushed through Wallet Connect automatically.

Daily withdrawals cap at $250. Amounts over $25 wait for review. Those rules do not change because you paired with a phone.

If your mobile wallet is on the wrong network when you send, the session will still look “connected.” Connection is not a network guarantee. Switch the wallet to Base before the USDC transfer.

Keep a small ETH balance on Base for gas. Wallet Connect cannot pay the fee for you.

If several addresses live in the mobile wallet, the pairing screen should show which account you are sharing. Verify that account, then send from it. Pairing account 1 and sending from account 2 is the same mismatch as using two browser profiles. The session does not merge them.

When a withdrawal later lands in the wallet, Wallet Connect is not involved. The site broadcasts a Base transfer to the address you typed on the [wallet](/wallet) page. You only need the app to watch Base and to display USDC.`,
    },
    {
      id: "worked-example",
      title: "Worked example: first verify on a laptop",
      body: `You are on a laptop without MetaMask installed. Your USDC is in a mobile wallet.

1. Bookmark pvpspinarena and sign in.
2. Open profile, choose verify wallet, pick Wallet Connect.
3. Scan the QR with the official scanner in your wallet app.
4. Confirm the pairing URL matches the tab.
5. Sign the verification message only. If the next screen is an approval, reject and leave.
6. Disconnect the session in the wallet if you want the pairing gone.
7. On the phone, send a small USDC amount on Base to the deposit address. Wait for credit.
8. Send the rest the same way if the test worked.

That is the whole how-to. No seed words, no token allowance, no “sync.”`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `Wallet Connect is a pairing layer, not a bank. Use it to keep keys on your phone and still verify a desktop session. Read every request as if a stranger handed you a contract. PVPspinArena only needs a message signature and a Base transfer. Scan QRs you started, disconnect leftovers and never treat a Wallet Connect prompt as proof that a site is honest.

These checks belong with the rest of [crypto payments](/guides/topics/crypto-payments): the protocol is only as safe as the prompt you approve.`,
    },
  ],
  faqs: [
    {
      q: "Do I enter my seed phrase to use Wallet Connect?",
      a: "No. You scan a QR or approve a deep link in a wallet you already set up. A site that wants the words is phishing.",
    },
    {
      q: "Can a Wallet Connect session drain my wallet?",
      a: "Not by existing. It can drain you if you approve a malicious transaction or token allowance. Reject unknown spends.",
    },
    {
      q: "Does signing the PVPspinArena message cost gas?",
      a: "No. A plain message signature is off-chain. Gas starts when you send USDC or ETH on Base.",
    },
    {
      q: "The QR code expired. What now?",
      a: "Open Wallet Connect again from the real site and scan a fresh code. Do not use a photo of an old QR.",
    },
    {
      q: "Should I leave Wallet Connect connected after I verify?",
      a: "You do not need to. The verified address stays on your account. Disconnecting reduces surprise prompts.",
    },
    {
      q: "Is Wallet Connect safer than a browser extension?",
      a: "It can be, because keys stay on the phone. It is not safer if you rubber-stamp requests. The prompt is still the risk.",
    },
  ],
  sources: [
    { label: "WalletConnect documentation", url: "https://docs.walletconnect.com/" },
    { label: "Ethereum.org — What is a wallet?", url: "https://ethereum.org/en/wallets/" },
    {
      label: "MetaMask — WalletConnect connections",
      url: "https://support.metamask.io/more-web3/wallets-and-accounts/how-to-use-walletconnect/",
    },
  ],
  related: [
    "usdc-casino",
    "self-custody-wallet",
    "cold-wallet-vs-hot-wallet",
    "ledger-vs-trezor",
    "seed-phrase",
    "metamask-login-help",
  ],
  updated: "2026-09-26",
  howTo: true,
};
