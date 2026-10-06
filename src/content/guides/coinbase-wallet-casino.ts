import type { Guide } from "./types";

export const guide: Guide = {
  slug: "coinbase-wallet-casino",
  cluster: "Crypto payments",
  keyword: "coinbase wallet",
  secondary: [
    "coinbase wallet gambling",
    "coinbase wallet vs coinbase",
    "coinbase wallet dapp",
    "coinbase wallet base",
  ],
  title: "Coinbase Wallet Casino Guide: Deposits and Safety",
  description:
    "How Coinbase Wallet works at a crypto casino: self-custody versus Coinbase exchange, networks, dapp connections, and safer USDC deposits on Base.",
  h1: "Coinbase Wallet at a casino: self-custody, networks and deposits",
  answer:
    "A Coinbase Wallet is a self-custody app from Coinbase. It is not the same product as a Coinbase.com exchange account. At a casino you connect Coinbase Wallet, prove the address with a signature if the site asks and send tokens yourself. PVPspinArena verifies a wallet by signing a message, then credits USDC or ETH on Base from that address. Funds on the Coinbase exchange still need a withdrawal to a wallet you control before they can match.",
  facts: [
    "Coinbase Wallet is self-custody; Coinbase the exchange holds crypto for you until you withdraw.",
    "Connecting Coinbase Wallet shares a public address; it does not give the site your recovery phrase.",
    "Base uses the same address format as Ethereum, but USDC on the wrong network will not credit.",
    "PVPspinArena matches deposits to a verified sender and never asks for a token approval.",
    "You must be 18 or older to gamble; a wallet connection does not change that legal line.",
  ],
  sections: [
    {
      id: "two-products",
      title: "Coinbase Wallet versus the Coinbase exchange",
      body: `People say “Coinbase” for two different things. The exchange at Coinbase.com is a custodial account: you log in with email, pass identity checks and Coinbase holds the coins. [Coinbase Wallet](/guides/crypto-wallet-for-gambling) is a separate app. You hold the recovery phrase. If you delete the app without the phrase, Coinbase cannot reset it like a password.

Casinos that match deposits by sender address need a wallet you control. An exchange withdrawal often comes from a shared hot wallet. PVPspinArena cannot safely map that shared sender to your player account. The practical path is: buy or hold USDC on the exchange if you want, then withdraw to Coinbase Wallet or MetaMask on Base and deposit from the address you verified.

Our [Coinbase to MetaMask transfer](/guides/coinbase-to-metamask-transfer) guide covers the exchange-to-wallet hop in detail. The same network rules apply if the destination is Coinbase Wallet instead of MetaMask.

### Quick contrast

- **Exchange:** login, KYC, customer support, shared withdrawal addresses.
- **Wallet:** recovery phrase, you sign, you pay gas, you pick the network.
- **Casino match:** verified self-custody sender on the watched chain.

Do not type your Coinbase.com password into a dapp. Do not type your wallet phrase into Coinbase.com. They are different secrets.

A third mix-up is “sign in with Coinbase” on random sites. That OAuth flow is for the exchange identity, not a proof that you control a Base address. PVPspinArena wants a wallet signature from the address that will send USDC. An exchange login cannot substitute for that signature, and it should not be entered on a clone domain that only looks like Coinbase.

If you keep a large balance on the exchange for convenience, withdraw only the gaming slice to Coinbase Wallet. The exchange is the right place for recovery emails and support tickets about a failed bank purchase. The wallet is the right place for a casino deposit. Crossing those jobs is how people paste the site address into Coinbase send and then cannot match the deposit.`,
    },
    {
      id: "connect",
      title: "Connecting Coinbase Wallet to a casino",
      body: `On mobile, Coinbase Wallet has a dapp browser and WalletConnect. On desktop you may pair with a QR code. The first prompt is a connection: the site wants the public address.

### Check before you approve

- The URL should match a bookmark, not an ad redirect.
- The request should name Coinbase Wallet, not ask you to “import” or “sync” with 12 words.
- After connect, a honest [USDC casino](/guides/usdc-casino) still needs a deposit you send, or a signature that only proves ownership.

### On PVPspinArena

Sign in, open your profile, verify the wallet and sign the short message. That message cannot move USDC. The site then watches Base for transfers from that address to the deposit address shown on the [wallet](/wallet) page.

If you connect but never sign, the site does not have a verified sender. If you sign with account A and send from account B, the deposit will not match automatically.

Disconnect sites you no longer use in the wallet’s connection settings. A stale connection is not a spend approval, but it is one more origin that can pop requests.

On iOS and Android the wallet may switch apps mid-flow. When you return, read the prompt again. A signature request that appeared while the app was in the background is not automatically the one you started. If the text is not the verify message you expected, reject it and start from the bookmarked site.

Desktop users sometimes keep Coinbase Wallet extension and the mobile app on the same recovery phrase. That is one wallet, two surfaces. Verify once with the address you will send from. Do not verify the extension and then deposit from a different derived account in the mobile app. The site matches the exact sender.`,
    },
    {
      id: "networks",
      title: "Networks inside Coinbase Wallet",
      body: `Coinbase Wallet can show Ethereum, Base and other chains. USDC exists on several of them. The send screen’s network toggle is the decision that matters.

PVPspinArena only credits USDC and ETH on Base. Ethereum mainnet USDC, Polygon USDC and Solana USDC are different tokens. Base addresses look like Ethereum addresses. That similarity is why people send mainnet USDC to a Base deposit and then wait forever.

### Before every send

1. Confirm the site deposit page says Base.
2. Switch Coinbase Wallet to Base.
3. Select USDC or ETH on Base, not a lookalike from another tab.
4. Leave a little ETH on Base for the network fee if you are sending USDC.
5. Compare the first and last characters of the pasted address.

If the exchange withdrawal screen offers “USDC — Base,” that is the network you want when funding the wallet. If it offers “USDC — Ethereum,” you will pay more gas and still have the wrong chain for this site.

This is the same class of mistake covered across [crypto payments](/guides/topics/crypto-payments): the asset name is incomplete without the chain.

Coinbase the exchange and Coinbase Wallet can disagree about which networks they show first. The exchange might default to a cheap Solana USDC withdrawal. The wallet might open on Ethereum because that is where you last swapped. Neither default is a hint from PVPspinArena. The deposit page is the only authority for this site.

If you hold ETH on Ethereum in Coinbase Wallet and USDC on Base, the home screen dollar total adds them. That sum is not a Base balance. Open the Base network view and read USDC and ETH there before you copy any amount into a send form.`,
    },
    {
      id: "deposit-flow",
      title: "A safer USDC deposit from Coinbase Wallet",
      body: `Once the wallet is verified, a deposit is an ordinary transfer.

1. Copy the deposit address from the site while you are logged in.
2. In Coinbase Wallet, send USDC on Base to that address.
3. Confirm the fee and the destination.
4. Wait for Base confirmations. The site checks the chain, waits for safety and credits when two data providers agree.

ETH on Base also works. The credited amount is the dollar value at credit time, then the balance stays in dollars.

### Why this is safer than in-dapp “approve and play” designs

Some casinos ask the wallet to approve a contract that can pull tokens. That is convenient and dangerous. PVPspinArena does not use that pattern. You send USDC. The contract is not spending from your wallet in the background.

If you see an approval, a permit or an unlimited allowance, you are not on the deposit flow this site documented. Reject it.

Start with a small test. A first $2 send that credits is cheaper than a $200 send on the wrong network.

After the test credits, send the rest in one transfer if you want. Splitting into five $10 sends does not make matching safer once the sender is verified; it only multiplies gas and support noise. The exception is a new destination address: if you copied the deposit address again after a site redesign, compare it to the first successful send before you raise the size.`,
    },
    {
      id: "safety",
      title: "Dapp browser risks and recovery habits",
      body: `The Coinbase Wallet dapp browser is a real browser with a built-in signer. Search results and in-app banners can still land on [fake casino sites](/guides/fake-casino-sites). Bookmark the real origin. Do not follow “support” links from chat.

### Recovery phrase

When you created Coinbase Wallet you wrote down a recovery phrase. That phrase restores the wallet. Coinbase the company will not ask for it in email. The casino will not ask for it. If a prompt looks like a Coinbase login but wants 12 words, it is a phishing page.

Keep a dedicated gaming balance in the wallet you connect to casinos. Larger holdings can stay on the exchange until you withdraw, or on a hardware wallet. Connecting a stuffed wallet to every new site raises the cost of one bad signature.

### Approvals you may have signed elsewhere

If you used Coinbase Wallet on other dapps, review token allowances with a reputable explorer tool and revoke what you do not need. Old unlimited USDC approvals are a common drain path that has nothing to do with PVPspinArena’s message-only verify step.

Watch for airdrop pop-ups after you connect. Unknown tokens that appear in Coinbase Wallet are often bait. Opening their “claim” site is how people sign a permit. Hide or ignore them. They do not unlock a casino bonus.

If you lose the device, restore Coinbase Wallet from the paper phrase on a new phone, then confirm the same address still verifies on your profile. The site does not need the phrase to “relink.” If someone in chat offers a relink form, they are stealing the wallet.`,
    },
    {
      id: "worked-example",
      title: "Worked example: exchange buy to first credited balance",
      body: `You want $25 of playable balance for Jackpot or [Roulette](/roulette).

1. Buy 30 USDC on Coinbase.com if that is where your card or bank already works.
2. Withdraw 30 USDC to your Coinbase Wallet address on **Base**. Send $1 first if this is a new address book entry.
3. In Coinbase Wallet, confirm 30 USDC arrived on Base, not on Ethereum.
4. On PVPspinArena, verify that same Coinbase Wallet address by signing the message.
5. Send 25 USDC on Base to the site deposit address. Keep a few USDC and some ETH for later gas.
6. When $25.00 shows in the header, you can enter a PvP game. Later withdrawals go back to an address you specify, with a $250 daily cap and review above $25.

If step 2 used Ethereum by accident, do not send that USDC to the site. Move it to Base first with a supported withdrawal or a careful bridge, then test again.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `Coinbase Wallet is a self-custody wallet with a familiar brand. The exchange is a different product with different addresses. For casino deposits, verify the wallet, pick Base and send USDC or ETH yourself. Read every prompt. Never share the recovery phrase. PVPspinArena will not ask you to approve token spending.

If you are still funding from Coinbase.com, treat the withdrawal network as the whole game. Base is the chain this site watches. Everything else is a delay or a loss until you correct it.

When you are ready to play, open PvP Jackpot, Coinflip or Roulette with a budget you wrote down before the first deposit. A working Coinbase Wallet setup does not change the odds. It only changes whether the dollars you meant to risk actually arrive. If a prompt ever asks you to approve unlimited USDC “so the casino can settle faster,” reject it and leave. That is not how this site pays or receives money.`,
    },
  ],
  faqs: [
    {
      q: "Is Coinbase Wallet the same as logging into Coinbase?",
      a: "No. The wallet is self-custody with a recovery phrase. The exchange is a custodial account. Casinos that match by sender need the wallet you control.",
    },
    {
      q: "Can I deposit straight from my Coinbase.com balance?",
      a: "Not as a matched deposit on PVPspinArena. Withdraw USDC on Base to a verified wallet, then send from that wallet to the site address.",
    },
    {
      q: "Does Coinbase Wallet work on Base?",
      a: "Yes, if you select Base on the send screen. USDC sent on Ethereum or another chain will not credit.",
    },
    {
      q: "What does the verification signature do?",
      a: "It proves you control the address. It costs no gas and cannot transfer tokens. PVPspinArena uses it instead of a token approval.",
    },
    {
      q: "Will support ever need my Coinbase Wallet phrase?",
      a: "No. Anyone who asks for it is a scammer. Official help will ask for a transaction hash, not words.",
    },
    {
      q: "Do I need ETH in Coinbase Wallet to deposit USDC?",
      a: "Yes, a small ETH balance on Base to pay the network fee for the USDC transfer. Receiving USDC from Coinbase.com does not spend that ETH.",
    },
  ],
  sources: [
    { label: "Coinbase Wallet help", url: "https://help.coinbase.com/en/wallet" },
    { label: "Coinbase — What is Coinbase Wallet?", url: "https://www.coinbase.com/wallet" },
    { label: "Base network documentation", url: "https://docs.base.org/" },
    { label: "Circle USDC", url: "https://www.circle.com/en/usdc" },
  ],
  related: [
    "usdc-casino",
    "trust-wallet-casino",
    "walletconnect-casino",
    "self-custody-wallet",
    "cold-wallet-vs-hot-wallet",
  ],
  updated: "2026-09-26",
};
