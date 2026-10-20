/**
 * Repeatable guide-library SEO audit.
 *
 * Character counts use Unicode code points (for...of), not UTF-8 bytes.
 * Published guides are GUIDES only. Untracked drafts are not indexed.
 * "Newest" means guide files added on this branch after the merge-base with origin/main.
 *
 * Usage: bun scripts/audit-guide-seo.ts [--json out.json]
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import {
  CLUSTERS,
  CLUSTER_GROUPS,
  GUIDES,
  clusterInfo,
  getGuide,
  publishedTopics,
} from "../src/content/guides";

const TITLE_MAX = 60;
const DESC_MAX = 160;

function codePoints(s: string): number {
  let n = 0;
  for (const _ of s) n++;
  return n;
}

function newestSlugs(): Set<string> {
  let raw = "";
  try {
    raw = execSync(
      "git log --diff-filter=A --name-only --pretty=format: origin/main..HEAD -- src/content/guides",
      { encoding: "utf8" },
    );
  } catch {
    return new Set();
  }
  const slugs = new Set<string>();
  for (const line of raw.split("\n")) {
    const m = line.match(/src\/content\/guides\/(.+)\.ts$/);
    if (m) slugs.add(m[1]);
  }
  return slugs;
}

type LinkHit = { kind: "guide" | "hub" | "site" | "external" | "other"; href: string; anchor: string };

function linksIn(text: string): LinkHit[] {
  const out: LinkHit[] = [];
  for (const m of text.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    const anchor = m[1];
    const href = m[2].split("#")[0].split("?")[0];
    let kind: LinkHit["kind"] = "other";
    if (href.startsWith("/guides/topics/")) kind = "hub";
    else if (href.startsWith("/guides/") && href !== "/guides") kind = "guide";
    else if (href.startsWith("/")) kind = "site";
    else if (href.startsWith("http://") || href.startsWith("https://")) kind = "external";
    out.push({ kind, href: href.replace(/\/$/, "") || "/", anchor });
  }
  return out;
}

const published = new Set(GUIDES.map((g) => g.slug));
const topics = new Set(publishedTopics().map((t) => t.slug));
const newest = newestSlugs();
const bySlug = new Map(GUIDES.map((g) => [g.slug, g]));

const groupOf = new Map<string, { cluster: string; group: string }>();
const groupProblems: { slug: string; issue: string; cluster?: string; group?: string }[] = [];
for (const [cluster, groups] of Object.entries(CLUSTER_GROUPS)) {
  const seen = new Set<string>();
  for (const group of groups) {
    for (const slug of group.slugs) {
      if (seen.has(slug)) groupProblems.push({ slug, issue: "duplicate-in-cluster-groups", cluster, group: group.name });
      seen.add(slug);
      if (groupOf.has(slug)) {
        const prev = groupOf.get(slug)!;
        groupProblems.push({
          slug,
          issue: "listed-in-two-clusters",
          cluster: `${prev.cluster} and ${cluster}`,
          group: group.name,
        });
      }
      groupOf.set(slug, { cluster, group: group.name });
      if (!published.has(slug)) {
        groupProblems.push({ slug, issue: "hub-lists-unpublished-slug", cluster, group: group.name });
      } else {
        const g = bySlug.get(slug)!;
        if (g.cluster !== cluster) {
          groupProblems.push({
            slug,
            issue: "group-cluster-mismatch",
            cluster: `filed under ${cluster}, guide.cluster is ${g.cluster}`,
            group: group.name,
          });
        }
      }
    }
  }
}

type Finding = {
  sourceFile: string;
  sourceUrl: string;
  destinationUrl?: string;
  issue: string;
  severity: "high" | "medium" | "low";
  cluster: string;
  evidence: string;
  recommendedFix: string;
  implemented: false;
};

const findings: Finding[] = [];

function add(f: Omit<Finding, "implemented">) {
  findings.push({ ...f, implemented: false });
}

const incomingBody = new Map<string, number>();
const incomingRelated = new Map<string, number>();
for (const g of GUIDES) {
  incomingBody.set(g.slug, 0);
  incomingRelated.set(g.slug, 0);
}

const titleOwners = new Map<string, string[]>();
const descOwners = new Map<string, string[]>();

for (const g of GUIDES) {
  const url = `/guides/${g.slug}`;
  const file = `src/content/guides/${g.slug}.ts`;
  const titleLen = codePoints(g.title);
  const descLen = codePoints(g.description);
  if (!g.title.trim()) add({ sourceFile: file, sourceUrl: url, issue: "missing-title", severity: "high", cluster: g.cluster, evidence: "empty title", recommendedFix: "Set a unique title within 60 characters." });
  if (!g.description.trim()) add({ sourceFile: file, sourceUrl: url, issue: "missing-description", severity: "high", cluster: g.cluster, evidence: "empty description", recommendedFix: "Set a unique description within 160 characters." });
  if (titleLen > TITLE_MAX) add({ sourceFile: file, sourceUrl: url, issue: "title-over-60", severity: "high", cluster: g.cluster, evidence: `${titleLen} code points: ${g.title}`, recommendedFix: "Shorten the title without dropping the topic." });
  if (descLen > DESC_MAX) add({ sourceFile: file, sourceUrl: url, issue: "description-over-160", severity: "high", cluster: g.cluster, evidence: `${descLen} code points`, recommendedFix: "Shorten the description." });
  titleOwners.set(g.title, [...(titleOwners.get(g.title) ?? []), g.slug]);
  descOwners.set(g.description, [...(descOwners.get(g.description) ?? []), g.slug]);

  const topic = clusterInfo(g.cluster);
  const hub = `/guides/topics/${topic.slug}`;
  const body = g.sections.map((s) => s.body).join("\n");
  const bodyLinks = linksIn(body);
  const hubOk = bodyLinks.some((l) => l.kind === "hub" && l.href === hub);
  if (!topics.has(topic.slug)) {
    add({ sourceFile: file, sourceUrl: url, destinationUrl: hub, issue: "cluster-hub-unpublished", severity: "high", cluster: g.cluster, evidence: `topic ${topic.slug} is below MIN_TOPIC_GUIDES or missing`, recommendedFix: "Do not link an unpublished hub; publish the topic only when it has enough guides." });
  } else if (!hubOk) {
    const anyHub = bodyLinks.filter((l) => l.kind === "hub").map((l) => l.href);
    add({ sourceFile: file, sourceUrl: url, destinationUrl: hub, issue: "missing-or-wrong-hub-link", severity: "medium", cluster: g.cluster, evidence: anyHub.length ? `links ${anyHub.join(", ")} instead of ${hub}` : "no hub link in section bodies", recommendedFix: `Link ${hub} from a section body when the sentence is about this cluster.` });
  }

  const filed = groupOf.get(g.slug);
  if (!filed) {
    add({ sourceFile: file, sourceUrl: url, issue: "ungrouped-on-hub", severity: "low", cluster: g.cluster, evidence: "published and listed under More in this topic, not a named subgroup", recommendedFix: "Add the slug to the matching CLUSTER_GROUPS subgroup." });
  }

  for (const l of bodyLinks) {
    if (l.kind === "guide") {
      const dest = l.href.slice("/guides/".length);
      if (dest === g.slug) {
        add({ sourceFile: file, sourceUrl: url, destinationUrl: l.href, issue: "self-link", severity: "low", cluster: g.cluster, evidence: `anchor "${l.anchor}"`, recommendedFix: "Remove the self-link." });
      } else if (!published.has(dest)) {
        add({ sourceFile: file, sourceUrl: url, destinationUrl: l.href, issue: "broken-guide-link", severity: "high", cluster: g.cluster, evidence: `anchor "${l.anchor}"`, recommendedFix: "Point the link at a published guide." });
      } else incomingBody.set(dest, (incomingBody.get(dest) ?? 0) + 1);
    } else if (l.kind === "hub") {
      const dest = l.href.slice("/guides/topics/".length);
      if (!topics.has(dest)) {
        add({ sourceFile: file, sourceUrl: url, destinationUrl: l.href, issue: "broken-hub-link", severity: "high", cluster: g.cluster, evidence: `anchor "${l.anchor}"`, recommendedFix: "Point the link at a published topic." });
      }
    }
    if (/^click here$/i.test(l.anchor.trim()) || /^here$/i.test(l.anchor.trim())) {
      add({ sourceFile: file, sourceUrl: url, destinationUrl: l.href, issue: "generic-anchor", severity: "low", cluster: g.cluster, evidence: l.anchor, recommendedFix: "Use an anchor that names the destination." });
    }
  }
  for (const r of g.related) {
    if (!published.has(r)) {
      add({ sourceFile: file, sourceUrl: url, destinationUrl: `/guides/${r}`, issue: "broken-related", severity: "high", cluster: g.cluster, evidence: r, recommendedFix: "Remove or replace the related slug." });
    } else incomingRelated.set(r, (incomingRelated.get(r) ?? 0) + 1);
  }
}

for (const [title, slugs] of titleOwners) {
  if (slugs.length > 1) {
    add({ sourceFile: slugs.map((s) => `src/content/guides/${s}.ts`).join(", "), sourceUrl: slugs.map((s) => `/guides/${s}`).join(", "), issue: "duplicate-title", severity: "medium", cluster: "mixed", evidence: `${codePoints(title)} code points shared by ${slugs.join(", ")}`, recommendedFix: "Give each page its own title." });
  }
}
for (const [desc, slugs] of descOwners) {
  if (slugs.length > 1) {
    add({ sourceFile: slugs.map((s) => `src/content/guides/${s}.ts`).join(", "), sourceUrl: slugs.map((s) => `/guides/${s}`).join(", "), issue: "duplicate-description", severity: "medium", cluster: "mixed", evidence: `${codePoints(desc)} code points shared by ${slugs.length} guides`, recommendedFix: "Give each page its own description." });
  }
}

for (const p of groupProblems) {
  add({
    sourceFile: "src/content/guides/index.ts",
    sourceUrl: published.has(p.slug) ? `/guides/${p.slug}` : `/guides/${p.slug}`,
    issue: p.issue,
    severity: p.issue === "hub-lists-unpublished-slug" || p.issue === "group-cluster-mismatch" ? "high" : "medium",
    cluster: p.cluster ?? "",
    evidence: `${p.slug} in ${p.group ?? ""}`,
    recommendedFix: "Fix CLUSTER_GROUPS so the slug matches a published guide in that cluster.",
  });
}

for (const t of CLUSTERS) {
  const titleLen = codePoints(t.title);
  const descLen = codePoints(t.description);
  const url = `/guides/topics/${t.slug}`;
  const live = topics.has(t.slug);
  if (titleLen > TITLE_MAX) add({ sourceFile: "src/content/guides/index.ts", sourceUrl: url, issue: "hub-title-over-60", severity: "high", cluster: t.name, evidence: `${titleLen}: ${t.title}`, recommendedFix: "Shorten the hub title." });
  if (descLen > DESC_MAX) add({ sourceFile: "src/content/guides/index.ts", sourceUrl: url, issue: "hub-description-over-160", severity: "high", cluster: t.name, evidence: `${descLen}`, recommendedFix: "Shorten the hub description." });
  if (!t.title.trim() || !t.description.trim()) add({ sourceFile: "src/content/guides/index.ts", sourceUrl: url, issue: "hub-missing-meta", severity: "high", cluster: t.name, evidence: "empty hub title or description", recommendedFix: "Set hub metadata." });
  if (!live) add({ sourceFile: "src/content/guides/index.ts", sourceUrl: url, issue: "hub-not-published", severity: "low", cluster: t.name, evidence: "below MIN_TOPIC_GUIDES", recommendedFix: "Leave unpublished until the cluster has 3 guides. Do not link it." });
}

const newestGuides = GUIDES.filter((g) => newest.has(g.slug));
const newestMissingFromRegistry = [...newest].filter((s) => !published.has(s));
const newAudit = newestGuides.map((g) => {
  const topic = clusterInfo(g.cluster);
  const body = g.sections.map((s) => s.body).join("\n");
  const bodyLinks = linksIn(body).filter((l) => l.kind === "guide");
  const older = bodyLinks.filter((l) => !newest.has(l.href.slice("/guides/".length)));
  const inBody = incomingBody.get(g.slug) ?? 0;
  const inRel = incomingRelated.get(g.slug) ?? 0;
  const filed = groupOf.get(g.slug);
  const titleLen = codePoints(g.title);
  const descLen = codePoints(g.description);
  if (inBody === 0) {
    add({
      sourceFile: `src/content/guides/${g.slug}.ts`,
      sourceUrl: `/guides/${g.slug}`,
      issue: "new-guide-no-incoming-body-link",
      severity: "medium",
      cluster: g.cluster,
      evidence: `related incoming ${inRel}; body incoming 0`,
      recommendedFix: "Add one contextual link from an older guide in the same cluster, with an anchor that is not this page's exact keyword.",
    });
  }
  if (older.length === 0) {
    add({
      sourceFile: `src/content/guides/${g.slug}.ts`,
      sourceUrl: `/guides/${g.slug}`,
      issue: "new-guide-no-link-to-older-guide",
      severity: "medium",
      cluster: g.cluster,
      evidence: `${bodyLinks.length} guide links, none to a pre-existing guide`,
      recommendedFix: "Link a foundational guide in the same topic.",
    });
  }
  return {
    url: `/guides/${g.slug}`,
    cluster: g.cluster,
    hub: `/guides/topics/${topic.slug}`,
    subgroup: filed?.group ?? null,
    incomingBodyLinks: inBody,
    incomingRelated: inRel,
    outgoingOlderGuides: older.length,
    titleCodePoints: titleLen,
    descriptionCodePoints: descLen,
    metadataOk: titleLen > 0 && titleLen <= TITLE_MAX && descLen > 0 && descLen <= DESC_MAX,
  };
});

const orphans = GUIDES.filter((g) => (incomingBody.get(g.slug) ?? 0) === 0).map((g) => g.slug);

const hubReport = publishedTopics().map((t) => {
  const members = GUIDES.filter((g) => g.cluster === t.name);
  const grouped = new Set(
    (CLUSTER_GROUPS[t.name] ?? []).flatMap((g) => g.slugs),
  );
  const missingFromGroups = members.filter((g) => !grouped.has(g.slug)).map((g) => g.slug);
  const wrong = (CLUSTER_GROUPS[t.name] ?? []).flatMap((g) =>
    g.slugs.filter((s) => {
      const guide = getGuide(s);
      return !guide || guide.cluster !== t.name;
    }),
  );
  return {
    url: `/guides/topics/${t.slug}`,
    name: t.name,
    titleCodePoints: codePoints(t.title),
    descriptionCodePoints: codePoints(t.description),
    expectedGuides: members.length,
    grouped: members.length - missingFromGroups.length,
    ungrouped: missingFromGroups,
    invalidGroupSlugs: wrong,
  };
});

const byIssue = new Map<string, number>();
for (const f of findings) byIssue.set(f.issue, (byIssue.get(f.issue) ?? 0) + 1);

const report = {
  method: {
    titleMax: TITLE_MAX,
    descriptionMax: DESC_MAX,
    characterCount: "Unicode code points via for...of, markup excluded",
    publishedDefinition: "GUIDES array. Draft files on disk that are not imported are excluded.",
    newestDefinition: "git log --diff-filter=A origin/main..HEAD -- src/content/guides",
    renderedMetadata: "guides.$slug.tsx and guides.topics.$topic.tsx set <title>, meta description, og:title, og:description, and canonical from the same title and description fields. This audit reads those source fields. Production HTML was not fetched.",
  },
  inventory: {
    publishedGuides: GUIDES.length,
    expectedAbout: 1040,
    discrepancy: GUIDES.length - 1040,
    hubsDefined: CLUSTERS.length,
    hubsPublished: publishedTopics().length,
    newestIdentified: newest.size,
    newestPublished: newestGuides.length,
    newestNotInGuides: newestMissingFromRegistry,
    guidesAudited: GUIDES.length,
    coverage: 1,
  },
  issueCounts: Object.fromEntries([...byIssue.entries()].sort((a, b) => b[1] - a[1])),
  findings,
  newGuides: newAudit,
  orphansNoIncomingBodyLink: orphans,
  hubs: hubReport,
};

const jsonIdx = process.argv.indexOf("--json");
const outPath = jsonIdx >= 0 ? process.argv[jsonIdx + 1] : "";
const text = JSON.stringify(report, null, 2);
if (outPath) writeFileSync(outPath, text);
else process.stdout.write(text);

const high = findings.filter((f) => f.severity === "high").length;
console.error(
  `guides ${GUIDES.length}; hubs ${publishedTopics().length}; newest ${newestGuides.length}; findings ${findings.length} (${high} high); orphans ${orphans.length}`,
);
