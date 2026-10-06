import type { Guide } from "./types";

export const guide: Guide = {
  slug: "survivor-pool",
  cluster: "Games of chance",
  keyword: "survivor pool",
  secondary: [
    "nfl survivor pool",
    "survivor pool rules",
    "knockout pool football",
    "last man standing pool",
  ],
  title: "Survivor Pool Rules and NFL Strategy Basics",
  description:
    "Survivor pool rules: pick one NFL winner each week, never reuse a team, last entry standing wins, plus strategy that depends on pool size.",
  h1: "Survivor pool: NFL rules, elimination and how strategy scales",
  answer:
    "A survivor pool (also a knockout or last-man-standing pool) asks you to pick one NFL team to win straight up each week. You cannot reuse a team. If your team loses, your entry is out. The last entry still alive takes the pot, or the remaining entries split if the season ends. Spreads do not apply. Sportsbook tickets are a different product.",
  facts: [
    "Picks are straight up: your team must win the game, not cover a number.",
    "The no-reuse rule is what makes later weeks scarce; 32 teams and 18 regular-season weeks is a tight inventory.",
    "Standard pools are single elimination. Some sell a mulligan, a buy-back, or a two-strike life.",
    "Large pools (hundreds or thousands of entries) usually last deep into the season; small office pools often die by midseason.",
    "Ties, postponements and pick deadlines are house rules. Write them before week 1.",
  ],
  sections: [
    {
      id: "rules",
      title: "Survivor pool rules",
      body: `A survivor pool is an office or online contest, not a sportsbook line. You pay an entry. Each NFL week you name one team to win its game. If that team wins, you survive and pick again next week from the teams you have **not** used. If that team loses, you are eliminated. The last living entry wins the pot.

That is the whole spine. Everything else is a house rule. A [bracket pool](/guides/bracket-pool) is a different office sheet: one locked tournament bracket, scored by round, not a new NFL pick every week.

### Straight up, not the spread

If Kansas City is −7 and wins 20–17, a spread bettor loses and a survivor picker **survives**. If they lose 17–20, both lose. The [point spread](/guides/point-spread-explained) is irrelevant except as a hint about how likely a win is. Buying a sportsbook ticket on the same game is [NFL betting](/guides/nfl-betting), a different product with a hold. Do not mix the two in your head: one is a pool against other pickers, the other is a price against a book.

### One team, one use

You pick each franchise at most once in the regular season. Use Buffalo in week 2 and you cannot use Buffalo in week 16, even if that later spot is a home game against a weaker opponent. That scarcity is the game. An 18-week season and 32 teams sounds generous until upsets burn your "easy" list and you are staring at a Thursday night with three bad choices.

### Deadlines

Some pools lock the entire slate at the Thursday kickoff. Some lock each pick at that game's kickoff. Late locks let you see Thursday and Sunday morning scratches; early locks punish indecision and reward people who write a card on Tuesday. Know which one you bought.

### Ties and voids

NFL regular-season ties are rare but they happen. House options: a tie kills you, a tie is a win (you survived), a tie is a "push" that does not use the team. Postponements, abandoned games and cancelled games need a line in the rules too. If the commissioner shrugs in week 14, you do not have a pool, you have an argument.

Survivor pools live in the [Games of chance topic](/guides/topics/games-of-chance) because the weekly result is still a random football game. The skill is allocation, not covering −3. A 70% side still loses three weeks in ten. Over a long season those three weeks are why "I only pick locks" still dies. Plan the inventory around that, not around a fantasy of sixteen straight covers.`,
    },
    {
      id: "endings",
      title: "How a pool ends, and the rules that change strategy",
      body: `**Last entry wins.** If two or more entries survive the Super Bowl — or week 18, if you do not play the postseason — they usually split. Some pools reset the used-team list for the playoffs; some do not, which can eliminate you because both remaining teams are already on your card.

**Everyone dies the same week.** If the last four entries all lose on Sunday, common rules are: those four split, or those four are revived and play week+1, or a secondary tie-break (margin, leftover "strength") decides. Write it down in August.

### Variants that are not the default

| Rule | What it does | Strategy shift |
| --- | --- | --- |
| Mulligan / one strike | First loss does not kill you | You can spend a life on a contrarian dart |
| Buy-back | Pay again after a loss | Large fields stay large longer |
| Double-pick weeks | Two teams in a listed week | Save two strong sides, not one |
| Loser pool | Pick a team to lose | Different inventory; still no reuse |
| Pick 'em / confidence | Rank games, not eliminate | Not a survivor pool |

A two-strike pool is closer to a season-long budget. A 2,000-entry single-life pool is a survival problem that often needs 16–18 correct picks. An 12-person office pool may be over in November. Strategy that ignores field size is the wrong strategy.

Money: if the pot is cash, this is gambling. Adults only, 18+ or the local legal age. An office spreadsheet does not make it a raffle just because you know the commissioner.`,
    },
    {
      id: "strategy",
      title: "Strategy: survive the week, win the pool",
      body: `The naive plan is "pick the biggest favourite every week." That plan has two leaks. First, you spend elite teams early, then sit through a brutal November with leftovers. Second, you sit on the **same** team as most of the field, so when that favourite finally loses you die in a crowd and nobody else dies.

Winning a survivor pool means you are alive **and** other people are dead. A pick that wins 80% of the time and is on 70% of cards is a good survival pick and a bad differentiation pick. A pick that wins 65% and is on 8% of cards is a worse coin-flip for your own life and a better bomb if it hits.

### Worked comparison (illustrative probabilities)

Suppose 100 entries remain. Two reasonable sides:

- Team A: you judge 80% to win. 70 other entries will pick A (70% of the field).
- Team B: you judge 65% to win. 8 other entries will pick B.

If you take A:

- You survive with probability 0.80.
- If A loses (0.20), you die with most of the room; about 70 cards vanish with you.
- If A wins, the field only shrinks by the people who took worse sides.

If you take B:

- You survive with probability 0.65.
- If B wins and A loses, you wipe a huge cluster and the pot's expected share jumps.
- If B loses, you die while the A crowd sails on.

There is no universal best row. In a **12-person** pool that is likely to end by week 10, taking A every time you still have A is often correct: you need fewer unique bombs. In a **1,000-person** pool that will last into January, saving A for a week when the public is elsewhere, and taking B when the crowd is jammed on A, is how you avoid a 200-way split at the end.

### Future value

Before you tap a 75% home favourite in week 3, look at weeks 8, 12 and 16. If that same team has a softer spot later, and this week has a second 70% side the public is ignoring, spend the second side. Future value is just inventory management. It is not a prophecy about injuries.

### What strategy is not

It is not a published "lock" list. It is not fading a team because they "always lose in the rain" without a number. It is not treating last week's upset as a reason the next favourite is due to fail — that is the [gambler's fallacy](/guides/gamblers-fallacy) applied to a new game. Each Sunday is a new sample.`,
    },
    {
      id: "size",
      title: "Pool size, public percentages and a small EV sketch",
      body: `Let p be your win probability on a side, s the share of **remaining** entries on that side, and assume everyone else is on the obvious favourite or on noise. A full Kelly-style survivor model is a tree through 18 weeks; you do not need it to see the shape.

A one-week differentiation check: if the favourite loses, the fraction of the field that dies is about s_fav. Your expected share of a $1 pot, ignoring future weeks, moves with (your survival probability) × (1 / expected remaining field). Taking the crowded 80% side keeps your survival high and the remaining field high. Taking the thin 65% side lowers survival and, when the crowd's side dies, lowers the remaining field a lot.

### Practical rules that do not require a spreadsheet

- **Write a three-week plan**, then rip it up when a quarterback is ruled out Saturday. The plan is a default, not a vow.
- **Look at public pick percentages** if the host publishes them. If 80% of a large pool is on one team, ask what you are buying by joining them.
- **Do not save a team for week 18 in a 16-person pool.** You will not be there, or the pool will already be over.
- **Do not spend two elite sides in the first fortnight** of a 500-person pool without a reason.
- **Never pick a team you think is under 50%** just to be different. Dead is dead. Contrarian only works when the side is still a real favourite.

If you want sportsbook technique — closing-line value, holds, sides versus totals — that is [how to win at sports betting](/guides/how-to-win-at-sports-betting), not this page. Survivor is a combinatorial game against the other cards.`,
    },
    {
      id: "pvp",
      title: "A pool against people, and a hashed PvP pot",
      body: `A survivor pool is already player-versus-player. The NFL games are the random number generator; the other entries are the opponents. Your edge, if you have one, is using inventory and crowd percentages better than they do. The games themselves still have huge variance. One blocked punt ends a perfect card.

PVPspinArena is the same structure without a football season. It runs three player-vs-player games in USDC or ETH on Base. [Jackpot](/) sets your win chance equal to your share of the pot, the clean version of "my entry versus their entries." [Coinflip](/coinflip) is a 50/50. [Roulette](/roulette) is a 33-slot wheel, 16 Purple and 16 Silver at 2x, 1 Green at 14x, every bet returning 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee. Seeds are committed; check a settled round on [fairness](/fairness).

If the next week's "must-use" pick is already a chase to get even from last Sunday, stop. Tools are on [responsible gambling](/responsible-gambling). Play is 18+ only.

In the same cluster, see also [quick pick](/guides/quick-pick-lottery), [pull tabs](/guides/pull-tabs), and [lucky number](/guides/lucky-numbers-gambling).`,
    },
  ],
  faqs: [
    {
      q: "How does a survivor pool work?",
      a: "Each week you pick one NFL team to win outright. You cannot reuse a team. A loss eliminates your entry. The last entry still alive wins the pot, or survivors split at the end of the season.",
    },
    {
      q: "Do point spreads matter in a survivor pool?",
      a: "No. A 3-point win is a survival. A 1-point loss is death. Spreads are only a clue to win probability, not the scoring rule.",
    },
    {
      q: "What happens if everyone left loses in the same week?",
      a: "House rule. Common options are a split among those entries, a revival week, or a written tie-break. If it is not on the sheet, argue it in August, not on Monday night.",
    },
    {
      q: "Should you always pick the biggest favorite?",
      a: "In a tiny pool, often yes. In a huge pool you also need people to die without you. Saving teams and taking slightly worse, less popular sides is how large fields get won.",
    },
    {
      q: "Can you use the same NFL team twice?",
      a: "Not in the standard rules. That single-use constraint is the whole puzzle. Some playoff add-ons reset the list; most regular-season pools do not.",
    },
    {
      q: "Is a Life or mulligan still a survivor pool?",
      a: "It is a variant. One extra life changes the value of a contrarian pick. Read the sheet before you spend a team.",
    },
  ],
  sources: [
    {
      label: "NFL regular season (team and week counts)",
      url: "https://en.wikipedia.org/wiki/National_Football_League#Regular_season",
    },
    {
      label: "Encyclopaedia Britannica: American football",
      url: "https://www.britannica.com/sports/American-football",
    },
    { label: "Wikipedia: Betting pool", url: "https://en.wikipedia.org/wiki/Betting_pool" },
  ],
  related: [
    "nfl-betting",
    "how-to-win-at-sports-betting",
    "point-spread-explained",
    "what-is-sports-betting",
    "gambling-budget",
    "gamblers-fallacy",
    "quick-pick-lottery",
    "pull-tabs",
    "lucky-numbers-gambling",
  ],
  updated: "2026-09-27",
};
