// Run: node scripts/audit-guide-hub.mjs eeat  (writes .wrangler/guide-audit/eeat.json and prints a summary)
//
// A read-only E-E-A-T audit of the published guides, beyond check-guides' publishing gate:
//  - trust: guides with no sources, or only tertiary sources (Wikipedia, Britannica);
//  - helpfulness: answers that refuse the question ("this page will not name…"), and titles that
//    advertise what the page lacks ("No RTP Here", "Not Published");
//  - experience: wording that implies first-hand testing the site does not do;
//  - spam: exact-match keyword density and filler templates (shared with check-guides);
//  - freshness: the oldest "updated" dates.
import { mkdirSync, writeFileSync } from "node:fs";
import { GUIDES } from "../src/content/guides";
import { criticalQualityFailures, keywordStuffingFailure } from "../src/lib/guides/quality";

type Row = { slug: string; cluster: string; detail: string };
const out: Record<string, Row[]> = {};
const add = (kind: string, slug: string, cluster: string, detail: string) =>
  (out[kind] ??= []).push({ slug, cluster, detail });

const TERTIARY = /(^|\.)(wikipedia\.org|britannica\.com)$/;
const REFUSAL =
  /\b(this (page|guide|file|article) (will not|won't|does not|refuses|invents no)|refuses to invent|deliberately not answered|prints no (return|rtp))/i;
const ABSENCE_TITLE =
  /\b(No RTP|Not Published|No Printed|No Net Worth|Unverified|No Multiple|Not Copied)\b/i;
const FIRST_HAND = /\b(we tested|we played|i tested|i played)\b/i;
const NEGATED = /\b(not|no|never|none of|without)\b[^.]{0,60}$/i;

for (const g of GUIDES) {
  const hosts = g.sources.map((s) => new URL(s.url).hostname.replace(/^www\./, ""));
  if (!g.sources.length) add("no-sources", g.slug, g.cluster, "no sources");
  else if (hosts.every((h) => TERTIARY.test(h)))
    add("tertiary-only", g.slug, g.cluster, hosts.join(", "));
  const text = [
    g.answer,
    ...g.facts,
    ...g.sections.map((s) => s.body),
    ...g.faqs.map((f) => f.a),
  ].join("\n\n");
  const refusal = REFUSAL.exec(g.answer);
  if (refusal) add("refusal-in-answer", g.slug, g.cluster, refusal[0]);
  if (ABSENCE_TITLE.test(g.title)) add("absence-title", g.slug, g.cluster, g.title);
  const fh = FIRST_HAND.exec(text);
  if (fh && !NEGATED.test(text.slice(Math.max(0, fh.index - 80), fh.index)))
    add(
      "first-hand-claim",
      g.slug,
      g.cluster,
      text.slice(Math.max(0, fh.index - 60), fh.index + 30),
    );
  const stuffing = keywordStuffingFailure(g.keyword, text);
  if (stuffing) add("keyword-stuffing", g.slug, g.cluster, stuffing);
  for (const f of criticalQualityFailures(text)) add("filler", g.slug, g.cluster, f);
}
const oldest = [...GUIDES].sort((a, b) => a.updated.localeCompare(b.updated)).slice(0, 20);
for (const g of oldest) add("oldest-updated", g.slug, g.cluster, g.updated);

mkdirSync(".wrangler/guide-audit", { recursive: true });
writeFileSync(".wrangler/guide-audit/eeat.json", JSON.stringify(out, null, 1));
console.log(`${GUIDES.length} guides`);
for (const [k, rows] of Object.entries(out)) console.log(`  ${k}: ${rows.length}`);
