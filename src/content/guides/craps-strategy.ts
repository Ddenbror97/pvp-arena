import type { Guide } from "./types";

export const guide: Guide = {
  slug: "craps-strategy",
  cluster: "Casino games",
  keyword: "craps strategy",
  secondary: [
    "best craps bets",
    "pass line with odds",
    "craps betting strategy",
    "3-4-5x odds craps",
  ],
  title: "Craps Strategy: Pass, Come, Odds and What to Skip",
  description:
    "Craps strategy that holds up: pass or come with free odds, place 6 and 8, why props cost 9–17%, worked bankroll maths and the systems that change nothing.",
  h1: "Craps strategy: pass and come with odds, skip the props",
  answer:
    "The only craps strategy the maths supports is simple: bet the pass line (or don't pass), back it with as much free odds as you can afford, add come bets with odds if you want more action, and skip proposition bets. Pass carries a 1.41% edge, odds carry none, and props run 9% to 17%. No staking pattern or dice trick changes those numbers.",
  facts: [
    "Pass line: 1.41% house edge. Don't pass: 1.36%. Come and don't come match them.",
    "The odds bet pays true odds, so it has a 0% house edge; it is the best bet in the casino.",
    "With 3-4-5x odds the combined edge on pass plus odds falls to about 0.37%.",
    "Place 6 and 8 cost 1.52%; place 4 and 10 cost 6.67% unless you buy them.",
    "Any 7 costs 16.67%, and hardways cost 9.09% to 11.11%.",
    "Your expected dollar loss is set by the flat bet, not by the odds you add behind it.",
  ],
  sections: [
    {
      id: "core",
      title: "The core plan: pass line plus odds",
      body: `Craps looks chaotic because the layout has dozens of boxes. Strategy starts by ignoring almost all of them. The rules and full probability tables live in the [craps odds guide](/guides/craps-odds); this page is about which bets to make and how much.

On the come-out roll, a pass line bet wins on 7 or 11 (8 ways out of 36), loses on 2, 3 or 12 (4 ways), and otherwise sets a point. Once a point is set, the bet wins if the point repeats before a 7. Work through every path and the pass line wins 244 of every 495 decisions, about 49.29%. It pays even money, so the house keeps 7/495 of each dollar, or 1.41%.

After a point is established you may place an **odds** bet behind the pass line. It wins and loses with the pass bet, but it pays true odds:

| Point | Chance to make it | Odds pays | Edge on odds |
| --- | --- | --- | --- |
| 4 or 10 | 3 in 9 (33.3%) | 2 to 1 | 0% |
| 5 or 9 | 4 in 10 (40%) | 3 to 2 | 0% |
| 6 or 8 | 5 in 11 (45.5%) | 6 to 5 | 0% |

Check 4: you win 2 units a third of the time and lose 1 unit two thirds of the time. 2 × 1/3 − 1 × 2/3 = 0. That zero is why every serious craps strategy is built around the odds bet. It is not printed on the felt, the dealer will rarely suggest it, and it is still the cheapest wager in a land casino.

### The 3-4-5x table

Many tables allow "3-4-5x" odds: three times the flat bet on 4 and 10, four times on 5 and 9, five times on 6 and 8. The design means a winning odds bet always pays six times the flat bet. On a $10 pass line: $30 odds on 4 pays $60, $40 on 5 pays $60, $50 on 6 pays $60. Dealers like it because the payout is always the same, and you should like it because the combined edge on your total action drops sharply.`,
    },
    {
      id: "edge-maths",
      title: "Why odds lower the percentage but not the dollar cost",
      body: `House edge is a percentage of money wagered. The odds bet dilutes the pass line's 1.41% with money that has no edge, so the blended figure falls as the multiple rises.

| Odds allowed | Combined edge (pass + odds) |
| --- | --- |
| None | 1.41% |
| 1x | 0.85% |
| 2x | 0.61% |
| 3-4-5x | 0.37% |
| 10x | 0.18% |
| 100x | 0.02% |

Now the part players miss. Your expected loss in dollars per decision comes only from the flat bet. A $10 pass line costs about $0.14 per decision whether you take no odds or full odds. What the odds change is how much you have in action while paying that $0.14.

### A worked comparison

A point is set two thirds of the time. On a 3-4-5x table, the average odds bet behind a $10 flat is (6 × $30 + 8 × $40 + 10 × $50) ÷ 36 ≈ $27.78 per decision. So average action is about $37.78, and the cost is still about $0.14.

A player who wants $38 of action with no odds has to bet about $38 on the pass line and pays roughly $0.54 per decision. Same excitement, nearly four times the price. The strategic rule follows directly: **lower the flat bet and put the rest behind it as odds**. If you would normally bet $25 flat, try $10 flat with 2x or 3x odds.

This is the same principle covered in [house edge](/guides/house-edge): the edge is charged on each dollar, so a strategy is really a choice about which dollars you expose to it.`,
    },
    {
      id: "come-dont",
      title: "Come bets, don't pass and placing 6 or 8",
      body: `### Come bets

A come bet is a pass line bet made after the point is set. The next roll is its own come-out: 7 or 11 wins, craps loses, and any other number becomes that bet's point, to which you can add odds. Two or three come bets with odds give you several numbers working at the same 1.41% base cost. Be aware of one rule: at many tables, odds on come bets are "off" on the next come-out roll by default, so a 7 on the come-out takes your flat come bets but returns their odds.

### Don't pass and don't come

Don't pass wins on 2 or 3 on the come-out, loses on 7 or 11, and pushes on 12 at most tables. After a point, it wins if 7 arrives first. The edge is 1.36%, a hair better than pass. You can **lay** odds behind it: lay $60 to win $30 against a 4, $60 to win $40 against a 5, $60 to win $50 against a 6. Laid odds are also 0% edge.

Two practical notes. Once a point is set, a don't bet is the favourite (against a 4 it wins two times in three), so casinos let you remove it; doing so throws away that advantage. And some players dislike betting against the table. That is etiquette, not maths, and it is your call.

### Place 6 and 8

Placing the 6 or 8 pays 7 to 6. It wins 5 times for every 6 times a 7 shows, so a $6 bet returns 5 × $7 − 6 × $6 = −$1 over 11 decisions, an edge of 1.52%. That is the only place bet close to the pass line. Placing 5 or 9 (7 to 5) costs 4.00%, and placing 4 or 10 (9 to 5) costs 6.67%. If you want the 4 or 10, a **buy** bet paying 2 to 1 with a 5% commission charged only on wins costs about 1.67%. Where the commission is taken up front, it is 4.76%, which is worse.`,
    },
    {
      id: "avoid",
      title: "The bets to avoid, with the numbers",
      body: `The centre of the table is where the casino earns its margin. These bets resolve fast and pay big-sounding amounts, which is exactly how a high edge hides.

| Bet | Typical pay | True odds | House edge |
| --- | --- | --- | --- |
| Field (2 and 12 pay 2x) | 1 to 1, 2 to 1 | varies | 5.56% |
| Field (12 pays 3x) | 1 to 1, 2 to 1, 3 to 1 | varies | 2.78% |
| Big 6 / Big 8 | 1 to 1 | 6 to 5 | 9.09% |
| Hard 6 / Hard 8 | 9 to 1 | 10 to 1 | 9.09% |
| Hard 4 / Hard 10 | 7 to 1 | 8 to 1 | 11.11% |
| Any craps | 7 to 1 | 8 to 1 | 11.11% |
| Yo (11) | 15 to 1 | 17 to 1 | 11.11% |
| Aces or twelve | 30 to 1 | 35 to 1 | 13.89% |
| Any 7 | 4 to 1 | 5 to 1 | 16.67% |

Any 7 is worth one look. A 7 comes 6 times in 36, so true odds are 5 to 1. Paying 4 to 1 means you collect 5 units (4 plus your stake) on 6 of 36 rolls: 30/36 of your money back, a 16.67% loss per bet. It is roughly twelve times as expensive as the pass line.

Big 6 and Big 8 are a classic trap because the same number can be placed right next to them at 7 to 6. Betting Big 6 instead of place 6 is choosing a 9.09% edge over a 1.52% edge for an identical event.

The **Iron Cross** (field plus place 5, 6 and 8) is marketed as winning on every number except 7. It does, and each piece keeps its own edge, so the combination loses money at a blend of 2.78% to 5.56%, 4.00% and 1.52%. Covering many outcomes changes how often you win, not what you pay. The probabilities behind these rows are laid out in [dice roll probability](/guides/dice-roll-probability).`,
    },
    {
      id: "bankroll",
      title: "Bankroll, variance and session size",
      body: `A low edge does not mean low swings. Odds bets add variance: with $10 flat and 5x odds on a 6, one seven-out costs $60.

### Sizing the bankroll

A useful rule of thumb (not a law) is to bring enough for 15 to 20 of your worst single-decision losses. At $10 flat with 3-4-5x odds, the worst ordinary loss is $60, suggesting $900 to $1,200 for a full session. If that is too much, drop to 2x odds or a $5 flat bet. The [bankroll calculator](/guides/bankroll-calculator) lets you test other sizes.

### Cost per hour

Decide the cost of entertainment before you sit down. A pass line decision takes about 3.4 rolls on average. If you play only a $10 pass line plus odds, the expected cost is roughly $0.14 per decision; with two come bets also working it is closer to $0.42 per round of decisions. Those are expectations, not guarantees. The spread around them is wide, and the [variance guide](/guides/variance-in-gambling) explains why a night can land far from the average in either direction.

### Stop rules

Write two numbers first: a loss limit and a time limit. A win target is optional; it is fine as a reason to leave, but it has no effect on the maths of the next roll.`,
    },
    {
      id: "myths",
      title: "Systems and dice control: what they really change",
      body: `### Progressions

Pressing bets after wins, the [Martingale strategy](/guides/martingale-strategy) after losses, or "regressing" a place bet after one hit all change stake size over time. None changes the probability of a 7 or the payout on a 6. The blended edge stays whatever your bet mix says. A regression can lock in a small profit early in a hand, and it also reduces what you win on long hands. It reshapes results; it does not create value.

### Hot and cold tables

Shooters have long rolls and short ones, and memorable hands get retold. Each roll is still independent. Waiting for a "cold" table to bet the don't side, or chasing a "hot" one, is the [gambler's fallacy](/guides/gamblers-fallacy) in a craps setting.

### Dice setting

Some players arrange the dice before throwing and claim a controlled toss can shift the frequency of 7. The evidence offered is mostly anecdotal and disputed, casinos require both dice to hit the back wall, and no widely accepted independent test has shown a reliable edge. Treat it as ritual, not strategy.

Craps descends from the older English game hazard, covered in [hazard dice game](/guides/hazard-dice-game). If you want to play digitally, [online craps](/guides/online-craps) covers where and how, and the wider [casino games hub](/guides/topics/casino-games) compares edges across the floor.`,
    },
    {
      id: "pvp",
      title: "The same maths in a PvP round",
      body: `The lesson of craps strategy is that the real decision is which bets carry which edge, then how much you expose to them. That applies anywhere.

On PVPspinArena [Roulette](/roulette), Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. After the fee the Purple or Silver edge is about 7.88%, and Green is much more expensive. That Purple price is steeper than the pass line and cheaper than any 7. There is no zero-edge odds bet to dilute it, so bet size is the only lever. [Coinflip](/coinflip) is a two-player 50/50 where the winner takes the pot minus any fee shown before entry. You can check any settled round on the [fairness page](/fairness), which is closer to the transparency of watching dice than to trusting a machine.

Gambling is 18+ (or the local legal age). If a session is running past the limits you wrote down, the [responsible gambling](/responsible-gambling) page has tools and help.

In the same cluster, see also [teen patti](/guides/teen-patti), [pai gow tiles](/guides/pai-gow-tiles), and [baccarat strategy](/guides/baccarat-strategy).`,
    },
  ],
  faqs: [
    {
      q: "What is the best craps strategy?",
      a: "Bet the pass line or don't pass with the smallest flat bet you are comfortable with, take maximum odds, and optionally add one or two come bets with odds. Avoid proposition bets.",
    },
    {
      q: "Is don't pass better than pass?",
      a: "Slightly. Don't pass has a 1.36% edge versus 1.41% for pass. The difference is about five cents per $100 wagered, so choose the side you enjoy.",
    },
    {
      q: "Why is the odds bet not on the table layout?",
      a: "Casinos do not mark it because it has no house edge. You place it behind your pass or come bet after a point is set, and it pays true odds.",
    },
    {
      q: "Are place bets on 6 and 8 good?",
      a: "They are reasonable at 1.52%, close to the pass line. Place 5 and 9 cost 4.00%, and place 4 and 10 cost 6.67%, so those are much worse.",
    },
    {
      q: "Can you beat craps with a betting system?",
      a: "No. Systems change how much you bet and when, not the probability of each roll. The edge on each bet stays the same, so the long-run result follows it.",
    },
    {
      q: "Does dice control work in craps?",
      a: "There is no widely accepted independent evidence that it does. Claims are mostly anecdotal, and casinos require throws to hit the back wall.",
    },
  ],
  sources: [
    { label: "Wizard of Odds: craps", url: "https://wizardofodds.com/games/craps/" },
    { label: "Wikipedia: Craps", url: "https://en.wikipedia.org/wiki/Craps" },
    { label: "Encyclopaedia Britannica: craps", url: "https://www.britannica.com/topic/craps" },
  ],
  related: [
    "craps-odds",
    "online-craps",
    "baccarat-strategy",
    "sic-bo-strategy",
    "dice-roll-probability",
    "house-edge",
    "teen-patti",
    "pai-gow-tiles",
  ],
  updated: "2026-09-27",
};
