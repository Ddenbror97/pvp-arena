/**
 * Read-only spam and content-quality audit for published guides.
 * Run: bun scripts/seo-spam-audit.ts
 *
 * Writes CSVs and summary.json under seo-spam-audit/data/.
 * Does not modify guide content.
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GUIDES, publishedTopics, wordCount, type Guide } from "../src/content/guides";
import { GAME_FACT_PAGES } from "../src/lib/seo/game-facts";
import {
  criticalQualityFailures,
  QUALITY_SCORE_CAP_WHEN_CRITICAL,
} from "../src/lib/guides/quality";
import {
  BOMB_WEIGHT_V3,
  LINE_MULT,
  PAYLINES,
  REELS,
  ROWS,
  SYMBOLS,
  WEIGHT_SCALE_V3,
  WEIGHT_TOTAL,
  WEIGHT_TOTAL_V3,
} from "../src/lib/slott/paytable";

const OUT = "seo-spam-audit";
const SITE = "https://pvpspinarena.com";

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(name: string, headers: string[], rows: unknown[][]) {
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  writeFileSync(join(OUT, name), lines.join("\n") + "\n", "utf8");
}

function h32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function normalizePara(p: string): string {
  return p
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function isOwnTopic(g: Guide): boolean {
  const s = `${g.slug} ${g.keyword} ${g.h1}`.toLowerCase();
  return /coinflip|coin-flip|jackpot|roulette|slott|provably|house-edge|house edge|pvp-|peer-to-peer|hmac|server-seed|commit-reveal|fairness|seed-rotation|nonce/.test(
    s,
  );
}

const PLUG =
  /pvpspinarena|p2p slott|33-slot|33 slots|16 purple|32\/33|\/fairness|\/coinflip|\/roulette|\/slott/i;

function isPlugParagraph(p: string, own: boolean): boolean {
  if (own) return false;
  const plain = normalizePara(p);
  if (plain.length > 900) return false;
  return PLUG.test(plain);
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9$%/\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function shinglesFromWords(words: string[]): Set<number> {
  const set = new Set<number>();
  for (let i = 0; i + 4 < words.length; i++) set.add(h32(words.slice(i, i + 5).join(" ")));
  return set;
}

function shingles(text: string): Set<number> {
  return shinglesFromWords(tokens(text));
}

const GENERIC_ENTITY = new Set([
  "casino", "betting", "guide", "online", "play", "game", "games", "slot", "slots", "rules",
  "review", "crypto", "poker", "odds", "explained", "strategy", "system", "bonus", "machine",
  "real", "money", "best", "free", "live", "versus", "legal", "gambling", "with", "from",
  "your", "that", "this", "what", "when", "where", "which", "into", "about", "than",
]);

function entityTokensOf(g: Guide): Set<string> {
  return new Set(
    tokens(g.slug.replace(/-/g, " ")).filter((t) => t.length > 3 && !GENERIC_ENTITY.has(t)),
  );
}

function entityWords(text: string, entity: Set<string>): string[] {
  return tokens(text).map((w) => (entity.has(w) ? "entity" : w));
}

function jaccard(a: Set<number>, b: Set<number>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  let inter = 0;
  for (const x of small) if (big.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function keywordTokens(g: Guide): Set<string> {
  const stop = new Set([
    "a", "an", "the", "of", "to", "and", "or", "for", "in", "on", "how", "what", "is", "are",
    "with", "your", "you", "vs",
  ]);
  return new Set(tokens(`${g.keyword} ${g.slug.replace(/-/g, " ")}`).filter((t) => !stop.has(t) && t.length > 2));
}

function kwJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

type Intent =
  | "informational: how-to or rules"
  | "informational: odds and math"
  | "informational: legality"
  | "informational: game explainer"
  | "commercial investigation: review"
  | "commercial investigation: bonus or payments"
  | "informational: general";

function intentOf(g: Guide): Intent {
  const s = `${g.slug} ${g.keyword}`.toLowerCase();
  if (/-review\b|\breview\b|alternatives/.test(s)) return "commercial investigation: review";
  if (/legal|licence|license|w2g|tax|age/.test(s)) return "informational: legality";
  if (/bonus|wagering|free-spins|cashback|vip|promo/.test(s))
    return "commercial investigation: bonus or payments";
  if (/odds|rtp|volatility|house-edge|probability|variance|paytable|payout/.test(s))
    return "informational: odds and math";
  if (/how-to|rules|explained|what-is|guide/.test(s)) return "informational: how-to or rules";
  if (g.cluster === "Slots" || /-slot\b/.test(s)) return "informational: game explainer";
  return "informational: general";
}

function internalLinks(text: string): string[] {
  return [...text.matchAll(/\]\((\/[^)\s]+)\)/g)].map((m) => m[1]!.split("?")[0]!);
}

function externalLinks(g: Guide): string[] {
  return g.sources.map((s) => s.url);
}

function hasTable(text: string): boolean {
  return /\n\|.+\|\n\|[\s:|-]+\|/.test(`\n${text}`);
}

function bulletCount(text: string): number {
  return (text.match(/^\s*-\s+/gm) ?? []).length;
}

function hasWorkedNumbers(text: string): boolean {
  return /\$\d|\b\d+(?:\.\d+)?%|\b\d+\s*spins?\b|\bexample\b|\bworked\b/i.test(text);
}

function profitClaim(text: string): boolean {
  // Affirmative outcome promises only. Negated warnings ("you cannot lose the rent") are not claims.
  return /(?<!not )(?<!no )(?<!never )guaranteed (profit|wins)|(?<!not a )risk-free profit|(?<!not a )sure win|you will (always )?win|beat the house every time/i.test(
    text,
  );
}

const DISCLAIMER =
  /does not offer|does not sell|does not operate|is not legal advice|is not a pick|settled in us dollars|not a promo code|cannot license you|will not book/i;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

mkdirSync(OUT, { recursive: true });

const publishedSlugs = new Set(GUIDES.map((g) => g.slug));
const files = readdirSync("src/content/guides").filter((f) => f.endsWith(".ts") && f !== "index.ts" && f !== "types.ts");
const unpublished = files
  .map((f) => f.replace(/\.ts$/, ""))
  .filter((slug) => !publishedSlugs.has(slug));

type Prepared = {
  g: Guide;
  own: boolean;
  intent: Intent;
  words: number;
  raw: string;
  substantive: string;
  plugWords: number;
  bodyWords: number;
  plugShare: number;
  disclaimerShare: number;
  repeatedParaShare: number;
  shingles: Set<number>;
  entityShingles: Set<number>;
  kw: Set<string>;
  table: boolean;
  bullets: number;
  worked: boolean;
  profit: boolean;
  internal: string[];
  external: string[];
};

const paraFreq = new Map<string, number>();
const rawParas: string[][] = [];

for (const g of GUIDES) {
  const paras = g.sections.flatMap((s) => paragraphs(s.body));
  rawParas.push(paras);
  const seen = new Set<string>();
  for (const p of paras) {
    const n = normalizePara(p);
    if (n.length < 120) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    paraFreq.set(n, (paraFreq.get(n) ?? 0) + 1);
  }
}

const repeated = new Set<string>();
for (const [p, n] of paraFreq) if (n >= 8) repeated.add(p);

const prepared: Prepared[] = GUIDES.map((g, i) => {
  const own = isOwnTopic(g) || g.cluster === "Provably fair";
  const paras = rawParas[i]!;
  let plugWords = 0;
  let disclaimerWords = 0;
  let repeatedWords = 0;
  let bodyWords = 0;
  const kept: string[] = [];
  for (const p of paras) {
    const n = normalizePara(p);
    const wc = tokens(n).length;
    bodyWords += wc;
    const isRepeated = n.length >= 120 && repeated.has(n);
    const plug = isPlugParagraph(p, own);
    const disclaimer = DISCLAIMER.test(n);
    if (isRepeated) repeatedWords += wc;
    if (plug) plugWords += wc;
    if (disclaimer) disclaimerWords += wc;
    if (!isRepeated && !plug && !disclaimer) kept.push(p);
  }
  const substantive = [g.answer, ...g.facts, ...kept, ...g.faqs.flatMap((f) => [f.q, f.a])].join("\n\n");
  const entity = entityTokensOf(g);
  const raw = [g.h1, g.answer, ...g.facts, ...g.sections.flatMap((s) => [s.title, s.body]), ...g.faqs.flatMap((f) => [f.q, f.a])].join("\n\n");
  return {
    g,
    own,
    intent: intentOf(g),
    words: wordCount(g),
    raw,
    substantive,
    plugWords,
    bodyWords,
    plugShare: bodyWords === 0 ? 0 : plugWords / bodyWords,
    disclaimerShare: bodyWords === 0 ? 0 : disclaimerWords / bodyWords,
    repeatedParaShare: bodyWords === 0 ? 0 : repeatedWords / bodyWords,
    shingles: shingles(substantive),
    entityShingles: shinglesFromWords(entityWords(substantive, entity)),
    kw: keywordTokens(g),
    table: hasTable(raw),
    bullets: bulletCount(raw),
    worked: hasWorkedNumbers(raw),
    profit: profitClaim(raw),
    internal: internalLinks(raw),
    external: externalLinks(g),
  };
});

const byCluster = new Map<string, number[]>();
prepared.forEach((p, i) => {
  const list = byCluster.get(p.g.cluster) ?? [];
  list.push(i);
  byCluster.set(p.g.cluster, list);
});

const nearest = prepared.map(() => ({ j: 0, idx: -1, kw: 0, entityJ: 0, entityIdx: -1 }));
const edges: [number, number, number, number, number][] = [];

for (const idxs of byCluster.values()) {
  for (let a = 0; a < idxs.length; a++) {
    for (let b = a + 1; b < idxs.length; b++) {
      const i = idxs[a]!;
      const j = idxs[b]!;
      const sim = jaccard(prepared[i]!.shingles, prepared[j]!.shingles);
      const entitySim = jaccard(prepared[i]!.entityShingles, prepared[j]!.entityShingles);
      const kw = kwJaccard(prepared[i]!.kw, prepared[j]!.kw);
      if (sim >= 0.28 || entitySim >= 0.6 || kw >= 0.6) edges.push([i, j, sim, kw, entitySim]);
      if (sim > nearest[i]!.j) nearest[i] = { ...nearest[i]!, j: sim, idx: j, kw };
      if (sim > nearest[j]!.j) nearest[j] = { ...nearest[j]!, j: sim, idx: i, kw };
      if (entitySim > nearest[i]!.entityJ) nearest[i]!.entityJ = entitySim, nearest[i]!.entityIdx = j;
      if (entitySim > nearest[j]!.entityJ) nearest[j]!.entityJ = entitySim, nearest[j]!.entityIdx = i;
    }
  }
}

// Cross-cluster keyword cannibalization and high shingle overlap via MinHash LSH.
const K = 64;
const BANDS = 16;
const ROWS = 4;
const sigs = prepared.map((p) => {
  const sig = new Array<number>(K).fill(0xffffffff);
  for (const sh of p.shingles) {
    let x = sh;
    for (let i = 0; i < K; i++) {
      x = Math.imul(x ^ (0x9e3779b9 + i), 0x85ebca6b) >>> 0;
      if (x < sig[i]!) sig[i] = x;
    }
  }
  return sig;
});

const buckets = new Map<string, number[]>();
sigs.forEach((sig, idx) => {
  for (let b = 0; b < BANDS; b++) {
    const key = `${b}:${sig.slice(b * ROWS, b * ROWS + ROWS).join(".")}`;
    const list = buckets.get(key) ?? [];
    list.push(idx);
    buckets.set(key, list);
  }
});

const seenPair = new Set<string>();
for (const list of buckets.values()) {
  if (list.length < 2 || list.length > 40) continue;
  for (let a = 0; a < list.length; a++) {
    for (let b = a + 1; b < list.length; b++) {
      const i = list[a]!;
      const j = list[b]!;
      if (prepared[i]!.g.cluster === prepared[j]!.g.cluster) continue;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seenPair.has(key)) continue;
      seenPair.add(key);
      const sim = jaccard(prepared[i]!.shingles, prepared[j]!.shingles);
      if (sim < 0.28) continue;
      const kw = kwJaccard(prepared[i]!.kw, prepared[j]!.kw);
      edges.push([i, j, sim, kw, 0]);
      if (sim > nearest[i]!.j) nearest[i] = { ...nearest[i]!, j: sim, idx: j, kw };
      if (sim > nearest[j]!.j) nearest[j] = { ...nearest[j]!, j: sim, idx: i, kw };
    }
  }
}

// Keyword overlap inside cluster even when text similarity was already recorded.
for (const idxs of byCluster.values()) {
  for (let a = 0; a < idxs.length; a++) {
    for (let b = a + 1; b < idxs.length; b++) {
      const i = idxs[a]!;
      const j = idxs[b]!;
      const kw = kwJaccard(prepared[i]!.kw, prepared[j]!.kw);
      if (kw > nearest[i]!.kw) nearest[i]!.kw = kw;
      if (kw > nearest[j]!.kw) nearest[j]!.kw = kw;
    }
  }
}

class UF {
  parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]!]!;
      x = this.parent[x]!;
    }
    return x;
  }
  union(a: number, b: number) {
    const pa = this.find(a);
    const pb = this.find(b);
    if (pa !== pb) this.parent[pa] = pb;
  }
}

const dupUf = new UF(prepared.length);
const intentUf = new UF(prepared.length);
for (const [i, j, sim, kw, entitySim] of edges) {
  if (sim >= 0.38 || entitySim >= 0.72) dupUf.union(i, j);
  if (kw >= 0.62 && sim < 0.38 && entitySim < 0.72) intentUf.union(i, j);
}

function components(uf: UF, min: number) {
  const groups = new Map<number, number[]>();
  for (let i = 0; i < prepared.length; i++) {
    const root = uf.find(i);
    const list = groups.get(root) ?? [];
    list.push(i);
    groups.set(root, list);
  }
  return [...groups.values()].filter((g) => g.length >= min);
}

const dupGroups = components(dupUf, 2);
const intentGroups = components(intentUf, 2);

const clusterId = new Map<number, string>();
dupGroups.forEach((group, n) => {
  const id = `dup-${String(n + 1).padStart(3, "0")}`;
  for (const i of group) clusterId.set(i, id);
});
intentGroups.forEach((group, n) => {
  const id = `intent-${String(n + 1).padStart(3, "0")}`;
  for (const i of group) if (!clusterId.has(i)) clusterId.set(i, id);
});

const inlinkCount = new Map<string, number>();
for (const p of prepared) {
  for (const slug of p.g.related) inlinkCount.set(slug, (inlinkCount.get(slug) ?? 0) + 1);
  for (const href of p.internal) {
    const m = href.match(/^\/guides\/([^/]+)$/);
    if (m) inlinkCount.set(m[1]!, (inlinkCount.get(m[1]!) ?? 0) + 1);
  }
}

type Scored = Prepared & {
  nearestJ: number;
  nearestSlug: string;
  nearestKw: number;
  entityJ: number;
  entitySlug: string;
  cluster: string;
  scores: Record<string, number>;
  quality: number;
  action: string;
  enhancement: string;
  policy: string;
  priority: string;
  confidence: string;
  evidence: string;
  ymyl: string;
  technical: string;
  gameFit: string;
};

const WEIGHTS: Record<string, number> = {
  intent: 16,
  originality: 14,
  factual: 14,
  practical: 12,
  trust: 10,
  uniqueness: 14,
  editorial: 10,
  examples: 6,
  technical: 4,
};

function scoreGuide(p: Prepared, i: number): Scored {
  const near = nearest[i]!;
  const nearestSlug = near.idx >= 0 ? prepared[near.idx]!.g.slug : "";
  const entitySlug = near.entityIdx >= 0 ? prepared[near.entityIdx]!.g.slug : "";
  const sections = p.g.sections.length;
  const faqs = p.g.faqs.length;
  const sources = p.g.sources.length;

  let intent = 3;
  if (sections >= 6 && p.g.answer.length > 140 && faqs >= 3) intent = 5;
  else if (sections >= 5 && faqs >= 2) intent = 4;
  else if (sections < 4 || p.g.answer.length < 80) intent = 2;

  let originality = 4;
  if (near.j >= 0.45 || near.entityJ >= 0.8) originality = 2;
  else if (near.j >= 0.32 || near.entityJ >= 0.68 || p.disclaimerShare >= 0.18) originality = 3;
  else if (near.j < 0.15 && near.entityJ < 0.45 && p.disclaimerShare < 0.06) originality = 5;

  let factual = sources >= 3 ? 4 : sources >= 1 ? 3 : 2;
  if (sources >= 3 && /gov|statute|regulator|commission|wiki|official/i.test(p.external.join(" "))) factual = 5;
  if (p.profit) factual = Math.min(factual, 2);
  if (p.intent.startsWith("commercial") && sources < 2) factual = Math.min(factual, 3);

  let practical = 2;
  if (p.table && p.worked) practical = 5;
  else if (p.table || p.worked || p.bullets >= 8) practical = 4;
  else if (p.bullets >= 4) practical = 3;

  let trust = 3;
  if (sources >= 2) trust++;
  if (/responsible-gambling|afford to lose|18 or older|18\+/.test(p.raw)) trust++;
  if (p.profit) trust = 2;
  trust = clamp(trust, 0, 5);

  let uniqueness = 4;
  if (near.j >= 0.45 || near.entityJ >= 0.8) uniqueness = 1;
  else if (near.j >= 0.32 || near.entityJ >= 0.68) uniqueness = 2;
  else if (near.j >= 0.22 || near.entityJ >= 0.55) uniqueness = 3;
  else if (near.j < 0.12 && near.entityJ < 0.4) uniqueness = 5;

  const titleLen = p.g.title.length;
  const descLen = p.g.description.length;
  let editorial = 4;
  if (titleLen >= 40 && titleLen <= 59 && descLen >= 120 && descLen <= 159 && sections >= 5) editorial = 5;
  else if (titleLen < 30 || descLen < 90 || sections < 4) editorial = 3;
  const density = tokens(p.g.keyword).filter((t) => t.length > 3);
  const hay = tokens(p.raw);
  if (density.length) {
    const hits = density.reduce((n, t) => n + hay.filter((w) => w === t).length, 0);
    if (hits / Math.max(hay.length, 1) > 0.06) editorial = Math.min(editorial, 3);
  }

  let examples = p.worked ? 4 : 2;
  if (p.table && p.worked) examples = 5;
  if (!p.worked && (p.intent === "informational: odds and math" || p.g.cluster === "Slots")) examples = 2;

  const technical = /^\d{4}-\d{2}-\d{2}$/.test(p.g.updated) ? 5 : 3;

  const scores = { intent, originality, factual, practical, trust, uniqueness, editorial, examples, technical };
  const quality = Math.round(
    Object.entries(WEIGHTS).reduce((sum, [k, w]) => sum + (scores[k as keyof typeof scores] / 5) * w, 0),
  );

  const thirdPartyReview = p.intent === "commercial investigation: review";
  const legalThinSources = p.intent === "informational: legality" && sources < 2;
  const scaled = near.entityJ >= 0.72 || near.j >= 0.42;
  let policy = "none";
  if (scaled) policy = "human_review";
  else if (p.disclaimerShare >= 0.12 && !p.own) policy = "monitor";
  else if (near.j >= 0.3 || near.entityJ >= 0.6) policy = "monitor";

  let action = "Keep";
  if (policy === "human_review") action = "Policy investigation";
  else if (near.j >= 0.42 && near.kw >= 0.4) action = "Consolidate";
  else if (near.entityJ >= 0.68 && near.j >= 0.28) action = "Rewrite";
  else if (legalThinSources || (thirdPartyReview && sources < 1) || p.disclaimerShare >= 0.1 || near.j >= 0.28)
    action = "Improve";

  const enhancements: string[] = [];
  const gameFit = gameFitOf(p);
  if (!p.table && (p.intent === "informational: odds and math" || /vs|alternatives|compare|paytable|payment/.test(p.g.slug)))
    enhancements.push("Add original comparison table");
  if (
    p.bullets < 6 &&
    (p.intent === "informational: legality" ||
      p.intent === "commercial investigation: bonus or payments" ||
      /checklist|security|withdrawal|wagering|responsible/.test(p.g.slug))
  )
    enhancements.push("Add checklist");
  if (!p.worked && (p.intent === "informational: odds and math" || p.intent === "informational: how-to or rules"))
    enhancements.push("Add practical example");
  if (gameFit === "direct" || gameFit === "illustration") enhancements.push("Add verified real game data");
  if (enhancements.length === 0) enhancements.push("No additional element needed");

  let priority = "P4";
  if (action === "Policy investigation") priority = "P1";
  else if (action === "Consolidate" || action === "Rewrite" || legalThinSources) priority = "P2";
  else if (action === "Improve") priority = "P3";

  const confidence = scaled || near.j >= 0.35 ? "high" : "medium";

  const evidence = [
    `substantive 5-gram Jaccard to /guides/${nearestSlug || "none"} = ${near.j.toFixed(3)}`,
    `entity-normalized Jaccard to /guides/${entitySlug || "none"} = ${near.entityJ.toFixed(3)}`,
    `keyword overlap ${near.kw.toFixed(2)}`,
    `house-plug paragraph share ${p.plugShare.toFixed(3)}`,
    `off-topic disclaimer share ${p.disclaimerShare.toFixed(3)}`,
    `repeated-paragraph share ${p.repeatedParaShare.toFixed(3)}`,
    `${p.words} words, ${sections} sections, ${faqs} FAQs, ${sources} sources`,
    p.table ? "has a pipe table" : "no pipe table",
    p.worked ? "contains a numeric or worked example" : "no worked numeric example detected",
    p.profit ? "affirmative profit-promise phrasing matched" : "no affirmative profit-promise phrasing matched",
  ].join("; ");

  const ymyl = [
    "No named author; Article schema uses the organization, matching /editorial.",
    p.intent === "informational: legality" ? "Jurisdiction page: statutes can change; sources required before relying on it." : "",
    thirdPartyReview ? "Third-party review: bonuses, licences, and RTP are not in the site game database." : "",
    p.profit ? "Possible misleading outcome language." : "",
  ]
    .filter(Boolean)
    .join(" ");

  const technicalNotes = [
    "Indexable guide route sets a self canonical and is listed in sitemap.xml.",
    "HTTP status was not crawled in this audit.",
    (inlinkCount.get(p.g.slug) ?? 0) <= 1 ? "Few internal links point at this slug." : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    ...p,
    nearestJ: near.j,
    nearestSlug,
    nearestKw: near.kw,
    entityJ: near.entityJ,
    entitySlug,
    cluster: clusterId.get(i) ?? "",
    scores,
    quality,
    action,
    enhancement: enhancements.join(" | "),
    policy,
    priority,
    confidence,
    evidence,
    ymyl,
    technical: technicalNotes,
    gameFit,
  };
}

function gameFitOf(p: Prepared): "direct" | "illustration" | "none" {
  if (p.own || p.g.cluster === "Provably fair" || p.g.cluster === "Games & odds") return p.own ? "direct" : "illustration";
  if (/payline|volatility|rtp|house-edge|provably|fairness|bankroll|variance/.test(p.g.slug)) return "illustration";
  if (p.g.cluster === "Poker" && /holdem|rake|blind|position|pot-odds|hand-ranking/.test(p.g.slug)) return "illustration";
  return "none";
}

const FINGERPRINTS: { id: string; phrase: string }[] = [
  { id: "keyword-skeleton", phrase: "keep that definition in the first line of your note" },
  { id: "shared-disclaimer", phrase: "a guide is not a licence" },
];

const scored = prepared.map(scoreGuide);
const families = new Map<number, string[]>();
scored.forEach((p, i) => {
  const hay = p.raw.toLowerCase();
  const hits = FINGERPRINTS.filter((f) => hay.includes(f.phrase)).map((f) => f.id);
  const feeHits = hay.split("prefer a small test withdrawal on a quiet day").length - 1;
  if (feeHits > 1) hits.push("repeated-fee-block");
  if (hits.length) families.set(i, hits);
  if (hits.includes("keyword-skeleton")) {
    p.policy = "human_review";
    p.action = "Policy investigation";
    p.priority = "P1";
    p.confidence = "high";
    p.evidence += "; exact skeleton sentence: Keep that definition in the first line of your note";
  } else if (hits.includes("shared-disclaimer") && p.policy === "none") {
    p.policy = "monitor";
    if (p.action === "Keep") p.action = "Improve";
    if (p.priority === "P4") p.priority = "P3";
    p.evidence += "; shared disclaimer sentence: a guide is not a licence";
  }
  if (hits.includes("repeated-fee-block")) {
    p.evidence += "; fee paragraph repeated inside the guide";
    if (p.action === "Keep") {
      p.action = "Improve";
      p.priority = "P3";
    }
  }
  const critical = criticalQualityFailures(p.raw);
  if (critical.length > 0) {
    p.policy = "human_review";
    p.action = "Policy investigation";
    p.priority = "P1";
    p.quality = Math.min(p.quality, QUALITY_SCORE_CAP_WHEN_CRITICAL);
    p.confidence = "high";
    p.evidence += `; critical quality failure (score capped at ${QUALITY_SCORE_CAP_WHEN_CRITICAL}): ${critical.join(" | ")}`;
  }
});

const topics = publishedTopics();
const topicSlugs = new Set(topics.map((t) => t.slug));

const inventoryHeaders = [
  "url",
  "canonical_url",
  "title",
  "h1",
  "meta_description",
  "content_type",
  "template",
  "cluster",
  "keyword",
  "secondary_keywords",
  "search_intent",
  "word_count",
  "updated",
  "author",
  "reviewer",
  "related_slugs",
  "internal_outlinks",
  "external_sources",
  "affiliate_links",
  "cta",
  "indexable",
  "http_status",
  "in_sitemap",
  "similarity_cluster",
    "max_substantive_jaccard",
    "nearest_slug",
    "entity_normalized_jaccard",
    "entity_nearest_slug",
  "keyword_overlap",
  "boilerplate_paragraph_share",
  "house_plug_share",
  "has_table",
  "bullet_items",
  "has_worked_example",
  "source_count",
  "faq_count",
  "section_count",
  "pillar",
  "widget",
  "game_data_fit",
  "ymyl_notes",
  "technical_notes",
  "recommended_action",
  "enhancement",
  "policy_risk",
  "evidence",
  "confidence",
  "priority",
  "score_intent",
  "score_originality",
  "score_factual",
  "score_practical",
  "score_trust",
  "score_uniqueness",
  "score_editorial",
  "score_examples",
  "score_technical",
  "quality_score",
];

writeCsv(
  "inventory.csv",
  inventoryHeaders,
  scored.map((p) => [
    `${SITE}/guides/${p.g.slug}`,
    `${SITE}/guides/${p.g.slug}`,
    p.g.title,
    p.g.h1,
    p.g.description,
    "guide",
    "guides.$slug GuideArticle",
    p.g.cluster,
    p.g.keyword,
    p.g.secondary.join(" | "),
    p.intent,
    p.words,
    p.g.updated,
    "PVPspinArena (organization; no named author)",
    "not claimed",
    p.g.related.join(" | "),
    String(p.internal.length),
    p.external.join(" | "),
    "none detected in guide body",
    p.g.cta ? `${p.g.cta.primary.to} ${p.g.cta.primary.label}` : "default live-round CTA",
    "yes",
    "not crawled",
    "yes",
    p.cluster,
    p.nearestJ.toFixed(3),
    p.nearestSlug,
    p.entityJ.toFixed(3),
    p.entitySlug,
    p.nearestKw.toFixed(2),
    p.repeatedParaShare.toFixed(3),
    p.plugShare.toFixed(3),
    p.table ? "yes" : "no",
    p.bullets,
    p.worked ? "yes" : "no",
    p.g.sources.length,
    p.g.faqs.length,
    p.g.sections.length,
    p.g.pillar ? "yes" : "no",
    p.g.widget ?? "",
    p.gameFit,
    p.ymyl,
    p.technical,
    p.action,
    p.enhancement,
    p.policy,
    p.evidence,
    p.confidence,
    p.priority,
    p.scores.intent,
    p.scores.originality,
    p.scores.factual,
    p.scores.practical,
    p.scores.trust,
    p.scores.uniqueness,
    p.scores.editorial,
    p.scores.examples,
    p.scores.technical,
    p.quality,
  ]),
);

writeCsv(
  "page-level-findings.csv",
  [
    "url",
    "cluster",
    "similarity_cluster",
    "quality_score",
    "recommended_action",
    "policy_risk",
    "priority",
    "enhancement",
    "nearest_url",
    "max_substantive_jaccard",
    "entity_normalized_jaccard",
    "house_plug_share",
    "source_count",
    "game_data_fit",
    "evidence",
    "confidence",
    "ymyl_notes",
  ],
  scored.map((p) => [
    `${SITE}/guides/${p.g.slug}`,
    p.g.cluster,
    p.cluster,
    p.quality,
    p.action,
    p.policy,
    p.priority,
    p.enhancement,
    p.nearestSlug ? `${SITE}/guides/${p.nearestSlug}` : "",
    p.nearestJ.toFixed(3),
    p.entityJ.toFixed(3),
    p.plugShare.toFixed(3),
    p.g.sources.length,
    p.gameFit,
    p.evidence,
    p.confidence,
    p.ymyl,
  ]),
);

function groupStats(group: number[]) {
  let max = 0;
  let sum = 0;
  let n = 0;
  for (let a = 0; a < group.length; a++) {
    for (let b = a + 1; b < group.length; b++) {
      const sim = jaccard(prepared[group[a]!]!.shingles, prepared[group[b]!]!.shingles);
      max = Math.max(max, sim);
      sum += sim;
      n++;
    }
  }
  return { max, median: n ? sum / n : 0 };
}

const dupRows: unknown[][] = [];
dupGroups.forEach((group, n) => {
  const stats = groupStats(group);
  const urls = group.slice(0, 8).map((i) => `${SITE}/guides/${prepared[i]!.g.slug}`);
  dupRows.push([
    `dup-${String(n + 1).padStart(3, "0")}`,
    "near-duplicate substantive text",
    group.length,
    prepared[group[0]!]!.g.cluster,
    urls.join(" | "),
    stats.median.toFixed(3),
    stats.max.toFixed(3),
    "5-gram Jaccard after removing repeated paragraphs and off-topic house-game closers",
    "Pages still share a large fraction of wording after template removal",
    "Readers looking for a specific entity may land on a page that repeats a sibling guide",
    stats.max >= 0.55 ? "Consolidate after a human read of the pair" : "Differentiate the overlapping sections; do not merge on the score alone",
    "medium",
  ]);
});
intentGroups.forEach((group, n) => {
  const urls = group.slice(0, 8).map((i) => `${SITE}/guides/${prepared[i]!.g.slug}`);
  const kws = group.slice(0, 6).map((i) => prepared[i]!.g.keyword);
  dupRows.push([
    `intent-${String(n + 1).padStart(3, "0")}`,
    "overlapping search intent",
    group.length,
    prepared[group[0]!]!.g.cluster,
    urls.join(" | "),
    "",
    "",
    `Keyword-token overlap >= 0.62 with substantive Jaccard < 0.38. Keywords: ${kws.join(" || ")}`,
    "Wording differs, but the target queries are close enough to cannibalize",
    "Two URLs can compete for the same question",
    "Pick a primary URL, retarget the sibling, and link them with distinct intents",
    "medium",
  ]);
});

writeCsv(
  "duplicate-clusters.csv",
  [
    "cluster_id",
    "cluster_type",
    "size",
    "topic_cluster",
    "representative_urls",
    "mean_pairwise_jaccard",
    "max_pairwise_jaccard",
    "similarity_evidence",
    "substantive_differences",
    "user_impact",
    "recommended_remediation",
    "confidence",
  ],
  dupRows,
);

const oppRows: unknown[][] = [];
for (const p of scored) {
  const url = `${SITE}/guides/${p.g.slug}`;
  if (p.enhancement.includes("Add original comparison table")) {
    oppRows.push([
      url,
      "comparison_table",
      p.g.cluster,
      p.intent,
      p.own
        ? "Compare the five live games on entry, draw, fee, and what fairness does not change"
        : "Restructure the comparison already implied by the headings. Leave unknown cells blank.",
      p.own ? "GAME_FACT_PAGES in src/lib/seo/game-facts.ts" : "No internal dataset. Cite the guide's existing sources or mark unverified.",
      p.own ? "none for the published rules" : "Third-party RTP, volatility, and bonus terms are not in the repo",
      "A table lets the reader compare one decision at a time instead of rereading prose",
      p.priority,
      "medium",
    ]);
  }
  if (p.enhancement.includes("Add checklist")) {
    oppRows.push([
      url,
      "checklist",
      p.g.cluster,
      p.intent,
      p.intent === "informational: legality"
        ? "Checks: age, state or country statute, operator licence, payment rail, and a responsible-gambling stop"
        : "Checks the reader can perform before depositing, opting into a bonus, or trusting a payout quote",
      "/editorial, /responsible-gambling, /terms, and the guide's cited sources",
      "Current statute text and operator terms were not fetched live",
      "Turns a legal or commercial explainer into a verification list",
      p.priority,
      "medium",
    ]);
  }
  if (p.enhancement.includes("Add practical example")) {
    oppRows.push([
      url,
      "practical_example",
      p.g.cluster,
      p.intent,
      "One hypothetical with the stake, the rule, and the result labeled as hypothetical",
      p.own ? "src/lib/seo/game-facts.ts and src/lib/slott/paytable.ts where the example is our game" : "The guide's own definitions. Do not invent a session result.",
      "No player-level outcome logs are in the repo",
      "Shows the rule operating on a number the reader can recompute",
      p.priority,
      "medium",
    ]);
  }
  if (p.gameFit !== "none") {
    oppRows.push([
      url,
      "verified_game_data",
      p.g.cluster,
      p.intent,
      p.gameFit === "direct"
        ? "Use the published fee, draw, and payout rules for the game the page is about"
        : "Use one live game as a labeled illustration of the mechanic, not as a claim about an unrelated title",
      "src/lib/seo/game-facts.ts; src/lib/slott/paytable.ts; src/routes/terms.tsx",
      "P2P Slott has no RTP field. Third-party studio games have no rows in this repo.",
      "Replaces generic casino language with rules a reader can check on /fairness or the paytable source",
      p.gameFit === "direct" ? "P2" : "P3",
      "high",
    ]);
  }
}

writeCsv(
  "original-content-opportunities.csv",
  [
    "url",
    "opportunity_type",
    "topic_cluster",
    "search_intent",
    "proposed_content",
    "data_sources",
    "missing_or_uncertain",
    "why_it_helps",
    "priority",
    "confidence",
  ],
  oppRows,
);

const gameRows: unknown[][] = [
  [
    "jackpot",
    "Jackpot",
    "PVPspinArena",
    "pvp pot",
    "",
    "",
    "shared pot; chance = stake share",
    "not published as a stake limit in game-facts",
    "not published as a stake limit in game-facts",
    "5% of pot kept on settlement; winner receives 95%",
    "no",
    "no",
    "one ticket per cent",
    "SHA-256 commit then reveal; Fairness recomputes the draw",
    "src/lib/seo/game-facts.ts jackpot",
    "verified_against_published_rules",
    "not a dated lab test",
    "Cancelled rounds refund stakes without the fee",
  ],
  [
    "coinflip",
    "Coinflip",
    "PVPspinArena",
    "pvp",
    "",
    "",
    "two players, equal stake, opposite sides",
    "not in game-facts",
    "not in game-facts",
    "5% of combined pot; winner receives 95%",
    "no",
    "no",
    "50% each side from one HMAC-SHA256 bit",
    "seed hash published before the flip",
    "src/lib/seo/game-facts.ts coinflip",
    "verified_against_published_rules",
    "not a dated lab test",
    "Animation does not decide the result",
  ],
  [
    "roulette",
    "Roulette",
    "PVPspinArena",
    "house wheel",
    "about 92.12% Purple or Silver after 5% win fee; about 40.30% Green after fee",
    "Purple and Silver hit often (16/33); Green hits 1/33",
    "33 slots: 16 Purple, 16 Silver, 1 Green. Pays 2x, 2x, 14x",
    "not in game-facts",
    "not in game-facts",
    "5% taken from each winning payout only",
    "no",
    "Green pays 14x",
    "Before fee: Purple or Silver 32/33, Green 14/33",
    "seed hash before the spin",
    "src/lib/seo/game-facts.ts roulette; src/routes/terms.tsx",
    "calculated_from_published_wheel_and_fee",
    "not a dated lab test",
    "House-banked. Other players' bets do not change your payout. Do not describe 92.12% as a session result.",
  ],
  [
    "slott",
    "P2P Slott",
    "PVPspinArena",
    "pvp slots",
    "no RTP field in paytable",
    "score duel, not a published volatility band",
    `${REELS} reels x ${ROWS} rows, ${PAYLINES.length} paylines`,
    "equal stake; limits not in paytable.ts",
    "equal stake; limits not in paytable.ts",
    "10% of the players' pot when a player wins; draw refunds both stakes with no fee",
    "no free-spin feature in paytable",
    `line multipliers 3=${LINE_MULT[3]}, 4=${LINE_MULT[4]}, 5=${LINE_MULT[5]}`,
    `${SYMBOLS.length} paying symbols plus bomb id 20`,
    "seed committed when the match is created",
    "src/lib/seo/game-facts.ts slott; src/lib/slott/paytable.ts",
    "verified_in_source",
    "paytable v1 weights; bomb rate documented on v3",
    `v3 bomb: ${BOMB_WEIGHT_V3} of ${WEIGHT_TOTAL_V3} rolls. Comment in paytable.ts says a 240-cell match is about 6.0% house-win via bomb. WEIGHT_TOTAL v1 is ${WEIGHT_TOTAL}, scale ${WEIGHT_SCALE_V3}.`,
  ],
  [
    "poker",
    "Poker",
    "PVPspinArena",
    "peer poker",
    "",
    "",
    "six-max No-Limit Hold'em",
    "$0.02/$0.05 blinds",
    "$5/$10 blinds; buy-in 40 to 125 big blinds",
    "5% of pot only when a flop is dealt; no fee before the flop",
    "no",
    "no",
    "20 seconds to act",
    "player commits mixed with server seed; void if someone does not reveal",
    "src/lib/seo/game-facts.ts poker",
    "verified_against_published_rules",
    "not a dated lab test",
    "Uncalled chips return before the fee. Promo credit rules are in the same fact block.",
  ],
];

for (const s of SYMBOLS) {
  gameRows.push([
    `slott-symbol-${s.id}`,
    s.name,
    "PVPspinArena",
    "pvp slots symbol",
    "",
    s.rarity,
    "symbol on P2P Slott",
    "",
    "",
    "",
    "",
    "",
    `id ${s.id}; weight ${s.weight}; score value ${s.value}`,
    s.key,
    "src/lib/slott/paytable.ts SYMBOLS",
    "verified_in_source",
    "v1 weights",
    "Names in the paytable are the source of truth. Do not copy these values onto a third-party slot.",
  ]);
}

writeCsv(
  "game-data-inventory.csv",
  [
    "internal_id",
    "name",
    "provider",
    "category",
    "rtp",
    "volatility",
    "paylines_or_ways",
    "min_bet",
    "max_bet",
    "fee_or_bonus",
    "free_spins",
    "multipliers",
    "jackpot_or_other",
    "symbols_or_paytable",
    "source",
    "verification_status",
    "last_updated",
    "missing_or_caveat",
  ],
  gameRows,
);

const gameOpp: unknown[][] = [];
for (const p of scored) {
  if (p.gameFit === "none") continue;
  const url = `${SITE}/guides/${p.g.slug}`;
  const directGame = /slott/.test(p.g.slug)
    ? "P2P Slott"
    : /roulette/.test(p.g.slug)
      ? "Roulette"
      : /coin/.test(p.g.slug)
        ? "Coinflip"
        : /jackpot/.test(p.g.slug)
          ? "Jackpot"
          : /poker|holdem|rake/.test(p.g.slug)
            ? "Poker"
            : "all five live games";
  gameOpp.push([
    url,
    p.g.keyword,
    directGame,
    p.gameFit === "direct" ? "rules table or worked fee example" : "labeled illustration",
    p.gameFit === "direct"
      ? `State the published rule for ${directGame} in a table: entry, draw, fee, what a fairness check does not change.`
      : "One short example that names the live game and the source file, then returns to the page topic.",
    "fee, draw, payout, paylines where relevant",
    "src/lib/seo/game-facts.ts; src/lib/slott/paytable.ts; src/routes/terms.tsx",
    "verified_in_repo",
    "Reader can check the claim against the game page or Fairness",
    p.gameFit === "direct" ? "P2" : "P3",
    "high",
    "Stake limits and Slott RTP are absent. Do not fill them.",
    "Do not present a calculated return as a personal result. Do not attach our paytable to a studio game.",
  ]);
}

writeCsv(
  "game-data-opportunities.csv",
  [
    "guide_url",
    "guide_topic",
    "relevant_game",
    "enhancement_type",
    "proposed_content_or_table",
    "source_data_fields",
    "source_location",
    "verification_status",
    "expected_user_benefit",
    "priority",
    "confidence",
    "missing_information",
    "editorial_review_notes",
  ],
  gameOpp,
);

writeCsv(
  "template-families.csv",
  ["family_id", "url", "cluster", "automated_action", "policy_risk", "quality_score", "fingerprint"],
  [...families.entries()].flatMap(([i, ids]) =>
    ids.map((id) => [
      id,
      `${SITE}/guides/${scored[i]!.g.slug}`,
      scored[i]!.g.cluster,
      scored[i]!.action,
      scored[i]!.policy,
      scored[i]!.quality,
      FINGERPRINTS.find((f) => f.id === id)!.phrase,
    ]),
  ),
);

const plugRanked = [...scored].sort((a, b) => b.plugShare - a.plugShare).slice(0, 25);
const simRanked = [...scored].sort((a, b) => b.nearestJ - a.nearestJ).slice(0, 25);
const lowSourcesLegal = scored.filter((p) => p.intent === "informational: legality" && p.g.sources.length < 2);

const actionCounts: Record<string, number> = {};
const policyCounts: Record<string, number> = {};
const clusterCounts: Record<string, number> = {};
for (const p of scored) {
  actionCounts[p.action] = (actionCounts[p.action] ?? 0) + 1;
  policyCounts[p.policy] = (policyCounts[p.policy] ?? 0) + 1;
  clusterCounts[p.g.cluster] = (clusterCounts[p.g.cluster] ?? 0) + 1;
}

const summary = {
  guides_in_files: files.length,
  guides_published: GUIDES.length,
  unpublished_slugs: unpublished,
  topics_published: topics.map((t) => ({ slug: t.slug, name: t.name })),
  topic_slugs_published: [...topicSlugs],
  repeated_paragraphs_at_least_8: repeated.size,
  action_counts: actionCounts,
  policy_counts: policyCounts,
  cluster_counts: clusterCounts,
  duplicate_groups: dupGroups.length,
  intent_groups: intentGroups.length,
  quality_min: Math.min(...scored.map((p) => p.quality)),
  quality_max: Math.max(...scored.map((p) => p.quality)),
  quality_mean: Math.round(scored.reduce((s, p) => s + p.quality, 0) / scored.length),
  word_min: Math.min(...scored.map((p) => p.words)),
  word_max: Math.max(...scored.map((p) => p.words)),
  with_table: scored.filter((p) => p.table).length,
  with_worked: scored.filter((p) => p.worked).length,
  with_profit_phrase: scored.filter((p) => p.profit).length,
  zero_sources: scored.filter((p) => p.g.sources.length === 0).length,
  plug_share_over_0_12: scored.filter((p) => p.plugShare >= 0.12).length,
  jaccard_over_0_38: scored.filter((p) => p.nearestJ >= 0.38).length,
  jaccard_over_0_5: scored.filter((p) => p.nearestJ >= 0.5).length,
  entity_jaccard_over_0_72: scored.filter((p) => p.entityJ >= 0.72).length,
  disclaimer_over_0_12: scored.filter((p) => p.disclaimerShare >= 0.12).length,
  game_fit_direct: scored.filter((p) => p.gameFit === "direct").length,
  game_fit_illustration: scored.filter((p) => p.gameFit === "illustration").length,
  table_opps: oppRows.filter((r) => r[1] === "comparison_table").length,
  checklist_opps: oppRows.filter((r) => r[1] === "checklist").length,
  example_opps: oppRows.filter((r) => r[1] === "practical_example").length,
  game_data_opps: gameOpp.length,
  keyword_skeleton: scored.filter((_, i) => families.get(i)?.includes("keyword-skeleton")).length,
  shared_disclaimer: scored.filter((_, i) => families.get(i)?.includes("shared-disclaimer")).length,
  repeated_fee_block: scored.filter((_, i) => families.get(i)?.includes("repeated-fee-block")).length,
  low_source_legal: lowSourcesLegal.length,
  orphanish: scored.filter((p) => (inlinkCount.get(p.g.slug) ?? 0) <= 1).length,
  top_plug: plugRanked.map((p) => ({
    slug: p.g.slug,
    cluster: p.g.cluster,
    plug: Number(p.plugShare.toFixed(3)),
    j: Number(p.nearestJ.toFixed(3)),
    nearest: p.nearestSlug,
    sources: p.g.sources.length,
    action: p.action,
  })),
  top_similarity: simRanked.map((p) => ({
    slug: p.g.slug,
    cluster: p.g.cluster,
    j: Number(p.nearestJ.toFixed(3)),
    entityJ: Number(p.entityJ.toFixed(3)),
    entityNearest: p.entitySlug,
    nearest: p.nearestSlug,
    kw: Number(p.nearestKw.toFixed(2)),
    plug: Number(p.plugShare.toFixed(3)),
    disclaimer: Number(p.disclaimerShare.toFixed(3)),
    action: p.action,
  })),
  games_in_fact_pages: Object.keys(GAME_FACT_PAGES),
  weights: WEIGHTS,
};

writeFileSync(join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({
  published: summary.guides_published,
  unpublished: unpublished.length,
  actions: actionCounts,
  policy: policyCounts,
  dup: dupGroups.length,
  intent: intentGroups.length,
  quality_mean: summary.quality_mean,
  jaccard_over_0_38: summary.jaccard_over_0_38,
  entity_over_0_72: summary.entity_jaccard_over_0_72,
  disclaimer_over_0_12: summary.disclaimer_over_0_12,
  plug_over_0_12: summary.plug_share_over_0_12,
  tables: summary.table_opps,
  checks: summary.checklist_opps,
  examples: summary.example_opps,
  game_opps: summary.game_data_opps,
  zero_sources: summary.zero_sources,
}, null, 2));
