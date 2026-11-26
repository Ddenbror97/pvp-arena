import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pool-table-size",
  cluster: "Skill wagers",
  keyword: "pool table size",
  secondary: ["9 foot pool table", "7 foot pool table", "pool room size"],
  title: "Pool Table Size: Playing Surface and Cue Room",
  description:
    "Measure a pool table’s playing surface separately from its cabinet. Calculate cue room from the actual cue length and compare physical and browser tables.",
  h1: "Pool table size: measure the playing area and space for a stroke",
  answer:
    "Pool table size can describe the playing surface or the outside cabinet, and those measurements are different. Measure between the cushion noses for the playing area and check the manufacturer’s full footprint for the room. Cue clearance needs space beyond the table on both ends and sides. PVPspinArena’s simulated playing surface is 2.54 m by 1.27 m.",
  facts: [
    "Playing-surface dimensions exclude rails and the surrounding cabinet.",
    "A full stroke needs clearance beyond the cue ball, not just room to stand.",
    "Room planning depends on the cue length and nearby obstacles.",
    "A physical table’s rental or purchase price requires its own quote.",
  ],
  sections: [
    {
      id: "names",
      title: "Measure the table rather than its label",
      body: `Foot labels are a useful starting point, but the exact playing surface, rails and cabinet dimensions need the model specification. Measure the room too: a column, wall recess or stair opening can obstruct a stroke even when the overall room dimensions look adequate.

The WPA equipment specifications provide tournament-reference dimensions. They are different evidence from a seller’s nominal size label or a room-rental advert.`,
    },
    {
      id: "ours",
      title: "Calculate cue clearance",
      body: `As a first planning estimate, add twice the cue length to each playing-surface dimension. A 100 by 50 inch playing surface and a 58 inch cue give 216 by 166 inches, or 18 feet by 13 feet 10 inches. This is geometry for planning, not a mandatory room standard.

Allow extra room for comfortable movement and inspect the difficult shots close to a wall. A shorter cue can help at a particular obstruction, but changes feel. Confirm the layout with the actual table and cue before ordering or renting.`,
    },
    {
      id: "checklist",
      title: "Physical equipment and a browser table",
      body: `The browser table models a 2.54 m by 1.27 m surface; a monitor’s dimensions do not change that simulated geometry. Input and display scale affect how you aim, rather than turning a laptop into a shorter physical table.

See [cue fit](/guides/best-pool-cue), [aiming geometry](/guides/8-ball-pool-aim) and [pool shots](/guides/pool-shots) in the [skill wagers topic](/guides/topics/skill-wagers). For cash play, check [responsible gambling](/responsible-gambling) eligibility and limits separately from equipment dimensions.`,
    },
  ],
  faqs: [
    {
      q: "Do I measure the cabinet or the playing surface?",
      a: "Measure both for different purposes. Cushion-nose dimensions describe play; the cabinet footprint matters for fitting the furniture.",
    },
    {
      q: "How much cue room do I need?",
      a: "Start with playing-surface length and width plus twice your cue length, then allow for comfort and obstacles. Check the actual layout.",
    },
    {
      q: "Is that formula a tournament room rule?",
      a: "No. It is a planning estimate. The venue and event may have additional requirements.",
    },
    {
      q: "Does screen size change the browser table size?",
      a: "No. The displayed scale changes, but the simulated playing surface remains 2.54 m by 1.27 m.",
    },
    {
      q: "Does table size establish a rental price?",
      a: "No. Price depends on the venue or seller, duration, equipment and service terms.",
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
  related: ["8-ball-pool-hub", "best-pool-cue", "8-ball-pool-rules"],
  updated: "2026-11-26",
};
