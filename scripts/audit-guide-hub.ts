// Run: npm run audit:guides  (writes .wrangler/guide-audit/report.json and prints a summary)
//
// A read-only audit of the guide hub beyond check-guides' publishing gate:
//  - the hub: every published guide reachable from its topic (or the index), groups that name
//    unknown or other-cluster slugs, guides in two groups, clusters under MIN_TOPIC_GUIDES;
//  - links: every internal link in bodies, FAQs, CTAs, related lists, cluster copy and the
//    route files resolves to a live page without a redirect (MOVED slugs, sign-in-only pages,
//    trailing slashes, upper case, double slashes), and "#anchor" links name a real section;
//  - slugs: the URL form, the slug against its own keyword and title (a misspelt word the
//    guide's own copy spells differently);
//  - clusters: a guide whose slug or keyword plainly belongs to another cluster.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { GUIDES, getGuide } from "../src/content/guides";
import { CLUSTERS, CLUSTER_GROUPS, MIN_TOPIC_GUIDES } from "../src/content/guides/clusters";
import type { Guide, GuideCluster } from "../src/content/guides/types";
import { GONE_GUIDES, MOVED_GUIDES } from "../src/lib/guides/retired";
import { GUIDE_SITE_PATHS } from "../src/lib/guides/site-links";

type Issue = { kind: string; slug?: string; detail: string };
const issues: Issue[] = [];
const add = (kind: string, detail: string, slug?: string) => issues.push({ kind, slug, detail });

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const bySlug = new Map(GUIDES.map((g) => [g.slug, g]));
const published = new Set(
  CLUSTERS.filter((c) => GUIDES.filter((g) => g.cluster === c.name).length >= MIN_TOPIC_GUIDES).map(
    (c) => c.slug,
  ),
);

// ---------------------------------------------------------------- redirects and sign-in pages
const MOVED = new Map(
  Object.entries(MOVED_GUIDES).map(([from, to]) => [`/guides/${from}`, `/guides/${to}`]),
);
for (const [from, to] of MOVED) {
  if (bySlug.has(from.slice(8))) add("retired", `${from} is published and also redirected`);
  if (!bySlug.has(to.slice(8)))
    add("retired", `${from} redirects to ${to}, which is not published`);
}
for (const s of GONE_GUIDES)
  if (bySlug.has(s)) add("retired", `/guides/${s} is published and also 410`);
const AUTH_ONLY = new Set(
  readdirSync("src/routes/_authenticated")
    .filter((f) => f.endsWith(".tsx") && f !== "route.tsx")
    .map(
      (f) =>
        "/" +
        f
          .replace(/\.tsx$/, "")
          .replace(/_\./g, "/")
          .replace(/\./g, "/"),
    ),
);
// prestige.tsx redirects signed-out visitors to /auth itself.
AUTH_ONLY.add("/prestige");
const routes = readdirSync("src/routes").filter((f) => f.endsWith(".tsx"));
const STATIC_ROUTES = new Set(
  routes
    .filter((f) => !f.includes("$") && !f.startsWith("__") && !f.includes("[."))
    .map((f) => (f === "index.tsx" ? "/" : "/" + f.replace(/\.tsx$/, "").replace(/\./g, "/")))
    .map((p) => p.replace(/\/index$/, "")),
);
for (const p of GUIDE_SITE_PATHS) {
  if (!STATIC_ROUTES.has(p) && !AUTH_ONLY.has(p)) add("site-path", `${p}: no such route`);
}

/** A link's problem, or null when it lands on a live page in one hop. */
function checkLink(raw: string): string | null {
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return "protocol-relative";
  const [pathAndQuery, hash] = raw.split("#");
  const path = pathAndQuery!.split("?")[0]!;
  if (path !== "/" && path.endsWith("/")) return "trailing slash (redirect)";
  if (/[A-Z]/.test(path)) return "upper case";
  if (path.includes("//")) return "double slash";
  if (MOVED.has(path)) return `moved: 301 to ${MOVED.get(path)}`;
  if (path.startsWith("/guides/") && GONE_GUIDES.has(path.slice(8))) return "removed: 410";
  if (path.startsWith("/guides/topics/")) {
    const t = path.slice("/guides/topics/".length);
    return published.has(t) ? null : `topic ${t} not published (404)`;
  }
  if (path.startsWith("/guides/")) {
    const s = path.slice("/guides/".length);
    const g = bySlug.get(s);
    if (!g) return `guide ${s} not published (404)`;
    if (hash && !g.sections.some((sec) => sec.id === hash) && hash !== "faq")
      return `#${hash} is not a section of ${s}`;
    return null;
  }
  if (AUTH_ONLY.has(path)) return `sign-in only: redirects signed-out readers to /auth`;
  if (!STATIC_ROUTES.has(path) && !GUIDE_SITE_PATHS.includes(path as never))
    return `no static route ${path}`;
  return null;
}

const linksIn = (text: string) => [...text.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1]!);

