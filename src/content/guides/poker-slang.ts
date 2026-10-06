import type { Guide } from "./types";

export const guide: Guide = {
  slug: "poker-slang",
  cluster: "Poker",
  keyword: "poker slang",
  secondary: ["poker terms", "poker lingo", "poker jargon", "poker hand nicknames"],
  title: "Poker Slang: Table Talk, Hand Nicknames and Jargon",
  description:
    "Poker slang decoded: betting terms, player types, hand nicknames like pocket rockets and the wheel, tournament jargon, and what each phrase means at the table.",
  h1: "Poker slang: a glossary of table talk, hand nicknames and jargon",
  answer:
    "Poker slang is the shorthand players use for actions, hands, players and situations: a c-bet is a continuation bet, the nuts is the best possible hand, a fish is a weak player, and pocket rockets are two aces. Knowing the terms lets you follow table talk, strategy videos and hand histories without guessing what a donk bet, a cooler or a hero call is.",
  facts: [
    "The nuts is the best possible hand given the board; the second nuts is the next best.",
    "A wheel is A-2-3-4-5, the lowest straight; Broadway is 10-J-Q-K-A, the highest.",
    "The dead man's hand, aces and eights, is linked to Wild Bill Hickok's death in Deadwood in 1876.",
    "10-2 is nicknamed the Doyle Brunson after he won the 1976 and 1977 WSOP Main Events with it.",
    "Tilt means playing worse because of emotion, usually after a bad beat.",
  ],
  sections: [
    {
      id: "actions",
      title: "Betting and action slang",
      body: `Most poker slang describes what someone did with their chips. These are the terms you will hear in almost every hand. For the underlying rules of each betting round, see [how to play poker](/guides/how-to-play-poker).

| Term | Meaning |
| --- | --- |
| Limp | Call the big blind preflop instead of raising |
| Open | Make the first voluntary raise |
| 3-bet / 4-bet | The re-raise / the re-re-raise (the blind counts as the first "bet") |
| Cold call | Call a raise when you have no money already in the pot |
| Squeeze | 3-bet after a raise and one or more callers |
| C-bet | Continuation bet: the preflop raiser bets again on the flop |
| Donk bet | Leading into the preflop raiser from out of position |
| Check-raise | Check, then raise after an opponent bets |
| Float | Call a bet with a weak hand, planning to take the pot later |
| Overbet | Bet more than the size of the pot |
| Shove / jam | Go all-in |
| Snap call | Call instantly, implying great confidence |
| Tank | Think for a long time before acting |
| Hero call | Call a big bet with a marginal hand, suspecting a bluff |
| Value bet | Bet to be called by worse hands |

### Straddles, strings and splashes

A **straddle** is a voluntary blind, usually twice the big blind, posted before cards are dealt; it buys the last preflop action. A **string bet** is an illegal bet made in more than one motion without announcing the amount. **Splashing the pot** means throwing chips into the middle rather than stacking them in front of you, which dealers discourage because the amount becomes unclear. **Angle shooting** is using ambiguous actions to mislead, such as acting as if you will fold to induce a bet; it is legal in some narrow senses and always frowned on.`,
    },
    {
      id: "hands",
      title: "Hand and board slang",
      body: `### Describing your holding

- **The nuts:** the best possible hand on the current board. "Nut flush" is the best available flush, usually ace-high.
- **Set vs trips:** both are three of a kind. A set uses a pocket pair plus one board card; trips use one hole card plus a pair on the board. Sets are better disguised.
- **Overpair / underpair:** a pocket pair above or below every board card.
- **Top pair, top kicker (TPTK):** pairing the highest board card with the best side card.
- **Kicker:** the unpaired side card that breaks ties.
- **Draw, open-ender, gutshot:** an unfinished hand; an open-ended straight draw has 8 outs, a gutshot (inside straight draw) has 4.
- **Backdoor:** a draw that needs both the turn and the river, such as a runner-runner flush.
- **Blocker:** a card you hold that reduces the combinations an opponent can have. Holding the ace of hearts on a three-heart board means nobody has the nut flush.

### Describing the board

A **rainbow** flop has three different suits. A **monotone** flop is one suit. A **paired** board has two cards of the same rank. A **dry** board (K-7-2 rainbow) offers few draws; a **wet** board (9-8-7 with two hearts) offers many. **Broadway** cards are tens through aces; a Broadway straight is 10-J-Q-K-A. The **wheel** or **bicycle** is A-2-3-4-5.

If you want the counts behind outs and blockers rather than the vocabulary, the [poker math guide](/guides/poker-math) works through them, and [poker hand rankings](/guides/poker-hand-rankings) lists what beats what.`,
    },
    {
      id: "nicknames",
      title: "Starting hand nicknames",
      body: `Hold'em players give nicknames to many two-card hands. Some are nearly universal; others are regional or jokey. The widely used ones:

| Hand | Nickname | Origin (where known) |
| --- | --- | --- |
| A-A | Pocket rockets, bullets | Aces as "A" shapes |
| K-K | Cowboys | Kings as horsemen |
| Q-Q | Ladies | Queens |
| J-J | Hooks | The J shape |
| 8-8 | Snowmen | Two stacked circles |
| 2-2 | Ducks | The 2 resembles a duck |
| A-K | Big Slick | Long-standing; origin unclear |
| A-A-8-8 (two pair) | Dead man's hand | Hickok story, below |
| 10-2 | Doyle Brunson | His 1976 and 1977 Main Event wins |
| 7-2 offsuit | The hammer | Widely called the worst Hold'em hand |

### The stories behind two of them

The **dead man's hand** is aces and eights, traditionally black. The commonly told story is that Wild Bill Hickok held it when he was shot dead while playing cards in Deadwood, in what is now South Dakota, in August 1876. The identity of his fifth card is not reliably recorded, and some historians question the details of the hand itself; the association with his death is what matters to the slang.

**The Doyle Brunson** refers to Brunson winning the World Series of Poker Main Event in both 1976 and 1977 with 10-2 as his final hand. His profile, including the rest of his career, is on the [Doyle Brunson page](/guides/doyle-brunson).

Other nicknames you may hear, such as "Anna Kournikova" for A-K (a joke that it looks good but rarely wins) or "sailboats" for 4-4, vary by table and generation. Treat them as colour rather than standard terms.`,
    },
    {
      id: "players",
      title: "Player types and table characters",
      body: `Players are labelled by how loose (many hands) or tight (few hands) and how passive (calling) or aggressive (betting and raising) they are.

| Term | Style | What to expect |
| --- | --- | --- |
| Nit / rock | Very tight, usually passive | Big bets mean big hands |
| TAG | Tight-aggressive | Solid regular; fewer hands, played firmly |
| LAG | Loose-aggressive | Many hands, lots of pressure |
| Calling station | Loose-passive | Calls too often, rarely raises; bluffs fail |
| Maniac | Hyper-aggressive | Raises almost anything; big swings |
| Fish / donkey (donk) | Weak player | Makes costly, predictable mistakes |
| Whale | A fish with a very large bankroll | Plays high and loose |
| Shark / reg | Strong regular | Plays often and well |

### Mood and mistakes

**Tilt** is playing worse because of emotion: anger after a bad beat, frustration after a long losing stretch, or overconfidence after a win. **Steaming** is visible, angry tilt. **Spewing** is losing chips through reckless bets. A **punt** is one bad, expensive decision. **Stacking off** means committing your whole stack, usually with a hand that does not justify it.

Tilt is also a responsible-gambling concept. Chasing losses after a bad beat is the same pattern whether the game is poker or anything else; if it describes you, the [responsible gambling](/responsible-gambling) page has limits and help links. Gambling for money is for adults (18+ or your local legal age) only.

Labels are shorthand, not insults to be used at the table. Calling someone a fish out loud is a reliable way to make them leave or play better, and most card rooms treat abuse as an etiquette violation. For wider table manners, see [casino etiquette](/guides/casino-etiquette).`,
    },
    {
      id: "results",
      title: "Luck, results and showdown talk",
      body: `A lot of poker slang exists to talk about the difference between good decisions and good outcomes.

- **Bad beat:** losing with a hand that was a big favourite when the money went in.
- **Suck out:** the opposite view of a bad beat; the underdog hits.
- **Cooler:** two strong hands collide and losing big is nearly unavoidable, such as KK against AA preflop.
- **Rivered:** beaten by the last card.
- **Runner-runner:** needing and hitting both the turn and the river.
- **Chop:** splitting the pot because hands tie.
- **Run it twice:** after an all-in, deal the remaining cards two times and split the pot by result. It lowers variance without changing expected value.
- **Muck:** fold, or throw your cards away at showdown without showing. The muck is also the pile of discards.
- **Ship it:** push the pot to the winner, usually said by the winner.
- **Felted / busted:** lost every chip.
- **Freeroll:** a spot where you cannot lose but might win more, for example holding the same straight as an opponent but with a flush draw; also a tournament with no entry fee.

### Why this vocabulary matters

"Bad beat" and "cooler" point at variance, which is the maths of short-term noise. A good player can lose an 82% all-in and still have made the right decision. The [variance in gambling](/guides/variance-in-gambling) guide explains how big those swings get, and it is why hand-history discussions focus on the decision rather than the river card.`,
    },
    {
      id: "tournament",
      title: "Tournament and card room jargon",
      body: `Tournament and card-room talk adds a layer of structural terms.

### Tournament terms

- **Buy-in:** the entry fee, often split into prize-pool money and a rake or fee.
- **Freezeout:** no rebuys; once you bust, you are out.
- **Rebuy / re-entry:** pay again to get a new stack, within the rules.
- **Satellite:** a cheaper event whose prizes are seats into a bigger event. Chris Moneymaker's route into the 2003 WSOP Main Event is the famous example; see [Chris Moneymaker](/guides/chris-moneymaker).
- **Bubble:** the stage just before players start winning money; the player who busts last with nothing is the bubble boy or girl.
- **ITM:** in the money.
- **Final table:** the last table, usually nine or fewer players.
- **Short stack / big stack / chip leader:** self-explanatory, and central to tournament ICM maths.
- **Ante:** a small forced bet from every player, or in many modern events a single big-blind ante paid by one player.

### Card room terms

- **Rake:** the house's cut of each pot or tournament fee.
- **Button:** the dealer position, acting last after the flop.
- **UTG:** under the gun, first to act preflop.
- **Cutoff / hijack:** the seats one and two to the right of the button.
- **Table stakes:** you can only bet what is in front of you when the hand starts.
- **Live one:** a weak, loose player who keeps the game profitable.
- **Seat change / table change:** requests managed by the floor.

More poker topics, from rules to strategy, are collected in the [poker topic hub](/guides/topics/poker). General casino words that are not poker-specific, such as comps and chips, are covered by [casino terminology](/guides/casino-terminology).`,
    },
    {
      id: "pvp",
      title: "Slang in a hashed PvP game",
      body: `PVPspinArena runs three player-vs-player games in USDC or ETH on the Base network, for adults 18+ only: [Jackpot](/), [Coinflip](/coinflip) and [Roulette](/roulette). A lot of poker slang translates cleanly.

- A **coin flip** in poker means a roughly even all-in. On Coinflip it means exactly 50/50 between two players, with the winner taking the pot minus any fee shown before entry.
- **Equity** in Jackpot is literal: your win chance equals your share of the pot.
- **Tilt** looks the same everywhere: a bigger bet after a loss because it feels owed.
- **Bad beat** has no meaning when there is no decision to be right about. Roulette pays 2x on Purple or Silver and 14x on Green, and Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee.

What replaces "was the dealer honest?" is a check you can do yourself: each round comes from committed seeds, and you can verify any settled round on the [fairness page](/fairness).`,
    },
  ],
  faqs: [
    {
      q: "What does the nuts mean in poker?",
      a: "The nuts is the best possible hand on the current board. If the board is A-K-Q-J-3 with no flush possible, anyone holding a ten has the nuts, a Broadway straight.",
    },
    {
      q: "What is a donk bet?",
      a: "A donk bet is a lead into the player who raised preflop, made from out of position. The name comes from donkey, because it was once seen as a weak play, though modern strategy uses it in some spots.",
    },
    {
      q: "What does tilt mean in poker?",
      a: "Tilt is playing worse because of emotion, usually frustration after a bad beat or a losing run. Typical signs are bigger bets, looser calls and chasing losses.",
    },
    {
      q: "Why is 10-2 called a Doyle Brunson?",
      a: "Doyle Brunson won the World Series of Poker Main Event in 1976 and 1977 holding 10-2 on the final hand of each, so the hand took his name.",
    },
    {
      q: "What is the difference between a set and trips?",
      a: "Both are three of a kind. A set uses a pocket pair plus one matching board card. Trips use one hole card plus a pair on the board, which is easier for opponents to see.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Glossary of poker terms",
      url: "https://en.wikipedia.org/wiki/Glossary_of_poker_terms",
    },
    { label: "Wikipedia: Dead man's hand", url: "https://en.wikipedia.org/wiki/Dead_man%27s_hand" },
    {
      label: "Encyclopaedia Britannica: poker",
      url: "https://www.britannica.com/topic/poker-card-game",
    },
  ],
  related: [
    "how-to-play-poker",
    "poker-for-beginners",
    "poker-hand-rankings",
    "texas-holdem-rules",
    "casino-terminology",
  ],
  updated: "2026-09-27",
};
