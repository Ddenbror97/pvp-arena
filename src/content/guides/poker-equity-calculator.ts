import type { Guide } from "./types";

export const guide: Guide = {
  slug: "poker-equity-calculator",
  cluster: "Poker",
  keyword: "poker equity calculator",
  secondary: [
    "poker equity calculator rules",
    "poker equity calculator strategy",
    "poker equity calculator tips",
  ],
  title: "Poker Equity Calculator: Hands, Ranges, All-Ins",
  description:
    "A poker equity calculator: your hand against a range if all-in, how that differs from pot odds, and why a pair versus two overcards is not 50/50.",
  h1: "Poker equity calculator: your hand against a range, all-in",
  answer: `A poker equity calculator estimates how often your hand wins if the remaining cards are dealt and nobody folds. You type an exact holding, an opponent's hand or a range, and any board cards already out.

The figure is all-in equity. It is not the price of a call, and it is not a solver printout.

A pair against two overcards is about a coin flip, not a flat 50/50.`,
  facts: [
    "Equity here means share of the pot if the hand is dealt to showdown.",
    "A range is a list of hands the opponent might hold, not one magic combo.",
    "The calculator is only as honest as the range you typed.",
    "Pot odds are a different question and live on their own page.",
    "This page does not invent a solver frequency or a precise all-in percent.",
    "PVPspinArena poker is six-max No-Limit Hold'em with a 5% fee only after a flop.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "A showdown share, typed into a box",
      body: `A poker equity calculator answers a narrow question. If both players turn the cards up and run the deck, what fraction of the river outcomes belong to you? That fraction is equity. It assumes the money is already in, or that both players are all-in and cannot fold.

You can enter your exact two cards. You can enter the opponent's exact two cards, or a range such as "pairs and suited broadways" if the tool allows that syntax.

You can add a flop or a turn. The tool deals the unknown cards many times, or it does the combinatorics, and it reports a percent.

The percent moves when you change the range. "Any two cards" is a different opponent from "the hands that three-bet." A calculator that lets you skip the range is guessing a range for you. Read which one it used.

[How to play poker](/guides/how-to-play-poker) is the street order underneath the math. Without streets, an all-in percent has nothing to attach to.

Run the same two hands again after you add a flop. A pair against two overcards is about a coin flip before any board, and the exact percent still depends on the suits and the kickers.

A flop that pairs the board, or puts three cards of one suit out, is a new problem. The tool did not "change its mind." You asked a different question.

Write the range as a list you could say out loud. Big pairs, ace-king, and suited connectors is a range.

A mood is not an input. If the software wants a code, translate the list, then read back the hands it included.

One junk offsuit hand inside a range you called tight will move the percent.

All-in equity does not know our fee until you apply it. On this site's Hold'em the charge is 5% after a flop and nothing if the hand ends earlier.

A screen that awards the whole pot has not subtracted that charge. Do the subtraction yourself, and only for the pot you are actually studying.

Keep two or three ranges side by side instead of averaging them into one comforting figure. Leave the ugliest range on the table. The hand you hope they hold is the vanity case.`,
    },
    {
      id: "not-pot-odds",
      title: "Poker equity calculator rules versus the price of a call",
      body: `### Poker equity calculator rules

Use the tool for all-in comparisons and for study away from the table. Type the hero hand.

Type a range you can defend. Type the board if cards are already out.

Read win, tie, and loss if the tool splits them. A tie is not a win.

Do not paste the percent into a pot-odds decision without more work. Pot odds ask whether the call you must make is cheap compared with the pot.

Equity asks how often you win if nobody folds. Those meet only when the call closes the action.

[Pot odds](/guides/poker-pot-odds) owns the price. This page will not rebuild the fraction.

| Input | Equity calculator | Pot-odds page | A solver |
| --- | --- | --- | --- |
| Hero hand | yes | not required | a whole strategy, not printed here |
| Villain range | yes, and it drives the number | no | not a tutorial on this page |
| Money to call | ignored, if you are truly all-in | the whole question | not published here |
| Output | a showdown share | a break-even price | not invented here |

[GTO poker strategy](/guides/gto-poker-strategy) is where mixed strategies are named. It is not a solver walkthrough, and neither is this article. Do not expect a frequency chart at the bottom.`,
    },
    {
      id: "fees",
      title: "A study tool next to a fee the calculator does not waive",
      body: `An equity percent does not pay the rake. Card rooms charge what their fee card says, and that card is not published here.

A house-banked game does not hand you an equity box against another player. Any edge on a house game is not published here.

We do not list a promo code for a calculator brand. PVPspinArena is not a calculator site.

Its poker is six-max No-Limit Hold'em. The fee is 5% of the pot only after a flop, whether your equity was 80% or 20%.

The tool cannot delete that fee.

| | Equity calculator | House-banked casino | PVPspinArena |
| --- | --- | --- | --- |
| Job | estimate a showdown share | not published | deal six-max No-Limit Hold'em |
| Opponent model | a range you type | the house | another player |
| Fee | not published | not published | 5% of the pot only after a flop |
| Promo code | not published | not published | we do not list a promo code |
| Balance | none, it is a study tool | not published | US dollars from Bitcoin, or USDC or ETH on Base |

The [poker topic](/guides/topics/poker) links the pot-odds and Hold'em pages you still need after the percent appears.`,
    },
    {
      id: "dollars",
      title: "Pair versus two overcards, then a $12 flop fee",
      body: `Labeled example, pair versus two overcards. Hero is all-in with a pocket pair.

Villain calls with two overcards. People call that race a coin flip.

It is about a coin flip. It is not 50/50 as a flat fact.

The pair is usually a slight favorite, and the exact percent depends on the suits and the kickers. A calculator's number is only as good as the range you typed.

If you type those exact two overcards, you get one figure. If you type every hand that might call, you get another.

This page will not invent either figure, and it will not invent a solver output.

Dollar example 1, a home $0.50/$1 pot with no rake on the card. The pot is $4.

Hero shoves $20. Villain calls $20 with two overcards.

The pot is $44. The winner takes $44 because the house takes nothing.

The equity split of that $44 is the "about a coin flip" above, not a precise percent printed here.

Dollar example 2, our Hold'em. A pot reaches $12 and sees a flop.

The fee is 5% of $12, so $0.60. The winner receives $11.40.

Your equity does not change the $0.60. A preflop fold-out pays no poker fee.

[Texas Hold'em rules](/guides/texas-holdem-rules) describe the streets around that shove.`,
    },
    {
      id: "checklist",
      title: "Poker equity calculator tips before you trust the percent",
      body: `### Poker equity calculator tips

- Name the hero hand in full, including suits when they matter.
- Write the villain range in words before you type a shortcut.
- Add the board cards that are already dealt, and no future cards you hope for.
- Split wins from ties if the tool allows it.
- Refuse a percent that arrived without a range.
- Compare two ranges, not two moods.
- Leave the tool closed during a live hand if the site forbids it.
- Do not round a slight favorite up to "a lock."
- Do not treat the percent as pot odds.
- Subtract a known fee only after you read the fee, using the room's number or ours.
- Stop if you are rerunning the same loss looking for a kinder range.

[Poker bankroll management](/guides/poker-bankroll-management) matters because a 55-to-45 race still loses almost half the time. The calculator does not pay the losing half.`,
    },
    {
      id: "risks",
      title: "A bad range, a fake lock, and a multiway dream",
      body: `### Poker equity calculator strategy

Poker equity calculator strategy fails when the range is flattering. If you remove the hands that beat you and keep the hands you dominate, the percent climbs and the study is fiction. Type the hands they actually continue with, including the ones you hate.

A second failure is using all-in equity while streets remain and someone can fold. Your share of the showdown is not your share of the money if a bet can end the hand.

The calculator did not model the fold. Do not scold it for a question you did not ask.

Multiway pots are a third failure. Equity against one range is not equity against three.

Some tools can run more than one opponent. If yours cannot, do not halve the heads-up number and call it done.

Suits and kickers move the pair-versus-overcards case. Suited overcards pick up flush outs.

An overcard that pairs your kicker changes the tie. That is why a single famous percent does not belong on this page.

About a coin flip is the honest label until you type the actual cards.`,
    },
    {
      id: "legal",
      title: "A study number is not a license to chase",
      body: `Adults only should put money behind an equity figure. Where the local age is higher than 18, the higher age applies. This is not legal advice, and a calculator is not a gaming license.

A percent above 50 is not a command to reload. You will lose many favorites.

Read the [responsible gambling](/responsible-gambling) page before a study session becomes a chase through the next three buy-ins. The tool will always offer another run.

Do not use a calculator in a way a card room forbids. This page will not explain how to hide a tool at a live table. Study between sessions.

We do not list a promo code for calculator software. Any price the vendor charges is not published here. The only fee this article states in dollars is the Hold'em fee on our own tables.`,
    },
    {
      id: "closer",
      title: "Hold'em you can play while the calculator stays a study aid",
      body: `How PvP compares: the calculator is a desk tool. [Poker](/poker) is the six-max No-Limit Hold'em you can actually sit.

[Fairness](/fairness) lets you check a committed seed after the hand. When a live block appears on that page, it updates from settled play.

No equity readout from a past pot is copied here.

You can practise Hold'em decisions in that game. You still should not expect the site to print your equity for you, and it does not deal Big O, short deck, razz, 2-7, or open-face Chinese.

Type a range you believe. Read about a coin flip as about a coin flip. Then let [pot odds](/guides/poker-pot-odds) price any call that is not an all-in.

A calculator is only as honest as the price you type. [The extra blind that changes the price](/guides/straddle-poker) is a live-cash habit that moves every equity line before the flop.`,
    },
  ],
  faqs: [
    {
      q: "What are the poker equity calculator rules of thumb?",
      a: `Enter your hand, a range you can explain, and the board if it exists. Read the result as all-in equity, including ties if they are split out.

Change the range and watch the number move. If you cannot defend the range, ignore the percent.`,
    },
    {
      q: "Is a pair against two overcards 50/50?",
      a: `It is about a coin flip. It is not a flat 50/50.

The exact percent depends on the suits and the kickers, and a calculator's number is only as good as the range you typed. This page does not invent a precise percent.`,
    },
    {
      q: "How is this different from pot odds?",
      a: `Equity is how often you win if the cards run out. Pot odds are the price of a call compared with the pot.

They answer the same decision only when no further betting exists. Use the pot-odds guide for the price, and this page for the showdown share.`,
    },
    {
      q: "Will the calculator show a solver line?",
      a: `Not here. A solver suggests mixed strategies across a whole tree.

An equity calculator estimates showdown share for the hands you typed. This article does not print a solver output or a frequency.`,
    },
    {
      q: "Does equity remove the poker fee?",
      a: `No. On PVPspinArena a six-max Hold'em pot that sees a flop pays 5%.

A $12 pot pays $0.60, and the winner receives $11.40. Your percent does not change that fee.

If nobody sees a flop, that poker fee is zero.`,
    },
    {
      q: "Which poker equity calculator tips stop a bad study?",
      a: `Write the range in words first. Include hands that beat you.

Keep wins and ties separate. Do not run multiway math on a heads-up tool.

Close the tool if you are only hunting a percent that excuses a call.`,
    },
  ],
  sources: [
    { label: "Pagat — public card-game rules", url: "https://www.pagat.com/" },
    { label: "World Series of Poker", url: "https://www.wsop.com/" },
  ],
  related: [
    "poker-pot-odds",
    "gto-poker-strategy",
    "texas-holdem-rules",
    "how-to-play-poker",
    "straddle-poker",
  ],
  updated: "2026-10-20",
};
