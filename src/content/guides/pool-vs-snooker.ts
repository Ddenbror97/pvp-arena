import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pool-vs-snooker",
  cluster: "Games of chance",
  keyword: "pool vs snooker",
  secondary: ["snooker vs pool", "difference between pool and snooker", "snooker betting"],
  title: "Pool vs Snooker: Balls, Scoring and Rule Differences",
  description:
    "Compare pool and snooker by balls, objectives and scoring. Learn why eight-ball, nineball and snooker use different foul and winning conditions.",
  h1: "Pool vs snooker: different games on pocketed tables",
  answer:
    "Pool vs snooker compares different cue-sport rule systems. Eight-ball uses fifteen object balls split into groups and the 8-ball; nineball uses balls 1–9 and a lowest-ball-first requirement. Snooker uses fifteen reds and six colours, scoring points through alternating reds and colours before the final colour sequence. Similar cues and pockets do not make the rules interchangeable.",
  facts: [
    "A snooker red scores one point; the colours score two through seven.",
    "Pool objectives depend on the named discipline.",
    "Ball-in-hand, fouls and the end of a rack or frame must be read from the relevant rulebook.",
  ],
  sections: [
    {
      id: "section-1",
      title: "Balls and the object of play",
      body: `Under WPA eight-ball, a player clears the assigned group before legally pocketing the 8. Under nineball, first contact must be the lowest ball remaining, with the game's own rules deciding a legal winning 9. Snooker awards points for reds and colours and also awards penalty points to the opponent for fouls.

The [8-ball rules](/guides/8-ball-pool-rules) and [9-ball rules](/guides/9-ball-rules) cover those pool disciplines separately.`,
    },
    {
      id: "section-2",
      title: "Snooker's scoring order",
      body: `WPBSA lists fifteen reds worth one each, then yellow 2, green 3, brown 4, blue 5, pink 6 and black 7. While reds remain, successful scoring alternates red and colour, with colours normally respotted. After the last red and its following colour, the colours are cleared in ascending order. A foul can change the score without a legal pot.`,
    },
    {
      id: "section-3",
      title: "Different practice tasks",
      body: `Pool often emphasizes patterns through a rack or a rotation sequence; snooker requires managing a scoring break, positional play and safety exchanges under its own rules. Neither a bar-room scratch rule nor a pool app's shortcut should be imported into snooker.

Use the WPA and WPBSA rulebooks for their respective games. [Pool scratch rules](/guides/pool-scratch-rules) explains why even pool disciplines differ in cue-ball placement after a foul.`,
    },
  ],
  faqs: [
    {
      q: "How many object balls are used in snooker?",
      a: "Twenty-one: fifteen reds and six colours, in addition to the white cue ball.",
    },
    {
      q: "Does every pool game use fifteen object balls?",
      a: "No. Eight-ball does, while nineball uses balls 1–9 and ten-ball uses 1–10.",
    },
    {
      q: "How much are the snooker colours worth?",
      a: "Yellow 2, green 3, brown 4, blue 5, pink 6 and black 7; each red is one.",
    },
    {
      q: "Can pool foul rules be used for snooker?",
      a: "No. Use the specific discipline's rulebook for fouls, ball placement and the end of play.",
    },
  ],
  sources: [
    {
      label: "WPBSA: official snooker rulebook and updates",
      url: "https://www.wpbsa.com/rules/",
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
  related: ["8-ball-pool-hub", "8-ball-pool-rules", "9-ball-rules"],
  updated: "2026-11-26",
};
