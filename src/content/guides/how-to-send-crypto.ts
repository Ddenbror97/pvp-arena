import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-send-crypto",
  cluster: "Crypto payments",
  keyword: "how to send crypto",
  secondary: ["send cryptocurrency", "crypto transfer steps"],
  title: "How to Send Crypto Without the Usual Mistakes",
  h1: "How to Send Crypto Without the Usual Mistakes",
  description:
    "How to send crypto: match the asset and network, check the address on a trusted screen, and save the hash before you close the wallet.",
  answer:
    "How to send crypto is a short checklist you follow every time, including the times you feel sure. You choose the asset, you choose the network the receiver named, you paste their address, you read it back, you confirm the amount and the fee, and you keep the transaction hash. The wallet will not know that you meant a different chain. The chain will not refund a typo because you were tired. Most lost transfers are completed successfully, to the wrong place, which is worse than a transfer that fails in the app where you can still see the coins.\n\nThis page is the send itself. Why the fee exists is covered in [gas fees explained](/guides/gas-fees-explained). What to do when a transfer sits pending, including nonce problems, is covered in [stuck crypto transaction](/guides/stuck-crypto-transaction). Do not treat those two articles as optional reading after you have already mashed the button. Know which problem you are in before you pay a second fee.",
  facts: [],
  sections: [
    {
      id: "what-you-are-actually-doing",
      title: "What you are actually doing",
      body: "A send asks the network to record that value moved from an address you control to an address you named. Your wallet builds that request, signs it with your key, and broadcasts it. After the network includes it in a block, the receiver can see it. Until then it is a request, not a finished payment. You pay a fee so the network will include the request. On Ethereum-style chains that fee is gas, priced in the chain's native coin even when you are sending a token such as a stablecoin.\n\nNothing in that flow checks your intent against a friend's invoice. The signature says you approved this exact payload. If the payload says the wrong address, the signature still counts. Reading the screen is the control. A hardware wallet helps when it shows the address on its own display. A software wallet helps when you slow down and compare the pasted string to the original. Neither one helps if you approve a prompt you did not read.\n\nYou can send to your own other wallet, to a person, to an exchange deposit address, or to a casino cashier. The chain does not grade those uses. It only checks the signature and the rules of the asset. Gambling is for adults 21 and older, and only with money you can afford to lose. A careful send does not make a wager a good idea. It makes the funding step less likely to vanish.",
    },
    {
      id: "send-crypto-step-by-step",
      title: "Send crypto, step by step",
      body: "### Step 1: Match the asset and the network\n\nAsk the receiver which coin and which network they want, or read it on the cashier or the exchange withdrawal page. The ticker is not enough. A stablecoin can exist on several chains, and each copy is a different pile of tokens. Select that asset in your wallet, then select that network. If your wallet shows a balance on a different network, you are not ready to send. Move or buy on the correct network first, using a method you already understand. Do not guess.\n\n### Step 2: Paste the address and any memo\n\nCopy the address from the receiver's page at the moment you pay. Do not copy from an old screenshot, a search result, or a random line in your history that shares a few characters. If the receiver requires a memo, destination tag, or payment id, copy that too. Paste into the address field. Compare the start, the middle, and the end with the source. If your wallet warns that the checksum looks wrong, stop and re-copy. A warning you click through is how a one-character typo gets a signature.\n\n### Step 3: Set the amount and read the fee\n\nEnter the amount the receiver should get. Look at the fee the wallet estimates, and look at which coin pays that fee. If you do not have enough of the fee coin, the send will fail or it will sit. Leave a remainder for the fee instead of trying to empty the account to the last unit. Read the total leaving your wallet, not only the amount field. A token approval is not a send. If the screen asks you to grant spending permission to a contract, and you thought you were paying a person, cancel.\n\n### Step 4: Approve, then save the hash\n\nConfirm on the device or in the app only after the screen matches step 1 and step 2. When the wallet shows a transaction hash, copy it into a note with the date, the amount, the network, and the destination. You will want it if the receiver says nothing arrived. You will also want it so you do not send the payment twice while you are nervous. Wait for the wallet or a block explorer to show the transfer as included. Then tell the receiver, and give them the hash if they ask.",
    },
    {
      id: "a-test-send-is-part-of-the-habit",
      title: "A test send is part of the habit",
      body: 'When the destination is new, send a small amount first. Wait until the receiver confirms they see it, or until you see it on an explorer at their address. Then send the rest to the same address, on the same network, without editing the string. The test costs a fee and a few minutes. It is the cheapest way to catch a wrong network, a wrong asset, or a clipboard swap.\n\nSkip the test only for a destination you have paid before, on this network, with this asset, and only if you are pasting from a source you just opened. "I paid them last year" is not a test. Addresses at exchanges and casinos can change. Read the current one.\n\nDo not send the test from one network and the main amount from another because the second network looked cheaper. The receiver told you the network. Cheap on the wrong chain is not a successful payment. Fee differences are real, and they are discussed in the gas guide. They are not a reason to override the receiver\'s instructions.\n\nIf the test never arrives, stop. Look up the hash on an explorer for the network you selected. If the explorer has never seen the hash, you may be on the wrong explorer, or the wallet never broadcast. If the explorer shows the transfer to a different address than you intended, the rest of the balance should stay where it is. Sending more will not correct the first one.',
    },
    {
      id: "fees-explorers-and-the-record-you-keep",
      title: "Fees, explorers, and the record you keep",
      body: 'The fee is what you pay the network, not a tip the receiver collects. It changes with demand. A wallet that lets you pick a slow fee may save money and may also leave you waiting. For a payment someone is expecting, a normal fee the wallet suggests is usually the right default. The gas guide explains who receives that fee and why the same transfer costs more on some chains than others. This page only needs you to notice the fee before you approve, and to hold enough of the fee asset.\n\nAn explorer is a website that reads the chain. Pick an explorer for the network you used, paste the hash, and read the status, the from address, the to address, and the token. Screenshots of a wallet\'s "sent" checkmark are weaker evidence than the hash on an explorer. If you are paying a casino or an exchange, their support will ask for the hash, the amount, and the network. They will not ask for your recovery phrase. Anyone who asks for the phrase is not support.\n\nKeep the note even after the receiver is happy. It is how you remember which address you already trust. It is also how you explain the transfer later to yourself. You do not need a spreadsheet empire. You need the hash.\n\nPVPspinArena offers jackpot, coinflip, and roulette settled in USD. A deposit is still a normal send to the address the cashier shows for the asset and network it lists. Deposit and payout wallets are separate. When you withdraw, you are asking the site to send to an address you control. Check that payout address the same way you check any other destination. A payout sent to a typo is not a second deposit you can reverse from the game screen.',
    },
    {
      id: "when-something-looks-stuck",
      title: "When something looks stuck",
      body: "If the wallet says pending, the transfer has been broadcast and not included, or the app is waiting on an earlier transaction from the same account. That situation has its own fixes, and guessing at them is how people create a queue of replacements. Use the stuck-transaction guide for pending, dropped, and failed states. Come back to this page only to confirm that the asset, network, and address were right in the first place.\n\nIf the explorer shows a successful transfer and the receiver still has no credit, the chain's job is done. The delay is on the receiver's side: an exchange crediting a deposit, a casino matching a payment, or a friend looking at the wrong network. Give them the hash. Do not send a duplicate while they look.\n\nIf you notice the network was wrong after the send succeeded, you are outside the pending case. The coins moved on the chain you selected. Whether anyone can reach them depends on who controls that address on that chain. This page will not promise a way back. Stop, save the hash, and talk to the receiver if the address was theirs. Do not type your phrase into a recovery site.\n\nFailed transfers spend the fee and return the value you were sending, in the usual case, because the chain rejected the call. \"Usual\" is not a guarantee for every contract. Read the explorer status. If it says failed, your token balance is the place to look next, not a second send to the same contract that just reverted.",
    },
    {
      id: "what-not-to-add-to-a-simple-send",
      title: "What not to add to a simple send",
      body: 'Do not grant a token allowance because a page called it a deposit. A normal transfer moves a specific amount. An approval lets another contract pull tokens later. If you wanted to pay a fixed amount to an address, the confirmation screen should describe a transfer of that amount. When the words say approve, permit, or unlimited, cancel and reread the instructions.\n\nDo not send from a shared or public computer. The phrase and the unlocked wallet are both at risk, and the clipboard is not yours. Do not let a stranger share your screen and "help" you click confirm. You can read a help article without handing over the mouse.\n\nDo not split one payment into many tiny sends to test the fee, the address, and your nerves all at once. One test and one main transfer are enough. Extra sends create extra hashes to explain and extra chances to paste the wrong string.\n\nThe rest of this subject is on the [Crypto payments guides](/guides/topics/crypto-payments). See [gas fees explained](/guides/gas-fees-explained), [stuck crypto transaction](/guides/stuck-crypto-transaction), [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [wallet](/wallet) before you play.',
    },
  ],
  faqs: [
    {
      q: "What do I need before I send?",
      a: "You need the asset name, the network the receiver accepts, and their address, plus any memo they listed. You also need a little of the chain's fee asset, because the transfer fee is not always paid in the coin you are sending.",
    },
    {
      q: "Should I send the full amount first?",
      a: "Send a small test when the destination is new or the amount would hurt to lose, then send the rest only after that test arrives. Skip the test only when you have already paid this exact address on this exact network successfully.",
    },
    {
      q: "What is the transaction hash for?",
      a: "The hash is the public id of the transfer, and you can look it up on an explorer for the network you selected. Save it before you close the wallet so you can show the receiver proof without sending a second payment.",
    },
    {
      q: "What if the transfer stays pending?",
      a: "A pending transfer is a fee or nonce problem on the chain you already chose, and the stuck crypto transaction page owns that fix. Do not send a second copy of the payment while the first one is still pending.",
    },
    {
      q: "Does a casino deposit use a different send?",
      a: "The chain transfer is the same kind of send, with the cashier's asset, network, and address as the destination. Deposit and payout wallets are separate, so do not reuse a payout address as the deposit target.",
    },
  ],
  sources: [],
  related: ["gas-fees-explained", "stuck-crypto-transaction"],
  updated: "2026-09-26",
};
