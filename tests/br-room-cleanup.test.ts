import { afterEach, describe, expect, it, vi } from "vitest";
import { BrRoom } from "../workers/fps/br";

type InternalRoom = {
  state: unknown;
  timer: ReturnType<typeof setInterval> | null;
  loaded: unknown;
  emptySince: number;
  savedLoot: { revision: number; at: number; chunks: number };
  tick(): Promise<void>;
  step(): void;
  record(): Promise<void>;
};

function fixture(o: { sockets?: unknown[]; savedAt?: number } = {}) {
  const keys = new Set([
    "br:checkpoint",
    "br:checkpoint:loot:0",
    "br:checkpoint:loot:1",
    "nonce:used",
  ]);
  const storage = {
    deleteAll: vi.fn(async () => keys.clear()),
    delete: vi.fn(async (removed: string[]) => removed.forEach((key) => keys.delete(key))),
    setAlarm: vi.fn(async (_at: number) => {}),
    get: vi.fn(async (key: string) =>
      key === "br:checkpoint" && o.savedAt !== undefined ? { savedAt: o.savedAt } : undefined,
    ),
  };
  const pending: Promise<unknown>[] = [];
  const context = {
    storage,
    getWebSockets: () => o.sockets ?? [],
    waitUntil: (p: Promise<unknown>) => pending.push(p),
  } as unknown as ConstructorParameters<typeof BrRoom>[0];
  const env = {
    SUPABASE_URL: "https://database.test",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-only",
    BR_LOBBY: {
      idFromName: (name: string) => name,
      get: () => ({ fetch: async () => new Response("{}") }),
    },
  } as unknown as ConstructorParameters<typeof BrRoom>[1];
  const room = new BrRoom(context, env);
  return { room, internal: room as unknown as InternalRoom, storage, pending, keys };
}

afterEach(() => vi.restoreAllMocks());

describe("BR room storage lifecycle", () => {
  it("the stale alarm clears an inactive room including replay guards", async () => {
    const f = fixture();
    await f.room.alarm();
    expect(f.storage.deleteAll).toHaveBeenCalledOnce();
    expect(f.keys.size).toBe(0);
  });

  it("an alarm keeps the checkpoint of a room restarted under connected players", async () => {
    // The room's memory was reset (eviction, a limit) while its sockets stayed connected: the
    // checkpoint is how their match resumes. Wiping it started a new match under them, in the
    // countdown (owner, 2026-11-13).
    const f = fixture({ sockets: [{}] });
    await f.room.alarm();
    expect(f.storage.deleteAll).not.toHaveBeenCalled();
    expect(f.storage.setAlarm).toHaveBeenCalledOnce();
    expect(f.keys.size).toBe(4);
  });

  it("an alarm keeps a checkpoint written within the stale window", async () => {
    const savedAt = Date.now() - 60_000;
    const f = fixture({ savedAt });
    await f.room.alarm();
    expect(f.storage.deleteAll).not.toHaveBeenCalled();
    expect(f.storage.setAlarm).toHaveBeenCalledWith(savedAt + 900_000);
    const stale = fixture({ savedAt: Date.now() - 900_001 });
    await stale.room.alarm();
    expect(stale.storage.deleteAll).toHaveBeenCalledOnce();
  });

  it("an alarm preserves an active room and schedules another 15 minutes", async () => {
    const f = fixture();
    f.internal.state = { seats: [] };
    f.internal.timer = setInterval(() => {}, 60_000);
    const start = Date.now();
    try {
      await f.room.alarm();
      expect(f.storage.deleteAll).not.toHaveBeenCalled();
      expect(f.storage.setAlarm).toHaveBeenCalledOnce();
      expect(f.storage.setAlarm.mock.calls[0]![0]).toBeGreaterThanOrEqual(start + 900_000);
      expect(f.keys.size).toBe(4);
    } finally {
      clearInterval(f.internal.timer);
    }
  });

  it("an empty room stops and clears all stored state after the reconnect grace", async () => {
    const f = fixture();
    f.internal.state = { seats: [] };
    f.internal.loaded = {};
    f.internal.emptySince = Date.now() - 120_001;
    f.internal.timer = setInterval(() => {}, 60_000);
    await f.internal.tick();
    expect(f.storage.deleteAll).toHaveBeenCalledOnce();
    expect(f.internal.timer).toBeNull();
    expect(f.internal.state).toBeNull();
    expect(f.internal.savedLoot).toEqual({ revision: -1, at: 0, chunks: 0 });
    expect(f.keys.size).toBe(0);
  });

  it("completion removes the checkpoint and loot but retains the replay guard until room cleanup", async () => {
    const f = fixture();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    f.internal.loaded = { island: { solid: {} }, meta: {} };
    f.internal.state = {
      winner: -1,
      seats: [],
      phase: "completed",
      phaseAt: 0,
      planeAt: 0,
      tick: 0,
      events: [],
      combat: [],
      projectiles: new Map(),
    };
    f.internal.savedLoot = { revision: 1, at: 0, chunks: 2 };
    f.internal.step();
    await Promise.all(f.pending);
    expect(f.storage.delete).toHaveBeenCalledOnce();
    expect(f.keys).toEqual(new Set(["nonce:used"]));
    expect(f.storage.deleteAll).not.toHaveBeenCalled();
  });

  it.each(["http", "transport"])(
    "logs a failed result POST (%s) without changing the match",
    async (mode) => {
      const f = fixture();
      const state = { winner: -1, seats: [], phaseAt: 0, planeAt: 0 };
      f.internal.state = state;
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const fetch = vi.spyOn(globalThis, "fetch");
      if (mode === "http") fetch.mockResolvedValue(new Response("", { status: 503 }));
      else fetch.mockRejectedValue(new Error("synthetic transport failure"));
      await f.internal.record();
      expect(warn).toHaveBeenCalledOnce();
      expect(JSON.parse(warn.mock.calls[0]![0] as string)).toMatchObject({
        event: "br_result_not_recorded",
        ...(mode === "http" ? { status: 503 } : { reason: "synthetic transport failure" }),
      });
      expect(f.internal.state).toBe(state);
    },
  );
});
