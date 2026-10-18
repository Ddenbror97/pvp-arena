/** Distinct documentation-range address so isolated promo tests do not share an IP. */
export function promoTestIp(userId: string): string {
  const hex = userId.replace(/-/g, "");
  return `2001:db8:${hex.slice(0, 4)}:${hex.slice(4, 8)}:${hex.slice(8, 12)}:${hex.slice(12, 16)}:${hex.slice(16, 20)}:${hex.slice(20, 24)}`;
}
