import { useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { JACKPOT_RECENT_PAGE_SIZE, RECENT_PAGE_SIZE } from "@/components/recent/usePagedRecent";
import { fetchChatPage } from "@/lib/chat/api";
import type { ChatMessage } from "@/lib/chat/messages";
import { SHARED_CHAT_ROOM } from "@/lib/chat/config";
import { fetchLiveCoinflips, fetchOpenCoinflips, fetchRecentCoinflips } from "@/lib/coinflip/api";
import {
  fetchOpenRound,
  fetchRecentGames,
  peekShownRound,
  type Game,
  type PlayerRow,
} from "@/lib/jackpot/api";
import { fetchIdentities, identityQueryKey, type PrestigeIdentity } from "@/lib/prestige/api";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchOpenSlots,
  fetchRecentSlots,
  fetchSlotConfig,
  SLOT_RECENT_PAGE_SIZE,
} from "@/lib/slott/api";
import { warmSlotStage } from "@/lib/slott/stage";
import { fetchLobby, type Lobby } from "@/lib/poker/api";
import { fetchPoolLobby, type PoolLobby } from "@/lib/pool/api";
import { warmDealer } from "@/lib/poker/assets";
import {
  fetchCurrentRound,
  fetchHistory,
  fetchRecentRounds,
  fetchRoundBets,
  fetchRouletteSetup,
  type RlBet,
  type RlGame,
} from "@/lib/roulette/api";

/**
 * A warm lobby answer is reused for a few seconds. An older one is sent
 * immediately while a refresh runs behind it. A cold miss waits for the lobby
 * so the first visitor in a region gets the same page, and gives up only if
 * that read misses its budget.
 */
const FILL_BUDGET_MS = 2_000;
const PAINT_FRESH_MS = 5_000;
const PAINT_STALE_MS = 30_000;
/**
 * A click on Jackpot keeps the previous page up while the open round loads, so the
 * Players list is already filled when this page appears. Identities get the time
 * left after the round, up to the longer cap.
 */
const JACKPOT_BROWSER_ROUND_MS = 800;
const JACKPOT_BROWSER_WAIT_MS = 1200;

/**
 * The first document waits on these reads. A later visit to Jackpot also waits for the
 * open round, so the Players list is already filled when that page appears.
 */
const inBrowser = typeof window !== "undefined";

export type Fresh<T> = { data: T; at: number } | null;
export type IdentitySeed = { ids: string[]; rows: PrestigeIdentity[] } | null;

type RecentJackpot = Awaited<ReturnType<typeof fetchRecentGames>>;

export type JackpotPaint = {
  game: Fresh<Game | null>;
  players: Fresh<PlayerRow[]>;
  recent: Fresh<RecentJackpot>;
  chat: Fresh<ChatMessage[]>;
  identities: IdentitySeed;
};

export type CoinflipPaint = {
  open: Fresh<Awaited<ReturnType<typeof fetchOpenCoinflips>>>;
  live: Fresh<Awaited<ReturnType<typeof fetchLiveCoinflips>>>;
  recent: Fresh<Awaited<ReturnType<typeof fetchRecentCoinflips>>>;
  chat: Fresh<ChatMessage[]>;
  identities: IdentitySeed;
};

export type RoulettePaint = {
  round: Fresh<RlGame | null>;
  history: Fresh<Awaited<ReturnType<typeof fetchHistory>>>;
  recent: Fresh<Awaited<ReturnType<typeof fetchRecentRounds>>>;
  setup: Fresh<Awaited<ReturnType<typeof fetchRouletteSetup>>>;
  bets: Fresh<RlBet[]>;
  playOpen: Fresh<boolean>;
  chat: Fresh<ChatMessage[]>;
  identities: IdentitySeed;
};

export type SlottPaint = {
  config: Fresh<Awaited<ReturnType<typeof fetchSlotConfig>>>;
  open: Fresh<Awaited<ReturnType<typeof fetchOpenSlots>>>;
  recent: Fresh<Awaited<ReturnType<typeof fetchRecentSlots>>>;
};

