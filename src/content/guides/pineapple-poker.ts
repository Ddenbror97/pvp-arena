import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pineapple-poker",
  cluster: "Poker",
  keyword: "pineapple poker",
  secondary: [
    "crazy pineapple",
    "three hole cards",
    "discard before the flop",
    "pineapple hi-lo",
  ],
  title: "Pineapple Poker: Three Cards, Then a Discard",
  description:
    "Pineapple poker deals three hole cards. Plain play discards one before the flop. Crazy Pineapple discards one after it. Pagat prints no rake.",
  h1: "Pineapple poker: three hole cards, and the rule for throwing one away",
  answer:
    "Pineapple poker deals three hole cards, then makes you throw one away. On the Pagat page opened 20 October 2026, the plain form discards before any betting, and Crazy Pineapple discards after the flop betting, just before the turn. Hold'em deals two cards and has no discard. That page prints no rake.",
  facts: [
    "Last tested 20 October 2026 on the Pagat Texas Hold'em page, which includes the Pineapple and Crazy Pineapple sections.",
    "Plain Pineapple deals three hole cards and discards one before the first betting round.",
    "Crazy Pineapple keeps all three through the flop betting, then discards one immediately before the turn.",
    "The hi-lo form on that page splits the pot, and a low must be eight or better. No rake is printed.",
    "This site deals two hole cards. It does not deal the three-card discard.",
  ],
  sections: [
    {
      id: "three",
      title: "How pineapple poker deals the extra card",
      body: `Pineapple poker starts from Hold'em and adds one private card. Pagat, opened 20 October 2026, says each player is dealt three hole cards and must discard one before the first round of betting.

The streets after that discard are the usual ones. A flop, a turn, and a river, with a betting round after each.

You finish with two hole cards, the same number Hold'em started with. The difference is that you chose the pair after seeing three.

The [poker topic](/guides/topics/poker) is the hub. [The two-card street order](/guides/texas-holdem-rules) is the base game this variant edits.

Pagat prints no stake, no rake, and no room name on that section. A fee you heard at a table is not published here.`,
    },
    {
      id: "plain",
      title: "The discard that happens before anyone bets",
      body: `In plain pineapple poker, the third card is gone before the first chip goes in. You do not get to see the flop with all three.

That makes the discard a preflop decision. A suited ace glued to two rags is still a problem if you keep the ace and a rag.

Hold'em never faces this choice. It dealt you two cards, and both of them stay unless you fold the hand.

You may not show the discarded card. Pagat's Hold'em intro says hole cards stay hidden, and this variant does not cancel that privacy.

If a home game lets you table the discard, that is their card, not the page we opened. Write it down before the deal.

Name the two cards you are keeping before the third one hits the muck. An ace kept beside a seven is no longer helped by the king you threw away.

A pair in the three cards is often the keep, unless the other two share a suit and a straight with each other. Pagat does not rank those keeps. It only fixes when the discard happens.

That early choice is the whole plain game. You pay for it with less information than the form that waits for the flop.

Write the keep down if the game is new. A pretty card you mucked cannot come back.`,
    },
    {
      id: "crazy",
      title: "Crazy Pineapple keeps the third card through the flop",
      body: `Crazy timing is still pineapple poker. It deals the same three cards and waits. Pagat says they are kept until after the second betting round, which is the flop.

Each player still in must discard one card immediately before the turn is dealt. The turn and the river are played with two hole cards.

You therefore see the flop with three private cards. More hands connect, and more second-best hands look real.

The discard is forced on players who are still in. A player who already folded does not get a later discard, because that hand is dead.

Do not call this the plain form. The plain form never shows you a flop with three cards.

[A flop bet after a raise](/guides/c-bet-poker) is a different lesson. The extra card changes which flops you like, and it does not set the bet size.`,
    },
    {
      id: "hilo",
      title: "Eight or better, as that page prints the split",
      body: `Pagat also describes hi-lo pineapple poker, eight or better, in the Crazy timing. The deal and the betting match Crazy Pineapple. At showdown the pot can split.

The high hand uses ordinary rankings. The low must be five cards of different ranks, eight or lower, with aces low. Straights and flushes do not spoil a low.

The best low on the page is A-2-3-4-5. The worst qualifying low is 8-7-6-5-4. Cards are compared from the top down, so 7-5-4-3-2 beats 7-6-3-2-A.

You may use different cards for the high and the low. The pot is split equally between the best high and the best low.

If nobody qualifies for low, the high wins the whole pot. The page says that happens automatically when three board cards are higher than an eight.

[Four-card high-low](/guides/omaha-poker-rules) uses a different private hand. Do not import its two-card rule into this three-card deal unless your card says so.`,
    },
    {
      id: "norake",
      title: "A rules page with no commission on it",
      body: `The Pagat section does not print a rake, a cap, a jackpot drop, or a time charge. Any of those, if a room uses them, stay not published until that room's card is the page you opened.

This article will not borrow a percent from a different variant. Three hole cards are not a fee.

A home game can choose zero rake. That choice should be said out loud before the first deal, and it is still not a number from Pagat.

Online rooms that spread the game may post a different price. We did not open a lobby that printed one, so no lobby rake appears here.

Dollar example 1 is the missing fee. A $30 pot on a rules page with no rake has nothing to subtract. The winner of that illustration keeps $30, and a real room may do otherwise.`,
    },
    {
      id: "compare",
      title: "Three cards beside a house table and a two-card pot",
      body: `The comparison is about the price and the opponent, not about which discard is more fun. This site does not deal the three-card game.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
| --- | --- | --- | --- | --- | --- |
| This three-card form | Rake not published on the Pagat page | Other players at the table | Not a cashier. The pot is the prize | Not published. It is a card rule | Not published |
| House-banked casino | Not published | The house | Not published | Not published | Not published |
| PVPspinArena | 5% of the pot only after a flop, on six-max No-Limit Hold'em | Other players | Balance updates when the hand settles | Yes, seed committed before the hand | Shown on the table |

How PvP compares: the three-card discard is a private-card rule. [Poker](/poker) here deals two hole cards, and the fee is 5% of the pot only after a flop.

A settled hand can be recomputed on the [fairness page](/fairness). That check does not audit a home deal, and it does not audit a house-banked table.

| Form | Hole cards dealt | When one card is discarded | Cards you hold on the flop |
| --- | --- | --- | --- |
| Hold'em | 2 | Never | 2 |
| Plain three-card form | 3 | Before the first bet | 2 |
| Crazy form | 3 | After the flop bet, before the turn | 3 |
| Tahoe, as Pagat names it | 3 | Not discarded. At most two are used at the end | 3 |

Tahoe is the cousin that keeps all three until showdown and then uses at most two. It is not the plain discard, and it is not Crazy Pineapple.`,
    },
    {
      id: "dollars",
      title: "Two more dollar pictures, neither of them a rake",
      body: `Dollar example 2 is only the discard. You are dealt A-K-7 and you throw the 7 away before the flop in the plain form.

The pot is still whatever was bet. The discarded 7 does not add a dollar and does not remove one.

Dollar example 3 uses this site. Suppose the pot reaches $40 and has seen a flop. Five percent is $2, so the winner keeps $38.

That $2 is the posted fee on a two-card game, not a pineapple poker commission from Pagat. It is not a pineapple commission, because this lobby does not deal the third card.

[The five-game rotation](/guides/horse-poker) is another mix people confuse with a single variant. It is not this discard rule.`,
    },
    {
      id: "checks",
      title: "Checks before the third card is dealt",
      body: `Say the discard timing before the first hand. Pineapple poker arguments start when someone throws a card on the wrong street.

- [ ] Confirm you are 18, or older if local law sets a higher age.
- [ ] Name the form: plain, Crazy, or hi-lo.
- [ ] Deal three hole cards, not two and not four.
- [ ] In the plain form, discard before the first bet.
- [ ] In the Crazy form, discard only after the flop betting, before the turn.
- [ ] Keep the discarded card private unless the house card says otherwise.
- [ ] In hi-lo, check whether a low can qualify before you count half the pot.
- [ ] Leave rake unpublished if the card in front of you is silent.
- [ ] Do not treat Tahoe, which keeps three cards to the end, as the plain game.
- [ ] If the extra card turns the night into a chase, call 1-800-GAMBLER.`,
    },
    {
      id: "limits",
      title: "Who should skip the extra card",
      body: `Do not play for money if you are under 18, or under a higher local age. Do not play where the game is illegal. Do not stake rent, savings, or money with a due date.

Three cards make more pretty flops in the Crazy form, and pretty is not the same as best. You can still lose the pot after a correct discard.

Do not invent a room's rake to make the game feel priced. If the card is blank, the price is not published. Anyone who needs a fee they can recompute should look at a table that prints one.

This page is an editorial note on a public rules page. It is not a coupon and not a promise that the extra card wins.

If play stops being a bounded spend, call 1-800-GAMBLER and open [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "When do you discard in the plain game?",
      a: "You discard one of three hole cards before the first betting round. After that, the hand follows Hold'em streets with the two cards you kept. You do not see the flop with all three. Pagat states that timing on its Hold'em variants page. A home card that moves the discard has left the page we opened, so do not call that card the plain form.",
    },
    {
      q: "When does Crazy Pineapple throw a card away?",
      a: "Crazy Pineapple keeps three hole cards through the flop and the flop's betting round. Each player still in discards one card immediately before the turn is dealt. The turn and the river use two hole cards. That is the rule on the Pagat page. It is not the plain form, which discards before any betting.",
    },
    {
      q: "How does the hi-lo split work on that page?",
      a: "The pot splits between the best high and the best qualifying low. A low needs five unpaired cards, eight or lower, with aces low, and straights or flushes do not count against it. The best low listed is A-2-3-4-5. You may use different cards for each side. If no low qualifies, the high wins the whole pot, including when three board cards are above an eight.",
    },
    {
      q: "How is this different from two-card Hold'em?",
      a: "Hold'em deals two hole cards and lets you use both, one, or neither. This variant deals three and forces a discard down to two, either before the first bet or, in the Crazy form, before the turn. Hand rankings for the high do not change. The extra card is information and a choice. It is not a free made hand.",
    },
    {
      q: "What rake does pineapple poker show on the rules page?",
      a: "None. The Pagat section prints the deal and the discard, and it does not print a percent, a cap, or a drop. A room's commission stays not published until that room's own page is the one you opened. This site charges 5% of the pot only after a flop, and it deals two cards, not three. Do not paste either number onto a silent card.",
    },
    {
      q: "Does this site deal the three-card game?",
      a: "No. Poker here is six-max No-Limit Hold'em with two hole cards. The fee is 5% of the pot only after a flop. A $40 pot that has seen a flop pays the winner $38. You can recompute a settled hand on the fairness page. That check does not audit a home deal of the three-card variant.",
    },
  ],
  sources: [
    {
      label: "Pagat — Texas Hold'em, including Pineapple and Crazy Pineapple",
      url: "https://www.pagat.com/poker/variants/texasholdem.html",
    },
  ],
  related: [
    "texas-holdem-rules",
    "omaha-poker-rules",
    "how-to-play-poker",
    "horse-poker",
    "c-bet-poker",
    "bluffing-in-poker",
  ],
  updated: "2026-10-20",
};
