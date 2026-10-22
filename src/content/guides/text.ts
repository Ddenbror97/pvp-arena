import type { Guide } from "./types";

/** Plain-text word count of everything a reader sees in the article body. */
export function guideText(g: Guide): string {
  return [
    g.h1,
    g.answer,
    ...g.facts,
    ...g.sections.flatMap((s) => [s.title, s.body]),
    ...g.faqs.flatMap((f) => [f.q, f.a]),
  ]
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*]/g, " ");
}

export function wordCount(g: Guide): number {
  return guideText(g)
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9$]/.test(w)).length;
}