export type PokerPaint = { lobby: Fresh<Lobby> };
export type PoolPaint = { lobby: Fresh<PoolLobby> | null };

function cap<T>(promise: Promise<T>, deadline: number): Promise<T | undefined> {
  const ms = deadline - Date.now();
  if (ms <= 0) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    promise.then(
      (data) => {
        clearTimeout(timer);
        resolve(data);
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      },
    );
  });
}

function fresh<T>(data: T | undefined, at: number): Fresh<T> {
  return data === undefined ? null : { data, at };
}

type PaintSlot = { at: number; value: object };
const paintSlots = new Map<string, PaintSlot>();
const paintFlights = new Map<string, Promise<object>>();

export function clearPaintCache() {
  paintSlots.clear();
  paintFlights.clear();
}

function readPaint<T extends object>(key: string, maxAge: number): T | undefined {
  const slot = paintSlots.get(key);
  if (!slot || Date.now() - slot.at > maxAge) return undefined;
  return slot.value as T;
}

function usefulPaint(value: object): boolean {
  return Object.values(value).some((field) => {
    if (field == null) return false;
    if (typeof field === "object" && "data" in field) return true;
    if (typeof field === "object" && "rows" in field)
      return ((field as { rows?: unknown[] }).rows?.length ?? 0) > 0;
    return true;
  });
}

const PAINT_CACHE_URL = "https://pvpspinarena.internal/paint/v2/";

function edgeCache(): Cache | undefined {
  return (globalThis as { caches?: { default?: Cache } }).caches?.default;
}

function captureWait(): ((work: Promise<unknown>) => void) | undefined {
  return (globalThis as { __pvpWait?: (work: Promise<unknown>) => void }).__pvpWait;
}

function hold(work: Promise<unknown>, wait?: (work: Promise<unknown>) => void) {
  try {
    wait?.(work);
  } catch {
    /* the response can still finish this read while the page renders */
  }
}

async function readEdge<T extends object>(
  key: string,
): Promise<(PaintSlot & { value: T }) | undefined> {
  const cache = edgeCache();
  if (!cache) return undefined;
  const res = await cache.match(PAINT_CACHE_URL + key);
  if (!res) return undefined;
  const body = (await res.json()) as { at?: number; value?: T };
  if (!body?.value || typeof body.at !== "number") return undefined;
  return { at: body.at, value: body.value };
}

async function writeEdge(key: string, value: object) {
  const cache = edgeCache();
  if (!cache) return;
  await cache.put(
    PAINT_CACHE_URL + key,
    new Response(JSON.stringify({ at: Date.now(), value }), {
      headers: { "Cache-Control": "public, max-age=30", "Content-Type": "application/json" },
    }),
  );
}

/** Serve a public lobby payload. A cold miss waits for the read; a warm one does not. */
export async function servePaint<T extends object>(
  key: string,
  empty: T,
  load: (deadline: number) => Promise<T>,
  options?: { coldWaitMs?: number },
): Promise<T> {
  const wait = captureWait();
  const freshHit = readPaint<T>(key, PAINT_FRESH_MS);
  if (freshHit) return freshHit;
  const edge = await readEdge<T>(key);
  if (edge && Date.now() - edge.at <= PAINT_FRESH_MS) {
    paintSlots.set(key, edge);
    return edge.value;
  }
  let flight = paintFlights.get(key) as Promise<T> | undefined;
  if (!flight) {
    const deadline = Date.now() + FILL_BUDGET_MS;
    flight = load(deadline)
      .then(async (value) => {
        if (usefulPaint(value)) {
          paintSlots.set(key, { at: Date.now(), value });
          await writeEdge(key, value).catch(() => {});
        }
        return value;
      })
      .catch(() => empty);
    paintFlights.set(key, flight);
    const started = flight;
    hold(started, wait);
    void started.finally(() => {
      if (paintFlights.get(key) === started) paintFlights.delete(key);
    });
  }
  if (edge && Date.now() - edge.at <= PAINT_STALE_MS) return edge.value;
  const stale = readPaint<T>(key, PAINT_STALE_MS);
  if (stale) return stale;
  const coldWait = options?.coldWaitMs ?? FILL_BUDGET_MS;
  return (await cap(flight, Date.now() + coldWait)) ?? readPaint<T>(key, PAINT_STALE_MS) ?? empty;
}

