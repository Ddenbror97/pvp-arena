import { CLUSTERS, clusterInfo, familyOf, groupOf } from "@/content/guides/clusters";
import type { Guide } from "@/content/guides/types";
import { wordCount } from "@/content/guides/text";
import { GAME_GUIDE_LINKS, GUIDE_GAME_DATA } from "@/lib/game-snapshot/snapshot";
import { loadGuideBody } from "@/lib/guides/bodies";
import {
  allGuideMeta,
  guideMeta,
  isPublishedGuide,
  metaGroups,
  metasInCluster,
  publishedTopics,
  type GuideMeta,
} from "@/lib/guides/catalog";
import type {
  GuideLink,
  GuidePageData,
  GuidesHubData,
  LinkTargets,
  TopicCard,
  TopicPageData,
} from "./pages";

const link = (g: { slug: string; h1: string }): GuideLink => ({ slug: g.slug, h1: g.h1 });
const isMeta = (g: GuideMeta | undefined): g is GuideMeta => !!g;

function linkTargets(g: Guide): LinkTargets {
  const text = JSON.stringify(g);
  const guides = new Set<string>();
  const topics = new Set<string>();
  const published = new Set(publishedTopics().map((topic) => topic.slug));
  for (const [, slug = ""] of text.matchAll(/\/guides\/topics\/([^\s)"#?/\\]+)/g))
    if (published.has(slug)) topics.add(slug);
  for (const [, slug = ""] of text.matchAll(/\/guides\/([^\s)"#?/\\]+)/g))
    if (isPublishedGuide(slug)) guides.add(slug);
  return { guides: [...guides], topics: [...topics] };
}

export async function guidePage(slug: string): Promise<GuidePageData | null> {
  const g = await loadGuideBody(slug);
  if (!g || !guideMeta(slug)) return null;
  const topic = publishedTopics().find((item) => item.slug === clusterInfo(g.cluster).slug);
  const pillar = metasInCluster(g.cluster).find((item) => item.pillar && item.slug !== g.slug);
  const game = GUIDE_GAME_DATA[g.slug];
  const pick = (slugs: string[]) => {
    const hit = slugs.map((item) => guideMeta(item)).find((item) => item && item.slug !== g.slug);
    return hit ? link(hit) : null;
  };
  return {
    guide: g,
    minutes: Math.max(1, Math.round(wordCount(g) / 230)),
    topic: topic ? { slug: topic.slug } : null,
    pillar: pillar ? link(pillar) : null,
    related: g.related
      .map((item) => guideMeta(item))
      .filter(isMeta)
      .map((item) => ({
        slug: item.slug,
        h1: item.h1,
        cluster: item.cluster,
        description: item.description,
      })),
    family: familyOf(g.slug)
      .map((item) => guideMeta(item))
      .filter((item): item is GuideMeta => !!item && !g.related.includes(item.slug))
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
  const guides = allGuideMeta();
  const topics = new Set(publishedTopics().map((topic) => topic.slug));
  return {
    guides: guides.map((guide) => ({
      slug: guide.slug,
      h1: guide.h1,
      keyword: guide.keyword,
      title: guide.title,
      cluster: guide.cluster,
    })),
    clusters: CLUSTERS.filter((cluster) =>
      guides.some((guide) => guide.cluster === cluster.name),
    ).map((cluster) => {
      const pillar = guides.find((guide) => guide.cluster === cluster.name && guide.pillar);
      return {
        name: cluster.name,
        slug: cluster.slug,
        blurb: cluster.blurb,
        topic: topics.has(cluster.slug),
        pillar: pillar ? { slug: pillar.slug, description: pillar.description } : null,
        groups: metaGroups(cluster.name).map((group) => ({
          name: group.name,
          slugs: group.guides.map((guide) => guide.slug),
        })),
      };
    }),
  };
}

export async function topicPage(slug: string): Promise<TopicPageData | null> {
  const topic = publishedTopics().find((item) => item.slug === slug);
  if (!topic) return null;
  const list = metasInCluster(topic.name);
  const pillar = list.find((guide) => guide.pillar);
  const pillarBody = pillar ? await loadGuideBody(pillar.slug) : null;
  if (pillar && !pillarBody) return null;
  const card = (guide: GuideMeta): TopicCard => ({
    slug: guide.slug,
    h1: guide.h1,
    description: guide.description,
  });
  const groups = metaGroups(topic.name);
  const grouped = new Set(groups.flatMap((group) => group.guides.map((guide) => guide.slug)));
  return {
    topic: {
      name: topic.name,
      slug: topic.slug,
      title: topic.title,
      description: topic.description,
      intro: topic.intro,
    },
    count: list.length,
    pillar: pillar && pillarBody ? { ...link(pillar), answer: pillarBody.answer } : null,
    groups: groups
      .map((group) => ({
        name: group.name,
        cards: group.guides.filter((guide) => guide.slug !== pillar?.slug).map(card),
      }))
      .filter((group) => group.cards.length > 0),
    ungrouped: list
      .filter((guide) => guide.slug !== pillar?.slug && !grouped.has(guide.slug))
      .map(card),
    others: publishedTopics()
      .filter((item) => item.slug !== topic.slug)
      .map((item) => ({ slug: item.slug, name: item.name })),
    articles: list.map(link),
  };
}
