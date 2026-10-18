/**
 * PostgREST runs STABLE functions in a read-only transaction. crypto_my_activity is STABLE,
 * so it must never reach _withdraw_basis_sync (writes): that combination returned SQLSTATE
 * 25006 / HTTP 405 for every wallet poll. Withdrawals keep the synchronous, writing path.
 * Isolated schema. Requires TEST_DATABASE_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { fundTestTreasury, migrateTestSchemaToReal } from "./money";
import { testDatabaseUrl } from "./test-url";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 4, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);

const TO = "0x2222222222222222222222222222222222222222";
const FEED = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";
const PRICE = 2_500_000_000;

d("crypto_my_activity read-only path and withdrawal sync", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    await fundTestTreasury(sql);
    await sql.unsafe(`grant usage on schema pvp_test to service_role;
      alter table pvp_test.chain_networks disable trigger user;
      update pvp_test.crypto_settings set min_withdrawal_cents = 2000, daily_limit_cents = 100000000, daily_global_limit_cents = 1000000000, auto_approve_cents = 100000000, withdrawal_fee_cents = 0;
      update pvp_test.chain_networks set min_withdrawal_cents = 2000, is_enabled = true where chain_id in (8453, 84532);
      alter table pvp_test.chain_networks enable trigger user;
      alter table pvp_test.chain_assets disable trigger user;
      update pvp_test.chain_assets set is_enabled = true, ledger_asset = 'USD', ledger_account_type = 'real' where chain_id in (8453, 84532);
      alter table pvp_test.chain_assets enable trigger user;`);
    await sql`select pvp_test.crypto_record_price(8453, 'ETH', ${FEED}, 1, ${PRICE}, now(), now())`;
    await sql`select pvp_test.crypto_record_inventory(8453, 0, ${(10n ** 24n).toString()}, 0, ${(10n ** 12n).toString()}, ${PRICE}, true, true)`;
  }, 180_000);

  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  // Same transaction shape PostgREST uses for a STABLE RPC called with the service key.
  function postgrestStable<T>(fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
    return sql.begin("isolation level read committed read only", async (tx) => {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ role: "service_role" })}, true)`;
      await tx.unsafe("set local role service_role");
      return fn(tx);
    }) as Promise<T>;
  }

  async function failure(p: Promise<unknown>): Promise<{ code: string; message: string } | null> {
    try {
      await p;
      return null;
    } catch (e) {
      const err = e as { code?: string; message?: string };
      return { code: err.code ?? "", message: err.message ?? "" };
    }
  }

  async function user(name: string) {
    const id = randomUUID();
    const username = (name + id.replace(/-/g, "")).slice(0, 20);
    await sql`select pvp_test.ensure_profile(${username}, true)
      from (select set_config('test.uid', ${id}, true)) c`;
    return id;
  }

  async function deposit(uid: string, cents: number) {
    const ext = (
      await sql`select pvp_test._system_account('external_custody', 'USD', 'real') id`
    )[0].id as string;
    const avail = (
      await sql`select pvp_test._user_account(${uid}::uuid, 'user_available'::pvp_test.account_kind, 'USD', 'real') id`
    )[0].id as string;
    await sql.begin(async (db) => {
      const id = (
        await db`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id)
          values ('deposit'::pvp_test.tx_kind, ${randomUUID()}, 'real', ${uid}::uuid) returning id`
      )[0].id as string;
      await db`select pvp_test._post(${id}::uuid, ${ext}::uuid, ${-cents}::bigint)`;
      await db`select pvp_test._post(${id}::uuid, ${avail}::uuid, ${cents}::bigint)`;
    });
  }

  async function withdrawEth(
    uid: string,
    cents: number,
    db: postgres.Sql | postgres.TransactionSql = sql,
  ) {
    const quote = (
      await sql`select pvp_test.crypto_quote_withdrawal(${uid}::uuid, 8453::bigint, ${cents}::bigint) q`
    )[0]!.q as { quote_id: string };
    return db`select pvp_test.crypto_request_withdrawal(${uid}::uuid, 8453::bigint, 'ETH', ${cents}::bigint, ${quote.quote_id}::uuid, true, ${TO})`;
  }

  async function bucket(uid: string) {
    const [row] = await sql`select deposits, eligible, bonus from pvp_test.withdraw_basis_bucket
      where user_id = ${uid}::uuid`;
    return row ? { deposits: Number(row.deposits), eligible: Number(row.eligible) } : null;
  }

  it("is declared STABLE and only service_role can call it", async () => {
    const [r] = await sql`select p.provolatile v,
        has_function_privilege('service_role', p.oid, 'execute') svc,
        has_function_privilege('anon', p.oid, 'execute') anon,
        has_function_privilege('authenticated', p.oid, 'execute') auth
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'pvp_test' and p.proname = 'crypto_my_activity'`;
    expect(r).toEqual({ v: "s", svc: true, anon: false, auth: false });
  });

  it("returns activity in a PostgREST read-only transaction while basis work is pending", async () => {
    const u = await user("ro");
    await deposit(u, 5000);

    // The pre-fix path: the sync has pending ledger work, so it must write and fails read-only.
    const old = await failure(
      postgrestStable((tx) => tx`select pvp_test._withdraw_basis(${u}::uuid)`),
    );
    expect(old?.code).toBe("25006");

    const before = await bucket(u);
    const [row] = await postgrestStable(
      (tx) => tx`select pvp_test.crypto_my_activity(${u}::uuid) a`,
    );
    const a = row!.a as {
      settings: Record<string, unknown> | null;
      withdraw: { room_cents: number; deposit_cents: number; deposit_floor_cents: number };
      chains: unknown[];
    };
    expect(a.settings).not.toBeNull();
    expect(Array.isArray(a.chains)).toBe(true);
    expect(a.withdraw).toEqual(
      expect.objectContaining({ room_cents: expect.any(Number), deposit_floor_cents: 2000 }),
    );
    // Read path never syncs: the cached bucket is unchanged by the call.
    expect(await bucket(u)).toEqual(before);
  });

  it("reflects the synced bucket once the background sync has run", async () => {
    const u = await user("peek");
    await deposit(u, 4000);
    await sql`select pvp_test._withdraw_basis_sync()`;
    const [row] = await postgrestStable(
      (tx) => tx`select pvp_test.crypto_my_activity(${u}::uuid) a`,
    );
    const w = (row!.a as { withdraw: { room_cents: number; deposit_cents: number } }).withdraw;
    const full = (await sql`select pvp_test._withdraw_basis(${u}::uuid) b`)[0]!.b as {
      room: number;
      deposits: number;
    };
    expect(w.deposit_cents).toBe(Number(full.deposits));
    expect(w.room_cents).toBe(Number(full.room));
    expect(w.deposit_cents).toBe(4000);
  });

  it("withdrawal reads a basis that is current at deposit commit and still debits once", async () => {
    const u = await user("wd");
    await deposit(u, 5000);
    expect(await bucket(u)).toEqual({ deposits: 5000, eligible: 5000 });

    const r = await failure(withdrawEth(u, 2500));
    expect(r).toBeNull();
    expect((await bucket(u))?.deposits).toBe(5000);

    const [b] = await sql`select balance from pvp_test.wallet_accounts
      where owner_id = ${u}::uuid and kind = 'user_available' and account_type = 'real'`;
    expect(Number(b!.balance)).toBe(2500);
    const [n] =
      await sql`select count(*)::int n from pvp_test.crypto_withdrawals where user_id = ${u}::uuid`;
    expect(n!.n).toBe(1);
    await sql`select pvp_test._withdraw_basis_sync()`;
    await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
  });

  it("withdrawal still refuses to run in a read-only transaction", async () => {
    const u = await user("wdro");
    await deposit(u, 5000);
    const r = await failure(postgrestStable((tx) => withdrawEth(u, 2500, tx)));
    expect(r?.code).toBe("25006");
    const [n] =
      await sql`select count(*)::int n from pvp_test.crypto_withdrawals where user_id = ${u}::uuid`;
    expect(n!.n).toBe(0);
  });

  it("withdrawal above the synced cash room is rejected", async () => {
    const u = await user("over");
    await deposit(u, 3000);
    const r = await failure(withdrawEth(u, 4000));
    expect(r?.message).toMatch(/INSUFFICIENT_BALANCE|BONUS_NOT_WITHDRAWABLE/);
    const [n] =
      await sql`select count(*)::int n from pvp_test.crypto_withdrawals where user_id = ${u}::uuid`;
    expect(n!.n).toBe(0);
  });
});
