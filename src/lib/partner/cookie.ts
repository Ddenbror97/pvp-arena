const CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/;

/** First valid partner code wins until it expires. A later link must not replace it. */
export function partnerCookieToSet(
  existing: string | undefined,
  incoming: string,
): string | undefined {
  if (existing && CODE.test(existing)) return undefined;
  const next = incoming.toUpperCase();
  if (!CODE.test(next)) return undefined;
  return next;
}
