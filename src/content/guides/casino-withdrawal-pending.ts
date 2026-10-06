import type { Guide } from "./types";

export const guide: Guide = {
  slug: "casino-withdrawal-pending",
  cluster: "Crypto payments",
  keyword: "casino withdrawal pending",
  secondary: ["pending casino cashout", "withdrawal awaiting approval"],
  title: "Casino Withdrawal Pending: Two Different Waits",
  h1: "Casino Withdrawal Pending: Two Different Waits",
  description:
    "Casino withdrawal pending can mean the site has not approved the cashout, or the chain has not confirmed it. Learn how to tell the two waits apart.",
  answer:
    "Casino withdrawal pending is a status word doing two jobs, and mixing them up wastes hours. In one case the casino still holds the request: nobody has approved it, or somebody approved it and the site has not broadcast a transfer. In the other case the transfer exists on a network and that network has not confirmed it yet. The first wait is a cashier problem. The second wait is a chain problem. They need different evidence, and they are explained in full on two other pages. This page only splits them so you stop applying the wrong fix.\n\nGambling is for adults 21 and older, and only with money you can afford to lose. A pending label does not change a completed bet. It only describes the path of a payout you already won or already requested.",
  facts: [],
  sections: [
    {
      id: "the-casino-has-not-approved-it",
      title: "The casino has not approved it",
      body: "Before a hash exists, pending means the operator's system has your request and has not finished its side. The balance may already be held so you cannot bet it again. The cashier may say pending, processing, under review, or queued. Those words are the site's vocabulary. They are not a block explorer status. No transaction hash, no network confirmation count, and no public transfer.\n\nReasons on this side include a manual review, a limit, a bonus rule, a mismatched payout address, a security flag, or a simple queue. The policy behind instant and delayed crypto payouts, including what a review is for, lives in [crypto casino withdrawals](/guides/crypto-casino-withdrawals). Read that page when you want the operator's half of the story. This article will not restate it. What you need here is the boundary: if the casino has not broadcast, changing gas settings in your wallet will do nothing, because your wallet is not the sender.\n\nWhat you can collect is the request id, the time you asked, the amount, the asset, the network you selected, and the payout address you registered. Compare that address to the wallet you control, character by character. A review that is really a typo you submitted will not clear because you refresh the page. If the address is wrong and the transfer has not been sent, the cashier may still let you cancel or edit. If it has been sent, you are past this section.\n\nWrite one message to support if the published review window has passed. Include the request id and the facts above. Do not include a seed phrase, a password, or a screenshot of your recovery words. Support for a pending approval needs the request id. Anyone asking for the phrase is not working the ticket.\n\nDo not open a second withdrawal to \"replace\" the first while the first is still pending on the site. You may not have the balance, because it is held, or you may create two requests that staff must untangle. Cancel only if the cashier offers a cancel button and you understand the funds return to the playable balance. If there is no cancel button, wait for the request to be approved, refused, or explained.\n\nA refusal is different from a wait. If the site rejects the withdrawal and returns the balance, you are not pending anymore. Read the reason. If you disagree, use the complaints path in the terms, with the request id. A pending state that never resolves is a support problem and, if the terms say so, a complaint problem. It is still not a blockchain problem until a hash exists.",
    },
    {
      id: "the-chain-has-not-confirmed-it",
      title: "The chain has not confirmed it",
      body: "Once the cashier shows a transaction hash, the site has handed the transfer to a network. Pending now means the chain has not finished the confirmation standard that wallet or that casino is using. Your wallet may show the incoming transfer as pending, unconfirmed, or stuck. An explorer for that network is the independent check. Paste the hash there. If the explorer knows the hash, you are looking at a real broadcast. If it does not, confirm you are on the explorer for the network named in the cashier, not a similar chain.\n\n[Stuck crypto transaction](/guides/stuck-crypto-transaction) owns this half: pending versus dropped versus failed, and what nonce and fee problems look like. Go there when you have a hash and the inclusion is the issue. Do not use that page's reasoning on a withdrawal that has no hash. You cannot speed up a transaction the casino has not signed.\n\nYour tools on this side are observation and a clear message. Record the hash, the network, the amount, and the explorer status. If the explorer shows success and your wallet does not, your wallet may be on the wrong network or may need a refresh. If the explorer shows failed, the value may never have left the casino's sending process in a useful way, and the site has to say whether it will retry. If the explorer shows pending for a long time, the stuck-transaction guide is the explainer, and the casino is still the broadcaster. You usually cannot bump their fee from your wallet. You can ask them, with the hash in hand, what they see.\n\nDo not send them a replacement transaction from your side. You are the receiver. A second withdrawal request is not a replacement transaction. It is a second ask for money. Wait until the first hash resolves or the site cancels it in writing.",
    },
    {
      id: "a-short-decision-path",
      title: "A short decision path",
      body: 'Start in the cashier, not in a forum. Find the withdrawal row. Answer one question: is there a transaction hash?\n\nIf there is no hash, you are in the approval wait. Read the site\'s payout policy page, check the address you submitted, check whether a review threshold or a bonus rule applies, and use the withdrawals guide for what those policies usually mean. Contact support with the request id if the wait has outrun the policy. Keep your phrase offline.\n\nIf there is a hash, open an explorer for the stated network. If the transfer is confirmed and your wallet is silent, fix the wallet\'s network view before you accuse the casino of a second delay. If the transfer is unconfirmed or missing on the correct explorer, use the stuck-transaction guide and send the hash to support. If the transfer is confirmed on a network you did not expect, say that plainly. The coins moved where the hash says they moved.\n\nIf you cannot tell whether a string is a hash or a request id, look at the length and ask support which network it belongs to. Do not paste it into random explorers and assume a "not found" means the casino kept the money. "Not found" often means wrong explorer.\n\nPVPspinArena offers jackpot, coinflip, and roulette settled in USD. Deposit and payout wallets are separate. A deposit address and a payout address are not required to match, and a pending withdrawal still follows the same split as anywhere else: either the site has not sent a transfer to the address you named, or a transfer hash exists and the chain has not confirmed it. This page does not describe the site\'s treasury or a private review queue. Use the request id or the hash you were actually given.',
    },
    {
      id: "what-pending-is-not",
      title: "What pending is not",
      body: 'Pending is not a small loss you should immediately "make back" by depositing again. The original request is still a request. Adding a new deposit mixes a new bet with an unfinished payout and makes the ticket harder to read.\n\nPending is not proof the site is a scam, and a fast payout is not proof it is honest. Both are cashier facts. Scams and delays overlap and they are not the same set. Your evidence is the hash or the lack of one, the written policy, and the response you get when you quote the request id. A forum thread that sorts casinos by rumor will not see your hash.\n\nPending is not the same as a wrong-network send. If the explorer on the network you chose shows a successful transfer to the address you named, the chain finished. If your wallet was watching a different network, switch the view. If the site sent the asset on a network your wallet does not control, say so with the hash. Do not describe that case as "unconfirmed." Confirmed on an unexpected network is a completed send to that network.\n\nPending is not fixed by sharing your screen with a stranger. Remote helpers who ask for wallet access, seed phrases, or a "release fee" are a second incident. Official support stays on the site you already use. They can see the request id without taking over your computer.',
    },
    {
      id: "how-to-write-the-support-note",
      title: "How to write the support note",
      body: 'Use a short note. Include the account email or id, the withdrawal request id, the amount, the asset, the network, the payout address, and the hash if it exists. State which wait you think you are in, in one line: "no hash yet" or "hash present, explorer still pending." Attach the explorer link only if it is a public page for that hash. Ask what status they see on their side. Then stop messaging until they answer. Ten follow-ups with new theories look like noise.\n\nIf they reply with a policy you did not read, read it before you argue. If they reply with a hash you did not have, check the explorer and update your note. If they reply by asking for documents, that is a compliance or fraud check on the casino side of the line, and it still is not a gas bump. Decide whether you will provide the documents through the official path. This page is not legal advice about those requests.\n\nKeep the tone boring. The person on the other side needs identifiers, not a narrative of your session. The identifiers are how a pending row becomes either a broadcast or a clear refusal.',
    },
    {
      id: "while-you-wait",
      title: "While you wait",
      body: 'Leave the playable balance alone if the withdrawal amount is already held. Betting "until they approve it" with other funds is how a payout request turns into a bigger loss. The pending row is not a teaser. It is your money in a queue or in an unconfirmed transfer. Treat it as unavailable.\n\nSet a reminder to check once after the site\'s stated window, not every five minutes. Refreshing does not mine a block and does not clear a review. When you check, repeat the hash test. Status words on the casino page can lag the explorer, and the explorer can lag a wallet that has not switched networks. The order is: casino row, hash or no hash, explorer on the named network, wallet on that same network.\n\nIf the wait breaks your budget plans, stop depositing. A casino withdrawal pending is an operational state. It is not a reason to chase. When the transfer confirms, decide then whether you want the funds back in play. Until it confirms, or until the site returns the balance in writing, the amount is not a bankroll.\n\nThe rest of this subject is on the [Crypto payments guides](/guides/topics/crypto-payments). See [crypto casino withdrawals](/guides/crypto-casino-withdrawals), [stuck crypto transaction](/guides/stuck-crypto-transaction), [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [wallet](/wallet) before you play.',
    },
  ],
  faqs: [
    {
      q: "What are the two meanings of pending?",
      a: "Pending can mean the casino has not approved or broadcast the withdrawal yet, so there is no chain transaction. It can also mean a transaction exists and the network has not confirmed it, which is a different wait with a different fix.",
    },
    {
      q: "How do I tell which wait I am in?",
      a: "Look for a transaction hash and a network name in the cashier or the email. No hash means you are still on the casino's side, and a hash that an explorer shows as unconfirmed means you are on the chain's side.",
    },
    {
      q: "Should I request the withdrawal again?",
      a: "Do not file a second withdrawal for the same balance while the first request is still open or the first hash is still pending. A duplicate request can split the problem into two tickets without speeding the first one.",
    },
    {
      q: "Which guide explains casino payout policy?",
      a: "The crypto casino withdrawals page owns what instant payouts mean, including reviews and limits. This page only helps you name which wait you are in so you open the right explanation.",
    },
    {
      q: "Which guide explains a stuck chain transfer?",
      a: "The stuck crypto transaction page owns pending, dropped, and failed broadcasts, including nonce issues. Use it after you have a hash, not before the casino has sent anything.",
    },
  ],
  sources: [],
  related: ["crypto-casino-withdrawals", "stuck-crypto-transaction"],
  updated: "2026-09-26",
};
