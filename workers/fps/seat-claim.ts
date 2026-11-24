/**
 * Who may take a seat that another connection of the same account holds (owner, 2026-11-24:
 * "really big lagg in the battle royale … character is hacking while walking/in parachute";
 * then, with one tab open, "it says Battle Royale is open on this account in another tab …
 * im getting kicked out").
 *
 * The room used to give the seat to every new connection of the account. A client that
 * reconnects whenever it is replaced (any build before PR #343, a development page that never
 * reloads into a new build, a forgotten window) then took the seat back two or three seconds
 * after every join, for good: both pages drove the same body, the player's own movement was
 * rolled back again and again, and the newer page was thrown out.
 *
 * Now each page names itself (`page`, random per page load, kept across its reconnects):
 *  - no live connection of the account: the seat is taken;
 *  - the live one is the same page (a reconnect after a drop): it is replaced, as before;
 *  - another page holds it: refused (OCCUPIED_CLOSE), unless the page asks to take over
 *    (`takeover=1`: a page's first connection, so a new tab or a reload wins as before, and the
 *    player's "Play here"). The page that loses the seat stops reconnecting (PR #343). A
 *    client without a page name never takes a held seat, so an old client cannot throw a
 *    playing page out any more.
 */

/** A page refused because another page of the account plays the seat. */
export const OCCUPIED_CLOSE = 4002;

/** A page's name: letters, digits and dashes (a UUID), at most 64. */
export function pageName(raw: string | null): string | null {
  return raw && /^[A-Za-z0-9-]{8,64}$/.test(raw) ? raw : null;
}

export type SeatHolder = { page?: string | null | undefined; open: boolean };

/** "take" (nobody live holds it), "replace" (the holder goes), or "refuse". */
export function seatClaim(
  holders: readonly SeatHolder[],
  page: string | null,
  takeover: boolean,
): "take" | "replace" | "refuse" {
  const live = holders.filter((h) => h.open);
  if (!live.length) return holders.length ? "replace" : "take";
  if (takeover && page) return "replace";
  if (page && live.every((h) => h.page === page)) return "replace";
  return "refuse";
}
