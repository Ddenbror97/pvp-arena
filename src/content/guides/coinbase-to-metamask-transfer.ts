import type { Guide } from "./types";

export const guide: Guide = {
  slug: "coinbase-to-metamask-transfer",
  cluster: "Crypto payments",
  keyword: "coinbase to metamask transfer",
  secondary: [
    "send from coinbase to metamask",
    "coinbase withdraw to metamask",
    "coinbase usdc to metamask",
    "coinbase base network",
  ],
  title: "Coinbase to MetaMask Transfer: Step-by-Step Guide",
  description:
    "How a Coinbase to MetaMask transfer works: withdraw USDC on Base, avoid the wrong network, test amounts, fees, and what to do if funds stall.",
  h1: "Coinbase to MetaMask transfer: withdraw USDC on the right network",
  answer:
    "A Coinbase to MetaMask transfer is an exchange withdrawal to an address you control. You copy your MetaMask address, choose USDC, pick the Base network on Coinbase and confirm. Coinbase then sends an on-chain transfer. The coins are not in MetaMask until that transaction confirms. Wrong network is the usual failure. For PVPspinArena you still take a second step: verify MetaMask and send USDC on Base to the site.",
  facts: [
    "Coinbase.com is custodial; MetaMask is self-custody. The transfer is a withdrawal, not an in-app move.",
    "You must pick the same network on Coinbase that MetaMask is ready to receive, such as Base for this site.",
    "A small test withdrawal catches address-book and network mistakes before a large send.",
    "After USDC arrives in MetaMask you still need ETH on Base to pay gas for a later casino deposit.",
    "PVPspinArena credits deposits from a verified MetaMask sender, not from Coinbase’s withdrawal wallet.",
  ],
  sections: [
    {
      id: "why-two-steps",
      title: "Why Coinbase and MetaMask are two hops",
      body: `Buying USDC on Coinbase is often the easy part. Playing on a site that matches deposits by sender is the second product. Coinbase withdrawals come from exchange hot wallets. PVPspinArena cannot treat those shared senders as your player wallet.

So the honest flow is Coinbase → your MetaMask on Base → site deposit address from that same MetaMask account. Our [MetaMask casino](/guides/metamask-casino) guide covers verify-and-deposit. This guide is only the first hop.

If you wanted Coinbase Wallet instead of MetaMask, the network rules are identical. The destination address just lives in a different app.

You must be 18 or older to gamble after the coins arrive. Moving USDC is not a bet, but it is still irreversible once Coinbase broadcasts.

Think of Coinbase as a shop that will ship to an address you name. MetaMask is the mailbox. The casino is a second shipment you start yourself. If you ask Coinbase to ship straight to the casino, the package may arrive, but the site’s matching rules may not accept the return address on the box. That is why this guide insists on the mailbox hop.

Advanced users sometimes keep USDC on Coinbase and only withdraw when they want to play. That is fine. Just do not treat a Coinbase balance as already “on Base in MetaMask.” Until the explorer shows a receive at your address, you still have an IOU at the exchange.`,
    },
    {
      id: "prepare-metamask",
      title: "Prepare MetaMask before you withdraw",
      body: `Do this before you touch Coinbase send.

1. Install MetaMask from the official site or store listing.
2. Create or unlock the account you will use for gaming.
3. Add Base if it is missing. Follow [add Base to MetaMask](/guides/add-base-network-metamask) and check the chain id against Base docs.
4. Copy the account address from MetaMask while Base is selected. The address string is the same on Ethereum and Base, but your token balances are not.
5. Optionally send a tiny amount of ETH on Base to that address first, so you can move USDC later. [Gas fees](/guides/gas-fees-explained) on Base are usually cents, but they are still paid in ETH.

Write down the first six and last four characters of the address. You will compare them on Coinbase.

Keep this account lean. It is the one you will later connect to a casino.

If MetaMask already has Account 1 stuffed with other tokens, create Account 2 for gaming. The address will differ. Copy Account 2, not Account 1, into Coinbase. A withdrawal that lands in the savings account is not lost, but you will then have to send it again (and pay gas) to the account you verified.

Name the account in MetaMask so you can see “gaming” at a glance. Coinbase will not show that label. It only shows the hex address.`,
    },
    {
      id: "withdraw-steps",
      title: "Withdraw USDC from Coinbase to MetaMask",
      body: `The screens change, but the decisions do not.

1. **Sign in to Coinbase.com** and open Send / Withdraw, not a third-party “support” form.
2. **Choose USDC**, not USD and not a different stablecoin unless you intend to convert first. If you still need to buy, see [how to buy USDC](/guides/how-to-buy-usdc).
3. **Paste the MetaMask address.** Compare the prefix and suffix. Coinbase may warn about a new address; that warning is useful.
4. **Select the network: Base.** This is the line people skip. Ethereum, Solana, Arbitrum and Polygon are wrong for PVPspinArena even if the address format looks familiar.
5. **Enter a test amount**, such as 1 or 2 USDC, the first time you use this pair.
6. **Read the fee and arrival estimate.** Exchange withdrawal fees are separate from later Base gas in MetaMask.
7. **Complete any 2FA or allow-list checks**, then confirm.
8. **Wait.** Use the Coinbase transaction receipt and a Base explorer. MetaMask on Base should show USDC after confirmations. You may need to import the official Base USDC token if the balance is hidden.

Only after the test arrives should you withdraw the rest to the same address on the same network.

These steps sit in the [crypto payments](/guides/topics/crypto-payments) cluster because the network picker is the product.

Coinbase may show a “send crypto” contact list. Do not pick an old Ethereum send to the same hex address and assume Base will follow. Saved destinations often remember the last network. Create a clearly named Base USDC destination and use that every time.

If Coinbase asks you to allow-list withdrawals, add the MetaMask address on Base and wait out any lock period before you move size. That lock is annoying and it is also how account-takeover withdrawals get delayed. Do not disable security features to go faster.`,
    },
    {
      id: "fees-and-timing",
      title: "Fees, timing and what “processing” means",
      body: `Coinbase may show a withdrawal as pending while it builds a batch or runs risk checks. That is not MetaMask being slow. Until there is a transaction hash on Base, MetaMask has nothing to display.

Once the hash exists, Base blocks are frequent. A routine arrival is minutes, not hours, unless Coinbase is delayed on its side.

| Stage | Who is in control | Typical issue |
| --- | --- | --- |
| Coinbase review / 2FA | You and Coinbase | Withdrawals paused, allow-list, daily limits |
| Broadcast on Base | Coinbase’s signer | You wait; you cannot speed their transaction |
| Confirmations | The network | Rare reorgs; wait for the explorer to show success |
| MetaMask display | You | Wrong network selected in the UI, or USDC not imported |

If Coinbase charged a withdrawal fee, that is their fee. MetaMask will later charge Base gas when you send onward. Do not expect the casino to refund either.

Arrival estimates in the Coinbase UI are guesses. A “few minutes” banner can hide a compliance review on a first withdrawal to a new address. That is still cashier time on Coinbase’s side. Refresh the transaction detail until a hash appears, then switch to the explorer. Do not open a second send because the first feels slow.

Weekends and high-volume hours can add delay. They do not change the network you must pick.`,
    },
    {
      id: "stalls",
      title: "If the transfer stalls or went to the wrong chain",
      body: `### Still pending on Coinbase with no hash

Wait, check status and support articles, and do not send a second withdrawal to “retry” until you know the first failed. Two successes are two transfers.

### Hash exists on Ethereum, not Base

You picked the wrong network. Those coins are on Ethereum at your address. They are not lost if you control MetaMask, but they are not a PVPspinArena deposit. You will need another withdrawal on Base or a careful bridge, plus Ethereum gas to move them.

### Hash exists on Base but MetaMask is empty

Switch MetaMask to Base. Import USDC using Circle’s published Base contract if needed. Check the to-address on BaseScan equals your account.

### Sent to the wrong address

If you pasted a deposit address from a casino instead of MetaMask, the coins went there. If you pasted a typo, they may be unrecoverable. Coinbase cannot reverse a confirmed send.

### Next hop to the site

When MetaMask on Base shows USDC, verify that account on PVPspinArena with a message signature, then send from it to the [wallet](/wallet) deposit address. Exchange senders will not match.

If you accidentally used Coinbase Wallet’s address instead of MetaMask, the coins are still yours if you control that wallet. Move them to the MetaMask account you verified, or verify the Coinbase Wallet address instead. Do not send a third copy from Coinbase until you know where the first two landed.

Phishing sites clone Coinbase send forms. Bookmark Coinbase.com. A page that asks for your MetaMask recovery phrase to “complete a Coinbase to MetaMask transfer” is theft. Coinbase will never need those words, and MetaMask will never need your Coinbase password.`,
    },
    {
      id: "worked-example",
      title: "Worked example: $50 toward a first Coinflip",
      body: `You bought $60 of USDC on Coinbase and want $50 available to deposit.

1. MetaMask account 2 is your gaming account. Base is added. You note address 0xAB12…90CD.
2. Coinbase send: 2 USDC, network Base, destination 0xAB12…90CD. Fee is shown as a flat or percent amount.
3. Twenty minutes later BaseScan shows success. MetaMask on Base shows 2 USDC after you add the token.
4. Coinbase send: 53 USDC, same network, same address, so you still have a little USDC left on Coinbase for a later test.
5. You buy or withdraw $2 of ETH on Base to the same address for gas.
6. You verify 0xAB12…90CD on PVPspinArena and deposit 50 USDC. $50.00 credits after confirmations.
7. You open a $2 [Coinflip](/coinflip) only with money you can lose. A later withdrawal back to MetaMask is a site payout on Base, limited to $250 per day, with review over $25.

If step 3 had shown Ethereum, you would stop and not repeat the 53 USDC send.

After the site credits $50, you can play Jackpot, Coinflip or Roulette with money you can lose. A later cash-out is a site payout on Base, not a Coinbase reversal. Daily withdrawals cap at $250. Amounts over $25 wait for review. Coinbase is out of that story once the coins left the exchange.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `A Coinbase to MetaMask transfer is a Base (or other) withdrawal you must specify correctly. Prepare MetaMask first, test a small USDC amount, confirm on an explorer, then send the rest. The casino hop is separate and must leave from the verified MetaMask address. Wrong network is almost always user-selectable and almost never “stuck in the internet.”

Save the Coinbase receipt and the Base hash together. If you later ask why MetaMask looks empty, those two records answer it in a minute: still pending at Coinbase, confirmed on the wrong chain or confirmed on Base with USDC hidden in the token list.`,
    },
  ],
  faqs: [
    {
      q: "Which network should I pick on Coinbase for PVPspinArena?",
      a: "Base. USDC withdrawn on Ethereum, Solana or another chain will not credit on this site and is not a MetaMask-on-Base balance until you move it.",
    },
    {
      q: "Why did MetaMask not show my USDC?",
      a: "You may be on the wrong network in the UI, or USDC is hidden until you import the Base token. Confirm the transaction on a Base explorer first.",
    },
    {
      q: "Can I withdraw from Coinbase straight to the casino address?",
      a: "You can send coins there, but PVPspinArena matches deposits to a verified wallet you control. Exchange senders usually cannot be matched automatically.",
    },
    {
      q: "How long does a Coinbase to MetaMask transfer take?",
      a: "Coinbase processing can take minutes. After broadcast, Base confirmation is usually fast. Pending with no hash means it has not hit the chain yet.",
    },
    {
      q: "Do I need ETH in MetaMask if I only hold USDC?",
      a: "Yes, a little ETH on Base, if you want to send that USDC onward. Receiving USDC from Coinbase does not spend your ETH.",
    },
    {
      q: "Can I reverse a Coinbase withdrawal after I confirm it?",
      a: "Not after it has a confirmed on-chain hash. Check the network and address before the last confirm. Support cannot pull Base USDC back from MetaMask.",
    },
  ],
  sources: [
    {
      label: "Coinbase Help — Sending crypto",
      url: "https://help.coinbase.com/en/coinbase/trading-and-funding/sending-or-receiving-cryptocurrency/how-to-send-and-receive-cryptocurrency",
    },
    { label: "MetaMask Help Center", url: "https://support.metamask.io/" },
    { label: "Base documentation", url: "https://docs.base.org/" },
    { label: "BaseScan explorer", url: "https://basescan.org/" },
  ],
  related: [
    "usdc-casino",
    "add-base-network-metamask",
    "crypto-casino-withdrawals",
    "instant-withdrawal-casino",
    "how-to-buy-usdc",
    "how-to-withdraw-from-metamask",
  ],
  updated: "2026-09-26",
  howTo: true,
};
