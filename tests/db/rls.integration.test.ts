/**
 * Access-rule checks against the live API as an anonymous client.
 * Verifies that game-critical and private data cannot be read or changed
 * from the browser. Requires SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const d = url && key ? describe : describe.skip;

d("access rules (anonymous client)", () => {
  const sb = createClient(url!, key!, { auth: { persistSession: false } });

  it("cannot read private wallet, ledger, secrets or audit data", async () => {
    for (const t of ["wallet_accounts", "ledger_postings", "ledger_transactions", "audit_logs", "jackpot_game_secrets", "user_roles"]) {
      const { data } = await sb.from(t).select("*").limit(1);
      expect(data ?? []).toEqual([]);
    }
  });

  it("can read public game data but no unrevealed seed", async () => {
    const { data, error } = await sb.from("jackpot_games").select("id, status, server_seed, server_seed_hash").in("status", ["WAITING", "ACTIVE"]);
    expect(error).toBeNull();
    for (const g of data ?? []) expect(g.server_seed).toBeNull();
  });

  it("cannot write game or financial tables directly", async () => {
    const fake = "00000000-0000-0000-0000-000000000000";
    const attempts = [
      sb.from("jackpot_entries").insert({ game_id: 1, user_id: fake, amount: 100, ticket_start: 0, ticket_end: 100, ledger_tx_id: fake, idempotency_key: "xxxxxxxxxx" }),
      sb.from("jackpot_games").update({ pot_amount: 999999 }).gte("id", 0),
      sb.from("wallet_accounts").update({ balance: 999999 }).eq("owner_id", fake),
      sb.from("ledger_transactions").insert({ kind: "deposit", idempotency_key: "x" }),
      sb.from("profiles").insert({ id: fake, username: "hacker", age_confirmed_at: new Date().toISOString() }),
    ];
    for (const a of attempts) {
      const { error, data } = await a;
      expect(error ?? (data === null || (Array.isArray(data) && data.length === 0))).toBeTruthy();
    }
    const { data: g } = await sb.from("jackpot_games").select("pot_amount").eq("pot_amount", 999999);
    expect(g ?? []).toEqual([]);
  });

  it("cannot call internal engine functions or join without signing in", async () => {
    for (const [fn, args] of [
      ["jackpot_settle", { p_game_id: 1 }],
      ["_post", { p_tx: "00000000-0000-0000-0000-000000000000", p_account: "00000000-0000-0000-0000-000000000000", p_amount: 1 }],
      ["_ensure_open_game", {}],
      ["admin_overview", {}],
      ["claim_test_credits", {}],
    ] as const) {
      const { error } = await sb.rpc(fn as never, args as never);
      expect(error).not.toBeNull();
    }
    const { error } = await sb.rpc("jackpot_join", { p_amount: 100, p_idempotency_key: "abcdefgh12" });
    expect(error).not.toBeNull();
  });

  it("the public tick cannot close a game early", async () => {
    const { data: before } = await sb.from("jackpot_games").select("id, status, scheduled_end_at").in("status", ["WAITING", "ACTIVE"]).maybeSingle();
    await sb.rpc("jackpot_tick");
    if (before && (before.status === "WAITING" || new Date(before.scheduled_end_at!).getTime() > Date.now() + 3000)) {
      const { data: after } = await sb.from("jackpot_games").select("status").eq("id", before.id).single();
      expect(after!.status).toBe(before.status);
    }
  });

  it("coinflip: secrets hidden, results hidden before flip, no unrevealed seeds", async () => {
    const { data: sec } = await sb.from("coinflip_game_secrets").select("*").limit(5);
    expect(sec ?? []).toEqual([]);
    const { data: games } = await sb.from("coinflip_games").select("id, status, server_seed, winner_id, winning_side").limit(200);
    for (const g of games ?? []) {
      if (g.status !== "COMPLETED") expect(g.server_seed).toBeNull();
      if (["WAITING", "READY", "CANCELLED"].includes(g.status)) {
        expect(g.winner_id).toBeNull();
        expect(g.winning_side).toBeNull();
      }
    }
    const hidden = (games ?? []).filter((g) => g.status === "READY").map((g) => g.id);
    if (hidden.length) {
      const { data: res } = await sb.from("coinflip_results").select("*").in("game_id", hidden);
      expect(res ?? []).toEqual([]);
    }
  });

  it("coinflip: no direct writes and no internal functions from the browser", async () => {
    const fake = "00000000-0000-0000-0000-000000000000";
    const writes = [
      sb.from("coinflip_games").update({ winner_id: fake }).gte("id", 0),
      sb.from("coinflip_results").insert({ game_id: 1, protocol_version: "v1", draw_version: 1, server_seed_hash: "0".repeat(64), message: "x", hmac_hex: "0".repeat(64), first_byte: 0, winning_side: "HEADS", winner_id: fake }),
      sb.from("coinflip_payouts").update({ status: "SETTLED" }).gte("game_id", 0),
      sb.from("coinflip_entries").insert({ game_id: 1, user_id: fake, slot: 2, side: "HEADS", amount: 100, ledger_tx_id: fake, idempotency_key: "xxxxxxxxxx" }),
    ];
    for (const w of writes) {
      const { error, data } = await w;
      expect(error ?? (data === null || (Array.isArray(data) && data.length === 0))).toBeTruthy();
    }
    for (const [fn, args] of [
      ["coinflip_advance", { p_game_id: 1 }],
      ["_coinflip_refund", { p_game_id: 1, p_reason: "EXPIRED" }],
      ["coinflip_create", { p_amount: 100, p_side: "HEADS", p_idempotency_key: "abcdefgh12" }],
      ["coinflip_join", { p_game_id: 1, p_idempotency_key: "abcdefgh12" }],
      ["coinflip_cancel", { p_game_id: 1 }],
      ["admin_coinflip_overview", {}],
    ] as const) {
      const { error } = await sb.rpc(fn as never, args as never);
      expect(error).not.toBeNull();
    }
    const { error } = await sb.rpc("coinflip_tick");
    expect(error).toBeNull();
  });
});
