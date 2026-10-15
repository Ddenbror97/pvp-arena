import { money, type Lobby, type LobbyTable, type LobbyType } from "./api";

/**
 * Presentation-only view of the lobby: filtering, sorting and the featured pick.
 * Nothing here is authoritative; seating always goes through `poker_sit`.
 */

export const CATEGORIES = ["Micro", "Low", "Mid", "High", "VIP"] as const;
export type Category = (typeof CATEGORIES)[number];

export type SortKey = "stakes-asc" | "stakes-desc" | "players" | "seats";
export const SORTS: { key: SortKey; label: string }[] = [
  { key: "stakes-asc", label: "Stakes (Low → High)" },
  { key: "stakes-desc", label: "Stakes (High → Low)" },
  { key: "players", label: "Most players" },
  { key: "seats", label: "Available seats" },
];

export type Availability = "all" | "open" | "running";

export interface LobbyFilters {
  category: Category | null;
  seats: number | null;
  availability: Availability;
  search: string;
  sort: SortKey;
}

export const DEFAULT_FILTERS: LobbyFilters = {
  category: null,
  seats: null,
  availability: "all",
  search: "",
  sort: "stakes-asc",
};

/** A quick seat at a stake level (fills a running table or opens one) or one running table. */
export type Listing =
  | { kind: "stake"; key: string; type: LobbyType }
  | { kind: "table"; key: string; type: LobbyType; table: LobbyTable };

export const blinds = (t: LobbyType) => `${money(t.small_blind)}/${money(t.big_blind)}`;
export const tableFull = (t: LobbyTable) => t.seated >= t.max_seats;

const seated = (l: Listing) => (l.kind === "table" ? l.table.seated : l.type.players);
const free = (l: Listing) =>
  l.kind === "table" ? Math.max(0, l.table.max_seats - l.table.seated) : l.type.max_seats;

function haystack(l: Listing) {
  const t = l.type;
  return [
    l.kind === "table" ? l.table.name : "quick seat",
    t.label,
    `${t.category} stakes`,
    blinds(t),
    `${money(t.small_blind)} ${money(t.big_blind)}`,
    `${t.max_seats}-max`,
    "texas hold'em no-limit holdem nlh",
  ]
    .join(" ")
    .toLowerCase();
}

export function listings(lobby: Lobby): Listing[] {
  const out: Listing[] = [];
  for (const type of lobby.types) {
    out.push({ kind: "stake", key: `s${type.id}`, type });
    for (const table of lobby.tables) {
      if (table.type_id === type.id && table.seated > 0) {
        out.push({ kind: "table", key: `t${table.id}`, type, table });
      }
    }
  }
  return out;
}

export function matches(l: Listing, f: LobbyFilters, words = false) {
  if (f.category && l.type.category !== f.category) return false;
  if (f.seats != null && l.type.max_seats !== f.seats) return false;
  if (f.availability === "running" && l.kind !== "table") return false;
  if (f.availability === "open" && l.kind === "table" && tableFull(l.table)) return false;
  const q = f.search.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return true;
  const text = haystack(l);
  return words ? q.split(" ").every((w) => text.includes(w)) : text.includes(q);
}

/** Whole-phrase search first ("micro 2"), falling back to all-words when nothing matches. */
function filterListings(all: Listing[], f: LobbyFilters) {
  const phrase = all.filter((l) => matches(l, f));
  return phrase.length || !f.search.trim() ? phrase : all.filter((l) => matches(l, f, true));
}

function compare(sort: SortKey) {
  return (a: Listing, b: Listing) => {
    const stakes = a.type.big_blind - b.type.big_blind || a.type.id - b.type.id;
    const kind = (a.kind === "stake" ? 0 : 1) - (b.kind === "stake" ? 0 : 1);
    switch (sort) {
      case "stakes-asc":
        return stakes || kind;
      case "stakes-desc":
        return -stakes || kind;
      case "players":
        return seated(b) - seated(a) || stakes || kind;
      case "seats":
        return free(b) - free(a) || stakes || kind;
    }
  };
}

export interface LobbySection {
  category: Category;
  types: LobbyType[];
  items: Listing[];
  live: number;
}

/** Filtered, sorted listings grouped by stake category; empty groups are dropped. */
export function sections(lobby: Lobby, f: LobbyFilters): LobbySection[] {
  const all = filterListings(listings(lobby), f);
  all.sort(compare(f.sort));
  const order = f.sort === "stakes-desc" ? [...CATEGORIES].reverse() : CATEGORIES;
  return order
    .map((category) => ({
      category,
      types: lobby.types.filter((t) => t.category === category),
      items: all.filter((l) => l.type.category === category),
      live: lobby.tables.filter(
        (t) => t.seated > 0 && lobby.types.find((ty) => ty.id === t.type_id)?.category === category,
      ).length,
    }))
    .filter((s) => s.items.length > 0);
}

/** Lowest-to-highest blinds for a set of stake levels, e.g. "$0.02/$0.05 – $0.05/$0.10". */
export function blindRange(types: LobbyType[]) {
  if (!types.length) return "";
  const sorted = [...types].sort((a, b) => a.big_blind - b.big_blind);
  const lo = blinds(sorted[0]!);
  const hi = blinds(sorted[sorted.length - 1]!);
  return lo === hi ? lo : `${lo} – ${hi}`;
}

/** Distinct seat capacities offered by the current stake levels. */
export const seatOptions = (lobby: Lobby) =>
  [...new Set(lobby.types.map((t) => t.max_seats))].sort((a, b) => a - b);

/**
 * The running table with the most players that still has a free seat (higher stakes break
 * ties). Null when nothing is running, so the lobby never features a table that isn't real.
 */
export function pickFeatured(lobby: Lobby): { table: LobbyTable; type: LobbyType } | null {
  let best: { table: LobbyTable; type: LobbyType } | null = null;
  for (const table of lobby.tables) {
    if (table.seated <= 0 || tableFull(table)) continue;
    const type = lobby.types.find((t) => t.id === table.type_id);
    if (!type) continue;
    if (
      !best ||
      table.seated > best.table.seated ||
      (table.seated === best.table.seated && type.big_blind > best.type.big_blind)
    ) {
      best = { table, type };
    }
  }
  return best;
}
