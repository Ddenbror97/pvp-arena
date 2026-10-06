import type { Guide } from "./types";

export const guide: Guide = {
  slug: "casino-hold-em",
  cluster: "Casino games",
  keyword: "casino holdem",
  secondary: ["casino hold em", "casino holdem strategy", "holdem house edge", "ante bonus holdem"],
  title: "Casino Holdem: House Game Versus Poker Rake",
  description:
    "Casino holdem versus raked poker: ante and call, dealer qualifying, typical 2% edges, and why a house paytable is not a poker pot.",
  h1: "Casino holdem: the house game versus a raked poker pot",
  answer:
    "Casino holdem is a house-banked table that borrows Texas Hold'em hand ranks. You post an ante, see two hole cards and three community cards, then fold or call 2× the ante. The dealer’s two cards complete both hands. You are not playing the other seats for a pot. There is no rake on a shared pile — there is a paytable and a house edge, often near 2% on the ante with a decent call chart. PVPspinArena does not offer casino holdem.",
  facts: [
    "Casino holdem is you versus the house, not a multi-player raked cash game.",
    "Standard action: ante, then call 2× ante or fold after the flop is out.",
    "With a common call-on-pair-of-fours-or-better chart, the ante edge is often about 2.1% to 2.4%.",
    "The AA / pair-plus side bet is a separate, usually much fatter, product.",
    "PVPspinArena does not offer casino holdem; Jackpot, Coinflip and Roulette are the live games.",
  ],
  sections: [
    {
      id: "what",
      title: "What casino holdem is buying — and what it is not",
      body: `Casino holdem uses the same five-card ranks as Texas Hold'em: high card through royal. That is where the resemblance ends.

### The house loop

1. Ante (and optional AA side bet).
2. You get two hole cards. The dealer gets two, usually face down.
3. Three community cards (the flop) come out.
4. Fold and lose the ante, or **call 2× ante**.
5. Turn and river come. Best five-card hand wins.
6. If you beat the dealer, the call pays 1:1. The ante pays 1:1 plus an **ante bonus** on a strong hand (straight or better on many sheets).
7. If you lose, ante and call go. If you tie, those bets push.

You never bet into another player. There is no fold equity, no bluff, no rake taken from a pot you share. A raked [crypto poker](/guides/crypto-poker) cash game is the other product: players versus players, house paid by the rake. Do not price them as cousins.

This page is in the [casino games topic](/guides/topics/casino-games). Adults 18+. No lobby rankings.`,
    },
    {
      id: "table",
      title: "Ante, call and side bets: the odds table",
      body: `Figures below are the usual published range for a standard ante-bonus sheet (straight 1:1, flush 2:1, full house 3:1, quads 10:1 or 20:1, straight flush / royal higher). Always read the felt; bonus multiples move the ante edge by tenths.

| Bet | When it is in action | Typical pay | Approx. house edge |
| --- | --- | --- | --- |
| Ante + call, pair-of-4s+ chart | Every hand you play | Call 1:1; ante 1:1 + bonus | About 2.1%–2.4% of ante |
| Ante only, if you always call | Never folding | Same pays | Worse than the chart (you call trash) |
| Ante only, if you fold too much | Folding live pairs | Lose ante | Worse (you dump too many antes) |
| AA / pair plus (common) | Optional, preflop | Pair / AA ladder | Often ~3% to 7%+ |
| Pocket AA progressive | Optional | Jackpot slice | High; funds the top prize |

The ~2% figure is **not** “2% of ante+call.” Analysts usually quote it as a percentage of the **ante**. Because a call is 2× when you continue, your average dollars at risk per hand are larger than the ante. For session cost, multiply the published ante edge by antes wagered, or rebuild EV from a full strategy table if the site gives one.

That is still the [house edge](/guides/house-edge) identity: expected return from the paytable minus 1. It is not a 2% [poker rake](/guides/how-to-play-poker) on a pot you might win with a worse hand.`,
    },
    {
      id: "worked",
      title: "Worked example: $10 ante, 100 hands, charted calls",
      body: `You ante $10. When you call, you put $20 more. Suppose a decent chart calls about 60% of flops (the real rate depends on the exact “4s or better plus some ace-high” rule).

- Antes wagered: 100 × $10 = $1,000.
- Calls: ~60 × $20 = $1,200.
- Total outlay in action: $2,200, but the usual 2.16% quote applies to the **$1,000 of antes**, expected cost about **$22**.

If you instead always call, you put the extra $20 on trash flops. The extra losses on those calls more than eat the antes you “saved” from not folding. If you only call two-pair or better, you fold too many winning antes. The chart exists to sit near that 2% — not to beat the house.

**Same 100 hands on the AA side bet at $5, 6% edge:** $500 wagered, expected cost $30. The side bet just cost more than the main game. That is the [live dealer casino](/guides/live-dealer-casino) trap with extra neon: the host sells the AA button.`,
    },
    {
      id: "vs-poker",
      title: "House paytable versus poker rake",
      body: `**Raked Hold'em.** Everyone’s chips make a pot. The room takes a cap or a percent. A good player can have a positive win-rate versus worse players after rake. The house does not care who wins the showdown.

**Casino holdem.** The house pays a fixed schedule. Other seats’ cards do not fund you. You cannot “outplay” the dealer’s random two cards except by following a call chart that reduces *extra* mistakes. The leftover edge stays negative.

If someone says “it’s just Hold'em,” ask who takes the other side. If the answer is the casino, you are on this page. If the answer is the other players, you want a poker room guide, not a 2% ante quote.

Dealer qualifying rules differ by studio. Some casino holdem variants make the dealer qualify with a pair of 4s; if the dealer does not qualify, the call may push and the ante still pays. That rewrite changes EV. Read the overlay. Do not import a Caribbean Stud sheet onto a holdem felt.`,
    },
    {
      id: "not-here",
      title: "PVPspinArena does not offer casino holdem",
      body: `There is no ante/call grid here. The live games are Jackpot, Coinflip and Roulette.

- [Jackpot](/) — other players’ stakes are the pot; your chance is your share.
- [Coinflip](/coinflip) — 50/50, fee published, no hand ranks.
- [Roulette](/roulette) — 33 slots, about 7.88% on Purple or Silver and about 59.70% on Green after the 5% win fee.
- [online casino games](/guides/online-casino-games) — where a holdem tile sits: house table, not a poker room.

If you want player-versus-player, use Jackpot or Coinflip, or a real raked table elsewhere. If you sit casino holdem, play the ante, skip AA unless you have priced it, and use a call chart for that exact bonus sheet.

A $15 ante with a $30 call on 60 of 100 hands puts $1,500 of antes and $1,800 of calls in play. At 2.2% of ante the expected cost is about $33 — a cheap-feeling table game. Add a $5 AA chip every hand at 6% and you add $30 of expected keep. The host will celebrate the pocket pair. The invert will not. If you would not buy a $5 keno ticket every hand, do not buy AA every hand. The ranks look like poker. The cash register does not.`,
    },
    {
      id: "chart",
      title: "What a call chart actually does",
      body: `A typical published strategy calls with a pair of 4s or better, plus certain ace-high hands and some strong draws — details vary with the ante-bonus pays. The chart does **not** create an advantage. It stops you from calling 7-high or folding trips.

Copying a chart from a different bonus table (quads pay 20:1 versus 10:1) can be slightly wrong. If the site will not show the bonus column, you do not know which chart to use, and you do not know the 2% story is yours.

Instant RNG holdem and live-studio holdem share the same ranks. Live is slower and filmed. Instant raises hourly antes. The edge per ante does not care about the camera.

A live table at 40 hands an hour and $10 ante is $400 of antes, expected cost about $9 at 2.2%. Instant at 200 hands an hour is $2,000 of antes, expected cost about $44, before AA. That is the same speed trap as instant baccarat. If you came here because “holdem is skill,” the only skill is folding the right trash and walking when the bonus column is blank. There is no river bluff. The dealer’s two cards always continue.`,
    },
    {
      id: "bonus-sheet",
      title: "Ante bonus multiples and flop texture",
      body: `The ~2% ante story assumes a specific bonus column. Change the column and the chart’s value moves.

### A typical bonus ladder (illustration)

| Your final hand (often regardless of dealer) | Common ante bonus |
| --- | --- |
| Straight | 1:1 |
| Flush | 2:1 |
| Full house | 3:1 |
| Four of a kind | 10:1 or 20:1 |
| Straight flush | 20:1 or 50:1 |
| Royal | 100:1 |

If quads pay 20:1 instead of 10:1, the ante EV improves by a fraction of a percent. If the studio removes the straight bonus, the ante gets worse and some draw-heavy calls on the flop become slightly less correct. Copying a chart from a 20:1 quads table onto a 10:1 table is a small error. Copying a Caribbean Stud bonus onto holdem is a large one.

### What “pair of 4s” is doing

After the flop you have seen five of your seven cards (two hole + three community). A pair of 4s is a rough “this is ahead of a random dealer two” line, not a poker read. Ace-high calls are included on some charts because ace-high plus a live kicker still wins often enough against two random cards. Seven-deuce rainbow is not.

### Flop texture is not a bluff story

Three to a flush on the board does not let you “represent” a flush. The dealer does not fold. Texture only changes how often *your* made hand holds or how often you complete. There is no fold equity. People who played raked holdem for years donate here by calling “because I have a draw they will pay.” The dealer is not they. The dealer is a random two cards and a paytable.

### Worked bonus contrast

100 hands, $10 ante, charted play, 2.16% of ante: expected cost $21.60. Same 100 hands if the studio silently dropped the flush bonus and analysts would quote ~2.6%: expected cost $26. You cannot see that 0.44% on a twenty-hand sample. You can see it on the felt if you read the bonus column before you sit.

Live-studio holdem adds a camera and a higher minimum. Instant RNG adds speed. Neither rewrites the ladder. If the AA progressive is “must” according to the host, price it as a lottery ticket sitting next to a 2% ante — the same way you would price a keno slip next to banker.`,
    },
    {
      id: "limits",
      title: "AA buttons and knowing when to stand up",
      body: `Casino holdem feels like “real poker” enough to keep people calling off-chart and buying the pair bet. If you are raising the ante to chase a cooler or cannot skip the AA chip, stop.

Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). The [responsible gambling](/responsible-gambling) page is the on-site list.

This site is 18+. Knowing that rake and house edge are different prices is not a reason to post another ante.

Cap the number of antes, not “until I flop a set.” Eighty $10 antes is $800, expected keep about $18 at 2.2% if you chart the calls. That is a cheap table night until AA is on every row. If you want the pair lottery, buy ten $5 AA chips on purpose and stop — do not drip them. Folding on the chart is not cowardice. It is how the 2% quote exists. Calling 7-high because the dealer “looks weak” on camera is how you leave that quote.`,
    },
  ],
  faqs: [
    {
      q: "Is casino holdem the same as Texas Hold'em?",
      a: "Same hand ranks, different business. Casino holdem is you versus a paytable. Texas Hold'em cash is players versus players with a rake.",
    },
    {
      q: "What is the house edge on casino holdem?",
      a: "With a common ante-bonus sheet and a decent call chart, about 2.1% to 2.4% of the ante. Side bets are usually higher. Confirm the bonus column.",
    },
    {
      q: "Should I always call the 2×?",
      a: "No. Calling trash raises the cost. Folding too many live hands also wastes antes. Use a chart written for that paytable.",
    },
    {
      q: "Is the AA bet worth it?",
      a: "Only as a priced side product. Edges of several percent are common. It does not improve the ante math.",
    },
    {
      q: "Does PVPspinArena have casino holdem?",
      a: "No. PVPspinArena offers Jackpot, Coinflip and Roulette only. This guide is for house holdem tables you meet elsewhere.",
    },
    {
      q: "Does a live dealer change the holdem edge?",
      a: "No. The camera changes pace and trust. The paytable still sets the keep.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: Casino Hold'em",
      url: "https://wizardofodds.com/games/casino-hold-em/",
    },
    { label: "Wikipedia: Casino hold 'em", url: "https://en.wikipedia.org/wiki/Casino_hold_%27em" },
    { label: "Wikipedia: Texas hold 'em", url: "https://en.wikipedia.org/wiki/Texas_hold_%27em" },
  ],
  related: [
    "online-casino-games",
    "crypto-poker",
    "how-to-play-poker",
    "house-edge",
    "live-dealer-casino",
  ],
  updated: "2026-09-26",
};
