import type { Guide } from "./types";

export const guide: Guide = {
  slug: "donk-bet-poker",
  cluster: "Poker",
  keyword: "donk bet",
  secondary: ["lead into the aggressor", "out of flow bet", "flop lead"],
  title: "Donk Bet: A Lead Into the Prior Aggressor",
  description:
    "A donk bet is a lead into the previous-street aggressor. This note uses a dollar pot, says what the glossary prints, and does not promise a profit.",
  h1: "A donk bet leads into the player who bet the previous street",
  answer:
    "A donk bet is a wager into the player who bet the previous street. The poker.org glossary opened on 20 October 2026 calls that lead a bet made out of flow. The label is not a profit forecast. A dollar pot below prices the lead. It does not say the next card owes you a win.",
  facts: [
    "Last tested 20 October 2026. Opened the poker.org glossary, Robert's Rules of Poker version 11, and the National Council on Problem Gambling helpline page.",
    "That glossary calls a donk bet a wager made out of flow, into the aggressor from the previous street.",
    "The same entry prints no win rate, no recommended size, and no frequency.",
    "Robert's Rules permits a check then a raise in most games. It does not define this lead.",
    "A casino rake for this line is not published on the pages we opened.",
    "We did not sit a hand. Coinflip on this site takes 5% of the pot. Cash-out minimum is $20.",
  ],
  sections: [
    {
      id: "glossary",
      title: "What the glossary calls a donk bet",
      body: `The page we opened is the public glossary at poker.org/poker-terms. Its entry says the name is short for donkey bet, and it describes a bet made out of flow.

In no-limit hold'em the usual order is simple. The player who called out of position on one street checks to the in-position aggressor on the next street.

Betting into that aggressor breaks the order. That break is the lead this page is about.

The glossary says early no-limit games treated the player who broke the order as a weak player. It also says solvers have shown spots where the out-of-position player should lead because that range is ahead on the card. It does not print which flops, which sizes, or how often.

A pejorative label can hide a sound bet, and it can also hide a pointless one. The word on the glossary is not a system. [Equilibrium ranges](/guides/gto-poker-strategy) are a separate study, and they do not print a donk frequency on the page we opened either.

The [Poker](/guides/topics/poker) hub collects the street-order notes. [One opponent across every street](/guides/heads-up-poker-strategy) is the short-handed case, where the same lead can show up with no extra callers.`,
    },
    {
      id: "check-first",
      title: "The check that players used to expect",
      body: `Picture a raised pot with two players left, with the preflop raiser on the button and the big blind having called. The flop is dealt, and the big blind is first to act.

Checking gives the preflop raiser the chance to bet again. Leading instead takes that chance away and builds the pot before the raiser chooses.

The lead can be a value bet, a bluff, or a probe with a draw. The glossary does not sort those motives, and the cards, if shown later, are what decide the pot.

[A bet that can be weak](/guides/bluffing-in-poker) is the general idea of wagering without a made hand. This lead is only the seat and the order. It is not proof the bettor is bluffing, and it is not proof the bettor is strong.

[A ring game with no tournament clock](/guides/cash-game-poker) keeps the same seats for the next hand. A lead on this hand does not change the blinds on the next one. [A raise after a check](/guides/check-raise-poker) is a different line: there the first player checks, then raises a bet. Do not mix the two names at the table.`,
    },
    {
      id: "dollars",
      title: "A dollar pot for the lead",
      body: `None of these pictures is a session result. They price one street, and they do not pay you.

Example 1: the pot is $40 when the flop starts, and the out-of-position caller bets $20 into the preflop raiser. If the raiser folds, the $60 comes back to the bettor, of which $20 was the bet just posted.

The new money captured is the $40 that was already there. That $40 is one pot, not a wage, and a donk bet here is only that price.

Example 2: the same $20 lead gets called, so the pot is $80 and the turn is still to come. The $20 bought a card and a later decision, not a guaranteed takeout.

Example 3: two $50 Coinflip stakes on this site make a $100 pot, the fee is $5, and the winner receives $95. That fee is not a poker rake, and we did not time a cash-out.

A fold win in Example 1 can sit next to three lost leads and still lose the hour. The glossary prints no recovery rate.`,
    },
    {
      id: "raised",
      title: "When the in-position player raises back",
      body: `Start again from the $40 pot and the $20 lead. The in-position player raises to $70 total, which is a raise of $50 on top of a call of the $20.

The leader must call $50 more to continue. Before that call the pot holds the original $40, the $20 lead, and the $70 raise, which is $130.

Calling $50 makes a pot of $180. The call price is 50 divided by 180, about 28 cents per dollar of call, if the hand ended on this street.

The hand often does not end here, because a turn and a river can add more bets. The 28 cent figure is the price of this decision only, and it is not a chart from the glossary.

Robert's Rules of Poker, version 11, says a check then a raise is permitted in all games except certain forms of lowball. That sentence is about a check, not about this lead.

Unlimited raising in no-limit is also in that section. A room card can still set a cap, and if the card is silent the cap is not published.

Folding to the raise is allowed. The $20 lead is lost, and the rest of the stack stays. Calling because the label felt aggressive is not a rule.`,
    },
    {
      id: "compare",
      title: "A player pot next to a house game",
      body: `Three products get mixed because each can show cards. Only the chips in front of you are the price you can recompute.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
| --- | --- | --- | --- | --- | --- |
| This lead in a cash hand | not published | other players | not published | not published | not published |
| House-banked casino | not published | the house | not published | not published | not published |
| PVPspinArena | Coinflip and Jackpot take 5% of the pot. Slott takes 10% of a winning pot | other players | balance updates when the round settles | yes, where a seed is committed before the round | Coinflip minimum is $1 |

How PvP compares: [Poker](/poker) on this site is a table against other players, not a paytable that quotes this lead. [Fairness](/fairness) recomputes a settled round that publishes a seed. That check matches this site's commit. It does not audit a glossary, and it does not audit a casino floor.

Purple and Silver roulette use 16 of 33 pockets, pay 2x, then lose 5% of the winning payout, which is about a 7.88% edge. That wheel is not a flop. We did not paste a live hand.

A [screen of table counts](/guides/poker-hud) can label how often someone leads. Thirty hands do not make that label a tell, and a donk bet still has no fee printed on the glossary.`,
    },
    {
      id: "range",
      title: "Range advantage without a printed frequency",
      body: `The glossary says a lead can be correct when the out-of-position player has range advantage on the card. Range advantage means the hands that player can hold are ahead of the hands the in-position player can hold, as a group.

The page does not name a flop, and it does not say that any particular board is the spot. Copying a board from memory would invent a figure the glossary left blank.

| Blank on the glossary entry | What we print here |
| --- | --- |
| Win rate for the lead | not published |
| Best flop | not published |
| Bet size | not published |
| Solver frequency | not published |
| Casino rake on the line | not published |

Camouflage is the other point the entry makes. A play with a rude name can be the one a solver likes, and that sentence is a description of a label, not a claim that the bet prints money.

If you cannot name the two ranges, you have a bet rather than the advantage the glossary is pointing at. Calling the lead a donk bet does not fill the blank cells for size, stack depth, or players still to act.

[The two-card street order](/guides/texas-holdem-rules) is the deal this lead usually sits on. This page does not reteach the flop, the turn, and the river.`,
    },
    {
      id: "list",
      title: "A list before the chips go in",
      body: `Use this before the lead, not after the pot is lost.

- [ ] Name the player who bet the previous street.
- [ ] Confirm you are first to act against that player.
- [ ] Say the size in dollars before the chips move.
- [ ] Know the call you face if they raise.
- [ ] Do not treat the glossary as a win rate.
- [ ] Do not invent a frequency the entry does not print.
- [ ] Separate this lead from a check then a raise.
- [ ] Keep a loss stop that does not depend on the next card.
- [ ] Skip the hand if the money is rent or a due date.
- [ ] If the session is a chase, call 1-800-GAMBLER.

The National Council on Problem Gambling page opened for this note prints 1-800-MY-RESET, and it says that line is not a crisis service. For a crisis it points to 911 or 988.`,
    },
    {
      id: "stop",
      title: "People who should skip the session",
      body: `Do not play if you are under 18, or under a higher local age. Do not play where the game is illegal. Do not stake money that has a bill attached.

A lead into the previous aggressor can lose the pot on the next card. Nothing on the glossary stores a debt that the deck must repay. Playing to get even is how a small bet becomes a stack.

This page is an editorial note. It is not a statute, and it is not a seat at a table. We did not open a card-room account.

PVPspinArena does not book sports. Cash-out minimum is $20 in BTC, USDC, or ETH. If the hour stops being optional, call 1-800-GAMBLER and open [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "What is the lead this page is describing?",
      a: "A donk bet is a bet made out of flow, into the aggressor from the previous street. The poker.org glossary uses that definition and ties the name to donkey, an old insult for breaking the check-to-the-bettor habit. The same entry says solvers sometimes want the out-of-position player to lead when that range is ahead. It prints no board, no size, and no win rate. The name alone does not make the bet right or wrong.",
    },
    {
      q: "Does the glossary promise that the lead profits?",
      a: "No. The glossary does not print a profit, a loss rate, or a recommended size for a donk bet. It describes the order of action and the history of the insult. A dollar example on this page only prices chips you choose. If the other player folds, you pick up what was already in the middle. If they raise, you face a new price. Neither result is scheduled.",
    },
    {
      q: "Is this the same as checking and then raising?",
      a: "No. A donk bet is a bet when you could have checked to the previous aggressor. A check then a raise happens only after you check and someone else bets. Robert's Rules of Poker version 11 permits that second line in most games, with a limit ace-to-five exception unless players are warned. The glossary entry we opened does not use the check-then-raise rule to define the lead. Keep the two lines separate when you speak at the table.",
    },
    {
      q: "What did we leave unpublished on purpose?",
      a: "Any frequency, any best flop, and any rake attached to a donk bet. The glossary says there are times to lead and does not list them. A casino floor's collection is not on that page. This site's Coinflip fee is 5% of the pot, and that fee is a different game. We did not sit a poker hand and we did not time a cash-out. If a room card is silent, write not published rather than borrowing a number.",
    },
    {
      q: "Who should not use this as a plan?",
      a: "Anyone under 18, anyone under a higher local age, and anyone playing where the game is illegal. Anyone staking rent, savings, or money with a due date should leave the table. Anyone who needs the next card to repay a lost pot is chasing, and the glossary does not store that debt. Call 1-800-GAMBLER if the session is no longer optional. The helpline page we opened also prints 1-800-MY-RESET and says it is not a crisis line.",
    },
    {
      q: "How does a player pot differ from this glossary?",
      a: "The glossary prices nothing. It defines an order of bets between players. A house game prices you against a paytable, and that edge was not on the page we opened. On this site, Coinflip takes 5% of the pot, so two $50 stakes leave the winner $95. You can recompute a settled round on the fairness page when the game publishes a seed. That check does not audit poker.org.",
    },
  ],
  sources: [
    {
      label: "poker.org poker terms glossary",
      url: "https://www.poker.org/poker-terms/",
    },
    {
      label: "Robert's Rules of Poker, version 11",
      url: "https://homepokertourney.org/roberts-rules-of-poker.htm",
    },
    {
      label: "National Council on Problem Gambling helpline",
      url: "https://www.ncpgambling.org/help-treatment/about-the-national-problem-gambling-helpline/",
    },
  ],
  related: [
    "gto-poker-strategy",
    "heads-up-poker-strategy",
    "bluffing-in-poker",
    "cash-game-poker",
    "check-raise-poker",
    "poker-hud",
  ],
  updated: "2026-10-20",
};
