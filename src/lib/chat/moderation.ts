/**
 * Deterministic chat moderation (layer 1). Pure and side-effect free so it can
 * run on the server and in tests. The browser never decides a verdict.
 */
import { CHAT_CONFIG } from "./config";

export type Severity = "LOW" | "MEDIUM" | "HIGH";
export interface Verdict {
  severity: Severity;
  score: number;
  categories: string[];
  /** Short internal reason code — never shown to users. */
  reason: string;
}
/** Future providers (e.g. an AI classifier) implement this; only rules ship now. */
export interface ModerationProvider {
  name: string;
  classify(text: string): Verdict | Promise<Verdict>;
}

// Control chars (except none — newlines are collapsed too), zero-width and bidi overrides.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/g;
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\u00AD]/g;

/** Safe normalisation that keeps accents, other scripts and emoji. */
export function normalizeMessage(raw: string): string {
  // Drop lone surrogates (invalid UTF-16 / not representable as UTF-8).
  const wf = raw.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    "",
  );
  return wf
    .normalize("NFC")
    .replace(INVISIBLE, "")
    .replace(CONTROL, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "!": "i",
  "|": "i",
  "3": "e",
  "4": "a",
  "@": "a",
  "5": "s",
  $: "s",
  "7": "t",
  "8": "b",
  "9": "g",
  "+": "t",
};

/** Aggressive comparison form used only for rule matching (never stored or shown). */
export function skeleton(text: string): string {
  const base = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[0-9!|@$+]/g, (c) => LEET[c] ?? c);
  return base.replace(/[^a-z]/g, "").replace(/(.)\1+/g, "$1");
}

/** Word-preserving form: lowercased, accents stripped, leet mapped, punctuation → space. */
function words(text: string): string {
  return ` ${text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[0-9!|@$+]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z\s]/g, " ")
    .replace(/(.)\1{2,}/g, "$1")
    .replace(/\s+/g, " ")
    .trim()} `;
}

// Deduplicated skeletons (letters only, runs collapsed). Kept deliberately to
// unambiguous terms so normal PT/EN gaming chat is not affected.
const HIGH_TERMS = (
  [
    // slurs / hate (EN + PT)
    "niger",
    "nigah",
    "faget",
    "retard",
    "tranie",
    "kike",
    "chink",
    "spic",
    "viado",
    // threats
    "ilkilyou",
    "iwilkilyou",
    "kilyourself",
    "kys",
    "voutematar",
    "vaisematar",
    "semata",
    // sexual
    "porn",
    "pedo",
    "rape",
    "estupro",
    "nudes",
    "putaria",
    // illegal activity
    "cocaine",
    "cocaina",
    "childporn",
  ] as string[]
).map((t) => skeleton(t));
const MEDIUM_TERMS = (
  [
    "fuck",
    "shit",
    "bitch",
    "cunt",
    "whore",
    "slut",
    "dick",
    "puta",
    "caralho",
    "porra",
    "buceta",
    "cuzao",
    "otario",
    "fdp",
    "vtnc",
    "vsf",
    "pqp",
  ] as string[]
).map((t) => skeleton(t));
/** Scam / phishing phrases (word form). */
const SCAM_PATTERNS = [
  /\bseed ?phrase\b/,
  /\bprivate ?key\b/,
  /\brecovery ?phrase\b/,
  /\bfrase (semente|de recuperacao)\b/,
  /\bchave privada\b/,
  /\bsend (me )?(eth|btc|usdt|usdc|crypto|bnb|sol)\b/,
  /\bmanda (pix|eth|btc|usdt)\b/,
  /\bdouble your\b/,
  /\bdobr(o|a) (seu|sua)\b/,
  /\bfree (eth|btc|usdt|crypto|airdrop)\b/,
  /\bclaim (your )?airdrop\b/,
  /\bairdrop\b/,
  /\bconnect (your )?wallet\b/,
  /\bconecte? (sua )?carteira\b/,
  /\bwallet ?connect\b/,
  /\bgiveaway\b/,
  /\bdm me\b/,
  /\bchama no (pv|privado|zap|whats)\b/,
  /\bsuporte oficial\b/,
  /\bofficial support\b/,
];
const URL_PATTERNS = [
  /https?:\/\//i,
  /\bwww\./i,
  /\b[a-z0-9-]+\.(com|net|org|io|xyz|gg|me|app|co|ru|cn|top|click|link|site|online|shop|live|bet|casino|finance|io)\b/i,
  /\bt\.me\b/i,
  /discord\.gg/i,
  /\bbit\.ly\b/i,
  /\b\d{1,3}(\.\d{1,3}){3}\b/,
  /\b(tele|telegram|discord)\s*[:@]/i,
];

const EMOJI = /\p{Extended_Pictographic}/gu;

export function classifyMessage(text: string): Verdict {
  const cats = new Set<string>();
  let score = 0;
  const add = (cat: string, w: number) => {
    cats.add(cat);
    score += w;
  };
  const sk = skeleton(text);
  const w = words(text);
  const toks = w.split(" ").filter(Boolean);
  // Re-join runs of single letters so "f u c k" is matched like "fuck".
  const joined: string[] = [];
  for (let i = 0; i < toks.length;) {
    if (toks[i]!.length === 1) {
      let j = i;
      let run = "";
      while (j < toks.length && toks[j]!.length === 1) run += toks[j++];
      joined.push(run);
      i = j;
    } else joined.push(toks[i++]!);
  }
  const wSkel = [...new Set([...toks, ...joined])].map(skeleton);

  // Whole-word hits, plus spaced-out obfuscation ("f u c k") via the full skeleton for longer terms.
  const hit = (term: string) => wSkel.includes(term) || (term.length >= 5 && sk.includes(term));
  if (HIGH_TERMS.some(hit)) add("abuse", 5);
  if (MEDIUM_TERMS.some(hit)) add("profanity", 2);
  if (SCAM_PATTERNS.some((r) => r.test(w))) add("scam", 5);
  if (URL_PATTERNS.some((r) => r.test(text))) add("link", 2);

  // Spam heuristics.
  if (/(.)\1{9,}/u.test(text)) add("repeat_chars", 2);
  const emoji = text.match(EMOJI)?.length ?? 0;
  if (emoji > 12) add("emoji_flood", 2);
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 12 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.85)
    add("caps", 1);
  const tokens = w
    .trim()
    .split(" ")
    .filter((t) => t.length > 1);
  if (tokens.length >= 6 && new Set(tokens).size / tokens.length < 0.3) add("repeat_words", 2);

  const { medium, high } = CHAT_CONFIG.thresholds;
  const severity: Severity = score >= high ? "HIGH" : score >= medium ? "MEDIUM" : "LOW";
  const categories = [...cats];
  return { severity, score, categories, reason: categories.join(",") || "ok" };
}

export const rulesProvider: ModerationProvider = { name: "rules", classify: classifyMessage };

export type Validation =
  { ok: true; text: string } | { ok: false; code: "CHAT_EMPTY" | "CHAT_TOO_LONG" };
export function validateMessage(raw: string): Validation {
  const text = normalizeMessage(raw);
  if (!text) return { ok: false, code: "CHAT_EMPTY" };
  if ([...text].length > CHAT_CONFIG.maxLength) return { ok: false, code: "CHAT_TOO_LONG" };
  return { ok: true, text };
}
