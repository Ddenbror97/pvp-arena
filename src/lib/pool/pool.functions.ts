import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireLiveSession } from "@/integrations/supabase/live-session";
import { POOL_STAKE_MAX, POOL_STAKE_MIN } from "./copy";
import type { ShotInput } from "./physics";
import { confirmedWinner, playShot } from "./play";
import { freshTable, seedHash, type TableState } from "./rules";
import { bytesFromHex, stepsFromRecord } from "./verify";

const stakeSchema = z.number().int().min(POOL_STAKE_MIN).max(POOL_STAKE_MAX);
const keySchema = z.string().min(8).max(100);
const shotSchema = z.object({
  angleMilli: z.number().int().min(0).max(359_999),
  power: z.number().int().min(1).max(10_000),
  spinX: z.number().int().min(-1000).max(1000),
  spinY: z.number().int().min(-1000).max(1000),
  placeX: z.number().int().nullable(),
  placeY: z.number().int().nullable(),
  calledPocket: z.number().int().min(0).max(5).nullable(),
});

type RpcError = { message: string } | null;
type Rpc = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: RpcError }>;
};

type Bag = {
  balls?: unknown;
  turn?: unknown;
  match_id?: unknown;
  role?: unknown;
  duplicate?: unknown;
  seq?: unknown;
  state?: unknown;
  events?: unknown;
  server_seed_hash?: unknown;
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

function rpcError(error: RpcError): string {
  const raw = error?.message ?? "REQUEST_FAILED";
  return raw.match(/[A-Z][A-Z0-9_]{2,}/)?.[0] ?? "REQUEST_FAILED";
}

function asTable(value: unknown): TableState | null {
  const row = asRecord(value);
  if (!row || !Array.isArray(row.balls) || row.balls.length !== 16) return null;
  if (row.turn !== "A" && row.turn !== "B") return null;
  return row as unknown as TableState;
}

async function admin(): Promise<Rpc> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Rpc;
}

/** Rack from the committed seed and open the table. A bad rack refunds both stakes. */
async function beginJoined(matchId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await admin();
  const secret = await db.rpc("pool_read_secret", { p_match: matchId });
  const hex = typeof secret.data === "string" ? secret.data : null;
  const seed = hex ? bytesFromHex(hex) : null;
  if (secret.error || !seed || seed.length !== 32) {
    await db.rpc("pool_refund_starting", { p_match: matchId });
    return { ok: false, error: "START_FAILED" };
  }
  const published = await seedHash(seed);
  const view = asRecord((await db.rpc("pool_state", { p_match: matchId })).data);
  if (view?.server_seed_hash !== published) {
    await db.rpc("pool_refund_starting", { p_match: matchId });
    return { ok: false, error: "SEED_MISMATCH" };
  }
  const begun = await db.rpc("pool_begin", { p_match: matchId, p_state: freshTable(seed) });
  if (begun.error) {
    await db.rpc("pool_refund_starting", { p_match: matchId });
    return { ok: false, error: rpcError(begun.error) };
  }
  return { ok: true };
}

export const enterPool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((input: unknown) =>
    z
      .object({
        stake: stakeSchema.optional(),
        matchId: z.number().int().positive().optional(),
        key: keySchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const user = context.supabase as unknown as Rpc;
    if (data.matchId == null && data.stake == null)
      return { ok: false as const, error: "STAKE_NOT_ALLOWED" };
    const made =
      data.matchId != null
        ? await user.rpc("pool_join", { p_match: data.matchId, p_key: data.key })
        : await user.rpc("pool_matchmake", { p_stake: data.stake, p_key: data.key });
    if (made.error) return { ok: false as const, error: rpcError(made.error) };
    const row = asRecord(made.data);
    const matchId = Number(row?.match_id);
    const role = row?.role === "joined" ? "joined" : "created";
    if (!Number.isInteger(matchId) || matchId < 1)
      return { ok: false as const, error: "REQUEST_FAILED" };
    if (role === "joined") {
      const started = await beginJoined(matchId);
      if (!started.ok) return { ok: false as const, error: started.error, matchId };
    }
    return { ok: true as const, matchId, role, duplicate: row?.duplicate === true };
  });

export const submitPoolShot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((input: unknown) =>
    z
      .object({ matchId: z.number().int().positive(), key: keySchema, shot: shotSchema })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const user = context.supabase as unknown as Rpc;
    const shot = data.shot satisfies ShotInput;
    const prepared = await user.rpc("pool_prepare_shot", {
      p_match: data.matchId,
      p_input: shot,
      p_key: data.key,
    });
    if (prepared.error) return { ok: false as const, error: rpcError(prepared.error) };
    const pending = asRecord(prepared.data);
    if (pending?.duplicate === true)
      return { ok: true as const, duplicate: true, matchId: data.matchId };
    const seq = Number(pending?.seq);
    const table = asTable(pending?.state);
    if (!table || !Number.isInteger(seq)) return { ok: false as const, error: "BAD_STATE" };

    const db = await admin();
    const fail = async (error: string) => {
      await db.rpc("pool_abort_shot", { p_match: data.matchId });
      return { ok: false as const, error };
    };

    const played = playShot(table, shot);
    if (!played.ok) return fail(played.error);

    const secret = await db.rpc("pool_read_secret", { p_match: data.matchId });
    const view = asRecord((await user.rpc("pool_state", { p_match: data.matchId })).data);
    const hex = typeof secret.data === "string" ? secret.data : null;
    const seed = hex ? bytesFromHex(hex) : null;
    const prior = stepsFromRecord(view?.events);
    const published = typeof view?.server_seed_hash === "string" ? view.server_seed_hash : "";
    if (!seed || seed.length !== 32 || !prior) return fail("REPLAY_MISMATCH");

    const confirmed = await confirmedWinner(
      seed,
      published,
      [...prior, { kind: "shot", input: shot, hash: played.hash }],
      table.physics,
    );
    if (
      !confirmed.ok ||
      confirmed.hash !== played.hash ||
      confirmed.winner !== played.state.winner
    ) {
      return fail("REPLAY_MISMATCH");
    }

    const committed = await db.rpc("pool_commit_shot", {
      p_match: data.matchId,
      p_seq: seq,
      p_state: played.state,
      p_hash: played.hash,
      p_event: played.event,
    });
    if (committed.error) return fail(rpcError(committed.error));
    const done = asRecord(committed.data);
    return {
      ok: true as const,
      duplicate: done?.duplicate === true,
      matchId: data.matchId,
      hash: played.hash,
      winner: played.state.winner,
    };
  });
