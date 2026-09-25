export type GuideCluster =
  | "Foundations"
  | "Provably fair"
  | "CS:GO heritage"
  | "Games & odds"
  | "Crypto payments"
  | "Responsible play";

export type GuideSection = {
  id: string;
  title: string;
  /**
   * Markdown-lite: blank line separates blocks. Blocks starting "### " are H3,
   * blocks whose lines start "- " are bullet lists, "1. " numbered lists.
   * Inline [text](/path) becomes a link; **bold** is supported.
   */
  body: string;
};

export type Guide = {
  slug: string;
  cluster: GuideCluster;
  pillar?: boolean;
  keyword: string;
  secondary: string[];
  title: string; // meta title, 40–59 chars
  description: string; // meta description, 120–159 chars
  h1: string;
  answer: string; // direct answer shown under the H1
  facts: string[];
  sections: GuideSection[];
  faqs: { q: string; a: string }[];
  sources: { label: string; url: string }[];
  related: string[]; // other guide slugs
  updated: string; // ISO date
  howTo?: boolean;
  /** Optional conversion CTA; falls back to the default "watch a live round" box. */
  cta?: { title: string; text: string; primary: { to: string; label: string }; secondary: { to: string; label: string } };
};
