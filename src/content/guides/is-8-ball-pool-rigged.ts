import type { Guide } from "./types";

export const guide: Guide = {
  slug: "is-8-ball-pool-rigged",
  cluster: "Skill wagers",
  keyword: "is 8 ball pool rigged",
  secondary: [
    "8 ball pool cheats",
    "8 ball pool cheat",
    "8 ball pool hack",
    "long line",
    "cue hack",
  ],
  title: "Is 8 Ball Pool Rigged? What a Replay Can Verify",
  description:
    "Check an 8-ball dispute using the rack commitment, revealed seed, shot replay and house rules. Learn what those checks establish and where their limits lie.",
  h1: "Is 8 ball pool rigged? Check the rack, replay and rule decision",
  answer:
    "Is 8 ball pool rigged? A loss alone cannot establish manipulation. On PVPspinArena, compare the rack’s published hash with its revealed seed, then replay the recorded shots using the stored physics version. Those checks test the recorded match; they do not prove the integrity of a different app or settle every possible client or account dispute.",
  facts: [
    "The rack seed shuffles coloured balls; the 8 stays in the centre.",
    "The shot simulation is deterministic rather than adding a random miss.",
    "A rack commitment and a shot replay check different parts of the match.",
    "A posted fee reduces the payout without changing the shot outcome.",
  ],
  sections: [
    {
      id: "searches-beside-the-question",
      title: "Check the commitment before judging the shot",
      body: `A SHA-256 hash commits to the seed before the rack opens. After the seed is revealed, compare its hash with the original commitment and regenerate the rack. A mismatch needs investigation; a matching rack establishes that the revealed seed matches the earlier commitment.

The [fairness tools](/fairness) and [pool rules](/guides/8-ball-pool-rules) address different questions. Related explanations are in the [skill wagers guides](/guides/topics/skill-wagers).

Compare [rack commitments](/guides/crypto-8-ball-pool) with [scratch and foul decisions](/guides/pool-scratch-rules) when identifying the disputed event.`,
    },
    {
      id: "where",
      title: "Compare inputs and replay",
      body: `A shot depends on aim, speed and the table state. Review the recorded shot parameters under the physics version stored with the rack. A client aim line is a prediction and can differ from the settled simulation; a drawing does not override the recorded result.

Keep the match identifier and the specific shot when reporting a discrepancy. Describe whether the issue concerns the input, displayed animation, simulated ball positions or final rule decision. A seed check alone cannot establish that a browser displayed every frame correctly. Modified clients and aim-tool downloads introduce account and software risks rather than evidence about the match.`,
    },
    {
      id: "client-picture-server-replay",
      title: "Check the rule that ended the rack",
      body: `An early 8, a wrong-pocket 8 and a scratch while pocketing the 8 can lose the rack. The table stays open until a legal pocket assigns a group. A foul gives ball in hand. Three shot-clock timeouts while away forfeit the match, and ending a live match also forfeits the seat.

These house rules differ from WPA call-shot 8-ball, including the handling of an 8 on the break. A published difference is not evidence of a hidden random miss. Check [the rules comparison](/guides/8-ball-pool-rules) before applying a league rule to a cash match.`,
    },
    {
      id: "checklist",
      title: "Separate payout and fairness",
      body: `The 5% pot fee is visible arithmetic: two $1 stakes form a $2 pot and a $1.90 winner credit. That fee does not establish a rigged shot. No measured break-win rate is available to support a claim that breaks are tuned to a particular percentage.

These implementation checks concern this service. A different app needs evidence from its own rules, records and support process. Cash play is restricted to eligible adults; see [responsible gambling](/responsible-gambling) for limits.`,
    },
  ],
  faqs: [
    {
      q: "Does a loss prove the table is rigged?",
      a: "No. Review the relevant input, replay and rule decision. A loss streak alone cannot identify a software defect or manipulation.",
    },
    {
      q: "Can an aim line change the settled result?",
      a: "An aim line is a client prediction. The recorded shot and simulation determine settlement.",
    },
    {
      q: "What does the rack hash prove?",
      a: "A matching revealed seed demonstrates consistency with the earlier commitment. It does not by itself verify every shot, display event or account action.",
    },
    {
      q: "What should I keep for a dispute?",
      a: "Keep the match identifier, disputed shot and what you expected to differ. Compare the replay with the published house rule.",
    },
    {
      q: "Does a different pool app use the same fairness method?",
      a: "That needs the other developer’s own documentation. PVPspinArena’s rack and replay checks cannot certify another app.",
    },
  ],
  sources: [
    {
      label: "WPA Rules of Play, effective 21 October 2026 (PDF)",
      url: "https://wpapool.com/wp-content/uploads/2026/10/WPA-Rules-2026-10-21-211.pdf",
    },
    {
      label: "WPA rules index",
      url: "https://wpapool.com/rules/",
    },
  ],
  related: [
    "8-ball-pool-for-money",
    "games-that-pay-real-money",
    "pool-scratch-rules",
    "8-ball-pool-hub",
  ],
  updated: "2026-11-26",
};
