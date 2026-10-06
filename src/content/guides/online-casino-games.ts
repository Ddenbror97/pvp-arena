import type { Guide } from "./types";

export const guide: Guide = {
  slug: "online-casino-games",
  cluster: "Casino games",
  pillar: true,
  keyword: "casino games",
  secondary: ["online casino games", "casino lobby", "rtp vs house edge", "table games vs slots"],
  title: "Casino Games Online: Lobby Types, RTP and Edge",
  description:
    "How to read casino games in an online lobby: table, live, RNG and specialty tiles, plus how RTP and house edge describe the same price.",
  h1: "Casino games: lobby taxonomy and how to read RTP",
  answer:
    "Casino games in an online lobby are not one product. Table tiles, live-dealer streams, instant RNG originals and slots all price risk differently. RTP is the long-run share of stakes paid back; house edge is 100% minus that number. Read the paytable or rule sheet, not the thumbnail. PVPspinArena does not offer a casino lobby — only Jackpot, Coinflip and Roulette — so this page is a map for games you meet elsewhere.",
  facts: [
    "A lobby tile is a marketing label; the price lives in the rule sheet, paytable or posted segments.",
    "RTP and house edge are the same measurement written from opposite sides: RTP + edge = 100%.",
    "Side bets and novelty buttons usually carry a much higher edge than the main box.",
    "Live-dealer and RNG versions of the same name can share an edge and still feel nothing alike.",
    "PVPspinArena does not offer these casino games; the live products are Jackpot, Coinflip and Roulette.",
  ],
  sections: [
    {
      id: "taxonomy",
      title: "A lobby taxonomy you can actually use",
      body: `Open a typical casino home page and you will see dozens of tiles. Group them by how the result is produced and who banks the bet, not by art.

### Four buckets

1. **Table games (RNG).** Baccarat, blackjack, craps, casino holdem, wheels. A generator deals or rolls; the house pays a published schedule.
2. **Live dealer.** A studio films a human deal or spin. The maths is still the table’s maths. You are trusting a camera and a studio, not a PvP pot.
3. **Slots and video.** Thousands of symbol states. You cannot napkin-math RTP; you read the info panel. See [crypto slots](/guides/crypto-slots).
4. **Instant originals.** Dice sliders, mines, limbo, crash, towers, hi-lo. Fast rounds, one curve, a house edge inside the payout.

This [casino games topic](/guides/topics/casino-games) is the cluster for those house-banked products. Poker rooms that take a rake are a different business: players play each other. Do not file them next to a banker bet.

### What the thumbnail never says

The art does not tell you decks, commission, segment counts or whether a “wheel” is a money wheel or a slot bonus. Click through. If the help screen will not give probabilities and payouts, you cannot complete a price sentence. Our [house edge](/guides/house-edge) and [RTP explained](/guides/rtp-explained) pages are the two ways to write that sentence.

PVPspinArena is for adults aged 18 and over. Nothing on this page is a ranking of casinos.`,
    },
    {
      id: "read-rtp",
      title: "How to read RTP and house edge on a tile",
      body: `RTP (return to player) is the long-run share of turnover paid back. House edge is the keep-rate. They are complements.

Expected return per $1 = sum of (probability × total payout). House edge = 1 − that sum. RTP is the same figure as a percentage.

### A lobby-style comparison

| Product type | What you can count | Typical published keep | What people misread |
| --- | --- | --- | --- |
| Baccarat banker | Cards + 5% commission | About 1.06% | “Banker always wins” |
| Blackjack, strong rules | Felt + a chart | About 0.4% to 0.6% | 6:5 tables sold as “low edge” |
| European roulette red | 18/37 × 2 | 2.70% | “Almost 50/50” |
| Money wheel $1 | Posted segments | Often ~11% | The logo looks friendlier than craps |
| Keno, multi-spot | 80-ball paytable | Often 20%+ | Jackpot line hides the rest |
| Video slot | Info-panel RTP | Often 2% to 8% | “96% chance to win” |
| Crash / tower cash-out | P(reach m) × m | Often 1% to 5% | Timing feels like skill |

A 96% slot is a 4% edge. It is not a 96% chance that you finish ahead. Hit rate and payout size are separate from return. That split is the whole point of the RTP guide.

### Variable RTP

Some studios ship several RTP settings. “Up to 96.5%” may be configured at 94% on the instance you opened. Believe the panel in front of you, not the store listing.`,
    },
    {
      id: "worked",
      title: "One numeric hour: same $600, different keep",
      body: `Turnover is what the percentage applies to, not your deposit.

Imagine you bring $150 and place 60 bets of $10. You have wagered $600. Expected cost ≈ edge × $600.

- Banker baccarat at 1.06%: about $6.36.
- European red at 2.70%: about $16.20.
- PVPspinArena Purple at about 7.88% after the win fee: about $47 on $600 wagered. You can count 16 of 33 slots on the live [Roulette](/roulette) wheel: 16/33 × 2 = 0.9697 before the fee.
- A 25% keno ticket: about $150 — the whole session budget on average.

Those four hours can look equally “busy” on a stream. They are not the same purchase. Fast instant games inflate the bet count, so a 1% crash or dice slider can cost more dollars than a slower 1% baccarat shoe because you fit more $10 decisions into the hour.

### Worked slider versus table

A [crypto dice](/guides/crypto-dice-game) roll-under 50 at 1% edge pays about 1.98x. One hundred $10 rolls: $1,000 wagered, expected cost about $10. Same $10 stake on banker once a minute for 100 minutes is also $1,000 wagered, expected cost about $10.60. The prices are close. The session feel is not: the slider resolves in a second; the shoe does not. Pace is a cost multiplier, not a strategy.`,
    },
    {
      id: "table-vs-instant",
      title: "Table names versus instant originals",
      body: `A tile labelled with a classic name should still be checked against the classic rules.

### Tables with a paper trail

[How to play baccarat](/guides/baccarat-rules), [craps odds](/guides/craps-odds) and [crypto blackjack](/guides/crypto-blackjack) are games where a published combination count plus a payoff schedule gives you the edge. If the site changes commission, blackjack payout or come-out rules, the banner number is fiction.

### Instant games that borrowed a vibe

Towers, dice duels, hi-lo and double-or-nothing often use a classic word and a new curve. Price the curve. A “dice” slider is not two cubes; the combination table is in [dice roll probability](/guides/dice-roll-probability). A tower that climbs like [crash gambling](/guides/crash-gambling) is a ladder of short-paid survival odds, not a skill climb.

### Live versus RNG of the same name

A live baccarat table and an instant baccarat table can share the 1.06% banker edge and still differ in shuffle, speed and whether you can audit the deal. Live is a trust-the-studio product. Hashed RNG is a trust-the-formula product. Neither is a player pot.`,
    },
    {
      id: "not-here",
      title: "What PVPspinArena actually offers",
      body: `There is no slots grid, no baccarat pit and no money wheel on this site. The live games are Jackpot, Coinflip and Roulette.

- [Jackpot](/) — your chance equals your share of a visible pot. With a 0% fee, expected return between players is 100%.
- [Coinflip](/coinflip) — two equal stakes, one 50/50 result. Default fee 0%.
- [Roulette](/roulette) — 33 slots. Purple and Silver return 32/33 before the win fee; Green returns 14/33.
- [Fairness](/fairness) — recompute a committed result.

Those three are the product. This pillar exists so a lobby full of other names does not get filed as “the same as Jackpot.” A house-banked tile is you versus a paytable. A PvP pot is you versus other players’ stakes.

### 18+ and no rankings

This site is 18+ only. We will not list “best casinos,” “best slots” or “best live lobbies.” If a page’s job is to rank operators, it is not this page. Use the rule sheet, then walk.`,
    },
    {
      id: "checklist",
      title: "A five-minute lobby checklist",
      body: `Before you click a tile that is not Jackpot, Coinflip or Roulette:

1. **Who banks?** House paytable, live studio, or other players?
2. **What is the sample space?** Cards, 36 dice pairs, 80 keno balls, 54 wheel pegs, or a 0–100 slider?
3. **What is the posted r?** Even money, 8:1 tie, 14x green, 1.98x slider?
4. **Is there a side bet?** Price it separately. It is usually worse.
5. **Is RTP configurable?** Read this instance.
6. **How fast is a round?** Multiply edge by bets per hour, not by “I only deposited $40.”

If you cannot answer 1–3, you do not know the price. If the help file talks only about themes and jackpots, treat the tile as unread.

### Side bets in one line

Insurance, perfect pairs, lucky six, extra wheel wedges and “plus” buttons are almost always a second, fatter edge. The main-bet marketing number does not cover them. Skip them unless you are paying for a specific, disclosed entertainment and you have written p × r.`,
    },
    {
      id: "bonuses",
      title: "Bonuses, wagering and other lobby lies",
      body: `A tile’s RTP is the game. A banner’s “200% match” is a coupon with homework. They are not interchangeable.

### Wagering is extra turnover

If a $100 bonus needs 30× wagering on slots, you must put $3,000 through a paytable before the coupon unlocks. At 96% RTP the expected leftover on that $3,000 is $2,880, so the $100 of “free” is fighting a $120 theoretical keep — and that ignores max-bet clauses, excluded games and time limits. The coupon can still be fun. It is not a +EV voucher.

### Game weighting

Many offers count roulette or blackjack at 5% or 0% toward wagering. The lobby will still show those tiles next to the bonus. If you clear a slot-weighted offer on banker baccarat, you may not be clearing it at all. Read the contribution table, then decide whether the hour is worth it.

### Cashback and VIP

Cashback is a rebate on losses, usually net, often weekly, sometimes excluding bonuses. 10% cashback on a Purple or Silver bet does not make the wheel +EV. It slightly reduces the keep if you would have played anyway. VIP multipliers are the same idea with a longer leash. Neither is a reason to raise stake.

### “Best casino games” lists

Those lists sell affiliate links. They will not tell you that a money-wheel logo is 24% or that a 6:5 live blackjack felt is a 2% game. This pillar will not rank operators. It will keep telling you to write p × r.

A worked coupon hour: $50 bonus, 20× playthrough, 96% slot. Turnover required $1,000. Expected return on that turnover about $960. Expected bonus residue −$40 before you even touch the deposit. If you also churn the $50 deposit at the same RTP, add another $1,000 of turnover and another $40 of expected keep. The “free $50” can easily be a $80 evening. That arithmetic belongs next to the taxonomy, not in a promotions tab.

If a lobby hides contribution, max bet while bonus-active, or the instance RTP, treat the tile as unread. The [casino games topic](/guides/topics/casino-games) is for prices, not for coupon folklore.`,
    },
    {
      id: "limits",
      title: "Limits, harm and when to close the lobby",
      body: `A clean taxonomy does not make a session healthier. Fast originals are built to raise turnover. Live tables are built to keep you in the chair. Slots are built to hide the sample size.

Set a money cap and a time cap before the first click. Count total wagered, not the cashier balance. If you are chasing a thumbnail, raising stakes after a loss, or hiding the tab, stop. Use [how to stop gambling](/guides/how-to-stop-gambling) for a practical plan and [gambling self-exclusion](/guides/gambling-self-exclusion) if you need a lock that outlasts a mood.

The [responsible gambling](/responsible-gambling) page lists tools on this site. PVPspinArena does not offer the wider casino catalogue. If you came here from a lobby full of tiles, take the map, then decide whether any of those purchases are worth their keep-rate.

A few felt games are easy to misread from the name. [Pai gow poker](/guides/pai-gow-poker), [casino war](/guides/casino-war-game), [sic bo](/guides/sic-bo-online) and [pachinko odds](/guides/pachinko-odds) each hide the edge in a different rule. A crypto lobby that uses the same names is [crypto casino games](/guides/crypto-casino-games).`,
    },
  ],
  faqs: [
    {
      q: "What counts as an online casino game?",
      a: "Any house-banked or raked product sold in a casino lobby: tables, live streams, slots, instant originals. A PvP pot with a published fee is a different product even if it sits next to those tiles.",
    },
    {
      q: "How do I read RTP on a lobby tile?",
      a: "Treat RTP as 100% minus house edge. Confirm it from probabilities × payouts, or from the game’s info panel if the state space is too large to count. “Up to 96%” is not a promise for your instance.",
    },
    {
      q: "Are live dealer games better than RNG?",
      a: "They are slower and filmed. The edge is still the table’s edge. Live adds studio trust and latency; it does not turn the house into a player pot.",
    },
    {
      q: "Does PVPspinArena offer a full casino lobby?",
      a: "No. PVPspinArena offers Jackpot, Coinflip and Roulette only. This pillar explains how to read other casino games you will see elsewhere.",
    },
    {
      q: "Why do side bets matter?",
      a: "They usually have a much higher house edge than the main bet. A 0.5% blackjack box plus a 6% pair bet is not a 0.5% session.",
    },
    {
      q: "Is a 96% RTP a 96% chance to win?",
      a: "No. RTP is an average return on money wagered. Hit rate and prize size decide how often you finish ahead in a short session.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: house edge of casino games",
      url: "https://wizardofodds.com/gambling/house-edge/",
    },
    { label: "Wikipedia: Casino game", url: "https://en.wikipedia.org/wiki/Casino_game" },
    { label: "Wikipedia: Return to player", url: "https://en.wikipedia.org/wiki/Return_to_player" },
  ],
  related: [
    "live-dealer-casino",
    "baccarat-rules",
    "house-edge",
    "rtp-explained",
    "keno-odds",
    "crypto-blackjack",
    "crypto-casino-games",
    "online-craps",
  ],
  updated: "2026-09-26",
};
