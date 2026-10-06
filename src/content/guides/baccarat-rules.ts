import type { Guide } from "./types";

export const guide: Guide = {
  slug: "baccarat-rules",
  cluster: "Casino games",
  keyword: "how to play baccarat",
  secondary: ["baccarat rules", "baccarat banker bet", "baccarat house edge", "player vs banker"],
  title: "How to Play Baccarat: Rules, Bets and Edges",
  description:
    "How to play baccarat: player, banker and tie rules, the third-card tableau, and why banker is about 1.06% while tie is a much fatter price.",
  h1: "How to play baccarat: banker, player, tie and the real edges",
  answer:
    "How to play baccarat is simpler than the tuxedos suggest. You bet player, banker or tie before any cards. Each side gets two cards; a third may be drawn from a fixed tableau. Nines beat eights; hands are modulo 10. Banker at 5% commission is about a 1.06% house edge, player about 1.24%, and a typical 8:1 tie about 14.4%. PVPspinArena does not offer baccarat — only Jackpot, Coinflip and Roulette.",
  howTo: true,
  facts: [
    "You do not choose hits. The tableau decides every third card.",
    "Banker with a 5% commission is about 1.06% house edge; player is about 1.24%.",
    "A common 8:1 tie bet is about 14.4% — a side price, not a “lucky” third option.",
    "Eights or nines on the first two cards are naturals; no third card is drawn.",
    "PVPspinArena does not offer baccarat; Jackpot, Coinflip and Roulette are the live games.",
  ],
  sections: [
    {
      id: "steps",
      title: "The round, step by step",
      body: `Baccarat is a comparison of two hands. You pick a side before the deal. You do not play the cards.

### What to do

1. Choose **player**, **banker** or **tie** (or a pair side bet if the table offers one).
2. Two cards go to player, two to banker, face up on most online and live tables. A slow peel of those cards is a [baccarat squeeze](/guides/baccarat-squeeze). The peel changes the pace. It does not change the draw rules below.
3. Totals use pip value: ace = 1, 2–9 = face, 10 and face cards = 0. Only the last digit counts: 7+8 = 15 → 5.
4. A two-card 8 or 9 is a **natural**. Neither side draws.
5. Otherwise the tableau may give player a third card, then banker, using fixed rules.
6. Closer to 9 wins. Equal totals are a tie: player and banker bets push; a tie bet pays.

That is the whole skill surface: pick a box. The rest is arithmetic. This guide sits in the [casino games topic](/guides/topics/casino-games) and is for adults 18+.

Side bets named after dragons, pandas or lucky sevens are not secret banker strategy. They are new events with their own p and r. If the overlay will not show those pays until you hover a tiny icon, hover it before the first chip. A 1.06% banker session plus an unpriced dragon on every hand is a keno sandwich. The tuxedo does not change the invert.

### Why banker is not “the house”

Banker is a betting box named after the old bank. The casino still banks every chip. A banker win usually pays 1:1 minus 5% commission (you receive 0.95 profit on a 1-unit win). That commission is how a slightly favoured side still carries a house edge.

Naturals (two-card 8 or 9) end the hand immediately. They are common enough that a lot of a shoe never touches the tableau. That does not make them “due.” It makes the game fast. Fast plus a $50 chip is how a 1.06% box still spends a night. Count hands, not “one more natural.”`,
    },
    {
      id: "tableau",
      title: "The third-card tableau, without folklore",
      body: `You will see charts. They are not strategy. They are the law of the table.

### Player

- Player total 0–5: draws a third card.
- Player total 6–7: stands.
- Player 8–9: natural; no draw.

### Banker (depends on player’s third card)

- If player stood, banker draws on 0–5 and stands on 6–7.
- If player drew, banker uses a published grid: for example banker 3 draws unless player’s third card is 8; banker 6 draws only if player’s third is 6 or 7. Memorising the grid does not change your edge. It only explains why a given card appeared.

### Naturals beat draws

If either two-card hand is 8 or 9, the other side does not draw even if it sits on 0–5. People who “read” the next card as due are applying the [gambler's fallacy](/guides/gamblers-fallacy) to a shoe that does not owe them a nine.`,
    },
    {
      id: "edges",
      title: "Banker, player, tie: the odds table",
      body: `Standard eight-deck figures (commission banker, tie pays 8:1) are the ones most guides mean. Exact digits move a few hundredths with six decks or a different commission.

| Bet | Approx. win rate (ties excluded or handled) | Typical pay | House edge |
| --- | --- | --- | --- |
| Banker | Banker wins slightly more than player | 1:1 minus 5% | About 1.06% |
| Player | Slightly less often than banker | 1:1 | About 1.24% |
| Tie | About 9.5% of hands | 8:1 (9x total) | About 14.4% |
| Tie at 9:1 | Same event | 9:1 | About 4.8% |
| No-commission banker (6 pays half) | Same comparison | Special 6 rule | Often ~1.46% |
| Player pair / banker pair | First two cards pair | Posted, often 11:1 | Often ~10%+ |

Banker is the cheapest main box under common rules. Player is close. Tie at 8:1 is a different product. Pair bets are closer to keno than to the 1% story.

Write the identity from [RTP explained](/guides/rtp-explained): banker RTP ≈ 98.94%. That is not a 99% chance you walk away ahead after a shoe.`,
    },
    {
      id: "worked",
      title: "Worked example: $20 banker for 200 hands",
      body: `You bet $20 on banker, 200 times. Turnover = $4,000. At 1.06% the expected cost is about $42.40.

In those 200 hands, roughly 19 are ties (about 9.5%). Those $20 chips come back. The other hands resolve player or banker. Commission is taken only on banker *wins*, which is why the edge is not “5% of every bet.”

Same 200 hands on player: expected cost about $49.60. Same 200 on an 8:1 tie at $20: $4,000 × 14.4% ≈ $576 expected cost. The tie chip is not a hedge. It is a high-edge lottery ticket sitting next to two cheap boxes.

### Commission arithmetic

Win $20 on banker at 5%: the table pays $19 profit plus your $20 back, or $39 total, depending on how the UI writes it. Either way you are shorted $1 versus even money. That $1, averaged with losses and pushes, becomes the 1.06%.

If you want a 50/50 that actually pays 2x on a player pot, that is [Coinflip](/coinflip), not a banker box.`,
    },
    {
      id: "variants",
      title: "Variants and side bets that rewrite the price",
      body: `**No-commission / super six.** Banker wins on a 6 pay half (or a similar haircut). The 5% chip disappears; a fatter rule takes its place. Edge is often near 1.5%, not 1.06%.

**Dragon bonus, lucky six, big/small, either pair.** These use subsets of the shoe. Edges of several percent to more than 10% are common. They are not “baccarat with flavour.” They are new bets.

**Live versus instant.** A [live dealer casino](/guides/live-dealer-casino) shoe is slower and filmed. An RNG instant table can deal hundreds of hands an hour. The 1.06% does not shrink because the host is on camera. Pace multiplies dollar cost. See the [online casino games](/guides/online-casino-games) pillar for that turnover point.

**Pattern boards.** Bead plates and “ask the dragon” roadmaps record the past. They do not change the next two-card total. Do not raise the banker chip because the plate is “due.”`,
    },
    {
      id: "not-here",
      title: "PVPspinArena does not offer baccarat",
      body: `There is no player/banker grid here. The live games are Jackpot, Coinflip and Roulette.

- [Jackpot](/) — chance = your stake / pot.
- [Roulette](/roulette) — 33 slots, about 7.88% on Purple or Silver and about 59.70% on Green after the 5% win fee.
- [house edge](/guides/house-edge) — the same p × r arithmetic as banker commission.

Use this how-to when you meet a baccarat table elsewhere. Sit only if you can point at banker or player and say the edge out loud. If the only empty seats are tie and pairs, you do not have a baccarat problem. You have a product-selection problem.

A 400-hand live shoe at $25 banker is $10,000 through the box, expected cost about $106 before pair chips. The same $25 on an 8:1 tie for even 40 “hunches” is $1,000 through a 14.4% ticket, expected cost about $144 — more keep than the entire cheap shoe. Streams sell the hunch. The tableau does not care. If you came from [online casino games](/guides/online-casino-games) looking for a low-edge table, banker and player are that table. Tie is a keno slip in a tuxedo.`,
    },
    {
      id: "shoe",
      title: "Shoes, cashiers and the myth of the streak",
      body: `An eight-deck shoe has 416 cards. About 9.5% of hands tie. Banker still wins a bit more than player over the long run because of the tableau, not because the last five hands were banker.

### What a shoe does not do

After five banker wins, the next hand is not “due” player. Composition effects exist in theory — cards leave the shoe — but they are small, they require counting a very specific imbalance, and online shoes are often shuffled often enough to erase them. Pattern boards (big road, bead plate, cockroach pig) are scoreboards. They are not a third-card predictor.

### Commission in the cashier

Some UIs hide the 5% until you leave. You can sit “up $80” on banker and cash $76 after commission. That is honest, not a gotcha, if you knew the rule. If the cashier rounds commission against you on every small win ($1 on a $15 win is 6.7%, not 5%), the real edge is worse than 1.06%. Check how they take the 5%.

### Six-deck versus eight

Moving from eight decks to six changes banker and player edges by a few hundredths. It does not turn the game. What turns the game is paying tie at 8:1 versus 9:1, or switching to no-commission half-pay on six.

### Worked commission rounding

One hundred banker wins at $10. Clean 5% is $50 of commission. If the site always rounds the 5% up to the next $0.50, you might pay $0.50 on each $10 win instead of $0.50 exactly — same — but on $12 wins a $0.60 charge that becomes $1.00 is a real leak. Multiply that leak by a fast live shoe and the 1.06% story is incomplete.

If you want a result with no commission fiction, a 0% fee [Coinflip](/coinflip) pays 2x or nothing. It is not baccarat. It is a cleaner sentence.`,
    },
    {
      id: "limits",
      title: "Commission, shoes and knowing when to stand up",
      body: `Baccarat’s low main-bet edges still eat a bankroll when the shoe is fast or the chip is large. Commission also hides in the cashier: you can be “up” on banker wins and down after the 5% is taken.

Pre-set a hand count and a loss cap. Do not add tie chips to “use the streak.” If you cannot leave a filmed table, use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). The [responsible gambling](/responsible-gambling) page is the on-site list.

This site is 18+. Learning the tableau is not a reason to open a new shoe.

Budget the shoe as turnover. 80 banker chips at $15 is $1,200, expected keep about $13 at 1.06%. 80 player chips is about $15. 20 tie chips at $15 is $300 through 14.4%, about $43 — more than three cheap shoes. If you cannot name which of those three you are buying, you are not playing baccarat. You are clicking a grid. Pre-count the hands, skip pairs, and leave when the count hits zero, not when the bead plate looks “ready.” The tableau will still be there tomorrow. Your cashier may not.

Once the rules are clear, [baccarat strategy](/guides/baccarat-strategy) is mostly “banker, skip the tie.”

Playing the same game with a wallet is [crypto baccarat](/guides/crypto-baccarat).`,
    },
  ],
  faqs: [
    {
      q: "How do you play baccarat?",
      a: "Bet player, banker or tie before the deal. Two cards each; a third may appear from the tableau. Highest total modulo 10 wins. You never choose hits.",
    },
    {
      q: "Why is banker better than player?",
      a: "Banker wins slightly more often because of how the third-card rules work. The 5% commission turns that small advantage into about a 1.06% house edge, still cheaper than player’s 1.24%.",
    },
    {
      q: "Should I bet the tie?",
      a: "Only if you are paying for a long-shot ticket. At 8:1 the house edge is about 14.4%. It is not a hedge for player or banker.",
    },
    {
      q: "Does the tableau give me a decision?",
      a: "No. The tableau is automatic. Memorising it explains the deal; it does not create an edge.",
    },
    {
      q: "Does PVPspinArena have baccarat?",
      a: "No. PVPspinArena offers Jackpot, Coinflip and Roulette only. This how-to is for tables you meet elsewhere.",
    },
    {
      q: "Is no-commission baccarat a better deal?",
      a: "Usually not. The missing 5% is replaced by a rule such as half-pay on banker 6, which often raises the banker edge above 1%.",
    },
  ],
  sources: [
    { label: "Wizard of Odds: baccarat", url: "https://wizardofodds.com/games/baccarat/basics/" },
    { label: "Wikipedia: Baccarat", url: "https://en.wikipedia.org/wiki/Baccarat" },
    {
      label: "Wikipedia: House advantage",
      url: "https://en.wikipedia.org/wiki/Casino_game#House_advantage",
    },
  ],
  related: [
    "online-casino-games",
    "live-dealer-casino",
    "house-edge",
    "hi-lo-card-game",
    "crypto-blackjack",
    "baccarat-strategy",
    "crypto-baccarat",
  ],
  updated: "2026-09-26",
};
