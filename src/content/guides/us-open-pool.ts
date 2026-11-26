import type { Guide } from "./types";

export const guide: Guide = {
  slug: "us-open-pool",
  cluster: "Casino knowledge",
  keyword: "us open pool",
  secondary: ["us open 9 ball", "us open billiards"],
  title: "US Open Pool: Nineball Event and Official Information",
  description:
    "The US Open Pool Championship is a major nineball event. Find organizer information, distinguish event-specific rules and read a prize fund correctly.",
  h1: "US Open pool: the nineball championship and its rules",
  answer:
    "US Open pool usually refers to the US Open Pool Championship, a major nineball event on the World Nineball Tour. The organizer's schedule lists the 2026 event for August 25–30 at Embassy Suites in Frisco, Texas, with a $500,000 prize fund. An event's total purse, its winner's award and the cost of entering are different figures.",
  facts: [
    "Use the event year when checking a venue, schedule or result.",
    "A total prize fund is not a payment to each entrant or the champion.",
    "Event regulations can supplement a general nineball rulebook.",
  ],
  sections: [
    {
      id: "section-1",
      title: "Find the right edition",
      body: `Start with the World Nineball Tour's official schedule and follow its event and results links. Some older organizer pages remain online with a prior year's venue and dates, so check the edition in the page itself before booking travel or sharing a result.`,
    },
    {
      id: "section-2",
      title: "Nineball rules and tournament conditions",
      body: `Nineball requires the cue ball to contact the lowest-numbered remaining ball first. Event-specific break rules, racking procedures, clocks and race lengths need the tournament regulations. The current WPA rules index provides the general rulebook; an older summary should not override the organizer's published conditions.

[9-ball rules](/guides/9-ball-rules) explains the game. [Pool tournaments](/guides/pool-tournaments) distinguishes a tournament bracket from a weekly league.`,
    },
    {
      id: "section-3",
      title: "Read results and prizes separately",
      body: `A result needs a named edition, finish and official record. A published purse establishes the amount advertised for the field, not an individual's net profit after entry, travel or shared action. For another event format, [the Mosconi Cup](/guides/mosconi-cup) is a team competition rather than an open individual championship.`,
    },
  ],
  faqs: [
    {
      q: "What game is played at the US Open Pool Championship?",
      a: "Nineball. Confirm the current event's tournament conditions for racking, breaks, clocks and race lengths.",
    },
    {
      q: "Where did the organizer list the 2026 edition?",
      a: "The World Nineball Tour schedule lists August 25–30, 2026 at Embassy Suites in Frisco, Texas.",
    },
    {
      q: "Is the $500,000 fund the winner's prize?",
      a: "No. A total prize fund is distributed across specified finishes; use the edition's prize schedule for each award.",
    },
    {
      q: "Where should I check a result or entry condition?",
      a: "Use the organizer's event-year page and linked results or player information. A general nineball guide cannot establish a specific tournament result.",
    },
  ],
  sources: [
    {
      label: "World Nineball Tour: official 2026 schedule",
      url: "https://www.matchroompool.com/schedule/",
    },
    {
      label: "WPA Rules of Play, effective 21 October 2026 (PDF)",
      url: "https://wpapool.com/wp-content/uploads/2026/10/WPA-Rules-2026-10-21-211.pdf",
    },
    {
      label: "WPA rules index",
      url: "https://wpapool.com/rules/",
    },
  ],
  related: ["8-ball-pool-hub", "pool-tournaments", "9-ball-rules"],
  updated: "2026-11-26",
};
