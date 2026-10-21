/**
 * Phase 3 backend audit.
 *
 * Hosted checks call only the approved test project. Local checks use a
 * database created on 127.0.0.1. Production refs are refused before connect.
 * Phase 1 game/wallet suites and the Phase 2 RLS suite are not re-run.
 */
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTestSchemaSql } from "./schema";
import { testDatabaseUrl } from "./test-url";

const APPROVED_REF = "qyykpkzmthkrvmtmgvwo";
const FORBIDDEN = ["dkyabirifoixnfbmheay", "gqeaadpdtuussxdlnmof", "fdsovopvmjogjcllmxwj"];
const API = "https://api.supabase.com/v1";
const PG_DUMP = "/usr/lib/postgresql/17/bin/pg_dump";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const results: Record<string, unknown> = {};

function assertUuid(value: string) {
  if (!UUID_RE.test(value)) throw new Error("Refusing a non-uuid identifier.");
  return value;
}

function approvedQuery(query: string) {
  const hay = query.toLowerCase();
  for (const ref of FORBIDDEN) {
    if (hay.includes(ref)) throw new Error("Refusing a query that names a forbidden project.");
  }
  return query;
}

function percentile(samples: number[], p: number) {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

type Keys = { anon: string; service: string; url: string };

async function loadKeys(): Promise<Keys> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required for hosted Phase 3 checks.");
  const res = await fetch(`${API}/projects/${APPROVED_REF}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API key lookup failed (${res.status}).`);
  const rows = (await res.json()) as { name: string; type: string; api_key?: string }[];
  const anon = rows.find((r) => r.name === "anon" && r.type === "legacy")?.api_key;
  const service = rows.find((r) => r.name === "service_role" && r.type === "legacy")?.api_key;
  if (!anon || !service) throw new Error("Test project anon or service key was not returned.");
  return { anon, service, url: `https://${APPROVED_REF}.supabase.co` };
}

