import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const dir = "supabase/migrations/";
const read = (name: string) => readFileSync(dir + name, "utf8");
const base = read("20260923224342_e251cc26-5740-4e92-a808-6ff09a3667a8.sql");
const perUser = read("20261014355000_withdraw_basis_per_user.sql");
function fn(source: string, name: string) {
  const start = source.indexOf(`create or replace function public.${name}(`);
  if (start < 0) throw new Error(`Missing production helper ${name}`);
  const end = source.indexOf("$$;", source.indexOf("as $$", start));
  return source.slice(start, end + 3);
}
const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
const C = "00000000-0000-4000-8000-000000000003";
const D = "00000000-0000-4000-8000-000000000004";
let db: PGlite;
type MatchResult = {
  id: string;
  invite?: string;
  status: string;
  stake: number;
  ledger_game_id?: number;
  rematch_id: string | null;
};
type LobbyResult = { mine: MatchResult | null; open: MatchResult[]; live: MatchResult[] };

const fixture = `
create role anon; create role authenticated; create role service_role;
create schema auth; create schema extensions;
create function auth.jwt() returns jsonb language sql stable as $$
  select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
create table public.profiles(id uuid primary key,username text,self_excluded_until timestamptz,is_bot boolean default false);
create type public.account_kind as enum ('user_available','user_locked','house_revenue');
create type public.tx_kind as enum ('deposit','promo_reward','pool_entry','pool_settlement','pool_refund');
create table public.money_domain_config(asset text,account_type text,open boolean default true);
insert into money_domain_config values('USD','real',true);
create function public._play_domain_open() returns boolean language sql as $$ select open from money_domain_config $$;
create table public.wallet_accounts(id uuid primary key default gen_random_uuid(),owner_id uuid,
  kind account_kind,asset text,account_type text,balance bigint not null default 0,
  check (owner_id is null or balance>=0));
create unique index wallet_unique on wallet_accounts(coalesce(owner_id,'00000000-0000-0000-0000-000000000000'::uuid),kind,asset,account_type);
create table public.ledger_transactions(id uuid primary key default gen_random_uuid(),kind tx_kind,
  idempotency_key text unique,account_type text,user_id uuid,game_id bigint,memo text,created_at timestamptz default now());
create table public.ledger_postings(id bigint generated always as identity primary key,
  tx_id uuid references ledger_transactions(id),account_id uuid references wallet_accounts(id),amount bigint,balance_after bigint);
create table public.withdraw_basis_bucket(user_id uuid primary key,deposits bigint default 0,eligible bigint default 0,bonus bigint default 0);
create table public.withdraw_basis_stake(user_id uuid,game text,game_id bigint,eligible bigint,bonus bigint,primary key(user_id,game,game_id));
create table public.withdraw_basis_ledger_stake(ledger_tx_id uuid primary key,user_id uuid,eligible bigint,bonus bigint,stake_total bigint);
create table public.withdraw_basis_hold(id bigserial primary key,user_id uuid,eligible_part bigint,bonus_part bigint);
create table public.withdraw_basis_applied(tx_id uuid primary key,seq bigserial unique);
-- PGlite does not ship pgcrypto. These adapters use Postgres SHA-256 and UUID
-- entropy; deployed SQL uses the existing pgcrypto functions without replacement.
create function extensions.digest(text,text) returns bytea language sql as $$ select sha256(convert_to($1,'UTF8')) $$;
create function extensions.gen_random_bytes(int) returns bytea language sql as $$
  select substring(decode(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'hex') from 1 for $1) $$;
create table public.test_restrictions(user_id uuid primary key,partner boolean default false,promo bigint default 0,
  referral bigint default 0,prize bigint default 0,release bigint default 0,profit bigint default 0);
create function public._is_active_partner(uuid) returns boolean language sql as $$
  select coalesce((select partner from test_restrictions where user_id=$1),false) $$;
${[
  ["promo_restricted_cents", "promo"],
  ["referral_unplayed_reward_cents", "referral"],
  ["leaderboard_prize_restricted_cents", "prize"],
  ["_partner_profit_hold", "profit"],
]
  .map(
    ([name, col]) =>
      `create function public.${name}(uuid) returns bigint language sql as $$ select coalesce((select ${col} from test_restrictions where user_id=$1),0) $$;`,
  )
  .join("\n")}
create function public._partner_release_block(uuid,bigint) returns bigint language sql as $$
  select coalesce((select release from test_restrictions where user_id=$1),0) $$;
`;

