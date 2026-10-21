import type { Guide } from "./types";

export const guide: Guide = {
  slug: "icm-poker",
  cluster: "Poker",
  keyword: "icm poker",
  secondary: [
    "independent chip model",
    "Malmuth-Harville",
    "tournament bubble equity",
    "chip chop",
  ],
  title: "ICM Poker: Dollar Price of a Short Bubble",
  description:
    "ICM poker prices a stack from chips and prizes. A published three-player case is about $45, $32, and $22. Skill and position stay outside the model.",
  h1: "ICM poker: what a short-handed bubble prices, and what the model ignores",
  answer:
    "ICM poker turns stacks and a prize list into expected prize money, assuming equal skill. The Wikipedia page, opened 20 October 2026, gives three players with 50%, 30%, and 20% of the chips about 45, 32, and 22 on prizes of 70 and 30. Read the units as dollars. That page is not a solver we ran.",
  facts: [
    "Last tested 20 October 2026 on the Wikipedia Independent Chip Model page and on arXiv 0911.3100. No solver was run.",
    "First place is weighted by chip share. Later places use the chips left after the players above them.",
    "The page's three-player case prints about 45, 32, and 22 against prizes of 70 and 30.",
    "Skill, seat, blinds, and the current cards are not inputs. Large fields are called computationally heavy.",
    "A permitted prize deal is not hole-card sharing. This page is not a collusion guide.",
    "Cash-game chips on this site are already dollars. The 5% flop fee is not a tournament price.",
  ],
  sections: [
    {
      id: "prices",
      title: "What ICM poker prices from stacks and prizes",
      body: `ICM poker is a price for an unfinished tournament, not a shuffled deck. The Wikipedia page, opened 20 October 2026, calls the formula the Malmuth-Harville method.

Stacks and the prize list are the inputs. Equal skill is the assumption, so a better player is not handed extra equity.

Your chance of first is your share of the chips. If someone else wins, the next place is shared from the chips that winner did not hold.

Expected money multiplies those paths by the prizes. The page says many simulators that suggest a shove range do not use the plain formula.

This note prints no range. It does not invent a solver output.

The [poker topic](/guides/topics/poker) is the hub. [Short-match seat order](/guides/heads-up-poker-strategy) is a different subject, because seat is an input the formula refuses.

Cash-game chips are already dollars, minus the fee. Tournament chips are only a claim on a prize list.`,
    },
    {
      id: "bubble",
      title: "A three-player bubble in the page's own units",
      body: `The worked case is short-handed ICM poker arithmetic from that page, not a new run. Three players remain, and third place pays nothing in the example.

Prizes are 70 units for first and 30 for second. Stacks are 50%, 30%, and 20% of the chips.

The page prints the big stack near 45, the middle near 32, and the short stack near 22. It also calls those about 90%, 110%, and 110% of each stack's chip share.

Dollar example 1 reads the units as dollars on a $100 pool.

First pays $70 and second pays $30. The page's figures put the stacks near $45, $32, and $22.

Chip shares of the same $100 would be $50, $30, and $20. The big stack is about $5 under its chip share, and the short stack is about $2 over.

Those gaps use the page's rounded figures. They are not a second model, and a different prize list would move every dollar.

About $22 is an average that includes missing the money. One all-in can still bust the short stack for $0.`,
    },
    {
      id: "ignores",
      title: "What the formula leaves out on purpose",
      body: `ICM poker ignores skill. Players are treated as comparable, so stacks alone set the finishing weights.

It ignores position and the blind clock. Two equal stacks in different seats get the same price, because the next blind is not an input.

It ignores the current hand. Hole cards never enter, and a separate pot-equity sum is not this formula.

The arXiv paper opened the same day says the formula is not a story of how chips move. It prices ranks from the stacks as they stand.

The Wikipedia page says that with three or more players the rank probabilities can mislead, while the payout estimate stays closer. Unlikely orders are the weak spot, and huge fields are called intractable.

| Piece | Used by the model | Left out |
| --- | --- | --- |
| Chip counts | Yes, as weights for the next place | The hands that built the stacks |
| Prize list | Yes, dollars per place | An overlay that is not on the list |
| Skill | Assumed equal | A real edge |
| Seat and blinds | No | The next orbit |
| Current cards | No | A separate pot-equity sum |

[Range homework off the table](/guides/gto-poker-strategy) is study. It is not an output of the three-player case.`,
    },
    {
      id: "deal",
      title: "A prize split is not a card-sharing scheme",
      body: `People reach for ICM poker when they talk about a deal. A deal is a split of remaining prizes if the event allows it.

Chip count is one rule. This model is another. The director decides whether any deal is open.

Sharing hole cards, soft-playing a partner, or dumping chips is collusion. This page will not describe how to do that.

Natural8 house rules, opened the same day, say prizes follow the lobby except when a deal is made or the event is cancelled. The security policy bans some off-client final-table deals, including at the Super MILLION$ High Roller, and it bans real-time analyzers during play.

Those lines are that room's rules. They are not a universal statute.

If the event forbids a deal, the model does not overrule the floor. If a deal is allowed, copy the stacks and the remaining prizes from the screen you are on.

Do not borrow the $45 figure unless your stacks and prizes match the example. [The operator review](/guides/natural8-review) records the tool ban. It is not a chopping manual.`,
    },
    {
      id: "pressure",
      title: "Why a fair coin can still look expensive",
      body: `The arXiv paper's first result is narrow. When prizes do not rise as you finish lower, and someone still in will not get second-place money, a fair chip bet against one other player lowers your expected prize under the model.

A fair bet means each side has the same chip expectation. The cards can be a wash and the dollars can still be a bad trade, because losing can erase a pay jump.

Players who are not in that bet see their expected prize rise, on the paper's terms. The same paper says a fair bet among three or more players need not work this way.

Do not stretch the two-player claim into every multiway pot. The theorem is not an order to fold every hand.

Dollar example 2 stays inside the published case. Paying those stacks by raw chips would hand out $50, $30, and $20.

The page's model hands out about $45, $32, and $22. The gap on the big stack is the curve of the prize list, not a floor fee.`,
    },
    {
      id: "compare",
      title: "A tournament price beside a house game and a cash pot",
      body: `The formula does not remove chips. It only renames stacks you already hold as a share of prizes. A house game and a cash table price something else.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
| --- | --- | --- | --- | --- | --- |
| This stack model | No fee inside the formula. It reprices stacks against a prize list | Other remaining players, assumed equal | Not a cashier. Prizes follow the event | No. Arithmetic, not a shuffled deck | Not a table minimum |
| House-banked casino | Not published | The house | Not published | Not published | Not published |
| PVPspinArena | 5% of the pot only after a flop, on six-max No-Limit Hold'em | Other players | Balance updates when the hand settles | Yes, seed committed before the hand | Shown on the table |

How PvP compares: a bubble price is a claim on prizes that are not paid yet. [Poker](/poker) here is a cash hand, and the fee is 5% of the pot only after a flop.

You can recompute a settled hand on the [fairness page](/fairness). That check does not price a tournament elsewhere, and it does not audit a solver.

Cash-out minimum here is $20 in BTC, USDC, or ETH. We did not time a cash-out.

[Starting-stack habits](/guides/poker-bankroll-management) belong to cash you can lose. They do not replace a prize list.`,
    },
    {
      id: "dollars",
      title: "The cash-game contrast, in dollars",
      body: `Dollar example 3 uses this site, not the bubble. Suppose the pot reaches $60 and has seen a flop.

Five percent is $3, so the winner keeps $57. There is no third-place prize to protect and no model to consult.

Folding does not save a payout ladder, because that hand has none. The $3 is only the posted fee.

If you bust a real tournament, the model does not refund the buy-in. About $22 in the example includes paths that pay nothing.

Do not add $45, $32, and $22 and expect a hidden extra dollar. The page rounded, and the prize pool in the example is $100.`,
    },
    {
      id: "checks",
      title: "Checks before a bubble number is treated as cash",
      body: `Write the inputs from the event in front of you. A famous ICM poker example is not your lobby.

- [ ] Confirm you are 18, or older if local law sets a higher age.
- [ ] List every remaining stack, not only your own.
- [ ] Copy the remaining prizes, including places that pay nothing.
- [ ] Read whether the room allows a deal at this stage.
- [ ] Refuse a solver dollar if you cannot name the inputs.
- [ ] Keep skill, seat, and the current cards outside this formula.
- [ ] Do not share hole cards and call it a chop.
- [ ] Do not run a real-time tool where the room forbids one.
- [ ] Separate this average from the cash fee on a player pot.
- [ ] If the bubble becomes a chase, call 1-800-GAMBLER.`,
    },
    {
      id: "limits",
      title: "Who should not stake rent on a model",
      body: `Do not play a tournament if you are under 18, or under a higher local age. Do not play where it is illegal. Do not put in rent, savings, or money with a due date.

Do not treat about $22 as cash already won. The short stack in the example can still finish with nothing.

Do not use ICM poker to force a deal the rules forbid, and do not use it as cover for soft play. Adults who want a cash hand are looking at a different product.

This page is an editorial note, not legal advice, and not a promise of profit. Anyone chasing a buy-in they cannot lose should stand up.

If the session stops being a bounded spend, call 1-800-GAMBLER and open [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "What does ICM poker put a price on?",
      a: "It prices an unfinished tournament stack as expected prize money. First place is weighted by chip share, and later places use the chips left after higher finishers. The Wikipedia case uses prizes of 70 and 30 with stacks of 50%, 30%, and 20%, and prints about 45, 32, and 22. Equal skill is assumed. Hole cards are not an input, and this page did not run a solver.",
    },
    {
      q: "What does the same formula ignore?",
      a: "It ignores skill differences, seat, blind size, and the cards in the current hand. The arXiv note says it is not a model of how chips move from hand to hand. The Wikipedia page says unlikely finishing orders are estimated poorly, and that many-player fields are heavy to compute. A shoving chart from a simulator is a different product. This page does not print one.",
    },
    {
      q: "Can you walk the three-player dollars without a solver?",
      a: "Yes. Read the page that already did the arithmetic, and treat the units as dollars. Prizes of $70 and $30 make a $100 pool. Chip shares would be $50, $30, and $20. The page prints about $45, $32, and $22 instead. The big stack is about $5 under its chip share. Those figures are the page's approximations, not a solver run here.",
    },
    {
      q: "Does a deal made from the model count as collusion?",
      a: "A deal is a split of remaining prizes if the event allows it. Sharing hole cards or dumping chips is collusion, and this page does not explain how. One operator's house rules mention deals as an exception to posted prizes, while its security policy bans some final-table deals and real-time analyzers. Follow the event you entered. The formula does not overrule a floor that forbids a chop.",
    },
    {
      q: "Why can a fair chip bet still lose dollar value?",
      a: "Because the prize list is curved. The arXiv result says that when someone still will not receive second-place money, a fair chip bet against one other player lowers your expected prize under this model. Players sitting out of that bet gain expected prize money. A fair bet among three or more players need not work the same way. The result is not an order to fold every hand.",
    },
    {
      q: "Does a cash-game pot on this site use the model?",
      a: "No. Cash-game chips are dollars, with no prize ladder and no bubble. Poker here is six-max No-Limit Hold'em, and the fee is 5% of the pot only after a flop. A $60 pot that saw a flop pays the winner $57. You can recompute the hand on the fairness page. That check does not price a tournament stack somewhere else.",
    },
  ],
  sources: [
    {
      label: "Wikipedia — Independent Chip Model",
      url: "https://en.wikipedia.org/wiki/Independent_Chip_Model",
    },
    {
      label: "arXiv 0911.3100 — The Independent Chip Model and Risk Aversion",
      url: "https://ar5iv.labs.arxiv.org/html/0911.3100",
    },
    {
      label: "Natural8 house rules",
      url: "https://www.natural8.com/en/house-rules",
    },
    {
      label: "Natural8 security and ecology policy",
      url: "https://www.natural8.com/en/security-ecology-agreement",
    },
  ],
  related: [
    "heads-up-poker-strategy",
    "gto-poker-strategy",
    "poker-bankroll-management",
    "natural8-review",
    "horse-poker",
    "texas-holdem-rules",
  ],
  updated: "2026-10-20",
};
