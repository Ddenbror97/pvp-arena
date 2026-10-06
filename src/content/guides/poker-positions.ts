import type { Guide } from "./types";

export const guide: Guide = {
  slug: "poker-positions",
  cluster: "Poker",
  keyword: "poker positions",
  secondary: [
    "UTG poker",
    "button poker",
    "hijack cutoff blinds",
    "opening ranges by seat",
  ],
  title: "Poker Positions Explained: From UTG to the Button",
  description:
    "Poker positions explained with a table map: UTG, hijack, cutoff, button and blinds, why position wins money and opening ranges for each seat.",
  h1: "Poker positions explained from UTG to the button",
  answer:
    "Poker positions are the seats at the table, and the seat decides who acts last. Under the gun is first to act before the flop in a full game. The hijack and cutoff sit to the right of the button. The button acts last on every postflop street and is the most profitable seat in a typical cash game. The small blind and big blind post forced bets and then act first after the flop. Later position wins money because you see what opponents do before you choose. Opening ranges get wider as you move toward the button. This page is the seat map. Continuation-bet strategy lives on the Hold’em strategy guide, not here.",
  facts: [
    "Position is who has yet to act, not a personality type.",
    "The button acts last on the flop, turn, and river.",
    "Under the gun acts first preflop and should open the tightest range.",
    "Blinds post chips before they see cards and act first after the flop.",
    "Six-max and nine-max use the same names, with fewer early seats in six-max.",
    "Classroom opening percentages are illustrations, not a solver printout.",
  ],
  sections: [
    {
      id: "map",
      title: "The seat map, clockwise from the blinds",
      body: `Poker positions are named from the dealer button, which moves one seat to the left after every hand. Cards are dealt starting left of the button. The first player to act preflop in a full ring is under the gun, usually shortened to UTG. Then come the early and middle seats, the hijack, the cutoff, and the button. The small blind and big blind have already posted chips, so preflop action starts to their left and closes on them.

After the flop, order changes. The first remaining player left of the button acts first. The button, if still in the hand, acts last. That swap is the whole reason the button is valuable. You paid nothing extra to sit there, and you speak last on three streets.

The [Poker guides](/guides/topics/poker) hub collects the rules pages around this one. If the words flop and button are still new, start with [poker for beginners](/guides/poker-for-beginners) and come back. This guide assumes you know a hand has hole cards and community cards.

| Seat | Acts preflop | Acts after the flop | How wide to open |
| --- | --- | --- | --- |
| UTG | First | Early | Tightest |
| Hijack | Middle | Middle | Wider than UTG |
| Cutoff | Late | Late | Wide |
| Button | Last of the unpaid seats | Last | Widest |
| Small blind | After the button | First, if checked to | Careful, you act first later |
| Big blind | Last preflop, already invested | First, if checked to | Defend, do not “open” |`,
    },
    {
      id: "ring-sizes",
      title: "Nine-max and six-max use the same ideas",
      body: `A nine-handed table has more early seats: UTG, UTG+1, under the gun plus two or middle position, then the lojack, hijack, cutoff, button, and blinds. A six-handed table deletes the earliest seats. People still say UTG for the first to act, even though that seat is only three away from the button. The hijack in six-max is two off the button. The cutoff is one off the button. Names are local dialect. Count the players left to act. That count is the position.

Shorter tables mean you are in late position more often, so ranges that were tight in a full ring look passive in six-max. Stealing the blinds is a larger share of the profit because the blinds come around faster. None of that requires a new theory. It requires counting seats.

Tournament antes change the price of folding, not the order of speech. You still want to act last. You still open tighter when many players can wake up with a hand behind you.

Worked example 1. Nine players are dealt in. You are UTG. Eight players remain behind you, including the blinds. You look at ace-jack offsuit and fold. The same two cards on the button, with only the blinds left, are a standard open at most low-stakes tables. The cards did not improve. The number of people who can still attack you went from eight to two.`,
    },
    {
      id: "why-last",
      title: "Why acting last wins money",
      body: `Acting last is information. If three people check the flop, your bet represents something different than a bet into two callers who already showed interest. If someone bets big, you can fold a medium hand that would have been a mess from out of position. You control the pot more often, because you can check behind when the board is dangerous and bet when it is not.

Out of position, you declare first. You bet, they raise, and now you are guessing. You check, they bet, and you are calling without knowing if a raise was available as a plan. [Texas Hold’em strategy](/guides/texas-holdem-strategy) goes into bet sizing and continuation bets. The street order those bets sit on is [Texas Hold’em rules](/guides/texas-holdem-rules). This page stops at the seat. Do not turn “position is good” into a rule that you continuation-bet every flop from the button. The strategy guide has that decision.

Position also realizes equity. A drawing hand gets to see what the price is before it calls. The same draw from the small blind has to act into the dark. Over thousands of hands the seat, not the rabbit’s foot, is what shows up in the results.

There is a catch. The button is not a licence to call every raise. Late position widens the hands you open and the hands you defend. It does not cancel domination, kickers, or rake. A bad ace is still a bad ace when a tight UTG player raised.`,
    },
    {
      id: "ranges",
      title: "Opening ranges by seat, as a classroom sketch",
      body: `These percentages are teaching sketches for a 100-big-blind no-limit cash game with a normal rake, when everyone folds to you. They are not a solver output and not a PVPspinArena statistic. Real ranges move with rake, stack depth, and who is in the blinds.

| Seat, six-max, first in | Rough hands to open | Why |
| --- | --- | --- |
| UTG | About 15 percent | Many players left |
| Hijack | About 20 percent | Still punished by late seats |
| Cutoff | About 27 percent | Button and blinds only |
| Button | About 40 to 50 percent | You act last later |
| Small blind | Wide, but awkward | You will be out of position |
| Big blind | No open; you already posted | Defend against steals selectively |

In a nine-handed game, slide the earliest seats tighter, closer to 10 or 12 percent under the gun, and let the cutoff and button stay wide. Pairs, suited aces, and broadways do the early work. Suited connectors and weaker aces move in as the table shortens behind you.

[Poker for beginners](/guides/poker-for-beginners) shows what those hand families look like if the abbreviations are new. You do not need all of them memorized to use the seat map. You need the direction: tighter early, wider late, and never a random mash of the button just because the seat is good.`,
    },
    {
      id: "blinds",
      title: "Blinds are position plus a tax",
      body: `The big blind is the best preflop price and the worst postflop seat. You already have a chip in the middle, so you defend more hands than UTG would open. Then the flop comes and you speak first. That is why blindly “defending your big blind with anything” is a leak. You are getting a discount on a hand you will play badly.

The small blind is worse. You have a smaller discount, you are out of position against the big blind if you call, and a raise from the button has you squeezed. Many modern games raise or fold from the small blind rather than call, because calling builds a pot you will navigate first on every later street. That is a strategy choice the Hold’em strategy page can carry. The position fact is enough here: the small blind acts first later.

When you are in the big blind and the button opens, your calling range is wider than your UTG opening range and still finite. Fold the junk. Call or raise the hands that play well. Do not pay the button’s steal with a hand that cannot continue when they bet the flop.

Worked example 2. The button opens to 2.5 big blinds. You are in the small blind with king-seven offsuit. You are getting a price, and you will act first on the flop, turn, and river against a wide but stronger range. Folding feels timid and is usually correct. King-seven suited might be a mix in some games. Offsuit, out of position, it is a fold you should be happy to have made.`,
    },
    {
      id: "checklist",
      title: "A checklist before you open the pot",
      body: `Run this before the raise, not after you hate the flop.

- Count how many players are still to act, including the blinds.
- Name your seat out loud if you are new: UTG, hijack, cutoff, button, or blind.
- Open tighter when the count is high, wider when you are cutoff or button.
- If you are in a blind, remember you will act first after the flop.
- If a tight early player already raised, your “button range” does not apply. You are facing a raise.
- Skip the hand when you cannot name a reason that uses the seat, not a feeling.

Position does not replace hand reading. It prices hand reading. A coin-flip game has no seat advantage of this kind: both players commit and the outcome is the flip. [Coinflip](/coinflip) is that simpler contest. Poker pays the player who speaks last, which is why the button is a strategy problem and a coin is not.`,
    },
    {
      id: "mistakes",
      title: "Mistakes that ignore the seat",
      body: `The expensive habit is playing a UTG range from the button and a button range from UTG. The first one is too tight and slowly bleeds the blind money you were supposed to pick up. The second one is too loose and pays off the players who waited. New players often do the second because late-position advice is more fun to remember.

Another mistake is freezing when the button is two seats away and calling it “middle position” without counting. Hijack and cutoff are not the same seat. The cutoff can be three-bet by the button. The button cannot be three-bet by a cutoff who already folded. That one seat is a different game.

Limping behind limpers from early position, or open-limping UTG, gives away the information advantage you do not even have yet. You act early, you show weakness, and you build a family pot. Raising a tight range or folding is cleaner. The percentages in the table are a sketch of that raise-or-fold idea.

If you want the math of calling a bet once the pot exists, use pot odds on the pot-odds guide after this map feels automatic. Position tells you whether you want the pot. Pot odds tell you whether the price is right. They are teammates. They are not the same sentence.`,
    },
  ],
  faqs: [
    {
      q: "What are the poker positions in order?",
      a: "Preflop, action starts under the gun and moves through the hijack, the cutoff, and the button, then the blinds. After the flop, the first remaining player left of the button acts first, and the button acts last. Six-max drops the earliest full-ring seats. Count players left to act. The nickname matters less than that count.",
    },
    {
      q: "Why is the button the best poker position?",
      a: "The button acts last on the flop, turn, and river. You see checks and bets before you choose, so you can take free cards, bet for value, or give up with more information. You also open the widest range because only the blinds remain when everyone else folds. The seat is not magic. A dominated hand still loses, and a tight player’s early raise still deserves respect. Position is an edge you can waste.",
    },
    {
      q: "How should opening ranges change by seat?",
      a: "Open the tightest range under the gun and widen as you approach the button. A classroom sketch for six-max cash is about 15 percent under the gun, about 20 percent in the hijack, about 27 percent in the cutoff, and roughly 40 to 50 percent on the button. Those are illustrations for a 100-big-blind game, not a solver chart. Antes, rake, and stack depth move the numbers. The direction does not move: tighter early, wider late.",
    },
    {
      q: "Do the blinds count as late position?",
      a: "Only before the flop, and only in a limited way. The big blind acts last preflop and already has money in, so defending is cheaper than opening from UTG. After the flop both blinds act first, which is early position for the rest of the hand. The small blind is especially awkward because the discount is small and the postflop seat is bad. Do not call a button steal with junk just because you posted.",
    },
    {
      q: "Is position the same thing as continuation-bet strategy?",
      a: "No. Position is the order of action. A continuation bet is a postflop betting choice, and that choice depends on position plus the board and the ranges. This page stops at the seat map and the reason acting last helps. Bet-sizing plans belong on the Texas Hold’em strategy guide. Use position to decide whether you are in a good seat to apply those plans, not as a substitute for them.",
    },
  ],
  sources: [
    {
      label: "World Series of Poker",
      url: "https://www.wsop.com/",
    },
    {
      label: "Pagat — public card-game rules",
      url: "https://www.pagat.com/",
    },
  ],
  related: ["poker-for-beginners", "texas-holdem-strategy", "texas-holdem-rules", "poker-pot-odds"],
  updated: "2026-10-06",
};
