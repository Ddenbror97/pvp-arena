import { GUIDES, getGuide, getTopic, publishedTopics } from "../src/content/guides";
import { FPS_GUIDES } from "../src/content/guides/fps-guides";
import { FPS_GROUPS, FPS_GUIDE_SLUGS, FPS_PLAN_REUSE } from "../src/content/guides/fps-topics";
import assert from "node:assert/strict";

const newSlugs = new Set(FPS_GUIDE_SLUGS);
const text = (g: (typeof GUIDES)[number]) => JSON.stringify(g);
const targets = (g: (typeof GUIDES)[number]) =>
  new Set([...text(g).matchAll(/\/guides\/(?!topics\/)([a-z0-9-]+)/g)].map((m) => m[1]));
const graph = new Map(GUIDES.map((g) => [g.slug, targets(g)]));
const reachable = (from: string, to: string) => {
  const todo = [from],
    seen = new Set<string>();
  while (todo.length) {
    const next = todo.shift()!;
    if (next === to) return true;
    if (seen.has(next)) continue;
    seen.add(next);
    for (const link of graph.get(next) ?? []) todo.push(link);
  }
  return false;
};
assert.equal(FPS_GUIDES.length, 32);
assert.equal(FPS_GUIDE_SLUGS.length, newSlugs.size, "One family per FPS guide");
assert.equal(FPS_GUIDES.filter((g) => g.pillar).length, 1);
assert(getTopic("fps-and-aim"));
for (const g of FPS_GUIDES) {
  assert(newSlugs.has(g.slug));
  assert(getGuide(g.slug));
  assert.equal(
    GUIDES.filter((x) => x.keyword.toLowerCase() === g.keyword.toLowerCase()).length,
    1,
    `Keyword collision: ${g.keyword}`,
  );
  assert(text(g).includes("/fps-1v1"), `${g.slug}: missing product link`);
  assert(text(g).includes("/guides/topics/fps-and-aim"), `${g.slug}: missing topic link`);
  assert(reachable(g.slug, "fps-for-money-hub"), `${g.slug}: no hub return`);
  for (const link of targets(g)) assert(getGuide(link), `${g.slug}: broken ${link}`);
}
for (const group of FPS_GROUPS)
  for (const slug of group.slugs) assert.equal(getGuide(slug)?.cluster, "FPS & aim");
for (const [candidate, owner] of Object.entries(FPS_PLAN_REUSE)) {
  assert(getGuide(owner), `Unpublished intent owner: ${owner}`);
  if (candidate !== owner) assert(!getGuide(candidate), `Duplicate intent URL: ${candidate}`);
}
const old = GUIDES.filter((g) => !newSlugs.has(g.slug));
const inbound = old.filter((g) => [...targets(g)].some((s) => newSlugs.has(s)));
assert(inbound.length >= 13, "Missing contextual old-to-new links");
for (const g of inbound)
  for (const target of targets(g))
    if (newSlugs.has(target))
      assert(reachable(target, g.slug), `No relevant return path: ${target} -> ${g.slug}`);
const meta = publishedTopics().find((t) => t.slug === "fps-and-aim")!;
assert(meta.title.length >= 40 && meta.title.length <= 59);
assert(meta.description.length >= 120 && meta.description.length <= 159);
console.log(
  JSON.stringify({
    newGuides: FPS_GUIDES.length,
    groups: FPS_GROUPS.length,
    reusedOrCombined: Object.keys(FPS_PLAN_REUSE).length,
    oldGuidesLinkingIn: inbound.length,
    uniquePrimaryIntents: true,
    reciprocalPaths: true,
    topicPublished: true,
  }),
);