// ---------------------------------------------------------------- per guide
const groupOfSlug = new Map<string, string[]>();
for (const [cluster, groups] of Object.entries(CLUSTER_GROUPS) as Array<
  [GuideCluster, { name: string; slugs: string[] }[]]
>)
  for (const grp of groups)
    for (const s of grp.slugs) {
      const list = groupOfSlug.get(s) ?? [];
      list.push(`${cluster} / ${grp.name}`);
      groupOfSlug.set(s, list);
      const g = bySlug.get(s);
      if (!g) add("group-unknown", `${cluster} / ${grp.name}: ${s} is not a published guide`, s);
      else if (g.cluster !== cluster)
        add(
          "group-cluster",
          `${s} (cluster ${g.cluster}) listed under ${cluster} / ${grp.name}`,
          s,
        );
    }
for (const [s, list] of groupOfSlug)
  if (list.length > 1) add("group-duplicate", `${s} in ${list.join(" and ")}`, s);

for (const c of CLUSTERS) {
  const n = GUIDES.filter((g) => g.cluster === c.name).length;
  if (n > 0 && n < MIN_TOPIC_GUIDES) add("topic-thin", `${c.name}: ${n} guide(s), no topic page`);
}

// Which links point where (for orphans: published guides nothing links to).
const inbound = new Map<string, number>();
for (const g of GUIDES) {
  if (!SLUG.test(g.slug)) add("slug-form", g.slug, g.slug);
  const texts: Array<[string, string]> = [
    ["answer", g.answer],
    ...g.facts.map((f, i) => [`fact ${i}`, f] as [string, string]),
    ...g.sections.map((s) => [`section ${s.id}`, s.body] as [string, string]),
    ...g.faqs.map((f, i) => [`faq ${i}`, `${f.q}\n${f.a}`] as [string, string]),
  ];
  for (const [where, text] of texts)
    for (const l of linksIn(text)) {
      const p = checkLink(l);
      if (p) add("link", `${where}: ${l}: ${p}`, g.slug);
      const s = l.split("#")[0]!.split("?")[0]!;
      if (s.startsWith("/guides/") && !s.startsWith("/guides/topics/")) {
        const t = s.slice(8);
        if (t !== g.slug) inbound.set(t, (inbound.get(t) ?? 0) + 1);
      }
    }
  for (const to of [g.cta?.primary.to, g.cta?.secondary.to].filter(Boolean) as string[]) {
    const p = checkLink(to);
    if (p) add("link", `cta: ${to}: ${p}`, g.slug);
  }
  for (const r of g.related) {
    if (!bySlug.has(r)) add("related", `${r} not published`, g.slug);
    else if (r === g.slug) add("related", `lists itself`, g.slug);
    else inbound.set(r, (inbound.get(r) ?? 0) + 1);
  }
  if (new Set(g.related).size !== g.related.length) add("related", "duplicates", g.slug);
  // Section ids unique (anchors).
  const ids = g.sections.map((s) => s.id);
  if (new Set(ids).size !== ids.length) add("section-id", "duplicate section ids", g.slug);
}
for (const g of GUIDES)
  if (!inbound.get(g.slug) && !groupOfSlug.has(g.slug))
    add("orphan", `no guide links to it and it is in no group (only the A–Z list)`, g.slug);