async function mgmt<T = Record<string, unknown>[]>(query: string): Promise<T> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required.");
  const res = await fetch(`${API}/projects/${APPROVED_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: approvedQuery(query) }),
  });
  const text = await res.text();
  if (!res.ok && res.status !== 201) throw new Error(`management query ${res.status}: ${text.slice(0, 800)}`);
  return JSON.parse(text) as T;
}

function decodeJwt(token: string) {
  const part = token.split(".")[1];
  if (!part) throw new Error("JWT payload missing.");
  const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}

async function authFetch(keys: Keys, path: string, init: RequestInit & { token?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", keys.anon);
  headers.set("Content-Type", "application/json");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  return fetch(`${keys.url}${path}`, { ...init, headers });
}

async function createConfirmedUser(keys: Keys, tag: string) {
  const email = `phase3-${tag}-${randomUUID().slice(0, 8)}@audit.invalid`;
  const password = `Aa1!${randomBytes(18).toString("hex")}`;
  const res = await fetch(`${keys.url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: keys.service,
      Authorization: `Bearer ${keys.service}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const body = (await res.json()) as { id?: string; msg?: string; message?: string };
  if (!res.ok || !body.id) throw new Error(`create user failed ${res.status}: ${body.msg ?? body.message ?? "no id"}`);
  return { id: assertUuid(body.id), email, password };
}

async function signIn(keys: Keys, email: string, password: string) {
  const res = await authFetch(keys, "/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as { access_token?: string; refresh_token?: string; error_description?: string; msg?: string };
  return { status: res.status, access: body.access_token, refresh: body.refresh_token, error: body.error_description ?? body.msg };
}

function client(keys: Keys, access?: string): SupabaseClient {
  const supabase = createClient(keys.url, keys.anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (access) void supabase.realtime.setAuth(access);
  return supabase;
}

function subscribe(ch: ReturnType<SupabaseClient["channel"]>, ms = 8_000) {
  return new Promise<string>((resolve) => {
    const timer = setTimeout(() => resolve("TIMEOUT"), ms);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(timer);
        resolve(status);
      }
    });
  });
}

async function cleanupHostedUsers() {
  await mgmt(`
    do $body$
    declare ids uuid[];
    begin
      select coalesce(array_agg(id), '{}') into ids from auth.users where email like 'phase3-%@audit.invalid';
      if cardinality(ids) = 0 then return; end if;
      delete from public.game_chat_messages where user_id = any(ids);
      delete from public.coinflip_entries where user_id = any(ids);
      delete from public.coinflip_games where creator_id = any(ids);
      delete from public.ledger_postings where tx_id in (select id from public.ledger_transactions where user_id = any(ids));
      delete from public.ledger_transactions where user_id = any(ids);
      delete from public.wallet_accounts where owner_id = any(ids);
      delete from public.profiles where id = any(ids);
      delete from auth.refresh_tokens where user_id in (select id::text from auth.users where email like 'phase3-%@audit.invalid');
      delete from auth.sessions where user_id = any(ids);
      delete from auth.identities where user_id = any(ids);
      delete from auth.mfa_factors where user_id = any(ids);
      delete from auth.one_time_tokens where user_id = any(ids);
      delete from public.identity_checks where user_id = any(ids);
      delete from public.user_avatars where user_id = any(ids);
      delete from auth.users where id = any(ids);
    end
    $body$;
  `);
  await mgmt(`
    do $body$
    begin
      if exists (select 1 from pg_roles where rolname = 'phase3_dump_e4cb') then
        revoke all privileges on all tables in schema public from phase3_dump_e4cb;
        revoke all privileges on schema public from phase3_dump_e4cb;
        drop role phase3_dump_e4cb;
      end if;
    exception when others then
      execute 'drop role if exists phase3_dump_e4cb';
    end
    $body$;
  `);
}

describe("phase 3 guards", () => {
  it("refuses forbidden project refs before a connection", () => {
    for (const ref of FORBIDDEN) {
      expect(() => approvedQuery(`select '${ref}'`)).toThrow(/forbidden project/);
    }
    expect(approvedQuery("select 1")).toBe("select 1");
    const local = testDatabaseUrl();
    const host = new URL(local).hostname;
    expect(host === "127.0.0.1" || host === "localhost").toBe(true);
  });
});

describe("phase 3 hosted test project", () => {
  const hosted = process.env.SUPABASE_ACCESS_TOKEN ? it : it.skip;
  let keys: Keys;
  const users: { id: string; email: string; password: string; access?: string; refresh?: string }[] = [];

  beforeAll(async () => {
    if (!process.env.SUPABASE_ACCESS_TOKEN) return;
    await cleanupHostedUsers();
    keys = await loadKeys();
  }, 60_000);

  afterAll(async () => {
    if (!process.env.SUPABASE_ACCESS_TOKEN) return;
    await cleanupHostedUsers();
    const [left] = await mgmt<{ n: number }[]>(
      `select count(*)::int n from auth.users where email like 'phase3-%@audit.invalid'`,
    );
    const [role] = await mgmt<{ n: number }[]>(
      `select count(*)::int n from pg_roles where rolname = 'phase3_dump_e4cb'`,
    );
    results.cleanup = { users: left.n, role: role.n };
    writeFileSync("/tmp/phase3-results.json", JSON.stringify(results, null, 2));
    expect(left.n).toBe(0);
    expect(role.n).toBe(0);
  }, 60_000);

  hosted("catalog, cron, and backup metadata stay on the approved project", async () => {
    const tables = await mgmt<{ n: number; rls: number; force: number }[]>(`
      select count(*)::int n,
             count(*) filter (where c.relrowsecurity)::int rls,
             count(*) filter (where c.relforcerowsecurity)::int force
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'`);
    const meta = await mgmt<{ n: number }[]>(
      `select count(*)::int n from pg_policies where schemaname = 'public' and (qual ilike '%user_metadata%' or with_check ilike '%user_metadata%')`,
    );
    const pub = await mgmt<{ tablename: string }[]>(
      `select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1`,
    );
    const triggers = await mgmt<{ tbl: string }[]>(
      `select tgrelid::regclass::text tbl from pg_trigger where tgname = 'live_session' and not tgisinternal order by 1`,
    );
    const cron = await mgmt<{ jobname: string; schedule: string; active: boolean }[]>(
      `select jobname, schedule, active from cron.job order by jobname`,
    );
    const money = await mgmt<{ bearer: number; txs: number; posting_sum: string }[]>(`
      select (select count(*)::int from public.crypto_job_bearer) bearer,
             (select count(*)::int from public.ledger_transactions) txs,
             (select coalesce(sum(amount), 0)::text from public.ledger_postings) posting_sum`);
    const activity = await mgmt<{ max_conn: string; backends: number; locks: number; deadlocks: string }[]>(`
      select current_setting('max_connections') max_conn,
             (select count(*)::int from pg_stat_activity) backends,
             (select count(*)::int from pg_locks where not granted) locks,
             (select deadlocks::text from pg_stat_database where datname = current_database()) deadlocks`);
    const slow = await mgmt<{ q: string; calls: string; mean_ms: string }[]>(`
      select left(regexp_replace(query, '''[^'']*''', '?', 'g'), 90) q,
             calls::text, round(mean_exec_time::numeric, 1)::text mean_ms
      from pg_stat_statements
      where query not ilike '%crypto_job_bearer%'
        and query not ilike '%password%'
        and query not ilike '%token%'
        and query not ilike '%secret%'
        and query not ilike '%pvp_test%'
        and calls > 2
      order by mean_exec_time desc
      limit 8`);
    const token = process.env.SUPABASE_ACCESS_TOKEN!;
    const backups = await fetch(`${API}/projects/${APPROVED_REF}/database/backups`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const backupBody = (await backups.json()) as { pitr_enabled?: boolean; backups?: unknown[]; walg_enabled?: boolean };
    results.catalog = {
      tables: tables[0],
      userMetadataPolicies: meta[0].n,
      publication: pub.map((r) => r.tablename),
      liveSessionTriggers: triggers.map((r) => r.tbl),
      cron: cron.map((r) => ({ name: r.jobname, schedule: r.schedule, active: r.active })),
      money: money[0],
      activity: activity[0],
      slow,
      backups: { pitr: backupBody.pitr_enabled, listed: backupBody.backups?.length ?? 0, walg: backupBody.walg_enabled },
    };
    expect(tables[0].n).toBeGreaterThan(0);
    expect(tables[0].rls).toBe(tables[0].n);
    expect(meta[0].n).toBe(0);
    expect(pub.map((r) => r.tablename)).not.toContain("wallet_accounts");
    expect(triggers.map((r) => r.tbl)).toEqual(
      expect.arrayContaining(["coinflip_entries", "coinflip_games", "jackpot_entries", "ledger_transactions", "roulette_bets"]),
    );
    expect(money[0].bearer).toBe(0);
    expect(money[0].posting_sum).toBe("0");
    expect(cron.find((r) => r.jobname === "pvp-minute-dispatch")?.schedule).toBe("* * * * *");
    expect(backupBody.pitr_enabled).toBe(false);
  }, 60_000);

  hosted("real GoTrue login, refresh, logout, and revoked sessions", async () => {
    const a = await createConfirmedUser(keys, "a");
    const b = await createConfirmedUser(keys, "b");
    const c = await createConfirmedUser(keys, "c");
    users.push(a, b, c);
    const signed = await signIn(keys, a.email, a.password);
    expect(signed.status).toBe(200);
    expect(signed.access && signed.refresh).toBeTruthy();
    a.access = signed.access;
    a.refresh = signed.refresh;
    const claims = decodeJwt(signed.access!);
    const sessionId = String(claims.session_id ?? "");
    results.jwt = {
      role: claims.role,
      hasSessionId: UUID_RE.test(sessionId),
      expIn: Number(claims.exp) - Math.floor(Date.now() / 1000),
      claimKeys: Object.keys(claims).sort(),
    };
    expect(claims.role).toBe("authenticated");
    expect(claims.sub).toBe(a.id);
    expect(UUID_RE.test(sessionId)).toBe(true);
    expect(Number(claims.exp) - Math.floor(Date.now() / 1000)).toBeGreaterThan(3000);

    const live = await authFetch(keys, "/rest/v1/rpc/_assert_live_session", { method: "POST", token: a.access, body: "{}" });
    expect(live.status).toBeLessThan(300);

    const t0 = a.refresh!;
    const first = await authFetch(keys, "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: t0 }),
    });
    const firstBody = (await first.json()) as { access_token?: string; refresh_token?: string };
    expect(first.status).toBe(200);
    const t1 = firstBody.refresh_token!;
    expect(t1).not.toBe(t0);
    const second = await authFetch(keys, "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: t1 }),
    });
    const secondBody = (await second.json()) as { access_token?: string; refresh_token?: string };
    expect(second.status).toBe(200);
    const t2 = secondBody.refresh_token!;
    a.access = secondBody.access_token;
    a.refresh = t2;
    await new Promise((r) => setTimeout(r, 12_000));
    const grandparent = await authFetch(keys, "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: t0 }),
    });
    const parent = await authFetch(keys, "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: t1 }),
    });
    const current = await authFetch(keys, "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: t2 }),
    });
    results.refresh = { grandparent: grandparent.status, parent: parent.status, current: current.status };
    expect(grandparent.status).toBeGreaterThanOrEqual(400);
    if (current.status === 200) {
      const currentBody = (await current.json()) as { access_token?: string };
      a.access = currentBody.access_token;
    }

    const bSigned = await signIn(keys, b.email, b.password);
    const cSigned = await signIn(keys, c.email, c.password);
    expect(bSigned.status).toBe(200);
    expect(cSigned.status).toBe(200);
    b.access = bSigned.access;
    c.access = cSigned.access;
    const cClaims = decodeJwt(c.access!);
    const cSession = assertUuid(String(cClaims.session_id));

    await mgmt(`update auth.sessions set not_after = now() - interval '1 second' where id = '${cSession}'`);
    const expiredSession = await authFetch(keys, "/rest/v1/rpc/_assert_live_session", {
      method: "POST",
      token: c.access,
      body: "{}",
    });
    const expiredText = await expiredSession.text();
    expect(expiredText).toContain("SESSION_REVOKED");
    await mgmt(`delete from auth.sessions where id = '${cSession}'`);
    const deleted = await authFetch(keys, "/rest/v1/rpc/_assert_live_session", {
      method: "POST",
      token: c.access,
      body: "{}",
    });
    expect(await deleted.text()).toContain("SESSION_REVOKED");

    const beforeLogout = await authFetch(keys, "/rest/v1/rpc/_assert_live_session", {
      method: "POST",
      token: a.access,
      body: "{}",
    });
    const beforeLogoutText = await beforeLogout.text();
    if (beforeLogout.status >= 400 || beforeLogoutText.includes("SESSION_REVOKED")) {
      const again = await signIn(keys, a.email, a.password);
      expect(again.status).toBe(200);
      a.access = again.access;
      results.sessionAfterGrandparent = "revoked";
    } else {
      results.sessionAfterGrandparent = "live";
    }
    const logout = await authFetch(keys, "/auth/v1/logout?scope=global", { method: "POST", token: a.access, body: "{}" });
    results.logoutStatus = logout.status;
    expect(logout.status).toBeLessThan(300);
    const afterLogout = await authFetch(keys, "/rest/v1/rpc/_assert_live_session", {
      method: "POST",
      token: a.access,
      body: "{}",
    });
    const afterText = await afterLogout.text();
    results.afterLogout = { status: afterLogout.status, revoked: afterText.includes("SESSION_REVOKED") };
    expect(afterText).toContain("SESSION_REVOKED");

    const anon = await authFetch(keys, "/rest/v1/rpc/_assert_live_session", { method: "POST", body: "{}" });
    expect(anon.status).toBeGreaterThanOrEqual(400);
    const bad = await authFetch(keys, "/rest/v1/rpc/_assert_live_session", {
      method: "POST",
      token: `${a.access!.slice(0, -4)}aaaa`,
      body: "{}",
    });
    expect(bad.status).toBe(401);

    const still = await authFetch(keys, "/rest/v1/rpc/_assert_live_session", { method: "POST", token: b.access, body: "{}" });
    expect(still.status).toBeLessThan(300);

    const bSession = assertUuid(String(decodeJwt(b.access!).session_id));
    const aSession = assertUuid(String(decodeJwt(a.access!).session_id));
    const probe = async (uid: string, sid: string, label: string) => {
      const rows = await mgmt<{ probe: string }[]>(`
        do $body$
        declare result jsonb;
        begin
          insert into public.profiles (id, username, age_confirmed_at)
          values ('${uid}', 'p3${uid.replace(/-/g, "").slice(0, 12)}', now());
          insert into public.wallet_accounts (owner_id, kind, asset, account_type, balance)
          values ('${uid}', 'user_available', 'TEST_USD', 'test_credit', 5000),
                 ('${uid}', 'user_locked', 'TEST_USD', 'test_credit', 0);
          perform set_config('request.jwt.claims', json_build_object(
            'role','authenticated','sub','${uid}','session_id','${sid}',
            'exp', extract(epoch from now()) + 600
          )::text, true);
          execute 'set local role authenticated';
          result := public.coinflip_create(100, 'HEADS', 'phase3${label}key123');
          raise exception 'PROBE OK %', result;
        exception when others then
          raise exception 'PROBE %', sqlerrm;
        end
        $body$;
      `).catch((e: Error) => e.message);
      return String(rows);
    };
    const liveBet = await probe(b.id, bSession, "live");
    const deadBet = await probe(a.id, aSession, "dead");
    results.bets = { live: liveBet.slice(0, 240), dead: deadBet.slice(0, 240) };
    expect(liveBet).toContain("PROBE OK");
    expect(deadBet).toContain("SESSION_REVOKED");
    const [games] = await mgmt<{ n: number }[]>(
      `select count(*)::int n from public.coinflip_games where creator_id in ('${a.id}','${b.id}')`,
    );
    expect(games.n).toBe(0);
  }, 90_000);

  hosted("realtime private channels, cross-user denial, and reconnect", async () => {
    const a = users[0];
    const b = users[1];
    expect(b.access).toBeTruthy();
    const fresh = await signIn(keys, a.email, a.password);
    expect(fresh.status).toBe(200);
    a.access = fresh.access;

    const anon = client(keys);
    const anonWallet = anon.channel(`wallet:${a.id}`, { config: { private: true } });
    const anonStatus = await subscribe(anonWallet);
    await anon.removeChannel(anonWallet);

    const userB = client(keys, b.access);
    await userB.realtime.setAuth(b.access!);
    const cross = userB.channel(`wallet:${a.id}`, { config: { private: true } });
    const crossEvents: unknown[] = [];
    cross.on("broadcast", { event: "changed" }, (msg) => crossEvents.push(msg));
    const crossStatus = await subscribe(cross);

    const userA = client(keys, a.access);
    await userA.realtime.setAuth(a.access!);
    const own = userA.channel(`wallet:${a.id}`, { config: { private: true } });
    const ownEvents: Record<string, unknown>[] = [];
    own.on("broadcast", { event: "changed" }, (msg) => {
      ownEvents.push((msg.payload ?? {}) as Record<string, unknown>);
    });
    const ownStatus = await subscribe(own);
    const game = userA.channel("game:coinflip", { config: { private: true } });
    const gameStatus = await subscribe(game);
    const chat = anon.channel("chat:jackpot", { config: { private: true } });
    const chatEvents: unknown[] = [];
    chat.on("broadcast", { event: "message" }, (msg) => chatEvents.push(msg));
    const chatStatus = await subscribe(chat);

    const watcher = client(keys, a.access);
    await watcher.realtime.setAuth(a.access!);
    const watchCh = watcher.channel(`wallet:${a.id}`, { config: { private: true } });
    const forged: Record<string, unknown>[] = [];
    watchCh.on("broadcast", { event: "changed" }, (msg) => {
      forged.push((msg.payload ?? {}) as Record<string, unknown>);
    });
    const watchStatus = await subscribe(watchCh);
    const send = await own.send({ type: "broadcast", event: "changed", payload: { kind: "forged", balance: 1 } });
    await new Promise((r) => setTimeout(r, 1_500));
    const leakedRows: unknown[] = [];
    const changes = userA.channel("phase3-wallet-changes");
    changes.on("postgres_changes", { event: "*", schema: "public", table: "wallet_accounts" }, (msg) => {
      leakedRows.push(msg);
    });
    const changesStatus = await subscribe(changes, 6_000);

    await mgmt(`
      insert into public.profiles (id, username, age_confirmed_at)
      values ('${a.id}', 'p3rt${a.id.replace(/-/g, "").slice(0, 10)}', now())
      on conflict (id) do nothing;
      insert into public.wallet_accounts (owner_id, kind, asset, account_type, balance)
      values ('${a.id}', 'user_available', 'TEST_USD', 'test_credit', 25);
      insert into public.game_chat_messages (game_type, user_id, message, status, moderation_provider, created_at, moderated_at)
      values ('jackpot', '${a.id}', 'phase3-hidden-marker', 'hidden', 'rules', now(), now());
    `);
    await new Promise((r) => setTimeout(r, 2_500));
    const wallets = await authFetch(keys, `/rest/v1/wallet_accounts?select=balance,owner_id&owner_id=eq.${a.id}`, {
      token: b.access,
    });
    const walletBody = await wallets.text();
    await mgmt(`
      delete from public.game_chat_messages where user_id = '${a.id}';
      delete from public.wallet_accounts where owner_id = '${a.id}';
      delete from public.profiles where id = '${a.id}';
    `);
    const reconnectClient = client(keys, a.access);
    await reconnectClient.realtime.setAuth(a.access!);
    const again = reconnectClient.channel(`wallet:${a.id}`, { config: { private: true } });
    const reconnect = await subscribe(again);
    await userA.removeChannel(own);
    await userA.removeChannel(game);
    await userA.removeChannel(changes);
    await watcher.removeChannel(watchCh);
    await reconnectClient.removeChannel(again);
    await userB.removeChannel(cross);
    await anon.removeChannel(chat);

    const ownPayload = [...ownEvents, ...forged];
    results.realtime = {
      anonWallet: anonStatus,
      cross: crossStatus,
      crossEvents: crossEvents.length,
      own: ownStatus,
      game: gameStatus,
      chat: chatStatus,
      chatEvents: chatEvents.length,
      send,
      watch: watchStatus,
      forged: forged.length,
      reconnect,
      changes: changesStatus,
      leakedRows: leakedRows.length,
      payloadKeys: ownPayload.map((p) => Object.keys(p).sort()),
      otherWalletBody: walletBody.slice(0, 120),
    };
    expect(anonStatus).not.toBe("SUBSCRIBED");
    expect(crossStatus).not.toBe("SUBSCRIBED");
    expect(crossEvents).toEqual([]);
    expect(ownStatus).toBe("SUBSCRIBED");
    expect(gameStatus).toBe("SUBSCRIBED");
    expect(chatStatus).toBe("SUBSCRIBED");
    expect(chatEvents).toEqual([]);
    expect(forged.some((p) => p.kind === "forged" || "balance" in p)).toBe(false);
    expect(ownPayload.some((p) => "balance" in p)).toBe(false);
    expect(ownPayload.some((p) => p.kind === "user_available")).toBe(true);
    expect(reconnect).toBe("SUBSCRIBED");
    expect(walletBody).not.toContain("25");
    expect(leakedRows).toEqual([]);
  }, 60_000);

  hosted("authenticated client waves record latency and stop before claiming untested sizes", async () => {
    const signed: { id: string; access: string }[] = [];
    const target = 500;
    let rateLimited = 0;
    const createQueue = Array.from({ length: target }, (_, i) => i);
    async function worker() {
      while (createQueue.length > 0 && rateLimited < 5) {
        const n = createQueue.shift();
        if (n == null) return;
        try {
          const user = await createConfirmedUser(keys, `l${n}`);
          const session = await signIn(keys, user.email, user.password);
          if (session.status === 429) {
            rateLimited += 1;
            return;
          }
          if (session.status === 200 && session.access) signed.push({ id: user.id, access: session.access });
        } catch {
          rateLimited += 1;
        }
      }
    }
    await Promise.all(Array.from({ length: 8 }, () => worker()));
    if (signed.length < 250 && rateLimited > 0 && createQueue.length > 0) {
      await new Promise((r) => setTimeout(r, 45_000));
      rateLimited = 0;
      await Promise.all(Array.from({ length: 4 }, () => worker()));
    }
    results.sessionsObtained = signed.length;
    results.signInRateLimits = rateLimited;

    const waves: Record<string, unknown>[] = [];
    const sizes = [50, 100, 250, 500].filter((size) => signed.length >= size);
    if (!sizes.includes(signed.length) && signed.length >= 10) sizes.push(signed.length);
    for (const size of sizes) {
      const slice = signed.slice(0, size);
      const started = Date.now();
      const peakPromise = mgmt<{ n: number; active: number }[]>(
        `select count(*)::int n, count(*) filter (where state = 'active')::int active from pg_stat_activity`,
      );
      const outcomes = await Promise.all(
        slice.map(async (user, index) => {
          const t0 = Date.now();
          const path =
            index % 10 === 0
              ? "/auth/v1/user"
              : `/rest/v1/profiles?select=id,username&id=eq.${user.id}`;
          const res = await authFetch(keys, path, { token: user.access });
          await res.arrayBuffer();
          return { status: res.status, ms: Date.now() - t0, auth: path.startsWith("/auth") };
        }),
      );
      const peak = await peakPromise;
      const ms = outcomes.map((o) => o.ms);
      const errors = outcomes.filter((o) => o.status >= 400);
      waves.push({
        size,
        ok: outcomes.length - errors.length,
        errors: errors.length,
        authErrors: errors.filter((o) => o.auth).length,
        restErrors: errors.filter((o) => !o.auth).length,
        elapsedMs: Date.now() - started,
        p50: percentile(ms, 50),
        p95: percentile(ms, 95),
        p99: percentile(ms, 99),
        backends: peak[0],
      });
      if (errors.length / size > 0.2) break;
    }
    results.waves = waves;
    const ran = waves.filter((w) => !w.skipped) as { size: number; errors: number; ok: number }[];
    expect(signed.length).toBeGreaterThan(0);
    expect(ran.length).toBeGreaterThan(0);
    expect(ran[0].errors).toBe(0);
  }, 240_000);
});

