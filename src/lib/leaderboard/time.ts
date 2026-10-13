function zoneOffsetMs(timeZone: string, instant: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  let hour = read("hour");
  let day = read("day");
  if (hour === 24) {
    hour = 0;
    day += 1;
  }
  return (
    Date.UTC(read("year"), read("month") - 1, day, hour, read("minute"), read("second")) - instant
  );
}

/** Interpret a datetime-local value as a clock time in an IANA timezone. */
export function zonedLocalToUtc(local: string, timeZone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
  try {
    const corrected = desired - zoneOffsetMs(timeZone, desired - zoneOffsetMs(timeZone, desired));
    const date = new Date(corrected);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export const CAMPAIGN_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;
