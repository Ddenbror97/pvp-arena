import type { Guide } from "./types";

export const guide: Guide = {
  slug: "poker-tells",
  cluster: "Poker",
  keyword: "poker tells",
  secondary: [
    "live poker tells",
    "online poker tells",
    "betting tells",
    "hiding your tells",
  ],
  title: "Poker Tells: 15 Live and Online Tells That Really Work",
  description:
    "The most reliable poker tells for live and online games, from timing and bet sizing to physical cues, plus how to hide your own tells at the table.",
  h1: "Poker tells: weak evidence you can test, not a mind-reading trick",
  answer:
    "Poker tells are patterns in timing, bet size, speech, and body that sometimes correlate with a strong or weak hand. They are weak evidence. A single sigh or a single snap-call is not proof, and the classic physical tells are the first ones decent players fake. The tells that survive are repeated patterns from the same opponent: how long they take, how their bet size changes, and what they do after a showdown teaches you the pattern. Online, the body disappears and timing plus sizing do almost all the work. Use a tell to break a tie between two reasonable actions. Do not use it to call off a stack you would otherwise fold. Bluffing theory is a different page.",
  facts: [
    "A tell is a hypothesis about one player, not a law of poker.",
    "Timing and bet size travel better than facial expressions.",
    "Players who know the classic tells will perform the opposite.",
    "Online tells are mostly the clock and the bet slider.",
    "One showdown that confirms a pattern is more useful than ten guesses.",
    "Hiding your own timing matters more than spotting theirs.",
  ],
  sections: [
    {
      id: "weak",
      title: "Why most tells are weak evidence",
      body: `Poker tells became a genre because the pictures are fun: sunglasses, shaking hands, a stare. The base rate is the problem. Strong hands and weak hands both tank. Both look nervous. Both try to look strong. If you act on the first unusual gesture, you are fitting a story to noise. The [Poker guides](/guides/topics/poker) pages on strategy will make you more money than a catalogue of faces, and [poker tips](/guides/poker-tips) is the wider habits list. This page is only the signal problem.

Treat a tell like a small piece of evidence that updates a decision you could already justify with the cards and the position. If the cards say fold and the tell says call, fold. If the cards say the call is close and this opponent has shown the same timing three times with a bluff, the tell can tip it. That is the whole legitimate use.

[Bluffing in poker](/guides/bluffing-in-poker) explains when a bet should work as a bluff. A tell does not replace that math. It sometimes tells you whether this opponent is capable of the bluff the math describes.

Worked example 1. You are on the river with a medium pair. The pot odds say a call is slightly losing if the opponent bluffs less than a third of the time. They have snap-shoved twice tonight and shown the nuts both times, and this shove was also a snap. The timing matches the value hands, not a movie stare. You fold. You did not “read their soul.” You used two showdowns.`,
    },
    {
      id: "live-list",
      title: "Live tells that sometimes repeat",
      body: `These are patterns to write down, not reflexes. Any of them can be reversed by a player who has read the same list.

1. Betting faster with strong hands and stalling with bluffs, or the reverse, but stable for that person.
2. A bet size they use only when value-betting, and a different size when they give up or bluff.
3. Glancing at their chip stack before a value bet, as if pricing the raise.
4. Covering hole cards with a hand, the old “protecting a monster” cue, which many players now fake.
5. Speech: a sudden story, or a sudden silence, that differs from their baseline chat.
6. Breathing that changes when the river card hits their draw, then a bet.
7. Looking back at hole cards when a straight or flush completes, because they forgot what they held.
8. Hands that shake while betting a big value hand, which is adrenaline, not always fear. Shaking while bluffing happens too. Do not quote the proverb as science.

None of these works on a stranger for one orbit. They work, a little, on a regular whose showdowns you have watched. If you cannot name the last hand they showed, you do not have a tell. You have a vibe.

| Cue | Sometimes means | Why it fails |
| --- | --- | --- |
| Long tank, then a big bet | A real decision, polarized | Actors tank too |
| Instant call | Strength or a drawing plan | Draws snap-call |
| Staring at you | An attempt to sell | Easy to fake |
| Shaking hands | Adrenaline | Both nuts and bluffs shake |
| Chip glance | Sizing a value bet | Can be habit |`,
    },
    {
      id: "online-list",
      title: "Online tells, where the face is gone",
      body: `9. Snap-checks on a missed flop and longer checks when they are trapping, if the pattern survives showdown.
10. Bet sizing that jumps only on the river, a common bluff or a common thin value, and you will not know which until they show.
11. The same size for every bluff and a rounder size for value, or the opposite. The sameness is the tell.
12. Timing that collapses when they are playing several tables and only slows down in the big pot.
13. Chat that appears only when they are comfortable, which often means a made hand, and chat that vanishes when they are bluffing. Again, reversible.
14. A tank that happens only when they are facing a bet, never when they are the bettor. That player is deciding a call, not designing a movie.
15. Changing the timing after they have been caught. A player who was snapped off may start tanking with the nuts to look weak. Update the file. The old tell died.

Online you also get the absence of a tell. A player who uses one size on a timer is giving you sizing data, not a mood. [Poker for beginners](/guides/poker-for-beginners) covers the streets if those are still fuzzy. Tells sit on top of that structure.

| Online pattern | Keep the note if | Throw it out if |
| --- | --- | --- |
| Repeated river size | Showdowns split by hand strength | It is their only size |
| Snap-bet | The nuts keep coming back fast | They snap every click |
| Silence in chat | They normally talk | They never talk |

Worked example 2. An online regular bets 33 percent on every dry flop and 75 percent on every river, in under three seconds. You have seen the river size with a missed draw twice and with a strong hand once. The size is not a tell yet. The speed is not a tell. You need more showdowns or you play straightforward. Collecting the data is the skill. Guessing on hand four is not.`,
    },
    {
      id: "baseline",
      title: "Build a baseline before you believe anything",
      body: `A tell is a change from a baseline. If you do not know how long this player normally takes to call a flop bet, a ten-second tank means nothing. Watch a full orbit with the intention of doing nothing clever. Note their average snap, their average tank, and the bet sizes they like. Then wait for a showdown. Write one sentence: “Snap river bet was the nuts,” or “Tank-shove was a missed flush.” One sentence is a hypothesis. Three sentences in the same direction are a pattern. One sentence in the opposite direction deletes it.

Do this for opponents you play often. A tourist you will never see again is entertainment, not an edge. The same method catches your own leaks. If your bluffs take longer than your value bets, the table will notice. Time yourself for an hour.

Physical tells in a loud room are mostly worthless. Hoodies, headphones, and a card cap are not morality. They are a way to have fewer moving parts. The moving part that remains is your bet size. Make that the thing you choose on purpose.`,
    },
    {
      id: "hide",
      title: "How to hide your own tells",
      body: `Pick a routine and keep it when you are strong, weak, and indifferent. Look at your cards once. Put a chip on them. Look at the board. Decide. Act in the same motion. Use a similar amount of time for a value bet and a bluff, which usually means slowing the value bet down rather than speeding the bluff up. Speeding up is what makes the bluff obvious.

Do not narrate. “I guess I have to call” is a sentence weak hands love. Silence is not a tell if you are always silent. It is a tell if you are chatty except when you bluff.

Keep bet sizes tied to the plan, not the pulse. If your bluff is always a weird number and your value bet is always a round one, you have published a legend. Choose sizes before the session, the way you choose opening ranges, and let the hand pick from the list.

Online, the routine is the clock. Use a two-to-four-second floor even when the fold is obvious, if you can do it without ruining the game, or accept that your snap-fold gives away nothing of value because the hand is over. Do not snap the nuts and tank the bluff. That one is free money for anyone paying attention.

The goal is not to become unreadable in some mystical way. The goal is to remove the extra information so the opponent has to play the cards.`,
    },
    {
      id: "checklist",
      title: "A checklist before you act on a tell",
      body: `If you cannot check these off, ignore the gesture.

- You have a baseline for this player from earlier hands, not from a movie.
- At least one showdown lines up with the pattern you think you see.
- The card decision is already close. The tell is a tie-break.
- You are not ignoring a bet size that clearly means value.
- You could explain the tell in one sentence without the word “energy.”
- You have a plan for your own timing on the next bluff so you are not the easier mark.

Then act. If the showdown contradicts you, delete the tell in public, at least inside your own notes. Stubbornness about a read is more expensive than the read was ever worth. Poker is still the cards, the position, and the price. Tells are a thin extra column.`,
    },
    {
      id: "ignore",
      title: "When to ignore tells completely",
      body: `Ignore them against someone you just met, and ignore them when you are tilted. Ignore them when the board already says the range is strong. A feeling you will not write down is not a tell.

A pure chance game does not offer this hobby. [Coinflip](/coinflip) has no timing tell that changes the next flip, and no face to study. That is a feature when you want rest from reads. When you return to poker, go back to baselines. Fifteen tells on a list are fifteen hypotheses. The ones that really work are the ones the same opponent repeats after the cards are turned up, and those are usually the clock and the bet size.`,
    },
  ],
  faqs: [
    {
      q: "Do poker tells really work?",
      a: "Sometimes, as a small edge against a specific player who repeats a timing or sizing pattern you have confirmed at showdown. They do not work as a universal face code. Strong hands and bluffs can both tank, stare, or shake. Classic body tells are easy to fake once a player knows you are looking. Use a tell only to break a tie the cards already make close. If the pattern misses, throw it out.",
    },
    {
      q: "What are the most reliable online poker tells?",
      a: "Bet sizing and decision time, in that order, and only against someone you have seen show hands. A size they use for value and a different size they use when they bluff is useful if it repeats. A snap action means little until you know their baseline, because many players play several tables and click everything quickly. Chat is a tell only for someone who usually talks. Trust a repeated bet size more than a story.",
    },
    {
      q: "Should I trust shaking hands or a long stare?",
      a: "Not by themselves. Shaking can be adrenaline from a big hand or anxiety from a bluff. A stare is often a performance. Both are on every list a recreational player has read, so both get acted. If the same player shakes only when they table the nuts, write that down after you see it more than once. Until then, believe the line of betting. Physical cues are the weakest column in live poker and they do not exist online.",
    },
    {
      q: "How do I hide my own tells?",
      a: "Use the same routine every hand. Look at your cards once, check the board, and act with a similar motion and a similar amount of time whether you are betting for value or bluffing. Keep chat steady or stay quiet. Choose bet sizes on purpose so a bluff and a value bet are not different currencies. Online, avoid snapping the nuts and tanking only with air. Your sizes may still be readable. Your clock does not have to be.",
    },
    {
      q: "Can tells replace bluffing strategy?",
      a: "No. Bluffing frequency, board texture, and who can fold are the subject of the bluffing guide. A tell might suggest that this particular opponent is or is not folding today. It does not change the price the pot is offering, and it does not make a bluff profitable against someone who calls everything. Learn the bluff math first. Add a confirmed tell afterward, as a tie-break, not as the reason you moved your chips.",
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
  related: ["poker-tips", "bluffing-in-poker", "poker-for-beginners", "poker-positions"],
  updated: "2026-10-06",
};