async function identitiesFor(ids: string[], deadline: number): Promise<IdentitySeed> {
  const key = identityQueryKey(ids);
  if (!key.length) return { ids: [], rows: [] };
  const rows = await cap(fetchIdentities(key), deadline);
  if (rows === undefined) return null;
  return { ids: key, rows };
}

async function fetchPlayOpen(): Promise<boolean> {
  const { data, error } = await supabase.rpc("real_play_open" as never);
  if (error) throw error;
  return Boolean(data);
}

const EMPTY_JACKPOT: JackpotPaint = {
  game: null,
  players: null,
  recent: null,
  chat: null,
  identities: null,
};

function mergeIdentitySeeds(first: IdentitySeed, second: IdentitySeed): IdentitySeed {
  if (!first) return second;
  if (!second) return first;
  const ids = [...new Set([...first.ids, ...second.ids])];
  const seen = new Set(first.rows.map((row) => row.user_id));
  const rows = [...first.rows];
  for (const row of second.rows) {
    if (!seen.has(row.user_id)) rows.push(row);
  }
  return { ids, rows };
}

async function buildJackpotPaint(deadline: number): Promise<JackpotPaint> {
  const at = Date.now();
  const roundP = cap(peekShownRound(), deadline);
  const recentP = cap(fetchRecentGames(JACKPOT_RECENT_PAGE_SIZE, 0), deadline);
  const chatP = cap(fetchChatPage(SHARED_CHAT_ROOM), deadline);
  const round = await roundP;
  const game = round?.game;
  const players = round === undefined ? undefined : round.players;
  const playerIds = (players ?? []).map((p) => p.user_id);
  // Frames start as soon as the round is known, while recent games and chat are still reading.
  const playerIdentitiesP = identitiesFor(playerIds, deadline);
  const [recent, chat, playerIdentities] = await Promise.all([recentP, chatP, playerIdentitiesP]);
  const restIds = [
    ...(recent ?? []).map((g) => g.winner_id).filter((id): id is string => !!id),
    ...(chat ?? []).map((m) => m.user_id),
  ].filter((id) => !playerIds.includes(id));
  const restIdentities =
    restIds.length > 0 && Date.now() < deadline ? await identitiesFor(restIds, deadline) : null;
  return {
    game: fresh(game, at),
    players: fresh(players, at),
    recent: fresh(recent, at),
    chat: fresh(chat, at),
    identities: mergeIdentitySeeds(playerIdentities, restIdentities),
  };
}

export async function loadJackpotPaint(): Promise<JackpotPaint> {
  if (inBrowser) {
    const at = Date.now();
    const round = await cap(peekShownRound(), at + JACKPOT_BROWSER_ROUND_MS);
    if (!round) return EMPTY_JACKPOT;
    const identities = await identitiesFor(
      round.players.map((p) => p.user_id),
      at + JACKPOT_BROWSER_WAIT_MS,
    );
    return {
      game: fresh(round.game, at),
      players: fresh(round.players, at),
      recent: null,
      chat: null,
      identities,
    };
  }
  return servePaint("jackpot", EMPTY_JACKPOT, buildJackpotPaint);
}

const EMPTY_COINFLIP: CoinflipPaint = {
  open: null,
  live: null,
  recent: null,
  chat: null,
  identities: null,
};

