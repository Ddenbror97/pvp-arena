import type { ShotInput } from "./physics";
import { playShot } from "./play";
import { chooseStandInShot, standInDue } from "./stand-in";
import type { TableState } from "./rules";
import { bytesFromHex, committedSeedOk, stepsFromRecord, tableLinks } from "./verify";

const inflight = new Set<string>();

type RpcError = { message: string } | null;
type Rpc = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: RpcError }>;
};

type Bag = {
  balls?: unknown;
  turn?: unknown;
  status?: unknown;
  stand_in?: unknown;
  turn_deadline?: unknown;
  shot_seconds?: unknown;
  server_now?: unknown;
  creator_id?: unknown;
  opponent_id?: unknown;
  server_seed_hash?: unknown;
  events?: unknown;
  duplicate?: unknown;
  seq?: unknown;
  state?: unknown;
};

function asRecord(data: unknown): Bag | null {
  if (typeof data === "string") {
    try {
      return asRecord(JSON.parse(data) as unknown);
    } catch {
      return null;
    }
  }
  return data && typeof data === "object" ? (data as Bag) : null;
}

function asTable(value: unknown): TableState | null {
  const row = asRecord(value);
  if (!row || !Array.isArray(row.balls) || row.balls.length !== 16) return null;
  if (row.turn !== "A" && row.turn !== "B") return null;
  return row as unknown as TableState;
}

function rpcError(error: RpcError): string {
  const raw = error?.message ?? "REQUEST_FAILED";
  return raw.match(/[A-Z][A-Z0-9_]{2,}/)?.[0] ?? "REQUEST_FAILED";
}

async function admin(): Promise<Rpc> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Rpc;
}

/**
 * Plays the away seat's current shot when the think time has elapsed.
 * A second call for the same shot is a duplicate and changes nothing.
 */
export async function playStandInMatch(
  matchId: number,
): Promise<{ ok: true; played: boolean } | { ok: false; error: string }> {
  const db = await admin();
  const loaded = await db.rpc("pool_state", { p_match: matchId });
  if (loaded.error) return { ok: false, error: rpcError(loaded.error) };
  const view = asRecord(loaded.data);
  const table = asTable(view?.state);
  if (!view || view.status !== "PLAYING" || !table || table.winner)
    return { ok: true, played: false };
  if (view.stand_in !== "A" && view.stand_in !== "B") return { ok: true, played: false };
  if (table.turn !== view.stand_in) return { ok: true, played: false };
  const deadline = typeof view.turn_deadline === "string" ? view.turn_deadline : "";
  const now = typeof view.server_now === "string" ? Date.parse(view.server_now) : Date.now();
  const shotSeconds = typeof view.shot_seconds === "number" ? view.shot_seconds : 30;
  if (!deadline || !standInDue(deadline, now, shotSeconds)) return { ok: true, played: false };

  const flight = `${matchId}:${table.shot}`;
  if (inflight.has(flight)) return { ok: true, played: false };
  inflight.add(flight);
  try {
    return await finishStandIn(db, matchId, table);
  } finally {
    inflight.delete(flight);
  }
}

async function finishStandIn(
  db: Rpc,
  matchId: number,
  table: TableState,
): Promise<{ ok: true; played: boolean } | { ok: false; error: string }> {
  const secret = await db.rpc("pool_read_secret", { p_match: matchId });
  const hex = typeof secret.data === "string" ? secret.data : null;
  const seed = hex ? bytesFromHex(hex) : null;
  if (secret.error || !seed || seed.length !== 32) return { ok: false, error: "SEED_MISSING" };
  const shot: ShotInput = chooseStandInShot(table, seed);
  const key = `stand-in:${matchId}:${table.shot + 1}`;
  const prepared = await db.rpc("pool_prepare_stand_in", {
    p_match: matchId,
    p_input: shot,
    p_key: key,
  });
  if (prepared.error) {
    const code = rpcError(prepared.error);
    if (code === "STAND_IN_CLEARED" || code === "SHOT_IN_PROGRESS" || code === "NOT_YOUR_TURN") {
      return { ok: true, played: false };
    }
    return { ok: false, error: code };
  }
  const pending = asRecord(prepared.data);
  if (pending?.duplicate === true) return { ok: true, played: false };
  const seq = Number(pending?.seq);
  const priorTable = asTable(pending?.state) ?? table;
  if (!Number.isInteger(seq)) return { ok: false, error: "BAD_STATE" };

  const fail = async (error: string) => {
    // Only this attempt. A second caller can still be committing the same shot.
    await db.rpc("pool_abort_owned", { p_match: matchId, p_key: key });
    return { ok: false as const, error };
  };

  const played = playShot(priorTable, shot);
  if (!played.ok) return fail(played.error);
  const fresh = asRecord((await db.rpc("pool_state", { p_match: matchId })).data);
  const prior = stepsFromRecord(fresh?.events);
  const published = typeof fresh?.server_seed_hash === "string" ? fresh.server_seed_hash : "";
  if (!prior) return fail("REPLAY_MISMATCH");
  // The stored rack already passed this check on the previous stroke.
  // Rolling every earlier shot here grew past the shot clock after a few turns.
  if (!(await committedSeedOk(seed, published)) || !tableLinks(seed, priorTable, prior)) {
    return fail("REPLAY_MISMATCH");
  }
  const committed = await db.rpc("pool_commit_shot", {
    p_match: matchId,
    p_seq: seq,
    p_state: played.state,
    p_hash: played.hash,
    p_event: { ...played.event, standIn: true },
  });
  if (committed.error) {
    const code = rpcError(committed.error);
    // The other caller already finished, or still owns the pending row.
    if (code === "STAND_IN_CLEARED" || code === "NO_PENDING_SHOT") {
      return { ok: true, played: false };
    }
    await db.rpc("pool_abort_owned", { p_match: matchId, p_key: key });
    return { ok: false, error: code };
  }
  return { ok: true, played: true };
}

/** Same bearer as the other scheduled jobs. The body names one match. */
export async function handlePoolStandIn(request: Request): Promise<Response> {
  const token = /^Bearer ([0-9a-f]{64})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return new Response("Unauthorized", { status: 401 });
  const db = await admin();
  const { data: authed } = await db.rpc("crypto_verify_job_token", { p_token: token });
  if (authed !== true) return new Response("Unauthorized", { status: 401 });
  let matchId = 0;
  try {
    const body = (await request.json()) as { match_id?: unknown };
    matchId = Number(body?.match_id);
  } catch {
    return Response.json({ ok: false, error: "BAD_BODY" }, { status: 400 });
  }
  if (!Number.isInteger(matchId) || matchId < 1) {
    return Response.json({ ok: false, error: "BAD_BODY" }, { status: 400 });
  }
  try {
    const result = await playStandInMatch(matchId);
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "failed";
    console.error("[pool:stand-in]", message.replace(/https?:\/\/\S+/g, "[url]").slice(0, 180));
    return Response.json({ ok: false, error: "JOB_FAILED" }, { status: 500 });
  }
}