async function claims(user: string | null = A, role = "authenticated") {
  await db.exec("reset role");
  await db.query(`select set_config('request.jwt.claims',$1,false)`, [
    JSON.stringify({
      role,
      ...(user ? { sub: user, session_id: user, exp: 4_000_000_000 } : {}),
    }),
  ]);
  await db.exec(`set role ${role}`);
}
async function rpc<T = MatchResult>(name: string, args: unknown[] = []) {
  const result = await db.query<{ v: T }>(
    `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) v`,
    args,
  );
  return result.rows[0].v;
}
async function admin(sql: string) {
  await db.exec("reset role");
  return db.exec(sql);
}
async function balance(user: string, kind = "user_available") {
  await db.exec("reset role");
  const { rows } = await db.query<{ b: number }>(
    `select balance::int b from wallet_accounts where owner_id=$1 and kind=$2::account_kind`,
    [user, kind],
  );
  return rows[0].b;
}
async function enter(stake = 100, best = 5, key = "create-key-0001", privateRoom = false) {
  return rpc("fps_enter", [stake, best, key, privateRoom, null]);
}
async function funded(stake = 100, privateRoom = false) {
  await claims(A);
  const g = await enter(stake, 5, "create-key-0001", privateRoom);
  await claims(B);
  return rpc("fps_join", [g.id, "join-key-000001", g.invite ?? null]);
}
async function finish(
  g: { id: string },
  winner: string | null = A,
  a = 3,
  b = 1,
  reason = "ROUNDS",
  runtime = g.id,
) {
  await claims(null, "service_role");
  return rpc("fps_finish", [g.id, winner, a, b, reason, runtime]);
}
async function record(
  g: { id: string },
  winner: string | null = A,
  a = 3,
  b = 1,
  reason = "ROUNDS",
  runtime = g.id,
) {
  await claims(null, "service_role");
  return rpc("fps_record_result", [g.id, winner, a, b, reason, runtime]);
}

