import type { Guide } from "./types";

export const guide: Guide = {
  slug: "spaceman-game",
  cluster: "Game shows",
  keyword: "spaceman game",
  secondary: [
    "spaceman crash",
    "spaceman rtp",
    "spaceman 50 percent cashout",
    "pragmatic play spaceman",
    "spaceman multiplier",
  ],
  title: "Spaceman Game: 50% Cashout, RTP and Crash Odds",
  description:
    "Spaceman game by Pragmatic Play: how a crash round works, the 50% cashout feature, operator RTP settings, auto cashout maths and the 5,000x cap.",
  h1: "Spaceman game: Pragmatic Play crash, 50% cashout and RTP",
  answer:
    "The Spaceman game is Pragmatic Play's crash title. An astronaut climbs, a multiplier rises from 1.00x, and you must cash out before the crash or lose the stake. The signature 50% cashout locks half the bet at the current multiplier and leaves the rest riding. RTP is set by the operator and commonly falls between 95% and 96.5%. Real-money play is 18+.",
  facts: [
    "Spaceman is a Pragmatic Play crash game released in 2022, with a published maximum multiplier of 5,000x.",
    "The 50% cashout button banks half the stake at the multiplier showing and keeps the other half in the round.",
    "Operators can run different RTP builds; figures cited across product copy and reviews cluster around 95.00% to 96.50%.",
    "Auto cashout and 50% auto cashout let you pre-set a full or half exit so reaction time is not the decision.",
    "A 50% cashout does not raise RTP. It splits one bet into two cashout times that still pay the same long-run price.",
  ],
  sections: [
    {
      id: "what",
      title: "What the Spaceman game is and how a round works",
      body: `Spaceman is Pragmatic Play's branded crash game. It sits next to [JetX](/guides/jetx-game) and [Aviator](/guides/aviator-game-guide) in casino lobbies, and the generic crash maths — a rising multiplier, a hidden crash point, a built-in edge — is on [crash gambling](/guides/crash-gambling). This page is what is specific to Spaceman: the 50% cashout, the operator RTP range and the 5,000x ceiling.

A round has four stages:

1. **Betting.** A short countdown. You set a stake, and optionally an auto cashout and a 50% auto cashout.
2. **Launch.** The astronaut takes off. The multiplier starts at 1.00x and climbs.
3. **Cashout.** You can press full cashout or 50% cashout at any time. Full cashout settles the whole stake at the multiplier the server accepts. 50% cashout settles half and leaves half live.
4. **Crash.** At a point fixed when the round is generated, the flight ends. Any stake still live is lost.

The history bar of recent multipliers is a record, not a forecast. A run of low crashes does not make a high one due. Spaceman is offered through licensed operators as a studio RNG product. Check the in-game information panel at your casino for the live RTP and the max win. It belongs in the [Game shows topic](/guides/topics/game-shows). Adults only, 18+ or the local legal age.`,
    },
    {
      id: "fifty",
      title: "The 50% cashout, worked in cash",
      body: `The feature that separates Spaceman from most crash titles is a mid-round split. You do not have to pick one exit. You can bank half and keep hunting with half.

### Worked path on a $10 stake

You bet $10. The multiplier hits 2.00x. You press 50% cashout.

- Half the stake is $5. That half settles at 2.00x and returns $10. Relative to that $5, you have +$5.
- The remaining $5 is still live.

Now three endings:

| What happens next | Money returned | Profit vs the $10 stake |
| --- | --- | --- |
| Cash the rest at 2.00x as well | $10 + $10 = $20 | +$10 (same as a full 2x) |
| Cash the rest at 4.00x | $10 + $20 = $30 | +$20 |
| Crash before a second cashout | $10 + $0 = $10 | $0 |

You did not invent a hedge that beats the edge. You created two cashout targets that share one crash point. The first half is a 2x bet. The second half is whatever target you pick later, or a total loss if you never exit.

### Expected value of the split, same $10

Assume r = 0.96 so P(reach 2x) ≈ 48% and P(reach 4x) ≈ 24%. You always try 50% at 2x, then leave the rest to 4x.

- Crash before 2x (52%): −$10
- Reach 2x, crash before 4x (24%): first half +$5 on $5, second half −$5, net $0
- Reach 4x (24%): +$20 as in the table

Expected result ≈ 0.52(−10) + 0.24(0) + 0.24(20) = −5.2 + 4.8 = −$0.40, which is 4% of the $10. That is the 96% RTP on the dollars that were at risk, not a new bargain. A full $10 at 2x would expect 0.48 × $10 − 0.52 × $10 = −$0.40 as well. Same mean, different path.

### Why it feels safer

Seeing $10 come back at 2x while $5 still flies feels like a free roll. It is not free. You already used $5 of risk to buy that $10 return. The live $5 is a new bet. Treat it as a new bet. If you would not open a fresh $5 at 10x, do not leave the leftover $5 on 10x just because the first half "paid for it." That story is how a planned 2x session becomes an unplanned high-target session.`,
    },
    {
      id: "rtp",
      title: "Spaceman RTP: one game, several prices",
      body: `Pragmatic Play ships crash and slot titles that operators can configure. Published and widely cited Spaceman figures sit in a band from about **95.00% to 96.50%**. That is a 3.5% to 5% house edge. The skin on screen does not tell you which build you are on. The information or help panel inside the live game does. Read it.

In a crash game tuned to return r, the chance of reaching multiplier m is close to r ÷ m, before rounding and any instant-crash mass at 1.00x. Using r = 0.96 as a mid-band example:

| Cashout target | Approx. chance to reach it | Expected return per $1 |
| --- | --- | --- |
| 1.50x | 64% | $0.96 |
| 2x | 48% | $0.96 |
| 5x | 19.2% | $0.96 |
| 10x | 9.6% | $0.96 |
| 100x | 0.96% | $0.96 |
| 5,000x | 0.0192% | $0.96 |

The last column is the point. Every target has the same expected return. A 2x auto cashout is smoother. A 100x target is lumpier. Neither is a bargain relative to the other. If your panel shows 95.00% instead of 96.50%, every $1,000 of turnover costs about $50 on average rather than $35. That gap is larger than most staking systems will ever recover.

The 5,000x cap means a theoretical r ÷ 5000 probability is also a prize the operator may cap in currency. A max-win clause can cut a hit that the multiplier displayed. Read the rules for both the multiplier ceiling and the cash ceiling.

### Instant crashes and the edge you can see

If P(reach m) ≈ r ÷ m, then P(reach 1.00x) ≈ r. The leftover 1 − r is the mass of rounds that pay nobody, however fast they click: about 3.5% of rounds at 96.5% RTP and about 5% at 95%. Those instant 1.00x deaths are not a glitch. They are one visible way the price is collected. A 50% cashout does not fire if the flight never leaves the pad.

### $1,000 of turnover, two prices

200 rounds at $5 is $1,000 staked. At 96.5% the expected cost is about $35. At 95% it is $50. The 50% button, a 2x habit or a 20x habit does not move those means. It only changes how wide the night can swing around them. A 2x full auto on 200 rounds at 48% hit rate is a relatively tight band. A 20x target on the same 200 rounds (about 4.8% hits at r = 0.96) is a night of mostly zeros and a handful of $95 profits on $5 stakes. People remember the handful.`,
    },
    {
      id: "auto",
      title: "Auto cashout, 50% auto and two decisions",
      body: `Spaceman lets you pre-set a full auto cashout and, separately, a 50% auto cashout. Both fire when the multiplier first reaches the number you typed.

### A clean plan

1. Stake you can lose twenty times in a row without changing the plan.
2. Full auto at one number, or 50% auto at a low number and full auto at a higher number.
3. A round limit and a loss limit written before the first countdown.

Example: $2 stake, 50% auto at 2.00x, full auto on the remainder at 5.00x. Then:

- Crash before 2x: −$2.
- Crash between 2x and 5x: first half returns $2, second half loses $1, net −$1 on the $2 stake.
- Reach 5x: first half $2 + second half $5 = $7 returned, +$5.

Those three buckets still average to the RTP on the dollars that were actually at risk in each bucket. You bought a result shape, not a better price. The same idea, with different buttons, is in [crash game strategy](/guides/crash-game-strategy).

### What auto cashout fixes

It removes lag between your click and the server, and it stops you from raising the target mid-flight because "it looks like it will go." It does not remove the 3.5–5% price. Auto-bet that repeats the same stake for hundreds of rounds just accelerates turnover. Speed is how a small edge becomes a large nightly cost.`,
    },
    {
      id: "myths",
      title: "Signals, seeds and cloned lobbies",
      body: `Search for the Spaceman game and you will find Telegram "signal" rooms and apps that claim to know the next crash. They do not. The crash point is generated on the game server. Your screen shows the climb after the fact. A history of 1.12x, 3.40x, 1.00x is independent draws, not a pattern you can trade.

Spaceman is typically offered as a certified studio RNG title. That is a lab-and-licence trust model, not the same thing as a commit-reveal seed you can recompute yourself. If an operator page says "provably fair" for this title, open the actual verification tool and see whether you can reproduce a past crash from published seeds. Marketing language and a working verifier are different products.

Clone sites copy the astronaut art and run their own numbers. [Fake casino sites](/guides/fake-casino-sites) exist to take deposits. Play only where you can verify the operator, and treat APKs and "modded Spaceman" downloads as malware until proven otherwise.

### Spaceman next to JetX and Aviator

All three are crash skins on the same r ÷ m idea. JetX is commonly listed near 97% with two separate bets. Aviator is commonly listed near 97% with a high multiplier ceiling. Spaceman's usual selling point is the half-cashout, not a better price. If your panel shows 95%, you are paying more than a 97% rival for the same shape of game. Check the panel on each title in the same lobby; aggregators do not guarantee one RTP across a row of crash icons.

Chat and a live bet list are social proof, not information. Other players cashing at 1.20x does not change your 10x ticket. A history bar of 1.05x, 8x, 1.00x is not a schedule. The next crash is independent of the last dozen, the same independence mistake described in [gambler's fallacy](/guides/gamblers-fallacy).

A session log helps more than a signal group. Write stake, full-auto target, whether 50% auto was on, and the result. After 50 rounds you can see whether you followed the plan. After 50 rounds you still cannot see the next multiplier.`,
    },
    {
      id: "pvp",
      title: "Crash edge next to a hashed PvP round",
      body: `A 96% RTP crash bet returns $0.96 per $1 in the long run, whatever the 50% button does. PVPspinArena runs three player-vs-player games in USDC or ETH on Base: Jackpot, [Coinflip](/coinflip) and [Roulette](/roulette). Coinflip is a 50/50 between two players. Roulette uses a 33-slot wheel — 16 Purple and 16 Silver at 2x, 1 Green at 14x — and Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Seeds are committed before the result, and a settled round can be checked on [fairness](/fairness).

If Spaceman sessions are running past the round limit you wrote, close the tab. The tools on [responsible gambling](/responsible-gambling) are for that moment, not for later. A 50% cashout that keeps "paying for" leftover halves is the same chase with an extra button.

In the same cluster, see also [chicken road game](/guides/chicken-road-game) and [mines predictor](/guides/mines-predictor).`,
    },
  ],
  faqs: [
    {
      q: "What is the Spaceman game?",
      a: "A Pragmatic Play crash game: a multiplier climbs with an astronaut and you cash out before the crash. Its distinctive control is a 50% cashout that banks half the stake and leaves half live.",
    },
    {
      q: "What is the RTP of Spaceman?",
      a: "Operators can run different builds. Commonly cited figures range from 95.00% to 96.50%. The number that matters is the one on the in-game information panel at your casino.",
    },
    {
      q: "How does the 50% cashout work?",
      a: "At the current multiplier, half your stake is settled and the other half stays in the round until you cash it out or the game crashes. It changes when money is locked, not the long-run RTP.",
    },
    {
      q: "What is the maximum win on Spaceman?",
      a: "The published multiplier ceiling is 5,000x. Operators may also cap the cash payout. Read both limits in the game rules.",
    },
    {
      q: "Do Spaceman predictor apps work?",
      a: "No. The crash point is generated server-side. Apps that promise the next multiplier are guessing or collecting logins and wallet details.",
    },
  ],
  sources: [
    { label: "Pragmatic Play", url: "https://www.pragmaticplay.com/" },
    { label: "Wikipedia: Expected value", url: "https://en.wikipedia.org/wiki/Expected_value" },
    { label: "UK Gambling Commission", url: "https://www.gamblingcommission.gov.uk/" },
  ],
  related: [
    "jetx-game",
    "chicken-road-game",
    "crash-gambling",
    "crash-game-strategy",
    "aviator-game-guide",
    "crash-cashout-calculator",
    "mines-predictor",
  ],
  updated: "2026-09-27",
};