function localAdminUrl() {
  const url = new URL(testDatabaseUrl());
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error("Refusing to create a database on a non-local host.");
  }
  url.pathname = "/postgres";
  return url.toString();
}

function localDbUrl(name: string) {
  const url = new URL(localAdminUrl());
  url.pathname = `/${name}`;
  return url.toString();
}

async function run(cmd: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(cmd, args, { env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b) => {
      stdout += String(b);
    });
    child.stderr.on("data", (b) => {
      stderr += String(b);
    });
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

describe("phase 3 isolated restore, cron, and faults", () => {
  const local = (() => {
    try {
      const host = new URL(testDatabaseUrl()).hostname;
      return host === "127.0.0.1" || host === "localhost";
    } catch {
      return false;
    }
  })();
  const localIt = local ? it : it.skip;
  let sql: postgres.Sql;

  beforeAll(async () => {
    if (!local) return;
    const admin = postgres(localAdminUrl(), { max: 1, onnotice: () => {} });
    await admin.unsafe(`drop database if exists phase3_audit with (force)`);
    await admin.unsafe(`drop database if exists phase3_restore with (force)`);
    await admin.unsafe(`create database phase3_audit`);
    await admin.unsafe(`create database phase3_restore`);
    await admin.end();
    const setup = postgres(localDbUrl("phase3_audit"), { max: 1, onnotice: () => {} });
    await setup.unsafe(`
      create schema if not exists extensions;
      create extension if not exists pgcrypto schema extensions;
      do $$ begin
        if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
        if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
        if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
      end $$;
    `);
    await setup.unsafe(`set statement_timeout = 0`);
    await setup.unsafe(buildTestSchemaSql());
    await setup.end();
    sql = postgres(localDbUrl("phase3_audit"), { max: 8, prepare: false, onnotice: () => {}, idle_timeout: 5 });
  }, 420_000);

  afterAll(async () => {
    if (!local) return;
    if (sql) await sql.end();
    const admin = postgres(localAdminUrl(), { max: 1, onnotice: () => {} });
    await admin.unsafe(`drop database if exists phase3_audit with (force)`);
    await admin.unsafe(`drop database if exists phase3_restore with (force)`);
    await admin.end();
    writeFileSync("/tmp/phase3-results.json", JSON.stringify(results, null, 2));
  }, 60_000);

  localIt("logical dump restores ledger constraints, and a crash retries a cron gate once", async () => {
    const password = randomBytes(18).toString("hex");
    const dropRole = async () => {
      await mgmt(`
        do $body$
        begin
          if exists (select 1 from pg_roles where rolname = 'phase3_dump_e4cb') then
            revoke all privileges on all tables in schema public from phase3_dump_e4cb;
            revoke all privileges on schema public from phase3_dump_e4cb;
            drop role phase3_dump_e4cb;
          end if;
        exception when others then
          begin
            execute 'drop role if exists phase3_dump_e4cb';
          exception when others then
            null;
          end;
        end
        $body$;
      `);
    };
    await dropRole();
    await mgmt(`
      create role phase3_dump_e4cb login password '${password}' connection limit 4;
      grant usage on schema public to phase3_dump_e4cb;
      grant select on all tables in schema public to phase3_dump_e4cb;
    `);
    try {
    const passFile = "/tmp/phase3-audit.pgpass";
    const user = `phase3_dump_e4cb.${APPROVED_REF}`;
    writeFileSync(passFile, `aws-0-us-east-2.pooler.supabase.com:5432:postgres:${user}:${password}\n`, { mode: 0o600 });
    const dumpPath = "/tmp/phase3-public-schema.sql";
    const dumpArgs = [
      "--schema-only",
      "--schema=public",
      "--no-owner",
      "--no-privileges",
      "--file",
      dumpPath,
      "--dbname",
      `postgresql://${encodeURIComponent(user)}@aws-0-us-east-2.pooler.supabase.com:5432/postgres`,
    ];
    let dumped = await run(PG_DUMP, dumpArgs, { ...process.env, PGPASSFILE: passFile });
    for (let attempt = 0; dumped.code !== 0 && attempt < 6; attempt += 1) {
      await new Promise((r) => setTimeout(r, 2_000));
      dumped = await run(PG_DUMP, dumpArgs, { ...process.env, PGPASSFILE: passFile });
    }
    let restoreErrors = 0;
    if (dumped.code === 0) {
      const restored = await run("psql", ["-v", "ON_ERROR_STOP=0", "-f", dumpPath, localDbUrl("phase3_restore")], process.env);
      restoreErrors = (restored.stderr.match(/^ERROR:/gm) ?? []).length;
      const restoreSamples = [...restored.stderr.matchAll(/^ERROR:.*$/gm)].slice(0, 6).map((m) => m[0].slice(0, 140));
      const check = postgres(localDbUrl("phase3_restore"), { max: 1, onnotice: () => {} });
      const triggers = await check<{ n: number }[]>`
        select count(*)::int n from pg_trigger
        where tgname = 'ledger_balanced' and not tgisinternal`;
      const constraints = await check<{ n: number }[]>`
        select count(*)::int n from pg_constraint c
        join pg_class r on r.oid = c.conrelid
        join pg_namespace n on n.oid = r.relnamespace
        where n.nspname = 'public' and r.relname in ('ledger_postings','ledger_transactions','wallet_accounts')`;
      const [restoredTx] = await check`insert into public.ledger_transactions (kind, idempotency_key, account_type) values ('refund', 'phase3-restore-a', 'test_credit') returning id`;
      const restoredDup = await check`insert into public.ledger_transactions (kind, idempotency_key, account_type) values ('refund', 'phase3-restore-a', 'test_credit')`.catch(
        (e: { code?: string }) => e.code ?? "error",
      );
      const [restoredAcct] = await check`insert into public.wallet_accounts (kind, asset, account_type, balance) values ('test_faucet', 'TEST_USD', 'test_credit', 0) returning id`;
      const restoredUnbalanced = await check`insert into public.ledger_postings (tx_id, account_id, amount, balance_after) values (${restoredTx.id}, ${restoredAcct.id}, 5, 5)`.catch(
        (e: Error) => e.message,
      );
      await check.end();
      results.restore = {
        dump: "ok",
        restoreErrors,
        ledgerTrigger: triggers[0].n,
        constraints: constraints[0].n,
        duplicate: restoredDup,
        unbalanced: String(restoredUnbalanced).slice(0, 160),
        errorSamples: restoreSamples,
      };
      expect(triggers[0].n).toBe(1);
      expect(constraints[0].n).toBeGreaterThan(0);
      expect(restoredDup).toBe("23505");
      expect(String(restoredUnbalanced)).toContain("LEDGER_UNBALANCED");
    } else {
      results.restore = { dump: "failed", stderr: dumped.stderr.replace(password, "[redacted]").slice(0, 400) };
    }
    expect(dumped.code).toBe(0);

    const gates = await Promise.all(
      Array.from({ length: 8 }, () => sql`select pvp_test.crypto_run_gate('deposits', 30) ok`),
    );
    const opened = gates.filter((row) => row[0].ok === true).length;
    await sql`update pvp_test.crypto_job_runs set last_run_at = 'epoch' where name = 'withdrawals'`;
    const missed = await sql`select pvp_test.crypto_run_gate('withdrawals', 30) ok`;
    const immediate = await sql`select pvp_test.crypto_run_gate('withdrawals', 30) ok`;
    const crashed = await sql
      .begin(async (tx) => {
        const [row] = await tx`select pvp_test.crypto_run_gate('reconcile', 30) ok`;
        expect(row.ok).toBe(true);
        throw new Error("CRASH");
      })
      .catch((e: Error) => e.message);
    const retried = await sql`select pvp_test.crypto_run_gate('reconcile', 30) ok`;
    const key = `phase3-${randomUUID()}`;
    await sql`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type) values ('deposit', ${key}, 'test_credit')`;
    const dup = await sql`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type) values ('deposit', ${key}, 'test_credit')`.catch(
      (e: { code?: string }) => e.code ?? "error",
    );
    const [tx] = await sql`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type) values ('refund', ${`phase3b-${randomUUID()}`}, 'test_credit') returning id`;
    const [acct] = await sql`select id from pvp_test.wallet_accounts where owner_id is null and account_type = 'test_credit' limit 1`;
    const unbalanced = await sql`insert into pvp_test.ledger_postings (tx_id, account_id, amount, balance_after) values (${tx.id}, ${acct.id}, 5, 5)`.catch(
      (e: Error) => e.message,
    );
    results.cron = { opened, missed: missed[0].ok, immediate: immediate[0].ok, crashed, retried: retried[0].ok, dup, unbalanced: String(unbalanced).slice(0, 160) };
    expect(opened).toBe(1);
    expect(missed[0].ok).toBe(true);
    expect(immediate[0].ok).toBe(false);
    expect(crashed).toContain("CRASH");
    expect(retried[0].ok).toBe(true);
    expect(dup).toBe("23505");
    expect(String(unbalanced)).toContain("LEDGER_UNBALANCED");
    } finally {
      await dropRole();
    }
    const [roleLeft] = await mgmt<{ n: number }[]>(
      `select count(*)::int n from pg_roles where rolname = 'phase3_dump_e4cb'`,
    );
    expect(roleLeft.n).toBe(0);
  }, 180_000);

  localIt("a role connection limit, a deadlock, and a statement timeout are recovered", async () => {
    await sql.unsafe(`
      do $$ begin
        if not exists (select 1 from pg_roles where rolname = 'phase3_pool') then
          create role phase3_pool login password 'phase3-pool' connection limit 2;
        end if;
      end $$;
      grant connect on database phase3_audit to phase3_pool;
    `);
    const poolUrl = new URL(localDbUrl("phase3_audit"));
    poolUrl.username = "phase3_pool";
    poolUrl.password = "phase3-pool";
    const a = postgres(poolUrl.toString(), { max: 1 });
    const b = postgres(poolUrl.toString(), { max: 1 });
    await a`select 1`;
    await b`select 1`;
    const third = postgres(poolUrl.toString(), { max: 1, connect_timeout: 5 });
    const limited = await third`select 1`.catch((e: Error) => e.message);
    await a.end();
    await b.end();
    await third.end();

    await sql.unsafe(`create table phase3_dl (id int primary key, n int); insert into phase3_dl values (1,0),(2,0);`);
    const left = postgres(localDbUrl("phase3_audit"), { max: 1 });
    const right = postgres(localDbUrl("phase3_audit"), { max: 1 });
    const deadlock = await Promise.all([
      left.begin(async (tx) => {
        await tx`update phase3_dl set n = 1 where id = 1`;
        await new Promise((r) => setTimeout(r, 200));
        await tx`update phase3_dl set n = 1 where id = 2`;
      }),
      right.begin(async (tx) => {
        await new Promise((r) => setTimeout(r, 50));
        await tx`update phase3_dl set n = 2 where id = 2`;
        await tx`update phase3_dl set n = 2 where id = 1`;
      }),
    ]).then(
      () => "both-committed",
      (e: Error) => e.message,
    );
    await left.end();
    await right.end();
    const [alive] = await sql`select count(*)::int n from phase3_dl`;

    const slow = postgres(localDbUrl("phase3_audit"), { max: 1 });
    const timed = await slow`set statement_timeout = '200ms'`.then(() => slow`select pg_sleep(2)`).catch((e: { code?: string }) => e.code ?? "error");
    await slow.end();
    const recovered = postgres(localDbUrl("phase3_audit"), { max: 1 });
    const [ok] = await recovered`select 1 as n`;
    await recovered.end();

    results.faults = { limited: String(limited).slice(0, 180), deadlock: String(deadlock).slice(0, 180), rows: alive.n, timed, recovered: ok.n };
    expect(String(limited)).toMatch(/too many connections|connection limit/i);
    expect(String(deadlock)).toMatch(/deadlock/i);
    expect(alive.n).toBe(2);
    expect(timed).toBe("57014");
    expect(ok.n).toBe(1);
  }, 30_000);
});
