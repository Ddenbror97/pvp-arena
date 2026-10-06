import type { Guide } from "./types";

export const guide: Guide = {
  slug: "jacks-or-better-strategy",
  cluster: "Poker",
  keyword: "jacks or better strategy",
  secondary: [
    "9/6 jacks or better",
    "jacks or better paytable",
    "video poker holds",
    "jacks or better rtp",
  ],
  title: "Jacks or Better Strategy: Paytable, Holds, Draws",
  description:
    "Jacks or better strategy starts with the paytable on the glass. See full-pay 9/6, which holds matter, and why a short session still loses.",
  h1: "Jacks or better strategy: paytable, holds, and draws",
  answer:
    "Jacks or better strategy starts with the paytable on the glass, not with a feel for the cards. Full-pay 9/6, the widely published version, returns about 99.54% with perfect play. Shorter paytables pay less. Holds fall into groups: a paying pair, high cards, and draws. A short session can still finish ahead or behind by much more than that small edge, and the edge stays negative. Adults 18+.",
  facts: [
    "Jacks or Better is five-card draw against a posted paytable, not against other players.",
    "Full-pay 9/6 means a full house pays 9 and a flush pays 6, per coin.",
    "With perfect play, that full-pay game is about 99.54% RTP. Other sheets pay less.",
    "A pair of jacks or better already pays. A lower pair does not.",
    "The royal is usually quoted at the max-coin rate. Fewer coins often pay a smaller royal.",
    "PVPspinArena does not offer video poker. Jackpot, Coinflip and Roulette are the live games.",
  ],
  sections: [
    {
      id: "glass",
      title: "The glass is the strategy",
      body: `Jacks or better strategy is a house-game problem. You are dealt five cards from a 52-card deck, you choose which to hold, and you draw once. The machine pays the final hand from a schedule printed on the glass or the screen. Nobody across the table is folding. There is no button and no shared pot. You can win a handful of deals and still be playing a negative game. The schedule does not settle up at the end of a coffee break. It settles over a number of hands most people never sit.

The schedule is the game. Two cabinets can both say Jacks or Better and still pay different amounts for a full house and a flush. If you skip that line, every hold you memorized may belong to a different machine. Read the glass before the first credit.

This note lives in the [poker topic](/guides/topics/poker) because the hands use poker ranks. It is not a chapter of hold'em. [Video poker paytables](/guides/video-poker-paytables) compares families of sheets. This page stays on Jacks or Better only. [Deuces wild](/guides/deuces-wild) is a separate game with wild twos and its own full-pay sheet. Do not import a hold from that page onto this one.

### What "strategy" can and cannot do

Perfect play means choosing the hold with the best average return on this exact paytable. It trims mistakes. It does not flip the sign of the game. The leftover slice is the [house edge](/guides/house-edge). Adults 18+. No bonus code and no promise that a short session will match the long-run percentage.`,
    },
    {
      id: "nine-six",
      title: "Full-pay 9/6 and the sheets that pay less",
      body: `Full-pay 9/6 is the nickname for a Jacks or Better sheet where the full house pays 9 for 1 and the flush pays 6 for 1, with the usual lower rungs still intact. Published figures put that game near 99.54% return with perfect play. The other 0.46% is the price of the sitting if you never pick a worse hold. Shorter nicknames, such as 8/5 or 7/5, cut those middle pays and return less. The label on the marquee is not the proof. The numbers on the glass are the proof.

A common full-pay ladder, per one coin, looks like this. Always confirm the machine in front of you. Some games keep a 9 and a 6 and then cut two pair or the quads, and the famous percentage no longer applies.

| Final hand | Common full-pay coins |
| --- | --- |
| Royal flush, often at max coins | 800 |
| Straight flush | 50 |
| Four of a kind | 25 |
| Full house | 9 |
| Flush | 6 |
| Straight | 4 |
| Three of a kind | 3 |
| Two pair | 2 |
| Jacks or better | 1 |

The royal line is why max coins show up in every serious discussion. On many machines the royal pays 800 for 1 only when you bet the maximum coins, and a smaller bet pays a flat 250 for 1. The 99.54% figure assumes the full-pay sheet and that max-coin royal. Playing short of max coins changes the return even if every hold is otherwise right.

[RTP explained](/guides/rtp-explained) is the language for that percentage: how much of each credit the schedule returns over a huge number of hands. It is an average, not a forecast for tonight.`,
    },
    {
      id: "paying-pair",
      title: "Hold group: the paying pair",
      body: `The first group is the hand that already wins the minimum. In Jacks or Better the minimum is a pair of jacks, queens, kings, or aces. That pair pays even money on the coin you bet. Holding it keeps a finished pay and still leaves the draw to improve into three of a kind or better.

A pair of tens or lower is not in this group. It pays nothing by itself. It is an unfinished hand that might become two pair, trips, or a full house, and it might also become nothing. Treating a pair of sixes as if it were already a jack is how a short-pay feeling gets worse. The glass is blunt: below jacks, a lone pair is a loss.

Two pair, three of a kind, and the pat hands above them are made pays as well. They sit in the "already on the schedule" family, stronger than a single high pair. You do not break them casually. A four-card royal is unfinished, yet on a full-pay sheet it is famous because the royal’s pay is large enough that players are taught to respect it even next to some hands that already pay. This page will not rank every exception. A 30-line chart belongs to the people who published it. The group lesson is enough to stop the worst habit: throwing away jacks or better to chase a random low card.

If the full house or the flush on your glass is not 9 and 6, the value of these groups shifts. A chart drawn for 9/6 is a different strategy. When the glass changes, the holds change with it.`,
    },
    {
      id: "high-cards",
      title: "Hold group: high cards",
      body: `High cards, in this game, are jack, queen, king, and ace. They are high because any pair among them pays, and because they also appear in the straights and royals the glass rewards. A ten matters inside a straight or a royal draw. It does not make a paying pair on its own. That single distinction is the beginner lesson hiding inside the title.

Holding several high cards gives you more than one chance at a paying pair, and also a chance they cooperate into a straight. Suited high cards add flush and royal possibilities. Unsuited high cards mostly offer pairs and straights. You need to see that low cards without a pair and without a draw are the cards the game is willing to throw away.

### A compact map, not a chart

| Group | You are looking at | Plain reading |
| --- | --- | --- |
| Paying pair | JJ, QQ, KK, or AA | Already pays 1 for 1 |
| Low pair | 22 through tens | Not a win until it improves |
| High cards | J, Q, K, A | Can become a paying pair |
| Draw | Four toward a flush, straight, or royal | Unfinished, and not all equal |

The map is original and incomplete on purpose. It will not tell you whether two suited high cards outrank a low pair on this deal. That ranking is the long chart, and it moves if the paytable moves. Use the map to name what you hold. Then use a chart that matches the glass, or decline the machine if you will not.

[House edge](/guides/house-edge) still applies after you name the group. Correct groups reduce extra loss. They do not invoice the casino for the 0.46% that full-pay 9/6 keeps under perfect play.`,
    },
    {
      id: "draws",
      title: "Hold group: draws, without a 30-row chart",
      body: `A draw is a hand that is not paid yet and needs one or more cards to become something the glass lists. Four cards toward a flush, four cards toward a straight, and four cards toward a royal are the draws people can see without a spreadsheet. This page stops at the groups.

Draws are not equal. A royal draw aims at the largest ordinary pay on the sheet. A flush draw aims at 6 for 1 on a full-pay game, less on a short pay. A straight draw aims at 4 for 1 in the common ladder above. Breaking a made flush to chase a royal is the sort of choice a full chart settles with math. Copying that choice onto a different paytable, or onto [deuces wild](/guides/deuces-wild), is how a memorized line becomes a mistake. Deuces Wild pays different hands, treats the twos as wild, and does not use this hold list at all.

What you can carry without a poster:

- Name the draw before you love it. Four to a royal is not four to a low flush.
- Do not discard a paying pair of jacks or better for a one-card dream that is not a real draw.
- If you will not follow a chart that matches this glass, you will add mistakes on top of the house slice.
- The chart is damage control. It is not a system that forces a winning night.

[Video poker paytables](/guides/video-poker-paytables) is the place to see how a cut flush pay changes the whole family. Come back here only for the Jacks or Better groups. Adults 18+.`,
    },
    {
      id: "session",
      title: "Why a short session still loses in expectation",
      body: `About 99.54% means that, over a very large number of perfectly played full-pay hands, the machine returns about 99.54 credits per 100 wagered. A session of 200 hands is not that large number. One flush pays several coins. One royal, if it appears, pays hundreds. You can stand up ahead. The expectation does not care.

Work it in credits so the size stays obvious. Suppose each hand costs 1 credit and you play 200 hands on full-pay 9/6 with perfect holds. Turnover is 200 credits. The house slice is about 0.46% of that, or under 1 credit in expectation. A single full house, paid 9, is already many times that slice. So the night’s result is mostly variance, and the posted edge is a slow leak underneath it. Stopping early does not cancel the leak. It only stops you from seeing the average.

Short-pay glass makes the leak louder. The same 200 credits on a sheet that returns less than 99.54% costs more in expectation before you mis-hold a single card. That is why jacks or better strategy begins with walking away from the wrong glass. Heroic holds on an 8/5 or 7/5 schedule are still holds against a fatter price.

None of these sentences is a forecast that you will lose a specific session. They are the average. [RTP explained](/guides/rtp-explained) is the same idea in one phrase: return is not a guarantee, and a high return is still a return below 100% on this game. If you need the session to pay rent, you are using the wrong product.`,
    },
    {
      id: "limits",
      title: "What to do with the edge once you see it",
      body: `Treat the 0.46% figure as a price tag for one published sheet, not as a target to beat. If the glass is worse, the tag is higher. If you play without a matching chart, your personal tag is higher still. There is no third category where enthusiasm removes it.

A practical sitting, if you sit at all, is dull. Confirm 9 and 6 and the rest of the ladder. Bet the max coins the royal requires if you have already accepted the game. Hold by groups, then by a chart for that exact sheet. Stop at a loss limit you wrote before the first deal. A short session that wins is a pleasant sample. It is not evidence the price tag was wrong. Write the loss limit where you can see it, and stand up when you reach it even if the last hand almost hit.

### Leave conditions

- The full house and flush pays are missing or do not match what you thought.
- The royal line changes when you drop below max coins and you did not notice.
- You are about to replay a lost session to "get back to even."
- The game on screen is Deuces Wild or another family. Use that game’s own page.

[Responsible gambling](/responsible-gambling) is the limit when the sitting stops being optional. Adults 18+.

PVPspinArena does not install these machines. The [poker topic](/guides/topics/poker) can explain the ranks. It cannot turn a house paytable into a player-versus-player pot. Jacks or better strategy is how you lose less against a schedule you have actually read. It is not how you get paid to play.`,
    },
  ],
  faqs: [
    {
      q: "What does 9/6 mean?",
      a: "On a full-pay Jacks or Better sheet, the full house pays 9 for 1 and the flush pays 6 for 1. Other numbers are a different, usually worse, game.",
    },
    {
      q: "Does perfect play beat full-pay 9/6?",
      a: "No. Widely published figures put perfect play near 99.54% RTP. That is still a house edge of about 0.46% over a very large number of hands.",
    },
    {
      q: "Should I hold any pair?",
      a: "A pair of jacks or better already pays. A lower pair does not. High cards and real draws are separate groups. The full ranking depends on the glass.",
    },
    {
      q: "Does this strategy work for Deuces Wild?",
      a: "No. Deuces Wild uses wild twos and a different paytable. Holds from Jacks or Better do not transfer. Read that game on its own page.",
    },
    {
      q: "Can a short session win?",
      a: "Yes. Variance is larger than the small edge over a few hundred hands. The expectation on a full-pay game is still a loss, even if you stand up ahead.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds — Jacks or Better optimal strategy (full-pay 9/6 return)",
      url: "https://wizardofodds.com/games/video-poker/strategy/jacks-or-better/9-6/optimal/",
    },
    {
      label: "Wikipedia — Video poker",
      url: "https://en.wikipedia.org/wiki/Video_poker",
    },
  ],
  related: ["video-poker-paytables", "deuces-wild", "rtp-explained", "house-edge"],
  updated: "2026-09-29",
};
