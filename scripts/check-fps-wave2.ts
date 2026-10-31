import { GUIDES, wordCount } from "../src/content/guides";
import { FPS_WAVE2_GUIDES } from "../src/content/guides/fps-wave2";
import { FPS_WAVE2_PLAN } from "./fps-wave2-plan";
import { criticalQualityFailures } from "../src/lib/guides/quality";

const plan = FPS_WAVE2_PLAN.flatMap((group) => group.rows);
const expected = new Map(plan.map((row) => [row.slug, row.keyword]));
const drafts = new Map(FPS_WAVE2_GUIDES.map((guide) => [guide.slug, guide]));
const all = new Map([...GUIDES, ...FPS_WAVE2_GUIDES].map((guide) => [guide.slug, guide]));
const failures: string[] = [];
const warnings: string[] = [];
const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const keywords = new Map<string, string>();
for (const guide of GUIDES.filter((guide) => !drafts.has(guide.slug)))
  keywords.set(normalize(guide.keyword), guide.slug);
if (drafts.size !== 45 || FPS_WAVE2_GUIDES.length !== 45)
  failures.push("Expected 45 distinct drafts");
for (const slug of expected.keys()) if (!drafts.has(slug)) failures.push(`Missing ${slug}`);
const paragraphs = new Map<string, string>();
const incoming = new Map<string, number>();
for (const guide of all.values()) {
  const text = guide.sections.map((section) => section.body).join("\n\n");
  for (const link of text.matchAll(/\]\(\/guides\/([^#?)\s]+)(?:[^)]*)\)/g)) {
    if (drafts.has(link[1]) && guide.slug !== link[1])
      incoming.set(link[1], (incoming.get(link[1]) ?? 0) + 1);
  }
}
for (const guide of FPS_WAVE2_GUIDES) {
  const fail = (message: string) => failures.push(`${guide.slug}: ${message}`);
  const count = wordCount(guide);
  if (count < 2400 || count > 2800) fail(`${count} words, expected 2400–2800`);
  if (expected.get(guide.slug) !== guide.keyword)
    fail("Primary keyword differs from ownership map");
  const key = normalize(guide.keyword);
  if (keywords.has(key)) fail(`Keyword also owned by ${keywords.get(key)}`);
  keywords.set(key, guide.slug);
  if (guide.title.length < 40 || guide.title.length > 59)
    fail(`Title length ${guide.title.length}`);
  if (guide.description.length < 120 || guide.description.length > 159)
    fail(`Description length ${guide.description.length}`);
  if (guide.faqs.length !== 6) fail("Expected six intent-specific FAQs");
  const body = guide.sections.map((section) => section.body).join("\n\n");
  const titledBody = guide.sections
    .map((section) => `${section.title}\n${section.body}`)
    .join("\n\n");
  if ((body.match(/^\|[ :|-]*-{3,}[ :|-]*\|?\s*$/gm) ?? []).length < 2)
    fail("Fewer than two comparison tables");
  if (!/checklist/i.test(titledBody) && (body.match(/^(?:\d+\. |- )/gm) ?? []).length < 4)
    fail("No labeled checklist");
  const pairedLabels =
    /example\s*(?:a|1)/i.test(titledBody) && /example\s*(?:b|2)/i.test(titledBody);
  const hypotheticalExamples = (titledBody.match(/hypothetical (?:usd |dollar )?example/gi) ?? [])
    .length;
  if (!pairedLabels && hypotheticalExamples < 2) fail("Missing labeled example A/1 or B/2");
  if (!body.includes("$")) fail("No labeled dollar examples");
  if (guide.sources.length === 0) fail("No primary sources recorded");
  if (!/\]\(\/guides\/topics\/fps-and-aim\)/.test(body)) fail("Missing FPS topic link");
  if (!body.includes("](/fps-1v1)")) fail("Missing game landing-page link");
  for (const match of body.matchAll(/\]\(\/guides\/([^#?)\s]+)(?:[^)]*)\)/g))
    if (!match[1].startsWith("topics/") && !all.has(match[1]))
      fail(`Unknown guide link ${match[1]}`);
  if (!incoming.has(guide.slug))
    warnings.push(`${guide.slug}: no contextual incoming guide link yet`);
  for (const failure of criticalQualityFailures(body)) fail(failure);
  for (const paragraph of body.split(/\n\s*\n/)) {
    const normalized = paragraph.replace(/\s+/g, " ").trim();
    if (normalized.length < 250 || normalized.startsWith("|")) continue;
    const owner = paragraphs.get(normalized);
    if (owner && owner !== guide.slug)
      warnings.push(`${guide.slug}: paragraph duplicated from ${owner}`);
    else paragraphs.set(normalized, guide.slug);
  }
  console.log(
    `${guide.slug}: ${count} words, ${guide.faqs.length} FAQs, ${guide.sources.length} sources`,
  );
}
for (const warning of warnings) console.warn(`WARN ${warning}`);
for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(
  `${FPS_WAVE2_GUIDES.length} drafts; ${failures.length} failures; ${warnings.length} editorial warnings.`,
);
process.exitCode = failures.length ? 1 : 0;
