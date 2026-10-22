import { GUIDE_META, type GuideMeta } from "@/content/guides/catalog.generated";

export type { GuideMeta };
import {
  CLUSTERS,
  CLUSTER_GROUPS,
  MIN_TOPIC_GUIDES,
  type ClusterInfo,
} from "@/content/guides/clusters";
import type { GuideCluster } from "@/content/guides/types";

const bySlug = new Map(GUIDE_META.map((guide) => [guide.slug, guide]));

export function guideMeta(slug: string): GuideMeta | undefined {
  return bySlug.get(slug);
}

export function isPublishedGuide(slug: string): boolean {
  return bySlug.has(slug);
}

export function publishedTopics(): ClusterInfo[] {
  return CLUSTERS.filter(
    (cluster) =>
      GUIDE_META.filter((guide) => guide.cluster === cluster.name).length >= MIN_TOPIC_GUIDES,
  );
}

export function metasInCluster(name: GuideCluster): GuideMeta[] {
  return GUIDE_META.filter((guide) => guide.cluster === name).sort(
    (a, b) => Number(b.pillar) - Number(a.pillar),
  );
}

export function metaGroups(name: GuideCluster): { name: string; guides: GuideMeta[] }[] {
  return CLUSTER_GROUPS[name]
    .map((group) => ({
      name: group.name,
      guides: group.slugs
        .map((slug) => bySlug.get(slug))
        .filter((guide): guide is GuideMeta => !!guide),
    }))
    .filter((group) => group.guides.length > 0);
}

export function allGuideMeta(): readonly GuideMeta[] {
  return GUIDE_META;
}
