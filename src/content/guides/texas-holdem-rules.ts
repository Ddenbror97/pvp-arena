import type { Guide } from "./types";

export const guide: Guide = {
  slug: "texas-holdem-rules",
  cluster: "Poker",
  howTo: true,
  keyword: "how to play texas holdem",
  secondary: [
    "texas holdem rules",
    "texas hold'em betting",
    "no limit holdem",
    "holdem blinds",
    "holdem showdown",
  ],
  title: "How to Play Texas Holdem: Rules and Streets",
  description:
    "How to play Texas Holdem: hole cards, blinds, preflop to river, betting actions, showdown, and how this differs from PVPspinArena.",
  h1: "How to play Texas Holdem: hole cards, streets and showdown",
  answer:
    "How to play Texas Holdem is the Hold'em rule sheet: two hole cards, blinds, four betting streets, five community cards, and a showdown that uses the best five-card hand. No-limit means you may shove your stack. The room still takes rake. PVPspinArena is not a Hold'em client. It runs Jackpot, Coinflip and Roulette only.",
  facts: [
    "Each player gets two private hole cards; the board gets five community cards.",
    "Betting streets are preflop, flop, turn and river, in that order.",
    "You may use any five cards from your two plus the five; you do not have to use both hole cards.",
    "No-limit lets you bet any legal amount up to your remaining stack.",
    "PVPspinArena does not deal Texas Hold'em. It is not a poker room.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What Texas Hold'em is",
      body: `Texas Hold'em is the default online poker game. If a site says “poker” and does not name a variant, it usually means this. You and the other seats share one board. Your edge, if you have one, is decisions, not a house paytable.

This [poker](/guides/topics/poker) page is the rules, not a solver. It is for adults 18 or over. Read [how to play poker](/guides/how-to-play-poker) if you still need the cluster overview. Then come back here for Hold'em-specific order and legal bets.

PVPspinArena will not give you a dealer button. If you wanted a single hashed pot, open [Coinflip](/coinflip) or [Jackpot](/). Those are different products. Do not map flop texture onto a coin.

### What “Hold'em” does not include

It does not include a dealer qualify rule. It does not include a Pair Plus ladder. It does not include a Jacks-or-Better paytable. Those are casino products that borrowed the word poker. If the felt has an Ante and a Play, you left Hold'em. Come back to this page only when two hole cards and a five-card board are the whole deal.

It also does not include a house edge on the cards. The other seats are the field. The room is paid by rake or a tournament fee. If nobody else sits, there is no game. That is the opposite of a colour wheel that will take your bet at 3 a.m. with no opponent.

A four-hole variant with the same streets is [Omaha poker rules](/guides/omaha-poker-rules).`,
    },
    {
      id: "deal",
      title: "The deal: hole cards and the board",
      body: `The dealer button marks who is “last to act” after the flop. Two seats left of the button post the small blind and big blind. Then each seated player receives two hole cards face down.

### Community cards

- **Flop:** three cards, face up, after the first betting round.
- **Turn:** one card, after the flop betting round.
- **River:** one card, after the turn betting round.

Burn cards exist in live dealing (the dealer discards one unseen card before each street). Online software usually skips the theatre and just produces the next board card. The ranking at showdown does not change.

### Using the board

Your final hand is the best five cards you can make. That can be two hole cards plus three board cards, one hole card plus four board cards, or the five board cards if they already beat anything you can add. “I have to use both hole cards” is a common beginner myth. You do not.

[Poker hand rankings](/guides/poker-hand-rankings) lists what those five cards are worth.`,
    },
    {
      id: "actions-table",
      title: "Legal betting actions",
      body: `Hold'em uses the same action menu on every street. The only thing that changes is who acts first and how large the pot already is.

| Action | When it is legal | What it does |
| --- | --- | --- |
| Fold | Any time a bet faces you | You are out; you cannot win the pot |
| Check | No bet yet on this street | Passes action; you stay in for free |
| Call | A bet or raise faces you | Matches the current amount |
| Bet | No bet yet on this street | Puts in the first chips of the street |
| Raise | A bet already exists | Increases the price to stay |
| All-in | You have chips left | Puts in your remaining stack |

### No-limit versus pot-limit versus limit

No-limit Hold'em: any amount from a minimum raise to your stack. Pot-limit: a raise may not exceed the pot as defined by the room's pot-size rule. Limit: bets come in fixed small-bet and big-bet units. Most “how to play Texas Holdem” searches mean no-limit cash. Confirm the type on the table sticker before you click sit.

### Minimum raise

If the big blind is $2 and someone opens to $6, a raise must be at least $10 (the $4 increment, added again). All-in for less than a full raise may not reopen action for players who already acted; rooms publish that rule. Read it once.`,
    },
    {
      id: "streets-order",
      title: "Street-by-street order of play",
      body: `### Preflop

Action begins with the seat left of the big blind (under the gun at a full table). Each player folds, calls the big blind, or raises. If the table folds to the blinds, the small blind can complete or raise, and the big blind can check a limp or raise.

### Flop

The dealer puts out three cards. Action begins with the first remaining player left of the button. That is often a blind if they called. Checking around is legal. So is a bet that closes the street if everyone else folds or calls.

### Turn and river

One card each. Same action order. Sizes usually grow. This is where stacks go in. If two or more players remain after the river betting, they table their hole cards. The dealer or the client compares five-card hands.

### Side pots

If A is all-in for $40 and B and C put in $100 each, A can only win the main pot that includes $40 from each. B and C contest a $120 side pot without A. Rankings do not change. Eligibility does. You cannot win money you did not have a claim on.

The [poker for beginners](/guides/poker-for-beginners) guide walks a first session without this much bookkeeping.

### Disconnects and all-in runouts

Online rooms publish what happens if you drop mid-hand. Often your hand is in timeout, then folded if you have chips left to act, or run out if you are already all-in. Live, a missing player can be blinded off. None of that changes rankings. It changes whether you still have a claim. Read the disconnect rule once so you do not accuse the client of theft when it folded a hand you were not there to play.

If two players are all-in before the river, the remaining cards usually come out even if one of you is in the bathroom. You cannot “refuse the runout”. You already put the money in. The board will finish. That is the rule, not a courtesy.`,
    },
    {
      id: "example",
      title: "Worked example: button versus big blind",
      body: `This is the only numeric example on this page. Stakes $1/$2, effective stacks $200.

You are on the button with 9♥ 8♥. The table folds to you. You raise to $6. The small blind folds. The big blind calls $4 more. Pot = $13.

Flop: 7♣ 6♦ 2♠. Big blind checks. You bet $8. Big blind calls. Pot = $29.

Turn: 2♣. Big blind checks. You check. Pot still $29.

River: K♠. Big blind bets $20. You fold.

What the rules required:

1. You could raise any legal amount preflop; $6 was a size, not a law.
2. The big blind could check the flop because you had not bet yet when action reached them — they acted first and checked.
3. Checking the turn was legal and ended that street with no extra money.
4. Facing $20 on the river, you could call, raise or fold. Folding ended your claim. You do not show cards when you fold (except in rare live misclick or all-in runout rules).

Nothing in that sequence was GTO. It was legal order. [Texas holdem strategy](/guides/texas-holdem-strategy) is the next document if you want reasons, not permissions.`,
    },
    {
      id: "showdown-rake",
      title: "Showdown, rake and table stickers",
      body: `At showdown, the last aggressor usually tables first in live rooms; online clients just reveal remaining hands. The best five-card combination wins. Kickers break ties when the category matches. Identical five-card hands split the pot.

### Rake is part of the rules you pay

Cash pots often pay a percentage to the room up to a cap. Some clubs charge time. Tournaments take a fee from the buy-in. None of that is optional flavour. It is how the product is priced. [Crypto poker](/guides/crypto-poker) walks rake in a crypto cashier. [House edge](/guides/house-edge) is the against-the-house version of “the game keeps a slice”.

### What the sticker must say

Before you sit, read: stakes, no-limit or not, rake or time, kill or jackpot drop if any, and whether the buy-in is short or full. A $2/$5 table with a $100 max is a different game from $2/$5 with a $1,000 max. The rules of cards are the same. The stack-depth rules of decisions are not.

Kill pots and jackpot drops, when present, take extra chips from qualifying pots. They are still rules you pay. A “bad beat jackpot” drop is not free insurance. It is another line on the sticker. If you cannot find the drop, ask before you sit, the same way you ask the rake cap.

### Straddles and extras

Some cash tables allow a straddle (a voluntary third blind, usually from under the gun). That changes who acts last preflop. It is optional house procedure, not a secret street. If you do not see a straddle button, ignore this paragraph.

### Button versus blind, restated

New players mix who posts and who acts last. The button is last after the flop. The small blind is left of the button and posts the smaller forced bet. The big blind is left of the small blind and posts the larger one. Preflop, the big blind is last to act if nobody raises. After the flop, the button is last if they are still in. Those two “last to act” seats are different. Mixing them is how you open from the wrong seat in your head and then wonder why the software will not let you check.

Write it on a card if you have to: **button = last after flop; blinds = forced money; UTG = first preflop at a full table.** That sentence is most of the seating rules.`,
    },
    {
      id: "summary",
      title: "Summary: Hold'em is an order of streets, not a paytable",
      body: `How to play Texas Holdem: two hole cards, blinds, preflop action, three flop cards, turn, river, then showdown or an earlier fold. No-limit sizes sit on top of that order. Rake sits on top of the pot.

PVPspinArena does not run this loop. Verify a hashed PvP result on [fairness](/fairness) if you play here; that check is for Jackpot, Coinflip and Roulette, not for a flop. If Hold'em or any other game is already costing more than a planned budget, use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). Adults 18+ only.`,
    },
  ],
  faqs: [
    {
      q: "How many cards do you get in Texas Hold'em?",
      a: "Two private hole cards, plus five community cards on the board. Your hand is the best five-card mix of those seven.",
    },
    {
      q: "Who acts first in Texas Hold'em?",
      a: "Preflop, the seat left of the big blind. After the flop, the first remaining player left of the button.",
    },
    {
      q: "Do I have to use both hole cards?",
      a: "No. You may use two, one or none, whichever makes the best five-card hand.",
    },
    {
      q: "What is the difference between no-limit and limit Hold'em?",
      a: "No-limit lets you bet any legal amount up to your stack. Limit uses fixed bet sizes on each street. Most online cash is no-limit.",
    },
    {
      q: "Does PVPspinArena have Texas Hold'em tables?",
      a: "No. It is not a poker room. It offers Jackpot, Coinflip and Roulette only.",
    },
    {
      q: "What happens if two players have the same hand?",
      a: "They split the pot. Kickers are part of the five-card hand; if the five cards match in rank, it is a true tie.",
    },
  ],
  sources: [
    { label: "Wikipedia: Texas hold 'em", url: "https://en.wikipedia.org/wiki/Texas_hold_%27em" },
    {
      label: "PokerNews: Hold'em rules",
      url: "https://www.pokernews.com/poker-rules/texas-holdem.htm",
    },
    { label: "UK Gambling Commission — Poker", url: "https://www.gamblingcommission.gov.uk/" },
  ],
  related: [
    "how-to-play-poker",
    "poker-hand-rankings",
    "texas-holdem-strategy",
    "poker-for-beginners",
    "crypto-poker",
  ],
  updated: "2026-09-26",
};
