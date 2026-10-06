// Run: npx tsx scripts/check-new-guides.ts [slug ...]   (no slugs = every planned guide whose file exists)
// Same rules as check-guides.ts, but planned guides and the new topic hubs count as link targets before they are published.
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  CLUSTER_GROUPS,
  CLUSTERS,
  GUIDES,
  publishedTopics,
  wordCount,
  type Guide,
} from "../src/content/guides";
import { NEW_GUIDES } from "./new-guides-plan";

const STATIC = new Set([
  "/",
  "/coinflip",
  "/roulette",
  "/fairness",
  "/about",
  "/how-it-works",
  "/terms",
  "/privacy",
  "/responsible-gambling",
  "/wallet",
  "/profile",
  "/guides",
  "/auth",
  "/prestige",
]);
const plan = new Map(NEW_GUIDES.map((g) => [g.slug, g]));
const guideSlugs = new Set([...GUIDES.map((g) => g.slug), ...plan.keys()]);
const topicSlugs = new Set([
  ...publishedTopics().map((t) => t.slug),
  ...CLUSTERS.map((c) => c.slug),
]);
const existingKeywords = new Map(GUIDES.map((g) => [g.keyword.toLowerCase(), g.slug]));
const plannedKeywords = new Map(NEW_GUIDES.map((g) => [g.keyword.toLowerCase(), g.slug]));

const wanted = process.argv.slice(2);
const targets = (wanted.length ? wanted : [...plan.keys()]).filter(
  (s) => wanted.length || existsSync(`src/content/guides/${s}.ts`),
);

let fail = 0;
for (const slug of targets) {
  const errs: string[] = [];
  const err = (m: string) => errs.push(m);
  const planned = plan.get(slug);
  if (!planned) err("slug not in scripts/new-guides-plan.ts");
  const file = `src/content/guides/${slug}.ts`;
  if (!existsSync(file)) {
    console.log(`${slug}: FAIL file missing`);
    fail++;
    continue;
  }
  const g = ((await import(pathToFileURL(file).href)) as { guide: Guide }).guide;
  const wc = wordCount(g);
  if (g.slug !== slug) err(`slug field ${g.slug}`);
  if (planned && g.cluster !== planned.cluster)
    err(`cluster ${g.cluster}, plan says ${planned.cluster}`);
  if (planned && g.keyword !== planned.keyword)
    err(`keyword "${g.keyword}", plan says "${planned.keyword}"`);
  if (existingKeywords.has(g.keyword.toLowerCase()))
    err(`keyword already used by ${existingKeywords.get(g.keyword.toLowerCase())}`);
  if (plannedKeywords.get(g.keyword.toLowerCase()) !== slug)
    err("keyword clashes with another planned guide");
  if (wc < 1850 || wc > 2400) err(`word count ${wc} (need 1850-2400)`);
  if (g.title.length < 40 || g.title.length > 59)
    err(`title length ${g.title.length} (need 40-59)`);
  if (g.description.length < 120 || g.description.length > 159)
    err(`desc length ${g.description.length} (need 120-159)`);
  if (g.faqs.length < 4 || g.faqs.length > 6) err(`faqs ${g.faqs.length} (need 4-6)`);
  const first100 = [g.h1, g.answer].join(" ").toLowerCase().split(/\s+/).slice(0, 100).join(" ");
  if (!first100.includes(g.keyword.toLowerCase()))
    err("keyword missing from first 100 words of h1 + answer");
  const body = [
    g.answer,
    ...g.facts,
    ...g.sections.map((s) => s.body),
    ...g.faqs.map((f) => `${f.q}\n${f.a}`),
  ].join("\n");
  const links = [...body.matchAll(/\]\((\/[^)\s]*)\)/g)].map(
    (m) => m[1]!.split("#")[0]!.split("?")[0]!.replace(/\/$/, "") || "/",
  );
  if (g.cta) links.push(g.cta.primary.to, g.cta.secondary.to);
  for (const l of links) {
    if (l.startsWith("/guides/topics/")) {
      if (!topicSlugs.has(l.slice("/guides/topics/".length))) err(`unknown topic link ${l}`);
    } else if (l.startsWith("/guides/")) {
      if (!guideSlugs.has(l.slice("/guides/".length))) err(`unknown guide link ${l}`);
    } else if (l !== "/guides" && !STATIC.has(l)) err(`unknown site link ${l}`);
  }
  const sectionGuideLinks = new Set(
    g.sections.flatMap((s) =>
      [...s.body.matchAll(/\]\((\/guides\/(?!topics\/)[^)\s#?]*)/g)].map((m) => m[1]),
    ),
  );
  if (sectionGuideLinks.size < 3)
    err(`only ${sectionGuideLinks.size} distinct guide links in sections (need 3+)`);
  if (!g.sections.some((s) => s.body.includes("/guides/topics/")))
    err("no topic hub link in sections");
  if (!g.sections.some((s) => /\]\((\/(?!guides\/)[^)]*)\)/.test(s.body)))
    err("no site link (e.g. /roulette, /responsible-gambling) in sections");
  for (const r of g.related) if (!guideSlugs.has(r)) err(`unknown related ${r}`);
  if (planned && !CLUSTER_GROUPS[planned.cluster].some((grp) => grp.slugs.includes(slug)))
    err("slug missing from CLUSTER_GROUPS");
  if (errs.length) fail++;
  console.log(
    `${slug}: ${wc} words, title ${g.title.length}, desc ${g.description.length}${errs.length ? "\n  FAIL " + errs.join("\n  FAIL ") : " OK"}`,
  );
}
console.log(
  fail ? `\n${fail} guide(s) with problems` : `\nAll ${targets.length} checked guides pass.`,
);
process.exit(fail ? 1 : 0);
