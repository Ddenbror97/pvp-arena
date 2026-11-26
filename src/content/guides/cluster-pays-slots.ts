import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cluster-pays-slots",
  cluster: "Slots",
  keyword: "cluster pays slots",
  secondary: ["cluster pays", "cascading slots", "tumble slot wins", "cluster slot grid"],
  title: "Cluster Pays Slots: Connections and Cascades",
  description:
    "Learn how connected symbol groups win in cluster-pays slots, why adjacency rules vary, and how cascades differ from anywhere-pay games such as Sweet Bonanza.",
  h1: "Cluster Pays Slots: Connections and Cascades",
  related: ["slot-paylines-explained", "scatter-symbols", "slot-volatility", "slot-machine-odds"],
  updated: "2026-11-26",
  answer:
    "Cluster pays slots award connected groups of matching symbols rather than fixed payline patterns. The minimum group and connection rules belong to each game. Cascades can remove winning groups and refill the grid. Anywhere pays, where matching symbols need not touch, is a different format.",
  facts: [
    "Sugar Rush 1000 requires at least five adjacent matching symbols.",
    "Sweet Bonanza counts at least eight matching symbols anywhere.",
  ],
  sections: [
    {
      id: "section-1",
      title: "The connection determines the group",
      body: "Check whether horizontal, vertical or diagonal contact counts. Do not assume a diagonal joins a cluster. Two separated groups of the same fruit should not automatically be summed. [Moon Princess](/guides/moon-princess-slot) has a different minimum from Sugar Rush.",
    },
    {
      id: "section-2",
      title: "A simple grid example",
      body: "Three matches in a row, with two more immediately beneath the middle and right cells, make a connected five-symbol group under horizontal/vertical rules. Five symbols separated by gaps would not form that same cluster.",
    },
    {
      id: "section-3",
      title: "Cascades and multiplier rules",
      body: "Replacements can produce another evaluation inside the purchased round. [Fruit Party](/guides/fruit-party-slot) adds multipliers to winning groups; [Sweet Bonanza](/guides/sweet-bonanza) instead uses anywhere matches and its own multiplier rules. The [Slots hub](/guides/topics/slots) compares implementations. Count paid stakes rather than cascade animations, and stop at a predetermined cash ceiling. [Responsible-play controls](/responsible-gambling) help when a developing grid encourages further spending.",
    },
  ],
  faqs: [
    {
      q: "Do clusters use fixed lines?",
      a: "They use connected groups instead.",
    },
    {
      q: "Do diagonals always count?",
      a: "No. Check the game’s rules.",
    },
    {
      q: "Is Sweet Bonanza a connected-cluster game?",
      a: "No. Matches count anywhere.",
    },
    {
      q: "Does a cascade improve the next purchased spin?",
      a: "It does not establish that advantage.",
    },
  ],
  sources: [
    {
      label: "Pragmatic Play: Sugar Rush adjacency",
      url: "https://www.pragmaticplay.com/en/games/sugar-rush-1000/",
    },
    {
      label: "Pragmatic Play: anywhere pays",
      url: "https://www.pragmaticplay.com/en/games/sweet-bonanza-slot/",
    },
    {
      label: "Play’n GO: Moon Princess connections",
      url: "https://www.playngo.com/games/moon-princess",
    },
  ],
};
