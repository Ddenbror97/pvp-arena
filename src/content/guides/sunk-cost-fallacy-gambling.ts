import type { Guide } from "./types";

export const guide: Guide = {
  slug: "sunk-cost-fallacy-gambling",
  cluster: "Casino knowledge",
  keyword: "sunk cost fallacy",
  secondary: [
    "sunk cost fallacy gambling",
    "sunk cost bias",
    "chasing losses psychology",
    "concorde fallacy",
  ],
  title: "Sunk Cost Fallacy: Why Gamblers Chase Their Losses",
  description:
    "The sunk cost fallacy explained: the research behind it, how it drives chasing losses, worked numbers from real bets, and rules that break the loop.",
  h1: "Sunk cost fallacy: why past losses pull gamblers back in",
  answer:
    "The sunk cost fallacy is the tendency to keep investing in something because of what you have already spent, even though that money, time or effort is gone whatever you do next. In gambling it shows up as chasing: staying longer or redepositing to win back losses. A rational decision looks only at future costs and benefits, and the lost stake does not change the next bet's odds.",
  facts: [
    "A sunk cost is money, time or effort already spent that cannot be recovered by any future choice.",
    "Arkes and Blumer's 1985 studies showed people attend, travel and invest more simply because they paid more.",
    "Chasing losses to get even is one of the diagnostic criteria for gambling disorder in the DSM-5.",
    "On about a 7.88% Purple or Silver edge after the win fee bet, every future dollar wagered costs about 6.7 cents on average, no matter what was lost before.",
    "The same bias is called the Concorde fallacy, after the supersonic airliner programme that kept being funded.",
  ],
  sections: [
    {
      id: "what",
      title: "What the sunk cost fallacy is",
      body: `Economists call a cost "sunk" when it has already been paid and no future decision can bring it back. The textbook rule is blunt: ignore it. Only the costs and benefits that are still ahead of you should shape what you do next. The sunk cost fallacy is the very human habit of doing the opposite, letting the unrecoverable past steer the future.

### The research that named it

Richard Thaler brought the idea into behavioural economics in 1980, and Hal Arkes and Catherine Blumer tested it directly in a 1985 paper, "The psychology of sunk cost". In one field study, a university theatre randomly sold some season-ticket buyers a discount. Those who paid full price went to more performances in the first half of the season. The plays were the same; the only difference was the money already spent.

In another of their questions, people imagined they had bought a $100 ski trip and a cheaper $50 trip for the same weekend, both non-refundable, and that they expected to enjoy the cheaper one more. A majority still said they would go on the $100 trip. The extra $50 was gone either way, yet it decided the weekend.

### Related names

Barry Staw's 1976 work on "escalation of commitment" showed managers pouring more money into projects they had personally started after bad results. Biologists Richard Dawkins and Tamsin Carlisle used the phrase "Concorde fallacy" in 1976, after the Anglo-French airliner that governments kept funding long after its economics looked poor. All three labels describe the same pattern: past investment turning into a reason to keep investing.

Gambling is the purest setting for this bias because the stakes are counted in exact dollars and the next decision arrives every few seconds. The wider [Casino knowledge topic](/guides/topics/casino-knowledge) covers the other biases that travel with it.`,
    },
    {
      id: "why",
      title: "Why the mind treats sunk costs as live",
      body: `Nobody chooses to be irrational on purpose. Several well-studied forces push in the same direction at once.

### Loss aversion and mental accounts

Losses feel roughly twice as heavy as equal gains, a finding from Kahneman and Tversky's prospect theory that the [loss aversion guide](/guides/loss-aversion-gambling) unpacks. People also keep "mental accounts": a session, a deposit, a night out. While the account is open and negative, the loss feels provisional. Walking away closes the account and makes the loss real, so the mind looks for a way to keep it open.

### Risk seeking below the reference point

Prospect theory also predicts that people become more willing to gamble when they are behind their reference point, usually where they started. Thaler and Eric Johnson described a "break-even effect" in 1990: people who have lost are drawn to bets that offer a chance to get back to zero, even long shots they would normally refuse.

### Self-justification

Stopping after a loss can feel like admitting the earlier decisions were mistakes. Continuing lets you tell a story in which the outlay was an investment that has not paid off yet. Psychologists link this to cognitive dissonance: we prefer to change our behaviour to fit a flattering story rather than accept an uncomfortable one.

### Waste aversion

Most people were raised not to waste food, money or effort. That is usually a good rule. In a casino it misfires, because the money already lost is not waiting to be "used up" or redeemed. It has left your balance.

None of these forces changes a single probability. They change how the next bet feels, which is exactly why they are dangerous.`,
    },
    {
      id: "chasing",
      title: "Chasing losses: the fallacy in real numbers",
      body: `The DSM-5, the diagnostic manual used by psychiatrists, lists returning after a loss "to get even" as a criterion for gambling disorder. Chasing is the sunk cost fallacy with a stake attached.

### A worked session

You set a $100 budget for Purple on a 33-slot wheel that pays 2x on 16 slots. You are down $60. The $60 is sunk. Your real choice is only about the $40 left and anything you might add.

| Next move | Money wagered from here | Expected cost from here | Total expected result |
| --- | --- | --- | --- |
| Stop now | $0 | $0 | −$60 |
| Bet the $40 once | $40 | −$2.67 | −$62.67 |
| Cycle the $40 ten times | $400 | −$26.67 | −$86.67 |
| Redeposit $60 and bet it to "get even" | $60 | −$4.00 | −$64.00 |

The expected cost is simply turnover times the edge: each bet returns 32/33 of the stake on average, so every dollar wagered loses about 6.67 cents. The first $60 appears in every row. It cannot be won back in expectation by any row, because no row has a positive expected value.

### The get-even bet up close

Staking $60 on Purple wins with probability 16/33, about 48.5%, which takes you back to zero. It loses with probability 17/33, about 51.5%, which leaves you down $120. More than half the time the chase doubles the damage. Chains of these bets are the [Martingale strategy](/guides/martingale-strategy) in disguise.

### Why "even" keeps moving

Players rarely define even precisely. It might be the start of the night, the week, or the peak balance an hour ago. When the reference point is the peak, a player who is still up can feel like a loser and chase anyway.`,
    },
    {
      id: "spot",
      title: "How to spot it in your own play",
      body: `The sunk cost fallacy usually announces itself in the sentences people say to themselves.

- "I've put too much in to stop now."
- "Just until I'm back to where I started."
- "If I leave, someone else gets the win I paid for."
- "One more deposit and I'll be done."

Behaviour gives it away too: raising stakes after losses, extending a session past a planned end time, topping up from money set aside for bills, or borrowing to continue.

### Not the same as the gambler's fallacy

The [gambler's fallacy](/guides/gamblers-fallacy) is a belief about outcomes: after five reds, black feels "due". The sunk cost fallacy is about your own investment: you have spent so much that stopping feels like waste. They often appear together at a slot machine, where a player who has fed $200 in believes the machine is due and also feels entitled to the jackpot. Each error is independent of the other. Fixing one does not fix the second.

### When past money genuinely matters

Poker has one real exception worth understanding. Chips you put in the pot earlier are no longer yours, but they are part of the pot you can win. The correct call depends on [pot odds](/guides/poker-pot-odds): the size of the pot against the price of calling. That calculation ignores who contributed the chips. A player calling because "I've already put in so much" is committing the fallacy; a player calling because the pot offers 4-to-1 on a 25% draw is doing arithmetic. The two can lead to the same action for completely different reasons.

In casino games against a fixed edge, no equivalent exception exists. The pot is not growing in your favour; the house simply takes a slice of each wager.`,
    },
    {
      id: "rules",
      title: "Rules that break the loop",
      body: `Because the bias works in the moment, the defences work best when they are decided in advance.

1. **Write the budget before you play.** A number chosen while calm is harder to argue with than one chosen while down. The [gambling budget guide](/guides/gambling-budget) shows how to size it.
2. **Pay at the door.** Treat the budget as the price of the evening, like a concert ticket. Once paid, it is spent whether the result is good or bad.
3. **Use the fresh-start test.** Ask: if I walked in right now with this balance and no history, would I choose this bet at this size? If the answer is no, the only reason to continue is the sunk cost.
4. **No redeposit in the same session.** Make the rule absolute, and set any tools the site offers so the rule is enforced rather than remembered.
5. **Reset the reference point.** Each session starts at zero. Yesterday's loss is not a debt today's play must repay.
6. **Stop on time as well as money.** Chasing often shows up as a session that runs long rather than one that bets big.

PVPspinArena is 18+ only, and deposit limits, cooling-off options and support links sit on the [responsible gambling](/responsible-gambling) page. A short break, even a day, lets the emotional account close. If chasing has become a pattern rather than an occasional slip, the [how to stop gambling guide](/guides/how-to-stop-gambling) covers recovery steps and where to find help.`,
    },
    {
      id: "pvp",
      title: "Sunk costs in a hashed PvP round",
      body: `PVPspinArena runs three player-vs-player games: Jackpot, Coinflip and Roulette, played in USDC or ETH on Base. None of them keeps a memory of what you lost.

Each result comes from seeds committed before the round starts, and anyone can check a settled round on the [fairness page](/fairness). That design has a useful side effect for this topic: it proves there is no hidden balance that "owes" you a win after a bad run. The next [Roulette](/roulette) spin still has 16 Purple, 16 Silver and 1 Green slot. Purple and Silver still return 32/33, and Green still returns 14/33, before the win fee. The first spin of the night and the fiftieth are identical.

A [Coinflip](/coinflip) is a fair 50/50 between two players, with the winner taking the pot minus any fee shown before entry. Losing five flips does not make the sixth any likelier to land. In Jackpot your chance is your share of the pot, so the only way to raise it is to put more in, which is exactly what a chasing player is tempted to do.

Prestige XP builds as you wager and unlocks cosmetic rewards. It is a record of play, not a refund on losses, and it should never be the reason to extend a session.

The honest summary: a sunk cost is gone the moment the round settles. The next decision is always a fresh one, priced only by the odds in front of you.

In the same cluster, see also [illusion of control](/guides/illusion-of-control) and [skinner box](/guides/skinner-box-slot-machines).`,
    },
  ],
  faqs: [
    {
      q: "What is the sunk cost fallacy in simple terms?",
      a: "It is continuing something because of what you have already spent on it, rather than because of what you expect to get from it in the future.",
    },
    {
      q: "How does the sunk cost fallacy affect gambling?",
      a: "It drives chasing: staying longer, raising stakes or redepositing to win back losses. The lost money cannot be recovered in expectation, so chasing usually adds to the loss.",
    },
    {
      q: "Is the sunk cost fallacy the same as the gambler's fallacy?",
      a: "No. The gambler's fallacy is believing a random outcome is due. The sunk cost fallacy is continuing because of your past investment. They often appear together.",
    },
    {
      q: "Is it ever rational to consider money already bet?",
      a: "Only where it changes the future payoff, as in poker, where chips already in the pot raise the pot odds. Against a fixed house edge, past losses are irrelevant.",
    },
    {
      q: "How do I stop chasing losses?",
      a: "Set a budget and a time limit before playing, never redeposit in the same session, and use cooling-off tools. If chasing keeps happening, seek support.",
    },
  ],
  sources: [
    { label: "Wikipedia: Sunk cost", url: "https://en.wikipedia.org/wiki/Sunk_cost" },
    {
      label: "Wikipedia: Escalation of commitment",
      url: "https://en.wikipedia.org/wiki/Escalation_of_commitment",
    },
    { label: "Wikipedia: Problem gambling", url: "https://en.wikipedia.org/wiki/Problem_gambling" },
  ],
  related: [
    "loss-aversion-gambling",
    "illusion-of-control",
    "gamblers-fallacy",
    "how-to-stop-gambling",
    "gambling-budget",
    "skinner-box-slot-machines",
  ],
  updated: "2026-09-27",
};
