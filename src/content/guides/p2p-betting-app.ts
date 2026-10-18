import type { Guide } from "./types";

export const guide: Guide = {
  slug: "p2p-betting-app",
  cluster: "Skill wagers",
  keyword: "p2p betting app",
  secondary: ["peer to peer betting app", "betting with friends app", "sidebet app"],
  title: "P2P Betting App: How Peer Betting Apps Really Work",
  description:
    "What a P2P betting app is, how peer-to-peer apps match bettors, take fees and settle bets, and how they compare to sportsbooks and PvP crypto games.",
  h1: "P2P betting app: matching, fees, and how settlement works",
  answer:
    "A p2p betting app matches two people who want opposite sides, or lets friends post a side bet, then holds the stakes and pays the winner minus a fee. You are not taking a price from a sportsbook’s traders. You are taking a price from another person, and the app is the box office.",
  facts: [
    "The app’s job is to match, hold, and settle. The price comes from the users.",
    "A fee on the pot is how most of these apps get paid.",
    "A sportsbook sets the number and is your counterparty. A P2P app usually is not.",
    "A betting exchange is P2P with a public order book. A friends app is P2P with an invite.",
    "A crypto casino coin is a different product even when the pot is also player-funded.",
  ],
  sections: [
    {
      id: "what-the-app-is",
      title: "What a p2p betting app is for",
      body: `P2P means peer to peer. The peer is another customer. The app posts a proposition — a match, a prop, a dare between friends — and waits until both sides have money in. When the result is known, it pays the winning side from the losing side’s stake, after a fee. If nobody takes the other side, the bet does not exist. That last sentence is the whole difference from a book that will take your ticket at a number on the screen.

People download these apps to bet with friends without chasing anyone in a group chat, or to lay a price a sportsbook will not offer. Both uses need the same three pieces: a matched stake, a written result, and a cashier that is not one of the bettors. If any piece is missing, you have a chat argument with a logo.

[Crypto betting app](/guides/crypto-betting-app) is a different page. That one is about mobile crypto sportsbooks and casino lobbies: web app versus a native install, wallets, and fake downloads. A p2p betting app might take crypto and still not be that product. Judge the matching, not the coin.

Adults 18+ only. An app in a store can still be illegal where you stand, or illegal to offer into your state. This is not legal advice. If the app never asks where you live, that is a gap in its process, not a gift.

[Peer-to-peer gambling](/guides/peer-to-peer-gambling) explains player-funded casino pots. Read it when the “event” is a game the site runs, like a coin, rather than a match in the outside world. The hold is similar. The thing you are betting on is not.`,
    },
    {
      id: "how-matching-works",
      title: "How the app matches two bettors",
      body: `There are three common matchers. A friends room: you create a bet, set a stake and a line, and send a link. Nothing happens until a named person accepts. An open board: you post a side and any user can take it, sometimes in pieces. A request board: you ask for a price and someone fills it. All three are P2P. They differ in who you are exposed to and how fast you get action.

Partial fills matter. You wanted 100 on your side and only 40 was matched. The app should cancel or return the other 60, and it should say which. A bet that silently becomes 40 is how people swear they were “on for a hundred” and then get paid as if they were not. Read the unmatched-stake rule before you post size.

The line itself may be yours. If you offer a bad price, a stranger will take it, and the app will be delighted because the fee arrives either way. The app is not your handicapper. [Peer-to-peer sports betting](/guides/peer-to-peer-sports-betting) goes further on sports markets between people. Use that page for the sports pricing. Use this page for what the app is doing around the price.

Practical example. You post 25 to win 20 on a friend’s side prop, they accept 20 to win 25, the app takes 5% of the combined 45. Winner’s math has to be written: usually the winner gets their stake back plus the loser’s stake, minus the fee. Do the subtraction on paper. If you cannot, you do not know the bet you accepted. A 5% fee on 45 is 2.25, and someone has to say whether it comes out of the profit or the whole pot. Those are different bets.`,
    },
    {
      id: "four-products",
      title: "P2P app versus exchange versus sportsbook versus a PvP site",
      body: `The words overlap in ads. The counterparty does not.

| | P2P betting app | Betting exchange | Sportsbook | PvP crypto game |
| --- | --- | --- | --- | --- |
| Who sets the price | You or another user | The order book | The book’s traders | The game rule, often even money or stake share |
| Who can beat you | The person who took the other side | Other customers | The book’s number | Nobody, if the draw is fair; the fee still costs you |
| Who holds funds | The app | The exchange | The book | The site or the contract |
| How the house is paid | Pot fee or commission | Commission on wins | The vig inside the odds | A posted fee on the pot |
| What you came for | A custom or friend bet | A two-way market you can lay | A ready-made ticket | A chance round against players |

[Betting exchange explained](/guides/betting-exchange-explained) is the order-book version: you can back or lay, and unmatched bets expire. A friends app is usually all-or-nothing between two people. A 1v1 you play yourself, rather than a sports result, is a [wager app](/guides/wager-app). Do not assume exchange tools, like cash out against the market, exist in a side-bet app. If cash out exists, it is someone else taking the other side of your remaining risk, and it will be priced.

A PvP crypto site is not taking your opinion on a match. [Coinflip](/coinflip) is two stakes and a bit. Jackpot is a share of a pot. Those are clean when you wanted a chance game and a bad substitute when you wanted a sports price. Do not force a friend bet into a coin because the coin was easier to deposit.`,
    },
    {
      id: "fees-and-settlement",
      title: "Fees, voids, and the moment you get paid",
      body: `Commission styles vary. A cut of the pot, a cut of net winnings only, or a spread between the price the backer takes and the price the layer takes. The third one looks like “no fee” and still moves the number. Ask which style, then recompute a 10 stake so you are not learning it from a payout that feels short.

Voids are the customer-service product. A rained-out game, a fighter who misses weight, a prop stat the source never publishes. The app should return stakes on a void and should say whether the commission is refunded. Many keep a processing fee. That belongs in the rules, not in a surprise email.

Settlement speed follows the source. A final score might be an hour later. A player prop might wait for a stat correction window. “Instant” is a marketing word until you see the rule. Crypto payouts can be quick after the credit exists and still be slow if the app waits on a compliance check. Read the check before you are in a hurry.

Worked example, labeled as such. Two friends lock 30 each on a binary prop. Fee is 4% of the 60 pot, so 2.40. Winner is credited 57.60. The losing friend does not “send” anything at the end. The send already happened. If the loser can still cancel after tipoff, it was not escrow. It was a request. The rules for that hold are [escrow betting](/guides/escrow-betting).

The [skill wagers topic](/guides/topics/skill-wagers) collects cash matches, wager apps, and escrow. A P2P logo does not put an app on the safe side of that list.`,
    },
    {
      id: "checklist",
      title: "Checklist before you leave a balance on the app",
      body: `Use it once per app, not once per bet. The bet checklist is shorter: stake matched, line correct, source named.

- You can see the other side’s stake locked, not promised.
- Unmatched amounts return on a clock you understand.
- The fee style is pot, winnings, or spread, and you recomputed one example.
- The result source is named, including stat corrections.
- Voids return stakes, and you know if a fee survives the void.
- The app is allowed to serve your region, and you did not fake a location.
- Withdrawal minimums and identity checks are posted before the deposit.
- Nobody in support has asked for a seed phrase or a password.
- The other user cannot be the same person on a second account taking both sides against you in pieces. If the app cannot stop that, your “lay” may be a mirror.
- You can afford the matched stake if the rule is applied exactly and you are wrong.

A real miss. You post a bet, a stranger takes it, and after you win the app says the stranger’s payment reversed. The correct rule is that unmatched or uncollected stakes never go live. If the app lets a bet go live on a reversible method and then claws back your win, you were the liquidity. Prefer apps that only mark a bet live when funds have cleared.`,
    },
    {
      id: "scams-and-clones",
      title: "Cloned apps and the social-proof trap",
      body: `Friend betting is a costume scammers like. The screenshots show a group of buddies and a balance. The install link in the chat is not the store listing. You deposit, the bets “win,” and the withdrawal needs a tax or gas prepayment. That prepayment is the business model. A fee that exists only on the way out, after a fictional win, is not a commission. It is a lock.

Check the developer name, the domain, and the support address against a source you typed yourself. Do not tap the bio link from the person who introduced the bet. [Fake casino sites](/guides/fake-casino-sites) walks through clone patterns that apply here even though the product is not a slot lobby.

Social pressure is the other cost. An app that notifies the whole group when you lose will make you bet again to fix the picture. Turn the notifications off or do not join the room. The fee is already enough of a leak without an audience.

If you are the person who always posts the line for friends, you are providing the market. The app will not tell you that your prices are generous. Track what you lay. A season of laying 10 to win 8 for people who know the sport better than you is a donation with a dashboard.

Nothing in the app’s green balance is spendable until a withdrawal completes. Play, if you play, with money that can sit through a review.`,
    },
    {
      id: "when-a-book-or-a-coin-is-clearer",
      title: "When a book or a coin is the clearer product",
      body: `Use a sportsbook when you want a number right now and you accept that the vig is the price of that convenience. Use an exchange when you want to lay as well as back and you can handle unmatched bets. Use a p2p betting app when the bet is custom, small, or between people who will not meet a book’s market. Use a PvP chance game when you are not trying to have an opinion at all.

Mixing them is how fees stack. A bad P2P price, plus an app commission, plus a second bet on a coin to get even, is three products and one mood. Separate the budgets.

On this site the player-funded games are Jackpot and Coinflip, and the house game is Roulette. They are not a friends board for Sunday’s match. If someone in a chat tells you to “just use the casino as escrow” for an outside bet, they are wrong. The casino will settle its own games. It will not pay you because your friend lost a prop.

[How it works](/how-it-works) is the short version of those games if you want the cashier story without pretending it is a betting app. Stay on this page if the thing you are trying to understand is a peer match. Stay honest about which one you opened.

If the stake would hurt, do not match it. The app will still be there. The other side will find a different peer. That is not an insult. It is the product working without you.`,
    },
  ],
  faqs: [
    {
      q: "Is a p2p betting app a sportsbook?",
      a: "Usually no. A sportsbook sets the price and takes the other side. A P2P app matches customers and charges a fee. If the app is secretly the counterparty, it is a book wearing a peer label.",
    },
    {
      q: "What happens if nobody takes my side?",
      a: "The stake should come back. Read whether a partial match keeps the rest open or cancels it. A bet that changes size without a clear rule is a dispute.",
    },
    {
      q: "How does the app make money if it does not book the bet?",
      a: "A commission on the pot, on winnings, or a spread between the two prices. “No fee” still needs a sentence about which of those is hiding.",
    },
    {
      q: "Is this the same as a crypto betting app?",
      a: "Not by itself. Crypto betting apps, in our other guide, are mobile books and casino lobbies. A P2P app can use crypto and still be a matcher between people.",
    },
    {
      q: "Can I settle a friend bet with PVPspinArena?",
      a: "Only by playing an actual listed game, such as Coinflip, under that game’s rules. The site does not escrow outside sports bets or custom props.",
    },
  ],
  sources: [
    { label: "Wikipedia: Betting exchange", url: "https://en.wikipedia.org/wiki/Betting_exchange" },
    { label: "Wikipedia: Bookmaker", url: "https://en.wikipedia.org/wiki/Bookmaker" },
  ],
  related: ["peer-to-peer-sports-betting", "betting-exchange-explained", "crypto-betting-app", "peer-to-peer-gambling"],
  updated: "2026-10-06",
};
