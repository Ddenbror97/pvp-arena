import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bourre-card-game",
  cluster: "Games of chance",
  keyword: "bourre card game",
  secondary: ["bourré rules", "how to play bourre", "bourre pot rules", "cajun card game bourre"],
  title: "Bourre Card Game: Rules, Pot Mechanics and Strategy",
  description:
    "Bourre card game rules: the deal, trump, the draw, forced play and why a bourréd player matches the pot, plus trump odds and when to stay or pass.",
  h1: "Bourré card game: rules, the growing pot and strategy",
  answer:
    "The bourre card game (Bourré) is a Cajun trick-taking game for two to seven players. Everyone antes, gets five cards, and decides whether to play or fold after seeing trump. Players who stay can draw replacements, then play five tricks. Whoever takes the most tricks wins the pot, and anyone who stays and takes none is bourréd and must match the pot.",
  facts: [
    "Bourré is most closely associated with south Louisiana and Cajun card culture, and descends from older French trick-taking games.",
    "Five cards each, five tricks per hand; the dealer's last card is turned face up to set trump.",
    "Play is forced: follow suit if you can, trump if you cannot, and beat the card led when able.",
    "A player who stays in and wins zero tricks is bourréd and pays an amount equal to the pot into the next pot.",
    "In a 5-card hand you hold two or more trumps only about 37% of the time.",
  ],
  sections: [
    {
      id: "what",
      title: "What the bourre card game is",
      body: `Bourré (usually pronounced "boo-RAY") is a short trick-taking game played with a standard 52-card deck. It is strongly tied to south Louisiana, where it is a fixture of family gatherings and small-stakes games, and it grew out of older French and Spanish trick-taking games with similar names. Rules vary by town and even by kitchen table, so this guide gives the widely shared core and flags the common house rules.

The shape of the game is unusual for a trick-taker. Most trick games, like [Spades](/guides/how-to-play-spades) or [Euchre](/guides/how-to-play-euchre), are partnership games scored in points over many hands. Bourré is every player for themselves, and each hand is settled in cash from a pot. The famous twist is the penalty: stay in and fail to take a trick, and you pay the whole pot again. That rule is why pots can grow fast and why folding is often the correct play.

Bourré lives in the [Games of chance topic](/guides/topics/games-of-chance) with other card games that are commonly played for small stakes.`,
    },
    {
      id: "rules",
      title: "Bourré rules step by step",
      body: `### Players and deck

Two to seven players use one 52-card deck, ranked ace high down to 2. Seven is the practical maximum because each player needs five cards plus enough left in the stock for the draw.

### 1. Ante

Every player puts the agreed ante into the pot. If the previous hand's pot carried over, many groups only require antes from players who were not already in, or skip antes entirely until the pot is won. Decide which before the game.

### 2. Deal and trump

The dealer gives each player five cards, one at a time. The dealer's own fifth card is dealt face up; its suit is trump for the hand, and the dealer keeps it.

### 3. Play or pass

Starting left of the dealer, each player says whether they will play or pass. Passing costs nothing beyond your ante. Playing commits you to the hand and to the bourré penalty if you take no tricks. In many groups, if everyone passes to the dealer, the dealer takes the pot or must play; house rules differ.

### 4. The draw

Players who stayed may discard up to five cards and draw replacements from the stock, in order starting left of the dealer. The dealer draws last and may discard the face-up trump card like any other.

### 5. Tricks

The player left of the dealer leads (among those still in). The core playing rules:

1. You must follow the suit led if you can.
2. If you cannot follow suit, you must play a trump if you have one.
3. You must try to win the trick: play a higher card of the suit led, or a higher trump than any already played, when you can.

Highest trump wins the trick; otherwise the highest card of the suit led. The winner of each trick leads the next.

### Common extra rules

- If you hold the ace of trump, you must lead it at your first chance.
- If you win a trick and hold a trump, you must lead trump.
- A player holding a hand certain to take tricks (a "cinch") must not slow-play it to trap others.

These vary, so write them down before money goes in.`,
    },
    {
      id: "pot",
      title: "Pot mechanics: winning, ties and getting bourréd",
      body: `### Winning the pot

The player who takes the most of the five tricks wins the pot. With several players in, three tricks usually wins, and sometimes two is enough.

### Ties

If two players tie for most tricks (for example 2, 2, 1), nobody wins. The pot carries over to the next hand. Some groups let only the tied players contest the next pot.

### Bourré

Any player who stayed in and took zero tricks is bourréd and must put in an amount equal to the pot they failed to contest. That money forms the next pot.

### Worked example

Six players ante $1, so the pot is $6. Four players stay. Tricks fall 3, 2, 0, 0.

- The player with 3 tricks takes the $6.
- The two players with no tricks each owe $6 to the next pot.
- The next hand starts at $12 before any antes.

Now suppose in that $12 hand two players tie at two tricks and one player is bourréd again. Nobody wins the $12, and the bourréd player adds $12. The pot is now $24, then $48 on another bad hand. Doubling happens after only a few unlucky hands.

That is why serious home games cap the pot or the bourré payment ("pot limit $50" or similar). Without a cap, a $1 ante game can produce a three-figure hand by midnight.`,
    },
    {
      id: "odds",
      title: "Trump odds and how often hands win",
      body: `A 5-card hand from 52 cards, with 13 trumps, has these trump counts (ignoring the dealer's exposed card, which barely changes the numbers):

| Trumps in hand | Probability |
| --- | --- |
| 0 | 22.2% |
| 1 | 41.1% |
| 2 | 27.4% |
| 3 or more | 9.3% |

These come from the hypergeometric formula. For zero trumps: C(39,5) / C(52,5) = 575,757 / 2,598,960 ≈ 22.2%. For exactly one: 13 × C(39,4) / C(52,5) = 13 × 82,251 / 2,598,960 ≈ 41.1%. For exactly two: C(13,2) × C(39,3) / C(52,5) = 78 × 9,139 / 2,598,960 ≈ 27.4%. That leaves about 9.3% for three or more.

### What that means

- Roughly 63% of hands have one trump or none. A single low trump does not guarantee a trick, because anyone void in the suit led may overtrump you.
- Only about 1 hand in 11 starts with three trumps. Those are the hands that most often take three tricks.
- The draw helps, but not as much as players hope. Holding one trump, you know two trumps (yours and the dealer's upcard), so 11 of the 46 unseen cards are trumps. Replacing three cards adds about 3 × 11/46 ≈ 0.7 trumps on average, and fewer once opponents have drawn ahead of you.

Take one trick and you avoid the bourré penalty. That is the number to think about before you stay, not whether you can win the pot outright. For the general way to price a decision like this, see [expected value](/guides/expected-value-gambling).`,
    },
    {
      id: "strategy",
      title: "Bourré strategy: when to stay and how to play",
      body: `### Stay or pass

A simple, defensible starting rule:

| Hand | Usual decision |
| --- | --- |
| Ace or king of trump plus another trump | Stay |
| Three trumps, any rank | Stay |
| One high trump plus an off-suit ace | Stay with few players, consider passing with six or seven |
| One low trump, no aces | Pass |
| No trumps, even with side aces | Pass unless few players are in |

The reasoning: side aces win tricks only when that suit is led and nobody is void. With five or six players in, somebody is often void and trumps your ace. High trumps are the only reliable tricks.

### Position

Players who decide late see how many opponents stayed. If only one other player stays, a marginal hand becomes a stay, because avoiding a zero-trick hand against one opponent is much easier. If five stay before you, tighten up.

### Drawing

Keep trumps and aces; throw off-suit low cards. Drawing five fresh cards is a sign the hand should have been folded.

### Playing tricks

- Lead your highest trump early when you hold several; forced play rules mean others must follow with trump and you pull their trumps out.
- With one trump, save it for the trick where you are void in the led suit.
- Count trumps played. With 13 in the deck and only a slice dealt, knowing whether the queen is still out decides many hands.

### A sample hand

Five players, hearts are trump. You hold K♥, 7♥, A♣, 9♦ and 4♠. Two players before you stay. You have the second-highest trump, a second trump and a side ace, so you stay too. On the draw you throw the 9♦ and 4♠ and pick up Q♥ and 3♣, leaving three trumps.

The player on your left leads A♥, which the common rule forces anyone holding the trump ace to do. You must follow suit and must try to beat it; you cannot, so you play the 7♥ and keep the king. The ace now gone, your K♥ is the highest trump left. When you win the lead, you pull trumps with the king, then lead the queen, then cash the A♣. If nobody else is void in clubs, that is three tricks and the pot. Even in the bad case, where the club ace is trumped, the king alone was enough to avoid being bourréd.

The lesson is the one experienced players repeat: count the top trumps, because once the ace is out, the king is a sure trick.

### Pot size changes the decision

When the pot is large, the bourré penalty is large too. A hand that is a fine stay in a $6 pot can be a poor stay in a $60 pot, because a zero-trick outcome now costs $60. Tight is right when pots balloon.`,
    },
    {
      id: "money",
      title: "Playing Bourré for money safely",
      body: `Bourré is almost always played for cash, and the penalty rule makes it swingier than it looks. Keep home games friendly with a few agreements up front:

- **Ante and cap.** Fix the ante and a maximum pot or maximum bourré payment.
- **Carry-over rule.** Decide who antes when a pot carries over.
- **Forced-play rules.** Write down the lead-trump and cinch rules your group uses.
- **Stopping time.** Agree an end time. Chasing a doubled pot at 2 a.m. is how small games get expensive.

Money play is for adults only (18+ or your local legal age). If a game is starting to feel like a way to win back losses, the [responsible gambling](/responsible-gambling) page has limits, tools and help lines.`,
    },
    {
      id: "pvp",
      title: "Bourré pots and PvP rounds on PVPspinArena",
      body: `Bourré is a pure player-vs-player pot. Nobody deals for a house, and every dollar that leaves one player goes to another. PVPspinArena runs three player-vs-player games with the same basic shape. In [Jackpot](/), players add wagers to one pot and your win chance equals your share of it; the winner takes the pot minus any fee shown before entry. In [Coinflip](/coinflip), two players face a clean 50/50.

What Bourré adds is decisions and a penalty: your choice to stay or fold and how you play the tricks move your results. A hashed PvP round has no penalty and no decisions after entry, and the outcome comes from committed seeds you can check on the [fairness](/fairness) page. If you enjoy Bourré, the related [31 card game](/guides/31-card-game) and [Oh Hell](/guides/oh-hell-card-game) use similar small-stakes, everyone-for-themselves formats.

See also [pinochle](/guides/pinochle-rules).`,
    },
  ],
  faqs: [
    {
      q: "How do you play Bourré?",
      a: "Everyone antes and gets five cards; the dealer's last card sets trump. Each player chooses to play or pass, players who stay may draw, then five tricks are played with forced follow, trump and head rules. Most tricks wins the pot.",
    },
    {
      q: "What does it mean to get bourréd?",
      a: "You stayed in the hand and took zero tricks. You must pay an amount equal to the pot, which becomes part of the next pot.",
    },
    {
      q: "What happens if two players tie in Bourré?",
      a: "Nobody wins the pot. It carries over to the next hand, and some groups let only the tied players compete for it.",
    },
    {
      q: "How many players can play Bourré?",
      a: "Two to seven with one standard deck. Seven is the practical limit because every player needs five cards plus a stock for the draw.",
    },
    {
      q: "Why do Bourré pots get so big?",
      a: "Every bourréd player matches the pot, and ties carry the pot forward. A few hands with zero-trick players can double the pot repeatedly, which is why many groups set a cap.",
    },
  ],
  sources: [
    { label: "Wikipedia: Bourré", url: "https://en.wikipedia.org/wiki/Bourr%C3%A9" },
    { label: "Pagat: card game rules", url: "https://www.pagat.com/" },
    {
      label: "Encyclopaedia Britannica: card game",
      url: "https://www.britannica.com/topic/card-game",
    },
  ],
  related: [
    "31-card-game",
    "oh-hell-card-game",
    "how-to-play-spades",
    "how-to-play-euchre",
    "pitch-card-game",
    "pinochle-rules",
  ],
  updated: "2026-09-27",
};