async function buildCoinflipPaint(deadline: number): Promise<CoinflipPaint> {
  const at = Date.now();
  const [open, live, recent, chat] = await Promise.all([
    cap(fetchOpenCoinflips(), deadline),
    cap(fetchLiveCoinflips(), deadline),
    cap(fetchRecentCoinflips(RECENT_PAGE_SIZE, 0), deadline),
    cap(fetchChatPage(SHARED_CHAT_ROOM), deadline),
  ]);
  const identities = await identitiesFor(
    [
      ...(open ?? []).map((g) => g.creator_id),
      ...(live ?? []).flatMap((g) =>
        [g.creator_id, g.opponent_id].filter((id): id is string => !!id),
      ),
      ...(recent ?? []).flatMap((g) =>
        [g.creator_id, g.opponent_id].filter((id): id is string => !!id),
      ),
      ...(chat ?? []).map((m) => m.user_id),
    ],
    deadline,
  );
  return {
    open: fresh(open, at),
    live: fresh(live, at),
    recent: fresh(recent, at),
    chat: fresh(chat, at),
    identities,
  };
}

export async function loadCoinflipPaint(pathname: string): Promise<CoinflipPaint> {
  const lobby =
    pathname === "/coinflip" ||
    pathname === "/coinflip/" ||
    /^\/coinflip\/[^/]+\/?$/.test(pathname);
  if (inBrowser || !lobby) return EMPTY_COINFLIP;
  return servePaint("coinflip", EMPTY_COINFLIP, buildCoinflipPaint);
}

const EMPTY_ROULETTE: RoulettePaint = {
  round: null,
  history: null,
  recent: null,
  setup: null,
  bets: null,
  playOpen: null,
  chat: null,
  identities: null,
};

async function buildRoulettePaint(deadline: number): Promise<RoulettePaint> {
  const at = Date.now();
  const [round, history, recent, setup, playOpen, chat] = await Promise.all([
    cap(fetchCurrentRound(), deadline),
    cap(fetchHistory(48), deadline),
    cap(fetchRecentRounds(RECENT_PAGE_SIZE, 0), deadline),
    cap(fetchRouletteSetup(), deadline),
    cap(fetchPlayOpen(), deadline),
    cap(fetchChatPage(SHARED_CHAT_ROOM), deadline),
  ]);
  const bets =
    round?.id != null
      ? await cap(fetchRoundBets(round.id), deadline)
      : round === null
        ? []
        : undefined;
  const identities = await identitiesFor(
    [...(bets ?? []).map((b) => b.user_id), ...(chat ?? []).map((m) => m.user_id)],
    deadline,
  );
  return {
    round: fresh(round, at),
    history: fresh(history, at),
    recent: fresh(recent, at),
    setup: fresh(setup, at),
    bets: fresh(bets, at),
    playOpen: fresh(playOpen, at),
    chat: fresh(chat, at),
    identities,
  };
}

export async function loadRoulettePaint(): Promise<RoulettePaint> {
  if (inBrowser) return EMPTY_ROULETTE;
  return servePaint("roulette", EMPTY_ROULETTE, buildRoulettePaint);
}

const EMPTY_SLOTT: SlottPaint = { config: null, open: null, recent: null };

async function buildSlottPaint(deadline: number): Promise<SlottPaint> {
  const at = Date.now();
  const [config, open, recent] = await Promise.all([
    cap(fetchSlotConfig(), deadline),
    cap(fetchOpenSlots(), deadline),
    cap(fetchRecentSlots(SLOT_RECENT_PAGE_SIZE, 0), deadline),
  ]);
  return { config: fresh(config, at), open: fresh(open, at), recent: fresh(recent, at) };
}

export async function loadSlottPaint(pathname: string): Promise<SlottPaint> {
  if (inBrowser || (pathname !== "/slott" && pathname !== "/slott/")) return EMPTY_SLOTT;
  return servePaint("slott", EMPTY_SLOTT, buildSlottPaint);
}

const EMPTY_POKER: PokerPaint = { lobby: null };

async function buildPokerPaint(deadline: number): Promise<PokerPaint> {
  const at = Date.now();
  return { lobby: fresh(await cap(fetchLobby(), deadline), at) };
}

