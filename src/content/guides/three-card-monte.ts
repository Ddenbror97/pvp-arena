import type { Guide } from "./types";

export const guide: Guide = {
  slug: "three-card-monte",
  cluster: "Games of chance",
  keyword: "three card monte",
  secondary: ["3 card monte", "find the lady", "three card monte scam", "three card trick"],
  title: "Three Card Monte: How the Con Works and Why You Lose",
  description:
    "Three card monte explained: the throw, the shills, the bent-corner setup and the lookouts, why the game cannot be beaten, and the online versions to avoid.",
  h1: "Three card monte: how the street con works and why you cannot win",
  answer:
    "Three card monte, also called Find the Lady, is a street con disguised as a betting game. A dealer shows three cards, one a queen, mixes them face down and invites bets on the queen's position. Sleight of hand lets the dealer control where the queen ends up, and a team of shills, lookouts and fake winners decides who gets to bet. You cannot win it.",
  facts: [
    "Three card monte is a confidence trick, not a gambling game: the operator decides the outcome.",
    "The key sleight is the throw, where the dealer releases a different card than the one you think you saw fall.",
    "Most of the crew are shills: fake players who win to draw in bettors or block bets that would win.",
    "Even a completely honest version paying even money would cost bettors a third of every stake on average.",
    "The same structure of fake winners and a rigged result appears in fake online casinos and prediction scams.",
  ],
  sections: [
    {
      id: "what",
      title: "What three card monte is",
      body: `Three card monte is played on a cardboard box, a folding table or a newspaper on the pavement. The dealer (in the trade, the "operator" or "tosser") holds three bent playing cards: usually two black cards and a red queen. He shows the queen, drops the three cards face down, slides them around, and challenges the crowd to point to the queen. Correct guesses supposedly pay even money or better.

It looks like a game of attention. It is not. It is the card version of the much older shell game (also called thimblerig), where a pea is hidden under one of three shells. In both, the operator controls the result and the "game" is theatre built to take money from passers-by. Names change by country: Find the Lady, Chase the Ace and the three-card trick describe the same con.

Monte has a long history in the United States. Nineteenth-century accounts describe dealers working riverboats, railway cars and boomtowns, and Canada Bill Jones is the best-known dealer of that era, described in many gambling histories as a master of the throw. Much of what is told about him is anecdote, but his reputation shows how established the con was more than 150 years ago.

This guide sits in the [Games of chance topic](/guides/topics/games-of-chance) because it looks like one. It is really a fraud, which is also why it belongs next to [fake casino sites](/guides/fake-casino-sites) in any conversation about scams.`,
    },
    {
      id: "sleight",
      title: "The sleight of hand: the throw and the switch",
      body: `The core technique is simple to describe and hard to do well.

### The throw

The dealer holds two cards in one hand, one above the other, bent slightly lengthwise so they are easy to pick up. The mark sees the bottom card is the queen. Normally, the bottom card is released first. In the throw, the dealer releases the **top** card instead, with a motion that looks identical. Your eye follows what you believe is the queen to its position. It is a black card. The queen falls later, somewhere else.

A good operator can do the honest drop and the throw with the same rhythm, so a watcher cannot tell which one was used. He does honest drops while shills are betting, and the throw when a real player is.

### Other moves

- **The switch or palm:** the queen can be removed from play entirely, so no position is correct.
- **The pick-up:** as the dealer turns over a card, he can exchange it for another held in the same hand.
- **Slow mixing:** deliberately clumsy slides make the game look easy. The speed is a performance, not the hard part.

### Why you cannot out-watch it

Watching harder does not help. The deception happens at the moment of release, in the dealer's grip, not in the sliding around afterwards. Tracking the cards perfectly still leaves you tracking the wrong card.`,
    },
    {
      id: "crew",
      title: "The crew: shills, lookouts and the bent corner",
      body: `A monte game is a team operation. A solo dealer on a quiet corner is rare. A typical crew:

| Role | What they do |
| --- | --- |
| Dealer | Runs the cards and the patter |
| Shills | Pose as passers-by; win big to show it is easy, then lose to bait |
| Lookout | Watches for police and signals the crew to pack up |
| Muscle or blocker | Crowds the mark, stops arguments, sometimes pickpockets |

### How shills work you

1. A shill wins twice in a row in front of you. The game looks beatable.
2. A shill loses and lets you see that he "should have" picked the other card. You now think you are smarter than the players.
3. When you want to bet, a shill can jump in with a larger bet on a different card. The dealer takes the bigger bet, and you never get to play the hand you would have won.

That last move matters. If a real player ever does manage to follow the queen honestly, the crew makes sure that bet is not accepted.

### The bent-corner trick

A classic setup: while the dealer looks away, a shill secretly bends a corner of the queen and winks at you. Now the queen is marked, the game seems free money, and you bet heavily. During the next mix the dealer straightens the queen's corner and bends a corner on a black card. You bet on the bent card. It is not the queen.

### A typical sequence

Here is how a single mark is usually worked, compressed into a few minutes:

1. You stop to watch. A shill bets $20 and wins $20. Another bets $50 and loses, pointing at the card you would have picked.
2. The dealer lets you "just point" for free. You are right twice. No money moves, so the dealer does honest drops.
3. You bet $20 and win. Some crews let a mark win once, because a small loss now buys a large bet later.
4. The dealer raises the minimum, or a shill urges you to "bet big while he is sloppy". You bet $100 or $200.
5. The throw happens on that bet. You lose. If you try to bet again to win it back, a shill outbids you or the minimum goes up again.

The profit is made on step 4. Everything before it is marketing.

### Getting away

When a lookout calls, the box folds and everyone scatters. Your money leaves with them, and the "winners" were colleagues.`,
    },
    {
      id: "maths",
      title: "The maths: why even a fair version loses",
      body: `Suppose the game were honest: three face-down cards, one queen, random placement, and you pick one. Your chance of finding the queen is 1 in 3. If the dealer pays even money (you win $20 on a $20 bet), the expected value per bet is:

EV = (1/3 × +$20) + (2/3 × −$20) = −$6.67

That is a 33.3% house edge on every bet, roughly five times the 7.88% Purple or Silver edge on a Purple or Silver bet at a 33-slot roulette wheel, and more than twelve times European roulette's 2.70%.

| Payout on a correct pick | Honest win chance | Expected result per $20 bet |
| --- | --- | --- |
| 1 to 1 (even money) | 1/3 | −$6.67 |
| 2 to 1 (fair odds) | 1/3 | $0 |
| 1 to 1 in practice | 0 when the dealer throws | −$20 |

The real game is worse than the first row, because the dealer controls the drop. When a stranger bets, the win chance is effectively zero. A fair payout would be 2 to 1; nobody running monte offers it, and it would not matter if they did.

The shill wins you watched are not data. They are part of the show. For more on why a string of visible wins proves nothing, see [illusion of control](/guides/illusion-of-control) and the [gambler's fallacy](/guides/gamblers-fallacy).`,
    },
    {
      id: "spot",
      title: "How to spot a monte game and what to do",
      body: `Warning signs are consistent across cities:

- a crowd that forms and breaks up very quickly around a box or small table;
- people who seem to win large amounts of cash with little effort;
- someone offering you a "sure thing" tip or showing you a marked card;
- a person glancing up and down the street constantly;
- cards that are visibly bent lengthwise.

### What to do

1. Do not bet. There is no amount or technique that makes it a fair game.
2. Watch your wallet and phone. Crowds around monte games are a pickpocket's workplace.
3. Walk away. Arguing with the crew is not worth the risk.
4. If you lost money, report it to local police. Monte is illegal in many places as fraud or illegal gambling, although recovering cash is unlikely.

### Why it keeps working

Monte leans on ordinary mental shortcuts. Seeing other people win makes a game feel beatable (social proof). Free practice picks feel like evidence of skill. A "secret" bent corner makes you feel like an insider, which lowers suspicion at exactly the moment the dealer needs it lowered. Losing then triggers the urge to win it back, and the crew is ready to take that second bet too.

People who lose to monte are not foolish. The con is designed by professionals to exploit normal trust and normal curiosity, and it has worked on sharp people for more than a century.`,
    },
    {
      id: "online",
      title: "The online versions of the same con",
      body: `The structure of monte transfers online almost unchanged. What matters is the pattern: fake winners, a result the operator controls, and pressure to act quickly.

| Street monte | Online equivalent |
| --- | --- |
| Shills winning cash | Fake win screenshots, paid "testimonials", bots in chat |
| Bent-corner "tip" | "Signals" groups and predictor apps promising the next result |
| Dealer controls the drop | A site whose outcomes are generated privately and cannot be checked |
| Lookout, then vanish | A site that disappears with deposits or blocks withdrawals |

The [fake casino sites](/guides/fake-casino-sites) guide covers clone sites and wallet drainers in detail, and [are online casinos rigged](/guides/are-online-casinos-rigged) covers how to tell an honest random game from a controlled one. The single best defence is the same as on the street: if someone other than chance decides the result, do not play.

Gambling on anything, honest or not, is for adults (18+ or your local legal age). The [responsible gambling](/responsible-gambling) page lists tools and help lines.`,
    },
    {
      id: "pvp",
      title: "Why a checkable result is the opposite of monte",
      body: `Monte works because the dealer knows the answer and you cannot check it. A provably fair round is designed to remove exactly that advantage. On PVPspinArena, results come from committed seeds using a commit-reveal scheme: a hash of the secret seed is published before the round, and the seed is revealed after settlement, so anyone can recompute the result on the [fairness](/fairness) page and confirm nothing changed mid-round.

That does not make gambling profitable. [Roulette](/roulette) on PVPspinArena's 33-slot wheel returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee on average, about a 7.88% house edge on Purple or Silver after the 5% win fee, and [Coinflip](/coinflip) is a plain 50/50 between two players. The point is narrower: the odds are published, the edge is stated, and the result can be verified. Monte offers the reverse on all three counts. The [commit-reveal scheme](/guides/commit-reveal-scheme) guide explains the cryptography in plain terms.

In the same cluster, see also [carnival games](/guides/carnival-games), [claw machine tricks](/guides/claw-machine-tricks), and [plinko board](/guides/plinko-board).

See also [marked cards](/guides/marked-cards).`,
    },
  ],
  faqs: [
    {
      q: "Can you actually win at three card monte?",
      a: "Not against a real crew. The dealer controls which card falls where, and shills block any bet that would win. The only people who win are members of the team.",
    },
    {
      q: "How does the three card monte trick work?",
      a: "The dealer uses a throw: holding two cards in one hand, he releases the top card when you expect the bottom one, so you follow the wrong card. Shills and fake winners make the game look beatable.",
    },
    {
      q: "Is three card monte illegal?",
      a: "In many places yes, as fraud, cheating or illegal gambling, and street crews are regularly arrested. Laws vary by country and city.",
    },
    {
      q: "What is the bent corner trick in three card monte?",
      a: "A shill secretly bends the queen's corner and tips you off. The dealer straightens it during the mix and bends a different card, so you bet confidently on the wrong one.",
    },
    {
      q: "What are the odds in an honest three card game?",
      a: "One in three. At even money that is an expected loss of a third of each bet, a 33.3% edge. Real monte is worse, because the result is controlled.",
    },
  ],
  sources: [
    { label: "Wikipedia: Three-card Monte", url: "https://en.wikipedia.org/wiki/Three-card_Monte" },
    { label: "Wikipedia: Shell game", url: "https://en.wikipedia.org/wiki/Shell_game" },
    {
      label: "Wikipedia: Canada Bill Jones",
      url: "https://en.wikipedia.org/wiki/Canada_Bill_Jones",
    },
  ],
  related: [
    "fake-casino-sites",
    "carnival-games",
    "claw-machine-tricks",
    "penny-pitching",
    "illusion-of-control",
    "plinko-board",
    "marked-cards",
  ],
  updated: "2026-09-27",
};
