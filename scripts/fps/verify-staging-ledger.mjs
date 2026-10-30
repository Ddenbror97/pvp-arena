import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { connect, asUser, asService, assertStaging } from "./staging-lib.mjs";
assertStaging();
const sql = connect(12),
  users = JSON.parse(fs.readFileSync(".env.fps-staging-users.json", "utf8"));
let [A, B, C, D] = users.slice(4, 8);
const report = {
  project: process.env.SUPABASE_PROJECT_ID,
  started: new Date().toISOString(),
  checks: [],
};
const key = () => randomUUID();
async function check(name, fn) {
  const start = Date.now();
  await fn();
  report.checks.push({ name, passed: true, ms: Date.now() - start });
  console.log("PASS " + name);
}
const rpc = (user, name, args) =>
  asUser(
    sql,
    user,
    async (tx) =>
      (
        await tx.unsafe(
          `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) result`,
          args,
        )
      )[0].result,
  );
const service = (name, args) =>
  asService(
    sql,
    async (tx) =>
      (
        await tx.unsafe(
          `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) result`,
          args,
        )
      )[0].result,
  );
const created = [];
const enter = async (user, stake = 100, privateRoom = true) => {
  const game = await rpc(user, "fps_enter", [stake, 5, key(), privateRoom, null]);
  created.push({ game, user });
  return game;
};
const join = (user, g) => rpc(user, "fps_join", [g.id, key(), g.invite ?? null]);
const result = (g, winner = g.creator_id, reason = "ROUNDS") => [
  g.id,
  winner,
  winner ? 3 : 0,
  winner ? 1 : 0,
  reason,
  g.id,
];
async function refund(g) {
  await service("fps_record_result", result(g, null, "SERVER_RESTART"));
  return service("fps_finish", result(g, null, "SERVER_RESTART"));
}
const wallet = async (user) =>
  (
    await sql`select kind,balance from public.wallet_accounts where owner_id=${user.id} and asset='USD' and account_type='real' order by kind`
  ).map((r) => ({ kind: r.kind, balance: Number(r.balance) }));
const available = async (user) =>
  (await wallet(user)).find((w) => w.kind === "user_available").balance;
