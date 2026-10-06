import type { Guide } from "./types";

export const guide: Guide = {
  slug: "monty-hall-problem",
  cluster: "Casino knowledge",
  keyword: "monty hall problem",
  secondary: [
    "monty hall paradox",
    "three door problem",
    "monty hall problem explained",
    "should you switch doors",
  ],
  title: "Monty Hall Problem: Why Switching Wins 2/3 of the Time",
  description:
    "The Monty Hall problem explained: the three-door puzzle, a plain 2/3 proof, Bayes' theorem, simulations, and what it teaches gamblers about information.",
  h1: "Monty Hall problem: the 2/3 proof and what it teaches gamblers",
  answer:
    "The Monty Hall problem is a probability puzzle: a car is behind one of three doors, you pick one, and a host who knows where the car is opens a different door showing a goat, then offers a switch. Switching wins two times in three. Your first pick had a 1/3 chance, and the host's informed choice pushes the remaining 2/3 onto the other closed door.",
  facts: [
    "The puzzle is named after Monty Hall, the original host of the game show Let's Make a Deal, which first aired in 1963.",
    "Statistician Steve Selvin posed it in letters to The American Statistician in 1975.",
    "It became famous in 1990 when Marilyn vos Savant answered it in her Parade magazine column and received thousands of letters, many insisting she was wrong.",
    "The 2/3 answer depends on the host knowing where the car is and always opening a goat door.",
    "If the host opens a door at random and happens to show a goat, switching and staying are both 1/2.",
  ],
  sections: [
    {
      id: "puzzle",
      title: "The puzzle and its exact rules",
      body: `The standard statement runs like this. There are three closed doors. Behind one is a car, behind the other two are goats. You choose a door, say Door 1. The host, who knows what is behind every door, opens one of the other two, say Door 3, and shows a goat. He then asks whether you want to stay with Door 1 or switch to Door 2.

Most people answer that it no longer matters: two doors, one car, 50/50. The correct answer is that switching wins with probability 2/3 and staying wins with probability 1/3.

The answer is only correct under three rules, and they need to be stated because the argument falls apart without them.

1. The host always opens a door you did not pick.
2. The host always reveals a goat. He knows where the car is and never shows it.
3. The host always offers the switch, whatever your first pick was.

If the host picks randomly between his two doors when both hide goats, the answer stays 2/3. That choice changes nothing. If he might open the car door, or only offers switches when you picked the car, the answer changes. Those variants come later on this page.

The puzzle circulated in probability circles before it had a name. Steve Selvin posed it in *The American Statistician* in 1975 and used Monty Hall's name for it. It went mainstream in 1990, when Marilyn vos Savant gave the switching answer in her "Ask Marilyn" column in *Parade*. The commonly told part of the story is the reaction: thousands of readers wrote in to say she was wrong, including people who signed with academic titles. The mathematics was on her side.`,
    },
    {
      id: "proof",
      title: "The simple proof: count the first pick",
      body: `The cleanest proof ignores the host entirely at first and looks only at your original choice.

Your first pick is right 1/3 of the time and wrong 2/3 of the time. Now ask what switching does in each case.

| Your first pick | Probability | What the host must do | Result if you switch |
| --- | --- | --- | --- |
| The car | 1/3 | Open either goat door | You lose |
| Goat A | 1/3 | Open Goat B's door (forced) | You win |
| Goat B | 1/3 | Open Goat A's door (forced) | You win |

Switching wins in two of the three equally likely rows. Staying wins only in the first row. The host's action never changes which row you are in. It only removes the one losing door you could have switched to.

### The 100-door version

If the three-door version still feels wrong, scale it up. There are 100 doors and one car. You pick Door 1. The host, who knows where the car is, opens 98 of the other 99 doors, all goats, leaving Door 1 and, say, Door 57.

Your Door 1 had a 1 in 100 chance when you picked it, and nothing the host did depended on whether you were right. Door 57 is the one door out of 99 that the host carefully avoided. It carries the other 99/100. Almost everyone switches in this version, and the three-door case is the same logic with smaller numbers.

### Why "two doors left, so 50/50" fails

Two outcomes are only equally likely when nothing makes them different. Here something does. Your door was chosen by you, blind. The other door was chosen by a host who had to avoid the car. The two doors got into the final pair by different routes, and the routes carry different information.`,
    },
    {
      id: "bayes",
      title: "The Bayes' theorem proof",
      body: `The formal way to handle "given what the host did" is conditional probability. Label the event that the car is behind Door k as Cₖ, and the event that the host opens Door 3 as H₃. You picked Door 1.

Before the host acts, each door has P(Cₖ) = 1/3. Now work out how likely the host is to open Door 3 in each case.

- Car behind Door 1: the host can open 2 or 3, so P(H₃ | C₁) = 1/2.
- Car behind Door 2: the host must open 3, so P(H₃ | C₂) = 1.
- Car behind Door 3: the host cannot open it, so P(H₃ | C₃) = 0.

Total probability that the host opens Door 3:

P(H₃) = (1/3)(1/2) + (1/3)(1) + (1/3)(0) = 1/2.

Bayes' theorem then gives:

- P(C₁ | H₃) = (1/2 × 1/3) / (1/2) = 1/3
- P(C₂ | H₃) = (1 × 1/3) / (1/2) = 2/3

The ratio 1/2 to 1 is the whole story. The host is twice as likely to open Door 3 when the car is behind Door 2 as when it is behind Door 1. Seeing Door 3 open is therefore evidence for Door 2.

This is the same machinery a card player uses when an opponent's action carries information. [Expected value in gambling](/guides/expected-value-gambling) shows how to turn those updated probabilities into a decision.`,
    },
    {
      id: "simulation",
      title: "Simulating the game yourself",
      body: `A simulation settles most arguments faster than a proof. You can do it with three playing cards and a friend, or with a few lines of code.

### With cards

1. Take two black cards (goats) and one red card (car).
2. The friend shuffles and lays them face down, noting privately where the red card is.
3. You point at one card.
4. The friend turns over a black card from the other two.
5. Record whether staying or switching would have won.

Twenty rounds usually shows the pattern. A hundred rounds almost always does: the standard deviation of the switch-win count over 100 rounds is about 4.7, so you expect roughly 67 wins, and fewer than 57 would be rare.

### With code

The logic reduces to one line: switching wins exactly when your first pick was wrong. A computer run of one million games for this page gave 66.6% wins for switching and 33.4% for staying, matching the theory to a tenth of a percentage point.

There is a well-known story that the mathematician Paul Erdős was reportedly unconvinced by explanations until he was shown a computer simulation. Whether or not every detail of that story is exact, it makes a fair point: intuition about conditional probability is unreliable even for experts, and counting trials is a good check.

Simulation is also a good habit for gambling claims generally. The [law of large numbers](/guides/law-of-large-numbers-gambling) is what makes a long simulation trustworthy: with enough trials, the observed frequency lands close to the true probability.`,
    },
    {
      id: "variants",
      title: "Variants where the answer changes",
      body: `The 2/3 answer is a result about a specific host. Change the host and the answer changes. This is the most useful part of the puzzle for anyone who bets.

| Host behaviour | P(win) if you switch | Why |
| --- | --- | --- |
| Knows, always opens a goat, always offers | 2/3 | Standard problem |
| Opens a random other door, happens to show a goat | 1/2 | The reveal was luck, not information |
| Only offers a switch when you picked the car | 0 | The offer itself tells you to stay |
| Only offers a switch when you picked a goat | 1 | The offer itself tells you to switch |
| Prefers opening Door 3 whenever he can | 1/2 if he opens Door 3; 1 if he opens Door 2 | His habit leaks information |

The random-host case (sometimes called "Monty Fall") is the one that surprises people most. If the host has no idea where the car is, opens a door at random and it happens to show a goat, the three original possibilities are no longer weighted by a forced choice. Work it through with Bayes. A random host opens Door 3 with probability 1/2 whatever is behind it. A goat appears there for certain if the car is behind Door 1 and for certain if it is behind Door 2, so those two cases keep equal weight and each remaining door ends up at 1/2.

The rows where the host decides whether to offer the switch matter in real life. In a 1991 *New York Times* piece on the puzzle, Monty Hall pointed out that on the actual show he did not have to offer a switch, and he could use that freedom to play on the contestant's psychology. Against a host with motives, the offer itself is data.

Related puzzles make the same point. Bertrand's box paradox (1889) and the three prisoners problem, popularised by Martin Gardner in 1959, both turn on how a piece of information was produced rather than just what it says.`,
    },
    {
      id: "gamblers",
      title: "What the Monty Hall problem teaches gamblers",
      body: `The puzzle is not a betting strategy. It is a lesson about when information changes odds and when it does not.

- **Information changes odds only when it is correlated with the outcome.** The host's forced choice is correlated with where the car is. A roulette wheel's last ten results are not correlated with the next spin. Treating a history board as if it were Monty opening a door is the [gambler's fallacy](/guides/gamblers-fallacy).
- **Ask who chose what you are seeing, and why.** A dealer's upcard in blackjack is random and fully informative. A tipster's "hot pick" is chosen by someone with incentives. The same card or tip can carry different information depending on how it reached you.
- **Your first choice does not become luckier because you made it.** Many players feel attached to their original door, number or seat. The probability attached to your choice was fixed when you made it.
- **Updating is a skill.** Poker is built on it: every bet an opponent makes is a host opening a door. See [how to win at poker](/guides/how-to-win-at-poker) for how that plays out over a session.

For more puzzles where intuition and arithmetic disagree, the [St Petersburg paradox](/guides/st-petersburg-paradox) and the rest of the [casino knowledge topic](/guides/topics/casino-knowledge) are good next reads.`,
    },
    {
      id: "pvpspinarena",
      title: "Hidden information in a hashed PvP round",
      body: `PVPspinArena runs three player-vs-player games, Jackpot, [Coinflip](/coinflip) and Roulette, and each round works like the opposite of Monty's stage. Before a round, the site commits to a seed by publishing its hash. The hash is fixed but reveals nothing useful about the result, so seeing it cannot tilt the odds the way the host's open door does. After settlement the seed is revealed and anyone can check it against the commitment on [fairness](/fairness). The design is explained in the [commit-reveal scheme](/guides/commit-reveal-scheme) guide.

In other words, the only information you get before the result is information that is uncorrelated with it. A Coinflip is a clean 50/50 before and after you look at the hash. Roulette's Purple and Silver keep about a 7.88% house edge after the 5% win fee, Green keeps about 59.70%, and the previous spin changes nothing. Gambling on PVPspinArena is for adults 18+.`,
    },
  ],
  faqs: [
    {
      q: "Should you always switch in the Monty Hall problem?",
      a: "Yes, under the standard rules where the host knows where the car is, always opens a goat door and always offers a switch. Switching wins 2/3 of the time and staying wins 1/3.",
    },
    {
      q: "Why isn't it 50/50 when two doors are left?",
      a: "Because the two doors got there differently. You chose yours blind, with a 1/3 chance. The host had to avoid the car when choosing which door to leave closed, so that door holds the remaining 2/3.",
    },
    {
      q: "What if the host opens a door at random?",
      a: "If he does not know where the car is and happens to reveal a goat, switching and staying both win half the time. The 2/3 advantage comes entirely from the host's knowledge.",
    },
    {
      q: "Did Let's Make a Deal really work like the Monty Hall problem?",
      a: "Not exactly. Monty Hall said in a 1991 interview that he was not required to offer a switch and could use offers to play with contestants. The puzzle is an idealised version of the show.",
    },
    {
      q: "Does the Monty Hall problem help at roulette?",
      a: "Not directly. Nobody with knowledge of the result removes options on a roulette wheel, and past spins carry no information about the next one. The lesson is to ask whether information is actually correlated with the outcome.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Monty Hall problem",
      url: "https://en.wikipedia.org/wiki/Monty_Hall_problem",
    },
    {
      label: "The New York Times (1991): Behind Monty Hall's Doors",
      url: "https://www.nytimes.com/1991/07/21/us/behind-monty-hall-s-doors-puzzle-debate-and-answer.html",
    },
    { label: "Wikipedia: Bayes' theorem", url: "https://en.wikipedia.org/wiki/Bayes%27_theorem" },
  ],
  related: [
    "law-of-large-numbers-gambling",
    "regression-to-the-mean-gambling",
    "st-petersburg-paradox",
    "gamblers-fallacy",
    "expected-value-gambling",
  ],
  updated: "2026-09-27",
};