export async function loadPokerPaint(pathname: string): Promise<PokerPaint> {
  if (inBrowser || (pathname !== "/poker" && pathname !== "/poker/")) return EMPTY_POKER;
  return servePaint("poker", EMPTY_POKER, buildPokerPaint);
}

const EMPTY_POOL: PoolPaint = { lobby: null };

async function buildPoolPaint(deadline: number): Promise<PoolPaint> {
  const at = Date.now();
  return { lobby: fresh(await cap(fetchPoolLobby(), deadline), at) };
}

export async function loadPoolPaint(pathname: string): Promise<PoolPaint> {
  if (inBrowser || (pathname !== "/8-ball-pool" && pathname !== "/8-ball-pool/")) return EMPTY_POOL;
  return servePaint("pool", EMPTY_POOL, buildPoolPaint);
}

/**
 * Fill react-query for a game page before the visitor clicks the header.
 * The route loaders skip these reads in the browser so the old page stays up;
 * hover/idle prefetch is what makes the next page land with data already there.
 */
export function prefetchGamePage(
  qc: QueryClient,
  path: "/" | "/coinflip" | "/roulette" | "/slott" | "/poker" | "/8-ball-pool",
) {
  if (path === "/8-ball-pool") {
    void qc.prefetchQuery({ queryKey: ["pool-lobby"], queryFn: fetchPoolLobby });
    return;
  }
  if (path === "/poker") {
    warmDealer();
    void qc.prefetchQuery({ queryKey: ["poker-lobby"], queryFn: fetchLobby });
    return;
  }
  if (path === "/slott") {
    warmSlotStage();
    void qc.prefetchQuery({
      queryKey: ["slot-config"],
      staleTime: 60_000,
      queryFn: fetchSlotConfig,
    });
    void qc.prefetchQuery({ queryKey: ["slot-open"], queryFn: fetchOpenSlots });
    void qc.prefetchQuery({
      queryKey: ["slot-recent", 0],
      queryFn: () => fetchRecentSlots(SLOT_RECENT_PAGE_SIZE, 0),
    });
    return;
  }
  if (path === "/") {
    void qc.prefetchQuery({
      queryKey: ["open-game"],
      queryFn: async () => {
        const round = await fetchOpenRound();
        if (round.game) qc.setQueryData(["players", round.game.id], round.players);
        return round.game;
      },
    });
    void qc.prefetchQuery({
      queryKey: ["recent-games", 0],
      queryFn: () => fetchRecentGames(JACKPOT_RECENT_PAGE_SIZE, 0),
    });
    return;
  }
  if (path === "/coinflip") {
    void qc.prefetchQuery({ queryKey: ["coinflip-open"], queryFn: fetchOpenCoinflips });
    void qc.prefetchQuery({ queryKey: ["coinflip-live"], queryFn: fetchLiveCoinflips });
    void qc.prefetchQuery({
      queryKey: ["coinflip-recent", 0],
      queryFn: () => fetchRecentCoinflips(RECENT_PAGE_SIZE, 0),
    });
    return;
  }
  void qc.prefetchQuery({
    queryKey: ["roulette-setup"],
    staleTime: Infinity,
    queryFn: fetchRouletteSetup,
  });
  void qc.prefetchQuery({ queryKey: ["roulette-round"], queryFn: fetchCurrentRound });
  void qc.prefetchQuery({ queryKey: ["roulette-history", 48], queryFn: () => fetchHistory(48) });
}

/** Fill the query cache from the document payload before children read it. Later updates win. */
export function useQuerySeed(entries: Array<[QueryKey, Fresh<unknown>] | null>) {
  const qc = useQueryClient();
  for (const entry of entries) {
    if (!entry) continue;
    const [key, hit] = entry;
    if (!hit) continue;
    if (qc.getQueryData(key) !== undefined) continue;
    qc.setQueryData(key, hit.data);
  }
}
