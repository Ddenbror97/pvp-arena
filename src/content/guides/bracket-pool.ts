import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bracket-pool",
  cluster: "Sports betting",
  keyword: "bracket pool",
  secondary: ["office pool", "bracket scoring", "upset bonus", "tournament buy-in"],
  title: "Bracket Pool: Scoring, Upsets and Buy-In Rules",
  description:
    "A bracket pool scores a tournament bracket, not a sportsbook ticket. See round points, upset bonuses, buy-ins, and ties before you join an office pool.",
  h1: `Bracket pool: scoring, upsets, and buy-in rules`,
  answer: `A bracket pool scores a filled tournament bracket against the games that are actually played, using point rules the pool wrote down. It is not a sportsbook parlay. Later rounds are often worth more points, upset bonuses are house rules, and the buy-in and tie rules should be settled before anyone locks an entry. This page is not tax or legal advice. Adults, 18+, when money is involved.`,
  facts: [
    `A bracket pool grades a sheet of picks. It does not settle like a one-ticket parlay.`,
    `Round values are chosen by the pool. A common sheet gives later games more points.`,
    `An upset bonus exists only if that pool's rules define upset and the bonus.`,
    `The buy-in and the prize split should be written before entries lock.`,
    `Tie rules belong on the same sheet. Silence is how friendly pools turn sour.`,
    `This page does not say whether your pool is legal, and it is not tax advice. 18+.`,
  ],
  sections: [
    {
      id: "what-it-is",
      title: `What a bracket pool is`,
      body: `A bracket pool is a contest built on a tournament bracket. You pick a winner for each game on the sheet, usually before the tournament starts. As games are played, the pool awards points for correct picks under a scoring rule the organizer published. The people in the pool are competing with each other, not cashing a sportsbook ticket. When the last game ends, the sheet with the most points wins, unless the tie rule says otherwise.

Office pools are the usual setting. The event many people mean is a large single-elimination tournament, often college basketball in March, though the same shape appears in other cups. The league runs the games. The pool is a private layer of picks and points. The league did not promise the prize.

### What you hand in

- A pick for each game, or a written rule for blanks.
- The entry before lock. Many pools refuse late ink.
- The buy-in, if there is one, on terms already written.

If the sheet is silent on blanks, ask whether a blank scores zero. [What sports betting is](/guides/what-is-sports-betting) describes a wager against a book. A bracket pool can involve money without being that product. In a pool, a wrong pick loses those points and the rest of the sheet still scores.

The [sports betting topic](/guides/topics/sports-betting) covers prices and tickets. If someone talks like a book, come back to the pool's own rules. This article is not advice about whether a money pool is allowed where you live. Adults, 18+, when money is involved.`,
    },
    {
      id: "scoring-by-round",
      title: `Scoring by round`,
      body: `Most bracket pools give more points to later rounds. Early rounds have more games, so a flat point per game can let a lucky first weekend decide the pool before the later rounds matter. Heavier later rounds keep the championship week relevant. The exact numbers are house rules. One widely copied sheet doubles the points each round. Another uses a flatter ladder. Neither is issued by the tournament as a law. If your sheet does not list points per round, you do not have a scoring rule yet. Count the games on your sheet before you trust a total shouted across the room.

The pattern that matters is the weight: points for a correct pick in that round. Wrong picks are almost always zero. They do not subtract unless the sheet says so in plain language. If subtraction is not written, do not invent it.

### One common ladder, as an example only

| Round on that sheet | Points for a correct pick |
| --- | --- |
| First round | 1 |
| Second round | 2 |
| Regional semifinal | 4 |
| Regional final | 8 |
| Semifinal | 16 |
| Championship game | 32 |

That ladder is an illustration of doubling. Your pool might award the same points for every game. Add the maximum from the sheet you have. A correct pick is a team you chose that won that game. If your champion lost early, later picks on that line are wrong. Points do not move to a team you would have taken instead. The sheet stays static unless the rules allow a later edit. Ask before lock.`,
    },
    {
      id: "upset-bonuses",
      title: `Upset bonuses are house rules`,
      body: `An upset bonus awards extra points for picking a winner the sheet defines as an upset. In a seeded tournament, that often means a worse seed beating a better seed. The size of the bonus might be a flat add-on, or it might scale with the gap in seeds. All of that is writing the organizer chose. A neighboring office can run the same games with no upset bonus at all. Both pools are possible. Neither bonus is hiding inside the sport itself.

The definition is the slippery part. A ninth seed over an eighth seed is an upset on a strict seed rule, and it is nothing on a rule that only pays double-digit seeds. The bonus might add to round points or replace them, and it might apply in one round or every round. If the pool uses seeds, a sportsbook price is irrelevant. If it uses a price, the seed is irrelevant.

### Questions the sheet should answer

- What counts as an upset: a seed gap, or something else?
- Is the bonus a fixed number or a multiple of the round points?
- Which rounds can earn it?

Upset bonuses make a wild sheet more valuable when the wild games happen, and worthless when they do not. That is the deal. They do not make the bracket a good prediction. They change the points. [How to bet on sports](/guides/how-to-bet-on-sports) is about prices at a book, which might inform how you personally see a matchup. The pool will not pay you in that book's odds. It pays the sheet. 18+ if the pool takes money.`,
    },
    {
      id: "buy-in",
      title: `Buy-ins and prize splits`,
      body: `The buy-in is the entry fee. Added up, the fees are the prize pool, minus anything the rules say is held back. Write the amount, the deadline, and what happens to an unpaid entry. A common simple rule is that an unpaid sheet is not in the pool. A sloppy rule is that everyone knows who owes. The sloppy rule lasts until someone misses a payment and still wants the pot.

The split is the second number. Winner take all and a top-three share are both house choices. Put the percentages on the sheet and make them add to the whole pot before lock.

### What this page will not tell you

This page does not say that your office pool is legal. Rules differ by place, and a general article cannot clear you. This page is not tax advice. If you need to know whether an entry or a prize is allowed, or how a prize is reported, ask a qualified local source. Do not take a chat thread as that source.

Free pools exist. They have bragging rights and no pot. They still need a scoring rule and a tie rule, or the bragging becomes an argument. Money pools need the same clarity plus the buy-in terms. [Responsible gambling](/responsible-gambling) is the page for limits and help if the buy-in stops being money you can lose. A bracket is entertainment. It is allowed to stay small. Adults, 18+, when the entry costs money.`,
    },
    {
      id: "ties",
      title: `Ties and tie-breakers`,
      body: `Two sheets can finish on the same points. Silence means a dispute, not a champion. Decide the tie before lock. Splitting the prize is the clean money answer. A tie-breaker question is the answer when you want one winner. Both are legitimate if they are written early.

A common tie-breaker asks for the combined points in the championship game. Closest without going over is different from closest either way. Write which one, and name a second breaker if two people can land on the same guess. A vote after the results invites bias.

### Write the order

- Primary score: the bracket points, including any upset bonus the sheet defined.
- First tie-break: the question, and closest-over versus closest-either-way.
- Second tie-break: another question, or a split.
- If money is involved: how a split rounds to the cent.

Do not use a criterion nobody could have known, such as a stat you name after the game. Do not use the organizer's preference. The point of a written tie-break is that the winner is dull to announce. Dull is fair.

Entry order is a weak tie-break, but it is a rule if you wrote it: earliest entry wins a tie, for example. It favors whoever was free on Monday. If you use it, say so when people can still enter early. Springing it at the end is sharp practice. Pools survive on the feeling that the sheet was the sheet. Ties test that feeling more than easy years do.`,
    },
    {
      id: "not-a-parlay",
      title: `A bracket is not a sportsbook parlay`,
      body: `A sportsbook parlay is one stake on several legs, and a losing leg typically kills the ticket. A bracket pool does not work that way. You can miss the champion and still lead the pool on the strength of earlier rounds, if those rounds carry enough points on your sheet. You can nail the champion and still lose the pool because the early rounds were a mess and the sheet weighted them heavily. The scoring ladder decides which story is available. The parlay rule does not.

The buy-in is not a parlay stake priced by a book, unless a separate ticket actually is a parlay. Keep that receipt apart from the office sheet. Saying the pool pays like a parlay is usually excitement, not the rules.

### Where the products diverge

- A parlay often dies on the first miss. A bracket keeps scoring the other games.
- A parlay has a posted price. A pool has points and a pot.
- A locked bracket usually stays locked. Cash-out is a book feature.

[Parlay betting](/guides/parlay-betting-explained) is the page for the ticket version. Read it if the group starts quoting parlay payouts for a sheet that only has points. A [survivor pool](/guides/survivor-pool) is the other common office game: one NFL winner each week, and you cannot reuse a team. A bracket is one locked sheet for a whole tournament, not that weekly elimination. [Prop bets](/guides/prop-bets-explained) are a third product: a stat, a player, a price. A bracket is a list of winners. Dropping props into a bracket without writing how they score will not make them props or bracket picks. It will make a mess.

A 10-by-10 grid of final scores is [Super Bowl squares](/guides/super-bowl-squares), which is not a bracket. Filling a tournament for a sportsbook line, rather than a pool sheet, is [March Madness betting](/guides/march-madness-betting).`,
    },
    {
      id: "before-you-join",
      title: `Before you join the pool`,
      body: `Read the ladder, the upset rule, the buy-in, the split, the lock time, and the tie rule. If a line is missing, ask in writing. You are allowed to skip. Skipping is cheaper than a fight about points nobody wrote down.

A sheet locked after a result is a different contest. A second-chance bracket halfway through is a new pool with its own buy-in or a written free entry. It should not replace the original standings.

### A join checklist

- Points per round are listed, and you can add the maximum.
- Upset bonus is defined or explicitly absent.
- Buy-in, split, and organizer eligibility are written.
- Tie-breakers are ordered.
- Canceled-game scoring is one sentence.
- You can lose the buy-in without trouble. If you cannot, do not enter.

This page cannot clear the pool legally or tell you what a prize means for your taxes. Those questions leave the scoring sheet and go to a qualified local source. What the sheet can do is make the competition legible. Legible pools are less dramatic. That is a virtue.

If the buy-in is climbing because last year's winner talked you into a bigger number, pause. [Responsible gambling](/responsible-gambling) links limits and help. A bracket pool is a game about games. It should not be the money you need. If a listed game is canceled and not replayed, the sheet should already say whether that pick scores zero. Adults, 18+, and a blank sheet is a valid choice.`,
    },
  ],
  faqs: [
    {
      q: `Is a bracket pool a parlay?`,
      a: `No. A parlay is a sportsbook ticket that usually dies when a leg loses. A bracket pool keeps scoring the rest of your picks under the pool's point rules.`,
    },
    {
      q: `Who sets the points for each round?`,
      a: `The pool does. Later rounds often carry more points so the final games still matter. A doubling ladder is common and still only a house rule, not a league rule.`,
    },
    {
      q: `Are upset bonuses automatic?`,
      a: `No. A bonus exists only if the sheet defines what an upset is, how many extra points it pays, and which rounds count. A different pool can offer no bonus.`,
    },
    {
      q: `What happens if two brackets tie?`,
      a: `Whatever the rules said before lock: split the prize, or use a written tie-breaker such as a championship total. If the sheet is silent, you have an argument, not a winner.`,
    },
    {
      q: `Does this page cover taxes or legality?`,
      a: `No. It explains scoring, buy-ins, and ties. Whether a money pool is allowed where you live, and how a prize is treated, is a local question for a qualified source. 18+ when money is involved.`,
    },
  ],
  sources: [
    {
      label: "NCAA Division I men's basketball tournament",
      url: "https://en.wikipedia.org/wiki/NCAA_Division_I_men%27s_basketball_tournament",
    },
    { label: "Sports betting", url: "https://en.wikipedia.org/wiki/Sports_betting" },
    { label: "National Council on Problem Gambling", url: "https://www.ncpgambling.org/" },
  ],
  related: [
    "survivor-pool",
    "parlay-betting-explained",
    "what-is-sports-betting",
    "how-to-bet-on-sports",
  ],
  updated: "2026-09-29",
};
