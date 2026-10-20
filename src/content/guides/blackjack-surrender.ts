import type { Guide } from "./types";

export const guide: Guide = {
  slug: "blackjack-surrender",
  cluster: "Blackjack",
  keyword: "blackjack surrender",
  secondary: ["blackjack surrender rules", "blackjack surrender odds", "blackjack surrender payout"],
  title: "Blackjack Surrender: NJ Rules, Half Back, Late Timing",
  description:
    "Blackjack surrender under New Jersey 13:69F-2.8: when half the wager returns, how dealer ace and ten checks work, and what the payout does to bad totals.",
  h1: "Blackjack surrender: half back, early order, and dealer checks",
  answer:
    "Blackjack surrender ends a hand after two cards for half back: you lose half the main wager and keep half. New Jersey 13:69F-2.8 prints settlement when the dealer shows an ace or ten. Not every felt offers it, and a posted blackjack surrender rule card beats memory.",
  facts: [
    "Last tested 20 October 2026. We did not play a shoe, open a casino account, or time a cash-out.",
    "N.J.A.C. 13:69F-2.8 lets a player discontinue a hand by surrendering one-half the wager after two cards and an announced total.",
    "When the dealer’s first card is not an ace or ten-value, the dealer immediately collects half and returns half.",
    "When the dealer’s first card is an ace or ten-value, settlement waits until the hole card is revealed.",
    "A casino may offer the surrender option at its discretion, except on 6:5, progressive, or multiple-action tables listed in that section.",
    "A printed house-edge percent for surrender alone is not published on the New Jersey PDF we opened.",
  ],
  sections: [
    {
      id: "rules",
      title: "Blackjack surrender rules in the New Jersey text we opened",
      body: `Regulation 13:69F-2.8 sits in the New Jersey Chapter 69F blackjack subchapter we pulled from the official PDF. The rule is late surrender in practice: you still see both of your cards and hear your total before you may exit.

You must decide before you signal double down, split, stand, or draw. That order matters because surrender is a fork in the road, not a rescue after you have already asked for cards.

### What the dealer does with your chips

If the dealer’s first up-card is neither an ace nor a ten-value card, the dealer immediately collects half of your wager and returns the other half. You are done with that hand for the round.

If the dealer’s first card is an ace or a ten-value card, the dealer places your wager on top of your cards until the hole card is shown. If the dealer has a natural, the entire wager is collected. If the dealer does not have a natural, half is collected and half is returned.

Insurance and surrender settle separately if you took both. Where the pit posts blackjack surrender, the half-back line in 13:69F-2.8 is the contract you are buying.

The [blackjack guides hub](/guides/topics/blackjack) collects the rest of the cluster. [Blackjack rules](/guides/blackjack-rules) covers the wider deal loop.`,
    },
    {
      id: "payout",
      title: "Half-back payout: always half, never a bonus",
      body: `The surrender payout is not a side prize. You are not paid odds on a winning hand. You are buying out of a bad spot at a fixed price: one-half of the original main-box wager.

On a $40 main box, a accepted exit returns $20 and costs $20. On a $100 main box, $50 comes back. The dealer does not deal further cards to a surrendered hand.

### Compared with a full loss

Losing the full wager costs 100 cents on the dollar. Surrender costs 50 cents on the dollar before the rest of the shoe is seen. That is why strategy grids treat surrender as the least-bad line on some hard 15s and 16s against strong dealer up-cards.

The New Jersey section does not print a separate fee or vig on top of the half-forfeit. The price is the half itself.

| Outcome on a $100 main box | Cash returned | Cash kept by house | Cards dealt after decision |
|---|---|---|---|
| Full loss | $0 | $100 | however many you took |
| Blackjack surrender (accepted) | $50 | $50 | none on that hand |
| Push | $100 | $0 | full hand played |
| Win at 1 to 1 | $200 | −$100 net to house | full hand played |
| Natural at 3 to 2 | $250 | −$150 net to house | usually none |

A 6:5 natural column is not published in the surrender section we opened. Treat 3:2 as the default named elsewhere in Chapter 69F.`,
    },
    {
      id: "when",
      title: "When casinos may refuse the button",
      body: `The blackjack surrender option is optional for the licensee. The New Jersey text says a casino may offer it except where other rule bundles forbid it.

Multiple-action blackjack, any table with 6:5 naturals, and any table with the progressive blackjack wager listed in 13:69F-2.19 must not offer surrender. Starting or stopping the option requires notice under 13:69F-8.3, which we did not reproduce here.

Nevada approved-game PDFs we opened describe surrender only inside named variants such as Dynasty Live Blackjack, where half of the original bet returns if the dealer has no natural. A single “standard Nevada blackjack” surrender sheet is not published in those files.

If the felt does not post surrender, the strategy cells that say surrender revert to hit or stand. Playing as if half-back existed when it does not is an own-goal.

The [felt map for dice](/guides/craps-table-layout) is a sibling page with a different game, but the same habit applies: read the posted rule card before you assume a button exists.`,
    },
    {
      id: "odds",
      title: "Surrender odds on ugly totals (teaching math only)",
      body: `Surrender value is not a lottery ticket. It is the comparison between losing one full unit for sure on a bad total versus losing half a unit now and never seeing another card.

Take hard 16 versus a dealer 10 on a multi-deck game that allows late surrender. Standing loses most of the time. Hitting busts often. Surrender locks in −0.5 units instead of risking −1.

### Teaching arithmetic, not a casino quote

If standing loses 77 cents per dollar on average for that cell, surrender at −50 cents is cheaper. If hitting loses 54 cents per dollar, surrender is still cheaper. Those cent figures are familiar teaching numbers from strategy books; a percent for that exact cell is not published on the New Jersey PDF.

The [published decision grid](/guides/blackjack-basic-strategy) marks surrender on some 15s and 16s against 9, 10, and ace when the rule exists. This page does not reprint that grid. It explains the half-back contract the grid assumes.

| Player hard total vs dealer 10 (surrender allowed) | Approx. cost of standing | Approx. cost of hitting | Cost of half-back exit |
|---|---|---|---|
| 16 | about −$0.77 per $1 at risk | about −$0.54 per $1 | −$0.50 per $1 |
| 15 | about −$0.77 per $1 | about −$0.58 per $1 | −$0.50 per $1 |
| 12 | not a surrender cell | about −$0.37 per $1 | not offered |

Percent cells in the middle columns are teaching arithmetic, not quotes from the regulator PDF.`,
    },
    {
      id: "dollars",
      title: "Three dollar examples on the half-back price",
      body: `### Example A. $24 main box, dealer shows a 7

Regulation 13:69F-2.8 would let you surrender if the table offers it. Half back is $12. You keep $12 and the hand ends. We did not play this hand on 20 October 2026.

### Example B. $80 main box, dealer shows an ace

The dealer places the wager on your cards until the hole card appears. If the hole is not a ten-value card, half ($40) is collected and half ($40) returns. If the dealer has a natural, the full $80 is lost unless you also have a natural that pushes.

### Example C. Two $50 Coinflip stakes on this site

PVPspinArena does not deal blackjack. Two $50 Coinflip stakes make a $100 pot, the fee is $5, and the winner receives $95. That is a player-versus-player pot, not a half-back exit on sixteen.`,
    },
    {
      id: "checklist",
      title: "Checklist before you slide cards for half back",
      body: `Use this list at a live felt or before you click an online lobby that claims the rule.

- [ ] The table posts that half-back is in play, not just 6:5 or progressive links.
- [ ] I have exactly two cards and have heard my total announced.
- [ ] I have not yet signaled hit, stand, double, or split for this hand.
- [ ] I know half of my main wager is the price, not a partial win.
- [ ] I know dealer ace or ten up-cards delay settlement until the hole card shows.
- [ ] I know insurance, if taken, settles separately from surrender.
- [ ] I have matched the exit to the decision grid for this rule set, not a grid from another felt.
- [ ] I know a printed surrender house-edge percent is not published on the NJ PDF we opened.
- [ ] I am of legal age where I stand, and I can afford to lose the half I forfeit.
- [ ] If play stops feeling like entertainment, I will stop and call 1-800-GAMBLER.

Rail gestures for the same decisions are covered on the sibling page for [dealer-readable motions](/guides/blackjack-hand-signals).`,
    },
    {
      id: "compare",
      title: "House half-back versus a player pot here",
      body: `Half-back on blackjack is a house-banked contract on one felt. PVPspinArena does not book sports and does not deal cards.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
|---|---|---|---|---|---|
| NJ blackjack surrender (half back) | fixed −50% of the main wager when accepted; edge on the full game is not published here | the house | not published | not published | not published |
| Typical house blackjack (no surrender) | leftover edge often quoted near 0.5% on clean 3:2 S17; not verified here | the house | not published | not published | not published |
| PVPspinArena Roulette | about 7.88% on Purple or Silver after the 5% fee on wins | another player | not published; cash-out minimum is $20 | check published on fairness page | not published per color |
| PVPspinArena Coinflip | 5% of the pot | another player | not published; cash-out minimum is $20 | check published on fairness page | $1 |

Roulette here uses 33 slots: 16 Purple and 16 Silver pay 2x, 1 Green pays 14x, and 5% comes off a winning payout. P2P Slot takes 10 percent of a winning pot.

How PvP compares: you are matched to another stake, not buying out of a dealer total. Read the [fairness](/fairness) check and open [Roulette](/roulette) if you want a timed pot instead of a felt.

Anyone under the local gambling age should not play. Anyone staking rent money should not play. If the session is about chasing losses, use [responsible gambling](/responsible-gambling) and call 1-800-GAMBLER.`,
    },
    {
      id: "chart",
      title: "Where surrender sits next to the full chart",
      body: `Surrender is one row in a larger matrix. The matrix depends on decks, soft seventeen, double-after-split, and whether half-back exists.

When surrender is absent, the same totals against a ten might become a hit or a stand in the grid. Copying blackjack surrender cells onto a table that forbids the option adds cost, not courage.

[How to play blackjack](/guides/how-to-play-blackjack) walks the deal order. [House edge](/guides/house-edge) explains why even perfect exits still leave a price on the game. [When to split pairs](/guides/when-to-split-blackjack) covers forks that must happen before you can surrender.

We did not open an account here. We did not time a withdrawal. Minimum bet on this site’s Coinflip is $1; blackjack minimums on Atlantic City felts are not published in the PDF slice we used.`,
    },
  ],
  faqs: [
    {
      q: "What is blackjack surrender in plain terms?",
      a: "It is an optional exit after two cards and an announced total. You forfeit half the main wager and keep half, and the hand ends. New Jersey 13:69F-2.8 prints how dealers settle chips when the up-card is or is not an ace or ten. The casino must post the option, and some variants forbid it.",
    },
    {
      q: "What is the half-back payout on a main box?",
      a: "Half of the original main-box stake returns to you and half is collected. It is not a bonus odds pay like a natural at three to two. On a $60 wager, $30 comes back. The New Jersey rule does not add a separate fee on top of that half-forfeit price.",
    },
    {
      q: "How do regulator rules treat a dealer ace?",
      a: "When the dealer’s first card is an ace or ten-value, 13:69F-2.8 places your wager on your cards until the hole card is shown. If the dealer has a natural, the full wager is collected. If not, half is collected and half is returned. You must choose before other actions, and insurance settles separately if you took it.",
    },
    {
      q: "Does half-back make the whole game positive?",
      a: "It improves specific cells by replacing a likely full loss with a half loss. It does not remove the dealer’s structural edge on the entire game. Teaching math on sixteen versus ten stays negative without the exit; with it the line is merely less negative. No regulator PDF we opened prints one percent for the full game.",
    },
    {
      q: "Does PVPspinArena offer blackjack surrender?",
      a: "No. PVPspinArena does not deal cards or take half-back exits. Comparisons here use Coinflip at five percent of the pot, Roulette on thirty-three slots, and the published fairness check. Cash-out minimum is twenty dollars in BTC, USDC, or ETH. We did not open an account or time a cash-out on twenty October twenty twenty-six.",
    },
    {
      q: "Who should avoid relying on the exit?",
      a: "Anyone at a table that does not post the option should ignore surrender cells in a chart. Anyone under the legal gambling age where they stand should not play. Anyone who cannot afford to lose half a stake without missing a bill should not play. If play stops feeling like entertainment, stop and call 1-800-GAMBLER.",
    },
  ],
  sources: [
    {
      label: "New Jersey Division of Gaming Enforcement, Chapter 69F rules of the games (blackjack, N.J.A.C. 13:69F-2.8 surrender)",
      url: "https://www.nj.gov/lps/ge/docs/Regulations/CHAPTER69F.pdf",
    },
    {
      label: "Nevada Gaming Control Board, IGT Dynasty Live Blackjack rules of play (surrender wording)",
      url: "https://www.gaming.nv.gov/siteassets/content/divisions/enforcement/rules-of-play/IGT_Dynasty_Live_Blackjack.pdf",
    },
    {
      label: "Nevada Gaming Control Board, Rules of Play for Approved Games index",
      url: "https://www.gaming.nv.gov/divisions/gaming-lab/approved-games/",
    },
  ],
  related: [
    "blackjack-basic-strategy",
    "blackjack-hand-signals",
    "craps-table-layout",
    "blackjack-rules",
    "house-edge",
    "how-to-play-blackjack",
  ],
  updated: "2026-10-20",
};
