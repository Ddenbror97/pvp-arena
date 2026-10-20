import type { Guide } from "./types";

export const guide: Guide = {
  slug: "sit-and-go-poker",
  cluster: "Poker",
  keyword: "sit and go poker",
  secondary: [
    "sit and go rules",
    "sng payouts",
    "single table tournament",
    "sit and go strategy",
    "sng bubble",
  ],
  title: "Sit and Go Poker: Rules, Payouts and Winning Strategy",
  description:
    "Sit and go poker starts when the seats fill. Rules, payout shapes, a worked prize example, and a strategy that respects the rising blinds.",
  h1: "Sit and go poker: rules, payouts, and winning strategy",
  answer:
    "Sit and go poker is a tournament that starts when a set number of seats fill, not at a clock time on a calendar. Everyone pays the same buy-in. Blinds rise. Players who lose their chips are out. The prize pool pays the places listed on that event, after the fee. A winning strategy is survival plus chip accumulation under that payout, not a cash-game habit copied onto a shrinking clock. Read the payout table in the lobby before you sit.",
  facts: [
    "A sit and go starts when the table fills. A scheduled tournament can start half empty. They are different products.",
    "The buy-in is usually prize pool plus a fee. Only the prize-pool part is paid to places.",
    "Payouts are top-heavy. Second place can be worth a lot, or nothing, depending on the posted table.",
    "You cannot rebuy in a classic freezeout. Chips you lose are gone for that event.",
    "PVPspinArena does not run sit and goes. It does run six-max No-Limit Hold'em cash games.",
  ],
  sections: [
    {
      id: "starts",
      title: "The game starts when the seats are full",
      body: `Sit and go poker, often shortened to SNG, waits for players. A six-max starts at six. A nine-max starts at nine. A larger field starts at the number the lobby prints. Until that number is reached, you are registered, not playing. When it is reached, the cards begin and the blinds start their schedule.

That is the difference from a daily tournament that fires at 19:00 whether two players or two hundred showed up. The sit and go's promise is a known field size. The wait is the cost of that promise. If the lobby is empty, you may sit in the registration screen longer than you play.

This [poker](/guides/topics/poker) guide is for adults 18 or older. Format neighbors are [spin and go](/guides/spin-and-go), [cash game poker](/guides/cash-game-poker), and [poker staking](/guides/poker-staking). It is not legal advice, and it does not say which sites may offer sit and goes where you live. Read the operator's terms. The rules below are the shape of the format, not a license.

[Texas Hold'em rules](/guides/texas-holdem-rules) still run the hand: two cards, blinds, flop, turn, river, and the same hand rankings. The sit and go adds a layer around the hand. Stacks are tournament chips. They are not cash you can stand up and redeem mid-event. The only cash is the prize for the places that pay.

If the lobby says rebuy or add-on, it is not a classic freezeout. Those words change the strategy and the price. Believe the lobby. This article's examples assume a freezeout unless they say otherwise.`,
    },
    {
      id: "clock",
      title: "Blinds, stacks, and a clock that does not care",
      body: `Blinds rise on a schedule, often every few minutes in a turbo and more slowly in a regular structure. Your stack in big blinds is the number that matters. A 1,500-chip stack is comfortable at 10/20 and desperate at 100/200. Learn to divide stack by the big blind every level. The raw chip count is a distraction.

Antes, if the structure uses them, put a chip in from every player each hand. They swell the pot and punish folding forever. Read whether your event has antes. A strategy written for antes is wrong on a table that has none, and the reverse.

The button moves. Position remains valuable, and it gets more valuable as stacks shrink, because you can steal blinds that are a large share of a short stack. [Texas Hold'em strategy](/guides/texas-holdem-strategy) covers position and hand selection in general. In a sit and go you add one constraint cash games do not have: you cannot reach into your pocket for another buy-in when a bluff fails.

Disconnect rules belong to the client. Some sites play your hand through, some put you all-in blind, some give you a clock. Read the rule before you play on a train. A format that starts the moment seats fill will not pause because your phone dropped.

Average stack falls in big blinds even if nobody is eliminated, because the blinds rise. "I have the same chips as an hour ago" can mean you are now short. Look at the clock, not at your pride.`,
    },
    {
      id: "payouts",
      title: "Payouts: read the table, then do the division",
      body: `The lobby lists who gets paid. A winner-take-all sit and go pays one person. A two-place table pays first and second. A three-place table pays a bubble. The percentages are not a law of poker. They are a row in that event. If you remember "standard" from a different site, you may play the wrong bubble.

Suppose a six-max freezeout lists 65% for first and 35% for second. Suppose the entry is $10 + $1, so $10 goes to the prize pool and $1 is the fee. Six players pay $11 each, which is $66 collected. The prize pool is 6 × $10 = $60. First receives 0.65 × $60 = $39. Second receives 0.35 × $60 = $21. The $6 in fees does not return. If your lobby says 50/30/20, or a $15 + $2 entry, throw this Suppose out and divide the numbers on the screen.

The fee is why "I min-cashed" can still be a loss. Second place at $21, after you paid $11, is a $10 profit in this Suppose. First at $39 is a $28 profit. Missing the money entirely costs the whole $11. You need the places you actually hit, not the place you almost hit.

ICM is the name for a simple idea: chips are not worth their face in dollars when payouts are lumpy. The last short stack may be desperate. The big stack may be right to fold a small edge if busting would cost a paid place. You do not need a solver to respect that. You need to know how many places pay.

| Place, Suppose 65/35 | Share of $60 pool | Prize | Profit after $11 entry |
| --- | --- | --- | --- |
| First | 65% | $39 | $28 |
| Second | 35% | $21 | $10 |
| Third through sixth | 0% | $0 | −$11 |

| What changed | Freezeout sit and go | Cash game |
| --- | --- | --- |
| Field | Fixed when it starts | Comes and goes |
| Rebuy | No, unless the lobby says so | You may buy in again |
| Blinds | Rise on a clock | Stay at the table's stake |
| Payout | Posted places | The pot, minus the table fee |`,
    },
    {
      id: "ten-games",
      title: "A second dollar example across ten entries",
      body: `Stay with the Suppose six-max: $11 entry, $39 for first, $21 for second. You play ten of them. Suppose you cash twice, both times in first, and you miss the other eight. Prize money in = 2 × $39 = $78. Cost = 10 × $11 = $110. You are down $32. Two wins felt busy. The sheet says you did not win enough of them, and you never min-cashed.

Change the Suppose. You cash four times: two firsts and two seconds. Money in = $78 + $42 = $120. Cost = $110. You are up $10 across ten games. That is a thin result sitting on a teaching story, not a forecast of your talent. Ten sit and goes are a receipt. They are not a career sample. Variance in a top-heavy payout is large enough that a good player can lose twenty in a row and a weak player can ship three.

Use the arithmetic to see the fee. Each game removed $1 before you played a card. Ten games removed $10 that never entered a prize. Your edge has to cover that $10 plus the prizes you fail to reach. [Poker bankroll management](/guides/poker-bankroll-management) is blunt about this shape: tournament results clump, so the number of buy-ins you need is larger than a cash-game picture suggests. A roll does not manufacture the edge. It only stops one cold week from ending the experiment.

If you cannot afford ten losses at the entry price, the entry is too high. Move down or do not register. The format will still be there.`,
    },
    {
      id: "strategy",
      title: "Strategy from the first level to the bubble",
      body: `Early, stacks are deep in big blinds and the payout is far away. Play a solid range. Speculative hands lose value as the clock eats the stack, so do not spend the first level calling every suited connector because a cash game would. There is no rebuy if the flop misses and someone raises the size of your tournament.

Middle levels are about blinds that matter. Open steals from late position when folded to you. Defend less from the blinds with junk than your ego wants, and more when the opener is wide and your stack can apply pressure. The goal is chips measured in blinds, not a highlight reel.

The bubble is the moment just before a paying place. If three places pay and four players remain, fourth is the pain seat. A short stack may need to shove wide. A big stack can pick on medium stacks who are trying to fold into the money. Calling off a medium stack with a small edge can be a mistake when busting pays zero and waiting pays a min-cash. This is not cowardice. It is the payout table doing its job.

Do not flip the lesson into "never play a pot on the bubble." A stack that blinds out also misses the money. The mistake is ignoring the posted payout, not the act of folding or the act of shoving. Look at how many big blinds you have, how many places pay, and who covers you.

When you are the short stack, your strategy collapses toward push or fold. Little raises that commit a third of your stack are the worst of both worlds. Pick a hand that can stand an all-in, and put the chips in. Then accept the result. A sit and go ends.`,
    },
    {
      id: "heads-up",
      title: "The last match is a different game",
      body: `If the payout requires a winner, two players remain and the event becomes heads-up. Ranges widen. Position alternates between button and big blind in a way that feels fast if you have only played full ring. [Heads-up poker strategy](/guides/heads-up-poker-strategy) is the right next read: you will be in many more pots, and waiting for a premium pair is how the blinds eat a lead.

Watch the payout before you treat heads-up as a must-win war. If second place already pays almost as much as first, a wild flip sacrifices a locked difference for a small step up. If the event is winner-take-all, second pays zero and the flip is the whole prize. Same two players, different correct risks. The lobby decided it before you were dealt in.

Deal-making, if the client allows it, is a separate agreement to split the remaining pool. Read the numbers. A deal can be fair, and it can also be a big stack leaning on a short stack. You do not have to accept a chop. You also do not have to prove anything by refusing a chop that matches the chips.

PVPspinArena will not deal this final match. It does not run sit and goes. Its poker is six-max cash Hold'em, with a 5% fee only after a flop. If you leave the client and want a one-shot contest instead, that is a different product with a different fee, not a shortcut to a sit and go trophy.`,
    },
    {
      id: "checklist",
      title: "Checklist before you register",
      body: `Run this checklist on the registration panel.

- I am 18 or older. This page is not legal advice about the site I am about to use.
- I see the field size, the blind clock, and whether rebuys exist.
- I copied the payout percents and the fee, and I can state first place in dollars.
- I know how many big blinds the starting stack is at level one.
- The entry is an amount I can lose many times. One ship is not a plan.
- I know whether second place pays. My bubble plan matches that fact.
- I have a stop for the session so a string of third-place busts does not raise the stakes.

Sit and go poker is a small tournament with a known field and a rising clock. The rules of the hand are Hold'em. The rules of the money are the payout table and the fee. Winning strategy is whatever builds chips without pretending every chip is a dollar, then plays heads-up on purpose when the field is gone.

Read the table. Then register, or do not. The seats will fill without you if the game is real. Use [responsible gambling](/responsible-gambling) if the registration button has become the session instead of the cards.`,
    },
  ],
  faqs: [
    {
      q: "How does sit and go poker start?",
      a: "It starts when the listed number of players register. There is no clock time that forces it to begin short-handed. If the lobby shows a start time instead, you are looking at a scheduled tournament.",
    },
    {
      q: "What is a typical sit and go payout?",
      a: "There is no universal table. Suppose a six-max pays 65% and 35%. Your event might pay three places or only the winner. Divide the prize pool printed in the lobby, not a number from memory.",
    },
    {
      q: "Do sit and go fees come out of the prize pool?",
      a: "Usually the entry is shown as pool plus fee, and only the pool is paid to finishers. Read your lobby. The fee is the cost of hosting, and min-cashing does not refund it.",
    },
    {
      q: "Should I play tight early and gamble late?",
      a: "Early, a solid range fits deep stacks. Late, short stacks should shove or fold rather than limp a third of their chips in. The bubble depends on how many places pay. Read that before you tighten or open up.",
    },
    {
      q: "Does PVPspinArena run sit and go poker?",
      a: "No sit and go and no rising blinds. Six-max cash Hold'em is live, with a 5% fee only after a flop. Jackpot and Coinflip take 5% of a single pot and have no payout ladder.",
    },
  ],
  sources: [
    { label: "Wikipedia — Sit and go", url: "https://en.wikipedia.org/wiki/Sit_and_go" },
    { label: "Wikipedia — Poker tournament", url: "https://en.wikipedia.org/wiki/Poker_tournament" },
  ],
  related: [
    "spin-and-go",
    "cash-game-poker",
    "poker-staking",
    "texas-holdem-rules",
  ],
  updated: "2026-10-07",
};
