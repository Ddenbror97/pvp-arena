import type { Guide } from "./types";

export const guide: Guide = {
  slug: "claw-machine-tricks",
  cluster: "Games of chance",
  keyword: "claw machine tricks",
  secondary: [
    "are claw machines rigged",
    "claw machine payout settings",
    "claw strength",
    "crane game odds",
  ],
  title: "Claw Machine Tricks: Payout Settings and Real Odds",
  description:
    "Claw machine tricks that actually help, how claw strength and payout settings work, whether crane games are rigged, and what a play is worth on average.",
  h1: "Claw machine tricks: claw strength, payout settings and the real odds",
  answer:
    "The best claw machine tricks are about choosing the right machine and prize, not timing the button. Many modern cranes let the operator set claw strength and a payout rate, so the claw only grips firmly on some plays. You can improve your odds by picking loose, well-placed prizes, watching for a weak claw and aiming at the prize's centre, but not beat the setting.",
  facts: [
    "Many crane machines let operators set pick-up strength and carry strength separately.",
    "A payout or win-ratio setting can make the claw grip at full strength only about once per chosen number of plays.",
    "Where a machine uses a fixed count, a long losing streak brings the strong grab closer; with a randomised setting, past plays tell you nothing.",
    "Prize position matters more than button timing: loose, upright prizes near the chute are the best targets.",
    "Rules differ by country; the UK, for example, regulates crane grabs as a category of gaming machine.",
  ],
  sections: [
    {
      id: "how",
      title: "How claw machines work inside",
      body: `A claw machine (crane game, or UFO catcher in Japan, after Sega's well-known line) is a glass cabinet with a gantry-mounted claw. You pay, steer the claw over a prize with a joystick or buttons within a time limit, and press drop. The claw descends, closes, lifts, returns to the chute and opens. Whatever is still in its grip is yours.

Everything about that sequence is controlled by a small board the operator can configure. Common adjustable settings on modern machines include:

| Setting | What it controls |
| --- | --- |
| Pick-up strength | How hard the claw closes at the bottom |
| Carry strength | How hard it holds while lifting and travelling |
| Payout or win ratio | How often a play gets full strength |
| Play time | Seconds allowed to position the claw |
| Price per play | Cost and any multi-play discount |

The key detail is that pick-up and carry strength are often separate. A claw can close firmly enough to lift a prize, then relax as it rises so the prize slips out halfway to the chute. To a player that looks like bad luck or a poor aim. It is a setting.

This is why claw machines sit in the [Games of chance topic](/guides/topics/games-of-chance) rather than with pure skill games: aim matters, but the machine decides how often aim is enough.`,
    },
    {
      id: "rigged",
      title: "Are claw machines rigged?",
      body: `"Rigged" usually means one of two things, and the answer differs.

### Can you never win?

Usually false. A legally operated machine does pay out prizes, and many locations are required to make wins possible. Operators also want people to see wins; an untouched cabinet earns nothing.

### Is the win rate controlled?

On many machines, yes. With a payout setting, the operator chooses a target, for example one strong grab per so many plays, often calculated from the prize's cost and the price per play. On other plays the claw closes weakly or loosens during the lift. Skill can still matter on a strong play, because a strong claw in the wrong place still misses, but no amount of skill makes a weak claw hold a heavy prize.

### Skill mode

Some machines can be set to a "skill" mode where claw strength is constant and the result depends only on positioning. These are closer to a fair game of dexterity. You cannot tell from outside which mode a cabinet is in, but repeated observation helps (see the next section).

### Legal status

Rules vary. Some places treat cranes as amusement or skill machines with prize-value limits; others regulate them closer to gaming machines. In Great Britain, crane grabs are among the machine types covered by the Gambling Commission's gaming machine categories. If you want to know the rule where you live, check your local gambling or amusement regulator rather than assuming.`,
    },
    {
      id: "tricks",
      title: "Claw machine tricks that actually help",
      body: `None of these beat a payout setting. They help you avoid wasting plays and make the most of strong ones.

### Choose the machine

1. **Watch a few plays first.** If the claw lifts prizes and drops them near the top every time, carry strength is low. If you see the claw hold a prize all the way at least once, the machine is paying.
2. **Look at the cabinet's fill.** A tightly packed pile is harder, because prizes wedge against each other. A loosely stocked cabinet with gaps is better.
3. **Check the claw.** Prongs that hang limp or splay wide at rest often mean a weak setting or worn hardware.

### Choose the prize

- Prizes near the chute need a shorter carry, so a weakening grip has less time to fail.
- Upright, loose prizes lying on top are better than ones buried or on their side.
- Prizes with a gap, tag, loop or limb the prongs can go through or under can be carried even with modest grip.
- Light, round, soft prizes are easier than heavy, flat or boxed ones.

### Aim

- Move the claw in one axis, then check from the side of the cabinet to judge depth. Many misses are depth errors.
- Aim for the prize's centre of mass, not its geometric centre. A plush toy with a heavy head balances closer to the head.
- Use the full play time. There is no bonus for dropping fast.

### Know when to stop

Set a number of plays before you start. If you reach it, walk away. The feeling that the next play is "due" is exactly what the machine is built to encourage.`,
    },
    {
      id: "counts",
      title: "Payout counts, streaks and the gambler's fallacy",
      body: `Claw machines are one of the few places where "it's due" can be partly true, and that makes them tricky.

### Fixed-count machines

If a machine delivers a strong grab once every N plays, measured by an internal counter, then a long run of weak plays does mean the strong one is closer. Watching the machine and playing right after a long drought would, in principle, help.

### Randomised machines

Many machines instead decide each play at random with the target probability. On those, past plays tell you nothing. A 1-in-20 chance is 1-in-20 whether the last win was one play ago or fifty.

### Why you cannot exploit it reliably

You do not know which kind of machine you are standing at, what N is, or whether someone else won on it an hour ago. Playing after a drought feels clever and usually is not. This is the same trap described in the [gambler's fallacy](/guides/gamblers-fallacy) guide: treating an independent event as if it remembers the past.

Claw machines also use the reinforcement pattern described in the [Skinner box](/guides/skinner-box-slot-machines) guide. An unpredictable reward, occasional near-misses where the prize nearly reaches the chute, and bright lights and sounds all keep people playing longer than they planned.`,
    },
    {
      id: "odds",
      title: "Claw machine odds and what a play is worth",
      body: `Here is a worked example with illustrative numbers. Suppose:

- a play costs $1;
- the operator sets one strong grab per 15 plays;
- on a strong grab, a reasonably careful player lands the prize 2 times in 3;
- the prize is worth about $8 to you in shop terms.

Your chance of winning on any given play is about 1/33 × 2/3 ≈ 4.4%, or roughly 1 in 22. Your expected value per play is:

EV ≈ 0.044 × $8 − $1 ≈ −$0.65

| Plays | Expected prizes | Expected spend | Expected value of prizes |
| --- | --- | --- | --- |
| 10 | 0.44 | $10 | $3.56 |
| 22 | 1.0 | $22 | $8.00 |
| 50 | 2.2 | $50 | $17.80 |

In this example, a prize worth $8 costs about $22 in expected plays. Real numbers vary widely by machine, prize and location, but the direction never changes: the operator sets the machine to take in more than the prizes cost.

A useful check on any machine: price the prize at a shop, estimate how many plays a win takes, and decide whether the fun of playing covers the difference. For the general method, see [expected value](/guides/expected-value-gambling). Slot machines work on a similar controlled-return principle, covered in [slot machine odds](/guides/slot-machine-odds).`,
    },
    {
      id: "types",
      title: "Different crane styles and prize setups",
      body: `### Classic plush cranes

The standard pile of stuffed toys with a three-prong claw. Grip strength and payout settings matter most here.

### Japanese-style prize games

UFO catcher-style machines in Japan and elsewhere often use two-prong claws and boxed prizes placed on bars or ledges. Players rarely lift the prize cleanly. Instead they push, tilt or walk a box across two bars ("bridge" setups) over several plays until it falls. Skill in these games is real, but it is the skill of pushing a box a few centimetres each attempt, and the number of plays is the price.

### Key-master and pusher variants

Related machines ask you to push a key into a slot or a coin off a ledge. They are usually precision games with very small tolerances, and many have similar adjustable settings.

### Mini cranes and candy cranes

Cheaper per play with cheaper prizes. The same logic applies at a smaller scale.

For comparison with booths you pay a person to play, see [carnival games](/guides/carnival-games); for printed-odds games where the payout is fixed on paper, see [pull tabs](/guides/pull-tabs).`,
    },
    {
      id: "pvp",
      title: "Hidden settings versus published odds on PVPspinArena",
      body: `The frustrating thing about a claw machine is that its odds are set by a board you cannot see. PVPspinArena takes the opposite approach. It runs three player-vs-player games with published odds and results you can check.

On [Roulette](/roulette), the 33-slot wheel pays 2x on 16 Purple and 16 Silver slots and 14x on 1 Green slot, so Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. [Coinflip](/coinflip) is a 50/50 between two players, with any fee shown before entry. Results come from committed seeds using commit-reveal, and any settled round can be verified on the [fairness](/fairness) page.

A stated edge is still an edge; nobody should play expecting to profit. Gambling is 18+ (or your local legal age). If you notice yourself chasing the next play, on a claw or anywhere else, use the tools on the [responsible gambling](/responsible-gambling) page.

In the same cluster, see also [three card monte](/guides/three-card-monte) and [plinko board](/guides/plinko-board).`,
    },
  ],
  faqs: [
    {
      q: "Are claw machines rigged?",
      a: "Many are set to control how often you win. Operators can adjust claw strength and a payout rate, so the claw grips firmly only on some plays. They are usually winnable, but not as often as they look.",
    },
    {
      q: "Is there a trick to winning claw machines?",
      a: "Pick loose, upright prizes near the chute, check depth from the side, aim for the centre of mass, and watch whether the claw ever holds a prize all the way up. None of this overrides a payout setting.",
    },
    {
      q: "Why does the claw drop the prize at the top?",
      a: "Many machines have a separate carry strength that is lower than the pick-up strength, so the grip loosens as the claw rises. It is a machine setting, not your aim.",
    },
    {
      q: "Do claw machines pay out after a certain number of plays?",
      a: "Some use a counter and give a strong grab once every set number of plays. Others randomise each play. You cannot tell which from outside, so playing after a long drought is not a reliable strategy.",
    },
    {
      q: "Are claw machines gambling?",
      a: "It depends on the jurisdiction and how the machine is set. Some places treat them as skill amusements with prize limits; others regulate them as a category of gaming machine.",
    },
  ],
  sources: [
    { label: "Wikipedia: Claw crane", url: "https://en.wikipedia.org/wiki/Claw_crane" },
    { label: "UK Gambling Commission", url: "https://www.gamblingcommission.gov.uk/" },
    {
      label: "Wikipedia: Gambler's fallacy",
      url: "https://en.wikipedia.org/wiki/Gambler%27s_fallacy",
    },
  ],
  related: [
    "carnival-games",
    "three-card-monte",
    "skinner-box-slot-machines",
    "slot-machine-odds",
    "pull-tabs",
    "plinko-board",
  ],
  updated: "2026-09-27",
};
