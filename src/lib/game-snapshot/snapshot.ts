/**
 * Public game activity shown on game-specific SEO guides.
 * The worker fetches one snapshot for all games (see snapshot.server.ts) and
 * each mapped guide renders its own game's slice. Amounts are integer cents
 * carried as decimal strings so they survive serialization as exact values.
 */

export type SnapshotGame = "coinflip" | "jackpot" | "roulette" | "slott";

/** Guides that get a live data block. Anything not listed renders unchanged. */
export const GUIDE_GAME_DATA: Readonly<Record<string, SnapshotGame>> = {
  "csgo-coinflip": "coinflip",
  "csgo-coinflip-sites": "coinflip",
  "coin-flip-for-money": "coinflip",
  "online-coin-flip-game": "coinflip",
  "coin-flip-odds": "coinflip",
  "crypto-jackpot": "jackpot",
  "csgo-jackpot": "jackpot",
  "crypto-roulette": "roulette",
  "cs2-roulette": "roulette",
  "provably-fair-roulette": "roulette",
  "roulette-colors": "roulette",
  "roulette-odds-chart": "roulette",
  "50-50-raffle": "jackpot",
  "high-card-game": "coinflip",
  "skillz-review": "coinflip",
  "games-that-pay-real-money": "roulette",
  "slot-battles": "slott",
};

/** First entry that is not the current guide wins. */
export const GAME_GUIDE_LINKS: Readonly<
  Record<SnapshotGame, { howItWorks: string[]; fairness: string[] }>
> = {
  coinflip: {
    howItWorks: ["coin-flip-for-money", "csgo-coinflip"],
    fairness: ["provably-fair-games", "provably-fair-casino"],
  },
  jackpot: {
    howItWorks: ["crypto-jackpot", "csgo-jackpot"],
    fairness: ["provably-fair-games", "provably-fair-casino"],
  },
  roulette: {
    howItWorks: ["crypto-roulette", "cs2-roulette"],
    fairness: ["provably-fair-roulette", "provably-fair-games"],
  },
  slott: {
    howItWorks: ["slot-battles"],
    fairness: ["provably-fair-casino", "provably-fair-games"],
  },
};

export const MIN_ROUNDS_FOR_AVERAGE = 5;
export const MIN_ROUNDS_FOR_DISTRIBUTION = 30;

export type WindowTotals = {
  rounds: number;
  wagered: string;
  avgPot: string | null;
  largestPot: string | null;
};

export type AllTimeTotals = WindowTotals & { since: string | null };

export type RecentRound = {
  id: number;
  pot: string;
  players: number | null;
  bets: number | null;
  result: string | null;
  completedAt: string;
  verifiable: boolean;
};

export type Outcome = { label: string; count: number; expectedBps: number };

export type GameStats = {
  window: WindowTotals;
  allTime: AllTimeTotals;
  recent: RecentRound[];
  /** Roulette only: every settled spin, with or without bets. */
  spins: number | null;
  bets: number | null;
  avgPlayers: string | null;
  outcomes: Outcome[] | null;
  outcomeTotal: number;
  wheelVersion: number | null;
};

export type GameSnapshot = {
  generatedAt: string;
  windowDays: number;
  games: Record<SnapshotGame, GameStats | null>;
};

export type GameSnapshotView = {
  game: SnapshotGame;
  generatedAt: string;
  windowDays: number;
  stats: GameStats;
};

type Key =
  | "generated_at"
  | "window_days"
  | "coinflip"
  | "jackpot"
  | "roulette"
  | "slott"
  | "window"
  | "all_time"
  | "recent"
  | "colors"
  | "rounds"
  | "rounds_with_bets"
  | "spins"
  | "bets"
  | "wagered"
  | "avg_pot"
  | "largest_pot"
  | "avg_players"
  | "heads"
  | "tails"
  | "since"
  | "id"
  | "pot"
  | "players"
  | "result"
  | "completed_at"
  | "verifiable"
  | "slots"
  | "counts"
  | "slot_count"
  | "wheel_version";
type Obj = Partial<Record<Key, unknown>> & Record<string, unknown>;

const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

function count(v: unknown): number | null {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : null;
}

function cents(v: unknown): string | null {
  if (typeof v === "number" && Number.isSafeInteger(v) && v >= 0) return String(v);
  if (typeof v === "string" && /^\d{1,18}$/.test(v)) return BigInt(v).toString();
  return null;
}

