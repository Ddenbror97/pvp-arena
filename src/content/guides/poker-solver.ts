import type { Guide } from "./types";

export const guide: Guide = {
  slug: "poker-solver",
  cluster: "Poker",
  keyword: "poker solver",
  secondary: [
    "solver frequencies",
    "solver expected value",
    "range versus strategy",
    "PioSOLVER output",
    "study limits",
  ],
  title: "Poker Solver Outputs: Ranges, Frequencies, EV",
  description:
    "A poker solver prints ranges, frequencies, and EV for the tree you give it. PioSOLVER, GTO Wizard, and Simple Postflop are named from their docs. No keys.",
  h1: "What a poker solver prints: ranges, frequencies, and EV",
  answer:
    "A poker solver is software that takes a betting tree, two ranges, and stack sizes, then prints an action mix and an expected value for hands inside that tree. The print is ranges, frequencies, and EV. It is not a payout, not a licence bypass, and not a promise you will win the next hand you play.",
  facts: [
    "Last tested 20 October 2026 on PioSOLVER's quick start and FAQ, GTO Wizard's solver article and Study Mode help, and the Simple Postflop product page.",
    "The visible output of a poker solver is a range weight, an action frequency, and an EV. The definitions below are from those pages.",
    "We did not buy a licence, run a solve, or time a calculation. No affiliate link.",
    "A commercial Pio install asks for a licence code. This page does not provide keys, cracks, or a workaround.",
    "Equilibrium play is a separate article. This one stops at what the print means and where a single study fails.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What the program actually is",
      body: `A study program for Hold'em takes the game you describe and searches for a strategy pair neither player can improve inside that description. PioSOLVER's viewer manual treats the range as the basic object: the hands a player might hold, stored as a relative probability rather than as the two cards dealt.

GTO Wizard's 2023 article calls these programs EV-maximizing routines that stop when neither side can improve, and it names that stop equilibrium. PioSOLVER's quick start shows a free install and a commercial Pro or Edge install that asks for a licence code. This page will not supply a code, a crack, or a step that skips payment.

Simple Postflop's product page describes a two-player Hold'em program that shows a strategy, an EV, and equity for a tree you build. The page calls that product the most accurate of its kind. That line is marketing we did not test.

You can read [equilibrium play notes](/guides/gto-poker-strategy) if you want the idea of an unexploitable mix. This page does not reteach that idea as a betting system. The [poker topic hub](/guides/topics/poker) collects the rest of the cluster.

Adults only. If a study session turns into chasing a loss, stop and call 1-800-GAMBLER. [Responsible gambling](/responsible-gambling) is the longer limit.`,
    },
    {
      id: "outputs",
      title: "What a poker solver prints",
      body: `PioSOLVER's FAQ says a range weight is the relative chance of holding a hand. If aces have weight 1 and kings have weight 0.5, aces are twice as likely as kings in that range.

A strategy is a different object. It is the mix of actions for one hand, and the actions at a single node add up to 1.

Their FAQ walks a check-raise without a chart. AJs at weight 0.75 that checks 70% and then raises 40% has a check-raise weight of 0.21. That 0.21 is a weight after two decisions, not a claim you win 21% of the pot.

The viewer can show combo counts, such as 60 combos checking and 40 betting, using only one player's range. Real frequency also uses the other range and card removal. In their sketch, hero checks every king of spades and bets every ace of spades against a range that is only the ace, so the check is half the combos and the whole real line.

GTO Wizard's Study Mode help says EV is the average return of a hand or an action. Their example is a $1 coin flip with an EV of $0.50, which is not the same figure as equity if the hand is checked down. Their longer article writes that average as each ending's value times the chance of reaching it, and an ending is a fold or a showdown.

PioSOLVER's FAQ adds a unit warning. Calling $100 and then folding can show as −$100 in global EV, while a viewer shows 0. Average EV also has to be weighted by matchups, their word for one weighted hand against another, because aces are dealt more often than sevens.

[Two-player cash decisions](/guides/heads-up-poker-strategy) are where frequencies get discussed as play. This page stays on the print itself.`,
    },
    {
      id: "vendors",
      title: "Three programs, in their own words",
      body: `PioSOLVER's quick start says the browser can show EVs, strategies, and ranges after you build a tree and stop it yourself. That page's timing notes are theirs. We did not time a run on our machine.

GTO Wizard's article lists the inputs: betting tree, target accuracy, pot, stacks, ranges, board, and any rake or ICM change. A size you leave out is a line the program cannot choose, and they say a tree can also be too big to finish. They do not claim every chip increment of no-limit.

Simple Postflop's page covers strategy, EV, and equity for two players in no-limit or fixed-limit Hold'em, with a free turn-and-river option and a paid standalone licence. The dollar price was not in the text we read, so it is not published here.

The page lists Windows, at least 8 GB of RAM, and a Windows layer on Mac. We did not install it.

Calling any of these a poker solver is fair only when you mean that print: ranges, frequencies, and EV for a tree you specified. A [crypto-casino primer](/guides/what-is-a-crypto-casino) is a different product. The tool does not hold a balance.`,
    },
    {
      id: "limits",
      title: "Where one study stops",
      body: `The print ends where your inputs end. A different stack, rake, or open size is a new tree, and one flop's colors do not move onto the next board.

Combo percent is not the rate the line happens once the other range removes cards. The EV is the average inside the paired strategies from that node forward, not the cash in your pocket after one session.

GTO Wizard's article says practical runs stop short of a perfect equilibrium, and that their solves target 0.1% to 0.3% of the starting pot depending on the solution type. That target is theirs. We did not reproduce it.

A two-player tree does not describe a pot with more callers. Simple Postflop's page is explicit that the solve is two players, so a multiway pot is outside that page.

Equilibrium is a statement about both sides playing the print. If the other person folds too often, a best response can leave the mix. Adjusting for that leak is a different study, not a script that turns a node's EV into a night's profit.

Studying one poker solver node is a reading exercise with a stop rule. You should be able to say the stack, the pot, and the bet sizes out loud. A screenshot missing those three is an incomplete quote.

Hardware and a licence are part of the limit. Pio's commercial quick start asks for a licence code. We will not describe a pirated build, a shared key, or a torrent.`,
    },
    {
      id: "compare",
      title: "The print beside a house game and a PvP pot",
      body: `A house game charges you inside the price of the bet. A PvP pot charges a fee on the combined money. A study program charges a vendor, when it charges anyone, and then hands you a grid.

| | Study program | House-banked casino | PVPspinArena |
| --- | --- | --- | --- |
| What you pay | Licence price not published on the Pio quick-start text we opened | The game's built-in cut | 5% of a Coinflip or Jackpot pot |
| Other side | A model of one opponent inside a tree | The house | One other player |
| What comes back | Ranges, frequencies, and EV. No cash prize | The paytable, after the cut | $50 against $50 pays the winner $95 |
| Record we checked | Vendor docs only. We did not run a solve | The posted paytable | A hashed result |
| Smallest stake | not published | Varies by game | Coinflip minimum $1. Cash-out minimum $20 |

A poker solver is the left column. It does not settle the middle column or the right column.

Two $50 Coinflip stakes make a $100 pot. The fee is $5, and the winner is paid $95. Four $50 Jackpot entries make a $200 pot, the fee is $10, and the winner is paid $190.

Roulette on Purple or Silver is about 7.88% after the fee. Slott takes 10% of the winning pot. Those figures are in the [terms](/terms), and a node's EV does not refund them.

[The built-in cut](/guides/house-edge) is the house column as one number. [A book's margin](/guides/vig-betting) is the same idea on a sports price. [Seed-checked play](/guides/provably-fair-casino) is how a hashed game is audited, and none of those pages is a solve.

[Poker](/poker) is the table on this site. [Fairness](/fairness) checks a seed. A vendor grid does not audit that seed.`,
    },
    {
      id: "dollars",
      title: "Three dollar readings",
      body: `Example one is theirs. GTO Wizard's Study Mode help says a coin flip with a $1 price has an EV of $0.50, because half the time the result is $1 and half the time it is $0. You do not receive fifty cents on the flip that loses.

Example two is PioSOLVER's unit warning. Calling $100 and then folding is −$100 in global EV, while a viewer can show 0. The minus one hundred dollars is money the line gave away inside the tree, not a fee the program adds.

Example three is our pot, not a solve. Risk $50 on Coinflip against another $50 and the winner receives $95, because the missing $5 is the 5% fee. A small positive node EV does not pay that $5 back, and it does not forecast the next session.`,
    },
    {
      id: "check",
      title: "Checklist, scorecard, and who should skip it",
      body: `Before you pay a vendor, or trust a screenshot, walk this list. A poker solver screenshot without the tree beside it is an incomplete quote.

- [ ] I can name the stack, the pot, the board, and the bet sizes.
- [ ] I know whether the percent is combos or real frequency.
- [ ] I know whether the EV is the global figure or the viewer's number.
- [ ] I am not treating a mix as a promise of profit.
- [ ] The spot is two players, or I have written that it is not.
- [ ] Rake or ICM is either inside the tree or marked absent.
- [ ] I will not use a cracked copy, a shared key, or a torrent.
- [ ] Any licence price I remember is on the vendor's own page.
- [ ] Money I later play with can go to zero. 1-800-GAMBLER is saved.
- [ ] I opened the responsible-gambling page before I sized a real bet.

| Item | What we could verify on 20 October 2026 |
| --- | --- |
| Output | Ranges, frequencies, and EV, from the vendor pages named above |
| Product | A poker solver, meaning that print and not a payout |
| Accuracy | Not measured by us. Wizard states a 0.1% to 0.3% pot target for their solves |
| Price | Standalone dollar price not published in the text we read |
| Fairness proof | None. A solve is not a hashed hand |
| Licence | Commercial Pio asks for a code. No bypass is described here |

Definitions for the three outputs sit on the vendors' own pages, including the split between combo frequency and real frequency. A free Pio install and a free turn-and-river option are named by the vendors.

A missing bet size is a missing answer, a two-player solve skips extra callers, and we did not test the accuracy targets they state. A cracked copy is outside this page, and one node's EV is not a session result.

Who should stay away: minors, anyone who wants a winning script, anyone who will pirate a binary, and anyone who cannot separate a node's average from money they can lose. If study turns into chasing, stop and call 1-800-GAMBLER.`,
    },
  ],
  faqs: [
    {
      q: "What does a poker solver output?",
      a: "A range is the relative weight of each hand, a frequency is how often that hand takes an action, and EV is the average return inside the tree. Combo counts ignore the other player's cards, while real frequency includes card removal. A poker solver does not print a cheque, a session profit, or a key for a paid install.",
    },
    {
      q: "Why do two frequency numbers disagree?",
      a: "PioSOLVER's FAQ separates combo frequency, which uses one range, from real frequency, which also uses the other range and cards that cannot be dealt twice. Their sketch checks every king against a range that is only the ace of spades, so the check is half the combos and the entire real line. Read the label before you repeat the percent.",
    },
    {
      q: "Does the higher-EV action always get 100%?",
      a: "A mixed hand is two actions the solve still uses. GTO Wizard's article says practical solutions stop short of a perfect equilibrium, so a tiny EV gap can be leftover noise rather than an order to take only the higher cell. Read the frequency beside the EV, and do not export a fraction of a big blind to a different stack or board.",
    },
    {
      q: "What is EV in one sentence?",
      a: "EV is the probability-weighted average of the results, written by GTO Wizard as each ending's value times the chance of reaching that ending. Their Study Mode help illustrates it with a $1 coin flip whose EV is $0.50. PioSOLVER can show −$100 in global EV for calling $100 and folding, while a viewer shows 0 for the same line.",
    },
    {
      q: "Can I study a poker solver without paying?",
      a: "PioSOLVER's quick start lists a free install beside commercial Pro and Edge builds that ask for a licence code. Simple Postflop's page lists a free turn-and-river calculation and a paid standalone licence whose dollar price was not in the text we read. We will not describe a crack, a shared key, or a torrent, because that payment gate belongs to the vendor.",
    },
    {
      q: "Who should not use one?",
      a: "Skip it if you want a winning script, if you will pirate a binary, if you are under 18, or if you cannot name the stack, pot, and bet sizes behind a screenshot. A node average is not money you have won. If play has passed a limit you set, stop and call 1-800-GAMBLER.",
    },
  ],
  sources: [
    { label: "PioSOLVER quick start", url: "https://piosolver.com/docs/" },
    { label: "PioSOLVER FAQ (ranges, strategy, frequency, EV)", url: "https://piofiles.com/faq/flat.html" },
    { label: "PioSOLVER viewer manual (ranges)", url: "https://piofiles.com/docs/viewer_manual/flat.html" },
    { label: "GTO Wizard, How Solvers Work", url: "https://blog.gtowizard.com/how-solvers-work/" },
    { label: "GTO Wizard Study Mode help (EV definition)", url: "https://help.gtowizard.com/study-mode/" },
    { label: "Simple Postflop product page", url: "https://simplepoker.com/en/Solutions/Simple_Postflop" },
  ],
  related: [
    "gto-poker-strategy",
    "heads-up-poker-strategy",
    "what-is-a-crypto-casino",
    "house-edge",
    "vig-betting",
    "provably-fair-casino",
  ],
  updated: "2026-10-20",
};
