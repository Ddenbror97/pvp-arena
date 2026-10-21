import type { Guide } from "./types";

export const guide: Guide = {
  slug: "three-bet-poker",
  cluster: "Poker",
  keyword: "3 bet poker",
  secondary: ["preflop reraise", "button versus blinds", "minimum raise size"],
  title: "3 Bet Poker: Reraise, Position, and a Dollar Pot",
  description:
    "A 3 bet poker reraise is the third wager before the flop. Position decides who acts last, and a dollar pot shows the risk without promising a win.",
  h1: "3 bet poker: a reraise before the flop, and what the pot costs",
  answer:
    "3 bet poker is a reraise before the flop. The big blind counts as bet one, an open raise is bet two, and the reraise is bet three. Position decides who acts last. A dollar pot shows the chips at risk. The reraise can take the blinds or lose the extra money. It is not a promise that you win.",
  facts: [
    "Last tested 20 October 2026 on Wikipedia's Betting in poker page, Wikipedia's Texas hold 'em page, and the poker.org glossary.",
    "A 3 bet poker reraise is the second raise on that street. The glossary calls the first raise the 2-bet, so the next raise is the third bet.",
    "Wikipedia's betting page says a no-limit raise must be at least the size of the previous bet or raise, and that no-limit does not cap the number of raises.",
    "The Hold'em page says players who act later have more information, and that players typically play fewer hands from early seats.",
    "PVPspinArena terms: six-max no-limit Hold'em, blinds from $0.02/$0.05 to $5/$10, fee 5% of a pot only after a flop. A preflop fold pays no fee.",
    "No win rate for this reraise is printed on the pages opened here. We did not open a card-room account or time a cash-out.",
  ],
  sections: [
    {
      id: "count",
      title: "What a 3 bet poker reraise counts as",
      body: `Before the flop, the big blind is already a live bet. Wikipedia's betting page says players may not check that round, because the blind has opened it.

An open raise is the next bet. A raise of that open is a re-raise. The poker.org glossary dates the nickname to limit Hold'em, where the first raise was called two bets and the next raise was three bets.

A 3 bet poker action is that re-raise, not the open and not a call. The same glossary says the word can apply on a later street when the sequence is bet, raise, then raise again. In ordinary cash-game talk the word means the preflop re-raise.

### The three chips, named

| Action before the flop | Which bet it is | What it is not |
| --- | --- | --- |
| Big blind | Bet one, already posted | A voluntary open |
| First raise over the blind | Bet two, the open | The reraise |
| Raise of that open | Bet three, the reraise | A fourth bet |
| A raise of the reraise | The next raise, often called four bets | A new kind of hand |

This note sits in the [poker topic](/guides/topics/poker). The street order itself is [the order of the streets](/guides/texas-holdem-rules). Adults 18+ only.`,
    },
    {
      id: "seat",
      title: "The seat that still has to act",
      body: `Position is the order of speech. Wikipedia's Hold'em page says the button rotates, the small blind sits left of the button, and the big blind sits left of the small blind.

Preflop, the first voluntary decision belongs to the player left of the big blind. The button speaks later.

The small blind speaks after the button. The big blind still has an option if nobody has raised.

Acting last means you have seen the folds and the raises. Acting first means several players can still put money in behind you.

That is information, not a refund. A late seat can still lose the extra chips.

### Heads-up is a different map

When two players remain, Wikipedia says the button posts the small blind and acts first before the flop. After the flop, the button acts last.

A habit copied from a six-handed table will fire at the wrong time in that spot. [One opponent at a time](/guides/heads-up-poker-strategy) is a separate problem from a full table.

[A bet that wants a fold](/guides/bluffing-in-poker) can be the reason for the reraise. [A mix of strong hands and bluffs](/guides/gto-poker-strategy) is the theory label. Neither page we opened prints the frequency you should use tonight.`,
    },
    {
      id: "dollars",
      title: "Pricing a $1 blind up to the reraise",
      body: `The pictures use a $1 big blind so the arithmetic stays visible. They are not a hand from a live table, and they are not a forecast.

Example 1 — folds. The small blind is $0.50 and the big blind is $1. An open to $3 makes the pot $4.50 before a call.

The button reraises to $9. The 3 bet poker chip in this picture is that $9, not the $3 open.

If everyone folds, the uncalled $6 comes back to the button, and the button wins the $4.50 already in the pot.

That $4.50 is the profit only if they fold. The glossary does not say they will.

Example 2 — a flop is dealt. Suppose callers build a $20 pot and a flop arrives. On this site the terms charge 5% of that pot, which is $1, so the winner is paid $19.

The $1 is a fee on a played pot. It is not a prize for having reraised.

Example 3 — the reraise loses. The same $9 can be called and lose. The glossary does not refund it.

A room's rake on a different site is not published here. Do not paste this site's 5% onto a card room that prints another number.

[Leaving a cash seat](/guides/cash-game-poker) is a different decision from busting a tournament. [How many buy-ins to keep aside](/guides/poker-bankroll-management) is the budget question, and a single pot does not answer it.`,
    },
    {
      id: "compare",
      title: "A player pot beside a house game",
      body: `The reraise is a wager between players. A house-banked table game pays you from the house bank under a posted schedule. Those are different contracts.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
| --- | --- | --- | --- | --- | --- |
| Preflop reraise | No win rate or rake is published on the pages opened here | Other players still in the hand | The room's cashier, not published here | not published | The table big blind, which varies |
| House-banked casino | The house price on its own games, not published for a named pit | The house | not published | not published | not published |
| PVPspinArena | Poker fee is 5% of the pot only after a flop | Other seated players | Chips return to the dollar balance when you leave | yes, finished hands can be recomputed | Blinds from $0.02/$0.05 |

How PvP compares: a reraise still needs opponents. [Poker](/poker) on this site is six-max no-limit Hold'em against those players. A hand that ends before the flop pays no fee, and uncalled chips are returned before the fee.

A pot that sees a flop pays 5%. Two $50 Coinflip stakes are a different product: a $100 pot, a $5 fee, and a $95 payout to the winner. Cash-out minimum is $20 in BTC, USDC, or ETH, and the terms also require wagering at least half of deposited dollars before a cash-out.

We did not time a cash-out. A settled hand can be checked on the [fairness page](/fairness).

That check matches this site's shuffle record. It does not audit another card room.`,
    },
    {
      id: "minimum",
      title: "The minimum raise the betting page prints",
      body: `Wikipedia gives the no-limit minimum in a worked line. If someone bets $5, the next raise must be at least another $5. A raise of $2 is not a full raise unless it is all the chips that player has left.

If a player raises that $5 bet by $7, the total is $12. The next re-raise must be at least another $7, so at least $19 in total.

Table stakes override the minimum. If the last $2 is your whole stack, you may put that $2 in even when a full raise would be larger. You are all-in for less, not raising a full size.

### Raise-to versus raise-by

The same page says "raise to $15" and "raise by $15" are different amounts. Public card rooms generally bind an unclear phrase to the raise-to reading.

Fixed-limit is a different scale. In the page's $3/$6 example, preflop raises are $3 each, and many rooms cap the number of raises at three or four, not counting the opening bet. No-limit does not use that cap.

A 3-bet in a capped limit game can be the last raise allowed. In no-limit it is only the third bet, and more raises can follow. Read the house rule before you assume the action is closed.`,
    },
    {
      id: "not-a-chart",
      title: "What the opened pages refuse to list",
      body: `The glossary prints a definition. It does not print a chart of hands, a stack-depth table, or a profit figure.

Wikipedia prints the order of betting and the minimum-raise arithmetic. It does not print how often a button reraise should fold out the opener.

A call keeps the pot smaller than a reraise. The reraise puts more money in while more cards are still to come.

That is the trade. It is not, by itself, a reason the call is a mistake.

[A tournament with no entry fee](/guides/freeroll-poker) uses the same streets and a different stack life. Chips there are not the cash in front of you on a ring game.

Do not move a cash-game size into a tournament because the nickname matches. The blind is still bet one.`,
    },
    {
      id: "checks",
      title: "Checks before the third chip goes in",
      body: `Use the list at the table you are sitting. A familiar nickname does not set the house rule.

- [ ] Confirm you are 18, or older if local law sets a higher age.
- [ ] Call the big blind bet one, the open bet two, and the reraise bet three.
- [ ] Name who still acts behind you before you raise.
- [ ] Raise at least the size of the previous raise, unless you are all-in for less.
- [ ] Say the total you are raising to, so the amount is not ambiguous.
- [ ] On this site, remember a preflop fold pays no fee.
- [ ] On this site, remember a flop pot is charged 5%.
- [ ] Do not treat a glossary line as a win rate.
- [ ] Set a dollar loss stop before the session.
- [ ] If the session becomes a chase, call 1-800-GAMBLER.
- [ ] Recompute a finished hand on this site from the table record.`,
    },
    {
      id: "leave",
      title: "Who should leave the extra chips in the rack",
      body: `A reraise can take a small pot or lose a larger one. The pages opened here do not owe you the first result.

Do not play if you are under 18, or under a higher age where you live. Do not play where the game is illegal. Do not stake rent, savings, or money with a due date.

Do not reraise to get even with the previous hand. The deck does not store a debt to your seat.

This page is an editorial note on public rules pages. It is not legal advice and it is not a coaching plan.

If the extra chips stop being a bounded spend, stop. Call 1-800-GAMBLER and open [responsible gambling](/responsible-gambling).

The [terms](/terms) list the fee and the blind range for this site. They do not list a target win for the reraise.`,
    },
  ],
  faqs: [
    {
      q: "Does a 3 bet poker reraise promise a profit?",
      a: "No, the reraise does not promise a profit. The glossary we opened defines it as a second raise and prints no win rate. You can take the blinds if everyone folds, or lose the extra chips if a caller wins the pot. The seat tells you who still acts behind you. It does not change the cards. Stake only money you can lose on that hand.",
    },
    {
      q: "Is the open raise already the third bet?",
      a: "No. Before the flop the big blind is bet one and the first raise is bet two. The reraise of that open is bet three. A further raise is the next number, not a new game. On a later street the same counting starts with a bet, then a raise, then a re-raise. The poker.org glossary is the page that names the second raise this way.",
    },
    {
      q: "Does position change the cards you are dealt?",
      a: "No. Position changes who has to act before you, not the two cards you hold. Wikipedia notes that later seats have more information and that early seats usually play fewer hands. That is a habit built from information, not a rule that late seats win. A button reraise can still lose the chips it adds.",
    },
    {
      q: "What is the smallest legal re-raise in no-limit?",
      a: "Wikipedia says the raise must be at least the size of the previous bet or raise. If the prior raise was $7, the next full raise adds at least another $7. A short all-in can be less when it is the player's last chips. Fixed-limit games use the posted stake instead, and many rooms also cap how many raises a round allows.",
    },
    {
      q: "Does this site charge the fee if everyone folds before the flop?",
      a: "No. The terms say the poker fee is 5% of the pot only when a flop is dealt. A hand that ends before the flop pays nothing, and uncalled chips are returned before any fee. A $20 pot that does see a flop is charged $1 under that rule. We did not time a cash-out. The cash-out minimum on the same terms is $20.",
    },
    {
      q: "Where should a beginner read the streets first?",
      a: "Start with the order of blinds, flop, turn, and river, then come back to the reraise as one action inside that order. The betting page explains call, raise, and fold. It does not give you a hand chart. If a video quotes a frequency, that figure was not on the pages opened for this note, so it stays off the page. Adults only, and only with money you can lose.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Betting in poker",
      url: "https://en.wikipedia.org/wiki/Betting_in_poker",
    },
    {
      label: "Wikipedia: Texas hold 'em",
      url: "https://en.wikipedia.org/wiki/Texas_hold_%27em",
    },
    {
      label: "poker.org poker glossary",
      url: "https://www.poker.org/poker-terms/",
    },
  ],
  related: [
    "freeroll-poker",
    "gto-poker-strategy",
    "heads-up-poker-strategy",
    "texas-holdem-rules",
    "cash-game-poker",
    "poker-bankroll-management",
  ],
  updated: "2026-10-20",
};