const locked = async (user) => (await wallet(user)).find((w) => w.kind === "user_locked").balance;
const state = async (g) => (await sql`select * from public.fps_matches where id=${g.id}`)[0];
async function invariants() {
  const inv = (await sql`select public.money_real_invariants() result`)[0].result;
  for (const [name, value] of Object.entries(inv))
    if (name.startsWith("ok_")) assert.equal(value, true, name);
  assert.equal(Number(inv.balances_sum), 0);
  assert.equal(Number(inv.postings_sum), 0);
  assert.equal(Number(inv.orphaned_flows), 0);
  const bad =
    await sql`select tx_id from public.ledger_postings group by tx_id having sum(amount)<>0`;
  assert.equal(bad.length, 0);
  return inv;
}
try {
  await check(
    "fresh project, live auth sessions, complete schema and zero active cron jobs",
    async () => {
      assert.equal(
        Number((await sql`select count(*) n from supabase_migrations.schema_migrations`)[0].n),
        fs.readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).length,
      );
      assert.equal(Number((await sql`select count(*) n from cron.job where active`)[0].n), 0);
      for (const u of users)
        assert.equal(
          (
            await sql`select 1 from auth.sessions where id=${u.claims.session_id} and user_id=${u.id}`
          ).length,
          1,
        );
      await invariants();
    },
  );
  await check("REST authorization and financial table/RPC ACLs", async () => {
    const call = async (token, name, body) =>
      fetch(process.env.SUPABASE_URL + "/rest/v1/" + name, {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
          ...(token ? { Authorization: "Bearer " + token } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    const anonymous = await call(null, "rpc/fps_enter", {
      p_stake: 100,
      p_best_of: 5,
      p_key: key(),
      p_private: false,
      p_invite: null,
    });
    assert.notEqual(anonymous.status, 200);
    const forged = await call(A.session.access_token, "rpc/fps_finish", {
      p_match: randomUUID(),
      p_winner: A.id,
      p_score_a: 3,
      p_score_b: 0,
      p_reason: "ROUNDS",
      p_runtime: key(),
    });
    assert.notEqual(forged.status, 200);
    const write = await call(A.session.access_token, "wallet_accounts", {
      owner_id: A.id,
      kind: "user_available",
      asset: "USD",
      account_type: "real",
      balance: 99999999,
    });
    assert.notEqual(write.status, 201);
    const rls =
      await sql`select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'fps_%' and c.relkind='r'`;
    assert(rls.every((t) => t.relrowsecurity));
  });
  let paid;
  await check("three independent join sessions reserve exactly one opposing stake", async () => {
    const contestants = [A, B, C, D];
    const before = await Promise.all(contestants.map(available));
    paid = await enter(A);
    const attempts = await Promise.allSettled([B, C, D].map((u) => join(u, paid)));
    assert.equal(attempts.filter((x) => x.status === "fulfilled").length, 1);
    paid = await state(paid);
    assert.equal(paid.status, "FUNDED");
    assert.equal((await sql`select 1 from public.fps_entries where match_id=${paid.id}`).length, 2);
    for (let i = 0; i < contestants.length; i++) {
      const participating = [paid.creator_id, paid.opponent_id].includes(contestants[i].id);
      assert.equal(await locked(contestants[i]), participating ? 100 : 0);
      assert.equal(await available(contestants[i]), before[i] - (participating ? 100 : 0));
    }
  });
  await check(
    "parallel result-intent and settlement retries pay once and conserve the pot",
    async () => {
      const before = await available(A);
      await Promise.all(
        Array.from({ length: 6 }, () => service("fps_record_result", result(paid))),
      );
      const finishes = await Promise.all(
        Array.from({ length: 8 }, () => service("fps_finish", result(paid))),
      );
      assert(finishes.every((g) => g.status === "COMPLETED"));
      assert.equal(await available(A), before + 190);
      assert.equal(
        (
          await sql`select 1 from public.ledger_transactions where idempotency_key=${"fps:" + paid.id + ":settlement"}`
        ).length,
        1,
      );
      assert.equal(
        (await sql`select 1 from public.fps_result_intents where match_id=${paid.id}`).length,
        1,
      );
      await invariants();
    },
  );
  await check("opposite rematch accepts serialize into one child match", async () => {
    const opponent = users.find((u) => u.id === paid.opponent_id),
      matches = await Promise.all([
        rpc(A, "fps_rematch", [paid.id, key()]),
        rpc(opponent, "fps_rematch", [paid.id, key()]),
      ]);
    assert.equal(matches[0].match_id, matches[1].match_id);
    const child = await state({ id: matches[0].match_id });
    assert.equal(child.status, "FUNDED");
    assert.equal(
      (await sql`select 1 from public.fps_entries where match_id=${child.id}`).length,
      2,
    );
    await refund(child);
    await invariants();
  });
  await check("join versus cancel races never strand or duplicate reservations", async () => {
    for (let i = 0; i < 3; i++) {
      const before = [await available(A), await available(B)],
        g = await enter(A);
      const races = await Promise.allSettled([join(B, g), rpc(A, "fps_cancel", [g.id])]);
      assert(races.some((r) => r.status === "fulfilled"));
      const after = await state(g);
      if (after.status === "FUNDED") await refund(after);
      else assert.equal(after.status, "CANCELLED");
      assert.equal(await available(A), before[0]);
      assert.equal(await available(B), before[1]);
      assert.equal(await locked(A), 0);
      assert.equal(await locked(B), 0);
    }
  });
  await check("entry flood limit rejects without reserving more money", async () => {
    while (
      Number(
        (
          await sql`select count(*) n from public.fps_entries e join public.fps_matches m on m.id=e.match_id where e.user_id=${A.id} and m.created_at>clock_timestamp()-interval '10 minutes'`
        )[0].n,
      ) < 8
    ) {
      const g = await enter(A);
      await rpc(A, "fps_cancel", [g.id]);
    }
    const before = await available(A);
    await assert.rejects(enter(A), /RATE_LIMITED/);
    assert.equal(await available(A), before);
    assert.equal(await locked(A), 0);
  });
  [A, B, C, D] = users.slice(8, 12);
  await check("committed result intent survives expiry and contradictory callbacks", async () => {
    const g = await enter(A);
    await join(B, g);
    await service("fps_record_result", result(g));
    await sql`update public.fps_matches set expires_at=clock_timestamp()-interval '1 second' where id=${g.id}`;
    await service("fps_expire", [100]);
    assert.equal((await state(g)).status, "FUNDED");
    const r = await service("fps_reconcile", [100]);
    assert.equal(r.failed, 0);
    assert.equal((await state(g)).status, "COMPLETED");
    await assert.rejects(
      service("fps_finish", result(g, null, "SERVER_RESTART")),
      /RESULT_CONFLICT/,
    );
    await invariants();
  });
  await check(
    "expiry versus first result recording resolves to one authoritative outcome",
    async () => {
      for (let i = 0; i < 5; i++) {
        const g = await enter(A);
        await join(B, g);
        await sql`update public.fps_matches set expires_at=clock_timestamp()-interval '1 second' where id=${g.id}`;
        await Promise.allSettled([
          service("fps_record_result", result(g)),
          service("fps_expire", [100]),
        ]);
        await service("fps_reconcile", [100]);
        assert(["COMPLETED", "CANCELLED"].includes((await state(g)).status));
        assert.equal(await locked(A), 0);
        assert.equal(await locked(B), 0);
        await invariants();
      }
    },
  );
  await check(
    "failed posting rolls back fully while independent reconciliation continues",
    async () => {
      const failed = await enter(A),
        good = await enter(C);
      await join(B, failed);
      await join(D, good);
      await service("fps_record_result", result(failed));
      await service("fps_record_result", result(good));
      await sql.unsafe(`create schema if not exists fps_staging;revoke all on schema fps_staging from public,anon,authenticated;create table if not exists fps_staging.fail_settlement(match_id uuid primary key);alter table fps_staging.fail_settlement enable row level security;
  create or replace function fps_staging.inject_failure() returns trigger language plpgsql security definer set search_path=pg_catalog as $$begin if exists(select 1 from public.ledger_transactions t join fps_staging.fail_settlement f on t.idempotency_key='fps:'||f.match_id||':settlement' where t.id=new.tx_id) then raise exception 'STAGING_INJECTED_POSTING_FAILURE';end if;return new;end $$;
  create trigger fps_staging_failure before insert on public.ledger_postings for each row execute function fps_staging.inject_failure();`);
      try {
        await sql`insert into fps_staging.fail_settlement values(${failed.id})`;
        await assert.rejects(
          service("fps_finish", result(failed)),
          /STAGING_INJECTED_POSTING_FAILURE/,
        );
        assert.equal((await state(failed)).status, "FUNDED");
        assert.equal(await locked(A), 100);
        assert.equal(
          (
            await sql`select 1 from public.ledger_transactions where idempotency_key=${"fps:" + failed.id + ":settlement"}`
          ).length,
          0,
        );
        const r = await service("fps_reconcile", [100]);
        assert.equal(r.failed, 1);
        assert.equal(r.settled, 1);
        assert.equal((await state(good)).status, "COMPLETED");
        assert.equal((await state(failed)).result_recorded, true);
        await sql`delete from fps_staging.fail_settlement where match_id=${failed.id}`;
        const retry = await service("fps_reconcile", [100]);
        assert.equal(retry.failed, 0);
        assert.equal(retry.settled, 1);
        assert.equal((await state(failed)).status, "COMPLETED");
        await invariants();
      } finally {
        await sql.unsafe(
          "drop trigger if exists fps_staging_failure on public.ledger_postings;drop function if exists fps_staging.inject_failure();",
        );
      }
    },
  );
  await check("paid public result updates ranking exactly once", async () => {
    const before =
      await sql`select user_id,played,wins from public.fps_ratings where user_id in (${A.id},${B.id})`;
    const g = await enter(A, 200, false);
    await join(B, g);
    await service("fps_record_result", result(g));
    await Promise.all([service("fps_finish", result(g)), service("fps_finish", result(g))]);
    const after =
      await sql`select user_id,played,wins from public.fps_ratings where user_id in (${A.id},${B.id})`;
    for (const r of after)
      assert.equal(r.played, (before.find((x) => x.user_id === r.user_id)?.played || 0) + 1);
    await invariants();
  });
  await check("global ledger conservation and no orphan FPS locked balances", async () => {
    report.invariants = await invariants();
    assert.equal(
      Number(
        (
          await sql`select coalesce(sum(balance),0) locked from public.wallet_accounts where kind='user_locked' and account_type='real'`
        )[0].locked,
      ),
      0,
    );
    assert.equal(
      Number(
        (
          await sql`select count(*) n from public.fps_matches where status in ('WAITING','FUNDED')`
        )[0].n,
      ),
      0,
    );
  });
  report.passed = true;
} catch (e) {
  report.passed = false;
  report.failure = { message: e.message, code: e.code };
  console.log(JSON.stringify({ failed: report.failure }));
  process.exitCode = 1;
} finally {
  // Failed assertions must not leave synthetic users' stakes reserved.
  for (const { game, user } of created) {
    try {
      const current = await state(game);
      if (current.status === "WAITING") await rpc(user, "fps_cancel", [game.id]);
      else if (current.status === "FUNDED" && !current.result_recorded) await refund(current);
      else if (current.status === "FUNDED") await service("fps_reconcile", [100]);
    } catch {
      report.cleanupFailed = true;
      report.passed = false;
      process.exitCode = 1;
    }
  }
  report.finished = new Date().toISOString();
  fs.writeFileSync("test-results/fps-staging-ledger.json", JSON.stringify(report, null, 2));
  await sql.end({ timeout: 3 });
}
