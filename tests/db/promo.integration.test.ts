/**
 * Promo codes: claim, ledger, wagering, withdrawal hold, and adversarial cases.
 * Isolated pvp_test schema. Requires TEST_DATABASE_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { coverDepositWager, fundTestTreasury, migrateTestSchemaToReal } from "./money";
import { promoTestIp } from "./promo-client-ip";
import { BTC_QUOTE_RATE, quoteExpiry, quotedSats } from "./btc-quote";
import { testDatabaseUrl } from "./test-url";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 12, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);

const adminSessions = new Map<string, string>();

function adminClaims(uid: string | null): string | null {
  if (!uid) return null;
  const sessionId = adminSessions.get(uid);
  if (!sessionId) return null;
  return JSON.stringify({ role: "authenticated", sub: uid, session_id: sessionId });
}

async function as<T>(
  uid: string | null,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  const claims = adminClaims(uid);
  return sql.begin(async (tx) => {
    if (claims)
      await tx`select set_config('test.uid', ${uid ?? ""}, true), set_config('request.jwt.claims', ${claims}, true)`;
    else await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

const err = async (p: Promise<unknown>) => {
  try {
    await p;
    return "";
  } catch (e) {
    return String((e as Error).message);
  }
};

async function user(name: string) {
  const id = randomUUID();
  const username = (name + id.replace(/-/g, "")).slice(0, 20);
  await sql`select pvp_test.ensure_profile(${username}, true)
    from (select set_config('test.uid', ${id}, true)) c`;
  return id;
}

async function admin() {
  const id = await user("adm");
  const sessionId = randomUUID();
  const deviceId = randomUUID();
  const tokenHash = randomBytes(32).toString("hex");
  await sql`insert into pvp_test.user_roles (user_id, role) values (${id}::uuid, 'admin')`;
  await sql`insert into pvp_test.admin_devices (id, user_id, token_hash, verified_at)
    values (${deviceId}::uuid, ${id}::uuid, ${tokenHash}, clock_timestamp())`;
  await sql`insert into pvp_test.test_auth_sessions (id, user_id)
    values (${sessionId}::uuid, ${id}::uuid)`;
  await sql`insert into pvp_test.admin_stepup (session_id, user_id, device_id)
    values (${sessionId}::uuid, ${id}::uuid, ${deviceId}::uuid)`;
  adminSessions.set(id, sessionId);
  return id;
}

const bal = async (uid: string, type = "test_credit") =>
  Number(
    (
      await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid} and kind = 'user_available' and account_type = ${type}`
    )[0]?.balance ?? 0,
  );

async function createCode(
  actor: string,
  code: string,
  cents = 200,
  max = 10,
  expires: string | null = null,
) {
  const claims = adminClaims(actor) ?? "";
  const row = (
    await sql`select pvp_test.promo_admin_create(${code}, ${cents}::bigint, ${max}, ${expires}::timestamptz) r
      from (select set_config('test.uid', ${actor}, true), set_config('request.jwt.claims', ${claims}, true)) c`
  )[0].r as { ok: boolean; code: string };
  return row;
}

async function claim(
  uid: string,
  code: string,
  opts?: { ip?: string | null; headers?: string },
) {
  const ip = opts && "ip" in opts ? (opts.ip ?? "") : promoTestIp(uid);
  const headers = opts?.headers ?? "";
  const row = (
    await sql`select pvp_test.promo_claim(${code}) r
      from (select set_config('test.uid', ${uid}, true), set_config('test.client_ip', ${ip}, true), set_config('request.headers', ${headers}, true)) c`
  )[0].r as {
    ok: boolean;
    reason?: string;
    reward_cents?: number;
    required_wager_cents?: number;
  };
  return row;
}

async function claimRow(uid: string, code: string) {
  const rows =
    await sql`select pc.status, pc.reward_cents, pc.required_wager_cents, pc.qualifying_wager_cents, pc.ledger_tx_id
    from pvp_test.promo_claims pc
    join pvp_test.promo_codes c on c.id = pc.promo_code_id
    where pc.user_id = ${uid}::uuid and c.code = ${code}`;
  return rows[0] as
    | {
        status: string;
        reward_cents: string;
        required_wager_cents: string;
        qualifying_wager_cents: string;
        ledger_tx_id: string;
      }
    | undefined;
}

const rewardTx = async (uid: string) =>
  Number(
    (
      await sql`select count(*)::int n from pvp_test.ledger_transactions where user_id = ${uid}::uuid and kind = 'promo_reward'`
    )[0].n,
  );

async function ledger(owner: string, kind: string, accountType = "test_credit") {
  const id = randomUUID();
  await sql`insert into pvp_test.ledger_transactions (id, kind, idempotency_key, account_type, user_id)
    values (${id}::uuid, ${kind}::pvp_test.tx_kind, ${id}, ${accountType}, ${owner}::uuid)`;
  return id;
}

async function jackpotStake(owner: string, cents: number) {
  await sql`update pvp_test.jackpot_games set status = 'CANCELLED' where status = 'WAITING'`;
  const game = (
    await sql`insert into pvp_test.jackpot_games (asset, account_type, rake_bps, min_entry, max_entry, countdown_seconds, extension_seconds, max_duration_seconds, server_seed_hash)
    select asset, account_type, rake_bps, min_entry, max_entry, countdown_seconds, extension_seconds, max_duration_seconds, ${"cd".repeat(32)}
    from pvp_test.jackpot_config returning id`
  )[0].id as number;
  await sql`insert into pvp_test.jackpot_players (game_id, user_id, total_amount, entry_count, first_entry_at, last_entry_at)
    values (${game}, ${owner}::uuid, ${cents}, 1, now(), now())`;
  await sql`update pvp_test.jackpot_games set status = 'ACTIVE', scheduled_end_at = now(), max_end_at = now() + interval '1 hour',
    pot_amount = ${cents}, player_count = 1, entry_count = 1 where id = ${game}`;
  await sql`update pvp_test.jackpot_games set status = 'DRAWING' where id = ${game}`;
  await sql`update pvp_test.jackpot_games set status = 'COMPLETED', server_seed = ${"ab".repeat(16)}, winning_ticket = 0,
    winner_id = ${owner}::uuid, winner_total = ${cents}, drawn_at = now(), completed_at = now(),
    rake_amount = (${cents} * rake_bps) / 10000, payout_amount = ${cents} - (${cents} * rake_bps) / 10000
    where id = ${game}`;
  return game;
}

async function coinflipStake(owner: string, cents: number, cancel = false) {
  const opponent = await user("opp");
  const game = (
    await sql`insert into pvp_test.coinflip_games (creator_id, creator_side, amount, pot_amount, fee_bps, money_domain, asset, account_type, server_seed_hash, expires_at)
    values (${owner}::uuid, 'HEADS', ${cents}, ${cents * 2}, 500, 'REAL_USD', 'USD', 'real', ${"ab".repeat(32)}, now() + interval '1 hour')
    returning id`
  )[0].id as number;
  const tx1 = await ledger(owner, "coinflip_entry", "real");
  const tx2 = await ledger(opponent, "coinflip_entry", "real");
  await sql`insert into pvp_test.coinflip_entries (game_id, user_id, slot, side, amount, ledger_tx_id, idempotency_key)
    values (${game}, ${owner}::uuid, 1, 'HEADS', ${cents}, ${tx1}::uuid, ${randomUUID()}),
           (${game}, ${opponent}::uuid, 2, 'TAILS', ${cents}, ${tx2}::uuid, ${randomUUID()})`;
  if (cancel) {
    await sql`update pvp_test.coinflip_games set status = 'CANCELLED', cancelled_at = now(), cancel_reason = 'CREATOR_CANCELLED' where id = ${game}`;
    return game;
  }
  await sql`update pvp_test.coinflip_games set status = 'READY', opponent_id = ${opponent}::uuid,
    joined_at = now() - interval '2 minutes', animation_start_at = now() - interval '1 minute', animation_end_at = now() - interval '30 seconds'
    where id = ${game}`;
  await sql`insert into pvp_test.coinflip_results (game_id, protocol_version, draw_version, server_seed_hash, message, hmac_hex, first_byte, winning_side, winner_id)
    values (${game}, 'v1', 1, ${"ab".repeat(32)}, 'm', ${"cd".repeat(32)}, 0, 'HEADS', ${owner}::uuid)`;
  await sql`update pvp_test.coinflip_games set status = 'FLIPPING', winner_id = ${owner}::uuid, winning_side = 'HEADS' where id = ${game}`;
  await sql`update pvp_test.coinflip_games set status = 'SETTLEMENT' where id = ${game}`;
  await sql`update pvp_test.coinflip_games set status = 'COMPLETED', server_seed = ${"ef".repeat(16)}, completed_at = now(),
    fee_amount = (pot_amount * fee_bps) / 10000, payout_amount = pot_amount - (pot_amount * fee_bps) / 10000
    where id = ${game}`;
  return game;
}

async function wheelBet(owner: string, cents: number, next: "WON" | "LOST" | "REFUNDED") {
  if (!/^[0-9a-f-]{36}$/i.test(owner) || !Number.isSafeInteger(cents) || cents < 0)
    throw new Error("bad wheel bet");
  if (next !== "WON" && next !== "LOST" && next !== "REFUNDED") throw new Error("bad bet status");
  const tx = randomUUID();
  const bet = randomUUID();
  const payout = next === "WON" ? cents * 2 : 0;
  await sql.unsafe(`
    do $fix$
    declare gid bigint;
    begin
      insert into pvp_test.ledger_transactions (id, kind, idempotency_key, account_type, user_id)
      values ('${tx}', 'roulette_entry', '${tx}', 'real', '${owner}');
      insert into pvp_test.roulette_games (status, wheel_version, money_domain, asset, account_type, min_bet, max_bet, max_pot, max_bets_per_user, max_bets_per_round, betting_seconds, lock_ms, spin_ms, stuck_cancel_seconds, server_seed_hash)
      select 'LOCKED', wheel_version, 'REAL_USD', 'USD', 'real', min_bet, max_bet, max_pot, max_bets_per_user, max_bets_per_round, betting_seconds, lock_ms, spin_ms, stuck_cancel_seconds, '${"ab".repeat(32)}'
      from pvp_test.roulette_config returning id into gid;
      insert into pvp_test.roulette_bets (id, game_id, user_id, color, amount, multiplier_bps, ledger_tx_id, idempotency_key)
      values ('${bet}', gid, '${owner}', 'RED', ${cents}, 20000, '${tx}', '${randomUUID()}');
      update pvp_test.roulette_bets set status = '${next}'::pvp_test.roulette_bet_status, settled_at = now(), payout_amount = ${payout} where id = '${bet}';
    end
    $fix$;
  `);
  return bet;
}

d("promo codes (isolated schema)", () => {
  const addr = () => "0x" + randomBytes(20).toString("hex");
  const txh = () => "0x" + randomBytes(32).toString("hex");
  let treasury = "";

  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    await sql.unsafe(`alter table pvp_test.chain_networks disable trigger user;
      update pvp_test.chain_networks set is_enabled = true where chain_id = 84532;
      alter table pvp_test.chain_networks enable trigger user;
      alter table pvp_test.chain_assets disable trigger user;
      update pvp_test.chain_assets set is_enabled = true, ledger_asset = 'USD', ledger_account_type = 'real' where chain_id = 84532;
      alter table pvp_test.chain_assets enable trigger user;
      alter table pvp_test.chain_treasury_accounts disable trigger user;
      update pvp_test.chain_treasury_accounts set is_active = true where chain_id = 84532;
      alter table pvp_test.chain_treasury_accounts enable trigger user;`);
    treasury = (
      await sql`select address from pvp_test.chain_treasury_accounts where role = 'deposit' and chain_id = 84532`
    )[0].address.toLowerCase();
    await sql`update pvp_test.crypto_settings set daily_limit_cents = 100000000, daily_global_limit_cents = 1000000000, auto_approve_cents = 100000000, withdrawal_fee_cents = 0`;
    await sql`select pvp_test._system_account('house_bankroll', 'USD', 'real')`;
    await sql`update pvp_test.wallet_accounts set balance = balance + 100000 where owner_id is null and kind = 'house_bankroll' and asset = 'USD' and account_type = 'real'`;
  }, 180000);
  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  it("credits the ledger once, normalizes the code, and ignores client amounts", async () => {
    const a = await admin();
    const u = await user("ply");
    const before = await bal(u, "real");
    expect((await createCode(a, "welcome2", 200, 3)).ok).toBe(true);
    const ok = await claim(u, "  welcome2  ");
    expect(ok).toMatchObject({ ok: true, reward_cents: 200, required_wager_cents: 200 });
    expect(await bal(u, "real")).toBe(before + 200);
    expect(await rewardTx(u)).toBe(1);
    const row = await claimRow(u, "WELCOME2");
    expect(row?.status).toBe("CLAIMED");
    expect(Number(row?.qualifying_wager_cents)).toBe(0);
    const again = await claim(u, "WELCOME2");
    expect(again).toEqual({ ok: false, reason: "PROMO_ALREADY_REDEEMED" });
    expect(await rewardTx(u)).toBe(1);
    expect(await bal(u, "real")).toBe(before + 200);
    const posts =
      await sql`select coalesce(sum(amount),0)::bigint s from pvp_test.ledger_postings where tx_id = ${row!.ledger_tx_id}::uuid`;
    expect(Number(posts[0].s)).toBe(0);
    await expect(sql`select pvp_test.promo_claim('WELCOME2', 500000)`).rejects.toThrow();
  });

  it("credits a real promo when house_bankroll is already negative", async () => {
    const a = await admin();
    const u = await user("neg");
    await sql`update pvp_test.wallet_accounts set balance = -50
      where owner_id is null and kind = 'house_bankroll' and asset = 'USD' and account_type = 'real'`;
    expect((await createCode(a, "NEGBANK", 100, 1)).ok).toBe(true);
    const before = await bal(u, "real");
    expect(await claim(u, "NEGBANK")).toMatchObject({ ok: true, reward_cents: 100 });
    expect(await bal(u, "real")).toBe(before + 100);
    await sql`update pvp_test.wallet_accounts set balance = 100000
      where owner_id is null and kind = 'house_bankroll' and asset = 'USD' and account_type = 'real'`;
  });

  it("rejects invalid, inactive, expired, exhausted, and injection-shaped codes the same way", async () => {
    const a = await admin();
    const u = await user("bad");
    expect((await claim(u, "NOPE")).ok).toBe(false);
    expect((await claim(u, "'; drop table pvp_test.promo_codes; --")).reason).toBe("unavailable");
    expect(String((await sql`select to_regclass('pvp_test.promo_codes') t`)[0].t)).toContain(
      "promo_codes",
    );
    await createCode(a, "OFFNOW", 100, 5);
    const offId = (await sql`select id from pvp_test.promo_codes where code = 'OFFNOW'`)[0]
      .id as string;
    await as(
      a,
      (tx) => tx`select pvp_test.promo_admin_update(${offId}::uuid, false, 5, null, false)`,
    );
    expect((await claim(u, "OFFNOW")).reason).toBe("unavailable");
    const past = new Date(Date.now() + 60_000).toISOString();
    await createCode(a, "SOONEX", 100, 5, past);
    await sql`update pvp_test.promo_codes set expires_at = now() - interval '1 minute' where code = 'SOONEX'`;
    expect((await claim(u, "SOONEX")).reason).toBe("unavailable");
    await createCode(a, "ONELEFT", 100, 1);
    expect((await claim(u, "ONELEFT")).ok).toBe(true);
    const other = await user("oth");
    expect((await claim(other, "ONELEFT")).reason).toBe("unavailable");
    expect(await rewardTx(other)).toBe(0);
    await expect(createCode(a, "BADAMT", 50, 1)).rejects.toThrow(/BAD_REWARD/);
    await expect(createCode(a, "HUGE", 500000, 1)).rejects.toThrow(/BAD_REWARD/);
    await expect(
      as(u, (tx) => tx`select pvp_test.promo_admin_create('USER1', 200, 1, null)`),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(as(null, (tx) => tx`select pvp_test.promo_claim('ONELEFT')`)).rejects.toThrow(
      /AUTH_REQUIRED/,
    );
  }, 60000);

  it("one user racing the same code is paid once, and the last claim is not doubled", async () => {
    const a = await admin();
    const u = await user("race");
    await createCode(a, "RACECODE", 300, 5);
    const results = await Promise.all(Array.from({ length: 8 }, () => claim(u, "RACECODE")));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await rewardTx(u)).toBe(1);
    expect(
      Number(
        (await sql`select claim_count from pvp_test.promo_codes where code = 'RACECODE'`)[0]
          .claim_count,
      ),
    ).toBe(1);

    await createCode(a, "LASTONE", 100, 1);
    const racers = await Promise.all(Array.from({ length: 6 }, () => user("r")));
    const finishes = await Promise.all(racers.map((id) => claim(id, "LASTONE")));
    expect(finishes.filter((r) => r.ok)).toHaveLength(1);
    expect(
      Number(
        (await sql`select claim_count from pvp_test.promo_codes where code = 'LASTONE'`)[0]
          .claim_count,
      ),
    ).toBe(1);
    expect(
      Number(
        (
          await sql`select count(*)::int n from pvp_test.promo_claims pc join pvp_test.promo_codes c on c.id = pc.promo_code_id where c.code = 'LASTONE'`
        )[0].n,
      ),
    ).toBe(1);
  });

  it("counts settled stakes on every game once; cancels, refunds and replays never count", async () => {
    const a = await admin();
    const u = await user("wgr");
    await wheelBet(u, 500, "LOST");
    await createCode(a, "PLAY200", 200, 5);
    expect((await claim(u, "PLAY200")).ok).toBe(true);
    expect(Number((await claimRow(u, "PLAY200"))?.qualifying_wager_cents)).toBe(0);

    await coinflipStake(u, 5000, true);
    expect((await claimRow(u, "PLAY200"))?.status).toBe("CLAIMED");
    expect(Number((await claimRow(u, "PLAY200"))?.qualifying_wager_cents)).toBe(0);

    const game = await jackpotStake(u, 100);
    await sql`select pvp_test.promo_apply_wager(${u}::uuid, 'jackpot', ${game + ":" + u})`;
    expect((await claimRow(u, "PLAY200"))?.status).toBe("WAGERING");
    expect(Number((await claimRow(u, "PLAY200"))?.qualifying_wager_cents)).toBe(100);

    const first = await wheelBet(u, 40, "LOST");
    expect(Number((await claimRow(u, "PLAY200"))?.qualifying_wager_cents)).toBe(140);
    await sql`update pvp_test.roulette_bets set amount = 99999 where id = ${first}::uuid`.catch(
      () => undefined,
    );
    await sql`select pvp_test.promo_apply_wager(${u}::uuid, 'roulette', ${first})`;
    expect(Number((await claimRow(u, "PLAY200"))?.qualifying_wager_cents)).toBe(140);

    await wheelBet(u, 40, "REFUNDED");
    expect(Number((await claimRow(u, "PLAY200"))?.qualifying_wager_cents)).toBe(140);
    const bet = await wheelBet(u, 60, "WON");
    expect((await claimRow(u, "PLAY200"))?.status).toBe("COMPLETED");
    expect(Number((await claimRow(u, "PLAY200"))?.qualifying_wager_cents)).toBe(200);
    await sql`select pvp_test.promo_apply_wager(${u}::uuid, 'roulette', ${bet})`;
    expect(Number((await claimRow(u, "PLAY200"))?.qualifying_wager_cents)).toBe(200);

    const stranger = await user("str");
    await createCode(a, "OTHER1", 200, 5);
    await claim(stranger, "OTHER1");
    await sql`select pvp_test.promo_apply_wager(${stranger}::uuid, 'jackpot', ${game + ":" + u})`;
    await sql`select pvp_test.promo_apply_wager(${stranger}::uuid, 'jackpot', 'not-a-game')`;
    await sql`select pvp_test.promo_apply_wager(${stranger}::uuid, 'jackpot', ${"x".repeat(90)})`;
    expect(Number((await claimRow(stranger, "OTHER1"))?.qualifying_wager_cents)).toBe(0);
  }, 60000);

  it("rejects a second promo for the same account and blocks illegal claim edits", async () => {
    const a = await admin();
    const u = await user("stk");
    await createCode(a, "STACKA", 200, 5);
    await createCode(a, "STACKB", 300, 5);
    expect((await claim(u, "STACKA")).ok).toBe(true);
    expect((await claim(u, "STACKB")).reason).toBe("PROMO_ALREADY_REDEEMED");
    expect(await rewardTx(u)).toBe(1);
    await wheelBet(u, 250, "LOST");
    const aRow = await claimRow(u, "STACKA");
    expect(aRow?.status).toBe("COMPLETED");
    expect(Number(aRow?.qualifying_wager_cents)).toBe(200);
    expect(await claimRow(u, "STACKB")).toBeUndefined();
    expect(Number((await sql`select pvp_test.promo_restricted_cents(${u}::uuid) n`)[0].n)).toBe(0);
    const claimId = (
      await sql`select pc.id from pvp_test.promo_claims pc join pvp_test.promo_codes c on c.id = pc.promo_code_id where c.code = 'STACKA' and pc.user_id = ${u}::uuid`
    )[0].id;
    await expect(
      sql`update pvp_test.promo_claims set reward_cents = 500 where id = ${claimId}::uuid`,
    ).rejects.toThrow(/IMMUTABLE/);
    await expect(
      sql`update pvp_test.promo_claims set status = 'COMPLETED', qualifying_wager_cents = 0 where id = ${claimId}::uuid`,
    ).rejects.toThrow(/ILLEGAL_TRANSITION/);
    await expect(
      sql`update pvp_test.promo_claims set qualifying_wager_cents = 10 where id = ${claimId}::uuid`,
    ).rejects.toThrow(/ILLEGAL_TRANSITION/);
    await expect(
      sql`update pvp_test.promo_codes set reward_cents = 500 where code = 'STACKA'`,
    ).rejects.toThrow(/IMMUTABLE/);
  });

  it("browser roles cannot write promo tables or call internal functions", async () => {
    for (const table of ["promo_codes", "promo_claims", "promo_wagers", "promo_claim_attempts"]) {
      const [r] = await sql`select
        has_table_privilege('anon', ${"pvp_test." + table}, 'insert') ai,
        has_table_privilege('authenticated', ${"pvp_test." + table}, 'update') uu,
        has_table_privilege('authenticated', ${"pvp_test." + table}, 'delete') ud,
        has_table_privilege('anon', ${"pvp_test." + table}, 'select') asel`;
      expect(r).toEqual({ ai: false, uu: false, ud: false, asel: false });
    }
    const fns = [
      "promo_apply_wager(uuid,text,text)",
      "promo_restricted_cents(uuid)",
      "_assert_reward_holds(uuid,bigint,bigint)",
      "_cash_room(uuid)",
      "_withdraw_basis(uuid)",
    ];
    for (const f of fns) {
      const [r] = await sql.unsafe(
        `select has_function_privilege('anon','pvp_test.${f}','execute') a, has_function_privilege('authenticated','pvp_test.${f}','execute') u`,
      );
      expect({ f, ...r }).toEqual({ f, a: false, u: false });
    }
    const [claimFn] =
      await sql`select has_function_privilege('anon','pvp_test.promo_claim(text)','execute') a,
      has_function_privilege('authenticated','pvp_test.promo_claim(text)','execute') u`;
    expect(claimFn).toEqual({ a: false, u: true });
    const hidden = ["_normalize_inet(text)", "_promo_client_ip()"];
    for (const f of hidden) {
      const [r] = await sql.unsafe(
        `select has_function_privilege('anon','pvp_test.${f}','execute') a, has_function_privilege('authenticated','pvp_test.${f}','execute') u`,
      );
      expect({ f, ...r }).toEqual({ f, a: false, u: false });
    }
  });

  it("lets one account and one network redeem once, and keeps the credit atomic", async () => {
    const a = await admin();
    await createCode(a, "ONCEA", 200, 20);
    await createCode(a, "ONCEB", 300, 20);
    await createCode(a, "ONCEC", 100, 20);
    const first = await user("once");
    const before = await bal(first, "real");
    expect((await claim(first, "ONCEA", { ip: "203.0.113.10" })).ok).toBe(true);
    expect((await claim(first, "ONCEB", { ip: "203.0.113.11" })).reason).toBe(
      "PROMO_ALREADY_REDEEMED",
    );
    expect((await claim(first, "ONCEA", { ip: "203.0.113.10" })).reason).toBe(
      "PROMO_ALREADY_REDEEMED",
    );
    expect(await rewardTx(first)).toBe(1);
    expect(await bal(first, "real")).toBe(before + 200);
    const second = await user("once2");
    expect((await claim(second, "ONCEB", { ip: "203.0.113.10" })).reason).toBe(
      "PROMO_IP_ALREADY_REDEEMED",
    );
    expect(await rewardTx(second)).toBe(0);
    const third = await user("once3");
    expect((await claim(third, "ONCEC", { ip: "198.51.100.8" })).ok).toBe(true);
    expect(await rewardTx(third)).toBe(1);
    await expect(
      sql`delete from pvp_test.promo_claims where user_id = ${first}::uuid`,
    ).rejects.toThrow(/IMMUTABLE/);
    expect(
      Number(
        (await sql`select count(*)::int n from pvp_test.promo_claims where user_id = ${first}::uuid`)[0]
          .n,
      ),
    ).toBe(1);

    const mapped = await user("map");
    expect((await claim(mapped, "ONCEA", { ip: "::ffff:203.0.113.10" })).reason).toBe(
      "PROMO_IP_ALREADY_REDEEMED",
    );
    const v6a = await user("v6a");
    const v6b = await user("v6b");
    expect((await claim(v6a, "ONCEB", { ip: "2001:0db8:0000:0000:0000:0000:0000:0002" })).ok).toBe(
      true,
    );
    expect((await claim(v6b, "ONCEC", { ip: "2001:db8::2" })).reason).toBe(
      "PROMO_IP_ALREADY_REDEEMED",
    );
    const spoiled = await user("spf");
    expect(
      (
        await claim(spoiled, "ONCEA", {
          ip: "198.51.100.99",
          headers: JSON.stringify({
            "x-forwarded-for": "198.51.100.20, 203.0.113.10",
            "x-real-ip": "198.51.100.21",
            "cf-connecting-ip": "203.0.113.60",
          }),
        })
      ).ok,
    ).toBe(true);
    const stored = (
      await sql`select host(client_ip) ip from pvp_test.promo_claims where user_id = ${spoiled}::uuid`
    )[0].ip as string;
    expect(stored).toBe("203.0.113.60");
    const forged = await user("frg");
    expect(
      (
        await claim(forged, "ONCEB", {
          ip: "",
          headers: JSON.stringify({
            "x-forwarded-for": "203.0.113.77",
            "x-real-ip": "203.0.113.77",
          }),
        })
      ).reason,
    ).toBe("unavailable");
    expect(await rewardTx(forged)).toBe(0);
    const messy = await user("mes");
    expect((await claim(messy, "ONCEC", { ip: "203.0.113.12, 198.51.100.1" })).reason).toBe(
      "unavailable",
    );
    expect((await claim(messy, "not a code", { ip: "203.0.113.13" })).reason).toBe("unavailable");
    expect((await claim(messy, "ONCEC", { ip: "203.0.113.13" })).ok).toBe(true);
    expect(await rewardTx(messy)).toBe(1);
  }, 60000);

  it("allows many distinct accounts to claim the same code until max_claims", async () => {
    const owner = await admin();
    expect((await createCode(owner, "BURST1", 100, 10)).ok).toBe(true);
    const ips = ["203.0.113.41", "203.0.113.42", "203.0.113.43", "203.0.113.44"];
    const people = [await user("bu1"), await user("bu2"), await user("bu3"), await user("bu4")];
    for (let i = 0; i < 4; i++) {
      expect((await claim(people[i]!, "BURST1", { ip: ips[i] })).ok).toBe(true);
    }
    expect(await rewardTx(people[3]!)).toBe(1);
  });

  it("still rejects an account whose promo credit remains after the claim row is gone", async () => {
    const a = await admin();
    const u = await user("ledg");
    await createCode(a, "LEDGER1", 200, 5);
    const paid = await claim(u, "LEDGER1", { ip: "203.0.113.40" });
    expect(paid.ok).toBe(true);
    const before = await bal(u, "real");
    await sql`alter table pvp_test.promo_claims disable trigger promo_claim_guard`;
    await sql`delete from pvp_test.promo_claims where user_id = ${u}::uuid`;
    await sql`alter table pvp_test.promo_claims enable trigger promo_claim_guard`;
    expect((await claim(u, "LEDGER1", { ip: "198.51.100.40" })).reason).toBe(
      "PROMO_ALREADY_REDEEMED",
    );
    expect(await bal(u, "real")).toBe(before);
    expect(await rewardTx(u)).toBe(1);
    const fresh = await user("newp");
    expect((await claim(fresh, "LEDGER1", { ip: "198.51.100.41" })).ok).toBe(true);
    expect(await rewardTx(fresh)).toBe(1);
  });

  it("pays one credit when the same account or the same network redeems concurrently", async () => {
    const a = await admin();
    const u = await user("race1");
    await createCode(a, "RACEONE", 200, 20);
    const sameAccount = await Promise.all(
      Array.from({ length: 10 }, () => claim(u, "RACEONE", { ip: "203.0.113.80" })),
    );
    expect(sameAccount.filter((r) => r.ok)).toHaveLength(1);
    expect(
      sameAccount
        .filter((r) => !r.ok)
        .every((r) => r.reason === "PROMO_ALREADY_REDEEMED" || r.reason === "unavailable"),
    ).toBe(true);
    expect(await rewardTx(u)).toBe(1);

    const accounts = await Promise.all(Array.from({ length: 10 }, (_, i) => user("ip" + i)));
    const codes = ["IPCODE1", "IPCODE2", "IPCODE3", "IPCODE4", "IPCODE5", "IPCODE6", "IPCODE7", "IPCODE8", "IPCODE9", "IPCODE0"];
    for (const code of codes) await createCode(a, code, 100, 5);
    const sameIp = await Promise.all(
      accounts.map((id, i) => claim(id, codes[i], { ip: "2001:db8::50" })),
    );
    expect(sameIp.filter((r) => r.ok)).toHaveLength(1);
    expect(sameIp.filter((r) => !r.ok).every((r) => r.reason === "PROMO_IP_ALREADY_REDEEMED")).toBe(
      true,
    );
    const paid = Number(
      (
        await sql`select count(*)::int n from pvp_test.ledger_transactions where kind = 'promo_reward' and user_id in ${sql(accounts)}`
      )[0].n,
    );
    expect(paid).toBe(1);
    expect(
      Number(
        (
          await sql`select count(*)::int n from pvp_test.promo_claims where client_ip = '2001:db8::50'::inet`
        )[0].n,
      ),
    ).toBe(1);
  }, 60000);

  it("rolls the redemption back when the ledger credit fails", async () => {
    const a = await admin();
    const u = await user("roll");
    await createCode(a, "ROLLBK", 200, 5);
    const accountId = (
      await sql`select id from pvp_test.wallet_accounts
        where owner_id = ${u}::uuid and kind = 'user_available' and asset = 'USD' and account_type = 'real'`
    )[0].id as string;
    let release!: () => void;
    const releaseLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    let locked!: () => void;
    const lockHeld = new Promise<void>((resolve) => {
      locked = resolve;
    });
    const holder = sql.begin(async (tx) => {
      await tx`select id from pvp_test.wallet_accounts where id = ${accountId}::uuid for update`;
      locked();
      await releaseLock;
    });
    try {
      await lockHeld;
      // _post updates this available account. The lock times out inside that update,
      // so the credit raises and the claim transaction rolls back.
      await expect(
        sql`select pvp_test.promo_claim('ROLLBK') r
          from (select set_config('test.uid', ${u}, true),
                       set_config('test.client_ip', ${"203.0.113.90"}, true),
                       set_config('lock_timeout', '500ms', true)) c`,
      ).rejects.toThrow(/lock timeout/i);
      expect(await rewardTx(u)).toBe(0);
      expect(
        Number(
          (await sql`select count(*)::int n from pvp_test.promo_claims where user_id = ${u}::uuid`)[0]
            .n,
        ),
      ).toBe(0);
    } finally {
      release();
      await holder;
    }
    expect((await claim(u, "ROLLBK", { ip: "203.0.113.90" })).ok).toBe(true);
    expect(await rewardTx(u)).toBe(1);
  });

  async function depositor(cents = 10000) {
    const id = randomUUID();
    const username = ("dep" + id.replace(/-/g, "")).slice(0, 20);
    const w = addr();
    const hash = txh();
    if (!/^[0-9a-f-]{36}$/i.test(id) || !/^0x[0-9a-f]{40}$/i.test(w) || !/^0x[0-9a-f]{64}$/i.test(hash))
      throw new Error("bad depositor");
    if (!/^0x[0-9a-f]{40}$/i.test(treasury) || !Number.isSafeInteger(cents) || cents < 0)
      throw new Error("bad depositor");
    await sql.unsafe(`
      do $dep$
      declare v_r jsonb;
      begin
        perform set_config('test.uid', '${id}', true);
        perform pvp_test.ensure_profile('${username}', true);
        insert into pvp_test.user_wallets (user_id, chain_type, address, normalized_address, wallet_provider, is_verified, is_primary, verified_at)
        values ('${id}', 'EVM', '${w}', '${w}', 'metamask', true, true, now());
        select pvp_test.crypto_observe_deposit(84532, 'USDC', '${hash}', 0, 100, '${w}', '${treasury}', '${cents * 10000}') into v_r;
        perform pvp_test.crypto_credit_deposit((v_r->>'id')::uuid, null);
      end
      $dep$;
    `);
    await coverDepositWager(sql, id, cents);
    return id;
  }

  const realBal = (uid: string) => bal(uid, "real");

  let funded = false;
  async function withdraw(uid: string, cents: number) {
    if (!funded) await fundTestTreasury(sql);
    funded = true;
    return err(
      sql`select pvp_test.crypto_request_withdrawal(${uid}::uuid, 84532, 'USDC', ${cents}::bigint, null, true)`,
    );
  }

  it("blocks the promo amount on the withdrawal function until the stake settles", async () => {
    const [a, u] = await Promise.all([admin(), depositor(10000)]);
    await createCode(a, "CASH200", 200, 5);
    const before = await realBal(u);
    expect((await claim(u, "CASH200")).ok).toBe(true);
    expect(await realBal(u)).toBe(before + 200);
    expect(await withdraw(u, before + 200)).toMatch(/PROMO_PLAYTHROUGH/);
    expect(await realBal(u)).toBe(before + 200);
    expect(await withdraw(u, 1000)).toBe("");
    expect(await realBal(u)).toBe(before + 200 - 1000);

    const done = await depositor(10000);
    await createCode(a, "CASHDONE", 200, 5);
    await claim(done, "CASHDONE");
    await wheelBet(done, 200, "WON");
    expect((await claimRow(done, "CASHDONE"))?.status).toBe("COMPLETED");
    const all = await realBal(done);
    expect(await withdraw(done, all)).toBe("");
    expect(await realBal(done)).toBe(0);
  });

  it("two concurrent withdrawals cannot both take the restricted balance", async () => {
    const a = await admin();
    const u = await depositor(10000);
    await createCode(a, "CASH2X", 200, 5);
    await claim(u, "CASH2X");
    const start = await realBal(u);
    const results = await Promise.all([withdraw(u, start), withdraw(u, start)]);
    const ok = results.filter((m) => m === "");
    const blocked = results.filter((m) => /PROMO_PLAYTHROUGH|WITHDRAWAL_PENDING/.test(m));
    expect(ok.length + blocked.length).toBe(2);
    expect(ok.length).toBeLessThanOrEqual(1);
    expect(await realBal(u)).toBeGreaterThanOrEqual(200);
  });

  it("bitcoin cashout uses the same hold", async () => {
    const a = await admin();
    const u = await depositor(10000);
    await createCode(a, "BTCHOLD", 500, 5);
    await claim(u, "BTCHOLD");
    const whole = await realBal(u);
    expect(
      await err(
        sql`select pvp_test.btcpay_request_payout(${u}::uuid, ${whole}::bigint, 'bc1qtestpromoaddress', ${quotedSats(whole)}::bigint, ${BTC_QUOTE_RATE}::bigint, ${quoteExpiry()}::timestamptz)`,
      ),
    ).toMatch(/PROMO_PLAYTHROUGH/);
    expect(await realBal(u)).toBe(whole);
  });
});