describe("FPS isolated ledger and RPCs", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(fixture);
    // Execute the actual current production cash classifier and wallet primitives.
    for (const [source, names] of [
      [base, ["_immutable", "_system_account", "_user_account"]],
      [read("20260923232214_d6014858-9640-4aad-80a3-51b7a1bb756e.sql"), ["_coinflip_lock_wallets"]],
      [read("20261014356000_lock_order.sql"), ["_lock_system_accounts"]],
      [read("20260926133000_assert-live-session.sql"), ["_assert_live_session"]],
      [read("20261015046000_leaderboard_poker.sql"), ["_withdraw_basis_apply_tx"]],
      [
        perUser,
        [
          "_post",
          "_withdraw_basis_apply_one",
          "_withdraw_basis_apply_trg",
          "_withdraw_basis_writer_lock",
          "_withdraw_basis_sync",
        ],
      ],
    ] as Array<[string, string[]]>)
      for (const name of names) await db.exec(fn(source, name));
    await db.exec(`create trigger basis_writer before insert on ledger_transactions for each row execute function _withdraw_basis_writer_lock();
      create constraint trigger basis_apply after insert on ledger_transactions deferrable initially deferred
        for each row when (new.account_type='real') execute function _withdraw_basis_apply_trg();`);
    await db.exec(read("20261029192715_fps_ledger_matchmaking.sql"));
    await db.exec(read("20261029192803_fps_ledger_rpcs.sql"));
    expect((await db.query("select enabled,cash_enabled from fps_config")).rows).toEqual([
      { enabled: false, cash_enabled: false },
    ]);
  }, 60_000);
  afterAll(async () => {
    await db?.close();
  });
  beforeEach(async () => {
    await admin(`truncate fps_audit,fps_invite_secrets,fps_entries,fps_ratings,fps_matches,ledger_postings,
      ledger_transactions,withdraw_basis_bucket,withdraw_basis_stake,withdraw_basis_ledger_stake,
      withdraw_basis_applied,withdraw_basis_hold,wallet_accounts,profiles,auth.sessions,test_restrictions cascade;
      update fps_config set enabled=true,cash_enabled=true,practice_allowed=true;
      update money_domain_config set asset='USD',account_type='real',open=true;
      insert into profiles(id,username) values('${A}','alice'),('${B}','bob'),('${C}','eve'),('${D}','dave');
      insert into auth.sessions select id,id,null from profiles;
      insert into wallet_accounts(owner_id,kind,asset,account_type)
        select p.id,k::account_kind,'USD','real' from profiles p cross join unnest(array['user_available','user_locked']) k;
      do $$ declare u uuid; tx uuid; begin
        for u in select id from profiles order by id loop
          insert into ledger_transactions(kind,idempotency_key,account_type,user_id) values('deposit','seed:'||u,'real',u) returning id into tx;
          perform _post(tx,_user_account(u,'user_available','USD','real'),10000);
        end loop;
      end $$;`);
    await claims(A);
  });

  it("defaults disabled and advertises practice independently", async () => {
    await admin(`update fps_config set enabled=false,cash_enabled=false`);
    await claims(null, "anon");
    expect(await rpc<LobbyResult>("fps_lobby")).toMatchObject({
      enabled: false,
      cash_enabled: false,
      practice_allowed: true,
      open: [],
      mine: null,
      fee_bps: 500,
    });
    await claims(A);
    await expect(enter(0)).rejects.toThrow("FPS_DISABLED");
    await admin(`update fps_config set enabled=true,cash_enabled=false`);
    await claims(A);
    await expect(enter()).rejects.toThrow("CASH_DISABLED");
    const g = await enter(0);
    expect(g.stake).toBe(0);
    await claims(B);
    await rpc("fps_join", [g.id, "practice-join-01", null]);
    await finish(g);
    expect(await balance(A)).toBe(10000);
    const { rows } = await db.query(
      `select count(*)::int n from ledger_transactions where kind::text like 'fps_%'`,
    );
    expect(rows[0].n).toBe(0);
    await claims(null, "anon");
    expect(await rpc("fps_stats")).toEqual([]);
  });

  it("reserves exact cents, matches only equal selected terms, conserves pot and applies Elo once", async () => {
    const g = await enter(101);
    expect(g).toMatchObject({ status: "WAITING", runtime_id: g.id, stake: 101, best_of: 5 });
    expect(await balance(A)).toBe(9899);
    await claims(B);
    const joined = await enter(101, 5, "second-entry-key");
    expect(joined).toMatchObject({ id: g.id, status: "FUNDED", opponent_id: B });
    const won = await finish(joined);
    expect(won).toMatchObject({
      status: "COMPLETED",
      payout_amount: 192,
      fee_amount: 10,
      score_a: 3,
      score_b: 1,
    });
    await finish(joined);
    expect(await balance(A)).toBe(10091);
    expect(await balance(B)).toBe(9899);
    expect(await balance(A, "user_locked")).toBe(0);
    const { rows } = await db.query(
      `select sum(p.amount)::int net from ledger_postings p join ledger_transactions t on t.id=p.tx_id where t.kind::text like 'fps_%'`,
    );
    expect(rows[0].net).toBe(0);
    const bucket = await db.query(
      `select eligible::int eligible,bonus::int bonus from withdraw_basis_bucket where user_id=$1`,
      [A],
    );
    expect(bucket.rows[0]).toEqual({ eligible: 10091, bonus: 0 });
    await claims(null, "anon");
    expect(await rpc("fps_stats")).toEqual([
      { id: A, username: "alice", rating: 1012, played: 1, wins: 1 },
      { id: B, username: "bob", rating: 988, played: 1, wins: 0 },
    ]);
    await expect(finish(joined, B, 1, 3)).rejects.toThrow("RESULT_CONFLICT");
  });

  it("keeps best-of queues separate and rejects invalid stake and series", async () => {
    for (const stake of [-1, 1, 99, 5001])
      await expect(enter(stake)).rejects.toThrow("STAKE_NOT_ALLOWED");
    await expect(enter(100, 3)).rejects.toThrow("BEST_OF_NOT_ALLOWED");
    const g = await enter(5000, 9);
    await claims(B);
    const other = await enter(5000, 5, "different-series");
    expect(other.id).not.toBe(g.id);
    expect(other.status).toBe("WAITING");
  });

  it("retains a server-generated private invite on retries without leaking it", async () => {
    const g = await enter(100, 5, "private-create-key", true);
    expect(g.invite).toMatch(/^[0-9a-f]{64}$/);
    expect((await enter(100, 5, "private-create-key", true)).invite).toBe(g.invite);
    expect((await rpc<LobbyResult>("fps_lobby")).mine?.id).toBe(g.id);
    await claims(null, "anon");
    expect((await rpc<LobbyResult>("fps_lobby")).open).toEqual([]);
    await claims(C);
    await expect(rpc("fps_view", [g.id])).rejects.toThrow("MATCH_NOT_FOUND");
    await expect(rpc("fps_join", [g.id, "bad-private-join", "0".repeat(64)])).rejects.toThrow(
      "MATCH_NOT_OPEN",
    );
    await claims(B);
    const joined = await rpc("fps_join", [g.id, "good-private-join", g.invite]);
    expect(joined.invite).toBeUndefined();
    expect(await rpc("fps_join", [g.id, "good-private-join", null])).toMatchObject({
      id: g.id,
      status: "FUNDED",
    });
    await claims(null, "service_role");
    expect(await rpc("fps_view", [g.id])).toMatchObject({
      id: g.id,
      creator_id: A,
      opponent_id: B,
    });
    expect((await rpc("fps_view", [g.id])).invite).toBeUndefined();
    await finish(joined);
    await claims(null, "anon");
    expect(await rpc("fps_stats")).toEqual([]);
  });

  it("serializes idempotency and rejects changed terms or a second active entry", async () => {
    const g = await enter();
    expect((await enter()).id).toBe(g.id);
    await expect(enter(200)).rejects.toThrow("IDEMPOTENCY_CONFLICT");
    await expect(enter(100, 5, "new-active-entry")).rejects.toThrow("ALREADY_IN_MATCH");
    expect(await balance(A)).toBe(9900);
    await claims(B);
    await rpc("fps_join", [g.id, "join-key-000001", null]);
    await expect(rpc("fps_join", [C, "join-key-000001", null])).rejects.toThrow(
      "IDEMPOTENCY_CONFLICT",
    );
  });

  it("previews only capability-authorized private terms before reserving any funds", async () => {
    const g = await enter(2500, 9, "private-preview-key", true);
    await claims(B);
    await expect(rpc("fps_invite_preview", [g.id, null])).rejects.toThrow("MATCH_NOT_FOUND");
    await expect(rpc("fps_invite_preview", [g.id, "0".repeat(64)])).rejects.toThrow(
      "MATCH_NOT_FOUND",
    );
    expect(await rpc("fps_invite_preview", [g.id, g.invite])).toEqual({
      id: g.id,
      stake: 2500,
      best_of: 9,
      username: "alice",
      status: "WAITING",
      private: true,
    });
    await expect(rpc("fps_view", [g.id])).rejects.toThrow("MATCH_NOT_FOUND");
    expect(await balance(B)).toBe(10000);
    await claims(null, "anon");
    await expect(rpc("fps_invite_preview", [g.id, g.invite])).rejects.toThrow(/permission denied/);
  });

  it("permits signed public spectators only after funding and keeps private matches participant-only", async () => {
    const g = await enter();
    await claims(C);
    await expect(rpc("fps_view", [g.id])).rejects.toThrow("MATCH_NOT_FOUND");
    await claims(B);
    await rpc("fps_join", [g.id, "spectator-join-key", null]);
    await claims(C);
    const view = await rpc("fps_view", [g.id]);
    expect(view).toMatchObject({
      creator_id: A,
      opponent_id: B,
      id: g.id,
      runtime_id: g.id,
      status: "FUNDED",
      private: false,
    });
    expect(view.ledger_game_id).toBeUndefined();
    expect(view.invite).toBeUndefined();
    await claims(null, "anon");
    await expect(rpc("fps_view", [g.id])).rejects.toThrow(/permission denied/);
  });

  it("rejects bonus and every restricted funding source atomically", async () => {
    await admin(`update withdraw_basis_bucket set eligible=0,bonus=10000 where user_id='${A}'`);
    await claims(A);
    await expect(enter()).rejects.toThrow("CASH_ONLY_BUY_IN");
    await admin(`update withdraw_basis_bucket set eligible=10000,bonus=0 where user_id='${A}'`);
    for (const col of ["partner", "promo", "referral", "prize", "release", "profit"]) {
      await admin(
        `insert into test_restrictions(user_id,${col}) values('${A}',${col === "partner" ? "true" : "1"})`,
      );
      await claims(A);
      await expect(enter()).rejects.toThrow("RESTRICTED_FUNDS");
      await admin("truncate test_restrictions");
    }
    expect(await balance(A)).toBe(10000);
    const { rows } = await db.query(`select count(*)::int n from fps_entries`);
    expect(rows[0].n).toBe(0);
  });

  it("rechecks cash restrictions on the joining player without damaging the creator reservation", async () => {
    const g = await enter();
    await admin(`insert into test_restrictions(user_id,promo) values('${B}',100)`);
    await claims(B);
    await expect(rpc("fps_join", [g.id, "restricted-join", null])).rejects.toThrow(
      "RESTRICTED_FUNDS",
    );
    await claims(A);
    expect(await rpc("fps_view", [g.id])).toMatchObject({ status: "WAITING", opponent_id: null });
    expect(await balance(A, "user_locked")).toBe(100);
    expect(await balance(B)).toBe(10000);
  });

  it("allows only the creator to cancel a waiting room and refunds once", async () => {
    const g = await enter();
    await claims(B);
    await expect(rpc("fps_cancel", [g.id])).rejects.toThrow("MATCH_NOT_FOUND");
    await claims(A);
    expect((await rpc("fps_cancel", [g.id])).status).toBe("CANCELLED");
    expect((await rpc("fps_cancel", [g.id])).status).toBe("CANCELLED");
    expect(await balance(A)).toBe(10000);
    const { rows } = await db.query(
      `select eligible::int e from withdraw_basis_bucket where user_id=$1`,
      [A],
    );
    expect(rows[0].e).toBe(10000);
  });

  it("refunds runtime failures without payouts or rankings and permits the same callback retry", async () => {
    for (const reason of [
      "SERVER_RESTART",
      "BOTH_DISCONNECTED",
      "NO_SHOW",
      "INCONCLUSIVE",
      "MATCH_TIMEOUT",
      "RUNTIME_ERROR",
    ]) {
      await claims(A);
      const g = await enter(100, 5, `refund-a-${reason}`);
      await claims(B);
      await rpc("fps_join", [g.id, `refund-b-${reason}`, null]);
      const result = await finish(g, null, 0, 0, reason);
      expect(result).toMatchObject({
        status: "CANCELLED",
        reason,
        fee_amount: 0,
        payout_amount: 0,
      });
      await finish(g, null, 0, 0, reason);
    }
    expect(await balance(A)).toBe(10000);
    expect(await balance(B)).toBe(10000);
    await claims(null, "anon");
    expect(await rpc("fps_stats")).toEqual([]);
  });

  it("rejects client settlement, unauthorized tables and mutations, revoked and sessionless JWTs", async () => {
    const g = await enter();
    await expect(rpc("fps_finish", [g.id, A, 3, 0, "ROUNDS", g.id])).rejects.toThrow(
      /permission denied/,
    );
    await expect(rpc("fps_expire", [10])).rejects.toThrow(/permission denied/);
    for (const table of [
      "fps_matches",
      "fps_entries",
      "fps_audit",
      "fps_invite_secrets",
      "fps_config",
      "fps_ratings",
    ]) {
      await expect(db.query(`select * from ${table}`)).rejects.toThrow(/permission denied/);
    }
    await admin(`delete from auth.sessions where user_id='${A}'`);
    await claims(A);
    await expect(rpc("fps_view", [g.id])).rejects.toThrow("SESSION_REVOKED");
    await db.exec("reset role");
    await db.query(`select set_config('request.jwt.claims',$1,false)`, [
      JSON.stringify({ role: "authenticated", sub: A }),
    ]);
    await db.exec("set role authenticated");
    await expect(enter()).rejects.toThrow("LIVE_SESSION_REQUIRED");
    await claims(null, "anon");
    await expect(rpc("fps_view", [g.id])).rejects.toThrow(/permission denied/);
  });

  it("validates authoritative majority, runtime binding and incomplete disconnect awards", async () => {
    const g = await funded();
    await expect(finish(g, A, 3, 1, "ROUNDS", C)).rejects.toThrow("RUNTIME_MISMATCH");
    await expect(finish(g, C)).rejects.toThrow("INVALID_RESULT");
    await expect(finish(g, A, 2, 1)).rejects.toThrow("INVALID_RESULT");
    await expect(finish(g, A, 3, 3)).rejects.toThrow("INVALID_RESULT");
    await expect(finish(g, null, 0, 0, "UNKNOWN")).rejects.toThrow("INVALID_REFUND_REASON");
    expect(await finish(g, B, 1, 0, "DISCONNECT")).toMatchObject({
      winner_id: B,
      reason: "DISCONNECT",
    });
  });

  it("bounds stale cleanup and refunds FUNDED even before the first runtime request", async () => {
    const g = await funded();
    await claims(A);
    await expect(rpc("fps_cancel", [g.id])).rejects.toThrow("MATCH_NOT_CANCELLABLE");
    await admin(
      `update fps_matches set expires_at=clock_timestamp()-interval '1 second' where id='${g.id}'`,
    );
    await expect(finish(g)).rejects.toThrow("MATCH_EXPIRED");
    await claims(null, "service_role");
    await expect(rpc("fps_expire", [101])).rejects.toThrow("INVALID_LIMIT");
    expect(await rpc("fps_expire", [1])).toEqual({ expired: 1 });
    expect(await rpc("fps_expire", [1])).toEqual({ expired: 0 });
    expect(await balance(A)).toBe(10000);
    expect(await balance(B)).toBe(10000);
  });

  it("creates a peer-only durable rematch, charges each acceptance separately and retries safely", async () => {
    const original = await funded();
    await finish(original);
    await claims(C);
    await expect(rpc("fps_rematch", [original.id, "outsider-rematch"])).rejects.toThrow(
      "MATCH_NOT_FOUND",
    );
    await claims(A);
    const next = await rpc("fps_rematch", [original.id, "rematch-create-key"]);
    expect(next).toMatchObject({
      match_id: next.id,
      private: true,
      status: "WAITING",
      stake: 100,
      best_of: 5,
    });
    expect(next.id).not.toBe(original.id);
    expect(await balance(A)).toBe(9990);
    expect(await balance(B)).toBe(9900);
    await claims(A);
    expect((await rpc("fps_rematch", [original.id, "rematch-create-key"])).id).toBe(next.id);
    expect((await rpc("fps_view", [original.id])).rematch_id).toBe(next.id);
    await claims(C);
    await expect(rpc("fps_join", [next.id, "outsider-with-token", next.invite])).rejects.toThrow(
      "MATCH_NOT_OPEN",
    );
    await claims(B);
    expect((await rpc("fps_view", [original.id])).rematch_id).toBe(next.id);
    const accepted = await rpc("fps_rematch", [original.id, "rematch-peer-key"]);
    expect(accepted).toMatchObject({ id: next.id, status: "FUNDED", opponent_id: B });
    expect(accepted.invite).toBeUndefined();
    expect((await rpc("fps_rematch", [original.id, "rematch-peer-key"])).id).toBe(next.id);
    expect(await balance(B)).toBe(9800);
    await finish(accepted, null, 0, 0, "SERVER_RESTART");
    expect(await balance(A)).toBe(10090);
    expect(await balance(B)).toBe(9900);
  });

  it("checks fresh rematch eligibility without charging the peer or losing the first acceptance", async () => {
    const original = await funded();
    await finish(original, null, 0, 0, "NO_SHOW");
    await claims(B);
    const next = await rpc("fps_rematch", [original.id, "rematch-reverse-key"]);
    await admin(`insert into test_restrictions(user_id,promo) values('${A}',1)`);
    await claims(A);
    await expect(rpc("fps_rematch", [original.id, "rematch-restricted"])).rejects.toThrow(
      "RESTRICTED_FUNDS",
    );
    expect(await balance(A)).toBe(10000);
    expect(await balance(B, "user_locked")).toBe(100);
    await claims(B);
    expect((await rpc("fps_view", [next.id])).status).toBe("WAITING");
    await expect(rpc("fps_rematch", [next.id, "premature-rematch"])).rejects.toThrow(
      "REMATCH_NOT_AVAILABLE",
    );
  });

  it("rolls all funds, audit and ranking changes back if a settlement posting fails", async () => {
    const g = await funded();
    await record(g);
    await admin(`create function public.test_fail_fee() returns trigger language plpgsql as $$ begin
      if exists(select 1 from wallet_accounts where id=new.account_id and kind='house_revenue') then
        raise exception 'INJECTED_FEE_FAILURE'; end if; return new; end $$;
      create trigger test_fail_fee before insert on ledger_postings for each row execute function test_fail_fee();`);
    await expect(finish(g)).rejects.toThrow("INJECTED_FEE_FAILURE");
    await claims(A);
    expect((await rpc("fps_view", [g.id])).status).toBe("FUNDED");
    expect(await balance(A)).toBe(9900);
    expect(await balance(A, "user_locked")).toBe(100);
    const { rows } = await db.query(
      `select count(*)::int n from fps_audit where action='COMPLETED'`,
    );
    expect(rows[0].n).toBe(0);
    await db.exec(
      `update fps_matches set expires_at=clock_timestamp()-interval '1 second' where id='${g.id}'`,
    );
    await claims(null, "service_role");
    expect(await rpc("fps_expire", [100])).toEqual({ expired: 0 });
    await db.exec("reset role");
    await db.exec("drop trigger test_fail_fee on ledger_postings; drop function test_fail_fee()");
    await finish(g);
    expect(await balance(A)).toBe(10090);
  });

  it("records an immutable service-only intent, rejects conflicts and settles it after expiry exactly once", async () => {
    const g = await funded();
    await claims(A);
    await expect(rpc("fps_record_result", [g.id, A, 3, 1, "ROUNDS", g.id])).rejects.toThrow(
      /permission denied/,
    );
    await expect(db.query("select * from fps_result_intents")).rejects.toThrow(/permission denied/);
    await expect(record(g, A, 3, 1, "ROUNDS", C)).rejects.toThrow("RUNTIME_MISMATCH");
    await expect(record(g, A, 2, 1)).rejects.toThrow("INVALID_RESULT");
    expect(await record(g)).toMatchObject({ id: g.id, status: "FUNDED", result_recorded: true });
    expect(await record(g)).toMatchObject({ id: g.id, result_recorded: true });
    await expect(record(g, B, 1, 3)).rejects.toThrow("RESULT_CONFLICT");
    await expect(record(g, A, 3, 2)).rejects.toThrow("RESULT_CONFLICT");
    await expect(finish(g, null, 0, 0, "SERVER_RESTART")).rejects.toThrow("RESULT_CONFLICT");
    await admin(
      `update fps_matches set expires_at=clock_timestamp()-interval '1 second' where id='${g.id}'`,
    );
    await claims(null, "service_role");
    expect(await rpc("fps_expire", [100])).toEqual({ expired: 0 });
    expect(await finish(g)).toMatchObject({
      status: "COMPLETED",
      payout_amount: 190,
      fee_amount: 10,
    });
    await finish(g);
    await record(g);
    expect(await balance(A)).toBe(10090);
    const counts = await db.query(`select (select count(*)::int from fps_result_intents) intents,
      (select count(*)::int from ledger_transactions where kind='fps_settlement') settlements`);
    expect(counts.rows[0]).toEqual({ intents: 1, settlements: 1 });
    await expect(db.exec("update fps_matches set result_recorded=false")).rejects.toThrow(
      "FPS_MATCH_IMMUTABLE",
    );
    await expect(db.exec("delete from fps_result_intents")).rejects.toThrow(/immutable/i);
    await expect(db.exec("update fps_result_intents set score_b=2")).rejects.toThrow(/immutable/i);
  });

  it("allows late trusted recording only while still FUNDED, and never overrides expiry's committed refund", async () => {
    const g = await funded();
    await admin(
      `update fps_matches set expires_at=clock_timestamp()-interval '1 second' where id='${g.id}'`,
    );
    await expect(finish(g)).rejects.toThrow("MATCH_EXPIRED");
    await record(g);
    await finish(g);
    await claims(C);
    const waiting = await enter(0, 5, "unfunded-intent-key");
    await expect(record(waiting, null, 0, 0, "NO_SHOW")).rejects.toThrow("MATCH_NOT_FUNDED");
    await claims(A);
    const second = await enter(100, 5, "second-intent-key");
    await claims(B);
    await rpc("fps_join", [second.id, "second-intent-join", null]);
    await admin(
      `update fps_matches set expires_at=clock_timestamp()-interval '1 second' where id='${second.id}'`,
    );
    await claims(null, "service_role");
    expect(await rpc("fps_expire", [100])).toEqual({ expired: 1 });
    await expect(record(second)).rejects.toThrow("MATCH_NOT_FUNDED");
    await expect(finish(second)).rejects.toThrow("RESULT_CONFLICT");
  });

  it("preserves refund intents and refuses a conflicting winning result", async () => {
    const g = await funded();
    await expect(record(g, null, 0, 0, "UNKNOWN")).rejects.toThrow("INVALID_REFUND_REASON");
    await record(g, null, 2, 1, "MATCH_TIMEOUT");
    await record(g, null, 0, 0, "MATCH_TIMEOUT"); // refund scores are intentionally normalized
    await expect(record(g)).rejects.toThrow("RESULT_CONFLICT");
    await admin(
      `update fps_matches set expires_at=clock_timestamp()-interval '1 second' where id='${g.id}'`,
    );
    await claims(null, "service_role");
    expect(await rpc("fps_expire", [100])).toEqual({ expired: 0 });
    expect(await finish(g, null, 0, 0, "MATCH_TIMEOUT")).toMatchObject({
      status: "CANCELLED",
      reason: "MATCH_TIMEOUT",
    });
    expect(await balance(A)).toBe(10000);
    expect(await balance(B)).toBe(10000);
  });

  it("reconciles a recorded result after expiry while entry is disabled, without paying twice", async () => {
    const g = await funded();
    await record(g);
    await admin(`update fps_config set enabled=false,cash_enabled=false;
      update fps_matches set expires_at=clock_timestamp()-interval '1 second' where id='${g.id}'`);
    await claims(null, "service_role");
    expect(await rpc("fps_reconcile")).toEqual({ settled: 1, failed: 0 });
    expect(await rpc("fps_reconcile", [100])).toEqual({ settled: 0, failed: 0 });
    expect(await rpc("fps_view", [g.id])).toMatchObject({
      status: "COMPLETED",
      result_recorded: true,
    });
    expect(await balance(A)).toBe(10090);
    expect(await balance(B)).toBe(9900);
    const { rows } =
      await db.query(`select (select count(*)::int from ledger_transactions where kind='fps_settlement') payouts,
      (select played from fps_ratings where user_id='${A}') played,
      (select count(*)::int from fps_result_intents) intents`);
    expect(rows[0]).toEqual({ payouts: 1, played: 1, intents: 1 });
  });

  it("restricts reconciliation to service role and validates the bounded batch size", async () => {
    for (const role of ["anon", "authenticated"]) {
      await claims(role === "anon" ? null : A, role);
      await expect(rpc("fps_reconcile", [100])).rejects.toThrow(/permission denied/);
    }
    await claims(null, "service_role");
    for (const limit of [null, 0, -1, 101])
      await expect(rpc("fps_reconcile", [limit])).rejects.toThrow("INVALID_LIMIT");
    expect(await rpc("fps_reconcile", [1])).toEqual({ settled: 0, failed: 0 });
  });

  it("counts isolated posting failures, retains their intent and continues other pending results", async () => {
    const g = await funded();
    await record(g);
    await claims(C);
    const other = await enter(0, 5, "reconcile-other-create");
    await claims(D);
    await rpc("fps_join", [other.id, "reconcile-other-join", null]);
    await record(other, null, 0, 0, "NO_SHOW");
    await admin(`create function public.test_reconcile_fail() returns trigger language plpgsql as $$ begin
      if exists(select 1 from wallet_accounts where id=new.account_id and kind='house_revenue') then
        raise exception 'INJECTED_RECONCILE_FAILURE'; end if; return new; end $$;
      create trigger test_reconcile_fail before insert on ledger_postings for each row execute function test_reconcile_fail();`);
    try {
      await claims(null, "service_role");
      expect(await rpc("fps_reconcile", [1])).toEqual({ settled: 0, failed: 1 });
      expect(await rpc("fps_reconcile", [100])).toEqual({ settled: 1, failed: 1 });
      expect(await rpc("fps_view", [g.id])).toMatchObject({
        status: "FUNDED",
        result_recorded: true,
      });
      expect(await rpc("fps_view", [other.id])).toMatchObject({
        status: "CANCELLED",
        reason: "NO_SHOW",
      });
      expect(await balance(A)).toBe(9900);
      expect(await balance(A, "user_locked")).toBe(100);
      const { rows } = await db.query(`select count(*)::int n from fps_result_intents`);
      expect(rows[0].n).toBe(2);
    } finally {
      await admin(
        "drop trigger test_reconcile_fail on ledger_postings; drop function test_reconcile_fail()",
      );
    }
    await claims(null, "service_role");
    expect(await rpc("fps_reconcile", [100])).toEqual({ settled: 1, failed: 0 });
    expect(await rpc("fps_reconcile", [100])).toEqual({ settled: 0, failed: 0 });
    expect(await balance(A)).toBe(10090);
  });

  it("lists only unexpired public FUNDED spectator rooms without invite data", async () => {
    const g = await funded();
    await claims(null, "anon");
    const lobby = await rpc<LobbyResult>("fps_lobby");
    expect(lobby.live).toEqual([
      {
        id: g.id,
        creator_id: A,
        opponent_id: B,
        username: "alice",
        stake: 100,
        best_of: 5,
        private: false,
        status: "FUNDED",
      },
    ]);
    await admin(
      `update fps_matches set expires_at=clock_timestamp()-interval '1 second' where id='${g.id}'`,
    );
    await claims(null, "anon");
    expect((await rpc<LobbyResult>("fps_lobby")).live).toEqual([]);
    await record(g);
    await claims(null, "anon");
    expect((await rpc<LobbyResult>("fps_lobby")).live).toEqual([]);
    await finish(g);
    await claims(A);
    const privateGame = await enter(100, 5, "live-private-create", true);
    await claims(B);
    await rpc("fps_join", [privateGame.id, "live-private-join", privateGame.invite]);
    await claims(null, "anon");
    expect((await rpc<LobbyResult>("fps_lobby")).live).toEqual([]);
    await finish(privateGame, null, 0, 0, "NO_SHOW");
  });

  it("replays new FPS ledger enum kinds through the unchanged withdrawal classifier without basis drift", async () => {
    const g = await funded();
    await record(g);
    await finish(g);
    await claims(C);
    const cancelled = await enter(100, 5, "basis-refund-key");
    await rpc("fps_cancel", [cancelled.id]);
    await db.exec("reset role");
    const snapshot = async () =>
      (
        await db.query(`select jsonb_build_object(
      'bucket',(select jsonb_agg(to_jsonb(b) order by user_id) from withdraw_basis_bucket b),
      'stake',(select jsonb_agg(to_jsonb(s) order by user_id,game,game_id) from withdraw_basis_stake s),
      'ledger',(select jsonb_agg(to_jsonb(l) order by ledger_tx_id) from withdraw_basis_ledger_stake l)) v`)
      ).rows[0].v;
    const before = await snapshot();
    await db.exec(`truncate withdraw_basis_bucket,withdraw_basis_stake,withdraw_basis_ledger_stake,withdraw_basis_hold;
      do $$ declare t record; begin for t in select l.* from withdraw_basis_applied a join ledger_transactions l on l.id=a.tx_id order by a.seq loop
        perform _withdraw_basis_apply_tx(t.id,t.kind::text,t.game_id); end loop; end $$;`);
    expect(await snapshot()).toEqual(before);
  });

  it("expires waiting reservations and validates the best-of-nine majority", async () => {
    const g = await enter(5000, 9);
    await claims(B);
    await rpc("fps_join", [g.id, "best-of-nine-join", null]);
    await expect(finish(g, A, 3, 1)).rejects.toThrow("INVALID_RESULT");
    expect(await finish(g, A, 5, 4)).toMatchObject({ payout_amount: 9500, fee_amount: 500 });
    await claims(C);
    const waiting = await enter(100, 5, "waiting-expiration");
    await admin(
      `update fps_matches set expires_at=clock_timestamp()-interval '1 second' where id='${waiting.id}'`,
    );
    await claims(null, "service_role");
    expect(await rpc("fps_expire", [1])).toEqual({ expired: 1 });
    expect(await balance(C)).toBe(10000);
  });

  it("keeps FPS entry and audit records immutable", async () => {
    await enter();
    await db.exec("reset role");
    await expect(db.exec("delete from fps_entries")).rejects.toThrow(/immutable/i);
    await expect(db.exec(`update fps_audit set action='JOINED'`)).rejects.toThrow(/immutable/i);
    await expect(db.exec(`update fps_matches set stake=200`)).rejects.toThrow(
      "FPS_MATCH_IMMUTABLE",
    );
    await expect(db.exec(`update fps_matches set best_of=9`)).rejects.toThrow(
      "FPS_MATCH_IMMUTABLE",
    );
    await expect(db.exec("delete from fps_matches")).rejects.toThrow("FPS_MATCH_IMMUTABLE");
  });

  it("keeps another game's equal bigint reference isolated from FPS settlement", async () => {
    const g = await funded();
    await admin(`do $$ declare tx uuid; ref bigint; begin
      select ledger_game_id into ref from fps_matches where id='${g.id}';
      insert into ledger_transactions(kind,idempotency_key,account_type,user_id,game_id)
        values('pool_entry','independent-pool-stake','real','${C}',ref) returning id into tx;
      perform _post(tx,_user_account('${C}','user_available','USD','real'),-50);
      perform _post(tx,_user_account('${C}','user_locked','USD','real'),50);
      perform _withdraw_basis_sync();
    end $$;`);
    await finish(g);
    await db.exec("reset role");
    const { rows } = await db.query(`select game,eligible::int eligible,bonus::int bonus
      from withdraw_basis_stake order by game`);
    expect(rows).toEqual([{ game: "pool", eligible: 50, bonus: 0 }]);
    expect(await balance(C)).toBe(9950);
    expect(await balance(C, "user_locked")).toBe(50);
  });
});
