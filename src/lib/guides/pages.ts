import type { Guide, GuideCluster } from "@/content/guides/types";

/** Guide slugs and topic slugs a page may link to; anything else renders as text. */
export type LinkTargets = { guides: string[]; topics: string[] };

export type GuideLink = { slug: string; h1: string };
export type GuideCard = GuideLink & { cluster: GuideCluster; description: string };

export type GuidePageData = {
  guide: Guide;
  minutes: number;
  topic: { slug: string } | null;
  pillar: GuideLink | null;
  related: GuideCard[];
  family: GuideLink[];
  familyName: string | null;
  snapshotLinks: { howTo: GuideLink | null; fair: GuideLink | null };
  links: LinkTargets;
};

export type HubGuide = GuideLink & { keyword: string; title: string; cluster: GuideCluster };

export type GuidesHubData = {
  guides: HubGuide[];
  clusters: {
    name: GuideCluster;
    slug: string;
    blurb: string;
    topic: boolean;
    pillar: { slug: string; description: string } | null;
    groups: { name: string; slugs: string[] }[];
  }[];
};

export type TopicCard = GuideLink & { description: string };

export type TopicPageData = {
  topic: { name: GuideCluster; slug: string; title: string; description: string; intro: string };
  count: number;
  pillar: (GuideLink & { answer: string }) | null;
  groups: { name: string; cards: TopicCard[] }[];
  ungrouped: TopicCard[];
  others: { slug: string; name: GuideCluster }[];
  articles: GuideLink[];
};
