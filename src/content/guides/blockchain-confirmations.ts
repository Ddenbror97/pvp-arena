import type { Guide } from "./types";

export const guide: Guide = {
  slug: "blockchain-confirmations",
  cluster: "Crypto payments",
  keyword: "blockchain confirmations",
  secondary: ["transaction confirmation count", "block confirmations"],
  title: "Blockchain Confirmations: What the Count Means",
  h1: "Blockchain Confirmations: What the Count Means",
  description:
    "Blockchain confirmations are later blocks that sit on top of your transfer. Learn why sites wait and why a count is not the same as a casino credit.",
  answer:
    "Blockchain confirmations are the way wallets and cashiers describe how deeply a transfer has been buried in a chain. In the language most apps use, the first confirmation means a block included your transaction. Every valid block added on top of that block increases the count by one. The count is not a moral score and not a dollar amount. It is a depth. Deeper transfers are harder to rip out if the chain briefly reorganizes. Shallow transfers are real on the screen and still young.\n\nThis page explains the count. It does not explain how to unstick a transaction that never enters a block. That problem belongs to [stuck crypto transaction](/guides/stuck-crypto-transaction). It also does not price the transfer. Fees are a separate meter, covered in [crypto casino deposit fees](/guides/crypto-casino-deposit-fees). You can have an expensive transfer with one confirmation and a cheap transfer with many. Do not mix the meters.",
  facts: [],
  sections: [
    {
      id: "inclusion-then-depth",
      title: "Inclusion, then depth",
      body: "A transaction starts as a signed message your wallet broadcasts. Nodes may hold it in a waiting area. It has zero confirmations in the usual phrase, even if the wallet says pending or broadcast. A producer on that network then includes it in a block. Wallets that speak \"confirmations\" typically flip the count to one at that moment. The transfer is on the chain you selected, in that block, not merely in your app.\n\nThe next block references the previous one. If it builds on the block that holds your transfer, your count becomes two. The block after that makes three, and so on. You are not sending the payment again. The network is extending the history that contains the payment. Refreshing a casino page does not add these blocks. The chain adds them on its own schedule, which is different on different networks and different again when the network is busy.\n\nSome apps hide the count and show a word instead: pending, confirming, or complete. The word is the app's summary of the count plus the app's own threshold. Two apps can disagree because one declares victory at one confirmation and another waits for more. The explorer is the place to see the raw inclusion. Look up the hash. Note the block number. Note the current tip of the chain. The distance between those heights is the depth, whether or not a casino has chosen to display it.\n\nA failed or reverted transaction can be included in a block and still not move the tokens you cared about. Inclusion and success are not synonyms. Read the status on the explorer, not only the confirmation integer. A reverted call can show depth and also show failure. The fee may be gone. The token amount may remain where it started. The count did its job. The call did not.",
    },
    {
      id: "why-depth-matters",
      title: "Why depth matters",
      body: 'Public chains can have short disagreements about the tip. Two blocks may be produced close together, and the network then follows one and abandons the other. A transfer that lived only in the abandoned block loses those confirmations. It might reappear in a later block, or it might need to be included again. This is a reorganization. It is more than a theory on networks that still treat the tip as provisional, and it is the reason careful receivers do not treat "one confirmation" as the same thing as "final" for large amounts.\n\nHow many confirmations are enough is a risk choice, not a single global constant. A small payment and a very large payment do not have to share a threshold. Proof-of-work networks made the tradeoff famous, and some services copied a convention of waiting for several blocks on those chains. That convention is not a protocol rule that every chain enforces, and it is not a measured guarantee this article will pretend to calculate. Proof-of-stake networks often add their own notion of justification or finality, where a checkpoint becomes economically expensive to revert. A confirmation count on those networks can climb before the checkpoint exists, or a wallet can show "final" using the checkpoint rather than a raw tally. Read the label the wallet actually uses.\n\nLayer-2 networks add another wrinkle. A transfer can be included quickly on the layer 2 and only later reflected in a layer-1 record, depending on how that network posts data. "Confirmed" inside the layer-2 wallet can be the confirmation that matters for a cashier that watches the layer 2. It is not automatically the same as a finished dispute window on the parent chain. The cashier should say which event it waits for. If it does not say, you only know what your own explorer shows.\n\nNo table in this article will assign a required count to each chain. Those tables go stale, and they hide the fact that the receiver, not the universe, picks the number. Your exchange\'s deposit page and your casino\'s cashier are the authorities for their own credit rules. Your wallet\'s "complete" checkmark is the authority for its own display. They can differ without anyone being broken.',
    },
    {
      id: "confirmations-are-not-a-credit",
      title: "Confirmations are not a credit",
      body: 'A casino or an exchange credits an account when its own watcher says the transfer met its rule. That rule may be "one confirmation," "several," "final on this rollup," or "a human matched the hash." Until the watcher fires, you can have a confirmed chain transfer and an uncredited balance. The chain is done enough for the count you see. The business has not posted the ledger entry. Send the hash and the network name. Do not send a second deposit because the first one is confirmed and the balance is still zero. Two confirmed deposits are two payments.\n\nThe reverse also happens. A site can credit early, on zero or one confirmation, and then face a reorganization. That is the site\'s risk choice. If a site credited you and the chain later dropped the block, the site may reverse the credit. Read the terms before you play a balance that appears faster than the explorer\'s depth. Playing it does not make the underlying transfer deeper.\n\n[Crypto casino deposit fees](/guides/crypto-casino-deposit-fees) separates what you pay to get included from what the site might charge. Waiting for confirmations is usually just time, not an extra toll that grows with each block. If a page tries to sell you a "confirmation accelerator" unrelated to a normal fee bump on a still-pending transaction, be suspicious. Depth arrives because blocks arrive. A pending transaction that is not in a block yet is the other article. Once it is in a block, paying a stranger will not add the next block.\n\nGambling is for adults 21 and older, and only with money you can afford to lose. A fully confirmed deposit is still a deposit into a game that can take it. Confirmations protect the recording of the payment. They do not protect the bet.\n\nPVPspinArena offers jackpot, coinflip, and roulette settled in USD. Deposit and payout wallets are separate. A deposit you send and a payout the site sends are two transfers, each with its own hash and its own confirmation count. This page does not describe the site\'s treasury and does not publish a private confirmation threshold. Believe the cashier and the explorer for the transfer you actually have, not a number remembered from a different chain.',
    },
    {
      id: "how-to-read-the-count-you-see",
      title: "How to read the count you see",
      body: "Open the explorer. Confirm the network in the URL or the page title matches the network you sent on. Find the hash. Read success or failure. Read the block number. Read the latest block. Subtract if the page does not do it for you. That difference is the confirmation depth in the plain sense. Some explorers show the number directly. Trust the block heights if the pretty number and the heights disagree, and refresh before you panic.\n\nThen open the receiver's page. If they required ten and you have three, you are early, not lost. Wait. If they required one and you have five and the balance is still missing, the count is no longer the bottleneck. Ask them to match the hash. If your wallet shows zero confirmations and the explorer shows five, the wallet is stale or pointed at the wrong network. Fix the view before you resend.\n\nOutgoing withdrawals use the same count from the other direction. The site's hash gains depth as blocks arrive. Your wallet may hide the incoming transfer until its own threshold. Switching networks, or adding the token contract so the wallet knows how to display the asset, can make a confirmed transfer visible. Those display fixes are not new payments. Check the address on the explorer first so you know the tokens are at the address you control.\n\nSave the hash with the count you observed and the time. If a reorganization really does remove the block, you will want the original hash when you talk to the receiver. Most of the time the count simply climbs and the conversation never happens. The note is cheap.",
    },
    {
      id: "what-people-confuse-with-a-confirmation",
      title: "What people confuse with a confirmation",
      body: 'A wallet notification is not a confirmation. Notifications fire when the app notices something. They can fire early, late, or for a different account. The chain is the record.\n\nAn email from a casino that says "deposit detected" may mean they saw a broadcast, not that their confirmation rule is satisfied. Read the next line. Detected, confirming, and credited are three statuses. Only the third spends as balance. The first two are progress.\n\nA large number of peer connections, a green dot, or a "synced" label on your wallet is not your transaction\'s confirmation count. Sync means the wallet thinks it has caught up with the chain. Your transfer still needs its own inclusion and depth.\n\nInternal casino ledger entries are not confirmations either. A balance moving from "bonus" to "cash" inside the site never touched a block. Do not ask an explorer to explain an internal ledger. Ask the cashier.\n\nMerchants who accept crypto in person sometimes take zero-confirmation payments for tiny amounts and accept the risk. That is their choice about reorganization risk. It is a poor model for a casino deposit large enough to hurt, and it is not a rule you can impose on an exchange that published a higher threshold. Follow the published threshold of the receiver. Argue about it before you send, if you must, not after.',
    },
    {
      id: "a-count-is-a-depth-so-treat-it-like-one",
      title: "A count is a depth, so treat it like one",
      body: "Watch blockchain confirmations until the receiver's rule is met, then stop watching the count and start watching the credit. If the count never starts, change articles and diagnose a stuck or missing broadcast. If the count finishes and the credit never starts, talk to the receiver with the hash. If the fee surprised you, read the fee guide next time before you send, not as a way to edit a block that is already buried.\n\nDepth does not make a wrong address right. A transfer to the wrong place confirms just as calmly as a transfer to the right place. The count is evidence of inclusion. The address field is evidence of destination. Read both.\n\nThe rest of this subject is on the [Crypto payments guides](/guides/topics/crypto-payments). See [stuck crypto transaction](/guides/stuck-crypto-transaction), [crypto casino deposit fees](/guides/crypto-casino-deposit-fees), [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [wallet](/wallet) before you play.",
    },
  ],
  faqs: [
    {
      q: "What is one blockchain confirmation?",
      a: "In ordinary wallet language, one confirmation means the transfer was included in a block. Each later block built on that chain adds another confirmation, which is why the count climbs while you watch.",
    },
    {
      q: "Why do sites wait for more than one?",
      a: "A recent block can be replaced if the chain reorganizes, and a deeper confirmation is harder to replace. Each exchange or casino picks its own number, and that number is a policy, not a law of the network.",
    },
    {
      q: "Is a confirmation the same as a casino credit?",
      a: "No, the chain can confirm a transfer before the site credits your balance, and the site can also refuse a credit the chain already settled. The count tells you about inclusion, and the cashier tells you about the account.",
    },
    {
      q: "What if the count never climbs?",
      a: "Then the transfer is not collecting confirmations, which is the pending or dropped case the stuck crypto transaction page explains. This page assumes a transaction that is already in a block and gaining depth.",
    },
    {
      q: "Do confirmations set the fee?",
      a: "No, the fee is what you paid to be included, and the confirmation count is what happens after inclusion. Deposit fee questions belong on the crypto casino deposit fees page, not in the block counter.",
    },
  ],
  sources: [],
  related: ["stuck-crypto-transaction", "crypto-casino-deposit-fees"],
  updated: "2026-09-26",
};
