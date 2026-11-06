/**
 * Critical content-quality failures.
 * A long page, a high editorial score, or a passing meta-length check does not clear these.
 */

export const SKELETON_PHRASES = [
  "keep that definition in the first line of your note",
  "the price is a number you can point at today",
  "start every session by naming the outcome you actually want",
  "keep the statute column blank on purpose",
] as const;

/** Editorial review gate for substantial body padding shared across unrelated URLs.
 * Short navigation, legal notices and common definitions do not meet the word/share floors.
 * These are review thresholds, not Google ranking criteria or a page-length requirement.
 */
export function repeatedGuideBodyFailures(documents: readonly { slug: string; text: string }[]) {
  const normalize = (text: string) =>
    text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*#`]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
  const paragraphs = documents.map((d) =>
    d.text
      .split(/\n\s*\n/)
      .map(normalize)
      .filter(Boolean),
  );
  const frequency = new Map<string, number>();
  for (const list of paragraphs)
    for (const text of new Set(list.filter((p) => p.length >= 180)))
      frequency.set(text, (frequency.get(text) ?? 0) + 1);
  return documents.flatMap((document, i) => {
    const totalWords = words(normalize(document.text));
    const sharedWords = paragraphs[i]!.filter((p) => (frequency.get(p) ?? 0) >= 8).reduce(
      (sum, p) => sum + words(p),
      0,
    );
    return sharedWords >= 400 && sharedWords / Math.max(1, totalWords) >= 0.25
      ? [{ slug: document.slug, sharedWords, totalWords }]
      : [];
  });
}

/** The duplicated closer that was pasted two or three times inside the same guide. */
export const REPEATED_FEE_MARKER = "prefer a small test withdrawal on a quiet day";

/** When a critical failure is present, the audit score cannot sit in the "fine" band. */
export const QUALITY_SCORE_CAP_WHEN_CRITICAL = 49;

export function criticalQualityFailures(text: string): string[] {
  const hay = text.toLowerCase();
  const failures: string[] = [];
  for (const phrase of SKELETON_PHRASES) {
    if (hay.includes(phrase)) failures.push(`skeleton phrase present: "${phrase}"`);
  }
  const feeHits = hay.split(REPEATED_FEE_MARKER).length - 1;
  if (feeHits > 1) failures.push(`fee closer repeated ${feeHits} times in one guide`);

  const counts = new Map<string, number>();
  for (const paragraph of text.split(/\n\s*\n/)) {
    const normalized = paragraph.replace(/\s+/g, " ").trim().toLowerCase();
    if (normalized.length < 200) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  const repeated = [...counts.values()].filter((n) => n > 1).length;
  if (repeated > 0) {
    failures.push(`${repeated} paragraph(s) of 200 or more characters repeat inside the guide`);
  }
  return failures;
}
