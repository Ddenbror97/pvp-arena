/**
 * Phase 2 backend audit. Public checks run only when TEST_DATABASE_URL is the
 * approved hosted test project. Behavioral checks use pvp_test on that same
 * database and drop the schema afterward. No payouts, webhooks, or production
 * projects.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openAdminStepup, adminClaims } from "./admin-stepup";
import { migrateTestSchemaToReal, useTestWithdrawalMinimum } from "./money";
import { applyTestSchema } from "./schema";
import { testDatabaseUrl } from "./test-url";
import {
  AUTHORIZED_AUDIT_REF,
  hostedAuditDatabase,
  assertHostedAuditEnvironment,
} from "./audit-target";

const APPROVED_REF = AUTHORIZED_AUDIT_REF;
const FORBIDDEN = ["dkyabirifoixnfbmheay", "gqeaadpdtuussxdlnmof", "fdsovopvmjogjcllmxwj"];

function targetKind(raw: string): "hosted-test" | "local" {
  const parsed = new URL(raw);
  const hay =
    `${decodeURIComponent(parsed.username)} ${parsed.hostname} ${parsed.pathname}`.toLowerCase();
  for (const ref of FORBIDDEN) {
    if (hay.includes(ref)) throw new Error("Refusing a forbidden database.");
  }
  if (hay.includes(APPROVED_REF)) return "hosted-test";
  if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") return "local";
  throw new Error("Refusing a database that is not the approved test project.");
}

const rawUrl = testDatabaseUrl();
const kind = targetKind(rawUrl);
const parsed = new URL(rawUrl);
if (!parsed.searchParams.has("options")) {
  parsed.searchParams.set("options", "-c statement_timeout=0");
}
const url = parsed.toString();
const sql = postgres(url, { max: 8, prepare: false, onnotice: () => {}, idle_timeout: 5 });

const err = async (p: Promise<unknown>) => {
  try {
    await p;
    return "";
  } catch (e) {
    return (
      String((e as { code?: string; message?: string }).code ?? "") +
      " " +
      String((e as Error).message)
    );
  }
};

async function as<T>(
  uid: string | null,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
  claims?: string,
) {
  return sql.begin(async (tx) => {
    if (claims) {
      await tx`select set_config('test.uid', ${uid ?? ""}, true), set_config('request.jwt.claims', ${claims}, true)`;
    } else {
      await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    }
    return fn(tx);
  }) as Promise<T>;
}

async function user(name: string) {
  const id = randomUUID();
  const username = (name + id.replace(/-/g, "")).slice(0, 20);
  await sql`select pvp_test.ensure_profile(${username}, true) from (select set_config('test.uid', ${id}, true)) c`;
  return id;
}

const key = () => randomUUID();

describe("phase 2 public boundary (hosted test project)", () => {
  const remote = process.env.TEST_HOSTED_DATABASE_URL;
  const sql = remote
    ? postgres(hostedAuditDatabase(remote), {
        ssl: "require",
        max: 2,
        prepare: false,
        onnotice: () => {},
        idle_timeout: 5,
      })
    : undefined;
  const hosted = sql ? it : it.skip;
  let ownedBefore = 0,
    topupsBefore = 0;
  beforeAll(async () => {
    if (!sql) return;
    assertHostedAuditEnvironment();
    ownedBefore = Number(
      (await sql`select count(*) n from public.wallet_accounts where owner_id is not null`)[0].n,
    );
    topupsBefore = Number((await sql`select count(*) n from public.partner_topups`)[0].n);
  });

  afterAll(async () => {
    await sql?.end();
  });

  hosted(
    "anonymous and synthetic sessions cannot read or write private tables",
    async () => {
      const checks = [
        ["wallets", `select count(*)::int n from public.wallet_accounts`],
        ["ledger", `select count(*)::int n from public.ledger_transactions`],
        ["pins", `select count(*)::int n from public.admin_pins`],
        ["withdrawals", `select count(*)::int n from public.crypto_withdrawals`],
        ["bearer", `select count(*)::int n from public.crypto_job_bearer`],
        ["referrals", `select count(*)::int n from public.referrals`],
        ["topups", `select count(*)::int n from public.partner_topups`],
        ["excluded", `select self_excluded_until from public.profiles`],
      ] as const;
      const synthetic = JSON.stringify({
        role: "authenticated",
        sub: "00000000-0000-4000-8000-000000000001",
        session_id: "00000000-0000-4000-8000-000000000002",
      });
      for (const role of ["anon", "authenticated"] as const) {
        for (const [label, query] of checks) {
          const seen = await err(
            sql.begin(async (tx) => {
              if (role === "authenticated")
                await tx`select set_config('request.jwt.claims', ${synthetic}, true)`;
              await tx.unsafe(`set local role ${role}`);
              await tx.unsafe(query);
              throw new Error("ROLLBACK");
            }),
          );
          if (role === "authenticated" && (label === "wallets" || label === "ledger")) {
            expect(seen, label).toContain("ROLLBACK");
          } else {
            expect(seen, `${role} ${label}`).toContain("42501");
          }
        }
      }
      const names = await sql.begin(async (tx) => {
        await tx.unsafe(`set local role anon`);
        const [row] =
          await tx`select count(*)::int n from (select id, username from public.profiles) s`;
        return Number(row.n);
      });
      expect(names).toBeGreaterThan(0);
      const [left] =
        await sql`select count(*)::int n from public.wallet_accounts where owner_id is not null`;
      expect(Number(left.n)).toBe(ownedBefore);
    },
    60_000,
  );

  hosted(
    "a non-admin cannot call a partner credit, and anon cannot call admin overview",
    async () => {
      const synthetic = JSON.stringify({
        role: "authenticated",
        sub: "00000000-0000-4000-8000-000000000001",
        session_id: "00000000-0000-4000-8000-000000000002",
      });
      const anon = await err(
        sql.begin(async (tx) => {
          await tx.unsafe(`set local role anon`);
          await tx`select public.admin_overview()`;
        }),
      );
      expect(anon).toContain("42501");
      const userCall = await err(
        sql.begin(async (tx) => {
          await tx`select set_config('request.jwt.claims', ${synthetic}, true)`;
          await tx.unsafe(`set local role authenticated`);
          await tx`select public.partner_admin_topup('00000000-0000-4000-8000-000000000003'::uuid, 100, 'x', '00000000-0000-4000-8000-000000000004'::uuid)`;
        }),
      );
      expect(userCall).toContain("FORBIDDEN");
      const [left] = await sql`select count(*)::int n from public.partner_topups`;
      expect(Number(left.n)).toBe(topupsBefore);
    },
  );

  hosted("authenticated browser RPCs that administer money require step-up", async () => {
    const rows = await sql`
      select p.proname as name
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prokind = 'f'
        and has_function_privilege('authenticated', p.oid, 'execute')
        and (
          p.proname like 'admin\\_%' escape '\\'
          or p.proname like 'partner\\_admin%' escape '\\'
          or p.proname like 'promo\\_admin%' escape '\\'
        )
        and p.prosrc not ilike '%_require_admin_stepup%'
        and p.prosrc not ilike '%_assert_admin%'
        and p.prosrc not ilike '%_lb_require_admin%'
        and p.prosrc not ilike '%_poker_require_admin%'
      order by 1`;
    expect(rows.map((r) => r.name)).toEqual([]);
  });

  hosted("one user cannot read or change another user's wallet", async () => {
    const token = process.env.SUPABASE_ACCESS_TOKEN;
    expect(token, "management token required for the owner rollback probe").toBeTruthy();
    const a = randomUUID(),
      b = randomUUID();
    const res = await fetch(`https://api.supabase.com/v1/projects/${APPROVED_REF}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
do $body$
declare a uuid := '${a}'; b uuid := '${b}'; visible int; own_sum int; other int; victim int; touched int;
begin
  insert into public.profiles(id,username,age_confirmed_at)values(a,'audit_'||left(replace(a::text,'-',''),12),now()),(b,'audit_'||left(replace(b::text,'-',''),12),now());
  insert into public.wallet_accounts (owner_id, kind, asset, account_type, balance)
  values (a, 'user_available', 'USD', 'real', 111), (b, 'user_available', 'USD', 'real', 222);
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub', a)::text, true);
  execute 'set local role authenticated';
  select count(*) into visible from public.wallet_accounts;
  select coalesce(sum(balance), 0) into own_sum from public.wallet_accounts where owner_id = auth.uid();
  select count(*) into other from public.wallet_accounts where owner_id is distinct from auth.uid();
  begin
    update public.wallet_accounts set balance = 999 where owner_id is distinct from auth.uid();
    get diagnostics touched = row_count;
  exception when others then
    touched := -1;
  end;
  reset role;
  select balance into victim from public.wallet_accounts where owner_id = b;
  raise exception 'PROBE visible=% own_sum=% other=% touched=% victim=%', visible, own_sum, other, touched, victim;
end
$body$;`,
      }),
    });
    const text = await res.text();
    expect(text).toContain("PROBE visible=1 own_sum=111 other=0 touched=-1 victim=222");
    const left = await fetch(
      `https://api.supabase.com/v1/projects/${APPROVED_REF}/database/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `select count(*)::int n from public.wallet_accounts where owner_id in ('${a}','${b}')`,
        }),
      },
    );
    const leftText = await left.text();
    expect(left.ok || left.status === 201).toBe(true);
    expect(leftText).toContain('"n":0');
  });
});

describe("phase 2 isolated behavior", () => {
  beforeAll(async () => {
    await applyTestSchema(sql);
    // Production anon/authenticated have USAGE on public. pvp_test is a copy, so
    // the browser roles need the same schema privilege before RLS can be observed.
    const [roles] = await sql`select
      exists (select 1 from pg_roles where rolname = 'anon')
      and exists (select 1 from pg_roles where rolname = 'authenticated') as ok`;
    if (roles.ok) await sql`grant usage on schema pvp_test to anon, authenticated`;
  }, 420_000);

  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  it("self-exclusion rejects bad periods, cannot be shortened, and blocks play", async () => {
    expect(await err(sql`select pvp_test.request_self_exclusion(180)`)).toContain(
      "UNAUTHENTICATED",
    );
    const id = await user("excl");
    expect(await err(as(id, (tx) => tx`select pvp_test.request_self_exclusion(null)`))).toContain(
      "EXCLUSION_PERIOD",
    );
    expect(await err(as(id, (tx) => tx`select pvp_test.request_self_exclusion(7)`))).toContain(
      "EXCLUSION_PERIOD",
    );
    const until = await as(
      id,
      async (tx) => (await tx`select pvp_test.request_self_exclusion(180) t`)[0].t as string,
    );
    const days = (new Date(until).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(179);
    expect(days).toBeLessThan(181);
    await sql`update pvp_test.profiles set self_excluded_until = clock_timestamp() + interval '400 days' where id = ${id}::uuid`;
    expect(await err(as(id, (tx) => tx`select pvp_test.request_self_exclusion(180)`))).toContain(
      "EXCLUSION_ALREADY_LONGER",
    );
    expect(await err(as(id, (tx) => tx`select pvp_test.request_self_exclusion(365)`))).toContain(
      "EXCLUSION_ALREADY_LONGER",
    );
    const longer = await as(
      id,
      async (tx) => (await tx`select pvp_test.request_self_exclusion(1825) t`)[0].t as string,
    );
    expect(new Date(longer).getTime()).toBeGreaterThan(Date.now() + 1800 * 86_400_000);
    const [audit] =
      await sql`select count(*)::int n from pvp_test.audit_logs where actor_id = ${id}::uuid and action = 'self_exclusion'`;
    expect(Number(audit.n)).toBe(2);

    const play = [
      sql`select pvp_test.coinflip_create(100, 'HEADS'::pvp_test.coin_side, ${key()}) from (select set_config('test.uid', ${id}, true)) c`,
      sql`select pvp_test.jackpot_join(100, ${key()}) from (select set_config('test.uid', ${id}, true)) c`,
      sql`select pvp_test.roulette_bet('GREEN'::pvp_test.roulette_color, 100, ${key()}) from (select set_config('test.uid', ${id}, true)) c`,
      sql`select pvp_test.slot_create(100, ${key()}) from (select set_config('test.uid', ${id}, true)) c`,
      sql`select pvp_test.poker_sit(null, 1::smallint, 1::smallint, 100, 'abc', ${key()}) from (select set_config('test.uid', ${id}, true)) c`,
    ];
    for (const call of play) expect(await err(call)).toContain("SELF_EXCLUDED");
  });

  it("an excluded player cannot call a bot on a game opened before the exclusion", async () => {
    const id = await user("pre");
    const created = await as(
      id,
      async (tx) =>
        (await tx`select pvp_test.coinflip_create(100, 'HEADS'::pvp_test.coin_side, ${key()}) r`)[0]
          .r as { game_id: number },
    );
    await as(id, (tx) => tx`select pvp_test.request_self_exclusion(180)`);
    expect(
      await err(
        as(id, (tx) => tx`select pvp_test.coinflip_call_bot(${created.game_id}, ${key()})`),
      ),
    ).toContain("SELF_EXCLUDED");
    const [game] =
      await sql`select status, opponent_id from pvp_test.coinflip_games where id = ${created.game_id}`;
    expect(game.status).toBe("WAITING");
    expect(game.opponent_id).toBeNull();
  });

  it("the bot kill switch stops a call and a retry does not reuse a failed attempt", async () => {
    const [fresh] = await sql`select enabled, coinflip_enabled from pvp_test.bot_config`;
    expect(fresh.enabled).toBe(true);
    expect(fresh.coinflip_enabled).toBe(true);
    await sql`update pvp_test.bot_config set enabled = false, coinflip_enabled = false, poker_enabled = false, slott_enabled = false`;
    const id = await user("kill");
    const created = await as(
      id,
      async (tx) =>
        (await tx`select pvp_test.coinflip_create(100, 'HEADS'::pvp_test.coin_side, ${key()}) r`)[0]
          .r as { game_id: number },
    );
    const idem = key();
    expect(
      await err(as(id, (tx) => tx`select pvp_test.coinflip_call_bot(${created.game_id}, ${idem})`)),
    ).toContain("BOTS_DISABLED");
    expect(
      await err(as(id, (tx) => tx`select pvp_test.coinflip_call_bot(${created.game_id}, ${idem})`)),
    ).toContain("BOTS_DISABLED");
    const [calls] =
      await sql`select count(*)::int n from pvp_test.bot_calls where user_id = ${id}::uuid`;
    expect(Number(calls.n)).toBe(0);
    const [game] =
      await sql`select opponent_id from pvp_test.coinflip_games where id = ${created.game_id}`;
    expect(game.opponent_id).toBeNull();
  });

  it("admin credit requires step-up, is idempotent, and rejects a reused request", async () => {
    const admin = await user("adm");
    const partner = await user("ptr");
    const outsider = await user("out");
    await sql`insert into pvp_test.user_roles (user_id, role) values (${admin}::uuid, 'admin')`;
    await sql`insert into pvp_test.partners (user_id, commission_bps, created_by)
      values (${partner}::uuid, 150, ${admin}::uuid)`;
    const request = randomUUID();
    const revoked = adminClaims(admin, randomUUID());
    expect(
      await err(
        as(
          admin,
          (tx) =>
            tx`select pvp_test.partner_admin_topup(${partner}::uuid, 100, 'a', ${request}::uuid)`,
          revoked,
        ),
      ),
    ).toContain("SESSION_REVOKED");
    const liveOnly = randomUUID();
    await sql`insert into pvp_test.test_auth_sessions (id, user_id, not_after)
      values (${liveOnly}::uuid, ${admin}::uuid, clock_timestamp() + interval '1 hour')`;
    expect(
      await err(
        as(
          admin,
          (tx) =>
            tx`select pvp_test.partner_admin_topup(${partner}::uuid, 100, 'a', ${request}::uuid)`,
          adminClaims(admin, liveOnly),
        ),
      ),
    ).toContain("ADMIN_STEP_UP");
    expect(
      await err(
        as(
          outsider,
          (tx) =>
            tx`select pvp_test.partner_admin_topup(${partner}::uuid, 100, 'a', ${randomUUID()}::uuid)`,
        ),
      ),
    ).toContain("FORBIDDEN");

    const session = await openAdminStepup(sql, admin);
    const claims = adminClaims(admin, session);
    const topup = (amount: number, req: string) =>
      sql`select pvp_test.partner_admin_topup(${partner}::uuid, ${amount}, 'bonus', ${req}::uuid) r
        from (select set_config('test.uid', ${admin}, true), set_config('request.jwt.claims', ${claims}, true)) c`;
    const raced = await Promise.all([topup(100, request), topup(100, request)]);
    const bodies = raced.map(
      (rows) => rows[0].r as { ok: boolean; duplicate: boolean; amount_cents: number },
    );
    expect(bodies.every((b) => b.ok && b.amount_cents === 100)).toBe(true);
    expect(bodies.filter((b) => b.duplicate).length).toBe(1);
    const [txCount] =
      await sql`select count(*)::int n from pvp_test.ledger_transactions where kind = 'partner_credit' and user_id = ${partner}::uuid`;
    expect(Number(txCount.n)).toBe(1);
    const [bal] = await sql`select balance::int b from pvp_test.wallet_accounts
      where owner_id = ${partner}::uuid and kind = 'user_available'`;
    const welcome = Number(bal.b) - 100;
    expect(welcome).toBeGreaterThan(0);
    expect(await err(topup(200, request))).toContain("REQUEST_REUSED");
    const [balAfter] = await sql`select balance::int b from pvp_test.wallet_accounts
      where owner_id = ${partner}::uuid and kind = 'user_available'`;
    expect(Number(balAfter.b)).toBe(welcome + 100);
    const [logged] =
      await sql`select count(*)::int n from pvp_test.audit_logs where action = 'partner_credit_added' and actor_id = ${admin}::uuid`;
    expect(Number(logged.n)).toBe(1);
  });

  it("referral claims reject self, duplicates, stale accounts, and a shared wallet", async () => {
    const inviter = await user("inv");
    const fresh = await user("new");
    const again = await user("agn");
    const stale = await user("old");
    const sharedA = await user("sha");
    const sharedB = await user("shb");
    const invite = await as(
      inviter,
      async (tx) =>
        (await tx`select pvp_test.referral_create_invite() r`)[0].r as {
          ok: boolean;
          code: string;
        },
    );
    expect(invite.ok).toBe(true);
    const self = await as(
      inviter,
      async (tx) =>
        (await tx`select pvp_test.referral_claim(${invite.code}) r`)[0].r as {
          ok: boolean;
          reason: string;
        },
    );
    expect(self).toMatchObject({ ok: false, reason: "self" });
    const claimed = await as(
      fresh,
      async (tx) =>
        (await tx`select pvp_test.referral_claim(${invite.code}) r`)[0].r as {
          ok: boolean;
          attributed: boolean;
        },
    );
    expect(claimed).toMatchObject({ ok: true, attributed: true });
    const kept = await as(
      fresh,
      async (tx) =>
        (await tx`select pvp_test.referral_claim(${invite.code}) r`)[0].r as { reason: string },
    );
    expect(kept.reason).toBe("kept");
    await sql`update pvp_test.profiles set created_at = clock_timestamp() - interval '31 minutes' where id = ${stale}::uuid`;
    const late = await as(
      stale,
      async (tx) =>
        (await tx`select pvp_test.referral_claim(${invite.code}) r`)[0].r as { reason: string },
    );
    expect(late.reason).toBe("existing_user");
    const addr = "0x" + "ab".repeat(20);
    await sql`insert into pvp_test.user_wallets (user_id, address, normalized_address)
      values (${sharedA}::uuid, ${addr}, ${addr}), (${sharedB}::uuid, ${addr}, ${addr})`;
    const own = await as(
      sharedA,
      async (tx) => (await tx`select pvp_test.referral_create_invite() r`)[0].r as { code: string },
    );
    const review = await as(
      sharedB,
      async (tx) =>
        (await tx`select pvp_test.referral_claim(${own.code}) r`)[0].r as {
          ok: boolean;
          reason: string;
        },
    );
    expect(review).toMatchObject({ ok: true, reason: "review" });
    const [row] =
      await sql`select status from pvp_test.referrals where referred_user_id = ${sharedB}::uuid`;
    expect(row.status).toBe("FRAUD_REVIEW");
    const [paid] =
      await sql`select count(*)::int n from pvp_test.referral_rewards where user_id = ${sharedA}::uuid`;
    expect(Number(paid.n)).toBe(0);
    expect(
      await err(sql`insert into pvp_test.referrals (inviter_user_id, referred_user_id, invite_id, reward_cents)
        select ${again}::uuid, ${again}::uuid, id, 1000 from pvp_test.referral_invites where inviter_user_id = ${inviter}::uuid`),
    ).toMatch(/23514|referrals_not_self|23503/);
    const [n] =
      await sql`select count(*)::int n from pvp_test.referrals where referred_user_id = ${fresh}::uuid`;
    expect(Number(n.n)).toBe(1);
  });

  it("an excluded account is refused by the withdrawal function before a row is created", async () => {
    await sql`alter table pvp_test.coinflip_games disable trigger user`;
    await sql`update pvp_test.coinflip_games
      set status = 'CANCELLED', cancelled_at = clock_timestamp(), cancel_reason = 'EXPIRED'
      where status not in ('COMPLETED', 'CANCELLED')`;
    await sql`alter table pvp_test.coinflip_games enable trigger user`;
    const stuck = await sql`select id, owner_id, balance::bigint b, asset, account_type, kind
      from pvp_test.wallet_accounts
      where account_type = 'test_credit' and kind in ('user_locked', 'game_escrow') and balance <> 0`;
    for (const row of stuck) {
      const cents = Number(row.b);
      const idem = key();
      await sql.begin(async (tx) => {
        const posted = (
          await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id)
          values ('coinflip_refund', ${idem}, ${row.account_type}, ${row.owner_id}::uuid) returning id`
        )[0].id as string;
        const avail = (
          await tx`select id from pvp_test.wallet_accounts
          where owner_id is not distinct from ${row.owner_id}::uuid and kind = 'user_available'
            and asset = ${row.asset} and account_type = ${row.account_type}`
        )[0].id as string;
        await tx`select pvp_test._post(${posted}::uuid, ${row.id}::uuid, ${-cents}::bigint)`;
        await tx`select pvp_test._post(${posted}::uuid, ${avail}::uuid, ${cents}::bigint)`;
      });
    }
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    await useTestWithdrawalMinimum(sql);
    const id = await user("wd");
    await as(id, (tx) => tx`select pvp_test.request_self_exclusion(180)`);
    const authed = JSON.stringify({ role: "authenticated", sub: id });
    expect(
      await err(sql`select pvp_test.crypto_request_withdrawal(${id}::uuid, 8453, 'USDC', 1000, null, true, null)
        from (select set_config('request.jwt.claims', ${authed}, true)) c`),
    ).toMatch(/42501|SERVER_ONLY/);
    expect(
      await err(
        sql`select pvp_test.crypto_request_withdrawal(${id}::uuid, 8453, 'USDC', 1000, null, true, null)`,
      ),
    ).toContain("SELF_EXCLUDED");
    const [rows] =
      await sql`select count(*)::int n from pvp_test.crypto_withdrawals where user_id = ${id}::uuid`;
    expect(Number(rows.n)).toBe(0);
  }, 120_000);

  it("partner commission truncates fractional cents and is not browser-callable", async () => {
    const admin = await user("cad");
    const partner = await user("cptr");
    const player = await user("cply");
    const tiny = await user("ctin");
    await sql`insert into pvp_test.partners (user_id, commission_bps, created_by) values (${partner}::uuid, 150, ${admin}::uuid)`;
    const promo = (
      await sql`insert into pvp_test.promo_codes (code, reward_cents, max_claims, created_by, partner_user_id)
      values ('PHASE2COMM', 100, 10, ${admin}::uuid, ${partner}::uuid) returning id`
    )[0].id as string;
    for (const [who, cents] of [
      [player, 10001],
      [tiny, 1],
    ] as const) {
      const tx = (
        await sql`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id)
        values ('deposit', ${key()}, 'real', ${who}::uuid) returning id`
      )[0].id as string;
      const claimTx = (
        await sql`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id)
        values ('promo_reward', ${key()}, 'test_credit', ${who}::uuid) returning id`
      )[0].id as string;
      const claim = (
        await sql`insert into pvp_test.promo_claims (promo_code_id, user_id, reward_cents, required_wager_cents, ledger_tx_id, client_ip)
        values (${promo}::uuid, ${who}::uuid, 100, 100, ${claimTx}::uuid, ${"2001:db8::" + who.slice(0, 4)}) returning id`
      )[0].id as string;
      await sql`insert into pvp_test.partner_referrals (user_id, partner_user_id, promo_code_id, promo_claim_id)
        values (${who}::uuid, ${partner}::uuid, ${promo}::uuid, ${claim}::uuid)`;
      await sql`alter table pvp_test.crypto_deposits disable trigger user`;
      await sql`insert into pvp_test.crypto_deposits (chain_id, asset_key, tx_hash, block_number, from_address, to_address, units, usd_cents, user_id, status, ledger_tx_id, credited_at)
        values (8453, 'USDC', ${"0x" + randomBytes(32).toString("hex")}, 1,
          '0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222',
          1, ${cents}, ${who}::uuid, 'CREDITED', ${tx}::uuid, clock_timestamp())`;
      await sql`alter table pvp_test.crypto_deposits enable trigger user`;
    }
    const [window] =
      await sql`select pvp_test._partner_window(${partner}::uuid, 150, '-infinity', 'infinity') w`;
    expect(window.w).toMatchObject({
      deposit_cents: 10002,
      deposit_count: 2,
      depositing_users: 2,
      commission_cents: 150,
    });
    const [priv] = await sql`select
      has_function_privilege('anon', 'pvp_test._partner_window(uuid,integer,timestamptz,timestamptz)', 'execute') a,
      has_function_privilege('authenticated', 'pvp_test._partner_window(uuid,integer,timestamptz,timestamptz)', 'execute') u`;
    expect(priv.a).toBe(false);
    expect(priv.u).toBe(false);
  });

  it("chat stores hostile text literally, rate-limits floods, and hides blocked messages from anon", async () => {
    const id = await user("chat");
    const hostile = "<script>alert(1)</script>'); drop table pvp_test.profiles;--";
    const sent = (
      await sql`select pvp_test.chat_send(${id}::uuid, 'jackpot', ${hostile}, 'LOW', 'ok') r`
    )[0].r as { ok: boolean; id: string };
    expect(sent.ok).toBe(true);
    const [stored] =
      await sql`select message from pvp_test.game_chat_messages where id = ${sent.id}::uuid`;
    expect(stored.message).toBe(hostile);
    const dup = (
      await sql`select pvp_test.chat_send(${id}::uuid, 'jackpot', ${hostile}, 'LOW', 'ok') r`
    )[0].r as { code: string };
    expect(dup.code).toBe("CHAT_RATE_LIMITED");
    const hidden = (
      await sql`select pvp_test.chat_send(${id}::uuid, 'coinflip', ${"hide" + key().slice(0, 8)}, 'HIGH', 'abuse') r`
    )[0].r as { code: string };
    expect(hidden.code).toBe("CHAT_BLOCKED");
    for (let i = 0; i < 3; i++) {
      const row = (
        await sql`select pvp_test.chat_send(${id}::uuid, 'jackpot', ${"m" + i + key().slice(0, 8)}, 'LOW', 'ok') r`
      )[0].r as { ok: boolean };
      expect(row.ok).toBe(true);
    }
    const limited = (
      await sql`select pvp_test.chat_send(${id}::uuid, 'jackpot', ${"overflow" + key().slice(0, 6)}, 'LOW', 'ok') r`
    )[0].r as { code: string };
    expect(limited.code).toBe("CHAT_RATE_LIMITED");
    const [roles] = await sql`select exists (select 1 from pg_roles where rolname = 'anon') as ok`;
    if (roles.ok) {
      let hiddenToAnon = -1;
      const hiddenRead = await err(
        sql.begin(async (tx) => {
          await tx.unsafe(`set local role anon`);
          const rows =
            await tx`select count(*)::int n from pvp_test.game_chat_messages where status = 'hidden'`;
          hiddenToAnon = Number(rows[0].n);
          throw new Error("ROLLBACK");
        }),
      );
      expect(
        hiddenRead.includes("42501") || (hiddenRead.includes("ROLLBACK") && hiddenToAnon === 0),
      ).toBe(true);
      const insert = await err(
        sql.begin(async (tx) => {
          await tx.unsafe(`set local role anon`);
          await tx`insert into pvp_test.game_chat_messages (game_type, user_id, message, status) values ('jackpot', ${id}::uuid, 'nope', 'visible')`;
        }),
      );
      expect(insert).toContain("42501");
    }
  });

  it("browser roles cannot invoke the crypto cron, and an empty bearer does not call out", async () => {
    const [priv] = await sql`select
      has_function_privilege('anon', 'pvp_test.crypto_invoke_cron(text)', 'execute') a,
      has_function_privilege('authenticated', 'pvp_test.crypto_invoke_cron(text)', 'execute') u,
      has_function_privilege('anon', 'pvp_test.pvp_minute_dispatch()', 'execute') da,
      (select count(*)::int from pvp_test.crypto_job_bearer) bearers`;
    expect(priv.a).toBe(false);
    expect(priv.u).toBe(false);
    expect(priv.da).toBe(false);
    expect(Number(priv.bearers)).toBe(0);
    expect(await err(sql`select pvp_test.crypto_invoke_cron('crypto-withdrawals')`)).toContain(
      "crypto job token missing",
    );
  });

  it("records latency for queued reads at 100, 250, 500, and 1000 tasks", async () => {
    const levels = [100, 250, 500, 1000];
    const results = [];
    for (const n of levels) {
      const samples: number[] = [];
      let errors = 0;
      const started = performance.now();
      await Promise.all(
        Array.from({ length: n }, async () => {
          const t = performance.now();
          try {
            await sql`select pvp_test.referral_terms()`;
            samples.push(performance.now() - t);
          } catch {
            errors += 1;
          }
        }),
      );
      samples.sort((a, b) => a - b);
      const at = (p: number) =>
        samples.length
          ? samples[Math.min(samples.length - 1, Math.ceil((p / 100) * samples.length) - 1)]
          : null;
      const elapsed = performance.now() - started;
      results.push({
        tasks: n,
        pool_max: 8,
        ok: samples.length,
        errors,
        elapsed_ms: Math.round(elapsed),
        throughput_per_s: Number((samples.length / (elapsed / 1000)).toFixed(1)),
        median_ms: at(50) === null ? null : Number(at(50)!.toFixed(1)),
        p95_ms: at(95) === null ? null : Number(at(95)!.toFixed(1)),
        p99_ms: at(99) === null ? null : Number(at(99)!.toFixed(1)),
      });
      if (errors > 0) break;
    }
    mkdirSync(resolve("test-results"), { recursive: true });
    writeFileSync(resolve("test-results/phase2-perf.json"), JSON.stringify(results, null, 2));
    expect(results[0].tasks).toBe(100);
    expect(results[0].errors).toBe(0);
    expect(results.at(-1)?.errors).toBe(0);
  }, 180_000);
});
