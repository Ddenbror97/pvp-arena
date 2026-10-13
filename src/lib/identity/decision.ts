export type IdentityStatus = "none" | "pending" | "approved" | "declined" | "in_review" | "expired";

const STORED = new Set(["pending", "approved", "declined", "in_review", "expired"]);

export function isStoredStatus(value: string): value is Exclude<IdentityStatus, "none"> {
  return STORED.has(value);
}

/** Maps a Didit session status. Unknown labels are ignored. */
export function mapDiditStatus(raw: string): Exclude<IdentityStatus, "none"> | null {
  switch (raw) {
    case "Approved":
      return "approved";
    case "Declined":
      return "declined";
    case "In Review":
      return "in_review";
    case "Expired":
    case "Kyc Expired":
    case "Abandoned":
      return "expired";
    case "Not Started":
    case "In Progress":
    case "Resubmitted":
    case "Awaiting User":
      return "pending";
    default:
      return null;
  }
}

/** An approved account stays approved. A newer session cannot overwrite another session's row. */
export function shouldApply(
  current: { status: IdentityStatus; sessionId: string | null },
  incoming: { sessionId: string },
): boolean {
  if (current.status === "approved") return false;
  return current.sessionId === incoming.sessionId;
}

function ageYears(isoDate: string, now: Date): number {
  const born = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  let years = now.getUTCFullYear() - born.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < born.getUTCMonth() ||
    (now.getUTCMonth() === born.getUTCMonth() && now.getUTCDate() < born.getUTCDate());
  if (beforeBirthday) years -= 1;
  return years;
}

/**
 * true when a document date of birth or age is 18 or over, false when it is under 18,
 * null when the decision does not include an age. The date itself is not returned.
 */
export function isAdult(decision: unknown, now = new Date()): boolean | null {
  const state = { seen: false, minor: false };
  walk(decision, now, state, 0);
  if (state.minor) return false;
  return state.seen ? true : null;
}

function walk(value: unknown, now: Date, state: { seen: boolean; minor: boolean }, depth: number) {
  if (depth > 5 || state.minor || !value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walk(item, now, state, depth + 1);
    return;
  }
  const rec = value as Record<string, unknown>;
  const age = rec["age"];
  if (typeof age === "number" && age >= 0 && age < 130) {
    state.seen = true;
    if (age < 18) state.minor = true;
  }
  for (const key of ["date_of_birth", "dateOfBirth", "birth_date", "dob"]) {
    const raw = rec[key];
    if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
      state.seen = true;
      if (ageYears(raw, now) < 18) state.minor = true;
    }
  }
  for (const key of [
    "id_verifications",
    "decision",
    "document",
    "extracted_data",
    "ocr",
    "features",
  ]) {
    if (key in rec) walk(rec[key], now, state, depth + 1);
  }
}
