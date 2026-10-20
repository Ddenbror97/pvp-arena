import type { Guide } from "./types";

export const guide: Guide = {
  slug: "slow-play-poker",
  cluster: "Poker",
  keyword: "slow play poker",
  secondary: ["slow play poker rules", "slow play poker strategy", "slow play poker tips"],
  title: "Slow Play Poker: When a Trap Check Leaks",
  description:
    "Slow play poker means checking a strong hand to trap. See when a free card or missed value costs you, separate from taking time on the clock.",
  h1: "Slow play poker: checking a strong hand, and when the trap fails",
  answer: `Slow play poker means checking, or only calling, with a hand strong enough to bet for value, because you hope a weaker hand will put money in later. It is a trap.

It fails when the free card lets them outdraw you, or when the hands that would have called a bet check behind and you win a smaller pot. It is not the same thing as playing slowly on the clock.`,
  facts: [
    "A slow play is a decision about the hand, not about the shot clock.",
    "The trap needs an opponent who will bet, or call later, if you check.",
    "Dry boards with few draws are the usual candidates.",
    "Wet boards punish the free card.",
    "A mixed check, sometimes strong and sometimes weak, is an idea on the GTO page, without solver steps here.",
    "You can practise the choice in six-max No-Limit Hold'em. The site does not force a slow play.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "A check that hides a hand you could have bet",
      body: `Slow play poker is a bet you decline. You hold a set, or an overpair, or the nuts, and you check into an opponent who might bluff or who might pay a later street.

The hope is a bigger pot than a small value bet would build. The cost is everything that happens on the free card.

Calling a bet you could have raised is the same family. You keep their bluffs in, and you also keep their draws cheap.

Both versions are traps. Neither version is required by the rules of Hold'em.

The rules allow a check. They do not award you the pot for being sneaky.

Playing slowly is a different phrase. It means tanking, burning the clock, or delaying a fold you already know.

A fast check with a monster is a slow play. A long stare with a weak pair is just slow.

Keep the words apart so a floor warning about time is not confused with strategy.

[Texas Hold'em rules](/guides/texas-holdem-rules) list check, bet, call, raise, and fold. Slow play is only a purpose you attach to the check or the call.`,
    },
    {
      id: "compare",
      title: "Slow play poker rules of thumb against a value bet",
      body: `### Slow play poker rules

There is no official rule that says you must trap a set. The useful test has three questions.

Will a worse hand put money in if I check? Will a worse hand call if I bet? How many cards can beat me on the next street? If the worse hand will call now, and many cards can beat you, betting is the plain action. If the worse hand will fold to a bet and will bluff if checked to, the trap has a job.

A house-banked game rarely gives you this choice against another person. You are paid by a chart, or you lose to the house.

Trapping a slot is not a concept. Poker between people is where the check means something.

| Action | What you are doing | Who benefits if a draw gets there | Clock |
| --- | --- | --- | --- |
| Value bet | charge hands that can call | you already charged them | unrelated |
| Slow-play check | invite a bluff or a later call | the player who caught up for free | unrelated |
| Tanking | using time | nobody's equity | this is playing slowly |
| Mixed check | sometimes strong, sometimes weak | depends on the mix | unrelated |

The mix is the only reason to open [GTO poker strategy](/guides/gto-poker-strategy). That page names why a strong hand sometimes checks.

It does not walk solver steps, and this page will not add them. The [poker topic](/guides/topics/poker) holds both articles.`,
    },
    {
      id: "fees",
      title: "A free card has a price, and so does our flop fee",
      body: `The free card is not free to the player who was ahead. It costs the bets you skipped and, sometimes, the pot.

A card room may also rake. That rake is not published here.

A house-banked casino does not charge a poker flop fee of the kind below, and its edge is not published here.

On PVPspinArena you can practise this Hold'em choice at six-max No-Limit Hold'em. Nothing in the client forces you to slow play.

The fee is 5% of the pot only after a flop, whether you bet the flop or checked it. We do not list a promo code for a trapping system.

| | A slow-play choice | House-banked casino | PVPspinArena |
| --- | --- | --- | --- |
| What it is | checking a strong hand | not a poker trap | a choice inside Hold'em |
| Opponent | another player | the house | another player |
| Fee | room rake not published | not published | 5% of the pot only after a flop |
| Promo code | none | not published | we do not list a promo code |
| Balance | the cash game's chips | not published | US dollars from Bitcoin, or USDC or ETH on Base |

[Cash game poker](/guides/cash-game-poker) is the stake language around the choice. A trap at 100 big blinds is a different risk from a trap when someone is already short.`,
    },
    {
      id: "dollars",
      title: "A check that gave away a card, and a $44 fee",
      body: `Dollar example 1, a home $1/$2 pot with no rake on the card. The flop pot is $20.

You hold a set on a board with one obvious draw, and you check. Suppose the opponent would have called a $10 bet.

They check behind instead. The turn completes the draw.

They bet $30, you call, and you lose. You missed the $10 you could have won, and you paid $30 on a hand that was ahead on the flop.

The numbers are a sketch of the leak, not a claim that every opponent calls $10.

Dollar example 2, our six-max Hold'em. A pot reaches $44 and a flop is dealt.

The fee is 5% of $44, so $2.20. The winner receives $41.80.

Checking or betting does not change that percent. It changes how large the pot is before the fee.

Skip the flop and the poker charge is nothing. [Pot odds](/guides/poker-pot-odds) prices the $30 call in the first example.

This page does not rebuild that formula.

The $20 home pot and the $44 site pot are different tables. Do not subtract $2.20 from the kitchen set.`,
    },
    {
      id: "checklist",
      title: "Slow play poker tips when the trap is the point",
      body: `### Slow play poker tips

- Name the worse hands that will put money in if you check.
- Name the worse hands that will call if you bet.
- Count the draws that complete on the next card.
- Prefer a trap on a dry board, if you trap at all.
- Bet when the board is wet and you are ahead.
- Skip the trap multiway. Someone was priced in already.
- Skip the trap out of position against a player who checks back.
- Separate this idea from the shot clock. Act in time either way.
- Do not slow play because a movie did it.
- After you lose to the free card, write down whether a bet was available.
- Review one hand, not your whole mood.

A single mixed-check idea lives on the GTO page. Go there for the concept. Stay here for the leak.`,
    },
    {
      id: "risks",
      title: "Missed value, a free river, and a trap with no audience",
      body: `### Slow play poker strategy

Slow play poker strategy fails in two tidy ways. The first is the free card.

They had a draw, it arrived, and your set is now a bluff-catcher or a loser. You could have bet large enough that the draw was a mistake, or at least you would have been paid while you were ahead.

Giving that card away to "let them catch up" is only clever if they were going to fold every bet and you needed them to improve. Most of the time you needed the call, not the improvement.

The second failure is missed value with no draw at all. You check, they check, the river checks, and you win the pot you already had.

A bet on the flop or the turn would have been called by a worse made hand. The trap protected you from nothing.

It only shrank the pot. That is the boring leak, and it is the common one.

The trap has a narrower win. The opponent bluffs because you showed weakness, or they call a later bet with a hand that would have folded earlier.

If your opponent never bluffs and never pays off, there is no audience for the trap. Bet.

Out of position, a check often ends the street. You cannot be sure they will bet for you.

In position, a check behind is the free card. Know which seat you occupy before you copy a hand you saw from the button.`,
    },
    {
      id: "legal",
      title: "Adults, pace, and a session that does not need a trap",
      body: `Adults only. If your region sets the gambling age above 18, the higher age applies.

This is not legal advice. A check is a legal poker action.

It is not a legal opinion about where you may play.

Taking time on purpose to tilt someone, or to delay a game, can break a room's conduct rules. This page will not teach clock abuse.

Act within the time the table gives you. The strategy, if you use it, is the check itself.

Read the [responsible gambling](/responsible-gambling) page before you start trapping to "get it back." A slow play chosen from frustration is a larger pot with a worse plan. You can sit a session, bet your strong hands, and leave at the stop you set.

Six-max Hold'em on our site lets you practise the plain version: bet when called, check when a bluff is truly the only way the pot grows. Nothing in that choice requires a gimmick.`,
    },
    {
      id: "closer",
      title: "Mixed checks, named once, then ordinary Hold'em",
      body: `How PvP compares: slow play is a Hold'em decision you can take to a real table. [Poker](/poker) is six-max No-Limit Hold'em, so the check and the bet both exist.

[Fairness](/fairness) is how a committed seed can be reviewed after the hand. When that page includes a live block, settled play is what refreshes it.

No sample hand from the lobby is copied into this article.

[GTO poker strategy](/guides/gto-poker-strategy) is the only place this page sends you for mixed checks. Read the idea.

Do not look for solver steps there or here. Big O, short deck, razz, 2-7, and open-face Chinese are not the games that lobby deals.

Bet the strong hand when a worse hand can call. Check it when a bluff is the realistic way to get paid. Call the clock a clock, and call the trap a trap.

Trapping hides a made hand. The opposite display is [the game that shows every card face up](/guides/open-face-chinese-poker), where placement, not a check, is the decision.`,
    },
  ],
  faqs: [
    {
      q: "What does slow play poker mean?",
      a: `It means checking or flat-calling with a strong hand to induce action later. The hand could have bet for value.

You are choosing a trap instead. Hold'em allows the check.

It does not require the trap.`,
    },
    {
      q: "Is slow play the same as playing slowly?",
      a: `No. Playing slowly means using time on the clock.

A slow play can be a quick check. Tanking with a weak hand is not a trap.

Keep the phrases separate so a time rule is not treated as strategy advice.`,
    },
    {
      q: "When does the trap fail?",
      a: "It fails when a free card lets a draw win, and when worse hands that would have called a bet put in nothing. Multiway pots and wet boards make the free card more expensive. A passive opponent will not bluff into your check.",
    },
    {
      q: "Where do mixed checks belong?",
      a: "On the GTO poker strategy page, as the idea that a strong hand sometimes checks so a weak hand can check too. This article does not add solver steps, bet sizes from a solver, or a frequency to memorize.",
    },
    {
      q: "Can I practise this on PVPspinArena?",
      a: `You can practise the Hold'em choice. The game is six-max No-Limit Hold'em, and nothing forces a slow play.

Flopped pots are charged 5%. A $44 pot that sees a flop pays $2.20, and the winner receives $41.80.`,
    },
    {
      q: "Which slow play poker tips should I keep?",
      a: `Know who pays a bet and who bluffs a check. Count the draws.

Bet wet boards. Do not trap multiway out of habit.

Separate the idea from the clock. Review the hand you checked, including the value you skipped.`,
    },
  ],
  sources: [
    { label: "Pagat — public card-game rules", url: "https://www.pagat.com/" },
    { label: "World Series of Poker", url: "https://www.wsop.com/" },
  ],
  related: [
    "gto-poker-strategy",
    "poker-pot-odds",
    "texas-holdem-rules",
    "cash-game-poker",
    "open-face-chinese-poker",
  ],
  updated: "2026-10-20",
};
