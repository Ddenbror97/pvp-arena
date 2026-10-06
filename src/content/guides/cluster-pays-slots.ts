import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cluster-pays-slots",
  cluster: "Slots",
  keyword: "cluster pays slots",
  secondary: ["cluster pays", "cascading slots", "tumble slot wins", "cluster slot grid"],
  title: "Cluster Pays Slots: Groups, Cascades and RTP",
  description:
    "Cluster pays slots win on groups of touching symbols, not fixed paylines. See cascades, grid size, and why RTP is still the long-run cost.",
  h1: "How cluster pays slots count groups, cascades, and the same RTP",
  answer:
    "Cluster pays slots win when enough matching symbols touch, instead of when symbols land on a fixed payline. A cascade removes those symbols and drops new ones into the same paid spin. A larger grid changes how wins are shaped. It does not change the sign of a return under 100%. Adults 18+ only.",
  facts: [
    "A cluster win is a connected group of matching symbols, not a painted line.",
    "Ways pay on adjacent reels from one side. Clusters pay on a touching group.",
    "The rules file states the minimum group size and whether diagonals count.",
    "A tumble or cascade is another evaluation inside the spin you already paid for.",
    "Grid size changes how often groups form and how they chain. It is not a second edge.",
    "Return to player still applies to the total stake, including every cascade in that spin.",
  ],
  sections: [
    {
      id: "groups",
      title: "Wins are groups, not painted paths",
      body: `Cluster pays slots drop the old picture of a line snaking across the reels. The engine looks for a group of the same symbol sitting against itself. If the group is large enough, it pays. If it is not, that symbol pays nothing, even when the grid looks busy.

There is no line 1 through line 20 to switch on. The stake is the stake for the whole grid. You are not buying extra paths one at a time, and you are not aiming a path. The help file is the list of what counts as a group. The glass animation is only how that result is shown.

### What you are actually buying

A spin on this format is one ticket. The ticket may resolve as a single picture, or it may keep evaluating after symbols disappear. Either way, the price was the stake you committed before the first picture. Later pictures in the chain are not new tickets you got for free in the sense of a better price. They are how this ticket is allowed to continue.

The rest of the reel pages live on the [slots topic](/guides/topics/slots). Play is for adults, 18+. If a chain of drops makes it hard to stop, use the limits on the [responsible gambling](/responsible-gambling) page. A longer chain is not a reason to raise the stake. The animation is not a second price list.

This site does not offer these games. Nothing below is a cabinet to hunt, and nothing below is a method that beats the edge.`,
    },
    {
      id: "versus",
      title: "Lines, ways, and clusters count differently",
      body: `Three common counters get lumped together because they all live on a grid. They do not ask the same question.

A fixed payline asks whether the right symbols sit on one drawn path, usually starting at the left. A ways engine asks whether the same symbol shows on consecutive reels from one side, in any row on those reels. A cluster engine asks whether enough copies touch each other, often anywhere on the grid, not only from the left edge.

### Same stake, different scoreboard

| Counter | What it checks | What a busy grid can hide |
| --- | --- | --- |
| Payline | A path you turned on | Symbols off every active path |
| Ways | Matching symbols on adjacent reels | A match that does not start from the paying side |
| Cluster | A touching group at or above the minimum | The same symbol in two groups that do not touch |

[Slot paylines explained](/guides/slot-paylines-explained) is the longer page on lines and ways, including why more lines are more evaluations and not a better edge. A scatter is a different counter: it does not have to touch its neighbors. That count is on [scatter symbols](/guides/scatter-symbols). This page stays with the group counter. You still pay the stake on the button. A full-looking grid can still be a loss on every counter. Switching scoreboards does not soften that price, and it does not flip a negative return into a positive one.

Read the side the game pays from, if it has one. Some cluster games pay a group no matter where it sits. Some still want the group to involve a particular area. The help file wins that argument. A stream clip of a full screen does not.`,
    },
    {
      id: "touching",
      title: "Touching is a rule, not a vibe",
      body: `Touching has to be defined or the word is useless. Most cluster games count symbols that share a side: up, down, left, right. Corners that only meet at a point often do not count. Some games do count diagonals. You cannot tell which rule you have by squinting at a win. The rules screen says so in a sentence, and that sentence is the whole adjacency rule.

The minimum size is the same kind of fact. A game might require five touching copies, or four, or a larger number for the top symbol. Those are examples of how rules are written, not a number you can carry from one title to the next. If the file says five, four touching symbols are a loss even when they look like a start.

### One symbol, two groups

The same symbol can appear twice on a grid and still pay once, or not at all, if the copies do not connect. A block in the corner and a block on the far side are two groups. Each group is judged on its own size. Players add them by eye and then argue with the pay banner. The banner is applying the connection rule. Your eye is applying a looser one.

Wild symbols, when the game has them, join a group only under a stated rule. They do not invent a new minimum. None of these details is a lever for beating the price. They stop you from calling a loss a win the game stole.`,
    },
    {
      id: "cascades",
      title: "A cascade is not a second edge",
      body: `After a paying group, many of these games remove the paying symbols. New symbols fall or tumble into the gaps, and the grid is scored again. Names vary: cascade, tumble, avalanche, reaction. The mechanic is a chain of evaluations bought by the original stake.

That chain feels like extra spins. It is not an extra game with its own kinder price stacked on top of the first one. The studio prices the whole chain when it sets the return. A long tumble is one of the ways that return is delivered. A spin that pays once and stops is another. You do not get to a better long-run cost by hoping the drops continue.

### What the chain can and cannot do

- **It can add prizes inside one paid spin.** Each new grid is scored. Paying groups add to the same result.
- **It can end immediately.** No group, no drop. The stake is still spent.
- **It can look like momentum.** A second and third drop feel like the game is heating up. The chain was allowed by the rules of that spin. It does not heat the next stake.
- **It is already inside the published return.** Chasing tumbles does not collect a bonus the percentage forgot.

A multiplier that grows on later drops is priced the same way. It is inside the chain, not a signal to add stake.

Treat the whole sequence as one outcome that took longer to draw. Then keep the stop you set before you pressed the button.`,
    },
    {
      id: "grid",
      title: "A bigger grid changes the shape, not the sign",
      body: `Cluster games show up as 5 by 5, 6 by 6, 7 by 7, and other rectangles. A larger grid holds more symbols, so groups and near-groups are easier to see. That visibility is not a higher chance of beating the price. The weights and the paytable are built for that grid. A 7 by 7 game is a different shape of hit from a 5 by 5 game. Both still have whatever return the panel prints, and a return under 100% is still a cost.

Hit shape is the part players feel. A small grid with a high minimum group size can sit quiet and then pay in a clump. A large grid can dribble small groups and chain them. Those are volatility stories. [Slot volatility](/guides/slot-volatility) is where droughts and spikes are explained without pretending the spikes are a better edge.

### Do not rank grids by size

- **More cells are not more value.** You paid for the spin, not per cell, unless the stake panel says otherwise.
- **More drops are not a looser game.** A title that tumbles often can still return less over time than a title that tumbles rarely, if the printed return says so.
- **A full screen is a rare picture.** It is rare because the weights make it rare. Grid size does not put it on a schedule.
- **The sign of the edge stays put.** Changing from 5 by 5 to 7 by 7 does not turn a cost into a profit.

Pick a grid you can follow. If you cannot see which symbols touched, you cannot check the banner against the rule. Clarity is not a promise that the game will pay you back.`,
    },
    {
      id: "rtp",
      title: "RTP still prices the whole spin",
      body: `Return to player is the long-run share of stakes a build is designed to pay back, across a huge number of equal spins. On a cluster game that share includes ordinary groups, long cascades, multipliers, and any free-spin feature the rules describe. It is one number for the whole product, not a base number plus a gift for learning how groups work.

A 96% illustration and a 94% illustration are not titles to memorize. They show a gap: about four cents versus about six cents of expected cost per dollar spun. A longer session widens that expected gap. It does not promise your afternoon will match it. The center stays negative while the return stays under 100%.

### Send the percentage essay elsewhere

[Slot machine odds](/guides/slot-machine-odds) is the page for hit frequency, return, and why a short sample will not display the percentage. This guide will not repeat that essay. The only cluster-specific point is that cascades do not sit outside the percentage. If the info panel prints a return, that return already assumes the tumbles happen as often as the math says they happen.

If the panel prints nothing, you do not have a number to compare. A smooth cascade animation is not a substitute. Neither is a clip of someone hitting a full grid. Compare published figures when they exist. Equal printed returns can still feel different if their droughts differ. The tumbles are already assumed in that figure, not added on later. Do not invent a number from the last chain.`,
    },
    {
      id: "read",
      title: "How to read one spin without a system",
      body: `You can check a cluster result without turning the check into a strategy. Start with the stake on the button, not the coin art. Then open the rules far enough to answer four questions: minimum group size, whether diagonals count, what a wild does to a group, and whether wins tumble.

When the spin ends, including every drop, read the pay banner against those four answers. A group that looked connected on a diagonal pays only if diagonals count. A chain that stopped paid what it paid. The next stake is a new draw. The length of the chain you just watched is not a forecast.

### A reading list, not a pick list

- **Rules before stake.** If you will not open the file, you will misread losses as errors.
- **One return, if printed.** Use it as a long-run cost. Do not expect two hundred spins to match it.
- **Volatility as comfort, not as value.** A chain-heavy game can eat a session and then pay a picture. That shape is [how the draw works](/guides/how-do-slot-machines-work) plus a group counter, not a warmer machine.
- **A stop that survives a chain.** Decide it before the spin. A cascade in progress is the worst moment to renegotiate.

No cluster size, no grid, and no tumble count beats the edge. The format is a way of scoring symbols. The price is still the return on the stake. If the only reason to prefer one title is that it has been dropping, you are back to a hot-machine story, and this format does not make that story true.`,
    },
  ],
  faqs: [
    {
      q: "What are cluster pays slots?",
      a: "They pay when enough matching symbols touch on the grid, rather than when symbols land on a fixed payline. The rules set the minimum group size and whether diagonal touches count.",
    },
    {
      q: "How is a cluster different from ways to win?",
      a: "Ways usually pay when the same symbol appears on consecutive reels from one side, in any row. A cluster pays on a connected group, which can sit away from the edge if the rules allow it.",
    },
    {
      q: "Do cascades give you a better edge?",
      a: "No. Removing winning symbols and dropping new ones is another evaluation inside the spin you already bought. That chain is priced into the game's return. It is not a second, kinder game.",
    },
    {
      q: "Does a bigger grid mean better odds?",
      a: "A larger grid changes how groups form and how often tumbles are easy to see. It does not, by itself, raise the return or flip a return under 100% into an advantage.",
    },
    {
      q: "Can you time a cluster game that has been tumbling?",
      a: "No. A long chain is a property of the spin that just happened. The next stake is a new draw from the same design. Recent drops do not make the following spin due.",
    },
  ],
  sources: [
    { label: "Wikipedia: Slot machine", url: "https://en.wikipedia.org/wiki/Slot_machine" },
    { label: "Wikipedia: Return to player", url: "https://en.wikipedia.org/wiki/Return_to_player" },
    {
      label: "Encyclopaedia Britannica: slot machine",
      url: "https://www.britannica.com/topic/slot-machine",
    },
  ],
  related: ["slot-paylines-explained", "scatter-symbols", "slot-volatility", "slot-machine-odds"],
  updated: "2026-09-29",
};
