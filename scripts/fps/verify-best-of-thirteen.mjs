import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { connect, assertStaging } from "./staging-lib.mjs";
assertStaging();
const sql = connect(1),
  users = JSON.parse(fs.readFileSync(".env.fps-staging-users.json", "utf8")).slice(4, 6);
const file = "supabase/migrations/20261101232818_fps_cash_best_of_thirteen.sql";
const migration = fs
  .readFileSync(file, "utf8")
  .replace(/^begin;$/m, "")
  .replace(/^commit;$/m, "");
const rollback = Error("EXPECTED_REHEARSAL_ROLLBACK");
let checks = 0;
try {
  await assert.rejects(
    sql.begin(async (tx) => {
      const user = async (u, fn) => {
        await tx`select set_config('request.jwt.claims',${JSON.stringify(u.claims)},true)`;
        await tx.unsafe("set local role authenticated");
        try {
          return await tx.savepoint(fn);
        } finally {
          await tx.unsafe("reset role");
        }
      };
      await tx`update fps_config set enabled=true,cash_enabled=true where id=1`;
      const [A, B] = users;
      assert.equal(
        (
          await tx`select count(*)::int n from supabase_migrations.schema_migrations where version='20261101232818'`
        )[0].n,
        0,
        "Rehearse against the prior schema",
      );
      const legacyKey = randomUUID();
      const legacy = (
        await user(A, () => tx`select public.fps_create(100,5,${legacyKey},true) g`)
      )[0].g;
      const privileges =
        await tx`select oid::regprocedure::text name,proacl::text acl,prosecdef from pg_proc where oid in ('public._fps_terms(uuid,bigint,int)'::regprocedure,'fps_private.open_match(bigint,int,text,boolean,text,boolean)'::regprocedure,'public.fps_rematch(uuid,text)'::regprocedure) order by name`;
      await tx.unsafe(migration);
      assert.deepEqual(
        await tx`select oid::regprocedure::text name,proacl::text acl,prosecdef from pg_proc where oid in ('public._fps_terms(uuid,bigint,int)'::regprocedure,'fps_private.open_match(bigint,int,text,boolean,text,boolean)'::regprocedure,'public.fps_rematch(uuid,text)'::regprocedure) order by name`,
        privileges,
      );
      checks++;
      // A room funded under the old published terms is neither rewritten nor stranded.
      assert.equal(
        (await user(A, () => tx`select public.fps_create(100,5,${legacyKey},true) g`))[0].g.id,
        legacy.id,
      );
      await user(
        B,
        () => tx`select public.fps_join(${legacy.id}::uuid,${randomUUID()},${legacy.invite})`,
      );
      await tx`select public.fps_record_result(${legacy.id}::uuid,${A.id}::uuid,3,2,'ROUNDS',${legacy.id})`;
      await tx`select public.fps_finish(${legacy.id}::uuid,${A.id}::uuid,3,2,'ROUNDS',${legacy.id})`;
      assert.equal(
        (await tx`select best_of from fps_matches where id=${legacy.id}::uuid`)[0].best_of,
        5,
      );
      checks++;
      for (const best of [5, 9])
        await assert.rejects(
          tx.savepoint(() =>
            user(A, () => tx`select public.fps_create(100,${best},${randomUUID()},true)`),
          ),
          /BEST_OF_NOT_ALLOWED/,
        );
      checks++;
      const key = randomUUID();
      const game = (await user(A, () => tx`select public.fps_create(100,13,${key},true) g`))[0].g;
      assert.equal(game.best_of, 13);
      assert.equal(
        (await user(A, () => tx`select public.fps_create(100,13,${key},true) g`))[0].g.id,
        game.id,
      );
      checks++;
      await user(
        B,
        () => tx`select public.fps_join(${game.id}::uuid,${randomUUID()},${game.invite})`,
      );
      await assert.rejects(
        tx.savepoint(
          () =>
            tx`select public.fps_record_result(${game.id}::uuid,${A.id}::uuid,6,5,'ROUNDS',${game.id})`,
        ),
        /INVALID_RESULT/,
      );
      checks++;
      await tx`select public.fps_record_result(${game.id}::uuid,${A.id}::uuid,7,6,'ROUNDS',${game.id})`;
      for (let i = 0; i < 2; i++)
        await tx`select public.fps_finish(${game.id}::uuid,${A.id}::uuid,7,6,'ROUNDS',${game.id})`;
      const done = (
        await tx`select score_a,score_b,fee_amount,payout_amount,status from fps_matches where id=${game.id}::uuid`
      )[0];
      assert.equal(done.score_a, 7);
      assert.equal(done.score_b, 6);
      assert.equal(Number(done.fee_amount), 10);
      assert.equal(Number(done.payout_amount), 190);
      assert.equal(done.status, "COMPLETED");
      assert.equal(
        (
          await tx`select count(*)::int n from ledger_transactions where idempotency_key=${"fps:" + game.id + ":settlement"}`
        )[0].n,
        1,
      );
      checks++;
      const rematch = (
        await user(A, () => tx`select public.fps_rematch(${game.id}::uuid,${randomUUID()}) g`)
      )[0].g;
      assert.equal(rematch.best_of, 13);
      checks++;
      const inv = (await tx`select money_real_invariants() r`)[0].r;
      for (const [k, v] of Object.entries(inv)) if (k.startsWith("ok_")) assert.equal(v, true, k);
      checks++;
      throw rollback;
    }),
    (e) => e === rollback,
  );
  console.log(
    JSON.stringify({
      project: process.env.SUPABASE_PROJECT_ID,
      checks,
      passed: true,
      rolledBack: true,
    }),
  );
} finally {
  await sql.end();
}
