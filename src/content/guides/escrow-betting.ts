import type { Guide } from "./types";

export const guide: Guide = {
  slug: "escrow-betting",
  cluster: "Skill wagers",
  keyword: "escrow betting",
  secondary: ["bet escrow service", "smart contract escrow bet", "crypto escrow"],
  title: "Escrow Betting: How to Bet Safely With Strangers",
  description:
    "Escrow betting explained: how a neutral escrow or smart contract holds both stakes, settles disputes and makes peer-to-peer wagers safe to accept.",
  h1: "Escrow betting: how a neutral hold makes a stranger bet payable",
  answer:
    "Escrow betting means a neutral holder locks both stakes until a rule you wrote in advance says who is paid. The holder can be a site, a person who is not in the bet, or a smart contract. It does not make the bet wise. It makes the loser unable to walk off with both wallets.",
  facts: [
    "Both stakes have to be locked before the event, not after you win.",
    "The settlement rule has to exist before the event, including voids and disputes.",
    "A friend who offers to hold the money is not neutral.",
    "A smart contract only enforces what its code actually checks, not what the chat promised.",
    "Escrow does not remove the fee, the legal question, or the chance you lose.",
  ],
  sections: [
    {
      id: "what-escrow-does",
      title: "What escrow betting does and does not do",
      body: `Two people disagree about the future. Each is willing to stake money. Neither wants to send the stake to the other person first. Escrow is the third place the money sits. If the rule says you won, the third place pays you. If the rule says you lost, it pays them. If the rule says the event did not happen, it sends the stakes back, minus whatever fee was posted.

That is the entire service. It is valuable because strangers default on voice-chat debts. It is not a tip, not a prediction, and not a license. A perfectly escrowed bet on a terrible price is still a terrible price. A perfectly escrowed bet in a place that bans the wager is still a legal problem. Adults 18+ only. This page is not legal advice and not betting advice.

[Peer-to-peer gambling](/guides/peer-to-peer-gambling) is the wider idea: players fund the prize and the room takes a fee instead of betting against you. Escrow is the piece of that idea that holds the funds. Do not treat this page as a replacement for the P2P overview. If you do not know who you are playing, read that guide first and come back for the lockbox.

[Bet with friends online](/guides/bet-with-friends-online) is the private version. Friends skip escrow because they trust each other, and then one of them is short on rent. The rule and the hold matter more when the friendship matters. Awkward paperwork saves the awkward conversation later.`,
    },
    {
      id: "three-holders",
      title: "A person, a site, and a contract are different holders",
      body: `A human escrow is someone who is not a party to the bet and who both of you can pressure if they vanish. “My cousin will hold it” fails the test if you cannot pressure the cousin and the other bettor can. A human also interprets the rule. Interpretation is useful when the event is messy and dangerous when the human likes one of you.

A site escrow is a cashier. Both balances are debited into a pot the site controls. The site’s staff, or its automatic rule, releases the pot. You are trusting the site’s solvency and its dispute desk. Read what happens if the site pauses withdrawals. Your “locked” bet is locked from you too.

A smart-contract escrow locks coins in code. It pays when a condition is met. The condition might be a signed message from an agreed referee, an oracle price, or a timeout that refunds both sides. [Smart contract casino](/guides/smart-contract-casino) covers on-chain rooms as a product. This page only needs the betting slice: the contract does not know who won the football match unless something feeds it that fact. If the feed is a person, you are back to a referee with extra steps. If the feed can be changed by one wallet, that wallet is the bookie.

| Holder | Who can run off | Who decides a messy result | What you can check |
| --- | --- | --- | --- |
| Stranger in chat | Them, immediately | Whoever types louder | Nothing |
| Named site cashier | The site, if it is insolvent or fake | The site’s written desk | The rule and the ledger |
| Contract plus referee | Whoever holds the admin key | The referee the code accepts | The code and the key |
| Contract with a fixed feed | Whoever can spoof the feed | The feed’s publisher | The feed and the code |

[Commit-reveal scheme](/guides/commit-reveal-scheme) is how a chance result gets locked before it is shown. Use it when the “event” is a draw the site could otherwise pick late. It is not a substitute for a sports result. A hash does not watch a match.`,
    },
    {
      id: "write-the-rule",
      title: "Write the rule before either stake moves",
      body: `A usable rule fits in one note. The event. The deadline. The source you will both accept, named precisely: which scoreboard, which official page, at what time. What a postponement does. What a cancellation does. What a disputed stat does. The stake from each side. The fee. Who is paid on a win, a loss, a push, and a void. How long the loser has to object. What evidence counts.

Example. You each lock 50 on whether a team wins tonight’s game, not the spread, not the player props. Source is the league’s final score as posted on its site the next morning. If the game is postponed by more than 24 hours, both stakes return and the escrow fee, if it was 1 from each, is still gone because you agreed the fee was for the hold. Winner receives 98. You can dislike that fee. You cannot discover it after the whistle.

A second example, a skill match rather than a sports score. A [wager app](/guides/wager-app) is the usual lobby for that match. First to five on a named map, both stakes locked, a disconnect before either side reaches two voids the match, a disconnect after that forfeits. Evidence is a replay file uploaded within an hour. No replay, no payout, stakes sit until the deadline and then void. That is stricter than a bar bet and kinder than a week of arguing.

Vague rules feel friendly and pay the person who writes the recap. “Team A wins” fails when the match is abandoned at 1–0. “I’ll know it when I see it” fails always. Spend ten boring minutes on the note. It is the product you are buying from the escrow.`,
    },
    {
      id: "ten-checks",
      title: "Ten checks before you accept any peer wager",
      body: `Do not skip a line because the other person is in a hurry. Hurry is a tell.

- Both stakes are already in the escrow, and you can see both, not a screenshot.
- The holder is not one of the two bettors and does not get paid more if a chosen side wins.
- The event, the source, and the deadline are written.
- Postponement, cancellation, and push each have an outcome.
- The fee is a number taken by a rule, not a tip the holder invents at the end.
- You know who holds the admin key if the escrow is a contract.
- A dispute has a clock and a kind of evidence, not an open chat.
- The winner can withdraw without a second “verification” payment.
- You are allowed to make this bet where you live, and you are old enough.
- The stake is money you can lose if the rule is applied exactly as written and you are wrong.

The [skill wagers topic](/guides/topics/skill-wagers) links the cash matches and apps around this hold. Escrow is the hold. The format of the game is a different article. A coinflip on this site already includes the hold: both players fund the pot, and the winner is paid minus the fee shown before entry. You do not need a cousin for that. You do need the cousin, or a real cashier, for a bet this site does not list.`,
    },
    {
      id: "disputes",
      title: "How disputes actually get settled",
      body: `Most disputes are ambiguous rules, not mastermind fraud. The game went to overtime and your note did not mention overtime. The fighter was replaced and your note said the name, not the bout. The map was wrong and you still played. Escrow cannot invent the sentence you left out. It can only refuse to pay until a sentence exists, which freezes both of you. That freeze is better than paying the wrong person and worse than having written the sentence.

When fraud is the dispute, speed matters. A fake escrow site shows a balance, lets you “win,” and then asks for a fee to release. The fee is the theft. Real escrow was funded by both sides at the start, so a release fee that appears only for winners is a new product you did not buy. Walk away from the balance. Paying a ransom to a fake cashier funds the next fake cashier.

On-chain, a dispute is a transaction. If the referee key can send the pot anywhere, including to itself, call that key the escrow and judge it as a person. Read the contract or have someone who can read it do so before the amount is interesting. “Audited” without a report you can open is a word.

[Fairness](/fairness) on this site is for finished casino rounds, where the result is a seed and not a football match. Do not file a peer-wager argument there. Different holder, different rule, different page.

If you are the holder for friends, write down that you do not get a cut tied to the winner, keep the stakes separate from your spending money, and pay exactly the note. Holders who “borrow” the pot until payday are how friend groups end. Decline the job if you need the money.`,
    },
    {
      id: "fees-and-odds",
      title: "The fee is the price of the stranger",
      body: `Escrow is not free. Someone watches the pot, answers the dispute, and keeps the lights on. A 2% fee on both sides of a 100/100 bet removes 4 and pays the winner 196. You risked 100 to win 96. That is the cost of not trusting the other person. If you trust them completely, you may still want the fee and the rule, because trust is a mood and the score is a fact.

Compare that with sending your stake first and hoping. The expected value of hope is not a number you can put in a table. The expected value of a posted fee is. Prefer the worse-looking number you can compute.

Do not let the escrow fee stack on a price that was already bad. A bet at a terrible implied probability, plus a hold fee, is two leaks. Escrow did its job and you still overpaid for the side. Shop the wager and the holder as separate decisions. [Head-to-head betting](/guides/head-to-head-betting) is about reading a two-way price. Use it when the bet is a market. Use this page when the problem is custody.

Crypto escrow adds chain fees. A gas fee on the way in and the way out can dwarf a small stake. A 20 bet that costs 8 to lock and 8 to pay is an escrow in name and a bonfire in practice. Size the stake to the rail.

Nothing here says you should bet with strangers. It says that if you do, the money should be locked to a rule you could bear to lose under. If you cannot bear it, leave the pot empty.`,
    },
    {
      id: "when-to-refuse",
      title: "When to refuse the wager entirely",
      body: `Refuse if only one stake is visible. Refuse if the holder is the other bettor’s account with a new name. Refuse if the source of the result is “whatever I post.” Refuse if you are asked to install a remote-access tool to “confirm the bet.” Refuse if the event is inside information, a private match you can influence, or anything that would be cheating rather than predicting. Escrow does not launder a fix.

Refuse yourself, too, when the stake is rent, tuition, or money a partner does not know you are locking. The neutral holder will apply the rule without your household context. That is the point of neutrality. It will feel cruel on the night you lose, which is how you know it was real escrow and not a friend doing you a favor.

A last scene. Someone proposes a smart-contract bet, sends a link, and the page asks you to approve a token spend with no cap. The escrow you wanted is a pot of a fixed size. An unlimited approval is a drain. Approve the amount of the stake or approve nothing.

If you want a two-person pot that is already a product, with a fee shown first and a result you can recompute, look at [Coinflip](/coinflip) rather than hiring a stranger to hold a coin. The site is the escrow in that case, and the rule is the game page, not a paragraph negotiated at midnight.`,
    },
  ],
  faqs: [
    {
      q: "Is escrow the same as trusting the other bettor?",
      a: "No. Escrow exists so you do not have to trust them to pay. You still trust the holder, the rule, and the source of the result.",
    },
    {
      q: "Can a smart contract referee a sports bet by itself?",
      a: "Only if a feed or a referee key tells it who won. The contract moves the coins. It does not watch the match unless that input exists, and that input can be the weak point.",
    },
    {
      q: "What if the event is cancelled?",
      a: "The note you wrote beforehand should say void, postpone, or settle on a named backup. If it says nothing, expect a frozen pot and a fight.",
    },
    {
      q: "Why did the winner have to pay an extra release fee?",
      a: "A fee that appears only after you win is a common scam. A real hold fee is posted before both stakes lock. Do not send a second payment to unlock a balance.",
    },
    {
      q: "Does PVPspinArena escrow custom peer bets?",
      a: "No. Coinflip and Jackpot lock player stakes for those games only. Bring a written rule to a different holder for anything else.",
    },
  ],
  sources: [
    { label: "Wikipedia: Escrow", url: "https://en.wikipedia.org/wiki/Escrow" },
    { label: "Wikipedia: Smart contract", url: "https://en.wikipedia.org/wiki/Smart_contract" },
  ],
  related: ["smart-contract-casino", "peer-to-peer-gambling", "commit-reveal-scheme", "bet-with-friends-online"],
  updated: "2026-10-06",
};
