// Run: bun scripts/check-guides.ts
import { GUIDES, wordCount } from "../src/content/guides";

const STATIC = new Set(["/", "/coinflip", "/roulette", "/fairness", "/about", "/how-it-works", "/terms", "/privacy", "/responsible-gambling", "/wallet", "/profile", "/guides"]);
const PLANNED = new Set([
  "what-is-a-crypto-casino", "provably-fair-casino", "pvp-gambling", "crypto-jackpot", "usdc-casino",
  "gambling-budget", "csgo-coinflip", "cs2-roulette", "hmac-sha256-provably-fair", "provably-fair-calculator",
  "csgo-jackpot", "metamask-casino", "how-to-buy-usdc", "add-base-network-metamask", "crypto-wallet-for-gambling",
  "server-seed-client-seed", "provably-fair-roulette", "coin-flip-odds", "crypto-casino-withdrawals", "csgo-gambling-history",
  "commit-reveal-scheme", "web3-casino", "usdc-vs-usdt-gambling", "house-edge", "are-online-casinos-rigged",
  "casino-terminology", "roulette-colors", "crypto-roulette", "rng-vs-provably-fair", "skin-gambling-vs-crypto",
  "martingale-strategy",
  "gamblers-fallacy", "csgo-case-opening", "how-to-stop-gambling", "crash-gambling", "cs2-betting",
  "how-to-win-at-roulette", "seed-phrase", "base-network", "gambling-self-exclusion",
]);

let fail = 0;
const err = (m: string) => { fail++; console.log("  FAIL " + m); };
const slugs = new Set<string>(), kws = new Set<string>();
for (const g of GUIDES) {
  const wc = wordCount(g);
  console.log(`${g.slug}: ${wc} words, title ${g.title.length}, desc ${g.description.length}`);
  if (wc < 1850 || wc > 2400) err(`word count ${wc}`);
  if (g.title.length < 40 || g.title.length > 59) err(`title length ${g.title.length}`);
  if (g.description.length < 120 || g.description.length > 159) err(`desc length ${g.description.length}`);
  if (slugs.has(g.slug)) err("duplicate slug"); slugs.add(g.slug);
  if (kws.has(g.keyword)) err("duplicate keyword"); kws.add(g.keyword);
  if (!PLANNED.has(g.slug)) err("slug not in plan");
  if (g.faqs.length < 4 || g.faqs.length > 6) err(`faqs ${g.faqs.length}`);
  const first100 = [g.h1, g.answer].join(" ").toLowerCase().split(/\s+/).slice(0, 100).join(" ");
  if (!first100.includes(g.keyword.toLowerCase())) err("keyword missing from first 100 words");
  const body = g.sections.map((s) => s.body).join("\n");
  const links = [...body.matchAll(/\]\((\/[^)]*)\)/g)].map((m) => m[1]);
  const guideLinks = links.filter((l) => l.startsWith("/guides/"));
  const siteLinks = links.filter((l) => !l.startsWith("/guides/"));
  for (const l of guideLinks) if (!PLANNED.has(l.slice(8))) err(`unknown guide link ${l}`);
  for (const l of siteLinks) if (!STATIC.has(l)) err(`unknown site link ${l}`);
  if (new Set(guideLinks).size < 3) err(`only ${new Set(guideLinks).size} guide links`);
  if (siteLinks.length < 1) err("no site links");
  for (const r of g.related) if (!PLANNED.has(r)) err(`unknown related ${r}`);
}
console.log(fail ? `\n${fail} problem(s)` : `\nAll ${GUIDES.length} guides pass.`);
process.exit(fail ? 1 : 0);
