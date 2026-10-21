/**
 * Critical content-quality failures.
 * A long page, a high editorial score, or a passing meta-length check does not clear these.
 */

export const SKELETON_PHRASES = [
  "keep that definition in the first line of your note",
  "the price is a number you can point at today",
] as const;

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
