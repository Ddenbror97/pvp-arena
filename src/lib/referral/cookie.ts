const CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/;

/** First valid invite wins until it expires. A later link must not replace it. */
export function referralCookieToSet(
  existing: string | undefined,
  incoming: string,
): string | undefined {
  if (existing && CODE.test(existing)) return undefined;
  const next = incoming.toUpperCase();
  if (!CODE.test(next)) return undefined;
  return next;
}
