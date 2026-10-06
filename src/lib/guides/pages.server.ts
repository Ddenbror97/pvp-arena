import {
  CLUSTERS,
  clusterInfo,
  familyOf,
  groupOf,
  getGuide,
  getTopic,
  GUIDES,
  groupsFor,
  guidesInCluster,
  isPublishedGuide,
  publishedTopics,
  wordCount,
  type Guide,
} from "@/content/guides";
import { GAME_GUIDE_LINKS, GUIDE_GAME_DATA } from "@/lib/game-snapshot/snapshot";
import type {
  GuideLink,
  GuidePageData,
  GuidesHubData,
  LinkTargets,
  TopicCard,
  TopicPageData,
} from "./pages";

const link = (g: Guide): GuideLink => ({ slug: g.slug, h1: g.h1 });
const isGuide = (g: Guide | undefined): g is Guide => !!g;

function linkTargets(g: Guide): LinkTargets {
  const text = JSON.stringify(g);
  const guides = new Set<string>();
  const topics = new Set<string>();
  for (const [, slug = ""] of text.matchAll(/\/guides\/topics\/([^\s)"#?/\\]+)/g))
    if (getTopic(slug)) topics.add(slug);
  for (const [, slug = ""] of text.matchAll(/\/guides\/([^\s)"#?/\\]+)/g))
    if (isPublishedGuide(slug)) guides.add(slug);
  return { guides: [...guides], topics: [...topics] };
}

export function guidePage(slug: string): GuidePageData | null {
  const g = getGuide(slug);
  if (!g) return null;
  const topic = getTopic(clusterInfo(g.cluster).slug);
  const pillar = guidesInCluster(g.cluster).find((x) => x.pillar && x.slug !== g.slug);
  const game = GUIDE_GAME_DATA[g.slug];
  const pick = (slugs: string[]) => {
    const hit = slugs.map((s) => getGuide(s)).find((x) => x && x.slug !== g.slug);
    return hit ? link(hit) : null;
  };
  return {
    guide: g,
    minutes: Math.max(1, Math.round(wordCount(g) / 230)),
    topic: topic ? { slug: topic.slug } : null,
    pillar: pillar ? link(pillar) : null,
    related: g.related
      .map((s) => getGuide(s))
      .filter(isGuide)
      .map((r) => ({ slug: r.slug, h1: r.h1, cluster: r.cluster, description: r.description })),
    family: familyOf(g.slug)
      .map((s) => getGuide(s))
      .filter((x): x is Guide => !!x && !g.related.includes(x.slug))
      .slice(0, 16)
      .map(link),
    familyName: groupOf(g.slug)?.name ?? null,
    snapshotLinks: game
      ? {
          howTo: pick(GAME_GUIDE_LINKS[game].howItWorks),
          fair: pick(GAME_GUIDE_LINKS[game].fairness),
        }
      : { howTo: null, fair: null },
    links: linkTargets(g),
  };
}

export function guidesHub(): GuidesHubData {
  return {
    guides: GUIDES.map((g) => ({
      slug: g.slug,
      h1: g.h1,
      keyword: g.keyword,
      title: g.title,
      cluster: g.cluster,
    })),
    clusters: CLUSTERS.filter((c) => GUIDES.some((g) => g.cluster === c.name)).map((c) => {
      const pillar = GUIDES.find((g) => g.cluster === c.name && g.pillar);
      return {
        name: c.name,
        slug: c.slug,
        blurb: c.blurb,
        topic: !!getTopic(c.slug),
        pillar: pillar ? { slug: pillar.slug, description: pillar.description } : null,
        groups: groupsFor(c.name).map((g) => ({
          name: g.name,
          slugs: g.guides.map((x) => x.slug),
        })),
      };
    }),
  };
}

export function topicPage(slug: string): TopicPageData | null {
  const t = getTopic(slug);
  if (!t) return null;
  const list = guidesInCluster(t.name);
  const pillar = list.find((g) => g.pillar);
  const card = (g: Guide): TopicCard => ({ slug: g.slug, h1: g.h1, description: g.description });
  const groups = groupsFor(t.name);
  const grouped = new Set(groups.flatMap((g) => g.guides.map((x) => x.slug)));
  return {
    topic: {
      name: t.name,
      slug: t.slug,
      title: t.title,
      description: t.description,
      intro: t.intro,
    },
    count: list.length,
    pillar: pillar ? { ...link(pillar), answer: pillar.answer } : null,
    groups: groups
      .map((g) => ({
        name: g.name,
        cards: g.guides.filter((x) => x.slug !== pillar?.slug).map(card),
      }))
      .filter((g) => g.cards.length),
    ungrouped: list.filter((g) => g.slug !== pillar?.slug && !grouped.has(g.slug)).map(card),
    others: publishedTopics()
      .filter((o) => o.slug !== t.slug)
      .map((o) => ({ slug: o.slug, name: o.name })),
    articles: list.map(link),
  };
}
