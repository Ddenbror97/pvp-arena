import type { Guide } from "./types";

export const guide: Guide = {
  slug: "poker-staking",
  cluster: "Poker",
  keyword: "poker staking",
  secondary: [
    "poker backing deal",
    "makeup in poker",
    "selling poker action",
    "poker markup",
    "horse and backer",
  ],
  title: "Poker Staking: How Backing Deals and Makeup Work",
  description:
    "Poker staking explained: backing deals, makeup ledgers, markup, and a dollar split you can recompute before anyone plays a hand.",
  h1: "Poker staking: backing deals, makeup, and the split",
  answer:
    "Poker staking is a deal where a backer funds some or all of a player's buy-ins and takes a share of the profit. Makeup is the running hole: losses that must be earned back before anyone splits a new profit. Markup is an extra price a buyer pays above face value for a slice of action. Write those three words into the agreement before the first card. This page will not tell you a 'standard' percent is fair, and it is not legal advice.",
  facts: [
    "A backer pays for a share of buy-ins. A player plays the cards. Profit is split by the written percentages.",
    "Makeup is cumulative package loss. New winnings fill that hole before a fresh profit split.",
    "Markup means the buyer pays more than $1 per $1 of buy-in. The premium needs a sentence in the deal.",
    "Staking is not rakeback. A rebate on fees and a backer's share of results are different contracts.",
    "PVPspinArena does not stake players and does not track makeup.",
  ],
  sections: [
    {
      id: "what-deal",
      title: "What a backing deal actually swaps",
      body: `Poker staking swaps bankroll for a share of results. The player, sometimes called the horse, sits the games. The backer sends the buy-in money for the piece they bought. If the package ends ahead, they split the profit. If it ends behind, the backer has lost the stake they put up, and makeup may carry the hole into the next package if the deal says it continues.

You can stake one tournament or a month of cash games. The length is a term, not a vibe. "I'll back you" without dates, stakes, and a split is a favor that will be remembered differently by each side after a loss.

This [poker](/guides/topics/poker) article is for adults 18 or older. Format neighbors are [sit and go poker](/guides/sit-and-go-poker), [spin and go](/guides/spin-and-go), and [cash game poker](/guides/cash-game-poker). It is not legal advice. A backing deal can look like a private contract, a loan, or a handshake, depending on how you wrote it and where you live. This page explains the ledger players use. It does not say a court will enforce your chat log.

Both sides need a stake limit. [Poker bankroll management](/guides/poker-bankroll-management) still applies to the player, and it applies to the backer who is funding several horses at once. A deal does not create an edge. It only decides who eats the downswing.

If you do not yet know how a cash session or a tournament charges a fee, learn the game before you sell it. [Texas Hold'em strategy](/guides/texas-holdem-strategy) is about decisions at the table. Staking is about the spreadsheet after the session. Good decisions do not repair a sloppy sheet, and a beautiful sheet does not repair bad decisions.`,
    },
    {
      id: "makeup",
      title: "Makeup is the hole that gets filled first",
      body: `Package result is a simple sum: all cashes minus all buy-ins in the deal. If that sum is negative, the negative number is makeup. If a later event pulls the sum back to zero, makeup is cleared. Only the amount above zero is profit to split.

That order is the whole point. A player who is down $1,000 does not get to call the next $200 win a profit and split it. The $200 reduces makeup to $800. Backers who skip this step are donating. Players who ignore it are arguing from the last tournament instead of from the package.

Deals differ on a detail you must pin down. Some track makeup on the full package. Some track it only on the backer's share. Some reset makeup every month. Some never reset until the hole is gone. None of those is "the" rule. The rule is the paragraph you both accepted. If the paragraph is missing, do not start.

A shot is one event: settle when the cashier pays, and do not carry makeup unless the note says so. Long-term backing is the version where makeup carries. Pick one in writing.

Do not invent side bets that "don't count" toward makeup. Every buy-in the backer's money entered is in the package unless the deal excluded that game type. A cash session sneaked in at higher stakes is how friendships end. The exclusion list belongs at the top of the note: which rooms, which stakes, which variants, which dates.`,
    },
    {
      id: "markup",
      title: "Markup is a price on top of face value",
      body: `Selling at face means the buyer pays $1 for each $1 of buy-in they cover. Selling at markup means they pay more. A 1.20 markup means $1.20 for each $1 of action. The extra $0.20 is the player's premium, often justified as payment for an edge. It is also how a losing player charges backers for the privilege of funding a downswing.

Suppose a $1,000 buy-in and you sell 20% at 1.15. The piece of the buy-in is $200. The buyer pays 200 × 1.15 = $230. If the tournament cashes nothing, the buyer is out $230, not $200. The $30 did not enter the prize pool. It went to the player as markup. Say that out loud before anyone sends the $230.

Markup and makeup interact. If the deal continues, decide whether makeup is calculated on face buy-ins or on the marked-up price. Those are different holes. A buyer who paid markup on a loss feels the hole twice if you also drag the next win to "cover the markup" without having written it. One sentence prevents that fight: "Makeup uses face buy-ins. Markup is settled per event and is not refunded."

Or the other sentence, if that is the bargain. What you cannot have is silence.

Selling more than 100% of yourself, once markup and overlapping deals stack, is how a player owes two people the same cash. Keep a single sheet of who owns what percent. If the percents add up to more than the package, you have sold the same dollar twice. Stop and fix it before the event, not after the wire arrives.`,
    },
    {
      id: "two-dollars",
      title: "Two dollar settlements you can recompute",
      body: `Dollar example 1, a one-event shot with no markup. Buy-in $1,000. Backer takes 50% and sends $500. Player pays the other $500. Cash is $1,600. Profit = $1,600 − $1,000 = $600. At 50/50 the profit split is $300 each. Backer receives $500 + $300 = $800. Player keeps $800. The two shares add to the $1,600 cash. If the cash is $0, each person is out the $500 they put in. There is nothing to split. If this shot does not carry makeup, the story ends.

Dollar example 2, makeup across two events at face value, still 50/50. Event 1: buy-in $1,000, cash $0. Package result = −$1,000. Makeup = $1,000. Event 2: buy-in $1,000, cash $2,600. Across both events, cashes are $2,600 and buy-ins are $2,000, so the package result is +$600. Makeup is cleared because the package is no longer negative. The $600 profit splits 50/50 into $300 each. Backer put in $1,000 over the two events and receives $1,300. Player put in $1,000 and receives $1,300. Check: $1,300 + $1,300 = $2,600.

If your contract splits only the backer's half, or charges markup, rebuild the arithmetic from the contract. These Suppose figures are a teaching ledger, not a quote from a staking site. The test is whether both people can reach the same dollar without a new negotiation.

| Line | Shot, example 1 | Two-event package, example 2 |
| --- | --- | --- |
| Buy-ins | $1,000 | $2,000 |
| Cashes | $1,600 | $2,600 |
| Package result | +$600 | +$600 |
| Makeup left | None, shot ends | $0 after event 2 |
| Each side of a 50/50 profit | $300 | $300 |

| Word | What to write down |
| --- | --- |
| Percent | Who owns what share of the package |
| Makeup | Whether losses carry, and on what base |
| Markup | The price per $1 of buy-in, and whether it is refundable |
| Scope | Stakes, rooms, variants, start date, end date |`,
    },
    {
      id: "write-it",
      title: "The note should name the boring facts",
      body: `A usable deal fits on one page. Name the player and the backer. Name the percent. Name whether unused makeup survives a winning month. Name the maximum stake. Name who files the hand histories or the cashier receipts. Name the currency. If the room pays in a stablecoin, say which one, and what happens if the price moves before you settle. [Crypto poker](/guides/crypto-poker) is the background for rooms that pay in coins. The staking note still has to pick one unit so you are not arguing bitcoin versus dollars after a score.

Settlement timing matters as much as the split. "When the room pays" is better than "when I feel like it." If the room holds a withdrawal, the backer is waiting on the same cashier you are. Say whether you settle per event or on a weekday. Say what happens if someone wants out mid-makeup: does the player owe the hole in cash, or does the deal only pay itself back from future poker? Those are different risks. Cash makeup turns poker into a debt. Poker-only makeup can leave a backer stuck in a hobby the player quits.

Keep receipts. A screenshot of a lobby is weaker than a cashier history. Both people should be able to see the same buy-ins. Hidden tables destroy the ledger even when the player is honest, because the other side cannot check the work.

Nobody here needs a script for stiffing a backer or for bullying a player who is in makeup. If you do not trust the other person with a shared sheet, do not stake them. Trust plus a sheet beats trust alone. A sheet without trust is just evidence for a fight you already expect.`,
    },
    {
      id: "not-rakeback",
      title: "Staking is not a fee rebate or a coinflip",
      body: `Rakeback returns part of the fee a room already took. Staking splits results with a person who funded you. You can have both in the same month and you must not add them into one "backing" number. Read [rakeback explained](/guides/rakeback-explained) before you let a room's rebate sit on the same line as a backer's profit. A rebate can be yours alone if the deal forgot to mention it. That silence causes fights. Assign the rebate in the note: all to the package, or all to the player, or split like profits.

A coinflip is not a stake. On PVPspinArena, Jackpot and Coinflip take 5% of the pot and end. There is no makeup, no horse, and no markup. Two people who each put $20 into a [Coinflip](/coinflip) build a $40 pot, the fee is $2, and the winner is paid from the rest. You do not "owe the site" the next flip because you lost this one. If you want that clean ending, do not describe it as poker staking. If you want a backing deal, do not look for it on a coinflip button.

The site balance is USD, funded with Bitcoin or with USDC or ETH on Base. It will not track your package. Roulette on the same site is a house wheel, not a staked tournament. Do not fund a backer's debt with a different game because the package is in makeup. That is chasing, with extra steps.

Stop the deal when life money gets involved. Makeup pressure is a classic way a hobby becomes a bill. A backer who demands higher stakes to "clear makeup faster" is raising the variance that created the hole. A player who demands a new backer to pay off the old makeup in cash has started a debt chain. End the package instead.`,
    },
    {
      id: "checklist",
      title: "Checklist before you take or sell action",
      body: `Use this checklist on the note, not in your head.

- I am 18 or older, and I understand this is not legal advice about contracts.
- The percent, markup, and makeup rules are written, including whether makeup carries.
- Buy-ins, stakes, rooms, and dates are limited. Higher stakes need a new yes.
- I can recompute the two Suppose examples with this deal's own rules and get one number.
- Currency is named. Fee rebates are assigned to the package or to the player.
- Both sides can see the same receipts. Settlement has a day, not a mood.
- The worst case, a total loss of the funded buy-ins, is money that can actually be lost.

Poker staking works when the sheet is boring and the cards are the only drama. Makeup is not an insult. It is the memory of losses the split has not digested yet. Markup is not a tip jar. It is a price.

If you cannot explain the deal without the phrase "you know what I mean," you do not have a deal. Play your own money at a stake you can afford, or do not play.`,
    },
  ],
  faqs: [
    {
      q: "What is makeup in poker staking?",
      a: "Makeup is the package's cumulative loss. Later profit fills that hole before a new profit is split. Whether it carries past a date, and on whose share, has to be written in the deal.",
    },
    {
      q: "What does 1.2 markup mean?",
      a: "The buyer pays $1.20 for each $1 of buy-in they purchase. The extra 20 cents does not go into the prize pool unless your deal says it does. A total loss costs the buyer the marked-up amount.",
    },
    {
      q: "Does the player still pay rake while staked?",
      a: "Yes, if the room charges a fee. The backer does not erase the table's posted cap. Rakeback is a separate rebate. Assign it in the note so it is not split by accident.",
    },
    {
      q: "Can I stake a single tournament?",
      a: "Yes. That is a shot: settle the one result and do not carry makeup unless you wrote that you will. One event is easier to audit than a month of cash games.",
    },
    {
      q: "Does PVPspinArena offer poker staking?",
      a: "No staking ledger and no makeup are published. Six-max Hold'em is live, with a 5% fee only after a flop. Coinflip and Jackpot charge 5% of the pot and finish. There is no horse and no backer share.",
    },
  ],
  sources: [
    { label: "Wikipedia — Poker staking", url: "https://en.wikipedia.org/wiki/Poker_staking" },
    { label: "Wikipedia — Poker", url: "https://en.wikipedia.org/wiki/Poker" },
  ],
  related: [
    "sit-and-go-poker",
    "spin-and-go",
    "cash-game-poker",
    "poker-bankroll-management",
  ],
  updated: "2026-10-07",
};
