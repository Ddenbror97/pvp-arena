import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cash-game-poker",
  cluster: "Poker",
  keyword: "cash game poker",
  secondary: [
    "cash game stakes",
    "poker buy-in",
    "ring game strategy",
    "big blind cash game",
    "leaving a cash table",
  ],
  title: "Cash Game Poker: Stakes, Buy-Ins and Winning Strategy",
  description:
    "Cash game poker buy-ins, blind stakes, and a session plan: which hands to play, when to stand up, and how a Suppose cap changes the price.",
  h1: "Cash game poker: stakes, buy-ins, and winning strategy",
  answer:
    "Cash game poker is a ring game: blinds stay at the table's stake, chips represent money, and you may stand up between hands. A $1/$2 table means a $1 small blind and a $2 big blind. A $200 buy-in at that table is 100 big blinds. Winning strategy is hand selection, position, and bet size that still make sense after the posted fee. There is no elimination and no final table. Read the buy-in limits and the fee on the table you joined.",
  facts: [
    "Cash chips are worth the table's stake. You can quit between hands and redeem what the cashier allows.",
    "Stakes are written as small blind / big blind. Strategy talks in big blinds, not in raw chip pride.",
    "Buy-in depth, such as 40 or 100 big blinds, changes which hands can be played for implied odds.",
    "A pot fee with a cap is a cost per hand. Copy the cap from the table. Do not borrow one from an article.",
    "PVPspinArena does not spread cash game poker. Coinflip takes 5% of one pot and ends.",
  ],
  sections: [
    {
      id: "ring",
      title: "A cash game does not eliminate you",
      body: `Cash game poker keeps the same blinds until you leave or the table closes. Lose a pot and you still have a chair, if you still have chips or you buy in again. Win a pot and you can stand up and take the money, subject to the room's cashier rules. Nobody is waiting on a bubble. The session is a string of independent hands that share a stack.

That freedom is the product. It is also the leak. Because you can rebuy, a tilt rebuy feels like "getting back to even" rather than like registering a new tournament. It is a new risk with the same name as the old stack. Decide the session's money before you sit, including the rebuys you are willing to make. A third rebuy that was not in the plan is a different game. It is called chasing.

This [poker](/guides/topics/poker) page is for adults 18 or older. Format neighbors are [sit and go poker](/guides/sit-and-go-poker), [spin and go](/guides/spin-and-go), and [poker staking](/guides/poker-staking). It is not legal advice, and it will not tell you which cash games are offered in your country. The operator's terms and your local law do that. The mechanics below are the same shape on a kitchen table and on a client: blinds, a buy-in, people, and a fee if a room is hosting.

[Texas Hold'em rules](/guides/texas-holdem-rules) cover the hand itself. This article covers the money wrapped around the hand. If you skip the rules, bet sizing talk will not save you. If you skip the money, you can play pretty hands at a stake that is wrong for your bankroll.

Do not import a push-fold chart from a six-minute blind level onto a cash table where the blinds never move.`,
    },
    {
      id: "stakes",
      title: "What a stake means in dollars",
      body: `A stake is a pair of blinds. $0.05/$0.10 means the small blind posts five cents and the big blind posts ten cents. $1/$2 means one dollar and two dollars. $2/$5 means two and five. People say "the five-dollar game" and mean different things. Use the full pair.

The big blind is the unit. A pot of ten big blinds is a small pot. A pot of one hundred big blinds is a stack, if everyone bought in for that depth. Saying "I won $40" is incomplete until you divide by the big blind. Forty dollars is 400 big blinds at $0.05/$0.10 and 20 big blinds at $1/$2. Those are different events. One is a surge. The other is a normal pot.

Open sizes are quoted in big blinds too. An open to 2.5 big blinds costs $0.25 at a ten-cent blind and $5 at a two-dollar blind. The motion of your arm is identical. The household impact is not. Pick the table by the dollar, then think in blinds so the strategy travels.

Antes are less common in cash than in tournaments, but a table can post them. A straddle is an optional extra blind some live games allow. If your app has a straddle button, know what it costs before you click it as a habit. It is a raise of the price of seeing a hand, not a personality.

An empty stake is a closed product. Do not step up two levels because the one you prepared for has no seats. The dollar size of a mistake rises with the blinds.`,
    },
    {
      id: "buyin",
      title: "Buy-in depth is a strategy choice",
      body: `The table lists a minimum and a maximum. A short buy-in, around 40 big blinds, takes implied-odds hands away from you. You cannot win a huge pot if neither stack is huge. A deep buy-in, 100 big blinds or more, lets suited connectors and small pairs realize more of their value, and it lets mistakes cost more. Match the hands you actually play to the depth you actually bought.

Suppose the stake is $1/$2 and the maximum is $200. A full buy-in is 100 big blinds. A $80 buy-in is 40 big blinds. Those two seats should not play the same calling ranges. The short stack should be more willing to commit and less willing to call a raise "to see if I hit." The deep stack should be more careful about bloating a pot with a hand that cannot stand a turn barrel.

[Texas Hold'em strategy](/guides/texas-holdem-strategy) is where position and starting hands get a full treatment. Use it with the depth in front of you. A chart that assumes 100 big blinds is a fiction at 40. A short-stack jam chart is a fiction when you cover the table and nobody is all-in.

Topping up is allowed on many cash tables: you may add chips up to the max between hands. Topping up from a planned session roll is fine. Topping up from money that was supposed to be rent is the rebuy leak again. [Poker bankroll management](/guides/poker-bankroll-management) puts a number of buy-ins between you and that leak. The number is a cushion, not a promise you will win. If you do not have an edge after the fee, more buy-ins only delay the end.

Leave room in the roll for the fee itself. A stack of exactly one max buy-in is not a cash-game bankroll. It is a single bullet.`,
    },
    {
      id: "suppose-cap",
      title: "Two dollar examples with a cap you substitute",
      body: `Dollar example 1, the haircut on one pot. Suppose you are in a $1/$2 game and the table prints a cap of $3. The pot reaches the cap. Players have put $90 into the middle. If the cap is taken from the pot, the winner drags $87, not $90. Being "in for $40" and dragging $87 is a win. It is not a $90 win. Track the number the software paid you. If your table's cap is $1 or $5 or a time charge per hour, delete the $3 and recompute. Suppose marks a practice cap. It is not a published rate for a named room.

Dollar example 2, a session of caps. Suppose that same $3 cap is hit on 12 pots. The caps remove 12 × $3 = $36 from those pots. If your software's "won" column is already after the fee, do not subtract the $36 again. Read the column. A modest winning session can disappear into the cap total. If your table prints a different cap, recompute.

| Item | Suppose figure | What you do with it |
| --- | --- | --- |
| Stake | $1/$2 | Divide every pot by the $2 big blind |
| Max buy-in | $200 | That is 100 big blinds |
| Cap | $3 | Replace with the cap on your table |
| One capped pot of $90 | Winner drags $87 | Log the drag, not the pre-fee middle |

| Depth | Stack at $1/$2 | Practical effect |
| --- | --- | --- |
| Short | $80 is 40 bb | Fewer speculative calls, more commit-or-fold |
| Standard | $200 is 100 bb | Full postflop play, larger possible mistakes |
| Session cap | Your choice | Includes rebuys you pre-committed, not tilt |`,
    },
    {
      id: "strategy",
      title: "Strategy that still works after the fee",
      body: `Winning cash strategy is selective. You enter more pots in position than out of position. You fold hands that look pretty and play badly against a raise. You size bets so worse hands continue when you are ahead, and you drop bluffs when the price is wrong. The cash-game addition is repetition: the posted fee taxes the pots you build, hand after hand.

A table that folds too much pays steals. A table that calls too much pays value bets and punishes bluffs. You learn which one you are on by watching. Eight games at once is autopilot. Size autopilot like recreation, or do not play it.

Pot odds still decide calls. A fee already taken does not change the chips in the pot you see. It changed the pot before the decision. Use the current pot, the current bet, and your chance of winning. Do not add a ghost rake on top of a pot that was already raked. Double-counting the cap makes you fold calls you should make.

[Crypto poker](/guides/crypto-poker) is relevant when the cashier is a coin and the table is still a cash game. The strategy does not care that the buy-in arrived as USDC. The cashier cares. Know the unit your rent is denominated in. A chip graph and a dollar graph can diverge when the coin moves.

Strategy notes are not a biography. [The televised cash-game name](/guides/tom-dwan) is the public high-stakes figure, and the challenge settlement is not printed.`,
    },
    {
      id: "standup",
      title: "Standing up is part of the format",
      body: `You may leave between hands. That is not rude in an online client, and it is normal in a home game if you announced a stop time. The chips convert back through whatever cashier or host you used. If a person, not a company, has to send the money, the cash-out risk is theirs to honor and yours to have sized. A ring game does not insure settlement.

A stop-loss fits because nothing forces you to finish. It keeps one session from becoming the monthly roll. Pick the number when you are calm.

Compare a single [Coinflip](/coinflip) if you want to see a posted fee with no streets. Two players build a pot. This site takes 5% of that pot. The hand is over. Cash game poker takes its fee across many pots and asks you to decide on every street. PVPspinArena hosts six-max cash Hold'em, including $1/$2, with a 5% fee only after a flop. The balance here is USD, funded with Bitcoin or with USDC or ETH on Base. Roulette is a separate house wheel: 33 slots, 16 Purple, 16 Silver at 2x, 1 Green at 14x, 5% taken from winning payouts, about 7.88% on Purple and Silver after the fee. That wheel is not a ring game.

Do not "play it off" because the cashier takes time. Waiting on a withdrawal is not a reason to open another table. Close the client.

A cash game can allow a blind the rules do not require. [The voluntary extra blind](/guides/straddle-poker) acts last before the flop and is not a rule on these six-max tables.`,
    },
    {
      id: "checklist",
      title: "Checklist for one cash session",
      body: `Fill this checklist before the first blind, and obey it after the second rebuy urge.

- I am 18 or older. This page is not legal advice about the room I am joining.
- I can say the blinds in dollars and my buy-in in big blinds.
- I copied the fee or cap from this table. Any other number I use is labeled Suppose.
- My session money, including planned rebuys, is set. Extra rebuys are a new decision made away from the table.
- I know whether I am short or deep, and I will not use a 100-blind habit at 40 blinds.
- I know who converts chips back to money, and I can afford a delay.
- I have a time I will stand up, even if I am stuck or if I am running hot.

Cash game poker pays you for decisions repeated at a stable stake, minus the posted fee, against whoever sits down. Stakes tell you the dollar size of a blind. Buy-ins tell you the depth. Winning strategy is whatever still shows a profit after the cap, not whatever won the biggest pot on camera.

If the fee card is missing, ask or leave. A table that will not show its price is an expensive mystery. You can find another chair.`,
    },
  ],
  faqs: [
    {
      q: "What is cash game poker?",
      a: "A ring game where blinds stay put, chips are redeemable money, and you can leave between hands. You are not eliminated from a tournament because there is no tournament. You can still lose the buy-in.",
    },
    {
      q: "What does $1/$2 mean?",
      a: "The small blind is $1 and the big blind is $2. A $200 buy-in is 100 big blinds. Talk about pots in big blinds so a win at a smaller stake is not confused with a win at this one.",
    },
    {
      q: "How much should I buy in for?",
      a: "Between the table's minimum and maximum, at a depth you understand. Forty big blinds and 100 big blinds are different strategies. Your room's max is the one that counts, not a number from a video.",
    },
    {
      q: "Does the house play a hand in a cash game?",
      a: "In a real poker cash game, no. Other players win your chips. The room is paid by the posted fee or time charge. House-banked video poker is a different product with a pay table.",
    },
    {
      q: "Can I play cash game poker on PVPspinArena?",
      a: "Yes. Six-max No-Limit Hold'em cash tables are live, from $0.02/$0.05 to $5/$10, including $1/$2. The fee is 5% of a pot only after a flop. Coinflip and Jackpot are separate pots with a 5% fee and no streets.",
    },
  ],
  sources: [
    { label: "Wikipedia — Cash game", url: "https://en.wikipedia.org/wiki/Cash_game" },
    { label: "Wikipedia — Texas hold 'em", url: "https://en.wikipedia.org/wiki/Texas_hold_%27em" },
  ],
  related: [
    "sit-and-go-poker",
    "spin-and-go",
    "poker-staking",
    "texas-holdem-strategy",
    "straddle-poker",
    "tom-dwan",
  ],
  updated: "2026-10-07",
};
