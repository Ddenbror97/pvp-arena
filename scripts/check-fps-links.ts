import { GUIDES } from "../src/content/guides";
import { FPS_WAVE2_GUIDES } from "../src/content/guides/fps-wave2";
import { FPS_GROUPS } from "../src/content/guides/fps-topics";

const bySlug = new Map(GUIDES.map((guide) => [guide.slug, guide]));
const newSlugs = new Set(FPS_WAVE2_GUIDES.map((guide) => guide.slug));
const edges = new Map(
  GUIDES.map((guide) => [
    guide.slug,
    new Set(
      [
        ...guide.sections
          .map((section) => section.body)
          .join("\n")
          .matchAll(/\]\(\/guides\/([^#?)\s]+)(?:[^)]*)\)/g),
      ]
        .map((match) => match[1])
        .filter((slug) => !slug.startsWith("topics/")),
    ),
  ]),
);
const failures: string[] = [];
const membership = new Map<string, number>();
for (const group of FPS_GROUPS) {
  if (!group.slugs.length) failures.push(`Empty group: ${group.name}`);
  for (const slug of group.slugs) {
    membership.set(slug, (membership.get(slug) ?? 0) + 1);
    if (bySlug.get(slug)?.cluster !== "FPS & aim")
      failures.push(`Invalid FPS group member: ${slug}`);
  }
}
for (const guide of GUIDES.filter((guide) => guide.cluster === "FPS & aim"))
  if (membership.get(guide.slug) !== 1)
    failures.push(`${guide.slug}: expected exactly one FPS group`);
const pillars = GUIDES.filter((guide) => guide.cluster === "FPS & aim" && guide.pillar);
if (pillars.length !== 1 || pillars[0]?.slug !== "fps-for-money-hub")
  failures.push("FPS topic must retain its single established pillar");

const rows = FPS_WAVE2_GUIDES.map((guide) => {
  const outgoing = edges.get(guide.slug)!;
  const oldIncoming = GUIDES.filter(
    (old) => !newSlugs.has(old.slug) && edges.get(old.slug)?.has(guide.slug),
  ).map((old) => old.slug);
  const oldOutgoing = [...outgoing].filter((slug) => !newSlugs.has(slug) && bySlug.has(slug));
  const reciprocal = oldIncoming.filter((slug) => outgoing.has(slug));
  if (!oldIncoming.length) failures.push(`${guide.slug}: no contextual link from an older guide`);
  if (!oldOutgoing.length) failures.push(`${guide.slug}: no contextual link to an older guide`);
  if (!reciprocal.length)
    failures.push(`${guide.slug}: no reciprocal contextual pair with an older guide`);
  for (const target of outgoing) {
    if (!bySlug.has(target)) failures.push(`${guide.slug}: broken guide target ${target}`);
    if (target === guide.slug) failures.push(`${guide.slug}: self-link`);
  }
  const body = guide.sections.map((section) => section.body).join("\n");
  for (const match of body.matchAll(/\]\(\/guides\/([^#?)\s]+)#([^?)\s]+)\)/g)) {
    const target = bySlug.get(match[1]);
    if (!target) continue;
    const fragment = decodeURIComponent(match[2]);
    if (
      !target.sections.some((section) => section.id === fragment) &&
      !["faq", "sources", "calculator"].includes(fragment)
    )
      failures.push(`${guide.slug}: missing section ${match[1]}#${fragment}`);
  }
  return { slug: guide.slug, oldIncoming, oldOutgoing, reciprocal };
});
const oldParents = new Set(rows.flatMap((row) => row.oldIncoming));
console.log(
  JSON.stringify(
    {
      newGuides: rows.length,
      olderReferringGuides: oldParents.size,
      oldToNewEdges: rows.reduce((n, row) => n + row.oldIncoming.length, 0),
      newToOldEdges: rows.reduce((n, row) => n + row.oldOutgoing.length, 0),
      reciprocalPairs: rows.reduce((n, row) => n + row.reciprocal.length, 0),
      groupedFpsGuides: membership.size,
      taskGroups: FPS_GROUPS.length,
      rows,
      failures,
    },
    null,
    2,
  ),
);
process.exitCode = failures.length ? 1 : 0;