// Cluster copy and route files: hard-coded guide links.
const copy = [
  readFileSync("src/content/guides/clusters.ts", "utf8"),
  readFileSync("src/content/guides/fps-topics.ts", "utf8"),
  ...readdirSync("src/routes")
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => readFileSync(`src/routes/${f}`, "utf8")),
  ...readdirSync("src/components/guides").map((f) =>
    readFileSync(`src/components/guides/${f}`, "utf8"),
  ),
  readFileSync("src/lib/guides/promotions.ts", "utf8"),
  readFileSync("src/lib/game-snapshot/snapshot.ts", "utf8"),
].join("\n");
for (const m of copy.matchAll(
  /["'`(](\/guides\/[a-z0-9-]+(?:\/[a-z0-9-]+)?)(?:#[a-z0-9-]+)?["'`)]/g,
)) {
  const p = checkLink(m[1]!);
  if (p) add("code-link", `${m[1]}: ${p}`);
}
// Guide slugs named as strings in the game-data and promotion tables.
for (const m of readFileSync("src/lib/game-snapshot/snapshot.ts", "utf8").matchAll(
  /"([a-z0-9]+(?:-[a-z0-9]+)+)"/g,
))
  if (!bySlug.has(m[1]!) && /guide|odds|strategy|how|work|fair|seed|hash/.test(m[1]!))
    add("code-slug", `snapshot.ts names ${m[1]}, not a published guide`);

// ---------------------------------------------------------------- slug spelling
// A slug word the guide's own keyword, title and h1 spell otherwise (e.g. "berzek" where the
// title says "Berzerk") is a candidate typo. Words absent from the copy are listed separately.
const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "").replace(/&/g, " and ");
const lev = (a: string, b: string) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i]![j] = Math.min(
        d[i - 1]![j]! + 1,
        d[i]![j - 1]! + 1,
        d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return d[a.length]![b.length]!;
};
/** Slug words that need not appear in the copy (URL plumbing, or plurals of a copy word). */
const COMMON = new Set(["hub", "game", "games", "guide", "rules", "review"]);
const slugWords: Array<{ slug: string; word: string; near: string[] }> = [];
for (const g of GUIDES) {
  const copyWords = new Set(
    norm([g.keyword, g.title, g.h1, ...g.secondary].join(" "))
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
  const joined = [...copyWords].join("");
  for (const w of g.slug.split("-")) {
    if (copyWords.has(w) || /^\d+$/.test(w) || w.length <= 2) continue;
    if (joined.includes(w)) continue; // "ecogra" from "eCOGRA", "4life" from "Cash4Life"
    if (COMMON.has(w) || copyWords.has(w.replace(/s$/, "")) || copyWords.has(`${w}s`)) continue;
    const near = [...copyWords].filter((c) => c.length > 3 && lev(c, w) <= 2 && c !== w);
    slugWords.push({ slug: g.slug, word: w, near });
    if (near.length) add("slug-spelling", `"${w}" — the copy has ${near.join(", ")}`, g.slug);
  }
}

// ---------------------------------------------------------------- cluster fit (heuristic)
const RULES: Array<[RegExp, GuideCluster[]]> = [
  [/(^|-)slots?(-|$)|megaways/, ["Slots", "Casino games", "Games & odds", "Sweepstakes"]],
  [/(^|-)poker(-|$)|holdem|omaha|razz|badugi|wsop|-bet-poker|icm/, ["Poker", "Casino games"]],
  [/blackjack/, ["Blackjack", "Games & odds", "Casino games"]],
  [/lottery|lotto|powerball|mega-millions|scratch-off|cash4life/, ["Lottery", "Games of chance"]],
  [
    /horse|derby|preakness|belmont|trifecta|exacta|quinella|superfecta|pick-6|furlong/,
    ["Horse racing"],
  ],
  [/esports|valorant-bet|lol-bet|dota-bet/, ["Esports betting", "CS:GO heritage", "FPS & aim"]],
  [/sweepstakes|sweeps|chumba|stake-us|pulsz/, ["Sweepstakes"]],
  [/kalshi|polymarket|prizepicks|prediction-market|underdog-fantasy/, ["Prediction markets"]],
  [/provably|server-seed|client-seed|hmac|sha256|commit-reveal|nonce/, ["Provably fair"]],
  [
    /gamblers-anonymous|self-exclusion|stop-gambling|gambling-addiction|responsible-gambling/,
    ["Responsible play"],
  ],
  [
    /usdc|usdt|metamask|wallet|base-network|bridge|gas-fees|seed-phrase/,
    ["Crypto payments", "Foundations"],
  ],
  [
    /roulette|craps|baccarat|keno|sic-bo/,
    ["Casino games", "Games & odds", "CS:GO heritage", "Provably fair"],
  ],
];
/** Reviewed 2026-11-17: the slug names a game, but the page is about something else. */
const REVIEWED: Record<string, string> = {
  "esports-betting-legal": "a legality page, beside the other geography pages",
  "steam-wallet-to-cash": "a Steam balance, not a crypto wallet",
  "crypto-horse-racing-betting": "virtual (RNG) horse racing, a casino product",
  "twitch-slots-ban": "streaming policy",
  "skinner-box-slot-machines": "psychology",
  "mit-blackjack-team": "a famous team, history",
  "don-johnson-blackjack": "a famous gambler, history",
  "history-of-poker": "history",
  "casino-royale-poker": "a film's poker scenes",
  "lightning-roulette": "a live game show",
  "poker-dice": "a dice game",
  "horseshoe-luck": "a superstition",
  "horse-race-dice-game": "a dice game",
  "slot-machine-for-sale": "buying a cabinet, not playing",
  "horse-poker": "H.O.R.S.E., a mixed poker format",
};
for (const g of GUIDES)
  for (const [re, ok] of RULES)
    if (re.test(g.slug) && !ok.includes(g.cluster) && !REVIEWED[g.slug]) {
      add("cluster-fit", `${g.cluster}; slug matches ${re} (expected ${ok.join(" / ")})`, g.slug);
      break;
    }

// ---------------------------------------------------------------- report
const byKind = new Map<string, number>();
for (const i of issues) byKind.set(i.kind, (byKind.get(i.kind) ?? 0) + 1);
mkdirSync(".wrangler/guide-audit", { recursive: true });
writeFileSync(
  ".wrangler/guide-audit/report.json",
  JSON.stringify({ guides: GUIDES.length, topics: [...published], issues, slugWords }, null, 1),
);
console.log(
  `${GUIDES.length} guides, ${published.size} topic pages, ${MOVED.size} moved and ${GONE_GUIDES.size} removed slugs`,
);
for (const [k, n] of byKind) console.log(`  ${k}: ${n}`);
void getGuide;