function iso(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function avgPot(wagered: string, rounds: number, given: string | null): string | null {
  if (rounds <= 0) return null;
  if (given !== null) return given;
  const r = BigInt(rounds);
  return ((BigInt(wagered) * 2n + r) / (2n * r)).toString();
}

function totals(v: unknown, roundsKey: "rounds" | "rounds_with_bets"): WindowTotals | null {
  if (!isObj(v)) return null;
  const rounds = count(v[roundsKey]);
  const wagered = cents(v.wagered);
  if (rounds === null || wagered === null) return null;
  return {
    rounds,
    wagered,
    avgPot: avgPot(wagered, rounds, cents(v.avg_pot)),
    largestPot: rounds > 0 ? cents(v.largest_pot) : null,
  };
}

const RESULTS: Record<SnapshotGame, readonly string[]> = {
  coinflip: ["HEADS", "TAILS"],
  jackpot: [],
  roulette: ["RED", "BLACK", "GREEN"],
  slott: ["WIN", "DRAW", "BOMB"],
};

function recentRows(v: unknown, game: SnapshotGame): RecentRound[] {
  if (!Array.isArray(v)) return [];
  const rows: RecentRound[] = [];
  for (const r of v) {
    if (!isObj(r)) continue;
    const id = count(r.id);
    const pot = cents(r.pot);
    const completedAt = iso(r.completed_at);
    if (id === null || pot === null || completedAt === null) continue;
    const result =
      typeof r.result === "string" && RESULTS[game].includes(r.result) ? r.result : null;
    if (game !== "jackpot" && result === null) continue;
    rows.push({
      id,
      pot,
      players: count(r.players),
      bets: count(r.bets),
      result,
      completedAt,
      verifiable: r.verifiable === true,
    });
  }
  return rows.sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 10);
}

type Outcomes = { outcomes: Outcome[]; total: number; wheel: number | null };

function coinflipOutcomes(w: Obj): Outcomes | null {
  const heads = count(w.heads);
  const tails = count(w.tails);
  if (heads === null || tails === null) return null;
  return {
    outcomes: [
      { label: "HEADS", count: heads, expectedBps: 5000 },
      { label: "TAILS", count: tails, expectedBps: 5000 },
    ],
    total: heads + tails,
    wheel: null,
  };
}

function rouletteOutcomes(v: unknown): Outcomes | null {
  if (!isObj(v) || !isObj(v.slots) || !isObj(v.counts)) return null;
  const slotCount = count(v.slot_count);
  const wheel = count(v.wheel_version);
  if (!slotCount || wheel === null) return null;
  const outcomes: Outcome[] = [];
  let total = 0;
  for (const label of RESULTS.roulette) {
    const slots = count(v.slots[label]);
    if (!slots) continue;
    const n = v.counts[label] === undefined ? 0 : count(v.counts[label]);
    if (n === null) return null;
    outcomes.push({ label, count: n, expectedBps: Math.round((slots * 10000) / slotCount) });
    total += n;
  }
  return outcomes.length ? { outcomes, total, wheel } : null;
}

function gameStats(v: unknown, game: SnapshotGame): GameStats | null {
  if (!isObj(v) || !isObj(v.window) || !isObj(v.all_time)) return null;
  const roundsKey = game === "roulette" ? "rounds_with_bets" : "rounds";
  const window = totals(v.window, roundsKey);
  const allTime = totals(v.all_time, roundsKey);
  if (!window || !allTime) return null;
  const dist =
    game === "coinflip"
      ? coinflipOutcomes(v.window)
      : game === "roulette"
        ? rouletteOutcomes(v.colors)
        : null;
  const avgPlayers =
    game === "jackpot" &&
    typeof v.window.avg_players === "number" &&
    Number.isFinite(v.window.avg_players)
      ? v.window.avg_players.toFixed(1)
      : null;
  return {
    window,
    allTime: { ...allTime, since: iso(v.all_time.since) },
    recent: recentRows(v.recent, game),
    spins: game === "roulette" ? count(v.window.spins) : null,
    bets: game === "roulette" ? count(v.window.bets) : null,
    avgPlayers,
    outcomes: dist?.outcomes ?? null,
    outcomeTotal: dist?.total ?? 0,
    wheelVersion: dist?.wheel ?? null,
  };
}

/** Whitelists every field; a malformed game drops to null instead of failing the page. */
export function parseSnapshot(raw: unknown): GameSnapshot | null {
  if (!isObj(raw)) return null;
  const generatedAt = iso(raw.generated_at);
  const windowDays = count(raw.window_days);
  if (!generatedAt || !windowDays) return null;
  return {
    generatedAt,
    windowDays,
    games: {
      coinflip: gameStats(raw.coinflip, "coinflip"),
      jackpot: gameStats(raw.jackpot, "jackpot"),
      roulette: gameStats(raw.roulette, "roulette"),
      slott: gameStats(raw.slott, "slott"),
    },
  };
}

export function snapshotView(
  snapshot: GameSnapshot | null,
  game: SnapshotGame,
): GameSnapshotView | null {
  const stats = snapshot?.games[game];
  if (!snapshot || !stats) return null;
  return { game, generatedAt: snapshot.generatedAt, windowDays: snapshot.windowDays, stats };
}

/** Measured from the snapshot time, so server and browser render the same text. */
export function agoLabel(at: string, reference: string): string {
  const s = Math.max(0, Math.floor((Date.parse(reference) - Date.parse(at)) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(h / 24)} days ago`;
}
